
// DoWeo PWA: cache public app assets only. Never cache API/auth/user data.
const CACHE = 'squareup-public-assets-v1';
const ASSETS = [
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key =>
            key.startsWith('squareup-public-assets-') &&
            key !== CACHE
          )
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (
    event.request.method !== 'GET' ||
    url.origin !== self.location.origin ||
    !ASSETS.includes(url.pathname)
  ) return;

  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});

// Receive push notifications.
self.addEventListener('push', event => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(
      payload.title || 'DoWeo',
      {
        body: payload.body || 'You have new activity.',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        data: {
          url: payload.url || '/'
        }
      }
    )
  );
});

// Open DoWeo when a notification is tapped.
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const target = new URL(
    event.notification.data?.url || '/',
    self.location.origin
  );

  if (target.origin !== self.location.origin) {
    target.pathname = '/';
    target.search = '';
    target.hash = '';
  }

  event.waitUntil(
    clients.openWindow(target.href)
  );
});
