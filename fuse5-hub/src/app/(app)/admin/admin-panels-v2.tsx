"use client";

import { useMemo, useState, useTransition } from "react";
import {
  F5_ROLE_CARDS, F5_STAFF, ENV_EMOJI, SYSTEM_INTEGRATIONS,
  MASTER_TEMPLATES, TEMPLATE_CATEGORIES, TEMPLATE_STATS, CHANNEL_ICON,
  APPROVAL_QUEUE, APPROVAL_STAGES, CATEGORY_TIERS, TIER_META,
  COMPLIANCE_FRAMEWORKS, PROVIDER_COMPLIANCE, complianceBenchmark, BILLING_MRR, BILLING_SUMMARY,
  type ApprovalStatus, type ApprovalItem, type MasterTemplate, type SysIntegration, type ProviderCompliance,
} from "@/lib/platform-admin";
import type { ApprovalWorkflowRow, ApprovalQueueRow, IntegrationConfigRow } from "@/lib/admin-store";
import { syncComplianceScores } from "./compliance-actions";
import {
  logApproval, logBulkApproval, saveApprovalWorkflow,
  saveTemplate, pushTemplateUpdate, cloneTemplate,
  setIntegrationEnabled, saveIntegrationConfig, testIntegration,
  saveRolePermissions, setComplianceControl, setProviderFrameworkEnabled,
} from "./workflow-actions";
import { WfModal, WfSwitch, WfFlash, labelStyle } from "./admin-wf-ui";
import type { SyncStatus } from "@/lib/compliance/agent";
import { FilterBar } from "@/components/filters/FilterBar";
import { SortHeader } from "@/components/filters/SortHeader";
import type { FilterField, FilterOption } from "@/components/filters/types";
import { useFilterState, applyFilters } from "@/lib/filters";
import { useSortState, applySort } from "@/lib/sort";

const uniqueSorted = (xs: (string | null | undefined)[]): string[] =>
  [...new Set(xs.filter((x): x is string => !!x && x !== "—"))].sort((a, b) => a.localeCompare(b));
const toOptions = (xs: string[]): FilterOption[] => xs.map((x) => ({ value: x, label: x }));

// Channels and the per-role permission catalog the editors draw from.
const ALL_CHANNELS = ["signage", "sms", "email"] as const;
const PERMISSION_CATALOG: { key: string; label: string }[] = [
  { key: "view_providers", label: "View providers" },
  { key: "manage_providers", label: "Create / delete providers" },
  { key: "view_content", label: "View content" },
  { key: "edit_content", label: "Edit content (CMS)" },
  { key: "approve_content", label: "Approve content" },
  { key: "broadcast", label: "Send broadcasts" },
  { key: "manage_users", label: "Manage users" },
  { key: "billing", label: "Billing & invoices" },
  { key: "system_config", label: "System configuration" },
  { key: "yardi_api", label: "Yardi API access" },
  { key: "hardware", label: "Hardware / player fleet" },
];
// Sensible starting grants per role card (editable in the UI).
const DEFAULT_ROLE_GRANTS: Record<string, string[]> = {
  super_admin: PERMISSION_CATALOG.map((p) => p.key),
  sales: ["view_providers", "view_content"],
  dev: ["view_providers", "view_content", "edit_content", "system_config", "yardi_api"],
  support_l1: ["view_providers", "view_content"],
  support_l2: ["view_providers", "view_content", "edit_content", "manage_users"],
  support_l3: ["view_providers", "view_content", "system_config", "yardi_api", "hardware"],
};

const fg = "var(--f5-text)";
const dim = "var(--f5-text-muted)";
const soft = "var(--f5-bg-soft, rgba(255,255,255,0.03))";

