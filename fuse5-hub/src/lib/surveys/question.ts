// Shared question-type system for the survey builder. Drives the editor's type
// picker AND the respondent preview, so the two never drift. Types mirror the
// Resident Satisfaction instrument's scales plus generic choice/text questions.

export type QType = "sat5" | "agree5" | "nps11" | "change5" | "single" | "multi" | "text";

export interface BuilderQuestion {
  id: string;
  type: QType;
  text: string;
  options?: string[];   // for single / multi
  required?: boolean;
}

export interface QTypeDef {
  key: QType;
  label: string;
  hint: string;
  hasOptions: boolean;   // shows the option editor
  points?: string[];     // fixed scale rendered in preview (low → high)
}

const SAT = ["Very Dissatisfied", "Somewhat Dissatisfied", "Neutral", "Somewhat Satisfied", "Very Satisfied"];
const AGREE = ["Strongly Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Strongly Agree"];
const CHANGE = ["Significantly worsened", "Somewhat worsened", "Stayed the same", "Somewhat improved", "Significantly improved"];

export const QTYPES: QTypeDef[] = [
  { key: "sat5", label: "Satisfaction (5-pt)", hint: "Very Dissatisfied → Very Satisfied", hasOptions: false, points: SAT },
  { key: "agree5", label: "Agreement (5-pt)", hint: "Strongly Disagree → Strongly Agree", hasOptions: false, points: AGREE },
  { key: "nps11", label: "Recommend / NPS (0–10)", hint: "0 not likely → 10 very likely", hasOptions: false },
  { key: "change5", label: "Change over time", hint: "Worsened → Improved", hasOptions: false, points: CHANGE },
  { key: "single", label: "Single choice", hint: "Pick one option", hasOptions: true },
  { key: "multi", label: "Multi-select", hint: "Select all that apply", hasOptions: true },
  { key: "text", label: "Open text", hint: "Free-form comment", hasOptions: false },
];

export const QTYPE: Record<QType, QTypeDef> = Object.fromEntries(QTYPES.map((t) => [t.key, t])) as Record<QType, QTypeDef>;

export function newQuestion(type: QType = "sat5"): BuilderQuestion {
  const def = QTYPE[type];
  return {
    id: `q_${Math.random().toString(36).slice(2, 9)}`,
    type,
    text: "",
    options: def.hasOptions ? ["Option 1", "Option 2"] : undefined,
    required: true,
  };
}
