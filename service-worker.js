// Version control - INCREMENT THIS WHEN YOU MAKE CHANGES
// Each time you update index.html, increment this number
// Service worker will auto-detect and reload
const CACHE_VERSION = 4;
const CACHE_NAME = `ortho-library-v${CACHE_VERSION}`;
const urlsToCache = [
  '/Ortho-Library/',
  '/Ortho-Library/index.html',
  '/Ortho-Library/manifest.json'
];

// Install Service Worker
self.addEventListener('install', event => {
  console.log(`[SW] Installing version ${CACHE_VERSION}`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache opened');
        return cache.addAll(urlsToCache).catch(err => {
          console.log('[SW] Some resources failed to cache');
        });
      })
  );
  // Skip waiting - immediately activate new version
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', event => {
  console.log(`[SW] Activating version ${CACHE_VERSION}`);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Delete old cache versions
          if (cacheName !== CACHE_NAME) {
            console.log(`[SW] Deleting old cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
  
  // Notify all clients of update
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'CACHE_UPDATED',
        version: CACHE_VERSION
      });
    });
  });
});

// Fetch Event - Network first, fallback to cache
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Cache successful responses
        caches.open(CACHE_NAME)
          .then(cache => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // Network request failed, try cache
        return caches.match(event.request)
          .then(response => {
            return response || new Response(
              'Offline: Resource not available',
              {
                status: 503,
                statusText: 'Service Unavailable',
                headers: new Headers({
                  'Content-Type': 'text/plain'
                })
              }
            );
          });
      })
  );
});

// Background Sync (future enhancement)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Sync logic here if needed
      Promise.resolve()
    );
  }
});

// Message handling for updates
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
