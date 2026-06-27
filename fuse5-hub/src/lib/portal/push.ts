import "server-only";
import { getPushSubscriptions } from "./data";

// ─────────────────────────────────────────────────────────────────────────────
// Web-push sender — STUBBED until VAPID keys are configured.
//
// Real Web Push requires:
//   • A VAPID key pair (public + private), surfaced as:
//       VAPID_PUBLIC_KEY   — also handed to the browser to subscribe (PushManager
//                            applicationServerKey); exposed via getVapidPublicKey()
//       VAPID_PRIVATE_KEY  — server-only signing key
//   • A signed request to each subscription's push endpoint with an encrypted
//     payload (RFC 8291) and a VAPID JWT (RFC 8292). That crypto is non-trivial;
//     it's normally done with the `web-push` npm package.
//
// We intentionally ship NO new npm dependency here. This module:
//   1. reads the keys directly from process.env (NEVER edits src/lib/env.ts),
//   2. persists subscriptions (done in lib/portal/data.ts), and
//   3. exposes a sendPortalPush() that is a NO-OP logger when VAPID keys are
//      missing, and a clearly-marked TODO when they're present.
//
// FOLLOW-UP: add `web-push` (or a hand-rolled RFC 8291/8292 sender) and replace
// the marked section below to actually deliver notifications.
// ─────────────────────────────────────────────────────────────────────────────

/** The VAPID public key, if configured — the client needs it to subscribe. */
export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

/** True when both VAPID keys are present, i.e. real push *could* be sent. */
export function isPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY?.trim() && process.env.VAPID_PRIVATE_KEY?.trim());
}

export interface PortalPushPayload {
  title: string;
  body: string;
  url?: string; // deep-link path within the portal, e.g. /portal/requests
  tag?: string;
}

export interface SendPortalPushResult {
  mode: "sent" | "stub";
  attempted: number;
  delivered: number;
}

/**
 * Send a push notification to every browser this resident has subscribed.
 *
 * When VAPID keys are NOT configured this is a graceful no-op (mode: "stub") —
 * subscriptions are still recorded, so enabling keys later "just works".
 */
export async function sendPortalPush(
  residentId: string,
  orgId: string,
  payload: PortalPushPayload,
): Promise<SendPortalPushResult> {
  const subs = await getPushSubscriptions(residentId, orgId);

  if (!isPushConfigured()) {
    // No-op fallback. Log enough to see it would have fired in dev.
    console.info(
      `[portal-push] STUB (set VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY to enable) → resident=${residentId} subs=${subs.length} title=${JSON.stringify(payload.title)}`,
    );
    return { mode: "stub", attempted: subs.length, delivered: 0 };
  }

  // ── REAL SEND (follow-up) ──────────────────────────────────────────────────
  // With keys present, deliver to each subscription. Implementing the encrypted
  // RFC 8291 payload + RFC 8292 VAPID JWT by hand (or via `web-push`) is the
  // remaining work; until then we still no-op so nothing throws in production.
  let delivered = 0;
  for (const _sub of subs) {
    // TODO(web-push): POST encrypted payload + VAPID JWT to _sub.endpoint.
    void _sub;
    void payload;
    delivered += 0;
  }
  return { mode: "sent", attempted: subs.length, delivered };
}
