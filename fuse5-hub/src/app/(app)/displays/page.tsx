import Link from "next/link";
import { headers } from "next/headers";
import { getDisplays, getProperties, getContent } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { getScope } from "@/lib/view";
import { hasWallboard, WALLBOARD_DATASOURCE_ID } from "@/lib/env";
import { getWallboardSignage } from "@/lib/wallboard/signage";
import { buildSignageFeed } from "@/lib/wallboard/feed";
import { DisplaysGrid } from "./displays-grid";
import { WallboardFeed } from "./wallboard-feed";
import { DeviceControl } from "./device-control";

export default async function DisplaysPage() {
  const [displays, properties, me, wb, h, content, scope] = await Promise.all([getDisplays(), getProperties(), getCurrentUser(), getWallboardSignage(), headers(), getContent(), getScope()]);
  const canEdit = me?.role ? canPublish(me.role) : false;
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
  const feed = await buildSignageFeed(origin);
  const contentOptions = content.filter((c) => c.type !== "playlist").slice(0, 60).map((c) => ({ id: c.id, title: c.title }));

  // Prefer live Wallboard devices when connected; otherwise the local/demo set.
  const gridAll = wb.connected && wb.devices.length
    ? wb.devices.map((d) => ({ id: d.id, name: d.name, location: d.location ?? "—", propertyName: "Wallboard", propertyId: null, status: (d.online ? "online" : "offline") as "online" | "offline" | "warning" }))
    : displays;
  // Honor the global top-bar property scope (narrows the device grid + uptime KPI).
  const grid = scope.propertyName ? gridAll.filter((d) => d.propertyName === scope.propertyName) : gridAll;

  const online = grid.filter((d) => d.status === "online").length;
  const offline = grid.filter((d) => d.status === "offline").length;
  const warning = grid.filter((d) => d.status === "warning").length;
  const uptime = grid.length ? ((online / grid.length) * 100).toFixed(1) : "0.0";

  return (
    <main className="f5-content">
      <div className="f5-page-title">Digital Signage</div>
      <div className="f5-page-sub">Network health across {grid.length} displays{scope.propertyName ? ` · ${scope.propertyName}` : ""} · powered by Wallboard.</div>

      {/* Wallboard connection surface */}
      <div className="f5-card" style={{ marginTop: 16, borderLeft: `3px solid ${wb.connected ? "var(--f5-green,#34d399)" : "var(--f5-teal)"}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, color: "var(--f5-text)" }}>
            {wb.connected ? `● Connected to Wallboard — ${wb.devices.length} device${wb.devices.length === 1 ? "" : "s"}, ${wb.online} online`
              : wb.configured ? "Wallboard configured — not reachable" : "Wallboard — digital signage partner"}
          </div>
          <div style={{ fontSize: 12.5, color: "var(--f5-text-muted)", marginTop: 3 }}>
            {wb.connected ? `Live device list and status synced from ${wb.baseUrl}. Publish Content-library assets straight to your screens.`
              : wb.configured ? (wb.error ?? "Check WALLBOARD_API_KEY / base URL.")
              : "Connect your Wallboard account to sync devices, push content, and schedule playlists. Wallboard also speaks MCP — Fuse5 AI agents can manage signage in natural language."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {!wb.configured && <Link className="f5-btn primary" href="/integrations">Connect Wallboard</Link>}
          {wb.mcpUrl && <span className="f5-badge" title={wb.mcpUrl}>MCP enabled</span>}
        </div>
      </div>

      <WallboardFeed feed={feed} configured={hasWallboard && Boolean(WALLBOARD_DATASOURCE_ID)} canEdit={canEdit} />

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Online</div><div className="f5-kpi-value f5-up">{online}</div><div className="f5-kpi-sub">streaming content</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Offline</div><div className="f5-kpi-value f5-down">{offline}</div><div className="f5-kpi-sub"><span className="f5-down">no heartbeat</span></div></div>
        <div className="f5-card"><div className="f5-kpi-label">Warning</div><div className="f5-kpi-value f5-warn">{warning}</div><div className="f5-kpi-sub">degraded signal</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Uptime %</div><div className="f5-kpi-value">{uptime}%</div><div className="f5-kpi-sub"><span className="f5-up">▲ 0.8%</span> 30-day avg</div></div>
      </div>

      <DeviceControl devices={grid.map((d) => ({ id: d.id, name: d.name, location: d.location, status: d.status }))} content={contentOptions} control={wb.control} canEdit={canEdit} />

      <div style={{ marginTop: 22 }} />
      <DisplaysGrid displays={grid} properties={properties} canEdit={canEdit} />

      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>Data source: {wb.connected ? "Wallboard (live)" : "local"}</div>
    </main>
  );
}
