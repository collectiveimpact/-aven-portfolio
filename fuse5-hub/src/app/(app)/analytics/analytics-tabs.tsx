"use client";

import { useState } from "react";
import type { MessageStats, AuditReport } from "@/lib/queries";
import { downloadCSV, slugifyFilename, type CsvColumn } from "@/lib/export";
import { AreaTrend, GroupedBars, Gauge, DonutMix, Funnel, Heatmap, HBars } from "./charts";
import { KpiGrid, ChartCard, ChartGrid, Legend } from "./ui";
import { ReportBuilder } from "./report-builder";
import {
  CHANNEL_LABEL,
  SENT_TREND,
  SENT_TREND_PRIOR,
  DELIVERY_RATE_TREND,
  CHANNEL_DELIVERABILITY,
  CHANNEL_ENGAGEMENT,
  CHANNEL_MIX,
  HEAT_DAYS,
  HEAT_PARTS,
  ENGAGEMENT_HEAT,
  SCREEN_STATS,
  UPTIME_TREND,
  OFFLINE_INCIDENTS,
  REACH_BY_PROPERTY,
  LANGUAGE_MIX,
  COMPLIANCE_FRAMEWORKS,
  COMPLIANCE_TYPES,
  PROOF_OF_DELIVERY,
  PROPERTY_OPTIONS,
  DATE_RANGES,
  formatMetric,
} from "./metrics";

const fg = "var(--f5-text)";
const dim = "var(--f5-text-muted)";

const TABS = ["Overview", "Deliverability", "Engagement", "Signage", "Audience", "Reports"] as const;
type Tab = (typeof TABS)[number];

// Aggregate demo deliverability across channels (used for top-line KPIs).
const TOT = CHANNEL_DELIVERABILITY.reduce(
  (a, c) => ({
    sent: a.sent + c.sent,
    delivered: a.delivered + c.delivered,
    failed: a.failed + c.failed,
    optOuts: a.optOuts + c.optOuts,
    inbound: a.inbound + c.inbound,
    spend: a.spend + c.sent * c.costPerMsg,
    carrierFiltered: a.carrierFiltered + c.carrierFiltered,
  }),
  { sent: 0, delivered: 0, failed: 0, optOuts: 0, inbound: 0, spend: 0, carrierFiltered: 0 },
);
const DEMO_DELIVERY_RATE = +((TOT.delivered / TOT.sent) * 100).toFixed(1);
const DEMO_RESPONSE_RATE = +((TOT.inbound / TOT.delivered) * 100).toFixed(1);

/** Small "Export CSV" affordance for a data table. Downloads `rows` shaped by
 *  `columns`, then briefly confirms inline (no toast dependency). */
function ExportCsvButton({
  label,
  rows,
  columns,
}: {
  label: string;
  rows: Record<string, unknown>[];
  columns?: (CsvColumn | string)[];
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="f5-btn"
      style={{ fontSize: 11, padding: "4px 10px" }}
      disabled={rows.length === 0}
      onClick={() => {
        downloadCSV(slugifyFilename(label), rows, columns);
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
    >
      {done ? "✓ Exported" : "⬇ Export CSV"}
    </button>
  );
}

/** Section-title row with a right-aligned Export CSV button. */
function TableHeader({
  title,
  exportLabel,
  rows,
  columns,
}: {
  title: string;
  exportLabel: string;
  rows: Record<string, unknown>[];
  columns?: (CsvColumn | string)[];
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 24, marginBottom: 10 }}>
      <div className="f5-section-title" style={{ margin: 0 }}>{title}</div>
      <ExportCsvButton label={exportLabel} rows={rows} columns={columns} />
    </div>
  );
}

