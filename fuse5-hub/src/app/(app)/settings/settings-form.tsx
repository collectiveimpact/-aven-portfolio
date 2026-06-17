"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { OrgSettings } from "@/lib/queries";
import { saveOrgSettings } from "./actions";

const RESIDENCY = [
  { k: "ca-central-1", l: "Canada (ca-central-1)" },
  { k: "us-east-1", l: "US East (us-east-1)" },
  { k: "eu-west-1", l: "EU West (eu-west-1)" },
];
const CADENCE = [
  { k: "weekly", l: "Weekly" },
  { k: "monthly", l: "Monthly" },
  { k: "quarterly", l: "Quarterly" },
];

export function SettingsForm({ initial, orgName, canEdit }: { initial: OrgSettings; orgName: string; canEdit: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<OrgSettings>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const set = (patch: Partial<OrgSettings>) => { setSaved(false); setForm((p) => ({ ...p, ...patch })); };

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await saveOrgSettings(form);
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setSaved(true); router.refresh();
    });
  }

  const Toggle = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--f5-border)" }}>
      <span style={{ fontSize: 13, color: "var(--f5-text-secondary)" }}>{label}</span>
      <span
        className={`f5-badge ${on ? "ok" : ""}`}
        onClick={canEdit ? onClick : undefined}
        style={{ cursor: canEdit ? "pointer" : "default", userSelect: "none" }}
      >{on ? "Collecting" : "Off"}</span>
    </div>
  );

  return (
    <>
      {/* Org profile */}
      <div className="f5-card">
        <div className="f5-section-title" style={{ marginTop: 0 }}>Organization</div>
        <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "10px 16px", fontSize: 13, alignItems: "center" }}>
          <span style={{ color: "var(--f5-text-muted)" }}>Name</span><span style={{ color: "var(--f5-text)" }}>{orgName}</span>
          <span style={{ color: "var(--f5-text-muted)" }}>Plan</span><span>Growth</span>
          <span style={{ color: "var(--f5-text-muted)" }}>Data residency</span>
          {canEdit
            ? <select className="f5-select" value={form.dataResidency} onChange={(e) => set({ dataResidency: e.target.value })}>{RESIDENCY.map((r) => <option key={r.k} value={r.k}>{r.l}</option>)}</select>
            : <span>{form.dataResidency}</span>}
          <span style={{ color: "var(--f5-text-muted)" }}>Audit reports</span>
          {canEdit
            ? <select className="f5-select" value={form.auditReportCadence} onChange={(e) => set({ auditReportCadence: e.target.value })}>{CADENCE.map((c) => <option key={c.k} value={c.k}>{c.l} · PDF</option>)}</select>
            : <span style={{ textTransform: "capitalize" }}>{form.auditReportCadence} · PDF</span>}
        </div>
      </div>

      {/* Data collection */}
      <div className="f5-card">
        <div className="f5-section-title" style={{ marginTop: 0 }}>Data Collection</div>
        <Toggle on={form.collectDeliveryLogs} label="Delivery logs (email / SMS)" onClick={() => set({ collectDeliveryLogs: !form.collectDeliveryLogs })} />
        <Toggle on={form.collectProofOfPlay} label="Signage proof-of-play" onClick={() => set({ collectProofOfPlay: !form.collectProofOfPlay })} />
        <Toggle on={form.collectAcknowledgements} label="Acknowledgements / responses" onClick={() => set({ collectAcknowledgements: !form.collectAcknowledgements })} />

        {canEdit && (
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 14 }}>
            <button className="f5-btn primary" disabled={pending || !dirty} onClick={save}>{pending ? "Saving…" : "Save Settings"}</button>
            {saved && !dirty && <span style={{ fontSize: 12, color: "var(--f5-green)" }}>Saved ✓</span>}
            {error && <span style={{ fontSize: 12, color: "var(--f5-red)" }}>{error}</span>}
          </div>
        )}
        {!canEdit && <div style={{ fontSize: 11, color: "var(--f5-text-muted)", marginTop: 12 }}>Read-only — an admin can change these.</div>}
      </div>
    </>
  );
}
