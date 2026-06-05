"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";

export interface ResidentInput {
  id?: string;
  propertyId: string | null;
  unit: string;
  name: string;
  email: string;
  phone: string;
  language: string;
  preferredChannel: string;
  status: "active" | "moved_out";
}
export type SaveResult = { ok: boolean; error?: string };

// Create or update a resident. RLS scopes the row to the caller's org; we also
// gate in-app so the UI never offers a write the DB policy would reject.
export async function saveResident(input: ResidentInput): Promise<SaveResult> {
  if (!input.name.trim()) return { ok: false, error: "Name is required." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage residents." };

  const row = {
    property_id: input.propertyId || null,
    unit: input.unit.trim() || null,
    name: input.name.trim(),
    email: input.email.trim() || null,
    phone: input.phone.trim() || null,
    language: input.language.trim() || null,
    preferred_channel: input.preferredChannel || "email",
    status: input.status,
  };

  if (input.id) {
    const { error } = await supabase.from("residents").update(row).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Resident Updated", detail: `${row.name} — unit ${row.unit ?? "—"}` });
  } else {
    const { error } = await supabase.from("residents").insert({ org_id: me.orgId, ...row });
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Resident Added", detail: `${row.name} — unit ${row.unit ?? "—"}` });
  }
  return { ok: true };
}

export async function deleteResident(id: string): Promise<SaveResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage residents." };
  const { error } = await supabase.from("residents").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Resident Removed", detail: `Resident ${id}` });
  return { ok: true };
}
