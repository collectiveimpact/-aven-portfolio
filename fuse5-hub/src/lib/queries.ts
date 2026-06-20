import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { F5Role } from "@/lib/rbac";
import { resolveFields, type ResolvedField, type FieldOverride } from "@/lib/wo-fields";
import { DEMO_PROVIDERS, DEMO_PLATFORM_USERS, DEMO_FLEET, DEFAULT_PORTAL, type ProviderDemo, type PlatformUserDemo, type PlayerDemo, type PortalConfig } from "@/lib/platform";

/** Per-client, per-notice-type field config (registry merged with the org's overrides). */
export async function getWoFieldConfig(noticeType = "general"): Promise<ResolvedField[]> {
  const s = await db();
  if (!s) return resolveFields({});
  try {
    const { data } = await s.from("wo_field_settings").select("field_key,enabled,required").eq("notice_type", noticeType);
    const ov: Record<string, FieldOverride> = {};
    for (const r of data ?? []) ov[r.field_key] = { enabled: r.enabled, required: r.required };
    return resolveFields(ov);
  } catch { return resolveFields({}); }
}

// Shared server query layer. Each getter reads LIVE from Supabase (RLS-scoped to
// the signed-in user's org) when the backend is configured, else returns a demo
// fallback so pages render in demo mode. Section pages call these instead of
// embedding their own data. Row types are flat + page-ready.

export interface ResidentRow { id: string; unit: string; name: string; propertyName: string; propertyId: string | null; email: string; phone: string; language: string; preferredChannel: string; status: "active" | "moved_out" }
export interface WorkOrderRow { id: string; title: string; propertyName: string; unit: string; category: string; priority: "low"|"medium"|"high"|"urgent"; status: "open"|"in_progress"|"resolved"; channels: string[]; noticeStatus: "none"|"draft"|"pending_review"|"approved"|"published" }
export interface PropertyOption { id: string; name: string }

export async function getProperties(): Promise<PropertyOption[]> {
  const s = await db();
  if (!s) return [{ id: "p1", name: "WoodGreen — Danforth" }, { id: "p2", name: "WoodGreen — East York" }, { id: "p3", name: "WoodGreen — Riverdale" }];
  try {
    const { data } = await s.from("properties").select("id,name").order("name");
    return data?.length ? data.map((p) => ({ id: p.id, name: p.name })) : [];
  } catch { return []; }
}
export interface TemplateRow { id: string; name: string; category: string; channels: string[]; mandatory: boolean; version: string; body: string }
export interface DisplayRow { id: string; name: string; location: string; propertyName: string; propertyId: string | null; status: "online"|"offline"|"warning" }
export interface SurveyRow { id: string; title: string; status: "draft"|"live"|"closed"; sent: number; responses: number }
export interface ComplianceRow { id: string; propertyName: string; propertyId: string | null; kind: string; due: string; status: "compliant"|"due_soon"|"overdue" }
export interface ContactRow { id: string; name: string; role: string; email: string; phone: string; property: string }
export interface SegmentRow { id: string; name: string; rule: string; size: number }
export interface CalendarRow { id: string; title: string; day: string; channel: string; status: string }

type PropRef = { name: string } | { name: string }[] | null;
const propName = (p: PropRef): string => (Array.isArray(p) ? p[0]?.name : p?.name) ?? "—";

async function db() { return createClient(); }

export async function getResidents(): Promise<ResidentRow[]> {
  const s = await db();
  if (!s) return DEMO.residents;
  try {
    const { data } = await s.from("residents").select("id,unit,name,language,status,property_id,email,phone,preferred_channel,properties(name)").order("unit");
    if (!data?.length) return DEMO.residents;
    return data.map((r) => ({ id: r.id, unit: r.unit ?? "—", name: r.name, propertyName: propName(r.properties as PropRef), propertyId: r.property_id ?? null, email: r.email ?? "", phone: r.phone ?? "", language: r.language ?? "—", preferredChannel: r.preferred_channel ?? "email", status: r.status as ResidentRow["status"] }));
  } catch { return DEMO.residents; }
}

export async function getWorkOrders(): Promise<WorkOrderRow[]> {
  const s = await db();
  if (!s) return DEMO.workOrders;
  try {
    const { data } = await s.from("work_orders").select("id,title,unit,category,priority,status,channels,notice_status,properties(name)").order("created_at", { ascending: false });
    if (!data?.length) return DEMO.workOrders;
    return data.map((w) => ({ id: w.id, title: w.title, propertyName: propName(w.properties as PropRef), unit: w.unit ?? "—", category: w.category ?? "—", priority: w.priority as WorkOrderRow["priority"], status: w.status as WorkOrderRow["status"], channels: w.channels ?? [], noticeStatus: (w.notice_status ?? "none") as WorkOrderRow["noticeStatus"] }));
  } catch { return DEMO.workOrders; }
}

