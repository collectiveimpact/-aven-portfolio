"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canAdmin } from "@/lib/rbac";
import { MODULE_BY_KEY, resolveEnabled } from "@/lib/modules";

// Save the org's activated modules. We store the resolved set (core + requirements
// included) so the sidebar/guards can trust it directly. Passing null clears the
// override (back to the default starter set).
export async function saveEnabledModules(keys: string[] | null): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canAdmin(me.role)) return { ok: false, error: "Only admins can manage modules." };

  const value = keys === null ? null : [...resolveEnabled(keys.filter((k) => MODULE_BY_KEY[k]))];
  const { error } = await supabase.from("organizations").update({ enabled_modules: value }).eq("id", me.orgId);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Modules Updated", detail: value ? `${value.length} active` : "reset to default" });
  return { ok: true };
}
