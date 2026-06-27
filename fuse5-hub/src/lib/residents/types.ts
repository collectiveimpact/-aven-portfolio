// Demographics layer for the resident directory. Mirrors a Yardi social-housing
// (Voyager / RentCafe Affordable) export for an Ontario provider. Banded fields
// (age, income) are intentionally coarse — we never carry a raw DOB or income.
// A Yardi feed maps into ResidentDemographics; see lib/residents/queries.ts.

export type OccupantType = "head_of_household" | "co_tenant" | "occupant" | "dependent";
export type Mobility = "none" | "cane_walker" | "wheelchair" | "mobility_scooter";
export type SubsidyType = "rgi" | "market" | "portable_housing_benefit" | "affordable";

// A tri-state used by the Yardi form's many yes/no flags (it distinguishes a
// recorded "No" from "not yet asked"). Stored as text; "unknown" === not on file.
export type YesNo = "yes" | "no" | "unknown";

export interface ResidentDemographics {
  householdSize: number | null;
  householdComposition: string | null;
  occupantType: OccupantType | null;
  ageBand: string | null;
  dependents: number | null;

  // --- Yardi: OCCUPANT DETAILS ---
  dateOfBirth: string | null;                 // raw DOB (ISO); list view never shows it — uses ageBand
  personWithDisabilities: YesNo | null;
  relationshipToMainTenant: string | null;
  otherContact: string | null;               // secondary contact phone
  otherContactName: string | null;           // secondary contact name

  // --- Yardi: GENDER ---
  gender: string | null;
  sexualOrientation: string | null;

  // --- Yardi: ETHNICITY & CULTURAL DIVERSITY ---
  ethnicity: string | null;
  indigenousIdentity: string | null;

  // --- Yardi: IMMIGRATION STATUS ---
  newcomer: YesNo | null;
  statusInCanada: string | null;

  // --- Yardi: MENTAL/DEVELOPMENTAL CHALLENGE ---
  mentalIllness: YesNo | null;
  dualDiagnosis: YesNo | null;
  developmental: YesNo | null;
  challengeDetails: string | null;

  // --- Yardi: LANGUAGE ---
  primaryLanguage: string | null;
  secondaryLanguages: string[];
  interpreterRequired: boolean;
  barriersToCommunication: YesNo | null;
  languageSpoken: string | null;
  correspondenceLanguage: string | null;
  languageDetails: string | null;

  // --- Yardi: ACCESSIBILITY / BARRIERS TO SERVICES ---
  accessibilityNeeds: string[];
  mobility: Mobility | null;
  serviceAnimal: boolean;
  emergencyAssembly: string | null;
  visionImpaired: YesNo | null;
  hearingImpaired: YesNo | null;
  wheelchair: YesNo | null;
  walker: YesNo | null;
  scooter: YesNo | null;
  accessibilityRequirements: string | null;

  // --- Yardi: GENERAL ---
  smoker: YesNo | null;
  oxygen: YesNo | null;
  pets: YesNo | null;
  tenantInsurance: YesNo | null;

  incomeBand: string | null;
  subsidyType: SubsidyType | null;
  rentShare: number | null;

  // --- Yardi: SUPPORTIVE SERVICES ---
  supportiveServices: YesNo | null;
  supportAgency: string | null;               // Agency 1 (0018)
  agency1: string | null;                     // explicit Agency 1 (falls back to supportAgency)
  agency2: string | null;                     // Agency 2
  caseWorker: string | null;
  caseWorkerContact: string | null;

  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;

  consentCasl: boolean;
  consentSms: boolean;
  consentDataSharing: boolean;
  consentEmergencyOnly: boolean;
  consentUpdatedAt: string | null;

  notes: string | null;
  source: "manual" | "yardi";
  updatedAt: string | null;
}

// A resident plus its tenancy + demographics layer, page-ready for the profile.
export interface ResidentWithDemographics {
  id: string;
  unit: string;
  name: string;
  propertyName: string;
  propertyId: string | null;
  email: string;
  phone: string;
  language: string;
  preferredChannel: string;
  status: "active" | "moved_out";

  tenantCode: string | null;
  tenancyStart: string | null;
  tenancyEnd: string | null;
  lastContactedAt: string | null;

  demographics: ResidentDemographics | null;
}

// A communication-history entry shown on the profile (timeline / consent log).
export interface ResidentCommEntry {
  when: string;
  what: string;
  channel: string;
  status: string;
}

// A work-order entry tied to the resident's unit.
export interface ResidentWorkOrder {
  id: string;
  title: string;
  category: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved";
}

// A survey participation entry for the resident.
export interface ResidentSurveyEntry {
  title: string;
  status: string;
  respondedAt: string | null;
}

// Friendly labels for the coded enum fields.
export const OCCUPANT_LABELS: Record<OccupantType, string> = {
  head_of_household: "Head of Household",
  co_tenant: "Co-tenant",
  occupant: "Occupant",
  dependent: "Dependent",
};

