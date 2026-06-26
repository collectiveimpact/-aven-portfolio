import "server-only";
import { WALLBOARD_BASE_URL, WALLBOARD_API_KEY, WALLBOARD_DATASOURCE_ID, WALLBOARD_ACCESS_TOKEN, hasWallboard, hasWallboardControl } from "@/lib/env";

// Wallboard digital-signage adapter — Fuse5's signage partner (wallboard.us).
// Talks to the Wallboard REST API (OpenAPI, base path /api/v2) with bearer auth.
// Activates only when WALLBOARD_* env is set; otherwise the Displays section runs
// on local/demo data. Endpoint paths follow Wallboard's documented operations
// (device, content, playlist/simple-loop, device-content assignment) — validate
// against your tenant's OpenAPI on first connect; some paths vary by version.
//
// Wallboard also exposes an MCP server (OAuth) — see WALLBOARD_INTEGRATION.md — so
// Claude/Fuse5 AI agents can manage devices, content and schedules in natural
// language. This adapter is the deterministic REST path used by the app itself.

export interface WallboardDevice { id: string; name: string; online: boolean; lastSeen?: string; currentContent?: string; location?: string }
export interface WallboardContent { id: string; name: string; type?: string; updatedAt?: string }
export interface WBResult<T> { ok: boolean; error?: string; data?: T; status?: number }

function base(): string { return WALLBOARD_BASE_URL.replace(/\/$/, ""); }

