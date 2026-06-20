"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { exitImpersonation } from "./impersonation-actions";

// Persistent top banner shown app-wide while impersonating (prototype parity).
export function ImpersonationBanner({ name, roleLabel, provider }: { name: string; roleLabel: string; provider: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function exit() {
    start(async () => { await exitImpersonation(); router.refresh(); });
  }
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, padding: "8px 16px", background: "var(--f5-gradient-warm, #FFB066)", color: "#1a1206", fontSize: 13, fontWeight: 600 }}>
      <span>⚠️ Viewing as: <strong>{name}</strong> · {roleLabel} @ {provider}</span>
      <button onClick={exit} disabled={pending} className="f5-btn" style={{ padding: "3px 12px", fontSize: 12, background: "rgba(0,0,0,0.18)", border: "1px solid rgba(0,0,0,0.25)", color: "#1a1206" }}>
        {pending ? "Exiting…" : "✕ Exit Impersonation"}
      </button>
    </div>
  );
}
