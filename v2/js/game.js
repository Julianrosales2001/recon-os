/* =============================================================
   RECON.OS RX-90 · GAMES
   FN › GAME opens the cartridge picker: BREAKOUT and SNAKE.
   BREAKOUT · the drum is the paddle (dot for dot, with the drum's
     momentum). MARK serves; a tap on the drum pauses. Broken bricks
     sometimes drop a capsule — catch it with the paddle:
       M MULTI  three balls        W WIDE   a longer paddle
       L LASER  MARK fires         F FIRE   the ball burns through
       C CATCH  the ball sticks;   S SLOW   the ball calms down
                MARK lets it go    + 1UP    a spare ball
       and two to dodge: N NARROW (short paddle), Q QUICK (fast ball)
   SNAKE · each click of the drum turns the snake (right = clockwise),
     MARK is a short burst of speed, a tap on the drum pauses.
   MENU leaves; a game left mid-play waits, paused. Every hit plays
   through the P sound folders, so the grille dances with it.
   ============================================================= */
window.RX = window.RX || {};

(function () {
  const U = RX.ui, C = U.C;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad5 = n => String(Math.max(0, n | 0)).padStart(5, '0');
  const grille = k => { try { if (RX.grille) RX.grille.event(k); } catch (e) {} };
  const hiGet = k => { try { return parseInt(localStorage.getItem(k) || '0', 10) || 0; } catch (e) { return 0; } };
  const hiSet = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) {} };
  const HI = { bo: hiGet('recon.os.breakoutHi'), sn: hiGet('recon.os.snakeHi') };

  // ======================================================================
  // THE PICKER
  // ======================================================================
  const GAMES = [
    { id: 'breakout', name: 'BREAKOUT', blurb: 'DRUM IS THE PADDLE · CATCH THE POWERS', hi: () => HI.bo },
    { id: 'snake', name: 'SNAKE', blurb: 'DRUM CLICKS TURN · MARK BURSTS', hi: () => HI.sn }
  ];
  RX.screens.game = {
    jogLabels: () => ['◂ PREV', 'NEXT ▸', 'PUSH ▸ PLAY'],
    enter(st) { st.sel = st.sel || 0; },
    jog(d, st) { st.sel = clamp((st.sel || 0) + d, 0, GAMES.length - 1); },
    push(st, A) { A.go(GAMES[st.sel || 0].id); },
    onMarkKey(st, A) { A.beep('key'); A.go(GAMES[st.sel || 0].id); },
    lcd: () => ({ rows: [['GAMES', String(GAMES.length)], ['BRK', 'HI ' + pad5(HI.bo)], ['SNK', 'HI ' + pad5(HI.sn)]], tag: 'GME' }),
    render(g, st, A) {
      const W = g.W, mx = g.mx;
      document.getElementById('jogVal').textContent = (st.sel || 0) + 1 + '/' + GAMES.length;
      let y = g.header('GAMES', 'CARTRIDGE 0' + GAMES.length) + 6;
      GAMES.forEach((gm, i) => {
        const on = (st.sel || 0) === i, h = 34;
        mx.frame(2, y, W - 4, h, on ? C.hot : C.ink, on ? 1 : 0.35);
        if (on) mx.rect(3, y + 1, 2, h - 2, C.amber, 1);
        g.text(gm.name, 9, y + 5, { s: 2, c: on ? C.hot : C.ink, a: on ? 1 : 0.7 });
        g.mini(gm.blurb, 9, y + 22, { a: on ? 0.8 : 0.45 });
        g.miniR('HI ' + pad5(gm.hi()), W - 6, y + 6, { c: C.amber, a: on ? 0.95 : 0.5 });
        g.hit(2, y, W - 4, h, () => { st.sel = i; A.beep('key'); A.go(gm.id); });
        y += h + 5;
      });
      g.footer(A.sayActive() ? A.statusShown(g.t) : 'JOG ▸ PICK · PUSH OR MARK ▸ PLAY');
    }
  };

  // ======================================================================
  // BREAKOUT
  // ======================================================================
  const ROWS = ['#FF6B5E', '#FF9A4D', '#FFB547', '#DDF07A', '#7DFFD6', '#3FCFA8', '#8FD3FF', '#E9FFF7'];
  const BALL = 2, BASE = 0.085, TOP = 0.17;
  const POW = {
    M: { name: 'MULTI BALL', col: '#8FD3FF', w: 6 }, W: { name: 'WIDE PADDLE', col: '#7DFFD6', w: 6 },
    L: { name: 'LASER · MARK FIRES', col: '#FF6B5E', w: 5 }, F: { name: 'FIRE BALL', col: '#FF9A4D', w: 4 },
    C: { name: 'CATCH · MARK RELEASES', col: '#DDF07A', w: 5 }, S: { name: 'SLOW BALL', col: '#3FCFA8', w: 5 },
    '+': { name: 'EXTRA BALL', col: '#E9FFF7', w: 1.5 },
    N: { name: 'NARROW PADDLE', col: '#B48CFF', w: 3 }, Q: { name: 'QUICK BALL', col: '#FF5FA2', w: 3 }
  };
  const POW_BAG = []; Object.keys(POW).forEach(k => { for (let i = 0; i < POW[k].w * 2; i++) POW_BAG.push(k); });
  const B = { state: 'new', W: 0, H: 0 };
  const pw = () => { const n = performance.now(); return B.fx.N > n ? 16 : B.fx.W > n ? 38 : 24; };
  const on = k => B.fx[k] > performance.now();

  function wall(level) {
    const cols = 10, rows = Math.min(5 + level, 8), gap = 1;
    const bw = Math.floor((B.W - 2 - gap * (cols - 1)) / cols), bh = 4;
    const x0 = Math.floor((B.W - (bw * cols + gap * (cols - 1))) / 2), y0 = 17, out = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (level >= 3 && (r + c + level) % 7 === 0) continue;
      out.push({ x: x0 + c * (bw + gap), y: y0 + r * (bh + gap), w: bw, h: bh, hp: level >= 2 && r === 0 ? 2 : 1, col: ROWS[r % ROWS.length], pts: (rows - r) * 10 });
    }
    return out;
  }
  function newGame() {
    Object.assign(B, { state: 'serve', score: 0, spare: 2, level: 1, parts: [], caps: [], shots: [], fx: {}, best: false });
    B.bricks = wall(1); serve();
  }
  function serve() {
    B.state = 'serve'; B.speed = BASE + (B.level - 1) * 0.01;
    B.balls = [{ x: 0, y: 0, vx: 0, vy: 0, stuck: true, off: 0 }]; B.fx = {}; B.caps = []; B.shots = [];
  }
  function aim(b, rel) { const a = rel * 1.05; b.vx = B.speed * Math.sin(a); b.vy = -B.speed * Math.cos(a); }
  function release(A) {
    let any = false;
    B.balls.forEach(b => { if (b.stuck) { b.stuck = false; aim(b, clamp(b.off / (pw() / 2), -1, 1) * 0.6 + (Math.random() - 0.5) * 0.3); any = true; } });
    if (any) { B.state = 'play'; A.beep('game.paddle'); }
    return any;
  }
  function burst(x, y, col, n) { for (let i = 0; i < (n || 7); i++) B.parts.push({ x, y, vx: (Math.random() - 0.5) * 0.08, vy: -Math.random() * 0.06, col, life: 500 + Math.random() * 300 }); }
  function hitBrick(i, A) {
    const k = B.bricks[i];
    k.hp = on('F') ? 0 : k.hp - 1;
    if (k.hp > 0) { A.beep('game.wall'); return false; }
    B.bricks.splice(i, 1); B.score += k.pts; burst(k.x + k.w / 2, k.y + k.h / 2, k.col, on('F') ? 12 : 7); A.beep('game.brick'); A.lcdDirty = true;
    if (Math.random() < 0.14) B.caps.push({ x: k.x + k.w / 2 - 4, y: k.y, t: POW_BAG[Math.floor(Math.random() * POW_BAG.length)] });
    return true;
  }
  function take(t, A) {
    const n = performance.now();
    A.say('POWER ▸ ' + POW[t].name, 2200); A.beep('game.power'); A.lcdDirty = true;
    if (t === 'M') {
      const add = [];
      B.balls.forEach(b => { if (b.stuck) return; [-0.45, 0.45].forEach(da => { const s = Math.hypot(b.vx, b.vy) || B.speed, a = Math.atan2(b.vx, -b.vy) + da; add.push({ x: b.x, y: b.y, vx: s * Math.sin(a), vy: -Math.abs(s * Math.cos(a)), stuck: false }); }); });
      B.balls.push(...add.slice(0, Math.max(0, 9 - B.balls.length)));
    }
    if (t === 'W') { B.fx.W = n + 20000; B.fx.N = 0; }
    if (t === 'N') { B.fx.N = n + 12000; B.fx.W = 0; }
    if (t === 'L') B.fx.L = n + 15000;
    if (t === 'F') B.fx.F = n + 10000;
    if (t === 'C') B.fx.C = n + 20000;
    if (t === 'S') { B.speed = BASE; B.balls.forEach(b => { const s = Math.hypot(b.vx, b.vy); if (s) { b.vx *= BASE / s; b.vy *= BASE / s; } }); }
    if (t === 'Q') { B.speed = Math.min(TOP, B.speed * 1.35); B.balls.forEach(b => { const s = Math.hypot(b.vx, b.vy); if (s) { b.vx *= B.speed / s; b.vy *= B.speed / s; } }); }
    if (t === '+') B.spare = Math.min(B.spare + 1, 5);
  }
  function stepBall(b, dt, A) {
    let rest = dt;
    while (rest > 0 && !b.dead) {
      const s = Math.min(rest, 1 / Math.max(Math.abs(b.vx), Math.abs(b.vy), 0.001));
      rest -= s;
      const ox = b.x, oy = b.y, P = pw();
      b.x += b.vx * s; b.y += b.vy * s;
      if (b.x < 0) { b.x = 0; b.vx = Math.abs(b.vx); A.beep('game.wall'); }
      if (b.x + BALL > B.W) { b.x = B.W - BALL; b.vx = -Math.abs(b.vx); A.beep('game.wall'); }
      if (b.y < 13) { b.y = 13; b.vy = Math.abs(b.vy); A.beep('game.wall'); }
      if (b.vy > 0 && oy + BALL <= B.py && b.y + BALL >= B.py && b.x + BALL > B.px - 1 && b.x < B.px + P + 1) {
        const off = b.x + 1 - (B.px + P / 2);
        b.y = B.py - BALL;
        if (on('C')) { b.stuck = true; b.off = off; b.vx = b.vy = 0; A.beep('game.wall'); return; }
        B.speed = Math.min(TOP, B.speed * 1.012); aim(b, clamp(off / (P / 2), -1, 1)); A.beep('game.paddle');
      }
      for (let i = 0; i < B.bricks.length; i++) {
        const k = B.bricks[i];
        if (b.x + BALL <= k.x || b.x >= k.x + k.w || b.y + BALL <= k.y || b.y >= k.y + k.h) continue;
        const broke = hitBrick(i, A);
        if (!(broke && on('F'))) {   // fire burns straight through; anything else bounces
          if (ox + BALL > k.x && ox < k.x + k.w) { b.vy = -b.vy; b.y = oy; } else { b.vx = -b.vx; b.x = ox; }
        }
        break;
      }
      if (b.y > B.H - 11) b.dead = true;
    }
  }
  function stepBO(dt, A) {
    const P = pw();
    B.px = clamp(B.px, 0, B.W - P);
    B.balls.forEach(b => { if (b.stuck) { b.off = clamp(b.off || 0, -P / 2 + 1, P / 2 - 2); b.x = B.px + P / 2 + b.off - 1; b.y = B.py - BALL; } else if (B.state === 'play') stepBall(b, dt, A); });
    if (on('F')) B.balls.forEach(b => { if (!b.stuck && Math.random() < 0.6) B.parts.push({ x: b.x + 1, y: b.y + 1, vx: (Math.random() - 0.5) * 0.02, vy: 0.01, col: Math.random() < 0.5 ? '#FF6B5E' : '#FFB547', life: 180 }); });
    // capsules fall; the paddle catches them
    B.caps = B.caps.filter(c => { c.y += 0.045 * dt; if (c.y + 5 >= B.py && c.y <= B.py + 3 && c.x + 9 > B.px && c.x < B.px + P) { take(c.t, A); return false; } return c.y < B.H - 11; });
    // lasers climb until they hit something
    B.shots = B.shots.filter(s => { s.y -= 0.35 * dt; if (s.y < 13) return false; for (let i = 0; i < B.bricks.length; i++) { const k = B.bricks[i]; if (s.x >= k.x && s.x < k.x + k.w && s.y <= k.y + k.h && s.y >= k.y - 3) { hitBrick(i, A); return false; } } return true; });
    if (B.state !== 'play') return;
    if (!B.bricks.length) { B.level++; B.score += 100; B.state = 'clear'; B.until = performance.now() + 1600; A.beep('game.clear'); grille('fast'); A.lcdDirty = true; return; }
    B.balls = B.balls.filter(b => !b.dead);
    if (!B.balls.length) {
      A.lcdDirty = true;
      if (B.spare <= 0) { B.state = 'over'; if (B.score > HI.bo) { HI.bo = B.score; hiSet('recon.os.breakoutHi', HI.bo); B.best = true; } A.beep('game.over'); grille('mute'); }
      else { B.spare--; A.beep('game.miss'); serve(); }
    } else if (B.balls.every(b => b.stuck)) B.state = 'serve';
  }
  const fxTag = () => { const n = performance.now(); return ['L', 'F', 'C', 'W', 'N'].filter(k => B.fx && B.fx[k] > n).map(k => POW[k].name.split(' ')[0]).join(' ') || ''; };

  RX.screens.breakout = {
    animating: () => true,
    jogLabels: () => ['◂ LEFT', 'RIGHT ▸', B.state === 'paused' ? 'PUSH ▸ RESUME' : 'PUSH ▸ PAUSE'],
    leave() { if (B.state === 'play') B.state = 'paused'; },
    drum(dx) { if (!B.W || B.state === 'paused' || B.state === 'over' || B.state === 'new') return; B.px = clamp(B.px + dx * 0.9, 0, B.W - pw()); },
    jog(d) { if (!B.W || B.state === 'paused' || B.state === 'new') return; B.px = clamp(B.px + d * 10, 0, B.W - pw()); },
    push(st, A) {
      if (B.state === 'play') { B.state = 'paused'; }
      else if (B.state === 'paused') B.state = B.balls.some(b => !b.stuck) ? 'play' : 'serve';
    },
    onMarkKey(st, A) {
      if (B.state === 'new' || B.state === 'over') { newGame(); A.beep('key'); A.lcdDirty = true; return; }
      if (B.state === 'paused') { B.state = B.balls.some(b => !b.stuck) ? 'play' : 'serve'; return; }
      if (B.balls.some(b => b.stuck) && release(A)) return;
      if (B.state === 'play' && on('L') && B.shots.length < 6) { const P = pw(); B.shots.push({ x: Math.round(B.px) + 2, y: B.py - 1 }, { x: Math.round(B.px) + P - 3, y: B.py - 1 }); A.beep('game.laser'); }
    },
    lcd: () => ({ rows: [['SCORE', pad5(B.score || 0)], ['HIGH', pad5(Math.max(HI.bo, B.score || 0))], ['BALLS', B.state === 'new' ? '--' : (B.spare + 1) + ' · WALL ' + (B.level || 1) + (fxTag() ? ' · ' + fxTag() : '')]], tag: 'BRK' }),
    render(g, st, A) {
      const W = g.W, H = g.H, mx = g.mx, t = g.t;
      B.W = W; B.H = H; B.py = H - 17;
      if (!B.fx) B.fx = {};
      if (B.px == null) B.px = Math.round((W - 24) / 2);
      const dt = clamp(t - (B.lt || t), 0, 34); B.lt = t;
      if (B.state === 'play' || B.state === 'serve') stepBO(dt, A);
      if (B.state === 'clear' && performance.now() > B.until) { B.bricks = wall(B.level); serve(); }
      document.getElementById('jogVal').textContent = 'W' + (B.level || 1);
      g.header('BREAKOUT', 'SC ' + pad5(B.score || 0) + ' · HI ' + pad5(Math.max(HI.bo, B.score || 0)));
      if (B.state !== 'new') {
        (B.bricks || []).forEach(k => { mx.rect(k.x, k.y, k.w, k.h, k.hp > 1 ? C.hot : k.col, k.hp > 1 ? 1 : 0.85); mx.hline(k.x, k.y, k.w, '#FFFFFF', 0.25); });
        B.parts = (B.parts || []).filter(p => { p.life -= dt; p.vy += 0.00025 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.life > 0) mx.set(Math.round(p.x), Math.round(p.y), p.col, Math.min(1, p.life / 300)); return p.life > 0 && p.y < H; });
        (B.caps || []).forEach(c => { const P = POW[c.t], x = Math.round(c.x), y = Math.round(c.y), blink = Math.floor(t / 160) % 2; mx.rect(x, y, 9, 7, P.col, blink ? 1 : 0.75); mx.text(c.t, x + 2, y + 1, { face: 'mini', c: '#08100F', a: 1 }); });
        (B.shots || []).forEach(s => mx.vline(Math.round(s.x), Math.round(s.y) - 3, 4, C.red, 1));
        const P = pw(), px = Math.round(B.px);
        mx.rect(px, B.py, P, 3, on('C') ? '#DDF07A' : C.ink, 1); mx.hline(px + 1, B.py, P - 2, C.hot, 1);
        if (on('L')) { mx.rect(px + 1, B.py - 2, 2, 2, C.red, 1); mx.rect(px + P - 3, B.py - 2, 2, 2, C.red, 1); }
        if (B.state !== 'over') (B.balls || []).forEach(b => mx.rect(Math.round(b.x), Math.round(b.y), BALL, BALL, on('F') ? '#FFB547' : C.hot, 1));
        for (let i = 0; i < B.spare; i++) mx.rect(2 + i * 6, H - 14, 4, 2, C.ink, 0.6);
      }
      const cy = Math.round(H * 0.55), big = (s, c) => g.textC(s, W / 2, cy, { s: 2, c });
      if (B.state === 'new') { big('BREAKOUT', C.ink); g.textC('MARK ▸ START', W / 2, cy + 22, { a: 0.7 }); }
      if (B.state === 'paused') big('PAUSED', C.amber);
      if (B.state === 'clear') big('WALL ' + (B.level - 1) + ' CLEAR', C.amber);
      if (B.state === 'over') { big('GAME OVER', C.red); g.textC(B.best ? 'NEW HIGH ' + pad5(HI.bo) : 'MARK ▸ AGAIN', W / 2, cy + 22, { c: B.best ? C.amber : C.ink, a: 0.85 }); }
      const foot = B.state === 'new' ? 'DRUM ▸ PADDLE · MARK ▸ START' : B.state === 'serve' ? 'MARK ▸ SERVE · DRUM ▸ MOVE' : B.state === 'paused' ? 'PUSH OR MARK ▸ RESUME · MENU ▸ LEAVE' : B.state === 'over' ? 'MARK ▸ NEW GAME' : on('L') ? 'MARK ▸ FIRE' : 'PUSH ▸ PAUSE';
      g.footer(A.sayActive() ? A.statusShown(t) : foot);
      A.dirty = true;
    }
  };

  // ======================================================================
  // SNAKE
  // ======================================================================
  const CELL = 5;                              // 4 lit dots + a gap
  const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];   // right, down, left, up — clockwise
  const N = { state: 'new' };
  function snNew() {
    const cx = Math.floor(N.cols / 2), cy = Math.floor(N.rows / 2);
    Object.assign(N, { state: 'play', body: [[cx, cy], [cx - 1, cy], [cx - 2, cy], [cx - 3, cy]], dir: 0, turns: [], score: 0, eaten: 0, tick: 130, acc: 0, burst: 0, bonus: null, best: false });
    N.food = snFree();
  }
  function snFree() {
    for (let k = 0; k < 500; k++) { const p = [Math.floor(Math.random() * N.cols), Math.floor(Math.random() * N.rows)]; if (!N.body.some(b => b[0] === p[0] && b[1] === p[1])) return p; }
    return [0, 0];
  }
  function snStep(A) {
    if (N.turns.length) N.dir = N.turns.shift();
    const h = N.body[0], d = DIRS[N.dir], nx = h[0] + d[0], ny = h[1] + d[1];
    const grow = nx === N.food[0] && ny === N.food[1], bon = N.bonus && nx === N.bonus.p[0] && ny === N.bonus.p[1];
    const hitSelf = N.body.slice(0, grow ? N.body.length : N.body.length - 1).some(b => b[0] === nx && b[1] === ny);
    if (nx < 0 || ny < 0 || nx >= N.cols || ny >= N.rows || hitSelf) {
      N.state = 'over'; if (N.score > HI.sn) { HI.sn = N.score; hiSet('recon.os.snakeHi', HI.sn); N.best = true; }
      A.beep('game.over'); grille('mute'); A.lcdDirty = true; return;
    }
    N.body.unshift([nx, ny]);
    if (grow) {
      N.score += 10; N.eaten++; N.tick = Math.max(62, N.tick - 3); N.food = snFree(); A.beep('snake.eat'); A.lcdDirty = true;
      if (N.eaten % 5 === 0) N.bonus = { p: snFree(), until: performance.now() + 6000 };
    } else N.body.pop();
    if (bon) { N.score += 50; N.bonus = null; N.body.push(N.body[N.body.length - 1]); A.beep('game.power'); A.lcdDirty = true; }
  }
  RX.screens.snake = {
    animating: () => true,
    jogLabels: () => ['◂ TURN LEFT', 'TURN RIGHT ▸', N.state === 'paused' ? 'PUSH ▸ RESUME' : 'PUSH ▸ PAUSE'],
    leave() { if (N.state === 'play') N.state = 'paused'; },
    // a drum click turns a quarter: right is clockwise. Turns queue (two at most) so quick double turns land.
    jog(d, st, A) {
      if (N.state !== 'play' || N.turns.length >= 2) return;
      const last = N.turns.length ? N.turns[N.turns.length - 1] : N.dir;
      N.turns.push((last + (d > 0 ? 1 : 3)) % 4);
    },
    push() { if (N.state === 'play') N.state = 'paused'; else if (N.state === 'paused') N.state = 'play'; },
    onMarkKey(st, A) {
      if (N.state === 'new' || N.state === 'over') { snNew(); A.beep('key'); A.lcdDirty = true; return; }
      if (N.state === 'paused') { N.state = 'play'; return; }
      N.burst = performance.now() + 1200;
    },
    lcd: () => ({ rows: [['SCORE', pad5(N.score || 0)], ['HIGH', pad5(Math.max(HI.sn, N.score || 0))], ['LEN', N.body ? String(N.body.length) : '--']], tag: 'SNK' }),
    render(g, st, A) {
      const W = g.W, H = g.H, mx = g.mx, t = g.t;
      const top = 13, bot = H - 12;
      N.cols = Math.floor((W - 2) / CELL); N.rows = Math.floor((bot - top) / CELL);
      const ox = Math.floor((W - N.cols * CELL) / 2) + 1, oy = top + Math.floor((bot - top - N.rows * CELL) / 2) + 1;
      const dt = clamp(t - (N.lt || t), 0, 50); N.lt = t;
      document.getElementById('jogVal').textContent = N.body ? 'L' + N.body.length : 'SNK';
      g.header('SNAKE', 'SC ' + pad5(N.score || 0) + ' · HI ' + pad5(Math.max(HI.sn, N.score || 0)));
      mx.frame(ox - 2, oy - 2, N.cols * CELL + 3, N.rows * CELL + 3, C.ink, 0.35);
      if (N.state === 'play') {
        N.acc += dt;
        const every = performance.now() < N.burst ? N.tick * 0.5 : N.tick;
        while (N.acc >= every && N.state === 'play') { N.acc -= every; snStep(A); }
        if (N.bonus && performance.now() > N.bonus.until) N.bonus = null;
      }
      if (N.body) {
        const cell = (p, c, a) => mx.rect(ox + p[0] * CELL, oy + p[1] * CELL, CELL - 1, CELL - 1, c, a);
        if (Math.floor(t / 250) % 2 || N.state !== 'play') cell(N.food, C.amber, 1); else cell(N.food, C.amber, 0.6);
        if (N.bonus) { const left = N.bonus.until - performance.now(); if (left > 1500 || Math.floor(t / 120) % 2) cell(N.bonus.p, '#FF6B5E', 1); }
        const n = N.body.length;
        N.body.forEach((p, i) => cell(p, i === 0 ? C.hot : C.ink, i === 0 ? 1 : 0.95 - 0.55 * (i / Math.max(1, n - 1))));
        if (N.state === 'over') { const h = N.body[0]; if (Math.floor(t / 150) % 2) cell(h, C.red, 1); }
      }
      const cy = Math.round(H * 0.5), big = (s, c) => g.textC(s, W / 2, cy, { s: 2, c });
      if (N.state === 'new') { big('SNAKE', C.ink); g.textC('MARK ▸ START', W / 2, cy + 22, { a: 0.7 }); }
      if (N.state === 'paused') big('PAUSED', C.amber);
      if (N.state === 'over') { big('GAME OVER', C.red); g.textC(N.best ? 'NEW HIGH ' + pad5(HI.sn) : 'MARK ▸ AGAIN', W / 2, cy + 22, { c: N.best ? C.amber : C.ink, a: 0.85 }); }
      const foot = N.state === 'new' ? 'DRUM CLICKS ▸ TURN · MARK ▸ START' : N.state === 'paused' ? 'PUSH OR MARK ▸ RESUME · MENU ▸ LEAVE' : N.state === 'over' ? 'MARK ▸ NEW GAME' : 'DRUM ▸ TURN · MARK ▸ BURST';
      g.footer(A.sayActive() ? A.statusShown(t) : foot);
      A.dirty = true;
    }
  };
})();
