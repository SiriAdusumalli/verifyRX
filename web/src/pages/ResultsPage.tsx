import { useAuth } from "@/contexts/AuthContext";
import { invokeMedicine } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import type { MedicineRecord } from "@/types/api";
import { resolveScanUpdate } from "@/utils/safeScanState";
import { sanitizeScanResponse } from "@/utils/medicineValidation";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import { useSpeech } from "@/hooks/useSpeech";
import { AiRiskAnalysisCard } from "@/components/AiRiskAnalysisCard";

export function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { locale, t } = useI18n();
  const { speak } = useSpeech();
  const [data, setData] = useState<MedicineRecord | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const fetchGenRef = useRef(0);

  useEffect(() => {
    if (!id) return;
    const gen = ++fetchGenRef.current;
    setData(null);
    setErr(null);

    void (async () => {
      try {
        const m = await invokeMedicine(id);
        if (fetchGenRef.current !== gen) return;
        const sanitized = sanitizeScanResponse(m) as MedicineRecord;
        setData((prev) => {
          const decision = resolveScanUpdate(prev, sanitized, "medicine_api");
          return decision.accept && decision.next
            ? (decision.next as MedicineRecord)
            : prev;
        });
      } catch (e) {
        if (fetchGenRef.current !== gen) return;
        setErr(e instanceof Error ? e.message : "Data not found");
      }
    })();
  }, [id]);

  if (err) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-red-700">{err}</p>
        <Link to="/scan" className="mt-4 inline-block text-brand-600">
          {t("tryAgain")}
        </Link>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="px-4 py-20 text-center text-slate-600">{t("loading")}</div>
    );
  }

  const blob = [
    data.medicine_name || data.name,
    data.composition,
    data.usage.join(". "),
    data.warnings.join(". "),
    data.disclaimer,
  ].join(". ");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {data.medicine_name || data.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t("risk")}{" "}
            <span className="font-semibold text-slate-800">{data.risk_level}</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {t("type")} {data.qr_type || t("text")} | {t("source")} {data.source_type || t("direct")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => speak(blob, locale)}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700"
          >
            {t("readAloud")}
          </button>
          {user && supabase && id && (
            <button
              type="button"
              onClick={async () => {
                if (!supabase) return;
                setSaveMsg(null);
                const { error } = await supabase
                  .from("user_saved_medicines")
                  .upsert(
                    {
                      user_id: user.id,
                      medicine_id: id,
                      bookmarked: true,
                    },
                    { onConflict: "user_id,medicine_id" }
                  );
                setSaveMsg(
                  error ? error.message : "Saved to your list (bookmarked)."
                );
              }}
              className="rounded-full bg-mint-500 px-4 py-2 text-xs font-semibold text-white"
            >
              Bookmark
            </button>
          )}
        </div>
      </div>
      {saveMsg && (
        <p className="mt-2 text-center text-xs text-slate-600">{saveMsg}</p>
      )}

      <div className="mt-8 space-y-4">
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase text-brand-700">Authenticity</h2>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                data.authenticity_status === "verified"
                  ? "bg-emerald-100 text-emerald-700"
                  : data.authenticity_status === "suspicious"
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {data.authenticity_status || "unknown"}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-700">
            Confidence score: {data.confidence_score ?? 0}%
          </p>
          {data.source_url && (
            <a
              href={data.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs text-brand-600 underline"
            >
              Source URL
            </a>
          )}
        </section>

        {/* NEW: AI Risk Analysis Card */}
        <AiRiskAnalysisCard
          medicineName={data.medicine_name || data.name}
          manufacturer={data.canonical_fields?.manufacturer || data.key_values?.manufacturer || data.structured?.manufacturerDetails?.manufacturerNameAndAddress}
          expiryDate={data.canonical_fields?.expiry_date || data.key_values?.expiry_date || data.structured?.medicineInformation?.expiryDate}
          batchNo={data.canonical_fields?.batch_no || data.key_values?.batch_no || data.structured?.medicineInformation?.batchNumber}
          scannedQrRaw={data.barcode}
          suspiciousReasons={data.suspicious_reasons || []}
        />

        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="text-xs font-bold uppercase text-brand-700">
            Composition
          </h2>
          <p className="mt-2 text-sm text-slate-700">{data.composition}</p>
        </section>
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="text-xs font-bold uppercase text-brand-700">Uses</h2>
          <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
            {data.usage.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="text-xs font-bold uppercase text-brand-700">
            Side effects
          </h2>
          <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
            {data.side_effects.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="text-xs font-bold uppercase text-brand-700">
            Warnings
          </h2>
          <ul className="mt-2 list-inside list-disc text-sm text-slate-700">
            {data.warnings.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
        {data.dosage_guidance && (
          <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-card">
            <h2 className="text-xs font-bold uppercase text-brand-700">
              Dosage guidance
            </h2>
            <p className="mt-2 text-sm text-slate-700">{data.dosage_guidance}</p>
          </section>
        )}
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-card">
          <h2 className="text-xs font-bold uppercase text-brand-700">
            Extracted key-value data
          </h2>
          <div className="mt-2 max-h-72 overflow-auto rounded-xl border border-slate-100">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">Key</th>
                  <th className="px-3 py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(data.dynamic_data || data.key_values || {}).map(([k, v]) => (
                  <tr key={k} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-[11px] text-slate-600">{k}</td>
                    <td className="px-3 py-2 text-slate-800">{String(v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-xs font-semibold text-slate-700">
            Raw Data
          </summary>
          <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-[11px] text-slate-700">
            {JSON.stringify(data, null, 2)}
          </pre>
        </details>
        <p className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-600">
          {data.disclaimer}
        </p>
      </div>

      <div className="mt-8 flex justify-center gap-4">
        <Link
          to="/scan"
          className="text-sm font-semibold text-brand-600 hover:underline"
        >
          New scan
        </Link>
        <Link
          to="/dashboard"
          className="text-sm font-semibold text-slate-600 hover:underline"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
