import type { ScanResponse } from "@/types/api";
import {
  getMedicineScore,
  getSourceTier,
  isPlausibleMedicineName,
  isStrongSource,
  isValidMedicineData,
  isWeakSource,
  sanitizeScanResponse,
  sanitizeText,
} from "@/utils/medicineValidation";

export type ScanUpdateOrigin =
  | "qr_local"
  | "qr_cloud"
  | "medicine_api"
  | "cache"
  | "unknown";

export type ScanUpdateDecision = {
  accept: boolean;
  /** Payload to apply when accept is true (may be merged enrichment). */
  next: ScanResponse | null;
  reason: string;
  currentScore: number;
  incomingScore: number;
  merged: boolean;
};

const DEBUG =
  typeof import.meta !== "undefined" &&
  Boolean(import.meta.env?.DEV);

function log(event: string, detail: Record<string, unknown>) {
  if (!DEBUG) return;
  console.info(`[VerifyRX:scan-state] ${event}`, detail);
}

function pickBetterName(current: ScanResponse, incoming: ScanResponse): string {
  const cur = sanitizeText(current.medicine_name);
  const inc = sanitizeText(incoming.medicine_name);
  if (isPlausibleMedicineName(cur) && !isPlausibleMedicineName(inc)) return cur;
  if (!isPlausibleMedicineName(cur) && isPlausibleMedicineName(inc)) return inc;
  if (cur.length >= inc.length && isPlausibleMedicineName(cur)) return cur;
  return inc || cur;
}

function mergeRecord(
  base: Record<string, string> | undefined,
  extra: Record<string, string> | undefined,
  preferBase = true
): Record<string, string> {
  const out: Record<string, string> = { ...(base || {}) };
  for (const [k, v] of Object.entries(extra || {})) {
    const clean = sanitizeText(v);
    if (!clean) continue;
    if (!out[k] || !preferBase) out[k] = clean;
    else if (!sanitizeText(out[k])) out[k] = clean;
  }
  return out;
}

function mergeSections(
  base?: Record<string, Record<string, string>>,
  extra?: Record<string, Record<string, string>>
): Record<string, Record<string, string>> | undefined {
  if (!base && !extra) return undefined;
  const out: Record<string, Record<string, string>> = { ...(base || {}) };
  for (const [section, fields] of Object.entries(extra || {})) {
    out[section] = mergeRecord(out[section], fields as Record<string, string>, true);
  }
  return out;
}

/**
 * Enrichment-only merge: never remove existing fields; prefer stronger source metadata.
 */
export function mergeScanResults(
  current: ScanResponse,
  incoming: ScanResponse
): ScanResponse {
  const keepCurrentSource =
    getSourceTier(current.source_type) >= getSourceTier(incoming.source_type);

  const merged: ScanResponse = {
    ...current,
    id: current.id,
    qr_type: current.qr_type || incoming.qr_type,
    source_type: keepCurrentSource ? current.source_type : incoming.source_type,
    source_url: current.source_url || incoming.source_url,
    medicine_name: pickBetterName(current, incoming),
    canonical_fields: mergeRecord(current.canonical_fields, incoming.canonical_fields, true),
    key_values: mergeRecord(current.key_values, incoming.key_values, true),
    sections: mergeSections(
      current.sections as Record<string, Record<string, string>> | undefined,
      incoming.sections as Record<string, Record<string, string>> | undefined
    ),
    fetched_data: { ...incoming.fetched_data, ...current.fetched_data },
    redirect_chain: current.redirect_chain?.length
      ? current.redirect_chain
      : incoming.redirect_chain,
    raw_source_data: current.raw_source_data || incoming.raw_source_data,
    structured:
      current.structured && incoming.structured
        ? {
            medicineInformation: {
              uniqueProductIdentificationCode:
                current.structured.medicineInformation.uniqueProductIdentificationCode ||
                incoming.structured.medicineInformation.uniqueProductIdentificationCode,
              properAndGenericDrugName:
                current.structured.medicineInformation.properAndGenericDrugName ||
                incoming.structured.medicineInformation.properAndGenericDrugName,
              batchNumber:
                current.structured.medicineInformation.batchNumber ||
                incoming.structured.medicineInformation.batchNumber,
              manufacturingDate:
                current.structured.medicineInformation.manufacturingDate ||
                incoming.structured.medicineInformation.manufacturingDate,
              expiryDate:
                current.structured.medicineInformation.expiryDate ||
                incoming.structured.medicineInformation.expiryDate,
            },
            manufacturerDetails: {
              manufacturerNameAndAddress:
                current.structured.manufacturerDetails.manufacturerNameAndAddress ||
                incoming.structured.manufacturerDetails.manufacturerNameAndAddress,
              manufacturingLicenseNumber:
                current.structured.manufacturerDetails.manufacturingLicenseNumber ||
                incoming.structured.manufacturerDetails.manufacturingLicenseNumber,
            },
          }
        : current.structured || incoming.structured,
    authenticity_status:
      current.authenticity_status === "verified"
        ? current.authenticity_status
        : incoming.authenticity_status,
    confidence_score: Math.max(
      current.confidence_score ?? 0,
      incoming.confidence_score ?? 0
    ),
    suspicious_reasons: [
      ...new Set([...(current.suspicious_reasons || []), ...(incoming.suspicious_reasons || [])]),
    ],
    risk_level:
      current.risk_level === "low" ? current.risk_level : incoming.risk_level,
  };

  return sanitizeScanResponse(merged);
}

