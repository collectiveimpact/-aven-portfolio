"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { generateDrafts, type NoticeFacts, type Draft } from "@/lib/ai";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { isSystemField } from "@/lib/wo-fields";
import { canBroadcast, canPublish } from "@/lib/rbac";
import { renderNoticeEmailHtml } from "@/lib/notice-template";
import { sendPortalPush } from "@/lib/portal/push";
import { markWorkOrderComplete } from "@/lib/yardi/mcp";

// Operational status lifecycle (separate from the notice approval workflow):
// open → in_progress → resolved. Settable from the work-order queue.
//
// When a WO is resolved AND it carries a Yardi WONumber (external_id, set by the
// Yardi import / connector sync), we also close it in Yardi via the Virtuoso MCP
// (rfm_workorder_mark_work_order_as_complete). Best-effort + non-blocking: a
// Yardi failure never blocks the local status change; both outcomes are audited
// with their live/stub mode so the trail shows whether Yardi was actually hit.
export async function setWorkOrderStatus(woId: string, status: "open" | "in_progress" | "resolved"): Promise<{ ok: boolean; error?: string; yardi?: "live" | "stub" | "failed" | "skipped" }> {
  if (!["open", "in_progress", "resolved"].includes(status)) return { ok: false, error: "Invalid status." };
  const supabase = await createClient(); if (!supabase) return { ok: false, error: "No backend." };
  const me = await getCurrentUser(); if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot update work orders." };

  // Read the Yardi linkage before mutating (scoped to this WO).
  const { data: row } = await supabase.from("work_orders").select("external_id").eq("id", woId).single();
  const externalId = (row?.external_id as string | null) ?? null;

  const { error } = await supabase.from("work_orders").update({ status }).eq("id", woId);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Work Order Status", detail: `${woId} → ${status}` });

  // Mirror "resolved" to Yardi when this WO is Yardi-linked.
  let yardi: "live" | "stub" | "failed" | "skipped" = "skipped";
  if (status === "resolved" && externalId) {
    try {
      const r = await markWorkOrderComplete(externalId);
      yardi = r.ok ? r.mode : "failed";
      await supabase.from("audit_log").insert({
        org_id: me.orgId, actor_id: me.id, action: "Yardi WO Complete",
        detail: r.ok ? `${externalId} marked complete in Yardi (${r.mode})` : `${externalId} — Yardi close failed: ${r.error ?? "unknown"}`,
      });
    } catch { yardi = "failed"; }
  }
  return { ok: true, yardi };
}

// Approval workflow: Draft → Review → Approved → Sent.
export async function submitForReview(woId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient(); if (!supabase) return { ok: false, error: "No backend." };
  const me = await getCurrentUser(); if (!me?.orgId) return { ok: false, error: "No organization." };
  const { error } = await supabase.from("work_orders").update({ notice_status: "pending_review", submitted_by: me.id }).eq("id", woId);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Notice Submitted for Review", detail: `Work order ${woId}` });
  return { ok: true };
}
export async function approveNotice(woId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient(); if (!supabase) return { ok: false, error: "No backend." };
  const me = await getCurrentUser(); if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canBroadcast(me.role)) return { ok: false, error: "Your role cannot approve notices." };
  const { error } = await supabase.from("work_orders").update({ notice_status: "approved", approved_by: me.id }).eq("id", woId);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Notice Approved", detail: `Work order ${woId}` });
  return { ok: true };
}
export async function rejectNotice(woId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient(); if (!supabase) return { ok: false, error: "No backend." };
  const me = await getCurrentUser(); if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canBroadcast(me.role)) return { ok: false, error: "Your role cannot review notices." };
  const { error } = await supabase.from("work_orders").update({ notice_status: "draft" }).eq("id", woId);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Notice Returned to Draft", detail: `Work order ${woId}` });
  return { ok: true };
}

// Admin: set a field Required/Optional/Hidden for this client. System
// (minimum-mandatory) fields are locked and rejected here.
export async function updateWoFieldSetting(noticeType: string, key: string, enabled: boolean, required: boolean): Promise<{ ok: boolean; error?: string }> {
  if (isSystemField(key)) return { ok: false, error: "Mandatory system field — cannot change." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  const { error } = await supabase.from("wo_field_settings").upsert(
    { org_id: me.orgId, notice_type: noticeType, field_key: key, enabled, required: enabled && required },
    { onConflict: "org_id,notice_type,field_key" },
  );
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "WO Field Config", detail: `${noticeType}/${key}: ${enabled ? (required ? "required" : "optional") : "hidden"}` });
  return { ok: true };
}

