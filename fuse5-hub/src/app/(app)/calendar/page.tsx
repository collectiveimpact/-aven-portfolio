import { getCalendar, type CalendarRow } from "@/lib/queries";

// Comms Calendar — upcoming scheduled sends grouped by day. Live data.
const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  voice: "Voice",
  display: "Display",
  multi: "Multi-channel",
};

const STATUS_BADGE: Record<string, string> = {
  scheduled: "f5-badge warn",
  sent: "f5-badge ok",
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  sent: "Sent",
};

const channelLabel = (c: string) => CHANNEL_LABEL[c] ?? c;
const statusBadge = (s: string) => STATUS_BADGE[s] ?? "f5-badge";
const statusLabel = (s: string) => STATUS_LABEL[s] ?? s;

export default async function CalendarPage() {
  const events = await getCalendar();

  // Group rows by their day value, preserving first-seen order.
  const days: string[] = [];
  const byDay = new Map<string, CalendarRow[]>();
  for (const e of events) {
    if (!byDay.has(e.day)) {
      byDay.set(e.day, []);
      days.push(e.day);
    }
    byDay.get(e.day)!.push(e);
  }

  return (
    <main className="f5-content">
      <div className="f5-page-title">Comms Calendar</div>
      <div className="f5-page-sub">Upcoming scheduled sends across all channels.</div>

      {days.map((day) => {
        const rows = byDay.get(day)!;
        return (
          <div key={day}>
            <div className="f5-section-title">{day}</div>
            <div className="f5-card" style={{ padding: 0 }}>
              <table className="f5-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Date</th>
                    <th>Channel</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id}>
                      <td style={{ color: "var(--f5-text)" }}>{e.title}</td>
                      <td>{e.day}</td>
                      <td>{channelLabel(e.channel)}</td>
                      <td><span className={statusBadge(e.status)}>{statusLabel(e.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>
        Data source: live
      </div>
    </main>
  );
}
