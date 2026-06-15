import { useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import {
  Shield,
  Search,
  ArrowLeftRight,
  FlaskConical,
  Activity,
  AlertTriangle,
  FileText,
  Lock,
  GitCompare,
  HelpCircle
} from "lucide-react";

const toTitleCase = (str: string): string =>
  str
    .toLowerCase()
    .split(" ")
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

type MedicineData = {
  composition: string;
  usage: string;
  warnings: string;
};

type CompareResult = {
  medicine_1: { name: string; data: MedicineData };
  medicine_2: { name: string; data: MedicineData };
  comparison: { differences: string };
  disclaimer: string;
};

const DRUG_MAPPING: Record<string, string> = {
  "dolo 650": "acetaminophen",
  paracetamol: "acetaminophen",
  brufen: "ibuprofen",
  citragen: "pseudoephedrine",
};

const CATEGORY_MAPPING: Record<string, string> = {
  "dolo 650": "Analgesic",
  paracetamol: "Analgesic",
  brufen: "NSAID",
  citragen: "Decongestant",
  ibuprofen: "NSAID",
  acetaminophen: "Analgesic",
};

const getCategory = (name: string) => {
  return CATEGORY_MAPPING[name.trim().toLowerCase()] || "Clinical Record";
};

const keywords = [
  "fever",
  "pain",
  "cold",
  "cough",
  "sinus",
  "allergy",
  "headache",
  "toothache",
  "arthritis",
  "muscle",
  "menstrual",
  "body pain",
  "back pain",
  "ear pain",
  "sore throat",
  "runny nose",
  "blocked nose",
  "congestion",
  "migraine",
  "inflammation",
  "swelling",
  "infection",
  "bacterial infection",
  "viral infection",
  "skin infection",
  "itching",
  "rash",
  "acidity",
  "heartburn",
  "indigestion",
  "gas",
  "ulcer",
  "vomiting",
  "nausea",
  "diarrhea",
  "constipation",
  "cramps",
  "fatigue",
  "weakness",
  "dizziness",
  "high blood pressure",
  "low blood pressure",
  "diabetes",
  "anxiety",
  "insomnia",
  "high cholesterol",
];

function normalizeDrug(name: string): string {
  const normalized = name.trim().toLowerCase();
  return DRUG_MAPPING[normalized] || normalized;
}

async function fetchOpenFDA(drug: string): Promise<MedicineData | null> {
  try {
    const url = new URL("https://api.fda.gov/drug/label.json");

    url.searchParams.set(
      "search",
      `openfda.generic_name:${drug}`
    );

    url.searchParams.set("limit", "1");

    const res = await fetch(url.toString());

    if (!res.ok) return null;

    const json = (await res.json()) as {
      results?: Array<Record<string, unknown>>;
    };

    const data = json.results?.[0];

    if (!data) return null;

    return {
      composition: String(
        (data.active_ingredient as string[] | undefined)?.[0] || ""
      ),
      usage: String(
        (data.indications_and_usage as string[] | undefined)?.[0] || ""
      ),
      warnings: String(
        (data.warnings as string[] | undefined)?.[0] || ""
      ),
    };
  } catch {
    return null;
  }
}

async function scrapeDrugsCom(
  drug: string
): Promise<MedicineData | null> {
  try {
    const searchUrl =
      `https://api.allorigins.win/raw?url=${encodeURIComponent(
        `https://www.drugs.com/search.php?searchterm=${drug}`
      )}`;

    const searchPage = await fetch(searchUrl);

    if (!searchPage.ok) return null;

    const searchHtml = await searchPage.text();

    const searchDoc = new DOMParser().parseFromString(
      searchHtml,
      "text/html"
    );

    const firstLink =
      searchDoc
        .querySelector("a.ddc-media-link")
        ?.getAttribute("href") || "";

    if (!firstLink) return null;

    const detailUrl =
      `https://api.allorigins.win/raw?url=${encodeURIComponent(
        `https://www.drugs.com${firstLink}`
      )}`;

    const page = await fetch(detailUrl);

    if (!page.ok) return null;

    const detailHtml = await page.text();

    const detailDoc = new DOMParser().parseFromString(
      detailHtml,
      "text/html"
    );

    const usage =
      (detailDoc.querySelector("#uses")?.textContent || "").trim();

    return {
      composition: "",
      usage,
      warnings: "",
    };
  } catch {
    return null;
  }
}

function cleanData(raw: MedicineData | null): MedicineData {
  return {
    composition: raw?.composition || "",
    usage: raw?.usage || "",
    warnings: raw?.warnings || "",
  };
}

async function getMedicineData(
  drug: string
): Promise<MedicineData> {
  const normalized = normalizeDrug(drug);

  let data = await fetchOpenFDA(normalized);

  if (!data || !data.usage) {
    data = await scrapeDrugsCom(normalized);
  }

  return cleanData(data);
}

export function ComparePage() {
  const { t } = useI18n();

  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const [loading, setLoading] = useState(false);

  const [err, setErr] = useState<string | null>(null);

  const [res, setRes] = useState<CompareResult | null>(null);

  function compareMedicines(
    m1: MedicineData,
    m2: MedicineData,
    name1: string,
    name2: string
  ) {
    try {
      const usage1 = (m1?.usage || "").toLowerCase();

      const usage2 = (m2?.usage || "").toLowerCase();

      const symptoms1 = [
        ...new Set(
          keywords.filter((k) => usage1.includes(k))
        ),
      ].sort();

      const symptoms2 = [
        ...new Set(
          keywords.filter((k) => usage2.includes(k))
        ),
      ].sort();

      const s1 = symptoms1.length
        ? symptoms1.join(", ")
        : t("generalSymptoms");

      const s2 = symptoms2.length
        ? symptoms2.join(", ")
        : t("generalSymptoms");

      const differences = `${toTitleCase(
        name1
      )} ${t("treats")} ${s1} ${t(
        "while"
      )} ${toTitleCase(name2)} ${t(
        "treats"
      )} ${s2}.`;

      return {
        differences,
      };
    } catch (err) {
      console.error("Comparison error:", err);

      return {
        differences: t("comparisonUnavailable"),
      };
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    setErr(null);

    setRes(null);

    setLoading(true);

    try {
      const med1 = a.trim();

      const med2 = b.trim();

      const [med1Data, med2Data] = await Promise.all([
        getMedicineData(med1),
        getMedicineData(med2),
      ]);

      const comparison = compareMedicines(
        med1Data,
        med2Data,
        med1,
        med2
      );

      setRes({
        medicine_1: {
          name: med1,
          data: med1Data,
        },

        medicine_2: {
          name: med2,
          data: med2Data,
        },

        comparison,

        disclaimer: t("consultDoctor"),
      });
    } catch (e) {
      setErr(
        e instanceof Error
          ? e.message
          : t("compareFailed")
      );
    } finally {
      setLoading(false);
    }
  }

  const c = res?.comparison;

  const m1 = res?.medicine_1;

  const m2 = res?.medicine_2;

  function pretty(value: string | undefined) {
    return value && value.trim()
      ? value
      : t("notAvailable");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 space-y-8">
      
      {/* Title Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Compare Medicines
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 font-medium max-w-xl leading-relaxed">
            Compare composition, usage, and warnings using OpenFDA with a fallback source.
          </p>
        </div>

        {/* AI-Powered Comparison Badge */}
        <div className="inline-flex self-start sm:self-auto items-center gap-2 rounded-2xl border border-slate-100 bg-white p-3.5 shadow-sm">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50">
            <Shield className="h-4.5 w-4.5 fill-emerald-600/10" />
          </div>
          <div className="text-left">
            <h4 className="text-xs font-bold text-slate-900 leading-snug">AI-Powered Comparison</h4>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Accurate · Secure · Reliable</p>
          </div>
        </div>
      </div>

      {/* Modern Comparison Form */}
      <form
        onSubmit={(e) => void submit(e)}
        className="mx-auto max-w-4xl rounded-3xl border border-slate-100 bg-white p-6 shadow-md md:p-8 space-y-6"
      >
        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 relative">
          {/* Medicine 1 Input */}
          <div className="w-full flex flex-col items-start relative">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 pl-1">
              Medicine 1
            </span>
            <div className="w-full relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4.5 w-4.5" />
              </div>
              <input
                value={a}
                onChange={(e) => setA(e.target.value)}
                placeholder="e.g. dolo 650"
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              />
            </div>
          </div>

          {/* VS Divider badge */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-200/80 text-[11px] font-black text-slate-400 shadow-sm md:mt-6 select-none">
            VS
          </div>

          {/* Medicine 2 Input */}
          <div className="w-full flex flex-col items-start relative">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2 pl-1">
              Medicine 2
            </span>
            <div className="w-full relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4.5 w-4.5" />
              </div>
              <input
                value={b}
                onChange={(e) => setB(e.target.value)}
                placeholder="e.g. citragen"
                required
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3.5 pl-11 pr-4 text-sm font-semibold text-slate-800 placeholder-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              />
            </div>
          </div>
        </div>

        {/* Compare Medicines Action Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-blue-600 py-4 text-xs font-bold text-white uppercase tracking-wider hover:bg-blue-700 shadow-md shadow-blue-600/10 active:scale-99 transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <GitCompare className="h-4 w-4" />
          {loading ? t("comparing") || "Comparing..." : "Compare Medicines"}
        </button>

        {err && (
          <p className="text-center text-xs font-semibold text-red-600 bg-red-50/50 border border-red-100 rounded-xl px-4 py-2">
            {err}
          </p>
        )}
      </form>

      {/* Comparison Results Area */}
      {c && (
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {[m1, m2].map((medicine, index) => {
              const medName = medicine?.name || `Medicine ${index + 1}`;
              const categoryTag = getCategory(medName);
              const isEven = index === 0;

              return (
                <section
                  key={medName}
                  className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md text-left flex flex-col justify-between"
                >
                  <div>
                    {/* Header: Medicine Name & Category Tag */}
                    <div className="flex items-center justify-between gap-3 border-b border-slate-50 pb-4">
                      <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                        {medName}
                      </h2>
                      <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        isEven
                          ? "bg-blue-50 border border-blue-100 text-blue-700"
                          : "bg-emerald-50 border border-emerald-100 text-emerald-700"
                      }`}>
                        {categoryTag}
                      </span>
                    </div>

                    {/* Styled details content */}
                    <div className="mt-5 space-y-5">
                      {/* Composition */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          <FlaskConical className={`h-3.5 w-3.5 ${isEven ? "text-blue-500" : "text-emerald-500"}`} />
                          {t("composition")}
                        </div>
                        <p className="text-sm font-semibold text-slate-700 pl-5 leading-relaxed">
                          {pretty(medicine?.data.composition)}
                        </p>
                      </div>

                      {/* Usage */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          <Activity className={`h-3.5 w-3.5 ${isEven ? "text-blue-500" : "text-emerald-500"}`} />
                          {t("usage")}
                        </div>
                        <p className="text-sm font-semibold text-slate-700 pl-5 max-h-32 overflow-y-auto leading-relaxed">
                          {pretty(medicine?.data.usage)}
                        </p>
                      </div>

                      {/* Warnings */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                          <AlertTriangle className={`h-3.5 w-3.5 ${isEven ? "text-blue-500" : "text-emerald-500"}`} />
                          {t("warnings")}
                        </div>
                        <p className="text-sm font-semibold text-slate-700 pl-5 max-h-28 overflow-y-auto leading-relaxed">
                          {pretty(medicine?.data.warnings)}
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          {/* Difference Summary Card */}
          <div className="rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-50/10 to-orange-50/40 p-6 shadow-sm text-left space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-orange-100/50">
              <div className="flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-orange-100 text-orange-600 border border-orange-200/50">
                <FileText className="h-4.5 w-4.5" />
              </div>
              <h3 className="text-sm font-bold text-orange-950 uppercase tracking-wider">
                {t("differenceSummary")}
              </h3>
            </div>

            <p className="text-sm font-semibold text-slate-700 leading-relaxed pl-1">
              {pretty(c.differences)}
            </p>

            <div className="flex items-center gap-1.5 rounded-xl bg-red-50/50 border border-red-100 px-4.5 py-2.5 text-xs font-bold text-red-600">
              <AlertTriangle className="h-4.5 w-4.5 text-red-500 shrink-0" />
              {res?.disclaimer}
            </div>
          </div>

          {/* Bottom Important Reminder Banner */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50/80 text-blue-600 border border-blue-100/50">
                <HelpCircle className="h-4.5 w-4.5" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-extrabold text-slate-900 leading-snug uppercase tracking-wider">
                  Important Reminder
                </h4>
                <p className="text-[10px] font-semibold text-slate-400 leading-normal mt-0.5">
                  This tool provides information for general knowledge only. Always consult a healthcare professional.
                </p>
              </div>
            </div>

            <div className="inline-flex self-start sm:self-auto items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700 ml-12 sm:ml-0">
              <Lock className="h-3 w-3" />
              Verified · Secure
            </div>
          </div>
        </div>
      )}
    </div>
  );
}