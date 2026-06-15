import type { ScanResponse } from "@/types/api";

const KEY = "sma_scan_cache_v1";
const MAX = 5;

export type CachedScan = { at: number; payload: ScanResponse };

export function pushScanCache(entry: ScanResponse): void {
  try {
    const raw = localStorage.getItem(KEY);
    const list: CachedScan[] = raw ? JSON.parse(raw) : [];
    const next: CachedScan[] = [
      { at: Date.now(), payload: entry },
      ...list.filter((x) => x.payload.id !== entry.id),
    ].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export function listScanCache(): CachedScan[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
