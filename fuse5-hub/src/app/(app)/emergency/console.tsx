"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendEmergency } from "./actions";
import type { SendBroadcastResult } from "@/app/(app)/compose/actions";

const TYPES = ["Fire / Evacuation", "Water / Utility", "Severe Weather", "Security"];

export function EmergencyConsole() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState(TYPES[0]);
  const [message, setMessage] = useState(
    "EMERGENCY: Please evacuate via the nearest stairwell. Do not use elevators. Assemble at the designated muster point.",
  );
  const [result, setResult] = useState<SendBroadcastResult | null>(null);

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

      <label className="f5-label" htmlFor="message">Message</label>
      <textarea id="message" className="f5-textarea" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />

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
