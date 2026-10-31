/* =============================================================
   RECON.OS RX-90 · DOT MATRIX ENGINE
   A display is a grid of cells. Everything we draw sets cells.
   The cell grid is a tiny canvas (1 canvas px = 1 cell), scaled
   up with nearest-neighbour and cut into round/square dots by a
   CSS mask, so text, map and pins always land exactly on dots.
   A blurred copy underneath supplies the emitted-light bloom.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const cache = {};
  function rgb(hex) {
    if (Array.isArray(hex)) return hex;
    if (cache[hex]) return cache[hex];
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    cache[hex] = v;
    return v;
  }
  RX.rgb = rgb;

  function svgUri(svg) {
    return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
  }
  const MASK_ROUND = svgUri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><defs><radialGradient id='g'><stop offset='0.7' stop-color='#000'/><stop offset='0.88' stop-color='#000' stop-opacity='0.55'/><stop offset='1' stop-color='#000' stop-opacity='0'/></radialGradient></defs><circle cx='5' cy='5' r='4.75' fill='url(#g)'/></svg>");
  const MASK_SQUARE = svgUri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><rect x='0.6' y='0.6' width='8.8' height='8.8' rx='0.8' fill='#000'/></svg>");
  function ghostUri(shape, color) {
    return shape === 'square'
      ? svgUri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><rect x='0.8' y='0.8' width='8.4' height='8.4' rx='0.8' fill='" + color + "'/></svg>")
      : svgUri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 10'><circle cx='5' cy='5' r='3.2' fill='" + color + "'/></svg>");
  }

  class Matrix {
    /**
     * host: element that receives the display layers (position:relative)
     * opts: { pitch, shape:'round'|'square', ghost:'rgba()', bloom:{blur,opacity}|null, shadow:bool }
     */
    constructor(host, opts) {
      this.host = host;
      this.o = Object.assign({ pitch: 2, shape: 'round', ghost: 'rgba(90,255,205,0.07)', bloom: { blur: 3, opacity: 0.75 }, shadow: false }, opts || {});
      this.cols = 0; this.rows = 0; this.pitch = this.o.pitch;
      this.clipStack = [];
      this.clip = null;

      this.wrap = document.createElement('div');
      this.wrap.className = 'mx-wrap';
      this.ghostEl = document.createElement('div');
      this.ghostEl.className = 'mx-ghost';
      this.wrap.appendChild(this.ghostEl);

      if (this.o.shadow) {
        this.shadowCv = document.createElement('canvas');
        this.shadowCv.className = 'mx-shadow';
        this.wrap.appendChild(this.shadowCv);
      }
      if (this.o.bloom) {
        this.bloomCv = document.createElement('canvas');
        this.bloomCv.className = 'mx-bloom';
        this.wrap.appendChild(this.bloomCv);
      }
      this.cv = document.createElement('canvas');
      this.cv.className = 'mx-dots';
      this.wrap.appendChild(this.cv);
      host.appendChild(this.wrap);
      this.ctx = this.cv.getContext('2d');
      this.resize();
    }

    resize() {
      const r = this.host.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      // Snap pitch to whole device pixels so every dot is identical.
      this.pitch = Math.max(1, Math.round(this.o.pitch * dpr)) / dpr;
      const cols = Math.max(1, Math.floor(r.width / this.pitch));
      const rows = Math.max(1, Math.floor(r.height / this.pitch));
      if (cols === this.cols && rows === this.rows) return false;
      this.cols = cols; this.rows = rows;
      const w = cols * this.pitch, h = rows * this.pitch;
      const offX = Math.floor((r.width - w) / 2 * dpr) / dpr;
      const offY = Math.floor((r.height - h) / 2 * dpr) / dpr;
      Object.assign(this.wrap.style, { left: offX + 'px', top: offY + 'px', width: w + 'px', height: h + 'px' });
      const p = this.pitch + 'px ' + this.pitch + 'px';
      const mask = this.o.shape === 'square' ? MASK_SQUARE : MASK_ROUND;
      [this.cv, this.shadowCv].forEach(c => {
        if (!c) return;
        c.width = cols; c.height = rows;
        c.style.width = w + 'px'; c.style.height = h + 'px';
        c.style.webkitMaskImage = mask; c.style.maskImage = mask;
        c.style.webkitMaskSize = p; c.style.maskSize = p;
      });
      if (this.bloomCv) {
        this.bloomCv.width = cols; this.bloomCv.height = rows;
        this.bloomCv.style.width = w + 'px'; this.bloomCv.style.height = h + 'px';
        this.bloomCv.style.filter = 'blur(' + this.o.bloom.blur + 'px) saturate(1.25) brightness(1.25)';
        this.bloomCv.style.opacity = this.o.bloom.opacity;
        this.bloomCtx = this.bloomCv.getContext('2d');
      }
      if (this.shadowCv) this.shadowCtx = this.shadowCv.getContext('2d');
      this.ghostEl.style.backgroundImage = ghostUri(this.o.shape, this.o.ghost);
      this.ghostEl.style.backgroundSize = p;
      this.img = this.ctx.createImageData(cols, rows);
      this.buf = this.img.data;
      this.b32 = new Uint32Array(this.buf.buffer); this.shown = null;   // what's on the glass now, to skip re-sending an unchanged picture
      return true;
    }

    setGhost(color) {
      this.o.ghost = color;
      this.ghostEl.style.backgroundImage = ghostUri(this.o.shape, color);
    }

    // ---------- buffer primitives ----------
    clear() { this.buf.fill(0); }

    pushClip(x, y, w, h) {
      this.clipStack.push(this.clip);
      let c = { x0: x, y0: y, x1: x + w, y1: y + h };
      if (this.clip) c = { x0: Math.max(c.x0, this.clip.x0), y0: Math.max(c.y0, this.clip.y0), x1: Math.min(c.x1, this.clip.x1), y1: Math.min(c.y1, this.clip.y1) };
      this.clip = c;
    }
    popClip() { this.clip = this.clipStack.pop() || null; }

    set(x, y, c, a) {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
      const k = this.clip;
      if (k && (x < k.x0 || y < k.y0 || x >= k.x1 || y >= k.y1)) return;
      const i = (y * this.cols + x) * 4;
      const v = rgb(c);
      this.buf[i] = v[0]; this.buf[i + 1] = v[1]; this.buf[i + 2] = v[2];
      this.buf[i + 3] = a == null ? 255 : Math.max(0, Math.min(255, a * 255));
    }
    off(x, y) {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return;
      const k = this.clip;
      if (k && (x < k.x0 || y < k.y0 || x >= k.x1 || y >= k.y1)) return;
      this.buf[(y * this.cols + x) * 4 + 3] = 0;
    }
    alphaAt(x, y) {
      if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return 0;
      return this.buf[(y * this.cols + x) * 4 + 3] / 255;
    }

    rect(x, y, w, h, c, a) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, c, a); }
    clearRect(x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.off(i, j); }
    dimRect(x, y, w, h, f) {
      for (let j = Math.max(0, y); j < Math.min(this.rows, y + h); j++)
        for (let i = Math.max(0, x); i < Math.min(this.cols, x + w); i++) {
          const k = (j * this.cols + i) * 4 + 3; this.buf[k] = this.buf[k] * f;
        }
    }
    hline(x, y, w, c, a, dash) { for (let i = 0; i < w; i++) if (!dash || (i % dash) === 0) this.set(x + i, y, c, a); }
    vline(x, y, h, c, a, dash) { for (let j = 0; j < h; j++) if (!dash || (j % dash) === 0) this.set(x, y + j, c, a); }
    frame(x, y, w, h, c, a, dash) {
      this.hline(x, y, w, c, a, dash); this.hline(x, y + h - 1, w, c, a, dash);
      this.vline(x, y, h, c, a, dash); this.vline(x + w - 1, y, h, c, a, dash);
    }
    line(x0, y0, x1, y1, c, a, dash) {
      x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
      const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
      const dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      let err = dx + dy, n = 0, guard = 0;
      while (guard++ < 4000) {
        if (!dash || (n % dash) === 0) this.set(x0, y0, c, a);
        n++;
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }
    disc(cx, cy, r, c, a) {
      const R = Math.ceil(r) + 1, rr = (r + 0.25) * (r + 0.25);
      for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) if (i * i + j * j <= rr) this.set(cx + i, cy + j, c, a);
    }
    carve(cx, cy, r) {
      const R = Math.ceil(r) + 1, rr = (r + 0.25) * (r + 0.25);
      for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) if (i * i + j * j <= rr) this.off(cx + i, cy + j);
    }
    ring(cx, cy, r, c, a, dash) {
      const R = Math.ceil(r) + 1;
      for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
        const d = Math.sqrt(i * i + j * j);
        if (Math.abs(d - r) < 0.5 && (!dash || ((i + j + 64) % dash) === 0)) this.set(cx + i, cy + j, c, a);
      }
    }

    // ---------- text ----------
    // o: { c, a, s (scale), face:'std'|'mini', punch:bool }
    text(str, x, y, o) {
      o = o || {};
      const f = o.face === 'mini' ? RX.font.mini : RX.font.std;
      const s = o.s || 1;
      const c = o.c || '#7DFFD6';
      const a = o.a == null ? 1 : o.a;
      let cx = x;
      for (const ch of RX.font.norm(str)) {
        const g = f.glyphs[ch] || f.glyphs[f.fallback];
        for (let gy = 0; gy < f.h; gy++) {
          const row = g[gy];
          for (let gx = 0; gx < f.w; gx++) {
            if (!row[gx]) continue;
            for (let dy = 0; dy < s; dy++) for (let dx = 0; dx < s; dx++) {
              if (o.punch) this.off(cx + gx * s + dx, y + gy * s + dy);
              else this.set(cx + gx * s + dx, y + gy * s + dy, c, a);
            }
          }
        }
        cx += f.adv * s;
      }
      return cx - x - (f.adv - f.w) * s;
    }
    textR(str, xr, y, o) { const w = RX.font.measure(str, (o || {}).face, (o || {}).s); this.text(str, xr - w + 1, y, o); return w; }
    textC(str, cx, y, o) { const w = RX.font.measure(str, (o || {}).face, (o || {}).s); this.text(str, Math.round(cx - w / 2), y, o); return w; }

    // 7×7 symbol. punch=true clears cells (icon cut out of a lit disc).
    icon(name, x, y, o) {
      o = o || {};
      const g = RX.font.icons[name];
      if (!g) return;
      for (let j = 0; j < 7; j++) for (let i = 0; i < 7; i++) {
        if (!g[j][i]) continue;
        if (o.punch) this.off(x + i, y + j); else this.set(x + i, y + j, o.c || '#7DFFD6', o.a == null ? 1 : o.a);
      }
    }

    // shift the whole picture k rows (down when k > 0); the rows it leaves are dark
    shiftRows(k) {
      k = Math.round(k); if (!k) return;
      const W = this.cols * 4, n = this.rows;
      if (Math.abs(k) >= n) { this.buf.fill(0); return; }
      if (k > 0) { this.buf.copyWithin(k * W, 0, (n - k) * W); this.buf.fill(0, 0, k * W); }
      else { this.buf.copyWithin(0, -k * W, n * W); this.buf.fill(0, (n + k) * W); }
    }

    // phosphor afterglow: keep the picture now on the glass; for a moment it fades out under the next one
    keepGlow() { if (!this.buf) return; this.glow = new Uint8ClampedArray(this.buf); this.glowT = performance.now(); this.glowN = this.buf.length; }
    glowing() { return !!this.glow && performance.now() - this.glowT < 300; }

    // ---------- output ----------
    present() {
      const n = this.cols * this.rows, b = this.buf;
      // afterglow: where the old picture was brighter than the new one, it lingers and dies away
      if (this.glow) {
        const age = performance.now() - this.glowT;
        if (age >= 300 || this.glowN !== b.length) this.glow = null;
        else {
          const f = Math.pow(1 - age / 300, 2) * 0.5, g = this.glow;
          for (let i = 3; i < b.length; i += 4) { const ga = g[i] * f; if (ga > b[i]) { b[i - 3] = g[i - 3]; b[i - 2] = g[i - 2]; b[i - 1] = g[i - 1]; b[i] = ga; } }
        }
      }
      // lag (an STN LCD): each pixel eases toward what was drawn, darkening faster than it clears
      if (this.o.lag) {
        const t = performance.now();
        if (!this.lagA || this.lagA.length !== n) {
          this.lagA = new Float32Array(n); this.lagC = new Uint8ClampedArray(n * 3);
          for (let i = 0; i < n; i++) { this.lagA[i] = b[i * 4 + 3] / 255; this.lagC[i * 3] = b[i * 4]; this.lagC[i * 3 + 1] = b[i * 4 + 1]; this.lagC[i * 3 + 2] = b[i * 4 + 2]; }
          this.lagT = t;
        }
        const dt = Math.min(1000, t - this.lagT); this.lagT = t;
        const kr = 1 - Math.exp(-dt / this.o.lag.rise), kf = 1 - Math.exp(-dt / this.o.lag.fall);
        let moving = false;
        for (let i = 0; i < n; i++) {
          const j = i * 4, ta = b[j + 3] / 255;
          if (ta > 0) { this.lagC[i * 3] = b[j]; this.lagC[i * 3 + 1] = b[j + 1]; this.lagC[i * 3 + 2] = b[j + 2]; }
          let ca = this.lagA[i];
          const d = ta - ca;
          if (d > 0.01 || d < -0.01) { ca += d * (d > 0 ? kr : kf); moving = true; } else ca = ta;
          this.lagA[i] = ca;
          b[j] = this.lagC[i * 3]; b[j + 1] = this.lagC[i * 3 + 1]; b[j + 2] = this.lagC[i * 3 + 2]; b[j + 3] = ca * 255;
        }
        this.settling = moving;
      }
      // nothing changed since the last frame: leave the glass (and its bloom and shadow layers) as they are
      const b32 = this.b32;
      if (this.shown && this.shown.length === b32.length) {
        const s = this.shown; let same = true;
        for (let i = 0; i < b32.length; i++) if (b32[i] !== s[i]) { same = false; break; }
        if (same) return;
        s.set(b32);
      } else this.shown = new Uint32Array(b32);
      this.ctx.putImageData(this.img, 0, 0);
      if (this.bloomCtx) {
        this.bloomCtx.clearRect(0, 0, this.cols, this.rows);
        this.bloomCtx.drawImage(this.cv, 0, 0);
      }
      if (this.shadowCtx) {
        this.shadowCtx.clearRect(0, 0, this.cols, this.rows);
        this.shadowCtx.drawImage(this.cv, 0, 0);
      }
    }
  }

  RX.Matrix = Matrix;
})();
