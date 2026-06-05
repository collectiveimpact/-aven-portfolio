"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canAdmin, ROLE_LABELS, type F5Role } from "@/lib/rbac";

export type AdminResult = { ok: boolean; error?: string };

// Change an org member's role. Admin-only (matches the org_members RLS policy),
// with a self-lockout guard so an admin can't accidentally drop their own access.
export async function setMemberRole(memberId: string, role: F5Role): Promise<AdminResult> {
  if (!(role in ROLE_LABELS)) return { ok: false, error: "Unknown role." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canAdmin(me.role)) return { ok: false, error: "Only an Org Admin can change roles." };

  const { data: member } = await supabase.from("org_members").select("user_id").eq("id", memberId).maybeSingle();
  if (!member) return { ok: false, error: "Member not found." };
  if (member.user_id === me.id && !canAdmin(role)) {
    return { ok: false, error: "You can't remove your own admin access." };
  }

  const { error } = await supabase.from("org_members").update({ role }).eq("id", memberId);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Member Role Changed", detail: `${memberId} → ${ROLE_LABELS[role]}` });
  return { ok: true };
}
