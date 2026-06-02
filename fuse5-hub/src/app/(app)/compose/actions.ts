"use server";

import type { Channel } from "@/lib/types";

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
  error?: string;
}

// Server action invoked from composer.tsx (a client component).
// In the real app this fans out to the email/SMS/WhatsApp/display providers
// and writes a Message + MessageRecipient rows. Here it returns a stub.
export async function sendBroadcast(input: SendBroadcastInput): Promise<SendBroadcastResult> {
  if (!input.subject.trim() || !input.body.trim()) {
    return { ok: false, sent: 0, error: "Subject and body are required." };
  }
  if (input.channels.length === 0) {
    return { ok: false, sent: 0, error: "Select at least one channel." };
  }

  // TODO: real provider send — dispatch to email/SMS/WhatsApp/display vendors,
  // persist Message + MessageRecipient rows, and queue delivery.
  const sent = input.audienceCount;
  return { ok: true, sent };
}
