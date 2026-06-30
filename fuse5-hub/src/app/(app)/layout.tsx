import { cookies } from "next/headers";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNavToggle } from "@/components/mobile-nav-toggle";
import { TopbarControls, VIEW_ROLE_LABELS } from "@/components/topbar-controls";
import { hasBackend } from "@/lib/env";
import { DEMO_ORG } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { getEnabledModules, getProperties } from "@/lib/queries";
import { MODULES, resolveEnabled } from "@/lib/modules";
import { getViewRole, getScope, effectiveRole } from "@/lib/view";
import { PROVIDER_COMPLIANCE } from "@/lib/platform-admin";
import { signOut } from "@/app/(auth)/login/actions";
import { ImpersonationBanner } from "./admin/impersonation-banner";
import { IMPERSONATE_COOKIE } from "@/lib/platform";
import { ToastProvider } from "@/components/toast";

interface ImpersonationState { name: string; roleLabel: string; provider: string }
async function readImpersonation(): Promise<ImpersonationState | null> {
  try {
    const raw = (await cookies()).get(IMPERSONATE_COOKIE)?.value;
    if (!raw) return null;
    const v = JSON.parse(raw);
    if (v && typeof v.name === "string") return v as ImpersonationState;
  } catch { /* ignore malformed cookie */ }
  return null;
}

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = hasBackend ? await getCurrentUser() : null;
  const orgName = user?.orgName ?? DEMO_ORG;
  const impersonation = await readImpersonation();

  // View context: a Super Admin can preview as another role, and everyone can
  // scope the dashboards to a provider/property (top-bar controls → cookies).
  const realRole = user?.role ?? (hasBackend ? null : "super_admin");
  const viewRole = await getViewRole();
  const eff = effectiveRole(realRole, viewRole);
  const previewing = realRole === "super_admin" && eff !== "super_admin";
  const scope = await getScope();

  // Top-bar filter data: provider roster (super-admin) + property list.
  const properties = await getProperties();
  const providerNames = [...new Set(PROVIDER_COMPLIANCE.map((p) => p.provider))];

  // No backend → show everything; otherwise the org's activated + role-permitted set.
  const enabled = hasBackend ? await getEnabledModules() : [...resolveEnabled(MODULES.map((m) => m.key))];

  return (
    <ToastProvider>
    <div className="f5-shell">
      <Sidebar enabled={enabled} role={eff} />
      <div className="f5-main">
        {impersonation && <ImpersonationBanner {...impersonation} />}
        {previewing && eff && (
          <div role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "7px 16px", background: "var(--f5-teal, #00CCCC)", color: "#04201f", fontSize: 13, fontWeight: 600 }}>
            👓 Previewing as <strong>{VIEW_ROLE_LABELS[eff as "org_admin" | "frontline"]}</strong> — use the “View as” menu (top right) to return to Super Admin.
          </div>
        )}
        {!hasBackend && (
          <div className="f5-env-banner">
            Demo mode — backend not connected. Set NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY to go live.
          </div>
        )}
        <header className="f5-topbar">
          <MobileNavToggle />
          <h1>fuse<b>5</b> Hub</h1>
          <TopbarControls
            orgName={scope.providerName ?? orgName}
            providers={providerNames}
            properties={properties.map((p) => p.name)}
            scope={scope}
            realRole={realRole}
            effectiveRole={eff}
            userName={user ? `${user.fullName || user.email}` : "Account"}
          />
          <ThemeToggle />
          {user ? (
            <form action={signOut}>
              <button type="submit" className="f5-btn" style={{ padding: "6px 12px" }}>Logout</button>
            </form>
          ) : null}
        </header>
        {children}
      </div>
    </div>
    </ToastProvider>
  );
}
