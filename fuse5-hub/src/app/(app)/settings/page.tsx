import Link from "next/link";
import { getOrgSettings, getSegments } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";

export default async function SettingsPage() {
  const [settings, segments, me] = await Promise.all([getOrgSettings(), getSegments(), getCurrentUser()]);
  const orgName = me?.orgName ?? "Your Organization";

  const Toggle = ({ on, label }: { on: boolean; label: string }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--f5-border)" }}>
      <span style={{ fontSize: 13, color: "var(--f5-text-secondary)" }}>{label}</span>
      <span className={`f5-badge ${on ? "ok" : ""}`}>{on ? "Collecting" : "Off"}</span>
    </div>
  );

  return (
    <main className="f5-content">
      <div className="f5-page-title">Settings</div>
      <div className="f5-page-sub">Organization configuration, audience groups, and data collection.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 18, alignItems: "start" }}>
        {/* Org profile */}
        <div className="f5-card">
          <div className="f5-section-title" style={{ marginTop: 0 }}>Organization</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px", fontSize: 13 }}>
            <span style={{ color: "var(--f5-text-muted)" }}>Name</span><span style={{ color: "var(--f5-text)" }}>{orgName}</span>
            <span style={{ color: "var(--f5-text-muted)" }}>Plan</span><span>Growth</span>
            <span style={{ color: "var(--f5-text-muted)" }}>Data residency</span><span>{settings.dataResidency}</span>
            <span style={{ color: "var(--f5-text-muted)" }}>Audit reports</span><span style={{ textTransform: "capitalize" }}>{settings.auditReportCadence} · PDF</span>
          </div>
        </div>

        {/* Data collection */}
        <div className="f5-card">
          <div className="f5-section-title" style={{ marginTop: 0 }}>Data Collection</div>
          <Toggle on={settings.collectDeliveryLogs} label="Delivery logs (email / SMS)" />
          <Toggle on={settings.collectProofOfPlay} label="Signage proof-of-play" />
          <Toggle on={settings.collectAcknowledgements} label="Acknowledgements / responses" />
        </div>

        {/* Tenant groups */}
        <div className="f5-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="f5-section-title" style={{ margin: 0 }}>Tenant Groups</div>
            <Link href="/segments" className="f5-btn" style={{ padding: "5px 12px", fontSize: 12 }}>Manage</Link>
          </div>
          <div style={{ marginTop: 10 }}>
            {segments.map((g) => (
              <div key={g.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--f5-border)", fontSize: 13 }}>
                <span style={{ color: "var(--f5-text)" }}>{g.name}</span>
                <span style={{ color: "var(--f5-text-muted)" }}>{g.size} tenants</span>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration shortcuts */}
        <div className="f5-card">
          <div className="f5-section-title" style={{ marginTop: 0 }}>Configuration</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Link href="/workorders/fields" className="f5-btn" style={{ justifyContent: "space-between" }}>Work Order / Notice Fields <span>→</span></Link>
            <Link href="/channels" className="f5-btn" style={{ justifyContent: "space-between" }}>Channels <span>→</span></Link>
            <Link href="/integrations" className="f5-btn" style={{ justifyContent: "space-between" }}>Integrations <span>→</span></Link>
            <Link href="/admin" className="f5-btn" style={{ justifyContent: "space-between" }}>Users &amp; Roles <span>→</span></Link>
          </div>
        </div>
      </div>
    </main>
  );
}
