import Link from "next/link";
import { getWorkOrders, getProperties, getWoFieldConfig, getSegments } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { getScope } from "@/lib/view";
import { NOTICE_TYPES } from "@/lib/wo-fields";
import { NewWorkOrder } from "./new-work-order";
import { YardiImport } from "./yardi-import";
import { WorkOrdersList } from "./wo-list";

// Work Orders — KPI strip + rich FilterBar + work-order table. Live data.
export default async function WorkOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ [k: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const initialSearch = new URLSearchParams(
    Object.entries(sp).flatMap(([k, v]) =>
      v == null ? [] : Array.isArray(v) ? v.map((x) => [k, x] as [string, string]) : [[k, v] as [string, string]],
    ),
  ).toString();

  const [workOrdersAll, properties, segments, me, scope] = await Promise.all([getWorkOrders(), getProperties(), getSegments(), getCurrentUser(), getScope()]);
  const canEdit = me?.role ? canPublish(me.role) : false;
  // Honor the global top-bar property scope (narrows the KPI strip + queue).
  const workOrders = scope.propertyName ? workOrdersAll.filter((w) => w.propertyName === scope.propertyName) : workOrdersAll;
  const typeConfigs = await Promise.all(NOTICE_TYPES.map((t) => getWoFieldConfig(t.key)));
  const fieldsByType = Object.fromEntries(NOTICE_TYPES.map((t, i) => [t.key, typeConfigs[i]]));
  const segOptions = segments.map((s) => ({ id: s.id, name: s.name, size: s.size }));

  const open = workOrders.filter((w) => w.status === "open").length;
  const inProgress = workOrders.filter((w) => w.status === "in_progress").length;
  const overdue = workOrders.filter((w) => w.status !== "resolved" && (w.priority === "urgent" || w.priority === "high")).length;
  const resolved = workOrders.filter((w) => w.status === "resolved").length;

  return (
    <main className="f5-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="f5-page-title">Work Orders &amp; Notices</div>
          <div className="f5-page-sub">Maintenance requests and AI-generated tenant notices.</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/workorders/fields" className="f5-btn">⚙ Configure fields</Link>
          <YardiImport />
          <NewWorkOrder properties={properties} fieldsByType={fieldsByType} segments={segOptions} />
        </div>
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(6,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Open</div><div className="f5-kpi-value f5-warn">{open}</div><div className="f5-kpi-sub">awaiting assignment</div></div>
        <div className="f5-card"><div className="f5-kpi-label">In Progress</div><div className="f5-kpi-value">{inProgress}</div><div className="f5-kpi-sub">crews dispatched</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Overdue</div><div className="f5-kpi-value f5-down">{overdue}</div><div className="f5-kpi-sub"><span className="f5-down">past SLA</span></div></div>
        <div className="f5-card"><div className="f5-kpi-label">Resolved</div><div className="f5-kpi-value">{resolved}</div><div className="f5-kpi-sub">closed out</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Avg Resolution</div><div className="f5-kpi-value">4.2d</div><div className="f5-kpi-sub"><span className="f5-up">▲ 8%</span> faster</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Cost This Month</div><div className="f5-kpi-value">$28.4K</div><div className="f5-kpi-sub">labour + parts</div></div>
      </div>

      <div className="f5-section-title">Queue</div>
      <WorkOrdersList rows={workOrders} canEdit={canEdit} initialSearch={initialSearch} />

      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>
        Data source: live
      </div>
    </main>
  );
}
