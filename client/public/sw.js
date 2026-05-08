// Service Worker — POS Paolita's Market v2
// Estrategia:
//   API (/api/*)   → solo red, nunca cache
//   Navegación     → red primero, fallback a cache (shell HTML)
//   Assets JS/CSS  → red primero, fallback a cache (offline)
//
// Bumpear CACHE_VERSION borra TODO el cache del cliente al activar.

const CACHE_VERSION = 'pos-v3-2026-05-08';
const SHELL_URL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.add(SHELL_URL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. API: nunca interceptar
  if (url.pathname.startsWith('/api/')) return;

  // 2. Solo GET
  if (request.method !== 'GET') return;

  // 3. Solo mismo origen
  if (url.origin !== self.location.origin) return;

  // 4. Navegación (HTML) — red primero, cache como fallback offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(SHELL_URL, clone));
          return res;
        })
        .catch(() => caches.match(SHELL_URL))
    );
    return;
  }

  // 5. Assets estáticos (JS, CSS, fuentes, imágenes) — red primero
  //    Si falla la red, devolvemos cache (modo offline). En online, siempre
  //    el archivo más reciente. Los chunks de Vite tienen hash en el nombre,
  //    así que esto no rompe nada.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, clone));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});
