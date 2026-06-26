// Resident Satisfaction Survey — the canonical Fuse5 survey instrument + results
// report model. Adapted from the Toronto Community Housing 2025 Tenant Survey,
// generalized for any housing operator. Source artifacts live in
// Operations/_templates (the .xlsx instrument + .docx results report). This file
// is the in-app embedding of both: the question bank powers the survey builder,
// and the report model powers the printable results report.
//
// Conventions (kept identical to the source so results stay sector-comparable):
//   • TOP2  = the two positive responses combined (e.g. Very + Somewhat Satisfied)
//   • NPS   = % Promoters (9–10) − % Detractors (1–6)
//   • Always show change vs. prior cycle and the sample size (n)
//   • Use "resident" (never "tenant") in resident-facing copy.

export type ScaleKey = "sat5" | "agree5" | "nps11" | "change5" | "multi" | "single" | "text";

export interface Scale {
  key: ScaleKey;
  label: string;
  usedFor: string;
  points: string[];        // ordered low→high (empty for multi/single/text)
  scoring: string;
}

export const SCALES: Scale[] = [
  { key: "sat5", label: "5-pt Satisfaction", usedFor: "Service-area & customer-service questions",
    points: ["Very Dissatisfied", "Somewhat Dissatisfied", "Neutral", "Somewhat Satisfied", "Very Satisfied"],
    scoring: "TOP2 = Somewhat + Very Satisfied" },
  { key: "agree5", label: "5-pt Agreement", usedFor: "Resident-sentiment statements",
    points: ["Strongly Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Strongly Agree"],
    scoring: "TOP2 = Somewhat + Strongly Agree" },
  { key: "nps11", label: "11-pt NPS", usedFor: "Recommendation / advocacy",
    points: ["1–6 Detractor", "7–8 Passive", "9–10 Promoter"],
    scoring: "NPS = %Promoters − %Detractors" },
  { key: "change5", label: "5-pt Change", usedFor: "Safety-over-time (new 2025)",
    points: ["Significantly worsened", "Somewhat worsened", "Stayed the same", "Somewhat improved", "Significantly improved"],
    scoring: "TOP2 = Somewhat + Significantly improved" },
  { key: "multi", label: "Multi-select", usedFor: "Channels used, safety topics, support needs, engagement",
    points: [], scoring: "Report % selecting each option" },
  { key: "single", label: "Select one", usedFor: "Single-choice items", points: [], scoring: "Report % choosing each option" },
  { key: "text", label: "Open text", usedFor: "Final comment box", points: [], scoring: "Theme + sentiment code after fielding" },
];

export interface SurveyQuestion {
  n: number;
  section: string;
  text: string;
  scale: ScaleKey;
  options?: string[];     // for multi/single
  note?: string;          // logic / skip / context
  channels: string[];     // best collection channels
  new2025?: boolean;
  pulse: string;          // month it runs in the pulse rotation
}

const SAT = ["Very Dissatisfied", "Somewhat Dissatisfied", "Neutral", "Somewhat Satisfied", "Very Satisfied"];
const AGREE = ["Strongly Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Strongly Agree"];

