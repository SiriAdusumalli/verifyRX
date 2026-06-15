type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export type QrKind = "url" | "json" | "medicine_id" | "gs1" | "text";

const FIELD_ALIASES: Record<string, string[]> = {
  medicine_name: ["medicine", "medicine_name", "name", "product", "drug", "title"],
  manufacturer: ["manufacturer", "company", "brand", "labeler", "marketed_by"],
  batch_number: ["batch", "batch_number", "lot", "lot_number"],
  expiry_date: ["expiry", "expiry_date", "exp", "expiration", "expiration_date"],
  ingredients: ["ingredients", "active_ingredient", "composition", "substances"],
  serial_number: ["serial", "serial_number", "sn", "serialno"],
  price: ["price", "mrp", "cost", "amount"],
  warnings: ["warnings", "warning", "precautions", "contraindications"],
  authenticity_status: ["authenticity", "status", "verification_status"],
};

const MEDICINE_ID_RE = /^[A-Z0-9]{2,10}(?:-[A-Z0-9]{2,12}){1,4}$/i;
const GS1_RE = /^\(01\)\d{14}|\x1D01\d{14}/;

export function detectQrType(raw: string): QrKind {
  const value = raw.trim();
  if (/^https?:\/\//i.test(value)) return "url";
  if (value.startsWith("{") || value.startsWith("[")) {
    try {
      JSON.parse(value);
      return "json";
    } catch {
      // no-op
    }
  }
  if (GS1_RE.test(value)) return "gs1";
  if (MEDICINE_ID_RE.test(value)) return "medicine_id";
  return "text";
}

export function flattenObject(input: unknown, prefix = "", out: Record<string, string> = {}) {
  if (input === null || input === undefined) return out;
  if (Array.isArray(input)) {
    input.forEach((item, idx) => flattenObject(item, `${prefix}[${idx}]`, out));
    return out;
  }
  if (typeof input === "object") {
    Object.entries(input as Record<string, unknown>).forEach(([k, v]) => {
      const key = prefix ? `${prefix}.${k}` : k;
      flattenObject(v, key, out);
    });
    return out;
  }
  out[prefix] = String(input);
  return out;
}

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMeta(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const r =
    /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = r.exec(html))) {
    meta[m[1].toLowerCase()] = m[2];
  }
  return meta;
}

function parseTitle(html: string): string {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m?.[1]?.trim() || "";
}

function parseJsonLd(html: string): JsonValue[] {
  const blocks: JsonValue[] = [];
  const r = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = r.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1].trim()) as JsonValue);
    } catch {
      // ignore malformed json-ld blocks
    }
  }
  return blocks;
}

function parseSimpleTables(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let row: RegExpExecArray | null;
  while ((row = rowRe.exec(html))) {
    const cells = [...row[1].matchAll(/<(?:th|td)[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map((x) =>
      stripTags(x[1]).trim()
    );
    if (cells.length >= 2 && cells[0] && cells[1]) {
      out[cells[0].toLowerCase().replace(/\s+/g, "_")] = cells[1];
    }
  }
  return out;
}

export function mapCanonical(flat: Record<string, string>) {
  const canonical: Record<string, string> = {};
  const lowered = Object.entries(flat).map(([k, v]) => [k.toLowerCase(), v] as const);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const hit = lowered.find(([k]) => aliases.some((a) => k.includes(a)));
    if (hit) canonical[field] = hit[1];
  }
  return canonical;
}

export async function fetchWithTimeout(url: string, timeoutMs = 10000): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent": "VerifyRX/2.0 (+medicine verification)",
        Accept: "application/json,text/html;q=0.9,*/*;q=0.8",
      },
    });
  } finally {
    clearTimeout(id);
  }
}

export function isSafeUrl(input: string): boolean {
  try {
    const u = new URL(input);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local")) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      if (/^(10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/.test(host)) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

export async function extractFromUrl(url: string) {
  const res = await fetchWithTimeout(url, 12000);
  const contentType = res.headers.get("content-type") || "";
  const finalUrl = res.url;
  const raw = await res.text();

  if (contentType.includes("application/json")) {
    const parsed = JSON.parse(raw) as JsonValue;
    const flat = flattenObject(parsed);
    return {
      sourceType: "api" as const,
      finalUrl,
      title: "",
      metadata: {},
      parsed,
      flat,
      canonical: mapCanonical(flat),
      excerpt: JSON.stringify(parsed).slice(0, 3000),
    };
  }

  const meta = parseMeta(raw);
  const title = parseTitle(raw);
  const jsonLd = parseJsonLd(raw);
  const tableData = parseSimpleTables(raw);
  const visibleText = stripTags(raw).slice(0, 3500);

  const combined = {
    title,
    ...meta,
    ...tableData,
    jsonld: jsonLd,
    visible_excerpt: visibleText,
  };
  const flat = flattenObject(combined);
  return {
    sourceType: "html" as const,
    finalUrl,
    title,
    metadata: meta,
    parsed: combined,
    flat,
    canonical: mapCanonical(flat),
    excerpt: visibleText,
  };
}
