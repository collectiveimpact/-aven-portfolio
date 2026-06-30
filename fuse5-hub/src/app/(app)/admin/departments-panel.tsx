"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROLE_TIERS, ROLE_TIER_ORDER } from "@/lib/rbac";
import { createDepartment, type DepartmentRow } from "./actions";
import { FilterBar } from "@/components/filters/FilterBar";
import { SortHeader } from "@/components/filters/SortHeader";
import type { FilterField } from "@/components/filters/types";
import { useFilterState, applyFilters } from "@/lib/filters";
import { useSortState, applySort } from "@/lib/sort";

const dim = "var(--f5-text-muted)";

// Departments panel — the DEPARTMENT axis (orthogonal to role). Lists the org's
// departments and lets an Admin add new ones. Also surfaces the 5-tier role model
// so onboarding admins understand role vs department at a glance.
export function DepartmentsPanel({
  departments,
  memberCounts,
  canManage,
}: {
  departments: DepartmentRow[];
  memberCounts: Record<string, number>;
  canManage: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const FIELDS = useMemo<FilterField[]>(
    () => [{ key: "q", label: "Search", kind: "search", placeholder: "Search department or key…" }],
    [],
  );
  const { value, setValue } = useFilterState({ fields: FIELDS, urlSync: true });
  const { sort, toggle } = useSortState({ urlSync: true });
  const rows = useMemo(() => {
    const matched = applyFilters(departments, value, { q: (d) => `${d.label} ${d.key}` });
    return applySort(matched, sort, {
      label: (d) => d.label,
      key: (d) => d.key,
      members: (d) => memberCounts[d.id] ?? 0,
    });
  }, [departments, value, sort, memberCounts]);

  function add() {
    const label = name.trim();
    if (!label) return;
    setError(null); setSaved(null);
    start(async () => {
      const res = await createDepartment(label);
      if (!res.ok) { setError(res.error ?? "Could not create department."); return; }
      setName(""); setSaved(label); router.refresh();
    });
  }

  return (
    <div>
      <div className="f5-section-title" style={{ margin: 0 }}>Departments</div>
      <div style={{ fontSize: 12.5, color: dim, marginBottom: 14 }}>
        Group your people by department (Housing, Communications, Maintenance…). A user has both a{" "}
        <strong>role</strong> (what they can do) and a <strong>department</strong> (where they sit). Each
        department gets its own users and its own dashboard view.
      </div>

      {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginBottom: 10 }}>{error}</div>}

      {canManage && (
        <div className="f5-card" style={{ padding: 14, marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <input
            className="f5-input"
            placeholder="New department name…"
            value={name}
            disabled={pending}
            onChange={(e) => { setName(e.target.value); setSaved(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            style={{ flex: 1, minWidth: 220, padding: "8px 10px", fontSize: 13 }}
          />
          <button className="f5-btn primary" onClick={add} disabled={pending || !name.trim()}>
            {pending ? "Adding…" : "Add department"}
          </button>
          {saved && <span style={{ color: "var(--f5-green,#34d399)", fontSize: 12 }}>Added “{saved}” ✓</span>}
        </div>
      )}

      <FilterBar fields={FIELDS} value={value} onChange={setValue} resultCount={rows.length} resultLabel="departments" />

      <div className="f5-card" style={{ padding: 0, overflow: "hidden", marginTop: 14 }}>
        <table className="f5-table">
          <thead>
            <tr>
              <SortHeader sortKey="label" sort={sort} onSort={toggle}>Department</SortHeader>
              <SortHeader sortKey="key" sort={sort} onSort={toggle}>Key</SortHeader>
              <SortHeader sortKey="members" sort={sort} onSort={toggle} align="right">Members</SortHeader>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr><td colSpan={3} style={{ color: dim, padding: 16 }}>{departments.length === 0 ? "No departments yet." : "No departments match."}</td></tr>
            )}
            {rows.map((d) => (
              <tr key={d.id}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{d.label}</td>
                <td style={{ color: dim, fontFamily: "var(--f5-mono, monospace)", fontSize: 12 }}>{d.key}</td>
                <td style={{ textAlign: "right" }}><span className="f5-badge">{memberCounts[d.id] ?? 0}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Role-tier model — descriptive reference (Super Admin → Submitter). */}
      <div className="f5-section-title" style={{ marginTop: 24 }}>Role tiers</div>
      <div style={{ fontSize: 12.5, color: dim, marginBottom: 12 }}>
        Five tiers, highest access first. The IT onboarding <strong>Admin</strong> is intentionally
        stripped down — onboard users and run reports only.
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {ROLE_TIER_ORDER.map((key, i) => {
          const tier = ROLE_TIERS[key];
          return (
            <div key={key} className="f5-card" style={{ padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className="f5-badge" style={{ fontSize: 10 }}>Tier {i + 1}</span>
                <span style={{ fontWeight: 700, color: "var(--f5-text)" }}>{tier.label}</span>
                <span style={{ fontSize: 12, color: dim }}>— {tier.tagline}</span>
              </div>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 12.5, color: "var(--f5-text-secondary)" }}>
                {tier.can.map((c) => <li key={c} style={{ marginBottom: 2 }}>{c}</li>)}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
