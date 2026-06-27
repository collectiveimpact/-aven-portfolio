import "server-only";
import { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, hasWhatsApp } from "@/lib/env";

export interface WhatsAppSend { to: string; body: string; mediaUrl?: string }
export interface WhatsAppResult { ok: boolean; sid?: string; mode: "live" | "stub"; error?: string }

/** Ensure a number carries the Twilio `whatsapp:` channel prefix exactly once. */
function wa(addr: string): string {
  return addr.startsWith("whatsapp:") ? addr : `whatsapp:${addr}`;
}

/**
 * Send one WhatsApp message via the Twilio Messages API (same endpoint as SMS,
 * with `whatsapp:` channel prefixes on From/To). Reuses the Twilio account creds;
 * only TWILIO_WHATSAPP_FROM is added. Activates when those are set; otherwise logs
 * and returns a stub so the broadcast flow (persist + audit + per-channel counts)
 * still works end-to-end.
 *
 * Go-live note: beyond A2P 10DLC, WhatsApp requires Meta/Twilio-approved message
 * TEMPLATES for business-initiated (out-of-session) sends. Freeform text only
 * delivers inside an open 24h customer-service window.
 */
export async function sendWhatsApp(msg: WhatsAppSend): Promise<WhatsAppResult> {
  if (!hasWhatsApp) {
    console.log(`[whatsapp:stub] would send "${msg.body.slice(0, 40)}…" → ${msg.to}`);
    return { ok: true, mode: "stub" };
  }
  try {
    const params: Record<string, string> = { To: wa(msg.to), From: wa(TWILIO_WHATSAPP_FROM), Body: msg.body };
    if (msg.mediaUrl) params.MediaUrl = msg.mediaUrl;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(params).toString(),
    });
    if (!res.ok) return { ok: false, mode: "live", error: `twilio ${res.status}` };
    const data = (await res.json()) as { sid?: string };
    return { ok: true, mode: "live", sid: data.sid };
  } catch (e) {
    return { ok: false, mode: "live", error: e instanceof Error ? e.message : "whatsapp failed" };
  }
}
