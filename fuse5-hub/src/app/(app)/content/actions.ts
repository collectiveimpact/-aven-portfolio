"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";

export interface ContentInput {
  id?: string;
  title: string;
  type: "image" | "video" | "notice" | "playlist";
  durationS: number | null;
}
export type SaveResult = { ok: boolean; error?: string };

// Create or update a content asset. RLS scopes rows to the caller's org; we also
// gate in-app with canPublish so the UI never offers a write the content_items
// _write policy (publisher-tier) would reject.
export async function saveContent(input: ContentInput): Promise<SaveResult> {
  if (!input.title.trim()) return { ok: false, error: "Title is required." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage content." };

  const row = {
    title: input.title.trim(),
    type: input.type,
    duration_s: input.durationS,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await supabase.from("content_items").update(row).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Content Updated", detail: row.title });
  } else {
    const { error } = await supabase.from("content_items").insert({ org_id: me.orgId, ...row });
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Content Added", detail: row.title });
  }
  return { ok: true };
}

export async function deleteContent(id: string): Promise<SaveResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage content." };
  const { error } = await supabase.from("content_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Content Removed", detail: `Content ${id}` });
  return { ok: true };
}
