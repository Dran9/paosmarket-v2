// Service Worker — POS Paolita's Market v2
// Estrategia:
//   API (/api/*)  → solo red, nunca cache
//   Navegación    → red primero, fallback a cache (shell HTML)
//   Assets JS/CSS → cache primero, actualiza en segundo plano
//
// El CACHE_VERSION debe incrementarse cuando se quiera forzar un hard-refresh
// en todos los clientes (p.ej. después de un cambio crítico de UI).

const CACHE_VERSION = 'pos-v2';
const SHELL_URL = '/';

// ─── Instalación ──────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.add(SHELL_URL))
  );
  // Activar de inmediato sin esperar a que se cierre la pestaña anterior
  self.skipWaiting();
});

// ─── Activación ───────────────────────────────────────────────────────────────
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
  // Tomar control de las pestañas abiertas sin recargar
  self.clients.claim();
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Peticiones API: solo red, nunca interceptar
  if (url.pathname.startsWith('/api/')) return;

  // 2. Solo manejar GET (POST/PUT/DELETE van directo a red)
  if (request.method !== 'GET') return;

  // 3. Solo mismo origen
  if (url.origin !== self.location.origin) return;

  // 4. Navegación (HTML) — red primero, cache como fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Guardar copia fresca del shell en cache
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(SHELL_URL, clone));
          return res;
        })
        .catch(() =>
          // Sin red: devolver la versión cacheada del shell
          caches.match(SHELL_URL)
        )
    );
    return;
  }

  // 5. Assets estáticos (JS, CSS, fuentes, imágenes) — cache primero
  //    Si no está en cache, fetcha y guarda para la próxima vez.
  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request).then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, clone));
        }
        return res;
      });
      // Devolver inmediatamente si hay cache; la red actualiza en segundo plano
      return cached || networkFetch;
    })
  );
});
