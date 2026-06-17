"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { CHANNEL_KEYS, type ChannelKey } from "@/lib/queries";

export interface ChannelInput {
  channel: ChannelKey;
  enabled: boolean;
  settings: Record<string, string>;
}
export type SaveResult = { ok: boolean; error?: string };

// Upsert one channel's config (unique on org_id + channel — first save inserts
// the row, later saves update it). channels_config _write is publisher-tier, so
// we gate with canPublish to match the DB policy.
export async function saveChannelConfig(input: ChannelInput): Promise<SaveResult> {
  if (!CHANNEL_KEYS.includes(input.channel)) return { ok: false, error: "Unknown channel." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot configure channels." };

  // Drop empty values so settings stays tidy.
  const settings: Record<string, string> = {};
  for (const [k, v] of Object.entries(input.settings)) if (v.trim()) settings[k] = v.trim();

  const { error } = await supabase
    .from("channels_config")
    .upsert({ org_id: me.orgId, channel: input.channel, enabled: input.enabled, settings }, { onConflict: "org_id,channel" });
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Channel Configured", detail: `${input.channel} — ${input.enabled ? "enabled" : "disabled"}` });
  return { ok: true };
}
