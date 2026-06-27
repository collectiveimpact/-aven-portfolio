import "server-only";
import { YARDI_MCP_URL, YARDI_MCP_TOKEN, hasYardiMcp } from "@/lib/env";

// Yardi Virtuoso Connectors — MCP client.
//
// This is the NEWER Yardi surface (distinct from the SOAP/ItfXxx adapter in
// ./api.ts). Per the Fuse5/TechTAP spec, Yardi Virtuoso exposes 5 MCP tools over
// an HTTP MCP endpoint:
//
//   T1 rfm_connectai_create_work_order            — open a work order
//   T2 rfm_connectai_search_work_orders           — search (≤5000), filterable
//   T3 rfm_workorder_mark_work_order_as_complete  — close a work order
//   T4 vn_mcpframework_get_autocomplete           — resolve names → ids
//   T5 vn_mcpframework_list_autocomplete_types    — list resolvable entity types
//
// It activates only when YARDI_MCP_URL + YARDI_MCP_TOKEN are set. Without them every
// function returns a clear, DETERMINISTIC stub ({mode:"stub"}) so the AI agents and
// the staff work-order flow keep working in demo. This mirrors the credential-gated,
// typed-result, graceful-stub style of ./api.ts and ../wallboard/api.ts.
//
// Transport: a single JSON-RPC `tools/call` POST per the MCP spec. The exact request
// shape (tool names + arguments) follows the connector contract above; validate
// against your tenant's MCP manifest on first connect — argument keys can vary by
// connector version, so the parsers below are defensive about field names.

const TOOL = {
  createWorkOrder: "rfm_connectai_create_work_order",
  searchWorkOrders: "rfm_connectai_search_work_orders",
  markComplete: "rfm_workorder_mark_work_order_as_complete",
  getAutocomplete: "vn_mcpframework_get_autocomplete",
  listAutocompleteTypes: "vn_mcpframework_list_autocomplete_types",
} as const;

// --- typed result envelope ---------------------------------------------------
export type YardiMcpMode = "live" | "stub";
export interface YardiMcpResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
  mode: YardiMcpMode;
}

// --- domain types ------------------------------------------------------------
export type WorkOrderPriority = "low" | "medium" | "high" | "urgent";

export interface CreateWorkOrderInput {
  property: string;            // property name or Yardi property code
  unit?: string;               // unit name/code (optional for common-area WOs)
  category: string;            // maintenance category (e.g. "Plumbing")
  description: string;         // the issue
  priority?: WorkOrderPriority;
}
export interface YardiWorkOrder {
  id: string;
  property?: string;
  unit?: string;
  category?: string;
  description?: string;
  priority?: string;
  status?: string;             // open / in progress / complete (Yardi's own vocab)
  dueDate?: string;            // ISO-ish; from due_dates
  createdDate?: string;
}
export interface SearchWorkOrdersFilters {
  property?: string;
  unit?: string;
  status?: string;             // e.g. "open", "overdue"
  /** Due-date window. Either bound is optional. ISO date strings (YYYY-MM-DD). */
  dueDates?: { from?: string; to?: string };
  /** Convenience flag: only work orders whose due date is in the past. */
  overdue?: boolean;
  limit?: number;              // connector caps at 5000
}
export type AutocompleteType =
  | "property" | "unit" | "tenant" | "vendor" | "employee" | (string & {});
export interface AutocompleteMatch { id: string; label: string; type: AutocompleteType }

// --- transport ---------------------------------------------------------------
// One MCP tools/call round-trip. Returns the parsed `result` payload or an error.
async function callTool(tool: string, args: Record<string, unknown>): Promise<{ ok: boolean; result?: unknown; error?: string }> {
  try {
    const res = await fetch(YARDI_MCP_URL.replace(/\/$/, ""), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${YARDI_MCP_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: tool, arguments: args },
      }),
      signal: AbortSignal.timeout(20000),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `Yardi MCP ${res.status}: ${text.slice(0, 200)}` };
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { return { ok: false, error: "Yardi MCP returned non-JSON." }; }
    const obj = json as { error?: { message?: string }; result?: unknown } | null;
    if (obj?.error) return { ok: false, error: obj.error.message ?? "Yardi MCP error." };
    return { ok: true, result: unwrapMcpResult(obj?.result) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Yardi MCP request failed." };
  }
}

