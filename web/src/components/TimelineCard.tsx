import type { LucideIcon } from "lucide-react";
import { Calendar, Clock, MapPin, RefreshCw } from "lucide-react";
import type { TimelineCardStatus } from "@/types/medicine";

const statusStyles: Record<TimelineCardStatus, string> = {
  verified: "bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/25",
  pending: "bg-amber-500/15 text-amber-900 ring-1 ring-amber-500/25",
  warning: "bg-red-500/12 text-red-800 ring-1 ring-red-500/25",
  info: "bg-sky-500/12 text-sky-900 ring-1 ring-sky-500/25",
};

const statusLabel: Record<TimelineCardStatus, string> = {
  verified: "Verified",
  pending: "Awaiting",
  warning: "Attention",
  info: "Live",
};

export interface TimelineCardProps {
  title: string;
  icon: LucideIcon;
  location: string;
  date: string;
  time: string;
  status: TimelineCardStatus;
  statusText?: string;
  /** Omit or false for User card — scan count hidden per product rules */
  showScanCount?: boolean;
  scanCount?: number | null;
  className?: string;
}

export function TimelineCard({
  title,
  icon: Icon,
  location,
  date,
  time,
  status,
  statusText,
  showScanCount = true,
  scanCount,
  className = "",
}: TimelineCardProps) {
  const badge = statusText ?? statusLabel[status];

  return (
    <article
      className={[
        "group relative flex min-w-[220px] max-w-sm flex-1 flex-col rounded-2xl border border-white/60 bg-white/65 p-5 shadow-soft backdrop-blur-md",
        "transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-brand-500/25 hover:bg-white/80 hover:shadow-card",
        className,
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500/15 to-cyan-500/10 text-brand-700 ring-1 ring-brand-500/20 transition-transform duration-300 group-hover:scale-105">
          <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold tracking-tight text-slate-900">{title}</h3>
          <span
            className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusStyles[status]}`}
          >
            {badge}
          </span>
        </div>
      </div>

      <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
        <li className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600/80" aria-hidden />
          <span className="leading-snug">{location}</span>
        </li>
        <li className="flex items-center gap-2">
          <Calendar className="h-4 w-4 shrink-0 text-brand-600/80" aria-hidden />
          <span>{date}</span>
        </li>
        <li className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0 text-brand-600/80" aria-hidden />
          <span>{time}</span>
        </li>
        {showScanCount && (
          <li className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 shrink-0 text-brand-600/80" aria-hidden />
            <span>
              Scans: <span className="font-semibold text-slate-800">{scanCount ?? "—"}</span>
            </span>
          </li>
        )}
      </ul>
    </article>
  );
}
