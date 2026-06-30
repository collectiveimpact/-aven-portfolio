import Link from "next/link";
import type { WorkOrderRow, InboundRow } from "@/lib/queries";

// Frontline "My Day" home — operational, task-first (not exec KPIs). Surfaces the
// open work-order queue, incoming resident requests, and unread messages, with
// one-tap links into the tools a day-to-day staffer actually uses.
const PRIORITY_BADGE: Record<WorkOrderRow["priority"], string> = {
  urgent: "f5-badge bad", high: "f5-badge warn", medium: "f5-badge", low: "f5-badge",
};

export function FrontlineHome({
  openWO, requests, unread, overdue, queue, messages,
}: {
  openWO: number;
  requests: number;
  unread: number;
  overdue: number;
  queue: WorkOrderRow[];
  messages: InboundRow[];
}) {
  return (
    <>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 16 }}>
        <Link href="/workorders" className="f5-card" style={{ textDecoration: "none" }}>
          <div className="f5-kpi-label">Open Work Orders</div>
          <div className="f5-kpi-value">{openWO}</div>
          <div className="f5-kpi-sub">{overdue} overdue</div>
        </Link>
        <Link href="/workorders?source=portal" className="f5-card" style={{ textDecoration: "none" }}>
          <div className="f5-kpi-label">Resident Requests</div>
          <div className="f5-kpi-value f5-down">{requests}</div>
          <div className="f5-kpi-sub">need triage</div>
        </Link>
        <Link href="/inbox" className="f5-card" style={{ textDecoration: "none" }}>
          <div className="f5-kpi-label">Unread Messages</div>
          <div className="f5-kpi-value">{unread}</div>
          <div className="f5-kpi-sub">across channels</div>
        </Link>
        <Link href="/frontline" className="f5-card" style={{ textDecoration: "none" }}>
          <div className="f5-kpi-label">Submit a Request</div>
          <div className="f5-kpi-value" style={{ fontSize: 22 }}>＋ New</div>
          <div className="f5-kpi-sub">log a maintenance issue</div>
        </Link>
      </div>

      <div className="f5-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Work Queue</span>
        <Link href="/workorders" className="f5-btn" style={{ padding: "4px 10px", fontSize: 12 }}>Open Work Orders →</Link>
      </div>
      <div className="f5-card" style={{ padding: 0 }}>
        <table className="f5-table">
          <thead><tr><th>Request</th><th>Property / Unit</th><th>Priority</th><th>Source</th></tr></thead>
          <tbody>
            {queue.length === 0 && <tr><td colSpan={4} style={{ color: "var(--f5-text-muted)", textAlign: "center", padding: 20, fontSize: 13 }}>Nothing open — you're all caught up. 🎉</td></tr>}
            {queue.map((w) => (
              <tr key={w.id}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{w.title}</td>
                <td>{w.propertyName}{w.unit && w.unit !== "—" ? ` · ${w.unit}` : ""}</td>
                <td><span className={PRIORITY_BADGE[w.priority]}>{w.priority}</span></td>
                <td>{w.source === "portal" ? <span className="f5-badge ok">Resident</span> : <span style={{ color: "var(--f5-text-muted)" }}>Staff</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="f5-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Recent Resident Messages</span>
        <Link href="/inbox" className="f5-btn" style={{ padding: "4px 10px", fontSize: 12 }}>Open Inbox →</Link>
      </div>
      <div className="f5-card" style={{ padding: 0 }}>
        <table className="f5-table">
          <thead><tr><th>Resident</th><th>Unit</th><th>Message</th><th>When</th><th>Status</th></tr></thead>
          <tbody>
            {messages.length === 0 && <tr><td colSpan={5} style={{ color: "var(--f5-text-muted)", textAlign: "center", padding: 20, fontSize: 13 }}>No messages waiting.</td></tr>}
            {messages.map((m) => (
              <tr key={m.id}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{m.sender}</td>
                <td>{m.unit}</td>
                <td style={{ color: "var(--f5-text-muted)", maxWidth: 360, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.snippet}</td>
                <td style={{ color: "var(--f5-text-muted)" }}>{m.when}</td>
                <td><span className={`f5-badge ${m.status === "unread" ? "warn" : m.status === "awaiting" ? "" : "ok"}`}>{m.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
