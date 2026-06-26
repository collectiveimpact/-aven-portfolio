"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { isGlobal } from "@/lib/rbac";
import { IMPERSONATE_COOKIE } from "@/lib/platform";

// What we persist in the impersonation cookie. This is a VIEW-AS overlay only:
// it records who the operator is "viewing as" so the banner + picker can reflect
// it. It carries NO grant of privilege — real auth (Supabase session + RLS) is
// untouched, so the operator keeps exactly their own real permissions server-side.
export interface ImpersonationState {
  id: string;
  name: string;
  email?: string;
  roleLabel: string;
  provider: string;
}

interface ImpersonateInput {
  id?: string;
  name: string;
  email?: string;
  roleLabel: string;
  provider: string;
}

// Centralized gate so panel + actions agree: only a global operator (super_admin)
// may impersonate. Mirrors the prototype's isGlobalUser + canImpersonate check.
async function assertCanImpersonate() {
  const me = await getCurrentUser();
  if (!me?.role || !isGlobal(me.role)) {
    return { ok: false as const, error: "Only a Super Admin can impersonate users.", me: null };
  }
  return { ok: true as const, me };
}

// Begin impersonating a provider user. Faithful to the prototype: only a global
// operator (super_admin) may impersonate; the action is logged under the real
// identity, and a banner persists across the app until exit. (This sets the
// view-as context + audit; it never escalates real privilege.)
export async function impersonateUser(target: ImpersonateInput): Promise<{ ok: boolean; error?: string }> {
  const gate = await assertCanImpersonate();
  if (!gate.ok) return { ok: false, error: gate.error };
  const me = gate.me;

  const state: ImpersonationState = {
    id: target.id ?? `${target.provider}:${target.name}`,
    name: target.name,
    email: target.email,
    roleLabel: target.roleLabel,
    provider: target.provider,
  };

  const jar = await cookies();
  // httpOnly:false so the (client) banner + picker can reflect the active target.
  // Safe because the cookie is a non-privileged display hint, not an auth token.
  jar.set(IMPERSONATE_COOKIE, JSON.stringify(state), {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
  });

  const supabase = await createClient();
  if (supabase && me.orgId) {
    await supabase.from("audit_log").insert({
      org_id: me.orgId,
      actor_id: me.id,
      action: "Impersonation",
      detail: `Impersonated ${state.name} @ ${state.provider} (${state.roleLabel})`,
    });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function exitImpersonation(): Promise<{ ok: boolean; error?: string }> {
  const jar = await cookies();
  const had = jar.get(IMPERSONATE_COOKIE)?.value;
  jar.delete(IMPERSONATE_COOKIE);

  const me = await getCurrentUser();
  const supabase = await createClient();
  if (had && supabase && me?.orgId) {
    await supabase.from("audit_log").insert({
      org_id: me.orgId,
      actor_id: me.id,
      action: "Impersonation",
      detail: "Exited impersonation — returned to operator account",
    });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// Read the active impersonation target (if any) so the picker can highlight it
// and show an inline "viewing as" confirmation. Returns null when not active or
// when the caller is not a global operator.
export async function getActiveImpersonation(): Promise<ImpersonationState | null> {
  const gate = await assertCanImpersonate();
  if (!gate.ok) return null;
  try {
    const raw = (await cookies()).get(IMPERSONATE_COOKIE)?.value;
    if (!raw) return null;
    const v = JSON.parse(raw) as ImpersonationState;
    if (v && typeof v.name === "string") return v;
  } catch {
    /* malformed cookie — treat as inactive */
  }
  return null;
}
