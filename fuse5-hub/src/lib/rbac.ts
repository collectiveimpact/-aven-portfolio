// Fuse5 Hub 8-role RBAC (ported from the v2.0.8 prototype role model).
export type F5Role =
  | "super_admin"      // Fuse5 global staff
  | "org_admin"        // provider account owner
  | "manager"          // multi-property manager
  | "property_manager" // single/few properties
  | "comms_manager"    // broadcasts + templates
  | "publisher"        // can publish content/displays
  | "frontline"        // day-to-day staff
  | "viewer";          // read-only (board, funder)

export const ROLE_LABELS: Record<F5Role, string> = {
  super_admin: "Fuse5 Super Admin",
  org_admin: "Org Admin",
  manager: "Manager",
  property_manager: "Property Manager",
  comms_manager: "Comms Manager",
  publisher: "Publisher",
  frontline: "Frontline Staff",
  viewer: "Viewer",
};

const CAN_BROADCAST: F5Role[] = ["super_admin", "org_admin", "manager", "comms_manager"];
const CAN_PUBLISH: F5Role[] = ["super_admin", "org_admin", "manager", "comms_manager", "publisher"];
const CAN_ADMIN: F5Role[] = ["super_admin", "org_admin"];

export const canBroadcast = (r: F5Role) => CAN_BROADCAST.includes(r);
export const canPublish = (r: F5Role) => CAN_PUBLISH.includes(r);
export const canAdmin = (r: F5Role) => CAN_ADMIN.includes(r);
export const isGlobal = (r: F5Role) => r === "super_admin";
