import { getChannelsConfig } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canAdmin } from "@/lib/rbac";
import { ChannelsConsole } from "./channels-console";

// Channels — Delivery Configuration (IT / back-end).
// This is an admin/IT surface: it wires up the delivery providers (Resend,
// Twilio, etc.) that sit behind "tenants just get SMS + email". End users never
// see this — they never configure the plumbing. Admin-only.
export default async function ChannelsPage() {
  const [channels, me] = await Promise.all([getChannelsConfig(), getCurrentUser()]);
  const isAdmin = me?.role ? canAdmin(me.role) : false;

  return (
    <main className="f5-content">
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div className="f5-page-title" style={{ marginBottom: 0 }}>Channels — Delivery Configuration</div>
        <span className="f5-badge" style={{ borderColor: "var(--f5-border-hover)", color: "var(--f5-text-muted)" }}>IT / back-end</span>
      </div>
      <div className="f5-page-sub">
        Admin console for the delivery providers behind tenant messaging. Residents simply receive SMS and email —
        the wiring lives here. Configuration and health are kept separate.
      </div>

      {!isAdmin ? (
        <div className="f5-card" style={{ marginTop: 18, borderColor: "var(--f5-border-hover)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20 }}>🔒</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "var(--f5-text)" }}>Administrator access required</div>
              <div style={{ fontSize: 13, color: "var(--f5-text-secondary)", marginTop: 4 }}>
                Channel delivery configuration is an IT / back-end surface. Ask an administrator to review provider wiring,
                sender identities, and consent settings.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <ChannelsConsole channels={channels} />
      )}
    </main>
  );
}
