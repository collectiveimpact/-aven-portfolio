"use client";

import { useState } from "react";
import Link from "next/link";

const fg = "var(--f5-text)";
const dim = "var(--f5-text-muted)";

// Tiny inline sparkline.
function Spark({ points, color }: { points: number[]; color: string }) {
  const max = Math.max(...points), min = Math.min(...points), range = max - min || 1;
  const w = 100, h = 28;
  const d = points.map((p, i) => `${(i / (points.length - 1)) * w},${h - ((p - min) / range) * h}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="28" preserveAspectRatio="none" style={{ marginTop: 8 }}>
      <polyline points={d} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const PERIODS = ["Today", "7 days", "30 days", "90 days"] as const;
const STAT_CARDS = [
  { label: "Total Communications", value: "24,847", delta: "+12.3%", up: true, spark: [12, 15, 13, 18, 17, 21, 24], color: "var(--f5-teal,#00CCCC)" },
  { label: "Delivery Rate", value: "98.2%", delta: "+0.3%", up: true, spark: [97, 97.5, 98, 97.8, 98.1, 98.2, 98.2], color: "var(--f5-green,#34d399)" },
  { label: "Avg Response Time", value: "2.4h", delta: "−18.2%", up: true, spark: [3.2, 3.0, 2.9, 2.7, 2.6, 2.5, 2.4], color: "#60a5fa" },
  { label: "Tenant Satisfaction", value: "4.7/5", delta: "+2.1%", up: true, spark: [4.4, 4.5, 4.5, 4.6, 4.6, 4.7, 4.7], color: "var(--f5-sun,#FFB066)" },
];
const QUICK = [
  { label: "New Broadcast", ico: "✎", href: "/compose" },
  { label: "Emergency Alert", ico: "🚨", href: "/emergency" },
  { label: "Schedule Message", ico: "🗓", href: "/calendar" },
  { label: "Generate Report", ico: "📊", href: "/analytics" },
  { label: "Import Tenants", ico: "⇪", href: "/workorders" },
  { label: "Run Compliance", ico: "🛡", href: "/compliance" },
];
const INSIGHTS = [
  { ico: "⏰", title: "Peak Engagement Hours", body: "Messages sent 6–8 PM see 38% higher open rates. Schedule non-urgent comms then." },
  { ico: "🌐", title: "Language Preference Shift", body: "French-preference residents up 25% this quarter — consider bilingual defaults at East York." },
  { ico: "💬", title: "SMS Popularity", body: "SMS opt-ins up 34%. SMS now your highest-response channel at 22.5%." },
];
const COMPLIANCE_BARS = [
  { name: "RentSafeTO", pct: 98 }, { name: "Hamilton SAB", pct: 100 }, { name: "CASL Consent", pct: 99.5 },
];

export function CommandCenter() {
  const [period, setPeriod] = useState<string>("7 days");
  return (
    <>
      {/* period toggle + export */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18 }}>
        <div className="f5-chips" style={{ margin: 0 }}>
          {PERIODS.map((p) => <span key={p} className={`f5-chip${period === p ? " active" : ""}`} onClick={() => setPeriod(p)}>{p}</span>)}
        </div>
        <button className="f5-btn" type="button" style={{ marginLeft: "auto", fontSize: 12, padding: "5px 12px" }}>⬇ Export Report</button>
      </div>

      {/* sparkline stat cards */}
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 12 }}>
        {STAT_CARDS.map((s) => (
          <div key={s.label} className="f5-card">
            <div className="f5-kpi-label">{s.label}</div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
              <div className="f5-kpi-value" style={{ fontSize: 26 }}>{s.value}</div>
              <span className="f5-up" style={{ fontSize: 12 }}>{s.delta}</span>
            </div>
            <Spark points={s.spark} color={s.color} />
          </div>
        ))}
      </div>

      {/* quick actions */}
      <div className="f5-section-title">Quick Actions</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
        {QUICK.map((q) => (
          <Link key={q.label} href={q.href} className="f5-card" style={{ textAlign: "center", textDecoration: "none", padding: "16px 8px" }}>
            <div style={{ fontSize: 22 }}>{q.ico}</div>
            <div style={{ fontSize: 12, color: fg, marginTop: 6 }}>{q.label}</div>
          </Link>
        ))}
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "2fr 1fr", marginTop: 18, alignItems: "start" }}>
        {/* AI insights */}
        <div className="f5-card">
          <div className="f5-section-title" style={{ marginTop: 0 }}>✦ AI Insights</div>
          {INSIGHTS.map((x) => (
            <div key={x.title} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--f5-border)" }}>
              <span style={{ fontSize: 18 }}>{x.ico}</span>
              <div><div style={{ fontWeight: 600, color: fg, fontSize: 13 }}>{x.title}</div><div style={{ fontSize: 12, color: dim, marginTop: 2 }}>{x.body}</div></div>
            </div>
          ))}
        </div>
        {/* compliance status bar */}
        <div className="f5-card">
          <div className="f5-section-title" style={{ marginTop: 0 }}>Regulatory Compliance</div>
          {COMPLIANCE_BARS.map((c) => (
            <div key={c.name} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--f5-text-secondary)", marginBottom: 4 }}><span>{c.name}</span><span>{c.pct}%</span></div>
              <div style={{ height: 6, borderRadius: 99, background: "var(--f5-border)" }}>
                <div style={{ width: `${c.pct}%`, height: "100%", borderRadius: 99, background: c.pct >= 99 ? "var(--f5-green,#34d399)" : "var(--f5-teal,#00CCCC)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
