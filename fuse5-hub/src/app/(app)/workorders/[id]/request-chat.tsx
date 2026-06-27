"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { getRequestThread, postStaffReply, type ThreadMessage } from "../actions";

// Staff side of the resident↔staff request thread. The resident posts from
// /portal; staff read + reply here. Replies push the resident (when VAPID set).
export function RequestChat({ woId }: { woId: string }) {
  const [msgs, setMsgs] = useState<ThreadMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  const load = () => getRequestThread(woId).then((t) => { setMsgs(t); setLoaded(true); });
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [woId]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.length]);

  const send = () => {
    const text = body.trim();
    if (!text) return;
    setErr(null);
    start(async () => {
      const r = await postStaffReply(woId, text);
      if (!r.ok) { setErr(r.error ?? "Could not send."); return; }
      setBody("");
      await load();
    });
  };

  const dim = "var(--f5-text-muted)";
  return (
    <div className="f5-card" style={{ marginTop: 18 }}>
      <div className="f5-section-title" style={{ marginTop: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Resident conversation</span>
        <span style={{ fontSize: 11, fontWeight: 400, color: dim }}>Replies notify the resident in their portal</span>
      </div>

      <div style={{ maxHeight: 320, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, padding: "4px 2px" }}>
        {loaded && msgs.length === 0 && (
          <div style={{ fontSize: 13, color: dim, padding: "10px 2px" }}>No messages from the resident yet. You can start the conversation below.</div>
        )}
        {!loaded && <div style={{ fontSize: 13, color: dim, padding: "10px 2px" }}>Loading conversation…</div>}
        {msgs.map((m) => {
          const staff = m.sender === "staff";
          return (
            <div key={m.id} style={{ alignSelf: staff ? "flex-end" : "flex-start", maxWidth: "78%" }}>
              <div style={{
                background: staff ? "var(--f5-teal-subtle, color-mix(in srgb, var(--f5-teal) 16%, transparent))" : "var(--f5-surface-2, var(--f5-border))",
                border: "1px solid var(--f5-border)", borderRadius: 10, padding: "8px 11px", fontSize: 13.5, color: "var(--f5-text)",
              }}>{m.body}</div>
              <div style={{ fontSize: 10.5, color: "var(--f5-text-dim)", marginTop: 3, textAlign: staff ? "right" : "left" }}>
                {staff ? "You · staff" : "Resident"} · {new Date(m.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {err && <div style={{ fontSize: 12.5, color: "var(--f5-red)", margin: "6px 2px" }}>{err}</div>}
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          className="f5-input" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Reply to the resident…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          style={{ flex: 1 }} disabled={pending}
        />
        <button className="f5-btn primary" onClick={send} disabled={pending || !body.trim()}>{pending ? "Sending…" : "Reply"}</button>
      </div>
    </div>
  );
}
