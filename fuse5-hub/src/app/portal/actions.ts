"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPortalSession, setPortalSession, clearPortalSession } from "@/lib/portal/session";
import {
  verifyResident,
  createRequest as createRequestData,
  submitSurvey as submitSurveyData,
} from "@/lib/portal/data";
import { generateText } from "@/lib/ai";
import { hasAI } from "@/lib/env";

// ── Sign in / out ────────────────────────────────────────────────────────────
export type SignInState = { error?: string };

export async function signInResident(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim();
  const check = String(formData.get("check") ?? "").trim(); // last name OR unit

  if (!email || !check) return { error: "Enter your email and your last name or unit." };

  const resident = await verifyResident(email, check);
  if (!resident) {
    // Deliberately vague — don't reveal whether the email exists.
    return { error: "We couldn't match those details. Check your email and last name/unit, or contact your housing office." };
  }

  await setPortalSession({ residentId: resident.id, orgId: resident.org_id, name: resident.name });
  redirect("/portal");
}

export async function signOutResident(): Promise<void> {
  await clearPortalSession();
  redirect("/portal/signin");
}

// ── Maintenance request ──────────────────────────────────────────────────────
export type RequestState = { ok?: boolean; error?: string };

export async function submitRequest(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const session = await getPortalSession();
  if (!session) return { error: "Your session has expired. Please sign in again." };

  const category = String(formData.get("category") ?? "general");
  const description = String(formData.get("description") ?? "");
  const photoUrl = String(formData.get("photoUrl") ?? "");

  const r = await createRequestData(session, { category, description, photoUrl });
  if (!r.ok) return { error: r.error };
  revalidatePath("/portal/requests");
  return { ok: true };
}

// ── Survey response ──────────────────────────────────────────────────────────
export async function submitSurveyResponse(
  surveyId: string,
  answers: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const session = await getPortalSession();
  if (!session) return { ok: false, error: "Your session has expired. Please sign in again." };
  const r = await submitSurveyData(session, surveyId, answers);
  if (r.ok) revalidatePath("/portal/surveys");
  return r;
}

// ── Ask (Tenant Inquiry) ─────────────────────────────────────────────────────
export interface AskResult {
  answer: string;
  mode: "live" | "stub";
}

/**
 * Resident asks a free-form question. We ground the AI in the resident's
 * building + recent-notice context, then answer with the shared generateText
 * helper (live via Claude when ANTHROPIC_API_KEY is set, deterministic stub
 * otherwise). This is an AI assistant — answers are informational, not official.
 */
export async function askQuestion(question: string, context: string): Promise<AskResult> {
  const q = question.trim();
  if (!q) return { answer: "Please type a question first.", mode: hasAI ? "live" : "stub" };

  const prompt = `You are the resident assistant for a social-housing provider, helping a tenant in their resident portal.
Answer the resident's question helpfully, warmly, and in plain language. Be concise (2–4 short paragraphs max).
If the question is about an emergency (fire, gas, flood, no heat in winter, safety), tell them to call their emergency maintenance line or 911 immediately.
For anything you cannot confirm (rent balances, personal account details, legal advice), tell them to contact their housing office directly and do not guess.

Context about this resident's building and recent notices:
${context || "(no additional building context available)"}

Resident's question: ${q}`;

  const { text, mode } = await generateText(prompt);
  return { answer: text, mode };
}
