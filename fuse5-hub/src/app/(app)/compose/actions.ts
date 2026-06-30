"use server";

import type { Channel } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { dispatchMessage } from "@/lib/comms-dispatch";
import type { ChannelKey } from "@/lib/queries";
import { generateText } from "@/lib/ai";
import {
  decideSuppression,
  resolveChannel,
  emptyAssessment,
  EMPTY_BREAKDOWN,
  DEFAULT_SUPPRESSION_OPTIONS,
  type AudienceAssessment,
  type ResidentConsent,
  type SuppressionBreakdown,
  type SuppressionOptions,
  type ReachableResident,
} from "@/lib/suppression";

// Server-side audience assessor (lives here, not in the client-imported
// suppression.ts, so Supabase never reaches the client bundle). Reads the org's
// active residents (optionally one property), consent demographics, and a
// trailing-window send count; resolves each channel like sendBroadcast; runs
// decideSuppression. Degrades to zero suppression when there's no backend.
async function assessAudience(
  propertyId: string | null,
  channels: Channel[],
  isEmergency: boolean,
  opts: SuppressionOptions = DEFAULT_SUPPRESSION_OPTIONS,
): Promise<AudienceAssessment> {
  const supabase = await createClient();
  if (!supabase) return emptyAssessment();
  const me = await getCurrentUser();
  const orgId = me?.orgId;
  if (!orgId) return emptyAssessment();
  try {
    let q = supabase.from("residents").select("id,email,phone,preferred_channel").eq("org_id", orgId).eq("status", "active").limit(2000);
    if (propertyId) q = q.eq("property_id", propertyId);
    const { data: residents, error } = await q;
    if (error) return emptyAssessment();
    const list = (residents ?? []) as ReachableResident[];
    const total = list.length;
    if (total === 0) return { total: 0, sending: 0, suppressedCount: 0, breakdown: { ...EMPTY_BREAKDOWN }, suppressedIds: [], degraded: false };
    const ids = list.map((r) => r.id);

    // Consent demographics — missing row = NO marketing consent (conservative, CASL opt-out default).
    const consent = new Map<string, ResidentConsent>();
    const { data: demo } = await supabase.from("resident_demographics").select("resident_id,consent_casl,consent_sms,consent_emergency_only").in("resident_id", ids);
    for (const d of demo ?? []) {
      consent.set(d.resident_id as string, { consent_casl: !!d.consent_casl, consent_sms: !!d.consent_sms, consent_emergency_only: d.consent_emergency_only === undefined ? true : !!d.consent_emergency_only });
    }

    // Trailing-window send counts (message_recipients has no timestamp → join messages.created_at). Skipped for emergencies.
    const recent = new Map<string, number>();
    if (!isEmergency) {
      const since = new Date(Date.now() - opts.windowDays * 24 * 60 * 60 * 1000).toISOString();
      const { data: recips } = await supabase.from("message_recipients").select("resident_id,messages!inner(created_at)").in("resident_id", ids).gte("messages.created_at", since);
      for (const row of recips ?? []) { const rid = row.resident_id as string; recent.set(rid, (recent.get(rid) ?? 0) + 1); }
    }

    const breakdown: SuppressionBreakdown = { ...EMPTY_BREAKDOWN };
    const suppressedIds: string[] = [];
    for (const r of list) {
      const c = consent.get(r.id) ?? { consent_casl: false, consent_sms: false, consent_emergency_only: true };
      const decision = decideSuppression(c, { channelResolved: resolveChannel(channels, r), isEmergency, recentSends: recent.get(r.id) ?? 0 }, opts);
      if (decision.suppress && decision.reason) { breakdown[decision.reason] += 1; suppressedIds.push(r.id); }
    }
    const suppressedCount = suppressedIds.length;
    return { total, sending: total - suppressedCount, suppressedCount, breakdown, suppressedIds, degraded: false };
  } catch { return emptyAssessment(); }
}

// AI authoring for the Compose door (Content Composer). Live with ANTHROPIC_API_KEY, stub otherwise.
export async function aiCompose(prompt: string): Promise<{ ok: boolean; text?: string; mode?: "live" | "stub"; error?: string }> {
  if (!prompt.trim()) return { ok: false, error: "Describe what the message is about." };
  const r = await generateText(prompt);
  return { ok: true, text: r.text, mode: r.mode };
}

