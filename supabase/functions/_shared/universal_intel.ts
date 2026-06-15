export type QrKind = "url" | "json" | "text" | "gs1" | "medicine_id";

export type UniversalIntelResult = {
  qr_type: QrKind;
  source_type: "direct" | "api" | "html" | "xml";
  source_url: string | null;
  redirect_chain: string[];
  medicine_name: string;
  authenticity_status: "verified" | "suspicious" | "unknown";
  confidence_score: number;
  suspicious_reasons: string[];
  canonical_fields: Record<string, string>;
  key_values: Record<string, string>;
  sections: Record<string, Record<string, string>>;
  structured: {
    medicineInformation: {
      uniqueProductIdentificationCode: string;
      properAndGenericDrugName: string;
      batchNumber: string;
      manufacturingDate: string;
      expiryDate: string;
    };
    manufacturerDetails: {
      manufacturerNameAndAddress: string;
      manufacturingLicenseNumber: string;
    };
  };
  raw_source_data: {
    content_type: string;
    preview: string;
    json?: unknown;
    html_preview?: string;
    xml_preview?: string;
  };
};

const FIELD_ALIASES: Record<string, string[]> = {
  medicine_name: ["medicine", "drug", "product", "name", "title", "brand_name"],
  generic_name: ["generic", "salt", "generic_name"],
  manufacturer: ["manufacturer", "company", "labeler", "marketed_by", "brand"],
  dosage: ["dosage", "dose", "strength", "potency"],
  strength: ["strength", "concentration", "mg", "ml", "%"],
  composition: ["composition", "ingredients", "active_ingredient", "substance"],
  ingredients: ["ingredients", "ingredient", "active"],
  batch_number: ["batch", "batch_no", "lot", "lot_number"],
  serial_number: ["serial", "serial_number", "uid", "unique_id"],
  gtin: ["gtin", "01"],
  manufacturing_date: ["mfg", "manufacturing_date", "packed_on"],
  expiry_date: ["exp", "expiry", "expiration", "best_before"],
  license_number: ["license", "lic_no", "licence", "permit"],
  package_size: ["pack_size", "package", "net_qty", "size"],
  warnings: ["warning", "caution", "contraindication", "alert"],
  scan_history: ["scan_history", "scan count", "history"],
  location_history: ["location_history", "location", "track"],
  verification_status: ["status", "verification", "authenticity"],
  country: ["country", "origin", "made_in"],
  product_image: ["image", "thumbnail", "photo", "og:image"],
  barcode: ["barcode", "ean", "upc"],
};

const TRUSTED_DOMAIN_RE = /(gov|who\.int|fda|pharma|drug|med|medicine)/i;

export function detectQrType(raw: string): QrKind {
  const text = raw.trim();
  if (/^https?:\/\//i.test(text)) return "url";
  if (text.startsWith("{") || text.startsWith("[")) {
    try {
      JSON.parse(text);
      return "json";
    } catch {
      // continue
    }
  }
  if (/^\(01\)\d{14}|\x1D01\d{14}/.test(text)) return "gs1";
  if (/^[A-Z0-9]{2,10}(?:-[A-Z0-9]{2,12}){1,6}$/i.test(text)) return "medicine_id";
  return "text";
}

export function isSafePublicUrl(input: string): boolean {
  try {
    const u = new URL(input);
    if (!["http:", "https:"].includes(u.protocol)) return false;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local")) return false;
    if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      if (/^(10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.|192\.168\.)/.test(host)) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function flattenObject(input: unknown, prefix = "", out: Record<string, string> = {}) {
  if (input === null || input === undefined) return out;
  if (Array.isArray(input)) {
    input.forEach((item, idx) => flattenObject(item, `${prefix}[${idx}]`, out));
    return out;
  }
  if (typeof input === "object") {
    Object.entries(input as Record<string, unknown>).forEach(([k, v]) => {
      const next = prefix ? `${prefix}.${k}` : k;
      flattenObject(v, next, out);
    });
    return out;
  }
  out[prefix] = String(input).replace(/\s+/g, " ").trim();
  return out;
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMeta(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const r = /<meta[^>]+(?:name|property)=["']([^"']+)["'][^>]+content=["']([^"']+)["'][^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = r.exec(html))) out[m[1].toLowerCase()] = m[2];
  return out;
}

function parseTitle(html: string): string {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "";
}

function parseJsonLd(html: string): unknown[] {
  const blocks: unknown[] = [];
  const r = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = r.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1].trim()));
    } catch {
      // ignore
    }
  }
  return blocks;
}

function parseXmlLike(xml: string): Record<string, string> {
  const out: Record<string, string> = {};
  const r = /<([a-zA-Z0-9_:.-]+)>([^<]{1,300})<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = r.exec(xml))) {
    const k = m[1].toLowerCase();
    if (!out[k]) out[k] = m[2].trim();
  }
  return out;
}

function canonicalize(flat: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  const entries = Object.entries(flat).map(([k, v]) => [k.toLowerCase(), v] as const);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    const hit = entries.find(([k]) => aliases.some((a) => k.includes(a)));
    if (hit) out[field] = hit[1];
  }
  return out;
}

