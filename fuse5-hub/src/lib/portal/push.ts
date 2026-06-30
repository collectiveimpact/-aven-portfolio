import "server-only";
import webpush from "web-push";
import { getPushSubscriptions, pruneSubscription } from "./data";

// ─────────────────────────────────────────────────────────────────────────────
// Web-push sender — FULLY IMPLEMENTED; dormant only until VAPID keys are set.
//
// Real Web Push is delivered here via the `web-push` package (RFC 8291 payload
// encryption + RFC 8292 VAPID JWT). The only thing standing between this and live
// notifications is a VAPID key pair in the environment — there is no remaining
// code to write.
//
//   VAPID_PUBLIC_KEY   — also handed to the browser to subscribe (PushManager
//                        applicationServerKey); exposed via getVapidPublicKey()
//   VAPID_PRIVATE_KEY  — server-only signing key
//   VAPID_SUBJECT      — optional mailto: contact (defaults below)
//
// Generate a pair once with:  npx web-push generate-vapid-keys
//
// This module:
//   1. reads the keys directly from process.env (NEVER edits src/lib/env.ts),
//   2. relies on subscriptions persisted in lib/portal/data.ts, and
//   3. sends real encrypted pushes when keys are present (mode "sent"), or is a
//      graceful no-op logger when they're missing (mode "stub") — so enabling
//      keys later "just works" with zero code changes. Expired subscriptions
//      (404/410) are pruned automatically.
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
  // With keys present, deliver a real encrypted Web Push (RFC 8291) signed with a
  // VAPID JWT (RFC 8292) to each subscription endpoint via the `web-push` lib.
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT?.trim() || "mailto:notifications@fuse5.app",
    process.env.VAPID_PUBLIC_KEY!.trim(),
    process.env.VAPID_PRIVATE_KEY!.trim(),
  );
  const json = JSON.stringify(payload);
  let delivered = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          json,
        );
        delivered += 1;
      } catch (e) {
        // 404/410 = subscription expired/unsubscribed → prune it so we stop trying.
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await pruneSubscription(sub.endpoint).catch(() => {});
      }
    }),
  );
  return { mode: "sent", attempted: subs.length, delivered };
}
