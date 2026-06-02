"use client";

import { useMemo, useState, useTransition } from "react";
import type { Channel } from "@/lib/types";
import { sendBroadcast } from "./actions";

type Priority = "normal" | "high" | "emergency";
type Delivery = "now" | "schedule";

interface ChannelOption { key: Channel; label: string; ico: string }
const CHANNELS: ChannelOption[] = [
  { key: "email", label: "Email", ico: "✉️" },
  { key: "sms", label: "SMS", ico: "💬" },
  { key: "whatsapp", label: "WhatsApp", ico: "🟢" },
  { key: "display", label: "Display", ico: "🖥️" },
];

const SEGMENT_LIBRARY = ["All Residents", "Building A", "Floor 3-5", "French speakers", "Arrears 30d+", "Seniors (65+)"];

// Approx reach per segment for the demo confirmation panel.
const SEGMENT_REACH: Record<string, number> = {
  "All Residents": 1284,
  "Building A": 312,
  "Floor 3-5": 96,
  "French speakers": 207,
  "Arrears 30d+": 41,
  "Seniors (65+)": 188,
};

const LANGUAGES = ["English", "French", "Spanish", "Mandarin", "Portuguese", "Arabic", "Somali"];

export default function Composer() {
  const [channels, setChannels] = useState<Channel[]>(["email"]);
  const [segments, setSegments] = useState<string[]>(["All Residents"]);
  const [addingSegment, setAddingSegment] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<Priority>("normal");
  const [language, setLanguage] = useState("English");
  const [casl, setCasl] = useState(false);
  const [delivery, setDelivery] = useState<Delivery>("now");
  const [scheduledFor, setScheduledFor] = useState("");
  const [warning, setWarning] = useState<string | null>(null);
  const [stage, setStage] = useState<"compose" | "confirm" | "sent">("compose");
  const [sentCount, setSentCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const audienceCount = useMemo(
    () => segments.reduce((sum, s) => sum + (SEGMENT_REACH[s] ?? 0), 0),
    [segments],
  );

  // Demo per-channel split of the audience.
  const emailCount = channels.includes("email") ? audienceCount : 0;
  const smsCount = channels.includes("sms") ? Math.round(audienceCount * 0.62) : 0;
  const displayCount = channels.includes("display") ? 31 : 0;

  const toggleChannel = (c: Channel) =>
    setChannels((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const removeSegment = (s: string) => setSegments((prev) => prev.filter((x) => x !== s));
  const addSegment = (s: string) => {
    setSegments((prev) => (prev.includes(s) ? prev : [...prev, s]));
    setAddingSegment(false);
  };

  const availableSegments = SEGMENT_LIBRARY.filter((s) => !segments.includes(s));

  const validate = (): boolean => {
    if (!subject.trim() || !body.trim()) {
      setWarning("Add a subject and message body before continuing.");
      return false;
    }
    if (channels.length === 0) {
      setWarning("Select at least one delivery channel.");
      return false;
    }
    if (segments.length === 0) {
      setWarning("Add at least one recipient segment.");
      return false;
    }
    if (!casl) {
      setWarning("Confirm CASL consent — all recipients must have opted in.");
      return false;
    }
    if (delivery === "schedule" && !scheduledFor) {
      setWarning("Pick a date and time for the scheduled send.");
      return false;
    }
    setWarning(null);
    return true;
  };

  const onReview = () => {
    if (validate()) setStage("confirm");
  };

  const onConfirmSend = () => {
    startTransition(async () => {
      const res = await sendBroadcast({
        subject,
        body,
        channels,
        segments,
        priority,
        language,
        audienceCount,
        delivery,
        scheduledFor: delivery === "schedule" ? scheduledFor : null,
      });
      if (res.ok) {
        setSentCount(res.sent);
        setStage("sent");
      } else {
        setWarning(res.error ?? "Something went wrong. Try again.");
        setStage("compose");
      }
    });
  };

  const onSaveDraft = () => {
    setWarning(null);
    setStage("compose");
    // TODO: real provider send — persist draft Message row.
  };

  const radio = (checked: boolean): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: checked ? "var(--f5-text)" : "var(--f5-text-secondary)",
    cursor: "pointer",
  });

  if (stage === "sent") {
    return (
      <div className="f5-card" style={{ marginTop: 18 }}>
        <div className="f5-live" style={{ marginBottom: 10 }}>
          {delivery === "schedule" ? "Scheduled" : "Sent"}
        </div>
        <div className="f5-page-title" style={{ fontSize: 18 }}>
          {delivery === "schedule"
            ? `Broadcast scheduled for ${sentCount.toLocaleString()} residents`
            : `Broadcast sent to ${sentCount.toLocaleString()} residents`}
        </div>
        <div className="f5-page-sub">
          &ldquo;{subject}&rdquo; queued across {channels.length} channel{channels.length === 1 ? "" : "s"} in {language}.
        </div>
        <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 18 }}>
          <div className="f5-card"><div className="f5-kpi-label">Email</div><div className="f5-kpi-value">{emailCount.toLocaleString()}</div></div>
          <div className="f5-card"><div className="f5-kpi-label">SMS</div><div className="f5-kpi-value">{smsCount.toLocaleString()}</div></div>
          <div className="f5-card"><div className="f5-kpi-label">Display</div><div className="f5-kpi-value">{displayCount.toLocaleString()}</div></div>
        </div>
        <div style={{ marginTop: 18 }}>
          <button
            className="f5-btn primary"
            onClick={() => {
              setStage("compose");
              setSubject("");
              setBody("");
              setCasl(false);
              setWarning(null);
            }}
          >
            Compose another
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {warning && (
        <div className="f5-card" style={{ marginTop: 18, borderColor: "color-mix(in srgb, var(--f5-amber) 45%, transparent)" }}>
          <span className="f5-warn" style={{ fontSize: 13, fontWeight: 600 }}>⚠ {warning}</span>
        </div>
      )}

      <div className="f5-grid" style={{ gridTemplateColumns: "1.5fr 1fr", marginTop: 18, alignItems: "start" }}>
        <div className="f5-card">
          <div className="f5-section-title" style={{ margin: "0 0 12px" }}>Channels</div>
          <div className="f5-chips">
            {CHANNELS.map((c) => (
              <button
                key={c.key}
                type="button"
                className={`f5-chip${channels.includes(c.key) ? " active" : ""}`}
                onClick={() => toggleChannel(c.key)}
              >
                {c.ico} {c.label}
              </button>
            ))}
          </div>

          <div className="f5-section-title">Recipient Segments</div>
          <div className="f5-chips">
            {segments.map((s) => (
              <span key={s} className="f5-chip active" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {s} · {(SEGMENT_REACH[s] ?? 0).toLocaleString()}
                <button
                  type="button"
                  onClick={() => removeSegment(s)}
                  style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}
                  aria-label={`Remove ${s}`}
                >
                  ×
                </button>
              </span>
            ))}
            {!addingSegment ? (
              <button type="button" className="f5-chip" onClick={() => setAddingSegment(true)} disabled={availableSegments.length === 0}>
                + Add Segment
              </button>
            ) : (
              <select
                className="f5-select"
                style={{ width: "auto", padding: "6px 12px" }}
                defaultValue=""
                onChange={(e) => e.target.value && addSegment(e.target.value)}
              >
                <option value="" disabled>Choose segment…</option>
                {availableSegments.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}
          </div>

          <label className="f5-label" htmlFor="subject">Subject</label>
          <input
            id="subject"
            className="f5-input"
            placeholder="e.g. Scheduled water shutoff — Building A"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <label className="f5-label">Priority</label>
          <div style={{ display: "flex", gap: 18, marginTop: 2 }}>
            {(["normal", "high", "emergency"] as Priority[]).map((p) => (
              <label key={p} style={radio(priority === p)}>
                <input type="radio" name="priority" checked={priority === p} onChange={() => setPriority(p)} />
                {p[0].toUpperCase() + p.slice(1)}
              </label>
            ))}
          </div>

          <label className="f5-label" htmlFor="language">Language</label>
          <select id="language" className="f5-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>

          <label className="f5-label" htmlFor="body">Message body</label>
          <textarea
            id="body"
            className="f5-textarea"
            rows={7}
            placeholder="Write your broadcast. Variables like {{resident_name}} are supported."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          <label style={{ ...radio(casl), marginTop: 14 }}>
            <input type="checkbox" checked={casl} onChange={(e) => setCasl(e.target.checked)} />
            All recipients have opted in (CASL compliant)
          </label>

          <div className="f5-section-title">Delivery</div>
          <div style={{ display: "flex", gap: 18 }}>
            <label style={radio(delivery === "now")}>
              <input type="radio" name="delivery" checked={delivery === "now"} onChange={() => setDelivery("now")} />
              Send Now
            </label>
            <label style={radio(delivery === "schedule")}>
              <input type="radio" name="delivery" checked={delivery === "schedule"} onChange={() => setDelivery("schedule")} />
              Schedule
            </label>
          </div>
          {delivery === "schedule" && (
            <input
              type="datetime-local"
              className="f5-input"
              style={{ marginTop: 10 }}
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
            />
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 18 }}>
            {delivery === "now" ? (
              <button type="button" className="f5-btn primary" onClick={onReview}>Send Now</button>
            ) : (
              <button type="button" className="f5-btn primary" onClick={onReview}>Schedule</button>
            )}
            <button type="button" className="f5-btn" onClick={onSaveDraft}>Save Draft</button>
            <button type="button" className="f5-btn" onClick={() => validate() && setStage("confirm")}>Preview</button>
          </div>
        </div>

        <div className="f5-card">
          <div className="f5-section-title" style={{ margin: "0 0 12px" }}>Live Preview</div>
          <div style={{ background: "var(--f5-surface-2)", border: "1px solid var(--f5-border)", borderRadius: "var(--f5-radius-sm)", padding: 14 }}>
            <div style={{ fontSize: 11, color: "var(--f5-text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>
              {channels.length ? channels.join(" · ") : "no channel"} · {language}
            </div>
            <div style={{ fontWeight: 700, marginTop: 8, color: "var(--f5-text)" }}>
              {subject || "Subject preview…"}
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: "var(--f5-text-secondary)", whiteSpace: "pre-wrap" }}>
              {body || "Your message body will appear here as you type."}
            </div>
          </div>
          <div className="f5-kpi-sub" style={{ marginTop: 14 }}>
            Estimated reach: <strong style={{ color: "var(--f5-text)" }}>{audienceCount.toLocaleString()}</strong> residents across {segments.length} segment{segments.length === 1 ? "" : "s"}.
          </div>
          {priority === "emergency" && (
            <div style={{ marginTop: 10 }}><span className="f5-badge bad">Emergency priority — bypasses quiet hours</span></div>
          )}
        </div>
      </div>

      {stage === "confirm" && (
        <div className="f5-card" style={{ marginTop: 18, borderColor: "var(--f5-teal-border)" }}>
          <div className="f5-section-title" style={{ margin: "0 0 4px" }}>Confirm broadcast</div>
          <div className="f5-page-title" style={{ fontSize: 18 }}>
            Ready to send to {audienceCount.toLocaleString()} residents
          </div>
          <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 14 }}>
            <div className="f5-card"><div className="f5-kpi-label">Email</div><div className="f5-kpi-value">{emailCount.toLocaleString()}</div></div>
            <div className="f5-card"><div className="f5-kpi-label">SMS</div><div className="f5-kpi-value">{smsCount.toLocaleString()}</div></div>
            <div className="f5-card"><div className="f5-kpi-label">Display</div><div className="f5-kpi-value">{displayCount.toLocaleString()}</div></div>
          </div>
          <div className="f5-kpi-sub" style={{ marginTop: 12 }}>
            {delivery === "schedule" && scheduledFor ? `Scheduled for ${scheduledFor.replace("T", " ")}` : "Sending immediately"} · {priority} priority · {language}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button type="button" className="f5-btn primary" onClick={onConfirmSend} disabled={isPending}>
              {isPending ? "Sending…" : delivery === "schedule" ? "Confirm schedule" : "Confirm send"}
            </button>
            <button type="button" className="f5-btn" onClick={() => setStage("compose")} disabled={isPending}>
              Back to edit
            </button>
          </div>
        </div>
      )}
    </>
  );
}
