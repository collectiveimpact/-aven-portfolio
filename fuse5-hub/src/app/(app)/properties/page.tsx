import { getPropertiesFull } from "@/lib/queries";

export default async function PropertiesPage() {
  const props = await getPropertiesFull();
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

      <div className="f5-section-title">Portfolio</div>
      <div className="f5-card" style={{ padding: 0 }}>
        <table className="f5-table">
          <thead>
            <tr><th>Property</th><th>Type</th><th>Occupancy</th><th>Manager</th></tr>
          </thead>
          <tbody>
            {props.map((p) => (
              <tr key={p.id}>
                <td>
                  <div style={{ color: "var(--f5-text)", fontWeight: 600 }}>{p.name}</div>
                  <div style={{ color: "var(--f5-text-muted)", fontSize: 12 }}>{p.address}</div>
                </td>
                <td style={{ textTransform: "capitalize" }}>{p.type}</td>
                <td>{p.occupied} / {p.units}</td>
                <td>
                  <div style={{ color: "var(--f5-text)" }}>{p.managerName}</div>
                  <div style={{ color: "var(--f5-text-muted)", fontSize: 12 }}>{p.managerEmail}{p.managerPhone ? ` · ${p.managerPhone}` : ""}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>Data source: live</div>
    </main>
  );
}
