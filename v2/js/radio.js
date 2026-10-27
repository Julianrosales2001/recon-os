/* =============================================================
   RECON.OS RX-90 · RADIO
   FN › RADIO. Not a dot-matrix screen: a high-resolution amber CRT
   module that plugs into the window (Blade Runner, not Game Boy).
   Four FM stations stream public-domain recordings (data/radio.json,
   plus anything dropped into radio/<STATION>/, see radio/README.txt).
   Each station is "always on air": it plays its list on a loop from
   a fixed start time, so tuning in joins mid-piece.
     DRUM   · tunes 0.1 MHz a click; static fades out as you close in
              and is gone the moment the carrier locks
     PUSH   · scans to the next station
     MARK   · saves the piece playing to your favourites (again: removes)
     MENU   · leaves the radio; it keeps playing (ON AIR on the LCD)
     RADIO  · pressed again on the radio: switches it off
     MUTE   · silences it like everything else
   Everything it plays goes through the sound bus, so the grille dances.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const S = RX.store;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const R = RX.radio = { on: false, ready: false, stations: [] };
  const FAV_KEY = 'recon.os.radioFavs';
  const AMB = [255, 179, 71], CY = '#7FE6FF';
  const STYLE = {   // each station draws its own landscape
    BAROQUE: { col: [255, 179, 71], amp: 62, sm: 0, rate: 55, rows: 32 },
    ROMANTIC: { col: [255, 200, 110], amp: 84, sm: 2, rate: 75, rows: 26, flow: 1 },
    NOCTURNE: { col: [127, 230, 255], amp: 58, sm: 4, rate: 130, rows: 22 },
    SYMPHONY: { col: [255, 118, 74], amp: 120, sm: 1, rate: 65, rows: 26 }
  };
  const FALLBACK = { col: AMB, amp: 70, sm: 1, rate: 70, rows: 26 };
  let A = null, epoch = Date.UTC(2026, 9, 1);
  let freq = 92.7, shown = 92.7;
  let favs = []; try { favs = JSON.parse(localStorage.getItem(FAV_KEY) || '[]') || []; } catch (e) {}

  // ======================================================================
  // THE LINEUP
  // ======================================================================
  R.load = async function () {
    try {
      const d = await (await fetch('data/radio.json', { cache: 'no-cache' })).json();
      epoch = d.epoch || epoch;
      R.stations = d.stations.map(s => ({ id: s.id, f: s.f, tracks: s.tracks.slice() }));
      // yours, from the drop folders: "Composer - Piece.mp3"
      try {
        const ix = await (await fetch('radio/index.json', { cache: 'no-cache' })).json();
        Object.keys(ix.stations || {}).forEach(id => {
          const st = R.stations.find(s => s.id === id); if (!st) return;
          ix.stations[id].forEach(f => {
            if (!f.len) return;
            const base = decodeURIComponent(f.file.split('/').pop()).replace(/\.[^.]+$/, ''), cut = base.indexOf(' - ');
            st.tracks.push({ c: cut > 0 ? base.slice(0, cut) : '', d: '', w: cut > 0 ? base.slice(cut + 3) : base, y: '', m: '', p: 'Your file', src: f.file.split('/').map(encodeURIComponent).join('/'), len: f.len });
          });
        });
      } catch (e) {}
      R.ready = true;
    } catch (e) { R.ready = false; }
  };
  const near = f => { let best = null, d = 9; R.stations.forEach(s => { const k = Math.abs(f - s.f); if (k < d) { d = k; best = s; } }); return { st: best, d, lvl: best ? Math.max(0, 1 - d / 0.6) : 0, lock: d < 0.05 }; };
  // what a station is playing right now, and how far in
  function onAir(st, at) {
    const tot = st.tracks.reduce((a, t) => a + t.len, 0); if (!tot) return null;
    let t = (((at || Date.now()) - epoch) / 1000 + st.f * 977) % tot; if (t < 0) t += tot;
    for (let i = 0; i < st.tracks.length; i++) { const tr = st.tracks[i]; if (t < tr.len) return { tr, i, at: t }; t -= tr.len; }
    return { tr: st.tracks[0], i: 0, at: 0 };
  }
  R.now = () => { const n = near(freq); return n.st && n.lvl > 0.15 ? onAir(n.st) : null; };

  // ======================================================================
  // SOUND: two players (one plays, one waits), static, all into the sound bus
  // ======================================================================
  let ac = null, out, music, noise, an, fd = new Uint8Array(128), td = new Uint8Array(256);
  const P = [], cur = { el: null, st: null, src: null, err: 0 };
  function graph() {
    if (ac) return true;
    try { ac = RX.sfx.ctx(); } catch (e) { return false; }
    if (!ac || !RX.sfx.bus) return false;
    out = ac.createGain(); out.gain.value = 0;
    an = ac.createAnalyser(); an.fftSize = 256; an.smoothingTimeConstant = 0.75;
    out.connect(an); an.connect(RX.sfx.bus);
    music = ac.createGain(); music.gain.value = 0; music.connect(out);
    // static: soft hiss with its harsh top taken off
    const len = ac.sampleRate * 2, b = ac.createBuffer(1, len, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const n = ac.createBufferSource(); n.buffer = b; n.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3500;
    noise = ac.createGain(); noise.gain.value = 0; n.connect(lp); lp.connect(noise); noise.connect(out); n.start();
    for (let k = 0; k < 2; k++) {
      const el = new Audio(); el.crossOrigin = 'anonymous'; el.preload = 'auto'; el.setAttribute('playsinline', '');
      const g = ac.createGain(); g.gain.value = 0; ac.createMediaElementSource(el).connect(g); g.connect(music);
      el.addEventListener('ended', () => { if (el === cur.el) tuneIn(true); });
      el.addEventListener('error', () => { if (el === cur.el) { cur.err = Date.now(); cur.src = null; } });
      P.push({ el, g });
    }
    return true;
  }
  const pOf = el => P.find(p => p.el === el);
  // start the station at the right spot on its clock; a new piece swaps to the other player
  function tuneIn(next) {
    const n = near(freq); if (!n.st || !R.on) return;
    const now = onAir(n.st, Date.now() + (next ? 400 : 0)); if (!now) return;
    if (!next && cur.st === n.st && cur.src === now.tr.src && cur.el && !cur.el.paused) return;
    const old = cur.el, nxt = P.find(p => p.el !== old) || P[0];
    cur.el = nxt.el; cur.st = n.st; cur.src = now.tr.src; cur.err = 0;
    const el = nxt.el, seek = now.at;
    el.src = now.tr.src;
    // play straight away (on an iPhone this has to happen inside the tap that turned the radio on);
    // jump to the right spot on the station's clock as soon as the length is known
    const go = () => { try { if (seek > 1 && isFinite(el.duration)) el.currentTime = Math.min(seek, el.duration - 1); } catch (e) {} };
    el.addEventListener('loadedmetadata', go, { once: true });
    el.play().catch(() => { cur.err = Date.now(); cur.src = null; });
    if (old) { const po = pOf(old); po.g.gain.setTargetAtTime(0, ac.currentTime, 0.08); setTimeout(() => { if (cur.el !== old) old.pause(); }, 400); }
    nxt.g.gain.setTargetAtTime(1, ac.currentTime + 0.05, 0.1);
  }
  // every frame: static vs music by how close you are; pause the stream when you're nowhere near a station
  function mixer() {
    if (!ac) return;
    const n = near(freq), audible = R.on && S.v2.sound;
    out.gain.setTargetAtTime(audible ? 0.9 : 0, ac.currentTime, 0.05);
    noise.gain.setTargetAtTime(R.on && !n.lock ? Math.pow(1 - n.lvl, 0.8) * 0.05 : 0, ac.currentTime, n.lock ? 0.02 : 0.05);
    music.gain.setTargetAtTime(n.lock ? 1 : n.lvl * 0.75, ac.currentTime, 0.05);
    if (!R.on) { P.forEach(p => { if (!p.el.paused) p.el.pause(); }); cur.el = null; cur.src = null; return; }
    if (n.lvl > 0 && n.st) {
      const want = onAir(n.st);
      if (want && (cur.st !== n.st || !cur.el || (cur.el.paused && !cur.el.ended && Date.now() - cur.err > 5000))) tuneIn(false);
    } else if (cur.el && !cur.el.paused) { cur.el.pause(); cur.st = null; cur.src = null; }
    if (audible && n.lvl > 0) { try { if (RX.grille) RX.grille.heard('radio'); } catch (e) {} }
  }
  // the first tap unlocks both players: iOS only lets a player start by itself once it has played from a tap
  // a tenth of a second of silence, made here, so the unlock doesn't wait on the network or the lineup
  let hush = null;
  function silence() {
    if (hush) return hush;
    const n = 4410, b = new ArrayBuffer(44 + n * 2), v = new DataView(b), w = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 44100, true); v.setUint32(28, 88200, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    return (hush = URL.createObjectURL(new Blob([b], { type: 'audio/wav' })));
  }
  function unlock() {
    P.forEach(p => {
      if (p.ok) return; p.ok = true;
      if (p.el === cur.el && cur.src) return;   // already started from this tap
      p.el.src = silence(); p.el.play().then(() => { if (p.el !== cur.el || !cur.src) p.el.pause(); }).catch(() => { p.ok = false; });
    });
  }
  R.power = function (on) {
    if (on) {
      if (!graph()) return; R.on = true;
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}   // music: plays through the ringer switch, like any music app
      if (ac.state !== 'running') ac.resume();
      tuneIn(false); unlock();
    } else {
      // off means off: stop, and let go of the stream so nothing keeps downloading
      R.on = false; clearInterval(R.scanT); mixer();
      P.forEach(p => { try { p.el.pause(); p.el.removeAttribute('src'); p.el.load(); } catch (e) {} });
      cur.el = null; cur.st = null; cur.src = null;
      try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) {}
    }
  };
  R.tune = function (d) { freq = Math.round(clamp(freq + d, 87.5, 108) * 10) / 10; S.saveV2({ radioFreq: freq }); if (A) A.lcdDirty = true; };
  R.scan = function () {
    clearInterval(R.scanT); const start = freq;
    R.scanT = setInterval(() => { if (freq >= 108) freq = 87.4; R.tune(0.1); if (A) A.beep('jog'); const n = near(freq); if ((n.lock && Math.abs(freq - start) > 0.05) || !R.on) clearInterval(R.scanT); }, 40);
  };
  R.lcdOnAir = () => R.on && A && A.top().name !== 'radio' && A.lcdRadio;
  R.lcd = function () {
    const n = near(freq), np = R.now();
    if (!n.lvl || !np) return { rows: [['FM', freq.toFixed(1) + ' ' + (R.on ? 'SEEK' : 'OFF')], ['', R.ready ? 'NO STATION' : 'NO LINEUP'], ['', '']], tag: 'FM' };
    const tr = np.tr;
    return { rows: [['FM', freq.toFixed(1) + ' ' + n.st.id], ['', (tr.c || 'ON AIR').toUpperCase()], ['', (tr.m && tr.m.length < 22 ? tr.m : tr.w).toUpperCase()]], tag: R.lcdOnAir() ? 'AIR' : 'FM' };
  };
  const favKey = tr => tr.src;
  function toggleFav() {
    const np = R.now(), n = near(freq);
    if (!np || !n.lock) { toast('NOTHING TO SAVE · TUNE IN FIRST'); if (A) A.beep('err'); return; }
    const k = favKey(np.tr), i = favs.findIndex(f => f.k === k);
    if (i >= 0) { favs.splice(i, 1); toast('REMOVED FROM FAVOURITES'); if (A) A.beep('key'); }
    else { favs.push({ k, c: np.tr.c, w: np.tr.w, m: np.tr.m, st: n.st.id, ts: Date.now() }); toast('★ SAVED · FAV ' + String(favs.length).padStart(2, '0')); if (A) A.beep('file'); }
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favs)); } catch (e) {}
  }
  R.favs = () => favs.slice();

  // ======================================================================
  // THE CRT MODULE
  // ======================================================================
  let cv = null, cx = null, oc = null, ox = null, W = 0, H = 0, D = 1, raf = 0, power = 'dark', pT = 0, hideT = 0;
  let toastMsg = null, lockT = null, lvlL = 0, lvlR = 0, lastRow = 0;
  const MAXR = 34, BINS = 48, hist = []; for (let i = 0; i < MAXR; i++) hist.push({ v: new Float32Array(BINS), noise: 1 });
  function toast(t) { toastMsg = { t, until: performance.now() + 1600 }; }
  function build() {
    if (cv) return;
    const host = document.getElementById('screen');
    cv = document.createElement('canvas'); cv.className = 'radio-crt'; cv.setAttribute('aria-hidden', 'true');
    host.appendChild(cv); cx = cv.getContext('2d');
    oc = document.createElement('canvas'); ox = oc.getContext('2d');
  }
  function size() {
    const r = cv.getBoundingClientRect(); D = Math.min(2, window.devicePixelRatio || 1);   // 2× is plenty for a CRT, and half the pixels of 3×
    if (Math.round(r.width * D) !== cv.width || Math.round(r.height * D) !== cv.height) {
      W = r.width; H = r.height;
      cv.width = oc.width = Math.round(W * D); cv.height = oc.height = Math.round(H * D);
      ox.setTransform(D, 0, 0, D, 0, 0);
      glass = null;
    }
  }
  // the curved-tube corners never change: drawn once per size (no scanlines, no rolling bar)
  let glass = null;
  function glassLayer() {
    if (glass) return glass;
    glass = document.createElement('canvas'); glass.width = cv.width; glass.height = cv.height;
    const g = glass.getContext('2d'); g.setTransform(D, 0, 0, D, 0, 0);
    g.setTransform(1, 0, 0, 1, 0, 0);
    const v = g.createRadialGradient(glass.width / 2, glass.height / 2, glass.height * 0.28, glass.width / 2, glass.height / 2, glass.height * 0.72);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.75, 'rgba(0,0,0,.25)'); v.addColorStop(1, 'rgba(0,0,0,.8)'); g.fillStyle = v; g.fillRect(0, 0, glass.width, glass.height);
    return glass;
  }
  const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  const mix = (a, b, k) => [0, 1, 2].map(i => Math.round(a[i] + (b[i] - a[i]) * k));
  const hms = s => { s = Math.floor(s); return String(Math.floor(s / 3600)).padStart(2, '0') + ':' + String(Math.floor(s / 60) % 60).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
  function gt(txt, x, y, font, color, blur, align) { ox.font = font; ox.textAlign = align || 'left'; ox.fillStyle = color; if (blur >= 6) { ox.shadowColor = color; ox.shadowBlur = blur; } ox.fillText(txt, x, y); ox.shadowBlur = 0; }
  function fitText(txt, font, maxW) { ox.font = font; if (ox.measureText(txt).width <= maxW) return txt; while (txt.length > 3 && ox.measureText(txt + '…').width > maxW) txt = txt.slice(0, -1); return txt + '…'; }
  function pushRow(t, n, sty) {
    const r = new Float32Array(BINS), live = ac && R.on;
    for (let i = 0; i < BINS; i++) {
      const b = Math.min(127, 2 + Math.floor(Math.pow(i / BINS, 1.4) * 70));
      let v = live ? fd[b] / 255 : 0;
      if (sty.flow) v *= 0.8 + 0.2 * Math.sin(t / 700 + i * 0.2);
      r[i] = v;
    }
    if (sty.sm) { const o = new Float32Array(BINS); for (let i = 0; i < BINS; i++) { let a = 0, k = 0; for (let j = -sty.sm; j <= sty.sm; j++) { const q = i + j; if (q >= 0 && q < BINS) { a += r[q]; k++; } } o[i] = a / k; } r.set(o); }
    const nz = n.lock ? 0 : 1 - n.lvl * 0.85;
    for (let i = 0; i < BINS; i++) r[i] = r[i] * (1 - nz * 0.6) + Math.random() * nz * 0.6 * (R.on ? 1 : 0.3);
    hist.unshift({ v: r, noise: nz }); hist.pop();
  }
  function scene(t) {
    const n = near(freq), sty = (n.st && STYLE[n.st.id]) || FALLBACK, c = n.lvl > 0.5 ? mix(AMB, sty.col, Math.min(1, (n.lvl - 0.5) * 2)) : AMB;
    shown += (freq - shown) * 0.2;
    if (an && R.on) { an.getByteFrequencyData(fd); an.getByteTimeDomainData(td); } else { fd.fill(0); td.fill(128); }
    if (n.lock && lockT == null) lockT = t; if (!n.lock) lockT = null;
    ox.fillStyle = '#030201'; ox.fillRect(0, 0, W, H);
    gt('RP · R.OS  RADIO MODULE', 16, 24, "11px 'Share Tech Mono'", rgba(AMB, 0.7), 4);
    gt('FM 087.5—108.0', W - 16, 24, "11px 'Share Tech Mono'", rgba(AMB, 0.45), 3, 'right');
    ox.fillStyle = rgba(AMB, 0.22); ox.fillRect(16, 32, W - 32, 1);
    // frequency with ESPER brackets that close in as you approach a station
    const fs = freq.toFixed(1); ox.font = "300 64px 'Barlow Condensed'"; const fw = ox.measureText(fs).width;
    gt(fs, 16, 98, "300 64px 'Barlow Condensed'", n.lock ? '#FFE6BE' : rgba(c, 1), n.lock ? 16 : 6);
    gt('MHz', 16 + fw + 6, 98, "500 14px 'Barlow Condensed'", rgba(AMB, 0.7), 4);
    if (n.lvl > 0) {
      const g = 4 + Math.min(1, n.d / 0.6) * 34, bx0 = 12 - g, by0 = 48 - g * 0.5, bx1 = 16 + fw + 4 + g, by1 = 104 + g * 0.5, L = 9;
      ox.strokeStyle = n.lock ? CY : rgba(AMB, 0.35 + 0.5 * n.lvl); ox.lineWidth = 1.2; ox.shadowColor = ox.strokeStyle; ox.shadowBlur = n.lock ? 8 : 2; ox.beginPath();
      [[bx0, by0, 1, 1], [bx1, by0, -1, 1], [bx0, by1, 1, -1], [bx1, by1, -1, -1]].forEach(([x, y, sx, sy]) => { ox.moveTo(x + sx * L, y); ox.lineTo(x, y); ox.lineTo(x, y + sy * L); });
      ox.stroke(); ox.shadowBlur = 0;
    }
    // status stack: CARRIER LOCK types itself out
    const rx = W - 16, lockTxt = 'CARRIER LOCK', typed = lockT == null ? '' : lockTxt.slice(0, Math.floor((t - lockT) / 45));
    const loading = n.lock && cur.el && (cur.el.readyState < 3 || cur.el.seeking), bad = cur.err && Date.now() - cur.err < 5000;
    gt(!R.on ? 'STANDBY' : bad ? 'NO SIGNAL · RETRY' : n.lock ? (loading ? 'ACQUIRING' : typed + (typed.length < lockTxt.length || Math.floor(t / 400) % 2 ? '▌' : ' ')) : 'SEEKING', rx, 54, "11px 'Share Tech Mono'", n.lock && !bad ? CY : rgba(AMB, Math.floor(t / 350) % 2 ? 0.8 : 0.3), 3, 'right');
    gt('SIG ' + (-90 + Math.round(n.lvl * 52)) + ' DBM', rx, 68, "11px 'Share Tech Mono'", rgba(AMB, 0.75), 3, 'right');
    gt('STEREO ' + (n.lock ? 'ON' : '---'), rx, 82, "11px 'Share Tech Mono'", rgba(AMB, 0.6), 3, 'right');
    gt(n.lock ? n.st.id : '—', rx, 96, "11px 'Share Tech Mono'", n.lock ? '#FFE6BE' : rgba(AMB, 0.35), 3, 'right');
    ox.fillStyle = rgba(AMB, 0.18); ox.fillRect(rx - 80, 106, 80, 1); ox.fillStyle = n.lock ? CY : rgba(AMB, 1); ox.fillRect(rx - 80, 105, 80 * n.lvl, 2);
    let sum = 0; for (let i = 0; i < 256; i++) { const v = (td[i] - 128) / 128; sum += v * v; }
    const rms = Math.min(1, Math.sqrt(sum / 256) * 4); lvlL += (rms - lvlL) * 0.3; lvlR += (rms * (0.9 + Math.random() * 0.15) - lvlR) * 0.3;
    [['L', lvlL, 112], ['R', lvlR, 118]].forEach(([k, v, y]) => { gt(k, rx - 86, y + 3, "9px 'Share Tech Mono'", rgba(AMB, 0.5), 0, 'right'); ox.fillStyle = rgba(AMB, 0.15); ox.fillRect(rx - 80, y, 80, 1); ox.fillStyle = rgba(c, 0.9); ox.fillRect(rx - 80, y, 80 * v, 1); });
    // the terrain: a history of the music's spectrum, rolling toward you, drawn in the station's own character
    if (t - lastRow > (n.lock ? sty.rate : 55)) { lastRow = t; pushRow(t, n, sty); }
    const tx0 = 16, tx1 = W - 16, ty0 = 128, ty1 = H - 140, cxm = W / 2, rows = n.lock ? sty.rows : 28, amp = (n.lvl > 0.5 ? sty.amp : 70) * (ty1 - ty0) / 172;
    ox.save(); ox.beginPath(); ox.rect(tx0, ty0, tx1 - tx0, ty1 - ty0); ox.clip();
    for (let r = rows - 1; r >= 0; r--) {
      const z = r / rows, pz = 1 / (1 + z * 3.2), row = hist[r], y = ty1 - 6 - (1 - pz) * (ty1 - ty0 - 30), half = (tx1 - tx0) / 2 * pz * 1.05;
      const path = () => { ox.beginPath(); for (let i = 0; i < BINS; i++) { const u = i / (BINS - 1), x = cxm - half + u * half * 2, h = row.v[i] * amp * pz; i ? ox.lineTo(x, y - h) : ox.moveTo(x, y - h); } };
      path(); ox.lineTo(cxm + half, y + 40); ox.lineTo(cxm - half, y + 40); ox.closePath(); ox.fillStyle = '#030201'; ox.fill();
      path(); const a = 0.13 + 0.87 * (1 - z), rc = row.noise > 0.5 ? AMB : c;
      ox.strokeStyle = r === 0 ? rgba(n.lock ? c : AMB, 1) : rgba(rc, a.toFixed(3)); ox.lineWidth = r === 0 ? 1.4 : 1; if (r === 0) { ox.shadowColor = rgba(rc, 1); ox.shadowBlur = 6; } ox.stroke(); ox.shadowBlur = 0;
    }
    ox.restore();
    // oscilloscope: the waveform itself
    ox.beginPath(); for (let i = 0; i < 256; i += 2) { const x = 16 + (W - 32) * i / 255, y = ty1 + 12 + ((td[i] - 128) / 128) * 10; i ? ox.lineTo(x, y) : ox.moveTo(x, y); }
    ox.strokeStyle = rgba(c, 0.7); ox.lineWidth = 1; ox.stroke();
    // the tuning scale slides behind a fixed hairline; station names printed above their marks
    const sy = H - 100, mid = W / 2, sp = 10;
    ox.fillStyle = rgba(AMB, 0.22); ox.fillRect(16, sy + 12, W - 32, 1);
    for (let k = Math.floor((shown - 9) * 10); k <= Math.ceil((shown + 9) * 10); k++) {
      if (k < 875 || k > 1080) continue;
      const xx = mid + (k / 10 - shown) * 10 * sp; if (xx < 16 || xx > W - 16) continue;
      const fade = 1 - Math.pow(Math.abs(xx - mid) / (mid - 16), 2) * 0.85, big = k % 10 === 0, half = k % 5 === 0;
      ox.fillStyle = rgba(AMB, ((big ? 0.9 : half ? 0.55 : 0.28) * fade).toFixed(3));
      ox.fillRect(Math.round(xx), sy + 12 - (big ? 12 : half ? 7 : 4), 1, big ? 12 : half ? 7 : 4);
      if (big) { ox.font = "12px 'Share Tech Mono'"; ox.textAlign = 'center'; ox.fillText(String(k / 10), xx, sy + 26); }
    }
    R.stations.forEach(q => {
      const xx = mid + (q.f - shown) * 10 * sp; if (xx < -60 || xx > W + 60) return;
      const fade = Math.max(0, 1 - Math.pow(Math.abs(xx - mid) / mid, 2) * 0.85), on = n.lock && q === n.st, qc = (STYLE[q.id] || FALLBACK).col;
      ox.font = "500 11px 'Barlow Condensed'"; ox.textAlign = 'center'; ox.fillStyle = on ? CY : rgba(qc, fade.toFixed(3)); if (on) { ox.shadowColor = CY; ox.shadowBlur = 8; }
      ox.fillText(q.id, xx, sy - 8); ox.fillRect(Math.round(xx) - 2, sy - 3, 5, 2); ox.shadowBlur = 0;
    });
    ox.fillStyle = CY; ox.shadowColor = CY; ox.shadowBlur = 8; ox.fillRect(Math.round(mid), sy - 18, 1, 32); ox.shadowBlur = 0;
    // the dossier
    const ny = H - 58, np = R.now();
    if (np && n.lvl > 0.15) {
      const a = Math.max(0.3, n.lvl), tr = np.tr, fav = favs.some(f => f.k === favKey(tr));
      const head = (tr.c || 'ON AIR').toUpperCase();
      gt(head, 16, ny, "500 18px 'Barlow Condensed'", 'rgba(255,230,190,' + a + ')', 6); ox.font = "500 18px 'Barlow Condensed'"; const cw = ox.measureText(head).width;
      if (tr.d) gt(tr.d, 16 + cw + 8, ny, "11px 'Share Tech Mono'", rgba(AMB, a * 0.55), 0);
      if (fav) gt('★', W - 90, ny, "13px 'Share Tech Mono'", '#FF6B5E', 8, 'right');
      gt(fitText(tr.w + (tr.y ? ' · ' + tr.y : ''), "300 15px 'Barlow Condensed'", W - 32), 16, ny + 17, "300 15px 'Barlow Condensed'", rgba(c, a * 0.85), 3);
      gt(fitText(tr.m || '', "300 13px 'Barlow Condensed'", W * 0.5), 16, ny + 33, "300 13px 'Barlow Condensed'", rgba(AMB, a * 0.65), 2);
      gt(((tr.p || '') + (tr.p === 'Your file' ? '' : ' · ' + (tr.lic === 'CC0' ? 'CC0' : 'PUBLIC DOMAIN'))).toUpperCase(), W - 16, ny + 33, "9px 'Share Tech Mono'", rgba(AMB, a * 0.4), 0, 'right');
      const el = cur.el && cur.st === n.st && cur.src === tr.src ? cur.el : null, at = el && el.currentTime > 0 ? el.currentTime : np.at;
      gt(hms(at), W - 16, ny, "11px 'Share Tech Mono'", rgba(AMB, 0.7), 3, 'right');
      ox.fillStyle = rgba(AMB, 0.15); ox.fillRect(16, ny + 41, W - 32, 1); ox.fillStyle = rgba(c, 1); ox.fillRect(16, ny + 40, (W - 32) * clamp(at / tr.len, 0, 1), 2);
    } else gt(R.ready ? 'NO CARRIER' : 'NO LINEUP · CHECK SIGNAL', W / 2, ny + 12, "300 20px 'Barlow Condensed'", rgba(AMB, 0.5), 4, 'center');
    gt('RADIO KEY AGAIN ▸ OFF', 16, H - 6, "9px 'Share Tech Mono'", rgba(AMB, 0.35), 0);
    if (toastMsg && performance.now() < toastMsg.until) gt(toastMsg.t, W / 2, 48, "11px 'Share Tech Mono'", '#FF6B5E', 6, 'center');
    // CRT: scanlines and a slow roll
    return n;
  }
  function present(t, n) {
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.fillStyle = '#000'; cx.fillRect(0, 0, cv.width, cv.height);
    // power: a bright line blooms into the picture; going off it folds back to a line, then a dot
    const e = t - pT; let open = 1, line = false, dot = 1;
    if (power === 'on') { const p = Math.min(1, e / 650); open = p < 0.25 ? 0 : Math.pow((p - 0.25) / 0.75, 0.6); line = p < 0.25; }
    if (power === 'off') { const p = Math.min(1, e / 550); open = Math.max(0, 1 - p / 0.5); line = p >= 0.5; dot = p < 0.5 ? 1 : Math.max(0, 1 - (p - 0.5) / 0.5); }
    if (line) { const w = cv.width * (power === 'off' ? dot : Math.min(1, e / 160)); cx.fillStyle = '#FFE6BE'; cx.shadowColor = '#FFB347'; cx.shadowBlur = 20; cx.fillRect((cv.width - w) / 2, cv.height / 2 - 1.5 * D, w, 3 * D); cx.shadowBlur = 0; return; }
    const hh = cv.height * open, y0 = (cv.height - hh) / 2;
    cx.save(); cx.beginPath(); cx.rect(0, y0, cv.width, hh); cx.clip();
    cx.drawImage(oc, 0, 0);
    // between stations the picture tears now and then, like a tube losing sync
    if (!n.lock && n.lvl < 0.85 && Math.random() < 0.12) for (let k = 0; k < 3; k++) { const sy = Math.random() * cv.height, sh = (2 + Math.random() * 10) * D, dx = (Math.random() - 0.5) * 28 * D; cx.drawImage(oc, 0, sy, cv.width, sh, dx, sy, cv.width, sh); }
    // glass: a soft fringe on everything bright, then the curved-tube corners
    cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = 0.14; cx.drawImage(oc, 1.2 * D, 0); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
    cx.drawImage(glassLayer(), 0, 0);
    cx.restore();
  }
  function frame(t) {
    raf = 0;
    mixer();
    if (cv && power !== 'dark') { size(); if (W > 20 && H > 200) { const n = scene(t); present(t, n); } }
    if (R.on || (cv && power !== 'dark')) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  function show() { build(); clearTimeout(hideT); cv.style.display = 'block'; power = 'on'; pT = performance.now(); kick(); }
  function hide() { if (!cv || power === 'dark') return; power = 'off'; pT = performance.now(); kick(); hideT = setTimeout(() => { power = 'dark'; cv.style.display = 'none'; }, 560); }

  R.wire = function (a) {
    A = a;
    if (S.v2.radioFreq) freq = shown = clamp(+S.v2.radioFreq, 87.5, 108);
    R.load();
  };

  RX.screens.radio = {
    animating: () => false,   // the CRT draws itself; the dot matrix underneath can rest
    jogLabels: () => ['◂ DOWN', 'UP ▸', 'PUSH ▸ NEXT'],
    enter(st, params, A) { if (!R.ready) R.load(); R.power(true); show(); A.lcdRadio = false; A.lcdDirty = true; },
    resume() { show(); },
    leave(st, A) { hide(); A.lcdRadio = R.on; A.lcdDirty = true; if (R.on) A.say('RADIO STILL ON AIR · FN › RADIO, THEN RADIO AGAIN ▸ OFF', 4000); },
    jog(d) { clearInterval(R.scanT); R.tune(d * 0.1); },
    push() { R.scan(); },
    onMarkKey() { toggleFav(); },
    // the RADIO key, pressed again while you're on the radio, switches it off
    retap(st, A) { R.power(false); A.lcdRadio = false; A.say('RADIO ▸ OFF · STREAM STOPPED', 2000); A.beep('key'); A.home(); },
    lcd: () => R.lcd(),
    render(g, st, A) {
      document.getElementById('jogVal').textContent = freq.toFixed(1);
      if (!cv || cv.style.display !== 'block') show();
    }
  };
})();
