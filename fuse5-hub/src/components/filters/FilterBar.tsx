"use client";

// Reusable, schema-driven Filter Bar for every Fuse5 Hub dashboard.
// Aurora design system — uses only f5- classes + CSS variables (light/dark safe).
//
// Controlled component: pass `value` + `onChange`. Pair with `useFilterState`
// (src/lib/filters.ts) for URL-synced, shareable filters.

import { useId, useMemo, useRef, useState } from "react";
import type {
  ActiveChip,
  FilterField,
  FilterOption,
  FilterValue,
  LocationLevel,
  LocationNode,
} from "./types";
import {
  cascadeOptions,
  countActiveFilters,
  isFieldEmpty,
  pruneStaleLocations,
} from "@/lib/filters";

export interface FilterBarProps {
  /** Which filters to render, in order. */
  fields: FilterField[];
  /** Current selection (controlled). */
  value: FilterValue;
  /** Called with the next selection whenever a control changes. */
  onChange: (next: FilterValue) => void;
  /**
   * Optional location tree (Property → Unit → Floor → Block → Zone). When
   * provided, any field with a `locationLevel` gets cascading options for free
   * and downstream selections auto-prune when an ancestor changes.
   */
  locationTree?: LocationNode[];
  /**
   * Maps a LocationLevel to the field key holding its selection, when they
   * differ from the level name. Defaults to identity (property→"property" …).
   */
  locationLevelKeys?: Partial<Record<LocationLevel, string>>;
  /** Result count rendered in the bar's count slot (e.g. filtered row total). */
  resultCount?: number;
  /** Label next to the count, e.g. "work orders". Defaults to "results". */
  resultLabel?: string;
  /** Extra content rendered on the right (e.g. an export button). */
  actions?: React.ReactNode;
  /** Optional className passthrough on the outer card. */
  className?: string;
}

const ALL = ""; // sentinel for "no selection" on single-choice fields

// ---------------------------------------------------------------------------
// Individual controls
// ---------------------------------------------------------------------------

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="f5-label" style={{ margin: "0 0 4px" }}>
      {children}
    </label>
  );
}

