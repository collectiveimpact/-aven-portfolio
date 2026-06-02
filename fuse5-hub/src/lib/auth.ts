import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { F5Role } from "@/lib/rbac";

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  orgId: string | null;
  orgName: string | null;
  role: F5Role | null;
}

/** Resolve the signed-in user + their org membership. Null in demo mode / signed out. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase.from("profiles").select("full_name,email").eq("id", user.id).maybeSingle();
  const { data: member } = await supabase
    .from("org_members")
    .select("role, org_id, organizations(name)")
    .eq("user_id", user.id)
    .maybeSingle();

  const org = member?.organizations as { name: string } | { name: string }[] | null | undefined;
  const orgName = Array.isArray(org) ? org[0]?.name ?? null : org?.name ?? null;

  return {
    id: user.id,
    email: profile?.email ?? user.email ?? "",
    fullName: profile?.full_name ?? "",
    orgId: member?.org_id ?? null,
    orgName,
    role: (member?.role as F5Role) ?? null,
  };
}
