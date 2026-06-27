"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/portal", label: "Home", icon: "⌂" },
  { href: "/portal/requests", label: "Requests", icon: "✚" },
  { href: "/portal/surveys", label: "Surveys", icon: "✓" },
  { href: "/portal/ask", label: "Ask", icon: "?" },
  { href: "/portal/notifications", label: "Alerts", icon: "🔔" },
];

export function PortalNav() {
  const pathname = usePathname();
  return (
    <nav className="f5-portal-nav" aria-label="Resident portal">
      {ITEMS.map((it) => {
        const active = it.href === "/portal" ? pathname === "/portal" : pathname.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`f5-portal-navitem${active ? " active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <span aria-hidden style={{ opacity: 0.85 }}>{it.icon}</span>
            <span>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
