import type { Channel } from "@/lib/types";

// PURE, client-safe module. The composer (a client component) imports the
// labels/types/pure logic from here, so this file must NOT import any server-only
// dependency (`@/lib/supabase/server`, `@/lib/auth`) — not even via dynamic
// import(), which Next still traces into the client graph and trips `server-only`.
// The DB-backed assessor (`assessAudience`) therefore lives in the "use server"
// compose/actions.ts, which is the only caller that needs Supabase.

/**
 * Pre-send audience suppression ("Refine") — an AI CASL compliance guardrail.
 *
 * Before a NON-emergency broadcast, we predict opt-out / complaint risk per
 * resident from existing consent data + recent send frequency, and auto-suppress
 * the residents we legally cannot (or operationally should not) message. Legal
 * suppressions (no CASL / no SMS consent) are never overridable; the fatigue cap
 * is overridable by the sender. Emergency broadcasts bypass all suppression —
 * `consent_emergency_only` permits life-safety contact regardless of consent.
 */

// ---------------------------------------------------------------------------
// Types + labels
// ---------------------------------------------------------------------------

export type SuppressionReason = "no_casl_consent" | "no_sms_consent" | "frequency_cap";

export const SUPPRESSION_LABELS: Record<SuppressionReason, string> = {
  no_casl_consent: "No CASL consent",
  no_sms_consent: "No SMS consent",
  frequency_cap: "Frequency cap",
};

/** Legal reasons are non-overridable; the sender cannot include these residents. */
export const LEGAL_REASONS: ReadonlySet<SuppressionReason> = new Set<SuppressionReason>([
  "no_casl_consent",
  "no_sms_consent",
]);

export interface SuppressionOptions {
  /** Max sends in the trailing window before a resident is fatigue-capped. */
  frequencyCap: number;
  /** Trailing window (days) used to count recent sends. */
  windowDays: number;
  /** Sender override: include residents that only tripped the (overridable) frequency cap. */
  includeFrequencyCapped: boolean;
}

export const FREQUENCY_CAP = 4;
export const FREQUENCY_WINDOW_DAYS = 7;

export const DEFAULT_SUPPRESSION_OPTIONS: SuppressionOptions = {
  frequencyCap: FREQUENCY_CAP,
  windowDays: FREQUENCY_WINDOW_DAYS,
  includeFrequencyCapped: false,
};

/** The consent fields we reason over (one resident's demographics row). */
export interface ResidentConsent {
  consent_casl: boolean;
  consent_sms: boolean;
  consent_emergency_only: boolean;
}

export interface DecisionContext {
  /** The channel sendBroadcast resolved for this resident ("sms", "email", …). */
  channelResolved: Channel | null;
  isEmergency: boolean;
  /** Count of sends to this resident inside the trailing window. */
  recentSends: number;
}

export interface SuppressionDecision {
  suppress: boolean;
  reason?: SuppressionReason;
}

export interface SuppressionBreakdown {
  no_casl_consent: number;
  no_sms_consent: number;
  frequency_cap: number;
}

export const EMPTY_BREAKDOWN: SuppressionBreakdown = { no_casl_consent: 0, no_sms_consent: 0, frequency_cap: 0 };

export interface AudienceAssessment {
  total: number;
  sending: number;
  suppressedCount: number;
  breakdown: SuppressionBreakdown;
  /** Resident ids that will be skipped on send (given the supplied options). */
  suppressedIds: string[];
  /** True when no backend is configured — figures are a graceful zero-suppression default. */
  degraded: boolean;
}

/** Graceful zero-suppression default used when there's no backend / no org. */
export function emptyAssessment(total = 0): AudienceAssessment {
  return { total, sending: total, suppressedCount: 0, breakdown: { ...EMPTY_BREAKDOWN }, suppressedIds: [], degraded: true };
}

// ---------------------------------------------------------------------------
// Pure decision logic
// ---------------------------------------------------------------------------

/**
 * Decide whether a single resident is suppressed for this send. Pure + total.
 *   1. Emergency  → never suppress (consent_emergency_only permits contact).
 *   2. No CASL consent → suppress (LEGAL, not overridable).
 *   3. Resolved channel is SMS + no SMS consent → suppress (LEGAL).
 *   4. recentSends >= cap → suppress (fatigue, overridable via opts).
 */
export function decideSuppression(
  resident: ResidentConsent,
  ctx: DecisionContext,
  opts: SuppressionOptions = DEFAULT_SUPPRESSION_OPTIONS,
): SuppressionDecision {
  if (ctx.isEmergency) return { suppress: false };
  if (!resident.consent_casl) return { suppress: true, reason: "no_casl_consent" };
  if (ctx.channelResolved === "sms" && !resident.consent_sms) {
    return { suppress: true, reason: "no_sms_consent" };
  }
  if (!opts.includeFrequencyCapped && ctx.recentSends >= opts.frequencyCap) {
    return { suppress: true, reason: "frequency_cap" };
  }
  return { suppress: false };
}

// ---------------------------------------------------------------------------
// Channel resolution — must mirror sendBroadcast exactly so the assessment and
// the actual send agree on each resident's channel.
// ---------------------------------------------------------------------------

export interface ReachableResident {
  id: string;
  email: string | null;
  phone: string | null;
  preferred_channel: string | null;
}

const DISPLAY = "display";

function hasContact(c: string, r: { email: string | null; phone: string | null }): boolean {
  if (c === "email") return Boolean(r.email);
  if (c === "sms" || c === "whatsapp" || c === "voice") return Boolean(r.phone);
  return false;
}

/**
 * Resolve a resident's send channel exactly like sendBroadcast: prefer their
 * preferred_channel when selected + reachable, else the first selected channel we
 * can deliver on. "display" is screen-level, never a per-resident send. Null = unreachable.
 */
export function resolveChannel(channels: Channel[], r: ReachableResident): Channel | null {
  const want = (channels as string[]).filter((c) => c !== DISPLAY);
  const pref = r.preferred_channel;
  if (pref && want.includes(pref) && hasContact(pref, r)) return pref as Channel;
  const fallback = want.find((c) => hasContact(c, r));
  return (fallback as Channel | undefined) ?? null;
}