export async function getTemplates(): Promise<TemplateRow[]> {
  const s = await db();
  if (!s) return DEMO.templates;
  try {
    const { data } = await s.from("templates").select("id,name,category,channels,mandatory,version,body").order("name");
    if (!data?.length) return DEMO.templates;
    return data.map((t) => ({ id: t.id, name: t.name, category: t.category ?? "—", channels: t.channels ?? [], mandatory: !!t.mandatory, version: t.version ?? "1.0", body: t.body ?? "" }));
  } catch { return DEMO.templates; }
}

export async function getDisplays(): Promise<DisplayRow[]> {
  const s = await db();
  if (!s) return DEMO.displays;
  try {
    const { data } = await s.from("displays").select("id,name,location,status,property_id,properties(name)").order("name");
    if (!data?.length) return DEMO.displays;
    return data.map((d) => ({ id: d.id, name: d.name, location: d.location ?? "—", propertyName: propName(d.properties as PropRef), propertyId: d.property_id ?? null, status: d.status as DisplayRow["status"] }));
  } catch { return DEMO.displays; }
}

export async function getSurveys(): Promise<SurveyRow[]> {
  const s = await db();
  if (!s) return DEMO.surveys;
  try {
    const { data } = await s.from("surveys").select("id,title,status,sent,responses");
    if (!data?.length) return DEMO.surveys;
    return data.map((x) => ({ id: x.id, title: x.title, status: x.status as SurveyRow["status"], sent: x.sent ?? 0, responses: x.responses ?? 0 }));
  } catch { return DEMO.surveys; }
}

export async function getCompliance(): Promise<ComplianceRow[]> {
  const s = await db();
  if (!s) return DEMO.compliance;
  try {
    const { data } = await s.from("compliance_items").select("id,kind,due,status,property_id,properties(name)").order("due");
    if (!data?.length) return DEMO.compliance;
    return data.map((c) => ({ id: c.id, propertyName: propName(c.properties as PropRef), propertyId: c.property_id ?? null, kind: c.kind, due: c.due ?? "—", status: c.status as ComplianceRow["status"] }));
  } catch { return DEMO.compliance; }
}

export async function getContacts(): Promise<ContactRow[]> {
  const s = await db();
  if (!s) return DEMO.contacts;
  try {
    const { data } = await s.from("contacts").select("id,name,role,email,phone,property");
    if (!data?.length) return DEMO.contacts;
    return data.map((c) => ({ id: c.id, name: c.name, role: c.role ?? "—", email: c.email ?? "—", phone: c.phone ?? "—", property: c.property ?? "—" }));
  } catch { return DEMO.contacts; }
}

export interface ContentRow { id: string; title: string; type: "image"|"video"|"notice"|"playlist"; durationS: number | null; updatedAt: string }
export async function getContent(): Promise<ContentRow[]> {
  const s = await db();
  if (!s) return DEMO.content;
  try {
    const { data } = await s.from("content_items").select("id,title,type,duration_s,updated_at").order("updated_at", { ascending: false });
    if (!data?.length) return DEMO.content;
    return data.map((c) => ({ id: c.id, title: c.title, type: c.type as ContentRow["type"], durationS: c.duration_s ?? null, updatedAt: new Date(c.updated_at).toISOString().slice(0, 10) }));
  } catch { return DEMO.content; }
}

// One config row per delivery channel. We always surface the full set of five
// channels (merging any stored rows over the defaults) so the page can toggle a
// channel that has no row yet — the first save inserts it.
export const CHANNEL_KEYS = ["email", "sms", "whatsapp", "voice", "display"] as const;
export type ChannelKey = (typeof CHANNEL_KEYS)[number];
export interface ChannelConfigRow { channel: ChannelKey; enabled: boolean; settings: Record<string, string> }
export async function getChannelsConfig(): Promise<ChannelConfigRow[]> {
  const defaults: ChannelConfigRow[] = CHANNEL_KEYS.map((channel) => ({ channel, enabled: true, settings: {} }));
  const s = await db();
  if (!s) return defaults;
  try {
    const { data } = await s.from("channels_config").select("channel,enabled,settings");
    if (!data?.length) return defaults;
    const byKey = new Map(data.map((r) => [r.channel as ChannelKey, r]));
    return defaults.map((d) => {
      const row = byKey.get(d.channel);
      if (!row) return d;
      const settings = (row.settings && typeof row.settings === "object" ? row.settings : {}) as Record<string, string>;
      return { channel: d.channel, enabled: row.enabled ?? true, settings };
    });
  } catch { return defaults; }
}

