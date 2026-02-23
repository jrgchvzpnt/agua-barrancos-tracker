const CACHE_NAME = 'agua-barrancos-v2'; // Incrementa la versión al actualizar
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './main.js',
  './firebase-init.js',
  './favicon.ico'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Estrategia: Stale-While-Revalidate
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        // Actualizamos el caché con la nueva respuesta de red
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {}); // Fallback silencioso si no hay red

      return cachedResponse || fetchPromise;
    })
  );
});

// Limpieza de caches antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
});