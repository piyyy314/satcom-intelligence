
const CACHE_NAME = 'satexpert-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/index.tsx',
  // NOTE: You would add other assets like CSS, images, etc. here
  // For this app, most assets are remote via CDN.
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
