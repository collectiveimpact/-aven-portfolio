import "server-only";
import { hasWallboard, hasWallboardControl, WALLBOARD_BASE_URL, WALLBOARD_MCP_URL } from "@/lib/env";
import { listWallboardDevices, type WallboardDevice } from "./api";

export interface WallboardSignage {
  configured: boolean;        // datasource key OR control token present
  connected: boolean;         // control token present AND device list succeeded
  control: boolean;           // device-management token present
  baseUrl: string;
  mcpUrl: string;
  devices: WallboardDevice[];
  online: number;
  error?: string;
}

// Status for the Displays "powered by Wallboard" surface. Degrades cleanly:
// not configured → connect CTA; control token → live device list for management.
export async function getWallboardSignage(): Promise<WallboardSignage> {
  const meta = { configured: hasWallboard || hasWallboardControl, connected: false, control: hasWallboardControl, baseUrl: WALLBOARD_BASE_URL, mcpUrl: WALLBOARD_MCP_URL, devices: [] as WallboardDevice[], online: 0 };
  if (!hasWallboardControl) return meta;
  const r = await listWallboardDevices();
  if (!r.ok) return { ...meta, error: r.error };
  const devices = r.data ?? [];
  return { ...meta, connected: true, devices, online: devices.filter((d) => d.online).length };
}
