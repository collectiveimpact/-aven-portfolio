"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setScope } from "@/app/(app)/view-actions";

// A standalone "filter by housing provider" control for in-page placement (e.g.
// Analytics top-left). Writes the same scope cookie the top bar uses, so the two
// stay in sync. Merge-safe: it only changes the provider dimension.
export function ProviderFilter({
  providers,
  value,
  label = "Provider",
}: {
  providers: string[];
  value: string | null;
  label?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 12, color: "var(--f5-text-muted)" }}>{label}</span>
      <select
        className="f5-select"
        style={{ padding: "5px 8px", fontSize: 12, maxWidth: 220 }}
        value={value ?? ""}
        disabled={pending}
        aria-label="Filter by housing provider"
        onChange={(e) =>
          start(async () => {
            await setScope({ providerName: e.target.value || null });
            router.refresh();
          })
        }
      >
        <option value="">All Providers</option>
        {providers.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    </label>
  );
}
