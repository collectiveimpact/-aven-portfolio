"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MODULES, MODULE_GROUPS, MODULE_BY_KEY, DEFAULT_ENABLED, resolveEnabled, type ModuleDef } from "@/lib/modules";
import { saveEnabledModules } from "./module-actions";

const dim = "var(--f5-text-muted)";
const teal = "var(--f5-teal,#00CCCC)";

// Activate / deactivate modules for the account. Toggling a module on auto-includes
// what it needs (interconnections shown inline); core modules stay on. The sidebar
// reflects the result for everyone whose role may view each module.
export function ModulesPanel({ initial, canEdit }: { initial: string[] | null; canEdit: boolean }) {
  const router = useRouter();
  const [chosen, setChosen] = useState<Set<string>>(new Set(initial ?? DEFAULT_ENABLED));
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const effective = resolveEnabled(chosen);                 // what's actually active after deps + core
  const requiredBy = (key: string) => MODULES.filter((m) => effective.has(m.key) && m.requires.includes(key)).map((m) => m.key);

  const toggle = (m: ModuleDef) => {
    if (m.core || !canEdit) return;
    setSaved(false);
    setChosen((cur) => { const x = new Set(cur); x.has(m.key) ? x.delete(m.key) : x.add(m.key); return x; });
  };
  const save = () => {
    setError(null);
    start(async () => {
      const r = await saveEnabledModules([...chosen]);
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setSaved(true); router.refresh();
    });
  };
  const reset = () => { setSaved(false); setChosen(new Set(DEFAULT_ENABLED)); };

  const activeCount = MODULES.filter((m) => effective.has(m.key)).length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div className="f5-section-title" style={{ margin: 0 }}>Modules</div>
          <div style={{ fontSize: 12.5, color: dim }}>Turn functionality on as you need it. {activeCount} of {MODULES.length} active. Deactivated modules are hidden from the sidebar for everyone.</div>
        </div>
        {canEdit && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {saved && <span style={{ color: "var(--f5-green,#34d399)", fontSize: 12 }}>Saved ✓</span>}
            <button className="f5-btn" onClick={reset} disabled={pending}>Light starter set</button>
            <button className="f5-btn primary" onClick={save} disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          </div>
        )}
      </div>
      {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 8 }}>{error}</div>}

      {MODULE_GROUPS.map((group) => (
        <div key={group} style={{ marginTop: 16 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.8, color: dim, marginBottom: 6 }}>{group}</div>
          <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
            {MODULES.filter((m) => m.group === group).map((m, i) => {
              const on = effective.has(m.key);
              const explicit = chosen.has(m.key);
              const autoOn = on && !explicit && !m.core;          // pulled in by a dependency
              const deps = requiredBy(m.key).filter((k) => k !== m.key);
              return (
                <div key={m.key} style={{ display: "flex", gap: 12, padding: "11px 14px", borderTop: i ? "1px solid var(--f5-border)" : "none", alignItems: "flex-start", opacity: on ? 1 : 0.62 }}>
                  {/* switch */}
                  <button onClick={() => toggle(m)} disabled={m.core || !canEdit} title={m.core ? "Always on" : ""}
                    style={{ flexShrink: 0, width: 38, height: 22, borderRadius: 999, border: "none", cursor: m.core || !canEdit ? "default" : "pointer", position: "relative", background: on ? teal : "var(--f5-surface-2)", transition: "background .15s" }}>
                    <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: 999, background: "#fff", transition: "left .15s" }} />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600, color: "var(--f5-text)" }}>{m.ico} {m.label}</span>
                      {m.core && <span className="f5-badge" style={{ fontSize: 10 }}>always on</span>}
                      {m.foundational && <span className="f5-badge warn" style={{ fontSize: 10 }}>foundational</span>}
                      {autoOn && <span className="f5-badge" style={{ fontSize: 10, color: teal }}>auto · required by {deps.join(", ")}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: dim, marginTop: 2 }}>{m.description}</div>
                    <div style={{ fontSize: 11, color: dim, marginTop: 3 }}>
                      {m.requires.length > 0 && <>Needs: {m.requires.map((r) => MODULE_BY_KEY[r]?.label ?? r).join(", ")}. </>}
                      {deps.length > 0 && <>Used by: {deps.map((r) => MODULE_BY_KEY[r]?.label ?? r).join(", ")}.</>}
                      {m.requires.length === 0 && deps.length === 0 && <>Standalone — no dependencies.</>}
                    </div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {m.roles.length >= 7 ? <span className="f5-badge" style={{ fontSize: 10 }}>all roles</span> : <span className="f5-badge" style={{ fontSize: 10 }} title={m.roles.join(", ")}>{m.roles.length} roles</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div style={{ fontSize: 11.5, color: dim, marginTop: 14 }}>
        Two gates control visibility: <strong>activation</strong> (this panel, per account) and <strong>role permission</strong> (the “roles” badge — who may view each module). A module shows only when both pass. Turning a module on automatically activates what it needs.
      </div>
    </div>
  );
}
