// Reusable vertical <Timeline />.
//
// USAGE — feed it any chronological rows.
//
// Audit log:
//   <Timeline
//     items={auditRows.map((r) => ({
//       id: r.id,
//       title: r.action,                       // "Module enabled: Surveys"
//       timestamp: new Date(r.created_at),     // Date or pre-formatted string
//       description: `${r.actor} · ${r.target}`,
//       status: r.severity === "high" ? "critical" : "info",
//     }))}
//   />
//
// Resident comm history (compact density + custom icons):
//   <Timeline
//     density="compact"
//     emptyLabel="No messages with this resident yet."
//     items={comms.map((c) => ({
//       id: c.id,
//       title: c.subject,
//       timestamp: c.sentAt,
//       description: c.preview,
//       status: c.channel === "sms" ? "success" : "info",
//       icon: c.channel === "sms" ? "💬" : "✉",
//     }))}
//   />

export { Timeline } from "./timeline";
export type {
  TimelineDensity,
  TimelineItem,
  TimelineProps,
  TimelineStatus,
} from "./types";
