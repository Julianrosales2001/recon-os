/* =============================================================
   RECON.OS RX-90 · GEO
   Distance/bearing math, Web Mercator projection, real place
   names (area · city · metro) and place search via OpenStreetMap
   Nominatim (free; keep requests to ~1/sec).
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const R = 6371000, D2R = Math.PI / 180;
  const G = {};

  G.meters = function (lat1, lng1, lat2, lng2) {
    const dLat = (lat2 - lat1) * D2R, dLng = (lng2 - lng1) * D2R;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * D2R) * Math.cos(lat2 * D2R) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };
  G.bearing = function (lat1, lng1, lat2, lng2) {
    const y = Math.sin((lng2 - lng1) * D2R) * Math.cos(lat2 * D2R);
    const x = Math.cos(lat1 * D2R) * Math.sin(lat2 * D2R) - Math.sin(lat1 * D2R) * Math.cos(lat2 * D2R) * Math.cos((lng2 - lng1) * D2R);
    return (Math.atan2(y, x) / D2R + 360) % 360;
  };
  G.cardinal = deg => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(((deg % 360) + 360) % 360 / 45) % 8];
  G.fmtDist = function (m) {
    if (m == null || isNaN(m)) return '--';
    const ft = m * 3.28084;
    if (ft < 1000) return (Math.round(ft / 10) * 10) + 'FT';
    const mi = m / 1609.344;
    return (mi < 10 ? mi.toFixed(1) : Math.round(mi)) + 'MI';
  };

  // ---------- Web Mercator (256px tiles) ----------
  G.project = function (lat, lng, z) {
    const s = 256 * Math.pow(2, z);
    const sin = Math.sin(Math.max(-85.0511, Math.min(85.0511, lat)) * D2R);
    return { x: (lng + 180) / 360 * s, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s };
  };
  G.unproject = function (x, y, z) {
    const s = 256 * Math.pow(2, z);
    const lng = x / s * 360 - 180;
    const n = Math.PI - 2 * Math.PI * y / s;
    return { lat: Math.atan(Math.sinh(n)) / D2R, lng };
  };
  G.metersPerPx = (lat, z) => 156543.03392 * Math.cos(lat * D2R) / Math.pow(2, z);

  // ---------- metro areas by county ----------
  const METROS = {
    HOUSTON: ['Harris', 'Fort Bend', 'Montgomery', 'Brazoria', 'Galveston', 'Liberty', 'Waller', 'Chambers', 'Austin'],
    'DALLAS-FT WORTH': ['Dallas', 'Tarrant', 'Collin', 'Denton', 'Ellis', 'Johnson', 'Kaufman', 'Parker', 'Rockwall', 'Wise', 'Hunt', 'Hood', 'Somervell'],
    'SAN ANTONIO': ['Bexar', 'Comal', 'Guadalupe', 'Wilson', 'Medina', 'Atascosa', 'Bandera', 'Kendall'],
    AUSTIN: ['Travis', 'Williamson', 'Hays', 'Bastrop', 'Caldwell'],
    BEAUMONT: ['Jefferson', 'Orange', 'Hardin', 'Newton'],
    'CORPUS CHRISTI': ['Nueces', 'San Patricio'],
    'EL PASO': ['El Paso'],
    'COLLEGE STATION': ['Brazos', 'Burleson', 'Robertson'],
    'NEW ORLEANS': ['Orleans Parish', 'Jefferson Parish', 'St. Tammany Parish', 'St. Bernard Parish', 'St. Charles Parish'],
    'LAKE CHARLES': ['Calcasieu Parish', 'Cameron Parish']
  };
  const COUNTY_TO_METRO = {};
  Object.keys(METROS).forEach(m => METROS[m].forEach(c => { COUNTY_TO_METRO[c.toUpperCase()] = m; }));
  const STATE_ABBR = { Texas: 'TX', Louisiana: 'LA', Oklahoma: 'OK', 'New Mexico': 'NM', Arkansas: 'AR', California: 'CA', Florida: 'FL', 'New York': 'NY', Colorado: 'CO', Arizona: 'AZ', Georgia: 'GA', Illinois: 'IL', Tennessee: 'TN', Alabama: 'AL', Mississippi: 'MS', Nevada: 'NV' };

  function placeFromAddress(addr, display) {
    addr = addr || {};
    const county = (addr.county || '').replace(/ County$/i, '');
    const city = addr.city || addr.town || addr.village || addr.municipality || (county ? county + ' CO' : '') || addr.state || '';
    const st = STATE_ABBR[addr.state] || (addr.state ? addr.state.slice(0, 2) : '');
    const area = addr.neighbourhood || addr.suburb || addr.quarter || addr.hamlet || addr.residential ||
      addr.industrial || addr.commercial || addr.retail || addr.road || '';
    const countyKey = (addr.county || '').replace(/ County$/i, '').toUpperCase();
    const parishKey = (addr.county || '').toUpperCase();
    const metro = COUNTY_TO_METRO[countyKey] || COUNTY_TO_METRO[parishKey] || (county ? county.toUpperCase() + ' CO' : (addr.state || '').toUpperCase());
    // v1 region naming (city/town, else county/state) kept for compatibility.
    const regionName = (addr.city || addr.town || addr.village || addr.county || addr.state || '').toUpperCase();
    return {
      area: (area || city).toUpperCase(),
      city: (city + (st ? ', ' + st : '')).toUpperCase(),
      metro: metro.toUpperCase(),
      regionName,
      road: (addr.road || '').toUpperCase(),
      house: addr.house_number || '',
      display: display || ''
    };
  }

  let lastReq = 0;
  async function nominatim(url) {
    const wait = Math.max(0, 1100 - (Date.now() - lastReq));
    if (wait) await new Promise(r => setTimeout(r, wait));
    lastReq = Date.now();
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  G.reverse = async function (lat, lng, zoom) {
    try {
      const data = await nominatim('https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=' + (zoom || 16) +
        '&lat=' + lat.toFixed(6) + '&lon=' + lng.toFixed(6));
      if (!data || !data.address) return null;
      return placeFromAddress(data.address, data.display_name);
    } catch (e) { return null; }
  };

  G.search = async function (q, near) {
    let url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=8&q=' + encodeURIComponent(q);
    if (near) {
      const d = 0.6;
      url += '&viewbox=' + (near.lng - d) + ',' + (near.lat + d) + ',' + (near.lng + d) + ',' + (near.lat - d);
    }
    const data = await nominatim(url);
    return (data || []).map(r => {
      const p = placeFromAddress(r.address, r.display_name);
      const name = (r.name || (r.display_name || '').split(',')[0] || '').toUpperCase();
      return { lat: +r.lat, lng: +r.lon, name, kind: (r.type || r.category || '').toUpperCase().replace(/_/g, ' '), where: p.city };
    });
  };

  G.parseCoords = function (s) {
    const m = String(s).trim().match(/^(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)$/);
    if (!m) return null;
    const lat = +m[1], lng = +m[2];
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
    return { lat, lng };
  };

  RX.geo = G;
})();
