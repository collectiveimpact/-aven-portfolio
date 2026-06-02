import "server-only";
import { RESEND_API_KEY, hasEmail } from "@/lib/env";

export interface EmailSend { to: string; subject: string; html: string; from?: string }
export interface EmailResult { ok: boolean; id?: string; mode: "live" | "stub"; error?: string }

const DEFAULT_FROM = "Fuse5 Hub <notifications@fuse5.ca>";

/**
 * Send one email. Provider-agnostic via a Resend-compatible REST call (no SDK dep).
 * Activates the moment RESEND_API_KEY is set; otherwise logs and returns a stub
 * so the rest of the broadcast flow (persist + audit) still works end-to-end.
 * Swap the endpoint here for any provider that takes {from,to,subject,html}.
 */
export async function sendEmail(msg: EmailSend): Promise<EmailResult> {
  if (!hasEmail) {
    console.log(`[email:stub] would send "${msg.subject}" → ${msg.to}`);
    return { ok: true, mode: "stub" };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: msg.from ?? DEFAULT_FROM, to: msg.to, subject: msg.subject, html: msg.html }),
    });
    if (!res.ok) return { ok: false, mode: "live", error: `provider ${res.status}` };
    const data = (await res.json()) as { id?: string };
    return { ok: true, mode: "live", id: data.id };
  } catch (e) {
    return { ok: false, mode: "live", error: e instanceof Error ? e.message : "send failed" };
  }
}
