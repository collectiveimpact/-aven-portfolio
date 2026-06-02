import Link from "next/link";
import type { WorkOrder } from "@/lib/types";

// Work Orders — KPI strip + filter chips + work-order table. Demo data.
type Filter = "all" | "open" | "urgent";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "urgent", label: "Urgent" },
];

const ORG = "demo-org";

const WORK_ORDERS: (WorkOrder & { property: string })[] = [
  { id: "wo-1041", org_id: ORG, property_id: "p1", property: "WoodGreen East York", unit: "412", title: "Heating not working in unit", category: "HVAC", priority: "urgent", status: "open", created_at: "2026-05-28" },
  { id: "wo-1040", org_id: ORG, property_id: "p1", property: "WoodGreen East York", unit: "Lobby", title: "Front entrance door sensor faulty", category: "Access", priority: "high", status: "in_progress", created_at: "2026-05-27" },
  { id: "wo-1039", org_id: ORG, property_id: "p2", property: "HNHC Riverdale", unit: "208", title: "Leaking kitchen faucet", category: "Plumbing", priority: "medium", status: "open", created_at: "2026-05-27" },
  { id: "wo-1038", org_id: ORG, property_id: "p2", property: "HNHC Riverdale", unit: "115", title: "Pest control follow-up", category: "Pest", priority: "high", status: "open", created_at: "2026-05-25" },
  { id: "wo-1037", org_id: ORG, property_id: "p3", property: "Hamilton Kiwanis", unit: "B-301", title: "Smoke detector chirping", category: "Safety", priority: "urgent", status: "open", created_at: "2026-05-24" },
  { id: "wo-1036", org_id: ORG, property_id: "p1", property: "WoodGreen East York", unit: "509", title: "Elevator inspection overdue", category: "Elevator", priority: "high", status: "in_progress", created_at: "2026-05-23" },
  { id: "wo-1035", org_id: ORG, property_id: "p2", property: "HNHC Riverdale", unit: "Common", title: "Hallway light fixtures out", category: "Electrical", priority: "medium", status: "in_progress", created_at: "2026-05-22" },
  { id: "wo-1034", org_id: ORG, property_id: "p3", property: "Hamilton Kiwanis", unit: "A-104", title: "Window seal replacement", category: "General", priority: "low", status: "open", created_at: "2026-05-21" },
  { id: "wo-1033", org_id: ORG, property_id: "p1", property: "WoodGreen East York", unit: "302", title: "Bathroom exhaust fan repair", category: "HVAC", priority: "medium", status: "resolved", created_at: "2026-05-19" },
  { id: "wo-1032", org_id: ORG, property_id: "p2", property: "HNHC Riverdale", unit: "Garage", title: "Parking gate stuck open", category: "Access", priority: "high", status: "resolved", created_at: "2026-05-18" },
  { id: "wo-1031", org_id: ORG, property_id: "p3", property: "Hamilton Kiwanis", unit: "B-220", title: "Carpet cleaning request", category: "General", priority: "low", status: "resolved", created_at: "2026-05-16" },
  { id: "wo-1030", org_id: ORG, property_id: "p1", property: "WoodGreen East York", unit: "601", title: "Water heater leak", category: "Plumbing", priority: "urgent", status: "in_progress", created_at: "2026-05-15" },
];

const PRIORITY_BADGE: Record<WorkOrder["priority"], string> = {
  urgent: "f5-badge bad",
  high: "f5-badge warn",
  medium: "f5-badge",
  low: "f5-badge",
};

const STATUS_BADGE: Record<WorkOrder["status"], string> = {
  open: "f5-badge warn",
  in_progress: "f5-badge",
  resolved: "f5-badge ok",
};

const STATUS_LABEL: Record<WorkOrder["status"], string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter: rawFilter } = await searchParams;
  const active: Filter = rawFilter === "open" || rawFilter === "urgent" ? rawFilter : "all";

  const open = WORK_ORDERS.filter((w) => w.status === "open").length;
  const inProgress = WORK_ORDERS.filter((w) => w.status === "in_progress").length;
  const overdue = 7;
  const avgResolution = "2.4d";

  const rows = WORK_ORDERS.filter((w) => {
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
        <div className="f5-card"><div className="f5-kpi-label">Overdue</div><div className="f5-kpi-value f5-down">{overdue}</div><div className="f5-kpi-sub"><span className="f5-down">past SLA</span> oldest 14d</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Avg Resolution</div><div className="f5-kpi-value">{avgResolution}</div><div className="f5-kpi-sub"><span className="f5-up">▼ 0.3d</span> vs last month</div></div>
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
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((w) => (
              <tr key={w.id}>
                <td style={{ color: "var(--f5-text)" }}>{w.title}</td>
                <td>{w.property} · {w.unit}</td>
                <td>{w.category}</td>
                <td><span className={PRIORITY_BADGE[w.priority]}>{w.priority}</span></td>
                <td><span className={STATUS_BADGE[w.status]}>{STATUS_LABEL[w.status]}</span></td>
                <td>{w.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>
        Data source: demo seed
      </div>
    </main>
  );
}
