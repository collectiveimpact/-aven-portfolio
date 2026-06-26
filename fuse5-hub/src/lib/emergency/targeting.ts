// Audience drill-down model for the Emergency console.
//
// A real deployment would resolve units/floors/blocks/zones from the residents
// table per property. Until a queries.ts helper exists (see the page's report),
// we synthesize a deterministic, realistic building structure from a property's
// id + name so the targeting panel is fully interactive and the "recipients in
// scope" count is live and believable.

import type { PropertyOption } from "@/lib/queries";

export interface ZoneDef {
  id: string;
  label: string;
  icon: string;
  /** Approx. people typically reachable via that common-area signage/zone. */
  occupancy: number;
}

export const COMMON_ZONES: ZoneDef[] = [
  { id: "lobby", label: "Lobby", icon: "🛎️", occupancy: 12 },
  { id: "stairwell", label: "Stairwell", icon: "🪜", occupancy: 4 },
  { id: "parking", label: "Parking", icon: "🅿️", occupancy: 9 },
  { id: "amenity", label: "Amenity Room", icon: "🛋️", occupancy: 14 },
];

export interface UnitNode {
  id: string;
  number: string;
  floor: number;
  block: string;
  residents: number;
}

export interface BuildingModel {
  propertyId: string;
  propertyName: string;
  floors: number[];
  blocks: string[];
  units: UnitNode[];
  /** Total residents across all units (excludes common-zone occupancy). */
  residentTotal: number;
}

// Tiny deterministic hash so the same property always yields the same building.
function seed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Build a deterministic, plausible building layout for a property.
 * 4–8 floors, 1–3 blocks, 4–8 units per floor, 1–4 residents per unit.
 */
export function buildingFor(p: PropertyOption): BuildingModel {
  const h = seed(p.id || p.name);
  const floorCount = 4 + (h % 5); // 4..8
  const blockCount = 1 + ((h >> 3) % 3); // 1..3
  const unitsPerFloor = 4 + ((h >> 5) % 5); // 4..8

  const blocks = Array.from({ length: blockCount }, (_, i) => String.fromCharCode(65 + i)); // A, B, C
  const floors = Array.from({ length: floorCount }, (_, i) => i + 1);
  const units: UnitNode[] = [];

  let residentTotal = 0;
  for (const floor of floors) {
    for (let u = 0; u < unitsPerFloor; u++) {
      const block = blocks[(floor + u) % blockCount];
      const number = `${block}${floor}${String(u + 1).padStart(2, "0")}`;
      // 1..4 residents per unit, deterministic.
      const residents = 1 + ((seed(number) + h) % 4);
      residentTotal += residents;
      units.push({ id: `${p.id}-${number}`, number, floor, block, residents });
    }
  }

  return {
    propertyId: p.id,
    propertyName: p.name,
    floors,
    blocks,
    units,
    residentTotal,
  };
}

export interface TargetSelection {
  /** When true, the whole property is in scope (ignore unit/floor/block sets). */
  wholeProperty: boolean;
  floors: Set<number>;
  blocks: Set<string>;
  unitIds: Set<string>;
  zoneIds: Set<string>;
}

export function emptySelection(): TargetSelection {
  return {
    wholeProperty: true,
    floors: new Set(),
    blocks: new Set(),
    unitIds: new Set(),
    zoneIds: new Set(),
  };
}

/**
 * Resolve the set of in-scope units given the current selection. Floors and
 * blocks act as additive filters; explicit unit picks are unioned on top. If no
 * floor/block/unit filter is active, all units are in scope.
 */
export function unitsInScope(model: BuildingModel, sel: TargetSelection): UnitNode[] {
  if (sel.wholeProperty) return model.units;

  const noFilter = sel.floors.size === 0 && sel.blocks.size === 0 && sel.unitIds.size === 0;
  if (noFilter) return [];

  return model.units.filter((u) => {
    if (sel.unitIds.has(u.id)) return true;
    const floorOk = sel.floors.size === 0 || sel.floors.has(u.floor);
    const blockOk = sel.blocks.size === 0 || sel.blocks.has(u.block);
    // Only count floor/block matches when at least one of those filters is set.
    if (sel.floors.size === 0 && sel.blocks.size === 0) return false;
    return floorOk && blockOk;
  });
}

export interface ScopeCount {
  units: number;
  residents: number;
  zones: number;
  zoneOccupancy: number;
  /** Headline number: residents in units + common-zone occupancy. */
  total: number;
}

export function scopeCount(model: BuildingModel, sel: TargetSelection): ScopeCount {
  const units = unitsInScope(model, sel);
  const residents = units.reduce((sum, u) => sum + u.residents, 0);
  const zoneOccupancy = COMMON_ZONES.filter((z) => sel.zoneIds.has(z.id)).reduce(
    (sum, z) => sum + z.occupancy,
    0,
  );
  return {
    units: units.length,
    residents,
    zones: sel.zoneIds.size,
    zoneOccupancy,
    total: residents + zoneOccupancy,
  };
}

/** Human-readable scope summary for the audit detail + send payload. */
export function describeSelection(model: BuildingModel, sel: TargetSelection): string {
  if (sel.wholeProperty) return `${model.propertyName} (entire property)`;
  const parts: string[] = [model.propertyName];
  if (sel.blocks.size) parts.push(`Block ${[...sel.blocks].sort().join("/")}`);
  if (sel.floors.size) parts.push(`Floor ${[...sel.floors].sort((a, b) => a - b).join(", ")}`);
  if (sel.unitIds.size) parts.push(`${sel.unitIds.size} unit(s)`);
  const zones = COMMON_ZONES.filter((z) => sel.zoneIds.has(z.id)).map((z) => z.label);
  if (zones.length) parts.push(zones.join(", "));
  return parts.join(" · ");
}
