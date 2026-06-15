import type {
  CompareRequest,
  CompareResponse,
  MedicineRecord,
  ScanRequest,
  ScanResponse,
} from "@/types/api";

import { getFunctionsUrl, supabase } from "@/lib/supabase";

async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return {};

  return {
    Authorization: `Bearer ${session.access_token}`,
  };
}

export async function invokeScan(
  body: ScanRequest
): Promise<ScanResponse> {
  const base = getFunctionsUrl();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await authHeader()),
  };

  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (anon) headers.apikey = anon;

  let res: Response;

  try {
    res = await fetch(`${base}/scan`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Could not reach verification service. Check VITE_SUPABASE_FUNCTIONS_URL, internet, and deployment."
    );
  }

  const json = (await res.json()) as ScanResponse & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(json.error || "Scan failed");
  }

  return json;
}

export async function invokeQrIntel(
  body: ScanRequest,
  options?: { signal?: AbortSignal }
): Promise<ScanResponse> {
  const base = getFunctionsUrl();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await authHeader()),
  };

  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (anon) headers.apikey = anon;

  let res: Response;

  try {
    res = await fetch(`${base}/qr-intel`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: options?.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw e;
    }

    throw new Error(
      "Universal intelligence service is unreachable."
    );
  }

  const json = (await res.json()) as ScanResponse & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(json.error || "Universal scan failed");
  }

  return json;
}

export async function invokeCompare(
  body: CompareRequest
): Promise<CompareResponse> {
  const base = getFunctionsUrl();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await authHeader()),
  };

  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (anon) headers.apikey = anon;

  const res = await fetch(`${base}/compare`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as CompareResponse & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(json.error || "Compare failed");
  }

  return json;
}

export async function invokeMedicine(
  id: string
): Promise<MedicineRecord> {
  const base = getFunctionsUrl();

  const headers: Record<string, string> = {
    ...(await authHeader()),
  };

  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (anon) headers.apikey = anon;

  const res = await fetch(
    `${base}/medicine?id=${encodeURIComponent(id)}`,
    {
      headers,
    }
  );

  const json = (await res.json()) as MedicineRecord & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(json.error || "Data not found");
  }

  return json;
}

export async function invokeChat(
  messages: { role: string; content: string }[],
  locale: string
): Promise<{ text: string }> {
  const base = getFunctionsUrl();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await authHeader()),
  };

  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (anon) headers.apikey = anon;

  const res = await fetch(`${base}/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify({ messages, locale }),
  });

  const json = (await res.json()) as {
    text?: string;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(json.error || "Assistant error");
  }

  return {
    text: json.text || "",
  };
}

/* =========================================================
   AI RISK ANALYSIS
========================================================= */

export interface AiRiskRequest {
  medicineName?: string;
  manufacturer?: string;
  expiryDate?: string;
  batchNo?: string;
  scannedQrRaw?: string;
  suspiciousReasons?: string[];
}

export interface AiRiskResponse {
  riskScore: number;
  confidenceScore: number;
  riskLevel: string;
  concerns: string[];
  recommendation: string;
  summary: string;
}

export async function invokeRiskAnalysis(
  body: AiRiskRequest
): Promise<AiRiskResponse> {

  const base = getFunctionsUrl();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(await authHeader()),
  };

  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (anon) {
    headers.apikey = anon;
  }

  // Define deterministic client-side engine fallback parameters
  const suspiciousReasons = body.suspiciousReasons || [];
  const scannedQrRaw = body.scannedQrRaw || "";
  const medicineName = body.medicineName || "Unknown";
  const manufacturer = body.manufacturer || "Unknown";
  const expiryDate = body.expiryDate || "Unknown";
  const batchNo = body.batchNo || "Unknown";

  const hasImpossibleTravel = Boolean(
    suspiciousReasons?.some((r: string) => /impossible travel|clone|cloning|multiple scans/i.test(r)) ||
    (scannedQrRaw && /clone|cloned|cloning/i.test(scannedQrRaw))
  );

  const isBatchEmpty = !batchNo || batchNo.trim() === "" || batchNo.toLowerCase() === "unknown";
  const isBatchInvalidFormat = !isBatchEmpty && !/^[A-Z0-9]{4,12}$/i.test(batchNo.trim());
  const hasBatchMismatch = isBatchEmpty || isBatchInvalidFormat || Boolean(
    suspiciousReasons?.some((r: string) => /batch number mismatched|batch mismatched|invalid batch/i.test(r)) ||
    batchNo?.toLowerCase().includes("mismatch")
  );

  const isMfrEmpty = !manufacturer || manufacturer.trim() === "" || manufacturer.toLowerCase() === "unknown";
  const isMfrInvalid = !isMfrEmpty && /invalid|not found|unavailable/i.test(manufacturer);
  const hasManufacturerNotFound = isMfrEmpty || isMfrInvalid || Boolean(
    suspiciousReasons?.some((r: string) => /manufacturer not found|no manufacturer/i.test(r))
  );

  let hasExpired = false;
  if (expiryDate && expiryDate.trim() !== "" && expiryDate.toLowerCase() !== "unknown") {
    const parsedExpiry = new Date(expiryDate);
    if (!isNaN(parsedExpiry.getTime())) {
      const currentDate = new Date("2026-05-24");
      hasExpired = parsedExpiry < currentDate;
    }
  }
  if (!hasExpired) {
    hasExpired = Boolean(
      suspiciousReasons?.some((r: string) => /expired/i.test(r)) ||
      expiryDate?.toLowerCase().includes("expired")
    );
  }

  let riskScore = 0;
  const concerns: string[] = [];

  if (hasImpossibleTravel) {
    riskScore += 20;
    concerns.push("Possible fake medicine detected, impossible travel in less time and multiple scans detected");
  }
  if (hasBatchMismatch) {
    riskScore += 20;
    concerns.push("Possible fake medicine detected, batch number mismatched");
  }
  if (hasManufacturerNotFound) {
    riskScore += 20;
    concerns.push("Possible fake medicine detected, manufacturer not found");
  }
  if (hasExpired) {
    riskScore += 20;
    concerns.push("Medicine expired!");
  }

  riskScore = Math.min(100, riskScore);
  const confidenceScore = 100 - riskScore;

  let riskLevel = "LOW RISK";
  if (riskScore >= 80) {
    riskLevel = "HIGH RISK";
  } else if (riskScore >= 40) {
    riskLevel = "MEDIUM RISK";
  } else {
    riskLevel = "LOW RISK";
  }

  const fallbackSummary = concerns.length > 0
    ? "Multiple verification anomalies were detected in the scanned medicine metadata."
    : "The scanned medicine information appears structurally consistent and low-risk.";
  const fallbackRecommendation = concerns.length > 0
    ? "Verify medicine authenticity from a trusted pharmacy before consumption."
    : "Verify medicine authenticity from a trusted pharmacy before consumption.";

  let res: Response;

  try {
    res = await fetch(`${base}/risk-analysis`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

  } catch (error) {
    console.error("Risk analysis fetch error, using local fallback engine:", error);
    return {
      riskScore,
      confidenceScore,
      riskLevel,
      concerns,
      recommendation: fallbackRecommendation,
      summary: fallbackSummary,
    };
  }

  const json = await res.json();

  if (!res.ok) {
    console.error("Risk analysis API error, using local fallback engine:", json);
    return {
      riskScore,
      confidenceScore,
      riskLevel,
      concerns,
      recommendation: fallbackRecommendation,
      summary: fallbackSummary,
    };
  }

  return json as AiRiskResponse;
}