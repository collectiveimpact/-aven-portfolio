"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canAdmin } from "@/lib/rbac";
import type { PortalConfig } from "@/lib/platform";

export type SaveResult = { ok: boolean; error?: string };

// Persist the tenant-portal configuration (one row per org; admin-gated to match
// tenant_portal_config's _write policy).
export async function saveTenantPortalConfig(settings: PortalConfig): Promise<SaveResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };
  if (!me.role || !canAdmin(me.role)) return { ok: false, error: "Only an admin can configure the tenant portal." };

  const { error } = await supabase
    .from("tenant_portal_config")
    .upsert({ org_id: me.orgId, settings, updated_at: new Date().toISOString() }, { onConflict: "org_id" });
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Tenant Portal Updated", detail: `Portal ${settings.enabled ? "enabled" : "disabled"} · theme ${settings.theme}` });
  return { ok: true };
}
