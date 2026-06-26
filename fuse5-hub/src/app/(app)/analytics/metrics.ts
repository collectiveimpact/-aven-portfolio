// Self-owned static metric catalog for the Analytics section.
//
// Provides the representative (demo) figures that don't yet have a live source,
// plus the metric registry that powers the Custom Reports builder. Live data
// (message sent/delivered counts, audit aggregates) is injected at render time
// in analytics-tabs.tsx from @/lib/queries — anything here is clearly demo and
// labelled as such in the UI.
//
// Sources we're modelling after: Twilio / Sinch (SMS deliverability), Klaviyo /
// Braze (engagement), Wallboard (digital-signage proof-of-play).

export type MetricGroup =
  | "Deliverability"
  | "Engagement"
  | "Signage"
  | "Audience"
  | "Compliance";

export type MetricFormat = "number" | "percent" | "currency" | "ms" | "seconds";

export interface MetricDef {
  key: string;
  label: string;
  group: MetricGroup;
  format: MetricFormat;
  /** Representative value used in the report preview when there's no live feed. */
  demo: number;
  /** Higher-is-better drives the up/down arrow + good/bad colour. */
  goodWhenHigh: boolean;
  /** Short provider/source hint shown in the builder. */
  source: string;
}

// ---- the registry that the Custom Report builder reads ----
export const METRIC_REGISTRY: MetricDef[] = [
  // Deliverability (Twilio / Sinch)
  { key: "sent", label: "Messages Sent", group: "Deliverability", format: "number", demo: 24148, goodWhenHigh: true, source: "Twilio/Sinch" },
  { key: "delivered", label: "Delivered", group: "Deliverability", format: "number", demo: 23472, goodWhenHigh: true, source: "Twilio/Sinch" },
  { key: "deliveryRate", label: "Delivery Rate", group: "Deliverability", format: "percent", demo: 97.2, goodWhenHigh: true, source: "Twilio/Sinch" },
  { key: "failed", label: "Failed", group: "Deliverability", format: "number", demo: 412, goodWhenHigh: false, source: "Twilio/Sinch" },
  { key: "bounceRate", label: "Bounce Rate", group: "Deliverability", format: "percent", demo: 1.1, goodWhenHigh: false, source: "Twilio/Sinch" },
  { key: "carrierFiltered", label: "Carrier-Filtered", group: "Deliverability", format: "number", demo: 264, goodWhenHigh: false, source: "Twilio" },
  { key: "optOuts", label: "Opt-outs", group: "Deliverability", format: "number", demo: 118, goodWhenHigh: false, source: "Twilio/Sinch" },
  { key: "inbound", label: "Inbound Messages", group: "Deliverability", format: "number", demo: 3140, goodWhenHigh: true, source: "Twilio/Sinch" },
  { key: "responseRate", label: "Response Rate", group: "Deliverability", format: "percent", demo: 16.7, goodWhenHigh: true, source: "Twilio/Sinch" },
  { key: "timeToDeliver", label: "Avg Time-to-Deliver", group: "Deliverability", format: "seconds", demo: 4.2, goodWhenHigh: false, source: "Twilio/Sinch" },
  { key: "costPerMsg", label: "Cost / Message", group: "Deliverability", format: "currency", demo: 0.012, goodWhenHigh: false, source: "Twilio/Sinch" },
  { key: "spend", label: "Channel Spend", group: "Deliverability", format: "currency", demo: 289.78, goodWhenHigh: false, source: "Twilio/Sinch" },

  // Engagement (Klaviyo / Braze)
  { key: "openRate", label: "Open Rate", group: "Engagement", format: "percent", demo: 54.7, goodWhenHigh: true, source: "Klaviyo/Braze" },
  { key: "clickRate", label: "Click Rate", group: "Engagement", format: "percent", demo: 12.4, goodWhenHigh: true, source: "Klaviyo/Braze" },
  { key: "readRate", label: "Read Rate", group: "Engagement", format: "percent", demo: 89.2, goodWhenHigh: true, source: "Braze (WhatsApp)" },
  { key: "conversionRate", label: "Conversion Rate", group: "Engagement", format: "percent", demo: 7.8, goodWhenHigh: true, source: "Klaviyo/Braze" },
  { key: "unsubRate", label: "Unsubscribe Rate", group: "Engagement", format: "percent", demo: 0.5, goodWhenHigh: false, source: "Klaviyo/Braze" },

  // Signage (Wallboard)
  { key: "proofOfPlay", label: "Proof-of-Play", group: "Signage", format: "number", demo: 20070, goodWhenHigh: true, source: "Wallboard" },
  { key: "screenUptime", label: "Screen Uptime", group: "Signage", format: "percent", demo: 99.2, goodWhenHigh: true, source: "Wallboard" },
  { key: "impressions", label: "Impressions", group: "Signage", format: "number", demo: 184500, goodWhenHigh: true, source: "Wallboard" },
  { key: "avgDwell", label: "Avg Dwell Time", group: "Signage", format: "seconds", demo: 8.4, goodWhenHigh: true, source: "Wallboard" },
  { key: "playlistCompletion", label: "Playlist Completion", group: "Signage", format: "percent", demo: 94.6, goodWhenHigh: true, source: "Wallboard" },
  { key: "offlineIncidents", label: "Offline Incidents", group: "Signage", format: "number", demo: 7, goodWhenHigh: false, source: "Wallboard" },

  // Audience / Compliance
  { key: "reach", label: "Total Reach", group: "Audience", format: "number", demo: 8420, goodWhenHigh: true, source: "Fuse5" },
  { key: "consentCoverage", label: "Consent Coverage", group: "Audience", format: "percent", demo: 99.5, goodWhenHigh: true, source: "Fuse5 (CASL)" },
  { key: "auditCompleteness", label: "Audit Completeness", group: "Compliance", format: "percent", demo: 99.8, goodWhenHigh: true, source: "Fuse5" },
  { key: "acknowledgements", label: "Acknowledgements", group: "Compliance", format: "number", demo: 1840, goodWhenHigh: true, source: "Fuse5" },
];

