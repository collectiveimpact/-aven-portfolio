"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { saveNotice, publishNotice, submitForReview, approveNotice, rejectNotice } from "../actions";
import type { WorkOrderDetail, RecipientSummary, NoticeDraft } from "@/lib/queries";
import { renderNoticeEmailHtml, themeFor } from "@/lib/notice-template";
import { RequestChat } from "./request-chat";

const STEPS: { key: string; label: string }[] = [
  { key: "draft", label: "Draft" },
  { key: "pending_review", label: "Review" },
  { key: "approved", label: "Approved" },
  { key: "published", label: "Sent" },
];
const stepIndex = (s: string) => Math.max(0, STEPS.findIndex((x) => x.key === (s === "none" ? "draft" : s)));

const CATEGORIES = ["default", "water", "fire", "elevator", "heat", "pest"];

export function NoticeStudio({ wo, recipients, canApprove, orgName }: { wo: WorkOrderDetail; recipients: RecipientSummary; canApprove: boolean; orgName: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  const [n, setN] = useState(wo.notice);
  const [title, setTitle] = useState(wo.title);
  const [channels, setChannels] = useState<string[]>(wo.channels.length ? wo.channels : ["email", "sms", "display"]);
  const [schedule, setSchedule] = useState(wo.schedule);
  const [drafts, setDrafts] = useState<NoticeDraft[]>(wo.drafts);
  const [status, setStatus] = useState(wo.noticeStatus);

  const theme = themeFor(n.imageCategory);
  const email = drafts.find((d) => d.channel === "email");
  const sms = drafts.find((d) => d.channel === "sms");
  const emailHtml = email
    ? renderNoticeEmailHtml({ orgName, propertyName: wo.propertyName, title, subject: email.subject, body: email.body, cta: n.cta, dateText: n.dateText, affected: n.affected, contactInfo: n.contactInfo, imageCategory: n.imageCategory })
    : null;
  const set = (k: keyof typeof n, v: string) => setN((p) => ({ ...p, [k]: v }));
  const toggle = (c: string) => setChannels((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  function save(regenerate: boolean) {
    startTransition(async () => {
      const r = await saveNotice({ id: wo.id, facts: { ...n, operationTitle: n.operationTitle || title }, channels, schedule, regenerate });
      if (r.ok) { if (r.drafts) setDrafts(r.drafts); setMsg(regenerate ? "Regenerated drafts." : "Saved."); }
      else setMsg(r.error ?? "Error");
    });
  }
  function runStep(fn: () => Promise<{ ok: boolean; error?: string; sent?: number }>, next: typeof status, okMsg: string) {
    startTransition(async () => {
      const r = await fn();
      if (r.ok) { setStatus(next); setMsg(typeof r.sent === "number" ? `${okMsg} — ${r.sent} email recipients.` : okMsg); router.refresh(); }
      else setMsg(r.error ?? "Error");
    });
  }
  const submit = () => runStep(() => submitForReview(wo.id), "pending_review", "Submitted for review");
  const approve = () => runStep(() => approveNotice(wo.id), "approved", "Approved");
  const reject = () => runStep(() => rejectNotice(wo.id), "draft", "Returned to draft");
  const publish = () => runStep(() => publishNotice(wo.id), "published", "Published");

  return (
    <main className="f5-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="f5-page-title">WO &amp; Notices</div>
          <div className="f5-page-sub">{wo.propertyName}</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Link href="/workorders" className="f5-btn">Cancel</Link>
          {(status === "none" || status === "draft") && (
            <button className="f5-btn primary" disabled={pending} onClick={submit}>{pending ? "…" : "Submit for Review →"}</button>
          )}
          {status === "pending_review" && canApprove && (
            <>
              <button className="f5-btn" disabled={pending} onClick={reject}>Return to Draft</button>
              <button className="f5-btn primary" disabled={pending} onClick={approve}>{pending ? "…" : "Approve →"}</button>
            </>
          )}
          {status === "pending_review" && !canApprove && <span className="f5-badge warn">Awaiting approval</span>}
          {status === "approved" && (
            <button className="f5-btn primary" disabled={pending} onClick={publish} style={{ background: "var(--f5-green)", color: "#04201f" }}>{pending ? "…" : "Publish & Send"}</button>
          )}
          {status === "published" && <span className="f5-badge ok">Sent ✓</span>}
        </div>
      </div>

      {/* Approval stepper: Draft → Review → Approved → Sent */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 14 }}>
        {STEPS.map((s, i) => {
          const cur = stepIndex(status);
          const state = i < cur ? "done" : i === cur ? "active" : "todo";
          const color = state === "todo" ? "var(--f5-text-dim)" : state === "active" ? "var(--f5-teal)" : "var(--f5-green)";
          return (
            <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${color}`, color, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700 }}>{state === "done" ? "✓" : i + 1}</span>
              <span style={{ color, fontSize: 12, fontWeight: 600 }}>{s.label}</span>
              {i < STEPS.length - 1 && <span style={{ width: 28, height: 2, background: i < cur ? "var(--f5-green)" : "var(--f5-border)" }} />}
            </div>
          );
        })}
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
              <div style={{ flex: 1, background: "#fff", color: "#0B0E14", padding: "20px 24px", display: "flex", flexDirection: "column" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: theme.color, textTransform: "uppercase" }}>{wo.propertyName}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#444", marginTop: 4 }}>{n.dateText || "Date / time"}</div>
                <div style={{ fontSize: 28, fontWeight: 800, lineHeight: 1.05, margin: "4px 0" }}>{title}</div>
                <div style={{ fontSize: 14, color: "#666" }}>{n.affected || "Affected units"}</div>
                {n.cta
                  ? <div style={{ alignSelf: "flex-start", marginTop: 12, background: theme.color, color: "#fff", fontWeight: 700, fontSize: 13, padding: "7px 14px", borderRadius: 8 }}>{n.cta}</div>
                  : <div style={{ fontSize: 13, color: "#333", marginTop: 12 }}>Call to action</div>}
                {n.contactInfo ? <div style={{ marginTop: "auto", paddingTop: 12, fontSize: 12, color: "#888" }}>{n.contactInfo}</div> : null}
              </div>
            </div>
            <div style={{ height: 5, display: "flex" }}><span style={{ flex: 1, background: "#FBBF24" }} /><span style={{ flex: 1, background: "#34D399" }} /><span style={{ flex: 1, background: "#EF4444" }} /></div>
          </div>

          {/* Email preview — the exact branded HTML residents receive */}
          <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid var(--f5-border)" }}>
              <strong>Email</strong>
              <span style={{ display: "flex", gap: 6 }}>
                <span className="f5-badge">{email?.subject ? `Subject: ${email.subject}` : "No subject"}</span>
                <span className="f5-badge ok">Delivered render</span>
              </span>
            </div>
            {emailHtml
              ? <iframe title="Email preview" srcDoc={emailHtml} style={{ width: "100%", height: 460, border: 0, background: "#f1f4f8", display: "block" }} />
              : <div style={{ padding: 16, fontSize: 13, color: "var(--f5-text-muted)" }}>No email draft — Regenerate AI.</div>}
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

      <RequestChat woId={wo.id} />
    </main>
  );
}
