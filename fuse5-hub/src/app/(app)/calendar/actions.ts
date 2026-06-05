"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";

export interface CalendarEventInput {
  id?: string;
  title: string;
  day: string; // YYYY-MM-DD
  channel: string;
  status: string;
}
export type CalendarResult = { ok: boolean; error?: string };

export async function saveEvent(input: CalendarEventInput): Promise<CalendarResult> {
  if (!input.title.trim()) return { ok: false, error: "Event title is required." };
  if (!input.day) return { ok: false, error: "A date is required." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage the calendar." };

  const row = { title: input.title.trim(), day: input.day, channel: input.channel || "multi", status: input.status || "scheduled" };

  if (input.id) {
    const { error } = await supabase.from("calendar_events").update(row).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Calendar Event Updated", detail: `${row.title} — ${row.day}` });
  } else {
    const { error } = await supabase.from("calendar_events").insert({ org_id: me.orgId, ...row });
    if (error) return { ok: false, error: error.message };
    await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Calendar Event Created", detail: `${row.title} — ${row.day}` });
  }
  return { ok: true };
}

export async function deleteEvent(id: string): Promise<CalendarResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot manage the calendar." };
  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Calendar Event Deleted", detail: `Event ${id}` });
  return { ok: true };
}
