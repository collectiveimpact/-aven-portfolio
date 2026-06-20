"use client";

import { useState } from "react";
import type { MemberRow, AuditRow, SubscriptionInfo, PlatformStats } from "@/lib/queries";
import type { ProviderDemo, PlatformUserDemo, PlayerDemo, PortalConfig, ImpersonateTarget } from "@/lib/platform";
import { MemberRoles } from "./member-roles";
import { BillingPanel, OrgSettingsPanel, AuditPanel, PlatformOverviewPanel, AllProvidersPanel, ProviderRolesPanel, ProviderUsersPanel, EnvironmentsPanel, PermissionMatrixPanel, LocationPlayerPanel } from "./panels";
import { TenantPortalForm } from "./tenant-portal-form";
import { ImpersonationPanel } from "./impersonation-panel";
import { FuseRolesPanel, IntegrationsAdminPanel, TemplateLibraryPanel, ApprovalWorkflowPanel, ComplianceSettingsPanel, PlatformBillingTable } from "./admin-panels-v2";

export interface AdminConsoleProps {
  isSuper: boolean;
  canManage: boolean;
  canImpersonate: boolean;
  currentUserId: string;
  orgName: string;
  members: MemberRow[];
  audit: AuditRow[];
  sub: SubscriptionInfo;
  stats: PlatformStats;
  providers: ProviderDemo[];
  users: PlatformUserDemo[];
  fleet: PlayerDemo[];
  portal: PortalConfig;
  impTargets: ImpersonateTarget[];
}

type PanelKey = string;
const ACCOUNT: { key: PanelKey; label: string }[] = [
  { key: "users-roles", label: "Users & Roles" },
  { key: "billing", label: "License & Billing" },
  { key: "org-settings", label: "Org Settings" },
  { key: "audit", label: "Audit Log" },
];
const PLATFORM: { key: PanelKey; label: string }[] = [
  { key: "platform-overview", label: "Platform Overview" },
  { key: "fuse5-roles", label: "Users & Permissions" },
  { key: "all-providers", label: "All Providers" },
  { key: "provider-roles", label: "Provider Role Templates" },
  { key: "provider-users", label: "All Provider Users" },
  { key: "environments", label: "Environments" },
  { key: "impersonation", label: "Impersonation" },
  { key: "permission-matrix", label: "Permission Matrix" },
  { key: "tenant-portal", label: "Tenant Portal Config" },
  { key: "location-player", label: "Location-Player Config" },
  { key: "integrations", label: "Data Sources & Integrations" },
  { key: "template-library", label: "Template Library" },
  { key: "approval-workflow", label: "Approval Workflow" },
  { key: "compliance-settings", label: "Compliance Settings" },
];

export function AdminConsole(p: AdminConsoleProps) {
  const [active, setActive] = useState<PanelKey>("users-roles");

  const NavGroup = ({ title, items }: { title: string; items: { key: PanelKey; label: string }[] }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--f5-text-dim)", padding: "0 10px 6px" }}>{title}</div>
      {items.map((it) => (
        <button key={it.key} type="button" onClick={() => setActive(it.key)}
          className="f5-btn"
          style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 3, padding: "7px 10px", fontSize: 13,
            background: active === it.key ? "var(--f5-teal-soft, rgba(0,153,153,0.15))" : "transparent",
            border: active === it.key ? "1px solid var(--f5-teal,#009999)" : "1px solid transparent",
            color: active === it.key ? "var(--f5-text)" : "var(--f5-text-secondary)" }}>
          {it.label}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" }}>
      <nav className="f5-card" style={{ padding: 12, position: "sticky", top: 16 }}>
        <NavGroup title="Account" items={ACCOUNT} />
        {p.isSuper && <NavGroup title="Fuse5 Platform" items={PLATFORM} />}
      </nav>

      <section style={{ minWidth: 0 }}>
        {active === "users-roles" && <MemberRoles members={p.members} canManage={p.canManage} currentUserId={p.currentUserId} />}
        {active === "billing" && (p.isSuper ? <PlatformBillingTable /> : <BillingPanel sub={p.sub} />)}
        {active === "org-settings" && <OrgSettingsPanel orgName={p.orgName} />}
        {active === "audit" && <AuditPanel audit={p.audit} />}
        {active === "platform-overview" && <PlatformOverviewPanel stats={p.stats} providers={p.providers} />}
        {active === "all-providers" && <AllProvidersPanel providers={p.providers} />}
        {active === "provider-roles" && <ProviderRolesPanel />}
        {active === "provider-users" && <ProviderUsersPanel users={p.users} />}
        {active === "environments" && <EnvironmentsPanel />}
        {active === "impersonation" && <ImpersonationPanel targets={p.impTargets} canImpersonate={p.canImpersonate} />}
        {active === "permission-matrix" && <PermissionMatrixPanel />}
        {active === "tenant-portal" && <TenantPortalForm initial={p.portal} canEdit={p.canManage} />}
        {active === "location-player" && <LocationPlayerPanel fleet={p.fleet} />}
        {active === "fuse5-roles" && <FuseRolesPanel />}
        {active === "integrations" && <IntegrationsAdminPanel />}
        {active === "template-library" && <TemplateLibraryPanel />}
        {active === "approval-workflow" && <ApprovalWorkflowPanel />}
        {active === "compliance-settings" && <ComplianceSettingsPanel />}
      </section>
    </div>
  );
}
