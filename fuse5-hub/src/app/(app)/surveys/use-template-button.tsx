"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { createFromResidentTemplate } from "./actions";

// Creates a draft survey seeded from the Resident Satisfaction template, then
// returns to the Surveys list where it appears as a new row.
export function UseTemplateButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <>
      <button className="f5-btn primary" disabled={pending} onClick={() => {
        setErr(null);
        start(async () => {
          const r = await createFromResidentTemplate();
          if (!r.ok) { setErr(r.error ?? "Could not create."); return; }
          router.push(r.id ? `/surveys/${r.id}` : "/surveys"); router.refresh();
        });
      }}>{pending ? "Creating…" : "Use this template"}</button>
      {err && <span style={{ color: "var(--f5-red)", fontSize: 12, alignSelf: "center" }}>{err}</span>}
    </>
  );
}
