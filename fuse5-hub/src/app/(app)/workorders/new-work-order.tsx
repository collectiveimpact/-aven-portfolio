"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createWorkOrderWithDrafts, type CreateWOResult } from "./actions";
import type { PropertyOption } from "@/lib/queries";

const ALL_CHANNELS = [
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS" },
  { key: "display", label: "Signage" },
];

export function NewWorkOrder({ properties }: { properties: PropertyOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateWOResult | null>(null);

  const [propertyId, setPropertyId] = useState(properties[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Maintenance");
  const [channels, setChannels] = useState<string[]>(["email", "sms", "display"]);
  const [operationTitle, setOperationTitle] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [contactInfo, setContactInfo] = useState("Property Office · 416-555-0100");
  const [affected, setAffected] = useState("");
  const [callToAction, setCallToAction] = useState("");

  function toggle(k: string) {
    setChannels((c) => (c.includes(k) ? c.filter((x) => x !== k) : [...c, k]));
  }

  function generate() {
    startTransition(async () => {
      const r = await createWorkOrderWithDrafts({
        propertyId, title, category, channels,
        facts: { operationTitle: operationTitle || title, dateTime, contactInfo, affected, callToAction },
      });
      setResult(r);
    });
  }

  function close() {
    if (result?.ok) router.refresh(); // refresh the table on the way out
    setOpen(false); setResult(null); setTitle(""); setOperationTitle(""); setDateTime(""); setAffected(""); setCallToAction("");
  }

  if (!open) {
    return <button className="f5-btn primary" onClick={() => setOpen(true)}>+ Add Work Order</button>;
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }} onClick={close}>
      <div className="f5-card" style={{ width: 620, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
        <div className="f5-section-title" style={{ margin: 0 }}>New Work Order</div>

        <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
          <div>
            <label className="f5-label">Property</label>
            <select className="f5-select" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="f5-label">Category</label>
            <select className="f5-select" value={category} onChange={(e) => setCategory(e.target.value)}>
              {["Maintenance", "Plumbing", "Electrical", "HVAC", "Pest", "Notice"].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <label className="f5-label">Title</label>
        <input className="f5-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Water shutoff — Danforth" />

        <div className="f5-section-title">Notice Content Details (for AI generation)</div>
        <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div>
            <label className="f5-label">Operation Title</label>
            <input className="f5-input" value={operationTitle} onChange={(e) => setOperationTitle(e.target.value)} placeholder="Scheduled water shutoff" />
          </div>
          <div>
            <label className="f5-label">Date / Time</label>
            <input className="f5-input" value={dateTime} onChange={(e) => setDateTime(e.target.value)} placeholder="Tue Jun 10, 9am–12pm" />
          </div>
        </div>
        <label className="f5-label">Floors / Units Affected</label>
        <input className="f5-input" value={affected} onChange={(e) => setAffected(e.target.value)} placeholder="Floors 1–5, Building A" />
        <label className="f5-label">Call to Action</label>
        <input className="f5-input" value={callToAction} onChange={(e) => setCallToAction(e.target.value)} placeholder="Store water in advance; avoid using taps during this window." />
        <label className="f5-label">Contact Info</label>
        <input className="f5-input" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} />

        <label className="f5-label">Channels</label>
        <div className="f5-chips">
          {ALL_CHANNELS.map((c) => (
            <span key={c.key} className={`f5-chip${channels.includes(c.key) ? " active" : ""}`} onClick={() => toggle(c.key)}>{c.label}</span>
          ))}
        </div>

        {result?.ok && result.drafts && (
          <div style={{ marginTop: 16 }}>
            <div className="f5-section-title" style={{ marginTop: 0 }}>Generated Drafts {result.mode === "stub" ? "(stub — set ANTHROPIC_API_KEY for AI)" : "(AI)"}</div>
            {result.drafts.map((d) => (
              <div key={d.channel} className="f5-card" style={{ marginBottom: 8, background: "var(--f5-surface-2)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <strong style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: 1, color: "var(--f5-teal)" }}>{d.channel}</strong>
                </div>
                {d.subject && <div style={{ fontWeight: 600, fontSize: 13 }}>{d.subject}</div>}
                <div style={{ color: "var(--f5-text-secondary)", fontSize: 13, whiteSpace: "pre-wrap" }}>{d.body}</div>
              </div>
            ))}
          </div>
        )}
        {result && !result.ok && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{result.error}</div>}

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          {!result?.ok ? (
            <button className="f5-btn primary" disabled={pending} onClick={generate}>
              {pending ? "Generating…" : "Create & Generate Drafts"}
            </button>
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
