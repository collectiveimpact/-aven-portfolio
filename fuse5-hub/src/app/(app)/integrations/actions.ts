"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canAdmin } from "@/lib/rbac";
import type { IntegrationStatus } from "@/lib/queries";

export type SaveResult = { ok: boolean; error?: string };

// Connect / disconnect / configure an integration (upsert on org_id+provider).
// Admin-gated to match the integrations _write policy.
export async function saveIntegration(provider: string, status: IntegrationStatus, settings: Record<string, string>): Promise<SaveResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };
  if (!me.role || !canAdmin(me.role)) return { ok: false, error: "Only an admin can configure integrations." };

  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(settings)) if (v.trim()) clean[k] = v.trim();

  const { error } = await supabase
    .from("integrations")
    .upsert({ org_id: me.orgId, provider, status, settings: clean, last_sync_at: status === "connected" || status === "active" ? new Date().toISOString() : null }, { onConflict: "org_id,provider" });
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Integration Configured", detail: `${provider} — ${status}` });
  return { ok: true };
}
