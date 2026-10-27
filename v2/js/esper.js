/* =============================================================
   RECON.OS RX-90 · ESPER (calm)
   The first click of each zoom gesture on the map: thin brackets
   snap onto the middle with one small zoom readout under them, and
   it's gone in about half a second. Fine lines on the glass, like
   the radio's CRT; the map itself stays dot-matrix.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const E = RX.esper = {};
  const CY = '127,230,255';
  const ease = p => 1 - Math.pow(1 - Math.min(1, Math.max(0, p)), 3);
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cv = null, cx = null, W = 0, H = 0, D = 1, raf = 0, run = null;

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

  // the map's drum zoom calls this after every click; only the first click of a zoom gesture plays it
  // (a click that comes more than 0.7 s after the one before starts a new gesture)
  let lastClick = 0;
  E.zoomed = function (dir, fromZ, toZ, lat, lng) {
    const now = performance.now(), fresh = now - lastClick > 700;
    lastClick = now;
    if (!fresh) { if (run) run.toZ = toZ; return; }   // the readout follows along while you keep turning
    E.play(dir, toZ);
  };
  E.play = function (dir, toZ) {
    if (reduced || !build()) return;
    cv.style.display = 'block'; size();
    run = { t0: performance.now(), toZ };
    if (!raf) raf = requestAnimationFrame(frame);
  };

  // calm: thin brackets snap onto the middle, one small zoom readout, gone in about half a second
  function frame(t) {
    raf = 0;
    if (!run) return;
    size();
    const r = run, e = t - r.t0, fade = e < 300 ? 1 : Math.max(0, 1 - (e - 300) / 220);
    cx.clearRect(0, 0, W, H);
    if (e > 540) { run = null; cv.style.display = 'none'; return; }
    const p = ease(e / 200), bw = 160 + (96 - 160) * p, bh = 120 + (70 - 120) * p, bx = W / 2 - bw / 2, by = H / 2 - bh / 2, L = 10;
    cx.strokeStyle = 'rgba(' + CY + ',' + 0.85 * fade + ')'; cx.lineWidth = 1; cx.beginPath();
    [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]].forEach(([x, y, sx, sy]) => { cx.moveTo(x + sx * L, y); cx.lineTo(x, y); cx.lineTo(x, y + sy * L); });
    cx.stroke();
    cx.font = "11px 'Share Tech Mono', monospace"; cx.textAlign = 'center'; cx.fillStyle = 'rgba(' + CY + ',' + 0.85 * fade + ')';
    cx.fillText('Z' + (Math.round(r.toZ * 2) / 2).toFixed(1), W / 2, by + bh + 14);
    raf = requestAnimationFrame(frame);
  }
})();
