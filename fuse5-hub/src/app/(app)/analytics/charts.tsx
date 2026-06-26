"use client";

// Self-owned inline-SVG chart kit for the Analytics section.
// Zero dependencies. Every stroke/fill is a CSS variable or a passed token so
// light + dark both render crisply. viewBox-based + width:100% => responsive.

import { useId } from "react";

const AX = "var(--f5-text-dim)";
const GRID = "var(--f5-border)";
const LBL = "var(--f5-text-muted)";

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * mag;
}
function fmt(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k`;
  return `${Math.round(n)}`;
}

export interface Series {
  name: string;
  color: string; // CSS var or hex
  points: { x: string; y: number }[];
}

/** Smooth area + line trend chart with gridlines, axis labels, and an optional
 *  comparison series rendered as a faint dashed line. */
export function AreaTrend({
  series,
  compare,
  height = 220,
  yFormat = fmt,
}: {
  series: Series;
  compare?: { name: string; points: { x: string; y: number }[] };
  height?: number;
  yFormat?: (n: number) => string;
}) {
  const gid = useId().replace(/[:]/g, "");
  const W = 720;
  const H = height;
  const padL = 44;
  const padR = 16;
  const padT = 14;
  const padB = 28;
  const pts = series.points;
  const allY = [...pts.map((p) => p.y), ...(compare?.points.map((p) => p.y) ?? [])];
  const max = niceMax(Math.max(...allY, 1));
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const xAt = (i: number) => padL + (pts.length === 1 ? innerW / 2 : (i / (pts.length - 1)) * innerW);
  const yAt = (v: number) => padT + innerH - (v / max) * innerH;

  const line = (arr: { y: number }[]) =>
    arr.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(p.y).toFixed(1)}`).join(" ");
  const area = `${line(pts)} L${xAt(pts.length - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${xAt(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => max * f);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }} role="img" aria-label={`${series.name} trend`}>
      <defs>
        <linearGradient id={`grad-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={series.color} stopOpacity="0.32" />
          <stop offset="100%" stopColor={series.color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} y1={yAt(t)} x2={W - padR} y2={yAt(t)} stroke={GRID} strokeWidth="1" />
          <text x={padL - 8} y={yAt(t) + 3} textAnchor="end" fontSize="10" fill={AX}>{yFormat(t)}</text>
        </g>
      ))}
      {compare && (
        <path d={line(compare.points)} fill="none" stroke={LBL} strokeWidth="1.5" strokeDasharray="4 4" opacity="0.7" />
      )}
      <path d={area} fill={`url(#grad-${gid})`} />
      <path d={line(pts)} fill="none" stroke={series.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={xAt(i)} cy={yAt(p.y)} r="3" fill="var(--f5-surface)" stroke={series.color} strokeWidth="2" />
          <text x={xAt(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={AX}>{p.x}</text>
        </g>
      ))}
    </svg>
  );
}

