import type { Channel } from "@/lib/types";

interface InboundReply {
  id: string;
  sender: string;
  unit: string;
  channel: Channel;
  snippet: string;
  when: string;
  status: "unread" | "awaiting" | "resolved";
}

const REPLIES: InboundReply[] = [
  { id: "r1", sender: "Amara Okafor", unit: "A-1204", channel: "sms", snippet: "Is the water back on yet? My unit is still dry.", when: "3m ago", status: "unread" },
  { id: "r2", sender: "Jean-Luc Tremblay", unit: "B-0307", channel: "email", snippet: "Merci pour l'avis. Le stationnement sera-t-il fermé aussi?", when: "11m ago", status: "unread" },
  { id: "r3", sender: "Priya Sharma", unit: "A-0815", channel: "whatsapp", snippet: "The elevator notice — does that include the freight elevator?", when: "26m ago", status: "unread" },
  { id: "r4", sender: "Marcus Webb", unit: "C-1102", channel: "sms", snippet: "Got it, thanks for the heads up on the inspection.", when: "48m ago", status: "awaiting" },
  { id: "r5", sender: "Fatima Hassan", unit: "B-0511", channel: "email", snippet: "Can you confirm the pest control date works for evening shifts?", when: "1h ago", status: "awaiting" },
  { id: "r6", sender: "Diego Morales", unit: "A-0402", channel: "sms", snippet: "Rent reminder received — paying today.", when: "2h ago", status: "resolved" },
  { id: "r7", sender: "Sofia Rossi", unit: "C-0908", channel: "whatsapp", snippet: "Thank you, that resolved my question about the newsletter.", when: "3h ago", status: "resolved" },
  { id: "r8", sender: "Liam O'Brien", unit: "B-1207", channel: "email", snippet: "Following up — still haven't heard back on the lease renewal.", when: "5h ago", status: "awaiting" },
];

const channelLabel: Record<Channel, string> = {
  email: "Email", sms: "SMS", whatsapp: "WhatsApp", voice: "Voice", display: "Display",
};

const statusDot: Record<InboundReply["status"], string> = {
  unread: "var(--f5-amber)",
  awaiting: "var(--f5-blue)",
  resolved: "var(--f5-green)",
};

export default async function InboxPage() {
  const unread = REPLIES.filter((r) => r.status === "unread").length;
  const awaiting = REPLIES.filter((r) => r.status === "awaiting").length;
  const resolved = REPLIES.filter((r) => r.status === "resolved").length;

  return (
    <main className="f5-content">
      <div className="f5-page-title">Inbox</div>
      <div className="f5-page-sub">Inbound resident replies across all channels.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Unread</div><div className="f5-kpi-value f5-warn">{unread}</div><div className="f5-kpi-sub">needs first response</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Awaiting Reply</div><div className="f5-kpi-value">{awaiting}</div><div className="f5-kpi-sub">in progress</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Resolved</div><div className="f5-kpi-value"><span className="f5-up">{resolved}</span></div><div className="f5-kpi-sub">last 24h</div></div>
      </div>

      <div className="f5-section-title">Recent Replies</div>
      <div className="f5-card">
        {REPLIES.map((r) => (
          <div key={r.id} className="f5-feed-row">
            <span className="f5-dot" style={{ background: statusDot[r.status] }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div>
                <strong>{r.sender}</strong>{" "}
                <span style={{ color: "var(--f5-text-dim)" }}>· {r.unit}</span>{" "}
                <span className="f5-pill" style={{ marginLeft: 6 }}>{channelLabel[r.channel]}</span>
                {r.status === "unread" && <span className="f5-badge warn" style={{ marginLeft: 6 }}>Unread</span>}
              </div>
              <div style={{ color: "var(--f5-text-secondary)", marginTop: 4 }}>{r.snippet}</div>
            </div>
            <div style={{ color: "var(--f5-text-dim)", fontSize: 12, whiteSpace: "nowrap" }}>{r.when}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
