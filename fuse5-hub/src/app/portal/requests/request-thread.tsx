"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { postRequestMessage, type RequestMessageState } from "../actions";
import type { RequestMessageRow } from "@/lib/portal/data";

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export function RequestThread({
  workOrderId,
  initialMessages,
}: {
  workOrderId: string;
  initialMessages: RequestMessageRow[];
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<RequestMessageRow[]>(initialMessages);
  const [state, action, pending] = useActionState<RequestMessageState, FormData>(
    postRequestMessage,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  // After a successful post the action returns the refreshed thread.
  useEffect(() => {
    if (state.ok && state.messages) {
      setMessages(state.messages);
      formRef.current?.reset();
    }
  }, [state.ok, state.messages]);

  const count = messages.length;

  return (
    <div style={{ marginTop: 12, borderTop: "1px solid var(--f5-border)", paddingTop: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          background: "none", border: "none", padding: 0, cursor: "pointer",
          color: "var(--f5-teal)", fontSize: 12.5, fontWeight: 600,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}
      >
        <span aria-hidden style={{ transition: "transform .15s", transform: open ? "rotate(90deg)" : "none" }}>›</span>
        {count > 0 ? `Messages (${count})` : "Send a message"}
      </button>

      {open && (
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {messages.map((m) => {
                const mine = m.sender === "resident";
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: mine ? "flex-end" : "flex-start",
                      maxWidth: "85%",
                      background: mine ? "var(--f5-teal-subtle)" : "var(--f5-surface-2)",
                      border: `1px solid ${mine ? "var(--f5-teal-border)" : "var(--f5-border)"}`,
                      borderRadius: 12,
                      padding: "8px 11px",
                    }}
                  >
                    <div style={{ fontSize: 13.5, color: "var(--f5-text)", lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                      {m.body}
                    </div>
                    <div style={{ fontSize: 10.5, color: "var(--f5-text-muted)", marginTop: 4 }}>
                      {mine ? "You" : "Property team"} · {fmtTime(m.created_at)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <form ref={formRef} action={action} style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <input type="hidden" name="workOrderId" value={workOrderId} />
            <textarea
              name="body"
              required
              rows={2}
              placeholder="Add a message for the property team…"
              className="f5-textarea"
              style={{ flex: 1, minHeight: 0 }}
            />
            <button
              type="submit"
              className="f5-btn primary"
              disabled={pending}
              style={{ padding: "9px 14px", whiteSpace: "nowrap" }}
            >
              {pending ? "Sending…" : "Send"}
            </button>
          </form>
          {state.error && (
            <div role="alert" style={{ fontSize: 12.5, color: "var(--f5-red, #ef4444)" }}>{state.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