export const QUESTIONS: SurveyQuestion[] = [
  { n: 1, section: "Advocacy & Overall", text: "How likely are you to recommend [Landlord] as a good place to live?", scale: "nps11", note: "Anchor question. Drives NPS. Ask every cycle.", channels: ["SMS", "Email", "Kiosk"], pulse: "Jan" },
  { n: 2, section: "Advocacy & Overall", text: "As a resident, how satisfied or dissatisfied are you with [Landlord] overall?", scale: "sat5", options: SAT, note: "Dependent variable for the drivers regression.", channels: ["SMS", "Email", "Kiosk", "Signage"], pulse: "Jan" },

  { n: 3, section: "Key Service Areas", text: "How satisfied are you with the cleanliness of your building?", scale: "sat5", options: SAT, channels: ["SMS", "Email", "Signage QR"], pulse: "Feb" },
  { n: 4, section: "Key Service Areas", text: "How satisfied are you with maintenance in your building/unit?", scale: "sat5", options: SAT, channels: ["SMS", "Email", "Kiosk"], pulse: "Mar" },
  { n: 5, section: "Key Service Areas", text: "How satisfied are you with the quality of maintenance work completed in your unit?", scale: "sat5", options: SAT, note: "Show only if resident had a maintenance visit (optional skip).", channels: ["SMS", "Email"], new2025: true, pulse: "Mar" },
  { n: 6, section: "Key Service Areas", text: "How satisfied are you with how quickly maintenance issues are resolved in your unit?", scale: "sat5", options: SAT, note: "Pairs with work-order data — Fuse5 can pre-fill context.", channels: ["SMS", "Email"], new2025: true, pulse: "Mar" },
  { n: 7, section: "Key Service Areas", text: "How satisfied are you with [Landlord] supporting you to maintain your tenancy (e.g., communications about rent owed)?", scale: "sat5", options: SAT, channels: ["Email", "Kiosk"], pulse: "Apr" },
  { n: 8, section: "Key Service Areas", text: "How satisfied are you with [Landlord] connecting you to support services (e.g., counselling, healthcare, food bank)?", scale: "sat5", options: SAT, channels: ["Email", "Kiosk"], pulse: "Apr" },
  { n: 9, section: "Key Service Areas", text: "How satisfied are you with your ability to participate in local decision-making for your building/community?", scale: "sat5", options: SAT, channels: ["Email", "Kiosk"], pulse: "Sep" },
  { n: 10, section: "Key Service Areas", text: "How satisfied are you with [Landlord]'s programs and services (e.g., youth programs, employment supports, scholarships)?", scale: "sat5", options: SAT, channels: ["Email", "Signage QR"], pulse: "Sep" },
  { n: 11, section: "Key Service Areas", text: "How satisfied are you with the safety level of your community?", scale: "sat5", options: SAT, note: "Strong driver of overall satisfaction — keep every cycle.", channels: ["SMS", "Email", "Kiosk"], pulse: "May" },

  { n: 12, section: "Community Safety", text: "When you think of community safety, which topics immediately come to mind?", scale: "multi", options: ["CSU/security patrols", "Fire safety & alarms", "Mechanical issues (elevators)", "Parking control", "Other"], note: "Surfaces salience, not satisfaction.", channels: ["SMS", "Kiosk"], new2025: true, pulse: "May" },
  { n: 13, section: "Community Safety", text: "Do you feel that safety in your community has improved, worsened, or stayed the same in the past year?", scale: "change5", note: "Trend signal independent of absolute score.", channels: ["SMS", "Email", "Kiosk"], new2025: true, pulse: "May" },
  { n: 14, section: "Community Safety", text: "Which of the following would make you feel safest in your home?", scale: "single", options: ["Security guard presence", "Safety-unit constable presence", "Police presence", "Response to violent incidents", "Community engagement", "Crisis response", "Parking enforcement", "Safety audits", "None of these"], channels: ["Kiosk", "Email"], new2025: true, pulse: "May" },

  { n: 15, section: "Support Needs & Engagement", text: "Would any of the following support services help you maintain your tenancy and day-to-day life?", scale: "multi", options: ["Financial assistance", "Food security", "Mental health", "Primary health care", "Senior services", "Youth services", "Skill-building", "Legal assistance", "None needed"], note: "Drives program planning. Maps to Fuse5 community/support content.", channels: ["Email", "Kiosk"], new2025: true, pulse: "Jun" },
  { n: 16, section: "Support Needs & Engagement", text: "Would you be interested in giving input on issues and solutions in your community in any of these ways?", scale: "multi", options: ["Open community meetings", "Action tables on policy/budget", "Issue-specific working groups", "Deputations to the Board", "Not interested"], note: "Identifies engageable residents.", channels: ["Email", "Kiosk"], new2025: true, pulse: "Jun" },

  { n: 17, section: "Customer Service — Call Centre", text: "How satisfied are you with the service provided by the Client Care Centre (call centre)?", scale: "sat5", options: SAT, channels: ["SMS", "Email"], pulse: "Jul" },
  { n: 18, section: "Customer Service — Call Centre", text: "How satisfied are you with call wait times to reach the Client Care Centre?", scale: "sat5", options: SAT, channels: ["SMS", "Email"], pulse: "Jul" },
  { n: 19, section: "Customer Service — Call Centre", text: "How satisfied are you with the accuracy and helpfulness of information provided by the Client Care Centre?", scale: "sat5", options: SAT, channels: ["SMS", "Email"], pulse: "Jul" },
  { n: 20, section: "Customer Service — Call Centre", text: "How satisfied are you with how polite and professional Client Care Centre staff are?", scale: "sat5", options: SAT, channels: ["SMS", "Email"], new2025: true, pulse: "Jul" },

  { n: 21, section: "Customer Service — Local Staff", text: "How satisfied are you with the service provided by local staff in your building/community?", scale: "sat5", options: SAT, channels: ["SMS", "Email", "Signage"], pulse: "Aug" },
  { n: 22, section: "Customer Service — Local Staff", text: "How satisfied are you with the availability of local building/community staff for one-on-one support?", scale: "sat5", options: SAT, note: "Repeatedly a Primary Improvement driver — prioritize.", channels: ["SMS", "Email"], pulse: "Aug" },
  { n: 23, section: "Customer Service — Local Staff", text: "How satisfied are you with staff response times to your inquiries (e.g., rent, maintenance requests)?", scale: "sat5", options: SAT, channels: ["SMS", "Email"], pulse: "Aug" },
  { n: 24, section: "Customer Service — Local Staff", text: "How satisfied are you with how polite and professional local staff are?", scale: "sat5", options: SAT, channels: ["SMS", "Email"], new2025: true, pulse: "Aug" },

  { n: 25, section: "Customer Service — Safety Staff", text: "How satisfied are you with the service provided by Community Safety Unit (CSU) staff?", scale: "sat5", options: SAT, channels: ["SMS", "Email"], pulse: "Aug" },
  { n: 26, section: "Customer Service — Safety Staff", text: "How satisfied are you with how polite and professional Community Safety Unit (CSU) staff are?", scale: "sat5", options: SAT, channels: ["SMS", "Email"], new2025: true, pulse: "Aug" },

  { n: 27, section: "Accessibility", text: "How satisfied are you with the physical accessibility of your unit (e.g., counter height, grab bars)?", scale: "sat5", options: SAT, channels: ["Email", "Kiosk"], pulse: "Oct" },
  { n: 28, section: "Accessibility", text: "How satisfied are you with the physical accessibility of your building (e.g., ramps, elevators)?", scale: "sat5", options: SAT, channels: ["Email", "Kiosk"], pulse: "Oct" },

  { n: 29, section: "Complaints", text: "How satisfied are you with how easy it is to make a complaint?", scale: "sat5", options: SAT, channels: ["Email", "Kiosk"], pulse: "Oct" },
  { n: 30, section: "Complaints", text: "How satisfied are you with staff response times to your complaints?", scale: "sat5", options: SAT, channels: ["Email", "Kiosk"], pulse: "Oct" },

  { n: 31, section: "Communication", text: "Which communication sources do you regularly use to receive [Landlord] information?", scale: "multi", options: ["Letters", "Posters", "Email", "Newsletter", "Call centre", "In-person staff", "Website", "Text/SMS", "Digital newsletter", "Social media", "Board/committee streams", "Other"], note: "Core Fuse5 question. Tracks SMS/email/digital growth.", channels: ["SMS", "Email", "Signage", "Kiosk"], pulse: "Nov" },
  { n: 32, section: "Communication", text: "How satisfied are you overall with [Landlord] communications to residents?", scale: "sat5", options: SAT, note: "Headline communication KPI.", channels: ["SMS", "Email", "Signage", "Kiosk"], pulse: "Nov" },

  { n: 33, section: "Resident Sentiment", text: "I have a strong sense of belonging in my building/community.", scale: "agree5", options: AGREE, channels: ["Email", "Kiosk"], pulse: "Dec" },
  { n: 34, section: "Resident Sentiment", text: "I feel welcome in [Landlord] offices and common spaces.", scale: "agree5", options: AGREE, channels: ["Email", "Kiosk"], pulse: "Dec" },
  { n: 35, section: "Resident Sentiment", text: "I am proud to live in my building/community.", scale: "agree5", options: AGREE, note: "Pride is a key NPS driver.", channels: ["Email", "Kiosk"], pulse: "Dec" },
  { n: 36, section: "Resident Sentiment", text: "I am proud to invite people to visit me in my home.", scale: "agree5", options: AGREE, channels: ["Email", "Kiosk"], pulse: "Dec" },
  { n: 37, section: "Resident Sentiment", text: "I feel respected by [Landlord] staff.", scale: "agree5", options: AGREE, channels: ["Email", "Kiosk"], pulse: "Dec" },
  { n: 38, section: "Resident Sentiment", text: "I feel respected by other residents.", scale: "agree5", options: AGREE, channels: ["Email", "Kiosk"], pulse: "Dec" },
  { n: 39, section: "Resident Sentiment", text: "[Landlord] staff take accountability.", scale: "agree5", options: AGREE, channels: ["Email", "Kiosk"], pulse: "Dec" },
  { n: 40, section: "Resident Sentiment", text: "[Landlord] staff act professionally.", scale: "agree5", options: AGREE, channels: ["Email", "Kiosk"], pulse: "Dec" },

  { n: 41, section: "Open Feedback", text: "Do you have any comments or suggestions on how [Landlord] can better serve you and your community?", scale: "text", note: "Theme/sentiment-code after collection.", channels: ["Email", "Kiosk"], pulse: "Any" },
];

