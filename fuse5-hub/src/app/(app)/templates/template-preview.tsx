"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { TemplateRow } from "@/lib/queries";
import { renderTemplateHtml, themeForTemplate } from "@/lib/template-html";

// Live HTML preview for a template: renders the branded email in a sandboxed
// iframe (so the email's own styles never leak into the app), with a desktop/
// mobile toggle, Copy HTML, Open in new tab, and a Use-in-Compose handoff.
export function TemplatePreview({ template, orgName, onClose }: { template: TemplateRow; orgName?: string; onClose: () => void }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [copied, setCopied] = useState(false);
  const theme = useMemo(() => themeForTemplate(template.category, template.name), [template]);
  const html = useMemo(
    () => renderTemplateHtml({ name: template.name, category: template.category, body: template.body, orgName }),
    [template, orgName],
  );

  function copyHtml() {
    navigator.clipboard?.writeText(html).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }).catch(() => {});
  }
  function openTab() {
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  }

  const frameW = device === "mobile" ? 380 : 680;

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.72)", zIndex: 60, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "28px 16px" }}
      onClick={onClose}
    >
      <div className="f5-card" style={{ width: frameW + 48, maxWidth: "96vw", padding: 0, overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
        {/* toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", borderBottom: "1px solid var(--f5-border)", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
            <span style={{ width: 30, height: 30, borderRadius: 8, background: theme.soft, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{theme.emoji}</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: "var(--f5-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{template.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--f5-text-muted)" }}>{template.category} · HTML email preview</div>
            </div>
          </div>

          <div className="f5-chips" style={{ margin: 0, marginLeft: "auto" }}>
            <span className={`f5-chip${device === "desktop" ? " active" : ""}`} onClick={() => setDevice("desktop")}>🖥 Desktop</span>
            <span className={`f5-chip${device === "mobile" ? " active" : ""}`} onClick={() => setDevice("mobile")}>📱 Mobile</span>
          </div>
          <button className="f5-btn" style={{ padding: "6px 11px", fontSize: 12 }} onClick={copyHtml}>{copied ? "Copied ✓" : "Copy HTML"}</button>
          <button className="f5-btn" style={{ padding: "6px 11px", fontSize: 12 }} onClick={openTab}>Open ↗</button>
          <Link className="f5-btn primary" style={{ padding: "6px 11px", fontSize: 12 }} href="/compose">Use in Compose</Link>
          <button className="f5-btn" style={{ padding: "6px 10px", fontSize: 12 }} onClick={onClose}>✕</button>
        </div>

        {/* rendered email */}
        <div style={{ background: "#e2e8f0", padding: "18px", display: "flex", justifyContent: "center" }}>
          <iframe
            title={`Preview of ${template.name}`}
            srcDoc={html}
            style={{ width: frameW, maxWidth: "100%", height: 620, border: "none", borderRadius: 10, background: "#f1f5f9", boxShadow: "0 8px 24px rgba(2,6,23,0.18)" }}
          />
        </div>
      </div>
    </div>
  );
}
