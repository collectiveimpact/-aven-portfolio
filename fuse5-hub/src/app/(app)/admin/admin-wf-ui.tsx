"use client";

// Small shared UI primitives for the interactive admin panels. Aurora-styled,
// light + dark via CSS vars. Keeps modal/toggle markup out of the panel files.

import { useEffect, type ReactNode } from "react";

const dim = "var(--f5-text-muted)";

// Centered overlay dialog. Click-scrim or Esc closes. Matches the pattern used
// by integrations-list / properties-table elsewhere in the app.
export function WfModal({
  title, sub, onClose, width = 520, children, footer,
}: {
  title: string; sub?: string; onClose: () => void; width?: number;
  children: ReactNode; footer?: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 60, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 16px" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="f5-card" style={{ width, maxWidth: "96vw" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, color: "var(--f5-text)", fontSize: 16 }}>{title}</div>
            {sub && <div style={{ fontSize: 12, color: dim, marginTop: 3 }}>{sub}</div>}
          </div>
          <button className="f5-btn" type="button" onClick={onClose} style={{ padding: "2px 9px", fontSize: 16, lineHeight: 1 }} aria-label="Close">×</button>
        </div>
        <div style={{ marginTop: 14 }}>{children}</div>
        {footer && <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 18 }}>{footer}</div>}
      </div>
    </div>
  );
}

// Pill toggle switch (same look as modules-panel).
export function WfSwitch({ on, onChange, disabled, title }: { on: boolean; onChange: () => void; disabled?: boolean; title?: string }) {
  const teal = "var(--f5-teal,#00CCCC)";
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      title={title}
      aria-pressed={on}
      style={{ flexShrink: 0, width: 38, height: 22, borderRadius: 999, border: "none", cursor: disabled ? "default" : "pointer", position: "relative", background: on ? teal : "var(--f5-surface-2,rgba(255,255,255,0.08))", transition: "background .15s" }}
    >
      <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 18, height: 18, borderRadius: 999, background: "#fff", transition: "left .15s" }} />
    </button>
  );
}

// Inline saved/error flash.
export function WfFlash({ saved, error, persisted }: { saved?: boolean; error?: string | null; persisted?: boolean }) {
  if (error) return <span style={{ color: "var(--f5-red,#f87171)", fontSize: 12 }}>⚠ {error}</span>;
  if (saved) return <span style={{ color: "var(--f5-green,#34d399)", fontSize: 12 }}>Saved ✓{persisted === false ? " (session)" : ""}</span>;
  return null;
}

export const labelStyle = { display: "block", fontSize: 11, textTransform: "uppercase" as const, letterSpacing: 0.6, color: dim, marginBottom: 5, marginTop: 12 };
