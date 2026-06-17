import { getContent, type ContentRow } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { ContentTable } from "./content-table";

export default async function ContentPage() {
  const [content, me] = await Promise.all([getContent(), getCurrentUser()]);
  const canEdit = me?.role ? canPublish(me.role) : false;
  const byType = (t: ContentRow["type"]) => content.filter((c) => c.type === t).length;

  return (
    <main className="f5-content">
      <div className="f5-page-title">Content Library</div>
      <div className="f5-page-sub">Assets scheduled across the signage network.</div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Notices</div><div className="f5-kpi-value">{byType("notice")}</div><div className="f5-kpi-sub">text advisories</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Images</div><div className="f5-kpi-value">{byType("image")}</div><div className="f5-kpi-sub">static slides</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Videos</div><div className="f5-kpi-value">{byType("video")}</div><div className="f5-kpi-sub">motion clips</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Playlists</div><div className="f5-kpi-value">{byType("playlist")}</div><div className="f5-kpi-sub">sequenced loops</div></div>
      </div>

      <ContentTable items={content} canEdit={canEdit} />
    </main>
  );
}
