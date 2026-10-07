/* =============================================================
   R.OS · TRAFFIC
   TxDOT annual average daily traffic (AADT): every count station in
   Texas, its latest year and up to 19 years of history. Public, no key.
   ============================================================= */
window.RX = window.RX || {};

RX.traffic = (function () {
  const URL = 'https://services.arcgis.com/KTcxiTD9dsQw4r7Z/ArcGIS/rest/services/' + encodeURIComponent('TxDOT_AADT_Annuals_(Public_View)') + '/FeatureServer/0/query';
  const HIST = Array.from({ length: 19 }, (_, i) => 'AADT_RPT_HIST_' + String(i + 1).padStart(2, '0') + '_QTY');
  const cache = new Map();

  const road = s => {
    if (!s) return '—';
    const m = String(s).trim().match(/^([A-Z]{2})0*(\d+)([A-Z]?)$/);
    return m ? m[1] + ' ' + m[2] + m[3] : String(s).trim();
  };
  const meters = (a, b, c, d) => { const R = 6371000, k = Math.PI / 180, x = (d - b) * k * Math.cos((a + c) / 2 * k), y = (c - a) * k; return Math.sqrt(x * x + y * y) * R; };

  function shape(a, lat, lng) {
    const hist = HIST.map(k => a[k]).map(v => (v == null || v <= 0) ? null : v);
    const year = a.AADT_RPT_YEAR;
    const series = [a.AADT_RPT_QTY].concat(hist);               // newest first
    const y5 = series[5];
    return {
      id: a.TRFC_STATN_ID, road: road(a.ON_ROAD), year, aadt: a.AADT_RPT_QTY,
      series: series.map((v, i) => ({ year: year - i, v })).filter(o => o.v != null),
      trend5: y5 ? (a.AADT_RPT_QTY - y5) / y5 : null,
      sub: /[NSEW]B/.test(String(a.TRFC_STATN_ID).replace(/^\d+[A-Z]\d+/, '')),   // a ramp or one direction (…EBSR, …WBFR), not the whole road
      lat: a.LATITUDE, lng: a.LONGITUDE, dist: meters(lat, lng, a.LATITUDE, a.LONGITUDE)
    };
  }

  // stations within `radius` meters, nearest first
  async function near(lat, lng, radius) {
    radius = Math.round(radius || 1200);
    const key = lat.toFixed(3) + ',' + lng.toFixed(3) + ',' + radius;
    if (cache.has(key)) return cache.get(key).map(s => Object.assign({}, s, { dist: meters(lat, lng, s.lat, s.lng) })).sort((x, y) => x.dist - y.dist);
    const q = new URLSearchParams({
      geometry: lng + ',' + lat, geometryType: 'esriGeometryPoint', inSR: '4326', distance: String(radius), units: 'esriSRUnit_Meter',
      spatialRel: 'esriSpatialRelIntersects', where: 'ACTIVE = 1', outFields: ['TRFC_STATN_ID', 'ON_ROAD', 'AADT_RPT_YEAR', 'AADT_RPT_QTY', 'LATITUDE', 'LONGITUDE'].concat(HIST).join(','),
      returnGeometry: 'false', resultRecordCount: '200', f: 'json'
    });
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 12000);
    let j;
    try { j = await (await fetch(URL + '?' + q, { signal: ctl.signal })).json(); } finally { clearTimeout(timer); }
    if (j.error) throw new Error(j.error.message || 'service error');
    const list = (j.features || []).map(f => shape(f.attributes, lat, lng)).filter(s => s.aadt > 0 && s.lat != null).sort((x, y) => x.dist - y.dist);
    cache.set(key, list);
    if (cache.size > 40) cache.delete(cache.keys().next().value);
    return list;
  }

  const k = n => n == null ? '—' : n >= 100000 ? Math.round(n / 1000) + 'K' : n >= 10000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K' : n >= 1000 ? (n / 1000).toFixed(1) + 'K' : String(n);
  const full = n => n == null ? '—' : n.toLocaleString('en-US');
  const pct = t => t == null ? '' : (t >= 0 ? '+' : '') + Math.round(t * 100) + '%';
  // the main road by a spot: the busiest whole-road station within reach
  const main = list => (list || []).filter(s => !s.sub && s.dist < 600).sort((x, y) => y.aadt - x.aadt)[0] || (list || []).filter(s => !s.sub)[0] || null;

  return { near, k, full, pct, main, meters };
})();
