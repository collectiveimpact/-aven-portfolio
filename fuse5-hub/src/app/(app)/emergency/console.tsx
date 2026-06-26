"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PropertyOption } from "@/lib/queries";
import { sendEmergency } from "./actions";
import { TargetingPanel } from "./targeting-panel";
import {
  buildingFor,
  describeSelection,
  emptySelection,
  scopeCount,
  type TargetSelection,
} from "@/lib/emergency/targeting";
import {
  INCIDENT_BY_ID,
  INCIDENT_GROUPS,
  INCIDENT_TYPES,
  SEVERITY_BY_ID,
  SEVERITY_LEVELS,
  templatesForIncident,
  type SeverityId,
} from "@/lib/emergency/catalog";

interface Props {
  properties: PropertyOption[];
  canBroadcast: boolean;
}

export function EmergencyConsole({ properties, canBroadcast }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [incidentId, setIncidentId] = useState<string>(INCIDENT_TYPES[0].id);
  const incident = INCIDENT_BY_ID[incidentId];
  const [severity, setSeverity] = useState<SeverityId>(incident.defaultSeverity);
  const [templateId, setTemplateId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [propertyId, setPropertyId] = useState<string>(properties[0]?.id ?? "");
  const [selection, setSelection] = useState<TargetSelection>(emptySelection());

  const [result, setResult] = useState<{ ok: boolean; sent?: number; mode?: string; error?: string } | null>(null);

  const templates = useMemo(() => templatesForIncident(incidentId), [incidentId]);
  const sevDef = SEVERITY_BY_ID[severity];

  // Live recipient scope from the targeting panel.
  const property = properties.find((p) => p.id === propertyId) ?? properties[0];
  const audience = useMemo(() => {
    if (!property) return null;
    return scopeCount(buildingFor(property), selection);
  }, [property, selection]);
  const audienceCount = audience?.total ?? 0;
  const scopeLabel = useMemo(
    () => (property ? describeSelection(buildingFor(property), selection) : ""),
    [property, selection],
  );

  // Switching incident resets severity to that incident's default + clears template.
  function pickIncident(id: string) {
    setIncidentId(id);
    setSeverity(INCIDENT_BY_ID[id].defaultSeverity);
    setTemplateId("");
    setResult(null);
  }

  // Loading a template fills subject + body with its copy.
  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    setSubject(t.title);
    setMessage(t.body);
    setSeverity(t.severity);
    setResult(null);
  }

  function fire() {
    startTransition(async () => {
      const r = await sendEmergency({
        incidentId,
        incidentLabel: incident.label,
        severity,
        severityLabel: sevDef.label,
        subject: subject || incident.label,
        message,
        channels: incident.recommendedChannels,
        scopeLabel,
        audienceCount,
        overrideQuietHours: sevDef.overrideQuietHours,
      });
      setResult(r);
      if (r.ok) router.refresh();
    });
  }

  const accent = sevDef.colorToken;

  return (
    <div
      className="f5-card"
      style={{ marginTop: 18, borderColor: `color-mix(in srgb, ${accent} 45%, transparent)` }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="f5-dot" style={{ background: accent, marginTop: 0 }} />
        <div className="f5-section-title" style={{ margin: 0, color: accent }}>
          Emergency Broadcast Console
        </div>
      </div>
      <div style={{ color: "var(--f5-text-secondary)", fontSize: 13, marginTop: 10 }}>
        This console fires the chosen incident across {incident.recommendedChannels.join(" · ")}.
        {sevDef.overrideQuietHours
          ? " At this severity the broadcast overrides quiet hours and reaches every targeted recipient."
          : " Use the severity ladder to match urgency to the situation."}
      </div>

      {!canBroadcast && (
        <div
          className="f5-card"
          style={{ marginTop: 12, borderColor: "color-mix(in srgb, var(--f5-amber) 45%, transparent)" }}
        >
          <span className="f5-warn" style={{ fontSize: 13, fontWeight: 600 }}>
            ⚠ Your role can compose and preview emergency broadcasts but cannot send them. Ask a Comms Manager or Admin to broadcast.
          </span>
        </div>
      )}

      <div className="f5-grid" style={{ gridTemplateColumns: "1.4fr 1fr", marginTop: 16, alignItems: "start" }}>
        {/* ---- Left: incident + message authoring ---- */}
        <div>
          <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div>
              <label className="f5-label" htmlFor="severity">Severity</label>
              <select
                id="severity"
                className="f5-select"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as SeverityId)}
              >
                {[...SEVERITY_LEVELS].sort((a, b) => b.rank - a.rank).map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <div style={{ fontSize: 11.5, color: "var(--f5-text-dim)", marginTop: 6 }}>{sevDef.guidance}</div>
            </div>
            <div>
              <label className="f5-label" htmlFor="incident">Incident type</label>
              <select
                id="incident"
                className="f5-select"
                value={incidentId}
                onChange={(e) => pickIncident(e.target.value)}
              >
                {INCIDENT_GROUPS.map((g) => (
                  <optgroup key={g} label={g}>
                    {INCIDENT_TYPES.filter((i) => i.group === g).map((i) => (
                      <option key={i.id} value={i.id}>{i.icon} {i.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <div style={{ fontSize: 11.5, color: "var(--f5-text-dim)", marginTop: 6 }}>{incident.hint}</div>
            </div>
          </div>

          {/* Severity badge + override flag */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <span
              className="f5-badge"
              style={{ background: `color-mix(in srgb, ${accent} 18%, transparent)`, color: accent, borderColor: accent }}
            >
              {incident.icon} {sevDef.label}
            </span>
            {sevDef.overrideQuietHours && (
              <span className="f5-badge bad">Overrides quiet hours</span>
            )}
          </div>

          <label className="f5-label" style={{ marginTop: 12 }} htmlFor="template">Fan-out template</label>
          <select
            id="template"
            className="f5-select"
            value={templateId}
            onChange={(e) => applyTemplate(e.target.value)}
          >
            <option value="">— Start from a fan-out for {incident.label} —</option>
            {templates.filter((t) => !t.isAllClear).length > 0 && (
              <optgroup label="Alerts">
                {templates.filter((t) => !t.isAllClear).map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </optgroup>
            )}
            {templates.filter((t) => t.isAllClear).length > 0 && (
              <optgroup label="All-clear / resolved">
                {templates.filter((t) => t.isAllClear).map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </optgroup>
            )}
          </select>

          <label className="f5-label" htmlFor="subject">Headline</label>
          <input
            id="subject"
            className="f5-input"
            placeholder="Resident-facing headline…"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <label className="f5-label" htmlFor="message">Message</label>
          <textarea
            id="message"
            className="f5-textarea"
            rows={7}
            placeholder="Pick a fan-out template above, or write the emergency message. Tokens like {{building}}, {{time}}, {{contact}} are supported."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <div style={{ color: "var(--f5-text-dim)", fontSize: 12, marginTop: 12 }}>
            Channels: {incident.recommendedChannels.join(" · ")}
          </div>

          {result?.ok && (
            <div className="f5-badge ok" style={{ display: "inline-block", marginTop: 12 }}>
              ✓ Broadcast sent to {(result.sent ?? 0).toLocaleString()} recipients{result.mode === "demo" ? " (demo)" : ""}
            </div>
          )}
          {result && !result.ok && (
            <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{result.error}</div>
          )}

          <button
            type="button"
            onClick={fire}
            disabled={pending || !canBroadcast || !message.trim()}
            className="f5-btn primary"
            style={{
              background: accent,
              color: "#fff",
              marginTop: 14,
              width: "100%",
              justifyContent: "center",
              padding: "12px 14px",
              fontSize: 14,
              opacity: !canBroadcast || !message.trim() ? 0.55 : 1,
            }}
          >
            {pending
              ? "Broadcasting…"
              : `⚠ Broadcast ${sevDef.label} to ${audienceCount.toLocaleString()} recipients`}
          </button>
          <div style={{ fontSize: 11.5, color: "var(--f5-text-dim)", marginTop: 8, textAlign: "center" }}>
            Scope: {scopeLabel || "—"}
          </div>
        </div>

        {/* ---- Right: audience drill-down ---- */}
        <TargetingPanel
          properties={properties}
          propertyId={propertyId}
          onPropertyChange={(id) => { setPropertyId(id); setSelection(emptySelection()); }}
          selection={selection}
          onChange={setSelection}
        />
      </div>
    </div>
  );
}
