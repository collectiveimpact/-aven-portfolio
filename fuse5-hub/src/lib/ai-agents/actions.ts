"use server";

// Fuse5 AI Agents — Claude-backed runtimes for the OPERATOR agents.
//
// Each export is a server action: it builds a well-crafted prompt and calls the
// shared `generateText` from @/lib/ai (Claude-backed; graceful deterministic stub
// when ANTHROPIC_API_KEY is unset — it returns {text, mode:"live"|"stub"}). We pass
// that {text, mode} straight back to the client so the UI can flag demo output.
//
// Tier gating is re-checked here, server-side, so the runtime can never run an
// agent the org's plan doesn't include — even if a client sent a forged id. The
// portfolio source of truth is ../registry. Tenant-facing agents (Tenant Inquiry,
// Maintenance Request) deliberately have NO runtime here: they live in the resident
// portal, wired to that surface + the Yardi MCP.
import { generateText } from "@/lib/ai";
import { getCompliance, getEnabledModules } from "@/lib/queries"; // READ-ONLY imports — never edited here
import { tierFromModules, type TierKey } from "@/lib/tiers";
import { AGENT_BY_ID, type AgentId } from "./registry";

export interface AgentResult {
  text: string;
  mode: "live" | "stub";
}

// --- tier gate ---------------------------------------------------------------
// Resolve the org's current tier from its enabled module set (same inference the
// admin tier-panel uses). Unknown/custom sets fall back to the richest tier so we
// never wrongly hard-block an operator who has a bespoke plan.
async function currentTier(): Promise<TierKey> {
  try {
    const enabled = await getEnabledModules();
    return tierFromModules(enabled) ?? "empresa";
  } catch {
    return "empresa";
  }
}

function locked(agentName: string, tier: TierKey): AgentResult {
  const t = tier.charAt(0).toUpperCase() + tier.slice(1);
  return {
    mode: "stub",
    text: `${agentName} isn't included on your current plan (${t}). Upgrade to unlock this agent.`,
  };
}

/** Gate helper: returns null when allowed, or a locked AgentResult when the tier lacks the agent. */
async function gate(id: AgentId): Promise<AgentResult | null> {
  const agent = AGENT_BY_ID[id];
  const tier = await currentTier();
  if (!agent.tiers.includes(tier)) return locked(agent.name, tier);
  return null;
}

// --- Agent 1 · Content Composer ----------------------------------------------
export interface ComposerInput {
  topic: string;
  channel?: "email" | "sms" | "display" | "multi";
  tone?: string;
  language?: string;
}
export async function runContentComposer(input: ComposerInput): Promise<AgentResult> {
  const blocked = await gate("content_composer");
  if (blocked) return blocked;

  const topic = input.topic.trim();
  if (!topic) return { mode: "stub", text: "Add a topic to draft a notice." };

  const channel = input.channel ?? "email";
  const tone = input.tone?.trim() || "warm and professional";
  const language = input.language?.trim() || "English";
  const channelGuide =
    channel === "sms"
      ? "Format for SMS: under 320 characters, no subject line, one clear action."
      : channel === "display"
        ? "Format for lobby signage: a short headline (<=140 characters), high-glance readability."
        : channel === "multi"
          ? "Provide an email subject + body, then a short SMS variant, then a one-line signage headline."
          : "Format as an email: a clear subject line, a courteous greeting, the details, and a clear call to action.";

  const prompt = `You are Fuse5's Content Composer for affordable-housing tenant communications.
Write a clear, ${tone}, plain-language message in ${language}.

Topic / brief: ${topic}
Target channel: ${channel}
${channelGuide}

Lead with the most important information. Use plain language a resident can act on. No preamble, no meta-commentary — return only the finished message${channel === "email" || channel === "multi" ? ", starting with a 'Subject:' line" : ""}.`;

  return generateText(prompt);
}