function groupSections(canonical: Record<string, string>, flat: Record<string, string>) {
  const sections: Record<string, Record<string, string>> = {
    medicine_information: {},
    manufacturer_details: {},
    tracking_information: {},
    additional_metadata: {},
  };

  const assign = (section: string, key: string) => {
    if (canonical[key]) sections[section][key] = canonical[key];
  };
  // Medicine Information includes production-related fields too (per UX requirement).
  [
    "medicine_name",
    "generic_name",
    "strength",
    "dosage",
    "composition",
    "ingredients",
    "package_size",
    "serial_number",
    "batch_number",
    "manufacturing_date",
    "expiry_date",
    "gtin",
  ].forEach((k) => assign("medicine_information", k));

  // Manufacturer Details includes name/address + license.
  ["manufacturer", "address", "country", "license_number", "product_image"].forEach((k) =>
    assign("manufacturer_details", k)
  );
  ["scan_history", "location_history", "barcode"].forEach((k) => assign("tracking_information", k));

  const used = new Set(Object.values(sections).flatMap((s) => Object.keys(s)));
  Object.entries(flat).forEach(([k, v]) => {
    if (!used.has(k) && v && v.length < 280) sections.additional_metadata[k] = v;
  });

  return sections;
}

function extractKeyFieldsFromText(text: string): Record<string, string> {
  const t = text.replace(/\s+/g, " ").trim();
  const get = (re: RegExp) => re.exec(t)?.[1]?.trim() || "";
  const out: Record<string, string> = {};

  out.serial_number =
    get(/unique product identification code[:\-]?\s*([A-Z0-9\-\/]+)/i) ||
    get(/unique\s*product\s*id[:\-]?\s*([A-Z0-9\-\/]+)/i) ||
    get(/serial(?: number)?[:\-]?\s*([A-Z0-9\-\/]+)/i);

  out.medicine_name =
    get(
      /proper and generic name of the drug[:\-]?\s*([^|]+?)(?=\s(?:batch|lot|date of|mfg|exp|manufacturer|license|$))/i
    ) ||
    get(
      /proper\s*&\s*generic\s*name[:\-]?\s*([^|]+?)(?=\s(?:batch|lot|date of|mfg|exp|manufacturer|license|$))/i
    );

  out.batch_number =
    get(/batch(?: number)?[:\-]?\s*([A-Z0-9\-\/]{4,})/i) ||
    get(/lot(?: number)?[:\-]?\s*([A-Z0-9\-\/]{4,})/i);

  out.manufacturing_date =
    get(/date of manufacturing[:\-]?\s*([A-Z0-9\-\/.]{4,})/i) ||
    get(/manufacturing date[:\-]?\s*([A-Z0-9\-\/.]{4,})/i) ||
    get(/mfg(?:\s*dt|\s*date)?[:\-]?\s*([A-Z0-9\-\/.]{4,})/i);

  out.expiry_date =
    get(/date of expiry[:\-]?\s*([A-Z0-9\-\/.]{4,})/i) ||
    get(/expiry date[:\-]?\s*([A-Z0-9\-\/.]{4,})/i) ||
    get(/exp(?:\s*dt|\s*date)?[:\-]?\s*([A-Z0-9\-\/.]{4,})/i);

  const mfg =
    get(/name and address of the manufacturer[:\-]?\s*([^|]+?)(?=\s(?:manufacturing license|license|batch|date of|$))/i) ||
    get(/address of the manufacturer[:\-]?\s*([^|]+?)(?=\s(?:manufacturing license|license|batch|date of|$))/i);
  if (mfg) out.manufacturer = mfg;

  out.license_number =
    get(/manufacturing license number[:\-]?\s*([A-Z0-9\-\/]+)/i) ||
    get(/manufacturing licence number[:\-]?\s*([A-Z0-9\-\/]+)/i) ||
    get(/license(?: number)?[:\-]?\s*([A-Z0-9\-\/]+)/i);

  return Object.fromEntries(Object.entries(out).filter(([, v]) => Boolean(v)));
}

function confidenceScore(canonical: Record<string, string>, sourceUrl: string | null): { score: number; status: "verified" | "suspicious" | "unknown"; reasons: string[] } {
  let score = 20;
  const reasons: string[] = [];
  if (canonical.medicine_name) score += 18; else reasons.push("Medicine name not confidently detected.");
  if (canonical.batch_number) score += 14; else reasons.push("Batch number missing.");
  if (canonical.expiry_date) score += 14; else reasons.push("Expiry date missing.");
  if (canonical.manufacturer) score += 14; else reasons.push("Manufacturer missing.");
  if (canonical.gtin || canonical.serial_number) score += 10;
  if (canonical.license_number) score += 8;
  if (sourceUrl && TRUSTED_DOMAIN_RE.test(new URL(sourceUrl).hostname)) score += 12;
  score = Math.max(5, Math.min(99, score));

  if (score >= 72) return { score, status: "verified", reasons };
  if (score >= 40) return { score, status: "unknown", reasons };
  reasons.unshift("Low confidence due to sparse/ambiguous fields.");
  return { score, status: "suspicious", reasons };
}

