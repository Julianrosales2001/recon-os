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
  const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}.png';
  const SUBS = ['a', 'b', 'c', 'd'];
  const MIN_Z = 3, MAX_Z = 18, TILE_MAX_Z = 19;
  const K = 2; // sub-samples per cell edge

  // Tile palette calibration (dark_nolabels). LAND is the base level; anything
  // brighter is drawn as road/structure; pixels near WATER are drawn as water.
  const CAL = { land: 14, roadSpan: 70, waterL: 38, waterTol: 10, waterDetect: true };

  const M = {
    lat: 29.7379, lng: -94.9846, zoom: 15,
    follow: true, dirty: true, cal: CAL,
    tiles: new Map(), loading: 0, failed: 0, loaded: 0,
    base: null, baseKey: ''
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
    t = { img: new Image(), ok: false, err: false, used: performance.now() };
    t.img.crossOrigin = 'anonymous';
    t.img.decoding = 'async';
    t.img.onload = () => { t.ok = true; M.loading--; M.loaded++; M.dirty = true; };
    t.img.onerror = () => { t.err = true; M.loading--; M.failed++; };
    M.loading++;
    t.img.src = TILE_URL.replace('{s}', SUBS[(x + y) % 4]).replace('{z}', z).replace('{x}', x).replace('{y}', y);
    M.tiles.set(key, t);
    if (M.tiles.size > 420) evict();
    return t;
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
  M.setView = function (lat, lng, zoom) {
    M.lat = Math.max(-84, Math.min(84, lat));
    M.lng = ((lng + 540) % 360) - 180;
    if (zoom != null) M.zoom = Math.max(MIN_Z, Math.min(MAX_Z, zoom));
    M.dirty = true;
  };
  M.zoomBy = function (dz, ax, ay, view) {
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
  // The basemap's land tone is the most common grey on screen; open water is
  // the next big flat grey a little brighter than land. Learned from what is
  // actually drawn, so a change in tile colours never blanks the map.
  const hist = new Uint32Array(256);
  function autoCal(data) {
    hist.fill(0);
    let n = 0;
    for (let p = 0; p < data.length; p += 4 * 7) {
      const R = data[p], G = data[p + 1], B = data[p + 2];
      if (Math.abs(R - G) > 10 || Math.abs(R - B) > 10) continue;
      hist[Math.round((R * 3 + G * 6 + B) / 10)]++; n++;
    }
    if (n < 500) return;
    let land = 0;
    for (let i = 1; i < 256; i++) if (hist[i] > hist[land]) land = i;
    if (land > 60) return;
    CAL.land = Math.round(CAL.land * 0.7 + land * 0.3);
    let wl = -1;
    for (let i = land + 8; i <= Math.min(255, land + 48); i++) if (wl < 0 || hist[i] > hist[wl]) wl = i;
    if (wl >= 0 && hist[wl] / n >= 0.12) CAL.waterL = Math.round(CAL.waterL * 0.6 + wl * 0.4);
  }

  // ---------- sampling ----------
  let oc = null, octx = null;
  function sample(v) {
    const W = v.cols * K, H = v.rows * K;
    if (!oc) { oc = document.createElement('canvas'); octx = oc.getContext('2d', { willReadFrequently: true }); }
    if (oc.width !== W || oc.height !== H) { oc.width = W; oc.height = H; }
    octx.imageSmoothingEnabled = true;
    octx.fillStyle = 'rgb(' + CAL.land + ',' + CAL.land + ',' + CAL.land + ')';
    octx.fillRect(0, 0, W, H);

    const tz = Math.max(0, Math.min(TILE_MAX_Z, Math.round(M.zoom)));
    const scale = Math.pow(2, M.zoom - tz);          // world px (at M.zoom) per tile px
    const sub = K / v.pitch;                          // sample px per world px
    const ts = 256 * scale * sub;                     // tile size in sample px
    const c = RX.geo.project(M.lat, M.lng, tz);       // centre in tile-zoom px
    const ox = W / 2 - (c.x / 256) * ts + (v.cx - v.cols / 2) * K;
    const oy = H / 2 - (c.y / 256) * ts + (v.cy - v.rows / 2) * K;
    const x0 = Math.floor(-ox / ts), y0 = Math.floor(-oy / ts);
    const x1 = Math.floor((W - ox) / ts), y1 = Math.floor((H - oy) / ts);
    let missing = 0;
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const dx = ox + tx * ts, dy = oy + ty * ts;
      const t = getTile(tz, tx, ty);
      if (t && t.ok) { octx.drawImage(t.img, dx, dy, ts + 0.5, ts + 0.5); continue; }
      missing++;
      for (let k = 1; k <= 5 && tz - k >= 0; k++) {
        const pt = peekTile(tz - k, tx >> k, ty >> k);
        if (!pt) continue;
        const n = 1 << k, part = 256 / n;
        const sx = ((tx % n) + n) % n * part, sy = ((ty % n) + n) % n * part;
        octx.drawImage(pt.img, sx, sy, part, part, dx, dy, ts + 0.5, ts + 0.5);
        break;
      }
    }

    let data;
    try { data = octx.getImageData(0, 0, W, H).data; }
    catch (e) { M.tainted = true; return null; }
    if (missing === 0) autoCal(data);

    const n = v.cols * v.rows;
    const lum = new Uint8Array(n), water = new Uint8Array(n);
    const tol = CAL.waterTol;
    for (let r = 0; r < v.rows; r++) for (let col = 0; col < v.cols; col++) {
      let mx = 0, sum = 0, wv = 0;
      for (let j = 0; j < K; j++) for (let i = 0; i < K; i++) {
        const p = ((r * K + j) * W + (col * K + i)) * 4;
        const R = data[p], Gc = data[p + 1], B = data[p + 2];
        const L = (R * 3 + Gc * 6 + B) / 10;
        if (L > mx) mx = L;
        sum += L;
        if (CAL.waterDetect && Math.abs(L - CAL.waterL) <= 4 && Math.abs(R - B) <= tol && Math.abs(R - Gc) <= tol) wv++;
      }
      const avg = sum / (K * K);
      const L = mx * 0.6 + avg * 0.4;
      const idx = r * v.cols + col;
      lum[idx] = Math.max(0, Math.min(255, (L - CAL.land - 4) / CAL.roadSpan * 255));
      water[idx] = wv >= (K * K) / 2 ? 1 : 0;
    }

    // Fog: which cells sit in unrevealed 150 m squares.
    const fog = new Uint8Array(n);
    if (M.zoom >= 9.5 && RX.store.fog.size) {
      const D = RX.store.FOG_CELL_DEG;
      const latIdx = new Int32Array(v.rows), lngIdx = new Int32Array(v.cols);
      for (let r = 0; r < v.rows; r++) latIdx[r] = Math.floor(M.dotToLatLng(0, r + 0.5, v).lat / D);
      for (let col = 0; col < v.cols; col++) lngIdx[col] = Math.floor(M.dotToLatLng(col + 0.5, 0, v).lng / D);
      for (let r = 0; r < v.rows; r++) for (let col = 0; col < v.cols; col++) {
        if (!RX.store.isRevealed(latIdx[r], lngIdx[col])) fog[r * v.cols + col] = 1;
      }
    } else if (M.zoom >= 9.5) {
      fog.fill(1);
    }
    M.missing = missing;
    return { lum, water, fog, cols: v.cols, rows: v.rows };
  }

  M.ensureBase = function (v) {
    const key = [v.cols, v.rows, v.pitch, v.cx, v.cy, M.lat.toFixed(6), M.lng.toFixed(6), M.zoom.toFixed(3), RX.store.fog.size].join('|');
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

  M.status = function () { return { loading: M.loading, failed: M.failed, loaded: M.loaded, missing: M.missing || 0, tainted: !!M.tainted }; };

  RX.map = M;
})();
