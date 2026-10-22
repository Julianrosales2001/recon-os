/* =============================================================
   RECON.OS RX-90 · MAUS
   The mascot on PROFILE: the 1928 mouse (public domain since
   2024), drawn straight into the dot matrix as a puppet. 1928
   traits only: pie-cut eyes, bare black hands (no gloves), the
   two-button shorts, big shoes, a thin tail.
   On a phosphor screen the white of the cartoon (face, shoes,
   buttons) is lit; the black of it (head, ears, body, shorts,
   hands) is a dark fill with a bright edge; the rubber-hose
   limbs and the tail are single lit strokes.
   Units: he stands in a 100-tall box, feet at the bottom.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const HOT = '#E9FFF7', INK = '#7DFFD6', AMB = '#FFB547', CYN = '#5CC8FF';

  // ---------------------------------------------------------------- rasterising
  function capsule(mx, x0, y0, x1, y1, r, c, a) {
    const minx = Math.floor(Math.min(x0, x1) - r - 1), maxx = Math.ceil(Math.max(x0, x1) + r + 1), miny = Math.floor(Math.min(y0, y1) - r - 1), maxy = Math.ceil(Math.max(y0, y1) + r + 1);
    const dx = x1 - x0, dy = y1 - y0, L = dx * dx + dy * dy || 1e-9, rr = r * r;
    for (let y = miny; y <= maxy; y++) for (let x = minx; x <= maxx; x++) {
      const px = x + 0.5, py = y + 0.5, t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / L)), ex = x0 + dx * t - px, ey = y0 + dy * t - py;
      if (ex * ex + ey * ey <= rr) mx.set(x, y, c, a);
    }
  }
  function ellipse(mx, cx, cy, rx, ry, c, a) {
    for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y++) for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x++) {
      const u = (x + 0.5 - cx) / rx, v = (y + 0.5 - cy) / ry; if (u * u + v * v <= 1) mx.set(x, y, c, a);
    }
  }
  function poly(mx, pts, c, a) {
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) {
      let ins = false; const px = x + 0.5, py = y + 0.5;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) ins = !ins;
      }
      if (ins) mx.set(x, y, c, a);
    }
  }
  // grow a polygon outward by d (for the edge pass)
  function grow(pts, d) {
    const cx = pts.reduce((m, p) => m + p[0], 0) / pts.length, cy = pts.reduce((m, p) => m + p[1], 0) / pts.length;
    return pts.map(([x, y]) => { const vx = x - cx, vy = y - cy, l = Math.hypot(vx, vy) || 1; return [x + vx / l * d, y + vy / l * d]; });
  }
  const line = (mx, x0, y0, x1, y1, c, a) => mx.line(Math.round(x0), Math.round(y0), Math.round(x1), Math.round(y1), c, a);
  const off = (mx, x, y) => mx.off(Math.round(x), Math.round(y));

  // ---------------------------------------------------------------- build: w = how wide, b = how thick
  const BUILDS = {
    LEAN: { b: 0.85, w: 0.76 }, FIT: { b: 1.0, w: 0.92 }, AVERAGE: { b: 1.0, w: 1.0 }, SOLID: { b: 1.1, w: 1.22 }, HEAVY: { b: 1.2, w: 1.5 }
  };
  // from BMI, smoothly (no steps between builds)
  const BMI_W = [[18, 0.76], [21, 0.92], [24.5, 1.0], [29, 1.22], [34, 1.5]], BMI_B = [[18, 0.85], [21, 1.0], [24.5, 1.0], [29, 1.1], [34, 1.2]];
  const lerpT = (T, v) => { if (v <= T[0][0]) return T[0][1]; for (let i = 1; i < T.length; i++) if (v <= T[i][0]) { const f = (v - T[i - 1][0]) / (T[i][0] - T[i - 1][0]); return T[i - 1][1] + (T[i][1] - T[i - 1][1]) * f; } return T[T.length - 1][1]; };
  function buildFor(bmi) {
    if (bmi == null) return { w: 1, b: 1, name: 'AVERAGE' };
    const name = bmi < 19.5 ? 'LEAN' : bmi < 23 ? 'FIT' : bmi < 27 ? 'AVERAGE' : bmi < 31.5 ? 'SOLID' : 'HEAVY';
    return { w: lerpT(BMI_W, bmi), b: lerpT(BMI_B, bmi), name };
  }

  // ---------------------------------------------------------------- poses
  const P0 = { head: [0, 22], tilt: 0, lean: 0, drop: 0,
    la: [[-12, 48], [-13, 58]], ra: [[12, 48], [13, 58]], ll: [[-5, 75], [-6, 89]], rl: [[5, 75], [6, 89]], face: 'neutral', behind: false };
  const POSES = {
    STEADY:   {},
    SHARP:    { head: [0, 21], la: [[-18, 45], [-10, 52]], ra: [[18, 45], [10, 52]], ll: [[-8, 75], [-11, 89]], rl: [[8, 75], [11, 89]], face: 'smile' },
    SLIPPING: { head: [2, 25], tilt: 8, drop: 2, lean: 1.5, la: [[-11, 53], [-10, 65]], ra: [[12, 53], [11, 65]], ll: [[-3, 76], [-6, 89]], rl: [[4, 76], [6, 89]], face: 'tired', fx: ['sweat'] },
    FOCUSED:  { head: [0, 21.5], ra: [[17, 34], [8, 15]], face: 'focused', fx: ['scan'] },
    FUMES:    { head: [-1, 23], tilt: -8, la: [[-13, 46], [-2, 49]], ra: [[13, 50], [16, 63]], ll: [[-2, 76], [-8, 89]], rl: [[3, 76], [9, 89]], face: 'dizzy', fx: ['growl'] },
    EATING:   { ra: [[15, 42], [6, 31]], la: [[-14, 47], [-7, 52]], face: 'eating', fx: ['drumstick'] },
    NEW_PR:   { head: [0, 21], la: [[-15, 31], [-20, 19]], ra: [[15, 31], [20, 19]], ll: [[-8, 75], [-11, 89]], rl: [[8, 75], [11, 89]], face: 'grin', fx: ['stars'] },
    ON_MOVE:  { la: [[-14, 46], [-10, 50]], ra: [[14, 46], [10, 50]], ll: [[-7, 74], [-12, 88]], rl: [[6, 73], [10, 86]], face: 'smile', fx: ['map'] },
    RESTING:  { head: [0, 22.5], tilt: 5, la: [[-18, 24], [-9, 17]], ra: [[18, 24], [9, 17]], ll: [[-3, 75], [3, 89]], rl: [[3, 75], [-3, 89]], face: 'calm', fx: ['zz'], behind: true }
  };

  // ---------------------------------------------------------------- him
  // o: { t: ms (breathing, blinking, effects), poke: 0..1 (a hop when tapped), build: name | {w, b} }
  function draw(mx, cx, top, H, pose, o) {
    o = o || {};
    const P = Object.assign({}, P0, POSES[pose] || {}), s = H / 100, t = o.t || 0;
    const Bd = typeof o.build === 'string' ? BUILDS[o.build] : (o.build || BUILDS.AVERAGE);
    const poke = o.poke > 0 && o.poke < 1 ? o.poke : 0;
    // two-frame breathing: the top half rises a touch; a tap makes him hop and grin
    const br = (!poke && Math.floor(t / 1100) % 2) ? -0.9 : 0, hop = poke ? -Math.sin(Math.PI * poke) * 6 : 0;
    const face = poke ? 'grin' : P.face;
    const X = u => cx + u * s, Yb = v => top + (v + hop) * s, Y = v => top + (v + hop + br) * s;   // Yb: legs (no breathing)
    const LINE = HOT, DARK = INK, LIT = HOT, LA = 0.85, DA = 0.26;
    const d = Math.max(1, s);
    const union = shapes => { shapes.forEach(f => f(true)); shapes.forEach(f => f(false)); };
    const E = (c, rx, ry) => edge => edge ? ellipse(mx, X(c[0]), Y(c[1]), rx * s + d, ry * s + d, LINE, 1) : ellipse(mx, X(c[0]), Y(c[1]), rx * s, ry * s, DARK, DA);
    const Pl = pts => edge => { const q = pts.map(p => [X(p[0]), Y(p[1])]); edge ? poly(mx, grow(q, d), LINE, 1) : poly(mx, q, DARK, DA); };
    const Cp = (p0, p1, r) => edge => edge ? capsule(mx, X(p0[0]), Y(p0[1]), X(p1[0]), Y(p1[1]), r * s + d, LINE, 1) : capsule(mx, X(p0[0]), Y(p0[1]), X(p1[0]), Y(p1[1]), r * s, DARK, DA);
    const ellW = (c, rx, ry, a, yf) => { const yy = (yf || Y)(c[1]); ellipse(mx, X(c[0]), yy, rx * s + d, ry * s + d, LINE, 1); ellipse(mx, X(c[0]), yy, rx * s, ry * s, LIT, a || LA); };
    const hoseW = Math.max(0.7, 0.9 * s);
    const hose = (p0, p1, yf0, yf1) => capsule(mx, X(p0[0]), (yf0 || Y)(p0[1]), X(p1[0]), (yf1 || Y)(p1[1]), hoseW, LINE, 0.85);
    const b = Bd.b, w = Bd.w, dr = P.drop, ln = P.lean;
    const shL = [-7 * w + ln, 41 + dr], shR = [7 * w + ln, 41 + dr];
    const hand = h => union([E(h, 2.5 * b, 2.3 * b)]);
    const wide = (a, k) => a.map(p => [p[0] + Math.sign(p[0] || 1) * (w - 1) * k, p[1]]);
    const arm = (a0, sp) => { const a = wide(a0, 8); hose(sp, a[0]); hose(a[0], a[1]); hand(a[1]); };
    // the tail: a thin whip behind him
    const tail = [[6 * w, 57], [14, 61], [20, 58], [22, 51], [26, 48]];
    for (let i = 1; i < tail.length; i++) hose(tail[i - 1], tail[i]);
    if (P.behind) { arm(P.la, shL); arm(P.ra, shR); }
    // legs: hose down to the big shoes (the feet stay planted while he breathes)
    const leg = (l0, hip) => { const l = wide(l0, 3.5); hose(hip, l[0], Y, Yb); hose(l[0], l[1], Yb, Yb); ellW([l[1][0] + (l[1][0] < 0 ? -2.6 : 2.6), l[1][1] + 3.2], 6.2 * Math.max(1, b * 0.95), 3.4, 0.7, Yb); };
    leg(P.ll, [-3.8 * w, 60]); leg(P.rl, [3.8 * w, 60]);
    // body: neck, a pear of a chest and the shorts as one black shape; a dim waistband; two white buttons
    union([Cp([P.head[0] * 0.5 + ln, 31 + dr], [ln * 0.8, 39 + dr], 2.2), E([ln * 0.6, 47 + dr * 0.5 + (w - 1) * 1.5], 8.4 * w, 10.2 * Math.sqrt(w)),
      Pl([[-9.4 * w, 51], [9.4 * w, 51], [10.4 * w, 58], [8.2 * w, 62], [1.2, 61], [-1.2, 61], [-8.2 * w, 62], [-10.4 * w, 58]])]);
    line(mx, X(-8.6 * w), Y(51.4), X(8.6 * w), Y(51.4), LINE, 0.6);
    line(mx, X(0), Y(55), X(0), Y(61), LINE, 0.3);
    [[-3.4 * w, 54.6], [3.4 * w, 54.6]].forEach(c => ellW(c, 1.5, 1.7, 0.9));
    if (!P.behind) { arm(P.la, shL); arm(P.ra, shR); }
    // head: ears and skull as one black shape, then the white face mask (two eye lobes and the muzzle)
    const hd = [P.head[0] + ln, P.head[1] + dr], th = P.tilt * Math.PI / 180;
    const R = (x, y) => [hd[0] + x * Math.cos(th) - y * Math.sin(th), hd[1] + x * Math.sin(th) + y * Math.cos(th)];
    union([E(R(-12.6, -10.2), 7.4, 7.4), E(R(12.6, -10.2), 7.4, 7.4), E(hd, 12.4, 11.6)]);
    const mask = [[R(-4.3, -0.4), 4.5, 6.4], [R(4.3, -0.4), 4.5, 6.4], [R(0, 5.4), 10.4, 6.2]];
    mask.forEach(([c, rx, ry]) => ellipse(mx, X(c[0]), Y(c[1]), rx * s + d, ry * s + d, LINE, 1));
    mask.forEach(([c, rx, ry]) => ellipse(mx, X(c[0]), Y(c[1]), rx * s, ry * s, LIT, LA));
    // the black nose bulb on the end of the snout
    const nz = R(0, 4.5); ellipse(mx, X(nz[0]), Y(nz[1]), 3.2 * s, 2.1 * s, DARK, 0.3);
    // a blink every few seconds (pie eyes only)
    const blink = !poke && (t % 4700) < 150;
    faceOf(mx, X, Y, R, face, s, blink);
    if (P.behind) { hand(wide(P.la, 8)[1]); hand(wide(P.ra, 8)[1]); }
    if (!poke) (P.fx || []).forEach(f => effect(mx, X, Y, hd, f, s, P, t));
  }

  // pie-cut eyes: black ovals with a wedge out of the top corner; on this screen black is "off"
  function faceOf(mx, X, Y, R, kind, s, blink) {
    const eyeOval = (cx, cy, rx, ry, wedge) => {
      const c = R(cx, cy), ex = X(c[0]), ey = Y(c[1]);
      for (let yy = Math.floor(ey - ry * s - 1); yy <= Math.ceil(ey + ry * s + 1); yy++) for (let xx = Math.floor(ex - rx * s - 1); xx <= Math.ceil(ex + rx * s + 1); xx++) {
        const u = (xx + 0.5 - ex) / (rx * s), v = (yy + 0.5 - ey) / (ry * s);
        if (u * u + v * v > 1) continue;
        if (wedge && v < 0.1 && u * wedge > -0.1) { const a = Math.atan2(-v, u * wedge); if (a > 0.35 && a < 1.25) continue; }   // the pie cut
        mx.off(xx, yy);
      }
    };
    const at = (x, y) => { const c = R(x, y); return [X(c[0]), Y(c[1])]; };
    const arc = (pts, th) => { for (let k = 0; k < (th || 1); k++) for (let i = 1; i < pts.length; i++) { const a = at(...pts[i - 1]), b = at(...pts[i]); mx.line(Math.round(a[0]), Math.round(a[1]) + k, Math.round(b[0]), Math.round(b[1]) + k, '#000000', 0); } };
    const ex = 4.1, ey = -1.9, th = s > 0.9 ? 2 : 1;
    const shut = () => { arc([[-ex - 2, ey + 0.8], [-ex + 2, ey + 0.8]], th); arc([[ex - 2, ey + 0.8], [ex + 2, ey + 0.8]], th); };
    const grinMouth = () => {   // an open "D" under the nose, a lit tongue in it
      const c = at(0, 6.6), rx = 6.4 * s, ry = 5.2 * s;
      for (let yy = Math.floor(c[1]); yy <= Math.ceil(c[1] + ry); yy++) for (let xx = Math.floor(c[0] - rx); xx <= Math.ceil(c[0] + rx); xx++) {
        const u = (xx + 0.5 - c[0]) / rx, v = (yy + 0.5 - c[1]) / ry; if (v >= 0 && u * u + v * v <= 1) mx.off(xx, yy);
      }
      const tg = at(0, 10.2); ellipse(mx, tg[0], tg[1], 2.8 * s, 1.4 * s, HOT, 0.55);
    };
    if (kind === 'tired') { if (blink) shut(); else { eyeOval(-ex, ey + 1.6, 1.9, 2.0, 0); eyeOval(ex, ey + 1.6, 1.9, 2.0, 0); } arc([[-3.6, 9.4], [0, 8.2], [3.6, 9.4]]); return; }
    if (kind === 'focused') { if (blink) shut(); else { eyeOval(-ex, ey + 0.6, 1.8, 2.4, -1); eyeOval(ex, ey + 0.6, 1.8, 2.4, 1); } arc([[-3, 8.6], [3, 8.6]]); arc([[-6, -6.6], [-2.4, -5.2]]); arc([[6, -6.6], [2.4, -5.2]]); return; }
    if (kind === 'dizzy') { [-ex, ex].forEach(x => { const c = at(x, ey); mx.ring(Math.round(c[0]), Math.round(c[1]), Math.max(1.6, 2.2 * s), '#000000', 0); mx.off(Math.round(c[0]), Math.round(c[1])); }); arc([[-4, 9], [-2, 8], [0, 9], [2, 8], [4, 9]]); return; }
    if (kind === 'calm' || kind === 'eating' || kind === 'grin') {
      arc([[-ex - 2.2, ey + 1], [-ex, ey - 0.8], [-ex + 2.2, ey + 1]], th); arc([[ex - 2.2, ey + 1], [ex, ey - 0.8], [ex + 2.2, ey + 1]], th);
      if (kind === 'calm') arc([[-3, 8.4], [0, 9.4], [3, 8.4]]);
      else if (kind === 'grin') grinMouth();
      else { const c = at(0.6, 9); ellipse(mx, c[0], c[1], 2.4 * s, 2 * s, '#000000', 0); }
      return;
    }
    if (blink) shut(); else { eyeOval(-ex, ey, 2.2, 3.7, -1); eyeOval(ex, ey, 2.2, 3.7, 1); }
    if (kind === 'smile') arc([[-6.4, 6.6], [-4, 9], [0, 10], [4, 9], [6.4, 6.6]]);
    else arc([[-4.6, 7.8], [-2, 9], [2, 9], [4.6, 7.8]]);
  }

  // what's going on around him (moves a little, frame by frame)
  function effect(mx, X, Y, hd, f, s, P, t) {
    const at = (x, y) => [Math.round(X(x)), Math.round(Y(y))];
    const ph = Math.floor(t / 400);
    const spark = (x, y, r, on) => { const [a, b] = at(x, y), R = Math.max(1, Math.round(r * s * (on ? 1 : 0.6))); for (let i = -R; i <= R; i++) { mx.set(a + i, b, AMB, on ? 1 : 0.55); mx.set(a, b + i, AMB, on ? 1 : 0.55); } };
    if (f === 'stars') { spark(-27, 14, 3, ph % 2); spark(28, 16, 2.5, (ph + 1) % 2); spark(-22, 0, 2, (ph + 1) % 2); spark(24, 2, 2.2, ph % 2); }
    if (f === 'sweat') { const k = ph % 4, [a, b] = at(hd[0] + 14, hd[1] - 1 + k * 1.2); ellipse(mx, a, b + 1.5 * s, 1.3 * s, 1.8 * s, CYN, k === 3 ? 0.5 : 1); mx.set(a, Math.round(b - 0.5 * s), CYN, 1); }
    if (f === 'zz') { const k = Math.floor(t / 700) % 3, [a, b] = at(hd[0] + 18, hd[1] - 16 - k * 1.5); mx.text('Z', a, b, { c: AMB, face: 'mini', a: 1 }); if (k > 0) mx.text('Z', a + 5, b - 6, { c: AMB, face: 'mini', a: 0.7 }); }
    if (f === 'growl') { if (ph % 3 !== 2) [[-13, 47], [-14, 50], [-13, 53]].forEach(([x, y]) => { const [a, b] = at(x, y); mx.set(a, b, AMB, 1); mx.set(a - 1, b + 1, AMB, 1); mx.set(a - 2, b, AMB, 1); }); }
    if (f === 'scan') { const [a, b] = at(hd[0] + 15, hd[1] - 5), k = ph % 4; for (let i = 0; i < 4; i++) mx.set(a + i * 2, b + (i % 2), AMB, i === k ? 1 : 0.3); }
    if (f === 'drumstick') { const h = P.ra[1], bob = ph % 2 ? 0.8 : 0; capsule(mx, X(h[0] + 1), Y(h[1] + 1 + bob), X(h[0] + 5), Y(h[1] + 5 + bob), 0.8 * s, HOT, 1); ellipse(mx, X(h[0] - 1.5), Y(h[1] - 1.8 + bob), 3 * s, 2.3 * s, AMB, 1); }
    if (f === 'map') {
      const q = [[-13, 43], [13, 43], [13, 55], [-13, 55]].map(([x, y]) => [X(x), Y(y)]);
      poly(mx, grow(q, 1), AMB, 1); poly(mx, q, AMB, 0.3);
      [-4.3, 4.3].forEach(x => line(mx, X(x), Y(43), X(x), Y(55), AMB, 0.8));
      line(mx, X(-10), Y(52), X(-5), Y(46), AMB, 1); line(mx, X(-5), Y(46), X(2), Y(50), AMB, 1); line(mx, X(2), Y(50), X(9), Y(45), AMB, 1);
      const k = ph % 3, p = [[-10, 52], [-5, 46], [2, 50]][k]; mx.rect(Math.round(X(p[0])) - 1, Math.round(Y(p[1])) - 1, 3, 3, HOT, 1);
    }
  }

  // where things are on him, in his units (for callouts: x half-widths and y)
  const ANCHOR = { neck: 35, chest: 44, arm: 49, waist: 52, hips: 58, thigh: 67, push: 44, pull: 44, core: 56, cardio: 56, legs: 78 };

  RX.maus = { draw, POSES, BUILDS, buildFor, ANCHOR, capsule, ellipse };
})();