export const MOBILITY_LABELS: Record<Mobility, string> = {
  none: "None",
  cane_walker: "Cane / walker",
  wheelchair: "Wheelchair — step-free unit",
  mobility_scooter: "Mobility scooter",
};

export const SUBSIDY_LABELS: Record<SubsidyType, string> = {
  rgi: "Rent-Geared-to-Income (RGI)",
  market: "Market rent",
  portable_housing_benefit: "Portable Housing Benefit",
  affordable: "Affordable",
};

export const ACCESSIBILITY_LABELS: Record<string, string> = {
  large_print: "Large-print notices",
  visual_alerts: "Visual alerts (hearing)",
  audio_notices: "Audio notices (vision)",
  step_free: "Step-free access",
  plain_language: "Plain-language notices",
};

export function occupantLabel(v: string | null): string {
  return v ? OCCUPANT_LABELS[v as OccupantType] ?? v : "—";
}
export function mobilityLabel(v: string | null): string {
  return v ? MOBILITY_LABELS[v as Mobility] ?? v : "—";
}
export function subsidyLabel(v: string | null): string {
  return v ? SUBSIDY_LABELS[v as SubsidyType] ?? v : "—";
}
export function accessibilityLabel(v: string): string {
  return ACCESSIBILITY_LABELS[v] ?? v;
}

// ----------------------------------------------------------------------------
// Ontario social-housing PICKLISTS for the Yardi "Tenant Demographics" form.
// These mirror the option sets a WoodGreen / InSite Yardi tenant record offers.
// Kept as typed constants so the profile drawer and any future Yardi import
// validate against the same vocabulary. "Prefer not to say" / "Unknown" are
// first-class options (the real form lets a field be declined, not just blank).
// ----------------------------------------------------------------------------

// Tri-state yes/no/unknown used by most flag fields.
export const YES_NO_OPTIONS: { k: YesNo; l: string }[] = [
  { k: "yes", l: "Yes" },
  { k: "no", l: "No" },
  { k: "unknown", l: "Unknown" },
];
export function yesNoLabel(v: string | null): string {
  if (!v) return "—";
  return YES_NO_OPTIONS.find((o) => o.k === v)?.l ?? v;
}

export const GENDER_OPTIONS = [
  "Woman",
  "Man",
  "Non-binary",
  "Two-Spirit",
  "Prefer not to say",
  "Other",
] as const;

export const SEXUAL_ORIENTATION_OPTIONS = [
  "Heterosexual",
  "Gay",
  "Lesbian",
  "Bisexual",
  "Queer",
  "Two-Spirit",
  "Prefer not to say",
  "Other",
] as const;

export const INDIGENOUS_IDENTITY_OPTIONS = [
  "First Nations",
  "Métis",
  "Inuit",
  "Not Indigenous",
  "Prefer not to say",
] as const;

export const STATUS_IN_CANADA_OPTIONS = [
  "Citizen",
  "Permanent Resident",
  "Protected Person / Refugee",
  "Refugee Claimant",
  "Work Permit",
  "Study Permit",
  "Other",
] as const;

// Common Ontario social-housing ethnicity / cultural-background groupings.
export const ETHNICITY_OPTIONS = [
  "Black / African / Caribbean",
  "East Asian",
  "South Asian",
  "Southeast Asian",
  "Middle Eastern / West Asian",
  "Latin American",
  "White / European",
  "Indigenous",
  "Mixed / Multiple",
  "Prefer not to say",
  "Other",
] as const;

// Relationship of an occupant to the main (lead) tenant.
export const RELATIONSHIP_OPTIONS = [
  "Self",
  "Spouse / Partner",
  "Child",
  "Parent",
  "Sibling",
  "Grandparent",
  "Grandchild",
  "Other Relative",
  "Roommate / Co-tenant",
  "Caregiver",
  "Other",
] as const;

// Languages commonly captured at WoodGreen-area properties (spoken /
// correspondence). Not exhaustive — free text is still accepted.
export const LANGUAGE_OPTIONS = [
  "English",
  "French",
  "Spanish",
  "Mandarin",
  "Cantonese",
  "Portuguese",
  "Arabic",
  "Tamil",
  "Tagalog",
  "Somali",
  "Farsi / Dari",
  "Urdu",
  "Other",
] as const;

// Coarse age bands derived from DOB for the list view (never shows raw DOB).
export const AGE_BANDS = [
  "0-17",
  "18-24",
  "25-34",
  "35-44",
  "45-54",
  "55-64",
  "65-74",
  "75+",
] as const;

// Derive an integer age from a raw DOB (used in the profile drawer only).
export function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 && age < 130 ? age : null;
}

// Map an age (or DOB) to its coarse band — the only age signal the list shows.
export function bandFromAge(age: number | null): string | null {
  if (age == null) return null;
  if (age < 18) return "0-17";
  if (age < 25) return "18-24";
  if (age < 35) return "25-34";
  if (age < 45) return "35-44";
  if (age < 55) return "45-54";
  if (age < 65) return "55-64";
  if (age < 75) return "65-74";
  return "75+";
}
