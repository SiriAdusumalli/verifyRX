import { SupplyChainTimelinePanel } from "@/components/SupplyChainTimelinePanel";
import { getBarcodeStaticAlert } from "@/lib/barcodeDemoAlerts";
import { useMedicineCatalog } from "@/hooks/useMedicineCatalog";
import { formatDisplayDate } from "@/lib/medicineSupplyChain";
import { buildVerificationView } from "@/lib/verificationPresenter";
import { resolveMedicineIdFromScan } from "@/lib/resolveMedicineIdFromScan";
import type { ScanResponse } from "@/types/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  Factory,
  FlaskConical,
  MapPin,
  PackageCheck,
  ShieldAlert,
  ShieldCheck,
  Info,
  Copy,
} from "lucide-react";

import { useMemo, useState } from "react";
import { useI18n } from "@/contexts/I18nContext";
import { AiRiskAnalysisCard } from "@/components/AiRiskAnalysisCard";

type Props = {
  result: ScanResponse | null;
  busy: boolean;
  scannedQrRaw?: string | null;
};

function fieldIcon(icon: string) {
  if (icon === "factory") return <Factory className="h-4 w-4" />;
  if (icon === "package") return <PackageCheck className="h-4 w-4" />;
  if (icon === "shield") return <ShieldCheck className="h-4 w-4" />;
  if (icon === "map") return <MapPin className="h-4 w-4" />;
  return <FlaskConical className="h-4 w-4" />;
}


function isBarcodeClassScan(qrType: ScanResponse["qr_type"]): boolean {
  return qrType === "text" || qrType === "gs1" || qrType === "medicine_id";
}

export function VerificationDashboard({
  result,
  busy,
  scannedQrRaw,
}: Props) {
  const [showRaw, setShowRaw] = useState(false);

  const { t } = useI18n();

  const view = useMemo(
    () => (result ? buildVerificationView(result) : null),
    [result]
  );

  const medicineIdForTimeline = useMemo(
    () => (result ? resolveMedicineIdFromScan(result, scannedQrRaw) : null),
    [result, scannedQrRaw]
  );

  const barcodeStaticAlert = useMemo(
    () => getBarcodeStaticAlert(scannedQrRaw, medicineIdForTimeline),
    [scannedQrRaw, medicineIdForTimeline]
  );

  const showBarcodeSupplyChain =
    !!result && isBarcodeClassScan(result.qr_type);

  const { row: catalogRow, loading: catalogLoading, error: catalogError } =
    useMedicineCatalog(
      showBarcodeSupplyChain ? medicineIdForTimeline : null
    );

  if (busy && !result) {
    return (
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
          />
        ))}
      </div>
    );
  }

  if (!result || !view) return null;

  const showWebsiteDetailCards =
    result.qr_type === "url" ||
    (result.qr_type === "json" && view.groups.length > 0);

  const apiSuspiciousReasons = result.suspicious_reasons ?? [];

  const showVerificationAlerts =
    showBarcodeSupplyChain &&
    (barcodeStaticAlert !== null || apiSuspiciousReasons.length > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mt-8 space-y-5"
    >
      {showBarcodeSupplyChain ? (
        <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-lg backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/80">
          <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {t("medicineDetailsSectionTitle")}
          </h2>

          {catalogError && (
            <p className="mt-3 rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {catalogError}
            </p>
          )}

          {catalogLoading && (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-xl bg-slate-200/80 dark:bg-slate-700/80"
                />
              ))}
            </div>
          )}

          {!catalogLoading && (
            <dl className="mt-4 space-y-3">
              {(
                [
                  [
                    "medicineFieldId",
                    String(catalogRow?.medicine_id ?? medicineIdForTimeline ?? "").trim() || "—",
                  ],
                  ["medicineFieldName", String(catalogRow?.medicine_name ?? "").trim() || "—"],
                  ["medicineFieldBatch", String(catalogRow?.batch_no ?? "").trim() || "—"],
                  [
                    "medicineFieldManufactureDate",
                    catalogRow?.manufacture_date?.trim()
                      ? formatDisplayDate(catalogRow.manufacture_date)
                      : "—",
                  ],
                  [
                    "medicineFieldExpiryDate",
                    catalogRow?.expiry_date?.trim()
                      ? formatDisplayDate(catalogRow.expiry_date)
                      : "—",
                  ],
                ] as const
              ).map(([labelKey, value]) => (
                <div
                  key={labelKey}
                  className="flex flex-col gap-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                >
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t(labelKey)}
                  </dt>
                  <dd className="text-sm font-medium text-slate-900 dark:text-slate-100 sm:text-right">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {!catalogLoading && !catalogRow && medicineIdForTimeline?.trim() && !catalogError && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              {t("medicineDetailsEmptyRow")}
            </p>
          )}
        </section>
      ) : (
        <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-lg backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/80">
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {view.cleaned.medicine_name ||
              result.medicine_name ||
              t("medicineDetailsFound")}
          </h2>

          <p className="mt-1 text-xs text-slate-500 dark:text-slate-300">
            {t("qr")} {result.qr_type} • {t("sourceLabel")}{" "}
            {result.source_type}
          </p>

          {showWebsiteDetailCards && result.source_url && (
            <a
              href={result.source_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs text-brand-600 underline"
            >
              {t("redirectedSourceUrl")}
            </a>
          )}
        </div>
      )}

      {showWebsiteDetailCards &&
        (view.groups.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {view.groups.map((group, idx) => (
              <motion.section
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                  {group.title}
                </h3>

                <div className="space-y-2">
                  {group.fields.map((f) => (
                    <div
                      key={`${group.id}-${f.key}`}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/60"
                    >
                      <p className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {fieldIcon(f.icon)}
                        {f.label}
                      </p>

                      <p className="max-w-[60%] text-right text-sm text-slate-900 dark:text-slate-100">
                        {f.value}
                      </p>
                    </div>
                  ))}
                </div>
              </motion.section>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-100">
            Structured medicine fields were not extracted from this page.
          </div>
        ))}

      {showBarcodeSupplyChain && (
        <SupplyChainTimelinePanel medicineId={medicineIdForTimeline} />
      )}

      {/* NEW: AI Risk Analysis Card */}
      <AiRiskAnalysisCard
        medicineName={result.medicine_name || catalogRow?.medicine_name || result.structured?.medicineInformation?.properAndGenericDrugName || "Unknown"}
        manufacturer={result.canonical_fields?.manufacturer || result.key_values?.manufacturer || result.structured?.manufacturerDetails?.manufacturerNameAndAddress || "Unknown"}
        expiryDate={catalogRow?.expiry_date || result.canonical_fields?.expiry_date || result.key_values?.expiry_date || result.structured?.medicineInformation?.expiryDate || "Unknown"}
        batchNo={catalogRow?.batch_no || result.canonical_fields?.batch_no || result.key_values?.batch_no || result.structured?.medicineInformation?.batchNumber || "Unknown"}
        scannedQrRaw={scannedQrRaw}
        suspiciousReasons={result.suspicious_reasons || []}
      />



    </motion.div>
  );
}