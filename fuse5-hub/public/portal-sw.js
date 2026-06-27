/* Fuse5 Resident Portal — web-push service worker.
 *
 * Scoped to /portal/. Handles incoming push events and notification clicks.
 * Registered by src/app/portal/notifications/enable-notifications.tsx.
 *
 * Payload shape (sent by lib/portal/push.ts → sendPortalPush):
 *   { title, body, url?, tag? }
 */

self.addEventListener("install", (event) => {
  // Activate immediately so the first enable doesn't require a reload.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { title: "Resident Portal", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Resident Portal";
  const options = {
    body: data.body || "",
    tag: data.tag || undefined,
    data: { url: data.url || "/portal" },
    icon: "/fuse5-logo.png",
    badge: "/fuse5-logo.png",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/portal";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus an existing portal tab if one is open; otherwise open a new one.
      for (const client of clientList) {
        if (client.url.includes("/portal") && "focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    }),
  );
});
