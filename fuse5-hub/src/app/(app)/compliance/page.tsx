import { getCompliance, getProperties } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { ComplianceTable } from "./compliance-table";

export default async function CompliancePage() {
  const [items, properties, me] = await Promise.all([getCompliance(), getProperties(), getCurrentUser()]);
  const canEdit = me?.role ? canPublish(me.role) : false;

  const compliant = items.filter((i) => i.status === "compliant").length;
  const dueSoon = items.filter((i) => i.status === "due_soon").length;
  const overdue = items.filter((i) => i.status === "overdue").length;

  return (
    <main className="f5-content">
      <div className="f5-page-title">Compliance</div>
      <div className="f5-page-sub">RentSafeTO obligations tracked across the WoodGreen portfolio.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Compliant</div><div className="f5-kpi-value">{compliant}</div><div className="f5-kpi-sub">items up to date</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Due Soon</div><div className="f5-kpi-value f5-warn">{dueSoon}</div><div className="f5-kpi-sub">within 30 days</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Overdue</div><div className="f5-kpi-value f5-down">{overdue}</div><div className="f5-kpi-sub">needs action now</div></div>
      </div>

      <ComplianceTable items={items} properties={properties} canEdit={canEdit} />
    </main>
  );
}
