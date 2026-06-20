"use client";

import {
  PERM_MODULES, PERM_GLYPH, PERM_LABEL, F5_GLOBAL_ROLES, PROVIDER_ROLES, ENVIRONMENTS,
  type ProviderDemo, type PlatformUserDemo, type PlayerDemo, type RoleRow, type PermLevel,
} from "@/lib/platform";
import type { PlatformStats, AuditRow, SubscriptionInfo } from "@/lib/queries";

const dim = "var(--f5-text-muted)";
const fg = "var(--f5-text)";

/* ---------------- Account panels (existing) ---------------- */

export function BillingPanel({ sub }: { sub: SubscriptionInfo }) {
  const Row = ({ k, v, bold }: { k: string; v: string; bold?: boolean }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: bold ? "none" : "1px solid var(--f5-border)", fontSize: 13, fontWeight: bold ? 700 : 400, paddingTop: bold ? 10 : 8 }}>
      <span style={{ color: bold ? fg : "var(--f5-text-secondary)" }}>{k}</span><span>{v}</span>
    </div>
  );
  return (
    <div className="f5-grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
      <div className="f5-card">
        <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
          <div><div className="f5-kpi-label">Plan</div><div className="f5-kpi-value" style={{ fontSize: 24 }}>{sub.plan}</div><div className="f5-kpi-sub">Billed annually</div></div>
          <div><div className="f5-kpi-label">Seats</div><div className="f5-kpi-value" style={{ fontSize: 24 }}>{sub.usedSeats}<span style={{ fontSize: 16, color: dim }}>/{sub.seats}</span></div><div className="f5-kpi-sub"><span className="f5-up">{Math.max(0, sub.seats - sub.usedSeats)} available</span></div></div>
          <div><div className="f5-kpi-label">Status</div><div className="f5-kpi-value" style={{ fontSize: 24 }}><span className="f5-up">{sub.status}</span></div><div className="f5-kpi-sub">Next invoice Jul 1, 2026</div></div>
        </div>
        <div style={{ marginTop: 18 }}><button className="f5-btn primary" type="button">Manage billing</button></div>
      </div>
      <div className="f5-card">
        <div className="f5-kpi-label">This Cycle</div>
        <Row k="Base (Growth)" v="$960.00" />
        <Row k="SMS overage" v="$184.00" />
        <Row k="AI agents" v="$116.00" />
        <Row k="Total due" v={sub.cycleSpend} bold />
      </div>
    </div>
  );
}

export function OrgSettingsPanel({ orgName }: { orgName: string }) {
  return (
    <div className="f5-card">
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div><label className="f5-label">Organization name</label><input className="f5-input" value={orgName} readOnly /></div>
        <div><label className="f5-label">Region</label><input className="f5-input" value="Canada (Ontario)" readOnly /></div>
        <div><label className="f5-label">Data residency</label><input className="f5-input" value="ca-central-1" readOnly /></div>
      </div>
      <div className="f5-kpi-sub" style={{ marginTop: 12 }}>Residency and region are locked to your contract. Contact your Fuse5 admin to change.</div>
    </div>
  );
}

