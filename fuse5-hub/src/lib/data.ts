import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { OverviewData } from "@/lib/types";

/** Shared org context (demo). Section pages may import for the topbar label. */
export const DEMO_ORG = "WoodGreen Community Housing";

const DEMO_OVERVIEW: OverviewData = {
  orgName: DEMO_ORG,
  kpis: { units: 2847, occupancy: 96.4, openWorkOrders: 47, signageUptime: 97.1 },
  alerts: [
    { tone: "alert", title: "Display #14 Offline", detail: "WoodGreen East York, Main Lobby. No heartbeat for 3h 22m.", when: "09:41 AM" },
    { tone: "alert", title: "7 Work Orders Overdue", detail: "HNHC Portfolio. Oldest: 14 days past SLA.", when: "Yesterday" },
    { tone: "warn", title: "SMS Delivery Rate Drop", detail: "84.2% (threshold 90%). Carrier issue flagged.", when: "2h ago" },
    { tone: "warn", title: "Compliance Inspection Due", detail: "Hamilton Kiwanis, Building B. RentSafeTO audit in 6 days.", when: "Apr 17" },
  ],
  trend: [
    { label: "Jan", value: 71 }, { label: "Feb", value: 78 }, { label: "Mar", value: 82 },
    { label: "Apr", value: 88 }, { label: "May", value: 84 }, { label: "Jun", value: 95 },
  ],
  source: "demo",
};

/** Portfolio overview for the signed-in org; demo data until backend is live. */
export async function getOverview(): Promise<OverviewData> {
  const supabase = await createClient();
  if (!supabase) return DEMO_OVERVIEW;
  try {
    const { data: org } = await supabase.from("organizations").select("name").limit(1).single();
    const { count: units } = await supabase.from("residents").select("id", { count: "exact", head: true });
    const { count: openWO } = await supabase.from("work_orders").select("id", { count: "exact", head: true }).neq("status", "resolved");
    return {
      ...DEMO_OVERVIEW,
      orgName: org?.name ?? DEMO_ORG,
      kpis: { ...DEMO_OVERVIEW.kpis, units: units ?? 0, openWorkOrders: openWO ?? 0 },
      source: "live",
    };
  } catch {
    return DEMO_OVERVIEW;
  }
}
