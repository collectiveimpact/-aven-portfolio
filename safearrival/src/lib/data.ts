import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { DashboardData } from "@/lib/types";

// Demo dataset — used when SafeArrival's own backend isn't connected yet.
// Numbers mirror the v2.0.x SafeArrival prototype for visual continuity.
const DEMO: DashboardData = {
  orgName: "Boys & Girls Club — Durham",
  programs: [
    { id: "p1", name: "After-School Care", active: true },
    { id: "p2", name: "Scouts Canada — Troop 47", active: true },
    { id: "p3", name: "Girl Guides — Scarborough", active: true },
    { id: "p4", name: "Summer Camp", active: true },
    { id: "p5", name: "City of Toronto — AfterSchoolTO", active: true },
    { id: "p6", name: "Durham Community Basketball", active: true },
    { id: "p7", name: "Jane-Finch Community Hub", active: true },
    { id: "p8", name: "Pathways to Education", active: true },
  ],
  kpis: { present: 847, enrolled: 895, presentPct: 94.6, activeAlerts: 2, escalating: 2, checkedOut: 38, parentResponsePct: 97.1 },
  weeklyTrend: [
    { label: "Mon", value: 812 }, { label: "Tue", value: 854 }, { label: "Wed", value: 871 },
    { label: "Thu", value: 833 }, { label: "Fri", value: 847 }, { label: "Sat", value: 410 }, { label: "Sun", value: 0 },
  ],
  activity: [
    { who: "Amara J.", what: "checked in", program: "After-School Care", when: "2 min ago", tone: "ok" },
    { who: "Sofia R.", what: "no check-in — escalated", program: "Scouts Troop 47", when: "8 min ago", tone: "alert" },
    { who: "Liam C.", what: "checked in", program: "After-School Care", when: "11 min ago", tone: "ok" },
    { who: "Noah W.", what: "incident logged (minor)", program: "Summer Camp", when: "26 min ago", tone: "warn" },
    { who: "Maya P.", what: "checked out to guardian", program: "AfterSchoolTO", when: "31 min ago", tone: "ok" },
  ],
  source: "demo",
};

/**
 * Dashboard data for the signed-in org. Uses SafeArrival's own backend when
 * configured; otherwise returns the demo dataset so the app runs standalone.
 */
export async function getDashboardData(): Promise<DashboardData> {
  const supabase = await createClient();
  if (!supabase) return DEMO;

  try {
    // Live path (best-effort; RLS scopes everything to the user's org).
    const { data: org } = await supabase.from("organizations").select("name").limit(1).single();
    const { data: programs } = await supabase.from("programs").select("id,name,active").eq("active", true);
    const today = new Date().toISOString().slice(0, 10);
    const { count: present } = await supabase.from("attendance_days")
      .select("id", { count: "exact", head: true }).eq("day", today).eq("status", "present");
    const { count: enrolled } = await supabase.from("children")
      .select("id", { count: "exact", head: true });
    const { count: activeAlerts } = await supabase.from("absences")
      .select("id", { count: "exact", head: true }).in("state", ["open", "notifying", "escalated"]);
    const { count: checkedOut } = await supabase.from("attendance_days")
      .select("id", { count: "exact", head: true }).eq("day", today).eq("status", "checked_out");

    return {
      orgName: org?.name ?? DEMO.orgName,
      programs: (programs ?? []).map((p) => ({ id: p.id, name: p.name, active: p.active })),
      kpis: {
        present: present ?? 0,
        enrolled: enrolled ?? 0,
        presentPct: enrolled ? Math.round(((present ?? 0) / enrolled) * 1000) / 10 : 0,
        activeAlerts: activeAlerts ?? 0,
        escalating: activeAlerts ?? 0,
        checkedOut: checkedOut ?? 0,
        parentResponsePct: 0,
      },
      weeklyTrend: DEMO.weeklyTrend,
      activity: DEMO.activity,
      source: "live",
    };
  } catch {
    return DEMO;
  }
}
