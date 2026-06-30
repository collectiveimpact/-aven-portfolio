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

  // In-context impact strip — emergency response at a glance.
  const totalSent = log.length;
  const activeNow = log.filter((e) => e.status === "active").length;
  const resolved = log.filter((e) => e.status === "resolved").length;
  const lastSent = log[0]?.date ?? "—";

  return (
    <main className="f5-content">
      <div className="f5-page-title">Emergency Broadcast</div>
      <div className="f5-page-sub">Reach every resident instantly across all channels.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 16 }}>
        <div className="f5-card"><div className="f5-kpi-label">Broadcasts logged</div><div className="f5-kpi-value">{totalSent}</div><div className="f5-kpi-sub">all time</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Active now</div><div className="f5-kpi-value f5-down">{activeNow}</div><div className="f5-kpi-sub">{activeNow ? "in progress" : "all clear"}</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Resolved</div><div className="f5-kpi-value f5-up">{resolved}</div><div className="f5-kpi-sub">stood down</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Last broadcast</div><div className="f5-kpi-value" style={{ fontSize: 22 }}>{lastSent}</div><div className="f5-kpi-sub">most recent</div></div>
      </div>

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