// ── Composer-from-prompt ────────────────────────────────────────────────────
// One natural-language brief → a full broadcast plan: subject + body, the right
// channels, urgency, audience, and an emergency flag. The composer applies the
// plan to its fields, then the existing CASL compliance check + send path take
// over. Live via Claude (JSON), with a deterministic keyword heuristic fallback
// when the model isn't configured or doesn't return clean JSON.
export interface ComposePlan {
  subject: string;
  body: string;
  channels: Channel[];
  priority: "normal" | "high" | "urgent";
  audience: string;
  isEmergency: boolean;
  scheduleHint: string;
  mode: "live" | "stub";
}

const PLAN_CHANNELS = new Set<Channel>(["email", "sms", "whatsapp", "voice", "display"]);
function sanitizeChannels(v: unknown): Channel[] {
  const arr = Array.isArray(v) ? v : [];
  const out = arr.map((c) => String(c).toLowerCase().trim()).filter((c): c is Channel => PLAN_CHANNELS.has(c as Channel));
  return out.length ? [...new Set(out)] : ["email"];
}

/** Heuristic plan when there's no live model / no parseable JSON. */
function heuristicPlan(prompt: string, body: string): ComposePlan {
  const p = prompt.toLowerCase();
  const emergency = /\b(emergency|evacuat|fire|flood|gas leak|no heat|urgent|immediately|lockdown|boil water)\b/.test(p);
  const urgent = emergency || /\b(asap|today|tonight|right away|outage|shut ?off|shutdown)\b/.test(p);
  const channels: Channel[] = emergency ? ["email", "sms", "voice"] : /\btext|sms\b/.test(p) ? ["sms", "email"] : ["email"];
  const firstLine = prompt.trim().split(/[.\n]/)[0].slice(0, 80);
  const subject = (emergency ? "URGENT: " : "") + (firstLine.charAt(0).toUpperCase() + firstLine.slice(1));
  return {
    subject,
    body: body || prompt.trim(),
    channels,
    priority: emergency ? "urgent" : urgent ? "high" : "normal",
    audience: /\ball residents|everyone|whole building\b/.test(p) ? "All Residents" : "All Residents",
    isEmergency: emergency,
    scheduleHint: /\btomorrow|next week|monday|tuesday|wednesday|thursday|friday|on \w+day\b/.test(p) ? "scheduled" : "now",
    mode: "stub",
  };
}

function extractJson(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? text;
  const start = fenced.indexOf("{");
  const end = fenced.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(fenced.slice(start, end + 1)) as Record<string, unknown>; } catch { return null; }
}

export async function composeFromPrompt(prompt: string): Promise<{ ok: boolean; plan?: ComposePlan; error?: string }> {
  const brief = prompt.trim();
  if (!brief) return { ok: false, error: "Describe the broadcast you want to send." };

  const instruction = `You are the broadcast planner for a social-housing tenant-communications platform.
Turn the staff member's brief into ONE message plan. Reply with STRICT JSON only — no prose, no code fences — with EXACTLY these keys:
{
 "subject": "concise subject line",
 "body": "warm, plain-language message body (2-5 short sentences). Use {{first_name}} if helpful.",
 "channels": ["email" and/or "sms","whatsapp","voice","display"],
 "priority": "normal" | "high" | "urgent",
 "audience": "who it's for, e.g. All Residents or a property/building name",
 "isEmergency": true | false,
 "scheduleHint": "now" or a short timing note
}
Rules: life-safety briefs (fire, flood, gas, no heat, evacuation) → isEmergency true, priority "urgent", channels include sms+voice. Routine notices → email (+sms if time-sensitive). Keep the body respectful and accessible.
Brief: ${brief}`;

  const r = await generateText(instruction);
  const parsed = extractJson(r.text);
  if (!parsed) {
    // Model returned prose (or stub) — still give a usable plan from the text + heuristics.
    return { ok: true, plan: heuristicPlan(brief, r.mode === "live" ? r.text : "") };
  }
  const isEmergency = parsed.isEmergency === true;
  const pr = String(parsed.priority ?? "").toLowerCase();
  const plan: ComposePlan = {
    subject: String(parsed.subject ?? "").slice(0, 140) || heuristicPlan(brief, "").subject,
    body: String(parsed.body ?? "").trim() || brief,
    channels: sanitizeChannels(parsed.channels),
    priority: isEmergency ? "urgent" : pr === "urgent" || pr === "high" ? (pr as "urgent" | "high") : "normal",
    audience: String(parsed.audience ?? "All Residents").slice(0, 80) || "All Residents",
    isEmergency,
    scheduleHint: String(parsed.scheduleHint ?? "now").slice(0, 40),
    mode: r.mode,
  };
  return { ok: true, plan };
}

