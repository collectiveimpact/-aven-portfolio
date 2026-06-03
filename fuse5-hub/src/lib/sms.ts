import "server-only";
import { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM, hasSms } from "@/lib/env";

export interface SmsResult { ok: boolean; sid?: string; mode: "live" | "stub"; error?: string }

/**
 * Send one SMS (and the same path covers voice via Twilio if extended).
 * Activates when TWILIO_* env is set; otherwise logs and returns a stub so the
 * broadcast flow (persist + audit + per-channel counts) works end-to-end.
 */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  if (!hasSms) {
    console.log(`[sms:stub] would text "${body.slice(0, 40)}…" → ${to}`);
    return { ok: true, mode: "stub" };
  }
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body }).toString(),
    });
    if (!res.ok) return { ok: false, mode: "live", error: `twilio ${res.status}` };
    const data = (await res.json()) as { sid?: string };
    return { ok: true, mode: "live", sid: data.sid };
  } catch (e) {
    return { ok: false, mode: "live", error: e instanceof Error ? e.message : "sms failed" };
  }
}
