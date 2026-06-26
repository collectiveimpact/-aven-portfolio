import "server-only";
import { getContent, getSurveys, getCompliance } from "@/lib/queries";

// The live Fuse5 "signage feed" — the JSON Fuse5 PUSHes into a Wallboard datasource.
// Wallboard slides/playlists bind to these fields and render them across every
// screen, so updating this feed updates the wall boards. Multi-zone friendly:
// an emergency banner zone, a notices ticker, a survey QR, and a KPI strip.
export interface SignageFeed {
  updatedAt: string;
  provider: "fuse5";
  emergency: { active: boolean; message: string };
  notices: { title: string; category: string }[];
  survey: { active: boolean; title: string; url: string } | null;
  kpis: { label: string; value: string }[];
}

export async function buildSignageFeed(origin: string): Promise<SignageFeed> {
  const [content, surveys, compliance] = await Promise.all([getContent(), getSurveys(), getCompliance()]);

  const notices = content.filter((c) => c.type === "notice").slice(0, 8)
    .map((c) => ({ title: c.title, category: c.title.trim().match(/^([A-Z]{2,3})/)?.[1] ?? "Notice" }));

  const live = surveys.find((s) => s.status === "live");
  const survey = live ? { active: true, title: live.title, url: `${origin.replace(/\/$/, "")}/s/${live.id}` } : null;

  const overdue = compliance.filter((c) => c.status === "overdue").length;
  const dueSoon = compliance.filter((c) => c.status === "due_soon").length;
  const kpis = [
    { label: "Live notices", value: String(notices.length) },
    { label: "Compliance overdue", value: String(overdue) },
    { label: "Due soon", value: String(dueSoon) },
  ];

  return {
    updatedAt: new Date().toISOString(),
    provider: "fuse5",
    emergency: { active: false, message: "" },   // wired off by default; an emergency broadcast flips this
    notices, survey, kpis,
  };
}
