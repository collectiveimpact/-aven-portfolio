import type { ContentItem } from "@/lib/types";

// Content Library — assets that play on the signage network. Demo data.
const ORG = "demo-org";

const CONTENT: ContentItem[] = [
  { id: "c-01", org_id: ORG, title: "Welcome Loop — Lobby", type: "playlist", duration_s: 120, updated_at: "2026-05-30" },
  { id: "c-02", org_id: ORG, title: "Fire Safety Notice", type: "notice", duration_s: 15, updated_at: "2026-05-29" },
  { id: "c-03", org_id: ORG, title: "Community BBQ — June 14", type: "image", duration_s: 10, updated_at: "2026-05-28" },
  { id: "c-04", org_id: ORG, title: "Rent Reminder Notice", type: "notice", duration_s: 12, updated_at: "2026-05-27" },
  { id: "c-05", org_id: ORG, title: "Welcome to Hamilton Kiwanis", type: "video", duration_s: 45, updated_at: "2026-05-26" },
  { id: "c-06", org_id: ORG, title: "Resident Survey Promo", type: "image", duration_s: 10, updated_at: "2026-05-24" },
  { id: "c-07", org_id: ORG, title: "Elevator Maintenance Advisory", type: "notice", duration_s: 15, updated_at: "2026-05-23" },
  { id: "c-08", org_id: ORG, title: "Amenities Tour", type: "video", duration_s: 90, updated_at: "2026-05-21" },
  { id: "c-09", org_id: ORG, title: "Seasonal Reminders Loop", type: "playlist", duration_s: 180, updated_at: "2026-05-19" },
  { id: "c-10", org_id: ORG, title: "Garden Project Photos", type: "image", duration_s: 10, updated_at: "2026-05-16" },
];

const TYPE_LABEL: Record<ContentItem["type"], string> = {
  image: "Image",
  video: "Video",
  notice: "Notice",
  playlist: "Playlist",
};

const TYPE_BADGE: Record<ContentItem["type"], string> = {
  image: "f5-badge",
  video: "f5-badge",
  notice: "f5-badge warn",
  playlist: "f5-badge ok",
};

function duration(s: number | null): string {
  if (s === null) return "—";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}m`;
}

export default async function ContentPage() {
  const byType = (t: ContentItem["type"]) => CONTENT.filter((c) => c.type === t).length;

  return (
    <main className="f5-content">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div className="f5-page-title">Content Library</div>
          <div className="f5-page-sub">Assets scheduled across the signage network.</div>
        </div>
        <button className="f5-btn primary" style={{ flexShrink: 0, marginTop: 4 }}>↑ Upload</button>
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 18 }}>
        <div className="f5-card"><div className="f5-kpi-label">Notices</div><div className="f5-kpi-value">{byType("notice")}</div><div className="f5-kpi-sub">text advisories</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Images</div><div className="f5-kpi-value">{byType("image")}</div><div className="f5-kpi-sub">static slides</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Videos</div><div className="f5-kpi-value">{byType("video")}</div><div className="f5-kpi-sub">motion clips</div></div>
        <div className="f5-card"><div className="f5-kpi-label">Playlists</div><div className="f5-kpi-value">{byType("playlist")}</div><div className="f5-kpi-sub">sequenced loops</div></div>
      </div>

      <div className="f5-section-title">Library</div>
      <div className="f5-card" style={{ padding: 0 }}>
        <table className="f5-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Type</th>
              <th>Duration</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {CONTENT.map((c) => (
              <tr key={c.id}>
                <td style={{ color: "var(--f5-text)" }}>{c.title}</td>
                <td><span className={TYPE_BADGE[c.type]}>{TYPE_LABEL[c.type]}</span></td>
                <td>{duration(c.duration_s)}</td>
                <td>{c.updated_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>
        Data source: demo seed
      </div>
    </main>
  );
}
