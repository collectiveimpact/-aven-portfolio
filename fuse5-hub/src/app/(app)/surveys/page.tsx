import type { Survey } from "@/lib/types";

// Resident surveys (typed `Survey`).
const ORG = "woodgreen-demo";

const surveys: Survey[] = [
  { id: "sv1", org_id: ORG, title: "Annual Resident Satisfaction 2026", status: "live", responses: 412, sent: 1284 },
  { id: "sv2", org_id: ORG, title: "Maintenance Response Feedback", status: "live", responses: 188, sent: 305 },
  { id: "sv3", org_id: ORG, title: "Community Room Renovation Input", status: "closed", responses: 96, sent: 318 },
  { id: "sv4", org_id: ORG, title: "Building Safety Check-in", status: "closed", responses: 540, sent: 640 },
  { id: "sv5", org_id: ORG, title: "Summer Programming Interest", status: "draft", responses: 0, sent: 0 },
];

const statusBadge: Record<Survey["status"], string> = { live: "ok", closed: "warn", draft: "bad" };
const statusLabel: Record<Survey["status"], string> = { live: "Live", closed: "Closed", draft: "Draft" };

function rate(s: Survey): number {
  return s.sent > 0 ? Math.round((s.responses / s.sent) * 100) : 0;
}

export default async function SurveysPage() {
  const live = surveys.filter((s) => s.status === "live").length;
  const measurable = surveys.filter((s) => s.sent > 0);
  const avgRate = measurable.length
    ? Math.round(measurable.reduce((acc, s) => acc + rate(s), 0) / measurable.length)
    : 0;

  return (
    <main className="f5-content">
      <div className="f5-page-title">Surveys</div>
      <div className="f5-page-sub">Resident feedback campaigns across the portfolio.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(2,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Live</div><div className="f5-kpi-value">{live}</div><div className="f5-kpi-sub">currently collecting</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Avg Response Rate</div><div className="f5-kpi-value">{avgRate}%</div><div className="f5-kpi-sub"><span className="f5-up">▲ 4.0%</span> vs prior wave</div></div>
      </div>

      <div className="f5-section-title">All Surveys</div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead>
            <tr><th>Title</th><th>Status</th><th>Sent</th><th>Responses</th><th>Response Rate</th></tr>
          </thead>
          <tbody>
            {surveys.map((s) => {
              const r = rate(s);
              return (
                <tr key={s.id}>
                  <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{s.title}</td>
                  <td><span className={`f5-badge ${statusBadge[s.status]}`}>{statusLabel[s.status]}</span></td>
                  <td>{s.sent.toLocaleString()}</td>
                  <td>{s.responses.toLocaleString()}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ flex: 1, height: 6, borderRadius: 999, background: "var(--f5-surface-2)", overflow: "hidden", minWidth: 80 }}>
                        <div style={{ width: `${r}%`, height: "100%", background: "var(--f5-gradient-teal)" }} />
                      </div>
                      <span style={{ color: "var(--f5-text)", fontSize: 12, minWidth: 34, textAlign: "right" }}>{r}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
