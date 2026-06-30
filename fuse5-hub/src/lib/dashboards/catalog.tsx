// Widget catalog — the typed registry of every widget a user can place on their
// dashboard. Each entry has a stable id, title, category, default size, and a
// PURE renderer that draws from the shared DashboardData bundle (no fetching,
// no client state). Charts are simple inline SVG/bars rendered locally so this
// stays independent of the shared analytics chart toolkit.

import type { DashboardData, WidgetCategory, WidgetDef } from "./types";

const TONE_COLOR: Record<"ok" | "warn" | "alert", string> = {
  ok: "var(--f5-green)",
  warn: "var(--f5-amber)",
  alert: "var(--f5-red)",
};

const scoreColor = (n: number) =>
  n >= 85 ? "var(--f5-green)" : n >= 60 ? "var(--f5-amber)" : "var(--f5-red)";

// ---- small inline chart primitives (local, not from analytics/charts.tsx) ----

function Bars({ data, max }: { data: { label: string; value: number }[]; max: number }) {
  const top = Math.max(max, 1);
  return (
    <div className="f5-bars" style={{ height: 120 }}>
      {data.map((t) => (
        <div key={t.label} className="f5-bar" style={{ height: `${Math.round((t.value / top) * 100)}%` }}>
          <span>{t.label}</span>
        </div>
      ))}
    </div>
  );
}

function ProgressRow({ name, pct, color }: { name: string; pct: number; color?: string }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--f5-text-secondary)", marginBottom: 4 }}>
        <span>{name}</span>
        <span>{pct}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: "var(--f5-border)" }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", borderRadius: 99, background: color ?? "var(--f5-teal,#00CCCC)" }} />
      </div>
    </div>
  );
}

