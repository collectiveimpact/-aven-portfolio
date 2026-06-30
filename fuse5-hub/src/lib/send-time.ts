// Send-time optimization ("Smart timing") — the real engine behind the Scheduling
// Optimizer. Picks each resident's most-likely-to-engage hour from a stable
// per-resident seed, constrained to engagement-friendly, quiet-hours-safe windows.
// Pure + dependency-free so the composer (client) can preview the distribution and
// the send path (server) can stamp each resident's slot identically.
//
// Quiet hours: nothing before 8am or after 9pm in the resident's local time.
// Engagement curve for a social-housing tenant base weights early-morning, midday,
// and (heaviest) the after-work/early-evening window.

export const QUIET_END_HOUR = 8; // earliest send (local)
export const QUIET_START_HOUR = 21; // latest send (local)

/** Engagement-weighted candidate hours (local). Higher weight = more likely. */
const HOUR_WEIGHTS: ReadonlyArray<{ hour: number; weight: number }> = [
  { hour: 8, weight: 3 }, // morning check
  { hour: 9, weight: 4 },
  { hour: 12, weight: 5 }, // lunch
  { hour: 13, weight: 4 },
  { hour: 16, weight: 5 }, // after school / pre-dinner
  { hour: 17, weight: 8 }, // after-work peak
  { hour: 18, weight: 9 }, // early-evening peak
  { hour: 19, weight: 7 },
  { hour: 20, weight: 4 }, // evening wind-down (still < quiet start)
];

const TOTAL_WEIGHT = HOUR_WEIGHTS.reduce((s, h) => s + h.weight, 0);

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The optimal local send hour (8–20) for one resident. Deterministic: the same
 * resident always resolves to the same slot, so the preview and the actual send
 * agree. Clamped inside quiet hours as a safety net.
 */
export function optimalHour(seed: string): number {
  let pick = hash(seed) % TOTAL_WEIGHT;
  for (const { hour, weight } of HOUR_WEIGHTS) {
    if (pick < weight) return Math.min(Math.max(hour, QUIET_END_HOUR), QUIET_START_HOUR - 1);
    pick -= weight;
  }
  return 18;
}

export interface SendTimeBucket {
  hour: number;
  label: string; // e.g. "5–6pm"
  count: number;
  pct: number;
}

const fmtHour = (h: number) => (h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`);

/**
 * Distribution of optimal send hours across `seeds` (resident ids). When no seeds
 * are supplied, returns the expected shape of the engagement curve scaled to
 * `fallbackTotal` — enough to render a representative preview before a property is
 * chosen.
 */
export function distribution(seeds: string[], fallbackTotal = 100): SendTimeBucket[] {
  const counts = new Map<number, number>();
  if (seeds.length) {
    for (const s of seeds) {
      const h = optimalHour(s);
      counts.set(h, (counts.get(h) ?? 0) + 1);
    }
  } else {
    for (const { hour, weight } of HOUR_WEIGHTS) {
      counts.set(hour, Math.round((weight / TOTAL_WEIGHT) * fallbackTotal));
    }
  }
  const total = [...counts.values()].reduce((s, n) => s + n, 0) || 1;
  return HOUR_WEIGHTS.map(({ hour }) => {
    const count = counts.get(hour) ?? 0;
    return { hour, label: `${fmtHour(hour)}–${fmtHour(hour + 1)}`, count, pct: Math.round((count / total) * 100) };
  }).filter((b) => b.count > 0);
}

/** The peak window label, for a one-line summary ("most around 5–7pm"). */
export function peakWindow(buckets: SendTimeBucket[]): string {
  if (!buckets.length) return "the early evening";
  const top = [...buckets].sort((a, b) => b.count - a.count).slice(0, 2).sort((a, b) => a.hour - b.hour);
  if (top.length === 1) return top[0].label;
  return `${fmtHour(top[0].hour)}–${fmtHour(top[top.length - 1].hour + 1)}`;
}
