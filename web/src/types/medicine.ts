/** Single product row from the `medicine` catalog table (read-only client usage). */
export interface MedicineCatalogRow {
  medicine_id: string;
  medicine_name: string | null;
  batch_no: string | null;
  manufacture_date: string | null;
  expiry_date: string | null;
}

/** Row shape for supply-chain tracking in `medicines` (read-only client usage). */
export interface MedicineScanRow {
  id: string;
  batch_no: string | null;
  medicine_id: string;
  role: string | null;
  location: string | null;
  scan: string | null;
  scan_cnt: number | null;
  manufacture_date: string | null;
  expiry_date: string | null;
  scan_date: string | null;
  scan_time: string | null;
}

export type SupplyChainRole = "Manufacturer" | "Distributor" | "Pharmacy" | "User";

export type TimelineCardStatus = "verified" | "pending" | "warning" | "info";

export interface TimelineDetection {
  id: string;
  message: string;
  severity: "warning" | "critical";
}
