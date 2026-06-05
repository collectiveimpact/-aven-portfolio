"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";

export interface ContactInput {
  id?: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  property: string;
}
export type SaveResult = { ok: boolean; error?: string };

export async function saveContact(input: ContactInput): Promise<SaveResult> {
  if (!input.name.trim()) return { ok: false, error: "Name is required." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage contacts." };

  const row = {
    name: input.name.trim(),
    role: input.role.trim() || null,
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
    property: input.property.trim() || null,
  };

  if (input.id) {
    const { error } = await supabase.from("contacts").update(row).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Contact Updated", detail: `${row.name}${row.role ? ` — ${row.role}` : ""}` });
  } else {
    const { error } = await supabase.from("contacts").insert({ org_id: me.orgId, ...row });
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Contact Added", detail: `${row.name}${row.role ? ` — ${row.role}` : ""}` });
  }
  return { ok: true };
}

export async function deleteContact(id: string): Promise<SaveResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage contacts." };
  const { error } = await supabase.from("contacts").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Contact Removed", detail: `Contact ${id}` });
  return { ok: true };
}
