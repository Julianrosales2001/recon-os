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
    if (S.v2.hicon) { const tw = RX.font.measure('HI-CON', 'mini') + 4; mx.rect(W - tw - 2, 13, tw, 7, '#FFFFFF', 1); g.miniR('HI-CON', W - 4, 14, { c: '#000000', a: 1 }); }

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
      if (f === 'LOT') return ['◂ OUT', 'IN ▸', 'DRUM ▸ READ LOT · HOLD RESET'];
      return ['◂ OUT', 'IN ▸', 'TAP LOCATE · HOLD RESET'];
    },
    jog(d, st, A) {
      const f = A.drumFace();
      if (f === 'SCAN') { A.scanStep(d); return; }
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
          : 'Z' + (Math.round(M.zoom * 2) / 2);
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

  // unfiled marks: tap a colour to file, NAME ▸ to open
  function pendRows(g, A, list, yy) {
    const W = g.W;
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
    return yy;
  }

  RX.screens.log = {
    enter(st, params) {
      st.tab = params.tab || st.tab || 'assets';
      if (st.tab === 'pend') st.tab = 'assets';
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
        { label: pend.length ? 'ASSETS ' + pend.length : 'ASSETS', on: st.tab === 'assets', fn: setTab('assets'), c: pend.length ? C.amber : null },
        { label: S.rolo.length ? 'ROLO ' + S.rolo.length : 'ROLO', on: st.tab === 'rolo', fn: setTab('rolo') },
        { label: 'JOURNAL', on: st.tab === 'journal', fn: setTab('journal') }
      ]);
      y += 16;
      const bottom = footTop(g);
      let foot = '';
      if (st.tab === 'assets') {
        y = assetFilters(g, st, y, A);
        g.field('log-find', 0, y, W, 13, { label: 'FIND', value: st.q || '', placeholder: 'NAME, NOTES, SYMBOL', onInput: v => { st.q = v; st.scroll = 0; }, onCommit: v => { st.q = v; } });
        y += 15;
        // unfiled marks ride on top until they're filed: knock them out first
        const showPend = pend.length && !st.cat && !(st.q || '').trim();
        const items = assetItems(A, st, !!showPend);
        let yy = g.scrollBegin(y, bottom);
        if (showPend) {
          yy = g.section('PENDING · FILE THESE FIRST', yy, String(pend.length));
          const list = pend.slice().sort((a, b) => (b.created || 0) - (a.created || 0));
          yy = pendRows(g, A, list, yy);
          yy = g.section('FILED', yy + 2, String(items.length));
        }
        yy = assetRows(g, st, A, items, yy, p => A.openMark(p.id));
        if (!items.length) { g.textC('NO MATCHES', W / 2, yy + 10, { a: 0.5 }); yy += 24; }
        g.scrollEnd(yy);
        foot = (showPend ? pend.length + ' PENDING · ' : '') + items.length + ' SHOWN · TAP TO OPEN';
      } else if (st.tab === 'rolo') {
        foot = RX.roloTab(g, st, A, y, bottom);
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
  function markLot(st, A, p) {
    if (st.lotBusy) return;
    st.lotBusy = true; st.lotErr = null; A.dirty = true;
    RX.parcel.at(p.lat, p.lng).then(async r => {
      if (!r) { st.lotErr = 'NO PARCEL ON RECORD HERE'; return; }
      const before = JSON.stringify(p) === st.orig;
      try { const t = RX.traffic.main(await RX.traffic.near(p.lat, p.lng, 1200)); r.traffic = t ? { road: t.road, aadt: t.aadt, year: t.year, trend5: t.trend5, dist: Math.round(t.dist) } : null; } catch (e) {}
      try { const [aa, cc] = await Promise.all([RX.area.at(p.lat, p.lng), RX.area.cityAt(p.lat, p.lng).catch(() => null)]); r.area = RX.area.brief(aa, cc); } catch (e) {}
      p.parcel = r; S.savePOIs();
      if (before) st.orig = JSON.stringify(p);   // a lookup is not an edit
      A.beep('ok');
    }).catch(() => { st.lotErr = 'NO SIGNAL'; }).then(() => { st.lotBusy = false; A.dirty = true; });
  }
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

      // ROLO cards that live here
      if (RX.roloFor) {
        const here2 = RX.roloFor(p.id);
        y = g.section('ROLO', y, here2.length ? String(here2.length) : '');
        here2.forEach(c => { const sel = g.row(0, y, W - 2, 11, () => A.go('contact', { id: c.id })); g.text(g.fit(c.name || 'NO NAME', W - 70), 3, y + 2, { c: sel ? C.hot : C.ink }); g.miniR(g.fit(c.trade || '', 64, 'mini'), W - 4, y + 3, { a: 0.6 }); y += 12; });
        g.btn(0, y, W - 2, 12, '+ ROLO CARD HERE', () => RX.roloNew(A, { poiId: p.id, name: p.name ? RX.font.norm(p.name) : '' }), { face: 'mini' });
        y += 16;
      }

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

      // lot: the county record for the ground the mark sits on
      y = g.section('LOT', y, p.parcel ? (p.parcel.county || '') + ' CO' : 'COUNTY RECORDS');
      if (p.parcel) {
        const r = p.parcel;
        g.text(g.fit(r.situs || 'NO SITE ADDRESS', W - 4), 1, y + 1, { c: C.hot });
        g.mini(g.fit('OWNER ' + (r.owner || '—'), W - 4, 'mini'), 1, y + 11, { a: 0.85 });
        g.mini(g.fit([RX.parcel.fmtAcres(r.acres), r.mkt ? RX.parcel.fmtMoney(r.mkt) : null, r.built ? 'BUILT ' + r.built : null].filter(Boolean).join(' · '), W - 4, 'mini'), 1, y + 19, { a: 0.7 });
        y += 27;
        if (r.traffic) { g.mini(g.fit('TRAFFIC ' + RX.traffic.full(r.traffic.aadt) + '/DAY · ' + r.traffic.road + ' · ' + Geo.fmtDist(r.traffic.dist) + (r.traffic.trend5 != null ? ' · ' + RX.traffic.pct(r.traffic.trend5) + ' 5 YR' : ''), W - 4, 'mini'), 1, y, { c: C.amber, a: 0.95 }); y += 9; }
        if (r.area) { const a = r.area; g.mini(g.fit((a.city ? a.city + ' · ' : '') + 'AREA INCOME ' + RX.area.money(a.income) + ' ' + RX.area.vs(a.income, a.cIncome) + ' · HOME ' + RX.area.money(a.home) + ' ' + RX.area.vs(a.home, a.cHome) + ' VS CO', W - 4, 'mini'), 1, y, { a: 0.8 }); y += 9; }
        const lw = Math.floor((W - 6) / 2);
        g.btn(0, y, lw, 12, 'DETAILS ▸', () => A.go('lotinfo', { lot: r, markId: p.id }), { face: 'mini' });
        g.btn(lw + 4, y, W - 6 - lw, 12, st.lotBusy ? 'READING...' : 'REFRESH', () => markLot(st, A, p), { face: 'mini' });
        y += 15;
      } else {
        g.btn(0, y, W - 2, 13, st.lotBusy ? 'READING COUNTY RECORDS...' : (st.lotErr ? st.lotErr + ' · TRY AGAIN' : '▸ LOOK UP THIS LOT'), () => markLot(st, A, p), { face: 'mini', c: st.lotErr ? C.amber : undefined });
        y += 16;
      }

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
      let y = g.header('SYSTEM', 'R.OS ' + RX.VERSION + ' · RP-1000');
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
      g.textC('R.OS ' + RX.VERSION + ' · RP-1000', W / 2, y, { c: C.hot });
      g.textC('V' + RX.VERSION + ' · PWA · DATA STAYS ON THIS DEVICE', W / 2, y + 10, { face: 'mini', a: 0.5 });
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
  RX.goTarget = (A, lat, lng, name) => goTarget(A, lat, lng, name);
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

  // ======================================================================
  // REF · pocket reference: first aid, knots, conversions.
  // Content ships as ref/*.json (cached by the service worker, so it works
  // with no signal). Index → entry; CONVERT is a live converter.
  // ======================================================================
  const REF = RX.ref = { data: {}, busy: false, err: false, V: '1' };
  REF.load = function (A) {
    if (REF.busy || (REF.data.aid && REF.data.knots && REF.data.conv && REF.data.cipher)) return;
    REF.busy = true; REF.err = false;
    const get = n => fetch('ref/' + n + '.json?v=' + REF.V).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    Promise.all([get('firstaid'), get('knots'), get('convert'), get('cipher')])
      .then(([aid, knots, conv, cipher]) => { REF.data = { aid, knots, conv, cipher }; })
      .catch(() => { REF.err = true; })
      .then(() => { REF.busy = false; if (A) A.dirty = true; });
  };
  const refReady = (g, A) => {
    if (REF.data.aid) return true;
    REF.load(A);
    g.textC(REF.err ? 'REFERENCE NOT LOADED' : 'LOADING…', g.W / 2, Math.floor(g.H / 2) - 4, { c: REF.err ? C.amber : C.ink, a: 0.8 });
    if (REF.err) g.miniR('CONNECT ONCE TO STORE IT ON THIS RP', g.W - 2, Math.floor(g.H / 2) + 8, { a: 0.6 });
    g.footer(REF.err ? 'BACK · TRY AGAIN LATER' : 'READING ROM');
    return false;
  };
  // lines of std text wrapped to a width in dots
  const para = (g, s, x, y, w, o) => { U.wrap(s, Math.max(4, Math.floor((w + 1) / 6))).forEach(l => { g.text(l, x, y, o); y += 9; }); return y; };

  RX.screens.ref = {
    jogLabels: () => ['◂ UP', 'DOWN ▸', 'PUSH OPEN · HOLD MAP'],
    enter(st, params, A) { REF.load(A); },
    render(g, st, A) {
      const W = g.W;
      let y = g.header('REFERENCE', 'FIELD ROM');
      if (!refReady(g, A)) return;
      const D = REF.data;
      y = g.scrollBegin(y, footTop(g));
      y = g.section('FIRST AID · ' + D.aid.items.length, y, 'CALL 911 FIRST');
      D.aid.items.forEach(it => {
        const sel = g.row(0, y, W - 2, 18, () => A.go('refentry', { kind: 'aid', id: it.id }));
        g.text(it.title, 4, y + 2, { c: sel ? C.hot : C.ink });
        g.mini(g.fit(it.tag, W - 10, 'mini'), 4, y + 11, { a: 0.6 });
        y += 19;
      });
      y = g.section('KNOTS · ' + D.knots.items.length, y + 3);
      D.knots.items.forEach(it => {
        const sel = g.row(0, y, W - 2, 18, () => A.go('refentry', { kind: 'knot', id: it.id }));
        g.text(it.title, 4, y + 2, { c: sel ? C.hot : C.ink });
        g.mini(g.fit(it.use, W - 10, 'mini'), 4, y + 11, { a: 0.6 });
        y += 19;
      });
      y = g.section('CONVERT · ' + D.conv.cats.length, y + 3);
      D.conv.cats.forEach(c => {
        const sel = g.row(0, y, W - 2, 18, () => A.go('refconv', { cat: c.id }));
        g.text(c.label, 4, y + 2, { c: sel ? C.hot : C.ink });
        g.mini(g.fit(c.units.map(u => u[0]).join(' · '), W - 10, 'mini'), 4, y + 11, { a: 0.6 });
        y += 19;
      });
      y = g.section('CIPHER · ' + (D.cipher.items.length + 1), y + 3, 'CODES & SIGNALS');
      { const sel = g.row(0, y, W - 2, 18, () => A.go('refcode', {}));
        g.text('CODE ▸ ENCODE / DECODE', 4, y + 2, { c: C.hot });
        g.mini(g.fit('MORSE · PHONETIC · ROT13 · KEYWORD · SEND BY LIGHT', W - 10, 'mini'), 4, y + 11, { a: sel ? 0.9 : 0.6 }); y += 19; }
      D.cipher.items.forEach(it => {
        const sel = g.row(0, y, W - 2, 18, () => A.go('reftable', { id: it.id }));
        g.text(it.title, 4, y + 2, { c: sel ? C.hot : C.ink });
        g.mini(g.fit(it.use, W - 10, 'mini'), 4, y + 11, { a: 0.6 });
        y += 19;
      });
      y += 4;
      U.wrap(D.aid.note, Math.floor((W - 6) / 4)).forEach((l, i) => g.mini(l, 2, y + i * 7, { a: 0.5 }));
      y += 26;
      g.scrollEnd(y);
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'JOG ▸ PICK · PUSH ▸ OPEN');
    }
  };

  RX.screens.refentry = {
    jogLabels: () => ['◂ UP', 'DOWN ▸', 'DRUM ▸ BACK · HOLD MAP'],
    jog(d, st) { st.scroll = Math.max(0, Math.min(st.scrollMax || 0, (st.scroll || 0) + d * 18)); },
    push(st) { st.scroll = Math.min(st.scrollMax || 0, (st.scroll || 0) + 60); },
    render(g, st, A) {
      const W = g.W, mx = g.mx, P = A.top().params;
      if (!REF.data.aid) { g.header('REFERENCE'); refReady(g, A); return; }
      const aid = P.kind === 'aid', list = aid ? REF.data.aid.items : REF.data.knots.items;
      const it = list.find(x => x.id === P.id) || list[0];
      const idx = list.indexOf(it) + 1;
      let y = g.header(it.title, (aid ? 'FIRST AID ' : 'KNOT ') + idx + '/' + list.length);
      y = g.scrollBegin(y, footTop(g));
      if (aid) {
        // the call box: amber, framed, first thing you read
        const lines = [];
        it.call.forEach(c => U.wrap(c, Math.floor((W - 16) / 6)).forEach((l, i) => lines.push({ l, first: i === 0 })));
        const bh = 13 + lines.length * 9 + 2;
        mx.frame(1, y, W - 4, bh, C.amber, 0.95);
        g.text('CALL 911 IF', 5, y + 3, { c: C.amber });
        let yy = y + 13;
        lines.forEach(o => { if (o.first) mx.rect(5, yy + 3, 2, 2, C.amber, 1); g.text(o.l, 10, yy, { c: C.amber, a: 0.95 }); yy += 9; });
        y += bh + 5;
      } else {
        g.mini('USE', 2, y + 1, { a: 0.55 });
        y = para(g, it.use, 18, y, W - 22, { c: C.hot });
        y += 4;
      }
      y = g.section(aid ? 'DO THIS' : 'TIE IT', y);
      it.steps.forEach((s, i) => {
        g.textR(String(i + 1), 10, y, { c: C.hot });
        y = para(g, s, 15, y, W - 19, {});
        y += 4;
      });
      if (it.dont && it.dont.length) {
        y = g.section('DON\'T', y + 1);
        it.dont.forEach(s => { mx.hline(4, y + 3, 5, C.red, 1); y = para(g, s, 15, y, W - 19, { c: C.red, a: 0.95 }); y += 3; });
      }
      if (it.tip) { y = g.section('NOTE', y + 1); y = para(g, it.tip, 4, y, W - 8, { a: 0.75 }); }
      y += 4;
      U.wrap(aid ? REF.data.aid.source : REF.data.knots.note, Math.floor((W - 6) / 4)).forEach(l => { g.mini(l, 2, y, { a: 0.45 }); y += 7; });
      y += 6;
      // next / prev without going back to the index
      const prev = list[(idx - 2 + list.length) % list.length], next = list[idx % list.length];
      const bw = Math.floor((W - 8) / 2);
      g.btn(1, y, bw, 13, '◂ ' + g.fit(prev.title, bw - 16, 'mini'), () => A.replace('refentry', { kind: P.kind, id: prev.id }), { face: 'mini' });
      g.btn(W - 3 - bw, y, bw, 13, g.fit(next.title, bw - 16, 'mini') + ' ▸', () => A.replace('refentry', { kind: P.kind, id: next.id }), { face: 'mini' });
      y += 17;
      g.scrollEnd(y);
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'JOG ▸ SCROLL · DRUM ▸ BACK');
    }
  };

  // ---- converter
  function convFmt(x) {
    if (!isFinite(x)) return '—';
    const a = Math.abs(x);
    if (a !== 0 && (a >= 1e9 || a < 1e-4)) return x.toExponential(3).replace('e', 'E').replace('+', '');
    let s = a >= 1000 ? x.toFixed(a >= 1e5 ? 0 : 2) : x.toPrecision(6);
    if (s.indexOf('.') >= 0 && s.indexOf('E') < 0) s = s.replace(/0+$/, '').replace(/\.$/, '');
    const parts = s.split('.'); parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  }
  const toBase = (u, v) => u[1] === 'F' ? (v - 32) * 5 / 9 : u[1] === 'C' ? v : u[1] === 'K' ? v - 273.15 : v * u[1];
  const fromBase = (u, b) => u[1] === 'F' ? b * 9 / 5 + 32 : u[1] === 'C' ? b : u[1] === 'K' ? b + 273.15 : b / u[1];
  function convStep(v) { const a = Math.abs(v); return a < 1 ? 0.01 : a < 10 ? 0.1 : a < 1000 ? 1 : a < 10000 ? 10 : 100; }
  function convFieldOpts(st, A) {
    return { kind: 'number', value: String(st.value), placeholder: 'VALUE', maxLen: 16, label: st.from,
      onInput: v => { const n = parseFloat(String(v).replace(/,/g, '')); if (isFinite(n)) { st.value = n; A.dirty = true; } },
      onCommit: v => { const n = parseFloat(String(v).replace(/,/g, '')); if (isFinite(n)) st.value = n; } };
  }
  RX.screens.refconv = {
    jogLabels: () => ['◂ LESS', 'MORE ▸', 'PUSH ▸ NEXT UNIT'],
    enter(st, params, A) {
      REF.load(A);
      st.cat = params.cat || 'length';
      const saved = (S.v2.conv || {})[st.cat];
      st.from = saved ? saved.from : null; st.value = saved ? saved.value : null;
    },
    leave(st) {
      if (!st.from) return;
      const conv = Object.assign({}, S.v2.conv || {}); conv[st.cat] = { from: st.from, value: st.value }; S.saveV2({ conv });
    },
    jog(d, st, A) {
      if (st.value == null) return;
      const step = convStep(st.value);
      st.value = Math.round((st.value + d * step) / step) * step;
      st.value = parseFloat(st.value.toPrecision(10));
      if (U.activeField && U.activeField.key === 'conv-v') U.openField('conv-v', convFieldOpts(st, A));
    },
    push(st, A) {
      const cat = REF.data.conv && REF.data.conv.cats.find(c => c.id === st.cat); if (!cat) return;
      const i = cat.units.findIndex(u => u[0] === st.from), u0 = cat.units[i], u1 = cat.units[(i + 1) % cat.units.length];
      st.value = parseFloat(fromBase(u1, toBase(u0, st.value)).toPrecision(8)); st.from = u1[0];
      A.beep('key');
    },
    render(g, st, A) {
      const W = g.W, mx = g.mx;
      if (!REF.data.conv) { g.header('CONVERT'); refReady(g, A); return; }
      const cats = REF.data.conv.cats, cat = cats.find(c => c.id === st.cat) || cats[0];
      if (!st.from || !cat.units.some(u => u[0] === st.from)) { st.from = cat.default; st.value = cat.value; }
      const ci = cats.indexOf(cat);
      let y = g.header('CONVERT · ' + cat.label, (ci + 1) + '/' + cats.length);
      // category strip: two rows of small keys
      const per = 4, cw = Math.floor((W - 2) / per);
      cats.forEach((c, i) => {
        const bx = (i % per) * cw, by = y + Math.floor(i / per) * 13;
        g.btn(bx, by, cw - 2, 12, c.label, () => { if (c.id !== st.cat) A.replace('refconv', { cat: c.id }); }, { face: 'mini', on: c.id === cat.id });
      });
      y += Math.ceil(cats.length / per) * 13 + 3;
      g.field('conv-v', 0, y, W - 2, 15, convFieldOpts(st, A));
      y += 19;
      const from = cat.units.find(u => u[0] === st.from), base = toBase(from, st.value);
      y = g.scrollBegin(y, footTop(g));
      g.section('EQUALS · TAP A UNIT TO CONVERT FROM IT', y); y += 9;
      cat.units.forEach(u => {
        const me = u[0] === st.from;
        const v = me ? st.value : fromBase(u, base);
        const sel = g.row(0, y, W - 2, 13, () => { st.value = parseFloat(v.toPrecision(8)); st.from = u[0]; U.closeField(false); A.beep('key'); });
        if (me) mx.rect(2, y + 2, 2, 9, C.hot, 1);
        g.text(u[0], 7, y + 3, { c: me ? C.hot : C.ink, a: me ? 1 : 0.75 });
        g.textR(convFmt(v), W - 5, y + 3, { c: me || sel ? C.hot : C.ink });
        mx.hline(2, y + 12, W - 6, C.ink, 0.08, 2);
        y += 13;
      });
      y += 4;
      U.wrap(REF.data.conv.note, Math.floor((W - 6) / 4)).forEach(l => { g.mini(l, 2, y, { a: 0.45 }); y += 7; });
      g.scrollEnd(y + 4);
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'TYPE OR TURN THE JOG · PUSH ▸ NEXT UNIT');
    }
  };

  // ---------- CIPHER: reference tables + a live encoder ----------
  // a Morse string drawn as marks: dot 2×2, dash 6×2
  function morseMarks(mx, code, x, y, c, a) {
    for (const ch of code) { if (ch === '.') { mx.rect(x, y, 2, 2, c, a); x += 4; } else if (ch === '-') { mx.rect(x, y, 6, 2, c, a); x += 8; } }
    return x;
  }
  const cleanMorse = s => String(s).replace(/[•·∙]/g, '.').replace(/[—–_−]/g, '-');
  const CODEC = {
    morseEnc(s) { const M = REF.data.cipher.morse; return s.toUpperCase().trim().split(/\s+/).map(w => [...w].map(c => M[c] || '').filter(Boolean).join(' ')).filter(Boolean).join(' / '); },
    morseDec(s) {
      const M = REF.data.cipher.morse, R = {}; Object.keys(M).forEach(k => { R[M[k]] = k; });
      return cleanMorse(s).trim().split(/\s*[\/|]\s*|\s{3,}/).map(w => w.trim().split(/\s+/).filter(Boolean).map(k => R[k] || '?').join('')).join(' ');
    },
    natoEnc(s) { const N = REF.data.cipher.nato, D = REF.data.cipher.num; return s.toUpperCase().trim().split(/\s+/).map(w => [...w].map(c => N[c] || D[c] || '').filter(Boolean).join(' ')).filter(Boolean).join(' / '); },
    natoDec(s) {
      const N = REF.data.cipher.nato, D = REF.data.cipher.num, R = { ALPHA: 'A', JULIET: 'J', 'X-RAY': 'X', WHISKY: 'W', ONE: '1', TWO: '2', THREE: '3', FOUR: '4', FIVE: '5', SEVEN: '7', EIGHT: '8', NINE: '9', NINER: '9', FOWER: '4' };
      Object.keys(N).forEach(k => { R[N[k]] = k; }); Object.keys(D).forEach(k => { R[D[k]] = k; R[D[k].replace(/-/g, '')] = k; });
      return s.toUpperCase().trim().split(/\s*[\/|]\s*/).map(w => w.split(/[\s,·]+/).filter(Boolean).map(t => R[t] || (t.length === 1 ? t : '?')).join('')).join(' ');
    },
    rot13: s => s.toUpperCase().replace(/[A-Z]/g, c => String.fromCharCode((c.charCodeAt(0) - 52) % 26 + 65)),
    vig(s, key, dir) {
      const k = String(key || '').toUpperCase().replace(/[^A-Z]/g, ''); if (!k) return s.toUpperCase();
      let i = 0;
      return s.toUpperCase().replace(/[A-Z]/g, c => { const sh = (k.charCodeAt(i++ % k.length) - 65) * dir; return String.fromCharCode(((c.charCodeAt(0) - 65 + sh) % 26 + 26) % 26 + 65); });
    }
  };
  const CODE_MODES = ['MORSE', 'PHONETIC', 'ROT13', 'KEYWORD'];
  function codeRun(mode, text, key, dec) {
    if (!text) return '';
    if (mode === 'MORSE') return dec ? CODEC.morseDec(text) : CODEC.morseEnc(text);
    if (mode === 'PHONETIC') return dec ? CODEC.natoDec(text) : CODEC.natoEnc(text);
    if (mode === 'ROT13') return CODEC.rot13(text);
    return CODEC.vig(text, key, dec ? -1 : 1);
  }
  // Morse as a timeline of on/off spans (units), each tagged with its letter
  function morseTimeline(plain) {
    const M = REF.data.cipher.morse, seq = [];
    plain.toUpperCase().trim().split(/\s+/).forEach((w, wi) => {
      if (wi) seq.push({ on: false, u: 4, ch: ' ' });           // 3 already after the letter + 4 = 7
      [...w].forEach(c => {
        const code = M[c]; if (!code) return;
        [...code].forEach((e, k) => { if (k) seq.push({ on: false, u: 1, ch: c, code }); seq.push({ on: true, u: e === '-' ? 3 : 1, ch: c, code }); });
        seq.push({ on: false, u: 3, ch: c, code });
      });
    });
    let t = 0; seq.forEach(s => { s.at = t; t += s.u; });
    return { seq, total: t };
  }
  function codeSend(st, A, plain) {
    if (st.tx) { st.tx = null; A.say('SEND STOPPED', 1500); A.lcdDirty = true; return; }
    const tl = morseTimeline(plain || '');
    if (!tl.seq.length) { A.say('NOTHING TO SEND', 1800); return; }
    st.tx = { tl, t0: performance.now() + 600, last: -1 };
    A.say('SENDING · PUSH OR TAP TO STOP', 2500);
  }
  const codeOpts = (st, A) => ({ kind: 'text', value: st.text || '', placeholder: st.dec ? 'PASTE CODE TO READ' : 'TYPE A MESSAGE', maxLen: 160, label: st.dec ? 'IN' : 'MSG',
    onInput: v => { st.text = v; A.dirty = true; A.lcdDirty = true; }, onCommit: v => { st.text = v; S.saveV2({ code: { text: st.text, key: st.key, mode: st.mode, dec: st.dec } }); } });
  const keyOpts = (st, A) => ({ kind: 'text', value: st.key || '', placeholder: 'KEYWORD', maxLen: 24, label: 'KEY',
    onInput: v => { st.key = v; A.dirty = true; }, onCommit: v => { st.key = v; S.saveV2({ code: { text: st.text, key: st.key, mode: st.mode, dec: st.dec } }); } });
  RX.screens.refcode = {
    animating: st => !!st.tx,
    jogLabels: st => st.tx ? ['◂ SLOWER', 'FASTER ▸', 'PUSH ▸ STOP'] : ['◂ MODE', 'MODE ▸', st && st.dec ? 'PUSH ▸ ENCODE' : 'PUSH ▸ DECODE'],
    enter(st, params, A) {
      REF.load(A);
      const c = S.v2.code || {};
      st.text = c.text || ''; st.key = c.key || 'BAYTOWN'; st.mode = CODE_MODES.includes(c.mode) ? c.mode : 'MORSE'; st.dec = !!c.dec; st.wpm = 8;
    },
    leave(st) { st.tx = null; S.saveV2({ code: { text: st.text, key: st.key, mode: st.mode, dec: st.dec } }); },
    jog(d, st, A) {
      if (st.tx) { st.wpm = Math.max(4, Math.min(20, st.wpm + d)); A.say(st.wpm + ' WPM', 1200); return; }
      st.mode = CODE_MODES[(CODE_MODES.indexOf(st.mode) + d + CODE_MODES.length) % CODE_MODES.length]; A.lcdDirty = true; A.refreshChrome && A.refreshChrome();
    },
    push(st, A) {
      if (st.tx) { st.tx = null; A.lcdDirty = true; A.refreshChrome && A.refreshChrome(); return; }
      // flip: the output becomes the new input
      const out = codeRun(st.mode, st.text, st.key, st.dec);
      st.dec = !st.dec; if (out && !/\?/.test(out)) st.text = out;
      U.closeField(false); A.beep('key'); A.refreshChrome && A.refreshChrome(); A.lcdDirty = true;
    },
    lcd(st) {
      if (st.tx) { const cur = st.tx.cur; return { rows: [['SEND', 'MORSE · ' + st.wpm + ' WPM'], ['CHAR', cur ? (cur.ch === ' ' ? '(SPACE)' : cur.ch) : '--'], ['CODE', cur && cur.code ? cur.code : '']], tag: 'TX' }; }
      return { rows: [['MODE', st.mode], ['DIR', st.dec ? 'DECODE' : 'ENCODE'], ['LEN', String((st.text || '').length) + ' CHARS']], tag: 'CPH' };
    },
    lcdTap(st, A) { const plain = st.dec ? codeRun(st.mode, st.text, st.key, true) : st.text; codeSend(st, A, plain); A.refreshChrome && A.refreshChrome(); },
    render(g, st, A) {
      const W = g.W, H = g.H, mx = g.mx;
      if (!REF.data.cipher) { g.header('CODE'); refReady(g, A); return; }
      // sending: the whole screen is the lamp
      if (st.tx) {
        const unit = 1200 / st.wpm, el = (performance.now() - st.tx.t0) / unit, tl = st.tx.tl;
        let idx = -1; for (let i = 0; i < tl.seq.length; i++) if (el >= tl.seq[i].at) idx = i; else break;
        const cur = tl.seq[idx];
        if (idx !== st.tx.last) { st.tx.last = idx; st.tx.cur = cur; A.lcdDirty = true; if (cur && cur.on) A.beep('morse', cur.u * unit / 1000); }
        if (el >= tl.total) { st.tx = null; A.say('SENT', 1500); A.refreshChrome && A.refreshChrome(); A.lcdDirty = true; return; }
        g.hit(0, 0, W, H, () => { st.tx = null; A.lcdDirty = true; A.refreshChrome(); });
        if (cur && cur.on) mx.rect(0, 0, W, H, C.hot, 1);
        else { mx.clearRect(0, 0, W, H); if (cur) g.textC(cur.ch === ' ' ? '·' : cur.ch, W / 2, H / 2 - 14, { s: 4, c: C.ink, a: 0.25 }); if (idx < 0) g.textC('READY', W / 2, H / 2 - 4, { a: 0.5 }); }
        mx.clearRect(0, H - 11, W, 11); g.footer('SENDING · ' + st.wpm + ' WPM', Math.round(el / tl.total * 100) + '%');
        return;
      }
      let y = g.header('CODE · ' + (st.dec ? 'DECODE' : 'ENCODE'), 'JOG ▸ MODE');
      const mw = Math.floor((W - 2) / CODE_MODES.length);
      CODE_MODES.forEach((m, i) => g.btn(i * mw, y, mw - 2, 12, m, () => { st.mode = m; A.lcdDirty = true; }, { face: 'mini', on: m === st.mode }));
      y += 15;
      g.field('code-msg', 0, y, W - 2, 15, codeOpts(st, A)); y += 18;
      if (st.mode === 'KEYWORD') { g.field('code-key', 0, y, W - 2, 15, keyOpts(st, A)); y += 18; }
      const hw = Math.floor((W - 6) / 2);
      g.btn(0, y, hw, 13, st.dec ? 'ENCODE ◂' : 'DECODE ▸', () => RX.screens.refcode.push(st, A), { face: 'mini' });
      g.btn(hw + 4, y, W - 6 - hw, 13, 'SEND BY LIGHT ▸', () => RX.screens.refcode.lcdTap(st, A), { face: 'mini', c: C.amber });
      y += 16;
      y = g.scrollBegin(y, footTop(g));
      const text = st.text || '';
      if (st.dec) {
        y = g.section('READS AS · ' + st.mode, y);
        const out = codeRun(st.mode, text, st.key, true);
        y = para(g, out || '—', 2, y + 1, W - 4, { c: C.hot }) + 2;
        if (/\?/.test(out)) { g.mini('? = A GROUP THAT ISN\'T VALID ' + st.mode, 2, y, { c: C.amber, a: 0.9 }); y += 9; }
        if (st.mode === 'MORSE') { g.mini('SPACE BETWEEN LETTERS · / BETWEEN WORDS', 2, y, { a: 0.5 }); y += 9; }
      } else {
        CODE_MODES.forEach(m => {
          const on = m === st.mode, out = codeRun(m, text, st.key, false);
          y = g.section(m + (m === 'KEYWORD' ? ' · ' + (st.key || '—').toUpperCase() : ''), y + 1, on ? '◂ SELECTED' : '');
          if (m === 'MORSE' && out) {
            // drawn marks, a word per line, plus the text form
            const M = REF.data.cipher.morse;
            text.toUpperCase().trim().split(/\s+/).slice(0, 8).forEach(w => {
              let x = 2; [...w].forEach(c => { const cd = M[c]; if (!cd) return; const need = cd.length * 8 + 6; if (x + need > W - 2) { x = 2; y += 6; } x = morseMarks(mx, cd, x, y + 2, on ? C.hot : C.ink, on ? 1 : 0.7) + 5; });
              y += 8;
            });
          }
          y = para(g, out || '—', 2, y + 1, W - 4, { c: on ? C.hot : C.ink, a: on ? 1 : 0.75 }) + 2;
        });
      }
      y += 2;
      U.wrap(REF.data.cipher.note, Math.floor((W - 6) / 4)).forEach(l => { g.mini(l, 2, y, { a: 0.45 }); y += 7; });
      g.scrollEnd(y + 4);
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'TAP LCD ▸ SEND · PUSH ▸ ' + (st.dec ? 'ENCODE' : 'DECODE'));
    }
  };

  RX.screens.reftable = {
    jogLabels: () => ['◂ UP', 'DOWN ▸', 'DRUM ▸ BACK · HOLD MAP'],
    jog(d, st) { st.scroll = Math.max(0, Math.min(st.scrollMax || 0, (st.scroll || 0) + d * 18)); },
    push(st, A) { A.go('refcode', {}); },
    lcd(st, A) { const it = REF.data.cipher && REF.data.cipher.items.find(x => x.id === A.top().params.id); return it ? { rows: [['REF', it.title], ['', 'PUSH ▸ CODE'], ['', '']], tag: 'CPH' } : null; },
    render(g, st, A) {
      const W = g.W, mx = g.mx, D = REF.data.cipher;
      if (!D) { g.header('CIPHER'); refReady(g, A); return; }
      const it = D.items.find(x => x.id === A.top().params.id) || D.items[0];
      let y = g.header(it.title, 'CIPHER ' + (D.items.indexOf(it) + 1) + '/' + D.items.length);
      y = g.scrollBegin(y, footTop(g));
      const cw = Math.floor((W - 2) / 2);
      if (it.id === 'morse') {
        const all = Object.keys(D.morse), keys = all.filter(k => /[A-Z]/.test(k)).concat(all.filter(k => /[0-9]/.test(k)), all.filter(k => !/[A-Z0-9]/.test(k))), half = Math.ceil(keys.length / 2);
        keys.forEach((k, i) => {
          const col = i < half ? 0 : 1, row = i < half ? i : i - half, x = col * cw, yy = y + row * 10;
          g.text(k, x + 3, yy + 1, { c: C.hot });
          morseMarks(mx, D.morse[k], x + 14, yy + 4, C.ink, 0.95);
        });
        y += half * 10 + 4;
        y = g.section('SIGNALS', y);
        it.prosigns.forEach(p => { g.text(p[0], 3, y + 1, { c: C.hot }); morseMarks(mx, p[1], 26, y + 4, C.ink, 0.95); g.mini(g.fit(p[2], W - 100, 'mini'), 96, y + 2, { a: 0.7 }); y += 10; });
      } else if (it.id === 'nato') {
        const keys = Object.keys(D.nato);
        keys.forEach((k, i) => { const col = i < 13 ? 0 : 1, yy = y + (i % 13) * 10, x = col * cw; g.text(k, x + 3, yy + 1, { c: C.hot }); g.text(D.nato[k], x + 14, yy + 1); });
        y += 13 * 10 + 4;
        y = g.section('NUMBERS', y);
        Object.keys(D.num).forEach((k, i) => { const col = i < 5 ? 0 : 1, yy = y + (i % 5) * 10, x = col * cw; g.text(k, x + 3, yy + 1, { c: C.hot }); g.text(D.num[k], x + 14, yy + 1); });
        y += 5 * 10 + 4;
      } else if (it.id === 'tap') {
        const cs = 15, gx = Math.floor((W - cs * 6) / 2);
        for (let c = 0; c < 5; c++) g.textC(String(c + 1), gx + cs * (c + 1) + cs / 2, y + 2, { a: 0.6 });
        it.grid.forEach((r, ri) => {
          const yy = y + 12 + ri * cs;
          g.textC(String(ri + 1), gx + cs / 2, yy + 4, { a: 0.6 });
          [...r].forEach((ch, ci) => { mx.frame(gx + cs * (ci + 1), yy, cs - 1, cs - 1, C.ink, 0.35); g.textC(ch === 'C' ? 'C/K' : ch, gx + cs * (ci + 1) + cs / 2, yy + 4, { c: C.hot, face: ch === 'C' ? 'mini' : undefined }); });
        });
        y += 12 + 5 * cs + 6;
      } else if (it.rows) {
        it.rows.forEach(r => { g.text(r[0], 3, y + 1, { c: C.hot }); y += 9; y = para(g, r[1], 10, y + 1, W - 14, { a: 0.8 }) + 3; });
      }
      y = g.section('HOW TO USE', y + 2);
      (it.timing || []).forEach(t => { y = para(g, '· ' + t, 2, y + 1, W - 4, { a: 0.85 }) + 3; });
      y += 3;
      g.btn(0, y, W - 2, 13, 'CODE ▸ ENCODE / DECODE / SEND', () => A.go('refcode', {}), { face: 'mini' }); y += 16;
      g.scrollEnd(y + 4);
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'PUSH ▸ CODE TOOL');
    }
  };


  // ======================================================================
  // LOT · parcel lookup. Crosshair on the map; when it settles, the county
  // record for the lot under it is read and the lot lights up.
  // ======================================================================
  const P = () => RX.parcel;
  function lotOutline(g, A, lot, o) {
    if (!lot || !lot.ring || lot.ring.length < 3) return;
    const v = A.view(), mx = g.mx, pts = lot.ring.map(q => M.latLngToDot(q[0], q[1], v));
    const a = o && o.dim ? 0.55 : (Math.floor(g.t / 600) % 2 ? 1 : 0.8);
    for (let i = 0; i < pts.length - 1; i++) mx.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, C.hot, a);
    // corner posts
    pts.slice(0, -1).forEach(q => { if (q.x > -2 && q.y > -2 && q.x < g.W + 2 && q.y < g.H + 2) mx.disc(Math.round(q.x), Math.round(q.y), 1.2, C.hot, 1); });
  }
  function lotLookup(st, A, lat, lng) {
    if (st.busy) { st.again = true; return; }
    st.busy = true; st.err = null; A.dirty = true;
    P().at(lat, lng).then(r => { st.res = r; st.err = r ? null : 'NONE'; if (r) A.beep('ok'); })
      .catch(() => { st.err = 'NET'; })
      .then(() => { st.busy = false; A.dirty = true; if (st.again) { st.again = false; st.settleAt = Date.now(); } });
  }
  async function lotToMark(A, lot, lat, lng) {
    const id = 'POI-' + Date.now();
    if (lot.traffic === undefined) { try { const t = RX.traffic.main(await RX.traffic.near(lat, lng, 1200)); lot.traffic = t ? { road: t.road, aadt: t.aadt, year: t.year, trend5: t.trend5, dist: Math.round(t.dist) } : null; } catch (e) { lot.traffic = null; } }
    if (lot.area === undefined) { try { const [aa, cc] = await Promise.all([RX.area.at(lat, lng), RX.area.cityAt(lat, lng).catch(() => null)]); lot.area = RX.area.brief(aa, cc); } catch (e) { lot.area = null; } }
    S.pois.push({ id, lat, lng, category: null, name: lot.situs ? lot.situs.split(',')[0] : (lot.owner || 'LOT'), notes: P().summary(lot), photo: null, hva: false, tier: 2, regionId: null, sector: null, created: Date.now(), parcel: lot });
    S.savePOIs(); S.log('drop', id, 'Pin dropped', 'FROM LOT LOOKUP');
    A.updateLamps(); A.beep('mark'); A.go('mark', { id });
  }
  // TxDOT count stations around the view: a diamond and the daily count
  function trafficLayer(g, A, st) {
    if (M.zoom < 13) return;
    const v = A.view(), mpd = Geo.metersPerPx(M.lat, M.zoom) * A.mx.pitch, radius = Math.min(6000, Math.max(400, Math.hypot(g.W, g.H) * mpd * 0.6));
    const key = M.lat.toFixed(3) + ',' + M.lng.toFixed(3) + ',' + Math.round(radius / 200);
    if (key !== st.tKey && !st.tBusy && (!st.tAt || Date.now() - st.tAt > 900)) {
      st.tKey = key; st.tBusy = true; st.tAt = Date.now();
      RX.traffic.near(M.lat, M.lng, radius).then(l => { st.tList = l; }).catch(() => {}).then(() => { st.tBusy = false; A.dirty = true; });
    }
    const mx = g.mx, seen = [];
    (st.tList || []).slice().sort((a, b) => b.aadt - a.aadt).forEach(s => {
      const d = M.latLngToDot(s.lat, s.lng, v), x = Math.round(d.x), y = Math.round(d.y);
      if (x < 2 || y < 14 || x > g.W - 2 || y > g.H - 60) return;
      const c = s.sub ? C.ink : C.amber;
      mx.set(x, y - 2, c, 1); mx.set(x - 1, y - 1, c, 1); mx.set(x + 1, y - 1, c, 1); mx.set(x - 2, y, c, 1); mx.set(x + 2, y, c, 1); mx.set(x - 1, y + 1, c, 1); mx.set(x + 1, y + 1, c, 1); mx.set(x, y + 2, c, 1); mx.set(x, y, c, 1);
      if (s.sub || seen.some(q => Math.abs(q[0] - x) < 22 && Math.abs(q[1] - y) < 8)) return;
      const t = RX.traffic.k(s.aadt) + '/D', w = RX.font.measure(t, 'mini');
      mx.clearRect(x + 3, y - 3, w + 2, 7); g.mini(t, x + 4, y - 2, { c: C.amber, a: 1 });
      seen.push([x, y]);
    });
  }
  // county tax office: copy the account, open the office's search (no public feed says "this lot owes")
  function taxCheck(A, r) {
    if (!r) return;
    try { if (r.id) navigator.clipboard.writeText(r.id); } catch (e) {}
    const url = /HARRIS/i.test(r.county || '') ? 'https://www.hctax.net/Property/PropertyTax'
      : 'https://www.google.com/search?q=' + encodeURIComponent((r.county || '') + ' county tax office property tax account search');
    A.say((r.id ? 'ACCOUNT ' + r.id + ' COPIED · ' : '') + 'OPENING ' + (r.county || 'COUNTY') + ' TAX OFFICE', 4000);
    window.open(url, '_blank');
  }
  function areaFetch(st, A, lat, lng) {
    if (st.aBusy) return;
    const key = lat.toFixed(4) + ',' + lng.toFixed(4);
    if (st.aKey === key) return;
    st.aKey = key; st.aBusy = true; st.aErr = null; st.cErr = null;
    Promise.all([
      RX.area.at(lat, lng).then(v => { st.area = v; if (!v) st.aErr = 'NONE'; }).catch(() => { st.aErr = 'NET'; }),
      RX.area.cityAt(lat, lng).then(v => { st.city = v; }).catch(() => { st.cErr = 'NET'; })
    ]).then(() => { st.aBusy = false; A.dirty = true; A.lcdDirty = true; });
  }
  const SCALES = ['tract', 'city', 'county', 'state'];
  // what each scale compares itself against, and the short name for it
  function scaleRef(cy, sc) {
    const st = cy.stateCode || 'ST';
    if (sc === 'city') return cy.inTX ? { o: cy.place, ref: cy.county, n: 'CO', long: 'COUNTY' } : { o: cy.place, ref: cy.state, n: st, long: st };
    if (sc === 'county') return { o: cy.county, ref: cy.state, n: st, long: st };
    return { o: cy.state, ref: cy.us, n: 'US', long: 'US' };
  }
  const kfmt = n => n == null ? '—' : n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : n.toLocaleString('en-US');
  const i2c = i => i === 0 ? C.hot : C.ink;
  const gk = n => n == null ? '—' : n >= 1e8 ? Math.round(n / 1e6) + 'M' : n >= 1e7 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e5 && n < 1e6 ? Math.round(n / 1e3) + 'K' : kfmt(n);
  const gm = n => n == null || n < 0 ? '—' : n >= 1e4 ? '$' + Math.round(n / 1000) + 'K' : '$' + Math.round(n);
  const vacPct = o => o && o.units ? Math.round(o.vacant / o.units * 100) + '%' : '—';
  function cityOutline(g, A, p) {
    if (!p || !p.rings) return;
    const v = A.view();
    p.rings.forEach(r => { const pts = r.map(q => M.latLngToDot(q[0], q[1], v)); for (let i = 0; i < pts.length - 1; i++) g.mx.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, C.hot, 0.75); });
  }
  function setScale(st, A, sc) {
    st.scale = sc;
    const p = st.city && st.city.place;
    if (sc === 'tract') { if (M.zoom < 13 || M.zoom > 15) M.setView(M.lat, M.lng, 14); }
    else if (sc === 'city') M.setView(M.lat, M.lng, p ? (p.sqmi < 15 ? 13 : p.sqmi < 60 ? 12 : p.sqmi < 250 ? 11 : 10) : 12);
    else if (sc === 'county') M.setView(M.lat, M.lng, 10);
    else M.setView(M.lat, M.lng, 7);
    A.say('AREA ▸ ' + sc.toUpperCase(), 1500); A.lcdDirty = true; A.dirty = true;
  }
  function areaOutline(g, A, area) {
    const ring = area && area.tract && area.tract.ring; if (!ring) return;
    const v = A.view(), pts = ring.map(q => M.latLngToDot(q[0], q[1], v));
    for (let i = 0; i < pts.length - 1; i++) g.mx.line(pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, C.amber, 0.9, 2);
  }
  const PAGES = ['lot', 'traffic', 'area'];
  RX.screens.lot = {
    map: true,
    animating: () => true,
    drum: PAGES,
    jogLabels: () => ['◂ OUT', 'IN ▸', 'PUSH ▸ READ THIS SPOT'],
    enter(st, params, A) {
      st.wasFollow = M.follow; M.follow = false;
      st.page = 'lot';
      if (params.lat != null) M.setView(params.lat, params.lng, Math.max(M.zoom, 18));
      else if (M.zoom < 17) M.setView(M.lat, M.lng, 18);
    },
    onPage(pg, st, A) {
      if (pg === 'traffic' && M.zoom > 16.5) M.setView(M.lat, M.lng, 16);   // counts are along roads: pull back to see them
      if (pg === 'area') { if (M.zoom > 14.5) M.setView(M.lat, M.lng, 14); areaFetch(st, A, M.lat, M.lng); }
      if (pg === 'lot' && M.zoom < 17) M.setView(M.lat, M.lng, 18);
      st.tPick = 0;
    },
    jog(d, st, A) { const v = A.view(); M.zoomBy(d * 0.5, v.cx, v.cy, v); },
    push(st, A) { if (st.page === 'area') { st.aKey = null; areaFetch(st, A, M.lat, M.lng); } else lotLookup(st, A, M.lat, M.lng); },
    onMark(st, A) { const r = st.res; if (r) lotToMark(A, r, r.at[0], r.at[1]); else A.say('NO LOT READ YET · PARK THE CROSSHAIR ON ONE', 2500); },
    // the LCD is this mode's readout: one set of rows per page
    lcd(st, A) {
      const r = st.res, pg = st.page || 'lot';
      if (pg === 'lot') {
        if (!r) return { rows: [['LOT', st.busy ? 'READING...' : 'PARK ON A LOT'], ['SIZE', '--'], ['TAX', '--']], tag: 'LOT' };
        return { rows: [['OWNR', r.owner || '--'], ['SIZE', P().fmtAcres(r.acres) + (r.mkt ? ' ' + RX.area.money(r.mkt) : ' NO VALUE')], ['TAX', 'TAP LCD ▸ CHECK']], tag: 'LOT' };
      }
      if (pg === 'traffic') {
        const list = (st.tList || []).filter(s => !s.sub), s = list.length ? list[(st.tPick || 0) % list.length] : null;
        if (!s) return { rows: [['ROAD', st.tBusy ? 'READING...' : 'NO COUNTS HERE'], ['AADT', '--'], ['5YR', '--']], tag: 'TRF' };
        return { rows: [['ROAD', s.road + (list.length > 1 ? ' ' + ((st.tPick || 0) % list.length + 1) + '/' + list.length : '')], ['/DAY', RX.traffic.full(s.aadt) + ' (' + s.year + ')'], ['5YR', s.trend5 != null ? RX.traffic.pct(s.trend5) + ' · ' + Geo.fmtDist(s.dist) : Geo.fmtDist(s.dist)]], tag: 'TRF' };
      }
      const sc = st.scale || 'tract', cy = st.city;
      if (sc !== 'tract') {
        const tag = { city: 'CTY', county: 'CNT', state: 'STA' }[sc], lab = { city: 'CITY', county: 'CNTY', state: 'STAT' }[sc];
        if (!cy) return { rows: [[lab, st.aBusy ? 'READING...' : (st.cErr ? 'NO SIGNAL' : 'PUSH TO READ')], ['INC', '--'], ['POP', '--']], tag };
        const R = scaleRef(cy, sc), o = R.o, ref = R.ref, refN = ' ' + R.n;
        if (!o && sc === 'county') return { rows: [['CNTY', (cy.countyName || '--').replace(/ County$/i, '').toUpperCase()], ['', cy.inTX ? 'NO FIGURES' : 'TEXAS ONLY FOR NOW'], ['', 'TAP LCD ▸ STATE']], tag };
        if (!o && sc === 'state') return { rows: [['STAT', (cy.stateName || '--').toUpperCase()], ['', 'NO FIGURES'], ['', '']], tag };
        if (!o) return { rows: [['CITY', 'UNINCORPORATED'], ['CNTY', (cy.countyName || '--').replace(/ County$/i, '').toUpperCase()], ['', 'TAP LCD ▸ COUNTY']], tag };
        if (sc === 'city' && !o.stats) return { rows: [['CITY', o.name.toUpperCase()], ['', cy.inTX ? 'NO CENSUS FIGURES' : 'FIGURES: 100K+ CITIES'], ['', '']], tag };
        return { rows: [[lab, o.name.replace(/ County$/i, '').replace(/, .*$/, '').toUpperCase() + (o.cdp ? ' (UNINC)' : '')], ['INC', RX.area.money(o.income) + ' ' + RX.area.vs(o.income, ref && ref.income) + refN], ['POP', kfmt(o.pop) + ' ' + RX.area.growth(o.growth) + ' 5Y']], tag };
      }
      const a = st.area, t = a && a.tract, c = a && a.county;
      if (!t) return { rows: [['TRCT', st.aBusy ? 'READING...' : (st.aErr === 'NET' ? 'NO SIGNAL' : 'PUSH TO READ')], ['INC', '--'], ['HOME', '--']], tag: 'TRC' };
      return { rows: [['INC', RX.area.money(t.income) + ' ' + RX.area.vs(t.income, c && c.income) + ' CO'], ['HOME', RX.area.money(t.home) + ' ' + RX.area.vs(t.home, c && c.home) + ' CO'], ['POP', (t.pop || 0).toLocaleString('en-US') + ' · OWN ' + Math.round(t.own || 0) + '%']], tag: 'TRC' };
    },
    lcdTap(st, A) {
      const pg = st.page || 'lot';
      if (pg === 'lot') { if (st.res) taxCheck(A, st.res); else A.say('NO LOT READ YET', 2000); }
      else if (pg === 'traffic') { st.tPick = (st.tPick || 0) + 1; }
      else { const i = SCALES.indexOf(st.scale || 'tract'); setScale(st, A, SCALES[(i + 1) % SCALES.length]); }
    },
    render(g, st, A) {
      const W = g.W, H = g.H, mx = g.mx, pg = st.page || 'lot';
      const key = M.lat.toFixed(6) + ',' + M.lng.toFixed(6);
      if (key !== st.centerKey) { st.centerKey = key; st.settleAt = Date.now() + 650; }
      else if (st.settleAt && Date.now() > st.settleAt) {
        st.settleAt = 0;
        if (pg === 'area') areaFetch(st, A, M.lat, M.lng);
        else if (!(st.res && P().contains(st.res.ring, M.lat, M.lng))) { if (M.zoom >= 15 || pg !== 'lot') lotLookup(st, A, M.lat, M.lng); else { st.res = null; st.err = 'ZOOM'; } }
        A.lcdDirty = true;
      }
      drawMap(g, A, { reticle: true, noHits: true });
      const scl = st.scale || 'tract';
      if (pg === 'area') { if (scl === 'tract') areaOutline(g, A, st.area); else if (scl === 'city') cityOutline(g, A, st.city && st.city.place); }
      lotOutline(g, A, st.res, { dim: pg !== 'lot' });
      if (pg === 'traffic') trafficLayer(g, A, st);
      hud(g, A, ({ lot: 'LOT · COUNTY RECORDS', traffic: 'TRAFFIC · CARS PER DAY', area: 'AREA · ' + ({ tract: 'CENSUS TRACT', city: 'CITY', county: 'COUNTY', state: 'STATE' })[scl] })[pg]);
      // page tabs: which drum face is up
      const tw = Math.floor((W - 2) / 3);
      mx.clearRect(0, 12, W, 9);
      PAGES.forEach((p, i) => { const on = p === pg; if (on) mx.rect(i * tw + 1, 12, tw - 2, 8, C.ink, 0.22); g.miniR(p.toUpperCase(), i * tw + tw / 2 + RX.font.measure(p.toUpperCase(), 'mini') / 2, 14, { a: on ? 1 : 0.4, c: on ? C.hot : C.ink }); });
      if (pg === 'traffic') { mx.clearRect(0, 21, 11 + RX.font.measure('/D = VEHICLES PER DAY', 'mini'), 9); [[2, 0], [1, 1], [3, 1], [0, 2], [2, 2], [4, 2], [1, 3], [3, 3], [2, 4]].forEach(q => mx.set(2 + q[0], 23 + q[1], C.amber, 1)); g.mini('/D = VEHICLES PER DAY', 9, 23, { c: C.amber, a: 0.95 }); }
      if (pg === 'area') { // scale strip: tap the LCD to step it
        let x = 2; mx.clearRect(0, 21, 4 + SCALES.reduce((w, k) => w + RX.font.measure(k.toUpperCase(), 'mini') + 6, 0) + RX.font.measure('LCD ▸', 'mini'), 9);
        x += g.mini('LCD ▸', x, 23, { a: 0.5 }) + 4;
        SCALES.forEach(k => { const on = k === scl; x += g.mini(k.toUpperCase(), x, 23, { c: on ? C.hot : C.ink, a: on ? 1 : 0.4 }) + 6; });
      }
      // the card
      const ch = 44, cy = footTop(g) - ch - 1;
      mx.clearRect(0, cy - 1, W, ch + 2); mx.frame(0, cy, W - 1, ch, C.ink, 0.5);
      const r = st.res, bw = Math.floor((W - 10) / 2);
      if (pg === 'lot') {
        if (st.err === 'ZOOM') { g.textC('ZOOM IN TO READ LOTS', W / 2, cy + 18, { a: 0.7 }); }
        else if (!r && st.busy) { g.textC('READING COUNTY RECORDS' + '...'.slice(0, 1 + Math.floor(g.t / 300) % 3), W / 2, cy + 18, { a: 0.8 }); }
        else if (!r && st.err === 'NET') { g.textC('NO SIGNAL · LOTS NEED A CONNECTION', W / 2, cy + 14, { c: C.amber }); g.textC('PUSH THE JOG TO RETRY', W / 2, cy + 25, { a: 0.6 }); }
        else if (!r && st.err === 'NONE') { g.textC('NO PARCEL HERE', W / 2, cy + 14, { a: 0.8 }); g.textC('ROAD, WATER OR NOT ON RECORD', W / 2, cy + 25, { a: 0.5, face: 'mini' }); }
        else if (!r) { g.textC('PARK THE CROSSHAIR ON A LOT', W / 2, cy + 18, { a: 0.7 }); }
        else {
          g.text(g.fit(r.situs || 'NO SITE ADDRESS', W - 8), 4, cy + 3, { c: C.hot });
          g.mini(g.fit('OWNER ' + (r.owner || '—'), W - 8, 'mini'), 4, cy + 13, { a: 0.85 });
          g.mini(g.fit([P().fmtAcres(r.acres), r.mkt ? P().fmtMoney(r.mkt) : null, r.built ? 'BUILT ' + r.built : null, (r.county || '') + ' CO'].filter(Boolean).join(' · '), W - 8, 'mini'), 4, cy + 21, { a: 0.7 });
          g.btn(3, cy + 29, bw, 12, 'DETAILS ▸', () => A.go('lotinfo', { lot: r }), { face: 'mini' });
          g.btn(7 + bw, cy + 29, bw, 12, 'TAX CHECK ▸', () => taxCheck(A, r), { face: 'mini' });
        }
      } else if (pg === 'traffic') {
        const list = (st.tList || []).filter(s => !s.sub), main = RX.traffic.main(st.tList);
        if (!main) g.textC(st.tBusy ? 'READING TXDOT COUNTS...' : (M.zoom < 13 ? 'ZOOM IN TO SEE COUNTS' : 'NO COUNT STATIONS IN VIEW'), W / 2, cy + 18, { a: 0.7 });
        else {
          g.text(main.road, 4, cy + 3, { c: C.hot }); g.textR(RX.traffic.full(main.aadt) + '/DAY', W - 5, cy + 3, { c: C.hot });
          g.mini(g.fit(main.year + ' AVERAGE DAY, BOTH DIRECTIONS' + (main.trend5 != null ? ' · ' + RX.traffic.pct(main.trend5) + ' IN 5 YRS' : ''), W - 8, 'mini'), 4, cy + 13, { a: 0.8 });
          g.mini(g.fit(list.filter(s => s.id !== main.id).slice(0, 3).map(s => s.road + ' ' + RX.traffic.k(s.aadt)).join(' · ') || 'NO OTHER STATIONS IN VIEW', W - 8, 'mini'), 4, cy + 21, { a: 0.6 });
          g.btn(3, cy + 29, bw, 12, 'HISTORY ▸', () => { if (r) A.go('lotinfo', { lot: r }); else A.say('NO LOT READ HERE YET', 2000); }, { face: 'mini', dim: !r });
          g.btn(7 + bw, cy + 29, bw, 12, 'LCD ▸ NEXT ROAD', () => { st.tPick = (st.tPick || 0) + 1; A.lcdDirty = true; }, { face: 'mini' });
        }
      } else if (scl !== 'tract') {
        const cy0 = st.city, R = cy0 ? scaleRef(cy0, scl) : {}, o = R.o, ref = R.ref, refN = R.long;
        const nxt = SCALES[(SCALES.indexOf(scl) + 1) % SCALES.length];
        const nextBtn = () => g.btn(7 + bw, cy + 29, bw, 12, 'LCD ▸ ' + nxt.toUpperCase(), () => { setScale(st, A, nxt); }, { face: 'mini' });
        if (!cy0) g.textC(st.aBusy ? 'READING CENSUS...' : (st.cErr ? 'NO SIGNAL · AREA NEEDS A CONNECTION' : 'PUSH THE JOG TO READ THIS AREA'), W / 2, cy + 18, { a: 0.7, c: st.cErr ? C.amber : C.ink });
        else if (!o && scl !== 'city') {
          g.text(g.fit((scl === 'county' ? (cy0.countyName || 'COUNTY') : (cy0.stateName || 'STATE')).toUpperCase(), W - 8), 4, cy + 3, { c: C.hot });
          g.mini(scl === 'county' && !cy0.inTX ? 'COUNTY FIGURES COVER TEXAS ONLY FOR NOW' : 'NO FIGURES ON FILE FOR THIS ' + scl.toUpperCase(), 4, cy + 13, { a: 0.75 });
          g.mini('STATE AND 100K+ CITY FIGURES COVER THE WHOLE US', 4, cy + 21, { a: 0.55 });
          nextBtn();
        } else if (!o) {
          g.text('UNINCORPORATED', 4, cy + 3, { c: C.hot });
          g.mini(g.fit('NOT INSIDE ANY CITY OR CENSUS COMMUNITY · ' + (cy0.countyName || '').toUpperCase() + ' RULES HERE', W - 8, 'mini'), 4, cy + 13, { a: 0.8 });
          g.mini('NO CITY ZONING OR CITY TAX · CHECK COUNTY RULES', 4, cy + 21, { a: 0.6 });
          nextBtn();
        } else if (scl === 'city' && !o.stats) {
          g.text(g.fit(o.full.toUpperCase(), W - 8), 4, cy + 3, { c: C.hot });
          g.mini(cy0.inTX ? 'NO CENSUS FIGURES FOR THIS PLACE IN THE ' + cy0.year + ' FILE' : 'OUTSIDE TEXAS, CITY FIGURES COVER 100K+ CITIES', 4, cy + 13, { a: 0.7 });
          g.mini('TAP LCD ▸ COUNTY · STATE', 4, cy + 21, { a: 0.55 });
          nextBtn();
        } else {
          const nm = scl === 'city' ? o.name.toUpperCase() + (o.cdp ? ' · UNINC. COMMUNITY' : ' · CITY') + ' · ' + (cy0.countyName || '').replace(/ County$/i, '').toUpperCase() + ' CO' : scl === 'county' ? o.name.toUpperCase() + ' · ' + (cy0.stateName || '').toUpperCase() : o.name.toUpperCase() + ' · STATE';
          g.text(g.fit(nm, W - 8), 4, cy + 3, { c: C.hot });
          g.mini(g.fit(kfmt(o.pop) + ' PEOPLE (' + RX.area.growth(o.growth) + ' SINCE ' + cy0.prior + ') · INCOME ' + RX.area.money(o.income) + ' (' + RX.area.vs(o.income, ref && ref.income) + ' VS ' + refN + ')', W - 8, 'mini'), 4, cy + 13, { a: 0.85 });
          // crime: the city's police department vs its state; the state vs the US
          const crm = cy0.crime, ca = crm && scl === 'city' && crm.place && crm.place[1] ? { v: crm.place[2] / crm.place[1] * 1000, p: crm.place[3] / crm.place[1] * 1000 } : (crm && scl === 'state' ? crm.state : null);
          const cref = crm && (scl === 'city' ? crm.state : crm.us), cn = scl === 'city' ? (cy0.stateCode || 'ST') : 'US';
          const crimeTxt = ca ? 'CRIME ' + ca.v.toFixed(1) + ' VIOLENT · ' + Math.round(ca.p) + ' PROPERTY /1K' + (cref ? ' (' + cn + ' ' + cref.v.toFixed(1) + ' · ' + Math.round(cref.p) + ')' : '') : null;
          g.mini(g.fit(crimeTxt || ('HOME ' + RX.area.money(o.home) + ' (' + RX.area.vs(o.home, ref && ref.home) + ') · RENT ' + RX.area.money(o.rent) + ' · ' + Math.round(o.own || 0) + '% OWN · ' + vacPct(o) + ' VACANT · AGE ' + o.age), W - 8, 'mini'), 4, cy + 21, { a: 0.7, c: ca && cref && ca.v > cref.v ? C.amber : C.ink });
          g.btn(3, cy + 29, bw, 12, 'FULL PROFILE ▸', () => A.go('areainfo', { lat: M.lat, lng: M.lng, area: st.area, city: st.city }), { face: 'mini' });
          nextBtn();
        }
      } else {
        const a = st.area, t = a && a.tract, c = a && a.county;
        if (!t) g.textC(st.aBusy ? 'READING CENSUS TRACT...' : (st.aErr === 'NET' ? 'NO SIGNAL · AREA NEEDS A CONNECTION' : 'PUSH THE JOG TO READ THIS AREA'), W / 2, cy + 18, { a: 0.7, c: st.aErr === 'NET' ? C.amber : C.ink });
        else {
          g.text(g.fit(t.name.toUpperCase() + ' · ' + (a.countyName || '').toUpperCase(), W - 8), 4, cy + 3, { c: C.hot });
          g.mini(g.fit('INCOME ' + RX.area.money(t.income) + ' (' + RX.area.vs(t.income, c && c.income) + ' VS COUNTY) · HOME ' + RX.area.money(t.home) + ' (' + RX.area.vs(t.home, c && c.home) + ')', W - 8, 'mini'), 4, cy + 13, { a: 0.85 });
          g.mini(g.fit((t.pop || 0).toLocaleString('en-US') + ' PEOPLE · ' + Math.round(t.own || 0) + '% OWN · MEDIAN AGE ' + t.age + ' · RENT ' + RX.area.money(t.rent), W - 8, 'mini'), 4, cy + 21, { a: 0.7 });
          g.btn(3, cy + 29, bw, 12, 'FULL PROFILE ▸', () => A.go('areainfo', { lat: M.lat, lng: M.lng, area: st.area, city: st.city }), { face: 'mini' });
          g.btn(7 + bw, cy + 29, bw, 12, 'LCD ▸ CITY', () => setScale(st, A, 'city'), { face: 'mini' });
        }
      }
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'DRUM ▸ PAGE', 'PRESS ▸ BACK');
    }
  };

  // the whole picture for a spot: tract, city, county and Texas side by side, plus the city's busiest roads
  RX.screens.areainfo = {
    jogLabels: () => ['◂ UP', 'DOWN ▸', 'DRUM ▸ BACK · HOLD MAP'],
    jog(d, st) { st.scroll = Math.max(0, Math.min(st.scrollMax || 0, (st.scroll || 0) + d * 18)); },
    enter(st, params, A) {
      st.area = params.area || null; st.city = params.city || null;
      if (!st.area) RX.area.at(params.lat, params.lng).then(v => { st.area = v; }).catch(() => {}).then(() => { A.dirty = true; });
      if (!st.city) RX.area.cityAt(params.lat, params.lng).then(v => { st.city = v; }).catch(() => { st.cErr = true; }).then(() => { A.dirty = true; });
    },
    lcd(st) {
      const p = st.city && st.city.place;
      return { rows: [['CITY', p ? p.name.toUpperCase() : (st.city ? 'UNINCORPORATED' : '--')], ['CNTY', st.city && st.city.countyName ? st.city.countyName.replace(/ County$/i, '').toUpperCase() : '--'], ['ROAD', st.roads && st.roads[0] ? st.roads[0].road + ' ' + RX.traffic.k(st.roads[0].aadt) + '/D' : '--']], tag: 'PRF' };
    },
    render(g, st, A) {
      const W = g.W, mx = g.mx, cy0 = st.city, t = st.area && st.area.tract, p = cy0 && cy0.place, co = cy0 && cy0.county, tx = cy0 && cy0.state;
      let y = g.header('AREA PROFILE', cy0 ? 'ACS ' + (cy0.year - 4) + '–' + String(cy0.year).slice(2) : 'CENSUS');
      y = g.scrollBegin(y, footTop(g));
      g.text(g.fit(p ? p.full.toUpperCase() : (cy0 ? 'UNINCORPORATED' : 'READING...'), W - 4), 1, y + 1, { c: C.hot }); y += 10;
      g.mini(g.fit([t && t.name.toUpperCase(), cy0 && cy0.countyName && cy0.countyName.toUpperCase(), p && p.sqmi ? (p.sqmi < 10 ? p.sqmi.toFixed(1) : Math.round(p.sqmi)) + ' SQ MI' : null].filter(Boolean).join(' · '), W - 4, 'mini'), 1, y + 1, { a: 0.6 }); y += 10;
      // the grid: one row per figure, one column per scale
      const tm = cy0 && cy0.tractMore, tcol = t ? Object.assign({}, t, tm || {}) : (tm || null);
      const cols = cy0 && !cy0.inTX ? [['TRACT', tcol], ['CITY', p && p.stats ? p : null], [cy0.stateCode || 'STATE', tx], ['US', cy0.us]] : [['TRACT', tcol], ['CITY', p && p.stats ? p : null], ['COUNTY', co], ['TEXAS', tx]];
      const lw = 30, cw = Math.floor((W - 2 - lw) / 4);
      cols.forEach((c, i) => g.miniR(c[0], lw + cw * (i + 1) - 2, y + 1, { a: c[1] ? 0.8 : 0.35 }));
      y += 8; mx.hline(0, y, W, C.ink, 0.25, 2); y += 2;
      const rows = [
        ['PEOPLE', o => gk(o.pop)],
        ['GROWTH', o => o.growth != null ? RX.area.growth(o.growth) : '—'],
        ['INCOME', o => gm(o.income)],
        ['HOME', o => gm(o.home)],
        ['RENT', o => gm(o.rent)],
        ['OWN', o => o.own != null ? Math.round(o.own) + '%' : '—'],
        ['VACANT', o => vacPct(o)],
        ['AGE', o => o.age != null ? String(o.age) : '—'],
        ['POVERTY', o => o.poverty != null ? Math.round(o.poverty) + '%' : '—'],
        ['JOBLESS', o => o.unemp != null ? (o.unemp < 10 ? o.unemp.toFixed(1) : Math.round(o.unemp)) + '%' : '—'],
        ['COLLEGE', o => o.college != null ? Math.round(o.college) + '%' : '—'],
        ['COMMUTE', o => o.commute != null ? Math.round(o.commute) + 'M' : '—'],
        ['BUILT', o => o.built ? "'" + String(o.built).slice(2) : '—'],
        ['HH SIZE', o => o.hhsize != null ? o.hhsize.toFixed(1) : '—']
      ];
      rows.forEach((r, ri) => {
        g.mini(r[0], 1, y + 2, { a: 0.6 });
        cols.forEach((c, i) => { const v = c[1] ? r[1](c[1]) : '—'; g.textR(g.fit(v, cw - 3), lw + cw * (i + 1) - 2, y + 1, { c: i === 1 && c[1] ? C.hot : C.ink, a: c[1] ? 1 : 0.35 }); });
        y += 10; if (ri % 2 === 1) mx.hline(0, y - 1, W, C.ink, 0.08, 2);
      });
      g.mini(g.fit('GROWTH = PEOPLE NOW VS ' + (cy0 ? cy0.prior : '5 YRS AGO') + ' · JOBLESS = UNEMPLOYED SHARE OF LABOR FORCE · COLLEGE = BACHELOR+ (25 AND UP) · COMMUTE = AVG MINUTES · BUILT = MEDIAN YEAR', W - 2, 'mini'), 1, y + 1, { a: 0.45 }); y += 10;
      // PEOPLE: race and ethnicity, one stacked bar per scale, then the shares
      const RACE = [['HISPANIC', 'hisp', 1], ['WHITE', 'white', 0.72], ['BLACK', 'black', 0.48], ['ASIAN', 'asian', 0.3], ['OTHER', null, 0.15]];
      const share = (o, k) => { if (!o || o.hisp == null) return null; if (k) return o[k]; return Math.max(0, 100 - o.hisp - o.white - o.black - o.asian); };
      y = g.section('PEOPLE · RACE & ETHNICITY', y + 2, '% OF RESIDENTS');
      cols.forEach(c => {
        g.mini(c[0], 1, y + 2, { a: c[1] && c[1].hisp != null ? 0.7 : 0.35 });
        const bx = lw, bw = W - lw - 3;
        if (c[1] && c[1].hisp != null) { let x = bx; RACE.forEach((rc, ri) => { const v = share(c[1], rc[1]) || 0, w = ri === RACE.length - 1 ? bx + bw - x : Math.round(bw * v / 100); if (w > 0) { mx.rect(x, y + 1, Math.max(1, w - 1), 6, i2c(ri), rc[2]); x += w; } }); }
        else mx.hline(bx, y + 4, bw, C.ink, 0.2, 2);
        y += 9;
      });
      y += 1;
      RACE.forEach((rc, ri) => {
        mx.rect(2, y + 2, 4, 4, i2c(ri), rc[2]); g.mini(rc[0], 9, y + 2, { a: 0.7 });
        cols.forEach((c, i) => { const v = share(c[1], rc[1]); g.textR(v == null ? '—' : Math.round(v) + '%', lw + cw * (i + 1) - 2, y + 1, { c: i === 1 && c[1] ? C.hot : C.ink, a: v == null ? 0.35 : 1 }); });
        y += 10;
      });
      g.mini('HISPANIC OF ANY RACE · OTHER RACES NOT HISPANIC', 1, y + 1, { a: 0.45 }); y += 10;
      // SAFETY: FBI yearly totals per 1,000 residents
      const crm = cy0 && cy0.crime;
      y = g.section('SAFETY · CRIMES PER 1,000', y + 2, crm ? 'FBI · ' + crm.year : 'FBI');
      if (!crm) { g.mini(cy0 ? 'CRIME FILE NOT LOADED' : 'READING...', 2, y + 1, { a: 0.6 }); y += 10; }
      else {
        // columns: a police department (an agency's yearly counts) or a published rate (state, US)
        const ag2 = a => a && a[1] ? { v: a[2] / a[1] * 1000, p: a[3] / a[1] * 1000, v20: a[4] ? a[5] / a[4] * 1000 : null, p20: a[4] ? a[6] / a[4] * 1000 : null } : null;
        const stc = cy0.stateCode || 'STATE';
        const ccols = cy0.inTX ? [['CITY PD', ag2(crm.place)], ['SHERIFF', ag2(crm.county)], ['TEXAS', crm.state]] : [['CITY PD', ag2(crm.place)], [stc, crm.state], ['US', crm.us]];
        const benchmark = cy0.inTX ? crm.state : crm.state;
        const cw2 = Math.floor((W - 2 - lw) / 3);
        ccols.forEach((c, i) => g.miniR(c[0], lw + cw2 * (i + 1) - 2, y + 1, { a: c[1] ? 0.8 : 0.35 }));
        y += 8; mx.hline(0, y, W, C.ink, 0.25, 2); y += 2;
        const f1 = v => v == null ? '—' : v < 10 ? v.toFixed(1) : String(Math.round(v));
        const chg = (a, b) => a != null && b ? (a >= b ? '+' : '') + Math.round((a - b) / b * 100) + '%' : '—';
        [['VIOLENT', 'v'], ['PROPERTY', 'p']].forEach(r => {
          g.mini(r[0], 1, y + 2, { a: 0.6 });
          ccols.forEach((c, i) => { const v = c[1] ? c[1][r[1]] : null; const hot = i === 0 && v != null && benchmark && v > benchmark[r[1]]; g.textR(f1(v), lw + cw2 * (i + 1) - 2, y + 1, { c: hot ? C.amber : (i === 0 && v != null ? C.hot : C.ink), a: v == null ? 0.35 : 1 }); });
          y += 10;
        });
        [['V VS ' + String(crm.prior).slice(2), 'v'], ['P VS ' + String(crm.prior).slice(2), 'p']].forEach(r => {
          g.mini(r[0], 1, y + 2, { a: 0.6 });
          ccols.forEach((c, i) => { const v = c[1] ? chg(c[1][r[1]], c[1][r[1] + '20']) : '—'; g.textR(v, lw + cw2 * (i + 1) - 2, y + 1, { a: v === '—' ? 0.35 : 0.9 }); });
          y += 10;
        });
        const ag = [crm.place ? crm.place[0] + (crm.place[7] < 12 ? ' (' + crm.place[7] + ' MO REPORTED)' : '') : (p ? (p.cdp ? p.name.toUpperCase() + ' IS UNINCORPORATED · THE COUNTY POLICES IT' : (cy0.inTX ? 'NO POLICE DEPT REPORTS FOR ' : 'CITY CRIME COVERS 100K+ CITIES · NOT ') + p.name.toUpperCase()) : 'NOT IN A CITY · THE COUNTY POLICES HERE'), crm.county ? crm.county[0] + ' · UNINCORPORATED AREAS ONLY' : null].filter(Boolean);
        ag.forEach(l => U.wrap(l.toUpperCase(), Math.floor((W - 6) / 4)).forEach(x => { g.mini(x, 2, y + 1, { a: 0.5 }); y += 7; }));
        g.mini('AMBER = ABOVE THE ' + (cy0.inTX ? 'TEXAS' : 'STATE') + ' RATE', 2, y + 1, { c: C.amber, a: 0.8 }); y += 9;
      }
      // busiest roads inside the city
      if (p && !st.rReq) { st.rReq = true; RX.traffic.busiest(p.box, (la, ln) => RX.area.inRings(p.rings, la, ln), 6).then(l => { st.roads = l; }).catch(() => { st.rErr = true; }).then(() => { A.dirty = true; A.lcdDirty = true; }); }
      if (p) {
        y = g.section('BUSIEST ROADS IN ' + p.name.toUpperCase(), y + 2, 'TXDOT · /DAY');
        if (!st.roads) { g.mini(st.rErr ? 'NO SIGNAL · ROADS NEED A CONNECTION' : 'READING TXDOT COUNTS...', 2, y + 1, { a: 0.6, c: st.rErr ? C.amber : C.ink }); y += 10; }
        else if (!st.roads.length) { g.mini('NO COUNT STATIONS INSIDE THE LIMITS', 2, y + 1, { a: 0.6 }); y += 10; }
        else st.roads.forEach((s, i) => {
          const mx0 = st.roads[0].aadt, bwid = Math.max(2, Math.round((W - 120) * s.aadt / mx0));
          g.text(g.fit(s.road, 60), 2, y + 1, { c: i ? C.ink : C.hot });
          mx.rect(64, y + 2, bwid, 5, i ? C.ink : C.hot, i ? 0.5 : 0.9);
          g.textR(RX.traffic.k(s.aadt), W - 4, y + 1, { c: i ? C.ink : C.hot });
          y += 10;
        });
      }
      y += 4;
      U.wrap('U.S. CENSUS BUREAU, AMERICAN COMMUNITY SURVEY 5-YEAR ESTIMATES (' + (cy0 ? cy0.year : '') + '), STORED ON THIS RP: EVERY TEXAS CITY AND COUNTY, EVERY STATE, AND US CITIES OF 100K+; TRACT LIVE FROM THE CENSUS MAP SERVICE. MEDIANS ARE ESTIMATES WITH A MARGIN OF ERROR, WIDEST FOR SMALL PLACES.', Math.floor((W - 6) / 4)).forEach(l => { g.mini(l, 2, y, { a: 0.45 }); y += 7; });
      g.scrollEnd(y + 4);
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'CENSUS · STORED ON THIS RP');
    }
  };

  RX.screens.lotinfo = {
    jogLabels: () => ['◂ UP', 'DOWN ▸', 'PUSH SELECT · HOLD MAP'],
    render(g, st, A) {
      const W = g.W, mx = g.mx, prm = A.top().params, r = prm.lot;
      let y = g.header('LOT RECORD', (r.county || '') + ' CO · ' + (r.taxYear || ''));
      y = g.scrollBegin(y, footTop(g));
      g.text(g.fit(r.situs || 'NO SITE ADDRESS', W - 4), 1, y + 1, { c: C.hot });
      y += 12;
      const kv = (k, v, o) => {
        if (v == null || v === '') return;
        g.mini(k, 2, y + 1, { a: 0.55 });
        const lines = U.wrap(String(v), Math.floor((W - 50) / 6));
        lines.forEach((l, i) => g.text(l, 46, y + i * 9, o || {}));
        y += Math.max(1, lines.length) * 9 + 3;
        mx.hline(2, y - 2, W - 6, C.ink, 0.08, 2);
      };
      y = g.section('OWNER', y);
      kv('NAME', r.owner); kv('C/O', r.care); kv('MAILING', r.mail);
      y = g.section('LAND', y + 2);
      kv('AREA', P().fmtAcres(r.acres) + ' (MAPPED)');
      if (r.legalArea) kv('DEED', r.legalArea + ' ' + (r.legalUnit || ''));
      kv('USE', r.use); kv('BUILT', r.built); kv('LEGAL', r.legal);
      y = g.section('APPRAISAL', y + 2, r.taxYear ? 'TAX YEAR ' + r.taxYear : '');
      if (r.mkt || r.land || r.imp) { kv('MARKET', P().fmtMoney(r.mkt), { c: C.hot }); kv('LAND', P().fmtMoney(r.land)); kv('BUILDINGS', P().fmtMoney(r.imp)); }
      else { g.mini('NOT PUBLISHED IN THE STATE FEED FOR THIS COUNTY', 2, y + 1, { a: 0.6 }); y += 9; g.mini('THE COUNTY RECORD HAS IT · LINK BELOW', 2, y + 1, { a: 0.6 }); y += 11; }
      kv('ACCOUNT', r.id); kv('SOURCE', r.source);
      // traffic: TxDOT annual daily counts near the lot
      if (!st.tReq) { st.tReq = true; RX.traffic.near(r.at[0], r.at[1], 1200).then(l => { st.tList = l; }).catch(() => { st.tErr = true; }).then(() => { A.dirty = true; }); }
      y = g.section('TRAFFIC · VEHICLES PER DAY', y + 2, 'TXDOT AADT');
      if (!st.tList) { g.mini(st.tErr ? 'NO SIGNAL · TRAFFIC NEEDS A CONNECTION' : 'READING TXDOT COUNTS...', 2, y + 1, { a: 0.6, c: st.tErr ? C.amber : C.ink }); y += 10; }
      else if (!st.tList.length) { g.mini('NO COUNT STATIONS WITHIN 3/4 MILE', 2, y + 1, { a: 0.6 }); y += 10; }
      else {
        const top = RX.traffic.main(st.tList);
        if (top) {
          g.text(top.road, 2, y + 1, { c: C.hot });
          g.textR(RX.traffic.full(top.aadt), W - 4, y + 1, { c: C.hot });
          g.mini(Geo.fmtDist(top.dist) + ' AWAY · ' + top.year + (top.trend5 != null ? ' · ' + RX.traffic.pct(top.trend5) + ' IN 5 YRS' : ''), 2, y + 10, { a: 0.65 });
          y += 18;
          // the station's history, oldest → newest
          const ser = top.series.slice().reverse(), mxv = Math.max(...ser.map(o => o.v)), bw = Math.max(2, Math.floor((W - 8) / Math.max(ser.length, 1)) - 1), bh = 18;
          ser.forEach((o, i) => { const h = Math.max(1, Math.round(bh * o.v / mxv)); mx.rect(3 + i * (bw + 1), y + bh - h, bw, h, i === ser.length - 1 ? C.hot : C.ink, i === ser.length - 1 ? 1 : 0.55); });
          g.mini(String(ser[0].year), 2, y + bh + 2, { a: 0.5 }); g.miniR(String(ser[ser.length - 1].year), W - 4, y + bh + 2, { a: 0.5 });
          y += bh + 11;
        }
        const seen = new Set([top && top.id]);
        st.tList.filter(s => !seen.has(s.id)).slice(0, 5).forEach(s => {
          g.text(g.fit(s.road + (s.sub ? ' · RAMP/DIR' : ''), W - 90), 2, y + 1, { a: s.sub ? 0.55 : 0.9 });
          g.miniR(Geo.fmtDist(s.dist), W - 52, y + 2, { a: 0.55 });
          g.textR(RX.traffic.k(s.aadt), W - 4, y + 1, { a: s.sub ? 0.55 : 1 });
          y += 10;
        });
        y += 2;
      }
      // area: the census tract around the lot, against its county
      if (!st.aReq) { st.aReq = true; st.area = prm.area || null; if (!st.area) RX.area.at(r.at[0], r.at[1]).then(v => { st.area = v || false; }).catch(() => { st.aErr = true; }).then(() => { A.dirty = true; }); }
      y = g.section('AREA · CENSUS TRACT', y + 2, 'ACS 5-YR');
      if (!st.area) { g.mini(st.aErr ? 'NO SIGNAL · AREA NEEDS A CONNECTION' : st.area === false ? 'NO TRACT ON RECORD HERE' : 'READING CENSUS...', 2, y + 1, { a: 0.6, c: st.aErr ? C.amber : C.ink }); y += 10; }
      else {
        const t = st.area.tract, c = st.area.county || {}, vs = (a, b) => RX.area.vs(a, b) ? RX.area.vs(a, b) + ' VS CO' : '';
        g.text(g.fit(t.name.toUpperCase(), W - 4), 2, y + 1, { c: C.hot }); y += 11;
        kv('INCOME', RX.area.money(t.income) + '  ' + vs(t.income, c.income), { c: C.hot });
        kv('HOME', RX.area.money(t.home) + '  ' + vs(t.home, c.home));
        kv('RENT', RX.area.money(t.rent) + '/MO  ' + vs(t.rent, c.rent));
        kv('PEOPLE', (t.pop || 0).toLocaleString('en-US') + (t.sqmi ? ' · ' + Math.round(t.pop / t.sqmi).toLocaleString('en-US') + '/SQ MI' : '') + ' · AGE ' + t.age);
        kv('HOUSING', (t.units || 0).toLocaleString('en-US') + ' UNITS · ' + Math.round(t.own || 0) + '% OWNED · ' + (t.units ? Math.round(t.vacant / t.units * 100) : 0) + '% VACANT');
        kv('COUNTY', (st.area.countyName || '').toUpperCase() + ' · INC ' + RX.area.money(c.income) + ' · HOME ' + RX.area.money(c.home));
      }
      g.btn(0, y + 2, W - 2, 13, 'CITY · COUNTY · STATE ▸ FULL PROFILE', () => A.go('areainfo', { lat: r.at[0], lng: r.at[1], area: st.area || null }), { face: 'mini' }); y += 17;
      y += 3;
      const bw = Math.floor((W - 6) / 2);
      g.btn(0, y, bw, 13, 'COUNTY RECORD ▸', () => window.open(P().recordUrl(r), '_blank'), { face: 'mini' });
      g.btn(bw + 4, y, W - 6 - bw, 13, 'TAX CHECK ▸', () => taxCheck(A, r), { face: 'mini' });
      y += 16;
      g.btn(0, y, W - 2, 13, 'SHOW ON MAP ▸', () => { A.home(); A.go('lot', { lat: r.at[0], lng: r.at[1] }); }, { face: 'mini' });
      y += 16;
      if (!prm.markId) { g.btn(0, y, W - 2, 13, '+ SAVE AS A MARK', () => lotToMark(A, r, r.at[0], r.at[1]), { face: 'mini' }); y += 16; }
      y += 3;
      U.wrap('TEXAS STATEWIDE PARCELS (TXGIO) FROM COUNTY APPRAISAL DISTRICTS. UPDATED ABOUT YEARLY · A RECENT SALE MAY STILL SHOW THE OLD OWNER. READ ' + new Date(r.ts).toLocaleDateString('en-US'), Math.floor((W - 6) / 4)).forEach(l => { g.mini(l, 2, y, { a: 0.45 }); y += 7; });
      g.scrollEnd(y + 4);
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'PUBLIC RECORD · STORED ON THIS RP ONLY');
    }
  };


  // ---------- the LCD per mode: each screen says what its glance strip shows ----------
  const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  RX.screens.fast.lcd = () => {
    const f = S.activeFast(), fs = S.fastStreak();
    if (!f) return { rows: [['FAST', 'NONE RUNNING'], ['STRK', fs.current + ' · BEST ' + fs.best], ['LAST', fs.daysSinceLast != null ? fs.daysSinceLast.toFixed(1) + ' DAYS AGO' : '--']], tag: 'FST' };
    const el = Date.now() - f.startTs;
    return { rows: [['TIME', F.dur(el)], ['DAY', String(f.dayNum) + ' · STREAK ' + fs.current], ['FROM', F.hm(f.startTs)]], tag: 'FST' };
  };
  RX.screens.log.lcd = () => {
    const t0 = dayStart(), today = S.journal.filter(j => j.ts >= t0).length;
    return { rows: [['MRKS', String(S.pois.length)], ['PEND', String(S.pending().length)], ['TODY', today + ' ENTRIES']], tag: 'LOG' };
  };
  RX.screens.mark.lcd = (st, A) => {
    const p = S.poi(st.id); if (!p) return null;
    const from = A.gps || { lat: M.lat, lng: M.lng }, m = Geo.meters(from.lat, from.lng, p.lat, p.lng), b = Geo.bearing(from.lat, from.lng, p.lat, p.lng);
    const r = p.parcel, third = r && r.traffic ? ['TRAF', RX.traffic.k(r.traffic.aadt) + '/DAY ' + r.traffic.road] : r && r.area ? ['INC', RX.area.money(r.area.income) + ' ' + RX.area.vs(r.area.income, r.area.cIncome) + ' CO'] : ['VSTS', '×' + F.pad2(p.visits || 0)];
    return { rows: [['DST', Geo.fmtDist(m) + ' ' + Geo.cardinal(b) + ' ' + String(Math.round(b) % 360).padStart(3, '0') + '°'], r ? ['OWNR', r.owner || '--'] : ['NAME', S.markLabel(p)], third], tag: 'MRK' };
  };
  RX.screens.refentry.lcd = (st, A) => {
    const P = A.top().params; if (!REF.data.aid) return null;
    const aid = P.kind === 'aid', list = aid ? REF.data.aid.items : REF.data.knots.items, it = list.find(x => x.id === P.id) || list[0];
    return { rows: [[aid ? 'AID' : 'KNOT', (list.indexOf(it) + 1) + '/' + list.length], ['', it.title], aid && it.call ? ['', it.call] : ['', '']], tag: 'REF' };
  };
  RX.screens.menu.lcd = (st, A) => {
    const g = A.gps;
    let kb = 0; try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); kb += (k.length + (localStorage.getItem(k) || '').length) * 2; } } catch (e) {}
    return { rows: [['GPS', g && g.acc != null ? '±' + Math.round(g.acc * 3.28084) + ' FT' : 'NO FIX'], ['MEM', Math.round(kb / 1024) + ' KB · ' + S.pois.length + ' MRK'], ['VER', 'R.OS ' + RX.VERSION]], tag: 'SYS' };
  };

  // ---------- VIS: explored-ground totals for the LCD while HI-CON is on ----------
  RX.vis = (function () {
    const CELL_SQMI = 22500 / 2589988;   // same 150 m square the rest of the RP counts
    let city = null, cityKey = null, busy = false, pct = null, pctKey = null;
    function cityPct(p) {
      const D = S.FOG_CELL_DEG, b = p.box; let n = 0;
      for (const k of S.fog) {
        const ix = S.unpackIdx(k), la = (ix[0] + 0.5) * D, ln = (ix[1] + 0.5) * D;
        if (la < b[0] || la > b[2] || ln < b[1] || ln > b[3]) continue;
        if (RX.area.inRings(p.rings, la, ln)) n++;
      }
      return Math.min(100, n * CELL_SQMI / p.sqmi * 100);
    }
    function lcd(A) {
      const key = M.lat.toFixed(2) + ',' + M.lng.toFixed(2);
      if (key !== cityKey && !busy) {
        busy = true; cityKey = key;
        RX.area.cityAt(M.lat, M.lng).then(c => { city = c; }).catch(() => { city = city || null; }).then(() => { busy = false; A.lcdDirty = true; });
      }
      const p = city && city.place;
      let cityRow = ['CITY', busy && !city ? 'READING...' : (city ? 'UNINCORPORATED' : 'NO SIGNAL')];
      if (p) {
        const pk = p.geoid + ':' + S.fog.size;
        if (pk !== pctKey) { pctKey = pk; pct = cityPct(p); }
        cityRow = ['CITY', p.name.toUpperCase() + ' ' + (pct < 10 ? pct.toFixed(1) : Math.round(pct)) + '%'];
      }
      const mi = S.fog.size * CELL_SQMI;
      return { rows: [['EXPL', (mi < 100 ? mi.toFixed(1) : Math.round(mi)) + ' SQ MI'], cityRow, ['CELL', F.num(S.fog.size)]], tag: 'VIS' };
    }
    return { lcd, cityPct };
  })();
})();
