"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChannelConfigRow, ChannelKey } from "@/lib/queries";
import { saveChannelConfig, type ChannelInput } from "./actions";

// Display metadata per channel. `fields` map to keys stored in the settings
// jsonb; the channel page is generic over them.
const META: Record<ChannelKey, { name: string; ico: string; fields: { key: string; label: string }[] }> = {
  email: { name: "Email", ico: "✉️", fields: [{ key: "provider", label: "Provider" }, { key: "identifier", label: "From address" }] },
  sms: { name: "SMS", ico: "💬", fields: [{ key: "provider", label: "Provider" }, { key: "identifier", label: "Sender ID" }] },
  whatsapp: { name: "WhatsApp", ico: "🟢", fields: [{ key: "provider", label: "Provider" }, { key: "identifier", label: "Business number" }] },
  voice: { name: "Voice", ico: "📞", fields: [{ key: "provider", label: "Provider" }, { key: "identifier", label: "Caller ID" }] },
  display: { name: "Digital Display", ico: "🖥️", fields: [{ key: "provider", label: "Network" }, { key: "identifier", label: "Screens" }] },
};

export function ChannelsGrid({ channels, canEdit }: { channels: ChannelConfigRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ChannelInput | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openConfigure(c: ChannelConfigRow) {
    setError(null);
    setEditing({ channel: c.channel, enabled: c.enabled, settings: { ...c.settings } });
  }
  function save() {
    if (!editing) return;
    startTransition(async () => {
      const r = await saveChannelConfig(editing);
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setEditing(null); router.refresh();
    });
  }
  const setField = (key: string, value: string) =>
    setEditing((p) => (p ? { ...p, settings: { ...p.settings, [key]: value } } : p));

  return (
    <>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", marginTop: 18 }}>
        {channels.map((c) => {
          const meta = META[c.channel];
          return (
            <div key={c.channel} className="f5-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{meta.ico}</span>
                  <span style={{ fontWeight: 700, fontSize: 15, color: "var(--f5-text)" }}>{meta.name}</span>
                </div>
                <span className={`f5-badge ${c.enabled ? "ok" : "warn"}`}>{c.enabled ? "Enabled" : "Disabled"}</span>
              </div>

              <div style={{ marginTop: 14 }}>
                {meta.fields.map((f) => (
                  <div key={f.key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderBottom: "1px solid var(--f5-border)" }}>
                    <span style={{ color: "var(--f5-text-muted)" }}>{f.label}</span>
                    <span style={{ color: "var(--f5-text-secondary)" }}>{c.settings[f.key] || "Not set"}</span>
                  </div>
                ))}
              </div>

              {canEdit && (
                <div style={{ marginTop: 14 }}>
                  <button className="f5-btn" onClick={() => openConfigure(c)}>Configure</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!canEdit && <div style={{ fontSize: 11, color: "var(--f5-text-muted)", marginTop: 14 }}>Read-only — a publisher or admin can configure channels.</div>}

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }} onClick={() => setEditing(null)}>
          <div className="f5-card" style={{ width: 480, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="f5-section-title" style={{ margin: 0 }}>
              {META[editing.channel].ico} Configure {META[editing.channel].name}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--f5-border)" }}>
              <span style={{ fontSize: 13, color: "var(--f5-text-secondary)" }}>Channel enabled</span>
              <span
                className={`f5-badge ${editing.enabled ? "ok" : "warn"}`}
                onClick={() => setEditing((p) => (p ? { ...p, enabled: !p.enabled } : p))}
                style={{ cursor: "pointer", userSelect: "none" }}
              >{editing.enabled ? "Enabled" : "Disabled"}</span>
            </div>

            {META[editing.channel].fields.map((f) => (
              <div key={f.key} style={{ marginTop: 8 }}>
                <label className="f5-label">{f.label}</label>
                <input className="f5-input" value={editing.settings[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.label} />
              </div>
            ))}

            {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="f5-btn primary" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save"}</button>
              <button className="f5-btn" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
