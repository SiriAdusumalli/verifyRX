import { fetchMedicinesByMedicineId } from "@/lib/supabase";
import { pickLatestForRole } from "@/lib/medicineSupplyChain";
import type { MedicineScanRow } from "@/types/medicine";
import { useEffect, useMemo, useRef, useState } from "react";

export function useMedicineSupplyChain(medicineId: string | null) {
  const [rows, setRows] = useState<MedicineScanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchGen = useRef(0);

  useEffect(() => {
    const trimmed = medicineId?.trim();
    if (!trimmed) {
      setRows([]);
      setError(null);
      setLoading(false);
      return;
    }

    const id = ++fetchGen.current;
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      const res = await fetchMedicinesByMedicineId(trimmed);
      if (cancelled || fetchGen.current !== id) return;
      if (!res.ok) {
        setError(res.error);
        setRows([]);
      } else {
        setRows(res.data);
        setError(null);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [medicineId]);

  const manufacturer = useMemo(() => pickLatestForRole(rows, "Manufacturer"), [rows]);
  const distributor = useMemo(() => pickLatestForRole(rows, "Distributor"), [rows]);
  const pharmacy = useMemo(() => pickLatestForRole(rows, "Pharmacy"), [rows]);

  return { rows, loading, error, manufacturer, distributor, pharmacy };
}
