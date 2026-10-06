/* =============================================================
   RECON.OS RX-90 · SYSTEM
   Boot, navigation stack, keys, jog dial, touch, GPS, place
   names, the LCD readout, the amber clock and the status lamps.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const S = RX.store, M = RX.map, U = RX.ui, Geo = RX.geo;
  const $ = id => document.getElementById(id);
  const device = $('device');

  const A = {
    stack: [], gps: null, gpsErr: null, place: null, regionId: null,
    assign: null, filed: null, recall: null, target: null, pick: null,
    trayOpen: false, dirty: true, lastInput: Date.now(), booted: false,
    status: { text: 'RX-90 READY', start: 0, until: 0 }, frameIdx: 0,
    disp: 'region', lcdMsg: null
  };
  RX.app = A;

  // ---------- displays ----------
  A.mx = new RX.Matrix($('screen'), { pitch: 2, shape: 'round', ghost: 'rgba(90,255,205,0.07)', bloom: { blur: 3, opacity: 0.75 } });
  A.lcd = new RX.Matrix($('lcdHost'), { pitch: 1.6, shape: 'square', ghost: 'rgba(30,45,30,0.07)', bloom: null, shadow: true });
  A.clock = new RX.Matrix($('clockHost'), { pitch: 1.6, shape: 'round', ghost: 'rgba(255,170,70,0.07)', bloom: { blur: 2.5, opacity: 0.8 } });
  const ro = new ResizeObserver(() => { if (A.mx.resize()) M.dirty = true; A.lcd.resize(); A.clock.resize(); A.dirty = true; A.lcdDirty = true; });
  ro.observe($('screen')); ro.observe($('lcdHost')); ro.observe($('clockHost'));

  // ---------- sound ----------
  let ac = null;
  A.beep = function (kind) {
    if (!S.v2.sound) return;
    try {
      if (!ac) {
        if (navigator.audioSession) { try { navigator.audioSession.type = 'ambient'; } catch (e) {} }
        ac = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (ac.state === 'suspended') ac.resume();
      const t = ac.currentTime;
      const tone = (f, d, v, at, type) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type || 'square'; o.frequency.setValueAtTime(f, t + (at || 0));
        g.gain.setValueAtTime(0, t + (at || 0)); g.gain.linearRampToValueAtTime(v, t + (at || 0) + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (at || 0) + d);
        o.connect(g); g.connect(ac.destination); o.start(t + (at || 0)); o.stop(t + (at || 0) + d + 0.02);
      };
      if (kind === 'key') tone(1900, 0.018, 0.035);
      else if (kind === 'jog') tone(2600, 0.008, 0.02);
      else if (kind === 'mark') { tone(1320, 0.05, 0.05); tone(1760, 0.07, 0.05, 0.06); }
      else if (kind === 'file') { tone(880, 0.04, 0.045); tone(1320, 0.04, 0.045, 0.045); tone(1760, 0.06, 0.04, 0.09); }
      else if (kind === 'err') tone(220, 0.14, 0.05, 0, 'sawtooth');
      else if (kind === 'ok') tone(1480, 0.05, 0.04);
    } catch (e) {}
  };

  // ---------- status line ----------
  A.say = function (text, ms) {
    A.status = { text: RX.font.norm(text), start: performance.now(), until: ms ? Date.now() + ms : Date.now() + 6000, kind: 'say' };
    A.dirty = true;
  };
  A.sayActive = () => A.status.kind === 'say' && Date.now() < A.status.until;
  A.statusShown = function (t) {
    const s = A.status;
    const n = Math.min(s.text.length, Math.floor((t - s.start) / 26));
    return s.text.slice(0, Math.max(0, n));
  };
  function rotatingStatus() {
    const frames = [];
    const g = A.gps;
    frames.push(g ? ('FIX ±' + Math.round(g.acc) + 'M · ' + Math.round((g.speed || 0) * 2.237) + ' MPH') : 'GPS ACQUIRING');
    const nb = A.nearest(null);
    if (nb) frames.push('NEAREST ▸ ' + S.markLabel(nb.p) + ' ' + Geo.fmtDist(nb.m) + ' ' + Geo.cardinal(nb.brg));
    const pend = S.pending().length;
    if (pend) frames.push('PEND ' + U.F.pad2(pend) + ' · FN ▸ LOG ▸ PEND');
    frames.push('TRAIL ' + S.trailMiles().toFixed(1) + ' MI TODAY' + (S.v2.recordTrail ? ' · REC' : ' · OFF'));
    const urgent = S.missions.filter(m => m.status === 'active' && (m.priority === 'urgent' || (m.deadline && m.deadline < Date.now() + 864e5)));
    if (urgent.length) frames.push('OBJ ▸ ' + urgent[0].title + (urgent[0].deadline ? ' · DUE ' + U.F.date(urgent[0].deadline) : ''));
    const otd = onThisDay();
    if (otd) frames.push(otd);
    frames.push(S.pois.length + ' MARKS · ' + S.missions.filter(m => m.status === 'active').length + ' OBJ ACTIVE');
    return frames[A.frameIdx % frames.length];
  }
  function onThisDay() {
    const now = new Date();
    for (let y = 1; y <= 3; y++) {
      const d = new Date(now.getFullYear() - y, now.getMonth(), now.getDate());
      const s = d.getTime(), e = s + 864e5;
      const hit = S.journal.find(j => j.ts >= s && j.ts < e && (j.type === 'visit' || j.type === 'drop' || j.type === 'classify'));
      if (hit) {
        const p = S.poi(hit.poiId);
        return y + (y === 1 ? ' YEAR' : ' YEARS') + ' AGO ▸ ' + (p ? S.markLabel(p) : RX.font.norm(hit.summary));
      }
    }
    return null;
  }

  // ---------- navigation ----------
  A.top = () => A.stack[A.stack.length - 1];
  A.screen = () => RX.screens[A.top().name];
  A.go = function (name, params) {
    U.closeField(true);
    const prev = A.top();
    if (prev && RX.screens[prev.name].leave) RX.screens[prev.name].leave(prev.st, A);
    const entry = { name, params: params || {}, st: { sel: 0, scroll: 0 } };
    A.stack.push(entry);
    const sc = RX.screens[name];
    if (sc.enter) sc.enter(entry.st, entry.params, A);
    applyMode();
    A.dirty = true;
  };
  A.replace = function (name, params) {
    U.closeField(true);
    const prev = A.stack.pop();
    if (prev && RX.screens[prev.name].leave) RX.screens[prev.name].leave(prev.st, A);
    const entry = { name, params: params || {}, st: { sel: 0, scroll: 0 } };
    A.stack.push(entry);
    const sc = RX.screens[name];
    if (sc.enter) sc.enter(entry.st, entry.params, A);
    applyMode();
    A.dirty = true;
  };
  A.back = function () {
    if (U.activeField) { U.closeField(true); A.dirty = true; return; }
    const top = A.top();
    const sc = RX.screens[top.name];
    if (sc.back && sc.back(top.st, A)) { A.dirty = true; return; }
    if (A.stack.length <= 1) return;
    if (sc.leave) sc.leave(top.st, A);
    A.stack.pop();
    const now = A.top();
    if (RX.screens[now.name].resume) RX.screens[now.name].resume(now.st, A);
    applyMode();
    A.dirty = true;
  };
  A.home = function () {
    U.closeField(true);
    while (A.stack.length > 1) { const e = A.stack.pop(); const sc = RX.screens[e.name]; if (sc.leave) sc.leave(e.st, A); }
    applyMode(); A.dirty = true;
  };
  function applyMode() {
    const sc = A.screen();
    const mapMode = !!sc.map;
    device.classList.toggle('menu-mode', !mapMode);
    const amber = sc.pal === 'amber';
    $('screen').classList.toggle('amber', amber);
    $('bezel').classList.toggle('amber', amber);
    A.mx.setGhost(amber ? 'rgba(255,170,70,0.075)' : 'rgba(90,255,205,0.07)');
    const atHome = A.stack.length <= 1;
    $('menuLbl').textContent = atHome ? 'MENU' : 'BACK';
    $('menuJp').textContent = atHome ? '設定' : '戻る';
    $('menuIcon').innerHTML = atHome ? '<path d="M4 6 L16 6 M4 10 L16 10 M4 14 L16 14"/>' : '<path d="M8 5 L3 10 L8 15 M3 10 L17 10"/>';
    const j = sc.jogLabels ? sc.jogLabels(A.top().st, A) : (mapMode ? ['◂ OUT', 'IN ▸', 'TAP LOCATE · HOLD RESET'] : ['◂ UP', 'DOWN ▸', 'PUSH SELECT · HOLD MAP']);
    $('jogL').textContent = j[0]; $('jogR').textContent = j[1]; $('jogFoot').textContent = j[2];
    $('markSub').textContent = A.pick ? 'SET HERE' : (atHome ? 'DROP ▸ ASSIGN' : 'ANY SCREEN');
    setTray(false);
  }
  A.refreshChrome = applyMode;

  // ---------- map view ----------
  A.view = function () {
    const mx = A.mx;
    return { cols: mx.cols, rows: mx.rows, pitch: mx.pitch, cx: mx.cols / 2, cy: Math.round(mx.rows / 2) };
  };
  A.nearest = function (catIdx) {
    const from = A.gps || { lat: M.lat, lng: M.lng };
    let best = null;
    const cat = catIdx == null ? null : U.CATS[catIdx].id;
    S.pois.forEach(p => {
      if (!p.category) return;
      if (cat && p.category !== cat) return;
      const m = Geo.meters(from.lat, from.lng, p.lat, p.lng);
      if (!best || m < best.m) best = { p, m, brg: Geo.bearing(from.lat, from.lng, p.lat, p.lng) };
    });
    return best;
  };
  A.locate = function (zoom) {
    if (A.gps) {
      M.setView(A.gps.lat, A.gps.lng, zoom); A.follow(true);
      A.say((zoom ? 'RECENTERED · Z' + zoom : 'LOCATED') + ' · FIX ±' + Math.round(A.gps.acc) + 'M · FOLLOWING', 3500);
    } else {
      // no fix (e.g. on the laptop): go to the last place a fix was seen
      const lp = S.v2.lastPos;
      if (lp) M.setView(lp.lat, lp.lng, zoom);
      else if (zoom) M.setView(M.lat, M.lng, zoom);
      A.say('NO GPS FIX · ' + (lp ? 'LAST KNOWN SPOT' : (A.gpsErr || 'ACQUIRING')), 3500);
      retryGps();
    }
    A.dirty = true;
  };
  // full reset of the view: back to the map, on you, street zoom, filters off
  A.recenter = function () {
    U.closeField(true);
    if (A.pick) return;
    if (A.stack.length > 1) A.home();
    if (A.recall != null) A.clearRecall();
    A.target = null;
    A.locate(15);
  };
  A.follow = function (on) { M.follow = on; A.dirty = true; };

  // ---------- marks ----------
  A.dropAt = function (lat, lng, how) {
    const id = 'POI-' + Date.now();
    const region = S.regions.find(r => r.id === A.regionId) || null;
    const p = { id, lat, lng, category: null, name: '', notes: '', photo: null, hva: false, tier: 2,
      regionId: region ? region.id : null, sector: null, created: Date.now() };
    S.pois.push(p); S.savePOIs();
    S.log('drop', id, 'Pin dropped', how || (A.place ? A.place.area : ''));
    A.assign = { id, until: Date.now() + 5000 };
    A.filed = null;
    device.classList.add('assign');
    $('presetHint').textContent = 'ASSIGN ▸ 1–6'; $('presetHint').classList.add('hot');
    A.beep('mark');
    A.say('MARK ' + id.slice(-4) + ' DROPPED · PRESS 1–6 TO FILE', 5200);
    A.flash = performance.now();
    if (S.v2.autoName !== false) autoName(p);
    A.dirty = true;
    return p;
  };
  async function autoName(p) {
    const r = await Geo.reverse(p.lat, p.lng, 18);
    if (!r) return;
    const cur = S.poi(p.id);
    if (!cur || cur.name) return;
    const nm = ((r.house ? r.house + ' ' : '') + r.road).trim();
    if (nm) { cur.name = nm; S.savePOIs(); A.dirty = true; }
  }
  A.mark = function () {
    A.wake();
    if (A.pick) { const sc = RX.screens.pick; sc.set(A.top().st, A); return; }
    if (A.assign) { A.finishAssign(null); return; }
    if (A.stack.length > 1) A.home();
    let lat, lng, how = '';
    if (A.gps && Date.now() - A.gps.ts < 60000 && M.follow) { lat = A.gps.lat; lng = A.gps.lng; }
    else if (A.gps && Date.now() - A.gps.ts < 60000 && !M.follow) { lat = M.lat; lng = M.lng; how = 'AT CURSOR'; }
    else { lat = M.lat; lng = M.lng; how = 'AT CURSOR · NO GPS'; }
    A.dropAt(lat, lng, how);
  };
  A.finishAssign = function (catIdx) {
    const a = A.assign;
    if (!a) return;
    A.assign = null;
    device.classList.remove('assign');
    $('presetHint').classList.remove('hot');
    $('presetHint').textContent = 'TAP ▸ SHOW ONLY';
    const p = S.poi(a.id);
    if (!p) return;
    if (catIdx == null) {
      A.filed = { label: 'PEND QUEUE', color: U.C.ink, until: Date.now() + 2600, id: p.id };
      A.say('MARK ' + p.id.slice(-4) + ' ▸ PEND QUEUE · FILE IT LATER IN LOG', 4000);
      A.beep('ok');
    } else {
      const cat = U.CATS[catIdx];
      p.category = cat.id; p.type = p.type || 'NONE'; p.shape = 'ICON';
      S.savePOIs();
      S.log('classify', p.id, 'Classified: ' + S.markLabel(p), cat.id);
      A.filed = { label: cat.id, color: cat.color, until: Date.now() + 2600, id: p.id };
      A.say('MARK ' + p.id.slice(-4) + ' ▸ ' + cat.id + (A.place ? ' · ' + A.place.area : ''), 4000);
      A.beep('file');
    }
    A.dirty = true; updateLamps();
  };
  A.undoDrop = function () {
    const a = A.assign; if (!a) return false;
    A.assign = null; device.classList.remove('assign');
    $('presetHint').classList.remove('hot'); $('presetHint').textContent = 'TAP ▸ SHOW ONLY';
    S.pois = S.pois.filter(p => p.id !== a.id); S.savePOIs();
    S.log('delete', a.id, 'Deleted: dropped by mistake', '');
    A.say('MARK CANCELLED', 2500); A.beep('err'); A.dirty = true; updateLamps();
    return true;
  };
  A.preset = function (i) {
    A.wake();
    if (A.assign) { A.finishAssign(i); return; }
    if (A.stack.length > 1) return;
    if (A.recall === i) { A.clearRecall(); A.say('ALL CATEGORIES ▸ SHOWN', 2500); }
    else {
      if (A.recall == null) A.dispBeforeRecall = A.disp;
      A.recall = i;
      const cat = U.CATS[i];
      const n = S.pois.filter(p => p.category === cat.id).length;
      const nb = A.nearest(i);
      A.say('SHOWING ' + cat.id + ' · ' + n + ' MARKS' + (nb ? ' · NEAREST ' + Geo.fmtDist(nb.m) + ' ' + Geo.cardinal(nb.brg) : ''), 5000);
      A.disp = 'target'; A.lcdDirty = true;
    }
    A.beep('key'); updatePresets(); A.dirty = true;
  };
  A.openMark = function (id) { A.go('mark', { id }); };
  A.clearRecall = function () {
    A.recall = null;
    if (A.dispBeforeRecall) { A.disp = A.dispBeforeRecall; A.dispBeforeRecall = null; A.lcdDirty = true; }
    updatePresets(); A.dirty = true;
  };

  // ---------- keys ----------
  function press(el, fn) {
    el.addEventListener('pointerdown', e => { e.preventDefault(); A.wake(); el.classList.add('down'); A.beep('key'); });
    const up = () => el.classList.remove('down');
    el.addEventListener('pointerup', up); el.addEventListener('pointerleave', up); el.addEventListener('pointercancel', up);
    el.addEventListener('click', e => { e.preventDefault(); fn(e); });
  }
  press($('markKey'), () => A.mark());
  press($('menuKey'), () => { if (A.stack.length <= 1 && !A.assign) A.go('menu'); else if (A.assign) A.undoDrop(); else A.back(); });
  press($('fnKey'), () => setTray(!A.trayOpen));
  document.querySelectorAll('.tool').forEach(b => press(b, () => {
    const t = b.dataset.tool;
    setTray(false);
    if (A.top().name === t) return;
    if (A.stack.length > 1) A.home();
    A.go(t);
  }));
  $('lcdBtn').addEventListener('click', () => {
    A.wake(); A.beep('key');
    const order = ['region', 'nav', 'target'];
    A.disp = order[(order.indexOf(A.disp) + 1) % order.length];
    A.dispBeforeRecall = null;
    S.saveV2({ disp: A.disp });
    A.lcdMsg = null; A.lcdDirty = true;
    A.say('DISP ▸ ' + { region: 'AREA · CITY · METRO', nav: 'SPEED · HEADING · ELEVATION', target: 'NEAREST MARK' }[A.disp], 2500);
  });
  function setTray(open) {
    A.trayOpen = open;
    $('tray').classList.toggle('open', open);
    $('fnKey').setAttribute('aria-expanded', open ? 'true' : 'false');
    $('fnLed').classList.toggle('on', open);
  }

  // presets row (built once)
  function presetSvg(cat) {
    const g = RX.font.icons[cat.def];
    let rects = '';
    for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) if (g[j][i]) rects += '<rect x="' + (7.5 + i) + '" y="' + (7.5 + j) + '" width="1" height="1"/>';
    return '<svg viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="10" fill="' + cat.color + '" stroke="#04120C" stroke-width="1.4"/><g fill="#04120C">' + rects + '</g></svg>';
  }
  U.CATS.forEach((cat, i) => {
    const d = document.createElement('div');
    d.className = 'preset';
    d.innerHTML = '<span class="preset-lbl">' + cat.short + '</span><div class="preset-sock"><button type="button" class="key preset-key" aria-label="Preset ' + (i + 1) + ', ' + cat.id.toLowerCase() + '"><span class="num">' + (i + 1) + '</span><span class="led amber"></span>' + presetSvg(cat) + '</button></div>';
    $('presetRow').appendChild(d);
    press(d.querySelector('button'), () => A.preset(i));
  });
  function updatePresets() {
    document.querySelectorAll('.preset').forEach((d, i) => {
      const latched = !A.assign && A.recall === i;
      d.classList.toggle('latched', latched);
      d.querySelector('.led').classList.toggle('on', !!A.assign || latched);
      d.querySelector('.preset-lbl').style.color = latched ? U.CATS[i].color : '';
    });
    $('presetHint').textContent = A.assign ? 'ASSIGN ▸ 1–6' : (A.recall != null ? 'SHOWING ' + U.CATS[A.recall].short : 'TAP ▸ SHOW ONLY');
  }
  A.updatePresets = updatePresets;

  // ---------- jog dial ----------
  (function () {
    const jog = $('jog'), knurl = $('jogKnurl');
    let st = null, pos = 0;
    let holdTimer = null, lastTap = 0;
    jog.addEventListener('pointerdown', e => {
      e.preventDefault(); A.wake();
      st = { x: e.clientX, acc: 0, moved: 0, held: false };
      jog.classList.add('down');
      try { jog.setPointerCapture(e.pointerId); } catch (err) {}
      // hold = recenter on you and reset the zoom, from any screen
      clearTimeout(holdTimer);
      const mine = st;
      holdTimer = setTimeout(() => {
        if (st !== mine || mine.moved >= 6) return;
        mine.held = true; jog.classList.add('held');
        A.beep('ok'); A.recenter(true);
      }, 550);
    });
    jog.addEventListener('pointermove', e => {
      if (!st) return;
      const dx = e.clientX - st.x; st.x = e.clientX;
      st.moved += Math.abs(dx); st.acc += dx; pos += dx;
      knurl.style.backgroundPosition = pos + 'px 0';
      while (st.acc >= 16) { st.acc -= 16; A.jog(1); }
      while (st.acc <= -16) { st.acc += 16; A.jog(-1); }
    });
    let tapAt = 0;
    // tap = push (on the map: locate). Two quick taps on the map = recenter + reset zoom.
    const tapped = () => {
      A.beep('key');
      const now = Date.now();
      if (A.screen().map && !A.pick && now - lastTap < 420) { lastTap = 0; A.recenter(true); return; }
      lastTap = now;
      A.push();
    };
    const end = e => {
      if (!st) return;
      clearTimeout(holdTimer);
      const tap = st.moved < 6 && !st.held && e.type === 'pointerup'; st = null;
      jog.classList.remove('down'); jog.classList.remove('held');
      if (tap) { tapAt = Date.now(); setTimeout(() => { if (tapAt) { tapAt = 0; tapped(); } }, 350); }
    };
    jog.addEventListener('pointerup', end); jog.addEventListener('pointercancel', end);
    jog.addEventListener('click', e => { e.preventDefault(); if (tapAt && Date.now() - tapAt < 600) { tapAt = 0; tapped(); } });
    jog.addEventListener('wheel', e => { e.preventDefault(); A.jog(e.deltaY > 0 ? -1 : 1); pos += e.deltaY > 0 ? -8 : 8; knurl.style.backgroundPosition = pos + 'px 0'; }, { passive: false });
  })();
  A.jog = function (d) {
    A.wake(); A.beep('jog');
    const top = A.top(), sc = RX.screens[top.name];
    if (sc.jog) { sc.jog(d, top.st, A); A.dirty = true; return; }
    A.focusJog(d);
  };
  A.focusJog = function (d) {
    const top = A.top();
    const n = U.focus.length;
    if (!n) { top.st.scroll = Math.max(0, Math.min(top.st.scrollMax || 0, (top.st.scroll || 0) + d * 18)); A.dirty = true; return; }
    if (!top.st.jog) { top.st.jog = true; top.st.sel = Math.max(0, Math.min(n - 1, top.st.sel || 0)); }
    else top.st.sel = Math.max(0, Math.min(n - 1, (top.st.sel || 0) + d));
    A.dirty = true;
  };
  A.push = function () {
    A.wake();
    const top = A.top(), sc = RX.screens[top.name];
    if (sc.push) { sc.push(top.st, A); A.dirty = true; return; }
    A.focusPush();
  };
  A.focusPush = function () {
    const top = A.top();
    if (!top.st.jog) { top.st.jog = true; A.dirty = true; return; }
    const f = U.focus[top.st.sel];
    if (f && f.fn) f.fn({});
    A.dirty = true;
  };

  // ---------- touch on the main screen ----------
  (function () {
    const el = $('screen');
    const ptrs = new Map();
    let gest = null, lpTimer = null;
    const toDot = (cx, cy) => {
      const r = A.mx.wrap.getBoundingClientRect();
      return { x: (cx - r.left) / A.mx.pitch, y: (cy - r.top) / A.mx.pitch };
    };
    el.addEventListener('pointerdown', e => {
      A.wake();
      if (U.activeField) {
        // keep the keyboard up when the tap lands on the field being edited
        const d = toDot(e.clientX, e.clientY), r = U.fieldRects[U.activeField.key];
        if (r && d.x >= r.x && d.x < r.x + r.w && d.y >= r.y && d.y < r.y + r.h) e.preventDefault();
      }
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      const sc = A.screen();
      if (ptrs.size === 1) {
        gest = { sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, t: Date.now(), moved: 0, mode: null };
        clearTimeout(lpTimer);
        if (sc.map && sc.longPress) {
          lpTimer = setTimeout(() => {
            if (gest && gest.moved < 8) { gest.mode = 'long'; const d = toDot(gest.sx, gest.sy); sc.longPress(d, A.top().st, A); A.dirty = true; }
          }, 600);
        }
      } else if (ptrs.size === 2 && sc.map) {
        clearTimeout(lpTimer);
        const [a, b] = [...ptrs.values()];
        gest = { mode: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), z0: M.zoom, moved: 99 };
      }
    });
    el.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId) || !gest) return;
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const sc = A.screen();
      if (gest.mode === 'pinch' && ptrs.size >= 2) {
        const [a, b] = [...ptrs.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = toDot((a.x + b.x) / 2, (a.y + b.y) / 2);
        const target = gest.z0 + Math.log2(d / gest.d0);
        M.zoomBy(target - M.zoom, mid.x, mid.y, A.view());
        A.dirty = true; return;
      }
      const dx = e.clientX - gest.lx, dy = e.clientY - gest.ly;
      gest.lx = e.clientX; gest.ly = e.clientY;
      gest.moved = Math.max(gest.moved, Math.hypot(e.clientX - gest.sx, e.clientY - gest.sy));
      if (gest.moved < 6 || gest.mode === 'long') return;
      clearTimeout(lpTimer);
      if (sc.map) { M.panBy(dx, dy); if (M.follow) { A.follow(false); A.say('FREE LOOK · PUSH JOG TO RE-CENTER', 3000); } A.dirty = true; }
      else {
        const st = A.top().st;
        st.scroll = Math.max(0, Math.min(st.scrollMax || 0, (st.scroll || 0) - dy / A.mx.pitch));
        st.jog = false; A.dirty = true;
      }
    });
    const up = e => {
      ptrs.delete(e.pointerId);
      clearTimeout(lpTimer);
      if (!gest) return;
      if (ptrs.size === 0) {
        const g = gest; gest = null;
        if (g.mode === 'pinch' || g.mode === 'long') return;
        if (g.moved < 8 && Date.now() - g.t < 800 && e.type === 'pointerup') {
          const pt = pendingTap = { d: toDot(g.sx, g.sy), t: Date.now() };
          setTimeout(() => { if (pendingTap === pt) { pendingTap = null; tap(pt.d); } }, 350);
        }
      }
    };
    let pendingTap = null;
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('click', () => {
      const pt = pendingTap;
      if (pt && Date.now() - pt.t < 600) { pendingTap = null; tap(pt.d); }
    });
    el.addEventListener('wheel', e => {
      e.preventDefault(); A.wake();
      const sc = A.screen();
      if (sc.map) {
        const d = toDot(e.clientX, e.clientY);
        M.zoomBy(-e.deltaY * 0.0025, d.x, d.y, A.view());
        if (M.follow && A.gps) A.follow(false);
      } else {
        const st = A.top().st;
        st.scroll = Math.max(0, Math.min(st.scrollMax || 0, (st.scroll || 0) + e.deltaY / A.mx.pitch / 2));
      }
      A.dirty = true;
    }, { passive: false });

    function tap(d) {
      for (let i = U.hits.length - 1; i >= 0; i--) {
        const h = U.hits[i];
        if (d.x >= h.x && d.x < h.x + h.w && d.y >= h.y && d.y < h.y + h.h) {
          const st = A.top().st;
          if (U.activeField && h.field === U.activeField.key) { U.activeField.el.focus({ preventScroll: true }); return; }
          if (U.activeField) U.closeField(true);
          if (h.focus != null) { st.sel = h.focus; st.jog = false; }
          A.beep('key');
          h.fn({ x: d.x, y: d.y });
          A.dirty = true;
          return;
        }
      }
      if (U.activeField) { U.closeField(true); A.dirty = true; return; }
      const sc = A.screen();
      if (sc.tapEmpty) { sc.tapEmpty(d, A.top().st, A); A.dirty = true; }
    }
  })();

  // ---------- keyboard (laptop) ----------
  document.addEventListener('keydown', e => {
    if (U.activeField) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    A.wake();
    const k = e.key;
    const sc = A.screen();
    if (k >= '1' && k <= '6') { A.preset(+k - 1); flashKey(document.querySelectorAll('.preset-key')[+k - 1]); }
    else if (k === 'm' || k === 'M') { A.mark(); flashKey($('markKey')); }
    else if (k === 'Escape' || k === 'Backspace') { e.preventDefault(); $('menuKey').click(); flashKey($('menuKey')); }
    else if (k === 'f' || k === 'F') setTray(!A.trayOpen);
    else if (k === 'Enter' || k === ' ') { e.preventDefault(); A.push(); }
    else if (k === 'c' || k === 'C') { A.beep('ok'); A.recenter(true); }
    else if (k === '+' || k === '=') { if (sc.map) { M.zoomBy(0.5); A.dirty = true; } else A.jog(-1); }
    else if (k === '-' || k === '_') { if (sc.map) { M.zoomBy(-0.5); A.dirty = true; } else A.jog(1); }
    else if (k.startsWith('Arrow')) {
      e.preventDefault();
      if (sc.map) {
        const s = 60;
        M.panBy(k === 'ArrowLeft' ? s : k === 'ArrowRight' ? -s : 0, k === 'ArrowUp' ? s : k === 'ArrowDown' ? -s : 0);
        A.follow(false); A.dirty = true;
      } else A.jog(k === 'ArrowUp' || k === 'ArrowLeft' ? -1 : 1);
    }
    else if (k === 'l' || k === 'L') { if (A.stack.length > 1) A.home(); A.go('log'); }
    else if (k === 's' || k === 'S' || k === '/') { e.preventDefault(); if (A.stack.length > 1) A.home(); A.go('search'); }
    else if (k === 'o' || k === 'O') { if (A.stack.length > 1) A.home(); A.go('objectives'); }
    else if (k === 'g' || k === 'G') { if (A.stack.length > 1) A.home(); A.go('legend'); }
    else if (k === 'h' || k === 'H') { if (A.stack.length > 1) A.home(); A.go('fast'); }
    else if (k === 'd' || k === 'D') $('lcdBtn').click();
  });
  function flashKey(el) { if (!el) return; el.classList.add('down'); setTimeout(() => el.classList.remove('down'), 120); }

  // ---------- idle dim ----------
  A.wake = function () {
    A.lastInput = Date.now();
    if (device.classList.contains('dim')) { device.classList.remove('dim'); A.dirty = true; }
  };
  setInterval(() => {
    if (!S.v2.idleDim || A.assign || U.activeField) return;
    if (Date.now() - A.lastInput > 60000) device.classList.add('dim');
  }, 2000);

  // ---------- GPS ----------
  let watchId = null, lastPlaceAt = null, placeBusy = false, lastFogPos = null, visitDwell = {};
  function startGps() {
    if (!navigator.geolocation) { A.gpsErr = 'NO GPS IN BROWSER'; return; }
    try {
      watchId = navigator.geolocation.watchPosition(onFix, onGpsErr, { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 });
    } catch (e) { A.gpsErr = 'GPS UNAVAILABLE'; }
  }
  function retryGps() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(onFix, onGpsErr, { enableHighAccuracy: true, timeout: 15000 });
  }
  function onGpsErr(err) {
    A.gpsErr = err.code === 1 ? 'PERMISSION DENIED' : err.code === 2 ? 'NO SIGNAL' : 'GPS TIMEOUT';
    updateLamps(); A.dirty = true;
  }
  function onFix(pos) {
    const c = pos.coords;
    const first = !A.gps;
    const prev = A.gps;
    let speed = (typeof c.speed === 'number' && !isNaN(c.speed)) ? c.speed : null;
    if (speed == null && prev) {
      const dt = (pos.timestamp - prev.ts) / 1000;
      if (dt > 0.5 && dt < 30) speed = Geo.meters(prev.lat, prev.lng, c.latitude, c.longitude) / dt;
    }
    let heading = prev ? prev.heading : null;
    if (typeof c.heading === 'number' && !isNaN(c.heading) && (speed == null || speed > 0.6)) heading = c.heading;
    else if (prev && speed > 0.8) heading = Geo.bearing(prev.lat, prev.lng, c.latitude, c.longitude);
    A.gps = { lat: c.latitude, lng: c.longitude, acc: c.accuracy, alt: (typeof c.altitude === 'number' ? c.altitude : null), heading, speed: speed || 0, ts: Date.now() };
    A.gpsErr = null;
    if (first) {
      M.setView(c.latitude, c.longitude, Math.max(M.zoom, 15)); M.follow = true;
      A.say('GPS LOCK · ±' + Math.round(c.accuracy) + 'M', 3000); A.beep('ok');
      A.flashFix = Date.now();
    } else if (M.follow && !A.pick) M.setView(c.latitude, c.longitude);
    // fog
    if (!lastFogPos || Geo.meters(lastFogPos.lat, lastFogPos.lng, c.latitude, c.longitude) >= 50) {
      if (S.revealAround(c.latitude, c.longitude)) M.dirty = true;
      lastFogPos = { lat: c.latitude, lng: c.longitude };
    }
    S.recordTrail(c.latitude, c.longitude);
    checkVisits(c.latitude, c.longitude);
    placeLookup(c.latitude, c.longitude);
    S.saveV2({ lastPos: { lat: +c.latitude.toFixed(5), lng: +c.longitude.toFixed(5) } });
    updateLamps(); A.lcdDirty = true; A.dirty = true;
  }
  const VISIT_RULES = { WAYPOINT: [100, 60], VISTA: [200, 180], LANDMARK: [200, 120], SUPPLY: [100, 300], INTEL: [100, 180] };
  function checkVisits(lat, lng) {
    const now = Date.now(), seen = new Set();
    S.pois.forEach(p => {
      const rule = VISIT_RULES[p.category];
      if (!rule) return;
      const ft = Geo.meters(lat, lng, p.lat, p.lng) * 3.28084;
      if (ft > rule[0]) return;
      seen.add(p.id);
      const st = visitDwell[p.id] || (visitDwell[p.id] = { since: now, logged: false });
      if (!st.logged && (now - st.since) / 1000 >= rule[1]) {
        p.visits = (p.visits || 0) + 1; p.lastVisited = now; S.savePOIs(); st.logged = true;
        S.log('visit', p.id, 'Visited: ' + S.markLabel(p), p.category + ' · ×' + p.visits);
        A.say('VISIT LOGGED ▸ ' + S.markLabel(p) + ' · ×' + p.visits, 4000); A.beep('ok');
      }
    });
    Object.keys(visitDwell).forEach(id => { if (!seen.has(id)) delete visitDwell[id]; });
  }
  async function placeLookup(lat, lng) {
    if (!S.v2.placeLookup || placeBusy) return;
    if (lastPlaceAt && Geo.meters(lastPlaceAt.lat, lastPlaceAt.lng, lat, lng) < 350 && Date.now() - lastPlaceAt.t < 180000) return;
    placeBusy = true;
    try {
      const r = await Geo.reverse(lat, lng, 16);
      if (r) {
        const changed = !A.place || A.place.area !== r.area || A.place.city !== r.city;
        A.place = r; lastPlaceAt = { lat, lng, t: Date.now() };
        if (changed) { A.lcdFlicker = Date.now(); A.say('ENTERED ' + r.area + ' · ' + r.city, 4000); }
        if (r.regionName) {
          const nm = r.regionName + ' REGION';
          let reg = S.regions.find(x => x.name === nm);
          if (!reg) { reg = { id: 'RGN-' + Date.now(), name: nm, originLat: lat, originLng: lng, created: Date.now(), revealedSectors: [] }; S.regions.push(reg); S.saveRegions(); }
          A.regionId = reg.id;
        }
        A.lcdDirty = true;
      } else if (!lastPlaceAt) lastPlaceAt = { lat, lng, t: Date.now() - 120000 };
    } finally { placeBusy = false; }
  }
  A.placeLookup = placeLookup;

  // ---------- lamps ----------
  function lamp(id, on, cls) {
    const el = document.querySelector('.lamp[data-lamp="' + id + '"] .led');
    el.classList.toggle('on', !!on);
    el.classList.toggle('blink', cls === 'blink');
    el.classList.toggle('pulse', cls === 'pulse');
  }
  function updateLamps() {
    const g = A.gps, fresh = g && Date.now() - g.ts < 30000;
    lamp('fix', fresh || !A.gpsErr, fresh && g.acc < 30 ? null : 'blink');
    lamp('rec', S.v2.recordTrail);
    const nb = A.nearest(null);
    lamp('near', fresh && nb && nb.m < 245, 'pulse');
    const pend = S.pending().length;
    lamp('pend', pend > 0);
    const lb = S.v2.lastBackup;
    lamp('bkup', !lb || Date.now() - lb > 7 * 864e5, 'pulse');
    $('logLed').classList.toggle('on', pend > 0);
    $('fastLed').classList.toggle('on', !!S.activeFast());
    const urgent = S.missions.some(m => m.status === 'active' && (m.priority === 'urgent' || (m.deadline && m.deadline < Date.now())));
    $('objLed').classList.toggle('on', urgent);
    $('markLed').classList.toggle('on', true);
    $('markLed').classList.toggle('amber', !!A.assign);
    $('markLed').classList.toggle('blink', !!A.assign);
  }
  A.updateLamps = updateLamps;
  setInterval(updateLamps, 3000);

  // ---------- LCD readout (STN) ----------
  function renderLcd() {
    const m = A.lcd;
    m.clear();
    const ink = '#1B281F';
    let rows;
    if (A.lcdMsg && Date.now() < A.lcdMsg.until) rows = A.lcdMsg.rows;
    else if (!A.booted) rows = [['SYS', 'SELF TEST'], ['MEM', S.pois.length + ' MARKS'], ['FOG', U.F.num(S.fog.size) + ' CELLS']];
    else if (A.disp === 'nav') {
      const g = A.gps;
      rows = [['SPD', g ? (g.speed * 2.237).toFixed(1) + ' MPH' : '--'],
        ['HDG', g && g.heading != null ? U.F.pad2(Math.round(g.heading)).padStart(3, '0') + '° ' + Geo.cardinal(g.heading) : '--'],
        ['ELV', g && g.alt != null ? Math.round(g.alt * 3.28084) + ' FT' : '--']];
    } else if (A.disp === 'target') {
      const nb = A.nearest(A.recall);
      if (nb) {
        const mins = Math.max(1, Math.round(nb.m / 1609.344 / 3 * 60));
        rows = [['TGT', S.markLabel(nb.p)], ['DST', Geo.fmtDist(nb.m) + ' ' + Geo.cardinal(nb.brg) + ' ' + U.F.pad2(Math.round(nb.brg)).padStart(3, '0') + '°'], ['ETA', mins > 90 ? (mins / 60).toFixed(1) + ' H WALK' : mins + ' MIN WALK']];
      } else rows = [['TGT', 'NONE'], ['DST', '--'], ['ETA', '--']];
    } else {
      const p = A.place;
      rows = p ? [['AREA', p.area], ['CITY', p.city], ['METRO', p.metro]]
        : [['AREA', A.gps ? 'LOOKING UP' : '--'], ['CITY', '--'], ['METRO', '--']];
    }
    const lh = Math.floor((m.rows - 2) / 3);
    const top = Math.max(1, Math.floor((m.rows - lh * 3) / 2) + 1);
    const vx = 25;
    rows.forEach((r, i) => {
      const y = top + i * lh;
      m.text(r[0], 2, y + 1, { face: 'mini', c: ink, a: 0.55 });
      m.text(RX.font.fit(r[1], m.cols - vx - 2), vx, y, { c: ink });
    });
    const tag = { region: 'REG', nav: 'NAV', target: 'TGT' }[A.disp] || '';
    if (A.booted) m.text(tag, m.cols - 13, m.rows - 6, { face: 'mini', c: ink, a: 0.4 });
    m.present();
  }

  // ---------- amber clock (VFD) ----------
  function renderClock(t) {
    const m = A.clock, amber = '#FFB547';
    m.clear();
    const d = new Date();
    const hh = U.F.pad2(d.getHours()), mm = U.F.pad2(d.getMinutes());
    const colon = d.getSeconds() % 2 === 0;
    const bigW = RX.font.measure('00:00', 'std', 2);
    const x0 = Math.max(1, Math.floor((m.cols - bigW) / 2));
    m.text(hh, x0, 2, { s: 2, c: amber });
    if (colon) m.text(':', x0 + 24, 2, { s: 2, c: amber });
    m.text(mm, x0 + 36, 2, { s: 2, c: amber });
    const f = S.activeFast();
    const y2 = 19;
    m.text('FAST', 2, y2 + 1, { face: 'mini', c: amber, a: 0.6 });
    m.textR(f ? U.F.durHM(Date.now() - f.startTs) : '--:--', m.cols - 2, y2, { c: amber });
    const segs = 20, segW = Math.floor((m.cols - 4) / segs);
    const frac = f ? Math.min(1, (Date.now() - f.startTs) / 864e5) : 0;
    const yb = m.rows - 5;
    for (let i = 0; i < segs; i++) {
      const lit = i < Math.round(frac * segs);
      m.rect(2 + i * segW, yb, segW - 1, 3, amber, lit ? 1 : 0.1);
    }
    m.present();
  }

  // ---------- render loop ----------
  let lastFrame = 0, lastLcd = 0, lastClock = 0;
  U.onAsync = () => { A.dirty = true; };
  function loop(t) {
    requestAnimationFrame(loop);
    const sc = A.screen();
    const animating = (sc.animating && sc.animating(A.top().st, A)) || !!U.activeField || (performance.now() - A.status.start < 3000);
    const dimmed = device.classList.contains('dim');
    const interval = dimmed ? 250 : (animating ? 40 : 200);
    if (A.dirty || M.dirty || t - lastFrame >= interval) {
      if (t - lastFrame >= 33 || A.dirty) {
        lastFrame = t;
        A.dirty = false;
        if (A.assign && Date.now() > A.assign.until) A.finishAssign(null);
        if (A.status.until && Date.now() > A.status.until && !A.assign) {
          A.frameIdx++;
          A.status = { text: RX.font.norm(rotatingStatus()), start: performance.now(), until: Date.now() + 8000, kind: 'rot' };
        }
        const top = A.top();
        const g = U.begin(A.mx, Object.assign(top.st, { pal: sc.pal }), t);
        A.mx.clear();
        try { sc.render(g, top.st, A); }
        catch (err) { console.error(err); A.mx.clear(); A.mx.text('RENDER FAULT', 2, 2, { c: '#FF6B5E' }); A.mx.text(RX.font.fit(String(err.message || err), A.mx.cols - 4), 2, 12, { c: '#FF6B5E', face: 'mini' }); }
        A.mx.present();
        if (U.activeField) U.placeField();
      }
    }
    if (A.lcdDirty || t - lastLcd > 1000) {
      lastLcd = t; A.lcdDirty = false;
      if (!(A.lcdFlicker && Date.now() - A.lcdFlicker < 220 && Math.floor(t / 70) % 2)) renderLcd();
      else { A.lcd.clear(); A.lcd.present(); }
    }
    if (t - lastClock > 500) { lastClock = t; renderClock(t); }
  }

  // ---------- data import / export ----------
  A.exportBackup = async function () {
    const data = S.buildBackup();
    const json = JSON.stringify(data, null, 2);
    const name = 'recon-os-backup-' + Date.now() + '.json';
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    try {
      const file = new File([json], name, { type: 'application/json' });
      if (coarse && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'RECON.OS backup' });
      } else {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const a = document.createElement('a'); a.href = url; a.download = name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
      S.saveV2({ lastBackup: Date.now() });
      A.say('BACKUP SAVED · ' + S.pois.length + ' MARKS · ' + U.F.num(S.fog.size) + ' FOG CELLS', 5000);
      A.beep('file'); updateLamps();
    } catch (e) {
      if (e && e.name === 'AbortError') A.say('BACKUP CANCELLED', 2500);
      else { A.say('BACKUP FAILED · ' + (e.message || e), 5000); A.beep('err'); }
    }
  };
  A.importBackup = function () { $('fileImport').value = ''; $('fileImport').click(); };
  $('fileImport').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      let data;
      try { data = JSON.parse(ev.target.result); } catch (err) { A.say('NOT A VALID BACKUP FILE', 5000); A.beep('err'); return; }
      if (!data || !Array.isArray(data.pois)) { A.say('NOT A RECON.OS BACKUP', 5000); A.beep('err'); return; }
      const s = S.summarize(data);
      A.go('confirm', {
        title: 'IMPORT BACKUP', danger: true, confirm: 'REPLACE ALL',
        lines: ['REPLACES ALL DATA ON THIS DEVICE WITH:', s.marks + ' MARKS · ' + s.objectives + ' OBJECTIVES', U.F.num(s.fog) + ' FOG CELLS · ' + s.regions + ' REGIONS', s.fasts + ' FASTS · ' + s.journal + ' LOG ENTRIES', s.exported ? 'SAVED ' + U.F.dateY(Date.parse(s.exported)) + ' ' + U.F.hm(Date.parse(s.exported)) : ''],
        onConfirm: () => {
          try {
            S.applyBackup(data);
            A.home(); centerOnData(); M.dirty = true; updateLamps(); updatePresets();
            A.say('IMPORT COMPLETE · ' + S.pois.length + ' MARKS · ' + S.missions.length + ' OBJECTIVES', 6000); A.beep('file');
          } catch (err) { A.say('IMPORT FAILED · ' + err.message, 6000); A.beep('err'); }
        }
      });
    };
    reader.readAsText(file);
  });

  // photo capture for mark detail
  A.takePhoto = function (cb) { A._photoCb = cb; $('filePhoto').value = ''; $('filePhoto').click(); };
  $('filePhoto').addEventListener('change', e => {
    const file = e.target.files[0]; if (!file) return;
    const usage = S.usage();
    if (usage.bytes / usage.limit > 0.85) { A.say('STORAGE NEARLY FULL · PHOTO NOT SAVED', 5000); A.beep('err'); return; }
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        try {
          const r = Math.min(1, 800 / Math.max(img.width, img.height));
          const w = Math.round(img.width * r), h = Math.round(img.height * r);
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          const cx = cv.getContext('2d'); cx.fillStyle = '#000'; cx.fillRect(0, 0, w, h); cx.drawImage(img, 0, 0, w, h);
          const url = cv.toDataURL('image/jpeg', 0.6);
          if (url.length * 0.75 > 200 * 1024) { A.say('PHOTO TOO LARGE · TRY ANOTHER', 5000); A.beep('err'); return; }
          if (A._photoCb) A._photoCb(url);
          A.say('PHOTO SAVED · ' + Math.round(url.length * 0.75 / 1024) + ' KB', 3000); A.dirty = true;
        } catch (err) { A.say('PHOTO FAILED', 4000); }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });

  // ---------- boot ----------
  function centerOnData() {
    const lp = S.v2.lastPos;
    const home = S.pois.find(p => (p.type === 'HOME' || /^home$/i.test(p.name || '')) && p.category);
    const c = lp || home || S.pois[0] || { lat: 29.7379, lng: -94.9846 };
    M.setView(c.lat, c.lng, S.v2.zoom || 15);
  }
  function boot() {
    S.load();
    A.emptyAtBoot = S.isEmpty();
    M.setSource(S.v2.mapSrc || 'AUTO');
    S.onWriteFail = () => { A.say('STORAGE FULL · WRITE FAILED · EXPORT A BACKUP', 8000); A.beep('err'); };
    A.disp = S.v2.disp || 'region';
    centerOnData();
    U.wireInputs(() => { A.dirty = true; });
    RX.applyBrightness();
    A.stack = [];
    A.go('boot');
    updateLamps(); updatePresets();
    requestAnimationFrame(loop);
    startGps();
    document.addEventListener('pointerdown', () => { if (!A.gps && A.gpsErr) retryGps(); }, { once: true });
    window.addEventListener('pagehide', () => { S.saveV2({ zoom: Math.round(M.zoom * 2) / 2 }); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) S.saveV2({ zoom: Math.round(M.zoom * 2) / 2 }); else { S.pruneTrail(); A.dirty = true; } });
  }
  A.bootDone = function () {
    if (A.booted) return;
    A.booted = true;
    device.classList.remove('booting');
    A.lcdDirty = true;
    A.replace('map');
    if (A.emptyAtBoot && !S.pois.length && !S.missions.length && !S.fasts.length) {
      A.go('confirm', {
        title: 'NO DATA ON THIS DEVICE', confirm: 'IMPORT FILE', cancel: 'START EMPTY',
        lines: ['THIS BROWSER HAS NO DATA.', 'IMPORT YOUR BACKUP FILE', 'TO LOAD MARKS, FOG,', 'OBJECTIVES AND FASTS.'],
        onConfirm: () => A.importBackup(), keepOnConfirm: false
      });
    } else {
      const pend = S.pending().length;
      A.say('RX-90 READY · ' + S.pois.length + ' MARKS' + (pend ? ' · ' + pend + ' PEND' : '') + (S.activeFast() ? ' · FAST RUNNING' : ''), 5000);
    }
  };

  boot();
})();
