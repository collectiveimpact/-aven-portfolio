import {
  getMembers, getAuditLog, getSubscription,
  getPlatformStats, getPlatformProviders, getPlatformUsers, getPlayerFleet, getTenantPortalConfig,
  getOrgModuleConfig,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canAdmin, canOnboardUsers, isGlobal } from "@/lib/rbac";
import { DEMO_IMPERSONATE } from "@/lib/platform";
import { createClient } from "@/lib/supabase/server";
import {
  getProviders, getRoleTemplates, getApprovalWorkflows, getApprovalQueue,
  getIntegrationConfigs, getPermissionGrants,
} from "@/lib/admin-store";
import { AdminConsole } from "./admin-console";
import type { DepartmentRow } from "./actions";

// Departments + per-member department assignment (migration 0019). Fetched here
// rather than in queries.ts (which we don't own); RLS scopes everything to the org.
async function getDepartmentData(): Promise<{
  departments: DepartmentRow[];
  memberDepartments: Record<string, string | null>;
  memberCounts: Record<string, number>;
}> {
  const s = await createClient();
  if (!s) return { departments: [], memberDepartments: {}, memberCounts: {} };
  try {
    const [{ data: depts }, { data: members }] = await Promise.all([
      s.from("departments").select("id,key,label").order("label"),
      s.from("org_members").select("id,department_id"),
    ]);
    const departments = (depts ?? []).map((d) => ({ id: d.id, key: d.key, label: d.label }));
    const memberDepartments: Record<string, string | null> = {};
    const memberCounts: Record<string, number> = {};
    for (const m of members ?? []) {
      memberDepartments[m.id] = m.department_id ?? null;
      if (m.department_id) memberCounts[m.department_id] = (memberCounts[m.department_id] ?? 0) + 1;
    }
    return { departments, memberDepartments, memberCounts };
  } catch {
    return { departments: [], memberDepartments: {}, memberCounts: {} };
  }
}

// Admin console — async server component. Account panels (members/billing/audit)
// read live; the Fuse5 platform panels (super-admin only) read cross-org or fall
// back to the v8.1 demo set.
export default async function AdminPage() {
  const me = await getCurrentUser();
  const isSuper = me?.role ? isGlobal(me.role) : false;
  const canManage = me?.role ? canAdmin(me.role) : false;
  const canOnboard = me?.role ? canOnboardUsers(me.role) : false;

  const [
    members, audit, sub, stats, providers, users, fleet, portal, moduleConfig, deptData,
    providerRows, roleTemplateRows, approvalWorkflowRows, approvalQueueRows, integrationConfigRows, permissionGrantRows,
  ] = await Promise.all([
    getMembers(), getAuditLog(), getSubscription(),
    getPlatformStats(), getPlatformProviders(), getPlatformUsers(), getPlayerFleet(), getTenantPortalConfig(),
    getOrgModuleConfig(), getDepartmentData(),
    getProviders(), getRoleTemplates(), getApprovalWorkflows(), getApprovalQueue(), getIntegrationConfigs(), getPermissionGrants(),
  ]);

  return (
    <main className="f5-content">
      <div className="f5-page-title">Admin</div>
      <div className="f5-page-sub">{me?.orgName ?? "Your Organization"} — members, billing, audit{isSuper ? ", and the Fuse5 platform console" : ""}.</div>

      <AdminConsole
        isSuper={isSuper}
        canManage={canManage}
        canImpersonate={isSuper}
        currentUserId={me?.id ?? ""}
        orgName={me?.orgName ?? "Your Organization"}
        members={members}
        audit={audit}
        sub={sub}
        stats={stats}
        providers={providers}
        users={users}
        fleet={fleet}
        portal={portal}
        impTargets={DEMO_IMPERSONATE}
        moduleConfig={moduleConfig}
        canOnboard={canOnboard}
        departments={deptData.departments}
        memberDepartments={deptData.memberDepartments}
        departmentCounts={deptData.memberCounts}
        providerRows={providerRows}
        roleTemplateRows={roleTemplateRows}
        approvalWorkflowRows={approvalWorkflowRows}
        approvalQueueRows={approvalQueueRows}
        integrationConfigRows={integrationConfigRows}
        permissionGrantRows={permissionGrantRows}
      />
    </main>
  );
}
