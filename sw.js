const CACHE_NAME = 'canchero-v421';
const RUNTIME_CACHE = 'canchero-runtime'; // persistente entre deploys (media/JS/CSS cacheados)
const assets = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './canchero-plus.js',
  './canchero-features.js',
  './data.js',
  './canchero-notifications.js',
  './canchero-messaging.js',
  './canchero-live.js',
  './canchero-mundial.js',
  './canchero-encuesta.js',
  './canchero-match-v2.js',
  './canchero-match-pitch.js',
  './canchero-formations.js',
  './canchero-ui-v2.js',
  './canchero-geo.js',
  './canchero-live-v2.js',
  './canchero-debates.js',
  './canchero-hinchada.js',
  './canchero-rating.js',
  './canchero-racha.js',
  './canchero-games-core.js',
  './canchero-games.js',
  './canchero-once-ideal.js',
  './canchero-adivina.js',
  './canchero-impostor.js',
  './canchero-higher-lower.js',
  './canchero-trivia.js',
  './canchero-carrera.js',
  './canchero-momentos.js',
  './canchero-momentos-editor.js',
  './canchero-match-feed.js',
  './canchero-fixes-v3.js',
  './canchero-pred-v2.js'
];

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(assets))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    // Borrar shells viejos PERO preservar la caché persistente de media (evita re-descargar
    // imágenes en cada deploy → mantiene bajo el egress de Supabase).
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE_NAME && k !== RUNTIME_CACHE).map(k => caches.delete(k)));
    // Purga de video ya cacheado por versiones viejas del SW (esos entries rompían la
    // reproducción en iOS → reels en negro). Se borran para que el video vaya siempre a red.
    try {
      const rc = await caches.open(RUNTIME_CACHE);
      const reqs = await rc.keys();
      await Promise.all(reqs.filter(r => /\.(mp4|webm|mov|m4v|m3u8)(\?|$)/i.test(new URL(r.url).pathname)).map(r => rc.delete(r)));
      // El JS/CSS PROPIO también se purga en cada deploy. RUNTIME_CACHE sobrevive entre
      // versiones a propósito (para no re-bajar imágenes), pero eso dejaba congelada para
      // siempre cualquier copia vieja o a medio bajar de un script del sitio: el celular
      // quedaba con una mezcla de código nuevo y viejo imposible de recuperar.
      // Las imágenes y el storage NO se tocan, así que el ahorro de datos se mantiene.
      const propios = (await rc.keys()).filter(r => {
        try {
          const u = new URL(r.url);
          return u.origin === self.location.origin && /\.(js|css)(\?|$)/i.test(u.pathname);
        } catch(e) { return false; }
      });
      await Promise.all(propios.map(r => rc.delete(r)));
    } catch(e){}
    await self.clients.claim();
    // NOTA: ya NO forzamos c.navigate() de todas las ventanas. Ese reload en caliente
    // provocaba parpadeos/pantalla negra en el PWA al activarse un SW nuevo. Como el
    // HTML es network-first (siempre baja el index fresco) y los assets van con ?v=,
    // la próxima apertura ya toma el código nuevo; y la red de seguridad de index.html
    // recupera cualquier arranque en negro.
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;

  // ⚠️ VIDEO: NO interceptar NUNCA. iOS/Safari reproduce video con Range requests
  // (bytes=...). Si el Service Worker responde (aunque sea con un fetch limpio, y peor
  // aún desde caché), WebKit rompe el streaming y el reel queda EN NEGRO. La única forma
  // confiable es NO llamar a respondWith → el navegador va directo a la red con Range OK.
  // (En Android/Chrome funcionaba igual cacheado; en iPhone no, por eso se veían negros.)
  if (event.request.headers.has('range')) return;
  const isVideoReq = event.request.destination === 'video' ||
                     /\.(mp4|webm|mov|m4v|m3u8)(\?|$)/i.test(url.pathname);
  if (isVideoReq) return;

  // 1) HTML / raíz: network-first SIN store, para detectar nuevas versiones (build).
  const isHtml = sameOrigin && (url.pathname.endsWith('.html') || url.pathname === '/');
  if (isHtml) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() =>
        caches.match(event.request).then(r => r || Response.error()))
    );
    return;
  }

  // 2) Resto (JS/CSS versionados con ?v=, imágenes, fuentes, Supabase Storage, etc.):
  //    CACHE-FIRST. Los assets de la app llevan ?v=BUILD (se invalidan al deployar) y
  //    las URLs de media son únicas por archivo, así que cachear es seguro y evita
  //    re-descargar todo en cada vista (clave para el egress de Supabase y la velocidad).
  const isMedia = /\.(png|jpe?g|webp|gif|svg|mp4|webm|mov|m4v|woff2?|ttf|otf|ico)(\?|$)/i.test(url.pathname) ||
                  /supabase\.co\/storage/i.test(url.href);
  const isVersionedAsset = sameOrigin && /\.(js|css)(\?|$)/i.test(url.pathname);
  if (isMedia || isVersionedAsset) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(resp => {
          // Cachear solo respuestas válidas (status 200, no opaque-error)
          if (resp && (resp.status === 200 || resp.type === 'opaque')) {
            const copy = resp.clone();
            caches.open(RUNTIME_CACHE).then(c => { try { c.put(event.request, copy); } catch(e){} });
          }
          return resp;
        }).catch(() => caches.match(event.request).then(r => r || Response.error()));
      })
    );
    return;
  }

  // 3) Cualquier otra cosa (APIs, realtime, etc.): red directa, fallback a cache offline.
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then(r => r || Response.error()))
  );
});

// ── Push Notifications ────────────────────────────────────────────────────────
// Se activa cuando Supabase Edge Function envía un push al browser

self.addEventListener('push', event => {
  let data = { title: 'Canchero', body: 'Nueva notificación', icon: '/logo-oficial.png', url: '/' };
  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch(e) {
    if (event.data) data.body = event.data.text();
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo-oficial.png',
    badge: '/logo-oficial.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || 'https://cancherofutbolapp.vercel.app', notif: data.notif || null },
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Cerrar' }
    ],
    requireInteraction: false,
    tag: 'canchero-notif', // Agrupa notificaciones del mismo tipo
    renotify: true
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// ── Click en notificación push ────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'close') return;

  const d = event.notification.data || {};
  const notif = d.notif || null;
  // Si hay datos de la notificación, viajar con ellos en la URL (app cerrada)
  const url = notif
    ? (d.url || 'https://cancherofutbolapp.vercel.app/') + '?notif=' + encodeURIComponent(JSON.stringify(notif))
    : (d.url || 'https://cancherofutbolapp.vercel.app/');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      // Si hay una ventana abierta con la app, enfocarla y mandarle el deep-link
      for (const client of clientList) {
        if (client.url.includes('cancherofutbolapp.vercel.app') && 'focus' in client) {
          client.postMessage({ type: 'OPEN_NOTIF', notif: notif || d });
          return client.focus();
        }
      }
      // Si no hay ventana abierta, abrir una nueva con el deep-link
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
