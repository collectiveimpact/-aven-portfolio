"use client";

import { useState, useRef, useTransition } from "react";
import { askQuestion } from "../actions";

interface Turn { role: "you" | "assistant"; text: string; mode?: "live" | "stub" }

const SUGGESTIONS = [
  "When is garbage collection?",
  "How do I report a repair?",
  "Who do I contact in an emergency?",
];

export function AskChat({ context, hasAI }: { context: string; hasAI: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function ask(question: string) {
    const q = question.trim();
    if (!q || pending) return;
    setTurns((t) => [...t, { role: "you", text: q }]);
    setInput("");
    start(async () => {
      const r = await askQuestion(q, context);
      setTurns((t) => [...t, { role: "assistant", text: r.answer, mode: r.mode }]);
      inputRef.current?.focus();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div
        className="f5-card"
        style={{
          padding: 12, fontSize: 12.5, color: "var(--f5-text-muted)",
          display: "flex", gap: 8, alignItems: "flex-start",
        }}
      >
        <span aria-hidden style={{ color: "var(--f5-teal)" }}>✦</span>
        <span>
          This is an <strong style={{ color: "var(--f5-text)" }}>AI assistant</strong>. It can answer general questions
          about your building, but it isn&apos;t a person and can&apos;t see your account. For anything urgent or
          official, contact your housing office.
          {!hasAI && " (Demo mode: no AI key configured, so answers are sample responses.)"}
        </span>
      </div>

      {turns.length === 0 ? (
        <div className="f5-card" style={{ padding: 18 }}>
          <div style={{ fontWeight: 600, color: "var(--f5-text)", marginBottom: 10 }}>Try asking…</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SUGGESTIONS.map((s) => (
              <button key={s} type="button" className="f5-btn" style={{ fontSize: 13 }} onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {turns.map((t, i) => (
            <div key={i} style={{ display: "flex", justifyContent: t.role === "you" ? "flex-end" : "flex-start" }}>
              <div
                className="f5-card"
                style={{
                  maxWidth: "85%", padding: "12px 14px",
                  background: t.role === "you" ? "var(--f5-teal-subtle)" : "var(--f5-surface)",
                  border: t.role === "you" ? "1px solid var(--f5-teal-border)" : "1px solid var(--f5-border)",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--f5-text-muted)", marginBottom: 4 }}>
                  {t.role === "you" ? "You" : "Assistant"}
                  {t.role === "assistant" && t.mode === "stub" && (
                    <span style={{ fontWeight: 400, opacity: 0.8 }}> · sample answer</span>
                  )}
                </div>
                <div style={{ color: "var(--f5-text)", fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                  {t.text}
                </div>
              </div>
            </div>
          ))}
          {pending && (
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <div className="f5-card" style={{ padding: "12px 14px", color: "var(--f5-text-muted)", fontSize: 13 }}>
                Thinking…
              </div>
            </div>
          )}
        </div>
      )}

      <div className="f5-card" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
        <textarea
          ref={inputRef}
          className="f5-textarea"
          rows={2}
          placeholder="Ask a question about your building…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(input);
            }
          }}
        />
        <button
          type="button"
          className="f5-btn primary"
          disabled={pending || !input.trim()}
          style={{ justifyContent: "center", padding: 10 }}
          onClick={() => ask(input)}
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </div>
  );
}
