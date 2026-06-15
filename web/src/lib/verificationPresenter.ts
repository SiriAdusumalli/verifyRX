import type { ScanResponse } from "@/types/api";

export type FieldIcon = "pill" | "factory" | "package" | "shield" | "map";

export type DisplayField = {
  key: string;
  label: string;
  value: string;
  icon: FieldIcon;
};

export type DisplayGroup = {
  id: string;
  title: string;
  fields: DisplayField[];
};

export type TimelineStep = {
  stage: "Factory" | "Distributor" | "Pharmacy" | "User";
  location: string;
  time: string;
  status: "done" | "active" | "unknown";
};

const KEY_LABELS: Record<string, string> = {
  medicine_name: "Medicine Name",
  generic_name: "Generic Name",
  manufacturer: "Manufacturer",
  batch_number: "Batch Number",
  mfg_date: "Manufacturing Date",
  expiry_date: "Expiry Date",
  license_number: "License Number",
  address: "Address",
  dosage: "Dosage",
  product_type: "Product Type",
  authenticity_status: "Verification Status",
  serial_number: "Serial Number",
  warning_info: "Warnings",
  location: "Location",
  scan_history: "Scan History",
};

type SectionRule = {
  id: string;
  title: string;
  keys: string[];
  icon: FieldIcon;
};

const SECTION_RULES: SectionRule[] = [
  // Medicine Information also includes production-related fields.
  { id: "medicine", title: "Medicine Information", keys: ["serial_number", "medicine_name", "generic_name", "batch_number", "mfg_date", "manufacturing_date", "expiry_date", "strength", "dosage", "composition", "ingredients", "package_size", "gtin"], icon: "pill" },
  { id: "manufacturer", title: "Manufacturer Details", keys: ["manufacturer", "license_number"], icon: "factory" },
  { id: "tracking", title: "Tracking Information", keys: ["scan_history", "location_history", "location", "barcode"], icon: "map" },
];

function titleCase(input: string): string {
  return input
    .replace(/[_.\[\]]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (s) => s.toUpperCase());
}

function normalizeValue(v: string): string {
  return v.replace(/\s+/g, " ").replace(/\|+/g, " | ").trim();
}

function firstLine(value: string): string {
  if (!value) return "";
  // keep the very first line if original contains newlines
  const byNewline = value.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (byNewline.length) return normalizeValue(byNewline[0]);
  // otherwise, use first segment before comma
  return normalizeValue(value).split(",")[0]?.trim() || normalizeValue(value);
}

function compactCompanyName(value: string): string {
  let v = firstLine(value);
  // Cut "A UNIT OF ..." and anything after it.
  v = v.replace(/\s+A\s+UNIT\s+OF\b[\s\S]*$/i, "").trim();
  // Remove common legal suffixes (best-effort).
  v = v.replace(/\b(LTD\.?|LIMITED|PVT\.?|PRIVATE|LLP|INC\.?|CORP\.?|CO\.?)\b/gi, "").trim();
  v = v.replace(/\s{2,}/g, " ").trim();
  return v;
}

