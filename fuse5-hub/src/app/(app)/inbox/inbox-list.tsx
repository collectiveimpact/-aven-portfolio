"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Channel } from "@/lib/types";
import type { InboundRow } from "@/lib/queries";
import { replyToInbound, resolveInbound } from "./actions";

const channelLabel: Record<string, string> = { email: "Email", sms: "SMS", whatsapp: "WhatsApp", voice: "Voice", display: "Display" };
const statusDot: Record<InboundRow["status"], string> = { unread: "var(--f5-amber)", awaiting: "var(--f5-blue)", resolved: "var(--f5-green)" };

export function InboxList({ replies, canEdit }: { replies: InboundRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [replyTo, setReplyTo] = useState<InboundRow | null>(null);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  function openReply(r: InboundRow) { setError(null); setNote(null); setText(""); setReplyTo(r); }
  function sendReply() {
    if (!replyTo) return;
    if (!text.trim()) { setError("Reply cannot be empty."); return; }
    startTransition(async () => {
      const res = await replyToInbound(replyTo.id, text);
      if (!res.ok) { setError(res.error ?? "Could not send."); return; }
      setReplyTo(null); setNote(`Reply sent${res.mode === "stub" ? " (stub — set provider keys to deliver)" : ""}.`); router.refresh();
    });
  }
  function resolve(r: InboundRow) {
    startTransition(async () => {
      const res = await resolveInbound(r.id);
      if (!res.ok) { setError(res.error ?? "Could not resolve."); return; }
      router.refresh();
    });
  }

  return (
    <>
      <div className="f5-section-title">Recent Replies</div>
      {note && <div style={{ color: "var(--f5-green)", fontSize: 13, marginBottom: 10 }}>{note}</div>}
      {error && !replyTo && <div style={{ color: "var(--f5-red)", fontSize: 13, marginBottom: 10 }}>{error}</div>}

      <div className="f5-card">
        {replies.length === 0 && <div style={{ color: "var(--f5-text-muted)", fontSize: 13 }}>No inbound messages yet.</div>}
        {replies.map((r) => (
          <div key={r.id} className="f5-feed-row">
            <span className="f5-dot" style={{ background: statusDot[r.status] }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div>
                <strong>{r.sender}</strong>{" "}
                <span style={{ color: "var(--f5-text-dim)" }}>· Unit {r.unit}</span>{" "}
                <span className="f5-pill" style={{ marginLeft: 6 }}>{channelLabel[r.channel as Channel] ?? r.channel}</span>
                {r.status === "unread" && <span className="f5-badge warn" style={{ marginLeft: 6 }}>Unread</span>}
                {r.status === "awaiting" && <span className="f5-badge" style={{ marginLeft: 6 }}>Awaiting</span>}
                {r.status === "resolved" && <span className="f5-badge ok" style={{ marginLeft: 6 }}>Resolved</span>}
              </div>
              <div style={{ color: "var(--f5-text-secondary)", marginTop: 4 }}>{r.snippet}</div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
              <div style={{ color: "var(--f5-text-dim)", fontSize: 12, whiteSpace: "nowrap" }}>{r.when}</div>
              {canEdit && r.status !== "resolved" && (
                <div style={{ whiteSpace: "nowrap" }}>
                  <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => openReply(r)}>Reply</button>
                  <button className="f5-btn" style={{ padding: "4px 10px", fontSize: 12, marginLeft: 6 }} onClick={() => resolve(r)} disabled={pending}>Resolve</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {replyTo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }} onClick={() => setReplyTo(null)}>
          <div className="f5-card" style={{ width: 560, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="f5-section-title" style={{ margin: 0 }}>Reply to {replyTo.sender}</div>
            <div style={{ color: "var(--f5-text-dim)", fontSize: 12, marginBottom: 8 }}>Unit {replyTo.unit} · via {channelLabel[replyTo.channel] ?? replyTo.channel}</div>
            <div className="f5-card" style={{ background: "var(--f5-surface-2)", fontSize: 13, color: "var(--f5-text-secondary)", marginBottom: 10 }}>{replyTo.snippet}</div>

            <label className="f5-label">Your reply</label>
            <textarea className="f5-textarea" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your response…" />

            {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{error}</div>}

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="f5-btn primary" disabled={pending} onClick={sendReply}>{pending ? "Sending…" : "Send Reply"}</button>
              <button className="f5-btn" onClick={() => setReplyTo(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
