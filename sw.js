const CACHE = 'polar-align-v1.0.10';
const ASSETS = ['./', './manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      .then(() => {
        self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // Requêtes externes (API NOAA, icône) → laisser passer directement sans cache
  if (!e.request.url.startsWith(self.location.origin)) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Requêtes locales → stratégie cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request)
        .then(resp => {
          if (resp && resp.status === 200 && resp.type === 'basic') {
            caches.open(CACHE).then(c => c.put(e.request, resp.clone()));
          }
          return resp;
        })
        .catch(() => {
          return caches.match('./') || new Response('Hors ligne', {status: 503});
        });
    })
  );
});
