// Shapes mirror fuse5-hub/supabase/migrations/0001_init.sql.
// Section pages import these (read-only) — safe to share across agents.
import type { F5Role } from "@/lib/rbac";
export type { F5Role };

export interface Organization { id: string; name: string; slug: string; region: string | null }
export interface Property { id: string; org_id: string; name: string; address: string | null; units: number }
export interface Resident { id: string; org_id: string; property_id: string; unit: string; name: string; email: string | null; phone: string | null; language: string | null; status: "active" | "moved_out" }
export interface Member { id: string; org_id: string; user_id: string; full_name: string; email: string; role: F5Role }

export type Channel = "email" | "sms" | "whatsapp" | "voice" | "display";
export type MessageStatus = "draft" | "pending_approval" | "approved" | "scheduled" | "sending" | "sent" | "failed";

export interface Template { id: string; org_id: string | null; name: string; category: string; channels: Channel[]; mandatory: boolean; version: string; body: string }
export interface Message {
  id: string; org_id: string; subject: string; body: string; channels: Channel[];
  status: MessageStatus; priority: "normal" | "high" | "emergency"; audience_count: number;
  created_at: string; scheduled_for: string | null;
}
export interface MessageRecipient { id: string; message_id: string; resident_id: string; channel: Channel; status: "queued" | "delivered" | "opened" | "bounced" }

export interface WorkOrder { id: string; org_id: string; property_id: string; unit: string | null; title: string; category: string; priority: "low" | "medium" | "high" | "urgent"; status: "open" | "in_progress" | "resolved"; created_at: string }
export interface Display { id: string; org_id: string; property_id: string; name: string; location: string; status: "online" | "offline" | "warning"; content_id: string | null }
export interface ContentItem { id: string; org_id: string; title: string; type: "image" | "video" | "notice" | "playlist"; duration_s: number | null; updated_at: string }
export interface Survey { id: string; org_id: string; title: string; status: "draft" | "live" | "closed"; responses: number; sent: number }
export interface ComplianceItem { id: string; org_id: string; property_id: string; kind: string; due: string; status: "compliant" | "due_soon" | "overdue" }
export interface CalendarEvent { id: string; org_id: string; title: string; date: string; channel: Channel | "multi"; status: "scheduled" | "sent" }
export interface Contact { id: string; org_id: string; name: string; role: string; email: string | null; phone: string | null; property: string | null }
export interface Segment { id: string; org_id: string; name: string; rule: string; size: number }

export interface AuditEntry { id: string; org_id: string; actor: string; action: string; detail: string; created_at: string }

export interface AgentDef { key: string; name: string; tagline: string; ico: string; status: "live" | "beta" }

export interface OverviewData {
  orgName: string;
  kpis: { units: number; occupancy: number; openWorkOrders: number; signageUptime: number };
  alerts: { tone: "ok" | "warn" | "alert"; title: string; detail: string; when: string }[];
  trend: { label: string; value: number }[];
  source: "live" | "demo";
}
