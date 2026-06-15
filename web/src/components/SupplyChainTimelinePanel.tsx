import { useMedicineSupplyChain } from "@/hooks/useMedicineSupplyChain";
import {
  formatClockFromParts,
  formatDisplayDate,
  nowLocalClock,
  todayLocalISO,
} from "@/lib/medicineSupplyChain";
import type { MedicineScanRow } from "@/types/medicine";
import { useEffect, useState } from "react";

function FieldColumn({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <span className="break-words text-sm leading-snug text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

function DbRoleCard({ title, row }: { title: string; row: MedicineScanRow | null }) {
  const location = String(row?.location ?? "").trim() || "—";
  const scanDateStr = String(row?.scan_date ?? "").trim();
  const date = scanDateStr ? formatDisplayDate(scanDateStr) : "—";
  const time = formatClockFromParts(
    row?.scan_date != null ? String(row.scan_date) : null,
    row?.scan_time != null ? String(row.scan_time) : null
  );
  const scans = row?.scan_cnt != null ? String(row.scan_cnt) : "—";

  return (
    <div className="flex min-h-[140px] flex-col gap-2.5 rounded-xl border border-slate-700/80 bg-slate-800/70 p-3 shadow-inner dark:border-slate-600 dark:bg-slate-800/90">
      <p className="text-xs font-semibold text-slate-200">{title}</p>
      <div className="flex flex-1 flex-col gap-2 border-t border-slate-700/60 pt-2 dark:border-slate-600/60">
        <FieldColumn label="Location" value={location} />
        <FieldColumn label="Date" value={date} />
        <FieldColumn label="Time" value={time} />
        <FieldColumn label="Scans" value={scans} />
      </div>
    </div>
  );
}

function UserRoleCard({
  title,
  userLocation,
  userDate,
  userTime,
}: {
  title: string;
  userLocation: string;
  userDate: string;
  userTime: string;
}) {
  return (
    <div className="flex min-h-[140px] flex-col gap-2.5 rounded-xl border border-slate-700/80 bg-slate-800/70 p-3 shadow-inner dark:border-slate-600 dark:bg-slate-800/90">
      <p className="text-xs font-semibold text-slate-200">{title}</p>
      <div className="flex flex-1 flex-col gap-2 border-t border-slate-700/60 pt-2 dark:border-slate-600/60">
        <FieldColumn label="Location" value={userLocation} />
        <FieldColumn label="Date" value={formatDisplayDate(userDate)} />
        <FieldColumn label="Time" value={userTime} />
        <FieldColumn label="Scans" value="—" />
      </div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-40 animate-pulse rounded-xl border border-slate-700/50 bg-slate-800/40 dark:bg-slate-800/50"
        />
      ))}
    </div>
  );
}

export interface SupplyChainTimelinePanelProps {
  /** Resolved `medicines.medicine_id` filter; null skips fetch. */
  medicineId: string | null;
}

export function SupplyChainTimelinePanel({ medicineId }: SupplyChainTimelinePanelProps) {
  const { rows, loading, error, manufacturer, distributor, pharmacy } = useMedicineSupplyChain(medicineId);
  const [userCoords, setUserCoords] = useState<string | null>(null);
  const [geoNote, setGeoNote] = useState<string>("Locating…");

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoNote("Unavailable");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setGeoNote("");
      },
      () => {
        setGeoNote("Permission denied");
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 12_000 }
    );
  }, []);

  const userLocation = userCoords ?? (geoNote ? geoNote : "—");
  const userDate = todayLocalISO();
  const userTime = nowLocalClock();

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-950 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950">
      <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Scan timeline</h3>
      {!medicineId?.trim() && (
        <p className="mt-2 text-xs text-slate-400">
          Rows load when your scan value matches the <span className="font-mono">medicine_id</span> column (barcode,
          SKU, UUID, or JSON / URL fields such as <span className="font-mono">medicine_id</span> /{" "}
          <span className="font-mono">barcode</span>).
        </p>
      )}

      {medicineId?.trim() && (
        <p className="mt-2 font-mono text-[10px] text-slate-500">medicine_id: {medicineId}</p>
      )}

      {error && (
        <p className="mt-3 rounded-lg border border-red-900/50 bg-red-950/40 px-3 py-2 text-xs text-red-200">
          {error}
        </p>
      )}

      <div className="mt-4">
        {loading && medicineId?.trim() ? (
          <PanelSkeleton />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DbRoleCard title="Manufacturer" row={manufacturer} />
            <DbRoleCard title="Distributor" row={distributor} />
            <DbRoleCard title="Pharmacy" row={pharmacy} />
            <UserRoleCard title="User" userLocation={userLocation} userDate={userDate} userTime={userTime} />
          </div>
        )}
      </div>

      {medicineId?.trim() && !loading && rows.length === 0 && !error && (
        <p className="mt-3 text-xs text-slate-400">No rows in Supabase for this medicine_id yet.</p>
      )}
    </section>
  );
}
