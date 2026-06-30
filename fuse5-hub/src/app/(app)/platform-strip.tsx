import Link from "next/link";
import { PROVIDER_COMPLIANCE, BILLING_MRR, BILLING_SUMMARY } from "@/lib/platform-admin";

// Super-Admin-only cross-provider band shown ABOVE the portfolio dashboard. Gives
// Fuse5 staff the platform view (providers, properties, MRR/ARR) that a single
// housing provider never sees. Links into the Admin platform console.
export function PlatformStrip() {
  const providers = PROVIDER_COMPLIANCE.length;
  const totalProperties = PROVIDER_COMPLIANCE.reduce((s, p) => s + (p.properties || 0), 0);
  const active = BILLING_MRR.filter((b) => b.status === "Active").length;
  const fmt = (n: number) => `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;

  return (
    <div className="f5-card" style={{ marginTop: 16, borderColor: "var(--f5-teal, #00CCCC)" }}>
      <div className="f5-section-title" style={{ margin: "0 0 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>✦ Fuse5 Platform — all providers</span>
        <Link href="/admin" className="f5-btn" style={{ padding: "4px 10px", fontSize: 12 }}>Platform Console →</Link>
      </div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <div><div className="f5-kpi-label">Housing Providers</div><div className="f5-kpi-value">{providers}</div><div className="f5-kpi-sub">{active} active</div></div>
        <div><div className="f5-kpi-label">Properties</div><div className="f5-kpi-value">{totalProperties}</div><div className="f5-kpi-sub">across portfolio</div></div>
        <div><div className="f5-kpi-label">MRR</div><div className="f5-kpi-value f5-up">{fmt(BILLING_SUMMARY.mrr)}</div><div className="f5-kpi-sub">monthly recurring</div></div>
        <div><div className="f5-kpi-label">ARR</div><div className="f5-kpi-value">{fmt(BILLING_SUMMARY.arr)}</div><div className="f5-kpi-sub">annualized</div></div>
        <div><div className="f5-kpi-label">Players</div><div className="f5-kpi-value">{BILLING_MRR.reduce((s, b) => s + (b.players || 0), 0)}</div><div className="f5-kpi-sub">signage screens</div></div>
      </div>
    </div>
  );
}
