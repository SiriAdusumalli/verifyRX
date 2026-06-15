import { useAuth } from "@/contexts/AuthContext";
import { listScanCache } from "@/lib/offlineCache";
import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { User, MapPin, Mail, Calendar, LogOut } from "lucide-react";

type Row = {
  id: string;
  created_at: string;
  barcode: string | null;
  medicines:
    | { id: string; name: string; risk_level: string }
    | { id: string; name: string; risk_level: string }[]
    | null;
};

export function DashboardPage() {
  const { dbUser, signOut } = useAuth();
  const { t } = useI18n();
  const [rows, setRows] = useState<Row[]>([]);
  const [saved, setSaved] = useState<
    {
      id: string;
      bookmarked: boolean;
      medicines: { name: string } | { name: string }[] | null;
    }[]
  >([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!dbUser || !supabase) return;
    let cancel = false;
    (async () => {
      const { data, error } = await supabase
        .from("scans")
        .select("id, created_at, barcode, medicines (id, name, risk_level)")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) {
        if (!cancel) setErr(error.message);
        return;
      }
      if (!cancel) {
        setRows((data as unknown as Row[]) || []);
      }

      const sv = await supabase
        .from("user_saved_medicines")
        .select("id, bookmarked, medicines (name)")
        .order("created_at", { ascending: false });
      if (!sv.error && !cancel) {
        setSaved((sv.data as unknown as typeof saved) || []);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [dbUser]);

  const local = listScanCache();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:px-6">
      
      {/* Dashboard Heading & Logout */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {t("dashboard")}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your authenticated profile and medicine verifications.
          </p>
        </div>
        <button
          type="button"
          onClick={() => signOut()}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 outline-none"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>

      {err && (
        <p className="mt-4 text-sm font-semibold text-red-600 bg-red-50 border border-red-100 rounded-2xl px-4 py-3">
          {err}
        </p>
      )}

      {/* Premium Profile Summary Card */}
      {dbUser && (
        <section className="mt-8">
          <div className="rounded-3xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/50 p-6 shadow-md md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 shadow-sm">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 leading-snug">
                    {dbUser.user_name}
                  </h2>
                  <p className="text-xs font-semibold text-brand-600 mt-0.5 tracking-wider uppercase">
                    Verified Member
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 border-t border-slate-100/80 pt-5 md:border-t-0 md:pt-0">
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <Mail className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="font-medium truncate max-w-[180px]">{dbUser.email}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-slate-600">
                  <MapPin className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="font-medium">{dbUser.location || "Unknown"}</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-slate-600 sm:col-span-2">
                  <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="font-medium">
                    Registered: {new Date(dbUser.created_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* Scans and Offline sections */}
      <div className="mt-10 grid gap-8 md:grid-cols-12">
        
        {/* Left column: Recent scans and offline scans */}
        <div className="md:col-span-7 space-y-8">
          
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("recentScansCloud")}
            </h3>
            <ul className="mt-4 space-y-3">
              {rows.map((r) => {
                const med = Array.isArray(r.medicines) ? r.medicines[0] : r.medicines;
                return (
                  <li
                    key={r.id}
                    className="rounded-2xl border border-slate-50 bg-slate-50/50 p-4 transition hover:bg-slate-50"
                  >
                    <Link
                      to={`/results/${med?.id ?? ""}`}
                      className="font-bold text-slate-800 hover:text-brand-600 transition"
                    >
                      {med?.name ?? t("medicineDefault")}
                    </Link>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(r.created_at).toLocaleString()} ·{" "}
                      <span className="font-semibold text-brand-600 uppercase text-[10px] tracking-wider">
                        {med?.risk_level}
                      </span>{" "}
                      · {r.barcode ?? t("noBarcode")}
                    </p>
                  </li>
                );
              })}
              {!rows.length && (
                <p className="text-sm font-medium text-slate-400 py-2">
                  {t("noScansYet")}
                </p>
              )}
            </ul>
          </section>

          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("offlineCache")}
            </h3>
            <ul className="mt-4 space-y-2">
              {local.map((c) => (
                <li key={c.payload.id} className="flex items-center justify-between">
                  <Link
                    to={`/results/${c.payload.id}`}
                    className="text-sm font-semibold text-brand-600 hover:underline"
                  >
                    {c.payload.medicine_name}
                  </Link>
                  <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-full">
                    Cached
                  </span>
                </li>
              ))}
              {!local.length && (
                <p className="text-sm font-medium text-slate-400 py-2">
                  No offline scans cached.
                </p>
              )}
            </ul>
          </section>

        </div>

        {/* Right column: Bookmarks and saved items */}
        <div className="md:col-span-5">
          <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              {t("saved")}
            </h3>
            <ul className="mt-4 space-y-3">
              {saved.map((s) => {
                const m = Array.isArray(s.medicines) ? s.medicines[0] : s.medicines;
                return (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50/50 px-4 py-3"
                  >
                    <span className="text-sm font-semibold text-slate-700">{m?.name}</span>
                    {s.bookmarked && (
                      <span className="text-amber-500 font-bold text-base" title="Bookmarked">
                        ★
                      </span>
                    )}
                  </li>
                );
              })}
              {!saved.length && (
                <p className="text-sm font-medium text-slate-400 py-2">
                  {t("nothingSaved")}
                </p>
              )}
            </ul>
          </section>
        </div>

      </div>

    </div>
  );
}
