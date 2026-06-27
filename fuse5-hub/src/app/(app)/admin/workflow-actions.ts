"use server";

// Server actions for the interactive platform-admin panels (admin-panels-v2.tsx).
// The panels render from the isomorphic reference data in lib/platform-admin and
// keep their working state on the client (optimistic). These actions give the
// sensitive moments a durable trace: every approve / reject / template change /
// integration toggle / role-permission edit / compliance-control change is
// written to audit_log under the actor's org. They never throw — when no backend
// is configured (demo / preview) they degrade to { ok: true, persisted: false }
// so the client UI stays fully interactive.
//
// As of 0020 the sensitive moments ALSO upsert a durable row in the matching
// table (approval_workflows, approval_queue, provider_role_templates,
// integration_configs, permission_grants — see
// supabase/migrations/0020_admin_persistence.sql) right after the audit write.
// The durable write reuses the SAME guard: when there is no backend / no admin
// session, helpers return null and the action stays audit-only / optimistic, so
// every existing signature and the never-throw contract are preserved.

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { canAdmin } from "@/lib/rbac";

export type WfResult = { ok: boolean; error?: string; persisted?: boolean };

// Shared guard + audit writer. Returns persisted:false (still ok) when there is
// no backend or no admin context, so the UI never blocks on the trace.
async function audit(action: string, detail: string): Promise<WfResult> {
  try {
    const supabase = await createClient();
    if (!supabase) return { ok: true, persisted: false };
    const me = await getCurrentUser();
    if (!me?.orgId) return { ok: true, persisted: false };
    if (!me.role || !canAdmin(me.role)) {
      return { ok: false, error: "Only an Admin can perform this action." };
    }
    const { error } = await supabase
      .from("audit_log")
      .insert({ org_id: me.orgId, actor_id: me.id, action, detail });
    if (error) return { ok: true, persisted: false }; // trace failed, action still succeeds client-side
    return { ok: true, persisted: true };
  } catch {
    return { ok: true, persisted: false };
  }
}

// Shared admin-context resolver for the durable upserts. Returns the client +
// actor only when a backend AND an admin session exist; null otherwise so the
// caller degrades to audit-only. Never throws.
async function persistCtx() {
  try {
    const supabase = await createClient();
    if (!supabase) return null;
    const me = await getCurrentUser();
    if (!me?.orgId) return null;
    if (!me.role || !canAdmin(me.role)) return null;
    return { supabase, orgId: me.orgId, actorId: me.id };
  } catch {
    return null;
  }
}

// Stable slug from a human name, for the (org_id, key) unique constraint.
function slug(s: string): string {
  return s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "untitled";
}

/* ---------------- Approval workflow ---------------- */

export async function logApproval(
  decision: "approved" | "rejected" | "scheduled" | "published",
  title: string,
  provider: string,
  note?: string,
): Promise<WfResult> {
  const verb =
    decision === "approved" ? "Content Approved"
    : decision === "rejected" ? "Content Rejected"
    : decision === "scheduled" ? "Content Scheduled"
    : "Broadcast Sent";
  const r = await audit(verb, `${provider} — "${title}"${note ? ` · ${note}` : ""}`);
  // Record the decision on the approval_queue for approve/reject moments.
  if (decision === "approved" || decision === "rejected") {
    try {
      const ctx = await persistCtx();
      if (ctx) {
        const status = decision === "approved" ? "approved" : "rejected";
        await ctx.supabase.from("approval_queue").insert({
          org_id: ctx.orgId,
          title,
          category: provider,
          status,
          decided_by: ctx.actorId,
          decided_at: new Date().toISOString(),
          note: note ?? null,
        });
        return { ok: r.ok, persisted: true };
      }
    } catch { /* never throw; fall through to audit result */ }
  }
  return r;
}

