"use client";

// Customizable dashboard (Klaviyo / Braze style).
// - Pin/favorite widgets to a top "Priority" zone (prime white space, shown first)
// - Add / remove widgets from the catalog
// - Reorder widgets (move up / down)
// - Persist the layout per user/org in localStorage (DB follow-up noted in
//   src/lib/dashboards/persistence.ts)
// - "Edit dashboard" / "Done" toggle + an "Add widget" picker
//
// Server fetches all data once and passes the DashboardData bundle in; every
// widget renders from these already-fetched props.

import { useEffect, useMemo, useState } from "react";
import {
  WIDGET_MAP,
  DEFAULT_WIDGET_IDS,
  widgetsByCategory,
  CATEGORY_LABELS,
  loadLayout,
  saveLayout,
  clearLayout,
  type DashboardData,
  type DashboardLayout,
  type PlacedWidget,
  type WidgetSize,
} from "@/lib/dashboards";

const spanFor: Record<WidgetSize, number> = { 1: 3, 2: 6, 3: 9, 4: 12 };

function defaultLayout(): DashboardLayout {
  return { version: 1, widgets: DEFAULT_WIDGET_IDS.map((w) => ({ ...w })) };
}

export function CustomizableDashboard({ data, scope }: { data: DashboardData; scope: string | null }) {
  const [layout, setLayout] = useState<DashboardLayout>(defaultLayout);
  const [editing, setEditing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted layout on mount (client only).
  useEffect(() => {
    const saved = loadLayout(scope);
    if (saved && saved.widgets.length) setLayout(saved);
    setHydrated(true);
  }, [scope]);

  // Persist on every change once hydrated.
  useEffect(() => {
    if (hydrated) saveLayout(scope, layout);
  }, [layout, scope, hydrated]);

  // Drop any ids no longer in the catalog (defensive against catalog changes).
  const placed = useMemo(
    () => layout.widgets.filter((w) => WIDGET_MAP[w.id]),
    [layout.widgets],
  );
  const pinned = placed.filter((w) => w.pinned);
  const rest = placed.filter((w) => !w.pinned);
  const presentIds = new Set(placed.map((w) => w.id));

  function update(fn: (widgets: PlacedWidget[]) => PlacedWidget[]) {
    setLayout((l) => ({ ...l, widgets: fn(l.widgets) }));
  }

  const togglePin = (id: string) =>
    update((ws) => ws.map((w) => (w.id === id ? { ...w, pinned: !w.pinned } : w)));
  const remove = (id: string) => update((ws) => ws.filter((w) => w.id !== id));
  const add = (id: string) =>
    update((ws) => (ws.some((w) => w.id === id) ? ws : [...ws, { id, pinned: false }]));

  // Reorder within the widget's own zone (pinned vs unpinned), preserving the
  // other zone's items in place.
  function move(id: string, dir: -1 | 1) {
    update((ws) => {
      const target = ws.find((w) => w.id === id);
      if (!target) return ws;
      const zone = ws.filter((w) => w.pinned === target.pinned);
      const others = ws.filter((w) => w.pinned !== target.pinned);
      const i = zone.findIndex((w) => w.id === id);
      const j = i + dir;
      if (j < 0 || j >= zone.length) return ws;
      [zone[i], zone[j]] = [zone[j], zone[i]];
      // Rebuild keeping pinned-first overall ordering stable.
      return target.pinned ? [...zone, ...others] : [...others, ...zone];
    });
  }

  function reset() {
    clearLayout(scope);
    setLayout(defaultLayout());
  }

  function renderCard(w: PlacedWidget, idx: number, zone: PlacedWidget[]) {
    const def = WIDGET_MAP[w.id];
    return (
      <div
        key={w.id}
        className="f5-card"
        style={{
          gridColumn: `span ${spanFor[def.size]}`,
          position: "relative",
          ...(editing ? { outline: "1px dashed var(--f5-teal-border)", outlineOffset: 2 } : {}),
        }}
      >
        {/* Per-card controls */}
        <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4, zIndex: 2 }}>
          <button
            type="button"
            onClick={() => togglePin(w.id)}
            title={w.pinned ? "Unpin from Priority" : "Pin to Priority"}
            aria-label={w.pinned ? "Unpin widget" : "Pin widget"}
            style={iconBtn(w.pinned)}
          >
            {w.pinned ? "★" : "☆"}
          </button>
          {editing && (
            <>
              <button type="button" onClick={() => move(w.id, -1)} disabled={idx === 0} title="Move up" aria-label="Move up" style={iconBtn(false, idx === 0)}>↑</button>
              <button type="button" onClick={() => move(w.id, 1)} disabled={idx === zone.length - 1} title="Move down" aria-label="Move down" style={iconBtn(false, idx === zone.length - 1)}>↓</button>
              <button type="button" onClick={() => remove(w.id)} title="Remove widget" aria-label="Remove widget" style={{ ...iconBtn(false), color: "var(--f5-red)" }}>✕</button>
            </>
          )}
        </div>
        {def.render(data)}
      </div>
    );
  }

  const availableToAdd = widgetsByCategory()
    .map((g) => ({ ...g, widgets: g.widgets.filter((w) => !presentIds.has(w.id)) }))
    .filter((g) => g.widgets.length > 0);

  return (
    <section>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
        <div className="f5-section-title" style={{ margin: 0 }}>Your Dashboard</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {editing && (
            <button type="button" className="f5-btn" style={smBtn} onClick={() => setPicking((p) => !p)}>
              ＋ Add widget
            </button>
          )}
          {editing && (
            <button type="button" className="f5-btn" style={smBtn} onClick={reset}>
              ↺ Reset
            </button>
          )}
          <button
            type="button"
            className={`f5-btn${editing ? " primary" : ""}`}
            style={smBtn}
            onClick={() => { setEditing((e) => !e); setPicking(false); }}
          >
            {editing ? "✓ Done" : "✎ Edit dashboard"}
          </button>
        </div>
      </div>

      {/* Add-widget picker */}
      {editing && picking && (
        <div className="f5-card" style={{ marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
            <div className="f5-section-title" style={{ margin: 0 }}>Add a widget</div>
            <button type="button" className="f5-btn" style={{ ...smBtn, marginLeft: "auto" }} onClick={() => setPicking(false)}>Close</button>
          </div>
          {availableToAdd.length === 0 ? (
            <div style={{ fontSize: 13, color: "var(--f5-text-muted)" }}>Every widget is already on your dashboard.</div>
          ) : availableToAdd.map((g) => (
            <div key={g.category} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "var(--f5-text-dim)", marginBottom: 8 }}>{CATEGORY_LABELS[g.category]}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {g.widgets.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => add(w.id)}
                    title={w.description}
                    style={{ textAlign: "left", maxWidth: 260, padding: "10px 12px", borderRadius: "var(--f5-radius-sm)", border: "1px solid var(--f5-border)", background: "var(--f5-surface-2)", color: "var(--f5-text)", cursor: "pointer" }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>＋ {w.title}</div>
                    <div style={{ fontSize: 11.5, color: "var(--f5-text-muted)", marginTop: 2 }}>{w.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PRIORITY zone — prime white space, shown first */}
      {pinned.length > 0 && (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 8px" }}>
            <span style={{ color: "var(--f5-sun)" }}>★</span>
            <span className="f5-section-title" style={{ margin: 0 }}>Priority</span>
          </div>
          <div className="f5-grid" style={{ gridTemplateColumns: "repeat(12,1fr)" }}>
            {pinned.map((w, i) => renderCard(w, i, pinned))}
          </div>
        </>
      )}

      {/* Everything else */}
      {rest.length > 0 && (
        <div className="f5-grid" style={{ gridTemplateColumns: "repeat(12,1fr)", marginTop: pinned.length ? 18 : 12 }}>
          {rest.map((w, i) => renderCard(w, i, rest))}
        </div>
      )}

      {placed.length === 0 && (
        <div className="f5-card" style={{ marginTop: 12, textAlign: "center", color: "var(--f5-text-muted)" }}>
          Your dashboard is empty. Click <strong>Edit dashboard → Add widget</strong> to build it, or{" "}
          <button type="button" onClick={reset} style={{ background: "none", border: "none", color: "var(--f5-teal)", cursor: "pointer", padding: 0, font: "inherit" }}>restore the default layout</button>.
        </div>
      )}
    </section>
  );
}

const smBtn: React.CSSProperties = { fontSize: 12, padding: "6px 12px" };

function iconBtn(active: boolean, disabled = false): React.CSSProperties {
  return {
    width: 24,
    height: 24,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    border: "1px solid var(--f5-border)",
    background: active ? "var(--f5-teal-subtle)" : "var(--f5-surface-2)",
    color: active ? "var(--f5-sun)" : "var(--f5-text-secondary)",
    fontSize: 13,
    lineHeight: 1,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.35 : 1,
  };
}
