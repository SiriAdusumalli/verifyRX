import type { MedicineScanRow, TimelineDetection } from "@/types/medicine";

export function normalizeRoleLabel(role: string | null): string {
  return String(role ?? "").trim().toLowerCase();
}

export function matchesRole(role: string | null, expected: string): boolean {
  return normalizeRoleLabel(role) === expected.toLowerCase();
}

export function normalizeTimeFragment(t: string | null | undefined): string {
  if (!t?.trim()) return "00:00:00";
  const s = t.trim();
  if (/^\d{2}:\d{2}:\d{2}/.test(s)) return s.slice(0, 8);
  if (/^\d{2}:\d{2}$/.test(s)) return `${s}:00`;
  return s;
}

export function scanMoment(row: MedicineScanRow): Date | null {
  const ds = String(row.scan_date ?? "").trim();
  if (!ds) return null;
  const combined = `${ds}T${normalizeTimeFragment(row.scan_time != null ? String(row.scan_time) : null)}`;
  const d = new Date(combined);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function pickLatestForRole(rows: MedicineScanRow[], role: string): MedicineScanRow | null {
  const matches = rows.filter((r) => matchesRole(r.role, role));
  if (!matches.length) return null;
  return [...matches].sort((a, b) => {
    const tb = scanMoment(b)?.getTime() ?? -Infinity;
    const ta = scanMoment(a)?.getTime() ?? -Infinity;
    if (tb !== ta) return tb - ta;
    return (b.id ?? "").localeCompare(a.id ?? "");
  })[0]!;
}

export function formatDisplayDate(raw: string | null | undefined): string {
  if (raw == null) return "—";
  const v = String(raw).trim();
  if (!v) return "—";
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (ymd) {
    const y = Number(ymd[1]);
    const m = Number(ymd[2]);
    const d = Number(ymd[3]);
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(y, m - 1, d));
  }
  const parsed = new Date(v);
  if (Number.isNaN(parsed.getTime())) return v;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

export function formatClockFromParts(_dateStr: string | null, timeStr: string | null): string {
  if (!timeStr?.trim()) return "—";
  return normalizeTimeFragment(timeStr);
}

export function todayLocalISO(): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function nowLocalClock(): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

export function detectMultiCityShortWindow(rows: MedicineScanRow[], windowMs: number): boolean {
  const events = rows
    .filter((r) => String(r.location ?? "").trim())
    .map((r) => ({
      loc: String(r.location ?? "").trim().toLowerCase(),
      at: scanMoment(r),
    }))
    .filter((e): e is { loc: string; at: Date } => e.at !== null)
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  if (events.length < 2) return false;
  const distinct = new Set(events.map((e) => e.loc));
  if (distinct.size < 2) return false;
  const span = events[events.length - 1]!.at.getTime() - events[0]!.at.getTime();
  return span <= windowMs;
}

export function buildSupplyChainDetections(
  rows: MedicineScanRow[],
  manufacturer: MedicineScanRow | null
): TimelineDetection[] {
  const out: TimelineDetection[] = [];
  const today = todayLocalISO();

  if (!manufacturer) {
    out.push({
      id: "missing-mfr",
      message: "⚠ Manufacturer verification missing",
      severity: "warning",
    });
  }

  if (rows.some((r) => (r.scan_cnt ?? 0) > 6)) {
    out.push({
      id: "excessive-scan",
      message: "⚠ Excessive Scan Count Detected",
      severity: "warning",
    });
  }

  if (detectMultiCityShortWindow(rows, 24 * 60 * 60 * 1000)) {
    out.push({
      id: "clone",
      message: "⚠ Possible QR Cloning",
      severity: "critical",
    });
  }

  const expired = rows.some((r) => {
    const ex = String(r.expiry_date ?? "").trim();
    return Boolean(ex) && today > ex;
  });
  if (expired) {
    out.push({
      id: "expired",
      message: "⚠ Expired medicine detected",
      severity: "critical",
    });
  }

  return out;
}
