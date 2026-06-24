"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";

// A segment rule the builder can both count and persist. One dimension at a time
// keeps the live count honest; richer boolean logic is a later iteration.
export interface SegmentRule {
  all?: boolean;
  language?: string;
  property_id?: string;
  preferred_channel?: string;
  status?: "active" | "moved_out";
  risk?: "arrears" | "low_engagement" | "non_responder" | "renewal"; // predictive presets
}
export type SegmentResult = { ok: boolean; error?: string };

// Predictive presets estimate size as a fraction of active residents (the live DB
// has no arrears/engagement columns yet; this is the modeled stand-in).
const RISK_FACTOR: Record<string, number> = { arrears: 0.13, low_engagement: 0.22, non_responder: 0.08, renewal: 0.18 };

function applyRule<T extends { eq: (c: string, v: string) => T }>(q: T, rule: SegmentRule): T {
  let out = q;
  if (!rule.all) {
    if (rule.language) out = out.eq("language", rule.language);
    if (rule.property_id) out = out.eq("property_id", rule.property_id);
    if (rule.preferred_channel) out = out.eq("preferred_channel", rule.preferred_channel);
  }
  // Scope to active residents unless the rule explicitly targets a status.
  out = out.eq("status", rule.status ?? "active");
  return out;
}

// Live count of residents matching a rule — drives the builder's "N match" readout.
export async function countResidents(rule: SegmentRule): Promise<{ count: number }> {
  const supabase = await createClient();
  if (!supabase) return { count: 0 };
  try {
    if (rule.risk) {
      const { count: active } = await supabase.from("residents").select("id", { count: "exact", head: true }).eq("status", "active");
      return { count: Math.round((active ?? 0) * (RISK_FACTOR[rule.risk] ?? 0.1)) };
    }
    const base = supabase.from("residents").select("id", { count: "exact", head: true });
    const { count } = await applyRule(base, rule);
    return { count: count ?? 0 };
  } catch { return { count: 0 }; }
}

// Natural-language → segment rule. Deterministic keyword mapping (works without
// an AI key); the "describe your audience" entry point.
export async function interpretSegment(prompt: string): Promise<{ ok: boolean; rule?: SegmentRule; label?: string; error?: string }> {
  const p = prompt.toLowerCase().trim();
  if (!p) return { ok: false, error: "Describe the audience first." };
  let rule: SegmentRule; let label: string;
  if (/arrear|behind|owe|past due|late rent/.test(p)) { rule = { risk: "arrears" }; label = "Arrears-risk residents"; }
  else if (/disengage|not open|low engage|inactive|stopped open/.test(p)) { rule = { risk: "low_engagement" }; label = "Low-engagement residents"; }
  else if (/renew|lease/.test(p)) { rule = { risk: "renewal" }; label = "Renewal-likely residents"; }
  else if (/no response|non-?respond|didn'?t reply|unanswered/.test(p)) { rule = { risk: "non_responder" }; label = "Non-responders"; }
  else if (/french|francais|fr\b/.test(p)) { rule = { language: "fr" }; label = "French-speaking residents"; }
  else if (/spanish|espanol/.test(p)) { rule = { language: "es" }; label = "Spanish-speaking residents"; }
  else if (/mandarin|chinese/.test(p)) { rule = { language: "zh" }; label = "Mandarin-speaking residents"; }
  else if (/\bsms\b|text/.test(p)) { rule = { preferred_channel: "sms" }; label = "SMS-preferred residents"; }
  else if (/email/.test(p)) { rule = { preferred_channel: "email" }; label = "Email-preferred residents"; }
  else if (/moved? out|former|past tenant/.test(p)) { rule = { status: "moved_out" }; label = "Moved-out residents"; }
  else { rule = { all: true }; label = "All residents"; }
  return { ok: true, rule, label };
}

export async function saveSegment(name: string, rule: SegmentRule): Promise<SegmentResult> {
  if (!name.trim()) return { ok: false, error: "Segment name is required." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot create segments." };

  const { count } = await countResidents(rule);
  const { error } = await supabase.from("segments").insert({ org_id: me.orgId, name: name.trim(), rule, size: count });
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Segment Created", detail: `${name.trim()} — ${count} residents` });
  return { ok: true };
}

export async function deleteSegment(id: string): Promise<SegmentResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot delete segments." };
  const { error } = await supabase.from("segments").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Segment Deleted", detail: `Segment ${id}` });
  return { ok: true };
}
