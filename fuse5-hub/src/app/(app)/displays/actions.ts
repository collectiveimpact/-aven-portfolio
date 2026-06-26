"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { buildSignageFeed } from "@/lib/wallboard/feed";
import { pushSignageDatasource, assignContentToDevices, rebootDevices, screenshotDevice, setDevicePower, identifyDevice } from "@/lib/wallboard/api";

type ActionResult = { ok: boolean; error?: string; url?: string };

async function guard(): Promise<{ ok: true; orgId: string; actorId: string } | { ok: false; error: string }> {
  const me = await getCurrentUser();
  if (!me?.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot control displays." };
  if (!me.orgId) return { ok: false, error: "No organization." };
  return { ok: true, orgId: me.orgId, actorId: me.id };
}
async function audit(orgId: string, actorId: string, detail: string) {
  const s = await createClient();
  if (s) await s.from("audit_log").insert({ org_id: orgId, actor_id: actorId, action: "Display Control", detail });
}

// Manage Wallboard screens directly from Fuse5. Each is env-gated on
// WALLBOARD_ACCESS_TOKEN; without it the adapter returns a clear "configure" error.
export async function assignContentToScreens(deviceIds: string[], contentId: string): Promise<ActionResult> {
  const g = await guard(); if (!g.ok) return g;
  const r = await assignContentToDevices(deviceIds, contentId);
  if (r.ok) await audit(g.orgId, g.actorId, `Assigned content ${contentId} → ${deviceIds.length} screen(s)`);
  return { ok: r.ok, error: r.error };
}
export async function rebootScreens(deviceIds: string[]): Promise<ActionResult> {
  const g = await guard(); if (!g.ok) return g;
  const r = await rebootDevices(deviceIds);
  if (r.ok) await audit(g.orgId, g.actorId, `Rebooted ${deviceIds.length} screen(s)`);
  return { ok: r.ok, error: r.error };
}
export async function screenshotScreen(deviceId: string): Promise<ActionResult> {
  const g = await guard(); if (!g.ok) return g;
  const r = await screenshotDevice(deviceId);
  return { ok: r.ok, error: r.error, url: r.data?.url };
}
export async function setScreensPower(deviceIds: string[], on: boolean): Promise<ActionResult> {
  const g = await guard(); if (!g.ok) return g;
  const r = await setDevicePower(deviceIds, on);
  if (r.ok) await audit(g.orgId, g.actorId, `Power ${on ? "ON" : "OFF"} → ${deviceIds.length} screen(s)`);
  return { ok: r.ok, error: r.error };
}
export async function identifyScreen(deviceId: string): Promise<ActionResult> {
  const g = await guard(); if (!g.ok) return g;
  const r = await identifyDevice(deviceId);
  return { ok: r.ok, error: r.error };
}

// Push the live Fuse5 signage feed into the Wallboard datasource → every screen
// bound to it updates. Env-gated (WALLBOARD_API_KEY + WALLBOARD_DATASOURCE_ID).
export async function pushSignageToWallboard(origin: string): Promise<{ ok: boolean; error?: string; notices?: number }> {
  const me = await getCurrentUser();
  if (!me?.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot publish to displays." };
  const feed = await buildSignageFeed(origin);
  const r = await pushSignageDatasource(feed);
  if (!r.ok) return { ok: false, error: r.error };
  const supabase = await createClient();
  if (supabase && me.orgId) await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Wallboard Feed Pushed", detail: `${feed.notices.length} notices, survey ${feed.survey ? "on" : "off"}` });
  return { ok: true, notices: feed.notices.length };
}

export interface DisplayInput {
  id?: string;
  name: string;
  location: string;
  propertyId: string | null;
  status: "online" | "offline" | "warning";
}
export type DisplayResult = { ok: boolean; error?: string };

export async function saveDisplay(input: DisplayInput): Promise<DisplayResult> {
  if (!input.name.trim()) return { ok: false, error: "Display name is required." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage displays." };

  const row = { name: input.name.trim(), location: input.location.trim() || null, property_id: input.propertyId || null, status: input.status };

  if (input.id) {
    const { error } = await supabase.from("displays").update(row).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Display Updated", detail: `${row.name} (${row.status})` });
  } else {
    const { error } = await supabase.from("displays").insert({ org_id: me.orgId, ...row });
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Display Registered", detail: `${row.name} (${row.status})` });
  }
  return { ok: true };
}

export async function deleteDisplay(id: string): Promise<DisplayResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage displays." };
  const { error } = await supabase.from("displays").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Display Removed", detail: `Display ${id}` });
  return { ok: true };
}
