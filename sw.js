const CACHE = 'okonomi-v15';
const OCR_CACHE = 'okonomi-ocr-v1'; // tekstgenkendelse (~10 MB) hentes først ved første scanning og gemmes separat
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './skole.js', './kurser.js', './lock.js', './sync.js', './elpriser.js', './vaerktoejer.js', './bon.js', './vendor/chart.umd.min.js', './vendor/xlsx.mini.min.js',
  './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE && k !== OCR_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  // Stale-while-revalidate: hurtigt fra cache, opdater i baggrunden
  if (url.pathname.includes('/vendor/ocr/')) { e.respondWith(caches.open(OCR_CACHE).then(async c => (await c.match(e.request, { ignoreSearch: true })) || fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; }))); return; }
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(e.request, { ignoreSearch: true });
    const network = fetch(e.request).then(res => {
      if (res && res.ok && !url.search) cache.put(e.request, res.clone());
      return res;
    }).catch(() => cached || cache.match('./index.html'));
    return cached || network;
  }));
});
