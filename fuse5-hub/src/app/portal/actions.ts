"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getPortalSession, setPortalSession, clearPortalSession } from "@/lib/portal/session";
import {
  verifyResident,
  createRequest as createRequestData,
  submitSurvey as submitSurveyData,
  savePushSubscription as savePushSubscriptionData,
  uploadRequestPhoto as uploadRequestPhotoData,
  postRequestMessage as postRequestMessageData,
  getRequestMessages as getRequestMessagesData,
  type RequestMessageRow,
} from "@/lib/portal/data";
import { sendPortalPush } from "@/lib/portal/push";
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
  // photoUrl is the public URL of an already-uploaded Storage object (the form
  // uploads the file via uploadPhoto() first, then submits the returned URL).
  const photoUrl = String(formData.get("photoUrl") ?? "");

  const r = await createRequestData(session, { category, description, photoUrl });
  if (!r.ok) return { error: r.error };
  revalidatePath("/portal/requests");
  return { ok: true };
}

// ── Request photo upload (Storage) ───────────────────────────────────────────
export type PhotoUploadState = { ok?: boolean; url?: string; error?: string };

/** Upload a maintenance-request photo and return its public URL. */
export async function uploadPhoto(_prev: PhotoUploadState, formData: FormData): Promise<PhotoUploadState> {
  const session = await getPortalSession();
  if (!session) return { error: "Your session has expired. Please sign in again." };
  const file = formData.get("photo");
  if (!(file instanceof File)) return { error: "No file selected." };
  const r = await uploadRequestPhotoData(session, file);
  if (!r.ok) return { error: r.error };
  return { ok: true, url: r.url };
}

// ── Request chat thread ──────────────────────────────────────────────────────
export type RequestMessageState = { ok?: boolean; error?: string; messages?: RequestMessageRow[] };

/** Resident posts a message on one of their own requests; returns the thread. */
export async function postRequestMessage(
  _prev: RequestMessageState,
  formData: FormData,
): Promise<RequestMessageState> {
  const session = await getPortalSession();
  if (!session) return { error: "Your session has expired. Please sign in again." };
  const workOrderId = String(formData.get("workOrderId") ?? "");
  const body = String(formData.get("body") ?? "");
  if (!workOrderId) return { error: "Request not found." };

  const r = await postRequestMessageData(session, workOrderId, body);
  if (!r.ok) return { error: r.error };
  revalidatePath("/portal/requests");
  const messages = await getRequestMessagesData(session, workOrderId);
  return { ok: true, messages };
}

// ── Web-push subscription ────────────────────────────────────────────────────
export type PushSubState = { ok?: boolean; error?: string };

/** Persist a browser PushManager subscription for the signed-in resident. */
export async function savePushSubscription(sub: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<PushSubState> {
  const session = await getPortalSession();
  if (!session) return { error: "Your session has expired. Please sign in again." };
  const r = await savePushSubscriptionData(session, sub);
  if (!r.ok) return { error: r.error };
  // Fire a confirmation push (no-op stub until VAPID keys are configured).
  await sendPortalPush(session.residentId, session.orgId, {
    title: "Notifications on",
    body: "You'll get updates about your building and maintenance requests here.",
    url: "/portal",
    tag: "portal-welcome",
  });
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
