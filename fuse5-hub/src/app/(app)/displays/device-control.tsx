"use client";

import { useState, useTransition } from "react";
import { assignContentToScreens, rebootScreens, setScreensPower, screenshotScreen, identifyScreen } from "./actions";

interface Device { id: string; name: string; location: string; status: "online" | "offline" | "warning" }
const statusDot: Record<Device["status"], string> = { online: "var(--f5-green,#34d399)", offline: "var(--f5-red,#f87171)", warning: "var(--f5-amber,#f59e0b)" };
const dim = "var(--f5-text-muted)";

// Manage Wallboard screens directly from Fuse5: select screens, assign content,
// reboot, power, screenshot, identify. Live when WALLBOARD_ACCESS_TOKEN is set;
// otherwise actions return a clear "connect Wallboard" message.
export function DeviceControl({ devices, content, control, canEdit }: { devices: Device[]; content: { id: string; title: string }[]; control: boolean; canEdit: boolean }) {
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [contentId, setContentId] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [shot, setShot] = useState<string | null>(null);

  const allSel = devices.length > 0 && sel.size === devices.length;
  const toggle = (id: string) => setSel((s) => { const x = new Set(s); x.has(id) ? x.delete(id) : x.add(id); return x; });
  const toggleAll = () => setSel(allSel ? new Set() : new Set(devices.map((d) => d.id)));

  const run = (fn: () => Promise<{ ok: boolean; error?: string; url?: string }>, okText: string) => {
    setMsg(null); setShot(null);
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error ?? "Action failed." });
      if (r.ok && r.url) setShot(r.url);
    });
  };
  const ids = [...sel];

  return (
    <div style={{ marginTop: 18 }}>
      <div className="f5-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span>Display Control {control ? <span className="f5-badge ok" style={{ fontSize: 10 }}>live</span> : <span className="f5-badge" style={{ fontSize: 10 }}>preview</span>}</span>
        <span style={{ fontSize: 12, color: dim, fontWeight: 400 }}>{sel.size} selected</span>
      </div>

      {/* Bulk action toolbar */}
      {canEdit && (
        <div className="f5-card" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: 12 }}>
          <select className="f5-select" value={contentId} onChange={(e) => setContentId(e.target.value)} style={{ width: 240 }}>
            <option value="">Choose content to assign…</option>
            {content.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <button className="f5-btn primary" disabled={pending || !sel.size || !contentId} onClick={() => run(() => assignContentToScreens(ids, contentId), `Assigned to ${sel.size} screen(s).`)}>Assign to {sel.size || "—"}</button>
          <span style={{ width: 1, height: 22, background: "var(--f5-border)" }} />
          <button className="f5-btn" disabled={pending || !sel.size} onClick={() => run(() => rebootScreens(ids), `Rebooted ${sel.size}.`)}>↻ Reboot</button>
          <button className="f5-btn" disabled={pending || !sel.size} onClick={() => run(() => setScreensPower(ids, true), `Power ON ${sel.size}.`)}>⏻ On</button>
          <button className="f5-btn" disabled={pending || !sel.size} onClick={() => run(() => setScreensPower(ids, false), `Power OFF ${sel.size}.`)}>⏼ Off</button>
        </div>
      )}
      {!control && <div style={{ fontSize: 12, color: dim, margin: "8px 2px" }}>Preview mode — set <code>WALLBOARD_ACCESS_TOKEN</code> to control real screens. Actions are wired and audit-logged; they’ll execute against Wallboard once connected.</div>}
      {msg && <div style={{ fontSize: 13, margin: "8px 2px", color: msg.ok ? "var(--f5-green,#34d399)" : "var(--f5-red)" }}>{msg.text}</div>}
      {shot && <img src={shot} alt="screen" style={{ maxWidth: 360, borderRadius: 8, border: "1px solid var(--f5-border)", marginTop: 8 }} />}

      <div className="f5-card" style={{ padding: 0, overflow: "hidden", marginTop: 10 }}>
        <table className="f5-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}><input type="checkbox" checked={allSel} onChange={toggleAll} /></th>
              <th>Screen</th><th>Location</th><th>Status</th>
              {canEdit && <th style={{ textAlign: "right" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td><input type="checkbox" checked={sel.has(d.id)} onChange={() => toggle(d.id)} /></td>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{d.name}</td>
                <td style={{ color: dim, fontSize: 12 }}>{d.location}</td>
                <td><span style={{ color: statusDot[d.status] }}>●</span> <span style={{ textTransform: "capitalize", fontSize: 12 }}>{d.status}</span></td>
                {canEdit && (
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="f5-btn" style={{ padding: "3px 9px", fontSize: 12 }} disabled={pending} onClick={() => run(() => screenshotScreen(d.id), `Screenshot requested for ${d.name}.`)}>📷</button>
                    <button className="f5-btn" style={{ padding: "3px 9px", fontSize: 12, marginLeft: 6 }} disabled={pending} onClick={() => run(() => identifyScreen(d.id), `Identifying ${d.name}.`)}>🔆 Identify</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
