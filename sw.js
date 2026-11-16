
// DoWeo PWA: cache public app assets only. Never cache API/auth/user data.
const CACHE = 'doweo-public-assets-v3';
const ASSETS = [
  '/manifest.webmanifest',
  '/images/logo.png',
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
            (key.startsWith('squareup-public-assets-') || key.startsWith('doweo-public-assets-')) &&
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
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const copy = response.clone();
          event.waitUntil(caches.open(CACHE).then(cache => cache.put(event.request, copy)));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Keep push destinations on this app. Reject external and protocol-relative URLs.
function safeNotificationUrl(input) {
  try {
    if (typeof input !== 'string' || !input.startsWith('/') || input.startsWith('//')) return self.location.origin + '/';
    const url = new URL(input, self.location.origin);
    if (url.origin !== self.location.origin) return self.location.origin + '/';
    return url.href;
  } catch (_) {
    return self.location.origin + '/';
  }
}

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
          url: safeNotificationUrl(payload.url || '/')
        }
      }
    )
  );
});

// Open DoWeo when a notification is tapped.
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const target = safeNotificationUrl(event.notification.data?.url || '/');

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    const matching = windows.find(client => {
      try {
        const existing = new URL(client.url);
        return existing.origin === self.location.origin && existing.pathname === new URL(target).pathname;
      } catch (_) { return false; }
    });
    if (matching) {
      if (typeof matching.navigate === 'function' && matching.url !== target) {
        const navigated = await matching.navigate(target);
        if (navigated && typeof navigated.focus === 'function') return navigated.focus();
      }
      return matching.focus();
    }
    return clients.openWindow(target);
  })());
});
