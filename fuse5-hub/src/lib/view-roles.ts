// Pure, dependency-free labels for the role switcher — safe to import from BOTH
// server components (the layout banner) and client components (the top-bar select).
// Kept out of lib/view.ts because that imports next/headers (server-only) and out
// of topbar-controls.tsx because that's "use client" (its values aren't readable
// from server components).

/** Friendly role-switcher labels (distinct from the fuller ROLE_LABELS). */
export const VIEW_ROLE_LABELS: Record<"super_admin" | "org_admin" | "frontline", string> = {
  super_admin: "Fuse5 Super Admin",
  org_admin: "Housing Provider Admin",
  frontline: "Frontline User",
};

export const VIEW_ROLE_ORDER: ("super_admin" | "org_admin" | "frontline")[] = ["super_admin", "org_admin", "frontline"];
