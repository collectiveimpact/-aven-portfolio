"use client";

import { useEffect, useState } from "react";
import { savePushSubscription } from "../actions";

// VAPID public keys are base64url; the browser needs them as a Uint8Array.
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type Status = "idle" | "working" | "subscribed" | "denied" | "error";

export function EnableNotifications({
  alreadySubscribed,
  vapidPublicKey,
  pushConfigured,
}: {
  alreadySubscribed: boolean;
  vapidPublicKey: string | null;
  pushConfigured: boolean;
}) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [status, setStatus] = useState<Status>(alreadySubscribed ? "subscribed" : "idle");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    setSupported(
      typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window,
    );
  }, []);

  async function enable() {
    setError("");
    setStatus("working");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      // Register (or reuse) the portal service worker scoped to /portal/.
      const reg = await navigator.serviceWorker.register("/portal-sw.js", { scope: "/portal/" });
      await navigator.serviceWorker.ready;

      // Subscribe via PushManager. applicationServerKey requires the VAPID public
      // key; without it we can't create a real push subscription, but we still
      // record permission state so enabling keys later only needs a re-subscribe.
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        if (!vapidPublicKey) {
          setError("Push isn't fully configured yet (server VAPID key missing). Permission is granted; an admin needs to add VAPID keys to finish enabling delivery.");
          setStatus("error");
          return;
        }
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });
      }

      const json = sub.toJSON();
      const endpoint = json.endpoint ?? sub.endpoint;
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;
      if (!endpoint || !p256dh || !auth) {
        setError("Couldn't read the push subscription from this browser.");
        setStatus("error");
        return;
      }

      const r = await savePushSubscription({ endpoint, p256dh, auth });
      if (r.error) {
        setError(r.error);
        setStatus("error");
        return;
      }
      setStatus("subscribed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong enabling notifications.");
      setStatus("error");
    }
  }

  return (
    <section className="f5-card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          aria-hidden
          style={{
            display: "grid", placeItems: "center", width: 40, height: 40, borderRadius: 11,
            background: "var(--f5-teal-subtle)", color: "var(--f5-teal)", fontSize: 20,
          }}
        >
          🔔
        </div>
        <div>
          <div style={{ fontWeight: 700, color: "var(--f5-text)" }}>Push notifications</div>
          <div style={{ color: "var(--f5-text-muted)", fontSize: 12.5 }}>
            {status === "subscribed"
              ? "Enabled on this device."
              : "Stay on top of building updates and request replies."}
          </div>
        </div>
      </div>

      {supported === false && (
        <div style={{ fontSize: 13, color: "var(--f5-text-muted)" }}>
          This browser doesn&apos;t support push notifications. Try a recent Chrome, Edge, or Firefox.
        </div>
      )}

      {!pushConfigured && (
        <div
          style={{
            fontSize: 12.5, color: "var(--f5-text-muted)",
            background: "var(--f5-surface-2)", border: "1px solid var(--f5-border)",
            borderRadius: 8, padding: "9px 11px",
          }}
        >
          Note: real push delivery needs server <code>VAPID_PUBLIC_KEY</code> and <code>VAPID_PRIVATE_KEY</code> to be set.
          You can still grant permission now — delivery turns on once those keys are configured.
        </div>
      )}

      {status === "subscribed" ? (
        <div
          role="status"
          style={{
            fontSize: 13, color: "var(--f5-teal)",
            background: "var(--f5-teal-subtle)", border: "1px solid var(--f5-teal-border)",
            borderRadius: 8, padding: "10px 12px",
          }}
        >
          ✓ Notifications are on for this device.
        </div>
      ) : (
        <button
          type="button"
          onClick={enable}
          disabled={supported !== true || status === "working"}
          className="f5-btn primary"
          style={{ justifyContent: "center", padding: 11 }}
        >
          {status === "working" ? "Enabling…" : "Enable notifications"}
        </button>
      )}

      {status === "denied" && (
        <div role="alert" style={{ fontSize: 12.5, color: "var(--f5-text-muted)" }}>
          Notifications are blocked for this site. Allow them in your browser&apos;s site settings, then try again.
        </div>
      )}
      {error && (
        <div role="alert" style={{ fontSize: 12.5, color: "var(--f5-red, #ef4444)" }}>{error}</div>
      )}
    </section>
  );
}
