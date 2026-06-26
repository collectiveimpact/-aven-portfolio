// Marker color helper for the property/compliance map.
// Translates a compliance status (or numeric score) into the Aurora
// green / amber / red palette used elsewhere in the Hub.
//
// Status takes precedence when provided; otherwise we bucket a 0-100 score.

export type ComplianceStatus = "compliant" | "due_soon" | "overdue";

export interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  /** RentSafeTO-style status; drives marker colour when present. */
  status?: ComplianceStatus;
  /** 0-100 compliance score; used for colour when no status given. */
  score?: number;
  units?: number;
  openWorkOrders?: number;
}

// Hard hex fallbacks mirror the values used in compliance/page.tsx so the
// Leaflet canvas (which can't read CSS vars) stays on-palette in light + dark.
const GREEN = "#34d399";
const AMBER = "#f59e0b";
const RED = "#f87171";

export type MarkerTone = "green" | "amber" | "red";

export function toneFor(point: Pick<MapPoint, "status" | "score">): MarkerTone {
  if (point.status === "compliant") return "green";
  if (point.status === "due_soon") return "amber";
  if (point.status === "overdue") return "red";
  if (typeof point.score === "number") {
    if (point.score >= 85) return "green";
    if (point.score >= 60) return "amber";
    return "red";
  }
  // Unknown — treat as neutral/amber so it's visible but not alarming.
  return "amber";
}

export function colorFor(point: Pick<MapPoint, "status" | "score">): string {
  const tone = toneFor(point);
  return tone === "green" ? GREEN : tone === "amber" ? AMBER : RED;
}

export const MARKER_COLORS = { green: GREEN, amber: AMBER, red: RED } as const;

// ---------------------------------------------------------------------------
// Placeholder geocoding.
//
// Properties carry names/addresses but (today) no lat/lng. Until a real
// Yardi / geocode feed populates coordinates, we derive a STABLE, deterministic
// point inside the Toronto core from the property id (falling back to name).
// This is intentionally fake — it only exists so the map renders meaningfully
// now. When real coordinates arrive, pass them through `lat`/`lng` and this
// fallback is never invoked (see `withCoords`).
// ---------------------------------------------------------------------------

// Rough bounding box around the City of Toronto.
const TO_LAT_MIN = 43.62;
const TO_LAT_MAX = 43.78;
const TO_LNG_MIN = -79.52;
const TO_LNG_MAX = -79.28;

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic [0,1) pseudo-random from a string + salt. */
function unit(str: string, salt: number): number {
  return (hash(str + ":" + salt) % 100000) / 100000;
}

export function placeholderCoord(key: string): { lat: number; lng: number } {
  return {
    lat: TO_LAT_MIN + unit(key, 1) * (TO_LAT_MAX - TO_LAT_MIN),
    lng: TO_LNG_MIN + unit(key, 2) * (TO_LNG_MAX - TO_LNG_MIN),
  };
}

/**
 * Ensure a point has coordinates. If real lat/lng are present they win;
 * otherwise we synthesise placeholder Toronto coords from id/name.
 * `placeholder` flags which path was taken so the UI can disclose it.
 */
export function withCoords<T extends { id: string; name: string; lat?: number | null; lng?: number | null }>(
  item: T,
): T & { lat: number; lng: number; placeholder: boolean } {
  const hasReal =
    typeof item.lat === "number" &&
    typeof item.lng === "number" &&
    !Number.isNaN(item.lat) &&
    !Number.isNaN(item.lng);
  if (hasReal) {
    return { ...item, lat: item.lat as number, lng: item.lng as number, placeholder: false };
  }
  const { lat, lng } = placeholderCoord(item.id || item.name);
  return { ...item, lat, lng, placeholder: true };
}
