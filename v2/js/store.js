/* =============================================================
   RECON.OS RX-90 · DATA STORE
   Reads and writes the SAME localStorage keys and record shapes
   as RECON.OS v1, so both versions can share one device's data
   and backups round-trip between them (backup format v7).
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const K = {
    pois: 'recon.os.pois', missions: 'recon.os.missions', fog: 'recon.os.fog',
    regions: 'recon.os.regions', journal: 'recon.os.journal', trail: 'recon.os.trail',
    prefs: 'recon.os.prefs', fasts: 'recon.os.fasts', weighins: 'recon.os.weighins',
    meals: 'recon.os.meals', workouts: 'recon.os.workouts', healthTab: 'recon.os.healthTab',
    healthSeeded: 'recon.os.healthSeeded', supplySeeded: 'recon.os.supplyPOIsSeeded',
    v2: 'recon.os.v2prefs'
  };

  const FOG_CELL_DEG = 0.0014;
  const FOG_OFF = 200000, FOG_STRIDE = 500000;

  const S = {
    K, FOG_CELL_DEG,
    pois: [], missions: [], fog: new Set(), regions: [], journal: [], trail: [],
    fasts: [], weighins: [], meals: [], workouts: [], healthTab: 'fast',
    prefsV1: {},
    v2: {},
    writeFailed: false,
    onWriteFail: null
  };

  const V2_DEFAULTS = {
    sound: true, idleDim: true, recordTrail: true, brightness: 'MED',
    hiddenCats: [], placeLookup: true, lastBackup: null, lastPos: null,
    zoom: 15, logSort: 'NEAR', disp: 'wx', journalRange: 'today', objTab: 'active',
    autoName: true, recent: [], mapSrc: 'AUTO', presetsCollapsed: false, conv: {}, code: null, hicon: false
  };

  // ---------- low level ----------
  function readJSON(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
    catch (e) { return fallback; }
  }
  function safeSet(key, value) {
    try {
      localStorage.setItem(key, value);
      S.writeFailed = false;
      return true;
    } catch (err) {
      console.error('STORAGE WRITE FAILED', key, err);
      S.writeFailed = true;
      if (S.onWriteFail) S.onWriteFail(key);
      return false;
    }
  }
  function flag(key) { try { return localStorage.getItem(key) === '1'; } catch (e) { return false; } }
  function setFlag(key) { try { localStorage.setItem(key, '1'); } catch (e) {} }
  const timers = {};
  function later(name, ms, fn) { clearTimeout(timers[name]); timers[name] = setTimeout(fn, ms); }

  // ---------- fog (packed integer cells, identical to v1 on disk) ----------
  function packIdx(latIdx, lngIdx) { return (latIdx + FOG_OFF) * FOG_STRIDE + (lngIdx + FOG_OFF); }
  function cellIdToPacked(id) {
    const parts = String(id).split('_').map(Number);
    return packIdx(Math.round(parts[0] / FOG_CELL_DEG), Math.round(parts[1] / FOG_CELL_DEG));
  }
  S.cellKey = function (lat, lng) { return packIdx(Math.floor(lat / FOG_CELL_DEG), Math.floor(lng / FOG_CELL_DEG)); };
  S.packIdx = packIdx;
  S.unpackIdx = k => [Math.floor(k / FOG_STRIDE) - FOG_OFF, k % FOG_STRIDE - FOG_OFF];
  S.isRevealed = function (latIdx, lngIdx) { return S.fog.has(packIdx(latIdx, lngIdx)); };
  function loadFog(arr) {
    const set = new Set();
    let legacy = false;
    (arr || []).forEach(item => {
      if (typeof item === 'number') set.add(item);
      else if (typeof item === 'string') { try { set.add(cellIdToPacked(item)); legacy = true; } catch (e) {} }
    });
    S.fog = set;
    return legacy;
  }
  S.saveFog = function () { later('fog', 2000, () => safeSet(K.fog, JSON.stringify([...S.fog]))); };
  S.revealAround = function (lat, lng) {
    const la = Math.floor(lat / FOG_CELL_DEG), ln = Math.floor(lng / FOG_CELL_DEG);
    let changed = 0;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const k = packIdx(la + a, ln + b);
      if (!S.fog.has(k)) { S.fog.add(k); changed++; }
    }
    if (changed) { S.saveFog(); if (S.noteGround) S.noteGround(changed); }
    return changed;
  };

  // ---------- load ----------
  S.load = function () {
    S.pois = readJSON(K.pois, []);
    S.pois.forEach(p => { if (typeof p.tier !== 'number') p.tier = p.hva ? 3 : 2; });
    S.missions = readJSON(K.missions, []);
    if (loadFog(readJSON(K.fog, []))) S.saveFog();
    S.regions = readJSON(K.regions, []);
    S.journal = readJSON(K.journal, []);
    S.trail = (readJSON(K.trail, []) || []).map(pt => Array.isArray(pt) ? { lat: pt[0], lng: pt[1], ts: pt[2] * 1000 } : pt);
    S.pruneTrail();
    S.prefsV1 = readJSON(K.prefs, {}) || {};
    S.fasts = readJSON(K.fasts, []);
    S.weighins = readJSON(K.weighins, []);
    S.meals = readJSON(K.meals, []);
    S.workouts = readJSON(K.workouts, []);
    try { S.healthTab = localStorage.getItem(K.healthTab) || 'fast'; } catch (e) {}
    S.v2 = Object.assign({}, V2_DEFAULTS, readJSON(K.v2, {}) || {});
    if (S.loadProfile) S.loadProfile();
    if (S.loadRolo) S.loadRolo();
  };

  S.isEmpty = function () {
    return !S.pois.length && !S.missions.length && !S.fasts.length && !S.fog.size;
  };

  // ---------- save ----------
  S.savePOIs = () => safeSet(K.pois, JSON.stringify(S.pois));
  S.saveMissions = () => safeSet(K.missions, JSON.stringify(S.missions));
  S.saveRegions = () => safeSet(K.regions, JSON.stringify(S.regions));
  S.saveJournal = function () {
    if (S.journal.length > 1000) S.journal = S.journal.slice(-1000);
    safeSet(K.journal, JSON.stringify(S.journal));
  };
  S.saveFasts = () => safeSet(K.fasts, JSON.stringify(S.fasts));
  S.saveWeighins = () => safeSet(K.weighins, JSON.stringify(S.weighins));
  S.saveWorkouts = () => safeSet(K.workouts, JSON.stringify(S.workouts));
  S.saveTrail = function () {
    later('trail', 2000, () => safeSet(K.trail, JSON.stringify(S.trail.map(pt => [
      Math.round(pt.lat * 1e5) / 1e5, Math.round(pt.lng * 1e5) / 1e5, Math.floor(pt.ts / 1000)
    ]))));
  };
  S.savePrefsV1 = function (patch) {
    Object.assign(S.prefsV1, patch || {});
    later('prefs', 400, () => safeSet(K.prefs, JSON.stringify(S.prefsV1)));
  };
  S.saveV2 = function (patch) {
    Object.assign(S.v2, patch || {});
    later('v2', 400, () => safeSet(K.v2, JSON.stringify(S.v2)));
  };

  // ---------- journal ----------
  S.log = function (type, poiId, summary, meta) {
    S.journal.push({ ts: Date.now(), type, poiId, summary, meta: meta || '' });
    S.saveJournal();
  };

  // ---------- trail ----------
  S.pruneTrail = function () {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const before = S.trail.length;
    S.trail = S.trail.filter(pt => pt && pt.ts >= start);
    if (S.trail.length !== before) S.saveTrail();
  };
  S.recordTrail = function (lat, lng) {
    if (!S.v2.recordTrail) return false;
    S.pruneTrail();
    const last = S.trail[S.trail.length - 1];
    const step = last ? RX.geo.meters(last.lat, last.lng, lat, lng) : 0;
    if (last && step < 15) return false;
    if (last && step < 2000 && S.noteMiles) S.noteMiles(step / 1609.344);
    S.trail.push({ lat, lng, ts: Date.now() });
    if (S.trail.length > 5000) S.trail = S.trail.slice(-5000);
    S.saveTrail();
    return true;
  };
  S.trailMiles = function () {
    let m = 0;
    for (let i = 1; i < S.trail.length; i++) m += RX.geo.meters(S.trail[i - 1].lat, S.trail[i - 1].lng, S.trail[i].lat, S.trail[i].lng);
    return m / 1609.344;
  };

  // ---------- marks ----------
  S.poi = id => S.pois.find(p => p.id === id);
  S.pending = () => S.pois.filter(p => !p.category);
  S.markLabel = p => (p && p.name) ? p.name : ('MARK ' + String(p.id).slice(-4));

  // ---------- fasting (same rules as v1) ----------
  const FAST_GAP_DAYS = 3;
  S.healthId = prefix => prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  S.activeFast = function () {
    for (let i = S.fasts.length - 1; i >= 0; i--) if (!S.fasts[i].endTs) return S.fasts[i];
    return null;
  };
  S.fastStreak = function () {
    const done = S.fasts.filter(f => f.endTs).sort((a, b) => a.startTs - b.startTs);
    if (!done.length) return { current: 0, best: 0, atRisk: false, daysSinceLast: null };
    const day = 864e5;
    let run = 1, best = 1; const runs = [1];
    for (let i = 1; i < done.length; i++) {
      run = (done[i].startTs - done[i - 1].endTs <= FAST_GAP_DAYS * day) ? run + 1 : 1;
      runs.push(run); if (run > best) best = run;
    }
    const since = (Date.now() - done[done.length - 1].endTs) / day;
    const current = since > FAST_GAP_DAYS ? 0 : runs[runs.length - 1];
    return { current, best, atRisk: current >= 2 && since > 2 && since <= FAST_GAP_DAYS, daysSinceLast: since };
  };
  S.startFast = function () {
    if (S.activeFast()) return null;
    const maxDay = S.fasts.reduce((m, f) => Math.max(m, f.dayNum || 0), 0);
    const f = { id: S.healthId('FAST'), dayNum: maxDay + 1, startTs: Date.now(), endTs: null, hours: null, notes: '' };
    S.fasts.push(f); S.saveFasts();
    return f;
  };
  S.endFast = function () {
    const f = S.activeFast();
    if (!f) return null;
    f.endTs = Date.now();
    f.hours = Math.round((f.endTs - f.startTs) / (1000 * 60 * 15)) / 4;
    S.saveFasts();
    return f;
  };
  S.recalcFastHours = function (f) {
    if (f.endTs) f.hours = Math.round((f.endTs - f.startTs) / (1000 * 60 * 15)) / 4;
  };

  // ---------- backup v7 ----------
  S.buildBackup = function () {
    return {
      version: 7,
      exported: new Date().toISOString(),
      pois: S.pois,
      fog: [...S.fog],
      regions: S.regions,
      journal: S.journal,
      trail: S.trail,
      missions: S.missions,
      fasts: S.fasts, weighins: S.weighins, meals: S.meals, workouts: S.workouts,
      healthTab: S.healthTab,
      healthSeeded: flag(K.healthSeeded),
      supplyPOIsSeeded: flag(K.supplySeeded),
      prefs: S.prefsV1,
      v2prefs: S.v2,
      profile: S.profile || null,
      rolo: S.rolo || []
    };
  };
  S.summarize = function (d) {
    return {
      marks: (d.pois || []).length, fog: (d.fog || []).length, regions: (d.regions || []).length,
      journal: (d.journal || []).length, objectives: (d.missions || []).length, fasts: (d.fasts || []).length,
      exported: d.exported || null
    };
  };
  S.applyBackup = function (d) {
    if (!d || !Array.isArray(d.pois)) throw new Error('NOT AN R.OS BACKUP');
    S.pois = d.pois; S.pois.forEach(p => { if (typeof p.tier !== 'number') p.tier = p.hva ? 3 : 2; });
    S.savePOIs();
    if (Array.isArray(d.fog)) { loadFog(d.fog); safeSet(K.fog, JSON.stringify([...S.fog])); }
    if (Array.isArray(d.regions)) { S.regions = d.regions; S.saveRegions(); }
    if (Array.isArray(d.journal)) { S.journal = d.journal; S.saveJournal(); }
    if (Array.isArray(d.trail)) {
      S.trail = d.trail.map(pt => Array.isArray(pt) ? { lat: pt[0], lng: pt[1], ts: pt[2] * 1000 } : pt);
      S.pruneTrail(); S.saveTrail();
    }
    if (Array.isArray(d.missions)) { S.missions = d.missions; S.saveMissions(); }
    if (Array.isArray(d.fasts)) { S.fasts = d.fasts; S.saveFasts(); }
    if (Array.isArray(d.weighins)) { S.weighins = d.weighins; S.saveWeighins(); }
    if (Array.isArray(d.meals)) { S.meals = d.meals; safeSet(K.meals, JSON.stringify(S.meals)); }
    if (Array.isArray(d.workouts)) { S.workouts = d.workouts; safeSet(K.workouts, JSON.stringify(S.workouts)); }
    if (typeof d.healthTab === 'string') { S.healthTab = d.healthTab; try { localStorage.setItem(K.healthTab, d.healthTab); } catch (e) {} }
    if (d.healthSeeded) setFlag(K.healthSeeded);
    if (d.supplyPOIsSeeded) setFlag(K.supplySeeded);
    if (d.prefs && typeof d.prefs === 'object') { S.prefsV1 = Object.assign({}, S.prefsV1, d.prefs); safeSet(K.prefs, JSON.stringify(S.prefsV1)); }
    if (Array.isArray(d.rolo)) { S.rolo = d.rolo; if (S.saveRolo) S.saveRolo(); }
    if (d.profile && typeof d.profile === 'object') { safeSet('recon.os.profile', JSON.stringify(d.profile)); if (S.loadProfile) S.loadProfile(); }
    const exportedTs = d.exported ? Date.parse(d.exported) : null;
    const keep = d.v2prefs && typeof d.v2prefs === 'object' ? d.v2prefs : {};
    S.v2 = Object.assign({}, V2_DEFAULTS, S.v2, keep, { lastBackup: exportedTs || Date.now() });
    safeSet(K.v2, JSON.stringify(S.v2));
  };
  S.wipe = function (what) {
    if (what === 'marks') { S.pois = []; S.savePOIs(); return; }
    Object.values(K).forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
    S.load();
  };

  // ---------- storage usage ----------
  S.usage = function () {
    let bytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        bytes += (k.length + (localStorage.getItem(k) || '').length) * 2;
      }
    } catch (e) {}
    return { bytes, limit: 5 * 1024 * 1024 };
  };

  RX.store = S;
})();