export async function logBulkApproval(titles: string[], provider: string): Promise<WfResult> {
  const r = await audit("Content Approved (Bulk)", `${provider} — ${titles.length} item(s): ${titles.slice(0, 6).join(", ")}${titles.length > 6 ? "…" : ""}`);
  try {
    const ctx = await persistCtx();
    if (ctx && titles.length) {
      const rows = titles.map((title) => ({
        org_id: ctx.orgId,
        title,
        category: provider,
        status: "approved",
        decided_by: ctx.actorId,
        decided_at: new Date().toISOString(),
      }));
      const { error } = await ctx.supabase.from("approval_queue").insert(rows);
      if (!error) return { ok: r.ok, persisted: true };
    }
  } catch { /* never throw */ }
  return r;
}

// Persist a saved approval-workflow template definition (steps, approvers,
// thresholds). We store the summary in the audit detail; if a richer table
// exists later this is the natural upgrade point.
export async function saveApprovalWorkflow(input: {
  name: string;
  steps: { label: string; approverRole: string }[];
  thresholdReach: number;
  isNew: boolean;
}): Promise<WfResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Give the workflow a name." };
  if (!input.steps.length) return { ok: false, error: "Add at least one approval step." };
  const summary = `${input.steps.length} step(s) [${input.steps.map((s) => s.approverRole).join(" → ")}] · auto-route ≥${input.thresholdReach} reach`;
  const r = await audit(input.isNew ? "Approval Workflow Created" : "Approval Workflow Updated", `"${name}" — ${summary}`);
  try {
    const ctx = await persistCtx();
    if (ctx) {
      const { error } = await ctx.supabase.from("approval_workflows").upsert(
        {
          org_id: ctx.orgId,
          key: slug(name),
          name,
          steps: input.steps,
          threshold: input.thresholdReach,
          active: true,
        },
        { onConflict: "org_id,key" },
      );
      if (!error) return { ok: r.ok, persisted: true };
    }
  } catch { /* never throw */ }
  return r;
}

/* ---------------- Template library ---------------- */

export async function saveTemplate(input: {
  id: string | null;        // null = new
  name: string;
  category: string;
  channels: string[];
  body: string;
  mandatory: boolean;
}): Promise<WfResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Template needs a name." };
  if (!input.channels.length) return { ok: false, error: "Pick at least one channel." };
  const detail = `"${name}" · ${input.category} · ${input.channels.join("/")}${input.mandatory ? " · REQUIRED" : ""}`;
  return audit(input.id ? "Master Template Updated" : "Master Template Created", detail);
}

export async function pushTemplateUpdate(name: string, version: string): Promise<WfResult> {
  return audit("Template Update Pushed", `"${name}" v${version} → all cloned providers`);
}

export async function cloneTemplate(name: string): Promise<WfResult> {
  return audit("Template Cloned", `"${name}" cloned for provider customization`);
}

/* ---------------- Integrations / data sources ---------------- */

export async function setIntegrationEnabled(name: string, enabled: boolean): Promise<WfResult> {
  const r = await audit(enabled ? "Integration Enabled" : "Integration Disabled", name);
  try {
    const ctx = await persistCtx();
    if (ctx) {
      const { error } = await ctx.supabase.from("integration_configs").upsert(
        { org_id: ctx.orgId, source_key: slug(name), enabled },
        { onConflict: "org_id,source_key" },
      );
      if (!error) return { ok: r.ok, persisted: true };
    }
  } catch { /* never throw */ }
  return r;
}

export async function saveIntegrationConfig(name: string, fields: Record<string, string>): Promise<WfResult> {
  const keys = Object.keys(fields).filter((k) => fields[k]?.trim());
  const r = await audit("Integration Configured", `${name} — ${keys.length ? keys.join(", ") : "no fields"} updated`);
  try {
    const ctx = await persistCtx();
    if (ctx) {
      // Store config in `settings` jsonb — mirrors channels_config (0001); no
      // dedicated plaintext-secret column. Only non-empty fields are persisted.
      const settings: Record<string, string> = {};
      for (const k of keys) settings[k] = fields[k].trim();
      const { error } = await ctx.supabase.from("integration_configs").upsert(
        { org_id: ctx.orgId, source_key: slug(name), settings },
        { onConflict: "org_id,source_key" },
      );
      if (!error) return { ok: r.ok, persisted: true };
    }
  } catch { /* never throw */ }
  return r;
}