function Donut({ pct, label, sub }: { pct: number; label: string; sub: string }) {
  const r = 34, c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg viewBox="0 0 90 90" width="90" height="90">
        <circle cx="45" cy="45" r={r} fill="none" stroke="var(--f5-border)" strokeWidth="9" />
        <circle
          cx="45" cy="45" r={r} fill="none" stroke={scoreColor(pct)} strokeWidth="9" strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`} transform="rotate(-90 45 45)"
        />
        <text x="45" y="50" textAnchor="middle" fontSize="18" fontWeight="800" fill="var(--f5-text)">{pct}%</text>
      </svg>
      <div>
        <div style={{ fontWeight: 700, color: "var(--f5-text)", fontSize: 14 }}>{label}</div>
        <div style={{ fontSize: 12, color: "var(--f5-text-muted)", marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

// Reusable KPI tile body.
function Kpi({ label, value, sub, tone }: { label: string; value: string; sub?: React.ReactNode; tone?: "warn" }) {
  return (
    <>
      <div className="f5-kpi-label">{label}</div>
      <div className={`f5-kpi-value${tone === "warn" ? " f5-warn" : ""}`}>{value}</div>
      {sub ? <div className="f5-kpi-sub">{sub}</div> : null}
    </>
  );
}

// ---------------------------------------------------------------------------
// CATALOG
// ---------------------------------------------------------------------------

export const WIDGETS: WidgetDef[] = [
  // --- KPI tiles ---
  {
    id: "kpi-units",
    title: "Total Units",
    description: "Portfolio unit count across all properties.",
    category: "kpi",
    size: 1,
    render: (d) => <Kpi label="Total Units" value={d.kpis.units.toLocaleString()} sub={d.scoped ? "in this property" : <><span className="f5-up">▲ 3.2%</span> vs prior period</>} />,
  },
  {
    id: "kpi-occupancy",
    title: "Occupancy Rate",
    description: "Occupied units as a share of total.",
    category: "kpi",
    size: 1,
    render: (d) => <Kpi label="Occupancy Rate" value={`${d.kpis.occupancyPct}%`} sub={d.scoped ? "target: 95%" : <><span className="f5-up">▲ 1.1%</span> target: 95%</>} />,
  },
  {
    id: "kpi-open-wos",
    title: "Open Work Orders",
    description: "Unresolved work orders, with overdue count.",
    category: "kpi",
    size: 1,
    render: (d) => <Kpi label="Open Work Orders" tone="warn" value={String(d.kpis.openWorkOrders)} sub={<><span className="f5-down">{d.kpis.overdueWorkOrders}</span> overdue</>} />,
  },
  {
    id: "kpi-signage",
    title: "Signage Uptime",
    description: "Digital-display fleet availability.",
    category: "kpi",
    size: 1,
    render: (d) => <Kpi label="Signage Uptime" value={`${d.kpis.signageUptimePct}%`} sub={<>{!d.scoped && <><span className="f5-up">▲ 0.8%</span> </>}{d.kpis.displaysOnline}/{d.kpis.displaysTotal} online</>} />,
  },
  {
    id: "kpi-messages",
    title: "Messages Today",
    description: "Resident messages sent today.",
    category: "kpi",
    size: 1,
    render: (d) => <Kpi label="Messages Today" value={d.kpis.messagesToday.toLocaleString()} sub={d.scoped ? "sent today" : <><span className="f5-up">▲ 12%</span> vs yesterday</>} />,
  },
  {
    id: "kpi-broadcasts",
    title: "Active Broadcasts",
    description: "Scheduled and in-flight broadcasts.",
    category: "kpi",
    size: 1,
    render: (d) => <Kpi label="Active Broadcasts" value={String(d.kpis.activeBroadcasts)} sub="scheduled & sending" />,
  },
  {
    id: "kpi-delivery",
    title: "Delivery Rate",
    description: "Share of messages successfully delivered.",
    category: "kpi",
    size: 1,
    render: (d) => <Kpi label="Delivery Rate" value={`${d.kpis.deliveryRatePct}%`} sub={d.scoped ? "7-day avg" : <><span className="f5-up">▲ 0.3%</span> 7-day avg</>} />,
  },
  {
    id: "kpi-residents",
    title: "Active Residents",
    description: "Count of active residents in the portfolio.",
    category: "kpi",
    size: 1,
    render: (d) => <Kpi label="Active Residents" value={d.kpis.residents.toLocaleString()} sub="across all properties" />,
  },

  // --- charts / trends ---
  {
    id: "trend-occupancy",
    title: "Occupancy Trend",
    description: "Occupancy over the last six months.",
    category: "operations",
    size: 2,
    render: (d) => (
      <>
        <div className="f5-section-title" style={{ margin: "0 0 4px" }}>Occupancy Trend — 6 Months</div>
        <Bars data={d.trend} max={Math.max(...d.trend.map((t) => t.value), 1)} />
      </>
    ),
  },
  {
    id: "message-volume",
    title: "Message Volume by Channel",
    description: "Sent vs delivered across delivery channels.",
    category: "comms",
    size: 2,
    render: (d) => {
      const max = Math.max(...d.byChannel.map((c) => c.sent), 1);
      return (
        <>
          <div className="f5-section-title" style={{ margin: "0 0 10px" }}>Message Volume by Channel</div>
          {d.byChannel.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--f5-text-muted)" }}>No channel activity yet.</div>
          ) : d.byChannel.map((c) => (
            <ProgressRow
              key={c.channel}
              name={`${c.channel.toUpperCase()} — ${c.delivered}/${c.sent}`}
              pct={Math.round((c.sent / max) * 100)}
            />
          ))}
        </>
      );
    },
  },

  // --- compliance ---
  {
    id: "compliance-score",
    title: "Portfolio Compliance Score",
    description: "Average compliance across the portfolio.",
    category: "compliance",
    size: 1,
    render: (d) => (
      <>
        <div className="f5-section-title" style={{ marginTop: 0 }}>Compliance Score</div>
        <Donut pct={d.kpis.avgCompliancePct} label="Portfolio average" sub="Across active programs" />
      </>
    ),
  },
  {
    id: "compliance-status",
    title: "Regulatory Compliance",
    description: "Status bars per regulatory program.",
    category: "compliance",
    size: 2,
    render: (d) => (
      <>
        <div className="f5-section-title" style={{ marginTop: 0 }}>Regulatory Compliance</div>
        {d.compliance.slice(0, 6).map((c) => (
          <ProgressRow key={c.name} name={c.name} pct={c.pct} color={scoreColor(c.pct)} />
        ))}
      </>
    ),
  },

  // --- operations ---
  {
    id: "work-order-summary",
    title: "Work Order Summary",
    description: "Most recent open work orders.",
    category: "operations",
    size: 2,
    render: (d) => (
      <>
        <div className="f5-section-title" style={{ marginTop: 0 }}>Open Work Orders</div>
        {d.workOrders.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--f5-text-muted)" }}>No open work orders. 🎉</div>
        ) : d.workOrders.slice(0, 6).map((w, i) => (
          <div key={i} className="f5-feed-row">
            <span className="f5-dot" style={{ background: w.priority === "urgent" || w.priority === "high" ? "var(--f5-red)" : "var(--f5-amber)" }} />
            <div style={{ flex: 1 }}>
              <span style={{ color: "var(--f5-text)", fontWeight: 600 }}>{w.title}</span>
              <span style={{ color: "var(--f5-text-dim)" }}> · {w.propertyName}</span>
            </div>
            <span className="f5-pill" style={{ textTransform: "capitalize" }}>{w.priority}</span>
          </div>
        ))}
      </>
    ),
  },

  // --- activity ---
  {
    id: "activity-feed",
    title: "Recent Activity",
    description: "Latest broadcasts, alerts and system events.",
    category: "activity",
    size: 2,
    render: (d) => (
      <>
        <div className="f5-section-title" style={{ marginTop: 0 }}>Recent Activity</div>
        {d.feed.map((e, i) => (
          <div key={i} className="f5-feed-row">
            <span className="f5-dot" style={{ background: TONE_COLOR[e.tone] }} />
            <div style={{ flex: 1 }}>
              <span style={{ color: "var(--f5-text)", fontWeight: 600 }}>{e.action}</span>
              {e.detail ? ` — ${e.detail}` : ""}
              <span style={{ color: "var(--f5-text-dim)" }}> · {e.actor}</span>
            </div>
            <div style={{ color: "var(--f5-text-dim)", fontSize: 12 }}>{e.when}</div>
          </div>
        ))}
      </>
    ),
  },

  // --- portfolio ---
  {
    id: "property-rollup",
    title: "Property Rollup",
    description: "Compact occupancy + compliance table for every property.",
    category: "portfolio",
    size: 2,
    render: (d) => (
      <>
        <div className="f5-section-title" style={{ marginTop: 0 }}>Property Rollup</div>
        <div style={{ overflowX: "auto" }}>
          <table className="f5-table">
            <thead><tr><th>Property</th><th>Units</th><th>Occ.</th><th>WOs</th><th>Compliance</th></tr></thead>
            <tbody>
              {d.properties.map((p) => (
                <tr key={p.id}>
                  <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{p.name}</td>
                  <td>{p.units}</td>
                  <td>{p.occupancyPct}%</td>
                  <td>{p.openWorkOrders}</td>
                  <td style={{ color: scoreColor(p.compliancePct) }}>{p.compliancePct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    ),
  },
];

// Fast lookup by id.
export const WIDGET_MAP: Record<string, WidgetDef> = Object.fromEntries(WIDGETS.map((w) => [w.id, w]));

/** Sensible starter dashboard: the four headline KPIs pinned, then trend + ops + activity. */
export const DEFAULT_WIDGET_IDS: { id: string; pinned: boolean }[] = [
  { id: "kpi-units", pinned: true },
  { id: "kpi-occupancy", pinned: true },
  { id: "kpi-open-wos", pinned: true },
  { id: "kpi-signage", pinned: true },
  { id: "trend-occupancy", pinned: false },
  { id: "compliance-status", pinned: false },
  { id: "work-order-summary", pinned: false },
  { id: "activity-feed", pinned: false },
];

/** Widgets grouped by category, for the "Add widget" picker. */
export function widgetsByCategory(): { category: WidgetCategory; widgets: WidgetDef[] }[] {
  const order: WidgetCategory[] = ["kpi", "operations", "comms", "compliance", "portfolio", "activity"];
  return order
    .map((category) => ({ category, widgets: WIDGETS.filter((w) => w.category === category) }))
    .filter((g) => g.widgets.length > 0);
}
