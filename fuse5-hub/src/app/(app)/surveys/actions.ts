"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import type { BuilderQuestion } from "@/lib/surveys/question";
import { QUESTIONS } from "@/lib/surveys/resident-satisfaction";

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

// Seed a draft survey from the Resident Satisfaction template — pre-loaded with all
// 41 questions so it opens ready to edit in the builder. Returns the new id so the
// caller can route straight into /surveys/[id].
export async function createFromResidentTemplate(): Promise<SurveyResult & { id?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage surveys." };
  const title = `Resident Satisfaction Survey — ${new Date().getUTCFullYear()}`;
  const questions: BuilderQuestion[] = QUESTIONS.map((q) => ({
    id: `q_${q.n}`, type: q.scale, text: q.text, options: q.options, required: true,
  }));
  const { data, error } = await supabase.from("surveys")
    .insert({ org_id: me.orgId, title, status: "draft", sent: 0, responses: 0, description: "Adapted from the TCHC 2025 Tenant Survey model.", questions })
    .select("id").single();
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Survey Created", detail: `${title} (from template, ${questions.length} questions)` });
  return { ok: true, id: data?.id };
}

// Create a blank draft survey and return its id (used by "Build a survey").
export async function createBlankSurvey(): Promise<SurveyResult & { id?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage surveys." };
  const { data, error } = await supabase.from("surveys")
    .insert({ org_id: me.orgId, title: "Untitled Survey", status: "draft", sent: 0, responses: 0, questions: [] })
    .select("id").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id };
}

export interface SurveyDetailInput { id: string; title: string; description: string; status: SurveyInput["status"]; questions: BuilderQuestion[] }

// Persist the builder: title, description, status, and the full question set.
export async function saveSurveyDetail(input: SurveyDetailInput): Promise<SurveyResult> {
  if (!input.title.trim()) return { ok: false, error: "Survey title is required." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage surveys." };
  // Light validation: keep well-formed questions only.
  const questions = (Array.isArray(input.questions) ? input.questions : [])
    .filter((q) => q && typeof q.text === "string" && typeof q.type === "string")
    .map((q) => ({ id: String(q.id), type: q.type, text: q.text.trim(), options: q.options?.map(String), required: q.required !== false }));
  const { error } = await supabase.from("surveys")
    .update({ title: input.title.trim(), description: input.description ?? "", status: input.status, questions })
    .eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Survey Saved", detail: `${input.title.trim()} (${questions.length} questions, ${input.status})` });
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
