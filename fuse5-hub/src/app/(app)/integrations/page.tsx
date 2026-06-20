import { getIntegrations } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canAdmin } from "@/lib/rbac";
import { IntegrationsList } from "./integrations-list";

// Integrations — connect/disconnect/configure the systems Fuse5 Hub talks to.
export default async function IntegrationsPage() {
  const [integrations, me] = await Promise.all([getIntegrations(), getCurrentUser()]);
  const canEdit = me?.role ? canAdmin(me.role) : false;

  return (
    <main className="f5-content">
      <div className="f5-page-title">Integrations</div>
      <div className="f5-page-sub">Connect Fuse5 Hub to the systems you already run.</div>
      <IntegrationsList integrations={integrations} canEdit={canEdit} />
    </main>
  );
}
