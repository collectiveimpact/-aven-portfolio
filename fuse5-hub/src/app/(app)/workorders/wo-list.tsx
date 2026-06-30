"use client";

import Link from "next/link";
import { useMemo } from "react";
import { FilterBar } from "@/components/filters/FilterBar";
import { SortHeader } from "@/components/filters/SortHeader";
import type { FilterField, FilterOption, LocationNode } from "@/components/filters/types";
import { useFilterState, applyFilters } from "@/lib/filters";
import { useSortState, applySort } from "@/lib/sort";
import type { WorkOrderRow } from "@/lib/queries";
import { WoStatus } from "./wo-status";

// Sort weights so Priority/Status order by severity/flow, not alphabetically.
const PRIORITY_RANK: Record<WorkOrderRow["priority"], number> = { urgent: 3, high: 2, medium: 1, low: 0 };
const STATUS_RANK: Record<WorkOrderRow["status"], number> = { open: 2, in_progress: 1, resolved: 0 };

const CHANNEL_ICON: Record<string, string> = { email: "✉", sms: "💬", whatsapp: "🟢", voice: "📞", display: "🖥" };
const NOTICE_BADGE: Record<WorkOrderRow["noticeStatus"], string> = { none: "", draft: "f5-badge warn", pending_review: "f5-badge", approved: "f5-badge", published: "f5-badge ok" };
const NOTICE_LABEL: Record<WorkOrderRow["noticeStatus"], string> = { none: "—", draft: "Draft", pending_review: "In Review", approved: "Approved", published: "Sent" };
const PRIORITY_BADGE: Record<WorkOrderRow["priority"], string> = { urgent: "f5-badge bad", high: "f5-badge warn", medium: "f5-badge", low: "f5-badge" };

const STATUS_OPTIONS: FilterOption[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];
const PRIORITY_OPTIONS: FilterOption[] = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const uniqueSorted = (xs: string[]): string[] => [...new Set(xs.filter((x) => x && x !== "—"))].sort((a, b) => a.localeCompare(b));

// Filterable Work Order queue. Server page fetches the rows + role flag and hands
// them here; all filtering is client-side over the already-fetched rows.
export function WorkOrdersList({
  rows,
  canEdit,
  initialSearch,
}: {
  rows: WorkOrderRow[];
  canEdit: boolean;
  initialSearch: string;
}) {
  // Derive facet options from the actual data so filters only show real values.
  const propertyOptions = useMemo<FilterOption[]>(
    () => uniqueSorted(rows.map((r) => r.propertyName)).map((p) => ({ value: p, label: p })),
    [rows],
  );
  const categoryOptions = useMemo<FilterOption[]>(
    () => uniqueSorted(rows.map((r) => r.category)).map((c) => ({ value: c, label: c })),
    [rows],
  );
  // Single-level location tree keyed on propertyName (WO rows carry no unit/floor hierarchy).
  const locationTree = useMemo<LocationNode[]>(
    () => propertyOptions.map((p) => ({ value: p.value, label: p.label, level: "property" as const })),
    [propertyOptions],
  );

  const FIELDS = useMemo<FilterField[]>(
    () => [
      { key: "property", label: "Property", kind: "select", locationLevel: "property", options: propertyOptions, allLabel: "All properties" },
      { key: "source", label: "Source", kind: "segmented", options: [{ value: "portal", label: "Resident requests" }, { value: "staff", label: "Staff" }], allLabel: "All sources" },
      { key: "status", label: "Status", kind: "segmented", options: STATUS_OPTIONS, allLabel: "All" },
      { key: "priority", label: "Priority", kind: "multiselect", options: PRIORITY_OPTIONS },
      { key: "category", label: "Category", kind: "multiselect", options: categoryOptions },
      { key: "q", label: "Search", kind: "search", placeholder: "Search title, unit, category…" },
    ],
    [propertyOptions, categoryOptions],
  );

  const { value, setValue } = useFilterState({ fields: FIELDS, urlSync: true, initialSearch });
  const { sort, toggle } = useSortState({ urlSync: true });

  const filtered = useMemo(() => {
    const matched = applyFilters(rows, value, {
      // Exact-equality intent: property/status/priority/category accessors return
      // the canonical row value; applyFilters substring-contains is a safe superset.
      property: (r) => r.propertyName,
      source: (r) => r.source ?? "staff",
      status: (r) => r.status,
      priority: (r) => r.priority,
      category: (r) => r.category,
      q: (r) => `${r.title} ${r.propertyName} ${r.unit} ${r.category}`,
    });
    return applySort(matched, sort, {
      title: (r) => r.title,
      property: (r) => `${r.propertyName} ${r.unit}`,
      category: (r) => r.category,
      priority: (r) => PRIORITY_RANK[r.priority],
      status: (r) => STATUS_RANK[r.status],
    });
  }, [rows, value, sort]);

  return (
    <>
      <FilterBar
        fields={FIELDS}
        value={value}
        onChange={setValue}
        locationTree={locationTree}
        resultCount={filtered.length}
        resultLabel="work orders"
      />

      <div className="f5-card" style={{ padding: 0, marginTop: 14 }}>
        <table className="f5-table">
          <thead>
            <tr>
              <SortHeader sortKey="title" sort={sort} onSort={toggle}>Title</SortHeader>
              <SortHeader sortKey="property" sort={sort} onSort={toggle}>Property / Unit</SortHeader>
              <SortHeader sortKey="category" sort={sort} onSort={toggle}>Category</SortHeader>
              <th>Channels</th>
              <th>Notice</th>
              <SortHeader sortKey="priority" sort={sort} onSort={toggle}>Priority</SortHeader>
              <SortHeader sortKey="status" sort={sort} onSort={toggle}>Status</SortHeader>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} style={{ color: "var(--f5-text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>
                  No work orders match.
                </td>
              </tr>
            )}
            {filtered.map((w) => (
              <tr key={w.id}>
                <td style={{ color: "var(--f5-text)" }}>{w.title}{w.source === "portal" && <span className="f5-badge ok" style={{ marginLeft: 8, fontSize: 10 }}>Resident</span>}</td>
                <td>{w.propertyName} · {w.unit}</td>
                <td>{w.category}</td>
                <td style={{ fontSize: 15, letterSpacing: 2 }}>{w.channels.map((c) => CHANNEL_ICON[c] ?? "•").join(" ") || "—"}</td>
                <td>{w.noticeStatus === "none" ? <span style={{ color: "var(--f5-text-dim)" }}>—</span> : <span className={NOTICE_BADGE[w.noticeStatus]}>{NOTICE_LABEL[w.noticeStatus]}</span>}</td>
                <td><span className={PRIORITY_BADGE[w.priority]}>{w.priority}</span></td>
                <td><WoStatus id={w.id} status={w.status} canEdit={canEdit} /></td>
                <td><Link href={`/workorders/${w.id}`} className="f5-btn" style={{ padding: "5px 12px", fontSize: 12 }}>Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
