/* =============================================================
   RECON.OS RX-90 · CARTOGRAPHY ENGINE
   A small slippy map of our own. Raster tiles are composited
   off-screen, then pooled down to one value per display cell,
   so roads and water become lit dots on the same grid as text.
   Fog of war, today's trail, objectives, marks and your own
   position are drawn on top, cell by cell.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  // Tile sources, tried in order when AUTO. All use the same Web Mercator
  // grid, so a mark's lat/lng lands on the same street whichever is drawn.
  // (CARTO, used by v1, now answers every tile with an "API KEY REQUIRED"
  // image, so it is no longer in the list. Colours below were measured from
  // the live tiles.)
  const PROVIDERS = [
    { id: 'ESRI', name: 'ESRI DARK GRAY', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', subs: [''], maxZ: 16, land: [71, 71, 73], water: [[35, 34, 39]], flats: [[73, 75, 74], [80, 80, 82]], checkFake: true, credit: '© ESRI · HERE · GARMIN · OSM' },
    { id: 'OSM', name: 'OPENSTREETMAP', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', subs: [''], maxZ: 19, land: [242, 239, 233], water: [[170, 211, 223]], credit: '© OPENSTREETMAP CONTRIBUTORS' }
  ];
  const MIN_Z = 3, MAX_Z = 18;
  const K = 2; // sub-samples per cell edge

  // Calibration. LAND is the basemap's ground colour; a cell lights up by how
  // far it departs from it (works for dark and light basemaps). SPAN is the
  // departure that reads as full brightness. Both are re-learned on screen.
  const CAL = { land: [71, 71, 73], landL: 71, span: 42, water: [], learned: null, tol: 8 };

  const M = {
    lat: 29.7379, lng: -94.9846, zoom: 15,
    follow: true, dirty: true, cal: CAL,
    tiles: new Map(), loading: 0, failed: 0, loaded: 0,
    base: null, baseKey: '',
    prov: 0, mode: 'AUTO', why: {}, PROVIDERS
  };
  const P = () => PROVIDERS[M.prov];

  function useProvider(i, keepWhy) {
    M.prov = i;
    const p = PROVIDERS[i];
    CAL.land = p.land.slice(); CAL.landL = lumOf(p.land); CAL.water = p.water.slice(); CAL.learned = null;
    CAL.span = CAL.landL > 128 ? 70 : 42;
    M.tiles.clear(); M.loading = 0; M.failed = 0; M.loaded = 0; M.fakes = 0; M.tainted = false;
    M.base = null; M.baseKey = ''; M.dirty = true;
    if (!keepWhy) M.why = {};
  }
  function lumOf(c) { return (c[0] * 3 + c[1] * 6 + c[2]) / 10; }

  // choose source: 'AUTO' walks the list on failure; an id pins one source.
  M.setSource = function (mode) {
    M.mode = mode || 'AUTO';
    const i = PROVIDERS.findIndex(p => p.id === M.mode);
    if (i < 0) M.mode = 'AUTO';
    useProvider(i >= 0 ? i : 0);
  };
  M.sourceName = () => P().name;
  M.credit = () => P().credit;

  // When a source fails with nothing loaded, find out why (blocked by the
  // browser's cross-origin rule vs. not reachable) and move to the next one.
  function failover(reason) {
    const p = P();
    if (M.why[p.id]) return;
    M.why[p.id] = reason || 'FAILED';
    const probe = p.url.replace('{s}', p.subs[0]).replace('{z}', '3').replace('{x}', '2').replace('{y}', '3');
    if (!reason) fetch(probe, { mode: 'no-cors', cache: 'no-store' })
      .then(() => { M.why[p.id] = 'BLOCKED (CORS)'; })
      .catch(() => { M.why[p.id] = navigator.onLine === false ? 'NO CONNECTION' : 'UNREACHABLE'; })
      .finally(() => { M.dirty = true; });
    if (M.mode === 'AUTO' && M.prov < PROVIDERS.length - 1) useProvider(M.prov + 1, true);
    M.dirty = true;
  }
  M.statusLine = function () {
    const p = P();
    if (M.loaded > 0 && !M.tainted) return '';
    if (M.why[p.id]) return 'MAP ' + p.id + ' ' + M.why[p.id];
    if (M.loading > 0) return 'MAP LOADING · ' + p.id;
    return '';
  };
  M.report = function () {
    return PROVIDERS.map(p => p.id + ':' + (M.why[p.id] || (p === P() ? (M.loaded ? 'OK ' + M.loaded : 'TRYING') : '-'))).join(' · ');
  };

  // ---------- tiles ----------
  function tileKey(z, x, y) { return z + '/' + x + '/' + y; }
  function getTile(z, x, y) {
    const n = 1 << z;
    if (y < 0 || y >= n) return null;
    x = ((x % n) + n) % n;
    const key = tileKey(z, x, y);
    let t = M.tiles.get(key);
    if (t) { t.used = performance.now(); return t; }
    const prov = M.prov, p = P();
    t = { img: new Image(), ok: false, err: false, used: performance.now() };
    t.img.crossOrigin = 'anonymous';
    t.img.decoding = 'async';
    t.img.onload = () => {
      if (prov !== M.prov) return;
      M.loading--;
      if (isPlaceholder(t.img)) {
        // a "key required" / "no data" picture instead of a map
        t.err = true; M.failed++; M.fakes = (M.fakes || 0) + 1;
        if (M.loaded === 0 && M.fakes >= 3) failover('SENDS PLACEHOLDER TILES');
        return;
      }
      t.ok = true; M.loaded++; M.dirty = true;
    };
    t.img.onerror = () => {
      if (prov !== M.prov) return;
      t.err = true; M.loading--; M.failed++;
      if (M.loaded === 0 && M.failed >= 4) failover();
      else setTimeout(() => { if (M.tiles.get(key) === t) M.tiles.delete(key); }, 15000);
    };
    M.loading++;
    t.img.src = p.url.replace('{s}', p.subs[(x + y) % p.subs.length]).replace('{z}', z).replace('{x}', x).replace('{y}', y);
    M.tiles.set(key, t);
    if (M.tiles.size > 420) evict();
    return t;
  }
  // A real map tile is never >90% one colour unless that colour is the
  // ground or open water. Anything else is a stand-in image.
  let pc = null, pctx = null;
  function isPlaceholder(img) {
    try {
      if (!pc) { pc = document.createElement('canvas'); pc.width = pc.height = 32; pctx = pc.getContext('2d', { willReadFrequently: true }); }
      pctx.clearRect(0, 0, 32, 32); pctx.drawImage(img, 0, 0, 32, 32);
      const d = pctx.getImageData(0, 0, 32, 32).data, h = new Map();
      let best = 0, bestK = 0;
      for (let p = 0; p < d.length; p += 4) {
        const k = (d[p] << 16) | (d[p + 1] << 8) | d[p + 2];
        const n = (h.get(k) || 0) + 1; h.set(k, n);
        if (n > best) { best = n; bestK = k; }
      }
      if (!P().checkFake || best / 1024 < 0.9) return false;
      const R = bestK >> 16, G = (bestK >> 8) & 255, B = bestK & 255, pr = P();
      const ok = c => Math.abs(R - c[0]) <= 2 && Math.abs(G - c[1]) <= 2 && Math.abs(B - c[2]) <= 2;
      return !(ok(pr.land) || pr.water.some(ok) || (pr.flats || []).some(ok));
    } catch (e) { return false; }
  }
  function peekTile(z, x, y) {
    const n = 1 << z;
    if (y < 0 || y >= n) return null;
    x = ((x % n) + n) % n;
    const t = M.tiles.get(tileKey(z, x, y));
    return t && t.ok ? t : null;
  }
  function evict() {
    const arr = [...M.tiles.entries()].sort((a, b) => a[1].used - b[1].used);
    for (let i = 0; i < 120; i++) M.tiles.delete(arr[i][0]);
  }

  // ---------- view helpers ----------
  // Guarded: a bad number (NaN) must never become the map centre, or the
  // whole map goes blank until reload.
  M.setView = function (lat, lng, zoom) {
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      M.lat = Math.max(-84, Math.min(84, lat));
      M.lng = ((lng + 540) % 360) - 180;
    }
    if (zoom != null && Number.isFinite(zoom)) M.zoom = Math.max(MIN_Z, Math.min(MAX_Z, zoom));
    M.dirty = true;
  };
  M.zoomBy = function (dz, ax, ay, view) {
    if (!Number.isFinite(dz)) return;
    if (!Number.isFinite(ax) || !Number.isFinite(ay)) ax = null;
    const nz = Math.max(MIN_Z, Math.min(MAX_Z, M.zoom + dz));
    if (nz === M.zoom) return;
    if (ax != null && view) {
      const before = M.dotToLatLng(ax, ay, view);
      M.zoom = nz;
      const after = M.dotToLatLng(ax, ay, view);
      M.setView(M.lat + (before.lat - after.lat), M.lng + (before.lng - after.lng));
    } else { M.zoom = nz; }
    M.dirty = true;
  };
  M.panBy = function (dxCss, dyCss) {
    if (!Number.isFinite(dxCss) || !Number.isFinite(dyCss)) return;
    const c = RX.geo.project(M.lat, M.lng, M.zoom);
    const ll = RX.geo.unproject(c.x - dxCss, c.y - dyCss, M.zoom);
    M.setView(ll.lat, ll.lng);
  };
  // view = { cols, rows, pitch, cx, cy } — cx,cy is the cell that sits on the map centre.
  M.latLngToDot = function (lat, lng, v) {
    const c = RX.geo.project(M.lat, M.lng, M.zoom);
    const p = RX.geo.project(lat, lng, M.zoom);
    return { x: v.cx + (p.x - c.x) / v.pitch, y: v.cy + (p.y - c.y) / v.pitch };
  };
  M.dotToLatLng = function (x, y, v) {
    const c = RX.geo.project(M.lat, M.lng, M.zoom);
    return RX.geo.unproject(c.x + (x - v.cx) * v.pitch, c.y + (y - v.cy) * v.pitch, M.zoom);
  };

  // ---------- self-calibration ----------
  // Ground = the most common colour on screen. Water = the provider's known
  // water colour, or (for sources that need it) the next big flat colour.
  // Span = how far the brightest 3% of features stand off the ground.
  const qh = new Map(), dh = new Uint32Array(256);
  function autoCal(data) {
    qh.clear(); dh.fill(0);
    let n = 0;
    for (let p = 0; p < data.length; p += 4 * 5) {
      const q = ((data[p] >> 3) << 10) | ((data[p + 1] >> 3) << 5) | (data[p + 2] >> 3);
      qh.set(q, (qh.get(q) || 0) + 1); n++;
    }
    if (n < 400) return;
    const ranked = [...qh.entries()].sort((a, b) => b[1] - a[1]);
    const top = ranked[0][0];
    const land = [((top >> 10) & 31) * 8 + 4, ((top >> 5) & 31) * 8 + 4, (top & 31) * 8 + 4];
    const homeL = lumOf(P().land);
    if (!isWater(land[0], land[1], land[2]) && Math.abs(lumOf(land) - homeL) < 18) {
      CAL.land = CAL.land.map((v, i) => Math.round(v * 0.7 + land[i] * 0.3));
      CAL.landL = lumOf(CAL.land);
    }
    if (P().learnWater && ranked[1] && ranked[1][1] / n >= 0.15) {
      const w = ranked[1][0];
      CAL.learned = [((w >> 10) & 31) * 8 + 4, ((w >> 5) & 31) * 8 + 4, (w & 31) * 8 + 4];
    }
    for (let p = 0; p < data.length; p += 4 * 5) {
      const R = data[p], G = data[p + 1], B = data[p + 2];
      if (isWater(R, G, B)) continue;
      dh[Math.min(255, Math.round(Math.abs((R * 3 + G * 6 + B) / 10 - CAL.landL)))]++;
    }
    let acc = 0, p97 = 0;
    const lim = n * 0.03;
    for (let i = 255; i >= 0; i--) { acc += dh[i]; if (acc >= lim) { p97 = i; break; } }
    if (p97 > 8) CAL.span = Math.round(CAL.span * 0.7 + Math.max(CAL.landL > 128 ? 30 : 40, Math.min(140, p97)) * 0.3);
  }
  function near(R, G, B, c) { const t = CAL.tol; return Math.abs(R - c[0]) <= t && Math.abs(G - c[1]) <= t && Math.abs(B - c[2]) <= t; }
  function isWater(R, G, B) {
    for (const c of CAL.water) if (near(R, G, B, c)) return true;
    return !!(CAL.learned && near(R, G, B, CAL.learned));
  }

  // ---------- sampling ----------
  let oc = null, octx = null;
  function sample(v) {
    const W = v.cols * K, H = v.rows * K;
    if (!oc) { oc = document.createElement('canvas'); octx = oc.getContext('2d', { willReadFrequently: true }); }
    if (oc.width !== W || oc.height !== H) { oc.width = W; oc.height = H; }
    octx.imageSmoothingEnabled = true;
    octx.fillStyle = 'rgb(' + CAL.land.join(',') + ')';
    octx.fillRect(0, 0, W, H);

    const tz = Math.max(0, Math.min(P().maxZ, Math.round(M.zoom)));
    const scale = Math.pow(2, M.zoom - tz);          // world px (at M.zoom) per tile px
    const sub = K / v.pitch;                          // sample px per world px
    const ts = 256 * scale * sub;                     // tile size in sample px
    const c = RX.geo.project(M.lat, M.lng, tz);       // centre in tile-zoom px
    const ox = W / 2 - (c.x / 256) * ts + (v.cx - v.cols / 2) * K;
    const oy = H / 2 - (c.y / 256) * ts + (v.cy - v.rows / 2) * K;
    const x0 = Math.floor(-ox / ts), y0 = Math.floor(-oy / ts);
    const x1 = Math.floor((W - ox) / ts), y1 = Math.floor((H - oy) / ts);
    let missing = 0, drawn = 0;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const dx = ox + tx * ts, dy = oy + ty * ts;
      const t = getTile(tz, tx, ty);
      if (t && t.ok) { octx.drawImage(t.img, dx, dy, ts + 0.5, ts + 0.5); drawn++; continue; }
      missing++;
      for (let k = 1; k <= 5 && tz - k >= 0; k++) {
        const pt = peekTile(tz - k, tx >> k, ty >> k);
        if (!pt) continue;
        const n = 1 << k, part = 256 / n;
        const sx = ((tx % n) + n) % n * part, sy = ((ty % n) + n) % n * part;
        octx.drawImage(pt.img, sx, sy, part, part, dx, dy, ts + 0.5, ts + 0.5);
        drawn++;
        break;
      }
    }

    let data;
    try { data = octx.getImageData(0, 0, W, H).data; }
    catch (e) { M.tainted = true; failover('BLOCKED (CANVAS)'); return null; }
    if (drawn && missing === 0) autoCal(data);

    const n = v.cols * v.rows;
    const lum = new Uint8Array(n), water = new Uint8Array(n);
    const landL = CAL.landL, span = CAL.span;
    for (let r = 0; r < v.rows; r++) for (let col = 0; col < v.cols; col++) {
      let mx = 0, sum = 0, wv = 0;
      for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) {
        const p = ((r * K + j) * W + (col * K + i)) * 4;
        const R = data[p], Gc = data[p + 1], B = data[p + 2];
        if (isWater(R, Gc, B)) { wv++; continue; }
        const d = Math.abs((R * 3 + Gc * 6 + B) / 10 - landL);
        if (d > mx) mx = d;
        sum += d;
      }
      const avg = sum / (K * K);
      const L = mx * 0.6 + avg * 0.4;
      const idx = r * v.cols + col;
      lum[idx] = Math.max(0, Math.min(255, (L - 4) / span * 255));
      water[idx] = wv >= (K * K) / 2 ? 1 : 0;
    }

    // Fog: which cells sit in unrevealed 150 m squares.
    const fog = new Uint8Array(n);
    const S = RX.store, HI = !!(S.v2 && S.v2.hicon);
    const cellDots = S.FOG_CELL_DEG / Math.max(1e-12, Math.abs(M.dotToLatLng(0, 0, v).lat - M.dotToLatLng(0, 1, v).lat));
    if (HI && cellDots < 1.5) {
      // zoomed out: cells are smaller than a dot · plot every explored cell so none disappear
      fog.fill(1);
      const D = S.FOG_CELL_DEG;
      for (const k of S.fog) {
        const ix = S.unpackIdx(k), d = M.latLngToDot((ix[0] + 0.5) * D, (ix[1] + 0.5) * D, v);
        const x = Math.floor(d.x), y = Math.floor(d.y);
        if (x >= 0 && y >= 0 && x < v.cols && y < v.rows) fog[y * v.cols + x] = 0;
      }
    } else if ((M.zoom >= 9.5 || HI) && RX.store.fog.size) {
      const D = RX.store.FOG_CELL_DEG;
      const latIdx = new Int32Array(v.rows), lngIdx = new Int32Array(v.cols);
      for (let r = 0; r < v.rows; r++) latIdx[r] = Math.floor(M.dotToLatLng(0, r + 0.5, v).lat / D);
      for (let col = 0; col < v.cols; col++) lngIdx[col] = Math.floor(M.dotToLatLng(col + 0.5, 0, v).lng / D);
      for (let r = 0; r < v.rows; r++) for (let col = 0; col < v.cols; col++) {
        if (!RX.store.isRevealed(latIdx[r], lngIdx[col])) fog[r * v.cols + col] = 1;
      }
    } else if (M.zoom >= 9.5 || HI) {
      fog.fill(1);
    }
    M.missing = missing;
    return { lum, water, fog, cols: v.cols, rows: v.rows };
  }

  M.ensureBase = function (v) {
    const key = [v.cols, v.rows, v.pitch, v.cx, v.cy, M.lat.toFixed(6), M.lng.toFixed(6), M.zoom.toFixed(3), RX.store.fog.size, RX.store.v2 && RX.store.v2.hicon ? 'HI' : ''].join('|');
    if (!M.dirty && key === M.baseKey && M.base) return M.base;
    const b = sample(v);
    if (b) { M.base = b; M.baseKey = key; }
    M.dirty = false;
    return M.base;
  };

  const FOG_FACTOR = { CLEAR: 0.85, LIGHT: 0.55, MEDIUM: 0.32, HEAVY: 0.16 };

  // Draw the map base into matrix mx.
  M.drawBase = function (mx, v, colors) {
    const b = M.ensureBase(v);
    if (!b || b.cols !== mx.cols || b.rows !== mx.rows) return;
    const fogF = FOG_FACTOR[RX.store.prefsV1.fogOpacity] != null ? FOG_FACTOR[RX.store.prefsV1.fogOpacity] : 0.32;
    const ink = RX.rgb(colors.ink), wat = RX.rgb(colors.water), hatch = RX.rgb(colors.fog);
    const buf = mx.buf, cols = mx.cols;
    if (RX.store.v2 && RX.store.v2.hicon) {
      // HI-CON: explored ground is solid white, the rest drops to a faint grey sketch
      const WH = [255, 255, 255], GR = [150, 150, 150];
      for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) {
        const i = r * cols + c, p = i * 4, L = b.lum[i] / 255, fg = b.fog[i] === 1;
        let a = 0, col = GR;
        if (!fg) { col = WH; a = b.water[i] ? 0.34 : 0.52 + 0.48 * Math.min(1, L * 1.2); }
        else if (b.water[i]) { if (((c + r * 3) % 4) === 0) a = 0.16; }
        else if (L > 0.06) a = 0.07 + 0.12 * Math.min(1, L);
        if (a > 0) { buf[p] = col[0]; buf[p + 1] = col[1]; buf[p + 2] = col[2]; buf[p + 3] = a * 255; }
      }
      return;
    }
    for (let r = 0; r < b.rows; r++) for (let c = 0; c < b.cols; c++) {
      const i = r * cols + c, p = i * 4;
      const fogged = b.fog[i] === 1;
      let a = 0, col = ink;
      if (b.water[i]) {
        if (((c + r * 3) % 4) === 0 || (((c + 1) + r * 3) % 4 === 0 && r % 2 === 0)) { a = 0.42; col = wat; }
      } else {
        const L = b.lum[i] / 255;
        if (L > 0.06) a = 0.18 + 0.82 * Math.min(1, L * 1.15);
        if (fogged) {
          a *= fogF;
          if (a < 0.08 && ((c - r + 4096) % 5) === 0) { a = 0.1; col = hatch; }
        }
      }
      if (a > 0) {
        buf[p] = col[0]; buf[p + 1] = col[1]; buf[p + 2] = col[2]; buf[p + 3] = a * 255;
      }
    }
  };

  M.status = function () { return { source: P().id, loading: M.loading, failed: M.failed, loaded: M.loaded, missing: M.missing || 0, tainted: !!M.tainted, why: M.why, land: CAL.land, span: CAL.span }; };

  RX.map = M;
})();
