// Shapes mirror safearrival/supabase/migrations/0001_init.sql.
export type SaRole =
  | "org_admin"
  | "program_director"
  | "coordinator"
  | "staff"
  | "viewer"
  | "parent";

export interface Organization { id: string; name: string; slug: string; region: string | null }
export interface Program { id: string; org_id: string; name: string; site: string | null; active: boolean }
export interface Child { id: string; org_id: string; program_id: string | null; first_name: string; last_name: string; grade: string | null }

export interface Absence {
  id: string; org_id: string; child_id: string; program_id: string; day: string;
  state: "open" | "notifying" | "escalated" | "resolved"; reason: string | null;
}

export interface Incident {
  id: string; org_id: string; severity: "low" | "medium" | "high" | "critical";
  summary: string; status: "open" | "investigating" | "closed"; created_at: string;
}

export interface ActivityItem { who: string; what: string; program: string; when: string; tone: "ok" | "warn" | "alert" }

export interface DashboardData {
  orgName: string;
  programs: { id: string; name: string; active: boolean }[];
  kpis: { present: number; enrolled: number; presentPct: number; activeAlerts: number; escalating: number; checkedOut: number; parentResponsePct: number };
  weeklyTrend: { label: string; value: number }[];
  activity: ActivityItem[];
  source: "live" | "demo";
}
