"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PropertyOption } from "@/lib/queries";
import { submitWorkOrder, type FrontlineWOInput } from "./actions";

const CATEGORIES = ["Plumbing", "Electrical", "HVAC", "Appliance", "Pest Control", "Common Area", "Security", "Other"];
const PRIORITIES: FrontlineWOInput["priority"][] = ["low", "medium", "high", "urgent"];

const blank = (propertyId: string | null): FrontlineWOInput => ({
  title: "", propertyId, unit: "", category: "Plumbing", priority: "medium", description: "",
});

export function FrontlineForm({ properties, canSubmit }: { properties: PropertyOption[]; canSubmit: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<FrontlineWOInput>(blank(properties[0]?.id ?? null));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const set = (p: Partial<FrontlineWOInput>) => { setDone(false); setForm((f) => ({ ...f, ...p })); };

  function submit() {
    setError(null);
    if (!form.title.trim()) { setError("Describe the issue first."); return; }
    start(async () => {
      const r = await submitWorkOrder(form);
      if (!r.ok) { setError(r.error ?? "Could not submit."); return; }
      setDone(true);
      setForm(blank(properties[0]?.id ?? null));
      router.refresh();
    });
  }

  if (!canSubmit) return <div className="f5-card" style={{ marginTop: 18 }}>Your role cannot submit work orders. Contact a property manager.</div>;

  return (
    <div className="f5-card" style={{ marginTop: 18, maxWidth: 640 }}>
      {done && <div style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.35)", borderRadius: 8, padding: "10px 12px", marginBottom: 14, fontSize: 13, color: "var(--f5-green,#34d399)" }}>✓ Request submitted — a property manager will triage it. Submit another below.</div>}

      <label className="f5-label">What&apos;s the issue? <span style={{ color: "var(--f5-red,#f87171)" }}>*</span></label>
      <input className="f5-input" value={form.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Leaking faucet in unit 204 bathroom" />

      <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
        <div>
          <label className="f5-label">Property</label>
          <select className="f5-select" value={form.propertyId ?? ""} onChange={(e) => set({ propertyId: e.target.value || null })}>
            <option value="">— Select —</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="f5-label">Unit (if applicable)</label>
          <input className="f5-input" value={form.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="e.g. 204" />
        </div>
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
        <div>
          <label className="f5-label">Category</label>
          <select className="f5-select" value={form.category} onChange={(e) => set({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        <div>
          <label className="f5-label">Priority</label>
          <select className="f5-select" value={form.priority} onChange={(e) => set({ priority: e.target.value as FrontlineWOInput["priority"] })}>{PRIORITIES.map((p) => <option key={p} value={p} style={{ textTransform: "capitalize" }}>{p}</option>)}</select>
        </div>
      </div>

      <label className="f5-label" style={{ marginTop: 8 }}>Details</label>
      <textarea className="f5-input" rows={4} value={form.description} onChange={(e) => set({ description: e.target.value })} placeholder="What's happening, when it started, access notes…" />

      {error && <div style={{ color: "var(--f5-red,#f87171)", fontSize: 13, marginTop: 12 }}>{error}</div>}
      <div style={{ marginTop: 16 }}>
        <button className="f5-btn primary" disabled={pending} onClick={submit}>{pending ? "Submitting…" : "Submit Request"}</button>
      </div>
    </div>
  );
}
