"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type AnswerValue = number | string | string[] | null | undefined;

// Record a public survey response. Runs with the service role (residents aren't
// authenticated); validates the survey is open, keeps only answers to real
// questions, inserts the row, and bumps the survey's response counter.
export async function submitSurveyResponse(surveyId: string, answers: Record<string, AnswerValue>): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Responses aren't configured for this environment." };

  const { data: survey } = await admin.from("surveys").select("org_id,status,questions,responses").eq("id", surveyId).maybeSingle();
  if (!survey) return { ok: false, error: "Survey not found." };
  if (survey.status === "closed") return { ok: false, error: "This survey is closed." };

  const ids = new Set((Array.isArray(survey.questions) ? survey.questions : []).map((q: { id: string }) => q.id));
  const clean: Record<string, AnswerValue> = {};
  for (const [k, v] of Object.entries(answers ?? {})) if (ids.has(k) && v !== undefined && v !== null && v !== "") clean[k] = v;
  if (Object.keys(clean).length === 0) return { ok: false, error: "No answers provided." };

  const { error } = await admin.from("survey_responses").insert({ org_id: survey.org_id, survey_id: surveyId, answers: clean, channel: "link" });
  if (error) return { ok: false, error: error.message };

  await admin.from("surveys").update({ responses: (survey.responses ?? 0) + 1 }).eq("id", surveyId);
  return { ok: true };
}
