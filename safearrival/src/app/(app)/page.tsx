import { getDashboardData } from "@/lib/data";

const toneColor: Record<string, string> = {
  ok: "var(--f5-green)",
  warn: "var(--f5-amber)",
  alert: "var(--f5-red)",
};

export default async function DashboardPage() {
  const d = await getDashboardData();
  const maxTrend = Math.max(...d.weeklyTrend.map((t) => t.value), 1);

  return (
    <main className="sa-content">
      <div className="sa-greeting">SafeArrival Dashboard</div>
      <div className="sa-greeting-sub">
        {d.orgName} — youth program overview. {d.kpis.escalating} absence alert
        {d.kpis.escalating === 1 ? "" : "s"} need attention.
      </div>

      {/* Program filter chips */}
      <div className="sa-chips" style={{ marginTop: 18 }}>
        <span className="sa-chip active">All Programs ({d.programs.length})</span>
        {d.programs.slice(0, 6).map((p) => (
          <span key={p.id} className="sa-chip">{p.name}</span>
        ))}
      </div>

      {/* KPIs */}
      <div className="sa-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginTop: 18 }}>
        <div className="sa-card">
          <div className="sa-kpi-label">Total Present</div>
          <div className="sa-kpi-value">{d.kpis.present.toLocaleString()}</div>
          <div className="sa-kpi-sub"><span className="sa-up">▲ {d.kpis.presentPct}%</span> of {d.kpis.enrolled.toLocaleString()} enrolled</div>
        </div>
        <div className="sa-card">
          <div className="sa-kpi-label">Active Alerts</div>
          <div className="sa-kpi-value sa-warn">{d.kpis.activeAlerts}</div>
          <div className="sa-kpi-sub"><span className="sa-down">{d.kpis.escalating} escalating</span> across programs</div>
        </div>
        <div className="sa-card">
          <div className="sa-kpi-label">Checked Out</div>
          <div className="sa-kpi-value">{d.kpis.checkedOut}</div>
          <div className="sa-kpi-sub">all verified to guardian</div>
        </div>
        <div className="sa-card">
          <div className="sa-kpi-label">Parent Response</div>
          <div className="sa-kpi-value">{d.kpis.parentResponsePct}%</div>
          <div className="sa-kpi-sub"><span className="sa-up">▲ 2.6%</span> across all programs</div>
        </div>
      </div>

      {/* Trend + activity */}
      <div className="sa-grid" style={{ gridTemplateColumns: "1.6fr 1fr", marginTop: 18 }}>
        <div className="sa-card">
          <div className="sa-section-title" style={{ margin: "0 0 4px" }}>Weekly Attendance Trend</div>
          <div className="sa-bars">
            {d.weeklyTrend.map((t) => (
              <div key={t.label} className="sa-bar" style={{ height: `${Math.round((t.value / maxTrend) * 100)}%` }}>
                <span>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="sa-card">
          <div className="sa-section-title" style={{ margin: "0 0 6px" }}>Live Activity</div>
          {d.activity.map((a, i) => (
            <div key={i} className="sa-feed-row">
              <span className="sa-dot" style={{ background: toneColor[a.tone] }} />
              <div>
                <div><strong>{a.who}</strong> {a.what}</div>
                <div style={{ color: "var(--f5-text-muted)", fontSize: 12 }}>{a.program} · {a.when}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>
        Data source: {d.source === "live" ? "SafeArrival backend (live)" : "demo seed"}
      </div>
    </main>
  );
}