const LANG_LABELS: Record<string, string> = { en: "English", fr: "French", es: "Spanish", zh: "Mandarin", pt: "Portuguese", ar: "Arabic" };
// Render a stored jsonb rule as a human sentence for the segment cards.
export function describeRule(rule: unknown): string {
  if (typeof rule === "string") return rule;
  if (!rule || typeof rule !== "object") return "Custom rule";
  const r = rule as Record<string, unknown>;
  if (r.all) return "All residents";
  if (r.language) return `Language is ${LANG_LABELS[String(r.language)] ?? String(r.language)}`;
  if (r.preferred_channel) return `Preferred channel is ${String(r.preferred_channel).toUpperCase()}`;
  if (r.status) return `Status is ${String(r.status) === "moved_out" ? "Moved Out" : "Active"}`;
  if (r.property_id) return "Residents of a specific property";
  if (r.arrears_days) return `Arrears over ${String(r.arrears_days)} days`;
  return "Custom rule";
}

export async function getSegments(): Promise<SegmentRow[]> {
  const s = await db();
  if (!s) return DEMO.segments;
  try {
    const { data } = await s.from("segments").select("id,name,rule,size");
    if (!data?.length) return DEMO.segments;
    return data.map((g) => ({ id: g.id, name: g.name, rule: describeRule(g.rule), size: g.size ?? 0 }));
  } catch { return DEMO.segments; }
}

export async function getCalendar(): Promise<CalendarRow[]> {
  const s = await db();
  if (!s) return DEMO.calendar;
  try {
    const { data } = await s.from("calendar_events").select("id,title,day,channel,status").order("day");
    if (!data?.length) return DEMO.calendar;
    return data.map((e) => ({ id: e.id, title: e.title, day: e.day, channel: e.channel ?? "multi", status: e.status ?? "scheduled" }));
  } catch { return DEMO.calendar; }
}

// ---- demo fallbacks (used only when backend is off) ----
const DEMO = {
  content: [
    { id: "c-01", title: "Welcome Loop — Lobby", type: "playlist", durationS: 120, updatedAt: "2026-05-30" },
    { id: "c-02", title: "Fire Safety Notice", type: "notice", durationS: 15, updatedAt: "2026-05-29" },
    { id: "c-03", title: "Community BBQ — June 14", type: "image", durationS: 10, updatedAt: "2026-05-28" },
    { id: "c-04", title: "Amenities Tour", type: "video", durationS: 90, updatedAt: "2026-05-21" },
  ] as ContentRow[],
  residents: [
    { id: "r1", unit: "204", name: "Amara Okafor", propertyName: "WoodGreen — Danforth", propertyId: null, email: "a.okafor@example.org", phone: "416-555-1001", language: "English", preferredChannel: "email", status: "active" },
    { id: "r2", unit: "207", name: "Jean-Luc Tremblay", propertyName: "WoodGreen — Danforth", propertyId: null, email: "jl.tremblay@example.org", phone: "416-555-1002", language: "French", preferredChannel: "sms", status: "active" },
    { id: "r3", unit: "112", name: "Mei Lin Zhang", propertyName: "WoodGreen — East York", propertyId: null, email: "m.zhang@example.org", phone: "416-555-1003", language: "Mandarin", preferredChannel: "email", status: "active" },
    { id: "r4", unit: "120", name: "David Thompson", propertyName: "WoodGreen — East York", propertyId: null, email: "d.thompson@example.org", phone: "416-555-1004", language: "English", preferredChannel: "email", status: "moved_out" },
  ] as ResidentRow[],
  workOrders: [
    { id: "w1", title: "Leaking faucet — unit 204", propertyName: "WoodGreen — Danforth", unit: "204", category: "Plumbing", priority: "high", status: "open", channels: ["email","sms"], noticeStatus: "published" },
    { id: "w2", title: "Hallway light out", propertyName: "WoodGreen — East York", unit: "—", category: "Electrical", priority: "medium", status: "in_progress", channels: [], noticeStatus: "none" },
  ] as WorkOrderRow[],
  templates: [
    { id: "t1", name: "Water Shutoff", category: "Maintenance", channels: ["display","sms","email"], mandatory: true, version: "1.8", body: "Water will be shut off {{date}} {{time}}." },
    { id: "t2", name: "Monthly Newsletter", category: "Community", channels: ["email"], mandatory: false, version: "3.0", body: "This month at {{property}}…" },
  ] as TemplateRow[],
  displays: [
    { id: "d1", name: "Lobby Display 1", location: "Main Lobby", propertyName: "WoodGreen — Danforth", propertyId: null, status: "online" },
    { id: "d2", name: "Lobby Display 2", location: "Elevator A", propertyName: "WoodGreen — East York", propertyId: null, status: "offline" },
  ] as DisplayRow[],
  surveys: [
    { id: "s1", title: "Annual Resident Satisfaction", status: "live", sent: 1284, responses: 842 },
  ] as SurveyRow[],
  compliance: [
    { id: "c1", propertyName: "WoodGreen — Danforth", propertyId: null, kind: "RentSafeTO Audit", due: "2026-06-20", status: "due_soon" },
    { id: "c2", propertyName: "WoodGreen — East York", propertyId: null, kind: "Fire Inspection", due: "2026-05-10", status: "overdue" },
  ] as ComplianceRow[],
  contacts: [
    { id: "k1", name: "Tom Bradley", role: "Property Manager", email: "t.bradley@woodgreen.org", phone: "416-555-2001", property: "Danforth" },
  ] as ContactRow[],
  segments: [
    { id: "g1", name: "All Residents", rule: "all", size: 316 },
    { id: "g2", name: "French speakers", rule: "language=fr", size: 58 },
  ] as SegmentRow[],
  calendar: [
    { id: "e1", title: "June Newsletter", day: "2026-06-05", channel: "email", status: "scheduled" },
  ] as CalendarRow[],
};

