"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PropertyFull } from "@/lib/queries";
import { FilterBar } from "@/components/filters/FilterBar";
import { SortHeader } from "@/components/filters/SortHeader";
import type { FilterField, FilterOption } from "@/components/filters/types";
import { useFilterState, applyFilters } from "@/lib/filters";
import { useSortState, applySort } from "@/lib/sort";
import { saveProperty, deleteProperty, type PropertyInput } from "./actions";

const TYPES = ["residential", "mixed-use", "senior", "supportive", "commercial"];

const blank = (): PropertyInput => ({ name: "", address: "", type: "residential", units: 0, managerName: "", managerEmail: "", managerPhone: "" });

// Occupancy band derived from occupied/units — used as a portfolio-health facet.
type OccBand = "vacant" | "low" | "healthy" | "full";
function occBand(p: PropertyFull): OccBand {
  if (!p.units || p.occupied <= 0) return "vacant";
  const pct = p.occupied / p.units;
  if (pct >= 0.95) return "full";
  if (pct >= 0.5) return "healthy";
  return "low";
}
const OCC_OPTIONS: FilterOption[] = [
  { value: "vacant", label: "Vacant" },
  { value: "low", label: "Under 50%" },
  { value: "healthy", label: "50–94%" },
  { value: "full", label: "95%+" },
];

