"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PropertyOption } from "@/lib/queries";
import type { ResidentWithDemographics } from "@/lib/residents/types";
import { saveResident, deleteResident, type ResidentInput } from "./actions";
import { ResidentProfile } from "./resident-profile";

function fmtDate(v: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

const LANGS = ["English", "French", "Spanish", "Mandarin", "Portuguese", "Arabic"];
const CHANNELS: { k: string; l: string }[] = [{ k: "email", l: "Email" }, { k: "sms", l: "SMS" }, { k: "whatsapp", l: "WhatsApp" }];

const blank = (propertyId: string | null): ResidentInput => ({
  propertyId, unit: "", name: "", email: "", phone: "", language: "English", preferredChannel: "email", status: "active",
});

export function ResidentsTable({ residents, properties, canEdit }: {
  residents: ResidentWithDemographics[];
  properties: PropertyOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<ResidentInput | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "moved_out">("all");
  const [viewing, setViewing] = useState<ResidentWithDemographics | null>(null);

  const needle = q.trim().toLowerCase();
  const filtered = residents.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (!needle) return true;
    return [r.name, r.unit, r.propertyName, r.language, r.email, r.phone, r.demographics?.supportAgency ?? ""].some((v) => (v ?? "").toLowerCase().includes(needle));
  });

  function openAdd() { setError(null); setEditing(blank(properties[0]?.id ?? null)); }
  function openEdit(r: ResidentWithDemographics) {
    setError(null);
    setEditing({ id: r.id, propertyId: r.propertyId, unit: r.unit === "—" ? "" : r.unit, name: r.name, email: r.email, phone: r.phone, language: r.language === "—" ? "English" : r.language, preferredChannel: r.preferredChannel, status: r.status });
  }
  function save() {
    if (!editing) return;
    if (!editing.name.trim()) { setError("Name is required."); return; }
    startTransition(async () => {
      const r = await saveResident(editing);
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setEditing(null); router.refresh();
    });
  }
  function remove(r: ResidentWithDemographics) {
    if (!confirm(`Remove ${r.name}? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await deleteResident(r.id);
      if (!res.ok) { setError(res.error ?? "Could not remove."); return; }
      router.refresh();
    });
  }
  const set = (patch: Partial<ResidentInput>) => setEditing((p) => (p ? { ...p, ...patch } : p));

  return (
    <>
      <div className="f5-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Resident Directory</span>
        {canEdit && <button className="f5-btn primary" onClick={openAdd}>+ Add Resident</button>}
      </div>

      {error && !editing && <div style={{ color: "var(--f5-red)", fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
        <input className="f5-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, unit, property, language, agency…" style={{ maxWidth: 340 }} />
        <div className="f5-chips" style={{ margin: 0 }}>
          {(["all", "active", "moved_out"] as const).map((s) => (
            <span key={s} className={`f5-chip${statusFilter === s ? " active" : ""}`} onClick={() => setStatusFilter(s)}>{s === "all" ? "All" : s === "active" ? "Active" : "Moved Out"}</span>
          ))}
        </div>
        <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--f5-text-muted)" }}>{filtered.length} of {residents.length}</span>
      </div>

      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead>
            <tr><th>Unit</th><th>Name</th><th>Property</th><th>Language</th><th>Household</th><th>Support Agency</th><th>Last Contacted</th><th>Status</th>{canEdit && <th style={{ textAlign: "right" }}>Actions</th>}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={canEdit ? 9 : 8} style={{ color: "var(--f5-text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>No residents match.</td></tr>}
            {filtered.map((r) => (
              <tr key={r.id}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{r.unit}</td>
                <td><button type="button" onClick={() => setViewing(r)} style={{ background: "none", border: "none", padding: 0, color: "var(--f5-teal,#00CCCC)", fontWeight: 600, cursor: "pointer", textAlign: "left" }}>{r.name}</button></td>
                <td>{r.propertyName}</td>
                <td>{r.demographics?.primaryLanguage ?? r.language}</td>
                <td>{r.demographics?.householdSize != null ? r.demographics.householdSize : "—"}</td>
                <td style={{ color: "var(--f5-text-muted)" }}>{r.demographics?.supportAgency && r.demographics.supportAgency !== "—" ? r.demographics.supportAgency : "—"}</td>
                <td style={{ color: "var(--f5-text-muted)" }}>{fmtDate(r.lastContactedAt)}</td>
                <td><span className={`f5-badge ${r.status === "active" ? "ok" : "warn"}`}>{r.status === "active" ? "Active" : "Moved Out"}</span></td>
                {canEdit && (
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => openEdit(r)}>Edit</button>
                    <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6, color: "var(--f5-red)" }} onClick={() => remove(r)} disabled={pending}>Delete</button>
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
            <div className="f5-section-title" style={{ margin: 0 }}>{editing.id ? "Edit Resident" : "New Resident"}</div>

            <label className="f5-label">Name <span style={{ color: "var(--f5-red)" }}>*</span></label>
            <input className="f5-input" value={editing.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Amara Okafor" />

            <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
              <div>
                <label className="f5-label">Property</label>
                <select className="f5-select" value={editing.propertyId ?? ""} onChange={(e) => set({ propertyId: e.target.value || null })}>
                  <option value="">— Unassigned —</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="f5-label">Unit</label>
                <input className="f5-input" value={editing.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="e.g. 204" />
              </div>
            </div>

            <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
              <div>
                <label className="f5-label">Email</label>
                <input className="f5-input" type="email" value={editing.email} onChange={(e) => set({ email: e.target.value })} placeholder="resident@example.org" />
              </div>
              <div>
                <label className="f5-label">Phone</label>
                <input className="f5-input" value={editing.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="416-555-0000" />
              </div>
            </div>

            <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", marginTop: 8 }}>
              <div>
                <label className="f5-label">Language</label>
                <select className="f5-select" value={editing.language} onChange={(e) => set({ language: e.target.value })}>
                  {LANGS.map((l) => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="f5-label">Preferred Channel</label>
                <select className="f5-select" value={editing.preferredChannel} onChange={(e) => set({ preferredChannel: e.target.value })}>
                  {CHANNELS.map((c) => <option key={c.k} value={c.k}>{c.l}</option>)}
                </select>
              </div>
              <div>
                <label className="f5-label">Status</label>
                <select className="f5-select" value={editing.status} onChange={(e) => set({ status: e.target.value as ResidentInput["status"] })}>
                  <option value="active">Active</option>
                  <option value="moved_out">Moved Out</option>
                </select>
              </div>
            </div>

            {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="f5-btn primary" disabled={pending} onClick={save}>{pending ? "Saving…" : editing.id ? "Save Changes" : "Add Resident"}</button>
              <button className="f5-btn" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {viewing && <ResidentProfile resident={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