export interface CreateWOInput {
  propertyId: string;
  title: string;
  category: string;
  channels: string[];
  facts: NoticeFacts;
  noticeType?: string;
  targetSegmentIds?: string[];
  priority?: "low" | "medium" | "high" | "urgent";
}
export interface CreateWOResult { ok: boolean; woId?: string; drafts?: Draft[]; mode?: "live" | "stub"; error?: string }

// Create a work order AND generate its multi-channel notice drafts.
export async function createWorkOrderWithDrafts(input: CreateWOInput): Promise<CreateWOResult> {
  if (!input.title.trim()) return { ok: false, error: "Title is required." };
  if (!input.facts.operationTitle.trim()) return { ok: false, error: "Operation title is required for generation." };

  const supabase = await createClient();
  if (!supabase) {
    const { drafts, mode } = await generateDrafts(input.facts, input.channels);
    return { ok: true, drafts, mode };
  }
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };

  const { drafts, mode } = await generateDrafts(input.facts, input.channels);
  const { data, error } = await supabase.from("work_orders").insert({
    org_id: me.orgId, property_id: input.propertyId || null, unit: input.facts.affected || null,
    title: input.title, category: input.category || "Notice", priority: input.priority ?? "medium", status: "open",
    channels: input.channels, drafts, notice_status: "draft",
    notice_type: input.noticeType ?? "general",
    target: { scope: (input.targetSegmentIds?.length ? "both" : "property"), segmentIds: input.targetSegmentIds ?? [] },
    notice: { operationTitle: input.facts.operationTitle, contactInfo: input.facts.contactInfo, dateText: input.facts.dateTime, affected: input.facts.affected, cta: input.facts.callToAction, imageCategory: "default" } satisfies NoticeFactsRow,
  }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not create work order." };

  await supabase.from("audit_log").insert({
    org_id: me.orgId, actor_id: me.id, action: "Notice Drafts Generated",
    detail: `"${input.title}" — ${drafts.length} channel drafts (${mode})`,
  });
  return { ok: true, woId: data.id, drafts, mode };
}

export type NoticeFactsRow = { operationTitle: string; contactInfo: string; dateText: string; affected: string; cta: string; imageCategory: string };
const toFacts = (f: NoticeFactsRow): NoticeFacts => ({ operationTitle: f.operationTitle, dateTime: f.dateText, contactInfo: f.contactInfo, affected: f.affected, callToAction: f.cta });

export interface SaveNoticeInput {
  id: string;
  facts: NoticeFactsRow;
  channels: string[];
  schedule: { start: string; end: string; mode: string; sameAll: boolean };
  regenerate: boolean;
}
export interface SaveNoticeResult { ok: boolean; drafts?: Draft[]; mode?: "live" | "stub"; error?: string }

// Save edits to a notice; optionally regenerate the AI drafts from the edited facts.
export async function saveNotice(input: SaveNoticeInput): Promise<SaveNoticeResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };

  let drafts: Draft[] | undefined;
  let mode: "live" | "stub" | undefined;
  const update: Record<string, unknown> = { notice: input.facts, channels: input.channels, schedule: input.schedule };
  if (input.regenerate) {
    const r = await generateDrafts(toFacts(input.facts), input.channels);
    drafts = r.drafts; mode = r.mode; update.drafts = r.drafts;
  }
  const { error } = await supabase.from("work_orders").update(update).eq("id", input.id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Notice Saved", detail: `Work order ${input.id}${input.regenerate ? " (regenerated)" : ""}` });
  return { ok: true, drafts, mode };
}

