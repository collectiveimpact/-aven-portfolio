import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { getPortalSession } from "@/lib/portal/session";
import { getResident, getProperty } from "@/lib/portal/data";
import { PortalNav } from "./nav";
import { signOutResident } from "./actions";

// The resident portal has its OWN layout — it deliberately does NOT import the
// staff sidebar or staff auth. Residents authenticate with a portal session
// cookie (see lib/portal/session.ts). When there's no session we render a bare
// shell (the /portal/signin page provides its own centered card).
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getPortalSession();
  const resident = session ? await getResident(session) : null;
  const property = session && resident ? await getProperty(session, resident.property_id) : null;

  return (
    <div className="f5-portal-root">
      <PortalStyles />
      {resident ? (
        <header className="f5-portal-header">
          <div className="f5-portal-headerinner">
            <div className="f5-portal-brand">
              <Link href="/portal" className="f5-portal-logo">
                <span className="f5-portal-logomark">F5</span>
                <span className="f5-portal-logotext">Resident Portal</span>
              </Link>
            </div>

            <div className="f5-portal-headerright">
              <div className="f5-portal-who">
                <div className="f5-portal-whoname">{resident.name}</div>
                <div className="f5-portal-whometa">
                  {[resident.unit ? `Unit ${resident.unit}` : null, property?.name]
                    .filter(Boolean)
                    .join(" · ") || "Resident"}
                </div>
              </div>
              <ThemeToggle />
              <form action={signOutResident}>
                <button type="submit" className="f5-btn" style={{ padding: "7px 12px" }}>
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <PortalNav />
        </header>
      ) : null}

      <main className={resident ? "f5-portal-main" : "f5-portal-main bare"}>{children}</main>

      <footer className="f5-portal-footer">
        <span>Fuse5 Resident Portal</span>
        <span className="f5-portal-footnote">
          Prototype resident sign-in — production uses verified resident accounts.
        </span>
      </footer>
    </div>
  );
}

// Calmer, resident-friendly skin layered on the existing Aurora `--f5-*` tokens.
// Inlined here because the portal owns its own surface and must not edit globals.
function PortalStyles() {
  return (
    <style>{`
      .f5-portal-root { min-height: 100vh; display: flex; flex-direction: column; }
      .f5-portal-header {
        position: sticky; top: 0; z-index: 20;
        background: color-mix(in srgb, var(--f5-surface) 88%, transparent);
        backdrop-filter: blur(10px);
        border-bottom: 1px solid var(--f5-border);
      }
      .f5-portal-headerinner {
        max-width: 760px; margin: 0 auto; padding: 14px 18px;
        display: flex; align-items: center; justify-content: space-between; gap: 14px;
      }
      .f5-portal-logo { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
      .f5-portal-logomark {
        display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px;
        background: var(--f5-gradient-teal, var(--f5-teal)); color: #04201f; font-weight: 800; font-size: 13px;
      }
      .f5-portal-logotext { font-weight: 700; color: var(--f5-text); font-size: 15px; letter-spacing: -0.01em; }
      .f5-portal-headerright { display: flex; align-items: center; gap: 12px; }
      .f5-portal-who { text-align: right; line-height: 1.2; }
      .f5-portal-whoname { font-weight: 600; color: var(--f5-text); font-size: 13.5px; }
      .f5-portal-whometa { color: var(--f5-text-muted); font-size: 11.5px; margin-top: 1px; }
      .f5-portal-nav {
        max-width: 760px; margin: 0 auto; padding: 0 12px 10px;
        display: flex; gap: 6px; overflow-x: auto;
      }
      .f5-portal-navitem {
        display: inline-flex; align-items: center; gap: 7px; padding: 8px 14px; border-radius: 999px;
        text-decoration: none; color: var(--f5-text-muted); font-size: 13.5px; font-weight: 500;
        border: 1px solid transparent; white-space: nowrap; transition: background .15s, color .15s, border-color .15s;
      }
      .f5-portal-navitem:hover { color: var(--f5-text); background: var(--f5-surface-2); }
      .f5-portal-navitem.active {
        color: var(--f5-text); background: var(--f5-teal-subtle); border-color: var(--f5-teal-border);
      }
      .f5-portal-main { flex: 1; width: 100%; max-width: 760px; margin: 0 auto; padding: 22px 18px 40px; }
      .f5-portal-main.bare { display: flex; align-items: center; justify-content: center; padding: 40px 18px; }
      .f5-portal-footer {
        max-width: 760px; margin: 0 auto; width: 100%; padding: 18px; border-top: 1px solid var(--f5-border);
        display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;
        color: var(--f5-text-muted); font-size: 12px;
      }
      .f5-portal-footnote { opacity: 0.8; }
      .f5-portal-h1 { font-size: 22px; font-weight: 800; color: var(--f5-text); letter-spacing: -0.02em; margin: 0; }
      .f5-portal-sub { color: var(--f5-text-muted); font-size: 13.5px; margin-top: 4px; }
      .f5-portal-section-title { font-size: 15px; font-weight: 700; color: var(--f5-text); margin: 0 0 10px; }
      .f5-portal-empty { color: var(--f5-text-muted); font-size: 13.5px; padding: 18px; text-align: center; }
      @media (max-width: 540px) {
        .f5-portal-who { display: none; }
      }
    `}</style>
  );
}
