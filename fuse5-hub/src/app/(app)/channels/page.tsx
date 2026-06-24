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
      <div className="f5-page-sub">Delivery channel configuration, health, and performance.</div>

      {/* Per-channel performance (last 30 days) */}
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 18 }}>
        {[
          { l: "SMS", v: "4,231", s: "99.1% delivered" },
          { l: "Email", v: "6,482", s: "67.4% open" },
          { l: "Digital Display", v: "43", s: "players online" },
          { l: "WhatsApp", v: "2,134", s: "89.2% read" },
        ].map((c) => (
          <div key={c.l} className="f5-card"><div className="f5-kpi-label">{c.l}</div><div className="f5-kpi-value">{c.v}</div><div className="f5-kpi-sub">{c.s}</div></div>
        ))}
      </div>

      <ChannelsGrid channels={channels} canEdit={canEdit} />
    </main>
  );
}
