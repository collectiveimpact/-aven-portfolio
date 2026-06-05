// Yardi ETL table catalog + column mapping.
//
// Column candidates are confirmed against REAL WoodGreen/SHIP/AIS ETL exports
// (ETL_Common_CommUnits, ETL_IntRes_Tenants, ETL_MaintWorkOrders*). Yardi ETL
// files carry a table-name MARKER on row 1 — we detect by that first.

export type TargetEntity = "property" | "resident" | "work_order";

export interface FieldMap {
  target: string;
  sources: string[];        // candidate headers, first non-empty wins (case-insensitive)
  required?: boolean;
  transform?: (raw: string) => string | number | null;
}

export interface TableDef {
  key: string;
  label: string;
  entity: TargetEntity;
  markers: string[];        // ETL marker-row values that identify this table
  filenameMatch: RegExp;    // fallback detection by filename
  externalIdFrom: string[];
  fields: FieldMap[];
  // CommUnits is unit-level (many rows per property). Aggregate rows that share
  // the same external_id (Property_Code) into one property, counting units.
  aggregate?: { countInto: string };
}

const toInt = (v: string): number | null => {
  const n = parseInt(v.replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

// Yardi priority (text or 1..4) → Fuse5 enum
export const normPriority = (v: string): string => {
  const s = v.trim().toLowerCase();
  if (!s) return "medium";
  if (/(emerg|urgent|^1$|p1)/.test(s)) return "urgent";
  if (/(high|^2$|p2)/.test(s)) return "high";
  if (/(low|^4$|p4)/.test(s)) return "low";
  return "medium";
};

// Yardi WO status → Fuse5 enum
export const normWoStatus = (v: string): string => {
  const s = v.trim().toLowerCase();
  if (/(complete|closed|done|resolv|finish)/.test(s)) return "resolved";
  if (/(progress|assign|dispatch|active|wip|in.?work)/.test(s)) return "in_progress";
  return "open";
};

// Yardi tenant Status is numeric: 0=Current/Active. 3=Past, plus text variants.
export const normResStatus = (v: string): string => {
  const s = v.trim().toLowerCase();
  if (s === "" || s === "0" || /current|active/.test(s)) return "active";
  if (s === "3" || /past|former|moved|evict|cancel|terminat|inactive/.test(s)) return "moved_out";
  return "active";
};

export const normLanguage = (v: string): string => {
  const s = v.trim().toLowerCase();
  if (!s) return "en";
  if (/^fr|fren|fran/.test(s)) return "fr";
  if (/^es|span|espa/.test(s)) return "es";
  if (/^zh|chin|mandarin|canton/.test(s)) return "zh";
  return /^en|eng/.test(s) ? "en" : s.slice(0, 2);
};

export const TABLES: TableDef[] = [
  {
    key: "units",
    label: "Properties / Units",
    entity: "property",
    markers: ["CommUnits"],
    filenameMatch: /(commun|_units|\bunits\b)/i,
    externalIdFrom: ["Property_Code"],
    aggregate: { countInto: "units" },
    fields: [
      // building name (Address_1 holds "Bathurst Building"), fall back to codes
      { target: "name", sources: ["Address_1", "Property_Name", "Bldg_Code", "Property_Code"], required: true },
      { target: "address", sources: ["Address_2", "Address_1"] },
      { target: "external_id", sources: ["Property_Code", "Ref_Property_Id"], required: true },
    ],
  },
  {
    key: "residents",
    label: "Residents / Tenants",
    entity: "resident",
    markers: ["IntResTenants"],
    filenameMatch: /(tenant|resident|intres)/i,
    externalIdFrom: ["Tenant_Code", "Ext_Ref_Tenant_Id"],
    fields: [
      { target: "name", sources: ["Tenant_Name", "Name"] },     // usually absent → derived from first/last
      { target: "first_name", sources: ["First_Name"] },
      { target: "last_name", sources: ["Last_Name"] },
      { target: "unit", sources: ["Unit_Code", "Unit"] },
      { target: "email", sources: ["Email", "Email_Address"] },
      { target: "phone", sources: ["Phone_Number_1", "Phone_Number_2", "Phone", "Cell"] },
      { target: "language", sources: ["Language", "Preferred_Language"], transform: normLanguage },
      { target: "status", sources: ["Status", "MovedOut", "Move_Out_Date"], transform: normResStatus },
      { target: "moved_out", sources: ["Move_Out_Date", "MovedOut"] }, // derive override
      { target: "property_code", sources: ["Property_Code"] },
      { target: "external_id", sources: ["Tenant_Code", "Ext_Ref_Tenant_Id"], required: true },
    ],
  },
  {
    key: "workorders",
    label: "Work Orders",
    entity: "work_order",
    markers: ["MaintWorkOrders", "MaintWorkOrderTemplates", "MaintRecurringWorkOrders"],
    filenameMatch: /(workorder|work[ _]order|maintwork)/i,
    externalIdFrom: ["Code", "WONumber"],
    fields: [
      { target: "title", sources: ["BriefDescription", "Brief_Description", "BriefDesc", "ProblemDescription", "Description"], required: true },
      { target: "unit", sources: ["Unit_Code", "Unit"] },
      { target: "category", sources: ["Category", "CategoryInDetail", "Maint_Category"] },
      { target: "priority", sources: ["Priority"], transform: normPriority },
      { target: "status", sources: ["Status", "WorkOrderStatus"], transform: normWoStatus },
      { target: "property_code", sources: ["PropertyCode", "Property_Code"] },
      { target: "external_id", sources: ["Code", "WONumber", "WorkOrderNumber"], required: true },
    ],
  },
];

// Markers we recognize but do NOT import (no matching Fuse5 entity yet).
export const IGNORED_MARKERS: Record<string, string> = {
  IntResUnitTypeDetails: "Unit-type charge setup (RGI/market rent/parking) — reference data, not imported.",
};

export function pick(row: Record<string, string>, headerIndex: Map<string, string>, sources: string[]): string {
  for (const s of sources) {
    const actual = headerIndex.get(s.toLowerCase());
    if (actual !== undefined) {
      const v = row[actual];
      if (v !== undefined && v !== "") return v;
    }
  }
  return "";
}

export function detectTable(marker: string | null, filename: string, headers: string[]): TableDef | null {
  if (marker) {
    const byMarker = TABLES.find((t) => t.markers.some((m) => m.toLowerCase() === marker.toLowerCase()));
    if (byMarker) return byMarker;
  }
  const byName = TABLES.find((t) => t.filenameMatch.test(filename));
  if (byName) return byName;
  const lower = new Set(headers.map((h) => h.toLowerCase()));
  let best: { t: TableDef; score: number } | null = null;
  for (const t of TABLES) {
    let score = 0;
    for (const f of t.fields) for (const s of f.sources) if (lower.has(s.toLowerCase())) { score++; break; }
    if (!best || score > best.score) best = { t, score };
  }
  return best && best.score >= 2 ? best.t : null;
}
