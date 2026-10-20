/* =============================================================
   R.OS · PARCEL
   Texas statewide land parcels (TxGIO StratMap, from every county
   appraisal district). Public, no key. One identify call per spot;
   the lot outline comes back in lat/lng.
   ============================================================= */
window.RX = window.RX || {};

RX.parcel = (function () {
  const URL = 'https://feature.geographic.texas.gov/arcgis/rest/services/Parcels/stratmap_land_parcels_48_most_recent/MapServer/identify';
  const cache = new Map();
  const val = x => (x == null || x === 'Null' || String(x).trim() === '') ? null : String(x).trim();
  const money = x => { const n = parseFloat(val(x)); return isFinite(n) && n > 0 ? Math.round(n) : null; };
  const clean = s => s ? s.replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim() : null;

  // ring: [[lat, lng], ...] · acres by shoelace on a local flat projection (good to well under 1% at lot scale)
  function acresOf(ring) {
    if (!ring || ring.length < 3) return null;
    const lat0 = ring[0][0] * Math.PI / 180, k = Math.PI / 180 * 6378137;
    let a = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][1] * k * Math.cos(lat0), yi = ring[i][0] * k, xj = ring[j][1] * k * Math.cos(lat0), yj = ring[j][0] * k;
      a += xj * yi - xi * yj;
    }
    return Math.abs(a) / 2 / 4046.8564224;
  }
  function contains(ring, lat, lng) {
    if (!ring) return false;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const yi = ring[i][0], xi = ring[i][1], yj = ring[j][0], xj = ring[j][1];
      if (((yi > lat) !== (yj > lat)) && (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi)) inside = !inside;
    }
    return inside;
  }

  function shape(r, lat, lng) {
    const a = r.attributes || {};
    const rings = (r.geometry && r.geometry.rings) || [];
    const ring = (rings[0] || []).map(p => [p[1], p[0]]);
    const unit = val(a.LGL_AREA_UNIT);
    const legal = parseFloat(val(a.LEGAL_AREA));
    const built = val(a.YEAR_BUILT);
    return {
      id: val(a.PROP_ID) || val(a.GEO_ID),
      county: val(a.COUNTY), source: val(a.SOURCE), taxYear: val(a.TAX_YEAR),
      owner: val(a.OWNER_NAME), care: val(a.NAME_CARE),
      situs: clean(val(a.SITUS_ADDR)), mail: clean(val(a.MAIL_ADDR)),
      acres: acresOf(ring), legalArea: isFinite(legal) && legal > 0 ? legal : null, legalUnit: unit,
      land: money(a.LAND_VALUE), imp: money(a.IMP_VALUE), mkt: money(a.MKT_VALUE),
      built: built && built !== '0' ? built : null,
      legal: val(a.LEGAL_DESC), use: val(a.STAT_LAND_USE) || val(a.LOC_LAND_USE),
      ring: ring.map(p => [+p[0].toFixed(6), +p[1].toFixed(6)]), at: [lat, lng], ts: Date.now()
    };
  }

  async function at(lat, lng) {
    const key = lat.toFixed(5) + ',' + lng.toFixed(5);
    if (cache.has(key)) return cache.get(key);
    for (const v of cache.values()) if (v && contains(v.ring, lat, lng)) return v;   // still inside the last lot: no new call
    const d = 0.0015;
    const q = new URLSearchParams({
      geometry: lng + ',' + lat, geometryType: 'esriGeometryPoint', sr: '4326', layers: 'all', tolerance: '0',
      mapExtent: [lng - d, lat - d, lng + d, lat + d].join(','), imageDisplay: '400,400,96', returnGeometry: 'true', f: 'json'
    });
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 12000);
    let j;
    try { j = await (await fetch(URL + '?' + q, { signal: ctl.signal })).json(); } finally { clearTimeout(timer); }
    if (j.error) throw new Error(j.error.message || 'service error');
    const lots = (j.results || []).map(r => shape(r, lat, lng)).filter(p => p.ring.length > 2);
    // overlapping copies come back sometimes: prefer the smallest lot that actually holds the point
    const hold = lots.filter(p => contains(p.ring, lat, lng)).sort((x, y) => (x.acres || 1e9) - (y.acres || 1e9));
    const best = hold[0] || lots[0] || null;
    cache.set(key, best);
    if (cache.size > 60) cache.delete(cache.keys().next().value);
    return best;
  }

  const fmtAcres = a => a == null ? '—' : (a < 0.1 ? Math.round(a * 43560).toLocaleString('en-US') + ' SQ FT' : a.toFixed(a < 10 ? 2 : 1) + ' AC');
  const fmtMoney = n => n == null ? '—' : '$' + n.toLocaleString('en-US');
  const recordUrl = p => 'https://www.google.com/search?q=' + encodeURIComponent((p.source || (p.county + ' COUNTY APPRAISAL DISTRICT')) + ' ' + (p.id || p.situs || ''));
  const summary = p => [p.situs, p.owner ? 'OWNER ' + p.owner : null, fmtAcres(p.acres), p.mkt ? 'VALUE ' + fmtMoney(p.mkt) : null, p.built ? 'BUILT ' + p.built : null, p.county ? p.county + ' CO · ACCT ' + (p.id || '—') : null].filter(Boolean).join(' · ');

  return { at, contains, acresOf, fmtAcres, fmtMoney, recordUrl, summary };
})();
