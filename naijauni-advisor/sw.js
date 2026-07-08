// Network-first service worker.
// Always tries the network first so returning visitors get the latest
// deployed content immediately — falls back to cache only when offline.
// (An earlier cache-first version could serve stale pages indefinitely
// to returning visitors, especially on Android where service workers
// persist more aggressively than on desktop.)

const CACHE_NAME = "naijauni-advisor-v2";
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/styles.css",
  "/data.js",
  "/app.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/cbt-exam.html"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache API/function calls — always go to network.
  if (url.pathname.startsWith("/.netlify/functions/")) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
