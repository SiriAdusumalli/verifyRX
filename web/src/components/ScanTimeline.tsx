import { useMedicineSupplyChain } from "@/hooks/useMedicineSupplyChain";
import {
  buildSupplyChainDetections,
  formatClockFromParts,
  formatDisplayDate,
  nowLocalClock,
  todayLocalISO,
} from "@/lib/medicineSupplyChain";
import type { MedicineScanRow, TimelineCardStatus } from "@/types/medicine";
import { motion } from "framer-motion";
import { AlertTriangle, Building2, Factory, Pill, Truck, UserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { TimelineCard } from "./TimelineCard";

function cardStatusForRow(row: MedicineScanRow | null): TimelineCardStatus {
  if (!row) return "pending";
  if ((row.scan_cnt ?? 0) > 6) return "warning";
  return "verified";
}

function TimelineConnector({ vertical }: { vertical: boolean }) {
  if (vertical) {
    return (
      <div className="mx-auto flex h-10 w-px shrink-0 bg-gradient-to-b from-brand-500/35 via-slate-300 to-brand-500/35 lg:hidden" aria-hidden />
    );
  }
  return (
    <div className="hidden h-px min-w-[24px] flex-1 self-center bg-gradient-to-r from-transparent via-brand-400/40 to-transparent lg:block" aria-hidden />
  );
}

function TimelineSkeleton() {
  return (
    <div className="flex w-full flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-0">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-1 flex-col items-center lg:flex-row lg:items-center">
          <div className="h-48 w-full max-w-sm animate-pulse rounded-2xl border border-white/50 bg-white/40 shadow-soft backdrop-blur-sm" />
          {i < 3 && <TimelineConnector vertical />}
        </div>
      ))}
    </div>
  );
}

export interface ScanTimelineProps {
  medicineId: string;
}

