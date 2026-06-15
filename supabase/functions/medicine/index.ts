import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return jsonResponse({ error: "Missing id" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data, error } = await admin
      .from("medicines")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      return jsonResponse({ error: "Data not found" }, 404);
    }

    return jsonResponse({
      id: data.id,
      name: data.name,
      composition: data.composition,
      usage: data.usage,
      side_effects: data.side_effects,
      warnings: data.warnings,
      risk_level: data.risk_level,
      disclaimer: data.disclaimer,
      dosage_guidance: data.dosage_guidance,
      barcode: data.barcode,
      created_at: data.created_at,
      qr_type: data.qr_type,
      source_url: data.source_url,
      source_type: data.source_type,
      authenticity_status: data.authenticity_status,
      confidence_score: data.confidence_score,
      dynamic_data: data.dynamic_data || {},
      canonical_fields: data.canonical_fields || {},
      key_values: data.dynamic_data || {},
      medicine_name: data.name,
      fetched_data: data.openfda_raw || {},
      source_type: data.source_type || "direct",
      qr_type: data.qr_type || "text",
      suspicious_reasons: [],
    });
  } catch {
    return jsonResponse({ error: "Network error" }, 500);
  }
});
