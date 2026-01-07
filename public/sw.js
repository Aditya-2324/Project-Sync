const CACHE_NAME = "project-sync-v2"; // Increment this when you change code
const urlsToCache = [
  "/",
  "/index.html",
  "/client.js",
  "/style.css",
  "/manifest.json"
];

// Install: Cache the UI files
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting(); // Forces the new service worker to become active immediately
});

// Activate: Clean up old versions of the cache
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Fetch: Serve from cache, but IGNORE socket.io
self.addEventListener("fetch", event => {
  // IMPORTANT: Do not intercept socket.io traffic
  if (event.request.url.includes("socket.io")) {
    return; 
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
