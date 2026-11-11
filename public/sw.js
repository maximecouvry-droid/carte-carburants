// Service worker : enveloppe de l'app en cache, données « réseau d'abord » avec repli sur la dernière copie.
// Tous les chemins sont relatifs à l'emplacement du fichier (/carte-carburants/).
const VERSION = 'v1';
const SHELL = `shell-${VERSION}`;
const DATA = `data-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const SCOPE = self.registration.scope;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((c) => c.addAll(['./', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png']))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL, DATA, ASSETS].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (!url.href.startsWith(SCOPE)) return; // tuiles de carte et autres domaines : jamais interceptés
  const path = url.href.slice(SCOPE.length);

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(new Request(SCOPE), SHELL));
  } else if (path.startsWith('data/')) {
    event.respondWith(networkFirst(request, DATA)); // stations.json, meta.json, villes.json
  } else if (path.startsWith('assets/')) {
    event.respondWith(cacheFirst(request, ASSETS)); // fichiers à empreinte, immuables
  } else {
    event.respondWith(networkFirst(request, SHELL));
  }
});
