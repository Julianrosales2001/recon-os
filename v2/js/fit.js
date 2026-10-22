/* =============================================================
   RECON.OS RX-90 · FIT
   Exercises you set up once (S.moves) and what you did with them
   (S.workouts, one entry per exercise per day). HLTH ▸ TRAIN:
   a tile per exercise. Tap the name: the whole plan, done. Tap a
   set box: that set; tap it again to count it down. Hold a tile
   to change the exercise. The calendar shows each one in its
   colour, so you can see which days you did what.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const S = RX.store, U = RX.ui, F = U.F, C = U.C, FONT = RX.font;
  const HOT = '#FFE3B8', DAY = 864e5;
  const DL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'], DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const sod = ts => { const d = new Date(ts == null ? Date.now() : ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const addDays = (ts, n) => { const d = new Date(ts); d.setDate(d.getDate() + n); return d.getTime(); };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const measure = (s, f) => FONT.measure(s, f);

  // ======================================================================
  // DATA
  // ======================================================================
  const KM = 'recon.os.moves';
  S.moves = [];
  S.loadMoves = function () { try { S.moves = JSON.parse(localStorage.getItem(KM) || '[]') || []; } catch (e) { S.moves = []; } };
  S.saveMoves = function () { try { localStorage.setItem(KM, JSON.stringify(S.moves)); } catch (e) { if (S.onWriteFail) S.onWriteFail(KM); } };
  S.K.moves = KM;
  S.loadMoves();

  // body areas: what an exercise works (PROFILE ▸ STAT shows how long since each one)
  const AREAS = ['LEGS', 'PUSH', 'PULL', 'CORE', 'CARDIO'];
  const AREA_WORDS = [
    ['CARDIO', /STAIR|BIKE|CYCL|SPIN|SWIM|WALK|RUN|JOG|HIKE|ELLIP|CARDIO|ROWER|ERG|ROPE|SPRINT|TREAD/],
    ['LEGS', /SQUAT|LUNGE|LEG|CALF|GLUTE|HIP THRUST|STEP-UP|STEP UP/],
    ['CORE', /SIT-UP|SIT UP|SITUP|PLANK|CRUNCH|\bABS?\b|CORE|OBLIQUE|HOLLOW|V-UP|RUSSIAN/],
    ['PULL', /DEADLIFT|ROW|PULL|CHIN|CURL|LAT|BICEP|SHRUG|FACE/],
    ['PUSH', /BENCH|PRESS|PUSH|DIP|FLY|TRICEP|SHOULDER|CHEST/]
  ];
  const guessArea = name => { const n = String(name || '').toUpperCase(); for (const [a, re] of AREA_WORDS) if (re.test(n)) return a; return null; };
  // exercises made before areas existed: guess from the name once (change it on the exercise)
  (function () { let ch = false; S.moves.forEach(m => { if (m.area === undefined) { m.area = guessArea(m.name); ch = true; } }); if (ch) S.saveMoves(); })();
  const COLS = ['#FF8C2A', '#3D8BFF', '#6BFF8E', '#FFE45C', '#A46BFF', '#FF5A4E', '#5CC8FF', '#FF8BC4', '#F2F4EC'];
  // [name, counted by, sets, each (reps · seconds · miles), lb, area]
  const PRESETS = [
    ['SQUAT', 'reps', 3, 10, 45, 'LEGS'], ['BENCH', 'reps', 3, 10, 45, 'PUSH'], ['DEADLIFT', 'reps', 3, 5, 95, 'PULL'], ['ROW', 'reps', 3, 10, 45, 'PULL'],
    ['PRESS', 'reps', 3, 8, 45, 'PUSH'], ['LUNGE', 'reps', 3, 10, 0, 'LEGS'], ['CURL', 'reps', 3, 12, 20, 'PULL'], ['PUSH-UP', 'reps', 3, 15, 0, 'PUSH'],
    ['PULL-UP', 'reps', 3, 8, 0, 'PULL'], ['SIT-UP', 'reps', 3, 20, 0, 'CORE'], ['PLANK', 'time', 3, 60, 0, 'CORE'], ['STAIRMASTER', 'time', 1, 1200, 0, 'CARDIO'],
    ['BIKE', 'time', 1, 1800, 0, 'CARDIO'], ['SWIM', 'time', 1, 1200, 0, 'CARDIO'], ['STRETCH', 'time', 1, 600, 0, null], ['WALK', 'dist', 1, 2, 0, 'CARDIO'], ['RUN', 'dist', 1, 3, 0, 'CARDIO']
  ];
  const KINDS = [['reps', 'SETS × REPS'], ['time', 'TIME'], ['dist', 'DISTANCE']];

  // how much one set is, and the step the jog and the ± keys move it by
  const STEP = {
    sets: () => 1,
    reps: () => 1,
    time: v => v < 120 ? 15 : v < 600 ? 60 : 300,
    dist: v => v < 5 ? 0.25 : 0.5,
    lbs: () => 5
  };
  const amtKey = m => m.kind === 'time' ? 'time' : m.kind === 'dist' ? 'dist' : 'reps';
  function amtShort(m, v) {
    if (v == null) return '';
    if (m.kind === 'time') return v < 120 ? v + 'S' : Math.round(v / 60) + 'M';
    if (m.kind === 'dist') return String(Math.round(v * 100) / 100);
    return String(v);
  }
  function amtLong(m, v) {
    if (m.kind === 'time') return v < 120 ? v + ' SEC' : Math.round(v / 60) + ' MIN';
    if (m.kind === 'dist') return (Math.round(v * 100) / 100) + ' MI';
    return v + ' REPS';
  }
  const lbs = n => n ? n + ' LB' : 'BODY';
  function planLine(m) {
    if (m.kind === 'reps') return m.sets + '×' + m.amt + ' · ' + lbs(m.lbs);
    return (m.sets > 1 ? m.sets + ' × ' : '') + amtLong(m, m.amt);
  }

  const logFor = (m, d) => S.workouts.find(w => w.moveId === m.id && w.ts >= d && w.ts < addDays(d, 1));
  const doneIn = sets => (sets || []).filter(v => v != null && v > 0).length;
  const moveById = id => S.moves.find(m => m.id === id);
  const doneOn = (m, d) => { const L = logFor(m, d); return !!(L && doneIn(L.sets)); };
  const plannedOn = (m, d) => !!(m.days && m.days.length && m.days.includes(new Date(d).getDay()));

  // the log keeps the old fields filled too, so v1 and the profile read it
  function sync(L, m) {
    const tot = (L.sets || []).reduce((s, v) => s + (v || 0), 0);
    L.type = m.name; L.kind = m.kind; L.lbs = m.kind === 'reps' ? m.lbs : null;
    L.durationMin = m.kind === 'time' ? Math.round(tot / 60) : null;
    L.distanceMi = m.kind === 'dist' ? Math.round(tot * 100) / 100 : null;
  }
  function ensureLog(m, d) {
    let L = logFor(m, d);
    if (!L) {
      const ts = d === sod() ? Date.now() : d + 12 * 36e5;
      L = { id: S.healthId('WO'), ts, type: m.name, moveId: m.id, kind: m.kind, sets: [], plan: m.sets, lbs: null, durationMin: null, distanceMi: null, intensity: null, notes: '' };
      S.workouts.push(L);
    }
    return L;
  }
  function tidy(L) {
    while (L.sets.length && (L.sets[L.sets.length - 1] == null || L.sets[L.sets.length - 1] <= 0)) L.sets.pop();
    if (!doneIn(L.sets)) S.workouts = S.workouts.filter(w => w !== L);
  }
  function say(A, m, L) {
    const n = L ? doneIn(L.sets) : 0;
    if (!n) { A.say(m.name + ' · CLEARED', 1800); return; }
    const vals = L.sets.filter(v => v != null && v > 0).map(v => amtShort(m, v)).join(' ');
    A.say(m.name + ' · ' + n + '/' + m.sets + ' · ' + vals + (m.kind === 'reps' && m.lbs ? ' @' + m.lbs : ''), 2600);
  }
  // tap the name: every set left in the plan, done as planned
  function allTap(A, m, d) {
    const L0 = logFor(m, d);
    if (L0 && doneIn(L0.sets) >= m.sets) { A.say(m.name + ' DONE ' + (d === sod() ? 'TODAY' : 'THAT DAY') + ' · HOLD TO CHANGE', 2200); A.beep('key'); return; }
    const L = ensureLog(m, d);
    for (let k = 0; k < m.sets; k++) if (L.sets[k] == null || L.sets[k] <= 0) L.sets[k] = m.amt;
    sync(L, m); S.saveWorkouts(); A.beep('fit.done'); say(A, m, L); flash(m.id);
  }
  // tap a box: empty ▸ the planned set · done ▸ one less (reps 10 9 8 … then empty)
  function setTap(A, m, d, k) {
    const L = ensureLog(m, d), v = L.sets[k];
    if (v == null || v <= 0) { L.sets[k] = m.amt; A.beep(doneIn(L.sets) >= m.sets ? 'fit.done' : 'fit.set'); }
    else {
      const step = m.kind === 'reps' ? 1 : STEP[amtKey(m)](v - 0.001);
      L.sets[k] = Math.round((v - step) * 100) / 100;
      if (L.sets[k] <= 0) L.sets[k] = null;
      A.beep('fit.down');
    }
    sync(L, m); tidy(L); S.saveWorkouts(); say(A, m, logFor(m, d)); flash(m.id, k);
  }
  let fl = null;
  const flash = (id, k) => { fl = { id, k: k == null ? -1 : k, t: performance.now() }; };

  // ======================================================================
  // THE TRAIN PAGE (a drum page of HLTH)
  // ======================================================================
  function dayTag(d) {
    const t = sod(), dd = new Date(d);
    const nm = DOW[dd.getDay()] + ' ' + dd.getDate();
    return d === t ? 'TODAY · ' + nm : d === addDays(t, -1) ? 'YESTERDAY · ' + nm : nm + ' ' + MON[dd.getMonth()];
  }
  const sorted = () => S.moves.slice().sort((a, b) => (a.order || 0) - (b.order || 0));

  function page(g, st, A) {
    const W = g.W, H = g.H, mx = g.mx, today = sod();
    if (st.fday == null || st.fday > today || st.fday < addDays(today, -6)) st.fday = today;
    const day = st.fday;
    st.tiles = [];
    g.header('HEALTH · TRAIN', day === today ? MON[new Date(day).getMonth()] + ' ' + new Date(day).getDate() : 'LOGGING BACK', { c: C.amber });
    // the last seven days, today at the right: tap one to log for it
    let y = 13;
    const cw = Math.floor((W - 1) / 7), ch = 20;
    for (let i = 0; i < 7; i++) {
      const d = addDays(today, i - 6), x = 1 + i * cw, isS = d === day, isT = d === today, dd = new Date(d);
      if (isS) { mx.rect(x, y, cw - 1, ch, C.amber, 0.14); mx.frame(x, y, cw - 1, ch, isT ? HOT : C.amber, 1); }
      else mx.frame(x, y, cw - 1, ch, C.amber, 0.12);
      g.mini(DL[dd.getDay()], x + 2, y + 2, { a: 0.5 });
      g.miniR(String(dd.getDate()), x + cw - 3, y + 2, { c: isT ? HOT : C.amber, a: isS || isT ? 1 : 0.65 });
      const did = sorted().filter(m => doneOn(m, d));
      did.slice(0, 5).forEach((m, k) => mx.rect(x + 2 + k * 4, y + ch - 6, 3, 3, m.col, 1));
      const due = sorted().filter(m => !doneOn(m, d) && plannedOn(m, d));
      if (d >= today) due.slice(0, 5 - Math.min(5, did.length)).forEach((m, k) => mx.frame(x + 2 + (did.length + k) * 4, y + ch - 6, 3, 3, m.col, 0.7));
      g.hit(x, y, cw - 1, ch, () => { st.fday = d; st.scroll = 0; A.beep('jog'); });
    }
    y += ch + 3;
    const moves = sorted();
    const doneN = moves.filter(m => doneOn(m, day)).length;
    y = g.section(day === today ? 'TODAY' : dayTag(day), y, moves.length ? doneN + ' OF ' + moves.length + ' DONE' : '');
    let yy = g.scrollBegin(y, H - 12);
    if (!moves.length) {
      g.textC('NO EXERCISES YET', W / 2, yy + 10, { c: HOT });
      g.textC('MAKE ONE ONCE · LOG IT WITH A TAP', W / 2, yy + 22, { face: 'mini', a: 0.6 });
      yy += 36;
    }
    moves.forEach(m => { yy = tile(g, st, A, m, day, yy); });
    g.btn(0, yy, W - 2, 14, '+ NEW EXERCISE', () => A.go('move', {}), { c: C.amber });
    yy += 18;
    // the week so far
    const ws = addDays(today, -new Date(today).getDay());
    let days = 0, sets = 0;
    for (let d = ws; d <= today; d = addDays(d, 1)) { let any = false; moves.forEach(m => { const L = logFor(m, d); if (L && doneIn(L.sets)) { any = true; sets += doneIn(L.sets); } }); if (any) days++; }
    g.mini('THIS WEEK · ' + days + (days === 1 ? ' DAY · ' : ' DAYS · ') + sets + ' SETS', 1, yy, { a: 0.55 });
    yy += 9;
    g.scrollEnd(yy);
    return day === today ? 'TAP ▸ DONE · HOLD ▸ EDIT' : 'LOGGING FOR ' + DOW[new Date(day).getDay()] + ' ' + new Date(day).getDate();
  }

  function tile(g, st, A, m, day, y) {
    const W = g.W, mx = g.mx, L = logFor(m, day), sets = L ? L.sets : [], n = Math.max(m.sets, sets.length);
    const done = doneIn(sets), full = done >= m.sets, h = 27, w = W - 2;
    // the set boxes, right-aligned
    const room = Math.min(98, W - 72), bw = clamp(Math.floor(room / n) - 2, 10, 17), bh = 19, bx0 = w - 3 - n * (bw + 2) + 2;
    const sel = g.focusable(0, y, bx0 - 2, h, () => allTap(A, m, day));
    const pulse = fl && fl.id === m.id && performance.now() - fl.t < 260;
    mx.frame(0, y, w, h, sel ? HOT : m.col, full ? 1 : sel ? 1 : 0.4);
    if (full || pulse) mx.rect(1, y + 1, w - 2, h - 2, m.col, pulse && fl.k < 0 ? 0.3 : 0.1);
    mx.rect(2, y + 2, 2, h - 4, m.col, 1);
    const nm = g.fit(m.name, bx0 - 20);
    const nw = g.text(nm, 7, y + 3, { c: full ? m.col : HOT });
    if (full) g.text('✓', 9 + nw, y + 3, { c: m.col });
    g.mini(g.fit(planLine(m), bx0 - 10, 'mini'), 7, y + 12, { a: 0.75 });
    // the last two weeks, ending on the day: which ones you did it
    for (let k = 0; k < 14; k++) {
      const d = addDays(day, k - 13), on = doneOn(m, d), x = 7 + k * 4;
      if (on) mx.rect(x, y + 20, 3, 3, m.col, k === 13 ? 1 : 0.85);
      else if (plannedOn(m, d)) mx.frame(x, y + 20, 3, 3, m.col, 0.45);
      else mx.rect(x, y + 21, 3, 1, m.col, 0.18);
    }
    for (let k = 0; k < n; k++) {
      const x = bx0 + k * (bw + 2), by = y + 4, v = sets[k], did = v != null && v > 0, short = did && v < m.amt;
      const hot = fl && fl.id === m.id && fl.k === k && performance.now() - fl.t < 260;
      if (did) { mx.rect(x, by, bw, bh, m.col, short ? 0.45 : 0.92); }
      else mx.frame(x, by, bw, bh, m.col, k < m.sets ? 0.5 : 0.25, k < m.sets ? 1 : 2);
      if (hot) mx.frame(x - 1, by - 1, bw + 2, bh + 2, HOT, 1);
      const lab = did ? amtShort(m, v) : amtShort(m, m.amt), face = measure(lab) <= bw - 3 ? 'std' : 'mini';
      g.mx.textC(lab, x + bw / 2, by + (face === 'std' ? 6 : 7), { c: did ? (short ? HOT : '#0B0805') : m.col, a: did ? 1 : 0.35, face });
      g.hit(x, by, bw, bh, () => setTap(A, m, day, k));
    }
    st.tiles.push({ y, h, id: m.id });
    return y + h + 3;
  }

  function lcd(st, A) {
    const today = sod(), moves = sorted(), done = moves.filter(m => doneOn(m, today));
    const ws = addDays(today, -new Date(today).getDay()); let days = 0;
    for (let d = ws; d <= today; d = addDays(d, 1)) if (moves.some(m => doneOn(m, d))) days++;
    const next = moves.find(m => !doneOn(m, today) && plannedOn(m, today)) || moves.find(m => !doneOn(m, today));
    return { rows: [['FIT', moves.length ? done.length + '/' + moves.length + ' TODAY' : 'NO EXERCISES'], ['WEEK', days + (days === 1 ? ' DAY' : ' DAYS')], ['NEXT', next ? next.name + ' ' + planLine(next) : 'ALL DONE']], tag: 'FIT' };
  }

  // ======================================================================
  // MAKE / CHANGE AN EXERCISE
  // ======================================================================
  function draftFrom(p) {
    const [name, kind, sets, amt, lb, area] = p;
    return { name, kind, sets, amt, lbs: lb || 0, area: area || null };
  }
  const nextCol = () => COLS.find(c => !S.moves.some(m => m.col === c)) || COLS[S.moves.length % COLS.length];

  RX.screens.move = {
    pal: 'amber',
    enter(st, params) {
      st.id = params.id || null; st.day = params.day || sod();
      st.d = st.id ? null : Object.assign(draftFrom(PRESETS[0]), { name: '', col: nextCol(), days: [], area: null });
      st.preset = null; st.jk = null;
    },
    jogLabels: st => st.jk ? ['◂ LESS', 'MORE ▸', 'PUSH · DONE'] : ['◂ UP', 'DOWN ▸', 'PUSH SELECT'],
    jog(d, st, A) { if (st.jk) { bumpVal(A, st, st.jk, d); return; } A.focusJog(d); },
    push(st, A) { if (st.jk) { st.jk = null; A.refreshChrome(); return; } A.focusPush(); },
    back(st, A) { if (st.jk) { st.jk = null; A.refreshChrome(); return true; } return false; },
    render(g, st, A) {
      const W = g.W, H = g.H, mx = g.mx, m = st.id ? moveById(st.id) : st.d;
      if (!m) { g.header('EXERCISE'); g.textC('NOT FOUND', W / 2, 40); g.footer('BACK TO RETURN'); return; }
      const save = () => { if (st.id) { if (m.kind === 'reps') { const L = logFor(m, sod()); if (L) { sync(L, m); S.saveWorkouts(); } } S.saveMoves(); } };
      let y = g.header(st.id ? 'EXERCISE' : 'NEW EXERCISE', '', { c: C.amber });
      y = g.scrollBegin(y, H - 12);
      if (!st.id) {
        // presets: one tap fills everything in
        let x = 0;
        PRESETS.forEach((p, i) => {
          const w = measure(p[0], 'mini') + 7;
          if (x + w > W - 2) { x = 0; y += 12; }
          g.btn(x, y, w, 10, p[0], () => { const keep = { col: m.col, days: m.days }; Object.assign(m, draftFrom(p), keep); st.preset = i; st.jk = null; A.beep('jog'); }, { face: 'mini', on: st.preset === i, c: st.preset === i ? m.col : null });
          x += w + 2;
        });
        y += 15;
      }
      g.field('move-name-' + (st.id || 'new'), 0, y, W - 2, 13, { label: 'NAME', value: m.name || '', placeholder: 'OR TYPE YOUR OWN', maxLen: 16, onCommit: v => { m.name = RX.font.norm(String(v || '')).trim().slice(0, 16); st.preset = null; if (!m.area) m.area = guessArea(m.name); save(); } });
      y += 17;
      y = g.section('WORKS', y, 'SHOWS ON PROFILE');
      g.seg(0, y, W - 2, 12, AREAS.concat(['--']).map(a => ({ label: a, on: (m.area || '--') === a, fn: () => { m.area = a === '--' ? null : a; save(); A.beep('jog'); } })), { face: 'mini' });
      y += 16;
      y = g.section('COUNT IT BY', y);
      g.seg(0, y, W - 2, 13, KINDS.map(([k, l]) => ({ label: l, on: m.kind === k, fn: () => {
        if (m.kind === k) return;
        m.kind = k; m.amt = k === 'time' ? 600 : k === 'dist' ? 1 : 10; if (k !== 'reps') m.lbs = 0; st.jk = null; save(); A.beep('jog');
      } })), { face: 'mini' });
      y += 17;
      y = g.section('THE PLAN', y, 'TAP A NUMBER ▸ JOG IT');
      const rows = [['sets', m.kind === 'reps' ? 'SETS' : 'ROUNDS', String(m.sets)], ['amt', m.kind === 'time' ? 'EACH' : m.kind === 'dist' ? 'EACH' : 'REPS', m.kind === 'reps' ? String(m.amt) : amtLong(m, m.amt)]];
      if (m.kind === 'reps') rows.push(['lbs', 'WEIGHT', lbs(m.lbs)]);
      rows.forEach(([k, lab, val]) => {
        const on = st.jk === k;
        g.text(lab, 2, y + 4, { a: 0.75 });
        g.btn(W - 102, y, 22, 14, '-', () => { bumpVal(A, st, k, -1); save(); });
        const sel = g.focusable(W - 78, y, 54, 14, () => { st.jk = on ? null : k; A.refreshChrome(); A.beep('key'); });
        if (on) { mx.rect(W - 77, y + 1, 52, 12, m.col, 0.22); mx.frame(W - 78, y, 54, 14, m.col, 1); }
        else mx.frame(W - 78, y, 54, 14, C.amber, sel ? 1 : 0.25);
        g.textC(val, W - 51, y + 4, { c: on ? HOT : C.amber });
        g.btn(W - 22, y, 20, 14, '+', () => { bumpVal(A, st, k, 1); save(); });
        y += 17;
      });
      g.mini('SAYS ' + planLine(m) + (m.days && m.days.length ? ' · ' + m.days.map(i => DOW[i].slice(0, 2)).join(' ') : ''), 2, y, { a: 0.5 });
      y += 9;
      y = g.section('COLOR', y);
      const sw = Math.floor((W - 2) / COLS.length);
      COLS.forEach((c, i) => {
        const x = i * sw, on = m.col === c;
        g.focusable(x, y, sw - 2, 11, () => { m.col = c; save(); A.beep('jog'); });
        mx.rect(x + 1, y + 1, sw - 4, 9, c, on ? 1 : 0.55);
        if (on) mx.frame(x - 1, y - 1, sw, 13, HOT, 1);
      });
      y += 15;
      y = g.section('ON THESE DAYS', y, 'OPTIONAL · SHOWS ON CAL');
      const dw = Math.floor((W - 2) / 7);
      m.days = m.days || [];
      for (let i = 0; i < 7; i++) {
        const on = m.days.includes(i);
        g.btn(i * dw, y, dw - 2, 13, DL[i], () => { m.days = on ? m.days.filter(x => x !== i) : m.days.concat(i).sort(); save(); A.beep('jog'); }, { on, c: on ? m.col : null });
      }
      y += 17;
      if (!st.id) {
        g.btn(0, y, W - 2, 15, '▸ SAVE EXERCISE', () => {
          const nm = (m.name || (st.preset != null ? PRESETS[st.preset][0] : '')).trim();
          if (!nm) { A.say('PICK ONE OR TYPE A NAME', 2500); A.beep('err'); return; }
          const mv = { id: S.healthId('MV'), name: nm, kind: m.kind, sets: m.sets, amt: m.amt, lbs: m.lbs || 0, col: m.col, days: m.days || [], area: m.area !== undefined ? m.area : guessArea(nm), order: S.moves.length, created: Date.now() };
          S.moves.push(mv); S.saveMoves(); A.beep('file'); A.back(); A.say(nm + ' ▸ TAP IT WHEN YOU DO IT', 3500);
        }, { solid: true, c: m.col });
        y += 19;
      } else {
        const L = logFor(m, st.day);
        if (L) {
          g.btn(0, y, W - 2, 13, 'CLEAR ' + (st.day === sod() ? 'TODAY' : dayTag(st.day)) + ' · ' + doneIn(L.sets) + ' SETS', () => { S.workouts = S.workouts.filter(w => w !== L); S.saveWorkouts(); A.beep('thunk', 0.8); A.say(m.name + ' · CLEARED', 2000); });
          y += 16;
        }
        g.btn(0, y, W - 2, 13, 'SEE ITS DAYS ON CAL', () => { A.home(); A.go('cal', { page: 'month', fit: m.id }); });
        y += 16;
        g.btn(0, y, W - 2, 13, '× DELETE EXERCISE', () => A.go('confirm', {
          title: 'DELETE EXERCISE', danger: true, confirm: 'DELETE', lines: ['DELETE ' + m.name + '?', 'ITS PAST DAYS STAY ON THE CALENDAR.'],
          onConfirm: () => { S.moves = S.moves.filter(x => x.id !== m.id); S.saveMoves(); A.back(); A.back(); A.say(m.name + ' DELETED', 2500); }
        }), { c: C.red });
        y += 16;
      }
      g.scrollEnd(y);
      g.footer(A.sayActive() ? A.statusShown(g.t) : st.jk ? 'JOG ▸ CHANGE · PUSH ▸ OK' : st.id ? 'CHANGES SAVE AS YOU GO' : 'TAP A NAME ▸ IT FILLS IN');
    }
  };
  function bumpVal(A, st, k, d) {
    const m = st.id ? moveById(st.id) : st.d; if (!m) return;
    if (k === 'sets') m.sets = clamp(m.sets + d, 1, 10);
    else if (k === 'lbs') m.lbs = clamp((m.lbs || 0) + d * 5, 0, 995);
    else {
      const key = amtKey(m), step = STEP[key](d > 0 ? m.amt : m.amt - 0.001);
      const lim = key === 'time' ? [15, 14400] : key === 'dist' ? [0.25, 60] : [1, 200];
      m.amt = clamp(Math.round((m.amt + d * step) * 100) / 100, lim[0], lim[1]);
    }
    if (st.id) { const L = logFor(m, sod()); if (L) { sync(L, m); S.saveWorkouts(); } S.saveMoves(); }
    A.beep('jog');
  }

  // ======================================================================
  // FOR THE CALENDAR
  // ======================================================================
  RX.fit = {
    page, lcd, logFor, doneOn, plannedOn, moveById, planLine, COLS, sorted, AREAS, guessArea, amtLong,
    // the area a logged workout worked (its exercise's, else a guess from its name)
    areaOf(w) { const m = moveById(w.moveId); return m ? (m.area || null) : guessArea(w.type); },
    // the tile under a point (for hold-to-change)
    tileAt(st, d) { return (st.tiles || []).find(t => d.y >= t.y && d.y < t.y + t.h); },
    // how a log reads on the calendar
    title(w) {
      const m = moveById(w.moveId);
      if (!m) return null;
      const v = (w.sets || []).filter(x => x != null && x > 0), kind = w.kind || m.kind;   // the log's own kind, in case the exercise was changed later
      if (kind === 'reps') return m.name + ' ' + (v.every(x => x === v[0]) ? v.length + '×' + v[0] : v.join('·')) + (w.lbs ? ' @' + w.lbs : '');
      if (kind === 'time') return m.name + ' ' + (w.durationMin || 0) + ' MIN';
      return m.name + ' ' + (w.distanceMi || 0) + ' MI';
    },
    col: w => { const m = moveById(w.moveId); return m ? m.col : null; },
    flashing: () => fl && performance.now() - fl.t < 300
  };
})();
