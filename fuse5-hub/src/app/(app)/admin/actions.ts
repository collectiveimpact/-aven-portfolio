"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { canAdmin, canOnboardUsers, ROLE_LABELS, type F5Role } from "@/lib/rbac";

export type AdminResult = { ok: boolean; error?: string };
export type AdminResultWith<T> = AdminResult & { data?: T };

export interface DepartmentRow { id: string; key: string; label: string }

// Change an org member's role. Admin-only (matches the org_members RLS policy),
// with a self-lockout guard so an admin can't accidentally drop their own access.
export async function setMemberRole(memberId: string, role: F5Role): Promise<AdminResult> {
  if (!(role in ROLE_LABELS)) return { ok: false, error: "Unknown role." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canAdmin(me.role)) return { ok: false, error: "Only an Org Admin can change roles." };

  const { data: member } = await supabase.from("org_members").select("user_id").eq("id", memberId).maybeSingle();
  if (!member) return { ok: false, error: "Member not found." };
  if (member.user_id === me.id && !canAdmin(role)) {
    return { ok: false, error: "You can't remove your own admin access." };
  }

  const { error } = await supabase.from("org_members").update({ role }).eq("id", memberId);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Member Role Changed", detail: `${memberId} → ${ROLE_LABELS[role]}` });
  return { ok: true };
}

// ============================================================================
// Departments (added for the WoodGreen rollout). The catalog is Super/Org Admin
// managed (matches the departments RLS in migration 0019); assigning a member's
// department is part of the IT-admin onboarding scope (canOnboardUsers).
// ============================================================================

// List the org's departments (any member may read; RLS enforces org scope).
export async function listDepartments(): Promise<DepartmentRow[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  try {
    const { data } = await supabase.from("departments").select("id,key,label").order("label");
    return (data ?? []).map((d) => ({ id: d.id, key: d.key, label: d.label }));
  } catch { return []; }
}

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);

// Create a department. Admin-only (RLS also enforces the Super/Org Admin tier).
export async function createDepartment(label: string): Promise<AdminResultWith<DepartmentRow>> {
  const name = label.trim();
  if (!name) return { ok: false, error: "Enter a department name." };
  const key = slugify(name);
  if (!key) return { ok: false, error: "Name must contain letters or numbers." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canAdmin(me.role)) return { ok: false, error: "Only an Admin can manage departments." };

  const { data, error } = await supabase
    .from("departments")
    .insert({ org_id: me.orgId, key, label: name })
    .select("id,key,label")
    .maybeSingle();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "A department with that name already exists." };
    return { ok: false, error: error.message };
  }
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Department Created", detail: name });
  return { ok: true, data: data ? { id: data.id, key: data.key, label: data.label } : undefined };
}

// Assign (or clear, with null) a member's department. Part of user onboarding —
// gated on canOnboardUsers so the stripped IT Admin can do it.
export async function setMemberDepartment(memberId: string, departmentId: string | null): Promise<AdminResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canOnboardUsers(me.role)) return { ok: false, error: "Only an Admin can assign departments." };

  if (departmentId) {
    const { data: dept } = await supabase.from("departments").select("id,label").eq("id", departmentId).maybeSingle();
    if (!dept) return { ok: false, error: "Department not found." };
  }

  const { error } = await supabase.from("org_members").update({ department_id: departmentId }).eq("id", memberId);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({
    org_id: me.orgId, actor_id: me.id, action: "Member Department Changed",
    detail: `${memberId} → ${departmentId ?? "unassigned"}`,
  });
  return { ok: true };
}

// ============================================================================
// Profile view / edit  +  user onboarding (the Users & Roles wave).
// The inline role/department setters above stay as-is; these add the full
// view-edit-a-profile and add-a-user flows the panel drives.
// ============================================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface MemberProfile {
  id: string;            // org_members.id
  userId: string;        // auth user / profiles.id
  fullName: string;
  email: string;
  role: F5Role;
  departmentId: string | null;
  status: string;        // "active" | "invited" | "suspended" (best-effort)
  createdAt: string | null;
  lastActiveAt: string | null;
}

