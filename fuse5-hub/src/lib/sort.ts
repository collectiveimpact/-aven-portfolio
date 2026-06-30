"use client";

// Reusable column sorting — the companion to lib/filters.ts.
//
// Same philosophy as the filter system: dependency-free (plain React + Web
// APIs), optionally URL-synced (shareable, survives refresh), and a generic
// client-side `applySort` driven by per-column accessors. Pair with the
// <SortHeader> component for clickable, indicator-bearing table headers.
//
//   URL encoding:  ?sort=<key>&dir=<asc|desc>   (one active sort per table)

import { useCallback, useMemo, useRef, useState } from "react";

export type SortDir = "asc" | "desc";

export interface SortState {
  /** Active sort column key, or null for the table's natural order. */
  key: string | null;
  dir: SortDir;
}

export const NO_SORT: SortState = { key: null, dir: "asc" };

// ---------------------------------------------------------------------------
// Comparable extraction + comparator
// ---------------------------------------------------------------------------

/** Maps a row to the comparable value for one column. */
export type SortAccessor<Row> = (
  row: Row,
) => string | number | Date | boolean | null | undefined;

export type SortAccessors<Row> = Record<string, SortAccessor<Row>>;

/** Normalize an accessor result to a primitive comparable; null = "empty". */
function toComparable(v: ReturnType<SortAccessor<unknown>>): string | number | null {
  if (v == null) return null;
  if (v instanceof Date) {
    const t = v.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "number") return Number.isNaN(v) ? null : v;
  const s = String(v).trim();
  return s === "" || s === "—" ? null : s;
}

/** Compare two comparables; empties (null) always sort last regardless of dir. */
function compare(a: string | number | null, b: string | number | null): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1; // a empty -> after b
  if (b == null) return -1; // b empty -> after a
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Return a new, stably-sorted copy of `rows` for the active SortState. When no
 * column is active (`key == null`) or no accessor matches, the original order
 * is preserved. Empty cells are pushed to the bottom in both directions so a
 * "sort by date" never floats blank rows to the top.
 */
export function applySort<Row>(
  rows: Row[],
  sort: SortState,
  accessors: SortAccessors<Row>,
): Row[] {
  if (!sort.key) return rows;
  const accessor = accessors[sort.key];
  if (!accessor) return rows;
  const sign = sort.dir === "desc" ? -1 : 1;
  // decorate-sort-undecorate keeps the sort stable + avoids re-running accessors
  return rows
    .map((row, i) => ({ row, i, key: toComparable(accessor(row)) }))
    .sort((x, y) => {
      // Empties last in BOTH directions: compare nulls without applying sign.
      if (x.key == null || y.key == null) {
        const c = compare(x.key, y.key);
        return c !== 0 ? c : x.i - y.i;
      }
      const c = compare(x.key, y.key) * sign;
      return c !== 0 ? c : x.i - y.i; // stable tiebreak by original index
    })
    .map((d) => d.row);
}

// ---------------------------------------------------------------------------
// URL (de)serialization
// ---------------------------------------------------------------------------

const SORT_PARAM = "sort";
const DIR_PARAM = "dir";

export function serializeSort(sort: SortState, base?: URLSearchParams): URLSearchParams {
  const params = new URLSearchParams(base?.toString() ?? "");
  params.delete(SORT_PARAM);
  params.delete(DIR_PARAM);
  if (sort.key) {
    params.set(SORT_PARAM, sort.key);
    params.set(DIR_PARAM, sort.dir);
  }
  return params;
}

export function deserializeSort(params: URLSearchParams, fallback: SortState = NO_SORT): SortState {
  const key = params.get(SORT_PARAM);
  if (!key) return fallback;
  const dir = params.get(DIR_PARAM) === "desc" ? "desc" : "asc";
  return { key, dir };
}

// ---------------------------------------------------------------------------
// useSortState hook
// ---------------------------------------------------------------------------

export interface UseSortStateOptions {
  /** Initial/default sort (used when not URL-syncing, or as a fallback). */
  initial?: SortState;
  /** When true, read/write the sort to the URL via history.replaceState. */
  urlSync?: boolean;
  /** Override the param string source (SSR-correct first render). */
  initialSearch?: string;
}

export interface UseSortStateResult {
  sort: SortState;
  /** Click a header: same key flips asc<->desc; new key starts ascending. */
  toggle: (key: string) => void;
  setSort: (next: SortState) => void;
  clear: () => void;
}

export function useSortState(opts: UseSortStateOptions = {}): UseSortStateResult {
  const { initial = NO_SORT, urlSync, initialSearch } = opts;
  const initialRef = useRef(initial);

  const first = useMemo(() => {
    if (urlSync) {
      const search =
        initialSearch ?? (typeof window !== "undefined" ? window.location.search : "");
      return deserializeSort(new URLSearchParams(search), initialRef.current);
    }
    return initialRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [sort, setSortState] = useState<SortState>(first);

  const writeUrl = useCallback(
    (next: SortState) => {
      if (!urlSync || typeof window === "undefined") return;
      const params = serializeSort(next, new URLSearchParams(window.location.search));
      const qs = params.toString();
      window.history.replaceState(
        null,
        "",
        qs ? `${window.location.pathname}?${qs}` : window.location.pathname,
      );
    },
    [urlSync],
  );

  const setSort = useCallback(
    (next: SortState) => {
      setSortState(next);
      writeUrl(next);
    },
    [writeUrl],
  );

  const toggle = useCallback(
    (key: string) => {
      setSortState((prev) => {
        const next: SortState =
          prev.key === key
            ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
            : { key, dir: "asc" };
        writeUrl(next);
        return next;
      });
    },
    [writeUrl],
  );

  const clear = useCallback(() => setSort(NO_SORT), [setSort]);

  return { sort, toggle, setSort, clear };
}
