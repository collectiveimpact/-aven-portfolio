import type { Resident } from "@/lib/types";

// Residents — WoodGreen-flavoured demo roster (typed `Resident`).
const ORG = "woodgreen-demo";

const residents: Resident[] = [
  { id: "r1", org_id: ORG, property_id: "p1", unit: "204", name: "Amara Okafor", email: "amara.o@example.com", phone: "416-555-0101", language: "English", status: "active" },
  { id: "r2", org_id: ORG, property_id: "p1", unit: "207", name: "Jean-Luc Tremblay", email: "jl.tremblay@example.com", phone: "416-555-0102", language: "French", status: "active" },
  { id: "r3", org_id: ORG, property_id: "p2", unit: "112", name: "Mei Lin Zhang", email: "meilin.z@example.com", phone: "416-555-0103", language: "Mandarin", status: "active" },
  { id: "r4", org_id: ORG, property_id: "p2", unit: "118", name: "Carlos Mendez", email: "c.mendez@example.com", phone: "416-555-0104", language: "Spanish", status: "active" },
  { id: "r5", org_id: ORG, property_id: "p1", unit: "301", name: "Fatima Al-Hassan", email: "fatima.ah@example.com", phone: "416-555-0105", language: "Arabic", status: "active" },
  { id: "r6", org_id: ORG, property_id: "p3", unit: "G2", name: "Robert Singh", email: "r.singh@example.com", phone: "416-555-0106", language: "Punjabi", status: "active" },
  { id: "r7", org_id: ORG, property_id: "p3", unit: "405", name: "Olena Kovalenko", email: "olena.k@example.com", phone: "416-555-0107", language: "Ukrainian", status: "active" },
  { id: "r8", org_id: ORG, property_id: "p2", unit: "120", name: "David Thompson", email: null, phone: "416-555-0108", language: "English", status: "moved_out" },
  { id: "r9", org_id: ORG, property_id: "p1", unit: "210", name: "Sophie Dubois", email: "s.dubois@example.com", phone: "416-555-0109", language: "French", status: "active" },
  { id: "r10", org_id: ORG, property_id: "p3", unit: "408", name: "Ahmed Farah", email: "a.farah@example.com", phone: "416-555-0110", language: "Somali", status: "active" },
  { id: "r11", org_id: ORG, property_id: "p2", unit: "115", name: "Grace Mwangi", email: "g.mwangi@example.com", phone: null, language: "Swahili", status: "moved_out" },
  { id: "r12", org_id: ORG, property_id: "p1", unit: "305", name: "Liam O’Brien", email: "liam.ob@example.com", phone: "416-555-0112", language: "English", status: "active" },
];

const propertyNames: Record<string, string> = {
  p1: "WoodGreen — Danforth",
  p2: "WoodGreen — East York",
  p3: "WoodGreen — Riverdale",
};

export default async function ResidentsPage() {
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
                <td>{propertyNames[r.property_id] ?? "—"}</td>
                <td>{r.language ?? "—"}</td>
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
