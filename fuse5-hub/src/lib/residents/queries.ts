import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getResidents, getWorkOrders, type ResidentRow } from "@/lib/queries";
import { DEMO_FALLBACK } from "@/lib/env";
import type {
  ResidentDemographics,
  ResidentWithDemographics,
  ResidentCommEntry,
  ResidentWorkOrder,
  ResidentSurveyEntry,
} from "./types";

// Server query layer for the demographics-enriched resident directory. Reads
// LIVE from `resident_demographics` (RLS-scoped to the caller's org) when the
// backend is configured; otherwise (or for residents with no demographics row
// yet) derives a deterministic, professional demo profile so the UI is never
// empty in demo mode. A Yardi feed upserts the real rows later.

function fb<T>(demo: T, real: T): T { return DEMO_FALLBACK ? demo : real; }

const hash = (seed: string) => seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);

const AGE_BANDS = ["25-34", "35-44", "45-54", "55-64", "65-74", "75+"];
const COMPOSITIONS = ["Single adult", "Lone parent + 1 child", "Lone parent + 2 children", "Senior couple", "Multi-generational"];
const INCOME_BANDS = ["0-15k", "15-30k", "30-45k", "45-60k"];
const AGENCIES = ["LOFT Community Services", "CMHA Toronto", "WoodGreen Community Services", "Fred Victor", "—"];
const CASE_WORKERS = ["Priya Anand", "Marcus Bell", "Sofia Rossi", "Daniel Owusu", "—"];
const MOBILITY = ["none", "cane_walker", "wheelchair", "none"] as const;
const ACCESS_SETS = [[], ["large_print"], ["visual_alerts"], ["step_free", "large_print"], ["plain_language"]];
const EMERGENCY = [
  { name: "Linda Chen", rel: "Sister", phone: "416-555-0142" },
  { name: "Marc Roy", rel: "Spouse", phone: "416-555-0188" },
  { name: "Aisha Khan", rel: "Parent", phone: "416-555-0211" },
  { name: "—", rel: "—", phone: "—" },
];

// Deterministically derive a full demographics layer for demo mode.
function demoDemographics(r: Pick<ResidentRow, "id" | "name" | "language" | "preferredChannel" | "status">): ResidentDemographics {
  const h = hash(r.id + r.name);
  const size = 1 + (h % 4);
  const em = EMERGENCY[h % EMERGENCY.length];
  return {
    householdSize: size,
    householdComposition: COMPOSITIONS[h % COMPOSITIONS.length],
    occupantType: h % 3 === 0 ? "head_of_household" : "occupant",
    ageBand: AGE_BANDS[h % AGE_BANDS.length],
    dependents: Math.max(0, size - 1 - (h % 2)),
    primaryLanguage: r.language && r.language !== "—" ? r.language : "English",
    secondaryLanguages: h % 4 === 0 ? ["English"] : [],
    interpreterRequired: h % 6 === 0,
    accessibilityNeeds: ACCESS_SETS[h % ACCESS_SETS.length],
    mobility: MOBILITY[h % MOBILITY.length],
    serviceAnimal: h % 7 === 0,
    emergencyAssembly: h % 4 === 1 ? "Mobility-assisted assembly point B" : "Standard assembly point A",
    incomeBand: INCOME_BANDS[h % INCOME_BANDS.length],
    subsidyType: h % 5 === 0 ? "affordable" : "rgi",
    rentShare: 280 + (h % 12) * 35,
    supportAgency: AGENCIES[h % AGENCIES.length],
    caseWorker: CASE_WORKERS[h % CASE_WORKERS.length],
    caseWorkerContact: h % 5 === 4 ? "—" : `416-555-0${300 + (h % 600)}`,
    emergencyContactName: em.name,
    emergencyContactPhone: em.phone,
    emergencyContactRelation: em.rel,
    consentCasl: true,
    consentSms: r.preferredChannel === "sms" || h % 2 === 0,
    consentDataSharing: h % 3 !== 0,
    consentEmergencyOnly: true,
    consentUpdatedAt: "2026-02-14",
    notes: null,
    source: "yardi",
    updatedAt: "2026-02-14",
  };
}

const TENANCY_STARTS = ["2022-03-15", "2021-07-01", "2023-01-09", "2020-11-22"];
const LAST_CONTACT = ["2026-06-24", "2026-06-19", "2026-06-26", "2026-06-05"];

