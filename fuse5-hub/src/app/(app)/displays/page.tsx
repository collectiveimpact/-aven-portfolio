import type { Display } from "@/lib/types";

// Digital Signage — uptime KPI strip + grid of display cards. Demo data.
const ORG = "demo-org";

const DISPLAYS: Display[] = [
  { id: "d-01", org_id: ORG, property_id: "p1", name: "Lobby Main", location: "WoodGreen East York · Lobby", status: "online", content_id: "c-01" },
  { id: "d-02", org_id: ORG, property_id: "p1", name: "Elevator Bank A", location: "WoodGreen East York · Floor 1", status: "online", content_id: "c-02" },
  { id: "d-03", org_id: ORG, property_id: "p1", name: "Community Room", location: "WoodGreen East York · Mezzanine", status: "warning", content_id: "c-01" },
  { id: "d-04", org_id: ORG, property_id: "p1", name: "East Lobby", location: "WoodGreen East York · East Wing", status: "offline", content_id: null },
  { id: "d-05", org_id: ORG, property_id: "p2", name: "Riverdale Entrance", location: "HNHC Riverdale · Entrance", status: "online", content_id: "c-03" },
  { id: "d-06", org_id: ORG, property_id: "p2", name: "Mailroom Board", location: "HNHC Riverdale · Mailroom", status: "online", content_id: "c-04" },
  { id: "d-07", org_id: ORG, property_id: "p2", name: "Laundry Notice", location: "HNHC Riverdale · Basement", status: "online", content_id: "c-04" },
  { id: "d-08", org_id: ORG, property_id: "p2", name: "Parking Level", location: "HNHC Riverdale · P1", status: "warning", content_id: "c-02" },
  { id: "d-09", org_id: ORG, property_id: "p3", name: "Kiwanis Front Desk", location: "Hamilton Kiwanis · Reception", status: "online", content_id: "c-05" },
  { id: "d-10", org_id: ORG, property_id: "p3", name: "Building A Hall", location: "Hamilton Kiwanis · Tower A", status: "online", content_id: "c-01" },
  { id: "d-11", org_id: ORG, property_id: "p3", name: "Building B Hall", location: "Hamilton Kiwanis · Tower B", status: "online", content_id: "c-01" },
  { id: "d-12", org_id: ORG, property_id: "p3", name: "Fitness Centre", location: "Hamilton Kiwanis · Amenities", status: "online", content_id: "c-03" },
  { id: "d-13", org_id: ORG, property_id: "p3", name: "Daycare Wing", location: "Hamilton Kiwanis · Ground", status: "offline", content_id: null },
  { id: "d-14", org_id: ORG, property_id: "p1", name: "West Stairwell", location: "WoodGreen East York · West Wing", status: "online", content_id: "c-02" },
];

const STATUS_BADGE: Record<Display["status"], string> = {
  online: "f5-badge ok",
  offline: "f5-badge bad",
  warning: "f5-badge warn",
};

const STATUS_DOT: Record<Display["status"], string> = {
  online: "var(--f5-green)",
  offline: "var(--f5-red)",
  warning: "var(--f5-amber)",
};

const STATUS_LABEL: Record<Display["status"], string> = {
  online: "Online",
  offline: "Offline",
  warning: "Warning",
};

export default async function DisplaysPage() {
  const online = DISPLAYS.filter((d) => d.status === "online").length;
  const offline = DISPLAYS.filter((d) => d.status === "offline").length;
  const warning = DISPLAYS.filter((d) => d.status === "warning").length;
  const uptime = ((online / DISPLAYS.length) * 100).toFixed(1);

  return (
    <main className="f5-content">
      <div className="f5-page-title">Digital Signage</div>
      <div className="f5-page-sub">Network health across {DISPLAYS.length} displays in 3 properties.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Online</div><div className="f5-kpi-value f5-up">{online}</div><div className="f5-kpi-sub">streaming content</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Offline</div><div className="f5-kpi-value f5-down">{offline}</div><div className="f5-kpi-sub"><span className="f5-down">no heartbeat</span></div></div>
        <div className="f5-card"><div className="f5-kpi-label">Warning</div><div className="f5-kpi-value f5-warn">{warning}</div><div className="f5-kpi-sub">degraded signal</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Uptime %</div><div className="f5-kpi-value">{uptime}%</div><div className="f5-kpi-sub"><span className="f5-up">▲ 0.8%</span> 30-day avg</div></div>
      </div>

      <div className="f5-section-title">Display Network</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {DISPLAYS.map((d) => (
          <div key={d.id} className="f5-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                <span className="f5-dot" style={{ background: STATUS_DOT[d.status], marginTop: 0 }} />
                <strong style={{ color: "var(--f5-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</strong>
              </div>
              <span className={STATUS_BADGE[d.status]}>{STATUS_LABEL[d.status]}</span>
            </div>
            <div style={{ color: "var(--f5-text-muted)", fontSize: 12, marginTop: 10 }}>{d.location}</div>
          </div>
        ))}
      </div>

      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>
        Data source: demo seed
      </div>
    </main>
  );
}
