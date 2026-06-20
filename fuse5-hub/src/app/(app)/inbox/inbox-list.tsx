"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InboundRow } from "@/lib/queries";
import { replyToInbound, resolveInbound } from "./actions";

const fg = "var(--f5-text)";
const dim = "var(--f5-text-muted)";
const CH_ICON: Record<string, string> = { sms: "💬", email: "✉", whatsapp: "🟢", voice: "📞" };
const QUICK_REPLIES = [
  "Thanks for reaching out — we're on it and will update you shortly.",
  "Your request has been logged as a work order. A technician is scheduled.",
  "This has been resolved. Please let us know if anything else comes up.",
  "We've received your message and escalated it to the property manager.",
];

type Filter = "all" | "unread" | "awaiting" | "resolved" | "flagged";

// Deterministic demo enrichment for the contact panel (the real model carries
// only sender/unit/channel; these flesh out the conversation context).
function enrich(r: InboundRow) {
  const buildings = ["WoodGreen — Danforth", "WoodGreen — East York", "WoodGreen — Riverdale"];
  const langs = ["English", "French", "Mandarin"];
  const h = r.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return {
    building: buildings[h % 3],
    phone: `416-555-${String(1000 + (h % 9000))}`,
    email: `${r.sender.toLowerCase().replace(/[^a-z]+/g, ".")}@example.org`,
    preferred: r.channel,
    language: langs[h % 3],
    optIn: h % 5 !== 0,
    tags: [["maintenance-issue", "high-priority"], ["billing", "spanish-speaker"], ["general"], ["maintenance-issue"]][h % 4],
    relatedWO: h % 2 === 0 ? { id: `WO-2026-0${100 + (h % 800)}`, status: "In Progress" } : null,
  };
}

