"use server";

import type { Channel } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { dispatchMessage } from "@/lib/comms-dispatch";
import type { ChannelKey } from "@/lib/queries";
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
    // "display" is a screen-level channel (pushed via the Wallboard feed), not a
    // per-resident send — exclude it from the recipient loop.
    const want = (input.channels as string[]).filter((c) => c !== "display");
    const hasContact = (c: string, r: { email: unknown; phone: unknown }) =>
      c === "email" ? Boolean(r.email) : (c === "sms" || c === "whatsapp" || c === "voice") ? Boolean(r.phone) : false;
    for (const r of residents ?? []) {
      const pref = r.preferred_channel as string | null;
      // Prefer the resident's channel when it's selected + reachable; else the
      // first selected channel we can actually deliver on.
      const ch = pref && want.includes(pref) && hasContact(pref, r) ? pref : want.find((c) => hasContact(c, r)) ?? null;
      if (!ch) continue;
      const to = (ch === "email" ? r.email : r.phone) as string;
      const res = await dispatchMessage({
        channel: ch as ChannelKey,
        to,
        subject: input.subject,
        body: ch === "email" ? html : `${input.subject}: ${input.body}`,
      });
      if (res.ok) sent += 1;
      await supabase.from("message_recipients").insert({
        org_id: orgId, message_id: msg.id, resident_id: r.id, channel: ch, status: res.ok ? "delivered" : "bounced",
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
