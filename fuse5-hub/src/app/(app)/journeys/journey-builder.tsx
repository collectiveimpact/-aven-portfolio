"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CHANNEL_LABEL, TRIGGER_TYPES, newStepId, type Journey, type Step, type Trigger, type Channel } from "@/lib/journeys";
import type { ComposeTemplate } from "@/lib/queries";
import { saveJourney, setJourneyStatus } from "./actions";

const fg = "var(--f5-text)";
const dim = "var(--f5-text-muted)";
const CH_ICON: Record<Channel, string> = { auto: "◎", email: "✉", sms: "💬", display: "🖥", whatsapp: "🟢" };

// ---- immutable tree helpers (steps may nest one level inside a split) ----
function mapTree(steps: Step[], fn: (s: Step) => Step | null): Step[] {
  const out: Step[] = [];
  for (const s of steps) {
    const r = fn(s);
    if (!r) continue;
    if (r.type === "split") out.push({ ...r, yes: mapTree(r.yes, fn), no: mapTree(r.no, fn) });
    else out.push(r);
  }
  return out;
}
const blankStep = (type: Step["type"]): Step =>
  type === "message" ? { id: newStepId(), type: "message", channel: "auto", subject: "", body: "" }
  : type === "delay" ? { id: newStepId(), type: "delay", value: 3, unit: "days" }
  : { id: newStepId(), type: "split", label: "Condition", condition: "", yes: [], no: [] };

export function JourneyBuilder({ journey, templates, onClose }: { journey: Journey; templates: ComposeTemplate[]; onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState(journey.name);
  const [trigger, setTrigger] = useState<Trigger>(journey.trigger);
  const [steps, setSteps] = useState<Step[]>(journey.steps);
  const [status, setStatus] = useState(journey.status);
  const [editing, setEditing] = useState<Step | null>(null);
  const [editTrigger, setEditTrigger] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const isNew = journey.id.startsWith("new") || journey.id.startsWith("demo");

  const update = (id: string, patch: Partial<Step>) => setSteps((cur) => mapTree(cur, (s) => (s.id === id ? ({ ...s, ...patch } as Step) : s)));
  const remove = (id: string) => setSteps((cur) => mapTree(cur, (s) => (s.id === id ? null : s)));
  const addTo = (where: "root" | { splitId: string; branch: "yes" | "no" }, type: Step["type"]) => {
    const ns = blankStep(type);
    if (where === "root") setSteps((cur) => [...cur, ns]);
    else setSteps((cur) => mapTree(cur, (s) => (s.id === where.splitId && s.type === "split" ? { ...s, [where.branch]: [...s[where.branch], ns] } as Step : s)));
    if (type !== "split") setEditing(ns);
  };

  function persist(activate?: boolean) {
    setErr(null);
    start(async () => {
      const r = await saveJourney({ id: isNew ? undefined : journey.id, name, trigger, steps });
      if (!r.ok) { setErr(r.error ?? "Could not save."); return; }
      if (activate && r.id) { await setJourneyStatus(r.id, "active"); }
      router.refresh(); onClose();
    });
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", justifyContent: "center", overflowY: "auto", padding: "24px 16px" }} onClick={onClose}>
      <div className="f5-card" style={{ width: 720, maxWidth: "96vw", height: "fit-content", minHeight: "60vh" }} onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input className="f5-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Journey name" style={{ fontSize: 15, fontWeight: 600 }} />
          <span className={`f5-badge ${status === "active" ? "ok" : status === "paused" ? "warn" : ""}`} style={{ textTransform: "capitalize" }}>{status}</span>
          <button className="f5-btn" onClick={onClose} style={{ padding: "4px 10px" }}>✕</button>
        </div>

        {/* canvas */}
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* trigger */}
          <div className="f5-card" style={{ width: 360, borderLeft: "3px solid var(--f5-sun,#FFB066)", cursor: "pointer" }} onClick={() => setEditTrigger(true)}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "var(--f5-sun,#FFB066)" }}>Trigger</div>
            <div style={{ fontWeight: 700, color: fg, marginTop: 2 }}>{TRIGGER_TYPES.find((t) => t.key === trigger.type)?.icon} {TRIGGER_TYPES.find((t) => t.key === trigger.type)?.label}</div>
            <div style={{ fontSize: 12, color: dim, marginTop: 2 }}>{trigger.label}</div>
          </div>

          <Sequence steps={steps} onEdit={setEditing} onRemove={remove} onAdd={addTo} />
          <Connector />
          <AddMenu onAdd={(t) => addTo("root", t)} root />
        </div>

        {err && <div style={{ color: "var(--f5-red,#f87171)", fontSize: 13, marginTop: 12 }}>{err}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 18, borderTop: "1px solid var(--f5-border)", paddingTop: 14 }}>
          <button className="f5-btn primary" disabled={pending} onClick={() => persist(false)}>{pending ? "Saving…" : "Save Draft"}</button>
          <button className="f5-btn" disabled={pending} onClick={() => persist(true)} style={{ color: "var(--f5-green,#34d399)" }}>Save &amp; Activate</button>
          <span style={{ marginLeft: "auto", fontSize: 12, color: dim, alignSelf: "center" }}>{steps.length} steps</span>
        </div>

        {editing && <StepEditor step={editing} templates={templates} onChange={(p) => { update(editing.id, p); setEditing({ ...editing, ...p } as Step); }} onClose={() => setEditing(null)} />}
        {editTrigger && <TriggerEditor trigger={trigger} onChange={setTrigger} onClose={() => setEditTrigger(false)} />}
      </div>
    </div>
  );
}

