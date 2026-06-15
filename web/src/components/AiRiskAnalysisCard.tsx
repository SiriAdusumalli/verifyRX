import { useEffect, useState, useRef } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  Shield,
  CheckCircle,
} from "lucide-react";
import { invokeRiskAnalysis, type AiRiskResponse } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

interface AiRiskAnalysisCardProps {
  medicineName?: string;
  manufacturer?: string;
  expiryDate?: string;
  batchNo?: string;
  scannedQrRaw?: string | null;
  suspiciousReasons?: string[];
}

export function AiRiskAnalysisCard({
  medicineName,
  manufacturer,
  expiryDate,
  batchNo,
  scannedQrRaw,
  suspiciousReasons = [],
}: AiRiskAnalysisCardProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AiRiskResponse | null>(null);

  const fetchTriggerRef = useRef("");

  useEffect(() => {
    // Prevent duplicate API calls
    const currentParamsHash = JSON.stringify({
      medicineName,
      manufacturer,
      expiryDate,
      batchNo,
      scannedQrRaw,
      suspiciousReasons,
    });

    if (fetchTriggerRef.current === currentParamsHash) return;

    fetchTriggerRef.current = currentParamsHash;

    // Prevent empty calls
    if (!medicineName && !batchNo) return;

    setLoading(true);
    setError(null);
    setAnalysis(null);

    const performAnalysis = async () => {
      try {
        // Timeout protection
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timeout")), 8000)
        );

        const response = await Promise.race([
          invokeRiskAnalysis({
            medicineName: medicineName || "Unknown",
            manufacturer: manufacturer || "Unknown",
            expiryDate: expiryDate || "Unknown",
            batchNo: batchNo || "Unknown",
            scannedQrRaw: scannedQrRaw || undefined,
            suspiciousReasons: suspiciousReasons,
          }),
          timeoutPromise,
        ]);

        setAnalysis(response as AiRiskResponse);
      } catch (err: any) {
        console.error("AI risk analysis error:", err);

        // Deterministic Fallback calculation
        const localConcerns: string[] = [];
        let localRisk = 0;

        if (suspiciousReasons.length > 0) {
          localRisk += 20;
          localConcerns.push("Possible fake medicine detected, impossible travel in less time and multiple scans detected");
        }
        if (!batchNo || batchNo === "Unknown" || !/^[A-Z0-9]{4,12}$/i.test(batchNo.trim())) {
          localRisk += 20;
          localConcerns.push("Possible fake medicine detected, batch number mismatched");
        }
        if (!manufacturer || manufacturer === "Unknown") {
          localRisk += 20;
          localConcerns.push("Possible fake medicine detected, manufacturer not found");
        }

        const localConfidence = 100 - localRisk;
        let localLevel = "LOW RISK";
        if (localRisk >= 80) {
          localLevel = "HIGH RISK";
        } else if (localRisk >= 40) {
          localLevel = "MEDIUM RISK";
        }

        setAnalysis({
          riskScore: localRisk,
          confidenceScore: localConfidence,
          riskLevel: localLevel,
          concerns: localConcerns,
          recommendation: "Verify medicine authenticity from a trusted pharmacy before consumption.",
          summary: "Multiple verification anomalies were detected in the scanned medicine metadata.",
        });
      } finally {
        setLoading(false);
      }
    };

    performAnalysis();
  }, [
    medicineName,
    manufacturer,
    expiryDate,
    batchNo,
    scannedQrRaw,
    suspiciousReasons,
  ]);

  // Risk color system
  const getRiskColors = (level: string) => {
    const uppercaseLevel = String(level ?? "").toUpperCase();
    if (uppercaseLevel.includes("HIGH")) {
      return {
        bg: "bg-rose-50 dark:bg-rose-950/20",
        border: "border-rose-200 dark:border-rose-900/50",
        text: "text-rose-700 dark:text-rose-400",
        progress: "bg-rose-500",
      };
    } else if (uppercaseLevel.includes("MEDIUM")) {
      return {
        bg: "bg-amber-50 dark:bg-amber-950/20",
        border: "border-amber-200 dark:border-amber-900/50",
        text: "text-amber-700 dark:text-amber-400",
        progress: "bg-amber-500",
      };
    } else {
      return {
        bg: "bg-emerald-50 dark:bg-emerald-950/20",
        border: "border-emerald-200 dark:border-emerald-900/50",
        text: "text-emerald-700 dark:text-emerald-400",
        progress: "bg-emerald-500",
      };
    }
  };

  const riskColors = getRiskColors(
    analysis?.riskLevel || "LOW RISK"
  );

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-lg backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/80">

      {/* HEADER */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400 border border-purple-100 dark:border-purple-900/35">
            <Sparkles className="h-4 w-4" />
          </div>

          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 tracking-tight">
            AI Medicine Risk Analysis
          </h3>
        </div>
      </div>

      <AnimatePresence mode="wait">

        {/* LOADING */}
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-10 space-y-3"
          >
            <Loader2 className="h-7 w-7 text-purple-600 animate-spin" />

            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Running AI-powered pharmaceutical risk verification...
            </p>
          </motion.div>
        )}

        {/* ERROR */}
        {error && !loading && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-xs font-semibold text-slate-500 flex items-center gap-2 dark:bg-slate-800/40 dark:border-slate-800"
          >
            <AlertCircle className="h-4.5 w-4.5 text-slate-400 shrink-0" />
            {error}
          </motion.div>
        )}

        {/* ANALYSIS */}
        {analysis && !loading && !error && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-5 space-y-5 text-left"
          >



            {/* SUMMARY */}
            <div className="space-y-1">

              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Analysis Summary
              </h4>

              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                {analysis.summary ||
                  "No detailed analysis available."}
              </p>
            </div>

            {/* CONCERNS */}
            <div className="space-y-2.5">

              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Potential Concerns Checked
              </h4>

              {analysis.concerns &&
              analysis.concerns.length > 0 ? (
                <ul className="space-y-2">

                  {analysis.concerns.map(
                    (concern, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2.5 text-xs text-rose-600 dark:text-rose-450"
                      >
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />

                        <span className="font-semibold leading-relaxed">
                          {concern}
                        </span>
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold bg-emerald-50/50 border border-emerald-100 rounded-xl p-3">

                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />

                  No high-risk metadata inconsistencies detected.
                </div>
              )}
            </div>



            {/* DISCLAIMER */}
            <p className="text-[10px] leading-relaxed text-slate-400 font-medium pt-2 border-t border-slate-100 dark:border-slate-800/60 select-none">
              Disclaimer: This pharmaceutical analysis is generated automatically by artificial intelligence. It does not replace authorized chemical testing, professional manufacturing validation, or medical consultation.
            </p>

          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}