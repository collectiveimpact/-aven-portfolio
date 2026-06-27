"use client";

import {
  ESCALATION_CHAIN,
  FANOUT_CRITERIA,
  INCIDENT_PHASES,
  RESPONSE_LEVELS,
  RESPONSE_LEVEL_BY_ID,
  INCIDENT_PHASE_BY_ID,
  type FanoutCriterionId,
  type PhaseId,
  type ResponseLevelId,
} from "@/lib/emergency/escalation";

interface Props {
  responseLevel: ResponseLevelId;
  onResponseLevel: (id: ResponseLevelId) => void;
  phase: PhaseId;
  onPhase: (id: PhaseId) => void;
  flaggedCriteria: FanoutCriterionId[];
  onToggleCriterion: (id: FanoutCriterionId) => void;
  fanoutRequired: boolean;
}

export function EscalationPanel({
  responseLevel,
  onResponseLevel,
  phase,
  onPhase,
  flaggedCriteria,
  onToggleCriterion,
  fanoutRequired,
}: Props) {
  const level = RESPONSE_LEVEL_BY_ID[responseLevel];
  const phaseDef = INCIDENT_PHASE_BY_ID[phase];
  const accent = level.colorToken;

  return (
    <div className="f5-card" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="f5-dot" style={{ background: accent, marginTop: 0 }} />
        <div className="f5-section-title" style={{ margin: 0 }}>
          Crisis Escalation
        </div>
      </div>
      <div style={{ color: "var(--f5-text-secondary)", fontSize: 12.5, marginTop: 8 }}>
        Set the response level and incident phase. If the event meets fan-out criteria, the
        notification chain is surfaced below and flagged on the broadcast.
      </div>

      {/* ---- Response Level selector ---- */}
      <label className="f5-label" style={{ marginTop: 14 }}>Response level</label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {RESPONSE_LEVELS.map((l) => {
          const active = l.id === responseLevel;
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onResponseLevel(l.id)}
              className="f5-btn"
              style={{
                flex: "1 1 0",
                minWidth: 110,
                justifyContent: "center",
                flexDirection: "column",
                gap: 2,
                padding: "8px 10px",
                borderColor: active ? l.colorToken : "var(--f5-border)",
                background: active
                  ? `color-mix(in srgb, ${l.colorToken} 16%, transparent)`
                  : "transparent",
                color: active ? l.colorToken : "var(--f5-text)",
              }}
            >
              <span style={{ fontWeight: 700, fontSize: 13 }}>{l.label}</span>
              <span style={{ fontSize: 10.5, color: "var(--f5-text-dim)" }}>{l.tagline}</span>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--f5-text-dim)", marginTop: 8, lineHeight: 1.5 }}>
        {level.definition}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {level.engaged.map((e) => (
          <span key={e} className="f5-badge" style={{ fontSize: 11 }}>{e}</span>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--f5-text-secondary)", marginTop: 8, fontStyle: "italic" }}>
        {level.ertPosture}
      </div>

      {/* ---- Phase indicator / stepper ---- */}
      <label className="f5-label" style={{ marginTop: 16 }}>Incident phase</label>
      <div style={{ display: "flex", gap: 6 }}>
        {INCIDENT_PHASES.map((p, i) => {
          const active = p.id === phase;
          const past = INCIDENT_PHASE_BY_ID[phase].num > p.num;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onPhase(p.id)}
              className="f5-btn"
              style={{
                flex: 1,
                justifyContent: "center",
                gap: 6,
                padding: "8px 6px",
                borderColor: active ? "var(--f5-teal)" : "var(--f5-border)",
                background: active
                  ? "color-mix(in srgb, var(--f5-teal) 16%, transparent)"
                  : past
                  ? "color-mix(in srgb, var(--f5-teal) 7%, transparent)"
                  : "transparent",
                color: active ? "var(--f5-teal)" : "var(--f5-text)",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  fontSize: 11,
                  fontWeight: 700,
                  background: active || past ? "var(--f5-teal)" : "var(--f5-border)",
                  color: active || past ? "#fff" : "var(--f5-text-dim)",
                }}
              >
                {p.num}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{p.label.split("—")[1]?.trim() ?? p.label}</span>
            </button>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--f5-text-dim)", marginTop: 8, lineHeight: 1.5 }}>
        <strong style={{ color: "var(--f5-text-secondary)" }}>{phaseDef.window}.</strong>{" "}
        {phaseDef.whatHappens}
      </div>
      <div style={{ fontSize: 11.5, color: "var(--f5-text-secondary)", marginTop: 4 }}>
        Focus: {phaseDef.focus}
      </div>

      {/* ---- Fan-out criteria ---- */}
      <label className="f5-label" style={{ marginTop: 16 }}>Fan-out criteria</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {FANOUT_CRITERIA.map((c) => {
          const on = flaggedCriteria.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onToggleCriterion(c.id)}
              className="f5-btn"
              style={{
                justifyContent: "flex-start",
                gap: 8,
                padding: "8px 10px",
                textAlign: "left",
                borderColor: on ? "var(--f5-red)" : "var(--f5-border)",
                background: on ? "color-mix(in srgb, var(--f5-red) 12%, transparent)" : "transparent",
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  border: `1.5px solid ${on ? "var(--f5-red)" : "var(--f5-border)"}`,
                  background: on ? "var(--f5-red)" : "transparent",
                  color: "#fff",
                  fontSize: 11,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: "0 0 auto",
                }}
              >
                {on ? "✓" : ""}
              </span>
              <span style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: on ? "var(--f5-red)" : "var(--f5-text)" }}>
                  {c.label}
                </span>
                <span style={{ fontSize: 10.5, color: "var(--f5-text-dim)" }}>{c.examples}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* ---- Fan-out required flag + notification chain ---- */}
      {fanoutRequired && (
        <div
          className="f5-card"
          style={{
            marginTop: 14,
            borderColor: "color-mix(in srgb, var(--f5-red) 50%, transparent)",
            background: "color-mix(in srgb, var(--f5-red) 7%, transparent)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="f5-badge bad" style={{ fontWeight: 700 }}>⚠ Fan-out required</span>
            <span style={{ fontSize: 12, color: "var(--f5-text-secondary)" }}>
              This incident meets fan-out criteria. Notify the chain in order:
            </span>
          </div>
          <ol style={{ listStyle: "none", margin: "12px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
            {ESCALATION_CHAIN.map((r) => (
              <li key={r.step} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span
                  style={{
                    flex: "0 0 auto",
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: r.initiatesFanout ? "var(--f5-red)" : "var(--f5-border)",
                    color: r.initiatesFanout ? "#fff" : "var(--f5-text)",
                    fontSize: 11,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginTop: 1,
                  }}
                >
                  {r.step}
                </span>
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--f5-text)" }}>
                    {r.role}
                    {r.initiatesFanout && (
                      <span className="f5-badge bad" style={{ marginLeft: 6, fontSize: 10 }}>
                        Initiates fan-out
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--f5-text-dim)", lineHeight: 1.45 }}>{r.action}</span>
                  <span style={{ fontSize: 11, color: "var(--f5-text-secondary)", marginTop: 2 }}>
                    → Notifies: {r.notifies}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
