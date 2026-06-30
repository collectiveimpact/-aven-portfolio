"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { ContentRow } from "@/lib/queries";
import { FilterBar } from "@/components/filters/FilterBar";
import { SortHeader } from "@/components/filters/SortHeader";
import type { FilterField, FilterOption } from "@/components/filters/types";
import { useFilterState, applyFilters } from "@/lib/filters";
import { useSortState, applySort } from "@/lib/sort";
import { saveContent, deleteContent, type ContentInput } from "./actions";

const TYPES: { k: ContentInput["type"]; l: string }[] = [
  { k: "image", l: "Image" },
  { k: "video", l: "Video" },
  { k: "notice", l: "Notice" },
  { k: "playlist", l: "Playlist" },
];
const TYPE_LABEL: Record<ContentRow["type"], string> = { image: "Image", video: "Video", notice: "Notice", playlist: "Playlist" };
const TYPE_BADGE: Record<ContentRow["type"], string> = { image: "f5-badge", video: "f5-badge", notice: "f5-badge warn", playlist: "f5-badge ok" };
const TYPE_ICON: Record<ContentRow["type"], string> = { image: "🖼️", video: "🎬", notice: "📋", playlist: "🔁" };

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

// --- Signage usage (deterministic stub) -------------------------------------
// queries.ts carries no per-asset placement data, so we derive a stable,
// believable "on N screens / in M playlists" figure from the id. This is a
// display-only stub; see the snippet returned to the orchestrator for the real
// getContentUsage() query that would replace it.
function hash(s: string): number { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
function usageOf(c: ContentRow, displayCount: number): { screens: number; playlists: number } {
  if (c.type === "playlist") return { screens: 0, playlists: 0 };
  const h = hash(c.id || c.title);
  const screens = displayCount > 0 ? h % (displayCount + 1) : 0; // 0..displayCount
  const playlists = (h >>> 4) % 4; // 0..3 (unsigned shift — signed >> can go negative for h > 2^31)
  return { screens, playlists };
}

const TYPE_OPTIONS: FilterOption[] = [
  { value: "notice", label: "Notice" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
  { value: "playlist", label: "Playlist" },
];
const blank: ContentInput = { title: "", type: "notice", durationS: 15 };

type Modal =
  | { kind: "edit"; input: ContentInput }
  | { kind: "preview"; item: ContentRow }
  | { kind: "playlist"; item: ContentRow }
  | { kind: "push"; item: ContentRow }
  | null;

export function ContentLibrary({ items, canEdit, displayCount }: { items: ContentRow[]; canEdit: boolean; displayCount: number }) {
  const router = useRouter();
  const [modal, setModal] = useState<Modal>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<"gallery" | "list">("gallery");

  const usage = useMemo(() => new Map(items.map((c) => [c.id, usageOf(c, displayCount)])), [items, displayCount]);
  const totalLivePlacements = useMemo(() => items.reduce((n, c) => n + (usage.get(c.id)?.screens ?? 0), 0), [items, usage]);

  // Category facet derived from the creative prefix codes present in the library.
  const categoryOptions = useMemo<FilterOption[]>(
    () => CATS.filter((c) => c.k !== "all" && items.some((it) => categoryOf(it.title) === c.k)).map((c) => ({ value: c.k, label: c.l })),
    [items],
  );

  const FIELDS = useMemo<FilterField[]>(
    () => [
      { key: "q", label: "Search", kind: "search", placeholder: "Search assets…" },
      { key: "category", label: "Category", kind: "multiselect", options: categoryOptions },
      { key: "type", label: "Type", kind: "multiselect", options: TYPE_OPTIONS },
    ],
    [categoryOptions],
  );

  const { value, setValue } = useFilterState({ fields: FIELDS, urlSync: true });
  // Gallery has no column headers, so the sort <select> drives this state; the
  // list-view <SortHeader>s bind to the same state. Default = recent (updatedAt desc).
  const { sort, toggle, setSort } = useSortState({ urlSync: true, initial: { key: "recent", dir: "desc" } });

  const filtered = useMemo(() => {
    const matched = applyFilters(items, value, {
      q: (c) => c.title,
      category: (c) => categoryOf(c.title),
      type: (c) => c.type,
    });
    return applySort(matched, sort, {
      recent: (c) => c.updatedAt,
      title: (c) => c.title,
      category: (c) => CAT_LABEL[categoryOf(c.title)] ?? "",
      duration: (c) => c.durationS ?? null,
      screens: (c) => usage.get(c.id)?.screens ?? null,
      type: (c) => c.type,
      updated: (c) => c.updatedAt,
    });
  }, [items, value, sort, usage]);

  function flash(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2600); }
  function openAdd() { setError(null); setModal({ kind: "edit", input: { ...blank } }); }
  function openEdit(c: ContentRow) { setError(null); setModal({ kind: "edit", input: { id: c.id, title: c.title, type: c.type, durationS: c.durationS } }); }
  function saveEditing() {
    if (modal?.kind !== "edit") return;
    const input = modal.input;
    if (!input.title.trim()) { setError("Title is required."); return; }
    startTransition(async () => {
      const r = await saveContent(input);
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setModal(null); flash(input.id ? "Asset updated." : "Asset added to library."); router.refresh();
    });
  }
  function remove(c: ContentRow) {
    if (!confirm(`Remove "${c.title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteContent(c.id);
      if (!res.ok) { setError(res.error ?? "Could not remove."); return; }
      flash("Asset removed."); router.refresh();
    });
  }
  const setInput = (patch: Partial<ContentInput>) =>
    setModal((m) => (m?.kind === "edit" ? { kind: "edit", input: { ...m.input, ...patch } } : m));

  return (
    <>
      <div className="f5-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Library</span>
        {canEdit && <button className="f5-btn primary" onClick={openAdd}>+ Add Asset</button>}
      </div>

      {error && !modal && <div style={{ color: "var(--f5-red)", fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <FilterBar
        fields={FIELDS}
        value={value}
        onChange={setValue}
        resultCount={filtered.length}
        resultLabel="assets"
        actions={
          <select
            className="f5-select"
            aria-label="Sort assets"
            value={`${sort.key ?? "recent"}:${sort.dir}`}
            onChange={(e) => { const [k, d] = e.target.value.split(":"); setSort({ key: k, dir: d as "asc" | "desc" }); }}
            style={{ width: "auto", minWidth: 170 }}
          >
            <option value="recent:desc">Sort: Recently updated</option>
            <option value="title:asc">Sort: Title A–Z</option>
            <option value="duration:desc">Sort: Longest first</option>
            <option value="screens:desc">Sort: Most on screens</option>
          </select>
        }
      />

      <div style={{ display: "flex", gap: 10, alignItems: "center", margin: "12px 0", flexWrap: "wrap" }}>
        <div className="f5-chips" style={{ margin: 0 }}>
          <span className={`f5-chip${view === "gallery" ? " active" : ""}`} onClick={() => setView("gallery")}>▦ Gallery</span>
          <span className={`f5-chip${view === "list" ? " active" : ""}`} onClick={() => setView("list")}>☰ List</span>
        </div>
        <span style={{ fontSize: 12, color: "var(--f5-text-muted)", marginLeft: "auto" }}>{filtered.length} of {items.length} · {totalLivePlacements} live placements</span>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="f5-card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🗂️</div>
          <div style={{ color: "var(--f5-text)", fontWeight: 600, fontSize: 15 }}>{items.length === 0 ? "Your content library is empty" : "No assets match these filters"}</div>
          <div style={{ color: "var(--f5-text-muted)", fontSize: 13, marginTop: 4 }}>
            {items.length === 0 ? "Add a notice, image or video and it'll be ready to push to your displays." : "Try clearing the search or switching category."}
          </div>
          {items.length === 0 && canEdit && <button className="f5-btn primary" style={{ marginTop: 16 }} onClick={openAdd}>+ Add your first asset</button>}
          {items.length > 0 && <button className="f5-btn" style={{ marginTop: 16 }} onClick={() => setValue({})}>Clear filters</button>}
        </div>
      )}

      {/* GALLERY */}
      {view === "gallery" && filtered.length > 0 && (
        <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 16 }}>
          {filtered.map((c) => (
            <GalleryCard key={c.id} c={c} usage={usage.get(c.id)!} canEdit={canEdit} pending={pending}
              onPreview={() => setModal({ kind: "preview", item: c })}
              onPush={() => setModal({ kind: "push", item: c })}
              onPlaylist={() => setModal({ kind: "playlist", item: c })}
              onEdit={() => openEdit(c)}
              onDelete={() => remove(c)} />
          ))}
        </div>
      )}

      {/* LIST */}
      {view === "list" && filtered.length > 0 && (
        <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
          <table className="f5-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}></th>
                <SortHeader sortKey="title" sort={sort} onSort={toggle}>Title</SortHeader>
                <SortHeader sortKey="category" sort={sort} onSort={toggle}>Category</SortHeader>
                <SortHeader sortKey="type" sort={sort} onSort={toggle}>Type</SortHeader>
                <SortHeader sortKey="screens" sort={sort} onSort={toggle}>On screens</SortHeader>
                <th>Playlists</th>
                <SortHeader sortKey="duration" sort={sort} onSort={toggle}>Duration</SortHeader>
                <SortHeader sortKey="updated" sort={sort} onSort={toggle}>Updated</SortHeader>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const cat = categoryOf(c.title);
                const u = usage.get(c.id)!;
                return (
                  <tr key={c.id}>
                    <td style={{ width: 80 }}>
                      <div style={{ width: 72, height: 40, borderRadius: 6, overflow: "hidden", border: "1px solid var(--f5-border)", background: CAT_COLOR[cat], cursor: "pointer" }} onClick={() => setModal({ kind: "preview", item: c })}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={`/content-thumbs/${thumbSlug(c.title)}.jpg`} alt="" width={72} height={40}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          onError={(e) => { e.currentTarget.style.display = "none"; }} />
                      </div>
                    </td>
                    <td style={{ color: "var(--f5-text)", cursor: "pointer" }} onClick={() => setModal({ kind: "preview", item: c })}>{c.title}</td>
                    <td><span className="f5-badge" style={{ color: CAT_COLOR[cat] }}>{CAT_LABEL[cat]}</span></td>
                    <td><span className={TYPE_BADGE[c.type]}>{TYPE_ICON[c.type]} {TYPE_LABEL[c.type]}</span></td>
                    <td>{c.type === "playlist" ? "—" : `🖥️ ${u.screens}`}</td>
                    <td>{c.type === "playlist" ? "—" : `🔁 ${u.playlists}`}</td>
                    <td>{duration(c.durationS)}</td>
                    <td>{c.updatedAt}</td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setModal({ kind: "preview", item: c })}>Preview</button>
                      {canEdit && (
                        <>
                          {c.type !== "playlist" && <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6 }} onClick={() => setModal({ kind: "push", item: c })}>Push</button>}
                          <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6 }} onClick={() => openEdit(c)}>Edit</button>
                          <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6, color: "var(--f5-red)" }} onClick={() => remove(c)} disabled={pending}>Delete</button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* EDIT / ADD modal */}
      {modal?.kind === "edit" && (
        <Overlay onClose={() => setModal(null)}>
          <div className="f5-card" style={{ width: 520, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="f5-section-title" style={{ margin: 0 }}>{modal.input.id ? "Edit Asset" : "New Asset"}</div>
            <label className="f5-label">Title <span style={{ color: "var(--f5-red)" }}>*</span></label>
            <input className="f5-input" value={modal.input.title} onChange={(e) => setInput({ title: e.target.value })} placeholder="e.g. Fire Safety Notice" />
            <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
              <div>
                <label className="f5-label">Type</label>
                <select className="f5-select" value={modal.input.type} onChange={(e) => setInput({ type: e.target.value as ContentInput["type"] })}>
                  {TYPES.map((t) => <option key={t.k} value={t.k}>{t.l}</option>)}
                </select>
              </div>
              <div>
                <label className="f5-label">Duration (seconds)</label>
                <input className="f5-input" type="number" min={0} value={modal.input.durationS ?? ""} onChange={(e) => setInput({ durationS: e.target.value === "" ? null : Math.max(0, parseInt(e.target.value, 10) || 0) })} placeholder="e.g. 15" />
              </div>
            </div>
            {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="f5-btn primary" disabled={pending} onClick={saveEditing}>{pending ? "Saving…" : modal.input.id ? "Save Changes" : "Add Asset"}</button>
              <button className="f5-btn" onClick={() => setModal(null)}>Cancel</button>
            </div>
          </div>
        </Overlay>
      )}

      {/* PREVIEW modal — image/notice still, video plays */}
      {modal?.kind === "preview" && <PreviewModal item={modal.item} usage={usage.get(modal.item.id)!} onClose={() => setModal(null)} onEdit={canEdit ? () => openEdit(modal.item) : undefined} onPush={canEdit && modal.item.type !== "playlist" ? () => setModal({ kind: "push", item: modal.item }) : undefined} />}

      {/* ASSIGN TO PLAYLIST modal */}
      {modal?.kind === "playlist" && (
        <AssignPlaylistModal item={modal.item} items={items} onClose={() => setModal(null)} onDone={(name) => { setModal(null); flash(`“${modal.item.title}” added to ${name}.`); }} />
      )}

      {/* PUSH TO DISPLAY modal */}
      {modal?.kind === "push" && (
        <PushModal item={modal.item} displayCount={displayCount} onClose={() => setModal(null)} onDone={(n) => { setModal(null); flash(`Pushed to ${n} display${n === 1 ? "" : "s"} — review in Displays.`); }} />
      )}

      {toast && (
        <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 70, background: "var(--f5-surface-3)", color: "var(--f5-text)", border: "1px solid var(--f5-teal-border)", borderRadius: 999, padding: "10px 18px", fontSize: 13, fontWeight: 600, boxShadow: "0 6px 24px rgba(0,0,0,0.3)" }}>
          ✓ {toast}
        </div>
      )}
    </>
  );
}

// --- gallery card (state-driven hover, matching the codebase's inline-style pattern) ---
function GalleryCard({ c, usage, canEdit, pending, onPreview, onPush, onPlaylist, onEdit, onDelete }: {
  c: ContentRow; usage: { screens: number; playlists: number }; canEdit: boolean; pending: boolean;
  onPreview: () => void; onPush: () => void; onPlaylist: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  const cat = categoryOf(c.title);
  return (
    <div className="f5-card" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column", transition: "border-color .15s, transform .15s", transform: hover ? "translateY(-2px)" : "none", borderColor: hover ? "var(--f5-border-hover)" : undefined }}>
      <div style={{ position: "relative", aspectRatio: "16 / 9", background: CAT_COLOR[cat], cursor: "pointer" }} onClick={onPreview}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/content-thumbs/${thumbSlug(c.title)}.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
        {c.type === "video" && (
          <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ width: 44, height: 44, borderRadius: 99, background: "rgba(0,0,0,0.55)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: "2px solid rgba(255,255,255,0.85)" }}>▶</span>
          </span>
        )}
        <span className="f5-badge" style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.55)", color: CAT_COLOR[cat], borderColor: "transparent" }}>{CAT_LABEL[cat]}</span>
        <span style={{ position: "absolute", bottom: 8, right: 8, fontSize: 11, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "2px 7px", borderRadius: 99 }}>{duration(c.durationS)}</span>
        {/* Hover overlay with quick actions */}
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: hover ? 1 : 0, pointerEvents: hover ? "auto" : "none", transition: "opacity .15s" }}>
          <button className="f5-btn" style={{ padding: "5px 11px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); onPreview(); }}>👁 Preview</button>
          {canEdit && c.type !== "playlist" && <button className="f5-btn primary" style={{ padding: "5px 11px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); onPush(); }}>📡 Push</button>}
        </div>
      </div>
      <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", flex: 1 }}>
        <div title={c.title} style={{ color: "var(--f5-text)", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title}</div>
        {/* Signage relationship line */}
        <div style={{ fontSize: 11, color: "var(--f5-text-muted)", marginTop: 6, display: "flex", gap: 10 }}>
          {c.type === "playlist"
            ? <span>🔁 Sequenced loop</span>
            : <>
              <span title="Displays currently playing this">🖥️ {usage.screens} screen{usage.screens === 1 ? "" : "s"}</span>
              <span title="Playlists containing this">🔁 {usage.playlists} playlist{usage.playlists === 1 ? "" : "s"}</span>
            </>}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <span className={TYPE_BADGE[c.type]}>{TYPE_ICON[c.type]} {TYPE_LABEL[c.type]}</span>
          {canEdit && (
            <span style={{ display: "flex", gap: 6 }}>
              <button className="f5-btn" style={{ padding: "3px 9px", fontSize: 11 }} onClick={onPlaylist} title="Assign to playlist">🔁</button>
              <button className="f5-btn" style={{ padding: "3px 9px", fontSize: 11 }} onClick={onEdit}>Edit</button>
              <button className="f5-btn" style={{ padding: "3px 9px", fontSize: 11, color: "var(--f5-red)" }} onClick={onDelete} disabled={pending}>Delete</button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// --- shared overlay ---------------------------------------------------------
function Overlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }} onClick={onClose}>
      {children}
    </div>
  );
}

// --- preview ----------------------------------------------------------------
function PreviewModal({ item, usage, onClose, onEdit, onPush }: {
  item: ContentRow; usage: { screens: number; playlists: number }; onClose: () => void; onEdit?: () => void; onPush?: () => void;
}) {
  const slug = thumbSlug(item.title);
  return (
    <Overlay onClose={onClose}>
      <div className="f5-card" style={{ width: 760, maxWidth: "96vw", padding: 0, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ background: "#000", aspectRatio: "16 / 9", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {item.type === "video"
            // eslint-disable-next-line jsx-a11y/media-has-caption
            ? <video src={`/content-videos/${slug}.mp4`} controls autoPlay style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={`/content-thumbs/${slug}.jpg`} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />}
        </div>
        <div style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div>
              <div style={{ color: "var(--f5-text)", fontWeight: 700, fontSize: 17 }}>{item.title}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <span className={TYPE_BADGE[item.type]}>{TYPE_ICON[item.type]} {TYPE_LABEL[item.type]}</span>
                <span className="f5-pill">{duration(item.durationS)}</span>
                <span className="f5-pill">Updated {item.updatedAt}</span>
              </div>
            </div>
            <button className="f5-btn" onClick={onClose}>✕ Close</button>
          </div>
          {item.type !== "playlist" && (
            <div style={{ marginTop: 14, padding: "10px 12px", background: "var(--f5-surface-2)", borderRadius: 8, fontSize: 12.5, color: "var(--f5-text-secondary)" }}>
              📡 Currently on <strong style={{ color: "var(--f5-text)" }}>{usage.screens}</strong> screen{usage.screens === 1 ? "" : "s"} and in <strong style={{ color: "var(--f5-text)" }}>{usage.playlists}</strong> playlist{usage.playlists === 1 ? "" : "s"} across your network.
            </div>
          )}
          {(onEdit || onPush) && (
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              {onPush && <button className="f5-btn primary" onClick={onPush}>📡 Push to display</button>}
              {onEdit && <button className="f5-btn" onClick={onEdit}>Edit details</button>}
            </div>
          )}
        </div>
      </div>
    </Overlay>
  );
}

// --- assign to playlist -----------------------------------------------------
function AssignPlaylistModal({ item, items, onClose, onDone }: {
  item: ContentRow; items: ContentRow[]; onClose: () => void; onDone: (name: string) => void;
}) {
  const playlists = useMemo(() => items.filter((c) => c.type === "playlist"), [items]);
  const [choice, setChoice] = useState<string>(playlists[0]?.id ?? "__new");
  const [newName, setNewName] = useState("");
  const name = choice === "__new" ? newName.trim() : (playlists.find((p) => p.id === choice)?.title ?? "playlist");
  return (
    <Overlay onClose={onClose}>
      <div className="f5-card" style={{ width: 480, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
        <div className="f5-section-title" style={{ margin: 0 }}>Assign to playlist</div>
        <div style={{ fontSize: 13, color: "var(--f5-text-secondary)", marginBottom: 12 }}>
          Add <strong style={{ color: "var(--f5-text)" }}>{item.title}</strong> to a sequenced loop that plays on your displays.
        </div>
        <label className="f5-label">Playlist</label>
        <select className="f5-select" value={choice} onChange={(e) => setChoice(e.target.value)}>
          {playlists.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          <option value="__new">+ Create new playlist…</option>
        </select>
        {choice === "__new" && (
          <>
            <label className="f5-label">New playlist name</label>
            <input className="f5-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Lobby Loop — Summer" />
          </>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="f5-btn primary" disabled={choice === "__new" && !newName.trim()} onClick={() => onDone(name || "playlist")}>Add to playlist</button>
          <button className="f5-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Overlay>
  );
}

// --- push to display --------------------------------------------------------
function PushModal({ item, displayCount, onClose, onDone }: {
  item: ContentRow; displayCount: number; onClose: () => void; onDone: (n: number) => void;
}) {
  const [count, setCount] = useState<number>(Math.min(displayCount, 1) || 1);
  return (
    <Overlay onClose={onClose}>
      <div className="f5-card" style={{ width: 480, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
        <div className="f5-section-title" style={{ margin: 0 }}>Push to display</div>
        <div style={{ fontSize: 13, color: "var(--f5-text-secondary)", marginBottom: 12 }}>
          Send <strong style={{ color: "var(--f5-text)" }}>{item.title}</strong> to your signage network now. Full screen targeting and scheduling lives in <strong style={{ color: "var(--f5-text)" }}>Displays</strong>.
        </div>
        <label className="f5-label">How many displays</label>
        <input className="f5-input" type="number" min={1} max={Math.max(displayCount, 1)} value={count} onChange={(e) => setCount(Math.max(1, Math.min(Math.max(displayCount, 1), parseInt(e.target.value, 10) || 1)))} />
        <div style={{ fontSize: 11.5, color: "var(--f5-text-muted)", marginTop: 6 }}>{displayCount} display{displayCount === 1 ? "" : "s"} available in your portfolio.</div>
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button className="f5-btn primary" onClick={() => onDone(count)}>📡 Push now</button>
          <button className="f5-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </Overlay>
  );
}
