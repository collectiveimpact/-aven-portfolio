"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { visibleModules } from "@/lib/modules";
import type { F5Role } from "@/lib/rbac";

// The nav is driven by the module registry: only modules the org has activated AND
// the user's role may view are rendered. Activation is managed in Admin → Modules.
export function Sidebar({ enabled, role }: { enabled: string[]; role: F5Role | null }) {
  const pathname = usePathname();
  const closeNav = () => document.documentElement.classList.remove("nav-open");
  const groups = visibleModules(new Set(enabled), role);
  return (
    <>
    <div className="f5-nav-overlay" onClick={closeNav} aria-hidden />
    <aside className="f5-sidebar">
      <div className="f5-logo-chip" style={{ margin: "2px 4px 6px" }}>
        <Image src="/fuse5-logo.png" alt="Fuse5" width={150} height={114} priority style={{ width: "100%", maxWidth: 150, height: "auto" }} />
      </div>
      <div className="f5-brand-sub" style={{ textAlign: "center" }}>Tenant Communications</div>
      {groups.map((g) => (
        <div key={g.group}>
          <div className="f5-navgroup">{g.group}</div>
          {g.items.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} onClick={closeNav} className={`f5-navitem${active ? " active" : ""}`}>
                <span className="ico">{item.ico}</span>
                <span>{item.label}</span>
                {item.badge ? <span className="f5-pill-badge">{item.badge}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
    </>
  );
}
