// Customizable-dashboard core types.
//
// A dashboard is a list of "placed" widgets. Each widget is defined once in the
// catalog (see catalog.tsx) and referenced by id in a user's saved layout. The
// layout is intentionally tiny + serializable (ids + flags) so it can live in
// localStorage today and migrate to a `user_dashboards` table later with zero
// shape changes — see persistence.ts for the storage helper and DB follow-up.

import type { ReactNode } from "react";

/** Visual footprint of a widget in the responsive grid (1 = quarter row … 4 = full row). */
export type WidgetSize = 1 | 2 | 3 | 4;

/** Catalog grouping for the "Add widget" picker. */
export type WidgetCategory =
  | "kpi"
  | "operations"
  | "compliance"
  | "comms"
  | "portfolio"
  | "activity";

export const CATEGORY_LABELS: Record<WidgetCategory, string> = {
  kpi: "KPI Tiles",
  operations: "Operations",
  compliance: "Compliance",
  comms: "Communications",
  portfolio: "Portfolio",
  activity: "Activity",
};

/**
 * The data the catalog renderers consume. The server page fetches everything
 * once and hands this single bundle to the client dashboard, so every widget
 * renders from already-fetched props (no per-widget fetching).
 */
export interface DashboardData {
  orgName: string;
  source: "live" | "demo";
  kpis: {
    units: number;
    occupancyPct: number;
    openWorkOrders: number;
    overdueWorkOrders: number;
    signageUptimePct: number;
    displaysOnline: number;
    displaysTotal: number;
    residents: number;
    messagesToday: number;
    activeBroadcasts: number;
    deliveryRatePct: number;
    avgCompliancePct: number;
  };
  trend: { label: string; value: number }[]; // occupancy / messages trend
  byChannel: { channel: string; sent: number; delivered: number }[];
  compliance: { name: string; pct: number; status: "compliant" | "due_soon" | "overdue" }[];
  workOrders: { title: string; propertyName: string; priority: string; status: string }[];
  feed: { actor: string; action: string; detail: string; when: string; tone: "ok" | "warn" | "alert" }[];
  properties: PropertyCard[];
}

/** Rich, per-property rollup used by the portfolio widgets + the enriched cards. */
export interface PropertyCard {
  id: string;
  name: string;
  address: string;
  type: string;
  units: number;
  occupied: number;
  occupancyPct: number;
  openWorkOrders: number;
  compliancePct: number;
  complianceLabel: "On track" | "Due soon" | "Overdue";
  lastBroadcast: string;
  languages: string[];
  managerName: string;
}

/** A widget definition in the catalog. */
export interface WidgetDef {
  id: string;
  title: string;
  description: string;
  category: WidgetCategory;
  size: WidgetSize;
  /** Pure renderer — receives the shared data bundle, returns a React node. */
  render: (data: DashboardData) => ReactNode;
}

/** One entry in a user's saved layout. */
export interface PlacedWidget {
  id: string;       // references a WidgetDef.id
  pinned: boolean;  // pinned widgets float to the "Priority" zone, shown first
}

/** A user's whole saved dashboard. Versioned so future migrations are safe. */
export interface DashboardLayout {
  version: 1;
  widgets: PlacedWidget[];
}
