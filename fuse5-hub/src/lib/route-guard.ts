import { MODULES } from "@/lib/modules";
import type { F5Role } from "@/lib/rbac";

// Role-based route access, mirroring visibleModules() so the guard and the nav
// always agree. Used server-side in the (app) layout: a request whose effective
// role can't view the matched module is redirected to that role's landing page.

/** The module whose href is the longest prefix of `pathname` (or null). */
export function matchedModule(pathname: string) {
  const candidates = MODULES.filter((m) =>
    m.href === "/" ? pathname === "/" : pathname === m.href || pathname.startsWith(m.href + "/"),
  );
  return candidates.sort((a, b) => b.href.length - a.href.length)[0] ?? null;
}

/**
 * May this effective role view this path? Unregistered routes (not in the module
 * registry) are NOT guarded here (e.g. the public survey pages). A module must be
 * both activated for the org (or core) AND permitted for the role.
 */
export function canViewPath(pathname: string, role: F5Role | null, enabled: Set<string>): boolean {
  const m = matchedModule(pathname);
  if (!m) return true;
  if (!role) return true;
  const activated = m.core || enabled.has(m.key);
  return activated && m.roles.includes(role);
}

/** Where each role lands / is bounced to when it hits a forbidden route. */
export function landingFor(role: F5Role | null): string {
  if (role === "frontline") return "/workorders"; // day-to-day queue
  return "/"; // Overview (role-aware content) for everyone else
}
