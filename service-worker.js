'use strict';

const CACHE_NAME = 'pesquisa-cclasstrib-shell-v1';
const SCOPE_URL = new URL(self.registration.scope);
const APP_URL = new URL('./', SCOPE_URL).href;
const FALLBACK_URL = new URL('pesquisa-cclasstrib-ncm.html', SCOPE_URL).href;
const SHELL_URLS = [APP_URL, new URL('manifest.json', SCOPE_URL).href];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('pesquisa-cclasstrib-shell-') && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin || request.method !== 'GET') return;

  // Consultas tributarias nunca sao gravadas em cache; exigem conexao com o servidor e a SVRS.
  if (url.pathname.endsWith('/api/search')) {
    event.respondWith(fetch(request).catch(() => new Response(
      JSON.stringify({ error: 'Sem conexao. A pesquisa precisa do servidor local e de acesso a SVRS.' }),
      { status: 503, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } }
    )));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch (_) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match(request))
          || (await cache.match(APP_URL))
          || (await cache.match(FALLBACK_URL))
          || new Response('A aplicacao ainda nao foi armazenada para uso offline.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
      return response;
    } catch (_) {
      return new Response('', { status: 503, statusText: 'Offline' });
    }
  })());
});
