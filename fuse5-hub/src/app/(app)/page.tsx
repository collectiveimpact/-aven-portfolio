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

      {/* Upcoming Inspections & Violations */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="f5-section-title" style={{ margin: 0 }}>Upcoming Inspections &amp; Violations</div>
        <a className="f5-btn" href="/compliance" style={{ padding: "5px 12px", fontSize: 12 }}>View All</a>
      </div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead><tr><th>Building</th><th>Type</th><th>Authority</th><th>Due</th><th>Status</th><th>Score</th></tr></thead>
          <tbody>
            {INSPECTIONS.map((r) => (
              <tr key={r.building + r.type}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{r.building}</td>
                <td>{r.type}</td>
                <td style={{ color: "var(--f5-text-muted)" }}>{r.authority}</td>
                <td>{r.due}</td>
                <td><span className={`f5-badge ${r.tone}`}>{r.status}</span></td>
                <td style={{ color: r.score >= 85 ? "var(--f5-green,#34d399)" : r.score >= 60 ? "#f59e0b" : "var(--f5-red,#f87171)" }}>{r.score}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Building Roster */}
      <div className="f5-section-title">Building Roster</div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead><tr><th>Property</th><th>Units</th><th>Occupancy</th><th>Displays</th><th>WOs Open</th><th>Compliance</th></tr></thead>
          <tbody>
            {ROSTER.map((r) => (
              <tr key={r.property}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{r.property}</td>
                <td>{r.units}</td>
                <td>{r.occupancy}%</td>
                <td>{r.displays}</td>
                <td>{r.wos}</td>
                <td style={{ color: r.compliance >= 85 ? "var(--f5-green,#34d399)" : "#f59e0b" }}>{r.compliance}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>
        Data source: {d.source === "live" ? "Fuse5 backend (live)" : "demo seed"}
      </div>
    </main>
  );
}

const INSPECTIONS: { building: string; type: string; authority: string; due: string; status: string; tone: string; score: number }[] = [
  { building: "WoodGreen — East York", type: "RentSafeTO", authority: "City of Toronto", due: "Apr 17, 2026", status: "Due Soon", tone: "warn", score: 91 },
  { building: "WoodGreen — Danforth", type: "Fire Safety", authority: "Ontario Fire", due: "May 2, 2026", status: "Scheduled", tone: "", score: 95 },
  { building: "Neighbours — Main St W", type: "AODA Accessibility", authority: "Province of Ontario", due: "May 15, 2026", status: "Open Violation", tone: "danger", score: 62 },
  { building: "Kiwanis — King St", type: "Hamilton SAB", authority: "City of Hamilton", due: "Jun 3, 2026", status: "Scheduled", tone: "", score: 85 },
];
const ROSTER: { property: string; units: number; occupancy: number; displays: number; wos: number; compliance: number }[] = [
  { property: "WoodGreen — Danforth", units: 142, occupancy: 96, displays: 6, wos: 4, compliance: 91 },
  { property: "WoodGreen — East York", units: 98, occupancy: 94, displays: 4, wos: 8, compliance: 76 },
  { property: "WoodGreen — Riverdale", units: 76, occupancy: 98, displays: 3, wos: 2, compliance: 94 },
];
