// Fuse5 AI Agents — the typed portfolio registry.
//
// The 7-agent portfolio from the Fuse5/TechTAP spec. This is a CATALOG only: it
// describes each agent (who it serves, which tiers bundle it, whether it needs a
// Yardi connection, what it actually does). It reads the commercial TIERS map to
// stay aligned with the rate card; it never mutates anything.
//
// Tier gating lives HERE in one place. Pages call agentsForTier(tier) to split the
// portfolio into "available on your plan" vs "upsell-locked"; the operator runtimes
// in ./actions.ts re-check the same gates server-side before calling Claude.
import type { TierKey } from "@/lib/tiers";

export type AgentId =
  | "content_composer"
  | "compliance_guardian"
  | "translation"
  | "scheduling_optimizer"
  | "tenant_inquiry"
  | "maintenance_request"
  | "emergency_broadcast";

/** Operator agents run from the staff Hub; tenant agents live in the resident portal. */
export type AgentCategory = "operator" | "tenant";
export type AgentStatus = "live" | "beta";

export interface AgentDef {
  id: AgentId;
  name: string;
  tagline: string;            // one-liner for cards
  description: string;        // 1–2 sentence "what it does"
  capability: string;         // the concrete action it performs ("Drafts …", "Translates …")
  category: AgentCategory;    // operator (Hub) vs tenant (portal)
  /** Which commercial tiers BUNDLE this agent. An agent is "available" if the org's tier is in this set. */
  tiers: TierKey[];
  /** Needs a live Yardi connection to be fully useful (compliance / work-order data). */
  yardiDependent: boolean;
  /** True when the operator runtime is wired to Claude via a server action in ./actions.ts. */
  claudeWired: boolean;
  icon: string;
  status: AgentStatus;
  /** Optional note about tier-scaled behavior (e.g. translation language count). */
  tierNote?: Partial<Record<TierKey, string>>;
}

const ALL_TIERS: TierKey[] = ["plato", "oro", "empresa"];

export const AGENTS: AgentDef[] = [
  {
    id: "content_composer",
    name: "Content Composer",
    tagline: "Drafts resident notices, newsletters, and signage copy.",
    description:
      "Turns a short brief into clear, plain-language tenant communications ready to send across email, SMS, and signage.",
    capability: "Drafts a subject + body from a topic, channel, tone, and language.",
    category: "operator",
    tiers: ALL_TIERS,
    yardiDependent: false,
    claudeWired: true,
    icon: "✍️",
    status: "live",
  },
  {
    id: "compliance_guardian",
    name: "Compliance Guardian",
    tagline: "Surfaces overdue obligations and a plain-language risk summary.",
    description:
      "Reads your compliance register (fire safety, inspections, RTA obligations) and summarizes what is overdue, what is due soon, and the next actions to take.",
    capability: "Summarizes compliance risk and recommends next actions from your live register.",
    category: "operator",
    tiers: ALL_TIERS,
    yardiDependent: true,
    claudeWired: true,
    icon: "🛡️",
    status: "live",
  },
  {
    id: "translation",
    name: "Translation",
    tagline: "Translates a message into residents' preferred languages.",
    description:
      "Translates an approved notice or message while preserving tone, dates, times, and addresses. Language coverage scales with your plan.",
    capability: "Translates a message into a target language (tier-gated language coverage).",
    category: "operator",
    tiers: ALL_TIERS, // present on all, but coverage differs — see tierNote
    yardiDependent: false,
    claudeWired: true,
    icon: "🌐",
    status: "live",
    tierNote: {
      plato: "2 languages",
      oro: "7 languages",
      empresa: "Unlimited languages",
    },
  },
  {
    id: "scheduling_optimizer",
    name: "Scheduling Optimizer",
    tagline: "Recommends the best send window and cadence per channel.",
    description:
      "Suggests the highest-engagement send time and cadence for an audience and channel, respecting quiet hours and urgency. Basic suggestions on every plan; full optimization on Empresa.",
    capability: "Recommends a send window + rationale for an audience and channel.",
    category: "operator",
    tiers: ["empresa"], // full optimizer is Empresa; basic hints ship on all (handled in copy)
    yardiDependent: false,
    claudeWired: true,
    icon: "🗓️",
    status: "beta",
    tierNote: {
      plato: "Basic send-time hints",
      oro: "Basic send-time hints",
      empresa: "Full optimizer + cadence",
    },
  },
  {
    id: "tenant_inquiry",
    name: "Tenant Inquiry",
    tagline: "Answers resident questions from your knowledge base.",
    description:
      "A resident-facing assistant that answers everyday questions (rent, amenities, policies) and routes anything property-specific to staff. Lives in the resident portal.",
    capability: "Answers resident questions in the portal and routes to staff when needed.",
    category: "tenant",
    tiers: ["oro", "empresa"],
    yardiDependent: false,
    claudeWired: false, // portal surface owns the runtime
    icon: "💬",
    status: "live",
  },
  {
    id: "maintenance_request",
    name: "Maintenance Request",
    tagline: "Turns a resident request into a triaged work order.",
    description:
      "Classifies a resident's maintenance description by category and urgency and opens a work order in Yardi. Resident-facing — lives in the portal.",
    capability: "Classifies a resident request and opens a Yardi work order.",
    category: "tenant",
    tiers: ALL_TIERS,
    yardiDependent: true,
    claudeWired: false, // portal surface + Yardi MCP own the runtime
    icon: "🔧",
    status: "beta",
  },
  {
    id: "emergency_broadcast",
    name: "Emergency Broadcast",
    tagline: "Auto-detects critical incidents and drafts emergency alerts.",
    description:
      "Composes urgent, calm, action-first safety alerts for multi-channel delivery, with an SMS-safe variant under 320 characters.",
    capability: "Drafts a calm, action-first emergency alert across SMS, email, and display.",
    category: "operator",
    tiers: ALL_TIERS,
    yardiDependent: false,
    claudeWired: true,
    icon: "🚨",
    status: "live",
  },
];

export const AGENT_BY_ID: Record<AgentId, AgentDef> =
  Object.fromEntries(AGENTS.map((a) => [a.id, a])) as Record<AgentId, AgentDef>;

/** Agents that the given tier includes (available on the plan). */
export function agentsForTier(tier: TierKey): AgentDef[] {
  return AGENTS.filter((a) => a.tiers.includes(tier));
}

/** True when this tier bundles the agent. */
export function tierHasAgent(tier: TierKey, id: AgentId): boolean {
  return Boolean(AGENT_BY_ID[id]?.tiers.includes(tier));
}

/** All agents in a category, in registry order. */
export function byCategory(category: AgentCategory): AgentDef[] {
  return AGENTS.filter((a) => a.category === category);
}

/** Human label for a tier-scaled note, if the agent defines one. */
export function tierNoteFor(agent: AgentDef, tier: TierKey): string | undefined {
  return agent.tierNote?.[tier];
}
