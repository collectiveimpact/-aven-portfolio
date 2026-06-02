import type { Channel } from "@/lib/types";

// Messaging analytics — demo aggregates.
interface ChannelStat { channel: Channel; sent: number; delivered: number; openPct: number }

const channelStats: ChannelStat[] = [
  { channel: "email", sent: 86200, delivered: 84610, openPct: 41.8 },
  { channel: "sms", sent: 41800, delivered: 41560, openPct: 96.2 },
  { channel: "whatsapp", sent: 9300, delivered: 9180, openPct: 88.4 },
  { channel: "voice", sent: 3100, delivered: 2940, openPct: 72.1 },
  { channel: "display", sent: 2100, delivered: 2100, openPct: 100 },
];

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
  const maxTrend = Math.max(...trend.map((t) => t.value), 1);

  return (
    <main className="f5-content">
      <div className="f5-page-title">Analytics</div>
      <div className="f5-page-sub">Delivery and engagement across all messaging channels.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Messages Sent</div><div className="f5-kpi-value">142.5K</div><div className="f5-kpi-sub"><span className="f5-up">▲ 6.1%</span> vs prior period</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Delivery Rate</div><div className="f5-kpi-value">98.2%</div><div className="f5-kpi-sub"><span className="f5-up">▲ 0.4%</span> target: 97%</div></div>
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
            {channelStats.map((c) => (
              <tr key={c.channel}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{channelLabel[c.channel]}</td>
                <td>{c.sent.toLocaleString()}</td>
                <td>{c.delivered.toLocaleString()}</td>
                <td><span className="f5-up">{c.openPct.toFixed(1)}%</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
