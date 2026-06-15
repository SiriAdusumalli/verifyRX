import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { shortHash } from "../_shared/hash.ts";
import { checkScanRateLimit } from "../_shared/rateLimit.ts";
import { detectQrType, extractFromUrl, flattenObject, isSafeUrl, mapCanonical } from "../_shared/qr_utils.ts";

type Risk = "low" | "medium" | "high";
type VerificationStatus = "verified" | "suspicious" | "unknown";

type ScanBody = {
  qr_text?: string | null;
  barcode?: string | null;
  image?: string | null;
  client_extracted_text?: string | null;
  image_mime?: string | null;
};

function normalizeInput(body: ScanBody): string {
  return String(body.qr_text || body.barcode || body.client_extracted_text || "").trim();
}

function confidence(canonicalCount: number, keyCount: number, suspicious: boolean): number {
  const base = Math.min(100, 35 + canonicalCount * 10 + Math.min(25, Math.floor(keyCount / 8)));
  return Math.max(5, suspicious ? base - 25 : base);
}

function detectSuspicious(flat: Record<string, string>) {
  const reasons: string[] = [];
  const values = Object.values(flat).join(" ").toLowerCase();
  if (/free money|bitcoin|adult|casino|loan/.test(values)) reasons.push("Contains non-medical risky keywords.");
  if (!Object.keys(mapCanonical(flat)).length) reasons.push("No core medicine fields detected.");
  if (!/(batch|lot|exp|expiry|manufacturer|ingredient|medicine)/.test(values)) {
    reasons.push("Missing expected pharma context in payload.");
  }
  return reasons;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  if (!supabaseUrl || !serviceKey || !anonKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  try {
    const body = (await req.json()) as ScanBody;
    const qrText = normalizeInput(body);
    const image = body.image?.trim() || null;
    const imageHash = image ? await shortHash(image) : null;
    if (!qrText && !image) return jsonResponse({ error: "Missing QR payload." }, 400);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const supabaseAuth = createClient(supabaseUrl, anonKey);
    const { data: userData } = jwt
      ? await supabaseAuth.auth.getUser(jwt)
      : { data: { user: null } };
    const userId = userData.user?.id ?? null;

    const fwd = req.headers.get("x-forwarded-for") || "";
    const ip = fwd.split(",")[0].trim() || "anon";
    const rateBucket = userId ? `user:${userId}` : `ip:${ip}`;

    const rl = await checkScanRateLimit(supabaseUrl, serviceKey, rateBucket);
    if (!rl.ok) {
      return jsonResponse(
        { error: "Rate limit exceeded. Try again in a minute." },
        429
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const qrType = qrText ? detectQrType(qrText) : "text";
    const fetched: Record<string, unknown> = {};
    let sourceUrl: string | null = null;
    let sourceType: "direct" | "api" | "html" = "direct";
    let extractionFlat: Record<string, string> = {};

    if (qrType === "url" && qrText) {
      if (!isSafeUrl(qrText)) return jsonResponse({ error: "Unsafe URL blocked." }, 400);
      const ext = await extractFromUrl(qrText);
      sourceUrl = ext.finalUrl;
      sourceType = ext.sourceType;
      fetched.title = ext.title;
      fetched.metadata = ext.metadata;
      fetched.parsed = ext.parsed;
      fetched.excerpt = ext.excerpt;
      extractionFlat = ext.flat;
    } else if (qrType === "json" && qrText) {
      const parsed = JSON.parse(qrText) as unknown;
      fetched.parsed = parsed;
      extractionFlat = flattenObject(parsed);
    } else {
      extractionFlat = flattenObject({ payload: qrText || "", image_hash: imageHash || "" });
    }

    const canonical = mapCanonical(extractionFlat);
    const suspiciousReasons = detectSuspicious(extractionFlat);
    const verificationStatus: VerificationStatus = suspiciousReasons.length
      ? "suspicious"
      : Object.keys(canonical).length
      ? "verified"
      : "unknown";
    const riskLevel: Risk =
      verificationStatus === "suspicious" ? "high" : verificationStatus === "verified" ? "low" : "medium";
    const confidenceScore = confidence(Object.keys(canonical).length, Object.keys(extractionFlat).length, verificationStatus === "suspicious");

    const medicineName =
      canonical.medicine_name ||
      (qrType === "medicine_id" ? `Medicine ID ${qrText}` : "") ||
      "Unknown medicine";
    const composition = canonical.ingredients || "Unknown";
    const warnings = canonical.warnings ? [canonical.warnings] : [];

    const { data: inserted, error: medErr } = await admin
      .from("medicines")
      .insert({
        barcode: qrType === "medicine_id" ? qrText : null,
        image_hash: imageHash,
        name: medicineName.slice(0, 500),
        composition: composition.slice(0, 2000),
        usage: [],
        side_effects: [],
        warnings,
        risk_level: riskLevel,
        dosage_guidance: "",
        disclaimer: "Always verify medicine from trusted source.",
        openfda_raw: fetched as Record<string, unknown>,
        scrape_raw: JSON.stringify(extractionFlat).slice(0, 8000),
        qr_type: qrType,
        source_url: sourceUrl,
        source_type: sourceType,
        authenticity_status: verificationStatus,
        confidence_score: confidenceScore,
        dynamic_data: extractionFlat,
        canonical_fields: canonical,
      })
      .select("id")
      .single();

    if (medErr || !inserted?.id) return jsonResponse({ error: "Failed to save medicine." }, 500);
    const medId = inserted.id as string;

    await admin.from("scan_logs").insert({
      user_id: userId,
      qr_raw: qrText || null,
      qr_type: qrType,
      source_url: sourceUrl,
      metadata: extractionFlat,
      medicine_id: medId,
    });
    await admin.from("qr_verifications").insert({
      medicine_id: medId,
      status: verificationStatus,
      confidence_score: confidenceScore,
      suspicious_reasons: suspiciousReasons,
      raw_payload: { qr_text: qrText, fetched, flat: extractionFlat },
    });

    return jsonResponse({
      id: medId,
      qr_type: qrType,
      source_type: sourceType,
      source_url: sourceUrl,
      authenticity_status: verificationStatus,
      confidence_score: confidenceScore,
      suspicious_reasons: suspiciousReasons,
      medicine_name: medicineName,
      key_values: extractionFlat,
      canonical_fields: canonical,
      fetched_data: fetched,
      risk_level: riskLevel,
    });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: "Network error" }, 500);
  }
});
