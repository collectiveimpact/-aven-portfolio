import type { AgentDef } from "@/lib/types";
import { hasAI } from "@/lib/env";
import TryPanel from "./try-panel";

// AI Agents — async server component. The 7 agents are typed AgentDef and shared
// with the client TryPanel below.

export const AGENTS: AgentDef[] = [
  { key: "content_composer", name: "Content Composer", tagline: "Drafts resident notices, newsletters, and signage copy.", ico: "✍️", status: "live" },
  { key: "compliance_guardian", name: "Compliance Guardian", tagline: "Checks notices against Ontario RTA & N-form rules.", ico: "🛡️", status: "live" },
  { key: "translation", name: "Translation", tagline: "Translates messages into residents' preferred languages.", ico: "🌐", status: "live" },
  { key: "scheduling_optimizer", name: "Scheduling Optimizer", tagline: "Picks the best send window for each channel and audience.", ico: "🗓️", status: "beta" },
  { key: "tenant_inquiry", name: "Tenant Inquiry", tagline: "Answers resident questions from your knowledge base.", ico: "💬", status: "live" },
  { key: "maintenance_request", name: "Maintenance Request", tagline: "Triages and routes work orders by category and urgency.", ico: "🔧", status: "beta" },
  { key: "emergency_broadcast", name: "Emergency Broadcast", tagline: "Composes urgent multi-channel safety alerts fast.", ico: "🚨", status: "live" },
];

export default async function AiAgentsPage() {
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

      <div className="f5-section-title">Agent Library</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {AGENTS.map((a) => (
          <div key={a.key} className="f5-card">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <span style={{ fontSize: 26 }}>{a.ico}</span>
              <div style={{ flex: 1, fontWeight: 700, fontSize: 15 }}>{a.name}</div>
              <span className={`f5-badge ${a.status === "live" ? "ok" : "warn"}`}>{a.status === "live" ? "Live" : "Beta"}</span>
            </div>
            <div style={{ color: "var(--f5-text-secondary)", fontSize: 13 }}>{a.tagline}</div>
          </div>
        ))}
      </div>

      <div className="f5-section-title">Try an Agent</div>
      <TryPanel agents={AGENTS} />
    </main>
  );
}
