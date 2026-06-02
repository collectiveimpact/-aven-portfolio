import { getSegments } from "@/lib/queries";

export default async function SegmentsPage() {
  const segments = await getSegments();

  return (
    <main className="f5-content">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
        <div>
          <div className="f5-page-title">Segments</div>
          <div className="f5-page-sub">Saved audiences for targeted broadcasts and surveys.</div>
        </div>
        <button className="f5-btn primary" style={{ marginTop: 4 }}>+ New Segment</button>
      </div>

      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 18 }}>
        {segments.map((s) => (
          <div key={s.id} className="f5-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="f5-section-title" style={{ margin: 0 }}>{s.name}</div>
              <span className="f5-pill">{s.size.toLocaleString()}</span>
            </div>
            <div style={{ color: "var(--f5-text-secondary)", fontSize: 13.5, marginTop: 10 }}>{s.rule}</div>
            <div className="f5-kpi-sub" style={{ marginTop: 14 }}>{s.size.toLocaleString()} residents match</div>
          </div>
        ))}
      </div>
    </main>
  );
}
