import Link from "next/link";
import { getContent, getDisplays, type ContentRow } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { ContentLibrary } from "./content-library";
import { SignageGallery } from "./signage-gallery";

export default async function ContentPage() {
  const [content, displays, me] = await Promise.all([getContent(), getDisplays(), getCurrentUser()]);
  const canEdit = me?.role ? canPublish(me.role) : false;
  const byType = (t: ContentRow["type"]) => content.filter((c) => c.type === t).length;
  const onlineDisplays = displays.filter((d) => d.status === "online").length;

  return (
    <main className="f5-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div className="f5-page-title">Content Library</div>
          <div className="f5-page-sub">The signage library that feeds your displays — every notice, slide & clip your screens can play.</div>
        </div>
        <Link className="f5-btn" href="/displays" style={{ marginTop: 4 }}>🖥️ Open Displays →</Link>
      </div>

      {/* Purpose / relationship banner — content → displays */}
      <div className="f5-card" style={{ marginTop: 16, borderLeft: "3px solid var(--f5-teal)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 700, color: "var(--f5-text)" }}>This library powers your signage network</div>
          <div style={{ fontSize: 12.5, color: "var(--f5-text-muted)", marginTop: 3 }}>
            Assets here are assigned to playlists and pushed to the {displays.length} display{displays.length === 1 ? "" : "s"} across your portfolio
            {onlineDisplays > 0 && <> — <span style={{ color: "var(--f5-green)" }}>{onlineDisplays} online right now</span></>}.
          </div>
        </div>
        <span className="f5-badge ok">{content.length} asset{content.length === 1 ? "" : "s"}</span>
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Notices</div><div className="f5-kpi-value">{byType("notice")}</div><div className="f5-kpi-sub">text advisories</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Images</div><div className="f5-kpi-value">{byType("image")}</div><div className="f5-kpi-sub">static slides</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Videos</div><div className="f5-kpi-value">{byType("video")}</div><div className="f5-kpi-sub">motion clips</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Playlists</div><div className="f5-kpi-value">{byType("playlist")}</div><div className="f5-kpi-sub">sequenced loops</div></div>
      </div>

      <div style={{ marginTop: 22 }}><SignageGallery /></div>

      <ContentLibrary items={content} canEdit={canEdit} displayCount={displays.length} />
    </main>
  );
}