export interface SendBroadcastInput {
  subject: string;
  body: string;
  channels: Channel[];
  segments: string[];
  priority: "normal" | "high" | "emergency";
  language: string;
  audienceCount: number;
  delivery: "now" | "schedule";
  scheduledFor: string | null;
  /** Sender override: include residents that only tripped the (overridable) frequency cap. */
  includeFrequencyCapped?: boolean;
}

export interface SendBroadcastResult {
  ok: boolean;
  sent: number;
  /** Non-emergency only: residents auto-suppressed by the CASL guardrail. */
  suppressed?: number;
  mode?: "live" | "demo";
  error?: string;
}

// Pre-send compliance assessment for the composer's "Compliance check" card.
// Non-emergency sends predict opt-out / complaint risk and report what gets held
// back; emergency sends report zero suppression (the guardrail is bypassed).
export async function assessBroadcastAudience(
  propertyId: string | null,
  channels: Channel[],
  priority: "normal" | "high" | "emergency",
  includeFrequencyCapped = false,
): Promise<AudienceAssessment> {
  return assessAudience(propertyId, channels, priority === "emergency", {
    ...DEFAULT_SUPPRESSION_OPTIONS,
    includeFrequencyCapped,
  });
}

// Send a real broadcast: persist Message + MessageRecipient rows, write an audit
// Persist an unsent draft (status='draft', no recipients dispatched). Shows up in
// message history and can be re-opened/sent later.
export async function saveDraft(input: SendBroadcastInput): Promise<{ ok: boolean; mode?: "live" | "demo"; error?: string }> {
  if (!input.subject.trim() && !input.body.trim()) return { ok: false, error: "Add a subject or body before saving." };
  const supabase = await createClient();
  if (!supabase) return { ok: true, mode: "demo" };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };

  const { data: msg, error } = await supabase.from("messages").insert({
    org_id: me.orgId,
    subject: input.subject || "(untitled draft)",
    body: input.body,
    channels: input.channels,
    status: "draft",
    priority: input.priority,
    audience_count: input.audienceCount,
    scheduled_for: input.scheduledFor,
    created_by: me.id ?? null,
  }).select("id").single();
  if (error || !msg) return { ok: false, error: error?.message ?? "Could not save draft." };

  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Draft Saved", detail: `"${input.subject || "(untitled draft)"}" — ${input.channels.join(", ") || "no channel"}` });
  return { ok: true, mode: "live" };
}

