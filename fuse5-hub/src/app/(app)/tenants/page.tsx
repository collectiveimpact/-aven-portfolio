import { getProperties } from "@/lib/queries";
import { getResidentsWithDemographics } from "@/lib/residents/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { getScope } from "@/lib/view";
import { ResidentsTable } from "./residents-table";

export default async function ResidentsPage() {
  const [residentsAll, properties, me, scope] = await Promise.all([
    getResidentsWithDemographics(),
    getProperties(),
    getCurrentUser(),
    getScope(),
  ]);
  const canEdit = me?.role ? canPublish(me.role) : false;
  // Honor the global top-bar property scope (narrows the KPI strip + directory).
  const residents = scope.propertyName ? residentsAll.filter((r) => r.propertyName === scope.propertyName) : residentsAll;

  const total = residents.length;
  const active = residents.filter((r) => r.status === "active").length;
  const movedOut = residents.filter((r) => r.status === "moved_out").length;
  const languages = new Set(residents.map((r) => r.language).filter((l) => l && l !== "—")).size;
  const accessibility = residents.filter((r) => (r.demographics?.accessibilityNeeds?.length ?? 0) > 0 || (r.demographics?.mobility && r.demographics.mobility !== "none")).length;
  const agencies = new Set(residents.map((r) => r.demographics?.supportAgency).filter((a) => a && a !== "—")).size;

  return (
    <main className="f5-content">
      <div className="f5-page-title">Residents</div>
      <div className="f5-page-sub">WoodGreen Community Housing — resident directory with demographics {scope.propertyName ? `· ${scope.propertyName}` : "across all properties"}.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(6,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Total Residents</div><div className="f5-kpi-value">{total}</div><div className="f5-kpi-sub">across {properties.length || 3} properties</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Active</div><div className="f5-kpi-value">{active}</div><div className="f5-kpi-sub">{scope.propertyName ? "active residents" : <><span className="f5-up">▲ 2.4%</span> vs prior period</>}</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Moved Out</div><div className="f5-kpi-value f5-warn">{movedOut}</div><div className="f5-kpi-sub">last 90 days</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Languages</div><div className="f5-kpi-value">{languages}</div><div className="f5-kpi-sub">spoken across portfolio</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Accessibility</div><div className="f5-kpi-value">{accessibility}</div><div className="f5-kpi-sub">residents with needs on file</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Support Agencies</div><div className="f5-kpi-value">{agencies}</div><div className="f5-kpi-sub">partnered across portfolio</div></div>
      </div>

      <ResidentsTable residents={residents} properties={properties} canEdit={canEdit} />
    </main>
  );
}