function demoTenancy(r: Pick<ResidentRow, "id" | "name" | "status">) {
  const h = hash(r.id + r.name);
  return {
    tenantCode: `T-2024${String(1000 + (h % 9000))}-001`,
    tenancyStart: TENANCY_STARTS[h % TENANCY_STARTS.length],
    tenancyEnd: r.status === "moved_out" ? "2026-04-30" : null,
    lastContactedAt: LAST_CONTACT[h % LAST_CONTACT.length],
  };
}

type DemoRow = Record<string, unknown>;

function mapDemographics(d: DemoRow): ResidentDemographics {
  return {
    householdSize: (d.household_size as number) ?? null,
    householdComposition: (d.household_composition as string) ?? null,
    occupantType: (d.occupant_type as ResidentDemographics["occupantType"]) ?? null,
    ageBand: (d.age_band as string) ?? null,
    dependents: (d.dependents as number) ?? null,
    primaryLanguage: (d.primary_language as string) ?? null,
    secondaryLanguages: (d.secondary_languages as string[]) ?? [],
    interpreterRequired: !!d.interpreter_required,
    accessibilityNeeds: (d.accessibility_needs as string[]) ?? [],
    mobility: (d.mobility as ResidentDemographics["mobility"]) ?? null,
    serviceAnimal: !!d.service_animal,
    emergencyAssembly: (d.emergency_assembly as string) ?? null,
    incomeBand: (d.income_band as string) ?? null,
    subsidyType: (d.subsidy_type as ResidentDemographics["subsidyType"]) ?? null,
    rentShare: (d.rent_share as number) ?? null,
    supportAgency: (d.support_agency as string) ?? null,
    caseWorker: (d.case_worker as string) ?? null,
    caseWorkerContact: (d.case_worker_contact as string) ?? null,
    emergencyContactName: (d.emergency_contact_name as string) ?? null,
    emergencyContactPhone: (d.emergency_contact_phone as string) ?? null,
    emergencyContactRelation: (d.emergency_contact_relation as string) ?? null,
    consentCasl: !!d.consent_casl,
    consentSms: !!d.consent_sms,
    consentDataSharing: !!d.consent_data_sharing,
    consentEmergencyOnly: d.consent_emergency_only === undefined ? true : !!d.consent_emergency_only,
    consentUpdatedAt: (d.consent_updated_at as string) ?? null,
    notes: (d.notes as string) ?? null,
    source: (d.source as ResidentDemographics["source"]) ?? "manual",
    updatedAt: (d.updated_at as string) ?? null,
  };
}

