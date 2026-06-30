"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ContactRow } from "@/lib/queries";
import { saveContact, deleteContact, type ContactInput } from "./actions";
import { FilterBar } from "@/components/filters/FilterBar";
import { SortHeader } from "@/components/filters/SortHeader";
import type { FilterField, FilterOption } from "@/components/filters/types";
import { useFilterState, applyFilters } from "@/lib/filters";
import { useSortState, applySort } from "@/lib/sort";

const uniqueSorted = (xs: (string | null | undefined)[]): string[] =>
  [...new Set(xs.filter((x): x is string => !!x && x !== "—"))].sort((a, b) => a.localeCompare(b));

const blank = (): ContactInput => ({ name: "", role: "", email: "", phone: "", property: "" });

export function ContactsTable({ contacts, canEdit }: { contacts: ContactRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ContactInput | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Facets derived from the real directory.
  const roleOptions = useMemo<FilterOption[]>(
    () => uniqueSorted(contacts.map((c) => c.role)).map((r) => ({ value: r, label: r })),
    [contacts],
  );
  const propertyOptions = useMemo<FilterOption[]>(
    () => uniqueSorted(contacts.map((c) => c.property)).map((p) => ({ value: p, label: p })),
    [contacts],
  );

  const FIELDS = useMemo<FilterField[]>(
    () => [
      { key: "q", label: "Search", kind: "search", placeholder: "Search name, role, email, phone, property…" },
      { key: "role", label: "Role", kind: "multiselect", options: roleOptions },
      { key: "property", label: "Property", kind: "multiselect", options: propertyOptions },
    ],
    [roleOptions, propertyOptions],
  );

  const { value, setValue } = useFilterState({ fields: FIELDS, urlSync: true });
  const { sort, toggle } = useSortState({ urlSync: true });

  const filtered = useMemo(() => {
    const matched = applyFilters(contacts, value, {
      q: (c) => `${c.name} ${c.role} ${c.email} ${c.phone} ${c.property}`,
      role: (c) => c.role,
      property: (c) => c.property,
    });
    return applySort(matched, sort, {
      name: (c) => c.name,
      role: (c) => c.role,
      email: (c) => c.email,
      phone: (c) => c.phone,
      property: (c) => c.property,
    });
  }, [contacts, value, sort]);

  const clean = (v: string) => (v === "—" ? "" : v);
  function openAdd() { setError(null); setEditing(blank()); }
  function openEdit(c: ContactRow) {
    setError(null);
    setEditing({ id: c.id, name: c.name, role: clean(c.role), email: clean(c.email), phone: clean(c.phone), property: clean(c.property) });
  }
  function save() {
    if (!editing) return;
    if (!editing.name.trim()) { setError("Name is required."); return; }
    startTransition(async () => {
      const r = await saveContact(editing);
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setEditing(null); router.refresh();
    });
  }
  function remove(c: ContactRow) {
    if (!confirm(`Remove ${c.name}? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteContact(c.id);
      if (!res.ok) { setError(res.error ?? "Could not remove."); return; }
      router.refresh();
    });
  }
  const set = (patch: Partial<ContactInput>) => setEditing((p) => (p ? { ...p, ...patch } : p));

  return (
    <>
      <div className="f5-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Directory</span>
        {canEdit && <button className="f5-btn primary" onClick={openAdd}>+ Add Contact</button>}
      </div>

      {error && !editing && <div style={{ color: "var(--f5-red)", fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <FilterBar
        fields={FIELDS}
        value={value}
        onChange={setValue}
        resultCount={filtered.length}
        resultLabel="contacts"
      />

      <div className="f5-card" style={{ padding: 0, overflow: "hidden", marginTop: 14 }}>
        <table className="f5-table">
          <thead>
            <tr><SortHeader sortKey="name" sort={sort} onSort={toggle}>Name</SortHeader><SortHeader sortKey="role" sort={sort} onSort={toggle}>Role</SortHeader><SortHeader sortKey="email" sort={sort} onSort={toggle}>Email</SortHeader><SortHeader sortKey="phone" sort={sort} onSort={toggle}>Phone</SortHeader><SortHeader sortKey="property" sort={sort} onSort={toggle}>Property</SortHeader>{canEdit && <th style={{ textAlign: "right" }}>Actions</th>}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={canEdit ? 6 : 5} style={{ color: "var(--f5-text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>No contacts match.</td></tr>}
            {filtered.map((c) => (
              <tr key={c.id}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{c.name}</td>
                <td>{c.role}</td>
                <td>{c.email}</td>
                <td>{c.phone}</td>
                <td>{c.property}</td>
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
          <div className="f5-card" style={{ width: 540, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="f5-section-title" style={{ margin: 0 }}>{editing.id ? "Edit Contact" : "New Contact"}</div>

            <label className="f5-label">Name <span style={{ color: "var(--f5-red)" }}>*</span></label>
            <input className="f5-input" value={editing.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Tom Bradley" />

            <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
              <div>
                <label className="f5-label">Role</label>
                <input className="f5-input" value={editing.role} onChange={(e) => set({ role: e.target.value })} placeholder="e.g. Property Manager" />
              </div>
              <div>
                <label className="f5-label">Property</label>
                <input className="f5-input" value={editing.property} onChange={(e) => set({ property: e.target.value })} placeholder="e.g. Danforth / All" />
              </div>
            </div>

            <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
              <div>
                <label className="f5-label">Email</label>
                <input className="f5-input" type="email" value={editing.email} onChange={(e) => set({ email: e.target.value })} placeholder="contact@org.org" />
              </div>
              <div>
                <label className="f5-label">Phone</label>
                <input className="f5-input" value={editing.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="416-555-0000" />
              </div>
            </div>

            {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="f5-btn primary" disabled={pending} onClick={save}>{pending ? "Saving…" : editing.id ? "Save Changes" : "Add Contact"}</button>
              <button className="f5-btn" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
