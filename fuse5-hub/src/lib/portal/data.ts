import "server-only";
import crypto from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createWorkOrder as createYardiWorkOrder } from "@/lib/yardi/mcp";
import type { PortalSession } from "./session";

// ─────────────────────────────────────────────────────────────────────────────
// Resident-portal data access.
//
// SECURITY: every function here uses the SERVICE-ROLE client (residents are not
// Supabase-authenticated) but is scoped STRICTLY to the cookie's residentId /
// orgId. The service-role key bypasses RLS, so these explicit `.eq()` filters are
// the only isolation boundary in the prototype. Production must add resident RLS
// (see lib/portal/session.ts). Never return data that isn't filtered to the
// session's resident/org.
// ─────────────────────────────────────────────────────────────────────────────

export interface ResidentRow {
  id: string;
  org_id: string;
  property_id: string | null;
  unit: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  language: string | null;
}

export interface PropertyRow {
  id: string;
  name: string;
  address: string | null;
}

/**
 * Verify a resident by email + a light secondary check (last name OR unit).
 * Demo-grade only — see session.ts. Returns the resident row on a match.
 */
export async function verifyResident(
  email: string,
  check: string,
): Promise<ResidentRow | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const cleanEmail = email.trim().toLowerCase();
  const cleanCheck = check.trim().toLowerCase();
  if (!cleanEmail || !cleanCheck) return null;

  // Look up active residents by email (case-insensitive). There can be more than
  // one match across orgs in theory; we then confirm with the secondary check.
  const { data } = await admin
    .from("residents")
    .select("id,org_id,property_id,unit,name,email,phone,language,status")
    .ilike("email", cleanEmail)
    .eq("status", "active");

  const rows = (data ?? []) as (ResidentRow & { status: string })[];
  const match = rows.find((r) => {
    const last = (r.name ?? "").trim().split(/\s+/).pop()?.toLowerCase() ?? "";
    const unit = (r.unit ?? "").trim().toLowerCase();
    return cleanCheck === last || (!!unit && cleanCheck === unit);
  });
  if (!match) return null;
  return {
    id: match.id, org_id: match.org_id, property_id: match.property_id, unit: match.unit,
    name: match.name, email: match.email, phone: match.phone, language: match.language,
  };
}

/** Re-load the signed-in resident (defence-in-depth: re-scope to the session). */
export async function getResident(session: PortalSession): Promise<ResidentRow | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("residents")
    .select("id,org_id,property_id,unit,name,email,phone,language")
    .eq("id", session.residentId)
    .eq("org_id", session.orgId)
    .maybeSingle();
  return (data as ResidentRow) ?? null;
}

export async function getProperty(session: PortalSession, propertyId: string | null): Promise<PropertyRow | null> {
  if (!propertyId) return null;
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("properties")
    .select("id,name,address")
    .eq("id", propertyId)
    .eq("org_id", session.orgId) // never read another org's property
    .maybeSingle();
  return (data as PropertyRow) ?? null;
}

// ── Home: notices this resident received ─────────────────────────────────────
export interface NoticeRow {
  id: string;
  subject: string;
  body: string;
  priority: string;
  channels: string[];
  created_at: string;
  delivery_status: string;
  channel: string;
}