/* ---------------- Fuse5 Roles (Layer 1) ---------------- */
export function FuseRolesPanel() {
  // Per-role permission grants, editable in a modal. Optimistic; each save is
  // audit-logged via saveRolePermissions.
  const [grants, setGrants] = useState<Record<string, string[]>>(() => ({ ...DEFAULT_ROLE_GRANTS }));
  const [editing, setEditing] = useState<string | null>(null); // role key
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const [flash, setFlash] = useState<{ saved?: boolean; error?: string | null; persisted?: boolean }>({});

  const openEditor = (roleKey: string) => {
    setFlash({});
    setDraft(new Set(grants[roleKey] ?? []));
    setEditing(roleKey);
  };
  const toggleDraft = (key: string) =>
    setDraft((cur) => { const x = new Set(cur); x.has(key) ? x.delete(key) : x.add(key); return x; });

  // Platform Users table — search + role/status facets + sortable columns.
  const staffFields = useMemo<FilterField[]>(
    () => [
      { key: "q", label: "Search", kind: "search", placeholder: "Search name or email…" },
      { key: "role", label: "Role", kind: "multiselect", options: toOptions(uniqueSorted(F5_STAFF.map((u) => u.role))) },
      { key: "status", label: "Status", kind: "segmented", options: [{ value: "Active", label: "Active" }, { value: "Suspended", label: "Suspended" }], allLabel: "All" },
    ],
    [],
  );
  const { value: staffValue, setValue: setStaffValue } = useFilterState({ fields: staffFields, urlSync: true });
  const { sort: staffSort, toggle: staffToggle } = useSortState({ urlSync: true });
  const staffRows = useMemo(() => {
    const matched = applyFilters(F5_STAFF, staffValue, {
      q: (u) => `${u.name} ${u.email}`,
      role: (u) => u.role,
      status: (u) => u.status,
    });
    return applySort(matched, staffSort, {
      name: (u) => u.name,
      email: (u) => u.email,
      role: (u) => u.role,
      lastLogin: (u) => u.lastLogin,
      status: (u) => u.status,
    });
  }, [staffValue, staffSort]);

  const card = editing ? F5_ROLE_CARDS.find((r) => r.key === editing) : null;
  const saveGrants = () => {
    if (!card) return;
    const list = PERMISSION_CATALOG.filter((p) => draft.has(p.key)).map((p) => p.key);
    setFlash({});
    start(async () => {
      const r = await saveRolePermissions(card.name, list);
      if (!r.ok) { setFlash({ error: r.error ?? "Could not save." }); return; }
      setGrants((g) => ({ ...g, [card.key]: list }));
      setFlash({ saved: true, persisted: r.persisted });
      setEditing(null);
    });
  };

  return (
    <>
      <div className="f5-page-sub" style={{ marginTop: -6, marginBottom: 14 }}>Layer 1 — internal Fuse5 team roles and platform staff. Click a role to edit its permissions.</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))" }}>
        {F5_ROLE_CARDS.map((r) => {
          const g = grants[r.key] ?? [];
          return (
            <div key={r.key} className="f5-card" style={{ borderLeft: `3px solid ${r.color}`, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ fontWeight: 700, color: fg }}>{r.icon} {r.name}</div>
                <button className="f5-btn" type="button" onClick={() => openEditor(r.key)} style={{ fontSize: 11, padding: "3px 9px", flexShrink: 0 }}>Edit</button>
              </div>
              <div style={{ fontSize: 12, color: dim, margin: "6px 0 10px" }}>{r.description}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>{r.chips.map((c) => <span key={c} className="f5-badge" style={{ fontSize: 10 }}>{c}</span>)}</div>
              <div style={{ marginTop: "auto", fontSize: 11, color: dim }}>
                {g.length} of {PERMISSION_CATALOG.length} permissions ·{" "}
                <button type="button" onClick={() => openEditor(r.key)} style={{ background: "none", border: "none", color: "var(--f5-teal,#00CCCC)", cursor: "pointer", padding: 0, fontSize: 11 }}>manage</button>
              </div>
            </div>
          );
        })}
      </div>

      {card && (
        <WfModal
          title={`${card.icon} ${card.name} — Permissions`}
          sub="Toggle what this role can do. Changes apply across the platform for matching members."
          onClose={() => !pending && setEditing(null)}
          footer={
            <>
              <WfFlash {...flash} />
              <button className="f5-btn" type="button" onClick={() => setEditing(null)} disabled={pending}>Cancel</button>
              <button className="f5-btn primary" type="button" onClick={saveGrants} disabled={pending}>{pending ? "Saving…" : "Save permissions"}</button>
            </>
          }
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 4 }}>
            {PERMISSION_CATALOG.map((p) => {
              const on = draft.has(p.key);
              return (
                <button key={p.key} type="button" onClick={() => toggleDraft(p.key)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--f5-border)", background: on ? "rgba(0,204,204,0.08)" : "transparent", cursor: "pointer", textAlign: "left" }}>
                  <span style={{ width: 16, height: 16, borderRadius: 4, border: "1.5px solid var(--f5-teal,#00CCCC)", background: on ? "var(--f5-teal,#00CCCC)" : "transparent", color: "#012", fontSize: 12, lineHeight: "14px", textAlign: "center", flexShrink: 0 }}>{on ? "✓" : ""}</span>
                  <span style={{ color: fg, fontSize: 13 }}>{p.label}</span>
                </button>
              );
            })}
          </div>
        </WfModal>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="f5-section-title">Platform Users</div>
        <button className="f5-btn primary" type="button" style={{ padding: "5px 12px", fontSize: 12 }}>+ Add User</button>
      </div>
      <FilterBar fields={staffFields} value={staffValue} onChange={setStaffValue} resultCount={staffRows.length} resultLabel="users" />
      <div className="f5-card" style={{ padding: 0, overflow: "hidden", marginTop: 14 }}>
        <table className="f5-table">
          <thead><tr>
            <SortHeader sortKey="name" sort={staffSort} onSort={staffToggle}>User</SortHeader>
            <SortHeader sortKey="email" sort={staffSort} onSort={staffToggle}>Email</SortHeader>
            <SortHeader sortKey="role" sort={staffSort} onSort={staffToggle}>Role</SortHeader>
            <th>Env Access</th>
            <SortHeader sortKey="lastLogin" sort={staffSort} onSort={staffToggle}>Last Login</SortHeader>
            <SortHeader sortKey="status" sort={staffSort} onSort={staffToggle}>Status</SortHeader>
          </tr></thead>
          <tbody>
            {staffRows.length === 0 && <tr><td colSpan={6} style={{ textAlign: "center", padding: 20, color: dim, fontSize: 13 }}>No users match.</td></tr>}
            {staffRows.map((u) => (
              <tr key={u.email}>
                <td style={{ color: fg, fontWeight: 600 }}>{u.name}</td>
                <td style={{ color: dim }}>{u.email}</td>
                <td>{u.role}</td>
                <td style={{ fontSize: 15, letterSpacing: 2 }}>{u.envAccess.map((e) => ENV_EMOJI[e]).join("")}</td>
                <td style={{ color: dim }}>{u.lastLogin}</td>
                <td><span className={`f5-badge ${u.status === "Active" ? "ok" : "warn"}`}>{u.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------------- Integrations (data sources) ---------------- */
// Config field hints per data source, so the configure modal feels real.
const INTEGRATION_FIELDS: Record<string, { key: string; label: string; placeholder: string; secret?: boolean }[]> = {
  "Yardi Voyager API": [
    { key: "endpoint", label: "SOAP endpoint", placeholder: "https://…/Voyager7S/…" },
    { key: "database", label: "Database", placeholder: "voyager_live" },
    { key: "apiKey", label: "API key", placeholder: "••••••••", secret: true },
  ],
  "SMS Gateway": [
    { key: "provider", label: "Provider", placeholder: "Twilio" },
    { key: "fromNumber", label: "From number", placeholder: "+1…" },
    { key: "authToken", label: "Auth token", placeholder: "••••••••", secret: true },
  ],
  "Email Service": [
    { key: "domain", label: "Sending domain", placeholder: "mail.fuse5.ca" },
    { key: "apiKey", label: "API key", placeholder: "••••••••", secret: true },
  ],
  "H200W Player Fleet": [
    { key: "fleetUrl", label: "Fleet manager URL", placeholder: "https://fleet.fuse5.ca" },
    { key: "token", label: "Device token", placeholder: "••••••••", secret: true },
  ],
  "Bigin CRM": [
    { key: "orgId", label: "Org ID", placeholder: "8000000…" },
    { key: "refreshToken", label: "Refresh token", placeholder: "••••••••", secret: true },
  ],
};
const DEFAULT_INTEGRATION_FIELDS = [{ key: "apiKey", label: "API key", placeholder: "••••••••", secret: true }];

interface IntegrationState { enabled: boolean; settings: Record<string, string>; lastTest: { ok: boolean; latencyMs: number; at: string } | null }

export function IntegrationsAdminPanel({ configs }: { configs: IntegrationConfigRow[] }) {
  // Seed each source's enabled flag + saved settings from persisted config rows
  // (keyed by source_key === integration name). Sources with no saved row keep
  // the default (enabled, no settings) so the panel looks unchanged in demo.
  const [state, setState] = useState<Record<string, IntegrationState>>(() => {
    const byKey = new Map(configs.map((c) => [c.sourceKey, c]));
    return Object.fromEntries(SYSTEM_INTEGRATIONS.map((it) => {
      const row = byKey.get(it.name);
      const settings: Record<string, string> = {};
      if (row) for (const [k, v] of Object.entries(row.settings)) settings[k] = String(v);
      return [it.name, { enabled: row ? row.enabled : true, settings, lastTest: null }];
    }));
  });
  const [configuring, setConfiguring] = useState<SysIntegration | null>(null);
  const [draftFields, setDraftFields] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState<string | null>(null);
  const [, start] = useTransition();
  const [flash, setFlash] = useState<{ saved?: boolean; error?: string | null; persisted?: boolean }>({});

  const toggle = (it: SysIntegration) => {
    const next = !state[it.name].enabled;
    setState((s) => ({ ...s, [it.name]: { ...s[it.name], enabled: next } }));
    start(() => { void setIntegrationEnabled(it.name, next); });
  };
  const openConfig = (it: SysIntegration) => { setFlash({}); setDraftFields({ ...state[it.name].settings }); setConfiguring(it); };
  const fieldsFor = (name: string) => INTEGRATION_FIELDS[name] ?? DEFAULT_INTEGRATION_FIELDS;
  const saveConfig = () => {
    if (!configuring) return;
    const it = configuring;
    setFlash({});
    start(async () => {
      const r = await saveIntegrationConfig(it.name, draftFields);
      if (!r.ok) { setFlash({ error: r.error ?? "Could not save." }); return; }
      setState((s) => ({ ...s, [it.name]: { ...s[it.name], settings: { ...draftFields } } }));
      setFlash({ saved: true, persisted: r.persisted });
      setConfiguring(null);
    });
  };
  const runTest = (it: SysIntegration) => {
    setTesting(it.name);
    start(async () => {
      const r = await testIntegration(it.name, state[it.name].enabled && it.tone === "ok");
      setState((s) => ({ ...s, [it.name]: { ...s[it.name], lastTest: { ok: r.reachable, latencyMs: r.latencyMs, at: new Date().toLocaleTimeString() } } }));
      setTesting(null);
    });
  };

  return (
    <>
      <div className="f5-page-sub" style={{ marginTop: -6, marginBottom: 14 }}>Platform-wide data sources and connected services. Connect, configure, test, or disable each source.</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))" }}>
        {SYSTEM_INTEGRATIONS.map((it) => {
          const st = state[it.name];
          const live = st.enabled && it.tone === "ok";
          return (
            <div key={it.name} className="f5-card" style={{ opacity: st.enabled ? 1 : 0.6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div><div style={{ fontWeight: 700, color: fg }}>{it.name}</div><div style={{ fontSize: 12, color: dim, marginTop: 4 }}>{it.sub}</div></div>
                <WfSwitch on={st.enabled} onChange={() => toggle(it)} title={st.enabled ? "Disable" : "Enable"} />
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "var(--f5-text-secondary)", display: "flex", alignItems: "center", gap: 7 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: st.enabled ? (it.tone === "ok" ? "var(--f5-green,#34d399)" : "#f59e0b") : "var(--f5-text-muted)", flexShrink: 0 }} />
                {st.enabled ? it.status : "Disabled"}
              </div>
              {st.lastTest && (
                <div style={{ marginTop: 6, fontSize: 11, color: st.lastTest.ok ? "var(--f5-green,#34d399)" : "var(--f5-red,#f87171)" }}>
                  {st.lastTest.ok ? `✓ Reachable · ${st.lastTest.latencyMs}ms` : "✕ No response"} · tested {st.lastTest.at}
                </div>
              )}
              <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                <button className="f5-btn" type="button" onClick={() => openConfig(it)} style={{ fontSize: 12, padding: "4px 10px" }}>
                  {Object.keys(st.settings).length ? "Configure" : "Connect"}
                </button>
                <button className="f5-btn" type="button" onClick={() => runTest(it)} disabled={!st.enabled || testing === it.name} style={{ fontSize: 12, padding: "4px 10px" }}>
                  {testing === it.name ? "Testing…" : "Test connection"}
                </button>
                {!live && st.enabled && <span style={{ fontSize: 11, color: "#f59e0b", alignSelf: "center" }}>needs attention</span>}
              </div>
            </div>
          );
        })}
      </div>

      {configuring && (
        <WfModal
          title={`Configure — ${configuring.name}`}
          sub={configuring.sub}
          onClose={() => setConfiguring(null)}
          footer={
            <>
              <WfFlash {...flash} />
              <button className="f5-btn" type="button" onClick={() => setConfiguring(null)}>Cancel</button>
              <button className="f5-btn primary" type="button" onClick={saveConfig}>Save connection</button>
            </>
          }
        >
          {fieldsFor(configuring.name).map((f) => (
            <div key={f.key}>
              <label style={labelStyle}>{f.label}</label>
              <input
                className="f5-input"
                type={f.secret ? "password" : "text"}
                value={draftFields[f.key] ?? ""}
                placeholder={f.placeholder}
                onChange={(e) => setDraftFields((d) => ({ ...d, [f.key]: e.target.value }))}
                style={{ width: "100%" }}
              />
            </div>
          ))}
          <div style={{ fontSize: 11, color: dim, marginTop: 12 }}>Credentials are stored against this org. Secrets are write-only and never displayed back.</div>
        </WfModal>
      )}
    </>
  );
}

/* ---------------- Template Library ---------------- */
interface TplDraft { id: string | null; name: string; category: string; channels: string[]; description: string; body: string; mandatory: boolean; version: string; lastUpdated: string }
const EDITABLE_CATEGORIES = TEMPLATE_CATEGORIES.filter((c) => c !== "All");
const monthYear = () => new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });

