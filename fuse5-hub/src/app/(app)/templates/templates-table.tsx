"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { TemplateRow } from "@/lib/queries";
import { saveTemplate, deleteTemplate, type TemplateInput } from "./actions";
import { FilterBar } from "@/components/filters/FilterBar";
import { SortHeader } from "@/components/filters/SortHeader";
import type { FilterField, FilterOption } from "@/components/filters/types";
import { useFilterState, applyFilters } from "@/lib/filters";
import { useSortState, applySort } from "@/lib/sort";
import { TemplatePreview } from "./template-preview";
import { renderTemplateHtml } from "@/lib/template-html";

const channelLabel: Record<string, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp", voice: "Voice", display: "Display" };
const CHANNELS = ["email", "sms", "display", "whatsapp", "voice"];
const CHANNEL_OPTIONS: FilterOption[] = CHANNELS.map((c) => ({ value: c, label: channelLabel[c] ?? c }));
const TYPE_OPTIONS: FilterOption[] = [{ value: "master", label: "Master" }, { value: "org", label: "Org" }];
const uniqueSorted = (xs: (string | null | undefined)[]): string[] =>
  [...new Set(xs.filter((x): x is string => !!x && x !== "—"))].sort((a, b) => a.localeCompare(b));
const blank = (): TemplateInput => ({ name: "", category: "General", channels: ["email"], version: "1.0", body: "" });

export function TemplatesTable({ templates, canEdit }: { templates: TemplateRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<TemplateInput | null>(null);
  const [previewing, setPreviewing] = useState<TemplateRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Facets derived from the real template set.
  const categoryOptions = useMemo<FilterOption[]>(
    () => uniqueSorted(templates.map((t) => t.category)).map((c) => ({ value: c, label: c })),
    [templates],
  );

  const FIELDS = useMemo<FilterField[]>(
    () => [
      { key: "q", label: "Search", kind: "search", placeholder: "Search name, category, channel, body…" },
      { key: "category", label: "Category", kind: "multiselect", options: categoryOptions },
      { key: "channel", label: "Channel", kind: "multiselect", options: CHANNEL_OPTIONS },
      { key: "type", label: "Type", kind: "segmented", options: TYPE_OPTIONS, allLabel: "All" },
    ],
    [categoryOptions],
  );

  const { value, setValue } = useFilterState({ fields: FIELDS, urlSync: true });
  const { sort, toggle } = useSortState({ urlSync: true });

  const filtered = useMemo(() => {
    const matched = applyFilters(templates, value, {
      q: (t) => `${t.name} ${t.category} ${t.channels.map((c) => channelLabel[c] ?? c).join(" ")} ${t.body}`,
      category: (t) => t.category,
      channel: (t) => t.channels,
      type: (t) => (t.mandatory ? "master" : "org"),
    });
    return applySort(matched, sort, {
      name: (t) => t.name,
      category: (t) => t.category,
      version: (t) => t.version,
      type: (t) => (t.mandatory ? "Master" : "Org"),
    });
  }, [templates, value, sort]);

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

      <FilterBar
        fields={FIELDS}
        value={value}
        onChange={setValue}
        resultCount={filtered.length}
        resultLabel="templates"
      />

      <div className="f5-card" style={{ padding: 0, overflow: "hidden", marginTop: 14 }}>
        <table className="f5-table">
          <thead>
            <tr><SortHeader sortKey="name" sort={sort} onSort={toggle}>Name</SortHeader><SortHeader sortKey="category" sort={sort} onSort={toggle}>Category</SortHeader><th>Channels</th><SortHeader sortKey="version" sort={sort} onSort={toggle}>Version</SortHeader><SortHeader sortKey="type" sort={sort} onSort={toggle}>Type</SortHeader>{canEdit && <th style={{ textAlign: "right" }}>Actions</th>}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={canEdit ? 6 : 5} style={{ color: "var(--f5-text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>No templates match.</td></tr>}
            {filtered.map((t) => (
              <tr key={t.id}>
                <td>
                  <button type="button" onClick={() => setPreviewing(t)} title="Preview the HTML email" style={{ background: "none", border: "none", padding: 0, color: "var(--f5-teal,#00CCCC)", fontWeight: 600, cursor: "pointer", textAlign: "left" }}>{t.name}</button>
                </td>
                <td>{t.category}</td>
                <td>{t.channels.map((c) => channelLabel[c] ?? c).join(", ")}</td>
                <td>{t.version}</td>
                <td>{t.mandatory ? <span className="f5-badge warn">Master</span> : <span style={{ color: "var(--f5-text-dim)" }}>Org</span>}</td>
                {canEdit && (
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => setPreviewing(t)}>👁 Preview</button>
                    {!t.mandatory && <>
                      <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6 }} onClick={() => openEdit(t)}>Edit</button>
                      <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6, color: "var(--f5-red)" }} onClick={() => remove(t)} disabled={pending}>Delete</button>
                    </>}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {previewing && (
        <TemplatePreview
          name={previewing.name}
          category={previewing.category}
          html={renderTemplateHtml({ name: previewing.name, category: previewing.category, body: previewing.body })}
          badge={previewing.mandatory ? "Master" : undefined}
          onClose={() => setPreviewing(null)}
        />
      )}

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }} onClick={() => setEditing(null)}>
          <div className="f5-card" style={{ width: 940, maxWidth: "96vw", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 20 }} onClick={(e) => e.stopPropagation()}>
           <div style={{ minWidth: 0 }}>
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

           {/* Live HTML preview — updates as you type */}
           <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
             <div className="f5-label" style={{ marginTop: 0 }}>Live preview</div>
             <iframe
               title="Live template preview"
               srcDoc={renderTemplateHtml({ name: editing.name || "Template name", category: editing.category, body: editing.body })}
               style={{ flex: 1, minHeight: 420, width: "100%", border: "1px solid var(--f5-border)", borderRadius: 10, background: "#f1f5f9" }}
             />
             <div style={{ fontSize: 11, color: "var(--f5-text-muted)", marginTop: 6 }}>Merge fields like <code>{"{{property}}"}</code> preview with sample data.</div>
           </div>
          </div>
        </div>
      )}
    </>
  );
}
