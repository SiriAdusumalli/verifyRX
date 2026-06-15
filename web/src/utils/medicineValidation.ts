import type { ScanResponse } from "@/types/api";

/** Trusted sources must not be replaced by weaker parsers. */
export type MedicineSourceKind =
  | ScanResponse["source_type"]
  | "verified"
  | "database"
  | "scraped"
  | "fallback";

const SOURCE_TIER: Record<string, number> = {
  verified: 5,
  database: 5,
  api: 4,
  direct: 3,
  xml: 3,
  html: 1,
  scraped: 0,
  fallback: 0,
};

const WEAK_SOURCES = new Set(["html", "scraped", "fallback"]);
const STRONG_SOURCES = new Set(["verified", "database", "api", "direct", "xml"]);

const HTML_TITLE_JUNK =
  /\b(home|login|sign\s*in|404|error|welcome|index|portal|dashboard)\b/i;
const RANDOM_SLUG_RE = /^[A-Za-z]{2,12}\d{1,4}$/;
const UNKNOWN_NAME_RE = /^unknown\s+medicine$/i;

/** Strip parser noise from display strings. */
export function sanitizeText(raw: unknown, maxLen = 500): string {
  if (raw === null || raw === undefined) return "";
  let s = String(raw)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#\d+;/g, " ")
    .replace(/\u0000/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (s.length > maxLen) s = `${s.slice(0, maxLen - 1)}…`;
  return s;
}

export function getSourceTier(sourceType?: string | null): number {
  if (!sourceType) return 2;
  return SOURCE_TIER[sourceType.toLowerCase()] ?? 2;
}

export function isWeakSource(sourceType?: string | null): boolean {
  return WEAK_SOURCES.has(String(sourceType || "").toLowerCase());
}

export function isStrongSource(sourceType?: string | null): boolean {
  return STRONG_SOURCES.has(String(sourceType || "").toLowerCase());
}

function countFilled(obj?: Record<string, string>): number {
  if (!obj) return 0;
  return Object.values(obj).filter((v) => sanitizeText(v).length > 0).length;
}

function structuredFieldCount(scan: ScanResponse): number {
  const s = scan.structured;
  if (!s) return 0;
  let n = 0;
  const mi = s.medicineInformation;
  const md = s.manufacturerDetails;
  if (mi) {
    n += [
      mi.uniqueProductIdentificationCode,
      mi.properAndGenericDrugName,
      mi.batchNumber,
      mi.manufacturingDate,
      mi.expiryDate,
    ].filter((v) => sanitizeText(v)).length;
  }
  if (md) {
    n += [md.manufacturerNameAndAddress, md.manufacturingLicenseNumber].filter((v) =>
      sanitizeText(v)
    ).length;
  }
  return n;
}

function sectionFieldCount(scan: ScanResponse): number {
  if (!scan.sections) return 0;
  return Object.values(scan.sections).reduce(
    (sum, section) => sum + countFilled(section as Record<string, string>),
    0
  );
}

/** Reject obvious HTML-title / slug garbage used as medicine names. */
export function isPlausibleMedicineName(name: string): boolean {
  const n = sanitizeText(name, 200);
  if (!n || n.length < 3) return false;
  if (UNKNOWN_NAME_RE.test(n)) return false;
  if (RANDOM_SLUG_RE.test(n.replace(/\s/g, ""))) return false;
  if (HTML_TITLE_JUNK.test(n) && n.length < 40) return false;
  if (/^[\d\s\-./]+$/.test(n)) return false;
  if (n.includes("|") && n.length < 60) return false;
  return true;
}

/**
 * Quality score for comparing two ScanResponse payloads.
 * Higher = more complete / trustworthy.
 */
export function getMedicineScore(scan: ScanResponse): number {
  let score = getSourceTier(scan.source_type) * 100;

  const name = sanitizeText(scan.medicine_name);
  if (isPlausibleMedicineName(name)) score += 80;
  else if (name) score -= 120;

  const canonical = scan.canonical_fields || {};
  score += countFilled(canonical) * 22;
  score += sectionFieldCount(scan) * 18;
  score += structuredFieldCount(scan) * 28;

  const kv = scan.key_values || {};
  const kvCount = Object.values(kv).filter((v) => sanitizeText(v).length > 2).length;
  score += Math.min(kvCount, 12) * 6;

  if (sanitizeText(canonical.batch_number || canonical.lot)) score += 45;
  if (sanitizeText(canonical.manufacturer)) score += 45;
  if (sanitizeText(canonical.expiry_date || canonical.expiration)) score += 40;
  if (sanitizeText(canonical.license_number)) score += 30;

  if (scan.authenticity_status === "verified") score += 35;
  if (scan.authenticity_status === "suspicious") score -= 25;

  score += Math.min(99, Math.max(0, scan.confidence_score ?? 0)) * 1.5;

  if (isWeakSource(scan.source_type) && structuredFieldCount(scan) < 2 && sectionFieldCount(scan) < 2) {
    score -= 90;
  }

  return Math.round(score);
}

/** Minimum bar before showing / storing as primary verification data. */
export function isValidMedicineData(scan: ScanResponse | null | undefined): boolean {
  if (!scan?.id) return false;

  const score = getMedicineScore(scan);
  const nameOk = isPlausibleMedicineName(scan.medicine_name);
  const hasStructure =
    structuredFieldCount(scan) >= 2 ||
    sectionFieldCount(scan) >= 2 ||
    countFilled(scan.canonical_fields) >= 3;

  if (isWeakSource(scan.source_type)) {
    return score >= 280 && (nameOk || hasStructure);
  }

  return score >= 180 && (nameOk || hasStructure || getSourceTier(scan.source_type) >= 4);
}

export function sanitizeScanResponse(scan: ScanResponse): ScanResponse {
  const canonical_fields: Record<string, string> = {};
  for (const [k, v] of Object.entries(scan.canonical_fields || {})) {
    const clean = sanitizeText(v);
    if (clean) canonical_fields[k] = clean;
  }

  const key_values: Record<string, string> = {};
  for (const [k, v] of Object.entries(scan.key_values || {})) {
    const clean = sanitizeText(v, 2000);
    if (clean) key_values[k] = clean;
  }

  let medicine_name = sanitizeText(scan.medicine_name, 200);
  if (!isPlausibleMedicineName(medicine_name)) {
    const fromCanonical = sanitizeText(canonical_fields.medicine_name);
    if (isPlausibleMedicineName(fromCanonical)) medicine_name = fromCanonical;
    else if (scan.structured?.medicineInformation?.properAndGenericDrugName) {
      const alt = sanitizeText(scan.structured.medicineInformation.properAndGenericDrugName);
      if (isPlausibleMedicineName(alt)) medicine_name = alt;
    }
  }

  return {
    ...scan,
    medicine_name,
    canonical_fields,
    key_values,
    source_url: scan.source_url ? sanitizeText(scan.source_url, 2000) : null,
    suspicious_reasons: (scan.suspicious_reasons || []).map((r) => sanitizeText(r, 300)).filter(Boolean),
  };
}
