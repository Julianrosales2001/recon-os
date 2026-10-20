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
      county: county.toUpperCase() + (county && !/PARISH/i.test(county) ? ' CO' : ''),
      town: (city || '').toUpperCase(), st, postcode: addr.postcode || '',
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

  // ---------- place + address search ----------
  // OpenStreetMap often knows the street but not the house number, so a plain address query comes back as the
  // same street several times. For anything that starts with a house number we also ask the US Census
  // geocoder (TIGER address ranges, nearly every US street; JSONP because it doesn't allow cross-origin
  // fetch), add the town you're in when you didn't type one, and fold the repeated street hits into one.
  const isAddrQ = q => /^\s*\d+[A-Z]?(?:-\d+)?\s+[A-Z0-9]/i.test(q);
  const hasLocality = q => /,|\b\d{5}\b|\b[A-Z]{2}\s*$/i.test(String(q).trim());
  const normKey = s => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '');

  function jsonp(url, ms) {
    return new Promise((resolve, reject) => {
      const cb = '__rxgeo' + Date.now().toString(36) + Math.floor(Math.random() * 1e6);
      const sc = document.createElement('script');
      let t = 0;
      const done = (err, data) => { clearTimeout(t); window[cb] = () => {}; sc.remove(); if (err) reject(err); else resolve(data); };
      t = setTimeout(() => done(new Error('timeout')), ms || 9000);
      window[cb] = data => done(null, data);
      sc.onerror = () => done(new Error('load'));
      sc.src = url + '&format=jsonp&callback=' + cb;
      document.head.appendChild(sc);
    });
  }
  async function census(q) {
    const data = await jsonp('https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?benchmark=Public_AR_Current&address=' + encodeURIComponent(q), 9000);
    const m = (data && data.result && data.result.addressMatches) || [];
    return m.map(x => {
      const parts = String(x.matchedAddress || '').split(',').map(t => t.trim());
      return { lat: +x.coordinates.y, lng: +x.coordinates.x, name: (parts[0] || '').toUpperCase(), kind: 'ADDRESS', where: [parts[1], [parts[2], parts[3]].filter(Boolean).join(' ')].filter(Boolean).join(', ').toUpperCase(), rank: 0, src: 'census' };
    }).filter(r => Number.isFinite(r.lat) && Number.isFinite(r.lng));
  }
  async function nomSearch(q, near) {
    let url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=10&q=' + encodeURIComponent(q);
    if (near) {
      const d = 0.6;
      url += '&viewbox=' + (near.lng - d) + ',' + (near.lat + d) + ',' + (near.lng + d) + ',' + (near.lat - d);
    }
    const data = await nominatim(url);
    return (data || []).map(r => {
      const a = r.address || {}, p = placeFromAddress(a, r.display_name);
      const house = a.house_number && (a.road || a.pedestrian || a.footway);
      const street = r.category === 'highway' || r.class === 'highway' || r.addresstype === 'road';
      let name, kind, rank;
      if (house) { name = (a.house_number + ' ' + (a.road || a.pedestrian || a.footway)).toUpperCase(); kind = 'ADDRESS'; rank = 0; }
      else if (street) { name = (r.name || a.road || (r.display_name || '').split(',')[0] || '').toUpperCase(); kind = 'STREET'; rank = 2; }
      else { name = (r.name || (r.display_name || '').split(',')[0] || '').toUpperCase(); kind = (r.type || r.category || '').toUpperCase().replace(/_/g, ' '); rank = 1; }
      const where = p.city + (house && a.postcode ? ' ' + a.postcode : '');
      return { lat: +r.lat, lng: +r.lon, name, kind, where, rank, src: 'osm' };
    });
  }
  let locCache = null;
  async function localityNear(near) {
    if (!near) return '';
    if (locCache && G.meters(locCache.lat, locCache.lng, near.lat, near.lng) < 5000) return locCache.city;
    const r = await G.reverse(near.lat, near.lng, 10);
    if (r && r.city) { locCache = { lat: near.lat, lng: near.lng, city: r.city }; return r.city; }
    return '';
  }
  G.search = async function (q, near, place) {
    q = String(q || '').trim();
    const addr = isAddrQ(q);
    let q2 = q;
    if (addr && !hasLocality(q)) {
      const loc = (place && place.city) || await localityNear(near).catch(() => '');
      if (loc) q2 = q + ', ' + loc;
    }
    const [nom, cen] = await Promise.allSettled([nomSearch(q2, near), addr ? census(q2) : Promise.resolve([])]);
    if (nom.status === 'rejected' && (cen.status === 'rejected' || !cen.value.length)) throw nom.reason;
    let out = (cen.status === 'fulfilled' ? cen.value : []).concat(nom.status === 'fulfilled' ? nom.value : []);
    // the town we added may be the wrong one: try the address as typed before giving up on a house match
    if (addr && q2 !== q && !out.some(r => r.rank === 0)) {
      const plain = await nomSearch(q, near).catch(() => []);
      out = out.concat(plain);
    }
    const ref = near || (out[0] ? { lat: out[0].lat, lng: out[0].lng } : { lat: 0, lng: 0 });
    const dist = r => G.meters(ref.lat, ref.lng, r.lat, r.lng);
    // the same street comes back once per OSM segment: keep the nearest one
    const res = [], seenStreet = new Map();
    const num = r => (String(r.name).match(/^(\d+)/) || [])[1];
    out.sort((a, b) => a.rank - b.rank || (a.src === b.src ? 0 : a.src === 'osm' ? -1 : 1) || dist(a) - dist(b)).forEach(r => {
      if (!r.name) return;
      if (r.rank === 2) { const k = normKey(r.name); if (seenStreet.has(k)) return; seenStreet.set(k, true); }
      // the same house from both sources (W vs WEST, AVE vs AVENUE): OSM's exact building point wins over the Census estimate
      if (r.rank === 0 && res.some(x => x.rank === 0 && num(x) && num(x) === num(r) && G.meters(x.lat, x.lng, r.lat, r.lng) < 150)) return;
      if (res.some(x => normKey(x.name) === normKey(r.name) && G.meters(x.lat, x.lng, r.lat, r.lng) < 250)) return;
      res.push(r);
    });
    const houses = res.filter(r => r.rank === 0);
    if (addr && houses.length) return res.filter(r => r.rank !== 2);
    if (addr) res.forEach(r => { if (r.rank === 2) r.kind = 'STREET · NO HOUSE MATCH'; });
    return res;
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
