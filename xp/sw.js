/* XP-1000 service worker · keeps the console running with a weak or no signal.
   - the page: network first, stored copy when offline
   - XP's own files (styles, scripts, key art): stored copy first (versioned)
   - the RP modules it borrows (../v2/js): network first with a short wait, so XP
     stays in step with the RP; the stored copy when the signal is gone
   - the RP's data and reference files (../v2/data, ../v2/ref): stored copy first
   - map tiles, lookups, search: never touched (they need the network anyway)
   Cache names start with 'xp-' because the RP's worker clears every 'ros-' cache.
   Bump VERSION with every release. */
const VERSION = '1.0.0';
const CACHE = 'xp-' + VERSION;
const V2 = '2.13.0';
const CORE = [
  './', 'index.html', 'manifest.webmanifest', 'xp.css?v=' + VERSION, 'js/xpgfx.js?v=' + VERSION, 'js/xp.js?v=' + VERSION,
  'icons/xp-icon-180.png', 'icons/xp-icon-192.png', 'icons/xp-icon-512.png',
  ...['font', 'geo', 'store', 'map', 'parcel', 'traffic', 'area', 'ui'].map(n => '../v2/js/' + n + '.js?v=' + V2),
  '../v2/data/tx-acs.json?v=2024b', '../v2/data/tx-crime.json?v=2025', '../v2/data/us-major.json?v=2024',
  '../v2/ref/firstaid.json?v=1', '../v2/ref/knots.json?v=1',
  'keys/face.jpg',
  'keys/ghost-amber.svg',
  'keys/ghost-green.svg',
  'keys/ghost-lcd.svg',
  'keys/knob-desk.png',
  'keys/knob-drive.png',
  'keys/knob-recon.png',
  'keys/lamp-amber-lit.png',
  'keys/lamp-amber.png',
  'keys/lamp-green-lit.png',
  'keys/lamp-green.png',
  'keys/mark-base.png',
  'keys/mark-cap-lit.png',
  'keys/mark-cap.png',
  'keys/mark-ring-lit.png',
  'keys/mark-ring.png',
  'keys/mask-round.svg',
  'keys/mask-square.svg',
  'keys/pre-1-cap-lit.png',
  'keys/pre-1-cap.png',
  'keys/pre-1-ring-lit.png',
  'keys/pre-1-ring.png',
  'keys/pre-2-cap-lit.png',
  'keys/pre-2-cap.png',
  'keys/pre-2-ring-lit.png',
  'keys/pre-2-ring.png',
  'keys/pre-3-cap-lit.png',
  'keys/pre-3-cap.png',
  'keys/pre-3-ring-lit.png',
  'keys/pre-3-ring.png',
  'keys/pre-4-cap-lit.png',
  'keys/pre-4-cap.png',
  'keys/pre-4-ring-lit.png',
  'keys/pre-4-ring.png',
  'keys/pre-5-cap-lit.png',
  'keys/pre-5-cap.png',
  'keys/pre-5-ring-lit.png',
  'keys/pre-5-ring.png',
  'keys/pre-6-cap-lit.png',
  'keys/pre-6-cap.png',
  'keys/pre-6-ring-lit.png',
  'keys/pre-6-ring.png',
  'keys/pre-base.png',
  'keys/screw.png',
  'keys/shell.jpg',
  'keys/soft-base.png',
  'keys/soft-cap-lit.png',
  'keys/soft-cap.png',
  'keys/tog-hicon-on.png',
  'keys/tog-hicon.png',
  'keys/tog-scout-on.png',
  'keys/tog-scout.png',
  'keys/tool-base.png',
  'keys/tool-fast-cap-lit.png',
  'keys/tool-fast-cap.png',
  'keys/tool-fast-ring-lit.png',
  'keys/tool-fast-ring.png',
  'keys/tool-legend-cap.png',
  'keys/tool-legend-ring.png',
  'keys/tool-log-cap-lit.png',
  'keys/tool-log-cap.png',
  'keys/tool-log-ring-lit.png',
  'keys/tool-log-ring.png',
  'keys/tool-lot-cap.png',
  'keys/tool-lot-ring.png',
  'keys/tool-objectives-cap-lit.png',
  'keys/tool-objectives-cap.png',
  'keys/tool-objectives-ring-lit.png',
  'keys/tool-objectives-ring.png',
  'keys/tool-ref-cap.png',
  'keys/tool-ref-ring.png',
  'keys/tool-search-cap.png',
  'keys/tool-search-ring.png',
  'keys/tool-vis-cap-lit.png',
  'keys/tool-vis-cap.png',
  'keys/tool-vis-ring-lit.png',
  'keys/tool-vis-ring.png',
  'keys/vents.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => null)))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('xp-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const put = (req, res) => { if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; };
const fromCache = req => caches.open(CACHE).then(c => c.match(req)).then(hit => hit || caches.match(req));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const same = url.origin === self.location.origin;
  const font = FONT_HOSTS.includes(url.hostname);
  if (!same && !font) return;                         // tiles, lookups, search: straight to the network

  if (req.mode === 'navigate') {                      // the page: fresh when online
    e.respondWith(fetch(req).then(res => put('index.html', res)).catch(() => fromCache('index.html').then(r => r || fromCache('./'))));
    return;
  }
  if (same && /\/v2\/js\//.test(url.pathname)) {      // the RP's modules: fresh if it answers within 3 s
    e.respondWith(new Promise(resolve => {
      let done = false;
      const fallback = () => fromCache(req).then(hit => { if (!done && hit) { done = true; resolve(hit); } return hit; });
      const timer = setTimeout(fallback, 3000);
      fetch(req).then(res => { clearTimeout(timer); put(req, res); if (!done) { done = true; resolve(res); } })
        .catch(() => { clearTimeout(timer); fallback().then(hit => { if (!done) { done = true; resolve(hit || Response.error()); } }); });
    }));
    return;
  }
  e.respondWith(fromCache(req).then(hit => hit || fetch(req).then(res => put(req, res))));
});
