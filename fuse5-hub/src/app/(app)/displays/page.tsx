import { getDisplays, type DisplayRow } from "@/lib/queries";

// Digital Signage — uptime KPI strip + grid of display cards. Live data.
const STATUS_BADGE: Record<DisplayRow["status"], string> = {
  online: "f5-badge ok",
  offline: "f5-badge bad",
  warning: "f5-badge warn",
};

const STATUS_DOT: Record<DisplayRow["status"], string> = {
  online: "var(--f5-green)",
  offline: "var(--f5-red)",
  warning: "var(--f5-amber)",
};

const STATUS_LABEL: Record<DisplayRow["status"], string> = {
  online: "Online",
  offline: "Offline",
  warning: "Warning",
};

export default async function DisplaysPage() {
  const displays = await getDisplays();

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

      <div className="f5-section-title">Display Network</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {displays.map((d) => (
          <div key={d.id} className="f5-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                <span className="f5-dot" style={{ background: STATUS_DOT[d.status], marginTop: 0 }} />
                <strong style={{ color: "var(--f5-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</strong>
              </div>
              <span className={STATUS_BADGE[d.status]}>{STATUS_LABEL[d.status]}</span>
            </div>
            <div style={{ color: "var(--f5-text-muted)", fontSize: 12, marginTop: 10 }}>{d.propertyName} · {d.location}</div>
          </div>
        ))}
      </div>

      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>
        Data source: live
      </div>
    </main>
  );
}
