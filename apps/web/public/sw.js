// Bump this version when changing offline.html so installed apps refresh it.
const CACHE_NAME = "bts-pwa-offline-v1";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.add(new Request(OFFLINE_URL, { cache: "reload" }));
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) => key.startsWith("bts-pwa-offline-") && key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

// Never cache authenticated HTML or API responses. Server-rendered pages need
// a connection; a precached page keeps offline navigation understandable.
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate" || event.request.method !== "GET") {
    return;
  }
  event.respondWith(
    (async () => {
      try {
        return await fetch(event.request);
      } catch {
        return (await caches.match(OFFLINE_URL)) ?? Response.error();
      }
    })()
  );
});