export function ScanTimeline({ medicineId }: ScanTimelineProps) {
  const { rows, loading, error, manufacturer, distributor, pharmacy } = useMedicineSupplyChain(medicineId);
  const [userCoords, setUserCoords] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "pending" | "denied" | "unavailable">("idle");

  const smsSent = useRef(false);
  const detections = useMemo(() => buildSupplyChainDetections(rows, manufacturer), [rows, manufacturer]);

// ==========================================
  // 📱 DIAGNOSTIC AUTOMATIC SMS DISPATCHER
  // ==========================================
  useEffect(() => {
    // 1. Log the exact internal state of the hook data right now
    console.log("🔍 HOOK STATE CHECK:", { 
      medicineId, 
      loading, 
      error: error || "none", 
      rowsCount: rows ? rows.length : 0 
    });

    // 2. See if the safety gate is blocking execution
    if (loading) {
      console.log("⏳ SMS blocked: Hook is still in LOADING state.");
      return;
    }
    if (error) {
      console.log("❌ SMS blocked: Hook returned a database error:", error);
      return;
    }
    if (smsSent.current) {
      console.log("🔒 SMS blocked: Already sent for this render loop.");
      return;
    }

    console.log("🚀 ALL CHECKS PASSED! DISPATCHING DYNAMIC FETCH NOW...");
    smsSent.current = true; 

    const hasRows = rows && rows.length > 0;
    const primaryRecord = hasRows ? rows[0] : null;

    const dynamicName = (primaryRecord as any)?.medicine_name || "Pantoprazole";
    const dynamicExpiry = primaryRecord?.expiry_date || "2028-04-02";
    const dynamicBatch = primaryRecord?.batch_no || "463523";
    
    const warningMessage = detections.length > 0 
      ? detections[0].message 
      : "CRITICAL: Suspicious tracking pattern detected in supply chain.";

    fetch(
      "https://vrzhvzblddbdtmxtcjyu.supabase.co/functions/v1/send-sms",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: "YOUR_RAW_ANON_KEY_HERE", // <-- Keep your real key string here
          Authorization: "Bearer YOUR_RAW_ANON_KEY_HERE", // <-- Keep your real key string here
        },
        body: JSON.stringify({
          medicineName: dynamicName, 
          expiryDate: dynamicExpiry,
          isFake: true,
          reason: `ID: ${medicineId} | Batch: ${dynamicBatch} | Alert: ${warningMessage}`,
          phone: "+919959813933",
        }),
      }
    )
      .then(async (res) => {
        console.log("📱 DYNAMIC SMS NETWORK STATUS:", res.status);
        const feedback = await res.text();
        console.log("📱 SERVER PLATFORM FEEDBACK:", feedback);
      })
      .catch((err) => {
        console.error("❌ SMS SCRIPT FAULT:", err.message);
      });
  }, [loading, error, rows, detections, medicineId]);
  // ==========================================
  

  useEffect(() => {
    setGeoStatus("pending");
    if (!navigator.geolocation) {
      setGeoStatus("unavailable");
      setUserCoords(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setGeoStatus("idle");
      },
      () => {
        setGeoStatus("denied");
        setUserCoords(null);
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 12_000 }
    );
  }, []);

  const userLocationLabel =
    geoStatus === "pending"
      ? "Locating device…"
      : geoStatus === "denied"
        ? "Location permission denied"
        : geoStatus === "unavailable"
          ? "Geolocation not supported"
          : userCoords ?? "Location unavailable";

  const userDate = formatDisplayDate(todayLocalISO());
  const userTime = nowLocalClock();

  const chain = useMemo(
    () => [
      { key: "mfr", title: "Manufacturer", icon: Factory, row: manufacturer },
      { key: "dist", title: "Distributor", icon: Truck, row: distributor },
      { key: "pharm", title: "Pharmacy", icon: Building2, row: pharmacy },
      { key: "user", title: "User", icon: UserRound, row: null },
    ] as const,
    [manufacturer, distributor, pharmacy]
  );

  if (loading) {
    return (
      <div className="rounded-3xl border border-white/70 bg-white/50 p-6 shadow-card backdrop-blur-lg md:p-8">
        <div className="mb-6 flex items-center gap-2">
          <Pill className="h-5 w-5 text-brand-600" aria-hidden />
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">Medicine scan timeline</h2>
        </div>
        <TimelineSkeleton />
        <p className="mt-6 text-center text-sm text-slate-500">Loading supply chain records…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-3xl border border-red-200/80 bg-red-50/90 p-8 text-center shadow-card backdrop-blur-md">
        <AlertTriangle className="mx-auto h-10 w-10 text-red-600" aria-hidden />
        <p className="mt-3 text-sm font-medium text-red-900">Unable to load timeline</p>
        <p className="mt-1 text-sm text-red-800/90">{error}</p>
      </div>
    );
  }

  const isEmpty = rows.length === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-3xl border border-white/70 bg-gradient-to-br from-white/90 via-white/75 to-slate-50/90 p-6 shadow-card backdrop-blur-xl md:p-8"
    >
      <div className="flex flex-col gap-2 border-b border-slate-200/60 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-700">
            <Pill className="h-5 w-5" aria-hidden />
            <span className="text-xs font-bold uppercase tracking-widest">VerifyRX</span>
          </div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 md:text-2xl">
            Medicine scan timeline
          </h2>
          <p className="mt-1 font-mono text-xs text-slate-500">medicine_id: {medicineId}</p>
        </div>
      </div>

      {detections.length > 0 && (
        <ul className="mt-5 space-y-2">
          {detections.map((d) => (
            <li
              key={d.id}
              className={
                d.severity === "critical"
                  ? "rounded-xl border border-red-300/60 bg-red-50/80 px-4 py-2.5 text-sm font-medium text-red-900 shadow-sm"
                  : "rounded-xl border border-amber-300/60 bg-amber-50/80 px-4 py-2.5 text-sm font-medium text-amber-950 shadow-sm"
              }
            >
              {d.message}
            </li>
          ))}
        </ul>
      )}

      {isEmpty && (
        <p className="mt-5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
          No supply chain rows returned for this <span className="font-mono">medicine_id</span>. Timeline
          cards below show pending stages except your device (live).
        </p>
      )}

      <div className="mt-8 flex w-full flex-col gap-0 lg:flex-row lg:items-stretch lg:justify-between lg:gap-2">
        {chain.map((step, index) => {
          const isUser = step.key === "user";
          const row = step.row;

          const location = isUser
            ? userLocationLabel
            : String(row?.location ?? "").trim() || "No record";

          const scanDateStr = !isUser && row ? String(row.scan_date ?? "").trim() : "";
          const date = isUser ? userDate : scanDateStr ? formatDisplayDate(scanDateStr) : "—";

          const time = isUser
            ? userTime
            : formatClockFromParts(
                row?.scan_date != null ? String(row.scan_date) : null,
                row?.scan_time != null ? String(row.scan_time) : null
              );

          const status: TimelineCardStatus = isUser ? "info" : cardStatusForRow(row);
          const statusText = isUser ? "Current scan" : row ? undefined : "Awaiting";

          return (
            <div key={step.key} className="flex flex-1 flex-col items-stretch lg:flex-row lg:items-center">
              <TimelineCard
                title={step.title}
                icon={step.icon}
                location={location}
                date={date}
                time={time}
                status={status}
                statusText={statusText}
                showScanCount={!isUser}
                scanCount={row?.scan_cnt ?? null}
                className="w-full"
              />
              {index < chain.length - 1 && (
                <>
                  <TimelineConnector vertical />
                  <TimelineConnector vertical={false} />
                </>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}