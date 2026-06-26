"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROLE_LABELS, ROLE_TIERS, tierForRole, type F5Role } from "@/lib/rbac";
import {
  getMemberProfile,
  updateMemberProfile,
  onboardMember,
  type DepartmentRow,
  type MemberProfile,
} from "./actions";

const fg = "var(--f5-text)";
const dim = "var(--f5-text-muted)";
const ROLES = Object.keys(ROLE_LABELS) as F5Role[];

const statusBadge: Record<string, string> = { active: "ok", invited: "warn", suspended: "bad" };
const statusLabel: Record<string, string> = { active: "Active", invited: "Invited", suspended: "Suspended" };

function fmtDate(v: string | null): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

function initials(name: string, email: string): string {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : src.slice(0, 2)).toUpperCase();
}

// Shared field-row primitives so the two flows look identical.
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 12 }}>
      <span className="f5-label" style={{ display: "block", marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}

// ============================================================================
// Profile drawer — view + edit a single member.
// ============================================================================
export function MemberProfileDrawer({
  memberId,
  departments,
  canEditRole,
  isSelf,
  onClose,
}: {
  memberId: string;
  departments: DepartmentRow[];
  canEditRole: boolean;
  isSelf: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [data, setData] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // editable form state (seeded once loaded)
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<F5Role>("viewer");
  const [departmentId, setDepartmentId] = useState<string | null>(null);

  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true); setLoadError(null);
    getMemberProfile(memberId).then((res) => {
      if (!live) return;
      if (!res.ok || !res.data) { setLoadError(res.error ?? "Could not load profile."); setLoading(false); return; }
      const p = res.data;
      setData(p);
      setFullName(p.fullName); setEmail(p.email); setRole(p.role); setDepartmentId(p.departmentId);
      setLoading(false);
    });
    return () => { live = false; };
  }, [memberId]);

  function save() {
    setError(null); setNote(null);
    start(async () => {
      const res = await updateMemberProfile(memberId, { fullName, email, role, departmentId });
      if (!res.ok) { setError(res.error ?? "Could not save."); return; }
      if (res.error) setNote(res.error); else setNote("Saved ✓");
      router.refresh();
    });
  }

  const tier = ROLE_TIERS[tierForRole(role)];

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", justifyContent: "flex-end" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Member profile"
    >
      <div className="f5-card" style={{ width: 480, maxWidth: "96vw", height: "100%", borderRadius: 0, overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 44, height: 44, borderRadius: 99, background: "var(--f5-surface-3, rgba(255,255,255,0.06))", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: fg }}>
            {initials(fullName, email)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: fg, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fullName || "—"}{isSelf && <span style={{ color: dim, fontWeight: 400 }}> (you)</span>}</div>
            <div style={{ fontSize: 12, color: dim }}>{email || "—"}</div>
          </div>
          <button className="f5-btn" onClick={onClose} style={{ padding: "4px 10px" }} aria-label="Close">✕</button>
        </div>

        {loading && <div style={{ marginTop: 18, fontSize: 13, color: dim }}>Loading profile…</div>}
        {loadError && <div style={{ marginTop: 18, color: "var(--f5-red)", fontSize: 13 }}>{loadError}</div>}

        {data && !loading && (
          <>
            <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              <span className={`f5-badge ${statusBadge[data.status] ?? ""}`}>{statusLabel[data.status] ?? data.status}</span>
              <span className="f5-badge" title={tier.tagline}>{tier.label}</span>
            </div>

            {/* read-only meta */}
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "auto 1fr", gap: "6px 14px", fontSize: 12.5 }}>
              <span style={{ color: dim }}>Joined</span><span style={{ color: fg }}>{fmtDate(data.createdAt)}</span>
              <span style={{ color: dim }}>Last active</span><span style={{ color: fg }}>{fmtDate(data.lastActiveAt)}</span>
            </div>

            <div className="f5-section-title" style={{ marginTop: 20 }}>Edit profile</div>

            {error && <div style={{ color: "var(--f5-red)", fontSize: 13, marginBottom: 10 }}>{error}</div>}
            {note && <div style={{ color: note.startsWith("Saved") ? "var(--f5-green,#34d399)" : "var(--f5-amber,#f59e0b)", fontSize: 12.5, marginBottom: 10 }}>{note}</div>}

            <Row label="Full name">
              <input className="f5-input" value={fullName} disabled={pending} onChange={(e) => { setFullName(e.target.value); setNote(null); }} style={{ width: "100%", padding: "8px 10px", fontSize: 13 }} />
            </Row>
            <Row label="Email">
              <input className="f5-input" type="email" value={email} disabled={pending} onChange={(e) => { setEmail(e.target.value); setNote(null); }} style={{ width: "100%", padding: "8px 10px", fontSize: 13 }} />
            </Row>
            <Row label="Role">
              {canEditRole ? (
                <select className="f5-select" value={role} disabled={pending} onChange={(e) => { setRole(e.target.value as F5Role); setNote(null); }} style={{ width: "100%", padding: "8px 10px", fontSize: 13 }}>
                  {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              ) : (
                <div style={{ fontSize: 13, color: fg }}>{ROLE_LABELS[role]} <span style={{ color: dim, fontSize: 11 }}>(only an Org Admin can change roles)</span></div>
              )}
            </Row>
            <Row label="Department">
              <select className="f5-select" value={departmentId ?? ""} disabled={pending} onChange={(e) => { setDepartmentId(e.target.value || null); setNote(null); }} style={{ width: "100%", padding: "8px 10px", fontSize: 13 }}>
                <option value="">— Unassigned —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </Row>

            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button className="f5-btn primary" onClick={save} disabled={pending || !fullName.trim() || !email.trim()}>
                {pending ? "Saving…" : "Save changes"}
              </button>
              <button className="f5-btn" onClick={onClose} disabled={pending}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Add-user drawer — onboard a new member.
// ============================================================================
export function AddUserDrawer({
  departments,
  canGrantAdmin,
  onClose,
}: {
  departments: DepartmentRow[];
  canGrantAdmin: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<F5Role>("viewer");
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [sendInvite, setSendInvite] = useState(true);

  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function submit() {
    setError(null); setDone(null);
    start(async () => {
      const res = await onboardMember({ fullName, email, role, departmentId, sendInvite });
      if (!res.ok) { setError(res.error ?? "Could not add user."); return; }
      const out = res.data;
      setDone(
        out?.pending
          ? `Invite pending for ${email} — account will be provisioned by an admin.`
          : out?.invited
            ? `Invite sent to ${email}. They'll appear once they accept.`
            : `${fullName} added to the organization ✓`,
      );
      router.refresh();
      // clear the form so a second user can be added without reopening
      setFullName(""); setEmail(""); setRole("viewer"); setDepartmentId(null);
    });
  }

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 50, display: "flex", justifyContent: "flex-end" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add user"
    >
      <div className="f5-card" style={{ width: 460, maxWidth: "96vw", height: "100%", borderRadius: 0, overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: fg, fontSize: 16 }}>Add a user</div>
            <div style={{ fontSize: 12, color: dim }}>Onboard a new member to your organization.</div>
          </div>
          <button className="f5-btn" onClick={onClose} style={{ padding: "4px 10px" }} aria-label="Close">✕</button>
        </div>

        {error && <div style={{ color: "var(--f5-red)", fontSize: 13, margin: "14px 0 0" }}>{error}</div>}
        {done && <div style={{ color: "var(--f5-green,#34d399)", fontSize: 12.5, margin: "14px 0 0" }}>{done}</div>}

        <div style={{ marginTop: 16 }}>
          <Row label="Full name">
            <input className="f5-input" value={fullName} disabled={pending} placeholder="Jordan Patel" onChange={(e) => { setFullName(e.target.value); setDone(null); }} style={{ width: "100%", padding: "8px 10px", fontSize: 13 }} />
          </Row>
          <Row label="Email">
            <input className="f5-input" type="email" value={email} disabled={pending} placeholder="jordan@org.example" onChange={(e) => { setEmail(e.target.value); setDone(null); }} style={{ width: "100%", padding: "8px 10px", fontSize: 13 }} />
          </Row>
          <Row label="Role">
            <select className="f5-select" value={role} disabled={pending} onChange={(e) => { setRole(e.target.value as F5Role); setDone(null); }} style={{ width: "100%", padding: "8px 10px", fontSize: 13 }}>
              {ROLES.map((r) => {
                const adminRole = r === "super_admin" || r === "org_admin";
                return <option key={r} value={r} disabled={adminRole && !canGrantAdmin}>{ROLE_LABELS[r]}{adminRole && !canGrantAdmin ? " (Org Admin only)" : ""}</option>;
              })}
            </select>
          </Row>
          <Row label="Department">
            <select className="f5-select" value={departmentId ?? ""} disabled={pending} onChange={(e) => { setDepartmentId(e.target.value || null); setDone(null); }} style={{ width: "100%", padding: "8px 10px", fontSize: 13 }}>
              <option value="">— Unassigned —</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </Row>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: fg, margin: "4px 0 6px", cursor: "pointer" }}>
            <input type="checkbox" checked={sendInvite} disabled={pending} onChange={(e) => { setSendInvite(e.target.checked); setDone(null); }} />
            Send an email invitation to set up their account
          </label>
          <div style={{ fontSize: 11.5, color: dim, marginBottom: 14 }}>
            If invites can&apos;t be sent yet, the user is recorded as <strong>invite pending</strong> and an admin provisions the account.
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button className="f5-btn primary" onClick={submit} disabled={pending || !fullName.trim() || !email.trim()}>
              {pending ? "Adding…" : "Add user"}
            </button>
            <button className="f5-btn" onClick={onClose} disabled={pending}>Done</button>
          </div>
        </div>
      </div>
    </div>
  );
}
