import {
  getMembers, getAuditLog, getSubscription,
  getPlatformStats, getPlatformProviders, getPlatformUsers, getPlayerFleet, getTenantPortalConfig,
} from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canAdmin, isGlobal } from "@/lib/rbac";
import { DEMO_IMPERSONATE } from "@/lib/platform";
import { AdminConsole } from "./admin-console";

// Admin console — async server component. Account panels (members/billing/audit)
// read live; the Fuse5 platform panels (super-admin only) read cross-org or fall
// back to the v8.1 demo set.
export default async function AdminPage() {
  const me = await getCurrentUser();
  const isSuper = me?.role ? isGlobal(me.role) : false;
  const canManage = me?.role ? canAdmin(me.role) : false;

  const [members, audit, sub, stats, providers, users, fleet, portal] = await Promise.all([
    getMembers(), getAuditLog(), getSubscription(),
    getPlatformStats(), getPlatformProviders(), getPlatformUsers(), getPlayerFleet(), getTenantPortalConfig(),
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
      />
    </main>
  );
}
