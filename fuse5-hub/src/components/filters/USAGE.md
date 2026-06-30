# FilterBar — reusable dashboard filters

A schema-driven filter bar for every Fuse5 Hub dashboard. Drop it in, pass a
`fields` schema + `value`/`onChange`, get filter chips, cascading location
filters, URL-synced shareable state, and a generic client-side `applyFilters`.

Aurora design system — uses only `f5-` classes + CSS variables, so light/dark
mode work automatically. Zero new dependencies.

## Files

| File | What it is |
| --- | --- |
| `src/components/filters/FilterBar.tsx` | `"use client"` UI (the bar) |
| `src/components/filters/types.ts` | Field schema + selection types |
| `src/lib/filters.ts` | `useFilterState`, `applyFilters`, URL (de)serialize, location cascade |

## Field kinds

`select` (single dropdown) · `multiselect` (checkbox popover) · `search` (text)
· `daterange` (from/to dates) · `segmented` (pill toggle group).

Any field with a `locationLevel` (`"property" | "unit" | "floor" | "block" |
"zone"`) becomes part of the location cascade when you pass a `locationTree`:
choosing a Property narrows the Unit/Floor/Block/Zone options for free, and
stale child selections auto-prune.

## Public API

```ts
// FilterBar props
interface FilterBarProps {
  fields: FilterField[];
  value: FilterValue;                       // controlled
  onChange: (next: FilterValue) => void;
  locationTree?: LocationNode[];            // enables the cascade
  locationLevelKeys?: Partial<Record<LocationLevel, string>>;
  resultCount?: number;                     // count slot
  resultLabel?: string;                     // default "results"
  actions?: React.ReactNode;                // right-aligned slot (e.g. export)
  className?: string;
}

// State hook (src/lib/filters.ts)
function useFilterState(opts: {
  fields: FilterField[];
  initial?: FilterValue;
  urlSync?: boolean;          // sync to URLSearchParams (shareable, survives refresh)
  initialSearch?: string;     // pass route searchParams string for SSR-correct first render
}): {
  value: FilterValue;
  setValue: (next: FilterValue) => void;
  setField: (key: string, v: FilterFieldValue) => void;
  clearAll: () => void;
  toQueryString: () => string;
};

// Generic client-side filtering (src/lib/filters.ts)
function applyFilters<Row>(
  rows: Row[],
  value: FilterValue,
  accessors: Record<string, (row: Row) => string | string[] | number | Date | null | undefined>,
): Row[];

// Location helpers (src/lib/filters.ts)
function buildLocationTree(rows): LocationNode[];     // flat rows -> tree
function cascadeOptions(tree, level, value, levelKeys?): FilterOption[];
function pruneStaleLocations(tree, value, levelKeys?): FilterValue;
```

## Copy-paste: wire it into a list page (client component)

```tsx
"use client";
import { useMemo } from "react";
import { FilterBar } from "@/components/filters/FilterBar";
import type { FilterField } from "@/components/filters/types";
import { useFilterState, applyFilters } from "@/lib/filters";

const FIELDS: FilterField[] = [
  { key: "property", label: "Property", kind: "select", locationLevel: "property", options: [/* {value,label} */] },
  { key: "unit",     label: "Unit",     kind: "select", locationLevel: "unit",     options: [] },
  { key: "status",   label: "Status",   kind: "segmented", options: [{ value: "open", label: "Open" }, { value: "urgent", label: "Urgent" }] },
  { key: "q",        label: "Search",   kind: "search" },
];

export function WorkOrdersList({ rows, locationTree, initialSearch }: { rows: WorkOrderRow[]; locationTree: LocationNode[]; initialSearch: string }) {
  const { value, onChange } = ((s) => ({ value: s.value, onChange: s.setValue }))(
    useFilterState({ fields: FIELDS, urlSync: true, initialSearch }));
  const filtered = useMemo(() => applyFilters(rows, value, {
    property: (r) => r.propertyId,
    unit:     (r) => r.unit,
    status:   (r) => r.status,
    q:        (r) => `${r.title} ${r.unit}`,
  }), [rows, value]);

  return (
    <>
      <FilterBar fields={FIELDS} value={value} onChange={onChange} locationTree={locationTree} resultCount={filtered.length} resultLabel="work orders" />
      {/* render `filtered` in your f5-table */}
    </>
  );
}
```

> SSR note: pass the route's `searchParams` string as `initialSearch` so the
> first client render matches the URL (no hydration mismatch). In the server
> page: `const sp = await searchParams; <WorkOrdersList initialSearch={new URLSearchParams(sp as Record<string,string>).toString()} … />`.

## Sorting (companion to filtering)

Column sorting lives in `src/lib/sort.ts` + `src/components/filters/SortHeader.tsx`.
Same philosophy: dependency-free, URL-synced (`?sort=<key>&dir=<asc|desc>`), and a
generic `applySort` driven by per-column accessors. Compose it *after* `applyFilters`.

```tsx
import { SortHeader } from "@/components/filters/SortHeader";
import { useSortState, applySort } from "@/lib/sort";

const { sort, toggle } = useSortState({ urlSync: true });   // or { initial: { key: "name", dir: "asc" } }

const rows = useMemo(() => {
  const matched = applyFilters(all, value, { /* filter accessors */ });
  return applySort(matched, sort, {
    name:          (r) => r.name,                 // text → localeCompare (numeric-aware)
    units:         (r) => r.units,                // number → numeric compare
    lastContacted: (r) => r.lastAt ? new Date(r.lastAt) : null,  // Date (null sorts last)
  });
}, [all, value, sort]);

// In <thead>: make a header sortable by wrapping it. Non-sortable cols stay plain <th>.
<SortHeader sortKey="name" sort={sort} onSort={toggle}>Name</SortHeader>
<SortHeader sortKey="units" sort={sort} onSort={toggle} align="right">Units</SortHeader>
<th style={{ textAlign: "right" }}>Actions</th>
```

- **One active sort per table.** Clicking a header flips asc↔desc; a new header
  starts ascending. The ▲/▼ indicator marks the active column.
- **Empties sort last** in both directions (null/`""`/`"—"` accessor results),
  so "sort by date" never floats blank rows to the top. Sort is **stable**.
- **One URL-synced table per route.** `?sort`/`?dir` are shared params, so if a
  page renders two sortable tables, pass `urlSync:false` to the second one's
  `useSortState` (and `useFilterState`).

## Notes

- **AND across fields, OR within a multiselect.** A row passes only if it
  satisfies every active field; a multiselect passes if the row matches any
  selected option.
- **`applyFilters` accessors** return the comparable value for a field key.
  Select/segmented match by substring-containment (safe superset); pre-narrow in
  the accessor if you need strict equality. `daterange` accessors return an ISO
  string / `Date` / timestamp; date-only `to` bounds are inclusive end-of-day.
- **URL encoding:** single fields → `?key=value`; multiselect → `?key=a,b,c`;
  daterange → `?key_from=…&key_to=…`.
```
