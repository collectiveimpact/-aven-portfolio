import Link from "next/link";
import { requireResident } from "@/lib/portal/guard";
import { getOpenSurveys } from "@/lib/portal/data";

export default async function PortalSurveysPage() {
  const { session } = await requireResident();
  const surveys = await getOpenSurveys(session);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <h1 className="f5-portal-h1">Surveys</h1>
        <p className="f5-portal-sub">Your feedback helps your housing team make things better. Answers are confidential.</p>
      </div>

      {surveys.length === 0 ? (
        <div className="f5-card"><div className="f5-portal-empty">No open surveys right now. Check back soon.</div></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {surveys.map((s) => (
            <Link key={s.id} href={`/portal/surveys/${s.id}`} className="f5-card" style={{ textDecoration: "none", padding: 16, display: "block" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, color: "var(--f5-text)" }}>{s.title}</div>
                  {s.description && (
                    <div style={{ color: "var(--f5-text-muted)", fontSize: 13, marginTop: 3 }}>{s.description}</div>
                  )}
                  <div style={{ color: "var(--f5-text-muted)", fontSize: 12, marginTop: 6 }}>
                    {s.questions.length} question{s.questions.length === 1 ? "" : "s"}
                  </div>
                </div>
                <span aria-hidden style={{ color: "var(--f5-teal)", fontSize: 18 }}>→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
