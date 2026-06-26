"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SurveyRow } from "@/lib/queries";
import Link from "next/link";
import { saveSurvey, deleteSurvey, createBlankSurvey, type SurveyInput } from "./actions";

const statusBadge: Record<SurveyRow["status"], string> = { live: "ok", closed: "warn", draft: "bad" };
const statusLabel: Record<SurveyRow["status"], string> = { live: "Live", closed: "Closed", draft: "Draft" };
const rate = (s: { sent: number; responses: number }) => (s.sent > 0 ? Math.round((s.responses / s.sent) * 100) : 0);
const blank = (): SurveyInput => ({ title: "", status: "draft", sent: 0, responses: 0 });

export function SurveysTable({ surveys, canEdit }: { surveys: SurveyRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<SurveyInput | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openAdd() { setError(null); setEditing(blank()); }
  function openEdit(s: SurveyRow) { setError(null); setEditing({ id: s.id, title: s.title, status: s.status, sent: s.sent, responses: s.responses }); }
  function save() {
    if (!editing) return;
    if (!editing.title.trim()) { setError("Survey title is required."); return; }
    startTransition(async () => {
      const r = await saveSurvey(editing);
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setEditing(null); router.refresh();
    });
  }
  function remove(s: SurveyRow) {
    if (!confirm(`Delete survey "${s.title}"?`)) return;
    startTransition(async () => {
      const r = await deleteSurvey(s.id);
      if (!r.ok) { setError(r.error ?? "Could not delete."); return; }
      router.refresh();
    });
  }
  const set = (patch: Partial<SurveyInput>) => setEditing((p) => (p ? { ...p, ...patch } : p));

  return (
    <>
      <div className="f5-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>All Surveys</span>
        {canEdit && (
          <div style={{ display: "flex", gap: 8 }}>
            <button className="f5-btn" onClick={openAdd}>+ Quick add</button>
            <button className="f5-btn primary" disabled={pending} onClick={() => startTransition(async () => {
              const r = await createBlankSurvey();
              if (!r.ok || !r.id) { setError(r.error ?? "Could not create."); return; }
              router.push(`/surveys/${r.id}`);
            })}>＋ Build a Survey</button>
          </div>
        )}
      </div>

      {error && !editing && <div style={{ color: "var(--f5-red)", fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead>
            <tr><th>Title</th><th>Status</th><th>Sent</th><th>Responses</th><th>Response Rate</th>{canEdit && <th style={{ textAlign: "right" }}>Actions</th>}</tr>
          </thead>
          <tbody>
            {surveys.map((s) => {
              const r = rate(s);
              return (
                <tr key={s.id}>
                  <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{s.title}</td>
                  <td><span className={`f5-badge ${statusBadge[s.status]}`}>{statusLabel[s.status]}</span></td>
                  <td>{s.sent.toLocaleString()}</td>
                  <td>{s.responses.toLocaleString()}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 999, background: "var(--f5-surface-2)", overflow: "hidden", minWidth: 80 }}>
                        <div style={{ width: `${r}%`, height: "100%", background: "var(--f5-gradient-teal)" }} />
                      </div>
                      <span style={{ color: "var(--f5-text)", fontSize: 12, minWidth: 34, textAlign: "right" }}>{r}%</span>
                    </div>
                  </td>
                  {canEdit && (
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <Link className="f5-btn" style={{ padding: "4px 10px", fontSize: 12 }} href={`/surveys/${s.id}`}>Build</Link>
                      <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6 }} onClick={() => openEdit(s)}>Edit</button>
                      <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6, color: "var(--f5-red)" }} onClick={() => remove(s)} disabled={pending}>Delete</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }} onClick={() => setEditing(null)}>
          <div className="f5-card" style={{ width: 520, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="f5-section-title" style={{ margin: 0 }}>{editing.id ? "Edit Survey" : "New Survey"}</div>

            <label className="f5-label">Title <span style={{ color: "var(--f5-red)" }}>*</span></label>
            <input className="f5-input" value={editing.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Annual Resident Satisfaction" />

            <label className="f5-label">Status</label>
            <select className="f5-select" value={editing.status} onChange={(e) => set({ status: e.target.value as SurveyInput["status"] })}>
              <option value="draft">Draft</option>
              <option value="live">Live</option>
              <option value="closed">Closed</option>
            </select>

            <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
              <div>
                <label className="f5-label">Sent</label>
                <input className="f5-input" type="number" min={0} value={editing.sent || ""} onChange={(e) => set({ sent: parseInt(e.target.value, 10) || 0 })} placeholder="0" />
              </div>
              <div>
                <label className="f5-label">Responses</label>
                <input className="f5-input" type="number" min={0} value={editing.responses || ""} onChange={(e) => set({ responses: parseInt(e.target.value, 10) || 0 })} placeholder="0" />
              </div>
            </div>

            {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="f5-btn primary" disabled={pending} onClick={save}>{pending ? "Saving…" : editing.id ? "Save Changes" : "Create Survey"}</button>
              <button className="f5-btn" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
