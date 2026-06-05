import type { Channel } from "@/lib/types";
import { getMessageStats, getAuditReport } from "@/lib/queries";

// Messaging analytics — live delivery aggregates with demo fallback.
const channelLabel: Record<Channel, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  voice: "Voice",
  display: "Display",
};

const trend = [
  { label: "Wk 1", value: 18200 },
  { label: "Wk 2", value: 19100 },
  { label: "Wk 3", value: 20400 },
  { label: "Wk 4", value: 19800 },
  { label: "Wk 5", value: 21600 },
  { label: "Wk 6", value: 22300 },
  { label: "Wk 7", value: 21100 },
];

export default async function AnalyticsPage() {
  const [stats, audit] = await Promise.all([getMessageStats(), getAuditReport()]);
  const maxTrend = Math.max(...trend.map((t) => t.value), 1);

  return (
    <main className="f5-content">
      <div className="f5-page-title">Analytics</div>
      <div className="f5-page-sub">Delivery and engagement across all messaging channels.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Messages Sent</div><div className="f5-kpi-value">{stats.sent.toLocaleString()}</div><div className="f5-kpi-sub"><span className="f5-up">▲ 6.1%</span> vs prior period</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Delivery Rate</div><div className="f5-kpi-value">{stats.deliveryRatePct}%</div><div className="f5-kpi-sub"><span className="f5-up">▲ 0.4%</span> target: 97%</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Open Rate</div><div className="f5-kpi-value">54.7%</div><div className="f5-kpi-sub"><span className="f5-up">▲ 2.3%</span> blended</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Click Rate</div><div className="f5-kpi-value">12.4%</div><div className="f5-kpi-sub"><span className="f5-down">▼ 0.6%</span> vs prior period</div></div>
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "1fr", marginTop: 18 }}>
        <div className="f5-card">
          <div className="f5-section-title" style={{ margin: "0 0 4px" }}>Messages Sent — Last 7 Weeks</div>
          <div className="f5-bars">
            {trend.map((t) => (
              <div key={t.label} className="f5-bar" style={{ height: `${Math.round((t.value / maxTrend) * 100)}%` }}>
                <span>{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="f5-section-title">By Channel</div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead>
            <tr><th>Channel</th><th>Sent</th><th>Delivered</th><th>Open %</th></tr>
          </thead>
          <tbody>
            {stats.byChannel.map((c) => (
              <tr key={c.channel}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{channelLabel[c.channel as Channel] ?? c.channel}</td>
                <td>{c.sent.toLocaleString()}</td>
                <td>{c.delivered.toLocaleString()}</td>
                <td>—</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Audit Reports — proof-of-play + delivery audit (formal reporting) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }}>
        <div className="f5-section-title" style={{ margin: 0 }}>Tenant Notification Audit — {audit.period}</div>
        <a className="f5-btn" href="/analytics/audit-report" target="_blank" rel="noopener">⬇ Download PDF</a>
      </div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 4 }}>
        <div className="f5-card"><div className="f5-kpi-label">Total Notifications</div><div className="f5-kpi-value">{audit.totalNotifications.toLocaleString()}</div><div className="f5-kpi-sub">sent this period</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Delivery Rate</div><div className="f5-kpi-value">{audit.deliveryRatePct}%</div><div className="f5-kpi-sub">{audit.delivered.toLocaleString()} delivered</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Signage Proof-of-Play</div><div className="f5-kpi-value">{audit.proofOfPlay.toLocaleString()}</div><div className="f5-kpi-sub">notices displayed</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Acknowledgements</div><div className="f5-kpi-value">{audit.acknowledgements.toLocaleString()}</div><div className="f5-kpi-sub">tenant confirmations</div></div>
      </div>
      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 14 }}>
        Audit source: {audit.source === "live" ? "live message/delivery logs" : "demo"} · Generated {audit.period} · ca-central-1
      </div>
    </main>
  );
}
