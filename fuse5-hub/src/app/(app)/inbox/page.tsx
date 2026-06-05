import { getInbox } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { InboxList } from "./inbox-list";

export default async function InboxPage() {
  const [replies, me] = await Promise.all([getInbox(), getCurrentUser()]);
  const canEdit = me?.role ? canPublish(me.role) : false;
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

      <InboxList replies={replies} canEdit={canEdit} />
    </main>
  );
}
