"use client";

import { useEffect, useState } from "react";
import { loadResidentProfile } from "./actions";
import type { ResidentProfileData } from "@/lib/residents/queries";
import type { ResidentWithDemographics } from "@/lib/residents/types";
import {
  occupantLabel,
  mobilityLabel,
  subsidyLabel,
  accessibilityLabel,
} from "@/lib/residents/types";

const fg = "var(--f5-text)";
const dim = "var(--f5-text-muted)";
const TABS = ["Overview", "Demographics", "Accessibility", "History"] as const;
type Tab = (typeof TABS)[number];

function fmt(v: string | null | undefined): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <span style={{ color: dim }}>{k}</span>
      <span style={{ color: fg }}>{v ?? "—"}</span>
    </>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ gridColumn: "1 / -1" }} className="f5-section-title">{children}</div>;
}

const prioClass = (p: string) => (p === "urgent" || p === "high" ? "warn" : p === "resolved" ? "ok" : "");
const statusClass = (s: string) => (s === "resolved" ? "ok" : s === "open" ? "warn" : "");

export function ResidentProfile({ resident, onClose }: { resident: ResidentWithDemographics; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [data, setData] = useState<ResidentProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    loadResidentProfile(resident.id).then((d) => {
      if (live) { setData(d); setLoading(false); }
    });
    return () => { live = false; };
  }, [resident.id]);

  // Prefer the freshly-loaded bundle, fall back to the row we already have.
  const r = data?.resident ?? resident;
  const d = r.demographics;
  const comms = data?.comms ?? [];
  const workOrders = data?.workOrders ?? [];
  const surveys = data?.surveys ?? [];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", justifyContent: "flex-end" }} onClick={onClose}>
      <div className="f5-card" style={{ width: 520, maxWidth: "96vw", height: "100%", borderRadius: 0, overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 99, background: "var(--f5-bg-soft, rgba(255,255,255,0.06))", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: fg }}>
            {r.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: fg, fontSize: 16 }}>{r.name}</div>
            <div style={{ fontSize: 12, color: dim }}>Unit {r.unit} · {r.propertyName}</div>
          </div>
          <button className="f5-btn" onClick={onClose} style={{ padding: "4px 10px" }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <span className={`f5-badge ${r.status === "active" ? "ok" : "warn"}`}>{r.status === "active" ? "Active" : "Moved Out"}</span>
          {r.tenantCode && <span className="f5-badge" style={{ fontFamily: "monospace" }}>{r.tenantCode}</span>}
          {d?.source === "yardi" && <span className="f5-badge">🔄 Yardi Synced</span>}
          {d?.subsidyType && <span className="f5-badge">{subsidyLabel(d.subsidyType)}</span>}
        </div>

        {/* key contact channels */}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", fontSize: 12, color: dim }}>
          <span>📞 {r.phone || "—"}</span>
          <span>✉️ {r.email || "—"}</span>
          <span style={{ textTransform: "capitalize" }}>★ {r.preferredChannel}</span>
        </div>

        {/* tabs */}
        <div className="f5-chips" style={{ marginTop: 14 }}>
          {TABS.map((t) => (
            <span key={t} className={`f5-chip${tab === t ? " active" : ""}`} style={{ fontSize: 12 }} onClick={() => setTab(t)}>{t}</span>
          ))}
        </div>

        {loading && <div style={{ marginTop: 16, fontSize: 13, color: dim }}>Loading demographics…</div>}

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 14px", fontSize: 13 }}>
          {tab === "Overview" && (
            <>
              <SectionTitle>Contact</SectionTitle>
              <Field k="Phone" v={r.phone || "—"} />
              <Field k="Email" v={r.email || "—"} />
              <Field k="Emergency" v={d?.emergencyContactName ? `${d.emergencyContactName}${d.emergencyContactRelation ? ` (${d.emergencyContactRelation})` : ""}` : "—"} />
              <Field k="Emergency Phone" v={d?.emergencyContactPhone || "—"} />

              <SectionTitle>Language &amp; Channels</SectionTitle>
              <Field k="Primary Language" v={d?.primaryLanguage || r.language} />
              <Field k="Secondary" v={d?.secondaryLanguages?.length ? d.secondaryLanguages.join(", ") : "—"} />
              <Field k="Interpreter" v={d?.interpreterRequired ? <span className="f5-badge warn">Required</span> : "Not required"} />
              <Field k="Preferred" v={<span style={{ textTransform: "capitalize" }}>{r.preferredChannel}</span>} />
              <Field k="Last Contacted" v={fmt(r.lastContactedAt)} />

              <SectionTitle>Tenancy</SectionTitle>
              <Field k="Tenancy Start" v={fmt(r.tenancyStart)} />
              <Field k="Tenancy End" v={fmt(r.tenancyEnd)} />
              <Field k="Occupant Type" v={occupantLabel(d?.occupantType ?? null)} />
              <Field k="Property" v={r.propertyName} />

              <SectionTitle>Consent</SectionTitle>
              <Field k="CASL Consent" v={d?.consentCasl ? <span className="f5-badge ok">Granted</span> : <span className="f5-badge warn">Not granted</span>} />
              <Field k="SMS Opt-in" v={d?.consentSms ? <span className="f5-badge ok">Granted</span> : <span className="f5-badge warn">Not opted in</span>} />
              <Field k="Data Sharing" v={d?.consentDataSharing ? <span className="f5-badge ok">Agencies</span> : <span className="f5-badge warn">Restricted</span>} />
              <Field k="Emergency Alerts" v={<span className="f5-badge ok">Always Active</span>} />
            </>
          )}

          {tab === "Demographics" && (
            <>
              <SectionTitle>Household</SectionTitle>
              <Field k="Household Size" v={d?.householdSize != null ? `${d.householdSize} ${d.householdSize === 1 ? "person" : "people"}` : "—"} />
              <Field k="Composition" v={d?.householdComposition || "—"} />
              <Field k="Dependents" v={d?.dependents != null ? d.dependents : "—"} />
              <Field k="Age Band" v={d?.ageBand || "—"} />

              <SectionTitle>Income &amp; Subsidy</SectionTitle>
              <Field k="Income Band" v={d?.incomeBand ? `$${d.incomeBand}` : "—"} />
              <Field k="Subsidy Type" v={subsidyLabel(d?.subsidyType ?? null)} />
              <Field k="Rent Share" v={d?.rentShare != null ? `$${d.rentShare.toFixed(2)} / mo` : "—"} />

              <SectionTitle>Support Network</SectionTitle>
              <Field k="Support Agency" v={d?.supportAgency || "—"} />
              <Field k="Case Worker" v={d?.caseWorker || "—"} />
              <Field k="Case Worker Contact" v={d?.caseWorkerContact || "—"} />

              <div style={{ gridColumn: "1 / -1", fontSize: 11, color: dim, marginTop: 6 }}>
                {d?.source === "yardi" ? "Sourced from Yardi Voyager · " : ""}Updated {fmt(d?.updatedAt)}. Banded fields (age, income) carry no raw values.
              </div>
            </>
          )}

          {tab === "Accessibility" && (
            <>
              <Field k="Mobility" v={mobilityLabel(d?.mobility ?? null)} />
              <Field k="Service Animal" v={d?.serviceAnimal ? "Yes — registered" : "No"} />
              <Field k="Emergency Assembly" v={d?.emergencyAssembly || "Standard assembly point A"} />
              <SectionTitle>Notice Accommodations</SectionTitle>
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: 6, flexWrap: "wrap" }}>
                {d?.accessibilityNeeds?.length
                  ? d.accessibilityNeeds.map((n) => <span key={n} className="f5-badge">{accessibilityLabel(n)}</span>)
                  : <span style={{ color: dim, fontSize: 13 }}>None on file</span>}
              </div>
              <div style={{ gridColumn: "1 / -1", fontSize: 12, color: dim, marginTop: 6 }}>
                Accessibility data drives AODA-compliant notice formatting and emergency assembly routing.
              </div>
            </>
          )}

          {tab === "History" && (
            <div style={{ gridColumn: "1 / -1" }}>
              <div className="f5-section-title" style={{ marginTop: 0 }}>Communication Timeline</div>
              {comms.length === 0 && <div style={{ fontSize: 13, color: dim, padding: "6px 0" }}>No communications on file.</div>}
              {comms.map((e, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "9px 0", borderBottom: "1px solid var(--f5-border)" }}>
                  <div><div style={{ color: fg }}>{e.what}</div><div style={{ fontSize: 11, color: dim }}>{e.channel} · {e.when}</div></div>
                  <span className="f5-badge ok" style={{ alignSelf: "center" }}>{e.status}</span>
                </div>
              ))}

              <div className="f5-section-title">Work Orders</div>
              {workOrders.length === 0 && <div style={{ fontSize: 13, color: dim, padding: "6px 0" }}>No work orders against this unit.</div>}
              {workOrders.map((w) => (
                <div key={w.id} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "9px 0", borderBottom: "1px solid var(--f5-border)" }}>
                  <div><div style={{ color: fg }}>{w.title}</div><div style={{ fontSize: 11, color: dim }}>{w.category} · <span className={`f5-badge ${prioClass(w.priority)}`} style={{ fontSize: 10 }}>{w.priority}</span></div></div>
                  <span className={`f5-badge ${statusClass(w.status)}`} style={{ alignSelf: "center", textTransform: "capitalize" }}>{w.status.replace("_", " ")}</span>
                </div>
              ))}

              <div className="f5-section-title">Survey Participation</div>
              {surveys.length === 0 && <div style={{ fontSize: 13, color: dim, padding: "6px 0" }}>No survey responses on file.</div>}
              {surveys.map((sv, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "9px 0", borderBottom: "1px solid var(--f5-border)" }}>
                  <div><div style={{ color: fg }}>{sv.title}</div><div style={{ fontSize: 11, color: dim }}>Responded {sv.respondedAt ?? "—"}</div></div>
                  <span className="f5-badge" style={{ alignSelf: "center", textTransform: "capitalize" }}>{sv.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
