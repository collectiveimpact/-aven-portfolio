"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ContentRow } from "@/lib/queries";
import { saveContent, deleteContent, type ContentInput } from "./actions";

const TYPES: { k: ContentInput["type"]; l: string }[] = [
  { k: "image", l: "Image" },
  { k: "video", l: "Video" },
  { k: "notice", l: "Notice" },
  { k: "playlist", l: "Playlist" },
];
const TYPE_LABEL: Record<ContentRow["type"], string> = { image: "Image", video: "Video", notice: "Notice", playlist: "Playlist" };
const TYPE_BADGE: Record<ContentRow["type"], string> = { image: "f5-badge", video: "f5-badge", notice: "f5-badge warn", playlist: "f5-badge ok" };

function duration(s: number | null): string {
  if (s === null) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

const blank: ContentInput = { title: "", type: "notice", durationS: 15 };

export function ContentTable({ items, canEdit }: { items: ContentRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ContentInput | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | ContentRow["type"]>("all");

  const needle = q.trim().toLowerCase();
  const filtered = items.filter((c) => {
    if (typeFilter !== "all" && c.type !== typeFilter) return false;
    if (!needle) return true;
    return c.title.toLowerCase().includes(needle);
  });

  function openAdd() { setError(null); setEditing({ ...blank }); }
  function openEdit(c: ContentRow) { setError(null); setEditing({ id: c.id, title: c.title, type: c.type, durationS: c.durationS }); }
  function save() {
    if (!editing) return;
    if (!editing.title.trim()) { setError("Title is required."); return; }
    startTransition(async () => {
      const r = await saveContent(editing);
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setEditing(null); router.refresh();
    });
  }
  function remove(c: ContentRow) {
    if (!confirm(`Remove "${c.title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteContent(c.id);
      if (!res.ok) { setError(res.error ?? "Could not remove."); return; }
      router.refresh();
    });
  }
  const set = (patch: Partial<ContentInput>) => setEditing((p) => (p ? { ...p, ...patch } : p));

  return (
    <>
      <div className="f5-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Library</span>
        {canEdit && <button className="f5-btn primary" onClick={openAdd}>+ Add Asset</button>}
      </div>

      {error && !editing && <div style={{ color: "var(--f5-red)", fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <input className="f5-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search assets…" style={{ maxWidth: 320 }} />
        <div className="f5-chips" style={{ margin: 0 }}>
          {(["all", "notice", "image", "video", "playlist"] as const).map((t) => (
            <span key={t} className={`f5-chip${typeFilter === t ? " active" : ""}`} onClick={() => setTypeFilter(t)}>{t === "all" ? "All" : TYPE_LABEL[t]}</span>
          ))}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--f5-text-muted)" }}>{filtered.length} of {items.length}</span>
      </div>

      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead>
            <tr><th>Title</th><th>Type</th><th>Duration</th><th>Updated</th>{canEdit && <th style={{ textAlign: "right" }}>Actions</th>}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={canEdit ? 5 : 4} style={{ color: "var(--f5-text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>No assets match.</td></tr>}
            {filtered.map((c) => (
              <tr key={c.id}>
                <td style={{ color: "var(--f5-text)" }}>{c.title}</td>
                <td><span className={TYPE_BADGE[c.type]}>{TYPE_LABEL[c.type]}</span></td>
                <td>{duration(c.durationS)}</td>
                <td>{c.updatedAt}</td>
                {canEdit && (
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => openEdit(c)}>Edit</button>
                    <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6, color: "var(--f5-red)" }} onClick={() => remove(c)} disabled={pending}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }} onClick={() => setEditing(null)}>
          <div className="f5-card" style={{ width: 520, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="f5-section-title" style={{ margin: 0 }}>{editing.id ? "Edit Asset" : "New Asset"}</div>

            <label className="f5-label">Title <span style={{ color: "var(--f5-red)" }}>*</span></label>
            <input className="f5-input" value={editing.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Fire Safety Notice" />

            <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
              <div>
                <label className="f5-label">Type</label>
                <select className="f5-select" value={editing.type} onChange={(e) => set({ type: e.target.value as ContentInput["type"] })}>
                  {TYPES.map((t) => <option key={t.k} value={t.k}>{t.l}</option>)}
                </select>
              </div>
              <div>
                <label className="f5-label">Duration (seconds)</label>
                <input className="f5-input" type="number" min={0} value={editing.durationS ?? ""} onChange={(e) => set({ durationS: e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0) })} placeholder="e.g. 15" />
              </div>
            </div>

            {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="f5-btn primary" disabled={pending} onClick={save}>{pending ? "Saving…" : editing.id ? "Save Changes" : "Add Asset"}</button>
              <button className="f5-btn" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
