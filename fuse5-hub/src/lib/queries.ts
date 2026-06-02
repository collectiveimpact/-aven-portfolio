import "server-only";
import { createClient } from "@/lib/supabase/server";

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
