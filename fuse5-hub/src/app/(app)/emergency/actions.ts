"use server";

import { sendBroadcast, type SendBroadcastResult } from "@/app/(app)/compose/actions";

// Fire a real emergency broadcast through the same live send path as Compose:
// priority "emergency", all channels, full audience. Called imperatively from
// the client console (matches the proven Compose pattern — avoids a form POST
// that the auth middleware would intercept).
export async function sendEmergency(input: { type: string; message: string }): Promise<SendBroadcastResult> {
  const message = input.message.trim();
  if (!message) return { ok: false, sent: 0, error: "Enter an emergency message." };

  return sendBroadcast({
    subject: `EMERGENCY: ${input.type}`,
    body: message,
    channels: ["email", "sms", "whatsapp", "voice", "display"],
    segments: ["All Residents"],
    priority: "emergency",
    language: "en",
    audienceCount: 2847,
    delivery: "now",
    scheduledFor: null,
  });
}
