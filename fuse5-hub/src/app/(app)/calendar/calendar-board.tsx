"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CalendarRow } from "@/lib/queries";
import { saveEvent, deleteEvent, type CalendarEventInput } from "./actions";

const CHANNELS = [["email", "Email"], ["sms", "SMS"], ["whatsapp", "WhatsApp"], ["voice", "Voice"], ["display", "Display"], ["multi", "Multi-channel"]];
const STATUSES = [["scheduled", "Scheduled"], ["sent", "Sent"]];
const channelLabel = (c: string) => (CHANNELS.find(([k]) => k === c)?.[1]) ?? c;
const statusBadge = (s: string) => (s === "sent" ? "f5-badge ok" : "f5-badge warn");
const statusLabel = (s: string) => (STATUSES.find(([k]) => k === s)?.[1]) ?? s;
const blank = (): CalendarEventInput => ({ title: "", day: "", channel: "multi", status: "scheduled" });

export function CalendarBoard({ events, canEdit }: { events: CalendarRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CalendarEventInput | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Group rows by day, preserving order.
  const days: string[] = [];
  const byDay = new Map<string, CalendarRow[]>();
  for (const e of events) {
    if (!byDay.has(e.day)) { byDay.set(e.day, []); days.push(e.day); }
    byDay.get(e.day)!.push(e);
  }

  function openAdd() { setError(null); setEditing(blank()); }
  function openEdit(e: CalendarRow) { setError(null); setEditing({ id: e.id, title: e.title, day: e.day, channel: e.channel, status: e.status }); }
  function save() {
    if (!editing) return;
    if (!editing.title.trim()) { setError("Event title is required."); return; }
    if (!editing.day) { setError("A date is required."); return; }
    startTransition(async () => {
      const r = await saveEvent(editing);
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setEditing(null); router.refresh();
    });
  }
  function remove(e: CalendarRow) {
    if (!confirm(`Delete "${e.title}"?`)) return;
    startTransition(async () => {
      const r = await deleteEvent(e.id);
      if (!r.ok) { setError(r.error ?? "Could not delete."); return; }
      router.refresh();
    });
  }
  const set = (patch: Partial<CalendarEventInput>) => setEditing((p) => (p ? { ...p, ...patch } : p));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <div className="f5-page-title">Comms Calendar</div>
          <div className="f5-page-sub">Upcoming scheduled sends across all channels.</div>
        </div>
        {canEdit && <button className="f5-btn primary" style={{ marginTop: 4 }} onClick={openAdd}>+ New Event</button>}
      </div>

      {error && !editing && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 10 }}>{error}</div>}
      {days.length === 0 && <div className="f5-card" style={{ marginTop: 18, color: "var(--f5-text-muted)", fontSize: 13 }}>No events scheduled yet.</div>}

      {days.map((day) => (
        <div key={day}>
          <div className="f5-section-title">{day}</div>
          <div className="f5-card" style={{ padding: 0 }}>
            <table className="f5-table">
              <thead>
                <tr><th>Title</th><th>Date</th><th>Channel</th><th>Status</th>{canEdit && <th style={{ textAlign: "right" }}>Actions</th>}</tr>
              </thead>
              <tbody>
                {byDay.get(day)!.map((e) => (
                  <tr key={e.id}>
                    <td style={{ color: "var(--f5-text)" }}>{e.title}</td>
                    <td>{e.day}</td>
                    <td>{channelLabel(e.channel)}</td>
                    <td><span className={statusBadge(e.status)}>{statusLabel(e.status)}</span></td>
                    {canEdit && (
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => openEdit(e)}>Edit</button>
                        <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6, color: "var(--f5-red)" }} onClick={() => remove(e)} disabled={pending}>Delete</button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }} onClick={() => setEditing(null)}>
          <div className="f5-card" style={{ width: 520, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="f5-section-title" style={{ margin: 0 }}>{editing.id ? "Edit Event" : "New Event"}</div>

            <label className="f5-label">Title <span style={{ color: "var(--f5-red)" }}>*</span></label>
            <input className="f5-input" value={editing.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. June Newsletter" />

            <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: 8 }}>
              <div>
                <label className="f5-label">Date <span style={{ color: "var(--f5-red)" }}>*</span></label>
                <input className="f5-input" type="date" value={editing.day} onChange={(e) => set({ day: e.target.value })} />
              </div>
              <div>
                <label className="f5-label">Channel</label>
                <select className="f5-select" value={editing.channel} onChange={(e) => set({ channel: e.target.value })}>
                  {CHANNELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="f5-label">Status</label>
                <select className="f5-select" value={editing.status} onChange={(e) => set({ status: e.target.value })}>
                  {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
            </div>

            {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="f5-btn primary" disabled={pending} onClick={save}>{pending ? "Saving…" : editing.id ? "Save Changes" : "Create Event"}</button>
              <button className="f5-btn" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
