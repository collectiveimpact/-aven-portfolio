import { getJourneys, getComposeTemplates } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { JourneysClient } from "./journeys-client";

// Journeys — lifecycle automation (trigger → delay → message → split). The
// "automate" middle of segment → automate → measure.
export default async function JourneysPage() {
  const [journeys, templates, me] = await Promise.all([getJourneys(), getComposeTemplates(), getCurrentUser()]);
  const canEdit = me?.role ? canPublish(me.role) : false;

  // Note: JourneysClient already renders an in-context KPI strip (active /
  // enrolled / drafts), so no separate strip is added here — analytics already
  // live in the builder for this page.
  return (
    <main className="f5-content">
      <div className="f5-page-title">Journeys</div>
      <div className="f5-page-sub">Automated resident communication flows — triggered, multi-step, multi-channel.</div>
      <JourneysClient journeys={journeys} templates={templates} canEdit={canEdit} />
    </main>
  );
}
