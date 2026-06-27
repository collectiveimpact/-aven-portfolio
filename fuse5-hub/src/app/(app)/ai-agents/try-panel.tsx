"use client";

import { useMemo, useState } from "react";
import {
  AGENTS,
  type AgentDef,
  type AgentId,
} from "@/lib/ai-agents/registry";
import type { TierKey } from "@/lib/tiers";
import {
  runContentComposer,
  runTranslator,
  runComplianceGuardian,
  runSchedulingOptimizer,
  runEmergencyBroadcast,
  type AgentResult,
} from "@/lib/ai-agents/actions";

// Interactive "Try it" for the OPERATOR agents. Each agent has its own input form;
// Run calls the matching server action (Claude-backed, graceful stub) and shows the
// output with a clear demo note when mode === "stub". Tenant-facing agents render a
// "lives in the resident portal" note instead of a try box.

type Channel = "email" | "sms" | "display" | "multi";

const CHANNELS: { value: Channel; label: string }[] = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "display", label: "Signage" },
  { value: "multi", label: "All channels" },
];

const TONES = ["warm and professional", "formal", "friendly", "urgent", "neutral"];

export default function TryPanel({ currentTier }: { currentTier: TierKey }) {
  // Operator agents the org's plan includes — these are the runnable ones.
  const runnable = useMemo(
    () => AGENTS.filter((a) => a.category === "operator" && a.tiers.includes(currentTier)),
    [currentTier],
  );
  const lockedOps = useMemo(
    () => AGENTS.filter((a) => a.category === "operator" && !a.tiers.includes(currentTier)),
    [currentTier],
  );
  const tenantAgents = useMemo(() => AGENTS.filter((a) => a.category === "tenant"), []);

  const [agentId, setAgentId] = useState<AgentId>(runnable[0]?.id ?? "content_composer");
  const active: AgentDef | undefined = useMemo(
    () => AGENTS.find((a) => a.id === agentId),
    [agentId],
  );

  // Per-agent input state.
  const [composerTopic, setComposerTopic] = useState("");
  const [composerChannel, setComposerChannel] = useState<Channel>("email");
  const [composerTone, setComposerTone] = useState(TONES[0]);
  const [composerLang, setComposerLang] = useState("English");

  const [transText, setTransText] = useState("");
  const [transLang, setTransLang] = useState("French");

  const [schedAudience, setSchedAudience] = useState("");
  const [schedChannel, setSchedChannel] = useState<Channel>("multi");

  const [emergency, setEmergency] = useState("");

  const [result, setResult] = useState<AgentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectAgent(id: AgentId) {
    setAgentId(id);
    setResult(null);
    setError(null);
  }

  const canRun = (() => {
    switch (agentId) {
      case "content_composer":
        return composerTopic.trim().length > 0;
      case "translation":
        return transText.trim().length > 0 && transLang.trim().length > 0;
      case "emergency_broadcast":
        return emergency.trim().length > 0;
      case "compliance_guardian":
      case "scheduling_optimizer":
        return true;
      default:
        return false;
    }
  })();

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      let res: AgentResult;
      switch (agentId) {
        case "content_composer":
          res = await runContentComposer({
            topic: composerTopic,
            channel: composerChannel,
            tone: composerTone,
            language: composerLang,
          });
          break;
        case "translation":
          res = await runTranslator({ text: transText, targetLanguage: transLang });
          break;
        case "compliance_guardian":
          res = await runComplianceGuardian();
          break;
        case "scheduling_optimizer":
          res = await runSchedulingOptimizer({ audience: schedAudience, channel: schedChannel });
          break;
        case "emergency_broadcast":
          res = await runEmergencyBroadcast({ incident: emergency });
          break;
        default:
          throw new Error("This agent has no Hub runtime.");
      }
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="f5-card">
      {/* Agent picker — only runnable operator agents on this plan */}
      <label className="f5-label">Operator agent</label>
      <div className="f5-chips" style={{ marginBottom: 4 }}>
        {runnable.map((a) => (
          <button
            key={a.id}
            type="button"
            className={`f5-chip ${a.id === agentId ? "active" : ""}`}
            onClick={() => selectAgent(a.id)}
          >
            <span style={{ marginRight: 6 }}>{a.icon}</span>
            {a.name}
          </button>
        ))}
      </div>

      {active && (
        <div style={{ fontSize: 12.5, color: "var(--f5-text-secondary)", margin: "6px 0 4px" }}>
          {active.capability}
        </div>
      )}

      {/* Per-agent inputs */}
      {agentId === "content_composer" && (
        <>
          <label className="f5-label">Topic / brief</label>
          <textarea
            className="f5-textarea"
            rows={3}
            placeholder="e.g. Water shut-off Saturday 9am–12pm in Building B; fill a container beforehand."
            value={composerTopic}
            onChange={(e) => setComposerTopic(e.target.value)}
          />
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="f5-label">Channel</label>
              <select className="f5-select" value={composerChannel} onChange={(e) => setComposerChannel(e.target.value as Channel)}>
                {CHANNELS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="f5-label">Tone</label>
              <select className="f5-select" value={composerTone} onChange={(e) => setComposerTone(e.target.value)}>
                {TONES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label className="f5-label">Language</label>
              <input className="f5-select" value={composerLang} onChange={(e) => setComposerLang(e.target.value)} placeholder="English" />
            </div>
          </div>
        </>
      )}

      {agentId === "translation" && (
        <>
          <label className="f5-label">Message to translate</label>
          <textarea
            className="f5-textarea"
            rows={4}
            placeholder="Paste an approved notice or message…"
            value={transText}
            onChange={(e) => setTransText(e.target.value)}
          />
          <label className="f5-label">Target language</label>
          <input
            className="f5-select"
            value={transLang}
            onChange={(e) => setTransLang(e.target.value)}
            placeholder="e.g. French, Spanish, Simplified Chinese"
          />
        </>
      )}

      {agentId === "scheduling_optimizer" && (
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 2, minWidth: 180 }}>
            <label className="f5-label">Audience</label>
            <input
              className="f5-select"
              value={schedAudience}
              onChange={(e) => setSchedAudience(e.target.value)}
              placeholder="e.g. all active residents, Building B seniors"
            />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <label className="f5-label">Channel</label>
            <select className="f5-select" value={schedChannel} onChange={(e) => setSchedChannel(e.target.value as Channel)}>
              {CHANNELS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {agentId === "emergency_broadcast" && (
        <>
          <label className="f5-label">Incident</label>
          <textarea
            className="f5-textarea"
            rows={3}
            placeholder="e.g. Fire alarm activated at Northgate Tower, residents must evacuate."
            value={emergency}
            onChange={(e) => setEmergency(e.target.value)}
          />
        </>
      )}

      {agentId === "compliance_guardian" && (
        <div style={{ fontSize: 13, color: "var(--f5-text-secondary)", marginTop: 6 }}>
          Reads your live compliance register and summarizes overdue obligations, what&apos;s due soon, and the next
          actions to take. No input needed — just run it.
        </div>
      )}

      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button className="f5-btn primary" type="button" onClick={run} disabled={loading || !canRun}>
          {loading ? "Running…" : "Run agent"}
        </button>
        {result?.mode === "stub" && (
          <span className="f5-warn" style={{ fontSize: 12 }}>
            Demo (stub) — sample response. Set ANTHROPIC_API_KEY for live Claude output.
          </span>
        )}
        {result?.mode === "live" && (
          <span className="f5-live" style={{ fontSize: 12 }}>Live — Claude</span>
        )}
      </div>

      {error && <div style={{ marginTop: 14, color: "var(--f5-red)", fontSize: 13 }}>{error}</div>}

      {result && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            background: "var(--f5-surface-2)",
            border: "1px solid var(--f5-border)",
            borderRadius: 8,
            whiteSpace: "pre-wrap",
            fontSize: 13.5,
            lineHeight: 1.55,
            color: "var(--f5-text)",
          }}
        >
          {result.text}
        </div>
      )}

      {/* Locked operator agents on this plan */}
      {lockedOps.length > 0 && (
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--f5-border)" }}>
          <div style={{ fontSize: 12, color: "var(--f5-text-secondary)", marginBottom: 8 }}>
            Not on your plan — upgrade to unlock:
          </div>
          <div className="f5-chips">
            {lockedOps.map((a) => (
              <span key={a.id} className="f5-pill" style={{ opacity: 0.6 }}>
                {a.icon} {a.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tenant-facing agents live in the resident portal */}
      <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--f5-border)" }}>
        <div style={{ fontSize: 12, color: "var(--f5-text-secondary)", marginBottom: 8 }}>
          Resident-facing agents — these run in the resident portal, not here:
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {tenantAgents.map((a) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontSize: 13,
                color: "var(--f5-text-secondary)",
                background: "var(--f5-surface-2)",
                border: "1px solid var(--f5-border)",
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              <span style={{ fontSize: 18 }}>{a.icon}</span>
              <span style={{ color: "var(--f5-text)", fontWeight: 600 }}>{a.name}</span>
              <span>— lives in the resident portal.</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