export const SECTIONS: string[] = [...new Set(QUESTIONS.map((q) => q.section))];

export interface PulseStep { month: string; theme: string; questions: string; count: number; channels: string[]; notes: string }
export const PULSE_SCHEDULE: PulseStep[] = [
  { month: "Jan", theme: "Overall & Advocacy", questions: "Q1, Q2", count: 2, channels: ["SMS", "Email", "Kiosk"], notes: "Sets the annual baseline: overall satisfaction + NPS." },
  { month: "Feb", theme: "Cleanliness", questions: "Q3", count: 1, channels: ["SMS", "Signage QR"], notes: "Single-question pulse — highest completion." },
  { month: "Mar", theme: "Maintenance", questions: "Q4–Q6", count: 3, channels: ["SMS", "Email"], notes: "Trigger to residents with a recent work order." },
  { month: "Apr", theme: "Tenancy & Support", questions: "Q7, Q8", count: 2, channels: ["Email", "Kiosk"], notes: "Pairs with rent/support communications." },
  { month: "May", theme: "Community Safety", questions: "Q11–Q14", count: 4, channels: ["SMS", "Email", "Kiosk"], notes: "The safety block — strong satisfaction driver." },
  { month: "Jun", theme: "Support Needs & Engagement", questions: "Q15, Q16", count: 2, channels: ["Email", "Kiosk"], notes: "Feeds program planning and engagement lists." },
  { month: "Jul", theme: "Call Centre", questions: "Q17–Q20", count: 4, channels: ["SMS", "Email"], notes: "Run after a call-centre interaction where possible." },
  { month: "Aug", theme: "Local & Safety Staff", questions: "Q21–Q26", count: 6, channels: ["SMS", "Email"], notes: "Largest block — split into two sends if needed." },
  { month: "Sep", theme: "Decision-making & Programs", questions: "Q9, Q10", count: 2, channels: ["Email", "Signage QR"], notes: "Aligns with engagement season." },
  { month: "Oct", theme: "Accessibility & Complaints", questions: "Q27–Q30", count: 4, channels: ["Email", "Kiosk"], notes: "Accessibility + complaints handling." },
  { month: "Nov", theme: "Communication", questions: "Q31, Q32", count: 2, channels: ["All channels"], notes: "Tracks channel mix and comms satisfaction." },
  { month: "Dec", theme: "Resident Sentiment", questions: "Q33–Q40", count: 8, channels: ["Email", "Kiosk"], notes: "Belonging/pride/respect block — one reflective survey." },
  { month: "Any", theme: "Open Feedback", questions: "Q41", count: 1, channels: ["Email", "Kiosk"], notes: "Always-on comment box, surfaced on every channel." },
];

