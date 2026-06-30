import { cookies } from "next/headers";
import type { F5Role } from "@/lib/rbac";

// ─────────────────────────────────────────────────────────────────────────────
// "View context" — two independent, cookie-backed overlays on top of the signed-
// in user, both controlled from the top bar:
//
//   1. View-as role  — a Super Admin can preview the product AS another role
//      (Housing Provider Admin / Frontline) to see exactly what that role sees
//      and can do. Downgrade-only: a non-super user can never elevate themselves.
//      The effective role drives the sidebar (visibleModules) and every can*()
//      capability check across the app.
//
//   2. Scope         — a provider + property filter that narrows the dashboards
//      (Overview / Analytics) to one housing provider and/or one property.
//
// Server-only (reads cookies). Pages/layout read it; the top-bar client controls
// mutate it via the "use server" actions in app/(app)/view-actions.ts.
// ─────────────────────────────────────────────────────────────────────────────

export const VIEW_ROLE_COOKIE = "f5_view_role";
export const SCOPE_COOKIE = "f5_scope";

/** Roles a Super Admin may preview the product as (the role-switcher options). */
export const VIEWABLE_ROLES: F5Role[] = ["super_admin", "org_admin", "frontline"];

export interface Scope {
  providerName: string | null;
  propertyName: string | null;
}
export const EMPTY_SCOPE: Scope = { providerName: null, propertyName: null };

/** The role override the operator picked, if any (and still valid). */
export async function getViewRole(): Promise<F5Role | null> {
  try {
    const raw = (await cookies()).get(VIEW_ROLE_COOKIE)?.value as F5Role | undefined;
    return raw && VIEWABLE_ROLES.includes(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** The current provider/property scope filter. */
export async function getScope(): Promise<Scope> {
  try {
    const raw = (await cookies()).get(SCOPE_COOKIE)?.value;
    if (!raw) return { ...EMPTY_SCOPE };
    const v = JSON.parse(raw) as Partial<Scope>;
    return { providerName: v.providerName ?? null, propertyName: v.propertyName ?? null };
  } catch {
    return { ...EMPTY_SCOPE };
  }
}

/**
 * The role the app should behave as. Only a REAL super_admin may preview another
 * role; for everyone else the override is ignored (they always get their real role).
 */
export function effectiveRole(real: F5Role | null, override: F5Role | null): F5Role | null {
  if (real === "super_admin" && override) return override;
  return real;
}
