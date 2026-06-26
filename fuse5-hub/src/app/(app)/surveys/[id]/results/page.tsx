import Link from "next/link";
import { getSurveyResults } from "@/lib/queries";

const dim = "var(--f5-text-muted)";

function Bar({ pct, label, count }: { pct: number; label: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
      <div style={{ width: 200, fontSize: 12.5, color: "var(--f5-text)" }}>{label}</div>
      <div style={{ flex: 1, height: 8, borderRadius: 999, background: "var(--f5-surface-2)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "var(--f5-gradient-teal,var(--f5-teal))" }} />
      </div>
      <div style={{ width: 70, textAlign: "right", fontSize: 12, color: dim }}>{pct}% · {count}</div>
    </div>
  );
}

// Live survey results — real aggregates computed from resident responses
// (TOP2 for scales, NPS for the recommend question, % per option for choices).
export default async function SurveyResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getSurveyResults(id);
  if (!data) return (
    <main className="f5-content"><div className="f5-page-title">Results unavailable</div><div className="f5-page-sub"><Link href="/surveys" style={{ color: "var(--f5-teal)" }}>← Surveys</Link></div></main>
  );

  const total = data.results.total;
  const rate = data.sent > 0 ? Math.round((total / data.sent) * 100) : null;

  return (
    <main className="f5-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="f5-page-title">{data.title} — Results</div>
          <div className="f5-page-sub">Live aggregates from resident responses.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="f5-btn" href={`/surveys/${id}`}>← Builder</Link>
        </div>
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Responses</div><div className="f5-kpi-value">{total}</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Sent</div><div className="f5-kpi-value">{data.sent.toLocaleString()}</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Response rate</div><div className="f5-kpi-value">{rate === null ? "—" : `${rate}%`}</div></div>
      </div>

      {total === 0 && (
        <div className="f5-card" style={{ marginTop: 16, textAlign: "center", color: dim, padding: 28 }}>
          No responses yet. Field the survey from the <Link href={`/surveys/${id}`} style={{ color: "var(--f5-teal)" }}>builder</Link> (copy the link or send to residents), then results appear here automatically.
        </div>
      )}

      {data.results.results.map((r, i) => (
        <div key={r.q.id} className="f5-card" style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 600, color: "var(--f5-text)" }}>{i + 1}. {r.q.text || "(untitled)"} <span style={{ color: dim, fontWeight: 400, fontSize: 12 }}>· n={r.n}</span></div>

          {r.kind === "scale" && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 13 }}><strong style={{ color: "var(--f5-teal)" }}>{r.top2}%</strong> <span style={{ color: dim }}>TOP2 (satisfied / agree)</span></div>
              {r.dist.map((d) => <Bar key={d.label} label={d.label} pct={d.pct} count={d.count} />)}
            </div>
          )}
          {r.kind === "nps" && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: r.nps >= 0 ? "var(--f5-green,#34d399)" : "var(--f5-red,#f87171)" }}>NPS {r.nps > 0 ? "+" : ""}{r.nps}</div>
              <div style={{ fontSize: 12.5, color: dim, marginTop: 4 }}>{r.promoters} promoters · {r.passives} passive · {r.detractors} detractors</div>
            </div>
          )}
          {r.kind === "choice" && (
            <div style={{ marginTop: 8 }}>
              {r.options.map((o) => <Bar key={o.label} label={o.label} pct={o.pct} count={o.count} />)}
            </div>
          )}
          {r.kind === "text" && (
            <div style={{ marginTop: 8 }}>
              {r.samples.length === 0 ? <div style={{ color: dim, fontSize: 13 }}>No comments yet.</div> :
                r.samples.map((s, k) => <div key={k} style={{ fontSize: 13, color: "var(--f5-text)", padding: "6px 10px", background: "var(--f5-surface-2)", borderRadius: 6, marginTop: 6 }}>“{s}”</div>)}
            </div>
          )}
        </div>
      ))}
    </main>
  );
}
