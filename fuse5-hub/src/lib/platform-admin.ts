// v2.0.x platform-admin reference data, ported faithfully from the prototype
// (fuse5-hub-v2.0.7.html). Powers the richer admin panels: Fuse5 Roles,
// Integrations, Template Library, Approval Workflow, Compliance Settings.
// Isomorphic (panels render from here); live data overlays where wired.

/* ---------- Fuse5 Roles (Layer 1 — internal staff) ---------- */
export interface F5RoleCard { key: string; name: string; icon: string; color: string; description: string; chips: string[] }
export const F5_ROLE_CARDS: F5RoleCard[] = [
  { key: "super_admin", name: "Super Admin", icon: "👑", color: "#009999", description: "Full platform control. Create/delete providers, billing, all environments.", chips: ["All Access", "All Providers", "All Environments"] },
  { key: "sales", name: "Sales", icon: "💼", color: "#f59e0b", description: "Prospect demos and pipeline. Demo + sales environments.", chips: ["Demo Site", "Sales Site", "Pipeline (Read)"] },
  { key: "dev", name: "Development", icon: "🛠", color: "#8b5cf6", description: "Build and test features. Test/dev environments, live read-only.", chips: ["Test Site", "Dev Tools", "Live (Read)"] },
  { key: "support_l1", name: "Support L1", icon: "🎧", color: "#3b82f6", description: "First-line support. Read access to providers and tickets.", chips: ["Providers (Read)", "Tickets (Read)"] },
  { key: "support_l2", name: "Support L2", icon: "🎧", color: "#3b82f6", description: "Content + user management. CMS edits, config read.", chips: ["CMS Content", "User Mgmt", "Config (Read)"] },
  { key: "support_l3", name: "Support L3", icon: "🎧", color: "#3b82f6", description: "Deep support. System config, Yardi API, hardware.", chips: ["System Config", "Yardi API", "Hardware"] },
];

export interface F5Staff { name: string; email: string; role: string; roleKey: string; envAccess: string[]; lastLogin: string; status: "Active" | "Suspended" }
// envAccess keys -> emoji: live 🟢 test 🟡 demo 🟣 sales 🔵
export const ENV_EMOJI: Record<string, string> = { live: "🟢", test: "🟡", demo: "🟣", sales: "🔵" };
export const F5_STAFF: F5Staff[] = [
  { name: "Clinton Reid", email: "clinton@fuse5.ca", role: "Super Admin", roleKey: "super_admin", envAccess: ["live", "test", "demo", "sales"], lastLogin: "2 min ago", status: "Active" },
  { name: "Kal Thiara", email: "kal@fuse5.ca", role: "Sales", roleKey: "sales", envAccess: ["demo", "sales"], lastLogin: "4 hours ago", status: "Active" },
  { name: "Oguzhan Yilmaz", email: "oguzhan@fuse5.ca", role: "Development", roleKey: "dev", envAccess: ["test", "demo"], lastLogin: "1 day ago", status: "Active" },
  { name: "Susanna Park", email: "susanna@fuse5.ca", role: "Development", roleKey: "dev", envAccess: ["test", "demo"], lastLogin: "3 hours ago", status: "Active" },
  { name: "Support Agent 1", email: "support1@fuse5.ca", role: "Support L1", roleKey: "support_l1", envAccess: ["live", "demo"], lastLogin: "Today", status: "Active" },
];

/* ---------- System Integrations (data sources) ---------- */
export interface SysIntegration { name: string; sub: string; status: string; tone: "ok" | "warn" }
export const SYSTEM_INTEGRATIONS: SysIntegration[] = [
  { name: "Yardi Voyager API", sub: "Tenant data, work orders, property sync", status: "Connected — 3 providers", tone: "ok" },
  { name: "SMS Gateway", sub: "Outbound tenant SMS communications", status: "Active — 24,847 sent this month", tone: "ok" },
  { name: "Email Service", sub: "Transactional and broadcast email delivery", status: "Active — 98.2% delivery rate", tone: "ok" },
  { name: "H200W Player Fleet", sub: "Digital signage hardware management", status: "19 players online", tone: "ok" },
  { name: "Bigin CRM", sub: "Sales pipeline and prospect tracking", status: "Connected", tone: "ok" },
];

