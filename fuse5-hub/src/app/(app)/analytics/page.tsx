import { getMessageStats, getAuditReport } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { getScope } from "@/lib/view";
import { PROVIDER_COMPLIANCE } from "@/lib/platform-admin";
import { ProviderFilter } from "@/components/provider-filter";
import { AnalyticsTabs } from "./analytics-tabs";

// Communications analytics — live delivery/audit aggregates with clearly-labelled
// representative figures for metrics that don't yet have a live source. Organized
// into rich-chart tabs: Overview / Deliverability / Engagement / Signage /
// Audience / Reports.
export default async function AnalyticsPage() {
  const [stats, audit, me, scope] = await Promise.all([
    getMessageStats(),
    getAuditReport(),
    getCurrentUser(),
    getScope(),
  ]);
  const providerNames = [...new Set(PROVIDER_COMPLIANCE.map((p) => p.provider))];

  return (
    <main className="f5-content">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <ProviderFilter providers={providerNames} value={scope.providerName} />
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div className="f5-page-title" style={{ marginTop: 0 }}>Analytics</div>
          <div className="f5-page-sub">Deliverability, engagement, signage, and compliance{scope.providerName ? ` — ${scope.providerName}` : " across every channel"}.</div>
        </div>
      </div>
      <AnalyticsTabs stats={stats} audit={audit} orgName={scope.providerName ?? me?.orgName ?? "WoodGreen Community Housing"} />
    </main>
  );
}
