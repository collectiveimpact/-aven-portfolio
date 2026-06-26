"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { colorFor, MARKER_COLORS, type MapPoint } from "./markerColor";

// Vanilla Leaflet (NOT react-leaflet) to stay clear of React-version peer
// issues. Leaflet is browser-only, so everything touching `window`/`L` lives
// inside useEffect and is dynamically imported.

export interface PropertyMapProps {
  points: MapPoint[];
  /** CSS height for the map canvas. */
  height?: number | string;
  /** Fallback center if no points have coords (Toronto City Hall). */
  center?: [number, number];
  zoom?: number;
}

const TORONTO: [number, number] = [43.6532, -79.3832];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export default function PropertyMap({
  points,
  height = 420,
  center = TORONTO,
  zoom = 11,
}: PropertyMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  // Keep latest points without re-running the init effect.
  const pointsRef = useRef(points);
  pointsRef.current = points;

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let map: any = null;

    // Dynamic import keeps Leaflet out of the SSR bundle.
    import("leaflet").then((mod) => {
      const L = mod.default ?? mod;
      if (cancelled || !containerRef.current) return;
      // Guard against double-init (StrictMode / fast refresh).
      if ((containerRef.current as unknown as { _leaflet_id?: number })._leaflet_id) return;

      const pts = pointsRef.current.filter(
        (p) => typeof p.lat === "number" && typeof p.lng === "number",
      );

      map = L.map(containerRef.current, {
        center,
        zoom,
        scrollWheelZoom: false,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      const markers: { lat: number; lng: number }[] = [];
      for (const p of pts) {
        const color = colorFor(p);
        const marker = L.circleMarker([p.lat, p.lng], {
          radius: 9,
          color: "#ffffff",
          weight: 2,
          fillColor: color,
          fillOpacity: 0.92,
        });
        const rows: string[] = [];
        if (typeof p.score === "number") rows.push(`Score: <b>${p.score}%</b>`);
        if (p.status) rows.push(`Status: <b>${escapeHtml(p.status.replace("_", " "))}</b>`);
        if (typeof p.units === "number") rows.push(`Units: <b>${p.units}</b>`);
        if (typeof p.openWorkOrders === "number")
          rows.push(`Open work orders: <b>${p.openWorkOrders}</b>`);
        marker.bindPopup(
          `<div style="font:13px/1.4 system-ui,sans-serif;min-width:150px">` +
            `<div style="font-weight:600;margin-bottom:4px">${escapeHtml(p.name)}</div>` +
            rows.map((r) => `<div>${r}</div>`).join("") +
            `</div>`,
        );
        marker.addTo(map);
        markers.push({ lat: p.lat, lng: p.lng });
      }

      // Fit bounds to markers when we have any.
      if (markers.length === 1) {
        map.setView([markers[0].lat, markers[0].lng], 13);
      } else if (markers.length > 1) {
        const bounds = L.latLngBounds(markers.map((m) => [m.lat, m.lng]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }

      // Leaflet needs a size recalc once the container is laid out.
      setTimeout(() => map && map.invalidateSize(), 0);
    });

    return () => {
      cancelled = true;
      if (map) {
        map.remove();
        map = null;
      }
    };
    // center/zoom are stable literals; points handled via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasCoords = points.some(
    (p) => typeof p.lat === "number" && typeof p.lng === "number",
  );

  if (!hasCoords) {
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          borderRadius: "var(--f5-radius, 12px)",
          border: "1px dashed var(--f5-border)",
          color: "var(--f5-text-muted)",
          fontSize: 14,
          padding: 24,
        }}
      >
        No mappable locations yet — properties need coordinates to appear here.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Map of properties"
      style={{
        height,
        width: "100%",
        borderRadius: "var(--f5-radius, 12px)",
        overflow: "hidden",
        border: "1px solid var(--f5-border)",
        // Leaflet's default panes assume a light backdrop; keep neutral.
        background: "var(--f5-surface)",
      }}
    />
  );
}

// Legend chip row reused by both the Properties and Compliance panels.
export function MapLegend() {
  const items: { tone: keyof typeof MARKER_COLORS; label: string }[] = [
    { tone: "green", label: "Compliant" },
    { tone: "amber", label: "Due soon" },
    { tone: "red", label: "Overdue / at risk" },
  ];
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 12 }}>
      {items.map((it) => (
        <div key={it.tone} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              width: 11,
              height: 11,
              borderRadius: "50%",
              background: MARKER_COLORS[it.tone],
              border: "2px solid #fff",
              boxShadow: "0 0 0 1px var(--f5-border)",
              display: "inline-block",
            }}
          />
          <span style={{ fontSize: 13, color: "var(--f5-text-muted)" }}>{it.label}</span>
        </div>
      ))}
    </div>
  );
}
