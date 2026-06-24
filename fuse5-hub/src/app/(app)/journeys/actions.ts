"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { JOURNEY_TEMPLATES, type Trigger, type Step } from "@/lib/journeys";

export type SaveResult = { ok: boolean; id?: string; error?: string };

async function gate() {
  const supabase = await createClient();
  if (!supabase) return { error: "No backend configured." as const };
  const me = await getCurrentUser();
  if (!me?.orgId) return { error: "No organization for the current user." as const };
  if (!me.role || !canPublish(me.role)) return { error: "Your role cannot manage journeys." as const };
  return { supabase, me };
}

export async function saveJourney(input: { id?: string; name: string; trigger: Trigger; steps: Step[] }): Promise<SaveResult> {
  if (!input.name.trim()) return { ok: false, error: "Name the journey first." };
  const g = await gate();
  if ("error" in g) return { ok: false, error: g.error };
  const { supabase, me } = g;

  const row = { name: input.name.trim(), trigger: input.trigger, steps: input.steps, updated_at: new Date().toISOString() };
  if (input.id) {
    const { error } = await supabase.from("journeys").update(row).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Journey Updated", detail: row.name });
    return { ok: true, id: input.id };
  }
  const { data, error } = await supabase.from("journeys").insert({ org_id: me.orgId, status: "draft", created_by: me.id ?? null, ...row }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not create journey." };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Journey Created", detail: row.name });
  return { ok: true, id: data.id };
}

export async function createFromTemplate(templateKey: string): Promise<SaveResult> {
  const t = JOURNEY_TEMPLATES.find((x) => x.key === templateKey);
  if (!t) return { ok: false, error: "Unknown template." };
  return saveJourney({ name: t.name, trigger: t.trigger, steps: t.steps });
}

export async function setJourneyStatus(id: string, status: "draft" | "active" | "paused"): Promise<SaveResult> {
  const g = await gate();
  if ("error" in g) return { ok: false, error: g.error };
  const { supabase, me } = g;
  const { error } = await supabase.from("journeys").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Journey " + (status === "active" ? "Activated" : status === "paused" ? "Paused" : "Set Draft"), detail: `Journey ${id}` });
  return { ok: true, id };
}

export async function deleteJourney(id: string): Promise<SaveResult> {
  const g = await gate();
  if ("error" in g) return { ok: false, error: g.error };
  const { supabase, me } = g;
  const { error } = await supabase.from("journeys").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Journey Removed", detail: `Journey ${id}` });
  return { ok: true };
}
