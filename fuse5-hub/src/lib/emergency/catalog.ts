// Emergency Broadcast catalog — a housing call-center "scenario book".
//
// This is the static data spine for the Emergency console. It is deliberately
// structured so a real call-center playbook (severity ladder + incident types +
// ready-to-send fan-out templates) can be dropped in later without touching UI:
//   - SEVERITY_LEVELS   the 7-rung escalation ladder (Information → Life-Safety)
//   - INCIDENT_TYPES    the social-housing scenarios an operator triages
//   - FANOUT_TEMPLATES  1–3 send-ready messages per incident + an all-clear
//
// Everything is plain typed data — no DB, no side effects. Placeholders use the
// {{token}} convention shared with Compose ({{building}}, {{time}}, {{contact}}).

import type { Channel } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Severity ladder                                                     */
/* ------------------------------------------------------------------ */

export type SeverityId =
  | "information"
  | "advisory"
  | "watch"
  | "warning"
  | "urgent"
  | "critical"
  | "life_safety";

export interface SeverityLevel {
  id: SeverityId;
  label: string;
  /** 1 (lowest) … 7 (highest) — drives sort + urgency cues. */
  rank: number;
  /** CSS variable / token used for the badge + accent. */
  colorToken: string;
  /** One-line operator guidance: when to pick this rung. */
  guidance: string;
  /** True for rungs that should override quiet hours and fire every channel. */
  overrideQuietHours: boolean;
}

export const SEVERITY_LEVELS: SeverityLevel[] = [
  {
    id: "information",
    label: "Information",
    rank: 1,
    colorToken: "var(--f5-text-secondary)",
    guidance: "General awareness. No action required by residents.",
    overrideQuietHours: false,
  },
  {
    id: "advisory",
    label: "Advisory",
    rank: 2,
    colorToken: "var(--f5-teal)",
    guidance: "Minor disruption or precaution. Residents should take note.",
    overrideQuietHours: false,
  },
  {
    id: "watch",
    label: "Watch",
    rank: 3,
    colorToken: "var(--f5-teal)",
    guidance: "A hazard is possible. Residents should prepare and stay alert.",
    overrideQuietHours: false,
  },
  {
    id: "warning",
    label: "Warning",
    rank: 4,
    colorToken: "var(--f5-amber)",
    guidance: "A hazard is occurring or imminent. Residents should act now.",
    overrideQuietHours: true,
  },
  {
    id: "urgent",
    label: "Urgent",
    rank: 5,
    colorToken: "var(--f5-amber)",
    guidance: "Significant service disruption affecting safety or habitability.",
    overrideQuietHours: true,
  },
  {
    id: "critical",
    label: "Critical",
    rank: 6,
    colorToken: "var(--f5-red)",
    guidance: "Serious incident. Immediate resident action likely required.",
    overrideQuietHours: true,
  },
  {
    id: "life_safety",
    label: "Life-Safety",
    rank: 7,
    colorToken: "var(--f5-red)",
    guidance: "Imminent threat to life. Evacuate / shelter as instructed.",
    overrideQuietHours: true,
  },
];

export const SEVERITY_BY_ID: Record<SeverityId, SeverityLevel> = Object.fromEntries(
  SEVERITY_LEVELS.map((s) => [s.id, s]),
) as Record<SeverityId, SeverityLevel>;

/* ------------------------------------------------------------------ */
/* Incident types                                                      */
/* ------------------------------------------------------------------ */

export type IncidentGroup =
  | "Fire & Life-Safety"
  | "Utilities & Building Systems"
  | "Water & Sanitation"
  | "Security"
  | "Environmental"
  | "Planned";

export interface IncidentType {
  id: string;
  label: string;
  group: IncidentGroup;
  icon: string;
  defaultSeverity: SeverityId;
  /** Channels recommended for this incident (operator can still override). */
  recommendedChannels: Channel[];
  /** One-line dispatcher hint shown under the selector. */
  hint: string;
}

// Channels available in this app: email · sms · whatsapp · voice · display.
const ALL: Channel[] = ["email", "sms", "whatsapp", "voice", "display"];
const FAST: Channel[] = ["sms", "voice", "display"];
const STD: Channel[] = ["email", "sms", "display"];

