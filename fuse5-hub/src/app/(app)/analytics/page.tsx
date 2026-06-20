import { getMessageStats, getAuditReport } from "@/lib/queries";
import { AnalyticsTabs } from "./analytics-tabs";

// Messaging analytics — live delivery aggregates with demo fallback, organized
// into the prototype's tabs (Overview / Devices / Channels / Engagement /
// Compliance / Reports).
export default async function AnalyticsPage() {
  const [stats, audit] = await Promise.all([getMessageStats(), getAuditReport()]);

  return (
    <main className="f5-content">
      <div className="f5-page-title">Analytics</div>
      <div className="f5-page-sub">Delivery, engagement, signage, and compliance reporting across all channels.</div>
      <AnalyticsTabs stats={stats} audit={audit} />
    </main>
  );
}
