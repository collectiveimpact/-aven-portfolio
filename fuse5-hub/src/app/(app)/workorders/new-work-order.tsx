"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createWorkOrderWithDrafts, type CreateWOResult } from "./actions";
import type { PropertyOption } from "@/lib/queries";
import type { ResolvedField } from "@/lib/wo-fields";

const IMAGE_CATEGORIES = ["default", "water", "fire", "elevator", "heat", "pest"];

export function NewWorkOrder({ properties, fields }: { properties: PropertyOption[]; fields: ResolvedField[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateWOResult | null>(null);

  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Maintenance");
  const [channels, setChannels] = useState<string[]>(["email", "sms", "display"]);
  const [vals, setVals] = useState<Record<string, string>>({ imageCategory: "default" });

  const noticeFields = fields.filter((f) => f.group === "notice" && f.enabled);
  const categoryField = fields.find((f) => f.key === "category");
  const setVal = (k: string, v: string) => setVals((p) => ({ ...p, [k]: v }));
  const toggle = (c: string) => setChannels((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  function generate() {
    // validate required, config-driven
    const missing: string[] = [];
    if (!title.trim()) missing.push("Title");
    for (const f of noticeFields) if (f.required && !(vals[f.key] ?? "").trim()) missing.push(f.label);
    if (missing.length) { setResult({ ok: false, error: `Required: ${missing.join(", ")}` }); return; }

    startTransition(async () => {
      const r = await createWorkOrderWithDrafts({
        propertyId, title, category, channels,
        facts: {
          operationTitle: vals.operationTitle || title,
          dateTime: vals.dateText ?? "",
          contactInfo: vals.contactInfo ?? "",
          affected: vals.affected ?? "",
          callToAction: vals.cta ?? "",
        },
      });
      setResult(r);
    });
  }
  function close() {
    if (result?.ok) router.refresh();
    setOpen(false); setResult(null); setTitle(""); setVals({ imageCategory: "default" });
  }

  if (!open) return <button className="f5-btn primary" onClick={() => setOpen(true)}>+ Add Work Order</button>;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }} onClick={close}>
      <div className="f5-card" style={{ width: 620, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
        <div className="f5-section-title" style={{ margin: 0 }}>New Work Order</div>

        <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
          <div>
            <label className="f5-label">Property <span style={{ color: "var(--f5-red)" }}>*</span></label>
            <select className="f5-select" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {categoryField?.enabled && (
            <div>
              <label className="f5-label">Category{categoryField.required ? <span style={{ color: "var(--f5-red)" }}> *</span> : null}</label>
              <select className="f5-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                {["Maintenance", "Plumbing", "Electrical", "HVAC", "Pest", "Notice"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>

        <label className="f5-label">Title <span style={{ color: "var(--f5-red)" }}>*</span></label>
        <input className="f5-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Water shutoff — Danforth" />

        <div className="f5-section-title">Notice Content Details</div>
        {noticeFields.map((f) => (
          <div key={f.key}>
            <label className="f5-label">{f.label}{f.required ? <span style={{ color: "var(--f5-red)" }}> *</span> : null}</label>
            {f.key === "imageCategory" ? (
              <select className="f5-select" value={vals.imageCategory ?? "default"} onChange={(e) => setVal("imageCategory", e.target.value)}>
                {IMAGE_CATEGORIES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
              </select>
            ) : f.type === "textarea" ? (
              <textarea className="f5-textarea" rows={2} value={vals[f.key] ?? ""} onChange={(e) => setVal(f.key, e.target.value)} placeholder={f.placeholder} />
            ) : (
              <input className="f5-input" value={vals[f.key] ?? ""} onChange={(e) => setVal(f.key, e.target.value)} placeholder={f.placeholder} />
            )}
          </div>
        ))}

        <label className="f5-label">Channels</label>
        <div className="f5-chips">
          {[["email", "Email"], ["sms", "SMS"], ["display", "Signage"]].map(([k, l]) => (
            <span key={k} className={`f5-chip${channels.includes(k) ? " active" : ""}`} onClick={() => toggle(k)}>{l}</span>
          ))}
        </div>

        {result?.ok && result.drafts && (
          <div style={{ marginTop: 16 }}>
            <div className="f5-section-title" style={{ marginTop: 0 }}>Generated Drafts {result.mode === "stub" ? "(stub)" : "(AI)"}</div>
            {result.drafts.map((d) => (
              <div key={d.channel} className="f5-card" style={{ marginBottom: 8, background: "var(--f5-surface-2)" }}>
                <strong style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: 1, color: "var(--f5-teal)" }}>{d.channel}</strong>
                {d.subject && <div style={{ fontWeight: 600, fontSize: 13 }}>{d.subject}</div>}
                <div style={{ color: "var(--f5-text-secondary)", fontSize: 13, whiteSpace: "pre-wrap" }}>{d.body}</div>
              </div>
            ))}
          </div>
        )}
        {result && !result.ok && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{result.error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {!result?.ok ? (
            <button className="f5-btn primary" disabled={pending} onClick={generate}>{pending ? "Generating…" : "Create & Generate Drafts"}</button>
          ) : (
            <>
              {result.woId && <Link href={`/workorders/${result.woId}`} className="f5-btn primary">Open in Studio →</Link>}
              <button className="f5-btn" onClick={close}>Done</button>
            </>
          )}
          <button className="f5-btn" onClick={close}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
