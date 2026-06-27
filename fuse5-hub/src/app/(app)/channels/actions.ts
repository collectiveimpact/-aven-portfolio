"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish, canAdmin } from "@/lib/rbac";
import { CHANNEL_KEYS, type ChannelKey } from "@/lib/queries";
import { hasSms, hasWhatsApp, hasVoice, hasEmail, hasSendgrid, A2P_10DLC_STATUS } from "@/lib/env";
import {
  GO_LIVE_CHANNELS,
  REG_STATUSES,
  type GoLiveChannel,
  type RegStatus,
  type CommsRegistrationRow,
  type SenderIdentityRow,
  type CredentialFlags,
} from "@/lib/comms-golive";

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

// ----------------------------------------------------------------- Go-Live
// The Go-Live surface MANAGES external carrier/provider registration — it never
// holds secrets. These actions persist registration + sender-identity state and
// audit each transition; the operator supplies real keys in env/secrets and
// completes the carrier process externally. Admin-tier only (canAdmin), matching
// the page gate; the DB write policy additionally allows manager.

// Server-resolved credential flags (env), so the client never touches process.env.
// Internal (non-exported) so the "use server" all-exports-must-be-async rule
// doesn't apply — it's a plain sync helper used only within this module.
function credentialFlags(): CredentialFlags {
  return { sms: hasSms, whatsapp: hasWhatsApp, voice: hasVoice, email: hasEmail || hasSendgrid };
}

export interface GoLiveState {
  flags: CredentialFlags;
  a2pEnvStatus: string; // A2P_10DLC_STATUS surfaced read-only
  registrations: CommsRegistrationRow[];
  identities: SenderIdentityRow[];
}

const EMPTY_STATE = (): GoLiveState => ({
  flags: credentialFlags(),
  a2pEnvStatus: A2P_10DLC_STATUS,
  registrations: [],
  identities: [],
});

// Read all go-live state for the current org. Returns empty (but env-derived)
// state when there's no backend so the surface still renders + reasons about
// credentials. RLS scopes the rows to the caller's org.
export async function getGoLiveState(): Promise<GoLiveState> {
  const supabase = await createClient();
  if (!supabase) return EMPTY_STATE();
  const me = await getCurrentUser();
  if (!me?.orgId) return EMPTY_STATE();

  const [{ data: regs }, { data: ids }] = await Promise.all([
    supabase.from("comms_registration").select("*").eq("org_id", me.orgId),
    supabase.from("sender_identities").select("*").eq("org_id", me.orgId).order("created_at", { ascending: true }),
  ]);

  return {
    flags: credentialFlags(),
    a2pEnvStatus: A2P_10DLC_STATUS,
    registrations: (regs ?? []) as CommsRegistrationRow[],
    identities: (ids ?? []) as SenderIdentityRow[],
  };
}

function isGoLiveChannel(c: string): c is GoLiveChannel {
  return (GO_LIVE_CHANNELS as string[]).includes(c);
}
function isRegStatus(s: string): s is RegStatus {
  return (REG_STATUSES as string[]).includes(s);
}

export interface RegistrationInput {
  channel: GoLiveChannel;
  brandName: string;
  brandStatus: RegStatus;
  campaignUseCase: string;
  campaignStatus: RegStatus;
  senderId: string;
  tenDlcStatus: RegStatus;
  notes: string;
}

