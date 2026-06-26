"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ChannelConfigRow, ChannelKey } from "@/lib/queries";
import { saveChannelConfig, type ChannelInput } from "./actions";

type Field = { key: string; label: string; placeholder?: string; secret?: boolean };

// Per-channel config metadata. Every field maps to a key in the settings jsonb,
// so the generic saveChannelConfig action persists all of them unchanged.
// `secret: true` fields are credentials — we NEVER render their stored value
// back (the server drops blanks, so an empty input simply leaves them as-is and
// the status chip reports connection state, not the secret itself).
const META: Record<
  ChannelKey,
  {
    name: string;
    ico: string;
    provider: string; // the real provider name behind this channel
    credentials: Field[]; // wiring / API credentials (connection state only)
    identity: Field[]; // sender identity
    defaults: Field[]; // sending defaults
    consentLabel: string; // opt-in / consent control caption
    a2p?: boolean; // SMS-only: surface A2P 10DLC registration
  }
> = {
  email: {
    name: "Email", ico: "✉️", provider: "Resend",
    credentials: [{ key: "provider", label: "Provider", placeholder: "Resend" }, { key: "api_key", label: "API key", placeholder: "re_•••• (write-only)", secret: true }],
    identity: [{ key: "identifier", label: "From address", placeholder: "notices@yourorg.ca" }, { key: "reply_to", label: "Reply-to", placeholder: "support@yourorg.ca" }],
    defaults: [{ key: "footer", label: "Default footer", placeholder: "Sent by your housing provider" }],
    consentLabel: "Require CASL email consent before sending",
  },
  sms: {
    name: "SMS", ico: "💬", provider: "Twilio",
    credentials: [{ key: "provider", label: "Provider", placeholder: "Twilio" }, { key: "account_sid", label: "Account SID", placeholder: "AC•••• " }, { key: "auth_token", label: "Auth token", placeholder: "•••• (write-only)", secret: true }],
    identity: [{ key: "identifier", label: "Sender ID / number", placeholder: "+1 905 555 0142" }],
    defaults: [{ key: "max_segments", label: "Max segments / message", placeholder: "3" }],
    consentLabel: "Require explicit SMS opt-in before sending",
    a2p: true,
  },
  whatsapp: {
    name: "WhatsApp", ico: "🟢", provider: "Twilio / Meta",
    credentials: [{ key: "provider", label: "Provider", placeholder: "Twilio" }, { key: "api_key", label: "API key", placeholder: "•••• (write-only)", secret: true }],
    identity: [{ key: "identifier", label: "Business number", placeholder: "+1 905 555 0142" }],
    defaults: [{ key: "template_ns", label: "Template namespace", placeholder: "wa_namespace" }],
    consentLabel: "Require WhatsApp opt-in before sending",
  },
  voice: {
    name: "Voice", ico: "📞", provider: "Twilio Voice",
    credentials: [{ key: "provider", label: "Provider", placeholder: "Twilio" }, { key: "account_sid", label: "Account SID", placeholder: "AC•••• " }, { key: "auth_token", label: "Auth token", placeholder: "•••• (write-only)", secret: true }],
    identity: [{ key: "identifier", label: "Caller ID", placeholder: "+1 905 555 0142" }],
    defaults: [{ key: "voice", label: "Default voice", placeholder: "Polly.Joanna" }],
    consentLabel: "Require consent for automated voice calls",
  },
  display: {
    name: "Digital Display", ico: "🖥️", provider: "Signage network",
    credentials: [{ key: "provider", label: "Network", placeholder: "Wallboard" }, { key: "api_key", label: "API key", placeholder: "•••• (write-only)", secret: true }],
    identity: [{ key: "identifier", label: "Player group / screens", placeholder: "Lobby screens" }],
    defaults: [{ key: "dwell", label: "Default dwell (sec)", placeholder: "12" }],
    consentLabel: "Public-area display — consent not applicable",
  },
};

