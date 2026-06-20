"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ImpersonateTarget } from "@/lib/platform";
import { impersonateUser } from "./impersonation-actions";

const fg = "var(--f5-text)";
const dim = "var(--f5-text-muted)";

export function ImpersonationPanel({ targets, canImpersonate }: { targets: ImpersonateTarget[]; canImpersonate: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const providers = Array.from(new Set(targets.map((t) => t.provider)));
  function go(t: ImpersonateTarget) {
    setError(null);
    start(async () => {
      const r = await impersonateUser({ name: t.name, roleLabel: t.roleLabel, provider: t.provider });
      if (!r.ok) { setError(r.error ?? "Could not impersonate."); return; }
      router.refresh();
    });
  }

  return (
    <>
      <div className="f5-card" style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.35)" }}>
        <div style={{ fontWeight: 700, color: fg }}>⚠️ Impersonation Mode</div>
        <div style={{ fontSize: 12, color: "var(--f5-text-secondary)", marginTop: 4 }}>
          When impersonating, you see exactly what that user sees — same data scope. Your actions are logged under your real identity. Only Super Admin and Support L3 can impersonate.
        </div>
      </div>

      {!canImpersonate && <div style={{ color: "var(--f5-red,#f87171)", fontSize: 13, marginTop: 12 }}>Your role cannot impersonate users.</div>}
      {error && <div style={{ color: "var(--f5-red,#f87171)", fontSize: 13, marginTop: 12 }}>{error}</div>}

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", marginTop: 14 }}>
        {providers.map((prov) => {
          const users = targets.filter((t) => t.provider === prov);
          const color = users[0]?.providerColor ?? "#009999";
          return (
            <div key={prov} className="f5-card">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11 }}>{prov.slice(0, 2).toUpperCase()}</span>
                <div><div style={{ fontWeight: 700, color: fg }}>{prov}</div><div style={{ fontSize: 11, color: dim }}>{users.length} users</div></div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                {users.map((u) => (
                  <button key={u.id} type="button" className="f5-btn" disabled={!canImpersonate || pending} onClick={() => go(u)} style={{ justifyContent: "flex-start", fontSize: 12, padding: "6px 10px" }}>
                    <span style={{ color }}>{u.roleLabel}</span>&nbsp;— {u.name}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
