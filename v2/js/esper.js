/* =============================================================
   RECON.OS RX-90 · ESPER
   Zooming the map plays like Deckard's photo machine (every other
   click of the drum): brackets snap onto the spot, a thin crosshair
   runs through it, a grid sweeps the way you're going, the readouts
   tick (zoom, coordinates, a frame counter), ENHANCE turns to LOCK,
   and the map resolves from coarse blocks of dots to full detail.
   The map stays dot-matrix; the overlay is fine lines and thin type
   on the glass, like the radio's CRT.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const E = RX.esper = {};
  const CY = '127,230,255', AM = '255,179,71';
  const ease = p => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cv = null, cx = null, W = 0, H = 0, D = 1, raf = 0, run = null, clicks = 0;

  function build() {
    if (cv) return true;
    const host = document.getElementById('screen'); if (!host) return false;
    cv = document.createElement('canvas'); cv.className = 'esper-ovl'; cv.setAttribute('aria-hidden', 'true');
    host.appendChild(cv); cx = cv.getContext('2d');
    return true;
  }
  function size() {
    const r = cv.getBoundingClientRect(); D = Math.min(2, window.devicePixelRatio || 1);
    if (Math.round(r.width * D) !== cv.width || Math.round(r.height * D) !== cv.height) { W = r.width; H = r.height; cv.width = Math.round(W * D); cv.height = Math.round(H * D); }
    cx.setTransform(D, 0, 0, D, 0, 0);
  }

  // the map's drum zoom calls this after every click; every other one gets the full sequence
  // dir: +1 in, -1 out · tx, ty: where to enhance, in CSS px within the screen (null = the middle)
  E.zoomed = function (dir, fromZ, toZ, lat, lng, tx, ty) {
    clicks++;
    if (clicks % 2 === 0 && tx == null) return;
    E.play(dir, fromZ, toZ, lat, lng, tx, ty);
  };
  E.play = function (dir, fromZ, toZ, lat, lng, tx, ty) {
    if (reduced || !build()) return;
    cv.style.display = 'block'; size();
    run = { t0: performance.now(), dir: dir || 1, fromZ, toZ, lat, lng, bx: tx == null ? W / 2 : tx, by: ty == null ? H / 2 : ty };
    if (!raf) raf = requestAnimationFrame(frame);
  };
  // how coarse the map should draw right now (1 = full detail): read by main.js just before the picture is shown
  E.coarse = function () {
    if (!run) return 1;
    const e = performance.now() - run.t0;
    return e < 160 ? 6 : e < 300 ? 4 : e < 420 ? 2 : 1;
  };
  // blocks of dots: each block takes the colour of its first lit dot
  E.blockify = function (m, k) {
    if (k <= 1 || !m.buf) return;
    const b = m.buf, C = m.cols, R = m.rows;
    for (let y = 0; y < R; y += k) for (let x = 0; x < C; x += k) {
      let src = -1;
      for (let j = 0; j < k && src < 0 && y + j < R; j++) for (let i = 0; i < k && x + i < C; i++) { const q = ((y + j) * C + x + i) * 4; if (b[q + 3] > 40) { src = q; break; } }
      for (let j = 0; j < k && y + j < R; j++) for (let i = 0; i < k && x + i < C; i++) {
        const q = ((y + j) * C + x + i) * 4;
        if (src < 0) b[q + 3] = 0; else { b[q] = b[src]; b[q + 1] = b[src + 1]; b[q + 2] = b[src + 2]; b[q + 3] = b[src + 3] * 0.9; }
      }
    }
  };

  function frame(t) {
    raf = 0;
    if (!run) return;
    size();
    const r = run, e = t - r.t0, fade = Math.max(0, 1 - Math.max(0, e - 900) / 400);
    cx.clearRect(0, 0, W, H);
    if (e > 1300) { run = null; cv.style.display = 'none'; return; }
    // brackets snap in from the edges onto the target, a crosshair through it
    const p = ease(e / 220), bw = W * 0.9 + (110 - W * 0.9) * p, bh = H * 0.9 + (80 - H * 0.9) * p;
    const bx = W / 2 + (r.bx - W / 2) * p - bw / 2, by = H / 2 + (r.by - H / 2) * p - bh / 2, L = 14;
    cx.strokeStyle = 'rgba(' + CY + ',' + fade + ')'; cx.lineWidth = 1.2; cx.shadowColor = 'rgb(' + CY + ')'; cx.shadowBlur = 6; cx.beginPath();
    [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]].forEach(([x, y, sx, sy]) => { cx.moveTo(x + sx * L, y); cx.lineTo(x, y); cx.lineTo(x, y + sy * L); });
    cx.stroke(); cx.shadowBlur = 0;
    cx.strokeStyle = 'rgba(' + CY + ',' + 0.35 * fade + ')'; cx.lineWidth = 1; cx.beginPath();
    cx.moveTo(0, r.by); cx.lineTo(W, r.by); cx.moveTo(r.bx, 0); cx.lineTo(r.bx, H); cx.stroke();
    // a grid sweeps across: down going in, up coming out
    if (e < 620) {
      const s = ease(e / 620), gy = r.dir > 0 ? s * H : (1 - s) * H;
      cx.fillStyle = 'rgba(' + CY + ',.5)'; cx.fillRect(0, gy, W, 1);
      cx.strokeStyle = 'rgba(' + CY + ',.12)'; cx.beginPath();
      const y0 = r.dir > 0 ? 0 : gy, y1 = r.dir > 0 ? gy : H;
      for (let x = 0; x < W; x += 24) { cx.moveTo(x, y0); cx.lineTo(x, y1); }
      for (let y = Math.ceil(y0 / 24) * 24; y < y1; y += 24) { cx.moveTo(0, y); cx.lineTo(W, y); }
      cx.stroke();
    }
    // readouts tick while it works, then settle
    const tick = e < 520, z = tick ? (r.fromZ + (r.toZ - r.fromZ) * ease(e / 520)).toFixed(2) : (Math.round(r.toZ * 2) / 2).toFixed(1);
    const jit = v => (tick ? v + (Math.random() - 0.5) * 2e-4 : v).toFixed(4);
    cx.font = "11px 'Share Tech Mono', monospace"; cx.textAlign = 'left'; cx.fillStyle = 'rgba(' + CY + ',' + fade + ')';
    const lx = Math.max(6, Math.min(W - 150, r.bx - 55));
    cx.fillText('ENH ' + (r.dir > 0 ? 'IN' : 'OUT') + '  Z' + z, lx, Math.max(14, r.by - 52));
    if (Number.isFinite(r.lat)) cx.fillText(jit(Math.abs(r.lat)) + (r.lat >= 0 ? 'N  ' : 'S  ') + jit(Math.abs(r.lng)) + (r.lng >= 0 ? 'E' : 'W'), lx, Math.min(H - 26, r.by + 62));
    cx.fillStyle = 'rgba(' + AM + ',' + 0.8 * fade + ')';
    cx.textAlign = 'right'; cx.fillText(String(Math.round(224 + e / 3)).padStart(4, '0') + '·' + String(Math.round(176 - e / 5)).padStart(4, '0'), W - 10, H - 30);
    cx.textAlign = 'left'; cx.fillText(e < 520 ? 'ENHANCE ▌' : 'LOCK', 10, H - 30);
    raf = requestAnimationFrame(frame);
  }
})();
