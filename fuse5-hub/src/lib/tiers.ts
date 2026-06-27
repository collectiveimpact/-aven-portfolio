// Fuse5 commercial tiers — the rate card, mapped onto the module registry.
//
// Each tier names a SET of MODULE KEYS it turns on. The actual activated set is
// always the resolved set (deps + core folded in) via `modulesForTier`, so the
// list a tier declares can be "headline" modules and dependencies still come
// along for free — exactly like saveEnabledModules stores it.
//
// This file is a CATALOG only: it reads MODULES/MODULE_BY_KEY/resolveEnabled and
// never mutates them. Applying a tier is the tier-panel's job (it calls the
// existing saveEnabledModules with `modulesForTier(tier)`).
import { MODULES, MODULE_BY_KEY, resolveEnabled } from "@/lib/modules";

export type TierKey = "plato" | "oro" | "empresa";

export interface AiAgent {
  key: string;
  label: string;
}

export interface TierDef {
  key: TierKey;
  label: string;
  tagline: string;
  monthly: number;            // recurring USD / mo
  monthlyLabel: string;       // display string (handles "custom")
  impl: number | null;        // one-time implementation USD; null = custom
  implLabel: string;
  messagesIncluded: number | null; // null = custom / unmetered
  messagesLabel: string;
  support: string;
  templates: number | null;   // null = unlimited
  templatesLabel: string;
  signageEndpoints: number | null; // included signage players/zones; null = multiple/unlimited
  signageLabel: string;
  /** Headline module keys this tier turns on (deps auto-included on apply). */
  modules: string[];
  /** AI agents bundled with the tier. */
  agents: AiAgent[];
  /** Marketing bullets, for the comparison card. */
  highlights: string[];
}

// --- AI agent catalog (from the Fuse5 rate card) -------------------------------
const AGENT = {
  contentComposer: { key: "content-composer", label: "Content Composer" },
  emergencyBroadcast: { key: "emergency-broadcast", label: "Emergency Broadcast" },
  translation2: { key: "translation-2", label: "Translation (2 languages)" },
  tenantInquiry: { key: "tenant-inquiry", label: "Tenant Inquiry" },
  translation7: { key: "translation-7", label: "Translation (7 languages)" },
  schedulingOptimizer: { key: "scheduling-optimizer", label: "Scheduling Optimizer" },
  translationUnlimited: { key: "translation-unlimited", label: "Translation (unlimited)" },
} satisfies Record<string, AiAgent>;

// --- Module sets per tier ------------------------------------------------------
// PLATO — the communicate-and-residents core + signage library (no live signage
// endpoint), templates, plus the AI agents that map to its surfaces. Mirrors the
// light starter set, minus Displays (no signage endpoint on Plato).
const PLATO_MODULES = [
  "overview", "dashboard",
  "compose", "templates", "calendar", "inbox", "emergency",
  "tenants", "contacts",
  "content",            // signage content library, but no Displays endpoint
  "channels",
  "ai-agents",
  "admin", "settings",
];

// ORO — everything in Plato, plus the journeys/segments/analytics/properties/
// workorders/compliance feature set, surveys, and ONE signage endpoint (Displays).
const ORO_MODULES = [
  ...PLATO_MODULES,
  "analytics",
  "journeys", "segments",
  "surveys",
  "displays",           // 1 signage endpoint
  "properties", "workorders", "frontline", "compliance",
  "integrations",
];

// EMPRESA — everything on. Built straight from the registry so it can never drift.
const EMPRESA_MODULES = MODULES.map((m) => m.key);

export const TIERS: Record<TierKey, TierDef> = {
  plato: {
    key: "plato",
    label: "Plato",
    tagline: "Essential resident communication.",
    monthly: 799,
    monthlyLabel: "$799/mo",
    impl: 2499,
    implLabel: "$2,499 implementation",
    messagesIncluded: 3000,
    messagesLabel: "3,000 messages/mo",
    support: "Email support",
    templates: 3,
    templatesLabel: "3 templates",
    signageEndpoints: 0,
    signageLabel: "No signage endpoint",
    modules: PLATO_MODULES,
    agents: [AGENT.contentComposer, AGENT.emergencyBroadcast, AGENT.translation2],
    highlights: [
      "Compose broadcasts + Emergency",
      "Residents & Contacts directory",
      "Content library (no live displays)",
      "Email support",
    ],
  },
  oro: {
    key: "oro",
    label: "Oro",
    tagline: "Communication plus property operations.",
    monthly: 999,
    monthlyLabel: "$999/mo",
    impl: 2999,
    implLabel: "$2,999 implementation",
    messagesIncluded: 5000,
    messagesLabel: "5,000 messages/mo",
    support: "Priority support",
    templates: 6,
    templatesLabel: "6 templates",
    signageEndpoints: 1,
    signageLabel: "1 signage endpoint",
    modules: ORO_MODULES,
    agents: [
      AGENT.contentComposer,
      AGENT.emergencyBroadcast,
      AGENT.tenantInquiry,
      AGENT.translation7,
    ],
    highlights: [
      "Everything in Plato",
      "Journeys, Segments & Analytics",
      "Properties, Work Orders, Compliance",
      "1 signage endpoint (Displays) + Surveys",
      "Tenant Inquiry agent · Translation (7 lang)",
    ],
  },
  empresa: {
    key: "empresa",
    label: "Empresa",
    tagline: "The full platform, dedicated SLA.",
    monthly: 1999,
    monthlyLabel: "$1,999/mo",
    impl: null,
    implLabel: "Custom implementation",
    messagesIncluded: null,
    messagesLabel: "Custom message volume",
    support: "Dedicated SLA",
    templates: null,
    templatesLabel: "Unlimited templates",
    signageEndpoints: null,
    signageLabel: "Multiple signage zones",
    modules: EMPRESA_MODULES,
    agents: [
      AGENT.contentComposer,
      AGENT.emergencyBroadcast,
      AGENT.tenantInquiry,
      AGENT.schedulingOptimizer,
      AGENT.translationUnlimited,
    ],
    highlights: [
      "Everything in Oro",
      "Scheduling Optimizer agent",
      "Unlimited translation + templates",
      "Multiple signage zones",
      "Dedicated SLA support",
    ],
  },
};

export const TIER_ORDER: TierKey[] = ["plato", "oro", "empresa"];

// The enabled module-key list for a tier — expanded through resolveEnabled so all
// hard dependencies + core modules are satisfied. This is exactly what you hand to
// saveEnabledModules. Returned filtered to real registry keys and stably ordered.
export function modulesForTier(tier: TierKey): string[] {
  const declared = TIERS[tier].modules.filter((k) => MODULE_BY_KEY[k]);
  const resolved = resolveEnabled(declared);
  // Stable, registry-order output so diffs/UX are deterministic.
  return MODULES.map((m) => m.key).filter((k) => resolved.has(k));
}

// Best-effort: infer which tier an org's CURRENT enabled set matches. Returns the
// tier whose resolved module set is identical; otherwise null ("Custom").
export function tierFromModules(enabled: Iterable<string> | null): TierKey | null {
  if (!enabled) return null;
  const cur = new Set([...enabled].filter((k) => MODULE_BY_KEY[k]));
  // Compare against each tier's RESOLVED set (what would actually be stored).
  for (const key of TIER_ORDER) {
    const want = new Set(modulesForTier(key));
    if (want.size === cur.size && [...want].every((k) => cur.has(k))) return key;
  }
  return null;
}
