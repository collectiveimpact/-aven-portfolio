import "server-only";
import { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VOICE_FROM, hasVoice } from "@/lib/env";

export interface VoiceCall { to: string; message: string }
export interface VoiceResult { ok: boolean; sid?: string; mode: "live" | "stub"; error?: string }

/** Escape a message for safe inline embedding inside TwiML XML. */
function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Place one programmable voice call via the Twilio Voice API. The call answers
 * with inline TwiML that reads `message` aloud (text-to-speech) — built for
 * emergency callouts where a spoken alert beats a text. Reuses the Twilio account
 * creds; only TWILIO_VOICE_FROM is added. Activates when those are set; otherwise
 * logs and returns a stub so the broadcast flow still works end-to-end.
 */
export async function placeVoiceCall(call: VoiceCall): Promise<VoiceResult> {
  if (!hasVoice) {
    console.log(`[voice:stub] would call ${call.to} saying "${call.message.slice(0, 40)}…"`);
    return { ok: true, mode: "stub" };
  }
  try {
    const twiml = `<Response><Say voice="alice">${xmlEscape(call.message)}</Say></Response>`;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: call.to, From: TWILIO_VOICE_FROM, Twiml: twiml }).toString(),
    });
    if (!res.ok) return { ok: false, mode: "live", error: `twilio ${res.status}` };
    const data = (await res.json()) as { sid?: string };
    return { ok: true, mode: "live", sid: data.sid };
  } catch (e) {
    return { ok: false, mode: "live", error: e instanceof Error ? e.message : "voice call failed" };
  }
}
