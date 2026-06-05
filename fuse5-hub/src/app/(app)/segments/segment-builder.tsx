"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SegmentRow, PropertyOption } from "@/lib/queries";
import { countResidents, saveSegment, deleteSegment, type SegmentRule } from "./actions";

type Field = "all" | "language" | "property" | "preferred_channel" | "status";
const FIELDS: { k: Field; l: string }[] = [
  { k: "all", l: "All residents" },
  { k: "language", l: "By language" },
  { k: "property", l: "By property" },
  { k: "preferred_channel", l: "By preferred channel" },
  { k: "status", l: "By status" },
];
const LANGS = [["en", "English"], ["fr", "French"], ["es", "Spanish"], ["zh", "Mandarin"], ["pt", "Portuguese"], ["ar", "Arabic"]];
const CHANNELS = [["email", "Email"], ["sms", "SMS"], ["whatsapp", "WhatsApp"]];
const STATUSES = [["active", "Active"], ["moved_out", "Moved Out"]];

function buildRule(field: Field, value: string, properties: PropertyOption[]): SegmentRule {
  switch (field) {
    case "all": return { all: true };
    case "language": return { language: value || LANGS[0][0] };
    case "property": return { property_id: value || properties[0]?.id };
    case "preferred_channel": return { preferred_channel: value || "email" };
    case "status": return { status: (value || "active") as "active" | "moved_out" };
  }
}

export function SegmentBuilder({ segments, properties, canEdit }: {
  segments: SegmentRow[];
  properties: PropertyOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [field, setField] = useState<Field>("all");
  const [value, setValue] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [counting, startCount] = useTransition();
  const [saving, startSave] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Live count: recompute whenever the rule changes.
  useEffect(() => {
    if (!open) return;
    const rule = buildRule(field, value, properties);
    startCount(async () => {
      const r = await countResidents(rule);
      setCount(r.count);
    });
  }, [open, field, value, properties]);

  const valueOptions: string[][] | null =
    field === "language" ? LANGS : field === "preferred_channel" ? CHANNELS : field === "status" ? STATUSES
      : field === "property" ? properties.map((p) => [p.id, p.name]) : null;

  function openNew() { setError(null); setName(""); setField("all"); setValue(""); setCount(null); setOpen(true); }
  function changeField(f: Field) {
    setField(f);
    setValue(f === "language" ? "en" : f === "preferred_channel" ? "email" : f === "status" ? "active" : f === "property" ? (properties[0]?.id ?? "") : "");
  }
  function save() {
    if (!name.trim()) { setError("Segment name is required."); return; }
    const rule = buildRule(field, value, properties);
    startSave(async () => {
      const r = await saveSegment(name, rule);
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setOpen(false); router.refresh();
    });
  }
  function remove(s: SegmentRow) {
    if (!confirm(`Delete segment "${s.name}"?`)) return;
    startSave(async () => {
      const r = await deleteSegment(s.id);
      if (!r.ok) { setError(r.error ?? "Could not delete."); return; }
      router.refresh();
    });
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div className="f5-page-title">Segments</div>
          <div className="f5-page-sub">Saved audiences for targeted broadcasts and surveys.</div>
        </div>
        {canEdit && <button className="f5-btn primary" style={{ marginTop: 4 }} onClick={openNew}>+ New Segment</button>}
      </div>

      {error && !open && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 10 }}>{error}</div>}

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 18 }}>
        {segments.map((s) => (
          <div key={s.id} className="f5-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="f5-section-title" style={{ margin: 0 }}>{s.name}</div>
              <span className="f5-pill">{s.size.toLocaleString()}</span>
            </div>
            <div style={{ color: "var(--f5-text-secondary)", fontSize: 13.5, marginTop: 10 }}>{s.rule}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
              <span className="f5-kpi-sub">{s.size.toLocaleString()} residents match</span>
              {canEdit && <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, color: "var(--f5-red)" }} onClick={() => remove(s)} disabled={saving}>Delete</button>}
            </div>
          </div>
        ))}
        {segments.length === 0 && <div style={{ color: "var(--f5-text-muted)", fontSize: 13 }}>No segments yet.</div>}
      </div>

      {open && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }} onClick={() => setOpen(false)}>
          <div className="f5-card" style={{ width: 520, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="f5-section-title" style={{ margin: 0 }}>New Segment</div>

            <label className="f5-label">Name <span style={{ color: "var(--f5-red)" }}>*</span></label>
            <input className="f5-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. French speakers — Danforth" />

            <div className="f5-grid" style={{ gridTemplateColumns: valueOptions ? "1fr 1fr" : "1fr", marginTop: 8 }}>
              <div>
                <label className="f5-label">Match residents</label>
                <select className="f5-select" value={field} onChange={(e) => changeField(e.target.value as Field)}>
                  {FIELDS.map((f) => <option key={f.k} value={f.k}>{f.l}</option>)}
                </select>
              </div>
              {valueOptions && (
                <div>
                  <label className="f5-label">Value</label>
                  <select className="f5-select" value={value} onChange={(e) => setValue(e.target.value)}>
                    {valueOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="f5-card" style={{ background: "var(--f5-surface-2)", marginTop: 14, textAlign: "center" }}>
              <div className="f5-kpi-value" style={{ color: "var(--f5-teal)" }}>{counting || count === null ? "…" : count.toLocaleString()}</div>
              <div className="f5-kpi-sub">residents match this rule right now</div>
            </div>

            {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="f5-btn primary" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save Segment"}</button>
              <button className="f5-btn" onClick={() => setOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