export function AnalyticsTabs({
  stats,
  audit,
  orgName,
}: {
  stats: MessageStats;
  audit: AuditReport;
  orgName: string;
}) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [range, setRange] = useState("Month");
  const [property, setProperty] = useState("All properties");
  const [compare, setCompare] = useState(true);

  // Prefer live values where the backend has them; otherwise representative.
  const liveSent = stats.source === "live" ? stats.sent : null;
  const liveDeliveryRate = stats.source === "live" ? stats.deliveryRatePct : null;
  const sentDisplay = (liveSent ?? TOT.sent).toLocaleString();
  const deliveryRateDisplay = `${liveDeliveryRate ?? DEMO_DELIVERY_RATE}%`;

  return (
    <>
      {/* ---- filter bar ---- */}
      <div className="f5-card" style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: dim }}>Range</span>
          <div className="f5-chips" style={{ margin: 0 }}>
            {DATE_RANGES.map((r) => (
              <span key={r} className={`f5-chip${range === r ? " active" : ""}`} onClick={() => setRange(r)}>{r}</span>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: dim }}>Property</span>
          <select className="f5-select" value={property} onChange={(e) => setProperty(e.target.value)} style={{ width: 180 }}>
            {PROPERTY_OPTIONS.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <span
          className={`f5-badge ${compare ? "ok" : ""}`}
          style={{ cursor: "pointer", userSelect: "none" }}
          onClick={() => setCompare((v) => !v)}
        >
          {compare ? "✓ " : ""}Compare prior period
        </span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <span className={stats.source === "live" || audit.source === "live" ? "f5-live" : "f5-pill"}>
            {stats.source === "live" || audit.source === "live" ? "Live data" : "Representative data"}
          </span>
          <a className="f5-btn" href="/analytics/audit-report" target="_blank" rel="noopener" style={{ fontSize: 12, padding: "6px 12px" }}>⬇ Audit PDF</a>
        </div>
      </div>

      {/* ---- tabs ---- */}
      <div className="f5-chips" style={{ marginTop: 14 }}>
        {TABS.map((t) => (
          <span key={t} className={`f5-chip${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>{t}</span>
        ))}
      </div>

      {tab === "Overview" && (
        <>
          <KpiGrid items={[
            { label: "Messages Sent", value: sentDisplay, delta: 6.1, spark: SENT_TREND.map((t) => t.y), accent: "var(--f5-teal)" },
            { label: "Delivery Rate", value: deliveryRateDisplay, delta: 1.2, sub: "target 97%", spark: DELIVERY_RATE_TREND.map((t) => t.y) },
            { label: "Open Rate", value: "54.7%", delta: 2.3, sub: "blended" },
            { label: "Response Rate", value: `${DEMO_RESPONSE_RATE}%`, delta: 0.8, sub: "2-way channels" },
            { label: "Signage Uptime", value: "99.2%", delta: 0.4, sub: "fleet 30-day" },
          ]} />

          <ChartGrid>
            <ChartCard title="Messages Sent" subtitle="Last 8 weeks vs prior period" right={compare ? <Legend items={[{ label: "Current", color: "var(--f5-teal)" }, { label: "Prior", color: "var(--f5-text-muted)" }]} /> : undefined}>
              <AreaTrend
                series={{ name: "Sent", color: "var(--f5-teal)", points: SENT_TREND }}
                compare={compare ? { name: "Prior", points: SENT_TREND_PRIOR } : undefined}
              />
            </ChartCard>
            <ChartCard title="Delivery Rate" subtitle="Weekly delivery rate trend">
              <AreaTrend series={{ name: "Delivery rate", color: "var(--f5-green)", points: DELIVERY_RATE_TREND }} yFormat={(n) => `${n.toFixed(0)}%`} />
            </ChartCard>
          </ChartGrid>

          <ChartGrid>
            <ChartCard title="Delivery Funnel" subtitle="Sent → delivered → acknowledged → resolved (live audit)">
              <Funnel stages={[
                { label: "Sent", n: audit.totalNotifications, color: "var(--f5-teal)" },
                { label: "Delivered", n: audit.delivered, color: "var(--f5-blue)" },
                { label: "Acknowledged", n: audit.acknowledgements, color: "var(--f5-purple)" },
                { label: "Resolved", n: Math.round(audit.acknowledgements * 0.85), color: "var(--f5-green)" },
              ]} />
            </ChartCard>
            <ChartCard title="Channel Mix" subtitle="Share of total volume by channel">
              <DonutMix segments={CHANNEL_MIX} />
            </ChartCard>
          </ChartGrid>

          {/* Monitors */}
          <div className="f5-section-title">Live Monitors</div>
          <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {[
              { label: "Delivery rate", value: liveDeliveryRate ?? DEMO_DELIVERY_RATE, threshold: 95, unit: "%" },
              { label: "Emergency acknowledgement", value: 96, threshold: 90, unit: "%" },
              { label: "Signage uptime", value: 99.2, threshold: 98, unit: "%" },
            ].map((m) => {
              const ok = m.value >= m.threshold;
              return (
                <div key={m.label} className="f5-card" style={{ borderLeft: `3px solid ${ok ? "var(--f5-green)" : "var(--f5-red)"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div className="f5-kpi-label">{m.label}</div>
                    <span className={`f5-badge ${ok ? "ok" : "bad"}`}>{ok ? "● Healthy" : "▲ Alert"}</span>
                  </div>
                  <div className="f5-kpi-value">{m.value}{m.unit}</div>
                  <div className="f5-kpi-sub">threshold {m.threshold}{m.unit}</div>
                </div>
              );
            })}
          </div>

          <div className="f5-card" style={{ marginTop: 14, borderLeft: "3px solid var(--f5-teal)" }}>
            <div style={{ fontWeight: 700, color: fg }}>📊 Provider benchmark</div>
            <div style={{ fontSize: 13, color: "var(--f5-text-secondary)", marginTop: 6 }}>
              Your delivery rate <strong style={{ color: fg }}>{liveDeliveryRate ?? DEMO_DELIVERY_RATE}%</strong> vs. peer median{" "}
              <strong style={{ color: fg }}>96.1%</strong> — <span style={{ color: "var(--f5-green)" }}>top 15% of comparable housing providers</span>.
            </div>
          </div>
        </>
      )}

      {tab === "Deliverability" && (
        <>
          <KpiGrid items={[
            { label: "Sent", value: TOT.sent.toLocaleString(), delta: 6.1, accent: "var(--f5-teal)" },
            { label: "Delivered", value: TOT.delivered.toLocaleString(), delta: 5.8, spark: SENT_TREND.map((t) => Math.round(t.y * 0.97)) },
            { label: "Delivery Rate", value: `${DEMO_DELIVERY_RATE}%`, delta: 1.2, goodWhenHigh: true, spark: DELIVERY_RATE_TREND.map((t) => t.y) },
            { label: "Failed", value: TOT.failed.toLocaleString(), delta: -3.1, goodWhenHigh: false, sub: "retry queue" },
            { label: "Carrier-Filtered", value: TOT.carrierFiltered.toLocaleString(), delta: -1.4, goodWhenHigh: false },
            { label: "Opt-outs", value: TOT.optOuts.toLocaleString(), delta: 0.9, goodWhenHigh: false },
            { label: "Inbound", value: TOT.inbound.toLocaleString(), delta: 4.6, sub: "2-way replies" },
            { label: "Channel Spend", value: formatMetric(TOT.spend, "currency"), delta: 2.1, goodWhenHigh: false, sub: "this period" },
          ]} />

          <ChartGrid>
            <ChartCard title="Delivered by Channel" subtitle="Sent vs delivered per channel" right={<Legend items={[{ label: "Sent", color: "var(--f5-text-muted)" }, { label: "Delivered", color: "var(--f5-teal)" }]} />}>
              <GroupedBars
                categories={CHANNEL_DELIVERABILITY.map((c) => CHANNEL_LABEL[c.channel])}
                groups={[
                  { name: "Sent", color: "var(--f5-text-muted)", values: CHANNEL_DELIVERABILITY.map((c) => c.sent) },
                  { name: "Delivered", color: "var(--f5-teal)", values: CHANNEL_DELIVERABILITY.map((c) => c.delivered) },
                ]}
              />
            </ChartCard>
            <ChartCard title="Avg Time-to-Deliver" subtitle="Seconds from send to handset, by channel">
              <GroupedBars
                categories={CHANNEL_DELIVERABILITY.map((c) => CHANNEL_LABEL[c.channel])}
                groups={[{ name: "TTD", color: "var(--f5-blue)", values: CHANNEL_DELIVERABILITY.map((c) => c.ttdSeconds) }]}
                yFormat={(n) => `${n.toFixed(0)}s`}
              />
            </ChartCard>
          </ChartGrid>

          <TableHeader
            title="Deliverability by Channel"
            exportLabel="deliverability-by-channel"
            rows={CHANNEL_DELIVERABILITY.map((c) => ({
              channel: CHANNEL_LABEL[c.channel],
              sent: c.sent,
              delivered: c.delivered,
              deliveryPct: +((c.delivered / c.sent) * 100).toFixed(1),
              failed: c.failed,
              bouncePct: c.bounce,
              optOuts: c.optOuts,
              responsePct: c.responseRate,
              ttdSeconds: c.ttdSeconds,
              costPerMsg: c.costPerMsg,
              spend: +(c.sent * c.costPerMsg).toFixed(2),
            }))}
            columns={[
              { key: "channel", header: "Channel" },
              { key: "sent", header: "Sent" },
              { key: "delivered", header: "Delivered" },
              { key: "deliveryPct", header: "Delivery %" },
              { key: "failed", header: "Failed" },
              { key: "bouncePct", header: "Bounce %" },
              { key: "optOuts", header: "Opt-outs" },
              { key: "responsePct", header: "Response %" },
              { key: "ttdSeconds", header: "TTD (s)" },
              { key: "costPerMsg", header: "Cost/msg" },
              { key: "spend", header: "Spend" },
            ]}
          />
          <div className="f5-card" style={{ padding: 0, overflowX: "auto" }}>
            <table className="f5-table">
              <thead><tr><th>Channel</th><th>Sent</th><th>Delivered</th><th>Delivery %</th><th>Failed</th><th>Bounce %</th><th>Opt-outs</th><th>Response %</th><th>TTD</th><th>Cost/msg</th><th>Spend</th></tr></thead>
              <tbody>
                {CHANNEL_DELIVERABILITY.map((c) => {
                  const dr = +((c.delivered / c.sent) * 100).toFixed(1);
                  return (
                    <tr key={c.channel}>
                      <td style={{ color: fg, fontWeight: 600 }}>{CHANNEL_LABEL[c.channel]}</td>
                      <td>{c.sent.toLocaleString()}</td>
                      <td>{c.delivered.toLocaleString()}</td>
                      <td style={{ color: dr >= 97 ? "var(--f5-green)" : "var(--f5-amber)" }}>{dr}%</td>
                      <td>{c.failed}</td>
                      <td>{c.bounce}%</td>
                      <td>{c.optOuts}</td>
                      <td>{c.responseRate ? `${c.responseRate}%` : "—"}</td>
                      <td>{c.ttdSeconds}s</td>
                      <td>${c.costPerMsg.toFixed(3)}</td>
                      <td>${(c.sent * c.costPerMsg).toFixed(2)}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td style={{ fontWeight: 700, color: fg }}>Total</td>
                  <td style={{ fontWeight: 700 }}>{TOT.sent.toLocaleString()}</td>
                  <td style={{ fontWeight: 700 }}>{TOT.delivered.toLocaleString()}</td>
                  <td style={{ fontWeight: 700, color: "var(--f5-teal)" }}>{DEMO_DELIVERY_RATE}%</td>
                  <td colSpan={6} />
                  <td style={{ fontWeight: 700, color: "var(--f5-teal)" }}>${TOT.spend.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ fontSize: 12, color: dim, marginTop: 10 }}>💡 SMS carries the highest cost & filtering. Shift non-urgent SMS to email/display to cut spend while holding delivery.</div>
        </>
      )}

      {tab === "Engagement" && (
        <>
          <KpiGrid items={[
            { label: "Open Rate", value: "54.7%", delta: 2.3, sub: "blended", accent: "var(--f5-teal)" },
            { label: "Click Rate", value: "12.4%", delta: -0.6, goodWhenHigh: true, sub: "vs prior" },
            { label: "Read Rate", value: "89.2%", delta: 1.1, sub: "WhatsApp" },
            { label: "Conversion", value: "7.8%", delta: 1.4, sub: "CTA completion" },
            { label: "Unsubscribe", value: "0.5%", delta: -0.1, goodWhenHigh: false, sub: "healthy" },
          ]} />

          <ChartGrid>
            <ChartCard title="Engagement by Channel" subtitle="Open / click / conversion rates" right={<Legend items={[{ label: "Open", color: "var(--f5-teal)" }, { label: "Click", color: "var(--f5-blue)" }, { label: "Conversion", color: "var(--f5-purple)" }]} />}>
              <GroupedBars
                categories={CHANNEL_ENGAGEMENT.map((c) => CHANNEL_LABEL[c.channel])}
                groups={[
                  { name: "Open", color: "var(--f5-teal)", values: CHANNEL_ENGAGEMENT.map((c) => c.open) },
                  { name: "Click", color: "var(--f5-blue)", values: CHANNEL_ENGAGEMENT.map((c) => c.click) },
                  { name: "Conversion", color: "var(--f5-purple)", values: CHANNEL_ENGAGEMENT.map((c) => c.conversion) },
                ]}
                yFormat={(n) => `${n.toFixed(0)}%`}
              />
            </ChartCard>
            <ChartCard title="Channel Mix" subtitle="Where engaged residents are reached">
              <DonutMix segments={CHANNEL_MIX} />
            </ChartCard>
          </ChartGrid>

          <ChartCard title="Best Time to Send" subtitle="Engagement intensity by day × daypart — peak weekday evenings">
            <Heatmap rows={HEAT_DAYS} cols={HEAT_PARTS} data={ENGAGEMENT_HEAT} />
            <div style={{ fontSize: 12, color: dim, marginTop: 10 }}>Schedule non-urgent comms 6–8 PM weekdays for ~90% engagement.</div>
          </ChartCard>

          <TableHeader
            title="Engagement Detail"
            exportLabel="engagement-detail"
            rows={CHANNEL_ENGAGEMENT.map((e) => ({
              channel: CHANNEL_LABEL[e.channel],
              openPct: e.open,
              clickPct: e.click,
              readPct: e.read,
              conversionPct: e.conversion,
              unsubPct: e.unsub,
            }))}
            columns={[
              { key: "channel", header: "Channel" },
              { key: "openPct", header: "Open %" },
              { key: "clickPct", header: "Click %" },
              { key: "readPct", header: "Read %" },
              { key: "conversionPct", header: "Conversion %" },
              { key: "unsubPct", header: "Unsub %" },
            ]}
          />
          <div className="f5-card" style={{ padding: 0, overflowX: "auto" }}>
            <table className="f5-table">
              <thead><tr><th>Channel</th><th>Open %</th><th>Click %</th><th>Read %</th><th>Conversion %</th><th>Unsub %</th></tr></thead>
              <tbody>
                {CHANNEL_ENGAGEMENT.map((e) => (
                  <tr key={e.channel}>
                    <td style={{ color: fg, fontWeight: 600 }}>{CHANNEL_LABEL[e.channel]}</td>
                    <td>{e.open ? `${e.open}%` : "—"}</td>
                    <td>{e.click ? `${e.click}%` : "—"}</td>
                    <td>{e.read ? `${e.read}%` : "—"}</td>
                    <td>{e.conversion ? `${e.conversion}%` : "—"}</td>
                    <td>{e.unsub ? `${e.unsub}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "Signage" && (
        <>
          <KpiGrid items={[
            { label: "Screens Online", value: `${SCREEN_STATS.filter((s) => s.status === "online").length} / ${SCREEN_STATS.length}`, sub: `${SCREEN_STATS.filter((s) => s.status !== "online").length} need attention`, accent: "var(--f5-sun)" },
            { label: "Proof-of-Play", value: audit.proofOfPlay.toLocaleString(), delta: 8.4, sub: "logged plays" },
            { label: "Impressions", value: SCREEN_STATS.reduce((a, s) => a + s.impressions, 0).toLocaleString(), delta: 6.2 },
            { label: "Avg Dwell", value: "8.4s", delta: 0.7, sub: "per impression" },
            { label: "Playlist Completion", value: "94.6%", delta: 1.3 },
            { label: "Offline Incidents", value: String(OFFLINE_INCIDENTS.reduce((a, n) => a + n, 0)), delta: -42, goodWhenHigh: false, sub: "8-week total" },
          ]} />

          <ChartGrid>
            <ChartCard title="Fleet Uptime" subtitle="Weekly signage uptime trend">
              <AreaTrend series={{ name: "Uptime", color: "var(--f5-sun)", points: UPTIME_TREND }} yFormat={(n) => `${n.toFixed(0)}%`} />
            </ChartCard>
            <ChartCard title="Offline Incidents" subtitle="Per week — lower is better">
              <GroupedBars
                categories={UPTIME_TREND.map((t) => t.x)}
                groups={[{ name: "Incidents", color: "var(--f5-coral)", values: OFFLINE_INCIDENTS }]}
                yFormat={(n) => `${n}`}
              />
            </ChartCard>
          </ChartGrid>

          <ChartGrid>
            <ChartCard title="Plays by Screen" subtitle="Proof-of-play leaders">
              <HBars items={SCREEN_STATS.filter((s) => s.plays > 0).map((s) => ({ label: `${s.property} · ${s.name}`, value: s.plays, color: "var(--f5-sun)" }))} />
            </ChartCard>
            <ChartCard title="Fleet Health" subtitle="Online share">
              <div style={{ display: "flex", justifyContent: "center" }}>
                <Gauge
                  value={+((SCREEN_STATS.filter((s) => s.status === "online").length / SCREEN_STATS.length) * 100).toFixed(0)}
                  label="screens online"
                  color="var(--f5-sun)"
                />
              </div>
            </ChartCard>
          </ChartGrid>

          <TableHeader
            title="Screen Fleet"
            exportLabel="screen-fleet"
            rows={SCREEN_STATS.map((s) => ({
              id: s.id,
              location: `${s.property} · ${s.name}`,
              plays: s.plays,
              uptimePct: s.uptime,
              impressions: s.impressions,
              dwellSeconds: s.dwellSeconds,
              completionPct: s.completion,
              status: s.status,
            }))}
            columns={[
              { key: "id", header: "Screen ID" },
              { key: "location", header: "Location" },
              { key: "plays", header: "Plays" },
              { key: "uptimePct", header: "Uptime %" },
              { key: "impressions", header: "Impressions" },
              { key: "dwellSeconds", header: "Dwell (s)" },
              { key: "completionPct", header: "Completion %" },
              { key: "status", header: "Status" },
            ]}
          />
          <div className="f5-card" style={{ padding: 0, overflowX: "auto" }}>
            <table className="f5-table">
              <thead><tr><th>Screen ID</th><th>Location</th><th>Plays</th><th>Uptime</th><th>Impressions</th><th>Dwell</th><th>Completion</th><th>Status</th></tr></thead>
              <tbody>
                {SCREEN_STATS.map((s) => (
                  <tr key={s.id}>
                    <td style={{ color: "var(--f5-teal)", fontFamily: "monospace", fontSize: 12 }}>{s.id}</td>
                    <td>{s.property} · {s.name}</td>
                    <td>{s.plays.toLocaleString()}</td>
                    <td style={{ color: s.uptime >= 99 ? "var(--f5-green)" : s.uptime >= 90 ? "var(--f5-amber)" : "var(--f5-red)" }}>{s.uptime}%</td>
                    <td>{s.impressions.toLocaleString()}</td>
                    <td>{s.dwellSeconds ? `${s.dwellSeconds}s` : "—"}</td>
                    <td>{s.completion ? `${s.completion}%` : "—"}</td>
                    <td><span className={`f5-badge ${s.status === "online" ? "ok" : s.status === "warning" ? "warn" : "bad"}`} style={{ textTransform: "capitalize" }}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "Audience" && (
        <>
          <KpiGrid items={[
            { label: "Total Reach", value: REACH_BY_PROPERTY.reduce((a, p) => a + p.value, 0).toLocaleString(), delta: 3.4, accent: "var(--f5-teal)" },
            { label: "Consent Coverage", value: "99.5%", delta: 0.2, sub: "CASL" },
            { label: "Audit Completeness", value: "99.8%", delta: 0.1, sub: "delivery logs" },
            { label: "Languages", value: String(LANGUAGE_MIX.length), sub: "active locales" },
            { label: "Acknowledgements", value: audit.acknowledgements.toLocaleString(), delta: 5.1, sub: "confirmations" },
          ]} />

          <ChartGrid>
            <ChartCard title="Reach by Property" subtitle="Residents reached this period">
              <HBars items={REACH_BY_PROPERTY} />
            </ChartCard>
            <ChartCard title="Language Mix" subtitle="Preferred language across audience">
              <DonutMix segments={LANGUAGE_MIX} />
            </ChartCard>
          </ChartGrid>

          {/* Compliance coverage */}
          <div className="f5-section-title">Compliance Coverage</div>
          <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {COMPLIANCE_FRAMEWORKS.map((r) => (
              <div key={r.name} className="f5-card">
                <div className="f5-kpi-label">{r.name}</div>
                <div className="f5-kpi-value" style={{ color: r.pct >= 99 ? "var(--f5-green)" : "var(--f5-teal)" }}>{r.pct}%</div>
                <div style={{ height: 5, borderRadius: 99, background: "var(--f5-border)", marginTop: 6 }}>
                  <div style={{ width: `${r.pct}%`, height: "100%", borderRadius: 99, background: r.pct >= 99 ? "var(--f5-green)" : "var(--f5-teal)" }} />
                </div>
              </div>
            ))}
          </div>

          <TableHeader
            title="Compliance by Notice Type"
            exportLabel="compliance-by-notice-type"
            rows={COMPLIANCE_TYPES.map((c) => ({ kind: c.kind, deliveredPct: c.delivered, ackPct: c.ack }))}
            columns={[
              { key: "kind", header: "Notice Type" },
              { key: "deliveredPct", header: "Delivered %" },
              { key: "ackPct", header: "Acknowledged %" },
            ]}
          />
          <div className="f5-card" style={{ padding: 0, overflowX: "auto" }}>
            <table className="f5-table">
              <thead><tr><th>Notice Type</th><th>Delivered %</th><th>Acknowledged %</th></tr></thead>
              <tbody>
                {COMPLIANCE_TYPES.map((c) => (
                  <tr key={c.kind}>
                    <td style={{ color: fg, fontWeight: 600 }}>{c.kind}</td>
                    <td style={{ color: "var(--f5-green)" }}>{c.delivered}%</td>
                    <td>{c.ack}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <TableHeader
            title="Proof-of-Delivery"
            exportLabel="proof-of-delivery"
            rows={PROOF_OF_DELIVERY.map((p) => ({ id: p.id, type: p.type, sent: p.sent, delivered: p.delivered, date: p.date }))}
            columns={[
              { key: "id", header: "Notice ID" },
              { key: "type", header: "Type" },
              { key: "sent", header: "Sent" },
              { key: "delivered", header: "Delivered" },
              { key: "date", header: "Date" },
            ]}
          />
          <div className="f5-card" style={{ padding: 0, overflowX: "auto" }}>
            <table className="f5-table">
              <thead><tr><th>Notice ID</th><th>Type</th><th>Sent</th><th>Delivered</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {PROOF_OF_DELIVERY.map((p) => (
                  <tr key={p.id}>
                    <td style={{ color: "var(--f5-teal)", fontFamily: "monospace", fontSize: 12 }}>{p.id}</td>
                    <td>{p.type}</td>
                    <td>{p.sent}</td>
                    <td style={{ color: p.delivered === p.sent ? "var(--f5-green)" : "var(--f5-amber)" }}>{p.delivered}</td>
                    <td style={{ color: dim }}>{p.date}</td>
                    <td><a className="f5-btn" href="/analytics/audit-report" target="_blank" rel="noopener" style={{ padding: "3px 10px", fontSize: 11 }}>⬇</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === "Reports" && (
        <ReportBuilder
          orgName={orgName}
          liveSource={stats.source === "live" || audit.source === "live" ? "live" : "demo"}
          live={{
            sent: liveSent ?? undefined,
            delivered: stats.source === "live" ? stats.delivered : undefined,
            deliveryRate: liveDeliveryRate ?? undefined,
            proofOfPlay: audit.source === "live" ? audit.proofOfPlay : undefined,
            acknowledgements: audit.source === "live" ? audit.acknowledgements : undefined,
          }}
        />
      )}
    </>
  );
}