export function InboxList({ replies, canEdit }: { replies: InboundRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [selId, setSelId] = useState<string | null>(replies[0]?.id ?? null);
  const [reply, setReply] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [showQuick, setShowQuick] = useState(false);

  const counts = {
    unread: replies.filter((r) => r.status === "unread").length,
    flagged: Object.values(flags).filter(Boolean).length,
    awaiting: replies.filter((r) => r.status === "awaiting").length,
  };
  const needle = q.trim().toLowerCase();
  const list = useMemo(() => replies.filter((r) => {
    if (filter === "flagged" ? !flags[r.id] : filter !== "all" && r.status !== filter) return false;
    if (!needle) return true;
    return [r.sender, r.unit, r.snippet].some((v) => (v ?? "").toLowerCase().includes(needle));
  }), [replies, filter, flags, needle]);

  const sel = replies.find((r) => r.id === selId) ?? list[0] ?? null;
  const ex = sel ? enrich(sel) : null;

  function send() {
    if (!sel || !reply.trim()) return;
    setError(null);
    start(async () => {
      const r = await replyToInbound(sel.id, reply);
      if (!r.ok) { setError(r.error ?? "Could not send."); return; }
      setReply(""); router.refresh();
    });
  }
  function resolve() {
    if (!sel) return;
    start(async () => { const r = await resolveInbound(sel.id); if (!r.ok) setError(r.error ?? "Could not resolve."); else router.refresh(); });
  }
  const statusBadge = (s: InboundRow["status"]) => s === "unread" ? "f5-badge warn" : s === "awaiting" ? "f5-badge" : "f5-badge ok";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr 280px", gap: 16, marginTop: 18, alignItems: "start" }}>
      {/* LEFT — conversation list */}
      <div className="f5-card" style={{ padding: 0, overflow: "hidden", position: "sticky", top: 16 }}>
        <div style={{ padding: 12, borderBottom: "1px solid var(--f5-border)" }}>
          <input className="f5-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations…" style={{ fontSize: 13 }} />
          <div className="f5-chips" style={{ margin: "10px 0 0", gap: 5 }}>
            {([["all", "All"], ["unread", `Unread ${counts.unread}`], ["flagged", `Flagged ${counts.flagged}`], ["awaiting", `Awaiting ${counts.awaiting}`]] as [Filter, string][]).map(([k, l]) => (
              <span key={k} className={`f5-chip${filter === k ? " active" : ""}`} style={{ fontSize: 11 }} onClick={() => setFilter(k)}>{l}</span>
            ))}
          </div>
        </div>
        <div style={{ maxHeight: 560, overflowY: "auto" }}>
          {list.length === 0 && <div style={{ padding: 20, color: dim, fontSize: 13, textAlign: "center" }}>No conversations.</div>}
          {list.map((r) => (
            <div key={r.id} onClick={() => { setSelId(r.id); setError(null); }}
              style={{ display: "flex", gap: 10, padding: "10px 12px", cursor: "pointer", borderBottom: "1px solid var(--f5-border)", background: sel?.id === r.id ? "var(--f5-teal-soft, rgba(0,153,153,0.12))" : "transparent" }}>
              <span style={{ width: 32, height: 32, borderRadius: 99, background: "var(--f5-bg-soft, rgba(255,255,255,0.06))", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12, color: fg, flexShrink: 0 }}>{r.sender.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ color: fg, fontWeight: 600, fontSize: 13 }}>{r.sender} {flags[r.id] && <span style={{ color: "var(--f5-sun,#FFB066)" }}>★</span>}</span>
                  <span style={{ color: dim, fontSize: 11, flexShrink: 0 }}>{CH_ICON[r.channel] ?? "•"} {r.when}</span>
                </div>
                <div style={{ color: dim, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Unit {r.unit} · {r.snippet}</div>
              </div>
              {r.status === "unread" && <span style={{ width: 8, height: 8, borderRadius: 99, background: "var(--f5-teal,#00CCCC)", flexShrink: 0, marginTop: 6 }} />}
            </div>
          ))}
        </div>
      </div>

      {/* MIDDLE — thread + composer */}
      <div className="f5-card" style={{ minHeight: 400 }}>
        {!sel ? <div style={{ color: dim, fontSize: 13, textAlign: "center", padding: 40 }}>Select a conversation.</div> : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--f5-border)", paddingBottom: 10 }}>
              <div><div style={{ fontWeight: 700, color: fg }}>{sel.sender}</div><div style={{ fontSize: 12, color: dim }}>Unit {sel.unit} · {CH_ICON[sel.channel]} {sel.channel}</div></div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button className="f5-btn" type="button" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setFlags((f) => ({ ...f, [sel.id]: !f[sel.id] }))}>{flags[sel.id] ? "★ Flagged" : "☆ Flag"}</button>
                <span className={statusBadge(sel.status)}>{sel.status}</span>
              </div>
            </div>

            {/* thread */}
            <div style={{ padding: "16px 0", display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ alignSelf: "flex-start", maxWidth: "75%", background: "var(--f5-bg-soft, rgba(255,255,255,0.05))", borderRadius: "12px 12px 12px 2px", padding: "10px 12px" }}>
                <div style={{ fontSize: 13, color: fg }}>{sel.snippet}</div>
                <div style={{ fontSize: 10, color: dim, marginTop: 4 }}>{sel.sender} · {sel.when}</div>
              </div>
              {sel.status !== "unread" && (
                <div style={{ alignSelf: "flex-end", maxWidth: "75%", background: "var(--f5-teal-soft, rgba(0,153,153,0.18))", borderRadius: "12px 12px 2px 12px", padding: "10px 12px" }}>
                  <div style={{ fontSize: 13, color: fg }}>{sel.status === "resolved" ? "Marked resolved. Thanks for letting us know." : "Thanks — we've logged this and will follow up shortly."}</div>
                  <div style={{ fontSize: 10, color: dim, marginTop: 4 }}>You · ✓✓ {sel.status === "resolved" ? "Read" : "Sent"}</div>
                </div>
              )}
            </div>

            {/* composer */}
            {canEdit ? (
              <div style={{ borderTop: "1px solid var(--f5-border)", paddingTop: 12 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: dim }}>Reply via {CH_ICON[sel.channel]} {sel.channel}</span>
                  <div style={{ position: "relative", marginLeft: "auto" }}>
                    <button className="f5-btn" type="button" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setShowQuick((v) => !v)}>⚡ Quick Replies</button>
                    {showQuick && (
                      <div className="f5-card" style={{ position: "absolute", right: 0, top: "110%", width: 320, zIndex: 20, padding: 6 }}>
                        {QUICK_REPLIES.map((qr, i) => (
                          <div key={i} onClick={() => { setReply(qr); setShowQuick(false); }} style={{ padding: "7px 8px", fontSize: 12, color: "var(--f5-text-secondary)", cursor: "pointer", borderRadius: 6 }}>{qr}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <textarea className="f5-input" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply…" />
                {error && <div style={{ color: "var(--f5-red,#f87171)", fontSize: 12, marginTop: 8 }}>{error}</div>}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button className="f5-btn primary" disabled={pending || !reply.trim()} onClick={send}>{pending ? "Sending…" : "Send Reply"}</button>
                  {sel.status !== "resolved" && <button className="f5-btn" disabled={pending} onClick={resolve}>Resolve</button>}
                </div>
              </div>
            ) : <div style={{ fontSize: 11, color: dim, borderTop: "1px solid var(--f5-border)", paddingTop: 12 }}>Read-only — a publisher or admin can reply.</div>}
          </>
        )}
      </div>

      {/* RIGHT — contact context */}
      {sel && ex && (
        <div className="f5-card" style={{ position: "sticky", top: 16 }}>
          <div className="f5-section-title" style={{ marginTop: 0 }}>Contact</div>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "5px 10px", fontSize: 12 }}>
            <span style={{ color: dim }}>Unit</span><span style={{ color: fg }}>{sel.unit}</span>
            <span style={{ color: dim }}>Building</span><span>{ex.building}</span>
            <span style={{ color: dim }}>Phone</span><span>{ex.phone}</span>
            <span style={{ color: dim }}>Email</span><span style={{ wordBreak: "break-all" }}>{ex.email}</span>
            <span style={{ color: dim }}>Preferred</span><span style={{ textTransform: "capitalize" }}>{ex.preferred}</span>
            <span style={{ color: dim }}>Language</span><span>{ex.language}</span>
            <span style={{ color: dim }}>Opt-in</span><span>{ex.optIn ? "Yes" : "No"}</span>
          </div>
          <div className="f5-section-title">Tags</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{ex.tags.map((t) => <span key={t} className="f5-badge" style={{ fontSize: 10 }}>{t}</span>)}</div>
          <div className="f5-section-title">Related Work Orders</div>
          {ex.relatedWO ? (
            <div style={{ fontSize: 12, display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--f5-teal,#00CCCC)", fontFamily: "monospace" }}>{ex.relatedWO.id}</span><span className="f5-badge">{ex.relatedWO.status}</span></div>
          ) : <div style={{ fontSize: 12, color: dim }}>None linked.</div>}
        </div>
      )}
    </div>
  );
}
