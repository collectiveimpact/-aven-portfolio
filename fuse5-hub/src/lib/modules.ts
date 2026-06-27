// Fuse5 module registry — the single source of truth for what sections exist,
// which group they live in, what each one DEPENDS ON (interconnections), and which
// roles may view them. Powers: the sidebar (show only enabled+permitted modules),
// the admin Modules panel (activate/deactivate per org), and route guards.
//
// Two independent axes gate a module:
//   1. Org activation  — is the module turned on for this account? (admin toggle)
//   2. Role permission — may this user's role view it? (the `roles` allowlist)
// A module shows only when BOTH pass. `core` modules can't be turned off.
import type { F5Role } from "@/lib/rbac";

export interface ModuleDef {
  key: string;          // stable id, also used in org config
  href: string;
  label: string;
  group: string;
  ico: string;
  core?: boolean;       // always on, cannot be deactivated (Overview, Admin, Settings)
  hidden?: boolean;     // kept activatable/routable but NOT shown in the sidebar (lives inside Admin)
  foundational?: boolean; // many modules depend on it — warn before deactivating
  requires: string[];   // module keys this one needs to be useful (interconnections)
  roles: F5Role[];      // roles allowed to view (permission-to-view)
  description: string;
  badge?: string;
}

const ALL: F5Role[] = ["super_admin", "org_admin", "manager", "property_manager", "comms_manager", "publisher", "frontline", "viewer"];
const STAFF: F5Role[] = ["super_admin", "org_admin", "manager", "property_manager", "comms_manager", "publisher", "frontline"];
const COMMS: F5Role[] = ["super_admin", "org_admin", "manager", "comms_manager"];
const ADMIN: F5Role[] = ["super_admin", "org_admin"];
// IT-only back-of-house config. The "stripped" org_admin (onboard users + run
// reports) does NOT see these — only the Super Admin (IT) tier does.
const SUPER: F5Role[] = ["super_admin"];

