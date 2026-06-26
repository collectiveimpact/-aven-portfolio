// Enriched portfolio overview — richer, scannable property cards that replace
// the old "too square" tiles. Each card shows real per-property data: name,
// address, units, occupancy (with a bar), open work orders, compliance score
// (ring), last broadcast, and resident languages. Presentational only — the
// page builds the PropertyCard[] from getPropertiesFull + work orders +
// compliance and passes it in.

import type { PropertyCard } from "@/lib/dashboards";

const scoreColor = (n: number) =>
  n >= 85 ? "var(--f5-green)" : n >= 60 ? "var(--f5-amber)" : "var(--f5-red)";

function Ring({ pct }: { pct: number }) {
  const r = 20, c = 2 * Math.PI * r;
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * c;
  return (
    <svg viewBox="0 0 52 52" width="52" height="52" style={{ flexShrink: 0 }}>
      <circle cx="26" cy="26" r={r} fill="none" stroke="var(--f5-border)" strokeWidth="6" />
      <circle
        cx="26" cy="26" r={r} fill="none" stroke={scoreColor(pct)} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${dash} ${c}`} transform="rotate(-90 26 26)"
      />
      <text x="26" y="30" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--f5-text)">{pct}</text>
    </svg>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", color: "var(--f5-text-dim)" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: tone ?? "var(--f5-text)", marginTop: 2 }}>{value}</div>
    </div>
  );
}

const complianceBadge: Record<PropertyCard["complianceLabel"], string> = {
  "On track": "ok",
  "Due soon": "warn",
  "Overdue": "bad",
};

export function PortfolioOverview({ properties }: { properties: PropertyCard[] }) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center" }}>
        <div className="f5-section-title" style={{ margin: 0 }}>Portfolio — All Properties</div>
        <a className="f5-btn" href="/properties" style={{ marginLeft: "auto", padding: "5px 12px", fontSize: 12 }}>Manage Properties</a>
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(2,1fr)", marginTop: 12 }}>
        {properties.map((p) => (
          <div key={p.id} className="f5-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* header: name + address + compliance ring */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--f5-text)", letterSpacing: -0.3 }}>{p.name}</div>
                <div style={{ fontSize: 12, color: "var(--f5-text-muted)", marginTop: 2 }}>{p.address}</div>
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  <span className="f5-pill" style={{ textTransform: "capitalize" }}>{p.type}</span>
                  <span className={`f5-badge ${complianceBadge[p.complianceLabel]}`}>{p.complianceLabel}</span>
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <Ring pct={p.compliancePct} />
                <div style={{ fontSize: 9, color: "var(--f5-text-dim)", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>Compliance</div>
              </div>
            </div>

            {/* occupancy bar */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--f5-text-secondary)", marginBottom: 4 }}>
                <span>Occupancy</span>
                <span><strong style={{ color: "var(--f5-text)" }}>{p.occupied}</strong> / {p.units} units · {p.occupancyPct}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: "var(--f5-border)" }}>
                <div style={{ width: `${Math.min(100, p.occupancyPct)}%`, height: "100%", borderRadius: 99, background: "var(--f5-gradient-teal)" }} />
              </div>
            </div>

            {/* stat row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, paddingTop: 12, borderTop: "1px solid var(--f5-border)" }}>
              <Stat label="Open WOs" value={String(p.openWorkOrders)} tone={p.openWorkOrders > 5 ? "var(--f5-amber)" : undefined} />
              <Stat label="Units" value={p.units.toLocaleString()} />
              <Stat label="Manager" value={p.managerName} />
            </div>

            {/* footer: last broadcast + languages */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 11.5, color: "var(--f5-text-muted)" }}>
              <span>📣 Last broadcast: <span style={{ color: "var(--f5-text-secondary)" }}>{p.lastBroadcast}</span></span>
              <span style={{ marginLeft: "auto", display: "flex", gap: 4, flexWrap: "wrap" }}>
                {p.languages.map((l) => (
                  <span key={l} className="f5-pill" style={{ fontSize: 10, padding: "2px 8px" }}>{l}</span>
                ))}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
