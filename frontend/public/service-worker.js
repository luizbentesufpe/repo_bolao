// Service Worker para sincronização em background
const CACHE_NAME = 'bolao-v1';
const API_URL = 'https://repo-bolao.onrender.com';
const SYNC_TAG = 'sync-jogos';

// Evento de instalação
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Instalado');
  self.skipWaiting();
});

// Evento de ativação
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Ativado');
  event.waitUntil(clients.claim());
});

// Background Sync - sincroniza a cada 5 minutos
self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    console.log('[Service Worker] Sincronizando jogos...');
    event.waitUntil(sincronizarJogos());
  }
});

// Sincroniza jogos
async function sincronizarJogos() {
  try {
    // Pega token do localStorage
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const response = await fetch(`${API_URL}/api/jogos?periodo=todos`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const jogos = await response.json();
      
      // Armazena no IndexedDB
      const db = await openDB();
      const tx = db.transaction('jogos', 'readwrite');
      tx.objectStore('jogos').clear();
      jogos.forEach(jogo => {
        tx.objectStore('jogos').add(jogo);
      });
      
      console.log(`[Service Worker] ✅ ${jogos.length} jogos sincronizados`);
      
      // Notifica tabs abertas
      const clients_list = await clients.matchAll();
      clients_list.forEach(client => {
        client.postMessage({
          type: 'JOGOS_UPDATED',
          dados: jogos
        });
      });
    }
  } catch (error) {
    console.error('[Service Worker] Erro ao sincronizar:', error);
  }
}

// IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('bolao-db', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('jogos')) {
        db.createObjectStore('jogos', { keyPath: 'id' });
      }
    };
  });
}

// Sincroniza a cada 5 minutos
setInterval(() => {
  console.log(`[Service Worker] Agendando sincronização...`);
  self.registration.sync.register(SYNC_TAG).catch(err => {
    console.log('[Service Worker] Sync não suportado, sincronizando direto...');
    sincronizarJogos();
  });
}, 300000); // 5 minutos

// Intercept fetch para servir do cache/IndexedDB
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/jogos')) {
    event.respondWith(
      fetch(event.request)
        .then(response => response)
        .catch(() => {
          // Se offline, tenta servir do IndexedDB
          return getJogosFromDB().then(jogos => {
            return new Response(JSON.stringify(jogos), {
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
  }
});

// Pega jogos do IndexedDB
function getJogosFromDB() {
  return new Promise(async (resolve) => {
    try {
      const db = await openDB();
      const tx = db.transaction('jogos', 'readonly');
      const request = tx.objectStore('jogos').getAll();
      request.onsuccess = () => resolve(request.result);
    } catch {
      resolve([]);
    }
  });
}