/**
 * Decide whether an async payload may replace or enrich UI state.
 */
export function resolveScanUpdate(
  current: ScanResponse | null,
  incoming: ScanResponse,
  origin: ScanUpdateOrigin
): ScanUpdateDecision {
  const sanitized = sanitizeScanResponse(incoming);
  const incomingScore = getMedicineScore(sanitized);
  const currentScore = current ? getMedicineScore(current) : 0;

  if (!current) {
    log("initial", {
      origin,
      incomingScore,
      source: sanitized.source_type,
      valid: isValidMedicineData(sanitized),
    });
    return {
      accept: true,
      next: sanitized,
      reason: "initial_accept",
      currentScore: 0,
      incomingScore,
      merged: false,
    };
  }

  const currentStrong = isStrongSource(current.source_type);
  const incomingWeak = isWeakSource(sanitized.source_type);

  if (currentStrong && incomingWeak) {
    const enriched = mergeScanResults(current, sanitized);
    const enrichedScore = getMedicineScore(enriched);
    if (enrichedScore > currentScore) {
      log("enrich_weak_incoming", {
        origin,
        currentScore,
        incomingScore,
        enrichedScore,
        source: sanitized.source_type,
      });
      return {
        accept: true,
        next: enriched,
        reason: "enrich_only_weak_source",
        currentScore,
        incomingScore,
        merged: true,
      };
    }
    log("reject_weak_overwrite", {
      origin,
      currentScore,
      incomingScore,
      currentSource: current.source_type,
      incomingSource: sanitized.source_type,
    });
    return {
      accept: false,
      next: null,
      reason: "blocked_weak_source_overwrite",
      currentScore,
      incomingScore,
      merged: false,
    };
  }

  if (incomingScore < currentScore - 15) {
    const enriched = mergeScanResults(current, sanitized);
    if (getMedicineScore(enriched) > currentScore) {
      log("enrich_downgrade_attempt", { origin, currentScore, incomingScore });
      return {
        accept: true,
        next: enriched,
        reason: "enrich_instead_of_downgrade",
        currentScore,
        incomingScore,
        merged: true,
      };
    }
    log("reject_downgrade", { origin, currentScore, incomingScore });
    return {
      accept: false,
      next: null,
      reason: "rejected_lower_quality_score",
      currentScore,
      incomingScore,
      merged: false,
    };
  }

  if (incomingScore > currentScore + 5) {
    log("accept_upgrade", { origin, currentScore, incomingScore });
    return {
      accept: true,
      next: sanitized,
      reason: "accepted_higher_quality",
      currentScore,
      incomingScore,
      merged: false,
    };
  }

  const enriched = mergeScanResults(current, sanitized);
  log("accept_merge_tie", { origin, currentScore, incomingScore });
  return {
    accept: true,
    next: enriched,
    reason: "merged_equal_or_near_quality",
    currentScore,
    incomingScore,
    merged: true,
  };
}

/** Apply guarded update for React setState. Returns whether state changed. */
export function applyScanUpdate(
  current: ScanResponse | null,
  incoming: ScanResponse,
  origin: ScanUpdateOrigin,
  onUpdate: (next: ScanResponse) => void
): ScanUpdateDecision {
  const decision = resolveScanUpdate(current, incoming, origin);
  if (decision.accept && decision.next) {
    onUpdate(decision.next);
  } else if (!decision.accept) {
    log("rejected", {
      origin,
      reason: decision.reason,
      currentScore: decision.currentScore,
      incomingScore: decision.incomingScore,
    });
  }
  return decision;
}
