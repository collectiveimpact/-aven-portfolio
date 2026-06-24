// Compliance score data sources.
//
// RentSafeTO — LIVE. City of Toronto Open Data publishes the "RentSafeTO
// Building Current Score" layer on its ArcGIS Feature Server, refreshed daily.
// This is the exact source the v8.1 prototype connected to. We query it by
// building address and read CURRENT_BUILDING_EVAL_SCORE (0-100).
//
// Hamilton SAB — Hamilton's Apartment Building By-law (RHSP) does NOT publish a
// per-building evaluation score feed the way Toronto does. We support a
// configurable endpoint (HAMILTON_COMPLIANCE_URL) for when one exists / for an
// internal feed; otherwise the agent leaves the manually-entered score in place
// and marks the source as manual.

export const RENTSAFE_FEATURE_URL =
  "https://gis.toronto.ca/arcgis/rest/services/cot_geospatial8/FeatureServer/6/query";

export interface BuildingScore {
  address: string;
  score: number | null;       // CURRENT_BUILDING_EVAL_SCORE
  proactive: number | null;   // PROACTIVE_BUILDING_SCORE
  reactive: number | null;    // CURRENT_REACTIVE_SCORE
  colour: string | null;      // CURRENT_COLOUR_SIGN (Green/Yellow/Red)
}

// Normalize a free-form address to the City's SITE_ADDRESS style for matching:
// uppercase, drop unit/suite, drop city/province/postal, collapse whitespace.
export function normalizeAddress(raw: string): string {
  let s = raw.toUpperCase().trim();
  s = s.replace(/\b(UNIT|SUITE|STE|APT|#)\s*[\w-]+/g, " ");
  s = s.replace(/,?\s*(TORONTO|ETOBICOKE|SCARBOROUGH|NORTH YORK|EAST YORK|YORK|ONTARIO|ON)\b.*$/g, " ");
  s = s.replace(/\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/g, " "); // postal code
  s = s.replace(/[.,]/g, " ").replace(/\s+/g, " ").trim();
  return s;
}

const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : null;
};

// Query the live RentSafeTO layer for one address. Returns the best match or null.
export async function fetchRentSafeByAddress(address: string, timeoutMs = 12000): Promise<BuildingScore | null> {
  const norm = normalizeAddress(address);
  if (!norm) return null;
  // Match on the leading "<number> <street>" token so unit noise doesn't break it.
  const where = `UPPER(SITE_ADDRESS) LIKE '%${norm.replace(/'/g, "''")}%'`;
  const params = new URLSearchParams({
    where,
    outFields: "SITE_ADDRESS,CURRENT_BUILDING_EVAL_SCORE,PROACTIVE_BUILDING_SCORE,CURRENT_REACTIVE_SCORE,CURRENT_COLOUR_SIGN",
    resultRecordCount: "1",
    f: "json",
  });
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${RENTSAFE_FEATURE_URL}?${params}`, { signal: ctrl.signal, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: { attributes: Record<string, unknown> }[]; error?: unknown };
    const a = data.features?.[0]?.attributes;
    if (!a) return null;
    return {
      address: String(a.SITE_ADDRESS ?? address),
      score: num(a.CURRENT_BUILDING_EVAL_SCORE),
      proactive: num(a.PROACTIVE_BUILDING_SCORE),
      reactive: num(a.CURRENT_REACTIVE_SCORE),
      colour: (a.CURRENT_COLOUR_SIGN as string) ?? null,
    };
  } catch {
    return null; // network/abort → caller treats as "no match this run"
  } finally {
    clearTimeout(t);
  }
}

// Pull scores for many addresses (small concurrency to be polite to the API).
// Returns results ALIGNED to the input addresses (null = no match) so callers
// can map building → result by index.
export async function fetchRentSafeScores(addresses: string[], concurrency = 4): Promise<(BuildingScore | null)[]> {
  const out: (BuildingScore | null)[] = [];
  for (let i = 0; i < addresses.length; i += concurrency) {
    const batch = addresses.slice(i, i + concurrency);
    const got = await Promise.all(batch.map((a) => fetchRentSafeByAddress(a)));
    out.push(...got);
  }
  return out;
}

// Hamilton SAB — configurable. If HAMILTON_COMPLIANCE_URL is set we attempt an
// ArcGIS-style query (same shape as Toronto); otherwise return null (manual).
export async function fetchHamiltonByAddress(address: string, timeoutMs = 12000): Promise<BuildingScore | null> {
  const base = process.env.HAMILTON_COMPLIANCE_URL;
  if (!base) return null; // no public feed → manual entry stays authoritative
  const norm = normalizeAddress(address);
  const scoreField = process.env.HAMILTON_SCORE_FIELD || "EVAL_SCORE";
  const addrField = process.env.HAMILTON_ADDRESS_FIELD || "SITE_ADDRESS";
  const params = new URLSearchParams({
    where: `UPPER(${addrField}) LIKE '%${norm.replace(/'/g, "''")}%'`,
    outFields: `${addrField},${scoreField}`,
    resultRecordCount: "1",
    f: "json",
  });
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}?${params}`, { signal: ctrl.signal, headers: { accept: "application/json" } });
    if (!res.ok) return null;
    const data = (await res.json()) as { features?: { attributes: Record<string, unknown> }[] };
    const a = data.features?.[0]?.attributes;
    if (!a) return null;
    return { address: String(a[addrField] ?? address), score: num(a[scoreField]), proactive: null, reactive: null, colour: null };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export const COMPLIANCE_SOURCE_LABEL: Record<string, string> = {
  rentsafeto: "City of Toronto Open Data — RentSafeTO Building Current Score (ArcGIS, daily)",
  "hamilton-sab": "Hamilton SAB — internal/manual (no public per-building score feed)",
};
