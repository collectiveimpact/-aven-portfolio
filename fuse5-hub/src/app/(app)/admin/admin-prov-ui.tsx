"use client";

import { useEffect, type ReactNode } from "react";

const fg = "var(--f5-text)";
const dim = "var(--f5-text-muted)";

// Shared overlay primitives for the platform-admin panels (providers / roles /
// players / permission matrix). Centered = modal, side = right-hand drawer.
// Both close on backdrop click and Escape, and trap nothing (demo-grade), which
// matches the rest of the app's overlays (see tenants/resident-profile).

export function Overlay({
  onClose,
  variant = "modal",
  width = 520,
  children,
}: {
  onClose: () => void;
  variant?: "modal" | "drawer";
  width?: number;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const wrap: React.CSSProperties =
    variant === "drawer"
      ? { display: "flex", justifyContent: "flex-end" }
      : { display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "6vh 16px" };

  const card: React.CSSProperties =
    variant === "drawer"
      ? { width, maxWidth: "96vw", height: "100%", borderRadius: 0, overflowY: "auto" }
      : { width, maxWidth: "96vw", maxHeight: "88vh", overflowY: "auto" };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 60, ...wrap }}
      onClick={onClose}
    >
      <div className="f5-card" style={card} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function OverlayHeader({ title, sub, onClose }: { title: ReactNode; sub?: ReactNode; onClose: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
      <div>
        <div style={{ fontWeight: 800, color: fg, fontSize: 17 }}>{title}</div>
        {sub != null && <div style={{ fontSize: 12, color: dim, marginTop: 2 }}>{sub}</div>}
      </div>
      <button type="button" className="f5-btn" style={{ padding: "4px 10px", fontSize: 14 }} onClick={onClose} aria-label="Close">✕</button>
    </div>
  );
}

// Toast-lite confirmation line for optimistic / persisted actions.
export function Saved({ persisted, label }: { persisted: boolean | undefined; label?: string }) {
  return (
    <span style={{ fontSize: 12, color: "var(--f5-green,#34d399)" }}>
      {label ?? "Saved"} {persisted ? "✓ (audited)" : "✓"}
    </span>
  );
}
