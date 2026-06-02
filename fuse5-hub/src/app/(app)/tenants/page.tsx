import { getResidents } from "@/lib/queries";

export default async function ResidentsPage() {
  const residents = await getResidents();

  const total = residents.length;
  const active = residents.filter((r) => r.status === "active").length;
  const movedOut = residents.filter((r) => r.status === "moved_out").length;
  const languages = new Set(residents.map((r) => r.language).filter(Boolean)).size;

  return (
    <main className="f5-content">
      <div className="f5-page-title">Residents</div>
      <div className="f5-page-sub">WoodGreen Community Housing — resident directory across all properties.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Total Residents</div><div className="f5-kpi-value">{total}</div><div className="f5-kpi-sub">across 3 properties</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Active</div><div className="f5-kpi-value">{active}</div><div className="f5-kpi-sub"><span className="f5-up">▲ 2.4%</span> vs prior period</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Moved Out</div><div className="f5-kpi-value f5-warn">{movedOut}</div><div className="f5-kpi-sub">last 90 days</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Languages</div><div className="f5-kpi-value">{languages}</div><div className="f5-kpi-sub">spoken across portfolio</div></div>
      </div>

      <div className="f5-section-title">Filter</div>
      <div className="f5-chips">
        <span className="f5-chip active">All</span>
        <span className="f5-chip">By Property</span>
        <span className="f5-chip">By Language</span>
      </div>

      <div className="f5-section-title">Resident Directory</div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead>
            <tr><th>Unit</th><th>Name</th><th>Property</th><th>Language</th><th>Status</th></tr>
          </thead>
          <tbody>
            {residents.map((r) => (
              <tr key={r.id}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{r.unit}</td>
                <td style={{ color: "var(--f5-text)" }}>{r.name}</td>
                <td>{r.propertyName}</td>
                <td>{r.language}</td>
                <td>
                  <span className={`f5-badge ${r.status === "active" ? "ok" : "warn"}`}>
                    {r.status === "active" ? "Active" : "Moved Out"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
