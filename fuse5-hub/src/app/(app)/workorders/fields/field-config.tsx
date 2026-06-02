"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateWoFieldSetting } from "../actions";
import { NOTICE_TYPES, type ResolvedField } from "@/lib/wo-fields";

type Mode = "required" | "optional" | "hidden";
const modeOf = (f: ResolvedField): Mode => (!f.enabled ? "hidden" : f.required ? "required" : "optional");

export function FieldConfig({ fields: initial, noticeType }: { fields: ResolvedField[]; noticeType: string }) {
  const [fields, setFields] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");

  function change(key: string, mode: Mode) {
    const enabled = mode !== "hidden";
    const required = mode === "required";
    setFields((fs) => fs.map((f) => (f.key === key ? { ...f, enabled, required } : f)));
    startTransition(async () => {
      const r = await updateWoFieldSetting(noticeType, key, enabled, required);
      setMsg(r.ok ? "Saved." : r.error ?? "Error");
    });
  }

  return (
    <main className="f5-content">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="f5-page-title">Work Order Field Configuration</div>
          <div className="f5-page-sub">Tailor the work-order / notice form for this client. Mandatory fields are locked on.</div>
        </div>
        <Link href="/workorders" className="f5-btn">← Back</Link>
      </div>

      <div className="f5-section-title">Notice type</div>
      <div className="f5-chips">
        {NOTICE_TYPES.map((t) => (
          <Link key={t.key} href={`/workorders/fields?type=${t.key}`} className={`f5-chip${noticeType === t.key ? " active" : ""}`}>{t.label}</Link>
        ))}
      </div>

      {msg && <div className="f5-badge ok" style={{ display: "inline-block", marginTop: 12 }}>{msg}{pending ? "…" : ""}</div>}

      <div className="f5-card" style={{ padding: 0, marginTop: 16 }}>
        <table className="f5-table">
          <thead>
            <tr><th>Field</th><th>Group</th><th>Feeds AI</th><th style={{ width: 280 }}>Setting</th></tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.key}>
                <td style={{ color: "var(--f5-text)", fontWeight: 600 }}>{f.label}</td>
                <td>{f.group === "core" ? "Work order" : "Notice"}</td>
                <td>{f.aiInput ? "✓" : "—"}</td>
                <td>
                  {f.system ? (
                    <span className="f5-badge bad">Mandatory · locked</span>
                  ) : (
                    <div className="f5-chips">
                      {(["required", "optional", "hidden"] as Mode[]).map((m) => (
                        <span
                          key={m}
                          className={`f5-chip${modeOf(f) === m ? " active" : ""}`}
                          onClick={() => !pending && change(f.key, m)}
                          style={{ textTransform: "capitalize" }}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ color: "var(--f5-text-dim)", fontSize: 11, marginTop: 14 }}>
        Required = must be filled before generating a notice. Optional = shown but not enforced. Hidden = removed from the form.
      </div>
    </main>
  );
}
