/* =============================================================
   RECON.OS RX-90 · SCREENS
   Every screen draws itself into the dot matrix each frame.
   map · pick · boot · log · mark · markpick · fast · fastrec ·
   menu · search · legend · objectives · objective · stats · confirm
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const S = RX.store, M = RX.map, U = RX.ui, Geo = RX.geo, F = U.F, C = U.C;
  const TIER_MIN = { 1: 13, 2: 10, 3: 0 };
  const TIER_NAMES = { 1: 'LOW', 2: 'MED', 3: 'HIGH' };
  const footTop = g => g.H - 12;
  const here = A => A.gps || { lat: M.lat, lng: M.lng };
  const distTo = (A, p) => { const h = here(A); return Geo.meters(h.lat, h.lng, p.lat, p.lng); };
  const brgTo = (A, p) => { const h = here(A); return Geo.bearing(h.lat, h.lng, p.lat, p.lng); };
  const regionName = id => { const r = S.regions.find(x => x.id === id); return r ? r.name.replace(/ REGION$/, '') : ''; };

  // ======================================================================
  // MAP DRAWING (shared by map + pick)
  // ======================================================================
  function drawMap(g, A, o) {
    o = o || {};
    const v = A.view(), mx = g.mx, W = g.W, H = g.H, t = g.t;
    M.drawBase(mx, v, { ink: C.ink, water: C.water, fog: C.fog });

    // today's trail
    if (S.prefsV1.showTrail !== false && S.trail.length > 1) {
      let prev = null;
      for (const pt of S.trail) {
        const d = M.latLngToDot(pt.lat, pt.lng, v);
        if (prev && !((prev.x < -4 && d.x < -4) || (prev.x > W + 4 && d.x > W + 4) || (prev.y < -4 && d.y < -4) || (prev.y > H + 4 && d.y > H + 4)))
          mx.line(Math.floor(prev.x), Math.floor(prev.y), Math.floor(d.x), Math.floor(d.y), C.trail, 0.85, 2);
        prev = d;
      }
    }

    // objectives with a place
    S.missions.forEach(m => {
      if (m.status !== 'active' || m.lat == null || m.lng == null) return;
      const d = M.latLngToDot(m.lat, m.lng, v), x = Math.floor(d.x), y = Math.floor(d.y);
      if (x < -6 || y < -6 || x > W + 6 || y > H + 6) return;
      const hot = m.priority === 'urgent' || (m.deadline && m.deadline < Date.now());
      const off = m.poiId ? 9 : 0;
      g.hex(x, y + off, hot ? C.red : C.obj, 0.95);
      if (!o.noHits) g.hit(x - 6, y + off - 6, 13, 13, () => A.go('objective', { id: m.id }));
    });

    // marks
    const hidden = new Set(S.v2.hiddenCats || []);
    const recallCat = A.recall != null ? U.CATS[A.recall].id : null;
    const scanIt = !o.noHits && A.stack.length <= 1 && A.drumFace() === 'SCAN' ? A.scanItem() : null;
    const shown = [];
    for (const p of S.pois) {
      if (p.category && hidden.has(p.category)) continue;
      const live = (A.assign && A.assign.id === p.id) || (A.filed && A.filed.id === p.id) || (scanIt && scanIt.id === p.id);
      if (M.zoom < (TIER_MIN[p.tier || 2] || 0) && !live && !(recallCat && p.category === recallCat)) continue;
      const d = M.latLngToDot(p.lat, p.lng, v), x = Math.floor(d.x), y = Math.floor(d.y);
      if (x < -8 || y < -8 || x > W + 8 || y > H + 8) continue;
      shown.push({ p, x, y });
    }
    shown.sort((a, b) => a.y - b.y);
    for (const s of shown) {
      const p = s.p;
      if (recallCat && p.category && p.category !== recallCat) {
        const cat = U.catById(p.category);
        mx.carve(s.x, s.y, 2.2); mx.disc(s.x, s.y, 1.2, cat ? cat.color : C.ink, 0.3);
        continue;
      }
      const blinking = A.assign && A.assign.id === p.id;
      if (blinking && Math.floor(t / 280) % 2) { mx.carve(s.x, s.y, 6.2); mx.ring(s.x, s.y, 5, C.amber, 1, 2); }
      else g.pin(s.x, s.y, p, blinking ? { c: C.amber } : null);
      if (!o.noHits) g.hit(s.x - 7, s.y - 7, 15, 15, () => A.openMark(p.id));
    }
    if (recallCat) {
      const nb = A.nearest(A.recall);
      if (nb) { const d = M.latLngToDot(nb.p.lat, nb.p.lng, v); g.brackets(Math.floor(d.x), Math.floor(d.y), 9 + (Math.floor(t / 400) % 2), C.hot, 1); }
    }

    // SCAN: brackets and the mark's name under it
    if (scanIt) {
      const d = M.latLngToDot(scanIt.lat, scanIt.lng, v), x = Math.floor(d.x), y = Math.floor(d.y);
      g.brackets(x, y, 9 + (Math.floor(t / 450) % 2), C.hot, 1);
      const nm = RX.font.fit(S.markLabel(scanIt), W - 6, 'mini');
      const lw = RX.font.measure(nm, 'mini');
      const lx = Math.min(W - lw - 2, Math.max(1, x - Math.floor(lw / 2)));
      mx.clearRect(lx - 1, y + 12, lw + 2, 7); g.mini(nm, lx, y + 13, { c: C.hot, a: 1 });
    }

    // search target
    if (A.target) {
      const d = M.latLngToDot(A.target.lat, A.target.lng, v), x = Math.floor(d.x), y = Math.floor(d.y);
      mx.carve(x, y, 6);
      mx.frame(x - 5, y - 5, 11, 11, C.hot, 1);
      mx.hline(x - 9, y, 4, C.hot, 1); mx.hline(x + 6, y, 4, C.hot, 1);
      mx.vline(x, y - 9, 4, C.hot, 1); mx.vline(x, y + 6, 4, C.hot, 1);
      if (Math.floor(t / 500) % 2) mx.set(x, y, C.hot, 1);
      const lw = RX.font.measure(A.target.name, 'mini');
      const lx = Math.min(W - lw - 2, Math.max(1, x - Math.floor(lw / 2)));
      mx.clearRect(lx - 1, y + 11, lw + 2, 7); g.mini(A.target.name, lx, y + 12, { c: C.hot, a: 1 });
    }

    // you
    if (A.gps) {
      const d = M.latLngToDot(A.gps.lat, A.gps.lng, v), x = Math.floor(d.x), y = Math.floor(d.y);
      const ph = (t % 2600) / 2600;
      mx.ring(x, y, 3 + ph * 15, C.ink, 0.85 * (1 - ph));
      const stale = Date.now() - A.gps.ts > 30000;
      if (A.gps.heading != null) {
        const h = A.gps.heading * Math.PI / 180, sx = Math.sin(h), sy = -Math.cos(h);
        for (let r = 3; r <= 7; r++) mx.set(x + Math.round(sx * r), y + Math.round(sy * r), C.hot, r === 7 ? 0.6 : 1);
        const px = -sy, py = sx;
        mx.set(x + Math.round(sx * 5 + px * 2), y + Math.round(sy * 5 + py * 2), C.hot, 0.9);
        mx.set(x + Math.round(sx * 5 - px * 2), y + Math.round(sy * 5 - py * 2), C.hot, 0.9);
      }
      mx.carve(x, y, 2.6);
      mx.disc(x, y, 1.6, stale ? C.amber : C.hot, 1);
    }

    // free-look cursor
    if (!M.follow || !A.gps || o.reticle) {
      const cx = Math.floor(v.cx), cy = Math.floor(v.cy);
      if (o.reticle) {
        mx.carve(cx, cy, 2);
        [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([a, b]) => { for (let r = 4; r <= 12; r++) mx.set(cx + a * r, cy + b * r, C.hot, r < 6 ? 0.6 : 1); });
        g.brackets(cx, cy, 15, C.hot, Math.floor(t / 450) % 2 ? 1 : 0.55);
        mx.set(cx, cy, C.hot, 1);
      } else {
        mx.hline(cx - 3, cy, 2, C.ink, 0.7); mx.hline(cx + 2, cy, 2, C.ink, 0.7);
        mx.vline(cx, cy - 3, 2, C.ink, 0.7); mx.vline(cx, cy + 2, 2, C.ink, 0.7);
      }
    }
  }

  function hud(g, A, title) {
    const mx = g.mx, W = g.W;
    mx.clearRect(0, 0, W, 12);
    if (title) g.text(title, 1, 2, { c: C.hot });
    else {
      const src = (M.follow && A.gps) ? A.gps : { lat: M.lat, lng: M.lng };
      const s = (src.lat >= 0 ? 'N' : 'S') + Math.abs(src.lat).toFixed(4) + ' ' + (src.lng >= 0 ? 'E' : 'W') + Math.abs(src.lng).toFixed(4);
      g.text(s, 1, 2);
    }
    const zt = 'Z' + Math.round(M.zoom);
    const zw = g.textR(zt, W - 2, 2, { a: 0.7 });
    if (!M.follow && !title) g.miniR('FREE', W - zw - 6, 3, { c: C.amber, a: 0.95 });
    mx.hline(0, 11, W, C.ink, 0.3, 2);
  }

  function scaleBar(g, A, y) {
    const mpd = Geo.metersPerPx(M.lat, M.zoom) * A.mx.pitch;
    const opts = [[50, '50FT'], [100, '100FT'], [200, '200FT'], [500, '500FT'], [1000, '1000FT'], [2640, '1/2MI'], [5280, '1MI'], [10560, '2MI'], [26400, '5MI'], [52800, '10MI'], [105600, '20MI'], [264000, '50MI'], [528000, '100MI']];
    let pick = opts[opts.length - 1];
    for (const o of opts) { const len = o[0] * 0.3048 / mpd; if (len >= 16 && len <= 44) { pick = o; break; } if (len > 44) { pick = o; break; } }
    const len = Math.max(4, Math.round(pick[0] * 0.3048 / mpd));
    const mx = g.mx;
    mx.clearRect(0, y - 1, len + RX.font.measure(pick[1], 'mini') + 8, 8);
    mx.vline(2, y, 4, C.ink, 0.8); mx.vline(2 + len, y, 4, C.ink, 0.8); mx.hline(2, y + 3, len, C.ink, 0.8);
    g.mini(pick[1], len + 6, y, { a: 0.7 });
  }

  // ======================================================================
  RX.screens = {};

  // ---------------------------------------------------------------- boot
  RX.screens.boot = {
    map: true,
    enter(st) { st.t0 = performance.now(); },
    animating: () => true,
    push(st, A) { A.bootDone(); },
    render(g, st, A) {
      const t = performance.now() - st.t0, W = g.W, H = g.H;
      g.hit(0, 0, W, H, () => A.bootDone());
      const top = Math.max(6, Math.floor(H / 2) - 70);
      // R.OS — the OS name, with a small .OS, set on the R's baseline
      const wR = RX.font.measure('R', 'std', 2), wOS = RX.font.measure('.OS', 'std');
      const bx = Math.round(W / 2 - (wR + 1 + wOS) / 2);
      g.mx.text('R', bx, top, { s: 2, c: C.hot });
      g.mx.text('.OS', bx + wR + 1, top + 7, { c: C.hot });
      const sub = 'RP-1000 · FIELD CARTOGRAPHY TERMINAL';
      g.mx.text(sub, Math.round(W / 2 - RX.font.measure(sub, 'mini') / 2), top + 18, { face: 'mini', c: C.ink, a: 0.7 });
      const f = S.activeFast();
      const act = S.missions.filter(m => m.status === 'active').length;
      const lines = [
        ['CHARGEN 5X7 ROM', 'OK'],
        ['MARKS', String(S.pois.length)],
        ['PENDING', String(S.pending().length)],
        ['FOG CELLS', F.num(S.fog.size)],
        ['OBJECTIVES', act + ' ACTIVE'],
        ['FAST', f ? 'DAY ' + f.dayNum + ' RUN' : 'IDLE'],
        ['GPS', A.gps ? 'LOCK' : 'ACQUIRE'],
        ['DISPLAY', 'VFD ' + g.W + 'X' + g.H]
      ];
      const n = Math.min(lines.length, Math.floor(t / 170));
      const x0 = Math.max(2, Math.floor(W / 2) - 72), x1 = Math.min(W - 3, Math.floor(W / 2) + 72);
      for (let i = 0; i < n; i++) {
        const y = top + 32 + i * 10;
        const lw = g.text(lines[i][0], x0, y, { a: 0.85 });
        const vw = RX.font.measure(lines[i][1], 'std');
        g.mx.hline(x0 + lw + 3, y + 6, Math.max(0, x1 - vw - x0 - lw - 6), C.ink, 0.35, 2);
        g.textR(lines[i][1], x1, y, { c: i === n - 1 ? C.hot : C.ink });
      }
      const by = top + 32 + lines.length * 10 + 6;
      const p = Math.min(1, t / 1900);
      g.mx.frame(x0, by, x1 - x0 + 1, 7, C.ink, 0.5);
      g.mx.rect(x0 + 2, by + 2, Math.round((x1 - x0 - 3) * p), 3, C.ink, 1);
      g.textC('TAP TO SKIP', W / 2, by + 14, { face: 'mini', a: 0.5 });
      if (t > 2150) A.bootDone();
    }
  };

  // ---------------------------------------------------------------- map
  RX.screens.map = {
    map: true,
    animating: () => true,
    // the jog dial takes on the drum's face
    jogLabels: (st, A) => {
      const f = A.drumFace();
      if (f === 'SCAN') return ['◂ NEARER', 'FARTHER ▸', 'DRUM ▸ OPEN · HOLD RESET'];
      if (f === 'FILTER') return ['◂ PREV', 'NEXT ▸', 'DRUM ▸ CLEAR · HOLD RESET'];
      return ['◂ OUT', 'IN ▸', 'TAP LOCATE · HOLD RESET'];
    },
    jog(d, st, A) {
      const f = A.drumFace();
      if (f === 'SCAN') { A.scanStep(d); return; }
      if (f === 'FILTER') { A.filterStep(d); return; }
      const v = A.view();
      M.zoomBy(d * 0.5, v.cx, v.cy, v);
      A.say('ZOOM ▸ Z' + (Math.round(M.zoom * 2) / 2), 1500);
    },
    push(st, A) { A.locate(); },
    back(st, A) {
      if (A.recall != null) { A.clearRecall(); A.say('ALL CATEGORIES ▸ SHOWN', 2000); return true; }
      if (A.target) { A.target = null; A.say('TARGET CLEARED', 2000); return true; }
      return false;
    },
    longPress(d, st, A) {
      const ll = M.dotToLatLng(d.x, d.y, A.view());
      A.dropAt(ll.lat, ll.lng, 'LONG-PRESS');
    },
    tapEmpty(d, st, A) { if (A.target) { A.target = null; } },
    render(g, st, A) {
      const W = g.W, H = g.H, mx = g.mx;
      drawMap(g, A);
      hud(g, A);
      {
        const f = A.drumFace(), it = f === 'SCAN' ? A.scanItem() : null;
        document.getElementById('jogVal').textContent = f === 'SCAN' ? (it ? (A.scan.i + 1) + '/' + A.scan.list.length : '0/0')
          : f === 'FILTER' ? (A.recall != null ? U.CATS[A.recall].short : 'ALL') : 'Z' + (Math.round(M.zoom * 2) / 2);
      }

      // recall banner
      if (A.recall != null) {
        const cat = U.CATS[A.recall];
        const s = cat.id + ' ONLY · TAP ' + (A.recall + 1) + ' OR BACK TO CLEAR';
        const w = RX.font.measure(s, 'mini') + 14;
        mx.clearRect(1, 14, w, 9); mx.frame(1, 14, w, 9, cat.color, 0.8);
        mx.disc(6, 18, 2, cat.color, 1);
        g.mini(s, 11, 16, { a: 0.95 });
      }

      // tiles status
      const ml = M.statusLine();
      if (ml) { const mw = RX.font.measure(ml, 'mini'); mx.clearRect(W - mw - 4, 13, mw + 4, 8); g.miniR(ml, W - 2, 14, { c: C.amber, a: 0.95 }); }

      // scale + count
      const fy = footTop(g);
      scaleBar(g, A, fy - 8);
      const cnt = S.pois.length + ' MARKS';
      mx.clearRect(W - RX.font.measure(cnt, 'mini') - 3, fy - 9, RX.font.measure(cnt, 'mini') + 3, 8);
      g.miniR(cnt, W - 2, fy - 8, { a: 0.6 });

      // MARK flow overlays
      if (A.assign) {
        const bx = 4, bw = W - 8, bh = 33, by = fy - 12 - bh;
        mx.clearRect(bx, by, bw, bh); mx.frame(bx, by, bw, bh, C.amber, 1);
        g.text('MARK ' + A.assign.id.slice(-4) + ' · DROPPED', bx + 4, by + 3, { c: C.amber });
        g.text('FILE IT ▸ PRESS 1-6', bx + 4, by + 13);
        const left = Math.max(0, A.assign.until - Date.now());
        g.mini('AUTO-PEND ' + Math.ceil(left / 1000) + 'S · BACK = UNDO', bx + 4, by + 24, { c: C.amber, a: 0.9 });
        mx.rect(bx + bw - 46, by + 25, Math.round(42 * left / 5000), 3, C.amber, 1);
      } else if (A.filed && Date.now() < A.filed.until) {
        const bx = 4, bw = W - 8, bh = 23, by = fy - 12 - bh;
        const p = S.poi(A.filed.id);
        mx.clearRect(bx, by, bw, bh); mx.frame(bx, by, bw, bh, C.ink, 1);
        mx.disc(bx + 7, by + 7, 3, A.filed.color, 1);
        g.text(A.filed.id.slice(-4) + ' ▸ ' + A.filed.label, bx + 14, by + 4, { c: C.hot });
        const sub = 'FILED ' + F.hm(Date.now()) + (A.place ? ' · ' + A.place.area : '') + (p && p.name ? ' · ' + p.name : '');
        g.mini(g.fit(sub, bw - 10, 'mini'), bx + 4, by + 15, { a: 0.85 });
      }

      // mark flash
      if (A.flash && performance.now() - A.flash < 260) {
        const k = 1 - (performance.now() - A.flash) / 260;
        for (let y = 12; y < fy; y += 2) mx.hline(0, y, W, C.ink, 0.25 * k, 2);
      }
      g.footer(A.statusShown(g.t));
    }
  };

  // ---------------------------------------------------------------- pick (map point)
  RX.screens.pick = {
    map: true,
    animating: () => true,
    jogLabels: () => ['◂ OUT', 'IN ▸', 'PUSH · SET'],
    enter(st, params, A) {
      A.pick = params;
      st.wasFollow = M.follow; M.follow = false;
      if (params.lat != null) M.setView(params.lat, params.lng);
    },
    leave(st, A) { A.pick = null; },
    jog(d, st, A) { const v = A.view(); M.zoomBy(d * 0.5, v.cx, v.cy, v); },
    push(st, A) { this.set(st, A); },
    set(st, A) {
      const p = A.pick; if (!p) return;
      const lat = M.lat, lng = M.lng;
      A.back();
      A.beep('file');
      p.onPick(lat, lng);
    },
    render(g, st, A) {
      drawMap(g, A, { reticle: true, noHits: true });
      hud(g, A, (A.pick && A.pick.title) || 'PICK A POINT');
      g.footer('DRAG · MARK OR PUSH TO SET');
    }
  };

  // ======================================================================
  // LOG
  // ======================================================================
  const SORTS = ['NEAR', 'VISITS', 'NEW', 'A-Z'];
  function assetItems(A, st, onlyClassified) {
    const q = RX.font.norm(st.q || '').trim();
    let list = S.pois.filter(p => p.category || !onlyClassified);
    if (onlyClassified) list = list.filter(p => p.category);
    if (st.cat) list = list.filter(p => p.category === st.cat);
    if (q) list = list.filter(p => RX.font.norm([p.name, p.notes, p.category, U.typeLabel(p.type)].join(' ')).includes(q));
    const items = list.map(p => ({ p, m: distTo(A, p), b: brgTo(A, p) }));
    const sort = st.sort || 'NEAR';
    if (sort === 'NEAR') items.sort((a, b) => a.m - b.m);
    else if (sort === 'VISITS') items.sort((a, b) => (b.p.visits || 0) - (a.p.visits || 0) || a.m - b.m);
    else if (sort === 'NEW') items.sort((a, b) => (b.p.created || 0) - (a.p.created || 0));
    else items.sort((a, b) => S.markLabel(a.p).localeCompare(S.markLabel(b.p)));
    return items;
  }
  function assetFilters(g, st, y, A) {
    const W = g.W;
    g.btn(0, y, 21, 11, 'ALL', () => { st.cat = null; st.scroll = 0; }, { on: !st.cat, face: 'mini' });
    U.CATS.forEach((cat, i) => {
      const x = 23 + i * 15, on = st.cat === cat.id;
      const sel = g.focusable(x, y, 14, 11, () => { st.cat = on ? null : cat.id; st.scroll = 0; });
      g.mx.frame(x, y, 14, 11, on ? cat.color : C.ink, on || sel ? 1 : 0.3);
      g.mx.disc(x + 7, y + 5, 3, cat.color, !st.cat || on ? 1 : 0.3);
    });
    const sx = 23 + 6 * 15 + 2;
    g.btn(sx, y, W - sx, 11, (st.sort || 'NEAR') + ' ▸', () => { st.sort = SORTS[(SORTS.indexOf(st.sort || 'NEAR') + 1) % SORTS.length]; S.saveV2({ logSort: st.sort }); st.scroll = 0; }, { face: 'mini' });
    return y + 14;
  }
  function assetRows(g, st, A, items, y, onTap) {
    const W = g.W, top = g.sTop, bot = g.sBottom;
    items.forEach(it => {
      const p = it.p, h = 21;
      const visible = y + h >= top && y <= bot;
      const sel = g.row(0, y, W - 2, h - 1, () => onTap(p));
      if (visible) {
        g.pin(7, y + 9, p);
        const dist = Geo.fmtDist(it.m);
        const dw = RX.font.measure(dist, 'std');
        g.text(g.fit(S.markLabel(p), W - 18 - dw - 6), 15, y + 2, { c: sel ? C.hot : C.ink });
        g.textR(dist, W - 4, y + 2);
        const cat = U.catById(p.category);
        const meta = (cat ? cat.id : 'PENDING') + ' · ' + U.typeLabel(p.type) + ((p.visits || 0) ? ' · ×' + p.visits : '') + (p.tier === 3 ? ' · ★' : '');
        g.mini(g.fit(meta, W - 18 - 22, 'mini'), 15, y + 12, { a: 0.6 });
        g.miniR(Geo.cardinal(it.b) + ' ' + String(Math.round(it.b)).padStart(3, '0') + '°', W - 4, y + 12, { a: 0.6 });
        g.mx.hline(15, y + h - 1, W - 18, C.ink, 0.12, 2);
      }
      y += h;
    });
    return y;
  }

  RX.screens.log = {
    enter(st, params) {
      st.tab = params.tab || st.tab || 'assets';
      st.sort = S.v2.logSort || 'NEAR';
      st.range = S.v2.journalRange || 'today';
    },
    jog(d, st, A) {
      if (st.tab === 'journal') { st.scroll = Math.max(0, Math.min(st.scrollMax || 0, (st.scroll || 0) + d * 18)); return; }
      A.focusJog(d);
    },
    render(g, st, A) {
      const W = g.W;
      const pend = S.pending();
      let y = g.header('LOG', S.pois.length + ' MARKS · ' + S.regions.length + ' PLACES');
      const setTab = tb => () => { st.tab = tb; st.scroll = 0; st.sel = 0; st.jog = false; };
      g.seg(0, y, W, 13, [
        { label: 'ASSETS', on: st.tab === 'assets', fn: setTab('assets') },
        { label: 'PEND ' + F.pad2(pend.length), on: st.tab === 'pend', fn: setTab('pend'), c: pend.length ? C.amber : null },
        { label: 'JOURNAL', on: st.tab === 'journal', fn: setTab('journal') }
      ]);
      y += 16;
      const bottom = footTop(g);
      let foot = '';
      if (st.tab === 'assets') {
        y = assetFilters(g, st, y, A);
        g.field('log-find', 0, y, W, 13, { label: 'FIND', value: st.q || '', placeholder: 'NAME, NOTES, SYMBOL', onInput: v => { st.q = v; st.scroll = 0; }, onCommit: v => { st.q = v; } });
        y += 15;
        const items = assetItems(A, st, false);
        let yy = g.scrollBegin(y, bottom);
        yy = assetRows(g, st, A, items, yy, p => A.openMark(p.id));
        if (!items.length) { g.textC('NO MATCHES', W / 2, yy + 10, { a: 0.5 }); yy += 24; }
        g.scrollEnd(yy);
        foot = items.length + ' SHOWN · TAP TO OPEN';
      } else if (st.tab === 'pend') {
        g.mini('UNFILED MARKS · TAP A COLOR TO FILE, NAME ▸ TO OPEN', 1, y, { a: 0.6 });
        y += 9;
        let yy = g.scrollBegin(y, bottom);
        const list = pend.slice().sort((a, b) => (b.created || 0) - (a.created || 0));
        list.forEach(p => {
          const h = 33;
          g.pin(7, yy + 8, p);
          g.text(g.fit(p.name || ('MARK ' + p.id.slice(-4) + ' · UNNAMED'), W - 18), 15, yy + 1, { c: C.hot });
          g.mini(g.fit('DROPPED ' + F.day(p.created || Date.now()) + ' ' + F.hm(p.created || Date.now()) + ' · ' + Geo.fmtDist(distTo(A, p)) + ' ' + Geo.cardinal(brgTo(A, p)), W - 18, 'mini'), 15, yy + 11, { a: 0.6 });
          U.CATS.forEach((cat, i) => {
            const x = 15 + i * 18;
            const sel = g.focusable(x, yy + 19, 17, 11, () => {
              p.category = cat.id; p.type = p.type || 'NONE'; p.shape = 'ICON'; S.savePOIs();
              S.log('classify', p.id, 'Classified: ' + S.markLabel(p), cat.id);
              A.say(S.markLabel(p) + ' ▸ ' + cat.id, 3000); A.beep('file'); A.updateLamps();
            });
            g.mx.frame(x, yy + 19, 17, 11, sel ? C.hot : C.ink, sel ? 1 : 0.3);
            g.mx.disc(x + 8, yy + 24, 3, cat.color, 1);
          });
          g.btn(W - 36, yy + 19, 33, 11, 'NAME ▸', () => A.openMark(p.id), { face: 'mini' });
          g.mx.hline(0, yy + h - 1, W - 2, C.ink, 0.12, 2);
          yy += h;
        });
        if (!list.length) { g.textC('QUEUE CLEAR', W / 2, yy + 14, { c: C.hot }); g.textC('ALL MARKS FILED', W / 2, yy + 26, { face: 'mini', a: 0.6 }); yy += 40; }
        g.scrollEnd(yy);
        foot = list.length + ' WAITING';
      } else {
        const ranges = [['today', 'TODAY'], ['week', '7 DAYS'], ['month', '30 DAYS'], ['all', 'ALL']];
        g.seg(0, y, W, 11, ranges.map(r => ({ label: r[1], on: st.range === r[0], fn: () => { st.range = r[0]; st.scroll = 0; S.saveV2({ journalRange: r[0] }); } })), { face: 'mini' });
        y += 14;
        const now = new Date();
        const sod = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const from = st.range === 'today' ? sod : st.range === 'week' ? sod - 6 * 864e5 : st.range === 'month' ? sod - 29 * 864e5 : 0;
        const ents = S.journal.filter(e => e.ts >= from).sort((a, b) => b.ts - a.ts);
        let yy = g.scrollBegin(y, bottom);
        let lastDay = null;
        const top = g.sTop, bot = g.sBottom;
        ents.forEach(e => {
          const dk = new Date(e.ts).toDateString();
          if (dk !== lastDay) {
            lastDay = dk;
            if (yy + 10 >= top && yy <= bot) { g.mini(F.day(e.ts) + (new Date(e.ts).getFullYear() !== now.getFullYear() ? ' ' + new Date(e.ts).getFullYear() : ''), 1, yy + 3, { a: 0.55 }); g.mx.hline(48, yy + 5, W - 50, C.ink, 0.15, 2); }
            yy += 11;
          }
          if (yy + 9 >= top && yy <= bot) {
            g.mini(F.hm(e.ts), 1, yy + 1, { a: 0.6 });
            const p = e.poiId ? S.poi(e.poiId) : null;
            const cat = p ? U.catById(p.category) : null;
            if (e.type && e.type.indexOf('mission') === 0) g.hex(25, yy + 3, e.type === 'mission-complete' ? C.ink : C.obj, 0.8);
            else if (e.type === 'drop') g.mx.ring(25, yy + 3, 2, C.ink, 0.9, 2);
            else g.mx.disc(25, yy + 3, 2, cat ? cat.color : C.ink, e.type === 'delete' ? 0.3 : 1);
            const txt = RX.font.norm(e.summary || e.type) + (e.meta && e.type === 'visit' ? ' ' + String(e.meta).replace(/^.*·\s*/, '') : '');
            g.text(g.fit(txt, W - 34), 31, yy, { a: e.type === 'delete' ? 0.45 : 0.95 });
            if (p) g.hit(0, yy - 1, W, 9, () => A.openMark(p.id));
          }
          yy += 9;
        });
        if (!ents.length) { g.textC('NO EVENTS IN RANGE', W / 2, yy + 10, { a: 0.5 }); yy += 24; }
        g.scrollEnd(yy);
        foot = ents.length + ' EVENTS · JOG TO SCROLL';
      }
      g.footer(A.sayActive() ? A.statusShown(g.t) : foot);
    }
  };

  // ======================================================================
  // MARK DETAIL
  // ======================================================================
  RX.screens.mark = {
    enter(st, params) {
      const p = S.poi(params.id);
      st.id = params.id;
      st.orig = p ? JSON.stringify(p) : null;
      st.origCat = p ? p.category : null;
      st.origTier = p ? p.tier : null;
    },
    leave(st, A) {
      const p = S.poi(st.id);
      if (!p || !st.orig || st.deleted) return;
      if (JSON.stringify(p) === st.orig) return;
      if (!st.origCat && p.category) S.log('classify', p.id, 'Classified: ' + S.markLabel(p), p.category);
      else S.log('edit', p.id, 'Edited: ' + S.markLabel(p), p.category || '');
      if (st.origTier !== p.tier) S.log('tier', p.id, 'Tier → ' + TIER_NAMES[p.tier] + ': ' + S.markLabel(p), p.category || '');
    },
    jogLabels: () => ['◂ UP', 'DOWN ▸', 'PUSH SELECT · HOLD MAP'],
    render(g, st, A) {
      const W = g.W, mx = g.mx;
      const p = S.poi(st.id);
      if (!p) { g.header('MARK'); g.textC('MARK NOT FOUND', W / 2, 40); g.footer('BACK TO RETURN'); return; }
      const cat = U.catById(p.category);
      const save = () => { S.savePOIs(); A.updateLamps(); };
      let y = g.header(cat ? cat.id : 'PENDING MARK', 'MARK ' + p.id.slice(-4) + (p.tier === 3 ? ' · ★' : ''), { c: cat ? cat.color : C.ink });
      y = g.scrollBegin(y, footTop(g));

      // title block
      g.pin(8, y + 7, p, { r: 6 });
      g.text(g.fit(S.markLabel(p), W - 20), 18, y + 1, { c: C.hot });
      const reg = regionName(p.regionId);
      g.mini(g.fit((p.created ? 'FILED ' + F.dateY(p.created) : 'IMPORTED') + (reg ? ' · ' + reg : ''), W - 20, 'mini'), 18, y + 11, { a: 0.6 });
      y += 20;

      // nav box
      const m = distTo(A, p), b = brgTo(A, p);
      mx.frame(0, y, W - 2, 25, C.ink, 0.35);
      g.compass(13, y + 13, 9, b);
      const cols = [['DIST', Geo.fmtDist(m)], ['DIR', String(Math.round(b)).padStart(3, '0') + '° ' + Geo.cardinal(b)], ['VISITS', '×' + F.pad2(p.visits || 0)]];
      const cw = Math.floor((W - 30) / 3);
      cols.forEach((c, i) => { g.mini(c[0], 28 + i * cw, y + 4, { a: 0.55 }); g.text(c[1], 28 + i * cw, y + 12); });
      y += 28;
      const coord = p.lat.toFixed(5) + ', ' + p.lng.toFixed(5);
      g.mini(coord + (st.copied && Date.now() - st.copied < 1500 ? ' · COPIED' : ' · TAP TO COPY'), 1, y, { a: 0.6 });
      g.hit(0, y - 1, W, 8, () => {
        try { navigator.clipboard.writeText(coord); st.copied = Date.now(); A.say('COORDINATES COPIED', 2000); } catch (e) { A.say(coord, 4000); }
      });
      y += 10;

      // category
      y = g.section('CATEGORY', y, 'OR PRESS 1-6 AFTER MARK');
      const bw = Math.floor((W - 2) / 3);
      U.CATS.forEach((c, i) => {
        const x = (i % 3) * bw, yy = y + Math.floor(i / 3) * 14;
        const on = p.category === c.id;
        const sel = g.focusable(x, yy, bw - 1, 13, () => { p.category = c.id; p.type = p.type || 'NONE'; p.shape = 'ICON'; save(); A.beep('file'); });
        mx.frame(x, yy, bw - 1, 13, on ? c.color : C.ink, on ? 1 : (sel ? 0.9 : 0.3));
        if (on) mx.rect(x + 1, yy + 1, 2, 11, c.color, 1);
        mx.disc(x + 8, yy + 6, 3, c.color, on || !p.category ? 1 : 0.45);
        g.text(c.short, x + 14, yy + 3, { c: on ? c.color : C.ink, a: on ? 1 : 0.7 });
      });
      y += 30;

      // symbol
      y = g.section('SYMBOL', y, U.typeLabel(p.type || 'NONE'));
      const per = Math.max(5, Math.floor((W - 1) / 17));
      U.TYPES.forEach((tp, i) => {
        const x = (i % per) * 17, yy = y + Math.floor(i / per) * 16;
        const on = (p.type || 'NONE') === tp.id;
        const sel = g.focusable(x, yy, 16, 15, () => { p.type = tp.id; p.shape = 'ICON'; save(); });
        if (on || sel) mx.frame(x, yy, 16, 15, on ? C.hot : C.ink, on ? 1 : 0.6);
        g.pin(x + 8, yy + 7, { category: p.category || 'WAYPOINT', type: tp.id }, { a: p.category ? 1 : 0.6 });
      });
      y += Math.ceil(U.TYPES.length / per) * 16 + 3;

      // name / notes
      y = g.section('NAME', y);
      g.field('mk-name-' + p.id, 0, y, W - 2, 13, { value: p.name || '', placeholder: 'UNTITLED', maxLen: 80, onCommit: v => { p.name = String(v || '').trim(); save(); } });
      y += 16;
      y = g.section('NOTES', y);
      g.field('mk-notes-' + p.id, 0, y, W - 2, 30, { kind: 'area', value: p.notes || '', placeholder: 'OPTIONAL', maxLen: 600, onCommit: v => { p.notes = String(v || '').trim(); save(); } });
      if (p.notes && !(U.activeField && U.activeField.key === 'mk-notes-' + p.id)) {
        const lines = U.wrap(p.notes, Math.floor((W - 8) / 6));
        if (lines.length > 3) g.miniR('+' + (lines.length - 3) + ' LINES', W - 4, y + 23, { a: 0.6 });
      }
      y += 33;

      // tier
      y = g.section('MAP TIER', y, ({ 1: 'CLOSE ZOOM ONLY', 2: 'CITY ZOOM + CLOSER', 3: 'ALWAYS VISIBLE' })[p.tier || 2]);
      g.seg(0, y, W - 2, 13, [1, 2, 3].map(tr => ({ label: TIER_NAMES[tr] + (tr === 3 ? ' ★' : ''), on: (p.tier || 2) === tr, fn: () => { p.tier = tr; save(); } })));
      y += 16;

      // photo
      y = g.section('PHOTO', y, p.photo ? Math.round(p.photo.length * 0.75 / 1024) + ' KB' : '');
      if (p.photo) {
        const pw = 72, ph = 54;
        mx.frame(0, y, pw + 2, ph + 2, C.ink, 0.4);
        g.photo(p.id, p.photo, 1, y + 1, pw, ph);
        g.btn(pw + 6, y, W - pw - 8, 13, 'RETAKE', () => A.takePhoto(url => { p.photo = url; save(); }));
        g.btn(pw + 6, y + 16, W - pw - 8, 13, 'REMOVE', () => A.go('confirm', { title: 'REMOVE PHOTO', danger: true, confirm: 'REMOVE', lines: ['REMOVE THE PHOTO FROM', S.markLabel(p) + '?'], onConfirm: () => { p.photo = null; save(); } }), { c: C.red });
        y += ph + 5;
      } else {
        g.btn(0, y, W - 2, 13, '□ ADD PHOTO', () => A.takePhoto(url => { p.photo = url; save(); }));
        y += 16;
      }

      // visits
      y = g.section('VISITS', y);
      g.text('×' + (p.visits || 0) + (p.lastVisited ? ' · ' + F.date(p.lastVisited) : ' · NEVER'), 1, y + 2);
      g.btn(W - 58, y, 56, 11, '+ LOG VISIT', () => {
        p.visits = (p.visits || 0) + 1; p.lastVisited = Date.now(); save();
        S.log('visit', p.id, 'Visited (manual): ' + S.markLabel(p), (p.category || '') + ' · ×' + p.visits);
        A.say('VISIT LOGGED · ×' + p.visits, 2500); A.beep('ok');
      }, { face: 'mini' });
      y += 14;

      // objectives
      const linked = S.missions.filter(x => x.poiId === p.id);
      y = g.section('OBJECTIVES', y, linked.filter(x => x.status === 'active').length + ' ACTIVE');
      linked.slice().sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1)).slice(0, 6).forEach(x => {
        const sel = g.row(0, y, W - 2, 10, () => A.go('objective', { id: x.id }));
        g.hex(5, y + 4, x.status === 'active' ? (x.priority === 'urgent' ? C.red : C.obj) : C.ink, x.status === 'active' ? 1 : 0.4);
        g.text(g.fit(x.title, W - 50), 12, y + 1, { a: x.status === 'active' ? 1 : 0.45, c: sel ? C.hot : C.ink });
        g.miniR(x.status === 'active' ? (x.deadline ? 'DUE ' + F.date(x.deadline) : 'ACTIVE') : 'DONE', W - 4, y + 2, { a: 0.6 });
        y += 11;
      });
      g.btn(0, y, W - 2, 11, '+ OBJECTIVE HERE', () => {
        const mm = { id: 'MSN-' + Date.now(), title: S.markLabel(p), notes: '', priority: 'normal', status: 'active', created: Date.now(), completed: null, lat: p.lat, lng: p.lng, poiId: p.id, deadline: null };
        A.go('objective', { draft: mm });
      }, { face: 'mini' });
      y += 14;

      // actions
      y = g.section('ACTIONS', y);
      const aw = Math.floor((W - 2) / 3);
      g.btn(0, y, aw - 1, 13, '⊕ MOVE', () => A.go('pick', {
        title: 'MOVE ' + g.fit(S.markLabel(p), 100), lat: p.lat, lng: p.lng,
        onPick: (lat, lng) => { p.lat = lat; p.lng = lng; save(); A.say('MARK MOVED', 2500); }
      }));
      g.btn(aw, y, aw - 1, 13, '▸ MAPS', () => {
        const label = encodeURIComponent(S.markLabel(p));
        const https = 'https://maps.apple.com/?daddr=' + p.lat + ',' + p.lng + '&q=' + label;
        if (/iPhone|iPad|iPod/.test(navigator.userAgent)) { window.location.href = 'maps://?daddr=' + p.lat + ',' + p.lng + '&q=' + label; setTimeout(() => { window.location.href = https; }, 300); }
        else window.open(https, '_blank');
      });
      g.btn(aw * 2, y, W - 2 - aw * 2, 13, '× DELETE', () => A.go('confirm', {
        title: 'DELETE MARK', danger: true, confirm: 'DELETE',
        lines: ['DELETE ' + S.markLabel(p) + '?', 'VISITS AND NOTES GO WITH IT.', 'LINKED OBJECTIVES ARE KEPT.'],
        onConfirm: () => {
          st.deleted = true;
          S.pois = S.pois.filter(x => x.id !== p.id); S.savePOIs();
          S.log('delete', p.id, 'Deleted: ' + S.markLabel(p), p.category || '');
          A.updateLamps(); A.back(); A.say('MARK DELETED', 2500);
        }
      }), { c: C.red });
      y += 16;
      g.scrollEnd(y);
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'CHANGES SAVE AS YOU GO');
    }
  };

  // ---------------------------------------------------------------- mark picker
  RX.screens.markpick = {
    enter(st, params) { st.sort = 'NEAR'; },
    render(g, st, A) {
      const W = g.W;
      let y = g.header('LINK A MARK', 'NEAREST FIRST');
      g.field('mp-find', 0, y, W, 13, { label: 'FIND', value: st.q || '', placeholder: 'NAME, NOTES, SYMBOL', onInput: v => { st.q = v; st.scroll = 0; }, onCommit: v => { st.q = v; } });
      y += 15;
      const items = assetItems(A, st, true);
      let yy = g.scrollBegin(y, footTop(g));
      yy = assetRows(g, st, A, items, yy, p => { const cb = A.top().params.onPick; A.back(); cb(p); });
      g.scrollEnd(yy);
      g.footer('TAP A MARK TO LINK IT');
    }
  };

  // ======================================================================
  // FAST
  // ======================================================================
  function fastBar(g, y, frac) {
    const W = g.W, mx = g.mx, x0 = 1, w = W - 4;
    [[12, '12'], [16, '16'], [18, '18']].forEach(([h, l]) => g.mx.text(l, x0 + Math.round(w * h / 24) - 4, y, { face: 'mini', c: g.ink, a: 0.7 }));
    y += 7;
    for (let i = 0; i < 24; i++) {
      const sx = x0 + Math.round(w * i / 24), ex = x0 + Math.round(w * (i + 1) / 24) - 1;
      mx.rect(sx, y, ex - sx, 7, g.ink, i < Math.floor(frac * 24) ? 1 : (i < frac * 24 ? 0.6 : 0.12));
    }
    [12, 16, 18].forEach(h => mx.vline(x0 + Math.round(w * h / 24) - 1, y - 2, 11, C.hot, 0.9));
    y += 9;
    ['0', '6', '12', '18', '24H'].forEach((l, i) => mx.text(l, Math.min(W - RX.font.measure(l, 'mini') - 1, x0 + Math.round(w * i / 4) - (i ? 3 : 0)), y, { face: 'mini', c: g.ink, a: 0.5 }));
    return y + 8;
  }

  RX.screens.fast = {
    pal: 'amber',
    animating: () => true,
    jogLabels: st => st.edit ? ['◂ -15M', '+15M ▸', 'PUSH · DONE'] : ['◂ UP', 'DOWN ▸', 'PUSH SELECT · HOLD MAP'],
    jog(d, st, A) {
      if (st.edit) { const f = S.activeFast(); if (f) { f.startTs = Math.min(Date.now(), f.startTs + d * 15 * 60000); S.saveFasts(); } return; }
      A.focusJog(d);
    },
    push(st, A) { if (st.edit) { st.edit = false; A.refreshChrome(); A.say('START TIME SAVED', 2000); return; } A.focusPush(); },
    back(st, A) { if (st.edit) { st.edit = false; A.refreshChrome(); return true; } return false; },
    render(g, st, A) {
      const W = g.W, mx = g.mx;
      const f = S.activeFast(), fs = S.fastStreak();
      let y = g.header(f ? 'FAST · DAY ' + f.dayNum : 'FAST', 'STREAK ' + fs.current + (fs.atRisk ? ' · AT RISK' : ''), { c: C.amber });
      y = g.scrollBegin(y, footTop(g));
      if (f) {
        const el = Date.now() - f.startTs;
        g.mini(st.edit ? 'ADJUST START · JOG OR ±15M' : 'ELAPSED', 1, y, { a: 0.6 });
        y += 8;
        const s = F.dur(el);
        g.text(s, 1, y, { s: 3, c: C.amber });
        y += 24;
        g.mini('START ' + F.day(f.startTs) + ' ' + F.hm(f.startTs), 1, y, { a: 0.75 });
        g.miniR(el >= 18 * 36e5 ? '18H MET' : '18H IN ' + F.durHM(18 * 36e5 - el), W - 3, y, { a: 0.95, c: el >= 18 * 36e5 ? C.hot : C.amber });
        y += 10;
        y = fastBar(g, y, Math.min(1, el / 864e5));
        y += 2;
        if (st.edit) {
          const bw = Math.floor((W - 2) / 3);
          g.btn(0, y, bw - 1, 14, '-15M', () => { f.startTs -= 15 * 60000; S.saveFasts(); });
          g.btn(bw, y, bw - 1, 14, '+15M', () => { f.startTs = Math.min(Date.now(), f.startTs + 15 * 60000); S.saveFasts(); });
          g.btn(bw * 2, y, W - 2 - bw * 2, 14, 'DONE', () => { st.edit = false; A.refreshChrome(); }, { on: true });
        } else {
          const bw = Math.floor((W - 2) * 0.58);
          g.btn(0, y, bw, 14, '■ END FAST', () => { const e = S.endFast(); A.say('FAST ENDED · ' + e.hours + 'H · DAY ' + e.dayNum, 4000); A.beep('file'); A.updateLamps(); }, { solid: true });
          g.btn(bw + 2, y, W - 4 - bw, 14, 'EDIT START', () => { st.edit = true; A.refreshChrome(); });
        }
        y += 18;
      } else {
        const next = S.fasts.reduce((m, x) => Math.max(m, x.dayNum || 0), 0) + 1;
        const last = S.fasts.filter(x => x.endTs).sort((a, b) => b.endTs - a.endTs)[0];
        g.text('READY · DAY ' + next, 1, y + 2, { s: 2, c: C.amber });
        y += 20;
        if (last) g.mini('LAST FAST ENDED ' + F.day(last.endTs) + ' ' + F.hm(last.endTs) + ' · ' + last.hours + 'H', 1, y, { a: 0.7 });
        y += 10;
        g.btn(0, y, W - 2, 15, '▸ START FAST', () => { const n = S.startFast(); if (n) { A.say('FAST STARTED · DAY ' + n.dayNum, 3500); A.beep('file'); A.updateLamps(); } }, { solid: true });
        y += 19;
      }

      // history
      const done = S.fasts.filter(x => x.endTs).sort((a, b) => b.startTs - a.startTs);
      y = g.section('LAST FASTS', y, done.length + ' TOTAL');
      done.slice(0, 8).forEach(x => {
        const sel = g.row(0, y, W - 2, 10, () => A.go('fastrec', { id: x.id }));
        g.mini(F.day(x.startTs), 2, y + 2, { a: sel ? 1 : 0.7 });
        const bx = 48, bw = W - 48 - 30;
        mx.rect(bx, y + 2, bw, 5, C.amber, 0.12);
        mx.rect(bx, y + 2, Math.round(bw * Math.min(1, (x.hours || 0) / 24)), 5, C.amber, 0.95);
        g.textR((x.hours || 0).toFixed(1) + 'H', W - 4, y + 1);
        y += 11;
      });
      y += 2;

      // stats
      y = g.section('STATS', y);
      const week = done.filter(x => x.startTs > Date.now() - 7 * 864e5);
      const avg = week.length ? week.reduce((s, x) => s + (x.hours || 0), 0) / week.length : 0;
      const longest = done.reduce((m, x) => Math.max(m, x.hours || 0), 0);
      const boxes = [['7-DAY AVG', avg.toFixed(1) + 'H'], ['LONGEST', longest.toFixed(1) + 'H'], ['BEST RUN', String(fs.best)]];
      const bw = Math.floor((W - 2) / 3);
      boxes.forEach((b, i) => {
        mx.frame(i * bw, y, bw - 2, 22, C.amber, 0.35);
        g.mini(b[0], i * bw + 3, y + 3, { a: 0.6 });
        g.text(b[1], i * bw + 3, y + 11);
      });
      y += 26;

      // weigh-in
      const wi = S.weighins.slice().sort((a, b) => b.ts - a.ts)[0];
      y = g.section('WEIGH-IN', y, wi ? F.dateY(wi.ts) : '');
      g.text(wi ? wi.lbs + ' LB' + (wi.condition ? ' · ' + wi.condition : '') : 'NONE YET', 1, y + 3);
      g.field('weighin', W - 70, y, 68, 13, { kind: 'number', value: '', placeholder: '+ LBS', maxLen: 6, onCommit: v => {
        const n = parseFloat(String(v).replace(',', '.'));
        if (!isFinite(n) || n < 50 || n > 700) { if (v) A.say('ENTER A WEIGHT IN LB', 2500); return; }
        S.weighins.push({ id: S.healthId('WI'), ts: Date.now(), lbs: Math.round(n * 10) / 10, condition: S.activeFast() ? 'FASTED' : 'FED', notes: '' });
        S.saveWeighins(); A.say('WEIGH-IN SAVED · ' + n + ' LB', 3000); A.beep('ok');
      } });
      y += 17;
      g.scrollEnd(y);
      g.footer(A.sayActive() ? A.statusShown(g.t) : (f ? 'END FAST WHEN YOU EAT' : 'START AFTER YOUR LAST MEAL'));
    }
  };

  RX.screens.fastrec = {
    pal: 'amber',
    render(g, st, A) {
      const W = g.W;
      const f = S.fasts.find(x => x.id === A.top().params.id);
      if (!f) { g.header('FAST'); g.textC('NOT FOUND', W / 2, 40); g.footer('BACK TO RETURN'); return; }
      let y = g.header('FAST · DAY ' + (f.dayNum || '?'), f.endTs ? (f.hours || 0) + 'H' : 'IN PROGRESS', { c: C.amber });
      y = g.scrollBegin(y, footTop(g));
      const adj = (key, d) => () => { f[key] += d * 15 * 60000; if (f.endTs && f.endTs < f.startTs) f.endTs = f.startTs; S.recalcFastHours(f); S.saveFasts(); };
      const rowT = (label, key) => {
        y = g.section(label, y);
        g.text(f[key] ? F.day(f[key]) + ' ' + F.hm(f[key]) : '--', 1, y + 3);
        if (f[key]) {
          g.btn(W - 66, y, 32, 13, '-15M', adj(key, -1), { face: 'mini' });
          g.btn(W - 33, y, 31, 13, '+15M', adj(key, 1), { face: 'mini' });
        }
        y += 17;
      };
      rowT('START', 'startTs');
      rowT('END', 'endTs');
      y = g.section('DURATION', y);
      g.text(f.endTs ? f.hours + ' H' : F.dur(Date.now() - f.startTs), 1, y + 2, { s: 2 });
      y += 20;
      y = g.section('NOTES', y);
      g.field('fast-notes-' + f.id, 0, y, W - 2, 30, { kind: 'area', value: f.notes || '', placeholder: 'OPTIONAL', maxLen: 300, onCommit: v => { f.notes = String(v || '').trim(); S.saveFasts(); } });
      y += 34;
      g.btn(0, y, W - 2, 13, '× DELETE THIS FAST', () => A.go('confirm', {
        title: 'DELETE FAST', danger: true, confirm: 'DELETE', lines: ['DELETE DAY ' + f.dayNum + ' (' + F.day(f.startTs) + ')?'],
        onConfirm: () => { S.fasts = S.fasts.filter(x => x.id !== f.id); S.saveFasts(); A.back(); A.say('FAST DELETED', 2500); A.updateLamps(); }
      }), { c: C.red });
      y += 16;
      g.scrollEnd(y);
      g.footer('CHANGES SAVE AS YOU GO');
    }
  };

  // ======================================================================
  // SYSTEM MENU
  // ======================================================================
  const FOGS = ['CLEAR', 'LIGHT', 'MEDIUM', 'HEAVY'];
  const BRIGHT = { LOW: 0.62, MED: 0.85, HIGH: 1 };
  RX.applyBrightness = function () {
    document.getElementById('screen').style.setProperty('--rx-bright', BRIGHT[S.v2.brightness] || 0.85);
  };
  RX.screens.menu = {
    render(g, st, A) {
      const W = g.W, mx = g.mx;
      let y = g.header('SYSTEM', 'R.OS 2.0 · RP-1000');
      y = g.scrollBegin(y, footTop(g));
      const row = (label, desc, ctrl, fn, o) => {
        o = o || {};
        const sel = g.row(0, y, W - 2, 19, fn);
        g.text(label, 3, y + 2, { c: o.red ? C.red : (sel ? C.hot : C.ink) });
        if (desc) g.mini(g.fit(desc, W - 8 - (o.ctrlW || (ctrl ? 34 : 0)), 'mini'), 3, y + 11, { a: 0.55, c: o.red ? C.red : C.ink });
        if (ctrl) ctrl(y);
        mx.hline(3, y + 19, W - 6, C.ink, 0.1, 2);
        y += 20;
      };
      const tog = (on, labels) => yy => {
        const L = labels || ['ON', 'OFF'];
        const s = on ? L[0] : L[1];
        const w = RX.font.measure(s, 'std') + 12;
        mx.frame(W - 5 - w, yy + 4, w, 11, C.ink, on ? 0.9 : 0.35);
        mx.disc(W - 5 - w + 5, yy + 9, 1.5, labels && labels[2] ? labels[2] : C.ink, on ? 1 : 0.2);
        g.text(s, W - 5 - w + 9, yy + 6, { a: on ? 1 : 0.5 });
      };
      const val = (s, c) => yy => g.textR(s, W - 5, yy + 6, { c: c || C.ink });
      const arrow = yy => g.textR('▸', W - 5, yy + 6);

      y = g.section('01 · DISPLAY', y);
      row('BRIGHTNESS', 'SCREEN LEVEL · BLOOM', val(S.v2.brightness || 'MED'), () => { const k = ['LOW', 'MED', 'HIGH']; S.saveV2({ brightness: k[(k.indexOf(S.v2.brightness || 'MED') + 1) % 3] }); RX.applyBrightness(); });
      row('IDLE DIM', 'DIMS AFTER 60 S UNTOUCHED', tog(S.v2.idleDim), () => S.saveV2({ idleDim: !S.v2.idleDim }));
      row('KEY SOUNDS', 'CLICKS · FOLLOWS SILENT SWITCH', tog(S.v2.sound), () => { S.saveV2({ sound: !S.v2.sound }); A.beep('key'); });

      y = g.section('02 · PLACE NAMES', y + 2);
      row('LOOKUP', 'AREA · CITY · METRO VIA OPENSTREETMAP', tog(S.v2.placeLookup), () => { S.saveV2({ placeLookup: !S.v2.placeLookup }); if (S.v2.placeLookup && A.gps) A.placeLookup(A.gps.lat, A.gps.lng); });
      row('AUTO-NAME MARKS', 'STREET ADDRESS AS DEFAULT NAME', tog(S.v2.autoName !== false), () => S.saveV2({ autoName: S.v2.autoName === false }));
      row('NOW', A.place ? A.place.area + ' · ' + A.place.city + ' · ' + A.place.metro : (A.gps ? 'LOOKING UP' : 'NO FIX YET'), null, () => { if (A.gps) A.placeLookup(A.gps.lat, A.gps.lng); });
      row('PLACES VISITED', 'CITIES AND TOWNS ON RECORD', val(String(new Set(S.regions.map(r => r.name)).size)), null);

      y = g.section('03 · MAP, TRAIL & FOG', y + 2);
      const SRC = ['AUTO', 'ESRI', 'OSM'];
      row('MAP SOURCE', 'NOW ' + M.sourceName() + (M.loaded ? ' · OK' : '') + Object.keys(M.why).map(k => ' · ' + k + ' ' + M.why[k]).join(''), val(S.v2.mapSrc || 'AUTO'), () => {
        const nx = SRC[(SRC.indexOf(S.v2.mapSrc || 'AUTO') + 1) % SRC.length];
        S.saveV2({ mapSrc: nx }); M.setSource(nx); A.say('MAP SOURCE ▸ ' + (nx === 'AUTO' ? 'AUTO · ' + M.sourceName() : M.sourceName()), 2500);
      });
      row('RECORD TRAIL', S.trailMiles().toFixed(1) + ' MI · ' + S.trail.length + ' POINTS TODAY', tog(S.v2.recordTrail, ['REC', 'OFF', C.red]), () => { S.saveV2({ recordTrail: !S.v2.recordTrail }); A.updateLamps(); });
      row('SHOW TRAIL', 'DOTTED AMBER LINE ON THE MAP', tog(S.prefsV1.showTrail !== false), () => S.savePrefsV1({ showTrail: S.prefsV1.showTrail === false }));
      const mi2 = S.fog.size * 150 * 150 / 2589988;
      row('FOG DENSITY', F.num(S.fog.size) + ' CELLS · ' + mi2.toFixed(0) + ' SQ MI EXPLORED', val(S.prefsV1.fogOpacity || 'HEAVY'), () => { S.savePrefsV1({ fogOpacity: FOGS[(FOGS.indexOf(S.prefsV1.fogOpacity || 'HEAVY') + 1) % 4] }); M.dirty = true; });
      row("CLEAR TODAY'S TRAIL", S.trail.length + ' POINTS', arrow, () => A.go('confirm', { title: "CLEAR TODAY'S TRAIL", confirm: 'CLEAR', lines: ['REMOVE ' + S.trail.length + ' TRAIL POINTS', 'RECORDED TODAY?'], onConfirm: () => { S.trail = []; S.saveTrail(); A.say('TRAIL CLEARED', 2500); } }));
      row('CLEAR FOG', 'RESET ALL REVEALED TERRAIN', arrow, () => A.go('confirm', { title: 'CLEAR FOG', danger: true, confirm: 'CLEAR FOG', lines: ['RESET ' + F.num(S.fog.size) + ' REVEALED CELLS?', 'MARKS ARE NOT AFFECTED.', 'EXPORT A BACKUP FIRST.'], onConfirm: () => { S.fog.clear(); S.saveFog(); M.dirty = true; A.say('FOG CLEARED', 2500); } }), { red: true });

      y = g.section('04 · DATA', y + 2);
      const lb = S.v2.lastBackup;
      row('EXPORT BACKUP', 'LAST · ' + (lb ? F.dateY(lb) + ' · ' + F.ago(lb) : 'NEVER ON THIS DEVICE'), arrow, () => A.exportBackup());
      row('IMPORT BACKUP', 'REPLACE ALL DATA FROM A FILE', arrow, () => A.importBackup());
      const u = S.usage();
      row('STORAGE', (u.bytes / 1048576).toFixed(2) + ' OF ' + (u.limit / 1048576).toFixed(1) + ' MB', yy => {
        const bw = 60, bx = W - 5 - bw;
        mx.frame(bx, yy + 5, bw, 8, C.ink, 0.5);
        mx.rect(bx + 2, yy + 7, Math.round((bw - 4) * Math.min(1, u.bytes / u.limit)), 4, u.bytes / u.limit > 0.85 ? C.red : C.ink, 1);
      }, null, { ctrlW: 64 });

      y = g.section('05 · STATS', y + 2);
      row('LIFETIME STATS', 'MARKS · VISITS · TERRITORY · FIELD TIME', arrow, () => A.go('stats'));
      row('KEYBOARD', 'M MARK · 1-6 · F FN · ESC BACK · ARROWS', null, null);

      y = g.section('06 · DANGER', y + 2);
      row('DELETE ALL MARKS', 'PERMANENTLY REMOVE ' + S.pois.length + ' MARKS', arrow, () => A.go('confirm', { title: 'DELETE ALL MARKS', danger: true, confirm: 'DELETE ALL', lines: ['PERMANENTLY DELETE ALL', S.pois.length + ' MARKS?', 'EXPORT A BACKUP FIRST.'], onConfirm: () => { S.wipe('marks'); A.updateLamps(); A.say('ALL MARKS DELETED', 3000); } }), { red: true });
      row('FULL RESET', 'WIPE EVERYTHING ON THIS DEVICE', arrow, () => A.go('confirm', { title: 'FULL RESET', danger: true, confirm: 'WIPE ALL', lines: ['WIPE MARKS, FOG, TRAIL,', 'OBJECTIVES, FASTS, SETTINGS?', 'THIS CANNOT BE UNDONE.'], onConfirm: () => { S.wipe('all'); A.updateLamps(); M.dirty = true; A.say('DEVICE RESET', 3000); } }), { red: true });

      y += 6;
      g.textC('R.OS 2.0 · RP-1000', W / 2, y, { c: C.hot });
      g.textC('V2.0 · PWA · DATA STAYS ON THIS DEVICE', W / 2, y + 10, { face: 'mini', a: 0.5 });
      g.textC('MAP ' + M.credit(), W / 2, y + 18, { face: 'mini', a: 0.4 });
      y += 30;
      g.scrollEnd(y);
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'JOG SCROLLS · PUSH SELECTS');
    }
  };

  // ---------------------------------------------------------------- stats
  RX.screens.stats = {
    render(g, st, A) {
      const W = g.W, mx = g.mx;
      let y = g.header('LIFETIME STATS', F.dateY(Date.now()));
      y = g.scrollBegin(y, footTop(g));
      const kv = (k, v, c) => { g.text(k, 2, y + 1, { a: 0.75 }); g.textR(String(v), W - 4, y + 1, { c: c || C.hot }); mx.hline(2, y + 9, W - 6, C.ink, 0.08, 2); y += 10; };
      const classified = S.pois.filter(p => p.category);
      y = g.section('MARKS', y);
      kv('FILED', classified.length);
      kv('PENDING', S.pending().length, S.pending().length ? C.amber : null);
      kv('HIGH TIER ★', S.pois.filter(p => p.tier === 3).length);
      U.CATS.forEach(c => {
        const n = S.pois.filter(p => p.category === c.id).length;
        mx.disc(6, y + 4, 2, c.color, 1);
        g.text(c.id, 12, y + 1, { a: 0.75 });
        const bw = Math.round((W - 90) * n / Math.max(1, classified.length));
        mx.rect(70, y + 2, bw, 5, c.color, 0.85);
        g.textR(String(n), W - 4, y + 1);
        y += 10;
      });
      y = g.section('ACTIVITY', y + 2);
      const visits = S.pois.reduce((s, p) => s + (p.visits || 0), 0);
      kv('VISITS', visits);
      const top = S.pois.filter(p => p.visits).sort((a, b) => b.visits - a.visits).slice(0, 5);
      top.forEach((p, i) => {
        g.pin(6, y + 5, p, { r: 4 });
        g.text(g.fit(S.markLabel(p), W - 44), 14, y + 2, { a: 0.9 });
        g.textR('×' + p.visits, W - 4, y + 2, { c: C.hot });
        y += 11;
      });
      kv('LOG EVENTS', S.journal.length);
      y = g.section('TERRITORY', y + 2);
      kv('PLACES', new Set(S.regions.map(r => r.name)).size);
      kv('FOG CELLS', F.num(S.fog.size));
      kv('AREA EXPLORED', (S.fog.size * 22500 / 2589988).toFixed(1) + ' SQ MI');
      kv('TRAIL TODAY', S.trailMiles().toFixed(1) + ' MI');
      const first = S.journal.length ? Math.min(...S.journal.map(e => e.ts)) : null;
      if (first) kv('FIELD TIME', Math.ceil((Date.now() - first) / 864e5) + ' DAYS');
      y = g.section('OBJECTIVES · FASTS', y + 2);
      kv('OBJECTIVES DONE', S.missions.filter(m => m.status === 'complete').length + ' / ' + S.missions.length);
      const done = S.fasts.filter(f => f.endTs);
      kv('FASTS COMPLETED', done.length);
      kv('AVERAGE FAST', (done.length ? done.reduce((s, f) => s + (f.hours || 0), 0) / done.length : 0).toFixed(1) + ' H');
      g.scrollEnd(y + 4);
      g.footer('JOG ▸ SCROLL');
    },
    jog(d, st) { st.scroll = Math.max(0, Math.min(st.scrollMax || 0, (st.scroll || 0) + d * 18)); }
  };

  // ======================================================================
  // SEARCH
  // ======================================================================
  RX.screens.search = {
    enter(st, params, A) {
      st.q = ''; st.places = []; st.busy = false; st.err = null;
      U.openField('search-q', searchFieldOpts(st, A));
    },
    leave(st) { clearTimeout(st.timer); },
    render(g, st, A) {
      const W = g.W;
      let y = g.header('SEARCH', 'MARKS + PLACES');
      g.field('search-q', 0, y, W - 2, 15, searchFieldOpts(st, A));
      y += 18;
      y = g.scrollBegin(y, footTop(g));
      const q = RX.font.norm(st.q || '').trim();
      const coords = Geo.parseCoords(st.q || '');
      if (coords) {
        const sel = g.row(0, y, W - 2, 12, () => goTarget(A, coords.lat, coords.lng, coords.lat.toFixed(4) + ', ' + coords.lng.toFixed(4)));
        g.text('▸ GO TO ' + coords.lat.toFixed(4) + ', ' + coords.lng.toFixed(4), 2, y + 2, { c: sel ? C.hot : C.ink });
        y += 14;
      }
      if (!q) {
        const rec = S.v2.recent || [];
        y = g.section('RECENT', y);
        if (!rec.length) { g.mini('NOTHING YET', 2, y + 1, { a: 0.5 }); y += 10; }
        let x = 0;
        rec.forEach(r => {
          const w = RX.font.measure(r, 'mini') + 8;
          if (x + w > W - 2) { x = 0; y += 13; }
          g.btn(x, y, w, 11, r, () => { st.q = r; runSearch(st, A, true); U.openField('search-q', searchFieldOpts(st, A)); }, { face: 'mini' });
          x += w + 3;
        });
        y += 16;
        g.mini('TYPE A NAME OR ADDRESS · "29.74, -94.98" JUMPS', 1, y, { a: 0.5 });
        g.mini('TO COORDINATES · + MK SAVES A PLACE AS A MARK', 1, y + 8, { a: 0.5 });
        y += 18;
      } else {
        const items = S.pois.filter(p => RX.font.norm([p.name, p.notes, p.category, U.typeLabel(p.type)].join(' ')).includes(q))
          .map(p => ({ p, m: distTo(A, p), b: brgTo(A, p) })).sort((a, b) => a.m - b.m).slice(0, 6);
        y = g.section('YOUR MARKS · ' + items.length, y);
        y = assetRows(g, st, A, items, y, p => A.openMark(p.id));
        y = g.section('PLACES · OPENSTREETMAP', y + 2, st.busy ? 'SEARCHING' : (st.err ? 'OFFLINE' : st.places.length + ' FOUND'));
        st.places.forEach(r => {
          const h = 21;
          const sel = g.row(0, y, W - 40, h - 1, () => { pushRecent(st.q); goTarget(A, r.lat, r.lng, r.name); });
          const mx = g.mx;
          mx.frame(2, y + 4, 11, 11, C.ink, 0.9); mx.set(7, y + 9, C.ink, 1);
          mx.hline(0, y + 9, 2, C.ink, 0.9); mx.hline(13, y + 9, 2, C.ink, 0.9); mx.vline(7, y + 2, 2, C.ink, 0.9); mx.vline(7, y + 15, 2, C.ink, 0.9);
          g.text(g.fit(r.name, W - 60), 17, y + 2, { c: sel ? C.hot : C.ink });
          const m = Geo.meters(here(A).lat, here(A).lng, r.lat, r.lng);
          g.mini(g.fit((r.kind ? r.kind + ' · ' : '') + r.where + ' · ' + Geo.fmtDist(m) + ' ' + Geo.cardinal(Geo.bearing(here(A).lat, here(A).lng, r.lat, r.lng)), W - 60, 'mini'), 17, y + 12, { a: 0.6 });
          g.btn(W - 36, y + 4, 33, 12, '+ MK', () => {
            pushRecent(st.q);
            const id = 'POI-' + Date.now();
            S.pois.push({ id, lat: r.lat, lng: r.lng, category: null, name: r.name, notes: r.where || '', photo: null, hva: false, tier: 2, regionId: null, sector: null, created: Date.now() });
            S.savePOIs(); S.log('drop', id, 'Pin dropped', 'FROM SEARCH');
            A.updateLamps(); A.beep('mark'); A.go('mark', { id });
          }, { face: 'mini' });
          y += h;
        });
        if (!st.busy && !st.places.length && q.length >= 3 && !st.err) { g.mini('NO PLACES MATCH', 2, y + 1, { a: 0.5 }); y += 10; }
        if (st.err) { g.mini('PLACE SEARCH NEEDS A CONNECTION', 2, y + 1, { c: C.amber, a: 0.8 }); y += 10; }
      }
      g.scrollEnd(y + 4);
      g.footer(A.sayActive() ? A.statusShown(g.t) : (q ? 'TAP RESULT · +MK SAVES IT' : 'TYPE TO SEARCH'));
    }
  };
  function searchFieldOpts(st, A) {
    return {
      value: st.q || '', placeholder: 'NAME, ADDRESS OR LAT,LNG', maxLen: 80, label: '▸',
      onInput: v => { st.q = v; st.scroll = 0; clearTimeout(st.timer); st.timer = setTimeout(() => runSearch(st, A), 700); },
      onCommit: v => { st.q = v; runSearch(st, A, true); }
    };
  }
  async function runSearch(st, A, now) {
    const q = (st.q || '').trim();
    if (q.length < 3 || Geo.parseCoords(q)) { st.places = []; return; }
    if (st.lastQ === q && !now) return;
    st.lastQ = q; st.busy = true; st.err = null; A.dirty = true;
    try {
      const res = await Geo.search(q, here(A));
      if ((st.q || '').trim() !== q) return;
      const h = here(A);
      st.places = res.sort((a, b) => Geo.meters(h.lat, h.lng, a.lat, a.lng) - Geo.meters(h.lat, h.lng, b.lat, b.lng)).slice(0, 8);
    } catch (e) { st.err = true; st.places = []; }
    st.busy = false; A.dirty = true;
  }
  function pushRecent(q) {
    q = RX.font.norm(q || '').trim();
    if (!q) return;
    const rec = (S.v2.recent || []).filter(x => x !== q);
    rec.unshift(q);
    S.saveV2({ recent: rec.slice(0, 6) });
  }
  function goTarget(A, lat, lng, name) {
    A.target = { lat, lng, name: RX.font.norm(name).slice(0, 28) };
    A.home();
    M.setView(lat, lng, Math.max(M.zoom, 15)); A.follow(false);
    A.say('TARGET ▸ ' + A.target.name + ' · MARK OR LONG-PRESS TO SAVE', 5000);
  }

  // ======================================================================
  // LEGEND
  // ======================================================================
  RX.screens.legend = {
    render(g, st, A) {
      const W = g.W, mx = g.mx;
      const hidden = new Set(S.v2.hiddenCats || []);
      let y = g.header('LEGEND', (6 - hidden.size) + ' OF 6 SHOWN');
      y = g.scrollBegin(y, footTop(g));
      y = g.section('CATEGORIES · TAP TO HIDE ON MAP', y);
      U.CATS.forEach((c, i) => {
        const off = hidden.has(c.id);
        const n = S.pois.filter(p => p.category === c.id).length;
        const sel = g.row(0, y, W - 2, 18, () => {
          const h = new Set(S.v2.hiddenCats || []);
          off ? h.delete(c.id) : h.add(c.id);
          S.saveV2({ hiddenCats: [...h] });
          A.say(c.id + (off ? ' SHOWN' : ' HIDDEN') + ' ON MAP', 2000);
        });
        g.pin(8, y + 9, { category: c.id, type: 'NONE' }, { a: off ? 0.3 : 1 });
        g.text(c.id, 17, y + 2, { a: off ? 0.4 : 1, c: sel ? C.hot : C.ink });
        g.mini('PRESET ' + (i + 1) + ' · ' + F.pad2(n) + ' MARKS', 17, y + 11, { a: off ? 0.3 : 0.6 });
        const s = off ? 'HIDE' : 'SHOW';
        mx.disc(W - 34, y + 8, 1.5, C.ink, off ? 0.2 : 1);
        g.text(s, W - 29, y + 5, { a: off ? 0.4 : 1 });
        y += 19;
      });
      g.pin(8, y + 7, { category: null }, {});
      g.text('PENDING', 17, y + 1, { a: 0.9 });
      g.mini('UNFILED · ALWAYS SHOWN · ' + S.pending().length, 17, y + 10, { a: 0.6 });
      y += 20;

      y = g.section('SYMBOLS · GO INSIDE ANY COLOR', y + 2);
      const per = 3, cw = Math.floor((W - 2) / per);
      U.TYPES.forEach((tp, i) => {
        const x = (i % per) * cw, yy = y + Math.floor(i / per) * 15;
        g.pin(x + 7, yy + 6, { category: 'SUPPLY', type: tp.id });
        g.mini(tp.label, x + 15, yy + 4, { a: 0.75 });
      });
      y += Math.ceil(U.TYPES.length / per) * 15 + 4;

      y = g.section('MAP KEY', y);
      const key = (draw, label) => { draw(10, y + 5); g.mini(label, 24, y + 3, { a: 0.8 }); y += 12; };
      key((x, yy) => { mx.ring(x, yy, 4, C.ink, 0.5); mx.disc(x, yy, 1.6, C.hot, 1); for (let r = 3; r <= 6; r++) mx.set(x, yy - r, C.hot, 1); }, 'YOU · TICK SHOWS HEADING');
      key((x, yy) => mx.line(x - 7, yy + 2, x + 7, yy - 2, C.trail, 0.9, 2), "TODAY'S TRAIL");
      key((x, yy) => g.hex(x, yy, C.obj, 1), 'OBJECTIVE · RED = URGENT OR DUE');
      key((x, yy) => { mx.frame(x - 4, yy - 4, 9, 9, C.hot, 1); mx.set(x, yy, C.hot, 1); }, 'SEARCH TARGET');
      key((x, yy) => g.brackets(x, yy, 5, C.hot, 1), 'NEAREST IN RECALLED CATEGORY');
      key((x, yy) => { for (let i = -7; i <= 7; i += 2) mx.set(x + i, yy, C.water, 0.6); for (let i = -6; i <= 7; i += 2) mx.set(x + i, yy + 2, C.water, 0.6); }, 'WATER');
      key((x, yy) => { mx.hline(x - 8, yy, 17, C.ink, 1); mx.hline(x - 8, yy + 3, 17, C.ink, 0.4); }, 'MAJOR · MINOR ROADS');
      key((x, yy) => { for (let i = -8; i <= 8; i++) if ((i + 8) % 5 === 0) mx.set(x + i, yy, C.fog, 0.6); mx.hline(x - 8, yy + 3, 17, C.ink, 0.2); }, 'FOG · NOT EXPLORED YET');
      g.mini('MAP ' + M.credit(), 1, y + 2, { a: 0.45 });
      y += 10;
      g.scrollEnd(y + 4);
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'TAP A CATEGORY TO HIDE IT');
    }
  };

  // ======================================================================
  // OBJECTIVES
  // ======================================================================
  const pri = { urgent: 0, normal: 1 };
  function smartSort(a, b) {
    const d = (pri[a.priority] || 1) - (pri[b.priority] || 1);
    if (d) return d;
    const ad = a.deadline || Infinity, bd = b.deadline || Infinity;
    if (ad !== bd) return ad - bd;
    return b.created - a.created;
  }
  function toggleMission(m, A) {
    if (m.status === 'complete') { m.status = 'active'; m.completed = null; S.log('mission-reopen', m.id, 'Reopened: ' + m.title); A.say('REOPENED · ' + m.title, 2500); }
    else { m.status = 'complete'; m.completed = Date.now(); S.log('mission-complete', m.id, 'Completed: ' + m.title); A.say('DONE ▸ ' + m.title, 2500); A.beep('file'); }
    S.saveMissions(); A.updateLamps();
  }
  RX.screens.objectives = {
    enter(st) { st.tab = S.v2.objTab || 'active'; },
    render(g, st, A) {
      const W = g.W, mx = g.mx;
      const act = S.missions.filter(m => m.status === 'active'), done = S.missions.filter(m => m.status === 'complete');
      let y = g.header('OBJECTIVES', F.pad2(act.length) + ' ACTIVE');
      const setTab = tb => () => { st.tab = tb; st.scroll = 0; S.saveV2({ objTab: tb }); };
      g.seg(0, y, W, 13, [
        { label: 'ACTIVE ' + act.length, on: st.tab === 'active', fn: setTab('active') },
        { label: 'DONE ' + done.length, on: st.tab === 'complete', fn: setTab('complete') },
        { label: 'ALL', on: st.tab === 'all', fn: setTab('all') }
      ]);
      y += 16;
      g.field('obj-quick', 0, y, W - 2, 13, { label: '+', value: '', placeholder: 'QUICK ADD · WHAT NEEDS DOING', maxLen: 80, onCommit: v => {
        const title = String(v || '').trim(); if (!title) return;
        const m = { id: 'MSN-' + Date.now(), title, notes: '', priority: 'normal', status: 'active', created: Date.now(), completed: null, lat: null, lng: null, poiId: null, deadline: null };
        S.missions.push(m); S.saveMissions(); S.log('mission-create', m.id, 'Created: ' + title); A.say('ADDED ▸ ' + title, 2500); A.beep('ok'); A.updateLamps();
      } });
      y += 16;
      const list = (st.tab === 'active' ? act : st.tab === 'complete' ? done : S.missions.slice()).slice().sort((a, b) => st.tab === 'complete' ? (b.completed || 0) - (a.completed || 0) : smartSort(a, b));
      let yy = g.scrollBegin(y, footTop(g));
      const top = g.sTop, bot = g.sBottom;
      list.forEach(m => {
        const h = 22, vis = yy + h >= top && yy <= bot;
        const isDone = m.status === 'complete';
        const sel = g.row(12, yy, W - 14, h - 1, () => A.go('objective', { id: m.id }));
        g.focusable(0, yy + 3, 11, 11, () => toggleMission(m, A));
        if (vis) {
          mx.frame(1, yy + 4, 9, 9, C.ink, 0.9);
          if (isDone) { mx.rect(3, yy + 6, 5, 5, C.ink, 1); }
          const hot = !isDone && (m.priority === 'urgent' || (m.deadline && m.deadline < Date.now()));
          const tagW = !isDone && m.priority === 'urgent' ? 28 : 0;
          g.text(g.fit(m.title, W - 18 - tagW), 15, yy + 2, { a: isDone ? 0.45 : 1, c: sel ? C.hot : C.ink });
          if (tagW) { mx.frame(W - 29, yy + 1, 26, 9, C.red, 1); g.mini('URGENT', W - 27, yy + 3, { c: C.red, a: 1 }); }
          const p = m.poiId ? S.poi(m.poiId) : null;
          let meta = p ? S.markLabel(p) : (m.lat != null ? 'PIN ' + m.lat.toFixed(3) + ',' + m.lng.toFixed(3) : 'NO PLACE');
          if (m.lat != null) meta += ' · ' + Geo.fmtDist(Geo.meters(here(A).lat, here(A).lng, m.lat, m.lng));
          if (isDone) meta = 'DONE ' + F.date(m.completed || m.created) + ' · ' + meta;
          else if (m.deadline) meta = (m.deadline < Date.now() ? 'OVERDUE ' : 'DUE ') + F.date(m.deadline) + ' ' + F.hm(m.deadline) + ' · ' + meta;
          g.mini(g.fit(meta, W - 18, 'mini'), 15, yy + 12, { a: 0.6, c: hot ? C.red : C.ink });
          mx.hline(15, yy + h - 1, W - 18, C.ink, 0.1, 2);
        }
        yy += h;
      });
      if (!list.length) { g.textC(st.tab === 'active' ? 'NOTHING ACTIVE' : 'NONE', W / 2, yy + 10, { a: 0.5 }); yy += 24; }
      g.btn(0, yy + 2, W - 2, 13, '+ NEW OBJECTIVE · DEADLINE, PLACE, NOTES', () => A.go('objective', { draft: { id: 'MSN-' + Date.now(), title: '', notes: '', priority: 'normal', status: 'active', created: Date.now(), completed: null, lat: null, lng: null, poiId: null, deadline: null } }), { face: 'mini' });
      yy += 18;
      g.scrollEnd(yy);
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'BOX = DONE · ROW = OPEN');
    }
  };

  RX.screens.objective = {
    enter(st, params) {
      if (params.draft) { st.m = params.draft; st.isNew = true; }
      else { st.m = S.missions.find(x => x.id === params.id); st.isNew = false; st.orig = st.m ? JSON.stringify(st.m) : null; }
    },
    leave(st) {
      if (st.isNew || !st.m || st.deleted) return;
      if (JSON.stringify(st.m) !== st.orig) S.log('mission-edit', st.m.id, 'Edited: ' + st.m.title);
    },
    render(g, st, A) {
      const W = g.W, mx = g.mx, m = st.m;
      if (!m) { g.header('OBJECTIVE'); g.textC('NOT FOUND', W / 2, 40); g.footer('BACK TO RETURN'); return; }
      const save = () => { if (!st.isNew) S.saveMissions(); A.updateLamps(); };
      let y = g.header(st.isNew ? 'NEW OBJECTIVE' : 'OBJECTIVE', st.isNew ? '' : (m.status === 'complete' ? 'DONE ' + F.date(m.completed || m.created) : 'ACTIVE'), { c: m.priority === 'urgent' ? C.red : C.ink });
      y = g.scrollBegin(y, footTop(g));
      y = g.section('TITLE', y);
      g.field('ob-title-' + m.id, 0, y, W - 2, 13, { value: m.title, placeholder: 'WHAT NEEDS DOING', maxLen: 80, onCommit: v => { m.title = String(v || '').trim() || m.title; save(); } });
      y += 16;
      y = g.section('NOTES', y);
      g.field('ob-notes-' + m.id, 0, y, W - 2, 30, { kind: 'area', value: m.notes || '', placeholder: 'DETAILS, CONTEXT', maxLen: 600, onCommit: v => { m.notes = String(v || '').trim(); save(); } });
      y += 33;
      y = g.section('PRIORITY', y);
      g.seg(0, y, W - 2, 13, [
        { label: 'NORMAL', on: m.priority !== 'urgent', fn: () => { m.priority = 'normal'; save(); } },
        { label: 'URGENT', on: m.priority === 'urgent', fn: () => { m.priority = 'urgent'; save(); }, c: C.red }
      ]);
      y += 16;
      y = g.section('DEADLINE', y, m.deadline && m.status !== 'complete' ? (m.deadline < Date.now() ? 'OVERDUE' : 'IN ' + F.ago(Date.now() - (m.deadline - Date.now())).replace(' AGO', '')) : '');
      g.field('ob-date-' + m.id, 0, y, W - 40, 13, { kind: 'date', value: m.deadline || '', placeholder: 'NONE · TAP TO SET', onCommit: v => { m.deadline = v || null; save(); } });
      if (U.activeField && U.activeField.key === 'ob-date-' + m.id) { /* native picker open */ }
      else if (m.deadline) { g.mx.clearRect(3, y + 2, W - 46, 9); g.text(F.day(m.deadline) + ' ' + F.hm(m.deadline), 4, y + 3); }
      g.btn(W - 37, y, 35, 13, 'CLEAR', () => { m.deadline = null; save(); }, { face: 'mini', dim: !m.deadline });
      y += 16;
      y = g.section('PLACE', y);
      const p = m.poiId ? S.poi(m.poiId) : null;
      const placeTxt = p ? 'MARK ▸ ' + S.markLabel(p) : (m.lat != null ? 'PIN ▸ ' + m.lat.toFixed(4) + ', ' + m.lng.toFixed(4) : 'NO PLACE');
      g.text(g.fit(placeTxt, W - 4), 2, y + 1, { c: p ? (U.catById(p.category) || { color: C.ink }).color : C.ink, a: m.lat != null ? 1 : 0.5 });
      y += 11;
      g.seg(0, y, W - 2, 12, [
        { label: 'NONE', on: m.lat == null, fn: () => { m.lat = null; m.lng = null; m.poiId = null; save(); } },
        { label: 'HERE', fn: () => { if (!A.gps) { A.say('NO GPS FIX', 2000); return; } m.lat = A.gps.lat; m.lng = A.gps.lng; m.poiId = null; save(); } },
        { label: 'MARK', on: !!p, fn: () => A.go('markpick', { onPick: mk => { m.poiId = mk.id; m.lat = mk.lat; m.lng = mk.lng; save(); } }) },
        { label: 'MAP', on: m.lat != null && !p, fn: () => A.go('pick', { title: 'OBJECTIVE PLACE', lat: m.lat != null ? m.lat : M.lat, lng: m.lng != null ? m.lng : M.lng, onPick: (lat, lng) => { m.lat = lat; m.lng = lng; m.poiId = null; save(); } }) }
      ], { face: 'mini' });
      y += 16;
      if (st.isNew) {
        g.btn(0, y, W - 2, 15, '▸ CREATE OBJECTIVE', () => {
          if (!m.title.trim()) { A.say('GIVE IT A TITLE FIRST', 2500); A.beep('err'); return; }
          S.missions.push(m); S.saveMissions(); S.log('mission-create', m.id, 'Created: ' + m.title);
          st.isNew = false; A.updateLamps(); A.back(); A.say('CREATED ▸ ' + m.title, 2500); A.beep('file');
        }, { solid: true });
        y += 18;
      } else {
        const bw = Math.floor((W - 2) / 2);
        g.btn(0, y, bw - 1, 14, m.status === 'complete' ? 'REOPEN' : '✓ COMPLETE', () => toggleMission(m, A), { solid: true });
        g.btn(bw, y, W - 2 - bw, 14, '× DELETE', () => A.go('confirm', {
          title: 'DELETE OBJECTIVE', danger: true, confirm: 'DELETE', lines: ['DELETE "' + m.title + '"?'],
          onConfirm: () => { st.deleted = true; S.missions = S.missions.filter(x => x.id !== m.id); S.saveMissions(); S.log('mission-delete', m.id, 'Deleted: ' + m.title); A.updateLamps(); A.back(); A.say('OBJECTIVE DELETED', 2500); }
        }), { c: C.red });
        y += 18;
        g.mini('CREATED ' + F.dateY(m.created) + ' ' + F.hm(m.created), 1, y, { a: 0.45 });
        y += 9;
      }
      g.scrollEnd(y);
      g.footer(A.sayActive() ? A.statusShown(g.t) : (st.isNew ? 'FILL IN, THEN CREATE' : 'CHANGES SAVE AS YOU GO'));
    }
  };

  // ======================================================================
  // CONFIRM
  // ======================================================================
  RX.screens.confirm = {
    enter(st, params) { st.sel = params.danger ? 1 : 0; st.jog = true; },
    render(g, st, A) {
      const W = g.W, H = g.H, P = A.top().params;
      const c = P.danger ? C.red : C.ink;
      let y = g.header(P.title || 'CONFIRM', '', { c });
      const lines = (P.lines || []).filter(Boolean);
      const box = { x: 4, y: Math.max(y + 4, Math.floor(H / 2) - 40), w: W - 8 };
      let yy = box.y + 6;
      const wrapped = [];
      lines.forEach(l => U.wrap(l, Math.floor((box.w - 8) / 6)).forEach(x => wrapped.push(x)));
      const bh = wrapped.length * 10 + 40;
      g.mx.frame(box.x, box.y, box.w, bh, c, 0.9);
      wrapped.forEach(l => { g.textC(l, W / 2, yy, { c: C.hot }); yy += 10; });
      yy += 6;
      const bw = Math.floor((box.w - 12) / 2);
      g.btn(box.x + 4, yy, bw, 15, P.confirm || 'CONFIRM', () => { const fn = P.onConfirm; A.back(); if (fn) fn(); }, { c });
      g.btn(box.x + 8 + bw, yy, bw, 15, P.cancel || 'CANCEL', () => { const fn = P.onCancel; A.back(); if (fn) fn(); });
      g.footer('JOG CHOOSES · PUSH SELECTS');
    }
  };
})();
