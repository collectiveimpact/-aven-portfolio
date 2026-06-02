import type { Segment } from "@/lib/types";

// Saved audience segments (typed `Segment`).
const ORG = "woodgreen-demo";

const segments: Segment[] = [
  { id: "s1", org_id: ORG, name: "All Residents", rule: "Everyone with an active tenancy", size: 1284 },
  { id: "s2", org_id: ORG, name: "Arrears > 30 days", rule: "Balance owing past 30 days", size: 47 },
  { id: "s3", org_id: ORG, name: "French speakers", rule: "Preferred language is French", size: 162 },
  { id: "s4", org_id: ORG, name: "Building A", rule: "Property is WoodGreen — Danforth", size: 318 },
  { id: "s5", org_id: ORG, name: "New Move-ins", rule: "Tenancy started in the last 60 days", size: 29 },
  { id: "s6", org_id: ORG, name: "Seniors", rule: "Age 65 and over", size: 211 },
];

export default async function SegmentsPage() {
  return (
    <main className="f5-content">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div className="f5-page-title">Segments</div>
          <div className="f5-page-sub">Saved audiences for targeted broadcasts and surveys.</div>
        </div>
        <button className="f5-btn primary" style={{ marginTop: 4 }}>+ New Segment</button>
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 18 }}>
        {segments.map((s) => (
          <div key={s.id} className="f5-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="f5-section-title" style={{ margin: 0 }}>{s.name}</div>
              <span className="f5-pill">{s.size.toLocaleString()}</span>
            </div>
            <div style={{ color: "var(--f5-text-secondary)", fontSize: 13.5, marginTop: 10 }}>{s.rule}</div>
            <div className="f5-kpi-sub" style={{ marginTop: 14 }}>{s.size.toLocaleString()} residents match</div>
          </div>
        ))}
      </div>
    </main>
  );
}
