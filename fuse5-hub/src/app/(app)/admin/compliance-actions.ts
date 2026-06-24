"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canAdmin } from "@/lib/rbac";
import { runComplianceSync, type SyncSummary } from "@/lib/compliance/agent";

export interface SyncActionResult { ok: boolean; summary?: SyncSummary; error?: string }

// Admin "Sync now" — runs the compliance agent against the live open-data feeds,
// persists the latest scores, and returns them for the panel to display.
export async function syncComplianceScores(): Promise<SyncActionResult> {
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };
  if (!me.role || !canAdmin(me.role)) return { ok: false, error: "Your role cannot sync compliance scores." };
  const supabase = await createClient();
  try {
    const summary = await runComplianceSync(supabase, me.orgId);
    return { ok: true, summary };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Sync failed." };
  }
}
