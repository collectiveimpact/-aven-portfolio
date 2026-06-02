import type { Contact } from "@/lib/types";

// Staff & vendor contacts (typed `Contact`).
const ORG = "woodgreen-demo";

const contacts: Contact[] = [
  { id: "c1", org_id: ORG, name: "Diane Carter", role: "Property Manager", email: "d.carter@woodgreen.example", phone: "416-555-0201", property: "WoodGreen — Danforth" },
  { id: "c2", org_id: ORG, name: "Marcus Reyes", role: "Building Superintendent", email: "m.reyes@woodgreen.example", phone: "416-555-0202", property: "WoodGreen — Danforth" },
  { id: "c3", org_id: ORG, name: "Priya Nair", role: "Tenant Services Lead", email: "p.nair@woodgreen.example", phone: "416-555-0203", property: "WoodGreen — East York" },
  { id: "c4", org_id: ORG, name: "Tom Wallace", role: "Maintenance Lead", email: "t.wallace@woodgreen.example", phone: "416-555-0204", property: "WoodGreen — East York" },
  { id: "c5", org_id: ORG, name: "Aisha Bello", role: "Community Coordinator", email: "a.bello@woodgreen.example", phone: "416-555-0205", property: "WoodGreen — Riverdale" },
  { id: "c6", org_id: ORG, name: "GreenLeaf Landscaping", role: "Vendor — Grounds", email: "service@greenleaf.example", phone: "905-555-0301", property: "All properties" },
  { id: "c7", org_id: ORG, name: "Citywide HVAC", role: "Vendor — HVAC", email: "dispatch@citywidehvac.example", phone: "905-555-0302", property: "All properties" },
  { id: "c8", org_id: ORG, name: "SafeGuard Fire", role: "Vendor — Fire Safety", email: "compliance@safeguardfire.example", phone: "905-555-0303", property: "All properties" },
  { id: "c9", org_id: ORG, name: "Nadia Petrov", role: "Accessibility Officer", email: "n.petrov@woodgreen.example", phone: "416-555-0206", property: "WoodGreen — Riverdale" },
  { id: "c10", org_id: ORG, name: "RapidPlumb Services", role: "Vendor — Plumbing", email: "calls@rapidplumb.example", phone: null, property: "All properties" },
];

export default async function ContactsPage() {
  return (
    <main className="f5-content">
      <div className="f5-page-title">Contacts</div>
      <div className="f5-page-sub">Staff and vendor directory across the WoodGreen portfolio.</div>

      <div className="f5-section-title">Directory</div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead>
            <tr><th>Name</th><th>Role</th><th>Email</th><th>Phone</th><th>Property</th></tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{c.name}</td>
                <td>{c.role}</td>
                <td>{c.email ?? "—"}</td>
                <td>{c.phone ?? "—"}</td>
                <td>{c.property ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
