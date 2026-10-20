/* =============================================================
   RECON.OS RX-90 · SFX
   One folder per moment in v2/sfx/ (K1-key, A2-aux-open …), like
   the CCRB site. Drop sound.mp3 (or .wav / .m4a) in a folder, push,
   and it plays at that moment — no list to rebuild. The RP looks
   for those exact names itself.
   A folder with no file plays its related sound (A2-aux-open uses
   K7-thunk); the K folders hold the RP's originals as original.wav,
   and before anything has loaded the synth that made them plays.
   Every file plays exactly as it is.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  // [slot, folder, related slot (plays when the folder is empty), when it plays, group]
  const SLOTS = [
    ['key', 'K1-key', null, 'ANY KEY PRESS', 'KEYS'], ['jog', 'K2-jog', null, 'JOG DIAL CLICK', 'KEYS'], ['mark', 'K3-mark', null, 'DROPPING A MARK', 'KEYS'],
    ['file', 'K4-file', null, 'FILING · SAVING', 'KEYS'], ['ok', 'K5-ok', null, 'SOMETHING WORKED', 'KEYS'], ['err', 'K6-err', null, 'SOMETHING FAILED', 'KEYS'],
    ['thunk', 'K7-thunk', null, 'HEAVY LANDING', 'KEYS'],
    ['drum.roll', 'D1-drum-roll', 'thunk', 'DRUM LANDS ON A FACE', 'DRUM'], ['drum.press', 'D2-drum-press', 'thunk', 'DRUM PRESSED', 'DRUM'],
    ['fn.open', 'F1-fn-open', 'thunk', 'FN CARTRIDGE FLIPS OUT', 'FN'], ['fn.close', 'F2-fn-close', 'thunk', 'FN CARTRIDGE STOWS', 'FN'],
    ['aux.latch', 'A1-aux-latch', 'key', 'AUX GRIP TAPPED', 'AUX'], ['aux.open', 'A2-aux-open', 'thunk', 'AUX PANEL LANDS UP', 'AUX'], ['aux.close', 'A3-aux-close', 'thunk', 'AUX PANEL LANDS HOME', 'AUX'],
    ['aux.keyup', 'A4-aux-keyup', 'key', 'AUX KEYS SPRING UP', 'AUX'], ['aux.lamp', 'A5-aux-lamp', null, 'AUX LAMPS FLICKER ON', 'AUX'],
    ['scan.ping', 'S1-scan-ping', null, 'SONAR PULSE', 'SCAN'], ['scan.found', 'S2-scan-found', 'ok', 'SWEEP FOUND PLACES', 'SCAN'], ['scan.empty', 'S3-scan-empty', 'key', 'SWEEP FOUND NOTHING', 'SCAN'],
    ['here.fix', 'H1-here-fix', 'ok', 'HERE TAKES A FIX', 'HERE'],
    ['ring.pick', 'R1-ring-pick', 'jog', 'RING MOVES TO A CATEGORY', 'RING'], ['ring.file', 'R2-ring-file', 'file', 'RING FILES THE MARK', 'RING'],
    ['gps.lock', 'G1-gps-lock', 'ok', 'FIRST GPS LOCK', 'GPS'], ['visit', 'G2-visit', 'ok', 'VISIT LOGGED AT A MARK', 'GPS'],
    ['fit.set', 'T1-train-set', 'ok', 'ONE SET LOGGED', 'TRAIN'], ['fit.done', 'T2-train-done', 'file', 'EXERCISE DONE FOR THE DAY', 'TRAIN'], ['fit.down', 'T3-train-down', 'jog', 'SET COUNTED DOWN', 'TRAIN'],
    ['boot', 'B1-boot', null, 'STARTUP', 'BOOT']
  ];
  const ROOTS = ['key', 'jog', 'mark', 'file', 'ok', 'err', 'thunk'];   // these folders hold original.wav
  const NAMES = ['sound.mp3', 'sound.wav', 'sound.m4a'];               // yours: the first one found wins
  const parentOf = {}, folderOf = {};
  SLOTS.forEach(s => { parentOf[s[0]] = s[2]; folderOf[s[0]] = s[1]; });
  const rootOf = s => { while (parentOf[s]) s = parentOf[s]; return s; };
  // found[slot] = { url, kind: 'YOURS' | 'ORIGINAL' } once its folder has been checked
  const X = RX.sfx = { SLOTS, ROOTS, folderOf, found: {}, raw: {}, bufs: {}, ready: false, checked: 0, rootOf };
  let ac = null;

  X.ctx = function () {
    if (!ac) {
      if (navigator.audioSession) { try { navigator.audioSession.type = 'ambient'; } catch (e) {} }   // follows the silent switch
      ac = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  };

  // ---- the RP's original generated sounds (the originals in the K folders were rendered from these) ----
  X.synth = function (kind, arg) {
    const c = X.ctx(), t = c.currentTime;
    const tone = (f, d, v, at, type) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || 'square'; o.frequency.setValueAtTime(f, t + (at || 0));
      g.gain.setValueAtTime(0, t + (at || 0)); g.gain.linearRampToValueAtTime(v, t + (at || 0) + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (at || 0) + d);
      o.connect(g); g.connect(c.destination); o.start(t + (at || 0)); o.stop(t + (at || 0) + d + 0.02);
    };
    if (kind === 'key') tone(1900, 0.018, 0.035);
    else if (kind === 'jog') tone(2600, 0.008, 0.02);
    else if (kind === 'mark') { tone(1320, 0.05, 0.05); tone(1760, 0.07, 0.05, 0.06); }
    else if (kind === 'file') { tone(880, 0.04, 0.045); tone(1320, 0.04, 0.045, 0.045); tone(1760, 0.06, 0.04, 0.09); }
    else if (kind === 'err') tone(220, 0.14, 0.05, 0, 'sawtooth');
    else if (kind === 'ok') tone(1480, 0.05, 0.04);
    else if (kind === 'morse') { const d = arg || 0.08, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = 680; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.004); g.gain.setValueAtTime(0.06, t + d - 0.004); g.gain.linearRampToValueAtTime(0, t + d); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + d + 0.01); }
    else if (kind === 'thunk') {
      // low, heavy thud: a falling sine plus a muffled knock — no tick
      const v = 0.2 * (arg || 1);
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.11);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.18);
      const len = Math.floor(c.sampleRate * 0.03), buf = c.createBuffer(1, len, c.sampleRate), dd = buf.getChannelData(0);
      for (let i = 0; i < len; i++) dd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
      const n = c.createBufferSource(), lp = c.createBiquadFilter(), ng = c.createGain();
      lp.type = 'lowpass'; lp.frequency.value = 380; ng.gain.value = v * 0.9;
      n.buffer = buf; n.connect(lp); lp.connect(ng); ng.connect(c.destination); n.start(t);
    } else return false;
    return true;
  };

  // ---- what a moment plays: its own folder's file, else up the related sounds ----
  X.resolve = function (slot) {
    let s = slot;
    for (let hop = 0; s && hop < 6; hop++, s = parentOf[s]) if (X.found[s]) return Object.assign({ from: s }, X.found[s]);
    return null;
  };
  // how SOUND TEST describes a folder
  X.describe = function (slot) {
    const r = X.resolve(slot);
    if (!r) return ROOTS.includes(rootOf(slot)) ? (X.ready ? 'SYNTH' : 'CHECKING') : 'SILENT';
    if (r.from === slot) return r.kind === 'YOURS' ? 'YOUR FILE' : 'ORIGINAL';
    return 'USES ' + folderOf[r.from] + (r.kind === 'YOURS' ? ' · YOURS' : '');
  };

  // ---- checking the folders: a website can't list them, so it asks for the exact names ----
  async function grab(url) {
    try {
      const r = await fetch(url, { cache: 'no-cache' });
      if (!r.ok) return null;
      const ab = await r.arrayBuffer();
      return ab.byteLength > 44 ? ab : null;
    } catch (e) { return null; }
  }
  async function check(slot) {
    const base = 'sfx/' + folderOf[slot] + '/';
    for (const n of NAMES) { const ab = await grab(base + n); if (ab) return { url: base + n, kind: 'YOURS', ab }; }
    if (ROOTS.includes(slot)) { const ab = await grab(base + 'original.wav'); if (ab) return { url: base + 'original.wav', kind: 'ORIGINAL', ab }; }
    return null;
  }
  X.load = function () {
    // in the background once boot has settled; until then the synth covers the K sounds
    setTimeout(async () => {
      await Promise.all(SLOTS.map(async s => {
        const f = await check(s[0]);
        X.checked++;
        if (!f) return;
        X.found[s[0]] = { url: f.url, kind: f.kind };
        X.raw[f.url] = f.ab;
      }));
      X.ready = true;
      if (ac) decodeAll();
    }, 1200);
  };
  function decodeAll() {
    Object.keys(X.raw).forEach(u => {
      const ab = X.raw[u]; delete X.raw[u];
      const done = b => { X.bufs[u] = b; };
      try { const p = ac.decodeAudioData(ab, done, () => {}); if (p && p.then) p.then(done).catch(() => {}); } catch (e) {}
    });
  }
  X.unlock = function () { X.ctx(); decodeAll(); };

  X.play = function (slot, arg) {
    if (slot === 'morse') return X.synth('morse', arg);
    const r = X.resolve(slot), buf = r && X.bufs[r.url];
    if (!buf) { X.synth(rootOf(r ? r.from : slot), arg); return; }   // not loaded yet, or nothing up the chain
    const c = X.ctx(), src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf; g.gain.value = arg || 1;
    src.connect(g); g.connect(c.destination); src.start();
  };
})();
