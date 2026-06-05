"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendEmergency } from "./actions";
import type { SendBroadcastResult } from "@/app/(app)/compose/actions";
import { FANOUT_TEMPLATES, type Severity } from "@/lib/fanouts";

const TYPES = ["Fire / Evacuation", "Water / Utility", "Severe Weather", "Security"];
const SEV_ORDER: Severity[] = ["emergency", "planned", "info"];
const SEV_LABEL: Record<Severity, string> = { emergency: "Emergency", planned: "Planned", info: "Service notice" };

export function EmergencyConsole() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState(TYPES[0]);
  const [message, setMessage] = useState(
    "EMERGENCY: Please evacuate via the nearest stairwell. Do not use elevators. Assemble at the designated muster point.",
  );
  const [result, setResult] = useState<SendBroadcastResult | null>(null);
  const [property, setProperty] = useState("");

  // Pre-fill the message from a fan-out template (TCHC Emergency Matrix).
  function applyFanout(key: string) {
    const t = FANOUT_TEMPLATES.find((x) => x.key === key);
    if (!t) return;
    const fill = (s: string) => s.replace(/\{\{property\}\}/g, property || "{{property}}");
    setMessage(`${fill(t.subject)}\n\n${fill(t.body)}`);
    if (/water/i.test(t.category)) setType("Water / Utility");
    else if (/elevator|door|electrical|fire/i.test(t.category)) setType("Security");
  }

  function fire() {
    startTransition(async () => {
      const r = await sendEmergency({ type, message });
      setResult(r);
      if (r.ok) router.refresh(); // refresh the live emergency log below
    });
  }

  return (
    <div className="f5-card" style={{ marginTop: 18, borderColor: "color-mix(in srgb, var(--f5-red) 40%, transparent)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="f5-dot" style={{ background: "var(--f5-red)", marginTop: 0 }} />
        <div className="f5-section-title" style={{ margin: 0, color: "var(--f5-red)" }}>Emergency Broadcast Console</div>
      </div>
      <div style={{ color: "var(--f5-text-secondary)", fontSize: 13, marginTop: 10 }}>
        This broadcast overrides all channels &mdash; email, SMS, WhatsApp, voice, and every signage display fires
        simultaneously. Use only for genuine emergencies affecting resident safety.
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
        <div>
          <label className="f5-label" htmlFor="severity">Severity</label>
          <select id="severity" className="f5-select" defaultValue="critical">
            <option value="critical">Critical — life safety</option>
            <option value="urgent">Urgent — service disruption</option>
            <option value="advisory">Advisory — informational</option>
          </select>
        </div>
        <div>
          <label className="f5-label" htmlFor="type">Incident Type</label>
          <select id="type" className="f5-select" value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      <label className="f5-label">Fan-out template</label>
      <div className="f5-grid" style={{ gridTemplateColumns: "2fr 1fr", marginBottom: 4 }}>
        <select className="f5-select" defaultValue="" onChange={(e) => applyFanout(e.target.value)}>
          <option value="">— Start from a fan-out —</option>
          {SEV_ORDER.map((sev) => (
            <optgroup key={sev} label={SEV_LABEL[sev]}>
              {FANOUT_TEMPLATES.filter((t) => t.severity === sev).map((t) => (
                <option key={t.key} value={t.key}>{t.title}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <input className="f5-input" value={property} onChange={(e) => setProperty(e.target.value)} placeholder="Property (fills {{property}})" />
      </div>

      <label className="f5-label" htmlFor="message">Message</label>
      <textarea id="message" className="f5-textarea" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} />

      <div style={{ color: "var(--f5-text-dim)", fontSize: 12, marginTop: 12 }}>
        All channels selected · email · SMS · WhatsApp · voice · display
      </div>

      {result?.ok && (
        <div className="f5-badge ok" style={{ display: "inline-block", marginTop: 12 }}>
          ✓ Broadcast sent to {result.sent.toLocaleString()} recipients{result.mode === "demo" ? " (demo)" : ""}
        </div>
      )}
      {result && !result.ok && (
        <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{result.error}</div>
      )}

      <button
        type="button"
        onClick={fire}
        disabled={pending}
        className="f5-btn primary"
        style={{ background: "var(--f5-red)", color: "#fff", marginTop: 14, width: "100%", justifyContent: "center", padding: "12px 14px", fontSize: 14 }}
      >
        {pending ? "Broadcasting…" : "⚠ Broadcast to all 2,847 residents"}
      </button>
    </div>
  );
}
