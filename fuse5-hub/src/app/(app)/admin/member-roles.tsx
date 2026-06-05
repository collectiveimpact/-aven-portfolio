"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { MemberRow } from "@/lib/queries";
import { ROLE_LABELS, type F5Role } from "@/lib/rbac";
import { setMemberRole } from "./actions";

const statusBadge: Record<string, string> = { active: "ok", invited: "warn", suspended: "bad" };
const statusLabel: Record<string, string> = { active: "Active", invited: "Invited", suspended: "Suspended" };
const ROLES = Object.keys(ROLE_LABELS) as F5Role[];

export function MemberRoles({ members, canManage, currentUserId }: { members: MemberRow[]; canManage: boolean; currentUserId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // optimistic local role per member id
  const [roles, setRoles] = useState<Record<string, F5Role>>(() => Object.fromEntries(members.map((m) => [m.id, m.role])));

  function change(m: MemberRow, next: F5Role) {
    const prev = roles[m.id];
    setRoles((r) => ({ ...r, [m.id]: next })); setError(null);
    startTransition(async () => {
      const res = await setMemberRole(m.id, next);
      if (!res.ok) { setRoles((r) => ({ ...r, [m.id]: prev })); setError(res.error ?? "Could not change role."); return; }
      router.refresh();
    });
  }

  return (
    <>
      <div className="f5-section-title">Users &amp; Roles</div>
      {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginBottom: 10 }}>{error}</div>}
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{m.fullName}{m.userId === currentUserId && <span style={{ color: "var(--f5-text-dim)", fontWeight: 400 }}> (you)</span>}</td>
                <td>{m.email}</td>
                <td>
                  {canManage
                    ? <select className="f5-select" value={roles[m.id] ?? m.role} disabled={pending} onChange={(e) => change(m, e.target.value as F5Role)} style={{ padding: "4px 8px", fontSize: 12, width: "auto", minWidth: 150 }}>
                        {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    : ROLE_LABELS[m.role]}
                </td>
                <td><span className={`f5-badge ${statusBadge[m.status]}`}>{statusLabel[m.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
