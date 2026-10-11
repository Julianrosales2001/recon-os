/* =============================================================
   RECON.OS RX-90 · CAL
   The calendar is home for everything with a date: events you
   add, your to-dos (the old OBJECTIVES, same records), and what
   the RP logs anyway (fasts, training, weigh-ins). Goals live
   here too. Drum pages: MONTH · WEEK · AGENDA · GOALS.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const S = RX.store, U = RX.ui, F = U.F, C = U.C, Geo = RX.geo, M = RX.map, FONT = RX.font;
  const HOT = '#E9FFF7', AMB = '#FFB547', GRN = '#6BFF8E', YEL = '#FFE45C', ORG = '#FF9F3A', RED = '#FF5A4E', CYN = '#5CC8FF', PNK = '#FF8BC4', GRY = '#6F8580';
  const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'], DL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const DAY = 864e5;
  const sod = ts => { const d = new Date(ts == null ? Date.now() : ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const addDays = (ts, n) => { const d = new Date(ts); d.setDate(d.getDate() + n); return d.getTime(); };
  const sameDay = (a, b) => sod(a) === sod(b);
  const weekStart = ts => addDays(sod(ts), -new Date(ts).getDay());          // Sunday
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const measure = (s, f, sc) => FONT.measure(s, f, sc);
  const t12 = ts => { const d = new Date(ts); let h = d.getHours(); const ap = h >= 12 ? 'P' : 'A'; h = h % 12 || 12; return h + (d.getMinutes() ? ':' + F.pad2(d.getMinutes()) : '') + ap; };
  const dayName = ts => { const t = sod(); const d = sod(ts); return d === t ? 'TODAY' : d === addDays(t, 1) ? 'TOMORROW' : d === addDays(t, -1) ? 'YESTERDAY' : DOW[new Date(ts).getDay()] + ' ' + F.pad2(new Date(ts).getDate()) + ' ' + MON[new Date(ts).getMonth()]; };

  // ======================================================================
  // DATA · events and goals (to-dos stay in recon.os.missions)
  // ======================================================================
  const KE = 'recon.os.events', KG = 'recon.os.goals';
  S.events = []; S.goals = [];
  S.loadCal = function () {
    try { S.events = JSON.parse(localStorage.getItem(KE) || '[]') || []; } catch (e) { S.events = []; }
    try { S.goals = JSON.parse(localStorage.getItem(KG) || '[]') || []; } catch (e) { S.goals = []; }
  };
  const put = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { if (S.onWriteFail) S.onWriteFail(k); } };
  S.saveEvents = () => put(KE, S.events);
  S.saveGoals = () => put(KG, S.goals);
  S.K.events = KE; S.K.goals = KG;
  const newId = p => p + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);

  // does a repeating event land on day d (start of day)?
  function lands(ev, d) {
    const s = sod(ev.start); if (d < s) return false;
    if (ev.until && d > ev.until) return false;
    const r = ev.repeat || 'none', dd = new Date(d), sd = new Date(ev.start);
    if (r === 'none') return d === s;
    if (r === 'day') return true;
    if (r === 'week') return (ev.days && ev.days.length ? ev.days : [sd.getDay()]).includes(dd.getDay());
    if (r === 'month') return dd.getDate() === sd.getDate();
    if (r === 'year') return dd.getDate() === sd.getDate() && dd.getMonth() === sd.getMonth();
    return false;
  }
  const atTime = (d, start) => { const a = new Date(d), b = new Date(start); a.setHours(b.getHours(), b.getMinutes(), 0, 0); return a.getTime(); };
  const evColor = ev => ev.repeat === 'year' ? PNK : CYN;

  // everything on one day, in time order
  function dayItems(d) {
    const out = [], end = addDays(d, 1), now = Date.now();
    S.events.forEach(ev => { if (lands(ev, d)) { const ts = ev.allDay ? d : atTime(d, ev.start); out.push({ kind: 'event', ev, ts, end: ev.allDay ? end : ts + (ev.dur || 60) * 60000, allDay: !!ev.allDay, title: ev.title, c: evColor(ev) }); } });
    S.missions.forEach(m => {
      if (!m.deadline || m.deadline < d || m.deadline >= end) return;
      const done = m.status === 'complete', late = !done && m.deadline < now;
      out.push({ kind: 'todo', m, ts: m.deadline, title: m.title, c: done ? GRY : late ? RED : AMB, done, urgent: m.priority === 'urgent' });
    });
    S.workouts.forEach(w => { if (w.ts >= d && w.ts < end) out.push({ kind: 'train', ts: w.ts, title: w.type === 'TRAINED' ? 'TRAINED' : String(w.type || 'WORKOUT') + (w.durationMin ? ' · ' + w.durationMin + 'M' : ''), c: ORG, done: true }); });
    S.weighins.forEach(w => { if (w.ts >= d && w.ts < end) out.push({ kind: 'weigh', ts: w.ts, title: 'WEIGH-IN · ' + w.lbs, c: YEL, done: true }); });
    S.fasts.forEach(f => { const fe = f.endTs || now; if (f.startTs < end && fe > d) out.push({ kind: 'fast', ts: Math.max(f.startTs, d), title: f.endTs ? 'FAST · ' + Math.round(f.hours || 0) + 'H' : 'FAST · ' + Math.floor((now - f.startTs) / 36e5) + 'H RUNNING', c: AMB, allDay: true, fast: true, done: !!f.endTs }); });
    out.sort((a, b) => (b.allDay ? 1 : 0) - (a.allDay ? 1 : 0) || a.ts - b.ts);
    return out;
  }
  const fastOn = d => S.fasts.some(f => f.startTs < addDays(d, 1) && (f.endTs || Date.now()) > d);
  const overdue = () => S.missions.filter(m => m.status === 'active' && m.deadline && m.deadline < Date.now()).sort((a, b) => a.deadline - b.deadline);
  const anytime = () => S.missions.filter(m => m.status === 'active' && !m.deadline);

  // what's coming up (for the LCD's NEXT and the reminders)
  function upcoming(hours) {
    const now = Date.now(), to = now + hours * 36e5, out = [];
    for (let d = sod(now); d < to; d = addDays(d, 1)) dayItems(d).forEach(it => { if ((it.kind === 'event' && !it.allDay) || (it.kind === 'todo' && !it.done)) if (it.ts >= now - 60000 && it.ts <= to) out.push(it); });
    return out.sort((a, b) => a.ts - b.ts);
  }

  // ======================================================================
  // GOALS
  // ======================================================================
  // kind: 'target' (count by hand to a number, by a date) · 'habit' (n per week, from a log) · 'measure' (a number the RP tracks)
  function weekCount(g, ws) {
    const we = addDays(ws, 7);
    if (g.source === 'trained') return S.workouts.filter(w => w.ts >= ws && w.ts < we).length;
    if (g.source === 'fast') return S.fasts.filter(f => f.endTs && f.endTs >= ws && f.endTs < we && (f.hours || 0) >= (g.minH || 18)).length;
    return (g.log || []).filter(t => t >= ws && t < we).length;
  }
  function goalState(g) {
    const now = Date.now();
    if (g.kind === 'target') {
      const n = (g.log || []).length, T = Math.max(1, g.target || 1), f = clamp(n / T, 0, 1);
      let pace = '';
      if (g.by && n < T) { const span = Math.max(DAY, g.by - (g.created || now)), exp = T * clamp((now - (g.created || now)) / span, 0, 1), diff = Math.round(n - exp); pace = g.by < now ? 'PAST DUE' : diff >= 0 ? (diff ? diff + ' AHEAD' : 'ON PACE') : -diff + ' BEHIND PACE'; }
      return { val: n + '/' + T, f, sub: (n >= T ? 'DONE ✓' : (g.by ? 'BY ' + MON[new Date(g.by).getMonth()] + ' ' + F.pad2(new Date(g.by).getDate()) + ' · ' : '') + pace), subc: n >= T ? GRN : /BEHIND|PAST/.test(pace) ? YEL : GRN, c: CYN };
    }
    if (g.kind === 'habit') {
      const ws = weekStart(now), per = Math.max(1, g.perWeek || 1), weeks = [];
      for (let k = 11; k >= 0; k--) { const w0 = addDays(ws, -7 * k); weeks.push({ n: weekCount(g, w0), cur: k === 0 }); }
      let run = 0; for (let k = weeks.length - 2; k >= 0; k--) { if (weeks[k].n >= per) run++; else break; }
      const hit = weeks.slice(0, 11).filter(w => w.n >= per).length, cur = weeks[11].n;
      const src = { trained: 'FROM TRAINED', fast: 'FROM FAST', manual: 'PUSH +1' }[g.source || 'manual'];
      return { val: cur + '/' + per, f: clamp(cur / per, 0, 1), weeks, per, sub: (run >= 2 ? run + ' WEEKS IN A ROW' : hit + ' OF 11 WEEKS HIT') + ' · ' + src, subc: run >= 2 ? GRN : INKc(), c: g.source === 'fast' ? AMB : ORG };
    }
    // measure
    if (g.source === 'explored') {
      const v = S.fog.size * 22500 / 2589988, T = g.target || 100;
      return { val: v.toFixed(1), f: clamp(v / T, 0, 1), sub: v >= T ? 'REACHED ✓' : (T - v).toFixed(1) + ' SQ MI TO GO', subc: GRN, c: GRN };
    }
    const L = S.weighins.filter(w => w.lbs).slice().sort((a, b) => a.ts - b.ts);
    if (!L.length) return { val: '--', f: 0, sub: 'NO WEIGH-INS YET', subc: GRY, c: YEL, pts: [] };
    const cur = L[L.length - 1].lbs, T = g.target || (S.profile && S.profile.goalLbs) || cur, start = L[0].lbs;
    const f = start === T ? 1 : clamp((start - cur) / (start - T), 0, 1);
    const recent = L.filter(w => w.ts > now - 60 * DAY), ch = recent.length > 1 ? recent[recent.length - 1].lbs - recent[0].lbs : 0;
    return { val: String(cur), f, sub: (Math.abs(cur - T) < 0.3 ? 'AT GOAL ✓' : Math.abs(cur - T).toFixed(1) + ' TO GO') + (recent.length > 1 ? ' · ' + (ch <= 0 ? '▼' : '▲') + Math.abs(ch).toFixed(1) + ' IN 60 DAYS' : ''), subc: GRN, c: YEL, pts: recent.map(w => w.lbs), T };
  }
  function INKc() { return C.ink; }

  // ======================================================================
  // DRAWING HELPERS
  // ======================================================================
  function itemRow(g, y, it, A, o) {
    o = o || {};
    const W = g.W, sel = g.row(0, y, W - 2, 10, () => openItem(A, it));
    const tl = it.allDay ? (it.fast ? 'ALL' : 'DAY') : (it.kind === 'todo' && o.showDate ? MON[new Date(it.ts).getMonth()] + ' ' + new Date(it.ts).getDate() : t12(it.ts));
    g.mini(tl, 2, y + 3, { a: 0.6 });
    g.mx.rect(30, y + 3, 3, 5, it.c, it.done ? 0.45 : 1);
    const right = o.right != null ? o.right : (it.kind === 'todo' && it.m && it.m.lat != null ? Geo.fmtDist(Geo.meters((A.gps || M).lat, (A.gps || M).lng, it.m.lat, it.m.lng)) : '');
    const rw = right ? measure(right, 'mini') + 4 : 0;
    g.text(g.fit(it.title + (it.done && it.kind === 'todo' ? ' ✓' : ''), W - 40 - rw), 36, y + 2, { c: sel ? HOT : it.done ? C.ink : HOT, a: it.done ? 0.45 : 1 });
    if (right) g.miniR(right, W - 4, y + 3, { c: it.c, a: 0.85 });
    if (it.urgent && !it.done) g.mx.rect(28, y + 3, 1, 5, RED, 1);
    return y + 11;
  }
  // a section line in any colour (g.section is always ink)
  function sect(g, label, y, right, c) {
    c = c || C.ink;
    const w = g.mini(label, 1, y + 1, { a: c === C.ink ? 0.6 : 1, c });
    const rw = right ? measure(right, 'mini') : 0;
    g.mx.hline(w + 4, y + 3, g.W - w - 6 - (rw ? rw + 4 : 0), c, 0.3, 2);
    if (right) g.miniR(right, g.W - 2, y + 1, { a: 0.75, c });
    return y + 9;
  }
  function openItem(A, it) {
    if (it.kind === 'event') A.go('calitem', { ev: it.ev.id, ts: it.ts });
    else if (it.kind === 'todo') A.go('calitem', { todo: it.m.id });
    else if (it.kind === 'fast') A.go('fast');
    else if (it.kind === 'weigh' || it.kind === 'train') A.go('profile');
  }
  function addBtn(g, x, y, A, st) { g.btn(x, y, 30, 10, '+ NEW', () => A.go('calnew', { day: st.sel }), { face: 'mini', c: AMB }); }

  // ======================================================================
  // PAGES
  // ======================================================================
  function pageMonth(g, st, A) {
    const W = g.W, H = g.H, mx = g.mx, sel = st.sel, sd = new Date(sel);
    g.header('CAL · MONTH', MON[sd.getMonth()] + ' ' + sd.getFullYear());
    const cw = Math.floor((W - 1) / 7), x0 = 1, y0 = 21;
    const listMin = 52, ch = clamp(Math.floor((H - 12 - y0 - listMin) / 6), 13, 22);
    DL.forEach((d, i) => g.mini(d, x0 + i * cw + Math.floor(cw / 2) - 1, 14, { a: i === 0 || i === 6 ? 0.4 : 0.6 }));
    const first = new Date(sd.getFullYear(), sd.getMonth(), 1), gridStart = addDays(first.getTime(), -first.getDay()), today = sod();
    const ORDER = [RED, AMB, CYN, PNK, ORG, YEL];
    for (let k = 0; k < 42; k++) {
      const d = addDays(gridStart, k), dd = new Date(d), cx = x0 + (k % 7) * cw, cy = y0 + Math.floor(k / 7) * ch;
      const inM = dd.getMonth() === sd.getMonth(), past = d < today, isT = d === today, isS = d === sel;
      if (isS) { mx.rect(cx, cy, cw - 1, ch - 1, C.ink, 0.14); mx.frame(cx, cy, cw - 1, ch - 1, isT ? HOT : C.ink, 1); }
      else if (isT) mx.frame(cx, cy, cw - 1, ch - 1, HOT, 0.8);
      else mx.frame(cx, cy, cw - 1, ch - 1, C.ink, inM ? 0.12 : 0.05);
      g.mini(String(dd.getDate()), cx + 2, cy + 2, { c: isT ? HOT : C.ink, a: !inM ? 0.2 : past ? 0.45 : (k % 7 === 0 || k % 7 === 6) ? 0.65 : 0.9 });
      const its = dayItems(d).filter(i => !i.fast), cols = [];
      ORDER.forEach(c => { if (its.some(i => i.c === c)) cols.push(c); });
      if (its.some(i => i.c === GRY) && cols.length < 3) cols.push(GRY);
      cols.slice(0, 3).forEach((c, i) => mx.rect(cx + 3 + i * 4, cy + ch - 7, 3, 3, c, past || !inM ? 0.45 : 1));
      if (fastOn(d)) mx.hline(cx, cy + ch - 3, cw - 1, AMB, past ? 0.5 : 1);
      g.hit(cx, cy, cw - 1, ch - 1, () => { if (st.sel === d) { st.page = 'week'; st.drumI = null; A.refreshChrome(); } st.sel = d; st.scroll = 0; A.beep('jog'); });
    }
    let y = y0 + 6 * ch + 2;
    const its = dayItems(sel);
    y = g.section(dayName(sel) === 'TODAY' ? DOW[sd.getDay()] + ' ' + sd.getDate() + ' · TODAY' : dayName(sel), y, its.length ? String(its.length) : '') ;
    addBtn(g, W - 50, y - 10, A, st);
    let yy = g.scrollBegin(y, H - 12);
    its.forEach(it => { yy = itemRow(g, yy, it, A); });
    if (!its.length) { g.mini('NOTHING ON THIS DAY', 2, yy + 3, { a: 0.4 }); yy += 12; }
    g.scrollEnd(yy);
    return 'JOG ▸ DAY · TAP A DAY TWICE ▸ WEEK';
  }

  function pageWeek(g, st, A) {
    const W = g.W, H = g.H, mx = g.mx, sel = st.sel, ws = weekStart(sel), we = addDays(ws, 6), today = sod();
    g.header('CAL · WEEK', MON[new Date(ws).getMonth()] + ' ' + new Date(ws).getDate() + '-' + (new Date(we).getMonth() !== new Date(ws).getMonth() ? MON[new Date(we).getMonth()] + ' ' : '') + new Date(we).getDate());
    const cw = Math.floor((W - 1) / 7);
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i), x = 1 + i * cw, isS = d === sel, isT = d === today, its = dayItems(d).filter(it => !it.fast);
      if (isS) { mx.rect(x, 12, cw - 1, 24, C.ink, 0.14); mx.frame(x, 12, cw - 1, 24, isT ? HOT : C.ink, 1); } else if (isT) mx.frame(x, 12, cw - 1, 24, HOT, 0.7);
      g.mini(DL[i], x + Math.floor(cw / 2) - 1, 14, { a: 0.55 });
      const n = String(new Date(d).getDate());
      g.text(n, x + Math.round((cw - 1 - measure(n)) / 2), 21, { c: isS || isT ? HOT : C.ink, a: d < today ? 0.5 : 1 });
      its.slice(0, 4).forEach((it, k) => mx.rect(x + 2 + k * 5, 31, 4, 2, it.c, it.done ? 0.45 : 1));
      if (fastOn(d)) mx.hline(x, 34, cw - 1, AMB, 0.8);
      g.hit(x, 12, cw - 1, 24, () => { st.sel = d; A.beep('jog'); });
    }
    let y = 39;
    const its = dayItems(sel), banner = its.filter(it => it.allDay), timed = its.filter(it => !it.allDay);
    // all-day things across the top
    banner.slice(0, 2).forEach(it => { mx.rect(1, y, W - 3, 8, it.c, 0.16); g.mini(g.fit(it.title, W - 8, 'mini'), 4, y + 2, { c: it.c, a: 1 }); g.hit(1, y, W - 3, 8, () => openItem(A, it)); y += 9; });
    addBtn(g, W - 31, H - 23, A, st);
    // hours
    let h0 = 6, h1 = 21;
    timed.forEach(it => { const h = new Date(it.ts).getHours(); h0 = Math.min(h0, h); h1 = Math.max(h1, Math.min(23, h + 1)); });
    const top = y + 3, bot = H - 25, rh = Math.max(5, Math.floor((bot - top) / (h1 - h0))), hx = 22;
    const Y = ts => { const d = new Date(ts); return top + (d.getHours() + d.getMinutes() / 60 - h0) * rh; };
    for (let h = h0; h <= h1; h++) { const yy = top + (h - h0) * rh; if (h % 2 === 0) g.miniR((h % 12 || 12) + (h < 12 ? 'A' : 'P'), hx - 3, yy - 2, { a: 0.4 }); mx.hline(hx, yy, W - hx - 2, C.ink, h % 2 ? 0.06 : 0.12, 2); }
    // events as blocks, side by side when they overlap; to-dos, training and weigh-ins as ticks
    const evs = timed.filter(it => it.kind === 'event'), lanes = [];
    evs.forEach(it => { let l = 0; while (lanes[l] && lanes[l] > it.ts) l++; lanes[l] = it.end; it.lane = l; });
    const nl = Math.max(1, lanes.length), lw = Math.floor((W - hx - 4) / nl);
    evs.forEach(it => {
      const y1 = Math.round(Y(it.ts)), y2 = Math.max(y1 + 7, Math.round(Y(Math.min(it.end, addDays(sel, 1) - 1)))), x = hx + 1 + it.lane * lw, w = lw - 1, hh = y2 - y1;
      mx.rect(x, y1 + 1, w, hh - 1, it.c, 0.16); mx.frame(x, y1 + 1, w, hh - 1, it.c, 0.9);
      g.text(g.fit(it.title, w - 6, hh >= 9 ? 'std' : 'mini'), x + 3, y1 + 2, { face: hh >= 9 ? 'std' : 'mini', c: HOT });
      if (hh > 16 && it.ev.poiId) { const p = S.poi(it.ev.poiId); if (p) g.mini(g.fit(S.markLabel(p), w - 6, 'mini'), x + 3, y1 + 11, { c: it.c, a: 0.9 }); }
      g.hit(x, y1, w, hh, () => openItem(A, it));
    });
    timed.filter(it => it.kind !== 'event').forEach(it => {
      const yy = Math.round(Y(it.ts)); mx.rect(hx - 1, yy - 1, 4, 3, it.c, it.done ? 0.5 : 1);
      if (it.kind === 'todo') { g.mini(g.fit(it.title, W - hx - 12, 'mini'), hx + 5, yy - 2, { c: it.c, a: it.done ? 0.5 : 1 }); g.hit(hx, yy - 3, W - hx - 2, 7, () => openItem(A, it)); }
    });
    if (sel === today) { const ny = Math.round(Y(Date.now())); if (ny >= top && ny <= bot) { mx.hline(hx - 2, ny, W - hx, RED, 1); mx.rect(hx - 3, ny - 1, 3, 3, RED, 1); g.mini('NOW', 1, ny - 2, { c: RED, a: 1 }); } }
    if (!its.length) g.mini('NOTHING ON THIS DAY', hx + 4, top + 4 * rh, { a: 0.4 });
    return 'JOG ▸ DAY · PUSH ▸ NEW EVENT';
  }

  function pageAgenda(g, st, A) {
    const W = g.W, H = g.H, mx = g.mx;
    g.header('CAL · AGENDA', '');
    addBtn(g, W - 31, 0, A, st);
    let y = g.scrollBegin(13, H - 12);
    // goals, compact
    if (S.goals.length) {
      y = sect(g, 'GOALS', y, String(S.goals.length));
      S.goals.slice(0, 3).forEach(gl => {
        const s = goalState(gl), sel = g.row(0, y, W - 34, 9, () => { st.page = 'goals'; st.drumI = null; A.refreshChrome(); });
        g.mini(g.fit(gl.title, 54, 'mini'), 2, y + 2, { a: sel ? 1 : 0.75, c: sel ? HOT : C.ink });
        const n = 20; for (let i = 0; i < n; i++) mx.rect(58 + i * 3, y + 2, 2, 5, s.c, i < Math.round(s.f * n) ? 1 : 0.13);
        g.textR(s.val, W - 3, y + 1, { c: s.c }); y += 10;
      });
      y += 2;
    }
    const od = overdue();
    if (od.length) { y = sect(g, 'OVERDUE', y, String(od.length), RED); od.forEach(m => { y = itemRow(g, y, { kind: 'todo', m, ts: m.deadline, title: m.title, c: RED, urgent: m.priority === 'urgent' }, A, { showDate: true, right: Math.max(1, Math.round((Date.now() - m.deadline) / DAY)) + 'D' }); }); y += 2; }
    const today = sod();
    let shown = 0;
    for (let k = 0; k < 21; k++) {
      const d = addDays(today, k), its = dayItems(d).filter(it => !(it.kind === 'todo' && !it.done && it.ts < Date.now()));
      if (!its.length && k > 0) continue;
      y = sect(g, dayName(d) === 'TODAY' ? 'TODAY · ' + DOW[new Date(d).getDay()] + ' ' + new Date(d).getDate() : dayName(d), y, '', k === 0 ? HOT : null);
      its.forEach(it => { y = itemRow(g, y, it, A); });
      if (!its.length) { g.mini('NOTHING PLANNED', 36, y + 2, { a: 0.4 }); y += 10; }
      y += 2; shown++;
      if (shown > 10) break;
    }
    const any = anytime();
    if (any.length) { y = g.section('ANYTIME', y, String(any.length)); any.forEach(m => { y = itemRow(g, y, { kind: 'todo', m, ts: m.created, title: m.title, c: AMB, urgent: m.priority === 'urgent' }, A, { right: '' }); }); }
    g.scrollEnd(y + 4);
    return 'JOG ▸ PICK · PUSH ▸ OPEN';
  }

  function pageGoals(g, st, A) {
    const W = g.W, H = g.H, mx = g.mx;
    g.header('CAL · GOALS', String(S.goals.length));
    g.btn(W - 46, 13, 45, 10, '+ NEW GOAL', () => A.go('goaledit', {}), { face: 'mini', c: AMB });
    let y = g.scrollBegin(25, H - 12);
    if (!S.goals.length) { g.textC('NO GOALS YET', W / 2, y + 16, { c: HOT }); g.textC('TARGETS · HABITS · MEASURES', W / 2, y + 28, { face: 'mini', a: 0.6 }); y += 44; }
    S.goals.forEach(gl => {
      const s = goalState(gl), kc = gl.kind === 'target' ? CYN : gl.kind === 'habit' ? s.c : s.c;
      const sel = g.focusable(0, y, W - 2, 36, () => A.go('goal', { id: gl.id }));
      mx.frame(0, y, W - 2, 36, sel ? HOT : s.c, sel ? 1 : 0.45);
      g.mini(gl.kind.toUpperCase(), 3, y + 3, { c: kc, a: 1 }); g.textR(s.val, W - 5, y + 2, { c: s.c });
      g.text(g.fit(gl.title, W - 52), 3, y + 10, { c: HOT });
      const yy = y + 20;
      if (gl.kind === 'habit') s.weeks.forEach((w, i) => mx.rect(3 + i * 13, yy, 11, 5, w.cur ? s.c : w.n >= s.per ? GRN : RED, w.cur ? 0.5 + 0.5 * s.f : w.n >= s.per ? 0.9 : 0.6));
      else if (gl.kind === 'target') { const T = Math.max(1, gl.target || 1), n = Math.min(T, 24), per = T / n, bw = Math.floor((W - 6) / n); for (let i = 0; i < n; i++) mx.rect(3 + i * bw, yy, bw - 2, 5, s.c, (i + 1) * per <= (gl.log || []).length + 1e-9 ? 1 : 0.13); }
      else if (s.pts && s.pts.length > 1) {
        const lo = Math.min(s.T, ...s.pts) - 0.5, hi = Math.max(s.T, ...s.pts) + 0.5, X = i => 3 + i * (W - 10) / (s.pts.length - 1), Yv = v => yy + 6 - (v - lo) / (hi - lo) * 7;
        for (let i = 1; i < s.pts.length; i++) mx.line(X(i - 1), Yv(s.pts[i - 1]), X(i), Yv(s.pts[i]), s.c, 1);
        mx.hline(3, Math.round(Yv(s.T)), W - 8, AMB, 0.5, 3);
      } else { const n = 30; for (let i = 0; i < n; i++) mx.rect(3 + i * 5, yy, 4, 5, s.c, i < Math.round(s.f * n) ? 1 : 0.13); }
      g.mini(g.fit(s.sub, W - 8, 'mini'), 3, y + 29, { c: s.subc, a: 0.85 });
      if (gl.kind === 'target' || (gl.kind === 'habit' && (gl.source || 'manual') === 'manual')) g.btn(W - 28, y + 9, 24, 10, '+1', () => bump(A, gl, 1), { face: 'mini', c: s.c });
      y += 39;
    });
    g.scrollEnd(y);
    return 'TAP A GOAL TO OPEN';
  }
  function bump(A, gl, d) {
    gl.log = gl.log || [];
    if (d > 0) gl.log.push(Date.now()); else gl.log.pop();
    S.saveGoals(); A.beep(d > 0 ? 'ok' : 'key');
    const s = goalState(gl);
    if (gl.kind === 'target' && gl.log.length === gl.target && d > 0) { A.beep('file'); A.say('GOAL REACHED ▸ ' + gl.title, 5000); }
    else A.say(gl.title + ' ▸ ' + s.val, 2000);
  }

  // ======================================================================
  // THE CALENDAR SCREEN
  // ======================================================================
  const PAGES = ['month', 'week', 'agenda', 'goals'];
  RX.screens.cal = {
    drum: PAGES,
    enter(st, params) { st.sel = sod(params.day || Date.now()); st.page = params.page || S.v2.calPage || 'month'; },
    onPage(pg, st, A) { st.scroll = 0; st.sel = st.sel || sod(); S.saveV2({ calPage: pg }); },
    animating: st => st.page === 'week' && st.sel === sod(),
    jogLabels: st => st.page === 'month' || st.page === 'week' ? ['◂ DAY', 'DAY ▸', st.page === 'month' ? 'PUSH ▸ WEEK VIEW' : 'PUSH ▸ NEW EVENT'] : ['◂ UP', 'DOWN ▸', 'PUSH ▸ OPEN'],
    jog(d, st, A) {
      if (st.page === 'month' || st.page === 'week') { st.sel = addDays(st.sel, d); st.scroll = 0; return; }
      A.focusJog(d);
    },
    push(st, A) {
      if (st.page === 'month') { st.page = 'week'; st.drumI = null; A.refreshChrome(); return; }
      if (st.page === 'week') { A.go('calnew', { day: st.sel, kind: 'event' }); return; }
      A.focusPush();
    },
    render(g, st, A) {
      if (!st.sel) st.sel = sod();
      const pg = st.page || 'month';
      const foot = pg === 'month' ? pageMonth(g, st, A) : pg === 'week' ? pageWeek(g, st, A) : pg === 'agenda' ? pageAgenda(g, st, A) : pageGoals(g, st, A);
      g.footer(A.sayActive() ? A.statusShown(g.t) : foot);
    },
    lcd(st, A) {
      const its = dayItems(sod()).filter(it => it.kind === 'event' || it.kind === 'todo'), nx = upcoming(48)[0], od = overdue().length;
      return { rows: [['TODY', its.length + (its.length === 1 ? ' THING' : ' THINGS') + (od ? ' · ' + od + ' LATE' : '')], ['NEXT', nx ? nx.title : 'NOTHING SOON'], ['WHEN', nx ? (sameDay(nx.ts, Date.now()) ? t12(nx.ts) : dayName(nx.ts) + ' ' + t12(nx.ts)) : '--']], tag: 'CAL' };
    }
  };

  // ======================================================================
  // ONE ITEM (an event occurrence or a to-do)
  // ======================================================================
  function nextDue(m) {
    // a repeating to-do rolls forward when it's done
    const r = m.repeat || 'none', d = new Date(m.deadline);
    if (r === 'day') d.setDate(d.getDate() + 1);
    else if (r === 'week') d.setDate(d.getDate() + 7);
    else if (r === 'month') d.setMonth(d.getMonth() + 1);
    else if (r === 'year') d.setFullYear(d.getFullYear() + 1);
    else return null;
    return d.getTime();
  }
  function completeTodo(A, m) {
    if (m.status === 'complete') { m.status = 'active'; m.completed = null; S.saveMissions(); S.log('mission-reopen', m.id, 'Reopened: ' + m.title); A.say('REOPENED · ' + m.title, 2500); A.updateLamps(); return; }
    const nd = m.deadline && nextDue(m);
    S.log('mission-complete', m.id, 'Completed: ' + m.title);
    if (nd) { m.deadline = nd; m.lastDone = Date.now(); A.say('DONE ▸ NEXT ' + dayName(nd), 3000); }
    else { m.status = 'complete'; m.completed = Date.now(); A.say('DONE ▸ ' + m.title, 2500); }
    S.saveMissions(); A.beep('file'); A.updateLamps();
  }
  RX.calComplete = completeTodo;
  RX.screens.calitem = {
    jogLabels: () => ['◂ UP', 'DOWN ▸', 'PUSH SELECT'],
    render(g, st, A) {
      const W = g.W, H = g.H, mx = g.mx, P = A.top().params;
      const ev = P.ev ? S.events.find(e => e.id === P.ev) : null, m = P.todo ? S.missions.find(x => x.id === P.todo) : null;
      if (!ev && !m) { g.header('CAL'); g.textC('NOT FOUND', W / 2, 40, { a: 0.6 }); g.footer('BACK TO RETURN'); return; }
      const now = Date.now();
      g.header(ev ? (ev.repeat === 'year' ? 'CAL · DATE' : 'CAL · EVENT') : 'CAL · TO-DO', '');
      let y = g.scrollBegin(13, H - 12) + 1;
      const done = m && m.status === 'complete', late = m && !done && m.deadline && m.deadline < now;
      const c = ev ? evColor(ev) : done ? GRY : late ? RED : AMB;
      const title = ev ? ev.title : m.title;
      mx.rect(1, y + 1, 4, 12, c, 1);
      const big = measure(title, 'std', 2) <= W - 10;
      if (big) g.text(title, 8, y, { s: 2, c: HOT, a: done ? 0.5 : 1 }); else U.wrap(title, Math.floor((W - 10) / 6)).slice(0, 2).forEach((l, i) => g.text(l, 8, y + i * 9, { c: HOT }));
      y += big ? 17 : 20;
      let sub;
      if (ev) { const ts = P.ts || ev.start; sub = dayName(ts) + (ev.allDay ? ' · ALL DAY' : ' · ' + t12(ts) + '-' + t12(ts + (ev.dur || 60) * 60000)); }
      else sub = done ? 'DONE ' + F.date(m.completed || now) : !m.deadline ? 'NO DUE DATE' : late ? 'OVERDUE ' + Math.max(1, Math.round((now - m.deadline) / DAY)) + (Math.round((now - m.deadline) / DAY) === 1 ? ' DAY' : ' DAYS') : 'DUE ' + dayName(m.deadline) + ' ' + t12(m.deadline);
      g.mini(g.fit(sub, W - 10, 'mini'), 8, y, { c, a: 1 }); y += 9;
      mx.hline(0, y, W, C.ink, 0.3, 2); y += 4;
      const kv = (k, v, col) => { g.mini(k, 1, y + 1, { a: 0.6 }); g.textR(g.fit(v, W - 50), W - 3, y, { c: col || HOT }); mx.hline(1, y + 9, W - 3, C.ink, 0.08, 2); y += 11; };
      const RP = { none: 'NO', day: 'DAILY', week: 'WEEKLY', month: 'MONTHLY', year: 'YEARLY' };
      const it = ev || m, pid = it.poiId, p = pid ? S.poi(pid) : null, la = p ? p.lat : it.lat, ln = p ? p.lng : it.lng;
      if (m) { kv('DUE', m.deadline ? F.day(m.deadline) + ' ' + t12(m.deadline) : 'NONE', late ? RED : HOT); kv('PRIORITY', m.priority === 'urgent' ? 'URGENT' : 'NORMAL', m.priority === 'urgent' ? RED : HOT); }
      else kv('LENGTH', ev.allDay ? 'ALL DAY' : (ev.dur >= 60 ? (ev.dur / 60) + 'H' : ev.dur + 'M'));
      kv('REPEAT', (it.repeat || 'none') === 'week' && it.days && it.days.length ? 'WEEKLY · ' + it.days.map(d => DOW[d].slice(0, 2)).join(' ') : RP[it.repeat || 'none']);
      if (la != null) kv('PLACE', (p ? S.markLabel(p) : 'PIN') + ' · ' + Geo.fmtDist(Geo.meters((A.gps || M).lat, (A.gps || M).lng, la, ln)), GRN);
      if (it.notes) { y = g.section('NOTES', y + 2); U.wrap(it.notes, Math.floor((W - 2) / 4)).forEach(l => { g.mini(l, 1, y, { a: 0.85 }); y += 7; }); y += 2; }
      y += 3;
      if (m) {
        g.btn(0, y, W - 2, 15, done ? 'REOPEN' : (m.repeat && m.repeat !== 'none' ? '✓ DONE · ROLL TO NEXT' : '✓ DONE'), () => { completeTodo(A, m); if (m.status === 'complete') A.back(); }, { on: !done, c: GRN });
        y += 18;
        const bw = Math.floor((W - 6) / 3);
        const shove = n => () => { m.deadline = addDays(m.deadline || atTime(sod(), new Date().setHours(17, 0, 0, 0)), n); if (m.status === 'complete') { m.status = 'active'; m.completed = null; } S.saveMissions(); A.updateLamps(); A.say('MOVED ▸ ' + dayName(m.deadline), 2000); A.beep('jog'); };
        g.btn(0, y, bw, 13, '+1 DAY', shove(1), { face: 'mini' });
        g.btn(bw + 2, y, bw, 13, '+1 WEEK', shove(7), { face: 'mini' });
        g.btn(2 * bw + 4, y, W - 2 - 2 * bw - 4, 13, 'GO', () => la != null ? RX.goTarget(A, la, ln, title) : A.say('NO PLACE ON THIS ONE', 2000), { c: AMB, dim: la == null });
        y += 16;
        g.btn(0, y, W - 2, 12, 'EDIT', () => A.go('objective', { id: m.id }), { face: 'mini' });
        y += 15;
      } else {
        const bw = Math.floor((W - 4) / 2);
        g.btn(0, y, bw, 13, 'GO', () => la != null ? RX.goTarget(A, la, ln, title) : A.say('NO PLACE ON THIS ONE', 2000), { c: AMB, dim: la == null });
        g.btn(bw + 2, y, W - 2 - bw - 2, 13, 'EDIT', () => A.go('calnew', { ev: ev.id }));
        y += 16;
      }
      g.scrollEnd(y);
      g.footer(A.sayActive() ? A.statusShown(g.t) : (m ? 'PUSH ▸ SELECT' : 'EDIT TO CHANGE IT'));
    }
  };

  // ======================================================================
  // NEW / EDIT (events here; to-dos use the objective editor + repeat)
  // ======================================================================
  const LENS = [15, 30, 60, 90, 120, 180];
  RX.screens.calnew = {
    enter(st, params) {
      if (params.ev) { const ev = S.events.find(e => e.id === params.ev); st.ev = ev ? JSON.parse(JSON.stringify(ev)) : null; st.isNew = false; }
      if (!st.ev) {
        const day = params.day || sod(), base = new Date(day); const n = new Date();
        base.setHours(sameDay(day, Date.now()) ? Math.min(22, n.getHours() + 1) : 9, 0, 0, 0);
        st.ev = { id: newId('EV'), title: '', start: base.getTime(), dur: 60, allDay: false, repeat: 'none', days: [], poiId: null, lat: null, lng: null, notes: '', created: Date.now() };
        st.isNew = true;
      }
      st.kind = params.kind || 'event';
    },
    render(g, st, A) {
      const W = g.W, H = g.H, e = st.ev;
      g.header(st.isNew ? 'CAL · NEW' : 'CAL · EDIT', '');
      let y = g.scrollBegin(13, H - 12) + 1;
      if (st.isNew) {
        g.seg(0, y, W - 2, 13, [{ label: 'EVENT', on: st.kind === 'event', fn: () => { st.kind = 'event'; }, c: CYN }, { label: 'TO-DO', on: false, fn: () => {
          A.replace('objective', { draft: { id: 'MSN-' + Date.now(), title: e.title || '', notes: '', priority: 'normal', status: 'active', created: Date.now(), completed: null, lat: null, lng: null, poiId: null, deadline: e.start, repeat: 'none' } });
        }, c: AMB }]);
        y += 16;
      }
      g.field('ce-title-' + e.id, 0, y, W - 2, 13, { value: e.title, placeholder: 'WHAT IS IT', maxLen: 60, onCommit: v => { e.title = String(v || '').trim(); } });
      y += 16;
      y = g.section('WHEN', y, dayName(e.start));
      g.field('ce-when-' + e.id, 0, y, W - 48, 13, { kind: 'date', value: e.start, onCommit: v => { if (v) e.start = v; } });
      if (!(U.activeField && U.activeField.key === 'ce-when-' + e.id)) { g.mx.clearRect(2, y + 2, W - 52, 9); g.text(F.day(e.start) + (e.allDay ? '' : ' ' + t12(e.start)), 4, y + 3, { c: HOT }); }
      g.btn(W - 46, y, 44, 13, 'ALL DAY', () => { e.allDay = !e.allDay; }, { on: e.allDay, face: 'mini' });
      y += 16;
      if (!e.allDay) { g.seg(0, y, W - 2, 11, LENS.map(l => ({ label: l >= 60 ? (l / 60) + 'H' : l + 'M', on: e.dur === l, fn: () => { e.dur = l; } })), { face: 'mini' }); y += 14; }
      y = g.section('REPEAT', y, { none: '', day: 'DAILY', week: 'WEEKLY', month: 'MONTHLY', year: 'YEARLY' }[e.repeat]);
      g.seg(0, y, W - 2, 11, [['none', 'NONE'], ['day', 'DAY'], ['week', 'WEEK'], ['month', 'MONTH'], ['year', 'YEAR']].map(r => ({ label: r[1], on: e.repeat === r[0], fn: () => { e.repeat = r[0]; if (r[0] === 'week' && !e.days.length) e.days = [new Date(e.start).getDay()]; } })), { face: 'mini' });
      y += 13;
      if (e.repeat === 'week') {
        const dw = Math.floor((W - 2) / 7);
        DL.forEach((d, i) => g.btn(i * dw, y, dw - 1, 11, d, () => { const k = e.days.indexOf(i); if (k >= 0) { if (e.days.length > 1) e.days.splice(k, 1); } else e.days.push(i); e.days.sort(); }, { on: e.days.includes(i), face: 'mini', c: CYN }));
        y += 14;
      }
      const p = e.poiId ? S.poi(e.poiId) : null;
      y = g.section('PLACE', y, p ? 'LINKED' : '');
      if (p) {
        g.btn(0, y, W - 40, 13, g.fit(S.markLabel(p), W - 48), () => A.go('markpick', { onPick: mk => { e.poiId = mk.id; e.lat = mk.lat; e.lng = mk.lng; } }), { c: GRN });
        g.btn(W - 38, y, 36, 13, 'CLEAR', () => { e.poiId = null; e.lat = null; e.lng = null; }, { face: 'mini' });
      } else g.btn(0, y, W - 2, 13, 'LINK A MARK ▸', () => A.go('markpick', { onPick: mk => { e.poiId = mk.id; e.lat = mk.lat; e.lng = mk.lng; } }));
      y += 16;
      y = g.section('NOTES', y);
      g.field('ce-notes-' + e.id, 0, y, W - 2, 22, { kind: 'area', value: e.notes || '', placeholder: 'OPTIONAL', maxLen: 400, onCommit: v => { e.notes = String(v || '').trim(); } });
      y += 25;
      const bw = st.isNew ? W - 2 : Math.floor((W - 4) / 2);
      g.btn(0, y, bw, 15, st.isNew ? '▸ SAVE EVENT' : 'SAVE', () => {
        if (!e.title) { A.say('GIVE IT A NAME FIRST', 2500); A.beep('err'); return; }
        const i = S.events.findIndex(x => x.id === e.id);
        if (i >= 0) S.events[i] = e; else S.events.push(e);
        S.saveEvents(); A.beep('file'); A.back(); A.say((st.isNew ? 'ADDED ▸ ' : 'SAVED ▸ ') + e.title + ' · ' + dayName(e.start), 3000);
      }, { on: true, c: CYN });
      if (!st.isNew) g.btn(bw + 2, y, W - 2 - bw - 2, 15, '× DELETE', () => A.go('confirm', { title: 'DELETE EVENT', danger: true, confirm: 'DELETE', lines: ['DELETE "' + e.title + '"' + (e.repeat !== 'none' ? ' AND ALL ITS REPEATS?' : '?')], onConfirm: () => { S.events = S.events.filter(x => x.id !== e.id); S.saveEvents(); A.back(); A.back(); A.say('EVENT DELETED', 2500); } }), { c: RED });
      y += 18;
      g.scrollEnd(y);
      g.footer(A.sayActive() ? A.statusShown(g.t) : (e.repeat === 'week' ? 'REPEATS ' + e.days.map(d => DOW[d]).join(' + ') : 'SAVE WHEN READY'));
    }
  };

  // ======================================================================
  // GOAL · open one, and make one
  // ======================================================================
  RX.screens.goal = {
    jogLabels: () => ['◂ UP', 'DOWN ▸', 'PUSH SELECT'],
    render(g, st, A) {
      const W = g.W, H = g.H, mx = g.mx, gl = S.goals.find(x => x.id === A.top().params.id);
      if (!gl) { g.header('GOAL'); g.textC('NOT FOUND', W / 2, 40, { a: 0.6 }); g.footer('BACK TO RETURN'); return; }
      const s = goalState(gl);
      g.header('CAL · GOAL', gl.kind.toUpperCase());
      let y = g.scrollBegin(13, H - 12) + 2;
      U.wrap(gl.title, Math.floor((W - 4) / 6)).slice(0, 2).forEach(l => { g.text(l, 2, y, { c: HOT }); y += 9; });
      y += 2; g.text(s.val, 2, y, { s: 3, c: s.c }); y += 24;
      const n = 40; for (let i = 0; i < n; i++) mx.rect(2 + i * 4, y, 3, 6, s.c, i < Math.round(s.f * n) ? 1 : 0.13); y += 10;
      g.mini(g.fit(s.sub, W - 4, 'mini'), 2, y, { c: s.subc, a: 1 }); y += 10;
      if (gl.kind === 'habit') {
        y = g.section('LAST 12 WEEKS', y);
        s.weeks.forEach((w, i) => { const x = 2 + i * 13; mx.rect(x, y, 11, 8, w.cur ? s.c : w.n >= s.per ? GRN : RED, w.cur ? 0.5 : 0.85); g.mini(String(w.n), x + 4, y + 10, { a: 0.6 }); });
        y += 19;
      }
      const manual = gl.kind === 'target' || (gl.kind === 'habit' && (gl.source || 'manual') === 'manual');
      if (manual) { const bw = Math.floor((W - 4) / 2); g.btn(0, y, bw, 15, '+1', () => bump(A, gl, 1), { on: true, c: s.c }); g.btn(bw + 2, y, W - 2 - bw - 2, 15, '-1', () => { if ((gl.log || []).length) bump(A, gl, -1); }); y += 18; }
      const bw = Math.floor((W - 4) / 2);
      g.btn(0, y, bw, 13, 'EDIT', () => A.go('goaledit', { id: gl.id }), { face: 'mini' });
      g.btn(bw + 2, y, W - 2 - bw - 2, 13, '× DELETE', () => A.go('confirm', { title: 'DELETE GOAL', danger: true, confirm: 'DELETE', lines: ['DELETE "' + gl.title + '"?'], onConfirm: () => { S.goals = S.goals.filter(x => x !== gl); S.saveGoals(); A.back(); A.say('GOAL DELETED', 2500); } }), { c: RED, face: 'mini' });
      y += 16;
      g.scrollEnd(y);
      g.footer(A.sayActive() ? A.statusShown(g.t) : (manual ? 'PUSH +1 WHEN YOU DO ONE' : 'FILLS ITSELF FROM YOUR LOG'));
    }
  };
  RX.screens.goaledit = {
    enter(st, params) {
      const ex = params.id ? S.goals.find(x => x.id === params.id) : null;
      st.gl = ex ? JSON.parse(JSON.stringify(ex)) : { id: newId('GL'), kind: 'target', title: '', target: 12, by: new Date(new Date().getFullYear(), 11, 31, 23, 59).getTime(), perWeek: 2, source: 'manual', minH: 18, log: [], created: Date.now() };
      st.isNew = !ex;
    },
    render(g, st, A) {
      const W = g.W, H = g.H, gl = st.gl;
      g.header(st.isNew ? 'CAL · NEW GOAL' : 'CAL · EDIT GOAL', '');
      let y = g.scrollBegin(13, H - 12) + 1;
      g.seg(0, y, W - 2, 13, [['target', 'TARGET', CYN], ['habit', 'HABIT', ORG], ['measure', 'MEASURE', YEL]].map(k => ({ label: k[1], on: gl.kind === k[0], c: k[2], fn: () => { gl.kind = k[0]; gl.source = k[0] === 'habit' ? 'trained' : k[0] === 'measure' ? 'weight' : 'manual'; if (k[0] === 'measure') gl.target = (S.profile && S.profile.goalLbs) || 180; } })), { face: 'mini' });
      y += 15;
      g.mini({ target: 'COUNT UP BY HAND TO A NUMBER, BY A DATE', habit: 'SO MANY TIMES A WEEK, FROM YOUR LOG', measure: 'A NUMBER THE RP ALREADY TRACKS' }[gl.kind], 1, y, { a: 0.55 }); y += 9;
      y = g.section('NAME', y);
      g.field('ge-title-' + gl.id, 0, y, W - 2, 13, { value: gl.title, placeholder: { target: 'e.g. READ 12 BOOKS', habit: 'e.g. TRAIN 2X A WEEK', measure: 'e.g. WEIGH 184' }[gl.kind], maxLen: 40, onCommit: v => { gl.title = RX.font.norm(String(v || '').trim()); } });
      y += 16;
      if (gl.kind === 'target') {
        y = g.section('HOW MANY', y);
        g.field('ge-n-' + gl.id, 0, y, 60, 13, { kind: 'number', value: String(gl.target), maxLen: 5, onCommit: v => { const n = parseInt(v, 10); if (n > 0) gl.target = n; } });
        y += 16; y = g.section('BY', y, gl.by ? F.dateY(gl.by) : 'NO DATE');
        g.field('ge-by-' + gl.id, 0, y, W - 40, 13, { kind: 'date', value: gl.by || '', placeholder: 'NO DEADLINE', onCommit: v => { gl.by = v || null; } });
        if (!(U.activeField && U.activeField.key === 'ge-by-' + gl.id) && gl.by) { g.mx.clearRect(2, y + 2, W - 44, 9); g.text(F.day(gl.by), 4, y + 3, { c: HOT }); }
        g.btn(W - 38, y, 36, 13, 'NONE', () => { gl.by = null; }, { face: 'mini', dim: !gl.by });
        y += 16;
      } else if (gl.kind === 'habit') {
        y = g.section('COUNTS FROM', y);
        g.seg(0, y, W - 2, 12, [['trained', 'TRAINED'], ['fast', 'FASTS'], ['manual', 'BY HAND']].map(k => ({ label: k[1], on: gl.source === k[0], fn: () => { gl.source = k[0]; } })), { face: 'mini' });
        y += 15;
        if (gl.source === 'fast') { y = g.section('FASTS OF AT LEAST', y); g.seg(0, y, W - 2, 12, [16, 18, 24, 36, 48].map(h => ({ label: h + 'H', on: gl.minH === h, fn: () => { gl.minH = h; } })), { face: 'mini' }); y += 15; }
        y = g.section('TIMES A WEEK', y);
        g.seg(0, y, W - 2, 12, [1, 2, 3, 4, 5, 6, 7].map(n => ({ label: String(n), on: gl.perWeek === n, fn: () => { gl.perWeek = n; } })), { face: 'mini' });
        y += 15;
      } else {
        y = g.section('TRACKS', y);
        g.seg(0, y, W - 2, 12, [['weight', 'WEIGHT'], ['explored', 'SQ MI EXPLORED']].map(k => ({ label: k[1], on: gl.source === k[0], fn: () => { gl.source = k[0]; gl.target = k[0] === 'weight' ? ((S.profile && S.profile.goalLbs) || 180) : 100; } })), { face: 'mini' });
        y += 15; y = g.section('GOAL', y, gl.source === 'weight' ? 'LB' : 'SQ MI');
        g.field('ge-t-' + gl.id, 0, y, 60, 13, { kind: 'number', value: String(gl.target), maxLen: 6, onCommit: v => { const n = parseFloat(v); if (n > 0) gl.target = n; } });
        y += 16;
      }
      g.btn(0, y, W - 2, 15, st.isNew ? '▸ ADD GOAL' : 'SAVE', () => {
        if (!gl.title) gl.title = gl.kind === 'habit' ? ({ trained: 'TRAIN', fast: 'FAST ' + gl.minH + 'H+', manual: 'HABIT' }[gl.source] + ' ' + gl.perWeek + 'X A WEEK') : gl.kind === 'measure' ? (gl.source === 'weight' ? 'WEIGH ' + gl.target : 'EXPLORE ' + gl.target + ' SQ MI') : '';
        if (!gl.title) { A.say('GIVE IT A NAME FIRST', 2500); A.beep('err'); return; }
        const i = S.goals.findIndex(x => x.id === gl.id);
        if (i >= 0) S.goals[i] = gl; else S.goals.push(gl);
        S.saveGoals(); A.beep('file'); A.back(); A.say((st.isNew ? 'GOAL ADDED ▸ ' : 'SAVED ▸ ') + gl.title, 3000);
      }, { on: true, c: AMB });
      y += 18;
      g.scrollEnd(y);
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'SAVE WHEN READY');
    }
  };

  // ======================================================================
  // REMINDERS · while the RP is open: a beep and a line 15 min before, and at the time
  // ======================================================================
  const told = {};
  function remind() {
    const A = RX.app; if (!A || !A.booted) return;
    const now = Date.now();
    upcoming(0.3).forEach(it => {
      const mins = Math.round((it.ts - now) / 60000), key = (it.ev ? it.ev.id : it.m.id) + ':' + it.ts;
      const stage = mins <= 1 ? 'now' : mins <= 15 ? 'soon' : null;
      if (!stage || told[key + stage]) return;
      told[key + stage] = 1;
      A.beep('file'); A.say((stage === 'now' ? 'NOW ▸ ' : 'IN ' + mins + ' MIN ▸ ') + it.title, 8000);
      A.lcdMsg = { rows: [['CAL', stage === 'now' ? 'NOW' : 'IN ' + mins + ' MIN'], ['', it.title], ['', t12(it.ts)]], until: Date.now() + 15000 }; A.lcdDirty = true;
    });
  }
  setInterval(remind, 30000);

  RX.cal = { dayItems, upcoming, overdue, sod, dayName, t12, goalState };
})();
