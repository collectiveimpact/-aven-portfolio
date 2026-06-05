"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";

export interface TemplateInput {
  id?: string;
  name: string;
  category: string;
  channels: string[];
  version: string;
  body: string;
}
export type TemplateResult = { ok: boolean; error?: string };

export async function saveTemplate(input: TemplateInput): Promise<TemplateResult> {
  if (!input.name.trim()) return { ok: false, error: "Template name is required." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage templates." };

  const row = {
    name: input.name.trim(),
    category: input.category.trim() || "General",
    channels: input.channels.length ? input.channels : ["email"],
    version: input.version.trim() || "1.0",
    body: input.body,
  };

  if (input.id) {
    // Master (mandatory) templates are Fuse5-managed and read-only to org users.
    const { data: existing } = await supabase.from("templates").select("mandatory").eq("id", input.id).maybeSingle();
    if (existing?.mandatory) return { ok: false, error: "Master templates are read-only." };
    const { error } = await supabase.from("templates").update(row).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Template Updated", detail: `${row.name} v${row.version}` });
  } else {
    const { error } = await supabase.from("templates").insert({ org_id: me.orgId, mandatory: false, ...row });
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Template Created", detail: `${row.name} v${row.version}` });
  }
  return { ok: true };
}

export async function deleteTemplate(id: string): Promise<TemplateResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage templates." };
  const { data: existing } = await supabase.from("templates").select("mandatory,name").eq("id", id).maybeSingle();
  if (existing?.mandatory) return { ok: false, error: "Master templates cannot be deleted." };
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Template Deleted", detail: existing?.name ?? `Template ${id}` });
  return { ok: true };
}
