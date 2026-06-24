// Ağıllı İmtahan Sistemi — Service Worker (offline shell + asset precache)
const CACHE = 'smart-exam-v3';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/favicon.svg'];

// Quraşdırmada index.html-i oxu, içindəki JS/CSS/şrift fayllarını ƏVVƏLCƏDƏN keşlə
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(APP_SHELL).catch(() => {});
      try {
        const res = await fetch('/index.html', { cache: 'no-cache' });
        const html = await res.text();
        const urls = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|woff2|svg|png|ico))"/g)]
          .map((m) => m[1])
          .filter((u) => u.startsWith('/')); // yalnız öz domenimiz
        await Promise.all(urls.map((u) => cache.add(u).catch(() => {})));
        await cache.put('/index.html', new Response(html, { headers: { 'Content-Type': 'text/html' } }));
      } catch {}
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // API sorğuları keşlənmir (offline-ı tətbiq özü idarə edir)
  if (url.pathname.startsWith('/api/')) return;

  // Səhifə açılışı: şəbəkə → uğursuz olsa keşlənmiş index.html (SPA offline)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('/index.html').then((r) => r || caches.match('/')))
    );
    return;
  }

  // Statik fayllar: əvvəlcə keş, sonra şəbəkə (və keşə yaz)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((resp) => {
          if (resp && (resp.status === 200 || resp.type === 'opaque')) {
            const copy = resp.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return resp;
        })
        .catch(() => cached);
    })
  );
});
