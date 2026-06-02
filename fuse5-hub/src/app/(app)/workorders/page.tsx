import Link from "next/link";
import { getWorkOrders, type WorkOrderRow } from "@/lib/queries";

// Work Orders — KPI strip + filter chips + work-order table. Live data.
type Filter = "all" | "open" | "urgent";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "urgent", label: "Urgent" },
];

const PRIORITY_BADGE: Record<WorkOrderRow["priority"], string> = {
  urgent: "f5-badge bad",
  high: "f5-badge warn",
  medium: "f5-badge",
  low: "f5-badge",
};

const STATUS_BADGE: Record<WorkOrderRow["status"], string> = {
  open: "f5-badge warn",
  in_progress: "f5-badge",
  resolved: "f5-badge ok",
};

const STATUS_LABEL: Record<WorkOrderRow["status"], string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | undefined }>;
}) {
  const sp = await searchParams;
  const rawFilter = sp.filter;
  const active: Filter = rawFilter === "open" || rawFilter === "urgent" ? rawFilter : "all";

  const workOrders = await getWorkOrders();

  const open = workOrders.filter((w) => w.status === "open").length;
  const inProgress = workOrders.filter((w) => w.status === "in_progress").length;
  const overdue = workOrders.filter((w) => w.status !== "resolved" && (w.priority === "urgent" || w.priority === "high")).length;
  const resolved = workOrders.filter((w) => w.status === "resolved").length;

  const rows = workOrders.filter((w) => {
    if (active === "open") return w.status === "open";
    if (active === "urgent") return w.priority === "urgent";
    return true;
  });

  return (
    <main className="f5-content">
      <div className="f5-page-title">Work Orders</div>
      <div className="f5-page-sub">Maintenance requests across all properties.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Open</div><div className="f5-kpi-value f5-warn">{open}</div><div className="f5-kpi-sub">awaiting assignment</div></div>
        <div className="f5-card"><div className="f5-kpi-label">In Progress</div><div className="f5-kpi-value">{inProgress}</div><div className="f5-kpi-sub">crews dispatched</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Overdue</div><div className="f5-kpi-value f5-down">{overdue}</div><div className="f5-kpi-sub"><span className="f5-down">past SLA</span> high &amp; urgent</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Resolved</div><div className="f5-kpi-value">{resolved}</div><div className="f5-kpi-sub">closed out</div></div>
      </div>

      <div className="f5-section-title">Queue</div>
      <div className="f5-chips" style={{ marginBottom: 14 }}>
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? "/workorders" : `/workorders?filter=${f.key}`}
            className={`f5-chip${active === f.key ? " active" : ""}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="f5-card" style={{ padding: 0 }}>
        <table className="f5-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Property / Unit</th>
              <th>Category</th>
              <th>Priority</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id}>
                <td style={{ color: "var(--f5-text)" }}>{w.title}</td>
                <td>{w.propertyName} · {w.unit}</td>
                <td>{w.category}</td>
                <td><span className={PRIORITY_BADGE[w.priority]}>{w.priority}</span></td>
                <td><span className={STATUS_BADGE[w.status]}>{STATUS_LABEL[w.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>
        Data source: live
      </div>
    </main>
  );
}