export function AuditPanel({ audit }: { audit: AuditRow[] }) {
  return (
    <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
      <table className="f5-table">
        <thead><tr><th>Actor</th><th>Action</th><th>Detail</th><th>Time</th></tr></thead>
        <tbody>
          {audit.map((e) => (
            <tr key={e.id}><td style={{ color: fg, fontWeight: 600 }}>{e.actor}</td><td>{e.action}</td><td>{e.detail}</td><td style={{ color: "var(--f5-text-dim)" }}>{e.when}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------------- Platform panels (super-admin) ---------------- */

function Avatar({ short, color }: { short: string; color: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 9, background: color, color: "#fff", fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{short}</span>;
}

export function PlatformOverviewPanel({ stats, providers }: { stats: PlatformStats; providers: ProviderDemo[] }) {
  const kpis = [
    { label: "Providers", value: String(stats.providers) },
    { label: "Total Users", value: String(stats.users) },
    { label: "Properties", value: String(stats.properties) },
    { label: "Tenants", value: stats.tenants.toLocaleString() },
    { label: "Uptime", value: stats.uptime },
  ];
  return (
    <>
      <div className="f5-page-sub" style={{ marginTop: -6, marginBottom: 14 }}>Fuse5 Communication Hub — Multi-Tenant Admin Console</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        {kpis.map((k) => <div key={k.label} className="f5-card"><div className="f5-kpi-label">{k.label}</div><div className="f5-kpi-value">{k.value}</div></div>)}
      </div>
      <div className="f5-section-title">Active Providers</div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        {providers.map((p) => (
          <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--f5-border)", opacity: p.status === "onboarding" ? 0.65 : 1 }}>
            <Avatar short={p.short} color={p.color} />
            <div style={{ flex: 1 }}>
              <div style={{ color: fg, fontWeight: 700 }}>{p.name}</div>
              <div style={{ fontSize: 12, color: dim }}>{p.tier} · {p.properties} Properties · {p.users} Users · {p.tenants.toLocaleString()} Tenants</div>
            </div>
            {p.status === "onboarding"
              ? <span className="f5-badge warn">Onboarding</span>
              : <><span className="f5-badge ok">Active</span><span className={`f5-badge ${p.yardi === "synced" ? "" : "warn"}`}>{p.yardi === "synced" ? "Yardi Synced" : "Yardi Pending"}</span></>}
          </div>
        ))}
      </div>
    </>
  );
}

export function AllProvidersPanel({ providers }: { providers: ProviderDemo[] }) {
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="f5-page-sub" style={{ marginTop: -6 }}>Layer 2 — each provider is an isolated organization with their own users, roles, and properties.</div>
        <button className="f5-btn primary" type="button">+ Add Provider</button>
      </div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px,1fr))", marginTop: 14 }}>
        {providers.filter((p) => p.status === "active").map((p) => (
          <div key={p.id} className="f5-card">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Avatar short={p.short} color={p.color} />
              <div><div style={{ color: fg, fontWeight: 700 }}>{p.name}</div><div style={{ fontSize: 11, color: dim }}>{p.tier} Tier · Active since {p.since} · {p.yardi === "synced" ? "Yardi Synced" : "Yardi Pending"}</div></div>
            </div>
            <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 14 }}>
              {[["Users", p.users], ["Roles", p.roles.length], ["Properties", p.properties], ["Tenants", p.tenants.toLocaleString()], ["Players", p.players], ["Compliance", `${p.compliance}%`]].map(([l, v]) => (
                <div key={l as string} style={{ textAlign: "center", padding: "8px 4px", background: "var(--f5-bg-soft, rgba(255,255,255,0.03))", borderRadius: 8 }}>
                  <div style={{ fontWeight: 800, color: fg, fontSize: 16 }}>{v}</div><div style={{ fontSize: 10, color: dim, textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {p.roles.map((r) => <span key={r.name} className={`f5-badge ${r.custom ? "" : ""}`} style={r.custom ? { background: "rgba(168,85,247,0.18)", color: "#c084fc" } : undefined}>{r.name} ({r.count})</span>)}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
              <button className="f5-btn" type="button" style={{ fontSize: 12, padding: "5px 10px" }}>Manage Users</button>
              <button className="f5-btn" type="button" style={{ fontSize: 12, padding: "5px 10px" }}>View Roles</button>
              <button className="f5-btn" type="button" style={{ fontSize: 12, padding: "5px 10px" }}>Switch Into</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function ProviderRolesPanel() {
  return (
    <>
      <div className="f5-page-sub" style={{ marginTop: -6, marginBottom: 14 }}>Default roles shipped to every new provider. Provider Admins can customize or create up to 25 custom roles.</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))" }}>
        {PROVIDER_ROLES.map((r) => (
          <div key={r.key} className="f5-card" style={{ borderLeft: `3px solid ${r.color}` }}>
            <div style={{ fontWeight: 700, color: fg }}>{r.icon} {r.name}</div>
            <div style={{ fontSize: 12, color: dim, margin: "6px 0 10px" }}>{r.description}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {PERM_MODULES.map((m, i) => r.perms[i] > 0 && (
                <span key={m.key} className="f5-badge" style={{ fontSize: 10 }}>{m.label}: {PERM_LABEL[r.perms[i]]}</span>
              ))}
            </div>
          </div>
        ))}
        <div className="f5-card" style={{ borderLeft: "3px dashed var(--f5-border)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", color: dim }}>
          <div style={{ fontSize: 22 }}>＋</div>
          <div style={{ fontWeight: 700, color: fg, marginTop: 4 }}>Custom Role Template</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Provider Admins can create custom roles with any permission combination. Up to 25 per provider.</div>
        </div>
      </div>
    </>
  );
}

export function ProviderUsersPanel({ users }: { users: PlatformUserDemo[] }) {
  const statusBadge = (s: PlatformUserDemo["status"]) => s === "Active" ? "f5-badge ok" : s === "Invited" ? "f5-badge" : "f5-badge warn";
  return (
    <>
      <div className="f5-page-sub" style={{ marginTop: -6, marginBottom: 14 }}>Cross-provider view of every user across all housing provider organizations.</div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead><tr><th>User</th><th>Provider</th><th>Role</th><th>Properties</th><th>Last Login</th><th>Status</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.email}>
                <td><div style={{ color: fg, fontWeight: 600 }}>{u.name}</div><div style={{ fontSize: 11, color: dim }}>{u.email}</div></td>
                <td style={{ color: u.providerColor, fontWeight: 700 }}>{u.provider}</td>
                <td>{u.role}</td>
                <td style={{ color: dim }}>{u.properties}</td>
                <td style={{ color: dim }}>{u.lastLogin}</td>
                <td><span className={statusBadge(u.status)}>{u.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function EnvironmentsPanel() {
  return (
    <>
      <div className="f5-page-sub" style={{ marginTop: -6, marginBottom: 14 }}>Each environment is a complete isolated Fuse5 instance with its own data context.</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {ENVIRONMENTS.map((e) => (
          <div key={e.key} className="f5-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, color: fg }}>{e.dot} {e.name}</div>
              <span className={`f5-badge ${e.tone}`}>{e.badge}</span>
            </div>
            <div style={{ fontSize: 12, color: dim, margin: "10px 0" }}>{e.desc}</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12, color: "var(--f5-text-secondary)", borderTop: "1px solid var(--f5-border)", paddingTop: 10 }}>
              {e.stats.map((s) => <span key={s}>{s}</span>)}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              {e.buttons.map((b, i) => <button key={b} type="button" className={`f5-btn ${i === 0 ? "primary" : ""}`} style={{ fontSize: 12, padding: "5px 12px" }}>{b}</button>)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function PermCell({ level }: { level: PermLevel }) {
  const color = level === 3 ? "var(--f5-teal, #00CCCC)" : level === 2 ? "#3b82f6" : level === 1 ? "var(--f5-text-secondary)" : "var(--f5-text-dim)";
  return <td title={PERM_LABEL[level]} style={{ textAlign: "center", color, fontSize: 15 }}>{PERM_GLYPH[level]}</td>;
}
function MatrixRows({ roles }: { roles: RoleRow[] }) {
  return <>{roles.map((r) => (
    <tr key={r.key}>
      <td style={{ whiteSpace: "nowrap", color: fg, fontWeight: 600 }}><span style={{ color: r.color }}>{r.icon}</span> {r.name}</td>
      {r.perms.map((p, i) => <PermCell key={i} level={p} />)}
    </tr>
  ))}</>;
}
export function PermissionMatrixPanel() {
  return (
    <>
      <div className="f5-page-sub" style={{ marginTop: -6, marginBottom: 12 }}>Module access by role. ● Full · ◐ Read/Write · ○ Read · ✕ None</div>
      <div className="f5-card" style={{ padding: 0, overflow: "auto" }}>
        <table className="f5-table" style={{ minWidth: 880 }}>
          <thead><tr><th style={{ whiteSpace: "nowrap" }}>Role</th>{PERM_MODULES.map((m) => <th key={m.key} style={{ textAlign: "center", fontSize: 11 }}>{m.label}</th>)}</tr></thead>
          <tbody>
            <tr><td colSpan={13} style={{ background: "var(--f5-bg-soft, rgba(255,255,255,0.04))", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: dim }}>Fuse5 Global Roles</td></tr>
            <MatrixRows roles={F5_GLOBAL_ROLES} />
            <tr><td colSpan={13} style={{ background: "var(--f5-bg-soft, rgba(255,255,255,0.04))", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: dim }}>Provider Roles (Tenant-Level)</td></tr>
            <MatrixRows roles={PROVIDER_ROLES} />
          </tbody>
        </table>
      </div>
    </>
  );
}

export function LocationPlayerPanel({ fleet }: { fleet: PlayerDemo[] }) {
  const online = fleet.filter((f) => f.status === "online").length;
  const offline = fleet.filter((f) => f.status === "offline").length;
  const ups = fleet.filter((f) => f.uptime != null).map((f) => f.uptime as number);
  const avg = ups.length ? (ups.reduce((a, b) => a + b, 0) / ups.length).toFixed(1) : "—";
  const w = fleet.filter((f) => f.model === "H200W").length;
  const h = fleet.filter((f) => f.model === "H200").length;
  const byProvider = Array.from(new Set(fleet.map((f) => f.provider)));
  const badge = (s: PlayerDemo["status"]) => s === "online" ? "f5-badge ok" : s === "offline" ? "f5-badge danger" : s === "warning" ? "f5-badge warn" : "f5-badge";
  const upColor = (u: number | null) => u == null ? dim : u >= 98 ? "var(--f5-green,#34d399)" : u >= 95 ? "#f59e0b" : "var(--f5-red,#f87171)";
  return (
    <>
      <div className="f5-page-sub" style={{ marginTop: -6, marginBottom: 14 }}>Map H200W / H200 Android players to building locations and manage the signage fleet.</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <div className="f5-card"><div className="f5-kpi-label">Total Fleet</div><div className="f5-kpi-value">{fleet.length}</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Online</div><div className="f5-kpi-value" style={{ color: "var(--f5-green,#34d399)" }}>{online}</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Offline</div><div className="f5-kpi-value" style={{ color: "var(--f5-red,#f87171)" }}>{offline}</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Avg Uptime</div><div className="f5-kpi-value">{avg}%</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Model Split</div><div className="f5-kpi-value" style={{ fontSize: 20 }}>{w}W · {h}H</div></div>
      </div>
      {byProvider.map((prov) => {
        const rows = fleet.filter((f) => f.provider === prov);
        return (
          <div key={prov} style={{ marginTop: 18 }}>
            <div className="f5-section-title" style={{ marginBottom: 8 }}>{prov} <span style={{ color: dim, fontWeight: 400, fontSize: 12 }}>· {rows.length} players</span></div>
            <div className="f5-card" style={{ padding: 0, overflow: "auto" }}>
              <table className="f5-table" style={{ minWidth: 860 }}>
                <thead><tr><th>Player ID</th><th>Model</th><th>Property</th><th>Location</th><th>Status</th><th>Uptime</th><th>Firmware</th><th>Display</th><th>Last Seen</th></tr></thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td style={{ color: "var(--f5-teal,#00CCCC)", fontFamily: "monospace", fontSize: 12 }}>{p.id}</td>
                      <td><span className="f5-badge" style={p.model === "H200W" ? undefined : { background: "rgba(168,85,247,0.18)", color: "#c084fc" }}>{p.model}</span></td>
                      <td>{p.property}</td>
                      <td>{p.location}</td>
                      <td><span className={badge(p.status)} style={{ textTransform: "capitalize" }}>{p.status}</span></td>
                      <td style={{ color: upColor(p.uptime) }}>{p.uptime == null ? "—" : `${p.uptime}%`}</td>
                      <td style={{ color: p.firmware == null ? dim : "var(--f5-text-secondary)" }}>{p.firmware ?? "—"}</td>
                      <td style={{ fontSize: 12 }}>{p.display} {p.orientation === "portrait" ? "↕" : "↔"}</td>
                      <td style={{ color: p.status === "offline" ? "var(--f5-red,#f87171)" : dim }}>{p.lastSeen}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </>
  );
}
