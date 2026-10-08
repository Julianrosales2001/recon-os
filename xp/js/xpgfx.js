/* =============================================================
   XP-1000 · DISPLAY KIT
   The RP-1000's dot-matrix model on the console's three displays:
   one canvas pixel = one dot, scaled nearest-neighbour and cut into
   dots by a mask, lit with the RP's own ROM fonts (RX.font).
   A Grid is the buffer we draw into; a Panel puts it on screen
   (dots + ghost + bloom, or + shadow for the LCD).
   ============================================================= */
window.XP = window.XP || {};

(function () {
  const F = RX.font;
  const EXTRA = { '−': '-', '●': '•', '◆': '•', '◎': '○', '◐': '○', '↗': '→', '…': '...', '£': 'L' };
  const norm = s => { let o = ''; for (const ch of String(s == null ? '' : s)) o += EXTRA[ch] !== undefined ? EXTRA[ch] : ch; return F.norm(o); };
  const face = f => f === 'mini' ? F.mini : F.std;
  const measure = (s, f, k) => { const ff = face(f), n = [...norm(s)].length; return n ? (n * ff.adv - (ff.adv - ff.w)) * (k || 1) : 0; };
  const fit = (s, maxDots, f, k) => { const ff = face(f), ch = [...norm(s)], max = Math.floor((maxDots / (k || 1) + (ff.adv - ff.w)) / ff.adv); return ch.length <= max ? ch.join('') : ch.slice(0, Math.max(0, max - 1)).join('') + (f === 'mini' ? '.' : '·'); };
  const RGBC = {};
  const rgb = h => RGBC[h] || (RGBC[h] = h.length === 4 ? [parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16), parseInt(h[3] + h[3], 16)] : [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);

  // the RP map engine colours dots through RX.rgb (it lives in v2's matrix.js, which XP doesn't load)
  RX.rgb = RX.rgb || (h => Array.isArray(h) ? h : rgb(h));

  function Grid(cols, rows) { this.c = cols; this.r = rows; this.b = new Uint8ClampedArray(cols * rows * 4); this.k = null; }
  const P = Grid.prototype;
  P.reset = function () { this.b.fill(0); this.k = null; };
  P.set = function (x, y, col, a) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.c || y >= this.r) return;
    const k = this.k; if (k && (x < k[0] || y < k[1] || x >= k[2] || y >= k[3])) return;
    const i = (y * this.c + x) * 4, v = rgb(col || '#7DFFD6');
    this.b[i] = v[0]; this.b[i + 1] = v[1]; this.b[i + 2] = v[2]; this.b[i + 3] = (a == null ? 1 : Math.max(0, Math.min(1, a))) * 255;
  };
  P.off = function (x, y) { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= this.c || y >= this.r) return; const k = this.k; if (k && (x < k[0] || y < k[1] || x >= k[2] || y >= k[3])) return; this.b[(y * this.c + x) * 4 + 3] = 0; };
  P.clip = function (x, y, w, h) { this.k = [x, y, x + w, y + h]; };
  P.unclip = function () { this.k = null; };
  P.rect = function (x, y, w, h, col, a) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, col, a); };
  P.clear = function (x, y, w, h) { x = Math.round(x); y = Math.round(y); for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.off(i, j); };
  P.hline = function (x, y, w, col, a, dash) { for (let i = 0; i < w; i++) if (!dash || i % dash === 0) this.set(x + i, y, col, a); };
  P.vline = function (x, y, h, col, a, dash) { for (let j = 0; j < h; j++) if (!dash || j % dash === 0) this.set(x, y + j, col, a); };
  P.frame = function (x, y, w, h, col, a) { this.hline(x, y, w, col, a); this.hline(x, y + h - 1, w, col, a); this.vline(x, y, h, col, a); this.vline(x + w - 1, y, h, col, a); };
  P.box = function (x, y, w, h, col, a) { this.clear(x, y, w, h); this.frame(Math.round(x), Math.round(y), w, h, col, a); };
  P.line = function (x0, y0, x1, y1, col, a, dash, st) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    if (n > 4000) return;
    st = st || { d: 0 };
    for (let i = 0; i <= n; i++) {
      if (i === n && st.last) break;
      if (!dash || (st.d % (dash[0] + dash[1])) < dash[0]) this.set(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, col, a);
      if (i < n) st.d++;
    }
  };
  P.poly = function (pts, col, a, dash, closed) {
    if (!pts || pts.length < 2) return; const st = { d: 0, last: true }, q = closed ? pts.concat([pts[0]]) : pts;
    for (let i = 0; i < q.length - 1; i++) {
      const A = q[i], B = q[i + 1];
      if ((A[0] < -50 && B[0] < -50) || (A[1] < -50 && B[1] < -50) || (A[0] > this.c + 50 && B[0] > this.c + 50) || (A[1] > this.r + 50 && B[1] > this.r + 50)) { st.d += Math.ceil(Math.hypot(B[0] - A[0], B[1] - A[1])); continue; }
      this.line(A[0], A[1], B[0], B[1], col, a, dash, st);
    }
  };
  P.disc = function (cx, cy, r, col, a) { for (let j = Math.floor(-r); j <= Math.ceil(r); j++) for (let i = Math.floor(-r); i <= Math.ceil(r); i++) if (i * i + j * j <= r * r + 0.25) this.set(cx + i, cy + j, col, a); };
  P.carve = function (cx, cy, r) { for (let j = Math.floor(-r); j <= Math.ceil(r); j++) for (let i = Math.floor(-r); i <= Math.ceil(r); i++) if (i * i + j * j <= r * r + 0.25) this.off(cx + i, cy + j); };
  P.ring = function (cx, cy, r, col, a, dash) { const n = Math.max(8, Math.ceil(2 * Math.PI * r)); for (let s = 0; s < n; s++) if (!dash || s % (dash[0] + dash[1]) < dash[0]) { const t = s / n * 2 * Math.PI; this.set(cx + Math.cos(t) * r, cy + Math.sin(t) * r, col, a); } };
  P.fillPoly = function (pts, col, a) {
    let y0 = Infinity, y1 = -Infinity; for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    y0 = Math.max(0, y0); y1 = Math.min(this.r - 1, y1);
    for (let y = Math.ceil(y0); y <= Math.floor(y1); y++) {
      const xs = []; for (let i = 0; i < pts.length; i++) { const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + (y - ay) / (by - ay) * (bx - ax)); }
      xs.sort((p, q) => p - q); for (let i = 0; i + 1 < xs.length; i += 2) for (let x = Math.max(0, Math.ceil(xs[i])); x <= Math.min(this.c - 1, Math.floor(xs[i + 1])); x++) this.set(x, y, col, a);
    }
  };
  P.text = function (s, x, y, o) {
    o = o || {}; const f = face(o.face), k = o.s || 1, col = o.c || '#7DFFD6', a = o.a == null ? 1 : o.a; let cx = Math.round(x); y = Math.round(y);
    for (const ch of norm(s)) {
      const g = f.glyphs[ch] || f.glyphs[f.fallback] || f.glyphs[' '];
      if (g) for (let gy = 0; gy < f.h; gy++) { const row = g[gy]; for (let gx = 0; gx < f.w; gx++) if (row[gx]) for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) { if (o.punch) this.off(cx + gx * k + dx, y + gy * k + dy); else this.set(cx + gx * k + dx, y + gy * k + dy, col, a); } }
      cx += f.adv * k;
    }
    return measure(s, o.face, k);
  };
  P.textR = function (s, xr, y, o) { const w = measure(s, (o || {}).face, (o || {}).s); this.text(s, xr - w + 1, y, o); return w; };
  P.textC = function (s, cx, y, o) { const w = measure(s, (o || {}).face, (o || {}).s); this.text(s, Math.round(cx - w / 2), y, o); return w; };
  P.label = function (s, x, y, o) { const w = measure(s, (o || {}).face, (o || {}).s), h = ((o || {}).face === 'mini' ? 5 : 7) * ((o || {}).s || 1); this.clear(Math.round(x) - 1, Math.round(y) - 1, w + 2, h + 2); this.text(s, x, y, o); return w; };
  P.labelR = function (s, xr, y, o) { const w = measure(s, (o || {}).face, (o || {}).s); return this.label(s, xr - w + 1, y, o); };
  P.icon = function (name, x, y, o) { o = o || {}; const g = F.icons[name]; if (!g) return; for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) if (g[j][i]) { if (o.punch) this.off(x + i, y + j); else this.set(x + i, y + j, o.c, o.a); } };
  P.tri = function (cx, cy, r, ang, col, a) { const pt = (dx, dy) => [cx + dx * Math.cos(ang) - dy * Math.sin(ang), cy + dx * Math.sin(ang) + dy * Math.cos(ang)]; this.fillPoly([pt(0, -r), pt(r * 0.72, r * 0.8), pt(0, r * 0.38), pt(-r * 0.72, r * 0.8)], col, a); };
  P.blit = function (src, sw, sh, x0, y0) {   // copy a sub-buffer (e.g. the map) in at x0,y0
    for (let y = 0; y < sh; y++) { const ty = y0 + y; if (ty < 0 || ty >= this.r) continue; const s = y * sw * 4, d = (ty * this.c + x0) * 4; this.b.set(src.subarray(s, s + sw * 4), d); }
  };
  P.recolor = function (x, y, w, h, fn) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) { const k = (j * this.c + i) * 4; if (this.b[k + 3]) fn(this.b, k); } };

  // ---------- a panel on screen ----------
  // host: element (sized in stage px); spec { w, h, pitch, round, bloom, shadow, ghost }
  function Panel(host, spec) {
    this.spec = spec; this.cols = Math.floor(spec.w / spec.pitch); this.rows = Math.floor(spec.h / spec.pitch);
    const cw = this.cols * spec.pitch, ch = this.rows * spec.pitch, ox = Math.floor((spec.w - cw) / 2), oy = Math.floor((spec.h - ch) / 2);
    const place = el => { Object.assign(el.style, { position: 'absolute', left: ox + 'px', top: oy + 'px', width: cw + 'px', height: ch + 'px' }); host.appendChild(el); return el; };
    const mask = spec.round ? 'url(keys/mask-round.svg)' : 'url(keys/mask-square.svg)', ms = spec.pitch + 'px ' + spec.pitch + 'px';
    const cv = cls => { const c = document.createElement('canvas'); c.width = this.cols; c.height = this.rows; c.className = 'mx ' + cls; return place(c); };
    if (spec.ghost) { const g = place(document.createElement('div')); g.className = 'mx-g'; g.style.backgroundImage = 'url(keys/' + spec.ghost + ')'; g.style.backgroundSize = ms; }
    this.layers = [];
    if (spec.shadow) { const s = cv('mx-shadow'); this.layers.push(s); }
    if (spec.bloom) { const b = cv('mx-bloom'); b.style.filter = 'blur(' + spec.bloom + 'px) saturate(1.25) brightness(1.25)'; this.layers.push(b); }
    const d = cv('mx-dots'); this.layers.push(d);
    [d].concat(spec.shadow ? [this.layers[0]] : []).forEach(c => { c.style.webkitMaskImage = mask; c.style.maskImage = mask; c.style.webkitMaskSize = ms; c.style.maskSize = ms; });
    this.ctx = this.layers.map(c => c.getContext('2d'));
    this.g = new Grid(this.cols, this.rows);
    this.img = new ImageData(this.g.b, this.cols, this.rows);
  }
  Panel.prototype.present = function () { this.ctx.forEach(c => c.putImageData(this.img, 0, 0)); };

  XP.Grid = Grid; XP.Panel = Panel; XP.measure = measure; XP.fit = fit; XP.norm = norm;
})();
