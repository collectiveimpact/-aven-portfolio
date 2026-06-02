import { getContacts } from "@/lib/queries";

export default async function ContactsPage() {
  const contacts = await getContacts();

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
                <td>{c.email}</td>
                <td>{c.phone}</td>
                <td>{c.property}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
