// Emergency Broadcast Console — visual-only panel + recent log. Demo data.
interface EmergencyEntry {
  id: string;
  date: string;
  type: string;
  reach: string;
  status: "sent" | "resolved" | "active";
}

const LOG: EmergencyEntry[] = [
  { id: "eb-7", date: "May 28, 2026 · 14:02", type: "Fire Alarm — Tower A", reach: "612 residents", status: "resolved" },
  { id: "eb-6", date: "May 21, 2026 · 09:18", type: "Water Shutoff — Riverdale", reach: "388 residents", status: "resolved" },
  { id: "eb-5", date: "May 14, 2026 · 19:44", type: "Severe Weather Warning", reach: "2,847 residents", status: "sent" },
  { id: "eb-4", date: "May 03, 2026 · 11:30", type: "Elevator Outage — Kiwanis", reach: "504 residents", status: "resolved" },
  { id: "eb-3", date: "Apr 27, 2026 · 22:10", type: "Gas Leak Evacuation", reach: "210 residents", status: "resolved" },
  { id: "eb-2", date: "Apr 19, 2026 · 06:55", type: "Boil Water Advisory", reach: "1,140 residents", status: "resolved" },
  { id: "eb-1", date: "Apr 08, 2026 · 16:20", type: "Power Outage — East York", reach: "893 residents", status: "resolved" },
];

const STATUS_BADGE: Record<EmergencyEntry["status"], string> = {
  active: "f5-badge bad",
  sent: "f5-badge warn",
  resolved: "f5-badge ok",
};

const STATUS_LABEL: Record<EmergencyEntry["status"], string> = {
  active: "Active",
  sent: "Sent",
  resolved: "Resolved",
};

export default async function EmergencyPage() {
  return (
    <main className="f5-content">
      <div className="f5-page-title">Emergency Broadcast</div>
      <div className="f5-page-sub">Reach every resident instantly across all channels.</div>

      <div className="f5-card" style={{ marginTop: 18, borderColor: "color-mix(in srgb, var(--f5-red) 40%, transparent)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="f5-dot" style={{ background: "var(--f5-red)", marginTop: 0 }} />
          <div className="f5-section-title" style={{ margin: 0, color: "var(--f5-red)" }}>Emergency Broadcast Console</div>
        </div>
        <div style={{ color: "var(--f5-text-secondary)", fontSize: 13, marginTop: 10 }}>
          This broadcast overrides all channels &mdash; email, SMS, WhatsApp, voice, and every signage display fires
          simultaneously. Use only for genuine emergencies affecting resident safety.
        </div>

        <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
          <div>
            <label className="f5-label" htmlFor="severity">Severity</label>
            <select id="severity" className="f5-select" defaultValue="critical">
              <option value="critical">Critical — life safety</option>
              <option value="urgent">Urgent — service disruption</option>
              <option value="advisory">Advisory — informational</option>
            </select>
          </div>
          <div>
            <label className="f5-label" htmlFor="type">Incident Type</label>
            <select id="type" className="f5-select" defaultValue="fire">
              <option value="fire">Fire / Evacuation</option>
              <option value="water">Water / Utility</option>
              <option value="weather">Severe Weather</option>
              <option value="security">Security</option>
            </select>
          </div>
        </div>

        <label className="f5-label" htmlFor="message">Message</label>
        <textarea
          id="message"
          className="f5-textarea"
          rows={3}
          defaultValue="EMERGENCY: Please evacuate via the nearest stairwell. Do not use elevators. Assemble at the designated muster point."
        />

        <div style={{ color: "var(--f5-text-dim)", fontSize: 12, marginTop: 12 }}>
          All channels selected · email · SMS · WhatsApp · voice · display
        </div>

        <button
          className="f5-btn primary"
          style={{ background: "var(--f5-red)", color: "#fff", marginTop: 14, width: "100%", justifyContent: "center", padding: "12px 14px", fontSize: 14 }}
        >
          ⚠ Broadcast to all 2,847 residents
        </button>
      </div>

      <div className="f5-section-title">Recent Emergency Log</div>
      <div className="f5-card" style={{ padding: 0 }}>
        <table className="f5-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Reach</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {LOG.map((e) => (
              <tr key={e.id}>
                <td>{e.date}</td>
                <td style={{ color: "var(--f5-text)" }}>{e.type}</td>
                <td>{e.reach}</td>
                <td><span className={STATUS_BADGE[e.status]}>{STATUS_LABEL[e.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>
        Data source: demo seed
      </div>
    </main>
  );
}
