import { getEmergencyLog, getProperties, type EmergencyLogRow } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canBroadcast } from "@/lib/rbac";
import { EmergencyConsole } from "./console";

const STATUS_BADGE: Record<EmergencyLogRow["status"], string> = {
  active: "f5-badge bad",
  sent: "f5-badge warn",
  resolved: "f5-badge ok",
};
const STATUS_LABEL: Record<EmergencyLogRow["status"], string> = {
  active: "Active",
  sent: "Sent",
  resolved: "Resolved",
};

export default async function EmergencyPage() {
  const [log, properties, me] = await Promise.all([
    getEmergencyLog(),
    getProperties(),
    getCurrentUser(),
  ]);
  const allowBroadcast = !!me?.role && canBroadcast(me.role);

  return (
    <main className="f5-content">
      <div className="f5-page-title">Emergency Broadcast</div>
      <div className="f5-page-sub">Reach every resident instantly across all channels.</div>

      <EmergencyConsole properties={properties} canBroadcast={allowBroadcast} />

      <div className="f5-section-title">Recent Emergency Log</div>
      <div className="f5-card" style={{ padding: 0 }}>
        <table className="f5-table">
          <thead>
            <tr><th>Date</th><th>Type</th><th>Reach</th><th>Status</th></tr>
          </thead>
          <tbody>
            {log.map((e) => (
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
    </main>
  );
}
