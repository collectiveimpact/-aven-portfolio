import { Sidebar } from "@/components/sidebar";
import { hasBackend } from "@/lib/env";
import { DEMO_ORG } from "@/lib/data";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="f5-shell">
      <Sidebar />
      <div className="f5-main">
        {!hasBackend && (
          <div className="f5-env-banner">
            Demo mode — backend not connected. Set NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY to go live.
          </div>
        )}
        <header className="f5-topbar">
          <h1>fuse<b>5</b> Hub</h1>
          <span className="f5-pill">{DEMO_ORG}</span>
          <span className="f5-pill">All Properties (31)</span>
          <span className="f5-live" style={{ marginLeft: "auto" }}>LIVE</span>
        </header>
        {children}
      </div>
    </div>
  );
}