export const INCIDENT_TYPES: IncidentType[] = [
  // ---- Fire & Life-Safety ----
  {
    id: "fire",
    label: "Fire / Fire Alarm",
    group: "Fire & Life-Safety",
    icon: "🔥",
    defaultSeverity: "life_safety",
    recommendedChannels: ALL,
    hint: "Active fire or fire-alarm activation. Evacuation default.",
  },
  {
    id: "evacuation",
    label: "Building Evacuation",
    group: "Fire & Life-Safety",
    icon: "🚪",
    defaultSeverity: "life_safety",
    recommendedChannels: ALL,
    hint: "Full or partial evacuation ordered by staff or first responders.",
  },
  {
    id: "carbon_monoxide",
    label: "Carbon Monoxide",
    group: "Fire & Life-Safety",
    icon: "☠️",
    defaultSeverity: "life_safety",
    recommendedChannels: ALL,
    hint: "CO detector activation or suspected CO. Treat as life-safety.",
  },
  {
    id: "gas_leak",
    label: "Gas Leak",
    group: "Fire & Life-Safety",
    icon: "🛢️",
    defaultSeverity: "life_safety",
    recommendedChannels: ALL,
    hint: "Smell of gas / suspected leak. No switches, no elevators, evacuate.",
  },
  {
    id: "structural",
    label: "Structural Hazard",
    group: "Fire & Life-Safety",
    icon: "🏚️",
    defaultSeverity: "critical",
    recommendedChannels: ALL,
    hint: "Collapse risk, ceiling failure, balcony/railing hazard.",
  },
  {
    id: "hazmat",
    label: "Hazardous Material",
    group: "Fire & Life-Safety",
    icon: "⚠️",
    defaultSeverity: "critical",
    recommendedChannels: ALL,
    hint: "Chemical spill, asbestos disturbance, or other hazmat exposure.",
  },

  // ---- Utilities & Building Systems ----
  {
    id: "no_heat",
    label: "No Heat / Heating Failure",
    group: "Utilities & Building Systems",
    icon: "🥶",
    defaultSeverity: "urgent",
    recommendedChannels: STD,
    hint: "Loss of heat. Urgent in cold weather / for vulnerable residents.",
  },
  {
    id: "no_hot_water",
    label: "No Hot Water",
    group: "Utilities & Building Systems",
    icon: "🚿",
    defaultSeverity: "warning",
    recommendedChannels: ["email", "sms", "display"],
    hint: "Hot water service disruption building-wide.",
  },
  {
    id: "power_outage",
    label: "Power Outage",
    group: "Utilities & Building Systems",
    icon: "🔌",
    defaultSeverity: "urgent",
    recommendedChannels: FAST,
    hint: "Building-wide or partial power loss. SMS/voice prioritized.",
  },
  {
    id: "elevator_outage",
    label: "Elevator Outage",
    group: "Utilities & Building Systems",
    icon: "🛗",
    defaultSeverity: "warning",
    recommendedChannels: STD,
    hint: "Elevator out of service. Flag mobility-impacted residents.",
  },

  // ---- Water & Sanitation ----
  {
    id: "flood",
    label: "Flood / Water Escape",
    group: "Water & Sanitation",
    icon: "🌊",
    defaultSeverity: "critical",
    recommendedChannels: ALL,
    hint: "Burst pipe, water escape, or flooding affecting units/common areas.",
  },
  {
    id: "water_shutoff",
    label: "Water Shut-off",
    group: "Water & Sanitation",
    icon: "🚰",
    defaultSeverity: "urgent",
    recommendedChannels: STD,
    hint: "Planned or emergency interruption of water service.",
  },
  {
    id: "boil_water",
    label: "Boil-Water Advisory",
    group: "Water & Sanitation",
    icon: "💧",
    defaultSeverity: "warning",
    recommendedChannels: ALL,
    hint: "Water unsafe to drink without boiling. Issued with public health.",
  },
  {
    id: "sewage",
    label: "Sewage Backup",
    group: "Water & Sanitation",
    icon: "🚽",
    defaultSeverity: "urgent",
    recommendedChannels: STD,
    hint: "Sewage backup / drain failure. Health hazard in affected areas.",
  },

  // ---- Security ----
  {
    id: "lockdown",
    label: "Security / Lockdown",
    group: "Security",
    icon: "🔒",
    defaultSeverity: "critical",
    recommendedChannels: ALL,
    hint: "Shelter-in-place. Lock doors, stay inside until all-clear.",
  },
  {
    id: "intruder",
    label: "Intruder / Trespasser",
    group: "Security",
    icon: "🛡️",
    defaultSeverity: "warning",
    recommendedChannels: FAST,
    hint: "Unauthorized person on site. Heighten awareness, report sightings.",
  },

  // ---- Environmental ----
  {
    id: "severe_weather",
    label: "Severe Weather / Storm",
    group: "Environmental",
    icon: "⛈️",
    defaultSeverity: "warning",
    recommendedChannels: ALL,
    hint: "Storm, wind, flooding risk. Pair with shelter guidance.",
  },
  {
    id: "extreme_heat",
    label: "Extreme Heat",
    group: "Environmental",
    icon: "🥵",
    defaultSeverity: "warning",
    recommendedChannels: STD,
    hint: "Heat warning. Direct residents to cooling rooms / wellness checks.",
  },
  {
    id: "extreme_cold",
    label: "Extreme Cold",
    group: "Environmental",
    icon: "❄️",
    defaultSeverity: "warning",
    recommendedChannels: STD,
    hint: "Cold warning. Warming room guidance + vulnerable-resident checks.",
  },
  {
    id: "pest",
    label: "Pest Infestation",
    group: "Environmental",
    icon: "🐀",
    defaultSeverity: "advisory",
    recommendedChannels: ["email", "display"],
    hint: "Pest activity / treatment notice. Usually advisory with prep steps.",
  },

  // ---- Planned ----
  {
    id: "planned_maintenance",
    label: "Planned Maintenance Outage",
    group: "Planned",
    icon: "🔧",
    defaultSeverity: "information",
    recommendedChannels: ["email", "sms", "display"],
    hint: "Scheduled interruption with a known window. Advance notice.",
  },
];

