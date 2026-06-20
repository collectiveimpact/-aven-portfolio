// Operations Dashboard — live ops KPIs, weekly trend, activity feed + the
// command-center layer (sparkline stats, quick actions, AI insights, compliance).
import { getDashboardStats } from "@/lib/queries";
import { CommandCenter } from "./command-center";

const TREND: { label: string; value: number }[] = [
  { label: "Mon", value: 1240 },
  { label: "Tue", value: 1580 },
  { label: "Wed", value: 1390 },
  { label: "Thu", value: 1820 },
  { label: "Fri", value: 2110 },
  { label: "Sat", value: 940 },
  { label: "Sun", value: 760 },
];

const TONE_COLOR: Record<"ok" | "warn" | "alert", string> = {
  ok: "var(--f5-green)",
  warn: "var(--f5-amber)",
  alert: "var(--f5-red)",
};

export default async function DashboardPage() {
  const stats = await getDashboardStats();
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
        <div className="f5-card"><div className="f5-kpi-label">Messages Today</div><div className="f5-kpi-value">{stats.messagesSent.toLocaleString()}</div><div className="f5-kpi-sub"><span className="f5-up">▲ 12%</span> vs yesterday</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Active Broadcasts</div><div className="f5-kpi-value">{stats.activeBroadcasts}</div><div className="f5-kpi-sub">scheduled &amp; sending</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Response Rate</div><div className="f5-kpi-value">62.4%</div><div className="f5-kpi-sub"><span className="f5-up">▲ 4.1%</span> 7-day avg</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Open Work Orders</div><div className="f5-kpi-value f5-warn">{stats.openWorkOrders}</div><div className="f5-kpi-sub"><span className="f5-down">7</span> overdue</div></div>
      </div>

      <CommandCenter />

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
        {stats.feed.map((e, i) => (
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
      </div>

      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>
        Data source: {stats.source === "live" ? "live" : "demo seed"}
      </div>
    </main>
  );
}
