// Fuse5 platform-operator (super-admin) reference + demo data, ported faithfully
// from the v8.1 prototype's tenantsDB / usersDB / playerFleet / role templates.
// Isomorphic (NOT server-only): panels + the permission matrix render from here.
// Live getters in queries.ts read real cross-org data for super_admins and fall
// back to this demo set when the local DB only has one org.

// Cookie holding the active impersonation target (read by the app layout banner).
export const IMPERSONATE_COOKIE = "f5_impersonate";

export type PermLevel = 0 | 1 | 2 | 3; // 0 None ✕ · 1 Read ○ · 2 R/W ◐ · 3 Full ●
export const PERM_GLYPH: Record<PermLevel, string> = { 0: "✕", 1: "○", 2: "◐", 3: "●" };
export const PERM_LABEL: Record<PermLevel, string> = { 0: "None", 1: "Read", 2: "Read/Write", 3: "Full" };

// 12 modules, in the prototype's column order.
export const PERM_MODULES = [
  { key: "comms", label: "Comms" },
  { key: "signage", label: "Signage" },
  { key: "tenants", label: "Tenants" },
  { key: "work_orders", label: "Work Orders" },
  { key: "analytics", label: "Analytics" },
  { key: "compliance", label: "Compliance" },
  { key: "templates", label: "Templates" },
  { key: "emergency", label: "Emergency" },
  { key: "admin", label: "Admin" },
  { key: "billing", label: "Billing" },
  { key: "data_upload", label: "Data Upload" },
  { key: "yardi_sync", label: "Yardi Sync" },
] as const;

export interface RoleRow {
  key: string;
  name: string;
  icon: string;
  color: string;
  perms: PermLevel[]; // length 12, aligned to PERM_MODULES
  canImpersonate?: boolean;
  envAccess?: string[];
  description?: string;
}

// Group A — Fuse5 global roles.
export const F5_GLOBAL_ROLES: RoleRow[] = [
  { key: "super_admin", name: "Super Admin", icon: "👑", color: "#009999", perms: [3,3,3,3,3,3,3,3,3,3,3,3], canImpersonate: true, envAccess: ["live","test","demo","sales"] },
  { key: "support_l1", name: "Support L1", icon: "🎧", color: "#3b82f6", perms: [1,1,1,1,1,1,1,0,0,0,0,1], envAccess: ["live","demo"] },
  { key: "support_l2", name: "Support L2", icon: "🎧", color: "#3b82f6", perms: [2,2,1,2,1,1,2,0,0,0,0,1], envAccess: ["live","test","demo"] },
  { key: "support_l3", name: "Support L3", icon: "🎧", color: "#3b82f6", perms: [3,3,2,3,2,2,3,3,2,0,2,3], canImpersonate: true, envAccess: ["live","test","demo"] },
  { key: "dev", name: "Development", icon: "🛠", color: "#8b5cf6", perms: [1,1,1,1,1,1,2,0,1,0,1,2], envAccess: ["test","demo"] },
  { key: "sales", name: "Sales", icon: "💼", color: "#f59e0b", perms: [1,1,1,0,1,0,1,0,0,1,0,0], envAccess: ["demo","sales"] },
];

