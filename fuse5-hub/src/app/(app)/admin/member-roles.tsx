"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MemberRow } from "@/lib/queries";
import { ROLE_LABELS, ROLE_TIERS, tierForRole, type F5Role } from "@/lib/rbac";
import { setMemberRole, setMemberDepartment, type DepartmentRow } from "./actions";
import { MemberProfileDrawer, AddUserDrawer } from "./admin-user-drawer";

const statusBadge: Record<string, string> = { active: "ok", invited: "warn", suspended: "bad" };
const statusLabel: Record<string, string> = { active: "Active", invited: "Invited", suspended: "Suspended" };
const ROLES = Object.keys(ROLE_LABELS) as F5Role[];

export function MemberRoles({
  members,
  canManage,
  currentUserId,
  departments = [],
  memberDepartments = {},
  canAssignDept = false,
}: {
  members: MemberRow[];
  canManage: boolean;
  currentUserId: string;
  departments?: DepartmentRow[];
  memberDepartments?: Record<string, string | null>;
  canAssignDept?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // optimistic local state per member id
  const [roles, setRoles] = useState<Record<string, F5Role>>(() => Object.fromEntries(members.map((m) => [m.id, m.role])));
  const [depts, setDepts] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(members.map((m) => [m.id, memberDepartments[m.id] ?? null])),
  );
  // drawer state: which member's profile is open, and whether the add-user drawer is open
  const [profileId, setProfileId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  // Onboarding lives here, but is also reachable around Settings — surface a note.
  const canOnboard = canAssignDept; // canAssignDept is wired to canOnboard upstream

  function change(m: MemberRow, next: F5Role) {
    const prev = roles[m.id];
    setRoles((r) => ({ ...r, [m.id]: next })); setError(null);
    startTransition(async () => {
      const res = await setMemberRole(m.id, next);
      if (!res.ok) { setRoles((r) => ({ ...r, [m.id]: prev })); setError(res.error ?? "Could not change role."); return; }
      router.refresh();
    });
  }

  function changeDept(m: MemberRow, nextId: string | null) {
    const prev = depts[m.id] ?? null;
    setDepts((d) => ({ ...d, [m.id]: nextId })); setError(null);
    startTransition(async () => {
      const res = await setMemberDepartment(m.id, nextId);
      if (!res.ok) { setDepts((d) => ({ ...d, [m.id]: prev })); setError(res.error ?? "Could not assign department."); return; }
      router.refresh();
    });
  }

  const selected = profileId ? members.find((m) => m.id === profileId) : undefined;

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="f5-section-title" style={{ margin: 0 }}>Users &amp; Roles</div>
          <div style={{ fontSize: 12.5, color: "var(--f5-text-muted)", marginTop: 4, marginBottom: 10, maxWidth: 560 }}>
            Each user has a <strong>role</strong> (what they can do) and a <strong>department</strong> (where they sit).
            Click a member to view or edit their profile. Manage the department catalog under the Departments panel.
          </div>
        </div>
        {canOnboard && (
          <button className="f5-btn primary" onClick={() => setAddOpen(true)} style={{ flexShrink: 0 }}>+ Add user</button>
        )}
      </div>

      {canOnboard && (
        <div style={{ fontSize: 11.5, color: "var(--f5-text-muted)", marginBottom: 12 }}>
          Onboarding lives here, and is also reachable from <strong>Settings → Team</strong>.
        </div>
      )}

      {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginBottom: 10 }}>{error}</div>}
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Tier</th><th>Department</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const role = roles[m.id] ?? m.role;
              const tier = ROLE_TIERS[tierForRole(role)];
              const deptId = depts[m.id] ?? null;
              return (
                <tr key={m.id}>
                  <td>
                    <button
                      onClick={() => setProfileId(m.id)}
                      title="View profile"
                      style={{ background: "none", border: "none", padding: 0, font: "inherit", color: "var(--f5-text)", fontWeight: 600, cursor: "pointer", textAlign: "left" }}
                    >
                      {m.fullName}
                    </button>
                    {m.userId === currentUserId && <span style={{ color: "var(--f5-text-dim)", fontWeight: 400 }}> (you)</span>}
                  </td>
                  <td>{m.email}</td>
                  <td>
                    {canManage
                      ? <select className="f5-select" value={role} disabled={pending} onChange={(e) => change(m, e.target.value as F5Role)} style={{ padding: "4px 8px", fontSize: 12, width: "auto", minWidth: 150 }}>
                          {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                        </select>
                      : ROLE_LABELS[role]}
                  </td>
                  <td><span className="f5-badge" style={{ fontSize: 10 }} title={tier.tagline}>{tier.label}</span></td>
                  <td>
                    {canAssignDept && departments.length > 0
                      ? <select className="f5-select" value={deptId ?? ""} disabled={pending} onChange={(e) => changeDept(m, e.target.value || null)} style={{ padding: "4px 8px", fontSize: 12, width: "auto", minWidth: 140 }}>
                          <option value="">— Unassigned —</option>
                          {departments.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                        </select>
                      : <span style={{ color: "var(--f5-text-muted)", fontSize: 12 }}>{departments.find((d) => d.id === deptId)?.label ?? "—"}</span>}
                  </td>
                  <td><span className={`f5-badge ${statusBadge[m.status]}`}>{statusLabel[m.status]}</span></td>
                  <td style={{ textAlign: "right" }}>
                    <button className="f5-btn" onClick={() => setProfileId(m.id)} style={{ padding: "3px 10px", fontSize: 12 }}>View</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <MemberProfileDrawer
          memberId={selected.id}
          departments={departments}
          canEditRole={canManage}
          isSelf={selected.userId === currentUserId}
          onClose={() => setProfileId(null)}
        />
      )}

      {addOpen && (
        <AddUserDrawer
          departments={departments}
          canGrantAdmin={canManage}
          onClose={() => setAddOpen(false)}
        />
      )}
    </>
  );
}