export function TemplateLibraryPanel() {
  const [cat, setCat] = useState<string>("All");
  // Working copy so created/edited templates persist for the session.
  const [templates, setTemplates] = useState<MasterTemplate[]>(() => [...MASTER_TEMPLATES]);
  const [draft, setDraft] = useState<TplDraft | null>(null);
  const [, start] = useTransition();
  const [flash, setFlash] = useState<{ saved?: boolean; error?: string | null; persisted?: boolean }>({});
  const [toast, setToast] = useState<string | null>(null);

  const rows = templates.filter((t) => cat === "All" || t.category === cat);
  const stats = {
    master: templates.length,
    mandatory: templates.filter((t) => t.mandatory).length,
    clones: TEMPLATE_STATS.clones,
    pending: TEMPLATE_STATS.pending,
  };

  const newTemplate = () => { setFlash({}); setDraft({ id: null, name: "", category: "Community", channels: ["email"], description: "", body: "", mandatory: false, version: "1.0", lastUpdated: monthYear() }); };
  const editTemplate = (t: MasterTemplate) => { setFlash({}); setDraft({ id: t.id, name: t.name, category: t.category, channels: [...t.channels], description: t.description, body: "", mandatory: t.mandatory, version: t.version, lastUpdated: t.lastUpdated }); };
  const toggleChannel = (c: string) => setDraft((d) => d && ({ ...d, channels: d.channels.includes(c) ? d.channels.filter((x) => x !== c) : [...d.channels, c] }));

  const flash3s = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const save = () => {
    if (!draft) return;
    setFlash({});
    start(async () => {
      const r = await saveTemplate({ id: draft.id, name: draft.name, category: draft.category, channels: draft.channels, body: draft.body, mandatory: draft.mandatory });
      if (!r.ok) { setFlash({ error: r.error ?? "Could not save." }); return; }
      setTemplates((cur) => {
        if (draft.id) {
          return cur.map((t) => t.id === draft.id ? { ...t, name: draft.name.trim(), category: draft.category, channels: draft.channels, description: draft.description.trim() || t.description, mandatory: draft.mandatory, lastUpdated: monthYear() } : t);
        }
        const id = `mt-${String(Date.now()).slice(-6)}`;
        return [{ id, name: draft.name.trim(), category: draft.category, channels: draft.channels, version: "1.0", lastUpdated: monthYear(), mandatory: draft.mandatory, description: draft.description.trim() || "New master template" }, ...cur];
      });
      setFlash({ saved: true, persisted: r.persisted });
      setDraft(null);
    });
  };
  const push = (t: MasterTemplate) => start(async () => { await pushTemplateUpdate(t.name, t.version); flash3s(`Pushed “${t.name}” v${t.version} to all cloned providers`); });
  const clone = (t: MasterTemplate) => start(async () => { await cloneTemplate(t.name); flash3s(`Cloned “${t.name}” for provider customization`); });

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="f5-page-sub" style={{ marginTop: -6 }}>Master templates pushed to every provider. Mandatory ones cannot be edited by providers. Click a template to edit.</div>
        <button className="f5-btn primary" type="button" onClick={newTemplate} style={{ padding: "5px 12px", fontSize: 12 }}>+ New Template</button>
      </div>
      {toast && <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(0,204,204,0.1)", border: "1px solid var(--f5-border)", color: fg, fontSize: 12.5 }}>{toast}</div>}
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 14 }}>
        <div className="f5-card"><div className="f5-kpi-label">Master Templates</div><div className="f5-kpi-value">{stats.master}</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Mandatory</div><div className="f5-kpi-value">{stats.mandatory}</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Active Clones</div><div className="f5-kpi-value">{stats.clones}</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Pending Updates</div><div className="f5-kpi-value">{stats.pending}</div></div>
      </div>
      <div className="f5-chips" style={{ marginTop: 14 }}>
        {TEMPLATE_CATEGORIES.map((c) => <span key={c} className={`f5-chip${cat === c ? " active" : ""}`} onClick={() => setCat(c)}>{c}</span>)}
      </div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", marginTop: 12 }}>
        {rows.map((t) => (
          <div key={t.id} className="f5-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span className="f5-badge">MASTER</span>
              {t.mandatory && <span className="f5-badge" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>REQUIRED</span>}
            </div>
            <button type="button" onClick={() => editTemplate(t)} style={{ display: "block", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", width: "100%" }}>
              <div style={{ fontWeight: 700, color: fg, marginTop: 8 }}>{t.name}</div>
              <div style={{ fontSize: 12, color: dim, margin: "4px 0 10px" }}>{t.description}</div>
            </button>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", fontSize: 12, color: "var(--f5-text-secondary)" }}>
              <span className="f5-badge">{t.category}</span>
              <span>{t.channels.map((c) => CHANNEL_ICON[c] ?? c).join(" ")}</span>
              <span style={{ color: dim }}>v{t.version}</span>
              <span style={{ color: dim }}>· {t.lastUpdated}</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button className="f5-btn" type="button" onClick={() => editTemplate(t)} style={{ fontSize: 12, padding: "4px 10px" }}>Edit</button>
              <button className="f5-btn" type="button" onClick={() => push(t)} style={{ fontSize: 12, padding: "4px 10px" }}>Push Update</button>
              <button className="f5-btn" type="button" onClick={() => clone(t)} style={{ fontSize: 12, padding: "4px 10px" }}>Clone</button>
            </div>
          </div>
        ))}
      </div>

      {draft && (
        <WfModal
          title={draft.id ? `Edit Template — ${draft.name || "Untitled"}` : "New Master Template"}
          sub="Define the master template. Channels control where it can broadcast."
          width={560}
          onClose={() => setDraft(null)}
          footer={
            <>
              <WfFlash {...flash} />
              <button className="f5-btn" type="button" onClick={() => setDraft(null)}>Cancel</button>
              <button className="f5-btn primary" type="button" onClick={save}>{draft.id ? "Save changes" : "Create template"}</button>
            </>
          }
        >
          <label style={labelStyle}>Name</label>
          <input className="f5-input" style={{ width: "100%" }} value={draft.name} placeholder="e.g. Boiler Outage Notice" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />

          <label style={labelStyle}>Category</label>
          <select className="f5-select" style={{ width: "100%" }} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
            {EDITABLE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <label style={labelStyle}>Channels</label>
          <div style={{ display: "flex", gap: 8 }}>
            {ALL_CHANNELS.map((c) => {
              const on = draft.channels.includes(c);
              return (
                <button key={c} type="button" onClick={() => toggleChannel(c)}
                  style={{ flex: 1, padding: "8px 6px", borderRadius: 8, border: "1px solid var(--f5-border)", background: on ? "rgba(0,204,204,0.1)" : "transparent", color: on ? fg : dim, cursor: "pointer", fontSize: 12.5, textTransform: "capitalize" }}>
                  {CHANNEL_ICON[c]} {c}
                </button>
              );
            })}
          </div>

          <label style={labelStyle}>Short description</label>
          <input className="f5-input" style={{ width: "100%" }} value={draft.description} placeholder="One-line summary shown on the card" onChange={(e) => setDraft({ ...draft, description: e.target.value })} />

          <label style={labelStyle}>Body</label>
          <textarea className="f5-textarea" style={{ width: "100%", minHeight: 110, resize: "vertical" }} value={draft.body} placeholder="Template body / merge fields…" onChange={(e) => setDraft({ ...draft, body: e.target.value })} />

          <label style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 14, cursor: "pointer" }}>
            <WfSwitch on={draft.mandatory} onChange={() => setDraft({ ...draft, mandatory: !draft.mandatory })} />
            <span style={{ color: fg, fontSize: 13 }}>Mandatory — providers must use this, no local edits</span>
          </label>
        </WfModal>
      )}
    </>
  );
}

