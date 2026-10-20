// Build-time placeholders are filled by scripts/offline-plugin.js.
const CACHE_PREFIX = "mini-journal-shell:/mini-journal/:";
const CACHE_NAME = CACHE_PREFIX + "f2b9a159ba82fc9edaff";
const ASSETS = ["/mini-journal/assets/index-Bfqc2LW3.js","/mini-journal/assets/index-D1RB3IGT.css","/mini-journal/index.html"];
const BASE = "/mini-journal/";
const SHELL = `${BASE}index.html`;

self.addEventListener('install', (event) => {
  // Do not skipWaiting: existing tabs keep their complete current release.
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      await cache.addAll(ASSETS.map((url) => new Request(url, { cache: 'reload' })));
    } catch (error) {
      await caches.delete(CACHE_NAME);
      throw error;
    }
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const isShell = request.mode === 'navigate'
    && (url.pathname === BASE || url.pathname === SHELL);
  const asset = isShell ? SHELL : url.pathname;
  if (!isShell && !ASSETS.includes(asset)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(asset) ?? fetch(request);
  })());
});
