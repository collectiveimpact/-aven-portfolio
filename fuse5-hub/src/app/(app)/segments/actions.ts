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
}
export type SegmentResult = { ok: boolean; error?: string };

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
    const base = supabase.from("residents").select("id", { count: "exact", head: true });
    const { count } = await applyRule(base, rule);
    return { count: count ?? 0 };
  } catch { return { count: 0 }; }
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