// Load one member's full profile for the drawer. Joins org_members + profiles.
// Admin-scoped (RLS already restricts org_members reads to the member's org).
export async function getMemberProfile(memberId: string): Promise<AdminResultWith<MemberProfile>> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canOnboardUsers(me.role)) return { ok: false, error: "Only an Admin can view member profiles." };

  const { data: member, error } = await supabase
    .from("org_members")
    .select("id,user_id,role,department_id,created_at")
    .eq("id", memberId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!member) return { ok: false, error: "Member not found." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name,email,created_at")
    .eq("id", member.user_id)
    .maybeSingle();

  // `status` / `last_active` aren't guaranteed columns on org_members in every
  // migration; read them defensively so this works whether or not they exist.
  const m = member as Record<string, unknown>;
  const status = typeof m.status === "string" ? (m.status as string) : "active";
  const lastActiveAt = typeof m.last_active_at === "string" ? (m.last_active_at as string) : null;

  return {
    ok: true,
    data: {
      id: member.id,
      userId: member.user_id,
      fullName: profile?.full_name || "",
      email: profile?.email || "",
      role: member.role as F5Role,
      departmentId: member.department_id ?? null,
      status,
      createdAt: profile?.created_at ?? member.created_at ?? null,
      lastActiveAt,
    },
  };
}

export interface ProfileEdit {
  fullName: string;
  email: string;
  role: F5Role;
  departmentId: string | null;
}

