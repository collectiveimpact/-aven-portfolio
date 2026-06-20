"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PORTAL_FEATURES, PORTAL_CHANNELS, PORTAL_KIOSK, PORTAL_NOTIFY, PORTAL_INTEGRATIONS, type PortalConfig } from "@/lib/platform";
import { saveTenantPortalConfig } from "./portal-actions";

const fg = "var(--f5-text)";
const dim = "var(--f5-text-muted)";

export function TenantPortalForm({ initial, canEdit }: { initial: PortalConfig; canEdit: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<PortalConfig>(initial);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const patch = (p: Partial<PortalConfig>) => { setSaved(false); setForm((f) => ({ ...f, ...p })); };
  const toggleFeature = (k: string) => patch({ features: { ...form.features, [k]: !form.features[k] } });
  const toggleChannel = (k: string) => patch({ channels: { ...form.channels, [k]: !form.channels[k] } });
  const toggleKiosk = (k: string) => patch({ kiosk: { ...form.kiosk, [k]: !form.kiosk[k] } });

  function save() {
    setError(null);
    start(async () => {
      const r = await saveTenantPortalConfig(form);
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setSaved(true); router.refresh();
    });
  }

  const Toggle = ({ on, onClick, locked }: { on: boolean; onClick?: () => void; locked?: boolean }) => (
    <span className={`f5-badge ${on ? "ok" : ""}`} onClick={!locked && canEdit ? onClick : undefined} style={{ cursor: !locked && canEdit ? "pointer" : "default", userSelect: "none" }}>{on ? "On" : "Off"}</span>
  );

  return (
    <>
      <div className="f5-page-sub" style={{ marginTop: -6, marginBottom: 14 }}>Configure self-service features, channels, kiosk, and branding for tenant-facing portals.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
        {/* A — Portal status */}
        <div className="f5-card">
          <div className="f5-section-title" style={{ marginTop: 0 }}>Portal Status</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
            <span style={{ fontSize: 13, color: "var(--f5-text-secondary)" }}>Portal Enabled</span>
            <Toggle on={form.enabled} onClick={() => patch({ enabled: !form.enabled })} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderTop: "1px solid var(--f5-border)" }}>
            <span style={{ color: dim }}>Portal URL</span><span style={{ color: "var(--f5-teal,#00CCCC)", fontFamily: "monospace" }}>{form.url}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderTop: "1px solid var(--f5-border)" }}>
            <span style={{ color: dim }}>Last Published</span><span style={{ color: "var(--f5-text-secondary)" }}>2026-04-11 14:32 EST</span>
          </div>
        </div>

        {/* F — Branding */}
        <div className="f5-card">
          <div className="f5-section-title" style={{ marginTop: 0 }}>Custom Branding</div>
          <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label className="f5-label">Theme</label>
              <select className="f5-select" value={form.theme} disabled={!canEdit} onChange={(e) => patch({ theme: e.target.value as PortalConfig["theme"] })}><option value="dark">Dark</option><option value="light">Light</option></select>
            </div>
            <div><label className="f5-label">Primary Color</label>
              <input className="f5-input" value={form.primaryColor} disabled={!canEdit} onChange={(e) => patch({ primaryColor: e.target.value })} />
            </div>
          </div>
          <label className="f5-label" style={{ marginTop: 8 }}>Header Text</label>
          <input className="f5-input" value={form.headerText} disabled={!canEdit} onChange={(e) => patch({ headerText: e.target.value })} placeholder="e.g. WoodGreen Tenant Portal" />
          <label className="f5-label" style={{ marginTop: 8 }}>Welcome Message</label>
          <textarea className="f5-input" rows={2} value={form.welcomeMessage} disabled={!canEdit} onChange={(e) => patch({ welcomeMessage: e.target.value })} />
          <label className="f5-label" style={{ marginTop: 8 }}>Footer Text</label>
          <input className="f5-input" value={form.footerText} disabled={!canEdit} onChange={(e) => patch({ footerText: e.target.value })} placeholder="e.g. © 2026 Fuse5 Communications" />
          <div style={{ marginTop: 10, border: "1px dashed var(--f5-border)", borderRadius: 8, padding: "14px", textAlign: "center", fontSize: 12, color: dim }}>📸 Drag logo here or click to upload · PNG, JPG (Max 2MB)</div>
        </div>

        {/* B — Self-service features */}
        <div className="f5-card">
          <div className="f5-section-title" style={{ marginTop: 0 }}>Self-Service Features</div>
          {PORTAL_FEATURES.map((f) => (
            <div key={f.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--f5-border)" }}>
              <div><div style={{ fontSize: 13, color: fg }}>{f.label}</div><div style={{ fontSize: 11, color: dim }}>{f.sub}</div></div>
              {f.future ? <span className="f5-badge warn">Future</span> : <Toggle on={!!form.features[f.key]} onClick={() => toggleFeature(f.key)} />}
            </div>
          ))}
        </div>

        {/* C — Channels + kiosk */}
        <div className="f5-card">
          <div className="f5-section-title" style={{ marginTop: 0 }}>Communication Channels</div>
          {PORTAL_CHANNELS.map((c) => (
            <div key={c.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--f5-border)" }}>
              <div><div style={{ fontSize: 13, color: fg }}>{c.label}</div><div style={{ fontSize: 11, color: dim }}>{c.sub}</div></div>
              <Toggle on={!!form.channels[c.key]} onClick={() => toggleChannel(c.key)} />
            </div>
          ))}
          <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
            <div><label className="f5-label">Idle Timeout (s)</label><input className="f5-input" type="number" value={form.idleTimeout} disabled={!canEdit} onChange={(e) => patch({ idleTimeout: parseInt(e.target.value, 10) || 0 })} /></div>
            <div style={{ display: "flex", gap: 8 }}>
              <div><label className="f5-label">Quiet Start</label><input className="f5-input" type="time" value={form.quietStart} disabled={!canEdit} onChange={(e) => patch({ quietStart: e.target.value })} /></div>
              <div><label className="f5-label">Quiet End</label><input className="f5-input" type="time" value={form.quietEnd} disabled={!canEdit} onChange={(e) => patch({ quietEnd: e.target.value })} /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
        {/* D — Kiosk Mode */}
        <div className="f5-card">
          <div className="f5-section-title" style={{ marginTop: 0 }}>Kiosk Mode Configuration</div>
          <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
            {PORTAL_KIOSK.map((k) => (
              <div key={k.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0" }}>
                <span style={{ fontSize: 13, color: "var(--f5-text-secondary)" }}>{k.label}</span>
                <Toggle on={!!form.kiosk[k.key]} onClick={() => toggleKiosk(k.key)} />
              </div>
            ))}
          </div>
          {form.kiosk.pin_lock && (
            <div style={{ marginTop: 8 }}><label className="f5-label">PIN Code</label><input className="f5-input" type="password" placeholder="• • • •" disabled={!canEdit} /></div>
          )}
        </div>

        {/* G — Integration status */}
        <div className="f5-card">
          <div className="f5-section-title" style={{ marginTop: 0 }}>Integration Status</div>
          {PORTAL_INTEGRATIONS.map((it) => (
            <div key={it.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--f5-border)" }}>
              <div><div style={{ fontSize: 13, color: fg }}>{it.name}</div><div style={{ fontSize: 11, color: dim }}>{it.sub}</div></div>
              <span style={{ fontSize: 12, color: "var(--f5-green,#34d399)" }}>🟢 {it.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* E — Notification preferences (provider-level defaults) */}
      <div className="f5-section-title">Notification Preferences <span style={{ fontSize: 11, fontWeight: 400, color: dim }}>(provider defaults)</span></div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead><tr><th>Category</th><th style={{ textAlign: "center" }}>SMS</th><th style={{ textAlign: "center" }}>Email</th><th style={{ textAlign: "center" }}>Signage</th></tr></thead>
          <tbody>
            {PORTAL_NOTIFY.map((n) => (
              <tr key={n.label}>
                <td style={{ color: fg }}>{n.label}{n.forced && <span style={{ fontSize: 10, color: dim }}> · locked</span>}</td>
                {([n.sms, n.email, n.signage] as boolean[]).map((on, i) => (
                  <td key={i} style={{ textAlign: "center", color: on ? "var(--f5-teal,#00CCCC)" : "var(--f5-text-dim)" }}>{on ? "✓" : "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: dim, marginTop: 8 }}>Emergency broadcasts and compliance notices override quiet hours.</div>

      {/* H — Portal analytics (read-only) */}
      <div className="f5-section-title">Portal Analytics</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <div className="f5-card"><div className="f5-kpi-label">Active Users</div><div className="f5-kpi-value">247</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Avg Monthly Logins</div><div className="f5-kpi-value">1,824</div></div>
        <div className="f5-card"><div className="f5-kpi-label">WO Submissions</div><div className="f5-kpi-value">38</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Self-Service Rate</div><div className="f5-kpi-value">64%</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Most Used</div><div className="f5-kpi-value" style={{ fontSize: 18 }}>View WOs</div></div>
      </div>

      {canEdit && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16 }}>
          <button className="f5-btn primary" disabled={pending || !dirty} onClick={save}>{pending ? "Saving…" : "Save Portal Config"}</button>
          {saved && !dirty && <span style={{ fontSize: 12, color: "var(--f5-green,#34d399)" }}>Saved ✓</span>}
          {error && <span style={{ fontSize: 12, color: "var(--f5-red,#f87171)" }}>{error}</span>}
        </div>
      )}
    </>
  );
}
