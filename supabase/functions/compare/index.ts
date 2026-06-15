import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type Body = { med1?: string; med2?: string };
type MedicineData = {
  composition: string;
  usage: string;
  warnings: string;
};

const DRUG_MAPPING: Record<string, string> = {
  "dolo 650": "acetaminophen",
  paracetamol: "acetaminophen",
  brufen: "ibuprofen",
  citragen: "pseudoephedrine",
};

const SYMPTOM_KEYWORDS = [
  "fever",
  "pain",
  "cold",
  "cough",
  "sinus",
  "allergy",
  "headache",
  "toothache",
  "arthritis",
  "muscle pain",
  "menstrual",
] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  try {
    const body = (await req.json()) as Body;
    const med1 = (body.med1 || "").trim().slice(0, 120);
    const med2 = (body.med2 || "").trim().slice(0, 120);
    if (!med1 || !med2) {
      return jsonResponse({ error: "med1 and med2 required" }, 400);
    }

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseAuth = createClient(supabaseUrl, anon);
    const { data: userData } = jwt
      ? await supabaseAuth.auth.getUser(jwt)
      : { data: { user: null } };
    const userId = userData.user?.id ?? null;

    const [med1Data, med2Data] = await Promise.all([
      getMedicineData(med1),
      getMedicineData(med2),
    ]);

    const comparison = compareMedicines(med1Data, med2Data, med1, med2);
    const result = {
      medicine_1: { name: med1, data: med1Data },
      medicine_2: { name: med2, data: med2Data },
      comparison,
      disclaimer: "Consult a doctor before use",
    };

    if (userId) {
      const admin = createClient(supabaseUrl, serviceKey);
      await admin.from("comparisons").insert({
        user_id: userId,
        med1,
        med2,
        result,
      });
    }

    return jsonResponse(result);
  } catch (e) {
    console.error(e);
    return jsonResponse({ error: "Network error" }, 500);
  }
});

function normalizeDrug(name: string): string {
  const normalized = name.trim().toLowerCase();
  return DRUG_MAPPING[normalized] || normalized;
}

function cleanData(raw: Partial<MedicineData> | null): MedicineData {
  return {
    composition: raw?.composition || "",
    usage: raw?.usage || "",
    warnings: raw?.warnings || "",
  };
}

async function fetchOpenFda(drug: string): Promise<MedicineData | null> {
  try {
    const url = new URL("https://api.fda.gov/drug/label.json");
    url.searchParams.set("search", `openfda.generic_name:${drug}`);
    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      results?: Array<Record<string, unknown>>;
    };
    const data = json.results?.[0];
    if (!data) return null;

    const active = Array.isArray(data.active_ingredient)
      ? data.active_ingredient[0]
      : "";
    const usage = Array.isArray(data.indications_and_usage)
      ? data.indications_and_usage[0]
      : "";
    const warnings = Array.isArray(data.warnings) ? data.warnings[0] : "";

    return {
      composition: String(active || ""),
      usage: String(usage || ""),
      warnings: String(warnings || ""),
    };
  } catch {
    return null;
  }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function scrapeDrugsCom(drug: string): Promise<MedicineData | null> {
  try {
    const searchUrl =
      `https://www.drugs.com/search.php?searchterm=${encodeURIComponent(drug)}`;
    const searchPage = await fetch(searchUrl);
    if (!searchPage.ok) return null;
    const searchHtml = await searchPage.text();

    const hrefMatch =
      searchHtml.match(
        /<a[^>]*class="[^"]*ddc-media-link[^"]*"[^>]*href="([^"]+)"/i,
      ) ||
      searchHtml.match(/<a[^>]*href="([^"]+)"[^>]*class="[^"]*ddc-media-link/i);
    const href = hrefMatch?.[1];
    if (!href) return null;

    const page = await fetch(`https://www.drugs.com${href}`);
    if (!page.ok) return null;
    const html = await page.text();

    const usesSection = html.match(
      /<section[^>]*id="uses"[^>]*>([\s\S]*?)<\/section>/i,
    )?.[1];
    const usage = stripTags(usesSection || "").slice(0, 3000);

    return {
      composition: "",
      usage,
      warnings: "",
    };
  } catch {
    return null;
  }
}

async function getMedicineData(drug: string): Promise<MedicineData> {
  const normalized = normalizeDrug(drug);
  let data = await fetchOpenFda(normalized);
  if (!data || !data.usage) {
    data = await scrapeDrugsCom(normalized);
  }
  return cleanData(data);
}

function compareMedicines(
  m1: MedicineData,
  m2: MedicineData,
  name1: string,
  name2: string,
) {
  const usage1 = (m1.usage || "").toLowerCase();
  const usage2 = (m2.usage || "").toLowerCase();

  const symptoms1 = new Set(
    SYMPTOM_KEYWORDS.filter((keyword) => usage1.includes(keyword)),
  );
  const symptoms2 = new Set(
    SYMPTOM_KEYWORDS.filter((keyword) => usage2.includes(keyword)),
  );

  const only1 = [...symptoms1].filter((symptom) => !symptoms2.has(symptom));
  const only2 = [...symptoms2].filter((symptom) => !symptoms1.has(symptom));

  let differences = "";
  if (only1.length && only2.length) {
    differences =
      `${name1} treats ${only1.join(", ")} while ${name2} treats ${only2.join(", ")}.`;
  } else if (only1.length) {
    differences = `${name1} treats ${only1.join(", ")}.`;
  } else if (only2.length) {
    differences = `${name2} treats ${only2.join(", ")}.`;
  } else {
    differences = "Both medicines treat similar symptoms.";
  }

  return { differences };
}
