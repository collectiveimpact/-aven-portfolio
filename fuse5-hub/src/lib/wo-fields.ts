// Per-client work-order / notice field configuration.
// A registry of canonical fields. SYSTEM fields are the *minimum mandatory* set:
// always shown, always required, cannot be disabled. Every other field is
// configurable per client (org): Required / Optional / Hidden.

export type WoFieldType = "text" | "textarea" | "date" | "select";

export interface WoFieldDef {
  key: string;
  label: string;
  type: WoFieldType;
  group: "core" | "notice";
  system?: boolean;   // minimum mandatory — locked on + required
  aiInput?: boolean;  // feeds the AI draft generation
  placeholder?: string;
}

// Canonical field set. Order = display order.
export const WO_FIELD_REGISTRY: WoFieldDef[] = [
  { key: "title", label: "Title", type: "text", group: "core", system: true, placeholder: "e.g. Water shutoff — Danforth" },
  { key: "property", label: "Property", type: "select", group: "core", system: true },
  { key: "category", label: "Category", type: "select", group: "core" },
  { key: "operationTitle", label: "Operation Title", type: "text", group: "notice", system: true, aiInput: true, placeholder: "Scheduled water shutoff" },
  { key: "dateText", label: "Date / Time", type: "text", group: "notice", aiInput: true, placeholder: "Tue Jun 10, 9am–12pm" },
  { key: "affected", label: "Floors / Units Affected", type: "text", group: "notice", aiInput: true, placeholder: "Floors 1–5, Building A" },
  { key: "cta", label: "Call to Action", type: "textarea", group: "notice", aiInput: true, placeholder: "Store water in advance; avoid taps during this window." },
  { key: "contactInfo", label: "Contact Info", type: "text", group: "notice", aiInput: true, placeholder: "Property Office · 416-555-0100" },
  { key: "imageCategory", label: "Image / Incident", type: "select", group: "notice" },
];

// Configurable fields that DEFAULT to required (clients can relax to optional).
export const DEFAULT_REQUIRED = new Set<string>(["dateText", "affected"]);

export interface ResolvedField extends WoFieldDef {
  enabled: boolean;
  required: boolean;
}

export interface FieldOverride { enabled?: boolean; required?: boolean }

/** Merge the registry with per-client overrides into the resolved field set. */
export function resolveFields(overrides: Record<string, FieldOverride>): ResolvedField[] {
  return WO_FIELD_REGISTRY.map((f) => {
    if (f.system) return { ...f, enabled: true, required: true };
    const o = overrides[f.key] ?? {};
    return {
      ...f,
      enabled: o.enabled ?? true,
      required: o.required ?? DEFAULT_REQUIRED.has(f.key),
    };
  });
}

export const isSystemField = (key: string) => !!WO_FIELD_REGISTRY.find((f) => f.key === key)?.system;
