"use client";

import { useState, useTransition } from "react";
import { QTYPE, type BuilderQuestion } from "@/lib/surveys/question";
import { submitSurveyResponse, type AnswerValue } from "./actions";

const dim = "var(--f5-text-muted)";

export function RespondForm({ id, title, description, questions }: { id: string; title: string; description: string; questions: BuilderQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = (qid: string, v: AnswerValue) => setAnswers((a) => ({ ...a, [qid]: v }));
  const toggleMulti = (qid: string, opt: string) => setAnswers((a) => {
    const cur = Array.isArray(a[qid]) ? (a[qid] as string[]) : [];
    return { ...a, [qid]: cur.includes(opt) ? cur.filter((x) => x !== opt) : [...cur, opt] };
  });

  function submit() {
    setError(null);
    const missing = questions.find((q) => q.required !== false && (answers[q.id] === undefined || answers[q.id] === "" || (Array.isArray(answers[q.id]) && (answers[q.id] as string[]).length === 0)));
    if (missing) { setError("Please answer all required questions."); return; }
    start(async () => {
      const r = await submitSurveyResponse(id, answers);
      if (!r.ok) { setError(r.error ?? "Could not submit."); return; }
      setDone(true);
    });
  }

  if (done) return (
    <div className="f5-card" style={{ textAlign: "center", padding: 48 }}>
      <div style={{ fontSize: 40 }}>✓</div>
      <div style={{ fontWeight: 700, fontSize: 20, color: "var(--f5-text)", marginTop: 8 }}>Thank you</div>
      <div style={{ color: dim, marginTop: 6 }}>Your response has been recorded.</div>
    </div>
  );

  return (
    <>
      <div className="f5-card" style={{ borderTop: "3px solid var(--f5-teal)" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "var(--f5-text)" }}>{title}</div>
        {description && <div style={{ color: dim, marginTop: 6 }}>{description}</div>}
        <div style={{ color: dim, fontSize: 12, marginTop: 8 }}>{questions.length} question{questions.length === 1 ? "" : "s"} · your answers are confidential</div>
      </div>

      {questions.map((q, i) => (
        <div key={q.id} className="f5-card" style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 600, color: "var(--f5-text)" }}>{i + 1}. {q.text || "(untitled)"}{q.required !== false && <span style={{ color: "var(--f5-red)", marginLeft: 4 }}>*</span>}</div>
          <div style={{ marginTop: 10 }}><Field q={q} value={answers[q.id]} set={set} toggleMulti={toggleMulti} /></div>
        </div>
      ))}

      {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 12 }}>{error}</div>}
      <div style={{ marginTop: 16, marginBottom: 24 }}>
        <button className="f5-btn primary" style={{ width: "100%", padding: 12, fontSize: 15 }} disabled={pending} onClick={submit}>{pending ? "Submitting…" : "Submit response"}</button>
      </div>
    </>
  );
}

function Field({ q, value, set, toggleMulti }: { q: BuilderQuestion; value: AnswerValue; set: (id: string, v: AnswerValue) => void; toggleMulti: (id: string, opt: string) => void }) {
  if (q.type === "text") return <textarea className="f5-input" rows={3} placeholder="Your answer…" value={(value as string) ?? ""} onChange={(e) => set(q.id, e.target.value)} />;
  if (q.type === "nps11") return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {Array.from({ length: 11 }, (_, n) => {
        const on = value === n;
        return <button key={n} onClick={() => set(q.id, n)} style={{ width: 38, height: 38, borderRadius: 8, border: "1px solid var(--f5-border)", background: on ? "var(--f5-teal)" : "transparent", color: on ? "#001417" : "var(--f5-text)", fontWeight: on ? 700 : 400, cursor: "pointer" }}>{n}</button>;
      })}
    </div>
  );
  const def = QTYPE[q.type];
  const opts = def.points ?? q.options ?? [];
  const isMulti = q.type === "multi";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {opts.map((o, idx) => {
        const val: AnswerValue = def.points ? idx : o; // scales store the index; choice stores the label
        const on = isMulti ? Array.isArray(value) && (value as string[]).includes(o) : value === val;
        return (
          <label key={o} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", border: `1px solid ${on ? "var(--f5-teal)" : "var(--f5-border)"}`, borderRadius: 8, cursor: "pointer", color: "var(--f5-text)" }}
            onClick={() => (isMulti ? toggleMulti(q.id, o) : set(q.id, val))}>
            <span style={{ color: on ? "var(--f5-teal)" : dim }}>{isMulti ? (on ? "☑" : "☐") : (on ? "◉" : "○")}</span> {o}
          </label>
        );
      })}
    </div>
  );
}
