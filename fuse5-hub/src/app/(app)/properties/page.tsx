import { getPropertiesFull } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { PropertiesTable } from "./properties-table";

export default async function PropertiesPage() {
  const [props, me] = await Promise.all([getPropertiesFull(), getCurrentUser()]);
  const canEdit = me?.role ? canPublish(me.role) : false;
  const totalUnits = props.reduce((a, p) => a + p.units, 0);
  const totalOcc = props.reduce((a, p) => a + p.occupied, 0);
  const occPct = totalUnits ? Math.round((totalOcc / totalUnits) * 1000) / 10 : 0;

  return (
    <main className="f5-content">
      <div className="f5-page-title">Properties</div>
      <div className="f5-page-sub">Your property portfolio.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Properties</div><div className="f5-kpi-value">{props.length}</div><div className="f5-kpi-sub">in portfolio</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Total Units</div><div className="f5-kpi-value">{totalUnits.toLocaleString()}</div><div className="f5-kpi-sub">across all properties</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Occupancy</div><div className="f5-kpi-value">{occPct}%</div><div className="f5-kpi-sub">{totalOcc} of {totalUnits} units</div></div>
      </div>

      <PropertiesTable properties={props} canEdit={canEdit} />
    </main>
  );
}