export function metricByKey(key: string): MetricDef | undefined {
  return METRIC_REGISTRY.find((m) => m.key === key);
}

export function formatMetric(value: number, format: MetricFormat): string {
  switch (format) {
    case "percent":
      return `${value.toFixed(value % 1 ? 1 : 0)}%`;
    case "currency":
      return `$${value < 1 ? value.toFixed(3) : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "ms":
      return `${Math.round(value)} ms`;
    case "seconds":
      return `${value.toFixed(value % 1 ? 1 : 0)}s`;
    default:
      return Math.round(value).toLocaleString();
  }
}

// ---- representative datasets (demo) for the rich charts ----

export const CHANNEL_PALETTE: Record<string, string> = {
  email: "var(--f5-teal)",
  sms: "var(--f5-blue)",
  whatsapp: "var(--f5-green)",
  voice: "var(--f5-purple)",
  display: "var(--f5-sun)",
};

export const CHANNEL_LABEL: Record<string, string> = {
  email: "Email",
  sms: "SMS",
  whatsapp: "WhatsApp",
  voice: "Voice",
  display: "Display",
};

// 8-week trend used by AreaTrend (sent, with prior-period compare).
export const SENT_TREND = [
  { x: "Wk1", y: 18200 }, { x: "Wk2", y: 19100 }, { x: "Wk3", y: 20400 },
  { x: "Wk4", y: 19800 }, { x: "Wk5", y: 21600 }, { x: "Wk6", y: 22300 },
  { x: "Wk7", y: 21100 }, { x: "Wk8", y: 23050 },
];
export const SENT_TREND_PRIOR = [
  { x: "Wk1", y: 16800 }, { x: "Wk2", y: 17400 }, { x: "Wk3", y: 18100 },
  { x: "Wk4", y: 18900 }, { x: "Wk5", y: 18600 }, { x: "Wk6", y: 19700 },
  { x: "Wk7", y: 19200 }, { x: "Wk8", y: 20100 },
];

// Delivery-rate trend (percent) for the deliverability tab.
export const DELIVERY_RATE_TREND = [
  { x: "Wk1", y: 96.1 }, { x: "Wk2", y: 96.4 }, { x: "Wk3", y: 96.0 },
  { x: "Wk4", y: 97.0 }, { x: "Wk5", y: 97.3 }, { x: "Wk6", y: 97.1 },
  { x: "Wk7", y: 97.6 }, { x: "Wk8", y: 97.2 },
];

// Per-channel deliverability table (Twilio/Sinch style).
export interface ChannelDeliverability {
  channel: string;
  sent: number;
  delivered: number;
  failed: number;
  bounce: number;       // %
  optOuts: number;
  inbound: number;
  responseRate: number; // %
  ttdSeconds: number;   // avg time-to-deliver
  costPerMsg: number;
  carrierFiltered: number;
}
export const CHANNEL_DELIVERABILITY: ChannelDeliverability[] = [
  { channel: "email", sent: 11840, delivered: 11620, failed: 142, bounce: 0.7, optOuts: 38, inbound: 0, responseRate: 9.4, ttdSeconds: 2.1, costPerMsg: 0.003, carrierFiltered: 0 },
  { channel: "sms", sent: 7320, delivered: 7012, failed: 188, bounce: 1.9, optOuts: 64, inbound: 2240, responseRate: 22.5, ttdSeconds: 5.8, costPerMsg: 0.025, carrierFiltered: 220 },
  { channel: "whatsapp", sent: 3120, delivered: 3044, failed: 52, bounce: 0.8, optOuts: 12, inbound: 760, responseRate: 18.1, ttdSeconds: 3.4, costPerMsg: 0.005, carrierFiltered: 24 },
  { channel: "voice", sent: 1868, delivered: 1796, failed: 30, bounce: 1.0, optOuts: 4, inbound: 140, responseRate: 6.2, ttdSeconds: 9.1, costPerMsg: 0.018, carrierFiltered: 20 },
];

// Engagement by channel (Klaviyo/Braze style).
export interface ChannelEngagement {
  channel: string;
  open: number;
  click: number;
  read: number;
  conversion: number;
  unsub: number;
}
export const CHANNEL_ENGAGEMENT: ChannelEngagement[] = [
  { channel: "email", open: 58.2, click: 14.1, read: 58.2, conversion: 8.6, unsub: 0.3 },
  { channel: "sms", open: 71.6, click: 18.7, read: 94.0, conversion: 11.2, unsub: 0.8 },
  { channel: "whatsapp", open: 64.0, click: 16.2, read: 89.2, conversion: 9.4, unsub: 0.4 },
  { channel: "voice", open: 41.0, click: 0, read: 0, conversion: 4.1, unsub: 0.1 },
];

// Channel mix (share of total volume) for the donut.
export const CHANNEL_MIX = [
  { label: "Email", value: 11840, color: "var(--f5-teal)" },
  { label: "SMS", value: 7320, color: "var(--f5-blue)" },
  { label: "WhatsApp", value: 3120, color: "var(--f5-green)" },
  { label: "Voice", value: 1868, color: "var(--f5-purple)" },
];

// Best-time-to-send heatmap (7 days × 4 dayparts engagement intensity 0–100).
export const HEAT_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const HEAT_PARTS = ["Morning", "Midday", "Evening", "Night"];
export const ENGAGEMENT_HEAT = [
  [42, 55, 88, 20], [45, 58, 90, 22], [48, 60, 92, 25], [50, 62, 91, 24],
  [52, 65, 86, 28], [30, 48, 70, 18], [25, 40, 60, 15],
];

// Signage — per-screen proof-of-play / uptime / dwell.
export interface ScreenStat {
  id: string;
  name: string;
  property: string;
  plays: number;
  uptime: number;     // %
  impressions: number;
  dwellSeconds: number;
  completion: number; // playlist completion %
  status: "online" | "offline" | "warning";
}
export const SCREEN_STATS: ScreenStat[] = [
  { id: "PL-WG-001", name: "Main Lobby", property: "100 Dundas", plays: 4820, uptime: 99.7, impressions: 44600, dwellSeconds: 9.2, completion: 96.1, status: "online" },
  { id: "PL-WG-002", name: "Elevator Bank", property: "100 Dundas", plays: 4610, uptime: 99.4, impressions: 41200, dwellSeconds: 6.8, completion: 95.3, status: "online" },
  { id: "PL-HN-001", name: "Main Lobby", property: "55 Hess", plays: 4390, uptime: 99.9, impressions: 39800, dwellSeconds: 10.1, completion: 97.0, status: "online" },
  { id: "PL-WG-003", name: "Mail Room", property: "200 Lees", plays: 3270, uptime: 98.9, impressions: 28400, dwellSeconds: 7.4, completion: 92.8, status: "warning" },
  { id: "PL-KW-001", name: "Main Lobby", property: "250 King", plays: 2980, uptime: 99.0, impressions: 30500, dwellSeconds: 8.0, completion: 94.6, status: "online" },
  { id: "PL-WG-008", name: "Community Room", property: "200 Lees", plays: 0, uptime: 21.4, impressions: 0, dwellSeconds: 0, completion: 0, status: "offline" },
];

// Signage uptime trend (percent) over 8 weeks.
export const UPTIME_TREND = [
  { x: "Wk1", y: 98.4 }, { x: "Wk2", y: 99.0 }, { x: "Wk3", y: 99.3 },
  { x: "Wk4", y: 98.8 }, { x: "Wk5", y: 99.5 }, { x: "Wk6", y: 99.1 },
  { x: "Wk7", y: 99.6 }, { x: "Wk8", y: 99.2 },
];

// Offline incidents per week (signage reliability).
export const OFFLINE_INCIDENTS = [3, 1, 0, 2, 0, 1, 0, 0];

// Audience — reach by property.
export const REACH_BY_PROPERTY = [
  { label: "100 Dundas", value: 2840, color: "var(--f5-teal)" },
  { label: "55 Hess", value: 2110, color: "var(--f5-teal)" },
  { label: "200 Lees", value: 1640, color: "var(--f5-teal)" },
  { label: "250 King", value: 1230, color: "var(--f5-teal)" },
  { label: "8 Munsee Trail", value: 600, color: "var(--f5-teal)" },
];

// Audience — language mix.
export const LANGUAGE_MIX = [
  { label: "English", value: 5460, color: "var(--f5-teal)" },
  { label: "French", value: 980, color: "var(--f5-blue)" },
  { label: "Spanish", value: 720, color: "var(--f5-green)" },
  { label: "Mandarin", value: 640, color: "var(--f5-purple)" },
  { label: "Arabic", value: 420, color: "var(--f5-sun)" },
  { label: "Other", value: 200, color: "var(--f5-coral)" },
];

// Compliance coverage by framework.
export const COMPLIANCE_FRAMEWORKS = [
  { name: "RentSafeTO", pct: 98 },
  { name: "Hamilton SAB", pct: 100 },
  { name: "CASL Consent", pct: 99.5 },
  { name: "PIPEDA", pct: 100 },
];

// Compliance by notice type.
export const COMPLIANCE_TYPES = [
  { kind: "Emergency Alerts", delivered: 100, ack: 96 },
  { kind: "Maintenance Notices", delivered: 99.2, ack: 71 },
  { kind: "Compliance Notices", delivered: 99.8, ack: 88 },
  { kind: "Community Events", delivered: 98.4, ack: 41 },
];

// Proof-of-delivery records.
export const PROOF_OF_DELIVERY = [
  { id: "NTC-2026-0412", type: "RentSafeTO Inspection", sent: 210, delivered: 208, date: "Apr 10, 2026" },
  { id: "NTC-2026-0398", type: "Fire Safety Notice", sent: 847, delivered: 847, date: "Apr 4, 2026" },
  { id: "NTC-2026-0377", type: "Water Shutoff", sent: 142, delivered: 140, date: "Mar 28, 2026" },
];

// Property filter options (demo — keeps the bar self-contained).
export const PROPERTY_OPTIONS = [
  "All properties", "100 Dundas", "55 Hess", "200 Lees", "250 King", "8 Munsee Trail",
];

export const DATE_RANGES = ["Week", "Month", "Quarter", "Year"];

// ---- custom report persistence (localStorage for now; DB follow-up) ----
export interface SavedReport {
  id: string;
  name: string;
  metrics: string[];
  range: string;
  property: string;
  createdAt: string;
}
export const REPORTS_STORAGE_KEY = "fuse5.analytics.savedReports.v1";

export function loadSavedReports(): SavedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REPORTS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedReport[]) : [];
  } catch {
    return [];
  }
}
export function persistSavedReports(reports: SavedReport[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
  } catch {
    /* storage full / unavailable — non-fatal */
  }
}
