import { invokeQrIntel } from "@/lib/api";
import { VerificationDashboard } from "@/components/VerificationDashboard";
import { pushScanCache } from "@/lib/offlineCache";
import { verifyQrOnClient } from "@/lib/qrClient";
import type { ScanResponse } from "@/types/api";
import { applyScanUpdate, resolveScanUpdate } from "@/utils/safeScanState";
import { sanitizeScanResponse } from "@/utils/medicineValidation";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "@/contexts/I18nContext";
import {
  Shield,
  Zap,
  ShieldCheck,
  Lightbulb,
  Sun,
  Target,
  Smartphone,
  AlertCircle,
  Lock,
  Camera,
  RefreshCw,
  Upload,
  FileText,
  Scan,
  Maximize2,
  QrCode
} from "lucide-react";

/** Formats for live camera + image upload (QR URLs and product barcodes). */
const SCAN_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.DATA_MATRIX,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
];

const SCANNER_CONFIG = { verbose: false, formatsToSupport: SCAN_FORMATS };

export function ScanPage() {
  const nav = useNavigate();
  const { t } = useI18n();
  const [scannerMountKey, setScannerMountKey] = useState(0);
  const scannerElId = useMemo(
    () => `verifyrx-scanner-${scannerMountKey}`,
    [scannerMountKey]
  );
  const fileScannerElId = useMemo(() => "verifyrx-file-scanner", []);
  const qrRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<string>("");
  const handledRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string>(t("alignQrCode"));
  const [streamActive, setStreamActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [lastScannedRaw, setLastScannedRaw] = useState<string | null>(null);
  const [cloudResultId, setCloudResultId] = useState<string | null>(null);
  const syncSeqRef = useRef(0);
  const cloudAbortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      cloudAbortRef.current?.abort();
    };
  }, []);

  const runScan = useCallback(
    async (raw: string) => {
      cloudAbortRef.current?.abort();
      const cloudAbort = new AbortController();
      cloudAbortRef.current = cloudAbort;

      setBusy(true);
      setErr(null);
      setScanResult(null);
      setCloudResultId(null);
      setLastScannedRaw(raw.trim());
      try {
        const localRes = await verifyQrOnClient(raw);
        if (!mountedRef.current) return;
        pushScanCache(localRes);
        applyScanUpdate(null, localRes, "qr_local", setScanResult);
        setHint(t("verificationCompleteFrontend"));

        const seq = ++syncSeqRef.current;
        void (async () => {
          try {
            const cloudRes = await invokeQrIntel(
              {
                qr_text: raw,
                barcode: raw,
                image: null,
                client_extracted_text: null,
                image_mime: null,
              },
              { signal: cloudAbort.signal }
            );
            if (!mountedRef.current || syncSeqRef.current !== seq) return;

            const sanitizedCloud = sanitizeScanResponse(cloudRes);
            setScanResult((prev) => {
              const decision = resolveScanUpdate(prev, sanitizedCloud, "qr_cloud");
              if (decision.accept && decision.next) {
                pushScanCache(decision.next);
                return decision.next;
              }
              return prev;
            });

            setCloudResultId(sanitizedCloud.id);
            setHint(t("verificationCompleteSynced"));
          } catch (e) {
            if (e instanceof DOMException && e.name === "AbortError") return;
            if (!mountedRef.current || syncSeqRef.current !== seq) return;
            setHint(t("verificationCompleteOffline"));
          }
        })();
      } catch (e) {
        setErr(
          e instanceof Error
            ? e.message
            : "Unable to process scan. Try another code or image."
        );
      } finally {
        setBusy(false);
      }
    },
    [t]
  );

  const stopCamera = useCallback(async (remountScanner = true) => {
    const instance = qrRef.current;
    if (!instance) {
      setStreamActive(false);
      return;
    }
    try {
      if (instance.isScanning) {
        await instance.stop();
      }
    } catch {
      // Camera may already be stopped
    } finally {
      qrRef.current = null;
      setStreamActive(false);
      if (remountScanner) {
        setScannerMountKey((k) => k + 1);
      }
    }
  }, []);

  const processDecoded = useCallback(
    async (decoded: string) => {
      const text = decoded.trim();
      if (!text) {
        setHint(t("duplicateOrEmptyQr"));
        return;
      }
      if (handledRef.current && text === lastScanRef.current) {
        setHint(t("duplicateOrEmptyQr"));
        return;
      }

      handledRef.current = true;
      lastScanRef.current = text;
      setHint(t("qrDetected"));

      if (qrRef.current?.isScanning) {
        await stopCamera(true);
      }

      await runScan(text);
    },
    [runScan, stopCamera, t]
  );

  const onCameraDecode = useCallback(
    (decodedText: string) => {
      if (handledRef.current) return;
      void processDecoded(decodedText);
    },
    [processDecoded]
  );

  const waitForScannerDom = useCallback(() => {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }, []);

  const startCamera = useCallback(async () => {
    setErr(null);
    handledRef.current = false;
    setHint(t("alignQrCode"));

    if (qrRef.current?.isScanning) {
      await stopCamera(false);
    }

    await waitForScannerDom();

    const config = { fps: 10, qrbox: { width: 240, height: 240 }, aspectRatio: 1 };

    const tryStart = async (camera: MediaTrackConstraints) => {
      const qr = new Html5Qrcode(scannerElId, SCANNER_CONFIG);
      qrRef.current = qr;
      await qr.start(camera, config, onCameraDecode, () => undefined);
    };

    try {
      await tryStart({ facingMode: { exact: "environment" } });
      setStreamActive(true);
      setHint("Live scanner active. Point camera at a QR code or barcode.");
    } catch {
      try {
        await tryStart({ facingMode: "environment" });
        setStreamActive(true);
        setHint("Live scanner active. Point camera at a QR code or barcode.");
      } catch (e) {
        qrRef.current = null;
        setStreamActive(false);
        setErr(
          e instanceof Error ? e.message : t("unableToAccessCamera")
        );
      }
    }
  }, [onCameraDecode, scannerElId, stopCamera, t, waitForScannerDom]);

  const onUploadQrImage = useCallback(
    async (file: File) => {
      setErr(null);
      setHint(t("readingQrFromImage"));

      if (qrRef.current?.isScanning) {
        await stopCamera(true);
        await waitForScannerDom();
      }

      const fileScanner = new Html5Qrcode(fileScannerElId, SCANNER_CONFIG);

      try {
        const decoded = await fileScanner.scanFile(file, false);
        await processDecoded(decoded);
      } catch {
        setErr(t("noReadableQr"));
        setHint(t("uploadClearQr"));
      } finally {
        try {
          fileScanner.clear();
        } catch {
          // no-op
        }
      }
    },
    [fileScannerElId, processDecoded, stopCamera, t, waitForScannerDom]
  );

  useEffect(() => {
    return () => {
      void stopCamera(false);
    };
  }, [stopCamera]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-6 space-y-8">
      {/* Title Header */}
      <div className="text-left">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          Scan Medicine
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 font-medium">
          Scan QR code / Barcode to verify medicine authenticity.
        </p>
      </div>

      {/* Top Status Cards Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50">
            <Shield className="h-5 w-5 fill-emerald-600/10" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-snug">Secure Scanning</h3>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">End-to-end encrypted</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600 border border-sky-100/50">
            <Zap className="h-5 w-5 fill-sky-600/10" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-snug">Real-Time Analysis</h3>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5">Instant verification</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50">
            <ShieldCheck className="h-5 w-5 fill-emerald-600/10" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 leading-snug">Trusted Results</h3>
            <p className="text-[11px] font-semibold text-slate-400 mt-0.5 font-sans">AI-powered accuracy</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Scanner, Right Tips */}
      <div className="grid gap-6 md:grid-cols-12">
        {/* Left Column: Camera Scanner Interface */}
        <div className="md:col-span-8 space-y-4">
          <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 shadow-md flex flex-col">
            
            {/* The Futuristic Camera Mounting Frame */}
            <div className="relative rounded-2xl bg-slate-950 p-3 overflow-hidden w-full max-w-md mx-auto">
              
              {/* Camera Mount Container */}
              <div
                key={scannerMountKey}
                id={scannerElId}
                className="mx-auto min-h-[280px] w-full max-w-md rounded-xl overflow-hidden bg-slate-900 relative"
              />

              {/* Absolute Overlays (Hugs the camera container boundaries on top of the video feed) */}
              <div className="pointer-events-none absolute inset-3 rounded-xl overflow-hidden z-20">
                {/* Centered QR guidance overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center space-y-4 p-4">
                  {/* QR Code Icon with custom small brackets */}
                  <div className="relative p-3 bg-slate-900/60 rounded-2xl border border-slate-700/50 backdrop-blur-xs flex items-center justify-center animate-pulse">
                    <QrCode className="h-9 w-9 text-emerald-400" />
                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />
                  </div>

                  {/* Guidance Text */}
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-white tracking-wide">
                      Align QR code inside the frame
                    </p>
                    <p className="text-[11px] font-semibold text-slate-400">
                      Scanning will start automatically
                    </p>
                  </div>
                </div>

                {/* Neon Corners */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-xl" />

                {/* Glowing Laser Scan Line */}
                <div className="absolute left-0 right-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-lg shadow-emerald-500/50 animate-scan" />
              </div>
            </div>

            {/* Hint & Status messaging */}
            <div className="mt-4 flex flex-col text-left">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scanner Status</span>
              <p className="mt-1 text-sm font-bold text-emerald-700">{hint}</p>
            </div>

            {busy && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-100 p-3 text-sm text-slate-600 font-semibold">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                {t("processingVerification")}
              </div>
            )}

            {err && (
              <div className="mt-3 rounded-2xl border border-red-100 bg-red-50/50 p-4 text-xs font-semibold text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4.5 w-4.5 text-red-600 shrink-0" />
                {err}
              </div>
            )}

            {/* Actions button row */}
            <div className="mt-6 flex flex-wrap gap-2.5">
              {!streamActive ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void startCamera()}
                  className="rounded-2xl bg-blue-600 px-6 py-3.5 text-xs font-bold text-white hover:bg-blue-700 shadow-md shadow-blue-600/10 active:scale-95 disabled:opacity-60 transition flex items-center gap-2"
                >
                  <Camera className="h-4 w-4" />
                  {t("openCamera")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    void stopCamera(true).then(() => setHint(t("scannerStopped")));
                  }}
                  className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition"
                >
                  {t("stop")}
                </button>
              )}

              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  cloudAbortRef.current?.abort();
                  syncSeqRef.current += 1;
                  handledRef.current = false;
                  lastScanRef.current = "";
                  setScanResult(null);
                  setCloudResultId(null);
                  setLastScannedRaw(null);
                  setErr(null);
                  setHint(t("alignQrCode"));
                  if (!streamActive) void startCamera();
                }}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 disabled:opacity-60 transition flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                {t("rescan")}
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onUploadQrImage(file);
                  e.currentTarget.value = "";
                }}
              />

              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 active:scale-95 disabled:opacity-60 transition flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {t("uploadQrImage")}
              </button>

              {cloudResultId && (
                <button
                  type="button"
                  onClick={() => nav(`/results/${cloudResultId}`)}
                  className="rounded-2xl bg-emerald-600 px-6 py-3.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-md shadow-emerald-600/10 active:scale-95 transition flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  {t("openFullReport")}
                </button>
              )}
            </div>

          </div>

          {/* Bottom Security Banner */}
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                <Shield className="h-4.5 w-4.5 fill-emerald-600/10" />
              </div>
              <div className="text-left">
                <h4 className="text-xs font-extrabold text-slate-900 leading-snug uppercase tracking-wider">
                  Your safety is our priority
                </h4>
                <p className="text-[10px] font-semibold text-slate-400 leading-normal mt-0.5">
                  All scans are encrypted and your data is never shared.
                </p>
              </div>
            </div>

            <div className="inline-flex self-start sm:self-auto items-center gap-1 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-[10px] font-bold text-emerald-700 ml-12 sm:ml-0">
              <Lock className="h-3 w-3" />
              100% Secure
            </div>
          </div>
        </div>

        {/* Right Column: Scan Tips Side Panel */}
        <div className="md:col-span-4 text-left">
          <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-md space-y-6">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-50">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100/50">
                <Lightbulb className="h-4.5 w-4.5 fill-amber-600/10" />
              </div>
              <h3 className="font-bold text-slate-900">Scan Tips</h3>
            </div>

            <ul className="space-y-5">
              {/* Tip 1 */}
              <li className="flex items-start gap-3.5">
                <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                  <Sun className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-950 uppercase tracking-wider leading-snug">
                    Ensure good lighting
                  </h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                    Scan in well-lit environment
                  </p>
                </div>
              </li>

              {/* Tip 2 */}
              <li className="flex items-start gap-3.5">
                <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600 border border-sky-100/50">
                  <Target className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-950 uppercase tracking-wider leading-snug">
                    Keep it steady
                  </h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                    Hold the QR code steady
                  </p>
                </div>
              </li>

              {/* Tip 3 */}
              <li className="flex items-start gap-3.5">
                <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg bg-purple-50 text-purple-600 border border-purple-100/50">
                  <Scan className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-950 uppercase tracking-wider leading-snug">
                    Align properly
                  </h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                    Place QR code within the frame
                  </p>
                </div>
              </li>

              {/* Tip 4 */}
              <li className="flex items-start gap-3.5">
                <div className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 border border-orange-100/50">
                  <Smartphone className="h-4.5 w-4.5" />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-slate-950 uppercase tracking-wider leading-snug">
                    Clean the lens
                  </h4>
                  <p className="text-[10px] font-medium text-slate-400 mt-0.5">
                    Wipe your camera for clarity
                  </p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Hidden container for image QR reader */}
      <div id={fileScannerElId} className="sr-only" aria-hidden />

      {/* Embedded results dashboard from original page */}
      <VerificationDashboard
        result={scanResult}
        busy={busy}
        scannedQrRaw={lastScannedRaw}
      />
    </div>
  );
}
