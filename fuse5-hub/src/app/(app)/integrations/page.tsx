import Link from "next/link";
import { hasEmail } from "@/lib/env";

// Integrations — async server component. Status reflects what is actually wired.

type IntegrationStatus = "connected" | "active" | "available" | "configured" | "disconnected";

interface Integration {
  key: string;
  name: string;
  ico: string;
  description: string;
  status: IntegrationStatus;
  href?: string;       // when set, the action button links here
  cta?: string;        // button label override
}

const badgeFor: Record<IntegrationStatus, { cls: string; label: string }> = {
  connected: { cls: "ok", label: "Connected" },
  active: { cls: "ok", label: "Import active" },
  available: { cls: "warn", label: "Available" },
  configured: { cls: "warn", label: "Set provider key" },
  disconnected: { cls: "bad", label: "Disconnected" },
};

export default async function IntegrationsPage() {
  const integrations: Integration[] = [
    {
      key: "yardi",
      name: "Yardi Voyager",
      ico: "🏢",
      description: "Import properties, units, residents, and work orders from a Yardi ETL export. Direct API sync available with a Yardi interface license.",
      status: "active",
      href: "/workorders",
      cta: "Import",
    },
    {
      key: "rentsafeto",
      name: "RentSafeTO",
      ico: "✅",
      description: "Building scores and compliance evaluations from the City of Toronto.",
      status: "available",
    },
    {
      key: "email",
      name: "Email Provider",
      ico: "✉️",
      description: "Transactional and broadcast email delivery for resident comms.",
      status: hasEmail ? "connected" : "configured",
    },
    {
      key: "twilio",
      name: "Twilio SMS / Voice",
      ico: "📱",
      description: "SMS broadcasts and automated voice calls for emergencies.",
      status: "disconnected",
    },
  ];

  return (
    <main className="f5-content">
      <div className="f5-page-title">Integrations</div>
      <div className="f5-page-sub">Connect Fuse5 Hub to the systems you already run.</div>

      <div className="f5-section-title">Connected Services</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
        {integrations.map((it) => {
          const b = badgeFor[it.status];
          return (
            <div key={it.key} className="f5-card">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 26 }}>{it.ico}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{it.name}</div>
                </div>
                <span className={`f5-badge ${b.cls}`}>{b.label}</span>
              </div>
              <div style={{ color: "var(--f5-text-secondary)", fontSize: 13, minHeight: 36 }}>{it.description}</div>
              <div style={{ marginTop: 14 }}>
                {it.href
                  ? <Link href={it.href} className="f5-btn">{it.cta ?? "Configure"}</Link>
                  : <button className="f5-btn" type="button">{it.cta ?? "Configure"}</button>}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
