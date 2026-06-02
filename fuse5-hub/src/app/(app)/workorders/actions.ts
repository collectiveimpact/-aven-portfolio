"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { generateDrafts, type NoticeFacts, type Draft } from "@/lib/ai";
import { sendEmail } from "@/lib/email";
import { isSystemField } from "@/lib/wo-fields";

// Admin: set a field Required/Optional/Hidden for this client. System
// (minimum-mandatory) fields are locked and rejected here.
export async function updateWoFieldSetting(key: string, enabled: boolean, required: boolean): Promise<{ ok: boolean; error?: string }> {
  if (isSystemField(key)) return { ok: false, error: "Mandatory system field — cannot change." };
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  const { error } = await supabase.from("wo_field_settings").upsert(
    { org_id: me.orgId, field_key: key, enabled, required: enabled && required },
    { onConflict: "org_id,field_key" },
  );
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "WO Field Config", detail: `${key}: ${enabled ? (required ? "required" : "optional") : "hidden"}` });
  return { ok: true };
}

export interface CreateWOInput {
  propertyId: string;
  title: string;
  category: string;
  channels: string[];
  facts: NoticeFacts;
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
    title: input.title, category: input.category || "Notice", priority: "medium", status: "open",
    channels: input.channels, drafts, notice_status: "draft",
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

  const { data: wo } = await supabase.from("work_orders").select("title,property_id,channels,drafts").eq("id", woId).single();
  if (!wo) return { ok: false, error: "Work order not found." };

  const emailDraft = ((wo.drafts ?? []) as Draft[]).find((d) => d.channel === "email");
  let sent = 0;
  if (wo.property_id && emailDraft) {
    const { data: recips } = await supabase.from("residents").select("email,name").eq("property_id", wo.property_id).eq("status", "active").not("email", "is", null).limit(100);
    const html = `<div>${emailDraft.body.replace(/\n/g, "<br/>")}</div>`;
    for (const r of recips ?? []) {
      if (r.email) { const res = await sendEmail({ to: r.email, subject: emailDraft.subject || wo.title, html }); if (res.ok) sent++; }
    }
  }
  await supabase.from("work_orders").update({ notice_status: "published" }).eq("id", woId);
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Notice Published", detail: `"${wo.title}" — ${sent} email recipients` });
  return { ok: true, sent };
}
