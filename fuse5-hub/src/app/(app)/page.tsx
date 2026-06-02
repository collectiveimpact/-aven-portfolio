import { getOverview } from "@/lib/data";

// EXEMPLAR PAGE — section agents copy this pattern:
//  - async server component
//  - pull data from @/lib (demo fallback baked in)
//  - render with .f5-* design-system classes
const toneColor: Record<string, string> = { ok: "var(--f5-green)", warn: "var(--f5-amber)", alert: "var(--f5-red)" };

export default async function OverviewPage() {
  const d = await getOverview();
  const maxTrend = Math.max(...d.trend.map((t) => t.value), 1);

  return (
    <main className="f5-content">
      <div className="f5-page-title">Portfolio Overview</div>
      <div className="f5-page-sub">{d.orgName} — live across all properties.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Total Units</div><div className="f5-kpi-value">{d.kpis.units.toLocaleString()}</div><div className="f5-kpi-sub"><span className="f5-up">▲ 3.2%</span> vs prior period</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Occupancy Rate</div><div className="f5-kpi-value">{d.kpis.occupancy}%</div><div className="f5-kpi-sub"><span className="f5-up">▲ 1.1%</span> target: 95%</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Open Work Orders</div><div className="f5-kpi-value f5-warn">{d.kpis.openWorkOrders}</div><div className="f5-kpi-sub"><span className="f5-down">12</span> 7 overdue</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Signage Uptime</div><div className="f5-kpi-value">{d.kpis.signageUptime}%</div><div className="f5-kpi-sub"><span className="f5-up">▲ 0.8%</span> 29/31 online</div></div>
      </div>

      <div className="f5-section-title">Active Alerts</div>
      <div className="f5-card">
        {d.alerts.map((a, i) => (
          <div key={i} className="f5-feed-row">
            <span className="f5-dot" style={{ background: toneColor[a.tone] }} />
            <div style={{ flex: 1 }}>
              <div><strong>{a.title}</strong> — {a.detail}</div>
            </div>
            <div style={{ color: "var(--f5-text-dim)", fontSize: 12 }}>{a.when}</div>
          </div>
        ))}
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "1fr", marginTop: 18 }}>
        <div className="f5-card">
          <div className="f5-section-title" style={{ margin: "0 0 4px" }}>Occupancy Trend — 6 Months</div>
          <div className="f5-bars">
            {d.trend.map((t) => (
              <div key={t.label} className="f5-bar" style={{ height: `${Math.round((t.value / maxTrend) * 100)}%` }}>
                <span>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>
        Data source: {d.source === "live" ? "Fuse5 backend (live)" : "demo seed"}
      </div>
    </main>
  );
}
