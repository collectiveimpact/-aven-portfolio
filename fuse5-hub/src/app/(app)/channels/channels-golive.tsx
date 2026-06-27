"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  GO_LIVE_CHANNELS,
  REG_STATUSES,
  REG_STATUS_META,
  CHANNEL_META,
  CHANNEL_REQUIREMENTS,
  computeGoLiveSummary,
  type GoLiveChannel,
  type RegStatus,
  type CommsRegistrationRow,
  type SenderIdentityRow,
} from "@/lib/comms-golive";
import type { GoLiveState } from "./actions";
import {
  saveRegistration,
  submitRegistration,
  addSenderIdentity,
  setSenderVerified,
  removeSenderIdentity,
} from "./actions";

// GO-LIVE management surface. The platform MANAGES registration; the operator
// supplies real provider keys in env/secrets and completes the external
// Twilio/carrier process themselves. This tab tracks that process: per-channel
// readiness, the A2P 10DLC registration pipeline, and sender-identity
// verification. No secrets are entered or shown here.

function emptyReg(channel: GoLiveChannel): CommsRegistrationRow {
  return {
    channel,
    brand_name: null,
    brand_status: "unregistered",
    campaign_use_case: null,
    campaign_status: "unregistered",
    sender_id: null,
    sender_verified: false,
    ten_dlc_status: "unregistered",
    submitted_at: null,
    notes: null,
    updated_at: null,
  };
}

interface RegEditing {
  channel: GoLiveChannel;
  brandName: string;
  brandStatus: RegStatus;
  campaignUseCase: string;
  campaignStatus: RegStatus;
  senderId: string;
  tenDlcStatus: RegStatus;
  notes: string;
}

