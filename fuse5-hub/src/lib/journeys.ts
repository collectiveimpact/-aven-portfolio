// Journey (lifecycle automation) model + housing-native template library.
// Isomorphic — the builder + list render from these types. A journey = a trigger
// + an ordered list of steps (message / delay / one-level conditional split).
// Klaviyo's "flow" idea, pointed at the tenant lifecycle.

export type TriggerType = "segment_join" | "date" | "event" | "manual";
export interface Trigger {
  type: TriggerType;
  label: string;              // human description shown on the trigger card
  segmentId?: string;         // for segment_join
  dateEvent?: string;         // for date: move_in | lease_renewal | inspection
  offsetDays?: number;        // for date: e.g. -60 (60 days before)
  event?: string;             // for event: work_order_opened | notice_published | arrears_flagged
}

export type Channel = "auto" | "email" | "sms" | "display" | "whatsapp";
export type Step =
  | { id: string; type: "message"; channel: Channel; subject: string; body: string }
  | { id: string; type: "delay"; value: number; unit: "hours" | "days" }
  | { id: string; type: "split"; label: string; condition: string; yes: Step[]; no: Step[] };

export interface Journey {
  id: string;
  name: string;
  trigger: Trigger;
  status: "draft" | "active" | "paused";
  steps: Step[];
  enrolled: number;
  updatedAt: string;
}

export const TRIGGER_TYPES: { key: TriggerType; label: string; icon: string; hint: string }[] = [
  { key: "segment_join", label: "Enters a segment", icon: "⊞", hint: "Resident matches a saved segment (e.g. arrears-risk)" },
  { key: "date", label: "Date / milestone", icon: "🗓", hint: "Relative to move-in, lease renewal, or inspection" },
  { key: "event", label: "Event happens", icon: "⚡", hint: "Work order opened, notice published, arrears flagged" },
  { key: "manual", label: "Manual enroll", icon: "👤", hint: "Staff add residents by hand" },
];

export const CHANNEL_LABEL: Record<Channel, string> = { auto: "Preferred channel", email: "Email", sms: "SMS", display: "Display", whatsapp: "WhatsApp" };

let _n = 0;
const sid = () => `s${++_n}`;
const msg = (channel: Channel, subject: string, body: string): Step => ({ id: sid(), type: "message", channel, subject, body });
const wait = (value: number, unit: "hours" | "days"): Step => ({ id: sid(), type: "delay", value, unit });

export interface JourneyTemplate { key: string; name: string; icon: string; description: string; trigger: Trigger; steps: Step[] }

export const JOURNEY_TEMPLATES: JourneyTemplate[] = [
  {
    key: "move-in", name: "Move-in Onboarding", icon: "🔑",
    description: "Welcome new residents over their first two weeks — portal signup, building rules, amenities.",
    trigger: { type: "date", label: "0 days after move-in date", dateEvent: "move_in", offsetDays: 0 },
    steps: [
      msg("email", "Welcome home", "Welcome to your new home! Here's everything you need for your first week."),
      wait(2, "days"),
      msg("auto", "Set up your resident portal", "Activate your portal to view notices, submit requests, and update preferences."),
      wait(5, "days"),
      msg("email", "Building rules & amenities", "A quick guide to amenities, quiet hours, garbage day, and how to reach us."),
    ],
  },
  {
    key: "lease-renewal", name: "Lease Renewal 60-Day", icon: "📜",
    description: "Start the renewal conversation 60 days out; escalate only if they haven't responded.",
    trigger: { type: "date", label: "60 days before lease renewal", dateEvent: "lease_renewal", offsetDays: -60 },
    steps: [
      msg("email", "Your lease renewal is coming up", "Your lease renews soon. Here are your options and next steps."),
      wait(14, "days"),
      { id: sid(), type: "split", label: "Has the resident renewed?", condition: "lease.renewed = true",
        yes: [msg("email", "Thanks for renewing!", "We're glad you're staying. Nothing more to do.")],
        no: [wait(7, "days"), msg("sms", "Renewal reminder", "Friendly reminder: your lease renewal is still pending."), wait(14, "days"), msg("auto", "Final renewal notice", "Final notice — please confirm your renewal to avoid a lapse.")] },
    ],
  },
  {
    key: "arrears", name: "Arrears Escalation", icon: "💳",
    description: "Respectful, staged rent-arrears outreach that stops the moment they pay.",
    trigger: { type: "event", label: "When arrears is flagged", event: "arrears_flagged" },
    steps: [
      msg("email", "Rent reminder", "Your rent appears past due. Please reach out if you need support or a payment plan."),
      wait(5, "days"),
      { id: sid(), type: "split", label: "Has the balance been paid?", condition: "arrears.paid = true",
        yes: [msg("auto", "Payment received — thank you", "We've received your payment. Thank you!")],
        no: [msg("sms", "Past-due notice", "Your balance remains outstanding. Contact the office to avoid escalation."), wait(5, "days"), msg("email", "Account flagged to manager", "Your account has been referred to your property manager. Please call us.")] },
    ],
  },
  {
    key: "maintenance", name: "Maintenance Follow-up", icon: "🔧",
    description: "Acknowledge a work order, then check satisfaction after it's resolved.",
    trigger: { type: "event", label: "When a work order is opened", event: "work_order_opened" },
    steps: [
      msg("sms", "We're on it", "We've received your maintenance request and a technician is scheduled."),
      wait(3, "days"),
      msg("email", "How did we do?", "Your request should be resolved. A quick 1-tap survey: were you satisfied?"),
    ],
  },
  {
    key: "inspection", name: "Inspection Prep", icon: "🛡",
    description: "Multi-channel run-up to a scheduled inspection so units are ready.",
    trigger: { type: "date", label: "7 days before inspection", dateEvent: "inspection", offsetDays: -7 },
    steps: [
      msg("email", "Upcoming inspection — please prepare", "An inspection is scheduled. Here's how to prepare your unit and what inspectors check."),
      wait(5, "days"),
      msg("sms", "Inspection in 2 days", "Reminder: your unit inspection is in 2 days. Please ensure access."),
      wait(2, "days"),
      msg("display", "Inspection today", "Building inspection in progress today. Thank you for your cooperation."),
    ],
  },
  {
    key: "re-engagement", name: "Re-engagement", icon: "📣",
    description: "Win back residents who've stopped opening notices by switching channel.",
    trigger: { type: "segment_join", label: "Enters the Low-engagement segment", segmentId: "" },
    steps: [
      msg("sms", "Are our notices reaching you?", "We noticed you haven't opened recent notices. Reply STOP to opt out or tap to update preferences."),
      wait(7, "days"),
      { id: sid(), type: "split", label: "Engaged in the last 7 days?", condition: "engagement.recent = true",
        yes: [msg("auto", "Glad you're back", "Thanks for reconnecting — you're all set.")],
        no: [msg("email", "Let's fix how we reach you", "Update your preferred channel so you never miss an important building notice.")] },
    ],
  },
];

// Stable id generator for builder-added steps (client-side).
export const newStepId = () => `s${Math.floor(performance.now() % 1e9)}_${Math.floor(Math.random() * 1e6)}`;
