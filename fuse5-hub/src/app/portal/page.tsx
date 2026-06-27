import Link from "next/link";
import { requireResident } from "@/lib/portal/guard";
import { getMyNotices, getUpcoming, getProperty } from "@/lib/portal/data";

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

function priorityChip(priority: string) {
  if (priority === "emergency")
    return { label: "Emergency", bg: "color-mix(in srgb, var(--f5-red, #ef4444) 14%, transparent)", fg: "var(--f5-red, #ef4444)" };
  if (priority === "high")
    return { label: "Important", bg: "var(--f5-teal-subtle)", fg: "var(--f5-teal)" };
  return null;
}

export default async function PortalHomePage() {
  const { session, resident } = await requireResident();
  const [notices, upcoming, property] = await Promise.all([
    getMyNotices(session),
    getUpcoming(session),
    getProperty(session, resident.property_id),
  ]);

  const firstName = resident.name.trim().split(/\s+/)[0] || resident.name;

  return (
    <div className="f5-stagger" style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <h1 className="f5-portal-h1">Hi {firstName} 👋</h1>
        <p className="f5-portal-sub">
          {property ? `${property.name}${resident.unit ? ` · Unit ${resident.unit}` : ""}` : "Welcome to your resident portal."}
        </p>
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Link href="/portal/requests" className="f5-card" style={{ textDecoration: "none", padding: 16 }}>
          <div style={{ fontSize: 20 }} aria-hidden>✚</div>
          <div style={{ fontWeight: 700, color: "var(--f5-text)", marginTop: 6 }}>Maintenance request</div>
          <div style={{ color: "var(--f5-text-muted)", fontSize: 12.5, marginTop: 2 }}>Report an issue in your home</div>
        </Link>
        <Link href="/portal/ask" className="f5-card" style={{ textDecoration: "none", padding: 16 }}>
          <div style={{ fontSize: 20 }} aria-hidden>?</div>
          <div style={{ fontWeight: 700, color: "var(--f5-text)", marginTop: 6 }}>Ask a question</div>
          <div style={{ color: "var(--f5-text-muted)", fontSize: 12.5, marginTop: 2 }}>Get help from the assistant</div>
        </Link>
      </div>

      {/* My notices */}
      <section>
        <h2 className="f5-portal-section-title">My notices</h2>
        {notices.length === 0 ? (
          <div className="f5-card"><div className="f5-portal-empty">No notices yet. You&apos;ll see building updates here.</div></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {notices.map((n) => {
              const chip = priorityChip(n.priority);
              return (
                <article key={`${n.id}-${n.channel}`} className="f5-card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 700, color: "var(--f5-text)" }}>{n.subject}</div>
                    <div style={{ color: "var(--f5-text-muted)", fontSize: 12, whiteSpace: "nowrap" }}>{fmtDate(n.created_at)}</div>
                  </div>
                  {chip && (
                    <span
                      style={{
                        display: "inline-block", marginTop: 8, fontSize: 11, fontWeight: 700,
                        padding: "2px 8px", borderRadius: 999, background: chip.bg, color: chip.fg,
                      }}
                    >
                      {chip.label}
                    </span>
                  )}
                  {n.body && (
                    <p style={{ color: "var(--f5-text-muted)", fontSize: 13.5, lineHeight: 1.55, marginTop: 10, whiteSpace: "pre-wrap" }}>
                      {n.body}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* What's coming up */}
      <section>
        <h2 className="f5-portal-section-title">What&apos;s coming up</h2>
        {upcoming.length === 0 ? (
          <div className="f5-card"><div className="f5-portal-empty">Nothing scheduled right now.</div></div>
        ) : (
          <div className="f5-card" style={{ padding: 6 }}>
            {upcoming.map((u, i) => (
              <div
                key={u.id}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 12px",
                  borderTop: i === 0 ? "none" : "1px solid var(--f5-border)",
                }}
              >
                <div
                  style={{
                    display: "grid", placeItems: "center", minWidth: 46, padding: "6px 4px", borderRadius: 10,
                    background: "var(--f5-teal-subtle)", color: "var(--f5-teal)", textAlign: "center", lineHeight: 1.1,
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{new Date(u.day).getDate()}</div>
                  <div style={{ fontSize: 10, textTransform: "uppercase" }}>
                    {new Date(u.day).toLocaleDateString(undefined, { month: "short" })}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--f5-text)", fontSize: 14 }}>{u.title}</div>
                  {u.channel && <div style={{ color: "var(--f5-text-muted)", fontSize: 12 }}>{u.channel}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
