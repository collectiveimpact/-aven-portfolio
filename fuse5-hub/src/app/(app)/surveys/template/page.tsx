import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import {
  QUESTIONS, SECTIONS, SCALES, PULSE_SCHEDULE, DEMOGRAPHICS, SURVEY_META, type SurveyQuestion,
} from "@/lib/surveys/resident-satisfaction";
import { UseTemplateButton } from "../use-template-button";

const dim = "var(--f5-text-muted)";
const scaleLabel: Record<string, string> = Object.fromEntries(SCALES.map((s) => [s.key, s.label]));

function Pill({ children, color }: { children: React.ReactNode; color?: string }) {
  return <span className="f5-badge" style={color ? { color, borderColor: "transparent" } : undefined}>{children}</span>;
}

// The Resident Satisfaction Survey instrument, rendered as a working model: every
// question grouped by service block, with its scale, channels and pulse month, plus
// the answer scales, the 12-month pulse rotation, and the demographic cross-tabs.
export default async function SurveyTemplatePage() {
  const me = await getCurrentUser();
  const canEdit = me?.role ? canPublish(me.role) : false;

  return (
    <main className="f5-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div className="f5-page-title">{SURVEY_META.title} — Template</div>
          <div className="f5-page-sub">{SURVEY_META.source}. The model instrument for building a resident survey in Fuse5.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link className="f5-btn" href="/surveys">← Surveys</Link>
          <Link className="f5-btn" href="/surveys/report">Sample Results Report →</Link>
          {canEdit && <UseTemplateButton />}
        </div>
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Questions</div><div className="f5-kpi-value">{SURVEY_META.counts.total}</div><div className="f5-kpi-sub">across {SECTIONS.length} sections</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Satisfaction / NPS</div><div className="f5-kpi-value">{SURVEY_META.counts.satisfaction}</div><div className="f5-kpi-sub">scored items</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Multi-select</div><div className="f5-kpi-value">{SURVEY_META.counts.multi}</div><div className="f5-kpi-sub">needs / salience</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Demographics</div><div className="f5-kpi-value">{SURVEY_META.counts.demographics}</div><div className="f5-kpi-sub">for cross-tabs</div></div>
      </div>

      <div style={{ background: "var(--f5-surface-2)", border: "1px solid var(--f5-border)", borderRadius: 10, padding: "12px 14px", marginTop: 16, fontSize: 13, color: dim }}>
        <strong style={{ color: "var(--f5-text)" }}>Why pulses, not one census:</strong> run the bank as short, channel-native monthly pulses (≤6 questions) instead of one long survey. Fuse5 already operates the four collection channels — SMS, email, signage QR, touchscreen kiosk — which lifts response and shortens the feedback loop. Replace <code>[Landlord]</code> with the client name and it is field-ready.
      </div>

      {/* Question bank grouped by section */}
      {SECTIONS.map((section) => {
        const qs = QUESTIONS.filter((q) => q.section === section);
        return (
          <div key={section} style={{ marginTop: 22 }}>
            <div className="f5-section-title" style={{ marginBottom: 8 }}>{section} <span style={{ color: dim, fontWeight: 400, fontSize: 13 }}>· {qs.length}</span></div>
            <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="f5-table">
                <thead><tr><th style={{ width: 36 }}>#</th><th>Question</th><th style={{ width: 130 }}>Scale</th><th style={{ width: 150 }}>Channels</th><th style={{ width: 60 }}>Pulse</th></tr></thead>
                <tbody>
                  {qs.map((q: SurveyQuestion) => (
                    <tr key={q.n}>
                      <td style={{ color: dim }}>{q.n}</td>
                      <td>
                        <div style={{ color: "var(--f5-text)" }}>{q.text}{q.new2025 && <span style={{ marginLeft: 6, color: "var(--f5-teal)", fontSize: 11, fontWeight: 700 }}>NEW 2025</span>}</div>
                        {q.options && q.options.length > 0 && <div style={{ fontSize: 11.5, color: dim, marginTop: 3 }}>{q.options.join(" · ")}</div>}
                        {q.note && <div style={{ fontSize: 11.5, color: dim, marginTop: 3, fontStyle: "italic" }}>{q.note}</div>}
                      </td>
                      <td><Pill>{scaleLabel[q.scale]}</Pill></td>
                      <td style={{ fontSize: 12, color: dim }}>{q.channels.join(", ")}</td>
                      <td><Pill color="var(--f5-teal)">{q.pulse}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {/* Response scales */}
      <div className="f5-section-title" style={{ marginTop: 26 }}>Response Scales</div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead><tr><th>Scale</th><th>Points (low → high)</th><th>Scoring</th></tr></thead>
          <tbody>
            {SCALES.map((s) => (
              <tr key={s.key}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{s.label}</td>
                <td style={{ fontSize: 12.5, color: dim }}>{s.points.length ? s.points.join("  ·  ") : s.usedFor}</td>
                <td style={{ fontSize: 12.5 }}>{s.scoring}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pulse schedule */}
      <div className="f5-section-title" style={{ marginTop: 26 }}>Suggested 12-Month Pulse Schedule</div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead><tr><th style={{ width: 52 }}>Month</th><th>Theme</th><th style={{ width: 90 }}>Questions</th><th style={{ width: 44 }}>#</th><th>Primary channels</th></tr></thead>
          <tbody>
            {PULSE_SCHEDULE.map((p) => (
              <tr key={p.month + p.theme}>
                <td><Pill color="var(--f5-teal)">{p.month}</Pill></td>
                <td style={{ color: "var(--f5-text)" }}>{p.theme}<div style={{ fontSize: 11.5, color: dim }}>{p.notes}</div></td>
                <td style={{ fontSize: 12, color: dim }}>{p.questions}</td>
                <td>{p.count}</td>
                <td style={{ fontSize: 12, color: dim }}>{p.channels.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Demographics */}
      <div className="f5-section-title" style={{ marginTop: 26 }}>Demographics <span style={{ color: dim, fontWeight: 400, fontSize: 13 }}>· ask once per annual cycle, every item offers “Prefer not to answer”</span></div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden", marginBottom: 24 }}>
        <table className="f5-table">
          <thead><tr><th style={{ width: 44 }}>#</th><th>Question</th><th style={{ width: 110 }}>Type</th><th>Options</th></tr></thead>
          <tbody>
            {DEMOGRAPHICS.map((d) => (
              <tr key={d.code}>
                <td style={{ color: dim }}>{d.code}</td>
                <td style={{ color: "var(--f5-text)" }}>{d.question}</td>
                <td><Pill>{d.type}</Pill></td>
                <td style={{ fontSize: 12, color: dim }}>{d.options}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
