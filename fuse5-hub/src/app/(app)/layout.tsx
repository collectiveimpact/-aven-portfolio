import { cookies } from "next/headers";
import { Sidebar } from "@/components/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNavToggle } from "@/components/mobile-nav-toggle";
import { hasBackend } from "@/lib/env";
import { DEMO_ORG } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/rbac";
import { signOut } from "@/app/(auth)/login/actions";
import { ImpersonationBanner } from "./admin/impersonation-banner";
import { IMPERSONATE_COOKIE } from "@/lib/platform";

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

  return (
    <div className="f5-shell">
      <Sidebar />
      <div className="f5-main">
        {impersonation && <ImpersonationBanner {...impersonation} />}
        {!hasBackend && (
          <div className="f5-env-banner">
            Demo mode — backend not connected. Set NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY to go live.
          </div>
        )}
        <header className="f5-topbar">
          <MobileNavToggle />
          <h1>fuse<b>5</b> Hub</h1>
          <span className="f5-pill">{orgName}</span>
          <span className="f5-pill">All Properties (31)</span>
          <span className="f5-live" style={{ marginLeft: "auto" }}>LIVE</span>
          <ThemeToggle />
          {user ? (
            <>
              <span className="f5-pill">{user.fullName || user.email}{user.role ? ` · ${ROLE_LABELS[user.role]}` : ""}</span>
              <form action={signOut}>
                <button type="submit" className="f5-btn" style={{ padding: "6px 12px" }}>Logout</button>
              </form>
            </>
          ) : null}
        </header>
        {children}
      </div>
    </div>
  );
}
