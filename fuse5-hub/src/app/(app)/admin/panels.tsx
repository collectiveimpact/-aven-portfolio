"use client";

import { useMemo, useState, useTransition } from "react";
import {
  PERM_MODULES, PERM_GLYPH, PERM_LABEL, F5_GLOBAL_ROLES, PROVIDER_ROLES, ENVIRONMENTS, LATEST_FIRMWARE,
  type ProviderDemo, type PlatformUserDemo, type PlayerDemo, type RoleRow, type PermLevel,
} from "@/lib/platform";
import type { PlatformStats, AuditRow, SubscriptionInfo } from "@/lib/queries";
import { recordPlatformAction } from "./providers-actions";
import { Overlay, OverlayHeader, Saved } from "./admin-prov-ui";

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

// Compliance frameworks an operator can assign to a provider (ported intent from
// the v8 COMPLIANCE_FRAMEWORKS / PROVIDER_COMPLIANCE assignment UI).
const COMPLIANCE_FRAMEWORKS = [
  { id: "rgi_hsa", name: "RGI / HSA (Ontario)" },
  { id: "onpha_standard", name: "ONPHA Standard" },
  { id: "fire_code", name: "Fire Code + Lobby Signage" },
  { id: "custom", name: "Custom Provider Policy" },
] as const;

// small helper: fire a platform action, reflect persisted/optimistic to caller.
function usePlatformAction() {
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<{ persisted?: boolean } | null>(null);
  const run = (action: string, detail: string, after?: () => void) => {
    setFlash(null);
    start(async () => {
      const r = await recordPlatformAction(action, detail);
      if (r.ok) { setFlash({ persisted: r.persisted }); after?.(); }
    });
  };
  return { pending, flash, run, clearFlash: () => setFlash(null) };
}

export function PlatformOverviewPanel({ stats, providers }: { stats: PlatformStats; providers: ProviderDemo[] }) {
  const [env, setEnv] = useState("live");
  const [open, setOpen] = useState<ProviderDemo | null>(null);
  const kpis = [
    { label: "Providers", value: String(stats.providers) },
    { label: "Total Users", value: String(stats.users) },
    { label: "Properties", value: String(stats.properties) },
    { label: "Tenants", value: stats.tenants.toLocaleString() },
    { label: "Uptime", value: stats.uptime },
  ];
  const envLabel: Record<string, string> = { live: "Live Production", test: "Test / Staging", demo: "Demo Site", sales: "Sales Site" };
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div className="f5-page-sub" style={{ marginTop: -6 }}>Fuse5 Communication Hub — Multi-Tenant Admin Console · <span style={{ color: "var(--f5-teal,#00CCCC)" }}>{envLabel[env]}</span></div>
        <select className="f5-select" value={env} onChange={(e) => setEnv(e.target.value)} style={{ maxWidth: 200 }}>
          <option value="live">🟢 Live Production</option>
          <option value="test">🟡 Test / Staging</option>
          <option value="demo">🟣 Demo Site</option>
          <option value="sales">🔵 Sales Site</option>
        </select>
      </div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(5,1fr)", marginTop: 12 }}>
        {kpis.map((k) => <div key={k.label} className="f5-card"><div className="f5-kpi-label">{k.label}</div><div className="f5-kpi-value">{k.value}</div></div>)}
      </div>
      <div className="f5-section-title">Active Providers</div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        {providers.map((p) => (
          <div key={p.id} role="button" tabIndex={0} onClick={() => setOpen(p)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen(p); } }}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--f5-border)", opacity: p.status === "onboarding" ? 0.65 : 1, cursor: "pointer" }}>
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
      {open && <ProviderDetailDrawer provider={open} onClose={() => setOpen(null)} />}
    </>
  );
}

