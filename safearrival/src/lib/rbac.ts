import type { SaRole } from "@/lib/types";

// SafeArrival's own role model (independent of Fuse5's 8-role RBAC).
// Mirrors the sa_role enum + the RLS policy groupings in 0001_init.sql.
export const ROLE_LABELS: Record<SaRole, string> = {
  org_admin: "Org Admin",
  program_director: "Program Director",
  coordinator: "Coordinator",
  staff: "Frontline Staff",
  viewer: "Viewer",
  parent: "Parent / Guardian",
};

const CAN_WRITE_DOMAIN: SaRole[] = ["org_admin", "program_director", "coordinator", "staff"];
const CAN_MANAGE_ORG: SaRole[] = ["org_admin", "program_director"];

export const canRecordAttendance = (role: SaRole) => CAN_WRITE_DOMAIN.includes(role);
export const canManageOrg = (role: SaRole) => CAN_MANAGE_ORG.includes(role);
export const isReadOnly = (role: SaRole) => role === "viewer" || role === "parent";
