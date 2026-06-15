import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LIMIT = 10;
const WINDOW_MS = 60_000;

export async function checkScanRateLimit(
  supabaseUrl: string,
  serviceKey: string,
  bucket: string
): Promise<{ ok: boolean; remaining: number }> {
  const supabase = createClient(supabaseUrl, serviceKey);
  const windowMinute = new Date(
    Math.floor(Date.now() / WINDOW_MS) * WINDOW_MS
  ).toISOString();

  const { data: row } = await supabase
    .from("scan_rate_limits")
    .select("id, count")
    .eq("bucket", bucket)
    .eq("window_minute", windowMinute)
    .maybeSingle();

  const count = row?.count ?? 0;
  if (count >= LIMIT) {
    return { ok: false, remaining: 0 };
  }

  if (row?.id) {
    await supabase
      .from("scan_rate_limits")
      .update({ count: count + 1 })
      .eq("id", row.id);
  } else {
    await supabase.from("scan_rate_limits").insert({
      bucket,
      window_minute: windowMinute,
      count: 1,
    });
  }

  return { ok: true, remaining: LIMIT - count - 1 };
}
