import "server-only";
import { createClient } from "@/lib/supabase/server";

// Server-only typed readers for the admin-persistence tables added in
// supabase/migrations/0020_admin_persistence.sql. Each reader is RLS-scoped to
// the signed-in user's org (member read) and follows the queries.ts fallback
// idiom: return [] when there is no backend client or the read errors, so the
// panels render cleanly in demo/preview. Rows are flat + page-ready.
//
// NOTE: the admin panels still read from the static reference data in
// src/lib/platform.ts — wiring them to these readers is a follow-up.

async function db() {
  return createClient();
}

/* ---------------- Row types ---------------- */

export interface ProviderRow {
  id: string;
  key: string;
  name: string;
  tier: string | null;
  yardiSync: boolean;
  complianceTarget: number;
  complianceFramework: string | null;
  active: boolean;
  color: string | null;
}

export interface RoleTemplateRow {
  id: string;
  key: string;
  label: string;
  permissions: Record<string, unknown>;
}

export interface ApprovalWorkflowRow {
  id: string;
  key: string;
  name: string;
  steps: { label: string; approverRole: string }[];
  threshold: number;
  active: boolean;
}

export interface ApprovalQueueRow {
  id: string;
  title: string;
  category: string | null;
  tier: number;
  status: "pending" | "approved" | "rejected";
  submittedBy: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  note: string | null;
  createdAt: string;
}

export interface IntegrationConfigRow {
  id: string;
  sourceKey: string;
  enabled: boolean;
  settings: Record<string, unknown>;
  lastTestedAt: string | null;
}

export interface PermissionGrantRow {
  id: string;
  role: string;
  moduleKey: string;
  level: number;
}

/* ---------------- Readers ---------------- */

export async function getProviders(): Promise<ProviderRow[]> {
  const s = await db();
  if (!s) return [];
  try {
    const { data } = await s
      .from("providers")
      .select("id,key,name,tier,yardi_sync,compliance_target,compliance_framework,active,color")
      .order("name");
    return (data ?? []).map((p) => ({
      id: p.id,
      key: p.key,
      name: p.name,
      tier: p.tier,
      yardiSync: p.yardi_sync,
      complianceTarget: p.compliance_target,
      complianceFramework: p.compliance_framework,
      active: p.active,
      color: p.color,
    }));
  } catch {
    return [];
  }
}

export async function getRoleTemplates(): Promise<RoleTemplateRow[]> {
  const s = await db();
  if (!s) return [];
  try {
    const { data } = await s
      .from("provider_role_templates")
      .select("id,key,label,permissions")
      .order("label");
    return (data ?? []).map((r) => ({
      id: r.id,
      key: r.key,
      label: r.label,
      permissions: (r.permissions ?? {}) as Record<string, unknown>,
    }));
  } catch {
    return [];
  }
}

export async function getApprovalWorkflows(): Promise<ApprovalWorkflowRow[]> {
  const s = await db();
  if (!s) return [];
  try {
    const { data } = await s
      .from("approval_workflows")
      .select("id,key,name,steps,threshold,active")
      .order("name");
    return (data ?? []).map((w) => ({
      id: w.id,
      key: w.key,
      name: w.name,
      steps: (w.steps ?? []) as { label: string; approverRole: string }[],
      threshold: w.threshold,
      active: w.active,
    }));
  } catch {
    return [];
  }
}

export async function getApprovalQueue(): Promise<ApprovalQueueRow[]> {
  const s = await db();
  if (!s) return [];
  try {
    const { data } = await s
      .from("approval_queue")
      .select("id,title,category,tier,status,submitted_by,decided_by,decided_at,note,created_at")
      .order("created_at", { ascending: false });
    return (data ?? []).map((q) => ({
      id: q.id,
      title: q.title,
      category: q.category,
      tier: q.tier,
      status: q.status,
      submittedBy: q.submitted_by,
      decidedBy: q.decided_by,
      decidedAt: q.decided_at,
      note: q.note,
      createdAt: q.created_at,
    }));
  } catch {
    return [];
  }
}

export async function getIntegrationConfigs(): Promise<IntegrationConfigRow[]> {
  const s = await db();
  if (!s) return [];
  try {
    const { data } = await s
      .from("integration_configs")
      .select("id,source_key,enabled,settings,last_tested_at")
      .order("source_key");
    return (data ?? []).map((i) => ({
      id: i.id,
      sourceKey: i.source_key,
      enabled: i.enabled,
      settings: (i.settings ?? {}) as Record<string, unknown>,
      lastTestedAt: i.last_tested_at,
    }));
  } catch {
    return [];
  }
}

export async function getPermissionGrants(): Promise<PermissionGrantRow[]> {
  const s = await db();
  if (!s) return [];
  try {
    const { data } = await s
      .from("permission_grants")
      .select("id,role,module_key,level")
      .order("role");
    return (data ?? []).map((g) => ({
      id: g.id,
      role: g.role,
      moduleKey: g.module_key,
      level: g.level,
    }));
  } catch {
    return [];
  }
}