/* ---------- Master Template Library ---------- */
export interface MasterTemplate { id: string; name: string; category: string; channels: string[]; version: string; lastUpdated: string; mandatory: boolean; description: string }
export const MASTER_TEMPLATES: MasterTemplate[] = [
  { id: "mt-001", name: "Emergency Evacuation", category: "Emergency", channels: ["signage", "sms", "email"], version: "2.1", lastUpdated: "Mar 2026", mandatory: true, description: "Fire/gas/flood evacuation notice with multi-channel blast" },
  { id: "mt-002", name: "Elevator Outage", category: "Emergency", channels: ["signage", "sms"], version: "1.4", lastUpdated: "Feb 2026", mandatory: true, description: "Elevator service interruption with estimated restoration time" },
  { id: "mt-003", name: "Water Shutoff", category: "Maintenance", channels: ["signage", "sms", "email"], version: "1.8", lastUpdated: "Mar 2026", mandatory: true, description: "Scheduled or emergency water service interruption" },
  { id: "mt-004", name: "Monthly Newsletter", category: "Community", channels: ["email", "signage"], version: "3.0", lastUpdated: "Apr 2026", mandatory: false, description: "Monthly community newsletter with events and updates" },
  { id: "mt-005", name: "Pest Control Notice", category: "Maintenance", channels: ["signage", "sms"], version: "1.2", lastUpdated: "Jan 2026", mandatory: true, description: "Pest treatment schedule with unit preparation instructions" },
  { id: "mt-006", name: "Fire Safety Inspection", category: "Compliance", channels: ["signage", "email"], version: "2.0", lastUpdated: "Mar 2026", mandatory: true, description: "Annual fire safety inspection with unit access requirements" },
  { id: "mt-007", name: "Community Event", category: "Community", channels: ["signage", "email"], version: "1.5", lastUpdated: "Feb 2026", mandatory: false, description: "Community event announcement with RSVP option" },
  { id: "mt-008", name: "Rent Reminder", category: "Account", channels: ["sms", "email"], version: "1.0", lastUpdated: "Jan 2026", mandatory: false, description: "Upcoming rent due date reminder" },
  { id: "mt-009", name: "Package Pickup", category: "Notification", channels: ["sms"], version: "1.1", lastUpdated: "Feb 2026", mandatory: false, description: "Package arrived notification with pickup location" },
  { id: "mt-010", name: "Visitor Parking", category: "Notification", channels: ["signage"], version: "1.0", lastUpdated: "Jan 2026", mandatory: false, description: "Visitor parking rules and registration" },
  { id: "mt-011", name: "HVAC Seasonal Switch", category: "Maintenance", channels: ["signage", "email"], version: "1.3", lastUpdated: "Mar 2026", mandatory: false, description: "Seasonal heating/cooling system changeover notice" },
  { id: "mt-012", name: "RentSafeTO Inspection", category: "Compliance", channels: ["signage", "email", "sms"], version: "1.0", lastUpdated: "Apr 2026", mandatory: true, description: "City of Toronto RentSafeTO building audit preparation" },
];
export const TEMPLATE_CATEGORIES = ["All", "Emergency", "Maintenance", "Compliance", "Community", "Account", "Notification"] as const;
export const TEMPLATE_STATS = { master: 12, mandatory: 6, clones: 36, pending: 3 };
export const CHANNEL_ICON: Record<string, string> = { signage: "🖥", sms: "💬", email: "📧" };