function fmtDate(v: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

// ---- list ------------------------------------------------------------------

// Directory list, each resident joined to its demographics layer. Live rows are
// indexed by resident_id; residents without a demographics row fall back to a
// deterministic demo profile in demo mode (else null).
export async function getResidentsWithDemographics(): Promise<ResidentWithDemographics[]> {
  const residents = await getResidents();
  const s = await createClient();

  let live: Map<string, ResidentDemographics> | null = null;
  let tenancy: Map<string, { tenantCode: string | null; tenancyStart: string | null; tenancyEnd: string | null; lastContactedAt: string | null }> | null = null;

  if (s) {
    try {
      const ids = residents.map((r) => r.id);
      const { data } = await s.from("resident_demographics").select("*").in("resident_id", ids);
      live = new Map((data ?? []).map((d) => [d.resident_id as string, mapDemographics(d)]));
      const { data: res } = await s
        .from("residents")
        .select("id,tenant_code,tenancy_start,tenancy_end,last_contacted_at")
        .in("id", ids);
      tenancy = new Map(
        (res ?? []).map((r) => [
          r.id as string,
          {
            tenantCode: (r.tenant_code as string) ?? null,
            tenancyStart: (r.tenancy_start as string) ?? null,
            tenancyEnd: (r.tenancy_end as string) ?? null,
            lastContactedAt: (r.last_contacted_at as string) ?? null,
          },
        ]),
      );
    } catch { live = null; tenancy = null; }
  }

  return residents.map((r) => {
    const liveDemo = live?.get(r.id) ?? null;
    const demographics = liveDemo ?? (fb(demoDemographics(r), null));
    const liveTen = tenancy?.get(r.id);
    const ten = liveTen ?? fb(demoTenancy(r), { tenantCode: null as string | null, tenancyStart: null as string | null, tenancyEnd: null as string | null, lastContactedAt: null as string | null });
    return {
      ...r,
      tenantCode: ten.tenantCode,
      tenancyStart: ten.tenancyStart,
      tenancyEnd: ten.tenancyEnd,
      lastContactedAt: ten.lastContactedAt,
      demographics,
    };
  });
}

// ---- detail ----------------------------------------------------------------

export interface ResidentProfileData {
  resident: ResidentWithDemographics;
  comms: ResidentCommEntry[];
  workOrders: ResidentWorkOrder[];
  surveys: ResidentSurveyEntry[];
}

// Full profile bundle for one resident: demographics + communication history,
// work orders against their unit, and survey participation. History tables stay
// graceful when data is thin (empty arrays render an empty-state row).
export async function getResidentProfile(id: string): Promise<ResidentProfileData | null> {
  const all = await getResidentsWithDemographics();
  const resident = all.find((r) => r.id === id);
  if (!resident) return null;

  const comms = await getResidentComms(resident);
  const workOrders = await getResidentWorkOrders(resident);
  const surveys = await getResidentSurveys(resident);

  return { resident, comms, workOrders, surveys };
}

// Communication / consent timeline. Reads message_recipients when available,
// otherwise a deterministic demo timeline so the profile is never blank.
async function getResidentComms(resident: ResidentWithDemographics): Promise<ResidentCommEntry[]> {
  const s = await createClient();
  if (s) {
    try {
      const { data } = await s
        .from("message_recipients")
        .select("status,channel,messages(subject,created_at)")
        .eq("resident_id", resident.id)
        .limit(12);
      if (data?.length) {
        const rows = data.map((m) => {
          const msg = m.messages as { subject?: string; created_at?: string } | { subject?: string; created_at?: string }[] | null;
          const one = Array.isArray(msg) ? msg[0] : msg;
          return {
            when: fmtDate(one?.created_at ?? null),
            _ts: one?.created_at ? new Date(one.created_at).getTime() : 0,
            what: one?.subject ?? "Notice",
            channel: m.channel ?? "—",
            status: m.status ?? "Sent",
          };
        });
        rows.sort((a, b) => b._ts - a._ts);
        return rows.map((r) => ({ when: r.when, what: r.what, channel: r.channel, status: r.status }));
      }
    } catch { /* fall through to demo */ }
  }
  return fb(demoComms(resident), []);
}

function demoComms(resident: ResidentWithDemographics): ResidentCommEntry[] {
  const h = hash(resident.id + resident.name);
  const base: ResidentCommEntry[] = [
    { when: "Apr 10, 2026", what: "Water shutoff notice", channel: "SMS", status: "Delivered" },
    { when: "Apr 2, 2026", what: "Monthly newsletter", channel: "Email", status: "Opened" },
    { when: "Mar 21, 2026", what: "Maintenance follow-up", channel: "Email", status: "Replied" },
    { when: "Mar 4, 2026", what: "Community BBQ invite", channel: "Display", status: "Shown" },
  ];
  return base.slice(0, 2 + (h % 3));
}

// Work orders tied to the resident's unit (no resident FK on work_orders, so we
// match on unit within the directory). Falls back to the shared getWorkOrders.
async function getResidentWorkOrders(resident: ResidentWithDemographics): Promise<ResidentWorkOrder[]> {
  if (resident.unit === "—") return [];
  try {
    const all = await getWorkOrders();
    return all
      .filter((w) => w.unit === resident.unit && w.propertyName === resident.propertyName)
      .map((w) => ({ id: w.id, title: w.title, category: w.category, priority: w.priority, status: w.status }));
  } catch { return []; }
}

// Survey participation. Reads survey_responses when available; demo-derives a
// light participation record otherwise.
async function getResidentSurveys(resident: ResidentWithDemographics): Promise<ResidentSurveyEntry[]> {
  const s = await createClient();
  if (s) {
    try {
      const { data } = await s
        .from("survey_responses")
        .select("submitted_at,surveys(title,status)")
        .eq("resident_id", resident.id)
        .order("submitted_at", { ascending: false })
        .limit(8);
      if (data?.length) {
        return data.map((row) => {
          const sv = row.surveys as { title?: string; status?: string } | { title?: string; status?: string }[] | null;
          const one = Array.isArray(sv) ? sv[0] : sv;
          return { title: one?.title ?? "Survey", status: one?.status ?? "closed", respondedAt: fmtDate(row.submitted_at as string) };
        });
      }
    } catch { /* fall through */ }
  }
  return fb(demoSurveys(resident), []);
}

function demoSurveys(resident: ResidentWithDemographics): ResidentSurveyEntry[] {
  const h = hash(resident.id + resident.name);
  if (h % 3 === 0) return [];
  return [
    { title: "Annual Resident Satisfaction", status: "closed", respondedAt: "Mar 12, 2026" },
    ...(h % 2 === 0 ? [{ title: "Accessibility Needs Check-in", status: "live", respondedAt: "Jun 1, 2026" }] : []),
  ];
}

export { fmtDate };
