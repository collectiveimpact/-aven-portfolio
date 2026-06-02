import { ROLE_LABELS } from "@/lib/rbac";
import { getMembers, getAuditLog, getSubscription } from "@/lib/queries";

// Admin hub — async server component. Members, audit, and billing read live from
// the shared Supabase query layer (with demo fallback).

const statusBadge: Record<string, string> = { active: "ok", invited: "warn", suspended: "bad" };
const statusLabel: Record<string, string> = { active: "Active", invited: "Invited", suspended: "Suspended" };

export default async function AdminPage() {
  const members = await getMembers();
  const audit = await getAuditLog();
  const sub = await getSubscription();

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
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{m.fullName}</td>
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
              <div className="f5-kpi-value" style={{ fontSize: 24 }}>{sub.plan}</div>
              <div className="f5-kpi-sub">Billed annually</div>
            </div>
            <div>
              <div className="f5-kpi-label">Seats</div>
              <div className="f5-kpi-value" style={{ fontSize: 24 }}>{sub.usedSeats}<span style={{ fontSize: 16, color: "var(--f5-text-muted)" }}>/{sub.seats}</span></div>
              <div className="f5-kpi-sub"><span className="f5-up">{Math.max(0, sub.seats - sub.usedSeats)} available</span></div>
            </div>
            <div>
              <div className="f5-kpi-label">Status</div>
              <div className="f5-kpi-value" style={{ fontSize: 24 }}><span className="f5-up">{sub.status}</span></div>
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
            <span>Total due</span><span>{sub.cycleSpend}</span>
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
                <td style={{ color: "var(--f5-text-dim)" }}>{e.when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
