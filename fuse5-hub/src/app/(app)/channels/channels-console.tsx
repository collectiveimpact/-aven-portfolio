"use client";

import { useState } from "react";
import type { ChannelConfigRow } from "@/lib/queries";
import { ChannelsConfig } from "./channels-config";
import { ChannelsHealth } from "./channels-health";
import { ChannelsGoLive } from "./channels-golive";
import type { GoLiveState } from "./actions";

// Three deliberately separated surfaces. Configuration (the wiring), Go-Live
// (registration + readiness gating), and Health & Performance (monitoring) are
// distinct questions: "is it set up right", "is it cleared to send", and "is it
// delivering". Keep them apart.
const TABS = [
  { key: "config", label: "Configuration", hint: "Provider wiring, identities & consent" },
  { key: "golive", label: "Go-Live", hint: "Registration, sender verification & readiness" },
  { key: "health", label: "Health & Performance", hint: "Deliverability & uptime monitoring" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function ChannelsConsole({ channels, goLive }: { channels: ChannelConfigRow[]; goLive: GoLiveState }) {
  const [tab, setTab] = useState<TabKey>("config");

  return (
    <>
      <div className="f5-chips" style={{ marginTop: 18 }} role="tablist" aria-label="Channels sections">
        {TABS.map((t) => (
          <span
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`f5-chip${tab === t.key ? " active" : ""}`}
            style={{ padding: "8px 16px", fontWeight: tab === t.key ? 700 : 500 }}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </span>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "var(--f5-text-muted)", marginTop: 8 }}>
        {TABS.find((t) => t.key === tab)?.hint}
      </div>

      {tab === "config" && <ChannelsConfig channels={channels} />}
      {tab === "golive" && <ChannelsGoLive initial={goLive} />}
      {tab === "health" && <ChannelsHealth channels={channels} />}
    </>
  );
}
