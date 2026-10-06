/* =============================================================
   RECON.OS RX-90 · UI KIT
   An immediate-mode toolkit that draws straight into the dot
   matrix: headers, buttons, list rows, toggles, text fields,
   scroll regions, pins. Every interactive element registers a
   hit box (for touch) and a focus slot (for the jog dial).
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const C = {
    ink: '#7DFFD6', hot: '#E9FFF7', amber: '#FFB547', red: '#FF6B5E',
    water: '#3FCFA8', fog: '#3D9C86', trail: '#FFB547', obj: '#FFB547'
  };
  const CATS = [
    { id: 'WAYPOINT', short: 'WAYPT', color: '#FF8B8B', def: 'DIAMOND' },
    { id: 'VISTA', short: 'VISTA', color: '#DDF07A', def: 'PEAK' },
    { id: 'LANDMARK', short: 'LANDMK', color: '#6CB6FF', def: 'MONUMENT' },
    { id: 'SUPPLY', short: 'SUPPLY', color: '#F2F4E4', def: 'CRATE' },
    { id: 'INTEL', short: 'INTEL', color: '#E28BFF', def: 'EYE' },
    { id: 'HAZARD', short: 'HAZARD', color: '#FFB13B', def: 'ALERT' }
  ];
  const TYPES = [
    { id: 'NONE', label: 'DEFAULT' }, { id: 'HOME', label: 'HOME' }, { id: 'WORK', label: 'WORK' },
    { id: 'FOOD', label: 'FOOD' }, { id: 'FUEL', label: 'FUEL' }, { id: 'PARKING', label: 'PARKING' },
    { id: 'SHOP', label: 'SHOP' }, { id: 'CAMERA', label: 'CAMERA' }, { id: 'WRENCH', label: 'WRENCH' },
    { id: 'BED', label: 'BED' }, { id: 'MEDICAL', label: 'MEDICAL' }, { id: 'GYM', label: 'GYM' },
    { id: 'TREE', label: 'PARK' }, { id: 'STAR', label: 'STAR' }, { id: 'HEART', label: 'HEART' },
    { id: 'DOLLAR', label: 'DOLLAR' }, { id: 'ANCHOR', label: 'ANCHOR' }, { id: 'PEAK', label: 'PEAK' },
    { id: 'WATER', label: 'WATER' }, { id: 'WARNING', label: 'WARNING' }
  ];
  const catById = id => CATS.find(c => c.id === id) || null;
  const typeLabel = id => (TYPES.find(t => t.id === id) || { label: id || 'DEFAULT' }).label;
  function iconFor(p) {
    const cat = catById(p.category);
    if (!cat) return 'QUERY';
    if (p.type && p.type !== 'NONE' && RX.font.icons[p.type]) return p.type;
    return cat.def;
  }

  // ---------- formatting ----------
  const pad2 = n => String(n).padStart(2, '0');
  const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const MONS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const F = {
    pad2,
    hm: ts => { const d = new Date(ts); return pad2(d.getHours()) + ':' + pad2(d.getMinutes()); },
    day: ts => { const d = new Date(ts); return DAYS[d.getDay()] + ' ' + pad2(d.getDate()) + ' ' + MONS[d.getMonth()]; },
    date: ts => { const d = new Date(ts); return pad2(d.getDate()) + ' ' + MONS[d.getMonth()]; },
    dateY: ts => { const d = new Date(ts); return pad2(d.getDate()) + ' ' + MONS[d.getMonth()] + ' ' + String(d.getFullYear()).slice(2); },
    dur: ms => { ms = Math.max(0, ms); const s = Math.floor(ms / 1000); return pad2(Math.floor(s / 3600)) + ':' + pad2(Math.floor(s % 3600 / 60)) + ':' + pad2(s % 60); },
    durHM: ms => { const m = Math.max(0, Math.floor(ms / 60000)); return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60); },
    ago: ts => {
      const d = (Date.now() - ts) / 1000;
      if (d < 90) return 'NOW';
      if (d < 3600) return Math.round(d / 60) + 'M AGO';
      if (d < 86400) return Math.round(d / 3600) + 'H AGO';
      return Math.round(d / 86400) + 'D AGO';
    },
    num: n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  };

  function wrap(str, maxChars) {
    const words = RX.font.norm(str || '').split(/\s+/).filter(Boolean);
    const lines = [];
    let cur = '';
    words.forEach(w => {
      while (w.length > maxChars) { if (cur) { lines.push(cur); cur = ''; } lines.push(w.slice(0, maxChars)); w = w.slice(maxChars); }
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
      else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines;
  }

  // ---------- render context ----------
  const U = {
    C, CATS, TYPES, catById, typeLabel, iconFor, F, wrap,
    hits: [], focus: [], fieldRects: {},
    activeField: null
  };

  // g is rebuilt every frame by main.js through U.begin()
  U.begin = function (mx, st, t) {
    const g = Object.create(G);
    g.mx = mx; g.W = mx.cols; g.H = mx.rows; g.st = st || {}; g.t = t;
    g.ink = st && st.pal === 'amber' ? C.amber : C.ink;
    g.acc = st && st.pal === 'amber' ? C.hot : C.amber;
    g.focusIdx = 0; g.selRect = null;
    U.hits = []; U.focus = []; U.fieldRects = {};
    return g;
  };

  const G = {
    // ----- primitives that respect the current clip -----
    hit(x, y, w, h, fn, extra) {
      const k = this.mx.clip;
      let x0 = x, y0 = y, x1 = x + w, y1 = y + h;
      if (k) { x0 = Math.max(x0, k.x0); y0 = Math.max(y0, k.y0); x1 = Math.min(x1, k.x1); y1 = Math.min(y1, k.y1); }
      if (x1 <= x0 || y1 <= y0) return;
      U.hits.push(Object.assign({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, fn }, extra || {}));
    },
    focusable(x, y, w, h, fn, extra) {
      const idx = this.focusIdx++;
      U.focus.push({ x, y, w, h, fn });
      const sel = !!this.st.jog && this.st.sel === idx;
      if (sel) this.selRect = { x, y, w, h };
      this.hit(x, y, w, h, fn, Object.assign({ focus: idx }, extra || {}));
      return sel;
    },
    text(s, x, y, o) { return this.mx.text(s, x, y, Object.assign({ c: this.ink }, o)); },
    textR(s, x, y, o) { return this.mx.textR(s, x, y, Object.assign({ c: this.ink }, o)); },
    textC(s, x, y, o) { return this.mx.textC(s, x, y, Object.assign({ c: this.ink }, o)); },
    mini(s, x, y, o) { return this.mx.text(s, x, y, Object.assign({ c: this.ink, face: 'mini', a: 0.75 }, o)); },
    miniR(s, x, y, o) { return this.mx.textR(s, x, y, Object.assign({ c: this.ink, face: 'mini', a: 0.75 }, o)); },
    fit(s, w, face) { return RX.font.fit(s, w, face); },

    header(title, right, o) {
      o = o || {};
      this.mx.clearRect(0, 0, this.W, 11);
      this.text(title, 1, 1, { c: o.c || this.ink, a: 1 });
      if (right) this.miniR(right, this.W - 2, 2, { a: 0.7 });
      this.mx.hline(0, 10, this.W, this.ink, 0.35, 2);
      return 13;
    },
    footer(msg, right) {
      const y = this.H - 10;
      this.mx.clearRect(0, y - 1, this.W, 11);
      this.mx.hline(0, y - 1, this.W, this.ink, 0.3, 2);
      this.text('>', 1, y + 1, { a: 0.5 });
      const w = this.W - 9 - (right ? RX.font.measure(right, 'mini') + 4 : 0);
      const shown = this.fit(msg || '', w);
      const x = 8 + this.text(shown, 8, y + 1);
      if (Math.floor(this.t / 500) % 2 === 0) this.mx.rect(x + 2, y + 1, 4, 7, this.ink, 0.9);
      if (right) this.miniR(right, this.W - 2, y + 2, { a: 0.6 });
      return y - 1;
    },
    section(label, y, right) {
      const w = this.mini(label, 1, y + 1, { a: 0.6 });
      const rw = right ? RX.font.measure(right, 'mini') : 0;
      this.mx.hline(w + 4, y + 3, this.W - w - 6 - (rw ? rw + 4 : 0), this.ink, 0.25, 2);
      if (right) this.miniR(right, this.W - 2, y + 1, { a: 0.75 });
      return y + 9;
    },
    btn(x, y, w, h, label, fn, o) {
      o = o || {};
      const sel = this.focusable(x, y, w, h, fn);
      const c = o.c || this.ink;
      const on = !!o.on;
      const a = o.dim ? 0.45 : 1;
      if (on || sel) {
        const tc = c === this.ink ? (this.st.pal === 'amber' ? '#FFE3B8' : C.hot) : c;
        if (on) this.mx.rect(x + 1, y + 1, w - 2, h - 2, c, 0.26);
        this.mx.frame(x, y, w, h, c, 1);
        if (sel) { this.mx.frame(x + 2, y + 2, w - 4, h - 4, c, on ? 0.9 : 0.45, 2); }
        this.mx.textC(label, x + w / 2, y + Math.floor((h - (o.face === 'mini' ? 5 : 7)) / 2), { c: tc, a: 1, face: o.face });
      } else {
        this.mx.frame(x, y, w, h, c, (o.solid ? 0.9 : 0.55) * a);
        this.mx.textC(label, x + w / 2, y + Math.floor((h - (o.face === 'mini' ? 5 : 7)) / 2), { c, a, face: o.face });
      }
      return x + w;
    },
    seg(x, y, w, h, items, o) {
      // items: [{label, on, fn}]
      const n = items.length, cw = Math.floor(w / n);
      items.forEach((it, i) => {
        const bx = x + i * cw, bw = (i === n - 1) ? w - cw * (n - 1) : cw + 1;
        this.btn(bx, y, bw, h, it.label, it.fn, Object.assign({ on: it.on, face: (o || {}).face, c: it.c }, o || {}));
      });
      return y + h;
    },
    toggle(x, y, on, fn, labels) {
      const L = labels || ['ON', 'OFF'];
      const label = on ? L[0] : L[1];
      const w = RX.font.measure(label, 'std') + 13;
      const sel = this.focusable(x - w, y, w, 11, fn);
      this.mx.frame(x - w, y, w, 11, this.ink, sel ? 1 : (on ? 0.8 : 0.35));
      this.mx.disc(x - w + 5, y + 5, 1.5, on ? (labels && labels[2] ? labels[2] : this.ink) : this.ink, on ? 1 : 0.18);
      this.text(label, x - w + 9, y + 2, { a: on ? 1 : 0.5 });
      return w;
    },
    row(x, y, w, h, fn) {
      const sel = this.focusable(x, y, w, h, fn);
      if (sel) { this.mx.frame(x, y, w, h, this.ink, 0.9); this.mx.rect(x, y + 1, 2, h - 2, this.ink, 1); }
      return sel;
    },
    // ----- scroll regions -----
    scrollBegin(top, bottom) {
      const st = this.st;
      st.scroll = st.scroll || 0;
      this.sTop = top; this.sBottom = bottom;
      this.mx.pushClip(0, top, this.W, bottom - top);
      return top - st.scroll;
    },
    scrollEnd(yEnd) {
      const st = this.st;
      const content = yEnd + st.scroll - this.sTop;
      const view = this.sBottom - this.sTop;
      st.scrollMax = Math.max(0, content - view + 2);
      if (st.scroll > st.scrollMax) st.scroll = st.scrollMax;
      this.mx.popClip();
      if (st.scrollMax > 0) {
        const th = Math.max(8, Math.round(view * view / (content + 2)));
        const ty = this.sTop + Math.round((view - th) * (st.scroll / st.scrollMax));
        this.mx.vline(this.W - 1, this.sTop, view, this.ink, 0.15);
        this.mx.vline(this.W - 1, ty, th, this.ink, 0.8);
      }
      // keep the jog selection on screen
      if (st.jog && this.selRect) {
        const r = this.selRect;
        if (r.y < this.sTop + 2) st.scroll = Math.max(0, st.scroll - (this.sTop + 2 - r.y));
        else if (r.y + r.h > this.sBottom - 2) st.scroll = Math.min(st.scrollMax, st.scroll + (r.y + r.h - this.sBottom + 2));
      }
    },
    // ----- fields (hidden native input, rendered here) -----
    field(key, x, y, w, h, o) {
      o = o || {};
      const af = U.activeField;
      const active = af && af.key === key;
      const val = active ? af.value : (o.value || '');
      U.fieldRects[key] = { x, y, w, h };
      const sel = this.focusable(x, y, w, h, () => U.openField(key, o), { field: key });
      this.mx.frame(x, y, w, h, this.ink, active ? 0.95 : (sel ? 0.8 : 0.4));
      if (o.label) this.mini(o.label, x + 3, y + 3, { a: 0.55 });
      const tx = x + 3 + (o.label ? RX.font.measure(o.label, 'mini') + 4 : 0);
      const maxW = x + w - 4 - tx;
      const lines = o.kind === 'area' ? Math.max(1, Math.floor((h - 3) / 9)) : 1;
      let cursor = null;
      if (!val && !active) {
        this.text(this.fit(o.placeholder || '', maxW), tx, y + Math.floor((h - 7) / 2) - (lines > 1 ? Math.floor((h - 7) / 2) - 2 : 0), { a: 0.35 });
      } else if (lines > 1) {
        const ws = wrap(val, Math.max(1, Math.floor((maxW + 1) / 6)));
        const show = ws.slice(-lines);
        show.forEach((ln, i) => { const lw = this.text(ln, tx, y + 2 + i * 9); if (i === show.length - 1) cursor = { x: tx + lw + 2, y: y + 2 + i * 9 }; });
        if (!show.length) cursor = { x: tx, y: y + 2 };
      } else {
        let s = RX.font.norm(val);
        const maxC = Math.floor((maxW - 5) / 6);
        if (s.length > maxC) s = (active ? s.slice(-maxC) : s.slice(0, maxC - 1) + '·');
        const lw = this.text(s, tx, y + Math.floor((h - 7) / 2));
        cursor = { x: tx + lw + (s ? 2 : 0), y: y + Math.floor((h - 7) / 2) };
      }
      if (active && cursor && Math.floor(this.t / 450) % 2 === 0) this.mx.rect(cursor.x, cursor.y, 4, 7, this.ink, 0.95);
      return y + h;
    },
    // ----- pins / symbols -----
    pin(cx, cy, p, o) {
      o = o || {};
      const r = o.r || 5;
      const cat = catById(p.category);
      this.mx.carve(cx, cy, r + 1.2);
      if (!cat) {
        this.mx.ring(cx, cy, r, o.c || C.ink, 0.95, 2);
        this.mx.icon('QUERY', cx - 3, cy - 3, { c: o.c || C.ink, a: 0.95 });
        return;
      }
      this.mx.disc(cx, cy, r, cat.color, o.a == null ? 1 : o.a);
      if (r >= 5) this.mx.icon(iconFor(p), cx - 3, cy - 3, { punch: true });
    },
    hex(cx, cy, c, a) {
      const pts = [[0, -4], [4, -2], [4, 2], [0, 4], [-4, 2], [-4, -2], [0, -4]];
      this.mx.carve(cx, cy, 5);
      for (let i = 0; i < 6; i++) this.mx.line(cx + pts[i][0], cy + pts[i][1], cx + pts[i + 1][0], cy + pts[i + 1][1], c, a == null ? 1 : a);
      this.mx.set(cx, cy, c, 1);
    },
    brackets(cx, cy, r, c, a) {
      const m = this.mx, L = 3;
      [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
        const x = cx + sx * r, y = cy + sy * r;
        m.hline(sx < 0 ? x : x - L + 1, y, L, c, a); m.vline(x, sy < 0 ? y : y - L + 1, L, c, a);
      });
    },
    compass(cx, cy, r, deg) {
      this.mx.ring(cx, cy, r, this.ink, 0.35, 2);
      this.mx.text('N', cx - 1, cy - r - 2, { face: 'mini', c: this.ink, a: 0.6 });
      if (deg == null) return;
      const rad = (deg - 90) * Math.PI / 180;
      this.mx.line(cx, cy, cx + Math.cos(rad) * (r - 1), cy + Math.sin(rad) * (r - 1), this.ink, 1);
      this.mx.disc(cx + Math.round(Math.cos(rad) * (r - 1)), cy + Math.round(Math.sin(rad) * (r - 1)), 1, this.ink, 1);
      this.mx.set(cx, cy, this.ink, 1);
    },
    // ----- dithered photo -----
    photo(key, dataUrl, x, y, w, h) {
      const cache = U.photoCache || (U.photoCache = {});
      const ent = cache[key];
      if (!ent || ent.src !== dataUrl || ent.w !== w || ent.h !== h) {
        const img = new Image();
        cache[key] = { src: dataUrl, w, h, cells: null };
        img.onload = () => {
          try {
            const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
            const cx = cv.getContext('2d');
            const s = Math.max(w / img.width, h / img.height);
            cx.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s);
            const d = cx.getImageData(0, 0, w, h).data;
            const lum = new Float32Array(w * h);
            for (let i = 0; i < w * h; i++) lum[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
            // 4-level Floyd–Steinberg
            const cells = new Float32Array(w * h);
            for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
              const k = j * w + i, v = lum[k], q = Math.round(v * 3) / 3, e = v - q;
              cells[k] = q;
              if (i + 1 < w) lum[k + 1] += e * 7 / 16;
              if (j + 1 < h) { if (i > 0) lum[k + w - 1] += e * 3 / 16; lum[k + w] += e * 5 / 16; if (i + 1 < w) lum[k + w + 1] += e / 16; }
            }
            cache[key].cells = cells;
            if (U.onAsync) U.onAsync();
          } catch (e) {}
        };
        img.src = dataUrl;
        return;
      }
      if (!ent.cells) { this.mx.frame(x, y, w, h, this.ink, 0.3, 2); return; }
      for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
        const v = ent.cells[j * w + i];
        if (v > 0.05) this.mx.set(x + i, y + j, this.ink, 0.25 + v * 0.75);
      }
    }
  };

  // ---------- hidden native inputs ----------
  U.openField = function (key, o) {
    const kind = o.kind || 'text';
    const el = document.getElementById(kind === 'area' ? 'kbdArea' : kind === 'date' ? 'kbdDate' : kind === 'number' ? 'kbdNum' : 'kbd');
    if (U.activeField && U.activeField.key !== key) U.closeField(true);
    // a field closed a moment ago (blur during the same tap) keeps what was typed
    const lc = U.lastClosed;
    const start = (lc && lc.key === key && Date.now() - lc.t < 1500 && kind !== 'date') ? lc.value : (o.value || '');
    U.activeField = { key, kind, el, value: start, o };
    if (kind === 'date') {
      el.value = o.value ? toLocalInput(o.value) : '';
    } else {
      el.value = start;
    }
    U.placeField();
    el.focus({ preventScroll: true });
    if (kind === 'date' && el.showPicker) { try { el.showPicker(); } catch (e) {} }
    if (kind !== 'date') { try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) {} }
  };
  U.placeField = function () {
    const af = U.activeField;
    if (!af || !RX.app || !RX.app.mx) return;
    const r = U.fieldRects[af.key];
    if (!r) return;
    const mx = RX.app.mx, p = mx.pitch;
    const ox = parseFloat(mx.wrap.style.left) || 0, oy = parseFloat(mx.wrap.style.top) || 0;
    Object.assign(af.el.style, { left: (ox + r.x * p) + 'px', top: (oy + r.y * p) + 'px', width: (r.w * p) + 'px', height: (r.h * p) + 'px' });
  };
  U.closeField = function (commit) {
    const af = U.activeField;
    if (!af) return;
    U.activeField = null;
    U.lastClosed = { key: af.key, value: af.value, t: Date.now() };
    try { af.el.blur(); } catch (e) {}
    if (commit && af.o.onCommit) {
      let v = af.value;
      if (af.kind === 'date') v = af.el.value ? new Date(af.el.value).getTime() : null;
      af.o.onCommit(v);
    }
  };
  function toLocalInput(ts) {
    const d = new Date(ts);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  U.wireInputs = function (onChange) {
    ['kbd', 'kbdArea', 'kbdDate', 'kbdNum'].forEach(id => {
      const el = document.getElementById(id);
      el.addEventListener('input', () => {
        const af = U.activeField;
        if (!af || af.el !== el) return;
        let v = el.value;
        if (af.o.maxLen) v = v.slice(0, af.o.maxLen);
        af.value = v;
        if (af.o.onInput) af.o.onInput(v);
        onChange();
      });
      el.addEventListener('keydown', e => {
        const af = U.activeField;
        if (!af || af.el !== el) return;
        if (e.key === 'Enter' && id !== 'kbdArea') { e.preventDefault(); U.closeField(true); onChange(); }
        if (e.key === 'Escape') { e.preventDefault(); U.closeField(false); onChange(); }
        e.stopPropagation();
      });
      el.addEventListener('blur', () => {
        const af = U.activeField;
        if (af && af.el === el) { U.closeField(true); onChange(); }
      });
      if (id === 'kbdDate') el.addEventListener('change', () => {
        const af = U.activeField;
        if (af && af.el === el) { U.closeField(true); onChange(); }
      });
    });
  };

  RX.ui = U;
})();
