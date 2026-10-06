// Service worker : permet d'installer l'appli et de l'ouvrir même sans réseau.
// Il ne s'occupe QUE des fichiers de l'app (même origine) : les appels à chess.com
// et lichess passent sans jamais être interceptés ni mis en cache ici
// (les parties sont déjà gardées dans IndexedDB par l'app).

const CACHE = 'l-architecte-v1'
const CORE = ['./', './manifest.webmanifest', './favicon.svg', './icons/icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  // Supprime les caches des anciennes versions du service worker.
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    // Page : réseau d'abord (pour avoir la dernière version), cache si hors ligne.
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          void caches.open(CACHE).then((cache) => cache.put('./', copy))
          return res
        })
        .catch(() => caches.match('./')),
    )
    return
  }

  // Fichiers (JS, CSS, moteur, icônes) : leurs noms changent à chaque version,
  // donc le cache d'abord est sûr et rapide.
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone()
            void caches.open(CACHE).then((cache) => cache.put(request, copy))
          }
          return res
        }),
    ),
  )
})
