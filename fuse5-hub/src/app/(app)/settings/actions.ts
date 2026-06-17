"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canAdmin } from "@/lib/rbac";
import type { OrgSettings } from "@/lib/queries";

export type SaveResult = { ok: boolean; error?: string };

// Persist org-level settings (one row per org, keyed by org_id). org_settings'
// _write policy is admin-only, so we gate with canAdmin to match.
export async function saveOrgSettings(input: OrgSettings): Promise<SaveResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };
  if (!me.role || !canAdmin(me.role)) return { ok: false, error: "Only an admin can change settings." };

  const row = {
    org_id: me.orgId,
    data_residency: input.dataResidency,
    collect_delivery_logs: input.collectDeliveryLogs,
    collect_proof_of_play: input.collectProofOfPlay,
    collect_acknowledgements: input.collectAcknowledgements,
    audit_report_cadence: input.auditReportCadence,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("org_settings").upsert(row, { onConflict: "org_id" });
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Settings Updated", detail: `Residency ${row.data_residency} · audit ${row.audit_report_cadence}` });
  return { ok: true };
}
