import type { ScanResponse } from "@/types/api";

function firstString(...vals: (unknown | undefined)[]): string | null {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function digObject(obj: unknown, keys: string[]): string | null {
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
  }
  return null;
}

/** Hyphenated internal SKU pattern (legacy). */
const BARE_MEDICINE_ID = /^[A-Z0-9]{2,10}(?:-[A-Z0-9]{2,12}){1,4}$/i;
const UUID_LIKE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * True when the scanned payload should be used as `medicines.medicine_id` for `.eq(...)`.
 * Includes numeric barcodes (EAN/UPC), compact alphanumerics, UUIDs, and hyphenated SKUs.
 */
export function isScannedTokenForMedicineIdColumn(s: string): boolean {
  const t = s.trim();
  if (t.length < 3 || t.length > 128) return false;
  if (t.startsWith("{") || t.startsWith("[")) return false;
  if (/^https?:\/\//i.test(t)) return false;
  if (/\r|\n/.test(t)) return false;

  if (/^\d{4,20}$/.test(t)) return true;
  if (UUID_LIKE.test(t)) return true;
  if (BARE_MEDICINE_ID.test(t)) return true;
  if (/^[A-Za-z0-9][A-Za-z0-9_.\-]{2,127}$/.test(t)) return true;
  if (/^[A-Za-z0-9_.\-:()]{3,128}$/.test(t)) return true;
  return false;
}

function extractMedicineIdFromUrl(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    const q =
      u.searchParams.get("medicine_id") ||
      u.searchParams.get("medicineId") ||
      u.searchParams.get("product_id") ||
      u.searchParams.get("id") ||
      u.searchParams.get("barcode") ||
      u.searchParams.get("gtin");
    if (q?.trim()) return q.trim();
    const parts = u.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1];
    if (last && isScannedTokenForMedicineIdColumn(decodeURIComponent(last))) {
      return decodeURIComponent(last);
    }
  } catch {
    // ignore
  }
  return null;
}

/** GS1 / human scan: pull (01) GTIN-14 if present, else first long digit run. */
function extractGtinFromGs1OrText(s: string): string | null {
  const t = s.trim();
  const m01 = t.match(/\(01\)(\d{14})/);
  if (m01?.[1]) return m01[1];
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 8 && digits.length <= 14) return digits;
  return null;
}

/**
 * Value used to query `medicines.medicine_id` (read-only).
 * After a barcode / QR scan, the same string (or a field from the parsed response) must match
 * the `medicine_id` column in your `medicines` rows.
 */
export function resolveMedicineIdFromScan(
  scan: ScanResponse,
  scannedQrRaw?: string | null
): string | null {
  const raw = scannedQrRaw?.trim();
  const firstLine = raw?.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? "";

  if (firstLine.startsWith("{")) {
    try {
      const j = JSON.parse(firstLine) as Record<string, unknown>;
      const id = digObject(j, [
        "medicine_id",
        "medicineId",
        "MEDICINE_ID",
        "product_id",
        "sku",
        "barcode",
        "gtin",
        "GTIN",
        "code",
      ]);
      if (id) return id;
    } catch {
      // ignore
    }
  }

  if (firstLine && /^https?:\/\//i.test(firstLine)) {
    const fromUrl = extractMedicineIdFromUrl(firstLine);
    if (fromUrl) return fromUrl;
  }

  if (firstLine && isScannedTokenForMedicineIdColumn(firstLine)) {
    return firstLine;
  }

  if (firstLine && (firstLine.includes("(01)") || /\d{8,}/.test(firstLine))) {
    const g = extractGtinFromGs1OrText(firstLine);
    if (g) return g;
  }

  if (scan.qr_type === "medicine_id" && firstLine) {
    return firstLine;
  }

  const kv = scan.key_values || {};
  const fromKv = firstString(
    kv.barcode,
    kv.Barcode,
    kv.gtin,
    kv.GTIN,
    kv.medicine_id,
    kv.MEDICINE_ID,
    kv.medicineId,
    kv.product_id,
    kv.sku,
    kv.qr_payload
  );
  if (fromKv) {
    if (isScannedTokenForMedicineIdColumn(fromKv)) return fromKv;
    const g = extractGtinFromGs1OrText(fromKv);
    if (g) return g;
  }

  const fromCanon = firstString(
    scan.canonical_fields?.medicine_id,
    scan.canonical_fields?.medicineId,
    scan.canonical_fields?.product_id,
    scan.canonical_fields?.barcode
  );
  if (fromCanon && isScannedTokenForMedicineIdColumn(fromCanon)) return fromCanon;

  const kvMatch = Object.entries(kv).find(([k]) =>
    /^(medicine_?id|product_?id|sku|barcode|gtin|serial)$/i.test(k.replace(/\s+/g, "_"))
  );
  if (kvMatch?.[1]) {
    const v = String(kvMatch[1]).trim();
    if (isScannedTokenForMedicineIdColumn(v)) return v;
    const g = extractGtinFromGs1OrText(v);
    if (g) return g;
  }

  const fromFetched = digObject(scan.fetched_data, [
    "medicine_id",
    "medicineId",
    "product_id",
    "barcode",
    "gtin",
  ]);
  if (fromFetched && isScannedTokenForMedicineIdColumn(fromFetched)) return fromFetched;

  const upic = scan.structured?.medicineInformation?.uniqueProductIdentificationCode?.trim();
  if (upic && isScannedTokenForMedicineIdColumn(upic)) return upic;

  return null;
}