// Is the provider wired up? We treat "has a provider name AND a sender
// identity" as configured. Secrets are write-only and never read back, so we
// can't (and shouldn't) inspect them to decide this.
function credentialState(c: ChannelConfigRow): { configured: boolean; label: string; cls: string } {
  const hasProvider = !!(c.settings.provider && c.settings.provider.trim());
  const hasIdentity = !!(c.settings.identifier && c.settings.identifier.trim());
  if (hasProvider && hasIdentity) return { configured: true, label: "Provider connected", cls: "ok" };
  if (hasProvider || hasIdentity) return { configured: false, label: "Setup incomplete", cls: "warn" };
  return { configured: false, label: "Not configured", cls: "bad" };
}

// A2P 10DLC registration state is derived from a settings flag the admin sets.
function a2pState(c: ChannelConfigRow): { label: string; cls: string } {
  const s = (c.settings.a2p_status ?? "").trim().toLowerCase();
  if (s === "registered" || s === "approved") return { label: "10DLC registered", cls: "ok" };
  if (s === "pending") return { label: "10DLC pending", cls: "warn" };
  return { label: "10DLC not registered", cls: "bad" };
}

interface Editing extends ChannelInput {
  consent: boolean;
  a2pStatus: string;
}

export function ChannelsConfig({ channels }: { channels: ChannelConfigRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function openConfigure(c: ChannelConfigRow) {
    setError(null);
    setEditing({
      channel: c.channel,
      enabled: c.enabled,
      settings: { ...c.settings },
      consent: (c.settings.consent_required ?? "true") !== "false",
      a2pStatus: c.settings.a2p_status ?? "",
    });
  }

  function save() {
    if (!editing) return;
    // Fold the consent toggle and 10DLC status back into settings so the
    // existing action persists them with everything else.
    const settings: Record<string, string> = {
      ...editing.settings,
      consent_required: editing.consent ? "true" : "false",
    };
    if (META[editing.channel].a2p) settings.a2p_status = editing.a2pStatus;
    startTransition(async () => {
      const r = await saveChannelConfig({ channel: editing.channel, enabled: editing.enabled, settings });
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setEditing(null); router.refresh();
    });
  }

  const setField = (key: string, value: string) =>
    setEditing((p) => (p ? { ...p, settings: { ...p.settings, [key]: value } } : p));

  return (
    <>
      <div className="f5-section-title">Per-channel delivery setup</div>
      <div style={{ fontSize: 13, color: "var(--f5-text-secondary)", marginTop: -4, marginBottom: 4 }}>
        Provider credentials, sender identities, sending defaults, and consent. Credentials are write-only — Fuse5 Hub
        shows connection state, never the stored secret.
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", marginTop: 14 }}>
        {channels.map((c) => {
          const meta = META[c.channel];
          const cred = credentialState(c);
          const consentOn = (c.settings.consent_required ?? "true") !== "false";
          return (
            <div key={c.channel} className="f5-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{meta.ico}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--f5-text)" }}>{meta.name}</div>
                    <div style={{ fontSize: 11, color: "var(--f5-text-muted)" }}>{meta.provider}</div>
                  </div>
                </div>
                <span className={`f5-badge ${c.enabled ? "ok" : "warn"}`}>{c.enabled ? "Enabled" : "Disabled"}</span>
              </div>

              <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                  <span style={{ color: "var(--f5-text-muted)" }}>Provider credentials</span>
                  <span className={`f5-badge ${cred.cls}`}>{cred.label}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                  <span style={{ color: "var(--f5-text-muted)" }}>Sender identity</span>
                  <span style={{ color: "var(--f5-text-secondary)" }}>{c.settings.identifier || "Not set"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                  <span style={{ color: "var(--f5-text-muted)" }}>Consent / opt-in</span>
                  {c.channel === "display"
                    ? <span style={{ color: "var(--f5-text-dim)" }}>N/A</span>
                    : <span className={`f5-badge ${consentOn ? "ok" : "warn"}`}>{consentOn ? "Required" : "Off"}</span>}
                </div>
                {meta.a2p && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                    <span style={{ color: "var(--f5-text-muted)" }}>A2P 10DLC</span>
                    <span className={`f5-badge ${a2pState(c).cls}`}>{a2pState(c).label}</span>
                  </div>
                )}
              </div>

              <div style={{ marginTop: 14 }}>
                <button className="f5-btn" onClick={() => openConfigure(c)}>Configure wiring</button>
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }} onClick={() => setEditing(null)}>
          <div className="f5-card" style={{ width: 500, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="f5-section-title" style={{ margin: 0 }}>
              {META[editing.channel].ico} Configure {META[editing.channel].name} — {META[editing.channel].provider}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid var(--f5-border)" }}>
              <span style={{ fontSize: 13, color: "var(--f5-text-secondary)" }}>Channel enabled</span>
              <span
                className={`f5-badge ${editing.enabled ? "ok" : "warn"}`}
                onClick={() => setEditing((p) => (p ? { ...p, enabled: !p.enabled } : p))}
                style={{ cursor: "pointer", userSelect: "none" }}
              >{editing.enabled ? "Enabled" : "Disabled"}</span>
            </div>

            <div className="f5-section-title" style={{ marginBottom: 4 }}>Provider credentials</div>
            <div style={{ fontSize: 11, color: "var(--f5-text-muted)", marginBottom: 4 }}>Secrets are write-only. Leave blank to keep the current value.</div>
            {META[editing.channel].credentials.map((f) => (
              <div key={f.key} style={{ marginTop: 8 }}>
                <label className="f5-label">{f.label}</label>
                <input
                  className="f5-input"
                  type={f.secret ? "password" : "text"}
                  value={editing.settings[f.key] ?? ""}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder ?? f.label}
                  autoComplete="off"
                />
              </div>
            ))}

            <div className="f5-section-title" style={{ marginBottom: 4 }}>Sender identity</div>
            {META[editing.channel].identity.map((f) => (
              <div key={f.key} style={{ marginTop: 8 }}>
                <label className="f5-label">{f.label}</label>
                <input className="f5-input" value={editing.settings[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.placeholder ?? f.label} />
              </div>
            ))}

            <div className="f5-section-title" style={{ marginBottom: 4 }}>Sending defaults</div>
            {META[editing.channel].defaults.map((f) => (
              <div key={f.key} style={{ marginTop: 8 }}>
                <label className="f5-label">{f.label}</label>
                <input className="f5-input" value={editing.settings[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.placeholder ?? f.label} />
              </div>
            ))}

            {editing.channel !== "display" && (
              <>
                <div className="f5-section-title" style={{ marginBottom: 4 }}>Consent &amp; compliance</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
                  <span style={{ fontSize: 13, color: "var(--f5-text-secondary)" }}>{META[editing.channel].consentLabel}</span>
                  <span
                    className={`f5-badge ${editing.consent ? "ok" : "warn"}`}
                    onClick={() => setEditing((p) => (p ? { ...p, consent: !p.consent } : p))}
                    style={{ cursor: "pointer", userSelect: "none" }}
                  >{editing.consent ? "Required" : "Off"}</span>
                </div>
              </>
            )}

            {META[editing.channel].a2p && (
              <div style={{ marginTop: 8 }}>
                <label className="f5-label">A2P 10DLC registration status</label>
                <select className="f5-select" value={editing.a2pStatus} onChange={(e) => setEditing((p) => (p ? { ...p, a2pStatus: e.target.value } : p))}>
                  <option value="">Not registered</option>
                  <option value="pending">Pending review</option>
                  <option value="registered">Registered / approved</option>
                </select>
              </div>
            )}

            {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="f5-btn primary" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save configuration"}</button>
              <button className="f5-btn" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
