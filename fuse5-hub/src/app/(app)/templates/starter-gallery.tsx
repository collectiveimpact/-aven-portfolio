"use client";

import { useState } from "react";
import { STARTER_TEMPLATES, type StarterTemplate } from "@/lib/starter-templates";
import { TemplatePreview } from "./template-preview";

// Provider-branded starter templates (e.g. Kiwanis Homes' TSR letters). These are
// real, self-contained HTML emails — shown as a gallery of clickable cards that
// open the same preview surface as the org's own templates. Proof that Fuse5
// hosts each provider's branded HTML, not just re-skinned plain text.
export function StarterGallery() {
  const [preview, setPreview] = useState<StarterTemplate | null>(null);
  const byProvider = STARTER_TEMPLATES.reduce<Record<string, StarterTemplate[]>>((acc, t) => {
    (acc[t.provider] ??= []).push(t);
    return acc;
  }, {});

  return (
    <>
      {Object.entries(byProvider).map(([provider, items]) => (
        <div key={provider} style={{ marginTop: 22 }}>
          <div className="f5-section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span>Starter templates</span>
            <span className="f5-badge ok" style={{ fontSize: 10 }}>{provider}</span>
            <span style={{ fontSize: 12, color: "var(--f5-text-muted)", fontWeight: 400 }}>· provider-branded HTML letters, ready to use</span>
          </div>
          <div className="f5-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 12 }}>
            {items.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setPreview(t)}
                className="f5-card"
                style={{ textAlign: "left", cursor: "pointer", border: "1px solid var(--f5-border)", display: "flex", flexDirection: "column", gap: 6, padding: 14 }}
                title="Preview the HTML letter"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 7, background: "#1F3A4D", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✉️</span>
                  <span style={{ fontWeight: 600, color: "var(--f5-text)", fontSize: 13.5, lineHeight: 1.25 }}>{t.name}</span>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--f5-text-muted)" }}>{t.category} · {t.channels.map((c) => c.toUpperCase()).join(", ")}</div>
                <div style={{ marginTop: "auto", fontSize: 11.5, color: "var(--f5-teal,#00CCCC)", fontWeight: 600 }}>👁 Preview HTML →</div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {preview && (
        <TemplatePreview
          name={preview.name}
          category={preview.category}
          html={preview.html}
          badge={preview.provider}
          onClose={() => setPreview(null)}
        />
      )}
    </>
  );
}
