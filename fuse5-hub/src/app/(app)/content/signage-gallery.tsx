"use client";

import { useMemo, useState } from "react";
import { SIGNAGE_TEMPLATES, type SignageTemplate } from "@/lib/signage-starter";
import { renderSignageHtml } from "@/lib/signage-html";

// Signage template gallery — WoodGreen's display-channel design system. Cards show
// a live 16:9 thumbnail; clicking opens a full-screen preview. The renderer echoes
// WoodGreen's real screens (slate chrome + live clock/weather, category colour,
// full-bleed + split layouts, bilingual, logo).
export function SignageGallery() {
  const [open, setOpen] = useState<SignageTemplate | null>(null);
  const htmlFor = (t: SignageTemplate) => renderSignageHtml(t.input);

  return (
    <>
      <div className="f5-section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span>Signage templates</span>
        <span className="f5-badge ok" style={{ fontSize: 10 }}>Display channel</span>
        <span style={{ fontSize: 12, color: "var(--f5-text-muted)", fontWeight: 400 }}>· 16:9 screens with live clock, weather &amp; category colour — WoodGreen design</span>
      </div>
      <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 14 }}>
        {SIGNAGE_TEMPLATES.map((t) => (
          <SignageCard key={t.id} t={t} onOpen={() => setOpen(t)} />
        ))}
      </div>

      {open && <SignagePreview template={open} html={htmlFor(open)} onClose={() => setOpen(null)} />}
    </>
  );
}

function SignageCard({ t, onOpen }: { t: SignageTemplate; onOpen: () => void }) {
  const html = useMemo(() => renderSignageHtml(t.input), [t]);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="f5-card"
      style={{ padding: 0, overflow: "hidden", cursor: "pointer", border: "1px solid var(--f5-border)", textAlign: "left" }}
      title="Preview this signage screen"
    >
      {/* 16:9 live thumbnail — pointer-events off so the whole card is the click target */}
      <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", background: "#0b1220", overflow: "hidden" }}>
        <iframe title={t.name} srcDoc={html} scrolling="no" style={{ position: "absolute", top: 0, left: 0, width: "320%", height: "320%", border: 0, transform: "scale(0.3125)", transformOrigin: "top left", pointerEvents: "none" }} />
      </div>
      <div style={{ padding: "9px 12px" }}>
        <div style={{ fontWeight: 600, color: "var(--f5-text)", fontSize: 13 }}>{t.name}</div>
        <div style={{ fontSize: 11.5, color: "var(--f5-text-muted)" }}>{t.category} · {t.input.layout === "split" ? "Split" : "Full-bleed"}</div>
      </div>
    </button>
  );
}

function SignagePreview({ template, html, onClose }: { template: SignageTemplate; html: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  function copyHtml() { navigator.clipboard?.writeText(html).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }
  function openTab() { const w = window.open("", "_blank"); if (w) { w.document.write(html); w.document.close(); } }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.78)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }} onClick={onClose}>
      <div className="f5-card" style={{ width: 1100, maxWidth: "96vw", padding: 0, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--f5-border)", flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: "var(--f5-text)" }}>{template.name}</div>
            <div style={{ fontSize: 11.5, color: "var(--f5-text-muted)" }}>{template.category} · digital signage (16:9)</div>
          </div>
          <button className="f5-btn" style={{ marginLeft: "auto", padding: "6px 11px", fontSize: 12 }} onClick={copyHtml}>{copied ? "Copied ✓" : "Copy HTML"}</button>
          <button className="f5-btn" style={{ padding: "6px 11px", fontSize: 12 }} onClick={openTab}>Open ↗</button>
          <button className="f5-btn" style={{ padding: "6px 10px", fontSize: 12 }} onClick={onClose}>✕</button>
        </div>
        <div style={{ background: "#0b1220", padding: 16 }}>
          <iframe title={`Preview of ${template.name}`} srcDoc={html} style={{ width: "100%", aspectRatio: "16/9", border: 0, borderRadius: 10, background: "#0b1220", display: "block" }} />
        </div>
      </div>
    </div>
  );
}
