// Dashboard layout persistence.
//
// TODAY: per-user/per-org layouts are stored in localStorage, keyed by a stable
// scope string the server passes down (userId or org name). This keeps the
// feature fully client-side with zero migration risk.
//
// DB FOLLOW-UP: persist DashboardLayout to a `user_dashboards` table
// (user_id, org_id, layout jsonb, updated_at) behind a `saveDashboardLayout`
// server action + a getter in queries.ts. The DashboardLayout shape is already
// versioned + JSON-serializable, so the swap is load/save only — no UI changes.

import type { DashboardLayout, PlacedWidget } from "./types";

const KEY_PREFIX = "f5.dashboard.layout";

/** Build the localStorage key for a given scope (user id, else org, else "demo"). */
export function layoutKey(scope: string | null | undefined): string {
  const safe = (scope ?? "demo").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
  return `${KEY_PREFIX}.${safe}`;
}

function isValidLayout(v: unknown): v is DashboardLayout {
  if (!v || typeof v !== "object") return false;
  const l = v as Record<string, unknown>;
  if (l.version !== 1 || !Array.isArray(l.widgets)) return false;
  return (l.widgets as unknown[]).every(
    (w) => !!w && typeof w === "object" && typeof (w as PlacedWidget).id === "string",
  );
}

/** Read a saved layout for a scope, or null if none / invalid / SSR. */
export function loadLayout(scope: string | null | undefined): DashboardLayout | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(layoutKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isValidLayout(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Persist a layout for a scope. No-op on SSR / quota errors. */
export function saveLayout(scope: string | null | undefined, layout: DashboardLayout): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(layoutKey(scope), JSON.stringify(layout));
  } catch {
    /* quota / private mode — ignore, layout simply won't persist */
  }
}

/** Clear a saved layout (used by "Reset to default"). */
export function clearLayout(scope: string | null | undefined): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(layoutKey(scope));
  } catch {
    /* ignore */
  }
}
