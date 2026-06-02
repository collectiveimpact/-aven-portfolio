"use client";

import { useState } from "react";
import type { AgentDef } from "@/lib/types";

interface RunResponse {
  text: string;
  mode: "live" | "demo";
}

export default function TryPanel({ agents }: { agents: AgentDef[] }) {
  const [agentKey, setAgentKey] = useState(agents[0]?.key ?? "");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<RunResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentKey, input }),
      });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const data = (await res.json()) as RunResponse;
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="f5-card">
      <label className="f5-label">Agent</label>
      <select className="f5-select" value={agentKey} onChange={(e) => setAgentKey(e.target.value)}>
        {agents.map((a) => (
          <option key={a.key} value={a.key}>
            {a.name}
          </option>
        ))}
      </select>

      <label className="f5-label">Your input</label>
      <textarea
        className="f5-textarea"
        rows={4}
        placeholder="e.g. Draft a notice about water shut-off on Saturday 9am–12pm in Building B."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12 }}>
        <button className="f5-btn primary" type="button" onClick={run} disabled={loading || !input.trim()}>
          {loading ? "Running…" : "Run"}
        </button>
        {result?.mode === "demo" && (
          <span className="f5-warn" style={{ fontSize: 12 }}>
            Demo mode — sample response (set ANTHROPIC_API_KEY for live output).
          </span>
        )}
      </div>

      {error && (
        <div style={{ marginTop: 14, color: "var(--f5-red)", fontSize: 13 }}>{error}</div>
      )}

      {result && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            background: "var(--f5-surface-2)",
            border: "1px solid var(--f5-border)",
            borderRadius: 8,
            whiteSpace: "pre-wrap",
            fontSize: 13.5,
            lineHeight: 1.55,
            color: "var(--f5-text)",
          }}
        >
          {result.text}
        </div>
      )}
    </div>
  );
}
