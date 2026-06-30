"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { VIEW_ROLE_COOKIE, SCOPE_COOKIE, VIEWABLE_ROLES } from "@/lib/view";
import { getCurrentUser } from "@/lib/auth";
import type { F5Role } from "@/lib/rbac";

// Mutators for the top-bar view context (see lib/view.ts). Both revalidate the
// whole app layout so the sidebar + dashboards re-render under the new context.

/**
 * Preview the product as another role. Guarded server-side: ONLY a real
 * super_admin may switch; "reset"/super_admin clears the override. This is a
 * view overlay, not a privilege grant — it can only ever narrow what's shown.
 */
export async function setViewRole(role: F5Role | "reset"): Promise<{ ok: boolean }> {
  const me = await getCurrentUser();
  if (me?.role !== "super_admin") return { ok: false };
  const jar = await cookies();
  if (role === "reset" || role === "super_admin") {
    jar.delete(VIEW_ROLE_COOKIE);
  } else if (VIEWABLE_ROLES.includes(role)) {
    jar.set(VIEW_ROLE_COOKIE, role, { path: "/", sameSite: "lax" });
  } else {
    return { ok: false };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Set the provider/property scope filter. MERGES with the current scope: only the
 * keys present in `next` change, so a provider-only control (Analytics) won't clear
 * a property selection set elsewhere, and vice-versa. Pass an explicit null to a
 * key to clear just that dimension.
 */
export async function setScope(next: { providerName?: string | null; propertyName?: string | null }): Promise<{ ok: boolean }> {
  const jar = await cookies();
  let current: { providerName: string | null; propertyName: string | null } = { providerName: null, propertyName: null };
  try {
    const raw = jar.get(SCOPE_COOKIE)?.value;
    if (raw) { const v = JSON.parse(raw); current = { providerName: v.providerName ?? null, propertyName: v.propertyName ?? null }; }
  } catch { /* ignore malformed */ }

  const merged = {
    providerName: ("providerName" in next ? (next.providerName || null) : current.providerName),
    propertyName: ("propertyName" in next ? (next.propertyName || null) : current.propertyName),
  };
  if (!merged.providerName && !merged.propertyName) {
    jar.delete(SCOPE_COOKIE);
  } else {
    jar.set(SCOPE_COOKIE, JSON.stringify(merged), { path: "/", sameSite: "lax" });
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
