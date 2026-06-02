"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; ico: string; badge?: string };
const GROUPS: { group: string; items: Item[] }[] = [
  {
    group: "Operations",
    items: [
      { href: "/", label: "Overview", ico: "◎" },
      { href: "/dashboard", label: "Dashboard", ico: "▦" },
      { href: "/analytics", label: "Analytics", ico: "📈" },
    ],
  },
  {
    group: "Communicate",
    items: [
      { href: "/compose", label: "Compose", ico: "✎" },
      { href: "/inbox", label: "Inbox", ico: "✉" },
      { href: "/templates", label: "Templates", ico: "❏" },
      { href: "/channels", label: "Channels", ico: "📡" },
      { href: "/calendar", label: "Calendar", ico: "🗓" },
      { href: "/emergency", label: "Emergency", ico: "🚨" },
    ],
  },
  {
    group: "Audience",
    items: [
      { href: "/tenants", label: "Residents", ico: "👥" },
      { href: "/contacts", label: "Contacts", ico: "📇" },
      { href: "/segments", label: "Segments", ico: "⊞" },
      { href: "/surveys", label: "Surveys", ico: "❔" },
    ],
  },
  {
    group: "Property Ops",
    items: [
      { href: "/workorders", label: "Work Orders", ico: "🔧", badge: "7" },
      { href: "/displays", label: "Displays", ico: "🖥" },
      { href: "/content", label: "Content on Demand", ico: "▶" },
      { href: "/compliance", label: "Compliance", ico: "🛡" },
    ],
  },
  {
    group: "Platform",
    items: [
      { href: "/integrations", label: "Integrations", ico: "🔌" },
      { href: "/ai-agents", label: "AI Agents", ico: "✦" },
      { href: "/admin", label: "Admin", ico: "⚙" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="f5-sidebar">
      <div className="f5-brand">fuse<b>5</b> Hub</div>
      <div className="f5-brand-sub">Tenant Communications</div>
      {GROUPS.map((g) => (
        <div key={g.group}>
          <div className="f5-navgroup">{g.group}</div>
          {g.items.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`f5-navitem${active ? " active" : ""}`}>
                <span className="ico">{item.ico}</span>
                <span>{item.label}</span>
                {item.badge ? <span className="f5-pill-badge">{item.badge}</span> : null}
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}