// --- Agent 3 · Translation ----------------------------------------------------
export interface TranslatorInput {
  text: string;
  targetLanguage: string;
}
export async function runTranslator(input: TranslatorInput): Promise<AgentResult> {
  const blocked = await gate("translation");
  if (blocked) return blocked;

  const text = input.text.trim();
  const target = input.targetLanguage.trim();
  if (!text) return { mode: "stub", text: "Add a message to translate." };
  if (!target) return { mode: "stub", text: "Choose a target language." };

  const prompt = `You are Fuse5's Translation agent for property communications.
Translate the message below into ${target}.

Rules:
- Preserve tone, meaning, and any dates, times, addresses, and amounts exactly.
- Keep it natural for a resident audience, not literal/word-for-word.
- Return ONLY the translation — no notes, no the original text, no language label.

Message:
${text}`;

  return generateText(prompt);
}

// --- Agent 2 · Compliance Guardian -------------------------------------------
// Reads the org's compliance register (READ-ONLY via getCompliance) and asks Claude
// to summarize risk + next actions. When there is no Claude key, generateText's stub
// still yields a usable summary; we also fold the real counts into the prompt so the
// live answer is grounded in actual data.
export async function runComplianceGuardian(): Promise<AgentResult> {
  const blocked = await gate("compliance_guardian");
  if (blocked) return blocked;

  let rows: Awaited<ReturnType<typeof getCompliance>> = [];
  try {
    rows = await getCompliance();
  } catch {
    rows = [];
  }

  if (!rows.length) {
    return {
      mode: "stub",
      text: "No compliance items found for your account. Connect Yardi or add obligations to your register to get a risk summary.",
    };
  }

  const overdue = rows.filter((r) => r.status === "overdue");
  const dueSoon = rows.filter((r) => r.status === "due_soon");
  const compliant = rows.filter((r) => r.status === "compliant");

  const fmt = (r: (typeof rows)[number]) => `- ${r.kind} · ${r.propertyName} · due ${r.due} · ${r.status}`;
  const register = rows.slice(0, 40).map(fmt).join("\n");

  const prompt = `You are Fuse5's Compliance Guardian for an affordable-housing provider.
Below is the live compliance register. Produce a short operator-ready risk summary.

Counts: ${overdue.length} overdue, ${dueSoon.length} due soon, ${compliant.length} compliant (of ${rows.length} total).

Register:
${register}

Write:
1. A one-line headline risk verdict.
2. "Overdue now" — the overdue items that need action today (most urgent first).
3. "Due soon" — what's coming up.
4. "Next actions" — 3–5 concrete, prioritized steps for staff.
Be concise and specific. This is operational guidance, not legal advice.`;

  return generateText(prompt);
}

// --- Agent 4 · Scheduling Optimizer ------------------------------------------
export interface SchedulerInput {
  audience?: string;
  channel?: "email" | "sms" | "display" | "multi";
}
export async function runSchedulingOptimizer(input: SchedulerInput): Promise<AgentResult> {
  const blocked = await gate("scheduling_optimizer");
  if (blocked) return blocked;

  const audience = input.audience?.trim() || "all active residents";
  const channel = input.channel ?? "multi";

  const prompt = `You are Fuse5's Scheduling Optimizer for resident communications.
Recommend the best send window and cadence for high engagement, respecting quiet hours (no SMS before 9am or after 9pm) and resident routines.

Audience: ${audience}
Channel(s): ${channel}

Return:
- A recommended send window per channel (day + time), each with a one-line rationale.
- A suggested cadence (one-off vs. reminder sequence) if relevant.
- A short "avoid" note (times/days to skip).
Keep it tight and operator-ready.`;

  return generateText(prompt);
}

// --- Agent 7 · Emergency Broadcast -------------------------------------------
export interface EmergencyInput {
  incident: string;
}
export async function runEmergencyBroadcast(input: EmergencyInput): Promise<AgentResult> {
  const blocked = await gate("emergency_broadcast");
  if (blocked) return blocked;

  const incident = input.incident.trim();
  if (!incident) return { mode: "stub", text: "Describe the incident to draft an emergency alert." };

  const prompt = `You are Fuse5's Emergency Broadcast composer for an affordable-housing property.
Draft an urgent, calm, action-first safety alert for multi-channel delivery.

Incident: ${incident}

Return three labeled variants:
- SMS: under 320 characters. Lead with the action ("Evacuate now via…"), then where to go, then where to get updates.
- Email/Push: a short subject line + 3–5 sentence body.
- Display: a single high-glance headline line.
Stay calm and directive. Tell residents what to DO first, then why. Do not invent facts not in the incident.`;

  return generateText(prompt);
}
