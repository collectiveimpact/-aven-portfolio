import { Sidebar } from "@/components/sidebar";
import { hasBackend } from "@/lib/env";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="sa-shell">
      <Sidebar />
      <div className="sa-main">
        {!hasBackend && (
          <div className="sa-env-banner">
            Demo mode — SafeArrival&apos;s own backend isn&apos;t connected. Set NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY to go live.
          </div>
        )}
        <header className="sa-topbar">
          <h1>
            Safe<b>Arrival</b>
          </h1>
          <span className="sa-pill">All Programs (8)</span>
          <span className="sa-pill">Durham</span>
          <span className="sa-live" style={{ marginLeft: "auto" }}>LIVE</span>
        </header>
        {children}
      </div>
    </div>
  );
}
