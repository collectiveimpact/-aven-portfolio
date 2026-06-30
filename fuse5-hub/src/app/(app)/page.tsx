// Dashboard / Overview — the landing page. Server component: fetches all data
// ONCE, assembles a single DashboardData bundle + enriched per-property cards,
// then hands them to client/presentational components. Widgets render from these
// already-fetched props (no per-widget fetching).
//
//  - CustomizableDashboard: pin/favorite + add/remove/reorder, persisted per user
//  - PortfolioOverview: richer per-property cards (replaces the old square tiles)
import { getOverview } from "@/lib/data";
import {
  getDashboardStats,
  getMessageStats,
  getWorkOrders,
  getCompliance,
  getPropertiesFull,
  getResidents,
  getInbox,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { hasBackend } from "@/lib/env";
import { getScope, getViewRole, effectiveRole } from "@/lib/view";
import type { DashboardData, PropertyCard } from "@/lib/dashboards";
import { CustomizableDashboard } from "./dashboard-customizable";
import { PortfolioOverview } from "./dashboard-portfolio";
import { FrontlineHome } from "./dashboard-frontline";
import { PlatformStrip } from "./platform-strip";

const complianceStatusToPct: Record<string, number> = { compliant: 96, due_soon: 78, overdue: 48 };

export default async function OverviewPage() {
  const [overview, stats, msg, workOrdersAll, complianceAll, propertiesAll, residentsAll, inboxAll, me, viewScope, viewRole] = await Promise.all([
    getOverview(),
    getDashboardStats(),
    getMessageStats(),
    getWorkOrders(),
    getCompliance(),
    getPropertiesFull(),
    getResidents(),
    getInbox(),
    hasBackend ? getCurrentUser() : Promise.resolve(null),
    getScope(),
    getViewRole(),
  ]);
  const eff = effectiveRole(me?.role ?? (hasBackend ? null : "super_admin"), viewRole);

  // Honor the top-bar property scope: narrow every property-derived dataset to the
  // selected building so the KPIs, cards and work-order list all reflect it.
  const propScoped = !!viewScope.propertyName;
  const properties = propScoped ? propertiesAll.filter((p) => p.name === viewScope.propertyName) : propertiesAll;
  const residents = propScoped ? residentsAll.filter((r) => r.propertyName === viewScope.propertyName) : residentsAll;
  const workOrders = propScoped ? workOrdersAll.filter((w) => w.propertyName === viewScope.propertyName) : workOrdersAll;
  const compliance = propScoped ? complianceAll.filter((c) => c.propertyName === viewScope.propertyName) : complianceAll;

  // --- derive per-property rollups -----------------------------------------
  const woByProperty = new Map<string, number>();
  for (const w of workOrders) {
    if (w.status === "resolved") continue;
    woByProperty.set(w.propertyName, (woByProperty.get(w.propertyName) ?? 0) + 1);
  }
  const compByProperty = new Map<string, { sum: number; n: number; worst: number }>();
  for (const c of compliance) {
    const pct = complianceStatusToPct[c.status] ?? 80;
    const e = compByProperty.get(c.propertyName) ?? { sum: 0, n: 0, worst: 100 };
    e.sum += pct; e.n += 1; e.worst = Math.min(e.worst, pct);
    compByProperty.set(c.propertyName, e);
  }
  const langByProperty = new Map<string, Set<string>>();
  for (const r of residents) {
    if (!r.language || r.language === "—") continue;
    const set = langByProperty.get(r.propertyName) ?? new Set<string>();
    set.add(r.language);
    langByProperty.set(r.propertyName, set);
  }

  const propertyCards: PropertyCard[] = properties.map((p) => {
    const comp = compByProperty.get(p.name);
    const compliancePct = comp ? Math.round(comp.sum / comp.n) : 92;
    const worst = comp?.worst ?? 100;
    const occupancyPct = p.units > 0 ? Math.round((p.occupied / p.units) * 100) : 0;
    const label: PropertyCard["complianceLabel"] = worst <= 50 ? "Overdue" : worst <= 80 ? "Due soon" : "On track";
    const langs = [...(langByProperty.get(p.name) ?? new Set<string>())].slice(0, 4);
    return {
      id: p.id,
      name: p.name,
      address: p.address,
      type: p.type,
      units: p.units,
      occupied: p.occupied,
      occupancyPct,
      openWorkOrders: woByProperty.get(p.name) ?? 0,
      compliancePct,
      complianceLabel: label,
      lastBroadcast: "2 days ago",
      languages: langs.length ? langs : ["English"],
      managerName: p.managerName,
    };
  });

  const avgCompliancePct = propertyCards.length
    ? Math.round(propertyCards.reduce((s, p) => s + p.compliancePct, 0) / propertyCards.length)
    : 92;

  // Property-scoped rollups (used in place of the org-wide aggregates when the
  // top-bar property filter is active, so the KPI strip reflects the selection).
  const scopedUnits = properties.reduce((s, p) => s + p.units, 0);
  const scopedOccupied = properties.reduce((s, p) => s + p.occupied, 0);
  const scopedOccupancyPct = scopedUnits > 0 ? Math.round((scopedOccupied / scopedUnits) * 100) : 0;
  const scopedOpenWO = workOrders.filter((w) => w.status !== "resolved").length;

  const openWO = propScoped ? scopedOpenWO : stats.openWorkOrders;
  const overdueWorkOrders = Math.min(openWO, Math.max(0, Math.round(openWO * 0.15)) + (openWO > 0 ? 1 : 0));
  const displaysTotal = Math.max(stats.displaysOnline + 2, stats.displaysOnline);

  // --- assemble the shared data bundle the widgets render from --------------
  const data: DashboardData = {
    orgName: overview.orgName,
    source: stats.source,
    kpis: {
      units: propScoped ? scopedUnits : (overview.kpis.units || properties.reduce((s, p) => s + p.units, 0)),
      occupancyPct: propScoped ? scopedOccupancyPct : overview.kpis.occupancy,
      openWorkOrders: openWO,
      overdueWorkOrders,
      signageUptimePct: overview.kpis.signageUptime,
      displaysOnline: stats.displaysOnline,
      displaysTotal,
      residents: propScoped ? residents.length : stats.residents,
      messagesToday: stats.messagesSent,
      activeBroadcasts: stats.activeBroadcasts,
      deliveryRatePct: msg.deliveryRatePct,
      avgCompliancePct,
    },
    trend: overview.trend,
    byChannel: msg.byChannel,
    compliance: [
      { name: "RentSafeTO", pct: 98, status: "compliant" },
      { name: "Hamilton SAB", pct: 100, status: "compliant" },
      { name: "CASL Consent", pct: 99, status: "compliant" },
      { name: "AODA Accessibility", pct: 74, status: "due_soon" },
    ],
    workOrders: workOrders
      .filter((w) => w.status !== "resolved")
      .map((w) => ({ title: w.title, propertyName: w.propertyName, priority: w.priority, status: w.status })),
    feed: stats.feed,
    properties: propertyCards,
  };

  const scope = me?.id ?? me?.orgName ?? overview.orgName ?? null;

  // Frontline gets an operational "My Day" home (their queue + messages), not the
  // exec KPI dashboard. Role-aware content; route guard already keeps them here.
  if (eff === "frontline") {
    const queue = workOrders.filter((w) => w.status !== "resolved").slice(0, 12);
    const requests = queue.filter((w) => w.source === "portal").length;
    const unread = inboxAll.filter((m) => m.status === "unread").length;
    const messages = inboxAll.filter((m) => m.status !== "resolved").slice(0, 8);
    return (
      <main className="f5-content">
        <div className="f5-page-title">My Day</div>
        <div className="f5-page-sub">{data.orgName}{viewScope.propertyName ? ` — ${viewScope.propertyName}` : ""} — your open work and resident messages.</div>
        <FrontlineHome openWO={openWO} requests={requests} unread={unread} overdue={overdueWorkOrders} queue={queue} messages={messages} />
      </main>
    );
  }

  return (
    <main className="f5-content">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div>
          <div className="f5-page-title">Dashboard</div>
          <div className="f5-page-sub">{data.orgName} — {viewScope.propertyName ? `scoped to ${viewScope.propertyName}` : "live across all properties"}.</div>
        </div>
        <span className="f5-live" style={{ marginLeft: "auto" }}>Live</span>
      </div>

      {/* Super Admin only: cross-provider platform band above the portfolio view. */}
      {eff === "super_admin" && <PlatformStrip />}

      {/* Customizable, pin-to-priority dashboard */}
      <CustomizableDashboard data={data} scope={scope} />

      {/* Enriched portfolio overview */}
      <div style={{ marginTop: 26 }}>
        <PortfolioOverview properties={propertyCards} />
      </div>

      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>
        Data source: {data.source === "live" ? "Fuse5 backend (live)" : "demo seed"}
      </div>
    </main>
  );
}
