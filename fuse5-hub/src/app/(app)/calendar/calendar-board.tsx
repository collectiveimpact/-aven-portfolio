"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { CalendarRow } from "@/lib/queries";
import { saveEvent, deleteEvent, type CalendarEventInput } from "./actions";
import {
  CHANNEL_META, TYPE_META, TYPE_ORDER, type EventType,
  channelLabel, channelTint, channelIcon,
  deriveType, deriveProperty, isoOf, friendlyDate,
  statusBadgeClass, statusLabel, MONTHS,
} from "./derive";

const CHANNELS = Object.entries(CHANNEL_META).map(([k, v]) => [k, v.label] as const);
const STATUSES = [["scheduled", "Scheduled"], ["sent", "Sent"]] as const;
const blank = (): CalendarEventInput => ({ title: "", day: "", channel: "multi", status: "scheduled" });

// A CalendarRow enriched with derived metadata, computed once.
type EnrichedRow = CalendarRow & { iso: string; type: EventType; property: string };
function enrich(events: CalendarRow[]): EnrichedRow[] {
  return events.map((e) => ({ ...e, iso: isoOf(e.day), type: deriveType(e), property: deriveProperty(e.title) }));
}

type Mode = "staff" | "resident";

export function CalendarBoard({ events, canEdit }: { events: CalendarRow[]; canEdit: boolean }) {
  const router = useRouter();
  const rows = useMemo(() => enrich(events), [events]);
  const [mode, setMode] = useState<Mode>("staff");
  const [editing, setEditing] = useState<CalendarEventInput | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="f5-page-title">Comms Calendar</div>
          <div className="f5-page-sub">
            {mode === "staff"
              ? "Everything scheduled across the portfolio — broadcasts, journeys, surveys, drills & maintenance."
              : "What's coming up for residents, in plain language."}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 4, alignItems: "center" }}>
          {/* Audience toggle — the primary control on the page */}
          <div className="f5-chips" style={{ margin: 0, background: "var(--f5-surface-2)", borderRadius: 999, padding: 3, gap: 3, border: "1px solid var(--f5-border)" }}>
            {([["staff", "Staff schedule"], ["resident", "Resident upcoming"]] as const).map(([k, l]) => (
              <span key={k} className={`f5-chip${mode === k ? " active" : ""}`}
                onClick={() => setMode(k)}
                style={{ border: mode === k ? undefined : "1px solid transparent", background: mode === k ? undefined : "transparent", fontWeight: 600 }}>
                {l}
              </span>
            ))}
          </div>
          {canEdit && <button className="f5-btn primary" onClick={openAdd}>+ New Event</button>}
        </div>
      </div>

      {error && !editing && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 10 }}>{error}</div>}

      {mode === "staff"
        ? <StaffSchedule rows={rows} canEdit={canEdit} onEdit={openEdit} onDelete={remove} pending={pending} />
        : <ResidentUpcoming rows={rows} />}

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }} onClick={() => setEditing(null)}>
          <div className="f5-card" style={{ width: 520, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="f5-section-title" style={{ margin: 0 }}>{editing.id ? "Edit Event" : "New Event"}</div>

            <label className="f5-label">Title <span style={{ color: "var(--f5-red)" }}>*</span></label>
            <input className="f5-input" value={editing.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. June Newsletter" />
            {editing.title.trim() && (
              <div style={{ marginTop: 6, fontSize: 11, color: "var(--f5-text-muted)" }}>
                Categorised as <strong style={{ color: TYPE_META[deriveType({ title: editing.title, channel: editing.channel })].tint }}>
                  {TYPE_META[deriveType({ title: editing.title, channel: editing.channel })].label}
                </strong> · {deriveProperty(editing.title)}
              </div>
            )}

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

// =========================================================================
// STAFF SCHEDULE — dense, high-volume internal view.
// Month grid + filterable agenda, faceted by type / channel.
// =========================================================================
function StaffSchedule({ rows, canEdit, onEdit, onDelete, pending }: {
  rows: EnrichedRow[]; canEdit: boolean; onEdit: (e: CalendarRow) => void; onDelete: (e: CalendarRow) => void; pending: boolean;
}) {
  const [layout, setLayout] = useState<"agenda" | "month">("agenda");
  const [typeF, setTypeF] = useState<EventType | "all">("all");
  const [chanF, setChanF] = useState<string>("all");
  const [propF, setPropF] = useState<string>("all");
  const [q, setQ] = useState("");

  const properties = useMemo(() => Array.from(new Set(rows.map((r) => r.property))).sort(), [rows]);
  const channels = useMemo(() => Array.from(new Set(rows.map((r) => r.channel))), [rows]);
  const typeCount = (t: EventType) => rows.filter((r) => r.type === t).length;

  const needle = q.trim().toLowerCase();
  const filtered = useMemo(() => rows.filter((r) => {
    if (typeF !== "all" && r.type !== typeF) return false;
    if (chanF !== "all" && r.channel !== chanF) return false;
    if (propF !== "all" && r.property !== propF) return false;
    if (needle && !(r.title.toLowerCase().includes(needle) || r.property.toLowerCase().includes(needle))) return false;
    return true;
  }), [rows, typeF, chanF, propF, needle]);

  // Group the agenda by day (events come pre-ordered by day from the query).
  const byDay = useMemo(() => {
    const days: string[] = [];
    const map = new Map<string, EnrichedRow[]>();
    for (const e of filtered) {
      if (!map.has(e.day)) { map.set(e.day, []); days.push(e.day); }
      map.get(e.day)!.push(e);
    }
    return { days, map };
  }, [filtered]);

  // Anchor month grid on the first event, else today.
  const firstIso = rows.map((r) => r.iso).find(Boolean);
  const anchor0 = firstIso ? new Date(firstIso + "T00:00:00") : new Date();
  const [anchor, setAnchor] = useState({ y: anchor0.getFullYear(), m: anchor0.getMonth() });
  const shiftMonth = (delta: number) => setAnchor((a) => { const d = new Date(a.y, a.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  return (
    <div style={{ marginTop: 18 }}>
      {/* KPI strip — at-a-glance volume by type */}
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(132px,1fr))", marginBottom: 16 }}>
        <div className="f5-card" style={{ padding: 14 }}>
          <div className="f5-kpi-label">Total scheduled</div>
          <div className="f5-kpi-value">{rows.length}</div>
          <div className="f5-kpi-sub">{properties.length} properties · {channels.length} channels</div>
        </div>
        {TYPE_ORDER.filter((t) => typeCount(t) > 0).map((t) => (
          <div key={t} className="f5-card" style={{ padding: 14, cursor: "pointer", borderColor: typeF === t ? TYPE_META[t].tint : undefined }}
            onClick={() => setTypeF((p) => (p === t ? "all" : t))} title={`Filter to ${TYPE_META[t].label}`}>
            <div className="f5-kpi-label" style={{ color: TYPE_META[t].tint }}>{TYPE_META[t].icon} {TYPE_META[t].label}</div>
            <div className="f5-kpi-value" style={{ fontSize: 26 }}>{typeCount(t)}</div>
          </div>
        ))}
      </div>

      {/* Filter / layout toolbar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <input className="f5-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title or property…" style={{ maxWidth: 260 }} />
        <select className="f5-select" value={typeF} onChange={(e) => setTypeF(e.target.value as EventType | "all")} style={{ width: "auto", minWidth: 150 }}>
          <option value="all">All types</option>
          {TYPE_ORDER.filter((t) => typeCount(t) > 0).map((t) => <option key={t} value={t}>{TYPE_META[t].label} ({typeCount(t)})</option>)}
        </select>
        <select className="f5-select" value={chanF} onChange={(e) => setChanF(e.target.value)} style={{ width: "auto", minWidth: 140 }}>
          <option value="all">All channels</option>
          {channels.map((c) => <option key={c} value={c}>{channelLabel(c)}</option>)}
        </select>
        <select className="f5-select" value={propF} onChange={(e) => setPropF(e.target.value)} style={{ width: "auto", minWidth: 150 }}>
          <option value="all">All properties</option>
          {properties.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="f5-chips" style={{ margin: 0, marginLeft: "auto" }}>
          <span className={`f5-chip${layout === "agenda" ? " active" : ""}`} onClick={() => setLayout("agenda")}>☰ Agenda</span>
          <span className={`f5-chip${layout === "month" ? " active" : ""}`} onClick={() => setLayout("month")}>▦ Month</span>
        </div>
        <span style={{ fontSize: 12, color: "var(--f5-text-muted)" }}>{filtered.length} of {rows.length}</span>
      </div>

      {layout === "month" && (
        <MonthGrid rows={filtered} y={anchor.y} m={anchor.m} onPrev={() => shiftMonth(-1)} onNext={() => shiftMonth(1)} onPick={canEdit ? onEdit : undefined} />
      )}

      {layout === "agenda" && (
        byDay.days.length === 0
          ? <div className="f5-card" style={{ color: "var(--f5-text-muted)", fontSize: 13 }}>No events match these filters.</div>
          : byDay.days.map((day) => {
            const fd = friendlyDate(isoOf(day));
            return (
              <div key={day}>
                <div className="f5-section-title" style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span>{fd.label !== "—" ? fd.label : day}</span>
                  {fd.rel && <span style={{ textTransform: "none", letterSpacing: 0, color: "var(--f5-text-dim)", fontSize: 11 }}>{fd.rel}</span>}
                  <span style={{ textTransform: "none", letterSpacing: 0, color: "var(--f5-text-dim)", fontSize: 11 }}>· {byDay.map.get(day)!.length} item(s)</span>
                </div>
                <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
                  <table className="f5-table">
                    <thead>
                      <tr><th style={{ width: 130 }}>Type</th><th>Title</th><th>Property</th><th>Channel</th><th>Status</th>{canEdit && <th style={{ textAlign: "right" }}>Actions</th>}</tr>
                    </thead>
                    <tbody>
                      {byDay.map.get(day)!.map((e) => (
                        <tr key={e.id}>
                          <td><span className="f5-badge" style={{ color: TYPE_META[e.type].tint, borderColor: "color-mix(in srgb, " + TYPE_META[e.type].tint + " 35%, transparent)" }}>{TYPE_META[e.type].icon} {TYPE_META[e.type].label}</span></td>
                          <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{e.title}</td>
                          <td>{e.property}</td>
                          <td><span style={{ color: channelTint(e.channel) }}>{channelIcon(e.channel)} {channelLabel(e.channel)}</span></td>
                          <td><span className={statusBadgeClass(e.status)}>{statusLabel(e.status)}</span></td>
                          {canEdit && (
                            <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                              <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => onEdit(e)}>Edit</button>
                              <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6, color: "var(--f5-red)" }} onClick={() => onDelete(e)} disabled={pending}>Delete</button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
      )}
    </div>
  );
}

// Month grid: 6 weeks × 7 days, chips tinted by event type.
function MonthGrid({ rows, y, m, onPrev, onNext, onPick }: {
  rows: EnrichedRow[]; y: number; m: number; onPrev: () => void; onNext: () => void; onPick?: (e: CalendarRow) => void;
}) {
  const byIso = new Map<string, EnrichedRow[]>();
  for (const e of rows) { if (!e.iso) continue; if (!byIso.has(e.iso)) byIso.set(e.iso, []); byIso.get(e.iso)!.push(e); }
  const first = new Date(y, m, 1);
  const startOffset = first.getDay();
  const cells: { iso: string; dayNum: number; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(y, m, 1 - startOffset + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    cells.push({ iso, dayNum: d.getDate(), inMonth: d.getMonth() === m });
  }
  const dow = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div className="f5-card">
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
            <div key={i} style={{ background: "var(--f5-surface)", minHeight: 96, padding: 6, opacity: c.inMonth ? 1 : 0.4 }}>
              <div style={{ fontSize: 11, color: "var(--f5-text-muted)", marginBottom: 4, textAlign: "right" }}>{c.dayNum}</div>
              {evs.slice(0, 4).map((e) => {
                const tint = TYPE_META[e.type].tint;
                return (
                  <div key={e.id} onClick={onPick ? () => onPick(e) : undefined}
                    title={`${e.title} · ${TYPE_META[e.type].label} · ${channelLabel(e.channel)} · ${statusLabel(e.status)}`}
                    style={{ fontSize: 11, padding: "2px 6px", marginBottom: 3, borderRadius: 4, background: "color-mix(in srgb, " + tint + " 18%, transparent)", borderLeft: "2px solid " + tint, color: "var(--f5-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: onPick ? "pointer" : "default", opacity: e.status === "sent" ? 0.65 : 1 }}>
                    {TYPE_META[e.type].icon} {e.title}
                  </div>
                );
              })}
              {evs.length > 4 && <div style={{ fontSize: 10, color: "var(--f5-text-muted)" }}>+{evs.length - 4} more</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =========================================================================
// RESIDENT UPCOMING — friendly, readable, what's-coming-up view.
// Only forward-looking (scheduled) items, grouped by month, calm cards.
// =========================================================================
function ResidentUpcoming({ rows }: { rows: EnrichedRow[] }) {
  // Residents only care about what's still coming — drop "sent" history,
  // sort ascending by date.
  const upcoming = useMemo(() => rows
    .filter((r) => r.status !== "sent" && r.iso)
    .sort((a, b) => a.iso.localeCompare(b.iso)), [rows]);

  // Group by "Month Year" for gentle sectioning.
  const groups = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, EnrichedRow[]>();
    for (const e of upcoming) {
      const d = new Date(e.iso + "T00:00:00");
      const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      if (!map.has(key)) { map.set(key, []); order.push(key); }
      map.get(key)!.push(e);
    }
    return { order, map };
  }, [upcoming]);

  if (upcoming.length === 0) {
    return (
      <div className="f5-card" style={{ marginTop: 18, textAlign: "center", padding: "48px 24px" }}>
        <div style={{ fontSize: 34, marginBottom: 8 }}>🗓️</div>
        <div style={{ color: "var(--f5-text)", fontWeight: 600, fontSize: 15 }}>Nothing scheduled right now</div>
        <div style={{ color: "var(--f5-text-muted)", fontSize: 13, marginTop: 4 }}>When your building team plans something, you'll see it here.</div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 18 }}>
      <div className="f5-card" style={{ marginBottom: 18, background: "var(--f5-teal-subtle)", borderColor: "var(--f5-teal-border)" }}>
        <div style={{ color: "var(--f5-text)", fontWeight: 600, fontSize: 14 }}>📣 Here's what's coming up</div>
        <div style={{ color: "var(--f5-text-secondary)", fontSize: 13, marginTop: 4 }}>
          {upcoming.length} thing{upcoming.length === 1 ? "" : "s"} scheduled for your community. Tap nothing — this is just to keep you in the loop.
        </div>
      </div>

      {groups.order.map((key) => (
        <div key={key}>
          <div className="f5-section-title">{key}</div>
          <div className="f5-grid" style={{ gridTemplateColumns: "1fr", gap: 10 }}>
            {groups.map.get(key)!.map((e) => {
              const meta = TYPE_META[e.type];
              const fd = friendlyDate(e.iso);
              const d = new Date(e.iso + "T00:00:00");
              return (
                <div key={e.id} className="f5-card" style={{ display: "flex", gap: 16, alignItems: "stretch", padding: 0, overflow: "hidden" }}>
                  {/* Date block */}
                  <div style={{ width: 86, flexShrink: 0, background: "color-mix(in srgb, " + meta.tint + " 12%, transparent)", borderRight: "3px solid " + meta.tint, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "16px 8px" }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "var(--f5-text-muted)" }}>{MONTHS[d.getMonth()].slice(0, 3)}</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "var(--f5-text)", lineHeight: 1 }}>{d.getDate()}</div>
                    <div style={{ fontSize: 11, color: "var(--f5-text-muted)", marginTop: 2 }}>{fd.label.split(",")[0]}</div>
                  </div>
                  {/* Detail */}
                  <div style={{ flex: 1, padding: "14px 16px 14px 0", minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span className="f5-badge" style={{ color: meta.tint, borderColor: "color-mix(in srgb, " + meta.tint + " 35%, transparent)" }}>{meta.icon} {meta.label}</span>
                      {fd.rel && <span className="f5-pill">{fd.rel}</span>}
                    </div>
                    <div style={{ color: "var(--f5-text)", fontWeight: 700, fontSize: 16, marginTop: 8 }}>{e.title}</div>
                    <div style={{ color: "var(--f5-text-secondary)", fontSize: 13, marginTop: 4 }}>{meta.blurb}.</div>
                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 10, fontSize: 12.5, color: "var(--f5-text-muted)" }}>
                      <span>🏢 {e.property}</span>
                      <span style={{ color: channelTint(e.channel) }}>{channelIcon(e.channel)} via {channelLabel(e.channel)}</span>
                      <span>🕑 {fd.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
