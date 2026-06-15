const ENDPOINT = "https://api.fda.gov/drug/label.json";

export type OpenFdaBlob = {
  found: boolean;
  brands: string[];
  generics: string[];
  substances: string[];
  indications: string;
  warnings: string;
  adverse: string;
  activeIngredient: string;
  raw?: Record<string, unknown>;
};

function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string" && v.trim()) return [v.trim()];
  return [];
}

function firstResult(json: { results?: Record<string, unknown>[] }) {
  const r = json.results?.[0];
  if (!r) return null;
  const of = (r.openfda || {}) as Record<string, unknown>;
  return {
    brands: arr(of.brand_name),
    generics: arr(of.generic_name),
    substances: arr(of.substance_name),
    indications: arr(r.indications_and_usage).join("\n").slice(0, 2500),
    warnings: arr(r.warnings).join("\n").slice(0, 2500),
    adverse: arr(r.adverse_reactions).join("\n").slice(0, 2500),
    activeIngredient: arr(r.active_ingredient).join(" | ").slice(0, 1200),
    raw: r as Record<string, unknown>,
  };
}

export async function fetchOpenFdaContext(term: string): Promise<OpenFdaBlob> {
  const t = term.trim().replace(/["\\]/g, " ").slice(0, 120);
  if (!t) {
    return {
      found: false,
      brands: [],
      generics: [],
      substances: [],
      indications: "",
      warnings: "",
      adverse: "",
      activeIngredient: "",
    };
  }

  const key = Deno.env.get("OPENFDA_API_KEY");
  const searches = [
    `openfda.brand_name:"${t}"`,
    `openfda.generic_name:"${t}"`,
    `(openfda.brand_name:${t}+OR+openfda.generic_name:${t})`,
    `active_ingredient:"${t}"`,
    `openfda.substance_name:"${t}"`,
  ];

  for (const search of searches) {
    try {
      const u = new URL(ENDPOINT);
      u.searchParams.set("search", search);
      u.searchParams.set("limit", "1");
      if (key) u.searchParams.set("api_key", key);
      const res = await fetch(u.toString(), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { results?: Record<string, unknown>[] };
      const hit = firstResult(json);
      if (!hit) continue;
      return {
        found: true,
        brands: hit.brands,
        generics: hit.generics,
        substances: hit.substances,
        indications: hit.indications,
        warnings: hit.warnings,
        adverse: hit.adverse,
        activeIngredient: hit.activeIngredient,
        raw: hit.raw,
      };
    } catch {
      /* next */
    }
  }

  return {
    found: false,
    brands: [],
    generics: [],
    substances: [],
    indications: "",
    warnings: "",
    adverse: "",
    activeIngredient: "",
  };
}
