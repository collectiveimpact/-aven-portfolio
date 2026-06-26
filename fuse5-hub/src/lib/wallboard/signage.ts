import "server-only";
import { hasWallboard, WALLBOARD_BASE_URL, WALLBOARD_MCP_URL } from "@/lib/env";
import { listWallboardDevices, type WallboardDevice } from "./api";

export interface WallboardSignage {
  configured: boolean;        // creds present
  connected: boolean;         // creds present AND a successful API call
  baseUrl: string;
  mcpUrl: string;
  devices: WallboardDevice[];
  online: number;
  error?: string;
}

// Status for the Displays "powered by Wallboard" surface. Degrades cleanly:
// not configured → show connect CTA; configured but unreachable → show the error;
// connected → real devices.
export async function getWallboardSignage(): Promise<WallboardSignage> {
  const meta = { configured: hasWallboard, connected: false, baseUrl: WALLBOARD_BASE_URL, mcpUrl: WALLBOARD_MCP_URL, devices: [] as WallboardDevice[], online: 0 };
  if (!hasWallboard) return meta;
  const r = await listWallboardDevices();
  if (!r.ok) return { ...meta, error: r.error };
  const devices = r.data ?? [];
  return { ...meta, connected: true, devices, online: devices.filter((d) => d.online).length };
}
