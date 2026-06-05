"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { previewImport, commitImport, type ImportPreview, type ImportResult } from "./import-actions";

const ENTITY_OPTIONS = [
  { key: "", label: "Auto-detect from file" },
  { key: "units", label: "Properties / Units" },
  { key: "residents", label: "Residents / Tenants" },
  { key: "workorders", label: "Work Orders" },
];

const TEMPLATES = [
  { key: "units", label: "Units" },
  { key: "residents", label: "Residents" },
  { key: "workorders", label: "Work Orders" },
];

export function YardiImport() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [tableKey, setTableKey] = useState("");
  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setPreview(null); setResult(null); setFileName("");
    if (fileRef.current) fileRef.current.value = "";
  }
  function close() {
    if (result?.ok) router.refresh();
    setOpen(false); reset(); setTableKey("");
  }
  function formData() {
    const f = fileRef.current?.files?.[0];
    if (!f) return null;
    const fd = new FormData();
    fd.append("file", f);
    if (tableKey) fd.append("tableKey", tableKey);
    return fd;
  }
  function doPreview() {
    const fd = formData();
    if (!fd) { setPreview({ ok: false, error: "Choose a file first.", total: 0, willInsert: 0, willUpdate: 0, invalid: 0, unmatchedProperties: 0, warnings: [], rowErrors: [], sample: [] }); return; }
    setResult(null);
    startTransition(async () => setPreview(await previewImport(fd)));
  }
  function doCommit() {
    const fd = formData();
    if (!fd) return;
    startTransition(async () => setResult(await commitImport(fd)));
  }

  if (!open) return <button className="f5-btn" onClick={() => setOpen(true)}>⇪ Import from Yardi</button>;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }} onClick={close}>
      <div className="f5-card" style={{ width: 680, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
        <div className="f5-section-title" style={{ margin: 0 }}>Import from Yardi</div>
        <div className="f5-page-sub" style={{ marginTop: 4 }}>
          Upload a Yardi ETL export (Units, Residents/Tenants, or Work Orders). CSV works now; .xls/.xlsx need the optional <code>xlsx</code> package. Re-importing the same export updates rows by their Yardi code — no duplicates.
        </div>

        <label className="f5-label">Templates</label>
        <div className="f5-chips">
          {TEMPLATES.map((t) => (
            <a key={t.key} className="f5-chip" href={`/api/yardi-template?table=${t.key}`}>⬇ {t.label}.csv</a>
          ))}
        </div>

        <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
          <div>
            <label className="f5-label">Data type</label>
            <select className="f5-select" value={tableKey} onChange={(e) => { setTableKey(e.target.value); setPreview(null); }}>
              {ENTITY_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="f5-label">File</label>
            <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" className="f5-input"
              onChange={(e) => { setFileName(e.target.files?.[0]?.name ?? ""); setPreview(null); setResult(null); }} />
          </div>
        </div>

        {/* Preview */}
        {preview && !preview.ok && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{preview.error}</div>}
        {preview?.ok && (
          <div style={{ marginTop: 14 }}>
            <div className="f5-section-title" style={{ marginTop: 0 }}>Preview — {preview.tableLabel}</div>
            <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              <div className="f5-card" style={{ background: "var(--f5-surface-2)" }}><div className="f5-kpi-label">New</div><div className="f5-kpi-value">{preview.willInsert}</div></div>
              <div className="f5-card" style={{ background: "var(--f5-surface-2)" }}><div className="f5-kpi-label">Update</div><div className="f5-kpi-value">{preview.willUpdate}</div></div>
              <div className="f5-card" style={{ background: "var(--f5-surface-2)" }}><div className="f5-kpi-label">Skipped</div><div className="f5-kpi-value f5-down">{preview.invalid}</div></div>
              <div className="f5-card" style={{ background: "var(--f5-surface-2)" }}><div className="f5-kpi-label">Unlinked</div><div className="f5-kpi-value f5-warn">{preview.unmatchedProperties}</div></div>
            </div>
            {preview.warnings.map((w, i) => <div key={i} style={{ color: "var(--f5-amber, #d9a441)", fontSize: 12, marginTop: 6 }}>⚠ {w}</div>)}
            {preview.unmatchedProperties > 0 && <div style={{ color: "var(--f5-amber, #d9a441)", fontSize: 12, marginTop: 6 }}>⚠ {preview.unmatchedProperties} row(s) reference a property not yet in Fuse5 — import Units first to link them.</div>}
            {preview.rowErrors.length > 0 && (
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--f5-text-secondary)" }}>
                <strong>Skipped rows:</strong>
                {preview.rowErrors.map((e) => <div key={e.rowNum}>Row {e.rowNum}: {e.problems.join(", ")}</div>)}
              </div>
            )}
            {preview.sample.length > 0 && (
              <div className="f5-card" style={{ padding: 0, marginTop: 10, overflowX: "auto" }}>
                <table className="f5-table">
                  <thead><tr>{Object.keys(preview.sample[0]).map((k) => <th key={k}>{k}</th>)}</tr></thead>
                  <tbody>{preview.sample.map((r, i) => <tr key={i}>{Object.keys(preview.sample[0]).map((k) => <td key={k}>{String(r[k] ?? "")}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Result */}
        {result && !result.ok && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{result.error}</div>}
        {result?.ok && (
          <div className="f5-card" style={{ marginTop: 12, background: "var(--f5-surface-2)" }}>
            ✅ Imported — <strong>{result.inserted}</strong> added, <strong>{result.updated}</strong> updated{result.invalid ? `, ${result.invalid} skipped` : ""}.
          </div>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {!result?.ok && <button className="f5-btn" disabled={pending} onClick={doPreview}>{pending && !preview ? "Reading…" : "Preview"}</button>}
          {preview?.ok && !result?.ok && (preview.willInsert + preview.willUpdate > 0) && (
            <button className="f5-btn primary" disabled={pending} onClick={doCommit}>
              {pending ? "Importing…" : `Import ${preview.willInsert + preview.willUpdate} row(s)`}
            </button>
          )}
          <button className="f5-btn" onClick={close}>{result?.ok ? "Done" : "Cancel"}</button>
        </div>
      </div>
    </div>
  );
}
