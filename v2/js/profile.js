/* =============================================================
   RECON.OS RX-90 · PROFILE
   Four pages: STAT · BODY · RECORD · FILE, plus the weigh-in box
   and the tape measure. MAUS (js/maus.js) stands on STAT: his pose
   and face come from what you do (training, fasting, bests, REC),
   his build from your height and weight, eased over four weeks.
   Body fat is the Navy method (neck, waist, height; hips too for
   women). XP and levels are worked out from everything you log.
   New records: recon.os.profile and recon.os.tapes.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const S = RX.store, U = RX.ui, F = U.F, C = U.C, FONT = RX.font;
  const HOT = '#E9FFF7', INK = '#7DFFD6', AMB = '#FFB547', GRN = '#6BFF8E', YEL = '#FFE45C', ORG = '#FF9F3A', RED = '#FF5A4E', CYN = '#5CC8FF', GRY = '#6F8580';
  const TIER_C = [null, '#E0560E', '#D8E4E8', '#FFBC00'];
  const ROMAN = ['', 'I', 'II', 'III'];
  const PAGES = ['STAT', 'BODY', 'RECORD', 'FILE'];
  const DAY = 864e5, CELL_SQMI = 22500 / 2589988;
  const MONS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const md = ts => { const d = new Date(ts); return F.pad2(d.getDate()) + ' ' + MONS[d.getMonth()]; };
  const dayKey = ts => { const d = new Date(ts); return d.getFullYear() + '-' + F.pad2(d.getMonth() + 1) + '-' + F.pad2(d.getDate()); };
  const dayStart = ts => { const d = new Date(ts == null ? Date.now() : ts); d.setHours(0, 0, 0, 0); return d.getTime(); };
  const weekStart = ts => { const d = new Date(dayStart(ts)); const k = (d.getDay() + 6) % 7; return d.getTime() - k * DAY; };   // Monday
  const dayIdx = () => (new Date().getDay() + 6) % 7;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const measure = (s, face, sc) => FONT.measure(s, face, sc);
  const comma = n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // ======================================================================
  // DATA
  // ======================================================================
  const KEY = 'recon.os.profile';
  const DEF = { name: 'JAR', call: 'THE RUST ORACLE', birth: null, heightIn: null, sex: null, blood: '', home: 'BAYTOWN TX', units: 'US',
    goalLbs: null, startLbs: null, trainTarget: 2, fastGoal: 18, fieldTarget: 0,
    photo: null, crop: null, bright: 0, contrast: 0, earned: {}, badgesInit: false, days: {}, odo: 0, cityPct: null, cityName: null, lvSeen: 0 };
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

  // the tape: { id, ts, neck, waist, hips, chest, arm, thigh } in inches (null = not measured)
  const KT = 'recon.os.tapes';
  S.tapes = [];
  S.loadTapes = function () { try { S.tapes = JSON.parse(localStorage.getItem(KT) || '[]') || []; } catch (e) { S.tapes = []; } };
  S.saveTapes = function () { try { localStorage.setItem(KT, JSON.stringify(S.tapes)); } catch (e) { if (S.onWriteFail) S.onWriteFail(KT); } };
  S.K.tapes = KT;
  S.loadTapes();

  // ---------- units ----------
  const metric = () => S.profile.units === 'METRIC';
  const wt = lbs => lbs == null ? '--' : metric() ? (lbs * 0.45359).toFixed(1) : (Math.round(lbs * 10) / 10).toFixed(1);
  const wtU = () => metric() ? 'KG' : 'LB';
  const wtD = lbs => { if (lbs == null) return '--'; const v = metric() ? lbs * 0.45359 : lbs; return (Math.abs(v) < 10 ? (Math.round(v * 10) / 10) : Math.round(v)).toString(); };
  const ht = inch => { if (!inch) return '--'; if (metric()) return Math.round(inch * 2.54) + ' CM'; return Math.floor(inch / 12) + "'" + Math.round(inch % 12) + '"'; };
  const len = inch => { if (inch == null) return '--'; if (metric()) return (inch * 2.54).toFixed(1); const q = Math.round(inch * 4) / 4; return (q % 0.5 ? q.toFixed(2) : q.toFixed(1)) + '"'; };
  const lenD = inch => (metric() ? Math.abs(inch * 2.54) : Math.abs(inch)).toFixed(1);
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
  // NUMBERS
  // ======================================================================
  // worked out again only when the data (or the minute) changes
  function dataSig() {
    let sets = 0; for (const w of S.workouts) { if (w.sets) for (const v of w.sets) sets += v || 0; sets += (w.lbs || 0) + 1; }
    const P = S.profile;
    return [S.workouts.length, sets, S.fasts.length, S.fasts.filter(f => f.endTs).length, S.weighins.length, S.tapes.length, S.journal.length,
      (S.tracks || []).length, S.moves.map(m => m.id + (m.area || '')).join(''), Object.keys(P.days).length, P.days[dayKey(Date.now())] || 0,
      P.heightIn, P.sex, P.goalLbs, P.trainTarget, !!S.rec, Math.floor(Date.now() / 60000)].join('|');
  }
  const memo = fn => { let k = null, v = null; const f = () => { const s = dataSig(); if (s !== k) { k = s; v = fn(); } return v; }; f.reset = () => { k = null; }; return f; };

  const wis = () => S.weighins.filter(w => w && w.lbs).slice().sort((a, b) => a.ts - b.ts);
  // anything logged today counts (HLTH ▸ TRAIN exercises or an old TRAINED entry)
  const trainedToday = () => S.workouts.filter(w => w.ts >= dayStart()).sort((a, b) => a.ts - b.ts)[0];
  // sessions = days you trained (three exercises on one day is one session)
  const sessionsIn = (a, b) => new Set(S.workouts.filter(w => w.ts >= a && w.ts < b).map(w => dayKey(w.ts))).size;
  const lbsAt = ts => { const L = wis().filter(w => w.ts <= ts); return L.length ? L[L.length - 1].lbs : null; };

  function weightInfo() {
    const L = wis(), P = S.profile;
    if (!L.length) return { cur: null, col: GRY, val: 'NO DATA', frac: 0, sub: 'WEIGH IN TO START', stale: null };
    const last = L[L.length - 1], cur = last.lbs, start = P.startLbs || L[0].lbs, goal = P.goalLbs;
    const days = Math.floor((Date.now() - last.ts) / DAY);
    const monthAgo = L.filter(w => w.ts <= Date.now() - 28 * DAY).pop() || L[0];
    const ch = cur - monthAgo.lbs;   // change over the month
    let col, frac;
    if (goal == null) { frac = 0; col = GRN; }
    else {
      const left = cur - goal, dirDown = start >= goal, toward = dirDown ? -ch : ch;
      frac = start === goal ? 1 : clamp((start - cur) / (start - goal), 0, 1);
      col = Math.abs(left) < 0.25 || toward >= 1 ? GRN : toward > -0.5 ? YEL : RED;
    }
    if (days >= 14) col = GRY;
    return { cur, col, frac, ch, stale: days >= 7 ? days : null, last };
  }
  function trainInfo() {
    const T = Math.max(1, S.profile.trainTarget || 2), done = sessionsIn(weekStart(), weekStart() + 7 * DAY), today = trainedToday();
    const need = Math.max(0, T - done), left = 7 - dayIdx();
    return { T, done, need, left, today };
  }
  const groundToday = () => S.profile.days[dayKey(Date.now())] || 0;
  function trainWeeks() {
    // weeks with the target met: total and best run of back-to-back weeks
    const T = Math.max(1, S.profile.trainTarget || 2), cnt = {};
    const seen = new Set();
    S.workouts.forEach(w => { const dk = dayKey(w.ts); if (seen.has(dk)) return; seen.add(dk); const k = weekStart(w.ts); cnt[k] = (cnt[k] || 0) + 1; });
    const keys = Object.keys(cnt).map(Number).sort((a, b) => a - b);
    let total = 0, best = 0, run = 0, prev = null, bestEnd = null;
    keys.forEach(k => { if (cnt[k] >= T) { total++; run = (prev != null && Math.round((k - prev) / (7 * DAY)) === 1 && cnt[prev] >= T) ? run + 1 : 1; if (run > best) { best = run; bestEnd = k; } } prev = k; });
    return { total, best, bestEnd };
  }

  // ---------- the body: Navy method ----------
  const log10 = Math.log10;
  function navy(sex, h, neck, waist, hips) {
    if (!sex || !h || !neck || !waist) return null;
    let bf;
    if (sex === 'F') { if (!hips || waist + hips - neck <= 0) return null; bf = 163.205 * log10(waist + hips - neck) - 97.684 * log10(h) - 78.387; }
    else { if (waist - neck <= 0) return null; bf = 86.010 * log10(waist - neck) - 70.041 * log10(h) + 36.76; }
    return isFinite(bf) ? clamp(bf, 2, 60) : null;
  }
  const tapeBF = t => t ? navy(S.profile.sex, S.profile.heightIn, t.neck, t.waist, t.hips) : null;
  const tapesSorted = () => S.tapes.slice().sort((a, b) => a.ts - b.ts);
  const lastTape = () => { const T = tapesSorted(); return T.length ? T[T.length - 1] : null; };
  // the latest tape and the one to compare it with (about a month before)
  function tapePair() {
    const T = tapesSorted(); if (!T.length) return { t: null, p: null };
    const t = T[T.length - 1], before = T.filter(x => x.ts <= t.ts - 25 * DAY);
    return { t, p: before.length ? before[before.length - 1] : (T.length > 1 ? T[0] : null) };
  }
  function bodyInfo() {
    const P = S.profile, wi = weightInfo(), { t, p } = tapePair();
    const bf = tapeBF(t), bfP = tapeBF(p);
    const w = wi.cur, fat = w != null && bf != null ? w * bf / 100 : null, lean = fat != null ? w - fat : null;
    const bmi = w && P.heightIn ? 703 * w / (P.heightIn * P.heightIn) : null;
    const goalBF = lean != null && P.goalLbs && P.goalLbs > lean ? (P.goalLbs - lean) / P.goalLbs * 100 : null;
    const w30 = w != null ? lbsAt(Date.now() - 30 * DAY) : null;
    return { w, bf, bfP, t, p, fat, lean, bmi, goalBF, dW: w30 != null ? w - w30 : null, dBF: bf != null && bfP != null ? bf - bfP : null,
      whr: t && t.waist && P.heightIn ? t.waist / P.heightIn : null };
  }
  // his build: BMI on the four-week average, so it eases, never jumps
  function buildNow() {
    const P = S.profile; if (!P.heightIn) return RX.maus.buildFor(null);
    const L = wis(); if (!L.length) return RX.maus.buildFor(null);
    const recent = L.filter(w => w.ts >= Date.now() - 28 * DAY), use = recent.length ? recent : [L[L.length - 1]];
    const avg = use.reduce((m, w) => m + w.lbs, 0) / use.length;
    return RX.maus.buildFor(703 * avg / (P.heightIn * P.heightIn));
  }

  // ---------- body areas: days since each was worked ----------
  const AREAS = ['LEGS', 'PUSH', 'PULL', 'CORE', 'CARDIO'];
  const areaDays = memo(() => {
    const last = {};
    S.workouts.forEach(w => { const a = RX.fit && RX.fit.areaOf(w); if (a && (!last[a] || w.ts > last[a])) last[a] = w.ts; });
    const out = {}; AREAS.forEach(a => { out[a] = last[a] ? Math.round((dayStart() - dayStart(last[a])) / DAY) : null; });
    return out;
  });
  const recCol = d => d == null ? GRY : d <= 2 ? GRN : d <= 5 ? INK : d <= 8 ? AMB : RED;
  const recTxt = d => d == null ? 'NEVER' : d === 0 ? 'TODAY' : d + 'D AGO';

  // ---------- bests per exercise, and new bests (PRs) ----------
  const prInfo = memo(() => {
    const prs = [], best = [];
    S.moves.forEach(m => {
      const logs = S.workouts.filter(w => w.moveId === m.id && (w.sets || []).some(v => v > 0)).sort((a, b) => a.ts - b.ts);
      let top = null;
      logs.forEach(L => {
        const kind = L.kind || m.kind, v = Math.max(...L.sets.filter(x => x > 0));
        let score, text;
        if (kind === 'reps') { score = (L.lbs || 0) * 1000 + v; text = L.lbs ? L.lbs + ' LB × ' + v : v + ' REPS'; }
        else if (kind === 'time') { score = v; text = RX.fit.amtLong({ kind: 'time' }, v); }
        else { score = v; text = (Math.round(v * 100) / 100) + ' MI'; }
        if (top && score > top.score) prs.push({ ts: L.ts, name: m.name, text });
        if (!top || score > top.score) top = { score, text, ts: L.ts };
      });
      if (top) best.push({ name: m.name, text: top.text, ts: top.ts });
    });
    // a fast longer than any before it
    let longest = 0;
    S.fasts.filter(f => f.endTs && f.hours).sort((a, b) => a.endTs - b.endTs).forEach(f => {
      if (longest && f.hours > longest) prs.push({ ts: f.endTs, name: 'LONGEST FAST', text: Math.round(f.hours) + 'H' });
      longest = Math.max(longest, f.hours);
    });
    prs.sort((a, b) => a.ts - b.ts);
    return { prs, best };
  });
  const recentPR = ms => { const P = prInfo().prs.filter(p => p.ts >= Date.now() - ms); return P.length ? P[P.length - 1] : null; };

  function bests() {
    const out = [];
    const done = S.fasts.filter(f => f.endTs);
    const lf = done.reduce((m, f) => (!m || (f.hours || 0) > (m.hours || 0)) ? f : m, null);
    const act = S.activeFast(), ah = act ? (Date.now() - act.startTs) / 36e5 : 0;
    if (act && (!lf || ah > (lf.hours || 0))) out.push(['LONGEST FAST', Math.floor(ah) + 'H', 'NOW']);
    else out.push(['LONGEST FAST', lf ? Math.round(lf.hours) + 'H' : '--', lf ? md(lf.startTs) : '']);
    prInfo().best.forEach(b => out.push([b.name, b.text, md(b.ts)]));
    const L = wis(), lw = L.reduce((m, w) => (!m || w.lbs < m.lbs) ? w : m, null);
    out.push(['LOWEST WEIGHT', lw ? wt(lw.lbs) + ' ' + wtU() : '--', lw ? md(lw.ts) : '']);
    const lt = (S.tracks || []).reduce((m, t) => (!m || t.m > m.m) ? t : m, null);
    if (lt) out.push(['LONGEST TRACK', (lt.m / 1609.344).toFixed(1) + ' MI', md(lt.t0)]);
    out.push(['FAST STREAK', String(S.fastStreak().best || 0), '']);
    const tw = trainWeeks();
    out.push(['TRAIN STREAK', tw.best + ' WK', tw.bestEnd ? md(tw.bestEnd) : '']);
    let gk = null, gv = 0; Object.keys(S.profile.days).forEach(k => { if (S.profile.days[k] > gv) { gv = S.profile.days[k]; gk = k; } });
    out.push(['GROUND · DAY', gv ? (gv * CELL_SQMI).toFixed(1) + ' SQ MI' : '--', gk ? md(new Date(gk + 'T12:00').getTime()) : '']);
    const byDay = {}; S.journal.forEach(j => { if (j.type === 'drop') { const k = dayKey(j.ts); byDay[k] = (byDay[k] || 0) + 1; } });
    let mk = null, mv = 0; Object.keys(byDay).forEach(k => { if (byDay[k] > mv) { mv = byDay[k]; mk = k; } });
    out.push(['MARKS · DAY', mv ? String(mv) : '--', mk ? md(new Date(mk + 'T12:00').getTime()) : '']);
    return out;
  }

  // ======================================================================
  // XP + LEVELS: everything you log earns XP; the curve is 100·(LV-1)²
  // ======================================================================
  const XPR = { train: 100, fastH: 5, weigh: 10, tape: 25, mark: 10, visit: 5, trackMi: 5, sqmi: 150, pr: 50 };
  const RANKS = [[1, 'ROOKIE'], [5, 'SCOUT'], [10, 'PATHFINDER'], [15, 'TRAILBLAZER'], [20, 'RANGER'], [25, 'NAVIGATOR'], [30, 'CARTOGRAPHER'], [35, 'WARDEN'], [40, 'VETERAN'], [45, 'LEGEND'], [50, 'ORACLE']];
  const cum = L => 100 * (L - 1) * (L - 1);
  const levelOf = xp => Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
  const rankOf = L => RANKS.filter(r => r[0] <= L).pop()[1];
  const nextRank = L => RANKS.find(r => r[0] > L) || null;
  const xpInfo = memo(() => {
    const ws = weekStart(); let tot = 0; const wk = {};
    const add = (ts, k, xp, n) => { xp = Math.round(xp); if (xp <= 0) return; tot += xp; if (ts >= ws) { const b = wk[k] || (wk[k] = { xp: 0, n: 0 }); b.xp += xp; b.n += n == null ? 1 : n; } };
    const firstOfDay = (list, tsOf) => { const seen = {}; list.forEach(x => { const t = tsOf(x), k = dayKey(t); if (seen[k] == null || t < seen[k]) seen[k] = t; }); return Object.values(seen); };
    firstOfDay(S.workouts, w => w.ts).forEach(ts => add(ts, 'train', XPR.train));
    S.fasts.forEach(f => { if (f.endTs && f.hours) add(f.endTs, 'fast', Math.floor(f.hours) * XPR.fastH, Math.floor(f.hours)); });
    firstOfDay(S.weighins.filter(w => w && w.lbs), w => w.ts).forEach(ts => add(ts, 'weigh', XPR.weigh));
    firstOfDay(S.tapes, t => t.ts).forEach(ts => add(ts, 'tape', XPR.tape));
    S.journal.forEach(j => { if (j.type === 'drop') add(j.ts, 'mark', XPR.mark); else if (j.type === 'visit') add(j.ts, 'visit', XPR.visit); });
    (S.tracks || []).forEach(t => { const mi = (t.m || 0) / 1609.344; add(t.t0, 'track', mi * XPR.trackMi, mi); });
    Object.keys(S.profile.days).forEach(k => { const sq = S.profile.days[k] * CELL_SQMI; add(new Date(k + 'T12:00').getTime(), 'ground', sq * XPR.sqmi, sq); });
    prInfo().prs.forEach(p => add(p.ts, 'pr', XPR.pr));
    const lv = levelOf(tot), lo = cum(lv), hi = cum(lv + 1);
    return { xp: tot, lv, rank: rankOf(lv), next: nextRank(lv), into: tot - lo, span: hi - lo, frac: (tot - lo) / (hi - lo), wk, wkXP: Object.values(wk).reduce((m, b) => m + b.xp, 0) };
  });
  const WK_LINES = [
    ['train', b => 'TRAINED ×' + b.n, CYN], ['fast', b => 'FASTED ' + b.n + 'H', AMB], ['weigh', b => 'WEIGH-INS ×' + b.n, YEL], ['tape', b => 'TAPE ×' + b.n, YEL],
    ['ground', b => 'GROUND · ' + b.n.toFixed(1) + ' SQ MI', GRN], ['mark', b => 'MARKS ×' + b.n, INK], ['visit', b => 'VISITS ×' + b.n, INK],
    ['track', b => 'TRACKS · ' + b.n.toFixed(1) + ' MI', CYN], ['pr', b => 'NEW BESTS ×' + b.n, AMB]
  ];

  // ======================================================================
  // MAUS: his state, from what you do
  // ======================================================================
  const STATE_COL = { SHARP: GRN, STEADY: INK, SLIPPING: RED, FOCUSED: AMB, FUMES: YEL, EATING: GRN, NEW_PR: AMB, ON_MOVE: CYN, RESTING: INK };
  function lastTrained() { let t = 0; S.workouts.forEach(w => { if (w.ts > t) t = w.ts; }); return t || null; }
  function lastEnded() { let f = null; S.fasts.forEach(x => { if (x.endTs && (!f || x.endTs > f.endTs)) f = x; }); return f; }
  function mausState() {
    const now = Date.now(), hr = new Date().getHours();
    const f = S.activeFast(), fh = f ? (now - f.startTs) / 36e5 : 0;
    const pr = recentPR(DAY), le = lastEnded(), tr = trainInfo(), lt = lastTrained();
    const since = lt ? Math.round((dayStart() - dayStart(lt)) / DAY) : null;
    const st = (key, say) => ({ key, say, col: STATE_COL[key] });
    if (S.rec && RX.aux && RX.aux.stats) { const s = RX.aux.stats(S.rec); return st('ON_MOVE', 'REC · ' + s.mi.toFixed(2) + ' MI · ON THE MOVE'); }
    if (pr) return st('NEW_PR', 'NEW BEST · ' + pr.name + ' ' + pr.text);
    if (fh >= 36) return st('FUMES', 'FASTING · ' + Math.floor(fh) + 'H · RUNNING ON FUMES');
    if (fh >= 12) return st('FOCUSED', 'FASTING · ' + Math.floor(fh) + 'H · ' + (fh >= 16 ? 'BURNING FAT' : 'LOCKED IN'));
    if (!f && le && le.hours >= 16 && now - le.endTs < 3 * 36e5) return st('EATING', 'BROKE A ' + Math.round(le.hours) + 'H FAST · REFUEL');
    if (lt && (since >= 5 || tr.need > tr.left)) return st('SLIPPING', since >= 5 ? since + ' DAYS SINCE YOU TRAINED' : 'WEEK TARGET OUT OF REACH');
    if (hr >= 23 || hr < 5) return st('RESTING', 'LATE · GET SOME SLEEP');
    if (tr.today) return st('SHARP', 'TRAINED TODAY · ' + (tr.done >= tr.T ? 'WEEK TARGET MET' : tr.done + '/' + tr.T + ' THIS WEEK'));
    if (tr.done >= tr.T) return st('SHARP', 'ON PLAN THIS WEEK');
    if (since === 1 && !(RX.fit && S.moves.some(m => RX.fit.plannedOn(m, dayStart())))) return st('RESTING', 'REST DAY · EARNED IT');
    return st('STEADY', lt ? 'HOLDING STEADY · ' + tr.done + '/' + tr.T + ' THIS WEEK' : 'LOG A WORKOUT ON TRAIN');
  }
  // the three bars
  function bars() {
    const P = S.profile, wi = weightInfo(), tr = trainInfo(), f = S.activeFast(), le = lastEnded(), now = Date.now();
    const cond = P.goalLbs && wi.cur != null ? { frac: wi.frac, val: Math.round(wi.frac * 100) + '%', col: wi.col === GRY ? GRY : GRN } : { frac: 0, val: wi.cur == null ? 'WEIGH IN' : 'SET GOAL', col: GRY };
    let fuel;
    if (f) { const h = (now - f.startTs) / 36e5; fuel = { frac: clamp(1 - h / 48, 0.04, 1), val: Math.floor(h) + 'H FAST', col: AMB }; }
    else if (le) { const h = (now - le.endTs) / 36e5; fuel = { frac: clamp(1 - h / 24, 0.4, 1), val: 'FED ' + (h < 48 ? Math.floor(h) + 'H' : Math.floor(h / 24) + 'D'), col: AMB }; }
    else fuel = { frac: 0.6, val: 'NO FASTS', col: AMB };
    const drive = { frac: clamp(tr.done / tr.T, 0, 1), val: tr.done + ' / ' + tr.T, col: tr.done >= tr.T ? GRN : (tr.need > tr.left ? RED : CYN) };
    return { cond, fuel, drive };
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
    { id: 'intel', icon: 'EYE', name: 'INTEL', desc: 'FILE 10 · 50 · 100 INTEL MARKS', t: [10, 50, 100], v: () => S.pois.filter(p => p.category && RX.ui.kindOf(p) === 'INTEL').length },
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
  // a new tier or a new level: a beep and a line on the strip (the first check just records what's already there)
  function checkBadges(A) {
    const P = S.profile; let fresh = null, changed = false;
    BADGES.forEach(b => { const s = badgeState(b); if (s.tier > (P.earned[b.id] || 0)) { P.earned[b.id] = s.tier; changed = true; if (P.badgesInit) fresh = { b, tier: s.tier }; } });
    if (!P.badgesInit) { P.badgesInit = true; changed = true; }
    const X = xpInfo(); let up = null;
    if (X.lv > (P.lvSeen || 0)) { if (P.lvSeen) up = X; P.lvSeen = X.lv; changed = true; }
    if (changed) S.saveProfile();
    if (!A) return;
    if (up) { A.beep('file'); A.say('MAUS ▸ LEVEL UP · LV ' + up.lv + (rankOf(up.lv) !== rankOf(up.lv - 1) ? ' · ' + up.rank : ''), 6000); A.lcdMsg = null; A.lcdDirty = true; }
    else if (fresh) { A.beep('file'); A.say('BADGE ▸ ' + fresh.b.name + ' · ' + ROMAN[fresh.tier], 6000); A.lcdMsg = null; A.lcdDirty = true; }
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
  // PHOTOS → DOTS (ROLO cards use it)
  // ======================================================================
  const imgCache = {};
  function photoImg(src) {
    if (!src) return null;
    let e = imgCache[src];
    if (!e) { const im = new Image(); e = imgCache[src] = { im, ok: false }; im.onload = () => { e.ok = true; if (U.onAsync) U.onAsync(); }; im.src = src; }
    return e.ok ? e.im : null;
  }
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
  function blit(mx, x0, y0, w, h, L, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const a = L[j * w + i]; if (a > 0.02) mx.set(x0 + i, y0 + j, c, a); } }
  RX.dotPhoto = function (g, src, x, y, w, h) {
    const im = photoImg(src); if (!im) return false;
    const cw = Math.min(im.width, im.height * w / h) * 0.92, ch = cw * h / w;
    blit(g.mx, x, y, w, h, cells(im, [(im.width - cw) / 2, Math.max(0, (im.height - ch) * 0.3), cw, ch], w, h, {}), C.ink);
    return true;
  };

  // ======================================================================
  // SHARED BITS
  // ======================================================================
  const segBar = (mx, x, y, w, frac, col, n) => { n = n || 10; const sw = (w - (n - 1)) / n; for (let i = 0; i < n; i++) { const on = (i + 0.5) / n <= frac; mx.rect(Math.round(x + i * (sw + 1)), y, Math.max(1, Math.round(sw)), 5, col, on ? 1 : 0.16); } };
  function header(g, st) {
    const X = xpInfo();
    const right = st.pg === 0 ? 'LV ' + X.lv + ' · ' + X.rank : st.pg === 1 ? 'COMPOSITION' + (S.tapes.length ? ' · ' + md(lastTape().ts) : '') : st.pg === 2 ? comma(X.xp) + ' XP' : 'SETTINGS';
    g.header(PAGES[st.pg], right);
    return 13;
  }
  function turn(st, A, pg) {
    U.closeField(true);
    st.pg = pg; st.scroll = 0; st.sel = 0; st.jog = false; st.edit = null;
    S.saveV2({ profPage: st.pg });
    A.dirty = true;
    if (st.pg === 2) checkBadges(A);
  }
  const POKE_MS = 520;
  function poke(st, A, ms) {
    st.pokeAt = performance.now(); A.beep('key');
    A.say('MAUS · ' + ms.key.replace('_', ' ') + ' · ' + ms.say, 3000);
  }

  // ======================================================================
  // PAGE 1 · STAT
  // ======================================================================
  function pageStat(g, st, A, still) {
    const W = g.W, H = g.H, mx = g.mx, P = S.profile, X = xpInfo();
    const ms = st.force ? { key: st.force, say: 'PREVIEW', col: STATE_COL[st.force] } : mausState();
    // who
    const nw = g.text(FONT.fit(P.name || 'NAME?', 44), 1, 14, { c: P.name ? HOT : C.ink, a: P.name ? 1 : 0.4 });
    g.mini(FONT.fit(P.call || '', W - nw - 6, 'mini'), nw + 4, 15, { c: AMB, a: 1 });
    // him
    const figH = clamp(H - 128, 62, 122), top = 25, cx = Math.round(W / 2), s = figH / 100, B = buildNow();
    const pk = st.pokeAt ? (performance.now() - st.pokeAt) / POKE_MS : 0;
    RX.maus.draw(mx, cx, top, figH, ms.key, { t: g.t, build: B, poke: pk });
    if (!still) g.hit(Math.round(cx - 22 * s), top, Math.round(44 * s), figH, () => poke(st, A, ms));
    // body areas, like limb condition: how long since you worked each one
    const AD = areaDays(), lastY = { L: -99, R: -99 };
    [['PUSH', 'L', 44, 7], ['CORE', 'L', 56, 8], ['LEGS', 'L', 78, 5], ['PULL', 'R', 44, 7], ['CARDIO', 'R', 56, 8]].forEach(([lab, side, v, hx]) => {
      const d = AD[lab], col = recCol(d), y = Math.max(Math.round(top + v * s), lastY[side] + 16); lastY[side] = y;
      const bx = Math.round(cx + (side === 'L' ? -1 : 1) * hx * (lab === 'LEGS' ? 1 : B.w) * s);
      if (side === 'L') { g.mini(lab, 1, y - 7, { c: col, a: 1 }); g.mini(recTxt(d), 1, y, { a: 0.7 }); }
      else { g.miniR(lab, W - 2, y - 7, { c: col, a: 1 }); g.miniR(recTxt(d), W - 2, y, { a: 0.7 }); }
      const lx0 = side === 'L' ? 31 : W - 32;
      mx.line(lx0, y - 2, bx, y - 2, col, 0.5, 2); mx.disc(bx, y - 2, 1.4, col, 1);
      if (!still) g.hit(side === 'L' ? 0 : W - 31, y - 8, 31, 14, () => A.go('fast', { page: 'train' }));
    });
    let y = top + figH + 6;
    // the state, in a word
    const word = ms.key.replace('_', ' ');
    mx.rect(0, y, W, 11, ms.col, 0.14); mx.frame(0, y, W, 11, ms.col, 0.7);
    const ww = g.text(word, 3, y + 2, { c: ms.col });
    g.miniR(g.fit(ms.say, W - ww - 12, 'mini'), W - 3, y + 3, { c: HOT, a: 0.95 });
    if (!still) g.hit(0, y, W, 11, () => poke(st, A, ms));
    y += 15;
    // the three bars (jog walks them; push opens what feeds them)
    const BR = bars();
    const bar = (lab, b, fn) => {
      const r = { x: 0, y: y - 2, w: W - 1, h: 11 };
      if (!still) g.row(r.x, r.y, r.w, r.h, fn);
      g.mini(lab, 2, y + 1, { a: 0.75 }); segBar(mx, 42, y, W - 42 - 44, b.frac, b.col); g.textR(b.val, W - 3, y - 1, { c: b.col });
      y += 11; return r;
    };
    bar('CONDITION', BR.cond, () => turn(st, A, 1));
    bar('FUEL', BR.fuel, () => A.go('fast'));
    st.trainRect = bar('DRIVE', BR.drive, () => A.go('fast', { page: 'train' }));
    y += 1;
    // level
    mx.hline(0, y, W, C.ink, 0.3, 2); y += 3;
    if (!still) g.row(0, y - 1, W - 1, 17, () => turn(st, A, 2));
    const lw = g.text('LV ' + X.lv, 2, y + 1, { c: HOT });
    g.mini(g.fit(X.rank, 74 - lw - 6, 'mini'), lw + 5, y + 2, { c: AMB, a: 1 });
    const bx = 76, bw = W - bx - 3;
    mx.frame(bx, y + 1, bw, 6, C.ink, 0.6); mx.rect(bx + 1, y + 2, Math.round((bw - 2) * X.frac), 4, AMB, 0.9);
    g.miniR(comma(X.into) + ' / ' + comma(X.span) + ' XP', W - 3, y + 9, { a: 0.7 });
    y += 18;
    // tags: what's going on right now
    const f = S.activeFast(), fs = S.fastStreak(), tr = trainInfo(), wi = weightInfo(), pr = recentPR(7 * DAY);
    const tags = [];
    if (f) tags.push(['FAST ' + Math.floor((Date.now() - f.startTs) / 36e5) + 'H', AMB]);
    if (fs.current >= 2) tags.push(['STREAK ' + fs.current, CYN]);
    if (pr) tags.push(['PR · ' + pr.name, GRN]);
    if (tr.today) tags.push(['TRAINED TODAY', CYN]);
    if (groundToday() > 0) tags.push(['NEW GROUND', GRN]);
    if (S.rec) tags.push(['REC', RED]);
    const pend = S.pending().length; if (pend) tags.push([pend + ' PENDING', ORG]);
    if (!S.v2.lastBackup || Date.now() - S.v2.lastBackup > 7 * DAY) tags.push(['BACKUP DUE', ORG]);
    if (S.missions.some(m => m.status === 'active' && m.deadline && m.deadline < Date.now())) tags.push(['OBJECTIVE OVERDUE', ORG]);
    if (wi.stale) tags.push(['WEIGH-IN ' + wi.stale + 'D AGO', GRY]);
    if (S.tapes.length && Date.now() - lastTape().ts > 30 * DAY) tags.push(['TAPE DUE', GRY]);
    let x = 0;
    for (const t of tags) {
      const w = measure(t[0], 'mini') + 5;
      if (x + w > W) { x = 0; y += 11; }
      if (y + 9 > H - 12) break;
      mx.frame(x, y, w, 9, t[1], 0.7); g.mini(t[0], x + 3, y + 2, { c: t[1], a: 1 }); x += w + 3;
    }
  }
  // an old one-tap TRAINED entry from today can still be held away
  const oldTrained = () => S.workouts.find(w => w.type === 'TRAINED' && !w.moveId && w.ts >= dayStart());
  function undoTrained(A) {
    const t = oldTrained(); if (!t) return;
    S.workouts = S.workouts.filter(w => w !== t); S.saveWorkouts();
    A.beep('thunk', 0.8); A.say('TRAINED UNDONE', 2500); A.dirty = true;
  }

  // ======================================================================
  // PAGE 2 · BODY
  // ======================================================================
  const RANGES = [['30D', 30], ['90D', 90], ['1Y', 365]];
  function pageBody(g, st, A, still) {
    const W = g.W, H = g.H, mx = g.mx, P = S.profile, bi = bodyInfo(), B = buildNow();
    let y = g.scrollBegin(13, H - 12);
    // him, with the tape on him
    const top = y + 3, figH = clamp(H - 158, 62, 96), cx = 34, s = figH / 100;
    RX.maus.draw(mx, cx, top, figH, 'STEADY', { t: g.t, build: B });
    const T = bi.t, Tp = bi.p;
    const tape = [['NECK', 'neck', 35, [-4, 4], false], ['CHEST', 'chest', 44, [-11, 11], true], ['ARM', 'arm', 49, [11, 15], true], ['WAIST', 'waist', 52, [-11, 11], true], ['HIPS', 'hips', 58, [-11, 11], true], ['THIGH', 'thigh', 67, [2, 8], false]];
    let lastY = -99;
    tape.forEach(([lab, k, v, half, byW]) => {
      const yb = Math.round(top + v * s), yy = Math.max(yb, lastY + 9); lastY = yy;
      const h0 = half[0] * (byW ? B.w : 1), h1 = half[1] * (byW ? B.w : 1), val = T ? T[k] : null;
      mx.line(cx + Math.round(h0 * s), yb, cx + Math.round(h1 * s), yb, AMB, val ? 0.85 : 0.3, 2);
      mx.line(cx + Math.round(h1 * s), yb, 66, yy, AMB, 0.35, 2); mx.hline(66, yy, 4, AMB, 0.35);
      g.mini(lab, 72, yy - 2, { a: 0.7 });
      g.textR(len(val), W - 26, yy - 3, { c: val ? HOT : C.ink, a: val ? 1 : 0.35 });
      const pv = Tp ? Tp[k] : null;
      if (val && pv) { const dl = val - pv; g.miniR((dl < -0.05 ? '▼' : dl > 0.05 ? '▲' : '·') + (Math.abs(dl) >= 0.05 ? lenD(dl) : ''), W - 2, yy - 2, { c: dl < -0.05 ? GRN : dl > 0.05 ? YEL : C.ink, a: 1 }); }
    });
    const gap = T && Tp ? Math.round((T.ts - Tp.ts) / DAY) + 'D' : '';
    g.mini(T ? 'TAPE ' + md(T.ts) + (gap ? ' · VS ' + gap : '') : 'NO TAPE YET', 72, lastY + 8, { a: 0.5 });
    y = Math.max(top + figH + 8, lastY + 20);
    // weight and body fat
    mx.hline(0, y - 3, W, C.ink, 0.3, 2);
    const big = (lab, val, unit, dlt, dc, x) => {
      g.mini(lab, x, y, { a: 0.6 });
      const w = g.text(val, x, y + 7, { s: 2, c: val === '--' ? C.ink : HOT, a: val === '--' ? 0.35 : 1 });
      if (val !== '--') g.text(unit, x + w + 2, y + 14, { a: 0.8 });
      if (dlt) g.mini(dlt, x, y + 24, { c: dc, a: 1 });
    };
    const dW = bi.dW, dB = bi.dBF;
    big('WEIGHT', bi.w == null ? '--' : wt(bi.w), wtU(), dW == null ? (bi.w == null ? 'WEIGH IN TO START' : '') : (dW <= -0.05 ? '▼ ' : dW >= 0.05 ? '▲ ' : '') + wtD(Math.abs(dW)) + ' ' + wtU() + ' · 30D', dW != null && dW > 0.05 ? YEL : GRN, 1);
    big('BODY FAT', bi.bf == null ? '--' : bi.bf.toFixed(1), '%', bi.bf == null ? (!P.sex || !P.heightIn ? 'SET SEX + HEIGHT' : 'TAPE TO START') : dB == null ? 'NAVY METHOD' : (dB <= -0.05 ? '▼ ' : dB >= 0.05 ? '▲ ' : '') + Math.abs(dB).toFixed(1) + ' PT · ' + gap, dB != null && dB > 0.05 ? YEL : GRN, 84);
    y += 33;
    // lean and fat as one bar
    if (bi.lean != null) {
      const lw = clamp(Math.round((W - 2) * bi.lean / bi.w), 30, W - 32);
      mx.rect(1, y, lw, 7, CYN, 0.8); mx.rect(1 + lw, y, W - 2 - lw, 7, AMB, 0.8);
      g.mini('LEAN ' + wt(bi.lean), 3, y + 1, { c: '#04120C', a: 1 }); g.miniR('FAT ' + wt(bi.fat), W - 3, y + 1, { c: '#04120C', a: 1 });
      y += 11;
    }
    const kv = (k, v, c, x) => { g.mini(k, x, y + 1, { a: 0.6 }); g.textR(v, x + (x > 1 ? 77 : W - 84), y, { c: v === '--' ? C.ink : (c || HOT), a: v === '--' ? 0.35 : 1 }); };
    const whrC = bi.whr == null ? null : bi.whr < 0.5 ? GRN : bi.whr < 0.6 ? YEL : RED;
    const x2 = W - 79;
    kv('BMI', bi.bmi ? bi.bmi.toFixed(1) : '--', bi.bmi ? (bi.bmi < 25 ? GRN : YEL) : null, 1); kv('WAIST / HT', bi.whr ? bi.whr.toFixed(2) : '--', whrC, x2); y += 10;
    kv('GOAL', P.goalLbs ? wt(P.goalLbs) + ' ' + wtU() : '--', AMB, 1); kv('AT GOAL BF', bi.goalBF != null ? '~' + Math.round(bi.goalBF) + '%' : '--', AMB, x2); y += 12;
    // the trend: weight and body fat on one strip
    st.rng = st.rng == null ? 1 : st.rng;
    g.seg(0, y, 80, 10, RANGES.map((r, i) => ({ label: r[0], on: st.rng === i, fn: () => { st.rng = i; A.beep('jog'); } })), { face: 'mini' });
    g.miniR('WT', W - 22, y + 2, { c: YEL, a: 1 }); g.miniR('BF%', W - 2, y + 2, { c: CYN, a: 1 });
    y += 12;
    const gh = 26, gx = 1, gw = W - 2, days = RANGES[st.rng][1], t0 = Date.now() - days * DAY;
    mx.frame(gx, y, gw, gh, C.ink, 0.25);
    const plot = (pts, col) => {
      if (pts.length < 2) return false;
      let lo = Math.min(...pts.map(p => p[1])), hi = Math.max(...pts.map(p => p[1])); if (hi - lo < 1e-6) { lo -= 1; hi += 1; }
      const Xf = ts => gx + 2 + (ts - t0) / (days * DAY) * (gw - 4), Yf = v => y + gh - 3 - (v - lo) / (hi - lo) * (gh - 6);
      for (let i = 1; i < pts.length; i++) mx.line(Math.round(Xf(pts[i - 1][0])), Math.round(Yf(pts[i - 1][1])), Math.round(Xf(pts[i][0])), Math.round(Yf(pts[i][1])), col, 1);
      pts.forEach(p => mx.set(Math.round(Xf(p[0])), Math.round(Yf(p[1])), HOT, 0.9));
      return true;
    };
    const a = plot(wis().filter(w => w.ts >= t0).map(w => [w.ts, w.lbs]), YEL);
    const b = plot(tapesSorted().filter(t => t.ts >= t0).map(t => [t.ts, tapeBF(t)]).filter(p => p[1] != null), CYN);
    if (!a && !b) g.mini('WEIGH IN + TAPE A FEW TIMES TO DRAW THIS', gx + 4, y + 10, { a: 0.45 });
    y += gh + 3;
    const b2 = Math.floor((W - 3) / 2);
    if (!still) {
      g.btn(0, y, b2, 12, '+ WEIGH IN', () => A.go('weighin', { from: 1 }), { face: 'mini', c: YEL });
      g.btn(b2 + 3, y, W - b2 - 3, 12, 'TAPE MEASURE', () => A.go('tape'), { face: 'mini', c: AMB });
    }
    y += 15;
    g.scrollEnd(y);
  }

  // ======================================================================
  // PAGE 3 · RECORD
  // ======================================================================
  function pageRecord(g, st, A) {
    const W = g.W, H = g.H, mx = g.mx, X = xpInfo();
    let y = g.scrollBegin(13, H - 12) + 2;
    // the level, big
    mx.frame(0, y, 46, 30, AMB, 0.9); g.mini('LEVEL', 4, y + 3, { c: AMB, a: 1 }); g.text(String(X.lv), 6, y + 11, { s: 2, c: HOT });
    g.text(X.rank, 50, y + 1, { c: AMB });
    g.mini(g.fit(X.next ? 'NEXT ▸ ' + X.next[1] + ' AT LV ' + X.next[0] : 'TOP RANK', W - 52, 'mini'), 50, y + 11, { a: 0.7 });
    mx.frame(50, y + 19, W - 51, 7, C.ink, 0.6); mx.rect(51, y + 20, Math.round((W - 53) * X.frac), 5, AMB, 0.9);
    g.miniR(comma(X.into) + ' / ' + comma(X.span) + ' XP TO LV ' + (X.lv + 1), W - 2, y + 28, { a: 0.7 });
    y += 40;
    y = g.section('THIS WEEK', y, '+' + comma(X.wkXP) + ' XP');
    const lines = WK_LINES.filter(([k]) => X.wk[k]);
    if (!lines.length) { g.mini('NOTHING LOGGED YET THIS WEEK', 2, y + 1, { a: 0.5 }); y += 9; }
    lines.forEach(([k, lab, c]) => { const b = X.wk[k]; mx.disc(4, y + 3, 1.6, c, 1); g.text(g.fit(lab(b), W - 40), 9, y); g.textR('+' + comma(b.xp), W - 2, y, { c }); y += 9; });
    y += 3;
    y = g.section('PERSONAL BESTS', y);
    bests().forEach(r => { g.mini(g.fit(r[0], 58, 'mini'), 1, y + 1, { a: 0.65 }); g.text(g.fit(r[1], W - 92), 60, y, { c: r[1] === '--' ? C.ink : HOT, a: r[1] === '--' ? 0.35 : 1 }); if (r[2]) g.miniR(r[2], W - 2, y + 1, { a: 0.5 }); y += 9; });
    y += 3;
    const SB = BADGES.map(badgeState), earned = SB.filter(s => s.tier).length;
    y = g.section('BADGES', y, earned + ' OF ' + BADGES.length + ' EARNED');
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
    y += 30;
    g.scrollEnd(y);
  }

  // ======================================================================
  // PAGE 4 · FILE
  // ======================================================================
  const BLOODS = ['', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
  const SEXES = [null, 'M', 'F'];
  const FASTG = [16, 18, 20, 24, 36, 48, 72, 100];
  const FIELDT = [0, 5, 8, 10, 15, 20, 30];
  function pageFile(g, st, A) {
    const W = g.W, P = S.profile;
    if (st.edit && !(U.activeField && U.activeField.key === 'pf-' + st.edit)) st.edit = null;
    let y = g.scrollBegin(13, g.H - 12) + 2;
    const sect = (t) => { y = g.section(t, y); };
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
    row('SEX', P.sex === 'M' ? 'MALE' : P.sex === 'F' ? 'FEMALE' : '', HOT, () => { P.sex = SEXES[(SEXES.indexOf(P.sex || null) + 1) % SEXES.length]; S.saveProfile(); A.beep('jog'); }, { hint: 'FOR BODY FAT' });
    row('BLOOD', P.blood, HOT, () => { P.blood = BLOODS[(BLOODS.indexOf(P.blood) + 1) % BLOODS.length]; S.saveProfile(); A.beep('jog'); }, { hint: 'TAP TO STEP' });
    const fHome = fld('home', P.home, 'text', v => { P.home = String(v || '').trim().toUpperCase().slice(0, 20); });
    row('HOME', P.home, HOT, edit('home', P.home, fHome.field), fHome);
    y += 3; sect('GOALS');
    const toLbs = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? (metric() ? n / 0.45359 : n) : null; };
    const fGoal = fld('goal', P.goalLbs ? wt(P.goalLbs) : '', 'number', v => { const n = toLbs(v); if (n && n > 60 && n < 600) P.goalLbs = Math.round(n * 10) / 10; else if (v === '') P.goalLbs = null; });
    row('GOAL WEIGHT', P.goalLbs ? wt(P.goalLbs) + ' ' + wtU() : '', YEL, edit('goal', fGoal.raw, fGoal.field), fGoal);
    const fStart = fld('start', P.startLbs ? wt(P.startLbs) : '', 'number', v => { const n = toLbs(v); if (n && n > 60 && n < 600) P.startLbs = Math.round(n * 10) / 10; else if (v === '') P.startLbs = null; }, { placeholder: 'FIRST WEIGH-IN' });
    const L = wis();
    row('START WEIGHT', P.startLbs ? wt(P.startLbs) + ' ' + wtU() : (L.length ? wt(L[0].lbs) + ' ' + wtU() : ''), YEL, edit('start', fStart.raw, fStart.field), Object.assign(fStart, { hint: P.startLbs ? '' : 'AUTO' }));
    row('TRAIN / WEEK', String(P.trainTarget), ORG, () => { P.trainTarget = P.trainTarget % 7 + 1; S.saveProfile(); A.beep('jog'); });
    row('FAST GOAL', P.fastGoal + 'H', AMB, () => { P.fastGoal = FASTG[(FASTG.indexOf(P.fastGoal) + 1) % FASTG.length]; S.saveProfile(); A.beep('jog'); });
    row('FIELD', P.fieldTarget ? P.fieldTarget + ' / WK' : 'AUTO', GRN, () => { P.fieldTarget = FIELDT[(FIELDT.indexOf(P.fieldTarget) + 1) % FIELDT.length]; S.saveProfile(); A.beep('jog'); }, { hint: P.fieldTarget ? '' : 'YOUR USUAL WEEK' });
    y += 3; sect('UNITS');
    row('WEIGHT · HEIGHT', metric() ? 'KG · CM' : 'LB · IN', HOT, () => { P.units = metric() ? 'US' : 'METRIC'; S.saveProfile(); A.beep('jog'); });
    y += 4;
    g.scrollEnd(y);
  }

  // ======================================================================
  // THE SCREEN
  // ======================================================================
  const JOGS = [['◂ UP', 'DOWN ▸', 'PUSH OPENS · TAP MAUS'], ['◂ UP', 'DOWN ▸', 'PUSH SELECT · DRUM = PAGE'], ['◂ BADGE', 'BADGE ▸', 'ROLL THE DRUM FOR PAGES'], ['◂ UP', 'DOWN ▸', 'PUSH EDIT · DRUM = PAGE']];
  const FOOT = ['TAP MAUS · DRUM ▸ BODY · RECORD · FILE', 'BODY FAT FROM THE TAPE · NAVY METHOD', 'XP: EVERYTHING YOU LOG · NEW RANK EVERY 5 LV', 'TAP A ROW TO CHANGE IT'];
  const DRUM_IDS = ['status', 'body', 'record', 'file'];
  RX.screens.profile = {
    drum: DRUM_IDS,
    enter(st, params, A) { st.pg = params.page != null ? params.page : (S.v2.profPage || 0); st.page = DRUM_IDS[st.pg]; st.badge = 0; st.force = params.state || null; checkBadges(A); refreshCity(A); },
    onPage(pg, st, A) { turn(st, A, Math.max(0, DRUM_IDS.indexOf(pg))); },
    resume(st, A) { checkBadges(A); },
    animating: st => !!st.pokeAt && performance.now() - st.pokeAt < POKE_MS + 80,
    jogLabels: st => JOGS[st.pg || 0],
    jog(d, st, A) {
      if (st.pg === 2) { st.badge = clamp((st.badge || 0) + d, 0, BADGES.length - 1); return; }
      A.focusJog(d);
    },
    push(st, A) { if (st.pg === 2) return; A.focusPush(); },
    longPress(d, st, A) {
      const r = st.trainRect;
      if (st.pg === 0 && r && d.x >= r.x && d.x < r.x + r.w && d.y >= r.y && d.y < r.y + r.h && oldTrained()) undoTrained(A);
    },
    render(g, st, A) {
      header(g, st);
      if (st.pg === 0) pageStat(g, st, A);
      else if (st.pg === 1) pageBody(g, st, A);
      else if (st.pg === 2) pageRecord(g, st, A);
      else pageFile(g, st, A);
      g.footer(A.sayActive() ? A.statusShown(g.t) : FOOT[st.pg]);
    },
    lcd() {
      const X = xpInfo(), m = mausState(), wi = weightInfo(), bi = bodyInfo();
      return { rows: [['MAUS', m.key.replace('_', ' ')], ['LV', X.lv + ' · ' + X.rank], ['WT', wi.cur == null ? '--' : wt(wi.cur) + ' ' + wtU() + (bi.bf != null ? ' · ' + bi.bf.toFixed(1) + '%' : '')]], tag: 'PRF' };
    }
  };

  // ======================================================================
  // WEIGH-IN BOX (over STAT or BODY)
  // ======================================================================
  function behind(g, st, A) {
    const bg = { pg: st.from === 1 ? 1 : 0 };
    st.scroll = st.from === 1 ? st.bgScroll || 0 : 0;   // the page's scroll region reads the box's state
    header(g, bg); (bg.pg === 1 ? pageBody : pageStat)(g, bg, A, true);
    U.hits.length = 0; U.focus.length = 0; g.focusIdx = 0; g.selRect = null;
    g.mx.dimRect(0, 11, g.W, g.H - 11, 0.25);
  }
  RX.screens.weighin = {
    enter(st, params, A) {
      const L = wis(); st.lbs = L.length ? L[L.length - 1].lbs : (S.profile.startLbs || 180); st.prev = L.length ? L[L.length - 1] : null; st.mode = 'jog'; st.str = '';
      st.from = params && params.from; const t = A && A.stack[A.stack.length - 2]; st.bgScroll = t && t.st ? t.st.scroll || 0 : 0;
    },
    jogLabels: st => st.mode === 'jog' ? ['◂ -' + (metric() ? '0.1' : '0.2'), '+' + (metric() ? '0.1' : '0.2') + ' ▸', 'PUSH SAVE'] : ['◂ UP', 'DOWN ▸', 'PUSH SELECT'],
    jog(d, st, A) {
      if (st.mode === 'jog') { const step = metric() ? 0.1 / 0.45359 : 0.2; st.lbs = Math.round(clamp(st.lbs + d * step, 60, 600) * 100) / 100; return; }
      A.focusJog(d);
    },
    push(st, A) { if (st.mode === 'jog') { save(st, A); return; } A.focusPush(); },
    render(g, st, A) {
      const W = g.W, mx = g.mx;
      behind(g, st, A);
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
  // TAPE MEASURE: neck + waist (+ hips) give body fat; the rest is optional
  // ======================================================================
  const TAPE_ROWS = [['neck', 'NECK'], ['waist', 'WAIST'], ['hips', 'HIPS'], ['chest', 'CHEST'], ['arm', 'ARM'], ['thigh', 'THIGH']];
  const TAPE_DEF = { neck: 15.5, waist: 36, hips: 40, chest: 42, arm: 14, thigh: 23 };
  const needs = k => k === 'neck' || k === 'waist' || (k === 'hips' && S.profile.sex === 'F');
  const tStep = () => metric() ? 0.5 / 2.54 : 0.25;
  function bumpTape(st, k, d) {
    const v = st.v[k] == null ? (st.last && st.last[k]) || TAPE_DEF[k] : st.v[k];
    st.v[k] = clamp(Math.round((v + d * tStep()) * 1000) / 1000, 6, 80);
  }
  RX.screens.tape = {
    pal: 'amber',
    enter(st) {
      const L = lastTape(); st.last = L; st.v = {}; st.jk = null;
      TAPE_ROWS.forEach(([k]) => { st.v[k] = L && L[k] ? L[k] : (needs(k) ? TAPE_DEF[k] : null); });
    },
    jogLabels: st => st.jk ? ['◂ -' + (metric() ? '0.5' : '¼'), '+' + (metric() ? '0.5' : '¼') + ' ▸', 'PUSH · DONE'] : ['◂ UP', 'DOWN ▸', 'PUSH SELECT'],
    jog(d, st, A) { if (st.jk) { bumpTape(st, st.jk, d); A.beep('jog'); return; } A.focusJog(d); },
    push(st, A) { if (st.jk) { st.jk = null; A.refreshChrome(); return; } A.focusPush(); },
    back(st, A) { if (st.jk) { st.jk = null; A.refreshChrome(); return true; } return false; },
    render(g, st, A) {
      const W = g.W, H = g.H, mx = g.mx, P = S.profile;
      let y = g.header('TAPE MEASURE', md(Date.now()), { c: AMB });
      y = g.scrollBegin(y, H - 12);
      // who it's for: the formula differs
      g.mini('SEX', 2, y + 3, { a: 0.7 });
      g.seg(30, y, W - 32, 12, [['M', 'MALE'], ['F', 'FEMALE']].map(([k, l]) => ({ label: l, on: P.sex === k, fn: () => { P.sex = k; if (k === 'F' && st.v.hips == null) st.v.hips = (st.last && st.last.hips) || TAPE_DEF.hips; S.saveProfile(); A.beep('jog'); } })), { face: 'mini' });
      y += 15;
      g.mini('HEIGHT', 2, y + 3, { a: 0.7 });
      if (P.heightIn) g.textR(ht(P.heightIn), W - 4, y + 2, { c: HOT });
      g.btn(30, y, P.heightIn ? 40 : W - 32, 11, P.heightIn ? 'CHANGE' : 'SET IT IN FILE ▸', () => { A.back(); const t = A.top(); if (t.name === 'profile') turn(t.st, A, 3); }, { face: 'mini' });
      y += 15;
      y = g.section('MEASURE', y, metric() ? 'CM' : 'INCHES');
      TAPE_ROWS.forEach(([k, lab]) => {
        const v = st.v[k], on = st.jk === k, need = needs(k);
        // optional rows: tap the name to add or skip them
        const sel = g.focusable(0, y, W - 104, 14, () => { if (need) { st.jk = on ? null : k; A.refreshChrome(); return; } if (v == null) { st.v[k] = (st.last && st.last[k]) || TAPE_DEF[k]; st.jk = k; } else { st.v[k] = null; if (on) st.jk = null; } A.refreshChrome(); A.beep('jog'); });
        if (sel) mx.frame(0, y, W - 104, 14, HOT, 0.8);
        const lw = g.text(lab, 3, y + 4, { c: v == null ? C.amber : HOT, a: v == null ? 0.4 : 1 });
        if (need) g.mini('BF', 6 + lw, y + 5, { c: AMB, a: 0.85 });
        g.btn(W - 102, y, 22, 14, '-', () => { bumpTape(st, k, -1); st.jk = k; A.beep('jog'); });
        const s2 = g.focusable(W - 78, y, 54, 14, () => { if (v == null) st.v[k] = (st.last && st.last[k]) || TAPE_DEF[k]; st.jk = on ? null : k; A.refreshChrome(); A.beep('key'); });
        if (on) { mx.rect(W - 77, y + 1, 52, 12, AMB, 0.22); mx.frame(W - 78, y, 54, 14, AMB, 1); }
        else mx.frame(W - 78, y, 54, 14, C.amber, s2 ? 1 : 0.25);
        g.textC(len(v), W - 51, y + 4, { c: on ? HOT : C.amber, a: v == null ? 0.4 : 1 });
        g.btn(W - 22, y, 20, 14, '+', () => { bumpTape(st, k, 1); st.jk = k; A.beep('jog'); });
        y += 17;
      });
      // the answer, live
      const bf = navy(P.sex, P.heightIn, st.v.neck, st.v.waist, st.v.hips);
      mx.hline(0, y, W, C.amber, 0.3, 2); y += 4;
      g.mini('BODY FAT · NAVY', 2, y + 2, { a: 0.7 });
      if (bf != null) {
        g.textR(bf.toFixed(1), W - 12, y, { s: 2, c: HOT }); g.text('%', W - 10, y + 7, { c: AMB });
        const prev = tapeBF(st.last);
        if (prev != null) { const d = bf - prev; g.mini((d <= -0.05 ? '▼ ' : d >= 0.05 ? '▲ ' : '') + Math.abs(d).toFixed(1) + ' PT VS ' + md(st.last.ts), 2, y + 10, { c: d > 0.05 ? YEL : GRN, a: 1 }); }
      } else g.mini(!P.sex ? 'PICK MALE OR FEMALE' : !P.heightIn ? 'NEEDS YOUR HEIGHT' : 'WAIST MUST BE OVER NECK', 2, y + 10, { c: ORG, a: 1 });
      y += 20;
      g.btn(0, y, W - 2, 15, '▸ SAVE TAPE', () => saveTape(st, A), { solid: true, c: AMB });
      y += 19;
      g.scrollEnd(y);
      g.footer(A.sayActive() ? A.statusShown(g.t) : st.jk ? 'JOG ▸ CHANGE · PUSH ▸ OK' : 'TAP A NAME TO ADD OR SKIP IT');
    }
  };
  function saveTape(st, A) {
    const v = st.v;
    if (!v.neck || !v.waist) { A.say('NECK AND WAIST, AT LEAST', 2500); A.beep('err'); return; }
    if (v.waist <= v.neck) { A.say('WAIST MUST BE OVER NECK', 2500); A.beep('err'); return; }
    const t = { id: S.healthId('TP'), ts: Date.now() };
    TAPE_ROWS.forEach(([k]) => { t[k] = v[k] != null ? Math.round(v[k] * 100) / 100 : null; });
    // one tape a day: a second one today replaces the first
    S.tapes = S.tapes.filter(x => x.ts < dayStart()); S.tapes.push(t); S.saveTapes();
    const bf = tapeBF(t);
    A.back(); A.beep('ok');
    A.say('TAPE SAVED' + (bf != null ? ' · BODY FAT ' + bf.toFixed(1) + '%' : ''), 3500);
    checkBadges(A);
  }

  // for tests and the calendar
  RX.profile = { navy, tapeBF, bodyInfo, mausState, xpInfo, areaDays, prInfo, buildNow, levelOf, cum, bars };

  // badges and levels keep counting while the RP is on, even with PROFILE closed
  setInterval(() => { if (RX.app && RX.app.booted) checkBadges(RX.app); }, 120000);
})();
