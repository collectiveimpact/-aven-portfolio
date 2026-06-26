import { createAdminClient } from "@/lib/supabase/admin";
import type { BuilderQuestion } from "@/lib/surveys/question";
import { RespondForm } from "./respond-form";

// PUBLIC resident-facing survey page (no auth — excluded from the proxy gate).
// Reads the survey with the service role and renders a fillable form.
export default async function PublicSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: survey } = admin
    ? await admin.from("surveys").select("id,title,description,status,questions").eq("id", id).maybeSingle()
    : { data: null };

  const wrap = (children: React.ReactNode) => (
    <main style={{ minHeight: "100vh", display: "flex", justifyContent: "center", padding: "32px 16px", background: "var(--f5-bg, #0b1220)" }}>
      <div style={{ width: 680, maxWidth: "100%" }}>{children}</div>
    </main>
  );
  const note = (text: string) => wrap(
    <div className="f5-card" style={{ textAlign: "center", padding: 40 }}>
      <div style={{ fontWeight: 700, fontSize: 18, color: "var(--f5-text)" }}>{text}</div>
    </div>
  );

  if (!survey) return note("Survey not found.");
  if (survey.status === "closed") return note("This survey is now closed. Thank you.");
  const questions = (Array.isArray(survey.questions) ? survey.questions : []) as BuilderQuestion[];
  if (!questions.length) return note("This survey has no questions yet.");

  return wrap(<RespondForm id={survey.id} title={survey.title} description={survey.description ?? ""} questions={questions} />);
}
