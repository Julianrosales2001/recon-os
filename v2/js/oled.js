/* =============================================================
   RECON.OS · JOG READOUT (2.53)
   The jog's value lives on a small white OLED set into the well:
   36 × 8 pixels, true black where it's off, the same 5×7 font as
   the main screen. A change rolls up one line, like a little OLED
   menu. A symbol says what the number is: a lens for zoom, a
   crosshair for NEAR, the kind itself while you're marking.
   #jogVal stays the source of truth (main.js and the screens still
   write their text there); this only draws it. It redraws when
   that text or the mode changes, never on a timer.
   ============================================================= */
(function () {
  'use strict';
  const val = document.getElementById('jogVal');
  if (!val || !window.RX || !RX.font) return;
  const F = RX.font, device = document.getElementById('device');
  const COLS = 36, ROWS = 8, ROLL = 140;
  const ON = '#EAF4FF', GLOW = 'rgba(200,225,255,.85)';

  const win = document.createElement('span'); win.className = 'oled-win'; win.setAttribute('aria-hidden', 'true');
  const cv = document.createElement('canvas'); win.appendChild(cv);
  val.parentNode.insertBefore(win, val);
  val.classList.add('oled-src');   // kept for screen readers, hidden on the face
  const g = cv.getContext('2d');

  // its own 7×7 symbols: a lens (zoom) and a crosshair (NEAR); kinds use the font's icons
  const bits = a => a.map(r => [...r].map(Number));
  const LENS = bits(['0111000', '1000100', '1000100', '1000100', '0111000', '0000110', '0000011']);
  const XHAIR = bits(['0001000', '0011100', '0101010', '1110111', '0101010', '0011100', '0001000']);

  function content() {
    const A = RX.app, t = (val.textContent || '').trim();
    let icon = null, txt = t;
    if (A && A.assign) {
      const k = A.assign.step === 'color' ? A.assign.kind : A.ringKinds()[A.assign.sel];
      icon = RX.ui && RX.ui.kindIcon ? F.icons[RX.ui.kindIcon(k)] : null;
    } else if (A && A.stack && A.stack.length <= 1 && A.drumFace && A.drumFace() === 'NEAR' && /\//.test(t)) icon = XHAIR;
    else if (/^Z\d/.test(t)) { icon = LENS; txt = t.slice(1); }
    return { txt, icon, key: (icon === LENS ? 'L' : icon === XHAIR ? 'X' : icon ? 'K' + (A.assign && A.assign.sel) : '') + '|' + t };
  }
  function cells(c) {
    const B = new Uint8Array(COLS * ROWS), set = (x, y) => { if (x >= 0 && y >= 0 && x < COLS && y < ROWS) B[y * COLS + x] = 1; };
    let x = Math.round((COLS - (F.measure(c.txt, 'std') + (c.icon ? 9 : 0))) / 2);
    if (c.icon) { for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) if (c.icon[j][i]) set(x + i, j); x += 9; }
    const f = F.std;
    for (const ch of F.norm(c.txt)) { const gl = f.glyphs[ch] || f.glyphs[f.fallback]; for (let j = 0; j < f.h; j++) for (let i = 0; i < f.w; i++) if (gl[j][i]) set(x + i, j); x += f.adv; }
    return B;
  }

  let cur = null, prev = null, t0 = 0, raf = 0;
  function size() { const d = Math.min(3, window.devicePixelRatio || 1), r = cv.getBoundingClientRect(); cv.width = Math.max(1, Math.round(r.width * d)); cv.height = Math.max(1, Math.round(r.height * d)); }
  function paint(B, dy, p, dot) {
    for (let y = 0; y < ROWS; y++) { const yy = y + dy; if (yy < -1 || yy > ROWS) continue; for (let x = 0; x < COLS; x++) if (B[y * COLS + x]) g.fillRect(x * p + (p - dot) / 2, yy * p + (p - dot) / 2, dot, dot); }
  }
  function frame(now) {
    raf = 0;
    const p = cv.width / COLS, dot = p * 0.78, k = Math.min(1, (now - t0) / ROLL), e = 1 - Math.pow(1 - k, 3);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = ON; g.shadowColor = GLOW; g.shadowBlur = p * 1.1;
    if (prev && k < 1) { const s = Math.round(e * ROWS); paint(prev.B, -s, p, dot); paint(cur.B, ROWS - s, p, dot); raf = requestAnimationFrame(frame); }
    else { prev = null; paint(cur.B, 0, p, dot); }
    g.shadowBlur = 0;
  }
  function update(force) {
    const c = content();
    if (!force && cur && c.key === cur.key) return;
    const roll = !!cur && !force;
    prev = roll ? cur : null; cur = Object.assign(c, { B: cells(c) }); t0 = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
  }
  new MutationObserver(() => update()).observe(val, { childList: true, characterData: true, subtree: true });
  if (device) new MutationObserver(() => update()).observe(device, { attributes: true, attributeFilter: ['class'] });   // marking starts or ends
  if (window.ResizeObserver) new ResizeObserver(() => { size(); update(true); }).observe(cv);
  // the labels either side: when a long pair would crowd the window, the head closes its letter-spacing a touch
  const head = win.parentNode, jl = document.getElementById('jogL'), jr = document.getElementById('jogR');
  function fit() {
    if (!jl || !jr) return;
    head.classList.remove('tight');
    const w = win.getBoundingClientRect(), a = jl.getBoundingClientRect(), b = jr.getBoundingClientRect();
    if (w.left - a.right < 3 || b.left - w.right < 3) head.classList.add('tight');
  }
  [jl, jr].forEach(e => e && new MutationObserver(fit).observe(e, { childList: true, characterData: true, subtree: true }));
  if (window.ResizeObserver) new ResizeObserver(fit).observe(head);
  size(); update(true); fit();
  RX.oled = { refresh: () => update() };
})();
