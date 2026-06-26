// Shared, pure derivation helpers for the Comms Calendar.
//
// `CalendarRow` is a flat record (id/title/day/channel/status) — it carries no
// explicit event-type or property column. To power the dense Staff schedule and
// the friendly Resident view we derive a best-effort *type* and *property* hint
// from the title + channel using keyword heuristics (the same pattern the
// Content library uses to bucket assets by title prefix). If the schema later
// grows real `type`/`property` columns (see the snippet returned to the
// orchestrator), these heuristics become the graceful fallback.

import type { CalendarRow } from "@/lib/queries";

export type EventType = "broadcast" | "journey" | "survey" | "drill" | "maintenance" | "event";

export const TYPE_META: Record<EventType, { label: string; tint: string; icon: string; blurb: string }> = {
  broadcast: { label: "Broadcast", tint: "var(--f5-blue)", icon: "📣", blurb: "A message going out to residents" },
  journey: { label: "Journey", tint: "var(--f5-teal)", icon: "🧭", blurb: "An automated multi-step sequence" },
  survey: { label: "Survey", tint: "var(--f5-purple)", icon: "📊", blurb: "We'd love your feedback" },
  drill: { label: "Emergency drill", tint: "var(--f5-red)", icon: "🚨", blurb: "A scheduled safety drill" },
  maintenance: { label: "Maintenance", tint: "var(--f5-amber)", icon: "🔧", blurb: "Planned building work" },
  event: { label: "Notice", tint: "var(--f5-green)", icon: "📌", blurb: "Something to know about" },
};

export const TYPE_ORDER: EventType[] = ["broadcast", "journey", "survey", "drill", "maintenance", "event"];

// Channel display metadata, shared by both views.
export const CHANNEL_META: Record<string, { label: string; tint: string; icon: string }> = {
  email: { label: "Email", tint: "var(--f5-teal)", icon: "✉️" },
  sms: { label: "SMS", tint: "var(--f5-green)", icon: "💬" },
  whatsapp: { label: "WhatsApp", tint: "var(--f5-green)", icon: "💚" },
  voice: { label: "Voice", tint: "var(--f5-amber)", icon: "📞" },
  display: { label: "Display", tint: "var(--f5-purple)", icon: "🖥️" },
  multi: { label: "Multi-channel", tint: "var(--f5-blue)", icon: "🔀" },
};
export const channelLabel = (c: string) => CHANNEL_META[c]?.label ?? c;
export const channelTint = (c: string) => CHANNEL_META[c]?.tint ?? "var(--f5-teal)";
export const channelIcon = (c: string) => CHANNEL_META[c]?.icon ?? "•";

export function deriveType(row: Pick<CalendarRow, "title" | "channel">): EventType {
  const t = row.title.toLowerCase();
  if (/\b(drill|evacuat|fire test|alarm test|lockdown)\b/.test(t)) return "drill";
  if (/\b(survey|feedback|poll|questionnaire|satisfaction)\b/.test(t)) return "survey";
  if (/\b(journey|onboard|welcome series|nurture|sequence|reminder series)\b/.test(t)) return "journey";
  if (/\b(maintenance|repair|shutoff|shut-off|inspection|elevator|water|power|cleaning|pest)\b/.test(t)) return "maintenance";
  if (/\b(newsletter|broadcast|announcement|notice|alert|update|bulletin)\b/.test(t)) return "broadcast";
  return "event";
}

// Property hint: pull a "WoodGreen — Danforth" style suffix or a building token
// out of the title if present, else fall back to a portfolio-wide label.
export function deriveProperty(title: string): string {
  const dash = title.split(/[—–-]/);
  if (dash.length > 1) {
    const tail = dash[dash.length - 1].trim();
    if (tail && tail.length <= 28 && /[A-Za-z]/.test(tail) && !/\d{4}/.test(tail)) return tail;
  }
  const m = title.match(/\b(building|block|tower|court|house|gardens|residences?)\s+[A-Z0-9][\w-]*/i);
  if (m) return m[0];
  return "All properties";
}

// Normalise a stored day to YYYY-MM-DD for grid bucketing; "" if unparseable.
export function isoOf(day: string): string {
  if (/^\d{4}-\d{2}-\d{2}/.test(day)) return day.slice(0, 10);
  const d = new Date(day);
  return isNaN(d.getTime()) ? "" : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const WEEKDAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// A friendly, human date like "Fri, Jun 5" (and "· in 3 days" relative hint).
export function friendlyDate(iso: string, today = new Date()): { label: string; rel: string } {
  if (!iso) return { label: "—", rel: "" };
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return { label: iso, rel: "" };
  const label = `${WEEKDAYS_LONG[d.getDay()].slice(0, 3)}, ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}`;
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diff = Math.round((d.getTime() - t0.getTime()) / 86_400_000);
  let rel = "";
  if (diff === 0) rel = "Today";
  else if (diff === 1) rel = "Tomorrow";
  else if (diff > 1 && diff <= 30) rel = `in ${diff} days`;
  else if (diff < 0 && diff >= -30) rel = `${Math.abs(diff)} days ago`;
  return { label, rel };
}

export const statusBadgeClass = (s: string) => (s === "sent" ? "f5-badge ok" : "f5-badge warn");
export const statusLabel = (s: string) => (s === "sent" ? "Sent" : "Scheduled");
