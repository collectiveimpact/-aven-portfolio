"use client";

import { useState } from "react";
import type { ResidentRow } from "@/lib/queries";

const fg = "var(--f5-text)";
const dim = "var(--f5-text-muted)";
const TABS = ["Communication", "Demographics", "Accessibility", "History"] as const;
type Tab = (typeof TABS)[number];

// The DB carries unit/name/contact/language/preferred; Yardi demographics,
// accessibility, and history are deterministically demo-enriched per resident.
function enrich(r: ResidentRow) {
  const h = (r.id + r.name).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const moveIns = ["March 15, 2022", "July 1, 2021", "Jan 9, 2023", "Nov 22, 2020"];
  const mobility = ["None", "Wheelchair — main-floor unit", "Walker / cane", "None"];
  return {
    tenantCode: `T-2024${String(1000 + (h % 9000))}-001`,
    occupant: h % 3 === 0 ? "Head of Household" : "Occupant",
    moveIn: moveIns[h % 4],
    lease: r.status === "active" ? "Active — Month-to-Month" : "Ended",
    household: 1 + (h % 4),
    emergencyName: ["Linda Chen (Sister)", "Marc Roy (Spouse)", "Aisha Khan (Parent)", "None on file"][h % 4],
    emergencyPhone: `416-555-0${100 + (h % 800)}`,
    openRate: 70 + (h % 28),
    lastContact: ["2 days ago", "1 week ago", "Today", "3 weeks ago"][h % 4],
    casl: true,
    smsOptIn: r.preferredChannel === "sms" || h % 2 === 0,
    mobility: mobility[h % 4],
    visual: h % 5 === 0 ? "Large-print notices" : "None",
    hearing: h % 6 === 0 ? "Hearing impaired — visual alerts" : "None",
    serviceAnimal: h % 7 === 0,
    assembly: h % 4 === 1 ? "Mobility-assisted assembly point B" : "Standard assembly point A",
    history: [
      { when: r.id ? "Apr 10, 2026" : "—", what: "Water shutoff notice", ch: "SMS", status: "Delivered" },
      { when: "Apr 2, 2026", what: "Monthly newsletter", ch: "Email", status: "Opened" },
      { when: "Mar 21, 2026", what: "Maintenance follow-up", ch: "Email", status: "Replied" },
    ],
  };
}

function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return <><span style={{ color: dim }}>{k}</span><span style={{ color: fg }}>{v}</span></>;
}

export function ResidentProfile({ resident, onClose }: { resident: ResidentRow; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("Communication");
  const x = enrich(resident);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div className="f5-card" style={{ width: 460, maxWidth: "96vw", height: "100%", borderRadius: 0, overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 99, background: "var(--f5-bg-soft, rgba(255,255,255,0.06))", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: fg }}>{resident.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: fg, fontSize: 16 }}>{resident.name}</div>
            <div style={{ fontSize: 12, color: dim }}>Unit {resident.unit} · {resident.propertyName}</div>
          </div>
          <button className="f5-btn" onClick={onClose} style={{ padding: "4px 10px" }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
          <span className={`f5-badge ${resident.status === "active" ? "ok" : "warn"}`}>{resident.status === "active" ? "Active" : "Moved Out"}</span>
          <span className="f5-badge">🔄 Yardi Synced</span>
        </div>

        {/* tabs */}
        <div className="f5-chips" style={{ marginTop: 14 }}>
          {TABS.map((t) => <span key={t} className={`f5-chip${tab === t ? " active" : ""}`} style={{ fontSize: 12 }} onClick={() => setTab(t)}>{t}</span>)}
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", fontSize: 13 }}>
          {tab === "Communication" && (<>
            <div style={{ gridColumn: "1 / -1" }} className="f5-section-title">Contact</div>
            <Field k="Phone" v={resident.phone || "—"} /><Field k="Email" v={resident.email || "—"} />
            <Field k="Emergency" v={x.emergencyName} /><Field k="Emergency Phone" v={x.emergencyPhone} />
            <div style={{ gridColumn: "1 / -1" }} className="f5-section-title">Language &amp; Channels</div>
            <Field k="Language" v={resident.language} /><Field k="Preferred" v={<span style={{ textTransform: "capitalize" }}>{resident.preferredChannel}</span>} />
            <Field k="Open Rate" v={<span style={{ color: "var(--f5-green,#34d399)" }}>{x.openRate}%</span>} /><Field k="Last Contact" v={x.lastContact} />
            <div style={{ gridColumn: "1 / -1" }} className="f5-section-title">Consent</div>
            <Field k="CASL Consent" v={<span className="f5-badge ok">Granted</span>} /><Field k="SMS Opt-in" v={x.smsOptIn ? <span className="f5-badge ok">Granted</span> : <span className="f5-badge warn">Not opted in</span>} />
            <Field k="Emergency Alerts" v={<span className="f5-badge ok">Always Active</span>} /><span></span>
          </>)}
          {tab === "Demographics" && (<>
            <div style={{ gridColumn: "1 / -1", fontSize: 11, color: dim }}>From Yardi Voyager</div>
            <Field k="Tenant Code" v={<span style={{ fontFamily: "monospace" }}>{x.tenantCode}</span>} />
            <Field k="Occupant Type" v={x.occupant} />
            <Field k="Move-in Date" v={x.moveIn} />
            <Field k="Lease Status" v={x.lease} />
            <Field k="Household Size" v={`${x.household} ${x.household === 1 ? "person" : "people"}`} />
            <Field k="Property" v={resident.propertyName} />
          </>)}
          {tab === "Accessibility" && (<>
            <Field k="Mobility" v={x.mobility} />
            <Field k="Visual" v={x.visual} />
            <Field k="Hearing" v={x.hearing} />
            <Field k="Service Animal" v={x.serviceAnimal ? "Yes — registered" : "No"} />
            <Field k="Emergency Assembly" v={x.assembly} />
            <div style={{ gridColumn: "1 / -1", fontSize: 12, color: dim, marginTop: 6 }}>Accessibility data drives AODA-compliant notice formatting and emergency assembly routing.</div>
          </>)}
          {tab === "History" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="f5-section-title" style={{ marginTop: 0 }}>Communication Timeline</div>
              {x.history.map((e, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "9px 0", borderBottom: "1px solid var(--f5-border)" }}>
                  <div><div style={{ color: fg }}>{e.what}</div><div style={{ fontSize: 11, color: dim }}>{e.ch} · {e.when}</div></div>
                  <span className="f5-badge ok" style={{ alignSelf: "center" }}>{e.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
