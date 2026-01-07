const CACHE_NAME = "project-sync-cache-v1";
const urlsToCache = [
"/",
"/index.html",
"/client.js",
"/style.css",
"/manifest.json"
];

self.addEventListener("install", event => {
event.waitUntil(
caches.open(CACHE_NAME).then(cache => {
return cache.addAll(urlsToCache);
})
);
});

self.addEventListener("fetch", event => {
event.respondWith(
caches.match(event.request).then(resp => {
return resp || fetch(event.request);
})
);
});
