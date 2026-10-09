/* R.OS service worker · keeps the RP running with no signal.
   - the page itself: network first, so a push shows up on the next open; the stored copy when offline
   - everything else from this site (scripts, styles, key art, reference ROM): stored copy first
   - Google Fonts: stored after the first load
   - map tiles and place search: never touched here (they need the network anyway)
   Bump VERSION with every release; activating a new version clears the old store. */
const VERSION = '2.19.0';
const CACHE = 'ros-' + VERSION;
const CORE = [
  './', 'index.html', 'rx.css?v=' + VERSION,
  ...['font', 'matrix', 'geo', 'store', 'map', 'parcel', 'traffic', 'area', 'ui', 'screens', 'profile', 'rolo', 'wx', 'main'].map(n => 'js/' + n + '.js?v=' + VERSION),
  'ref/firstaid.json?v=1', 'ref/knots.json?v=1', 'ref/convert.json?v=1', 'ref/cipher.json?v=1', 'data/tx-acs.json?v=2024b', 'data/tx-crime.json?v=2025', 'data/us-major.json?v=2024', 'data/us-states.json?v=1',
  'icons/ros-icon-180.png', 'icons/ros-icon-192.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('ros-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  const font = FONT_HOSTS.includes(url.hostname);
  if (!same && !font) return;                       // tiles, search: straight to the network

  if (req.mode === 'navigate') {                    // the page: fresh when online
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); return res;
    }).catch(() => caches.match('index.html').then(r => r || caches.match('./'))));
    return;
  }

  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
