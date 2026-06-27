"use client";

import { useState } from "react";
import Link from "next/link";
import type { MemberRow, AuditRow, SubscriptionInfo, PlatformStats } from "@/lib/queries";
import type { ProviderDemo, PlatformUserDemo, PlayerDemo, PortalConfig, ImpersonateTarget } from "@/lib/platform";
import type {
  ProviderRow, RoleTemplateRow, ApprovalWorkflowRow, ApprovalQueueRow,
  IntegrationConfigRow, PermissionGrantRow,
} from "@/lib/admin-store";
import { MemberRoles } from "./member-roles";
import { BillingPanel, OrgSettingsPanel, AuditPanel, PlatformOverviewPanel, AllProvidersPanel, ProviderRolesPanel, ProviderUsersPanel, EnvironmentsPanel, PermissionMatrixPanel, LocationPlayerPanel } from "./panels";
import { TenantPortalForm } from "./tenant-portal-form";
import { ImpersonationPanel } from "./impersonation-panel";
import { ModulesPanel } from "./modules-panel";
import { TierPanel } from "./tier-panel";
import { DepartmentsPanel } from "./departments-panel";
import type { DepartmentRow } from "./actions";
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
  moduleConfig: string[] | null;
  canOnboard: boolean;
  departments: DepartmentRow[];
  memberDepartments: Record<string, string | null>;
  departmentCounts: Record<string, number>;
  // Real admin-persistence rows (migration 0020). Empty arrays in demo/no-backend
  // → panels fall back to the static reference data from @/lib/platform[-admin].
  providerRows: ProviderRow[];
  roleTemplateRows: RoleTemplateRow[];
  approvalWorkflowRows: ApprovalWorkflowRow[];
  approvalQueueRows: ApprovalQueueRow[];
  integrationConfigRows: IntegrationConfigRow[];
  permissionGrantRows: PermissionGrantRow[];
}

type PanelKey = string;
// Nav item: `key` switches an in-page panel; `href` is an external link (full
// page, e.g. Channels); `sup` gates the item to Fuse5 super-admins.
type NavItem = { key: PanelKey; label: string; sup?: boolean; href?: string };
// Grouped Admin navigation. Empty groups (all items gated out) are hidden.
const SECTIONS: { title: string; items: NavItem[] }[] = [
  { title: "People & Access", items: [
    { key: "users-roles", label: "Users & Roles" },
    { key: "departments", label: "Departments" },
    { key: "fuse5-roles", label: "Users & Permissions", sup: true },
    { key: "permission-matrix", label: "Permission Matrix", sup: true },
    { key: "impersonation", label: "Impersonation", sup: true },
  ] },
  { title: "Plan & Account", items: [
    { key: "tiers", label: "Plans & Tiers" },
    { key: "billing", label: "License & Billing" },
    { key: "modules", label: "Modules" },
    { key: "org-settings", label: "Org Settings" },
  ] },
  { title: "Delivery & Channels", items: [
    { key: "channels-link", label: "Channels", sup: true, href: "/channels" },
    { key: "integrations", label: "Data Sources & Integrations", sup: true },
    { key: "tenant-portal", label: "Tenant Portal Config", sup: true },
    { key: "location-player", label: "Location-Player Config", sup: true },
  ] },
  { title: "Content & Workflows", items: [
    { key: "template-library", label: "Template Library", sup: true },
    { key: "approval-workflow", label: "Approval Workflow", sup: true },
    { key: "compliance-settings", label: "Compliance Settings", sup: true },
  ] },
  { title: "Platform", items: [
    { key: "platform-overview", label: "Platform Overview", sup: true },
    { key: "all-providers", label: "All Providers", sup: true },
    { key: "provider-roles", label: "Provider Role Templates", sup: true },
    { key: "provider-users", label: "All Provider Users", sup: true },
    { key: "environments", label: "Environments", sup: true },
  ] },
  { title: "Audit", items: [
    { key: "audit", label: "Audit Log" },
  ] },
];

export function AdminConsole(p: AdminConsoleProps) {
  const [active, setActive] = useState<PanelKey>("users-roles");

  const itemStyle = (on: boolean) => ({
    display: "block", width: "100%", textAlign: "left" as const, marginBottom: 3, padding: "7px 10px", fontSize: 13,
    background: on ? "var(--f5-teal-soft, rgba(0,153,153,0.15))" : "transparent",
    border: on ? "1px solid var(--f5-teal,#009999)" : "1px solid transparent",
    color: on ? "var(--f5-text)" : "var(--f5-text-secondary)",
  });
  const NavGroup = ({ title, items }: { title: string; items: NavItem[] }) => {
    const visible = items.filter((it) => !it.sup || p.isSuper);
    if (visible.length === 0) return null;
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 0.8, color: "var(--f5-text-dim)", padding: "0 10px 6px" }}>{title}</div>
        {visible.map((it) => it.href ? (
          <Link key={it.key} href={it.href} className="f5-btn" style={itemStyle(false)}>{it.label} ↗</Link>
        ) : (
          <button key={it.key} type="button" onClick={() => setActive(it.key)} className="f5-btn" style={itemStyle(active === it.key)}>
            {it.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20, alignItems: "start" }}>
      <nav className="f5-card" style={{ padding: 12, position: "sticky", top: 16 }}>
        {SECTIONS.map((s) => <NavGroup key={s.title} title={s.title} items={s.items} />)}
      </nav>

      <section style={{ minWidth: 0 }}>
        {active === "users-roles" && <MemberRoles members={p.members} canManage={p.canManage} currentUserId={p.currentUserId} departments={p.departments} memberDepartments={p.memberDepartments} canAssignDept={p.canOnboard} />}
        {active === "departments" && <DepartmentsPanel departments={p.departments} memberCounts={p.departmentCounts} canManage={p.canManage} />}
        {active === "billing" && (p.isSuper ? <PlatformBillingTable /> : <BillingPanel sub={p.sub} />)}
        {active === "modules" && <ModulesPanel initial={p.moduleConfig} canEdit={p.canManage} />}
        {active === "tiers" && <TierPanel initial={p.moduleConfig} canEdit={p.canManage} />}
        {active === "org-settings" && <OrgSettingsPanel orgName={p.orgName} />}
        {active === "audit" && <AuditPanel audit={p.audit} />}
        {active === "platform-overview" && <PlatformOverviewPanel stats={p.stats} providers={p.providers} />}
        {active === "all-providers" && <AllProvidersPanel providers={p.providers} rows={p.providerRows} />}
        {active === "provider-roles" && <ProviderRolesPanel rows={p.roleTemplateRows} />}
        {active === "provider-users" && <ProviderUsersPanel users={p.users} />}
        {active === "environments" && <EnvironmentsPanel />}
        {active === "impersonation" && <ImpersonationPanel targets={p.impTargets} canImpersonate={p.canImpersonate} />}
        {active === "permission-matrix" && <PermissionMatrixPanel grants={p.permissionGrantRows} />}
        {active === "tenant-portal" && <TenantPortalForm initial={p.portal} canEdit={p.canManage} />}
        {active === "location-player" && <LocationPlayerPanel fleet={p.fleet} />}
        {active === "fuse5-roles" && <FuseRolesPanel />}
        {active === "integrations" && <IntegrationsAdminPanel configs={p.integrationConfigRows} />}
        {active === "template-library" && <TemplateLibraryPanel />}
        {active === "approval-workflow" && <ApprovalWorkflowPanel workflows={p.approvalWorkflowRows} queueRows={p.approvalQueueRows} />}
        {active === "compliance-settings" && <ComplianceSettingsPanel />}
      </section>
    </div>
  );
}
