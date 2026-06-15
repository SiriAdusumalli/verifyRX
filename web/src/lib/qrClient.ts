import type { ScanResponse } from "@/types/api";
import { sanitizeScanResponse } from "@/utils/medicineValidation";

type QrType = ScanResponse["qr_type"];

function detectQrType(raw: string): QrType {
  const value = raw.trim();
  if (/^https?:\/\//i.test(value)) return "url";
  if (value.startsWith("{") || value.startsWith("[")) {
    try {
      JSON.parse(value);
      return "json";
    } catch {
      // keep evaluating
    }
  }
  if (/^\(01\)\d{14}|\x1D01\d{14}/.test(value)) return "gs1";
  if (/^[A-Z0-9]{2,10}(?:-[A-Z0-9]{2,12}){1,4}$/i.test(value)) return "medicine_id";
  return "text";
}

function flatten(input: unknown, prefix = "", out: Record<string, string> = {}) {
  if (input === null || input === undefined) return out;
  if (Array.isArray(input)) {
    input.forEach((item, i) => flatten(item, `${prefix}[${i}]`, out));
    return out;
  }
  if (typeof input === "object") {
    Object.entries(input as Record<string, unknown>).forEach(([k, v]) => {
      const key = prefix ? `${prefix}.${k}` : k;
      flatten(v, key, out);
    });
    return out;
  }
  out[prefix] = String(input);
  return out;
}

function canonical(flat: Record<string, string>) {
  const fields: Record<string, string> = {};
  const aliases: Record<string, string[]> = {
    medicine_name: ["medicine", "name", "drug", "product", "title"],
    manufacturer: ["manufacturer", "company", "brand", "labeler"],
    batch_number: ["batch", "lot", "lot_number"],
    expiry_date: ["expiry", "expiration", "exp"],
    ingredients: ["ingredient", "composition", "substance"],
    serial_number: ["serial", "sn"],
    price: ["price", "mrp", "amount", "cost"],
    warnings: ["warning", "precaution", "contraindication"],
  };
  const entries = Object.entries(flat).map(([k, v]) => [k.toLowerCase(), v] as const);
  for (const [field, keys] of Object.entries(aliases)) {
    const hit = entries.find(([k]) => keys.some((x) => k.includes(x)));
    if (hit) fields[field] = hit[1];
  }
  return fields;
}

function extractFromHtml(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return flatten({ title, visible_text: text.slice(0, 5000) });
}

async function fetchText(url: string): Promise<{ text: string; finalUrl: string; contentType: string }> {
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  return {
    text,
    finalUrl: res.url || url,
    contentType: res.headers.get("content-type") || "",
  };
}

export async function verifyQrOnClient(raw: string): Promise<ScanResponse> {
  const qr_type = detectQrType(raw);
  let source_type: ScanResponse["source_type"] = "direct";
  let source_url: string | null = null;
  let fetched_data: Record<string, unknown> = {};
  let key_values: Record<string, string> = {};

  if (qr_type === "url") {
    source_url = raw.trim();
    try {
      const { text, finalUrl, contentType } = await fetchText(source_url);
      source_url = finalUrl;
      if (contentType.includes("application/json")) {
        const parsed = JSON.parse(text) as unknown;
        key_values = flatten(parsed);
        fetched_data = parsed as Record<string, unknown>;
        source_type = "api";
      } else {
        key_values = extractFromHtml(text);
        fetched_data = { html_excerpt: text.slice(0, 2500) };
        source_type = "html";
      }
    } catch {
      const proxyUrl = `https://r.jina.ai/http://${source_url.replace(/^https?:\/\//i, "")}`;
      const { text } = await fetchText(proxyUrl);
      key_values = flatten({ proxy_source: source_url, content: text.slice(0, 5000) });
      fetched_data = { proxy_excerpt: text.slice(0, 2500) };
      source_type = "html";
    }
  } else if (qr_type === "json") {
    const parsed = JSON.parse(raw) as unknown;
    key_values = flatten(parsed);
    fetched_data = parsed as Record<string, unknown>;
  } else {
    key_values = flatten({ qr_payload: raw });
  }

  const canonical_fields = canonical(key_values);
  const suspicious_reasons: string[] = [];
  if (!Object.keys(canonical_fields).length) suspicious_reasons.push("Core medicine fields were not clearly found.");
  const authenticity_status: ScanResponse["authenticity_status"] = suspicious_reasons.length
    ? "unknown"
    : "verified";

  return sanitizeScanResponse({
    id: crypto.randomUUID(),
    qr_type,
    source_type,
    source_url,
    authenticity_status,
    confidence_score: Math.min(99, 35 + Object.keys(canonical_fields).length * 12),
    suspicious_reasons,
    medicine_name: canonical_fields.medicine_name || (qr_type === "medicine_id" ? raw : "Unknown medicine"),
    key_values,
    canonical_fields,
    fetched_data,
    risk_level: suspicious_reasons.length ? "medium" : "low",
  });
}
