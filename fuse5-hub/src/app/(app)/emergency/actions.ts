"use server";

import type { Channel } from "@/lib/types";
import { sendBroadcast, type SendBroadcastResult } from "@/app/(app)/compose/actions";

export interface SendEmergencyInput {
  incidentId: string;
  incidentLabel: string;
  severity: string;
  severityLabel: string;
  subject: string;
  message: string;
  channels: Channel[];
  /** Human-readable audience scope, e.g. "WoodGreen — Danforth · Floor 3, 4". */
  scopeLabel: string;
  audienceCount: number;
  /** Life-safety / critical rungs bypass quiet hours. */
  overrideQuietHours: boolean;
}

// Fire a real emergency broadcast through the same live send path as Compose:
// priority "emergency", the incident's recommended channels, scoped audience.
// Called imperatively from the client console (matches the proven Compose
// pattern — avoids a form POST the auth middleware would intercept). The send
// itself is audit-logged inside sendBroadcast; we enrich the subject with the
// severity + scope so the emergency log and audit detail carry full context.
export async function sendEmergency(input: SendEmergencyInput): Promise<SendBroadcastResult> {
  const message = input.message.trim();
  if (!message) return { ok: false, sent: 0, error: "Enter an emergency message." };

  const channels = input.channels.length ? input.channels : (["email", "sms", "display"] as Channel[]);
  const scopeSuffix = input.scopeLabel ? ` — ${input.scopeLabel}` : "";

  return sendBroadcast({
    subject: `EMERGENCY [${input.severityLabel}] ${input.incidentLabel}${scopeSuffix}`,
    body: message,
    channels,
    segments: [input.scopeLabel || "All Residents"],
    priority: "emergency",
    language: "en",
    audienceCount: input.audienceCount || 0,
    delivery: "now",
    scheduledFor: null,
  });
}
