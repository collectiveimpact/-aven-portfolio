import { hasAI } from "@/lib/env";
import { getEnabledModules } from "@/lib/queries";
import { TIERS, TIER_ORDER, tierFromModules, type TierKey } from "@/lib/tiers";
import {
  byCategory,
  tierNoteFor,
  type AgentDef,
} from "@/lib/ai-agents/registry";
import TryPanel from "./try-panel";

// AI Agents — async server component (Next 16). Renders the 7-agent portfolio as
// rich cards grouped Operator vs Tenant-facing, gated against the org's CURRENT
// commercial tier (inferred from its enabled module set). Operator agents are
// runnable from the Try panel; tenant agents point to the resident portal.

const TIER_DOT: Record<TierKey, string> = {
  plato: "var(--f5-blue)",
  oro: "var(--f5-purple)",
  empresa: "var(--f5-coral)",
};

function TierBadges({ agent, current }: { agent: AgentDef; current: TierKey }) {
  return (
    <div className="f5-chips" style={{ marginTop: 10 }}>
      {TIER_ORDER.map((t) => {
        const included = agent.tiers.includes(t);
        const note = tierNoteFor(agent, t);
        const isCurrent = t === current;
        return (
          <span
            key={t}
            className="f5-pill"
            title={
              included
                ? `Included on ${TIERS[t].label}${note ? ` — ${note}` : ""}`
                : `Not on ${TIERS[t].label}`
            }
            style={{
              opacity: included ? 1 : 0.4,
              borderColor: isCurrent ? TIER_DOT[t] : "var(--f5-border)",
              color: included ? "var(--f5-text)" : "var(--f5-text-secondary)",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: included ? TIER_DOT[t] : "var(--f5-border)",
                display: "inline-block",
              }}
            />
            {TIERS[t].label}
            {note ? <span style={{ opacity: 0.7, fontSize: 10 }}>· {note}</span> : null}
          </span>
        );
      })}
    </div>
  );
}

function AgentCard({ agent, current }: { agent: AgentDef; current: TierKey }) {
  const available = agent.tiers.includes(current);
  const note = tierNoteFor(agent, current);
  return (
    <div
      className="f5-card"
      style={{
        position: "relative",
        opacity: available ? 1 : 0.72,
        borderColor: available ? "var(--f5-border)" : "var(--f5-border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 26, lineHeight: 1 }}>{agent.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
            {agent.name}
            <span className={`f5-badge ${agent.status === "live" ? "ok" : "warn"}`}>
              {agent.status === "live" ? "Live" : "Beta"}
            </span>
          </div>
          <div style={{ color: "var(--f5-text-secondary)", fontSize: 12.5, marginTop: 3 }}>
            {agent.tagline}
          </div>
        </div>
        <span
          className={`f5-badge ${available ? "ok" : "warn"}`}
          title={available ? "Available on your plan" : `Upgrade to unlock`}
        >
          {available ? "On your plan" : "Locked"}
        </span>
      </div>

      <div style={{ color: "var(--f5-text-secondary)", fontSize: 13, lineHeight: 1.5 }}>
        {agent.description}
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 12.5,
          color: "var(--f5-text)",
          background: "var(--f5-surface-2)",
          border: "1px solid var(--f5-border)",
          borderRadius: 8,
          padding: "8px 10px",
        }}
      >
        <span style={{ color: "var(--f5-text-secondary)" }}>What it does · </span>
        {agent.capability}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
        {agent.yardiDependent && (
          <span className="f5-badge warn" title="Needs a live Yardi connection for full data">
            Yardi-dependent
          </span>
        )}
        <span className="f5-badge" title={agent.category === "operator" ? "Runs from the staff Hub" : "Resident-facing — lives in the portal"}>
          {agent.category === "operator" ? "Operator" : "Tenant-facing"}
        </span>
        {agent.claudeWired ? (
          <span className="f5-badge ok" title="Wired to Claude in this Hub">Claude-wired</span>
        ) : (
          <span className="f5-badge" title="Runtime lives in the resident portal">Portal runtime</span>
        )}
        {note && (
          <span className="f5-badge" title="Behavior on your current plan">
            Your plan: {note}
          </span>
        )}
      </div>

      <TierBadges agent={agent} current={current} />
    </div>
  );
}

export default async function AiAgentsPage() {
  const enabled = await getEnabledModules();
  const currentTier: TierKey = tierFromModules(enabled) ?? "empresa";
  const tierDef = TIERS[currentTier];

  const operators = byCategory("operator");
  const tenants = byCategory("tenant");
  const availableCount = [...operators, ...tenants].filter((a) => a.tiers.includes(currentTier)).length;

  return (
    <main className="f5-content">
      <div className="f5-page-title">AI Agents</div>
      <div className="f5-page-sub">
        Seven purpose-built agents for property communications.{" "}
        {hasAI ? (
          <span className="f5-live">Live — connected to Claude</span>
        ) : (
          <span className="f5-warn">Demo mode — set ANTHROPIC_API_KEY for live responses</span>
        )}
      </div>

      <div
        className="f5-card"
        style={{ marginTop: 14, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, justifyContent: "space-between" }}
      >
        <div>
          <div style={{ fontSize: 12, color: "var(--f5-text-secondary)" }}>Your plan</div>
          <div style={{ fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: TIER_DOT[currentTier], display: "inline-block" }} />
            {tierDef.label}
            <span style={{ fontWeight: 400, fontSize: 12.5, color: "var(--f5-text-secondary)" }}>{tierDef.tagline}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "var(--f5-text-secondary)" }}>Agents on this plan</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            {availableCount} <span style={{ fontWeight: 400, color: "var(--f5-text-secondary)" }}>of {operators.length + tenants.length}</span>
          </div>
        </div>
      </div>

      <div className="f5-section-title">Operator agents</div>
      <div style={{ color: "var(--f5-text-secondary)", fontSize: 12.5, marginTop: -4, marginBottom: 10 }}>
        Run from the staff Hub. Try them live below.
      </div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
        {operators.map((a) => (
          <AgentCard key={a.id} agent={a} current={currentTier} />
        ))}
      </div>

      <div className="f5-section-title">Tenant-facing agents</div>
      <div style={{ color: "var(--f5-text-secondary)", fontSize: 12.5, marginTop: -4, marginBottom: 10 }}>
        Resident-facing — these live in the resident portal, not the staff Hub.
      </div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
        {tenants.map((a) => (
          <AgentCard key={a.id} agent={a} current={currentTier} />
        ))}
      </div>

      <div className="f5-section-title">Try an operator agent</div>
      <TryPanel currentTier={currentTier} />
    </main>
  );
}