// ===========================================================================
// Admin / analytics / dashboard aggregates
// ===========================================================================

export interface MemberRow { id: string; userId: string; fullName: string; email: string; role: F5Role; status: "active" | "invited" | "suspended" }
export interface AuditRow { id: string; actor: string; action: string; detail: string; when: string }
export interface SubscriptionInfo { plan: string; seats: number; usedSeats: number; status: string; cycleSpend: string }
export interface DashboardStats {
  messagesSent: number; activeBroadcasts: number; openWorkOrders: number; residents: number; displaysOnline: number;
  feed: { actor: string; action: string; detail: string; when: string; tone: "ok" | "warn" | "alert" }[];
  source: "live" | "demo";
}
export interface MessageStats {
  sent: number; recipients: number; delivered: number; deliveryRatePct: number;
  byChannel: { channel: string; sent: number; delivered: number }[]; source: "live" | "demo";
}

function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export async function getMembers(): Promise<MemberRow[]> {
  const s = await db();
  if (!s) return DEMO2.members;
  try {
    const { data: members } = await s.from("org_members").select("id,user_id,role");
    if (!members?.length) return DEMO2.members;
    const ids = members.map((m) => m.user_id);
    const { data: profiles } = await s.from("profiles").select("id,full_name,email").in("id", ids);
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
    return members.map((m) => {
      const p = pmap.get(m.user_id);
      return { id: m.id, userId: m.user_id, fullName: p?.full_name || "—", email: p?.email || "—", role: m.role as F5Role, status: "active" as const };
    });
  } catch { return DEMO2.members; }
}

export async function getAuditLog(): Promise<AuditRow[]> {
  const s = await db();
  if (!s) return DEMO2.audit;
  try {
    const { data } = await s.from("audit_log").select("id,actor_id,action,detail,created_at").order("created_at", { ascending: false }).limit(20);
    if (!data?.length) return DEMO2.audit;
    const ids = [...new Set(data.map((a) => a.actor_id).filter(Boolean))] as string[];
    const { data: profiles } = ids.length ? await s.from("profiles").select("id,full_name").in("id", ids) : { data: [] };
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    return data.map((a) => ({ id: String(a.id), actor: (a.actor_id && pmap.get(a.actor_id)) || "System", action: a.action, detail: a.detail ?? "", when: relTime(a.created_at) }));
  } catch { return DEMO2.audit; }
}

export async function getSubscription(): Promise<SubscriptionInfo> {
  const s = await db();
  if (!s) return DEMO2.subscription;
  try {
    const { data } = await s.from("subscriptions").select("plan,seats,status").maybeSingle();
    if (!data) return DEMO2.subscription;
    return { plan: data.plan, seats: data.seats, usedSeats: DEMO2.subscription.usedSeats, status: data.status, cycleSpend: DEMO2.subscription.cycleSpend };
  } catch { return DEMO2.subscription; }
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const s = await db();
  if (!s) return DEMO2.dashboard;
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [{ count: msgSent }, { count: active }, { count: openWO }, { count: residents }, { count: displaysOnline }] = await Promise.all([
      s.from("messages").select("id", { count: "exact", head: true }).eq("status", "sent"),
      s.from("messages").select("id", { count: "exact", head: true }).in("status", ["scheduled", "sending"]),
      s.from("work_orders").select("id", { count: "exact", head: true }).neq("status", "resolved"),
      s.from("residents").select("id", { count: "exact", head: true }).eq("status", "active"),
      s.from("displays").select("id", { count: "exact", head: true }).eq("status", "online"),
    ]);
    const { data: audit } = await s.from("audit_log").select("actor_id,action,detail,created_at").order("created_at", { ascending: false }).limit(5);
    const ids = [...new Set((audit ?? []).map((a) => a.actor_id).filter(Boolean))] as string[];
    const { data: profiles } = ids.length ? await s.from("profiles").select("id,full_name").in("id", ids) : { data: [] };
    const pmap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));
    const feed = (audit ?? []).map((a) => ({
      actor: (a.actor_id && pmap.get(a.actor_id)) || "System", action: a.action, detail: a.detail ?? "",
      when: relTime(a.created_at), tone: a.action.includes("Emergency") ? ("alert" as const) : a.action.includes("Broadcast") ? ("ok" as const) : ("warn" as const),
    }));
    void today;
    return { messagesSent: msgSent ?? 0, activeBroadcasts: active ?? 0, openWorkOrders: openWO ?? 0, residents: residents ?? 0, displaysOnline: displaysOnline ?? 0, feed: feed.length ? feed : DEMO2.dashboard.feed, source: "live" };
  } catch { return DEMO2.dashboard; }
}