export async function getMyNotices(session: PortalSession): Promise<NoticeRow[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  // message_recipients rows for THIS resident, joined to the parent message.
  const { data } = await admin
    .from("message_recipients")
    .select("id,channel,status,messages(id,subject,body,priority,channels,created_at,status)")
    .eq("resident_id", session.residentId)
    .eq("org_id", session.orgId)
    .order("id", { ascending: false })
    .limit(50);

  type Joined = {
    channel: string;
    status: string;
    messages: {
      id: string; subject: string; body: string; priority: string;
      channels: string[]; created_at: string; status: string;
    } | null;
  };
  const rows = (data ?? []) as unknown as Joined[];
  return rows
    .filter((r) => r.messages && r.messages.status === "sent")
    .map((r) => ({
      id: r.messages!.id,
      subject: r.messages!.subject,
      body: r.messages!.body,
      priority: r.messages!.priority,
      channels: r.messages!.channels ?? [],
      created_at: r.messages!.created_at,
      delivery_status: r.status,
      channel: r.channel,
    }))
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

// ── Home: what's coming up (org-wide scheduled comms) ────────────────────────
export interface UpcomingRow {
  id: string;
  title: string;
  day: string;
  channel: string | null;
  status: string;
}

export async function getUpcoming(session: PortalSession): Promise<UpcomingRow[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from("calendar_events")
    .select("id,title,day,channel,status")
    .eq("org_id", session.orgId)
    .gte("day", today)
    .order("day", { ascending: true })
    .limit(12);
  return (data ?? []) as UpcomingRow[];
}

// ── Requests: this resident's maintenance work orders ────────────────────────
export interface RequestRow {
  id: string;
  title: string;
  category: string | null;
  priority: string;
  status: string;
  created_at: string;
  notice: { residentDescription?: string; photoUrl?: string } | null;
}

export async function getMyRequests(session: PortalSession): Promise<RequestRow[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const resident = await getResident(session);
  if (!resident) return [];

  // Scope to the resident's org + property + unit. Work orders aren't keyed to a
  // resident id, so unit+property is the tightest available scope.
  let q = admin
    .from("work_orders")
    .select("id,title,category,priority,status,created_at,notice")
    .eq("org_id", session.orgId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (resident.property_id) q = q.eq("property_id", resident.property_id);
  if (resident.unit) q = q.eq("unit", resident.unit);
  const { data } = await q;
  return (data ?? []) as RequestRow[];
}

export async function createRequest(
  session: PortalSession,
  input: { category: string; description: string; photoUrl?: string },
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Requests aren't configured for this environment." };
  const resident = await getResident(session);
  if (!resident) return { ok: false, error: "Your session has expired. Please sign in again." };

  const description = input.description.trim();
  if (!description) return { ok: false, error: "Please describe the issue." };

  // A concise title from the description; the full text + photo live in `notice`
  // (work_orders has no dedicated description column). notice_type marks it as a
  // resident-submitted maintenance request so staff can triage it.
  const title = description.length > 60 ? `${description.slice(0, 57)}…` : description;
  const { data: created, error } = await admin.from("work_orders").insert({
    org_id: session.orgId,
    property_id: resident.property_id,
    unit: resident.unit,
    title,
    category: input.category || "general",
    priority: "medium",
    status: "open",
    notice_type: "maintenance_request",
    notice: {
      residentDescription: description,
      photoUrl: input.photoUrl?.trim() || undefined,
      submittedBy: resident.name,
      submittedByResidentId: resident.id,
      source: "resident_portal",
    },
  }).select("id").single();
  if (error || !created) return { ok: false, error: error?.message ?? "Could not submit your request." };

  // Best-effort: open the matching work order in Yardi via the Virtuoso MCP and
  // stamp the returned WONumber onto external_id, so staff resolving it later
  // closes it in Yardi too (see setWorkOrderStatus). Non-blocking: a Yardi
  // failure never fails the resident's submission — it stays a local WO for
  // staff triage. No-op stub until YARDI_MCP_URL/TOKEN are configured.
  try {
    const { data: prop } = resident.property_id
      ? await admin.from("properties").select("name,external_id").eq("id", resident.property_id).maybeSingle()
      : { data: null };
    const propertyRef = (prop?.external_id as string | null) || (prop?.name as string | null) || "";
    if (propertyRef) {
      const y = await createYardiWorkOrder({
        property: propertyRef,
        unit: resident.unit ?? undefined,
        category: input.category || "general",
        description,
        priority: "medium",
      });
      if (y.ok && y.data?.id) {
        await admin.from("work_orders").update({ external_id: y.data.id }).eq("id", created.id).eq("org_id", session.orgId);
      }
      await admin.from("audit_log").insert({
        org_id: session.orgId, actor_id: null,
        action: "Yardi WO Created",
        detail: y.ok ? `Portal request → Yardi ${y.data?.id ?? "(no id)"} (${y.mode})` : `Portal request → Yardi push failed: ${y.error ?? "unknown"}`,
      });
    }
  } catch { /* non-blocking — local WO already created */ }

  return { ok: true };
}

// ── Surveys: open surveys for the org + submitting responses ─────────────────
export interface PortalSurvey {
  id: string;
  title: string;
  description: string | null;
  questions: unknown[];
}

export async function getOpenSurveys(session: PortalSession): Promise<PortalSurvey[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("surveys")
    .select("id,title,description,status,questions")
    .eq("org_id", session.orgId)
    .eq("status", "live");
  const rows = (data ?? []) as (PortalSurvey & { status: string })[];
  return rows
    .filter((s) => Array.isArray(s.questions) && s.questions.length > 0)
    .map((s) => ({ id: s.id, title: s.title, description: s.description, questions: s.questions }));
}

export async function getSurvey(session: PortalSession, surveyId: string): Promise<PortalSurvey | null> {
  const admin = createAdminClient();
  if (!admin) return null;
  const { data } = await admin
    .from("surveys")
    .select("id,title,description,status,questions")
    .eq("id", surveyId)
    .eq("org_id", session.orgId) // never another org's survey
    .maybeSingle();
  if (!data || data.status === "closed") return null;
  const s = data as PortalSurvey & { status: string };
  return { id: s.id, title: s.title, description: s.description, questions: s.questions };
}

export async function submitSurvey(
  session: PortalSession,
  surveyId: string,
  answers: Record<string, unknown>,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Responses aren't configured for this environment." };

  const { data: survey } = await admin
    .from("surveys")
    .select("org_id,status,questions,responses")
    .eq("id", surveyId)
    .eq("org_id", session.orgId)
    .maybeSingle();
  if (!survey) return { ok: false, error: "Survey not found." };
  if (survey.status === "closed") return { ok: false, error: "This survey is closed." };

  // Keep only answers to real questions (matches the /s/ public route's shape).
  const ids = new Set((Array.isArray(survey.questions) ? survey.questions : []).map((q: { id: string }) => q.id));
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(answers ?? {})) {
    if (ids.has(k) && v !== undefined && v !== null && v !== "") clean[k] = v;
  }
  if (Object.keys(clean).length === 0) return { ok: false, error: "No answers provided." };

  const { error } = await admin.from("survey_responses").insert({
    org_id: session.orgId,
    survey_id: surveyId,
    resident_id: session.residentId, // attribute to the signed-in resident
    answers: clean,
    channel: "portal",
  });
  if (error) return { ok: false, error: error.message };
  await admin.from("surveys").update({ responses: (survey.responses ?? 0) + 1 }).eq("id", surveyId);
  return { ok: true };
}

// ── Web-push subscriptions ───────────────────────────────────────────────────
// Persist the browser PushManager subscription for THIS resident so the (stubbed)
// sender can later push to them. Scoped to the session's resident/org.

export interface PushSubInput {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function savePushSubscription(
  session: PortalSession,
  sub: PushSubInput,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Notifications aren't configured for this environment." };
  const endpoint = sub.endpoint?.trim();
  const p256dh = sub.p256dh?.trim();
  const authKey = sub.auth?.trim();
  if (!endpoint || !p256dh || !authKey) return { ok: false, error: "Invalid subscription." };

  // Upsert on endpoint so re-enabling on the same browser refreshes the keys and
  // re-binds them to the current signed-in resident/org.
  const { error } = await admin
    .from("portal_push_subscriptions")
    .upsert(
      {
        resident_id: session.residentId,
        org_id: session.orgId,
        endpoint,
        p256dh,
        auth: authKey,
      },
      { onConflict: "endpoint" },
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Has THIS resident registered at least one push subscription? (drives UI state) */
export async function hasPushSubscription(session: PortalSession): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const { count } = await admin
    .from("portal_push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("resident_id", session.residentId)
    .eq("org_id", session.orgId);
  return (count ?? 0) > 0;
}

/** All push subscriptions for a resident (used by the stubbed sender). */
export async function getPushSubscriptions(
  residentId: string,
  orgId: string,
): Promise<{ endpoint: string; p256dh: string; auth: string }[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("portal_push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("resident_id", residentId)
    .eq("org_id", orgId);
  return (data ?? []) as { endpoint: string; p256dh: string; auth: string }[];
}

// Remove a dead subscription (the push service returned 404/410 — unsubscribed
// or expired) so we stop trying to deliver to it.
export async function pruneSubscription(endpoint: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  await admin.from("portal_push_subscriptions").delete().eq("endpoint", endpoint);
}

// ── Request chat thread ──────────────────────────────────────────────────────
// A resident may read + post messages on THEIR OWN work orders. We re-verify
// ownership (org + property + unit, matching getMyRequests) on every read/write
// so a resident can never touch another unit's thread.

export interface RequestMessageRow {
  id: string;
  work_order_id: string;
  sender: "resident" | "staff";
  body: string;
  created_at: string;
}

/** Confirm a work order belongs to the signed-in resident's org + unit. */
async function residentOwnsWorkOrder(
  session: PortalSession,
  workOrderId: string,
): Promise<boolean> {
  const admin = createAdminClient();
  if (!admin) return false;
  const resident = await getResident(session);
  if (!resident) return false;
  let q = admin
    .from("work_orders")
    .select("id")
    .eq("id", workOrderId)
    .eq("org_id", session.orgId);
  // Same tightest-available scope as getMyRequests (work orders aren't keyed to a
  // resident id). Both must match when present.
  if (resident.property_id) q = q.eq("property_id", resident.property_id);
  if (resident.unit) q = q.eq("unit", resident.unit);
  const { data } = await q.maybeSingle();
  return !!data;
}

export async function getRequestMessages(
  session: PortalSession,
  workOrderId: string,
): Promise<RequestMessageRow[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  // Ownership gate — never return another unit's thread.
  if (!(await residentOwnsWorkOrder(session, workOrderId))) return [];
  const { data } = await admin
    .from("request_messages")
    .select("id,work_order_id,sender,body,created_at")
    .eq("work_order_id", workOrderId)
    .eq("org_id", session.orgId)
    .order("created_at", { ascending: true })
    .limit(200);
  return (data ?? []) as RequestMessageRow[];
}

export async function postRequestMessage(
  session: PortalSession,
  workOrderId: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Messaging isn't configured for this environment." };
  const text = body.trim();
  if (!text) return { ok: false, error: "Type a message first." };
  if (text.length > 2000) return { ok: false, error: "Message is too long." };
  // Ownership gate — a resident may only post to their own request.
  if (!(await residentOwnsWorkOrder(session, workOrderId))) {
    return { ok: false, error: "Request not found." };
  }
  const { error } = await admin.from("request_messages").insert({
    work_order_id: workOrderId,
    org_id: session.orgId,
    resident_id: session.residentId, // attribute to the signed-in resident
    sender: "resident",
    body: text,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ── Request photo upload (Storage) ───────────────────────────────────────────
// Uploads a resident-supplied photo to the public `request-photos` bucket via
// the service role and returns its public URL. The caller stores that URL on the
// work order's `notice` jsonb (matching how requests already persist photoUrl).

const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"];
const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB

export async function uploadRequestPhoto(
  session: PortalSession,
  file: File,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const admin = createAdminClient();
  if (!admin) return { ok: false, error: "Photo upload isn't configured for this environment." };
  if (!file || file.size === 0) return { ok: false, error: "No file selected." };
  if (file.size > MAX_PHOTO_BYTES) return { ok: false, error: "Photo is too large (max 8 MB)." };
  if (file.type && !ALLOWED_PHOTO_TYPES.includes(file.type)) {
    return { ok: false, error: "Unsupported file type. Use JPG, PNG, WEBP, GIF, or HEIC." };
  }

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "jpg";
  // Path is org/resident-scoped + a random id → unguessable, and grouped for ops.
  const rand = crypto.randomUUID();
  const path = `${session.orgId}/${session.residentId}/${rand}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error } = await admin.storage
    .from("request-photos")
    .upload(path, bytes, { contentType: file.type || "image/jpeg", upsert: false });
  if (error) return { ok: false, error: error.message };

  const { data } = admin.storage.from("request-photos").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
