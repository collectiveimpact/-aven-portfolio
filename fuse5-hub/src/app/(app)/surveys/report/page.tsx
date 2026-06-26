import Link from "next/link";
import { SAMPLE_REPORT, SECTOR_BENCHMARK } from "@/lib/surveys/resident-satisfaction";
import { PrintButton } from "./print-button";

const dim = "var(--f5-text-muted)";
const R = SAMPLE_REPORT;

function changeColor(n: number) { return n > 0 ? "var(--f5-green,#34d399)" : n < 0 ? "var(--f5-red,#f87171)" : dim; }
function bar(pct: number) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, borderRadius: 999, background: "var(--f5-surface-2)", overflow: "hidden", minWidth: 70 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--f5-gradient-teal,var(--f5-teal))" }} />
      </div>
      <span style={{ fontSize: 12, minWidth: 34, textAlign: "right", color: "var(--f5-text)" }}>{pct}%</span>
    </div>
  );
}
function H({ n, children }: { n: number; children: React.ReactNode }) {
  return <div className="f5-section-title" style={{ marginTop: 26 }}>{n}. {children}</div>;
}

// Results Report — the printable read-out that comes out of a fielded survey.
// Mirrors the .docx template structure (Exec summary → drivers → service areas →
// customer service → communication → sentiment → equity → action plan → sharing).
// Rendered here with a fully-worked SAMPLE so it reads as a complete model.
export default function SurveyReportPage() {
  return (
    <main className="f5-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="f5-page-title">Resident Satisfaction Survey — Results Report</div>
          <div className="f5-page-sub">{R.client} · {R.period} · prepared by Fuse5 · <span style={{ color: "var(--f5-teal)" }}>sample / illustrative figures</span></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="f5-btn" href="/surveys/template">← Template</Link>
          <PrintButton />
        </div>
      </div>

      {/* 1. Executive Summary */}
      <H n={1}>Executive Summary</H>
      <p style={{ color: dim, fontSize: 13.5, lineHeight: 1.6, marginTop: 6 }}>
        {R.fielded.distribution.toLowerCase().startsWith("census") ? "A census" : "A sample"} was fielded {R.period} across {R.client}. {R.fielded.responses} residents responded ({R.fielded.responseRate}% response rate). Overall satisfaction reached <strong style={{ color: "var(--f5-text)" }}>{R.headline[0].thisCycle}</strong> (TOP2), up from {R.headline[0].prior} — the clearest single takeaway is that the move to short, channel-native pulses lifted both response rate and satisfaction versus the prior long-form cycle.
      </p>

      <div style={{ fontWeight: 700, fontSize: 13, margin: "14px 0 6px" }}>Headline metrics <span style={{ color: dim, fontWeight: 400 }}>(vs. sector benchmark — TCHC 2025: overall {SECTOR_BENCHMARK.overall}%, NPS {SECTOR_BENCHMARK.nps}, comms {SECTOR_BENCHMARK.communication}%, safety {SECTOR_BENCHMARK.safety}%, response {SECTOR_BENCHMARK.responseRate}%)</span></div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead><tr><th>Metric</th><th>This cycle</th><th>Prior</th><th>Change</th></tr></thead>
          <tbody>
            {R.headline.map((m) => (
              <tr key={m.metric}><td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{m.metric}</td><td>{m.thisCycle}</td><td style={{ color: dim }}>{m.prior}</td><td style={{ color: m.change.startsWith("-") ? "var(--f5-red)" : "var(--f5-green,#34d399)" }}>{m.change}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, margin: "14px 0 6px" }}>Top three takeaways</div>
      <ol style={{ margin: 0, paddingLeft: 18, color: "var(--f5-text)", fontSize: 13.5, lineHeight: 1.7 }}>
        {R.takeaways.map((t, i) => <li key={i}>{t}</li>)}
      </ol>

      {/* 2. Methodology */}
      <H n={2}>Methodology</H>
      <p style={{ color: dim, fontSize: 13, lineHeight: 1.6, marginTop: 6 }}>
        TOP2 combines the two positive responses; totals may sum to 99–101% from rounding. Every result shows its base (excluding Not Applicable). NPS = % Promoters (9–10) − % Detractors (1–6).
      </p>
      <ul style={{ color: dim, fontSize: 13, lineHeight: 1.7, marginTop: 6 }}>
        <li><strong style={{ color: "var(--f5-text)" }}>Distribution:</strong> {R.fielded.distribution}</li>
        <li><strong style={{ color: "var(--f5-text)" }}>Channels:</strong> {R.fielded.channels}</li>
        <li><strong style={{ color: "var(--f5-text)" }}>Field window:</strong> {R.fielded.window} · {R.fielded.responses} completed ({R.fielded.responseRate}%)</li>
      </ul>

      {/* 3. Drivers */}
      <H n={3}>Drivers Analysis — Where to Focus</H>
      <p style={{ color: dim, fontSize: 13, lineHeight: 1.6, marginTop: 6 }}>Services plotted by impact on overall satisfaction × their own satisfaction. Fix high-impact / low-satisfaction first.</p>
      <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 10 }}>
        {(["Primary Improvement", "Primary Maintenance"] as const).map((q) => (
          <div key={q} className="f5-card">
            <div style={{ fontWeight: 700, color: q === "Primary Improvement" ? "var(--f5-red,#f87171)" : "var(--f5-green,#34d399)" }}>{q === "Primary Improvement" ? "Primary Improvement — fix first" : "Primary Maintenance — protect"}</div>
            <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, color: "var(--f5-text)", lineHeight: 1.7 }}>
              {R.drivers.filter((d) => d.quadrant === q).map((d) => <li key={d.service}>{d.service}</li>)}
            </ul>
          </div>
        ))}
      </div>

      {/* 4. Service-Area Results */}
      <H n={4}>Service-Area Results</H>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead><tr><th>Service area</th><th style={{ width: 180 }}>TOP2 satisfied</th><th style={{ width: 70 }}>Prior</th><th style={{ width: 70 }}>Change</th><th>Region spread</th></tr></thead>
          <tbody>
            {R.serviceAreas.map((s) => {
              const chg = s.prior ? s.top2 - s.prior : null;
              return (
                <tr key={s.area}>
                  <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{s.area}</td>
                  <td>{bar(s.top2)}</td>
                  <td style={{ color: dim }}>{s.prior ? `${s.prior}%` : "—"}</td>
                  <td style={{ color: chg === null ? dim : changeColor(chg) }}>{chg === null ? "new" : `${chg > 0 ? "+" : ""}${chg}`}</td>
                  <td style={{ fontSize: 12, color: dim }}>{s.regionSpread}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 5. Customer Service */}
      <H n={5}>Customer Service</H>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead><tr><th>Touchpoint</th><th>Service (TOP2)</th><th>Responsiveness</th><th>Professionalism</th></tr></thead>
          <tbody>
            {R.customerService.map((c) => (
              <tr key={c.touchpoint}><td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{c.touchpoint}</td><td>{c.service}%</td><td>{c.responsiveness === null ? "—" : `${c.responsiveness}%`}</td><td>{c.professionalism}%</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ color: dim, fontSize: 12.5, marginTop: 6 }}>Local-staff <em>availability/responsiveness</em> (47%) is the weak line and a Primary Improvement driver — prioritize in the action plan.</p>

      {/* 6. Communication */}
      <H n={6}>Communication — Channel Mix</H>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead><tr><th>Channel residents regularly use</th><th style={{ width: 200 }}>This cycle</th><th style={{ width: 70 }}>Prior</th><th style={{ width: 70 }}>Change</th></tr></thead>
          <tbody>
            {R.channels.map((c) => {
              const chg = c.thisCycle - c.prior;
              return <tr key={c.channel}><td style={{ color: "var(--f5-text)" }}>{c.channel}</td><td>{bar(c.thisCycle)}</td><td style={{ color: dim }}>{c.prior}%</td><td style={{ color: changeColor(chg) }}>{chg > 0 ? "+" : ""}{chg}</td></tr>;
            })}
          </tbody>
        </table>
      </div>
      <div style={{ background: "var(--f5-surface-2)", border: "1px solid var(--f5-border)", borderRadius: 10, padding: "12px 14px", marginTop: 10, fontSize: 13, color: dim }}>
        <strong style={{ color: "var(--f5-text)" }}>Fuse5 read-out:</strong> digital channels are rising — SMS 41%→54%, email 52%→61%, digital newsletter 24%→33% — while letters and posters fall. Short monthly pulses over SMS, email, signage QR and kiosk lift response and shorten the feedback loop.
      </div>

      {/* 7. Resident Sentiment */}
      <H n={7}>Resident Sentiment</H>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead><tr><th>Statement (% agree, TOP2)</th><th style={{ width: 200 }}>This cycle</th><th style={{ width: 70 }}>Change</th></tr></thead>
          <tbody>
            {R.sentiment.map((s) => (
              <tr key={s.statement}><td style={{ color: "var(--f5-text)" }}>{s.statement}</td><td>{bar(s.top2)}</td><td style={{ color: changeColor(s.change) }}>{s.change > 0 ? "+" : ""}{s.change}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 8. Equity Cuts */}
      <H n={8}>Who Feels Differently — Equity Cuts</H>
      <ul style={{ color: "var(--f5-text)", fontSize: 13.5, lineHeight: 1.7, marginTop: 6 }}>
        {R.equity.map((e, i) => <li key={i}>{e}</li>)}
      </ul>

      {/* 9. Action Plan */}
      <H n={9}>Action Plan</H>
      <p style={{ color: dim, fontSize: 13, marginTop: 6 }}>Built from the drivers analysis (Section 3) — high-impact, low-satisfaction services first, not the lowest raw scores.</p>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead><tr><th>Priority (from drivers)</th><th>Action</th><th style={{ width: 150 }}>Owner</th><th style={{ width: 80 }}>Timeframe</th></tr></thead>
          <tbody>
            {R.actions.map((a) => (
              <tr key={a.priority}><td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{a.priority}</td><td style={{ fontSize: 13 }}>{a.action}</td><td style={{ color: dim }}>{a.owner}</td><td>{a.timeframe}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 10. Sharing */}
      <H n={10}>Sharing Results With Residents</H>
      <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8, marginBottom: 24 }}>
        <div className="f5-card"><div style={{ fontWeight: 700, color: "var(--f5-text)" }}>Phase 1 — Preliminary (4–6 weeks)</div><div style={{ fontSize: 13, color: dim, marginTop: 6 }}>High-level trends + headline numbers, pushed to digital signage, SMS, email, posters and the resident newsletter.</div></div>
        <div className="f5-card"><div style={{ fontWeight: 700, color: "var(--f5-text)" }}>Phase 2 — Findings & action plan (3 months)</div><div style={{ fontSize: 13, color: dim, marginTop: 6 }}>Detailed findings plus committed actions, in “you said / we did” framing on every channel.</div></div>
      </div>
    </main>
  );
}
