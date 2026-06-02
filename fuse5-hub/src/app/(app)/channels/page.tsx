import type { Channel } from "@/lib/types";

interface ChannelCard {
  key: Channel;
  name: string;
  ico: string;
  status: "ok" | "warn";
  statusLabel: string;
  settings: { label: string; value: string }[];
}

const CHANNELS: ChannelCard[] = [
  {
    key: "email", name: "Email", ico: "✉️", status: "ok", statusLabel: "Connected",
    settings: [
      { label: "Provider", value: "Postmark" },
      { label: "From address", value: "broadcasts@fuse5hub.ca" },
      { label: "Deliverability", value: "98.7%" },
    ],
  },
  {
    key: "sms", name: "SMS", ico: "💬", status: "ok", statusLabel: "Connected",
    settings: [
      { label: "Provider", value: "Twilio" },
      { label: "Sender ID", value: "+1 (855) 392-0042" },
      { label: "Monthly cap", value: "12,000 / 25,000" },
    ],
  },
  {
    key: "whatsapp", name: "WhatsApp", ico: "🟢", status: "warn", statusLabel: "Pending review",
    settings: [
      { label: "Provider", value: "Meta Business" },
      { label: "Template approval", value: "2 of 5 approved" },
      { label: "Opt-in rate", value: "41%" },
    ],
  },
  {
    key: "voice", name: "Voice", ico: "📞", status: "ok", statusLabel: "Connected",
    settings: [
      { label: "Provider", value: "Twilio Voice" },
      { label: "Caller ID", value: "+1 (855) 392-0042" },
      { label: "Use", value: "Emergency only" },
    ],
  },
  {
    key: "display", name: "Digital Display", ico: "🖥️", status: "warn", statusLabel: "29 / 31 online",
    settings: [
      { label: "Network", value: "ScreenCloud" },
      { label: "Screens", value: "31 across 6 buildings" },
      { label: "Offline", value: "Lobby B, Garage C" },
    ],
  },
];

export default async function ChannelsPage() {
  return (
    <main className="f5-content">
      <div className="f5-page-title">Channels</div>
      <div className="f5-page-sub">Delivery channel configuration and health.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", marginTop: 18 }}>
        {CHANNELS.map((c) => (
          <div key={c.key} className="f5-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 20 }}>{c.ico}</span>
                <span style={{ fontWeight: 700, fontSize: 15, color: "var(--f5-text)" }}>{c.name}</span>
              </div>
              <span className={`f5-badge ${c.status}`}>{c.statusLabel}</span>
            </div>

            <div style={{ marginTop: 14 }}>
              {c.settings.map((s) => (
                <div key={s.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderBottom: "1px solid var(--f5-border)" }}>
                  <span style={{ color: "var(--f5-text-muted)" }}>{s.label}</span>
                  <span style={{ color: "var(--f5-text-secondary)" }}>{s.value}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 14 }}>
              <button className="f5-btn">Configure</button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
