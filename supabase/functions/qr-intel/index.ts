import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";
import { runUniversalIntel } from "../_shared/universal_intel.ts";

type Body = {
  qr_text?: string | null;
  image?: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

  try {
    const body = (await req.json()) as Body;
    const qrText = String(body.qr_text || "").trim();
    if (!qrText) return jsonResponse({ error: "Missing qr_text." }, 400);

    const result = await runUniversalIntel(qrText);

    if (supabaseUrl && serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey);
      await admin.from("qr_intelligence_logs").insert({
        qr_text: qrText,
        qr_type: result.qr_type,
        source_url: result.source_url,
        source_type: result.source_type,
        confidence_score: result.confidence_score,
        authenticity_status: result.authenticity_status,
        canonical_fields: result.canonical_fields,
        key_values: result.key_values,
        sections: result.sections,
        redirect_chain: result.redirect_chain,
        raw_source_data: result.raw_source_data,
      });
    }

    return jsonResponse({
      id: crypto.randomUUID(),
      ...result,
      fetched_data: {
        sections: result.sections,
        redirect_chain: result.redirect_chain,
        raw_source_data: result.raw_source_data,
      },
      structured: result.structured,
      risk_level:
        result.authenticity_status === "suspicious"
          ? "high"
          : result.authenticity_status === "verified"
          ? "low"
          : "medium",
    });
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: "Universal QR intelligence failed." }, 500);
  }
});
