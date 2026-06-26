// Shared types for the reusable <Timeline /> component.

export type TimelineStatus = "info" | "success" | "warn" | "critical";

export type TimelineDensity = "compact" | "comfortable";

export interface TimelineItem {
  /** Stable key. Falls back to index if omitted. */
  id?: string;
  /** Headline for the entry (e.g. "Work order created"). */
  title: string;
  /** Free-form timestamp — already-formatted string or a Date. */
  timestamp?: string | Date;
  /** Optional supporting detail line(s). */
  description?: string;
  /** Status color of the dot + connector emphasis. Defaults to "info". */
  status?: TimelineStatus;
  /** Optional custom node content (e.g. an emoji or small icon element). Overrides the default dot glyph. */
  icon?: React.ReactNode;
}

export interface TimelineProps {
  items: TimelineItem[];
  /** Vertical rhythm. Default "comfortable". */
  density?: TimelineDensity;
  /** Message shown when items is empty. */
  emptyLabel?: string;
  className?: string;
  style?: React.CSSProperties;
}
