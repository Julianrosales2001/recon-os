/* =============================================================
   RECON.OS RX-90 · AUX
   The screen block is a slider. Tap the grip on its lip (or drag
   it) and a latch lets go: a spring runs the panel up under the
   readout hood, its two steel runners riding down slots cut in the
   deck's walls, uncovering the AUX deck: two frosted tape keys and
   a compass between them. The keys were held flush by the panel;
   once its edge clears them they spring up and their lamps catch.
   Pull the grip down and the panel rides home, its lip pressing the
   keys back into their wells.
   REC     · records a track: red tape on the map, the LCD becomes a
             tape counter. REC again stops it and files it.
   COMPASS · tap the dial: heading, a bearing to hold, where you are.
   PARK    · saves where you left the car; the key becomes RETURN,
             which points you back. The drum (or a hold) clears it.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const S = RX.store, M = RX.map, U = RX.ui, Geo = RX.geo, C = U.C, F = U.F;
  const $ = id => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
  const ein = t => { t = clamp(t, 0, 1); return t * t * t; };
  const now = () => performance.now();
  const norm = a => ((a % 360) + 360) % 360;
  const wrap180 = a => ((a % 360) + 540) % 360 - 180;
  const deg = b => String(Math.round(norm(b)) % 360).padStart(3, '0') + '°';
  const card8 = b => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(norm(b) / 45) % 8];
  const RED = '#FF6B5E';

  // ======================================================================
  // HARDWARE
  // ======================================================================
  const STANDBY = 0.1;
  const FLICK = { rec: [0, .55, .05, .2, .7, .15, .45, .25], park: [0, .35, .1, .6, .05, .5, .3, .2] };   // the lamps catching
  const HIT = [1, .45, 1, .7, 1];                                                                         // a press landing
  const KEYS = ['rec', 'park'];
  const SRC = n => 'keys/aux/' + n + '.webp';
  const X = RX.aux = { open: false, y: 0 };
  let A = null, hooks = {}, T = 96, raf = 0, slide = null, drag = null, flashT = 0, gripDown = false;
  const el = {};
  const cap = {};
  KEYS.forEach(k => { cap[k] = { up: false, popT: -1e9, press: -1e9, g: 0, gl: null, d: -1, lit: -1, pop: 1, art: '' }; });

  X.recording = () => !!S.rec;
  X.parked = () => S.v2.park || null;
  const art = k => k === 'rec' ? 'rec' : (X.parked() ? 'ret' : 'park');
  const rest = k => (k === 'rec' && X.recording() ? 2 : 0);   // REC latches down while it records

  // the panel's travel is the deck's height (CSS sets it per screen size)
  function measure() { T = Math.round(el.deck.offsetHeight) || 96; }
  const CLEAR = () => T / 2 + 30;   // the panel's edge is past the caps
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
    // the runners hang off the panel's lower edge and ride the slots with it
    const top = T - y - 2, h = clamp(T - top, 0, 15);
    el.runners.forEach(r => { r.style.top = top.toFixed(2) + 'px'; r.style.height = h.toFixed(2) + 'px'; });
    // shut, the deck is covered: take it out of the picture. iPhone otherwise lets the keys and the turning compass
    // flicker through the screen (their layers get composited over the panel)
    const shut = y <= 0.01 && !slide && !drag;
    if (shut !== X.shut) { X.shut = shut; el.deck.classList.toggle('shut', shut); if (!shut) X.kickCmp(); }
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
  function glowTarget(k) { const c = cap[k]; if (!X.open || !c.up) return 0; return (k === 'rec' ? X.recording() : !!X.parked()) ? 1 : STANDBY; }
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
  // REC or PARK changed: the lamp lands on its new level (a hit when it comes on)
  function relamp(k) {
    const c = cap[k]; if (!c.up || !X.open) { kick(); return; }
    const to = glowTarget(k);
    if (to >= 1) glowSeq(k, HIT, 1, 40); else glowFade(k, to, 220);
  }

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
        const kk = t - c.popT; base = Math.max(kk < 75 ? 3 - Math.floor(kk / 25) : 0, rest(k));
        c.pop = kk >= 0 && kk < 200 ? 1 + 0.05 * Math.max(0, 1 - Math.abs(kk - 100) / 60) : 1;
        if (kk < 200) busy = true;
      } else {
        if (y <= ce && c.up) { c.up = false; c.gl = null; c.g = 0; }
        base = c.up ? Math.max(rest(k), Math.round(3 * clamp((cl - y) / (cl - ce), 0, 1))) : 3;
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
    const c = cap[k], b = el[k], a = art(k);
    if (c.d !== d || c.art !== a) { c.d = d; c.art = a; b.off.src = SRC(a + '-' + d); b.on.src = SRC(a + '-lit-' + d); }
    const g = +c.g.toFixed(3);
    if (c.lit !== g) { c.lit = g; b.on.style.opacity = g; b.halo.style.opacity = (Math.max(0, (g - 0.3) / 0.7) * 0.9).toFixed(3); }
    b.btn.style.transform = 'scale(' + ((1 - 0.012 * d) * c.pop).toFixed(4) + ') translateY(' + (0.5 * d).toFixed(2) + 'px)';
    const sh = Math.max(0.3, 3.5 - (flush ? 3 : d));
    b.btn.style.filter = 'brightness(' + (1 - 0.06 * d - (flush ? 0.12 : 0)).toFixed(3) + ') drop-shadow(0 ' + sh.toFixed(2) + 'px ' + sh.toFixed(2) + 'px rgba(0,0,0,.55))';
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
  // empty A2/A3: the latch click and a thud as the panel lands. Your sound there is the whole slide, from its first frame
  // A2/A3 of yours: the whole slide, from its start — unless the grip (A1) has a sound of yours,
  // then the grip sounds on the press and the slide's sound waits for the panel to land
  const slideAtStart = slot => RX.sfx.mine(slot) && !RX.sfx.mine('aux.latch');
  function runOpen(y0) {
    if (hooks.closeTray) hooks.closeTray();
    const mine = slideAtStart('aux.open'); if (mine) A.beep('aux.open');
    el.bar.setAttribute('aria-expanded', 'true');
    slide = { dir: 1, t0: now(), fn: reduced() ? () => [T, true] : openCurve(y0), done: () => {
      X.open = true; S.saveV2({ auxOpen: true }); relayout(true);
      KEYS.forEach(k => { if (cap[k].up && !cap[k].gl) glowFade(k, glowTarget(k), 120); });
      if (!mine) A.beep('aux.open', 0.6); A.dirty = true; X.kickCmp();
    } };
    kick();
  }
  function beginClose() {   // the moment the panel moves: lamps out, the picture back to the whole panel
    if (!X.open) return;
    X.open = false;
    KEYS.forEach(k => glowFade(k, 0, 120));
    relayout(false);
  }
  function runClose(y0) {
    beginClose();
    const mine = slideAtStart('aux.close'); if (mine) A.beep('aux.close');
    el.bar.setAttribute('aria-expanded', 'false');
    slide = { dir: -1, t0: now(), fn: reduced() ? () => [0, true] : closeCurve(y0), done: () => { S.saveV2({ auxOpen: false }); if (!mine) A.beep('aux.close', 0.8); A.dirty = true; } };
    kick();
  }
  X.toggle = function () {
    if (slide) return;
    A.wake();
    const closing = X.y > T / 2;
    if (!closing) HD.start();   // opening the deck is the moment to switch the compass on (iPhone asks once)
    if (RX.sfx.mine('aux.latch')) { if (!gripDown) A.beep('aux.latch'); gripDown = false; }   // yours: already played on the press (or now, from the P key)
    else if (!RX.sfx.mine(closing ? 'aux.close' : 'aux.open')) A.beep('aux.latch');
    if (closing) runClose(X.y); else runOpen(X.y);
  };
  X.openNow = function () { if (!X.open && !slide) runOpen(X.y); };
  const usable = () => X.open && !slide && !drag;

  // ---- the grip: tap = latch; drag = move it yourself (past halfway the spring takes it) ----
  function wireBar() {
    const b = el.bar;
    b.addEventListener('pointerdown', e => {
      e.preventDefault(); if (!A || !A.booted || slide) return;
      A.wake(); b.classList.add('down');
      // your grip sound (A1) plays the moment your finger goes down, tap or drag
      gripDown = RX.sfx.mine('aux.latch'); if (gripDown) A.beep('aux.latch');
      drag = { y0: X.y, sy: e.clientY, moved: 0, live: false, wasOpen: X.open };
      if (X.shut) { X.shut = false; el.deck.classList.remove('shut'); X.kickCmp(); }
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
      if (!drag.wasOpen && y > 0.5 * T) { drag = null; b.classList.remove('down'); HD.start(); runOpen(y); }
      else if (drag.wasOpen && y < 0.6 * T) { drag = null; b.classList.remove('down'); runClose(y); }
      kick();
    });
    const end = e => {
      if (!drag) return;
      const d = drag; drag = null; b.classList.remove('down');
      if (!d.live) { if (e.type === 'pointerup') X.toggle(); else applyY(X.y); return; }
      if (X.y > 0.5 * T) { HD.start(); runOpen(X.y); } else runClose(X.y);
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
    if (k === 'cmp') { cmpPress(); return; }
    HD.start();
    cap[k].press = now(); kick();
    if (k === 'rec') { if (X.recording()) X.recStop(); else X.recStart(); return; }
    // PARK, or RETURN once parked
    if (!X.parked()) X.parkHere();
    else if (A.top().name !== 'ret') { if (A.stack.length > 1) A.home(); A.go('ret'); A.beep('key'); }
    else { A.home(); A.beep('key'); }
  };
  function wireKeys() {
    el.rec.btn.addEventListener('pointerdown', e => { e.preventDefault(); if (usable()) { cap.rec.press = now(); kick(); } });
    el.rec.btn.addEventListener('click', e => { e.preventDefault(); if (usable()) { const t = cap.rec.press; X.key('rec'); cap.rec.press = t; } });
    // RETURN: tap = the way back; hold = clear the spot
    let holdT = 0, held = false;
    const pb = el.park.btn;
    pb.addEventListener('pointerdown', e => {
      e.preventDefault(); if (!usable()) return;
      cap.park.press = now(); kick(); held = false; clearTimeout(holdT);
      if (X.parked()) holdT = setTimeout(() => { held = true; cap.park.press = now(); kick(); X.parkClear('HOLD'); }, 700);
    });
    const up = () => clearTimeout(holdT);
    pb.addEventListener('pointerup', up); pb.addEventListener('pointercancel', up); pb.addEventListener('pointerleave', up);
    pb.addEventListener('click', e => { e.preventDefault(); if (held) { held = false; return; } if (usable()) { const t = cap.park.press; X.key('park'); cap.park.press = t; } });
    // the compass dial
    const cb = el.cmp.btn;
    cb.addEventListener('pointerdown', e => { e.preventDefault(); if (usable()) { cb.classList.add('down'); } });
    const cup = () => cb.classList.remove('down');
    cb.addEventListener('pointerup', cup); cb.addEventListener('pointercancel', cup); cb.addEventListener('pointerleave', cup);
    cb.addEventListener('click', e => { e.preventDefault(); X.key('cmp'); });
    // any tap on the deck can switch the compass on (iPhone wants a tap before it hands over the heading)
    el.deck.addEventListener('pointerup', () => HD.start());
  }

  X.wire = function (app, h) {
    A = app; hooks = h || {};
    el.bezel = $('bezel'); el.win = $('window'); el.screen = $('screen'); el.bar = $('auxBar'); el.deck = $('deck');
    el.hood = $('hood'); el.shadow = $('slabShadow');
    el.runners = [...el.deck.querySelectorAll('.runner')];
    KEYS.forEach(k => {
      const btn = $(k === 'rec' ? 'auxRec' : 'auxPark');
      el[k] = { btn, off: btn.querySelector('.off'), on: btn.querySelector('.on'), halo: btn.querySelector('.halo') };
    });
    const cb = $('auxCmp');
    el.cmp = { btn: cb, card: cb.querySelector('.cmp-card'), pip: cb.querySelector('.cmp-pip'), nd: cb.querySelector('.cmp-ndi') };
    // keep the art warm so the first press doesn't flash
    ['rec', 'park', 'ret'].forEach(k => [0, 1, 2, 3].forEach(d => { new Image().src = SRC(k + '-' + d); new Image().src = SRC(k + '-lit-' + d); }));
    measure();
    el.hood.style.top = el.bezel.offsetTop + 'px';
    wireBar(); wireKeys();
    if (S.v2.auxOpen) { applyY(T); X.open = true; el.bar.setAttribute('aria-expanded', 'true'); relayout(true); flashT = -1e9; }
    else applyY(0);
    paint(now());
    HD.auto();
    if (S.rec) lockOn();
    setInterval(meterCheck, 10000);
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
    X.kickCmp();
  };
  // a key asked for while the panel was shut: press it once the panel has settled
  setInterval(() => { if (X.pendingKey && usable()) { const k = X.pendingKey; X.pendingKey = null; X.key(k); } }, 120);

  // ======================================================================
  // COMPASS · where the phone points
  // iPhone: webkitCompassHeading, after a tap grants motion access. Android: deviceorientationabsolute.
  // No compass: the direction you're walking (GPS course) once you're moving.
  // ======================================================================
  const HD = X.hd = { mag: null, magT: 0, live: false, asked: false, denied: false, hold: null };
  const askFirst = () => !!(window.DeviceOrientationEvent && typeof window.DeviceOrientationEvent.requestPermission === 'function');
  function onOri(e) {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading) && e.webkitCompassHeading >= 0) h = e.webkitCompassHeading;
    else if (e.absolute && typeof e.alpha === 'number') h = 360 - e.alpha;
    if (h == null) return;
    const so = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (window.orientation || 0);
    HD.mag = norm(h + so); HD.magT = Date.now();
    X.kickCmp();
  }
  function listen() {
    if (HD.live) return; HD.live = true;
    if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', onOri);
    window.addEventListener('deviceorientation', onOri);
  }
  HD.start = function () {   // call from inside a tap
    if (HD.live || HD.denied) return;
    if (askFirst()) {
      if (HD.asked) return; HD.asked = true;
      try {
        window.DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') listen(); else HD.denied = true; if (A) A.dirty = true; })
          .catch(() => { HD.asked = false; });   // not a real tap: ask again on the next one
      } catch (e) { HD.asked = false; }
    } else if (window.DeviceOrientationEvent) listen();
  };
  HD.auto = function () { if (!askFirst()) HD.start(); };
  HD.heading = function () {
    if (HD.mag != null && Date.now() - HD.magT < 3000) return HD.mag;
    const g = A && A.gps;
    if (g && g.heading != null && g.speed > 0.8 && Date.now() - g.ts < 10000) return g.heading;
    return null;
  };
  HD.source = () => (HD.mag != null && Date.now() - HD.magT < 3000) ? 'COMPASS' : (HD.heading() != null ? 'GPS COURSE' : null);
  HD.status = () => HD.heading() != null ? HD.source() : HD.denied ? 'MOTION ACCESS OFF' : (askFirst() && !HD.live) ? 'TAP TO TURN ON' : 'WALK FOR A HEADING';

  // the dial on the deck: the card floats (it lags and settles like a liquid compass); in RETURN the needle swings to the car
  const CM = { card: 0, cv: 0, nd: 0, nv: 0, raf: 0, pipOn: null, shown: { card: null, nd: null, pip: null } };
  X.target = function () {
    const p = X.parked(), g = A && A.gps;
    if (!p || !g || !A.stack.length || A.top().name !== 'ret') return null;
    return Geo.bearing(g.lat, g.lng, p.lat, p.lng);
  };
  function cmpStep() {
    CM.raf = 0;
    if (X.shut) return;   // under the panel: nothing to turn (it catches up the moment the panel moves)
    const h = HD.heading(), hd = h == null ? 0 : h, tgt = X.target();
    const toCard = -hd, toNd = tgt != null ? tgt - hd : -hd;
    const sp = (cur, vel, to) => { const d = wrap180(to - cur); vel = vel * 0.8 + d * 0.05; return [cur + vel, vel, Math.abs(d) > 0.08 || Math.abs(vel) > 0.02]; };
    let m1, m2;
    [CM.card, CM.cv, m1] = sp(CM.card, CM.cv, toCard);
    [CM.nd, CM.nv, m2] = sp(CM.nd, CM.nv, toNd);
    const tc = CM.card.toFixed(1), tn = CM.nd.toFixed(1);
    if (el.cmp) {
      if (tc !== CM.shown.card) { CM.shown.card = tc; el.cmp.card.style.transform = 'scaleY(0.9272) rotate(' + tc + 'deg)'; }
      if (tn !== CM.shown.nd) { CM.shown.nd = tn; el.cmp.nd.style.transform = 'scaleY(0.9272) rotate(' + tn + 'deg)'; }
      const pipOn = tgt != null;
      if (pipOn !== CM.pipOn) { CM.pipOn = pipOn; el.cmp.pip.style.opacity = pipOn ? 1 : 0; }
      if (pipOn) { const tp = (tgt - hd + CM.card - toCard).toFixed(1); if (tp !== CM.shown.pip) { CM.shown.pip = tp; el.cmp.pip.style.transform = 'scaleY(0.9272) rotate(' + tp + 'deg)'; } }
    }
    if (m1 || m2) X.kickCmp();
  }
  X.kickCmp = () => { if (!CM.raf) CM.raf = requestAnimationFrame(cmpStep); };
  X.shownHeading = () => HD.heading() == null ? null : norm(-CM.card);
  function cmpPress() {
    HD.start(); A.beep('cmp');
    if (A.top().name === 'compass') { A.home(); return; }
    if (A.stack.length > 1) A.home();
    A.go('compass');
  }

  // ======================================================================
  // REC · a track you keep
  // ======================================================================
  const tNo = t => String(t.n || 0).padStart(4, '0');
  const tName = t => t.name || 'TRACK ' + tNo(t);
  const mmss = s => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), ss = s % 60; return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(ss).padStart(2, '0'); };
  const MI = 1609.344;
  X.tName = tName;
  let wake = null;
  async function lockOn() {   // the screen stays on while REC runs (iPhone stops the GPS when it locks)
    try { if (navigator.wakeLock && !wake && document.visibilityState === 'visible') { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => { wake = null; }); } } catch (e) { wake = null; }
  }
  function lockOff() { try { if (wake) wake.release(); } catch (e) {} wake = null; }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.rec) lockOn(); });

  X.recStart = function () {
    S.rec = { id: 'TRK-' + Date.now().toString(36).toUpperCase(), n: S.trackNo(), t0: Date.now(), m: 0, pts: [] };
    S.saveRec(true);
    if (A.gps && Date.now() - A.gps.ts < 30000) X.fix(A.gps);
    lockOn();
    A.beep('rec.on'); A.say('REC ▸ RECORDING TRACK ' + tNo(S.rec) + ' · REC AGAIN STOPS', 3500);
    relamp('rec'); if (A.updateLamps) A.updateLamps(); A.dirty = true; A.lcdDirty = true;
  };
  X.recStop = function () {
    const r = S.rec; if (!r) return;
    S.rec = null; S.saveRec(true); lockOff();
    relamp('rec'); if (A.updateLamps) A.updateLamps(); A.dirty = true; A.lcdDirty = true;
    if (r.pts.length < 2 || r.m < 20) { A.say('REC ▸ TOO SHORT · NOTHING SAVED', 3000); A.beep('err'); return; }
    const tr = { id: r.id, n: r.n, name: '', t0: r.t0, t1: Date.now(), m: Math.round(r.m), pts: r.pts, from: null, to: null };
    S.tracks.push(tr); S.saveTracks();
    const st = X.stats(tr);
    S.log('track', null, tName(tr) + ' · ' + st.mi.toFixed(2) + ' MI · ' + mmss(st.ms / 1000));
    S.journal[S.journal.length - 1].trackId = tr.id; S.saveJournal();
    A.beep('rec.off');
    if (A.stack.length > 1) A.home();
    A.go('track', { id: tr.id });
    // the street names at either end, when the lookup answers
    const a = tr.pts[0], b = tr.pts[tr.pts.length - 1];
    Promise.all([Geo.reverse(a[0], a[1], 17), Geo.reverse(b[0], b[1], 17)]).then(([ra, rb]) => {
      tr.from = road(ra); tr.to = road(rb); S.saveTracks(); A.dirty = true;
    }).catch(() => {});
  };
  // every GPS fix: while REC runs, a point when you've really moved
  X.fix = function (g) {
    const r = S.rec; if (!r || !g) return;
    if (g.acc > 35) return;
    const t = Math.max(0, Math.round((g.ts - r.t0) / 1000)), last = r.pts[r.pts.length - 1];
    if (last) {
      const d = Geo.meters(last[0], last[1], g.lat, g.lng);
      if (d < Math.max(4, g.acc * 0.5)) return;
      if (d > 300 && t - last[2] < 10) return;   // a jump, not a walk
      r.m += d;
    }
    r.pts.push([+g.lat.toFixed(6), +g.lng.toFixed(6), t, g.alt == null ? null : Math.round(g.alt * 10) / 10, g.speed == null ? null : Math.round(g.speed * 10) / 10]);
    S.saveRec();
    A.lcdDirty = true;
  };
  X.stats = function (tr) {
    const live = !tr.t1, ms = (live ? Date.now() : tr.t1) - tr.t0, mi = (tr.m || 0) / MI, P = tr.pts;
    // top speed: the best 20 s stretch (single fixes are too noisy)
    let top = 0;
    for (let i = 0, j = 0; j < P.length; j++) {
      while (P[j][2] - P[i][2] > 20 && i < j) i++;
      let dd = 0; for (let k = i + 1; k <= j; k++) dd += Geo.meters(P[k - 1][0], P[k - 1][1], P[k][0], P[k][1]);
      const dt = P[j][2] - P[i][2]; if (dt >= 10) top = Math.max(top, dd / dt);
    }
    // climb: rises of more than 3 m only, so GPS altitude noise doesn't add up
    let climb = 0, ref = null, high = null;
    P.forEach(p => { const a = p[3]; if (a == null) return; high = high == null ? a : Math.max(high, a); if (ref == null) { ref = a; return; } if (a > ref + 3) { climb += a - ref; ref = a; } else if (a < ref) ref = a; });
    return { ms, mi, pace: mi > 0.01 ? ms / 60000 / mi : null, mph: ms > 0 ? mi / (ms / 3600000) : 0, top: top * 2.23694, climb: high == null ? null : climb * 3.28084, high: high == null ? null : high * 3.28084 };
  };
  const road = r => !r ? null : ((r.house ? r.house + ' ' : '') + (r.road || '')).trim() || r.area || null;
  X.road = road;
  // a track on the map: fit it to the screen
  X.showTrack = function (id) {
    const tr = S.track(id); if (!tr || !tr.pts.length) return;
    A.home(); A.showTrack = id;
    let la0 = 90, la1 = -90, ln0 = 180, ln1 = -180;
    tr.pts.forEach(p => { la0 = Math.min(la0, p[0]); la1 = Math.max(la1, p[0]); ln0 = Math.min(ln0, p[1]); ln1 = Math.max(ln1, p[1]); });
    const lat = (la0 + la1) / 2, lng = (ln0 + ln1) / 2, v = A.view();
    const spanM = Math.max(Geo.meters(la0, lng, la1, lng) / Math.max(1, v.rows - 40), Geo.meters(lat, ln0, lat, ln1) / Math.max(1, v.cols - 16), 0.5);
    const z = Math.log2(156543.03392 * Math.cos(lat * Math.PI / 180) * v.pitch / spanM);
    A.follow(false); M.setView(lat, lng, clamp(Math.floor(z * 2) / 2, 3, 18));
    A.say(tName(tr) + ' ▸ ON THE MAP · BACK HIDES IT', 3500); A.dirty = true;
  };

  // ======================================================================
  // PARK / RETURN
  // ======================================================================
  const METERS = [0, 15, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720];   // minutes
  const parkSave = () => S.saveV2({ park: S.v2.park });
  X.parkHere = function () {
    const g = A.gps;
    if (!g || Date.now() - g.ts > 60000) { A.say('PARK ▸ NO GPS FIX YET · TRY AGAIN IN A MOMENT', 3000); A.beep('err'); return; }
    const p = { lat: +g.lat.toFixed(6), lng: +g.lng.toFixed(6), acc: Math.round(g.acc), ts: Date.now(), addr: null, meter: null, away: false, back: false };
    S.saveV2({ park: p });
    A.parkBanner = { until: Date.now() + 9000 };
    if (A.stack.length > 1) A.home();
    A.beep('park.set'); A.say('PARKED ▸ ' + F.hm(p.ts) + ' · RETURN FINDS IT', 3000);
    relamp('park'); A.dirty = true; A.lcdDirty = true;
    Geo.reverse(p.lat, p.lng, 18).then(r => { const q = S.v2.park; if (q && q.ts === p.ts && r) { q.addr = road(r); parkSave(); A.dirty = true; A.lcdDirty = true; } }).catch(() => {});
  };
  X.parkClear = function (how) {
    if (!X.parked()) return;
    S.saveV2({ park: null }); A.parkBanner = null;
    A.beep('park.clear'); A.say('PARK ▸ SPOT CLEARED' + (how === 'HOLD' ? ' · KEY HELD' : ''), 2500);
    if (A.stack.length > 1 && A.top().name === 'ret') A.back();
    relamp('park'); X.kickCmp(); A.dirty = true; A.lcdDirty = true;
  };
  const meterLeft = p => p && p.meter ? Math.max(0, p.meter - Date.now()) : null;
  const fmtMeter = ms => { const m = Math.ceil(ms / 60000); return Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0'); };
  X.meterText = () => { const l = meterLeft(X.parked()); return l == null ? 'NO METER' : l <= 0 ? 'EXPIRED' : fmtMeter(l); };
  X.meterStep = function (d) {
    const p = X.parked(); if (!p) return;
    const left = meterLeft(p) == null ? 0 : Math.ceil(meterLeft(p) / 60000);
    let next = d > 0 ? METERS.find(m => m > left) : [...METERS].reverse().find(m => m < left);
    if (next == null) next = d > 0 ? METERS[METERS.length - 1] : 0;
    p.meter = next ? Date.now() + next * 60000 : null; p.w5 = p.w0 = false; parkSave();
    A.say(next ? 'METER ▸ ' + fmtMeter(next * 60000) + ' · ENDS ' + F.hm(p.meter) : 'METER ▸ OFF', 1800);
    A.lcdDirty = true; A.dirty = true;
  };
  function meterCheck() {
    const p = X.parked(); if (!p || !A) return;
    const l = meterLeft(p);
    if (l != null) {
      if (l <= 0 && !p.w0) { p.w0 = p.w5 = true; parkSave(); A.say('METER ▸ TIME IS UP', 8000); A.beep('meter'); }
      else if (l > 0 && l <= 300000 && !p.w5) { p.w5 = true; parkSave(); A.say('METER ▸ ' + Math.ceil(l / 60000) + ' MIN LEFT', 6000); A.beep('meter'); }
    }
    // walked away, then came back: offer to clear it
    const g = A.gps; if (!g || Date.now() - g.ts > 60000) return;
    const m = Geo.meters(g.lat, g.lng, p.lat, p.lng);
    if (m > 60 && !p.away) { p.away = true; parkSave(); }
    if (p.away && !p.back && m <= arriveM(g)) { p.back = true; parkSave(); A.say('BACK AT YOUR CAR ▸ RETURN, THEN DRUM TO CLEAR', 5000); A.beep('park.back'); }
  }
  const arriveM = g => clamp(g ? g.acc : 15, 15, 40);

  // ======================================================================
  // ON THE MAP
  // ======================================================================
  function drawTape(g, v, pts, col, a) {
    if (!pts || pts.length < 2) return;
    const mx = g.mx, W = g.W, H = g.H, P = pts.map(p => M.latLngToDot(p[0], p[1], v));
    const walk = fn => { for (let i = 1; i < P.length; i++) { const p0 = P[i - 1], p1 = P[i];
      if ((p0.x < -4 && p1.x < -4) || (p0.x > W + 4 && p1.x > W + 4) || (p0.y < -4 && p1.y < -4) || (p0.y > H + 4 && p1.y > H + 4)) continue;
      const n = Math.max(1, Math.ceil(Math.hypot(p1.x - p0.x, p1.y - p0.y) * 2)); for (let k = 0; k <= n; k++) fn(Math.floor(p0.x + (p1.x - p0.x) * k / n), Math.floor(p0.y + (p1.y - p0.y) * k / n)); } };
    walk((x, y) => { for (let j = -2; j <= 2; j++) for (let i = -2; i <= 3; i++) mx.off(x + i, y + j); });   // a dark keyline so it reads over streets
    walk((x, y) => { mx.set(x, y, col, a); mx.set(x + 1, y, col, a); mx.set(x, y + 1, col, a * 0.8); mx.set(x + 1, y + 1, col, a * 0.8); });
    const s = P[0]; mx.carve(Math.floor(s.x), Math.floor(s.y), 3); mx.ring(Math.floor(s.x), Math.floor(s.y), 2, col, 1);
  }
  // under the marks: the track being recorded, and a saved one you asked to see
  X.drawUnder = function (g, A, v) {
    if (A.showTrack) { const tr = S.track(A.showTrack); if (tr) { drawTape(g, v, tr.pts, RED, 0.85); const e = tr.pts[tr.pts.length - 1], d = M.latLngToDot(e[0], e[1], v); g.mx.carve(Math.floor(d.x), Math.floor(d.y), 2.6); g.mx.disc(Math.floor(d.x), Math.floor(d.y), 1.6, RED, 1); } else A.showTrack = null; }
    if (S.rec) drawTape(g, v, S.rec.pts, RED, 1);
  };
  // over the marks: where the car is
  X.drawOver = function (g, A, v, o) {
    const p = X.parked(); if (!p) return;
    const d = M.latLngToDot(p.lat, p.lng, v), x = Math.floor(d.x), y = Math.floor(d.y);
    if (x < -8 || y < -8 || x > g.W + 8 || y > g.H + 8) return;
    g.kindPin(x, y, 'PARKING', C.amber, { r: 6 });
    if (!o || !o.noHits) g.hit(x - 7, y - 7, 15, 15, () => { if (A.stack.length > 1) A.home(); A.go('ret'); });
  };
  const bannerUp = A => A.parkBanner && Date.now() < A.parkBanner.until && X.parked();
  // the top-left chip while REC runs
  X.mapChip = function (g, A) {
    if (!S.rec) return;
    const mx = g.mx, st = X.stats(S.rec), label = 'REC ' + mmss(st.ms / 1000) + ' · ' + st.mi.toFixed(2) + ' MI', w = RX.font.measure(label) + 14;
    mx.clearRect(1, 13, w + 2, 12); mx.frame(1, 13, w + 2, 12, RED, 1);
    mx.disc(7, 18, 2.2, RED, Math.floor(g.t / 600) % 2 ? 1 : 0.35); g.text(label, 12, 15, { c: '#FFD9D4' });
  };
  X.mapBanner = function (g, A, fy) {
    if (!bannerUp(A)) return false;
    const p = X.parked(), mx = g.mx, bx = 4, bw = g.W - 8, bh = 33, by = fy - 12 - bh;
    mx.clearRect(bx, by, bw, bh); mx.frame(bx, by, bw, bh, C.amber, 1);
    g.kindPin(bx + 8, by + 8, 'PARKING', C.amber, { r: 5 });
    g.text('PARKED ▸ ' + F.hm(p.ts), bx + 16, by + 4, { c: C.hot });
    g.mini(g.fit(p.addr || 'READING THE ADDRESS...', bw - 10, 'mini'), bx + 4, by + 15, { a: 0.9 });
    g.mini(p.meter ? 'METER ' + X.meterText() + ' · ENDS ' + F.hm(p.meter) : 'RETURN ▸ FIND IT · JOG ▸ METER TIMER', bx + 4, by + 24, { c: C.amber, a: 0.95 });
    return true;
  };
  X.mapLabels = A => bannerUp(A) ? ['◂ LESS', 'MORE ▸', 'METER TIMER · PUSH ▸ DONE'] : null;
  X.mapJogVal = A => bannerUp(A) ? X.meterText() : null;
  X.mapJog = function (d, A) { if (!bannerUp(A)) return false; X.meterStep(d); A.parkBanner.until = Date.now() + 9000; return true; };
  X.mapPush = function (A) { if (!bannerUp(A)) return false; A.parkBanner = null; A.dirty = true; return true; };
  X.mapBack = function (A) {
    if (bannerUp(A)) { A.parkBanner = null; return true; }
    if (A.showTrack) { A.showTrack = null; A.say('TRACK HIDDEN', 1500); return true; }
    return false;
  };
  X.mapLcd = function (A) {
    if (S.rec) { const st = X.stats(S.rec); return { rows: [['REC', mmss(st.ms / 1000)], ['DIST', st.mi.toFixed(2) + ' MI'], ['PACE', st.pace ? mmss(st.pace * 60) + ' /MI' : '--']], tag: 'REC' }; }
    if (bannerUp(A)) { const p = X.parked(); return { rows: [['PARK', F.hm(p.ts)], ['SPOT', p.addr || '...'], ['METER', X.meterText()]], tag: 'PRK' }; }
    return null;
  };
  // the rotating status line
  X.status = function (A) {
    const out = [];
    if (S.rec) { const st = X.stats(S.rec); out.push('REC ▸ ' + mmss(st.ms / 1000) + ' · ' + st.mi.toFixed(2) + ' MI'); }
    const p = X.parked(), g = A.gps;
    if (p && g) { const m = Geo.meters(g.lat, g.lng, p.lat, p.lng); out.push('CAR ▸ ' + Geo.fmtDist(m) + ' ' + Geo.cardinal(Geo.bearing(g.lat, g.lng, p.lat, p.lng)) + (p.meter ? ' · METER ' + X.meterText() : '')); }
    return out;
  };

  // ======================================================================
  // SCREENS
  // ======================================================================
  function fillPoly(mx, pts, c, a) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      let ins = false; const px = x + 0.5, py = y + 0.5;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) ins = !ins; }
      if (ins) mx.set(x, y, c, a);
    }
  }
  const rot = (pts, th, cx, cy, s) => pts.map(([x, y]) => [cx + s * (x * Math.cos(th) - y * Math.sin(th)), cy + s * (x * Math.sin(th) + y * Math.cos(th))]);
  const ARROW = [[0, -1], [0.66, -0.12], [0.25, -0.12], [0.25, 0.92], [-0.25, 0.92], [-0.25, -0.12], [-0.66, -0.12]];
  const lubber = (mx, cx, cy, R) => fillPoly(mx, [[cx - 3, cy - R - 6], [cx + 4, cy - R - 6], [cx + 0.5, cy - R - 1]], C.hot, 1);
  const fresh = g => g && Date.now() - g.ts < 60000;
  async function copy(s, what) {
    try { await navigator.clipboard.writeText(s); A.say('COPIED ▸ ' + what, 2500); A.beep('ok'); }
    catch (e) { A.say('COPY BLOCKED BY THE BROWSER', 2500); A.beep('err'); }
  }

  // ---------------------------------------------------------------- COMPASS
  function rose(g, cx, cy, R, hd, o) {
    const mx = g.mx; o = o || {};
    mx.ring(cx, cy, R, C.ink, 0.35);
    for (let a = 0; a < 360; a += 10) {
      const th = (a - hd) * Math.PI / 180, big = a % 30 === 0, L = big ? 5 : 2, sx = Math.sin(th), sy = -Math.cos(th);
      for (let r = R - L; r <= R - 1; r++) mx.set(Math.round(cx + sx * r), Math.round(cy + sy * r), a === 0 ? C.amber : C.ink, big ? 1 : 0.6);
    }
    [['N', 0], ['E', 90], ['S', 180], ['W', 270]].forEach(([L, a]) => { const th = (a - hd) * Math.PI / 180, r = R - 11;
      mx.textC(L, Math.round(cx + Math.sin(th) * r), Math.round(cy - Math.cos(th) * r) - 3, { c: L === 'N' ? C.amber : C.ink, a: o.dim ? 0.45 : 1 }); });
    if (o.target != null) {   // the bearing you hold (or are choosing): a dashed line out to an amber pointer on the ring
      const th = (o.target - hd) * Math.PI / 180, sx = Math.sin(th), sy = -Math.cos(th);
      mx.line(cx, cy, Math.round(cx + sx * (R - 7)), Math.round(cy + sy * (R - 7)), C.amber, o.picking ? 0.6 : 0.9, 2);
      fillPoly(mx, rot([[0, -1], [0.7, 0.4], [-0.7, 0.4]], th, cx + sx * (R + 3), cy + sy * (R + 3), 3.4), C.amber, o.picking && Math.floor(g.t / 400) % 2 ? 0.4 : 1);
    }
    lubber(mx, cx, cy, R);
    mx.vline(cx, cy - R + 1, 6, C.hot, 0.9);
    mx.disc(cx, cy, 1.5, C.hot, 1);
  }
  RX.screens.compass = {
    animating: () => true,
    jogLabels: () => HD.hold != null ? ['◂ -1°', '+1° ▸', 'PUSH ▸ LET GO'] : ['◂ BEARING', 'BEARING ▸', 'PUSH ▸ HOLD IT'],
    enter(st) { st.pick = null; X.kickCmp(); },
    jog(d, st, A) {
      if (HD.hold != null) { HD.hold = norm(HD.hold + d); return; }
      const h = X.shownHeading(), base = st.pick != null ? st.pick : Math.round((h || 0) / 5) * 5;
      st.pick = norm(base + d * 5);
    },
    push(st, A) {
      if (HD.hold != null) { HD.hold = null; st.pick = null; A.say('COMPASS ▸ LET GO', 1500); A.beep('key'); return; }
      const h = X.shownHeading();
      if (st.pick == null && h == null) { HD.start(); A.say('COMPASS ▸ ' + HD.status(), 2000); A.beep('err'); return; }
      HD.hold = Math.round(st.pick != null ? st.pick : h); st.pick = null;
      A.say('COMPASS ▸ HOLDING ' + deg(HD.hold) + ' ' + card8(HD.hold), 2500); A.beep('ok');
    },
    lcd: () => { const h = X.shownHeading(), g = A.gps; return { rows: [['HDG', h == null ? '--' : deg(h) + ' ' + card8(h)], ['HOLD', HD.hold != null ? deg(HD.hold) + ' ' + card8(HD.hold) : '--'], ['FIX', g ? '±' + Math.round(g.acc) + ' M' : '--']], tag: 'CMP' }; },
    render(g, st, A) {
      X.kickCmp();
      const W = g.W, mx = g.mx, h = X.shownHeading(), hd = h == null ? 0 : h, R = clamp(Math.floor((W - 80) / 2), 30, 41), cx = R + 6, cy = 14 + R + 9;
      const gp = A.gps;
      document.getElementById('jogVal').textContent = HD.hold != null ? deg(HD.hold) : st.pick != null ? deg(st.pick) : h != null ? deg(h) : '---°';
      g.header('COMPASS', h == null ? HD.status() : HD.source() + (gp ? ' · ±' + Math.round(gp.acc) + ' M' : ''));
      const tgt = HD.hold != null ? HD.hold : st.pick;
      rose(g, cx, cy, R, hd, { target: tgt, picking: HD.hold == null && st.pick != null, dim: h == null });
      g.hit(cx - R, cy - R, 2 * R, 2 * R, () => HD.start());
      const rx = cx + R + 8;
      g.mini('HEADING', rx, 16, { a: 0.6 });
      g.text(h == null ? '---°' : deg(h), rx, 23, { s: 2, c: h == null ? C.ink : C.hot, a: h == null ? 0.5 : 1 });
      if (h != null) g.text(card8(h), rx, 41, { s: 2 });
      else { const msg = U.wrap(HD.status(), Math.max(6, Math.floor((W - rx) / 4))); msg.forEach((l, i) => g.mini(l, rx, 42 + i * 7, { c: C.amber, a: 0.9 })); }
      let y = 60;
      if (HD.hold != null) {
        g.mini('HOLDING', rx, y, { a: 0.6 }); g.text(deg(HD.hold) + ' ' + card8(HD.hold), rx, y + 7, { c: C.amber });
        if (h != null) { const off = wrap180(HD.hold - h); g.text(Math.abs(off) <= 3 ? 'ON COURSE ✓' : (off > 0 ? 'TURN ' + Math.abs(Math.round(off)) + '° ▸' : '◂ TURN ' + Math.abs(Math.round(off)) + '°'), rx, y + 17, { c: C.hot }); }
      } else if (st.pick != null) {
        g.mini('PUSH TO HOLD', rx, y, { a: 0.6 }); g.text(deg(st.pick) + ' ' + card8(st.pick), rx, y + 7, { c: C.amber });
      } else { g.mini('HOLD A BEARING', rx, y, { a: 0.6 }); g.text('JOG ▸ PICK', rx, y + 7, { a: 0.5 }); }
      y = cy + R + 7;
      const row = (k, v, o, fn) => {
        o = o || {};
        const sel = fn ? g.row(0, y, W - 2, 10, fn) : false;
        g.mini(k, 3, y + 3, { a: 0.55 }); g.text(g.fit(v, W - 40 - (fn ? 8 : 0)), 34, y + 2, { c: sel ? C.hot : (o.c || C.ink), a: o.a || 1 });
        if (fn) g.textR('▸', W - 4, y + 2, { a: 0.6 });
        y += 10;
      };
      const p = X.parked();
      if (p && fresh(gp)) { const b = Geo.bearing(gp.lat, gp.lng, p.lat, p.lng); row('CAR', Geo.fmtDist(Geo.meters(gp.lat, gp.lng, p.lat, p.lng)) + ' · ' + deg(b) + ' ' + card8(b), { c: C.amber }, () => { A.home(); A.go('ret'); }); }
      else row('CAR', p ? 'PARKED · NO FIX' : 'NOT PARKED', { a: 0.5 });
      if (gp) {
        const ll = (gp.lat >= 0 ? 'N' : 'S') + Math.abs(gp.lat).toFixed(5) + ' ' + (gp.lng >= 0 ? 'E' : 'W') + Math.abs(gp.lng).toFixed(5);
        row('HERE', ll, null, () => copy(gp.lat.toFixed(6) + ', ' + gp.lng.toFixed(6), 'COORDINATES'));
        row('ELEV', gp.alt != null ? Math.round(gp.alt * 3.28084) + ' FT · GPS' : '--');
      } else row('HERE', 'NO GPS FIX', { a: 0.5 });
      g.footer(A.sayActive() ? A.statusShown(g.t) : (HD.hold != null ? 'PUSH ▸ LET GO' : st.pick != null ? 'PUSH ▸ HOLD ' + deg(st.pick) : 'JOG ▸ PICK A BEARING'));
    }
  };

  // ---------------------------------------------------------------- RETURN
  RX.screens.ret = {
    drum: ['back', 'clear'],   // roll it to CLEAR and press: no clearing the spot by a habit of pressing BACK
    animating: () => true,
    jogLabels: (st, A) => ['◂ METER', 'METER ▸', RX.screens.ret.arrived(A) ? 'PUSH ▸ CLEAR IT' : 'PUSH ▸ WALKING DIRECTIONS'],
    arrived(A) { const p = X.parked(), g = A.gps; return !!(p && fresh(g) && Geo.meters(g.lat, g.lng, p.lat, p.lng) <= arriveM(g)); },
    enter(st, params, A) { if (!X.parked()) { setTimeout(() => A.back(), 0); return; } HD.start(); X.kickCmp(); },
    resume() { X.kickCmp(); },
    leave() { setTimeout(() => X.kickCmp(), 0); },
    drumPress(st, A) { if (st.page !== 'clear') return false; X.parkClear('DRUM'); return true; },
    jog(d, st, A) { X.meterStep(d); },
    push(st, A) { if (this.arrived(A)) X.parkClear(); else directions(); },
    lcd: () => {
      const p = X.parked(), g = A.gps; if (!p) return null;
      if (!fresh(g)) return { rows: [['CAR', 'NO GPS FIX'], ['PARKED', F.ago(p.ts)], ['METER', X.meterText()]], tag: 'RTN' };
      const m = Geo.meters(g.lat, g.lng, p.lat, p.lng);
      return { rows: [['CAR', m <= arriveM(g) ? 'YOU ARE HERE' : Geo.fmtDist(m) + ' ' + Geo.cardinal(Geo.bearing(g.lat, g.lng, p.lat, p.lng))], ['WALK', Math.max(1, Math.round(m / 80)) + ' MIN'], ['METER', X.meterText()]], tag: 'RTN' };
    },
    render(g, st, A) {
      X.kickCmp();
      const p = X.parked(); if (!p) { g.header('RETURN'); g.footer('NOT PARKED'); return; }
      const W = g.W, mx = g.mx, t = g.t, R = clamp(Math.floor((W - 80) / 2), 30, 40), cx = R + 6, cy = 14 + R + 9;
      const gp = A.gps, ok = fresh(gp), arrived = this.arrived(A);
      // back at the car: the drum rolls itself round to CLEAR, ready for a press
      if (arrived && !st.rolled) { st.rolled = true; if ((st.page || 'back') !== 'clear') setTimeout(() => { if (A.top().st === st) A.drumRoll(-1, true); }, 0); }
      const m = ok ? Geo.meters(gp.lat, gp.lng, p.lat, p.lng) : null, brg = ok ? Geo.bearing(gp.lat, gp.lng, p.lat, p.lng) : null;
      const h = X.shownHeading();
      document.getElementById('jogVal').textContent = X.meterText();
      g.header('RETURN', 'PARKED ' + F.hm(p.ts), { c: C.amber });
      mx.ring(cx, cy, R, C.amber, 0.3, 2);
      if (arrived) {
        const k = Math.floor(t / 500) % 2; mx.ring(cx, cy, R - 8 + k * 2, C.amber, 0.8);
        mx.carve(cx, cy, 18); mx.disc(cx, cy, 17, C.amber, 1); mx.text('P', cx - 7, cy - 10, { s: 3, punch: true });
      } else if (ok) {
        // no compass: the arrow is drawn north-up, and says so
        const th = (brg - (h == null ? 0 : h)) * Math.PI / 180;
        fillPoly(mx, rot(ARROW, th, cx, cy, R - 6), C.amber, 1);
        const tn = -(h == null ? 0 : h) * Math.PI / 180; mx.textC('N', Math.round(cx + Math.sin(tn) * R), Math.round(cy - Math.cos(tn) * R) - 3, { c: C.ink, a: 0.9 });
        lubber(mx, cx, cy, R);
      } else { g.textC('NO FIX', cx, cy - 3, { a: 0.6 }); }
      const rx = cx + R + 9;
      if (arrived) {
        g.mini("YOU'RE AT", rx, 16, { a: 0.6 });
        g.text('YOUR', rx, 24, { s: 2, c: C.hot }); g.text('CAR', rx, 41, { s: 2, c: C.hot });
        g.text('WITHIN ' + Math.round(m) + ' M', rx, 60, { c: C.amber });
      } else if (ok) {
        g.mini('TO YOUR CAR', rx, 16, { a: 0.6 });
        const mi = m / MI, big = mi >= 0.1 ? (mi >= 10 ? mi.toFixed(0) : mi.toFixed(2)) : String(Math.round(m * 3.28084)), unit = mi >= 0.1 ? 'MI' : 'FT';
        const w = g.text(big, rx, 23, { s: 2, c: C.hot }); g.text(unit, rx + w + 2, 30, { a: 0.8 });
        g.text(deg(brg) + ' ' + card8(brg), rx, 41, { c: C.amber });
        g.text(Math.max(1, Math.round(m / 80)) + ' MIN WALK', rx, 51, { a: 0.9 });
        if (h != null) { const off = wrap180(brg - h); g.mini(off < -20 ? 'BEAR LEFT' : off > 20 ? 'BEAR RIGHT' : Math.abs(off) > 150 ? 'TURN AROUND' : 'STRAIGHT ON', rx, 62, { c: C.hot, a: 0.95 }); }
        else g.mini('NO COMPASS · N IS UP', rx, 62, { c: C.amber, a: 0.9 });
      } else { g.mini('WAITING FOR GPS', rx, 16, { c: C.amber }); }
      let y = cy + R + 7;
      const row = (k, v, o) => { g.mini(k, 3, y + 3, { a: 0.55 }); g.text(g.fit(v, W - 40), 34, y + 2, { c: (o && o.c) || C.ink }); y += 10; };
      row('SPOT', p.addr || (Math.abs(p.lat).toFixed(5) + ' ' + Math.abs(p.lng).toFixed(5)));
      row('PARKED', F.hm(p.ts) + ' · ' + F.ago(p.ts));
      // the meter, if you set one: a bar that runs down
      g.mini('METER', 3, y + 3, { a: 0.55 });
      const left = meterLeft(p);
      if (left == null) g.text('NONE · JOG SETS ONE', 34, y + 2, { a: 0.5 });
      else {
        const tot = Math.max(left, (p.meter - p.ts)), low = left <= 300000, col = low ? RED : C.amber, bw = W - 40 - 30;
        mx.frame(34, y + 2, bw, 7, col, 0.8); mx.rect(35, y + 3, Math.round((bw - 2) * left / Math.max(1, tot)), 5, col, 0.85);
        g.textR(left <= 0 ? 'UP' : fmtMeter(left), W - 3, y + 2, { c: col });
      }
      y += 12;
      const b2 = Math.floor((W - 6) / 2);
      if (arrived) { g.btn(2, y, b2, 13, 'CLEAR', () => X.parkClear(), { c: C.amber, on: true }); g.btn(4 + b2, y, W - 6 - b2, 13, 'KEEP IT', () => A.home()); }
      else { g.btn(2, y, b2, 13, 'DIRECTIONS', directions); g.btn(4 + b2, y, W - 6 - b2, 13, 'SHOW MAP', () => showCar(A)); }
      g.footer(A.sayActive() ? A.statusShown(g.t) : (st.page === 'clear' ? 'PRESS THE DRUM ▸ CLEAR IT' : 'ROLL THE DRUM ▸ CLEAR'));
    }
  };
  function directions() {
    const p = X.parked(); if (!p) return;
    A.beep('key');
    window.open('https://maps.apple.com/?daddr=' + p.lat.toFixed(6) + ',' + p.lng.toFixed(6) + '&dirflg=w', '_blank');
  }
  function showCar(A) {
    const p = X.parked(); if (!p) return;
    A.home(); A.follow(false);
    const g = A.gps;
    if (fresh(g)) {
      const lat = (g.lat + p.lat) / 2, lng = (g.lng + p.lng) / 2, v = A.view();
      const spanM = Math.max(Geo.meters(g.lat, lng, p.lat, lng) / Math.max(1, v.rows - 40), Geo.meters(lat, g.lng, lat, p.lng) / Math.max(1, v.cols - 16), 0.5);
      M.setView(lat, lng, clamp(Math.floor(Math.log2(156543.03392 * Math.cos(lat * Math.PI / 180) * v.pitch / spanM) * 2) / 2, 3, 18));
    } else M.setView(p.lat, p.lng, Math.max(M.zoom, 17));
    A.dirty = true;
  }

  // ---------------------------------------------------------------- TRACK (one)
  RX.screens.track = {
    lcd: (st) => { const tr = S.track(st.id); if (!tr) return null; const s = X.stats(tr); return { rows: [['TRACK', tNo(tr)], ['TIME', mmss(s.ms / 1000)], ['DIST', s.mi.toFixed(2) + ' MI']], tag: 'TRK' }; },
    enter(st, params, A) { st.id = params.id; },
    render(g, st, A) {
      const tr = S.track(st.id), W = g.W, mx = g.mx;
      if (!tr) { g.header('TRACK'); g.textC('DELETED', W / 2, 40, { a: 0.5 }); g.footer('BACK'); return; }
      const s = X.stats(tr);
      g.header(g.fit(tName(tr), W - 60), F.day(tr.t0), { c: C.hot });
      let y = 14;
      // the shape of it, fitted into a box
      const bx = 2, by = y, bs = 74;
      mx.frame(bx, by, bs, bs, C.ink, 0.35, 2);
      const lats = tr.pts.map(p => p[0]), lngs = tr.pts.map(p => p[1]), la0 = Math.min(...lats), la1 = Math.max(...lats), ln0 = Math.min(...lngs), ln1 = Math.max(...lngs);
      const kx = Math.cos(la0 * Math.PI / 180), spanX = Math.max(1e-9, (ln1 - ln0) * kx), spanY = Math.max(1e-9, la1 - la0), sc = (bs - 12) / Math.max(spanX, spanY);
      const ox = bx + 6 + ((bs - 12) - spanX * sc) / 2, oy = by + 6 + ((bs - 12) - spanY * sc) / 2;
      const P = tr.pts.map(p => [Math.round(ox + (p[1] - ln0) * kx * sc), Math.round(oy + (la1 - p[0]) * sc)]);
      for (let i = 1; i < P.length; i++) mx.line(P[i - 1][0], P[i - 1][1], P[i][0], P[i][1], RED, 1);
      mx.carve(P[0][0], P[0][1], 3); mx.ring(P[0][0], P[0][1], 2, C.hot, 1);
      const e = P[P.length - 1]; mx.disc(e[0], e[1], 1.6, C.hot, 1);
      g.hit(bx, by, bs, bs, () => X.showTrack(tr.id));
      // the numbers
      const rx = bx + bs + 6;
      g.mini('TIME', rx, y + 2, { a: 0.6 }); g.text(mmss(s.ms / 1000), rx, y + 9, { s: 2, c: C.hot });
      g.mini('DISTANCE', rx, y + 28, { a: 0.6 }); const dw = g.text(s.mi.toFixed(2), rx, y + 35, { s: 2, c: C.hot }); g.text('MI', rx + dw + 3, y + 42, { a: 0.8 });
      g.mini('PACE', rx, y + 56, { a: 0.6 }); g.text(s.pace ? mmss(s.pace * 60) + ' /MI' : '--', rx, y + 63, { c: C.amber });
      y = by + bs + 4;
      const row = (k, v) => { g.mini(k, 3, y + 3, { a: 0.55 }); g.text(g.fit(v, W - 40), 34, y + 2); y += 10; };
      row('START', F.hm(tr.t0) + (tr.from ? ' · ' + tr.from : ''));
      row('STOP', F.hm(tr.t1) + (tr.to ? ' · ' + tr.to : ''));
      row('SPEED', s.mph.toFixed(1) + ' MPH' + (s.top ? ' · TOP ' + s.top.toFixed(1) : ''));
      row('CLIMB', s.climb == null ? 'NO ALTITUDE' : '+' + Math.round(s.climb) + ' FT · HIGH ' + Math.round(s.high) + ' FT');
      y += 2;
      g.field('trk-' + tr.id, 0, y, W, 13, { label: 'NAME', value: tr.name || '', placeholder: 'TRACK ' + tNo(tr), onCommit: v => { tr.name = RX.font.norm(v || '').trim().slice(0, 28); S.saveTracks(); } });
      y += 16;
      const b2 = Math.floor((W - 6) / 2);
      g.btn(2, y, b2, 13, 'SHOW ON MAP', () => X.showTrack(tr.id));
      g.btn(4 + b2, y, W - 6 - b2, 13, 'DELETE', () => A.go('confirm', { title: 'DELETE TRACK', danger: true, confirm: 'DELETE', lines: ['DELETE ' + tName(tr) + '?', s.mi.toFixed(2) + ' MI · ' + F.dateY(tr.t0)], onConfirm: () => { S.tracks = S.tracks.filter(x => x.id !== tr.id); S.saveTracks(); if (A.showTrack === tr.id) A.showTrack = null; A.say('TRACK DELETED', 2000); } }), { c: RED });
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'KEPT ▸ LOG · JOURNAL · MENU ▸ TRACKS');
    }
  };

  // ---------------------------------------------------------------- TRACKS (all)
  RX.screens.tracks = {
    render(g, st, A) {
      const W = g.W, mx = g.mx, list = S.tracks.slice().sort((a, b) => b.t0 - a.t0);
      const tot = S.tracks.reduce((m, t) => m + (t.m || 0), 0) / MI;
      let y = g.header('TRACKS', list.length + ' · ' + tot.toFixed(1) + ' MI');
      y = g.scrollBegin(y, g.H - 12);
      if (S.rec) { const s = X.stats(S.rec); g.row(0, y, W - 2, 19, () => A.home()); mx.disc(5, y + 5, 2, RED, Math.floor(g.t / 600) % 2 ? 1 : 0.4); g.text('RECORDING ' + tNo(S.rec), 11, y + 2, { c: RED }); g.mini(mmss(s.ms / 1000) + ' · ' + s.mi.toFixed(2) + ' MI · REC STOPS IT', 3, y + 11, { a: 0.6 }); mx.hline(3, y + 19, W - 6, C.ink, 0.1, 2); y += 20; }
      list.forEach(tr => {
        const s = X.stats(tr), sel = g.row(0, y, W - 2, 19, () => A.go('track', { id: tr.id }));
        mx.line(2, y + 7, 7, y + 3, RED, 1);
        const right = s.mi.toFixed(2) + ' MI', rw = RX.font.measure(right);
        g.text(g.fit(tName(tr), W - rw - 18), 11, y + 2, { c: sel ? C.hot : C.ink });
        g.textR(right, W - 4, y + 2, { a: 0.85 });
        g.mini(F.day(tr.t0) + ' · ' + F.hm(tr.t0) + ' · ' + mmss(s.ms / 1000) + (tr.from ? ' · ' + tr.from : ''), 3, y + 11, { a: 0.55 });
        mx.hline(3, y + 19, W - 6, C.ink, 0.1, 2);
        y += 20;
      });
      if (!list.length && !S.rec) { g.textC('NO TRACKS YET', W / 2, y + 10, { a: 0.6 }); g.textC('REC ON THE AUX DECK', W / 2, y + 22, { face: 'mini', a: 0.5 }); y += 34; }
      g.scrollEnd(y);
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'TAP ONE · JOG SCROLLS');
    }
  };
})();