function Connector() { return <div style={{ width: 2, height: 18, background: "var(--f5-border)" }} />; }

function Sequence({ steps, onEdit, onRemove, onAdd }: { steps: Step[]; onEdit: (s: Step) => void; onRemove: (id: string) => void; onAdd: (w: "root" | { splitId: string; branch: "yes" | "no" }, t: Step["type"]) => void }) {
  return (
    <>
      {steps.map((s) => (
        <div key={s.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          <Connector />
          {s.type === "split" ? (
            <div style={{ width: 360 }}>
              <div className="f5-card" style={{ borderLeft: "3px solid #a855f7" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "#c084fc" }}>Conditional Split</div><div style={{ fontWeight: 600, color: fg, marginTop: 2 }}>{s.label}</div><div style={{ fontSize: 11, color: dim, fontFamily: "monospace" }}>{s.condition || "set condition…"}</div></div>
                  <div style={{ display: "flex", gap: 4 }}><button className="f5-btn" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => onEdit(s)}>Edit</button><button className="f5-btn" style={{ padding: "2px 8px", fontSize: 11, color: "var(--f5-red)" }} onClick={() => onRemove(s.id)}>✕</button></div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                {(["yes", "no"] as const).map((branch) => (
                  <div key={branch} style={{ border: "1px dashed var(--f5-border)", borderRadius: 8, padding: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: branch === "yes" ? "var(--f5-green,#34d399)" : "#f59e0b", marginBottom: 6 }}>{branch === "yes" ? "✓ Yes" : "✕ No"}</div>
                    {s[branch].map((b) => <MiniStep key={b.id} step={b} onEdit={onEdit} onRemove={onRemove} />)}
                    <AddMenu onAdd={(t) => onAdd({ splitId: s.id, branch }, t)} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <StepCard step={s} onEdit={onEdit} onRemove={onRemove} />
          )}
        </div>
      ))}
    </>
  );
}

function StepCard({ step, onEdit, onRemove }: { step: Step; onEdit: (s: Step) => void; onRemove: (id: string) => void }) {
  return (
    <div className="f5-card" style={{ width: 360, borderLeft: step.type === "message" ? "3px solid var(--f5-teal,#00CCCC)" : "3px solid var(--f5-text-muted)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          {step.type === "message" ? (
            <><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: "var(--f5-teal,#00CCCC)" }}>{CH_ICON[step.channel]} {CHANNEL_LABEL[step.channel]}</div><div style={{ fontWeight: 600, color: fg, marginTop: 2 }}>{step.subject || "(no subject)"}</div><div style={{ fontSize: 12, color: dim, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 280 }}>{step.body || "…"}</div></>
          ) : step.type === "delay" ? (
            <><div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1, color: dim }}>Wait</div><div style={{ fontWeight: 600, color: fg, marginTop: 2 }}>{step.value} {step.unit}</div></>
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}><button className="f5-btn" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => onEdit(step)}>Edit</button><button className="f5-btn" style={{ padding: "2px 8px", fontSize: 11, color: "var(--f5-red)" }} onClick={() => onRemove(step.id)}>✕</button></div>
      </div>
    </div>
  );
}
function MiniStep({ step, onEdit, onRemove }: { step: Step; onEdit: (s: Step) => void; onRemove: (id: string) => void }) {
  const label = step.type === "message" ? `${CH_ICON[step.channel]} ${step.subject || "Message"}` : step.type === "delay" ? `Wait ${step.value}${step.unit[0]}` : "Split";
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 7px", background: "var(--f5-bg-soft, rgba(255,255,255,0.04))", borderRadius: 6, marginBottom: 5, fontSize: 12 }}>
      <span style={{ color: fg, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      <span style={{ display: "flex", gap: 4, flexShrink: 0 }}><button className="f5-btn" style={{ padding: "1px 6px", fontSize: 10 }} onClick={() => onEdit(step)}>✎</button><button className="f5-btn" style={{ padding: "1px 6px", fontSize: 10, color: "var(--f5-red)" }} onClick={() => onRemove(step.id)}>✕</button></span>
    </div>
  );
}

function AddMenu({ onAdd, root }: { onAdd: (t: Step["type"]) => void; root?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button className="f5-btn" style={{ padding: root ? "5px 14px" : "3px 8px", fontSize: root ? 13 : 11 }} onClick={() => setOpen((v) => !v)}>+ Add step</button>
      {open && (
        <div className="f5-card" style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: "110%", zIndex: 30, padding: 6, width: 150 }}>
          {(["message", "delay", ...(root ? ["split"] as const : [])] as Step["type"][]).map((t) => (
            <div key={t} onClick={() => { onAdd(t); setOpen(false); }} style={{ padding: "6px 8px", fontSize: 12, color: "var(--f5-text-secondary)", cursor: "pointer", textTransform: "capitalize" }}>{t === "message" ? "✉ Message" : t === "delay" ? "⏱ Delay" : "⑂ Conditional split"}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepEditor({ step, templates, onChange, onClose }: { step: Step; templates: ComposeTemplate[]; onChange: (p: Partial<Step>) => void; onClose: () => void }) {
  const VALID: Channel[] = ["email", "sms", "display", "whatsapp"];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div className="f5-card" style={{ width: 460, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
        <div className="f5-section-title" style={{ marginTop: 0, textTransform: "capitalize" }}>{step.type} step</div>
        {step.type === "message" && (<>
          {templates.length > 0 && (<>
            <label className="f5-label">Start from a template</label>
            <select className="f5-select" value="" onChange={(e) => {
              const t = templates.find((x) => x.id === e.target.value);
              if (!t) return;
              const ch = (t.channels.find((c) => VALID.includes(c as Channel)) as Channel) || "auto";
              onChange({ subject: t.name, body: t.body, channel: ch });
            }}>
              <option value="">— Load a template… —</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </>)}
          <label className="f5-label" style={{ marginTop: 8 }}>Channel</label>
          <select className="f5-select" value={step.channel} onChange={(e) => onChange({ channel: e.target.value as Channel })}>{(Object.keys(CHANNEL_LABEL) as Channel[]).map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}</select>
          <label className="f5-label" style={{ marginTop: 8 }}>Subject</label>
          <input className="f5-input" value={step.subject} onChange={(e) => onChange({ subject: e.target.value })} placeholder="Message subject" />
          <label className="f5-label" style={{ marginTop: 8 }}>Body</label>
          <textarea className="f5-input" rows={4} value={step.body} onChange={(e) => onChange({ body: e.target.value })} />
        </>)}
        {step.type === "delay" && (<>
          <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div><label className="f5-label">Wait</label><input className="f5-input" type="number" min={1} value={step.value} onChange={(e) => onChange({ value: Math.max(1, parseInt(e.target.value, 10) || 1) })} /></div>
            <div><label className="f5-label">Unit</label><select className="f5-select" value={step.unit} onChange={(e) => onChange({ unit: e.target.value as "hours" | "days" })}><option value="hours">Hours</option><option value="days">Days</option></select></div>
          </div>
        </>)}
        {step.type === "split" && (<>
          <label className="f5-label">Label</label>
          <input className="f5-input" value={step.label} onChange={(e) => onChange({ label: e.target.value })} placeholder="e.g. Has the resident renewed?" />
          <label className="f5-label" style={{ marginTop: 8 }}>Condition</label>
          <input className="f5-input" value={step.condition} onChange={(e) => onChange({ condition: e.target.value })} placeholder="e.g. lease.renewed = true" style={{ fontFamily: "monospace" }} />
        </>)}
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}><button className="f5-btn primary" onClick={onClose}>Done</button></div>
      </div>
    </div>
  );
}

function TriggerEditor({ trigger, onChange, onClose }: { trigger: Trigger; onChange: (t: Trigger) => void; onClose: () => void }) {
  const [t, setT] = useState<Trigger>(trigger);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div className="f5-card" style={{ width: 460, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
        <div className="f5-section-title" style={{ marginTop: 0 }}>Trigger</div>
        <label className="f5-label">When</label>
        <select className="f5-select" value={t.type} onChange={(e) => setT({ ...t, type: e.target.value as Trigger["type"] })}>{TRIGGER_TYPES.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</select>
        <div style={{ fontSize: 11, color: dim, marginTop: 4 }}>{TRIGGER_TYPES.find((x) => x.key === t.type)?.hint}</div>
        <label className="f5-label" style={{ marginTop: 8 }}>Description</label>
        <input className="f5-input" value={t.label} onChange={(e) => setT({ ...t, label: e.target.value })} placeholder="e.g. 60 days before lease renewal" />
        <div style={{ display: "flex", gap: 10, marginTop: 16 }}><button className="f5-btn primary" onClick={() => { onChange(t); onClose(); }}>Done</button><button className="f5-btn" onClick={onClose}>Cancel</button></div>
      </div>
    </div>
  );
}
