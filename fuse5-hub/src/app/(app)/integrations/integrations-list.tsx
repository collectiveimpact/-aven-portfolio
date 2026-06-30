"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { IntegrationRow, IntegrationStatus } from "@/lib/queries";
import { saveIntegration } from "./actions";
import { FilterBar } from "@/components/filters/FilterBar";
import type { FilterField, FilterOption } from "@/components/filters/types";
import { useFilterState, applyFilters } from "@/lib/filters";

const BADGE: Record<IntegrationStatus, { cls: string; label: string }> = {
  connected: { cls: "ok", label: "Connected" },
  active: { cls: "ok", label: "Import active" },
  available: { cls: "warn", label: "Available" },
  disconnected: { cls: "bad", label: "Disconnected" },
};
// Editable settings fields per provider.
const FIELDS: Record<string, { key: string; label: string }[]> = {
  yardi: [{ key: "database", label: "Database" }, { key: "endpoint", label: "API Endpoint" }],
  rentsafeto: [{ key: "account", label: "City Account ID" }],
  email: [{ key: "provider", label: "Provider (Resend/Postmark)" }, { key: "from", label: "From address" }],
  twilio: [{ key: "account_sid", label: "Account SID" }, { key: "from", label: "Sender number" }],
};
const STATUSES: IntegrationStatus[] = ["connected", "active", "available", "disconnected"];
const STATUS_OPTIONS: FilterOption[] = STATUSES.map((s) => ({ value: s, label: BADGE[s].label }));

interface Editing { provider: string; name: string; status: IntegrationStatus; settings: Record<string, string> }

export function IntegrationsList({ integrations, canEdit }: { integrations: IntegrationRow[]; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const FILTER_FIELDS = useMemo<FilterField[]>(
    () => [
      { key: "q", label: "Search", kind: "search", placeholder: "Search service name or description…" },
      { key: "status", label: "Status", kind: "multiselect", options: STATUS_OPTIONS },
    ],
    [],
  );
  const { value, setValue } = useFilterState({ fields: FILTER_FIELDS, urlSync: true });
  const list = useMemo(
    () => applyFilters(integrations, value, {
      q: (it) => `${it.name} ${it.description} ${it.provider}`,
      status: (it) => it.status,
    }),
    [integrations, value],
  );

  function open(it: IntegrationRow) { setError(null); setEditing({ provider: it.provider, name: it.name, status: it.status, settings: { ...it.settings } }); }
  function save() {
    if (!editing) return;
    start(async () => {
      const r = await saveIntegration(editing.provider, editing.status, editing.settings);
      if (!r.ok) { setError(r.error ?? "Could not save."); return; }
      setEditing(null); router.refresh();
    });
  }
  const setField = (k: string, v: string) => setEditing((p) => (p ? { ...p, settings: { ...p.settings, [k]: v } } : p));

  return (
    <>
      <div className="f5-section-title">Connected Services</div>
      <FilterBar fields={FILTER_FIELDS} value={value} onChange={setValue} resultCount={list.length} resultLabel="services" />
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(2,1fr)", marginTop: 14 }}>
        {list.length === 0 && <div style={{ gridColumn: "1 / -1", color: "var(--f5-text-muted)", fontSize: 13, textAlign: "center", padding: 20 }}>No services match.</div>}
        {list.map((it) => {
          const b = BADGE[it.status];
          return (
            <div key={it.provider} className="f5-card">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: 26 }}>{it.ico}</span>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 15 }}>{it.name}</div></div>
                <span className={`f5-badge ${b.cls}`}>{b.label}</span>
              </div>
              <div style={{ color: "var(--f5-text-secondary)", fontSize: 13, minHeight: 36 }}>{it.description}</div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                {it.provider === "yardi" && <Link href="/workorders" className="f5-btn">Import</Link>}
                {canEdit && <button className="f5-btn" type="button" onClick={() => open(it)}>Configure</button>}
              </div>
            </div>
          );
        })}
      </div>
      {!canEdit && <div style={{ fontSize: 11, color: "var(--f5-text-muted)", marginTop: 14 }}>Read-only — an admin can configure integrations.</div>}

      {editing && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }} onClick={() => setEditing(null)}>
          <div className="f5-card" style={{ width: 460, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
            <div className="f5-section-title" style={{ margin: 0 }}>Configure {editing.name}</div>
            <label className="f5-label">Status</label>
            <select className="f5-select" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as IntegrationStatus })}>
              {STATUSES.map((s) => <option key={s} value={s}>{BADGE[s].label}</option>)}
            </select>
            {(FIELDS[editing.provider] ?? []).map((f) => (
              <div key={f.key} style={{ marginTop: 8 }}>
                <label className="f5-label">{f.label}</label>
                <input className="f5-input" value={editing.settings[f.key] ?? ""} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.label} />
              </div>
            ))}
            {error && <div style={{ color: "var(--f5-red,#f87171)", fontSize: 13, marginTop: 12 }}>{error}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button className="f5-btn primary" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save"}</button>
              <button className="f5-btn" onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
