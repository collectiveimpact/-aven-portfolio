"use client";

// Small presentational primitives shared across the analytics tabs.
// Keeps the tab file focused on composition. Aurora f5- classes + CSS vars only.

import type { ReactNode } from "react";
import { Sparkline } from "./charts";

export interface KpiItem {
  label: string;
  value: string;
  sub?: string;
  delta?: number;          // signed % vs prior; drives arrow + colour
  goodWhenHigh?: boolean;  // default true
  spark?: number[];        // optional inline trend
  accent?: string;         // optional left-border accent
}

/** Responsive KPI grid — auto-fit cards (min 200px) so they never squish. */
export function KpiGrid({ items }: { items: KpiItem[] }) {
  return (
    <div
      className="f5-grid"
      style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", marginTop: 18 }}
    >
      {items.map((k) => {
        const good = k.goodWhenHigh === false ? (k.delta ?? 0) < 0 : (k.delta ?? 0) >= 0;
        const deltaColor = k.delta === undefined ? "var(--f5-text-muted)" : good ? "var(--f5-green)" : "var(--f5-red)";
        const sparkColor = good ? "var(--f5-teal)" : "var(--f5-coral)";
        return (
          <div
            key={k.label}
            className="f5-card"
            style={{ display: "flex", flexDirection: "column", gap: 2, ...(k.accent ? { borderLeft: `3px solid ${k.accent}` } : {}) }}
          >
            <div className="f5-kpi-label">{k.label}</div>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
              <div className="f5-kpi-value">{k.value}</div>
              {k.spark && k.spark.length > 1 && <Sparkline points={k.spark} color={sparkColor} />}
            </div>
            <div className="f5-kpi-sub" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {k.delta !== undefined && (
                <span style={{ color: deltaColor, fontWeight: 700 }}>
                  {k.delta >= 0 ? "▲" : "▼"} {Math.abs(k.delta).toFixed(1)}%
                </span>
              )}
              {k.sub && <span>{k.sub}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Titled card wrapper for a chart, with optional right-aligned legend/control. */
export function ChartCard({
  title,
  subtitle,
  right,
  children,
  span = 1,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
  span?: number;
}) {
  return (
    <div className="f5-card" style={{ gridColumn: `span ${span}`, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <div>
          <div className="f5-section-title" style={{ margin: 0 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: "var(--f5-text-muted)", marginTop: 2 }}>{subtitle}</div>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

/** Inline legend row for grouped charts. */
export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
      {items.map((i) => (
        <span key={i.label} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--f5-text-muted)" }}>
          <span style={{ width: 10, height: 10, borderRadius: 3, background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

/** A responsive 2-up chart grid that collapses to 1 column on small screens. */
export function ChartGrid({ children }: { children: ReactNode }) {
  return (
    <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", marginTop: 14 }}>
      {children}
    </div>
  );
}
