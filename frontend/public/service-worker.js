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


// ✅ HANDLER PARA NOTIFICAÇÕES PUSH
self.addEventListener('push', (event) => {
  console.log('🔔 [SW] Push recebido:', event);

  if (!event.data) {
    console.log('❌ [SW] Sem dados na notificação');
    return;
  }

  try {
    const dados = JSON.parse(event.data.text());
    console.log('📨 [SW] Dados da notificação:', dados);

    const opcoes = {
      body: dados.body,
      icon: dados.icon || '/assets/icon-192.png',
      badge: dados.badge || '/assets/icon-192.png',
      tag: dados.tag || 'notificacao',
      requireInteraction: dados.requireInteraction || false,
    };

    event.waitUntil(
      self.registration.showNotification(dados.title, opcoes)
    );
  } catch (e) {
    console.error('❌ [SW] Erro ao processar push:', e);
  }
});

// ✅ HANDLER PARA CLIQUE NA NOTIFICAÇÃO
self.addEventListener('notificationclick', (event) => {
  console.log('👆 [SW] Notificação clicada:', event.notification.tag);
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // Se já tem aba aberta, foca nela
      for (let client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      // Senão, abre nova aba
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});