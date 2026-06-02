// Operations Dashboard — live ops KPIs, weekly trend, activity feed. Demo data.
interface OpsEvent {
  tone: "ok" | "warn" | "alert";
  text: string;
  when: string;
}

const TREND: { label: string; value: number }[] = [
  { label: "Mon", value: 1240 },
  { label: "Tue", value: 1580 },
  { label: "Wed", value: 1390 },
  { label: "Thu", value: 1820 },
  { label: "Fri", value: 2110 },
  { label: "Sat", value: 940 },
  { label: "Sun", value: 760 },
];

const FEED: OpsEvent[] = [
  { tone: "ok", text: "June Rent Reminder delivered to 2,790 residents (98.0% delivery).", when: "08:12 AM" },
  { tone: "alert", text: "Display “East Lobby” went offline at WoodGreen East York.", when: "07:48 AM" },
  { tone: "warn", text: "SMS delivery rate dipped to 87% — carrier flagged.", when: "07:30 AM" },
  { tone: "ok", text: "Work order WO-1033 resolved — bathroom exhaust fan repaired.", when: "Yesterday" },
  { tone: "ok", text: "Resident Satisfaction Survey scheduled for Fri Jun 6.", when: "Yesterday" },
  { tone: "warn", text: "Compliance inspection due in 6 days — Hamilton Kiwanis Building B.", when: "Yesterday" },
  { tone: "ok", text: "Welcome Loop content refreshed across 9 lobby displays.", when: "2 days ago" },
];

const TONE_COLOR: Record<OpsEvent["tone"], string> = {
  ok: "var(--f5-green)",
  warn: "var(--f5-amber)",
  alert: "var(--f5-red)",
};

export default async function DashboardPage() {
  const maxTrend = Math.max(...TREND.map((t) => t.value), 1);

  return (
    <main className="f5-content">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div>
          <div className="f5-page-title">Operations Dashboard</div>
          <div className="f5-page-sub">Real-time comms and field operations.</div>
        </div>
        <span className="f5-live" style={{ marginLeft: "auto" }}>Live</span>
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Messages Today</div><div className="f5-kpi-value">9,840</div><div className="f5-kpi-sub"><span className="f5-up">▲ 12%</span> vs yesterday</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Active Broadcasts</div><div className="f5-kpi-value">3</div><div className="f5-kpi-sub">2 scheduled, 1 sending</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Response Rate</div><div className="f5-kpi-value">62.4%</div><div className="f5-kpi-sub"><span className="f5-up">▲ 4.1%</span> 7-day avg</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Open Work Orders</div><div className="f5-kpi-value f5-warn">47</div><div className="f5-kpi-sub"><span className="f5-down">7</span> overdue</div></div>
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "1fr", marginTop: 18 }}>
        <div className="f5-card">
          <div className="f5-section-title" style={{ margin: "0 0 4px" }}>Messages Sent — This Week</div>
          <div className="f5-bars">
            {TREND.map((t) => (
              <div key={t.label} className="f5-bar" style={{ height: `${Math.round((t.value / maxTrend) * 100)}%` }}>
                <span>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="f5-section-title">Activity Feed</div>
      <div className="f5-card">
        {FEED.map((e, i) => (
          <div key={i} className="f5-feed-row">
            <span className="f5-dot" style={{ background: TONE_COLOR[e.tone] }} />
            <div style={{ flex: 1 }}>{e.text}</div>
            <div style={{ color: "var(--f5-text-dim)", fontSize: 12 }}>{e.when}</div>
          </div>
        ))}
      </div>

      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>
        Data source: demo seed
      </div>
    </main>
  );
}
