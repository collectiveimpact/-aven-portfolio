import { ROLE_LABELS } from "@/lib/rbac";
import type { Member, AuditEntry } from "@/lib/types";

// Admin hub — async server component. All data is local demo data typed via @/lib/types.

const ORG_ID = "org_fuse5_demo";

const members: (Member & { status: "active" | "invited" | "suspended" })[] = [
  { id: "m1", org_id: ORG_ID, user_id: "u1", full_name: "Dana Whitfield", email: "dana.whitfield@fuse5.io", role: "super_admin", status: "active" },
  { id: "m2", org_id: ORG_ID, user_id: "u2", full_name: "Marcus Lee", email: "marcus.lee@northgateliving.ca", role: "org_admin", status: "active" },
  { id: "m3", org_id: ORG_ID, user_id: "u3", full_name: "Priya Nair", email: "priya.nair@northgateliving.ca", role: "manager", status: "active" },
  { id: "m4", org_id: ORG_ID, user_id: "u4", full_name: "Tomas Riveiro", email: "tomas.riveiro@northgateliving.ca", role: "property_manager", status: "active" },
  { id: "m5", org_id: ORG_ID, user_id: "u5", full_name: "Aisha Mohammed", email: "aisha.mohammed@northgateliving.ca", role: "comms_manager", status: "active" },
  { id: "m6", org_id: ORG_ID, user_id: "u6", full_name: "Liam O'Connell", email: "liam.oconnell@northgateliving.ca", role: "publisher", status: "invited" },
  { id: "m7", org_id: ORG_ID, user_id: "u7", full_name: "Grace Okafor", email: "grace.okafor@northgateliving.ca", role: "frontline", status: "active" },
  { id: "m8", org_id: ORG_ID, user_id: "u8", full_name: "Henry Tran", email: "henry.tran@northgateliving.ca", role: "frontline", status: "active" },
  { id: "m9", org_id: ORG_ID, user_id: "u9", full_name: "Board of Directors", email: "board@northgateliving.ca", role: "viewer", status: "active" },
  { id: "m10", org_id: ORG_ID, user_id: "u10", full_name: "Sofia Castellanos", email: "sofia.castellanos@northgateliving.ca", role: "property_manager", status: "suspended" },
];

const statusBadge: Record<string, string> = { active: "ok", invited: "warn", suspended: "bad" };
const statusLabel: Record<string, string> = { active: "Active", invited: "Invited", suspended: "Suspended" };

const audit: AuditEntry[] = [
  { id: "a1", org_id: ORG_ID, actor: "Aisha Mohammed", action: "Broadcast sent", detail: "Heat advisory — 4 properties, 612 residents", created_at: "2 min ago" },
  { id: "a2", org_id: ORG_ID, actor: "Marcus Lee", action: "Role changed", detail: "Sofia Castellanos → suspended", created_at: "1 hr ago" },
  { id: "a3", org_id: ORG_ID, actor: "Tomas Riveiro", action: "Work order resolved", detail: "WO-2291 elevator inspection — Northgate Tower", created_at: "3 hr ago" },
  { id: "a4", org_id: ORG_ID, actor: "Dana Whitfield", action: "Integration connected", detail: "Yardi Voyager sync enabled", created_at: "Yesterday" },
  { id: "a5", org_id: ORG_ID, actor: "Priya Nair", action: "Template approved", detail: "Rent increase notice (N1) v3 published", created_at: "Yesterday" },
  { id: "a6", org_id: ORG_ID, actor: "Liam O'Connell", action: "Display content pushed", detail: "Lobby playlist updated — 3 displays", created_at: "2 days ago" },
  { id: "a7", org_id: ORG_ID, actor: "Marcus Lee", action: "Member invited", detail: "liam.oconnell@northgateliving.ca → Publisher", created_at: "2 days ago" },
  { id: "a8", org_id: ORG_ID, actor: "System", action: "Billing event", detail: "Invoice #INV-0418 paid — $1,260.00", created_at: "5 days ago" },
];

export default async function AdminPage() {
  return (
    <main className="f5-content">
      <div className="f5-page-title">Admin</div>
      <div className="f5-page-sub">Northgate Living — members, billing, org settings, and audit trail.</div>

      <div className="f5-section-title">Users &amp; Roles</div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{m.full_name}</td>
                <td>{m.email}</td>
                <td>{ROLE_LABELS[m.role]}</td>
                <td><span className={`f5-badge ${statusBadge[m.status]}`}>{statusLabel[m.status]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="f5-section-title">Billing</div>
      <div className="f5-grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <div className="f5-card">
          <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", gap: 18 }}>
            <div>
              <div className="f5-kpi-label">Plan</div>
              <div className="f5-kpi-value" style={{ fontSize: 24 }}>Growth</div>
              <div className="f5-kpi-sub">Billed annually</div>
            </div>
            <div>
              <div className="f5-kpi-label">Seats</div>
              <div className="f5-kpi-value" style={{ fontSize: 24 }}>18<span style={{ fontSize: 16, color: "var(--f5-text-muted)" }}>/25</span></div>
              <div className="f5-kpi-sub"><span className="f5-up">7 available</span></div>
            </div>
            <div>
              <div className="f5-kpi-label">Status</div>
              <div className="f5-kpi-value" style={{ fontSize: 24 }}><span className="f5-up">Active</span></div>
              <div className="f5-kpi-sub">Next invoice Jul 1, 2026</div>
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            <button className="f5-btn primary" type="button">Manage billing</button>
          </div>
        </div>
        <div className="f5-card">
          <div className="f5-kpi-label">This Cycle</div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--f5-border)", fontSize: 13 }}>
            <span style={{ color: "var(--f5-text-secondary)" }}>Base (Growth)</span><span>$960.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--f5-border)", fontSize: 13 }}>
            <span style={{ color: "var(--f5-text-secondary)" }}>SMS overage</span><span>$184.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", fontSize: 13 }}>
            <span style={{ color: "var(--f5-text-secondary)" }}>AI agents</span><span>$116.00</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 10, fontWeight: 700 }}>
            <span>Total due</span><span>$1,260.00</span>
          </div>
        </div>
      </div>

      <div className="f5-section-title">Org Settings</div>
      <div className="f5-card">
        <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
          <div>
            <label className="f5-label">Organization name</label>
            <input className="f5-input" value="Northgate Living" readOnly />
          </div>
          <div>
            <label className="f5-label">Region</label>
            <input className="f5-input" value="Canada (Ontario)" readOnly />
          </div>
          <div>
            <label className="f5-label">Data residency</label>
            <input className="f5-input" value="ca-central-1" readOnly />
          </div>
        </div>
        <div className="f5-kpi-sub" style={{ marginTop: 12 }}>
          Residency and region are locked to your contract. Contact your Fuse5 admin to change.
        </div>
      </div>

      <div className="f5-section-title">Audit Log</div>
      <div className="f5-card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="f5-table">
          <thead>
            <tr>
              <th>Actor</th>
              <th>Action</th>
              <th>Detail</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {audit.map((e) => (
              <tr key={e.id}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{e.actor}</td>
                <td>{e.action}</td>
                <td>{e.detail}</td>
                <td style={{ color: "var(--f5-text-dim)" }}>{e.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
