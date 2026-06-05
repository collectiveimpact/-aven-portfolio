"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";

export interface ComplianceInput {
  id?: string;
  propertyId: string | null;
  kind: string;
  due: string; // YYYY-MM-DD
  status: "compliant" | "due_soon" | "overdue";
}
export type ComplianceResult = { ok: boolean; error?: string };

export async function saveCompliance(input: ComplianceInput): Promise<ComplianceResult> {
  if (!input.kind.trim()) return { ok: false, error: "Obligation kind is required." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage compliance." };

  const row = { property_id: input.propertyId || null, kind: input.kind.trim(), due: input.due || null, status: input.status };

  if (input.id) {
    const { error } = await supabase.from("compliance_items").update(row).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Compliance Updated", detail: `${row.kind} (${row.status})` });
  } else {
    const { error } = await supabase.from("compliance_items").insert({ org_id: me.orgId, ...row });
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Compliance Added", detail: `${row.kind} (${row.status})` });
  }
  return { ok: true };
}

export async function deleteCompliance(id: string): Promise<ComplianceResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage compliance." };
  const { error } = await supabase.from("compliance_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Compliance Removed", detail: `Item ${id}` });
  return { ok: true };
}
