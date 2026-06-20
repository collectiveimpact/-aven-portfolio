"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";

export interface FrontlineWOInput {
  title: string;
  propertyId: string | null;
  unit: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  description: string;
}
export type SubmitResult = { ok: boolean; woId?: string; error?: string };

// Simplified maintenance-request submission for frontline staff. Inserts a basic
// open work order (no notice/drafts). Frontline insert is permitted by the 0011
// RLS policy; publisher-tier + property managers can also submit.
export async function submitWorkOrder(input: FrontlineWOInput): Promise<SubmitResult> {
  if (!input.title.trim()) return { ok: false, error: "Describe the issue (title) first." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };
  const allowed = me.role && (canPublish(me.role) || me.role === "frontline" || me.role === "property_manager");
  if (!allowed) return { ok: false, error: "Your role cannot submit work orders." };

  const note = input.description.trim() ? { description: input.description.trim() } : {};
  const { data, error } = await supabase.from("work_orders").insert({
    org_id: me.orgId,
    property_id: input.propertyId || null,
    unit: input.unit.trim() || null,
    title: input.title.trim(),
    category: input.category || "Maintenance",
    priority: input.priority,
    status: "open",
    channels: [],
    notice_status: "none",
    notice: note,
  }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not submit the request." };

  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Work Order Submitted", detail: `"${input.title.trim()}" — ${input.priority}${input.unit ? ` · unit ${input.unit}` : ""}` });
  return { ok: true, woId: data.id };
}
