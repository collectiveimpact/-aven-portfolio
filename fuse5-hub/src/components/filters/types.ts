// FilterBar schema + selection types.
// Pure type module — safe to import from server or client code.

/** A single selectable option in a select/multiselect/segmented control. */
export interface FilterOption {
  value: string;
  label: string;
  /** Optional count/badge shown beside the option (e.g. result tally). */
  count?: number;
}

/** The kinds of controls FilterBar can render. */
export type FilterFieldKind =
  | "select" // single-choice dropdown
  | "multiselect" // many-choice checklist (chip popover)
  | "search" // free-text input
  | "daterange" // from / to date pair
  | "segmented"; // pill toggle group (single choice)

/** Which hierarchy level a location field represents. Drives the cascade. */
export type LocationLevel = "property" | "unit" | "floor" | "block" | "zone";

/** Base shape shared by every field descriptor. */
interface FilterFieldBase {
  /** Stable key — also the URL param name and the key into FilterValue. */
  key: string;
  /** Human label shown above/next to the control and in active chips. */
  label: string;
  /** Optional placeholder for search/select. */
  placeholder?: string;
  /**
   * When set, marks this field as part of the location hierarchy. FilterBar
   * uses `locationLevel` + the `LocationHierarchy` helper to cascade options:
   * picking a Property narrows Unit/Floor/Block/Zone automatically.
   */
  locationLevel?: LocationLevel;
}

export interface SelectField extends FilterFieldBase {
  kind: "select";
  options: FilterOption[];
  /** Label for the empty/“all” choice. Defaults to "All". */
  allLabel?: string;
}

export interface MultiSelectField extends FilterFieldBase {
  kind: "multiselect";
  options: FilterOption[];
}

export interface SearchField extends FilterFieldBase {
  kind: "search";
}

export interface DateRangeField extends FilterFieldBase {
  kind: "daterange";
}

export interface SegmentedField extends FilterFieldBase {
  kind: "segmented";
  options: FilterOption[];
  /** Label for the “all/any” pill. Defaults to "All". */
  allLabel?: string;
}

export type FilterField =
  | SelectField
  | MultiSelectField
  | SearchField
  | DateRangeField
  | SegmentedField;

/** A `{ from, to }` ISO-date pair (either side optional). */
export interface DateRangeValue {
  from?: string;
  to?: string;
}

/** Per-field selected value. The runtime shape depends on the field kind:
 *  - select / segmented → string
 *  - multiselect        → string[]
 *  - search             → string
 *  - daterange          → DateRangeValue
 */
export type FilterFieldValue = string | string[] | DateRangeValue | undefined;

/** The full selection state, keyed by field key. */
export type FilterValue = Record<string, FilterFieldValue>;

/**
 * One node of a location tree. Pages pass the full tree (property → unit →
 * floor → block → zone) and FilterBar derives cascading options for free.
 * Only `value`/`label` are required; children arrays are optional per level.
 */
export interface LocationNode {
  value: string;
  label: string;
  level: LocationLevel;
  children?: LocationNode[];
}

/** A removable active-filter chip surfaced in the bar. */
export interface ActiveChip {
  /** Field key this chip belongs to. */
  fieldKey: string;
  /** Display text, e.g. "Property: Maple Court". */
  label: string;
  /**
   * For multiselect, the specific option value this chip removes. Undefined
   * means “clear the whole field”.
   */
  optionValue?: string;
}
