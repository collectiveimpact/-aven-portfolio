"use client";

// A sortable <th> for f5-table. Clicking toggles the column's sort direction;
// the active column shows a ▲/▼ indicator, inactive columns a faint ⇅ affordance
// on hover. Aurora-styled (f5- vars only) so light/dark work automatically.
//
//   <thead><tr>
//     <SortHeader sortKey="name" sort={sort} onSort={toggle}>Name</SortHeader>
//     <SortHeader sortKey="units" sort={sort} onSort={toggle} align="right" numeric>Units</SortHeader>
//     <th>Actions</th>            {/* non-sortable columns stay plain <th> */}
//   </tr></thead>

import type { CSSProperties, ReactNode } from "react";
import type { SortDir, SortState } from "@/lib/sort";

export function SortHeader({
  sortKey,
  sort,
  onSort,
  children,
  align = "left",
  style,
  title,
}: {
  /** Column key — must match the key used in the applySort accessors map. */
  sortKey: string;
  sort: SortState;
  onSort: (key: string) => void;
  children: ReactNode;
  align?: "left" | "right" | "center";
  /** Optional extra cell styles (e.g. width). */
  style?: CSSProperties;
  title?: string;
}) {
  const active = sort.key === sortKey;
  const dir: SortDir | null = active ? sort.dir : null;
  const indicator = dir === "asc" ? "▲" : dir === "desc" ? "▼" : "⇅";

  return (
    <th
      onClick={() => onSort(sortKey)}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      title={title ?? `Sort by ${typeof children === "string" ? children : sortKey}`}
      style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap", textAlign: align, ...style }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          flexDirection: align === "right" ? "row-reverse" : "row",
        }}
      >
        {children}
        <span
          aria-hidden
          style={{
            fontSize: 9,
            lineHeight: 1,
            opacity: active ? 1 : 0.32,
            color: active ? "var(--f5-teal, #00CCCC)" : "var(--f5-text-muted)",
            transition: "opacity .12s",
          }}
        >
          {indicator}
        </span>
      </span>
    </th>
  );
}
