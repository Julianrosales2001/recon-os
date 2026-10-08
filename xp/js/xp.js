/* =============================================================
   XP-1000 · R.OS for the laptop console
   Three layouts on the knob (DRIVE · RECON · DESK), one dot-matrix
   screen, the RP's own data, maps and lookups. Marks, objectives,
   fog and the log are the RP's shared store (same keys).
   ============================================================= */
(function () {
  'use strict';
  const S = RX.store, M = RX.map, Geo = RX.geo, U = RX.ui, CATS = U.CATS, Fm = U.F, $ = id => document.getElementById(id);
  const INK = '#7DFFD6', HOT = '#E9FFF7', AMB = '#FFB547', TEAL = '#3FCFA8', WH = '#F4F6F0', RED = '#FF6B5E', LCDINK = '#1B281F';
  const W = 675, H = 276, MODES = ['drive', 'recon', 'desk'];
  const measure = XP.measure, fit = XP.fit;

  // ---------- XP's own settings (everything else is the RP's shared store) ----------
  const PK = 'recon.xp.prefs';
  const read = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } };
  const P = Object.assign({ mode: 'recon', scale: 1, dscale: 1, preset: 0, scout: false, quiet: false, foldL: false, foldR: false, grid: true, labels: true, left: 'area', right: 'near', zooms: { drive: 15, recon: 15, desk: 12 }, allCounts: false }, read(PK, {}));
  let saveT = null;
  const saveP = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(PK, JSON.stringify(P)); } catch (e) {} }, 300); };

  const A = {
    gps: null, gpsErr: null, dirty: true, msg: null, focus: 'map', t: 0, dim: false,
    sel: { log: 0, obj: 0, ref: 0, traffic: 0 }, logFilter: 0, logDay: 0, objTab: 0, refTopic: 0, lotSec: 0, weekOff: 0, yr5: false, busiestMode: false,
    assign: null, markLitUntil: 0, endFastAt: 0,
    lot: { res: null, busy: false, err: null, key: '' },
    area: { a: null, c: null, busy: false, key: '', err: null },
    traf: { list: [], busy: false, key: '', busiest: null, bKey: '' },
    drive: { banner: null, place: null, road: null, roadKey: '', target: 0, feed: false, lastScout: null, scoutBusy: false },
    scout: read('recon.xp.scout', []),
    refs: null, explored: { key: '', v: null }
  };

  // ======================================================================
  // DISPLAYS
  // ======================================================================
  let screen, lcd, clock;
  function buildPanels() {
    screen = new XP.Panel($('screenHost'), { w: 1350, h: 552, pitch: 2, round: true, bloom: 3, ghost: 'ghost-green.svg' });
    const lh = $('lcdHost'), ch = $('clockHost');
    lcd = new XP.Panel(lh, { w: lh.offsetWidth, h: lh.offsetHeight, pitch: 1.7, round: false, shadow: true, ghost: 'ghost-lcd.svg' });
    clock = new XP.Panel(ch, { w: ch.offsetWidth, h: ch.offsetHeight, pitch: 1.6, round: true, bloom: 2.5, ghost: 'ghost-amber.svg' });
  }
  function fitStage() { const s = Math.min(innerWidth / 1440, innerHeight / 900); document.documentElement.style.setProperty('--s', s.toFixed(4)); }

  // ---------- sound: short square-wave ticks like the RP ----------
  let actx = null;
  function beep(kind) {
    if (P.quiet) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const T = { key: [1900, 0.018, 0.035], ok: [1320, 0.06, 0.06], mark: [880, 0.09, 0.08], err: [220, 0.16, 0.08], file: [1560, 0.08, 0.06] }[kind] || [1900, 0.018, 0.03];
      const o = actx.createOscillator(), g = actx.createGain(); o.type = 'square'; o.frequency.value = T[0];
      g.gain.setValueAtTime(T[2], actx.currentTime); g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + T[1]);
      o.connect(g); g.connect(actx.destination); o.start(); o.stop(actx.currentTime + T[1] + 0.02);
    } catch (e) {}
  }
  function say(rows, ms) { A.msg = { rows: Array.isArray(rows) ? rows : [rows], until: Date.now() + (ms || 2600) }; A.dirty = true; }

  // ======================================================================
  // GEOMETRY + SHARED DRAWING
  // ======================================================================
  const here = () => (P.mode === 'drive' && A.gps) ? { lat: A.gps.lat, lng: A.gps.lng } : { lat: M.lat, lng: M.lng };
  const mi = m => m / 1609.344;
  const fmtMi = m => { const x = mi(m); return x < 0.1 ? Math.round(m * 3.28084 / 10) * 10 + ' FT' : (x < 10 ? x.toFixed(1) : Math.round(x)) + ' MI'; };
  const card = d => Geo.cardinal(d);
  const kfmt = n => n == null ? '-' : n >= 1e8 ? Math.round(n / 1e6) + 'M' : n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 1 : 2) + 'M' : n >= 1e5 ? Math.round(n / 1e3) + 'K' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : Math.round(n).toLocaleString('en-US');
  const money = n => n == null || n < 0 ? '-' : n >= 1e6 ? '$' + (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? '$' + Math.round(n / 1000) + 'K' : '$' + Math.round(n);
  const pct = n => n == null ? '-' : (n < 10 && n % 1 ? n.toFixed(1) : Math.round(n)) + '%';
  const vs = (a, b) => a == null || b == null || !b ? '' : (a >= b ? '+' : '-') + Math.abs(Math.round((a - b) / b * 100)) + '%';

  function section(G, x, y, w, label) { const lw = G.text(label, x, y, { face: 'mini', a: 0.6 }); G.hline(x + lw + 3, y + 2, w - lw - 3, INK, 0.4, 2); }
  function tabs(G, x, y, w, names, on) {
    const n = names.length, tw = Math.floor((w - (n - 1) * 2) / n);
    names.forEach((t, i) => { const tx = x + i * (tw + 2), act = i === on;
      if (act) G.rect(tx + 1, y + 1, tw - 2, 10, INK, 0.16);
      G.frame(tx, y, tw, 12, INK, act ? 1 : 0.35); G.textC(t, tx + tw / 2, y + 3, { c: act ? HOT : INK, a: act ? 1 : 0.6 }); });
  }
  const subs = {};
  // draw the live map into a region; returns a projector lat/lng → screen dot
  function mapRegion(G, x0, y0, w, h, opt) {
    opt = opt || {};
    const key = w + 'x' + h, sub = subs[key] || (subs[key] = { buf: new Uint8ClampedArray(w * h * 4), cols: w, rows: h });
    sub.buf.fill(0);
    const v = { cols: w, rows: h, pitch: 2, cx: w / 2, cy: Math.round(h / 2) };
    const hi0 = S.v2.hicon; if (opt.hicon != null) S.v2.hicon = opt.hicon;
    try { M.drawBase(sub, v, { ink: INK, water: TEAL, fog: '#3D9C86' }); } finally { S.v2.hicon = hi0; }
    G.blit(sub.buf, w, h, x0, y0);
    const to = (lat, lng) => { const d = M.latLngToDot(lat, lng, v); return [x0 + d.x, y0 + d.y]; };
    return { v, to, x0, y0, w, h, cx: x0 + v.cx, cy: y0 + v.cy, inside: (q, m) => q[0] >= x0 - (m || 0) && q[1] >= y0 - (m || 0) && q[0] < x0 + w + (m || 0) && q[1] < y0 + h + (m || 0) };
  }
  function ringOn(G, R, ring, col, a, dash) { if (ring && ring.length > 2) G.poly(ring.map(q => R.to(q[0], q[1])), col, a, dash, true); }
  function pinOf(G, x, y, p, big) {
    const cat = U.catById(p.category);
    if (big) { G.carve(x, y, 6.2); if (!cat) { G.ring(x, y, 5, INK, 0.95, [1, 1]); G.icon('QUERY', x - 3, y - 3, { c: INK }); return; } G.disc(x, y, 5, cat.color, 1); G.icon(U.iconFor(p), x - 3, y - 3, { punch: true }); }
    else { G.carve(x, y, 3.4); G.disc(x, y, 2.2, cat ? cat.color : INK, cat ? 1 : 0.6); }
  }
  function overlays(G, R, o) {
    o = o || {};
    G.clip(R.x0, R.y0, R.w, R.h);
    const hidden = new Set(S.v2.hiddenCats || []), big = M.zoom >= 15 && !o.small;
    S.missions.forEach(m => { if (m.status !== 'active' || m.lat == null) return; const q = R.to(m.lat, m.lng); if (!R.inside(q, 6)) return;
      const x = Math.round(q[0]), y = Math.round(q[1]), hot = m.priority === 'urgent' || (m.deadline && m.deadline < Date.now()), pts = [[0, -4], [4, -2], [4, 2], [0, 4], [-4, 2], [-4, -2], [0, -4]];
      G.carve(x, y, 5); for (let i = 0; i < 6; i++) G.line(x + pts[i][0], y + pts[i][1], x + pts[i + 1][0], y + pts[i + 1][1], hot ? RED : AMB, 0.95); G.set(x, y, hot ? RED : AMB, 1); });
    const shown = [];
    S.pois.forEach(p => { if (p.category && hidden.has(p.category)) return; const q = R.to(p.lat, p.lng); if (R.inside(q, 8)) shown.push({ p, x: Math.round(q[0]), y: Math.round(q[1]) }); });
    shown.sort((a, b) => a.y - b.y).forEach(s => pinOf(G, s.x, s.y, s.p, big));
    if (o.labels && M.zoom >= 16) shown.forEach(s => { const t = fit(S.markLabel(s.p), 70, 'mini'); G.label(t, s.x + 7, s.y - 2, { face: 'mini', a: 0.9 }); });
    if (A.gps) {
      const q = R.to(A.gps.lat, A.gps.lng);
      if (R.inside(q, 4)) { const x = Math.round(q[0]), y = Math.round(q[1]), ph = (A.t % 2600) / 2600;
        if (!o.noPulse) G.ring(x, y, 3 + ph * 14, INK, 0.85 * (1 - ph));
        if (o.arrow) { G.carve(x, y, 9); G.tri(x, y, 8, ((A.gps.heading || 0) * Math.PI) / 180, HOT, 1); }
        else { G.carve(x, y, 2.6); G.disc(x, y, 1.6, Date.now() - A.gps.ts > 30000 ? AMB : HOT, 1); } }
    }
    G.unclip();
  }
  function reticle(G, cx, cy) {
    cx = Math.round(cx); cy = Math.round(cy); G.carve(cx, cy, 2);
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([a, b]) => { for (let r = 4; r <= 11; r++) G.set(cx + a * r, cy + b * r, HOT, r < 6 ? 0.6 : 1); });
    G.set(cx, cy, HOT, 1);
  }
  function scaleBar(G, x, y) {
    const mpd = Geo.metersPerPx ? Geo.metersPerPx(M.lat, M.zoom) * 2 : 156543.03 * Math.cos(M.lat * Math.PI / 180) / Math.pow(2, M.zoom) * 2;
    const opts = [[50, '50 FT'], [100, '100 FT'], [200, '200 FT'], [500, '500 FT'], [1000, '1000 FT'], [2640, '1/2 MI'], [5280, '1 MI'], [10560, '2 MI'], [26400, '5 MI'], [52800, '10 MI'], [105600, '20 MI'], [264000, '50 MI'], [528000, '100 MI']];
    let pick = opts[opts.length - 1]; for (const o of opts) { const len = o[0] * 0.3048 / mpd; if (len >= 24) { pick = o; break; } }
    const len = Math.max(4, Math.min(80, Math.round(pick[0] * 0.3048 / mpd)));
    G.clear(x - 2, y - 2, len + measure(pick[1], 'mini') + 10, 9); G.hline(x, y + 4, len, INK, 1); G.vline(x, y, 4, INK, 1); G.vline(x + len - 1, y, 4, INK, 1); G.text(pick[1], x + len + 4, y, { face: 'mini' });
  }

  // ======================================================================
  // DATA: what's under the crosshair
  // ======================================================================
  let lastMove = Date.now();
  const moved = () => { lastMove = Date.now(); A.dirty = true; };
  function lotFetch(lat, lng) {
    const k = lat.toFixed(5) + ',' + lng.toFixed(5);
    if (A.lot.busy || A.lot.key === k) return;
    A.lot.key = k; A.lot.busy = true; A.lot.err = null; A.dirty = true;
    RX.parcel.at(lat, lng).then(r => { A.lot.res = r; A.lot.err = r ? null : 'NONE'; if (r && P.mode === 'recon') beep('ok'); }).catch(() => { A.lot.err = 'NET'; }).then(() => { A.lot.busy = false; A.dirty = true; lcdRefresh(); });
  }
  function areaFetch(lat, lng) {
    const k = lat.toFixed(3) + ',' + lng.toFixed(3);
    if (A.area.busy || A.area.key === k) return;
    A.area.key = k; A.area.busy = true; A.area.err = null; A.dirty = true;
    Promise.all([
      RX.area.at(lat, lng).then(v => { A.area.a = v; }).catch(() => { A.area.err = 'NET'; }),
      RX.area.cityAt(lat, lng).then(v => { A.area.c = v; }).catch(() => { A.area.err = 'NET'; })
    ]).then(() => { A.area.busy = false; A.dirty = true; A.explored.key = ''; lcdRefresh(); });
  }
  function trafficFetch(lat, lng, radius) {
    const k = lat.toFixed(3) + ',' + lng.toFixed(3) + ',' + Math.round(radius / 200);
    if (A.traf.busy || A.traf.key === k) return;
    A.traf.key = k; A.traf.busy = true;
    RX.traffic.near(lat, lng, radius).then(l => { A.traf.list = l; }).catch(() => {}).then(() => { A.traf.busy = false; A.dirty = true; });
  }
  function busiestFetch() {
    const p = A.area.c && A.area.c.place; if (!p || !p.box) return;
    if (A.traf.bKey === p.geoid) return; A.traf.bKey = p.geoid; A.traf.busiest = null;
    RX.traffic.busiest(p.box, (la, ln) => RX.area.inRings(p.rings, la, ln), 6).then(l => { A.traf.busiest = l; A.dirty = true; }).catch(() => { A.traf.bKey = ''; });
  }
  function tickData() {
    if (Date.now() - lastMove < 450) return;
    const h = here();
    if (P.mode !== 'drive' || A.gps) areaFetch(h.lat, h.lng);
    if (P.mode === 'recon') {
      if (P.left === 'lot' && M.zoom >= 15) lotFetch(M.lat, M.lng);
      if ((P.left === 'traffic' || P.labels) && M.zoom >= 13) trafficFetch(M.lat, M.lng, Math.min(6000, Math.max(500, 380 * 2 * (Geo.metersPerPx ? Geo.metersPerPx(M.lat, M.zoom) : 4.8))));
    }
    if ((P.mode === 'desk' && P.dscale <= 1) || (P.mode === 'recon' && A.busiestMode)) busiestFetch();
    if (P.mode === 'drive' && A.gps) driveData();
  }

  // place figures for a scale: { title, sub, cols:[{lab, o}], crime:[{lab, r}] }
  function scaleData(sc) {
    const a = A.area.a, c = A.area.c; if (!c && !a) return null;
    const tract = a && a.tract ? Object.assign({}, a.tract, (c && c.tractMore) || {}) : null;
    const place = c && c.place && c.place.stats ? c.place : null, county = c && c.county, state = c && c.state, us = c && c.us;
    const st = (c && c.stateCode) || 'ST', pname = c && c.place ? String(c.place.name).toUpperCase() : null, cname = c && c.countyName ? c.countyName.replace(/ County$/i, '').toUpperCase() : (a && a.countyName ? a.countyName.toUpperCase() : '');
    const yr = c ? 'ACS ' + (c.prior ? (c.year - 4) + '-' + c.year : c.year) : 'ACS';
    const cr = c && c.crime, perK = row => row && row[1] ? { v: row[2] / row[1] * 1000, p: row[3] / row[1] * 1000, v20: row[4] ? row[5] / row[4] * 1000 : null, months: row[7], name: row[0] } : null;
    const PD = cr && cr.place ? (Array.isArray(cr.place) ? perK(cr.place) : cr.place) : null, SH = cr && cr.county ? perK(cr.county) : null;
    const STc = cr && cr.state ? cr.state : null, USc = cr && cr.us ? cr.us : null;
    const C = (lab, o) => ({ lab, o }), K = (lab, r) => ({ lab, r });
    if (sc === 0) return { title: tract ? String(tract.name || 'TRACT').split(/[,;]/)[0].toUpperCase().replace('CENSUS ', '') + (pname ? ' · ' + pname : '') : 'NO TRACT HERE', sub: cname + (cname ? ' CO · ' : '') + yr, cols: [C('TRACT', tract), C(c && c.inTX === false ? st : 'CITY', place || state), C(c && c.inTX ? 'CO' : 'US', c && c.inTX ? county : us)].filter(x => x.o), crime: [K('CITY PD', PD), K('SHRF', SH), K(st, STc)].filter(x => x.r) };
    if (sc === 1) return { title: pname ? pname + (c.place.cdp ? ' · COMMUNITY' : ' · CITY') : 'OUTSIDE CITY LIMITS', sub: (cname ? cname + ' CO · ' : '') + yr + (cr ? ' · FBI ' + cr.year : ''), cols: (c && c.inTX ? [C('CITY', place), C('CO', county), C(st, state), C('US', us)] : [C('CITY', place), C(st, state), C('US', us)]).filter(x => x.o), crime: (c && c.inTX ? [K('CITY PD', PD), K('SHRF', SH), K(st, STc), K('US', USc)] : [K('CITY PD', PD), K(st, STc), K('US', USc)]).filter(x => x.r) };
    if (sc === 2) return { title: cname ? cname + ' · COUNTY' : 'COUNTY', sub: (c && c.stateName ? c.stateName.toUpperCase() + ' · ' : '') + (c && c.inTX ? yr + (cr ? ' · FBI ' + cr.year : '') : 'TEXAS ONLY FOR NOW'), cols: [C('CO', county), C(st, state), C('US', us)].filter(x => x.o), crime: [K('SHRF', SH), K(st, STc), K('US', USc)].filter(x => x.r) };
    return { title: (c && c.stateName ? c.stateName.toUpperCase() : 'STATE') + ' · STATE', sub: yr + (cr ? ' · FBI ' + cr.year : ''), cols: [C(st, state), C('US', us)].filter(x => x.o), crime: [K(st, STc), K('US', USc)].filter(x => x.r) };
  }
  const ROWDEF = [
    ['PEOPLE', o => o.pop, kfmt, 0], ['GROWTH', o => o.growth != null ? o.growth * 100 : null, v => (v >= 0 ? '+' : '') + Math.round(v) + '%', 0], ['AGE', o => o.age, v => String(Math.round(v)), 0],
    ['INCOME', o => o.income, money, -1], ['HOME', o => o.home, money, 0], ['RENT', o => o.rent, v => '$' + Math.round(v), 0], ['OWNED', o => o.own, v => Math.round(v) + '%', 0],
    ['VACANT', o => o.units ? o.vacant / o.units * 100 : null, v => Math.round(v) + '%', 0], ['POVERTY', o => o.poverty, pct, 1], ['JOBLESS', o => o.unemp, v => v.toFixed(1) + '%', 1],
    ['COLLEGE', o => o.college, v => Math.round(v) + '%', -1], ['COMMUTE', o => o.commute, v => Math.round(v) + 'M', 0], ['BUILT', o => o.built, v => "'" + String(Math.round(v)).slice(2), 0], ['HH SIZE', o => o.hhsize, v => v.toFixed(2), 0]
  ];
  function figTable(G, x, rights, y, d, show, step) {
    d.cols.forEach((c, j) => G.textR(c.lab, rights[j], y, { face: 'mini', a: 0.6 }));
    let yy = y + 8;
    ROWDEF.forEach(rd => { if (show.indexOf(rd[0]) < 0) return; const vals = d.cols.map(c => { const v = c.o ? rd[1](c.o) : null; return v == null || Number.isNaN(v) ? null : v; });
      if (vals[0] == null) return;
      const bad = rd[3] && vals[1] != null && (rd[3] > 0 ? vals[0] > vals[1] * 1.15 : vals[0] < vals[1] * 0.85);
      G.text(rd[0], x, yy + 1, { face: 'mini', a: 0.6 });
      vals.forEach((v, j) => G.textR(v == null ? '-' : rd[2](v), rights[j], yy, { c: j === 0 ? (bad ? AMB : HOT) : INK }));
      yy += step; });
    return yy;
  }
  function crimeTable(G, x, rights, y, d, step) {
    if (!d.crime.length) { G.text('NO POLICE REPORTS FOR THIS SCALE', x, y, { face: 'mini', a: 0.5 }); return y + 8; }
    d.crime.forEach((c, j) => G.textR(c.lab, rights[j], y, { face: 'mini', a: 0.6 }));
    [['VIOLENT', r => r.v, v => v.toFixed(1)], ['PROPERTY', r => r.p, v => String(Math.round(v))], ['VS ' + ((A.area.c && A.area.c.crime && A.area.c.crime.prior) || 2020), r => r.v20 ? (r.v - r.v20) / r.v20 * 100 : null, v => (v >= 0 ? '+' : '-') + Math.abs(Math.round(v)) + '%']]
      .forEach((rw, n) => { const yy = y + 8 + n * step; G.text(rw[0], x, yy + 1, { face: 'mini', a: 0.6 });
        const vals = d.crime.map(c => rw[1](c.r));
        vals.forEach((v, j) => { const bad = n < 2 && j === 0 && vals[1] != null && v > vals[1] * 1.15; G.textR(v == null ? '-' : rw[2](v), rights[j], yy, { c: bad ? AMB : INK }); }); });
    return y + 8 + 3 * step;
  }
  const SEG = [[HOT, 1], [INK, 0.78], [INK, 0.5], [INK, 0.3], [INK, 0.13]];
  function raceBars(G, x, y, w, d, all) {
    let yy = y; (all ? d.cols : d.cols.slice(0, 1)).forEach(c => { const o = c.o; if (!o || o.hisp == null) return;
      G.text(c.lab, x, yy, { face: 'mini', a: 0.7 }); const bx = x + 26, bw = w - 26, parts = [o.hisp, o.white, o.black, o.asian]; parts.push(Math.max(0, 100 - parts.reduce((s, v) => s + (v || 0), 0)));
      let cx = bx; parts.forEach((f, k) => { const pw = k === 4 ? bx + bw - cx : Math.round((f || 0) / 100 * bw); if (pw > 1) G.rect(cx, yy + 1, pw - 1, 3, SEG[k][0], SEG[k][1]); cx += pw; }); yy += 7; });
    const o = d.cols[0] && d.cols[0].o; if (!o || o.hisp == null) { G.text('NO RACE FIGURES AT THIS SCALE', x, yy, { face: 'mini', a: 0.5 }); return yy + 8; }
    let cx = x; ['HISP', 'WHITE', 'BLACK', 'ASIAN'].forEach((n, k) => { const t = n + ' ' + Math.round([o.hisp, o.white, o.black, o.asian][k] || 0), tw = measure(t, 'mini') + 5; if (cx + tw > x + w) { cx = x; yy += 7; }
      G.rect(cx, yy + 1, 3, 3, SEG[k][0], SEG[k][1]); G.text(t, cx + 5, yy, { face: 'mini', c: k ? INK : HOT, a: k ? 0.6 : 0.9 }); cx += tw + 5; });
    return yy + 8;
  }

  // ======================================================================
  // STATUS + SOFT ROW (all layouts)
  // ======================================================================
  function status(G) {
    let x = 6; const it = (t, o) => { x += G.text(t, x, 3, o) + 9; };
    const h = here(), ll = (h.lat >= 0 ? 'N' : 'S') + Math.abs(h.lat).toFixed(4) + ' ' + (h.lng >= 0 ? 'E' : 'W') + Math.abs(h.lng).toFixed(4);
    it('R.OS XP ' + XP.VERSION, { c: HOT });
    if (P.mode === 'desk') { it('HOME · DESK'); it(weekLabel()); const due = backupDue(); if (due) it('BACKUP DUE · ' + due, { c: AMB }); }
    else {
      it(ll); it('Z' + Math.round(M.zoom));
      if (A.gps) { it('FIX ±' + Math.round(A.gps.acc * 3.28084) + ' FT', { a: Date.now() - A.gps.ts > 30000 ? 0.5 : 1 }); if (A.gps.speed) it(Math.round(A.gps.speed * 2.23694) + ' MPH'); if (A.gps.heading != null) it('HDG ' + String(Math.round(A.gps.heading)).padStart(3, '0') + '° ' + card(A.gps.heading)); }
      else it(A.gpsErr ? 'NO FIX · ' + A.gpsErr : 'NO FIX YET', { c: AMB });
      if (P.mode === 'drive') it(P.scout ? '○ SCOUT ON' : '○ SCOUT OFF', { a: P.scout ? 1 : 0.5 });
      else if (!M.follow || !A.gps) it('FREE LOOK', { c: AMB, a: 0.9 });
    }
    const now = new Date(), time = Fm.pad2(now.getHours()) + ':' + Fm.pad2(now.getMinutes());
    let xr = 668 - G.textR(time, 668, 3, { c: AMB }) - 9;
    [['DESK', 'desk', HOT], ['RECON', 'recon', INK], ['DRIVE', 'drive', AMB]].forEach(m => { const w = measure(m[0]);
      if (m[1] === P.mode) { G.rect(xr - w - 1, 1, w + 4, 11, m[2], 1); G.text(m[0], xr - w + 1, 3, { punch: true }); } else G.text(m[0], xr - w + 1, 3, { a: 0.5 }); xr -= w + 11; });
    G.hline(0, 13, W, INK, 0.28);
  }
  function softRow(G, set) {
    const y = 263, cw = W / 8; G.hline(0, y, W, INK, 0.45);
    set.labels.forEach((t, i) => { const x0 = Math.round(i * cw), x1 = Math.round((i + 1) * cw);
      if (i) G.vline(x0, y + 1, 12, INK, 0.25);
      const on = set.lit.indexOf(i) >= 0, fl = A.flash && A.flash.i === i && Date.now() < A.flash.until;
      if (fl) G.rect(x0 + 1, y + 1, x1 - x0 - 1, 12, INK, 0.85); else if (on) G.rect(x0 + 1, y + 1, x1 - x0 - 1, 12, INK, 0.16);
      const lab = fit(t + (on ? ' •' : ''), x1 - x0 - 4);
      G.textC(lab, (x0 + x1) / 2, y + 3, fl ? { punch: true } : { c: on ? HOT : t === '—' ? INK : (set.amber.indexOf(i) >= 0 ? AMB : INK), a: t === '—' ? 0.3 : 1 }); });
  }

  // ======================================================================
  // RECON (parked)
  // ======================================================================
  function drawRecon(G) {
    const L = P.foldL ? 0 : 163, Rr = P.foldR ? W : 543, mw = Rr - L, mh = 223;
    // map
    const R = mapRegion(G, L, 14, mw, mh);
    G.clip(L, 14, mw, mh);
    if (P.grid && M.zoom >= 13) for (let gx = L + 40; gx < Rr; gx += 40) G.vline(gx, 14, mh, INK, 0.14, 3);
    if (P.grid && M.zoom >= 13) for (let gy = 54; gy < 14 + mh; gy += 40) G.hline(L, gy, mw, INK, 0.14, 3);
    const c = A.area.c, a = A.area.a;
    if (P.left === 'area') { if (P.scale === 1 && c && c.place && c.place.rings) c.place.rings.forEach(r => ringOn(G, R, r, HOT, 0.85, [4, 3])); if (P.scale === 0 && a && a.tract) ringOn(G, R, a.tract.ring, AMB, 0.95, [2, 2]); }
    else if (c && c.place && c.place.rings && M.zoom <= 14) c.place.rings.forEach(r => ringOn(G, R, r, HOT, 0.5, [4, 3]));
    // traffic counts
    if ((P.left === 'traffic' || P.labels) && M.zoom >= 13) {
      const list = (P.left === 'traffic' && A.busiestMode ? (A.traf.busiest || []) : A.traf.list).filter(s => P.allCounts || !s.sub), seen = [];
      const pick = P.left === 'traffic' ? list[A.sel.traffic % Math.max(1, list.length)] : null;
      list.slice().sort((p, q) => q.aadt - p.aadt).forEach(s => { const q = R.to(s.lat, s.lng); if (!R.inside(q)) return; const x = Math.round(q[0]), y = Math.round(q[1]), col = s === pick ? HOT : s.sub ? INK : AMB;
        G.fillPoly([[x, y - 3], [x + 3, y], [x, y + 3], [x - 3, y]], col, 1);
        if ((P.labels || s === pick) && !seen.some(z => Math.abs(z[0] - x) < 60 && Math.abs(z[1] - y) < 10)) { seen.push([x, y]); const t = s.road + ' · ' + RX.traffic.k(s.aadt); const w = measure(t, 'mini') + 6;
          G.box(x + 5, y - 4, w, 9, col, 1); G.text(t, x + 8, y - 2, { face: 'mini', c: col }); } });
    }
    G.unclip();
    overlays(G, R, { labels: P.labels });
    reticle(G, R.cx, R.cy);
    if (P.left === 'lot' && A.lot.res && A.lot.res.ring) { const pts = A.lot.res.ring.map(q => R.to(q[0], q[1])); G.clip(L, 14, mw, mh); G.fillPoly(pts, HOT, 0.14); G.poly(pts, HOT, 1, null, true); G.unclip(); }
    G.label('MAP · RECON · ' + { lot: 'LOT', area: ['TRACT', 'CITY', 'COUNTY', 'STATE'][P.scale], traffic: 'TRAFFIC' }[P.left], L + 5, 17, { face: 'mini', a: 0.9 });
    const ms = M.statusLine(); G.label(ms || (S.v2.hicon ? 'HI-CON ON · WHITE = BEEN' : 'FOG ' + Math.round(fogPct() * 100) + '% CLEARED HERE'), L + 5, 24, { face: 'mini', c: ms ? AMB : INK, a: 0.65 });
    G.labelR('N ▲', Rr - 5, 17, { c: HOT });
    scaleBar(G, L + 5, 228);
    G.labelR(P.foldL || P.foldR ? 'FOLDED · A-K ▸ SOFT KEYS' : 'DRAG ▸ PAN · SCROLL ▸ ZOOM', Rr - 5, 228, { face: 'mini', a: 0.6 });
    if (!P.foldL) subjectDock(G);
    if (!P.foldR) situationDock(G);
    today(G);
  }
  function fogPct() {
    const v = { cols: 40, rows: 24 }, D = S.FOG_CELL_DEG; if (!S.fog.size) return 0;
    let n = 0, t = 0; const la0 = M.lat, ln0 = M.lng, span = 0.01;
    for (let j = 0; j < v.rows; j++) for (let i = 0; i < v.cols; i++) { const la = la0 + (j / v.rows - 0.5) * span, ln = ln0 + (i / v.cols - 0.5) * span * 1.6; t++; if (S.isRevealed(Math.floor(la / D), Math.floor(ln / D))) n++; }
    return n / t;
  }
  function subjectDock(G) {
    G.vline(162, 14, 223, INK, 0.28);
    G.text('S1 · SUBJECT', 5, 17, { face: 'mini', a: 0.6 }); G.textR(A.focus === 'map' ? 'U ▸ PAGE' : 'SOFT KEYS ▸ HERE', 158, 17, { face: 'mini', a: A.focus === 'map' ? 0.6 : 1, c: A.focus === 'map' ? INK : AMB });
    tabs(G, 4, 25, 155, ['LOT', 'TRAFFIC', 'AREA'], ['lot', 'traffic', 'area'].indexOf(P.left));
    if (P.left === 'area') areaDock(G); else if (P.left === 'lot') lotDock(G); else trafficDock(G);
  }
  function areaDock(G) {
    const d = scaleData(P.scale);
    if (!d) { G.text(A.area.busy ? 'READING CENSUS...' : A.area.err ? 'NO SIGNAL · AREA NEEDS A CONNECTION' : 'HOLD STILL TO READ', 5, 44, { face: 'mini', a: 0.7 }); return; }
    G.text(fit(d.title, 153), 5, 42, { c: HOT }); G.text(fit(d.sub, 153, 'mini'), 5, 52, { face: 'mini', a: 0.55 });
    const R3 = [88, 123, 158], rights = R3.slice(3 - Math.min(3, d.cols.length));
    d.cols = d.cols.slice(0, 3);
    let y = figTable(G, 5, rights, 61, d, P.scale === 0 ? ['PEOPLE', 'INCOME', 'HOME', 'RENT', 'POVERTY', 'JOBLESS', 'COLLEGE', 'BUILT', 'HH SIZE'] : ['PEOPLE', 'GROWTH', 'INCOME', 'HOME', 'RENT', 'POVERTY', 'JOBLESS', 'COLLEGE', 'BUILT'], 10);
    section(G, 5, y + 3, 153, 'RACE & ETHNICITY'); y = raceBars(G, 5, y + 11, 153, d, false);
    section(G, 5, y + 3, 153, 'SAFETY · PER 1,000'); d.crime = d.crime.slice(0, 3); crimeTable(G, 5, R3.slice(3 - Math.max(1, d.crime.length)), y + 11, d, 10);
  }
  function lotDock(G) {
    const r = A.lot.res;
    if (M.zoom < 15) { G.text('ZOOM IN TO READ LOTS', 5, 44, { c: AMB }); G.text('+ ZOOM ▸ Z15 OR CLOSER', 5, 54, { face: 'mini', a: 0.6 }); return; }
    if (!r) { G.text(A.lot.busy ? 'READING LOT...' : A.lot.err === 'NET' ? 'NO SIGNAL · LOTS NEED A CONNECTION' : A.lot.err ? 'NO LOT ON RECORD HERE' : 'HOLD STILL TO READ', 5, 44, { face: 'mini', a: 0.7 }); return; }
    const kv = (k, v, y, o) => { G.text(k, 5, y + 1, { face: 'mini', a: 0.6 }); G.text(fit(v == null ? '-' : v, 118), 40, y, o || {}); };
    G.text(fit(r.situs || 'NO SITE ADDRESS', 153), 5, 42, { c: HOT }); G.text(fit((r.county || '') + ' CO · ' + (r.taxYear ? 'TAX YEAR ' + r.taxYear : '') + (A.lot.busy ? ' · READING' : ''), 153, 'mini'), 5, 52, { face: 'mini', a: 0.55 });
    kv('SIZE', RX.parcel.fmtAcres(r.acres), 61); kv('VALUE', r.mkt ? money(r.mkt) : 'NOT PUBLISHED', 71, { c: r.mkt ? HOT : AMB }); kv('BUILT', r.built || '-', 81);
    const secs = ['OWNER', 'LAND', 'VALUE', 'ROADS'], s = secs[A.lotSec];
    section(G, 5, 95, 153, s);
    let y = 104; const line = (k, v) => { kv(k, v, y); y += 10; };
    const lines2 = (k, v) => U.wrap(v || '-', 19).slice(0, 3).forEach((t, i) => line(i ? '' : k, t));
    if (s === 'OWNER') { lines2('NAME', r.owner); if (r.care) line('C/O', r.care); lines2('MAIL', r.mail); }
    else if (s === 'LAND') { line('AREA', RX.parcel.fmtAcres(r.acres)); line('DEED', r.legalArea ? r.legalArea + ' ' + (r.legalUnit || '') : '-'); line('USE', r.use); lines2('LEGAL', r.legal); }
    else if (s === 'VALUE') { line('MARKET', r.mkt ? RX.parcel.fmtMoney(r.mkt) : '-'); line('LAND', r.land ? RX.parcel.fmtMoney(r.land) : '-'); line('BLDGS', r.imp ? RX.parcel.fmtMoney(r.imp) : '-'); line('ACCT', r.id); line('SOURCE', r.source); }
    else { const t = RX.traffic.main(A.traf.list); if (t) { line('ROAD', t.road); line('/DAY', RX.traffic.full(t.aadt) + " '" + String(t.year).slice(2)); line('5 YR', t.trend5 != null ? RX.traffic.pct(t.trend5) : '-'); line('AWAY', fmtMi(t.dist)); } else line('ROAD', A.traf.busy ? 'READING...' : 'NO COUNT NEARBY'); }
    G.text('H TAX · J MARK · K RECORD', 5, 222, { face: 'mini', a: 0.5 });
  }
  function trafficDock(G) {
    const list = (A.busiestMode ? (A.traf.busiest || []) : A.traf.list).filter(s => P.allCounts || !s.sub);
    G.text(A.busiestMode ? 'BUSIEST IN ' + fit(A.area.c && A.area.c.place ? String(A.area.c.place.name).toUpperCase() : 'CITY', 90) : 'COUNTS NEAR CROSSHAIR', 5, 42, { c: HOT });
    G.text("TXDOT AADT · CARS PER DAY", 5, 52, { face: 'mini', a: 0.55 });
    if (M.zoom < 13 && !A.busiestMode) { G.text('ZOOM IN TO SEE COUNTS', 5, 64, { c: AMB }); return; }
    if (!list.length) { G.text(A.traf.busy ? 'READING TXDOT...' : 'NO COUNT STATIONS HERE', 5, 64, { face: 'mini', a: 0.7 }); return; }
    const sel = A.sel.traffic % list.length, s = list[sel];
    list.slice(0, 9).forEach((t, i) => { const y = 62 + i * 10, on = i === sel; if (on) G.rect(4, y - 1, 155, 9, INK, 0.16);
      G.text(fit(t.road, 78), 6, y, { c: on ? HOT : INK }); G.textR(RX.traffic.full(t.aadt), 128, y, { c: on ? HOT : INK }); G.textR(t.trend5 != null ? RX.traffic.pct(t.trend5) : '', 156, y, { face: 'mini', a: 0.7 }); });
    if (A.yr5 && s.series) { section(G, 5, 156, 153, s.road + ' · ' + s.series.length + ' YEARS'); const ser = s.series.slice(0, 19).reverse(), mx = Math.max(...ser.map(o => o.v)), bw = Math.floor(150 / ser.length);
      ser.forEach((o, i) => { const h = Math.max(1, Math.round(o.v / mx * 40)); G.rect(6 + i * bw, 210 - h, Math.max(1, bw - 1), h, i === ser.length - 1 ? HOT : INK, i === ser.length - 1 ? 1 : 0.6); }); G.text(String(ser[0].year), 6, 213, { face: 'mini', a: 0.5 }); G.textR(String(ser[ser.length - 1].year), 156, 213, { face: 'mini', a: 0.5 }); }
    else { section(G, 5, 156, 153, 'SELECTED'); G.text(s.road, 5, 166, { c: HOT }); G.text(RX.traffic.full(s.aadt) + ' / DAY · ' + s.year, 5, 176); G.text((s.trend5 != null ? RX.traffic.pct(s.trend5) + ' IN 5 YRS · ' : '') + fmtMi(s.dist) + ' AWAY', 5, 186, { face: 'mini', a: 0.7 }); }
  }
  function nearList(from, n) { return S.pois.filter(p => p.category).map(p => ({ p, m: Geo.meters(from.lat, from.lng, p.lat, p.lng), b: Geo.bearing(from.lat, from.lng, p.lat, p.lng) })).sort((a, b) => a.m - b.m).slice(0, n); }
  function situationDock(G) {
    G.vline(543, 14, 223, INK, 0.28);
    G.text('S2 · SITUATION', 548, 17, { face: 'mini', a: 0.6 }); G.textR(A.gps && M.follow ? 'FROM YOU' : 'FROM CROSSHAIR', 670, 17, { face: 'mini', a: 0.6 });
    const tabsN = ['near', 'obj', 'log', 'ref']; tabs(G, 547, 25, 124, ['NEAR', 'OBJ', 'LOG', 'REF'], tabsN.indexOf(P.right));
    if (P.right === 'near') nearDock(G); else if (P.right === 'obj') objDock(G, 548, 43, 122, 15); else if (P.right === 'log') logDock(G, 548, 43, 122, 15); else refDock(G);
    G.hline(544, 226, 131, INK, 0.2); G.text(P.right === 'near' ? 'W LOG · T OBJ · Y REF' : 'ARROWS ▸ PICK · ENTER ▸ MAP', 548, 229, { face: 'mini', a: 0.55 });
  }
  function nearDock(G) {
    const from = A.gps && M.follow ? A.gps : { lat: M.lat, lng: M.lng }, L = nearList(from, 7);
    if (!L.length) { G.text('NO FILED MARKS YET', 548, 44, { face: 'mini', a: 0.7 }); G.text('SPACE DROPS ONE HERE', 548, 52, { face: 'mini', a: 0.5 }); }
    L.forEach((r, i) => { const y = 43 + i * 12, cat = U.catById(r.p.category); G.rect(548, y + 1, 4, 4, cat ? cat.color : INK, 1); G.text(fit(S.markLabel(r.p), 58), 556, y); G.textR(fmtMi(r.m), 653, y, { c: HOT }); G.textR(card(r.b), 670, y + 1, { face: 'mini', a: 0.6 }); });
    const act = S.missions.filter(m => m.status === 'active');
    section(G, 548, 132, 122, 'OBJECTIVES · ' + act.length + ' ACTIVE');
    act.slice(0, 2).forEach((m, i) => { const y = 140 + i * 11, hot = m.priority === 'urgent' || (m.deadline && m.deadline < Date.now()); G.fillPoly([[550, y], [553, y + 3], [550, y + 6], [547, y + 3]], hot ? RED : AMB, 1); G.text(fit(m.title, 80), 556, y); if (m.deadline) G.textR(Fm.date(m.deadline), 670, y + 1, { face: 'mini', a: 0.6 }); });
    section(G, 548, 166, 122, 'TODAY');
    const t0 = new Date(); t0.setHours(0, 0, 0, 0); const todays = S.journal.filter(j => j.ts >= t0.getTime());
    [[todays.filter(j => j.type === 'drop').length, 'MARKS', INK], [todays.filter(j => j.type === 'visit').length, 'VISITS', INK], [S.pending().length, 'PENDING', AMB]]
      .forEach((b, i) => { const x = 548 + i * 41; G.frame(x, 174, 39, 27, b[2], b[2] === AMB ? 0.6 : 0.35); G.textC(String(b[0]), x + 19.5, 178, { s: 2, c: b[2] === AMB ? AMB : HOT }); G.textC(b[1], x + 19.5, 194, { face: 'mini', a: 0.6 }); });
  }
  const OBJ_TABS = ['ACTIVE', 'DONE', 'DUE'];
  function objList() {
    const now = Date.now(); let L = A.objTab === 1 ? S.missions.filter(m => m.status === 'complete') : S.missions.filter(m => m.status === 'active');
    if (A.objTab === 2) L = L.filter(m => m.deadline).sort((a, b) => a.deadline - b.deadline); else L = L.slice().sort((a, b) => (b.completed || b.created || 0) - (a.completed || a.created || 0));
    return L;
  }
  function objDock(G, x, y, w, n) {
    const L = objList(); G.text(OBJ_TABS[A.objTab] + ' · ' + L.length, x, y, { c: HOT });
    if (!L.length) { G.text(A.objTab === 1 ? 'NOTHING DONE YET' : 'NONE · J ▸ NEW AT CROSSHAIR', x, y + 12, { face: 'mini', a: 0.6 }); return; }
    const sel = Math.min(A.sel.obj, L.length - 1), top = Math.max(0, sel - n + 3);
    L.slice(top, top + n - 2).forEach((m, i) => { const yy = y + 11 + i * 10, on = top + i === sel, hot = m.priority === 'urgent' || (m.deadline && m.deadline < Date.now());
      if (on && A.focus === 'obj') G.rect(x - 1, yy - 1, w + 1, 9, INK, 0.16);
      G.fillPoly([[x + 2, yy], [x + 5, yy + 3], [x + 2, yy + 6], [x - 1, yy + 3]], m.status === 'complete' ? INK : hot ? RED : AMB, m.status === 'complete' ? 0.5 : 1);
      G.text(fit(m.title, w - (m.deadline ? 40 : 12)), x + 8, yy, { c: on ? HOT : INK }); if (m.deadline) G.textR(Fm.date(m.deadline), x + w, yy + 1, { face: 'mini', a: 0.6 }); });
  }
  const LOG_F = ['ALL', 'MARKS', 'VISITS', 'OTHER'];
  function logList() {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0); const day0 = t0.getTime() - A.logDay * 86400000;
    return S.journal.filter(j => (A.logDay === 0 || (j.ts >= day0 && j.ts < day0 + 86400000)) && (A.logFilter === 0 || (A.logFilter === 1 ? j.type === 'drop' || j.type === 'classify' : A.logFilter === 2 ? j.type === 'visit' : ['drop', 'classify', 'visit'].indexOf(j.type) < 0))).slice().reverse();
  }
  function logDock(G, x, y, w, n) {
    const L = logList(); G.text(LOG_F[A.logFilter] + (A.logDay ? ' · ' + Fm.day(Date.now() - A.logDay * 86400000) : ' · ALL DAYS'), x, y, { c: HOT });
    if (!L.length) { G.text('NOTHING LOGGED', x, y + 12, { face: 'mini', a: 0.6 }); return; }
    const sel = Math.min(A.sel.log, L.length - 1), top = Math.max(0, sel - n + 3);
    L.slice(top, top + n - 2).forEach((j, i) => { const yy = y + 11 + i * 10, on = top + i === sel; if (on && A.focus === 'log') G.rect(x - 1, yy - 1, w + 1, 9, INK, 0.16);
      G.text(Fm.hm(j.ts), x, yy + 1, { face: 'mini', a: 0.55 }); const p = j.poiId && S.poi(j.poiId), cat = p && U.catById(p.category);
      let tx = x + 22; if (cat) { G.rect(tx, yy + 1, 4, 4, cat.color, 1); tx += 7; }
      G.text(fit(j.summary || j.type, x + w - tx), tx, yy, { c: on ? HOT : INK }); });
  }
  function refsLoad() {
    if (A.refs) return; A.refs = [];
    ['firstaid', 'knots'].forEach((n, i) => fetch('ref/' + n + '.json?v=1').then(r => r.json()).then(d => { A.refs[i] = d; A.dirty = true; }).catch(() => {}));
  }
  function refDock(G) {
    refsLoad(); const d = A.refs[A.refTopic];
    if (!d) { G.text('READING ROM...', 548, 44, { face: 'mini', a: 0.6 }); return; }
    const items = d.items || [], sel = Math.min(A.sel.ref, items.length - 1), it = items[sel];
    G.text(fit(d.title + ' · ' + (sel + 1) + '/' + items.length, 122), 548, 43, { c: HOT });
    if (!it) return;
    G.text(fit(it.title, 122), 548, 54, { c: A.focus === 'ref' ? AMB : INK });
    const lines = []; (it.call || []).forEach(s => lines.push(['! ' + s, AMB])); (it.steps || it.how || []).forEach((s, i) => lines.push([(i + 1) + '. ' + s, INK])); if (it.use) lines.unshift([it.use, INK]); if (it.tag) lines.unshift([it.tag, INK]);
    let y = 64; lines.forEach(l => { U.wrap(l[0], 30).forEach(w => { if (y > 218) return; G.text(w, 548, y, { face: 'mini', c: l[1], a: l[1] === AMB ? 1 : 0.85 }); y += 7; }); y += 2; });
  }
  function today(G) {
    G.hline(0, 237, W, INK, 0.28);
    G.text('T · TODAY', 6, 242, { face: 'mini', a: 0.7 }); G.text('06 ▸ 22', 6, 250, { face: 'mini', a: 0.45 });
    const x0 = 50, tw = 616, h0 = 6, h1 = 22, t0 = new Date(); t0.setHours(0, 0, 0, 0); G.hline(x0, 251, tw, INK, 0.45);
    for (let hh = h0; hh <= h1; hh += 2) G.textC(Fm.pad2(hh), x0 + (hh - h0) / (h1 - h0) * tw, 254, { face: 'mini', a: 0.5 });
    const seen = [];
    S.journal.filter(j => j.ts >= t0.getTime()).forEach(j => { const hr = (j.ts - t0.getTime()) / 3600000; if (hr < h0 || hr > h1) return; const x = Math.round(x0 + (hr - h0) / (h1 - h0) * tw);
      const p = j.poiId && S.poi(j.poiId), cat = p && U.catById(p.category); G.vline(x, 246, 5, cat ? cat.color : HOT, 1);
      if (!seen.some(s => Math.abs(s - x) < 70)) { seen.push(x); G.text(fit(j.summary || j.type, 64, 'mini'), x + 3, 242, { face: 'mini', a: 0.85 }); } });
    const nh = (Date.now() - t0.getTime()) / 3600000; if (nh >= h0 && nh <= h1) { const nx = Math.round(x0 + (nh - h0) / (h1 - h0) * tw); G.vline(nx, 238, 24, AMB, 1); G.label('NOW ' + Fm.hm(Date.now()), nx + 3, 256, { face: 'mini', c: AMB }); }
  }

  // ======================================================================
  // DESK (home)
  // ======================================================================
  const sqm = v => v < 100 ? v.toFixed(1) : String(Math.round(v));
  const weekStart = off => { const d = new Date(); d.setHours(0, 0, 0, 0); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow + off * 7); return d.getTime(); };
  function weekLabel() { const s = weekStart(A.weekOff), e = s + 6 * 86400000; const wk = isoWeek(new Date(s)); return 'WK ' + wk + ' · ' + Fm.date(s) + '-' + Fm.date(e); }
  function isoWeek(d) { const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); return Math.ceil(((t - y0) / 86400000 + 1) / 7); }
  function backupDue() { const lb = S.v2.lastBackup; if (!lb) return 'NEVER BACKED UP'; const d = (Date.now() - lb) / 86400000; return d >= 7 ? 'LAST ' + Math.floor(d) + ' DAYS AGO' : null; }
  function exploredStats() {
    const c = A.area.c, p = c && c.place, key = (p ? p.geoid : '-') + '|' + S.fog.size;
    if (A.explored.key === key) return A.explored.v;
    const D = S.FOG_CELL_DEG, cell = 22500 / 2589988, b = p && p.box;   // the same 150 m square the RP counts
    let inCity = 0; if (p && p.rings && b) for (const k of S.fog) { const ix = S.unpackIdx(k), la = (ix[0] + 0.5) * D, ln = (ix[1] + 0.5) * D; if (la < b[0] || la > b[2] || ln < b[1] || ln > b[3]) continue; if (RX.area.inRings(p.rings, la, ln)) inCity++; }
    const v = { sqmi: S.fog.size * cell, cityPct: p && p.sqmi ? Math.min(100, inCity * cell / p.sqmi * 100) : null, cityName: p ? String(p.name).toUpperCase() : null, cells: S.fog.size };
    A.explored = { key, v }; return v;
  }
  function drawDesk(G) {
    const MW = 220;
    const R = mapRegion(G, 0, 14, MW, 217, { hicon: true });
    const c = A.area.c; if (c && c.place && c.place.rings && P.dscale === 1) c.place.rings.forEach(r => ringOn(G, R, r, WH, 0.8, [4, 3]));
    if (P.dscale === 0 && A.area.a && A.area.a.tract) ringOn(G, R, A.area.a.tract.ring, AMB, 0.9, [2, 2]);
    overlays(G, R, { small: true, noPulse: true }); reticle(G, R.cx, R.cy);
    const ex = exploredStats();
    { const t1 = 'MAP · DESK · HI-CON', t2 = 'EXPLORED ' + sqm(ex.sqmi) + ' SQ MI' + (ex.cityPct != null ? ' · ' + Math.round(ex.cityPct) + '% OF CITY' : ''), w = Math.max(measure(t1, 'mini'), measure(t2, 'mini')) + 6; G.box(3, 16, w, 17, WH, 1); G.text(t1, 6, 19, { face: 'mini', c: WH }); G.text(t2, 6, 26, { face: 'mini', c: WH }); }
    G.labelR('N ▲', 216, 36, { c: WH });
    { const t = 'WHITE = BEEN · GREY = NOT YET'; G.labelR(t, 216, 223, { face: 'mini', c: WH, a: 0.85 }); }
    // dossier
    G.vline(220, 14, 217, INK, 0.28);
    G.text('S1 · DOSSIER', 225, 17, { face: 'mini', a: 0.6 }); G.textR('AT CROSSHAIR · ' + ['TRACT', 'CITY', 'COUNTY', 'STATE'][P.dscale] + ' SCALE', 525, 17, { face: 'mini', a: 0.6 });
    const d = scaleData(P.dscale);
    if (!d) G.text(A.area.busy ? 'READING CENSUS...' : A.area.err ? 'NO SIGNAL · AREA NEEDS A CONNECTION' : 'MOVE THE MAP TO A PLACE', 225, 30, { face: 'mini', a: 0.7 });
    else {
      const tw = G.text(fit(d.title, 170), 225, 27, { c: HOT }); G.textR(fit(d.sub, 300 - Math.min(170, tw) - 10, 'mini'), 525, 29, { face: 'mini', a: 0.55 });
      d.cols = d.cols.slice(0, 4); const R4 = [295, 330, 365, 400], rights = R4.slice(4 - d.cols.length);
      let y = figTable(G, 225, rights, 40, d, ROWDEF.map(r => r[0]), 9);
      if (P.dscale === 0) { G.text('TRACT FIGURES: ACS ' + ((A.area.c && A.area.c.year) || ''), 225, y + 1, { face: 'mini', a: 0.5 }); y += 9; }
      section(G, 225, y + 3, 175, 'SAFETY · PER 1,000'); d.crime = d.crime.slice(0, 4); crimeTable(G, 225, R4.slice(4 - Math.max(1, d.crime.length)), y + 11, d, 9);
      const rx = 410, rw = 115; section(G, rx, 40, rw, 'RACE & ETHNICITY'); let ly = raceBars(G, rx, 48, rw, d, true);
      if (P.dscale <= 1 && c && c.place) { section(G, rx, ly + 4, rw, 'BUSIEST ROADS · CARS/DAY'); const b = A.traf.busiest; ly += 12;
        if (!b) G.text('READING TXDOT...', rx, ly, { face: 'mini', a: 0.6 }); else b.slice(0, 4).forEach((s, i) => { G.text(fit(s.road, 46), rx, ly); const bw = Math.max(1, Math.round(s.aadt / b[0].aadt * 22)); G.rect(rx + 49, ly + 2, bw, 3, AMB, i ? 0.7 : 1); G.textR(RX.traffic.full(s.aadt), 525, ly, { c: i ? INK : HOT }); ly += 10; });
        ly += b ? 0 : 8; }
      section(G, rx, ly + 6, rw, 'THIS WEEK HERE');
      const ws = weekStart(A.weekOff), we = ws + 7 * 86400000, inPlace = p => !c || !c.place || !c.place.rings || RX.area.inRings(c.place.rings, p.lat, p.lng);
      const wkMarks = S.pois.filter(p => p.created >= ws && p.created < we && inPlace(p)).length, wkVisits = S.journal.filter(j => j.type === 'visit' && j.ts >= ws && j.ts < we).length;
      [[String(wkMarks), 'MARKS'], [String(wkVisits), 'VISITS'], [ex.cityPct != null ? Math.round(ex.cityPct) + '%' : '-', 'EXPLORED']].forEach((b, i) => { const x = rx + i * 39; G.frame(x, ly + 14, 37, 25, INK, 0.35); G.textC(b[0], x + 18.5, ly + 17, { s: b[0].length > 2 ? 1 : 2, c: HOT }); G.textC(b[1], x + 18.5, ly + 32, { face: 'mini', a: 0.6 }); });
      G.text('FIGURES STORED ON THIS UNIT', rx, 223, { face: 'mini', a: 0.5 });
    }
    // the week
    G.vline(530, 14, 217, INK, 0.28);
    const ws = weekStart(A.weekOff), we = ws + 7 * 86400000, wk = S.journal.filter(j => j.ts >= ws && j.ts < we);
    G.text('S2 · THE WEEK', 535, 17, { face: 'mini', a: 0.6 }); G.textR(wk.length + (wk.length === 1 ? ' ENTRY' : ' ENTRIES'), 670, 17, { face: 'mini', a: 0.6 });
    tabs(G, 534, 25, 137, ['LOG', 'OBJ', 'SCOUT'], A.focus === 'obj' ? 1 : A.deskTab === 'scout' ? 2 : 0);
    if (A.focus === 'obj') objDock(G, 535, 42, 135, 17);
    else if (A.deskTab === 'scout') scoutDock(G, 535, 42, 135);
    else {
      let ey = 42; const DAYN = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
      for (let di = 6; di >= 0 && ey < 160; di--) { const d0 = ws + di * 86400000, items = wk.filter(j => j.ts >= d0 && j.ts < d0 + 86400000).reverse(); if (!items.length) continue;
        const dd = new Date(d0); section(G, 535, ey, 135, DAYN[di] + ' ' + dd.getDate() + (d0 === weekStart(0) + ((new Date().getDay() + 6) % 7) * 86400000 ? ' · TODAY' : '')); ey += 8;
        items.forEach(j => { if (ey > 160) return; G.text(Fm.hm(j.ts), 535, ey + 1, { face: 'mini', a: 0.55 }); const p = j.poiId && S.poi(j.poiId), cat = p && U.catById(p.category); let x = 557; if (cat) { G.rect(x, ey + 1, 4, 4, cat.color, 1); x += 7; } G.text(fit(j.summary || j.type, 670 - x), x, ey); ey += 10; }); }
      if (!wk.length) G.text('NOTHING LOGGED THIS WEEK', 535, 44, { face: 'mini', a: 0.6 });
    }
    section(G, 535, 172, 135, (A.weekOff ? 'THAT WEEK' : 'THIS WEEK') + ' SO FAR');
    [[wk.filter(j => j.type === 'drop').length, 'MARKS', INK], [wk.filter(j => j.type === 'visit').length, 'VISITS', INK], [S.pending().length, 'PENDING', AMB]]
      .forEach((b, i) => { const x = 535 + i * 46; G.frame(x, 180, 44, 27, b[2], b[2] === AMB ? 0.6 : 0.35); G.textC(String(b[0]), x + 22, 184, { s: 2, c: b[2] === AMB ? AMB : HOT }); G.textC(b[1], x + 22, 200, { face: 'mini', a: 0.6 }); });
    G.hline(531, 219, 144, INK, 0.2); G.text('T OBJ · W LOG/SCOUT', 535, 223, { face: 'mini', a: 0.55 }); G.textR(backupDue() ? 'K ▸ BACKUP' : 'BACKED UP', 670, 223, { face: 'mini', c: backupDue() ? AMB : INK, a: 0.8 });
    weekStrip(G, ws, wk);
  }
  function scoutDock(G, x, y, w) {
    G.text('LOTS READ WHILE DRIVING', x, y, { c: HOT });
    if (!A.scout.length) { G.text('NONE YET · SCOUT SWITCH ON + DRIVE', x, y + 12, { face: 'mini', a: 0.6 }); return; }
    A.scout.slice(-12).reverse().forEach((s, i) => { const yy = y + 11 + i * 10; if (yy > 160) return; G.text(Fm.hm(s.ts), x, yy + 1, { face: 'mini', a: 0.55 }); G.text(fit(s.situs || s.owner || 'LOT', w - 60), x + 22, yy); G.textR(s.mkt ? money(s.mkt) : RX.parcel.fmtAcres(s.acres), x + w, yy, { face: 'mini', a: 0.8 }); });
  }
  function weekStrip(G, ws, wk) {
    G.hline(0, 231, W, INK, 0.28);
    G.text('T · WEEK', 6, 236, { face: 'mini', a: 0.7 }); G.text('06 ▸ 22', 6, 244, { face: 'mini', a: 0.45 });
    const cw = (W - 42) / 7, DAYN = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'], now = Date.now();
    for (let i = 0; i < 7; i++) { const d0 = ws + i * 86400000, x0 = Math.round(42 + i * cw), isToday = now >= d0 && now < d0 + 86400000, fut = d0 > now, items = wk.filter(j => j.ts >= d0 && j.ts < d0 + 86400000);
      G.vline(x0, 232, 31, INK, 0.22);
      G.text(DAYN[i] + ' ' + new Date(d0).getDate() + (isToday ? ' · TODAY' : ''), x0 + 4, 236, { face: 'mini', c: isToday ? AMB : INK, a: fut ? 0.35 : 0.8 });
      G.hline(x0 + 4, 252, Math.round(cw) - 8, INK, fut ? 0.2 : 0.5);
      items.forEach(j => { const hr = (j.ts - d0) / 3600000; if (hr < 6 || hr > 22) return; const x = Math.round(x0 + 4 + (hr - 6) / 16 * (cw - 8)), p = j.poiId && S.poi(j.poiId), cat = p && U.catById(p.category), ht = j.type === 'drop' ? 9 : j.type === 'visit' ? 6 : 4;
        G.vline(x, 252 - ht, ht, cat ? cat.color : j.type === 'visit' ? INK : HOT, 1); });
      if (isToday) { const x = Math.round(x0 + 4 + ((now - d0) / 3600000 - 6) / 16 * (cw - 8)); if (x > x0 + 3 && x < x0 + cw - 3) G.vline(x, 243, 19, AMB, 1); }
      G.text(fut ? '-' : items.length + (items.length === 1 ? ' ENTRY' : ' ENTRIES'), x0 + 4, 255, { face: 'mini', a: fut ? 0.3 : 0.55 }); }
  }

  // ======================================================================
  // DRIVE (moving · north-up in 1.0 · Mac location until a GPS puck)
  // ======================================================================
  function driveData() {
    const g = A.gps, c = A.area.c;
    // crossing into a new place → banner
    const pid = c ? (c.place ? c.place.geoid : 'none:' + (c.countyName || '')) : null;
    if (pid && pid !== A.drive.place) { if (A.drive.place != null && c) { A.drive.banner = { c, until: Date.now() + 8000 }; beep('ok'); } A.drive.place = pid; }
    // the road under you
    const rk = g.lat.toFixed(3) + ',' + g.lng.toFixed(3);
    if (rk !== A.drive.roadKey && !A.drive.roadBusy) { A.drive.roadKey = rk; A.drive.roadBusy = true; RX.traffic.near(g.lat, g.lng, 600).then(l => { A.drive.road = RX.traffic.main(l); }).catch(() => {}).then(() => { A.drive.roadBusy = false; A.dirty = true; }); }
    // SCOUT: read the lot you're passing
    if (P.scout && !A.drive.scoutBusy && (!A.drive.lastScout || Geo.meters(A.drive.lastScout.lat, A.drive.lastScout.lng, g.lat, g.lng) > 30)) {
      A.drive.scoutBusy = true; A.drive.lastScout = { lat: g.lat, lng: g.lng };
      RX.parcel.at(g.lat, g.lng).then(r => { if (!r) return; const last = A.scout[A.scout.length - 1]; if (last && last.id === r.id) return;
        A.scout.push({ ts: Date.now(), id: r.id, situs: r.situs, owner: r.owner, acres: r.acres, mkt: r.mkt, lat: g.lat, lng: g.lng }); if (A.scout.length > 500) A.scout = A.scout.slice(-500);
        try { localStorage.setItem('recon.xp.scout', JSON.stringify(A.scout)); } catch (e) {} beep('key'); })
        .catch(() => {}).then(() => { A.drive.scoutBusy = false; A.dirty = true; });
    }
  }
  function ahead() {
    const g = A.gps; if (!g) return null; const L = nearList(g, 40); if (!L.length) return null;
    const front = g.heading == null ? L : L.filter(r => { const d = Math.abs(((r.b - g.heading) + 540) % 360 - 180); return d < 60; });
    const list = front.length ? front : L; return list[A.drive.target % list.length];
  }
  function drawDrive(G) {
    const R = mapRegion(G, 0, 14, W, 249);
    overlays(G, R, { arrow: true, labels: true });
    if (!A.gps) { G.box(197, 110, 281, 40, AMB, 1); G.textC('WAITING FOR A POSITION', 337, 118, { c: AMB }); G.textC(A.gpsErr ? A.gpsErr : 'THIS MAC USES WI-FI LOCATION', 337, 130, { face: 'mini', a: 0.8 }); G.textC('RECON SHOWS THE MAP MEANWHILE', 337, 138, { face: 'mini', a: 0.6 }); }
    // banner
    const b = A.drive.banner;
    if (b && Date.now() < b.until) { const c = b.c, p = c.place, st = p && p.stats ? p : null, name = p ? String(p.name).toUpperCase() : 'UNINCORPORATED ' + (c.countyName || '').toUpperCase();
      const bx = 197, by = 20, bw = 281; G.box(bx, by, bw, 44, HOT, 1); G.box(bx + 1, by + 1, bw - 2, 42, HOT, 0.35);
      G.text('▸ ' + fit(name, 150, null, 2), bx + 8, by + 6, { s: 2, c: HOT }); G.textR((p && p.cdp ? 'COMMUNITY' : p ? 'CITY' : 'COUNTY') + ' · ' + (c.countyName || '').replace(/ County$/i, '').toUpperCase() + ' CO', bx + bw - 7, by + 10, { face: 'mini', a: 0.75 });
      let x = bx + 8; const yy = by + 29, ref = c.inTX ? c.county : c.state;
      if (st) { x += G.text('POP ', x, yy); x += G.text(kfmt(st.pop), x, yy, { c: HOT }) + 12; x += G.text('INC ', x, yy); x += G.text(money(st.income) + ' ', x, yy, { c: HOT }); x += G.text(vs(st.income, ref && ref.income), x, yy, { c: AMB }) + 12; }
      const cr = c.crime && c.crime.place; if (cr && cr[1]) { x += G.text('CRIME ', x, yy); x += G.text((cr[2] / cr[1] * 1000).toFixed(1), x, yy, { c: AMB }); G.text(' /1K', x, yy + 2, { face: 'mini', a: 0.7 }); }
      G.textR('FADES ' + Math.ceil((b.until - Date.now()) / 1000) + 'S', bx + bw - 7, yy + 2, { face: 'mini', a: 0.55 }); }
    // scout card
    { const x = 6, y = 20; G.box(x, y, 151, 42, INK, 0.5); G.ring(x + 7, y + 6, 2, INK, 1); G.text('SCOUT ' + (P.scout ? 'ON' : 'OFF'), x + 12, y + 4, { face: 'mini', a: P.scout ? 1 : 0.5 }); G.textR(A.scout.length + ' READ', x + 146, y + 4, { face: 'mini', a: 0.75 });
      const s = A.scout[A.scout.length - 1]; if (s && P.scout) { G.text(fit(s.situs || s.owner || 'LOT', 140, null, 2), x + 5, y + 13, { s: 2, c: HOT }); G.text(fit(RX.parcel.fmtAcres(s.acres) + ' · ' + (s.mkt ? money(s.mkt) : 'NO VALUE') + ' · ' + Fm.ago(s.ts), 140), x + 5, y + 31); }
      else G.text(P.scout ? (A.drive.scoutBusy ? 'READING...' : 'NO LOT YET') : 'FLIP SCOUT TO READ LOTS', x + 5, y + 18, { a: 0.7 }); }
    // compass
    { const x = 606, y = 20; G.box(x, y, 63, 24, INK, 0.35); G.ring(x + 11, y + 12, 8, INK, 0.5); G.tri(x + 11, y + 12, 6, 0, HOT, 1); G.text('NORTH-UP', x + 23, y + 5, { face: 'mini', c: HOT }); G.text('Z' + Math.round(M.zoom), x + 23, y + 13, { face: 'mini', a: 0.65 }); }
    // on road
    { const x = 6, y = 213, r = A.drive.road; G.box(x, y, 166, 46, INK, 0.5); G.text('ON ROAD', x + 5, y + 4, { face: 'mini', a: 0.7 });
      if (r) { G.text(fit(r.road, 156, null, 3), x + 5, y + 12, { s: 3, c: HOT }); const w = G.text(RX.traffic.full(r.aadt), x + 5, y + 36); G.text("/ DAY · TXDOT '" + String(r.year).slice(2), x + 9 + w, y + 37, { face: 'mini', a: 0.7 }); }
      else G.text(A.gps ? 'NO COUNTED ROAD' : '-', x + 5, y + 20, { a: 0.7 }); }
    // speed
    { const x = 287, y = 203, sp = A.gps && A.gps.speed != null ? Math.round(A.gps.speed * 2.23694) : null; G.box(x, y, 101, 56, INK, 0.5);
      G.textR(sp == null ? '--' : String(sp), x + 66, y + (sp >= 100 ? 10 : 6), { s: sp >= 100 ? 4 : 5, c: HOT }); G.textC('MPH', x + 38, y + 45, { face: 'mini', a: 0.7 });
      const hd = A.gps && A.gps.heading != null ? A.gps.heading : null; G.text(hd == null ? '-' : card(hd), x + 72, y + 14, { s: 2, c: HOT }); G.text(hd == null ? '' : String(Math.round(hd)).padStart(3, '0') + '°', x + 72, y + 34, { a: 0.85 }); }
    // ahead
    { const x = 503, y = 213, a = ahead(); G.box(x, y, 166, 46, a ? '#FFB13B' : INK, a ? 0.7 : 0.4); G.text('AHEAD', x + 5, y + 4, { face: 'mini', a: 0.7 });
      if (a) { const cat = U.catById(a.p.category); G.textR(fit(S.markLabel(a.p), 100, 'mini'), x + 161, y + 4, { face: 'mini', c: cat ? cat.color : '#FFB13B' });
        const w = G.text(fmtMi(a.m).replace(' ', ''), x + 5, y + 12, { s: 3, c: HOT }); const rel = A.gps.heading != null ? a.b - A.gps.heading : a.b;
        G.tri(x + 20 + w, y + 22, 8, rel * Math.PI / 180, '#FFB13B', 1);
        const clk = A.gps.heading != null ? (Math.round((((rel % 360) + 360) % 360) / 30) || 12) + " O'CLOCK" : card(a.b);
        G.text(fit((cat ? cat.id : 'MARK') + ' · ' + clk, 156, 'mini'), x + 5, y + 37, { face: 'mini', a: 0.85 }); }
      else G.text('NO MARKS AHEAD', x + 5, y + 20, { a: 0.6 }); }
    if (A.drive.feed) { const x = 160, y = 70; G.box(x, y, 355, 130, INK, 1); G.text('SCOUT FEED · LAST 10 LOTS', x + 6, y + 5, { c: HOT });
      A.scout.slice(-10).reverse().forEach((s, i) => { const yy = y + 17 + i * 11; G.text(Fm.hm(s.ts), x + 6, yy + 1, { face: 'mini', a: 0.55 }); G.text(fit(s.situs || s.owner || 'LOT', 230), x + 28, yy); G.textR(s.mkt ? money(s.mkt) : RX.parcel.fmtAcres(s.acres), x + 349, yy, { c: HOT }); });
      if (!A.scout.length) G.text('NOTHING READ YET', x + 6, y + 20, { a: 0.6 }); }
  }

  // ======================================================================
  // SOFT KEYS · what the eight blank keys do right now
  // ======================================================================
  function softSet() {
    const f = A.focus, m = P.mode;
    if (f === 'fast') { const on = !!S.activeFast(); return { labels: ['START FAST', 'END FAST', '—', '—', '—', '—', '—', 'BACK'], lit: on ? [0] : [], amber: [1], act: i => { if (i === 0) fastStart(); else if (i === 1) fastEnd(); else if (i === 7) focus('map'); } }; }
    if (f === 'legend') { const hid = new Set(S.v2.hiddenCats || []); return { labels: CATS.map(c => c.short).concat(['SHOW ALL', 'DONE']), lit: CATS.map((c, i) => hid.has(c.id) ? -1 : i).filter(i => i >= 0), amber: [], act: i => legendKey(i) }; }
    if (m === 'drive') return { labels: ['- ZOOM', '+ ZOOM', 'HEAD-UP', 'CENTER', 'NEXT MARK', 'SCOUT FEED', 'QUIET', 'DIM'], lit: [M.follow && A.gps ? 3 : -1, A.drive.feed ? 5 : -1, P.quiet ? 6 : -1, A.dim ? 7 : -1], amber: [],
      act: i => [() => zoom(-1), () => zoom(1), () => say(['HEAD-UP COMES IN 1.1', 'NORTH-UP FOR NOW']), () => locate(), () => { A.drive.target++; }, () => { A.drive.feed = !A.drive.feed; }, () => { P.quiet = !P.quiet; saveP(); say(P.quiet ? 'QUIET · BEEPS OFF' : 'BEEPS ON'); }, () => { A.dim = !A.dim; applyDim(); }][i]() };
    if (m === 'desk' && f !== 'obj') { const empty = noData(); return { labels: ['TRACT', 'CITY', 'COUNTY', 'STATE', '◂ WEEK', 'WEEK ▸', '+ OBJECTIVE', empty ? 'IMPORT' : 'BACKUP'], lit: [P.dscale], amber: [6, 7],
      act: i => { if (i < 4) { P.dscale = i; saveP(); say(['DOSSIER', ['TRACT', 'CITY', 'COUNTY', 'STATE'][i] + ' SCALE']); } else if (i === 4) A.weekOff--; else if (i === 5) A.weekOff = Math.min(0, A.weekOff + 1); else if (i === 6) newObjective(); else if (empty) importBackup(); else exportBackup(); } }; }
    if (f === 'lot') return { labels: ['OWNER', 'LAND', 'VALUE', 'ROADS', 'AREA ▸', 'TAX CHECK', '+ MARK LOT', 'COUNTY ↗'], lit: [A.lotSec], amber: [5, 6, 7],
      act: i => { if (i < 4) { A.lotSec = i; if (i === 3 && M.zoom >= 13) trafficFetch(M.lat, M.lng, 1200); } else if (i === 4) leftPage('area'); else if (i === 5) taxCheck(); else if (i === 6) markLot(); else if (A.lot.res) window.open(RX.parcel.recordUrl(A.lot.res), '_blank'); } };
    if (f === 'area') return { labels: ['TRACT', 'CITY', 'COUNTY', 'STATE', 'PROFILE ▸', 'ROADS', '+ MARK SPOT', 'EXPORT'], lit: [P.scale], amber: [6, 7],
      act: i => { if (i < 4) setScale(i); else if (i === 4) { P.dscale = P.scale; setMode('desk'); } else if (i === 5) { A.busiestMode = true; leftPage('traffic'); busiestFetch(); } else if (i === 6) mark('AREA'); else exportArea(); } };
    if (f === 'traffic') return { labels: ['◂ ROAD', 'ROAD ▸', '5-YR', 'BUSIEST', 'ALL COUNTS', 'LABELS', '+ MARK SPOT', '—'], lit: [A.yr5 ? 2 : -1, A.busiestMode ? 3 : -1, P.allCounts ? 4 : -1, P.labels ? 5 : -1], amber: [6],
      act: i => { if (i === 0) A.sel.traffic = Math.max(0, A.sel.traffic - 1); else if (i === 1) A.sel.traffic++; else if (i === 2) A.yr5 = !A.yr5; else if (i === 3) { A.busiestMode = !A.busiestMode; A.sel.traffic = 0; if (A.busiestMode) busiestFetch(); } else if (i === 4) { P.allCounts = !P.allCounts; saveP(); } else if (i === 5) { P.labels = !P.labels; saveP(); } else if (i === 6) mark('TRAFFIC'); } };
    if (f === 'log') return { labels: ['ALL', 'MARKS', 'VISITS', 'OTHER', '◂ DAY', 'DAY ▸', 'ON MAP', 'EXPORT'], lit: [A.logFilter], amber: [7],
      act: i => { if (i < 4) { A.logFilter = i; A.sel.log = 0; } else if (i === 4) { A.logDay++; A.sel.log = 0; } else if (i === 5) { A.logDay = Math.max(0, A.logDay - 1); A.sel.log = 0; } else if (i === 6) logOnMap(); else exportBackup(); } };
    if (f === 'obj') return { labels: ['ACTIVE', 'DONE', 'DUE', 'ON MAP', '◂ PREV', 'NEXT ▸', '+ NEW', 'DONE ✓'], lit: [A.objTab], amber: [6, 7],
      act: i => { if (i < 3) { A.objTab = i; A.sel.obj = 0; } else if (i === 3) objOnMap(); else if (i === 4) A.sel.obj = Math.max(0, A.sel.obj - 1); else if (i === 5) A.sel.obj++; else if (i === 6) newObjective(); else objToggle(); } };
    if (f === 'ref') return { labels: ['FIRST AID', 'KNOTS', '◂ PREV', 'NEXT ▸', '—', '—', '—', 'BACK'], lit: [A.refTopic], amber: [],
      act: i => { if (i < 2) { A.refTopic = i; A.sel.ref = 0; } else if (i === 2) A.sel.ref = Math.max(0, A.sel.ref - 1); else if (i === 3) A.sel.ref++; else if (i === 7) focus('map'); } };
    return { labels: ['- ZOOM', '+ ZOOM', 'FOLLOW', 'CENTER', '◂ FOLD', 'FOLD ▸', 'GRID', 'LABELS'], lit: [M.follow && A.gps ? 2 : -1, P.foldL ? 4 : -1, P.foldR ? 5 : -1, P.grid ? 6 : -1, P.labels ? 7 : -1], amber: [],
      act: i => [() => zoom(-1), () => zoom(1), () => { if (!A.gps) return say(['NO POSITION YET', A.gpsErr || 'WAITING ON MAC LOCATION']); M.follow = !M.follow; if (M.follow) M.setView(A.gps.lat, A.gps.lng); moved(); }, () => locate(), () => { P.foldL = !P.foldL; saveP(); M.dirty = true; }, () => { P.foldR = !P.foldR; saveP(); M.dirty = true; }, () => { P.grid = !P.grid; saveP(); }, () => { P.labels = !P.labels; saveP(); }][i]() };
  }

  // ======================================================================
  // ACTIONS
  // ======================================================================
  // nothing filed in this browser yet (fog alone doesn't count: the Mac's own position reveals some)
  const noData = () => !S.pois.length && !S.missions.length && !S.journal.length;
  function focus(f) { A.focus = f; A.dirty = true; }
  function leftPage(p) { P.left = p; saveP(); focus(p); A.lot.key = ''; moved(); }
  function setScale(i) {
    P.scale = i; saveP(); const p = A.area.c && A.area.c.place;
    if (i === 0) { if (M.zoom < 13 || M.zoom > 15) M.setView(M.lat, M.lng, 14); }
    else if (i === 1) M.setView(M.lat, M.lng, p ? (p.sqmi < 15 ? 13 : p.sqmi < 60 ? 12 : p.sqmi < 250 ? 11 : 10) : 12);
    else if (i === 2) M.setView(M.lat, M.lng, 10); else M.setView(M.lat, M.lng, 7);
    M.follow = false; moved(); say(['AREA ▸ ' + ['TRACT', 'CITY', 'COUNTY', 'STATE'][i]]);
  }
  function zoom(d) { M.zoomBy(d); P.zooms[P.mode] = M.zoom; saveP(); moved(); }
  function locate() {
    if (A.gps) { M.setView(A.gps.lat, A.gps.lng); M.follow = true; say(['ON YOU', 'FIX ±' + Math.round(A.gps.acc * 3.28084) + ' FT']); }
    else { const lp = S.v2.lastPos; if (lp) M.setView(lp.lat, lp.lng); say(['NO POSITION YET', lp ? 'LAST KNOWN SPOT' : (A.gpsErr || 'WAITING ON MAC LOCATION')]); try { navigator.geolocation.getCurrentPosition(onFix, onGpsErr, { enableHighAccuracy: true, timeout: 15000 }); } catch (e) {} }
    moved();
  }
  function setMode(m) {
    if (MODES.indexOf(m) < 0 || m === P.mode) return;
    P.zooms[P.mode] = M.zoom; P.mode = m; saveP();
    if (m === 'drive') { if (A.gps) { M.setView(A.gps.lat, A.gps.lng, P.zooms.drive); M.follow = true; } else M.setView(M.lat, M.lng, P.zooms.drive); }
    else M.setView(M.lat, M.lng, P.zooms[m]);
    if (A.focus !== 'map' && !(m === 'recon' && ['lot', 'area', 'traffic', 'log', 'obj', 'ref'].indexOf(A.focus) >= 0)) A.focus = 'map';
    updateKnob(true); moved(); M.dirty = true; lcdRefresh();
    say({ drive: ['DRIVE', 'GLANCE ONLY', 'NORTH-UP'], recon: ['RECON', 'PARKED', 'THREE PANELS'], desk: ['DESK', 'HOME', 'REVIEW THE WEEK'] }[m]);
  }
  function turn(dir) { const i = MODES.indexOf(P.mode); setMode(MODES[(i + (dir || 1) + 3) % 3]); }
  function pickPreset(i) {
    P.preset = i; saveP(); const cat = CATS[i];
    if (A.assign && Date.now() < A.assign.until) { const p = S.poi(A.assign.id); if (p) { p.category = cat.id; S.savePOIs(); S.log('classify', p.id, 'Classified: ' + S.markLabel(p), cat.id); say(['MARK ' + p.id.slice(-4) + ' REFILED', cat.id]); A.assign.until = Date.now() + 5000; } }
    else say(['PRESET ' + (i + 1), cat.id, 'SPACE MARKS AS ' + cat.short]);
    updatePresets(); M.dirty = true;
  }
  function mark(how, opts) {
    const h = (P.mode === 'drive' && A.gps) ? A.gps : { lat: M.lat, lng: M.lng }, cat = CATS[P.preset], id = 'POI-' + Date.now();
    const p = Object.assign({ id, lat: +h.lat.toFixed(6), lng: +h.lng.toFixed(6), category: cat.id, type: 'NONE', shape: 'ICON', name: '', notes: '', photo: null, hva: false, tier: 2, regionId: null, sector: null, created: Date.now() }, opts || {});
    S.pois.push(p); S.savePOIs();
    const where = A.area.c && A.area.c.place ? String(A.area.c.place.name).toUpperCase() : '';
    S.log('drop', id, 'Pin dropped', 'XP-1000' + (how ? ' · ' + how : '') + (where ? ' · ' + where : ''));
    A.assign = { id, until: Date.now() + 5000 }; A.markLitUntil = Date.now() + 700;
    say(['MARK ' + id.slice(-4) + ' SAVED', cat.id, '1-6 REFILES']); beep('mark'); M.dirty = true; lamps();
    if (!p.name && S.v2.autoName !== false) Geo.reverse(p.lat, p.lng, 18).then(r => { const cur = r && S.poi(id); if (!cur || cur.name) return; const nm = ((r.house ? r.house + ' ' : '') + r.road).trim(); if (nm) { cur.name = nm; S.savePOIs(); A.dirty = true; } });
  }
  async function markLot() {
    const r = A.lot.res; if (!r) return say(['NO LOT READ YET', 'PARK THE CROSSHAIR ON ONE']);
    const lat = r.at[0], lng = r.at[1];
    mark('LOT', { lat, lng, name: r.situs ? r.situs.split(',')[0] : (r.owner || 'LOT'), notes: RX.parcel.summary(r) });
  }
  function taxCheck() {
    const r = A.lot.res; if (!r) return say(['NO LOT READ YET']);
    try { if (r.id) navigator.clipboard.writeText(r.id); } catch (e) {}
    const url = /HARRIS/i.test(r.county || '') ? 'https://www.hctax.net/Property/PropertyTax' : 'https://www.google.com/search?q=' + encodeURIComponent((r.county || '') + ' county tax office property tax account search');
    say([(r.id ? 'ACCOUNT ' + r.id + ' COPIED' : 'NO ACCOUNT'), 'OPENING ' + (r.county || 'COUNTY') + ' TAX OFFICE'], 4000); window.open(url, '_blank');
  }
  function download(name, text, type) { const url = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' })); const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); }
  function exportArea() {
    const d = scaleData(P.scale); if (!d) return say(['NOTHING TO EXPORT', 'READ AN AREA FIRST']);
    const lines = [d.title, d.sub, '', ['', ...d.cols.map(c => c.lab)].join('\t')];
    ROWDEF.forEach(rd => lines.push([rd[0], ...d.cols.map(c => { const v = c.o ? rd[1](c.o) : null; return v == null ? '-' : rd[2](v); })].join('\t')));
    if (d.crime.length) { lines.push('', ['PER 1,000', ...d.crime.map(c => c.lab)].join('\t')); lines.push(['VIOLENT', ...d.crime.map(c => c.r.v.toFixed(1))].join('\t')); lines.push(['PROPERTY', ...d.crime.map(c => Math.round(c.r.p))].join('\t')); }
    lines.push('', 'R.OS XP-1000 · ' + new Date().toISOString().slice(0, 10) + ' · ' + M.lat.toFixed(5) + ', ' + M.lng.toFixed(5));
    download('ros-area-' + d.title.split(' ')[0].toLowerCase() + '.txt', lines.join('\n')); say(['AREA EXPORTED', d.title]); beep('file');
  }
  function exportBackup() {
    const json = JSON.stringify(S.buildBackup(), null, 2); download('recon-os-backup-' + Date.now() + '.json', json, 'application/json');
    S.saveV2({ lastBackup: Date.now() }); say(['BACKUP SAVED', S.pois.length + ' MARKS', Fm.num(S.fog.size) + ' FOG CELLS'], 4000); beep('file'); lamps();
  }
  let importArmed = 0;
  function importBackup() { $('fileImport').value = ''; $('fileImport').click(); }
  $('fileImport').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const rd = new FileReader();
    rd.onload = ev => { let data; try { data = JSON.parse(ev.target.result); } catch (err) { say(['NOT A VALID BACKUP FILE']); beep('err'); return; }
      if (!data || !Array.isArray(data.pois)) { say(['NOT AN R.OS BACKUP']); beep('err'); return; }
      const s = S.summarize(data);
      if (!window.confirm('REPLACE ALL R.OS DATA IN THIS BROWSER WITH THIS BACKUP?\n\n' + s.marks + ' marks · ' + s.objectives + ' objectives · ' + s.fog + ' fog cells\nExported ' + (s.exported || 'unknown'))) { say(['IMPORT CANCELLED']); return; }
      try { S.applyBackup(data); M.dirty = true; say(['BACKUP LOADED', s.marks + ' MARKS'], 4000); beep('file'); } catch (err) { say(['IMPORT FAILED', String(err.message || err)]); beep('err'); } };
    rd.readAsText(file);
  });
  function newObjective() {
    const title = window.prompt('NEW OBJECTIVE AT THE CROSSHAIR', ''); if (!title) return;
    const m = { id: 'MSN-' + Date.now(), title: title.toUpperCase().slice(0, 60), notes: '', priority: 'normal', status: 'active', created: Date.now(), completed: null, lat: +M.lat.toFixed(6), lng: +M.lng.toFixed(6), poiId: null, deadline: null };
    S.missions.push(m); S.saveMissions(); S.log('mission-create', m.id, 'Created: ' + m.title); say(['ADDED', m.title]); beep('ok'); lamps();
  }
  function objToggle() {
    const L = objList(), m = L[Math.min(A.sel.obj, L.length - 1)]; if (!m) return;
    if (m.status === 'complete') { m.status = 'active'; m.completed = null; S.log('mission-reopen', m.id, 'Reopened: ' + m.title); say(['REOPENED', m.title]); }
    else { m.status = 'complete'; m.completed = Date.now(); S.log('mission-complete', m.id, 'Completed: ' + m.title); say(['DONE', m.title]); beep('file'); }
    S.saveMissions(); lamps();
  }
  function objOnMap() { const L = objList(), m = L[Math.min(A.sel.obj, L.length - 1)]; if (!m) return; if (m.lat == null) return say(['NO PLACE ON THIS ONE']); M.setView(m.lat, m.lng); M.follow = false; moved(); say(['ON MAP', m.title]); }
  function logOnMap() { const L = logList(), j = L[Math.min(A.sel.log, L.length - 1)], p = j && j.poiId && S.poi(j.poiId); if (!p) return say(['NO PLACE ON THIS ENTRY']); M.setView(p.lat, p.lng, Math.max(M.zoom, 16)); M.follow = false; moved(); say(['ON MAP', S.markLabel(p)]); }
  function legendKey(i) {
    const hid = new Set(S.v2.hiddenCats || []);
    if (i < 6) { const id = CATS[i].id; if (hid.has(id)) hid.delete(id); else hid.add(id); S.saveV2({ hiddenCats: [...hid] }); say([CATS[i].id + (hid.has(id) ? ' HIDDEN' : ' SHOWN')]); }
    else if (i === 6) { S.saveV2({ hiddenCats: [] }); say(['ALL MARKS SHOWN']); } else focus('map');
    M.dirty = true;
  }
  function fastStart() { if (S.activeFast()) return say(['ALREADY FASTING']); S.startFast(); say(['FAST STARTED', Fm.hm(Date.now())]); beep('ok'); lamps(); }
  function fastEnd() {
    const f = S.activeFast(); if (!f) return say(['NOT FASTING']);
    if (Date.now() - A.endFastAt > 3000) { A.endFastAt = Date.now(); return say(['END FAST?', 'PRESS END AGAIN', Fm.durHM(Date.now() - f.startTs) + ' SO FAR'], 3000); }
    S.endFast(); A.endFastAt = 0; say(['FAST ENDED']); beep('file'); lamps();
  }
  async function search() {
    const q = window.prompt('SEARCH · A PLACE, ADDRESS OR "LAT, LNG"', ''); if (!q) return;
    const ll = Geo.parseCoords(q); if (ll) { M.setView(ll.lat, ll.lng, Math.max(M.zoom, 15)); M.follow = false; moved(); return say(['GO TO', ll.lat.toFixed(4) + ', ' + ll.lng.toFixed(4)]); }
    say(['SEARCHING', q]);
    try { const r = await Geo.search(q, { lat: M.lat, lng: M.lng }); if (!r.length) return say(['NOTHING FOUND', q]); const t = r[0]; M.setView(t.lat, t.lng, Math.max(M.zoom, 15)); M.follow = false; moved(); say([fit(t.name, 160), t.where || t.kind || '']); }
    catch (e) { say(['SEARCH NEEDS A CONNECTION']); beep('err'); }
  }
  function toolKey(n) {
    if (n === 'search') return search();
    if (n === 'log') { if (P.mode === 'desk') { A.deskTab = A.focus === 'map' && A.deskTab !== 'scout' ? 'scout' : 'log'; return focus('map'); } P.right = 'log'; saveP(); return focus('log'); }
    if (n === 'objectives') { if (P.mode !== 'desk') { P.right = 'obj'; saveP(); } return focus(A.focus === 'obj' && P.mode === 'desk' ? 'map' : 'obj'); }
    if (n === 'ref') { if (P.mode !== 'recon') setMode('recon'); P.right = 'ref'; saveP(); return focus('ref'); }
    if (n === 'lot') { if (P.mode !== 'recon') setMode('recon'); const order = ['lot', 'traffic', 'area'], nx = A.focus === P.left ? order[(order.indexOf(P.left) + 1) % 3] : P.left; return leftPage(nx); }
    if (n === 'fast') { const f = S.activeFast(); say(f ? ['FAST ' + Fm.durHM(Date.now() - f.startTs), 'SINCE ' + Fm.day(f.startTs) + ' ' + Fm.hm(f.startTs)] : ['NOT FASTING', 'A ▸ START']); return focus('fast'); }
    if (n === 'legend') return focus('legend');
    if (n === 'vis') { const e = exploredStats(); return say(['EXPLORED ' + sqm(e.sqmi) + ' SQ MI', e.cityPct != null ? Math.round(e.cityPct) + '% OF ' + e.cityName : Fm.num(e.cells) + ' CELLS']); }
  }

  // ======================================================================
  // LCD · CLOCK · LAMPS
  // ======================================================================
  function lcdRows() {
    if (A.msg && Date.now() < A.msg.until) return { tag: '▸', rows: A.msg.rows };
    A.msg = null;
    if (P.mode === 'drive') { const r = A.drive.road, a = ahead(); return { tag: 'DRV', rows: [r ? r.road : 'NO ROAD', r ? RX.traffic.full(r.aadt) + "/DAY '" + String(r.year).slice(2) : '-', A.area.c && A.area.c.place ? '▸ ' + String(A.area.c.place.name).toUpperCase() : '', a ? 'NEXT MARK ' + fmtMi(a.m) : 'NO MARKS AHEAD'].filter(Boolean) }; }
    if (P.mode === 'desk') { const ws = weekStart(A.weekOff), wk = S.journal.filter(j => j.ts >= ws && j.ts < ws + 7 * 86400000), e = exploredStats(); return { tag: 'WK', rows: [weekLabel().split(' · ')[0], wk.filter(j => j.type === 'drop').length + ' MARKS', 'EXPL ' + sqm(e.sqmi) + ' SQ MI', backupDue() ? 'BACKUP DUE' : 'BACKED UP'] }; }
    if (P.left === 'lot' && A.lot.res && A.focus === 'lot') { const r = A.lot.res; return { tag: 'LOT', rows: [fit(r.situs || 'NO ADDRESS', 120), RX.parcel.fmtAcres(r.acres), r.mkt ? money(r.mkt) : 'NO VALUE', r.owner ? fit(r.owner, 90) : ''] }; }
    const d = scaleData(P.scale); if (!d || !d.cols[0] || !d.cols[0].o) return { tag: 'R.OS', rows: [A.area.busy ? 'READING...' : 'XP-1000', 'R.OS ' + XP.VERSION, S.pois.length + ' MARKS'] };
    const o = d.cols[0].o, ref = d.cols[1] && d.cols[1].o, c0 = d.crime[0];
    return { tag: ['TRC', 'CTY', 'CNT', 'STA'][P.scale], rows: [fit(d.title.split(' · ')[0], 80), 'INC ' + money(o.income) + ' ' + vs(o.income, ref && ref.income) + ' ' + (d.cols[1] ? d.cols[1].lab : ''), 'POP ' + kfmt(o.pop) + (o.growth != null ? ' ' + (o.growth >= 0 ? '+' : '') + Math.round(o.growth * 100) + '%' : ''), c0 ? 'CRIME ' + c0.r.v.toFixed(1) + ' V · ' + Math.round(c0.r.p) + ' P' : ''].filter(Boolean) };
  }
  let lcdKey = '';
  function lcdRefresh() {
    const L = lcdRows(), key = L.tag + '|' + L.rows.join('|'); if (key === lcdKey) return; lcdKey = key;
    const G = lcd.g; G.reset(); const y = Math.floor((G.r - 7) / 2); let x = 3;
    x += G.text(L.tag, x, y + 2, { face: 'mini', c: LCDINK, a: 0.55 }) + 6;
    L.rows.forEach(t => { if (x > G.c - 10) return; x += G.text(fit(t, G.c - x - 3), x, y, { c: LCDINK }) + 8; });
    lcd.present(); $('lcdText').textContent = L.rows.join(' · ');
  }
  let clockKey = '';
  function clockRefresh() {
    const now = new Date(), f = S.activeFast(), t = Fm.pad2(now.getHours()) + ':' + Fm.pad2(now.getMinutes()), fs = f ? Fm.durHM(Date.now() - f.startTs) : '--:--';
    const key = t + fs + (now.getSeconds() % 2); if (key === clockKey) return; clockKey = key;
    const G = clock.g; G.reset(); const y = Math.floor((G.r - 14) / 2);
    G.text(t.slice(0, 2), 3, y, { s: 2, c: AMB }); if (now.getSeconds() % 2 === 0) G.text(':', 3 + 12 * 2, y, { s: 2, c: AMB }); G.text(t.slice(3), 3 + 12 * 3, y, { s: 2, c: AMB });
    const fw = G.textR(fs, G.c - 3, y + 6, { face: 'mini', c: AMB, a: f ? 1 : 0.4 }); G.textR('FAST', G.c - 3 - fw - 4, y + 6, { face: 'mini', c: AMB, a: 0.65 });
    clock.present(); $('clockHost').setAttribute('aria-label', 'Clock ' + t + (f ? ', fasting ' + fs : ''));
  }
  const LAMPS = [['FIX', 'green'], ['SCOUT', 'green'], ['NEAR', 'green'], ['PEND', 'amber'], ['BKUP', 'amber']];
  function lamps() {
    const near = A.gps ? nearList(A.gps, 1)[0] : null;
    const on = [!!(A.gps && Date.now() - A.gps.ts < 30000), !!P.scout, !!(near && near.m < 400), S.pending().length > 0, !!backupDue()];
    LAMPS.forEach((l, i) => { const img = $('lamp' + i); const src = 'keys/lamp-' + l[1] + (on[i] ? '-lit' : '') + '.png'; if (img.getAttribute('src') !== src) img.setAttribute('src', src); img.alt = l[0] + (on[i] ? ' on' : ' off'); });
    const toolLit = { log: S.journal.some(j => Date.now() - j.ts < 3600000), objectives: S.missions.some(m => m.status === 'active' && m.deadline && m.deadline < Date.now() + 86400000), fast: !!S.activeFast(), vis: !!S.v2.hicon };
    document.querySelectorAll('.tool').forEach(el => el.classList.toggle('lit', !!toolLit[el.dataset.tool]));
  }

  // ======================================================================
  // THE CONSOLE: keys, knob, toggles
  // ======================================================================
  const TOOLS = [['search', 'Search · Q'], ['log', 'Log · W'], ['fast', 'Fast · E'], ['legend', 'Legend · R'], ['objectives', 'Objectives · T'], ['ref', 'Reference · Y'], ['lot', 'Lot pages · U'], ['vis', 'Explored · I']];
  const TOOL_LIT = { log: 1, fast: 1, objectives: 1, vis: 1 };
  const GLOW = ['255,139,139', '221,240,122', '108,182,255', '242,244,228', '226,139,255', '255,177,59'];
  function img(src, cls, style) { const i = document.createElement('img'); i.src = 'keys/' + src; i.alt = ''; if (cls) i.className = cls; if (style) i.setAttribute('style', style); return i; }
  function keyEl(cls, label, parts) { const b = document.createElement('button'); b.type = 'button'; b.tabIndex = -1; b.className = 'key ' + cls; b.setAttribute('aria-label', label); const s = document.createElement('span'); s.className = 'stk'; parts.forEach(p => s.appendChild(p)); b.appendChild(s); return b; }
  function down(el) { el.classList.remove('bA', 'bB'); el.classList.add('down'); }
  function up(el) { if (!el.classList.contains('down')) return; el.classList.remove('down'); el._b = !el._b; void el.offsetWidth; el.classList.add(el._b ? 'bA' : 'bB'); }
  function pressable(el, fn) {
    el.addEventListener('pointerdown', e => { if (e.button) return; e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch (x) {} down(el); beep('key'); fn(e); A.dirty = true; lcdRefresh(); });
    const rel = () => up(el); el.addEventListener('pointerup', rel); el.addEventListener('pointercancel', rel); el.addEventListener('lostpointercapture', rel);
    el.addEventListener('click', e => { if (e.detail !== 0) return; down(el); beep('key'); fn(e); A.dirty = true; lcdRefresh(); setTimeout(() => up(el), 90); });
  }
  const keys = { soft: [], pre: [], tool: {} };
  function buildConsole() {
    $('ver').textContent = XP.VERSION;
    const lw = $('lamps'); LAMPS.forEach((l, i) => { const im = img('lamp-' + l[1] + '.png'); im.id = 'lamp' + i; lw.appendChild(im); }); LAMPS.forEach(l => { const s = document.createElement('span'); s.textContent = l[0]; lw.appendChild(s); });
    for (let i = 0; i < 8; i++) { const k = keyEl('soft', 'Soft key ' + (i + 1) + ' (F' + (i + 1) + ' or ' + 'ASDFGHJK'[i] + ')', [img('soft-base.png'), img('soft-cap.png', 'cap f'), img('soft-cap-lit.png', 'cap f l')]);
      pressable(k, () => softPress(i)); $('softRow').appendChild(k); keys.soft.push(k); }
    CATS.forEach((c, i) => { const k = keyEl('pre', 'Preset ' + (i + 1) + ', ' + c.id.toLowerCase(), [img('pre-base.png'), img('pre-' + (i + 1) + '-cap.png', 'cap d'), img('pre-' + (i + 1) + '-cap-lit.png', 'cap d l'), img('pre-' + (i + 1) + '-ring.png'), img('pre-' + (i + 1) + '-ring-lit.png', 'l rl', '--glow: rgba(' + GLOW[i] + ',0.45)')]);
      pressable(k, () => pickPreset(i)); $('presets').appendChild(k); keys.pre.push(k); });
    TOOLS.forEach(t => { const n = t[0], parts = [img('tool-base.png'), img('tool-' + n + '-cap.png', 'cap d')]; if (TOOL_LIT[n]) parts.push(img('tool-' + n + '-cap-lit.png', 'cap d l')); parts.push(img('tool-' + n + '-ring.png')); if (TOOL_LIT[n]) parts.push(img('tool-' + n + '-ring-lit.png', 'l rl'));
      const k = keyEl('tool', t[1], parts); k.dataset.tool = n; pressable(k, () => toolKey(n)); $('tools').appendChild(k); keys.tool[n] = k; });
    pressable($('mark'), () => mark());
    pressable($('knob'), e => turn(e && e.shiftKey ? -1 : 1));
    ['drive', 'recon', 'desk'].forEach(m => $('k' + m[0].toUpperCase() + m.slice(1)).addEventListener('click', () => setMode(m)));
    pressable($('togHi'), () => { S.saveV2({ hicon: !S.v2.hicon }); M.dirty = true; say(S.v2.hicon ? ['HI-CON ON', 'WHITE = BEEN THERE'] : ['HI-CON OFF']); updateToggles(true, 'togHi'); });
    pressable($('togScout'), () => { P.scout = !P.scout; saveP(); say(P.scout ? ['SCOUT ON', 'READS EACH LOT YOU PASS'] : ['SCOUT OFF']); updateToggles(true, 'togScout'); lamps(); });
    document.querySelectorAll('#stage button').forEach(b => { b.tabIndex = -1; });
    updatePresets(); updateToggles(); updateKnob();
  }
  function softPress(i) { const set = softSet(); A.flash = { i, until: Date.now() + 160 }; set.act(i); }
  function updatePresets() { keys.pre.forEach((k, i) => k.classList.toggle('lit', i === P.preset)); }
  function updateToggles(kick, which) {
    const hi = !!S.v2.hicon; $('togHi').classList.toggle('on', hi); $('togHi').setAttribute('aria-pressed', hi); $('hiGlyph').classList.toggle('on', hi);
    $('togScout').classList.toggle('on', !!P.scout); $('togScout').setAttribute('aria-pressed', !!P.scout); $('scGlyph').classList.toggle('on', !!P.scout);
  }
  function updateKnob() {
    document.querySelectorAll('#knob img').forEach(i => i.classList.toggle('on', i.dataset.m === P.mode));
    ['drive', 'recon', 'desk'].forEach(m => { $('k' + m[0].toUpperCase() + m.slice(1)).classList.toggle('on', m === P.mode); document.querySelector('.t-' + m).classList.toggle('on', m === P.mode); });
  }
  function applyDim() { $('screenHost').style.opacity = A.dim ? 0.45 : 1; }

  // ---------- keyboard ----------
  const SOFTK = { F1: 0, F2: 1, F3: 2, F4: 3, F5: 4, F6: 5, F7: 6, F8: 7, a: 0, s: 1, d: 2, f: 3, g: 4, h: 5, j: 6, k: 7 };
  const TOOLK = { q: 'search', w: 'log', e: 'fast', r: 'legend', t: 'objectives', y: 'ref', u: 'lot', i: 'vis' };
  const held = new Map();
  function keyTarget(e) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (SOFTK[e.key] != null || SOFTK[k] != null) { const i = SOFTK[e.key] != null ? SOFTK[e.key] : SOFTK[k]; return { el: keys.soft[i], fn: () => softPress(i) }; }
    if (/^[1-6]$/.test(k)) { const i = +k - 1; return { el: keys.pre[i], fn: () => pickPreset(i) }; }
    if (TOOLK[k]) return { el: keys.tool[TOOLK[k]], fn: () => toolKey(TOOLK[k]) };
    if (k === ' ') return { el: $('mark'), fn: () => mark() };
    if (k === 'Tab') return { el: $('knob'), fn: () => turn(e.shiftKey ? -1 : 1) };
    return null;
  }
  addEventListener('keydown', e => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.shiftKey && (e.key === 'K' || e.key === 'F8') && P.mode === 'desk') { e.preventDefault(); importBackup(); return; }
    const t = keyTarget(e);
    if (t) { e.preventDefault(); if (e.repeat) return; held.set(e.code, t.el); down(t.el); beep('key'); t.fn(); A.dirty = true; lcdRefresh(); return; }
    const list = ['log', 'obj', 'ref', 'traffic'].indexOf(A.focus) >= 0 && P.mode !== 'drive';
    if (e.key === 'Escape') { focus('map'); A.drive.feed = false; return; }
    if (e.key === 'Enter') { if (A.focus === 'log') logOnMap(); else if (A.focus === 'obj') objOnMap(); return; }
    if (list && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); const k = A.focus === 'traffic' ? 'traffic' : A.focus; A.sel[k] = Math.max(0, A.sel[k] + (e.key === 'ArrowDown' ? 1 : -1)); A.dirty = true; return; }
    const step = e.shiftKey ? 200 : 60;
    if (e.key.startsWith('Arrow')) { e.preventDefault(); const dx = { ArrowLeft: -step, ArrowRight: step }[e.key] || 0, dy = { ArrowUp: -step, ArrowDown: step }[e.key] || 0; M.panBy(-dx, -dy); M.follow = false; moved(); return; }
    if (e.key === '+' || e.key === '=') { zoom(1); return; }
    if (e.key === '-' || e.key === '_') { zoom(-1); return; }
    if (e.key === '0') { locate(); return; }
    if (e.key === '`') { try { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen(); } catch (x) {} return; }
  });
  addEventListener('keyup', e => { const el = held.get(e.code); if (el) { held.delete(e.code); up(el); } });
  addEventListener('blur', () => { held.forEach(el => up(el)); held.clear(); });

  // ---------- mouse on the screen: drag pans, wheel zooms ----------
  function mapRectCss() { if (P.mode === 'drive') return [0, 14, W, 249]; if (P.mode === 'desk') return [0, 14, 220, 217]; const L = P.foldL ? 0 : 163, R = P.foldR ? W : 543; return [L, 14, R - L, 223]; }
  function screenDot(e) { const r = $('screenHost').getBoundingClientRect(); return [(e.clientX - r.left) / r.width * W, (e.clientY - r.top) / r.height * H, r.width / 1350]; }
  const sh = () => $('screenHost');
  function inMap(d) { const m = mapRectCss(); return d[0] >= m[0] && d[1] >= m[1] && d[0] < m[0] + m[2] && d[1] < m[1] + m[3]; }
  function bindScreen() {
    const el = sh(); let drag = null;
    el.addEventListener('pointerdown', e => { const d = screenDot(e); if (!inMap(d)) return; drag = { x: e.clientX, y: e.clientY, s: d[2] }; el.setPointerCapture(e.pointerId); el.classList.add('grab'); });
    el.addEventListener('pointermove', e => { if (!drag) return; const dx = (e.clientX - drag.x) / drag.s, dy = (e.clientY - drag.y) / drag.s; drag.x = e.clientX; drag.y = e.clientY; M.panBy(dx, dy); M.follow = false; moved(); });
    const end = () => { drag = null; el.classList.remove('grab'); }; el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', e => { const d = screenDot(e); if (!inMap(d)) return; e.preventDefault(); const m = mapRectCss();
      const v = { cols: m[2], rows: m[3], pitch: 2, cx: m[2] / 2, cy: Math.round(m[3] / 2) }; M.zoomBy(Math.max(-0.5, Math.min(0.5, -e.deltaY * (e.deltaMode ? 0.08 : 0.004))), d[0] - m[0], d[1] - m[1], v); P.zooms[P.mode] = M.zoom; saveP(); M.follow = false; moved(); }, { passive: false });
    el.addEventListener('dblclick', e => { const d = screenDot(e); if (!inMap(d)) return; const m = mapRectCss(); const v = { cols: m[2], rows: m[3], pitch: 2, cx: m[2] / 2, cy: Math.round(m[3] / 2) }; const ll = M.dotToLatLng(d[0] - m[0], d[1] - m[1], v); M.setView(ll.lat, ll.lng); M.follow = false; moved(); });
  }

  // ======================================================================
  // POSITION (the Mac's own location, or a puck in 1.1)
  // ======================================================================
  let lastFog = null;
  function onFix(pos) {
    const c = pos.coords; if (!Number.isFinite(c.latitude)) return;
    const first = !A.gps, prev = A.gps, now = Date.now();
    let speed = Number.isFinite(c.speed) && c.speed >= 0 ? c.speed : null, heading = Number.isFinite(c.heading) ? c.heading : null;
    if (prev && (speed == null || heading == null)) { const dt = (now - prev.ts) / 1000, dm = Geo.meters(prev.lat, prev.lng, c.latitude, c.longitude); if (dt > 0.5 && dm > Math.max(8, c.accuracy * 0.5)) { if (speed == null) speed = Math.min(60, dm / dt); if (heading == null) heading = Geo.bearing(prev.lat, prev.lng, c.latitude, c.longitude); } else { if (speed == null) speed = prev.speed && dt < 10 ? prev.speed : 0; if (heading == null) heading = prev.heading; } }
    A.gps = { lat: c.latitude, lng: c.longitude, acc: Number.isFinite(c.accuracy) ? c.accuracy : 50, speed, heading, ts: now }; A.gpsErr = null;
    if (first) { if (M.follow || P.mode === 'drive') { M.setView(A.gps.lat, A.gps.lng); M.follow = true; } if (!noData()) say(['POSITION', '±' + Math.round(A.gps.acc * 3.28084) + ' FT · MAC LOCATION']); beep('ok'); }
    else if (M.follow) M.setView(A.gps.lat, A.gps.lng);
    if (!lastFog || Geo.meters(lastFog.lat, lastFog.lng, A.gps.lat, A.gps.lng) >= 50) { if (S.revealAround(A.gps.lat, A.gps.lng)) M.dirty = true; lastFog = { lat: A.gps.lat, lng: A.gps.lng }; }
    S.saveV2({ lastPos: { lat: +A.gps.lat.toFixed(5), lng: +A.gps.lng.toFixed(5) } });
    moved(); lamps();
  }
  function onGpsErr(err) { A.gpsErr = err.code === 1 ? 'LOCATION BLOCKED' : err.code === 2 ? 'NO SIGNAL' : 'LOCATION TIMEOUT'; A.dirty = true; lamps(); }
  function startGps() { if (!navigator.geolocation) { A.gpsErr = 'NO LOCATION IN BROWSER'; return; } try { navigator.geolocation.watchPosition(onFix, onGpsErr, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }); } catch (e) { A.gpsErr = 'LOCATION UNAVAILABLE'; } }

  // ======================================================================
  // LOOP
  // ======================================================================
  let lastDraw = 0, lastLamp = 0;
  function frame(t) {
    requestAnimationFrame(frame);
    A.t = t;
    const animating = (A.gps && (P.mode !== 'desk')) || (A.flash && Date.now() < A.flash.until + 50) || (A.drive.banner && Date.now() < A.drive.banner.until + 1000) || M.loading > 0;
    if (M.dirty) A.dirty = true;
    if (A.dirty || (animating && t - lastDraw > 66) || t - lastDraw > 1000) { lastDraw = t; drawAll(); }
    tickData();
    lcdRefresh(); clockRefresh();
    if (t - lastLamp > 2000) { lastLamp = t; lamps(); }
    if (A.assign && Date.now() > A.assign.until) A.assign = null;
  }

  function drawAll() {
    A.dirty = false;
    const G = screen.g; G.reset();
    status(G);
    if (P.mode === 'drive') drawDrive(G); else if (P.mode === 'desk') drawDesk(G); else drawRecon(G);
    const set = softSet(); softRow(G, set);
    keys.soft.forEach((k, i) => k.classList.toggle('lit', set.lit.indexOf(i) >= 0 || (A.flash && A.flash.i === i && Date.now() < A.flash.until)));
    screen.present();
    $('mark').classList.toggle('lit', Date.now() < A.markLitUntil);
    updateToggles();
  }

  // ---------- boot ----------
  function boot() {
    S.load();
    M.setSource(S.v2.mapSrc || 'AUTO');
    const lp = S.v2.lastPos; M.setView(lp ? lp.lat : M.lat, lp ? lp.lng : M.lng, P.zooms[P.mode] || 15); M.follow = true;
    if (P.mode === 'recon' && ['lot', 'area', 'traffic'].indexOf(P.left) < 0) P.left = 'area';
    fitStage(); addEventListener('resize', fitStage);
    buildPanels(); buildConsole(); bindScreen(); applyDim();
    startGps(); lamps(); lcdRefresh(); clockRefresh();
    window.addEventListener('storage', e => { if (e.key && e.key.startsWith('recon.os.')) { S.load(); M.dirty = true; } });
    requestAnimationFrame(frame);
    if (noData()) say(['NO R.OS DATA IN THIS BROWSER', 'DESK ▸ K IMPORTS AN RP BACKUP'], 12000);
    XP.app = { A, P, setMode, mark, say, drawAll };
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(boot, boot);
})();
