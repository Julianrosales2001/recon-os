/* =============================================================
   RECON.OS RX-90 · READOUT MOTION
   How text changes on the two small readouts.
   LCD (the STN panel, top left): a value never just swaps.
     SLIDE · a new page (tap the LCD, a screen with its own LCD)
             and place names (CITY, ROAD, LOT …) glide in sideways
     FLIP  · numbers and times flip only the characters that changed,
             like an airport board
     RAIN  · messages that arrive (CAL) and other words drop in from
             the top while the old ones fall out
   The panel itself is slow, like a real LCD: pixels take a beat to
   darken and fade (Matrix lag, js/matrix.js).
   CLOCK (amber VFD): only the digits that changed flip; the colon
   breathes instead of blinking.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOut = p => 1 - Math.pow(1 - clamp(p, 0, 1), 3);
  const eio = p => { p = clamp(p, 0, 1); return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; };
  const LOC = /^(CITY|ROAD|CNTY|TRCT|LOT|SPOT|TGT|OWNR|PARK|AREA|ZIP|ST)$/;
  const DIG = '0123456789', ALL = 'ABCDEFGHKMNPRSTXZ0123456789';
  const ADV = 6, GH = 7;
  const R = RX.readout = {};
  let lcdBusy = false, lastPage = null;
  const rows = [];

  // a string's lit dots, cached (STD face, 5×7 on a 6-dot advance)
  const masks = {};
  function mask(str) {
    if (masks[str]) return masks[str];
    const f = RX.font.std, pts = [];
    [...RX.font.norm(str)].forEach((ch, k) => {
      const g = f.glyphs[ch] || f.glyphs[f.fallback];
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (g[y][x]) pts.push([k * ADV + x, y]);
    });
    const out = { pts, chars: [...RX.font.norm(str)] };
    if (Object.keys(masks).length > 400) for (const k in masks) delete masks[k];
    return (masks[str] = out);
  }
  const digitish = s => { const t = s.replace(/[^A-Z0-9]/g, ''); return t.length > 0 && t.replace(/[^0-9]/g, '').length / t.length >= 0.35; };
  // same length and every change is a digit turning into a digit (76° CLEAR → 77° CLEAR)
  const onlyDigits = (a, b) => { a = [...a]; b = [...b]; if (a.length !== b.length) return false; let any = false; for (let k = 0; k < a.length; k++) if (a[k] !== b[k]) { if (!DIG.includes(a[k]) || !DIG.includes(b[k])) return false; any = true; } return any; };
  const rnd = (i, k) => { let s = (i * 977 + k * 31) | 0; s = Math.imul(s ^ (s >>> 15), 2246822519); s = Math.imul(s ^ (s >>> 13), 3266489917); return ((s ^ (s >>> 16)) >>> 0) / 4294967296; };

  // ---------- LCD ----------
  // once per render: the page is what's being shown (its tag + labels); a new page slides in
  R.lcdBegin = function (page, isMsg) {
    R.pageChanged = lastPage !== null && page !== lastPage;
    R.isMsg = !!isMsg;
    lastPage = page; lcdBusy = false;
  };
  R.lcdRow = function (m, i, label, str, x, y, maxW, ink, now) {
    let r = rows[i];
    if (!r) { r = rows[i] = { to: str, from: str, fx: null, t0: 0 }; }
    if (str !== r.to) {
      const fx = R.pageChanged ? (R.isMsg ? 'rain' : 'slide')
        : LOC.test(label || '') ? 'slide'
        : (onlyDigits(r.to, str) || (digitish(str) && digitish(r.to))) ? 'flip' : 'rain';
      r.from = r.to; r.to = str; r.fx = fx; r.t0 = now;
      r.seed = (now | 0) % 9973;
    }
    const W = maxW + 1;
    m.pushClip(x, y, W, GH);
    const e = now - r.t0;
    let done = true;
    if (r.fx === 'slide') {
      const s = Math.round(eio(e / 520) * (W + ADV));
      m.text(r.from, x - s, y, { c: ink }); m.text(r.to, x + W + ADV - s, y, { c: ink });
      done = e > 540;
    } else if (r.fx === 'flip') {
      const a = mask(r.to).chars, b = mask(r.from).chars;
      for (let k = 0; k < a.length; k++) {
        let ch = a[k];
        const st = 150 + k * 45;
        if (a[k] !== b[k] && a[k] !== ' ' && e < st) { const set = DIG.includes(a[k]) ? DIG : ALL; ch = set[Math.floor(rnd(k + r.seed, Math.floor(e / 55)) * set.length)]; }
        m.text(ch, x + k * ADV, y, { c: ink });
      }
      done = e > 150 + a.length * 45 + 40;
    } else if (r.fx === 'rain') {
      const A = mask(r.from).pts, B = mask(r.to).pts;
      const del = c => c * 7 + rnd(c, r.seed) * 70;
      A.forEach(([px, py]) => { const l = e - del(px); if (l < 0) m.set(x + px, y + py, ink); else if (l < 170) { const yy = py + Math.round(l / 170 * GH); if (yy < GH) m.set(x + px, y + yy, ink); } });
      B.forEach(([px, py]) => { const l = e - del(px); if (l < 0) return; const off = Math.round((1 - easeOut(l / 260)) * -GH); if (py + off >= 0) m.set(x + px, y + py + off, ink); });
      done = e > W * 7 + 70 + 280;
    } else m.text(r.to, x, y, { c: ink });
    m.popClip();
    if (done) r.fx = null; else lcdBusy = true;
  };
  R.lcdBusy = () => lcdBusy;

  // ---------- CLOCK ----------
  const flips = {};
  // draws str with only its changed characters flipping; align: 'l' (x is the left) or 'r' (x is the right edge)
  R.flipText = function (m, key, str, x, y, o, now, align) {
    str = RX.font.norm(str);
    let f = flips[key];
    if (!f) f = flips[key] = { s: str, t: [] };
    if (f.s !== str) {
      const a = [...str], b = [...f.s];
      if (a.length === b.length) a.forEach((ch, k) => { if (ch !== b[k] && DIG.includes(ch)) f.t[k] = now; });
      else f.t = [];
      f.s = str;
    }
    const s = (o && o.s) || 1, chars = [...str];
    const w = RX.font.measure(str, 'std', s);
    const x0 = align === 'r' ? x - w + 1 : x;
    let busy = false;
    chars.forEach((ch, k) => {
      const t0 = f.t[k];
      if (t0 != null && now - t0 < 320) { ch = DIG[Math.floor(rnd(k + (t0 | 0), Math.floor((now - t0) / 50)) * 10)]; busy = true; }
      m.text(ch, x0 + k * ADV * s, y, o);
    });
    return busy;
  };
  // ---------- ODOMETER ----------
  // el's text is set from all over (the map, the compass, the meter …). Whenever it changes, the old value rolls
  // out and the new one rolls in: up when the number grew, down when it shrank, like a printed number band.
  R.rollText = function (el) {
    if (!el || !window.MutationObserver) return;
    let shown = el.textContent, roll = null, raf = 0, writing = false;
    const num = t => { const m = String(t).match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };
    const esc = t => String(t).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    function write(html) { writing = true; el.innerHTML = html; mo.takeRecords(); writing = false; }
    function draw(t) {
      if (!roll) return false;
      const p = Math.min(1, (t - roll.t0) / 180), e = 1 - Math.pow(1 - p, 3), h = 11, dy = roll.dir;
      if (p >= 1) { roll = null; write(esc(shown)); return false; }
      write('<span class="rl-in" style="transform:translateY(' + ((1 - e) * dy * h).toFixed(1) + 'px)">' + esc(shown) + '</span>' +
            '<span class="rl-out" style="transform:translateY(' + (-e * dy * h).toFixed(1) + 'px)">' + esc(roll.from) + '</span>');
      return true;
    }
    function loop(t) { raf = 0; if (draw(t)) raf = requestAnimationFrame(loop); }
    const mo = new MutationObserver(() => {
      if (writing) return;
      const txt = el.textContent;
      if (txt !== shown) {
        const a = num(shown), b = num(txt);
        roll = { from: shown, t0: performance.now(), dir: a != null && b != null && b < a ? -1 : 1 };
        shown = txt;
      }
      if (roll && draw(performance.now()) && !raf) raf = requestAnimationFrame(loop);
    });
    mo.observe(el, { childList: true, characterData: true, subtree: true });
  };

  // the colon: 0.3 → 1 → 0.3 over two seconds, brightest on the even second
  R.colon = now => { const ms = Date.now() % 2000; return 0.3 + 0.7 * (0.5 + 0.5 * Math.cos(ms / 2000 * Math.PI * 2)); };
})();