/* ---------- Approval Workflow ---------- */
export type ApprovalStatus = "draft" | "submitted" | "approved" | "scheduled" | "published" | "rejected";
export interface ApprovalItem { id: string; title: string; provider: string; status: ApprovalStatus; category: string; createdBy: string; createdAt: string; scheduledFor: string | null; recipients: number; rejectionNote?: string }
export const APPROVAL_QUEUE: ApprovalItem[] = [
  { id: "msg-001", title: "May Pest Control Schedule", provider: "WoodGreen", status: "submitted", category: "pest-control", createdBy: "Tom Bradley", createdAt: "Apr 11, 10:30 AM", scheduledFor: "Apr 15", recipients: 210 },
  { id: "msg-002", title: "Elevator Maintenance — Unit 3", provider: "WoodGreen", status: "approved", category: "elevator-outage", createdBy: "Maria Rodriguez", createdAt: "Apr 10, 2:00 PM", scheduledFor: "Apr 14", recipients: 185 },
  { id: "msg-003", title: "Spring Community BBQ", provider: "WoodGreen", status: "scheduled", category: "community-event", createdBy: "Maria Rodriguez", createdAt: "Apr 9, 11:00 AM", scheduledFor: "Apr 20", recipients: 847 },
  { id: "msg-004", title: "Water Heater Replacement — Building B", provider: "HNHC", status: "draft", category: "general-maintenance", createdBy: "Jim Morrison", createdAt: "Apr 11, 3:15 PM", scheduledFor: null, recipients: 180 },
  { id: "msg-005", title: "April Newsletter", provider: "HNHC", status: "published", category: "newsletter", createdBy: "Karen White", createdAt: "Apr 1, 9:00 AM", scheduledFor: null, recipients: 1240 },
  { id: "msg-006", title: "Fire Safety Inspection Notice", provider: "Kiwanis", status: "submitted", category: "fire-safety", createdBy: "Lisa Fong", createdAt: "Apr 10, 1:00 PM", scheduledFor: "Apr 22", recipients: 120 },
  { id: "msg-007", title: "RentSafeTO Audit Prep", provider: "WoodGreen", status: "rejected", category: "legal-regulatory", createdBy: "Dave Park", createdAt: "Apr 8, 4:30 PM", scheduledFor: null, recipients: 210, rejectionNote: "Needs updated inspection dates from City" },
  { id: "msg-008", title: "HVAC Switchover — Cooling Season", provider: "WoodGreen", status: "draft", category: "seasonal-notice", createdBy: "James Liu", createdAt: "Apr 11, 8:00 AM", scheduledFor: "May 1", recipients: 847 },
  { id: "msg-009", title: "Gas Line Inspection — Emergency Shutoff", provider: "HNHC", status: "submitted", category: "utility-shutoff", createdBy: "Jim Morrison", createdAt: "Apr 12, 8:15 AM", scheduledFor: "Apr 14", recipients: 320 },
  { id: "msg-010", title: "Threatening Behaviour Incident — Floor 4", provider: "WoodGreen", status: "submitted", category: "violence-security", createdBy: "Tom Bradley", createdAt: "Apr 12, 7:30 AM", scheduledFor: null, recipients: 210 },
  { id: "msg-011", title: "Lobby Painting Schedule — May", provider: "Kiwanis", status: "submitted", category: "general-maintenance", createdBy: "Lisa Fong", createdAt: "Apr 11, 4:00 PM", scheduledFor: "May 1", recipients: 120 },
  { id: "msg-012", title: "Mould Remediation Notice — Unit 812", provider: "WoodGreen", status: "submitted", category: "health-hazard", createdBy: "James Liu", createdAt: "Apr 12, 9:00 AM", scheduledFor: null, recipients: 185 },
];
export const APPROVAL_STAGES: { key: ApprovalStatus; label: string }[] = [
  { key: "draft", label: "Draft" }, { key: "submitted", label: "Submitted" }, { key: "approved", label: "Approved" }, { key: "scheduled", label: "Scheduled" }, { key: "published", label: "Published" },
];
export interface CategoryTier { key: string; tier: 1 | 2 | 3; label: string; icon: string; color: string; description: string }
export const CATEGORY_TIERS: CategoryTier[] = [
  { key: "fire-safety", tier: 1, label: "Fire Safety / Fire Watch", icon: "🔥", color: "#ef4444", description: "Ontario Fire Code regulated — verify all details before broadcast" },
  { key: "emergency-evac", tier: 1, label: "Emergency Evacuation", icon: "🚨", color: "#ef4444", description: "Life safety — must be accurate before any broadcast" },
  { key: "violence-security", tier: 1, label: "Violence / Threats / Security", icon: "🛡️", color: "#ef4444", description: "Tenant safety + privacy — may involve police" },
  { key: "legal-regulatory", tier: 1, label: "Legal / Regulatory Notice", icon: "⚖️", color: "#ef4444", description: "RentSafeTO, Hamilton SAB, AODA — wrong wording = fines" },
  { key: "eviction-enforce", tier: 1, label: "Eviction / Lease Enforcement", icon: "📜", color: "#ef4444", description: "Legal process — must be reviewed by management" },
  { key: "health-hazard", tier: 1, label: "Health Hazard", icon: "☣️", color: "#ef4444", description: "Mould, asbestos, bedbugs, Legionella — regulated, tenant rights" },
  { key: "utility-shutoff", tier: 1, label: "Utility Shutoff", icon: "⚡", color: "#ef4444", description: "Water/gas/electrical — verify dates, durations, safety instructions" },
  { key: "insurance-liability", tier: 1, label: "Insurance / Liability", icon: "🏛️", color: "#ef4444", description: "Flooding, structural — claims exposure" },
  { key: "tenant-privacy", tier: 1, label: "Tenant Privacy", icon: "🔒", color: "#ef4444", description: "References specific tenants or units — privacy review required" },
  { key: "elevator-outage", tier: 2, label: "Elevator Outage", icon: "🛗", color: "#f59e0b", description: "Accessibility impact — confirm duration and alternatives" },
  { key: "pest-control", tier: 2, label: "Pest Control", icon: "🐛", color: "#f59e0b", description: "Chemical exposure — verify prep instructions" },
  { key: "construction", tier: 2, label: "Construction / Major Renovation", icon: "🏗️", color: "#f59e0b", description: "Noise/access disruption — confirm scheduling" },
  { key: "parking-towing", tier: 2, label: "Parking / Towing", icon: "🅿️", color: "#f59e0b", description: "Enforcement action — needs clear dates" },
  { key: "staff-change", tier: 2, label: "Staff Change / Management Contact", icon: "👤", color: "#f59e0b", description: "Organizational — verify before publishing" },
  { key: "general-maintenance", tier: 3, label: "General Maintenance", icon: "🔧", color: "#10b981", description: "Routine HVAC, plumbing, repairs" },
  { key: "community-event", tier: 3, label: "Community Event", icon: "🎉", color: "#10b981", description: "BBQ, movie night, holiday gathering" },
  { key: "seasonal-notice", tier: 3, label: "Seasonal Notice", icon: "🍂", color: "#10b981", description: "Winter prep, cooling switchover, garbage schedule" },
  { key: "newsletter", tier: 3, label: "Newsletter / Update", icon: "📰", color: "#10b981", description: "Monthly comms, welcome messages" },
  { key: "amenity-booking", tier: 3, label: "Amenity Booking", icon: "🏊", color: "#10b981", description: "Room availability, gym hours" },
  { key: "weather-advisory", tier: 3, label: "Weather Advisory", icon: "🌧️", color: "#10b981", description: "Environment Canada reposts" },
];
export const TIER_META: Record<1 | 2 | 3, { text: string; color: string; bg: string; icon: string }> = {
  1: { text: "Individual Approval Required", color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: "🔴" },
  2: { text: "Review Recommended", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: "🟡" },
  3: { text: "Bulk Approve OK", color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: "🟢" },
};

