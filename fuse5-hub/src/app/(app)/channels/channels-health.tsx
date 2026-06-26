"use client";

import { useState, useTransition } from "react";
import type { ChannelConfigRow, ChannelKey } from "@/lib/queries";

// Health & Performance is intentionally a separate surface from Configuration.
// It answers "is this channel delivering?" — not "is it wired up?". The metrics
// below are operational telemetry; until a live deliverability feed exists they
// are clearly-labeled reference figures, not editable config.
const HEALTH: Record<ChannelKey, { name: string; ico: string; delivered: number; throughput: string; errorRate: number; uptime: number; lastTested: string }> = {
  email: { name: "Email", ico: "✉️", delivered: 99.4, throughput: "6,482 / 30d", errorRate: 0.6, uptime: 99.98, lastTested: "2 min ago" },
  sms: { name: "SMS", ico: "💬", delivered: 99.1, throughput: "4,231 / 30d", errorRate: 0.9, uptime: 99.95, lastTested: "5 min ago" },
  whatsapp: { name: "WhatsApp", ico: "🟢", delivered: 97.8, throughput: "2,134 / 30d", errorRate: 2.2, uptime: 99.7, lastTested: "18 min ago" },
  voice: { name: "Voice", ico: "📞", delivered: 96.4, throughput: "318 / 30d", errorRate: 3.6, uptime: 99.4, lastTested: "1h 04m ago" },
  display: { name: "Digital Display", ico: "🖥️", delivered: 99.9, throughput: "43 players online", errorRate: 0.1, uptime: 99.99, lastTested: "1 min ago" },
};

function healthTone(delivered: number): { label: string; cls: string } {
  if (delivered >= 99) return { label: "Healthy", cls: "ok" };
  if (delivered >= 97) return { label: "Degraded", cls: "warn" };
  return { label: "At risk", cls: "bad" };
}

export function ChannelsHealth({ channels }: { channels: ChannelConfigRow[] }) {
  const enabledKeys = new Set(channels.filter((c) => c.enabled).map((c) => c.channel));
  const [testing, startTest] = useTransition();
  const [testedAt, setTestedAt] = useState<ChannelKey | null>(null);

  // Local-only "send test" affordance — exercises the monitoring surface without
  // touching saved config. No backend test endpoint exists yet (stubbed).
  function runTest(ch: ChannelKey) {
    startTest(() => {
      setTestedAt(ch);
      setTimeout(() => setTestedAt(null), 1600);
    });
  }

  const rows = channels.map((c) => ({ key: c.channel, enabled: c.enabled, ...HEALTH[c.channel] }));
  const liveCount = rows.filter((r) => r.enabled).length;
  const avgDelivered = liveCount
    ? (rows.filter((r) => r.enabled).reduce((s, r) => s + r.delivered, 0) / liveCount).toFixed(1)
    : "—";
  const worstUptime = liveCount ? Math.min(...rows.filter((r) => r.enabled).map((r) => r.uptime)) : null;

  return (
    <>
      <div className="f5-section-title">Delivery health — last 30 days</div>
      <div style={{ fontSize: 13, color: "var(--f5-text-secondary)", marginTop: -4, marginBottom: 4 }}>
        Operational monitoring only. This is separate from setup — nothing here changes how a channel is wired.
      </div>

      {/* Summary KPIs */}
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 14 }}>
        <div className="f5-card"><div className="f5-kpi-label">Channels live</div><div className="f5-kpi-value">{liveCount}</div><div className="f5-kpi-sub">of {rows.length} configured</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Avg deliverability</div><div className="f5-kpi-value">{avgDelivered}%</div><div className="f5-kpi-sub">across live channels</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Lowest uptime</div><div className="f5-kpi-value">{worstUptime !== null ? `${worstUptime}%` : "—"}</div><div className="f5-kpi-sub">weakest live channel</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Active incidents</div><div className="f5-kpi-value">0</div><div className="f5-kpi-sub">all systems nominal</div></div>
      </div>

      {/* Per-channel monitoring table */}
      <div className="f5-card" style={{ marginTop: 18, overflowX: "auto" }}>
        <table className="f5-table" style={{ minWidth: 760 }}>
          <thead>
            <tr>
              <th>Channel</th>
              <th>Status</th>
              <th>Deliverability</th>
              <th>Throughput</th>
              <th>Error rate</th>
              <th>Uptime</th>
              <th>Last tested</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const tone = healthTone(r.delivered);
              const off = !enabledKeys.has(r.key);
              return (
                <tr key={r.key} style={off ? { opacity: 0.5 } : undefined}>
                  <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>
                    <span style={{ marginRight: 8 }}>{r.ico}</span>{r.name}
                  </td>
                  <td>{off ? <span className="f5-badge warn">Disabled</span> : <span className={`f5-badge ${tone.cls}`}>{tone.label}</span>}</td>
                  <td>{r.delivered}%</td>
                  <td>{r.throughput}</td>
                  <td style={{ color: r.errorRate >= 3 ? "var(--f5-red)" : r.errorRate >= 1 ? "var(--f5-amber)" : "var(--f5-green)" }}>{r.errorRate}%</td>
                  <td>{r.uptime}%</td>
                  <td style={{ color: "var(--f5-text-muted)" }}>{testedAt === r.key ? "just now" : r.lastTested}</td>
                  <td>
                    <button className="f5-btn" style={{ padding: "5px 10px", fontSize: 12 }} disabled={off || testing} onClick={() => runTest(r.key)}>
                      {testedAt === r.key ? "✓ Sent" : "Send test"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11, color: "var(--f5-text-muted)", marginTop: 12 }}>
        Deliverability, throughput, and uptime are reference telemetry pending a live deliverability feed. Test sends are
        local-only — no message is dispatched.
      </div>
    </>
  );
}
