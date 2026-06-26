"use client";

import { useMemo } from "react";
import type { PropertyOption } from "@/lib/queries";
import {
  buildingFor,
  COMMON_ZONES,
  scopeCount,
  unitsInScope,
  type TargetSelection,
} from "@/lib/emergency/targeting";

interface Props {
  properties: PropertyOption[];
  propertyId: string;
  onPropertyChange: (id: string) => void;
  selection: TargetSelection;
  onChange: (next: TargetSelection) => void;
}

// Audience drill-down: Property → Block → Floor → Unit, plus common-area zones.
// Multi-select with select-all per level, and a live in-scope recipient count.
export function TargetingPanel({ properties, propertyId, onPropertyChange, selection, onChange }: Props) {
  const property = properties.find((p) => p.id === propertyId) ?? properties[0];
  const model = useMemo(() => (property ? buildingFor(property) : null), [property]);

  const count = useMemo(() => (model ? scopeCount(model, selection) : null), [model, selection]);
  const inScopeUnits = useMemo(() => (model ? unitsInScope(model, selection) : []), [model, selection]);
  const inScopeIds = useMemo(() => new Set(inScopeUnits.map((u) => u.id)), [inScopeUnits]);

  if (!model || !property) {
    return (
      <div className="f5-card" style={{ background: "var(--f5-surface-2)" }}>
        <div className="f5-kpi-label">Targeting</div>
        <div style={{ color: "var(--f5-text-dim)", fontSize: 13, marginTop: 8 }}>No properties available.</div>
      </div>
    );
  }

  // Helpers that always clear wholeProperty when a narrowing filter is touched.
  const patch = (p: Partial<TargetSelection>, narrowed = true) =>
    onChange({ ...selection, ...p, wholeProperty: narrowed ? false : selection.wholeProperty });

  const toggleInSet = <T,>(set: Set<T>, v: T): Set<T> => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    return next;
  };

  const setWholeProperty = () =>
    onChange({ wholeProperty: true, floors: new Set(), blocks: new Set(), unitIds: new Set(), zoneIds: selection.zoneIds });

  return (
    <div className="f5-card" style={{ background: "var(--f5-surface-2)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div className="f5-section-title" style={{ margin: 0 }}>Audience targeting</div>
        <button
          type="button"
          className={`f5-chip${selection.wholeProperty ? " active" : ""}`}
          onClick={setWholeProperty}
        >
          Entire property
        </button>
      </div>

      <label className="f5-label" htmlFor="targ-property">Property</label>
      <select
        id="targ-property"
        className="f5-select"
        value={property.id}
        onChange={(e) => onPropertyChange(e.target.value)}
      >
        {properties.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>

      {/* Blocks */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
        <label className="f5-label" style={{ margin: 0 }}>Blocks</label>
        <button
          type="button"
          className="f5-chip"
          style={{ fontSize: 11, padding: "3px 8px" }}
          onClick={() =>
            patch({ blocks: selection.blocks.size === model.blocks.length ? new Set() : new Set(model.blocks) })
          }
        >
          {selection.blocks.size === model.blocks.length ? "Clear" : "Select all"}
        </button>
      </div>
      <div className="f5-chips" style={{ marginTop: 6 }}>
        {model.blocks.map((b) => (
          <button
            key={b}
            type="button"
            className={`f5-chip${selection.blocks.has(b) ? " active" : ""}`}
            onClick={() => patch({ blocks: toggleInSet(selection.blocks, b) })}
          >
            Block {b}
          </button>
        ))}
      </div>

      {/* Floors */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
        <label className="f5-label" style={{ margin: 0 }}>Floors</label>
        <button
          type="button"
          className="f5-chip"
          style={{ fontSize: 11, padding: "3px 8px" }}
          onClick={() =>
            patch({ floors: selection.floors.size === model.floors.length ? new Set() : new Set(model.floors) })
          }
        >
          {selection.floors.size === model.floors.length ? "Clear" : "Select all"}
        </button>
      </div>
      <div className="f5-chips" style={{ marginTop: 6 }}>
        {model.floors.map((f) => (
          <button
            key={f}
            type="button"
            className={`f5-chip${selection.floors.has(f) ? " active" : ""}`}
            onClick={() => patch({ floors: toggleInSet(selection.floors, f) })}
          >
            Floor {f}
          </button>
        ))}
      </div>

      {/* Units */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
        <label className="f5-label" style={{ margin: 0 }}>Units {selection.wholeProperty ? "" : `· ${inScopeUnits.length} in scope`}</label>
        <button
          type="button"
          className="f5-chip"
          style={{ fontSize: 11, padding: "3px 8px" }}
          onClick={() =>
            patch({ unitIds: selection.unitIds.size === model.units.length ? new Set() : new Set(model.units.map((u) => u.id)) })
          }
        >
          {selection.unitIds.size === model.units.length ? "Clear" : "Select all"}
        </button>
      </div>
      <div
        style={{
          marginTop: 6,
          maxHeight: 168,
          overflowY: "auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))",
          gap: 6,
          padding: 2,
        }}
      >
        {model.units.map((u) => {
          const picked = selection.unitIds.has(u.id);
          const implied = !picked && (selection.wholeProperty || inScopeIds.has(u.id));
          return (
            <button
              key={u.id}
              type="button"
              title={`${u.number} · Floor ${u.floor} · Block ${u.block} · ${u.residents} resident(s)`}
              className={`f5-chip${picked ? " active" : ""}`}
              style={{
                fontSize: 11,
                padding: "5px 4px",
                justifyContent: "center",
                opacity: picked || implied ? 1 : 0.55,
                borderStyle: implied ? "dashed" : undefined,
              }}
              onClick={() => patch({ unitIds: toggleInSet(selection.unitIds, u.id) })}
            >
              {u.number}
            </button>
          );
        })}
      </div>

      {/* Common-area zones */}
      <label className="f5-label" style={{ marginTop: 14 }}>Common-area zones</label>
      <div className="f5-chips" style={{ marginTop: 6 }}>
        {COMMON_ZONES.map((z) => (
          <button
            key={z.id}
            type="button"
            className={`f5-chip${selection.zoneIds.has(z.id) ? " active" : ""}`}
            onClick={() => onChange({ ...selection, zoneIds: toggleInSet(selection.zoneIds, z.id) })}
          >
            {z.icon} {z.label}
          </button>
        ))}
      </div>

      {/* Live recipients-in-scope */}
      {count && (
        <div
          style={{
            marginTop: 16,
            padding: "12px 14px",
            borderRadius: "var(--f5-radius-sm)",
            background: "color-mix(in srgb, var(--f5-teal) 12%, transparent)",
            border: "1px solid var(--f5-teal-border)",
          }}
        >
          <div className="f5-kpi-label">Recipients in scope</div>
          <div className="f5-kpi-value" style={{ fontSize: 26 }}>{count.total.toLocaleString()}</div>
          <div className="f5-kpi-sub" style={{ marginTop: 4 }}>
            {count.residents.toLocaleString()} resident{count.residents === 1 ? "" : "s"} across {count.units.toLocaleString()} unit{count.units === 1 ? "" : "s"}
            {count.zones > 0 && ` · ${count.zoneOccupancy.toLocaleString()} in ${count.zones} zone${count.zones === 1 ? "" : "s"}`}
          </div>
        </div>
      )}
    </div>
  );
}
