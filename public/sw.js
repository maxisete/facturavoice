const CACHE_NAME = 'facturavoice-v3'
const ASSETS_CACHE = 'facturavoice-assets-v3'

const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
]

// Instalación: precachear assets estáticos
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(ASSETS_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activación: borrar caches antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME && k !== ASSETS_CACHE)
            .map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url)

  // Ignorar extensiones de Chrome y no-GET
  if (event.request.method !== 'GET') return
  if (url.protocol === 'chrome-extension:') return

  // Network-first para APIs externas
  if (url.hostname.includes('supabase.co') ||
      url.hostname.includes('groq.com') ||
      url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/offline.html')
      )
    )
    return
  }

  // Cache-first para assets estáticos (JS, CSS, imágenes, fuentes)
  if (url.pathname.match(/\.(js|css|png|jpg|svg|woff2|ico)$/)) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached
        return fetch(event.request).then(response => {
          const clone = response.clone()
          caches.open(ASSETS_CACHE).then(cache => cache.put(event.request, clone))
          return response
        })
      })
    )
    return
  }

  // Network-first para el resto (HTML, rutas de la app)
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request) || caches.match('/offline.html')
    )
  )
})