// Group B — provider (tenant-level) role templates.
export const PROVIDER_ROLES: RoleRow[] = [
  { key: "provider_admin", name: "Provider Admin", icon: "🏢", color: "#009999", perms: [3,3,3,3,3,3,3,3,3,1,3,3], description: "Full control of their organization. Create teams, assign roles, manage properties, configure Yardi sync." },
  { key: "property_manager", name: "Property Manager", icon: "📋", color: "#3b82f6", perms: [3,3,3,3,1,1,2,2,0,0,0,1], description: "Manage assigned properties. Send communications, view tenant data, manage displays." },
  { key: "comms_manager", name: "Comms Manager", icon: "📢", color: "#a855f7", perms: [3,1,1,0,3,1,3,2,0,0,0,0], description: "Create/schedule broadcasts, manage templates, review delivery reports." },
  { key: "display_operator", name: "Display Operator", icon: "🖥", color: "#f59e0b", perms: [0,3,0,0,1,0,1,0,0,0,0,0], description: "Manage digital signage content and schedules. No SMS/Email or tenant PII." },
  { key: "superintendent", name: "Superintendent", icon: "🔧", color: "#10b981", perms: [1,0,1,3,0,0,0,1,0,0,0,0], description: "View work orders, acknowledge maintenance alerts. Read-only on comms." },
  { key: "compliance_officer", name: "Compliance Officer", icon: "📊", color: "#ef4444", perms: [1,1,1,1,1,3,1,0,0,0,0,0], description: "View compliance reports, audit trails, delivery receipts. Read-only across modules." },
  { key: "viewer", name: "View Only", icon: "👁", color: "#666", perms: [1,1,0,0,1,1,0,0,0,0,0,0], description: "Read-only dashboards and reports. Board members, oversight, external auditors." },
  { key: "org_admin", name: "Organization Admin", icon: "🏛", color: "#0ea5e9", perms: [1,1,3,1,2,2,1,1,3,1,3,3], description: "Org-wide administration: members, data import, settings, Yardi." },
  { key: "manager", name: "Manager", icon: "📁", color: "#8b5cf6", perms: [2,2,2,2,2,2,3,2,0,0,0,1], description: "Multi-property manager across the org." },
  { key: "publisher", name: "Publisher", icon: "🚀", color: "#d946ef", perms: [3,2,1,1,1,1,2,2,0,0,0,0], description: "Publish content and broadcasts." },
  { key: "frontline", name: "Frontline Staff", icon: "👤", color: "#22c55e", perms: [1,0,0,1,0,0,1,0,0,0,0,0], description: "Day-to-day staff: submit work orders, basic comms." },
];

// ---- demo provider / user / fleet data (fallback when DB has a single org) ----
export interface ProviderDemo {
  id: string; short: string; name: string; tier: "ORO" | "PLATO" | "EMPRESA";
  color: string; since: string; yardi: "synced" | "pending" | "none";
  status: "active" | "onboarding"; properties: number; users: number; tenants: number;
  players: number; compliance: number;
  roles: { name: string; count: number; custom?: boolean }[];
}
export const DEMO_PROVIDERS: ProviderDemo[] = [
  { id: "woodgreen", short: "WG", name: "WoodGreen Community Services", tier: "EMPRESA", color: "#009999", since: "Jan 2025", yardi: "synced", status: "active", properties: 5, users: 12, tenants: 847, players: 6, compliance: 98.2,
    roles: [{ name: "Provider Admin", count: 1 }, { name: "Property Manager", count: 3 }, { name: "Comms Manager", count: 2 }, { name: "Display Operator", count: 3 }, { name: "Superintendent", count: 2 }, { name: "View Only", count: 1 }] },
  { id: "hnhc", short: "HN", name: "Haldimand Norfolk Housing Corp", tier: "PLATO", color: "#a855f7", since: "Mar 2025", yardi: "synced", status: "active", properties: 8, users: 8, tenants: 1240, players: 10, compliance: 100,
    roles: [{ name: "Provider Admin", count: 1 }, { name: "Property Manager", count: 2 }, { name: "Comms Manager", count: 1 }, { name: "Compliance Officer", count: 1 }, { name: "Board Member (Custom)", count: 3, custom: true }] },
  { id: "kiwanis", short: "KW", name: "Kiwanis Non-Profit Homes", tier: "ORO", color: "#f59e0b", since: "May 2025", yardi: "pending", status: "active", properties: 3, users: 5, tenants: 320, players: 3, compliance: 92,
    roles: [{ name: "Provider Admin", count: 1 }, { name: "Operator", count: 4 }] },
  { id: "neighbours", short: "NB", name: "Neighbours Cooperative Homes", tier: "ORO", color: "#666", since: "Apr 2026", yardi: "none", status: "onboarding", properties: 2, users: 2, tenants: 145, players: 2, compliance: 0,
    roles: [{ name: "Provider Admin", count: 1 }, { name: "Operator", count: 1 }] },
];

