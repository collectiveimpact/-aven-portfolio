// Fuse5 Hub 8-role RBAC (ported from the v2.0.8 prototype role model).
export type F5Role =
  | "super_admin"      // Fuse5 global staff
  | "org_admin"        // provider account owner
  | "manager"          // multi-property manager
  | "property_manager" // single/few properties
  | "comms_manager"    // broadcasts + templates
  | "publisher"        // can publish content/displays
  | "frontline"        // day-to-day staff
  | "viewer";          // read-only (board, funder)

export const ROLE_LABELS: Record<F5Role, string> = {
  super_admin: "Fuse5 Super Admin",
  org_admin: "Org Admin",
  manager: "Manager",
  property_manager: "Property Manager",
  comms_manager: "Comms Manager",
  publisher: "Publisher",
  frontline: "Frontline Staff",
  viewer: "Viewer",
};

const CAN_BROADCAST: F5Role[] = ["super_admin", "org_admin", "manager", "comms_manager"];
const CAN_PUBLISH: F5Role[] = ["super_admin", "org_admin", "manager", "comms_manager", "publisher"];
const CAN_ADMIN: F5Role[] = ["super_admin", "org_admin"];

export const canBroadcast = (r: F5Role) => CAN_BROADCAST.includes(r);
export const canPublish = (r: F5Role) => CAN_PUBLISH.includes(r);
export const canAdmin = (r: F5Role) => CAN_ADMIN.includes(r);
export const isGlobal = (r: F5Role) => r === "super_admin";

// ============================================================================
// DEPARTMENT axis (added for the WoodGreen rollout) — orthogonal to role.
// A user has BOTH a role (what they can DO) and a department (WHERE they sit).
// Departments group an org's people and drive per-department dashboard views.
// Backed by the org-scoped `departments` table (migration 0019); the keys below
// are the seeded defaults — orgs can add their own rows beyond this set.
// ============================================================================
export type Department =
  | "housing"
  | "communications"
  | "maintenance"
  | "creative"
  | "ux"
  | "it";

export const DEPARTMENT_LABELS: Record<Department, string> = {
  housing: "Housing",
  communications: "Communications",
  maintenance: "Maintenance",
  creative: "Creative",
  ux: "UX",
  it: "IT",
};

// The seeded default departments, in display order. Use to render pickers/seeds
// when an org hasn't customized its catalog yet.
export const DEFAULT_DEPARTMENTS: Department[] = [
  "housing", "communications", "maintenance", "creative", "ux", "it",
];

// ============================================================================
// ROLE TIERS — the 5-tier model the product owner described, layered ON TOP of
// the existing 8-role union. This is descriptive (UI + docs); the underlying
// F5Role enum and the can* predicates above are unchanged. `roles` lists which
// underlying F5Role(s) map into each tier so the UI can group/label them.
// Tier order: Super Admin (IT) → Admin → Manager → Reviewer → Submitter.
// ============================================================================
export type RoleTierKey = "super_admin" | "admin" | "manager" | "reviewer" | "submitter";

export interface RoleTier {
  key: RoleTierKey;
  label: string;
  tagline: string;     // one-line description of the tier
  can: string[];       // plain-language capability bullets
  roles: F5Role[];     // underlying F5Role(s) that belong to this tier
}

export const ROLE_TIERS: Record<RoleTierKey, RoleTier> = {
  super_admin: {
    key: "super_admin",
    label: "Super Admin (IT)",
    tagline: "Full platform & IT control.",
    can: [
      "Everything below, across every department",
      "Manage integrations, channels & data sources",
      "Configure modules and platform settings",
      "Onboard users & run reports",
    ],
    roles: ["super_admin"],
  },
  admin: {
    key: "admin",
    label: "Admin",
    tagline: "Stripped-down IT onboarding admin — onboard users + run reports only.",
    can: [
      "Onboard / invite users and assign departments + roles",
      "Run and export reports",
      "View dashboards",
    ],
    roles: ["org_admin"],
  },
  manager: {
    key: "manager",
    label: "Manager",
    tagline: "Runs a department's day-to-day work.",
    can: [
      "Broadcast & publish content",
      "Approve submissions from their department",
      "View their department dashboard",
    ],
    roles: ["manager", "property_manager", "comms_manager"],
  },
  reviewer: {
    key: "reviewer",
    label: "Reviewer",
    tagline: "Reviews and publishes, doesn't broadcast org-wide.",
    can: [
      "Review & publish content",
      "View their department dashboard",
    ],
    roles: ["publisher"],
  },
  submitter: {
    key: "submitter",
    label: "Submitter",
    tagline: "Submits requests/content for review.",
    can: [
      "Submit requests & draft content",
      "View their own submissions",
    ],
    roles: ["frontline", "viewer"],
  },
};

// Tier order for display.
export const ROLE_TIER_ORDER: RoleTierKey[] = ["super_admin", "admin", "manager", "reviewer", "submitter"];

// Reverse lookup: which tier does an underlying F5Role belong to?
export function tierForRole(r: F5Role): RoleTierKey {
  for (const key of ROLE_TIER_ORDER) {
    if (ROLE_TIERS[key].roles.includes(r)) return key;
  }
  return "submitter";
}

// IT onboarding admin scope: Super Admin + Admin can onboard users and run
// reports. These are the two predicates the product owner called out — the
// stripped Admin gets ONLY these (plus dashboard viewing), governed in the UI.
const CAN_ONBOARD: F5Role[] = ["super_admin", "org_admin"];
const CAN_REPORTS: F5Role[] = ["super_admin", "org_admin"];

export const canOnboardUsers = (r: F5Role) => CAN_ONBOARD.includes(r);
export const canRunReports = (r: F5Role) => CAN_REPORTS.includes(r);
