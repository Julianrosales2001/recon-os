/* =============================================================
   RECON.OS RX-90 · GRILLE
   A strip of radio-blue lamps sits behind the three speaker slots
   on the top plate. You only ever see the light where it leaks
   through the slots; the plate itself never changes.
   SPECTRUM · every sound the RP makes (yours included) runs through
              one bus that the grille listens to. Mirrored: bass in
              the middle, treble out toward the screws. The three
              slots are levels; the top one runs red on peaks. Peak
              dots hang, drop and bounce. Loud hits bleed light onto
              the metal around the slots.
   EVENTS   · GPS lock streaks across; a mark ripples out from the
              middle; a fast reaching a new stage fills in from both
              ends; boot sweeps it up; MUTE drains it dark.
   RETURN   · on the way back to the car it pulses like a detector:
              faster, wider and higher the closer you get; at the car
              it holds lit and breathes.
   Silent and dark the rest of the time — nothing runs idle.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const G = RX.grille = {};
  const S = RX.store, Geo = RX.geo;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TH = [0.62, 0.36, 0.12];              // what lights the top, middle and bottom slot
  const STAGE_H = [12, 18, 24, 48, 72];       // the HLTH stage hours; past 72, every day
  const FAR_M = 400;                          // RETURN: past this the detector idles at its slowest
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let A = null, host = null, cv = null, cx = null;
  let W = 0, H = 0, slots = [], NC = 0, half = 0, NB = 0, cw = 0, x0 = 0, PAD = 6;
  let an = null, fd = null, raf = 0, until = 0, ev = null;
  let lv = null, pk = null, vel = null, hold = null;
  const det = { next: 0, pulse: -1e9 };

  // ---------- hardware ----------
  function build() {
    host = document.querySelector('#device .grille');
    if (!host || cv) return;
    cv = document.createElement('canvas');
    cv.className = 'grille-lamps'; cv.setAttribute('aria-hidden', 'true');
    host.appendChild(cv); cx = cv.getContext('2d');
    if (window.ResizeObserver) new ResizeObserver(() => { W = 0; G.kick(); }).observe(host);
  }
  function layout() {
    W = 0;
    if (!host || !cv) return;
    const r = host.getBoundingClientRect();
    if (r.width < 40 || r.height < 4) return;       // hidden (short screens) or not laid out yet
    const vs = [...host.querySelectorAll('.vents i')].map(i => i.getBoundingClientRect());
    if (vs.length !== 3) return;
    W = r.width; H = r.height + PAD * 2;
    const d = window.devicePixelRatio || 1;
    cv.width = Math.round(W * d); cv.height = Math.round(H * d); cx.setTransform(d, 0, 0, d, 0, 0);
    slots = vs.map(b => ({ x: b.left - r.left, y: b.top - r.top + PAD, w: b.width, h: b.height }));
    x0 = slots[0].x;
    NB = clamp(Math.floor(slots[0].w / 18), 6, 18);  // a band is 2 lamps + a gap, ~3px each, both sides
    half = NB * 3; NC = half * 2; cw = slots[0].w / NC;
    lv = new Float32Array(NB); pk = new Float32Array(NB); vel = new Float32Array(NB); hold = new Float32Array(NB);
  }

  // ---------- hooks ----------
  // sfx.js hands over its output bus the moment it makes its audio context
  G.attach = function (ac, bus) {
    try { an = ac.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = 0.5; bus.connect(an); fd = new Uint8Array(an.frequencyBinCount); } catch (e) { an = null; }
  };
  // every sound that plays: listen for a while; some moments also have a light of their own
  const SIG = { 'gps.lock': 'gps', mark: 'mark', boot: 'boot', 'fast.stage': 'fast' };
  G.heard = function (slot) {
    until = performance.now() + 1800;
    if (SIG[slot]) G.event(SIG[slot]); else G.kick();
  };
  G.event = function (k) { ev = { k, t0: performance.now() }; G.kick(); };
  G.kick = function () { if (!raf && !reduced && cv) raf = requestAnimationFrame(frame); };
  G.wire = function (a) {
    A = a; build();
    setInterval(() => { if (detector()) G.kick(); }, 1000);
    setInterval(fastCheck, 30000); setTimeout(fastCheck, 8000);
  };

  // ---------- RETURN: distance to the car ----------
  function detector() {
    if (!A || !A.stack || !A.stack.length || A.top().name !== 'ret') return null;
    const p = S.v2.park, g = A.gps;
    if (!p || !g || Date.now() - g.ts > 60000) return null;
    const m = Geo.meters(g.lat, g.lng, p.lat, p.lng);
    return { m, arrived: m <= clamp(g.acc || 15, 15, 40), close: 1 - clamp(m / FAR_M, 0, 1) };
  }

  // ---------- a fast reaching a new stage ----------
  const SEEN = 'recon.os.fastStageSeen';
  function fastCheck() {
    if (!A || !A.booted || !S.activeFast) return;
    const f = S.activeFast(); if (!f) return;
    const h = (Date.now() - f.startTs) / 3600000;
    let at = 0; STAGE_H.forEach(s => { if (h >= s) at = s; });
    if (h >= 96) at = 72 + Math.floor((h - 72) / 24) * 24;
    let seen = null; try { seen = JSON.parse(localStorage.getItem(SEEN) || 'null'); } catch (e) {}
    const save = v => { try { localStorage.setItem(SEEN, JSON.stringify({ id: f.id, h: v })); } catch (e) {} };
    if (!seen || seen.id !== f.id) { save(at); return; }   // a fast that was already running: start counting from here
    if (at > seen.h) { save(at); A.say('FAST ▸ ' + at + 'H · NEW STAGE · HLTH › STAGES', 5000); A.beep('fast.stage'); }
  }

  // ---------- light shows ----------
  function evCell(now, c, ri) {
    if (!ev) return null;
    const e = now - ev.t0, dc = Math.abs((c + 0.5) / NC - 0.5) * 2, xc = (c + 0.5) / NC;
    switch (ev.k) {
      case 'gps': {                                   // a comet left to right, then one flash
        if (e > 1050) return end();
        if (e < 700) { const p = e / 700 * 1.1, t = xc <= p ? Math.exp(-(p - xc) / 0.1) : 0; return { v: ri === 1 ? t : t * 0.35 }; }
        return { v: 1 - (e - 700) / 350 };
      }
      case 'mark': {                                  // two rings out from the middle
        if (e > 1100) return end();
        let v = 0;
        [0, 220].forEach(d0 => { const r = (e - d0) / 650; if (r > 0 && r < 1.2) v = Math.max(v, Math.exp(-Math.pow((dc - r) / 0.07, 2)) * (1 - r * 0.7)); });
        return { v: clamp(v * (ri === 1 ? 1 : 0.7), 0, 1) };
      }
      case 'fast': {                                  // fills from both ends, the top sparkles red, fades
        if (e > 1700) return end();
        const delay = [240, 120, 0][ri];
        if (e < 700) return { v: (1 - dc) < (e - delay) / 450 ? 0.85 : 0 };
        if (e < 1150) return ri === 0 ? { v: Math.random() < 0.5 ? 1 : 0.35, red: true } : { v: 0.85 };
        const f = 1 - (e - 1150) / 550; return { v: f * 0.85, red: ri === 0 };
      }
      case 'boot': {                                  // sweeps up from the middle, flashes, settles
        if (e < 850) { const p = e / 850, rp = [0.85, 0.55, 0.25][ri]; return { v: dc < p * 1.05 && p > rp * 0.6 ? 1 : 0, red: ri === 0 && p > 0.8 }; }
        if (e < 1150) return { v: 1, red: ri === 0 };
        if (e < 1800) { const p = 1 - (e - 1150) / 650; return { v: dc < p ? 0.8 * p + 0.2 : 0 }; }
        return end();
      }
      case 'mute': { if (e > 650) return end(); const p = 1 - e / 650; return { v: dc < p ? p : 0 }; }
      case 'unmute': { if (e > 700) return end(); const p = Math.min(1, e / 300), f = e > 300 ? 1 - (e - 300) / 400 : 1; return { v: ri === 1 && dc < p ? f : 0 }; }
    }
    return end();
  }
  function end() { ev = null; return null; }
  function detCell(now, d, c, ri) {
    const dc = Math.abs((c + 0.5) / NC - 0.5) * 2;
    if (d.arrived) return { v: 0.65 + 0.35 * Math.sin(now / 260), red: ri === 0 };
    const f = Math.exp(-(now - det.pulse) / 170), w = 0.22 + 0.78 * d.close;
    if (dc >= w) return { v: 0 };
    const rows = d.close > 0.66 ? 3 : d.close > 0.33 ? 2 : 1;
    if (2 - ri >= rows) return { v: 0 };
    return { v: f * (0.5 + 0.5 * (1 - dc / w)), red: ri === 0 };
  }

  // ---------- the spectrum ----------
  function listen(now) {
    const on = an && fd && now < until && S.v2.sound;
    if (on) an.getByteFrequencyData(fd);
    let any = false;
    for (let b = 0; b < NB; b++) {
      let v = 0;
      if (on) {
        const lo = Math.floor(Math.pow(96, b / NB)), hi = Math.max(lo + 1, Math.floor(Math.pow(96, (b + 1) / NB)));
        let m = 0; for (let k = lo; k < hi && k < fd.length; k++) m = Math.max(m, fd[k]);
        v = Math.pow(m / 255, 1.5);
      }
      lv[b] += (v - lv[b]) * (v > lv[b] ? 0.6 : 0.16);
      const l = lv[b];
      if (l >= pk[b]) { pk[b] = l; vel[b] = 0; hold[b] = now; }
      else if (now - hold[b] > 320) {
        vel[b] += 0.0028; pk[b] -= vel[b];
        if (pk[b] < l) { pk[b] = l; vel[b] = vel[b] > 0.02 ? -vel[b] * 0.42 : 0; }   // the bounce
      }
      if (pk[b] < 0) pk[b] = 0;
      if (lv[b] > 0.01 || pk[b] > 0.01) any = true;
    }
    return any || on;
  }
  const rowOf = p => p > TH[0] ? 0 : p > TH[1] ? 1 : p > TH[2] ? 2 : -1;
  const blue = v => 'rgba(' + Math.round(40 + 90 * v) + ',' + Math.round(150 + 70 * v) + ',255,' + (0.25 + 0.75 * v).toFixed(3) + ')';
  const red = v => 'rgba(255,' + Math.round(50 + 40 * v) + ',' + Math.round(45 + 30 * v) + ',' + (0.3 + 0.7 * v).toFixed(3) + ')';

  function frame(now) {
    raf = 0;
    if (!W) layout();
    if (!W) return;
    const busy = listen(now);
    const d = detector();
    if (d && !d.arrived && now >= det.next) { det.pulse = now; det.next = now + 150 + 1850 * (1 - d.close); if (A) A.beep('detect'); }
    cx.clearRect(0, 0, W, H);
    const cells = [[], [], []], colMax = new Float32Array(NC), colL = new Float32Array(NC);
    for (let ri = 0; ri < 3; ri++) for (let c = 0; c < NC; c++) {
      const dd = c < half ? half - 1 - c : c - half, b = Math.floor(dd / 3), gap = dd % 3 === 2;
      let k = { v: 0 };
      if (!gap) {
        const e = evCell(now, c, ri), p = d ? detCell(now, d, c, ri) : null;
        let o = e && p ? (e.v >= p.v ? e : p) : (e || p);
        if (!o) {
          const l = lv[b]; let v = l > TH[ri] ? 0.6 + 0.4 * Math.min(1, (l - TH[ri]) * 3) : 0, r = ri === 0 && v > 0;
          if (v === 0 && pk[b] > 0.13 && rowOf(pk[b]) === ri) { v = 0.9; r = ri === 0; }
          o = { v, red: r }; colL[c] = l;
        } else colL[c] = o.v > 0.8 ? 0.8 + (o.v - 0.8) * 0.5 : 0;
        k = o;
      }
      cells[ri][c] = k; colMax[c] = Math.max(colMax[c], k.v || 0);
    }
    // light bleed: only the loud ones spill onto the metal around the slots
    const top = slots[0].y - 5, bot = slots[2].y + slots[2].h + 5;
    for (let c = 0; c < NC; c++) {
      const l = colL[c]; if (l <= 0.6) continue;
      const a = (l - 0.6) * 0.5;
      cx.fillStyle = l > 0.75 && cells[0][c].red ? 'rgba(255,70,60,' + (a * 0.6).toFixed(3) + ')' : 'rgba(60,160,255,' + a.toFixed(3) + ')';
      cx.fillRect(x0 + c * cw - 1, top, cw + 2, bot - top);
    }
    for (let ri = 0; ri < 3; ri++) {
      const s = slots[ri];
      for (let c = 0; c < NC; c++) {
        const k = cells[ri][c]; if (!(k.v > 0.02)) continue;
        cx.fillStyle = k.red ? red(k.v) : blue(k.v);
        cx.fillRect(x0 + c * cw, s.y, cw + 0.35, s.h);
      }
    }
    if (busy || ev || d) G.kick(); else cx.clearRect(0, 0, W, H);
  }
})();
