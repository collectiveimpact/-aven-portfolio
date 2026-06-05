import { getCalendar } from "@/lib/queries";
import { getCurrentUser } from "@/lib/auth";
import { canPublish } from "@/lib/rbac";
import { CalendarBoard } from "./calendar-board";

export default async function CalendarPage() {
  const [events, me] = await Promise.all([getCalendar(), getCurrentUser()]);
  const canEdit = me?.role ? canPublish(me.role) : false;

  return (
    <main className="f5-content">
      <CalendarBoard events={events} canEdit={canEdit} />
      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 18 }}>Data source: live</div>
    </main>
  );
}
