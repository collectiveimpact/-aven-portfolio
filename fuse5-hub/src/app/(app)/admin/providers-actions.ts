"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canAdmin } from "@/lib/rbac";

export type AdminResult = { ok: boolean; error?: string; persisted?: boolean };

// Generic platform-operator audit writer. The platform panels (providers, roles,
// players, compliance) hold demo / cross-org state. We record the operator's
// intent to audit_log when a backend + admin session exist, and degrade to a
// client-only optimistic update otherwise. `persisted` tells the caller which
// happened.
//
// As of 0020 the provider/compliance actions ALSO upsert a durable row in the
// matching table (see supabase/migrations/0020_admin_persistence.sql) right after
// the audit write. The durable write is best-effort: when there is no backend or
// no admin session we behave exactly as before (audit-only / optimistic), so the
// UI is never affected.
//
// Super-admin gate: only an Org Admin (which a Fuse5 super-admin is, in their own
// org row) may write platform audit entries. This mirrors the actions.ts pattern.
export async function recordPlatformAction(action: string, detail: string): Promise<AdminResult> {
  const a = action.trim();
  if (!a) return { ok: false, error: "Missing action." };

  const supabase = await createClient();
  if (!supabase) return { ok: true, persisted: false }; // no backend — optimistic only
  const me = await getCurrentUser();
  if (!me?.orgId) return { ok: true, persisted: false };
  if (!me.role || !canAdmin(me.role)) return { ok: false, error: "Only an Admin can perform platform actions." };

  const { error } = await supabase.from("audit_log").insert({
    org_id: me.orgId,
    actor_id: me.id,
    action: a,
    detail: detail.slice(0, 500),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, persisted: true };
}

// Shared admin-context resolver. Returns the supabase client + actor when a
// backend AND an admin session exist, else null so callers degrade to
// audit/optimistic-only without throwing. Mirrors the guards in workflow-actions.
async function adminCtx() {
  const supabase = await createClient();
  if (!supabase) return null;
  const me = await getCurrentUser();
  if (!me?.orgId) return null;
  if (!me.role || !canAdmin(me.role)) return null;
  return { supabase, me, orgId: me.orgId, actorId: me.id };
}

// Best-effort audit insert. Never throws; failure is swallowed so the durable
// write (or the optimistic UI) still proceeds.
async function auditOnly(action: string, detail: string): Promise<void> {
  try {
    const ctx = await adminCtx();
    if (!ctx) return;
    await ctx.supabase.from("audit_log").insert({
      org_id: ctx.orgId,
      actor_id: ctx.actorId,
      action,
      detail: detail.slice(0, 500),
    });
  } catch { /* trace is best-effort */ }
}

/* ---------------- Providers ---------------- */

// Create a provider: audit + upsert the durable providers row (keyed by org+key).
export async function createProvider(input: {
  key: string;
  name: string;
  tier?: string;
  yardiSync?: boolean;
  complianceTarget?: number;
  complianceFramework?: string;
  color?: string;
}): Promise<AdminResult> {
  const key = input.key.trim();
  const name = input.name.trim();
  if (!key) return { ok: false, error: "Provider needs a key." };
  if (!name) return { ok: false, error: "Provider needs a name." };
  try {
    await auditOnly("Provider Created", `"${name}" (${key})${input.tier ? ` · ${input.tier}` : ""}`);
    const ctx = await adminCtx();
    if (!ctx) return { ok: true, persisted: false };
    const { error } = await ctx.supabase.from("providers").upsert(
      {
        org_id: ctx.orgId,
        key,
        name,
        tier: input.tier ?? null,
        yardi_sync: input.yardiSync ?? false,
        compliance_target: input.complianceTarget ?? 0,
        compliance_framework: input.complianceFramework ?? null,
        active: true,
        color: input.color ?? null,
      },
      { onConflict: "org_id,key" },
    );
    if (error) return { ok: true, persisted: false };
    return { ok: true, persisted: true };
  } catch {
    return { ok: true, persisted: false };
  }
}

// Update mutable provider fields (name/tier/yardi/active/color). Upsert by org+key.
export async function updateProvider(input: {
  key: string;
  name?: string;
  tier?: string;
  yardiSync?: boolean;
  active?: boolean;
  color?: string;
}): Promise<AdminResult> {
  const key = input.key.trim();
  if (!key) return { ok: false, error: "Missing provider key." };
  try {
    await auditOnly("Provider Updated", `${key}${input.name ? ` → "${input.name}"` : ""}`);
    const ctx = await adminCtx();
    if (!ctx) return { ok: true, persisted: false };
    const patch: Record<string, unknown> = { org_id: ctx.orgId, key };
    if (input.name !== undefined) patch.name = input.name.trim();
    if (input.tier !== undefined) patch.tier = input.tier;
    if (input.yardiSync !== undefined) patch.yardi_sync = input.yardiSync;
    if (input.active !== undefined) patch.active = input.active;
    if (input.color !== undefined) patch.color = input.color;
    // upsert requires the not-null `name`; when not provided we update in place.
    const { error } =
      input.name !== undefined
        ? await ctx.supabase.from("providers").upsert(patch, { onConflict: "org_id,key" })
        : await ctx.supabase.from("providers").update(patch).eq("org_id", ctx.orgId).eq("key", key);
    if (error) return { ok: true, persisted: false };
    return { ok: true, persisted: true };
  } catch {
    return { ok: true, persisted: false };
  }
}

// Update a provider's compliance target + framework.
export async function updateProviderCompliance(input: {
  key: string;
  complianceTarget: number;
  complianceFramework?: string;
}): Promise<AdminResult> {
  const key = input.key.trim();
  if (!key) return { ok: false, error: "Missing provider key." };
  try {
    await auditOnly(
      "Provider Compliance Updated",
      `${key} → target ${input.complianceTarget}%${input.complianceFramework ? ` · ${input.complianceFramework}` : ""}`,
    );
    const ctx = await adminCtx();
    if (!ctx) return { ok: true, persisted: false };
    const { error } = await ctx.supabase
      .from("providers")
      .update({
        compliance_target: input.complianceTarget,
        compliance_framework: input.complianceFramework ?? null,
      })
      .eq("org_id", ctx.orgId)
      .eq("key", key);
    if (error) return { ok: true, persisted: false };
    return { ok: true, persisted: true };
  } catch {
    return { ok: true, persisted: false };
  }
}
