// @ts-ignore
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
};

// @ts-ignore
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      medicineName,
      manufacturer,
      expiryDate,
      batchNo,
      scannedQrRaw,
      suspiciousReasons = []
    } = await req.json();

    const apiKey = Deno.env.get("GROQ_API_KEY");

    // ====================================================
    // DETERMINISTIC BACKEND RULE ENGINE (BEFORE AI CALL)
    // ====================================================

    // Rule 1: Impossible Travel & QR Cloning
    const hasImpossibleTravel = Boolean(
      suspiciousReasons?.some((r: string) => /impossible travel|clone|cloning|multiple scans/i.test(r)) ||
      (scannedQrRaw && /clone|cloned|cloning/i.test(scannedQrRaw))
    );

    // Rule 2: Batch Number Mismatch
    const isBatchEmpty = !batchNo || batchNo.trim() === "" || batchNo.toLowerCase() === "unknown";
    const isBatchInvalidFormat = !isBatchEmpty && !/^[A-Z0-9]{4,12}$/i.test(batchNo.trim());
    const hasBatchMismatch = isBatchEmpty || isBatchInvalidFormat || Boolean(
      suspiciousReasons?.some((r: string) => /batch number mismatched|batch mismatched|invalid batch/i.test(r)) ||
      batchNo?.toLowerCase().includes("mismatch")
    );

    // Rule 3: Manufacturer Not Found
    const isMfrEmpty = !manufacturer || manufacturer.trim() === "" || manufacturer.toLowerCase() === "unknown";
    const isMfrInvalid = !isMfrEmpty && /invalid|not found|unavailable/i.test(manufacturer);
    const hasManufacturerNotFound = isMfrEmpty || isMfrInvalid || Boolean(
      suspiciousReasons?.some((r: string) => /manufacturer not found|no manufacturer/i.test(r))
    );

    // Rule 4: Medicine Expired
    let hasExpired = false;
    if (expiryDate && expiryDate.trim() !== "" && expiryDate.toLowerCase() !== "unknown") {
      const parsedExpiry = new Date(expiryDate);
      if (!isNaN(parsedExpiry.getTime())) {
        const currentDate = new Date("2026-05-24"); // current runtime date
        hasExpired = parsedExpiry < currentDate;
      }
    }
    if (!hasExpired) {
      hasExpired = Boolean(
        suspiciousReasons?.some((r: string) => /expired/i.test(r)) ||
        expiryDate?.toLowerCase().includes("expired")
      );
    }

    // Deterministic Score Calculations
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

    // Risk Level Mappings
    let riskLevel = "LOW RISK";
    if (riskScore >= 80) {
      riskLevel = "HIGH RISK";
    } else if (riskScore >= 40) {
      riskLevel = "MEDIUM RISK";
    } else {
      riskLevel = "LOW RISK";
    }

    // Default Fallbacks in case LLM is offline or times out
    const fallbackSummary = concerns.length > 0
      ? `Verification anomalies (${concerns.length}) were detected in the scanned medicine metadata.`
      : "The medicine appears safe with high verification confidence and no suspicious patterns.";
    
    const fallbackRecommendation = concerns.length > 0
      ? "Verify medicine authenticity from a trusted pharmacy before consumption."
      : "Store according to guidelines and verify packaging integrity before use.";

    let aiSummary = fallbackSummary;
    let aiRecommendation = fallbackRecommendation;

    // Call Groq API if key is present
    if (apiKey) {
      try {
        const SYSTEM_PROMPT = `You are a professional pharmaceutical risk analysis assistant. 
Your role is to summarize deterministic validation results for a scanned medicine, and write readable explanations and recommendations.

SAFETY RULES:
- Never claim "This medicine is fake" or "This medicine is authentic".
- Use safe wording: "Potentially suspicious", "Verification anomalies detected", "Risk indicators identified".
- Be professional, highly concise, and clear.

Based on the parameters provided, you MUST return a valid JSON object containing ONLY "summary" and "recommendation" keys.
Do NOT repeat the scores or concerns list in your JSON output.

JSON Schema:
{
  "summary": string (1-2 sentences summarizing findings),
  "recommendation": string (1 sentence actionable recommendation for the user)
}`;

        const userPrompt = `Scanned Medicine: ${medicineName || "Unknown"}
- Risk Level: ${riskLevel}
- Trust Score: ${confidenceScore}%
- Detected Anomaly Concerns: ${JSON.stringify(concerns)}
- Active Flags: ${JSON.stringify(suspiciousReasons)}`;

        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.1-8b-instant",
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
              ],
              temperature: 0.2,
              response_format: { type: "json_object" }
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const content = data?.choices?.[0]?.message?.content;
          if (content) {
            const parsed = JSON.parse(content);
            if (parsed.summary) aiSummary = parsed.summary;
            if (parsed.recommendation) aiRecommendation = parsed.recommendation;
          }
        }
      } catch (e) {
        console.error("Supabase risk Edge Function Groq request failed, using local rules:", e);
      }
    }

    // Merge deterministic results with AI-generated text descriptions
    const mergedResponse = {
      riskScore,
      confidenceScore,
      riskLevel,
      concerns,
      summary: aiSummary,
      recommendation: aiRecommendation,
    };

    return new Response(
      JSON.stringify(mergedResponse),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "An unexpected error occurred during AI analysis." }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});