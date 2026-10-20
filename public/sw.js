/* Offline cache: precache the app shell, then serve cache-first. Bump VERSION on every release. */
const VERSION = 'snap-v5';
const SHELL = [
  './',
  './css/style.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './js/controller/flow.js',
  './js/controller/input.js',
  './js/controller/loop.js',
  './js/core/constants.js',
  './js/core/dom.js',
  './js/core/rng.js',
  './js/main.js',
  './js/pwa.js',
  './js/splash.js',
  './js/model/badges.js',
  './js/model/campaign.js',
  './js/model/gift.js',
  './js/model/leaderboard.js',
  './js/model/shop.js',
  './js/model/progression.js',
  './js/model/state.js',
  './js/model/store.js',
  './js/model/twists.js',
  './js/systems/band.js',
  './js/systems/boss.js',
  './js/systems/generator.js',
  './js/systems/slicing.js',
  './js/systems/stageRules.js',
  './js/view/audio.js',
  './js/view/fx.js',
  './js/view/render.js',
  './js/view/shareCard.js',
  './js/view/ui/board.js',
  './js/view/ui/challenge.js',
  './js/view/ui/shop.js',
  './js/view/ui/gift.js',
  './js/view/ui/hub.js',
  './js/view/ui/menu.js',
  './js/view/ui/result.js',
  './js/view/ui/stages.js',
  './js/view/ui/trophies.js',
  './js/view/ui/stars.js',
  './manifest.webmanifest'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => {
    // Notify clients about update
    return self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'SW_UPDATED', version: VERSION });
      });
    });
  }).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = /fonts\.(googleapis|gstatic)\.com$/.test(url.host);
  if (url.origin !== location.origin && !font) return;
  if (url.pathname.startsWith('/api/')) return; // leaderboard must always hit the network
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { 
      // Only cache successful 200 responses with valid content types
      if (res && res.status === 200 && res.type === 'basic') {
        const contentType = res.headers.get('content-type');
        // Whitelist cacheable content types
        const cacheableTypes = ['text/html', 'text/css', 'text/javascript', 'application/javascript', 'application/json', 'image/', 'font/', 'application/manifest'];
        const shouldCache = contentType && cacheableTypes.some(type => contentType.includes(type));
        
        if (shouldCache) {
          cache.put(req, res.clone());
        }
      }
      return res; 
    }).catch(() => null);
    if (hit) { net.catch(() => {}); return hit; }
    const res = await net;
    if (res) return res;
    if (req.mode === 'navigate') { const shell = await cache.match('./'); if (shell) return shell; }
    return new Response('Offline', { status: 503, statusText: 'Offline' });
  }));
});
