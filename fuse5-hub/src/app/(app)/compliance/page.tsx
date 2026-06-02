import type { ComplianceItem } from "@/lib/types";

// RentSafeTO compliance tracking (typed `ComplianceItem`).
const ORG = "woodgreen-demo";

const propertyNames: Record<string, string> = {
  p1: "WoodGreen — Danforth",
  p2: "WoodGreen — East York",
  p3: "WoodGreen — Riverdale",
};

const items: ComplianceItem[] = [
  { id: "ci1", org_id: ORG, property_id: "p1", kind: "Fire Safety Plan", due: "2026-08-14", status: "compliant" },
  { id: "ci2", org_id: ORG, property_id: "p1", kind: "Pest Control Inspection", due: "2026-06-20", status: "due_soon" },
  { id: "ci3", org_id: ORG, property_id: "p2", kind: "Elevator Maintenance", due: "2026-05-28", status: "overdue" },
  { id: "ci4", org_id: ORG, property_id: "p2", kind: "RentSafeTO Building Eval", due: "2026-09-01", status: "compliant" },
  { id: "ci5", org_id: ORG, property_id: "p3", kind: "Vital Services Check", due: "2026-06-15", status: "due_soon" },
  { id: "ci6", org_id: ORG, property_id: "p3", kind: "Fire Safety Plan", due: "2026-10-02", status: "compliant" },
  { id: "ci7", org_id: ORG, property_id: "p1", kind: "Indoor Air Quality", due: "2026-05-20", status: "overdue" },
  { id: "ci8", org_id: ORG, property_id: "p2", kind: "Pest Control Inspection", due: "2026-07-11", status: "compliant" },
  { id: "ci9", org_id: ORG, property_id: "p3", kind: "Common Area Cleaning Log", due: "2026-06-18", status: "due_soon" },
  { id: "ci10", org_id: ORG, property_id: "p1", kind: "Elevator Maintenance", due: "2026-08-30", status: "compliant" },
];

const statusBadge: Record<ComplianceItem["status"], string> = { compliant: "ok", due_soon: "warn", overdue: "bad" };
const statusLabel: Record<ComplianceItem["status"], string> = { compliant: "Compliant", due_soon: "Due Soon", overdue: "Overdue" };

export default async function CompliancePage() {
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
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{propertyNames[i.property_id] ?? "—"}</td>
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
