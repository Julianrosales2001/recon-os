/* =============================================================
   RECON.OS RX-90 · LCD GLANCES ON THE MAP
   Three readouts, tap the LCD to step through them:
   WX (weather) · AIR (air quality + UV) · NEXT (what's due).
   Weather and air come from Open-Meteo (free, no key), fetched
   for where you are every 15 minutes and kept for offline use.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const S = RX.store, F = RX.ui.F, Geo = RX.geo, M = RX.map;
  const KEY = 'recon.os.wxcache';
  let data = null, busy = false, lastTry = 0;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
  const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dir = deg => DIRS[Math.round(((deg % 360) + 360) % 360 / 45) % 8];
  const hm12 = ts => { const d = new Date(ts); let h = d.getHours(); const ap = h >= 12 ? 'P' : 'A'; h = h % 12 || 12; return h + (d.getMinutes() ? ':' + F.pad2(d.getMinutes()) : '') + ap; };

  // WMO weather codes → words + icon
  function sky(code, day) {
    if (code === 0) return ['CLEAR', day ? 'SUN' : 'MOON'];
    if (code === 1) return ['MOSTLY CLEAR', day ? 'SUN' : 'MOON'];
    if (code === 2) return ['PARTLY CLOUDY', day ? 'PART' : 'PARTN'];
    if (code === 3) return ['OVERCAST', 'CLOUD'];
    if (code === 45 || code === 48) return ['FOG', 'FOG'];
    if (code >= 51 && code <= 57) return ['DRIZZLE', 'RAIN'];
    if (code >= 61 && code <= 67) return [code >= 65 ? 'HEAVY RAIN' : 'RAIN', 'RAIN'];
    if (code >= 71 && code <= 77) return ['SNOW', 'SNOW'];
    if (code >= 80 && code <= 82) return ['SHOWERS', 'RAIN'];
    if (code >= 95) return ['T-STORMS', 'STORM'];
    return ['--', 'CLOUD'];
  }
  const aqiWord = a => a == null ? '--' : a <= 50 ? 'GOOD' : a <= 100 ? 'MODERATE' : a <= 150 ? 'SENSITIVE' : a <= 200 ? 'UNHEALTHY' : a <= 300 ? 'VERY BAD' : 'HAZARDOUS';
  const uvWord = u => u == null ? '--' : u < 3 ? 'LOW' : u < 6 ? 'MODERATE' : u < 8 ? 'HIGH' : u < 11 ? 'VERY HIGH' : 'EXTREME';

  function refresh(A, force) {
    const now = Date.now();
    if (busy || (!force && now - lastTry < 60000)) return;
    if (!force && data && now - data.t < 15 * 60000) return;
    const at = A.gps || S.v2.lastPos || { lat: M.lat, lng: M.lng };
    if (!at || at.lat == null) return;
    busy = true; lastTry = now;
    const ll = 'latitude=' + at.lat.toFixed(3) + '&longitude=' + at.lng.toFixed(3);
    const w = fetch('https://api.open-meteo.com/v1/forecast?' + ll + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m,precipitation,is_day&minutely_15=precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=1&forecast_minutely_15=12').then(r => r.json());
    const a = fetch('https://air-quality-api.open-meteo.com/v1/air-quality?' + ll + '&current=us_aqi,uv_index,pm2_5,ozone&hourly=uv_index&timezone=auto&forecast_days=1').then(r => r.json());
    Promise.allSettled([w, a]).then(([rw, ra]) => {
      const out = { t: Date.now() };
      if (rw.status === 'fulfilled' && rw.value && rw.value.current) {
        const c = rw.value.current, d = rw.value.daily || {}, mq = rw.value.minutely_15 || {};
        let rainIn = null;
        if (mq.time && mq.precipitation) for (let i = 0; i < mq.time.length; i++) { const ts = Date.parse(mq.time[i]); if (ts > Date.now() - 10 * 60000 && mq.precipitation[i] >= 0.01) { rainIn = Math.max(0, Math.round((ts - Date.now()) / 60000)); break; } }
        out.wx = { temp: c.temperature_2m, feels: c.apparent_temperature, hum: c.relative_humidity_2m, code: c.weather_code, wind: c.wind_speed_10m, wdir: c.wind_direction_10m, wet: c.precipitation > 0, day: c.is_day === 1,
          hi: d.temperature_2m_max ? d.temperature_2m_max[0] : null, lo: d.temperature_2m_min ? d.temperature_2m_min[0] : null, pop: d.precipitation_probability_max ? d.precipitation_probability_max[0] : null, rainIn };
      } else if (data && data.wx) out.wx = data.wx;
      if (ra.status === 'fulfilled' && ra.value && ra.value.current) {
        const c = ra.value.current, h = ra.value.hourly || {};
        let peak = null, peakT = null;
        if (h.uv_index) h.uv_index.forEach((u, i) => { if (u != null && (peak == null || u > peak)) { peak = u; peakT = Date.parse(h.time[i]); } });
        out.air = { aqi: c.us_aqi, uv: c.uv_index, pm: c.pm2_5, o3: c.ozone, peak, peakT };
      } else if (data && data.air) out.air = data.air;
      if (out.wx || out.air) { data = out; try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} }
    }).catch(() => {}).then(() => { busy = false; A.lcdDirty = true; });
  }

  // little 13×13 weather pictures for the LCD
  function icon(m, kind, x, y, c) {
    const P = (i, j) => m.set(x + i, y + j, c, 1);
    const sun = (cx, cy, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if (i * i + j * j <= r * r + 1) P(cx + i, cy + j); [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]].forEach(([a, b]) => { P(cx + a * (r + 2), cy + b * (r + 2)); if (!a || !b) P(cx + a * (r + 3), cy + b * (r + 3)); }); };
    const cloud = (ox, oy) => { const rows = ['00111100', '01111110', '11111111', '11111111']; const top = ['0001100000', '0011110110', '0111111111']; top.forEach((r, j) => [...r].forEach((v, i) => { if (v === '1') P(ox + i, oy + j); })); ['1111111111', '1111111111', '0111111110'].forEach((r, j) => [...r].forEach((v, i) => { if (v === '1') P(ox + i, oy + 3 + j); })); };
    const moon = () => { for (let j = -5; j <= 5; j++) for (let i = -5; i <= 5; i++) if (i * i + j * j <= 26 && (i - 3) * (i - 3) + (j + 2) * (j + 2) > 16) P(6 + i, 6 + j); };
    if (kind === 'SUN') sun(6, 6, 3);
    else if (kind === 'MOON') moon();
    else if (kind === 'PART') { sun(8, 4, 2); cloud(0, 6); }
    else if (kind === 'PARTN') { for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= 10 && (i - 2) * (i - 2) + (j + 1) * (j + 1) > 6) P(9 + i, 3 + j); cloud(0, 6); }
    else if (kind === 'CLOUD') cloud(1, 3);
    else if (kind === 'FOG') { for (let j = 2; j <= 10; j += 3) for (let i = (j % 2); i < 13; i++) if ((i + j) % 4) P(i, j); }
    else if (kind === 'RAIN') { cloud(1, 0); [[2, 8], [5, 9], [8, 8], [11, 9], [3, 11], [6, 12], [9, 11]].forEach(([a, b]) => P(a, b)); }
    else if (kind === 'STORM') { cloud(1, 0); [[6, 7], [5, 8], [4, 9], [6, 9], [7, 9], [6, 10], [5, 11], [4, 12]].forEach(([a, b]) => P(a, b)); }
    else if (kind === 'SNOW') { cloud(1, 0); [[2, 8], [6, 9], [10, 8], [4, 11], [8, 12], [12, 11]].forEach(([a, b]) => P(a, b)); }
  }

  // NEXT: the most pressing objective, then the small chores
  function next(A) {
    const h = A.gps || { lat: M.lat, lng: M.lng }, now = Date.now();
    const act = S.missions.filter(m => m.status === 'active');
    const score = m => (m.deadline && m.deadline < now ? 0 : m.priority === 'urgent' ? 1 : m.deadline ? 2 : 3);
    act.sort((a, b) => score(a) - score(b) || (a.deadline || Infinity) - (b.deadline || Infinity) || (a.created || 0) - (b.created || 0));
    const m = act[0];
    const chores = [];
    const pend = S.pending().length; if (pend) chores.push(pend + ' PEND');
    if (!S.v2.lastBackup || now - S.v2.lastBackup > 7 * 864e5) chores.push('BACKUP');
    if (act.length > 1) chores.push('+' + (act.length - 1) + ' OBJ');
    if (!m) return { rows: [['NEXT', 'QUEUE CLEAR'], ['', act.length ? '' : 'NO OPEN OBJECTIVES'], ['ALSO', chores.join(' · ') || 'NOTHING WAITING']], tag: 'NXT' };
    let when = 'NO DEADLINE';
    if (m.deadline) {
      const d = m.deadline - now, day = new Date(m.deadline);
      const sameDay = new Date().toDateString() === day.toDateString(), tmrw = new Date(now + 864e5).toDateString() === day.toDateString();
      when = d < 0 ? 'OVERDUE ' + F.ago(m.deadline).replace(' AGO', '') : sameDay ? 'TODAY ' + hm12(m.deadline) : tmrw ? 'TOMORROW ' + hm12(m.deadline) : F.day(m.deadline);
    } else if (m.priority === 'urgent') when = 'URGENT';
    if (m.lat != null && m.lng != null) when += ' · ' + Geo.fmtDist(Geo.meters(h.lat, h.lng, m.lat, m.lng));
    return { rows: [['NEXT', m.title || 'OBJECTIVE'], ['DUE', when], ['ALSO', chores.join(' · ') || 'NOTHING ELSE']], tag: 'NXT' };
  }

  // what the LCD shows for each glance; draw() handles the weather picture
  function lcd(A, which) {
    if (which === 'next') return next(A);
    refresh(A);
    const age = data ? Date.now() - data.t : null, stale = age != null && age > 3 * 3600e3;
    if (which === 'air') {
      const a = data && data.air;
      if (!a) return { rows: [['AQI', busy ? 'READING...' : 'NO SIGNAL'], ['UV', '--'], ['', '']], tag: 'AIR' };
      const pk = a.peak != null && a.peakT && a.peakT > Date.now() ? ' · ' + Math.round(a.peak) + ' AT ' + hm12(a.peakT) : '';
      return { rows: [['AQI', (a.aqi != null ? Math.round(a.aqi) : '--') + ' ' + aqiWord(a.aqi)], ['UV', (a.uv != null ? Math.round(a.uv) : '--') + ' ' + uvWord(a.uv) + pk], ['PART', stale ? 'AS OF ' + hm12(data.t) : 'PM2.5 ' + (a.pm != null ? Math.round(a.pm) : '--') + ' · O3 ' + (a.o3 != null ? Math.round(a.o3) : '--')]], tag: 'AIR' };
    }
    const w = data && data.wx;
    if (!w) return { rows: [['WX', busy ? 'READING...' : 'NO SIGNAL'], ['', ''], ['', '']], tag: 'WX' };
    const s = sky(w.code, w.day);
    const third = w.rainIn != null && !w.wet ? ['RAIN', 'IN ~' + Math.max(5, Math.round(w.rainIn / 5) * 5) + ' MIN'] : ['WIND', Math.round(w.wind) + ' ' + dir(w.wdir) + ' · HUM ' + Math.round(w.hum) + '%'];
    return {
      rows: [['', Math.round(w.temp) + '° ' + s[0]], ['', 'H' + Math.round(w.hi) + ' L' + Math.round(w.lo) + (w.pop != null ? ' · RAIN ' + Math.round(w.pop) + '%' : '')], stale ? ['', 'AS OF ' + hm12(data.t)] : third],
      tag: 'WX', icon: s[1]
    };
  }
  RX.wx = { lcd, icon, refresh, ORDER: ['wx', 'air', 'next'], NAMES: { wx: 'WEATHER', air: 'AIR · AQI · UV', next: 'NEXT UP' } };
})();
