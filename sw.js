/* Service worker: bump VERSION on every change. Network-first for everything (fresh data), cache as offline fallback. */
var VERSION = 'v22-2026-10-25c';
var CORE = ['./', 'index.html', 'css/style.css', 'js/app.js', 'data/platforms.json', 'data/analysis.json', 'data/polls.json', 'data/podcasts.json', 'data/coalition.json', 'icon.svg', 'manifest.webmanifest', 'fonts/heebo-hebrew.woff2', 'fonts/heebo-latin.woff2', 'clip/', 'clip/index.html', 'clip/clip.css', 'clip/engine.js', 'clip/scenes.js', 'clip/audio.js', 'clip/clip-data.js', 'clip/fonts/heebo-hebrew.woff2', 'clip/fonts/heebo-latin.woff2', 'clip-site/', 'clip-site/index.html', 'clip-site/scenes.js', 'clip-site/site-data.js'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) { e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); })); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) { var cp = r.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, cp); }); return r; })
    .catch(function () { return caches.match(e.request, { ignoreSearch: true }).then(function (m) { return m || caches.match('index.html'); }); }));
});
