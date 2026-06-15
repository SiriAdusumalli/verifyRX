import { ScanTimeline } from "@/components/ScanTimeline";
import { Link, useParams } from "react-router-dom";

console.log("PAGE FILE RUNNING");

export function ScanResult() {
  const { medicineId } = useParams<{ medicineId: string }>();
  
  // Dynamic fallback: reads parameter from URL, or falls back to your active test ID
  const decoded = medicineId ? decodeURIComponent(medicineId.trim()) : "8006035036691";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-700">Supply chain</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl">
              Medicine scan timeline
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/scan" className="rounded-xl border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm">
              New scan
            </Link>
          </div>
        </header>

        {/* Pass the ID down into the timeline component */}
        <ScanTimeline medicineId={decoded} />
      </div>
    </div>
  );
}