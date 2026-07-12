const cacheName = 'notes2pics-v3'
const appShell = ['/', '/manifest.webmanifest', '/favicon.svg', '/pwa-icon.svg']

// Never cache or intercept auth/API/Supabase traffic — these carry tokens and
// must always hit the network (and OAuth redirects must not be served from cache).
function shouldBypass(url) {
  return (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.hostname.endsWith('.supabase.co') ||
    url.hostname.endsWith('.freemius.com')
    // Lemon Squeezy integration disabled — bypass no longer needed.
    // || url.hostname.endsWith('.lemonsqueezy.com')
  )
}

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

  const url = new URL(event.request.url)
  if (shouldBypass(url)) return // let the browser handle it normally

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone()
        caches.open(cacheName).then((cache) => cache.put(event.request, copy))
        return response
      })
      .catch(() => {
        if (url.pathname.startsWith('/api/')) return Response.error()
        return caches.match(event.request).then((cachedResponse) => cachedResponse || caches.match('/'))
      }),
  )
})
