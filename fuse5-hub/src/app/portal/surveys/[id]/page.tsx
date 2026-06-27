import Link from "next/link";
import { requireResident } from "@/lib/portal/guard";
import { getSurvey } from "@/lib/portal/data";
import type { BuilderQuestion } from "@/lib/surveys/question";
import { AnswerForm } from "./answer-form";

export default async function PortalSurveyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { session } = await requireResident();
  const survey = await getSurvey(session, id);

  if (!survey) {
    return (
      <div className="f5-card" style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontWeight: 700, color: "var(--f5-text)" }}>This survey isn&apos;t available.</div>
        <div style={{ marginTop: 16 }}>
          <Link href="/portal/surveys" className="f5-btn">Back to surveys</Link>
        </div>
      </div>
    );
  }

  const questions = (Array.isArray(survey.questions) ? survey.questions : []) as BuilderQuestion[];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Link href="/portal/surveys" style={{ color: "var(--f5-text-muted)", fontSize: 13, textDecoration: "none" }}>
        ← All surveys
      </Link>
      <AnswerForm id={survey.id} title={survey.title} description={survey.description ?? ""} questions={questions} />
    </div>
  );
}
