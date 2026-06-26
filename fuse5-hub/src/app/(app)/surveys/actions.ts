"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";

export interface SurveyInput {
  id?: string;
  title: string;
  status: "draft" | "live" | "closed";
  sent: number;
  responses: number;
}
export type SurveyResult = { ok: boolean; error?: string };

export async function saveSurvey(input: SurveyInput): Promise<SurveyResult> {
  if (!input.title.trim()) return { ok: false, error: "Survey title is required." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage surveys." };

  const row = {
    title: input.title.trim(),
    status: input.status,
    sent: Number.isFinite(input.sent) && input.sent >= 0 ? Math.floor(input.sent) : 0,
    responses: Number.isFinite(input.responses) && input.responses >= 0 ? Math.floor(input.responses) : 0,
  };

  if (input.id) {
    const { error } = await supabase.from("surveys").update(row).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Survey Updated", detail: `${row.title} (${row.status})` });
  } else {
    const { error } = await supabase.from("surveys").insert({ org_id: me.orgId, ...row });
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Survey Created", detail: `${row.title} (${row.status})` });
  }
  return { ok: true };
}

// Seed a draft survey from the Resident Satisfaction template. The full question
// bank lives in @/lib/surveys/resident-satisfaction (the model); this creates the
// tracking row residents are surveyed against.
export async function createFromResidentTemplate(): Promise<SurveyResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage surveys." };
  const title = `Resident Satisfaction Survey — ${new Date().getUTCFullYear()}`;
  const { error } = await supabase.from("surveys").insert({ org_id: me.orgId, title, status: "draft", sent: 0, responses: 0 });
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Survey Created", detail: `${title} (from template)` });
  return { ok: true };
}

export async function deleteSurvey(id: string): Promise<SurveyResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage surveys." };
  const { error } = await supabase.from("surveys").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Survey Deleted", detail: `Survey ${id}` });
  return { ok: true };
}
