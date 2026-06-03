import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_API_KEY, hasAI } from "@/lib/env";

export interface NoticeFacts {
  operationTitle: string;
  dateTime: string;
  contactInfo: string;
  affected: string;
  callToAction: string;
}
export interface Draft { channel: "email" | "sms" | "display"; subject: string; body: string }
export interface GenerateResult { drafts: Draft[]; mode: "live" | "stub" }

// Generate per-channel notice drafts from structured work-order facts.
// Live via Claude (Content Composer) when ANTHROPIC_API_KEY is set; otherwise a
// deterministic stub so the whole pipeline works without a key.
export async function generateDrafts(facts: NoticeFacts, channels: string[]): Promise<GenerateResult> {
  const want = channels.filter((c) => c === "email" || c === "sms" || c === "display") as Draft["channel"][];
  const chans = want.length ? want : (["email", "sms", "display"] as Draft["channel"][]);

  if (!hasAI) return { drafts: chans.map((c) => stubDraft(c, facts)), mode: "stub" };

  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const sys = "You are Fuse5's Content Composer for housing-provider tenant notices. " +
      "Write clear, compliant, plain-language notices. Return ONLY JSON.";
    const prompt = `Generate tenant-notice drafts for these channels: ${chans.join(", ")}.
Facts:
- Operation: ${facts.operationTitle}
- Date/Time: ${facts.dateTime}
- Affected: ${facts.affected}
- Contact: ${facts.contactInfo}
- Call to action: ${facts.callToAction}

Return JSON exactly: {"drafts":[{"channel":"email","subject":"...","body":"..."},{"channel":"sms","subject":"","body":"..."},{"channel":"display","subject":"","body":"..."}]}
Email: full + courteous. SMS: <=320 chars, no subject. Display: <=140 chars, headline style.`;
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 900,
      system: sys, messages: [{ role: "user", content: prompt }],
    });
    const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("");
    const json = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1)) as { drafts: Draft[] };
    const drafts = (json.drafts ?? []).filter((d) => chans.includes(d.channel));
    return { drafts: drafts.length ? drafts : chans.map((c) => stubDraft(c, facts)), mode: "live" };
  } catch {
    return { drafts: chans.map((c) => stubDraft(c, facts)), mode: "stub" };
  }
}

// Freeform single-message generation for the Compose broadcast door.
export async function generateText(prompt: string): Promise<{ text: string; mode: "live" | "stub" }> {
  const stub = `Dear Resident,\n\nWe're writing to let you know about ${prompt.trim()}.\n\n[Add any specifics here — dates, units affected, what to do.]\n\nThank you,\nProperty Management`;
  if (!hasAI) return { text: stub, mode: "stub" };
  try {
    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6", max_tokens: 600,
      system: "You are Fuse5's Content Composer for housing-provider tenant communications. Write a clear, courteous, plain-language broadcast message ready to send. No preamble.",
      messages: [{ role: "user", content: `Write a tenant broadcast message about: ${prompt}` }],
    });
    const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === "text").map((b) => b.text).join("").trim();
    return { text: text || stub, mode: "live" };
  } catch {
    return { text: stub, mode: "stub" };
  }
}

function stubDraft(channel: Draft["channel"], f: NoticeFacts): Draft {
  if (channel === "sms") {
    return { channel, subject: "", body: `${f.operationTitle}: ${f.dateTime}. Affected: ${f.affected}. ${f.callToAction} Questions: ${f.contactInfo}` };
  }
  if (channel === "display") {
    return { channel, subject: "", body: `${f.operationTitle.toUpperCase()} — ${f.dateTime}. ${f.callToAction}` };
  }
  return {
    channel: "email",
    subject: f.operationTitle,
    body: `Dear Resident,\n\nPlease be advised: ${f.operationTitle}.\n\nWhen: ${f.dateTime}\nWho is affected: ${f.affected}\n\n${f.callToAction}\n\nFor questions, contact ${f.contactInfo}.\n\nThank you,\nProperty Management`,
  };
}
