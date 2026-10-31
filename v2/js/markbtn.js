// MARK, 2.48: the machined pusher seen from straight above, like the rest of the face. A titanium collar with 16 amber
// light pipes, a polished chamfer, and the Leica-red anodized disc with MARK cut in, standing proud of the collar.
// Press: the disc sinks (its shadow tucks in), the pipes light in a sweep from the bottom and the gap glows; release:
// the glow drains away. Armed (waiting for a kind): the pipes breathe. Heavy parts (collar, disc face) are drawn once;
// a frame only moves the disc and paints the light. The <button id="markKey"> keeps all the behaviour; main.js sets .down.
(function () {
  'use strict';
  const el = document.getElementById('markKey');
  if (!el || !window.CanvasRenderingContext2D) return;
  const cv = document.createElement('canvas'); cv.className = 'mk-cv'; cv.setAttribute('aria-hidden', 'true');
  const main = cv.getContext('2d'); if (!main) return;
  el.appendChild(cv); el.classList.add('mk-on');

  // proportions, as fractions of the collar's radius (same part as 2.46, measured off its drawing)
  // 2.48: collar slimmed a touch so the disc gets the room (2.46 was 0.75 / 0.78 / 0.69 / 0.89 / 0.093)
  const R_OPEN = 0.78, R_CHAM = 0.81, R_DISC = 0.72, R_PIPE = 0.905, PIPE_W = 0.08, PIPE_L = 0.19, NW = 16;
  // it may spill a few points past the slot's top and bottom into the clear deck, so it's bigger with the slot unchanged
  const BLEED = 7;
  // the canvas reaches PAD past the slot on every side, so the pocket cut round the collar has room to show
  const PAD = 12;
  Object.assign(cv.style, { left: -PAD + 'px', top: -PAD + 'px', right: 'auto', bottom: 'auto', width: 'calc(100% + ' + PAD * 2 + 'px)', height: 'calc(100% + ' + PAD * 2 + 'px)' });
  const R_POCKET = 1.065;   // 2.52: the collar sits in a shallow round pocket cut into the shell
  const FACE = { base: '#b3201a', paint: '#f3efe6' };
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function hex(c) { c = c.replace('#', ''); return [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16)); }
  function mix(a, b, t) { const A = hex(a), B = hex(b); return 'rgb(' + A.map((q, i) => Math.round(q + (B[i] - q) * t)).join(',') + ')'; }
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return [c, c.getContext('2d')]; }
  function noise(g, w, h, amp) { const im = g.getImageData(0, 0, w, h), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * amp; d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(im, 0, 0); }
  // polished metal seen from above: two bright lobes facing the light, two dark ones away from it
  function conic(g, a, R, peak, trough) { if (!g.createConicGradient) { g.fillStyle = peak; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill(); return; } const cg = g.createConicGradient(a, 0, 0); [[0, peak], [0.08, 'rgba(0,0,0,0)'], [0.25, trough], [0.42, 'rgba(0,0,0,0)'], [0.5, peak], [0.58, 'rgba(0,0,0,0)'], [0.75, trough], [0.92, 'rgba(0,0,0,0)'], [1, peak]].forEach(s => cg.addColorStop(s[0], s[1])); g.fillStyle = cg; g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill(); }

  // ---------- the disc face, drawn once (same recipe as 2.46, minus the projector lens; MARK centred and larger) ----------
  let FACE_TX = null;
  function faceTex() {
    if (FACE_TX) return FACE_TX;
    const F = 1200, R = F / 2, Rf = R - 26, [c, g] = mk(F, F); g.translate(R, R);
    g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fillStyle = '#c9cdd2'; g.fill(); conic(g, -2.3, R, 'rgba(255,255,255,.95)', 'rgba(40,44,50,.75)');
    for (let r = Rf; r < R; r += 1.3) { g.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'; g.lineWidth = 0.8; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }
    g.save(); g.beginPath(); g.arc(0, 0, Rf, 0, Math.PI * 2); g.clip(); g.fillStyle = FACE.base; g.fill();
    for (let r = 2; r < Rf; r += 1.25) { g.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,' + (0.02 + Math.random() * 0.05).toFixed(3) + ')' : 'rgba(0,0,0,' + (0.03 + Math.random() * 0.06).toFixed(3) + ')'; g.lineWidth = 0.7; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }
    conic(g, -2.3, Rf, 'rgba(255,235,225,.34)', 'rgba(0,0,0,.28)');
    const rg = g.createRadialGradient(0, 0, 0, 0, 0, Rf); rg.addColorStop(0, 'rgba(0,0,0,.16)'); rg.addColorStop(0.75, 'rgba(0,0,0,0)'); rg.addColorStop(1, 'rgba(255,255,255,.08)'); g.fillStyle = rg; g.fillRect(-Rf, -Rf, Rf * 2, Rf * 2);
    g.restore(); g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, Rf, 0, Math.PI * 2); g.stroke();
    // MARK, cut into the anodizing and paint-filled: shadowed top walls, lit bottom walls, worn paint
    { const fs = Rf * 0.3, font = '700 ' + fs + 'px "Helvetica Neue",Helvetica,Arial,sans-serif', gap = fs * 0.22, word = 'MARK'; g.font = font;
      const ws = [...word].map(ch => g.measureText(ch).width), tot = ws.reduce((a, b) => a + b, 0) + gap * 3;
      const letters = (gg, dx, dy, col) => { gg.font = font; gg.textBaseline = 'middle'; gg.textAlign = 'left'; gg.fillStyle = col; let xx = -tot / 2 + dx; for (let i = 0; i < 4; i++) { gg.fillText(word[i], xx, dy + fs * 0.04); xx += ws[i] + gap; } };
      const [Lc, lg] = mk(F, F); lg.translate(R, R); letters(lg, 0, 0, mix(FACE.base, '#ffffff', 0.55)); lg.globalCompositeOperation = 'source-atop'; letters(lg, 0, -6, FACE.paint);
      lg.globalAlpha = 0.25; lg.fillStyle = '#000'; for (let i = 0; i < 600; i++) lg.fillRect((Math.random() - 0.5) * tot, (Math.random() - 0.5) * fs, 2 + Math.random() * 4, 1); lg.globalAlpha = 1;
      const [S2, sg] = mk(F, F); sg.translate(R, R); letters(sg, 0, 0, 'rgba(10,4,3,.92)'); sg.globalCompositeOperation = 'destination-out'; letters(sg, 0, 8, '#000');
      lg.setTransform(1, 0, 0, 1, 0, 0); lg.globalCompositeOperation = 'source-atop'; lg.drawImage(S2, 0, 0);
      g.save(); g.shadowColor = 'rgba(255,255,255,.3)'; g.shadowOffsetY = 3; letters(g, 0, 0, 'rgba(0,0,0,.6)'); g.restore();
      g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(Lc, 0, 0); g.restore(); }
    return (FACE_TX = c);
  }

  // ---------- layout ----------
  // measured only when the key changes size (a ResizeObserver says so), never per frame: reading layout every frame
  // forced the page to lay itself out every frame
  // The baked parts (collar, light, disc) live on their own square, sized by the button alone, so when the slot's width
  // shifts (the jog's labels change length on a press) the button is only re-placed, not rebuilt.
  let CW = 0, CH = 0, R = 1, cx = 0, cy = 0, SQ = 1, L = null, dirty = true, measure = true;
  function layout() {
    if (!measure && L) return;
    measure = false;
    const r = el.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round((r.width + PAD * 2) * dpr)), h = Math.max(1, Math.round((r.height + PAD * 2) * dpr));
    if (w === CW && h === CH && L) return;
    CW = cv.width = w; CH = cv.height = h; cx = w / 2; cy = h / 2; dirty = true;
    const nr = Math.min(r.width / 2 * 0.97, (r.height / 2 + BLEED) * 0.97) * dpr;   // the button's size: same as before the pocket
    if (L && Math.abs(nr - R) < 0.01) return;
    R = nr; SQ = Math.ceil(R * 2.5); L = null;
  }
  // bake with the square's centre standing in for the canvas centre
  function baked(fn) { const sx = cx, sy = cy; cx = cy = SQ / 2; try { return fn(); } finally { cx = sx; cy = sy; } }


  // a light pipe: a rounded slot on the collar, radial thickness PIPE_W, running around the ring for PIPE_L
  function slot(c, i, grow, dx, dy) {
    const a = Math.PI / 2 + i / NW * Math.PI * 2, w = PIPE_W * R + grow * 2, Ln = PIPE_L * R + grow * 2, rd = Math.min(w, Ln) / 2 * 0.55;
    c.save(); c.translate(cx + (dx || 0), cy + (dy || 0)); c.rotate(a); c.translate(R_PIPE * R, 0);
    c.beginPath(); const X = -w / 2, Y = -Ln / 2; c.moveTo(X + rd, Y); c.arcTo(X + w, Y, X + w, Y + Ln, rd); c.arcTo(X + w, Y + Ln, X, Y + Ln, rd); c.arcTo(X, Y + Ln, X, Y, rd); c.arcTo(X, Y, X + w, Y, rd); c.closePath(); c.restore();
  }
  const circ = (c, r) => { c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); };

  // ---------- the collar: drawn once ----------
  function collarLayer() {
    const [c, g] = mk(SQ, SQ), u = R / 48, RP = R * R_POCKET;
    // the pocket: a shallow round seat cut into the shell. Its floor sits in shade; the wall nearest the light throws a
    // shadow across the top-left of the floor; the far wall (bottom-right) catches the light; a fine edge breaks the rim.
    // All in black and white over the shell, so it reads the same on teal and on black titanium.
    circ(g, RP); g.fillStyle = 'rgba(0,0,0,.26)'; g.fill();
    g.save(); circ(g, RP); g.clip();
    g.shadowColor = 'rgba(0,0,0,.75)'; g.shadowBlur = R * 0.06; g.shadowOffsetX = R * 0.025; g.shadowOffsetY = R * 0.04;
    g.beginPath(); g.rect(cx - SQ, cy - SQ, SQ * 2, SQ * 2); g.arc(cx, cy, RP, 0, Math.PI * 2, true); g.fillStyle = '#000'; g.fill();
    g.restore();
    g.lineWidth = Math.max(1, u * 0.9);
    g.beginPath(); g.arc(cx, cy, RP - u * 0.45, -0.15 * Math.PI, 0.85 * Math.PI); g.strokeStyle = 'rgba(255,255,255,.16)'; g.stroke();   // lit far wall
    g.lineWidth = Math.max(1, u * 0.6);
    g.beginPath(); g.arc(cx, cy, RP + u * 0.3, 0.85 * Math.PI, 1.85 * Math.PI); g.strokeStyle = 'rgba(255,255,255,.10)'; g.stroke();   // the rim's edge break, top-left
    g.beginPath(); g.arc(cx, cy, RP + u * 0.3, -0.15 * Math.PI, 0.85 * Math.PI); g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke();
    // the collar's shadow on the deck, light from the top left
    g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = R * 0.1; g.shadowOffsetX = R * 0.03; g.shadowOffsetY = R * 0.05; circ(g, R); g.fillStyle = '#26282b'; g.fill(); g.restore();
    // bead-blasted titanium top
    circ(g, R); const tg = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R); tg.addColorStop(0, '#50545a'); tg.addColorStop(0.5, '#34373b'); tg.addColorStop(1, '#222427'); g.fillStyle = tg; g.fill();
    { const [n, ng] = mk(256, 256), im = ng.createImageData(256, 256), d = im.data; for (let i = 0; i < d.length; i += 4) { const r = Math.random(), q = r < 0.04 ? 255 : r < 0.08 ? 0 : 128 + (Math.random() - 0.5) * 90; d[i] = d[i + 1] = d[i + 2] = q; d[i + 3] = r < 0.08 ? 40 : 22; } ng.putImageData(im, 0, 0);
      g.save(); circ(g, R); g.clip(); g.fillStyle = g.createPattern(n, 'repeat'); g.globalAlpha = 0.9; g.fillRect(0, 0, SQ, SQ); g.restore(); }
    // outer edge break: bright where it faces the light, dark away from it
    g.save(); g.translate(cx, cy); g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.arc(0, 0, R - u * 1.6, 0, Math.PI * 2, true); g.clip(); conic(g, -2.3, R, 'rgba(255,255,255,.55)', 'rgba(0,0,0,.6)'); g.restore();
    circ(g, R); g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = Math.max(1, u * 0.5); g.stroke();
    // the 16 light-pipe slots, cut into the top: far lip catches light, near wall in shadow
    for (let i = 0; i < NW; i++) {
      slot(g, i, u * 0.5, u * 0.45, u * 0.6); g.fillStyle = 'rgba(255,255,255,.16)'; g.fill();
      slot(g, i, u * 0.5, -u * 0.35, -u * 0.45); g.fillStyle = 'rgba(0,0,0,.55)'; g.fill();
      slot(g, i, 0); g.fillStyle = '#120d0a'; g.fill();
      g.save(); slot(g, i, 0); g.clip(); g.beginPath(); g.rect(0, 0, SQ, SQ); slot(g, i, u * 0.1, u * 1.1, u * 1.5); g.fillStyle = 'rgba(0,0,0,.75)'; g.fill('evenodd'); g.restore();
    }
    // polished chamfer into the opening
    g.save(); g.translate(cx, cy); g.beginPath(); g.arc(0, 0, R_CHAM * R, 0, Math.PI * 2); g.fillStyle = '#9aa0a7'; g.fill(); conic(g, -2.3 + Math.PI, R_CHAM * R, 'rgba(255,255,255,.95)', 'rgba(30,32,36,.85)'); g.restore();
    circ(g, R_CHAM * R); g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = Math.max(1, u * 0.4); g.stroke();
    // the opening: dark, deeper toward the far wall
    circ(g, R_OPEN * R); g.fillStyle = '#030304'; g.fill();
    const og = g.createRadialGradient(cx - R * 0.1, cy - R * 0.12, R * 0.4, cx, cy, R_OPEN * R); og.addColorStop(0, '#111215'); og.addColorStop(1, '#020203'); circ(g, R_OPEN * R); g.fillStyle = og; g.fill();
    circ(g, R_OPEN * R - u * 1.2); g.strokeStyle = 'rgba(200,60,20,.16)'; g.lineWidth = Math.max(1, u * 0.6); g.stroke();
    return c;
  }

  // ---------- frame ----------
  // ---------- light, baked once per size ----------
  // A lit pipe used to be filled with a live shadow blur, 16 times a frame. Now one pipe's light is baked: its fill in the
  // base amber, the extra warmth a full-on pipe adds, and its halo, each drawn at the strength the old code produced
  // (fill at on, warmth at on², halo at on²), so a pipe looks the same at every brightness for a fraction of the work.
  function lightLayers() {
    const u = R / 48, gw = PIPE_W * R - u * 0.5, gl = PIPE_L * R - u * 0.5, pad = Math.ceil(R * 0.16), SW = Math.ceil(gw + pad * 2), SH = Math.ceil(gl + pad * 2);
    const pipe = (g, w, l) => { const rd = Math.min(w, l) / 2 * 0.55, X = SW / 2 - w / 2, Y = SH / 2 - l / 2; g.beginPath(); g.moveTo(X + rd, Y); g.arcTo(X + w, Y, X + w, Y + l, rd); g.arcTo(X + w, Y + l, X, Y + l, rd); g.arcTo(X, Y + l, X, Y, rd); g.arcTo(X, Y, X + w, Y, rd); g.closePath(); };
    const [fill, fg] = mk(SW, SH); pipe(fg, gw, gl); fg.fillStyle = 'rgba(255,90,30,.9)'; fg.fill();
    const [warm, wg] = mk(SW, SH); pipe(wg, gw, gl); wg.fillStyle = 'rgba(0,60,30,.9)'; wg.fill();
    const [halo, hg] = mk(SW, SH); hg.shadowColor = 'rgba(255,90,30,.9)'; hg.shadowBlur = R * 0.07; hg.shadowOffsetX = SW * 4; hg.translate(-SW * 4, 0); pipe(hg, gw, gl); hg.fillStyle = 'rgba(0,0,0,.9)'; hg.fill();   // a shadow is as strong as the shape casting it (.9 × .9)
    const [gap, gg] = mk(SQ, SQ); gg.globalCompositeOperation = 'lighter';
    gg.save(); circ(gg, R_OPEN * R); gg.clip();
    gg.shadowColor = 'rgba(255,90,30,1)'; gg.shadowBlur = R * 0.12; circ(gg, R_OPEN * R - u * 1.8); gg.strokeStyle = 'rgba(255,150,70,.95)'; gg.lineWidth = u * 2; gg.stroke(); gg.shadowBlur = 0;
    const gl2 = gg.createRadialGradient(cx, cy, R * 0.55, cx, cy, R_OPEN * R); gl2.addColorStop(0, 'rgba(255,110,40,0)'); gl2.addColorStop(1, 'rgba(255,90,30,.45)'); gg.fillStyle = gl2; circ(gg, R_OPEN * R); gg.fill(); gg.restore();
    // the same light for all 16 pipes at once, for the frames where they all match (resting, armed, held, fading)
    const ring = (src) => { const [c, g] = mk(SQ, SQ); g.globalCompositeOperation = 'lighter'; for (let i = 0; i < NW; i++) { const a = Math.PI / 2 + i / NW * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a); g.setTransform(ca, sa, -sa, ca, cx + ca * R_PIPE * R, cy + sa * R_PIPE * R); g.drawImage(src, -SW / 2, -SH / 2); } return c; };
    const [core, cg] = mk(SQ, SQ); for (let i = 0; i < NW; i++) { slot(cg, i, -PIPE_W * R * 0.22); cg.fillStyle = 'rgb(255,215,160)'; cg.fill(); }
    return { fill, warm, halo, gap, SW, SH, rings: { fill: ring(fill), warm: ring(warm), halo: ring(halo), core } };
  }
  // the disc and its shadow only change while it travels: kept until p moves
  let discC = null, discP = -1;
  function discLayer(p) {
    if (discC && discP === p) return discC;
    if (!discC || discC.width !== SQ) discC = mk(SQ, SQ)[0];
    return baked(() => discDraw(p));
  }
  function discDraw(p) {
    const m = discC.getContext('2d'); m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, SQ, SQ);
    const k = 1 - p * 0.03, rd = R_DISC * R * k, sh = 1 - p * 0.85;
    m.save(); circ(m, R_OPEN * R); m.clip();
    m.shadowColor = 'rgba(0,0,0,' + (0.75 * sh + 0.2).toFixed(3) + ')'; m.shadowBlur = R * (0.03 + 0.06 * sh); m.shadowOffsetX = R * 0.035 * sh; m.shadowOffsetY = R * 0.055 * sh;
    m.beginPath(); m.arc(cx, cy, rd, 0, Math.PI * 2); m.fillStyle = '#5a0e0a'; m.fill(); m.restore();
    m.drawImage(faceTex(), cx - rd, cy - rd, rd * 2, rd * 2);
    if (p > 0.01) { m.beginPath(); m.arc(cx, cy, rd, 0, Math.PI * 2); m.fillStyle = 'rgba(0,0,0,' + (p * 0.12).toFixed(3) + ')'; m.fill(); }   // a touch less light reaches it down in the collar
    discP = p; return discC;
  }

  // ---------- frame ----------
  function render(p, lit, down, armed, now, since) {
    const m = main, u = R / 48, G = L.light;
    m.setTransform(1, 0, 0, 1, 0, 0); m.globalAlpha = 1; m.globalCompositeOperation = 'source-over';
    m.clearRect(0, 0, CW, CH);
    const ox = cx - SQ / 2, oy = cy - SQ / 2;
    m.drawImage(L.collar, ox, oy);
    // light pipes: a sweep from the bottom on press, breathing while armed, a faint idle glow otherwise
    // 2.52: the pipes rest at a steady warm 35% (lit, like the AUX keys); armed, they breathe from there up to full
    const idle = armed ? 0.675 + 0.325 * Math.sin(now / 220) : 0.35;
    m.globalCompositeOperation = 'lighter';
    if (!down || since >= 170 + 60) {   // every pipe at the same brightness: four whole-ring layers instead of 64 pipe draws
      const on = Math.max(idle, down ? 1 : lit), Rg = G.rings;
      m.globalAlpha = on * on; m.drawImage(Rg.halo, ox, oy); m.drawImage(Rg.warm, ox, oy);
      m.globalAlpha = on; m.drawImage(Rg.fill, ox, oy);
      if (on > 0.25) { m.globalAlpha = (on - 0.25) * 0.8; m.drawImage(Rg.core, ox, oy); }
      m.globalAlpha = 1;
    } else for (let i = 0; i < NW; i++) {
      const order = Math.min(i, NW - i) / (NW / 2);
      let on = down ? Math.min(1, Math.max(0, (since - order * 170) / 60)) : lit; on = Math.max(idle, on);
      const a = Math.PI / 2 + i / NW * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      m.setTransform(ca, sa, -sa, ca, cx + ca * R_PIPE * R, cy + sa * R_PIPE * R);
      m.globalAlpha = on * on; m.drawImage(G.halo, -G.SW / 2, -G.SH / 2); m.drawImage(G.warm, -G.SW / 2, -G.SH / 2);
      m.globalAlpha = on; m.drawImage(G.fill, -G.SW / 2, -G.SH / 2);
      m.globalAlpha = 1; m.setTransform(1, 0, 0, 1, 0, 0);
      if (on > 0.25) { slot(m, i, -PIPE_W * R * 0.22); m.fillStyle = 'rgba(255,215,160,' + ((on - 0.25) * 0.8).toFixed(3) + ')'; m.fill(); }
    }
    // the gap round the disc glows when lit
    if (lit > 0.004) { m.globalAlpha = lit; m.drawImage(G.gap, ox, oy); m.globalAlpha = 1; }
    m.globalCompositeOperation = 'source-over';
    // the disc: proud at rest (shadow thrown down-right), flush when pressed (shadow tucks under, it sits a hair smaller)
    m.drawImage(discLayer(p), ox, oy);
  }

  // ---------- loop: runs only while something moves; a press, arming or a resize wakes it ----------
  let p = 0, lit = 0, t0 = 0, last = performance.now(), wasDown = false, wasArmed = false, running = false, pose = null;
  const device = document.getElementById('device');
  function frame(now) {
    running = false; if (document.hidden) return;
    let more = false;
    try {
      layout(); if (!L) { L = baked(() => ({ collar: collarLayer(), light: lightLayers() })); discC = null; discP = -1; }
      const dt = Math.min(50, now - last); last = now;
      let down = el.classList.contains('down'), armed = !!(device && device.classList.contains('assign'));
      if (pose) { down = !!pose.down; armed = !!pose.armed; }
      if (down && !wasDown) t0 = now;
      wasDown = down;
      const tg = down ? 1 : 0, pp = p, pl = lit;
      p += (tg - p) * (1 - Math.exp(-dt / (down ? 24 : 48))); if (Math.abs(tg - p) < 0.002) p = tg;
      lit = down ? Math.min(1, lit + dt / 70) : Math.max(0, lit - dt / 650);
      if (pose && pose.settle) { p = tg; lit = down ? 1 : 0; t0 = now - 2000; }
      // held down and fully lit (the sweep is done), nothing changes: no need to redraw
      const sweeping = down && now - t0 < 170 + 60 + 20;
      const need = dirty || p !== pp || lit !== pl || sweeping || armed || armed !== wasArmed; wasArmed = armed; dirty = false;
      if (need) render(p, lit, down, armed, now, now - t0);
      more = down || armed || p !== tg || lit > 0;
    } catch (e) { console.warn('[markbtn]', e); }
    if (more) kick(); else last = 0;
  }
  function kick() { if (!running && !document.hidden) { running = true; if (!last) last = performance.now(); requestAnimationFrame(frame); } }
  const wake = () => { dirty = true; kick(); };
  document.addEventListener('visibilitychange', () => { measure = true; dirty = true; last = performance.now(); kick(); });
  if (window.ResizeObserver) new ResizeObserver(() => { measure = true; wake(); }).observe(el);
  // a press (main.js sets .down) or arming (#device.assign) wakes the loop
  if (window.MutationObserver) { const mo = new MutationObserver(wake); mo.observe(el, { attributes: true, attributeFilter: ['class'] }); if (device) mo.observe(device, { attributes: true, attributeFilter: ['class'] }); }
  RX.markbtn = { redraw: wake, pose(o) { pose = o || null; wake(); } };
  kick();
})();