export const INCIDENT_BY_ID: Record<string, IncidentType> = Object.fromEntries(
  INCIDENT_TYPES.map((i) => [i.id, i]),
);

/** Group order for the grouped incident selector. */
export const INCIDENT_GROUPS: IncidentGroup[] = [
  "Fire & Life-Safety",
  "Utilities & Building Systems",
  "Water & Sanitation",
  "Security",
  "Environmental",
  "Planned",
];

/* ------------------------------------------------------------------ */
/* Fan-out templates                                                   */
/* ------------------------------------------------------------------ */

export interface FanoutTemplate {
  id: string;
  /** Incident type this template belongs to. */
  incidentId: string;
  /** Staff-facing label in the picker. */
  label: string;
  /** Severity this specific template implies (may differ from incident default). */
  severity: SeverityId;
  /** Resident-facing subject / display headline. Supports {{tokens}}. */
  title: string;
  /** Resident-facing body. Supports {{tokens}}. */
  body: string;
  /** True for the "service restored / all-clear" follow-up. */
  isAllClear?: boolean;
}

// Supported placeholders, surfaced in the UI:
//   {{building}} {{property}} {{unit}} {{floor}} {{block}}
//   {{time}} {{date}} {{eta}} {{contact}} {{muster_point}}
export const TEMPLATE_PLACEHOLDERS = [
  "{{building}}",
  "{{property}}",
  "{{time}}",
  "{{date}}",
  "{{eta}}",
  "{{contact}}",
  "{{muster_point}}",
] as const;

