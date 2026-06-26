import type {
  TimelineItem,
  TimelineProps,
  TimelineStatus,
} from "./types";

const STATUS_COLOR: Record<TimelineStatus, string> = {
  info: "var(--f5-teal)",
  success: "var(--f5-green)",
  warn: "var(--f5-amber)",
  critical: "var(--f5-red)",
};

function formatTs(ts: string | Date | undefined): string | null {
  if (ts == null) return null;
  if (ts instanceof Date) {
    return ts.toLocaleString();
  }
  return ts;
}

/**
 * <Timeline /> — vertical timeline with a connector line + status dots.
 * Pure React, no dependencies. Theme-safe via Aurora CSS variables (light + dark).
 *
 * Feed it any chronological rows — audit-log entries, resident comm history,
 * work-order events, etc. See the USAGE block in ./index.ts for examples.
 */
export function Timeline({
  items,
  density = "comfortable",
  emptyLabel = "No activity yet.",
  className,
  style,
}: TimelineProps) {
  if (!items || items.length === 0) {
    return (
      <div
        className={className}
        style={{
          padding: "28px 16px",
          textAlign: "center",
          color: "var(--f5-text-muted)",
          fontSize: 13.5,
          border: "1px dashed var(--f5-border)",
          borderRadius: "var(--f5-radius-sm)",
          background: "var(--f5-surface)",
          ...style,
        }}
      >
        {emptyLabel}
      </div>
    );
  }

  const compact = density === "compact";
  const rowGap = compact ? 14 : 22;
  const dot = compact ? 11 : 13;
  // Center the connector line on the dot.
  const railX = dot / 2;

  return (
    <ol
      className={className}
      style={{
        listStyle: "none",
        margin: 0,
        padding: 0,
        position: "relative",
        ...style,
      }}
    >
      {items.map((item, i) => {
        const key = item.id ?? String(i);
        const isLast = i === items.length - 1;
        return (
          <TimelineRow
            key={key}
            item={item}
            isLast={isLast}
            rowGap={rowGap}
            dot={dot}
            railX={railX}
            compact={compact}
          />
        );
      })}
    </ol>
  );
}

function TimelineRow({
  item,
  isLast,
  rowGap,
  dot,
  railX,
  compact,
}: {
  item: TimelineItem;
  isLast: boolean;
  rowGap: number;
  dot: number;
  railX: number;
  compact: boolean;
}) {
  const color = STATUS_COLOR[item.status ?? "info"];
  const ts = formatTs(item.timestamp);
  const gutter = compact ? 12 : 14;

  return (
    <li
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: `${dot}px 1fr`,
        columnGap: gutter,
        paddingBottom: isLast ? 0 : rowGap,
      }}
    >
      {/* Connector line — runs from this dot down to the next row. */}
      {!isLast && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: railX,
            top: dot,
            bottom: 0,
            width: 2,
            transform: "translateX(-50%)",
            background: "var(--f5-border)",
          }}
        />
      )}

      {/* Node — custom icon or default status dot. */}
      <span
        aria-hidden="true"
        style={{
          gridColumn: 1,
          width: dot,
          height: dot,
          marginTop: 3,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 999,
          fontSize: compact ? 9 : 10,
          lineHeight: 1,
          color,
          background: item.icon ? "transparent" : color,
          boxShadow: item.icon
            ? "none"
            : `0 0 0 3px color-mix(in srgb, ${color} 22%, transparent)`,
        }}
      >
        {item.icon ?? null}
      </span>

      {/* Content. */}
      <div style={{ gridColumn: 2, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            gap: 8,
          }}
        >
          <span
            style={{
              fontSize: compact ? 13 : 13.5,
              fontWeight: 600,
              lineHeight: 1.35,
              color: "var(--f5-text)",
              wordBreak: "break-word",
            }}
          >
            {item.title}
          </span>
          {ts && (
            <time
              style={{
                fontSize: 11.5,
                color: "var(--f5-text-muted)",
                whiteSpace: "nowrap",
              }}
            >
              {ts}
            </time>
          )}
        </div>
        {item.description && (
          <div
            style={{
              marginTop: 3,
              fontSize: compact ? 12 : 12.5,
              lineHeight: 1.45,
              color: "var(--f5-text-secondary)",
              wordBreak: "break-word",
            }}
          >
            {item.description}
          </div>
        )}
      </div>
    </li>
  );
}
