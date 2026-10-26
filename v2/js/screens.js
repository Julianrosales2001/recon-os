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

    // tracks: the one REC is laying down, and a saved one you asked to see
    if (RX.aux && RX.aux.drawUnder) RX.aux.drawUnder(g, A, v);

    // objectives with a place
    S.missions.forEach(m => {
      if (m.status !== 'active' || m.lat == null || m.lng == null) return;
      const d = M.latLngToDot(m.lat, m.lng, v), x = Math.floor(d.x), y = Math.floor(d.y);
      if (x < -6 || y < -6 || x > W + 6 || y > H + 6) return;
      const hot = m.priority === 'urgent' || (m.deadline && m.deadline < Date.now());
      const off = m.poiId ? 9 : 0;
      g.hex(x, y + off, hot ? C.red : C.obj, 0.95);
      if (!o.noHits) g.hit(x - 6, y + off - 6, 13, 13, () => A.go('calitem', { todo: m.id }));
    });

    // marks
    // LEGEND hides by colour and by kind, separately
    const hidden = new Set(S.v2.hiddenCats || []), hiddenK = new Set(S.v2.hiddenKinds || []);
    const scanIt = !o.noHits && A.stack.length <= 1 && A.drumFace() === 'NEAR' ? A.nearItem() : null;
    const shown = [];
    for (const p of S.pois) {
      if (p.category && (hidden.has(p.category) || hiddenK.has(U.kindOf(p)))) continue;
      const live = (A.assign && A.assign.id === p.id) || (A.filed && A.filed.id === p.id) || (scanIt && scanIt.id === p.id);
      if (M.zoom < (TIER_MIN[p.tier || 2] || 0) && !live) continue;
      const d = M.latLngToDot(p.lat, p.lng, v), x = Math.floor(d.x), y = Math.floor(d.y);
      if (x < -8 || y < -8 || x > W + 8 || y > H + 8) continue;
      shown.push({ p, x, y });
    }
    shown.sort((a, b) => a.y - b.y);
    for (const s of shown) {
      const p = s.p;
      const blinking = A.assign && A.assign.id === p.id;
      if (blinking && Math.floor(t / 280) % 2) { mx.carve(s.x, s.y, 6.2); mx.ring(s.x, s.y, 5, C.amber, 1, 2); }
      else g.pin(s.x, s.y, p, blinking ? { c: C.amber } : null);
      if (!o.noHits) g.hit(s.x - 7, s.y - 7, 15, 15, () => A.openMark(p.id));
    }
    // the car (PARK)
    if (RX.aux && RX.aux.drawOver) RX.aux.drawOver(g, A, v, o);
    // NEAR: brackets and the mark's name under it
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

  // ---- the MARK ring: six kinds (amber, no colour yet), then the six colours; tap one, or jog to it and push ----
  const RING_R = 23;
  function drawRing(g, A, by) {
    const a = A.assign, p = a && S.poi(a.id); if (!p) return;
    const mx = g.mx, W = g.W, d = M.latLngToDot(p.lat, p.lng, A.view());
    const x = Math.floor(d.x), y = Math.floor(d.y);
    // keep the ring inside the screen and above the banner; a short lead goes back to the pin if it had to move
    const cx = Math.max(RING_R + 8, Math.min(W - RING_R - 8, x)), cy = Math.max(12 + RING_R + 8, Math.min(by - RING_R - 10, y));
    if (Math.hypot(cx - x, cy - y) > 3) mx.line(x, y, cx, cy, C.amber, 0.6, 2);
    const slot = i => { const ang = -Math.PI / 2 + i * Math.PI / 3; return [Math.round(cx + RING_R * Math.cos(ang)), Math.round(cy + RING_R * Math.sin(ang))]; };
    if (a.step === 'color') {
      U.CATS.forEach((c, i) => {
        const [dx, dy] = slot(i), on = i === a.csel;
        if (on) { mx.carve(dx, dy, 9.5); mx.ring(dx, dy, 8.5, C.hot, 1); }
        g.kindPin(dx, dy, a.kind, c.color, { r: 6, a: on ? 1 : 0.75 });
        g.mini(String(i + 1), dx + 6, dy - 9, { c: c.color, a: on ? 1 : 0.6 });
        g.hit(dx - 8, dy - 8, 17, 17, () => A.finishAssign(i));
      });
      // the hub shows the mark as it will file; tap it to go back to the kinds
      g.kindPin(cx, cy, a.kind, U.CATS[a.csel].color, { r: 7 });
      g.hit(cx - 7, cy - 7, 15, 15, () => { a.step = 'kind'; a.until = Date.now() + A.ASSIGN_MS; A.beep('ring.pick'); A.say('PICK A KIND', 1500); });
      return;
    }
    A.ringKinds().forEach((k, i) => {
      const [dx, dy] = slot(i), on = i === a.sel;
      if (on) { mx.carve(dx, dy, 9.5); mx.ring(dx, dy, 8.5, C.hot, 1); }
      g.kindPin(dx, dy, k, C.amber, { r: 6, a: on ? 1 : 0.7 });
      g.mini(String(i + 1), dx + 6, dy - 9, { c: C.amber, a: on ? 1 : 0.6 });
      g.hit(dx - 8, dy - 8, 17, 17, () => A.pickKind(k));
    });
    // the hub: the pin itself; tap it for every kind
    mx.carve(cx, cy, 6.2); mx.ring(cx, cy, 5, C.amber, 1, Math.floor(g.t / 280) % 2 ? 2 : 1);
    g.mini('?', cx - 1, cy - 2, { c: C.amber, a: 1 });
    g.hit(cx - 7, cy - 7, 15, 15, () => { a.until = Date.now() + 10 * 60000; A.go('kindpick', {}); });
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
      if (A.assign) return A.assign.step === 'color' ? ['◂ COLOR', 'COLOR ▸', 'PUSH ▸ FILE · DRUM ▸ UNDO'] : ['◂ KIND', 'KIND ▸', 'PUSH ▸ PICK · DRUM ▸ UNDO'];
      const al = RX.aux.mapLabels(A); if (al) return al;
      const f = A.drumFace();
      if (f === 'NEAR') return ['◂ NEARER', 'FARTHER ▸', 'DRUM ▸ OPEN · HOLD RESET'];
      if (f === 'LOT') return ['◂ OUT', 'IN ▸', 'DRUM ▸ READ LOT · HOLD RESET'];
      return ['◂ OUT', 'IN ▸', 'TAP LOCATE · HOLD RESET'];
    },
    jog(d, st, A) {
      if (A.assign) { A.ringStep(d); return; }
      if (RX.aux.mapJog(d, A)) return;
      const f = A.drumFace();
      if (f === 'NEAR') { A.nearStep(d); return; }
      const v = A.view();
      M.zoomBy(d * 0.5, v.cx, v.cy, v);
      A.say('ZOOM ▸ Z' + (Math.round(M.zoom * 2) / 2), 1500);
    },
    push(st, A) { if (A.assign) { A.ringPush(); return; } if (RX.aux.mapPush(A)) return; A.locate(); },
    lcd: (st, A) => RX.aux.mapLcd(A),
    back(st, A) {
      if (A.target) { A.target = null; A.say('TARGET CLEARED', 2000); return true; }
      if (RX.aux.mapBack(A)) return true;
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
      RX.aux.mapChip(g, A);
      {
        const f = A.drumFace(), it = f === 'NEAR' ? A.nearItem() : null;
        const av = !A.assign && RX.aux.mapJogVal(A);
        document.getElementById('jogVal').textContent = A.assign ? ((A.assign.step === 'color' ? A.assign.csel : A.assign.sel) + 1) + '/6' : av ? av : f === 'NEAR' ? (it ? (A.near.i + 1) + '/' + A.near.list.length : '0/0')
          : 'Z' + (Math.round(M.zoom * 2) / 2);
        // the jog's labels follow the ring coming and going
        const jl = this.jogLabels(st, A), key = jl.join('|');
        if (st._jl !== key) { st._jl = key; document.getElementById('jogL').textContent = jl[0]; document.getElementById('jogR').textContent = jl[1]; document.getElementById('jogFoot').textContent = jl[2]; }
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
        drawRing(g, A, by);
        const a = A.assign, pp = S.poi(a.id), colorStep = a.step === 'color';
        const k = colorStep ? a.kind : A.ringKinds()[a.sel];
        mx.clearRect(bx, by, bw, bh); mx.frame(bx, by, bw, bh, C.amber, 1);
        g.kindPin(bx + 8, by + 8, k, colorStep ? U.CATS[a.csel].color : C.amber, { r: 5 });
        g.text(g.fit((colorStep ? k + ' ▸ PICK A COLOR' : 'MARK ' + a.id.slice(-4) + ' ▸ ' + k) + (pp && pp.name ? ' · ' + pp.name : ''), bw - 18), bx + 16, by + 4, { c: C.hot });
        g.mini(colorStep ? 'TAP A COLOR · PUSH ▸ ' + (a.csel + 1) + ' · HUB ▸ KINDS' : 'TAP A KIND · HUB ▸ ALL KINDS', bx + 4, by + 15, { a: 0.9 });
        const left = Math.max(0, A.assign.until - Date.now());
        g.mini('MARK ▸ LATER · DRUM ▸ UNDO · ' + Math.ceil(left / 1000) + 'S', bx + 4, by + 24, { c: C.amber, a: 0.9 });
        mx.rect(bx + bw - 30, by + 25, Math.round(26 * left / A.ASSIGN_MS), 3, C.amber, 1);
      } else if (RX.aux.mapBanner(g, A, fy)) {
        // PARKED: the banner drew itself
      } else if (A.filed && Date.now() < A.filed.until) {
        const bx = 4, bw = W - 8, bh = 23, by = fy - 12 - bh;
        const p = S.poi(A.filed.id);
        mx.clearRect(bx, by, bw, bh); mx.frame(bx, by, bw, bh, C.ink, 1);
        if (A.filed.kind) g.kindPin(bx + 8, by + 8, A.filed.kind, A.filed.color, { r: 5 }); else mx.disc(bx + 7, by + 7, 3, A.filed.color, 1);
        g.text(A.filed.id.slice(-4) + ' ▸ ' + A.filed.label, bx + 16, by + 4, { c: C.hot });
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
    if (q) list = list.filter(p => RX.font.norm([p.name, p.notes, U.kindOf(p) || ''].join(' ')).includes(q));
    const items = list.map(p => ({ p, m: distTo(A, p), b: brgTo(A, p) }));
    const sort = st.sort || 'NEAR';
    if (sort === 'NEAR') items.sort((a, b) => a.m - b.m);
    else if (sort === 'VISITS') items.sort((a, b) => (b.p.visits || 0) - (a.p.visits || 0) || a.m - b.m);
    else if (sort === 'NEW') items.sort((a, b) => (b.p.created || 0) - (a.p.created || 0));
    else items.sort((a, b) => S.markLabel(a.p).localeCompare(S.markLabel(b.p)));
    return items;
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
        const meta = (p.category ? U.kindLabel(p) : 'PENDING' + (p.kind ? ' · ' + p.kind : '')) + ((p.visits || 0) ? ' · ×' + p.visits : '') + (p.tier === 3 ? ' · ★' : '');
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
          p.category = cat.id; U.setKind(p, U.kindOf(p) || 'WAYPOINT'); p.shape = 'ICON'; S.savePOIs();
          S.log('classify', p.id, 'Classified: ' + S.markLabel(p), U.kindOf(p));
          A.say(S.markLabel(p) + ' ▸ ' + U.kindOf(p), 3000); A.beep('file'); A.updateLamps();
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

  // ---- ASSETS as a cabinet: a drawer per kind (count + its colour mix), ALL, PENDING, FIND ----
  const filedMarks = () => S.pois.filter(p => p.category);
  const kindKey = p => U.kindOf(p) || 'WAYPOINT';
  function drawers() {
    const m = {};
    filedMarks().forEach(p => { const k = kindKey(p); (m[k] = m[k] || []).push(p); });
    return Object.entries(m).map(([k, ps]) => ({ k, ps })).sort((a, b) => b.ps.length - a.ps.length || a.k.localeCompare(b.k));
  }
  function mixBar(g, x, y, w, ps) {   // the colours in a drawer, as one thin bar
    const n = ps.length; let xx = x;
    U.CATS.forEach(c => { const k = ps.filter(p => p.category === c.id).length; if (!k || xx >= x + w) return; const ww = Math.max(1, Math.round(w * k / n)); g.mx.rect(xx, y, Math.min(ww, x + w - xx), 2, c.color, 0.95); xx += ww; });
  }
  const magnifier = (mx, x, y, c, a) => { mx.ring(x + 3, y + 3, 2.6, c, a); mx.line(x + 5, y + 5, x + 7, y + 7, c, a); };
  function openFind(A) {   // FIND: everything, with the search line open (inside the tap, so the keyboard comes up)
    A.go('drawer', { k: 'ALL', find: true });
    const st2 = A.top().st;
    U.openField('drw-find', { value: '', onInput: v => { st2.q = v; st2.scroll = 0; st2.sel = 0; }, onCommit: v => { st2.q = v; } });
  }
  function cabinet(g, st, A, y, bottom) {
    const W = g.W, mx = g.mx, D = drawers(), pend = S.pending().length, all = filedMarks().length;
    // the top shelf
    const w3 = Math.floor((W - 4 - 22) / 2);
    g.btn(0, y, w3, 13, 'ALL ' + all, () => A.go('drawer', { k: 'ALL' }));
    g.btn(w3 + 2, y, w3, 13, 'PENDING ' + pend, () => { if (pend) A.go('drawer', { k: 'PEND' }); else { A.say('NOTHING PENDING · ALL FILED', 2000); A.beep('key'); } }, { c: pend ? C.amber : C.ink, dim: !pend });
    const fx = w3 * 2 + 4, fw = W - fx, fsel = g.focusable(fx, y, fw, 13, () => openFind(A));
    mx.frame(fx, y, fw, 13, C.ink, fsel ? 1 : 0.55); if (fsel) mx.frame(fx + 2, y + 2, fw - 4, 9, C.ink, 0.45, 2);
    magnifier(mx, fx + Math.floor(fw / 2) - 4, y + 3, fsel ? C.hot : C.ink, 1);
    y += 16;
    // the drawers, three across
    const cw = Math.floor((W - 4) / 3), ch = 27;
    let yy = g.scrollBegin(y, bottom);
    if (!st.jog) st.sel = g.focusIdx;   // the jog's first click lands on the first drawer
    D.forEach((d, i) => {
      const x = (i % 3) * (cw + 2), ty = yy + Math.floor(i / 3) * (ch + 2);
      const sel = g.focusable(x, ty, cw, ch, () => A.go('drawer', { k: d.k }));
      mx.frame(x, ty, cw, ch, sel ? C.hot : C.ink, sel ? 1 : 0.4);
      if (sel) mx.frame(x + 2, ty + 2, cw - 4, ch - 4, C.hot, 0.35, 2);
      g.kindPin(x + 8, ty + 8, d.k, C.amber, { r: 5 });
      g.textR(String(d.ps.length), x + cw - 3, ty + 3, { c: sel ? C.hot : C.ink });
      g.mini(g.fit(d.k, cw - 6, 'mini'), x + 3, ty + 16, { a: sel ? 1 : 0.75, c: sel ? C.hot : C.ink });
      mixBar(g, x + 3, ty + 23, cw - 6, d.ps);
    });
    yy += Math.ceil(D.length / 3) * (ch + 2);
    if (!D.length) { g.textC('NO MARKS FILED YET', W / 2, yy + 10, { a: 0.5 }); yy += 24; }
    g.scrollEnd(yy);
    return D.length + ' DRAWERS · TAP ONE · JOG PICKS · PUSH OPENS';
  }

  // one drawer: a line a mark, nearest first; colour chips narrow it; the jog's pick opens up to show more
  RX.screens.drawer = {
    enter(st, params) { st.k = params.k || 'ALL'; st.sort = S.v2.logSort || 'NEAR'; st.c = null; st.q = ''; st.find = !!params.find; },
    lcd(st, A) {
      const it = st._first;
      return { rows: [['DRWR', st.k === 'PEND' ? 'PENDING' : st.k], ['SHOWN', String(st._n || 0)], ['NEAR', it ? S.markLabel(it.p) + ' · ' + Geo.fmtDist(it.m) : '--']], tag: 'LOG' };
    },
    render(g, st, A) {
      const W = g.W, mx = g.mx, bottom = footTop(g);
      if (st.k === 'PEND') {
        const list = S.pending().slice().sort((a, b) => (b.created || 0) - (a.created || 0));
        g.header('ASSETS ▸ PENDING', list.length + ' WAITING', { c: C.amber });
        let yy = g.scrollBegin(13, bottom);
        yy = pendRows(g, A, list, yy);
        if (!list.length) { g.textC('ALL FILED ✓', W / 2, yy + 12, { c: C.hot }); yy += 26; }
        g.scrollEnd(yy);
        g.footer(A.sayActive() ? A.statusShown(g.t) : 'TAP A COLOR TO FILE IT · NAME ▸ TO OPEN');
        return;
      }
      const all = st.k === 'ALL';
      const base = (all ? filedMarks() : filedMarks().filter(p => kindKey(p) === st.k)).map(p => ({ p, m: distTo(A, p), b: brgTo(A, p) }));
      let items = st.c ? base.filter(it => it.p.category === st.c) : base;
      const q = RX.font.norm(st.q || '').trim();
      if (q) items = items.filter(it => RX.font.norm([it.p.name, it.p.notes, kindKey(it.p)].join(' ')).includes(q));
      const sort = st.sort || 'NEAR';
      if (sort === 'NEAR') items.sort((a, b) => a.m - b.m);
      else if (sort === 'VISITS') items.sort((a, b) => (b.p.visits || 0) - (a.p.visits || 0) || a.m - b.m);
      else if (sort === 'NEW') items.sort((a, b) => (b.p.created || 0) - (a.p.created || 0));
      else items.sort((a, b) => S.markLabel(a.p).localeCompare(S.markLabel(b.p)));
      st._n = items.length; st._first = items[0];
      const SORTNAME = { NEAR: 'NEAREST', VISITS: 'MOST VISITED', NEW: 'NEWEST', 'A-Z': 'A-Z' };
      const y0 = 13, yFind = y0 + 14, showFind = !!(st.find || q), yChips = yFind + (showFind ? 15 : 0), yList = yChips + 13;
      // a line a mark; the one the jog is on opens up. Drawn first so the jog walks the marks before the buttons
      if (!st.jog) st.sel = 0;
      let yy = g.scrollBegin(yList, bottom);
      const top = g.sTop, bot = g.sBottom;
      items.forEach(it => {
        const p = it.p, sel = !!st.jog && st.sel === g.focusIdx, h = sel ? 19 : 10;
        g.row(0, yy, W - 2, h, () => A.openMark(p.id));
        if (yy + h >= top && yy <= bot) {
          const col = (U.catById(p.category) || { color: C.ink }).color;
          if (all || st.c) mx.icon(U.kindIcon(kindKey(p)), 2, yy + 1, { c: col, a: 1 });
          else mx.disc(5, yy + 4, 2, col, 1);
          const right = sort === 'VISITS' ? '×' + (p.visits || 0) : Geo.fmtDist(it.m), rw = RX.font.measure(right);
          g.text(g.fit(S.markLabel(p), W - rw - 17), 11, yy + 1, { c: sel ? C.hot : C.ink });
          g.textR(right, W - 4, yy + 1, { a: sel ? 1 : 0.8 });
          if (sel) {
            const meta = [all ? kindKey(p) : null, Geo.cardinal(it.b) + ' ' + String(Math.round(it.b)).padStart(3, '0') + '°', sort === 'VISITS' ? Geo.fmtDist(it.m) : null,
              (p.visits || 0) ? '×' + p.visits + ' · LAST ' + F.ago(p.lastVisited || p.created) : 'NOT VISITED YET', p.tier === 3 ? '★' : null].filter(Boolean).join(' · ');
            g.mini(g.fit(meta, W - 16, 'mini'), 11, yy + 11, { a: 0.75 });
          }
        }
        yy += h;
      });
      if (!items.length) { g.textC(q ? 'NOTHING MATCHES' : 'EMPTY', W / 2, yy + 10, { a: 0.5 }); yy += 24; }
      g.scrollEnd(yy);
      // the top: the drawer's label, how it's sorted, find, then its colours
      mx.clearRect(0, 0, W, yList);
      g.header('ASSETS ▸ ' + (all ? 'ALL' : st.k), base.length + ' · ' + SORTNAME[sort]);
      let y = y0;
      if (all) { mx.ring(7, y + 6, 4.5, C.amber, 1); mx.disc(7, y + 6, 1.5, C.amber, 1); } else g.kindPin(7, y + 6, st.k, C.amber, { r: 5 });
      g.text(all ? 'EVERYTHING' : st.k, 16, y + 2, { c: C.hot });
      const sw = 36, mxw = 13;
      g.btn(W - sw - mxw - 2, y, sw, 11, sort + ' ▸', () => { st.sort = SORTS[(SORTS.indexOf(sort) + 1) % SORTS.length]; S.saveV2({ logSort: st.sort }); st.scroll = 0; st.sel = 0; }, { face: 'mini' });
      const fsel = g.focusable(W - mxw, y, mxw, 11, () => { st.find = !st.find; if (!st.find) st.q = ''; else U.openField('drw-find', { value: st.q || '', onInput: v => { st.q = v; st.scroll = 0; st.sel = 0; }, onCommit: v => { st.q = v; } }); });
      mx.frame(W - mxw, y, mxw, 11, st.find ? C.hot : C.ink, fsel || st.find ? 1 : 0.55); magnifier(mx, W - mxw + 2, y + 2, st.find ? C.hot : C.ink, 1);
      if (showFind) g.field('drw-find', 0, yFind, W, 13, { label: 'FIND', value: st.q || '', placeholder: 'NAME, NOTES, KIND', onInput: v => { st.q = v; st.scroll = 0; st.sel = 0; }, onCommit: v => { st.q = v; } });
      // the colours in this drawer: tap one to see only it
      y = yChips;
      let x = 0;
      const chip = (label, col, on, fn) => {
        const w = RX.font.measure(label, 'mini') + (col ? 10 : 6);
        if (x + w > W) return;
        const sel = g.focusable(x, y - 1, w, 11, fn);
        if (on) mx.rect(x, y, w, 9, col || C.ink, 0.85); else mx.frame(x, y, w, 9, col || C.ink, sel ? 1 : 0.5);
        if (col) mx.disc(x + 4, y + 4, 2, on ? '#04120C' : col, 1);
        g.mini(label, x + (col ? 8 : 3), y + 2, { c: on ? '#04120C' : (col || C.ink), a: 1 });
        x += w + 2;
      };
      chip('ALL ' + base.length, null, !st.c, () => { st.c = null; st.scroll = 0; st.sel = 0; });
      U.CATS.forEach(c => { const n = base.filter(it => it.p.category === c.id).length; if (n) chip(String(n), c.color, st.c === c.id, () => { st.c = st.c === c.id ? null : c.id; st.scroll = 0; st.sel = 0; }); });
      mx.hline(0, yChips + 11, W, C.ink, 0.25, 2);
      g.footer(A.sayActive() ? A.statusShown(g.t) : items.length + ' SHOWN · TAP ONE · JOG PICKS · PUSH OPENS');
    }
  };

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
        foot = cabinet(g, st, A, y, bottom);
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
            if (e.type === 'track') { g.mx.line(22, yy + 5, 28, yy + 1, '#FF6B5E', 1); g.mx.line(23, yy + 5, 29, yy + 1, '#FF6B5E', 0.6); }
            else if (e.type && e.type.indexOf('mission') === 0) g.hex(25, yy + 3, e.type === 'mission-complete' ? C.ink : C.obj, 0.8);
            else if (e.type === 'drop') g.mx.ring(25, yy + 3, 2, C.ink, 0.9, 2);
            else g.mx.disc(25, yy + 3, 2, cat ? cat.color : C.ink, e.type === 'delete' ? 0.3 : 1);
            const txt = RX.font.norm(e.summary || e.type) + (e.meta && e.type === 'visit' ? ' ' + String(e.meta).replace(/^.*·\s*/, '') : '');
            g.text(g.fit(txt, W - 34), 31, yy, { a: e.type === 'delete' ? 0.45 : 0.95 });
            if (p) g.hit(0, yy - 1, W, 9, () => A.openMark(p.id));
            else if (e.trackId && S.track(e.trackId)) g.hit(0, yy - 1, W, 9, () => A.go('track', { id: e.trackId }));
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
      let y = g.header(cat ? U.kindLabel(p) : 'PENDING MARK', 'MARK ' + p.id.slice(-4) + (p.tier === 3 ? ' · ★' : ''), { c: cat ? cat.color : C.ink });
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

      // kind: what it is (one list: the old categories and symbols together)
      const pk = U.kindOf(p), col = cat ? cat.color : C.amber;
      y = g.section('KIND', y, pk || 'PICK ONE');
      const per = Math.max(5, Math.floor((W - 1) / 17));
      U.KINDS.forEach((kd, i) => {
        const x = (i % per) * 17, yy = y + Math.floor(i / per) * 16;
        const on = pk === kd.id;
        const sel = g.focusable(x, yy, 16, 15, () => { U.setKind(p, kd.id); p.shape = 'ICON'; save(); A.beep('jog'); });
        if (on || sel) mx.frame(x, yy, 16, 15, on ? C.hot : C.ink, on ? 1 : 0.6);
        g.kindPin(x + 8, yy + 7, kd.id, on ? col : C.ink, { a: on ? 1 : 0.55 });
      });
      y += Math.ceil(U.KINDS.length / per) * 16 + 3;

      // colour: its own thing; means whatever you want
      y = g.section('COLOR', y);
      const sw = Math.floor((W - 2) / U.CATS.length);
      U.CATS.forEach((c, i) => {
        const x = i * sw, on = p.category === c.id;
        const sel = g.focusable(x, y, sw - 2, 12, () => {
          p.category = c.id; if (!p.kind) U.setKind(p, pk || 'WAYPOINT'); p.shape = 'ICON';
          save(); S.saveV2({ lastCat: i }); A.beep('file');
        });
        mx.rect(x + 1, y + 1, sw - 4, 10, c.color, on || !p.category ? 1 : 0.6);
        if (on) mx.frame(x - 1, y - 1, sw, 14, C.hot, 1);
        else if (sel) mx.frame(x - 1, y - 1, sw, 14, C.ink, 0.7);
      });
      y += 17;

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
        A.say('VISIT LOGGED · ×' + p.visits, 2500); A.beep('visit');
      }, { face: 'mini' });
      y += 14;

      // objectives
      const linked = S.missions.filter(x => x.poiId === p.id);
      y = g.section('TO-DOS', y, linked.filter(x => x.status === 'active').length + ' OPEN');
      linked.slice().sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1)).slice(0, 6).forEach(x => {
        const sel = g.row(0, y, W - 2, 10, () => A.go('calitem', { todo: x.id }));
        g.hex(5, y + 4, x.status === 'active' ? (x.priority === 'urgent' ? C.red : C.obj) : C.ink, x.status === 'active' ? 1 : 0.4);
        g.text(g.fit(x.title, W - 50), 12, y + 1, { a: x.status === 'active' ? 1 : 0.45, c: sel ? C.hot : C.ink });
        g.miniR(x.status === 'active' ? (x.deadline ? 'DUE ' + F.date(x.deadline) : 'ACTIVE') : 'DONE', W - 4, y + 2, { a: 0.6 });
        y += 11;
      });
      g.btn(0, y, W - 2, 11, '+ TO-DO HERE', () => {
        const mm = { id: 'MSN-' + Date.now(), title: S.markLabel(p), notes: '', priority: 'normal', status: 'active', created: Date.now(), completed: null, lat: p.lat, lng: p.lng, poiId: p.id, deadline: null, repeat: 'none' };
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
  // A fast past 24 hours starts a new lap: the bar resets, the count reads ×2, ×3 … and each lap has its colour.
  const LAP_COL = ['#FF8C2A', '#3D8BFF', '#A46BFF', '#FF4D4D', '#F2F4EC'];
  const LAP_NAME = ['ORANGE', 'BLUE', 'VIOLET', 'RED', 'WHITE'];
  const lapOf = ms => { ms = Math.max(0, ms); const n = Math.floor(ms / 864e5) + 1; return { n, frac: (ms % 864e5) / 864e5, col: LAP_COL[Math.min(n, LAP_COL.length) - 1] }; };
  RX.fastLap = lapOf; RX.fastLapCol = LAP_COL;
  // next goal to count down to: 18, 24, 36, 48, then every 24
  const nextGoal = h => h < 18 ? 18 : h < 24 ? 24 : h < 36 ? 36 : (Math.floor(h / 24) + 1) * 24;
  // typed start time: "8:30P", "2030", "7P", "YEST 9P", "SUN 6:15A", "10/11 21:00". A bare time means its last occurrence.
  function parseStart(str) {
    const s0 = RX.font.norm(str || '').trim(); if (!s0) return null;
    const now = new Date();
    let day = null, rest = s0;
    const md = rest.match(/^(\d{1,2})\/(\d{1,2})\s+/);
    if (md) { day = new Date(now.getFullYear(), +md[1] - 1, +md[2]); if (day > now) day.setFullYear(day.getFullYear() - 1); rest = rest.slice(md[0].length); }
    else {
      const wd = rest.match(/^(TODAY|YEST(?:ERDAY)?|SUN|MON|TUE|WED|THU|FRI|SAT)[A-Z]*\s+/);
      if (wd) {
        day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const k = wd[1];
        if (k.startsWith('YEST')) day.setDate(day.getDate() - 1);
        else if (k !== 'TODAY') { const want = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].indexOf(k); while (day.getDay() !== want) day.setDate(day.getDate() - 1); }
        rest = rest.slice(wd[0].length);
      }
    }
    const m = rest.replace(/\s+/g, '').match(/^(\d{1,2})(?::?(\d{2}))?(A|P|AM|PM)?$/);
    if (!m) return null;
    let hh = +m[1], mm = m[2] ? +m[2] : 0; const ap = m[3];
    if (mm > 59 || hh > 23 || (ap && (hh < 1 || hh > 12))) return null;
    if (ap) { if (ap[0] === 'P' && hh < 12) hh += 12; if (ap[0] === 'A' && hh === 12) hh = 0; }
    let d;
    if (day) { d = new Date(day); d.setHours(hh, mm, 0, 0); }
    else { d = new Date(now); d.setHours(hh, mm, 0, 0); if (d > now) d.setDate(d.getDate() - 1); }
    return d.getTime() <= Date.now() ? d.getTime() : null;
  }
  RX.parseFastStart = parseStart;

  function fastBar(g, y, el) {
    const W = g.W, mx = g.mx, x0 = 1, w = W - 4, L = lapOf(el);
    const prev = L.n > 1 ? LAP_COL[Math.min(L.n - 1, LAP_COL.length) - 1] : null;
    const off = (L.n - 1) * 24, TK = L.n === 1 ? [12, 16, 18] : L.n === 2 ? [12, 18] : [12];
    TK.forEach(h => { const l = String(off + h); g.mx.text(l, x0 + Math.round(w * h / 24) - Math.round(RX.font.measure(l, 'mini') / 2), y, { face: 'mini', c: g.ink, a: 0.7 }); });
    // the lap count, in the lap's colour
    if (L.n > 1) { const t = '×' + L.n, tw = RX.font.measure(t) + 4; mx.rect(W - tw - 2, y - 2, tw, 9, L.col, 0.9); g.text(t, W - tw, y - 1, { c: '#0B0805' }); }
    y += 7;
    for (let i = 0; i < 24; i++) {
      const sx = x0 + Math.round(w * i / 24), ex = x0 + Math.round(w * (i + 1) / 24) - 1;
      const done = i < Math.floor(L.frac * 24), part = !done && i < L.frac * 24;
      // what's left of this lap shows the last lap faintly underneath
      mx.rect(sx, y, ex - sx, 7, done || part ? L.col : (prev || g.ink), done ? 1 : part ? 0.6 : (prev ? 0.22 : 0.12));
    }
    TK.forEach(h => mx.vline(x0 + Math.round(w * h / 24) - 1, y - 2, 11, C.hot, 0.9));
    y += 9;
    ['0', '6', '12', '18', '24H'].forEach((l, i) => { const v = off + i * 6, lab = i === 4 ? (off + 24) + 'H' : String(v); mx.text(lab, Math.min(W - RX.font.measure(lab, 'mini') - 1, x0 + Math.round(w * i / 4) - (i ? 3 : 0)), y, { face: 'mini', c: g.ink, a: 0.5 }); });
    // finished laps as pips
    if (L.n > 1) { let px = x0; for (let k = 1; k < L.n; k++) { mx.rect(px, y + 7, 9, 3, LAP_COL[Math.min(k, LAP_COL.length) - 1], 0.95); px += 11; } y += 4; }
    return y + 8;
  }
  // a finished fast's bar in the history: whole laps under, the last lap's share over
  function lapBar(mx, x, y, w, h, hours) {
    const n = Math.floor(hours / 24), rem = hours % 24;
    mx.rect(x, y, w, h, LAP_COL[0], 0.12);
    for (let k = 0; k < n; k++) mx.rect(x, y, w, h, LAP_COL[Math.min(k, LAP_COL.length - 1)], 0.95);
    if (rem > 0) mx.rect(x, y, Math.round(w * rem / 24), h, LAP_COL[Math.min(n, LAP_COL.length - 1)], 0.95);
  }

  // ---- what the body is doing, hour by hour (approximate; people vary) ----
  // now: what's going on · feel: what you may notice · todo: what helps · stop: when to end it
  // Sources: Cahill 2006 (PubMed 16848698), Zauner 2000 (PubMed 10837292), Ho 1988 (JCI 113450),
  // Bagherniya 2018 autophagy review (PubMed 30172870), NICE CG32 refeeding criteria.
  const STAGES = [
    { h: 0, t: 'FED',
      now: 'DIGESTING YOUR LAST MEAL. BLOOD SUGAR AND INSULIN ARE UP AND THE BODY IS STORING ENERGY: TOPPING UP GLYCOGEN IN THE LIVER AND MUSCLES AND PUTTING THE EXTRA INTO FAT.',
      feel: 'FULL. SLEEPY AFTER A BIG OR CARB-HEAVY MEAL.',
      todo: 'START THE TIMER AFTER YOUR LAST BITE. WATER, BLACK COFFEE AND PLAIN TEA DO NOT BREAK THE FAST.' },
    { h: 4, t: 'POST-MEAL',
      now: 'DIGESTION WRAPS UP AND INSULIN FALLS BACK TOWARD BASELINE. THE LIVER RELEASES STORED SUGAR (GLYCOGEN) TO HOLD BLOOD SUGAR STEADY, AND FAT RELEASE PICKS UP.',
      feel: 'NORMAL. THE FIRST HUNGER USUALLY SHOWS UP AT YOUR USUAL MEAL TIMES. IT COMES IN WAVES AND PASSES.',
      todo: 'DRINK WATER. HUNGER AT A NORMAL MEALTIME IS HABIT (THE HORMONE GHRELIN RISES ON SCHEDULE), NOT AN EMERGENCY.' },
    { h: 12, t: 'FAT MOBILIZING',
      now: 'LIVER GLYCOGEN IS RUNNING DOWN. LOW INSULIN AND RISING GLUCAGON UNLOCK FAT STORES, SO FAT BECOMES A BIGGER SHARE OF YOUR FUEL AND THE LIVER STARTS MAKING KETONES. IT ALSO MAKES NEW SUGAR FROM GLYCEROL, LACTATE AND AMINO ACIDS (GLUCONEOGENESIS).',
      feel: 'HUNGER WAVES. LOWER FOCUS OR A SHORT FUSE, MOSTLY IF YOU USUALLY EAT OFTEN. IT GETS EASIER THE MORE FASTS YOU DO.',
      todo: 'STAY BUSY THROUGH A WAVE. A PINCH OF SALT IN WATER HELPS IF YOU FEEL FLAT.' },
    { h: 18, t: 'GLYCOGEN SPENT',
      now: 'LIVER GLYCOGEN IS LARGELY USED UP BY ABOUT 24H, SO MOST NEW SUGAR NOW COMES FROM GLUCONEOGENESIS. FAT SUPPLIES MOST OF YOUR ENERGY. KETONES REACH ABOUT 0.5 MMOL AROUND 21H. INSULIN IS NEAR ITS LOW.',
      feel: 'OFTEN A DIP AROUND 18-22H: HEADACHE, COLD HANDS, LOW ENERGY. IT USUALLY LEVELS OFF, AND SOME PEOPLE GET A SECOND WIND.',
      todo: 'SALT AND WATER. LOW INSULIN MAKES THE KIDNEYS LET GO OF SODIUM AND WATER: THAT IS MOST OF THE QUICK DROP ON THE SCALE, AND OF THE HEADACHES. KEEP TRAINING LIGHT TO MODERATE.' },
    { h: 24, t: 'KETOSIS',
      now: 'FAT IS THE MAIN FUEL. KETONES CLIMB TOWARD 1-2 MMOL AND THE BRAIN STARTS USING THEM. GROWTH HORMONE PULSES GROW, WHICH HELPS PROTECT MUSCLE. NOREPINEPHRINE RISES, SO YOUR METABOLISM HOLDS UP INSTEAD OF SLOWING. AUTOPHAGY (CELLS RECYCLING WORN PARTS) IS THOUGHT TO RISE, BUT MOST OF THAT EVIDENCE IS FROM ANIMALS.',
      feel: 'DAY 2 IS OFTEN THE HARDEST: HUNGER, HEADACHE, LIGHT SLEEP, A METALLIC TASTE OR KETO BREATH. HUNGER OFTEN EASES LATE ON DAY 2.',
      todo: 'SODIUM, POTASSIUM, MAGNESIUM: BROTH OR A SUGAR-FREE ELECTROLYTE MIX. STAND UP SLOWLY. BREAKING A 24-48H FAST: A NORMAL MEAL IS FINE, JUST SKIP THE BINGE.' },
    { h: 48, t: 'DEEP KETOSIS',
      now: 'KETONES 1.5-3 MMOL. THE BRAIN GETS A GROWING SHARE OF ITS ENERGY FROM KETONES, SO LESS SUGAR IS NEEDED AND MUSCLE BREAKDOWN STARTS TO EASE. IN ONE STUDY RESTING METABOLISM WAS ABOUT 14% HIGHER BY DAY 3 AND NOREPINEPHRINE MORE THAN DOUBLED BY DAY 4. BLOOD SUGAR SETTLES LOWER (ABOUT 3.5 MMOL / 63 MG/DL), WHICH IS NORMAL HERE.',
      feel: 'MANY FEEL STEADY, CLEAR-HEADED AND LESS HUNGRY. OTHERS FEEL WEAK, COLD OR DIZZY WHEN THEY STAND.',
      todo: 'KEEP THE ELECTROLYTES GOING. SKIP HARD WORKOUTS. BREAK IT WITH A SMALLER MEAL AND BUILD BACK UP.',
      stop: 'FAINTING, A RACING OR SKIPPING HEART, CONFUSION, VOMITING: EAT AND GET CHECKED.' },
    { h: 72, t: 'PROLONGED',
      now: 'KETONES 3+ MMOL, RISING TOWARD 5-7 OVER WEEKS. IN FASTS THAT LONG THE BRAIN RUNS UP TO ABOUT TWO-THIRDS ON KETONES AND THE BODY SPARES PROTEIN AS MUCH AS IT CAN. GROWTH HORMONE WAS ABOUT 3× BASELINE BY DAY 5 IN ONE STUDY. IMMUNE CELL RENEWAL HAS BEEN SEEN IN MICE.',
      feel: 'HUNGER IS MOSTLY QUIET. ENERGY COMES AND GOES. WEAKNESS, FEELING COLD, POOR SLEEP AND DIZZINESS ARE COMMON.',
      todo: 'THIS LONG, TALK TO A DOCTOR, ESPECIALLY IF YOU TAKE MEDS FOR BLOOD SUGAR OR BLOOD PRESSURE. PAST 5 DAYS REFEEDING SYNDROME BECOMES A REAL RISK: BREAK THE FAST WITH SMALL, LOW-SUGAR MEALS AND GET MEDICAL ADVICE.',
      stop: 'FAINTING, CHEST PAIN, A RACING OR SKIPPING HEART, CONFUSION, VOMITING: EAT AND GET CHECKED.' }
  ];
  const ramp = (h, a, b) => h <= a ? 0 : h >= b ? 1 : (h - a) / (b - a);
  const EFFECTS = [
    { k: 'INSULIN', d: 'LOW', f: h => 0.15 + 0.85 * ramp(h, 3, 16) },
    { k: 'GLYCOGEN', d: 'USE', f: h => h < 18 ? ramp(h, 2, 8) : 1 - ramp(h, 18, 30) * 0.85 },
    { k: 'FAT BURN', d: '', f: h => ramp(h, 10, 30) },
    { k: 'KETONES', d: '', f: h => Math.min(1, (h < 12 ? 0 : h < 21 ? 0.5 * (h - 12) / 9 : h < 48 ? 0.5 + 1.0 * (h - 21) / 27 : h < 72 ? 1.5 + 1.0 * (h - 48) / 24 : 2.5 + 1.0 * Math.min(1, (h - 72) / 48)) / 3.5), v: h => h < 12 ? 0.1 : h < 21 ? 0.1 + 0.4 * (h - 12) / 9 : h < 48 ? 0.5 + (h - 21) / 27 : h < 72 ? 1.5 + (h - 48) / 24 : 2.5 + Math.min(1, (h - 72) / 48) },
    { k: 'GROWTH H', d: '', f: h => ramp(h, 12, 60), v: h => 1 + 2 * ramp(h, 12, 120) },
    { k: 'AUTOPHGY', d: 'EST', f: h => ramp(h, 16, 60) },
    { k: 'HUNGER', d: '', f: h => Math.max(0, (0.55 + 0.45 * Math.cos((h % 24) / 24 * Math.PI * 6)) * (h < 48 ? 0.9 : Math.max(0.15, 0.9 - (h - 48) / 48))) },
    { k: 'IMMUNE', d: 'EST', f: h => ramp(h, 48, 96) }
  ];
  const stageAt = h => { let s = STAGES[0]; STAGES.forEach(x => { if (h >= x.h) s = x; }); return s; };
  const MAXH = 120;

  function pageStages(g, st, A) {
    const W = g.W, H = g.H, mx = g.mx, f = S.activeFast(), now = f ? (Date.now() - f.startTs) / 36e5 : null;
    if (st.scrub == null) st.scrub = now != null ? Math.min(MAXH, now) : 18;
    const h = st.scrub, L = lapOf(h * 36e5);
    g.header('FAST · STAGES', now != null ? 'NOW ' + F.durHM(now * 36e5) + (Math.floor(now / 24) ? ' ×' + (Math.floor(now / 24) + 1) : '') : 'NO FAST · PREVIEW', { c: C.amber });
    let y = 13;
    // the window: 24 hours wide, following the scrubber
    const lx = 40, cw = W - lx - 2, span = 24, pph = cw / span;
    const t0 = Math.max(0, Math.min(MAXH - span, h - span / 2));
    const X = hh => Math.round(lx + (hh - t0) * pph);
    // lap colours along the top
    for (let x = lx; x < lx + cw; x++) { const hh = t0 + (x - lx) / pph; mx.rect(x, y, 1, 3, lapOf(hh * 36e5).col, 0.85); }
    y += 5;
    for (let hh = Math.ceil(t0 / 6) * 6; hh <= t0 + span; hh += 6) { const x = X(hh), lab = String(hh); mx.text(lab, Math.max(lx, Math.min(W - RX.font.measure(lab, 'mini') - 1, x - 3)), y, { face: 'mini', c: g.ink, a: 0.6 }); }
    y += 7;
    const top = y, rh = 9;
    EFFECTS.forEach((e, i) => {
      const ry = y + i * rh;
      g.mini(e.k, 1, ry + 2, { a: 0.75 }); if (e.d === 'EST') g.mini('•', 2 + RX.font.measure(e.k, 'mini'), ry + 2, { a: 0.5 });
      for (let x = lx; x < lx + cw; x++) {
        const hh = t0 + (x - lx) / pph, v = Math.max(0, Math.min(1, e.f(hh))), hgt = Math.round(v * 7), past = now != null && hh <= now, col = lapOf(hh * 36e5).col;
        if (hgt > 0) { mx.rect(x, ry + 8 - hgt, 1, hgt, col, past ? 0.5 : 0.22); mx.set(x, ry + 8 - hgt, col, past ? 1 : 0.6); }
        else mx.set(x, ry + 7, g.ink, 0.12);
      }
      mx.hline(lx, ry + 8, cw, g.ink, 0.1, 2);
    });
    const bot = y + EFFECTS.length * rh;
    // stage boundaries
    STAGES.forEach(sg => { if (sg.h > t0 && sg.h < t0 + span) mx.vline(X(sg.h), top - 1, bot - top + 1, g.ink, 0.25, 2); });
    // NOW and the scrubber
    if (now != null && now >= t0 && now <= t0 + span) { const x = X(now), nc = lapOf(now * 36e5).col; mx.vline(x, top - 1, bot - top + 1, nc, 0.6, 2); mx.hline(x - 2, top - 14, 5, nc, 1); mx.hline(x - 1, top - 13, 3, nc, 1); mx.set(x, top - 12, nc, 1); }
    const sx = X(h);
    mx.vline(sx, top - 3, bot - top + 5, C.hot, 1);
    mx.rect(sx - 1, top - 4, 3, 2, C.hot, 1);
    // drag across the chart to scrub
    g.hit(lx, top - 8, cw, bot - top + 10, () => {}, { scrub: true });
    y = bot + 4;
    // what's happening at the scrubber
    const sg = stageAt(h);
    if (st.stageShown !== sg.t) { st.stageShown = sg.t; st.scroll = 0; }   // a new stage starts at its top
    mx.hline(0, y - 1, W, g.ink, 0.25, 2);
    g.text(Math.floor(h) + 'H' + (h % 1 ? String(Math.round((h % 1) * 60)).padStart(2, '0') : '') + ' · ' + sg.t, 1, y + 2, { c: L.col });
    if (L.n > 1) g.textR('×' + L.n, W - 2, y + 2, { c: L.col });
    y += 11;
    // the numbers at this hour, on one line
    const ket = EFFECTS[3].v(h), gh = EFFECTS[4].v(h);
    const nums = 'KETONES ' + ket.toFixed(1) + ' MMOL' + (gh > 1.15 ? ' · GROWTH H ' + gh.toFixed(1) + '×' : '') + ' · ESTIMATES';
    g.mini(g.fit(nums, W - 3, 'mini'), 1, y, { c: C.hot, a: 0.9 });
    y += 8;
    // the stage write-up scrolls (drag up and down; drag sideways or jog to move through time)
    const per = Math.floor((W - 6) / 4);
    let yy = g.scrollBegin(y, H - 12);
    const block = (head, text, c) => {
      g.mini(head, 1, yy, { c: c || L.col, a: 1 }); yy += 7;
      U.wrap(text, per).forEach(l => { g.mini(l, 3, yy, { a: 0.88 }); yy += 7; });
      yy += 3;
    };
    block("WHAT'S HAPPENING", sg.now);
    block('YOU MAY FEEL', sg.feel);
    block('WHAT HELPS', sg.todo);
    if (sg.stop) block('STOP AND EAT IF', sg.stop, C.red);
    U.wrap('APPROXIMATE · PEOPLE VARY · • MOSTLY ANIMAL DATA · NOT MEDICAL ADVICE', per).forEach(l => { g.mini(l, 1, yy, { a: 0.4 }); yy += 7; });
    g.scrollEnd(yy + 2);
    return 'JOG ▸ SCRUB · PUSH ▸ NOW';
  }

  RX.screens.fast = {
    pal: 'amber',
    drum: ['fast', 'stages', 'train'],
    // HLTH opens on the page you last used; the calendar can open it on TRAIN for a day
    enter(st, params) { params = params || {}; st.page = params.page || S.v2.hlthPage || 'fast'; if (params.day) st.fday = params.day; },
    animating: () => true,
    onPage(pg, st, A) { st.scroll = 0; S.saveV2({ hlthPage: pg }); if (pg === 'stages') { const f = S.activeFast(); st.scrub = f ? Math.min(MAXH, (Date.now() - f.startTs) / 36e5) : 18; } },
    jogLabels: st => st.page === 'stages' ? ['◂ EARLIER', 'LATER ▸', 'PUSH ▸ NOW'] : st.page === 'train' ? ['◂ UP', 'DOWN ▸', 'PUSH ▸ DONE'] : ['◂ UP', 'DOWN ▸', 'PUSH SELECT · HOLD MAP'],
    longPress(d, st, A) { if (st.page !== 'train') return; const t = RX.fit.tileAt(st, d); if (t) { A.beep('key'); A.go('move', { id: t.id, day: st.fday }); } },
    jog(d, st, A) {
      if (st.page === 'stages') { st.scrub = Math.max(0, Math.min(MAXH, Math.round((st.scrub || 0) + d))); return; }   // an hour a click
      A.focusJog(d);
    },
    push(st, A) {
      if (st.page === 'stages') { const f = S.activeFast(); st.scrub = f ? Math.min(MAXH, (Date.now() - f.startTs) / 36e5) : 18; A.say(f ? 'SCRUBBER ▸ NOW' : 'NO FAST RUNNING', 1500); return; }
      A.focusPush();
    },
    // on STAGES a sideways drag moves the scrubber, an up-down drag scrolls the write-up
    drag(dx, dy, st) { if (st.page === 'stages' && Math.abs(dx) > Math.abs(dy)) st.scrub = Math.max(0, Math.min(MAXH, (st.scrub || 0) + dx / ((RX.app.mx.cols - 36) / 24))); else { st.scroll = Math.max(0, Math.min(st.scrollMax || 0, (st.scroll || 0) - dy)); } },
    render(g, st, A) {
      const W = g.W, mx = g.mx;
      if (st.page === 'stages') { const ft = pageStages(g, st, A); g.footer(A.sayActive() ? A.statusShown(g.t) : ft); return; }
      if (st.page === 'train') { const ft = RX.fit.page(g, st, A); g.footer(A.sayActive() ? A.statusShown(g.t) : ft); return; }
      const f = S.activeFast(), fs = S.fastStreak();
      let y = g.header(f ? 'FAST · DAY ' + f.dayNum : 'FAST', 'STREAK ' + fs.current + (fs.atRisk ? ' · AT RISK' : ''), { c: C.amber });
      y = g.scrollBegin(y, footTop(g));
      if (f) {
        const el = Date.now() - f.startTs, L = lapOf(el), hrs = el / 36e5;
        g.mini('ELAPSED', 1, y, { a: 0.6 });
        y += 8;
        const s = F.dur(el);
        g.text(s, 1, y, { s: 3, c: L.col });
        y += 24;
        g.mini('START ' + F.day(f.startTs) + ' ' + F.hm(f.startTs), 1, y, { a: 0.75 });
        const goal = nextGoal(hrs);
        g.miniR(goal + 'H IN ' + F.durHM(goal * 36e5 - el), W - 3, y, { a: 0.95, c: C.amber });
        y += 10;
        y = fastBar(g, y, el);
        y += 2;
        {
          const bw = Math.floor((W - 2) * 0.58);
          g.btn(0, y, bw, 14, '■ END FAST', () => { const e = S.endFast(); A.say('FAST ENDED · ' + e.hours + 'H · DAY ' + e.dayNum, 4000); A.beep('file'); A.updateLamps(); }, { solid: true });
          g.btn(bw + 2, y, W - 4 - bw, 14, 'EDIT START', () => setStart(A, f));
        }
        y += 18;
      } else {
        const next = S.fasts.reduce((m, x) => Math.max(m, x.dayNum || 0), 0) + 1;
        const last = S.fasts.filter(x => x.endTs).sort((a, b) => b.endTs - a.endTs)[0];
        g.text('READY · DAY ' + next, 1, y + 2, { s: 2, c: C.amber });
        y += 20;
        if (last) g.mini('LAST FAST ENDED ' + F.day(last.endTs) + ' ' + F.hm(last.endTs) + ' · ' + last.hours + 'H', 1, y, { a: 0.7 });
        y += 10;
        g.btn(0, y, W - 2, 15, '▸ START FAST NOW', () => { const n = S.startFast(); if (n) { A.say('FAST STARTED · DAY ' + n.dayNum, 3500); A.beep('file'); A.updateLamps(); } }, { solid: true });
        y += 17;
        g.btn(0, y, W - 2, 12, 'ALREADY STARTED? SET THE TIME ▸', () => startEarlier(A, last), { face: 'mini' });
        y += 16;
      }

      // history
      const done = S.fasts.filter(x => x.endTs).sort((a, b) => b.startTs - a.startTs);
      y = g.section('LAST FASTS', y, done.length + ' TOTAL');
      done.slice(0, 8).forEach(x => {
        const sel = g.row(0, y, W - 2, 10, () => A.go('fastrec', { id: x.id }));
        g.mini(F.day(x.startTs), 2, y + 2, { a: sel ? 1 : 0.7 });
        // the bar stops short of the hours, however wide they print
        const hv = (x.hours || 0).toFixed(1) + 'H', bx = 48, bw = W - bx - RX.font.measure('000.0H') - 9;
        lapBar(mx, bx, y + 2, bw, 5, x.hours || 0);
        g.textR(hv, W - 4, y + 1);
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

  // ---------------------------------------------------------------- set time: four rolling drums (DAY · HOUR · MIN · AM/PM)
  // Flick a drum up or down: it spins, slows and clicks into place; the row in the window is the pick. Tap the row above or
  // below to step one; the jog rolls the picked drum. Never later than now, never before `min`, never after `max`.
  const t12h = ts => { const d = new Date(ts); return (d.getHours() % 12 || 12) + ':' + F.pad2(d.getMinutes()) + ' ' + (d.getHours() < 12 ? 'AM' : 'PM'); };
  const sodT = ts => { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const dayWord = ts => { const n = Math.round((sodT(Date.now()) - sodT(ts)) / 864e5); return n === 0 ? 'TODAY' : n === 1 ? 'YESTERDAY' : n < 7 ? n + ' DAYS AGO' : ''; };
  const hm2 = ms => { const m = Math.max(0, Math.round(ms / 60000)); return Math.floor(m / 60) + 'H ' + F.pad2(m % 60) + 'M'; };
  const modn = (a, n) => ((a % n) + n) % n;
  const DR = { P: 19, R: 32, SY: 2 };                     // row pitch round the drum, drum radius, rows drawn twice as tall
  const DRUMS = ['day', 'hr', 'min', 'ap'];
  const DNAME = { day: 'DAY', hr: 'HOUR', min: 'MIN', ap: 'AM/PM' };
  function drumLimits(p) { const now = Date.now(); return { lo: p.min != null ? p.min : now - 60 * 864e5, hi: Math.min(now, p.max != null ? p.max : Infinity) }; }
  function drumBuild(st) {
    const L = drumLimits(st.p), days = [];
    for (let d = new Date(sodT(L.lo)); d.getTime() <= sodT(L.hi); d.setDate(d.getDate() + 1)) days.push(d.getTime());
    st.days = days;
    st.dr = {
      day: { n: days.length, cyc: false, sx: 1, label: i => dayWord(days[i]) || F.day(days[i]) },
      hr: { n: 12, cyc: true, sx: 2, label: i => String(i || 12) },
      min: { n: 60, cyc: true, sx: 2, label: i => F.pad2(i) },
      ap: { n: 2, cyc: false, sx: 1, label: i => i ? 'PM' : 'AM' },
    };
    DRUMS.forEach(k => Object.assign(st.dr[k], { pos: 0, anim: null, v: 0, lastT: 0, tick: 0 }));
    drumsTo(st, st.t, false);
  }
  const drumIdx = (c, at) => { const r = Math.round(at != null ? at : (c.anim ? c.anim.to : c.pos)); return c.cyc ? modn(r, c.n) : Math.max(0, Math.min(c.n - 1, r)); };
  function drumTime(st, live) {
    const D = st.dr, pick = k => drumIdx(D[k], live ? D[k].pos : null);
    const d = new Date(st.days[pick('day')]); d.setHours(pick('hr') + 12 * pick('ap'), pick('min'), 0, 0); return d.getTime();
  }
  function drumRoll(c, to) {
    if (!c.cyc) to = Math.max(0, Math.min(c.n - 1, to));
    const dist = Math.abs(to - c.pos);
    c.anim = dist < 0.01 ? null : { from: c.pos, to, t0: performance.now(), dur: Math.max(160, Math.min(1100, dist * 55)) };
    if (!c.anim) c.pos = to;
  }
  function drumsTo(st, t, animate) {
    const d = new Date(t), want = { day: Math.max(0, st.days.indexOf(sodT(t))), hr: d.getHours() % 12, min: d.getMinutes(), ap: d.getHours() >= 12 ? 1 : 0 };
    DRUMS.forEach(k => { const c = st.dr[k]; let to = want[k];
      if (c.cyc) { const base = Math.round(c.anim ? c.anim.to : c.pos); to = base + ((modn(want[k] - base, c.n) + c.n / 2) % c.n) - c.n / 2; }   // the short way round
      if (animate) drumRoll(c, to); else { c.pos = to; c.anim = null; } c.tick = Math.round(c.pos); });
    st.t = t;
  }
  // after every drum has stopped: keep the time inside its limits, rolling back if it went too far
  function drumSettle(st, A) {
    const p = st.p, L = drumLimits(p); let t = drumTime(st);
    if (t > L.hi) { drumsTo(st, L.hi, true); A.say(p.max != null && p.max < Date.now() ? 'CAN\'T BE AFTER THE END · ' + F.day(p.max) + ' ' + t12h(p.max) : 'CAN\'T BE LATER THAN NOW', 2400); A.beep('err'); }
    else if (t < L.lo) { drumsTo(st, L.lo, true); A.say(p.minWhy || 'CAN\'T BE BEFORE THE START', 2400); A.beep('err'); }
    else st.t = t;
  }
  function drumTick(st, A) {
    const now = performance.now(); let moving = !!st.drag;
    DRUMS.forEach(k => { const c = st.dr[k];
      if (c.anim) { const a = c.anim, q = Math.min(1, (now - a.t0) / a.dur), e = 1 - Math.pow(1 - q, 3); c.pos = a.from + (a.to - a.from) * e; if (q >= 1) { c.pos = a.to; c.anim = null; } else moving = true; }
      const r = Math.round(c.pos); if (r !== c.tick) { c.tick = r; A.beep('jog'); }   // a click as each row passes the window
    });
    if (st.wasMoving && !moving) drumSettle(st, A);
    st.wasMoving = moving;
  }
  // one row, drawn round the drum: each line of dots lands where it would on a cylinder, and darkens as it turns away
  function drumText(mx, str, cx, yc, th0, sx, c, a) {
    const f = RX.font.std, H = f.h * DR.SY, w = RX.font.measure(str, 'std', sx);
    let x = Math.round(cx - w / 2);
    for (const ch of RX.font.norm(str)) {
      const gl = f.glyphs[ch] || f.glyphs[f.fallback];
      for (let gy = 0; gy < f.h; gy++) for (let dy = 0; dy < DR.SY; dy++) {
        const th = th0 + (gy * DR.SY + dy + 0.5 - H / 2) / DR.R; if (Math.abs(th) > 1.5) continue;
        const yy = Math.round(yc + DR.R * Math.sin(th)), sh = Math.cos(th), row = gl[gy];
        for (let gx = 0; gx < f.w; gx++) if (row[gx]) for (let dx = 0; dx < sx; dx++) mx.set(x + gx * sx + dx, yy, c, a * (0.18 + 0.82 * sh * sh));
      }
      x += f.adv * sx;
    }
  }
  RX.screens.settime = {
    pal: 'amber',
    enter(st, params) { st.p = params || {}; st.t = st.p.ts || Date.now(); st.k = 'hr'; drumBuild(st); },
    animating: () => true,
    jogLabels: st => ['◂ ' + DNAME[st.k], DNAME[st.k] + ' ▸', 'PUSH ▸ SAVE'],
    jog(d, st, A) { const c = st.dr[st.k]; drumRoll(c, Math.round(c.anim ? c.anim.to : c.pos) + d); st.wasMoving = true; },
    push(st, A) { saveTime(st, A); },
    drag(dx, dy, st, A, d0) {
      if (!st.drag) { const k = (d0 && st.cols && st.cols.find(o => d0.x >= o.x && d0.x < o.x + o.w)) || null; st.drag = { k: k ? k.k : st.k }; if (st.k !== st.drag.k) { st.k = st.drag.k; A.refreshChrome(); } }
      const c = st.dr[st.drag.k], now = performance.now();
      let dp = -dy / DR.P;
      if (!c.cyc && ((c.pos < 0 && dp < 0) || (c.pos > c.n - 1 && dp > 0))) dp *= 0.3;   // past the end: stiff
      c.anim = null; c.pos += dp;
      const dt = Math.max(8, now - (c.lastT || now - 16)), inst = dp / (dt / 1000); c.v = now - c.lastT > 90 ? inst : c.v * 0.35 + 0.65 * inst; c.lastT = now;
    },
    dragEnd(st, A) {
      if (!st.drag) return; const c = st.dr[st.drag.k]; st.drag = null;
      // let go while moving: it coasts and slows (a slow drag stops where you leave it; a hard flick spins on)
      const v = performance.now() - c.lastT > 90 ? 0 : Math.max(-60, Math.min(60, c.v));
      drumRoll(c, Math.round(c.pos + Math.sign(v) * v * v / 90)); st.wasMoving = true;
    },
    render(g, st, A) {
      drumTick(st, A);
      const W = g.W, mx = g.mx, p = st.p, HOT = '#FFE3B8', AMB = C.amber;
      let y = g.header(p.title || 'SET TIME', '', { c: AMB });
      if (p.what) { g.mini(p.what, 1, y, { a: 0.7 }); y += 8; }
      // the answer as it reads now
      const live = drumTime(st, true), dw = dayWord(live);
      g.text((dw ? dw + ' · ' : '') + F.day(live), 1, y + 1, { c: HOT });
      y += 10;
      if (p.span) g.mini((p.spanLabel || 'LENGTH') + ' ' + hm2(p.span(live)), 1, y + 1, { c: AMB, a: 1 });
      y += 9;
      // the drums
      const gap = 3, apW = 18, hrW = 28, mnW = 28, coW = 8, dayW = W - 2 - (apW + hrW + mnW + coW + gap * 3);
      const xs = { day: 1 }; xs.hr = xs.day + dayW + gap; xs.min = xs.hr + hrW + coW; xs.ap = xs.min + mnW + gap;
      const ws = { day: dayW, hr: hrW, min: mnW, ap: apW };
      st.cols = DRUMS.map(k => ({ k, x: xs[k], w: ws[k] }));
      DRUMS.forEach(k => g.mini(DNAME[k] === 'AM/PM' ? '' : DNAME[k], xs[k] + 1, y + 1, { a: st.k === k ? 1 : 0.55, c: st.k === k ? HOT : AMB }));
      y += 8;
      // the drums take the room there is: bigger on a tall screen, never too small to read
      DR.R = Math.max(28, Math.min(54, Math.floor((footTop(g) - y - 4 - 23 - 4) / 2)));
      const top = y, yc = y + DR.R + 2, bot = yc + DR.R + 2; st.yc = yc;
      mx.rect(0, yc - 10, W, 21, AMB, 0.1);                            // the window
      DRUMS.forEach(k => {
        const c = st.dr[k], x = xs[k], w = ws[k], on = st.k === k;
        mx.frame(x - 1, top, w + 2, bot - top + 1, AMB, on ? 0.5 : 0.22);   // the drum's housing
        mx.pushClip(x, top + 1, w, bot - top - 1);
        const i0 = Math.floor(c.pos) - 3, i1 = Math.ceil(c.pos) + 3;
        for (let i = i0; i <= i1; i++) {
          if (!c.cyc && (i < 0 || i >= c.n)) continue;
          const th = (i - c.pos) * DR.P / DR.R; if (Math.abs(th) > 1.75) continue;
          const mid = Math.abs(i - c.pos) < 0.5;
          drumText(mx, c.label(c.cyc ? modn(i, c.n) : i), x + w / 2, yc, th, c.sx, mid ? HOT : AMB, mid ? 1 : (on ? 0.85 : 0.6));
        }
        mx.popClip();
        mx.frame(x - 1, yc - 10, w + 2, 21, on ? HOT : AMB, on ? 1 : 0.55);
        // tap the window to pick this drum; tap above or below to step it
        g.hit(x - 1, top, w + 2, bot - top, d => {
          if (st.k !== k) { st.k = k; A.refreshChrome(); }
          const off = d.y - yc; if (Math.abs(off) <= 10) return;
          const rows = Math.round(Math.asin(Math.max(-1, Math.min(1, off / DR.R))) * DR.R / DR.P) || Math.sign(off);
          drumRoll(c, Math.round(c.anim ? c.anim.to : c.pos) + rows); st.wasMoving = true;
        });
      });
      g.text(':', xs.hr + hrW, yc - 7, { s: 2, c: HOT });
      y = bot + 4;
      const bw = Math.floor((W - 2) * 0.36);
      g.btn(0, y, bw, 15, 'CANCEL', () => A.back());
      g.btn(bw + 2, y, W - 4 - bw, 15, '▸ ' + (p.saveLabel || 'SAVE'), () => saveTime(st, A), { solid: true });
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'FLICK A DRUM UP OR DOWN');
    }
  };
  function saveTime(st, A) {
    // a drum still spinning: take where it will stop, inside the limits
    const L = drumLimits(st.p); const t = Math.max(L.lo, Math.min(L.hi, drumTime(st)));
    const p = st.p; A.back(); if (p.onSave) p.onSave(t);
  }

  // the three ways in
  function setStart(A, f) {
    const prev = S.fasts.filter(x => x.endTs && x.id !== f.id && x.endTs <= f.startTs).sort((a, b) => b.endTs - a.endTs)[0];
    A.go('settime', { title: 'FAST · DAY ' + f.dayNum, what: 'WHEN DID IT START?', ts: f.startTs, min: prev ? prev.endTs : null, minWhy: 'CAN\'T BE BEFORE YOUR LAST FAST ENDED', span: t => Date.now() - t, spanLabel: 'FASTING FOR', saveLabel: 'SAVE START',
      onSave: t => { f.startTs = t; S.saveFasts(); A.say('START ▸ ' + F.day(t) + ' ' + t12h(t) + ' · ' + hm2(Date.now() - t) + ' IN', 3500); A.beep('ok'); A.updateLamps(); } });
  }
  function startEarlier(A, last) {
    const now = new Date(); now.setSeconds(0, 0); now.setMinutes(Math.floor(now.getMinutes() / 5) * 5);
    A.go('settime', { title: 'START A FAST', what: 'WHEN DID YOU STOP EATING?', ts: now.getTime(), min: last ? last.endTs : null, minWhy: 'CAN\'T BE BEFORE YOUR LAST FAST ENDED', span: t => Date.now() - t, spanLabel: 'FASTING FOR', saveLabel: 'START FAST',
      onSave: t => { const n = S.startFast(); if (!n) return; n.startTs = t; S.saveFasts(); A.say('FAST STARTED · DAY ' + n.dayNum + ' · ' + hm2(Date.now() - t) + ' IN', 3500); A.beep('file'); A.updateLamps(); } });
  }
  function setRec(A, f, key) {
    const isEnd = key === 'endTs';
    A.go('settime', { title: 'FAST · DAY ' + f.dayNum, what: isEnd ? 'WHEN DID IT END?' : 'WHEN DID IT START?', ts: f[key],
      min: isEnd ? f.startTs : null, max: isEnd ? null : f.endTs, minWhy: 'CAN\'T BE BEFORE THE START',
      span: t => isEnd ? t - f.startTs : (f.endTs || Date.now()) - t, spanLabel: 'FAST LENGTH', saveLabel: isEnd ? 'SAVE END' : 'SAVE START',
      onSave: t => { f[key] = t; S.recalcFastHours(f); S.saveFasts(); A.say((isEnd ? 'END' : 'START') + ' ▸ ' + F.day(t) + ' ' + t12h(t) + ' · ' + (f.hours || 0) + 'H', 3500); A.beep('ok'); } });
  }

  RX.screens.fastrec = {
    pal: 'amber',
    render(g, st, A) {
      const W = g.W;
      const f = S.fasts.find(x => x.id === A.top().params.id);
      if (!f) { g.header('FAST'); g.textC('NOT FOUND', W / 2, 40); g.footer('BACK TO RETURN'); return; }
      let y = g.header('FAST · DAY ' + (f.dayNum || '?'), f.endTs ? (f.hours || 0) + 'H' : 'IN PROGRESS', { c: C.amber });
      y = g.scrollBegin(y, footTop(g));
      const rowT = (label, key) => {
        y = g.section(label, y);
        g.text(f[key] ? F.day(f[key]) + ' ' + F.hm(f[key]) : '--', 1, y + 3);
        if (f[key]) g.btn(W - 50, y, 48, 13, 'CHANGE', () => setRec(A, f, key), { face: 'mini' });
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
      row('KEY SOUNDS', 'CLICKS · THE MUTE SWITCH, TOO', tog(S.v2.sound), () => { S.saveV2({ sound: !S.v2.sound }); A.beep('key'); if (A.syncSwitches) A.syncSwitches(); });
      row('SOUND TEST', 'EVERY SOUND FOLDER · TAP ONE TO HEAR IT', arrow, () => A.go('sound'));

      y = g.section('02 · PLACE NAMES', y + 2);
      row('LOOKUP', 'AREA · CITY · METRO VIA OPENSTREETMAP', tog(S.v2.placeLookup), () => { S.saveV2({ placeLookup: !S.v2.placeLookup }); if (S.v2.placeLookup && A.gps) A.placeLookup(A.gps.lat, A.gps.lng); });
      row('AUTO-NAME MARKS', 'STREET ADDRESS AS DEFAULT NAME', tog(S.v2.autoName !== false), () => S.saveV2({ autoName: S.v2.autoName === false }));
      row('MARK RING', 'THE SIX KINDS AROUND A NEW MARK', arrow, () => A.go('ringkinds'));
      row('NOW', A.place ? A.place.area + ' · ' + A.place.city + ' · ' + A.place.metro : (A.gps ? 'LOOKING UP' : 'NO FIX YET'), null, () => { if (A.gps) A.placeLookup(A.gps.lat, A.gps.lng); });
      row('PLACES VISITED', 'CITIES AND TOWNS ON RECORD', val(String(new Set(S.regions.map(r => r.name)).size)), null);

      y = g.section('03 · MAP, TRACKS & FOG', y + 2);
      const SRC = ['AUTO', 'ESRI', 'OSM'];
      row('MAP SOURCE', 'NOW ' + M.sourceName() + (M.loaded ? ' · OK' : '') + Object.keys(M.why).map(k => ' · ' + k + ' ' + M.why[k]).join(''), val(S.v2.mapSrc || 'AUTO'), () => {
        const nx = SRC[(SRC.indexOf(S.v2.mapSrc || 'AUTO') + 1) % SRC.length];
        S.saveV2({ mapSrc: nx }); M.setSource(nx); A.say('MAP SOURCE ▸ ' + (nx === 'AUTO' ? 'AUTO · ' + M.sourceName() : M.sourceName()), 2500);
      });
      row('TRACKS', S.tracks.length + ' KEPT · ' + (S.tracks.reduce((m, t) => m + (t.m || 0), 0) / 1609.344).toFixed(1) + ' MI' + (S.rec ? ' · RECORDING' : ' · REC ON THE AUX DECK'), arrow, () => A.go('tracks'));
      const mi2 = S.fog.size * 150 * 150 / 2589988;
      row('FOG DENSITY', F.num(S.fog.size) + ' CELLS · ' + mi2.toFixed(0) + ' SQ MI EXPLORED', val(S.prefsV1.fogOpacity || 'HEAVY'), () => { S.savePrefsV1({ fogOpacity: FOGS[(FOGS.indexOf(S.prefsV1.fogOpacity || 'HEAVY') + 1) % 4] }); M.dirty = true; });
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
      row('KEYBOARD', 'M MARK · 1-6 · F FN · P AUX · A REC · W PARK · ESC BACK', null, null);

      y = g.section('06 · DANGER', y + 2);
      row('DELETE ALL MARKS', 'PERMANENTLY REMOVE ' + S.pois.length + ' MARKS', arrow, () => A.go('confirm', { title: 'DELETE ALL MARKS', danger: true, confirm: 'DELETE ALL', lines: ['PERMANENTLY DELETE ALL', S.pois.length + ' MARKS?', 'EXPORT A BACKUP FIRST.'], onConfirm: () => { S.wipe('marks'); A.updateLamps(); A.say('ALL MARKS DELETED', 3000); } }), { red: true });
      row('FULL RESET', 'WIPE EVERYTHING ON THIS DEVICE', arrow, () => A.go('confirm', { title: 'FULL RESET', danger: true, confirm: 'WIPE ALL', lines: ['WIPE MARKS, FOG, TRACKS,', 'OBJECTIVES, FASTS, SETTINGS?', 'THIS CANNOT BE UNDONE.'], onConfirm: () => { S.wipe('all'); A.updateLamps(); M.dirty = true; A.say('DEVICE RESET', 3000); } }), { red: true });

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
      // by colour, then the kinds you file most
      U.CATS.forEach((c, i) => {
        const n = S.pois.filter(p => p.category === c.id).length;
        mx.rect(3, y + 1, 9, 6, c.color, 1);
        g.mini('COLOR ' + (i + 1), 16, y + 2, { a: 0.7 });
        const bw = Math.round((W - 90) * n / Math.max(1, classified.length));
        mx.rect(70, y + 2, bw, 5, c.color, 0.85);
        g.textR(String(n), W - 4, y + 1);
        y += 10;
      });
      const kc = {}; classified.forEach(p => { const k = U.kindOf(p); if (k) kc[k] = (kc[k] || 0) + 1; });
      Object.entries(kc).sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([k, n]) => {
        g.kindPin(7, y + 4, k, C.ink, { a: 0.9 });
        g.text(k, 16, y + 1, { a: 0.75 });
        mx.rect(70, y + 2, Math.round((W - 90) * n / Math.max(1, classified.length)), 5, C.ink, 0.6);
        g.textR(String(n), W - 4, y + 1);
        y += 11;
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
      kv('TRACKS', S.tracks.length + ' · ' + (S.tracks.reduce((m, t) => m + (t.m || 0), 0) / 1609.344).toFixed(1) + ' MI');
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
        const items = S.pois.filter(p => RX.font.norm([p.name, p.notes, U.kindOf(p) || ''].join(' ')).includes(q))
          .map(p => ({ p, m: distTo(A, p), b: brgTo(A, p) })).sort((a, b) => a.m - b.m).slice(0, 6);
        y = g.section('YOUR MARKS · ' + items.length, y);
        y = assetRows(g, st, A, items, y, p => A.openMark(p.id));
        y = g.section('PLACES + ADDRESSES', y + 2, st.busy ? 'SEARCHING' : (st.err ? 'OFFLINE' : st.places.length + ' FOUND'));
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
      const res = await Geo.search(q, here(A), A.place);
      if ((st.q || '').trim() !== q) return;
      const h = here(A);
      // house matches first, then places, then streets; nearest first within each
      st.places = res.sort((a, b) => (a.rank || 0) - (b.rank || 0) || Geo.meters(h.lat, h.lng, a.lat, a.lng) - Geo.meters(h.lat, h.lng, b.lat, b.lng)).slice(0, 8);
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
  // EVERY KIND (from the MARK ring's hub) · the MARK RING's six (from MENU)
  // ======================================================================
  function kindGrid(g, y, cur, onPick, col) {
    const W = g.W, mx = g.mx, per = 3, cw = Math.floor((W - 2) / per);
    U.KINDS.forEach((kd, i) => {
      const x = (i % per) * cw, yy = y + Math.floor(i / per) * 15, on = cur && cur(kd.id);
      const sel = g.focusable(x, yy, cw - 2, 14, () => onPick(kd.id));
      mx.frame(x, yy, cw - 2, 14, on ? C.hot : sel ? C.ink : C.ink, on ? 1 : sel ? 0.9 : 0.2);
      g.kindPin(x + 8, yy + 7, kd.id, on ? (col || C.amber) : C.ink, { a: on ? 1 : 0.8 });
      g.mini(g.fit(kd.id, cw - 20, 'mini'), x + 16, yy + 5, { c: on ? C.hot : C.ink, a: on ? 1 : 0.8 });
    });
    return y + Math.ceil(U.KINDS.length / per) * 15 + 2;
  }
  RX.screens.kindpick = {
    jogLabels: () => ['◂ UP', 'DOWN ▸', 'PUSH ▸ PICK'],
    leave(st, A) { if (A.assign) A.assign.until = Date.now() + A.ASSIGN_MS; },   // back on the map, the ring's clock restarts
    render(g, st, A) {
      const a = A.assign;
      if (!a) { g.header('PICK A KIND'); g.textC('NO MARK WAITING', g.W / 2, 40); g.footer('BACK TO RETURN'); return; }
      let y = g.header('PICK A KIND', 'MARK ' + a.id.slice(-4));
      y = g.scrollBegin(y, footTop(g));
      y = kindGrid(g, y, k => k === (a.kind || A.ringKinds()[a.sel]), k => { A.back(); A.pickKind(k); });
      g.scrollEnd(y);
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'THEN PICK ITS COLOR');
    }
  };
  RX.screens.ringkinds = {
    enter(st) { st.slot = 0; },
    jogLabels: () => ['◂ UP', 'DOWN ▸', 'PUSH SELECT'],
    render(g, st, A) {
      const W = g.W, mx = g.mx, ring = A.ringKinds();
      let y = g.header('MARK RING', 'SLOT ' + (st.slot + 1) + ' · ' + ring[st.slot]);
      y = g.scrollBegin(y, footTop(g));
      y = g.section('THE SIX · TAP A SLOT', y);
      const sw = Math.floor((W - 2) / 6);
      ring.forEach((k, i) => {
        const x = i * sw, on = i === st.slot;
        const sel = g.focusable(x, y, sw - 2, 22, () => { st.slot = i; A.beep('jog'); });
        mx.frame(x, y, sw - 2, 22, on ? C.hot : C.ink, on ? 1 : sel ? 0.9 : 0.3);
        g.kindPin(x + Math.floor((sw - 2) / 2), y + 8, k, C.amber, { r: 6, a: on ? 1 : 0.75 });
        g.mini(String(i + 1), x + 2, y + 15, { a: 0.6 });
      });
      y += 26;
      y = g.section('PUT IN SLOT ' + (st.slot + 1), y);
      y = kindGrid(g, y, k => k === ring[st.slot], k => {
        const r = ring.slice(), j = r.indexOf(k);
        if (j >= 0) r[j] = r[st.slot];   // already on the ring: the two swap
        r[st.slot] = k; S.saveV2({ ringKinds: r });
        A.say('SLOT ' + (st.slot + 1) + ' ▸ ' + k, 1800); A.beep('file');
        st.slot = (st.slot + 1) % 6;
      });
      g.scrollEnd(y);
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'TAP A SLOT · THEN A KIND');
    }
  };

  // ======================================================================
  // LEGEND
  // ======================================================================
  RX.screens.legend = {
    render(g, st, A) {
      const W = g.W, mx = g.mx;
      const hidden = new Set(S.v2.hiddenCats || []), hiddenK = new Set(S.v2.hiddenKinds || []);
      const toggle = (key, id, label) => {
        const h = new Set(S.v2[key] || []), off = h.has(id);
        off ? h.delete(id) : h.add(id);
        S.saveV2({ [key]: [...h] });
        A.say(label + (off ? ' SHOWN' : ' HIDDEN') + ' ON MAP', 2000); A.beep('key');
      };
      let y = g.header('LEGEND', 'TAP TO SHOW / HIDE');
      y = g.scrollBegin(y, footTop(g));
      // colours: hide every mark of a colour, whatever it is
      y = g.section('COLORS', y, hidden.size ? hidden.size + ' HIDDEN' : 'ALL SHOWN');
      const sw = Math.floor((W - 2) / U.CATS.length);
      U.CATS.forEach((c, i) => {
        const x = i * sw, off = hidden.has(c.id), n = S.pois.filter(p => p.category === c.id).length;
        const sel = g.focusable(x, y, sw - 2, 20, () => toggle('hiddenCats', c.id, 'COLOR ' + (i + 1)));
        mx.rect(x + 1, y + 1, sw - 4, 10, c.color, off ? 0.18 : 1);
        if (off) mx.line(x + 2, y + 10, x + sw - 5, y + 2, C.ink, 0.8);
        if (sel) mx.frame(x - 1, y - 1, sw, 14, C.hot, 1);
        g.mini(String(n), x + 2, y + 14, { a: off ? 0.35 : 0.65 });
      });
      y += 24;
      // kinds: hide every mark of a kind, whatever its colour
      const cnt = {}; S.pois.forEach(p => { if (!p.category) return; const k = U.kindOf(p); if (k) cnt[k] = (cnt[k] || 0) + 1; });
      y = g.section('KINDS', y, hiddenK.size ? hiddenK.size + ' HIDDEN' : U.KINDS.length + ' · MOST USED FIRST');
      const bw = Math.floor((W - 2) / 2);
      U.KINDS.slice().sort((a, b) => (cnt[b.id] || 0) - (cnt[a.id] || 0)).forEach((kd, i) => {
        const x = (i % 2) * bw, yy = y + Math.floor(i / 2) * 13, off = hiddenK.has(kd.id), n = cnt[kd.id] || 0;
        const sel = g.focusable(x, yy, bw - 2, 12, () => toggle('hiddenKinds', kd.id, kd.id));
        mx.frame(x, yy, bw - 2, 12, sel ? C.hot : C.ink, sel ? 1 : 0.2);
        g.kindPin(x + 7, yy + 6, kd.id, C.ink, { a: off ? 0.25 : n ? 0.95 : 0.4 });
        g.text(g.fit(kd.id, bw - 31), x + 14, yy + 3, { a: off ? 0.3 : n ? 0.95 : 0.45 });
        g.miniR(off ? 'OFF' : String(n), x + bw - 5, yy + 4, { a: off ? 0.6 : 0.6, c: off ? C.amber : C.ink });
      });
      y += Math.ceil(U.KINDS.length / 2) * 13 + 4;
      g.pin(8, y + 7, { category: null }, {});
      g.text('PENDING', 17, y + 1, { a: 0.9 });
      g.mini('NO COLOR YET · ALWAYS SHOWN · ' + S.pending().length, 17, y + 10, { a: 0.6 });
      y += 20;

      y = g.section('MAP KEY', y);
      const key = (draw, label) => { draw(10, y + 5); g.mini(label, 24, y + 3, { a: 0.8 }); y += 12; };
      key((x, yy) => { mx.ring(x, yy, 4, C.ink, 0.5); mx.disc(x, yy, 1.6, C.hot, 1); for (let r = 3; r <= 6; r++) mx.set(x, yy - r, C.hot, 1); }, 'YOU · TICK SHOWS HEADING');
      key((x, yy) => { mx.line(x - 7, yy + 2, x + 7, yy - 2, '#FF6B5E', 1); mx.line(x - 6, yy + 2, x + 8, yy - 2, '#FF6B5E', 0.6); }, 'A TRACK · REC ON THE AUX DECK');
      key((x, yy) => g.kindPin(x, yy, 'PARKING', C.amber, { r: 5 }), 'YOUR CAR · PARK ON THE AUX DECK');
      key((x, yy) => g.hex(x, yy, C.obj, 1), 'OBJECTIVE · RED = URGENT OR DUE');
      key((x, yy) => { mx.frame(x - 4, yy - 4, 9, 9, C.hot, 1); mx.set(x, yy, C.hot, 1); }, 'SEARCH TARGET');
      key((x, yy) => g.brackets(x, yy, 5, C.hot, 1), 'NEAR DRUM · THE MARK PICKED');
      key((x, yy) => { for (let i = -7; i <= 7; i += 2) mx.set(x + i, yy, C.water, 0.6); for (let i = -6; i <= 7; i += 2) mx.set(x + i, yy + 2, C.water, 0.6); }, 'WATER');
      key((x, yy) => { mx.hline(x - 8, yy, 17, C.ink, 1); mx.hline(x - 8, yy + 3, 17, C.ink, 0.4); }, 'MAJOR · MINOR ROADS');
      key((x, yy) => { for (let i = -8; i <= 8; i++) if ((i + 8) % 5 === 0) mx.set(x + i, yy, C.fog, 0.6); mx.hline(x - 8, yy + 3, 17, C.ink, 0.2); }, 'FOG · NOT EXPLORED YET');
      g.mini('MAP ' + M.credit(), 1, y + 2, { a: 0.45 });
      y += 10;
      g.scrollEnd(y + 4);
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'TAP ONE TO HIDE IT');
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
      let y = g.header(st.isNew ? 'CAL · NEW TO-DO' : 'CAL · EDIT TO-DO', st.isNew ? '' : (m.status === 'complete' ? 'DONE ' + F.date(m.completed || m.created) : 'ACTIVE'), { c: m.priority === 'urgent' ? C.red : C.ink });
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
      y = g.section('REPEAT', y, m.deadline ? '' : 'NEEDS A DUE DATE');
      g.seg(0, y, W - 2, 11, [['none', 'NONE'], ['day', 'DAY'], ['week', 'WEEK'], ['month', 'MONTH'], ['year', 'YEAR']].map(r => ({ label: r[1], on: (m.repeat || 'none') === r[0], fn: () => { m.repeat = r[0]; save(); } })), { face: 'mini' });
      y += 14;
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
        g.btn(0, y, W - 2, 15, '▸ SAVE TO-DO', () => {
          if (!m.title.trim()) { A.say('GIVE IT A TITLE FIRST', 2500); A.beep('err'); return; }
          S.missions.push(m); S.saveMissions(); S.log('mission-create', m.id, 'Created: ' + m.title);
          st.isNew = false; A.updateLamps(); A.back(); A.say('CREATED ▸ ' + m.title, 2500); A.beep('file');
        }, { solid: true });
        y += 18;
      } else {
        const bw = Math.floor((W - 2) / 2);
        g.btn(0, y, bw - 1, 14, m.status === 'complete' ? 'REOPEN' : '✓ DONE', () => RX.calComplete(A, m), { solid: true });
        g.btn(bw, y, W - 2 - bw, 14, '× DELETE', () => A.go('confirm', {
          title: 'DELETE TO-DO', danger: true, confirm: 'DELETE', lines: ['DELETE "' + m.title + '"?'],
          onConfirm: () => { st.deleted = true; S.missions = S.missions.filter(x => x.id !== m.id); S.saveMissions(); S.log('mission-delete', m.id, 'Deleted: ' + m.title); A.updateLamps(); A.back(); if (A.top().name === 'calitem') A.back(); A.say('TO-DO DELETED', 2500); }
        }), { c: C.red });
        y += 18;
        g.mini('CREATED ' + F.dateY(m.created) + ' ' + F.hm(m.created), 1, y, { a: 0.45 });
        y += 9;
      }
      g.scrollEnd(y);
      g.footer(A.sayActive() ? A.statusShown(g.t) : (st.isNew ? 'FILL IN, THEN SAVE' : 'CHANGES SAVE AS YOU GO'));
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
      // each group its own colour: white, bronze, dark green, yellow, blue
      const RACE = [['HISPANIC', 'hisp', '#B8742A'], ['WHITE', 'white', '#F2F4EC'], ['BLACK', 'black', '#2A8F4A'], ['ASIAN', 'asian', '#F2CF2E'], ['OTHER', null, '#4A86F0']];
      const share = (o, k) => { if (!o || o.hisp == null) return null; if (k) return o[k]; return Math.max(0, 100 - o.hisp - o.white - o.black - o.asian); };
      y = g.section('PEOPLE · RACE & ETHNICITY', y + 2, '% OF RESIDENTS');
      cols.forEach(c => {
        g.mini(c[0], 1, y + 2, { a: c[1] && c[1].hisp != null ? 0.7 : 0.35 });
        const bx = lw, bw = W - lw - 3;
        if (c[1] && c[1].hisp != null) { let x = bx; RACE.forEach((rc, ri) => { const v = share(c[1], rc[1]) || 0, w = ri === RACE.length - 1 ? bx + bw - x : Math.round(bw * v / 100); if (w > 0) { mx.rect(x, y + 1, Math.max(1, w - 1), 6, rc[2], 1); x += w; } }); }
        else mx.hline(bx, y + 4, bw, C.ink, 0.2, 2);
        y += 9;
      });
      y += 1;
      RACE.forEach((rc, ri) => {
        mx.rect(2, y + 2, 4, 4, rc[2], 1); g.mini(rc[0], 9, y + 2, { a: 0.7 });
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


  // ---------------------------------------------------------------- sound test
  // every slot, what it plays right now (your file, stock, inherited, the synth, or nothing), tap to hear it
  RX.screens.sound = {
    jogLabels: () => ['◂ UP', 'DOWN ▸', 'PUSH ▸ PLAY'],
    enter(st) { st.sel = 0; st.jog = true; },
    lcd() {
      const X = RX.sfx, mine = Object.values(X.found).filter(f => f.kind === 'YOURS').length;
      return { rows: [['SFX', X.ready ? mine + ' YOURS · ' + X.SLOTS.length + ' FOLDERS' : 'CHECKING ' + X.checked + '/' + X.SLOTS.length], ['ADD', 'SOUND.MP3 IN A FOLDER'], ['IN', 'V2/SFX · THEN PUSH']], tag: 'SFX' };
    },
    render(g, st, A) {
      const W = g.W, X = RX.sfx, mine = Object.values(X.found).filter(f => f.kind === 'YOURS').length;
      let y = g.header('SOUND TEST', X.ready ? mine + ' YOURS' : 'CHECKING ' + X.checked + '/' + X.SLOTS.length);
      y = g.scrollBegin(y, footTop(g));
      if (!S.v2.sound) { g.mini('KEY SOUNDS ARE OFF IN MENU · THESE STILL PLAY', 1, y + 1, { c: C.amber, a: 0.9 }); y += 10; }
      let grp = null;
      X.SLOTS.forEach(([slot, folder, parent, desc, group]) => {
        if (group !== grp) { grp = group; y = g.section(group, y + (y > 20 ? 2 : 0)); }
        const play = () => { try { RX.sfx.play(slot); } catch (e) {} st.last = slot; st.lastT = performance.now(); };
        const sel = g.row(0, y, W - 2, 18, play);
        const d = X.describe(slot), mine = /YOUR/.test(d), silent = d === 'SILENT';
        const flash = st.last === slot && performance.now() - st.lastT < 300;
        g.text(folder.toUpperCase(), 4, y + 2, { c: flash ? C.amber : sel ? C.hot : C.ink });
        // 'USES K7-thunk · YOURS' splits over the two lines so long folder names never collide
        const [d1, d2] = d.split(' · ');
        g.miniR(d1, W - 4, y + 3, { c: mine ? C.amber : C.ink, a: silent ? 0.35 : mine ? 1 : 0.7 });
        if (d2) g.miniR(d2, W - 4, y + 11, { c: C.amber, a: 1 });
        g.mini(g.fit(desc, W - 8 - (d2 ? 26 : 0), 'mini'), 4, y + 11, { a: 0.5 });
        y += 19;
      });
      y += 2;
      g.mini('YOURS: SOUND.MP3 (OR .WAV .M4A) IN ITS FOLDER', 1, y, { a: 0.55 });
      g.mini('IN V2/SFX. PUSH AND IT PLAYS. EMPTY = RELATED.', 1, y + 7, { a: 0.55 });
      y += 16;
      g.scrollEnd(y);
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'TAP A FOLDER TO HEAR IT');
    },
    animating: st => !!st.last && performance.now() - st.lastT < 350
  };

  // ---------- the LCD per mode: each screen says what its glance strip shows ----------
  const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
  RX.screens.fast.lcd = (st, A) => {
    if (st && st.page === 'train') return RX.fit.lcd(st, A);
    const f = S.activeFast(), fs = S.fastStreak();
    if (!f) return { rows: [['FAST', 'NONE RUNNING'], ['STRK', fs.current + ' · BEST ' + fs.best], ['LAST', fs.daysSinceLast != null ? fs.daysSinceLast.toFixed(1) + ' DAYS AGO' : '--']], tag: 'FST' };
    const el = Date.now() - f.startTs, L = lapOf(el);
    return { rows: [['TIME', F.dur(el) + (L.n > 1 ? ' ×' + L.n : '')], ['DAY', String(f.dayNum) + ' · STREAK ' + fs.current], ['FROM', F.hm(f.startTs)]], tag: 'FST' };
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
