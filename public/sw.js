// Service Worker para Fettuccine PDV
const CACHE_NAME = 'fettuccine-pdv-v2'; // Incrementar versão para forçar limpeza
const urlsToCache = [
  '/',
  '/dashboard',
  '/dashboard/weighing',
  '/dashboard/cashier',
  '/dashboard/orders',
  '/dashboard/customers',
  '/dashboard/settings',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error('Service Worker: Erro ao cachear recursos:', error);
      })
  );
});

// Ativar Service Worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Limpar TODOS os caches antigos
          console.log('Service Worker: Removendo cache:', cacheName);
          return caches.delete(cacheName);
        })
      ).then(() => {
        // Limpar cache atual também e recriar
        return caches.delete(CACHE_NAME);
      });
    })
  );
  // Forçar controle imediato
  return self.clients.claim();
});

// Interceptar requisições
self.addEventListener('fetch', (event) => {
  // Ignorar requisições não-GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Estratégia: Cache First para recursos estáticos, Network First para API
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase')) {
    // Para APIs, tentar rede primeiro, depois cache
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Se a resposta é válida, cachear e retornar
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Se falhar, tentar cache
          return caches.match(event.request);
        })
    );
  } else {
    // Para recursos estáticos, cache primeiro
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }
          return fetch(event.request);
        })
    );
  }
});

// Notificações push (para futuras implementações)
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push recebido');
  
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação do Fettuccine PDV',
    icon: '/icon-192x192.png',
    badge: '/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Abrir Sistema',
        icon: '/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Fettuccine PDV', options)
  );
});

// Clique em notificação
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Clique em notificação');
  
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Sincronização em background (para futuras implementações)
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Sincronização em background');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Implementar lógica de sincronização offline
      console.log('Sincronizando dados offline...')
    );
  }
});

// Mensagens do cliente
self.addEventListener('message', (event) => {
  console.log('Service Worker: Mensagem recebida:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Comando para limpar todo o cache
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('Service Worker: Limpando todo o cache...');
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('Service Worker: Removendo cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('Service Worker: Cache limpo com sucesso!');
      event.ports[0].postMessage({ success: true });
    }).catch((error) => {
      console.error('Service Worker: Erro ao limpar cache:', error);
      event.ports[0].postMessage({ success: false, error: error.message });
    });
  }
});
