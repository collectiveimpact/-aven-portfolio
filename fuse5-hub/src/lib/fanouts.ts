// Fan-out notice catalog + work-order emergency taxonomy.
//
// Derived from TCHC's "Business Hours Emergency Matrix for Semi-Skilled Work
// Orders" + Maintenance Dispatch fan-out notices. A "fan-out" is a building-wide
// tenant notice (elevator out, water shut-off, etc.) — the message that goes out
// alongside an emergency work order. These templates feed Compose / Emergency.

export type Severity = "emergency" | "planned" | "info";
export type Channel = "display" | "email" | "sms" | "voice";

export interface FanoutTemplate {
  key: string;
  title: string;            // staff-facing label
  category: string;         // matrix category it maps to
  severity: Severity;
  channels: Channel[];
  subject: string;          // resident-facing subject / display headline
  body: string;             // {{property}} {{date}} {{time}} {{eta}} variables
  restored?: string;        // optional "service restored" follow-up
}

const V = "Variables: {{property}}, {{date}}, {{time}}, {{eta}}, {{contact}}";

// The 11 building-wide fan-outs that map to matrix "emergency"/disruption rows.
export const FANOUT_TEMPLATES: FanoutTemplate[] = [
  {
    key: "elevator_oos", title: "Elevator Out of Service", category: "Elevator",
    severity: "emergency", channels: ["display", "email", "sms"],
    subject: "Elevator Out of Service — {{property}}",
    body: "The elevator at {{property}} is currently out of service. Our service provider has been dispatched. Estimated restoration: {{eta}}. We apologize for the inconvenience. For urgent mobility assistance, contact {{contact}}.",
    restored: "Service restored: the elevator at {{property}} is back in operation as of {{time}}. Thank you for your patience.",
  },
  {
    key: "power_outage_bldg", title: "Power Outage — Building", category: "Electrical (Common Area)",
    severity: "emergency", channels: ["display", "email", "sms"],
    subject: "Power Disruption — {{property}}",
    body: "There is a power disruption affecting {{property}}. We are investigating with Toronto Hydro and our electrical vendor. Updates will follow. Keep fridge/freezer doors closed. Contact {{contact}} for emergencies.",
    restored: "Power has been restored at {{property}} as of {{time}}.",
  },
  {
    key: "water_shutoff_planned", title: "Planned Water Shut-off", category: "Drains/Water Mains",
    severity: "planned", channels: ["display", "email", "sms"],
    subject: "Planned Water Shut-off — {{date}}",
    body: "Water service at {{property}} will be shut off on {{date}} from {{time}} for scheduled maintenance. Please store water in advance and avoid using taps during this window. Expected restoration: {{eta}}.",
    restored: "Water service at {{property}} has been restored.",
  },
  {
    key: "water_emergency", title: "Emergency Water Shut-off", category: "Drains/Water Mains",
    severity: "emergency", channels: ["display", "email", "sms"],
    subject: "Emergency Water Shut-off — {{property}}",
    body: "Due to an emergency repair, water at {{property}} has been shut off effective immediately. Crews are on site. Estimated restoration: {{eta}}. Contact {{contact}} with concerns.",
  },
  {
    key: "no_heat", title: "Heating Disruption / No Heat", category: "Heating",
    severity: "emergency", channels: ["display", "email", "sms"],
    subject: "Heating Disruption — {{property}}",
    body: "Heating at {{property}} is temporarily disrupted. Our heating vendor has been dispatched. Estimated restoration: {{eta}}. If you need a temporary heater or wellness check, contact {{contact}}.",
    restored: "Heating at {{property}} has been restored as of {{time}}.",
  },
  {
    key: "hot_water", title: "Hot Water Disruption", category: "Hot Water",
    severity: "emergency", channels: ["display", "email"],
    subject: "Hot Water Disruption — {{property}}",
    body: "Hot water service at {{property}} is currently affected. A technician is attending. Estimated restoration: {{eta}}. We apologize for the inconvenience.",
  },
  {
    key: "fire_alarm_test", title: "Fire Alarm Testing", category: "Fire Life Safety",
    severity: "planned", channels: ["display", "email", "sms"],
    subject: "Scheduled Fire Alarm Testing — {{date}}",
    body: "Scheduled fire alarm testing at {{property}} will take place {{date}} from {{time}}. You will hear the alarm intermittently. No action is required unless instructed by staff or emergency services.",
  },
  {
    key: "common_door", title: "Building Entrance / Door Out of Service", category: "Doors (Common Area)",
    severity: "emergency", channels: ["display", "email"],
    subject: "Building Door Service — {{property}}",
    body: "A common-area/entrance door at {{property}} is being repaired for security and fire-safety reasons. Please use {{contact}} entrance in the interim and ensure doors close securely behind you.",
  },
  {
    key: "laundry_oos", title: "Laundry Room Out of Service", category: "Laundry",
    severity: "info", channels: ["display", "email"],
    subject: "Laundry Room Out of Service — {{property}}",
    body: "The laundry room at {{property}} is temporarily out of service. The service provider (Coinamatic) has been notified. Estimated restoration: {{eta}}. We apologize for the inconvenience.",
    restored: "The laundry room at {{property}} is back in service.",
  },
  {
    key: "garbage_chute", title: "Garbage Chute Out of Service", category: "Janitorial",
    severity: "info", channels: ["display", "email"],
    subject: "Garbage Chute Out of Service — {{property}}",
    body: "The garbage chute at {{property}} is temporarily out of service. Please hold or use the designated bins at {{contact}} until repaired. Estimated restoration: {{eta}}.",
  },
  {
    key: "pest_entry", title: "Pest Control — Notice of Entry", category: "Pest Control",
    severity: "planned", channels: ["display", "email", "sms"],
    subject: "Notice of Entry — Pest Treatment {{date}}",
    body: "Scheduled pest-control treatment at {{property}} requires entry to units on {{date}} between {{time}}. Please follow the preparation sheet provided. If you cannot be present, entry will proceed per your lease. Questions: {{contact}}.",
  },
];