/* ---------------- Approval Workflow ---------------- */
const STATUS_BADGE: Record<ApprovalStatus, string> = { draft: "f5-badge", submitted: "f5-badge warn", approved: "f5-badge ok", scheduled: "f5-badge", published: "f5-badge ok", rejected: "f5-badge" };
const APPROVER_ROLES = ["Provider Admin", "Provider Manager", "Fuse5 Reviewer", "Super Admin"];
interface WfTemplate { id: string; name: string; steps: { label: string; approverRole: string }[]; thresholdReach: number }
const DEFAULT_WF_TEMPLATES: WfTemplate[] = [
  { id: "wf-1", name: "WoodGreen — 2-level", steps: [{ label: "Manager review", approverRole: "Provider Manager" }, { label: "Admin sign-off", approverRole: "Provider Admin" }], thresholdReach: 500 },
  { id: "wf-2", name: "HNHC — 1-level", steps: [{ label: "Provider Admin", approverRole: "Provider Admin" }], thresholdReach: 0 },
  { id: "wf-3", name: "Kiwanis — 1-level", steps: [{ label: "Provider Admin", approverRole: "Provider Admin" }], thresholdReach: 0 },
];

// Map a persisted approval_queue row → the panel's ApprovalItem shape. The row
// stores the decision-relevant fields; provider/recipients/schedule aren't
// persisted, so we render neutral defaults. status "pending" → "submitted".
function queueRowToItem(r: ApprovalQueueRow): ApprovalItem {
  return {
    id: r.id,
    title: r.title,
    provider: r.submittedBy ?? "—",
    status: r.status === "pending" ? "submitted" : r.status,
    category: r.category ?? "general-maintenance",
    createdBy: r.submittedBy ?? "—",
    createdAt: r.createdAt,
    scheduledFor: null,
    recipients: 0,
    rejectionNote: r.status === "rejected" ? (r.note ?? undefined) : undefined,
  };
}

// Map a persisted approval_workflows row → the builder's WfTemplate shape.
function workflowRowToTemplate(r: ApprovalWorkflowRow): WfTemplate {
  return { id: r.id, name: r.name, steps: r.steps.map((s) => ({ ...s })), thresholdReach: r.threshold ?? 0 };
}

