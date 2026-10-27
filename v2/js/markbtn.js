// MARK, 2.46: a machined soft-release pusher (titanium knurl, Leica-red anodized disc, engraved MARK) standing in a
// titanium collar with 16 amber light pipes. A lens in the disc projects a wireframe map pin. Press: the pin unfolds into a
// target and the pusher sinks flush; release: the target collapses, the lens fires, the new count floats up, the pin scans
// back in. Everything heavy (textures, the housing, the pusher) is drawn once into layers; a frame only slides the pusher
// layer and redraws the small hologram box. The <button id="markKey"> keeps all the behaviour; main.js sets .down on it.
(function () {
  'use strict';
  const el = document.getElementById('markKey');
  if (!el || !window.CanvasRenderingContext2D) return;
  const cv = document.createElement('canvas'); cv.className = 'mk-cv'; cv.setAttribute('aria-hidden', 'true');
  const main = cv.getContext('2d'); if (!main) return;
  el.appendChild(cv); el.classList.add('mk-on');

  const G = 1.55, K = 0.52, RC = 48 * G, RG = 36 * G, RB = 31 * G, RD = 33 * G, BODYH = 13 * G, DISCH = 4.6 * G, TRAVEL = BODYH + DISCH - 2.2;
  const BOX_W = 160, BOX_H = 96, CX = 81, CY0 = 43;          // the drawing's own units; the box is centered in the key
  const cx = CX, base = 50, gy = base - 1, CYC = base - 2.5;
  const RIN = RG + 1.4, RM = (RIN + RC) / 2, WW = (RC - RIN) * 0.42, NW = 16, WF = 0.56;
  const FACE = { base: '#b3201a', side: '#8a1511', paint: '#f3efe6' }, KN = { d: '#26282c', l: '#c7cbd0' };
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const E = t => t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3), EI = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);

  function hex(c) { c = c.replace('#', ''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); }
  function mix(a, b, t) { const A = hex(a), B = hex(b); return 'rgb(' + A.map((q, i) => Math.round(q + (B[i] - q) * t)).join(',') + ')'; }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
  function noise(g, w, h, amp) { const im = g.getImageData(0, 0, w, h), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * amp; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(im, 0, 0); }
  function conic(g, a, R, peak, trough) { if (!g.createConicGradient) return; const cg = g.createConicGradient(a, 0, 0); [[0, peak], [0.08, 'rgba(0,0,0,0)'], [0.25, trough], [0.42, 'rgba(0,0,0,0)'], [0.5, peak], [0.58, 'rgba(0,0,0,0)'], [0.75, trough], [0.92, 'rgba(0,0,0,0)'], [1, peak]].forEach(s => cg.addColorStop(s[0], s[1])); g.fillStyle = cg; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill(); }

  // ---------- textures (built once) ----------
  let TX = null;
  function textures() {
    if (TX) return TX;
    const blast = (() => { const [c, g] = mk(256, 256), im = g.createImageData(256, 256), d = im.data; for (let i = 0; i < d.length; i += 4) { const r = Math.random(), q = r < 0.04 ? 255 : r < 0.08 ? 0 : 128 + (Math.random() - 0.5) * 90; d[i] = d[i + 1] = d[i + 2] = q; d[i + 3] = r < 0.08 ? 40 : 22; } g.putImageData(im, 0, 0); return c; })();
    const knurl = (() => { const TW = 1800, TH = 170, [c, g] = mk(TW, TH); g.fillStyle = KN.d; g.fillRect(0, 0, TW, TH); const nx = 52, w = TW / nx, h = w * 0.78;
      for (let j = -1; j < TH / h + 1; j++) for (let i = -1; i <= nx; i++) for (const o of [0, 0.5]) { const x = (i + o) * w, y = (j + o) * h, T = [x, y - h / 2], R = [x + w / 2, y], B = [x, y + h / 2], L = [x - w / 2, y];
        for (const [a, b, br] of [[L, T, 0.96], [T, R, 0.6], [R, B, 0.14], [B, L, 0.4]]) { g.beginPath(); g.moveTo(x, y); g.lineTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.closePath(); g.fillStyle = mix(KN.d, KN.l, br); g.fill(); }
        g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(T[0], T[1]); g.lineTo(R[0], R[1]); g.lineTo(B[0], B[1]); g.lineTo(L[0], L[1]); g.closePath(); g.stroke();
        g.fillStyle = 'rgba(255,255,255,.55)'; g.fillRect(x - 1, y - 1, 2, 2); }
      g.fillStyle = 'rgba(0,0,0,.65)'; g.fillRect(0, 0, TW, 6); g.fillStyle = mix(KN.d, KN.l, 0.75); g.fillRect(0, 6, TW, 3); noise(g, TW, TH, 26); return c; })();
    const side = (() => { const TW = 1800, TH = 70, [c, g] = mk(TW, TH); g.fillStyle = FACE.side; g.fillRect(0, 0, TW, TH);
      for (let y = 0; y < TH; y += 1.4) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,' + (Math.random() * 0.08).toFixed(3) + ')' : 'rgba(0,0,0,' + (Math.random() * 0.12).toFixed(3) + ')'; g.fillRect(0, y, TW, 0.8); }
      g.fillStyle = '#e4e7ea'; g.fillRect(0, 0, TW, 7); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 7, TW, 2); noise(g, TW, TH, 14); return c; })();
    const face = (() => { const F = 1400, R = F / 2, Rf = R - 30, [c, g] = mk(F, F); g.translate(R, R);
      g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fillStyle = '#c9cdd2'; g.fill(); conic(g, -2.3, R, 'rgba(255,255,255,.95)', 'rgba(40,44,50,.75)');
      for (let r = Rf; r < R; r += 1.3) { g.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'; g.lineWidth = 0.8; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }
      g.save(); g.beginPath(); g.arc(0, 0, Rf, 0, Math.PI * 2); g.clip(); g.fillStyle = FACE.base; g.fill();
      for (let r = 2; r < Rf; r += 1.25) { g.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,' + (0.02 + Math.random() * 0.05).toFixed(3) + ')' : 'rgba(0,0,0,' + (0.03 + Math.random() * 0.06).toFixed(3) + ')'; g.lineWidth = 0.7; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }
      conic(g, -2.3, Rf, 'rgba(255,235,225,.34)', 'rgba(0,0,0,.28)');
      const rg = g.createRadialGradient(0, 0, 0, 0, 0, Rf); rg.addColorStop(0, 'rgba(0,0,0,.18)'); rg.addColorStop(0.75, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(255,255,255,.08)'); g.fillStyle = rg; g.fillRect(-Rf, -Rf, Rf * 2, Rf * 2);
      g.restore(); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, Rf, 0, Math.PI * 2); g.stroke();
      // MARK, cut into the anodizing and paint-filled: shadowed top walls, lit bottom walls, worn paint
      { const fs = 118, yOff = Rf * 0.56, font = '700 ' + fs + 'px "Helvetica Neue",Helvetica,Arial,sans-serif', gap = fs * 0.24, word = 'MARK'; g.font = font;
        const ws = [...word].map(ch => g.measureText(ch).width), tot = ws.reduce((a, b) => a + b, 0) + gap * 3;
        const letters = (gg, dx, dy, col) => { gg.font = font; gg.textBaseline = 'middle'; gg.textAlign = 'left'; gg.fillStyle = col; let xx = -tot / 2 + dx; for (let i = 0; i < 4; i++) { gg.fillText(word[i], xx, dy + yOff + fs * 0.04); xx += ws[i] + gap; } };
        const [L, lg] = mk(F, F); lg.translate(R, R); letters(lg, 0, 0, mix(FACE.base, '#ffffff', 0.55)); lg.globalCompositeOperation = 'source-atop'; letters(lg, 0, -7, FACE.paint);
        lg.globalAlpha = 0.25; lg.fillStyle = '#000'; for (let i = 0; i < 500; i++) lg.fillRect((Math.random() - 0.5) * tot, yOff + (Math.random() - 0.5) * fs, 2 + Math.random() * 4, 1); lg.globalAlpha = 1;
        const [S2, sg] = mk(F, F); sg.translate(R, R); letters(sg, 0, 0, 'rgba(10,4,3,.92)'); sg.globalCompositeOperation = 'destination-out'; letters(sg, 0, 9, '#000');
        lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-atop'; lg.drawImage(S2, 0, 0);
        g.save(); g.shadowColor = 'rgba(255,255,255,.3)'; g.shadowOffsetY = 3; letters(g, 0, 0, 'rgba(0,0,0,.6)'); g.restore();
        g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(L, 0, 0); g.restore(); }
      // the projector lens: a polished bezel round dark glass
      g.beginPath(); g.arc(0, 0, Rf * 0.17, 0, Math.PI * 2); g.fillStyle = '#cfd3d8'; g.fill(); conic(g, -2.3, Rf * 0.17, 'rgba(255,255,255,.95)', 'rgba(40,44,50,.8)');
      g.beginPath(); g.arc(0, 0, Rf * 0.125, 0, Math.PI * 2); const lg2 = g.createRadialGradient(-Rf * 0.03, -Rf * 0.04, 2, 0, 0, Rf * 0.125); lg2.addColorStop(0, '#3a5a66'); lg2.addColorStop(0.5, '#0b1418'); lg2.addColorStop(1, '#020304'); g.fillStyle = lg2; g.fill();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(-Rf * 0.04, -Rf * 0.05, Rf * 0.03, Rf * 0.018, -0.5, 0, Math.PI * 2); g.fill();
      return c; })();
    const beam = (() => { const W = 96, H = 256, [c, g] = mk(W, H), im = g.createImageData(W, H), d = im.data, streak = []; for (let i = 0; i < W; i++) streak.push(0.75 + 0.25 * Math.random());
      for (let y = 0; y < H; y++) { const v = y / (H - 1), half = (0.1 + 0.9 * (1 - v)) * W / 2, vf = 0.38 + 0.62 * Math.pow(v, 1.2);
        for (let xx = 0; xx < W; xx++) { const u = Math.abs(xx - W / 2 + 0.5) / half; let a = u >= 1 ? 0 : Math.pow(1 - u * u, 1.8); const core = Math.exp(-Math.pow((xx - W / 2 + 0.5) / (W * 0.04 + half * 0.08), 2)) * Math.pow(v, 3) * 0.8; a = Math.min(1, (a * streak[xx] * 0.9 + core) * vf);
          const i = (y * W + xx) * 4; d[i] = 150 + core * 100; d[i + 1] = 228 + core * 27; d[i + 2] = 255; d[i + 3] = a * 255; } }
      g.putImageData(im, 0, 0); return c; })();
    return TX = { blast, knurl, side, face, beam };
  }

  // the hologram: a wireframe pin and a flat target with the same topology, so one can unfold into the other
  const HG = (() => { const a = 7.4, M = 10, N = 16, TR = 20.5, pt = (t, ph) => { const x = a * 1.25 * Math.sin(t) * Math.sin(t / 2), y = a * 1.18 * (1 - Math.cos(t)); return [x * Math.cos(ph), y, x * Math.sin(ph)]; };
    const pin = [], tgt = [];
    for (let m = 0; m < M; m++) { const ph = m / M * Math.PI * 2, A = [], B = []; for (let n = 0; n <= N; n++) { A.push(pt(n / N * Math.PI, ph)); const rr = TR * (0.18 + 0.82 * n / N); B.push([rr * Math.cos(ph), 0, rr * Math.sin(ph)]); } pin.push(A); tgt.push(B); }
    [[1.4, 0.42], [2.0, 0.72], [2.6, 1]].forEach(([t, k]) => { const A = [], B = []; for (let m = 0; m <= 24; m++) { const u = m / 24 * Math.PI * 2; A.push(pt(t, u)); B.push([TR * k * Math.cos(u), 0, TR * k * Math.sin(u)]); } pin.push(A); tgt.push(B); });
    { const yc = a * 1.62, rc = a * 0.33, A = [], B = []; for (let m = 0; m <= 20; m++) { const u = m / 20 * Math.PI * 2; A.push([Math.cos(u) * rc, yc + Math.sin(u) * rc, 0]); B.push([TR * 0.1 * Math.cos(u), 0, TR * 0.1 * Math.sin(u)]); } pin.push(A); tgt.push(B); }
    return { pin, tgt }; })();
  const MOTES = [...Array(9)].map(() => ({ o: Math.random(), x: Math.random() * 2 - 1, sp: 0.12 + Math.random() * 0.1, tw: Math.random() * 6 }));

  // ---------- layout ----------
  let CW = 0, CH = 0, S = 1, TXF = [1, 0, 0, 1, 0, 0], L = null, dirty = true;
  const applyT = c => c.setTransform(TXF[0], 0, 0, TXF[3], TXF[4], TXF[5]);
  function layout() {
    const r = el.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
    if (w === CW && h === CH && L) return;
    CW = cv.width = w; CH = cv.height = h;
    S = Math.min(w / BOX_W, h / BOX_H);
    TXF = [S, 0, 0, S, w / 2 - CX * S, h / 2 - CY0 * S];
    L = null; dirty = true;
  }

  // ---------- drawing helpers (on whichever context x is) ----------
  let x = main;
  const lin = (x0, y0, x1, y1, s) => { const g = x.createLinearGradient(x0, y0, x1, y1); s.forEach(q => g.addColorStop(q[0], q[1])); return g; };
  const ell = (X, Y, rx, ry) => { x.beginPath(); x.ellipse(X, Y, rx, ry, 0, 0, Math.PI * 2); };
  const blast = a => { const pat = x.createPattern(textures().blast, 'repeat'); try { pat.setTransform(new DOMMatrix().scale(1 / S)); } catch (e) {} x.save(); x.globalAlpha = a; x.fillStyle = pat; x.fill(); x.restore(); };
  function wallPath(X, yT, yB, rx) { x.beginPath(); x.ellipse(X, yB, rx, rx * K, 0, 0, Math.PI); x.lineTo(X - rx, yT); x.ellipse(X, yT, rx, rx * K, 0, Math.PI, 0, true); x.closePath(); }
  function wrap(tex, X, yT, yB, rx) { const TW = tex.width, TH = tex.height, cols = Math.ceil(rx * 2 * S), st = 1 / S;
    for (let k = 0; k < cols; k++) { const a = -rx + k * st, b = Math.min(rx, a + st), a1 = Math.acos(Math.max(-1, Math.min(1, -a / rx))), a2 = Math.acos(Math.max(-1, Math.min(1, -b / rx))), u = a1 / Math.PI * TW, du = Math.max(1, (a2 - a1) / Math.PI * TW), dy = rx * K * Math.sin((a1 + a2) / 2);
      x.drawImage(tex, u, 0, Math.min(du, TW - u), TH, X + a, yT + dy, st * 1.05, yB - yT); } }
  function shade(X, yT, yB, rx, k) { x.save(); wallPath(X, yT, yB, rx); x.clip(); x.fillStyle = lin(X - rx, 0, X + rx, 0, [[0, 'rgba(0,0,0,' + (0.85 * k) + ')'], [0.18, 'rgba(0,0,0,' + (0.25 * k) + ')'], [0.3, 'rgba(255,255,255,' + (0.16 * k) + ')'], [0.4, 'rgba(0,0,0,0)'], [0.72, 'rgba(0,0,0,' + (0.3 * k) + ')'], [1, 'rgba(0,0,0,' + (0.9 * k) + ')']]); x.fillRect(X - rx, yT - rx, rx * 2, yB - yT + rx * 2); x.restore(); }
  // one light pipe: a rounded slot cut into the collar's flat top, in true perspective
  function slot(c, i, grow, dy) { const a = Math.PI / 2 + i / NW * Math.PI * 2, Ln = RM * Math.PI * 2 / NW * WF + grow * 2, w = WW + grow * 2, rd = Math.min(w, Ln) / 2 * 0.55;
    c.save(); c.translate(cx, CYC + (dy || 0)); c.scale(1, K); c.rotate(a); c.translate(RM, 0);
    c.beginPath(); const X = -w / 2, Y = -Ln / 2; c.moveTo(X + rd, Y); c.arcTo(X + w, Y, X + w, Y + Ln, rd); c.arcTo(X + w, Y + Ln, X, Y + Ln, rd); c.arcTo(X, Y + Ln, X, Y, rd); c.arcTo(X, Y, X + w, Y, rd); c.closePath(); c.restore(); }

  function staticLayer() {
    ell(cx, base + 3.5, RC + 3, (RC + 3) * K); x.fillStyle = 'rgba(0,0,0,.5)'; x.fill();
    wallPath(cx, base - 2.5, base + 1, RC); x.fillStyle = lin(cx - RC, 0, cx + RC, 0, [[0, '#1c1e21'], [0.25, '#6c7178'], [0.38, '#a3a8ae'], [0.6, '#4b4f55'], [1, '#17181b']]); x.fill(); wallPath(cx, base - 2.5, base + 1, RC); blast(0.8);
    ell(cx, base - 2.5, RC, RC * K); x.fillStyle = lin(0, base - 2.5 - RC * K, 0, base - 2.5 + RC * K, [[0, '#45494f'], [0.5, '#2e3034'], [1, '#26282b']]); x.fill(); ell(cx, base - 2.5, RC, RC * K); blast(1);
    x.save(); ell(cx, base - 2.5, RC, RC * K); x.clip(); x.strokeStyle = lin(cx - RC, base - RC * K, cx + RC, base + RC * K, [[0, 'rgba(255,255,255,.55)'], [0.5, 'rgba(255,255,255,.08)'], [1, 'rgba(255,255,255,.25)']]); x.lineWidth = 1; ell(cx, base - 2.5, RC - 0.4, RC * K - 0.4); x.stroke(); x.restore();
    ell(cx, gy, RG + 1.4, (RG + 1.4) * K); x.fillStyle = lin(cx - RG, gy - RG * K, cx + RG, gy + RG * K, [[0, '#eef0f2'], [0.35, '#7d8289'], [0.6, '#c9cdd2'], [1, '#3d4045']]); x.fill();
    ell(cx, gy, RG, RG * K); x.fillStyle = '#030304'; x.fill();
    x.save(); ell(cx, gy, RG, RG * K); x.clip(); x.fillStyle = lin(0, gy - RG * K, 0, gy + RG * K, [[0, '#17181b'], [0.35, '#08090a'], [1, '#020203']]); x.fillRect(cx - RG, gy - RG * K, RG * 2, RG * K * 2);
    ell(cx, gy + 3, RG - 3, (RG - 3) * K); x.strokeStyle = 'rgba(200,60,20,.18)'; x.lineWidth = 1; x.stroke(); x.restore();
    for (let i = 0; i < NW; i++) { slot(x, i, 0.7); x.fillStyle = 'rgba(255,255,255,.16)'; x.fill(); slot(x, i, 0.7, -0.55); x.fillStyle = '#040405'; x.fill(); slot(x, i, 0); x.fillStyle = '#120d0a'; x.fill();
      x.save(); slot(x, i, 0); x.clip(); slot(x, i, 0.6, -1.1); x.fillStyle = 'rgba(0,0,0,.7)'; x.fill(); x.restore(); }
  }
  function glowLayer() { x.save(); ell(cx, gy, RG, RG * K); x.clip(); x.globalCompositeOperation = 'lighter'; x.shadowColor = 'rgba(255,90,30,1)'; x.shadowBlur = 6 * S; ell(cx, gy + 3, RG - 3, (RG - 3) * K); x.strokeStyle = 'rgba(255,150,70,.95)'; x.lineWidth = 2; x.stroke(); x.shadowBlur = 0;
    const gl = x.createRadialGradient(cx, gy + RG * K, 0, cx, gy + RG * K, RG); gl.addColorStop(0, 'rgba(255,110,40,.35)'); gl.addColorStop(1, 'rgba(255,80,20,0)'); x.fillStyle = gl; x.fillRect(cx - RG, gy - RG * K, RG * 2, RG * K * 2); x.restore(); }
  function pusherLayer() { const T = textures(), bT = base - BODYH, bB = base + RG * K + 5;
    wrap(T.knurl, cx, bT, bB, RB); shade(cx, bT, bB, RB, 1);
    x.save(); wallPath(cx, bT, bB, RB); x.clip(); x.fillStyle = lin(0, base - 1, 0, base + RG * K + 2, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.95)']]); x.fillRect(cx - RB, base - 1, RB * 2, 40); x.restore();
    const dB = bT - 0.3, dT = dB - DISCH;
    ell(cx + 1.5, dB + 1.2, RD, RD * K); x.fillStyle = 'rgba(0,0,0,.45)'; x.fill();
    wrap(T.side, cx, dT, dB, RD); shade(cx, dT, dB, RD, 0.85);
    x.save(); x.translate(cx, dT); x.scale(1, K); x.drawImage(T.face, -RD, -RD, RD * 2, RD * 2); x.restore(); }
  function make(fn) { const [c, g] = mk(CW, CH); x = g; g.imageSmoothingQuality = 'high'; applyT(g); fn(); x = main; return c; }
  function build() { L = { st: make(staticLayer), glow: make(glowLayer), push: make(pusherLayer) }; }

  // ---------- the hologram, per frame ----------
  let spin = 0, spinV = 0, upT = -1e9, t0 = 0, mRel = 0;
  function holo(m, trU, now, down) {
    const fy = base - BODYH - 0.3 - DISCH + trU, V = 0.854, tp = down ? now - t0 : -1, tu = down ? -1 : now - upT, BEAM = textures().beam;
    applyT(m); m.save(); m.beginPath(); m.rect(-4, -10, BOX_W + 8, BOX_H + 12); m.clip(); m.translate(cx, fy);
    const hov = 10 + (reduce ? 0 : Math.sin(now / 700) * 1.1), TH = 6;
    let morph = 0, collapse = 0, build = 1, spinA = (reduce ? 0 : now / 1500) + spin;
    if (down) { morph = EI(tp / 280); spinA += -morph * tp / 260; }
    else if (tu < 1200) { morph = mRel; collapse = E(tu / 170); build = EI((tu - 620) / 520); }
    const flick = 0.84 + 0.16 * Math.random(), glitch = (down && tp < 300) || (!down && tu < 500) ? (Math.random() < 0.35 ? (Math.random() - 0.5) * 2.2 : 0) : 0;
    const ca = Math.cos(spinA), sa = Math.sin(spinA);
    const pos = (li, vi) => { const P = HG.pin[li][vi], T = HG.tgt[li][vi]; let px = P[0], py = P[1] + hov, pz = P[2];
      if (down || tu < 170) { const mm = down ? morph : mRel, k = Math.min(1, Math.max(0, mm * 1.35 - (li % 10) * 0.035)), sh = down ? 1 + 0.06 * Math.sin(now / 90) : (1 - collapse);
        px += (T[0] * sh - px) * k; py += (TH - py) * k; pz += (T[2] * sh - pz) * k; }
      const X = px * ca + pz * sa, Z = -px * sa + pz * ca; return [X + glitch, -py * V + Z * K]; };
    m.globalCompositeOperation = 'lighter';
    const vis = (!down && tu >= 170 && tu < 1200) ? (build > 0 ? 1 : 0) : 1, scanning = !down && tu >= 170 && tu < 1200 && build > 0 && build < 1, al = flick * vis;
    const beamA = down ? 0.18 + 0.1 * morph : (tu < 300 ? 1 - tu / 300 : 0);
    const beamTop = -(TH + (hov - TH) * (1 - (down ? morph : 0))) * V, wTop = down ? 16 * morph + 6.5 * (1 - morph) : (build > 0 ? 7 : 16 * (1 - collapse) + 1), bI = Math.min(1, (0.92 + 0.08 * Math.sin(now / 83)) * al + beamA * 0.8);
    if (bI > 0) { m.globalAlpha = bI; m.drawImage(BEAM, -wTop, beamTop, wTop * 2, -beamTop + 0.5); m.globalAlpha = bI * 0.5; m.drawImage(BEAM, -wTop * 0.55, beamTop, wTop * 1.1, -beamTop + 0.5); m.globalAlpha = 1;
      const pg = m.createRadialGradient(0, beamTop, 0, 0, beamTop, wTop); pg.addColorStop(0, 'rgba(170,235,255,' + (0.35 * bI) + ')'); pg.addColorStop(1, 'rgba(120,215,255,0)'); m.fillStyle = pg; m.beginPath(); m.ellipse(0, beamTop, wTop, wTop * K, 0, 0, Math.PI * 2); m.fill();
      for (const q of MOTES) { const ph = ((now / 1000) * q.sp + q.o) % 1, yy = beamTop * ph, hw = (2.4 + (wTop - 2.4) * ph) * 0.8, a3 = Math.sin(Math.PI * ph) * (0.5 + 0.5 * Math.sin(now / 300 + q.tw)) * 0.7 * bI; m.fillStyle = 'rgba(220,250,255,' + a3.toFixed(3) + ')'; m.fillRect(q.x * hw - 0.3, yy - 0.3, 0.6, 0.6); } }
    if (!down && tu < 340) { const f = 1 - tu / 340; m.globalAlpha = f; m.drawImage(BEAM, -2.2, -46, 4.4, 46); m.drawImage(BEAM, -1.1, -46, 2.2, 46); m.globalAlpha = 1; }
    { const li = Math.min(1, 0.5 + beamA + (down ? 0.3 : 0)), sp = m.createRadialGradient(0, 0, 0, 0, 0, 11); sp.addColorStop(0, 'rgba(120,215,255,' + (0.22 * li) + ')'); sp.addColorStop(1, 'rgba(120,215,255,0)'); m.fillStyle = sp; m.beginPath(); m.ellipse(0, 0, 11, 11 * K, 0, 0, Math.PI * 2); m.fill();
      m.strokeStyle = 'rgba(170,235,255,' + (0.55 * li) + ')'; m.lineWidth = 0.35; m.beginPath(); m.ellipse(0, 0, 4.2, 4.2 * K, 0, 0, Math.PI * 2); m.stroke();
      const hc = m.createRadialGradient(0, 0, 0, 0, 0, 2.6); hc.addColorStop(0, 'rgba(255,255,255,' + li + ')'); hc.addColorStop(0.4, 'rgba(190,240,255,' + (0.8 * li) + ')'); hc.addColorStop(1, 'rgba(120,215,255,0)'); m.fillStyle = hc; m.beginPath(); m.ellipse(0, 0, 2.6, 2.6 * K, 0, 0, Math.PI * 2); m.fill(); }
    if (scanning) { m.save(); m.beginPath(); m.rect(-30, -(hov + build * 16) * V - 1, 60, 80); m.clip(); }
    m.lineJoin = 'round'; m.lineCap = 'round';
    if (al > 0) for (const pass of [[1.8, 'rgba(110,215,255,' + (0.16 * al) + ')'], [0.45, 'rgba(215,248,255,' + (0.78 * al) + ')']]) { m.lineWidth = pass[0]; m.strokeStyle = pass[1]; m.beginPath();
      for (let li = 0; li < HG.pin.length; li++) { const Ln = HG.pin[li]; for (let vi = 0; vi < Ln.length; vi++) { const q = pos(li, vi); vi ? m.lineTo(q[0], q[1]) : m.moveTo(q[0], q[1]); } } m.stroke(); }
    if (scanning) { m.restore(); const sy = -(hov + build * 16) * V; m.strokeStyle = 'rgba(225,250,255,.95)'; m.lineWidth = 0.7; m.beginPath(); m.ellipse(0, sy, 9, 9 * K, 0, 0, Math.PI * 2); m.stroke(); m.strokeStyle = 'rgba(140,225,255,.3)'; m.lineWidth = 2.2; m.stroke(); }
    if (down && morph > 0.6) { const lk = Math.min(1, (tp - 280) / 200); if (lk > 0) { m.strokeStyle = 'rgba(255,190,120,' + (0.8 * lk) + ')'; m.lineWidth = 0.6; const yT = -TH * V;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const ox = 16 - 2 * lk, oyy = (16 - 2 * lk) * K, l = 3.5; m.beginPath(); m.moveTo(sx * ox, yT + sy * (oyy - l * K)); m.lineTo(sx * ox, yT + sy * oyy); m.lineTo(sx * (ox - l), yT + sy * oyy); m.stroke(); } } }
    if (!down && tu > 170 && tu < 900) { const k = (tu - 170) / 730, a2 = Math.sin(Math.PI * k) * flick, n = (RX.store && RX.store.pois) ? RX.store.pois.length : 0;
      m.font = '700 6.5px ui-monospace,Menlo,monospace'; m.textAlign = 'center'; m.textBaseline = 'middle'; m.fillStyle = 'rgba(200,245,255,' + a2 + ')'; m.fillText(String(n).padStart(3, '0'), 0, -(TH + 4 + k * 10) * V);
      m.font = '600 3.2px ui-monospace,Menlo,monospace'; m.fillStyle = 'rgba(160,230,255,' + (a2 * 0.8) + ')'; m.fillText('MARKS', 0, -(TH + k * 10) * V); }
    m.fillStyle = 'rgba(0,0,0,.2)'; for (let y = -38; y < 2; y += 1.3) m.fillRect(-17, y, 34, 0.45);
    m.globalCompositeOperation = 'source-over'; m.restore(); m.setTransform(1, 0, 0, 1, 0, 0);
  }

  // ---------- compose ----------
  function sub(img, R, oy) { const sx = R[0], sy = R[1] - (oy || 0), sw = R[2], sh = R[3], c0 = Math.max(0, sy), ch = Math.min(img.height, sy + sh) - c0; if (ch <= 0 || sw <= 0) return; main.drawImage(img, sx, c0, sw, ch, sx, c0 + (oy || 0), sw, ch); }
  function holoBox() { const fy = base - BODYH - 0.3 - DISCH, x0 = cx - 31, x1 = cx + 31, y0 = fy - 58, y1 = fy + 16, t = TXF;
    const X0 = Math.max(0, Math.floor(t[0] * x0 + t[4])), Y0 = Math.max(0, Math.floor(t[3] * y0 + t[5])), X1 = Math.min(CW, Math.ceil(t[0] * x1 + t[4])), Y1 = Math.min(CH, Math.ceil(t[3] * y1 + t[5])); return [X0, Y0, X1 - X0, Y1 - Y0]; }
  function clipOpening(m) { applyT(m); m.beginPath(); m.rect(cx - RC - 6, -40, (RC + 6) * 2, gy + 40); m.ellipse(cx, gy, RG, RG * K, 0, 0, Math.PI); m.clip(); m.setTransform(1, 0, 0, 1, 0, 0); }
  function render(tr, lit, partial, down, armed, now) {
    const m = main, oy = Math.round(tr * S); m.setTransform(1, 0, 0, 1, 0, 0); m.globalAlpha = 1; m.globalCompositeOperation = 'source-over';
    const R = partial ? holoBox() : [0, 0, CW, CH]; if (R[2] <= 0 || R[3] <= 0) return;
    m.save(); m.beginPath(); m.rect(R[0], R[1], R[2], R[3]); m.clip(); m.clearRect(R[0], R[1], R[2], R[3]);
    sub(L.st, R);
    if (lit > 0.004) { m.globalAlpha = lit; sub(L.glow, R); m.globalAlpha = 1; }
    if (!(partial && tr < 0.01)) {   // at rest the disc hides every pipe inside the hologram box
      const since = down ? now - t0 : -1, idle = armed ? 0.4 + 0.3 * Math.sin(now / 220) : 0.13; applyT(m); m.globalCompositeOperation = 'lighter';
      for (let i = 0; i < NW; i++) { const order = Math.min(i, NW - i) / (NW / 2); let on = down ? Math.min(1, Math.max(0, (since - order * 170) / 60)) : lit; on = Math.max(idle, on);
        slot(m, i, -0.25); m.fillStyle = 'rgba(255,' + Math.round(90 + on * 60) + ',' + Math.round(30 + on * 30) + ',' + (on * 0.9).toFixed(3) + ')'; m.fill();
        if (on > 0.25) { slot(m, i, -WW * 0.22, 0.3); m.fillStyle = 'rgba(255,215,160,' + ((on - 0.25) * 0.8).toFixed(3) + ')'; m.fill(); } }
      m.globalCompositeOperation = 'source-over'; m.setTransform(1, 0, 0, 1, 0, 0); }
    m.save(); clipOpening(m); sub(L.push, R, oy); holo(m, oy / S, now, down); m.restore(); m.restore();
  }

  // ---------- loop ----------
  let p = 0, lit = 0, last = performance.now(), wasDown = false, wasArmed = false, running = false;
  const device = document.getElementById('device');
  function frame(now) {
    running = false; if (document.hidden) return;
    try {
      layout(); if (!L) build();
      const dt = Math.min(50, now - last); last = now;
      const down = el.classList.contains('down'), armed = !!(device && device.classList.contains('assign'));
      if (down && !wasDown) { t0 = now; }
      if (!down && wasDown) { mRel = EI((now - t0) / 280); upT = now; spinV = reduce ? 0 : 6; }
      wasDown = down;
      const tg = down ? 1 : 0, pp = p; p += (tg - p) * (1 - Math.exp(-dt / (down ? 24 : 48))); if (Math.abs(tg - p) < 0.002) p = tg;
      const pl = lit; lit = down ? Math.min(1, lit + dt / 70) : Math.max(0, lit - dt / 650);
      spin += spinV * dt / 1000; spinV *= Math.exp(-dt / 350);
      const full = dirty || p !== pp || lit !== pl || down || armed || armed !== wasArmed; wasArmed = armed; dirty = false;
      render(p * TRAVEL, lit, !full, down, armed, now);
    } catch (e) { console.warn('[markbtn]', e); }
    kick();
  }
  function kick() { if (!running && !document.hidden) { running = true; requestAnimationFrame(frame); } }
  document.addEventListener('visibilitychange', () => { dirty = true; last = performance.now(); kick(); });
  if (window.ResizeObserver) new ResizeObserver(() => { dirty = true; kick(); }).observe(el);
  RX.markbtn = { redraw() { dirty = true; kick(); } };
  kick();
})();