export interface PlatformUserDemo { name: string; email: string; provider: string; providerColor: string; role: string; properties: string; lastLogin: string; status: "Active" | "Invited" | "Suspended" }
export const DEMO_PLATFORM_USERS: PlatformUserDemo[] = [
  { name: "Sarah Chen", email: "sarah.chen@woodgreen.org", provider: "WoodGreen", providerColor: "#009999", role: "Provider Admin", properties: "All (5)", lastLogin: "Today", status: "Active" },
  { name: "Tom Bradley", email: "t.bradley@woodgreen.org", provider: "WoodGreen", providerColor: "#009999", role: "Property Manager", properties: "100 Dundas, 200 Lees", lastLogin: "4 hours ago", status: "Active" },
  { name: "Maria Rodriguez", email: "m.rodriguez@woodgreen.org", provider: "WoodGreen", providerColor: "#009999", role: "Comms Manager", properties: "All (5)", lastLogin: "1 day ago", status: "Active" },
  { name: "Dave Park", email: "d.park@woodgreen.org", provider: "WoodGreen", providerColor: "#009999", role: "Display Operator", properties: "100 Dundas", lastLogin: "2 days ago", status: "Active" },
  { name: "Karen White", email: "k.white@hnhc.ca", provider: "HNHC", providerColor: "#a855f7", role: "Provider Admin", properties: "All (8)", lastLogin: "Today", status: "Active" },
  { name: "Jim Morrison", email: "j.morrison@hnhc.ca", provider: "HNHC", providerColor: "#a855f7", role: "Property Manager", properties: "55 Hess, 150 Bay", lastLogin: "3 hours ago", status: "Active" },
  { name: "Cathy Lee", email: "c.lee@hnhc.ca", provider: "HNHC", providerColor: "#a855f7", role: "Board Member (Custom)", properties: "All (Read Only)", lastLogin: "1 week ago", status: "Active" },
  { name: "Paul Nguyen", email: "p.nguyen@kiwanis.on.ca", provider: "Kiwanis", providerColor: "#f59e0b", role: "Provider Admin", properties: "All (3)", lastLogin: "Yesterday", status: "Active" },
  { name: "Lisa Fong", email: "l.fong@kiwanis.on.ca", provider: "Kiwanis", providerColor: "#f59e0b", role: "Operator", properties: "250 King", lastLogin: "2 days ago", status: "Active" },
];

export interface PlayerDemo { id: string; model: "H200W" | "H200"; provider: string; property: string; location: string; status: "online" | "offline" | "warning" | "provisioning"; uptime: number | null; firmware: string | null; display: string; orientation: "portrait" | "landscape"; lastSeen: string }
export const LATEST_FIRMWARE = "v4.2.1";
export const DEMO_FLEET: PlayerDemo[] = [
  { id: "PL-WG-001", model: "H200W", provider: "WoodGreen", property: "100 Dundas", location: "Main Lobby", status: "online", uptime: 99.7, firmware: "v4.2.1", display: "1920×1080", orientation: "landscape", lastSeen: "2 min ago" },
  { id: "PL-WG-002", model: "H200W", provider: "WoodGreen", property: "100 Dundas", location: "Elevator Bank", status: "online", uptime: 99.4, firmware: "v4.2.1", display: "1080×1920", orientation: "portrait", lastSeen: "1 min ago" },
  { id: "PL-WG-003", model: "H200", provider: "WoodGreen", property: "200 Lees Ave", location: "Main Lobby", status: "offline", uptime: 94.2, firmware: "v4.1.8", display: "1920×1080", orientation: "landscape", lastSeen: "3h 22m ago" },
  { id: "PL-WG-004", model: "H200W", provider: "WoodGreen", property: "200 Lees Ave", location: "Mail Room", status: "online", uptime: 98.9, firmware: "v4.2.1", display: "1080×1920", orientation: "portrait", lastSeen: "4 min ago" },
  { id: "PL-WG-005", model: "H200W", provider: "WoodGreen", property: "100 Dundas", location: "Community Room", status: "online", uptime: 99.1, firmware: "v4.2.0", display: "1920×1080", orientation: "landscape", lastSeen: "6 min ago" },
  { id: "PL-WG-006", model: "H200W", provider: "WoodGreen", property: "100 Dundas", location: "Gym Entrance", status: "online", uptime: 98.6, firmware: "v4.2.1", display: "1080×1920", orientation: "portrait", lastSeen: "2 min ago" },
  { id: "PL-HN-001", model: "H200W", provider: "HNHC", property: "55 Hess St", location: "Main Lobby", status: "online", uptime: 99.9, firmware: "v4.2.1", display: "1920×1080", orientation: "landscape", lastSeen: "1 min ago" },
  { id: "PL-HN-002", model: "H200W", provider: "HNHC", property: "55 Hess St", location: "Elevator A", status: "online", uptime: 99.5, firmware: "v4.2.1", display: "1080×1920", orientation: "portrait", lastSeen: "3 min ago" },
  { id: "PL-HN-008", model: "H200", provider: "HNHC", property: "8 Munsee Trail", location: "Main Lobby", status: "warning", uptime: 93.1, firmware: "v4.1.8", display: "1920×1080", orientation: "landscape", lastSeen: "22 min ago" },
  { id: "PL-HN-009", model: "H200W", provider: "HNHC", property: "150 Bay St", location: "Lobby", status: "online", uptime: 99.2, firmware: "v4.2.1", display: "1920×1080", orientation: "landscape", lastSeen: "5 min ago" },
  { id: "PL-HN-010", model: "H200W", provider: "HNHC", property: "150 Bay St", location: "Laundry", status: "online", uptime: 98.4, firmware: "v4.2.0", display: "1080×1920", orientation: "portrait", lastSeen: "8 min ago" },
  { id: "PL-KW-001", model: "H200W", provider: "Kiwanis", property: "250 King St", location: "Main Lobby", status: "online", uptime: 99.0, firmware: "v4.2.1", display: "1920×1080", orientation: "landscape", lastSeen: "3 min ago" },
  { id: "PL-KW-002", model: "H200W", provider: "Kiwanis", property: "250 King St", location: "Mail Area", status: "online", uptime: 97.8, firmware: "v4.2.0", display: "1080×1920", orientation: "portrait", lastSeen: "11 min ago" },
  { id: "PL-KW-003", model: "H200", provider: "Kiwanis", property: "300 Main St", location: "Lobby", status: "online", uptime: 96.5, firmware: "v4.1.8", display: "1920×1080", orientation: "landscape", lastSeen: "14 min ago" },
  { id: "PL-NB-001", model: "H200W", provider: "Neighbours", property: "120 Main St W", location: "Main Lobby", status: "provisioning", uptime: null, firmware: null, display: "1920×1080", orientation: "landscape", lastSeen: "—" },
  { id: "PL-NB-002", model: "H200W", provider: "Neighbours", property: "120 Main St W", location: "Community Hall", status: "provisioning", uptime: null, firmware: null, display: "1080×1920", orientation: "portrait", lastSeen: "—" },
];