export function ChannelsGoLive({ initial }: { initial: GoLiveState }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const regByChannel = useMemo(
    () => new Map(initial.registrations.map((r) => [r.channel as GoLiveChannel, r])),
    [initial.registrations],
  );
  const summary = useMemo(
    () => computeGoLiveSummary(initial.flags, initial.registrations, initial.identities),
    [initial],
  );

  // Registration-manager modal state.
  const [editing, setEditing] = useState<RegEditing | null>(null);
  // Sender add-form state (per channel input).
  const [senderDraft, setSenderDraft] = useState<{ channel: GoLiveChannel; value: string; label: string } | null>(null);

  function openRegistration(channel: GoLiveChannel) {
    setError(null);
    const r = regByChannel.get(channel) ?? emptyReg(channel);
    setEditing({
      channel,
      brandName: r.brand_name ?? "",
      brandStatus: r.brand_status,
      campaignUseCase: r.campaign_use_case ?? "Tenant/property notifications",
      campaignStatus: r.campaign_status,
      senderId: r.sender_id ?? "",
      tenDlcStatus: r.ten_dlc_status,
      notes: r.notes ?? "",
    });
  }

  function saveReg() {
    if (!editing) return;
    startTransition(async () => {
      const r = await saveRegistration(editing);
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setEditing(null); router.refresh();
    });
  }

  function submitReg(channel: GoLiveChannel) {
    setError(null);
    startTransition(async () => {
      const r = await submitRegistration(channel);
      if (!r.ok) { setError(r.error ?? "Could not submit."); return; }
      setEditing(null); router.refresh();
    });
  }

  function addSender() {
    if (!senderDraft) return;
    startTransition(async () => {
      const r = await addSenderIdentity(senderDraft);
      if (!r.ok) { setError(r.error ?? "Could not add."); return; }
      setSenderDraft(null); router.refresh();
    });
  }

  function toggleVerify(id: SenderIdentityRow) {
    startTransition(async () => {
      const r = await setSenderVerified(id.channel as GoLiveChannel, id.value, !id.verified);
      if (!r.ok) { setError(r.error ?? "Could not update."); return; }
      router.refresh();
    });
  }

  function removeSender(id: SenderIdentityRow) {
    startTransition(async () => {
      const r = await removeSenderIdentity(id.channel as GoLiveChannel, id.value);
      if (!r.ok) { setError(r.error ?? "Could not remove."); return; }
      router.refresh();
    });
  }

  return (
    <>
      {/* Readiness summary */}
      <div className="f5-section-title">Go-live readiness</div>
      <div style={{ fontSize: 13, color: "var(--f5-text-secondary)", marginTop: -4, marginBottom: 4 }}>
        Per channel: credentials configured, sender verified, A2P registered (SMS/WhatsApp), and a test passed. The
        platform manages registration — you supply real provider keys and complete the carrier process externally.
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 14 }}>
        <div className="f5-card">
          <div className="f5-kpi-label">Channels ready</div>
          <div className="f5-kpi-value">{summary.readyCount}</div>
          <div className="f5-kpi-sub">of {summary.totalCount} comms channels</div>
        </div>
        <div className="f5-card">
          <div className="f5-kpi-label">A2P 10DLC (env)</div>
          <div className="f5-kpi-value" style={{ fontSize: 18, textTransform: "capitalize" }}>{initial.a2pEnvStatus}</div>
          <div className="f5-kpi-sub">A2P_10DLC_STATUS — carrier gate</div>
        </div>
        <div className="f5-card">
          <div className="f5-kpi-label">Verified senders</div>
          <div className="f5-kpi-value">{initial.identities.filter((i) => i.verified).length}</div>
          <div className="f5-kpi-sub">of {initial.identities.length} on file</div>
        </div>
        <div className="f5-card">
          <div className="f5-kpi-label">Credentials live</div>
          <div className="f5-kpi-value">{GO_LIVE_CHANNELS.filter((c) => initial.flags[c]).length}</div>
          <div className="f5-kpi-sub">providers connected in env</div>
        </div>
      </div>

      {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{error}</div>}

      {/* Per-channel readiness + registration */}
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", marginTop: 18 }}>
        {summary.channels.map((ch) => {
          const meta = CHANNEL_META[ch.channel];
          const req = CHANNEL_REQUIREMENTS[ch.channel];
          const reg = regByChannel.get(ch.channel);
          const idents = initial.identities.filter((i) => i.channel === ch.channel);
          return (
            <div key={ch.channel} className="f5-card">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{meta.ico}</span>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "var(--f5-text)" }}>{meta.name}</div>
                </div>
                <span className={`f5-badge ${ch.ready ? "ok" : "bad"}`}>
                  {ch.ready ? "Ready to go live" : "Blocked"}
                </span>
              </div>

              {/* Checklist */}
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 7 }}>
                {ch.checks.map((c) => (
                  <div key={c.key} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13 }}>
                    <span style={{ color: c.done ? "var(--f5-green)" : "var(--f5-text-dim)", fontWeight: 700, lineHeight: "18px" }}>
                      {c.done ? "✓" : "○"}
                    </span>
                    <div>
                      <div style={{ color: "var(--f5-text-secondary)" }}>{c.label}</div>
                      <div style={{ color: "var(--f5-text-muted)", fontSize: 11 }}>{c.detail}</div>
                    </div>
                  </div>
                ))}
              </div>

              {!ch.ready && (
                <div style={{ marginTop: 10, fontSize: 12, color: "var(--f5-amber)" }}>
                  Blocked on: {ch.blockers.join(", ")}
                </div>
              )}

              {/* A2P pipeline status (SMS/WhatsApp) */}
              {req.requiresA2P && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--f5-border)" }}>
                  <div style={{ fontSize: 11, color: "var(--f5-text-muted)", marginBottom: 6 }}>A2P 10DLC pipeline</div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <PipelineChip label="Brand" status={reg?.brand_status ?? "unregistered"} />
                    <PipelineChip label="Campaign" status={reg?.campaign_status ?? "unregistered"} />
                    <PipelineChip label="10DLC" status={reg?.ten_dlc_status ?? "unregistered"} />
                  </div>
                  {!initial.flags[ch.channel] && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "var(--f5-amber)" }}>
                      Connect Twilio credentials first to submit registration.
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button className="f5-btn" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => openRegistration(ch.channel)}>
                      Manage registration
                    </button>
                    <button
                      className="f5-btn primary"
                      style={{ padding: "6px 12px", fontSize: 12 }}
                      disabled={pending || !initial.flags[ch.channel]}
                      onClick={() => submitReg(ch.channel)}
                    >
                      Submit registration
                    </button>
                  </div>
                </div>
              )}

              {/* Sender identities */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--f5-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: "var(--f5-text-muted)" }}>{req.senderLabel}</span>
                  <button
                    className="f5-btn"
                    style={{ padding: "4px 9px", fontSize: 11 }}
                    onClick={() => setSenderDraft({ channel: ch.channel, value: "", label: "" })}
                  >
                    + Add
                  </button>
                </div>
                {idents.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--f5-text-dim)" }}>No sender identities yet.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {idents.map((id) => (
                      <div key={id.value} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: "var(--f5-text)", overflow: "hidden", textOverflow: "ellipsis" }}>{id.value}</div>
                          {id.label && <div style={{ fontSize: 11, color: "var(--f5-text-muted)" }}>{id.label}</div>}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          <span className={`f5-badge ${id.verified ? "ok" : "warn"}`}>{id.verified ? "Verified" : "Unverified"}</span>
                          <button className="f5-btn" style={{ padding: "4px 9px", fontSize: 11 }} disabled={pending} onClick={() => toggleVerify(id)}>
                            {id.verified ? "Unverify" : "Send test / verify"}
                          </button>
                          <button className="f5-btn" style={{ padding: "4px 8px", fontSize: 11 }} disabled={pending} onClick={() => removeSender(id)} aria-label="Remove">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {!initial.flags[ch.channel] && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "var(--f5-text-muted)" }}>
                    Verification is recorded locally until {req.credentialLabel.toLowerCase()} are connected — no message is dispatched.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Credentials note */}
      <div className="f5-card" style={{ marginTop: 18, borderColor: "var(--f5-border-hover)" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🔑</span>
          <div style={{ fontSize: 12, color: "var(--f5-text-secondary)", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--f5-text)" }}>How credentials &amp; registration work.</strong> Provider API
            keys (Twilio, Resend/SendGrid) are write-only — you enter the real values in your environment / secrets,
            never here, and Fuse5 Hub never displays them. Carrier registration (A2P 10DLC brand &amp; campaign, caller-ID
            and domain verification) is completed by you with the provider; this surface <em>tracks and manages</em> that
            process so you always see what is blocking each channel from going live.
          </div>
        </div>
      </div>

      {/* Sender add modal */}
      {senderDraft && (
        <Modal onClose={() => setSenderDraft(null)} title={`${CHANNEL_META[senderDraft.channel].ico} Add sender — ${CHANNEL_META[senderDraft.channel].name}`}>
          <label className="f5-label">{CHANNEL_REQUIREMENTS[senderDraft.channel].senderLabel}</label>
          <input
            className="f5-input"
            value={senderDraft.value}
            onChange={(e) => setSenderDraft((p) => (p ? { ...p, value: e.target.value } : p))}
            placeholder={senderDraft.channel === "email" ? "notices@yourorg.ca" : "+1 905 555 0142"}
            autoComplete="off"
          />
          <label className="f5-label" style={{ marginTop: 10 }}>Label (optional)</label>
          <input
            className="f5-input"
            value={senderDraft.label}
            onChange={(e) => setSenderDraft((p) => (p ? { ...p, label: e.target.value } : p))}
            placeholder="Lobby line / Notices inbox"
            autoComplete="off"
          />
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button className="f5-btn primary" disabled={pending} onClick={addSender}>{pending ? "Adding…" : "Add identity"}</button>
            <button className="f5-btn" onClick={() => setSenderDraft(null)}>Cancel</button>
          </div>
        </Modal>
      )}

      {/* Registration manager modal */}
      {editing && (
        <Modal onClose={() => setEditing(null)} title={`${CHANNEL_META[editing.channel].ico} A2P 10DLC registration — ${CHANNEL_META[editing.channel].name}`}>
          <div style={{ fontSize: 11, color: "var(--f5-text-muted)", marginBottom: 8 }}>
            Capture the brand &amp; campaign details carriers require. No secrets — business info only. Submitting
            initiates the external Twilio / carrier registration process.
          </div>

          <div className="f5-section-title" style={{ marginBottom: 4 }}>Brand registration</div>
          <label className="f5-label">Legal business name</label>
          <input className="f5-input" value={editing.brandName} onChange={(e) => setEditing((p) => (p ? { ...p, brandName: e.target.value } : p))} placeholder="Your Housing Provider Inc." />
          <label className="f5-label" style={{ marginTop: 10 }}>Brand status</label>
          <StatusSelect value={editing.brandStatus} onChange={(v) => setEditing((p) => (p ? { ...p, brandStatus: v } : p))} />

          <div className="f5-section-title" style={{ marginBottom: 4 }}>Campaign registration</div>
          <label className="f5-label">Use-case</label>
          <input className="f5-input" value={editing.campaignUseCase} onChange={(e) => setEditing((p) => (p ? { ...p, campaignUseCase: e.target.value } : p))} placeholder="Tenant/property notifications" />
          <label className="f5-label" style={{ marginTop: 10 }}>Campaign status</label>
          <StatusSelect value={editing.campaignStatus} onChange={(v) => setEditing((p) => (p ? { ...p, campaignStatus: v } : p))} />

          <label className="f5-label" style={{ marginTop: 10 }}>Sample messages &amp; opt-in flow</label>
          <textarea
            className="f5-input"
            style={{ minHeight: 80, resize: "vertical" }}
            value={editing.notes}
            onChange={(e) => setEditing((p) => (p ? { ...p, notes: e.target.value } : p))}
            placeholder={"EIN / business info, sample messages, and how residents opt in.\nDo NOT enter API keys or secrets here."}
          />

          <div className="f5-section-title" style={{ marginBottom: 4 }}>Sender &amp; 10DLC</div>
          <label className="f5-label">Registered sender ID / number</label>
          <input className="f5-input" value={editing.senderId} onChange={(e) => setEditing((p) => (p ? { ...p, senderId: e.target.value } : p))} placeholder="+1 905 555 0142" />
          <label className="f5-label" style={{ marginTop: 10 }}>10DLC status</label>
          <StatusSelect value={editing.tenDlcStatus} onChange={(v) => setEditing((p) => (p ? { ...p, tenDlcStatus: v } : p))} />

          {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            <button className="f5-btn primary" disabled={pending} onClick={saveReg}>{pending ? "Saving…" : "Save"}</button>
            <button
              className="f5-btn"
              disabled={pending || !initial.flags[editing.channel]}
              onClick={() => submitReg(editing.channel)}
              title={!initial.flags[editing.channel] ? "Connect Twilio credentials first" : undefined}
            >
              Submit registration
            </button>
            <button className="f5-btn" onClick={() => setEditing(null)}>Cancel</button>
          </div>
          {!initial.flags[editing.channel] && (
            <div style={{ marginTop: 8, fontSize: 11, color: "var(--f5-amber)" }}>Connect Twilio credentials first to submit.</div>
          )}
        </Modal>
      )}
    </>
  );
}

function PipelineChip({ label, status }: { label: string; status: RegStatus }) {
  const m = REG_STATUS_META[status];
  return (
    <span className={`f5-badge ${m.cls}`} style={{ fontSize: 11 }}>
      {label}: {m.label}
    </span>
  );
}

function StatusSelect({ value, onChange }: { value: RegStatus; onChange: (v: RegStatus) => void }) {
  return (
    <select className="f5-select" value={value} onChange={(e) => onChange(e.target.value as RegStatus)}>
      {REG_STATUSES.map((s) => (
        <option key={s} value={s}>{REG_STATUS_META[s].label}</option>
      ))}
    </select>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }}
      onClick={onClose}
    >
      <div className="f5-card" style={{ width: 520, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
        <div className="f5-section-title" style={{ margin: 0 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}
