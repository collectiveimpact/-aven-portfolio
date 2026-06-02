"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveNotice, publishNotice } from "../actions";
import type { WorkOrderDetail, RecipientSummary, NoticeDraft } from "@/lib/queries";

const IMAGE_THEME: Record<string, { emoji: string; color: string }> = {
  water: { emoji: "💧", color: "#2563EB" },
  fire: { emoji: "🔥", color: "#DC2626" },
  elevator: { emoji: "🛗", color: "#7C3AED" },
  heat: { emoji: "🌡️", color: "#EA580C" },
  pest: { emoji: "🐜", color: "#059669" },
  default: { emoji: "📢", color: "#0E7490" },
};
const CATEGORIES = ["default", "water", "fire", "elevator", "heat", "pest"];

export function NoticeStudio({ wo, recipients }: { wo: WorkOrderDetail; recipients: RecipientSummary }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  const [n, setN] = useState(wo.notice);
  const [title, setTitle] = useState(wo.title);
  const [channels, setChannels] = useState<string[]>(wo.channels.length ? wo.channels : ["email", "sms", "display"]);
  const [schedule, setSchedule] = useState(wo.schedule);
  const [drafts, setDrafts] = useState<NoticeDraft[]>(wo.drafts);
  const [status, setStatus] = useState(wo.noticeStatus);

  const theme = IMAGE_THEME[n.imageCategory] ?? IMAGE_THEME.default;
  const email = drafts.find((d) => d.channel === "email");
  const sms = drafts.find((d) => d.channel === "sms");
  const set = (k: keyof typeof n, v: string) => setN((p) => ({ ...p, [k]: v }));
  const toggle = (c: string) => setChannels((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  function save(regenerate: boolean) {
    startTransition(async () => {
      const r = await saveNotice({ id: wo.id, facts: { ...n, operationTitle: n.operationTitle || title }, channels, schedule, regenerate });
      if (r.ok) { if (r.drafts) setDrafts(r.drafts); setMsg(regenerate ? "Regenerated drafts." : "Saved."); }
      else setMsg(r.error ?? "Error");
    });
  }
  function publish() {
    startTransition(async () => {
      const r = await publishNotice(wo.id);
      if (r.ok) { setStatus("published"); setMsg(`Published — ${r.sent ?? 0} email recipients.`); router.refresh(); }
      else setMsg(r.error ?? "Error");
    });
  }

  return (
    <main className="f5-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="f5-page-title">WO &amp; Notices</div>
          <div className="f5-page-sub">{wo.propertyName} · <span className={`f5-badge ${status === "published" ? "ok" : "warn"}`}>{status === "published" ? "Published" : "Draft"}</span></div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/workorders" className="f5-btn">Cancel</Link>
          <button className="f5-btn primary" disabled={pending} onClick={publish}>{pending ? "Working…" : "Publish"}</button>
        </div>
      </div>

      {msg && <div className="f5-badge ok" style={{ display: "inline-block", marginTop: 12 }}>{msg}</div>}

      <div className="f5-grid" style={{ gridTemplateColumns: "minmax(280px, 380px) 1fr", marginTop: 16, alignItems: "start" }}>
        {/* LEFT — editable content */}
        <div className="f5-card">
          <div className="f5-section-title" style={{ marginTop: 0 }}>WO Content</div>
          <label className="f5-label">Contact Info</label>
          <input className="f5-input" value={n.contactInfo} onChange={(e) => set("contactInfo", e.target.value)} />
          <label className="f5-label">Operation Title</label>
          <input className="f5-input" value={n.operationTitle} onChange={(e) => set("operationTitle", e.target.value)} />
          <label className="f5-label">Image / Incident</label>
          <select className="f5-select" value={n.imageCategory} onChange={(e) => set("imageCategory", e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</option>)}
          </select>
          <label className="f5-label">Date</label>
          <input className="f5-input" value={n.dateText} onChange={(e) => set("dateText", e.target.value)} />
          <label className="f5-label">Title</label>
          <input className="f5-input" value={title} onChange={(e) => setTitle(e.target.value)} />
          <label className="f5-label">Floors / Units Affected</label>
          <input className="f5-input" value={n.affected} onChange={(e) => set("affected", e.target.value)} />
          <label className="f5-label">Call to Action</label>
          <input className="f5-input" value={n.cta} onChange={(e) => set("cta", e.target.value)} />
          <label className="f5-label">Channels</label>
          <div className="f5-chips">
            {[["email", "Email"], ["sms", "SMS"], ["display", "Signage"]].map(([k, l]) => (
              <span key={k} className={`f5-chip${channels.includes(k) ? " active" : ""}`} onClick={() => toggle(k)}>{l}</span>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button className="f5-btn" disabled={pending} onClick={() => save(false)}>Save Draft</button>
            <button className="f5-btn primary" disabled={pending} onClick={() => save(true)}>{pending ? "…" : "Regenerate AI"}</button>
          </div>
        </div>

        {/* RIGHT — previews */}
        <div className="f5-grid" style={{ gridTemplateColumns: "1fr" }}>
          {/* Signage preview */}
          <div>
            <div className="f5-section-title" style={{ marginTop: 0 }}>Digital Signage Preview</div>
            <div style={{ display: "flex", borderRadius: 12, overflow: "hidden", border: "1px solid var(--f5-border)", minHeight: 200 }}>
              <div style={{ flex: "0 0 42%", background: theme.color, color: "#fff", padding: 20, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
                <div style={{ fontSize: 54 }}>{theme.emoji}</div>
                <div style={{ fontWeight: 800, fontSize: 18, marginTop: 8, textTransform: "uppercase", letterSpacing: 1 }}>{n.operationTitle || title}</div>
              </div>
              <div style={{ flex: 1, background: "#fff", color: "#0B0E14", padding: "22px 24px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#444" }}>{n.dateText || "Date / time"}</div>
                <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.05, margin: "6px 0" }}>{title}</div>
                <div style={{ fontSize: 14, color: "#666" }}>{n.affected || "Affected units"}</div>
                <div style={{ fontSize: 13, color: "#333", marginTop: 12 }}>{n.cta || "Call to action"}</div>
              </div>
            </div>
            <div style={{ height: 5, display: "flex" }}><span style={{ flex: 1, background: "#FBBF24" }} /><span style={{ flex: 1, background: "#34D399" }} /><span style={{ flex: 1, background: "#EF4444" }} /></div>
          </div>

          {/* Email preview */}
          <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--f5-border)" }}>
              <strong>Email</strong><span className="f5-badge">AI generated</span>
            </div>
            <div style={{ background: theme.color, color: "#fff", padding: 16, fontWeight: 700 }}>{email?.subject || title}</div>
            <div style={{ padding: 16, whiteSpace: "pre-wrap", fontSize: 13, color: "var(--f5-text-secondary)" }}>{email?.body || "No email draft — Regenerate AI."}</div>
          </div>

          {/* SMS preview */}
          <div className="f5-card">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}><strong>SMS</strong><span className="f5-badge">AI generated</span></div>
            <div style={{ background: "var(--f5-surface-2)", borderRadius: 12, padding: "10px 14px", fontSize: 13, maxWidth: 380 }}>{sms?.body || "No SMS draft — Regenerate AI."}</div>
          </div>

          {/* Recipients + schedule */}
          <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="f5-card">
              <div className="f5-section-title" style={{ marginTop: 0 }}>Recipients ({recipients.total})</div>
              <div style={{ fontSize: 13, color: "var(--f5-text-secondary)" }}>✉ {recipients.email} email · 💬 {recipients.sms} SMS (by preferred channel)</div>
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--f5-text-muted)" }}>
                {recipients.total === 0 ? "No tenants found for this property." : recipients.sample.map((s) => `${s.name} (${s.channel})`).join(", ") + (recipients.total > 5 ? "…" : "")}
              </div>
            </div>
            <div className="f5-card">
              <div className="f5-section-title" style={{ marginTop: 0 }}>Schedule</div>
              <label className="f5-label">Send window</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="f5-input" placeholder="Start" value={schedule.start} onChange={(e) => setSchedule({ ...schedule, start: e.target.value })} />
                <input className="f5-input" placeholder="End" value={schedule.end} onChange={(e) => setSchedule({ ...schedule, end: e.target.value })} />
              </div>
              <label className="f5-label">Mode</label>
              <select className="f5-select" value={schedule.mode} onChange={(e) => setSchedule({ ...schedule, mode: e.target.value })}>
                <option value="once">Send once</option>
                <option value="notification">As notification</option>
                <option value="reminder">As reminder</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