export interface EnvCard { key: string; name: string; dot: string; badge: string; tone: string; desc: string; stats: string[]; buttons: string[] }
export const ENVIRONMENTS: EnvCard[] = [
  { key: "live", name: "Live Production", dot: "🟢", badge: "ACTIVE", tone: "ok", desc: "Real providers, real tenants, real communications. Every message sent here reaches actual people.", stats: ["4 Providers", "2,407 Tenants", "99.7% Uptime"], buttons: ["Switch to Live"] },
  { key: "test", name: "Test / Staging", dot: "🟡", badge: "STAGING", tone: "warn", desc: "Mirror of live data (anonymized). Test new features, CMS updates, and Yardi integrations before deploying.", stats: ["4 Providers", "500 Test Tenants", "v6.1-rc2 Build"], buttons: ["Switch to Test"] },
  { key: "demo", name: "Demo Site", dot: "🟣", badge: "DEMO", tone: "", desc: "Populated with realistic sample data. ONPHA showcases, conference demos, prospect presentations. Reset on demand.", stats: ["3 Sample Orgs", "250 Demo Tenants", "Full Features"], buttons: ["Switch to Demo", "Reset Data"] },
  { key: "sales", name: "Sales Site", dot: "🔵", badge: "SALES", tone: "", desc: "Prospect-specific branded previews. Each prospect gets a custom instance with their logo, properties, and sample data.", stats: ["2 Active Demos", "Durham (Prospect 1)", "Barrie (Prospect 2)"], buttons: ["Switch to Sales", "+ New Prospect"] },
];

