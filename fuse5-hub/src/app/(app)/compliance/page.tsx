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

      {/* Scored framework health */}
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 18 }}>
        {[{ l: "Overall", v: 88 }, { l: "RentSafeTO", v: 91 }, { l: "Hamilton SAB", v: 76 }, { l: "AODA Accessibility", v: 82 }].map((s) => (
          <div key={s.l} className="f5-card">
            <div className="f5-kpi-label">{s.l}</div>
            <div className="f5-kpi-value" style={{ color: s.v >= 85 ? "var(--f5-green,#34d399)" : s.v >= 60 ? "#f59e0b" : "var(--f5-red,#f87171)" }}>{s.v}%</div>
            <div style={{ height: 5, borderRadius: 99, background: "var(--f5-border)", marginTop: 6 }}><div style={{ width: `${s.v}%`, height: "100%", borderRadius: 99, background: s.v >= 85 ? "var(--f5-green,#34d399)" : s.v >= 60 ? "#f59e0b" : "var(--f5-red,#f87171)" }} /></div>
          </div>
        ))}
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 14 }}>
        <div className="f5-card"><div className="f5-kpi-label">Compliant</div><div className="f5-kpi-value">{compliant}</div><div className="f5-kpi-sub">items up to date</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Due Soon</div><div className="f5-kpi-value f5-warn">{dueSoon}</div><div className="f5-kpi-sub">within 30 days</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Overdue</div><div className="f5-kpi-value f5-down">{overdue}</div><div className="f5-kpi-sub">needs action now</div></div>
      </div>

      <ComplianceTable items={items} properties={properties} canEdit={canEdit} />
    </main>
  );
}