const uniqueSorted = (xs: string[]): string[] => [...new Set(xs.filter((x) => x && x !== "—"))].sort((a, b) => a.localeCompare(b));
const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function PropertiesTable({ properties, canEdit }: { properties: PropertyFull[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<PropertyInput | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Type facet derived from real portfolio data.
  const typeOptions = useMemo<FilterOption[]>(
    () => uniqueSorted(properties.map((p) => p.type)).map((t) => ({ value: t, label: cap(t) })),
    [properties],
  );

  const FIELDS = useMemo<FilterField[]>(
    () => [
      { key: "q", label: "Search", kind: "search", placeholder: "Search name, address, type, manager…" },
      { key: "type", label: "Type", kind: "multiselect", options: typeOptions },
      { key: "occupancy", label: "Occupancy", kind: "segmented", options: OCC_OPTIONS, allLabel: "All" },
    ],
    [typeOptions],
  );

  const { value, setValue } = useFilterState({ fields: FIELDS, urlSync: true });
  const { sort, toggle } = useSortState({ urlSync: true });

  const filtered = useMemo(() => {
    const matched = applyFilters(properties, value, {
      q: (p) => `${p.name} ${p.address} ${p.type} ${p.managerName} ${p.managerEmail}`,
      type: (p) => p.type,
      occupancy: (p) => occBand(p),
    });
    return applySort(matched, sort, {
      name: (p) => p.name,
      type: (p) => p.type,
      occupancy: (p) => (p.units ? p.occupied / p.units : 0),
      manager: (p) => p.managerName,
    });
  }, [properties, value, sort]);

  function openAdd() { setError(null); setEditing(blank()); }
  function openEdit(p: PropertyFull) {
    setError(null);
    setEditing({ id: p.id, name: p.name, address: p.address === "—" ? "" : p.address, type: p.type, units: p.units, managerName: p.managerName === "—" ? "" : p.managerName, managerEmail: p.managerEmail, managerPhone: p.managerPhone });
  }
  function save() {
    if (!editing) return;
    if (!editing.name.trim()) { setError("Property name is required."); return; }
    startTransition(async () => {
      const r = await saveProperty(editing);
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setEditing(null); router.refresh();
    });
  }
  function remove(p: PropertyFull) {
    if (!confirm(`Remove ${p.name}? Residents will be unassigned. This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteProperty(p.id);
      if (!res.ok) { setError(res.error ?? "Could not remove."); return; }
      router.refresh();
    });
  }
  const set = (patch: Partial<PropertyInput>) => setEditing((p) => (p ? { ...p, ...patch } : p));

  return (
    <>
      <div className="f5-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Portfolio</span>
        {canEdit && <button className="f5-btn primary" onClick={openAdd}>+ Add Property</button>}
      </div>

      {error && !editing && <div style={{ color: "var(--f5-red)", fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <FilterBar
        fields={FIELDS}
        value={value}
        onChange={setValue}
        resultCount={filtered.length}
        resultLabel="properties"
      />

      <div className="f5-card" style={{ padding: 0, marginTop: 14 }}>
        <table className="f5-table">
          <thead>
            <tr>
              <SortHeader sortKey="name" sort={sort} onSort={toggle}>Property</SortHeader>
              <SortHeader sortKey="type" sort={sort} onSort={toggle}>Type</SortHeader>
              <SortHeader sortKey="occupancy" sort={sort} onSort={toggle}>Occupancy</SortHeader>
              <SortHeader sortKey="manager" sort={sort} onSort={toggle}>Manager</SortHeader>
              {canEdit && <th style={{ textAlign: "right" }}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={canEdit ? 5 : 4} style={{ color: "var(--f5-text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>No properties match.</td></tr>}
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <div style={{ color: "var(--f5-text)", fontWeight: 600 }}>{p.name}</div>
                  <div style={{ color: "var(--f5-text-muted)", fontSize: 12 }}>{p.address}</div>
                </td>
                <td style={{ textTransform: "capitalize" }}>{p.type}</td>
                <td>{p.occupied} / {p.units}</td>
                <td>
                  <div style={{ color: "var(--f5-text)" }}>{p.managerName}</div>
                  <div style={{ color: "var(--f5-text-muted)", fontSize: 12 }}>{p.managerEmail}{p.managerPhone ? ` · ${p.managerPhone}` : ""}</div>
                </td>
                {canEdit && (
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => openEdit(p)}>Edit</button>
                    <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6, color: "var(--f5-red)" }} onClick={() => remove(p)} disabled={pending}>Delete</button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }} onClick={() => setEditing(null)}>
          <div className="f5-card" style={{ width: 560, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="f5-section-title" style={{ margin: 0 }}>{editing.id ? "Edit Property" : "New Property"}</div>

            <label className="f5-label">Name <span style={{ color: "var(--f5-red)" }}>*</span></label>
            <input className="f5-input" value={editing.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. WoodGreen — Danforth" />

            <label className="f5-label">Address</label>
            <input className="f5-input" value={editing.address} onChange={(e) => set({ address: e.target.value })} placeholder="e.g. 1004 Danforth Ave" />

            <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
              <div>
                <label className="f5-label">Type</label>
                <select className="f5-select" value={editing.type} onChange={(e) => set({ type: e.target.value })}>
                  {TYPES.map((t) => <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="f5-label">Units</label>
                <input className="f5-input" type="number" min={0} value={editing.units || ""} onChange={(e) => set({ units: parseInt(e.target.value, 10) || 0 })} placeholder="0" />
              </div>
            </div>

            <div className="f5-section-title">Property Manager</div>
            <label className="f5-label">Name</label>
            <input className="f5-input" value={editing.managerName} onChange={(e) => set({ managerName: e.target.value })} placeholder="e.g. Tom Bradley" />
            <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
              <div>
                <label className="f5-label">Email</label>
                <input className="f5-input" type="email" value={editing.managerEmail} onChange={(e) => set({ managerEmail: e.target.value })} placeholder="manager@org.org" />
              </div>
              <div>
                <label className="f5-label">Phone</label>
                <input className="f5-input" value={editing.managerPhone} onChange={(e) => set({ managerPhone: e.target.value })} placeholder="416-555-0000" />
              </div>
            </div>

            {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="f5-btn primary" disabled={pending} onClick={save}>{pending ? "Saving…" : editing.id ? "Save Changes" : "Add Property"}</button>
              <button className="f5-btn" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
