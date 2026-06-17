import { getChannelsConfig } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { ChannelsGrid } from "./channels-grid";

export default async function ChannelsPage() {
  const [channels, me] = await Promise.all([getChannelsConfig(), getCurrentUser()]);
  const canEdit = me?.role ? canPublish(me.role) : false;

  return (
    <main className="f5-content">
      <div className="f5-page-title">Channels</div>
      <div className="f5-page-sub">Delivery channel configuration and health.</div>
      <ChannelsGrid channels={channels} canEdit={canEdit} />
    </main>
  );
}
