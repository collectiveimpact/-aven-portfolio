"use client";

import { useState, useTransition } from "react";
import { pushSignageToWallboard } from "./actions";

// Mirrors SignageFeed (kept inline so this client file doesn't import the
// server-only feed module).
interface Feed {
  notices: { title: string; category: string }[];
  survey: { active: boolean; title: string; url: string } | null;
  kpis: { label: string; value: string }[];
  emergency: { active: boolean; message: string };
}

const dim = "var(--f5-text-muted)";

// "Live signage feed → Wallboard": shows the multi-zone payload Fuse5 publishes
// into a Wallboard datasource, and pushes it on demand. Wallboard slides bind to
// these zones, so a push updates every screen.
export function WallboardFeed({ feed, configured, canEdit }: { feed: Feed; configured: boolean; canEdit: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const push = () => {
    setMsg(null);
    start(async () => {
      const r = await pushSignageToWallboard(window.location.origin);
      setMsg(r.ok ? { ok: true, text: `Pushed — ${r.notices} notices + survey/KPIs live on screens.` } : { ok: false, text: r.error ?? "Push failed." });
    });
  };

  const Zone = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div style={{ border: "1px solid var(--f5-border)", borderRadius: 8, padding: "10px 12px", flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.6, color: dim, marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );

  return (
    <div className="f5-card" style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, color: "var(--f5-text)" }}>Live signage feed → Wallboard</div>
          <div style={{ fontSize: 12.5, color: dim }}>The multi-zone data Fuse5 publishes to your Wallboard datasource. Slides bind to these zones, so one push refreshes every screen.</div>
        </div>
        {canEdit && <button className="f5-btn primary" disabled={pending} onClick={push}>{pending ? "Pushing…" : "Push to Wallboard"}</button>}
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
        <Zone label="Emergency banner">
          <div style={{ fontSize: 13, color: feed.emergency.active ? "var(--f5-red)" : dim }}>{feed.emergency.active ? feed.emergency.message : "No active emergency"}</div>
        </Zone>
        <Zone label={`Notices (${feed.notices.length})`}>
          <div style={{ fontSize: 12, color: "var(--f5-text)", lineHeight: 1.5 }}>{feed.notices.slice(0, 4).map((n) => n.title).join(" · ") || "—"}</div>
        </Zone>
        <Zone label="Resident survey">
          <div style={{ fontSize: 12.5, color: feed.survey ? "var(--f5-teal)" : dim }}>{feed.survey ? `QR → ${feed.survey.title}` : "No live survey"}</div>
        </Zone>
        <Zone label="KPIs">
          <div style={{ fontSize: 12, color: "var(--f5-text)" }}>{feed.kpis.map((k) => `${k.label}: ${k.value}`).join(" · ")}</div>
        </Zone>
      </div>

      {!configured && <div style={{ fontSize: 12, color: dim, marginTop: 10 }}>Set <code>WALLBOARD_API_KEY</code> (scope: Internal Datasource Write) + <code>WALLBOARD_DATASOURCE_ID</code> to push. The feed above is live Fuse5 data and previews exactly what screens will show.</div>}
      {msg && <div style={{ fontSize: 13, marginTop: 10, color: msg.ok ? "var(--f5-green,#34d399)" : "var(--f5-red)" }}>{msg.text}</div>}
    </div>
  );
}
