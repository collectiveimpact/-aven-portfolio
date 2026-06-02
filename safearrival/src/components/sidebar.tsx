"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", ico: "📊" },
  { href: "/attendance", label: "Attendance", ico: "🗓" },
  { href: "/check-in", label: "Check-In / Out", ico: "✅" },
  { href: "/alerts", label: "Absence Alerts", ico: "🔔", badge: "2" },
  { href: "/incidents", label: "Incidents", ico: "⚠️" },
  { href: "/parents", label: "Parent Portal", ico: "👪" },
  { href: "/reports", label: "Grant Reports", ico: "📑" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sa-sidebar">
      <div className="sa-brand">
        Safe<b>Arrival</b>
      </div>
      <div className="sa-brand-sub">Youth Safety Platform</div>

      <div className="sa-navgroup">Operations</div>
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`sa-navitem${active ? " active" : ""}`}
          >
            <span className="ico">{item.ico}</span>
            <span>{item.label}</span>
            {item.badge ? <span className="sa-badge-pill">{item.badge}</span> : null}
          </Link>
        );
      })}
    </aside>
  );
}
