"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MODULE_BY_KEY, DEFAULT_ENABLED, resolveEnabled } from "@/lib/modules";
import { TIERS, TIER_ORDER, modulesForTier, tierFromModules, type TierKey } from "@/lib/tiers";
import { saveEnabledModules } from "./module-actions";

const dim = "var(--f5-text-muted)";
const teal = "var(--f5-teal,#00CCCC)";

const labelFor = (k: string) => MODULE_BY_KEY[k]?.label ?? k;

// Commercial plan selector. Picking a tier sets the org's enabled modules to that
// tier's resolved set by calling the existing saveEnabledModules. We show what each
// tier ADDS / REMOVES versus what's live right now, and confirm before applying
// (this changes which modules every user sees).
export function TierPanel({ initial, canEdit }: { initial: string[] | null; canEdit: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState<TierKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<TierKey | null>(null);

  // What's live now: the stored override, or the resolved default starter set.
  const current = useMemo(
    () => new Set(resolveEnabled(initial ?? DEFAULT_ENABLED)),
    [initial],
  );
  const currentTier = useMemo(() => tierFromModules([...current]), [current]);

  // For a tier: which modules it would add vs remove relative to current.
  const diffFor = (tier: TierKey) => {
    const next = new Set(modulesForTier(tier));
    const added = [...next].filter((k) => !current.has(k));
    const removed = [...current].filter((k) => !next.has(k));
    return { next, added, removed };
  };

  const apply = (tier: TierKey) => {
    setError(null);
    setConfirming(null);
    start(async () => {
      const r = await saveEnabledModules(modulesForTier(tier));
      if (!r.ok) { setError(r.error ?? "Could not apply tier."); return; }
      setSaved(tier);
      router.refresh();
    });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div className="f5-section-title" style={{ margin: 0 }}>Plans &amp; Tiers</div>
          <div style={{ fontSize: 12.5, color: dim }}>
            Choose a commercial tier. Applying a tier sets the modules that are live for this account.{" "}
            {currentTier
              ? <>Current plan: <strong style={{ color: "var(--f5-text)" }}>{TIERS[currentTier].label}</strong>.</>
              : <>Current plan: <strong style={{ color: "var(--f5-text)" }}>Custom</strong> (module set doesn’t match a standard tier).</>}
          </div>
        </div>
        {saved && <span style={{ color: "var(--f5-green,#34d399)", fontSize: 12 }}>Applied {TIERS[saved].label} ✓</span>}
      </div>
      {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 8 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14, marginTop: 16 }}>
        {TIER_ORDER.map((key) => {
          const t = TIERS[key];
          const isCurrent = currentTier === key;
          const { added, removed } = diffFor(key);
          const moduleCount = modulesForTier(key).length;
          return (
            <div key={key} className="f5-card"
              style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10,
                border: isCurrent ? `1px solid ${teal}` : "1px solid var(--f5-border)",
                boxShadow: isCurrent ? `0 0 0 1px ${teal} inset` : undefined }}>
              {/* header */}
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 16, color: "var(--f5-text)" }}>{t.label}</span>
                {isCurrent && <span className="f5-badge" style={{ fontSize: 10, color: teal }}>current plan</span>}
              </div>
              <div style={{ fontSize: 12, color: dim, marginTop: -4 }}>{t.tagline}</div>

              {/* price */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 24, fontWeight: 800, color: "var(--f5-text)" }}>{t.monthlyLabel.split("/")[0]}</span>
                <span style={{ fontSize: 12, color: dim }}>/mo</span>
              </div>
              <div style={{ fontSize: 11.5, color: dim, marginTop: -6 }}>{t.implLabel}</div>

              {/* facts */}
              <ul style={{ listStyle: "none", margin: "4px 0 0", padding: 0, display: "grid", gap: 4 }}>
                {[t.messagesLabel, t.support, t.templatesLabel, t.signageLabel].map((f) => (
                  <li key={f} style={{ fontSize: 12, color: "var(--f5-text-secondary)" }}>
                    <span style={{ color: teal, marginRight: 6 }}>·</span>{f}
                  </li>
                ))}
              </ul>

              {/* highlights */}
              <div style={{ borderTop: "1px solid var(--f5-border)", paddingTop: 8, marginTop: 2 }}>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 3 }}>
                  {t.highlights.map((h) => (
                    <li key={h} style={{ fontSize: 12, color: "var(--f5-text-secondary)" }}>
                      <span style={{ color: "var(--f5-green,#34d399)", marginRight: 6 }}>✓</span>{h}
                    </li>
                  ))}
                </ul>
              </div>

              {/* AI agents */}
              <div>
                <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: dim, marginBottom: 4 }}>AI Agents</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {t.agents.map((a) => (
                    <span key={a.key} className="f5-badge" style={{ fontSize: 10 }}>{a.label}</span>
                  ))}
                </div>
              </div>

              {/* module count + diff vs current */}
              <div style={{ fontSize: 11.5, color: dim }}>
                Activates <strong style={{ color: "var(--f5-text)" }}>{moduleCount}</strong> modules.
                {!isCurrent && (added.length > 0 || removed.length > 0) && (
                  <div style={{ marginTop: 4, display: "grid", gap: 2 }}>
                    {added.length > 0 && (
                      <div style={{ color: "var(--f5-green,#34d399)" }}>
                        + Adds: {added.map(labelFor).join(", ")}
                      </div>
                    )}
                    {removed.length > 0 && (
                      <div style={{ color: "var(--f5-red,#f87171)" }}>
                        − Removes: {removed.map(labelFor).join(", ")}
                      </div>
                    )}
                  </div>
                )}
                {isCurrent && <div style={{ marginTop: 4, color: teal }}>No change — this matches your live modules.</div>}
              </div>

              {/* action */}
              <div style={{ marginTop: "auto", paddingTop: 6 }}>
                {confirming === key ? (
                  <div style={{ display: "grid", gap: 6 }}>
                    <div style={{ fontSize: 11.5, color: dim }}>
                      Apply <strong style={{ color: "var(--f5-text)" }}>{t.label}</strong>? This changes which modules are live for everyone.
                      {removed.length > 0 && <> {removed.length} module{removed.length > 1 ? "s" : ""} will be turned off.</>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button className="f5-btn primary" onClick={() => apply(key)} disabled={pending} style={{ flex: 1 }}>
                        {pending ? "Applying…" : "Confirm"}
                      </button>
                      <button className="f5-btn" onClick={() => setConfirming(null)} disabled={pending}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button className="f5-btn primary" style={{ width: "100%" }}
                    disabled={!canEdit || isCurrent || pending}
                    onClick={() => { setSaved(null); setConfirming(key); }}
                    title={!canEdit ? "Only admins can change the plan" : isCurrent ? "Already on this plan" : ""}>
                    {isCurrent ? "Current plan" : `Apply ${t.label}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 11.5, color: dim, marginTop: 14 }}>
        Applying a tier writes its module set through the same activation engine as the <strong>Modules</strong> panel — dependencies and always-on core modules are folded in automatically. You can still fine-tune individual modules afterward in <strong>Modules</strong>; doing so moves the account to a <strong>Custom</strong> plan.
      </div>
    </div>
  );
}
