"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
      <div className="f5-card" style={{ width: 360, maxWidth: "90vw", padding: "32px 28px" }}>
        <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: "-0.5px" }}>
          fuse<span style={{ color: "var(--f5-teal)" }}>5</span> Hub
        </div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--f5-text-muted)", marginBottom: 18 }}>
          Tenant Communications
        </div>
        <form action={formAction}>
          <label className="f5-label" htmlFor="email">Work email</label>
          <input id="email" name="email" className="f5-input" type="email" defaultValue="clinton@fuse5.ca" autoComplete="username" />
          <label className="f5-label" htmlFor="password">Password</label>
          <input id="password" name="password" className="f5-input" type="password" defaultValue="demo12345" autoComplete="current-password" />
          {state?.error ? (
            <div style={{ color: "var(--f5-red)", fontSize: 12, marginTop: 10 }}>{state.error}</div>
          ) : null}
          <button type="submit" disabled={pending} className="f5-btn primary" style={{ width: "100%", marginTop: 18, justifyContent: "center" }}>
            {pending ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <div style={{ fontSize: 11, color: "var(--f5-text-dim)", marginTop: 14, textAlign: "center" }}>
          Demo: clinton@fuse5.ca / demo12345
        </div>
      </div>
    </div>
  );
}
