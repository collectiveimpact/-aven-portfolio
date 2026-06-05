"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setWorkOrderStatus } from "./actions";

type Status = "open" | "in_progress" | "resolved";
const BADGE: Record<Status, string> = { open: "f5-badge warn", in_progress: "f5-badge", resolved: "f5-badge ok" };
const LABEL: Record<Status, string> = { open: "Open", in_progress: "In Progress", resolved: "Resolved" };

// Inline operational-status control on the WO queue. Read-only badge when the
// user can't publish; an editable select (auto-saving on change) when they can.
export function WoStatus({ id, status, canEdit }: { id: string; status: Status; canEdit: boolean }) {
  const router = useRouter();
  const [value, setValue] = useState<Status>(status);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState(false);

  if (!canEdit) return <span className={BADGE[status]}>{LABEL[status]}</span>;

  function change(next: Status) {
    const prev = value;
    setValue(next); setErr(false);
    startTransition(async () => {
      const r = await setWorkOrderStatus(id, next);
      if (!r.ok) { setValue(prev); setErr(true); return; }
      router.refresh();
    });
  }

  return (
    <select
      className="f5-select"
      value={value}
      disabled={pending}
      onChange={(e) => change(e.target.value as Status)}
      style={{ padding: "4px 8px", fontSize: 12, width: "auto", minWidth: 120, borderColor: err ? "var(--f5-red)" : undefined }}
      title="Change work-order status"
    >
      <option value="open">Open</option>
      <option value="in_progress">In Progress</option>
      <option value="resolved">Resolved</option>
    </select>
  );
}
