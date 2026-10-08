/* =============================================================
   R.OS · AREA
   The Census tract under a spot (FCC area API), then American
   Community Survey 5-year figures for that tract and its county
   (Esri Living Atlas copy of the Census tables). Public, no key.
   ============================================================= */
window.RX = window.RX || {};

RX.area = (function () {
  const FCC = 'https://geo.fcc.gov/api/census/area';
  const ACS = 'https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/ACS_Highlights_Population_Housing_Basics_Boundaries/FeatureServer/';
  const FIELDS = 'GEOID,NAME,B01001_001E,B01002_001E,B19049_001E,B25002_001E,B25002_003E,B25003_calc_pctOwnE,B25058_001E,B25077_001E,ALAND';
  const TIGER = 'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer/';
  const tracts = new Map(), counties = new Map(), spots = new Map(), fccs = new Map(), places = [];

  async function getJSON(url, ms) {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms || 12000);
    try { const r = await fetch(url, { signal: ctl.signal }); return await r.json(); } finally { clearTimeout(t); }
  }
  const row = a => ({
    geoid: a.GEOID, name: a.NAME, pop: a.B01001_001E, age: a.B01002_001E, income: a.B19049_001E,
    units: a.B25002_001E, vacant: a.B25002_003E, own: a.B25003_calc_pctOwnE, rent: a.B25058_001E, home: a.B25077_001E,
    sqmi: a.ALAND ? a.ALAND / 2589988.11 : null
  });
  async function acs(layer, geoid, geom) {
    const q = new URLSearchParams({ where: "GEOID='" + geoid + "'", outFields: FIELDS, returnGeometry: geom ? 'true' : 'false', outSR: '4326', geometryPrecision: '5', f: 'json' });
    const j = await getJSON(ACS + layer + '/query?' + q);
    if (j.error) throw new Error(j.error.message);
    const f = (j.features || [])[0];
    if (!f) return null;
    const out = row(f.attributes);
    if (geom && f.geometry && f.geometry.rings) out.ring = f.geometry.rings[0].map(p => [p[1], p[0]]);
    return out;
  }

  async function fcc(lat, lng) {
    const key = lat.toFixed(4) + ',' + lng.toFixed(4);
    if (fccs.has(key)) return fccs.get(key);
    const f = await getJSON(FCC + '?' + new URLSearchParams({ lat: lat.toFixed(6), lon: lng.toFixed(6), censusYear: '2020', format: 'json' }));
    const r = (f.results || [])[0] || null;
    fccs.set(key, r); if (fccs.size > 60) fccs.delete(fccs.keys().next().value);
    return r;
  }

  // ---------- city scale: a yearly Texas snapshot (data/tx-acs.json) + live city limits ----------
  let SNAP = null, snapP = null;
  function snap() {
    if (SNAP) return Promise.resolve(SNAP);
    if (!snapP) snapP = fetch('data/tx-acs.json?v=2024b').then(r => r.json()).then(d => {
      const F = d.fields, row = a => { const o = {}; F.forEach((k, i) => { o[k] = a[i]; }); o.growth = o.pop5 ? (o.pop - o.pop5) / o.pop5 : null; return o; };
      SNAP = { year: d.year, prior: d.prior, state: row(d.state), county: new Map(d.counties.map(a => [a[0], row(a)])), place: new Map(d.places.map(a => [a[0], row(a)])) };
      return SNAP;
    }).catch(e => { snapP = null; throw e; });
    return snapP;
  }
  // extra census figures for one tract (split by county so only one small file loads)
  const tractFiles = new Map();
  function tractMore(geoid) {
    if (!geoid) return Promise.resolve(null);
    const c = geoid.slice(0, 5);
    if (!tractFiles.has(c)) tractFiles.set(c, fetch('data/tracts/' + c + '.json?v=2024').then(r => r.json()).catch(e => { tractFiles.delete(c); throw e; }));
    return tractFiles.get(c).then(d => { const a = d.tracts[geoid]; if (!a) return null; const o = {}; d.fields.forEach((k, i) => { o[k] = a[i]; }); return o; });
  }
  // FBI crime: yearly totals per police department (city) and sheriff (unincorporated county)
  let CRIME = null;
  function crime() {
    if (!CRIME) CRIME = fetch('data/tx-crime.json?v=2025').then(r => r.json()).catch(e => { CRIME = null; throw e; });
    return CRIME;
  }
  // the rest of the country: every state and every city of 100k+ (Census + FBI), one small file
  let US = null;
  function usSnap() {
    if (!US) US = fetch('data/us-major.json?v=2024').then(r => r.json()).then(d => {
      const F = d.fields, row = a => { const o = {}; F.forEach((k, i) => { o[k] = a[i]; }); o.growth = o.pop5 ? (o.pop - o.pop5) / o.pop5 : null; return o; };
      return { year: d.year, prior: d.prior, us: row(d.us), state: new Map(d.states.map(a => [a[0], row(a)])), place: new Map(d.places.map(a => [a[0], row(a)])), crime: d.crime };
    }).catch(e => { US = null; throw e; });
    return US;
  }
  const inRings = (rings, lat, lng) => { let c = 0; rings.forEach(r => { if (RX.parcel.contains(r, lat, lng)) c++; }); return c % 2 === 1; };
  async function placeAt(lat, lng) {
    for (const p of places) if (inRings(p.rings, lat, lng)) return p;
    for (const layer of [4, 5]) {   // incorporated city first, then a census-designated community
      const q = new URLSearchParams({ geometry: lng + ',' + lat, geometryType: 'esriGeometryPoint', inSR: '4326', spatialRel: 'esriSpatialRelIntersects', outFields: 'GEOID,NAME,BASENAME,AREALAND', returnGeometry: 'true', outSR: '4326', geometryPrecision: '5', maxAllowableOffset: '0.0003', f: 'json' });
      const j = await getJSON(TIGER + layer + '/query?' + q);
      if (j.error) throw new Error(j.error.message);
      const f = (j.features || [])[0];
      if (f) {
        const rings = (f.geometry && f.geometry.rings || []).map(r => r.map(q => [q[1], q[0]]));
        let s = 90, w = 180, n = -90, e = -180; rings.forEach(r => r.forEach(q => { s = Math.min(s, q[0]); n = Math.max(n, q[0]); w = Math.min(w, q[1]); e = Math.max(e, q[1]); }));
        const p = { geoid: f.attributes.GEOID, name: f.attributes.BASENAME, full: f.attributes.NAME, cdp: layer === 5, sqmi: f.attributes.AREALAND / 2589988.11, rings, box: [s, w, n, e] };
        places.unshift(p); if (places.length > 12) places.pop();
        return p;
      }
    }
    return false;   // outside any city or community
  }
  // { place (stats + rings) | false, county, state, countyName, year }
  async function cityAt(lat, lng) {
    const [S, p, f, CR, U] = await Promise.all([snap(), placeAt(lat, lng), fcc(lat, lng), crime().catch(() => null), usSnap().catch(() => null)]);
    const cid = f && f.county_fips, sid = f && f.block_fips ? f.block_fips.slice(0, 2) : (cid ? cid.slice(0, 2) : null), inTX = sid === '48';
    const tract = inTX && f.block_fips ? await tractMore(f.block_fips.slice(0, 11)).catch(() => null) : null;
    // figures: the Texas file covers every Texas place and county; the US file covers states and cities of 100k+
    const pstats = p ? (S.place.get(p.geoid) || (U && U.place.get(p.geoid)) || null) : null;
    const state = U && sid ? U.state.get(sid) : (inTX ? S.state : null);
    const UC = U && U.crime, rate = c => c ? { v: c.v, p: c.p, v20: c.v20, p20: c.p20 } : null;
    let crimeOut = null;
    if (inTX && CR) crimeOut = { year: CR.year, prior: CR.prior, state: CR.state, us: UC ? rate(UC.us) : null, place: p ? CR.places[p.geoid] || null : null, county: cid ? CR.counties[cid] || null : null };
    else if (UC) crimeOut = { year: UC.year, prior: UC.prior, state: sid && UC.states[sid] ? rate(UC.states[sid]) : null, us: rate(UC.us), place: p ? UC.places[p.geoid] || null : null, county: null };
    return { inTX, stateFips: sid, tractMore: tract, crime: crimeOut, place: p ? Object.assign({}, pstats || {}, p, { stats: !!pstats }) : false,
      county: inTX && cid ? S.county.get(cid) : null, countyName: f && f.county_name, state, stateName: f && f.state_name, stateCode: f && f.state_code, us: U ? U.us : null, year: S.year, prior: S.prior };
  }

  // everything for a spot: { tract, county } with the tract's outline
  async function at(lat, lng) {
    const key = lat.toFixed(4) + ',' + lng.toFixed(4);
    if (spots.has(key)) return spots.get(key);
    for (const v of spots.values()) if (v && v.tract && v.tract.ring && RX.parcel.contains(v.tract.ring, lat, lng)) return v;   // same tract: no new calls
    const r = await fcc(lat, lng);
    if (!r || !r.block_fips) return null;
    const tid = r.block_fips.slice(0, 11), cid = r.block_fips.slice(0, 5);
    const [tract, county] = await Promise.all([
      tracts.has(tid) ? tracts.get(tid) : acs(2, tid, true).then(v => { tracts.set(tid, v); return v; }),
      counties.has(cid) ? counties.get(cid) : acs(1, cid, false).then(v => { counties.set(cid, v); return v; })
    ]);
    const out = tract ? { tract, county, countyName: r.county_name } : null;
    spots.set(key, out);
    if (spots.size > 40) spots.delete(spots.keys().next().value);
    return out;
  }

  const money = n => n == null || n < 0 ? '—' : n >= 1e6 ? '$' + (n / 1e6).toFixed(2) + 'M' : n >= 1e4 ? '$' + Math.round(n / 1000) + 'K' : '$' + n.toLocaleString('en-US');
  const vs = (a, b) => (a == null || b == null || b <= 0 || a < 0) ? '' : (a >= b ? '+' : '') + Math.round((a - b) / b * 100) + '%';
  // a compact copy for storing on a mark
  const brief = (A, C) => A && A.tract ? { city: C && C.place ? C.place.name + (C.place.cdp ? ' (UNINC)' : '') : null, tract: A.tract.name, pop: A.tract.pop, income: A.tract.income, home: A.tract.home, own: A.tract.own, cIncome: A.county && A.county.income, cHome: A.county && A.county.home, county: A.countyName } : null;

  const growth = g => g == null ? '' : (g >= 0 ? '+' : '') + Math.round(g * 100) + '%';
  return { at, cityAt, snap, usSnap, tractMore, crime, inRings, money, vs, brief, growth };
})();
