export type BarcodeDemoAlertVariant = "success" | "error";

export type BarcodeDemoAlert = {
  variant: BarcodeDemoAlertVariant;
  /** Full line including leading emoji for presentation. */
  message: string;
};

/** Demo-only frontend mapping for hackathon barcode scenarios (no backend). */
const BARCODE_STATIC_ALERTS: Record<string, BarcodeDemoAlert> = {
  "8906045030991": {
    variant: "success",
    message: "✅ Medicine verifed",
  },
  "8114039030692": {
    variant: "error",
    message: "❌ Possible fake medicine detected, medicine not found in the database",
  },
  "8006035036691": {
    variant: "error",
    message:
      "❌ Possible fake medicine detected, impossible travel in less time and multiple scans detected",
  },
  "8014511030693": {
    variant: "error",
    message: "❌ Possible fake medicine detected, batch number mismatched",
  },
  "8000531030697": {
    variant: "error",
    message: "❌ Possible fake medicine detected, manufacturer not found",
  },
  "8022531030698": {
    variant: "error",
    message: "⚠️ medicine expired!",
  },
};

function normalizeBarcodeKey(scannedRaw: string | null | undefined, medicineId: string | null | undefined): string | null {
  for (const candidate of [scannedRaw?.trim(), medicineId?.trim()]) {
    if (candidate && candidate in BARCODE_STATIC_ALERTS) return candidate;
  }
  return null;
}

export function getBarcodeStaticAlert(
  scannedRaw: string | null | undefined,
  medicineId: string | null | undefined
): BarcodeDemoAlert | null {
  const key = normalizeBarcodeKey(scannedRaw, medicineId);
  if (!key) return null;
  return BARCODE_STATIC_ALERTS[key] ?? null;
}
