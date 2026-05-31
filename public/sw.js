const cacheName = 'notes2pics-v1'
const appShell = ['/', '/manifest.webmanifest', '/favicon.svg', '/pwa-icon.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(cacheName).then((cache) => cache.addAll(appShell)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== cacheName)
          .map((name) => caches.delete(name)),
      ),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone()
        caches.open(cacheName).then((cache) => cache.put(event.request, copy))
        return response
      })
      .catch(() =>
        caches.match(event.request).then((cachedResponse) => cachedResponse || caches.match('/')),
      ),
  )
})