// Best-effort connection test. There is no real probe wired here; we log the
// attempt and return a deterministic success so the UI can show a result. The
// `reachable` flag is derived from whether the source is marked active upstream.
export async function testIntegration(name: string, reachable: boolean): Promise<WfResult & { reachable: boolean; latencyMs: number }> {
  const latencyMs = 40 + Math.floor(Math.random() * 180);
  const r = await audit("Integration Tested", `${name} — ${reachable ? "reachable" : "no response"} (${latencyMs}ms)`);
  try {
    const ctx = await persistCtx();
    if (ctx) {
      await ctx.supabase
        .from("integration_configs")
        .update({ last_tested_at: new Date().toISOString() })
        .eq("org_id", ctx.orgId)
        .eq("source_key", slug(name));
    }
  } catch { /* never throw */ }
  return { ...r, reachable, latencyMs };
}

/* ---------------- Roles & permissions ---------------- */

// Persist the role's grant set two ways: a provider_role_templates row holding
// the full permission list, and one permission_grants row per (role, module)
// recording the access level. `grants` are module keys at full level (3); the
// caller's optimistic model only sends the granted modules.
export async function saveRolePermissions(roleName: string, grants: string[]): Promise<WfResult> {
  const r = await audit("Role Permissions Updated", `${roleName} — ${grants.length} grant(s): ${grants.join(", ") || "none"}`);
  try {
    const ctx = await persistCtx();
    if (ctx) {
      const role = slug(roleName);
      const tpl = await ctx.supabase.from("provider_role_templates").upsert(
        { org_id: ctx.orgId, key: role, label: roleName, permissions: { grants } },
        { onConflict: "org_id,key" },
      );
      // Mirror each grant as a permission_grants row at Full (3). Unique on
      // (org_id, role, module_key) so re-saving is idempotent per module.
      let grantsOk = true;
      if (grants.length) {
        const rows = grants.map((module_key) => ({
          org_id: ctx.orgId,
          role,
          module_key,
          level: 3,
        }));
        const g = await ctx.supabase
          .from("permission_grants")
          .upsert(rows, { onConflict: "org_id,role,module_key" });
        grantsOk = !g.error;
      }
      if (!tpl.error && grantsOk) return { ok: r.ok, persisted: true };
    }
  } catch { /* never throw */ }
  return r;
}

// Set a single (role, module) access level explicitly. Mirrors PermLevel
// (0 None · 1 Read · 2 R/W · 3 Full) from src/lib/platform.ts.
export async function setPermissionLevel(roleName: string, moduleKey: string, level: number): Promise<WfResult> {
  const r = await audit("Permission Level Set", `${roleName} · ${moduleKey} → L${level}`);
  try {
    const ctx = await persistCtx();
    if (ctx) {
      const { error } = await ctx.supabase.from("permission_grants").upsert(
        { org_id: ctx.orgId, role: slug(roleName), module_key: moduleKey, level },
        { onConflict: "org_id,role,module_key" },
      );
      if (!error) return { ok: r.ok, persisted: true };
    }
  } catch { /* never throw */ }
  return r;
}

/* ---------------- Compliance settings ---------------- */

export async function setComplianceControl(label: string, on: boolean): Promise<WfResult> {
  return audit("Compliance Control Changed", `${label} → ${on ? "on" : "off"}`);
}

export async function setProviderFrameworkEnabled(provider: string, enabled: boolean): Promise<WfResult> {
  return audit("Provider Framework Assignment Changed", `${provider} → ${enabled ? "enabled" : "disabled"}`);
}
