"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TemplateRow } from "@/lib/queries";
import { saveTemplate, deleteTemplate, type TemplateInput } from "./actions";

const channelLabel: Record<string, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp", voice: "Voice", display: "Display" };
const CHANNELS = ["email", "sms", "display", "whatsapp", "voice"];
const blank = (): TemplateInput => ({ name: "", category: "General", channels: ["email"], version: "1.0", body: "" });

export function TemplatesTable({ templates, canEdit }: { templates: TemplateRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<TemplateInput | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openAdd() { setError(null); setEditing(blank()); }
  function openEdit(t: TemplateRow) {
    setError(null);
    setEditing({ id: t.id, name: t.name, category: t.category === "—" ? "General" : t.category, channels: t.channels.length ? t.channels : ["email"], version: t.version, body: t.body });
  }
  function save() {
    if (!editing) return;
    if (!editing.name.trim()) { setError("Template name is required."); return; }
    startTransition(async () => {
      const r = await saveTemplate(editing);
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setEditing(null); router.refresh();
    });
  }
  function remove(t: TemplateRow) {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    startTransition(async () => {
      const r = await deleteTemplate(t.id);
      if (!r.ok) { setError(r.error ?? "Could not delete."); return; }
      router.refresh();
    });
  }
  const set = (patch: Partial<TemplateInput>) => setEditing((p) => (p ? { ...p, ...patch } : p));
  const toggleChannel = (c: string) => setEditing((p) => (p ? { ...p, channels: p.channels.includes(c) ? p.channels.filter((x) => x !== c) : [...p.channels, c] } : p));

  return (
    <>
      <div className="f5-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>All Templates</span>
        {canEdit && <button className="f5-btn primary" onClick={openAdd}>+ New Template</button>}
      </div>

      {error && !editing && <div style={{ color: "var(--f5-red)", fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead>
            <tr><th>Name</th><th>Category</th><th>Channels</th><th>Version</th><th>Type</th>{canEdit && <th style={{ textAlign: "right" }}>Actions</th>}</tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{t.name}</td>
                <td>{t.category}</td>
                <td>{t.channels.map((c) => channelLabel[c] ?? c).join(", ")}</td>
                <td>{t.version}</td>
                <td>{t.mandatory ? <span className="f5-badge warn">Master</span> : <span style={{ color: "var(--f5-text-dim)" }}>Org</span>}</td>
                {canEdit && (
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {t.mandatory
                      ? <span style={{ color: "var(--f5-text-dim)", fontSize: 12 }}>Read-only</span>
                      : <>
                          <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => openEdit(t)}>Edit</button>
                          <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6, color: "var(--f5-red)" }} onClick={() => remove(t)} disabled={pending}>Delete</button>
                        </>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }} onClick={() => setEditing(null)}>
          <div className="f5-card" style={{ width: 600, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="f5-section-title" style={{ margin: 0 }}>{editing.id ? "Edit Template" : "New Template"}</div>

            <label className="f5-label">Name <span style={{ color: "var(--f5-red)" }}>*</span></label>
            <input className="f5-input" value={editing.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Parking Lot Maintenance" />

            <div className="f5-grid" style={{ gridTemplateColumns: "2fr 1fr", marginTop: 8 }}>
              <div>
                <label className="f5-label">Category</label>
                <input className="f5-input" value={editing.category} onChange={(e) => set({ category: e.target.value })} placeholder="e.g. Maintenance" />
              </div>
              <div>
                <label className="f5-label">Version</label>
                <input className="f5-input" value={editing.version} onChange={(e) => set({ version: e.target.value })} placeholder="1.0" />
              </div>
            </div>

            <label className="f5-label">Channels</label>
            <div className="f5-chips">
              {CHANNELS.map((c) => (
                <span key={c} className={`f5-chip${editing.channels.includes(c) ? " active" : ""}`} onClick={() => toggleChannel(c)}>{channelLabel[c]}</span>
              ))}
            </div>

            <label className="f5-label">Body</label>
            <textarea className="f5-textarea" rows={5} value={editing.body} onChange={(e) => set({ body: e.target.value })} placeholder="Use {{placeholders}} like {{date}}, {{time}}, {{property}}…" />

            {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="f5-btn primary" disabled={pending} onClick={save}>{pending ? "Saving…" : editing.id ? "Save Changes" : "Create Template"}</button>
              <button className="f5-btn" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