/** Grouped/single vertical bars with value labels. */
export function GroupedBars({
  categories,
  groups,
  height = 220,
  yFormat = fmt,
}: {
  categories: string[];
  groups: { name: string; color: string; values: number[] }[];
  height?: number;
  yFormat?: (n: number) => string;
}) {
  const W = 720;
  const H = height;
  const padL = 44;
  const padR = 16;
  const padT = 14;
  const padB = 30;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = niceMax(Math.max(...groups.flatMap((g) => g.values), 1));
  const slot = innerW / categories.length;
  const groupW = slot * 0.66;
  const barW = groupW / groups.length;
  const yAt = (v: number) => padT + innerH - (v / max) * innerH;
  const ticks = [0, 0.5, 1].map((f) => max * f);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }} role="img" aria-label="bar chart">
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={padL} y1={yAt(t)} x2={W - padR} y2={yAt(t)} stroke={GRID} strokeWidth="1" />
          <text x={padL - 8} y={yAt(t) + 3} textAnchor="end" fontSize="10" fill={AX}>{yFormat(t)}</text>
        </g>
      ))}
      {categories.map((cat, ci) => {
        const x0 = padL + ci * slot + (slot - groupW) / 2;
        return (
          <g key={cat}>
            {groups.map((g, gi) => {
              const v = g.values[ci] ?? 0;
              const h = (v / max) * innerH;
              const x = x0 + gi * barW;
              return (
                <g key={g.name}>
                  <rect x={x + 1} y={yAt(v)} width={barW - 2} height={Math.max(0, h)} rx="3" fill={g.color} />
                  {groups.length === 1 && (
                    <text x={x + barW / 2} y={yAt(v) - 5} textAnchor="middle" fontSize="9" fill={LBL}>{yFormat(v)}</text>
                  )}
                </g>
              );
            })}
            <text x={x0 + groupW / 2} y={H - 10} textAnchor="middle" fontSize="10" fill={AX}>{cat}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Donut gauge for a single percentage (0–100) with center value. */
export function Gauge({ value, label, color = "var(--f5-teal)", size = 130 }: { value: number; label?: string; color?: string; size?: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const dash = (pct / 100) * c;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg viewBox="0 0 130 130" width={size} height={size} role="img" aria-label={`${label ?? ""} ${pct}%`}>
        <circle cx="65" cy="65" r={r} fill="none" stroke="var(--f5-border)" strokeWidth="12" />
        <circle
          cx="65" cy="65" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`} transform="rotate(-90 65 65)"
        />
        <text x="65" y="62" textAnchor="middle" fontSize="26" fontWeight="800" fill="var(--f5-text)">{pct.toFixed(pct % 1 ? 1 : 0)}</text>
        <text x="65" y="82" textAnchor="middle" fontSize="11" fill="var(--f5-text-muted)">%</text>
      </svg>
      {label && <div style={{ fontSize: 12, color: "var(--f5-text-muted)", textAlign: "center" }}>{label}</div>}
    </div>
  );
}

/** Multi-segment donut (channel mix etc.) with a legend. */
export function DonutMix({ segments, size = 150 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = 52;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div style={{ display: "flex", gap: 18, alignItems: "center", flexWrap: "wrap" }}>
      <svg viewBox="0 0 130 130" width={size} height={size} role="img" aria-label="distribution">
        {segments.map((s) => {
          const frac = s.value / total;
          const dash = frac * c;
          const el = (
            <circle
              key={s.label}
              cx="65" cy="65" r={r} fill="none" stroke={s.color} strokeWidth="20"
              strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-offset} transform="rotate(-90 65 65)"
            />
          );
          offset += dash;
          return el;
        })}
        <text x="65" y="62" textAnchor="middle" fontSize="20" fontWeight="800" fill="var(--f5-text)">{fmt(total)}</text>
        <text x="65" y="80" textAnchor="middle" fontSize="9" fill="var(--f5-text-muted)">total</text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {segments.map((s) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ color: "var(--f5-text)", fontWeight: 600 }}>{s.label}</span>
            <span style={{ color: "var(--f5-text-muted)" }}>{((s.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Inline sparkline — for KPI cards. */
export function Sparkline({ points, color = "var(--f5-teal)", width = 96, height = 30 }: { points: number[]; color?: string; width?: number; height?: number }) {
  const gid = useId().replace(/[:]/g, "");
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const span = max - min || 1;
  const xAt = (i: number) => (i / (points.length - 1)) * width;
  const yAt = (v: number) => height - 2 - ((v - min) / span) * (height - 4);
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(p).toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} style={{ display: "block" }} aria-hidden="true">
      <defs>
        <linearGradient id={`spk-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spk-${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Horizontal delivery funnel with step conversion. */
export function Funnel({ stages }: { stages: { label: string; n: number; color: string }[] }) {
  const top = stages[0]?.n || 1;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {stages.map((s, i) => {
        const pct = Math.round((s.n / top) * 100);
        const step = i > 0 ? Math.round((s.n / (stages[i - 1].n || 1)) * 100) : 100;
        const stepColor = step >= 90 ? "var(--f5-green)" : step >= 70 ? "var(--f5-amber)" : "var(--f5-red)";
        return (
          <div key={s.label}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: "var(--f5-text)", fontWeight: 600 }}>{s.label}</span>
              <span style={{ color: "var(--f5-text-muted)" }}>
                {s.n.toLocaleString()} · {pct}%
                {i > 0 && <span style={{ color: stepColor }}> ({step}% step)</span>}
              </span>
            </div>
            <div style={{ height: 24, borderRadius: 7, background: "var(--f5-border)", overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: s.color, borderRadius: 7, transition: "width .4s ease" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Day × daypart heatmap. */
export function Heatmap({
  rows,
  cols,
  data,
  hue = "0,204,153",
}: {
  rows: string[];
  cols: string[];
  data: number[][];
  hue?: string;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "separate", borderSpacing: 4, width: "100%" }}>
        <thead>
          <tr>
            <th />
            {cols.map((co) => (
              <th key={co} style={{ fontSize: 11, color: "var(--f5-text-muted)", fontWeight: 500, padding: "0 4px", textAlign: "center" }}>{co}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((ro, ri) => (
            <tr key={ro}>
              <td style={{ fontSize: 12, color: "var(--f5-text-muted)", paddingRight: 8, whiteSpace: "nowrap" }}>{ro}</td>
              {data[ri].map((v, ci) => (
                <td key={ci}>
                  <div
                    title={`${ro} ${cols[ci]} — ${v}`}
                    style={{
                      height: 28, borderRadius: 6,
                      background: `rgba(${hue},${0.1 + (v / 100) * 0.85})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, color: v > 55 ? "#04201a" : "var(--f5-text-secondary)", fontWeight: 600,
                    }}
                  >
                    {v}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Horizontal bar row (rankings / reach by property). */
export function HBars({ items, format = (n: number) => n.toLocaleString() }: { items: { label: string; value: number; color?: string }[]; format?: (n: number) => string }) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((it) => (
        <div key={it.label} style={{ display: "grid", gridTemplateColumns: "160px 1fr auto", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--f5-text)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.label}</span>
          <div style={{ height: 16, borderRadius: 5, background: "var(--f5-border)", overflow: "hidden" }}>
            <div style={{ width: `${(it.value / max) * 100}%`, height: "100%", borderRadius: 5, background: it.color ?? "var(--f5-teal)" }} />
          </div>
          <span style={{ fontSize: 12, color: "var(--f5-text-muted)", fontVariantNumeric: "tabular-nums" }}>{format(it.value)}</span>
        </div>
      ))}
    </div>
  );
}
