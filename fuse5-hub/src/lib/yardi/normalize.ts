// Turn a parsed ETL table into validated, Fuse5-shaped records.

import { TABLES, IGNORED_MARKERS, detectTable, pick, type TableDef, type TargetEntity } from "./tables";

export interface NormalizedRecord {
  externalId: string;
  fields: Record<string, string | number | null>;
  propertyCode?: string;
  rowNum: number;
}
export interface RowError { rowNum: number; problems: string[] }

export interface NormalizeResult {
  ok: boolean;
  error?: string;
  tableKey?: string;
  tableLabel?: string;
  entity?: TargetEntity;
  records: NormalizedRecord[];
  rowErrors: RowError[];
  warnings: string[];
  detectedByMarker?: boolean;
}

const HELPER_FIELDS = new Set(["first_name", "last_name", "property_code", "external_id", "moved_out"]);

export function normalizeUpload(
  marker: string | null,
  filename: string,
  headers: string[],
  rows: Record<string, string>[],
  forceTableKey?: string,
): NormalizeResult {
  // Recognized-but-unsupported ETL tables get a clear message, not a bad guess.
  if (marker && IGNORED_MARKERS[marker]) {
    return { ok: false, error: `"${marker}": ${IGNORED_MARKERS[marker]}`, records: [], rowErrors: [], warnings: [] };
  }

  const table: TableDef | null = forceTableKey
    ? TABLES.find((t) => t.key === forceTableKey) ?? null
    : detectTable(marker, filename, headers);

  if (!table) {
    return {
      ok: false,
      error: marker
        ? `Unrecognized ETL table "${marker}". Supported: Units, Tenants, Work Orders.`
        : "Couldn't identify the Yardi table. Keep the ETL marker row, name the file like the export, or pick the type manually.",
      records: [], rowErrors: [], warnings: [],
    };
  }

  const headerIndex = new Map(headers.map((h) => [h.toLowerCase(), h]));
  const warnings: string[] = [];
  for (const f of table.fields) {
    if (!f.required) continue;
    if (!f.sources.some((s) => headerIndex.has(s.toLowerCase())))
      warnings.push(`No column found for "${f.target}" (looked for: ${f.sources.slice(0, 3).join(", ")}…).`);
  }

  let records: NormalizedRecord[] = [];
  const rowErrors: RowError[] = [];

  rows.forEach((row, i) => {
    const rowNum = i + 2;
    const fields: Record<string, string | number | null> = {};
    let propertyCode: string | undefined;
    let externalId = "";
    const problems: string[] = [];

    for (const f of table.fields) {
      const raw = pick(row, headerIndex, f.sources);
      const val = f.transform ? f.transform(raw) : raw;
      if (f.target === "external_id") { externalId = String(val ?? "").trim(); continue; }
      if (f.target === "property_code") { propertyCode = String(val ?? "").trim() || undefined; continue; }
      if (HELPER_FIELDS.has(f.target)) { fields[`_${f.target}`] = val; continue; }
      if (f.required && (val === "" || val === null)) problems.push(`missing ${f.target}`);
      fields[f.target] = val === "" ? null : val;
    }

    // resident name from first/last
    if (table.entity === "resident" && (!fields.name || fields.name === null)) {
      const combined = `${(fields["_first_name"] as string) || ""} ${(fields["_last_name"] as string) || ""}`.trim();
      if (combined) fields.name = combined;
    }
    // moved-out override: a move-out date/flag wins over a stale status code
    if (table.entity === "resident") {
      const mo = (fields["_moved_out"] as string) || "";
      if (mo && mo !== "0" && mo.toLowerCase() !== "false") fields.status = "moved_out";
    }
    for (const k of Object.keys(fields)) if (k.startsWith("_")) delete fields[k];

    for (const f of table.fields) {
      if (!f.required || HELPER_FIELDS.has(f.target) || f.target === "external_id" || f.target === "property_code") continue;
      const v = fields[f.target];
      if ((v === "" || v === null || v === undefined) && !problems.includes(`missing ${f.target}`)) problems.push(`missing ${f.target}`);
    }
    if (!externalId) problems.push("missing external id (Yardi code)");

    if (problems.length) rowErrors.push({ rowNum, problems });
    else records.push({ externalId, fields, propertyCode, rowNum });
  });

  // CommUnits → one property per Property_Code, units = row count
  if (table.aggregate && records.length) {
    const groups = new Map<string, NormalizedRecord[]>();
    for (const r of records) (groups.get(r.externalId) ?? groups.set(r.externalId, []).get(r.externalId)!).push(r);
    records = [...groups.values()].map((recs) => {
      const base = recs[0];
      base.fields[table.aggregate!.countInto] = recs.length;
      return base;
    });
  }

  return {
    ok: true,
    tableKey: table.key, tableLabel: table.label, entity: table.entity,
    records, rowErrors, warnings,
    detectedByMarker: !!marker && table.markers.some((m) => m.toLowerCase() === marker.toLowerCase()),
  };
}
