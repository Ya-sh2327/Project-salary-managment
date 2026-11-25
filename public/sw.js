const APP_BASE = new URL('./', self.location.href).pathname
const ASSET_PREFIX = `${APP_BASE.replace(/\/$/, '')}/assets/`
const CACHE_NAME = 'mymoney-shell-v2'
const APP_SHELL = [APP_BASE, `${APP_BASE}manifest.webmanifest`, `${APP_BASE}mymoney-icon.svg`]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith('mymoney-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(APP_BASE, copy))
          return response
        })
        .catch(() => caches.match(APP_BASE))
    )
    return
  }

  if (url.pathname.startsWith(ASSET_PREFIX)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        return response
      }))
    )
  }
})
