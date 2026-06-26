"use client";

// Pure helpers + state hook for the reusable FilterBar.
// Everything here is dependency-free (plain React + Web APIs).
//
// - serialize/deserialize FilterValue <-> URLSearchParams (shareable links)
// - useFilterState: controlled state, optionally URL-synced
// - applyFilters: generic client-side predicate over rows
// - location cascade helpers (Property -> Unit -> Floor -> Block -> Zone)

import { useCallback, useMemo, useRef, useState } from "react";
import type {
  DateRangeValue,
  FilterField,
  FilterFieldValue,
  FilterOption,
  FilterValue,
  LocationLevel,
  LocationNode,
} from "@/components/filters/types";

// ---------------------------------------------------------------------------
// Value guards
// ---------------------------------------------------------------------------

const isDateRange = (v: FilterFieldValue): v is DateRangeValue =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const isStringArray = (v: FilterFieldValue): v is string[] => Array.isArray(v);

/** True when a field value carries no active selection. */
export function isFieldEmpty(v: FilterFieldValue): boolean {
  if (v == null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (isStringArray(v)) return v.length === 0;
  if (isDateRange(v)) return !v.from && !v.to;
  return true;
}

/** How many fields currently hold an active selection. */
export function countActiveFilters(value: FilterValue): number {
  return Object.values(value).filter((v) => !isFieldEmpty(v)).length;
}

// ---------------------------------------------------------------------------
// URL (de)serialization
// ---------------------------------------------------------------------------
// Encoding per field kind:
//   select / segmented / search -> ?key=value
//   multiselect                 -> ?key=a,b,c   (comma-joined)
//   daterange                   -> ?key_from=..&key_to=..

const DATE_FROM_SUFFIX = "_from";
const DATE_TO_SUFFIX = "_to";

/** Serialize a FilterValue into URLSearchParams given the field schema. */
export function serializeFilters(
  value: FilterValue,
  fields: FilterField[],
  base?: URLSearchParams,
): URLSearchParams {
  const params = new URLSearchParams(base?.toString() ?? "");
  for (const field of fields) {
    const v = value[field.key];
    // Clear any prior encoding for this field first.
    params.delete(field.key);
    params.delete(field.key + DATE_FROM_SUFFIX);
    params.delete(field.key + DATE_TO_SUFFIX);
    if (isFieldEmpty(v)) continue;

    if (field.kind === "daterange" && isDateRange(v)) {
      if (v.from) params.set(field.key + DATE_FROM_SUFFIX, v.from);
      if (v.to) params.set(field.key + DATE_TO_SUFFIX, v.to);
    } else if (field.kind === "multiselect" && isStringArray(v)) {
      params.set(field.key, v.join(","));
    } else if (typeof v === "string") {
      params.set(field.key, v);
    }
  }
  return params;
}

/** Parse URLSearchParams back into a FilterValue given the field schema. */
export function deserializeFilters(
  params: URLSearchParams,
  fields: FilterField[],
): FilterValue {
  const out: FilterValue = {};
  for (const field of fields) {
    if (field.kind === "daterange") {
      const from = params.get(field.key + DATE_FROM_SUFFIX) ?? undefined;
      const to = params.get(field.key + DATE_TO_SUFFIX) ?? undefined;
      if (from || to) out[field.key] = { from, to };
    } else if (field.kind === "multiselect") {
      const raw = params.get(field.key);
      if (raw) out[field.key] = raw.split(",").filter(Boolean);
    } else {
      const raw = params.get(field.key);
      if (raw != null && raw !== "") out[field.key] = raw;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Location hierarchy / cascade
// ---------------------------------------------------------------------------

const LEVEL_ORDER: LocationLevel[] = ["property", "unit", "floor", "block", "zone"];

/**
 * Build a LocationNode tree from flat rows. Each row supplies any subset of the
 * five levels; missing levels are skipped. Useful when a page already has a flat
 * list (e.g. units with property/floor columns) and wants a cascade for free.
 */
export function buildLocationTree(
  rows: Array<Partial<Record<LocationLevel, { value: string; label: string }>>>,
): LocationNode[] {
  const roots: LocationNode[] = [];
  const index = new Map<string, LocationNode>();

  for (const row of rows) {
    let parentChildren = roots;
    let pathKey = "";
    for (const level of LEVEL_ORDER) {
      const cell = row[level];
      if (!cell) continue;
      pathKey += `${level}:${cell.value}|`;
      let node = index.get(pathKey);
      if (!node) {
        node = { value: cell.value, label: cell.label, level, children: [] };
        index.set(pathKey, node);
        parentChildren.push(node);
      }
      parentChildren = node.children!;
    }
  }
  return roots;
}

/**
 * Given the location tree and the current selection, return the available
 * options for one level — narrowed by any ancestor selections above it.
 * This is the cascade: choosing a Property limits Units/Floors/etc.
 *
 * `levelKeys` maps each LocationLevel to its field key in the FilterValue
 * (levels and field keys are usually the same string, but need not be).
 */
export function cascadeOptions(
  tree: LocationNode[],
  level: LocationLevel,
  value: FilterValue,
  levelKeys: Partial<Record<LocationLevel, string>> = {},
): FilterOption[] {
  const keyFor = (lvl: LocationLevel) => levelKeys[lvl] ?? lvl;
  const seen = new Map<string, FilterOption>();

  const walk = (nodes: LocationNode[]) => {
    for (const node of nodes) {
      if (node.level === level) {
        if (!seen.has(node.value))
          seen.set(node.value, { value: node.value, label: node.label });
        continue;
      }
      // Only descend through branches consistent with the current selection.
      const selected = value[keyFor(node.level)];
      const matches =
        isFieldEmpty(selected) ||
        (typeof selected === "string" && selected === node.value) ||
        (Array.isArray(selected) && selected.includes(node.value));
      if (matches && node.children?.length) walk(node.children);
    }
  };
  walk(tree);
  return [...seen.values()];
}

/**
 * When an ancestor selection changes, child selections may no longer be valid.
 * Returns a cleaned FilterValue with stale descendant location selections
 * removed. Call this inside onChange for location cascades.
 */
export function pruneStaleLocations(
  tree: LocationNode[],
  value: FilterValue,
  levelKeys: Partial<Record<LocationLevel, string>> = {},
): FilterValue {
  const keyFor = (lvl: LocationLevel) => levelKeys[lvl] ?? lvl;
  let next = value;
  for (let i = 1; i < LEVEL_ORDER.length; i++) {
    const level = LEVEL_ORDER[i];
    const key = keyFor(level);
    const current = next[key];
    if (isFieldEmpty(current)) continue;
    const valid = new Set(cascadeOptions(tree, level, next, levelKeys).map((o) => o.value));
    if (typeof current === "string" && !valid.has(current)) {
      next = { ...next, [key]: undefined };
    } else if (Array.isArray(current)) {
      const kept = current.filter((v) => valid.has(v));
      if (kept.length !== current.length) next = { ...next, [key]: kept };
    }
  }
  return next;
}

// ---------------------------------------------------------------------------
// Generic client-side filtering
// ---------------------------------------------------------------------------

/**
 * An accessor maps a row to the comparable value(s) for one field key.
 * - select/segmented: return the row's string value
 * - multiselect: return a string or string[] (row passes if it intersects the
 *   selected set)
 * - search: return a string (or string[]) to substring-match against
 * - daterange: return an ISO date string (or Date / number timestamp)
 */
export type FilterAccessor<Row> = (
  row: Row,
) => string | string[] | number | Date | null | undefined;

export type FilterAccessors<Row> = Record<string, FilterAccessor<Row>>;

const toTime = (v: string | number | Date): number =>
  v instanceof Date ? v.getTime() : typeof v === "number" ? v : new Date(v).getTime();

/** Does a single row satisfy a single field's selection? */
function matchField<Row>(
  row: Row,
  selection: FilterFieldValue,
  accessor: FilterAccessor<Row> | undefined,
): boolean {
  if (isFieldEmpty(selection) || !accessor) return true;
  const cell = accessor(row);

  // daterange
  if (isDateRange(selection)) {
    if (cell == null) return false;
    const t = toTime(cell as string | number | Date);
    if (Number.isNaN(t)) return false;
    if (selection.from && t < toTime(selection.from)) return false;
    if (selection.to) {
      // inclusive end-of-day for date-only "to" bounds
      const to = toTime(selection.to);
      const end = selection.to.length <= 10 ? to + 86_399_999 : to;
      if (t > end) return false;
    }
    return true;
  }

  // multiselect (OR within the field)
  if (isStringArray(selection)) {
    if (cell == null) return false;
    const cellSet = Array.isArray(cell) ? cell.map(String) : [String(cell)];
    return selection.some((s) => cellSet.includes(s));
  }

  // string: search (substring) vs select/segmented (exact)
  if (typeof selection === "string") {
    if (cell == null) return false;
    const needle = selection.toLowerCase().trim();
    const haystacks = Array.isArray(cell) ? cell : [cell];
    // Heuristic: substring match is the safe superset and also serves exact
    // select fields (the option value will be contained in the cell). Callers
    // wanting strict equality can pre-narrow via the accessor.
    return haystacks.some((h) => String(h).toLowerCase().includes(needle));
  }

  return true;
}

/**
 * Filter `rows` by the full FilterValue. A row is kept only if it matches every
 * active field (AND across fields, OR within a multiselect).
 */
export function applyFilters<Row>(
  rows: Row[],
  value: FilterValue,
  accessors: FilterAccessors<Row>,
): Row[] {
  const activeKeys = Object.keys(value).filter((k) => !isFieldEmpty(value[k]));
  if (activeKeys.length === 0) return rows;
  return rows.filter((row) =>
    activeKeys.every((key) => matchField(row, value[key], accessors[key])),
  );
}

// ---------------------------------------------------------------------------
// useFilterState hook
// ---------------------------------------------------------------------------

export interface UseFilterStateOptions {
  /** Field schema — needed for URL (de)serialization. */
  fields: FilterField[];
  /** Initial selection (used when not URL-syncing, or as a fallback). */
  initial?: FilterValue;
  /**
   * When true, read/write the selection to window URLSearchParams so filters
   * survive refresh and are shareable. Uses history.replaceState — no full
   * navigation, no server round-trip.
   */
  urlSync?: boolean;
  /** Override the param string source (defaults to window.location.search). */
  initialSearch?: string;
}

export interface UseFilterStateResult {
  value: FilterValue;
  setValue: (next: FilterValue) => void;
  /** Replace one field's value (convenience). */
  setField: (key: string, fieldValue: FilterFieldValue) => void;
  clearAll: () => void;
  /** Current selection encoded as a query string (no leading "?"). */
  toQueryString: () => string;
}

/**
 * Controlled filter state with optional URL sync. Safe in client components.
 * On the server, `initialSearch` should be passed from the route's searchParams
 * so the first render matches the URL (avoids hydration mismatch).
 */
export function useFilterState(opts: UseFilterStateOptions): UseFilterStateResult {
  const { fields, initial, urlSync, initialSearch } = opts;
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  const firstValue = useMemo(() => {
    if (urlSync) {
      const search =
        initialSearch ??
        (typeof window !== "undefined" ? window.location.search : "");
      const fromUrl = deserializeFilters(new URLSearchParams(search), fields);
      return { ...(initial ?? {}), ...fromUrl };
    }
    return initial ?? {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [value, setValueState] = useState<FilterValue>(firstValue);

  const writeUrl = useCallback((next: FilterValue) => {
    if (!urlSync || typeof window === "undefined") return;
    const current = new URLSearchParams(window.location.search);
    const params = serializeFilters(next, fieldsRef.current, current);
    const qs = params.toString();
    const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState(null, "", url);
  }, [urlSync]);

  const setValue = useCallback((next: FilterValue) => {
    setValueState(next);
    writeUrl(next);
  }, [writeUrl]);

  const setField = useCallback((key: string, fieldValue: FilterFieldValue) => {
    setValueState((prev) => {
      const next = { ...prev, [key]: fieldValue };
      writeUrl(next);
      return next;
    });
  }, [writeUrl]);

  const clearAll = useCallback(() => {
    setValueState({});
    writeUrl({});
  }, [writeUrl]);

  const toQueryString = useCallback(
    () => serializeFilters(value, fieldsRef.current).toString(),
    [value],
  );

  return { value, setValue, setField, clearAll, toQueryString };
}
