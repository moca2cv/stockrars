// Times Tables service worker: lets the app open offline and launch like a native app.
// If you ever change a file other than index.html, bump VERSION so phones fetch fresh copies.
const VERSION = 'v1';
const CACHE = 'times-tables-' + VERSION;
const FILES = [
  './',
  './index.html',
  './manifest.json',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

// Clear out old versions of this app's files (and only this app's)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('times-tables-') && key !== CACHE)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

// The app itself: try the internet first so updates show up, use the saved copy when offline.
// Icons and the manifest: saved copy first.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetchWithin(req, 3000)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(cache => cache.put('./index.html', copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html').then(hit => hit || caches.match('./')))
    );
    return;
  }

  event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
});

function fetchWithin(req, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(req).then(res => {
      clearTimeout(timer);
      if (res.ok || res.type === 'opaqueredirect') resolve(res);
      else reject(new Error('status ' + res.status));
    }, err => {
      clearTimeout(timer);
      reject(err);
    });
  });
}
