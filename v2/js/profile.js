/* =============================================================
   RECON.OS RX-90 · PROFILE
   Four pages: STATUS · BODY · RECORD · FILE, plus the weigh-in
   box and the portrait crop. Everything is worked out from data
   the RP already keeps; the only new record is recon.os.profile.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const S = RX.store, U = RX.ui, F = U.F, C = U.C, FONT = RX.font;
  const HOT = '#E9FFF7', AMB = '#FFB547', GRN = '#6BFF8E', YEL = '#FFE45C', ORG = '#FF9F3A', RED = '#FF5A4E', CYN = '#5CC8FF', GRY = '#6F8580';
  const TIER_C = [null, '#E0560E', '#D8E4E8', '#FFBC00'];
  const ROMAN = ['', 'I', 'II', 'III'];
  const LAD = [16, 24, 36, 48, 72, 100];
  const PAGES = ['STATUS', 'BODY', 'RECORD', 'FILE'];
  const DAY = 864e5, CELL_SQMI = 22500 / 2589988;
  const MONS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const md = ts => { const d = new Date(ts); return MONS[d.getMonth()] + ' ' + F.pad2(d.getDate()); };
  const dayKey = ts => { const d = new Date(ts); return d.getFullYear() + '-' + F.pad2(d.getMonth() + 1) + '-' + F.pad2(d.getDate()); };
  const dayStart = ts => { const d = new Date(ts == null ? Date.now() : ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const weekStart = ts => { const d = new Date(dayStart(ts)); const k = (d.getDay() + 6) % 7; return d.getTime() - k * DAY; };   // Monday
  const dayIdx = () => (new Date().getDay() + 6) % 7;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const measure = (s, face, sc) => FONT.measure(s, face, sc);

  // ======================================================================
  // DATA
  // ======================================================================
  const KEY = 'recon.os.profile';
  const DEF = { name: 'JAR', call: 'THE RUST ORACLE', birth: null, heightIn: null, blood: '', home: 'BAYTOWN TX', units: 'US',
    goalLbs: null, startLbs: null, trainTarget: 2, fastGoal: 18, fieldTarget: 0,
    photo: null, crop: null, bright: 0, contrast: 0, earned: {}, badgesInit: false, days: {}, odo: 0, cityPct: null, cityName: null };
  S.profile = Object.assign({}, DEF);
  let saveT = null;
  S.loadProfile = function () {
    let d = null; try { d = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    S.profile = Object.assign({}, DEF, d || {});
    S.profile.earned = S.profile.earned || {}; S.profile.days = S.profile.days || {};
  };
  S.saveProfile = function (now) {
    clearTimeout(saveT);
    const go = () => { try { localStorage.setItem(KEY, JSON.stringify(S.profile)); } catch (e) { if (S.onWriteFail) S.onWriteFail(KEY); } };
    if (now) go(); else saveT = setTimeout(go, 400);
  };
  S.K.profile = KEY;
  // new ground per day + miles on the trail, counted from here on
  S.noteGround = function (cells) { const k = dayKey(Date.now()), D = S.profile.days; D[k] = (D[k] || 0) + cells; S.saveProfile(); };
  S.noteMiles = function (mi) { S.profile.odo = (S.profile.odo || 0) + mi; S.saveProfile(); };

  // ---------- units ----------
  const metric = () => S.profile.units === 'METRIC';
  const wt = lbs => lbs == null ? '--' : metric() ? (lbs * 0.45359).toFixed(1) : (Math.round(lbs * 10) / 10).toString();
  const wtU = () => metric() ? 'KG' : 'LB';
  const wtD = lbs => { if (lbs == null) return '--'; const v = metric() ? lbs * 0.45359 : lbs; return (Math.abs(v) < 10 ? (Math.round(v * 10) / 10) : Math.round(v)).toString(); };
  const ht = inch => { if (!inch) return '--'; if (metric()) return Math.round(inch * 2.54) + ' CM'; return Math.floor(inch / 12) + "'" + Math.round(inch % 12) + '"'; };
  function parseHeight(s) {
    s = String(s || '').trim().toUpperCase(); if (!s) return null;
    let m = s.match(/^(\d)\s*['F ]\s*(\d{1,2}(?:\.\d)?)?/); if (m) return +m[1] * 12 + (+(m[2] || 0));
    m = s.match(/^(\d{2,3}(?:\.\d)?)\s*CM$/); if (m) return +m[1] / 2.54;
    const n = parseFloat(s); if (!isFinite(n)) return null;
    if (metric() || n > 100) return n / 2.54;
    return n;
  }
  const age = () => { const b = S.profile.birth; if (!b) return null; const d = new Date(b), n = new Date(); let a = n.getFullYear() - d.getFullYear(); if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--; return a; };

  // ---------- callsigns: THE + word + word ----------
  const ADJ = ['RUST', 'IRON', 'QUIET', 'GULF', 'NIGHT', 'COLD', 'SALT', 'GHOST', 'LONG', 'GREY', 'STATIC', 'COPPER', 'HOLLOW', 'LOW', 'SLOW', 'RED', 'BLACK', 'TIDE', 'DUST', 'STONE', 'FERAL', 'ASH', 'STEEL', 'NEON', 'SILENT', 'DEEP', 'NORTH', 'SOUTH', 'WILD', 'LAST'];
  const NOUN = ['ORACLE', 'RANGER', 'SURVEYOR', 'NOMAD', 'WARDEN', 'DRIFTER', 'PROPHET', 'SCOUT', 'MONK', 'PILOT', 'HERMIT', 'CARTOGRAPHER', 'WATCHER', 'MARSHAL', 'PILGRIM', 'SIGNAL', 'COMPASS', 'LANTERN', 'ENGINE', 'HAWK', 'HOUND', 'WOLF', 'FERRYMAN', 'SENTRY', 'ARCHIVIST', 'TRACKER', 'ABBOT', 'BARON', 'MECHANIC', 'SAINT'];
  const reroll = () => { let s; do { s = 'THE ' + ADJ[Math.floor(Math.random() * ADJ.length)] + ' ' + NOUN[Math.floor(Math.random() * NOUN.length)]; } while (s === S.profile.call || s.length > 22); return s; };

  // ======================================================================
  // NUMBERS (worked out fresh each frame — the lists are small)
  // ======================================================================
  const wis = () => S.weighins.filter(w => w && w.lbs).slice().sort((a, b) => a.ts - b.ts);
  const trainedToday = () => S.workouts.find(w => w.type === 'TRAINED' && w.ts >= dayStart());
  const sessionsIn = (a, b) => S.workouts.filter(w => w.ts >= a && w.ts < b).length;

  function weightInfo() {
    const L = wis(), P = S.profile;
    if (!L.length) return { cur: null, col: GRY, val: 'NO DATA', frac: 0, sub: 'WEIGH IN TO START', stale: null };
    const last = L[L.length - 1], cur = last.lbs, start = P.startLbs || L[0].lbs, goal = P.goalLbs;
    const days = Math.floor((Date.now() - last.ts) / DAY);
    const monthAgo = L.filter(w => w.ts <= Date.now() - 28 * DAY).pop() || L[0];
    const ch = cur - monthAgo.lbs;   // change over the month
    let col, val, frac, sub;
    if (goal == null) { val = wt(cur) + ' ' + wtU(); frac = 0; col = GRN; sub = 'SET A GOAL IN FILE'; }
    else {
      const left = cur - goal, dirDown = start >= goal;
      frac = start === goal ? 1 : clamp((start - cur) / (start - goal), 0, 1);
      val = Math.abs(left) < 0.25 ? 'AT GOAL' : (dirDown ? (left > 0 ? '-' + wtD(left) + ' TO GO' : 'PAST GOAL') : (left < 0 ? '+' + wtD(-left) + ' TO GO' : 'PAST GOAL'));
      const toward = dirDown ? -ch : ch;
      col = Math.abs(left) < 0.25 || toward >= 1 ? GRN : toward > -0.5 ? YEL : RED;
      sub = (ch <= -0.05 ? '▼' : ch >= 0.05 ? '▲' : '') + wtD(Math.abs(ch)) + ' ' + wtU() + ' THIS MONTH' + (col === YEL ? ' · SLOW' : '');
    }
    if (days >= 14) { col = GRY; sub = 'LAST WEIGH-IN ' + days + ' DAYS AGO'; }
    return { cur, col, val, frac, sub, stale: days >= 7 ? days : null, last };
  }
  function trainInfo() {
    const T = Math.max(1, S.profile.trainTarget || 2), done = sessionsIn(weekStart(), weekStart() + 7 * DAY), today = trainedToday();
    const need = Math.max(0, T - done), left = 7 - dayIdx();
    const col = need === 0 ? GRN : need > left ? RED : need >= left - 1 ? ORG : YEL;
    const dn = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][dayIdx()];
    const sub = need === 0 ? 'TARGET MET' + (today ? ' · LOGGED ' + F.hm(today.ts) : '') : (today ? 'LOGGED ' + F.hm(today.ts) + ' · ' : dn + ' · ') + (need === 1 ? 'ONE MORE THIS WEEK' : need + ' MORE THIS WEEK');
    return { T, done, col, sub, today };
  }
  function fieldInfo() {
    const ws = weekStart(), n = S.journal.filter(j => j.ts >= ws && (j.type === 'drop' || j.type === 'visit')).length;
    let usual = S.profile.fieldTarget;
    if (!usual) { let tot = 0; for (let k = 1; k <= 8; k++) tot += S.journal.filter(j => j.ts >= ws - k * 7 * DAY && j.ts < ws - (k - 1) * 7 * DAY && (j.type === 'drop' || j.type === 'visit')).length; usual = Math.max(1, Math.round(tot / 8)); }
    const pace = n / (usual * (dayIdx() + 1) / 7);
    return { n, usual, col: n >= usual || pace >= 0.9 ? GRN : pace >= 0.6 ? YEL : ORG, auto: !S.profile.fieldTarget };
  }
  const groundToday = () => S.profile.days[dayKey(Date.now())] || 0;
  function trainWeeks() {
    // weeks with the target met: total and best run of back-to-back weeks
    const T = Math.max(1, S.profile.trainTarget || 2), cnt = {};
    S.workouts.forEach(w => { const k = weekStart(w.ts); cnt[k] = (cnt[k] || 0) + 1; });
    const keys = Object.keys(cnt).map(Number).sort((a, b) => a - b);
    let total = 0, best = 0, run = 0, prev = null, bestEnd = null;
    keys.forEach(k => { if (cnt[k] >= T) { total++; run = (prev != null && Math.round((k - prev) / (7 * DAY)) === 1 && cnt[prev] >= T) ? run + 1 : 1; if (run > best) { best = run; bestEnd = k; } } prev = k; });
    return { total, best, bestEnd };
  }

  // ---------- personal bests ----------
  function bests() {
    const out = [];
    const done = S.fasts.filter(f => f.endTs);
    const lf = done.reduce((m, f) => (!m || (f.hours || 0) > (m.hours || 0)) ? f : m, null);
    const act = S.activeFast(), ah = act ? (Date.now() - act.startTs) / 36e5 : 0;
    if (act && (!lf || ah > (lf.hours || 0))) out.push(['LONGEST FAST', Math.floor(ah) + 'H', 'NOW']);
    else out.push(['LONGEST FAST', lf ? Math.round(lf.hours) + 'H' : '--', lf ? md(lf.startTs) : '']);
    const L = wis(), lw = L.reduce((m, w) => (!m || w.lbs < m.lbs) ? w : m, null);
    out.push(['LOWEST WEIGHT', lw ? wt(lw.lbs) : '--', lw ? md(lw.ts) : '']);
    out.push(['FAST STREAK', String(S.fastStreak().best || 0), '']);
    const tw = trainWeeks();
    out.push(['TRAINING STREAK', tw.best + ' WK', tw.bestEnd ? md(tw.bestEnd) : '']);
    let gk = null, gv = 0; Object.keys(S.profile.days).forEach(k => { if (S.profile.days[k] > gv) { gv = S.profile.days[k]; gk = k; } });
    out.push(['MOST GROUND · DAY', gv ? (gv * CELL_SQMI).toFixed(1) + ' SQ MI' : '--', gk ? md(new Date(gk + 'T12:00').getTime()) : '']);
    const byDay = {}; S.journal.forEach(j => { if (j.type === 'drop') { const k = dayKey(j.ts); byDay[k] = (byDay[k] || 0) + 1; } });
    let mk = null, mv = 0; Object.keys(byDay).forEach(k => { if (byDay[k] > mv) { mv = byDay[k]; mk = k; } });
    out.push(['MOST MARKS · DAY', mv ? String(mv) : '--', mk ? md(new Date(mk + 'T12:00').getTime()) : '']);
    return out;
  }

  // ---------- badges ----------
  const BADGES = [
    { id: 'first', icon: 'STAR', name: 'FIRST LIGHT', desc: 'FILE YOUR FIRST MARK', t: [1, 1, 1], v: () => S.pois.filter(p => p.category).length },
    { id: 'carto', icon: 'DIAMOND', name: 'CARTOGRAPHER', desc: '100 · 500 · 1,000 MARKS', t: [100, 500, 1000], v: () => S.pois.filter(p => p.category).length },
    { id: 'native', icon: 'MONUMENT', name: 'NATIVE SON', desc: 'SEE 25 · 50 · 90% OF YOUR CITY', t: [25, 50, 90], v: () => S.profile.cityPct || 0 },
    { id: 'haul', icon: 'WATER', name: 'LONG HAUL', desc: 'FAST 48 · 72 · 100 HOURS', t: [48, 72, 100], v: () => Math.max(S.fasts.reduce((m, f) => Math.max(m, f.hours || 0), 0), S.activeFast() ? (Date.now() - S.activeFast().startTs) / 36e5 : 0) },
    { id: 'regular', icon: 'HOME', name: 'REGULAR', desc: 'ONE PLACE 10 · 50 · 100 VISITS', t: [10, 50, 100], v: () => S.pois.reduce((m, p) => Math.max(m, p.visits || 0), 0) },
    { id: 'iron', icon: 'GYM', name: 'IRON WEEKS', desc: 'TRAINING TARGET MET 4 · 12 · 26 WEEKS', t: [4, 12, 26], v: () => trainWeeks().total },
    { id: 'days', icon: 'PEAK', name: 'FIELD DAYS', desc: '100 · 365 · 1,000 DAYS ON RECORD', t: [100, 365, 1000], v: () => { const f = S.journal.length ? S.journal.reduce((m, j) => Math.min(m, j.ts), Infinity) : null; return f ? Math.floor((Date.now() - f) / DAY) : 0; } },
    { id: 'gulf', icon: 'ANCHOR', name: 'ON THE GULF', desc: 'MARKS IN 5 · 10 · 25 CITIES', t: [5, 10, 25], v: () => { const names = new Set(); S.pois.forEach(p => { if (!p.category || !p.regionId) return; const r = S.regions.find(x => x.id === p.regionId); if (r) names.add(r.name); }); return names.size; } },
    { id: 'intel', icon: 'EYE', name: 'INTEL', desc: 'FILE 10 · 50 · 100 INTEL MARKS', t: [10, 50, 100], v: () => S.pois.filter(p => p.category === 'INTEL').length },
    { id: 'evid', icon: 'CAMERA', name: 'EVIDENCE', desc: 'ATTACH 10 · 50 · 100 PHOTOS', t: [10, 50, 100], v: () => S.pois.filter(p => p.photo).length },
    { id: 'road', icon: 'FUEL', name: 'LONG ROAD', desc: '1,000 · 5,000 · 10,000 MI ON THE TRAIL', t: [1000, 5000, 10000], v: () => S.profile.odo || 0 },
    { id: 'outsider', icon: 'TREE', name: 'OUTSIDER', desc: 'EXPLORE 100 · 500 · 1,000 SQ MI', t: [100, 500, 1000], v: () => S.fog.size * CELL_SQMI }
  ];
  function badgeState(b) {
    const v = b.v(); let tier = 0; b.t.forEach((x, i) => { if (v >= x) tier = i + 1; });
    const lo = tier ? b.t[tier - 1] : 0, hi = b.t[Math.min(2, tier)];
    const frac = tier >= 3 ? 1 : clamp((v - lo) / Math.max(1e-9, hi - lo), 0, 1);
    return { v, tier, frac };
  }
  // a new tier: a beep and a line on the strip (the first check just records what's already earned)
  function checkBadges(A) {
    const P = S.profile; let fresh = null, changed = false;
    BADGES.forEach(b => { const s = badgeState(b); if (s.tier > (P.earned[b.id] || 0)) { P.earned[b.id] = s.tier; changed = true; if (P.badgesInit) fresh = { b, tier: s.tier }; } });
    if (!P.badgesInit) { P.badgesInit = true; changed = true; }
    if (changed) S.saveProfile();
    if (fresh && A) { A.beep('file'); A.say('BADGE ▸ ' + fresh.b.name + ' · ' + ROMAN[fresh.tier], 6000); A.lcdMsg = null; A.lcdDirty = true; }
  }
  RX.profileCheck = checkBadges;

  // NATIVE SON: share of the home city seen, worked out in the background
  let cityBusy = false;
  function refreshCity(A) {
    if (cityBusy || !RX.area || !RX.vis || !RX.vis.cityPct) return;
    const home = S.pois.find(p => (p.type === 'HOME' || /^home$/i.test(p.name || '')) && p.category);
    const at = home || S.v2.lastPos || { lat: RX.map.lat, lng: RX.map.lng };
    cityBusy = true;
    RX.area.cityAt(at.lat, at.lng).then(c => {
      if (c && c.place) { S.profile.cityPct = RX.vis.cityPct(c.place); S.profile.cityName = c.place.name; S.saveProfile(); checkBadges(A); A.dirty = true; }
    }).catch(() => {}).then(() => { cityBusy = false; });
  }

  // ======================================================================
  // PORTRAIT: photo → dots (crop, sharpen, auto-levels, gamma 2.3, 6 steps)
  // ======================================================================
  const imgCache = {};
  function photoImg(src) {
    if (!src) return null;
    let e = imgCache[src];
    if (!e) { const im = new Image(); e = imgCache[src] = { im, ok: false }; im.onload = () => { e.ok = true; if (U.onAsync) U.onAsync(); }; im.src = src; }
    return e.ok ? e.im : null;
  }
  const PW = 46, PH = 58;
  function defaultCrop(im) { const w = Math.min(im.width, im.height * PW / PH) * 0.8, h = w * PH / PW; return [(im.width - w) / 2, Math.max(0, (im.height - h) * 0.35), w, h]; }
  const cellCache = {};
  function cells(im, crop, w, h, o) {
    const key = im.src.length + ':' + im.src.slice(-40) + ':' + crop.map(v => Math.round(v)).join(',') + ':' + w + 'x' + h + ':' + (o.bright || 0) + ':' + (o.contrast || 0) + ':' + (o.gamma || 0);
    if (cellCache[key]) return cellCache[key];
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const x = cv.getContext('2d'); x.imageSmoothingQuality = 'high';
    x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
    x.drawImage(im, crop[0], crop[1], crop[2], crop[3], 0, 0, w, h);
    const d = x.getImageData(0, 0, w, h).data, L = new Float32Array(w * h);
    for (let i = 0; i < w * h; i++) L[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
    const sharp = o.sharp == null ? 0.6 : o.sharp;
    if (sharp) { const B = L.slice(); for (let j = 1; j < h - 1; j++) for (let i = 1; i < w - 1; i++) { const k = j * w + i, m = (B[k - 1] + B[k + 1] + B[k - w] + B[k + w]) / 4; L[k] = B[k] + (B[k] - m) * sharp; } }
    const so = Array.from(L).sort((a, b) => a - b), lo = so[Math.floor(so.length * 0.04)], hi = so[Math.floor(so.length * 0.96)];
    const out = new Float32Array(w * h), g = o.gamma || 2.3, fl = o.floor == null ? 0.04 : o.floor, ct = 1 + (o.contrast || 0) * 0.22, br = (o.bright || 0) * 0.07;
    for (let i = 0; i < w * h; i++) {
      let v = (L[i] - lo) / Math.max(0.05, hi - lo);
      v = (v - 0.5) * ct + 0.5 + br; v = clamp(v, 0, 1);
      v = Math.round(Math.pow(v, g) * 6) / 6;
      out[i] = v < 0.05 ? 0 : fl + (1 - fl) * v;
    }
    const ks = Object.keys(cellCache); if (ks.length > 24) delete cellCache[ks[0]];
    return (cellCache[key] = out);
  }
  function blit(mx, x0, y0, w, h, L, c, mask) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { let a = L[j * w + i]; if (!a) continue; if (mask) a *= mask(i, j); if (a > 0.02) mx.set(x0 + i, y0 + j, c, a); } }
  function corners(mx, x, y, w, h) {
    mx.frame(x - 2, y - 2, w + 4, h + 4, C.ink, 0.5);
    [[x - 2, y - 2], [x + w + 1, y - 2], [x - 2, y + h + 1], [x + w + 1, y + h + 1]].forEach(([a, b]) => mx.rect(a - 1, b - 1, 3, 3, HOT, 1));
  }
  // any photo as dots (ROLO cards use it): centred crop at the box's shape
  RX.dotPhoto = function (g, src, x, y, w, h) {
    const im = photoImg(src); if (!im) return false;
    const cw = Math.min(im.width, im.height * w / h) * 0.92, ch = cw * h / w;
    blit(g.mx, x, y, w, h, cells(im, [(im.width - cw) / 2, Math.max(0, (im.height - ch) * 0.3), cw, ch], w, h, {}), C.ink);
    return true;
  };
  function drawPortrait(g, x, y) {
    const P = S.profile, im = photoImg(P.photo), mx = g.mx;
    if (im) blit(mx, x, y, PW, PH, cells(im, P.crop || defaultCrop(im), PW, PH, P), C.ink);
    else if (!P.photo) {
      // empty frame: a faint head-and-shoulders outline
      mx.ring(x + 23, y + 22, 10, C.ink, 0.25, 2);
      for (let i = -20; i <= 20; i++) { const yy = y + 56 - Math.round(Math.sqrt(Math.max(0, 400 - i * i)) * 0.7); mx.set(x + 23 + i, yy, C.ink, 0.25); }
      g.mini('NO PHOTO', x + 7, y + 40, { a: 0.5 });
    }
    corners(mx, x, y, PW, PH);
  }

  // ======================================================================
  // BODY FIGURE: a smooth body of capsules, ray-marched into dots
  // ======================================================================
  function sdCap(px, py, pz, a, b, r) {
    const pax = px - a[0], pay = py - a[1], paz = pz - a[2], bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
    const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
    const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
  }
  function sdEll(px, py, pz, c, r) {
    const qx = (px - c[0]) / r[0], qy = (py - c[1]) / r[1], qz = (pz - c[2]) / r[2];
    const k0 = Math.sqrt(qx * qx + qy * qy + qz * qz), k1 = Math.sqrt(qx * qx / (r[0] * r[0]) + qy * qy / (r[1] * r[1]) + qz * qz / (r[2] * r[2]));
    return k0 * (k0 - 1) / Math.max(1e-6, k1);
  }
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  function bodyFn(B) {
    return function (x, y, z) {
      let d = sdEll(x, y, z, [0, 0.915, 0], [0.056, 0.068, 0.062]);
      d = smin(d, sdCap(x, y, z, [0, 0.81, 0], [0, 0.87, 0.005], 0.032), 0.03);
      d = smin(d, sdEll(x, y, z, [0, 0.715, 0], [0.14 * B, 0.1, 0.085 * B]), 0.05);
      d = smin(d, sdEll(x, y, z, [0, 0.6, 0], [0.118 * B, 0.1, 0.08 * B]), 0.06);
      d = smin(d, sdEll(x, y, z, [0, 0.52, 0], [0.115 * B, 0.07, 0.078 * B]), 0.05);
      for (let s = -1; s <= 1; s += 2) {
        d = smin(d, sdEll(x, y, z, [s * 0.15 * B, 0.765, 0], [0.045, 0.04, 0.045]), 0.04);
        d = smin(d, sdCap(x, y, z, [s * 0.158 * B, 0.75, 0], [s * 0.175 * B, 0.6, -0.005], 0.034 * B), 0.025);
        d = smin(d, sdCap(x, y, z, [s * 0.175 * B, 0.6, -0.005], [s * 0.185 * B, 0.46, 0.015], 0.028 * B), 0.02);
        d = smin(d, sdEll(x, y, z, [s * 0.188 * B, 0.42, 0.018], [0.02, 0.038, 0.015]), 0.02);
        d = smin(d, sdCap(x, y, z, [s * 0.065 * B, 0.47, 0], [s * 0.07 * B, 0.27, 0.008], 0.056 * B), 0.035);
        d = smin(d, sdCap(x, y, z, [s * 0.07 * B, 0.27, 0.008], [s * 0.066, 0.055, -0.005], 0.04 * B), 0.025);
        d = smin(d, sdCap(x, y, z, [s * 0.066, 0.03, -0.012], [s * 0.07, 0.022, 0.06], 0.023), 0.02);
      }
      return d;
    };
  }
  const NFR = 48, FW = 64, FH = 124;
  let figKey = null, frames = [];
  function figureFrame(B, k) {
    const key = B.toFixed(3);
    if (key !== figKey) { figKey = key; frames = []; }
    if (frames[k]) return frames[k];
    const body = bodyFn(B), ang = k / NFR * Math.PI * 2, ca = Math.cos(ang), sa = Math.sin(ang), sc = 1 / FH;
    const out = new Float32Array(FW * FH), lim = 0.3 * B;
    for (let j = 0; j < FH; j++) for (let i = 0; i < FW; i++) {
      const X = (i - FW / 2 + 0.5) * sc, Y = 1 - (j + 0.5) * sc;
      if (Math.abs(X) > lim) continue;
      let z = -0.5, hit = false, px = 0, py = Y, pz = 0;
      for (let s = 0; s < 48; s++) { px = X * ca + z * sa; pz = -X * sa + z * ca; const d = body(px, py, pz); if (d < 0.0015) { hit = true; break; } z += d * 0.9; if (z > 0.5) break; }
      if (!hit) continue;
      const e = 0.004;
      let nx = body(px + e, py, pz) - body(px - e, py, pz), ny = body(px, py + e, pz) - body(px, py - e, pz), nz = body(px, py, pz + e) - body(px, py, pz - e);
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      const vx = nx * ca - nz * sa, vz = nx * sa + nz * ca;
      const lam = Math.max(0, -0.5 * vx + 0.45 * ny - 0.74 * vz), rim = Math.pow(1 - Math.abs(vz), 3);
      let v = 0.1 + 0.8 * Math.pow(lam, 1.3) + 0.45 * rim; if (j % 3 === 2) v *= 0.55;
      out[j * FW + i] = Math.min(1, Math.round(v * 5) / 5);
    }
    return (frames[k] = out);
  }
  const bmiOf = (lbs, inch) => lbs && inch ? 703 * lbs / (inch * inch) : null;
  const buildOf = bmi => bmi == null ? 1.08 : clamp(0.86 + (bmi - 21) * 0.035, 0.85, 1.45);
  const frameName = bmi => bmi == null ? 'SET HEIGHT' : bmi < 18.5 ? 'LEAN FRAME' : bmi < 25 ? 'MEDIUM FRAME' : bmi < 30 ? 'SOLID FRAME' : 'HEAVY FRAME';
  const bmiRange = b => b < 18.5 ? 'UNDER 18.5' : b < 25 ? 'RANGE 18.5-25' : b < 30 ? 'RANGE 25-30' : 'OVER 30';

  // ======================================================================
  // SHARED BITS
  // ======================================================================
  function seg(mx, x, y, w, f, col, mark) { const n = Math.floor(w / 3); for (let i = 0; i < n; i++) mx.rect(x + i * 3, y, 2, 5, col, i < Math.round(f * n) ? 1 : 0.13); if (mark != null) mx.vline(x + Math.round(mark * n) * 3 - 1, y - 1, 7, HOT, 1); }
  function pips(mx, x, y, w, done, target, col) { const gw = Math.floor((w - (target - 1) * 2) / target); for (let i = 0; i < target; i++) mx.rect(x + i * (gw + 2), y, gw, 5, col, i < done ? 1 : 0.13); }
  function header(g, st, A) {
    g.header('PROFILE · ' + PAGES[st.pg], (st.pg + 1) + '/4');
    return 13;
  }
  function turn(st, A, pg) {
    U.closeField(true);
    st.pg = pg; st.scroll = 0; st.sel = 0; st.jog = false; st.edit = null;
    S.saveV2({ profPage: st.pg });
    A.dirty = true;
    if (st.pg === 2) checkBadges(A);
  }

  // ======================================================================
  // PAGE 1 · STATUS
  // ======================================================================
  function pageStatus(g, st, A, still) {
    const W = g.W, H = g.H, mx = g.mx, P = S.profile;
    drawPortrait(g, 4, 16);
    const tx = PW + 10;
    let y = 16;
    g.text(FONT.fit(P.name || 'NAME?', W - tx - 2, 'std', 2), tx, y, { s: 2, c: P.name ? HOT : C.ink, a: P.name ? 1 : 0.4 }); y += 16;
    g.mini(FONT.fit(P.call || '', W - tx - 2, 'mini'), tx, y, { c: AMB, a: 1 }); y += 9;
    const wi = weightInfo(), a = age();
    [['AGE', a == null ? '--' : String(a)], ['HEIGHT', ht(P.heightIn)], ['WEIGHT', wi.cur == null ? '--' : wt(wi.cur) + ' ' + wtU()], ['BLOOD', P.blood || '--']].forEach(r => {
      g.mini(r[0], tx, y + 1, { a: 0.6 }); g.textR(r[1], W - 2, y, { c: r[1] === '--' ? C.ink : HOT, a: r[1] === '--' ? 0.35 : 1 }); y += 10;
    });
    y = Math.max(y, 16 + PH + 2) + 2;
    mx.hline(0, y, W, C.ink, 0.3, 2); y += 4;
    const row = (label, draw, val, col, sub) => { g.mini(label, 1, y + 1, { a: 0.7 }); draw(); g.textR(val, W - 2, y, { c: col }); if (sub) g.mini(FONT.fit(sub, W - 32, 'mini'), 30, y + 8, { c: col, a: 0.8 }); y += 18; };
    const BW = Math.min(66, W - 96);
    row('WEIGHT', () => seg(mx, 30, y + 1, BW, wi.frac, wi.col), wi.val, wi.col, wi.sub);
    const tr = trainInfo();
    row('TRAIN', () => pips(mx, 30, y + 1, BW, Math.min(tr.done, tr.T), tr.T, tr.col), tr.done + ' / ' + tr.T, tr.col, tr.sub);
    // fast: amber, a ladder of rungs from 16 to 100 hours
    const f = S.activeFast(), fs = S.fastStreak();
    g.mini('FAST', 1, y + 1, { a: 0.7 });
    if (!f) {
      seg(mx, 30, y + 1, BW, 0, AMB); g.textR('READY', W - 2, y, { c: AMB });
      const last = S.fasts.filter(x => x.endTs).sort((a, b) => b.endTs - a.endTs)[0], best = S.fasts.reduce((m, x) => Math.max(m, x.hours || 0), 0);
      g.mini(FONT.fit(last ? 'LAST ' + Math.round(last.hours) + 'H · ' + Math.max(0, Math.round((Date.now() - last.endTs) / DAY)) + ' DAYS AGO · BEST ' + Math.round(best) + 'H' : 'START ONE FROM FAST', W - 32, 'mini'), 30, y + 8, { c: AMB, a: 0.8 });
    } else {
      const h = (Date.now() - f.startTs) / 36e5, nx = LAD.find(m => h < m), pv = [0].concat(LAD).filter(m => m <= h).pop();
      seg(mx, 30, y + 1, BW, nx ? (h - pv) / (nx - pv) : 1, AMB); g.textR(Math.floor(h) + 'H', W - 2, y, { c: AMB });
      let sx = 30; LAD.forEach(m => { const on = h >= m, t = String(m); g.mini(t, sx, y + 8, { c: on ? HOT : (m === P.fastGoal ? HOT : AMB), a: on ? 1 : (m === P.fastGoal ? 0.6 : 0.35) }); sx += measure(t, 'mini') + 4; });
      g.mini(nx ? Math.ceil(nx - h) + 'H TO ' + nx : 'PAST 100', sx + 2, y + 8, { c: AMB, a: 0.8 });
    }
    y += 18;
    const fi = fieldInfo();
    row('FIELD', () => seg(mx, 30, y + 1, BW, Math.min(1, fi.n / fi.usual), fi.col), fi.n + ' / ' + fi.usual, fi.col, 'MARKS + VISITS · ' + (fi.auto ? 'AVG ' + fi.usual + '/WK' : 'TARGET ' + fi.usual + '/WK'));
    y += 1; mx.hline(0, y, W, C.ink, 0.3, 2); y += 4;

    // status tags
    const tags = [];
    if (f) tags.push(['FASTING ' + Math.floor((Date.now() - f.startTs) / 36e5) + 'H', CYN]);
    if (fs.current >= 2) tags.push(['STREAK ' + fs.current, CYN]);
    if (f) { const h = (Date.now() - f.startTs) / 36e5, r = LAD.filter(m => m <= h).pop(); if (r) tags.push([r + 'H RUNG', CYN]); }
    if (groundToday() > 0) tags.push(['NEW GROUND', CYN]);
    if (tr.today) tags.push(['TRAINED TODAY', CYN]);
    const pend = S.pending().length; if (pend) tags.push([pend + ' PENDING', ORG]);
    if (!S.v2.lastBackup || Date.now() - S.v2.lastBackup > 7 * DAY) tags.push(['BACKUP DUE', ORG]);
    if (S.missions.some(m => m.status === 'active' && m.deadline && m.deadline < Date.now())) tags.push(['OBJECTIVE OVERDUE', ORG]);
    if (wi.stale) tags.push(['LAST WEIGH-IN ' + wi.stale + 'D', GRY]);
    const keyTop = H - 11, maxY = keyTop - 13;
    let x = 1;
    for (const t of tags) {
      const w = measure(t[0], 'mini') + 6;
      if (x + w > W) { x = 1; y += 11; }
      if (y > maxY) break;
      mx.frame(x, y, w, 9, t[1], 1); g.mini(t[0], x + 3, y + 2, { c: t[1], a: 1 }); x += w + 3;
    }
    if (still) return;
    // the two log keys
    mx.clearRect(0, keyTop - 2, W, 13);
    mx.hline(0, keyTop - 2, W, C.ink, 0.3, 2);
    const bw = Math.floor((W - 4) / 2);
    g.btn(1, keyTop, bw, 10, '+ WEIGH IN', () => A.go('weighin'), { c: YEL });
    st.trainRect = { x: 3 + bw, y: keyTop, w: bw, h: 10 };
    g.btn(3 + bw, keyTop, bw, 10, tr.today ? 'TRAINED ✓' : 'TRAINED', () => {
      if (trainInfo().today) { A.say('HOLD TRAINED TO UNDO', 2500); return; }
      S.workouts.push({ id: S.healthId('WO'), ts: Date.now(), type: 'TRAINED', durationMin: null, intensity: null, distanceMi: null, sets: null, notes: '' });
      S.saveWorkouts(); A.beep('ok');
      const t2 = trainInfo(); A.say(t2.done >= t2.T ? 'TRAINED · TARGET MET · ' + t2.done + '/' + t2.T : 'TRAINED · ' + t2.done + '/' + t2.T + ' THIS WEEK', 3500);
      checkBadges(A);
    }, { c: tr.today ? GRN : ORG, on: !!tr.today });
  }
  function undoTrained(A) {
    const t = trainedToday(); if (!t) return;
    S.workouts = S.workouts.filter(w => w !== t); S.saveWorkouts();
    A.beep('thunk', 0.8); A.say('TRAINED UNDONE', 2500); A.dirty = true;
  }

  // ======================================================================
  // PAGE 2 · BODY
  // ======================================================================
  function pageBody(g, st, A) {
    const W = g.W, H = g.H, mx = g.mx, P = S.profile, wi = weightInfo();
    const fx = 12, fy = 17, fw = FW, fh = FH;
    for (let f = 0; f <= 7; f++) { const y = fy + fh - Math.round(f * 12 / 70 * fh); if (y < fy - 2) break; mx.hline(2, y, 6, C.ink, 0.6); g.mini(f + "'", 1, y - 6, { a: 0.45 }); }
    mx.vline(4, fy, fh, C.ink, 0.3, 2);
    const bmi = bmiOf(wi.cur, P.heightIn), B = buildOf(bmi);
    const auto = Date.now() - (st.spunAt || 0) > 4000;
    if (auto) st.ang = ((st.ang || 0) + 1 / 7) % NFR;
    const k = Math.floor(st.ang || 0) % NFR;
    blit(mx, fx, fy, fw, fh, figureFrame(B, (k + NFR) % NFR), CYN);
    // turntable
    const rx = fw * 0.45, ry = fw * 0.1, cy = fy + fh - 1, ang = k / NFR * Math.PI * 2;
    for (let t = 0; t < 120; t++) { const a = t / 120 * Math.PI * 2; mx.set(fx + fw / 2 + Math.cos(a) * rx, cy + Math.sin(a) * ry, CYN, Math.sin(a) > 0 ? 0.6 : 0.25); }
    for (let t = 0; t < 12; t++) { const a = t / 12 * Math.PI * 2 + ang; mx.set(fx + fw / 2 + Math.cos(a) * rx, cy + Math.sin(a) * ry, HOT, Math.sin(a) > 0 ? 1 : 0.4); }
    // callouts
    const cx = 88; let y = 18;
    const call = (lab, val, sub, ty, c) => { g.mini(lab, cx, y, { a: 0.6 }); g.text(FONT.fit(val, W - cx - 1), cx, y + 7, { c: c || HOT }); if (sub) g.mini(FONT.fit(sub, W - cx - 1, 'mini'), cx, y + 16, { c: c || C.ink, a: 0.75 }); mx.line(cx - 3, y + 10, fx + fw - 6, ty, CYN, 0.45, 2); mx.set(fx + fw - 6, ty, HOT, 1); y += sub ? 27 : 20; };
    call('HEIGHT', ht(P.heightIn), P.heightIn ? (metric() ? Math.floor(P.heightIn / 12) + "'" + Math.round(P.heightIn % 12) + '"' : Math.round(P.heightIn * 2.54) + ' CM') : 'SET IN FILE', fy + 4);
    call('WEIGHT', wi.cur == null ? '--' : wt(wi.cur) + ' ' + wtU(), P.goalLbs ? 'GOAL ' + wt(P.goalLbs) : 'NO GOAL SET', fy + 48, wi.cur == null ? null : YEL);
    call('BUILD', frameName(bmi), 'FROM HT + WT', fy + 40);
    call('BMI', bmi ? bmi.toFixed(1) : '--', bmi ? bmiRange(bmi) : 'NEEDS HT + WT', fy + 60, bmi ? (bmi >= 25 ? YEL : GRN) : null);
    // weight · 90 days
    const gx = 2, gw = W - 4, gh = 18, gy = Math.max(fy + fh + 12, H - 12 - gh - 6);
    const L = wis().filter(w => w.ts >= Date.now() - 90 * DAY);
    g.mini('WEIGHT · 90 DAYS', gx, gy - 8, { a: 0.6 });
    mx.frame(gx, gy - 1, gw, gh + 2, C.ink, 0.25);
    if (L.length < 2) { g.mini('WEIGH IN A FEW TIMES TO DRAW THIS', gx + 4, gy + 6, { a: 0.45 }); return; }
    const d = L[L.length - 1].lbs - L[0].lbs;
    g.miniR((d <= 0 ? '▼' : '▲') + wtD(Math.abs(d)) + ' ' + wtU(), W - 2, gy - 8, { c: d <= 0 ? GRN : YEL, a: 1 });
    let lo = Math.min(...L.map(w => w.lbs)), hi = Math.max(...L.map(w => w.lbs));
    if (P.goalLbs) { lo = Math.min(lo, P.goalLbs); hi = Math.max(hi, P.goalLbs); }
    lo -= 1; hi += 1;
    const t0 = Date.now() - 90 * DAY, X = ts => gx + 2 + (ts - t0) / (90 * DAY) * (gw - 4), Y = v => gy + gh - (v - lo) / (hi - lo) * gh;
    if (P.goalLbs) { const yy = Math.round(Y(P.goalLbs)); mx.hline(gx + 1, yy, gw - 2, AMB, 0.7, 3); g.miniR(wt(P.goalLbs), W - 4, yy - 6, { c: AMB, a: 1 }); }
    for (let i = 1; i < L.length; i++) mx.line(X(L[i - 1].ts), Y(L[i - 1].lbs), X(L[i].ts), Y(L[i].lbs), YEL, 1);
  }

  // ======================================================================
  // PAGE 3 · RECORD
  // ======================================================================
  function pageRecord(g, st, A) {
    const W = g.W, mx = g.mx;
    let y = 15;
    y = g.section('PERSONAL BESTS', y - 1) - 1;
    bests().forEach(r => { g.mini(r[0], 1, y + 1, { a: 0.75 }); if (r[2]) g.miniR(r[2], 98, y + 1, { a: 0.45 }); g.textR(r[1], W - 2, y, { c: r[1] === '--' ? C.ink : HOT, a: r[1] === '--' ? 0.35 : 1 }); mx.hline(1, y + 9, W - 3, C.ink, 0.08, 2); y += 11; });
    y += 3;
    const SB = BADGES.map(badgeState), earned = SB.filter(s => s.tier).length;
    y = g.section('BADGES', y - 1, earned + ' OF ' + BADGES.length + ' EARNED') - 1;
    const cols = 6, tw = Math.min(26, Math.floor((W - 1) / cols) - 1), th = 24;
    st.badge = clamp(st.badge || 0, 0, BADGES.length - 1);
    BADGES.forEach((b, i) => {
      const s = SB[i], x = 1 + (i % cols) * (tw + 1), yy = y + Math.floor(i / cols) * (th + 1), t = s.tier, col = t ? TIER_C[t] : C.ink, on = i === st.badge;
      mx.frame(x, yy, tw, th, on ? HOT : col, on ? 1 : t ? 0.7 : 0.2); if (on) mx.frame(x + 1, yy + 1, tw - 2, th - 2, HOT, 0.5);
      mx.icon(b.icon, x + Math.floor((tw - 7) / 2), yy + 4, { c: col, a: t ? 1 : 0.25 });
      for (let k = 0; k < 3; k++) mx.rect(x + Math.floor(tw / 2) - 6 + k * 5, yy + 15, 3, 3, k < t ? col : C.ink, k < t ? 1 : 0.18);
      if (!t) { const pw = Math.round((tw - 6) * s.frac); mx.rect(x + 3, yy + 20, tw - 6, 1, C.ink, 0.18); if (pw) mx.rect(x + 3, yy + 20, pw, 1, C.ink, 0.7); }
      g.hit(x, yy, tw, th, () => { st.badge = i; A.beep('jog'); });
    });
    y += 2 * (th + 1) + 3;
    const b = BADGES[st.badge], s = SB[st.badge], t = s.tier, tc = t ? TIER_C[t] : C.ink;
    mx.frame(1, y, W - 3, 26, tc, 0.6); mx.icon(b.icon, 4, y + 4, { c: tc });
    g.text(FONT.fit(b.name + (t ? ' · ' + ROMAN[t] : ''), W - 70), 14, y + 4, { c: t ? tc : HOT });
    g.mini(FONT.fit(b.desc, W - 18, 'mini'), 14, y + 13, { a: 0.8 });
    g.miniR(t === 3 ? 'MAXED' : Math.floor(s.frac * 100) + '% TO ' + ROMAN[t + 1], W - 4, y + 5, { c: AMB, a: 1 });
    if (b.id === 'native') g.mini(FONT.fit(S.profile.cityName ? S.profile.cityName.toUpperCase() + ' ' + Math.round(S.profile.cityPct || 0) + '%' : 'READING YOUR CITY...', W - 18, 'mini'), 14, y + 19, { a: 0.5 });
  }

  // ======================================================================
  // PAGE 4 · FILE
  // ======================================================================
  const BLOODS = ['', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
  const FASTG = [16, 18, 20, 24, 36, 48, 72, 100];
  const FIELDT = [0, 5, 8, 10, 15, 20, 30];
  function pageFile(g, st, A) {
    const W = g.W, mx = g.mx, P = S.profile;
    if (st.edit && !(U.activeField && U.activeField.key === 'pf-' + st.edit)) st.edit = null;
    let y = g.scrollBegin(13, g.H - 12) + 2;
    const sect = (t) => { y = g.section(t, y) ; };
    // a row: label left, value right; tap = act. kind:'text'|'number'|'date' rows turn into a field while editing
    const row = (label, val, col, act, o) => {
      o = o || {};
      if (st.edit && st.edit === o.key) {
        g.mini(label, 2, y + 3, { c: HOT, a: 1 });
        g.field('pf-' + o.key, 62, y, W - 64, 11, Object.assign({ value: o.raw == null ? '' : String(o.raw) }, o.field));
        y += 13; return;
      }
      const sel = g.row(0, y, W - 2, 11, act);
      g.mini(label, 2, y + 3, { a: sel ? 1 : 0.7, c: sel ? HOT : C.ink });
      if (o.hint) g.mini(o.hint, 66, y + 3, { a: 0.4 });
      g.textR(FONT.fit(val || '--', W - 70), W - 4, y + 2, { c: val ? (col || HOT) : C.ink, a: val ? 1 : 0.35 });
      y += 12;
    };
    const edit = (key, rawVal, field) => () => {
      st.edit = key;
      U.fieldRects['pf-' + key] = { x: 62, y: 0, w: W - 64, h: 11 };
      U.openField('pf-' + key, Object.assign({ value: rawVal == null ? '' : String(rawVal) }, field, { onCommit: v => { st.edit = null; field.onCommit(v); S.saveProfile(); A.dirty = true; } }));
    };
    const fld = (key, raw, kind, onCommit, extra) => ({ key, raw, field: Object.assign({ kind, maxLen: 24, onCommit: v => { st.edit = null; onCommit(v); S.saveProfile(); A.dirty = true; } }, extra || {}) });

    sect('ID');
    const fName = fld('name', P.name, 'text', v => { P.name = String(v || '').trim().toUpperCase().slice(0, 12); });
    row('NAME', P.name, HOT, edit('name', P.name, fName.field), fName);
    // callsign: tap the row to reroll; TYPE writes your own
    const fCall = fld('call', P.call, 'text', v => { const s = String(v || '').trim().toUpperCase(); if (s) P.call = s.slice(0, 22); });
    if (st.edit === 'call') row('CALLSIGN', P.call, AMB, null, fCall);
    else {
      const sel = g.row(0, y, W - 30, 11, () => { P.call = reroll(); S.saveProfile(); A.beep('jog'); A.say('CALLSIGN ▸ ' + P.call, 2500); });
      g.mini('CALLSIGN', 2, y + 3, { a: sel ? 1 : 0.7, c: sel ? HOT : C.ink });
      g.textR(FONT.fit(P.call, W - 72), W - 32, y + 2, { c: AMB });
      g.btn(W - 28, y, 26, 11, 'TYPE', edit('call', P.call, fCall.field), { face: 'mini' });
      y += 12;
    }
    const fBirth = fld('birth', P.birth, 'date', v => { if (v) P.birth = v; });
    row('BIRTHDAY', P.birth ? 'AGE ' + age() : '', HOT, () => { st.edit = 'birth'; U.fieldRects['pf-birth'] = { x: 62, y: 0, w: W - 64, h: 11 }; U.openField('pf-birth', Object.assign({ value: P.birth }, fBirth.field)); }, Object.assign(fBirth, { hint: P.birth ? md(P.birth) : '' }));
    const fH = fld('height', P.heightIn ? (metric() ? Math.round(P.heightIn * 2.54) : Math.floor(P.heightIn / 12) + "'" + Math.round(P.heightIn % 12)) : '', 'text', v => { const n = parseHeight(v); if (n && n > 36 && n < 96) P.heightIn = Math.round(n * 10) / 10; else if (v) A.say(metric() ? 'HEIGHT IN CM · e.g. 178' : "HEIGHT · e.g. 5'10", 3000); }, { placeholder: metric() ? 'CM' : "5'10" });
    row('HEIGHT', P.heightIn ? ht(P.heightIn) : '', HOT, edit('height', fH.raw, fH.field), fH);
    row('BLOOD', P.blood, HOT, () => { P.blood = BLOODS[(BLOODS.indexOf(P.blood) + 1) % BLOODS.length]; S.saveProfile(); A.beep('jog'); }, { hint: 'TAP TO STEP' });
    const fHome = fld('home', P.home, 'text', v => { P.home = String(v || '').trim().toUpperCase().slice(0, 20); });
    row('HOME', P.home, HOT, edit('home', P.home, fHome.field), fHome);
    row('PORTRAIT', P.photo ? 'CROP ▸' : 'ADD ▸', CYN, () => { if (P.photo) A.go('portrait'); else A.pickPortrait(url => { P.photo = url; P.crop = null; S.saveProfile(true); A.go('portrait'); }); });
    y += 3; sect('GOALS');
    const toLbs = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? (metric() ? n / 0.45359 : n) : null; };
    const fGoal = fld('goal', P.goalLbs ? wt(P.goalLbs) : '', 'number', v => { const n = toLbs(v); if (n && n > 60 && n < 600) P.goalLbs = Math.round(n * 10) / 10; else if (v === '' ) P.goalLbs = null; });
    row('GOAL WEIGHT', P.goalLbs ? wt(P.goalLbs) + ' ' + wtU() : '', YEL, edit('goal', fGoal.raw, fGoal.field), fGoal);
    const fStart = fld('start', P.startLbs ? wt(P.startLbs) : '', 'number', v => { const n = toLbs(v); if (n && n > 60 && n < 600) P.startLbs = Math.round(n * 10) / 10; else if (v === '') P.startLbs = null; }, { placeholder: 'FIRST WEIGH-IN' });
    const L = wis();
    row('START WEIGHT', P.startLbs ? wt(P.startLbs) + ' ' + wtU() : (L.length ? wt(L[0].lbs) + ' ' + wtU() : ''), YEL, edit('start', fStart.raw, fStart.field), Object.assign(fStart, { hint: P.startLbs ? '' : 'AUTO' }));
    row('TRAIN / WEEK', String(P.trainTarget), ORG, () => { P.trainTarget = P.trainTarget % 7 + 1; S.saveProfile(); A.beep('jog'); });
    row('FAST GOAL', P.fastGoal + 'H', AMB, () => { P.fastGoal = FASTG[(FASTG.indexOf(P.fastGoal) + 1) % FASTG.length]; S.saveProfile(); A.beep('jog'); });
    row('FIELD', P.fieldTarget ? P.fieldTarget + ' / WK' : 'AUTO', GRN, () => { P.fieldTarget = FIELDT[(FIELDT.indexOf(P.fieldTarget) + 1) % FIELDT.length]; S.saveProfile(); A.beep('jog'); }, { hint: P.fieldTarget ? '' : 'YOUR USUAL WEEK' });
    y += 3; sect('UNITS');
    row('WEIGHT · HEIGHT', metric() ? 'KG · CM' : 'LB · FT', HOT, () => { P.units = metric() ? 'US' : 'METRIC'; S.saveProfile(); A.beep('jog'); });
    y += 4;
    g.scrollEnd(y);
  }

  // ======================================================================
  // THE SCREEN
  // ======================================================================
  const JOGS = [['◂ UP', 'DOWN ▸', 'PUSH SELECT · DRUM = PAGE'], ['◂ TURN', 'TURN ▸', 'ROLL THE DRUM FOR PAGES'], ['◂ BADGE', 'BADGE ▸', 'ROLL THE DRUM FOR PAGES'], ['◂ UP', 'DOWN ▸', 'PUSH EDIT · DRUM = PAGE']];
  const DRUM_IDS = ['status', 'body', 'record', 'file'];
  RX.screens.profile = {
    drum: DRUM_IDS,
    enter(st, params, A) { st.pg = params.page != null ? params.page : (S.v2.profPage || 0); st.page = DRUM_IDS[st.pg]; st.ang = 0; st.badge = 0; checkBadges(A); refreshCity(A); },
    onPage(pg, st, A) { turn(st, A, Math.max(0, DRUM_IDS.indexOf(pg))); },
    resume(st, A) { checkBadges(A); },
    animating: st => st.pg === 1 || !!S.activeFast(),
    jogLabels: st => JOGS[st.pg || 0],
    jog(d, st, A) {
      if (st.pg === 1) { st.ang = ((st.ang || 0) + d * 2 + NFR) % NFR; st.spunAt = Date.now(); return; }
      if (st.pg === 2) { st.badge = clamp((st.badge || 0) + d, 0, BADGES.length - 1); return; }
      A.focusJog(d);
    },
    push(st, A) { if (st.pg === 1 || st.pg === 2) return; A.focusPush(); },
    longPress(d, st, A) {
      const r = st.trainRect;
      if (st.pg === 0 && r && d.x >= r.x && d.x < r.x + r.w && d.y >= r.y && d.y < r.y + r.h && trainedToday()) undoTrained(A);
    },
    render(g, st, A) {
      header(g, st, A);
      if (st.pg === 0) pageStatus(g, st, A);
      else if (st.pg === 1) pageBody(g, st, A);
      else if (st.pg === 2) pageRecord(g, st, A);
      else pageFile(g, st, A);
      if (st.pg !== 0) g.footer(A.sayActive() ? A.statusShown(g.t) : ['', 'JOG TURNS · SPINS ON ITS OWN', '◂ ▸ PICK A BADGE', 'TAP A ROW TO CHANGE IT'][st.pg]);
      else if (A.sayActive()) { const y = g.H - 23; g.mx.clearRect(0, y, g.W, 9); g.mini(FONT.fit(A.statusShown(g.t), g.W - 4, 'mini'), 2, y + 2, { c: HOT, a: 1 }); }
    },
    lcd() {
      const wi = weightInfo(), f = S.activeFast(), tr = trainInfo();
      return { rows: [['WT', wi.cur == null ? '--' : wt(wi.cur) + ' ' + wtU() + (S.profile.goalLbs ? ' ▸ ' + wt(S.profile.goalLbs) : '')], ['TRN', tr.done + '/' + tr.T + ' THIS WEEK'], ['FST', f ? Math.floor((Date.now() - f.startTs) / 36e5) + 'H RUNNING' : 'READY · STRK ' + S.fastStreak().current]], tag: 'PRF' };
    }
  };

  // ======================================================================
  // WEIGH-IN BOX (over STATUS)
  // ======================================================================
  RX.screens.weighin = {
    enter(st) { const L = wis(); st.lbs = L.length ? L[L.length - 1].lbs : (S.profile.startLbs || 180); st.prev = L.length ? L[L.length - 1] : null; st.mode = 'jog'; st.str = ''; },
    jogLabels: st => st.mode === 'jog' ? ['◂ -' + (metric() ? '0.1' : '0.2'), '+' + (metric() ? '0.1' : '0.2') + ' ▸', 'PUSH SAVE'] : ['◂ UP', 'DOWN ▸', 'PUSH SELECT'],
    jog(d, st, A) {
      if (st.mode === 'jog') { const step = metric() ? 0.1 / 0.45359 : 0.2; st.lbs = Math.round(clamp(st.lbs + d * step, 60, 600) * 100) / 100; return; }
      A.focusJog(d);
    },
    push(st, A) { if (st.mode === 'jog') { save(st, A); return; } A.focusPush(); },
    render(g, st, A) {
      const W = g.W, mx = g.mx;
      // STATUS sits behind, dimmed, and can't be touched
      const bg = { page: 0 };
      g.header('PROFILE · STATUS', '1/4'); pageStatus(g, bg, A, true);
      U.hits.length = 0; U.focus.length = 0; g.focusIdx = 0; g.selRect = null;
      mx.dimRect(0, 11, W, g.H - 11, 0.25);
      const pad = st.mode === 'pad', bx = 8, by = 24, bw = W - 16, bh = pad ? 150 : 96;
      mx.clearRect(bx, by, bw, bh); mx.frame(bx, by, bw, bh, YEL, 1); mx.rect(bx + 1, by + 1, bw - 2, 10, YEL, 0.15);
      g.text('WEIGH IN', bx + 5, by + 3, { c: YEL }); g.miniR(md(Date.now()), bx + bw - 4, by + 4, { a: 0.7 });
      const half = Math.floor((bw - 8) / 2);
      const keys = (y, l1, f1) => {
        g.btn(bx + 4, y, half, 10, l1, f1);
        g.btn(bx + 6 + half, y, bw - 10 - half, 10, 'SAVE', () => save(st, A), { c: YEL, on: true });
      };
      if (!pad) {
        const v = wt(st.lbs), vw = measure(v, 'std', 3);
        mx.textC('▲', W / 2, by + 16, { c: YEL, a: 0.6 });
        g.text(v, Math.round(W / 2 - vw / 2) - 4, by + 26, { s: 3, c: HOT });
        g.mini(wtU(), Math.round(W / 2 + vw / 2) - 2, by + 38, { a: 0.7 });
        g.hit(bx, by + 14, bw, 40, () => { st.mode = 'pad'; st.str = ''; A.refreshChrome(); });
        mx.textC('▼', W / 2, by + 51, { c: YEL, a: 0.6 });
        if (st.prev) {
          g.mini('LAST ' + wt(st.prev.lbs) + ' · ' + md(st.prev.ts), bx + 5, by + 66, { a: 0.7 });
          const dd = st.lbs - st.prev.lbs; g.textR((dd > 0 ? '+' : dd < 0 ? '-' : '') + wtD(Math.abs(dd)), bx + bw - 4, by + 65, { c: dd <= 0 ? GRN : YEL });
        } else g.mini('FIRST WEIGH-IN', bx + 5, by + 66, { a: 0.7 });
        mx.hline(bx + 1, by + 75, bw - 2, YEL, 0.4, 2);
        keys(by + 80, 'KEYPAD', () => { st.mode = 'pad'; st.str = ''; A.refreshChrome(); });
        g.footer('JOG ' + (metric() ? '0.1' : '0.2') + ' · TAP # = KEYS');
      } else {
        const s = (st.str || '') + (Math.floor(g.t / 450) % 2 ? '_' : ' ');
        g.text(s, Math.round(W / 2 - measure(s, 'std', 2) / 2), by + 16, { s: 2, c: HOT });
        g.mini(wtU(), Math.round(W / 2 + measure(s, 'std', 2) / 2) + 2, by + 22, { a: 0.7 });
        const K = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '<'], kw = Math.floor((bw - 16) / 3), kh = 17;
        K.forEach((k, i) => {
          const x = bx + 6 + (i % 3) * (kw + 2), yy = by + 34 + Math.floor(i / 3) * (kh + 2);
          g.btn(x, yy, kw, kh, k, () => {
            if (k === '<') st.str = (st.str || '').slice(0, -1);
            else if (k === '.' && (st.str || '').includes('.')) return;
            else if ((st.str || '').length < 5) st.str = (st.str || '') + k;
          });
        });
        keys(by + bh - 15, 'JOG', () => { st.mode = 'jog'; A.refreshChrome(); });
        g.footer('TYPE IT IN · ' + wtU());
      }
    }
  };
  function save(st, A) {
    let lbs = st.lbs;
    if (st.mode === 'pad') { const n = parseFloat(st.str); if (!isFinite(n)) { A.say('TYPE A WEIGHT', 2000); A.beep('err'); return; } lbs = metric() ? n / 0.45359 : n; }
    if (!(lbs > 60 && lbs < 600)) { A.say('THAT WEIGHT LOOKS OFF', 2500); A.beep('err'); return; }
    lbs = Math.round(lbs * 10) / 10;
    S.weighins.push({ id: S.healthId('WI'), ts: Date.now(), lbs, condition: S.activeFast() ? 'FASTED' : 'FED', notes: '' });
    S.saveWeighins();
    A.back(); A.beep('ok');
    const d = st.prev ? lbs - st.prev.lbs : 0;
    A.say('WEIGH-IN SAVED · ' + wt(lbs) + ' ' + wtU() + (st.prev ? ' · ' + (d > 0 ? '+' : d < 0 ? '-' : '') + wtD(Math.abs(d)) : ''), 3500);
    checkBadges(A);
  }

  // ======================================================================
  // PORTRAIT CROP
  // ======================================================================
  RX.screens.portrait = {
    enter(st) { const P = S.profile; st.crop = P.crop ? P.crop.slice() : null; st.bright = P.bright || 0; st.contrast = P.contrast || 0; },
    jogLabels: () => ['◂ WIDER', 'CLOSER ▸', 'PUSH SAVE'],
    jog(d, st, A) { zoomBy(st, d > 0 ? 1.08 : 1 / 1.08); },
    push(st, A) { savePortrait(st, A); },
    drag(dx, dy, st) {
      const im = photoImg(S.profile.photo); if (!im || !st.view) return;
      const c = st.crop || (st.crop = defaultCrop(im));
      c[0] = clamp(c[0] + dx / st.view.k, 0, im.width - c[2]); c[1] = clamp(c[1] + dy / st.view.k, 0, im.height - c[3]);
    },
    pinch(f, st) { zoomBy(st, f); },
    render(g, st, A) {
      const W = g.W, H = g.H, mx = g.mx, P = S.profile, im = photoImg(P.photo);
      g.header('PROFILE · PORTRAIT', '4/4');
      if (!im) { g.textC(P.photo ? 'LOADING...' : 'NO PHOTO', W / 2, 60, { a: 0.6 }); g.btn(20, 80, W - 40, 13, 'PICK A PHOTO', () => pick(st, A)); g.footer('THE PHOTO STAYS ON THIS PHONE'); return; }
      const c = st.crop || (st.crop = defaultCrop(im));
      // the whole photo, dim outside the box
      const sw = Math.min(W - 26, Math.round((H - 100) * im.width / im.height)), sh = Math.round(sw * im.height / im.width), sx = Math.round((W - sw) / 2), sy = 14, k = sw / im.width;
      st.view = { k };
      const bx = Math.round(c[0] * k), by = Math.round(c[1] * k), bw = Math.round(c[2] * k), bh = Math.round(c[3] * k);
      blit(mx, sx, sy, sw, sh, cells(im, [0, 0, im.width, im.height], sw, sh, { sharp: 0.3, gamma: 1.6, floor: 0.05 }), C.ink, (i, j) => (i >= bx && i < bx + bw && j >= by && j < by + bh) ? 1 : 0.28);
      mx.frame(sx - 1, sy - 1, sw + 2, sh + 2, C.ink, 0.3);
      mx.frame(sx + bx, sy + by, bw, bh, HOT, 1);
      [[0, 0], [bw - 3, 0], [0, bh - 3], [bw - 3, bh - 3]].forEach(([a, b]) => mx.rect(sx + bx + a, sy + by + b, 3, 3, HOT, 1));
      for (let t = 1; t < 3; t++) { mx.hline(sx + bx + 1, sy + by + Math.round(bh * t / 3), bw - 2, HOT, 0.25, 2); mx.vline(sx + bx + Math.round(bw * t / 3), sy + by + 1, bh - 2, HOT, 0.25, 2); }
      // live preview at the size STATUS shows it
      let y = sy + sh + 6; mx.hline(0, y - 3, W, C.ink, 0.3, 2);
      g.mini('PREVIEW', 4, y, { a: 0.6 });
      const px = 4, py = y + 8;
      blit(mx, px, py, PW, PH, cells(im, c, PW, PH, { bright: st.bright, contrast: st.contrast }), C.ink);
      corners(mx, px, py, PW, PH);
      // sliders: tap along them
      const cx = 58, sw2 = W - cx - 2; let cy = y;
      const maxW = Math.min(im.width, im.height * PW / PH), zoom = maxW / c[2];
      const slider = (lab, f, val, set) => {
        g.mini(lab, cx, cy + 1, { a: 0.7 }); g.textR(val, W - 2, cy, { c: HOT });
        const n = Math.floor(sw2 / 3); for (let i = 0; i < n; i++) mx.rect(cx + i * 3, cy + 9, 2, 4, CYN, i < Math.round(f * n) ? 1 : 0.13);
        g.hit(cx - 2, cy + 6, sw2 + 4, 10, p => { set(clamp((p.x - cx) / sw2, 0, 1)); A.beep('jog'); });
        cy += 18;
      };
      slider('ZOOM', (zoom - 1) / 3, zoom.toFixed(1) + 'X', f => zoomTo(st, 1 + f * 3));
      slider('BRIGHT', (st.bright + 4) / 8, (st.bright > 0 ? '+' : '') + st.bright, f => { st.bright = Math.round(f * 8) - 4; });
      slider('CONTRAST', (st.contrast + 4) / 8, (st.contrast > 0 ? '+' : '') + st.contrast, f => { st.contrast = Math.round(f * 8) - 4; });
      const b2 = Math.floor((sw2 - 3) / 2);
      g.btn(cx, cy + 2, b2, 11, 'PHOTO', () => pick(st, A));
      g.btn(cx + b2 + 3, cy + 2, sw2 - b2 - 3, 11, 'SAVE', () => savePortrait(st, A), { c: GRN, on: true });
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'DRAG BOX · PINCH ZOOM');
    }
  };
  function zoomTo(st, z) {
    const im = photoImg(S.profile.photo); if (!im) return;
    const c = st.crop || (st.crop = defaultCrop(im)), maxW = Math.min(im.width, im.height * PW / PH);
    const w = clamp(maxW / clamp(z, 1, 4), maxW / 4, maxW), h = w * PH / PW, mx = c[0] + c[2] / 2, my = c[1] + c[3] / 2;
    st.crop = [clamp(mx - w / 2, 0, im.width - w), clamp(my - h / 2, 0, im.height - h), w, h];
  }
  function zoomBy(st, f) { const im = photoImg(S.profile.photo); if (!im) return; const c = st.crop || defaultCrop(im), maxW = Math.min(im.width, im.height * PW / PH); zoomTo(st, maxW / c[2] * f); }
  function pick(st, A) { A.pickPortrait(url => { S.profile.photo = url; S.profile.crop = null; st.crop = null; S.saveProfile(true); A.dirty = true; }); }
  function savePortrait(st, A) {
    const P = S.profile; P.crop = st.crop ? st.crop.map(v => Math.round(v * 10) / 10) : null; P.bright = st.bright; P.contrast = st.contrast;
    S.saveProfile(true); A.beep('ok'); A.back(); A.say('PORTRAIT SAVED', 2500);
  }

  // badges keep counting while the RP is on, even with PROFILE closed
  setInterval(() => { if (RX.app && RX.app.booted) checkBadges(RX.app); }, 120000);
})();
