import "server-only";
import { SENDGRID_API_KEY, SENDGRID_FROM, hasSendgrid } from "@/lib/env";

export interface SendgridSend { to: string; subject: string; html: string; text?: string; from?: string }
export interface SendgridResult { ok: boolean; id?: string; mode: "live" | "stub"; error?: string }

/**
 * Send one email via SendGrid's v3 mail/send REST API (no SDK dep) — an alternate
 * provider to Resend with the same {to,subject,html} surface. Activates the moment
 * SENDGRID_API_KEY + SENDGRID_FROM are set; otherwise logs and returns a stub so the
 * broadcast flow (persist + audit) still works end-to-end.
 *
 * SendGrid returns 202 with no body on success; the message id arrives in the
 * `X-Message-Id` response header rather than the payload.
 */
export async function sendSendgridEmail(msg: SendgridSend): Promise<SendgridResult> {
  if (!hasSendgrid) {
    console.log(`[sendgrid:stub] would send "${msg.subject}" → ${msg.to}`);
    return { ok: true, mode: "stub" };
  }
  try {
    const content: { type: string; value: string }[] = [];
    if (msg.text) content.push({ type: "text/plain", value: msg.text });
    content.push({ type: "text/html", value: msg.html });
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: msg.to }] }],
        from: { email: msg.from ?? SENDGRID_FROM },
        subject: msg.subject,
        content,
      }),
    });
    if (!res.ok) return { ok: false, mode: "live", error: `sendgrid ${res.status}` };
    return { ok: true, mode: "live", id: res.headers.get("x-message-id") ?? undefined };
  } catch (e) {
    return { ok: false, mode: "live", error: e instanceof Error ? e.message : "send failed" };
  }
}