function SegmentedControl({
  field,
  options,
  selected,
  onPick,
}: {
  field: FilterField & { kind: "segmented" };
  options: FilterOption[];
  selected: string;
  onPick: (v: string) => void;
}) {
  return (
    <div>
      <FieldLabel>{field.label}</FieldLabel>
      <div className="f5-chips" role="group" aria-label={field.label}>
        <button
          type="button"
          className={`f5-chip${selected === ALL ? " active" : ""}`}
          aria-pressed={selected === ALL}
          onClick={() => onPick(ALL)}
        >
          {field.allLabel ?? "All"}
        </button>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            className={`f5-chip${selected === o.value ? " active" : ""}`}
            aria-pressed={selected === o.value}
            onClick={() => onPick(o.value)}
          >
            {o.label}
            {o.count != null ? ` (${o.count})` : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

function MultiSelectControl({
  field,
  options,
  selected,
  onToggle,
}: {
  field: FilterField & { kind: "multiselect" };
  options: FilterOption[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <FieldLabel>{field.label}</FieldLabel>
      <button
        type="button"
        className="f5-select"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={labelId}
        onClick={() => setOpen((v) => !v)}
        style={{ textAlign: "left", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}
      >
        <span id={labelId} style={{ color: selected.length ? "var(--f5-text)" : "var(--f5-text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected.length ? `${selected.length} selected` : field.placeholder ?? `Any ${field.label.toLowerCase()}`}
        </span>
        <span aria-hidden style={{ color: "var(--f5-text-muted)", fontSize: 11 }}>▾</span>
      </button>
      {open && (
        <>
          {/* click-away backdrop */}
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
          <div
            role="listbox"
            aria-multiselectable
            aria-label={field.label}
            className="f5-card"
            style={{ position: "absolute", zIndex: 41, top: "calc(100% + 4px)", left: 0, minWidth: 220, maxHeight: 280, overflowY: "auto", padding: 6, boxShadow: "var(--f5-shadow-md)" }}
          >
            {options.length === 0 && (
              <div style={{ padding: 8, fontSize: 12, color: "var(--f5-text-muted)" }}>No options</div>
            )}
            {options.map((o) => {
              const checked = selected.includes(o.value);
              return (
                <label
                  key={o.value}
                  role="option"
                  aria-selected={checked}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", borderRadius: "var(--f5-radius-sm)", cursor: "pointer", fontSize: 13, color: "var(--f5-text-secondary)" }}
                >
                  <input type="checkbox" checked={checked} onChange={() => onToggle(o.value)} />
                  <span style={{ flex: 1 }}>{o.label}</span>
                  {o.count != null && <span style={{ color: "var(--f5-text-muted)", fontSize: 11 }}>{o.count}</span>}
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Active-filter chips
// ---------------------------------------------------------------------------

function buildActiveChips(
  fields: FilterField[],
  value: FilterValue,
  optionLabel: (fieldKey: string, optionValue: string) => string,
): ActiveChip[] {
  const chips: ActiveChip[] = [];
  for (const f of fields) {
    const v = value[f.key];
    if (isFieldEmpty(v)) continue;
    if (f.kind === "multiselect" && Array.isArray(v)) {
      for (const ov of v) {
        chips.push({ fieldKey: f.key, optionValue: ov, label: `${f.label}: ${optionLabel(f.key, ov)}` });
      }
    } else if (f.kind === "daterange" && typeof v === "object" && v !== null && !Array.isArray(v)) {
      const range = [v.from, v.to].filter(Boolean).join(" → ");
      chips.push({ fieldKey: f.key, label: `${f.label}: ${range}` });
    } else if (f.kind === "search" && typeof v === "string") {
      chips.push({ fieldKey: f.key, label: `${f.label}: “${v}”` });
    } else if (typeof v === "string") {
      chips.push({ fieldKey: f.key, label: `${f.label}: ${optionLabel(f.key, v)}` });
    }
  }
  return chips;
}

// ---------------------------------------------------------------------------
// FilterBar
// ---------------------------------------------------------------------------

export function FilterBar({
  fields,
  value,
  onChange,
  locationTree,
  locationLevelKeys = {},
  resultCount,
  resultLabel = "results",
  actions,
  className,
}: FilterBarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const baseId = useId();
  const activeCount = countActiveFilters(value);

  // Resolve options per field, applying the location cascade where relevant.
  const optionsByField = useMemo(() => {
    const map: Record<string, FilterOption[]> = {};
    for (const f of fields) {
      if ("options" in f) {
        if (f.locationLevel && locationTree) {
          map[f.key] = cascadeOptions(locationTree, f.locationLevel, value, locationLevelKeys);
        } else {
          map[f.key] = f.options;
        }
      }
    }
    return map;
  }, [fields, value, locationTree, locationLevelKeys]);

  const optionLabel = (fieldKey: string, optionValue: string) =>
    optionsByField[fieldKey]?.find((o) => o.value === optionValue)?.label ?? optionValue;

  // Mutators — all route through onChange; location changes prune descendants.
  const commit = (next: FilterValue) => {
    onChange(locationTree ? pruneStaleLocations(locationTree, next, locationLevelKeys) : next);
  };
  const setField = (key: string, v: FilterValue[string]) => commit({ ...value, [key]: v });
  const toggleMulti = (key: string, ov: string) => {
    const cur = (Array.isArray(value[key]) ? value[key] : []) as string[];
    const next = cur.includes(ov) ? cur.filter((x) => x !== ov) : [...cur, ov];
    setField(key, next);
  };
  const removeChip = (chip: ActiveChip) => {
    if (chip.optionValue != null) {
      const cur = (Array.isArray(value[chip.fieldKey]) ? value[chip.fieldKey] : []) as string[];
      setField(chip.fieldKey, cur.filter((x) => x !== chip.optionValue));
    } else {
      setField(chip.fieldKey, undefined);
    }
  };
  const clearAll = () => onChange({});

  const chips = buildActiveChips(fields, value, optionLabel);

  return (
    <div className={`f5-card${className ? ` ${className}` : ""}`} style={{ padding: 14 }}>
      {/* Header row: title + count + collapse toggle + actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          className="f5-btn"
          aria-expanded={!collapsed}
          aria-controls={`${baseId}-fields`}
          onClick={() => setCollapsed((c) => !c)}
          style={{ padding: "6px 12px", fontSize: 12 }}
        >
          <span aria-hidden>⛃</span> Filters
          {activeCount > 0 && (
            <span className="f5-badge" style={{ marginLeft: 4 }}>{activeCount}</span>
          )}
          <span aria-hidden style={{ marginLeft: 2, color: "var(--f5-text-muted)" }}>{collapsed ? "▾" : "▴"}</span>
        </button>

        {typeof resultCount === "number" && (
          <span style={{ fontSize: 12, color: "var(--f5-text-muted)" }} aria-live="polite">
            <strong style={{ color: "var(--f5-text)" }}>{resultCount.toLocaleString()}</strong> {resultLabel}
          </span>
        )}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {activeCount > 0 && (
            <button type="button" className="f5-btn" onClick={clearAll} style={{ padding: "6px 12px", fontSize: 12 }}>
              Clear all
            </button>
          )}
          {actions}
        </div>
      </div>

      {/* Active-filter chips (removable) */}
      {chips.length > 0 && (
        <div className="f5-chips" style={{ marginTop: 12 }} aria-label="Active filters">
          {chips.map((chip, i) => (
            <span
              key={`${chip.fieldKey}-${chip.optionValue ?? "all"}-${i}`}
              className="f5-chip active"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              {chip.label}
              <button
                type="button"
                onClick={() => removeChip(chip)}
                aria-label={`Remove ${chip.label}`}
                style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0, lineHeight: 1, fontSize: 14 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Controls grid — collapses on narrow widths via auto-fill min(). */}
      {!collapsed && (
        <div
          id={`${baseId}-fields`}
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 220px), 1fr))",
            gap: 12,
            alignItems: "end",
          }}
        >
          {fields.map((f) => {
            const fid = `${baseId}-${f.key}`;
            if (f.kind === "search") {
              return (
                <div key={f.key}>
                  <FieldLabel htmlFor={fid}>{f.label}</FieldLabel>
                  <input
                    id={fid}
                    type="search"
                    className="f5-input"
                    placeholder={f.placeholder ?? `Search ${f.label.toLowerCase()}…`}
                    value={typeof value[f.key] === "string" ? (value[f.key] as string) : ""}
                    onChange={(e) => setField(f.key, e.target.value)}
                  />
                </div>
              );
            }
            if (f.kind === "select") {
              const opts = optionsByField[f.key] ?? [];
              const v = typeof value[f.key] === "string" ? (value[f.key] as string) : ALL;
              return (
                <div key={f.key}>
                  <FieldLabel htmlFor={fid}>{f.label}</FieldLabel>
                  <select id={fid} className="f5-select" value={v} onChange={(e) => setField(f.key, e.target.value || undefined)}>
                    <option value={ALL}>{f.allLabel ?? `All ${f.label.toLowerCase()}`}</option>
                    {opts.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}{o.count != null ? ` (${o.count})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }
            if (f.kind === "multiselect") {
              return (
                <MultiSelectControl
                  key={f.key}
                  field={f}
                  options={optionsByField[f.key] ?? []}
                  selected={(Array.isArray(value[f.key]) ? value[f.key] : []) as string[]}
                  onToggle={(ov) => toggleMulti(f.key, ov)}
                />
              );
            }
            if (f.kind === "segmented") {
              const v = typeof value[f.key] === "string" ? (value[f.key] as string) : ALL;
              return (
                <SegmentedControl
                  key={f.key}
                  field={f}
                  options={optionsByField[f.key] ?? []}
                  selected={v}
                  onPick={(picked) => setField(f.key, picked || undefined)}
                />
              );
            }
            if (f.kind === "daterange") {
              const dv = (typeof value[f.key] === "object" && value[f.key] !== null && !Array.isArray(value[f.key])
                ? value[f.key]
                : {}) as { from?: string; to?: string };
              return (
                <div key={f.key}>
                  <FieldLabel>{f.label}</FieldLabel>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <input
                      type="date"
                      className="f5-input"
                      aria-label={`${f.label} from`}
                      value={dv.from ?? ""}
                      onChange={(e) => setField(f.key, { ...dv, from: e.target.value || undefined })}
                    />
                    <span aria-hidden style={{ color: "var(--f5-text-muted)" }}>→</span>
                    <input
                      type="date"
                      className="f5-input"
                      aria-label={`${f.label} to`}
                      value={dv.to ?? ""}
                      onChange={(e) => setField(f.key, { ...dv, to: e.target.value || undefined })}
                    />
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

export default FilterBar;
