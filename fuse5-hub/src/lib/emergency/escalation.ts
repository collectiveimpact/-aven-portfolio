// Housing crisis-escalation playbook — the static spine that layers a real
// critical-incident response process on top of the Emergency broadcast catalog.
//
// Sourced from two operational documents:
//   • Critical Incident Response SOP 07-01 (Toronto Community Housing / CSU)
//   • Client Care Information (Draft) — the 24/7 Client Care Centre + CRM model
//
// What lives here:
//   - RESPONSE_LEVELS   the L1 / L2 / L3 escalation ladder (definition + who's engaged)
//   - INCIDENT_PHASES   Phase 1 Event → Phase 2 Planning → Phase 3 Implementation
//   - FANOUT_CRITERIA   the 3 trigger categories that force a fan-out
//   - ESCALATION_CHAIN  the ordered role chain and who each role notifies
//   - CRM reference helpers (INC-YYYYMMDD-XXXX) for the Client Care fan-out loop
//
// Everything is plain typed data — no DB, no side effects. The UI reads it to
// drive a Response Level selector, a Phase indicator, and the fan-out flag.

import type { SeverityId } from "./catalog";

/* ------------------------------------------------------------------ */
/* Response levels — the L1 / L2 / L3 escalation ladder                 */
/* ------------------------------------------------------------------ */

export type ResponseLevelId = "L1" | "L2" | "L3";

export interface ResponseLevel {
  id: ResponseLevelId;
  label: string;
  /** Short qualifier shown next to the label. */
  tagline: string;
  /** Operator-facing definition pulled from the SOP. */
  definition: string;
  /** Who is engaged / mobilized at this level. */
  engaged: string[];
  /** Whether activation of the Emergency Response Plan / Team is in play. */
  ertPosture: string;
  /** CSS token used for the level badge accent. */
  colorToken: string;
}

export const RESPONSE_LEVELS: ResponseLevel[] = [
  {
    id: "L1",
    label: "Level 1 — Site",
    tagline: "Local resources",
    definition:
      "Activities and resources used to address the incident at site level with local resources, which may include the Toronto Police Service. No need to activate the Emergency Response Team or solicit City of Toronto resources.",
    engaged: [
      "Site staff & Special Constables",
      "Local resources",
      "Toronto Police Service (as needed)",
    ],
    ertPosture: "Emergency Response Team NOT activated.",
    colorToken: "var(--f5-amber)",
  },
  {
    id: "L2",
    label: "Level 2 — Regional",
    tagline: "Exceeds combined resources",
    definition:
      "Emergency events that exceed TCHC and Toronto Police Service combined operational resources and require additional support services, particularly from the City of Toronto.",
    engaged: [
      "All Level 1 resources",
      "Additional City of Toronto support services",
      "Resident Access & Support",
    ],
    ertPosture:
      "Emergency Response Team activation is an option, at the discretion of the CEO or designate on advice of the Chief Special Constable.",
    colorToken: "var(--f5-red)",
  },
  {
    id: "L3",
    label: "Level 3 — Major",
    tagline: "Population-scale / prolonged",
    definition:
      "An emergency that may affect a significant portion of the population, may continue for a long period of time, and may require an extensive recovery period.",
    engaged: [
      "All Level 2 resources",
      "Multi-agency / external agencies",
      "Community Crisis Response Program (CCRP)",
      "Extended recovery support",
    ],
    ertPosture: "Emergency Response Plan activated; extended recovery period expected.",
    colorToken: "var(--f5-red)",
  },
];

export const RESPONSE_LEVEL_BY_ID: Record<ResponseLevelId, ResponseLevel> =
  Object.fromEntries(RESPONSE_LEVELS.map((l) => [l.id, l])) as Record<
    ResponseLevelId,
    ResponseLevel
  >;

/* ------------------------------------------------------------------ */
/* Incident phases — Event → Planning → Implementation                  */
/* ------------------------------------------------------------------ */

export type PhaseId = "event" | "planning" | "implementation";

export interface IncidentPhase {
  id: PhaseId;
  /** Display number (1/2/3) for the stepper. */
  num: 1 | 2 | 3;
  label: string;
  /** Typical elapsed-time window from the SOP. */
  window: string;
  /** What is happening during this phase. */
  whatHappens: string;
  /** The headline activity for the operator. */
  focus: string;
}

export const INCIDENT_PHASES: IncidentPhase[] = [
  {
    id: "event",
    num: 1,
    label: "Phase 1 — Event",
    window: "0–12 hours",
    whatHappens:
      "The location is an active crime scene under the control of emergency-services providers, generally up to 12 hours from the time of the incident.",
    focus: "Active scene control, life-safety, security perimeter, dispatch & fan-out.",
  },
  {
    id: "planning",
    num: 2,
    label: "Phase 2 — Planning",
    window: "12–24 hours",
    whatHappens:
      "The active scene has been released by police, the governing authority and/or coroner — generally 12 to 24 hours after the incident.",
    focus: "Inter-divisional planning meeting; identify immediate actions to be taken.",
  },
  {
    id: "implementation",
    num: 3,
    label: "Phase 3 — Implementation",
    window: "24–72 hours",
    whatHappens:
      "Community resources are mobilized, if required, to stabilize the community — generally within 24 to 72 hours after the incident.",
    focus: "Mobilize community supports; stabilize the community; recovery.",
  },
];

export const INCIDENT_PHASE_BY_ID: Record<PhaseId, IncidentPhase> =
  Object.fromEntries(INCIDENT_PHASES.map((p) => [p.id, p])) as Record<
    PhaseId,
    IncidentPhase
  >;

