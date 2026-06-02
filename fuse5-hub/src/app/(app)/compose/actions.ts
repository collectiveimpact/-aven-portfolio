"use server";

import type { Channel } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export interface SendBroadcastInput {
  subject: string;
  body: string;
  channels: Channel[];
  segments: string[];
  priority: "normal" | "high" | "emergency";
  language: string;
  audienceCount: number;
  delivery: "now" | "schedule";
  scheduledFor: string | null;
}

export interface SendBroadcastResult {
  ok: boolean;
  sent: number;
  mode?: "live" | "demo";
  error?: string;
}

// Send a real broadcast: persist Message + MessageRecipient rows, write an audit
// entry, and dispatch email via the provider adapter (live when RESEND_API_KEY is
// set, safe stub otherwise). Falls back to a demo result when no backend.
export async function sendBroadcast(input: SendBroadcastInput): Promise<SendBroadcastResult> {
  if (!input.subject.trim() || !input.body.trim()) {
    return { ok: false, sent: 0, error: "Subject and body are required." };
  }
  if (input.channels.length === 0) {
    return { ok: false, sent: 0, error: "Select at least one channel." };
  }

  const supabase = await createClient();
  if (!supabase) {
    return { ok: true, sent: input.audienceCount, mode: "demo" };
  }

  const me = await getCurrentUser();
  const orgId = me?.orgId;
  if (!orgId) return { ok: false, sent: 0, error: "No organization for the current user." };

  const status = input.delivery === "schedule" ? "scheduled" : "sent";
  const { data: msg, error: msgErr } = await supabase
    .from("messages")
    .insert({
      org_id: orgId,
      subject: input.subject,
      body: input.body,
      channels: input.channels,
      status,
      priority: input.priority,
      audience_count: input.audienceCount,
      scheduled_for: input.scheduledFor,
      created_by: me?.id ?? null,
    })
    .select("id")
    .single();
  if (msgErr || !msg) return { ok: false, sent: 0, error: msgErr?.message ?? "Could not save message." };

  let sent = 0;
  if (input.channels.includes("email") && status === "sent") {
    // Cap recipients per call as a safety rail for the demo data set.
    const { data: residents } = await supabase
      .from("residents")
      .select("id,email,name")
      .eq("org_id", orgId)
      .not("email", "is", null)
      .limit(50);

    const html = `<div>${input.body.replace(/\n/g, "<br/>")}</div>`;
    for (const r of residents ?? []) {
      await supabase.from("message_recipients").insert({
        org_id: orgId, message_id: msg.id, resident_id: r.id, channel: "email", status: "queued",
      });
      if (r.email) {
        const res = await sendEmail({ to: r.email, subject: input.subject, html });
        if (res.ok) sent += 1;
      }
    }
  } else {
    sent = input.audienceCount;
  }

  await supabase.from("audit_log").insert({
    org_id: orgId,
    actor_id: me?.id ?? null,
    action: input.priority === "emergency" ? "Emergency Broadcast" : "Broadcast",
    detail: `"${input.subject}" via ${input.channels.join(", ")} — ${sent} recipients`,
  });

  return { ok: true, sent, mode: "live" };
}
