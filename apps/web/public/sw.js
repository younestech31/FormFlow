const CACHE_NAME = 'formflow-shell-v2';
const SHELL_URLS = ['/', '/manifest.webmanifest', '/formflow.svg'];
const BUILD_MANIFEST_URL = '/formflow-manifest.json';

async function precacheBuildAssets(cache) {
  const manifestResponse = await fetch(BUILD_MANIFEST_URL, { cache: 'no-store' });
  if (!manifestResponse.ok) return;

  const manifest = await manifestResponse.json();
  const assets = new Set([BUILD_MANIFEST_URL]);
  for (const entry of Object.values(manifest)) {
    if (entry.file) assets.add('/' + entry.file);
    for (const asset of [...(entry.css ?? []), ...(entry.assets ?? [])]) {
      assets.add('/' + asset);
    }
  }

  // Best-effort per-asset caching keeps one missing optional asset from
  // preventing the offline shell from installing.
  await Promise.allSettled([...assets].map(async (url) => {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok && response.type === 'basic') {
        await cache.put(url, response);
      }
    } catch {
      // The network-first shell remains usable even if an optional asset fails.
    }
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(SHELL_URLS);
    try {
      await precacheBuildAssets(cache);
    } catch {
      // Retain the basic shell cache when the build manifest is unavailable.
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
  )));
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.toLowerCase().endsWith('.pdf')) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && response.type === 'basic') {
          const cache = await caches.open(CACHE_NAME);
          await cache.put('/', response.clone());
        }
        return response;
      } catch {
        return (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      return Response.error();
    }
  })());
});