// Shared read-only provider detail drawer (used by Overview + All Providers "View").
function ProviderDetailDrawer({ provider: p, onClose }: { provider: ProviderDemo; onClose: () => void }) {
  const stat = (l: string, v: React.ReactNode) => (
    <div style={{ textAlign: "center", padding: "10px 4px", background: "var(--f5-bg-soft, rgba(255,255,255,0.03))", borderRadius: 8 }}>
      <div style={{ fontWeight: 800, color: fg, fontSize: 18 }}>{v}</div>
      <div style={{ fontSize: 10, color: dim, textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</div>
    </div>
  );
  return (
    <Overlay variant="drawer" width={460} onClose={onClose}>
      <OverlayHeader
        title={<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Avatar short={p.short} color={p.color} />{p.name}</span>}
        sub={`${p.tier} tier · Active since ${p.since}`}
        onClose={onClose}
      />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {p.status === "onboarding" ? <span className="f5-badge warn">Onboarding</span> : <span className="f5-badge ok">Active</span>}
        <span className={`f5-badge ${p.yardi === "synced" ? "" : "warn"}`}>{p.yardi === "synced" ? "Yardi Synced" : p.yardi === "pending" ? "Yardi Pending" : "No Yardi"}</span>
      </div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {stat("Users", p.users)}{stat("Roles", p.roles.length)}{stat("Properties", p.properties)}
        {stat("Tenants", p.tenants.toLocaleString())}{stat("Players", p.players)}{stat("Compliance", `${p.compliance}%`)}
      </div>
      <div className="f5-section-title">Role Distribution</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {p.roles.map((r) => (
          <div key={r.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--f5-border)", fontSize: 13 }}>
            <span style={{ color: fg }}>{r.name}{r.custom && <span style={{ color: "#c084fc", fontSize: 10 }}> · custom</span>}</span>
            <span className="f5-badge">{r.count}</span>
          </div>
        ))}
      </div>
    </Overlay>
  );
}

// editable provider shape held client-side (no provider table in local schema).
type ProviderEdit = { tier: ProviderDemo["tier"]; yardi: ProviderDemo["yardi"]; compliance: number; framework: string; complianceEnabled: boolean };

export function AllProvidersPanel({ providers }: { providers: ProviderDemo[] }) {
  // client-side working set so adds/edits/toggles are visible immediately.
  const [list, setList] = useState<ProviderDemo[]>(providers);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ProviderDemo | null>(null);
  const [viewing, setViewing] = useState<ProviderDemo | null>(null);
  const { pending, flash, run } = usePlatformAction();

  const upsert = (next: ProviderDemo) => setList((cur) => {
    const i = cur.findIndex((x) => x.id === next.id);
    if (i < 0) return [...cur, next];
    const copy = cur.slice(); copy[i] = next; return copy;
  });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div className="f5-page-sub" style={{ marginTop: -6 }}>Layer 2 — each provider is an isolated organization with their own users, roles, and properties.</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {flash && <Saved persisted={flash.persisted} />}
          <button className="f5-btn primary" type="button" onClick={() => setAdding(true)}>+ Add Provider</button>
        </div>
      </div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px,1fr))", marginTop: 14 }}>
        {list.filter((p) => p.status === "active").map((p) => (
          <div key={p.id} className="f5-card">
            <div role="button" tabIndex={0} onClick={() => setViewing(p)}
              onKeyDown={(e) => { if (e.key === "Enter") setViewing(p); }}
              style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
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
              {p.roles.map((r) => <span key={r.name} className="f5-badge" style={r.custom ? { background: "rgba(168,85,247,0.18)", color: "#c084fc" } : undefined}>{r.name} ({r.count})</span>)}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 14 }}>
              <button className="f5-btn" type="button" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => setViewing(p)}>View Detail</button>
              <button className="f5-btn" type="button" style={{ fontSize: 12, padding: "5px 10px" }} onClick={() => setEditing(p)}>Edit</button>
              <button className="f5-btn" type="button" style={{ fontSize: 12, padding: "5px 10px" }}
                onClick={() => run("Switched Into Provider", `Operator switched into ${p.name}`)}>Switch Into</button>
            </div>
          </div>
        ))}
      </div>

      {viewing && <ProviderDetailDrawer provider={viewing} onClose={() => setViewing(null)} />}
      {adding && (
        <AddProviderModal
          onClose={() => setAdding(false)}
          onAdd={(prov) => {
            upsert(prov);
            run("Provider Created", `Added provider ${prov.name} (${prov.tier})`);
            setAdding(false);
          }}
        />
      )}
      {editing && (
        <EditProviderModal
          provider={editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(edit) => {
            const next: ProviderDemo = { ...editing, tier: edit.tier, yardi: edit.yardi, compliance: edit.compliance };
            upsert(next);
            const fw = COMPLIANCE_FRAMEWORKS.find((f) => f.id === edit.framework)?.name ?? edit.framework;
            run("Provider Updated", `Updated ${next.name}: tier ${next.tier}, yardi ${next.yardi}, compliance ${edit.complianceEnabled ? "on" : "off"} (${fw}, ${next.compliance}%)`);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function AddProviderModal({ onClose, onAdd }: { onClose: () => void; onAdd: (p: ProviderDemo) => void }) {
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [tier, setTier] = useState<ProviderDemo["tier"]>("ORO");
  const [color, setColor] = useState("#009999");
  const [yardi, setYardi] = useState<ProviderDemo["yardi"]>("none");
  const valid = name.trim().length > 1 && short.trim().length >= 1;
  const submit = () => {
    if (!valid) return;
    onAdd({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24) || `prov-${Date.now()}`,
      short: short.trim().toUpperCase().slice(0, 3),
      name: name.trim(), tier, color,
      since: new Date().toLocaleDateString("en-CA", { month: "short", year: "numeric" }),
      yardi, status: "active",
      properties: 0, users: 1, tenants: 0, players: 0, compliance: 0,
      roles: [{ name: "Provider Admin", count: 1 }],
    });
  };
  return (
    <Overlay onClose={onClose} width={520}>
      <OverlayHeader title="Add Provider" sub="Provision a new isolated provider organization." onClose={onClose} />
      <div className="f5-grid" style={{ gridTemplateColumns: "2fr 1fr", gap: 10 }}>
        <div><label className="f5-label">Organization name</label><input className="f5-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Maple Housing Co-op" autoFocus /></div>
        <div><label className="f5-label">Short code</label><input className="f5-input" value={short} onChange={(e) => setShort(e.target.value)} maxLength={3} placeholder="MH" /></div>
      </div>
      <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 8 }}>
        <div><label className="f5-label">Tier</label>
          <select className="f5-select" value={tier} onChange={(e) => setTier(e.target.value as ProviderDemo["tier"])}>
            <option value="ORO">ORO</option><option value="PLATO">PLATO</option><option value="EMPRESA">EMPRESA</option>
          </select>
        </div>
        <div><label className="f5-label">Yardi</label>
          <select className="f5-select" value={yardi} onChange={(e) => setYardi(e.target.value as ProviderDemo["yardi"])}>
            <option value="none">Not connected</option><option value="pending">Pending</option><option value="synced">Synced</option>
          </select>
        </div>
        <div><label className="f5-label">Brand color</label><input className="f5-input" value={color} onChange={(e) => setColor(e.target.value)} /></div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="f5-btn primary" type="button" disabled={!valid} onClick={submit}>Create Provider</button>
        <button className="f5-btn" type="button" onClick={onClose}>Cancel</button>
      </div>
    </Overlay>
  );
}

function EditProviderModal({ provider: p, pending, onClose, onSave }: { provider: ProviderDemo; pending: boolean; onClose: () => void; onSave: (e: ProviderEdit) => void }) {
  const [edit, setEdit] = useState<ProviderEdit>({ tier: p.tier, yardi: p.yardi, compliance: p.compliance, framework: COMPLIANCE_FRAMEWORKS[0].id, complianceEnabled: p.compliance > 0 });
  return (
    <Overlay onClose={onClose} width={500}>
      <OverlayHeader title={<span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><Avatar short={p.short} color={p.color} />{p.name}</span>} sub="Edit provider configuration" onClose={onClose} />
      <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div><label className="f5-label">Tier</label>
          <select className="f5-select" value={edit.tier} onChange={(e) => setEdit({ ...edit, tier: e.target.value as ProviderDemo["tier"] })}>
            <option value="ORO">ORO</option><option value="PLATO">PLATO</option><option value="EMPRESA">EMPRESA</option>
          </select>
        </div>
        <div><label className="f5-label">Yardi sync</label>
          <select className="f5-select" value={edit.yardi} onChange={(e) => setEdit({ ...edit, yardi: e.target.value as ProviderDemo["yardi"] })}>
            <option value="none">Not connected</option><option value="pending">Pending</option><option value="synced">Synced</option>
          </select>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        <label className="f5-label">Compliance target ({edit.compliance}%)</label>
        <input type="range" min={0} max={100} value={edit.compliance} onChange={(e) => setEdit({ ...edit, compliance: Number(e.target.value) })} style={{ width: "100%", accentColor: "var(--f5-teal,#009999)" }} />
      </div>
      {/* Compliance framework assignment + enable (port of v8 updateProviderFramework / toggleProviderCompliance) */}
      <div className="f5-grid" style={{ gridTemplateColumns: "1fr auto", gap: 10, marginTop: 8, alignItems: "end" }}>
        <div><label className="f5-label">Compliance framework</label>
          <select className="f5-select" value={edit.framework} onChange={(e) => setEdit({ ...edit, framework: e.target.value })}>
            {COMPLIANCE_FRAMEWORKS.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <span className={`f5-badge ${edit.complianceEnabled ? "ok" : ""}`} onClick={() => setEdit({ ...edit, complianceEnabled: !edit.complianceEnabled })}
          style={{ cursor: "pointer", userSelect: "none", padding: "8px 12px" }}>
          {edit.complianceEnabled ? "Tracking On" : "Tracking Off"}
        </span>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
        <button className="f5-btn primary" type="button" disabled={pending} onClick={() => onSave(edit)}>{pending ? "Saving…" : "Save Changes"}</button>
        <button className="f5-btn" type="button" onClick={onClose}>Cancel</button>
      </div>
    </Overlay>
  );
}

// ---- Provider Role Templates: editable permission grid per role ----

function PermSelect({ level, onChange }: { level: PermLevel; onChange: (l: PermLevel) => void }) {
  return (
    <select
      className="f5-select"
      value={level}
      onChange={(e) => onChange(Number(e.target.value) as PermLevel)}
      style={{ fontSize: 11, padding: "3px 6px", minWidth: 0 }}
    >
      {([3, 2, 1, 0] as PermLevel[]).map((l) => <option key={l} value={l}>{PERM_GLYPH[l]} {PERM_LABEL[l]}</option>)}
    </select>
  );
}

export function ProviderRolesPanel() {
  const [roles, setRoles] = useState<RoleRow[]>(PROVIDER_ROLES);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [creating, setCreating] = useState(false);
  const { flash, run } = usePlatformAction();

  const saveRole = (next: RoleRow) => {
    setRoles((cur) => {
      const i = cur.findIndex((r) => r.key === next.key);
      if (i < 0) return [...cur, next];
      const copy = cur.slice(); copy[i] = next; return copy;
    });
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div className="f5-page-sub" style={{ marginTop: -6 }}>Default roles shipped to every new provider. Provider Admins can customize or create up to 25 custom roles.</div>
        {flash && <Saved persisted={flash.persisted} />}
      </div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))" }}>
        {roles.map((r) => (
          <div key={r.key} className="f5-card" style={{ borderLeft: `3px solid ${r.color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ fontWeight: 700, color: fg }}>{r.icon} {r.name}</div>
              <button className="f5-btn" type="button" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => setEditing(r)}>Edit</button>
            </div>
            <div style={{ fontSize: 12, color: dim, margin: "6px 0 10px" }}>{r.description}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
              {PERM_MODULES.map((m, i) => {
                const lvl = r.perms[i];
                const c = lvl === 3 ? "rgba(0,153,153,0.18)" : lvl === 2 ? "rgba(59,130,246,0.18)" : lvl === 1 ? "var(--f5-bg-soft, rgba(255,255,255,0.05))" : "rgba(239,68,68,0.14)";
                const t = lvl === 3 ? "var(--f5-teal,#00CCCC)" : lvl === 2 ? "#60a5fa" : lvl === 1 ? "var(--f5-text-secondary)" : "#f87171";
                return <span key={m.key} className="f5-badge" style={{ fontSize: 10, background: c, color: t }}>{m.label}: {PERM_LABEL[lvl]}</span>;
              })}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setCreating(true)} className="f5-card"
          style={{ borderLeft: "3px dashed var(--f5-border)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", color: dim, cursor: "pointer", font: "inherit" }}>
          <div style={{ fontSize: 22 }}>＋</div>
          <div style={{ fontWeight: 700, color: fg, marginTop: 4 }}>Custom Role Template</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Provider Admins can create custom roles with any permission combination. Up to 25 per provider.</div>
        </button>
      </div>

      {editing && (
        <RoleTemplateEditor
          role={editing}
          onClose={() => setEditing(null)}
          onSave={(next) => { saveRole(next); run("Provider Role Updated", `Updated template "${next.name}" permissions`); setEditing(null); }}
        />
      )}
      {creating && (
        <RoleTemplateEditor
          role={{ key: `custom_${Date.now()}`, name: "New Custom Role", icon: "✨", color: "#a855f7", perms: Array(PERM_MODULES.length).fill(0) as PermLevel[], description: "Custom provider role." }}
          isNew
          onClose={() => setCreating(false)}
          onSave={(next) => { saveRole(next); run("Provider Role Created", `Created template "${next.name}"`); setCreating(false); }}
        />
      )}
    </>
  );
}

function RoleTemplateEditor({ role, isNew, onClose, onSave }: { role: RoleRow; isNew?: boolean; onClose: () => void; onSave: (r: RoleRow) => void }) {
  const [draft, setDraft] = useState<RoleRow>({ ...role, perms: [...role.perms] });
  const setPerm = (i: number, lvl: PermLevel) => setDraft((d) => { const perms = [...d.perms]; perms[i] = lvl; return { ...d, perms }; });
  const fullCount = draft.perms.filter((p) => p === 3).length;
  return (
    <Overlay onClose={onClose} width={560}>
      <OverlayHeader title={`${isNew ? "New" : "Edit"} Role Template`} sub="Set the permission level for each module." onClose={onClose} />
      {isNew && (
        <div className="f5-grid" style={{ gridTemplateColumns: "1fr 90px", gap: 10, marginBottom: 12 }}>
          <div><label className="f5-label">Role name</label><input className="f5-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} autoFocus /></div>
          <div><label className="f5-label">Icon</label><input className="f5-input" value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} maxLength={2} /></div>
        </div>
      )}
      {!isNew && <div style={{ fontWeight: 700, color: fg, marginBottom: 10 }}>{draft.icon} {draft.name}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 150px", gap: "6px 10px", alignItems: "center" }}>
        {PERM_MODULES.map((m, i) => (
          <div key={m.key} style={{ display: "contents" }}>
            <span style={{ fontSize: 13, color: "var(--f5-text-secondary)" }}>{m.label}</span>
            <PermSelect level={draft.perms[i]} onChange={(l) => setPerm(i, l)} />
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: dim, marginTop: 12 }}>{fullCount} module{fullCount === 1 ? "" : "s"} at Full access.</div>
      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <button className="f5-btn primary" type="button" onClick={() => onSave(draft)}>Save Template</button>
        <button className="f5-btn" type="button" onClick={onClose}>Cancel</button>
      </div>
    </Overlay>
  );
}

export function ProviderUsersPanel({ users }: { users: PlatformUserDemo[] }) {
  const statusBadge = (s: PlatformUserDemo["status"]) => s === "Active" ? "f5-badge ok" : s === "Invited" ? "f5-badge" : "f5-badge warn";
  const [filter, setFilter] = useState("All Providers");
  const [open, setOpen] = useState<PlatformUserDemo | null>(null);
  const providers = ["All Providers", ...Array.from(new Set(users.map((u) => u.provider)))];
  const rows = users.filter((u) => filter === "All Providers" || u.provider === filter);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div className="f5-page-sub" style={{ marginTop: -6 }}>Cross-provider view of every user across all housing provider organizations.</div>
        <select className="f5-select" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ maxWidth: 180 }}>
          {providers.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden", marginTop: 12 }}>
        <table className="f5-table">
          <thead><tr><th>User</th><th>Provider</th><th>Role</th><th>Properties</th><th>Last Login</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.email} style={{ cursor: "pointer" }} onClick={() => setOpen(u)}>
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
      {open && <ProviderUserDrawer user={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function ProviderUserDrawer({ user: u, onClose }: { user: PlatformUserDemo; onClose: () => void }) {
  const { pending, flash, run } = usePlatformAction();
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--f5-border)", fontSize: 13 }}>
      <span style={{ color: dim }}>{k}</span><span style={{ color: fg }}>{v}</span>
    </div>
  );
  return (
    <Overlay variant="drawer" width={420} onClose={onClose}>
      <OverlayHeader title={u.name} sub={u.email} onClose={onClose} />
      <Row k="Provider" v={<span style={{ color: u.providerColor, fontWeight: 700 }}>{u.provider}</span>} />
      <Row k="Role" v={u.role} />
      <Row k="Properties" v={u.properties} />
      <Row k="Last login" v={u.lastLogin} />
      <Row k="Status" v={u.status} />
      <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
        <button className="f5-btn" type="button" disabled={pending} onClick={() => run("Password Reset Sent", `Sent reset to ${u.email}`)}>Send Password Reset</button>
        <button className="f5-btn" type="button" disabled={pending} onClick={() => run("User Access Suspended", `Suspended ${u.email}`)}>Suspend</button>
        {flash && <Saved persisted={flash.persisted} label="Done" />}
      </div>
    </Overlay>
  );
}

export function EnvironmentsPanel() {
  const [action, setAction] = useState<{ env: string; label: string } | null>(null);
  const { pending, flash, run, clearFlash } = usePlatformAction();
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div className="f5-page-sub" style={{ marginTop: -6 }}>Each environment is a complete isolated Fuse5 instance with its own data context.</div>
        {flash && <Saved persisted={flash.persisted} label="Done" />}
      </div>
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
              {e.buttons.map((b, i) => (
                <button key={b} type="button" className={`f5-btn ${i === 0 ? "primary" : ""}`} style={{ fontSize: 12, padding: "5px 12px" }}
                  onClick={() => { clearFlash(); setAction({ env: e.name, label: b }); }}>{b}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {action && (
        <Overlay onClose={() => setAction(null)} width={440}>
          <OverlayHeader title={action.label} sub={action.env} onClose={() => setAction(null)} />
          <div style={{ fontSize: 13, color: "var(--f5-text-secondary)", marginBottom: 16 }}>
            {action.label.startsWith("Reset")
              ? `This will reset all demo data in ${action.env} to the seeded sample set. This cannot be undone.`
              : action.label.startsWith("+")
              ? `Provision a new prospect instance under ${action.env}.`
              : `Switch your active operator context to ${action.env}. Subsequent panels will read from this environment.`}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button className="f5-btn primary" type="button" disabled={pending}
              onClick={() => run(`Environment: ${action.label}`, `${action.label} on ${action.env}`, () => setAction(null))}>
              {pending ? "Working…" : "Confirm"}
            </button>
            <button className="f5-btn" type="button" onClick={() => setAction(null)}>Cancel</button>
          </div>
        </Overlay>
      )}
    </>
  );
}

/* ---------------- Interactive Permission Matrix ---------------- */

// Editable matrix: click a cell to cycle Full → R/W → Read → None. Effective
// permissions + a live summary recompute from the working copy (port of v8
// getEffectivePermissions/hasPermission semantics: effective = role's level per
// module; "has access" = level >= 1).
const cycle: Record<PermLevel, PermLevel> = { 3: 2, 2: 1, 1: 0, 0: 3 };

function EditableMatrixRows({ roles, onCycle }: { roles: RoleRow[]; onCycle: (key: string, mod: number) => void }) {
  return <>{roles.map((r) => (
    <tr key={r.key}>
      <td style={{ whiteSpace: "nowrap", color: fg, fontWeight: 600 }}><span style={{ color: r.color }}>{r.icon}</span> {r.name}</td>
      {r.perms.map((p, i) => (
        <td key={i} onClick={() => onCycle(r.key, i)} title={`${PERM_LABEL[p]} — click to change`}
          style={{ textAlign: "center", cursor: "pointer", userSelect: "none", fontSize: 15,
            color: p === 3 ? "var(--f5-teal, #00CCCC)" : p === 2 ? "#3b82f6" : p === 1 ? "var(--f5-text)" : "var(--f5-text-muted)",
            opacity: p === 0 ? 0.6 : 1 }}>
          {PERM_GLYPH[p]}
        </td>
      ))}
    </tr>
  ))}</>;
}

export function PermissionMatrixPanel() {
  const [globalRoles, setGlobalRoles] = useState<RoleRow[]>(F5_GLOBAL_ROLES.map((r) => ({ ...r, perms: [...r.perms] })));
  const [provRoles, setProvRoles] = useState<RoleRow[]>(PROVIDER_ROLES.map((r) => ({ ...r, perms: [...r.perms] })));
  const [selected, setSelected] = useState<string>(PROVIDER_ROLES[0].key);
  const { flash, run } = usePlatformAction();

  const allRoles = [...globalRoles, ...provRoles];
  const sel = allRoles.find((r) => r.key === selected) ?? allRoles[0];

  // Port of getEffectivePermissions/hasPermission for the selected role.
  const effective = useMemo(() => PERM_MODULES.map((m, i) => ({ module: m.label, level: sel.perms[i] })), [sel]);
  const accessible = effective.filter((e) => e.level >= 1).length; // hasPermission(mod, READ)
  const writable = effective.filter((e) => e.level >= 2).length;
  const full = effective.filter((e) => e.level === 3).length;

  const setRoles = (key: string, fn: (r: RoleRow) => RoleRow) => {
    setGlobalRoles((rs) => rs.map((r) => (r.key === key ? fn(r) : r)));
    setProvRoles((rs) => rs.map((r) => (r.key === key ? fn(r) : r)));
  };
  const onCycle = (key: string, mod: number) => {
    setSelected(key);
    setRoles(key, (r) => { const perms = [...r.perms]; perms[mod] = cycle[perms[mod]]; return { ...r, perms }; });
    const role = allRoles.find((r) => r.key === key);
    run("Permission Changed", `${role?.name}: ${PERM_MODULES[mod].label} → ${PERM_LABEL[cycle[role?.perms[mod] ?? 0]]}`);
  };

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <div className="f5-page-sub" style={{ marginTop: -6 }}>Module access by role. ● Full · ◐ Read/Write · ○ Read · ✕ None — click a cell to change.</div>
        {flash && <Saved persisted={flash.persisted} />}
      </div>

      {/* Live effective-permission summary for the selected role */}
      <div className="f5-card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, color: dim }}>Effective permissions for</span>
            <select className="f5-select" value={selected} onChange={(e) => setSelected(e.target.value)} style={{ maxWidth: 240 }}>
              <optgroup label="Fuse5 Global Roles">{globalRoles.map((r) => <option key={r.key} value={r.key}>{r.icon} {r.name}</option>)}</optgroup>
              <optgroup label="Provider Roles">{provRoles.map((r) => <option key={r.key} value={r.key}>{r.icon} {r.name}</option>)}</optgroup>
            </select>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span className="f5-badge ok">{accessible}/{PERM_MODULES.length} accessible</span>
            <span className="f5-badge" style={{ background: "rgba(59,130,246,0.18)", color: "#60a5fa" }}>{writable} writable</span>
            <span className="f5-badge" style={{ background: "rgba(0,153,153,0.18)", color: "var(--f5-teal,#00CCCC)" }}>{full} full</span>
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 12 }}>
          {effective.map((e) => (
            <span key={e.module} className="f5-badge" style={{ fontSize: 10, opacity: e.level === 0 ? 0.5 : 1 }}>
              {PERM_GLYPH[e.level]} {e.module}
            </span>
          ))}
        </div>
      </div>

      <div className="f5-card" style={{ padding: 0, overflow: "auto" }}>
        <table className="f5-table" style={{ minWidth: 880 }}>
          <thead><tr><th style={{ whiteSpace: "nowrap" }}>Role</th>{PERM_MODULES.map((m) => <th key={m.key} style={{ textAlign: "center", fontSize: 11 }}>{m.label}</th>)}</tr></thead>
          <tbody>
            <tr><td colSpan={13} style={{ background: "var(--f5-bg-soft, rgba(255,255,255,0.04))", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: dim }}>Fuse5 Global Roles</td></tr>
            <EditableMatrixRows roles={globalRoles} onCycle={onCycle} />
            <tr><td colSpan={13} style={{ background: "var(--f5-bg-soft, rgba(255,255,255,0.04))", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: dim }}>Provider Roles (Tenant-Level)</td></tr>
            <EditableMatrixRows roles={provRoles} onCycle={onCycle} />
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------------- Location-Player Config ---------------- */

export function LocationPlayerPanel({ fleet }: { fleet: PlayerDemo[] }) {
  const [open, setOpen] = useState<PlayerDemo | null>(null);
  const [config, setConfig] = useState<PlayerDemo | null>(null);
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
      <div className="f5-page-sub" style={{ marginTop: -6, marginBottom: 14 }}>Map H200W / H200 Android players to building locations and manage the signage fleet. Click a player to view it.</div>
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
              <table className="f5-table" style={{ minWidth: 920 }}>
                <thead><tr><th>Player ID</th><th>Model</th><th>Property</th><th>Location</th><th>Status</th><th>Uptime</th><th>Firmware</th><th>Display</th><th>Last Seen</th><th></th></tr></thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => setOpen(p)}>
                      <td style={{ color: "var(--f5-teal,#00CCCC)", fontFamily: "monospace", fontSize: 12 }}>{p.id}</td>
                      <td><span className="f5-badge" style={p.model === "H200W" ? undefined : { background: "rgba(168,85,247,0.18)", color: "#c084fc" }}>{p.model}</span></td>
                      <td>{p.property}</td>
                      <td>{p.location}</td>
                      <td><span className={badge(p.status)} style={{ textTransform: "capitalize" }}>{p.status}</span></td>
                      <td style={{ color: upColor(p.uptime) }}>{p.uptime == null ? "—" : `${p.uptime}%`}</td>
                      <td style={{ color: p.firmware == null ? dim : "var(--f5-text-secondary)" }}>{p.firmware ?? "—"}</td>
                      <td style={{ fontSize: 12 }}>{p.display} {p.orientation === "portrait" ? "↕" : "↔"}</td>
                      <td style={{ color: p.status === "offline" ? "var(--f5-red,#f87171)" : dim }}>{p.lastSeen}</td>
                      <td onClick={(e) => { e.stopPropagation(); setConfig(p); }}>
                        <button className="f5-btn" type="button" style={{ fontSize: 11, padding: "3px 8px" }}>Pull config</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <div className="f5-section-title">Firmware Distribution</div>
      <div className="f5-card">
        {Object.entries(fleet.reduce<Record<string, number>>((a, f) => { const v = f.firmware ?? "—"; a[v] = (a[v] ?? 0) + 1; return a; }, {}))
          .sort((a, b) => (a[0] === LATEST_FIRMWARE ? -1 : b[0] === LATEST_FIRMWARE ? 1 : b[1] - a[1]))
          .map(([ver, count]) => (
            <div key={ver} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--f5-border)" }}>
              <span style={{ color: fg, fontFamily: "monospace", fontSize: 13 }}>{ver}</span>
              <span style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: dim, fontSize: 12 }}>{count} player{count === 1 ? "" : "s"}</span>
                {ver === LATEST_FIRMWARE
                  ? <span className="f5-badge ok">Latest</span>
                  : ver === "—" ? <span className="f5-badge">Provisioning</span> : <span className="f5-badge warn">Update Available</span>}
              </span>
            </div>
          ))}
      </div>

      {open && <PlayerDetailDrawer player={open} onClose={() => setOpen(null)} onPullConfig={() => { setConfig(open); setOpen(null); }} />}
      {config && <PullConfigModal player={config} onClose={() => setConfig(null)} />}
    </>
  );
}

function PlayerDetailDrawer({ player: p, onClose, onPullConfig }: { player: PlayerDemo; onClose: () => void; onPullConfig: () => void }) {
  const { pending, flash, run } = usePlatformAction();
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--f5-border)", fontSize: 13 }}>
      <span style={{ color: dim }}>{k}</span><span style={{ color: fg }}>{v}</span>
    </div>
  );
  return (
    <Overlay variant="drawer" width={440} onClose={onClose}>
      <OverlayHeader title={<span style={{ fontFamily: "monospace", color: "var(--f5-teal,#00CCCC)" }}>{p.id}</span>} sub={`${p.property} · ${p.location}`} onClose={onClose} />
      <Row k="Model" v={p.model} />
      <Row k="Provider" v={p.provider} />
      <Row k="Status" v={<span style={{ textTransform: "capitalize" }}>{p.status}</span>} />
      <Row k="Uptime" v={p.uptime == null ? "—" : `${p.uptime}%`} />
      <Row k="Firmware" v={p.firmware ?? "—"} />
      <Row k="Display" v={`${p.display} · ${p.orientation}`} />
      <Row k="Last seen" v={p.lastSeen} />
      <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
        <button className="f5-btn primary" type="button" onClick={onPullConfig}>Pull Configuration</button>
        <button className="f5-btn" type="button" disabled={pending} onClick={() => run("Player Reboot Requested", `Reboot ${p.id}`)}>Reboot</button>
        {flash && <Saved persisted={flash.persisted} label="Sent" />}
      </div>
    </Overlay>
  );
}

// Resolves and shows the effective player configuration. Optimistic/demo: the
// config is composed from the player's known state + fleet defaults, replacing
// the v8 "pull configuration coming soon" stub with a working action.
function PullConfigModal({ player: p, onClose }: { player: PlayerDemo; onClose: () => void }) {
  const { pending, flash, run } = usePlatformAction();
  const resolved = useMemo(() => ({
    playerId: p.id,
    model: p.model,
    provider: p.provider,
    property: p.property,
    location: p.location,
    display: { resolution: p.display, orientation: p.orientation },
    firmware: { current: p.firmware ?? "unprovisioned", target: LATEST_FIRMWARE, upToDate: p.firmware === LATEST_FIRMWARE },
    network: { status: p.status, uptime: p.uptime, lastSeen: p.lastSeen },
    playback: { defaultPlaylist: `${p.provider} — Lobby Loop`, dayparting: true, volume: 0, fallbackImage: "fuse5-default.jpg" },
    schedule: { quietStart: "22:00", quietEnd: "07:00", reboot: "03:00 daily" },
  }), [p]);
  return (
    <Overlay onClose={onClose} width={560}>
      <OverlayHeader title="Resolved Configuration" sub={<span style={{ fontFamily: "monospace" }}>{p.id}</span>} onClose={onClose} />
      <pre style={{ background: "var(--f5-bg-soft, rgba(255,255,255,0.04))", border: "1px solid var(--f5-border)", borderRadius: 8, padding: 14, fontSize: 11.5, lineHeight: 1.5, overflow: "auto", maxHeight: "52vh", color: "var(--f5-text-secondary)", margin: 0 }}>
        {JSON.stringify(resolved, null, 2)}
      </pre>
      <div style={{ display: "flex", gap: 8, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
        <button className="f5-btn primary" type="button" disabled={pending}
          onClick={() => run("Player Config Pulled", `Pulled resolved config for ${p.id}`)}>{pending ? "Pulling…" : "Re-pull from device"}</button>
        <button className="f5-btn" type="button" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(resolved, null, 2)); }}>Copy JSON</button>
        <button className="f5-btn" type="button" onClick={onClose}>Close</button>
        {flash && <Saved persisted={flash.persisted} label="Pulled" />}
      </div>
    </Overlay>
  );
}
