/* =============================================================
   RECON.OS RX-90 · GAME · BREAKOUT
   FN › GAME. The drum is the paddle: drag it and the paddle follows
   your thumb dot for dot; flick it and the paddle glides on the
   drum's momentum. MARK serves (and starts again after GAME OVER),
   a tap on the drum pauses, MENU leaves (the game waits, paused).
   Every hit goes through the sound folders (P1–P5), so the grille
   dances with it; clearing a wall fills the grille, losing the last
   ball drains it. The LCD keeps score; the best score is remembered.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const U = RX.ui, C = U.C;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const HI_KEY = 'recon.os.breakoutHi';
  const ROWS = ['#FF6B5E', '#FF9A4D', '#FFB547', '#DDF07A', '#7DFFD6', '#3FCFA8', '#8FD3FF', '#E9FFF7'];
  const PW = 24, BALL = 2, BASE = 0.085, TOP = 0.17;   // paddle width (dots), ball size, speed in dots per ms
  let hi = 0; try { hi = parseInt(localStorage.getItem(HI_KEY) || '0', 10) || 0; } catch (e) {}
  const grille = k => { try { if (RX.grille) RX.grille.event(k); } catch (e) {} };

  // one game lives here, so leaving and coming back finds it where you left it (paused)
  const G = { state: 'new', W: 0, H: 0 };

  function layout(W, H) {
    G.W = W; G.H = H; G.py = H - 17;
    if (G.px == null) G.px = Math.round((W - PW) / 2);
    G.px = clamp(G.px, 0, W - PW);
  }
  function wall(level) {
    const cols = 10, rows = Math.min(5 + level, 8), gap = 1;
    const bw = Math.floor((G.W - 2 - gap * (cols - 1)) / cols), bh = 4;
    const x0 = Math.floor((G.W - (bw * cols + gap * (cols - 1))) / 2), y0 = 17;
    const b = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      // later walls get gaps and tough bricks (two hits, they glow white until cracked)
      if (level >= 3 && (r + c + level) % 7 === 0) continue;
      const tough = level >= 2 && r === 0;
      b.push({ x: x0 + c * (bw + gap), y: y0 + r * (bh + gap), w: bw, h: bh, hp: tough ? 2 : 1, col: ROWS[r % ROWS.length], pts: (rows - r) * 10 });
    }
    return b;
  }
  function newGame() {
    Object.assign(G, { state: 'serve', score: 0, balls: 3, level: 1, parts: [] });
    G.bricks = wall(1); serve();
  }
  function serve() { G.state = 'serve'; G.speed = BASE + (G.level - 1) * 0.01; G.bx = G.px + PW / 2 - 1; G.by = G.py - BALL - 1; G.vx = 0; G.vy = 0; }
  function launch(A) {
    const a = (Math.random() * 0.6 - 0.3);
    G.vx = G.speed * Math.sin(a); G.vy = -G.speed * Math.cos(a); G.state = 'play'; A.beep('game.paddle');
  }
  function burst(x, y, col) { for (let i = 0; i < 7; i++) G.parts.push({ x, y, vx: (Math.random() - 0.5) * 0.08, vy: -Math.random() * 0.06, col, life: 500 + Math.random() * 300 }); }
  const saveHi = () => { if (G.score > hi) { hi = G.score; try { localStorage.setItem(HI_KEY, String(hi)); } catch (e) {} return true; } return false; };

  function step(dt, A) {
    // move in small steps so the ball never skips a brick
    let rest = dt;
    while (rest > 0 && G.state === 'play') {
      const s = Math.min(rest, 1 / Math.max(Math.abs(G.vx), Math.abs(G.vy), 0.001));
      rest -= s;
      const ox = G.bx, oy = G.by;
      G.bx += G.vx * s; G.by += G.vy * s;
      if (G.bx < 0) { G.bx = 0; G.vx = Math.abs(G.vx); A.beep('game.wall'); }
      if (G.bx + BALL > G.W) { G.bx = G.W - BALL; G.vx = -Math.abs(G.vx); A.beep('game.wall'); }
      if (G.by < 13) { G.by = 13; G.vy = Math.abs(G.vy); A.beep('game.wall'); }
      // the paddle: where it lands on the paddle sets the angle
      if (G.vy > 0 && oy + BALL <= G.py && G.by + BALL >= G.py && G.bx + BALL > G.px - 1 && G.bx < G.px + PW + 1) {
        const rel = clamp((G.bx + 1 - (G.px + PW / 2)) / (PW / 2), -1, 1), ang = rel * 1.05;
        G.speed = Math.min(TOP, G.speed * 1.012);
        G.vx = G.speed * Math.sin(ang); G.vy = -G.speed * Math.cos(ang); G.by = G.py - BALL;
        A.beep('game.paddle');
      }
      for (let i = 0; i < G.bricks.length; i++) {
        const k = G.bricks[i];
        if (G.bx + BALL <= k.x || G.bx >= k.x + k.w || G.by + BALL <= k.y || G.by >= k.y + k.h) continue;
        const wasOverX = ox + BALL > k.x && ox < k.x + k.w;
        if (wasOverX) { G.vy = -G.vy; G.by = oy; } else { G.vx = -G.vx; G.bx = ox; }
        k.hp--;
        if (k.hp <= 0) { G.bricks.splice(i, 1); G.score += k.pts; burst(k.x + k.w / 2, k.y + k.h / 2, k.col); A.beep('game.brick'); }
        else A.beep('game.wall');
        A.lcdDirty = true;
        break;
      }
      if (!G.bricks.length) {
        G.level++; G.score += 100; G.state = 'clear'; G.until = performance.now() + 1600;
        A.beep('game.clear'); grille('fast'); A.lcdDirty = true; return;
      }
      if (G.by > G.H - 11) {
        G.balls--; A.lcdDirty = true;
        if (G.balls <= 0) { G.state = 'over'; G.best = saveHi(); A.beep('game.over'); grille('mute'); }
        else { A.beep('game.miss'); serve(); }
        return;
      }
    }
  }

  RX.screens.game = {
    animating: () => true,
    jogLabels: () => ['◂ LEFT', 'RIGHT ▸', G.state === 'paused' ? 'PUSH ▸ RESUME' : 'PUSH ▸ PAUSE'],
    enter() { if (G.state === 'new' || !G.bricks) G.state = 'new'; },
    leave() { if (G.state === 'play') G.state = 'paused'; },
    // the drum hands over raw travel: the paddle follows the thumb (and the drum's coast) dot for dot
    drum(dx) { if (!G.W || G.state === 'paused' || G.state === 'over') return; G.px = clamp(G.px + dx * 0.9, 0, G.W - PW); },
    jog(d) { if (!G.W || G.state === 'paused') return; G.px = clamp(G.px + d * 10, 0, G.W - PW); },
    push(st, A) {
      if (G.state === 'play') { G.state = 'paused'; A.say('PAUSED · PUSH ▸ RESUME', 2000); }
      else if (G.state === 'paused') G.state = G.vy ? 'play' : 'serve';
    },
    onMarkKey(st, A) {
      if (G.state === 'new' || G.state === 'over') { newGame(); A.beep('key'); A.lcdDirty = true; return; }
      if (G.state === 'serve') launch(A);
      else if (G.state === 'paused') G.state = G.vy ? 'play' : 'serve';
    },
    lcd: () => ({ rows: [['SCORE', String(G.score || 0).padStart(5, '0')], ['HIGH', String(Math.max(hi, G.score || 0)).padStart(5, '0')], ['BALLS', G.state === 'new' ? '--' : String(Math.max(0, G.balls)) + ' · WALL ' + (G.level || 1)]], tag: 'GME' }),
    render(g, st, A) {
      const W = g.W, H = g.H, mx = g.mx, t = g.t;
      layout(W, H);
      const dt = clamp(t - (G.lt || t), 0, 34); G.lt = t;
      if (G.state === 'play') step(dt, A);
      if (G.state === 'serve') { G.bx = G.px + PW / 2 - 1; G.by = G.py - BALL - 1; }
      if (G.state === 'clear' && performance.now() > G.until) { G.bricks = wall(G.level); serve(); }
      document.getElementById('jogVal').textContent = 'W' + (G.level || 1);
      g.header('BREAKOUT', 'SC ' + String(G.score || 0).padStart(5, '0') + ' · HI ' + String(Math.max(hi, G.score || 0)).padStart(5, '0'));
      if (G.state !== 'new') {
        (G.bricks || []).forEach(k => {
          const c = k.hp > 1 ? C.hot : k.col;
          mx.rect(k.x, k.y, k.w, k.h, c, k.hp > 1 ? 1 : 0.85);
          mx.hline(k.x, k.y, k.w, '#FFFFFF', 0.25);
        });
        G.parts = (G.parts || []).filter(p => { p.life -= dt; p.vy += 0.00025 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.life > 0) mx.set(Math.round(p.x), Math.round(p.y), p.col, Math.min(1, p.life / 300)); return p.life > 0 && p.y < H; });
        mx.rect(Math.round(G.px), G.py, PW, 3, C.ink, 1); mx.hline(Math.round(G.px) + 1, G.py, PW - 2, C.hot, 1);
        if (G.state !== 'over') mx.rect(Math.round(G.bx), Math.round(G.by), BALL, BALL, C.hot, 1);
        for (let i = 0; i < Math.max(0, G.balls - 1); i++) mx.rect(2 + i * 6, H - 14, 4, 2, C.ink, 0.6);   // spare balls
      }
      const big = (s, c) => g.textC(s, W / 2, Math.round(H * 0.52), { s: 2, c });
      if (G.state === 'new') { big('BREAKOUT', C.ink); g.textC('MARK ▸ START', W / 2, Math.round(H * 0.52) + 22, { a: 0.7 }); }
      if (G.state === 'paused') big('PAUSED', C.amber);
      if (G.state === 'clear') big('WALL ' + (G.level - 1) + ' CLEAR', C.amber);
      if (G.state === 'over') { big('GAME OVER', C.red); g.textC(G.best ? 'NEW HIGH ' + String(hi).padStart(5, '0') : 'MARK ▸ AGAIN', W / 2, Math.round(H * 0.52) + 22, { c: G.best ? C.amber : C.ink, a: 0.85 }); }
      const foot = G.state === 'new' ? 'DRUM ▸ PADDLE · MARK ▸ START' : G.state === 'serve' ? 'MARK ▸ SERVE · DRUM ▸ MOVE' : G.state === 'paused' ? 'PUSH OR MARK ▸ RESUME · MENU ▸ LEAVE' : G.state === 'over' ? 'MARK ▸ NEW GAME' : 'PUSH ▸ PAUSE';
      g.footer(A.sayActive() ? A.statusShown(t) : foot);
      A.dirty = true;   // keep the frames coming while the game is on screen
    }
  };
})();