export const MODULES: ModuleDef[] = [
  // Operations — what staff land on. Overview/Dashboard first.
  { key: "overview", href: "/", label: "Overview", ico: "◎", group: "Operations", core: true, requires: [], roles: ALL, description: "Home dashboard — KPIs and recent activity." },
  { key: "dashboard", href: "/dashboard", label: "Dashboard", ico: "▦", group: "Operations", requires: [], roles: STAFF, description: "Operational dashboard across the portfolio." },
  { key: "analytics", href: "/analytics", label: "Analytics", ico: "📈", group: "Operations", requires: ["compose"], roles: COMMS, description: "Delivery funnels, engagement, benchmarks. Reads from messaging activity." },

  // Communicate — Segments sits with Journeys (audience-building for flows).
  { key: "compose", href: "/compose", label: "Compose", ico: "✎", group: "Communicate", requires: ["tenants", "channels"], roles: COMMS, description: "Send broadcasts. Needs Residents (audience) and Channels (delivery)." },
  { key: "journeys", href: "/journeys", label: "Journeys", ico: "⑂", group: "Communicate", requires: ["compose", "segments", "tenants"], roles: COMMS, description: "Automated multi-step flows. Builds on Compose, targets Segments." },
  { key: "segments", href: "/segments", label: "Segments", ico: "⊞", group: "Communicate", requires: ["tenants"], roles: COMMS, description: "Saved audience filters over Residents. Feed Journeys & Compose." },
  { key: "inbox", href: "/inbox", label: "Inbox", ico: "✉", group: "Communicate", requires: ["channels"], roles: STAFF, description: "Two-way resident conversations across channels." },
  { key: "templates", href: "/templates", label: "Templates", ico: "❏", group: "Communicate", requires: [], roles: COMMS, description: "Reusable message templates used by Compose & Journeys." },
  { key: "calendar", href: "/calendar", label: "Calendar", ico: "🗓", group: "Communicate", requires: [], roles: STAFF, description: "Scheduled communications calendar." },
  { key: "emergency", href: "/emergency", label: "Emergency", ico: "🚨", group: "Communicate", requires: ["compose", "channels", "tenants"], roles: COMMS, description: "One-click emergency broadcast. Needs Compose + Channels + Residents." },

  // Engagement — resident-facing programs (surveys today; more later).
  { key: "surveys", href: "/surveys", label: "Surveys", ico: "❔", group: "Engagement", requires: ["tenants"], roles: COMMS, description: "Build, field, and report resident surveys. Fields via the public link / Compose." },

  // Audience — the directory everything targets.
  { key: "tenants", href: "/tenants", label: "Residents", ico: "👥", group: "Audience", foundational: true, requires: [], roles: STAFF, description: "The resident directory — the audience everything else targets." },
  { key: "contacts", href: "/contacts", label: "Contacts", ico: "📇", group: "Audience", requires: [], roles: STAFF, description: "Non-resident contacts (board, funders, vendors)." },

  // Property Ops — Displays moved up (flagship signage surface).
  { key: "displays", href: "/displays", label: "Displays", ico: "🖥", group: "Property Ops", requires: ["content"], roles: STAFF, description: "Digital-signage network + wall-board players. Shows Content." },
  { key: "content", href: "/content", label: "Content on Demand", ico: "▶", group: "Property Ops", requires: [], roles: STAFF, description: "The signage content library (images, videos, notices)." },
  { key: "properties", href: "/properties", label: "Properties", ico: "🏢", group: "Property Ops", foundational: true, requires: [], roles: STAFF, description: "The building/property portfolio. Underpins Work Orders & Compliance." },
  { key: "workorders", href: "/workorders", label: "Work Orders", ico: "🔧", group: "Property Ops", requires: ["properties"], roles: STAFF, description: "Maintenance tickets. Scoped to Properties.", badge: "7" },
  { key: "frontline", href: "/frontline", label: "Submit Request", ico: "➕", group: "Property Ops", requires: ["workorders"], roles: ALL, description: "Frontline staff submit a maintenance request → Work Orders." },
  { key: "compliance", href: "/compliance", label: "Compliance", ico: "🛡", group: "Property Ops", requires: ["properties"], roles: STAFF, description: "RentSafeTO/standards scores per property. Optional — off until an org opts in." },

  // Admin — back-of-house config. Channels is IT/config, not a user-facing surface.
  { key: "channels", href: "/channels", label: "Channels", ico: "📡", group: "Admin", hidden: true, foundational: true, requires: [], roles: SUPER, description: "Email/SMS/WhatsApp/voice/display delivery config (IT/back-end). Lives inside Admin → Delivery & Channels." },
  { key: "integrations", href: "/integrations", label: "Integrations", ico: "🔌", group: "Admin", hidden: true, requires: [], roles: SUPER, description: "Yardi/HMIS and other system connectors. Lives inside Admin → Delivery & Channels." },
  { key: "ai-agents", href: "/ai-agents", label: "AI Agents", ico: "✦", group: "Admin", requires: [], roles: SUPER, description: "Configure the AI agents (compose assist, compliance sync…)." },
  { key: "admin", href: "/admin", label: "Admin", ico: "👤", group: "Admin", core: true, requires: [], roles: ADMIN, description: "Account administration, users, modules, portal." },
  { key: "settings", href: "/settings", label: "Settings", ico: "⚙", group: "Admin", core: true, requires: [], roles: ALL, description: "Personal & account settings." },
];

export const MODULE_BY_KEY: Record<string, ModuleDef> = Object.fromEntries(MODULES.map((m) => [m.key, m]));
export const MODULE_GROUPS: string[] = [...new Set(MODULES.map((m) => m.group))];

// Default activation: a LIGHT starter set so new accounts aren't overwhelming —
// the essentials to communicate + manage residents. Admins switch on the rest as
// they need it. Core modules are always on regardless.
export const DEFAULT_ENABLED: string[] = [
  "overview", "dashboard", "compose", "templates", "channels", "tenants", "content", "displays", "admin", "settings",
];

// Reverse dependency: which enabled modules would break if `key` were turned off.
export function dependentsOf(key: string, enabled: Set<string>): string[] {
  return MODULES.filter((m) => enabled.has(m.key) && m.requires.includes(key)).map((m) => m.key);
}

// Given a chosen enabled set, expand to include hard requirements + core modules,
// so you can never enable a module without what it needs.
export function resolveEnabled(chosen: Iterable<string>): Set<string> {
  const set = new Set<string>(chosen);
  MODULES.forEach((m) => { if (m.core) set.add(m.key); });
  let changed = true;
  while (changed) {
    changed = false;
    for (const k of [...set]) {
      for (const req of MODULE_BY_KEY[k]?.requires ?? []) {
        if (!set.has(req)) { set.add(req); changed = true; }
      }
    }
  }
  return set;
}

// The final visible nav for a user: enabled (org) ∩ permitted (role), grouped.
export function visibleModules(enabled: Set<string>, role: F5Role | null): { group: string; items: ModuleDef[] }[] {
  const items = MODULES.filter((m) => !m.hidden && (m.core || enabled.has(m.key)) && (!role || m.roles.includes(role)));
  return MODULE_GROUPS.map((group) => ({ group, items: items.filter((m) => m.group === group) })).filter((g) => g.items.length > 0);
}
