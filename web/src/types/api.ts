/** Strict API contracts (Edge Functions) */

export type RiskLevel = "low" | "medium" | "high";

export type ScanRequest = {
  qr_text?: string | null;
  barcode: string | null;
  image: string | null;
  /** Optional: client-side OCR / barcode hint text */
  client_extracted_text?: string | null;
  image_mime?: string | null;
};

export type ScanResponse = {
  id: string;
  qr_type: "url" | "json" | "medicine_id" | "gs1" | "text";
  source_type: "direct" | "api" | "html" | "xml";
  source_url: string | null;
  authenticity_status: "verified" | "suspicious" | "unknown" | "potential_fake";
  confidence_score: number;
  suspicious_reasons: string[];
  medicine_name: string;
  key_values: Record<string, string>;
  canonical_fields: Record<string, string>;
  fetched_data: Record<string, unknown>;
  sections?: Record<string, Record<string, string>>;
  redirect_chain?: string[];
  raw_source_data?: {
    content_type: string;
    preview: string;
    json?: unknown;
    html_preview?: string;
    xml_preview?: string;
  };
  structured?: {
    medicineInformation: {
      uniqueProductIdentificationCode: string;
      properAndGenericDrugName: string;
      batchNumber: string;
      manufacturingDate: string;
      expiryDate: string;
    };
    manufacturerDetails: {
      manufacturerNameAndAddress: string;
      manufacturingLicenseNumber: string;
    };
  };
  risk_level: RiskLevel;
};

export type CompareRequest = {
  med1: string;
  med2: string;
};

export type CompareResponse = {
  medicine_1: {
    name: string;
    data: {
      composition: string;
      usage: string;
      warnings: string;
    };
  };
  medicine_2: {
    name: string;
    data: {
      composition: string;
      usage: string;
      warnings: string;
    };
  };
  comparison: {
    differences: string;
  };
  disclaimer?: string;
};

export type MedicineRecord = ScanResponse & {
  name: string;
  composition: string;
  usage: string[];
  side_effects: string[];
  warnings: string[];
  disclaimer?: string;
  dosage_guidance?: string;
  barcode: string | null;
  created_at?: string;
  dynamic_data?: Record<string, string>;
  confidence_score?: number;
  authenticity_status?: "verified" | "suspicious" | "unknown";
  source_url?: string | null;
  source_type?: "direct" | "api" | "html";
  canonical_fields?: Record<string, string>;
  qr_type?: "url" | "json" | "medicine_id" | "gs1" | "text";
};
