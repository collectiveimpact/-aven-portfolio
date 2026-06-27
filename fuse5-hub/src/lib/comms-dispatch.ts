import "server-only";
import type { ChannelKey } from "@/lib/queries";
import { hasEmail, hasSendgrid } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { sendSendgridEmail } from "@/lib/sendgrid";
import { sendSms } from "@/lib/sms";
import { sendWhatsApp } from "@/lib/whatsapp";
import { placeVoiceCall } from "@/lib/voice";

/**
 * Unified comms dispatcher — the single place a broadcast routes a message to the
 * right provider adapter per channel. Pure adapter layer: no DB, no React, no
 * auth. Callers own persistence + audit; this just sends and reports back.
 *
 * Routing:
 *   email    → Resend (sendEmail); falls back to SendGrid when Resend is not
 *              configured but SendGrid is.
 *   sms      → Twilio SMS (sendSms)
 *   whatsapp → Twilio WhatsApp (sendWhatsApp)
 *   voice    → Twilio Voice / TTS callout (placeVoiceCall)
 *   display  → no-op stub (digital signage is push-to-screen, not a per-recipient
 *              send; the Displays/Wallboard sync owns that surface).
 *
 * Every adapter is credential-gated and returns mode:"stub" when its provider is
 * unconfigured, so the whole flow stays demoable with zero secrets.
 *
 * GO-LIVE GATES (the dispatcher will happily "send" in stub mode before these,
 * but real delivery on US traffic depends on them):
 *   - A2P 10DLC registration is the real go-live gate for SMS *and* WhatsApp.
 *     Unregistered traffic is carrier-filtered. Surface env.A2P_10DLC_STATUS.
 *   - WhatsApp additionally needs Meta/Twilio-approved message TEMPLATES for
 *     business-initiated sends outside the 24h customer-service window.
 */

export interface DispatchInput {
  channel: ChannelKey;
  to: string;
  subject?: string;
  body: string;
  mediaUrl?: string;
}

export interface DispatchResult {
  channel: ChannelKey;
  /** Which adapter actually handled it (email can resolve to resend|sendgrid). */
  provider: "resend" | "sendgrid" | "twilio-sms" | "twilio-whatsapp" | "twilio-voice" | "display" | "none";
  ok: boolean;
  /** Provider message id/sid when available. */
  id?: string;
  /** "live" when a provider was called, "stub" when credential-gated / no-op. */
  mode: "live" | "stub";
  error?: string;
}

/** Route one message to the correct adapter for its channel. */
export async function dispatchMessage(input: DispatchInput): Promise<DispatchResult> {
  const { channel, to, subject, body, mediaUrl } = input;

  switch (channel) {
    case "email": {
      const subj = subject ?? "";
      // Prefer Resend; fall back to SendGrid only when Resend is not configured.
      if (!hasEmail && hasSendgrid) {
        const r = await sendSendgridEmail({ to, subject: subj, html: body, text: body });
        return { channel, provider: "sendgrid", ok: r.ok, id: r.id, mode: r.mode, error: r.error };
      }
      const r = await sendEmail({ to, subject: subj, html: body });
      return { channel, provider: "resend", ok: r.ok, id: r.id, mode: r.mode, error: r.error };
    }
    case "sms": {
      const r = await sendSms(to, body);
      return { channel, provider: "twilio-sms", ok: r.ok, id: r.sid, mode: r.mode, error: r.error };
    }
    case "whatsapp": {
      const r = await sendWhatsApp({ to, body, mediaUrl });
      return { channel, provider: "twilio-whatsapp", ok: r.ok, id: r.sid, mode: r.mode, error: r.error };
    }
    case "voice": {
      const r = await placeVoiceCall({ to, message: body });
      return { channel, provider: "twilio-voice", ok: r.ok, id: r.sid, mode: r.mode, error: r.error };
    }
    case "display": {
      // Digital signage is published to screens by the Displays/Wallboard sync,
      // not sent per-recipient. No-op so a "display" channel in a broadcast is
      // counted without erroring.
      console.log(`[display:stub] no per-recipient send; signage is push-to-screen`);
      return { channel, provider: "display", ok: true, mode: "stub" };
    }
    default: {
      // Exhaustiveness guard: a new ChannelKey must be handled above.
      const _never: never = channel;
      return { channel: _never, provider: "none", ok: false, mode: "stub", error: "unknown channel" };
    }
  }
}
