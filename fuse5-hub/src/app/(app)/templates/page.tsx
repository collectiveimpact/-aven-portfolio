import type { Template } from "@/lib/types";

const TEMPLATES: Template[] = [
  { id: "t1", org_id: null, name: "Emergency Evacuation", category: "Emergency", channels: ["email", "sms", "voice", "display"], mandatory: true, version: "v4.2", body: "" },
  { id: "t2", org_id: null, name: "Fire Alarm Notice", category: "Emergency", channels: ["sms", "display"], mandatory: true, version: "v2.0", body: "" },
  { id: "t3", org_id: null, name: "Elevator Outage", category: "Maintenance", channels: ["email", "sms", "display"], mandatory: false, version: "v3.1", body: "" },
  { id: "t4", org_id: null, name: "Water Shutoff", category: "Maintenance", channels: ["email", "sms"], mandatory: false, version: "v2.4", body: "" },
  { id: "t5", org_id: "org1", name: "Monthly Newsletter", category: "Community", channels: ["email"], mandatory: false, version: "v1.8", body: "" },
  { id: "t6", org_id: "org1", name: "Pest Control Notice", category: "Maintenance", channels: ["email", "sms"], mandatory: true, version: "v1.3", body: "" },
  { id: "t7", org_id: "org1", name: "Rent Reminder", category: "Billing", channels: ["email", "sms"], mandatory: false, version: "v2.0", body: "" },
  { id: "t8", org_id: "org1", name: "Lease Renewal", category: "Billing", channels: ["email"], mandatory: false, version: "v1.1", body: "" },
  { id: "t9", org_id: null, name: "Carbon Monoxide Alert", category: "Emergency", channels: ["sms", "voice", "display"], mandatory: true, version: "v3.0", body: "" },
  { id: "t10", org_id: "org1", name: "Snow Removal Schedule", category: "Community", channels: ["email", "display"], mandatory: false, version: "v1.6", body: "" },
  { id: "t11", org_id: "org1", name: "Annual Inspection Notice", category: "Compliance", channels: ["email", "sms"], mandatory: true, version: "v2.2", body: "" },
];

const channelLabel: Record<string, string> = {
  email: "Email", sms: "SMS", whatsapp: "WhatsApp", voice: "Voice", display: "Display",
};

export default async function TemplatesPage() {
  const mandatoryCount = TEMPLATES.filter((t) => t.mandatory).length;
  const masterCount = TEMPLATES.filter((t) => t.org_id === null).length;

  return (
    <main className="f5-content">
      <div className="f5-page-title">Template Library</div>
      <div className="f5-page-sub">
        Master (Fuse5-managed) and organization templates. {masterCount} master · {mandatoryCount} mandatory.
      </div>

      <div className="f5-section-title">All Templates</div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Channels</th>
              <th>Version</th>
              <th>Mandatory</th>
            </tr>
          </thead>
          <tbody>
            {TEMPLATES.map((t) => (
              <tr key={t.id}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>
                  {t.name}
                  {t.org_id === null && <span className="f5-pill" style={{ marginLeft: 8 }}>Master</span>}
                </td>
                <td>{t.category}</td>
                <td>{t.channels.map((c) => channelLabel[c]).join(", ")}</td>
                <td>{t.version}</td>
                <td>
                  {t.mandatory ? (
                    <span className="f5-badge warn">Mandatory</span>
                  ) : (
                    <span style={{ color: "var(--f5-text-dim)" }}>Optional</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
