"use client";

import { useActionState, useEffect, useRef } from "react";
import { submitRequest, type RequestState } from "../actions";

const CATEGORIES = [
  "Plumbing", "Heating / Cooling", "Electrical", "Appliance",
  "Pest control", "Doors / Locks", "Common area", "Other",
];

const initial: RequestState = {};

export function RequestForm() {
  const [state, action, pending] = useActionState(submitRequest, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="f5-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <div style={{ fontWeight: 700, color: "var(--f5-text)" }}>Report an issue</div>
        <div style={{ color: "var(--f5-text-muted)", fontSize: 12.5, marginTop: 2 }}>
          We&apos;ll send this to your property team and track it below.
        </div>
      </div>

      <label style={{ display: "block" }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--f5-text)", marginBottom: 6 }}>Category</span>
        <select name="category" className="f5-select" defaultValue="Plumbing">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      <label style={{ display: "block" }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--f5-text)", marginBottom: 6 }}>What&apos;s happening?</span>
        <textarea
          name="description"
          required
          rows={4}
          placeholder="Describe the issue — where it is, when it started, anything that helps."
          className="f5-textarea"
        />
      </label>

      <label style={{ display: "block" }}>
        <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--f5-text)", marginBottom: 6 }}>
          Photo link <span style={{ fontWeight: 400, color: "var(--f5-text-muted)" }}>(optional)</span>
        </span>
        <input name="photoUrl" type="url" placeholder="https://… link to a photo" className="f5-input" />
      </label>

      {state.error && (
        <div role="alert" style={{ fontSize: 13, color: "var(--f5-red, #ef4444)" }}>{state.error}</div>
      )}
      {state.ok && (
        <div
          role="status"
          style={{
            fontSize: 13, color: "var(--f5-teal)",
            background: "var(--f5-teal-subtle)", border: "1px solid var(--f5-teal-border)",
            borderRadius: 8, padding: "10px 12px",
          }}
        >
          Thanks — your request has been submitted. You can track it below.
        </div>
      )}

      <button type="submit" className="f5-btn primary" disabled={pending} style={{ justifyContent: "center", padding: 11 }}>
        {pending ? "Submitting…" : "Submit request"}
      </button>
    </form>
  );
}
