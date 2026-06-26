import Link from "next/link";
import { getSurveyDetail } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { SurveyBuilder } from "./survey-builder";

// Survey builder route — loads one survey (with its question set) and hands it to
// the interactive builder. Next 16: params is async.
export default async function SurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [survey, me] = await Promise.all([getSurveyDetail(id), getCurrentUser()]);
  const canEdit = me?.role ? canPublish(me.role) : false;

  if (!survey) {
    return (
      <main className="f5-content">
        <div className="f5-page-title">Survey not found</div>
        <div className="f5-page-sub">This survey may have been deleted. <Link href="/surveys" style={{ color: "var(--f5-teal)" }}>← Back to Surveys</Link></div>
      </main>
    );
  }
  return <SurveyBuilder survey={survey} canEdit={canEdit} />;
}