async function fetchWithRedirects(url: string, maxHops = 5) {
  const chain: string[] = [];
  let current = url;
  let response: Response | null = null;
  for (let i = 0; i < maxHops; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    try {
      response = await fetch(current, {
        redirect: "manual",
        signal: ctrl.signal,
        headers: {
          "User-Agent": "VerifyRX-Universal-Intel/1.0",
          Accept: "application/json,text/html,application/xml,text/xml,*/*;q=0.8",
        },
      });
    } finally {
      clearTimeout(t);
    }

    chain.push(current);
    if (response.status >= 300 && response.status < 400) {
      const loc = response.headers.get("location");
      if (!loc) break;
      current = new URL(loc, current).toString();
      continue;
    }
    return { response, chain, finalUrl: response.url || current };
  }
  return { response, chain, finalUrl: current };
}

export async function runUniversalIntel(qrText: string): Promise<UniversalIntelResult> {
  const qr_type = detectQrType(qrText);
  let source_type: UniversalIntelResult["source_type"] = "direct";
  let source_url: string | null = null;
  let redirect_chain: string[] = [];
  let key_values: Record<string, string> = {};
  let rawSource: UniversalIntelResult["raw_source_data"] = {
    content_type: "text/plain",
    preview: qrText.slice(0, 2500),
  };

  if (qr_type === "url") {
    source_url = qrText.trim();
    if (!isSafePublicUrl(source_url)) {
      return {
        qr_type,
        source_type: "direct",
        source_url,
        redirect_chain,
        medicine_name: "Unsafe URL blocked",
        authenticity_status: "suspicious",
        confidence_score: 5,
        suspicious_reasons: ["Blocked non-public or unsafe URL."],
        canonical_fields: {},
        key_values: { qr_payload: qrText },
        sections: { additional_metadata: { qr_payload: qrText } },
        raw_source_data: rawSource,
      };
    }

    const { response, chain, finalUrl } = await fetchWithRedirects(source_url, 6);
    redirect_chain = chain;
    source_url = finalUrl;
    const contentType = response?.headers.get("content-type") || "";
    const text = response ? await response.text() : "";
    rawSource = { content_type: contentType, preview: text.slice(0, 4000) };

    if (contentType.includes("json")) {
      source_type = "api";
      try {
        const parsed = JSON.parse(text) as unknown;
        key_values = flattenObject(parsed);
        rawSource.json = parsed;
      } catch {
        key_values = flattenObject({ raw_json_text: text.slice(0, 4000) });
      }
    } else if (contentType.includes("xml")) {
      source_type = "xml";
      key_values = flattenObject(parseXmlLike(text));
      rawSource.xml_preview = text.slice(0, 4000);
    } else {
      source_type = "html";
      const meta = parseMeta(text);
      const title = parseTitle(text);
      const jsonld = parseJsonLd(text);
      const visible = stripHtml(text).slice(0, 6000);
      key_values = flattenObject({ title, meta, jsonld, visible_text: visible });
      rawSource.html_preview = text.slice(0, 4000);
    }
  } else if (qr_type === "json") {
    source_type = "api";
    const parsed = JSON.parse(qrText) as unknown;
    key_values = flattenObject(parsed);
    rawSource = {
      content_type: "application/json",
      preview: JSON.stringify(parsed).slice(0, 4000),
      json: parsed,
    };
  } else {
    key_values = flattenObject({ qr_payload: qrText });
  }

  // First-pass canonicalization via keys/metadata.
  const canonical_fields = canonicalize(key_values);
  // Second-pass extraction from visible text for pharma portals that embed labels in text.
  const visible = key_values.visible_text || "";
  const extracted = visible ? extractKeyFieldsFromText(visible) : {};
  for (const [k, v] of Object.entries(extracted)) {
    if (!canonical_fields[k]) canonical_fields[k] = v;
  }
  const conf = confidenceScore(canonical_fields, source_url);
  const sections = groupSections(canonical_fields, key_values);
  const medicine_name =
    canonical_fields.medicine_name || canonical_fields.generic_name || (qr_type === "medicine_id" ? qrText : "Unknown medicine");

  const structured = {
    medicineInformation: {
      uniqueProductIdentificationCode: canonical_fields.serial_number || "",
      properAndGenericDrugName: canonical_fields.medicine_name || canonical_fields.generic_name || "",
      batchNumber: canonical_fields.batch_number || "",
      manufacturingDate: canonical_fields.manufacturing_date || "",
      expiryDate: canonical_fields.expiry_date || "",
    },
    manufacturerDetails: {
      manufacturerNameAndAddress: canonical_fields.manufacturer || canonical_fields.address || "",
      manufacturingLicenseNumber: canonical_fields.license_number || "",
    },
  };

  return {
    qr_type,
    source_type,
    source_url,
    redirect_chain,
    medicine_name,
    authenticity_status: conf.status,
    confidence_score: conf.score,
    suspicious_reasons: conf.reasons,
    canonical_fields,
    key_values,
    sections,
    structured,
    raw_source_data: rawSource,
  };
}
