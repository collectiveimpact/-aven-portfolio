"use server";

import type { Channel } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { generateText } from "@/lib/ai";

// AI authoring for the Compose door (Content Composer). Live with ANTHROPIC_API_KEY, stub otherwise.
export async function aiCompose(prompt: string): Promise<{ ok: boolean; text?: string; mode?: "live" | "stub"; error?: string }> {
  if (!prompt.trim()) return { ok: false, error: "Describe what the message is about." };
  const r = await generateText(prompt);
  return { ok: true, text: r.text, mode: r.mode };
}

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
// Persist an unsent draft (status='draft', no recipients dispatched). Shows up in
// message history and can be re-opened/sent later.
export async function saveDraft(input: SendBroadcastInput): Promise<{ ok: boolean; mode?: "live" | "demo"; error?: string }> {
  if (!input.subject.trim() && !input.body.trim()) return { ok: false, error: "Add a subject or body before saving." };
  const supabase = await createClient();
  if (!supabase) return { ok: true, mode: "demo" };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization for the current user." };

  const { data: msg, error } = await supabase.from("messages").insert({
    org_id: me.orgId,
    subject: input.subject || "(untitled draft)",
    body: input.body,
    channels: input.channels,
    status: "draft",
    priority: input.priority,
    audience_count: input.audienceCount,
    scheduled_for: input.scheduledFor,
    created_by: me.id ?? null,
  }).select("id").single();
  if (error || !msg) return { ok: false, error: error?.message ?? "Could not save draft." };

  await supabase.from("audit_log").insert({ org_id: me.orgId, actor_id: me.id, action: "Draft Saved", detail: `"${input.subject || "(untitled draft)"}" — ${input.channels.join(", ") || "no channel"}` });
  return { ok: true, mode: "live" };
}

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
  if (status === "sent") {
    // Resolve recipients = the org's active tenants, each on their PREFERRED
    // channel (fallback to whatever selected channel they have contact for).
    const { data: residents } = await supabase
      .from("residents")
      .select("id,name,email,phone,preferred_channel")
      .eq("org_id", orgId)
      .eq("status", "active")
      .limit(200);

    const html = `<div>${input.body.replace(/\n/g, "<br/>")}</div>`;
    const want = input.channels;
    for (const r of residents ?? []) {
      const pref = r.preferred_channel as "email" | "sms" | "whatsapp" | null;
      let ch: "email" | "sms" | null = null;
      if ((pref === "sms" || pref === "whatsapp") && want.includes("sms") && r.phone) ch = "sms";
      else if (pref === "email" && want.includes("email") && r.email) ch = "email";
      if (!ch) { // fallback by availability within selected channels
        if (want.includes("email") && r.email) ch = "email";
        else if (want.includes("sms") && r.phone) ch = "sms";
      }
      if (!ch) continue;

      const res = ch === "email"
        ? await sendEmail({ to: r.email as string, subject: input.subject, html })
        : await sendSms(r.phone as string, `${input.subject}: ${input.body}`);
      const ok = res.ok;
      if (ok) sent += 1;
      await supabase.from("message_recipients").insert({
        org_id: orgId, message_id: msg.id, resident_id: r.id, channel: ch, status: ok ? "delivered" : "bounced",
      });
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
