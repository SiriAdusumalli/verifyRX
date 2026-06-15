import { createClient } from "@supabase/supabase-js";
import type { MedicineCatalogRow, MedicineScanRow } from "@/types/medicine";

function optText(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

/** Supabase/Postgres may return numbers for text-like columns; normalize for UI. */
function coerceMedicineCatalogRow(raw: unknown): MedicineCatalogRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const medicine_id = optText(o.medicine_id);
  if (!medicine_id) return null;
  return {
    medicine_id,
    medicine_name: optText(o.medicine_name),
    batch_no: optText(o.batch_no),
    manufacture_date: optText(o.manufacture_date),
    expiry_date: optText(o.expiry_date),
  };
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  console.warn("VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing");
}

export const supabase =
  url && anon
    ? createClient(url, anon, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export function getFunctionsUrl(): string {
  if (!url) throw new Error("Missing VITE_SUPABASE_URL");
  return `${url.replace(/\/$/, "")}/functions/v1`;
}

/**
 * Read-only: fetches supply-chain rows for a scanned `medicine_id`.
 * Ordered by scan chronology (`scan_date`, `scan_time`, then `id`).
 */
export async function fetchMedicinesByMedicineId(
  medicineId: string
): Promise<{ ok: true; data: MedicineScanRow[] } | { ok: false; error: string }> {
  if (!supabase) {
    return {
      ok: false,
      error:
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.",
    };
  }
  const trimmed = medicineId.trim();
  if (!trimmed) {
    return { ok: false, error: "medicine_id is empty." };
  }

  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .eq("medicine_id", trimmed)
    .order("scan_date", { ascending: true, nullsFirst: true })
    .order("scan_time", { ascending: true, nullsFirst: true })
    .order("id", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  let rows = (data ?? []) as MedicineScanRow[];

  if (
    rows.length === 0 &&
    /^\d{8,13}$/.test(trimmed)
  ) {
    const padded = trimmed.padStart(14, "0");
    if (padded !== trimmed) {
      const second = await supabase
        .from("medicines")
        .select("*")
        .eq("medicine_id", padded)
        .order("scan_date", { ascending: true, nullsFirst: true })
        .order("scan_time", { ascending: true, nullsFirst: true })
        .order("id", { ascending: true });
      if (!second.error && second.data?.length) {
        rows = second.data as MedicineScanRow[];
      }
    }
  }

  return { ok: true, data: rows };
}

/**
 * Read-only: one catalog row from `medicine` matched by `medicine_id`.
 */
export async function fetchMedicineCatalogByMedicineId(
  medicineId: string
): Promise<
  { ok: true; data: MedicineCatalogRow | null } | { ok: false; error: string }
> {
  if (!supabase) {
    return {
      ok: false,
      error:
        "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.",
    };
  }
  const trimmed = medicineId.trim();
  if (!trimmed) {
    return { ok: false, error: "medicine_id is empty." };
  }

  async function queryOne(id: string) {
    return supabase!
      .from("medicines")
      .select("medicine_id, medicine_name, batch_no, manufacture_date, expiry_date")
      .eq("medicine_id", id)
      .limit(1);
  }

  const { data, error } = await queryOne(trimmed);
  if (error) {
    return { ok: false, error: error.message };
  }

  let row = coerceMedicineCatalogRow((data ?? [])[0] ?? null);

  if (
    !row &&
    /^\d{8,13}$/.test(trimmed)
  ) {
    const padded = trimmed.padStart(14, "0");
    if (padded !== trimmed) {
      const second = await queryOne(padded);
      if (!second.error && second.data?.length) {
        row = coerceMedicineCatalogRow(second.data[0] ?? null);
      }
    }
  }

  return { ok: true, data: row };
}
