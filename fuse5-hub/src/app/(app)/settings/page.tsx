import Link from "next/link";
import { getOrgSettings, getSegments } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canAdmin, ROLE_LABELS } from "@/lib/rbac";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsForm } from "./settings-form";

// Settings = PERSONAL first (your profile + preferences). Organization-wide
// configuration lives in Admin → Org Settings; we surface it here only to admins
// as a convenience, clearly labelled, to avoid two competing "org settings" homes.
export default async function SettingsPage() {
  const [settings, segments, me] = await Promise.all([getOrgSettings(), getSegments(), getCurrentUser()]);
  const orgName = me?.orgName ?? "Your Organization";
  const isAdmin = me?.role ? canAdmin(me.role) : false;
  const fullName = me?.fullName?.trim() || "You";
  const initials = fullName.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "··";
  const roleLabel = me?.role ? ROLE_LABELS[me.role] : "—";

  return (
    <main className="f5-content">
      <div className="f5-page-title">Settings</div>
      <div className="f5-page-sub">Your profile and preferences.{isAdmin ? " Organization-wide settings are managed in Admin." : ""}</div>

      {/* ── Personal ── */}
      <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 18, alignItems: "start" }}>
        {/* Your profile */}
        <div className="f5-card">
          <div className="f5-section-title" style={{ marginTop: 0 }}>Your Profile</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--f5-teal-subtle, color-mix(in srgb, var(--f5-teal) 18%, transparent))", color: "var(--f5-teal)", display: "grid", placeItems: "center", fontWeight: 700 }}>{initials}</div>
            <div>
              <div style={{ fontWeight: 700, color: "var(--f5-text)" }}>{fullName}</div>
              <div style={{ fontSize: 12.5, color: "var(--f5-text-muted)" }}>{me?.email ?? "—"}</div>
            </div>
          </div>
          <Row label="Role" value={roleLabel} />
          <Row label="Organization" value={orgName} />
          <div style={{ fontSize: 12, color: "var(--f5-text-dim)", marginTop: 10 }}>
            {isAdmin
              ? <>Edit names, roles & departments in <Link href="/admin" style={{ color: "var(--f5-teal)" }}>Admin → Users &amp; Roles</Link>.</>
              : <>To change your name, role, or department, contact an administrator.</>}
          </div>
        </div>

        {/* Preferences */}
        <div className="f5-card">
          <div className="f5-section-title" style={{ marginTop: 0 }}>Preferences</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--f5-border)" }}>
            <div>
              <div style={{ color: "var(--f5-text)", fontSize: 13.5 }}>Appearance</div>
              <div style={{ fontSize: 12, color: "var(--f5-text-muted)" }}>Light or dark theme (saved on this device).</div>
            </div>
            <ThemeToggle />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
            <div>
              <div style={{ color: "var(--f5-text)", fontSize: 13.5 }}>Language</div>
              <div style={{ fontSize: 12, color: "var(--f5-text-muted)" }}>Interface language.</div>
            </div>
            <span className="f5-badge">English</span>
          </div>
        </div>
      </div>

      {/* ── Organization (admins only) — the real home is Admin → Org Settings ── */}
      {isAdmin && (
        <>
          <div className="f5-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 26 }}>
            <span>Organization <span style={{ fontSize: 11, fontWeight: 400, color: "var(--f5-text-dim)" }}>· admin</span></span>
            <Link href="/admin" className="f5-btn" style={{ padding: "5px 12px", fontSize: 12 }}>Open Admin → Org Settings</Link>
          </div>
          <div className="f5-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 10, alignItems: "start" }}>
            <SettingsForm initial={settings} orgName={orgName} canEdit={isAdmin} />

            <div className="f5-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div className="f5-section-title" style={{ margin: 0 }}>Tenant Groups</div>
                <Link href="/segments" className="f5-btn" style={{ padding: "5px 12px", fontSize: 12 }}>Manage</Link>
              </div>
              <div style={{ marginTop: 10 }}>
                {segments.map((g) => (
                  <div key={g.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid var(--f5-border)", fontSize: 13 }}>
                    <span style={{ color: "var(--f5-text)" }}>{g.name}</span>
                    <span style={{ color: "var(--f5-text-muted)" }}>{g.size} tenants</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--f5-border)", fontSize: 13 }}>
      <span style={{ color: "var(--f5-text-muted)" }}>{label}</span>
      <span style={{ color: "var(--f5-text)" }}>{value}</span>
    </div>
  );
}
