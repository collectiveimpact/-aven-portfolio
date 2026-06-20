"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { isGlobal } from "@/lib/rbac";
import { IMPERSONATE_COOKIE } from "@/lib/platform";

// Begin impersonating a provider user. Faithful to the prototype: only a global
// operator (super_admin) may impersonate; the action is logged under the real
// identity, and a banner persists across the app until exit. (This sets the
// view-as context + audit; per-getter org re-scoping is a follow-up.)
export async function impersonateUser(target: { name: string; roleLabel: string; provider: string }): Promise<{ ok: boolean; error?: string }> {
  const me = await getCurrentUser();
  if (!me?.role || !isGlobal(me.role)) return { ok: false, error: "Only a Super Admin can impersonate users." };

  const jar = await cookies();
  jar.set(IMPERSONATE_COOKIE, JSON.stringify(target), { httpOnly: false, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });

  const supabase = await createClient();
  if (supabase && me.orgId) {
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Impersonation", detail: `Impersonated ${target.name} @ ${target.provider} (${target.roleLabel})` });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function exitImpersonation(): Promise<{ ok: boolean; error?: string }> {
  const jar = await cookies();
  jar.delete(IMPERSONATE_COOKIE);
  const me = await getCurrentUser();
  const supabase = await createClient();
  if (supabase && me?.orgId) {
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Impersonation", detail: "Exited impersonation — returned to operator account" });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
