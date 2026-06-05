"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";

export interface PropertyInput {
  id?: string;
  name: string;
  address: string;
  type: string;
  units: number;
  managerName: string;
  managerEmail: string;
  managerPhone: string;
}
export type SaveResult = { ok: boolean; error?: string };

export async function saveProperty(input: PropertyInput): Promise<SaveResult> {
  if (!input.name.trim()) return { ok: false, error: "Property name is required." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage properties." };

  const row = {
    name: input.name.trim(),
    address: input.address.trim() || null,
    type: input.type.trim() || "residential",
    units: Number.isFinite(input.units) && input.units > 0 ? Math.floor(input.units) : 0,
    manager_name: input.managerName.trim() || null,
    manager_email: input.managerEmail.trim() || null,
    manager_phone: input.managerPhone.trim() || null,
  };

  if (input.id) {
    const { error } = await supabase.from("properties").update(row).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Property Updated", detail: row.name });
  } else {
    const { error } = await supabase.from("properties").insert({ org_id: me.orgId, ...row });
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Property Added", detail: row.name });
  }
  return { ok: true };
}

export async function deleteProperty(id: string): Promise<SaveResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage properties." };
  const { error } = await supabase.from("properties").delete().eq("id", id);
  // residents/work_orders FK is ON DELETE SET NULL, so this unassigns rather than blocks.
  if (error) return { ok: false, error: error.code === "23503" ? "Property is still referenced and cannot be removed." : error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Property Removed", detail: `Property ${id}` });
  return { ok: true };
}