// MCP tool results arrive as { content: [{ type:"text", text:"<json>" }], ... } or
// as a structured object. Normalize both into a plain JS value.
function unwrapMcpResult(result: unknown): unknown {
  if (result && typeof result === "object" && "content" in result) {
    const content = (result as { content?: Array<{ type?: string; text?: string }> }).content ?? [];
    const textBlock = content.find((c) => c?.type === "text" && typeof c.text === "string");
    if (textBlock?.text) {
      try { return JSON.parse(textBlock.text); } catch { return textBlock.text; }
    }
  }
  return result;
}

const asArray = (v: unknown): Record<string, unknown>[] => {
  if (Array.isArray(v)) return v as Record<string, unknown>[];
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["work_orders", "workOrders", "items", "records", "results", "data"]) {
      if (Array.isArray(o[k])) return o[k] as Record<string, unknown>[];
    }
  }
  return [];
};
const pick = (o: Record<string, unknown>, ...keys: string[]): string | undefined => {
  for (const k of keys) { const val = o[k]; if (val != null && val !== "") return String(val); }
  return undefined;
};

function toWorkOrder(o: Record<string, unknown>): YardiWorkOrder {
  return {
    id: pick(o, "id", "work_order_id", "workOrderId", "wo_id", "number") ?? "",
    property: pick(o, "property", "property_name", "propertyName", "property_code"),
    unit: pick(o, "unit", "unit_name", "unitName", "unit_code"),
    category: pick(o, "category", "problem_category", "category_name"),
    description: pick(o, "description", "problem_description", "notes"),
    priority: pick(o, "priority"),
    status: pick(o, "status", "current_status", "wo_status"),
    dueDate: pick(o, "due_date", "dueDate", "scheduled_date", "promise_date"),
    createdDate: pick(o, "created_date", "createdDate", "create_date", "open_date"),
  };
}

// --- T1 · create work order --------------------------------------------------
export async function createWorkOrder(input: CreateWorkOrderInput): Promise<YardiMcpResult<YardiWorkOrder>> {
  if (!hasYardiMcp) {
    const id = stubWoId(input.property, input.unit, input.description);
    return {
      ok: true,
      mode: "stub",
      data: {
        id,
        property: input.property,
        unit: input.unit,
        category: input.category,
        description: input.description,
        priority: input.priority ?? "medium",
        status: "open",
        createdDate: new Date().toISOString().slice(0, 10),
      },
    };
  }
  const r = await callTool(TOOL.createWorkOrder, {
    property: input.property,
    unit: input.unit ?? "",
    category: input.category,
    description: input.description,
    priority: input.priority ?? "medium",
  });
  if (!r.ok) return { ok: false, mode: "live", error: r.error };
  // Result may be the WO object directly, or { work_order: {...} } / { id: "..." }.
  const raw = r.result && typeof r.result === "object"
    ? ((r.result as Record<string, unknown>).work_order as Record<string, unknown> | undefined)
      ?? (r.result as Record<string, unknown>)
    : {};
  const wo = toWorkOrder(raw ?? {});
  if (!wo.id) return { ok: false, mode: "live", error: "Yardi MCP created the work order but returned no id." };
  return { ok: true, mode: "live", data: { ...wo, property: wo.property ?? input.property, unit: wo.unit ?? input.unit, category: wo.category ?? input.category, description: wo.description ?? input.description } };
}

// --- T2 · search work orders -------------------------------------------------
export async function searchWorkOrders(filters: SearchWorkOrdersFilters = {}): Promise<YardiMcpResult<YardiWorkOrder[]>> {
  if (!hasYardiMcp) {
    return { ok: true, mode: "stub", data: stubWorkOrders(filters) };
  }
  const args: Record<string, unknown> = { limit: Math.min(filters.limit ?? 200, 5000) };
  if (filters.property) args.property = filters.property;
  if (filters.unit) args.unit = filters.unit;
  if (filters.status) args.status = filters.status;
  if (filters.overdue) { args.overdue = true; args.due_dates = { to: today() }; }
  if (filters.dueDates) args.due_dates = { from: filters.dueDates.from, to: filters.dueDates.to };
  const r = await callTool(TOOL.searchWorkOrders, args);
  if (!r.ok) return { ok: false, mode: "live", error: r.error };
  return { ok: true, mode: "live", data: asArray(r.result).map(toWorkOrder).filter((w) => w.id) };
}

// --- T3 · mark complete ------------------------------------------------------
export async function markWorkOrderComplete(id: string): Promise<YardiMcpResult<{ id: string; status: string }>> {
  if (!id?.trim()) return { ok: false, mode: hasYardiMcp ? "live" : "stub", error: "A work-order id is required." };
  if (!hasYardiMcp) return { ok: true, mode: "stub", data: { id, status: "complete" } };
  const r = await callTool(TOOL.markComplete, { work_order_id: id, id });
  if (!r.ok) return { ok: false, mode: "live", error: r.error };
  return { ok: true, mode: "live", data: { id, status: "complete" } };
}

