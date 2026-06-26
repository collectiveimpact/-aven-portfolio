// Pure aggregation of raw survey responses into per-question results. Shared by
// the live results view. Scoring follows the instrument conventions:
//   • scales (sat5/agree5/change5): TOP2 = % in the two highest points (idx 3–4)
//   • nps11: NPS = %Promoters(9–10) − %Detractors(0–6)
//   • choice: % per option   • text: sample of free responses
import { QTYPE, type BuilderQuestion, type QType } from "./question";

export type AnswerMap = Record<string, number | string | string[] | null | undefined>;

export type QResult =
  | { kind: "scale"; q: BuilderQuestion; n: number; top2: number; dist: { label: string; count: number; pct: number }[] }
  | { kind: "nps"; q: BuilderQuestion; n: number; nps: number; promoters: number; passives: number; detractors: number }
  | { kind: "choice"; q: BuilderQuestion; n: number; options: { label: string; count: number; pct: number }[] }
  | { kind: "text"; q: BuilderQuestion; n: number; samples: string[] };

export interface SurveyResults { total: number; results: QResult[] }

const SCALE_TYPES: QType[] = ["sat5", "agree5", "change5"];
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export function aggregate(questions: BuilderQuestion[], responses: AnswerMap[]): SurveyResults {
  const total = responses.length;
  const results: QResult[] = questions.map((q) => {
    const vals = responses.map((r) => r?.[q.id]).filter((v) => v !== null && v !== undefined && v !== "");

    if (SCALE_TYPES.includes(q.type)) {
      const points = QTYPE[q.type].points ?? [];
      const counts = points.map((_, i) => vals.filter((v) => Number(v) === i).length);
      const n = counts.reduce((a, b) => a + b, 0);
      const top2 = pct(counts[points.length - 1] + counts[points.length - 2], n);
      return { kind: "scale", q, n, top2, dist: points.map((label, i) => ({ label, count: counts[i], pct: pct(counts[i], n) })) };
    }
    if (q.type === "nps11") {
      const nums = vals.map(Number).filter((x) => !Number.isNaN(x));
      const n = nums.length;
      const promoters = nums.filter((x) => x >= 9).length;
      const passives = nums.filter((x) => x >= 7 && x <= 8).length;
      const detractors = nums.filter((x) => x <= 6).length;
      return { kind: "nps", q, n, nps: n > 0 ? Math.round(((promoters - detractors) / n) * 100) : 0, promoters, passives, detractors };
    }
    if (q.type === "single" || q.type === "multi") {
      const opts = q.options ?? [];
      const n = vals.length;
      const count = (opt: string) => vals.filter((v) => (Array.isArray(v) ? v.includes(opt) : v === opt)).length;
      return { kind: "choice", q, n, options: opts.map((label) => ({ label, count: count(label), pct: pct(count(label), n) })) };
    }
    // text
    const samples = vals.map(String).filter(Boolean).slice(0, 8);
    return { kind: "text", q, n: vals.length, samples };
  });
  return { total, results };
}
