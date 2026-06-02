const TITLES: Record<string, { title: string; blurb: string }> = {
  attendance: { title: "Attendance", blurb: "Daily rosters per program — mark present, late, absent, excused." },
  "check-in": { title: "Check-In / Out", blurb: "Guardian-verified check-in and release events, with audit trail." },
  alerts: { title: "Absence Alerts", blurb: "Unexplained absences with notify → escalate → resolve workflow." },
  incidents: { title: "Incidents", blurb: "Log and triage safety/behaviour incidents by severity." },
  parents: { title: "Parent Portal", blurb: "Guardian-facing absence reporting and check-out authorization." },
  reports: { title: "Grant Reports", blurb: "Funder-ready attendance and participation reporting." },
};

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const meta = TITLES[section] ?? { title: section, blurb: "" };
  return (
    <main className="sa-content">
      <div className="sa-greeting">{meta.title}</div>
      <div className="sa-greeting-sub">{meta.blurb}</div>
      <div className="sa-card" style={{ marginTop: 18 }}>
        <div className="sa-kpi-label">Coming next</div>
        <p style={{ color: "var(--f5-text-secondary)", fontSize: 14, lineHeight: 1.6, maxWidth: 560 }}>
          This module is scaffolded in SafeArrival&apos;s own backend (see{" "}
          <code>supabase/migrations/0001_init.sql</code>) and will be built out on the
          standalone schema. The Dashboard is the first live surface.
        </p>
      </div>
    </main>
  );
}