// Persist the A2P brand + campaign registration for a channel (NO secrets).
export async function saveRegistration(input: RegistrationInput): Promise<SaveResult> {
  if (!isGoLiveChannel(input.channel)) return { ok: false, error: "Unknown channel." };
  if (![input.brandStatus, input.campaignStatus, input.tenDlcStatus].every(isRegStatus))
    return { ok: false, error: "Invalid status." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };
  if (!me.role || !canAdmin(me.role)) return { ok: false, error: "Your role cannot manage go-live registration." };

  const { error } = await supabase.from("comms_registration").upsert(
    {
      org_id: me.orgId,
      channel: input.channel,
      brand_name: input.brandName.trim() || null,
      brand_status: input.brandStatus,
      campaign_use_case: input.campaignUseCase.trim() || null,
      campaign_status: input.campaignStatus,
      sender_id: input.senderId.trim() || null,
      ten_dlc_status: input.tenDlcStatus,
      notes: input.notes.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,channel" },
  );
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({
    org_id: me.orgId, actor_id: me.id, action: "Registration Updated",
    detail: `${input.channel} — brand:${input.brandStatus} campaign:${input.campaignStatus} 10DLC:${input.tenDlcStatus}`,
  });
  return { ok: true };
}

// Submit the registration: advances any "unregistered" pipeline stage to
// "submitted", stamps submitted_at, and audits that the EXTERNAL carrier process
// was initiated. Gated when the channel has no credentials (handled in the UI;
// re-checked here for SMS/WhatsApp which require Twilio).
export async function submitRegistration(channel: GoLiveChannel): Promise<SaveResult> {
  if (!isGoLiveChannel(channel)) return { ok: false, error: "Unknown channel." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };
  if (!me.role || !canAdmin(me.role)) return { ok: false, error: "Your role cannot submit registration." };

  const flags = credentialFlags();
  if ((channel === "sms" || channel === "whatsapp") && !flags[channel])
    return { ok: false, error: "Connect Twilio credentials before submitting registration." };

  const { data: existing } = await supabase
    .from("comms_registration").select("*").eq("org_id", me.orgId).eq("channel", channel).maybeSingle();

  const bump = (s: RegStatus | undefined): RegStatus => (!s || s === "unregistered" || s === "rejected" ? "submitted" : s);
  const row = existing as CommsRegistrationRow | null;
  const { error } = await supabase.from("comms_registration").upsert(
    {
      org_id: me.orgId,
      channel,
      brand_name: row?.brand_name ?? null,
      brand_status: bump(row?.brand_status),
      campaign_use_case: row?.campaign_use_case ?? null,
      campaign_status: bump(row?.campaign_status),
      sender_id: row?.sender_id ?? null,
      ten_dlc_status: bump(row?.ten_dlc_status),
      notes: row?.notes ?? null,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "org_id,channel" },
  );
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({
    org_id: me.orgId, actor_id: me.id, action: "Registration Submitted",
    detail: `${channel} — external carrier/provider registration initiated`,
  });
  return { ok: true };
}

export interface SenderInput { channel: GoLiveChannel; value: string; label: string }

// Add a sender identity (number or from-address) to verify.
export async function addSenderIdentity(input: SenderInput): Promise<SaveResult> {
  if (!isGoLiveChannel(input.channel)) return { ok: false, error: "Unknown channel." };
  if (!input.value.trim()) return { ok: false, error: "Enter a number or address." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };
  if (!me.role || !canAdmin(me.role)) return { ok: false, error: "Your role cannot add sender identities." };

  const { error } = await supabase.from("sender_identities").upsert(
    { org_id: me.orgId, channel: input.channel, value: input.value.trim(), label: input.label.trim() || null },
    { onConflict: "org_id,channel,value" },
  );
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({
    org_id: me.orgId, actor_id: me.id, action: "Sender Identity Added", detail: `${input.channel} — ${input.value.trim()}`,
  });
  return { ok: true };
}

// Verify / unverify a sender identity. Real provider verification happens
// externally (Twilio caller-ID verify, email domain DNS). When no live test
// endpoint exists this records the operator-confirmed verified state and audits
// it; swap for a real verify call when the endpoint lands.
export async function setSenderVerified(channel: GoLiveChannel, value: string, verified: boolean): Promise<SaveResult> {
  if (!isGoLiveChannel(channel)) return { ok: false, error: "Unknown channel." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };
  if (!me.role || !canAdmin(me.role)) return { ok: false, error: "Your role cannot verify sender identities." };

  const { error } = await supabase
    .from("sender_identities")
    .update({ verified, verified_at: verified ? new Date().toISOString() : null })
    .eq("org_id", me.orgId).eq("channel", channel).eq("value", value);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({
    org_id: me.orgId, actor_id: me.id, action: verified ? "Sender Verified" : "Sender Unverified", detail: `${channel} — ${value}`,
  });
  return { ok: true };
}

export async function removeSenderIdentity(channel: GoLiveChannel, value: string): Promise<SaveResult> {
  if (!isGoLiveChannel(channel)) return { ok: false, error: "Unknown channel." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };
  if (!me.role || !canAdmin(me.role)) return { ok: false, error: "Your role cannot remove sender identities." };

  const { error } = await supabase
    .from("sender_identities").delete().eq("org_id", me.orgId).eq("channel", channel).eq("value", value);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({
    org_id: me.orgId, actor_id: me.id, action: "Sender Identity Removed", detail: `${channel} — ${value}`,
  });
  return { ok: true };
}