export function ApprovalWorkflowPanel({ workflows, queueRows }: { workflows: ApprovalWorkflowRow[]; queueRows: ApprovalQueueRow[] }) {
  const tierOf = (catKey: string) => CATEGORY_TIERS.find((c) => c.key === catKey);
  const tierNum = (catKey: string) => tierOf(catKey)?.tier ?? 3;

  // ---- Queue working state (seeded from real rows when present, else demo) ----
  const [queue, setQueue] = useState<ApprovalItem[]>(() => queueRows.length ? queueRows.map(queueRowToItem) : APPROVAL_QUEUE.map((q) => ({ ...q })));
  const [provFilter, setProvFilter] = useState("All");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [viewing, setViewing] = useState<ApprovalItem | null>(null);
  const [rejectFor, setRejectFor] = useState<ApprovalItem | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "info" } | null>(null);
  const [, start] = useTransition();

  // ---- Workflow templates (seeded from real rows when present, else demo) ----
  const [wfTemplates, setWfTemplates] = useState<WfTemplate[]>(() => workflows.length ? workflows.map(workflowRowToTemplate) : DEFAULT_WF_TEMPLATES);
  const [wfDraft, setWfDraft] = useState<WfTemplate | null>(null);
  const [wfIsNew, setWfIsNew] = useState(false);
  const [wfFlash, setWfFlash] = useState<{ saved?: boolean; error?: string | null; persisted?: boolean }>({});

  const flash = (msg: string, tone: "ok" | "info" = "ok") => { setToast({ msg, tone }); setTimeout(() => setToast(null), 2600); };
  const counts = useMemo(() => Object.fromEntries(APPROVAL_STAGES.map((s) => [s.key, queue.filter((q) => q.status === s.key).length])), [queue]);
  const providers = ["All", ...Array.from(new Set(queue.map((q) => q.provider)))];
  const rows = queue.filter((q) => provFilter === "All" || q.provider === provFilter);

  // bulk-eligible = submitted AND tier 2/3 (tier 1 must be individually approved)
  const bulkEligible = (q: ApprovalItem) => q.status === "submitted" && tierNum(q.category) !== 1;
  const eligibleRows = rows.filter(bulkEligible);
  const allEligibleSelected = eligibleRows.length > 0 && eligibleRows.every((q) => selected.has(q.id));

  const setStatus = (id: string, status: ApprovalStatus, note?: string) =>
    setQueue((cur) => cur.map((q) => q.id === id ? { ...q, status, rejectionNote: status === "rejected" ? note : q.rejectionNote } : q));

  const approve = (q: ApprovalItem) => {
    setStatus(q.id, "approved");
    setSelected((s) => { const x = new Set(s); x.delete(q.id); return x; });
    flash(`Approved: ${q.title}`);
    start(() => { void logApproval("approved", q.title, q.provider); });
  };
  const reject = (q: ApprovalItem, note: string) => {
    setStatus(q.id, "rejected", note.trim() || undefined);
    setSelected((s) => { const x = new Set(s); x.delete(q.id); return x; });
    flash(`Rejected: ${q.title}`, "info");
    start(() => { void logApproval("rejected", q.title, q.provider, note.trim() || undefined); });
  };
  const toggleSelect = (id: string) => setSelected((s) => { const x = new Set(s); x.has(id) ? x.delete(id) : x.add(id); return x; });
  const toggleSelectAll = () => setSelected((s) => {
    if (allEligibleSelected) { const x = new Set(s); eligibleRows.forEach((q) => x.delete(q.id)); return x; }
    const x = new Set(s); eligibleRows.forEach((q) => x.add(q.id)); return x;
  });
  const bulkApprove = () => {
    const targets = rows.filter((q) => selected.has(q.id) && bulkEligible(q));
    if (!targets.length) { flash("No eligible items selected", "info"); return; }
    setQueue((cur) => cur.map((q) => targets.some((t) => t.id === q.id) ? { ...q, status: "approved" } : q));
    setSelected(new Set());
    flash(`Bulk approved ${targets.length} item(s)`);
    start(() => { void logBulkApproval(targets.map((t) => t.title), provFilter === "All" ? "All providers" : provFilter); });
  };

  // ---- Workflow builder ----
  const newWorkflow = () => { setWfFlash({}); setWfIsNew(true); setWfDraft({ id: `wf-${Date.now()}`, name: "", steps: [{ label: "Review", approverRole: "Provider Admin" }], thresholdReach: 0 }); };
  const editWorkflow = (w: WfTemplate) => { setWfFlash({}); setWfIsNew(false); setWfDraft({ ...w, steps: w.steps.map((s) => ({ ...s })) }); };
  const addStep = () => setWfDraft((d) => d && ({ ...d, steps: [...d.steps, { label: `Step ${d.steps.length + 1}`, approverRole: "Provider Admin" }] }));
  const removeStep = (i: number) => setWfDraft((d) => d && ({ ...d, steps: d.steps.filter((_, idx) => idx !== i) }));
  const setStep = (i: number, patch: Partial<{ label: string; approverRole: string }>) =>
    setWfDraft((d) => d && ({ ...d, steps: d.steps.map((s, idx) => idx === i ? { ...s, ...patch } : s) }));
  const saveWorkflow = () => {
    if (!wfDraft) return;
    setWfFlash({});
    start(async () => {
      const r = await saveApprovalWorkflow({ name: wfDraft.name, steps: wfDraft.steps, thresholdReach: wfDraft.thresholdReach, isNew: wfIsNew });
      if (!r.ok) { setWfFlash({ error: r.error ?? "Could not save." }); return; }
      setWfTemplates((cur) => wfIsNew ? [...cur, { ...wfDraft, name: wfDraft.name.trim() }] : cur.map((w) => w.id === wfDraft.id ? { ...wfDraft, name: wfDraft.name.trim() } : w));
      setWfFlash({ saved: true, persisted: r.persisted });
      setWfDraft(null);
    });
  };

  return (
    <>
      <div className="f5-page-sub" style={{ marginTop: -6, marginBottom: 14 }}>Content lifecycle from draft to published, with category-sensitivity routing.</div>
      {toast && <div style={{ marginBottom: 12, padding: "8px 12px", borderRadius: 8, background: toast.tone === "ok" ? "rgba(16,185,129,0.12)" : "rgba(0,204,204,0.1)", border: "1px solid var(--f5-border)", color: fg, fontSize: 12.5 }}>{toast.msg}</div>}

      {/* pipeline */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 8, flexWrap: "wrap" }}>
        {APPROVAL_STAGES.map((s, i) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="f5-card" style={{ minWidth: 110, textAlign: "center", padding: "12px 10px" }}>
              <div className="f5-kpi-value" style={{ fontSize: 26 }}>{counts[s.key] ?? 0}</div>
              <div style={{ fontSize: 11, color: dim, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
            </div>
            {i < APPROVAL_STAGES.length - 1 && <span style={{ color: "var(--f5-text-dim)", fontSize: 18 }}>→</span>}
          </div>
        ))}
      </div>

      {/* approval workflow templates */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="f5-section-title" style={{ margin: 0 }}>Approval Workflows</div>
        <button className="f5-btn primary" type="button" onClick={newWorkflow} style={{ padding: "5px 12px", fontSize: 12 }}>+ New workflow</button>
      </div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 10 }}>
        {wfTemplates.map((w) => (
          <div key={w.id} className="f5-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <div style={{ fontWeight: 700, color: fg }}>{w.name}</div>
              <button className="f5-btn" type="button" onClick={() => editWorkflow(w)} style={{ fontSize: 11, padding: "3px 9px", flexShrink: 0 }}>Edit</button>
            </div>
            <div style={{ fontSize: 12, color: dim, marginTop: 6 }}>{w.steps.length}-level · {w.steps.map((s) => s.approverRole).join(" → ")}</div>
            {w.thresholdReach > 0 && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 6 }}>⚑ Extra sign-off when reach ≥ {w.thresholdReach.toLocaleString()}</div>}
          </div>
        ))}
      </div>

      {/* category sensitivity */}
      <div className="f5-section-title">Category Sensitivity</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        {([1, 2, 3] as const).map((tier) => {
          const m = TIER_META[tier];
          const cats = CATEGORY_TIERS.filter((c) => c.tier === tier);
          return (
            <div key={tier} className="f5-card" style={{ borderTop: `2px solid ${m.color}` }}>
              <div style={{ fontWeight: 700, color: m.color, fontSize: 13 }}>{m.icon} {m.text}</div>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {cats.map((c) => <div key={c.key} style={{ fontSize: 12, color: "var(--f5-text-secondary)" }}>{c.icon} {c.label}</div>)}
              </div>
            </div>
          );
        })}
      </div>

      {/* active queue */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div className="f5-section-title" style={{ margin: 0 }}>Active Queue</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: dim }}>{selected.size} selected</span>
          <button className="f5-btn primary" type="button" onClick={bulkApprove} disabled={selected.size === 0} style={{ fontSize: 12, padding: "5px 12px", opacity: selected.size ? 1 : 0.55 }}>Approve selected</button>
          <select className="f5-select" value={provFilter} onChange={(e) => { setProvFilter(e.target.value); setSelected(new Set()); }} style={{ maxWidth: 180 }}>
            {providers.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden", marginTop: 10 }}>
        <table className="f5-table">
          <thead><tr>
            <th style={{ width: 34 }}><input type="checkbox" checked={allEligibleSelected} onChange={toggleSelectAll} disabled={!eligibleRows.length} aria-label="Select all eligible" /></th>
            <th>Message</th><th>Provider</th><th>Category</th><th>Status</th><th>By</th><th>Scheduled</th><th>Reach</th><th>Actions</th>
          </tr></thead>
          <tbody>
            {rows.map((q) => {
              const t = tierOf(q.category);
              const isT1 = tierNum(q.category) === 1;
              const canBulk = bulkEligible(q);
              return (
                <tr key={q.id}>
                  <td>
                    <input type="checkbox" checked={selected.has(q.id)} disabled={!canBulk} onChange={() => toggleSelect(q.id)}
                      title={isT1 ? "Tier 1 — must be approved individually" : q.status !== "submitted" ? "Only submitted items can be bulk-approved" : ""}
                      style={{ cursor: canBulk ? "pointer" : "not-allowed", opacity: canBulk ? 1 : 0.4 }} aria-label={`Select ${q.title}`} />
                  </td>
                  <td style={{ color: fg }}>
                    <button type="button" onClick={() => setViewing(q)} style={{ background: "none", border: "none", color: fg, cursor: "pointer", padding: 0, textAlign: "left", fontSize: "inherit" }}>{q.title}</button>
                    {q.rejectionNote && <div style={{ fontSize: 11, color: "#f87171" }}>✕ {q.rejectionNote}</div>}
                  </td>
                  <td>{t ? <span style={{ color: t.color }}>{t.icon} {t.label}</span> : q.category}</td>
                  <td><span className={STATUS_BADGE[q.status]} style={q.status === "rejected" ? { background: "rgba(239,68,68,0.15)", color: "#f87171" } : undefined}>{q.status}</span></td>
                  <td style={{ color: dim }}>{q.createdBy}</td>
                  <td style={{ color: dim }}>{q.scheduledFor ?? "—"}</td>
                  <td>{q.recipients.toLocaleString()}</td>
                  <td>
                    <div style={{ display: "flex", gap: 5 }}>
                      <button className="f5-btn" type="button" onClick={() => setViewing(q)} style={{ fontSize: 11, padding: "3px 8px" }}>View</button>
                      {q.status === "submitted" && (
                        <>
                          <button className="f5-btn primary" type="button" onClick={() => approve(q)} style={{ fontSize: 11, padding: "3px 8px" }}>✓</button>
                          <button className="f5-btn" type="button" onClick={() => { setRejectNote(""); setRejectFor(q); }} style={{ fontSize: 11, padding: "3px 8px", color: "#f87171" }}>✕</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!rows.length && <tr><td colSpan={9} style={{ textAlign: "center", padding: 32, color: dim }}>No items in queue</td></tr>}
          </tbody>
        </table>
      </div>

      {/* view item modal */}
      {viewing && (() => {
        const t = tierOf(viewing.category);
        const m = t ? TIER_META[t.tier] : null;
        return (
          <WfModal title={`Review: ${viewing.title}`} onClose={() => setViewing(null)} width={520}
            footer={viewing.status === "submitted" ? (
              <>
                <button className="f5-btn" type="button" onClick={() => { setRejectNote(""); setRejectFor(viewing); setViewing(null); }} style={{ color: "#f87171" }}>✗ Reject</button>
                <button className="f5-btn primary" type="button" onClick={() => { approve(viewing); setViewing(null); }}>✓ Approve</button>
              </>
            ) : <button className="f5-btn" type="button" onClick={() => setViewing(null)}>Close</button>}
          >
            {m && t && (
              <div style={{ display: "flex", gap: 10, padding: 12, background: "var(--f5-surface-2,rgba(255,255,255,0.04))", borderRadius: 8, marginBottom: 14, borderLeft: `3px solid ${t.color}` }}>
                <span style={{ fontSize: 22 }}>{t.icon}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: m.color }}>{m.text}</div>
                  <div style={{ fontSize: 12, color: t.color }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: dim, marginTop: 4 }}>{t.description}</div>
                </div>
              </div>
            )}
            <table style={{ width: "100%", fontSize: 12.5 }}>
              <tbody>
                <tr><td style={{ color: dim, padding: "4px 8px 4px 0" }}>Provider</td><td style={{ color: fg, fontWeight: 600 }}>{viewing.provider}</td></tr>
                <tr><td style={{ color: dim, padding: "4px 8px 4px 0" }}>Created by</td><td style={{ color: fg }}>{viewing.createdBy}</td></tr>
                <tr><td style={{ color: dim, padding: "4px 8px 4px 0" }}>Status</td><td><span className={STATUS_BADGE[viewing.status]}>{viewing.status}</span></td></tr>
                <tr><td style={{ color: dim, padding: "4px 8px 4px 0" }}>Recipients</td><td style={{ color: fg }}>{viewing.recipients.toLocaleString()}</td></tr>
                <tr><td style={{ color: dim, padding: "4px 8px 4px 0" }}>Created</td><td style={{ color: fg }}>{viewing.createdAt}</td></tr>
                {viewing.scheduledFor && <tr><td style={{ color: dim, padding: "4px 8px 4px 0" }}>Scheduled</td><td style={{ color: fg }}>{viewing.scheduledFor}</td></tr>}
                {viewing.rejectionNote && <tr><td style={{ color: dim, padding: "4px 8px 4px 0" }}>Rejection note</td><td style={{ color: "#f87171" }}>{viewing.rejectionNote}</td></tr>}
              </tbody>
            </table>
          </WfModal>
        );
      })()}

      {/* reject-with-note modal */}
      {rejectFor && (
        <WfModal title={`Reject: ${rejectFor.title}`} sub="Add a note so the author knows what to fix." width={460}
          onClose={() => setRejectFor(null)}
          footer={
            <>
              <button className="f5-btn" type="button" onClick={() => setRejectFor(null)}>Cancel</button>
              <button className="f5-btn primary" type="button" onClick={() => { reject(rejectFor, rejectNote); setRejectFor(null); }} style={{ background: "#ef4444", borderColor: "#ef4444" }}>Reject</button>
            </>
          }
        >
          <label style={labelStyle}>Rejection note (optional)</label>
          <textarea className="f5-textarea" autoFocus style={{ width: "100%", minHeight: 90, resize: "vertical" }} value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} placeholder="e.g. Needs updated inspection dates from City" />
        </WfModal>
      )}

      {/* workflow builder modal */}
      {wfDraft && (
        <WfModal
          title={wfIsNew ? "New Approval Workflow" : `Edit Workflow — ${wfDraft.name || "Untitled"}`}
          sub="Define the approval steps and an optional high-reach threshold that forces extra sign-off."
          width={560}
          onClose={() => setWfDraft(null)}
          footer={
            <>
              <WfFlash {...wfFlash} />
              <button className="f5-btn" type="button" onClick={() => setWfDraft(null)}>Cancel</button>
              <button className="f5-btn primary" type="button" onClick={saveWorkflow}>{wfIsNew ? "Create workflow" : "Save changes"}</button>
            </>
          }
        >
          <label style={labelStyle}>Workflow name</label>
          <input className="f5-input" style={{ width: "100%" }} value={wfDraft.name} placeholder="e.g. WoodGreen — high-risk 2-level" onChange={(e) => setWfDraft({ ...wfDraft, name: e.target.value })} />

          <label style={labelStyle}>Approval steps (in order)</label>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {wfDraft.steps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ width: 22, height: 22, borderRadius: 99, background: "var(--f5-surface-2,rgba(255,255,255,0.06))", color: dim, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</span>
                <input className="f5-input" style={{ flex: 1 }} value={s.label} placeholder="Step name" onChange={(e) => setStep(i, { label: e.target.value })} />
                <select className="f5-select" value={s.approverRole} onChange={(e) => setStep(i, { approverRole: e.target.value })} style={{ width: 170 }}>
                  {APPROVER_ROLES.map((r) => <option key={r}>{r}</option>)}
                </select>
                <button className="f5-btn" type="button" onClick={() => removeStep(i)} disabled={wfDraft.steps.length <= 1} style={{ padding: "4px 9px", color: "#f87171" }} aria-label="Remove step">×</button>
              </div>
            ))}
          </div>
          <button className="f5-btn" type="button" onClick={addStep} style={{ marginTop: 8, fontSize: 12, padding: "4px 10px" }}>+ Add step</button>

          <label style={labelStyle}>High-reach threshold</label>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input className="f5-input" type="number" min={0} step={50} style={{ width: 140 }} value={wfDraft.thresholdReach} onChange={(e) => setWfDraft({ ...wfDraft, thresholdReach: Math.max(0, Number(e.target.value) || 0) })} />
            <span style={{ fontSize: 12, color: dim }}>recipients — 0 disables the extra gate</span>
          </div>
        </WfModal>
      )}
    </>
  );
}