// Work-order emergency determination, distilled from the matrix. The WO screen
// uses this to auto-flag an order as emergency and suggest the fan-out template.
export interface CategoryRule {
  category: string;
  emergencyWhen: string;        // plain-English rule from the matrix
  fanoutKey?: string;           // suggested fan-out template
  vendorCategory?: boolean;     // page-7 "requires a vendor" list
}

export const WO_EMERGENCY_RULES: CategoryRule[] = [
  { category: "Elevator", emergencyWhen: "Always — building-wide, vendor required", fanoutKey: "elevator_oos", vendorCategory: true },
  { category: "Fire Life Safety", emergencyWhen: "Always — safety system", fanoutKey: "fire_alarm_test", vendorCategory: true },
  { category: "Electrical (Common Area)", emergencyWhen: "No power/partial power building; lighting >240V/ballasts", fanoutKey: "power_outage_bldg" },
  { category: "Drains/Water Mains", emergencyWhen: "Building water main / emergency shut-off", fanoutKey: "water_emergency", vendorCategory: true },
  { category: "Heating", emergencyWhen: "No heat in unit/building", fanoutKey: "no_heat" },
  { category: "Hot Water", emergencyWhen: "No hot water", fanoutKey: "hot_water" },
  { category: "Doors (Common Area)", emergencyWhen: "All common-area/fire-exit doors (security + fire life safety)", fanoutKey: "common_door" },
  { category: "Doors (Unit)", emergencyWhen: "Unit door cannot open/close, or repair/replace needed" },
  { category: "Windows", emergencyWhen: "Window stuck/cannot open, or safety locks; broken+boarded → vendor" },
  { category: "Pest Control", emergencyWhen: "Treatment scheduled — notice of entry", fanoutKey: "pest_entry", vendorCategory: true },
  { category: "Janitorial", emergencyWhen: "Biohazard spill; plugged garbage chute", fanoutKey: "garbage_chute" },
  { category: "Laundry", emergencyWhen: "Out of service → resident notice", fanoutKey: "laundry_oos" },
];

export const fanoutHelp = V;
