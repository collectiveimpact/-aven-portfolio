"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { generateDrafts, type NoticeFacts, type Draft } from "@/lib/ai";

export interface CreateWOInput {
  propertyId: string;
  title: string;
  category: string;
  channels: string[];
  facts: NoticeFacts;
}
export interface CreateWOResult { ok: boolean; drafts?: Draft[]; mode?: "live" | "stub"; error?: string }

// Create a work order AND generate its multi-channel notice drafts (the
// demo.fuse5.ca "Create & Generate Drafts" flow). Called imperatively from the
// client modal (not <form action> — that path drops the session via middleware).
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

  const { error } = await supabase.from("work_orders").insert({
    org_id: me.orgId,
    property_id: input.propertyId || null,
    unit: input.facts.affected || null,
    title: input.title,
    category: input.category || "Notice",
    priority: "medium",
    status: "open",
    channels: input.channels,
    drafts,
    notice_status: "draft",
  });
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_log").insert({
    org_id: me.orgId, actor_id: me.id, action: "Notice Drafts Generated",
    detail: `"${input.title}" — ${drafts.length} channel drafts (${mode})`,
  });

  return { ok: true, drafts, mode };
}

export async function publishNotice(woId: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  if (!supabase) return { ok: true };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  const { error } = await supabase.from("work_orders").update({ notice_status: "published" }).eq("id", woId);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Notice Published", detail: `Work order ${woId}` });
  return { ok: true };
}
