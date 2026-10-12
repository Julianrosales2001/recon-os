/* =============================================================
   RECON.OS RX-90 · AUX
   The screen block is a slider. Tap the grip on its lip (or drag
   it) and a latch lets go: a spring runs the panel up its rails
   under the readout hood, uncovering the AUX deck. Its two frosted
   keys were held flush by the panel; once the panel's edge clears
   them they spring up and their lamps catch. Pull the grip down
   and the panel rides home, its lip pressing the keys back into
   their wells.
   SCAN · one sonar sweep per press: named places around you from
          OpenStreetMap, radius on the drum, nearest twelve shown.
   HERE · exactly where you are: coordinates, address, county,
          elevation, plus code, the lot.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const S = RX.store, M = RX.map, U = RX.ui, Geo = RX.geo, C = U.C, F = U.F;
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const ein = t => { t = clamp(t, 0, 1); return t * t * t; };
  const now = () => performance.now();

  // ======================================================================
  // HARDWARE
  // ======================================================================
  const STANDBY = 0.32;
  const FLICK = { scan: [0, .55, .05, .2, .7, .15, .45, .25], here: [0, .35, .1, .6, .05, .5, .3, .2] };   // the lamps catching
  const HIT = [1, .45, 1, .7, 1];                                                                         // a press landing
  const KEYS = ['scan', 'here'];
  const SRC = n => 'keys/aux/' + n + '.webp';
  const X = RX.aux = { open: false, y: 0, mode: null };
  let A = null, hooks = {}, T = 96, raf = 0, slide = null, drag = null, flashT = 0;
  const el = {};
  const cap = {};
  KEYS.forEach(k => { cap[k] = { up: false, popT: -1e9, press: -1e9, g: 0, gl: null, d: -1, lit: -1, pop: 1 }; });

  // the panel's travel is the deck's height (CSS sets it per screen size)
  function measure() { T = Math.round(el.deck.offsetHeight) || 96; }
  const CLEAR = () => T / 2 + 33;   // the panel's edge is past the caps
  const CENTER = () => T / 2;

  function applyY(y) {
    X.y = y;
    const b = el.bezel;
    if (Math.abs(y) > 0.01) {
      b.style.transform = 'translateY(' + (-y).toFixed(2) + 'px)';
      const c = 'inset(' + Math.max(0, y).toFixed(2) + 'px 0 0 0)';
      b.style.clipPath = c; b.style.webkitClipPath = c;
    } else { b.style.transform = ''; b.style.clipPath = ''; b.style.webkitClipPath = ''; }
    el.hood.style.opacity = clamp(y / 12, 0, 1).toFixed(3);
    el.shadow.style.top = (b.offsetTop + b.offsetHeight - y).toFixed(1) + 'px';
    el.shadow.style.opacity = clamp(y / 8, 0, 1).toFixed(3);
  }
  // the screen lays its picture out to the window you can see (the top of the panel is under the hood)
  let laid = false;
  function relayout(on) {
    laid = !!on;
    el.win.style.paddingTop = on ? Math.max(1, T - 13) + 'px' : '';
    if (A && A.fitCart) A.fitCart();
    flashT = now(); kick();
  }
  X.lift = () => laid ? T : 0;

  // ---- the lamps ----
  function glowTarget(k) { const c = cap[k]; if (!X.open || !c.up) return 0; return X.mode === k ? 1 : STANDBY; }
  function glowSeq(k, steps, end, dt, delay) { cap[k].gl = { steps, end, dt: dt || 50, t0: now() + (delay || 0) }; kick(); }
  function glowFade(k, to, dur) { cap[k].gl = { from: cap[k].g, end: to, dur: dur || 220, t0: now() }; kick(); }
  function stepGlow(k, t) {
    const c = cap[k], gl = c.gl; if (!gl) return false;
    if (t < gl.t0) { if (gl.steps) c.g = gl.before != null ? gl.before : c.g; return true; }
    if (gl.steps) {
      const i = Math.floor((t - gl.t0) / gl.dt);
      if (i < gl.steps.length) { c.g = gl.steps[i]; return true; }
      c.g = gl.end; c.gl = null; return false;
    }
    const k2 = (t - gl.t0) / gl.dur;
    if (k2 < 1) { c.g = gl.from + (gl.end - gl.from) * ease(k2); return true; }
    c.g = gl.end; c.gl = null; return false;
  }
  X.setMode = function (k) {
    const was = X.mode; if (was === k) return;
    X.mode = k;
    if (was && cap[was].up && X.open) glowFade(was, STANDBY, 250);
    if (k && cap[k].up && X.open) glowSeq(k, HIT, 1, 40);
  };

  // ---- one frame of the mechanism ----
  function pressDepth(dt) {   // a key press: down fast, hold, back up
    if (dt < 0 || dt > 370) return 0;
    if (dt < 90) return Math.round(3 * dt / 90);
    if (dt < 210) return 3;
    return Math.round(3 * (1 - (dt - 210) / 160));
  }
  function paint(t) {
    let busy = false;
    // the panel
    if (slide) {
      const r = slide.fn(t - slide.t0);
      applyY(r[0]); busy = true;
      if (r[1]) { const s = slide; slide = null; applyY(s.dir > 0 ? T : 0); s.done && s.done(); }
    }
    // the caps: flush under the panel; spring up once its edge clears them; the lip presses them home
    const y = X.y, cl = CLEAR(), ce = CENTER();
    KEYS.forEach((k, i) => {
      const c = cap[k];
      let base;
      if (y >= cl) {
        if (!c.up) {
          c.up = true; c.popT = t;
          if (A && A.booted) { A.beep('aux.keyup'); glowSeq(k, FLICK[k], glowTarget(k) || STANDBY, 50, 220 + i * 60); if (!i) setTimeout(() => A.beep('aux.lamp'), 220); }
        }
        const kk = t - c.popT; base = kk < 75 ? 3 - Math.floor(kk / 25) : 0;
        c.pop = kk >= 0 && kk < 200 ? 1 + 0.05 * Math.max(0, 1 - Math.abs(kk - 100) / 60) : 1;
        if (kk < 200) busy = true;
      } else {
        if (y <= ce && c.up) { c.up = false; c.gl = null; c.g = 0; }
        base = c.up ? Math.round(3 * clamp((cl - y) / (cl - ce), 0, 1)) : 3;
        c.pop = 1;
      }
      const pd = pressDepth(t - c.press); if (t - c.press <= 370) busy = true;
      const d = Math.max(base, pd);
      if (stepGlow(k, t)) busy = true;
      paintKey(k, d, c.up ? 0 : 1);
    });
    // the screen dips while it re-lays itself out
    const fk = t - flashT;
    if (fk < 160) { el.screen.style.opacity = [0.35, 0.75, 0.9, 1][Math.min(3, Math.floor(fk / 40))]; busy = true; }
    else if (el.screen.style.opacity) el.screen.style.opacity = '';
    return busy || !!drag;
  }
  function paintKey(k, d, flush) {
    const c = cap[k], b = el[k];
    if (c.d !== d) { c.d = d; b.off.src = SRC(k + '-' + d); b.on.src = SRC(k + '-lit-' + d); }
    const g = +c.g.toFixed(3);
    if (c.lit !== g) { c.lit = g; b.on.style.opacity = g; b.halo.style.opacity = (Math.max(0, (g - 0.3) / 0.7) * 0.9).toFixed(3); b.lbl.classList.toggle('lit', g > 0.6); }
    b.btn.style.transform = 'scale(' + ((1 - 0.022 * d) * c.pop).toFixed(4) + ') translateY(' + (0.6 * d).toFixed(2) + 'px)';
    const sh = Math.max(0.3, 3.5 - (flush ? 3 : d));
    b.btn.style.filter = 'brightness(' + (1 - 0.07 * d - (flush ? 0.12 : 0)).toFixed(3) + ') drop-shadow(0 ' + sh.toFixed(2) + 'px ' + sh.toFixed(2) + 'px rgba(0,0,0,.55))';
  }
  function loop(t) { raf = 0; if (paint(t)) kick(); }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }

  // ---- the slide: a semi-automatic spring ----
  // open: the spring starts it slow, snaps it past the middle, it lands on the stop and settles
  function openCurve(y0) {
    const a0 = Math.max(y0, 0.14 * T), p0 = y0 < 0.14 * T ? 140 * (1 - y0 / (0.14 * T)) : 0;
    const p1 = 180 * Math.max(0.35, (1.06 * T - a0) / (0.92 * T));
    return ms => {
      if (ms < p0) return [y0 + (0.14 * T - y0) * ein(ms / p0), false]; ms -= p0;
      if (ms < p1) return [a0 + (1.06 * T - a0) * ease(ms / p1), false]; ms -= p1;
      if (ms < 120) return [T * (1.06 - 0.075 * ease(ms / 120)), false]; ms -= 120;
      if (ms < 100) return [T * (0.985 + 0.015 * ease(ms / 100)), false];
      return [T, true];
    };
  }
  // close: it drags against the spring, goes over centre, the spring pulls it home onto the stop
  function closeCurve(y0) {
    const a = Math.min(y0, 0.7 * T), p0 = y0 > 0.7 * T ? 220 * ((y0 - 0.7 * T) / (0.3 * T)) : 0;
    const p1 = 140 * Math.max(0.4, a / (0.7 * T));
    return ms => {
      if (ms < p0) return [y0 - (y0 - 0.7 * T) * ease(ms / p0), false]; ms -= p0;
      if (ms < p1) return [a * (1 - Math.pow(ein(ms / p1), 0.7)), false]; ms -= p1;
      if (ms < 60) return [-1.2 * (1 - ms / 60), false];
      return [0, true];
    };
  }
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function runOpen(y0) {
    if (hooks.closeTray) hooks.closeTray();
    el.bar.setAttribute('aria-expanded', 'true');
    slide = { dir: 1, t0: now(), fn: reduced() ? () => [T, true] : openCurve(y0), done: () => {
      X.open = true; S.saveV2({ auxOpen: true }); relayout(true);
      KEYS.forEach(k => { if (cap[k].up && !cap[k].gl) glowFade(k, glowTarget(k), 120); });
      A.beep('aux.open', 0.6); A.dirty = true;
    } };
    kick();
  }
  function beginClose() {   // the moment the panel moves: lamps out, the picture back to the whole panel
    if (!X.open) return;
    X.open = false;
    KEYS.forEach(k => glowFade(k, 0, 120));
    relayout(false);
    if (A.stack.length > 1 && (A.top().name === 'sonar' || A.top().name === 'here')) A.home();
  }
  function runClose(y0) {
    beginClose();
    el.bar.setAttribute('aria-expanded', 'false');
    slide = { dir: -1, t0: now(), fn: reduced() ? () => [0, true] : closeCurve(y0), done: () => { S.saveV2({ auxOpen: false }); A.beep('aux.close', 0.8); A.dirty = true; } };
    kick();
  }
  X.toggle = function () {
    if (slide) return;
    A.wake(); A.beep('aux.latch');
    if (X.y > T / 2) runClose(X.y); else runOpen(X.y);
  };
  X.openNow = function () { if (!X.open && !slide) runOpen(X.y); };
  const usable = () => X.open && !slide && !drag;

  // ---- the grip: tap = latch; drag = move it yourself (past halfway the spring takes it) ----
  function wireBar() {
    const b = el.bar;
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); if (!A || !A.booted || slide) return;
      A.wake(); b.classList.add('down');
      drag = { y0: X.y, sy: e.clientY, moved: 0, live: false, wasOpen: X.open };
      try { b.setPointerCapture(e.pointerId); } catch (err) {}
      kick();
    });
    b.addEventListener('pointermove', e => {
      if (!drag) return;
      const dy = drag.sy - e.clientY; drag.moved = Math.max(drag.moved, Math.abs(dy));
      if (drag.moved < 6) return;
      if (!drag.live) { drag.live = true; if (drag.wasOpen) beginClose(); }
      const y = clamp(drag.y0 + dy * 0.9, 0, T);
      applyY(y);
      // past halfway the spring takes over
      if (!drag.wasOpen && y > 0.5 * T) { drag = null; b.classList.remove('down'); runOpen(y); }
      else if (drag.wasOpen && y < 0.6 * T) { drag = null; b.classList.remove('down'); runClose(y); }
      kick();
    });
    const end = e => {
      if (!drag) return;
      const d = drag; drag = null; b.classList.remove('down');
      if (!d.live) { if (e.type === 'pointerup') X.toggle(); return; }
      if (X.y > 0.5 * T) runOpen(X.y); else runClose(X.y);
    };
    b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end);
    b.addEventListener('click', e => e.preventDefault());
  }

  // ---- the keys ----
  X.key = function (k) {
    if (!A || !A.booted) return;
    A.wake();
    if (A.assign) { A.say('FILE THE MARK FIRST', 2000); A.beep('err'); return; }
    if (!X.open) { X.pendingKey = k; X.openNow(); A.say('AUX ▸ OPENING', 1200); return; }
    if (!usable()) return;
    A.beep('key'); cap[k].press = now(); kick();
    const scr = k === 'scan' ? 'sonar' : 'here';
    if (A.top().name === scr) RX.screens[scr].again(A.top().st, A);
    else { if (A.stack.length > 1) A.home(); A.go(scr); }
  };
  function wireKeys() {
    KEYS.forEach(k => {
      const b = el[k].btn;
      b.addEventListener('pointerdown', e => { e.preventDefault(); if (usable()) { cap[k].press = now(); kick(); } });
      b.addEventListener('click', e => { e.preventDefault(); if (usable()) { const t = cap[k].press; X.key(k); cap[k].press = t; } });
    });
  }

  X.wire = function (app, h) {
    A = app; hooks = h || {};
    el.bezel = $('bezel'); el.win = $('window'); el.screen = $('screen'); el.bar = $('auxBar'); el.deck = $('deck');
    el.hood = $('hood'); el.shadow = $('slabShadow');
    KEYS.forEach(k => {
      const btn = $(k === 'scan' ? 'auxScan' : 'auxHere');
      el[k] = { btn, off: btn.querySelector('.off'), on: btn.querySelector('.on'), halo: btn.querySelector('.halo'), lbl: $(k === 'scan' ? 'auxLblScan' : 'auxLblHere') };
    });
    // keep the art warm so the first press doesn't flash
    KEYS.forEach(k => [0, 1, 2, 3].forEach(d => { new Image().src = SRC(k + '-' + d); new Image().src = SRC(k + '-lit-' + d); }));
    measure();
    el.hood.style.top = el.bezel.offsetTop + 'px';
    wireBar(); wireKeys();
    if (S.v2.auxOpen) { applyY(T); X.open = true; el.bar.setAttribute('aria-expanded', 'true'); relayout(true); flashT = -1e9; }
    else applyY(0);
    paint(now());
    // the deck's height follows the screen size: re-seat the panel when it changes
    new ResizeObserver(() => {
      const t0 = T; measure(); el.hood.style.top = el.bezel.offsetTop + 'px';
      if (!slide && !drag) { applyY(X.y > t0 / 2 ? T : 0); if (laid && T !== t0) { el.win.style.paddingTop = Math.max(1, T - 13) + 'px'; if (A.fitCart) A.fitCart(); } }
    }).observe($('device'));
  };
  // after boot: if it was left open, the lamps catch
  X.booted = function () {
    if (X.open) { KEYS.forEach((k, i) => { cap[k].up = true; glowSeq(k, FLICK[k], glowTarget(k) || STANDBY, 50, 300 + i * 60); }); setTimeout(() => A.beep('aux.lamp'), 300); }
    if (X.pendingKey) { const k = X.pendingKey; X.pendingKey = null; X.key(k); }
  };
  // a key asked for while the panel was shut: press it once the panel has settled
  setInterval(() => { if (X.pendingKey && usable()) { const k = X.pendingKey; X.pendingKey = null; X.key(k); } }, 120);

  // ======================================================================
  // SCAN · a sonar sweep for named places around you
  // ======================================================================
  const RADII = [150, 300, 600, 1200, 2500];
  const PAGES = RADII.map(r => 'r' + r);
  const CAP = 12;
  const KINDS = ['FOOD', 'SHOP', 'SERV', 'FUEL', 'CIVIC', 'MISC'];
  const KCOL = { FOOD: '#FFB13B', SHOP: '#6CB6FF', SERV: '#E28BFF', FUEL: '#FF8B8B', CIVIC: '#DDF07A', MISC: '#F2F4E4' };
  const HOSTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
  const FT = 0.3048;

  function classify(t) {
    const a = t.amenity || '', s = t.shop || '';
    if (/^(restaurant|cafe|fast_food|bar|pub|ice_cream|food_court|biergarten)$/.test(a) || /^(bakery|deli|coffee|confectionery|pastry|tea|butcher)$/.test(s)) return 'FOOD';
    if (/^(fuel|charging_station)$/.test(a)) return 'FUEL';
    if (s) return /^(hairdresser|beauty|car_repair|laundry|dry_cleaning|tailor|massage|tattoo|funeral_directors|copyshop|repair|car_wash|travel_agency|optician|tyres|locksmith|storage_rental)$/.test(s) ? 'SERV' : 'SHOP';
    if (t.office || t.craft || t.healthcare || /^(bank|atm|pharmacy|clinic|doctors|dentist|hospital|veterinary|car_wash|car_rental|bureau_de_change|money_transfer|childcare|driving_school|nursing_home|vehicle_inspection)$/.test(a)) return 'SERV';
    if (/^(school|college|university|kindergarten|library|townhall|police|fire_station|courthouse|post_office|community_centre|place_of_worship|social_facility|public_building|arts_centre|theatre|cinema)$/.test(a)) return 'CIVIC';
    return 'MISC';
  }
  // the mark's icon, from what the place is
  function typeFor(t, kind) {
    const a = t.amenity || '', l = t.leisure || '', tr = t.tourism || '';
    if (kind === 'FOOD') return 'FOOD';
    if (kind === 'FUEL') return 'FUEL';
    if (a === 'parking') return 'PARKING';
    if (/^(bank|atm|bureau_de_change|money_transfer)$/.test(a)) return 'DOLLAR';
    if (t.healthcare || /^(pharmacy|clinic|doctors|dentist|hospital|veterinary)$/.test(a)) return 'MEDICAL';
    if (/^(fitness_centre|sports_centre)$/.test(l)) return 'GYM';
    if (/^(park|garden|nature_reserve|playground)$/.test(l)) return 'TREE';
    if (/^(hotel|motel|hostel|guest_house)$/.test(tr)) return 'BED';
    if (t.craft || /^(car_repair|repair|tyres)$/.test(t.shop || '')) return 'WRENCH';
    if (kind === 'SHOP') return 'SHOP';
    if (t.office) return 'WORK';
    if (a === 'place_of_worship') return 'STAR';
    return 'NONE';
  }
  // a first guess at the category ring's pick; you still choose
  const catFor = kind => kind === 'CIVIC' || kind === 'MISC' ? 2 : 3;   // LANDMARK : SUPPLY

  async function overpass(lat, lng, rM) {
    const q = '[out:json][timeout:20];nwr(around:' + Math.round(rM) + ',' + lat.toFixed(6) + ',' + lng.toFixed(6) + ')[name][~"^(amenity|shop|craft|office|healthcare|tourism|leisure)$"~"."];out tags center qt 1500;';
    let last = null;
    for (const host of HOSTS) {
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 22000);
      try {
        const res = await fetch(host, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl.signal });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const j = await res.json();
        return j.elements || [];
      } catch (e) { last = e; } finally { clearTimeout(tm); }
    }
    throw last || new Error('NO ANSWER');
  }
  const normName = s => RX.font.norm(s || '').replace(/[^A-Z0-9]/g, '');
  function alreadyMarked(it) {
    const n = normName(it.name);
    return S.pois.find(p => Geo.meters(p.lat, p.lng, it.lat, it.lng) < 60 && (normName(p.name) === n || Geo.meters(p.lat, p.lng, it.lat, it.lng) < 8)) || null;
  }

  async function sweep(st, A) {
    const fresh = A.gps && Date.now() - A.gps.ts < 60000;
    const from = fresh ? { lat: A.gps.lat, lng: A.gps.lng } : { lat: M.lat, lng: M.lng };
    const rM = Math.max(st.rFt, 600) * FT;
    const tok = st.tok = (st.tok || 0) + 1;
    st.busy = true; st.err = null; st.ping = now(); st.from = from; st.fromGps = fresh;
    A.dirty = true; A.lcdDirty = true;
    A.beep('scan.ping'); clearInterval(st.pingT);
    st.pingT = setInterval(() => { if (st.tok !== tok || !st.busy) { clearInterval(st.pingT); return; } A.beep('scan.ping'); }, 1300);
    try {
      const els = await overpass(from.lat, from.lng, rM);
      if (st.tok !== tok) return;
      const seen = new Set(), items = [];
      els.forEach(e => {
        const lat = e.lat != null ? e.lat : e.center && e.center.lat, lng = e.lon != null ? e.lon : e.center && e.center.lon;
        if (lat == null || lng == null || !e.tags || !e.tags.name) return;
        const name = RX.font.norm(e.tags.name).slice(0, 40);
        const key = normName(name) + '@' + lat.toFixed(4) + lng.toFixed(4);
        if (seen.has(key)) return; seen.add(key);
        const kind = classify(e.tags);
        items.push({ id: e.type[0] + e.id, lat, lng, name, kind, type: typeFor(e.tags, kind), tags: e.tags, m: Geo.meters(from.lat, from.lng, lat, lng), brg: Geo.bearing(from.lat, from.lng, lat, lng) });
      });
      items.sort((a, b) => a.m - b.m);
      st.res = { from, rM, at: Date.now(), items };
      st.pulse = now(); st.sel = 0; st.jog = true; st.scroll = 0;
      const n = items.filter(i => i.m <= st.rFt * FT).length;
      A.say('SCAN ▸ ' + n + ' PLACE' + (n === 1 ? '' : 'S') + ' IN ' + st.rFt + ' FT' + (fresh ? '' : ' OF THE MAP CENTER'), 3500);
      A.beep('scan.ping'); setTimeout(() => A.beep(n ? 'scan.found' : 'scan.empty'), 450);
    } catch (e) {
      if (st.tok !== tok) return;
      st.err = (e && e.name === 'AbortError') ? 'NO ANSWER' : 'NO SIGNAL';
      A.say('SCAN ▸ ' + st.err + ' · PRESS SCAN TO TRY AGAIN', 4000); A.beep('err');
    } finally {
      if (st.tok === tok) { st.busy = false; clearInterval(st.pingT); A.dirty = true; A.lcdDirty = true; }
    }
  }
  // what the current radius and kind leave on the scope
  function view(st) {
    const res = st.res; if (!res) return { all: [], inR: [], shown: [], counts: {} };
    const rM = st.rFt * FT;
    const inR = res.items.filter(i => i.m <= rM);
    const counts = { ALL: inR.length }; KINDS.forEach(k => { counts[k] = 0; }); inR.forEach(i => { counts[i.kind]++; });
    const all = st.kind === 'ALL' ? inR : inR.filter(i => i.kind === st.kind);
    return { all, inR, shown: all.slice(0, CAP), counts };
  }
  function markIt(st, A, it) {
    const had = alreadyMarked(it);
    if (had) { A.openMark(had.id); A.say('ALREADY MARKED ▸ ' + S.markLabel(had), 2500); return; }
    A.home();
    A.follow(false); M.setView(it.lat, it.lng, Math.max(M.zoom, 17));
    A.dropAt(it.lat, it.lng, 'SCAN', { name: it.name, type: it.type, sel: catFor(it.kind), notes: [it.tags['addr:housenumber'], it.tags['addr:street']].filter(Boolean).join(' ') });
  }

  RX.screens.sonar = {
    drum: PAGES,
    animating: st => st.busy || (st.pulse && now() - st.pulse < 1600),
    jogLabels: () => ['◂ NEARER', 'FARTHER ▸', 'PUSH ▸ MARK IT'],
    enter(st, params, A) {
      st.rFt = RADII.includes(S.v2.scanR) ? S.v2.scanR : 600; st.page = 'r' + st.rFt; st.kind = 'ALL';
      st.sel = 0; st.jog = true; X.setMode('scan'); sweep(st, A);
    },
    resume(st) { X.setMode('scan'); },
    leave(st) { st.tok = (st.tok || 0) + 1; clearInterval(st.pingT); X.setMode(null); },
    again(st, A) { sweep(st, A); },
    onPage(pg, st, A) {
      st.rFt = +pg.slice(1); S.saveV2({ scanR: st.rFt });
      st.sel = 0; st.scroll = 0;
      clearTimeout(st.rT);
      // inside what the last sweep covered: just redraw; farther out: sweep again once the drum settles
      if (st.res && st.res.rM >= st.rFt * FT - 1) { st.pulse = now(); A.dirty = true; }
      else st.rT = setTimeout(() => { if (A.top().st === st) sweep(st, A); }, 800);
    },
    jog(d, st, A) {
      const v = view(st), n = v.shown.length;
      if (!n) return;
      st.jog = true; st.sel = clamp((st.sel || 0) + d, 0, n - 1); st.armed = null;
    },
    push(st, A) { const it = view(st).shown[st.sel || 0]; if (it) markIt(st, A, it); else A.say(st.busy ? 'SCANNING...' : 'NOTHING TO MARK', 1800); },
    onMarkKey(st, A) { this.push(st, A); },
    lcd(st, A) {
      const v = view(st), it = v.shown[st.sel || 0];
      if (st.busy && !st.res) return { rows: [['SCN', 'PINGING ' + st.rFt + ' FT'], ['NEAR', '--'], ['DST', '--']], tag: 'SCN' };
      return { rows: [['SCN', v.all.length + (st.kind === 'ALL' ? '' : ' ' + st.kind) + ' IN ' + st.rFt + ' FT'], ['NEAR', it ? it.name : 'NOTHING'], ['DST', it ? Geo.fmtDist(it.m) + ' ' + Geo.cardinal(it.brg) + ' ' + String(Math.round(it.brg) % 360).padStart(3, '0') + '°' : '--']], tag: 'SCN' };
    },
    render(g, st, A) {
      const W = g.W, H = g.H, mx = g.mx, t = now();
      const v = view(st);
      const head = v.all.length > CAP ? CAP + ' OF ' + v.all.length : String(v.all.length);
      g.header('SCAN · ' + st.rFt + ' FT', st.busy ? 'PINGING' : (st.res ? head + (st.kind === 'ALL' ? '' : ' ' + st.kind) : ''));
      const fy = g.H - 11;
      // the scope
      const listMin = 5 * 9 + 10;
      const D = clamp(Math.min(W - 10, fy - 13 - listMin - 4), 34, 92), R = Math.floor(D / 2);
      const cx = Math.floor(W / 2), cy = 13 + R + 1;
      mx.ring(cx, cy, R, C.ink, 0.75);
      mx.ring(cx, cy, Math.round(R * 2 / 3), C.ink, 0.25, 3); mx.ring(cx, cy, Math.round(R / 3), C.ink, 0.25, 3);
      mx.hline(cx - R, cy, 2 * R + 1, C.ink, 0.12, 3); mx.vline(cx, cy - R, 2 * R + 1, C.ink, 0.12, 3);
      g.mini('N', cx - 1, cy - R - 6 < 12 ? cy - R + 2 : cy - R - 6, { a: 0.6 });
      const sc = R / (st.rFt * FT);
      // pulse: while waiting it keeps pinging; when the answer lands one ring sweeps out and the blips catch as it passes
      let pr = R + 1;
      if (st.busy) { const k = ((t - st.ping) % 1300) / 1100; if (k <= 1) { pr = k * R; mx.ring(cx, cy, Math.max(1, pr), C.hot, 0.8 * (1 - k)); } }
      else if (st.pulse && t - st.pulse < 1300) { const k = (t - st.pulse) / 1100; pr = Math.min(1, k) * R; if (k < 1) { mx.ring(cx, cy, Math.max(1, pr), C.hot, 0.9); if (pr > 3) mx.ring(cx, cy, pr - 3, C.ink, 0.35); } }
      if (st.res) {
        const from = st.res.from, shownSet = new Set(v.shown.map(i => i.id));
        // the rest of the crowd: single faint dots
        v.inR.forEach(it => {
          if (shownSet.has(it.id)) return;
          const r = it.m * sc; if (r > pr) return;
          const a = it.brg * Math.PI / 180;
          mx.set(Math.round(cx + Math.sin(a) * r), Math.round(cy - Math.cos(a) * r), KCOL[it.kind], st.kind === 'ALL' || it.kind === st.kind ? 0.35 : 0.12);
        });
        v.shown.forEach((it, i) => {
          const r = it.m * sc; if (r > pr) return;
          const a = it.brg * Math.PI / 180, x = Math.round(cx + Math.sin(a) * r), y = Math.round(cy - Math.cos(a) * r);
          const sel = i === (st.sel || 0);
          mx.carve(x, y, sel ? 3.2 : 2.4); mx.disc(x, y, sel ? 2.2 : 1.5, KCOL[it.kind], 1);
          if (sel) g.brackets(x, y, 5 + (Math.floor(t / 450) % 2), C.hot, 1);
        });
        if (!st.fromGps) g.mini('MAP CTR', W - 2 - RX.font.measure('MAP CTR', 'mini'), 14, { c: C.amber, a: 0.9 });
      }
      // you, and which way you're facing
      mx.carve(cx, cy, 2.4); mx.disc(cx, cy, 1.4, C.hot, 1);
      if (A.gps && A.gps.heading != null) { const h = A.gps.heading * Math.PI / 180; for (let r = 3; r <= 6; r++) mx.set(cx + Math.round(Math.sin(h) * r), cy - Math.round(Math.cos(h) * r), C.hot, 0.9); }
      let y = cy + R + 4;
      // the kinds, with how many of each (tap one to show only those)
      if (st.res) {
        const chips = ['ALL'].concat(KINDS.filter(k => v.counts[k] > 0 || st.kind === k));
        let x = 1;
        chips.forEach(k => {
          const lab = k + ' ' + (v.counts[k] || 0), w = RX.font.measure(lab, 'mini') + 4;
          if (x + w > W) { x = 1; y += 9; }   // wraps to a second row
          const on = st.kind === k, col = k === 'ALL' ? C.ink : KCOL[k];
          if (on) mx.rect(x, y, w, 7, col, 0.85); else mx.frame(x, y, w, 7, col, 0.45);
          g.mini(lab, x + 2, y + 1, { c: on ? '#04120C' : col, a: on ? 1 : 0.9 });
          g.hit(x, y - 1, w, 9, () => { st.kind = on && k !== 'ALL' ? 'ALL' : k; st.sel = 0; st.scroll = 0; st.armed = null; st.pulse = now(); });
          x += w + 2;
        });
        y += 10;
      }
      // the nearest, nearest first
      const top = y;
      let ly = g.scrollBegin(top, fy);
      if (st.err && !st.res) { g.text(st.err, 2, ly + 2, { c: C.red }); g.mini('PRESS SCAN TO TRY AGAIN', 2, ly + 12); ly += 22; }
      else if (!st.res) { g.text(st.busy ? 'PINGING...' : 'PRESS SCAN', 2, ly + 2, { a: 0.6 }); ly += 12; }
      else if (!v.shown.length) { g.text('NOTHING NAMED IN ' + st.rFt + ' FT', 2, ly + 2, { a: 0.6 }); g.mini('ROLL THE DRUM FOR MORE RANGE', 2, ly + 12); ly += 22; }
      v.shown.forEach((it, i) => {
        // first tap picks it (brackets on the scope), a second tap on the same one marks it
        const sel = g.row(0, ly, W - 2, 9, () => { if (st.armed === it.id) markIt(st, A, it); else { st.armed = it.id; st.sel = i; st.jog = true; } });
        const had = alreadyMarked(it);
        mx.disc(4, ly + 4, 1.6, KCOL[it.kind], had ? 0.4 : 1);
        const right = Geo.fmtDist(it.m) + ' ' + Geo.cardinal(it.brg);
        const rw = RX.font.measure(right, 'mini');
        g.text(g.fit((had ? '✓ ' : '') + it.name, W - rw - 14), 9, ly + 1, { c: sel ? C.hot : C.ink, a: had ? 0.5 : 1 });
        g.miniR(right, W - 3, ly + 2, { a: 0.7 });
        ly += 9;
      });
      g.scrollEnd(ly);
      g.footer(A.sayActive() ? A.statusShown(g.t) : (st.res && v.shown.length ? 'PUSH ▸ MARK ' + (v.shown[st.sel || 0] || {}).name : 'DRUM ▸ RADIUS · SCAN ▸ SWEEP'));
    }
  };

  // ======================================================================
  // HERE · where you are, exactly
  // ======================================================================
  // Open Location Code (plus code), 10 digits ≈ 14 m
  function plusCode(lat, lng) {
    const AL = '23456789CFGHJMPQRVWX';
    let la = Math.floor((clamp(lat, -90, 90 - 1e-10) + 90) * 8000), lo = Math.floor((((lng + 180) % 360 + 360) % 360) * 8000);
    const d = [];
    for (let i = 0; i < 5; i++) { d.unshift(AL[lo % 20]); d.unshift(AL[la % 20]); la = Math.floor(la / 20); lo = Math.floor(lo / 20); }
    return d.slice(0, 8).join('') + '+' + d.slice(8).join('');
  }
  RX.aux.plusCode = plusCode;
  function dms(v, pos, neg) {
    const a = Math.abs(v), d = Math.floor(a), mf = (a - d) * 60, m = Math.floor(mf), s = (mf - m) * 60;
    return d + '°' + String(m).padStart(2, '0') + "'" + s.toFixed(1).padStart(4, '0') + '"' + (v >= 0 ? pos : neg);
  }
  async function elevation(lat, lng) {
    const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), 9000);
    try {
      const j = await (await fetch('https://api.open-meteo.com/v1/elevation?latitude=' + lat.toFixed(5) + '&longitude=' + lng.toFixed(5), { signal: ctl.signal })).json();
      const m = j && j.elevation && j.elevation[0]; return Number.isFinite(m) ? m : null;
    } catch (e) { return null; } finally { clearTimeout(tm); }
  }
  function look(st, A) {
    const fresh = A.gps && Date.now() - A.gps.ts < 60000;
    const f = fresh ? { lat: A.gps.lat, lng: A.gps.lng, acc: A.gps.acc, alt: A.gps.alt, ts: A.gps.ts, gps: true } : { lat: M.lat, lng: M.lng, acc: null, alt: null, ts: Date.now(), gps: false };
    const tok = st.tok = (st.tok || 0) + 1;
    st.fix = f; st.addr = null; st.elev = null; st.lot = null; st.busy = { addr: true, elev: true, lot: true };
    A.dirty = true; A.lcdDirty = true;
    const done = (k, v) => { if (st.tok !== tok) return; st[k] = v; st.busy[k] = false; A.dirty = true; A.lcdDirty = true; };
    Geo.reverse(f.lat, f.lng, 18).then(r => done('addr', r || false));
    elevation(f.lat, f.lng).then(m => done('elev', m == null ? false : m));
    if (RX.parcel) RX.parcel.at(f.lat, f.lng).then(p => done('lot', p || false)).catch(() => done('lot', false)); else done('lot', false);
    A.say(f.gps ? 'HERE ▸ FIX ±' + Math.round(f.acc) + ' M' : 'HERE ▸ NO GPS FIX · READING THE MAP CENTER', 3000); A.beep('here.fix');
  }
  function addrLines(st) {
    const a = st.addr; if (!a) return [];
    const l1 = ((a.house ? a.house + ' ' : '') + a.road).trim();
    const l2 = [a.town, [a.st, a.postcode].filter(Boolean).join(' ')].filter(Boolean).join(' ');
    return [l1 || a.area, l2].filter(Boolean);
  }
  function shareText(st) {
    const f = st.fix; if (!f) return '';
    const ll = f.lat.toFixed(5) + ', ' + f.lng.toFixed(5);
    return [ll, addrLines(st).join(', '), 'https://maps.apple.com/?ll=' + f.lat.toFixed(6) + ',' + f.lng.toFixed(6) + '&q=' + encodeURIComponent('Here')].filter(Boolean).join('\n');
  }
  async function copy(st, A) {
    const s = shareText(st); if (!s) return;
    try { await navigator.clipboard.writeText(s); A.say('COPIED ▸ COORDINATES + ADDRESS', 2500); A.beep('ok'); }
    catch (e) { A.say('COPY BLOCKED BY THE BROWSER', 2500); A.beep('err'); }
  }
  async function share(st, A) {
    const s = shareText(st); if (!s) return;
    if (navigator.share) { try { await navigator.share({ title: 'Here', text: s }); A.beep('ok'); } catch (e) { if (!e || e.name !== 'AbortError') copy(st, A); } }
    else copy(st, A);
  }
  function markHere(st, A) {
    const f = st.fix; if (!f) return;
    const lines = addrLines(st);
    A.home();
    A.follow(false); M.setView(f.lat, f.lng, Math.max(M.zoom, 17));
    A.dropAt(f.lat, f.lng, 'HERE', { name: lines[0] || '' });
  }

  RX.screens.here = {
    jogLabels: () => ['◂ UP', 'DOWN ▸', 'PUSH ▸ SELECT'],
    enter(st, params, A) { st.sel = 0; st.jog = false; X.setMode('here'); look(st, A); },
    resume() { X.setMode('here'); },
    leave(st) { st.tok = (st.tok || 0) + 1; X.setMode(null); },
    again(st, A) { look(st, A); },
    onMarkKey(st, A) { markHere(st, A); },
    lcd(st, A) {
      const f = st.fix; if (!f) return null;
      const L = addrLines(st);
      return { rows: [['LAT', (f.lat >= 0 ? 'N ' : 'S ') + Math.abs(f.lat).toFixed(5) + '°'], ['LNG', (f.lng >= 0 ? 'E ' : 'W ') + Math.abs(f.lng).toFixed(5) + '°'], ['ADDR', L[0] || (st.busy.addr ? 'READING...' : '--')]], tag: 'HRE' };
    },
    render(g, st, A) {
      const W = g.W, mx = g.mx, f = st.fix;
      g.header('HERE', f ? (f.gps ? 'FIX ' + Math.round(f.acc) + 'M · ' + F.hm(f.ts) : 'NO FIX · MAP CENTER') : '');
      if (!f) { g.footer(''); return; }
      const fy = g.H - 11;
      let y = g.scrollBegin(13, fy);
      // the coordinates, big
      const big = W >= 140 ? 2 : 1;
      const latS = (f.lat >= 0 ? 'N ' : 'S ') + Math.abs(f.lat).toFixed(5) + '°', lngS = (f.lng >= 0 ? 'E ' : 'W ') + Math.abs(f.lng).toFixed(5) + '°';
      g.text(latS, 2, y + 1, { s: big, c: C.hot }); y += 8 * big + 2;
      g.text(lngS, 2, y + 1, { s: big, c: C.hot }); y += 8 * big + 3;
      g.mini(dms(f.lat, 'N', 'S') + '  ' + dms(f.lng, 'E', 'W'), 2, y, { a: 0.7 }); y += 9;
      // the address
      const L = addrLines(st);
      if (L.length) L.forEach(l => { g.text(g.fit(l, W - 4), 2, y, { c: C.amber }); y += 9; });
      else { g.text(st.busy.addr ? 'READING THE ADDRESS...' : 'NO ADDRESS HERE', 2, y, { c: C.amber, a: 0.6 }); y += 9; }
      y += 3;
      // the details
      const row = (k, v, fn, o) => {
        o = o || {};
        const sel = fn ? g.row(0, y, W - 2, 10, fn) : false;
        g.mini(k, 3, y + 3, { a: 0.55 });
        g.text(g.fit(v, W - 40 - (o.go ? 8 : 0)), 34, y + 2, { c: sel ? C.hot : (o.c || C.ink), a: o.a == null ? 1 : o.a });
        if (o.go) g.textR('▸', W - 4, y + 2, { a: 0.6 });
        y += 10;
      };
      const nb = (() => { let best = null; S.pois.forEach(p => { const m = Geo.meters(f.lat, f.lng, p.lat, p.lng); if (!best || m < best.m) best = { p, m, b: Geo.bearing(f.lat, f.lng, p.lat, p.lng) }; }); return best; })();
      row('NEAR', nb ? S.markLabel(nb.p) + ' · ' + Geo.fmtDist(nb.m) + ' ' + Geo.cardinal(nb.b) : 'NO MARKS', nb ? () => A.openMark(nb.p.id) : null, { go: !!nb });
      row('COUNTY', st.addr ? (st.addr.county || '--') : (st.busy.addr ? '...' : '--'));
      row('ELEV', st.elev != null && st.elev !== false ? Math.round(st.elev * 3.28084) + ' FT' + (f.alt != null ? ' · GPS ' + Math.round(f.alt * 3.28084) + ' FT' : '') : (st.busy.elev ? '...' : (f.alt != null ? 'GPS ' + Math.round(f.alt * 3.28084) + ' FT' : '--')));
      row('PLUS', plusCode(f.lat, f.lng));
      const lot = st.lot;
      row('LOT', lot ? [lot.id ? 'ACCT ' + lot.id : null, RX.parcel.fmtAcres(lot.acres)].filter(Boolean).join(' · ') : (st.busy.lot ? '...' : 'NONE ON FILE'), lot ? () => A.go('lot', { lat: f.lat, lng: f.lng }) : null, { go: !!lot });
      y += 3;
      // what to do with it
      const bw = Math.floor((W - 8) / 3);
      g.btn(2, y, bw, 13, 'COPY', () => copy(st, A));
      g.btn(4 + bw, y, bw, 13, 'SHARE', () => share(st, A));
      g.btn(6 + bw * 2, y, W - 8 - bw * 2, 13, 'MARK', () => markHere(st, A), { c: C.amber });
      y += 16;
      g.scrollEnd(y);
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'HERE AGAIN ▸ NEW FIX · MARK ▸ DROP ONE');
    }
  };
})();
