// Minimal service worker — makes the game installable and gives the app shell
// an offline fallback. It never touches the Colyseus server (different origin),
// so live multiplayer traffic is untouched.
const CACHE = 'cardbattle-v128';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // leave the game server alone

  // Never cache API calls — they carry live account state (gold, profile, wins). Serving a
  // stale /api/me from cache froze the lobby's gold so post-match rewards looked like they
  // never arrived. Let these hit the network untouched.
  if (url.pathname.startsWith('/api/')) return;

  // App navigation: always pull a FRESH index.html, bypassing the browser's HTTP cache
  // (cache: 'reload'). A plain fetch let a stale index.html — pinned by the browser/CDN cache —
  // keep pointing at old JS bundles, so shipped UI changes never appeared until a manual clear.
  // Refresh the offline copy on success; fall back to the cached shell only when truly offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'reload' })
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html')),
    );
    return;
  }

  // Static assets (hashed JS/CSS/icons): serve from cache, then fill the cache.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        }),
    ),
  );
});
