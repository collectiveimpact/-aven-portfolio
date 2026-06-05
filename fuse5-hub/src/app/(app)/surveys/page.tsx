import { getSurveys, type SurveyRow } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { SurveysTable } from "./surveys-table";

function rate(s: SurveyRow): number {
  return s.sent > 0 ? Math.round((s.responses / s.sent) * 100) : 0;
}

export default async function SurveysPage() {
  const [surveys, me] = await Promise.all([getSurveys(), getCurrentUser()]);
  const canEdit = me?.role ? canPublish(me.role) : false;

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

      <SurveysTable surveys={surveys} canEdit={canEdit} />
    </main>
  );
}