// Management calls (/api/v2 device + content) require the OAuth ACCESS TOKEN — the
// scoped API key cannot perform device/content CRUD.
async function wb<T>(method: string, path: string, body?: unknown): Promise<WBResult<T>> {
  if (!hasWallboardControl) return { ok: false, error: "Wallboard device control not configured (set WALLBOARD_ACCESS_TOKEN)." };
  try {
    const res = await fetch(`${base()}/api/v2${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${WALLBOARD_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let json: unknown = null;
    try { json = text ? JSON.parse(text) : null; } catch { /* non-json */ }
    if (!res.ok) return { ok: false, status: res.status, error: `Wallboard ${res.status}: ${text.slice(0, 160)}` };
    return { ok: true, status: res.status, data: json as T };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Wallboard request failed." };
  }
}

// Connection check — light call used by the Displays "Connected" banner.
export async function wallboardPing(): Promise<WBResult<{ count: number }>> {
  const r = await wb<{ items?: unknown[] } | unknown[]>("GET", "/device?limit=1");
  if (!r.ok) return { ok: false, error: r.error, status: r.status };
  const arr = Array.isArray(r.data) ? r.data : (r.data as { items?: unknown[] })?.items ?? [];
  return { ok: true, data: { count: arr.length } };
}

// List signage devices (players/screens) with online status.
export async function listWallboardDevices(): Promise<WBResult<WallboardDevice[]>> {
  const r = await wb<unknown>("GET", "/device");
  if (!r.ok) return { ok: false, error: r.error, status: r.status };
  const raw = Array.isArray(r.data) ? r.data : ((r.data as { items?: unknown[] })?.items ?? []);
  const devices: WallboardDevice[] = (raw as Record<string, unknown>[]).map((d) => ({
    id: String(d.id ?? d.deviceId ?? d.uuid ?? ""),
    name: String(d.name ?? d.deviceName ?? "Device"),
    online: Boolean(d.online ?? d.isOnline ?? (d.status === "online")),
    lastSeen: d.lastSeen ? String(d.lastSeen) : undefined,
    currentContent: d.contentName ? String(d.contentName) : undefined,
    location: d.location ? String(d.location) : undefined,
  }));
  return { ok: true, data: devices };
}

// List content items already in Wallboard.
export async function listWallboardContent(): Promise<WBResult<WallboardContent[]>> {
  const r = await wb<unknown>("GET", "/content");
  if (!r.ok) return { ok: false, error: r.error, status: r.status };
  const raw = Array.isArray(r.data) ? r.data : ((r.data as { items?: unknown[] })?.items ?? []);
  return { ok: true, data: (raw as Record<string, unknown>[]).map((c) => ({ id: String(c.id ?? ""), name: String(c.name ?? "Content"), type: c.type ? String(c.type) : undefined, updatedAt: c.updatedAt ? String(c.updatedAt) : undefined })) };
}

// Publish a Fuse5 notice/asset into Wallboard as a content item. The exact body
// shape depends on the content type; this creates a simple text/image content.
export async function publishWallboardContent(input: { name: string; html?: string; imageUrl?: string; durationS?: number }): Promise<WBResult<{ id: string }>> {
  const r = await wb<Record<string, unknown>>("POST", "/content", {
    name: input.name,
    type: input.imageUrl ? "image" : "html",
    ...(input.imageUrl ? { url: input.imageUrl } : { html: input.html ?? "" }),
    duration: input.durationS ?? 15,
  });
  if (!r.ok) return { ok: false, error: r.error, status: r.status };
  return { ok: true, data: { id: String((r.data as Record<string, unknown>)?.id ?? "") } };
}

// ---- Device control (the OAuth access-token path) -------------------------
// Manage screens directly from Fuse5: assign content, reboot, screenshot, power.
// Endpoint paths follow Wallboard's documented device operations — validate vs
// your tenant's OpenAPI on first connect.

// Assign a content/playlist to one or more devices (push to specific screens).
export async function assignContentToDevices(deviceIds: string[], contentId: string): Promise<WBResult<unknown>> {
  return wb("POST", `/device/content`, { deviceIds, contentId });
}

// Reboot devices.
export async function rebootDevices(deviceIds: string[]): Promise<WBResult<unknown>> {
  return wb("POST", `/device/operation/reboot`, { deviceIds });
}

// Capture a fresh screenshot from a device (returns an image URL when available).
export async function screenshotDevice(deviceId: string): Promise<WBResult<{ url?: string }>> {
  return wb("POST", `/device/${encodeURIComponent(deviceId)}/operation/screenshot`, {});
}

// Power devices on/off (display power, where the hardware supports it).
export async function setDevicePower(deviceIds: string[], on: boolean): Promise<WBResult<unknown>> {
  return wb("POST", `/device/operation/power`, { deviceIds, power: on ? "on" : "off" });
}

// Flash an on-screen identifier so staff can find the physical screen.
export async function identifyDevice(deviceId: string): Promise<WBResult<unknown>> {
  return wb("POST", `/device/${encodeURIComponent(deviceId)}/operation/identify`, {});
}

export { hasWallboardControl };

// ---- Datasource feed (the API-key path) -----------------------------------
// This is what a Wallboard API key actually authorizes. Fuse5 WRITES a live JSON
// datasource that slides/playlists bind to and render across every screen; reading
// returns the current data. Endpoint: /api/datasource/{id}/data (Bearer api-key,
// an HMAC-signed JWT). Wallboard docs: "used by AI assistants and M2M integrations
// to manage dynamic display data."
async function wbDatasource<T>(method: string, suffix: string, body?: unknown): Promise<WBResult<T>> {
  if (!hasWallboard) return { ok: false, error: "Wallboard not configured (WALLBOARD_API_KEY)." };
  if (!WALLBOARD_DATASOURCE_ID) return { ok: false, error: "Set WALLBOARD_DATASOURCE_ID (the Wallboard datasource Fuse5 feeds)." };
  try {
    const res = await fetch(`${base()}/api/datasource/${encodeURIComponent(WALLBOARD_DATASOURCE_ID)}/data${suffix}`, {
      method,
      headers: { Authorization: `Bearer ${WALLBOARD_API_KEY}`, "Content-Type": "application/json", Accept: "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let json: unknown = null; try { json = text ? JSON.parse(text) : null; } catch { /* */ }
    if (!res.ok) return { ok: false, status: res.status, error: `Wallboard ${res.status}: ${text.slice(0, 160)}` };
    return { ok: true, status: res.status, data: json as T };
  } catch (e) { return { ok: false, error: e instanceof Error ? e.message : "Wallboard datasource request failed." }; }
}

// Read the live signage datasource (parsed JSON).
export function readSignageDatasource(): Promise<WBResult<unknown>> {
  return wbDatasource("GET", "?parseData=true");
}

// Push the live Fuse5 signage feed → every screen bound to the datasource updates.
export function pushSignageDatasource(data: unknown): Promise<WBResult<unknown>> {
  return wbDatasource("PUT", "", { data });
}

export const wallboardDatasourceReady = Boolean(WALLBOARD_DATASOURCE_ID);
