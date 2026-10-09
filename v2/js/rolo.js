/* =============================================================
   RECON.OS RX-90 · ROLO
   A Rolodex in the LOG: people and businesses, each filed under
   a trade you type yourself (FLORIST, MUSIC TEACHER, TRAINER…).
   A card can be bare (name + number) or full (photo, details,
   notes) and can point at one of your marks.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const S = RX.store, U = RX.ui, F = U.F, C = U.C, FONT = RX.font, Geo = RX.geo, M = RX.map;
  const HOT = '#E9FFF7', AMB = '#FFB547', GRN = '#6BFF8E', CYN = '#5CC8FF', GRY = '#6F8580', RED = '#FF6B5E';
  // a trade's colour comes from its name, so it never changes
  const PAL = ['#FF8BC4', '#B49BFF', '#FF9F3A', '#FFE45C', '#5CC8FF', '#6BFF8E', '#FF7A6B', '#9FE0FF', '#E6B3FF', '#C8F06E'];
  const tradeColor = t => { const s = FONT.norm(t || ''); if (!s) return GRY; let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PAL[h % PAL.length]; };
  const MONS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const md = ts => { const d = new Date(ts); return MONS[d.getMonth()] + ' ' + F.pad2(d.getDate()); };
  const measure = (s, f, sc) => FONT.measure(s, f, sc);

  // ---------- data ----------
  const KEY = 'recon.os.rolo';
  S.rolo = [];
  S.loadRolo = function () { try { S.rolo = JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { S.rolo = []; } };
  S.saveRolo = function () { try { localStorage.setItem(KEY, JSON.stringify(S.rolo)); } catch (e) { if (S.onWriteFail) S.onWriteFail(KEY); } };
  S.K.rolo = KEY;
  const byId = id => S.rolo.find(c => c.id === id);
  const label = c => c.name || 'NO NAME';
  const trades = () => { const n = {}; S.rolo.forEach(c => { const t = FONT.norm(c.trade || '').trim(); if (t) n[t] = (n[t] || 0) + 1; }); return Object.keys(n).sort((a, b) => n[b] - n[a] || a.localeCompare(b)); };
  const here = A => A.gps || { lat: M.lat, lng: M.lng };
  function placeOf(A, c) {
    const p = c.poiId ? S.poi(c.poiId) : null; if (!p) return null;
    const h = here(A), r = p.regionId ? S.regions.find(x => x.id === p.regionId) : null;
    return { p, m: Geo.meters(h.lat, h.lng, p.lat, p.lng), b: Geo.bearing(h.lat, h.lng, p.lat, p.lng), city: r ? r.name.replace(/ REGION$/, '') : '' };
  }
  RX.roloFor = poiId => S.rolo.filter(c => c.poiId === poiId);

  // ---------- small parts ----------
  function chip(g, x, y, t, c, on, fn) {
    const w = measure(t, 'mini') + 6;
    const sel = fn ? g.focusable(x, y, w, 9, fn) : false;
    g.mx.frame(x, y, w, 9, c, on || sel ? 1 : 0.45); if (on) g.mx.rect(x + 1, y + 1, w - 2, 7, c, 0.2);
    g.mini(t, x + 3, y + 2, { c, a: on ? 1 : 0.75 });
    return w + 2;
  }
  function badge(g, x, y, c) {   // the trade disc with its first letter punched out
    const col = tradeColor(c.trade), ch = (FONT.norm(c.trade || '?').trim()[0] || '?');
    g.mx.disc(x, y, 5, col, 1);
    g.mx.text(ch, x - 2, y - 3, { punch: true });
  }
  const initials = c => { const w = FONT.norm(label(c)).split(/\s+/).filter(Boolean); return ((w[0] || '?')[0] + (w.length > 1 ? w[w.length - 1][0] : (w[0] || '')[1] || '')).trim(); };
  function frameCorners(mx, x, y, w, h, c) {
    mx.frame(x - 2, y - 2, w + 4, h + 4, c, 0.75);
    [[x - 2, y - 2], [x + w + 1, y - 2], [x - 2, y + h + 1], [x + w + 1, y + h + 1]].forEach(([a, b]) => mx.rect(a - 1, b - 1, 3, 3, HOT, 1));
  }
  function portrait(g, c, x, y, w, h) {
    const col = tradeColor(c.trade);
    if (c.photo && RX.dotPhoto && RX.dotPhoto(g, c.photo, x, y, w, h)) { frameCorners(g.mx, x, y, w, h, col); return; }
    const ini = initials(c), s = ini.length > 1 ? 3 : 4;
    g.mx.text(ini, Math.round(x + w / 2 - measure(ini, 'std', s) / 2), Math.round(y + h / 2 - 7 * s / 2), { s, c: col });
    frameCorners(g.mx, x, y, w, h, col);
  }

  // ======================================================================
  // THE ROLO TAB (inside LOG)
  // ======================================================================
  function listItems(A, st) {
    const q = FONT.norm(st.rq || '').trim();
    let L = S.rolo.slice();
    if (st.trade) L = L.filter(c => FONT.norm(c.trade || '').trim() === st.trade);
    if (q) L = L.filter(c => FONT.norm([c.name, c.trade, c.desc, c.notes, c.phone, c.email].join(' ')).includes(q));
    const it = L.map(c => ({ c, pl: placeOf(A, c) }));
    it.sort((a, b) => (b.c.fav ? 1 : 0) - (a.c.fav ? 1 : 0) || FONT.norm(label(a.c)).localeCompare(FONT.norm(label(b.c))));
    return it;
  }
  RX.roloTab = function (g, st, A, y, bottom) {
    const W = g.W, mx = g.mx;
    // trade chips: ALL, then your trades by how many you have
    let x = 0;
    x += chip(g, x, y, 'ALL', C.ink, !st.trade, () => { st.trade = null; st.scroll = 0; });
    const T = trades();
    for (const t of T) { const w = measure(t, 'mini') + 8; if (x + w > W - 30) break; x += chip(g, x, y, t, tradeColor(t), st.trade === t, () => { st.trade = st.trade === t ? null : t; st.scroll = 0; }); }
    g.btn(W - 28, y - 1, 27, 11, '+ NEW', () => newCard(A), { face: 'mini', c: AMB });
    y += 12;
    g.field('rolo-find', 0, y, W, 13, { label: 'FIND', value: st.rq || '', placeholder: 'NAME, TRADE, NOTES', onInput: v => { st.rq = v; st.scroll = 0; }, onCommit: v => { st.rq = v; } });
    y += 15;
    if (S.rolo.some(isEmpty)) { S.rolo = S.rolo.filter(c => !isEmpty(c)); S.saveRolo(); }
    const items = listItems(A, st);
    let yy = g.scrollBegin(y, bottom);
    const top = g.sTop, bot = g.sBottom;
    items.forEach(it => {
      const c = it.c, h = 20;
      const sel = g.row(0, yy, W - 2, h - 1, () => A.go('contact', { id: c.id }));
      if (yy + h >= top && yy <= bot) {
        badge(g, 7, yy + 9, c);
        g.text(g.fit(label(c), W - 30), 15, yy + 1, { c: sel ? HOT : (c.name ? C.ink : GRY) });
        if (c.fav) g.textR('★', W - 4, yy + 1, { c: AMB });
        const where = it.pl ? (it.pl.city ? it.pl.city + ' · ' : '') + Geo.fmtDist(it.pl.m) : (c.phone ? c.phone : 'NO PLACE');
        const ww = measure(where, 'mini');
        g.mini(g.fit(c.trade || 'NO TRADE', W - 22 - ww - 6, 'mini'), 15, yy + 10, { c: tradeColor(c.trade), a: 1 });
        g.miniR(where, W - 4, yy + 10, { a: 0.55 });
        mx.hline(15, yy + h - 1, W - 18, C.ink, 0.12, 2);
      }
      yy += h;
    });
    if (!items.length) {
      if (!S.rolo.length) { g.textC('ROLO IS EMPTY', W / 2, yy + 12, { c: HOT }); g.textC('+ NEW TO ADD A PERSON OR A BUSINESS', W / 2, yy + 24, { face: 'mini', a: 0.6 }); yy += 40; }
      else { g.textC('NO MATCHES', W / 2, yy + 10, { a: 0.5 }); yy += 24; }
    }
    g.scrollEnd(yy);
    return items.length + ' CARDS · TAP TO OPEN';
  };
  function newCard(A, preset) {
    const c = Object.assign({ id: 'ROLO-' + Date.now(), name: '', trade: '', desc: '', phone: '', email: '', web: '', hours: '', notes: '', photo: null, poiId: null, fav: false, created: Date.now(), last: null, lastWhat: '' }, preset || {});
    S.rolo.push(c); S.saveRolo();
    A.go('contact', { id: c.id, edit: true, fresh: true });
  }
  RX.roloNew = newCard;
  // a card left with nothing on it is dropped
  const isEmpty = c => c && !c.name && !c.phone && !c.trade && !c.email && !c.notes && !c.photo && !c.poiId;
  function dropIfEmpty(c) { if (isEmpty(c)) { S.rolo = S.rolo.filter(x => x !== c); S.saveRolo(); } }

  // ======================================================================
  // THE CARD
  // ======================================================================
  const FIELDS = [['PHONE', 'phone', 'text'], ['EMAIL', 'email', 'text'], ['WEB', 'web', 'text'], ['HOURS', 'hours', 'text']];
  function dial(A, c, how) {
    const num = String(c.phone || '').replace(/[^\d+]/g, '');
    if (!num) { A.say('NO NUMBER ON THIS CARD', 2000); A.beep('err'); return; }
    c.last = Date.now(); c.lastWhat = how === 'sms' ? 'TEXTED' : 'CALLED'; S.saveRolo();
    try { window.location.href = (how === 'sms' ? 'sms:' : 'tel:') + num; } catch (e) {}
  }
  function openWeb(c) { let u = String(c.web || '').trim(); if (!u) return; if (!/^https?:/i.test(u)) u = 'https://' + u; try { window.open(u.toLowerCase(), '_blank'); } catch (e) {} }
  function openMail(c) { const e = String(c.email || '').trim(); if (e) try { window.location.href = 'mailto:' + e.toLowerCase(); } catch (er) {} }

  RX.screens.contact = {
    enter(st, params) { st.edit = !!params.edit; st.fresh = !!params.fresh; },
    leave(st, A) { if (st.closing) dropIfEmpty(byId(A.top().params.id)); },
    jogLabels: st => ['◂ UP', 'DOWN ▸', st.edit ? 'PUSH SELECT · BACK = DONE' : 'PUSH SELECT · ROLL ▸ NEXT CARD'],
    back(st, A) { if (st.edit && !st.fresh) { st.edit = false; st.scroll = 0; A.refreshChrome(); return true; } st.closing = true; return false; },
    lcd(st, A) {
      const c = byId(A.top().params.id); if (!c) return null;
      return { rows: [['NAME', label(c)], ['TRDE', c.trade || '--'], ['TEL', c.phone || '--']], tag: 'RLO' };
    },
    render(g, st, A) {
      const W = g.W, H = g.H, mx = g.mx, P = A.top().params, c = byId(P.id);
      if (!c) { g.header('ROLO'); g.textC('CARD NOT FOUND', W / 2, 40, { a: 0.6 }); g.footer('BACK TO RETURN'); return; }
      const list = S.rolo.slice().sort((a, b) => FONT.norm(label(a)).localeCompare(FONT.norm(label(b)))), idx = list.indexOf(c) + 1;
      g.header(st.edit ? 'ROLO · EDIT' : 'ROLO', idx + '/' + list.length);
      if (st.edit) return editCard(g, st, A, c);
      const col = tradeColor(c.trade), pl = placeOf(A, c);
      // top: photo or monogram, name, trade
      const px = 4, py = 16, pw = 42, ph = 48;
      portrait(g, c, px, py, pw, ph);
      const tx = px + pw + 7, words = FONT.norm(label(c)).split(/\s+/);
      let y = 16;
      const first = words[0] || '', rest = words.slice(1).join(' ');
      if (measure(first, 'std', 2) <= W - tx - 2) { g.text(first, tx, y, { s: 2, c: HOT }); y += 15; if (rest) { g.text(g.fit(rest, W - tx - 2), tx, y, { c: HOT }); y += 10; } }
      else { g.text(g.fit(label(c), W - tx - 2), tx, y + 2, { c: HOT }); y += 13; }
      if (c.trade) chip(g, tx, y, FONT.norm(c.trade).slice(0, 18), col, true);
      g.hit(W - 12, y - 1, 12, 11, () => { c.fav = !c.fav; S.saveRolo(); A.beep('jog'); });
      g.textR(c.fav ? '★' : '·', W - 2, y + 1, { c: AMB, a: c.fav ? 1 : 0.5 });
      y += 12;
      if (c.desc) { U.wrap(c.desc, Math.floor((W - tx) / 4)).slice(0, 2).forEach(l => { g.mini(l, tx, y, { a: 0.75 }); y += 7; }); }
      g.mini('ADDED ' + md(c.created), tx, y, { a: 0.45 });
      // details: only what's filled in
      y = Math.max(y + 9, py + ph + 6); mx.hline(0, y, W, C.ink, 0.3, 2); y += 4;
      const yTop = y;
      y = g.scrollBegin(y, H - 26);
      const kv = (k, v, col2, fn) => { const sel = fn ? g.row(0, y - 1, W - 2, 11, fn) : false; g.mini(k, 1, y + 1, { a: 0.6 }); g.textR(g.fit(v, W - 36), W - 3, y, { c: sel ? HOT : col2 || HOT }); mx.hline(1, y + 9, W - 3, C.ink, 0.08, 2); y += 11; };
      if (c.phone) kv('PHONE', c.phone, HOT, () => dial(A, c, 'tel'));
      if (c.email) kv('EMAIL', c.email, HOT, () => openMail(c));
      if (c.web) kv('WEB', c.web, CYN, () => openWeb(c));
      if (c.hours) kv('HOURS', c.hours, HOT);
      if (pl) {
        kv('AT', S.markLabel(pl.p), GRN, () => A.openMark(pl.p.id));
        g.miniR(Geo.fmtDist(pl.m) + ' ' + Geo.cardinal(pl.b) + ' · MARK ▸', W - 3, y, { c: GRN, a: 0.8 }); y += 9;
      }
      if (c.notes) {
        y = g.section('NOTES', y);
        U.wrap(c.notes, Math.floor((W - 2) / 4)).forEach(l => { g.mini(l, 1, y, { a: 0.85 }); y += 7; });
        y += 2;
      }
      if (c.last) { y = g.section('LAST', y, md(c.last)); g.mini((c.lastWhat || 'CONTACTED') + ' ' + F.ago(c.last), 1, y, { a: 0.7 }); y += 9; }
      if (!c.phone && !c.email && !c.web && !pl && !c.notes) { g.mini('ONLY A NAME SO FAR', 1, y + 2, { a: 0.4 }); y += 10; }
      y += 2;
      g.btn(0, y, W - 2, 11, 'EDIT CARD', () => { st.edit = true; st.scroll = 0; A.refreshChrome(); }, { face: 'mini' });
      y += 14;
      g.scrollEnd(y);
      // action keys
      const ky = H - 24, keys = [['CALL', GRN, () => dial(A, c, 'tel'), !!c.phone], ['TEXT', CYN, () => dial(A, c, 'sms'), !!c.phone]];
      if (pl) keys.push(['GO', AMB, () => RX.goTarget(A, pl.p.lat, pl.p.lng, S.markLabel(pl.p)), true]);
      const bw = Math.floor((W - 2 * (keys.length - 1)) / keys.length);
      mx.clearRect(0, ky - 2, W, 13);
      keys.forEach((k, i) => g.btn(i * (bw + 2), ky, i === keys.length - 1 ? W - i * (bw + 2) : bw, 11, k[0], k[2], { c: k[1], dim: !k[3] }));
      g.footer(A.sayActive() ? A.statusShown(g.t) : (pl ? 'GO PUTS IT ON THE MAP' : 'TAP A LINE TO USE IT'));
    }
  };

  function editCard(g, st, A, c) {
    const W = g.W, mx = g.mx;
    let y = g.scrollBegin(13, g.H - 12) + 2;
    const row = (lab, key, kind, o) => {
      o = o || {};
      y = g.section(lab, y);
      g.field('rc-' + key + '-' + c.id, 0, y, W - 2, kind === 'area' ? 30 : 13, Object.assign({ kind, value: c[key] || '', maxLen: kind === 'area' ? 600 : 60, onCommit: v => { c[key] = String(v || '').trim(); if (key === 'trade' || key === 'name') c[key] = FONT.norm(c[key]); S.saveRolo(); A.dirty = true; } }, o));
      y += kind === 'area' ? 33 : 16;
    };
    row('NAME', 'name', 'text', { placeholder: 'PERSON OR BUSINESS' });
    row('TRADE', 'trade', 'text', { placeholder: 'e.g. FLORIST, MUSIC TEACHER' });
    // quick picks from trades you've used
    const T = trades().filter(t => t !== FONT.norm(c.trade || ''));
    if (T.length) { let x = 0; for (const t of T) { const w = measure(t, 'mini') + 8; if (x + w > W) break; x += chip(g, x, y - 2, t, tradeColor(t), false, () => { c.trade = t; S.saveRolo(); A.beep('jog'); }); } y += 10; }
    row('ABOUT', 'desc', 'text', { placeholder: 'ONE LINE · OPTIONAL' });
    row('PHONE', 'phone', 'number', { placeholder: 'NUMBER', maxLen: 20 });
    row('EMAIL', 'email', 'text', { placeholder: 'OPTIONAL' });
    row('WEB', 'web', 'text', { placeholder: 'OPTIONAL' });
    row('HOURS', 'hours', 'text', { placeholder: 'OPTIONAL' });
    // place: link to one of your marks
    const p = c.poiId ? S.poi(c.poiId) : null;
    y = g.section('PLACE', y, p ? 'LINKED' : '');
    if (p) {
      g.btn(0, y, W - 40, 13, g.fit(S.markLabel(p), W - 48), () => A.go('markpick', { onPick: mk => { c.poiId = mk.id; S.saveRolo(); } }), { c: GRN });
      g.btn(W - 38, y, 36, 13, 'UNLINK', () => { c.poiId = null; S.saveRolo(); }, { face: 'mini', c: RED });
    } else g.btn(0, y, W - 2, 13, 'LINK A MARK ▸', () => A.go('markpick', { onPick: mk => { c.poiId = mk.id; S.saveRolo(); } }));
    y += 16;
    // photo
    y = g.section('PHOTO', y);
    if (c.photo) {
      const bw = Math.floor((W - 4) / 2);
      g.btn(0, y, bw, 13, 'NEW PHOTO', () => A.pickPortrait(url => { c.photo = url; S.saveRolo(); }));
      g.btn(bw + 2, y, W - 2 - bw - 2, 13, 'REMOVE', () => { c.photo = null; S.saveRolo(); }, { c: RED });
    } else g.btn(0, y, W - 2, 13, '□ ADD PHOTO OR LOGO', () => A.pickPortrait(url => { c.photo = url; S.saveRolo(); }));
    y += 16;
    row('NOTES', 'notes', 'area', { placeholder: 'OPTIONAL' });
    g.btn(0, y, W - 2, 13, c.fav ? '★ FAVORITE' : '+ FAVORITE', () => { c.fav = !c.fav; S.saveRolo(); }, { on: !!c.fav, c: AMB });
    y += 16;
    const bw = Math.floor((W - 4) / 2);
    g.btn(0, y, bw, 13, 'DONE', () => { st.edit = false; st.fresh = false; st.scroll = 0; A.refreshChrome(); if (isEmpty(c)) A.back(); }, { on: true });
    g.btn(bw + 2, y, W - 2 - bw - 2, 13, '× DELETE', () => A.go('confirm', { title: 'DELETE CARD', danger: true, confirm: 'DELETE', lines: ['DELETE ' + label(c) + '?'], onConfirm: () => { S.rolo = S.rolo.filter(x => x !== c); S.saveRolo(); st.edit = false; st.fresh = false; A.back(); A.say('CARD DELETED', 2500); } }), { c: RED });
    y += 18;
    g.scrollEnd(y);
    g.footer(A.sayActive() ? A.statusShown(g.t) : 'SAVES AS YOU GO');
  }
})();
