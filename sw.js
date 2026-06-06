const CACHE = 'polar-align-v1.0.2';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.add('./'))
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
  );
});

self.addEventListener('fetch', e => {
  // Ignorer les requêtes non-GET et les requêtes vers des APIs externes
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('ngdc.noaa.gov')) return;

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
          // Hors ligne et ressource non cachée → retourner la page principale
          return caches.match('./') || new Response('Hors ligne', {status: 503});
        });
    })
  );
});
