import { getCompliance, type ComplianceRow } from "@/lib/queries";

const statusBadge: Record<ComplianceRow["status"], string> = { compliant: "ok", due_soon: "warn", overdue: "bad" };
const statusLabel: Record<ComplianceRow["status"], string> = { compliant: "Compliant", due_soon: "Due Soon", overdue: "Overdue" };

export default async function CompliancePage() {
  const items = await getCompliance();

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

      <div className="f5-section-title">Compliance Items</div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead>
            <tr><th>Property</th><th>Kind</th><th>Due</th><th>Status</th></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{i.propertyName}</td>
                <td>{i.kind}</td>
                <td>{i.due}</td>
                <td><span className={`f5-badge ${statusBadge[i.status]}`}>{statusLabel[i.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
