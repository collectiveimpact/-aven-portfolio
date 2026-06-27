import { requireResident } from "@/lib/portal/guard";
import { getMyRequests } from "@/lib/portal/data";
import { RequestForm } from "./request-form";

const STATUS: Record<string, { label: string; bg: string; fg: string }> = {
  open: { label: "Open", bg: "var(--f5-teal-subtle)", fg: "var(--f5-teal)" },
  in_progress: { label: "In progress", bg: "color-mix(in srgb, #f59e0b 16%, transparent)", fg: "#d97706" },
  resolved: { label: "Resolved", bg: "color-mix(in srgb, #22c55e 16%, transparent)", fg: "#16a34a" },
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return iso.slice(0, 10);
  }
}

export default async function PortalRequestsPage() {
  const { session } = await requireResident();
  const requests = await getMyRequests(session);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <h1 className="f5-portal-h1">Maintenance requests</h1>
        <p className="f5-portal-sub">Submit a new request and track the ones you&apos;ve sent.</p>
      </div>

      <RequestForm />

      <section>
        <h2 className="f5-portal-section-title">Your requests</h2>
        {requests.length === 0 ? (
          <div className="f5-card"><div className="f5-portal-empty">No requests yet. Submitted requests will appear here.</div></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {requests.map((r) => {
              const s = STATUS[r.status] ?? STATUS.open;
              const desc = r.notice?.residentDescription;
              return (
                <article key={r.id} className="f5-card" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 700, color: "var(--f5-text)" }}>{r.title}</div>
                    <span
                      style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 999,
                        background: s.bg, color: s.fg, whiteSpace: "nowrap",
                      }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6, color: "var(--f5-text-muted)", fontSize: 12 }}>
                    {r.category && <span>{r.category}</span>}
                    <span>·</span>
                    <span>Submitted {fmtDate(r.created_at)}</span>
                  </div>
                  {desc && desc !== r.title && (
                    <p style={{ color: "var(--f5-text-muted)", fontSize: 13.5, lineHeight: 1.5, marginTop: 10, whiteSpace: "pre-wrap" }}>
                      {desc}
                    </p>
                  )}
                  {r.notice?.photoUrl && (
                    <a href={r.notice.photoUrl} target="_blank" rel="noreferrer" style={{ color: "var(--f5-teal)", fontSize: 12.5, marginTop: 8, display: "inline-block" }}>
                      View attached photo
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
