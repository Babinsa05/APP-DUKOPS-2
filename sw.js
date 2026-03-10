/* ===============================
   DUKOPS PREMIUM - SERVICE WORKER
   KORAMIL 1609-05/SUKASADA
   ============================== */

const CACHE_NAME = 'dukops-premium-v3';
const APP_SHELL = [
  '/',
  '/?source=pwa',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// ==================== INSTALL EVENT ====================
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(APP_SHELL);
      })
      .then(() => {
        console.log('[Service Worker] Skip waiting on install');
        return self.skipWaiting();
      })
  );
});

// ==================== ACTIVATE EVENT ====================
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
    .then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// ==================== FETCH EVENT ====================
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('cdnjs.cloudflare.com') &&
      !event.request.url.includes('fonts.googleapis.com')) {
    return;
  }

  // Network-first strategy for API calls
  if (event.request.url.includes('/macros/s/') || 
      event.request.url.includes('api.telegram.org') ||
      event.request.url.includes('raw.githubusercontent.com')) {
    
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          return caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, response.clone());
              return response;
            });
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        
        return fetch(event.request)
          .then((response) => {
            return caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, response.clone());
                return response;
              });
          })
          .catch((error) => {
            console.error('[Service Worker] Fetch failed:', error);
            
            // Return offline page for HTML requests
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// ==================== SYNC EVENT ====================
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// ==================== PUSH EVENT ====================
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received');
  
  const options = {
    body: event.data.text(),
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      { action: 'open', title: 'Buka Aplikasi' },
      { action: 'close', title: 'Tutup' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('DUKOPS PREMIUM', options)
  );
});

// ==================== NOTIFICATION CLICK EVENT ====================
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click', event.action);
  
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// ==================== SYNC DATA FUNCTION ====================
async function syncData() {
  console.log('[Service Worker] Syncing data...');
  
  // Get all pending data from IndexedDB
  const cache = await caches.open('pending-uploads');
  const requests = await cache.keys();
  
  for (const request of requests) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        await cache.delete(request);
        console.log('[Service Worker] Synced:', request.url);
      }
    } catch (error) {
      console.error('[Service Worker] Sync failed:', error);
    }
  }
}

// ==================== MESSAGE EVENT ====================
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
