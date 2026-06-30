"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DisplayRow, PropertyOption } from "@/lib/queries";
import { FilterBar } from "@/components/filters/FilterBar";
import type { FilterField, FilterOption } from "@/components/filters/types";
import { useFilterState, applyFilters } from "@/lib/filters";
import { useSortState, applySort } from "@/lib/sort";
import { saveDisplay, deleteDisplay, type DisplayInput } from "./actions";

const STATUS_BADGE: Record<DisplayRow["status"], string> = { online: "f5-badge ok", offline: "f5-badge bad", warning: "f5-badge warn" };
const STATUS_DOT: Record<DisplayRow["status"], string> = { online: "var(--f5-green)", offline: "var(--f5-red)", warning: "var(--f5-amber)" };
const STATUS_LABEL: Record<DisplayRow["status"], string> = { online: "Online", offline: "Offline", warning: "Warning" };
const STATUS_RANK: Record<DisplayRow["status"], number> = { offline: 2, warning: 1, online: 0 };
const STATUS_OPTIONS: FilterOption[] = [
  { value: "online", label: "Online" },
  { value: "warning", label: "Warning" },
  { value: "offline", label: "Offline" },
];
const uniqueSorted = (xs: string[]): string[] => [...new Set(xs.filter((x) => x && x !== "—"))].sort((a, b) => a.localeCompare(b));
const blank = (propertyId: string | null): DisplayInput => ({ name: "", location: "", propertyId, status: "online" });

// Deterministic per-display telemetry (demo) — derived from the id so SSR and
// client render identically. Real player heartbeats would replace this.
const RESOLUTIONS = ["1920×1080", "3840×2160", "1080×1920", "1366×768"];
const CONTENT = ["Community Notices loop", "Emergency standby", "Rent reminder card", "Welcome / wayfinding", "Maintenance advisory", "Events digest"];
function hashStr(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function telemetry(d: DisplayRow) {
  const h = hashStr(d.id || d.name);
  const res = RESOLUTIONS[h % RESOLUTIONS.length];
  const content = CONTENT[(h >> 3) % CONTENT.length];
  const signal = d.status === "offline" ? 0 : d.status === "warning" ? 2 + (h % 2) : 4 + (h % 2); // bars 0-5
  const heartbeat = d.status === "offline" ? "— no signal —" : d.status === "warning" ? `${3 + (h % 9)} min ago` : `${5 + (h % 50)}s ago`;
  const uptime = d.status === "offline" ? "0%" : `${(97 + (h % 30) / 10).toFixed(1)}%`;
  return { res, content, signal, heartbeat, uptime };
}
function SignalBars({ n }: { n: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 2, height: 12 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ width: 3, height: 3 + i * 2, borderRadius: 1, background: i < n ? "var(--f5-green)" : "var(--f5-border)" }} />
      ))}
    </span>
  );
}

