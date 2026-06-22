"use client";

import { useState } from "react";
import type { MessageStats, AuditReport } from "@/lib/queries";

const CH_LABEL: Record<string, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp", voice: "Voice", display: "Display" };
const fg = "var(--f5-text)";
const dim = "var(--f5-text-muted)";

const TREND = [
  { label: "Wk 1", value: 18200 }, { label: "Wk 2", value: 19100 }, { label: "Wk 3", value: 20400 },
  { label: "Wk 4", value: 19800 }, { label: "Wk 5", value: 21600 }, { label: "Wk 6", value: 22300 }, { label: "Wk 7", value: 21100 },
];
// Demo specifics for tabs without a dedicated live source yet.
const DEVICES = [
  { name: "100 Dundas — Main Lobby", plays: 4820, uptime: 99.7 },
  { name: "100 Dundas — Elevator Bank", plays: 4610, uptime: 99.4 },
  { name: "55 Hess — Main Lobby", plays: 4390, uptime: 99.9 },
  { name: "200 Lees — Mail Room", plays: 3270, uptime: 98.9 },
  { name: "250 King — Main Lobby", plays: 2980, uptime: 99.0 },
];
const ENGAGEMENT = [
  { channel: "email", open: 58.2, click: 14.1, response: 9.4, optOut: 0.3 },
  { channel: "sms", open: 71.6, click: 18.7, response: 22.5, optOut: 0.8 },
  { channel: "whatsapp", open: 64.0, click: 16.2, response: 18.1, optOut: 0.4 },
  { channel: "display", open: 0, click: 0, response: 0, optOut: 0 },
];
const COMPLIANCE_TYPES = [
  { kind: "Emergency Alerts", delivered: 100, ack: 96 },
  { kind: "Maintenance Notices", delivered: 99.2, ack: 71 },
  { kind: "Compliance Notices", delivered: 99.8, ack: 88 },
  { kind: "Community Events", delivered: 98.4, ack: 41 },
];
const COST_EFF = [
  { channel: "email", cost: 0.003, sent: 6482, eng: "67.4% open" },
  { channel: "sms", cost: 0.025, sent: 4231, eng: "22.5% response" },
  { channel: "display", cost: 0.001, sent: 20070, eng: "proof-of-play" },
  { channel: "whatsapp", cost: 0.005, sent: 2134, eng: "89.2% read" },
];
const DEVICE_DETAIL = [
  { id: "PL-WG-001", type: "H200W", location: "100 Dundas — Main Lobby", active: "2 min ago", status: "online" },
  { id: "PL-WG-003", type: "H200", location: "200 Lees — Main Lobby", active: "3h 22m ago", status: "offline" },
  { id: "PL-HN-001", type: "H200W", location: "55 Hess — Main Lobby", active: "1 min ago", status: "online" },
  { id: "PL-HN-008", type: "H200", location: "8 Munsee Trail — Lobby", active: "22 min ago", status: "warning" },
  { id: "PL-KW-001", type: "H200W", location: "250 King — Main Lobby", active: "3 min ago", status: "online" },
];
const REGULATIONS = [
  { name: "RentSafeTO", pct: 98 }, { name: "Hamilton SAB", pct: 100 }, { name: "CASL Consent", pct: 99.5 }, { name: "PIPEDA", pct: 100 },
];
const PROOF_OF_DELIVERY = [
  { id: "NTC-2026-0412", type: "RentSafeTO Inspection", sent: 210, delivered: 208, date: "Apr 10, 2026" },
  { id: "NTC-2026-0398", type: "Fire Safety Notice", sent: 847, delivered: 847, date: "Apr 4, 2026" },
  { id: "NTC-2026-0377", type: "Water Shutoff", sent: 142, delivered: 140, date: "Mar 28, 2026" },
];
const REPORT_METRICS = ["Messages Sent", "Delivery Rate", "Open Rate", "Click Rate", "Response Rate", "Proof-of-Play", "Acknowledgements", "Opt-outs"];
// 7 days × 4 dayparts engagement intensity (0–100) for the best-times heatmap.
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PARTS = ["Morning", "Midday", "Evening", "Night"];
const HEAT = [
  [42, 55, 88, 20], [45, 58, 90, 22], [48, 60, 92, 25], [50, 62, 91, 24], [52, 65, 86, 28], [30, 48, 70, 18], [25, 40, 60, 15],
];

