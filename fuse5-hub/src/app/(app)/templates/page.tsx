import { getTemplates } from "@/lib/queries";

const channelLabel: Record<string, string> = {
  email: "Email", sms: "SMS", whatsapp: "WhatsApp", voice: "Voice", display: "Display",
};

export default async function TemplatesPage() {
  const templates = await getTemplates();

  const mandatoryCount = templates.filter((t) => t.mandatory).length;

  return (
    <main className="f5-content">
      <div className="f5-page-title">Template Library</div>
      <div className="f5-page-sub">
        Master (Fuse5-managed) and organization templates. {templates.length} total · {mandatoryCount} mandatory.
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
            {templates.map((t) => (
              <tr key={t.id}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{t.name}</td>
                <td>{t.category}</td>
                <td>{t.channels.map((c) => channelLabel[c] ?? c).join(", ")}</td>
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
