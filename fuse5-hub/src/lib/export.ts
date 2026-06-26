// Reusable, dependency-free export utilities (CSV + PDF-via-print + templates).
//
// Everything here is client-safe: CSV is built with plain string ops, downloads
// use Blob + a transient anchor, and "PDF" is produced by opening a clean print
// window styled for paper and letting the browser's print dialog "Save as PDF".
// No external libraries, no Node APIs — safe to import into any "use client"
// component. Guards on `window`/`document` keep it inert during SSR.

export type CsvCell = string | number | boolean | null | undefined;

/** A column descriptor for CSV export. `key` indexes the row; `header` is the
 *  column title (defaults to the key). Pass a `format` to stringify a value. */
export interface CsvColumn {
  key: string;
  header?: string;
  format?: (value: unknown, row: Record<string, unknown>) => CsvCell;
}

/** Escape a single CSV field per RFC 4180: wrap in quotes when it contains a
 *  comma, quote, CR or LF, and double any embedded quotes. */
function escapeCsvField(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Resolve the column set: explicit columns win; otherwise derive the union of
 *  keys across all rows (stable first-seen order). */
function resolveColumns(
  rows: Record<string, unknown>[],
  columns?: (CsvColumn | string)[],
): CsvColumn[] {
  if (columns && columns.length) {
    return columns.map((c) => (typeof c === "string" ? { key: c } : c));
  }
  const seen = new Set<string>();
  const out: CsvColumn[] = [];
  for (const row of rows) {
    for (const k of Object.keys(row)) {
      if (!seen.has(k)) {
        seen.add(k);
        out.push({ key: k });
      }
    }
  }
  return out;
}

/**
 * Convert an array of row objects into an RFC-4180 CSV string.
 * - `columns` may be column descriptors or bare key strings; if omitted, the
 *   union of keys across rows is used.
 * - Commas, quotes and newlines inside values are escaped correctly.
 */
export function toCSV(
  rows: Record<string, unknown>[],
  columns?: (CsvColumn | string)[],
): string {
  const cols = resolveColumns(rows, columns);
  const headerLine = cols.map((c) => escapeCsvField(c.header ?? c.key)).join(",");
  const body = rows.map((row) =>
    cols
      .map((c) => {
        const raw = row[c.key];
        const cell = c.format ? c.format(raw, row) : (raw as CsvCell);
        return escapeCsvField(cell);
      })
      .join(","),
  );
  return [headerLine, ...body].join("\r\n");
}

/**
 * Trigger a browser download of arbitrary content via a Blob + transient anchor.
 * No-op during SSR. Returns true when the download was initiated.
 */
export function downloadBlob(
  filename: string,
  content: string | Blob,
  mime = "text/plain;charset=utf-8",
): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke on the next tick so the click has a chance to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

/**
 * Build a CSV from rows and download it. A `.csv` extension is appended if the
 * filename doesn't already carry one. A UTF-8 BOM is prepended so Excel opens
 * accented text correctly.
 */
export function downloadCSV(
  filename: string,
  rows: Record<string, unknown>[],
  columns?: (CsvColumn | string)[],
): boolean {
  const name = filename.toLowerCase().endsWith(".csv") ? filename : `${filename}.csv`;
  const csv = toCSV(rows, columns);
  return downloadBlob(name, `﻿${csv}`, "text/csv;charset=utf-8");
}

/** Minimal, print-optimised stylesheet shared by the PDF window. */
const PRINT_STYLES = `
  *{box-sizing:border-box}
  body{font:13px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:#111;margin:0;padding:40px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  h1{font-size:19px;margin:0 0 2px}
  h2{font-size:13px;color:#555;font-weight:600;margin:0 0 22px}
  table{border-collapse:collapse;width:100%;margin:0 0 18px}
  th,td{text-align:left;padding:7px 12px 7px 0;vertical-align:top}
  thead th{border-bottom:2px solid #222;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#444}
  tbody tr{border-bottom:1px solid #e5e5e5}
  td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
  .f5-pdf-meta{margin-top:26px;font-size:11px;color:#888;border-top:1px solid #ddd;padding-top:10px}
  @page{margin:18mm}
  @media print{body{padding:0}}
`;

/**
 * Open a clean print window and invoke the browser print dialog, where the user
 * can choose "Save as PDF". Accepts either:
 *  - an element id (the element's outerHTML is captured), or
 *  - a raw HTML string (anything not matching a DOM element id is treated as HTML).
 * `title` becomes the document title (and the default PDF filename).
 *
 * Returns true if a print window was opened, false otherwise (SSR or popup blocked).
 */
export function printToPDF(elementIdOrHtml: string, title = "Report"): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") return false;

  let inner = elementIdOrHtml;
  // Treat a value that resolves to a live element id as an element reference;
  // otherwise assume the caller passed raw HTML.
  const looksLikeId = /^[\w-]+$/.test(elementIdOrHtml);
  if (looksLikeId) {
    const el = document.getElementById(elementIdOrHtml);
    if (el) inner = el.outerHTML;
  }

  const w = window.open("", "_blank", "width=820,height=1000");
  if (!w) return false;

  const safeTitle = String(title).replace(/[<>]/g, "");
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title>` +
      `<style>${PRINT_STYLES}</style></head><body>${inner}` +
      `<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},60);};<\/script>` +
      `</body></html>`,
  );
  w.document.close();
  return true;
}

/**
 * Download a bulk-import template CSV: a header row plus one example/placeholder
 * row so users see the expected shape. `example` may be supplied; if omitted the
 * example cells are derived from the headers ("e.g. <header>").
 */
export function downloadTemplateCSV(
  headers: string[],
  filename: string,
  example?: CsvCell[],
): boolean {
  const name = filename.toLowerCase().endsWith(".csv") ? filename : `${filename}.csv`;
  const exampleRow = (example && example.length
    ? example
    : headers.map((h) => `e.g. ${h}`)
  ).slice(0, headers.length);
  const csv = [
    headers.map(escapeCsvField).join(","),
    exampleRow.map(escapeCsvField).join(","),
  ].join("\r\n");
  return downloadBlob(name, `﻿${csv}`, "text/csv;charset=utf-8");
}

/** Convenience: a safe, timestamped filename stem from a label, e.g.
 *  `slugifyFilename("Delivery by Channel")` → "delivery-by-channel-2026-06-26". */
export function slugifyFilename(label: string, withDate = true): string {
  const base = label
    .toLowerCase()
    .replace(/[^\w]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "export";
  if (!withDate) return base;
  const d = new Date().toISOString().slice(0, 10);
  return `${base}-${d}`;
}