export interface Demographic { code: string; question: string; type: string; options: string }
export const DEMOGRAPHICS: Demographic[] = [
  { code: "D1", question: "Region / property", type: "Select one", options: "[Per client portfolio]" },
  { code: "D2", question: "Survey language", type: "Select one", options: "English; French; Spanish; Simplified Chinese; Amharic; Farsi; Arabic; Tamil; Bengali; Other" },
  { code: "D3", question: "Age", type: "Select one", options: "16-24; 25-29; 30-39; 40-49; 50-58; 59-64; 65-69; 70-79; 80+; Prefer not to answer" },
  { code: "D4", question: "Gender", type: "Select one", options: "Woman; Man; Non-binary; Trans woman; Trans man; Two-Spirit; Other; Prefer not to answer" },
  { code: "D5", question: "Language spoken at home", type: "Select one", options: "[Top languages] + Other; Prefer not to answer" },
  { code: "D6", question: "Disability", type: "Multi-select", options: "Physical illness/pain; Mental health; Mobility; Dexterity; Learning; Deaf/HoH; Blind/low vision; Developmental; Speech; Other; No disability; Prefer not to answer" },
  { code: "D7", question: "Race / ethnicity", type: "Select one", options: "Black; White; South Asian; Arab/ME/W Asian; Latin American; SE Asian; East Asian; Indigenous; Prefer not to answer" },
  { code: "D8", question: "Household composition", type: "Select one", options: "[Optional — single adult; family with children; seniors]" },
  { code: "D9", question: "Years as a resident", type: "Select one", options: "[Optional — <1; 1-3; 4-9; 10+]" },
];

