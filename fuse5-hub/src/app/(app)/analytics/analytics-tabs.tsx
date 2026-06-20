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
  const maxTrend = Math.max(...TREND.map((t) => t.value), 1);

  return (
    <>
      <div className="f5-chips" style={{ marginTop: 16 }}>
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
        </>
      )}

      {tab === "Compliance" && (
        <>
          <Kpis items={[
            { label: "Total Notifications", value: audit.totalNotifications.toLocaleString(), sub: "this period" },
            { label: "Delivery Rate", value: `${audit.deliveryRatePct}%`, sub: `${audit.delivered.toLocaleString()} delivered` },
            { label: "Proof-of-Play", value: audit.proofOfPlay.toLocaleString(), sub: "notices displayed" },
            { label: "Acknowledgements", value: audit.acknowledgements.toLocaleString(), sub: "confirmations" },
          ]} />
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
