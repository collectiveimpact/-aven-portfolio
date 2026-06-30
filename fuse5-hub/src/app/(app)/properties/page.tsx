import { getPropertiesFull } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { getScope } from "@/lib/view";
import { PropertiesTable } from "./properties-table";
import PropertyMap, { MapLegend } from "@/components/map/PropertyMap";
import { withCoords, type MapPoint } from "@/components/map/markerColor";

export default async function PropertiesPage() {
  const [propsAll, me, scope] = await Promise.all([getPropertiesFull(), getCurrentUser(), getScope()]);
  const canEdit = me?.role ? canPublish(me.role) : false;
  // Honor the global top-bar property scope (narrows KPIs, map, and the table).
  const props = scope.propertyName ? propsAll.filter((p) => p.name === scope.propertyName) : propsAll;
  const totalUnits = props.reduce((a, p) => a + p.units, 0);
  const totalOcc = props.reduce((a, p) => a + p.occupied, 0);
  const occPct = totalUnits ? Math.round((totalOcc / totalUnits) * 1000) / 10 : 0;

  // Portfolio map points. PropertyFull lacks lat/lng today, so withCoords()
  // synthesises stable placeholder Toronto coordinates from id/name. When a
  // real geocode/Yardi feed adds lat/lng to PropertyFull, those flow straight
  // through and the placeholders are bypassed.
  const located = props.map((p) => ({ p, c: withCoords(p) }));
  const mapPoints: MapPoint[] = located.map(({ p, c }) => ({
    id: p.id,
    name: p.name,
    lat: c.lat,
    lng: c.lng,
    units: p.units,
  }));
  const usingPlaceholders = located.some(({ c }) => c.placeholder);

  return (
    <main className="f5-content">
      <div className="f5-page-title">Properties</div>
      <div className="f5-page-sub">Your property portfolio{scope.propertyName ? ` · ${scope.propertyName}` : ""}.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Properties</div><div className="f5-kpi-value">{props.length}</div><div className="f5-kpi-sub">in portfolio</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Total Units</div><div className="f5-kpi-value">{totalUnits.toLocaleString()}</div><div className="f5-kpi-sub">across all properties</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Occupancy</div><div className="f5-kpi-value">{occPct}%</div><div className="f5-kpi-sub">{totalOcc} of {totalUnits} units</div></div>
      </div>

      <div className="f5-card" style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="f5-kpi-label">Portfolio map</div>
            <div className="f5-kpi-sub" style={{ marginTop: 2 }}>Geographic view of every property in the portfolio.</div>
          </div>
          {usingPlaceholders && (
            <span className="f5-kpi-sub" style={{ fontSize: 12, color: "var(--f5-text-muted)" }}>
              Approximate locations — pending geocoded coordinates
            </span>
          )}
        </div>
        <div style={{ marginTop: 12 }}>
          <PropertyMap points={mapPoints} />
        </div>
        <MapLegend />
      </div>

      <PropertiesTable properties={props} canEdit={canEdit} />
    </main>
  );
}