// Publish: mark published, fan out to the property's tenants via their preferred
// channel (email through the adapter), log delivery + audit.
export async function publishNotice(woId: string): Promise<{ ok: boolean; sent?: number; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: true, sent: 0 };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };

  const { data: wo } = await supabase.from("work_orders").select("title,property_id,channels,drafts,notice_status,notice,properties(name)").eq("id", woId).single();
  if (!wo) return { ok: false, error: "Work order not found." };
  if (wo.notice_status !== "approved") return { ok: false, error: "Notice must be Approved before publishing." };

  const drafts = (wo.drafts ?? []) as Draft[];
  const emailDraft = drafts.find((d) => d.channel === "email");
  const smsDraft = drafts.find((d) => d.channel === "sms");
  const channels: string[] = wo.channels ?? [];
  const facts = (wo.notice ?? {}) as Partial<NoticeFactsRow>;
  const propertyName = (Array.isArray(wo.properties) ? wo.properties[0]?.name : (wo.properties as { name: string } | null)?.name) ?? "Your residence";
  let sent = 0;
  if (wo.property_id) {
    const { data: recips } = await supabase.from("residents").select("email,phone,preferred_channel").eq("property_id", wo.property_id).eq("status", "active").limit(200);
    const html = emailDraft ? renderNoticeEmailHtml({
      orgName: me.orgName ?? "Your housing provider", propertyName, title: wo.title,
      subject: emailDraft.subject, body: emailDraft.body, cta: facts.cta, dateText: facts.dateText,
      affected: facts.affected, contactInfo: facts.contactInfo, imageCategory: facts.imageCategory,
    }) : "";
    for (const r of recips ?? []) {
      const pref = r.preferred_channel as "email" | "sms" | "whatsapp" | null;
      let ch: "email" | "sms" | null = null;
      if ((pref === "sms" || pref === "whatsapp") && channels.includes("sms") && r.phone) ch = "sms";
      else if (pref === "email" && channels.includes("email") && r.email) ch = "email";
      if (!ch) { if (channels.includes("email") && r.email) ch = "email"; else if (channels.includes("sms") && r.phone) ch = "sms"; }
      if (!ch) continue;
      const res = ch === "email" && emailDraft
        ? await sendEmail({ to: r.email as string, subject: emailDraft.subject || wo.title, html })
        : ch === "sms" && smsDraft
          ? await sendSms(r.phone as string, smsDraft.body)
          : { ok: false };
      if (res.ok) sent++;
    }
  }
  await supabase.from("work_orders").update({ notice_status: "published" }).eq("id", woId);
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Notice Published", detail: `"${wo.title}" — ${sent} recipients (email/SMS by preference)` });
  return { ok: true, sent };
}

// ── Resident request chat (staff side) ──────────────────────────────────────
// The resident posts on their maintenance request from /portal; staff read the
// thread + reply here. RLS scopes request_messages to the caller's org.
export interface ThreadMessage { id: string; sender: "resident" | "staff"; body: string; createdAt: string }

export async function getRequestThread(woId: string): Promise<ThreadMessage[]> {
  const supabase = await createClient();
  if (!supabase) return [];
  const me = await getCurrentUser();
  if (!me?.orgId) return [];
  const { data } = await supabase
    .from("request_messages")
    .select("id,sender,body,created_at")
    .eq("work_order_id", woId)
    .eq("org_id", me.orgId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((m) => ({ id: m.id as string, sender: (m.sender as "resident" | "staff"), body: m.body as string, createdAt: m.created_at as string }));
}

export async function postStaffReply(woId: string, body: string): Promise<{ ok: boolean; error?: string }> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Message is empty." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role can't reply to residents." };

  // Target the resident who owns this thread (latest resident message on the WO).
  const { data: prior } = await supabase
    .from("request_messages")
    .select("resident_id")
    .eq("work_order_id", woId).eq("org_id", me.orgId).eq("sender", "resident")
    .order("created_at", { ascending: false }).limit(1);
  const residentId = (prior?.[0]?.resident_id as string | null) ?? null;

  const { error } = await supabase.from("request_messages").insert({
    work_order_id: woId, org_id: me.orgId, resident_id: residentId, sender: "staff", body: text,
  });
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Request Reply Sent", detail: `Work order ${woId}` });
  // Best-effort push to the resident (no-op until VAPID keys are set).
  if (residentId) {
    try { await sendPortalPush(residentId, me.orgId, { title: "Update on your request", body: text.slice(0, 120), url: "/portal/requests" }); } catch { /* non-blocking */ }
  }
  return { ok: true };
}
