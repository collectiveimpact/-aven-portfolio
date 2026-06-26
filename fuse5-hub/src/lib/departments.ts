// Department axis — convenience re-exports + helpers.
//
// The canonical Department type, DEFAULT_DEPARTMENTS list, and DEPARTMENT_LABELS
// live in src/lib/rbac.ts (next to the role model, since the two axes are used
// together). This module re-exports them so feature code can import department
// concerns from a dedicated, intention-revealing path, and adds small helpers.
//
// At runtime an org's departments come from the org-scoped `departments` table
// (migration 0019); the defaults here are the seeded starter set.
export {
  type Department,
  DEPARTMENT_LABELS,
  DEFAULT_DEPARTMENTS,
} from "./rbac";

import { DEPARTMENT_LABELS, type Department } from "./rbac";

// Human label for a department key, falling back to the raw key for any custom
// (non-default) department an org has created.
export function departmentLabel(key: string): string {
  return (DEPARTMENT_LABELS as Record<string, string>)[key] ?? key;
}

// Normalize a free-text department name into a stable slug key (mirrors the
// server action's slugify so client + server agree on keys).
export function departmentKey(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

export const isDefaultDepartment = (key: string): key is Department =>
  key in DEPARTMENT_LABELS;
