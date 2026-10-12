/* =============================================================
   RECON.OS RX-90 · SFX
   Every sound has a slot. Drop a file named after the slot into
   v2/sfx/ (aux.open.wav, key.mp3 …), run `python3 v2/sfx/build.py`
   and commit: the slot plays your file. A slot with no file plays
   its parent (aux.open → thunk), and the root slots fall back to
   the stock files in v2/sfx/stock/ — the RP's original sounds —
   and, before those have loaded, to the synth that made them.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  // [slot, parent, when it plays, group]
  const SLOTS = [
    ['key', null, 'ANY KEY PRESS', 'KEYS'], ['jog', null, 'JOG DIAL CLICK', 'KEYS'], ['mark', null, 'DROPPING A MARK', 'KEYS'],
    ['file', null, 'FILING · SAVING', 'KEYS'], ['ok', null, 'SOMETHING WORKED', 'KEYS'], ['err', null, 'SOMETHING FAILED', 'KEYS'],
    ['thunk', null, 'HEAVY LANDING', 'KEYS'],
    ['drum.roll', 'thunk', 'DRUM LANDS ON A FACE', 'DRUM'], ['drum.press', 'thunk', 'DRUM PRESSED', 'DRUM'],
    ['fn.open', 'thunk', 'FN CARTRIDGE FLIPS OUT', 'FN'], ['fn.close', 'thunk', 'FN CARTRIDGE STOWS', 'FN'],
    ['aux.latch', 'key', 'AUX GRIP TAPPED', 'AUX'], ['aux.open', 'thunk', 'AUX PANEL LANDS UP', 'AUX'], ['aux.close', 'thunk', 'AUX PANEL LANDS HOME', 'AUX'],
    ['aux.keyup', 'key', 'AUX KEYS SPRING UP', 'AUX'], ['aux.lamp', null, 'AUX LAMPS FLICKER ON', 'AUX'],
    ['scan.ping', null, 'SONAR PULSE', 'SCAN'], ['scan.found', 'ok', 'SWEEP FOUND PLACES', 'SCAN'], ['scan.empty', 'key', 'SWEEP FOUND NOTHING', 'SCAN'],
    ['here.fix', 'ok', 'HERE TAKES A FIX', 'HERE'],
    ['ring.pick', 'jog', 'RING MOVES TO A CATEGORY', 'RING'], ['ring.file', 'file', 'RING FILES THE MARK', 'RING'],
    ['gps.lock', 'ok', 'FIRST GPS LOCK', 'GPS'], ['visit', 'ok', 'VISIT LOGGED AT A MARK', 'GPS'],
    ['boot', null, 'STARTUP', 'BOOT']
  ];
  const parentOf = {}; SLOTS.forEach(s => { parentOf[s[0]] = s[1]; });
  const rootOf = s => { while (parentOf[s]) s = parentOf[s]; return s; };
  const X = RX.sfx = { SLOTS, man: null, manErr: null, raw: {}, bufs: {}, rootOf };
  let ac = null;

  X.ctx = function () {
    if (!ac) {
      if (navigator.audioSession) { try { navigator.audioSession.type = 'ambient'; } catch (e) {} }   // follows the silent switch
      ac = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  };

  // ---- the RP's original generated sounds (also what the stock files were rendered from) ----
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

  // ---- which file a slot plays: its own, else up the parents to the stock file ----
  X.resolve = function (slot) {
    const m = X.man; let s = slot;
    for (let hop = 0; s && hop < 6; hop++, s = parentOf[s]) {
      if (m && m.custom && m.custom[s]) return { from: s, file: m.custom[s], vol: m.vol && m.vol[s] != null ? m.vol[s] : 0.7, kind: 'FILE' };
      if (m && m.stock && m.stock[s]) return { from: s, file: m.stock[s], vol: m.vol && m.vol[s] != null ? m.vol[s] : (m.stockVol && m.stockVol[s] != null ? m.stockVol[s] : 0.05), kind: 'STOCK' };
    }
    return null;
  };
  // how the SOUND page describes a slot
  X.describe = function (slot) {
    const r = X.resolve(slot);
    if (!r) return ['key', 'jog', 'mark', 'file', 'ok', 'err', 'thunk'].includes(rootOf(slot)) ? 'SYNTH' : 'SILENT';
    if (r.from === slot) return r.kind === 'FILE' ? 'YOUR FILE' : 'STOCK';
    return 'USES ' + r.from.toUpperCase() + (r.kind === 'FILE' ? ' · YOURS' : '');
  };

  // ---- loading: the list, then every file it names (decoded once the audio is unlocked by a touch) ----
  const url = f => 'sfx/' + f + '?v=' + ((X.man && X.man.v) || 0);
  X.load = async function () {
    try {
      const r = await fetch('sfx/sfx.json', { cache: 'no-cache' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      X.man = await r.json(); X.manErr = null;
    } catch (e) { X.manErr = 'NO SFX.JSON'; return; }
    const files = new Set(); Object.values(X.man.custom || {}).forEach(f => files.add(f)); Object.values(X.man.stock || {}).forEach(f => files.add(f));
    await Promise.all([...files].map(async f => {
      try { const res = await fetch(url(f)); if (res.ok) X.raw[f] = await res.arrayBuffer(); } catch (e) {}
    }));
    if (ac) decodeAll();
  };
  function decodeAll() {
    Object.keys(X.raw).forEach(f => {
      const ab = X.raw[f]; delete X.raw[f];
      const done = b => { X.bufs[f] = b; };
      try { const p = ac.decodeAudioData(ab, done, () => {}); if (p && p.then) p.then(done).catch(() => {}); } catch (e) {}
    });
  }
  X.unlock = function () { X.ctx(); decodeAll(); };

  X.play = function (slot, arg) {
    if (slot === 'morse') return X.synth('morse', arg);
    const r = X.resolve(slot), buf = r && X.bufs[r.file];
    if (!buf) {   // not loaded yet (or no file anywhere up the chain): the generated sound, if the root has one
      if (!r || !X.man) X.synth(rootOf(slot), arg); else X.synth(rootOf(r.from), arg);
      return;
    }
    const c = X.ctx(), src = c.createBufferSource(), g = c.createGain();
    src.buffer = buf; g.gain.value = r.vol * (arg || 1);
    src.connect(g); g.connect(c.destination); src.start();
  };
})();