// ---- Results-report model (mirrors the .docx) -----------------------------
// Sector benchmark from the TCHC 2025 Tenant Survey, used as the comparison line.
export const SECTOR_BENCHMARK = { overall: 56, nps: -8, communication: 57, safety: 44, responseRate: 14 };

export interface HeadlineMetric { metric: string; thisCycle: string; prior: string; change: string }
export interface ServiceRow { area: string; top2: number; prior: number; regionSpread: string }
export interface DriverItem { service: string; quadrant: "Primary Improvement" | "Primary Maintenance" | "Secondary Improvement" | "Secondary Maintenance" }
export interface ChannelRow { channel: string; thisCycle: number; prior: number }
export interface SentimentRow { statement: string; top2: number; change: number }
export interface ActionRow { priority: string; action: string; owner: string; timeframe: string }

// A fully-worked SAMPLE report (illustrative numbers, anchored near the sector
// benchmark) so the report renders complete as a model. Swap in live response
// aggregates once a survey has been fielded.
export const SAMPLE_REPORT = {
  client: "WoodGreen Community Housing",
  period: "Q2 2026",
  fielded: { distribution: "Census across 1,180 residents at 31 properties", channels: "SMS link, email link, signage QR, touchscreen kiosk", window: "Apr 1 – May 15, 2026", responses: 248, responseRate: 21 },
  headline: [
    { metric: "Overall satisfaction (TOP2)", thisCycle: "61%", prior: "57%", change: "+4 pts" },
    { metric: "Net Promoter Score (NPS)", thisCycle: "-3", prior: "-8", change: "+5" },
    { metric: "Communication satisfaction (TOP2)", thisCycle: "64%", prior: "59%", change: "+5 pts" },
    { metric: "Community safety satisfaction (TOP2)", thisCycle: "48%", prior: "44%", change: "+4 pts" },
    { metric: "Response rate", thisCycle: "21%", prior: "14%", change: "+7 pts" },
  ] as HeadlineMetric[],
  takeaways: [
    "Local-staff availability is the biggest driver-based opportunity: high impact on overall satisfaction, lowest satisfaction (42%) — fix first.",
    "Communication satisfaction rose +5 pts as digital channel use climbed; the pulse model is shortening the feedback loop.",
    "Age is the widest equity gap: residents under 40 sit 11 pts below those 65+ on overall satisfaction.",
  ],
  drivers: [
    { service: "Local-staff availability (Q22)", quadrant: "Primary Improvement" },
    { service: "Community safety level (Q11)", quadrant: "Primary Improvement" },
    { service: "Timeliness of maintenance (Q6)", quadrant: "Primary Improvement" },
    { service: "Building cleanliness (Q3)", quadrant: "Primary Maintenance" },
    { service: "Communications overall (Q32)", quadrant: "Primary Maintenance" },
    { service: "Programs & services (Q10)", quadrant: "Secondary Improvement" },
  ] as DriverItem[],
  serviceAreas: [
    { area: "Overall satisfaction", top2: 61, prior: 57, regionSpread: "Danforth 68% / Jane 51%" },
    { area: "Building cleanliness", top2: 72, prior: 70, regionSpread: "Coxwell 80% / Jane 60%" },
    { area: "Building/unit maintenance", top2: 58, prior: 55, regionSpread: "Danforth 64% / Jane 49%" },
    { area: "Quality of maintenance work", top2: 60, prior: 0, regionSpread: "new 2025" },
    { area: "Timeliness of maintenance", top2: 49, prior: 0, regionSpread: "new 2025" },
    { area: "Support to maintain tenancy", top2: 63, prior: 60, regionSpread: "Cosburn 69% / Jane 55%" },
    { area: "Connection to support services", top2: 57, prior: 54, regionSpread: "Cosburn 63% / Renwick 50%" },
    { area: "Local decision-making", top2: 45, prior: 43, regionSpread: "Danforth 52% / Jane 38%" },
    { area: "Programs & services", top2: 59, prior: 56, regionSpread: "Coxwell 66% / Renwick 50%" },
    { area: "Community safety level", top2: 48, prior: 44, regionSpread: "Coxwell 58% / Jane 36%" },
  ] as ServiceRow[],
  customerService: [
    { touchpoint: "Client Care Centre", service: 56, responsiveness: 51, professionalism: 70 },
    { touchpoint: "Local / building staff", service: 59, responsiveness: 47, professionalism: 73 },
    { touchpoint: "Community Safety Unit", service: 52, responsiveness: null as number | null, professionalism: 68 },
  ],
  channels: [
    { channel: "Text / SMS", thisCycle: 54, prior: 41 },
    { channel: "Email", thisCycle: 61, prior: 52 },
    { channel: "Digital newsletter", thisCycle: 33, prior: 24 },
    { channel: "In-person staff", thisCycle: 48, prior: 51 },
    { channel: "Posters", thisCycle: 44, prior: 49 },
    { channel: "Letters", thisCycle: 39, prior: 47 },
    { channel: "Call centre", thisCycle: 36, prior: 38 },
    { channel: "Website", thisCycle: 29, prior: 27 },
    { channel: "Social media", thisCycle: 22, prior: 18 },
  ] as ChannelRow[],
  sentiment: [
    { statement: "Sense of belonging", top2: 58, change: +3 },
    { statement: "Feel welcome in common spaces", top2: 64, change: +2 },
    { statement: "Pride in community", top2: 60, change: +4 },
    { statement: "Pride in home", top2: 66, change: +3 },
    { statement: "Respected by staff", top2: 62, change: +5 },
    { statement: "Respected by other residents", top2: 55, change: +1 },
    { statement: "Staff take accountability", top2: 49, change: +4 },
    { statement: "Staff act professionally", top2: 67, change: +3 },
  ] as SentimentRow[],
  equity: [
    "By age: residents under 40 trend 11 pts below those 65+; they prioritize maintenance timeliness and digital communication.",
    "By gender: women rated community safety 6 pts lower and prioritized mental-health and crisis-response supports.",
    "By region/property: highest overall satisfaction at Danforth (68%); lowest at Jane St (51%).",
    "By disability/language: residents requesting accommodations rated building accessibility 9 pts lower (n permitting).",
  ],
  actions: [
    { priority: "Primary Improvement #1 — Local-staff availability", action: "Publish per-building staff office hours on signage + SMS; add a callback SLA.", owner: "Operations", timeframe: "Q3" },
    { priority: "Primary Improvement #2 — Community safety", action: "Stand up the safety pulse + CSU presence schedule at the 3 lowest-scoring sites.", owner: "Community Safety", timeframe: "Q3" },
    { priority: "Protect — Communications", action: "Keep the monthly pulse cadence; expand SMS opt-in at move-in.", owner: "Resident Engagement", timeframe: "Ongoing" },
  ] as ActionRow[],
};

export const SURVEY_META = {
  title: "Resident Satisfaction Survey",
  source: "Adapted from the Toronto Community Housing 2025 Tenant Survey model",
  counts: { satisfaction: QUESTIONS.filter((q) => q.scale === "sat5" || q.scale === "agree5" || q.scale === "nps11").length, multi: QUESTIONS.filter((q) => q.scale === "multi" || q.scale === "single").length, demographics: DEMOGRAPHICS.length, total: QUESTIONS.length },
};
