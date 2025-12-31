// Neon Slingshot Service Worker
const CACHE_NAME = 'neon-slingshot-v1';
const ASSETS_TO_CACHE = [
  '/HandTrackingSlingShot/',
  '/HandTrackingSlingShot/index.html',
  '/HandTrackingSlingShot/manifest.json',
  '/HandTrackingSlingShot/css/style.css',
  '/HandTrackingSlingShot/js/audio.js',
  '/HandTrackingSlingShot/js/handTracking.js',
  '/HandTrackingSlingShot/js/physics.js',
  '/HandTrackingSlingShot/js/levels.js',
  '/HandTrackingSlingShot/js/renderer.js',
  '/HandTrackingSlingShot/js/slingshot.js',
  '/HandTrackingSlingShot/js/ui.js',
  '/HandTrackingSlingShot/js/main.js',
  '/HandTrackingSlingShot/icons/icon-192.png',
  '/HandTrackingSlingShot/icons/icon-512.png'
];

// External resources to cache (CDN scripts)
const EXTERNAL_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@400;500;700&display=swap',
  'https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js',
  'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js',
  'https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app assets');
        // Cache local assets
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] Assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Cache failed:', error);
      })
  );
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[SW] Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/HandTrackingSlingShot/index.html'))
    );
    return;
  }

  // For other requests: try cache first, then network
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        // Not in cache, fetch from network
        return fetch(request)
          .then((networkResponse) => {
            // Cache successful responses for future use
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.error('[SW] Fetch failed:', error);
            // For images, return a placeholder if offline
            if (request.destination === 'image') {
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#0a0a0f" width="100" height="100"/><text fill="#00f5ff" x="50" y="50" text-anchor="middle">⚡</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }
          });
      })
  );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

