"use server";

import type { Channel } from "@/lib/types";
import { sendBroadcast, type SendBroadcastResult } from "@/app/(app)/compose/actions";
import { generateCrmReference } from "@/lib/emergency/escalation";

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
  /** Escalation response level (L1 site / L2 regional / L3 major). */
  responseLevel: string;
  /** Critical-incident phase label (Event / Planning / Implementation). */
  phaseLabel: string;
  /** True when the incident meets fan-out criteria (chain notified). */
  fanoutRequired: boolean;
}

/** Result of a fired emergency broadcast, enriched with its CRM reference. */
export interface SendEmergencyResult extends SendBroadcastResult {
  /** CRM-style reference minted for this broadcast (INC-YYYYMMDD-XXXX). */
  reference?: string;
}

// Fire a real emergency broadcast through the same live send path as Compose:
// priority "emergency", the incident's recommended channels, scoped audience.
// Called imperatively from the client console (matches the proven Compose
// pattern — avoids a form POST the auth middleware would intercept). The send
// itself is audit-logged inside sendBroadcast; we enrich the subject with the
// severity + scope so the emergency log and audit detail carry full context.
export async function sendEmergency(input: SendEmergencyInput): Promise<SendEmergencyResult> {
  const message = input.message.trim();
  if (!message) return { ok: false, sent: 0, error: "Enter an emergency message." };

  const channels = input.channels.length ? input.channels : (["email", "sms", "display"] as Channel[]);
  const scopeSuffix = input.scopeLabel ? ` — ${input.scopeLabel}` : "";

  // Mint a CRM-style reference for this broadcast so it can be tracked end-to-end,
  // mirroring the Client Care Centre's "every request gets a reference" model. We
  // prepend it to the subject so it carries into the message record, the emergency
  // log row, and the audit-log detail written by sendBroadcast.
  const reference = generateCrmReference();
  const fanoutTag = input.fanoutRequired ? " · FAN-OUT" : "";

  const result = await sendBroadcast({
    subject: `[${reference}] EMERGENCY [${input.severityLabel} · ${input.responseLevel} · ${input.phaseLabel}${fanoutTag}] ${input.incidentLabel}${scopeSuffix}`,
    body: message,
    channels,
    segments: [input.scopeLabel || "All Residents"],
    priority: "emergency",
    language: "en",
    audienceCount: input.audienceCount || 0,
    delivery: "now",
    scheduledFor: null,
  });

  return { ...result, reference: result.ok ? reference : undefined };
}
