// Demographics layer for the resident directory. Mirrors a Yardi social-housing
// (Voyager / RentCafe Affordable) export for an Ontario provider. Banded fields
// (age, income) are intentionally coarse — we never carry a raw DOB or income.
// A Yardi feed maps into ResidentDemographics; see lib/residents/queries.ts.

export type OccupantType = "head_of_household" | "co_tenant" | "occupant" | "dependent";
export type Mobility = "none" | "cane_walker" | "wheelchair" | "mobility_scooter";
export type SubsidyType = "rgi" | "market" | "portable_housing_benefit" | "affordable";

export interface ResidentDemographics {
  householdSize: number | null;
  householdComposition: string | null;
  occupantType: OccupantType | null;
  ageBand: string | null;
  dependents: number | null;

  primaryLanguage: string | null;
  secondaryLanguages: string[];
  interpreterRequired: boolean;

  accessibilityNeeds: string[];
  mobility: Mobility | null;
  serviceAnimal: boolean;
  emergencyAssembly: string | null;

  incomeBand: string | null;
  subsidyType: SubsidyType | null;
  rentShare: number | null;

  supportAgency: string | null;
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
