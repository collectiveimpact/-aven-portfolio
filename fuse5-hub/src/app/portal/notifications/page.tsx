import { requireResident } from "@/lib/portal/guard";
import { hasPushSubscription } from "@/lib/portal/data";
import { getVapidPublicKey, isPushConfigured } from "@/lib/portal/push";
import { EnableNotifications } from "./enable-notifications";

export default async function PortalNotificationsPage() {
  const { session } = await requireResident();
  const [already, vapidPublicKey] = await Promise.all([
    hasPushSubscription(session),
    Promise.resolve(getVapidPublicKey()),
  ]);
  const configured = isPushConfigured();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <h1 className="f5-portal-h1">Notifications</h1>
        <p className="f5-portal-sub">Get a push alert on this device for building updates and replies to your requests.</p>
      </div>

      <EnableNotifications
        alreadySubscribed={already}
        vapidPublicKey={vapidPublicKey}
        pushConfigured={configured}
      />

      <section className="f5-card" style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, color: "var(--f5-text)", marginBottom: 6 }}>How this works</div>
        <ul style={{ margin: 0, paddingLeft: 18, color: "var(--f5-text-muted)", fontSize: 13.5, lineHeight: 1.6 }}>
          <li>Notifications are tied to this browser/device — enable on each one you use.</li>
          <li>You can turn them off any time in your browser&apos;s site settings.</li>
          <li>We only send updates relevant to your home and your maintenance requests.</li>
        </ul>
      </section>
    </div>
  );
}
