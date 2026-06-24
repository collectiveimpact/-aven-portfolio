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
const CHANNEL_TINT: Record<string, string> = { email: "var(--f5-teal)", sms: "var(--f5-green)", whatsapp: "var(--f5-green)", voice: "var(--f5-amber)", display: "var(--f5-purple,#a78bfa)", multi: "var(--f5-blue,#60a5fa)" };
// Normalise a stored day to YYYY-MM-DD for grid bucketing; returns "" if unparseable.
function isoOf(day: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(day)) return day.slice(0, 10);
  const d = new Date(day);
  return isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function CalendarBoard({ events, canEdit }: { events: CalendarRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CalendarEventInput | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<"list" | "month">("list");
  // Anchor the month grid on the first parseable event, else today.
  const firstIso = events.map((e) => isoOf(e.day)).find(Boolean);
  const anchor0 = firstIso ? new Date(firstIso + "T00:00:00") : new Date();
  const [anchor, setAnchor] = useState({ y: anchor0.getFullYear(), m: anchor0.getMonth() });
  const shiftMonth = (delta: number) => setAnchor((a) => { const d = new Date(a.y, a.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

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
        <div style={{ display: "flex", gap: 10, marginTop: 4, alignItems: "center" }}>
          <div className="f5-chips" style={{ margin: 0 }}>
            <span className={`f5-chip${view === "list" ? " active" : ""}`} onClick={() => setView("list")}>List</span>
            <span className={`f5-chip${view === "month" ? " active" : ""}`} onClick={() => setView("month")}>Month</span>
          </div>
          {canEdit && <button className="f5-btn primary" onClick={openAdd}>+ New Event</button>}
        </div>
      </div>

      {error && !editing && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 10 }}>{error}</div>}

      {view === "month" && <MonthGrid events={events} y={anchor.y} m={anchor.m} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} onPick={canEdit ? openEdit : undefined} />}

      {view === "list" && days.length === 0 && <div className="f5-card" style={{ marginTop: 18, color: "var(--f5-text-muted)", fontSize: 13 }}>No events scheduled yet.</div>}

      {view === "list" && days.map((day) => (
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

// Month grid: 6 weeks × 7 days with event chips bucketed by date.
function MonthGrid({ events, y, m, onPrev, onNext, onPick }: {
  events: CalendarRow[]; y: number; m: number; onPrev: () => void; onNext: () => void; onPick?: (e: CalendarRow) => void;
}) {
  const byIso = new Map<string, CalendarRow[]>();
  for (const e of events) { const iso = isoOf(e.day); if (!iso) continue; if (!byIso.has(iso)) byIso.set(iso, []); byIso.get(iso)!.push(e); }
  const first = new Date(y, m, 1);
  const startOffset = first.getDay(); // 0=Sun
  const cells: { iso: string; dayNum: number; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(y, m, 1 - startOffset + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    cells.push({ iso, dayNum: d.getDate(), inMonth: d.getMonth() === m });
  }
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div className="f5-card" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <button className="f5-btn" style={{ padding: "4px 12px" }} onClick={onPrev}>← Prev</button>
        <strong style={{ color: "var(--f5-text)", fontSize: 15 }}>{MONTHS[m]} {y}</strong>
        <button className="f5-btn" style={{ padding: "4px 12px" }} onClick={onNext}>Next →</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, background: "var(--f5-border)", border: "1px solid var(--f5-border)", borderRadius: 8, overflow: "hidden" }}>
        {dow.map((d) => (
          <div key={d} style={{ background: "var(--f5-surface-2)", padding: "6px 8px", fontSize: 11, color: "var(--f5-text-muted)", textAlign: "center", fontWeight: 600 }}>{d}</div>
        ))}
        {cells.map((c, i) => {
          const evs = byIso.get(c.iso) ?? [];
          return (
            <div key={i} style={{ background: "var(--f5-surface)", minHeight: 92, padding: 6, opacity: c.inMonth ? 1 : 0.4 }}>
              <div style={{ fontSize: 11, color: "var(--f5-text-muted)", marginBottom: 4, textAlign: "right" }}>{c.dayNum}</div>
              {evs.slice(0, 3).map((e) => (
                <div key={e.id} onClick={onPick ? () => onPick(e) : undefined}
                  title={`${e.title} · ${channelLabel(e.channel)} · ${statusLabel(e.status)}`}
                  style={{ fontSize: 11, padding: "2px 6px", marginBottom: 3, borderRadius: 4, background: "color-mix(in srgb, " + (CHANNEL_TINT[e.channel] ?? "var(--f5-teal)") + " 18%, transparent)", borderLeft: "2px solid " + (CHANNEL_TINT[e.channel] ?? "var(--f5-teal)"), color: "var(--f5-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: onPick ? "pointer" : "default", opacity: e.status === "sent" ? 0.7 : 1 }}>
                  {e.title}
                </div>
              ))}
              {evs.length > 3 && <div style={{ fontSize: 10, color: "var(--f5-text-muted)" }}>+{evs.length - 3} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
