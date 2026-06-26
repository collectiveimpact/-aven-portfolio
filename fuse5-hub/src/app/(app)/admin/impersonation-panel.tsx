"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ImpersonateTarget } from "@/lib/platform";
import { impersonateUser, exitImpersonation, getActiveImpersonation, type ImpersonationState } from "./impersonation-actions";

const fg = "var(--f5-text)";
const dim = "var(--f5-text-muted)";

function targetId(t: ImpersonateTarget): string {
  return t.id ?? `${t.provider}:${t.name}`;
}

export function ImpersonationPanel({ targets, canImpersonate }: { targets: ImpersonateTarget[]; canImpersonate: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<ImpersonationState | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Pull the live "viewing as" target so the grid can highlight it and show the
  // inline confirmation (the persistent banner is rendered app-wide by the layout).
  useEffect(() => {
    let alive = true;
    getActiveImpersonation().then((s) => { if (alive) setActive(s); });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter((t) =>
      [t.name, t.email, t.roleLabel, t.provider].some((v) => v?.toLowerCase().includes(q))
    );
  }, [targets, query]);

  const providers = useMemo(() => Array.from(new Set(filtered.map((t) => t.provider))), [filtered]);

  function go(t: ImpersonateTarget) {
    setError(null);
    setBusyId(targetId(t));
    start(async () => {
      const r = await impersonateUser({ id: targetId(t), name: t.name, email: t.email, roleLabel: t.roleLabel, provider: t.provider });
      setBusyId(null);
      if (!r.ok) { setError(r.error ?? "Could not impersonate."); return; }
      setActive({ id: targetId(t), name: t.name, email: t.email, roleLabel: t.roleLabel, provider: t.provider });
      router.refresh();
    });
  }

  function exit() {
    setError(null);
    start(async () => {
      await exitImpersonation();
      setActive(null);
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

      {/* Inline "viewing as" confirmation — mirrors the prototype banner, here in-panel. */}
      {active && (
        <div className="f5-card" style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12, background: "var(--f5-teal-soft, rgba(0,153,153,0.12))", border: "1px solid var(--f5-teal,#009999)" }}>
          <span style={{ fontSize: 18 }}>👁</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: fg }}>Now viewing as {active.name}</div>
            <div style={{ fontSize: 12, color: dim }}>{active.roleLabel} @ {active.provider}{active.email ? ` · ${active.email}` : ""}</div>
          </div>
          <button type="button" className="f5-btn" disabled={pending} onClick={exit} style={{ padding: "6px 12px", fontSize: 12 }}>
            {pending ? "Exiting…" : "✕ Exit Impersonation"}
          </button>
        </div>
      )}

      {/* Search */}
      <div style={{ marginTop: 14 }}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users by name, email, role, or provider…"
          className="f5-input"
          style={{ width: "100%", padding: "9px 12px", fontSize: 13, borderRadius: 10, background: "var(--f5-surface-2, rgba(0,0,0,0.04))", border: "1px solid var(--f5-border, rgba(0,0,0,0.12))", color: fg }}
        />
        <div style={{ fontSize: 11, color: dim, marginTop: 6 }}>{filtered.length} user{filtered.length === 1 ? "" : "s"} across {providers.length} provider{providers.length === 1 ? "" : "s"}</div>
      </div>

      {filtered.length === 0 ? (
        <div className="f5-card" style={{ marginTop: 14, color: dim, fontSize: 13 }}>No users match “{query}”.</div>
      ) : (
        <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", marginTop: 14 }}>
          {providers.map((prov) => {
            const users = filtered.filter((t) => t.provider === prov);
            const color = users[0]?.providerColor ?? "#009999";
            return (
              <div key={prov} className="f5-card">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 28, height: 28, borderRadius: 8, background: color, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 11 }}>{prov.slice(0, 2).toUpperCase()}</span>
                  <div><div style={{ fontWeight: 700, color: fg }}>{prov}</div><div style={{ fontSize: 11, color: dim }}>{users.length} user{users.length === 1 ? "" : "s"}</div></div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                  {users.map((u) => {
                    const id = targetId(u);
                    const isActive = active?.id === id;
                    const isBusy = busyId === id && pending;
                    return (
                      <button
                        key={id}
                        type="button"
                        className="f5-btn"
                        disabled={!canImpersonate || pending || isActive}
                        onClick={() => go(u)}
                        title={u.email}
                        style={{
                          justifyContent: "flex-start",
                          fontSize: 12,
                          padding: "6px 10px",
                          background: isActive ? "var(--f5-teal-soft, rgba(0,153,153,0.16))" : undefined,
                          border: isActive ? "1px solid var(--f5-teal,#009999)" : undefined,
                        }}
                      >
                        <span style={{ color }}>{u.roleLabel}</span>&nbsp;— {u.name}
                        {isActive && <span style={{ marginLeft: "auto", color: "var(--f5-teal,#009999)", fontWeight: 700 }}>● viewing</span>}
                        {isBusy && <span style={{ marginLeft: "auto", color: dim }}>…</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
