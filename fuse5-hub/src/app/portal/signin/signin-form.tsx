"use client";

import { useActionState } from "react";
import { signInResident, type SignInState } from "../actions";

const initial: SignInState = {};

export function SignInForm() {
  const [state, action, pending] = useActionState(signInResident, initial);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <label style={{ display: "block" }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--f5-text)", marginBottom: 6 }}>
          Email address
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="f5-input"
        />
      </label>

      <label style={{ display: "block" }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--f5-text)", marginBottom: 6 }}>
          Last name or unit number
        </span>
        <input
          name="check"
          type="text"
          required
          placeholder="e.g. Okafor or 204"
          className="f5-input"
        />
        <span style={{ display: "block", fontSize: 11.5, color: "var(--f5-text-muted)", marginTop: 6 }}>
          We use this to confirm it&apos;s you.
        </span>
      </label>

      {state.error && (
        <div
          role="alert"
          style={{
            fontSize: 13,
            color: "var(--f5-red, #ef4444)",
            background: "color-mix(in srgb, var(--f5-red, #ef4444) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--f5-red, #ef4444) 30%, transparent)",
            borderRadius: 8,
            padding: "10px 12px",
          }}
        >
          {state.error}
        </div>
      )}

      <button type="submit" className="f5-btn primary" disabled={pending} style={{ width: "100%", padding: 12, fontSize: 15, justifyContent: "center" }}>
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
