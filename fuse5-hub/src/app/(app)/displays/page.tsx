import { getDisplays, getProperties } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { DisplaysGrid } from "./displays-grid";

export default async function DisplaysPage() {
  const [displays, properties, me] = await Promise.all([getDisplays(), getProperties(), getCurrentUser()]);
  const canEdit = me?.role ? canPublish(me.role) : false;

  const online = displays.filter((d) => d.status === "online").length;
  const offline = displays.filter((d) => d.status === "offline").length;
  const warning = displays.filter((d) => d.status === "warning").length;
  const uptime = displays.length ? ((online / displays.length) * 100).toFixed(1) : "0.0";

  return (
    <main className="f5-content">
      <div className="f5-page-title">Digital Signage</div>
      <div className="f5-page-sub">Network health across {displays.length} displays.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Online</div><div className="f5-kpi-value f5-up">{online}</div><div className="f5-kpi-sub">streaming content</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Offline</div><div className="f5-kpi-value f5-down">{offline}</div><div className="f5-kpi-sub"><span className="f5-down">no heartbeat</span></div></div>
        <div className="f5-card"><div className="f5-kpi-label">Warning</div><div className="f5-kpi-value f5-warn">{warning}</div><div className="f5-kpi-sub">degraded signal</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Uptime %</div><div className="f5-kpi-value">{uptime}%</div><div className="f5-kpi-sub"><span className="f5-up">▲ 0.8%</span> 30-day avg</div></div>
      </div>

      <DisplaysGrid displays={displays} properties={properties} canEdit={canEdit} />

      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>Data source: live</div>
    </main>
  );
}