const TABS = ["Overview", "Devices", "Channels", "Engagement", "Compliance", "Reports"] as const;
type Tab = (typeof TABS)[number];

function Kpis({ items }: { items: { label: string; value: string; sub?: string; up?: boolean; down?: boolean }[] }) {
  return (
    <div className="f5-grid" style={{ gridTemplateColumns: `repeat(${items.length},1fr)`, marginTop: 18 }}>
      {items.map((k) => (
        <div key={k.label} className="f5-card">
          <div className="f5-kpi-label">{k.label}</div><div className="f5-kpi-value">{k.value}</div>
          {k.sub && <div className="f5-kpi-sub">{k.up && <span className="f5-up">▲ </span>}{k.down && <span className="f5-down">▼ </span>}{k.sub}</div>}
        </div>
      ))}
    </div>
  );
}

export function AnalyticsTabs({ stats, audit }: { stats: MessageStats; audit: AuditReport }) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [range, setRange] = useState("Month");
  const [compare, setCompare] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [metrics, setMetrics] = useState<Set<string>>(new Set(["Messages Sent", "Delivery Rate", "Open Rate"]));
  const [groupBy, setGroupBy] = useState("Channel");
  const [viz, setViz] = useState("Table");
  const toggleMetric = (m: string) => setMetrics((s) => { const n = new Set(s); n.has(m) ? n.delete(m) : n.add(m); return n; });
  const maxTrend = Math.max(...TREND.map((t) => t.value), 1);

  return (
    <>
      {/* header controls */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
        <div className="f5-chips" style={{ margin: 0 }}>
          {["Week", "Month", "Quarter", "Custom"].map((r) => <span key={r} className={`f5-chip${range === r ? " active" : ""}`} onClick={() => setRange(r)}>{r}</span>)}
        </div>
        <span className={`f5-badge ${compare ? "ok" : ""}`} style={{ cursor: "pointer", userSelect: "none" }} onClick={() => setCompare((v) => !v)}>{compare ? "✓ " : ""}Compare prior period</span>
        <div style={{ position: "relative", marginLeft: "auto" }}>
          <button className="f5-btn" type="button" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => setShowExport((v) => !v)}>⬇ Export ▾</button>
          {showExport && (
            <div className="f5-card" style={{ position: "absolute", right: 0, top: "110%", width: 200, zIndex: 20, padding: 6 }}>
              {[["PDF", "/analytics/audit-report"], ["CSV", null], ["XLSX", null], ["Schedule Email", null]].map(([l, href]) => (
                href ? <a key={l} href={href as string} target="_blank" rel="noopener" style={{ display: "block", padding: "7px 8px", fontSize: 12, color: "var(--f5-text-secondary)", textDecoration: "none" }}>{l}</a>
                  : <div key={l} style={{ padding: "7px 8px", fontSize: 12, color: "var(--f5-text-dim)" }}>{l}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="f5-chips" style={{ marginTop: 14 }}>
        {TABS.map((t) => <span key={t} className={`f5-chip${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{t}</span>)}
      </div>

      {tab === "Overview" && (
        <>
          <Kpis items={[
            { label: "Messages Sent", value: stats.sent.toLocaleString(), sub: "6.1% vs prior", up: true },
            { label: "Delivery Rate", value: `${stats.deliveryRatePct}%`, sub: "target 97%", up: true },
            { label: "Open Rate", value: "54.7%", sub: "blended", up: true },
            { label: "Click Rate", value: "12.4%", sub: "vs prior", down: true },
          ]} />
          <div className="f5-card" style={{ marginTop: 18 }}>
            <div className="f5-section-title" style={{ margin: "0 0 4px" }}>Messages Sent — Last 7 Weeks</div>
            <div className="f5-bars">{TREND.map((t) => <div key={t.label} className="f5-bar" style={{ height: `${Math.round((t.value / maxTrend) * 100)}%` }}><span>{t.label}</span></div>)}</div>
          </div>
        </>
      )}

      {tab === "Devices" && (
        <>
          <Kpis items={[
            { label: "Screens Online", value: "29 / 31", sub: "2 offline" },
            { label: "Avg Uptime", value: "99.2%", sub: "30-day" },
            { label: "Total Plays", value: "20,070", sub: "this period" },
            { label: "Proof-of-Play", value: audit.proofOfPlay.toLocaleString(), sub: "logged" },
          ]} />
          <div className="f5-section-title">Top Screens by Plays</div>
          <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="f5-table">
              <thead><tr><th>Screen</th><th>Plays</th><th>Uptime</th></tr></thead>
              <tbody>{DEVICES.map((d) => <tr key={d.name}><td style={{ color: fg, fontWeight: 600 }}>{d.name}</td><td>{d.plays.toLocaleString()}</td><td style={{ color: d.uptime >= 99 ? "var(--f5-green,#34d399)" : "#f59e0b" }}>{d.uptime}%</td></tr>)}</tbody>
            </table>
          </div>
          <div className="f5-section-title">Device Fleet</div>
          <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="f5-table">
              <thead><tr><th>Device ID</th><th>Type</th><th>Location</th><th>Status</th><th>Last Active</th></tr></thead>
              <tbody>{DEVICE_DETAIL.map((d) => <tr key={d.id}>
                <td style={{ color: "var(--f5-teal,#00CCCC)", fontFamily: "monospace", fontSize: 12 }}>{d.id}</td>
                <td><span className="f5-badge">{d.type}</span></td>
                <td>{d.location}</td>
                <td><span className={`f5-badge ${d.status === "online" ? "ok" : d.status === "warning" ? "warn" : "danger"}`} style={{ textTransform: "capitalize" }}>{d.status}</span></td>
                <td style={{ color: d.status === "offline" ? "var(--f5-red,#f87171)" : dim }}>{d.active}</td>
              </tr>)}</tbody>
            </table>
          </div>
        </>
      )}

      {tab === "Channels" && (
        <>
          <div className="f5-section-title" style={{ marginTop: 18 }}>By Channel</div>
          <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="f5-table">
              <thead><tr><th>Channel</th><th>Sent</th><th>Delivered</th><th>Delivery %</th></tr></thead>
              <tbody>{stats.byChannel.map((c) => <tr key={c.channel}><td style={{ color: fg, fontWeight: 600 }}>{CH_LABEL[c.channel] ?? c.channel}</td><td>{c.sent.toLocaleString()}</td><td>{c.delivered.toLocaleString()}</td><td>{c.sent ? `${((c.delivered / c.sent) * 100).toFixed(1)}%` : "—"}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="f5-section-title">Cost Efficiency</div>
          <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="f5-table">
              <thead><tr><th>Channel</th><th>Cost / msg</th><th>Volume</th><th>Period Cost</th><th>Engagement</th></tr></thead>
              <tbody>
                {COST_EFF.map((c) => <tr key={c.channel}><td style={{ color: fg, fontWeight: 600 }}>{CH_LABEL[c.channel]}</td><td>${c.cost.toFixed(3)}</td><td>{c.sent.toLocaleString()}</td><td>${(c.cost * c.sent).toFixed(2)}</td><td style={{ color: dim }}>{c.eng}</td></tr>)}
                <tr><td colSpan={3} style={{ fontWeight: 700, color: fg }}>Total</td><td style={{ fontWeight: 700, color: "var(--f5-teal,#00CCCC)" }}>${COST_EFF.reduce((a, c) => a + c.cost * c.sent, 0).toFixed(2)}</td><td></td></tr>
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: dim, marginTop: 10 }}>💡 Display is your cheapest channel at $0.001/msg with strong proof-of-play. Shift non-urgent SMS to display + email where possible.</div>
        </>
      )}

      {tab === "Engagement" && (
        <>
          <Kpis items={[
            { label: "Open Rate", value: "54.7%", sub: "blended", up: true },
            { label: "Click Rate", value: "12.4%", sub: "vs prior", down: true },
            { label: "Response Rate", value: "16.7%", sub: "2-way channels" },
            { label: "Opt-out Rate", value: "0.5%", sub: "healthy" },
          ]} />
          <div className="f5-section-title">Engagement by Channel</div>
          <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="f5-table">
              <thead><tr><th>Channel</th><th>Open %</th><th>Click %</th><th>Response %</th><th>Opt-out %</th></tr></thead>
              <tbody>{ENGAGEMENT.map((e) => <tr key={e.channel}><td style={{ color: fg, fontWeight: 600 }}>{CH_LABEL[e.channel]}</td><td>{e.open || "—"}{e.open ? "%" : ""}</td><td>{e.click || "—"}{e.click ? "%" : ""}</td><td>{e.response || "—"}{e.response ? "%" : ""}</td><td>{e.optOut || "—"}{e.optOut ? "%" : ""}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="f5-section-title">Best Times to Communicate</div>
          <div className="f5-card" style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead><tr><th></th>{PARTS.map((p) => <th key={p} style={{ fontSize: 11, color: dim, fontWeight: 500, padding: "4px 8px", textAlign: "center" }}>{p}</th>)}</tr></thead>
              <tbody>
                {DAYS.map((d, di) => (
                  <tr key={d}>
                    <td style={{ fontSize: 12, color: dim, paddingRight: 10 }}>{d}</td>
                    {HEAT[di].map((v, pi) => (
                      <td key={pi} style={{ padding: 3 }}>
                        <div title={`${d} ${PARTS[pi]} — ${v}% engagement`} style={{ height: 26, borderRadius: 5, background: `rgba(0,204,153,${0.12 + (v / 100) * 0.8})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: v > 60 ? "#04201a" : "var(--f5-text-secondary)" }}>{v}</div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 12, color: dim, marginTop: 10 }}>Peak engagement is weekday evenings (90%+). Schedule non-urgent comms 6–8 PM.</div>
          </div>
        </>
      )}

      {tab === "Compliance" && (
        <>
          <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 18 }}>
            {REGULATIONS.map((r) => (
              <div key={r.name} className="f5-card">
                <div className="f5-kpi-label">{r.name}</div>
                <div className="f5-kpi-value" style={{ color: r.pct >= 99 ? "var(--f5-green,#34d399)" : "var(--f5-teal,#00CCCC)" }}>{r.pct}%</div>
                <div style={{ height: 5, borderRadius: 99, background: "var(--f5-border)", marginTop: 6 }}><div style={{ width: `${r.pct}%`, height: "100%", borderRadius: 99, background: r.pct >= 99 ? "var(--f5-green,#34d399)" : "var(--f5-teal,#00CCCC)" }} /></div>
              </div>
            ))}
          </div>
          <Kpis items={[
            { label: "Total Notifications", value: audit.totalNotifications.toLocaleString(), sub: "this period" },
            { label: "Delivery Rate", value: `${audit.deliveryRatePct}%`, sub: `${audit.delivered.toLocaleString()} delivered` },
            { label: "Proof-of-Play", value: audit.proofOfPlay.toLocaleString(), sub: "notices displayed" },
            { label: "Acknowledgements", value: audit.acknowledgements.toLocaleString(), sub: "confirmations" },
          ]} />
          <div className="f5-section-title">Proof-of-Delivery</div>
          <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="f5-table">
              <thead><tr><th>Notice ID</th><th>Type</th><th>Sent</th><th>Delivered</th><th>Date</th><th></th></tr></thead>
              <tbody>{PROOF_OF_DELIVERY.map((p) => <tr key={p.id}>
                <td style={{ color: "var(--f5-teal,#00CCCC)", fontFamily: "monospace", fontSize: 12 }}>{p.id}</td>
                <td>{p.type}</td><td>{p.sent}</td>
                <td style={{ color: p.delivered === p.sent ? "var(--f5-green,#34d399)" : "#f59e0b" }}>{p.delivered}</td>
                <td style={{ color: dim }}>{p.date}</td>
                <td><a className="f5-btn" href="/analytics/audit-report" target="_blank" rel="noopener" style={{ padding: "3px 10px", fontSize: 11 }}>⬇</a></td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="f5-section-title">Compliance by Notice Type</div>
          <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="f5-table">
              <thead><tr><th>Notice Type</th><th>Delivered %</th><th>Acknowledged %</th></tr></thead>
              <tbody>{COMPLIANCE_TYPES.map((c) => <tr key={c.kind}><td style={{ color: fg, fontWeight: 600 }}>{c.kind}</td><td style={{ color: "var(--f5-green,#34d399)" }}>{c.delivered}%</td><td>{c.ack}%</td></tr>)}</tbody>
            </table>
          </div>
        </>
      )}

      {tab === "Reports" && (
        <>
          <div className="f5-section-title" style={{ marginTop: 18 }}>Report Builder</div>
          <div className="f5-card">
            <label className="f5-label">Metrics</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {REPORT_METRICS.map((m) => (
                <span key={m} className={`f5-chip${metrics.has(m) ? " active" : ""}`} onClick={() => toggleMetric(m)} style={{ fontSize: 12 }}>{metrics.has(m) ? "✓ " : ""}{m}</span>
              ))}
            </div>
            <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div><label className="f5-label">Group By</label><select className="f5-select" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>{["Channel", "Property", "Notice Type", "Day", "Week"].map((o) => <option key={o}>{o}</option>)}</select></div>
              <div><label className="f5-label">Visualization</label><select className="f5-select" value={viz} onChange={(e) => setViz(e.target.value)}>{["Table", "Bar Chart", "Line Chart", "Donut"].map((o) => <option key={o}>{o}</option>)}</select></div>
              <div style={{ display: "flex", alignItems: "flex-end" }}><a className="f5-btn primary" href="/analytics/audit-report" target="_blank" rel="noopener" style={{ width: "100%", justifyContent: "center" }}>Generate ({metrics.size})</a></div>
            </div>
          </div>

          <div className="f5-section-title">Saved Reports</div>
          <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="f5-table">
              <thead><tr><th>Report</th><th>Schedule</th><th>Last Run</th><th></th></tr></thead>
              <tbody>
                {[["Monthly Board Pack", "1st of month", "Apr 1, 2026"], ["Weekly Delivery Summary", "Mondays 8 AM", "Apr 8, 2026"], ["RentSafeTO Evidence", "On demand", "Mar 28, 2026"]].map((r) => (
                  <tr key={r[0]}><td style={{ color: fg, fontWeight: 600 }}>{r[0]}</td><td style={{ color: dim }}>{r[1]}</td><td style={{ color: dim }}>{r[2]}</td><td><a className="f5-btn" href="/analytics/audit-report" target="_blank" rel="noopener" style={{ padding: "3px 10px", fontSize: 11 }}>Run</a></td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="f5-section-title" style={{ marginTop: 18 }}>Formal Reports — {audit.period}</div>
          <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))" }}>
            {[
              { name: "Tenant Notification Audit", sub: "Proof-of-play + delivery audit (PDF)", href: "/analytics/audit-report", live: true },
              { name: "Delivery & Engagement Summary", sub: "Open / click / response by channel", href: null, live: false },
              { name: "Signage Proof-of-Play Log", sub: "Per-screen play records", href: null, live: false },
              { name: "Compliance Evidence Pack", sub: "RentSafeTO-aligned notice records", href: null, live: false },
            ].map((r) => (
              <div key={r.name} className="f5-card">
                <div style={{ fontWeight: 700, color: fg }}>{r.name}</div>
                <div style={{ fontSize: 12, color: dim, margin: "6px 0 12px" }}>{r.sub}</div>
                {r.href
                  ? <a className="f5-btn primary" href={r.href} target="_blank" rel="noopener">⬇ Download PDF</a>
                  : <button className="f5-btn" type="button" disabled>Coming soon</button>}
              </div>
            ))}
          </div>
          <div style={{ color: dim, fontSize: 11, marginTop: 14 }}>Audit source: {audit.source === "live" ? "live message/delivery logs" : "demo"} · {audit.period} · ca-central-1</div>
        </>
      )}
    </>
  );
}