// Persist edits made in the profile drawer. Role + department go through the
// same guarded updates as the inline setters; name/email update the profiles
// row (RLS `profile_self` only permits self-edits, so for OTHER members we use
// the service-role client when available, else best-effort + audit). Every
// successful change is written to audit_log.
export async function updateMemberProfile(memberId: string, edit: ProfileEdit): Promise<AdminResult> {
  const fullName = edit.fullName.trim();
  const email = edit.email.trim().toLowerCase();
  if (!fullName) return { ok: false, error: "Name is required." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (!(edit.role in ROLE_LABELS)) return { ok: false, error: "Unknown role." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canOnboardUsers(me.role)) return { ok: false, error: "Only an Admin can edit profiles." };

  const { data: member } = await supabase
    .from("org_members")
    .select("user_id,role")
    .eq("id", memberId)
    .maybeSingle();
  if (!member) return { ok: false, error: "Member not found." };

  // Role change is admin-only (matches setMemberRole), with self-lockout guard.
  if (edit.role !== member.role) {
    if (!canAdmin(me.role)) return { ok: false, error: "Only an Org Admin can change roles." };
    if (member.user_id === me.id && !canAdmin(edit.role)) {
      return { ok: false, error: "You can't remove your own admin access." };
    }
    const { error } = await supabase.from("org_members").update({ role: edit.role }).eq("id", memberId);
    if (error) return { ok: false, error: error.message };
  }

  // Department (clear with null) — gated on canOnboardUsers, same as setMemberDepartment.
  if (edit.departmentId) {
    const { data: dept } = await supabase.from("departments").select("id").eq("id", edit.departmentId).maybeSingle();
    if (!dept) return { ok: false, error: "Department not found." };
  }
  {
    const { error } = await supabase.from("org_members").update({ department_id: edit.departmentId }).eq("id", memberId);
    if (error) return { ok: false, error: error.message };
  }

  // Name / email on the profiles row. RLS `profile_self` only lets a user edit
  // their OWN profile, so use the service-role client for other members.
  const profileWriter = member.user_id === me.id ? supabase : (createAdminClient() ?? supabase);
  const { error: pErr } = await profileWriter
    .from("profiles")
    .update({ full_name: fullName, email })
    .eq("id", member.user_id);
  // A blocked cross-user profile write (no service key) isn't fatal — role +
  // department still saved; we surface a soft note rather than failing the save.
  const profileBlocked = Boolean(pErr) && member.user_id !== me.id;

  await supabase.from("audit_log").insert({
    org_id: me.orgId, actor_id: me.id, action: "Member Profile Updated",
    detail: `${fullName} <${email}> · ${ROLE_LABELS[edit.role]}`,
  });

  if (profileBlocked) {
    return { ok: true, error: "Role & department saved. Name/email need a service-role key to change another user's profile." };
  }
  return { ok: true };
}

export interface OnboardInput {
  fullName: string;
  email: string;
  role: F5Role;
  departmentId: string | null;
  sendInvite: boolean;
}
export interface OnboardOutcome { memberId?: string; pending: boolean; invited: boolean }

// Onboard / add a user. With a service-role key we do the REAL thing: create (or
// invite) the auth user, upsert their profile, and insert the org_members row
// (role + department). Without it — auth.users can't be created from the
// RLS-scoped client — we record the invite in audit_log and return it as
// "invite pending" so the admin has a tracked, honest record.
export async function onboardMember(input: OnboardInput): Promise<AdminResultWith<OnboardOutcome>> {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  if (!fullName) return { ok: false, error: "Name is required." };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (!(input.role in ROLE_LABELS)) return { ok: false, error: "Unknown role." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canOnboardUsers(me.role)) return { ok: false, error: "Only an Admin can onboard users." };
  // Assigning a role at or above your own is an admin-only action.
  if (!canAdmin(me.role) && canAdmin(input.role)) {
    return { ok: false, error: "Only an Org Admin can grant admin roles." };
  }
  if (input.departmentId) {
    const { data: dept } = await supabase.from("departments").select("id").eq("id", input.departmentId).maybeSingle();
    if (!dept) return { ok: false, error: "Department not found." };
  }

  const admin = createAdminClient();

  // ---- Real path: service-role key present → create the membership for real. ----
  if (admin) {
    // Find an existing auth user with this email, else invite/create one.
    let userId: string | null = null;
    try {
      if (input.sendInvite) {
        const { data, error } = await admin.auth.admin.inviteUserByEmail(email);
        if (error && !/already.*registered|exists/i.test(error.message)) return { ok: false, error: error.message };
        userId = data?.user?.id ?? null;
      }
      if (!userId) {
        // No invite (or invite hit an existing user): create/lookup the user.
        const { data: created, error: cErr } = await admin.auth.admin.createUser({ email, email_confirm: !input.sendInvite });
        if (created?.user?.id) userId = created.user.id;
        else if (cErr && /already.*registered|exists/i.test(cErr.message)) {
          const { data: list } = await admin.auth.admin.listUsers();
          userId = list?.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;
        } else if (cErr) return { ok: false, error: cErr.message };
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Could not create the auth user." };
    }
    if (!userId) return { ok: false, error: "Could not resolve the new user's account." };

    // Upsert profile (FK to auth.users now satisfied).
    await admin.from("profiles").upsert({ id: userId, full_name: fullName, email }, { onConflict: "id" });

    // Already a member of this org?
    const { data: existing } = await admin.from("org_members").select("id").eq("org_id", me.orgId).eq("user_id", userId).maybeSingle();
    if (existing) return { ok: false, error: "That person is already a member of this organization." };

    const row: Record<string, unknown> = { org_id: me.orgId, user_id: userId, role: input.role, department_id: input.departmentId };
    const { data: inserted, error: mErr } = await admin.from("org_members").insert(row).select("id").maybeSingle();
    if (mErr) return { ok: false, error: mErr.message };

    await supabase.from("audit_log").insert({
      org_id: me.orgId, actor_id: me.id, action: "User Onboarded",
      detail: `${fullName} <${email}> · ${ROLE_LABELS[input.role]}${input.sendInvite ? " · invite sent" : ""}`,
    });
    return { ok: true, data: { memberId: inserted?.id, pending: false, invited: input.sendInvite } };
  }

  // ---- Fallback: no service-role key → can't create auth.users. Record the
  // invite as pending so it's tracked and auditable, and report it clearly. ----
  await supabase.from("audit_log").insert({
    org_id: me.orgId, actor_id: me.id, action: "User Invite Pending",
    detail: `${fullName} <${email}> · ${ROLE_LABELS[input.role]} · awaiting auth provisioning`,
  });
  return { ok: true, data: { pending: true, invited: false } };
}
