import { getCompliance, getProperties, getPropertiesFull } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { getScope } from "@/lib/view";
import { ComplianceTable } from "./compliance-table";
import PropertyMap, { MapLegend } from "@/components/map/PropertyMap";
import { withCoords, type ComplianceStatus, type MapPoint } from "@/components/map/markerColor";

export default async function CompliancePage() {
  const [itemsAll, properties, propsFull, me, scope] = await Promise.all([
    getCompliance(),
    getProperties(),
    getPropertiesFull(),
    getCurrentUser(),
    getScope(),
  ]);
  const canEdit = me?.role ? canPublish(me.role) : false;
  // Honor the global top-bar property scope (narrows KPIs, map, and the table).
  const items = scope.propertyName ? itemsAll.filter((i) => i.propertyName === scope.propertyName) : itemsAll;

  const compliant = items.filter((i) => i.status === "compliant").length;
  const dueSoon = items.filter((i) => i.status === "due_soon").length;
  const overdue = items.filter((i) => i.status === "overdue").length;

  // Aggregate compliance items per property -> a 0-100 score (% compliant) and
  // a worst-status (overdue beats due_soon beats compliant). Markers shade by
  // that score. Coordinates come from PropertyFull via the placeholder geocode
  // (real lat/lng drop in cleanly when a feed provides them).
  type Agg = { total: number; compliant: number; overdue: boolean; dueSoon: boolean };
  // Resolve each compliance row to a property id. Prefer propertyId; fall back
  // to matching propertyName (demo data carries names but null ids).
  const idByName = new Map(propsFull.map((p) => [p.name, p.id]));
  const byProp = new Map<string, Agg>();
  for (const i of items) {
    const pid = i.propertyId ?? idByName.get(i.propertyName);
    if (!pid) continue;
    const a = byProp.get(pid) ?? { total: 0, compliant: 0, overdue: false, dueSoon: false };
    a.total += 1;
    if (i.status === "compliant") a.compliant += 1;
    if (i.status === "overdue") a.overdue = true;
    if (i.status === "due_soon") a.dueSoon = true;
    byProp.set(pid, a);
  }
  const compliancePoints: MapPoint[] = propsFull
    .filter((p) => byProp.has(p.id))
    .map((p) => {
      const a = byProp.get(p.id)!;
      const score = a.total ? Math.round((a.compliant / a.total) * 100) : 0;
      const status: ComplianceStatus = a.overdue ? "overdue" : a.dueSoon ? "due_soon" : "compliant";
      const c = withCoords(p);
      return { id: p.id, name: p.name, lat: c.lat, lng: c.lng, score, status, units: p.units };
    });
  const complianceUsingPlaceholders = propsFull
    .filter((p) => byProp.has(p.id))
    .some((p) => withCoords(p).placeholder);

  return (
    <main className="f5-content">
      <div className="f5-page-title">Compliance</div>
      <div className="f5-page-sub">RentSafeTO obligations tracked {scope.propertyName ? `· ${scope.propertyName}` : "across the WoodGreen portfolio"}.</div>

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

      <div className="f5-card" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="f5-kpi-label">Compliance map</div>
            <div className="f5-kpi-sub" style={{ marginTop: 2 }}>Properties shaded by compliance score (share of obligations up to date).</div>
          </div>
          {complianceUsingPlaceholders && (
            <span className="f5-kpi-sub" style={{ fontSize: 12, color: "var(--f5-text-muted)" }}>
              Approximate locations — pending geocoded coordinates
            </span>
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          <PropertyMap points={compliancePoints} />
        </div>
        <MapLegend />
      </div>

      <ComplianceTable items={items} properties={properties} canEdit={canEdit} />
    </main>
  );
}
