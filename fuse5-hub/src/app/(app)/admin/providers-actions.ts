"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canAdmin } from "@/lib/rbac";

export type AdminResult = { ok: boolean; error?: string; persisted?: boolean };

// Generic platform-operator audit writer. The platform panels (providers, roles,
// players, compliance) hold demo / cross-org state that has no dedicated table in
// the single-org local schema, so we record the operator's intent to audit_log
// when a backend + admin session exist, and degrade to a client-only optimistic
// update otherwise. `persisted` tells the caller which happened.
//
// Super-admin gate: only an Org Admin (which a Fuse5 super-admin is, in their own
// org row) may write platform audit entries. This mirrors the actions.ts pattern.
export async function recordPlatformAction(action: string, detail: string): Promise<AdminResult> {
  const a = action.trim();
  if (!a) return { ok: false, error: "Missing action." };

  const supabase = await createClient();
  if (!supabase) return { ok: true, persisted: false }; // no backend — optimistic only
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: true, persisted: false };
  if (!me.role || !canAdmin(me.role)) return { ok: false, error: "Only an Admin can perform platform actions." };

  const { error } = await supabase.from("audit_log").insert({
    org_id: me.orgId,
    actor_id: me.id,
    action: a,
    detail: detail.slice(0, 500),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, persisted: true };
}
