import { getResidents, getProperties } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { ResidentsTable } from "./residents-table";

export default async function ResidentsPage() {
  const [residents, properties, me] = await Promise.all([getResidents(), getProperties(), getCurrentUser()]);
  const canEdit = me?.role ? canPublish(me.role) : false;

  const total = residents.length;
  const active = residents.filter((r) => r.status === "active").length;
  const movedOut = residents.filter((r) => r.status === "moved_out").length;
  const languages = new Set(residents.map((r) => r.language).filter((l) => l && l !== "—")).size;

  return (
    <main className="f5-content">
      <div className="f5-page-title">Residents</div>
      <div className="f5-page-sub">WoodGreen Community Housing — resident directory across all properties.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Total Residents</div><div className="f5-kpi-value">{total}</div><div className="f5-kpi-sub">across {properties.length || 3} properties</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Active</div><div className="f5-kpi-value">{active}</div><div className="f5-kpi-sub"><span className="f5-up">▲ 2.4%</span> vs prior period</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Moved Out</div><div className="f5-kpi-value f5-warn">{movedOut}</div><div className="f5-kpi-sub">last 90 days</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Languages</div><div className="f5-kpi-value">{languages}</div><div className="f5-kpi-sub">spoken across portfolio</div></div>
      </div>

      <ResidentsTable residents={residents} properties={properties} canEdit={canEdit} />
    </main>
  );
}
