import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  try {
    let body;

    const contentType = req.headers.get("content-type") || "";

    // HANDLE JSON OR FORM DATA (VERY IMPORTANT FOR AUTOMATE)
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const form = await req.formData();
      body = Object.fromEntries(form.entries());
    }

    console.log("RAW BODY:", body);

    // FLEXIBLE FIELD MAPPING
    const from =
      body.from ||
      body.sender ||
      body.phone ||
      body.sms_sender ||
      "";

    const rawText =
      body.message ||
      body.text ||
      body.body ||
      body.sms_message ||
      "";

    console.log("FROM:", from);
    console.log("RAW MESSAGE:", rawText);

    // FIX: Extract only consecutive numbers (the barcode) from the text message.
    // This cleans up text like "From : +919000... \n8901302207789" down to just "8901302207789"
    const match = rawText.match(/\d+$/);
    const text = match ? match[0] : rawText.trim();

    console.log("EXTRACTED MEDICINE ID:", text);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // FIX: Using your correct snake_case column name: "medicine_id"
    const { data, error } = await supabase
      .from("sms")
      .select("*")
      .eq("medicine_id", text)
      .single();

    console.log("DB DATA:", data);
    if (error) console.log("DB ERROR:", error);

    let reply = "";

    if (data) {
      // FIXED MAPPING: Changed 'is fake' -> 'is_fake' and 'expiry date' -> 'expiry_date'
      if (data["is_fake"] === true || data["is_fake"] === "TRUE") {
        reply = `VerifyRX

Medicine:
${data.medicine_name || "EMPTY"}

Expiry:
${data.expiry_date || "NULL"}

Status:
SUSPICIOUS

Reason:
${data.reason || "No reason specified."}

Contact your pharmacist immediately.`;
      } else {
        reply = `VerifyRX

Medicine:
${data.medicine_name || "EMPTY"}

Expiry:
${data.expiry_date || "NULL"}

Status:
AUTHENTIC`;
      }
    } else {
      reply = `VerifyRX

Medicine not found.

Status:
SUSPICIOUS

No matching barcode found.

Contact your pharmacist immediately.`;
    }

    console.log("REPLY:", reply);

    return new Response(
      JSON.stringify({
        success: true,
        reply,
        to: from,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

  } catch (err) {
    console.error("ERROR:", err);

    return new Response(
      JSON.stringify({
        success: false,
        error: String(err),
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
});