// entry, and dispatch email via the provider adapter (live when RESEND_API_KEY is
// set, safe stub otherwise). Falls back to a demo result when no backend.
export async function sendBroadcast(input: SendBroadcastInput): Promise<SendBroadcastResult> {
  if (!input.subject.trim() || !input.body.trim()) {
    return { ok: false, sent: 0, error: "Subject and body are required." };
  }
  if (input.channels.length === 0) {
    return { ok: false, sent: 0, error: "Select at least one channel." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { ok: true, sent: input.audienceCount, mode: "demo" };
  }

  const me = await getCurrentUser();
  const orgId = me?.orgId;
  if (!orgId) return { ok: false, sent: 0, error: "No organization for the current user." };

  const status = input.delivery === "schedule" ? "scheduled" : "sent";
  const { data: msg, error: msgErr } = await supabase
    .from("messages")
    .insert({
      org_id: orgId,
      subject: input.subject,
      body: input.body,
      channels: input.channels,
      status,
      priority: input.priority,
      audience_count: input.audienceCount,
      scheduled_for: input.scheduledFor,
      created_by: me?.id ?? null,
    })
    .select("id")
    .single();
  if (msgErr || !msg) return { ok: false, sent: 0, error: msgErr?.message ?? "Could not save message." };

  let sent = 0;
  let suppressed = 0;
  if (status === "sent") {
    // Resolve recipients = the org's active tenants, each on their PREFERRED
    // channel (fallback to whatever selected channel they have contact for).
    const { data: residents } = await supabase
      .from("residents")
      .select("id,name,email,phone,preferred_channel")
      .eq("org_id", orgId)
      .eq("status", "active")
      .limit(200);

    const list = residents ?? [];
    const isEmergency = input.priority === "emergency";

    // Pre-send suppression ("Refine"): for NON-emergency sends, build the set of
    // residents to skip (legal CASL/SMS consent gaps + fatigue cap). Emergency
    // sends reach everyone reachable, unchanged.
    const opts: SuppressionOptions = { ...DEFAULT_SUPPRESSION_OPTIONS, includeFrequencyCapped: !!input.includeFrequencyCapped };
    const suppressedSet = new Set<string>();
    if (!isEmergency && list.length) {
      const ids = list.map((r) => r.id);
      const consent = new Map<string, ResidentConsent>();
      const { data: demo } = await supabase
        .from("resident_demographics")
        .select("resident_id,consent_casl,consent_sms,consent_emergency_only")
        .in("resident_id", ids);
      for (const d of demo ?? []) {
        consent.set(d.resident_id as string, {
          consent_casl: !!d.consent_casl,
          consent_sms: !!d.consent_sms,
          consent_emergency_only: d.consent_emergency_only === undefined ? true : !!d.consent_emergency_only,
        });
      }
      const since = new Date(Date.now() - opts.windowDays * 24 * 60 * 60 * 1000).toISOString();
      const recent = new Map<string, number>();
      const { data: recips } = await supabase
        .from("message_recipients")
        .select("resident_id,messages!inner(created_at)")
        .in("resident_id", ids)
        .gte("messages.created_at", since);
      for (const row of recips ?? []) {
        const rid = row.resident_id as string;
        recent.set(rid, (recent.get(rid) ?? 0) + 1);
      }
      for (const r of list) {
        const c = consent.get(r.id) ?? { consent_casl: false, consent_sms: false, consent_emergency_only: true };
        const channelResolved = resolveChannel(input.channels, { id: r.id, email: r.email, phone: r.phone, preferred_channel: r.preferred_channel });
        const decision = decideSuppression(c, { channelResolved, isEmergency: false, recentSends: recent.get(r.id) ?? 0 }, opts);
        if (decision.suppress) suppressedSet.add(r.id);
      }
    }

    const html = `<div>${input.body.replace(/\n/g, "<br/>")}</div>`;
    // "display" is a screen-level channel (pushed via the Wallboard feed), not a
    // per-resident send — exclude it from the recipient loop.
    const want = (input.channels as string[]).filter((c) => c !== "display");
    const hasContact = (c: string, r: { email: unknown; phone: unknown }) =>
      c === "email" ? Boolean(r.email) : (c === "sms" || c === "whatsapp" || c === "voice") ? Boolean(r.phone) : false;
    for (const r of list) {
      // Skip residents the compliance guardrail held back (legal + fatigue).
      if (suppressedSet.has(r.id)) { suppressed += 1; continue; }
      const pref = r.preferred_channel as string | null;
      // Prefer the resident's channel when it's selected + reachable; else the
      // first selected channel we can actually deliver on.
      const ch = pref && want.includes(pref) && hasContact(pref, r) ? pref : want.find((c) => hasContact(c, r)) ?? null;
      if (!ch) continue;
      const to = (ch === "email" ? r.email : r.phone) as string;
      const res = await dispatchMessage({
        channel: ch as ChannelKey,
        to,
        subject: input.subject,
        body: ch === "email" ? html : `${input.subject}: ${input.body}`,
      });
      if (res.ok) sent += 1;
      await supabase.from("message_recipients").insert({
        org_id: orgId, message_id: msg.id, resident_id: r.id, channel: ch, status: res.ok ? "delivered" : "bounced",
      });
    }
  } else {
    sent = input.audienceCount;
  }

  await supabase.from("audit_log").insert({
    org_id: orgId,
    actor_id: me?.id ?? null,
    action: input.priority === "emergency" ? "Emergency Broadcast" : "Broadcast",
    detail: `"${input.subject}" via ${input.channels.join(", ")} — ${sent} recipients${suppressed ? ` · ${suppressed} suppressed (CASL/fatigue)` : ""}`,
  });

  return { ok: true, sent, suppressed, mode: "live" };
}
