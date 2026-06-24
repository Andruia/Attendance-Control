/**
 * Simplified Service Worker registration helper.
 * Injected as a separate file for browsers that don't support module workers.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
