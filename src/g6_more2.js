
  /* =====================================================
     الأتاري — مطر التمر
     ===================================================== */
  const DATES_TH = [{ n: "مزرعة الصباح", sky: "#7fc8f8", ground: "#c9a24a" }, { n: "عصرية النخل", sky: "#f4a261", ground: "#b5793a" }, { n: "ليلة الصرام", sky: "#1b2a4a", ground: "#5a4320", night: true }];
  const dates = {
    id: "dates", console: "atari", name: "مطر التمر", emoji: "🌴", color: "#a0522d", pad: "lr-a",
    desc: "قرد شقي فوق النخل يرمي تمر! التقطه بالسلال قبل لا يطيح بالأرض، وكل تمرة تطيح تخسّرك سلة. من الموجة الثانية يرمي حجارة لا تلتقطها! والتمرة الذهبية بعشر أضعاف.",
    controls: "◀ ▶ أو اسحب بإصبعك لتحريك السلال",
    init() { this.wave = 1; this.score = 0; this.baskets = 3; this.x = 110; this.items = []; this.mx = 128; this.mdir = 1; this.newWave(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  🧺 " + this.baskets + "  ·  موجة " + this.wave); },
    newWave() { this.th = TH(this.wave, DATES_TH); this.left = 10 + this.wave * 5; this.dropT = 1; this.intro = 1.5; this.items = []; this.hud(); },
    tap(x) { this.drag = true; this.x = x - 18; }, move(x) { if (this.drag) this.x = x - 18; }, release() { this.drag = false; },
    update(dt) {
      const k = api.keys; if (k.left) this.x -= 220 * dt; if (k.right) this.x += 220 * dt; this.x = Math.max(0, Math.min(W - 36, this.x));
      if (this.intro > 0) { this.intro -= dt; return; }
      const msp = 60 + this.wave * 14; this.mx += this.mdir * msp * dt; if (this.mx < 20 || this.mx > W - 20 || Math.random() < dt * 0.8) this.mdir = this.mx < 20 ? 1 : this.mx > W - 20 ? -1 : -this.mdir;
      if (this.left > 0) { this.dropT -= dt; if (this.dropT <= 0) { this.dropT = Math.max(0.22, 0.9 - this.wave * 0.07) * rnd(0.7, 1.3); this.left--; const r = Math.random(); this.items.push({ x: this.mx, y: 46, k: r < 0.03 ? "gold" : (this.wave >= 2 && r < 0.15 ? "stone" : "date"), vy: 55 + this.wave * 12 }); } }
      const rows = [196, 206, 216].slice(0, this.baskets);
      for (const it of this.items) {
        it.y += it.vy * dt;
        if (rows.some(ry => Math.abs(it.y - ry) < 5) && it.x > this.x - 2 && it.x < this.x + 38) {
          it.done = true;
          if (it.k === "stone") { this.baskets--; sfx.boom(); this.hud(); if (this.baskets <= 0) { api.over(this.score); return; } }
          else { this.score += (it.k === "gold" ? 100 : 10) * this.wave; it.k === "gold" ? sfx.win() : sfx.blip(); this.hud(); }
        } else if (it.y > 224) {
          it.done = true;
          if (it.k !== "stone") { this.baskets--; sfx.die(); this.hud(); this.items.forEach(o => o.done = true); if (this.baskets <= 0) { api.over(this.score); return; } }
        }
      }
      this.items = this.items.filter(i => !i.done);
      if (this.left <= 0 && !this.items.length) { this.score += 200 * this.wave; if (this.wave % 3 === 0) this.baskets = Math.min(3, this.baskets + 1); this.wave++; sfx.stage(); this.newWave(); }
    },
    draw() {
      const t = this.th; rect(t.sky, 0, 0, W, H);
      if (t.night) { for (let i = 0; i < 30; i++) rect("#fff", (i * 47) % W, (i * 13) % 40, 1, 1); circ("#f5f0d0", 220, 18, 8); }
      for (let x = -10; x < W; x += 52) { rect("#6b4a2b", x + 22, 34, 6, 30); rect("#2f8a3a", x, 26, 50, 8); rect("#3fa34a", x + 8, 20, 34, 8); rect("#8b4513", x + 18, 34, 4, 4); rect("#8b4513", x + 28, 34, 4, 4); }
      const mx = Math.round(this.mx), f = Math.floor(performance.now() / 200) % 2;
      rect("#7b4a2a", mx - 6, 30, 12, 10); rect("#7b4a2a", mx - 5, 22, 10, 8); rect("#e0b48a", mx - 3, 25, 6, 4); rect("#111", mx - 2, 25, 1, 1); rect("#111", mx + 1, 25, 1, 1); rect("#7b4a2a", mx + (f ? 6 : -9), 30, 3, 6);
      for (const it of this.items) { const x = Math.round(it.x), y = Math.round(it.y); if (it.k === "stone") { rect("#7f8c8d", x - 4, y - 3, 8, 7); rect("#95a5a6", x - 2, y - 2, 3, 2); } else { g.fillStyle = it.k === "gold" ? "#f1c40f" : "#6b3410"; g.beginPath(); g.ellipse(x, y, 3, 5, 0, 0, 7); g.fill(); rect("rgba(255,255,255,.4)", x - 1, y - 3, 1, 2); } }
      rect(t.ground, 0, 224, W, 16);
      [196, 206, 216].slice(0, this.baskets).forEach(ry => { rect("#c68642", this.x, ry - 3, 36, 7); rect("#8b5a2b", this.x, ry + 1, 36, 2); for (let i = 2; i < 36; i += 6) rect("#8b5a2b", this.x + i, ry - 3, 1, 6); });
      if (this.intro > 0) banner("الموجة " + this.wave, t.n);
    }
  };

  /* =====================================================
     كمبيوتر العائلة — مفجّر الحارة
     ===================================================== */
  const BOMB_TH = [{ n: "حوش البيت", floor: "#7cb342", floor2: "#689f38", soft: "#c68642", softL: "#8b5a2b", hard: "#8d99a6" }, { n: "سوق الحارة", floor: "#d9b77a", floor2: "#cfa964", soft: "#a0522d", softL: "#6b3410", hard: "#7f8c8d" }, { n: "سطوح الليل", floor: "#34495e", floor2: "#2c3e50", soft: "#7f6a4a", softL: "#4a3a22", hard: "#95a5a6" }];
  const bomber = {
    id: "bomber", console: "family", name: "مفجّر الحارة", emoji: "💣", color: "#2c3e50", pad: "dpad-a",
    desc: "حط القنابل وفجّر الصناديق والقطاوة! تحت بعض الصناديق باب المرحلة الجاية، وتحت ثانية قوى: 💣 قنبلة زيادة، 🔥 انفجار أطول، 👟 سرعة. اقضِ على كل القطاوة وادخل الباب.",
    controls: "الأسهم للحركة — A تحط قنبلة",
    init() { this.level = 1; this.score = 0; this.lives = 3; this.maxB = 1; this.range = 2; this.speed = 55; this.build(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  ❤️ " + this.lives + "  ·  مرحلة " + this.level + "  ·  💣" + this.maxB + " 🔥" + this.range); },
    build() {
      this.th = TH(this.level, BOMB_TH); const R = seeded(this.level * 977 + 3); this.cols = 15; this.rows = 13; this.ts = 16; this.ox = 8; this.oy = 22;
      this.m = []; const soft = [];
      for (let y = 0; y < 13; y++) { const row = []; for (let x = 0; x < 15; x++) { let v = 0; if (x === 0 || y === 0 || x === 14 || y === 12 || (x % 2 === 0 && y % 2 === 0)) v = 1; else if (!(x + y < 4) && R() < Math.min(0.55, 0.38 + this.level * 0.02)) { v = 2; soft.push([x, y]); } row.push(v); } this.m.push(row); }
      this.items = {}; const shuf = soft.sort(() => R() - 0.5); if (shuf.length) this.items[shuf[0].join(",")] = "door";
      ["bomb", "fire", "speed"].forEach((k, i) => { if (shuf[i + 1] && R() < 0.85) this.items[shuf[i + 1].join(",")] = k; });
      this.en = []; const n = Math.min(10, 3 + this.level); let tries = 0;
      while (this.en.length < n && tries++ < 500) { const x = 1 + Math.floor(R() * 13), y = 1 + Math.floor(R() * 11); if (this.m[y][x] === 0 && x + y > 6 && !this.en.some(e => e.x === x && e.y === y)) this.en.push({ x, y, dir: pick(DIRS), prog: 0, sp: Math.min(4.2, 1.6 + this.level * 0.2), dead: 0 }); }
      this.bombs = []; this.fire = []; this.revealed = {}; this.intro = 1.6; this.respawn(); this.hud();
    },
    respawn() { this.p = { x: 1 * 16 + 2, y: 1 * 16 + 2, inv: 1.5, face: 1 }; this.dying = 0; },
    tile(x, y) { return this.m[y] && this.m[y][x]; },
    blocked(px, py) { const s = 12; for (const [cx, cy] of [[px, py], [px + s - 0.01, py], [px, py + s - 0.01], [px + s - 0.01, py + s - 0.01]]) { const tx = Math.floor(cx / 16), ty = Math.floor(cy / 16); if (this.tile(tx, ty) !== 0) return true; } return false; },
    placeBomb() {
      const tx = Math.floor((this.p.x + 6) / 16), ty = Math.floor((this.p.y + 6) / 16);
      if (this.bombs.length >= this.maxB || this.bombs.some(b => b.x === tx && b.y === ty)) return;
      this.bombs.push({ x: tx, y: ty, t: 2 }); sfx.blip();
    },
    explode(b) {
      b.t = -1; sfx.boom(); const cells = [[b.x, b.y]];
      for (const d of DIRS) for (let i = 1; i <= this.range; i++) { const x = b.x + d.x * i, y = b.y + d.y * i, v = this.tile(x, y); if (v === 1) break; cells.push([x, y]); if (v === 2) { this.m[y][x] = 0; this.score += 10; const it = this.items[x + "," + y]; if (it) this.revealed[x + "," + y] = it; break; } }
      for (const c of cells) { this.fire.push({ x: c[0], y: c[1], t: 0.5 }); const ob = this.bombs.find(o => o.x === c[0] && o.y === c[1] && o.t > 0); if (ob) ob.t = 0.01; }
    },
    update(dt) {
      if (this.intro > 0) { this.intro -= dt; return; }
      if (this.dying > 0) { this.dying -= dt; if (this.dying <= 0) { if (this.lives <= 0) { api.over(this.score); return; } this.respawn(); } return; }
      if (this.win > 0) { this.win -= dt; if (this.win <= 0) { this.level++; this.score += 1000 * (this.level - 1); sfx.stage(); this.build(); } return; }
      const p = this.p, k = api.keys, sp = this.speed * dt; p.inv = Math.max(0, p.inv - dt);
      const tryMove = (dx, dy) => {
        if (!this.blocked(p.x + dx, p.y + dy)) { p.x += dx; p.y += dy; return; }
        if (dx) { const cy = Math.round((p.y - 2) / 16) * 16 + 2; if (Math.abs(cy - p.y) < 7 && !this.blocked(p.x + dx, cy)) p.y += Math.sign(cy - p.y) * Math.min(Math.abs(cy - p.y), sp); }
        if (dy) { const cx = Math.round((p.x - 2) / 16) * 16 + 2; if (Math.abs(cx - p.x) < 7 && !this.blocked(cx, p.y + dy)) p.x += Math.sign(cx - p.x) * Math.min(Math.abs(cx - p.x), sp); }
      };
      if (k.left) { tryMove(-sp, 0); p.face = -1; } else if (k.right) { tryMove(sp, 0); p.face = 1; } else if (k.up) tryMove(0, -sp); else if (k.down) tryMove(0, sp);
      if (api.pressed("a")) this.placeBomb();
      for (const b of this.bombs) { b.t -= dt; if (b.t <= 0 && b.t > -1) this.explode(b); }
      this.bombs = this.bombs.filter(b => b.t > 0);
      for (const f of this.fire) f.t -= dt; this.fire = this.fire.filter(f => f.t > 0);
      const ptx = Math.floor((p.x + 6) / 16), pty = Math.floor((p.y + 6) / 16);
      if (p.inv <= 0 && this.fire.some(f => f.x === ptx && f.y === pty)) { this.lives--; this.dying = 1.2; sfx.die(); this.hud(); return; }
      const key = ptx + "," + pty, it = this.revealed[key];
      if (it && it !== "door") { delete this.revealed[key]; delete this.items[key]; if (it === "bomb") this.maxB = Math.min(5, this.maxB + 1); if (it === "fire") this.range = Math.min(6, this.range + 1); if (it === "speed") this.speed = Math.min(90, this.speed + 12); this.score += 300; sfx.coin(); this.hud(); }
      const alive = this.en.filter(e => !e.dead);
      if (it === "door" && !alive.length) { this.win = 1.6; sfx.win(); return; }
      const free = (x, y) => this.tile(x, y) === 0 && !this.bombs.some(b => b.x === x && b.y === y);
      for (const e of this.en) {
        if (e.dead) { e.dead -= dt; continue; }
        if (!free(e.x + e.dir.x, e.y + e.dir.y)) { const o = DIRS.filter(d => free(e.x + d.x, e.y + d.y)); e.dir = o.length ? pick(o) : { x: 0, y: 0 }; e.prog = 0; }
        e.prog += e.sp * dt;
        if (e.prog >= 1) { e.prog = 0; e.x += e.dir.x; e.y += e.dir.y; const o = DIRS.filter(d => free(e.x + d.x, e.y + d.y)); if (o.length && (Math.random() < 0.3 || !free(e.x + e.dir.x, e.y + e.dir.y))) e.dir = pick(o); }
        const ex = e.x + e.dir.x * e.prog, ey = e.y + e.dir.y * e.prog;
        if (this.fire.some(f => Math.abs(f.x - ex) < 0.6 && Math.abs(f.y - ey) < 0.6)) { e.dead = 999; this.score += 100 * this.level; sfx.hit(); this.hud(); continue; }
        if (p.inv <= 0 && Math.abs(ex * 16 + 8 - (p.x + 6)) < 11 && Math.abs(ey * 16 + 8 - (p.y + 6)) < 11) { this.lives--; this.dying = 1.2; sfx.die(); this.hud(); return; }
      }
    },
    draw() {
      const t = this.th, ox = this.ox, oy = this.oy, now = performance.now();
      rect("#1d1d1d", 0, 0, W, H);
      for (let y = 0; y < 13; y++) for (let x = 0; x < 15; x++) {
        const X = ox + x * 16, Y = oy + y * 16, v = this.m[y][x];
        rect((x + y) % 2 ? t.floor : t.floor2, X, Y, 16, 16);
        if (v === 1) { rect(t.hard, X, Y, 16, 16); rect("rgba(255,255,255,.25)", X, Y, 16, 2); rect("rgba(0,0,0,.25)", X, Y + 14, 16, 2); }
        else if (v === 2) { rect(t.soft, X, Y, 16, 16); rect(t.softL, X, Y + 7, 16, 1); rect(t.softL, X + 7, Y, 1, 7); rect(t.softL, X + 3, Y + 8, 1, 8); rect(t.softL, X + 11, Y + 8, 1, 8); }
        const rv = this.revealed[x + "," + y]; if (rv && v === 0) { if (rv === "door") { rect("#5d4037", X + 2, Y + 1, 12, 15); rect("#f1c40f", X + 10, Y + 8, 2, 2); } else text(rv === "bomb" ? "💣" : rv === "fire" ? "🔥" : "👟", X + 8, Y + 8, 11); }
      }
      for (const b of this.bombs) { const X = ox + b.x * 16 + 8, Y = oy + b.y * 16 + 9, s = 5 + Math.sin(now / 90) * 0.8; circ("#111", X, Y, s); rect("#fff", X - 2, Y - 3, 2, 2); rect("#e67e22", X + 2, Y - s - 3, 2, 3); }
      for (const f of this.fire) { const X = ox + f.x * 16, Y = oy + f.y * 16; rect("#ff7b00", X + 1, Y + 1, 14, 14); rect("#ffd166", X + 4, Y + 4, 8, 8); }
      for (const e of this.en) { if (e.dead) continue; const X = ox + (e.x + e.dir.x * e.prog) * 16 + 8, Y = oy + (e.y + e.dir.y * e.prog) * 16 + 8; circ("#e08a2e", X, Y + 1, 6); rect("#e08a2e", X - 6, Y - 7, 3, 4); rect("#e08a2e", X + 3, Y - 7, 3, 4); rect("#111", X - 3, Y - 1, 2, 2); rect("#111", X + 1, Y - 1, 2, 2); rect("#fff", X - 3, Y - 1, 1, 1); }
      const p = this.p;
      if (this.dying > 0) text("💫", ox + p.x + 6, oy + p.y + 6, 12);
      else if (!(p.inv > 0 && Math.floor(p.inv * 12) % 2)) { g.save(); g.translate(Math.round(ox + p.x + 6), Math.round(oy + p.y)); g.scale(p.face, 1); rect("#fff", -5, 0, 10, 4); rect("#d32f2f", -4, 1, 2, 2); rect("#d32f2f", 0, 1, 2, 2); rect("#e0a878", -2, 4, 6, 4); rect("#111", 2, 5, 1, 1); rect("#fafafa", -5, 8, 10, 5); g.restore(); }
      text("القطاوة الباقية: " + this.en.filter(e => !e.dead).length, 128, 11, 11, "#fff");
      if (this.intro > 0) banner("المرحلة " + this.level, t.n + " · " + this.en.length + " قطاوة");
      if (this.win > 0) banner("طلعت من الباب! 🎉", "+" + (1000 * this.level));
    }
  };

  /* =====================================================
     السيقا — ركضة الغزال
     ===================================================== */
  const RUN_TH = [
    { n: "صحراء النفود", sky: "#ffcf8a", sky2: "#ffe8c2", far: "#e8b06a", near: "#d4954e", ground: "#c98a3e", gl: "#a86c2a" },
    { n: "واحة الأحساء", sky: "#9ad8f0", sky2: "#d8f3ff", far: "#6fb36f", near: "#4e8f4e", ground: "#b8935a", gl: "#8a6a3a" },
    { n: "جبال عسير", sky: "#a7c7e7", sky2: "#e2eefa", far: "#7d8ea3", near: "#5d6e83", ground: "#6b7a5a", gl: "#4f5c40" },
    { n: "ليل البر", sky: "#0f1a3a", sky2: "#2a3a6a", far: "#26314f", near: "#1b2440", ground: "#4a3b2a", gl: "#2f2418", night: true }
  ];
  const runner = {
    id: "runner", console: "sega", name: "ركضة الغزال", emoji: "🦌", color: "#e67e22", pad: "lr-a",
    desc: "الغزال يركض بلا توقف والسرعة تزيد! نط فوق الصبار والصخور والحفر، وانحني تحت الصقور. اجمع الريالات، وكل ٥٠ ريال تعطيك قلب. كل ١٠٠٠ متر منطقة جديدة.",
    controls: "A أو ▲ أو المس الشاشة للقفز (مرتين = قفزة مزدوجة) — ▼ للانحناء",
    init() { this.score = 0; this.dist = 0; this.coins = 0; this.hearts = 3; this.v = 130; this.zone = 1; this.th = TH(1, RUN_TH); this.p = { y: 196, vy: 0, jumps: 0, duck: false, inv: 0, t: 0 }; this.obs = []; this.cn = []; this.nextObs = 220; this.nextCoin = 120; this.off = 0; this.intro = 1.4; this.hud(); },
    hud() { api.hud("النتيجة " + (this.score + Math.floor(this.dist / 5)) + "  ·  ❤️ " + this.hearts + "  ·  " + Math.floor(this.dist / 10) + " م  ·  💰 " + this.coins); },
    jump() { const p = this.p; if (p.jumps < 2) { p.vy = p.jumps ? -250 : -290; p.jumps++; sfx.jump(); } },
    tap() { this.jump(); },
    update(dt) {
      if (this.intro > 0) { this.intro -= dt; return; }
      const p = this.p, k = api.keys;
      this.v = Math.min(330, 130 + this.dist / 60); this.dist += this.v * dt; this.off += this.v * dt; p.t += dt;
      const z = 1 + Math.floor(this.dist / 10000); if (z !== this.zone) { this.zone = z; this.th = TH(z, RUN_TH); this.score += 500 * (z - 1); this.intro = 1.2; sfx.stage(); }
      if (api.pressed("a") || api.pressed("up")) this.jump();
      p.duck = k.down && p.jumps === 0;
      p.vy += 900 * dt; p.y += p.vy * dt;
      const overPit = this.obs.some(o => o.k === "pit" && 40 > o.x && 52 < o.x + o.w);
      if (p.y >= 196 && !overPit) { p.y = 196; p.vy = 0; p.jumps = 0; }
      if (p.y > H + 20) { this.hit(true); return; }
      p.inv = Math.max(0, p.inv - dt);
      this.nextObs -= this.v * dt;
      if (this.nextObs <= 0) {
        const r = Math.random(), lv = Math.min(1, this.dist / 15000);
        if (r < 0.4) this.obs.push({ k: "cactus", x: W + 10, w: 10, h: 18 + ri(0, 8) });
        else if (r < 0.6) this.obs.push({ k: "rock", x: W + 10, w: 18, h: 12 });
        else if (r < 0.8 && this.dist > 1500) this.obs.push({ k: "bird", x: W + 10, w: 16, h: 8, y: 178 });
        else this.obs.push({ k: "pit", x: W + 10, w: 28 + ri(0, 10) + lv * 16, h: 0 });
        this.nextObs = rnd(150, 260) - lv * 60;
      }
      this.nextCoin -= this.v * dt;
      if (this.nextCoin <= 0) { const y0 = Math.random() < 0.5 ? 180 : 140; for (let i = 0; i < 5; i++) this.cn.push({ x: W + 10 + i * 16, y: y0 - (y0 === 140 ? Math.sin(i / 4 * Math.PI) * 14 : 0) }); this.nextCoin = rnd(180, 320); }
      const ph = p.duck ? 10 : 20, px0 = 40, px1 = 52, py0 = p.y - ph, py1 = p.y;
      for (const o of this.obs) {
        o.x -= this.v * dt * (o.k === "bird" ? 1.25 : 1);
        if (o.k === "pit" || p.inv > 0 || o.hit) continue;
        const oy0 = o.k === "bird" ? o.y - 4 : 196 - o.h, oy1 = o.k === "bird" ? o.y + 4 : 196;
        if (px1 > o.x + 2 && px0 < o.x + o.w - 2 && py1 > oy0 + 2 && py0 < oy1) { o.hit = true; this.hit(false); if (this.hearts <= 0) return; }
      }
      for (const c of this.cn) { c.x -= this.v * dt; if (!c.got && Math.abs(c.x - 46) < 9 && Math.abs(c.y - (p.y - ph / 2)) < 14) { c.got = true; this.coins++; this.score += 10; sfx.coin(); if (this.coins % 50 === 0) { this.hearts = Math.min(5, this.hearts + 1); sfx.win(); } } }
      this.obs = this.obs.filter(o => o.x + o.w > -20); this.cn = this.cn.filter(c => c.x > -10 && !c.got);
      if (Math.random() < dt * 3) this.hud();
    },
    hit(fell) {
      this.hearts--; sfx.die(); this.hud();
      if (this.hearts <= 0) { api.over(this.score + Math.floor(this.dist / 5)); return; }
      this.p.inv = 1.6; if (fell) { this.p.y = 196; this.p.vy = -250; this.obs = this.obs.filter(o => o.k !== "pit"); }
    },
    draw() {
      const t = this.th, off = this.off;
      const gr = g.createLinearGradient(0, 0, 0, 196); gr.addColorStop(0, t.sky); gr.addColorStop(1, t.sky2); g.fillStyle = gr; g.fillRect(0, 0, W, 196);
      if (t.night) { for (let i = 0; i < 40; i++) rect("#fff", (i * 53) % W, (i * 17) % 100, 1, 1); circ("#f5f0d0", 210, 30, 10); } else circ("#fff3c4", 210, 34, 12);
      g.fillStyle = t.far; for (let i = -1; i < 6; i++) { const x = i * 80 - (off * 0.2 % 80); g.beginPath(); g.moveTo(x, 196); g.lineTo(x + 40, 120 + (i % 3) * 12); g.lineTo(x + 80, 196); g.fill(); }
      g.fillStyle = t.near; for (let i = -1; i < 8; i++) { const x = i * 50 - (off * 0.5 % 50); g.beginPath(); g.ellipse(x + 25, 196, 34, 22, 0, Math.PI, 0); g.fill(); }
      rect(t.ground, 0, 196, W, 44); for (let x = -(off % 24); x < W; x += 24) rect(t.gl, x, 202, 12, 2);
      for (const o of this.obs) {
        const x = Math.round(o.x);
        if (o.k === "pit") { rect("#1a1208", x, 196, o.w, 44); }
        else if (o.k === "cactus") { rect("#2e7d32", x + 3, 196 - o.h, 5, o.h); rect("#2e7d32", x, 196 - o.h + 6, 3, 6); rect("#2e7d32", x + 8, 196 - o.h + 4, 3, 7); rect("#43a047", x + 4, 196 - o.h, 1, o.h); }
        else if (o.k === "rock") { rect("#7f8c8d", x, 184, 18, 12); rect("#95a5a6", x + 3, 186, 8, 3); }
        else { const f = Math.floor(performance.now() / 120) % 2; rect("#6d4c41", x, o.y - 2, 14, 5); rect("#6d4c41", x - 3, o.y - 3, 4, 4); rect("#ffb300", x - 5, o.y - 2, 2, 2); rect("#4e342e", x + 4, f ? o.y - 7 : o.y + 2, 6, 5); }
      }
      for (const c of this.cn) { const s = Math.abs(Math.sin(performance.now() / 150 + c.x)) * 3 + 1; rect("#f2c230", c.x - s, c.y - 4, s * 2, 8); }
      const p = this.p;
      if (!(p.inv > 0 && Math.floor(p.inv * 12) % 2)) {
        const x = 40, y = Math.round(p.y), f = Math.floor(p.t * 12) % 2;
        if (p.duck) { rect("#c68642", x - 2, y - 9, 18, 7); rect("#c68642", x + 12, y - 12, 6, 5); rect("#111", x + 15, y - 11, 1, 1); rect("#8b5a2b", x, y - 3, 2, 3); rect("#8b5a2b", x + 12, y - 3, 2, 3); }
        else { rect("#c68642", x, y - 15, 14, 7); rect("#f5deb3", x + 2, y - 9, 10, 2); rect("#c68642", x + 11, y - 21, 5, 8); rect("#c68642", x + 13, y - 22, 6, 4); rect("#111", x + 16, y - 21, 1, 1); rect("#5d4037", x + 12, y - 26, 1, 4); rect("#5d4037", x + 15, y - 26, 1, 4); rect("#8b5a2b", x + 1 + (f ? 1 : 0), y - 8, 2, 8); rect("#8b5a2b", x + 10 - (f ? 1 : 0), y - 8, 2, 8); rect("#fff", x - 1, y - 14, 2, 3); }
      }
      if (this.intro > 0) banner(this.zone === 1 ? "انطلق! 🦌" : "منطقة جديدة", t.n);
    }
  };

  /* =====================================================
     جهاز الطوب — دبابة الطوب
     ===================================================== */
  const TANK_SH = { up: [[0, 1, 0], [1, 1, 1], [1, 0, 1]], down: [[1, 0, 1], [1, 1, 1], [0, 1, 0]], left: [[0, 1, 1], [1, 1, 0], [0, 1, 1]], right: [[1, 1, 0], [0, 1, 1], [1, 1, 0]] };
  const TDIR = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  const tank = {
    id: "tank", console: "brick", name: "دبابة الطوب", emoji: "🪖", color: "#556b2f", pad: "dpad-a",
    desc: "لعبة الدبابات المشهورة في جهاز الطوب! حرّك دبابتك واضرب دبابات العدو قبل لا تضربك. كل ١٠ دبابات تدمرها تنتقل لمستوى أسرع فيه أعداء أكثر.",
    controls: "الأسهم للحركة — A للرمي",
    init() { this.c = 11; this.ox = 73; this.oy = 10; this.level = 1; this.score = 0; this.lives = 3; this.kills = 0; this.setLevel(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  ❤️ " + this.lives + "  ·  مستوى " + this.level + "  ·  " + this.kills + "/١٠"); },
    setLevel() { this.p = { x: 4, y: 16, d: "up" }; this.en = []; this.bul = []; this.et = 0; this.st = 0; this.mt = 0; this.intro = 1.4; this.boom = 0; this.hud(); },
    cells(t) { const out = []; const s = TANK_SH[t.d]; for (let r = 0; r < 3; r++) for (let q = 0; q < 3; q++) if (s[r][q]) out.push([t.x + q, t.y + r]); return out; },
    occupied(x, y, self) { if (x < 0 || y < 0 || x > 7 || y > 17) return true; for (const t of [this.p, ...this.en]) { if (t === self || t.dead) continue; if (Math.abs(t.x - x) < 3 && Math.abs(t.y - y) < 3) return true; } return false; },
    step(t, d) { t.d = d; const [dx, dy] = TDIR[d]; if (!this.occupied(t.x + dx, t.y + dy, t)) { t.x += dx; t.y += dy; } },
    shoot(t, mine) { const [dx, dy] = TDIR[t.d]; this.bul.push({ x: t.x + 1 + dx * 2, y: t.y + 1 + dy * 2, dx, dy, mine }); },
    update(dt) {
      if (this.intro > 0) { this.intro -= dt; return; }
      if (this.boom > 0) { this.boom -= dt; if (this.boom <= 0) { if (this.lives <= 0) { api.over(this.score); return; } this.p = { x: 4, y: 16, d: "up" }; this.bul = []; } return; }
      const k = api.keys; this.mt -= dt;
      for (const d of ["up", "down", "left", "right"]) if (api.pressed(d)) { this.step(this.p, d); this.mt = 0.22; }
      if (this.mt <= 0) { for (const d of ["up", "down", "left", "right"]) if (k[d]) { this.step(this.p, d); this.mt = 0.11; break; } }
      if (api.pressed("a") && this.bul.filter(b => b.mine).length < 2) { this.shoot(this.p, true); sfx.pew(); }
      this.st += dt;
      if (this.st >= 0.05) {
        this.st = 0;
        for (const b of this.bul) {
          b.x += b.dx; b.y += b.dy; if (b.x < 0 || b.x > 9 || b.y < 0 || b.y > 19) { b.dead = true; continue; }
          if (b.mine) { for (const e of this.en) if (!e.dead && this.cells(e).some(([x, y]) => x === b.x && y === b.y)) { e.dead = true; b.dead = true; this.score += 100 * this.level; this.kills++; sfx.hit(); this.hud(); if (this.kills >= 10) { this.kills = 0; this.level++; this.score += 500 * this.level; sfx.stage(); this.setLevel(); return; } } }
          else if (this.cells(this.p).some(([x, y]) => x === b.x && y === b.y)) { b.dead = true; this.lives--; this.boom = 1.2; sfx.boom(); this.hud(); return; }
        }
        for (const a of this.bul) for (const b of this.bul) if (a !== b && a.mine !== b.mine && a.x === b.x && a.y === b.y) { a.dead = b.dead = true; }
        this.bul = this.bul.filter(b => !b.dead);
      }
      this.en = this.en.filter(e => !e.dead);
      const maxE = Math.min(5, 1 + Math.ceil(this.level / 1.5));
      if (this.en.length < maxE && Math.random() < dt * 0.8) { const sx = pick([0, 3, 7]); if (!this.occupied(sx, 0)) this.en.push({ x: sx, y: 0, d: "down", ai: 0 }); }
      this.et += dt; const iv = Math.max(0.12, 0.5 - this.level * 0.04);
      if (this.et >= iv) {
        this.et = 0;
        for (const e of this.en) {
          if (Math.random() < 0.25) e.d = pick(["up", "down", "down", "left", "right"]);
          if (Math.abs(e.x - this.p.x) < 2 && Math.random() < 0.4) e.d = this.p.y > e.y ? "down" : "up";
          else if (Math.abs(e.y - this.p.y) < 2 && Math.random() < 0.4) e.d = this.p.x > e.x ? "right" : "left";
          this.step(e, e.d);
          if (Math.random() < 0.12 + this.level * 0.02) this.shoot(e, false);
        }
      }
    },
    draw() {
      const [bg, ink, cl] = TH(this.level, LCD), c = this.c, grid = Array.from({ length: 20 }, () => new Array(10).fill(0));
      const put = t => { for (const [x, y] of this.cells(t)) if (y >= 0 && y < 20 && x >= 0 && x < 10) grid[y][x] = 1; };
      for (const e of this.en) put(e);
      if (!(this.boom > 0 && Math.floor(this.boom * 8) % 2)) put(this.p);
      for (const b of this.bul) if (b.y >= 0 && b.y < 20) grid[b.y][b.x] = 1;
      rect(bg, 0, 0, W, H); rect(ink, this.ox - 3, this.oy - 3, 10 * c + 5, 20 * c + 5); rect(bg, this.ox - 1, this.oy - 1, 10 * c + 1, 20 * c + 1);
      for (let y = 0; y < 20; y++) for (let x = 0; x < 10; x++) { const X = this.ox + x * c, Y = this.oy + y * c, on = grid[y][x]; rect(on ? ink : cl, X, Y, c - 1, c - 1); rect(bg, X + 2, Y + 2, c - 5, c - 5); if (on) rect(ink, X + 3, Y + 3, c - 7, c - 7); }
      text("مستوى", 214, 40, 11, ink); text(String(this.level), 214, 58, 16, ink);
      text("النتيجة", 214, 100, 11, ink); text(String(this.score), 214, 116, 13, ink);
      text("دمرت " + this.kills + "/١٠", 214, 150, 10, ink); text("❤️".repeat(Math.max(0, this.lives)), 214, 172, 10, ink);
      text("٩٩٩٩", 36, 120, 14, ink);
      if (this.intro > 0) banner("المستوى " + this.level, "دمّر ١٠ دبابات");
    }
  };

  LIST.push(dates, bomber, runner, tank);
