"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { JOURNEY_TEMPLATES, TRIGGER_TYPES, type Journey } from "@/lib/journeys";
import { JourneyBuilder } from "./journey-builder";
import { createFromTemplate, setJourneyStatus, deleteJourney } from "./actions";

const fg = "var(--f5-text)";
const dim = "var(--f5-text-muted)";

const blankJourney = (): Journey => ({ id: "new", name: "", trigger: { type: "manual", label: "Manual enroll" }, status: "draft", steps: [], enrolled: 0, updatedAt: "" });

export function JourneysClient({ journeys, canEdit }: { journeys: Journey[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Journey | null>(null);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const active = journeys.filter((j) => j.status === "active").length;
  const enrolled = journeys.reduce((a, j) => a + j.enrolled, 0);
  const drafts = journeys.filter((j) => j.status === "draft").length;

  const act = (fn: () => Promise<{ ok: boolean; error?: string }>) => { setErr(null); start(async () => { const r = await fn(); if (!r.ok) setErr(r.error ?? "Action failed."); else router.refresh(); }); };
  const triggerIcon = (t: Journey["trigger"]) => TRIGGER_TYPES.find((x) => x.key === t.type)?.icon ?? "•";
  const statusBadge = (s: Journey["status"]) => s === "active" ? "f5-badge ok" : s === "paused" ? "f5-badge warn" : "f5-badge";

  return (
    <>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Active Journeys</div><div className="f5-kpi-value" style={{ color: "var(--f5-green,#34d399)" }}>{active}</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Residents Enrolled</div><div className="f5-kpi-value">{enrolled.toLocaleString()}</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Drafts</div><div className="f5-kpi-value">{drafts}</div></div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="f5-section-title" style={{ margin: 0 }}>Your Journeys</div>
        {canEdit && <button className="f5-btn primary" onClick={() => setEditing(blankJourney())}>+ New Journey</button>}
      </div>
      {err && <div style={{ color: "var(--f5-red,#f87171)", fontSize: 13, marginTop: 8 }}>{err}</div>}
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead><tr><th>Journey</th><th>Trigger</th><th>Steps</th><th>Enrolled</th><th>Status</th>{canEdit && <th style={{ textAlign: "right" }}>Actions</th>}</tr></thead>
          <tbody>
            {journeys.length === 0 && <tr><td colSpan={canEdit ? 6 : 5} style={{ color: dim, textAlign: "center", padding: 20, fontSize: 13 }}>No journeys yet — start from a template below.</td></tr>}
            {journeys.map((j) => (
              <tr key={j.id}>
                <td><button type="button" onClick={() => canEdit && setEditing(j)} style={{ background: "none", border: "none", padding: 0, color: "var(--f5-teal,#00CCCC)", fontWeight: 600, cursor: canEdit ? "pointer" : "default", textAlign: "left" }}>{j.name}</button></td>
                <td style={{ color: dim, fontSize: 12 }}>{triggerIcon(j.trigger)} {j.trigger.label}</td>
                <td>{j.steps.length}</td>
                <td>{j.enrolled.toLocaleString()}</td>
                <td><span className={statusBadge(j.status)} style={{ textTransform: "capitalize" }}>{j.status}</span></td>
                {canEdit && (
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setEditing(j)}>Edit</button>
                    {j.status === "active"
                      ? <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6 }} disabled={pending} onClick={() => act(() => setJourneyStatus(j.id, "paused"))}>Pause</button>
                      : <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6, color: "var(--f5-green,#34d399)" }} disabled={pending || j.id.startsWith("demo")} onClick={() => act(() => setJourneyStatus(j.id, "active"))}>Activate</button>}
                    <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6, color: "var(--f5-red)" }} disabled={pending || j.id.startsWith("demo")} onClick={() => { if (confirm(`Delete "${j.name}"?`)) act(() => deleteJourney(j.id)); }}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="f5-section-title">Start from a Template</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))" }}>
        {JOURNEY_TEMPLATES.map((t) => (
          <div key={t.key} className="f5-card">
            <div style={{ fontWeight: 700, color: fg }}>{t.icon} {t.name}</div>
            <div style={{ fontSize: 12, color: dim, margin: "6px 0 10px", minHeight: 48 }}>{t.description}</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: dim }}>{t.steps.length} steps · {TRIGGER_TYPES.find((x) => x.key === t.trigger.type)?.label}</span>
              {canEdit && <button className="f5-btn" style={{ fontSize: 12, padding: "4px 10px" }} disabled={pending} onClick={() => act(() => createFromTemplate(t.key))}>Use</button>}
            </div>
          </div>
        ))}
      </div>

      {editing && <JourneyBuilder journey={editing} onClose={() => setEditing(null)} />}
    </>
  );
}
