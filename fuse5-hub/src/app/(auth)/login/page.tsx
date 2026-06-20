"use client";

import Image from "next/image";
import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";
import { IS_DEMO } from "@/lib/env";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(signIn, {});

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
      <div className="f5-card" style={{ width: 360, maxWidth: "90vw", padding: "32px 28px" }}>
        <div className="f5-logo-chip" style={{ marginBottom: 14 }}>
          <Image src="/fuse5-logo.png" alt="Fuse5" width={170} height={129} priority style={{ width: "100%", maxWidth: 170, height: "auto" }} />
        </div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--f5-text-muted)", marginBottom: 18, textAlign: "center" }}>
          Tenant Communications Hub
        </div>
        <form action={formAction}>
          <label className="f5-label" htmlFor="email">Work email</label>
          <input id="email" name="email" className="f5-input" type="email" defaultValue={IS_DEMO ? "clinton@fuse5.ca" : ""} autoComplete="username" />
          <label className="f5-label" htmlFor="password">Password</label>
          <input id="password" name="password" className="f5-input" type="password" defaultValue={IS_DEMO ? "demo12345" : ""} autoComplete="current-password" />
          {state?.error ? (
            <div style={{ color: "var(--f5-red)", fontSize: 12, marginTop: 10 }}>{state.error}</div>
          ) : null}
          <button type="submit" disabled={pending} className="f5-btn primary" style={{ width: "100%", marginTop: 18, justifyContent: "center" }}>
            {pending ? "Signing in…" : "Sign In"}
          </button>
        </form>
        {IS_DEMO ? (
          <div style={{ fontSize: 11, color: "var(--f5-text-dim)", marginTop: 14, textAlign: "center" }}>
            Demo: clinton@fuse5.ca / demo12345
          </div>
        ) : null}
      </div>
    </div>
  );
}