export function DisplaysGrid({ displays, properties, canEdit }: { displays: DisplayRow[]; properties: PropertyOption[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<DisplayInput | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Facets derived from the registered displays.
  const propertyOptions = useMemo<FilterOption[]>(
    () => uniqueSorted(displays.map((d) => d.propertyName)).map((p) => ({ value: p, label: p })),
    [displays],
  );

  const FIELDS = useMemo<FilterField[]>(
    () => [
      { key: "q", label: "Search", kind: "search", placeholder: "Search name, location, property…" },
      { key: "property", label: "Property", kind: "multiselect", options: propertyOptions },
      { key: "status", label: "Status", kind: "segmented", options: STATUS_OPTIONS, allLabel: "All" },
    ],
    [propertyOptions],
  );

  const { value, setValue } = useFilterState({ fields: FIELDS, urlSync: true });
  // Card grid has no column headers, so a small sort <select> drives the state.
  const { sort, setSort } = useSortState({ urlSync: true });

  const filtered = useMemo(() => {
    const matched = applyFilters(displays, value, {
      q: (d) => `${d.name} ${d.location} ${d.propertyName}`,
      property: (d) => d.propertyName,
      status: (d) => d.status,
    });
    return applySort(matched, sort, {
      name: (d) => d.name,
      status: (d) => STATUS_RANK[d.status],
    });
  }, [displays, value, sort]);

  function openAdd() { setError(null); setEditing(blank(properties[0]?.id ?? null)); }
  function openEdit(d: DisplayRow) { setError(null); setEditing({ id: d.id, name: d.name, location: d.location === "—" ? "" : d.location, propertyId: d.propertyId, status: d.status }); }
  function save() {
    if (!editing) return;
    if (!editing.name.trim()) { setError("Display name is required."); return; }
    startTransition(async () => {
      const r = await saveDisplay(editing);
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setEditing(null); router.refresh();
    });
  }
  function remove(d: DisplayRow) {
    if (!confirm(`Remove "${d.name}"?`)) return;
    startTransition(async () => {
      const r = await deleteDisplay(d.id);
      if (!r.ok) { setError(r.error ?? "Could not remove."); return; }
      router.refresh();
    });
  }
  const set = (patch: Partial<DisplayInput>) => setEditing((p) => (p ? { ...p, ...patch } : p));

  return (
    <>
      <div className="f5-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Display Network</span>
        {canEdit && <button className="f5-btn primary" onClick={openAdd}>+ Add Display</button>}
      </div>

      {error && !editing && <div style={{ color: "var(--f5-red)", fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <FilterBar
        fields={FIELDS}
        value={value}
        onChange={setValue}
        resultCount={filtered.length}
        resultLabel="displays"
        actions={
          <select
            className="f5-select"
            aria-label="Sort displays"
            value={`${sort.key ?? ""}:${sort.dir}`}
            onChange={(e) => { const [k, dir] = e.target.value.split(":"); setSort({ key: k || null, dir: dir as "asc" | "desc" }); }}
            style={{ width: "auto", minWidth: 150 }}
          >
            <option value=":asc">Sort: Default</option>
            <option value="name:asc">Sort: Name A–Z</option>
            <option value="status:desc">Sort: Status (issues first)</option>
          </select>
        }
      />

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 14 }}>
        {filtered.map((d) => (
          <div key={d.id} className="f5-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                <span className="f5-dot" style={{ background: STATUS_DOT[d.status], marginTop: 0 }} />
                <strong style={{ color: "var(--f5-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</strong>
              </div>
              <span className={STATUS_BADGE[d.status]}>{STATUS_LABEL[d.status]}</span>
            </div>
            <div style={{ color: "var(--f5-text-muted)", fontSize: 12, marginTop: 10 }}>{d.propertyName} · {d.location}</div>

            {(() => { const t = telemetry(d); return (
              <>
                <div style={{ marginTop: 12, padding: "10px 12px", background: "var(--f5-surface-2)", borderRadius: 8, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--f5-text-muted)" }}><span>Now playing</span><span style={{ color: "var(--f5-text)", fontWeight: 600 }}>{t.content}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, color: "var(--f5-text-muted)" }}><span>Resolution</span><span style={{ color: "var(--f5-text-secondary)" }}>{t.res}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, color: "var(--f5-text-muted)" }}><span>Last heartbeat</span><span style={{ color: "var(--f5-text-secondary)" }}>{t.heartbeat}</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, color: "var(--f5-text-muted)", alignItems: "center" }}><span>Signal · uptime</span><span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: "var(--f5-text-secondary)" }}><SignalBars n={t.signal} /> {t.uptime}</span></div>
                </div>
              </>
            ); })()}

            {canEdit && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => openEdit(d)}>Edit</button>
                <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, color: "var(--f5-red)" }} onClick={() => remove(d)} disabled={pending}>Delete</button>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color: "var(--f5-text-muted)", fontSize: 13 }}>{displays.length === 0 ? "No displays registered yet." : "No displays match."}</div>}
      </div>

      {filtered.length > 0 && (
        <>
          <div className="f5-section-title">Proof-of-Play Log</div>
          <div className="f5-card" style={{ padding: 0 }}>
            <table className="f5-table">
              <thead><tr><th>Display</th><th>Content</th><th>Resolution</th><th>Last heartbeat</th><th>Uptime (24h)</th><th>Status</th></tr></thead>
              <tbody>
                {filtered.map((d) => { const t = telemetry(d); return (
                  <tr key={d.id}>
                    <td style={{ color: "var(--f5-text)" }}>{d.name}</td>
                    <td>{t.content}</td>
                    <td>{t.res}</td>
                    <td>{t.heartbeat}</td>
                    <td>{t.uptime}</td>
                    <td><span className={STATUS_BADGE[d.status]}>{STATUS_LABEL[d.status]}</span></td>
                  </tr>
                ); })}
              </tbody>
            </table>
          </div>
          <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 10 }}>Heartbeat &amp; play data shown for demonstration; live player agents report these per playback.</div>
        </>
      )}

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }} onClick={() => setEditing(null)}>
          <div className="f5-card" style={{ width: 520, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="f5-section-title" style={{ margin: 0 }}>{editing.id ? "Edit Display" : "New Display"}</div>

            <label className="f5-label">Name <span style={{ color: "var(--f5-red)" }}>*</span></label>
            <input className="f5-input" value={editing.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Lobby Display 1" />

            <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
              <div>
                <label className="f5-label">Property</label>
                <select className="f5-select" value={editing.propertyId ?? ""} onChange={(e) => set({ propertyId: e.target.value || null })}>
                  <option value="">— Unassigned —</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="f5-label">Location</label>
                <input className="f5-input" value={editing.location} onChange={(e) => set({ location: e.target.value })} placeholder="e.g. Main Lobby" />
              </div>
            </div>

            <label className="f5-label">Status</label>
            <select className="f5-select" value={editing.status} onChange={(e) => set({ status: e.target.value as DisplayInput["status"] })}>
              <option value="online">Online</option>
              <option value="warning">Warning</option>
              <option value="offline">Offline</option>
            </select>

            {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="f5-btn primary" disabled={pending} onClick={save}>{pending ? "Saving…" : editing.id ? "Save Changes" : "Add Display"}</button>
              <button className="f5-btn" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