/* ------------------------------------------------------------------ */
/* Fan-out criteria — the 3 trigger categories                          */
/* ------------------------------------------------------------------ */

export type FanoutCriterionId = "violent_act" | "traumatic_incident" | "loss_of_life";

export interface FanoutCriterion {
  id: FanoutCriterionId;
  label: string;
  /** Examples that fall under this category, for operator guidance. */
  examples: string;
}

// The SOP's three fan-out trigger categories. If a reported incident meets ANY
// of these, the on-duty Sergeant / Staff Sergeant must initiate a formatted fan-out.
export const FANOUT_CRITERIA: FanoutCriterion[] = [
  {
    id: "violent_act",
    label: "Shooting, stabbing, swarming",
    examples: "Firearm discharge, edged-weapon assault, group assault / swarming.",
  },
  {
    id: "traumatic_incident",
    label: "Violent / traumatic incident",
    examples:
      "An act of violence or otherwise traumatic event likely to produce a strong community impact.",
  },
  {
    id: "loss_of_life",
    label: "Loss of life / suicide",
    examples: "A death on or related to the property, including suicide.",
  },
];

// Incident catalog ids (from catalog.ts) that, by their nature, presumptively
// meet fan-out criteria so the console can pre-flag them for the operator.
export const FANOUT_TRIGGER_INCIDENT_IDS: ReadonlySet<string> = new Set([
  "lockdown",
  "intruder",
]);

/**
 * Does the current selection meet fan-out criteria?
 * True when the operator has flagged any criterion, OR the incident type is one
 * the playbook presumptively treats as a fan-out trigger (e.g. lockdown), OR the
 * severity sits at the top of the ladder (critical / life-safety).
 */
export function meetsFanoutCriteria(args: {
  incidentId: string;
  severity: SeverityId;
  flaggedCriteria: FanoutCriterionId[];
}): boolean {
  if (args.flaggedCriteria.length > 0) return true;
  if (FANOUT_TRIGGER_INCIDENT_IDS.has(args.incidentId)) return true;
  return args.severity === "critical" || args.severity === "life_safety";
}

/* ------------------------------------------------------------------ */
/* Escalation chain — ordered roles + who they notify                   */
/* ------------------------------------------------------------------ */

export interface EscalationRole {
  /** Step order, 1 = first contact in the chain. */
  step: number;
  role: string;
  /** What this role does in the chain. */
  action: string;
  /** Who this role notifies / hands off to next. */
  notifies: string;
  /** True for the link that actually initiates the resident fan-out. */
  initiatesFanout?: boolean;
}

// Dispatcher → Special Constable → Sergeant (Incident Commander) → Staff Sergeant
// → Resident Access & Support → Strategic Communications → Client Care Centre.
// The Sergeant communicates incident status to the Client Care Centre to INITIATE
// the fan-out; the Client Care Centre is the link that actually fans out to staff.
export const ESCALATION_CHAIN: EscalationRole[] = [
  {
    step: 1,
    role: "Dispatcher",
    action:
      "Takes the call, ensures a tiered emergency-services response, and dispatches Special Constables to the scene.",
    notifies: "Dispatch Supervisor, then Sergeant",
  },
  {
    step: 2,
    role: "Special Constable",
    action:
      "Attends and assesses the scene, protects life & property, sets a security perimeter, and confirms whether a critical incident has occurred.",
    notifies: "Dispatcher → requests a Sergeant to attend",
  },
  {
    step: 3,
    role: "Sergeant (Incident Commander)",
    action:
      "Assumes Incident Commander, manages scene & resources, and communicates incident status to the Client Care Centre to initiate the fan-out.",
    notifies: "Staff Sergeant, Resident Access & Support, Strategic Communications, Client Care Centre",
  },
  {
    step: 4,
    role: "Staff Sergeant",
    action:
      "Supports the Sergeant, updates the Deputy Chief Special Constable, and continuously assesses whether to activate the Emergency Response Plan.",
    notifies: "Deputy Chief Special Constable, Regional Access & Support on-call",
  },
  {
    step: 5,
    role: "Resident Access & Support",
    action:
      "On-call team mobilized to support directly-affected tenants and coordinate site clearance and supports.",
    notifies: "Community Service Coordinators, site staff",
  },
  {
    step: 6,
    role: "Strategic Communications",
    action:
      "Prepares, approves and distributes communications to tenants, staff, community partners and the public; manages media.",
    notifies: "Executive Leadership / Board (for qualifying incidents)",
  },
  {
    step: 7,
    role: "Client Care Centre",
    action:
      "24/7 line. Receives the fan-out and broadcasts to designated staff; logs the incident with a CRM reference number.",
    notifies: "Designated staff fan-out list",
    initiatesFanout: true,
  },
];

/* ------------------------------------------------------------------ */
/* CRM reference number — INC-YYYYMMDD-XXXX                             */
/* ------------------------------------------------------------------ */

// Every Client Care request — including a fired emergency broadcast — is assigned
// a CRM reference number so it can be tracked and held accountable. We mint a
// human-readable, date-stamped reference: INC-YYYYMMDD-XXXX (XXXX = 4 hex chars).
export function generateCrmReference(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 0xffff)
    .toString(16)
    .toUpperCase()
    .padStart(4, "0");
  return `INC-${y}${m}${d}-${rand}`;
}

/** Identity-verification fields a Client Care agent confirms on every contact. */
export const IDENTITY_VERIFICATION_FIELDS = [
  "Name",
  "Phone number",
  "Address (including unit number)",
] as const;