// Tenant Portal defaults (per-org config persisted in tenant_portal_config.settings).
export interface PortalConfig {
  enabled: boolean;
  url: string;
  features: Record<string, boolean>; // self-service feature toggles
  channels: Record<string, boolean>;
  kiosk: Record<string, boolean>;    // kiosk-mode toggles
  theme: "dark" | "light";
  primaryColor: string;
  headerText: string;
  welcomeMessage: string;
  footerText: string;
  idleTimeout: number;
  quietStart: string;
  quietEnd: string;
}
// Kiosk-mode toggles (Section D).
export const PORTAL_KIOSK = [
  { key: "enable", label: "Enable Kiosk Mode" }, { key: "return_home", label: "Return-to-Home Screen" }, { key: "touch_sound", label: "Touch Sound Effects" },
  { key: "accessibility", label: "Accessibility Mode" }, { key: "language_selector", label: "Language Selector" }, { key: "pin_lock", label: "PIN Lock" },
] as const;
// Provider-level notification defaults (Section E). `forced` = locked on.
export const PORTAL_NOTIFY = [
  { label: "Maintenance Updates", sms: true, email: true, signage: false, forced: false },
  { label: "Emergency Alerts", sms: true, email: true, signage: true, forced: true },
  { label: "Community Events", sms: false, email: true, signage: false, forced: false },
  { label: "Compliance Notices", sms: true, email: true, signage: true, forced: true },
] as const;
// Integration status (Section G).
export const PORTAL_INTEGRATIONS = [
  { name: "Yardi Virtuoso", sub: "WO tracking & tenant data sync", status: "Connected · Sync 2m ago" },
  { name: "Agent 05 (Tenant Inquiry)", sub: "Self-service FAQ & escalation", status: "Active" },
  { name: "Agent 06 (Maintenance Request)", sub: "Submit & track work orders", status: "Active" },
  { name: "Translation Agent", sub: "Supported: EN, FR, ES, ZH", status: "Active" },
] as const;
export const PORTAL_FEATURES = [
  { key: "view_wo", label: "View Work Orders", sub: "Tenants can check status of maintenance requests", future: false },
  { key: "submit_wo", label: "Submit Maintenance Requests", sub: "Submit new work orders with photos and descriptions", future: false },
  { key: "comm_prefs", label: "Update Communication Preferences", sub: "Choose SMS, email, or both; set language preference", future: false },
  { key: "view_notices", label: "View Notices & Announcements", sub: "Access current and archived building notices", future: false },
  { key: "pay_rent", label: "Pay Rent Online", sub: "Future: Requires payment integration", future: true },
  { key: "book_amenities", label: "Book Amenities", sub: "Future: Reserve common rooms, laundry, etc.", future: true },
  { key: "esign", label: "E-Sign Documents", sub: "Future: Digital lease renewals and consent forms", future: true },
  { key: "events", label: "Community Events Calendar", sub: "Future: View and RSVP to building events", future: true },
] as const;
export const PORTAL_CHANNELS = [
  { key: "signage", label: "Digital Signage", sub: "Show notices on lobby screens" },
  { key: "sms", label: "SMS", sub: "Opt-in required, 160 char limit" },
  { key: "email", label: "Email", sub: "From: notices@fuse5.ca" },
  { key: "push", label: "Push Notifications", sub: "Mobile app notifications" },
  { key: "kiosk", label: "Touchscreen Kiosk", sub: "EMPRESA tier only" },
] as const;
export const DEFAULT_PORTAL: PortalConfig = {
  enabled: true,
  url: "portal.fuse5.ca/woodgreen",
  features: { view_wo: true, submit_wo: true, comm_prefs: true, view_notices: true, pay_rent: false, book_amenities: false, esign: false, events: false },
  channels: { signage: true, sms: true, email: true, push: false, kiosk: true },
  kiosk: { enable: true, return_home: true, touch_sound: true, accessibility: true, language_selector: true, pin_lock: true },
  theme: "dark",
  primaryColor: "#009999",
  headerText: "WoodGreen Tenant Portal",
  welcomeMessage: "Welcome to your resident portal. View notices, submit requests, and update your contact preferences.",
  footerText: "© 2026 WoodGreen Community Housing",
  idleTimeout: 300,
  quietStart: "22:00",
  quietEnd: "07:00",
};

// Users available to impersonate (demo). Real picker merges live org_members.
export interface ImpersonateTarget { id: string; name: string; email: string; role: string; roleLabel: string; provider: string; providerColor: string }
export const DEMO_IMPERSONATE: ImpersonateTarget[] = DEMO_PLATFORM_USERS.map((u, i) => ({
  id: `demo-${i}`, name: u.name, email: u.email, role: u.role.toLowerCase().replace(/[^a-z]+/g, "_"), roleLabel: u.role, provider: u.provider, providerColor: u.providerColor,
}));