/* ---------- Compliance Settings ---------- */
export interface ComplianceFramework {
  id: string; name: string; jurisdiction: string; description: string;
  thresholds: { green: number; yellow: number };
  evalCycle: { green: string; yellow: string; red: string };
  signageRequired: boolean; signageDeadline: string | null;
  categoryGroups: { group: "high-risk" | "moderate-risk" | "cosmetic"; count: number; weight: number }[];
}
export const COMPLIANCE_FRAMEWORKS: ComplianceFramework[] = [
  {
    id: "rentsafeto", name: "RentSafeTO", jurisdiction: "City of Toronto",
    description: "Apartment Building Standards — proactive building inspections",
    thresholds: { green: 85, yellow: 60 },
    evalCycle: { green: "3-year evaluation", yellow: "2-year evaluation", red: "Annual audit" },
    signageRequired: true, signageDeadline: "July 31, 2026",
    categoryGroups: [{ group: "high-risk", count: 6, weight: 50 }, { group: "moderate-risk", count: 7, weight: 37 }, { group: "cosmetic", count: 4, weight: 13 }],
  },
  {
    id: "hamilton-sab", name: "Hamilton SAB By-law", jurisdiction: "City of Hamilton",
    description: "Standards for Apartment Buildings — maintenance & occupancy",
    thresholds: { green: 85, yellow: 51 },
    evalCycle: { green: "3-year evaluation", yellow: "2-year evaluation", red: "Annual audit" },
    signageRequired: false, signageDeadline: null,
    categoryGroups: [{ group: "high-risk", count: 6, weight: 64 }, { group: "moderate-risk", count: 4, weight: 24 }, { group: "cosmetic", count: 3, weight: 14 }],
  },
];
export interface ProviderCompliance { provider: string; properties: number; tier: string; framework: string; enabled: boolean }
export const PROVIDER_COMPLIANCE: ProviderCompliance[] = [
  { provider: "WoodGreen", properties: 5, tier: "EMPRESA", framework: "rentsafeto", enabled: true },
  { provider: "HNHC", properties: 8, tier: "PLATO", framework: "hamilton-sab", enabled: true },
  { provider: "Kiwanis", properties: 3, tier: "ORO", framework: "hamilton-sab", enabled: true },
  { provider: "Neighbours", properties: 2, tier: "ORO", framework: "rentsafeto", enabled: false },
];

/* ---------- Billing (platform-operator MRR) ---------- */
export interface BillingRow { provider: string; tier: string; mrr: number; properties: number; players: number; renewal: string; status: string }
export const BILLING_MRR: BillingRow[] = [
  { provider: "WoodGreen Community Services", tier: "EMPRESA", mrr: 2850, properties: 5, players: 6, renewal: "Jan 2027", status: "Active" },
  { provider: "Haldimand Norfolk Housing", tier: "PLATO", mrr: 1800, properties: 8, players: 10, renewal: "Mar 2027", status: "Active" },
  { provider: "Kiwanis Non-Profit Homes", tier: "ORO", mrr: 750, properties: 3, players: 3, renewal: "May 2027", status: "Active" },
  { provider: "Neighbours Cooperative", tier: "ORO", mrr: 0, properties: 2, players: 2, renewal: "Pilot", status: "Pilot" },
];
export const BILLING_SUMMARY = { mrr: 5400, arr: 64800, units: 21 };
