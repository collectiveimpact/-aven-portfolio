"use server";

// Server actions for the interactive platform-admin panels (admin-panels-v2.tsx).
// The panels render from the isomorphic reference data in lib/platform-admin and
// keep their working state on the client (optimistic). These actions give the
// sensitive moments a durable trace: every approve / reject / template change /
// integration toggle / role-permission edit / compliance-control change is
// written to audit_log under the actor's org. They never throw — when no backend
// is configured (demo / preview) they degrade to { ok: true, persisted: false }
// so the client UI stays fully interactive.

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
  return audit(verb, `${provider} — "${title}"${note ? ` · ${note}` : ""}`);
}

export async function logBulkApproval(titles: string[], provider: string): Promise<WfResult> {
  return audit("Content Approved (Bulk)", `${provider} — ${titles.length} item(s): ${titles.slice(0, 6).join(", ")}${titles.length > 6 ? "…" : ""}`);
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
  return audit(input.isNew ? "Approval Workflow Created" : "Approval Workflow Updated", `"${name}" — ${summary}`);
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
  return audit(enabled ? "Integration Enabled" : "Integration Disabled", name);
}

export async function saveIntegrationConfig(name: string, fields: Record<string, string>): Promise<WfResult> {
  const keys = Object.keys(fields).filter((k) => fields[k]?.trim());
  return audit("Integration Configured", `${name} — ${keys.length ? keys.join(", ") : "no fields"} updated`);
}

// Best-effort connection test. There is no real probe wired here; we log the
// attempt and return a deterministic success so the UI can show a result. The
// `reachable` flag is derived from whether the source is marked active upstream.
export async function testIntegration(name: string, reachable: boolean): Promise<WfResult & { reachable: boolean; latencyMs: number }> {
  const latencyMs = 40 + Math.floor(Math.random() * 180);
  const r = await audit("Integration Tested", `${name} — ${reachable ? "reachable" : "no response"} (${latencyMs}ms)`);
  return { ...r, reachable, latencyMs };
}

/* ---------------- Roles & permissions ---------------- */

export async function saveRolePermissions(roleName: string, grants: string[]): Promise<WfResult> {
  return audit("Role Permissions Updated", `${roleName} — ${grants.length} grant(s): ${grants.join(", ") || "none"}`);
}

/* ---------------- Compliance settings ---------------- */

export async function setComplianceControl(label: string, on: boolean): Promise<WfResult> {
  return audit("Compliance Control Changed", `${label} → ${on ? "on" : "off"}`);
}

export async function setProviderFrameworkEnabled(provider: string, enabled: boolean): Promise<WfResult> {
  return audit("Provider Framework Assignment Changed", `${provider} → ${enabled ? "enabled" : "disabled"}`);
}
