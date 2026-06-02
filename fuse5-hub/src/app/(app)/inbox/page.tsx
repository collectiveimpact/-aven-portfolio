import type { Channel } from "@/lib/types";
import { getInbox, type InboundRow } from "@/lib/queries";

const channelLabel: Record<Channel, string> = {
  email: "Email", sms: "SMS", whatsapp: "WhatsApp", voice: "Voice", display: "Display",
};

const statusDot: Record<InboundRow["status"], string> = {
  unread: "var(--f5-amber)",
  awaiting: "var(--f5-blue)",
  resolved: "var(--f5-green)",
};

export default async function InboxPage() {
  const replies = await getInbox();
  const unread = replies.filter((r) => r.status === "unread").length;
  const awaiting = replies.filter((r) => r.status === "awaiting").length;
  const resolved = replies.filter((r) => r.status === "resolved").length;

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
        {replies.length === 0 && <div style={{ color: "var(--f5-text-muted)", fontSize: 13 }}>No inbound messages yet.</div>}
        {replies.map((r) => (
          <div key={r.id} className="f5-feed-row">
            <span className="f5-dot" style={{ background: statusDot[r.status] }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div>
                <strong>{r.sender}</strong>{" "}
                <span style={{ color: "var(--f5-text-dim)" }}>· Unit {r.unit}</span>{" "}
                <span className="f5-pill" style={{ marginLeft: 6 }}>{channelLabel[r.channel as Channel] ?? r.channel}</span>
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
