import { fetchMedicineCatalogByMedicineId } from "@/lib/supabase";
import type { MedicineCatalogRow } from "@/types/medicine";
import { useEffect, useRef, useState } from "react";

export function useMedicineCatalog(medicineId: string | null) {
  const [row, setRow] = useState<MedicineCatalogRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gen = useRef(0);

  useEffect(() => {
    const trimmed = medicineId?.trim();
    if (!trimmed) {
      setRow(null);
      setError(null);
      setLoading(false);
      return;
    }

    const id = ++gen.current;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      const res = await fetchMedicineCatalogByMedicineId(trimmed);
      if (cancelled || gen.current !== id) return;
      if (!res.ok) {
        setError(res.error);
        setRow(null);
      } else {
        setRow(res.data);
        setError(null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [medicineId]);

  return { row, loading, error };
}
