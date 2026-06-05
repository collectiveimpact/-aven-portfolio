"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";

export type InboxResult = { ok: boolean; error?: string; mode?: "live" | "stub" };

type ResidentContact = { name: string; email: string | null; phone: string | null; preferred_channel: string | null };

// Reply to an inbound message via the resident's channel (email/SMS adapter,
// stub-safe until provider keys are set), log it, and move the thread to "awaiting".
export async function replyToInbound(id: string, body: string): Promise<InboxResult> {
  if (!body.trim()) return { ok: false, error: "Reply cannot be empty." };

  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot reply to residents." };

  const { data: msg } = await supabase
    .from("inbound_messages")
    .select("channel,subject,resident_id,residents(name,email,phone,preferred_channel)")
    .eq("id", id)
    .maybeSingle();
  if (!msg) return { ok: false, error: "Message not found." };

  const r = msg.residents as ResidentContact | ResidentContact[] | null;
  const res = Array.isArray(r) ? r[0] : r;

  // Reply on the channel they wrote in when we can; else fall back to what we have.
  let channel: "email" | "sms" = msg.channel === "email" ? "email" : "sms";
  if (channel === "email" && !res?.email) channel = res?.phone ? "sms" : "email";
  if (channel === "sms" && !res?.phone) channel = res?.email ? "email" : "sms";

  let mode: "live" | "stub" = "stub";
  if (channel === "email" && res?.email) {
    const out = await sendEmail({ to: res.email, subject: msg.subject ? `Re: ${msg.subject}` : "Reply from your housing provider", html: `<div>${body.replace(/\n/g, "<br/>")}</div>` });
    if (!out.ok) return { ok: false, error: out.error ?? "Email send failed." };
    mode = out.mode;
  } else if (channel === "sms" && res?.phone) {
    const out = await sendSms(res.phone, body);
    if (!out.ok) return { ok: false, error: out.error ?? "SMS send failed." };
    mode = out.mode;
  } else {
    return { ok: false, error: "No contact method on file for this resident." };
  }

  await supabase.from("inbound_messages").update({ status: "awaiting" }).eq("id", id);
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Inbox Reply", detail: `Replied to ${res?.name ?? "resident"} via ${channel} (${mode})` });
  return { ok: true, mode };
}

export async function resolveInbound(id: string): Promise<InboxResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend configured." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canPublish(me.role)) return { ok: false, error: "Your role cannot resolve messages." };
  const { error } = await supabase.from("inbound_messages").update({ status: "resolved" }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Inbox Resolved", detail: `Message ${id}` });
  return { ok: true };
}
