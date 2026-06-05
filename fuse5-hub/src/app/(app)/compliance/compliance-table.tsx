"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ComplianceRow, PropertyOption } from "@/lib/queries";
import { saveCompliance, deleteCompliance, type ComplianceInput } from "./actions";

const statusBadge: Record<ComplianceRow["status"], string> = { compliant: "ok", due_soon: "warn", overdue: "bad" };
const statusLabel: Record<ComplianceRow["status"], string> = { compliant: "Compliant", due_soon: "Due Soon", overdue: "Overdue" };
const blank = (propertyId: string | null): ComplianceInput => ({ propertyId, kind: "", due: "", status: "due_soon" });

export function ComplianceTable({ items, properties, canEdit }: { items: ComplianceRow[]; properties: PropertyOption[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ComplianceInput | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openAdd() { setError(null); setEditing(blank(properties[0]?.id ?? null)); }
  function openEdit(i: ComplianceRow) { setError(null); setEditing({ id: i.id, propertyId: i.propertyId, kind: i.kind, due: i.due === "—" ? "" : i.due, status: i.status }); }
  function save() {
    if (!editing) return;
    if (!editing.kind.trim()) { setError("Obligation kind is required."); return; }
    startTransition(async () => {
      const r = await saveCompliance(editing);
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setEditing(null); router.refresh();
    });
  }
  function remove(i: ComplianceRow) {
    if (!confirm(`Remove "${i.kind}"?`)) return;
    startTransition(async () => {
      const r = await deleteCompliance(i.id);
      if (!r.ok) { setError(r.error ?? "Could not remove."); return; }
      router.refresh();
    });
  }
  const set = (patch: Partial<ComplianceInput>) => setEditing((p) => (p ? { ...p, ...patch } : p));

  return (
    <>
      <div className="f5-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Compliance Items</span>
        {canEdit && <button className="f5-btn primary" onClick={openAdd}>+ Add Item</button>}
      </div>

      {error && !editing && <div style={{ color: "var(--f5-red)", fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead>
            <tr><th>Property</th><th>Kind</th><th>Due</th><th>Status</th>{canEdit && <th style={{ textAlign: "right" }}>Actions</th>}</tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{i.propertyName}</td>
                <td>{i.kind}</td>
                <td>{i.due}</td>
                <td><span className={`f5-badge ${statusBadge[i.status]}`}>{statusLabel[i.status]}</span></td>
                {canEdit && (
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => openEdit(i)}>Edit</button>
                    <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6, color: "var(--f5-red)" }} onClick={() => remove(i)} disabled={pending}>Delete</button>
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
            <div className="f5-section-title" style={{ margin: 0 }}>{editing.id ? "Edit Compliance Item" : "New Compliance Item"}</div>

            <label className="f5-label">Kind <span style={{ color: "var(--f5-red)" }}>*</span></label>
            <input className="f5-input" value={editing.kind} onChange={(e) => set({ kind: e.target.value })} placeholder="e.g. RentSafeTO Audit, Fire Inspection, Elevator Cert" />

            <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: 8 }}>
              <div>
                <label className="f5-label">Property</label>
                <select className="f5-select" value={editing.propertyId ?? ""} onChange={(e) => set({ propertyId: e.target.value || null })}>
                  <option value="">— Portfolio-wide —</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="f5-label">Due date</label>
                <input className="f5-input" type="date" value={editing.due} onChange={(e) => set({ due: e.target.value })} />
              </div>
              <div>
                <label className="f5-label">Status</label>
                <select className="f5-select" value={editing.status} onChange={(e) => set({ status: e.target.value as ComplianceInput["status"] })}>
                  <option value="compliant">Compliant</option>
                  <option value="due_soon">Due Soon</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>

            {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="f5-btn primary" disabled={pending} onClick={save}>{pending ? "Saving…" : editing.id ? "Save Changes" : "Add Item"}</button>
              <button className="f5-btn" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