export const FANOUT_TEMPLATES: FanoutTemplate[] = [
  // ---- Fire ----
  {
    id: "fire_evacuate",
    incidentId: "fire",
    label: "Fire — Evacuate Now",
    severity: "life_safety",
    title: "FIRE EMERGENCY — Evacuate {{building}} Now",
    body:
      "FIRE EMERGENCY at {{building}}. Evacuate immediately via the nearest stairwell. Do NOT use elevators. Close doors behind you. Assemble at {{muster_point}} and await further instruction. Do not re-enter until cleared by Fire Services. Residents needing evacuation assistance, call {{contact}}.",
  },
  {
    id: "fire_alarm_investigate",
    incidentId: "fire",
    label: "Fire Alarm — Under Investigation",
    severity: "warning",
    title: "Fire Alarm Activated — {{building}}",
    body:
      "A fire alarm has activated at {{building}}. As a precaution, please prepare to evacuate via the nearest stairwell and do not use elevators. Staff and Fire Services are investigating. We will confirm an all-clear as soon as the building is verified safe.",
  },
  {
    id: "fire_all_clear",
    incidentId: "fire",
    label: "All-Clear — Fire",
    severity: "information",
    title: "ALL CLEAR — {{building}}",
    body:
      "ALL CLEAR. Fire Services have confirmed {{building}} is safe to re-enter as of {{time}}. Normal building operations have resumed. Thank you for your cooperation and patience.",
    isAllClear: true,
  },

  // ---- Evacuation ----
  {
    id: "evac_full",
    incidentId: "evacuation",
    label: "Full Building Evacuation",
    severity: "life_safety",
    title: "EVACUATE {{building}} — Immediate",
    body:
      "EVACUATION ORDER for {{building}}, effective immediately. Leave by the nearest exit using stairs only — do not use elevators. Assemble at {{muster_point}}. If you cannot evacuate without help, call {{contact}} now and shelter in place by a window. Await all-clear before returning.",
  },
  {
    id: "evac_all_clear",
    incidentId: "evacuation",
    label: "All-Clear — Evacuation",
    severity: "information",
    title: "ALL CLEAR — Return Permitted",
    body:
      "ALL CLEAR. The evacuation order for {{building}} has been lifted as of {{time}}. It is safe to return to your unit. Thank you for responding quickly and cooperating with staff.",
    isAllClear: true,
  },

  // ---- Carbon monoxide ----
  {
    id: "co_evacuate",
    incidentId: "carbon_monoxide",
    label: "CO Alarm — Evacuate & Ventilate",
    severity: "life_safety",
    title: "CARBON MONOXIDE ALERT — {{building}}",
    body:
      "CARBON MONOXIDE has been detected at {{building}}. Leave the affected area immediately and move outside to fresh air. Do not use elevators. If you feel dizzy, nauseous, or have a headache, call 911. Assemble at {{muster_point}}. Crews are responding — await all-clear before returning.",
  },
  {
    id: "co_all_clear",
    incidentId: "carbon_monoxide",
    label: "All-Clear — Carbon Monoxide",
    severity: "information",
    title: "ALL CLEAR — Air Quality Restored",
    body:
      "ALL CLEAR. Carbon monoxide levels at {{building}} have returned to safe levels and the source has been addressed as of {{time}}. It is safe to return. Thank you for your cooperation.",
    isAllClear: true,
  },

  // ---- Gas leak ----
  {
    id: "gas_evacuate",
    incidentId: "gas_leak",
    label: "Gas Leak — Evacuate",
    severity: "life_safety",
    title: "GAS LEAK — Evacuate {{building}}",
    body:
      "SUSPECTED GAS LEAK at {{building}}. Evacuate now. Do NOT switch lights on/off, use elevators, or operate any electronics. Leave doors open as you exit. Assemble at {{muster_point}} and call the gas utility from outside. Await all-clear from staff or first responders.",
  },
  {
    id: "gas_all_clear",
    incidentId: "gas_leak",
    label: "All-Clear — Gas Leak",
    severity: "information",
    title: "ALL CLEAR — Gas Leak Resolved",
    body:
      "ALL CLEAR. The gas leak at {{building}} has been located and made safe as of {{time}}. It is safe to return to your unit. Thank you for evacuating promptly.",
    isAllClear: true,
  },

  // ---- Structural ----
  {
    id: "structural_avoid",
    incidentId: "structural",
    label: "Structural Hazard — Avoid Area",
    severity: "critical",
    title: "Structural Hazard — {{building}}",
    body:
      "A structural hazard has been identified at {{building}}. Please avoid the affected area until further notice. Follow any barriers or staff direction. Engineers/contractors have been called. Estimated assessment: {{eta}}. Report concerns to {{contact}}.",
  },

  // ---- Hazmat ----
  {
    id: "hazmat_avoid",
    incidentId: "hazmat",
    label: "Hazardous Material — Avoid Area",
    severity: "critical",
    title: "Hazardous Material Incident — {{building}}",
    body:
      "A hazardous material incident has occurred at {{building}}. Avoid the affected area, keep windows closed, and follow staff direction. Specialist crews are responding. If you experience irritation or difficulty breathing, move to fresh air and call 911. Updates to follow.",
  },

  // ---- No heat ----
  {
    id: "no_heat_disruption",
    incidentId: "no_heat",
    label: "No Heat — Service Disruption",
    severity: "urgent",
    title: "Heating Disruption — {{building}}",
    body:
      "Heating at {{building}} is temporarily disrupted. Our heating contractor has been dispatched. Estimated restoration: {{eta}}. If you need a temporary heater or a wellness check — especially for seniors, infants, or anyone with medical needs — call {{contact}}.",
  },
  {
    id: "no_heat_restored",
    incidentId: "no_heat",
    label: "All-Clear — Heat Restored",
    severity: "information",
    title: "Heat Restored — {{building}}",
    body:
      "Heating at {{building}} has been fully restored as of {{time}}. Please allow time for units to warm up. Contact {{contact}} if your unit remains cold. Thank you for your patience.",
    isAllClear: true,
  },

  // ---- No hot water ----
  {
    id: "hot_water_disruption",
    incidentId: "no_hot_water",
    label: "No Hot Water — Disruption",
    severity: "warning",
    title: "Hot Water Disruption — {{building}}",
    body:
      "Hot water service at {{building}} is currently affected. A technician is on site working to restore service. Estimated restoration: {{eta}}. We apologize for the inconvenience. Questions: {{contact}}.",
  },
  {
    id: "hot_water_restored",
    incidentId: "no_hot_water",
    label: "All-Clear — Hot Water Restored",
    severity: "information",
    title: "Hot Water Restored — {{building}}",
    body:
      "Hot water service at {{building}} has been restored as of {{time}}. Thank you for your patience while repairs were completed.",
    isAllClear: true,
  },

  // ---- Power outage ----
  {
    id: "power_outage_active",
    incidentId: "power_outage",
    label: "Power Outage — Active",
    severity: "urgent",
    title: "Power Outage — {{building}}",
    body:
      "A power outage is affecting {{building}}. We are coordinating with the hydro utility and our electrical contractor. Elevators are out of service — use stairs with caution. Keep fridge and freezer doors closed. Estimated restoration: {{eta}}. Emergencies: {{contact}}.",
  },
  {
    id: "power_outage_restored",
    incidentId: "power_outage",
    label: "All-Clear — Power Restored",
    severity: "information",
    title: "Power Restored — {{building}}",
    body:
      "Power has been restored at {{building}} as of {{time}}. Elevators and common-area systems are returning to service. Please report any remaining issues to {{contact}}.",
    isAllClear: true,
  },

  // ---- Elevator outage ----
  {
    id: "elevator_oos",
    incidentId: "elevator_outage",
    label: "Elevator Out of Service",
    severity: "warning",
    title: "Elevator Out of Service — {{building}}",
    body:
      "The elevator at {{building}} is out of service. Our service provider has been dispatched. Estimated restoration: {{eta}}. Residents who require mobility assistance, please contact {{contact}} and we will arrange support.",
  },
  {
    id: "elevator_restored",
    incidentId: "elevator_outage",
    label: "All-Clear — Elevator Restored",
    severity: "information",
    title: "Elevator Restored — {{building}}",
    body:
      "The elevator at {{building}} is back in service as of {{time}}. Thank you for your patience and for using the stairs safely in the interim.",
    isAllClear: true,
  },

  // ---- Flood ----
  {
    id: "flood_active",
    incidentId: "flood",
    label: "Flood / Water Escape — Active",
    severity: "critical",
    title: "Flooding — {{building}}",
    body:
      "Flooding / a water escape is affecting {{building}}. Move valuables off the floor where safe, avoid affected areas, and do not use elevators. Do not touch electrical outlets or panels in wet areas. Crews are on site. Estimated containment: {{eta}}. Report flooding in your unit to {{contact}}.",
  },
  {
    id: "flood_all_clear",
    incidentId: "flood",
    label: "All-Clear — Flood",
    severity: "information",
    title: "All Clear — Flooding Contained",
    body:
      "The flooding at {{building}} has been contained and cleanup is underway as of {{time}}. If your unit was affected, please contact {{contact}} to arrange assessment. Thank you for your patience.",
    isAllClear: true,
  },

  // ---- Water shut-off ----
  {
    id: "water_emergency",
    incidentId: "water_shutoff",
    label: "Emergency Water Shut-off",
    severity: "urgent",
    title: "Emergency Water Shut-off — {{building}}",
    body:
      "Due to an emergency repair, water at {{building}} has been shut off effective immediately. Crews are on site. Estimated restoration: {{eta}}. Please store water for essential use. Questions or concerns: {{contact}}.",
  },
  {
    id: "water_planned",
    incidentId: "water_shutoff",
    label: "Planned Water Shut-off",
    severity: "information",
    title: "Planned Water Shut-off — {{date}}",
    body:
      "Water service at {{building}} will be shut off on {{date}} from {{time}} for scheduled maintenance. Please store water in advance and avoid using taps during this window. Expected restoration: {{eta}}.",
  },
  {
    id: "water_restored",
    incidentId: "water_shutoff",
    label: "All-Clear — Water Restored",
    severity: "information",
    title: "Water Restored — {{building}}",
    body:
      "Water service at {{building}} has been restored as of {{time}}. You may notice air or discolouration in the lines briefly — run a cold tap until it clears. Thank you for your patience.",
    isAllClear: true,
  },

  // ---- Boil-water advisory ----
  {
    id: "boil_water_issued",
    incidentId: "boil_water",
    label: "Boil-Water Advisory — Issued",
    severity: "warning",
    title: "Boil-Water Advisory — {{building}}",
    body:
      "A boil-water advisory is in effect for {{building}}. Until further notice, boil all water for at least one minute before drinking, cooking, brushing teeth, or making ice. This advisory has been issued in coordination with public health. We will notify you the moment it is lifted. Questions: {{contact}}.",
  },
  {
    id: "boil_water_lifted",
    incidentId: "boil_water",
    label: "All-Clear — Advisory Lifted",
    severity: "information",
    title: "Boil-Water Advisory Lifted — {{building}}",
    body:
      "The boil-water advisory for {{building}} has been LIFTED as of {{time}}. Tap water is safe to use. Run cold taps for a few minutes before first use. Thank you for your patience.",
    isAllClear: true,
  },

  // ---- Sewage ----
  {
    id: "sewage_active",
    incidentId: "sewage",
    label: "Sewage Backup — Active",
    severity: "urgent",
    title: "Sewage Backup — {{building}}",
    body:
      "A sewage backup is affecting {{building}}. Please avoid using sinks, toilets, and drains in the affected area until further notice, and stay clear of any standing water. Cleanup crews have been dispatched. Estimated resolution: {{eta}}. Report issues in your unit to {{contact}}.",
  },
  {
    id: "sewage_restored",
    incidentId: "sewage",
    label: "All-Clear — Sewage Resolved",
    severity: "information",
    title: "Sewage Service Restored — {{building}}",
    body:
      "The sewage backup at {{building}} has been resolved and affected areas sanitized as of {{time}}. Normal use of plumbing has resumed. Thank you for your patience.",
    isAllClear: true,
  },

  // ---- Lockdown ----
  {
    id: "lockdown_shelter",
    incidentId: "lockdown",
    label: "Lockdown — Shelter in Place",
    severity: "critical",
    title: "SECURITY LOCKDOWN — {{building}}",
    body:
      "SECURITY LOCKDOWN at {{building}}. Remain inside your unit with your door locked. Do not open the door to anyone you do not know. Stay away from windows. If you are in a common area, move to the nearest securable room. Call 911 for emergencies. Await the all-clear before moving about the building.",
  },
  {
    id: "lockdown_all_clear",
    incidentId: "lockdown",
    label: "All-Clear — Lockdown Lifted",
    severity: "information",
    title: "ALL CLEAR — Lockdown Lifted",
    body:
      "ALL CLEAR. The security lockdown at {{building}} has been lifted as of {{time}}. Normal movement throughout the building has resumed. Thank you for your cooperation. Report any concerns to {{contact}}.",
    isAllClear: true,
  },

  // ---- Intruder ----
  {
    id: "intruder_alert",
    incidentId: "intruder",
    label: "Intruder / Trespasser — Alert",
    severity: "warning",
    title: "Security Alert — {{building}}",
    body:
      "An unauthorized person has been reported on site at {{building}}. Please keep entrance doors closed and do not let anyone you do not recognize tailgate in behind you. Report sightings to {{contact}} or call 911 if you feel unsafe. Updates to follow.",
  },

  // ---- Severe weather ----
  {
    id: "severe_weather_warning",
    incidentId: "severe_weather",
    label: "Severe Weather — Warning",
    severity: "warning",
    title: "Severe Weather Warning — {{building}}",
    body:
      "A severe weather warning is in effect for our area. At {{building}}, please stay indoors, keep away from windows, and secure any items on balconies. Charge your phone and keep a flashlight handy in case of outages. Follow staff instructions. Emergencies: {{contact}}.",
  },
  {
    id: "severe_weather_all_clear",
    incidentId: "severe_weather",
    label: "All-Clear — Weather",
    severity: "information",
    title: "Weather All-Clear — {{building}}",
    body:
      "The severe weather warning affecting {{building}} has ended as of {{time}}. Please report any storm-related damage to {{contact}}. Thank you for staying safe.",
    isAllClear: true,
  },

  // ---- Extreme heat ----
  {
    id: "extreme_heat_warning",
    incidentId: "extreme_heat",
    label: "Extreme Heat — Cooling Guidance",
    severity: "warning",
    title: "Extreme Heat Warning — {{building}}",
    body:
      "An extreme heat warning is in effect. Stay hydrated, avoid strenuous activity, and never leave anyone in a parked vehicle. A cooling area is available — see staff for the location and hours. Please check on elderly neighbours and anyone living alone. Wellness checks: {{contact}}.",
  },

  // ---- Extreme cold ----
  {
    id: "extreme_cold_warning",
    incidentId: "extreme_cold",
    label: "Extreme Cold — Warming Guidance",
    severity: "warning",
    title: "Extreme Cold Warning — {{building}}",
    body:
      "An extreme cold warning is in effect. Keep your unit heated, dress warmly, and limit time outdoors. A warming area is available — see staff for the location and hours. Please check on elderly neighbours and anyone living alone. Wellness checks: {{contact}}.",
  },

  // ---- Pest ----
  {
    id: "pest_notice",
    incidentId: "pest",
    label: "Pest Treatment — Notice of Entry",
    severity: "advisory",
    title: "Notice of Entry — Pest Treatment {{date}}",
    body:
      "Scheduled pest-control treatment at {{building}} requires entry to units on {{date}} between {{time}}. Please follow the preparation sheet provided. If you cannot be present, entry will proceed in accordance with your lease. Questions: {{contact}}.",
  },

  // ---- Planned maintenance ----
  {
    id: "planned_outage_notice",
    incidentId: "planned_maintenance",
    label: "Planned Maintenance — Advance Notice",
    severity: "information",
    title: "Planned Maintenance — {{date}}",
    body:
      "Planned maintenance at {{building}} is scheduled for {{date}} from {{time}}. You may experience a temporary interruption to service during this window. Expected completion: {{eta}}. We appreciate your patience. Questions: {{contact}}.",
  },
];

/** Templates for a given incident, all-clear last. */
export function templatesForIncident(incidentId: string): FanoutTemplate[] {
  return FANOUT_TEMPLATES.filter((t) => t.incidentId === incidentId).sort(
    (a, b) => Number(a.isAllClear ?? false) - Number(b.isAllClear ?? false),
  );
}
