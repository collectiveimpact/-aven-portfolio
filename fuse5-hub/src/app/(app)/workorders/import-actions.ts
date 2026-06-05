"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canAdmin } from "@/lib/rbac";
import { FileSource } from "@/lib/yardi/source";
import type { TargetEntity } from "@/lib/yardi/tables";

const ENTITY_TABLE: Record<TargetEntity, string> = {
  property: "properties",
  resident: "residents",
  work_order: "work_orders",
};

export interface ImportPreview {
  ok: boolean;
  error?: string;
  tableKey?: string;
  tableLabel?: string;
  entity?: TargetEntity;
  total: number;
  willInsert: number;
  willUpdate: number;
  invalid: number;
  unmatchedProperties: number;
  warnings: string[];
  rowErrors: { rowNum: number; problems: string[] }[];
  sample: Record<string, unknown>[];
}

const EMPTY: ImportPreview = {
  ok: false, total: 0, willInsert: 0, willUpdate: 0, invalid: 0, unmatchedProperties: 0,
  warnings: [], rowErrors: [], sample: [],
};

async function readFile(form: FormData): Promise<{ filename: string; buf: Buffer } | null> {
  const f = form.get("file");
  if (!(f instanceof File) || f.size === 0) return null;
  return { filename: f.name, buf: Buffer.from(await f.arrayBuffer()) };
}

// property external_id (Yardi code) OR name → property uuid
function buildPropMap(props: { id: string; name: string; external_id: string | null }[]) {
  const byCode = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const p of props) {
    if (p.external_id) byCode.set(p.external_id.toLowerCase(), p.id);
    byName.set(p.name.trim().toLowerCase(), p.id);
  }
  return (code: string) => byCode.get(code.toLowerCase()) ?? byName.get(code.trim().toLowerCase()) ?? null;
}

export async function previewImport(form: FormData): Promise<ImportPreview> {
  const file = await readFile(form);
  if (!file) return { ...EMPTY, error: "No file uploaded." };
  const tableKey = (form.get("tableKey") as string) || undefined;

  const norm = await new FileSource().fetch({ filename: file.filename, data: file.buf, tableKey });
  if (!norm.ok || !norm.entity) return { ...EMPTY, error: norm.error ?? "Could not read file." };

  const supabase = await createClient();
  const me = supabase ? await getCurrentUser() : null;

  let willUpdate = 0;
  let unmatched = 0;
  if (supabase && me?.orgId) {
    const ids = norm.records.map((r) => r.externalId).filter(Boolean);
    if (ids.length) {
      const { data: existing } = await supabase
        .from(ENTITY_TABLE[norm.entity]).select("external_id").eq("org_id", me.orgId).in("external_id", ids);
      const have = new Set((existing ?? []).map((r) => r.external_id));
      willUpdate = norm.records.filter((r) => have.has(r.externalId)).length;
    }
    if (norm.entity !== "property") {
      const { data: props } = await supabase.from("properties").select("id,name,external_id").eq("org_id", me.orgId);
      const resolve = buildPropMap(props ?? []);
      unmatched = norm.records.filter((r) => r.propertyCode && !resolve(r.propertyCode)).length;
    }
  }

  return {
    ok: true,
    tableKey: norm.tableKey, tableLabel: norm.tableLabel, entity: norm.entity,
    total: norm.records.length + norm.rowErrors.length,
    willInsert: norm.records.length - willUpdate,
    willUpdate,
    invalid: norm.rowErrors.length,
    unmatchedProperties: unmatched,
    warnings: norm.warnings,
    rowErrors: norm.rowErrors.slice(0, 12),
    sample: norm.records.slice(0, 5).map((r) => ({
      external_id: r.externalId, ...r.fields, ...(r.propertyCode ? { property: r.propertyCode } : {}),
    })),
  };
}

export interface ImportResult {
  ok: boolean;
  error?: string;
  inserted?: number;
  updated?: number;
  invalid?: number;
  entity?: TargetEntity;
}

export async function commitImport(form: FormData): Promise<ImportResult> {
  const supabase = await createClient();
  if (!supabase) return { ok: false, error: "No backend." };
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: false, error: "No organization." };
  if (!me.role || !canAdmin(me.role)) return { ok: false, error: "Only an Org Admin can import data." };

  const file = await readFile(form);
  if (!file) return { ok: false, error: "No file uploaded." };
  const tableKey = (form.get("tableKey") as string) || undefined;

  const norm = await new FileSource().fetch({ filename: file.filename, data: file.buf, tableKey });
  if (!norm.ok || !norm.entity) return { ok: false, error: norm.error ?? "Could not read file." };
  if (!norm.records.length) return { ok: false, error: "No valid rows to import." };

  const table = ENTITY_TABLE[norm.entity];

  // property linking for residents / work orders
  let resolveProp: ((code: string) => string | null) | null = null;
  if (norm.entity !== "property") {
    const { data: props } = await supabase.from("properties").select("id,name,external_id").eq("org_id", me.orgId);
    resolveProp = buildPropMap(props ?? []);
  }

  // count existing for insert/update reporting
  const ids = norm.records.map((r) => r.externalId);
  const { data: existing } = await supabase.from(table).select("external_id").eq("org_id", me.orgId).in("external_id", ids);
  const have = new Set((existing ?? []).map((r) => r.external_id));
  const updated = norm.records.filter((r) => have.has(r.externalId)).length;
  const inserted = norm.records.length - updated;

  // build upsert rows
  const rows = norm.records.map((r) => {
    const row: Record<string, unknown> = { org_id: me.orgId, external_id: r.externalId, ...r.fields };
    if (norm.entity === "property" && (row.units === null || row.units === undefined)) row.units = 0;
    if (resolveProp && r.propertyCode) {
      const pid = resolveProp(r.propertyCode);
      if (pid) row.property_id = pid;
    }
    return row;
  });

  // upsert in batches on (org_id, external_id)
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const { error } = await supabase.from(table).upsert(rows.slice(i, i + BATCH), { onConflict: "org_id,external_id" });
    if (error) return { ok: false, error: `Row ${i + 1}+: ${error.message}` };
  }

  await supabase.from("audit_log").insert({
    org_id: me.orgId, actor_id: me.id, action: "Yardi Import",
    detail: `${norm.tableLabel}: ${inserted} added, ${updated} updated${norm.rowErrors.length ? `, ${norm.rowErrors.length} skipped` : ""} (from ${file.filename})`,
  });

  return { ok: true, inserted, updated, invalid: norm.rowErrors.length, entity: norm.entity };
}