// --- T4 · autocomplete (resolve names) ---------------------------------------
export async function getAutocomplete(type: AutocompleteType, query: string): Promise<YardiMcpResult<AutocompleteMatch[]>> {
  const q = query?.trim() ?? "";
  if (!hasYardiMcp) {
    // Stub: echo the query back as a single, deterministic match so name→id
    // resolution still "succeeds" in demo (id is the query itself).
    if (!q) return { ok: true, mode: "stub", data: [] };
    return { ok: true, mode: "stub", data: [{ id: q, label: q, type }] };
  }
  const r = await callTool(TOOL.getAutocomplete, { type, query: q, term: q });
  if (!r.ok) return { ok: false, mode: "live", error: r.error };
  const matches = asArray(r.result).map((o) => ({
    id: pick(o, "id", "value", "code", "key") ?? "",
    label: pick(o, "label", "name", "text", "display") ?? q,
    type,
  })).filter((m) => m.id || m.label);
  return { ok: true, mode: "live", data: matches };
}

// --- T5 · list autocomplete types --------------------------------------------
export async function listAutocompleteTypes(): Promise<YardiMcpResult<string[]>> {
  if (!hasYardiMcp) {
    return { ok: true, mode: "stub", data: ["property", "unit", "tenant", "vendor", "employee"] };
  }
  const r = await callTool(TOOL.listAutocompleteTypes, {});
  if (!r.ok) return { ok: false, mode: "live", error: r.error };
  const result = r.result;
  const types = Array.isArray(result)
    ? result.map((t) => (typeof t === "string" ? t : pick(t as Record<string, unknown>, "type", "name", "id") ?? "")).filter(Boolean)
    : asArray(result).map((o) => pick(o, "type", "name", "id") ?? "").filter(Boolean);
  return { ok: true, mode: "live", data: types.length ? types : ["property", "unit", "tenant", "vendor", "employee"] };
}

// --- deterministic stubs -----------------------------------------------------
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days: number) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

// Stable, human-readable stub WO id derived from the inputs (so the same request
// yields the same id within a session and reads like a real Yardi WO number).
function stubWoId(property?: string, unit?: string, description?: string): string {
  const seed = `${property ?? ""}|${unit ?? ""}|${description ?? ""}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `WO-${(h % 900000 + 100000)}`;
}

// A small, deterministic set of demo work orders that honors the common filters so
// the Compliance Guardian / queues show realistic data without a live connector.
function stubWorkOrders(filters: SearchWorkOrdersFilters): YardiWorkOrder[] {
  const base: YardiWorkOrder[] = [
    { id: "WO-100231", property: "Maple Court", unit: "204", category: "Plumbing", description: "Kitchen sink leak", priority: "high", status: "open", dueDate: addDays(-6), createdDate: addDays(-12) },
    { id: "WO-100244", property: "Maple Court", unit: "112", category: "Heating", description: "Radiator not heating", priority: "urgent", status: "open", dueDate: addDays(-2), createdDate: addDays(-5) },
    { id: "WO-100258", property: "Riverside Apartments", unit: "1A", category: "Electrical", description: "Hallway light out", priority: "medium", status: "in progress", dueDate: addDays(3), createdDate: addDays(-3) },
    { id: "WO-100262", property: "Riverside Apartments", unit: "3C", category: "General", description: "Door lock sticking", priority: "low", status: "open", dueDate: addDays(9), createdDate: addDays(-1) },
    { id: "WO-100270", property: "Cedar House", unit: "Common", category: "Fire Safety", description: "Annual extinguisher check", priority: "high", status: "open", dueDate: addDays(-1), createdDate: addDays(-20) },
  ];
  let rows = base;
  if (filters.property) rows = rows.filter((r) => r.property?.toLowerCase().includes(filters.property!.toLowerCase()));
  if (filters.unit) rows = rows.filter((r) => r.unit?.toLowerCase() === filters.unit!.toLowerCase());
  if (filters.status) rows = rows.filter((r) => r.status?.toLowerCase().includes(filters.status!.toLowerCase()));
  if (filters.overdue) rows = rows.filter((r) => (r.dueDate ?? "") < today());
  if (filters.dueDates?.from) rows = rows.filter((r) => (r.dueDate ?? "") >= filters.dueDates!.from!);
  if (filters.dueDates?.to) rows = rows.filter((r) => (r.dueDate ?? "") <= filters.dueDates!.to!);
  return filters.limit ? rows.slice(0, filters.limit) : rows;
}
