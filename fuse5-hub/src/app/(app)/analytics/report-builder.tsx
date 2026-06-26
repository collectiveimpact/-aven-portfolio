"use client";

// Custom Reports tab — pick metrics + date range + property, preview, and
// export the result as clean copyable/printable correspondence. Report
// definitions persist to localStorage (DB follow-up noted in metrics.ts).

import { useEffect, useMemo, useRef, useState } from "react";
import { downloadCSV, printToPDF, slugifyFilename } from "@/lib/export";
import {
  METRIC_REGISTRY,
  formatMetric,
  metricByKey,
  loadSavedReports,
  persistSavedReports,
  type SavedReport,
  type MetricGroup,
  DATE_RANGES,
  PROPERTY_OPTIONS,
} from "./metrics";

const GROUPS: MetricGroup[] = ["Deliverability", "Engagement", "Signage", "Audience", "Compliance"];

// Live values override the demo figures where available (delivery rate, sent…).
export interface LiveOverrides {
  sent?: number;
  delivered?: number;
  deliveryRate?: number;
  proofOfPlay?: number;
  acknowledgements?: number;
}

function uid(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function ReportBuilder({
  orgName,
  live,
  liveSource,
}: {
  orgName: string;
  live: LiveOverrides;
  liveSource: "live" | "demo";
}) {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(["sent", "deliveryRate", "openRate", "proofOfPlay"]),
  );
  const [range, setRange] = useState("Month");
  const [property, setProperty] = useState("All properties");
  const [name, setName] = useState("Monthly Correspondence Summary");
  const [saved, setSaved] = useState<SavedReport[]>([]);
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState("");
  const previewRef = useRef<HTMLDivElement>(null);

  function flash(msg: string) {
    setExported(msg);
    setTimeout(() => setExported(""), 1800);
  }

  useEffect(() => {
    setSaved(loadSavedReports());
  }, []);

  const toggle = (key: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const rows = useMemo(() => {
    return METRIC_REGISTRY.filter((m) => selected.has(m.key)).map((m) => {
      const liveVal = (live as Record<string, number | undefined>)[m.key];
      const value = liveVal ?? m.demo;
      return {
        key: m.key,
        label: m.label,
        group: m.group,
        display: formatMetric(value, m.format),
        isLive: liveVal !== undefined,
      };
    });
  }, [selected, live]);

  const generatedAt = useMemo(
    () => new Date().toLocaleString("en-CA", { dateStyle: "medium", timeStyle: "short" }),
    [],
  );

  function plainText(): string {
    const lines = [
      orgName,
      `Communications Report — ${range}`,
      property !== "All properties" ? `Property: ${property}` : "Scope: All properties",
      "",
    ];
    let lastGroup = "";
    for (const r of rows) {
      if (r.group !== lastGroup) {
        lines.push(`${r.group}`);
        lastGroup = r.group;
      }
      lines.push(`  ${r.label.padEnd(26)} ${r.display}`);
    }
    lines.push("");
    lines.push(`Generated ${generatedAt} · Fuse5 Hub · Source: ${liveSource === "live" ? "live logs" : "representative data"}`);
    return lines.join("\n");
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(plainText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  // Export the assembled report's metric rows as CSV (one row per metric).
  function exportCSV() {
    if (rows.length === 0) return;
    const data = rows.map((r) => ({
      group: r.group,
      metric: r.label,
      value: r.display,
      source: r.isLive ? "live" : "representative",
    }));
    downloadCSV(
      slugifyFilename(name || "communications-report"),
      data,
      [
        { key: "group", header: "Group" },
        { key: "metric", header: "Metric" },
        { key: "value", header: "Value" },
        { key: "source", header: "Source" },
      ],
    );
    flash("✓ CSV downloaded");
  }

  // Export the report preview as a clean print → Save-as-PDF window.
  function exportPDF() {
    if (rows.length === 0) return;
    const body = rows
      .map(
        (r) =>
          `<tr><td>${r.label}${r.isLive ? "" : " <span style=\"color:#999;font-size:11px\">(demo)</span>"}</td><td class="num">${r.display}</td></tr>`,
      )
      .join("");
    const html = `<h1>${orgName}</h1>
      <h2>Communications Report — ${range}${property !== "All properties" ? ` · ${property}` : ""}</h2>
      <table><thead><tr><th>Metric</th><th class="num">Value</th></tr></thead><tbody>${body}</tbody></table>
      <div class="f5-pdf-meta">Generated ${generatedAt} · Fuse5 Hub · Source: ${liveSource === "live" ? "live logs" : "representative data"}</div>`;
    printToPDF(html, name || "Communications Report");
    flash("✓ Opened print dialog");
  }

  function saveReport() {
    const def: SavedReport = {
      id: uid(),
      name: name.trim() || "Untitled report",
      metrics: [...selected],
      range,
      property,
      createdAt: new Date().toISOString(),
    };
    const next = [def, ...saved].slice(0, 20);
    setSaved(next);
    persistSavedReports(next);
  }

  function loadReport(r: SavedReport) {
    setSelected(new Set(r.metrics));
    setRange(r.range);
    setProperty(r.property);
    setName(r.name);
    previewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function deleteReport(id: string) {
    const next = saved.filter((r) => r.id !== id);
    setSaved(next);
    persistSavedReports(next);
  }

  const dim = "var(--f5-text-muted)";

  return (
    <>
      <div className="f5-grid" style={{ gridTemplateColumns: "minmax(0,1.1fr) minmax(0,0.9fr)", marginTop: 18, alignItems: "start" }}>
        {/* Builder */}
        <div className="f5-card">
          <div className="f5-section-title" style={{ margin: "0 0 10px" }}>Report Builder</div>

          <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <label className="f5-label">Report name</label>
              <input className="f5-input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="f5-label">Date range</label>
              <select className="f5-select" value={range} onChange={(e) => setRange(e.target.value)}>
                {DATE_RANGES.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="f5-label">Property</label>
              <select className="f5-select" value={property} onChange={(e) => setProperty(e.target.value)}>
                {PROPERTY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <label className="f5-label" style={{ marginTop: 14, display: "block" }}>Metrics ({selected.size} selected)</label>
          {GROUPS.map((g) => (
            <div key={g} style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: dim, marginBottom: 6 }}>{g}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {METRIC_REGISTRY.filter((m) => m.group === g).map((m) => (
                  <span
                    key={m.key}
                    className={`f5-chip${selected.has(m.key) ? " active" : ""}`}
                    onClick={() => toggle(m.key)}
                    style={{ fontSize: 12 }}
                    title={`Source: ${m.source}`}
                  >
                    {selected.has(m.key) ? "✓ " : ""}{m.label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Preview / correspondence */}
        <div className="f5-card" ref={previewRef}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
            <div className="f5-section-title" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              Preview
              {exported && <span style={{ fontSize: 11, fontWeight: 600, color: "var(--f5-green)" }}>{exported}</span>}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button className="f5-btn" type="button" style={{ fontSize: 12, padding: "5px 10px" }} onClick={copyReport}>{copied ? "✓ Copied" : "Copy"}</button>
              <button className="f5-btn" type="button" style={{ fontSize: 12, padding: "5px 10px" }} onClick={exportCSV} disabled={rows.length === 0}>Export CSV</button>
              <button className="f5-btn" type="button" style={{ fontSize: 12, padding: "5px 10px" }} onClick={exportPDF} disabled={rows.length === 0}>Export PDF</button>
              <button className="f5-btn primary" type="button" style={{ fontSize: 12, padding: "5px 10px" }} onClick={saveReport}>Save</button>
            </div>
          </div>

          <div style={{ border: "1px solid var(--f5-border)", borderRadius: "var(--f5-radius-sm)", padding: 16, background: "var(--f5-surface-2)" }}>
            <div style={{ fontWeight: 700, color: "var(--f5-text)" }}>{orgName}</div>
            <div style={{ fontSize: 12, color: dim, marginBottom: 12 }}>
              Communications Report — {range}{property !== "All properties" ? ` · ${property}` : ""}
            </div>
            {rows.length === 0 ? (
              <div style={{ fontSize: 13, color: dim }}>Select metrics to build the report.</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key}>
                      <td style={{ padding: "5px 0", fontSize: 13, color: "var(--f5-text-secondary)" }}>
                        {r.label}
                        {!r.isLive && <span style={{ fontSize: 10, color: dim, marginLeft: 6 }}>(demo)</span>}
                      </td>
                      <td style={{ padding: "5px 0", fontSize: 14, fontWeight: 700, color: "var(--f5-text)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {r.display}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ fontSize: 11, color: dim, marginTop: 14, borderTop: "1px solid var(--f5-border)", paddingTop: 10 }}>
              Generated {generatedAt} · Source: {liveSource === "live" ? "live logs" : "representative data"}
            </div>
          </div>

          <a className="f5-btn" href="/analytics/audit-report" target="_blank" rel="noopener" style={{ marginTop: 12, fontSize: 12 }}>
            ⬇ Download formal Audit PDF
          </a>
        </div>
      </div>

      {/* Saved reports */}
      <div className="f5-section-title">Saved Reports</div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        {saved.length === 0 ? (
          <div style={{ padding: 18, fontSize: 13, color: dim }}>
            No saved reports yet. Build one above and hit <strong style={{ color: "var(--f5-text)" }}>Save</strong> — definitions persist in your browser (localStorage). DB sync is a planned follow-up.
          </div>
        ) : (
          <table className="f5-table">
            <thead><tr><th>Report</th><th>Range</th><th>Property</th><th>Metrics</th><th>Saved</th><th></th></tr></thead>
            <tbody>
              {saved.map((r) => (
                <tr key={r.id}>
                  <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{r.name}</td>
                  <td style={{ color: dim }}>{r.range}</td>
                  <td style={{ color: dim }}>{r.property}</td>
                  <td style={{ color: dim }}>{r.metrics.map((k) => metricByKey(k)?.label ?? k).slice(0, 2).join(", ")}{r.metrics.length > 2 ? ` +${r.metrics.length - 2}` : ""}</td>
                  <td style={{ color: dim }}>{new Date(r.createdAt).toLocaleDateString("en-CA")}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button className="f5-btn" type="button" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => loadReport(r)}>Load</button>{" "}
                    <button className="f5-btn" type="button" style={{ padding: "3px 10px", fontSize: 11 }} onClick={() => deleteReport(r.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
