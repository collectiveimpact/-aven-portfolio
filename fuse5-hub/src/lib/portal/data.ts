import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
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
  const { error } = await admin.from("work_orders").insert({
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
  });
  if (error) return { ok: false, error: error.message };
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
