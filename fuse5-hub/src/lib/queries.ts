import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { F5Role } from "@/lib/rbac";

// Shared server query layer. Each getter reads LIVE from Supabase (RLS-scoped to
// the signed-in user's org) when the backend is configured, else returns a demo
// fallback so pages render in demo mode. Section pages call these instead of
// embedding their own data. Row types are flat + page-ready.

export interface ResidentRow { id: string; unit: string; name: string; propertyName: string; language: string; status: "active" | "moved_out" }
export interface WorkOrderRow { id: string; title: string; propertyName: string; unit: string; category: string; priority: "low"|"medium"|"high"|"urgent"; status: "open"|"in_progress"|"resolved" }
export interface TemplateRow { id: string; name: string; category: string; channels: string[]; mandatory: boolean; version: string }
export interface DisplayRow { id: string; name: string; location: string; propertyName: string; status: "online"|"offline"|"warning" }
export interface SurveyRow { id: string; title: string; status: "draft"|"live"|"closed"; sent: number; responses: number }
export interface ComplianceRow { id: string; propertyName: string; kind: string; due: string; status: "compliant"|"due_soon"|"overdue" }
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
    const { data } = await s.from("residents").select("id,unit,name,language,status,properties(name)").order("unit");
    if (!data?.length) return DEMO.residents;
    return data.map((r) => ({ id: r.id, unit: r.unit ?? "—", name: r.name, propertyName: propName(r.properties as PropRef), language: r.language ?? "—", status: r.status as ResidentRow["status"] }));
  } catch { return DEMO.residents; }
}

export async function getWorkOrders(): Promise<WorkOrderRow[]> {
  const s = await db();
  if (!s) return DEMO.workOrders;
  try {
    const { data } = await s.from("work_orders").select("id,title,unit,category,priority,status,properties(name)").order("created_at", { ascending: false });
    if (!data?.length) return DEMO.workOrders;
    return data.map((w) => ({ id: w.id, title: w.title, propertyName: propName(w.properties as PropRef), unit: w.unit ?? "—", category: w.category ?? "—", priority: w.priority as WorkOrderRow["priority"], status: w.status as WorkOrderRow["status"] }));
  } catch { return DEMO.workOrders; }
}

export async function getTemplates(): Promise<TemplateRow[]> {
  const s = await db();
  if (!s) return DEMO.templates;
  try {
    const { data } = await s.from("templates").select("id,name,category,channels,mandatory,version");
    if (!data?.length) return DEMO.templates;
    return data.map((t) => ({ id: t.id, name: t.name, category: t.category ?? "—", channels: t.channels ?? [], mandatory: !!t.mandatory, version: t.version ?? "1.0" }));
  } catch { return DEMO.templates; }
}

export async function getDisplays(): Promise<DisplayRow[]> {
  const s = await db();
  if (!s) return DEMO.displays;
  try {
    const { data } = await s.from("displays").select("id,name,location,status,properties(name)");
    if (!data?.length) return DEMO.displays;
    return data.map((d) => ({ id: d.id, name: d.name, location: d.location ?? "—", propertyName: propName(d.properties as PropRef), status: d.status as DisplayRow["status"] }));
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
    const { data } = await s.from("compliance_items").select("id,kind,due,status,properties(name)");
    if (!data?.length) return DEMO.compliance;
    return data.map((c) => ({ id: c.id, propertyName: propName(c.properties as PropRef), kind: c.kind, due: c.due ?? "—", status: c.status as ComplianceRow["status"] }));
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

export async function getSegments(): Promise<SegmentRow[]> {
  const s = await db();
  if (!s) return DEMO.segments;
  try {
    const { data } = await s.from("segments").select("id,name,rule,size");
    if (!data?.length) return DEMO.segments;
    return data.map((g) => ({ id: g.id, name: g.name, rule: typeof g.rule === "string" ? g.rule : JSON.stringify(g.rule), size: g.size ?? 0 }));
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
  residents: [
    { id: "r1", unit: "204", name: "Amara Okafor", propertyName: "WoodGreen — Danforth", language: "English", status: "active" },
    { id: "r2", unit: "207", name: "Jean-Luc Tremblay", propertyName: "WoodGreen — Danforth", language: "French", status: "active" },
    { id: "r3", unit: "112", name: "Mei Lin Zhang", propertyName: "WoodGreen — East York", language: "Mandarin", status: "active" },
    { id: "r4", unit: "120", name: "David Thompson", propertyName: "WoodGreen — East York", language: "English", status: "moved_out" },
  ] as ResidentRow[],
  workOrders: [
    { id: "w1", title: "Leaking faucet — unit 204", propertyName: "WoodGreen — Danforth", unit: "204", category: "Plumbing", priority: "high", status: "open" },
    { id: "w2", title: "Hallway light out", propertyName: "WoodGreen — East York", unit: "—", category: "Electrical", priority: "medium", status: "in_progress" },
  ] as WorkOrderRow[],
  templates: [
    { id: "t1", name: "Water Shutoff", category: "Maintenance", channels: ["display","sms","email"], mandatory: true, version: "1.8" },
    { id: "t2", name: "Monthly Newsletter", category: "Community", channels: ["email"], mandatory: false, version: "3.0" },
  ] as TemplateRow[],
  displays: [
    { id: "d1", name: "Lobby Display 1", location: "Main Lobby", propertyName: "WoodGreen — Danforth", status: "online" },
    { id: "d2", name: "Lobby Display 2", location: "Elevator A", propertyName: "WoodGreen — East York", status: "offline" },
  ] as DisplayRow[],
  surveys: [
    { id: "s1", title: "Annual Resident Satisfaction", status: "live", sent: 1284, responses: 842 },
  ] as SurveyRow[],
  compliance: [
    { id: "c1", propertyName: "WoodGreen — Danforth", kind: "RentSafeTO Audit", due: "2026-06-20", status: "due_soon" },
    { id: "c2", propertyName: "WoodGreen — East York", kind: "Fire Inspection", due: "2026-05-10", status: "overdue" },
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

export interface MemberRow { id: string; fullName: string; email: string; role: F5Role; status: "active" | "invited" | "suspended" }
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
      return { id: m.id, fullName: p?.full_name || "—", email: p?.email || "—", role: m.role as F5Role, status: "active" as const };
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

const DEMO2 = {
  members: [
    { id: "m1", fullName: "Clinton Reid", email: "clinton@fuse5.ca", role: "org_admin", status: "active" },
    { id: "m2", fullName: "Tom Bradley", email: "t.bradley@woodgreen.org", role: "property_manager", status: "active" },
    { id: "m3", fullName: "Maria Rodriguez", email: "m.rodriguez@woodgreen.org", role: "comms_manager", status: "active" },
    { id: "m4", fullName: "Dana Lee", email: "d.lee@woodgreen.org", role: "viewer", status: "invited" },
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
};
