const CACHE = 'deepcode-v1'
const STATIC = [
  '/',
  '/index.html',
]

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ))
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  // Don't cache API calls
  if (e.request.url.includes('/api/')) return
  // Network first for HTML (to get fresh app), cache fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    )
    return
  }
  // Cache first for assets
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(res => {
        if (res.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
    })
  )
})
