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
  const tracts = new Map(), counties = new Map(), spots = new Map();

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

  // everything for a spot: { tract, county } with the tract's outline
  async function at(lat, lng) {
    const key = lat.toFixed(4) + ',' + lng.toFixed(4);
    if (spots.has(key)) return spots.get(key);
    for (const v of spots.values()) if (v && v.tract && v.tract.ring && RX.parcel.contains(v.tract.ring, lat, lng)) return v;   // same tract: no new calls
    const f = await getJSON(FCC + '?' + new URLSearchParams({ lat: lat.toFixed(6), lon: lng.toFixed(6), censusYear: '2020', format: 'json' }));
    const r = (f.results || [])[0];
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
  const brief = A => A && A.tract ? { tract: A.tract.name, pop: A.tract.pop, income: A.tract.income, home: A.tract.home, own: A.tract.own, cIncome: A.county && A.county.income, cHome: A.county && A.county.home, county: A.countyName } : null;

  return { at, money, vs, brief };
})();
