import type { CalendarEvent } from "@/lib/types";

// Comms Calendar — upcoming scheduled sends grouped by week. Demo data.
const ORG = "demo-org";

type Grouped = CalendarEvent & { week: string };

const EVENTS: Grouped[] = [
  { id: "ev-1", org_id: ORG, week: "This Week", title: "June Rent Reminder", date: "Mon Jun 2", channel: "email", status: "scheduled" },
  { id: "ev-2", org_id: ORG, week: "This Week", title: "Elevator Maintenance Advisory", date: "Tue Jun 3", channel: "sms", status: "scheduled" },
  { id: "ev-3", org_id: ORG, week: "This Week", title: "Lobby Welcome Loop Refresh", date: "Wed Jun 4", channel: "display", status: "scheduled" },
  { id: "ev-4", org_id: ORG, week: "This Week", title: "Resident Satisfaction Survey", date: "Fri Jun 6", channel: "multi", status: "scheduled" },
  { id: "ev-5", org_id: ORG, week: "Next Week", title: "Community BBQ Invite", date: "Mon Jun 9", channel: "whatsapp", status: "scheduled" },
  { id: "ev-6", org_id: ORG, week: "Next Week", title: "Water Shutoff Notice — Tower B", date: "Wed Jun 11", channel: "voice", status: "scheduled" },
  { id: "ev-7", org_id: ORG, week: "Next Week", title: "BBQ Reminder", date: "Thu Jun 12", channel: "sms", status: "scheduled" },
  { id: "ev-8", org_id: ORG, week: "Next Week", title: "Newsletter — Summer Edition", date: "Fri Jun 13", channel: "email", status: "scheduled" },
];

const WEEKS = ["This Week", "Next Week"];

const CHANNEL_LABEL: Record<CalendarEvent["channel"], string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  voice: "Voice",
  display: "Display",
  multi: "Multi-channel",
};

const STATUS_BADGE: Record<CalendarEvent["status"], string> = {
  scheduled: "f5-badge warn",
  sent: "f5-badge ok",
};

const STATUS_LABEL: Record<CalendarEvent["status"], string> = {
  scheduled: "Scheduled",
  sent: "Sent",
};

export default async function CalendarPage() {
  return (
    <main className="f5-content">
      <div className="f5-page-title">Comms Calendar</div>
      <div className="f5-page-sub">Upcoming scheduled sends across all channels.</div>

      {WEEKS.map((week) => {
        const rows = EVENTS.filter((e) => e.week === week);
        return (
          <div key={week}>
            <div className="f5-section-title">{week}</div>
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
                      <td>{e.date}</td>
                      <td>{CHANNEL_LABEL[e.channel]}</td>
                      <td><span className={STATUS_BADGE[e.status]}>{STATUS_LABEL[e.status]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>
        Data source: demo seed
      </div>
    </main>
  );
}
