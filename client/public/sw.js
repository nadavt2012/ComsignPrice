const CACHE_NAME = 'comsign-calculator-v2';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// התקנת Service Worker מהירה
self.addEventListener('install', function(event) {
  self.skipWaiting(); // Force immediate activation
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

// שליפת קבצים מהמטמון עם Cache-First strategy למהירות מקסימלית
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return immediately
        if (response) {
          return response;
        }
        
        // Cache miss - fetch from network and cache
        return fetch(event.request).then(function(response) {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone response for caching
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      }
    )
  );
});

// עדכון מהיר של Service Worker
self.addEventListener('activate', function(event) {
  self.clients.claim(); // Take control immediately
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});