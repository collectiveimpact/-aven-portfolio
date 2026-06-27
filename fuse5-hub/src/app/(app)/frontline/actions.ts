"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { hasYardiMcp } from "@/lib/env";
import { createWorkOrder as createYardiWorkOrder } from "@/lib/yardi/mcp";

export interface FrontlineWOInput {
  title: string;
  propertyId: string | null;
  unit: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  description: string;
}
export type SubmitResult = { ok: boolean; woId?: string; error?: string };

// Simplified maintenance-request submission for frontline staff. Inserts a basic
// open work order (no notice/drafts). Frontline insert is permitted by the 0011
// RLS policy; publisher-tier + property managers can also submit.
export async function submitWorkOrder(input: FrontlineWOInput): Promise<SubmitResult> {
  if (!input.title.trim()) return { ok: false, error: "Describe the issue (title) first." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };
  const allowed = me.role && (canPublish(me.role) || me.role === "frontline" || me.role === "property_manager");
  if (!allowed) return { ok: false, error: "Your role cannot submit work orders." };

  const note: Record<string, unknown> = input.description.trim() ? { description: input.description.trim() } : {};
  const { data, error } = await supabase.from("work_orders").insert({
    org_id: me.orgId,
    property_id: input.propertyId || null,
    unit: input.unit.trim() || null,
    title: input.title.trim(),
    category: input.category || "Maintenance",
    priority: input.priority,
    status: "open",
    channels: [],
    notice_status: "none",
    notice: note,
  }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not submit the request." };

  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Work Order Submitted", detail: `"${input.title.trim()}" — ${input.priority}${input.unit ? ` · unit ${input.unit}` : ""}` });

  // Best-effort mirror to Yardi via the Virtuoso MCP when configured. Never blocks
  // or fails the local insert — the local work order is the source of truth. When a
  // Yardi WO id comes back, store it on the row (in the `notice` jsonb) so the queue
  // can show "synced to Yardi" and later mark-complete can target it.
  if (hasYardiMcp && (input.propertyId || input.unit.trim())) {
    try {
      let propertyName = "";
      if (input.propertyId) {
        const { data: prop } = await supabase.from("properties").select("name").eq("id", input.propertyId).single();
        propertyName = (prop as { name?: string } | null)?.name ?? "";
      }
      const yardi = await createYardiWorkOrder({
        property: propertyName || input.propertyId || "",
        unit: input.unit.trim() || undefined,
        category: input.category || "Maintenance",
        description: input.description.trim() || input.title.trim(),
        priority: input.priority,
      });
      if (yardi.ok && yardi.data?.id && yardi.mode === "live") {
        await supabase.from("work_orders").update({ notice: { ...note, yardiWorkOrderId: yardi.data.id } }).eq("id", data.id);
        await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Work Order Synced to Yardi", detail: `${data.id} → Yardi ${yardi.data.id}` });
      }
    } catch {
      // swallow — Yardi mirror is best-effort; the local WO already exists.
    }
  }

  return { ok: true, woId: data.id };
}
