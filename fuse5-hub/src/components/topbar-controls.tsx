"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { F5Role } from "@/lib/rbac";
import { setScope, setViewRole } from "@/app/(app)/view-actions";
import { VIEW_ROLE_LABELS, VIEW_ROLE_ORDER } from "@/lib/view-roles";

// Top-bar view controls: a Provider filter (super-admin only), a Property filter,
// and a "View as" role switcher (real-super-admin only). All three are cookie-
// backed (see lib/view.ts) and refresh the whole app on change.

export function TopbarControls({
  orgName,
  providers,
  properties,
  scope,
  realRole,
  effectiveRole,
  userName,
}: {
  orgName: string;
  providers: string[];
  properties: string[];
  scope: { providerName: string | null; propertyName: string | null };
  realRole: F5Role | null;
  effectiveRole: F5Role | null;
  userName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const isRealSuper = realRole === "super_admin";
  const showProviderFilter = effectiveRole === "super_admin" && providers.length > 0;

  function applyScope(next: { providerName?: string | null; propertyName?: string | null }) {
    start(async () => {
      await setScope({ providerName: scope.providerName, propertyName: scope.propertyName, ...next });
      router.refresh();
    });
  }
  function applyRole(role: F5Role | "reset") {
    start(async () => {
      await setViewRole(role);
      router.refresh();
    });
  }

  const sel: React.CSSProperties = { padding: "5px 8px", fontSize: 12, maxWidth: 190 };
  const previewing = isRealSuper && effectiveRole !== "super_admin";

  return (
    <>
      {/* Provider filter — super-admin only; otherwise the org is fixed. */}
      {showProviderFilter ? (
        <select
          className="f5-select"
          style={sel}
          value={scope.providerName ?? ""}
          disabled={pending}
          onChange={(e) => applyScope({ providerName: e.target.value || null })}
          aria-label="Filter by housing provider"
          title="Filter by housing provider"
        >
          <option value="">All Providers</option>
          {providers.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      ) : (
        <span className="f5-pill" title="Your housing provider">{scope.providerName ?? orgName}</span>
      )}

      {/* Property filter — every role. */}
      <select
        className="f5-select"
        style={sel}
        value={scope.propertyName ?? ""}
        disabled={pending}
        onChange={(e) => applyScope({ propertyName: e.target.value || null })}
        aria-label="Filter by property"
        title="Filter by property"
      >
        <option value="">All Properties{properties.length ? ` (${properties.length})` : ""}</option>
        {properties.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>

      <span className="f5-live" style={{ marginLeft: "auto" }}>LIVE</span>

      {/* "View as" role switcher — only a real super admin can preview roles. */}
      {isRealSuper ? (
        <label
          className="f5-pill"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "2px 4px 2px 10px", borderColor: previewing ? "var(--f5-coral, #FD5A19)" : undefined }}
          title="Preview the product as another role"
        >
          <span style={{ fontSize: 11, color: "var(--f5-text-muted)" }}>View as</span>
          <select
            className="f5-select"
            style={{ padding: "4px 6px", fontSize: 12, border: "none", background: "transparent", fontWeight: 600 }}
            value={effectiveRole ?? "super_admin"}
            disabled={pending}
            onChange={(e) => applyRole(e.target.value as F5Role)}
            aria-label="View as role"
          >
            {VIEW_ROLE_ORDER.map((r) => (
              <option key={r} value={r}>{VIEW_ROLE_LABELS[r]}</option>
            ))}
          </select>
        </label>
      ) : (
        <span className="f5-pill">{userName}</span>
      )}
    </>
  );
}
