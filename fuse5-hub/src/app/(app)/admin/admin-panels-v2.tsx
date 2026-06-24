"use client";

import { useState, useTransition } from "react";
import {
  F5_ROLE_CARDS, F5_STAFF, ENV_EMOJI, SYSTEM_INTEGRATIONS,
  MASTER_TEMPLATES, TEMPLATE_CATEGORIES, TEMPLATE_STATS, CHANNEL_ICON,
  APPROVAL_QUEUE, APPROVAL_STAGES, CATEGORY_TIERS, TIER_META,
  COMPLIANCE_FRAMEWORKS, PROVIDER_COMPLIANCE, complianceBenchmark, BILLING_MRR, BILLING_SUMMARY,
  type ApprovalStatus, type ProviderCompliance,
} from "@/lib/platform-admin";
import { syncComplianceScores } from "./compliance-actions";
import type { SyncStatus } from "@/lib/compliance/agent";

const fg = "var(--f5-text)";
const dim = "var(--f5-text-muted)";
const soft = "var(--f5-bg-soft, rgba(255,255,255,0.03))";

/* ---------------- Fuse5 Roles (Layer 1) ---------------- */
export function FuseRolesPanel() {
  return (
    <>
      <div className="f5-page-sub" style={{ marginTop: -6, marginBottom: 14 }}>Layer 1 — internal Fuse5 team roles and platform staff.</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))" }}>
        {F5_ROLE_CARDS.map((r) => (
          <div key={r.key} className="f5-card" style={{ borderLeft: `3px solid ${r.color}` }}>
            <div style={{ fontWeight: 700, color: fg }}>{r.icon} {r.name}</div>
            <div style={{ fontSize: 12, color: dim, margin: "6px 0 10px" }}>{r.description}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>{r.chips.map((c) => <span key={c} className="f5-badge" style={{ fontSize: 10 }}>{c}</span>)}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="f5-section-title">Platform Users</div>
        <button className="f5-btn primary" type="button" style={{ padding: "5px 12px", fontSize: 12 }}>+ Add User</button>
      </div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Env Access</th><th>Last Login</th><th>Status</th></tr></thead>
          <tbody>
            {F5_STAFF.map((u) => (
              <tr key={u.email}>
                <td style={{ color: fg, fontWeight: 600 }}>{u.name}</td>
                <td style={{ color: dim }}>{u.email}</td>
                <td>{u.role}</td>
                <td style={{ fontSize: 15, letterSpacing: 2 }}>{u.envAccess.map((e) => ENV_EMOJI[e]).join("")}</td>
                <td style={{ color: dim }}>{u.lastLogin}</td>
                <td><span className="f5-badge ok">{u.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------------- Integrations (data sources) ---------------- */
export function IntegrationsAdminPanel() {
  return (
    <>
      <div className="f5-page-sub" style={{ marginTop: -6, marginBottom: 14 }}>Platform-wide data sources and connected services.</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))" }}>
        {SYSTEM_INTEGRATIONS.map((it) => (
          <div key={it.name} className="f5-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <div><div style={{ fontWeight: 700, color: fg }}>{it.name}</div><div style={{ fontSize: 12, color: dim, marginTop: 4 }}>{it.sub}</div></div>
              <span style={{ width: 8, height: 8, borderRadius: 99, background: it.tone === "ok" ? "var(--f5-green,#34d399)" : "#f59e0b", flexShrink: 0, marginTop: 6 }} />
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: "var(--f5-text-secondary)" }}>{it.status}</div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- Template Library ---------------- */
export function TemplateLibraryPanel() {
  const [cat, setCat] = useState<string>("All");
  const rows = MASTER_TEMPLATES.filter((t) => cat === "All" || t.category === cat);
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="f5-page-sub" style={{ marginTop: -6 }}>Master templates pushed to every provider. Mandatory ones cannot be edited by providers.</div>
        <button className="f5-btn primary" type="button" style={{ padding: "5px 12px", fontSize: 12 }}>+ New Template</button>
      </div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 14 }}>
        <div className="f5-card"><div className="f5-kpi-label">Master Templates</div><div className="f5-kpi-value">{TEMPLATE_STATS.master}</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Mandatory</div><div className="f5-kpi-value">{TEMPLATE_STATS.mandatory}</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Active Clones</div><div className="f5-kpi-value">{TEMPLATE_STATS.clones}</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Pending Updates</div><div className="f5-kpi-value">{TEMPLATE_STATS.pending}</div></div>
      </div>
      <div className="f5-chips" style={{ marginTop: 14 }}>
        {TEMPLATE_CATEGORIES.map((c) => <span key={c} className={`f5-chip${cat === c ? " active" : ""}`} onClick={() => setCat(c)}>{c}</span>)}
      </div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px,1fr))", marginTop: 12 }}>
        {rows.map((t) => (
          <div key={t.id} className="f5-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span className="f5-badge">MASTER</span>
              {t.mandatory && <span className="f5-badge" style={{ background: "rgba(239,68,68,0.15)", color: "#f87171" }}>REQUIRED</span>}
            </div>
            <div style={{ fontWeight: 700, color: fg, marginTop: 8 }}>{t.name}</div>
            <div style={{ fontSize: 12, color: dim, margin: "4px 0 10px" }}>{t.description}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", fontSize: 12, color: "var(--f5-text-secondary)" }}>
              <span className="f5-badge">{t.category}</span>
              <span>{t.channels.map((c) => CHANNEL_ICON[c] ?? c).join(" ")}</span>
              <span style={{ color: dim }}>v{t.version}</span>
              <span style={{ color: dim }}>· {t.lastUpdated}</span>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              <button className="f5-btn" type="button" style={{ fontSize: 12, padding: "4px 10px" }}>Push Update</button>
              <button className="f5-btn" type="button" style={{ fontSize: 12, padding: "4px 10px" }}>Clone</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ---------------- Approval Workflow ---------------- */
const STATUS_BADGE: Record<ApprovalStatus, string> = { draft: "f5-badge", submitted: "f5-badge warn", approved: "f5-badge ok", scheduled: "f5-badge", published: "f5-badge ok", rejected: "f5-badge" };
export function ApprovalWorkflowPanel() {
  const [provFilter, setProvFilter] = useState("All");
  const counts = Object.fromEntries(APPROVAL_STAGES.map((s) => [s.key, APPROVAL_QUEUE.filter((q) => q.status === s.key).length]));
  const providers = ["All", ...Array.from(new Set(APPROVAL_QUEUE.map((q) => q.provider)))];
  const rows = APPROVAL_QUEUE.filter((q) => provFilter === "All" || q.provider === provFilter);
  const tierOf = (catKey: string) => CATEGORY_TIERS.find((c) => c.key === catKey);

  return (
    <>
      <div className="f5-page-sub" style={{ marginTop: -6, marginBottom: 14 }}>Content lifecycle from draft to published, with category-sensitivity routing.</div>

      {/* pipeline */}
      <div style={{ display: "flex", alignItems: "stretch", gap: 8, flexWrap: "wrap" }}>
        {APPROVAL_STAGES.map((s, i) => (
          <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="f5-card" style={{ minWidth: 110, textAlign: "center", padding: "12px 10px" }}>
              <div className="f5-kpi-value" style={{ fontSize: 26 }}>{counts[s.key] ?? 0}</div>
              <div style={{ fontSize: 11, color: dim, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
            </div>
            {i < APPROVAL_STAGES.length - 1 && <span style={{ color: "var(--f5-text-dim)", fontSize: 18 }}>→</span>}
          </div>
        ))}
      </div>

      {/* approval rules */}
      <div className="f5-section-title">Approval Rules</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        {[{ p: "WoodGreen", r: "2-level approval · Manager + Admin sign-off" }, { p: "HNHC", r: "1-level · Provider Admin" }, { p: "Kiwanis", r: "1-level · Provider Admin" }].map((x) => (
          <div key={x.p} className="f5-card"><div style={{ fontWeight: 700, color: fg }}>{x.p}</div><div style={{ fontSize: 12, color: dim, marginTop: 4 }}>{x.r}</div></div>
        ))}
      </div>

      {/* category sensitivity */}
      <div className="f5-section-title">Category Sensitivity</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        {([1, 2, 3] as const).map((tier) => {
          const m = TIER_META[tier];
          const cats = CATEGORY_TIERS.filter((c) => c.tier === tier);
          return (
            <div key={tier} className="f5-card" style={{ borderTop: `2px solid ${m.color}` }}>
              <div style={{ fontWeight: 700, color: m.color, fontSize: 13 }}>{m.icon} {m.text}</div>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {cats.map((c) => <div key={c.key} style={{ fontSize: 12, color: "var(--f5-text-secondary)" }}>{c.icon} {c.label}</div>)}
              </div>
            </div>
          );
        })}
      </div>

      {/* active queue */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div className="f5-section-title" style={{ margin: 0 }}>Active Queue</div>
        <select className="f5-select" value={provFilter} onChange={(e) => setProvFilter(e.target.value)} style={{ maxWidth: 180 }}>
          {providers.map((p) => <option key={p}>{p}</option>)}
        </select>
      </div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden", marginTop: 10 }}>
        <table className="f5-table">
          <thead><tr><th>Message</th><th>Provider</th><th>Category</th><th>Status</th><th>By</th><th>Scheduled</th><th>Reach</th></tr></thead>
          <tbody>
            {rows.map((q) => {
              const t = tierOf(q.category);
              return (
                <tr key={q.id}>
                  <td style={{ color: fg }}>{q.title}{q.rejectionNote && <div style={{ fontSize: 11, color: "#f87171" }}>✕ {q.rejectionNote}</div>}</td>
                  <td>{q.provider}</td>
                  <td>{t ? <span style={{ color: t.color }}>{t.icon} {t.label}</span> : q.category}</td>
                  <td><span className={STATUS_BADGE[q.status]} style={q.status === "rejected" ? { background: "rgba(239,68,68,0.15)", color: "#f87171" } : undefined}>{q.status}</span></td>
                  <td style={{ color: dim }}>{q.createdBy}</td>
                  <td style={{ color: dim }}>{q.scheduledFor ?? "—"}</td>
                  <td>{q.recipients.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------------- Compliance Settings ---------------- */
const GROUP_LABEL: Record<string, string> = { "high-risk": "High Risk", "moderate-risk": "Moderate Risk", "cosmetic": "Cosmetic" };
const GROUP_COLOR: Record<string, string> = { "high-risk": "#f87171", "moderate-risk": "#f59e0b", "cosmetic": "var(--f5-text-muted)" };
// Colour a score against a framework's green/yellow thresholds.
function scoreColor(score: number | null, frameworkId: string): string {
  if (score == null) return dim;
  const f = COMPLIANCE_FRAMEWORKS.find((x) => x.id === frameworkId);
  const green = f?.thresholds.green ?? 85, yellow = f?.thresholds.yellow ?? 60;
  return score >= green ? "var(--f5-green,#34d399)" : score >= yellow ? "#f59e0b" : "var(--f5-red,#f87171)";
}
function ScoreCell({ score, frameworkId, benchmark }: { score: number | null; frameworkId: string; benchmark: number | null }) {
  if (score == null) return <span style={{ color: dim }}>N/A</span>;
  const delta = benchmark != null ? score - benchmark : null;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontWeight: 700, color: scoreColor(score, frameworkId) }}>{score}</span>
      <span style={{ width: 60, height: 5, borderRadius: 99, background: "var(--f5-border)", display: "inline-block", position: "relative" }}>
        <span style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${score}%`, maxWidth: "100%", borderRadius: 99, background: scoreColor(score, frameworkId) }} />
      </span>
      {delta != null && <span style={{ fontSize: 11, color: delta >= 0 ? "var(--f5-green,#34d399)" : "var(--f5-red,#f87171)" }}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}</span>}
    </span>
  );
}
const SYNC_DOT: Record<SyncStatus, string> = { ok: "var(--f5-green,#34d399)", partial: "#f59e0b", no_feed: "var(--f5-text-muted)", error: "var(--f5-red,#f87171)" };
export function ComplianceSettingsPanel() {
  const fwName = (id: string) => COMPLIANCE_FRAMEWORKS.find((f) => f.id === id)?.name ?? id;
  const [pending, startTransition] = useTransition();
  // Live scores pulled by the agent this session: key `${provider}|${framework}` → {score,status}.
  const [live, setLive] = useState<Map<string, { score: number | null; status: SyncStatus }>>(new Map());
  const [syncedAt, setSyncedAt] = useState<string | null>(null);
  const [syncErr, setSyncErr] = useState<string | null>(null);
  const [syncMeta, setSyncMeta] = useState<string | null>(null);

  function runSync() {
    setSyncErr(null);
    startTransition(async () => {
      const r = await syncComplianceScores();
      if (!r.ok || !r.summary) { setSyncErr(r.error ?? "Sync failed."); return; }
      const m = new Map<string, { score: number | null; status: SyncStatus }>();
      for (const res of r.summary.results) m.set(`${res.provider}|${res.framework}`, { score: res.score, status: res.status });
      setLive(m); setSyncedAt(r.summary.syncedAt);
      const portfolio = r.summary.results.filter((x) => x.addressSource === "portfolio");
      const buildings = portfolio.reduce((n, x) => n + x.matched, 0);
      setSyncMeta(portfolio.length ? `${portfolio.map((x) => x.provider).join(", ")} scored from ${buildings} live portfolio building${buildings === 1 ? "" : "s"}` : null);
    });
  }
  // Provider rows with live overrides applied (falls back to the manual baseline).
  const liveScore = (p: ProviderCompliance, fw: "rentsafeto" | "hamilton-sab", base: number | null) =>
    live.get(`${p.provider}|${fw}`)?.score ?? base;
  const rows: ProviderCompliance[] = PROVIDER_COMPLIANCE.map((p) => ({
    ...p,
    rentSafeScore: liveScore(p, "rentsafeto", p.rentSafeScore),
    hamiltonScore: liveScore(p, "hamilton-sab", p.hamiltonScore),
  }));
  const bench = complianceBenchmark(rows);
  const statusOf = (provider: string, fw: string): SyncStatus | null => live.get(`${provider}|${fw}`)?.status ?? null;

  return (
    <>
      <div className="f5-page-sub" style={{ marginTop: -6, marginBottom: 14 }}>Compliance frameworks and per-provider assignment.</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        {COMPLIANCE_FRAMEWORKS.map((f) => (
          <div key={f.id} className="f5-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 700, color: fg }}>{f.name}</div>
              <span className="f5-badge">{f.jurisdiction}</span>
            </div>
            <div style={{ fontSize: 12, color: dim, margin: "6px 0 10px" }}>{f.description}</div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 12 }}>
              <span style={{ color: dim }}>Green ≥</span><span>{f.thresholds.green} · {f.evalCycle.green}</span>
              <span style={{ color: dim }}>Yellow ≥</span><span>{f.thresholds.yellow} · {f.evalCycle.yellow}</span>
              <span style={{ color: dim }}>Red</span><span>{f.evalCycle.red}</span>
            </div>
            {f.signageRequired && <div style={{ marginTop: 10, fontSize: 12, color: "#f59e0b" }}>⚠ Colour-coded lobby signage required by {f.signageDeadline}</div>}
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              {f.categoryGroups.map((g) => <span key={g.group} className="f5-badge" style={{ color: GROUP_COLOR[g.group] }}>{GROUP_LABEL[g.group]}: {g.count} ({g.weight}%)</span>)}
            </div>
          </div>
        ))}
      </div>

      <div className="f5-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>Provider Score Benchmark</span>
        <button className="f5-btn primary" onClick={runSync} disabled={pending} style={{ fontSize: 12, padding: "6px 12px" }}>
          {pending ? "Syncing…" : "⟳ Sync from Open Data"}
        </button>
      </div>
      <div className="f5-page-sub" style={{ marginTop: -6, marginBottom: 6 }}>Audit scores auto-pulled per provider portfolio; platform average is the benchmark each provider is measured against.</div>
      <div style={{ fontSize: 11, color: "var(--f5-text-dim)", marginBottom: 12 }}>
        {syncErr ? <span style={{ color: "var(--f5-red)" }}>⚠ {syncErr}</span>
          : syncedAt ? <>✓ Live — synced {new Date(syncedAt).toLocaleString()}{syncMeta ? ` · ${syncMeta}` : ""} · Source: City of Toronto Open Data (RentSafeTO, ArcGIS) · Hamilton SAB: manual until a public feed is connected</>
          : <>Showing last-known scores. Click <strong>Sync from Open Data</strong> to pull live RentSafeTO scores from City of Toronto. A scheduled agent (/api/agents/compliance-sync) can auto-pull daily.</>}
      </div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="f5-card">
          <div className="f5-kpi-label">RentSafeTO — platform avg</div>
          <div className="f5-kpi-value" style={{ color: scoreColor(bench.rentSafe, "rentsafeto") }}>{bench.rentSafe ?? "—"}{bench.rentSafe != null ? "" : ""}</div>
          <div className="f5-kpi-sub">benchmark across providers</div>
        </div>
        <div className="f5-card">
          <div className="f5-kpi-label">Hamilton SAB — platform avg</div>
          <div className="f5-kpi-value" style={{ color: scoreColor(bench.hamilton, "hamilton-sab") }}>{bench.hamilton ?? "—"}</div>
          <div className="f5-kpi-sub">benchmark across providers</div>
        </div>
        <div className="f5-card">
          <div className="f5-kpi-label">Providers reporting</div>
          <div className="f5-kpi-value">{rows.length}</div>
          <div className="f5-kpi-sub">{rows.filter((p) => p.enabled).length} active assignments</div>
        </div>
      </div>

      <div className="f5-section-title">Provider Framework Assignment &amp; Scores</div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead><tr><th>Provider</th><th>Properties</th><th>Tier</th><th>Primary Framework</th><th>RentSafeTO Score</th><th>Hamilton SAB Score</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((p) => { const rsStatus = statusOf(p.provider, "rentsafeto"); const hStatus = statusOf(p.provider, "hamilton-sab"); return (
              <tr key={p.provider}>
                <td style={{ color: fg, fontWeight: 600 }}>{p.provider}</td>
                <td>{p.properties}</td>
                <td><span className="f5-badge">{p.tier}</span></td>
                <td>{fwName(p.framework)}</td>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    {rsStatus && <span title={`live: ${rsStatus}`} style={{ width: 7, height: 7, borderRadius: 99, background: SYNC_DOT[rsStatus], display: "inline-block" }} />}
                    <ScoreCell score={p.rentSafeScore} frameworkId="rentsafeto" benchmark={bench.rentSafe} />
                  </span>
                </td>
                <td>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                    {hStatus && <span title={`live: ${hStatus}`} style={{ width: 7, height: 7, borderRadius: 99, background: SYNC_DOT[hStatus], display: "inline-block" }} />}
                    <ScoreCell score={p.hamiltonScore} frameworkId="hamilton-sab" benchmark={bench.hamilton} />
                  </span>
                </td>
                <td><span className={`f5-badge ${p.enabled ? "ok" : "warn"}`}>{p.enabled ? "Enabled" : "Disabled"}</span></td>
              </tr>
            ); })}
            <tr style={{ borderTop: "2px solid var(--f5-border)" }}>
              <td style={{ color: dim, fontWeight: 700 }}>Platform benchmark</td>
              <td colSpan={3} style={{ color: dim, fontSize: 12 }}>average across reporting providers</td>
              <td style={{ fontWeight: 700, color: scoreColor(bench.rentSafe, "rentsafeto") }}>{bench.rentSafe ?? "—"}</td>
              <td style={{ fontWeight: 700, color: scoreColor(bench.hamilton, "hamilton-sab") }}>{bench.hamilton ?? "—"}</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 8 }}>▲/▼ shows each provider&apos;s gap to the platform benchmark. Scores colour against each framework&apos;s green (≥{COMPLIANCE_FRAMEWORKS.find((f) => f.id === "rentsafeto")?.thresholds.green}) / yellow thresholds. N/A = framework not assigned to that provider&apos;s jurisdiction.</div>
    </>
  );
}

/* ---------------- Billing — platform MRR (used by enriched BillingPanel) ---------------- */
export function PlatformBillingTable() {
  return (
    <>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="f5-card"><div className="f5-kpi-label">Monthly Recurring</div><div className="f5-kpi-value">${BILLING_SUMMARY.mrr.toLocaleString()}</div><div className="f5-kpi-sub">MRR across providers</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Annual Run Rate</div><div className="f5-kpi-value">${BILLING_SUMMARY.arr.toLocaleString()}</div><div className="f5-kpi-sub">ARR</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Hardware Units</div><div className="f5-kpi-value">{BILLING_SUMMARY.units}</div><div className="f5-kpi-sub">players deployed</div></div>
      </div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden", marginTop: 14 }}>
        <table className="f5-table">
          <thead><tr><th>Provider</th><th>Tier</th><th>MRR</th><th>Properties</th><th>Players</th><th>Renewal</th><th>Status</th></tr></thead>
          <tbody>
            {BILLING_MRR.map((b) => (
              <tr key={b.provider}>
                <td style={{ color: fg, fontWeight: 600 }}>{b.provider}</td>
                <td><span className="f5-badge">{b.tier}</span></td>
                <td style={{ color: fg }}>{b.mrr ? `$${b.mrr.toLocaleString()}/mo` : "$0 (Pilot)"}</td>
                <td>{b.properties}</td>
                <td>{b.players}</td>
                <td style={{ color: dim }}>{b.renewal}</td>
                <td><span className={`f5-badge ${b.status === "Active" ? "ok" : "warn"}`}>{b.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