/* ---------------- Compliance Settings ---------------- */
const GROUP_LABEL: Record<string, string> = { "high-risk": "High Risk", "moderate-risk": "Moderate Risk", "cosmetic": "Cosmetic" };
const GROUP_COLOR: Record<string, string> = { "high-risk": "#f87171", "moderate-risk": "#f59e0b", "cosmetic": "var(--f5-text-muted)" };
// Colour a score against a framework's green/yellow thresholds.
function scoreColor(score: number | null, frameworkId: string): string {
  if (score == null) return dim;
  const f = COMPLIANCE_FRAMEWORKS.find((x) => x.id === frameworkId);
  const green = f?.thresholds.green ?? 85, yellow = f?.thresholds.yellow ?? 60;
  return score >= green ? "var(--f5-green,#34d399)" : score >= yellow ? "#f59e0b" : "var(--f5-red,#f87171)";
}
function ScoreCell({ score, frameworkId, benchmark }: { score: number | null; frameworkId: string; benchmark: number | null }) {
  if (score == null) return <span style={{ color: dim }}>N/A</span>;
  const delta = benchmark != null ? score - benchmark : null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontWeight: 700, color: scoreColor(score, frameworkId) }}>{score}</span>
      <span style={{ width: 60, height: 5, borderRadius: 99, background: "var(--f5-border)", display: "inline-block", position: "relative" }}>
        <span style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${score}%`, maxWidth: "100%", borderRadius: 99, background: scoreColor(score, frameworkId) }} />
      </span>
      {delta != null && <span style={{ fontSize: 11, color: delta >= 0 ? "var(--f5-green,#34d399)" : "var(--f5-red,#f87171)" }}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}</span>}
    </span>
  );
}
const SYNC_DOT: Record<SyncStatus, string> = { ok: "var(--f5-green,#34d399)", partial: "#f59e0b", no_feed: "var(--f5-text-muted)", error: "var(--f5-red,#f87171)" };
export function ComplianceSettingsPanel() {
  const fwName = (id: string) => COMPLIANCE_FRAMEWORKS.find((f) => f.id === id)?.name ?? id;
  const [pending, startTransition] = useTransition();
  // Live scores pulled by the agent this session: key `${provider}|${framework}` → {score,status}.
  const [live, setLive] = useState<Map<string, { score: number | null; status: SyncStatus }>>(new Map());
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [syncErr, setSyncErr] = useState<string | null>(null);
  const [syncMeta, setSyncMeta] = useState<string | null>(null);

  // ---- Functional compliance controls (optimistic, audit-logged) ----
  // Per-framework signage requirement.
  const [signage, setSignage] = useState<Record<string, boolean>>(() => Object.fromEntries(COMPLIANCE_FRAMEWORKS.map((f) => [f.id, f.signageRequired])));
  // Per-provider framework assignment enable/disable (replaces the static badge).
  const [enabled, setEnabled] = useState<Record<string, boolean>>(() => Object.fromEntries(PROVIDER_COMPLIANCE.map((p) => [p.provider, p.enabled])));
  // Platform-wide policy switches.
  const [policy, setPolicy] = useState<Record<string, boolean>>({ autoFlag: true, dailyAutoSync: false, blockBelowYellow: false });
  const [, startCtl] = useTransition();

  const toggleSignage = (fid: string, label: string) => { const next = !signage[fid]; setSignage((s) => ({ ...s, [fid]: next })); startCtl(() => { void setComplianceControl(`${label} — lobby signage required`, next); }); };
  const toggleProvider = (provider: string) => { const next = !enabled[provider]; setEnabled((s) => ({ ...s, [provider]: next })); startCtl(() => { void setProviderFrameworkEnabled(provider, next); }); };
  const togglePolicy = (key: string, label: string) => { const next = !policy[key]; setPolicy((s) => ({ ...s, [key]: next })); startCtl(() => { void setComplianceControl(label, next); }); };

  function runSync() {
    setSyncErr(null);
    startTransition(async () => {
      const r = await syncComplianceScores();
      if (!r.ok || !r.summary) { setSyncErr(r.error ?? "Sync failed."); return; }
      const m = new Map<string, { score: number | null; status: SyncStatus }>();
      for (const res of r.summary.results) m.set(`${res.provider}|${res.framework}`, { score: res.score, status: res.status });
      setLive(m); setSyncedAt(r.summary.syncedAt);
      const portfolio = r.summary.results.filter((x) => x.addressSource === "portfolio");
      const buildings = portfolio.reduce((n, x) => n + x.matched, 0);
      setSyncMeta(portfolio.length ? `${portfolio.map((x) => x.provider).join(", ")} scored from ${buildings} live portfolio building${buildings === 1 ? "" : "s"}` : null);
    });
  }
  // Provider rows with live overrides applied (falls back to the manual baseline).
  const liveScore = (p: ProviderCompliance, fw: "rentsafeto" | "hamilton-sab", base: number | null) =>
    live.get(`${p.provider}|${fw}`)?.score ?? base;
  const allRows: ProviderCompliance[] = PROVIDER_COMPLIANCE.map((p) => ({
    ...p,
    rentSafeScore: liveScore(p, "rentsafeto", p.rentSafeScore),
    hamiltonScore: liveScore(p, "hamilton-sab", p.hamiltonScore),
  }));
  const bench = complianceBenchmark(allRows);
  const statusOf = (provider: string, fw: string): SyncStatus | null => live.get(`${provider}|${fw}`)?.status ?? null;

  // Filter + sort the housing-provider compliance table.
  const cmpFields = useMemo<FilterField[]>(
    () => [
      { key: "q", label: "Search", kind: "search", placeholder: "Search provider…" },
      { key: "tier", label: "Tier", kind: "multiselect", options: toOptions(uniqueSorted(allRows.map((p) => p.tier))) },
      { key: "framework", label: "Framework", kind: "multiselect", options: toOptions(uniqueSorted(allRows.map((p) => fwName(p.framework)))) },
      { key: "city", label: "City", kind: "multiselect", options: toOptions(uniqueSorted(allRows.map((p) => p.city))) },
      { key: "status", label: "Assignment", kind: "segmented", options: [{ value: "enabled", label: "Enabled" }, { value: "disabled", label: "Disabled" }], allLabel: "All" },
    ],
    // fwName/allRows are derived from module-level constants + live syncs
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live],
  );
  const { value: cmpValue, setValue: setCmpValue } = useFilterState({ fields: cmpFields, urlSync: true });
  const { sort: cmpSort, toggle: cmpToggle } = useSortState({ urlSync: true });
  const rows = useMemo(() => {
    const matched = applyFilters(allRows, cmpValue, {
      q: (p) => p.provider,
      tier: (p) => p.tier,
      framework: (p) => fwName(p.framework),
      city: (p) => p.city,
      status: (p) => (enabled[p.provider] ? "enabled" : "disabled"),
    });
    return applySort(matched, cmpSort, {
      provider: (p) => p.provider,
      properties: (p) => p.properties,
      tier: (p) => p.tier,
      framework: (p) => fwName(p.framework),
      rentSafe: (p) => p.rentSafeScore,
      hamilton: (p) => p.hamiltonScore,
      status: (p) => (enabled[p.provider] ? 1 : 0),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allRows, cmpValue, cmpSort, enabled]);

  return (
    <>
      <div className="f5-page-sub" style={{ marginTop: -6, marginBottom: 14 }}>Compliance frameworks and per-provider assignment.</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {COMPLIANCE_FRAMEWORKS.map((f) => (
          <div key={f.id} className="f5-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, color: fg }}>{f.name}</div>
              <span className="f5-badge">{f.jurisdiction}</span>
            </div>
            <div style={{ fontSize: 12, color: dim, margin: "6px 0 10px" }}>{f.description}</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 12 }}>
              <span style={{ color: dim }}>Green ≥</span><span>{f.thresholds.green} · {f.evalCycle.green}</span>
              <span style={{ color: dim }}>Yellow ≥</span><span>{f.thresholds.yellow} · {f.evalCycle.yellow}</span>
              <span style={{ color: dim }}>Red</span><span>{f.evalCycle.red}</span>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 12, cursor: "pointer" }}>
              <WfSwitch on={signage[f.id]} onChange={() => toggleSignage(f.id, f.name)} />
              <span style={{ fontSize: 12, color: signage[f.id] ? "#f59e0b" : dim }}>
                {signage[f.id] ? `⚠ Colour-coded lobby signage required${f.signageDeadline ? ` by ${f.signageDeadline}` : ""}` : "Lobby signage not required"}
              </span>
            </label>
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              {f.categoryGroups.map((g) => <span key={g.group} className="f5-badge" style={{ color: GROUP_COLOR[g.group] }}>{GROUP_LABEL[g.group]}: {g.count} ({g.weight}%)</span>)}
            </div>
          </div>
        ))}
      </div>

      {/* platform-wide compliance policy switches */}
      <div className="f5-section-title">Enforcement Policy</div>
      <div className="f5-card">
        {[
          { key: "autoFlag", label: "Auto-flag providers below the yellow threshold", help: "Surface a warning on the provider's dashboard when an audit score drops below yellow." },
          { key: "dailyAutoSync", label: "Daily auto-sync from Open Data", help: "Let the scheduled agent pull RentSafeTO scores once a day." },
          { key: "blockBelowYellow", label: "Require sign-off for broadcasts when below yellow", help: "Force an extra approval step for any provider whose framework score is red." },
        ].map((c, i) => (
          <label key={c.key} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "11px 0", borderTop: i ? "1px solid var(--f5-border)" : "none", cursor: "pointer" }}>
            <WfSwitch on={policy[c.key]} onChange={() => togglePolicy(c.key, c.label)} />
            <span>
              <span style={{ display: "block", color: fg, fontSize: 13.5 }}>{c.label}</span>
              <span style={{ display: "block", color: dim, fontSize: 12, marginTop: 2 }}>{c.help}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="f5-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Provider Score Benchmark</span>
        <button className="f5-btn primary" onClick={runSync} disabled={pending} style={{ fontSize: 12, padding: "6px 12px" }}>
          {pending ? "Syncing…" : "⟳ Sync from Open Data"}
        </button>
      </div>
      <div className="f5-page-sub" style={{ marginTop: -6, marginBottom: 6 }}>Audit scores auto-pulled per provider portfolio; platform average is the benchmark each provider is measured against.</div>
      <div style={{ fontSize: 11, color: "var(--f5-text-dim)", marginBottom: 12 }}>
        {syncErr ? <span style={{ color: "var(--f5-red)" }}>⚠ {syncErr}</span>
          : syncedAt ? <>✓ Live — synced {new Date(syncedAt).toLocaleString()}{syncMeta ? ` · ${syncMeta}` : ""} · Source: City of Toronto Open Data (RentSafeTO, ArcGIS) · Hamilton SAB: manual until a public feed is connected</>
          : <>Showing last-known scores. Click <strong>Sync from Open Data</strong> to pull live RentSafeTO scores from City of Toronto. A scheduled agent (/api/agents/compliance-sync) can auto-pull daily.</>}
      </div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="f5-card">
          <div className="f5-kpi-label">RentSafeTO — platform avg</div>
          <div className="f5-kpi-value" style={{ color: scoreColor(bench.rentSafe, "rentsafeto") }}>{bench.rentSafe ?? "—"}{bench.rentSafe != null ? "" : ""}</div>
          <div className="f5-kpi-sub">benchmark across providers</div>
        </div>
        <div className="f5-card">
          <div className="f5-kpi-label">Hamilton SAB — platform avg</div>
          <div className="f5-kpi-value" style={{ color: scoreColor(bench.hamilton, "hamilton-sab") }}>{bench.hamilton ?? "—"}</div>
          <div className="f5-kpi-sub">benchmark across providers</div>
        </div>
        <div className="f5-card">
          <div className="f5-kpi-label">Providers reporting</div>
          <div className="f5-kpi-value">{allRows.length}</div>
          <div className="f5-kpi-sub">{allRows.filter((p) => enabled[p.provider]).length} active assignments</div>
        </div>
      </div>

      <div className="f5-section-title">Provider Framework Assignment &amp; Scores</div>
      <FilterBar fields={cmpFields} value={cmpValue} onChange={setCmpValue} resultCount={rows.length} resultLabel="providers" />
      <div className="f5-card" style={{ padding: 0, overflow: "hidden", marginTop: 14 }}>
        <table className="f5-table">
          <thead><tr>
            <SortHeader sortKey="provider" sort={cmpSort} onSort={cmpToggle}>Provider</SortHeader>
            <SortHeader sortKey="properties" sort={cmpSort} onSort={cmpToggle}>Properties</SortHeader>
            <SortHeader sortKey="tier" sort={cmpSort} onSort={cmpToggle}>Tier</SortHeader>
            <SortHeader sortKey="framework" sort={cmpSort} onSort={cmpToggle}>Primary Framework</SortHeader>
            <SortHeader sortKey="rentSafe" sort={cmpSort} onSort={cmpToggle}>RentSafeTO Score</SortHeader>
            <SortHeader sortKey="hamilton" sort={cmpSort} onSort={cmpToggle}>Hamilton SAB Score</SortHeader>
            <SortHeader sortKey="status" sort={cmpSort} onSort={cmpToggle}>Status</SortHeader>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 20, color: dim, fontSize: 13 }}>No providers match.</td></tr>}
            {rows.map((p) => { const rsStatus = statusOf(p.provider, "rentsafeto"); const hStatus = statusOf(p.provider, "hamilton-sab"); return (
              <tr key={p.provider}>
                <td style={{ color: fg, fontWeight: 600 }}>{p.provider}</td>
                <td>{p.properties}</td>
                <td><span className="f5-badge">{p.tier}</span></td>
                <td>{fwName(p.framework)}</td>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    {rsStatus && <span title={`live: ${rsStatus}`} style={{ width: 7, height: 7, borderRadius: 99, background: SYNC_DOT[rsStatus], display: "inline-block" }} />}
                    <ScoreCell score={p.rentSafeScore} frameworkId="rentsafeto" benchmark={bench.rentSafe} />
                  </span>
                </td>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    {hStatus && <span title={`live: ${hStatus}`} style={{ width: 7, height: 7, borderRadius: 99, background: SYNC_DOT[hStatus], display: "inline-block" }} />}
                    <ScoreCell score={p.hamiltonScore} frameworkId="hamilton-sab" benchmark={bench.hamilton} />
                  </span>
                </td>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    <WfSwitch on={enabled[p.provider]} onChange={() => toggleProvider(p.provider)} title="Toggle framework assignment" />
                    <span className={`f5-badge ${enabled[p.provider] ? "ok" : "warn"}`}>{enabled[p.provider] ? "Enabled" : "Disabled"}</span>
                  </span>
                </td>
              </tr>
            ); })}
            <tr style={{ borderTop: "2px solid var(--f5-border)" }}>
              <td style={{ color: dim, fontWeight: 700 }}>Platform benchmark</td>
              <td colSpan={3} style={{ color: dim, fontSize: 12 }}>average across reporting providers</td>
              <td style={{ fontWeight: 700, color: scoreColor(bench.rentSafe, "rentsafeto") }}>{bench.rentSafe ?? "—"}</td>
              <td style={{ fontWeight: 700, color: scoreColor(bench.hamilton, "hamilton-sab") }}>{bench.hamilton ?? "—"}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 8 }}>▲/▼ shows each provider&apos;s gap to the platform benchmark. Scores colour against each framework&apos;s green (≥{COMPLIANCE_FRAMEWORKS.find((f) => f.id === "rentsafeto")?.thresholds.green}) / yellow thresholds. N/A = framework not assigned to that provider&apos;s jurisdiction.</div>
    </>
  );
}

/* ---------------- Billing — platform MRR (used by enriched BillingPanel) ---------------- */
export function PlatformBillingTable() {
  const fields = useMemo<FilterField[]>(
    () => [
      { key: "q", label: "Search", kind: "search", placeholder: "Search provider…" },
      { key: "tier", label: "Tier", kind: "multiselect", options: toOptions(uniqueSorted(BILLING_MRR.map((b) => b.tier))) },
      { key: "status", label: "Status", kind: "segmented", options: toOptions(uniqueSorted(BILLING_MRR.map((b) => b.status))), allLabel: "All" },
    ],
    [],
  );
  const { value, setValue } = useFilterState({ fields, urlSync: true });
  const { sort, toggle } = useSortState({ urlSync: true });
  const rows = useMemo(() => {
    const matched = applyFilters(BILLING_MRR, value, {
      q: (b) => b.provider,
      tier: (b) => b.tier,
      status: (b) => b.status,
    });
    return applySort(matched, sort, {
      provider: (b) => b.provider,
      tier: (b) => b.tier,
      mrr: (b) => b.mrr,
      properties: (b) => b.properties,
      players: (b) => b.players,
      renewal: (b) => b.renewal,
      status: (b) => b.status,
    });
  }, [value, sort]);
  return (
    <>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="f5-card"><div className="f5-kpi-label">Monthly Recurring</div><div className="f5-kpi-value">${BILLING_SUMMARY.mrr.toLocaleString()}</div><div className="f5-kpi-sub">MRR across providers</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Annual Run Rate</div><div className="f5-kpi-value">${BILLING_SUMMARY.arr.toLocaleString()}</div><div className="f5-kpi-sub">ARR</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Hardware Units</div><div className="f5-kpi-value">{BILLING_SUMMARY.units}</div><div className="f5-kpi-sub">players deployed</div></div>
      </div>
      <div style={{ marginTop: 14 }}>
        <FilterBar fields={fields} value={value} onChange={setValue} resultCount={rows.length} resultLabel="providers" />
      </div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden", marginTop: 14 }}>
        <table className="f5-table">
          <thead><tr>
            <SortHeader sortKey="provider" sort={sort} onSort={toggle}>Provider</SortHeader>
            <SortHeader sortKey="tier" sort={sort} onSort={toggle}>Tier</SortHeader>
            <SortHeader sortKey="mrr" sort={sort} onSort={toggle}>MRR</SortHeader>
            <SortHeader sortKey="properties" sort={sort} onSort={toggle}>Properties</SortHeader>
            <SortHeader sortKey="players" sort={sort} onSort={toggle}>Players</SortHeader>
            <SortHeader sortKey="renewal" sort={sort} onSort={toggle}>Renewal</SortHeader>
            <SortHeader sortKey="status" sort={sort} onSort={toggle}>Status</SortHeader>
          </tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={7} style={{ textAlign: "center", padding: 20, color: dim, fontSize: 13 }}>No providers match.</td></tr>}
            {rows.map((b) => (
              <tr key={b.provider}>
                <td style={{ color: fg, fontWeight: 600 }}>{b.provider}</td>
                <td><span className="f5-badge">{b.tier}</span></td>
                <td style={{ color: fg }}>{b.mrr ? `$${b.mrr.toLocaleString()}/mo` : "$0 (Pilot)"}</td>
                <td>{b.properties}</td>
                <td>{b.players}</td>
                <td style={{ color: dim }}>{b.renewal}</td>
                <td><span className={`f5-badge ${b.status === "Active" ? "ok" : "warn"}`}>{b.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