function cleanMedicineName(raw: string): string {
  let value = normalizeValue(raw);
  value = value
    .replace(/identification\s*code[:\-]?\s*[A-Z0-9]+/gi, " ")
    .replace(/proper and generic name of the drug[:\-]?/gi, " ")
    .replace(/name and proper and generic name of the drug[:\-]?/gi, " ")
    .replace(/\bname and\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const dosageHit = value.match(/[A-Za-z][A-Za-z\s\-]+(?:\d+(?:\.\d+)?\s?(?:mg|ml|mcg|g|%))?(?:\s?(?:tablet|capsule|syrup|drops|injection|ointment|gel))?/i);
  return dosageHit?.[0]?.trim() || value;
}

function normalizeBatchNumber(raw: string): string {
  const cleaned = normalizeValue(raw).replace(/^(batch(?:\s*number)?|lot(?:\s*number)?)[:\-]?\s*/i, "").trim();
  if (!cleaned) return "";
  if (/^(no|n\/a|na|none|unknown)$/i.test(cleaned)) return "";
  const strongToken = cleaned.match(/[A-Z0-9]{4,}(?:[-/][A-Z0-9]{2,})*/i)?.[0] || "";
  return strongToken || cleaned;
}

function pickFirst(values: string[]): string {
  return values.find((v) => v.trim().length > 0) || "";
}

function extractFromBlob(text: string): Record<string, string> {
  const t = text.replace(/\s+/g, " ").trim();
  const patterns: Record<string, RegExp[]> = {
    medicine_name: [
      /product(?: name)?[:\-]?\s*([^|]+?)(?=\s(?:batch|lot|manufacturer|address|mfg|date|license|$))/i,
      /name and proper and generic name of the drug[:\-]?\s*([^|]+?)(?=\s(?:batch|lot|manufacturer|address|mfg|date|license|$))/i,
      /medicine(?: name)?[:\-]?\s*([^|]+?)(?=\s(?:batch|lot|manufacturer|address|mfg|date|license|$))/i,
      /drug[:\-]?\s*([^|]+?)(?=\s(?:batch|lot|manufacturer|address|mfg|date|license|$))/i,
    ],
    manufacturer: [/(?:manufacturer|manufactured by|company)[:\-]?\s*([^|]+?)(?=\s(?:address|mfg|date|batch|license|$))/i],
    batch_number: [/(?:batch(?: number)?|lot(?: number)?)[:\-]?\s*([A-Z0-9\-\/]+)/i],
    mfg_date: [/(?:mfg(?: date)?|manufacturing date)[:\-]?\s*([A-Z0-9\-\/.]+)/i],
    expiry_date: [/(?:exp(?:iry)?(?: date)?|date of expiry)[:\-]?\s*([A-Z0-9\-\/.]+)/i],
    license_number: [/(?:license(?: number)?|lic\.?\s*no\.?)[:\-]?\s*([A-Z0-9\-\/]+)/i],
    address: [/(?:address)[:\-]?\s*([^|]+?)(?=\s(?:license|batch|mfg|exp|scan history|$))/i],
    serial_number: [/(?:serial(?: number)?|unique product identification code)[:\-]?\s*([A-Z0-9\-\/]+)/i],
    scan_history: [/(?:scan history)[:\-]?\s*([0-9]+)/i],
    location: [/(?:location)[:\-]?\s*([^|]+?)(?=\s(?:date|time|$))/i],
    warning_info: [/(?:warning|caution|contraindication|alerts?)[:\-]?\s*([^|]+?)(?=\s(?:location|scan history|$))/i],
  };

  const out: Record<string, string> = {};
  for (const [k, regexes] of Object.entries(patterns)) {
    const v = pickFirst(
      regexes
        .map((r) => r.exec(t)?.[1] || "")
        .map((x) => normalizeValue(x))
        .filter(Boolean)
    );
    if (v) out[k] = v;
  }
  return out;
}

function toCanonicalMap(scan: ScanResponse): Record<string, string> {
  const map: Record<string, string> = { authenticity_status: scan.authenticity_status };
  Object.entries(scan.canonical_fields || {}).forEach(([k, v]) => {
    map[k.toLowerCase()] = normalizeValue(String(v));
  });
  Object.entries(scan.key_values || {}).forEach(([k, v]) => {
    const key = k.toLowerCase().replace(/[^a-z0-9_]+/g, "_");
    if (!map[key] && String(v).trim()) map[key] = normalizeValue(String(v));
  });

  const content = String(scan.key_values?.content || scan.key_values?.visible_text || "");
  if (content) {
    const parsed = extractFromBlob(content);
    Object.entries(parsed).forEach(([k, v]) => {
      if (!map[k]) map[k] = v;
    });
  }

  if (!map.medicine_name) {
    const nameAlt = Object.entries(scan.key_values || {}).find(([k]) =>
      /medicine|product|drug|name|title/i.test(k)
    );
    if (nameAlt) map.medicine_name = normalizeValue(String(nameAlt[1]));
  }

  if (
    !map.medicine_name &&
    scan.source_url &&
    scan.source_type !== "html" &&
    !scan.key_values?.title
  ) {
    const sourceGuess = scan.source_url
      .split("/")
      .pop()
      ?.replace(/[-_]+/g, " ")
      ?.replace(/[^a-zA-Z0-9\s]/g, " ")
      ?.trim();
    if (sourceGuess && sourceGuess.length > 2) {
      map.medicine_name = titleCase(sourceGuess);
    }
  }

  if (!map.medicine_name || /^unknown/i.test(map.medicine_name)) {
    map.medicine_name = scan.medicine_name && !/^unknown/i.test(scan.medicine_name)
      ? scan.medicine_name
      : "Medicine details found";
  }
  map.medicine_name = cleanMedicineName(map.medicine_name);

  if (!map.manufacturer) {
    const manufacturerAlt = Object.entries(scan.key_values || {}).find(([k]) =>
      /manufacturer|company|brand/i.test(k)
    );
    if (manufacturerAlt) map.manufacturer = String(manufacturerAlt[1]);
  }
  // Keep full manufacturer value (name + address) when present.
  if (map.manufacturer) map.manufacturer = normalizeValue(map.manufacturer);

  const batchFromMap = normalizeBatchNumber(map.batch_number || "");
  if (batchFromMap) {
    map.batch_number = batchFromMap;
  } else {
    const blob = content || Object.values(scan.key_values || {}).join(" ");
    const strictBatch =
      blob.match(/(?:batch(?:\s*number)?|lot(?:\s*number)?)\s*[:\-]?\s*([A-Z0-9]{4,}(?:[-/][A-Z0-9]{2,})*)/i)?.[1] ||
      "";
    if (strictBatch) map.batch_number = strictBatch;
  }

  return map;
}

function buildGroups(map: Record<string, string>): DisplayGroup[] {
  return SECTION_RULES.map((section) => {
    const fields = section.keys
      .map((k) => ({
        key: k,
        label: KEY_LABELS[k] || titleCase(k),
        value: map[k] || "",
        icon: section.icon,
      }))
      .filter((f) => f.value);
    return { id: section.id, title: section.title, fields };
  }).filter((g) => g.fields.length > 0);
}

function buildGroupsFromServerSections(scan: ScanResponse): DisplayGroup[] {
  const sections = scan.sections || {};
  // Merge production fields into medicine information; remove verification details.
  const medicineMerged = {
    ...(sections.medicine_information || {}),
    ...(sections.production_details || {}),
  } as Record<string, unknown>;

  const ordered: Array<{ id: string; title: string; icon: FieldIcon; src: Record<string, unknown> }> = [
    { id: "medicine_information", title: "Medicine Information", icon: "pill", src: medicineMerged },
    { id: "manufacturer_details", title: "Manufacturer Details", icon: "factory", src: (sections.manufacturer_details || {}) as Record<string, unknown> },
    { id: "tracking_information", title: "Tracking Information", icon: "map", src: (sections.tracking_information || {}) as Record<string, unknown> },
    { id: "additional_metadata", title: "Additional Metadata", icon: "map", src: (sections.additional_metadata || {}) as Record<string, unknown> },
  ];

  return ordered
    .map((section) => {
      const fields = Object.entries(section.src)
        .filter(([k]) => k !== "address")
        .filter(([, v]) => Boolean(v))
        .slice(0, section.id === "additional_metadata" ? 28 : 12)
        .map(([k, v]) => ({
          key: k,
          label: KEY_LABELS[k] || titleCase(k),
          value: String(v),
          icon: section.icon,
        }));
      return { id: section.id, title: section.title, fields };
    })
    .filter((g) => g.fields.length > 0);
}

function buildGroupsFromStructured(scan: ScanResponse): DisplayGroup[] {
  const s = scan.structured;
  if (!s) return [];

  const medicine = s.medicineInformation || {
    uniqueProductIdentificationCode: "",
    properAndGenericDrugName: "",
    batchNumber: "",
    manufacturingDate: "",
    expiryDate: "",
  };
  const manufacturer = s.manufacturerDetails || {
    manufacturerNameAndAddress: "",
    manufacturingLicenseNumber: "",
  };

  const medicineFields: DisplayField[] = [
    {
      key: "uniqueProductIdentificationCode",
      label: "Unique Product Identification Code",
      value: medicine.uniqueProductIdentificationCode || "",
      icon: "pill" as FieldIcon,
    },
    {
      key: "properAndGenericDrugName",
      label: "Proper and Generic Name of the drug",
      value: medicine.properAndGenericDrugName || "",
      icon: "pill" as FieldIcon,
    },
    {
      key: "batchNumber",
      label: "Batch Number",
      value: medicine.batchNumber || "",
      icon: "pill" as FieldIcon,
    },
    {
      key: "manufacturingDate",
      label: "Date of Manufacturing",
      value: medicine.manufacturingDate || "",
      icon: "pill" as FieldIcon,
    },
    {
      key: "expiryDate",
      label: "Date of Expiry",
      value: medicine.expiryDate || "",
      icon: "pill" as FieldIcon,
    },
  ].filter((f) => Boolean(f.value));

  const manufacturerFields: DisplayField[] = [
    {
      key: "manufacturerNameAndAddress",
      label: "Manufacturer",
      value: manufacturer.manufacturerNameAndAddress
        ? manufacturer.manufacturerNameAndAddress.trim()
        : "",
      icon: "factory" as FieldIcon,
    },
    {
      key: "manufacturingLicenseNumber",
      label: "Manufacturing license number",
      value: manufacturer.manufacturingLicenseNumber || "",
      icon: "factory" as FieldIcon,
    },
  ].filter((f) => Boolean(f.value));

  const groups: DisplayGroup[] = [];
  if (medicineFields.length) {
    groups.push({ id: "medicine_information", title: "Medicine Information", fields: medicineFields });
  }
  if (manufacturerFields.length) {
    groups.push({ id: "manufacturer_details", title: "Manufacturer Details", fields: manufacturerFields });
  }
  return groups;
}

function makeTimeline(map: Record<string, string>): TimelineStep[] {
  const loc = map.location || "Unknown location";
  const scans = Number(map.scan_history || "0");
  return [
    { stage: "Factory", location: map.manufacturer || "Manufacturer", time: map.mfg_date || "Unknown", status: "done" },
    { stage: "Distributor", location: loc, time: "In transit", status: scans > 0 ? "done" : "unknown" },
    { stage: "Pharmacy", location: loc, time: map.expiry_date || "Unknown", status: scans > 1 ? "active" : "unknown" },
    { stage: "User", location: "Current scan device", time: new Date().toLocaleString(), status: "active" },
  ];
}

export function buildVerificationView(scan: ScanResponse) {
  const canonical = toCanonicalMap(scan);
  const structuredGroups = buildGroupsFromStructured(scan);
  const dynamicGroups = buildGroupsFromServerSections(scan);
  return {
    groups: structuredGroups.length ? structuredGroups : dynamicGroups.length ? dynamicGroups : buildGroups(canonical),
    timeline: makeTimeline(canonical),
    manufacturer: canonical.manufacturer || "Unknown manufacturer",
    batch: canonical.batch_number || "N/A",
    cleaned: canonical,
  };
}
