/**
 * Self-contained Service Worker for Attendance Control
 *
 * No Workbox dependencies — uses the standard Service Worker API.
 *
 * Cache strategies:
 *  - Cache-first: static assets (CSS, JS, fonts, images, SVG)
 *  - Network-first: navigation requests, with offline cache fallback
 *  - Network-first: API routes (/api/), with cache fallback
 *  - Background Sync: triggers client-side sync for queued time entries
 */

const CACHE_NAMES = {
  static: "static-assets-v1",
  pages: "pages-v1",
  api: "api-responses-v1",
};

const APP_SHELL = ["/", "/login", "/clock", "/history", "/team", "/settings", "/users", "/reports"];

// ─── Install ─────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAMES.pages);
      await cache.addAll(APP_SHELL.map((url) => new Request(url, { cache: "reload" })));
      await self.skipWaiting();
    })(),
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Remove outdated caches
      const keys = await caches.keys();
      const active = Object.values(CACHE_NAMES);
      await Promise.all(keys.filter((k) => !active.includes(k)).map((k) => caches.delete(k)));
      // Claim all clients immediately
      await self.clients.claim();
    })(),
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and browser extension requests
  if (request.method !== "GET" || !url.protocol.startsWith("http")) return;

  // API routes: network-first with cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, CACHE_NAMES.api));
    return;
  }

  // Static assets: cache-first
  if (
    request.destination === "style" ||
    request.destination === "script" ||
    request.destination === "font" ||
    request.destination === "image"
  ) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.static));
    return;
  }

  // Navigation requests: network-first with cache fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, CACHE_NAMES.pages));
    return;
  }

  // Everything else: network-first with cache fallback
  event.respondWith(networkFirst(request, CACHE_NAMES.pages));
});

// ─── Strategies ──────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok || response.type === "opaqueredirect") {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // For navigation: serve the root page as a fallback
    if (request.mode === "navigate") {
      const fallback = await caches.match("/");
      if (fallback) return fallback;
    }
    return new Response("Offline", { status: 503 });
  }
}

// ─── Background Sync ─────────────────────────────────────────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-time-entries") {
    event.waitUntil(
      (async () => {
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) {
          client.postMessage({ type: "TRIGGER_SYNC" });
        }
      })(),
    );
  }
});

// ─── Message Handling ────────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
