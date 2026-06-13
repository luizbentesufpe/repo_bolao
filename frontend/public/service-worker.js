const CACHE_NAME = 'bolao-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  const isStaticAsset =
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico');

  if (!isStaticAsset) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) {
        return cached;
      }

      try {
        const response = await fetch(event.request);

        if (
          response &&
          response.status === 200 &&
          response.type === 'basic'
        ) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, response.clone());
        }

        return response;
      } catch (err) {
        console.error('[SW] Fetch error', err);
        throw err;
      }
    })
  );
});