"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Demo login. With the backend connected this calls Supabase Auth
// (signInWithPassword); in demo mode it just enters the app.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("clinton@fuse5.ca");

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", zIndex: 1 }}>
      <div className="f5-card" style={{ width: 360, maxWidth: "90vw", padding: "32px 28px" }}>
        <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: "-0.5px" }}>
          fuse<span style={{ color: "var(--f5-teal)" }}>5</span> Hub
        </div>
        <div style={{ fontSize: 10, letterSpacing: 2, textTransform: "uppercase", color: "var(--f5-text-muted)", marginBottom: 18 }}>
          Tenant Communications
        </div>
        <form onSubmit={(e) => { e.preventDefault(); router.push("/"); }}>
          <label className="f5-label">Work email</label>
          <input className="f5-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="f5-label">Password</label>
          <input className="f5-input" type="password" defaultValue="demo" />
          <button type="submit" className="f5-btn primary" style={{ width: "100%", marginTop: 18, justifyContent: "center" }}>
            Sign In
          </button>
        </form>
        <div style={{ fontSize: 11, color: "var(--f5-text-dim)", marginTop: 14, textAlign: "center" }}>
          Demo environment — any email, password <strong>demo</strong>.
        </div>
      </div>
    </div>
  );
}
