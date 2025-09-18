const CACHE_NAME = 'comsign-calculator-v3-' + new Date().getTime();
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

// שליפת קבצים מהרשת תמיד - Network-First למניעת cache ישן
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // For API calls, always use network (no caching)
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For main app files, prioritize network over cache
  event.respondWith(
    fetch(event.request).then(function(response) {
      // Network success - cache and return fresh content
      if (response && response.status === 200) {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        return response;
      }
      // Network failed - fallback to cache if available
      return caches.match(event.request);
    }).catch(function() {
      // Network completely failed - try cache as last resort
      return caches.match(event.request);
    })
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