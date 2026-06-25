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

// Categories derived from the WoodGreen creative prefix codes (AL/MED/MR/OP/PR/WG).
const CATS: { k: string; l: string }[] = [
  { k: "all", l: "All" },
  { k: "MED", l: "Tenant Education" },
  { k: "MR", l: "Maintenance & Rules" },
  { k: "OP", l: "Operations & Waste" },
  { k: "EM", l: "Emergency & Safety" },
  { k: "LS", l: "Leasing & Move" },
  { k: "RC", l: "Rules & Conduct" },
  { k: "HW", l: "Health & Wellness" },
  { k: "AM", l: "Amenities" },
  { k: "AC", l: "Accessibility" },
  { k: "SO", l: "Seasonal & Ops" },
  { k: "AL", l: "Alerts" },
  { k: "PR", l: "Regulatory" },
  { k: "WG", l: "Videos" },
  { k: "OTHER", l: "Other" },
];
const CAT_LABEL: Record<string, string> = Object.fromEntries(CATS.map((c) => [c.k, c.l]));
const CAT_COLOR: Record<string, string> = {
  MED: "var(--f5-teal)", MR: "#f59e0b", OP: "#34d399", AL: "var(--f5-red,#f87171)", PR: "#a78bfa", WG: "#60a5fa",
  EM: "#ef4444", LS: "#14b8a6", RC: "#f59e0b", HW: "#ec4899", AM: "#60a5fa", AC: "#a78bfa", SO: "#34d399",
  OTHER: "var(--f5-text-muted)",
};
function categoryOf(title: string): string {
  const m = title.trim().match(/^([A-Z]{2,3})\s*\d/);
  if (m && CAT_LABEL[m[1]]) return m[1];
  if (/^wg/i.test(title.trim())) return "WG";
  return "OTHER";
}
// Matches the slug used when the thumbnails were extracted from the .nvc export.
function thumbSlug(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

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
  const [catFilter, setCatFilter] = useState<string>("all");
  const [view, setView] = useState<"gallery" | "list">("gallery");

  const catCount = (k: string) => items.filter((c) => categoryOf(c.title) === k).length;
  const needle = q.trim().toLowerCase();
  const filtered = items.filter((c) => {
    if (catFilter !== "all" && categoryOf(c.title) !== catFilter) return false;
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

      {/* Category filters (derived from the creative prefix codes) */}
      <div className="f5-chips" style={{ marginBottom: 10 }}>
        {CATS.map((cat) => {
          const n = cat.k === "all" ? items.length : catCount(cat.k);
          if (cat.k !== "all" && n === 0) return null;
          return (
            <span key={cat.k} className={`f5-chip${catFilter === cat.k ? " active" : ""}`} onClick={() => setCatFilter(cat.k)}
              style={catFilter === cat.k && cat.k !== "all" ? { borderColor: CAT_COLOR[cat.k], color: CAT_COLOR[cat.k] } : undefined}>
              {cat.k !== "all" && <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 99, background: CAT_COLOR[cat.k], marginRight: 6, verticalAlign: "middle" }} />}
              {cat.l} <span style={{ opacity: 0.6 }}>{n}</span>
            </span>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <input className="f5-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search assets…" style={{ maxWidth: 320 }} />
        <div className="f5-chips" style={{ margin: 0 }}>
          {(["all", "notice", "image", "video", "playlist"] as const).map((t) => (
            <span key={t} className={`f5-chip${typeFilter === t ? " active" : ""}`} onClick={() => setTypeFilter(t)}>{t === "all" ? "All" : TYPE_LABEL[t]}</span>
          ))}
        </div>
        <div className="f5-chips" style={{ margin: 0, marginLeft: "auto" }}>
          <span className={`f5-chip${view === "gallery" ? " active" : ""}`} onClick={() => setView("gallery")}>▦ Gallery</span>
          <span className={`f5-chip${view === "list" ? " active" : ""}`} onClick={() => setView("list")}>☰ List</span>
        </div>
        <span style={{ fontSize: 12, color: "var(--f5-text-muted)" }}>{filtered.length} of {items.length}</span>
      </div>

      {view === "gallery" && (
        <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(210px,1fr))", gap: 14 }}>
          {filtered.length === 0 && <div style={{ color: "var(--f5-text-muted)", fontSize: 13 }}>No assets match.</div>}
          {filtered.map((c) => { const cat = categoryOf(c.title); return (
            <div key={c.id} className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ position: "relative", aspectRatio: "16 / 9", background: CAT_COLOR[cat] }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/content-thumbs/${thumbSlug(c.title)}.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                <span className="f5-badge" style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.55)", color: CAT_COLOR[cat], borderColor: "transparent" }}>{CAT_LABEL[cat]}</span>
                <span style={{ position: "absolute", bottom: 8, right: 8, fontSize: 11, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "2px 7px", borderRadius: 99 }}>{duration(c.durationS)}</span>
              </div>
              <div style={{ padding: "10px 12px" }}>
                <div title={c.title} style={{ color: "var(--f5-text)", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <span className={TYPE_BADGE[c.type]}>{TYPE_LABEL[c.type]}</span>
                  {canEdit && (
                    <span style={{ display: "flex", gap: 6 }}>
                      <button className="f5-btn" style={{ padding: "3px 9px", fontSize: 11 }} onClick={() => openEdit(c)}>Edit</button>
                      <button className="f5-btn" style={{ padding: "3px 9px", fontSize: 11, color: "var(--f5-red)" }} onClick={() => remove(c)} disabled={pending}>Delete</button>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ); })}
        </div>
      )}

      {view === "list" && (
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead>
            <tr><th style={{ width: 80 }}></th><th>Title</th><th>Category</th><th>Type</th><th>Duration</th><th>Updated</th>{canEdit && <th style={{ textAlign: "right" }}>Actions</th>}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={canEdit ? 7 : 6} style={{ color: "var(--f5-text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>No assets match.</td></tr>}
            {filtered.map((c) => { const cat = categoryOf(c.title); return (
              <tr key={c.id}>
                <td style={{ width: 80 }}>
                  <div style={{ width: 72, height: 40, borderRadius: 6, overflow: "hidden", border: "1px solid var(--f5-border)", background: CAT_COLOR[cat] }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/content-thumbs/${thumbSlug(c.title)}.jpg`} alt="" width={72} height={40}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  </div>
                </td>
                <td style={{ color: "var(--f5-text)" }}>{c.title}</td>
                <td><span className="f5-badge" style={{ color: CAT_COLOR[cat] }}>{CAT_LABEL[cat]}</span></td>
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
            ); })}
          </tbody>
        </table>
      </div>
      )}

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
