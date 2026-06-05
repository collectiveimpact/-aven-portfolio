// Tabular parser for Yardi ETL uploads.
//
// Yardi ETL exports carry a TABLE-NAME MARKER on row 1 (e.g. "CommUnits",
// "IntResTenants", "MaintWorkOrderTemplates") with the real column HEADERS on
// row 2. We detect that and expose the marker (it's the best table detector).
//
// CSV is parsed natively (zero deps). .xls/.xlsx use SheetJS IF installed —
// loaded at runtime via createRequire so the bundler never resolves it (keeps
// `next build` green when the dep is absent). Enable Excel: `pnpm add xlsx`.

import { createRequire } from "node:module";

export interface ParsedTable {
  marker: string | null;          // ETL table-name marker row, if present
  headers: string[];
  rows: Record<string, string>[];
  format: "csv" | "xlsx";
}
export type ParseResult = ({ ok: true } & ParsedTable) | { ok: false; error: string };

// --- CSV → matrix (handles quotes, embedded commas/newlines) --------------
function csvToMatrix(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const out: string[][] = [];
  let field = "", row: string[] = [], inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); out.push(row); field = ""; row = [];
    } else field += c;
  }
  if (field !== "" || row.length) { row.push(field); out.push(row); }
  return out;
}

// --- Excel → matrix (optional SheetJS) -----------------------------------
function loadSheetJs(): unknown | null {
  try { return createRequire(import.meta.url)("xlsx"); } catch { return null; }
}
function xlsxToMatrix(buf: Buffer): string[][] | null {
  const xlsx = loadSheetJs() as
    | { read: (d: Buffer, o: object) => { SheetNames: string[]; Sheets: Record<string, unknown> };
        utils: { sheet_to_json: (s: unknown, o: object) => unknown[][] } }
    | null;
  if (!xlsx) return null;
  const wb = xlsx.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const aoa = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
  return aoa.map((r) => (r as unknown[]).map((c) => String(c ?? "")));
}

// A marker row = exactly one non-empty cell, with the NEXT row looking like
// headers (≥3 non-empty cells).
function nonEmpty(row: string[]): number { return row.filter((c) => c.trim() !== "").length; }

function matrixToTable(matrix: string[][], format: "csv" | "xlsx"): ParseResult {
  // drop fully-blank leading rows
  let m = matrix.filter((r) => r.some((c) => c.trim() !== ""));
  if (!m.length) return { ok: false, error: "File is empty." };

  let marker: string | null = null;
  if (m.length >= 2 && nonEmpty(m[0]) === 1 && nonEmpty(m[1]) >= 3) {
    marker = (m[0].find((c) => c.trim() !== "") ?? "").trim();
    m = m.slice(1);
  }
  const headers = m[0].map((h) => h.trim());
  if (nonEmpty(headers) < 1) return { ok: false, error: "No header row found." };

  const rows = m.slice(1)
    .filter((rec) => rec.some((c) => c.trim() !== ""))
    .map((rec) => {
      const o: Record<string, string> = {};
      headers.forEach((h, idx) => { if (h) o[h] = (rec[idx] ?? "").trim(); });
      return o;
    });
  return { ok: true, marker, headers, rows, format };
}

export function parseTable(filename: string, data: Buffer): ParseResult {
  const lower = filename.toLowerCase();
  try {
    if (lower.endsWith(".csv")) return matrixToTable(csvToMatrix(data.toString("utf-8")), "csv");
    if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
      const m = xlsxToMatrix(data);
      if (!m) return { ok: false, error: "Excel parsing needs the optional 'xlsx' package. Run `pnpm add xlsx`, or re-save as CSV." };
      return matrixToTable(m, "xlsx");
    }
    return { ok: false, error: `Unsupported file type: ${filename}. Upload .csv, .xls, or .xlsx.` };
  } catch (e) {
    return { ok: false, error: `Could not parse file: ${(e as Error).message}` };
  }
}
