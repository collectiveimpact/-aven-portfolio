"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SegmentRow, PropertyOption } from "@/lib/queries";
import { countResidents, saveSegment, deleteSegment, interpretSegment, type SegmentRule } from "./actions";

// Predictive smart-segment presets (Klaviyo-style risk groupings, housing-native).
const RISK_PRESETS: { key: NonNullable<SegmentRule["risk"]>; name: string; icon: string; desc: string }[] = [
  { key: "arrears", name: "Arrears-risk", icon: "💳", desc: "Residents likely to fall behind on rent — proactive outreach." },
  { key: "low_engagement", name: "Low-engagement", icon: "💤", desc: "Haven't opened recent notices — switch channel / re-engage." },
  { key: "non_responder", name: "Non-responders", icon: "🔕", desc: "No reply to recent emergencies or surveys — escalate." },
  { key: "renewal", name: "Renewal-likely", icon: "📜", desc: "Approaching lease renewal — start the conversation early." },
];

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
  const [customRule, setCustomRule] = useState<SegmentRule | null>(null); // set by preset / NL
  const [nl, setNl] = useState("");
  const [nlBusy, startNl] = useTransition();

  // Live count: recompute whenever the rule changes (custom rule wins).
  useEffect(() => {
    if (!open) return;
    const rule = customRule ?? buildRule(field, value, properties);
    startCount(async () => {
      const r = await countResidents(rule);
      setCount(r.count);
    });
  }, [open, field, value, properties, customRule]);

  function openPreset(name: string, rule: SegmentRule) { setError(null); setName(name); setCustomRule(rule); setCount(null); setOpen(true); }
  function runNl() {
    if (!nl.trim()) return;
    startNl(async () => {
      const r = await interpretSegment(nl);
      if (r.ok && r.rule) openPreset(r.label ?? "New segment", r.rule);
    });
  }

  const valueOptions: string[][] | null =
    field === "language" ? LANGS : field === "preferred_channel" ? CHANNELS : field === "status" ? STATUSES
      : field === "property" ? properties.map((p) => [p.id, p.name]) : null;

  function openNew() { setError(null); setName(""); setField("all"); setValue(""); setCount(null); setCustomRule(null); setOpen(true); }
  function changeField(f: Field) {
    setField(f);
    setValue(f === "language" ? "en" : f === "preferred_channel" ? "email" : f === "status" ? "active" : f === "property" ? (properties[0]?.id ?? "") : "");
  }
  function save() {
    if (!name.trim()) { setError("Segment name is required."); return; }
    const rule = customRule ?? buildRule(field, value, properties);
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

      {canEdit && (
        <>
          {/* Natural-language segment creation */}
          <div className="f5-card" style={{ marginTop: 16 }}>
            <div className="f5-section-title" style={{ marginTop: 0 }}>✦ Describe your audience</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="f5-input" value={nl} onChange={(e) => setNl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && runNl()} placeholder="e.g. residents who are behind on rent, or French speakers who prefer SMS" />
              <button className="f5-btn primary" disabled={nlBusy || !nl.trim()} onClick={runNl} style={{ whiteSpace: "nowrap" }}>{nlBusy ? "…" : "Generate"}</button>
            </div>
            <div style={{ fontSize: 11, color: "var(--f5-text-muted)", marginTop: 6 }}>Plain English → a segment rule with a live count you can save.</div>
          </div>

          {/* Predictive smart segments */}
          <div className="f5-section-title">Smart Segments <span style={{ fontSize: 11, fontWeight: 400, color: "var(--f5-text-muted)" }}>(predictive)</span></div>
          <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            {RISK_PRESETS.map((p) => (
              <div key={p.key} className="f5-card" style={{ cursor: "pointer" }} onClick={() => openPreset(`${p.name} residents`, { risk: p.key })}>
                <div style={{ fontWeight: 700, color: "var(--f5-text)" }}>{p.icon} {p.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--f5-text-muted)", marginTop: 6 }}>{p.desc}</div>
                <div style={{ fontSize: 11, color: "var(--f5-teal,#00CCCC)", marginTop: 10 }}>Create segment →</div>
              </div>
            ))}
          </div>
        </>
      )}

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

            {customRule ? (
              <div className="f5-card" style={{ background: "var(--f5-surface-2, rgba(255,255,255,0.03))", marginTop: 10 }}>
                <div style={{ fontSize: 11, color: "var(--f5-text-muted)" }}>Rule</div>
                <div style={{ color: "var(--f5-text)", fontWeight: 600, marginTop: 2 }}>
                  {customRule.risk ? "Predictive: " + customRule.risk.replace("_", " ") : customRule.language ? "Language = " + customRule.language : customRule.preferred_channel ? "Preferred = " + customRule.preferred_channel : customRule.status ? "Status = " + customRule.status : "All residents"}
                </div>
                <button className="f5-btn" style={{ marginTop: 8, fontSize: 12, padding: "3px 10px" }} onClick={() => setCustomRule(null)}>Switch to manual rule</button>
              </div>
            ) : (
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
            )}

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
