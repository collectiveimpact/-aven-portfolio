import { getMessageStats, getAuditReport } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { AnalyticsTabs } from "./analytics-tabs";

// Communications analytics — live delivery/audit aggregates with clearly-labelled
// representative figures for metrics that don't yet have a live source. Organized
// into rich-chart tabs: Overview / Deliverability / Engagement / Signage /
// Audience / Reports.
export default async function AnalyticsPage() {
  const [stats, audit, me] = await Promise.all([
    getMessageStats(),
    getAuditReport(),
    getCurrentUser(),
  ]);

  return (
    <main className="f5-content">
      <div className="f5-page-title">Analytics</div>
      <div className="f5-page-sub">Deliverability, engagement, signage, and compliance reporting across every channel.</div>
      <AnalyticsTabs stats={stats} audit={audit} orgName={me?.orgName ?? "WoodGreen Community Housing"} />
    </main>
  );
}