export async function getMessageStats(): Promise<MessageStats> {
  const s = await db();
  if (!s) return DEMO2.messageStats;
  try {
    const { count: sent } = await s.from("messages").select("id", { count: "exact", head: true }).eq("status", "sent");
    const { data: recips } = await s.from("message_recipients").select("channel,status");
    const total = recips?.length ?? 0;
    const delivered = (recips ?? []).filter((r) => r.status === "delivered" || r.status === "opened").length;
    const byChannelMap = new Map<string, { sent: number; delivered: number }>();
    for (const r of recips ?? []) {
      const e = byChannelMap.get(r.channel) ?? { sent: 0, delivered: 0 };
      e.sent += 1; if (r.status === "delivered" || r.status === "opened") e.delivered += 1;
      byChannelMap.set(r.channel, e);
    }
    const byChannel = [...byChannelMap.entries()].map(([channel, v]) => ({ channel, ...v }));
    if (!total && !sent) return DEMO2.messageStats;
    return { sent: sent ?? 0, recipients: total, delivered, deliveryRatePct: total ? Math.round((delivered / total) * 1000) / 10 : 0, byChannel: byChannel.length ? byChannel : DEMO2.messageStats.byChannel, source: "live" };
  } catch { return DEMO2.messageStats; }
}

export interface InboundRow { id: string; sender: string; unit: string; channel: string; snippet: string; when: string; status: "unread" | "awaiting" | "resolved" }

export async function getInbox(): Promise<InboundRow[]> {
  const s = await db();
  if (!s) return DEMO2.inbox;
  try {
    const { data } = await s.from("inbound_messages").select("id,channel,body,status,received_at,residents(name,unit)").order("received_at", { ascending: false });
    if (!data?.length) return DEMO2.inbox;
    return data.map((m) => {
      const r = m.residents as { name: string; unit: string } | { name: string; unit: string }[] | null;
      const res = Array.isArray(r) ? r[0] : r;
      return {
        id: m.id,
        sender: res?.name ?? "Unknown resident",
        unit: res?.unit ?? "—",
        channel: m.channel,
        snippet: m.body,
        when: relTime(m.received_at),
        status: (m.status === "open" ? "unread" : m.status) as InboundRow["status"],
      };
    });
  } catch { return DEMO2.inbox; }
}

export interface EmergencyLogRow { id: string; date: string; type: string; reach: string; status: "sent" | "resolved" | "active" }

