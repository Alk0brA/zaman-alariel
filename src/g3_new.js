
  /* =====================================================
     كمبيوتر العائلة — متاهة أبو فم
     ===================================================== */
  const MAZE_TH = [
    { n: "المتاهة الزرقاء", wall: "#2546d8", in: "#0d1a66" }, { n: "متاهة الورد", wall: "#c2185b", in: "#4a0828" },
    { n: "متاهة النخيل", wall: "#2e9e4f", in: "#0e3d1c" }, { n: "متاهة الغروب", wall: "#e67e22", in: "#5a2a05" }, { n: "متاهة البنفسج", wall: "#7e57c2", in: "#2a1458" }
  ];
  const DIRS = [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }];
  const maze = {
    id: "maze", console: "family", name: "متاهة أبو فم", emoji: "😮", color: "#e6b800", pad: "dpad",
    desc: "كُل كل الحبوب وانتبه من العفاريت! الحبة الكبيرة تخليهم يخافون وتقدر تاكلهم. كل مرحلة متاهة جديدة مرسومة بشكل مختلف، والعفاريت أكثر وأسرع وأذكى.",
    controls: "الأسهم للتوجيه — أو اسحب بإصبعك على الشاشة",
    init() { this.level = 1; this.score = 0; this.lives = 3; this.dying = 0; this.clear = 0; this.build(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  ❤️ " + this.lives + "  ·  مرحلة " + this.level); },
    build() {
      const R = seeded(this.level * 104729 + 11), CW = 10, CH = 11; this.cols = 21; this.rows = 23; this.ts = 10; this.ox = 23; this.oy = 5;
      const m = Array.from({ length: 23 }, () => new Array(21).fill("#"));
      const vis = new Array(CW * CH).fill(false), st = [[0, 0]]; vis[0] = true; m[1][1] = " ";
      while (st.length) {
        const [cx, cy] = st[st.length - 1];
        const nb = DIRS.map(d => [cx + d.x, cy + d.y]).filter(([x, y]) => x >= 0 && y >= 0 && x < CW && y < CH && !vis[y * CW + x]);
        if (!nb.length) { st.pop(); continue; }
        const [nx, ny] = nb[Math.floor(R() * nb.length)]; vis[ny * CW + nx] = true;
        m[cy + ny + 1][cx + nx + 1] = " "; m[2 * ny + 1][2 * nx + 1] = " "; st.push([nx, ny]);
      }
      for (let pass = 0; pass < 2; pass++) for (let cy = 0; cy < CH; cy++) for (let cx = 0; cx < CW; cx++) {
        const tx = 2 * cx + 1, ty = 2 * cy + 1; const closed = DIRS.filter(d => m[ty + d.y][tx + d.x] === "#" && tx + 2 * d.x > 0 && tx + 2 * d.x < 20 && ty + 2 * d.y > 0 && ty + 2 * d.y < 22);
        if (4 - DIRS.filter(d => m[ty + d.y][tx + d.x] === "#").length <= 1 && closed.length) { const d = closed[Math.floor(R() * closed.length)]; m[ty + d.y][tx + d.x] = " "; }
      }
      for (let i = 0; i < 10 + Math.min(20, this.level * 2); i++) { const cx = Math.floor(R() * (CW - 1)), cy = Math.floor(R() * CH); if (R() < 0.5) m[2 * cy + 1][2 * cx + 2] = " "; else if (cy < CH - 1) m[2 * cy + 2][2 * cx + 1] = " "; }
      for (let y = 9; y <= 13; y++) for (let x = 8; x <= 12; x++) m[y][x] = "H";
      this.dots = 0;
      for (let y = 0; y < 23; y++) for (let x = 0; x < 21; x++) if (m[y][x] === " ") { m[y][x] = "."; this.dots++; }
      for (const [x, y] of [[1, 1], [19, 1], [1, 21], [19, 21]]) { if (m[y][x] === ".") this.dots--; m[y][x] = "o"; this.dots++; }
      m[17][11] = " "; this.dots--;
      this.m = m; this.total = this.dots; this.th = TH(this.level, MAZE_TH); this.fruit = null; this.fruitGiven = false;
      this.reset(); this.intro = 1.8;
    },
    reset() {
      this.p = { x: 11, y: 17, dir: { x: 0, y: 0 }, want: { x: 0, y: 0 }, prog: 0, sp: Math.min(7.2, 5 + this.level * 0.18), mouth: 0 };
      const n = Math.min(4, 2 + Math.floor((this.level + 1) / 2)), cols = ["#e74c3c", "#ff8ad8", "#3dd6f5", "#ffa632"];
      const gsp = Math.min(7.4, 3.6 + this.level * 0.35);
      this.gh = Array.from({ length: n }, (_, i) => ({ x: 9 + (i % 3), y: 11, dir: { x: 0, y: -1 }, prog: 0, sp: gsp, col: cols[i], i, wait: i * Math.max(1, 3 - this.level * 0.25), home: [[1, 1], [19, 1], [1, 21], [19, 21]][i] }));
      this.fright = 0; this.combo = 0; this.ready = 1.2;
    },
    open(x, y) { return x >= 0 && y >= 0 && x < 21 && y < 23 && this.m[y][x] !== "#"; },
    turn(x, y) { this.p.want = { x, y }; },
    tap(x, y) { this.sx = x; this.sy = y; },
    release(x, y) { if (this.sx == null) return; const dx = x - this.sx, dy = y - this.sy; this.sx = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return; if (Math.abs(dx) > Math.abs(dy)) this.turn(Math.sign(dx), 0); else this.turn(0, Math.sign(dy)); },
    eat(x, y) {
      const c = this.m[y][x];
      if (c === ".") { this.m[y][x] = " "; this.dots--; this.score += 10; sfx.waka(); }
      else if (c === "o") { this.m[y][x] = " "; this.dots--; this.score += 50; this.fright = Math.max(2, 7.5 - this.level * 0.6); this.combo = 0; sfx.coin(); for (const g2 of this.gh) if (g2.wait <= 0 && !(g2.eaten > 0)) { g2.dir = { x: -g2.dir.x, y: -g2.dir.y }; g2.prog = 1 - g2.prog; g2.x -= g2.dir.x; g2.y -= g2.dir.y; } }
      if (!this.fruitGiven && this.dots < this.total / 2) { this.fruitGiven = true; this.fruit = { x: 11, y: 17, t: 9 }; }
      if (this.fruit && this.fruit.x === x && this.fruit.y === y) { this.score += 300 * this.level; this.fruit = null; sfx.win(); }
      this.hud();
    },
    ghostDir(e) {
      const opts = DIRS.filter(d => this.open(e.x + d.x, e.y + d.y) && this.m[e.y + d.y][e.x + d.x] !== "H" || (this.m[e.y][e.x] === "H" && this.open(e.x + d.x, e.y + d.y)));
      let o = opts.filter(d => !(d.x === -e.dir.x && d.y === -e.dir.y)); if (!o.length) o = opts; if (!o.length) return { x: 0, y: 0 };
      if (this.fright > 0 || Math.random() < Math.max(0.04, 0.3 - this.level * 0.035)) return pick(o);
      const p = this.p; let tx = p.x, ty = p.y;
      if (e.i === 1) { tx += p.dir.x * 4; ty += p.dir.y * 4; }
      else if (e.i === 2) { tx = 2 * p.x - this.gh[0].x; ty = 2 * p.y - this.gh[0].y; }
      else if (e.i === 3 && Math.hypot(p.x - e.x, p.y - e.y) < 6) { tx = e.home[0]; ty = e.home[1]; }
      let best = o[0], bd = 1e9; for (const d of o) { const dd = Math.hypot(e.x + d.x - tx, e.y + d.y - ty); if (dd < bd) { bd = dd; best = d; } }
      return best;
    },
    update(dt) {
      if (api.pressed("left")) this.turn(-1, 0); if (api.pressed("right")) this.turn(1, 0); if (api.pressed("up")) this.turn(0, -1); if (api.pressed("down")) this.turn(0, 1);
      if (this.intro > 0) { this.intro -= dt; return; }
      if (this.ready > 0) { this.ready -= dt; return; }
      if (this.dying > 0) { this.dying -= dt; if (this.dying <= 0) { if (this.lives <= 0) { api.over(this.score); return; } this.reset(); } return; }
      if (this.clear > 0) { this.clear -= dt; if (this.clear <= 0) { this.level++; this.score += 1000; sfx.stage(); this.build(); this.hud(); } return; }
      const p = this.p; p.mouth += dt * 12;
      if (p.dir.x === 0 && p.dir.y === 0) { if ((p.want.x || p.want.y) && this.open(p.x + p.want.x, p.y + p.want.y) && this.m[p.y + p.want.y][p.x + p.want.x] !== "H") p.dir = p.want; }
      else if (p.want.x === -p.dir.x && p.want.y === -p.dir.y && (p.want.x || p.want.y)) { p.x += p.dir.x; p.y += p.dir.y; p.dir = p.want; p.prog = 1 - p.prog; }
      if (p.dir.x || p.dir.y) {
        p.prog += p.sp * dt;
        while (p.prog >= 1) {
          p.prog -= 1; p.x += p.dir.x; p.y += p.dir.y; this.eat(p.x, p.y);
          const w = p.want, ok = d => this.open(p.x + d.x, p.y + d.y) && this.m[p.y + d.y][p.x + d.x] !== "H";
          if ((w.x || w.y) && ok(w)) p.dir = w;
          if (!ok(p.dir)) { p.dir = { x: 0, y: 0 }; p.prog = 0; break; }
        }
      }
      if (this.fright > 0) this.fright -= dt;
      if (this.fruit) { this.fruit.t -= dt; if (this.fruit.t <= 0) this.fruit = null; }
      for (const e of this.gh) {
        if (e.wait > 0) { e.wait -= dt; continue; }
        if (e.eaten > 0) { e.eaten -= dt; if (e.eaten <= 0) { e.x = 10; e.y = 11; e.prog = 0; e.dir = { x: 0, y: -1 }; } continue; }
        e.prog += e.sp * (this.fright > 0 ? 0.55 : 1) * dt;
        let guard = 0;
        while (e.prog >= 1 && guard++ < 4) { e.prog -= 1; e.x += e.dir.x; e.y += e.dir.y; e.dir = this.ghostDir(e); if (!e.dir.x && !e.dir.y) { e.prog = 0; e.dir = this.ghostDir(e); break; } }
        if (!this.open(e.x + e.dir.x, e.y + e.dir.y)) { e.dir = this.ghostDir(e); e.prog = 0; }
        const ex = e.x + e.dir.x * e.prog, ey = e.y + e.dir.y * e.prog, px = p.x + p.dir.x * p.prog, py = p.y + p.dir.y * p.prog;
        if (Math.hypot(ex - px, ey - py) < 0.7) {
          if (this.fright > 0) { this.combo++; this.score += 200 * Math.pow(2, this.combo - 1); e.eaten = 2.5; e.x = -10; sfx.hit(); this.hud(); }
          else { this.lives--; this.dying = 1.3; sfx.die(); this.hud(); return; }
        }
      }
      if (this.dots <= 0) { this.clear = 1.6; sfx.win(); }
    },
    draw() {
      const t = this.th, s = this.ts, ox = this.ox, oy = this.oy, now = performance.now();
      rect("#000", 0, 0, W, H);
      for (let y = 0; y < 23; y++) for (let x = 0; x < 21; x++) {
        const c = this.m[y][x], X = ox + x * s, Y = oy + y * s;
        if (c === "#") { rect(t.wall, X, Y, s, s); rect(t.in, X + 2, Y + 2, s - 4, s - 4); }
        else if (c === ".") rect("#ffd9b0", X + 4, Y + 4, 2, 2);
        else if (c === "o" && Math.floor(now / 250) % 2) circ("#ffd9b0", X + 5, Y + 5, 3.5);
      }
      if (this.fruit) { const X = ox + this.fruit.x * s + 5, Y = oy + this.fruit.y * s + 5; g.fillStyle = "#7a3b10"; g.beginPath(); g.ellipse(X, Y, 3, 4.5, 0, 0, 7); g.fill(); rect("#3f8f3a", X - 1, Y - 6, 2, 2); }
      const p = this.p, px = ox + (p.x + p.dir.x * p.prog) * s + 5, py = oy + (p.y + p.dir.y * p.prog) * s + 5;
      if (!(this.dying > 0)) {
        const ang = Math.atan2(p.dir.y, p.dir.x || (p.dir.y ? 0 : 1)), mo = (Math.sin(p.mouth) * 0.5 + 0.5) * 0.7 + 0.05;
        g.fillStyle = "#ffd60a"; g.beginPath(); g.moveTo(px, py); g.arc(px, py, 5, ang + mo, ang + Math.PI * 2 - mo); g.closePath(); g.fill();
        rect("#c0392b", px - 4, py - 6, 7, 2); rect("#111", px + (p.dir.x < 0 ? -2 : 1), py - 3, 1, 1);
      } else { const k = Math.max(0, this.dying / 1.3); circ("#ffd60a", px, py, 5 * k); }
      for (const e of this.gh) {
        if (e.eaten > 0) continue;
        const ex = ox + (e.x + e.dir.x * e.prog) * s + 5, ey = oy + (e.y + e.dir.y * e.prog) * s + 5;
        const fr = this.fright > 0, blink = fr && this.fright < 1.5 && Math.floor(now / 150) % 2;
        const c = fr ? (blink ? "#fff" : "#2a5bd7") : e.col;
        g.fillStyle = c; g.beginPath(); g.arc(ex, ey - 1, 5, Math.PI, 0); g.lineTo(ex + 5, ey + 5); g.lineTo(ex + 3, ey + 3); g.lineTo(ex + 1, ey + 5); g.lineTo(ex - 1, ey + 3); g.lineTo(ex - 3, ey + 5); g.lineTo(ex - 5, ey + 3); g.closePath(); g.fill();
        if (fr) { rect("#ffd9b0", ex - 3, ey - 2, 2, 2); rect("#ffd9b0", ex + 1, ey - 2, 2, 2); }
        else { rect("#fff", ex - 4, ey - 3, 3, 3); rect("#fff", ex + 1, ey - 3, 3, 3); rect("#1a237e", ex - 3 + e.dir.x, ey - 2 + e.dir.y, 1, 1); rect("#1a237e", ex + 2 + e.dir.x, ey - 2 + e.dir.y, 1, 1); }
      }
      if (this.intro > 0) banner("المرحلة " + this.level, t.n + " · " + this.gh.length + " عفاريت");
      else if (this.ready > 0) text("جاهز!", 128, oy + 15 * s + 5, 13, "#ffd60a");
      if (this.clear > 0) banner("خلصت المتاهة! 🎉", "+١٠٠٠");
    }
  };

  /* =====================================================
     السيقا — عبور الضب
     ===================================================== */
  const CROSS_TH = [
    { n: "شارع الحي الصبح", road: "#5d5d5d", line: "#f5f5f5", water: "#2f7fd1", wave: "#5aa3e8", grass: "#7cb342", side: "#c9b18a", log: "#8d5a2b" },
    { n: "وادي السيل العصر", road: "#6a5d52", line: "#ffe0a0", water: "#8a5a2b", wave: "#a9773f", grass: "#9e9d24", side: "#d8b47a", log: "#5d3a1a" },
    { n: "طريق الليل", road: "#2b2b35", line: "#bbb", water: "#14305a", wave: "#2a4f86", grass: "#2e5a2a", side: "#4a4238", log: "#5a3a1a", night: true }
  ];
  const CAR_COLS = ["#e74c3c", "#3498db", "#f1c40f", "#ecf0f1", "#9b59b6", "#1abc9c", "#e67e22"];
  const crossing = {
    id: "crossing", console: "sega", name: "عبور الضب", emoji: "🦎", color: "#2e8b57", pad: "dpad",
    desc: "ساعد الضب يقطع الشارع وسيل الوادي ويرجع لجحره! انتبه من السيارات والونيتات، ونط فوق جذوع النخل في السيل. عبّ الجحور الخمسة عشان تنتقل لمرحلة أسرع ومنظر مختلف.",
    controls: "الأسهم للقفز — أو المس الشاشة فوق/تحت/يمين/يسار الضب",
    init() { this.level = 1; this.score = 0; this.lives = 3; this.homeT = 0; this.homes = [false, false, false, false, false]; this.setup(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  ❤️ " + this.lives + "  ·  مرحلة " + this.level + "  ·  ⏱ " + Math.ceil(this.timer || 0)); },
    setup() {
      this.th = TH(this.level, CROSS_TH); const mul = 1 + 0.13 * (this.level - 1); this.lanes = [];
      for (let y = 2; y <= 12; y++) {
        if (y === 7) continue;
        const water = y < 7, dir = y % 2 ? 1 : -1, sp = (water ? 22 + (7 - y) * 7 : 26 + (12 - y) * 9) * mul * rnd(0.85, 1.15);
        const objs = []; let x = rnd(-40, 0);
        while (x < W + 60) {
          const w = water ? Math.max(32, rnd(46, 82) - this.level * 3) : pick([22, 24, 28, 42]);
          objs.push({ x, w, c: pick(CAR_COLS) });
          x += w + (water ? rnd(30, 55) + this.level * 2 : rnd(40, 90) - Math.min(30, this.level * 3));
        }
        this.lanes[y] = { water, dir, sp: Math.min(water ? 90 : 150, sp), objs, span: x + 20 };
      }
      this.intro = 1.6; this.respawn();
    },
    respawn() { this.p = { x: 7 * 16, y: 13, face: { x: 0, y: -1 }, hop: 0, fx: 0, fy: 0 }; this.maxRow = 13; this.timer = Math.max(20, 35 - this.level); this.dead = 0; },
    die() { if (this.dead) return; this.dead = 0.8; this.lives--; sfx.die(); this.hud(); },
    hopTo(dx, dy) {
      const p = this.p; if (p.hop > 0 || this.dead || this.intro > 0) return;
      const nx = p.x + dx * 16, ny = p.y + dy; if (nx < 0 || nx > W - 16 || ny > 13 || ny < 1) return;
      p.fx = p.x; p.fy = p.y; p.x = nx; p.y = ny; p.hop = 0.12; p.face = { x: dx, y: dy }; sfx.blip();
      if (ny < this.maxRow) { this.maxRow = ny; this.score += 10; this.hud(); }
    },
    tap(x, y) {
      const p = this.p, px = p.x + 8, py = p.y * 16 + 8, dx = x - px, dy = y - py;
      if (Math.abs(dx) > Math.abs(dy)) this.hopTo(Math.sign(dx), 0); else this.hopTo(0, Math.sign(dy));
    },
    update(dt) {
      if (api.pressed("left")) this.hopTo(-1, 0); if (api.pressed("right")) this.hopTo(1, 0); if (api.pressed("up")) this.hopTo(0, -1); if (api.pressed("down")) this.hopTo(0, 1);
      for (const L of this.lanes) if (L) for (const o of L.objs) { o.x += L.dir * L.sp * dt; if (L.dir > 0 && o.x > W + 20) o.x -= L.span + 20; if (L.dir < 0 && o.x + o.w < -20) o.x += L.span + 20; }
      if (this.intro > 0) { this.intro -= dt; return; }
      if (this.homeT > 0) { this.homeT -= dt; if (this.homeT <= 0) { if (this.homes.every(Boolean)) { this.level++; this.score += 1000 * (this.level - 1); this.homes = this.homes.map(() => false); sfx.stage(); this.setup(); } else this.respawn(); this.hud(); } return; }
      if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0) { if (this.lives <= 0) { api.over(this.score); return; } this.respawn(); this.hud(); } return; }
      const p = this.p; if (p.hop > 0) { p.hop -= dt; if (p.hop > 0) return; p.hop = 0; }
      this.timer -= dt; if (Math.floor(this.timer + dt) !== Math.floor(this.timer)) this.hud();
      if (this.timer <= 0) { this.die(); return; }
      const L = this.lanes[p.y];
      if (p.y === 1) {
        const slot = [1, 4, 7, 10, 13].findIndex(c => Math.abs(p.x - c * 16) < 10);
        if (slot >= 0 && !this.homes[slot]) { this.homes[slot] = true; this.score += 200 + Math.floor(this.timer) * 10; this.homeT = 0.6; sfx.coin(); this.hud(); }
        else this.die();
        return;
      }
      if (L && L.water) {
        const on = L.objs.find(o => p.x + 8 > o.x + 2 && p.x + 8 < o.x + o.w - 2);
        if (!on) { this.die(); return; }
        p.x += L.dir * L.sp * dt; if (p.x < -6 || p.x > W - 10) { this.die(); return; }
      } else if (L) {
        for (const o of L.objs) if (p.x + 13 > o.x && p.x + 3 < o.x + o.w) { this.die(); return; }
      }
    },
    car(o, y, dir) {
      const X = Math.round(o.x), Y = y * 16;
      if (o.w >= 40) { rect("#7f8c8d", X, Y + 2, o.w, 12); rect(o.c, dir > 0 ? X + o.w - 12 : X, Y + 2, 12, 12); rect("#aee3ff", dir > 0 ? X + o.w - 5 : X + 1, Y + 4, 4, 8); }
      else { rect(o.c, X, Y + 3, o.w, 10); rect("#aee3ff", dir > 0 ? X + o.w - 8 : X + 4, Y + 4, 4, 8); if (o.w === 28) rect("#555", dir > 0 ? X + 2 : X + 14, Y + 4, 12, 8); }
      rect("#111", X + 3, Y + 1, 5, 2); rect("#111", X + o.w - 8, Y + 1, 5, 2); rect("#111", X + 3, Y + 13, 5, 2); rect("#111", X + o.w - 8, Y + 13, 5, 2);
      if (this.th.night) { g.fillStyle = "rgba(255,240,150,.35)"; g.beginPath(); const hx = dir > 0 ? X + o.w : X; g.moveTo(hx, Y + 8); g.lineTo(hx + dir * 26, Y); g.lineTo(hx + dir * 26, Y + 16); g.fill(); }
    },
    draw() {
      const t = this.th, now = performance.now();
      rect(t.grass, 0, 0, W, 32);
      for (const [i, c] of [1, 4, 7, 10, 13].entries()) { rect("#3e2a1a", c * 16 - 2, 14, 20, 18); rect("#1d130b", c * 16 + 1, 18, 14, 14); if (this.homes[i]) { rect("#6b8e23", c * 16 + 3, 20, 10, 9); rect("#111", c * 16 + 5, 22, 2, 2); } }
      const gr = g.createLinearGradient(0, 32, 0, 112); gr.addColorStop(0, t.water); gr.addColorStop(1, t.wave); g.fillStyle = gr; g.fillRect(0, 32, W, 80);
      for (let i = 0; i < 18; i++) rect(t.wave, ((i * 47 + now / 30) % (W + 20)) - 10, 36 + (i * 13) % 74, 8, 1);
      rect(t.side, 0, 112, W, 16); rect(t.road, 0, 128, W, 80);
      for (let y = 9; y <= 12; y++) for (let x = 0; x < W; x += 24) rect(t.line, x + 4, y * 16, 12, 1);
      rect(t.side, 0, 208, W, 16); rect("#1b1b1b", 0, 224, W, 16);
      for (let y = 2; y <= 12; y++) { const L = this.lanes[y]; if (!L) continue; for (const o of L.objs) { if (L.water) { rect(t.log, Math.round(o.x), y * 16 + 3, o.w, 10); rect("rgba(0,0,0,.25)", Math.round(o.x), y * 16 + 11, o.w, 2); for (let k = 6; k < o.w - 4; k += 10) rect("rgba(255,255,255,.15)", Math.round(o.x) + k, y * 16 + 5, 4, 1); } else this.car(o, y, L.dir); } }
      const p = this.p; let px = p.x, py = p.y * 16;
      if (p.hop > 0) { const k = p.hop / 0.12; px = p.x + (p.fx - p.x) * k; py = (p.y + (p.fy - p.y) * k) * 16 - Math.sin(k * Math.PI) * 4; }
      if (this.dead > 0) { circ(this.lanes[p.y] && this.lanes[p.y].water ? "#bde3ff" : "#ff6b4a", px + 8, py + 8, 9 * (1 - this.dead / 0.8) + 3); }
      else {
        g.save(); g.translate(Math.round(px) + 8, Math.round(py) + 8); g.rotate(Math.atan2(p.face.x, -p.face.y));
        rect("#8a7a3a", -3, -6, 6, 12); rect("#a4924a", -2, -8, 4, 3); rect("#111", -2, -7, 1, 1); rect("#111", 1, -7, 1, 1);
        rect("#6f6230", -6, -4, 3, 2); rect("#6f6230", 3, -4, 3, 2); rect("#6f6230", -6, 3, 3, 2); rect("#6f6230", 3, 3, 3, 2); rect("#8a7a3a", -1, 6, 2, 4);
        g.restore();
      }
      if (t.night) { g.fillStyle = "rgba(0,0,30,.25)"; g.fillRect(0, 0, W, 224); }
      const tw = Math.max(0, this.timer || 0) / Math.max(20, 35 - this.level); rect("#333", 8, 230, 120, 5); rect(tw < 0.3 ? "#e74c3c" : "#2ecc71", 8, 230, 120 * tw, 5);
      text("❤️".repeat(Math.max(0, this.lives)), 220, 232, 9, "#fff");
      if (this.intro > 0) banner("المرحلة " + this.level, t.n);
    }
  };

  /* =====================================================
     السيقا — سباق الطريق
     ===================================================== */
  const RACE_TH = [
    { n: "طريق الرياض – الدمام", side: "#e3c38a", side2: "#d6b273", road: "#4a4a4a", line: "#fff", deco: "palm" },
    { n: "شوارع المدينة", side: "#8a9399", side2: "#7a838a", road: "#3c3c44", line: "#ffd84d", deco: "bld" },
    { n: "سهرة الكورنيش", side: "#13294b", side2: "#0f2240", road: "#26262e", line: "#9ad", deco: "lamp", night: true },
    { n: "طريق الهدا الجبلي", side: "#6b8e4e", side2: "#5c7d42", road: "#505050", line: "#fff", deco: "rock" }
  ];
  const racer = {
    id: "racer", console: "sega", name: "سباق الطريق", emoji: "🏎️", color: "#c0392b", pad: "lr-a",
    desc: "سباق بلا نهاية! تجاوز السيارات وخذ البنزين قبل لا يخلص. كل مرحلة طريق جديد والسرعة والزحمة تزيد. عندك نيترو يشحن نفسه.",
    controls: "◀ ▶ للتوجيه (أو المس يمين/يسار الشاشة) — A نيترو 🔥",
    init() { this.score = 0; this.lives = 3; this.dist = 0; this.stage = 1; this.x = 120; this.v = 140; this.fuel = 100; this.nitro = 1; this.boost = 0; this.cars = []; this.items = []; this.off = 0; this.spawnT = 1; this.fuelT = 5; this.inv = 0; this.over = 0; this.th = TH(1, RACE_TH); this.intro = 1.6; this.hud(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  ❤️ " + this.lives + "  ·  " + Math.floor(this.dist / 10) + " م  ·  مرحلة " + this.stage); },
    tap(x) { this.tx = x; }, move(x) { this.tx = x; }, release() { this.tx = null; },
    update(dt) {
      if (this.intro > 0) { this.intro -= dt; this.off += 60 * dt; return; }
      const k = api.keys, L = 48, R = 208;
      let steer = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      if (this.tx != null) steer = this.tx > this.x + 14 ? 1 : this.tx < this.x - 4 ? -1 : 0;
      this.x = Math.max(L + 2, Math.min(R - 20, this.x + steer * 150 * dt));
      this.nitro = Math.min(1, this.nitro + dt * 0.08);
      if (api.pressed("a") && this.nitro >= 0.5 && this.boost <= 0) { this.boost = 2; this.nitro -= 0.5; sfx.jump(); }
      if (this.boost > 0) this.boost -= dt;
      const base = Math.min(360, 140 + this.dist / 45 + (this.stage - 1) * 12);
      this.v += ((base + (this.boost > 0 ? 130 : 0)) - this.v) * Math.min(1, dt * 2);
      this.dist += this.v * dt; this.off += this.v * dt;
      this.fuel -= dt * (3.2 + this.stage * 0.3); if (this.fuel <= 0) { this.fuel = 0; sfx.die(); api.over(this.score + Math.floor(this.dist / 10)); return; }
      this.inv = Math.max(0, this.inv - dt);
      const ns = 1 + Math.floor(this.dist / 3000);
      if (ns > this.stage) { this.stage = ns; this.th = TH(ns, RACE_TH); this.score += 500 * (ns - 1); this.intro = 1.4; sfx.stage(); }
      this.spawnT -= dt;
      if (this.spawnT <= 0) {
        this.spawnT = Math.max(0.35, 1.4 - this.stage * 0.12 - this.dist / 30000) * rnd(0.7, 1.3);
        const lane = ri(0, 3); if (!this.cars.some(c => c.lane === lane && c.y < 30)) this.cars.push({ lane, x: L + 10 + lane * 40, y: -40, sp: rnd(60, 120), c: pick(CAR_COLS), kind: Math.random() < 0.2 ? "truck" : "car" });
      }
      this.fuelT -= dt; if (this.fuelT <= 0) { this.fuelT = rnd(4, 7); this.items.push({ x: L + 14 + ri(0, 3) * 40, y: -20 }); }
      const hit = (ax, ay, aw, ah) => this.x + 3 < ax + aw && this.x + 15 > ax && 186 < ay + ah && 214 > ay;
      for (const c of this.cars) {
        const h2 = c.kind === "truck" ? 44 : 28; c.y += (this.v - c.sp) * dt;
        if (!c.passed && c.y > 214) { c.passed = true; this.score += 20 * this.stage; this.hud(); }
        if (this.inv <= 0 && hit(c.x, c.y, 18, h2)) {
          this.lives--; this.inv = 1.8; this.v = 90; this.boost = 0; sfx.boom(); c.y = H + 50; this.hud();
          if (this.lives <= 0) { api.over(this.score + Math.floor(this.dist / 10)); return; }
        }
      }
      for (const it of this.items) { it.y += this.v * dt; if (!it.got && hit(it.x - 2, it.y, 14, 14)) { it.got = true; this.fuel = Math.min(100, this.fuel + 35); this.score += 50; sfx.coin(); } }
      this.cars = this.cars.filter(c => c.y < H + 60); this.items = this.items.filter(i => i.y < H + 20 && !i.got);
      if (Math.floor(this.dist / 100) !== Math.floor((this.dist - this.v * dt) / 100)) this.hud();
    },
    draw() {
      const t = this.th, L = 48, R = 208, off = this.off;
      for (let y = -32; y < H; y += 32) { const yy = y + (off % 32); rect(Math.floor((off + y) / 32) % 2 ? t.side : t.side2, 0, yy, W, 32); }
      rect(t.road, L, 0, R - L, H); rect("#c0392b", L - 4, 0, 4, H); rect("#c0392b", R, 0, 4, H);
      for (let y = -40; y < H; y += 40) { rect("#fff", L - 4, y + (off % 40), 4, 20); rect("#fff", R, y + (off % 40), 4, 20); }
      for (let ln = 1; ln < 4; ln++) for (let y = -30; y < H; y += 30) rect(t.line, L + ln * 40 - 1, y + (off % 30), 2, 14);
      for (let i = -1; i < 5; i++) {
        const y = i * 64 + (off * 1 % 64);
        for (const sx of [14, 226]) {
          if (t.deco === "palm") { rect("#7a4a22", sx, y, 4, 22); rect("#2f8a3a", sx - 8, y - 4, 20, 5); rect("#3fa34a", sx - 4, y - 8, 12, 5); }
          else if (t.deco === "bld") { rect("#5b6770", sx - 10, y - 10, 24, 34); for (let w = 0; w < 3; w++) rect("#d6e4ee", sx - 6 + (w % 2) * 10, y - 4 + w * 9, 5, 5); }
          else if (t.deco === "lamp") { rect("#666", sx, y, 2, 24); circ("rgba(255,230,140,.9)", sx + 1, y, 3); circ("rgba(255,230,140,.15)", sx + 1, y + 10, 14); }
          else { rect("#7f7f7f", sx - 6, y, 16, 10); rect("#999", sx - 3, y - 4, 10, 6); }
        }
      }
      for (const it of this.items) { rect("#e74c3c", it.x, it.y, 10, 13); rect("#fff", it.x + 2, it.y + 3, 6, 3); rect("#333", it.x + 3, it.y - 2, 4, 2); }
      for (const c of this.cars) {
        const x = Math.round(c.x), y = Math.round(c.y), h2 = c.kind === "truck" ? 44 : 28;
        rect("rgba(0,0,0,.3)", x + 2, y + 2, 18, h2);
        if (c.kind === "truck") { rect(c.c, x, y + 30, 18, 14); rect("#bdc3c7", x, y, 18, 30); rect("#aee3ff", x + 3, y + 36, 12, 4); }
        else { rect(c.c, x, y, 18, h2); rect("#aee3ff", x + 3, y + 16, 12, 6); rect("#2c3e50", x + 3, y + 5, 12, 5); }
        rect("#ff3b30", x + 1, y, 4, 2); rect("#ff3b30", x + 13, y, 4, 2);
      }
      if (!(this.inv > 0 && Math.floor(this.inv * 10) % 2)) {
        const x = Math.round(this.x), y = 186;
        if (this.boost > 0) { rect("#ff9f1c", x + 4, y + 28, 4, 6 + Math.random() * 6); rect("#ff9f1c", x + 10, y + 28, 4, 6 + Math.random() * 6); }
        rect("rgba(0,0,0,.3)", x + 2, y + 2, 18, 28); rect("#f1c40f", x, y, 18, 28); rect("#111", x, y + 12, 18, 2); rect("#aee3ff", x + 3, y + 5, 12, 6); rect("#c0392b", x + 7, y, 4, 28);
        rect("#111", x - 2, y + 4, 2, 6); rect("#111", x + 18, y + 4, 2, 6); rect("#111", x - 2, y + 19, 2, 6); rect("#111", x + 18, y + 19, 2, 6);
        if (t.night) { g.fillStyle = "rgba(255,245,180,.18)"; g.beginPath(); g.moveTo(x + 2, y); g.lineTo(x - 14, y - 70); g.lineTo(x + 32, y - 70); g.lineTo(x + 16, y); g.fill(); }
      }
      if (t.night) { g.fillStyle = "rgba(0,0,40,.3)"; g.fillRect(0, 0, W, H); }
      rect("rgba(0,0,0,.6)", 4, 4, 70, 26); text("⛽", 66, 12, 9); rect("#333", 8, 9, 48, 5); rect(this.fuel < 25 ? "#e74c3c" : "#2ecc71", 8, 9, 48 * this.fuel / 100, 5);
      text("🔥", 66, 23, 9); rect("#333", 8, 20, 48, 5); rect("#ff9f1c", 8, 20, 48 * this.nitro, 5);
      rect("rgba(0,0,0,.6)", 196, 4, 56, 16); text(Math.round(this.v * 0.6) + " كم/س", 224, 12, 10, "#fff");
      if (this.intro > 0) banner("المرحلة " + this.stage, t.n);
    }
  };

  /* =====================================================
     الأتاري — تنس الطاولة
     ===================================================== */
  const PONG_TH = [{ n: "الملعب الكلاسيكي", bg: "#000", fg: "#fff" }, { n: "ملعب العشب", bg: "#1e6b34", fg: "#f0fff0" }, { n: "ملعب الجليد", bg: "#0d3b66", fg: "#d6f0ff" }, { n: "الملعب الترابي", bg: "#7a3416", fg: "#ffe7d1", wall: true }];
  const pong = {
    id: "pong", console: "atari", name: "تنس الطاولة", emoji: "🏓", color: "#34495e", pad: "dpad",
    desc: "أول لعبة فيديو دخلت البيوت! أنت المضرب اليمين. أول واحد يجيب ٥ نقاط يفوز بالمرحلة. كل مرحلة الخصم أذكى والكرة أسرع، وفي ملعب التراب فيه حاجز متحرك بالنص.",
    controls: "▲ ▼ لتحريك المضرب — أو اسحب بإصبعك على الشاشة",
    init() { this.level = 1; this.score = 0; this.newLevel(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  مرحلة " + this.level + "  ·  أنت " + this.ps + " – " + this.cs + " الخصم"); },
    newLevel() { this.th = TH(this.level, PONG_TH); this.ps = 0; this.cs = 0; this.py = 120; this.cy = 120; this.ph = Math.max(22, 36 - this.level * 1.5); this.ch = 34; this.wallY = 120; this.wallD = 1; this.intro = 1.6; this.serve(1); this.hud(); },
    serve(dir) { const sp = Math.min(260, 120 + this.level * 12); this.b = { x: 128, y: rnd(70, 170), vx: dir * sp, vy: rnd(-0.6, 0.6) * sp }; this.wait = 0.8; this.err = rnd(-1, 1) * Math.max(4, 22 - this.level * 2.5); },
    tap(x, y) { this.drag = true; this.py = y; }, move(x, y) { if (this.drag) this.py = y; }, release() { this.drag = false; },
    update(dt) {
      if (this.intro > 0) { this.intro -= dt; return; }
      const k = api.keys; if (k.up) this.py -= 210 * dt; if (k.down) this.py += 210 * dt;
      this.py = Math.max(16 + this.ph / 2, Math.min(232 - this.ph / 2, this.py));
      const b = this.b, cspd = Math.min(280, 95 + this.level * 18);
      const target = b.vx < 0 ? b.y + this.err : 120; const d = target - this.cy; this.cy += Math.sign(d) * Math.min(Math.abs(d), cspd * dt);
      this.cy = Math.max(16 + this.ch / 2, Math.min(232 - this.ch / 2, this.cy));
      if (this.th.wall) { this.wallY += this.wallD * (40 + this.level * 4) * dt; if (this.wallY < 50 || this.wallY > 190) this.wallD = -this.wallD; }
      if (this.wait > 0) { this.wait -= dt; return; }
      const steps = 3;
      for (let s = 0; s < steps; s++) {
        b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
        if (b.y < 18) { b.y = 18; b.vy = Math.abs(b.vy); sfx.blip(); } if (b.y > 230) { b.y = 230; b.vy = -Math.abs(b.vy); sfx.blip(); }
        if (this.th.wall && Math.abs(b.x - 128) < 5 && Math.abs(b.y - this.wallY) < 16) { b.vx = -b.vx; b.x += Math.sign(b.vx) * 6; sfx.bounce(); }
        const paddle = (px, py, ph, dir) => {
          if ((dir > 0 ? b.vx < 0 : b.vx > 0) && Math.abs(b.x - px) < 5 && Math.abs(b.y - py) < ph / 2 + 3) {
            const sp = Math.min(420, Math.hypot(b.vx, b.vy) * 1.06), rel = (b.y - py) / (ph / 2);
            b.vx = dir * sp * Math.cos(rel * 0.8); b.vy = sp * Math.sin(rel * 0.8); b.x = px + dir * 5; sfx.bounce(); return true;
          } return false;
        };
        if (paddle(18, this.cy, this.ch, 1)) this.err = rnd(-1, 1) * Math.max(4, 22 - this.level * 2.5);
        paddle(238, this.py, this.ph, -1);
      }
      if (b.x < -6) { this.ps++; this.score += 100 * this.level; sfx.coin(); this.hud(); if (this.ps >= 5) { this.score += 500 * this.level; this.level++; sfx.stage(); this.newLevel(); } else this.serve(-1); }
      else if (b.x > W + 6) { this.cs++; sfx.die(); this.hud(); if (this.cs >= 5) { api.over(this.score); return; } this.serve(1); }
    },
    draw() {
      const t = this.th; rect(t.bg, 0, 0, W, H); rect(t.fg, 0, 12, W, 4); rect(t.fg, 0, 232, W, 4);
      for (let y = 20; y < 230; y += 14) rect(t.fg, 127, y, 2, 8);
      text(String(this.cs), 96, 40, 30, t.fg, "center", "monospace"); text(String(this.ps), 160, 40, 30, t.fg, "center", "monospace");
      rect(t.fg, 14, this.cy - this.ch / 2, 6, this.ch); rect(t.fg, 236, this.py - this.ph / 2, 6, this.ph);
      if (t.wall) rect("#f39c12", 124, this.wallY - 14, 8, 28);
      if (!(this.wait > 0 && Math.floor(this.wait * 8) % 2)) rect(t.fg, this.b.x - 3, this.b.y - 3, 6, 6);
      if (this.intro > 0) banner("المرحلة " + this.level, t.n);
    }
  };

  /* =====================================================
     الأتاري — صخور الفضاء
     ===================================================== */
  const rocks = {
    id: "rocks", console: "atari", name: "صخور الفضاء", emoji: "☄️", color: "#2c3e50", pad: "dpad-a",
    desc: "مركبتك وسط حزام صخور! دوّر واضرب الصخور، وكل صخرة كبيرة تنقسم لأصغر. كل موجة صخور أكثر وأسرع، ومن الموجة الثالثة يطلع صحن طائر يرمي عليك.",
    controls: "◀ ▶ للدوران — ▲ دفع — A للإطلاق (اضغط مطوّل للرمي المتواصل)",
    init() { this.level = 1; this.score = 0; this.lives = 3; this.dead = 0; this.respawnT = 0; this.bul = []; this.ebul = []; this.parts = []; this.stars = Array.from({ length: 50 }, () => [rnd(0, W), rnd(0, H)]); this.spawnShip(); this.wave(); this.hud(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  ❤️ " + this.lives + "  ·  موجة " + this.level); },
    spawnShip() { this.s = { x: 128, y: 120, a: -Math.PI / 2, vx: 0, vy: 0, inv: 2.2 }; this.cool = 0; },
    rock(x, y, size) { const r = [0, 8, 14, 24][size], sp = (30 + this.level * 6) * (4 - size) * 0.5 * rnd(0.6, 1.2), a = rnd(0, 7); return { x, y, size, r, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: rnd(-1, 1), ang: 0, pts: Array.from({ length: 10 }, () => rnd(0.72, 1.12)) }; },
    wave() { this.rk = []; const n = Math.min(12, 3 + this.level); for (let i = 0; i < n; i++) { let x, y; do { x = rnd(0, W); y = rnd(0, H); } while (Math.hypot(x - 128, y - 120) < 70); this.rk.push(this.rock(x, y, 3)); } this.ufo = null; this.ufoT = rnd(9, 15); this.intro = 1.5; },
    wrap(o) { if (o.x < -10) o.x += W + 20; if (o.x > W + 10) o.x -= W + 20; if (o.y < -10) o.y += H + 20; if (o.y > H + 10) o.y -= H + 20; },
    burst(x, y, n, c) { for (let i = 0; i < n; i++) { const a = rnd(0, 7), sp = rnd(20, 90); this.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, t: rnd(0.3, 0.8), c }); } },
    kill() { this.burst(this.s.x, this.s.y, 24, "#ffd166"); this.lives--; sfx.boom(); this.hud(); if (this.lives <= 0) { this.dead = 1.2; return; } this.respawnT = 1.2; this.s.x = -999; },
    update(dt) {
      for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.t -= dt; } this.parts = this.parts.filter(p => p.t > 0);
      for (const r of this.rk) { r.x += r.vx * dt; r.y += r.vy * dt; r.ang += r.rot * dt; this.wrap(r); }
      if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0) api.over(this.score); return; }
      if (this.intro > 0) { this.intro -= dt; return; }
      if (this.respawnT > 0) { this.respawnT -= dt; if (this.respawnT <= 0) this.spawnShip(); return; }
      const s = this.s, k = api.keys;
      if (k.left) s.a -= 4.2 * dt; if (k.right) s.a += 4.2 * dt;
      if (k.up) { s.vx += Math.cos(s.a) * 150 * dt; s.vy += Math.sin(s.a) * 150 * dt; this.thrust = true; } else this.thrust = false;
      const fr = Math.pow(0.6, dt); s.vx *= fr; s.vy *= fr; const sp = Math.hypot(s.vx, s.vy); if (sp > 190) { s.vx *= 190 / sp; s.vy *= 190 / sp; }
      s.x += s.vx * dt; s.y += s.vy * dt; this.wrap(s); s.inv = Math.max(0, s.inv - dt);
      this.cool -= dt;
      if ((api.pressed("a") || (k.a && this.cool <= 0)) && this.bul.length < 5 && this.cool <= 0) { this.cool = 0.2; this.bul.push({ x: s.x + Math.cos(s.a) * 8, y: s.y + Math.sin(s.a) * 8, vx: Math.cos(s.a) * 270 + s.vx, vy: Math.sin(s.a) * 270 + s.vy, t: 0.85 }); sfx.pew(); }
      for (const b of this.bul) { b.x += b.vx * dt; b.y += b.vy * dt; b.t -= dt; this.wrap(b); }
      for (const b of this.bul) for (const r of this.rk) if (b.t > 0 && !r.dead && Math.hypot(b.x - r.x, b.y - r.y) < r.r) {
        b.t = 0; r.dead = true; this.score += [0, 100, 50, 20][r.size] * this.level; this.burst(r.x, r.y, 8 + r.size * 3, "#ddd"); sfx.hit();
        if (r.size > 1) { this.rk.push(this.rock(r.x, r.y, r.size - 1)); this.rk.push(this.rock(r.x, r.y, r.size - 1)); }
        this.hud();
      }
      this.bul = this.bul.filter(b => b.t > 0); this.rk = this.rk.filter(r => !r.dead);
      if (this.level >= 3) {
        this.ufoT -= dt;
        if (!this.ufo && this.ufoT <= 0) this.ufo = { x: Math.random() < 0.5 ? -10 : W + 10, y: rnd(30, 200), fire: 1.5 }, this.ufo.vx = this.ufo.x < 0 ? 55 : -55;
        if (this.ufo) {
          const u = this.ufo; u.x += u.vx * dt; u.y += Math.sin(performance.now() / 400) * 30 * dt; u.fire -= dt;
          if (u.fire <= 0) { u.fire = Math.max(0.7, 2 - this.level * 0.12); const a = Math.atan2(s.y - u.y, s.x - u.x) + rnd(-0.25, 0.25); this.ebul.push({ x: u.x, y: u.y, vx: Math.cos(a) * 140, vy: Math.sin(a) * 140, t: 1.6 }); sfx.blip(); }
          for (const b of this.bul) if (b.t > 0 && Math.hypot(b.x - u.x, b.y - u.y) < 10) { b.t = 0; this.score += 300 * this.level; this.burst(u.x, u.y, 18, "#ff6bd6"); this.ufo = null; this.ufoT = rnd(10, 16); sfx.coin(); this.hud(); break; }
          if (this.ufo && (u.x < -20 || u.x > W + 20)) { this.ufo = null; this.ufoT = rnd(10, 16); }
        }
      }
      for (const b of this.ebul) { b.x += b.vx * dt; b.y += b.vy * dt; b.t -= dt; this.wrap(b); if (s.inv <= 0 && b.t > 0 && Math.hypot(b.x - s.x, b.y - s.y) < 6) { b.t = 0; this.kill(); return; } }
      this.ebul = this.ebul.filter(b => b.t > 0);
      if (s.inv <= 0) for (const r of this.rk) if (Math.hypot(r.x - s.x, r.y - s.y) < r.r + 5) { this.kill(); return; }
      if (!this.rk.length) { this.level++; this.score += 1000 * (this.level - 1); sfx.stage(); this.wave(); this.hud(); }
    },
    draw() {
      rect("#000", 0, 0, W, H); for (const st of this.stars) rect("#445", st[0], st[1], 1, 1);
      g.lineWidth = 1.2; g.shadowColor = "#9cf"; g.shadowBlur = 4;
      g.strokeStyle = "#e8f1ff";
      for (const r of this.rk) { g.beginPath(); r.pts.forEach((k, i) => { const a = r.ang + i / r.pts.length * Math.PI * 2; const x = r.x + Math.cos(a) * r.r * k, y = r.y + Math.sin(a) * r.r * k; i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath(); g.stroke(); }
      const s = this.s;
      if (s.x > -100 && !(this.dead > 0) && !(s.inv > 0 && Math.floor(s.inv * 10) % 2)) {
        const pt = (d, a) => [s.x + Math.cos(s.a + a) * d, s.y + Math.sin(s.a + a) * d];
        g.strokeStyle = "#fff"; g.beginPath(); g.moveTo(...pt(9, 0)); g.lineTo(...pt(7, 2.5)); g.lineTo(...pt(3, Math.PI)); g.lineTo(...pt(7, -2.5)); g.closePath(); g.stroke();
        if (this.thrust && Math.random() < 0.8) { g.strokeStyle = "#ff9f1c"; g.beginPath(); g.moveTo(...pt(5, 2.8)); g.lineTo(...pt(11 + Math.random() * 4, Math.PI)); g.lineTo(...pt(5, -2.8)); g.stroke(); }
      }
      if (this.ufo) { const u = this.ufo; g.strokeStyle = "#ff6bd6"; g.beginPath(); g.moveTo(u.x - 10, u.y); g.lineTo(u.x + 10, u.y); g.lineTo(u.x + 5, u.y + 4); g.lineTo(u.x - 5, u.y + 4); g.closePath(); g.moveTo(u.x - 5, u.y); g.lineTo(u.x - 3, u.y - 5); g.lineTo(u.x + 3, u.y - 5); g.lineTo(u.x + 5, u.y); g.stroke(); }
      g.shadowBlur = 0;
      for (const b of this.bul) rect("#fff", b.x - 1, b.y - 1, 2, 2);
      for (const b of this.ebul) rect("#ff6bd6", b.x - 1, b.y - 1, 3, 3);
      for (const p of this.parts) rect(p.c, p.x, p.y, 1.5, 1.5);
      if (this.intro > 0) banner("الموجة " + this.level, this.rk.length + " صخور" + (this.level >= 3 ? " + صحن طائر" : ""));
    }
  };

  const LIST = [hara, hunt, maze, crossing, racer, pong, bricks, invaders, rocks, blocks, snake];
