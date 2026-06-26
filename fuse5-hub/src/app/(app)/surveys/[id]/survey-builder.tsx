"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { SurveyDetail } from "@/lib/queries";
import { QTYPES, QTYPE, newQuestion, type BuilderQuestion, type QType } from "@/lib/surveys/question";
import { QUESTIONS, SECTIONS } from "@/lib/surveys/resident-satisfaction";
import { saveSurveyDetail } from "../actions";

const dim = "var(--f5-text-muted)";

export function SurveyBuilder({ survey, canEdit }: { survey: SurveyDetail; canEdit: boolean }) {
  const router = useRouter();
  const [title, setTitle] = useState(survey.title);
  const [description, setDescription] = useState(survey.description);
  const [status, setStatus] = useState(survey.status);
  const [questions, setQuestions] = useState<BuilderQuestion[]>(survey.questions);
  const [mode, setMode] = useState<"build" | "preview">("build");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const patch = (id: string, p: Partial<BuilderQuestion>) => setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...p } : q)));
  const remove = (id: string) => setQuestions((qs) => qs.filter((q) => q.id !== id));
  const move = (i: number, dir: -1 | 1) => setQuestions((qs) => {
    const j = i + dir; if (j < 0 || j >= qs.length) return qs;
    const next = [...qs]; [next[i], next[j]] = [next[j], next[i]]; return next;
  });
  const duplicate = (i: number) => setQuestions((qs) => {
    const c = { ...qs[i], id: `q_${Math.random().toString(36).slice(2, 9)}`, options: qs[i].options ? [...qs[i].options!] : undefined };
    const next = [...qs]; next.splice(i + 1, 0, c); return next;
  });
  const add = (type: QType) => setQuestions((qs) => [...qs, newQuestion(type)]);

  function changeType(id: string, type: QType) {
    const def = QTYPE[type];
    patch(id, { type, options: def.hasOptions ? (questions.find((q) => q.id === id)?.options ?? ["Option 1", "Option 2"]) : undefined });
  }

  function save() {
    setError(null);
    if (!title.trim()) { setError("Survey title is required."); return; }
    start(async () => {
      const r = await saveSurveyDetail({ id: survey.id, title, description, status, questions });
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setSavedAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      router.refresh();
    });
  }

  return (
    <main className="f5-content">
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Link className="f5-btn" href="/surveys">← Surveys</Link>
          <div className="f5-page-title" style={{ margin: 0 }}>Survey Builder</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {savedAt && <span style={{ fontSize: 12, color: "var(--f5-green,#34d399)" }}>Saved {savedAt}</span>}
          <button className="f5-btn" onClick={() => setMode(mode === "build" ? "preview" : "build")}>{mode === "build" ? "👁 Preview" : "✎ Edit"}</button>
          {canEdit && <button className="f5-btn primary" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save"}</button>}
        </div>
      </div>
      {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginTop: 8 }}>{error}</div>}

      {/* Survey meta */}
      <div className="f5-card" style={{ marginTop: 16, borderTop: "3px solid var(--f5-teal)" }}>
        {mode === "build" ? (
          <>
            <input className="f5-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Survey title" style={{ fontSize: 18, fontWeight: 700 }} />
            <textarea className="f5-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description shown to residents (optional)" rows={2} style={{ marginTop: 8, resize: "vertical" }} />
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: dim }}>Status</span>
              <select className="f5-select" value={status} onChange={(e) => setStatus(e.target.value as SurveyDetail["status"])} style={{ width: 140 }}>
                <option value="draft">Draft</option><option value="live">Live</option><option value="closed">Closed</option>
              </select>
              <span style={{ fontSize: 12, color: dim, marginLeft: "auto" }}>{questions.length} question{questions.length === 1 ? "" : "s"}</span>
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 20, fontWeight: 700, color: "var(--f5-text)" }}>{title || "Untitled Survey"}</div>
            {description && <div style={{ color: dim, marginTop: 6 }}>{description}</div>}
          </>
        )}
      </div>

      <ShareBar id={survey.id} responses={survey.responses} />

      {/* BUILD MODE */}
      {mode === "build" && (
        <>
          {questions.length === 0 && (
            <div className="f5-card" style={{ marginTop: 14, textAlign: "center", color: dim, padding: 28 }}>
              No questions yet. Add one below, or <button className="f5-btn" style={{ padding: "2px 10px" }} onClick={() => setPickerOpen(true)}>insert from the Resident Satisfaction template</button>.
            </div>
          )}

          {questions.map((q, i) => {
            const def = QTYPE[q.type];
            return (
              <div key={q.id} className="f5-card" style={{ marginTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ color: dim, cursor: "grab" }}>⠿</span>
                  <span style={{ fontWeight: 700, color: "var(--f5-teal)" }}>Q{i + 1}</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                    <button className="f5-btn" style={btn} onClick={() => move(i, -1)} disabled={i === 0} title="Move up">↑</button>
                    <button className="f5-btn" style={btn} onClick={() => move(i, 1)} disabled={i === questions.length - 1} title="Move down">↓</button>
                    <button className="f5-btn" style={btn} onClick={() => duplicate(i)} title="Duplicate">⎘</button>
                    <button className="f5-btn" style={{ ...btn, color: "var(--f5-red)" }} onClick={() => remove(q.id)} title="Delete">🗑</button>
                  </div>
                </div>

                <textarea className="f5-input" value={q.text} onChange={(e) => patch(q.id, { text: e.target.value })} placeholder="Question text" rows={2} style={{ marginTop: 8, resize: "vertical" }} />

                <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <select className="f5-select" value={q.type} onChange={(e) => changeType(q.id, e.target.value as QType)} style={{ width: 220 }}>
                    {QTYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                  </select>
                  <span style={{ fontSize: 12, color: dim }}>{def.hint}</span>
                  <label style={{ fontSize: 12, color: dim, marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                    <input type="checkbox" checked={q.required !== false} onChange={(e) => patch(q.id, { required: e.target.checked })} /> Required
                  </label>
                </div>

                {/* fixed-scale preview */}
                {def.points && (
                  <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    {def.points.map((p) => <span key={p} className="f5-badge" style={{ fontSize: 11 }}>{p}</span>)}
                  </div>
                )}
                {q.type === "nps11" && <div style={{ marginTop: 10, color: dim, fontSize: 12 }}>Respondents pick 0–10 · scored as NPS (Promoters − Detractors)</div>}

                {/* options editor */}
                {def.hasOptions && (
                  <div style={{ marginTop: 10 }}>
                    {(q.options ?? []).map((opt, oi) => (
                      <div key={oi} style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
                        <span style={{ color: dim, fontSize: 12 }}>{q.type === "multi" ? "☐" : "○"}</span>
                        <input className="f5-input" value={opt} onChange={(e) => patch(q.id, { options: q.options!.map((o, k) => (k === oi ? e.target.value : o)) })} style={{ flex: 1 }} />
                        <button className="f5-btn" style={btn} onClick={() => patch(q.id, { options: q.options!.filter((_, k) => k !== oi) })} title="Remove option">×</button>
                      </div>
                    ))}
                    <button className="f5-btn" style={{ padding: "3px 10px", fontSize: 12, marginTop: 8 }} onClick={() => patch(q.id, { options: [...(q.options ?? []), `Option ${(q.options?.length ?? 0) + 1}`] })}>+ Add option</button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add-question toolbar */}
          {canEdit && (
            <div className="f5-card" style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Add a question:</span>
              {QTYPES.map((t) => <button key={t.key} className="f5-btn" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => add(t.key)}>+ {t.label}</button>)}
              <button className="f5-btn primary" style={{ padding: "4px 12px", fontSize: 12, marginLeft: "auto" }} onClick={() => setPickerOpen(true)}>＋ Insert from template</button>
            </div>
          )}
        </>
      )}

      {/* PREVIEW MODE — respondent view */}
      {mode === "preview" && (
        <div style={{ marginTop: 14 }}>
          {questions.length === 0 && <div className="f5-card" style={{ color: dim, textAlign: "center", padding: 24 }}>Nothing to preview yet.</div>}
          {questions.map((q, i) => (
            <div key={q.id} className="f5-card" style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 600, color: "var(--f5-text)" }}>{i + 1}. {q.text || <span style={{ color: dim }}>(untitled question)</span>}{q.required !== false && <span style={{ color: "var(--f5-red)", marginLeft: 4 }}>*</span>}</div>
              <div style={{ marginTop: 10 }}><Respondent q={q} /></div>
            </div>
          ))}
        </div>
      )}

      {/* TEMPLATE PICKER */}
      {pickerOpen && <TemplatePicker onClose={() => setPickerOpen(false)} onInsert={(qs) => { setQuestions((cur) => [...cur, ...qs]); setPickerOpen(false); }} existing={questions} />}
    </main>
  );
}

const btn: React.CSSProperties = { padding: "2px 8px", fontSize: 12, minWidth: 30 };

// Field & collect: the shareable resident link + a jump to live results. Share the
// link via Compose, a Journey step, signage QR or kiosk; responses flow into Results.
function ShareBar({ id, responses }: { id: string; responses: number }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const link = `${origin}/s/${id}`;
  return (
    <div className="f5-card" style={{ marginTop: 14, borderLeft: "3px solid var(--f5-teal)" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700, color: "var(--f5-text)" }}>Field &amp; collect</div>
        <input readOnly className="f5-input" value={link} style={{ flex: 1, minWidth: 220, fontSize: 12 }} onFocus={(e) => e.currentTarget.select()} />
        <button className="f5-btn" onClick={() => { navigator.clipboard?.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied ✓" : "Copy link"}</button>
        <a className="f5-btn" href={link} target="_blank" rel="noreferrer">Open form ↗</a>
        <Link className="f5-btn primary" href={`/surveys/${id}/results`}>Results ({responses})</Link>
      </div>
      <div style={{ fontSize: 12, color: dim, marginTop: 8 }}>Share this link via Compose, a Journey step, signage QR or kiosk. Residents answer without logging in, and responses aggregate into Results automatically.</div>
    </div>
  );
}

// Respondent-facing rendering of a single question (the live preview).
function Respondent({ q }: { q: BuilderQuestion }) {
  const def = QTYPE[q.type];
  if (q.type === "text") return <textarea className="f5-input" rows={3} placeholder="Your answer…" disabled />;
  if (q.type === "nps11") return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {Array.from({ length: 11 }, (_, n) => <span key={n} style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid var(--f5-border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "var(--f5-text)" }}>{n}</span>)}
    </div>
  );
  const opts = def.points ?? q.options ?? [];
  const mark = q.type === "multi" ? "☐" : "○";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {opts.map((o) => (
        <label key={o} style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--f5-text)", fontSize: 13.5 }}>
          <span style={{ color: "var(--f5-text-muted)" }}>{mark}</span> {o}
        </label>
      ))}
    </div>
  );
}

// Pick questions from the 41-item Resident Satisfaction bank, grouped by section.
function TemplatePicker({ onClose, onInsert, existing }: { onClose: () => void; onInsert: (qs: BuilderQuestion[]) => void; existing: BuilderQuestion[] }) {
  const have = new Set(existing.map((q) => q.text));
  const [sel, setSel] = useState<Set<number>>(new Set());
  const toggle = (n: number) => setSel((s) => { const x = new Set(s); x.has(n) ? x.delete(n) : x.add(n); return x; });
  const selectSection = (section: string) => setSel((s) => {
    const x = new Set(s); const ns = QUESTIONS.filter((q) => q.section === section).map((q) => q.n);
    const all = ns.every((n) => x.has(n)); ns.forEach((n) => (all ? x.delete(n) : x.add(n))); return x;
  });
  function insert() {
    const qs: BuilderQuestion[] = QUESTIONS.filter((q) => sel.has(q.n)).map((q) => ({ id: `q_${Math.random().toString(36).slice(2, 9)}`, type: q.scale, text: q.text, options: q.options, required: true }));
    onInsert(qs);
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 60, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "32px 16px" }} onClick={onClose}>
      <div className="f5-card" style={{ width: 720, maxWidth: "97vw" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="f5-section-title" style={{ margin: 0 }}>Insert from Resident Satisfaction template</div>
          <button className="f5-btn" style={btn} onClick={onClose}>✕</button>
        </div>
        <div style={{ fontSize: 12.5, color: dim, marginBottom: 8 }}>Tick questions to add. {sel.size} selected.</div>
        <div style={{ maxHeight: "60vh", overflowY: "auto", border: "1px solid var(--f5-border)", borderRadius: 8 }}>
          {SECTIONS.map((section) => (
            <div key={section}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--f5-surface-2)", position: "sticky", top: 0 }}>
                <strong style={{ fontSize: 12.5, color: "var(--f5-text)" }}>{section}</strong>
                <button className="f5-btn" style={{ padding: "1px 8px", fontSize: 11 }} onClick={() => selectSection(section)}>Toggle all</button>
              </div>
              {QUESTIONS.filter((q) => q.section === section).map((q) => (
                <label key={q.n} style={{ display: "flex", gap: 8, padding: "7px 12px", alignItems: "flex-start", borderTop: "1px solid var(--f5-border)", opacity: have.has(q.text) ? 0.5 : 1 }}>
                  <input type="checkbox" checked={sel.has(q.n)} onChange={() => toggle(q.n)} style={{ marginTop: 3 }} />
                  <span style={{ fontSize: 13, color: "var(--f5-text)" }}>{q.text} <span className="f5-badge" style={{ fontSize: 10, marginLeft: 4 }}>{QTYPE[q.scale].label}</span>{have.has(q.text) && <span style={{ color: dim, fontSize: 11, marginLeft: 6 }}>already added</span>}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button className="f5-btn primary" disabled={sel.size === 0} onClick={insert}>Insert {sel.size} question{sel.size === 1 ? "" : "s"}</button>
          <button className="f5-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