export async function getEmergencyLog(): Promise<EmergencyLogRow[]> {
  const s = await db();
  if (!s) return DEMO2.emergencyLog;
  try {
    const { data } = await s.from("messages").select("id,subject,audience_count,status,created_at").eq("priority", "emergency").order("created_at", { ascending: false }).limit(20);
    if (!data?.length) return DEMO2.emergencyLog;
    return data.map((m) => ({
      id: m.id,
      date: new Date(m.created_at).toLocaleString("en-CA", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
      type: m.subject,
      reach: `${(m.audience_count ?? 0).toLocaleString()} residents`,
      status: (m.status === "sent" ? "sent" : "active") as EmergencyLogRow["status"],
    }));
  } catch { return DEMO2.emergencyLog; }
}

export interface ComposeTemplate { id: string; name: string; channels: string[]; body: string }
export async function getComposeTemplates(): Promise<ComposeTemplate[]> {
  const s = await db();
  if (!s) return [{ id: "t1", name: "Water Shutoff", channels: ["email", "sms"], body: "Water will be shut off {{date}} {{time}}. Please store water in advance." }];
  try {
    const { data } = await s.from("templates").select("id,name,channels,body");
    return (data ?? []).map((t) => ({ id: t.id, name: t.name, channels: t.channels ?? [], body: t.body ?? "" }));
  } catch { return []; }
}

export interface PropertyFull { id: string; name: string; address: string; type: string; units: number; occupied: number; managerName: string; managerEmail: string; managerPhone: string }
export async function getPropertiesFull(): Promise<PropertyFull[]> {
  const s = await db();
  const demo: PropertyFull[] = [
    { id: "p1", name: "WoodGreen — Danforth", address: "1004 Danforth Ave", type: "residential", units: 142, occupied: 8, managerName: "Tom Bradley", managerEmail: "t.bradley@woodgreen.org", managerPhone: "416-555-2001" },
    { id: "p2", name: "WoodGreen — East York", address: "850 Coxwell Ave", type: "residential", units: 98, occupied: 8, managerName: "Maria Rodriguez", managerEmail: "m.rodriguez@woodgreen.org", managerPhone: "416-555-2002" },
  ];
  if (!s) return demo;
  try {
    const { data: props } = await s.from("properties").select("id,name,address,units,type,manager_name,manager_email,manager_phone").order("name");
    if (!props?.length) return demo;
    const { data: res } = await s.from("residents").select("property_id").eq("status", "active");
    const counts = new Map<string, number>();
    for (const r of res ?? []) if (r.property_id) counts.set(r.property_id, (counts.get(r.property_id) ?? 0) + 1);
    return props.map((p) => ({ id: p.id, name: p.name, address: p.address ?? "—", type: p.type ?? "residential", units: p.units ?? 0, occupied: counts.get(p.id) ?? 0, managerName: p.manager_name ?? "—", managerEmail: p.manager_email ?? "", managerPhone: p.manager_phone ?? "" }));
  } catch { return demo; }
}

export interface OrgSettings { dataResidency: string; collectDeliveryLogs: boolean; collectProofOfPlay: boolean; collectAcknowledgements: boolean; auditReportCadence: string }
export async function getOrgSettings(): Promise<OrgSettings> {
  const def: OrgSettings = { dataResidency: "ca-central-1", collectDeliveryLogs: true, collectProofOfPlay: true, collectAcknowledgements: true, auditReportCadence: "monthly" };
  const s = await db();
  if (!s) return def;
  try {
    const { data } = await s.from("org_settings").select("*").maybeSingle();
    if (!data) return def;
    return { dataResidency: data.data_residency, collectDeliveryLogs: data.collect_delivery_logs, collectProofOfPlay: data.collect_proof_of_play, collectAcknowledgements: data.collect_acknowledgements, auditReportCadence: data.audit_report_cadence };
  } catch { return def; }
}

export interface NoticeFactsRow { operationTitle: string; contactInfo: string; dateText: string; affected: string; cta: string; imageCategory: string }
export interface NoticeDraft { channel: string; subject: string; body: string }
export interface NoticeSchedule { start: string; end: string; mode: string; sameAll: boolean }
export interface WorkOrderDetail {
  id: string; title: string; category: string; status: string; propertyId: string | null; propertyName: string;
  channels: string[]; noticeStatus: "none" | "draft" | "pending_review" | "approved" | "published";
  notice: NoticeFactsRow; drafts: NoticeDraft[]; schedule: NoticeSchedule;
}
export interface RecipientSummary { total: number; email: number; sms: number; sample: { name: string; channel: "email" | "sms" }[] }

const EMPTY_NOTICE: NoticeFactsRow = { operationTitle: "", contactInfo: "", dateText: "", affected: "", cta: "", imageCategory: "default" };
const EMPTY_SCHEDULE: NoticeSchedule = { start: "", end: "", mode: "once", sameAll: true };

export async function getWorkOrder(id: string): Promise<WorkOrderDetail | null> {
  const s = await db();
  if (!s) return null;
  try {
    const { data } = await s.from("work_orders").select("id,title,category,status,property_id,channels,notice_status,notice,drafts,schedule,properties(name)").eq("id", id).maybeSingle();
    if (!data) return null;
    return {
      id: data.id, title: data.title, category: data.category ?? "Notice", status: data.status,
      propertyId: data.property_id, propertyName: propName(data.properties as PropRef),
      channels: data.channels ?? [], noticeStatus: (data.notice_status ?? "none") as WorkOrderDetail["noticeStatus"],
      notice: { ...EMPTY_NOTICE, ...(data.notice ?? {}) },
      drafts: (data.drafts ?? []) as NoticeDraft[],
      schedule: { ...EMPTY_SCHEDULE, ...(data.schedule ?? {}) },
    };
  } catch { return null; }
}

export async function getRecipientSummary(propertyId: string | null): Promise<RecipientSummary> {
  const s = await db();
  if (!s || !propertyId) return { total: 0, email: 0, sms: 0, sample: [] };
  try {
    const { data } = await s.from("residents").select("name,email,phone,preferred_channel").eq("property_id", propertyId).eq("status", "active");
    const rows = data ?? [];
    let email = 0, sms = 0;
    const sample: RecipientSummary["sample"] = [];
    for (const r of rows) {
      // honor explicit preferred channel; else derive (email if present, else sms)
      const pref = r.preferred_channel as string | null;
      const ch: "email" | "sms" = pref === "email" ? "email" : pref === "sms" || pref === "whatsapp" ? "sms" : r.email ? "email" : "sms";
      if (ch === "email") email++; else sms++;
      if (sample.length < 5) sample.push({ name: r.name, channel: ch });
    }
    return { total: rows.length, email, sms, sample };
  } catch { return { total: 0, email: 0, sms: 0, sample: [] }; }
}

export interface AuditReport {
  period: string; totalNotifications: number; delivered: number; deliveryRatePct: number;
  byChannel: { channel: string; sent: number; delivered: number }[];
  proofOfPlay: number; acknowledgements: number; source: "live" | "demo";
}
function currentQuarter(): string {
  const d = new Date(); const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}
export async function getAuditReport(): Promise<AuditReport> {
  const demo: AuditReport = { period: "Q2 2026", totalNotifications: 4352, delivered: 4218, deliveryRatePct: 96.9, byChannel: [{ channel: "email", sent: 2890, delivered: 2810 }, { channel: "sms", sent: 1462, delivered: 1408 }], proofOfPlay: 312, acknowledgements: 1840, source: "demo" };
  const s = await db();
  if (!s) return demo;
  try {
    const [{ count: msgSent }, { count: noticesPub }, { count: pop }] = await Promise.all([
      s.from("messages").select("id", { count: "exact", head: true }).eq("status", "sent"),
      s.from("work_orders").select("id", { count: "exact", head: true }).eq("notice_status", "published"),
      s.from("work_orders").select("id", { count: "exact", head: true }).eq("notice_status", "published").contains("channels", ["display"]),
    ]);
    const { data: recips } = await s.from("message_recipients").select("channel,status");
    const total = recips?.length ?? 0;
    const delivered = (recips ?? []).filter((r) => r.status === "delivered" || r.status === "opened").length;
    const map = new Map<string, { sent: number; delivered: number }>();
    for (const r of recips ?? []) { const e = map.get(r.channel) ?? { sent: 0, delivered: 0 }; e.sent++; if (r.status === "delivered" || r.status === "opened") e.delivered++; map.set(r.channel, e); }
    const byChannel = [...map.entries()].map(([channel, v]) => ({ channel, ...v }));
    const totalNotifications = (msgSent ?? 0) + (noticesPub ?? 0);
    if (!totalNotifications && !total) return demo;
    return { period: currentQuarter(), totalNotifications, delivered, deliveryRatePct: total ? Math.round((delivered / total) * 1000) / 10 : 0, byChannel: byChannel.length ? byChannel : demo.byChannel, proofOfPlay: pop ?? 0, acknowledgements: delivered, source: "live" };
  } catch { return demo; }
}

const DEMO2 = {
  members: [
    { id: "m1", userId: "u1", fullName: "Clinton Reid", email: "clinton@fuse5.ca", role: "org_admin", status: "active" },
    { id: "m2", userId: "u2", fullName: "Tom Bradley", email: "t.bradley@woodgreen.org", role: "property_manager", status: "active" },
    { id: "m3", userId: "u3", fullName: "Maria Rodriguez", email: "m.rodriguez@woodgreen.org", role: "comms_manager", status: "active" },
    { id: "m4", userId: "u4", fullName: "Dana Lee", email: "d.lee@woodgreen.org", role: "viewer", status: "invited" },
  ] as MemberRow[],
  audit: [
    { id: "a1", actor: "Clinton Reid", action: "Broadcast", detail: "Water shutoff via email — 24 recipients", when: "2m ago" },
    { id: "a2", actor: "Clinton Reid", action: "Login", detail: "Signed in as Org Admin", when: "5m ago" },
  ] as AuditRow[],
  subscription: { plan: "Growth", seats: 25, usedSeats: 18, status: "Active", cycleSpend: "$1,240" } as SubscriptionInfo,
  dashboard: {
    messagesSent: 1, activeBroadcasts: 2, openWorkOrders: 10, residents: 21, displaysOnline: 10,
    feed: [
      { actor: "Clinton Reid", action: "Broadcast", detail: "Water shutoff — 24 recipients", when: "2m ago", tone: "ok" },
      { actor: "System", action: "Display offline", detail: "Lobby Display 8", when: "1h ago", tone: "alert" },
    ],
    source: "demo",
  } as DashboardStats,
  messageStats: {
    sent: 1, recipients: 24, delivered: 24, deliveryRatePct: 100,
    byChannel: [{ channel: "email", sent: 24, delivered: 24 }], source: "demo",
  } as MessageStats,
  inbox: [
    { id: "i1", sender: "Amara Johnson", unit: "204", channel: "sms", snippet: "Is the water back on yet? Unit 204.", when: "3m ago", status: "unread" },
    { id: "i2", sender: "Liam Chen", unit: "207", channel: "email", snippet: "Will the laundry room be affected?", when: "11m ago", status: "awaiting" },
    { id: "i3", sender: "Sofia Rossi", unit: "112", channel: "whatsapp", snippet: "My fob stopped working at the Danforth entrance.", when: "26m ago", status: "unread" },
  ] as InboundRow[],
  emergencyLog: [
    { id: "eb-3", date: "May 28, 14:02", type: "Fire Alarm — Tower A", reach: "612 residents", status: "resolved" },
    { id: "eb-2", date: "May 14, 19:44", type: "Severe Weather Warning", reach: "2,847 residents", status: "sent" },
    { id: "eb-1", date: "Apr 27, 22:10", type: "Gas Leak Evacuation", reach: "210 residents", status: "resolved" },
  ] as EmergencyLogRow[],
};

// ---- platform-operator (super-admin) getters: live cross-org or demo fallback ----
// The local DB carries a single org, so these fall back to the v8.1 demo set
// (4 providers) until real multi-tenant data exists. RLS super-read policies
// (migration 0010) let a super_admin actually read across orgs in production.

export interface PlatformStats { providers: number; users: number; properties: number; tenants: number; uptime: string }
export async function getPlatformStats(): Promise<PlatformStats> {
  const demo: PlatformStats = { providers: 4, users: 27, properties: 18, tenants: 2407, uptime: "99.7%" };
  const s = await db();
  if (!s) return demo;
  try {
    const [orgs, members, props, residents] = await Promise.all([
      s.from("organizations").select("id", { count: "exact", head: true }),
      s.from("org_members").select("id", { count: "exact", head: true }),
      s.from("properties").select("id", { count: "exact", head: true }),
      s.from("residents").select("id", { count: "exact", head: true }),
    ]);
    if ((orgs.count ?? 0) <= 1) return demo;
    return { providers: orgs.count ?? 0, users: members.count ?? 0, properties: props.count ?? 0, tenants: residents.count ?? 0, uptime: "99.7%" };
  } catch { return demo; }
}

export async function getPlatformProviders(): Promise<ProviderDemo[]> {
  const s = await db();
  if (!s) return DEMO_PROVIDERS;
  try {
    const { data: orgs } = await s.from("organizations").select("id,name,region");
    if (!orgs || orgs.length <= 1) return DEMO_PROVIDERS;
    // Map live orgs into the provider shape (counts per org).
    const out: ProviderDemo[] = [];
    for (const o of orgs) {
      const [props, members, residents, displays] = await Promise.all([
        s.from("properties").select("id", { count: "exact", head: true }).eq("org_id", o.id),
        s.from("org_members").select("id", { count: "exact", head: true }).eq("org_id", o.id),
        s.from("residents").select("id", { count: "exact", head: true }).eq("org_id", o.id),
        s.from("displays").select("id", { count: "exact", head: true }).eq("org_id", o.id),
      ]);
      const short = o.name.split(/\s+/).map((w: string) => w[0]).join("").slice(0, 2).toUpperCase();
      out.push({ id: o.id, short, name: o.name, tier: "EMPRESA", color: "#009999", since: "—", yardi: "synced", status: "active", properties: props.count ?? 0, users: members.count ?? 0, tenants: residents.count ?? 0, players: displays.count ?? 0, compliance: 100, roles: [] });
    }
    return out;
  } catch { return DEMO_PROVIDERS; }
}

export async function getPlatformUsers(): Promise<PlatformUserDemo[]> {
  const s = await db();
  if (!s) return DEMO_PLATFORM_USERS;
  try {
    const { data: orgs } = await s.from("organizations").select("id,name");
    if (!orgs || orgs.length <= 1) return DEMO_PLATFORM_USERS;
    const orgName = new Map(orgs.map((o) => [o.id, o.name]));
    const { data } = await s.from("org_members").select("org_id,full_name,email,role,status");
    if (!data?.length) return DEMO_PLATFORM_USERS;
    return data.map((m) => ({ name: m.full_name ?? m.email ?? "—", email: m.email ?? "—", provider: orgName.get(m.org_id) ?? "—", providerColor: "#009999", role: m.role ?? "viewer", properties: "—", lastLogin: "—", status: (m.status === "suspended" ? "Suspended" : m.status === "invited" ? "Invited" : "Active") as PlatformUserDemo["status"] }));
  } catch { return DEMO_PLATFORM_USERS; }
}

export async function getPlayerFleet(): Promise<PlayerDemo[]> {
  const s = await db();
  if (!s) return DEMO_FLEET;
  try {
    const { data: orgs } = await s.from("organizations").select("id");
    if (!orgs || orgs.length <= 1) return DEMO_FLEET;
    const { data } = await s.from("displays").select("id,name,location,status,properties(name)");
    if (!data?.length) return DEMO_FLEET;
    return data.map((d) => ({ id: d.id, model: "H200W", provider: "—", property: propName(d.properties as PropRef), location: d.location ?? "—", status: (d.status as PlayerDemo["status"]) ?? "online", uptime: 99, firmware: "v4.2.1", display: "1920×1080", orientation: "landscape", lastSeen: "—" }));
  } catch { return DEMO_FLEET; }
}

export async function getTenantPortalConfig(): Promise<PortalConfig> {
  const s = await db();
  if (!s) return DEFAULT_PORTAL;
  try {
    const { data } = await s.from("tenant_portal_config").select("settings").maybeSingle();
    if (!data?.settings || typeof data.settings !== "object") return DEFAULT_PORTAL;
    return { ...DEFAULT_PORTAL, ...(data.settings as Partial<PortalConfig>) };
  } catch { return DEFAULT_PORTAL; }
}
