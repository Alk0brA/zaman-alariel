
  /* =====================================================
     كمبيوتر العائلة — قنص الطيور
     ===================================================== */
  const HUNT_TH = [
    { n: "صباح الوادي", sky: "#69b7ee", sky2: "#a8dcff", grass: "#4fae4f", bush: "#2f7f36", tree: "#2f8a3a", cloud: "#fff" },
    { n: "غروب المزرعة", sky: "#f08a4b", sky2: "#ffd08a", grass: "#6b8e23", bush: "#4d6b1a", tree: "#3e5f1a", cloud: "#ffd9b0" },
    { n: "ليل البر", sky: "#0d1b3e", sky2: "#22396b", grass: "#1f4d2b", bush: "#163a20", tree: "#12301a", cloud: "#33476e", night: true },
    { n: "يوم غبار", sky: "#c9a46a", sky2: "#e8cf9c", grass: "#9b8a4a", bush: "#7a6a32", tree: "#5d6b2a", cloud: "#d9bf8a" }
  ];
  const hunt = {
    id: "hunt", console: "family", name: "قنص الطيور", emoji: "🦆", color: "#2f8fd8", pad: "dpad-a",
    desc: "الطيور تطلع من بين الشجر وتطير بسرعة. عندك ٣ طلقات لكل موجة، وصيد ٦ من ١٠ ينقلك للجولة الجاية. كل جولة وقت مختلف من اليوم والطيور أسرع.",
    controls: "اضغط على الطائر مباشرة — أو حرّك المؤشر بالأسهم واضغط A",
    init() { this.round = 1; this.score = 0; this.cx = 128; this.cy = 100; this.flash = 0; this.newRound(); this.hud(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  الجولة " + this.round); },
    newRound() { this.th = TH(this.round, HUNT_TH); this.total = 10; this.idx = 0; this.results = []; this.banner = 1.8; this.pause = 0; this.stars = Array.from({ length: 30 }, () => [rnd(0, W), rnd(0, 150)]); this.wave(); },
    wave() {
      const n = Math.min(this.round >= 4 ? 3 : 2, this.total - this.idx); this.birds = [];
      const sp = 45 + this.round * 13;
      for (let i = 0; i < n; i++) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        this.birds.push({ x: rnd(50, 206), y: 196, vx: dir * sp * rnd(0.7, 1.2), vy: -sp * rnd(0.8, 1.1), st: "fly", t: 0, turn: rnd(0.5, 1.3), col: ["#2c6e49", "#b5442c", "#5b3f8c"][i % 3], gold: Math.random() < 0.08 });
      }
      this.idx += n; this.shots = 3; this.wt = 0;
    },
    shoot(x, y) {
      if (this.banner > 0 || this.pause > 0 || this.shots <= 0) return;
      this.shots--; this.flash = 0.06; sfx.shot();
      for (const b of this.birds) if (b.st === "fly" && Math.hypot(b.x - x, b.y - y) < 15) {
        b.st = "hit"; b.t = 0; this.score += (b.gold ? 500 : 100) * this.round + (this.wt < 2 ? 50 : 0); sfx.hit();
      }
      this.hud();
    },
    tap(x, y) { this.cx = x; this.cy = y; this.shoot(x, y); },
    update(dt) {
      this.flash = Math.max(0, this.flash - dt);
      const k = api.keys, s = 140 * dt;
      if (k.left) this.cx -= s; if (k.right) this.cx += s; if (k.up) this.cy -= s; if (k.down) this.cy += s;
      this.cx = Math.max(4, Math.min(W - 4, this.cx)); this.cy = Math.max(4, Math.min(185, this.cy));
      if (api.pressed("a")) this.shoot(this.cx, this.cy);
      if (this.banner > 0) { this.banner -= dt; return; }
      if (this.pause > 0) { this.pause -= dt; if (this.pause <= 0) this.afterWave(); return; }
      this.wt += dt;
      const escT = Math.max(4, 7 - this.round * 0.3);
      for (const b of this.birds) {
        b.t += dt;
        if (b.st === "fly") {
          b.x += b.vx * dt; b.y += b.vy * dt;
          if (b.x < 10) { b.x = 10; b.vx = Math.abs(b.vx); } if (b.x > W - 10) { b.x = W - 10; b.vx = -Math.abs(b.vx); }
          if (b.y < 14) { b.y = 14; b.vy = Math.abs(b.vy); } if (b.y > 165 && b.t > 1) { b.y = 165; b.vy = -Math.abs(b.vy); }
          b.turn -= dt; if (b.turn <= 0) { b.turn = rnd(0.5, 1.3); if (Math.random() < 0.5) b.vx = -b.vx; b.vy = (Math.random() < 0.5 ? -1 : 1) * Math.abs(b.vy); }
          if (this.wt > escT || this.shots === 0) { b.st = "esc"; b.vy = -160; }
        } else if (b.st === "esc") { b.y += b.vy * dt; b.x += b.vx * 0.3 * dt; if (b.y < -20) b.st = "gone"; }
        else if (b.st === "hit") { if (b.t > 0.35) b.st = "fall"; }
        else if (b.st === "fall") { b.y += 170 * dt; if (b.y > 196) b.st = "down"; }
      }
      if (this.birds.every(b => b.st === "gone" || b.st === "down")) { for (const b of this.birds) this.results.push(b.st === "down"); this.pause = 0.7; }
    },
    afterWave() {
      if (this.idx < this.total) { this.wave(); return; }
      const n = this.results.filter(Boolean).length;
      if (n >= 6) { this.score += n === 10 ? 1000 * this.round : 200 * this.round; this.round++; sfx.stage(); this.newRound(); this.hud(); }
      else api.over(this.score);
    },
    bird(b) {
      const fr = Math.floor(b.t * 8) % 2, d = b.vx < 0 ? -1 : 1, c = b.gold ? "#f2c230" : b.col;
      g.save(); g.translate(Math.round(b.x), Math.round(b.y)); g.scale(d, b.st === "fall" ? -1 : 1);
      rect(c, -7, -3, 13, 7); rect(c, 3, -7, 6, 6); rect("#f4a93f", 9, -5, 4, 2);
      rect("#fff", 6, -6, 2, 2); rect("#111", 7, -6, 1, 1); rect("#f0e6c8", -5, 1, 9, 2);
      if (b.st === "hit") rect("#fff", -2, -10, 4, 4); else if (fr) rect("#1d1d1d", -5, -10, 7, 7); else rect("#1d1d1d", -5, 3, 7, 6);
      g.restore();
    },
    draw() {
      const t = this.th;
      const gr = g.createLinearGradient(0, 0, 0, 190); gr.addColorStop(0, t.sky); gr.addColorStop(1, t.sky2); g.fillStyle = gr; g.fillRect(0, 0, W, 190);
      if (t.night) { for (const s of this.stars) rect("#fff", s[0], s[1], 1, 1); circ("#f5f0d0", 200, 40, 14); circ(t.sky, 206, 36, 12); }
      rect(t.cloud, 30, 30, 34, 8); rect(t.cloud, 38, 24, 18, 8); rect(t.cloud, 170, 58, 40, 8); rect(t.cloud, 180, 52, 20, 8);
      rect("#6b3f22", 24, 120, 10, 80); rect(t.tree, 6, 92, 46, 34); rect(t.tree, 12, 82, 34, 18);
      for (const b of this.birds) if (b.st !== "gone" && b.st !== "down") this.bird(b);
      rect(t.grass, 0, 188, W, 52);
      for (let x = -10; x < W; x += 34) { rect(t.bush, x, 180, 26, 12); rect(t.bush, x + 5, 174, 16, 8); }
      rect("#1d2b1d", 0, 214, W, 26);
      text("طلقات", 238, 226, 10, "#cfe"); for (let i = 0; i < 3; i++) rect(i < this.shots ? "#f2c230" : "#555", 196 + i * 8, 220, 5, 12);
      for (let i = 0; i < 10; i++) { const r = this.results[i]; rect(r === true ? "#5fd35f" : r === false ? "#e05050" : "#ddd", 12 + i * 15, 222, 10, 8); }
      g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.beginPath(); g.arc(this.cx, this.cy, 8, 0, 7); g.moveTo(this.cx - 12, this.cy); g.lineTo(this.cx + 12, this.cy); g.moveTo(this.cx, this.cy - 12); g.lineTo(this.cx, this.cy + 12); g.stroke();
      if (this.banner > 0) banner("الجولة " + this.round, t.n);
      if (this.flash > 0) rect("rgba(255,255,255,.75)", 0, 0, W, H);
    }
  };

  /* =====================================================
     كمبيوتر العائلة — مغامرة الحارة
     ===================================================== */
  const T = 16;
  const HARA_TH = [
    { n: "حارة الظهر", sky: "#9fd8ff", haze: "#ffe7a8", bld: "#e8d2b0", bld2: "#cdb592", win: "#7aa7c7", gr: "#d9a35b", gl: "#b07a3a", gt: "#e9bd77" },
    { n: "عصرية الحارة", sky: "#ff9e5e", haze: "#ffd28a", bld: "#d8a377", bld2: "#b9855a", win: "#ffe08a", gr: "#c98f4c", gl: "#9c6830", gt: "#e0a865" },
    { n: "سهرة الحارة", sky: "#13203f", haze: "#24365f", bld: "#2e3c5a", bld2: "#222d45", win: "#ffd75e", gr: "#7a5a3a", gl: "#5a3f26", gt: "#8f6c48", night: true },
    { n: "طلعة البر", sky: "#bfe3ff", haze: "#f6dca8", bld: "#e8c98f", bld2: "#d4b072", win: "#e8c98f", gr: "#e2b46a", gl: "#c08c45", gt: "#f0c985", desert: true }
  ];
  const hara = {
    id: "hara", console: "family", name: "مغامرة الحارة", emoji: "🏃", color: "#d9572b", pad: "lr-a",
    desc: "ساعد (سعود) يوصل البقالة قبل لا تقفل! نط فوق القطاوة، اجمع الريالات، واضرب صناديق (؟) من تحت. كل مرحلة وقت مختلف، والحفر والأعداء يزيدون، ومن المرحلة الثالثة يطلع الحمام.",
    controls: "◀ ▶ للمشي — A (أو ▲) للقفز، وكل ما ضغطت أطول نطيت أعلى",
    init() { this.level = 1; this.score = 0; this.lives = 3; this.coins = 0; this.build(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  ريالات " + this.coins + "  ·  ❤️ " + this.lives + "  ·  مرحلة " + this.level); },
    build() {
      this.th = TH(this.level, HARA_TH);
      const R = seeded(this.level * 7919 + 13);
      const w = Math.min(300, 110 + this.level * 22); this.mw = w; this.map = [];
      for (let y = 0; y < 15; y++) this.map.push(new Array(w).fill(0));
      const gapP = Math.min(0.16, 0.07 + this.level * 0.012);
      let x = 0;
      while (x < w) {
        if (x > 14 && x < w - 16 && R() < gapP) { x += 2 + Math.floor(R() * (this.level > 3 ? 2 : 1)); continue; }
        this.map[13][x] = 1; this.map[14][x] = 1; x++;
      }
      this.coinsList = []; this.enemies = []; this.birds = [];
      for (let px = 12; px < w - 14; px += 7 + Math.floor(R() * 6)) {
        const row = R() < 0.5 ? 9 : 6, len = 2 + Math.floor(R() * 4);
        for (let i = 0; i < len; i++) this.map[row][px + i] = R() < 0.3 ? 3 : 2;
        for (let i = 0; i < len; i++) if (R() < 0.6) this.coinsList.push({ x: (px + i) * T + 8, y: (row - 1) * T + 8, got: false });
      }
      const espd = 26 + this.level * 5, gap = Math.max(6, 12 - this.level);
      for (let ex = 20; ex < w - 16; ex += gap + Math.floor(R() * 8)) if (this.map[13][ex]) this.enemies.push({ x: ex * T, y: 13 * T - 12, vx: -espd, vy: 0, dead: 0 });
      if (this.level >= 3) for (let bx = 30; bx < w - 20; bx += Math.max(14, 30 - this.level * 2)) this.birds.push({ x: bx * T, by: 70 + R() * 70, t: R() * 6, dead: 0 });
      for (let i = w - 12; i < w; i++) { this.map[13][i] = 1; this.map[14][i] = 1; }
      this.goalX = (w - 7) * T; this.intro = 1.6;
      this.respawn(); this.hud();
    },
    respawn() { this.p = { x: 32, y: 13 * T - 16, w: 11, h: 16, vx: 0, vy: 0, on: false, face: 1, t: 0, inv: 1.2 }; this.cam = 0; this.done = 0; },
    solid(tx, ty) { if (tx < 0) return true; if (ty < 0 || ty >= 15 || tx >= this.mw) return false; const v = this.map[ty][tx]; return v >= 1 && v <= 4; },
    collide(o, axis) {
      const x0 = Math.floor(o.x / T), x1 = Math.floor((o.x + o.w - 0.01) / T), y0 = Math.floor(o.y / T), y1 = Math.floor((o.y + o.h - 0.01) / T);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.solid(tx, ty)) {
        if (axis === "x") { if (o.vx > 0) o.x = tx * T - o.w; else if (o.vx < 0) o.x = (tx + 1) * T; o.vx = 0; return "x"; }
        if (o.vy > 0) { o.y = ty * T - o.h; o.vy = 0; o.on = true; }
        else if (o.vy < 0) { o.y = (ty + 1) * T; o.vy = 0; if (o === this.p) this.bump(tx, ty); }
        return "y";
      }
      return null;
    },
    bump(tx, ty) {
      if (this.map[ty][tx] === 3) { this.map[ty][tx] = 4; this.coins++; this.score += 200; sfx.coin(); this.pop = { x: tx * T + 8, y: ty * T - 6, t: 0.5 }; this.hud(); }
      else sfx.bounce();
    },
    lose() { this.lives--; sfx.die(); this.hud(); if (this.lives <= 0) { api.over(this.score); return true; } this.respawn(); return false; },
    update(dt) {
      const p = this.p, k = api.keys;
      if (this.intro > 0) { this.intro -= dt; return; }
      if (this.done > 0) { this.done -= dt; if (this.done <= 0) { this.level++; this.score += 1000; sfx.stage(); this.build(); } return; }
      p.inv = Math.max(0, p.inv - dt);
      const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      if (dir) { p.vx += dir * 520 * dt; p.face = dir; } else { p.vx *= Math.pow(0.0008, dt); if (Math.abs(p.vx) < 4) p.vx = 0; }
      p.vx = Math.max(-105, Math.min(105, p.vx));
      if ((api.pressed("a") || api.pressed("up")) && p.on) { p.vy = -335; p.on = false; sfx.jump(); }
      p.vy = Math.min(p.vy + (p.vy < 0 && (k.a || k.up) ? 620 : 1250) * dt, 420);
      p.x += p.vx * dt; this.collide(p, "x");
      p.on = false; p.y += p.vy * dt; this.collide(p, "y");
      if (p.x < this.cam) p.x = this.cam;
      p.t += dt * (Math.abs(p.vx) > 5 ? 1 : 0);
      if (p.y > H + 20) { this.lose(); return; }
      for (const c of this.coinsList) if (!c.got && Math.abs(c.x - (p.x + p.w / 2)) < 10 && Math.abs(c.y - (p.y + p.h / 2)) < 12) { c.got = true; this.coins++; this.score += 100; sfx.coin(); this.hud(); }
      const hitP = (x, y, w, h) => p.x < x + w && p.x + p.w > x && p.y < y + h && p.y + p.h > y;
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.abs(e.x - p.x) > 300) continue;
        e.w = 14; e.h = 12; e.vy = Math.min(e.vy + 1200 * dt, 400);
        const pv = e.vx; e.x += e.vx * dt; if (this.collide(e, "x")) e.vx = -pv;
        e.on = false; e.y += e.vy * dt; this.collide(e, "y");
        if (e.y > H + 30) { e.dead = 1; continue; }
        if (hitP(e.x, e.y, e.w, e.h)) {
          if (p.vy > 30 && p.y + p.h - e.y < 10) { e.dead = 1; e.squash = 0.4; this.score += 150; p.vy = -230; sfx.hit(); this.hud(); }
          else if (p.inv <= 0) { if (this.lose()) return; }
        }
      }
      for (const b of this.birds) {
        if (b.dead || Math.abs(b.x - p.x) > 320) continue;
        b.t += dt; b.x -= (30 + this.level * 3) * dt; b.y = b.by + Math.sin(b.t * 2.4) * 22;
        if (hitP(b.x - 7, b.y - 4, 14, 8)) {
          if (p.vy > 30 && p.y + p.h - (b.y - 4) < 9) { b.dead = 1; this.score += 250; p.vy = -230; sfx.hit(); this.hud(); }
          else if (p.inv <= 0) { if (this.lose()) return; }
        }
      }
      if (p.x > this.goalX) { this.done = 1.6; sfx.win(); }
      this.cam = Math.max(0, Math.min(p.x - 100, this.mw * T - W));
      if (this.pop) { this.pop.t -= dt; this.pop.y -= 40 * dt; if (this.pop.t <= 0) this.pop = null; }
      for (const e of this.enemies) if (e.squash > 0) e.squash -= dt;
    },
    draw() {
      const cam = Math.round(this.cam), t = this.th, now = performance.now();
      rect(t.sky, 0, 0, W, H); rect(t.haze, 0, 150, W, 60);
      if (t.night) { for (let i = 0; i < 40; i++) rect("#fff", (i * 53 + 7) % W, (i * 29) % 120, 1, 1); circ("#f5f0d0", 210, 34, 10); }
      g.save(); g.translate(-Math.round(cam * 0.35), 0);
      if (t.desert) { for (let i = 0; i < 30; i++) { g.fillStyle = i % 2 ? "#e8c98f" : "#dcb877"; g.beginPath(); g.ellipse(i * 110, 205, 90, 50, 0, Math.PI, 0); g.fill(); } for (let i = 0; i < 12; i++) { const cx = i * 260 + 120; rect("#6b4a2b", cx, 170, 14, 10); rect("#6b4a2b", cx + 10, 162, 4, 10); rect("#6b4a2b", cx + 12, 160, 6, 4); rect("#6b4a2b", cx + 2, 180, 2, 10); rect("#6b4a2b", cx + 10, 180, 2, 10); } }
      else for (let i = 0; i < 40; i++) { const bx = i * 70, bh = 40 + (i * 37) % 40; rect(t.bld, bx, 200 - bh, 54, bh); rect(t.bld2, bx, 200 - bh, 54, 4); rect(t.win, bx + 8, 210 - bh, 8, 8); rect(t.win, bx + 30, 210 - bh, 8, 8); if (i % 3 === 0) rect("#ddd", bx + 36, 186 - bh, 12, 14); }
      for (let i = 0; i < 20; i++) { const tx = i * 150 + 40; rect("#8b5a2b", tx, 150, 5, 60); rect("#3f9a3f", tx - 12, 144, 29, 6); rect("#3f9a3f", tx - 6, 138, 17, 6); }
      g.restore();
      g.save(); g.translate(-cam, 0);
      const x0 = Math.floor(cam / T), x1 = Math.min(this.mw - 1, x0 + 17);
      for (let ty = 0; ty < 15; ty++) for (let tx = x0; tx <= x1; tx++) {
        const v = this.map[ty][tx]; if (!v) continue; const X = tx * T, Y = ty * T;
        if (v === 1) { rect(t.gr, X, Y, T, T); rect(t.gl, X, Y + 7, T, 1); rect(t.gl, X + (ty % 2 ? 4 : 11), Y, 1, 7); rect(t.gl, X + (ty % 2 ? 11 : 4), Y + 8, 1, 8); if (ty === 13) rect(t.gt, X, Y, T, 3); }
        else if (v === 2) { rect("#c4602f", X, Y, T, T); rect("#8a3f1d", X, Y + 7, T, 1); rect("#8a3f1d", X + 7, Y, 1, 7); rect("#8a3f1d", X + 3, Y + 8, 1, 8); rect("#e07a45", X, Y, T, 2); }
        else if (v === 3) { rect("#f2c230", X, Y, T, T); rect("#a67c00", X, Y + 14, T, 2); rect("#a67c00", X + 14, Y, 2, T); text("؟", X + 8, Y + 8, 12, "#7a4a00"); }
        else if (v === 4) { rect("#9b6a3c", X, Y, T, T); rect("#6e4826", X + 2, Y + 2, 12, 12); }
      }
      const gx = this.goalX;
      rect("#f6efe0", gx, 13 * T - 64, 64, 64); rect("#2f7f6f", gx - 4, 13 * T - 72, 72, 14); text("بقالة", gx + 32, 13 * T - 65, 10, "#fff");
      rect("#6b3f22", gx + 24, 13 * T - 30, 16, 30); rect(t.night ? "#ffd75e" : "#7fb8d8", gx + 6, 13 * T - 46, 14, 12); rect(t.night ? "#ffd75e" : "#7fb8d8", gx + 44, 13 * T - 46, 14, 12);
      for (const c of this.coinsList) if (!c.got) { const s = Math.abs(Math.sin(now / 180)) * 3 + 1; rect("#f2c230", c.x - s, c.y - 4, s * 2, 8); rect("#fff3a0", c.x - 1, c.y - 3, 1, 3); }
      if (this.pop) text("+٢٠٠", this.pop.x, this.pop.y, 10, "#fff");
      for (const e of this.enemies) {
        if (e.squash > 0) { rect("#e08a2e", e.x, e.y + 8, 14, 4); continue; }
        if (e.dead) continue;
        const f = Math.floor(now / 150) % 2, d = e.vx < 0 ? -1 : 1;
        g.save(); g.translate(Math.round(e.x + 7), Math.round(e.y)); g.scale(d, 1);
        rect("#e08a2e", -6, 3, 11, 6); rect("#e08a2e", 3, 0, 6, 6); rect("#e08a2e", 3, -2, 2, 2); rect("#e08a2e", 7, -2, 2, 2);
        rect("#b8651a", -4, 4, 2, 4); rect("#b8651a", 0, 4, 2, 4); rect("#111", 7, 2, 1, 1); rect("#e08a2e", -9, 1 + f, 3, 2);
        rect("#7a3e0a", -5, 9, 2, 3 - f); rect("#7a3e0a", 2, 9, 2, 2 + f);
        g.restore();
      }
      for (const b of this.birds) {
        if (b.dead) continue; const f = Math.floor(now / 120) % 2;
        rect("#9aa5b1", b.x - 6, b.y - 2, 11, 5); rect("#9aa5b1", b.x - 9, b.y - 3, 4, 4); rect("#f39c12", b.x - 11, b.y - 2, 2, 1); rect("#111", b.x - 8, b.y - 2, 1, 1);
        rect("#6c7a89", b.x - 3, f ? b.y - 7 : b.y + 2, 6, 5);
      }
      const p = this.p;
      if (!(p.inv > 0 && Math.floor(p.inv * 12) % 2)) {
        const f = Math.floor(p.t * 10) % 2;
        g.save(); g.translate(Math.round(p.x + p.w / 2), Math.round(p.y)); g.scale(p.face, 1);
        rect("#fff", -5, 0, 10, 4); rect("#d32f2f", -4, 1, 2, 2); rect("#d32f2f", 0, 1, 2, 2); rect("#d32f2f", -6, 3, 3, 6);
        rect("#111", -5, 0, 10, 1); rect("#e0a878", -2, 4, 6, 5); rect("#111", 2, 5, 1, 1);
        rect("#fafafa", -5, 9, 10, 6); rect("#ddd", -5, 14, 10, 1);
        if (!p.on) { rect("#5a3a22", -5, 15, 3, 1); rect("#5a3a22", 2, 15, 3, 1); }
        else { rect("#5a3a22", -4 + (f ? 1 : 0), 15, 3, 1); rect("#5a3a22", 1 - (f ? 1 : 0), 15, 3, 1); }
        g.restore();
      }
      g.restore();
      if (this.intro > 0) banner("المرحلة " + this.level, t.n);
      if (this.done > 0) banner("وصلت البقالة! 🎉", "+١٠٠٠");
    }
  };

  /* =====================================================
     جهاز الطوب — الثعبان
     ===================================================== */
  const SNAKE_MAPS = [
    [],
    [[10, 3, 1, 10]],
    [[4, 3, 3, 3], [13, 3, 3, 3], [4, 10, 3, 3], [13, 10, 3, 3]],
    [[3, 5, 6, 1], [11, 5, 6, 1], [3, 11, 6, 1], [11, 11, 6, 1]],
    [[0, 0, 20, 1], [0, 0, 1, 14], [19, 0, 1, 14], [9, 6, 2, 4]],
    [[5, 2, 1, 11], [14, 2, 1, 11], [8, 7, 4, 1]]
  ];
  const LCD = [["#9ead86", "#2b3a20", "#a9b98f"], ["#8fb3c4", "#1c3340", "#a3c6d6"], ["#d8b86a", "#4a3410", "#e6c97f"], ["#b4b4a4", "#2e2e26", "#c4c4b4"]];
  const snake = {
    id: "snake", console: "brick", name: "الثعبان", emoji: "🐍", color: "#4a8c2a", pad: "dpad",
    desc: "كُل الشبس وكبّر الثعبان. كل ٨ أكلات تنتقل لمرحلة جديدة فيها جدران مختلفة وسرعة أعلى.",
    controls: "الأسهم للتوجيه — أو اسحب بإصبعك على الشاشة",
    init() { this.c = 12; this.cols = 20; this.rows = 18; this.ox = 8; this.oy = 10; this.score = 0; this.stage = 1; this.newStage(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  الطول " + this.s.length + "  ·  مرحلة " + this.stage); },
    newStage() {
      this.walls = new Set(); for (const [x, y, w, h] of TH(this.stage, SNAKE_MAPS)) for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) this.walls.add((x + i) + "," + (y + j));
      this.s = [{ x: 5, y: 16 }, { x: 4, y: 16 }, { x: 3, y: 16 }]; this.d = { x: 1, y: 0 }; this.q = []; this.t = 0; this.eaten = 0;
      this.step = Math.max(0.055, 0.15 - (this.stage - 1) * 0.012); this.pal = TH(this.stage, LCD); this.intro = 1.4; this.food(); this.hud();
    },
    food() { let n = 0; do { this.f = { x: ri(0, this.cols - 1), y: ri(0, this.rows - 1) }; n++; } while (n < 500 && (this.walls.has(this.f.x + "," + this.f.y) || this.s.some(p => p.x === this.f.x && p.y === this.f.y))); },
    turn(x, y) { const ld = this.q.length ? this.q[this.q.length - 1] : this.d; if ((ld.x === -x && ld.y === -y) || (ld.x === x && ld.y === y)) return; if (this.q.length < 3) this.q.push({ x, y }); },
    tap(x, y) { this.sx = x; this.sy = y; },
    release(x, y) { if (this.sx == null) return; const dx = x - this.sx, dy = y - this.sy; this.sx = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return; if (Math.abs(dx) > Math.abs(dy)) this.turn(Math.sign(dx), 0); else this.turn(0, Math.sign(dy)); },
    update(dt) {
      if (api.pressed("left")) this.turn(-1, 0); if (api.pressed("right")) this.turn(1, 0); if (api.pressed("up")) this.turn(0, -1); if (api.pressed("down")) this.turn(0, 1);
      if (this.intro > 0) { this.intro -= dt; return; }
      this.t += dt; if (this.t < this.step) return; this.t = 0;
      if (this.q.length) this.d = this.q.shift();
      const h = { x: this.s[0].x + this.d.x, y: this.s[0].y + this.d.y };
      if (h.x < 0 || h.y < 0 || h.x >= this.cols || h.y >= this.rows || this.walls.has(h.x + "," + h.y) || this.s.some(p => p.x === h.x && p.y === h.y)) { sfx.die(); api.over(this.score); return; }
      this.s.unshift(h);
      if (h.x === this.f.x && h.y === this.f.y) {
        this.score += 10 * this.stage; this.eaten++; this.step = Math.max(0.05, this.step - 0.003); sfx.blip();
        if (this.eaten >= 8) { this.score += 200 * this.stage; this.stage++; sfx.stage(); this.newStage(); return; }
        this.food(); this.hud();
      } else this.s.pop();
    },
    draw() {
      const [bg, ink, cell] = this.pal, c = this.c;
      rect(bg, 0, 0, W, H); rect(ink, this.ox - 2, this.oy - 2, this.cols * c + 4, this.rows * c + 4); rect(cell, this.ox, this.oy, this.cols * c, this.rows * c);
      for (const k of this.walls) { const [x, y] = k.split(",").map(Number); rect(ink, this.ox + x * c, this.oy + y * c, c, c); rect(cell, this.ox + x * c + 3, this.oy + y * c + 3, c - 6, c - 6); }
      rect("#c0392b", this.ox + this.f.x * c + 2, this.oy + this.f.y * c + 1, c - 4, c - 2); rect("#f1c40f", this.ox + this.f.x * c + 4, this.oy + this.f.y * c + 3, c - 8, 3);
      this.s.forEach((p, i) => { rect(ink, this.ox + p.x * c + 1, this.oy + p.y * c + 1, c - 2, c - 2); if (!i) rect(cell, this.ox + p.x * c + 3 + (this.d.x > 0 ? 4 : 0), this.oy + p.y * c + 3 + (this.d.y > 0 ? 4 : 0), 2, 2); });
      text("مرحلة " + this.stage + "  ·  " + this.eaten + "/٨", 128, 232, 10, ink);
      if (this.intro > 0) banner("المرحلة " + this.stage, this.stage === 1 ? "بدون جدران" : "جدران جديدة!");
    }
  };

  /* =====================================================
     الأتاري — تكسير الطوب
     ===================================================== */
  const BR_PAT = [
    { n: "الجدار الكامل", f: () => true },
    { n: "رقعة الشطرنج", f: (r, c) => (r + c) % 2 === 0 },
    { n: "الهرم", f: (r, c) => c >= r - 1 && c <= 10 - r },
    { n: "الماسة", f: (r, c) => Math.abs(c - 4.5) + Math.abs(r - 2.5) <= 4 },
    { n: "الخطوط", f: (r, c) => r % 2 === 0 || c % 3 === 1 },
    { n: "النخلة", f: (r, c) => (r < 2 && c > 1 && c < 8) || (c === 4 || c === 5) }
  ];
  const bricks = {
    id: "bricks", console: "atari", name: "تكسير الطوب", emoji: "🧱", color: "#8e44ad", pad: "lr-a",
    desc: "حرّك المضرب وخلّ الكرة تكسّر كل الطوب. كل مرحلة شكل جدار جديد، ومن المرحلة الثالثة يطلع طوب فضي يحتاج ضربتين.",
    controls: "◀ ▶ أو اسحب بإصبعك لتحريك المضرب — A أو اللمس لإطلاق الكرة",
    init() { this.level = 1; this.score = 0; this.lives = 3; this.px = 108; this.setup(); this.hud(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  ❤️ " + this.lives + "  ·  مرحلة " + this.level); },
    setup() {
      this.br = []; const cols = ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6"]; const pat = TH(this.level, BR_PAT); this.pat = pat;
      const silverRows = this.level >= 6 ? 2 : this.level >= 3 ? 1 : 0;
      for (let r = 0; r < 6; r++) for (let c = 0; c < 10; c++) if (pat.f(r, c)) this.br.push({ x: 8 + c * 24, y: 28 + r * 11, w: 23, h: 10, c: cols[r], v: 6 - r, hp: r < silverRows ? 2 : 1 });
      this.pw = Math.max(28, 40 - (this.level - 1) * 2); this.intro = 1.4; this.stick();
    },
    stick() { this.ball = { x: this.px + this.pw / 2, y: 214, vx: 0, vy: 0, on: true }; },
    launch() { if (!this.ball.on || this.intro > 0) return; const sp = Math.min(320, 150 + this.level * 15); this.ball.on = false; this.ball.vx = sp * rnd(-0.5, 0.5); this.ball.vy = -sp; sfx.bounce(); },
    tap(x) { this.drag = true; this.px = x - this.pw / 2; this.launch(); },
    move(x) { if (this.drag) this.px = x - this.pw / 2; },
    release() { this.drag = false; },
    update(dt) {
      const k = api.keys; if (k.left) this.px -= 230 * dt; if (k.right) this.px += 230 * dt;
      this.px = Math.max(0, Math.min(W - this.pw, this.px));
      if (this.intro > 0) this.intro -= dt;
      if (api.pressed("a") || api.pressed("up")) this.launch();
      const b = this.ball;
      if (b.on) { b.x = this.px + this.pw / 2; b.y = 214; return; }
      for (let s = 0; s < 3; s++) {
        b.x += b.vx * dt / 3; b.y += b.vy * dt / 3;
        if (b.x < 3) { b.x = 3; b.vx = Math.abs(b.vx); sfx.bounce(); } if (b.x > W - 3) { b.x = W - 3; b.vx = -Math.abs(b.vx); sfx.bounce(); }
        if (b.y < 3) { b.y = 3; b.vy = Math.abs(b.vy); sfx.bounce(); }
        if (b.vy > 0 && b.y > 215 && b.y < 224 && b.x > this.px - 3 && b.x < this.px + this.pw + 3) {
          const sp = Math.min(380, Math.hypot(b.vx, b.vy) * 1.015), rel = (b.x - (this.px + this.pw / 2)) / (this.pw / 2 + 3);
          b.vx = sp * rel * 0.85; b.vy = -Math.sqrt(Math.max(sp * sp - b.vx * b.vx, sp * sp * 0.25)); sfx.bounce();
        }
        for (const br of this.br) if (!br.hit && b.x > br.x - 3 && b.x < br.x + br.w + 3 && b.y > br.y - 3 && b.y < br.y + br.h + 3) {
          br.hp--; if (br.hp <= 0) { br.hit = true; this.score += br.v * 10 * this.level; sfx.blip(); } else sfx.hit();
          const ox = Math.min(b.x - (br.x - 3), br.x + br.w + 3 - b.x), oy = Math.min(b.y - (br.y - 3), br.y + br.h + 3 - b.y);
          if (ox < oy) b.vx = -b.vx; else b.vy = -b.vy;
          this.hud(); break;
        }
      }
      if (b.y > H + 6) { this.lives--; sfx.die(); this.hud(); if (this.lives <= 0) { api.over(this.score); return; } this.stick(); }
      if (this.br.every(x => x.hit)) { this.level++; this.score += 500 * (this.level - 1); this.lives = Math.min(5, this.lives + 1); sfx.stage(); this.setup(); this.hud(); }
    },
    draw() {
      rect("#111", 0, 0, W, H); rect("#444", 0, 0, W, 2);
      for (const br of this.br) if (!br.hit) { rect(br.hp > 1 ? "#bdc3c7" : br.c, br.x, br.y, br.w, br.h); rect("rgba(255,255,255,.28)", br.x, br.y, br.w, 2); }
      rect("#ecf0f1", this.px, 218, this.pw, 6); rect("#e74c3c", this.px, 218, 5, 6); rect("#e74c3c", this.px + this.pw - 5, 218, 5, 6);
      rect("#fff", this.ball.x - 3, this.ball.y - 3, 6, 6);
      if (this.intro > 0) banner("المرحلة " + this.level, this.pat.n);
      else if (this.ball.on) text("اضغط A أو المس الشاشة", 128, 150, 12, "#aaa");
    }
  };

  /* =====================================================
     الأتاري — حرب الفضاء
     ===================================================== */
  const INV_FORM = [
    { n: "التشكيل المربع", f: () => true },
    { n: "تشكيل السهم", f: (r, c) => Math.abs(c - 3.5) >= r - 0.5 },
    { n: "تشكيل الماسة", f: (r, c) => Math.abs(c - 3.5) + Math.abs(r - 2) <= 3.6 },
    { n: "تشكيل الجناحين", f: (r, c) => c < 3 || c > 4 }
  ];
  const INV_PAL = [["#ff6b6b", "#feca57", "#48dbfb", "#1dd1a1", "#ff9ff3"], ["#a29bfe", "#74b9ff", "#81ecec", "#55efc4", "#ffeaa7"], ["#fd79a8", "#e17055", "#fdcb6e", "#00b894", "#0984e3"]];
  const invaders = {
    id: "invaders", console: "atari", name: "حرب الفضاء", emoji: "👾", color: "#16a085", pad: "lr-a",
    desc: "مخلوقات فضائية نازلة على الحارة! كل موجة بتشكيل مختلف وأسرع، وقنابلهم تزيد. اضربهم قبل لا يوصلون الأرض.",
    controls: "◀ ▶ للتحريك — A للإطلاق",
    init() { this.wave = 1; this.score = 0; this.lives = 3; this.x = 122; this.stars = Array.from({ length: 40 }, () => ({ x: rnd(0, W), y: rnd(0, H), s: rnd(0.3, 1) })); this.setup(); this.hud(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  ❤️ " + this.lives + "  ·  موجة " + this.wave); },
    setup() {
      const f = TH(this.wave, INV_FORM); this.form = f; this.pal = TH(this.wave, INV_PAL); this.al = [];
      for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) if (f.f(r, c)) this.al.push({ x: 30 + c * 24, y: 26 + r * 17 + Math.min(this.wave - 1, 5) * 5, r, alive: true });
      this.dir = 1; this.mt = 0; this.shot = null; this.bombs = []; this.frame = 0; this.boom = 0; this.intro = 1.4;
      this.ufo = null; this.ufoT = rnd(8, 14);
    },
    update(dt) {
      for (const s of this.stars) { s.y += 20 * s.s * dt; if (s.y > H) s.y = 0; }
      if (this.intro > 0) { this.intro -= dt; return; }
      if (this.boom > 0) { this.boom -= dt; return; }
      const k = api.keys; if (k.left) this.x -= 120 * dt; if (k.right) this.x += 120 * dt; this.x = Math.max(4, Math.min(W - 17, this.x));
      if ((api.pressed("a") || api.pressed("up")) && !this.shot) { this.shot = { x: this.x + 6, y: 212 }; sfx.pew(); }
      if (this.shot) { this.shot.y -= 260 * dt; if (this.shot.y < 0) this.shot = null; }
      const alive = this.al.filter(a => a.alive);
      if (!alive.length) { this.wave++; this.score += 300 * (this.wave - 1); sfx.stage(); this.setup(); this.hud(); return; }
      const interval = Math.max(0.05, 0.6 * alive.length / 40) / (1 + (this.wave - 1) * 0.18);
      this.mt += dt;
      if (this.mt > interval) {
        this.mt = 0; this.frame ^= 1;
        const minX = Math.min(...alive.map(a => a.x)), maxX = Math.max(...alive.map(a => a.x));
        if ((this.dir > 0 && maxX > W - 22) || (this.dir < 0 && minX < 8)) { this.dir = -this.dir; for (const a of alive) a.y += 8; }
        else for (const a of alive) a.x += 4 * this.dir;
        beep(this.frame ? 110 : 90, 0.05, "square", 0.022);
      }
      if (Math.random() < dt * (0.8 + this.wave * 0.3) && this.bombs.length < 2 + Math.min(4, this.wave)) {
        const cols = {}; for (const a of alive) if (!cols[a.x] || cols[a.x].y < a.y) cols[a.x] = a;
        const s = pick(Object.values(cols)); this.bombs.push({ x: s.x + 6, y: s.y + 10 });
      }
      this.ufoT -= dt;
      if (!this.ufo && this.ufoT <= 0) { this.ufo = { x: -20, d: 1 }; if (Math.random() < 0.5) { this.ufo.x = W + 20; this.ufo.d = -1; } }
      if (this.ufo) { this.ufo.x += this.ufo.d * 60 * dt; if (this.ufo.x < -30 || this.ufo.x > W + 30) { this.ufo = null; this.ufoT = rnd(10, 18); } }
      for (const b of this.bombs) b.y += (85 + this.wave * 9) * dt;
      this.bombs = this.bombs.filter(b => {
        if (b.y > H) return false;
        if (b.y > 210 && b.y < 224 && b.x > this.x && b.x < this.x + 13) { this.lives--; sfx.boom(); this.boom = 1; this.hud(); if (this.lives <= 0) api.over(this.score); return false; }
        return true;
      });
      if (this.shot && this.ufo && Math.abs(this.shot.x - this.ufo.x) < 10 && this.shot.y < 22 && this.shot.y > 8) { this.score += 50 * ri(2, 6) * this.wave; this.ufo = null; this.ufoT = rnd(10, 18); this.shot = null; sfx.coin(); this.hud(); }
      if (this.shot) for (const a of alive) if (this.shot && this.shot.x > a.x && this.shot.x < a.x + 13 && this.shot.y > a.y && this.shot.y < a.y + 10) { a.alive = false; this.shot = null; this.score += (5 - a.r) * 10 * this.wave; sfx.hit(); this.hud(); }
      if (alive.some(a => a.y > 200)) { sfx.die(); api.over(this.score); }
    },
    draw() {
      rect("#05060f", 0, 0, W, H);
      for (const s of this.stars) rect(s.s > 0.7 ? "#fff" : "#667", s.x, s.y, 1, 1);
      for (const a of this.al) if (a.alive) {
        const c = this.pal[a.r], x = Math.round(a.x), y = Math.round(a.y);
        rect(c, x + 2, y, 9, 2); rect(c, x, y + 2, 13, 5); rect("#05060f", x + 3, y + 3, 2, 2); rect("#05060f", x + 8, y + 3, 2, 2);
        if (this.frame) { rect(c, x, y + 7, 2, 3); rect(c, x + 11, y + 7, 2, 3); rect(c, x + 5, y + 7, 3, 2); }
        else { rect(c, x + 2, y + 7, 2, 3); rect(c, x + 9, y + 7, 2, 3); rect(c, x + 5, y + 8, 3, 2); }
      }
      if (this.ufo) { const x = Math.round(this.ufo.x); rect("#e84393", x - 9, 14, 18, 4); rect("#fd79a8", x - 5, 10, 10, 4); rect("#ffeaa7", x - 7, 15, 2, 2); rect("#ffeaa7", x + 5, 15, 2, 2); }
      if (this.shot) rect("#fff", this.shot.x, this.shot.y, 2, 6);
      for (const b of this.bombs) { rect("#ff7f50", b.x, b.y, 2, 5); rect("#ffd", b.x, b.y + 4, 2, 2); }
      if (!(this.boom > 0 && Math.floor(this.boom * 10) % 2)) { const x = Math.round(this.x); rect("#2ecc71", x, 216, 13, 6); rect("#2ecc71", x + 5, 212, 3, 4); rect("#27ae60", x, 221, 13, 2); }
      rect("#2ecc71", 0, 226, W, 1);
      if (this.intro > 0) banner("الموجة " + this.wave, this.form.n);
    }
  };

  /* =====================================================
     جهاز الطوب — الطوب المتساقط
     ===================================================== */
  const SH = [[[1, 1, 1, 1]], [[1, 1], [1, 1]], [[0, 1, 0], [1, 1, 1]], [[1, 0, 0], [1, 1, 1]], [[0, 0, 1], [1, 1, 1]], [[1, 1, 0], [0, 1, 1]], [[0, 1, 1], [1, 1, 0]]];
  const blocks = {
    id: "blocks", console: "brick", name: "الطوب المتساقط", emoji: "🟫", color: "#6d7a4f", pad: "dpad-a",
    desc: "مثل جهاز الطوب اللي كان بكل شنطة مدرسة! رتّب القطع وكمّل صفوف كاملة. كل ١٠ صفوف مستوى أسرع ولون شاشة مختلف، ومن المستوى الخامس تطلع صفوف عشوائية من تحت.",
    controls: "◀ ▶ تحريك — ▲ تدوير — ▼ تنزيل سريع — A تنزيل فوري",
    init() { this.c = 11; this.ox = 60; this.oy = 10; this.grid = Array.from({ length: 20 }, () => new Array(10).fill(0)); this.score = 0; this.lines = 0; this.level = 1; this.t = 0; this.gt = 0; this.flash = 0; this.next = ri(0, 6); this.spawn(); this.hold = { l: 0, r: 0 }; this.hud(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  صفوف " + this.lines + "  ·  مستوى " + this.level); },
    spawn() { this.p = { s: SH[this.next].map(r => r.slice()), x: 3, y: 0 }; this.next = ri(0, 6); if (this.hits(this.p.s, this.p.x, this.p.y)) { sfx.die(); api.over(this.score); } },
    hits(s, x, y) { for (let r = 0; r < s.length; r++) for (let c = 0; c < s[r].length; c++) if (s[r][c]) { const X = x + c, Y = y + r; if (X < 0 || X >= 10 || Y >= 20 || (Y >= 0 && this.grid[Y][X])) return true; } return false; },
    rot() { const s = this.p.s, n = s[0].map((_, i) => s.map(r => r[i]).reverse()); for (const k of [0, -1, 1, -2, 2]) if (!this.hits(n, this.p.x + k, this.p.y)) { this.p.s = n; this.p.x += k; sfx.blip(); return; } },
    lock() {
      const s = this.p.s; for (let r = 0; r < s.length; r++) for (let c = 0; c < s[r].length; c++) if (s[r][c] && this.p.y + r >= 0) this.grid[this.p.y + r][this.p.x + c] = 1;
      let n = 0; for (let r = 19; r >= 0; r--) if (this.grid[r].every(v => v)) { this.grid.splice(r, 1); this.grid.unshift(new Array(10).fill(0)); n++; r++; }
      if (n) { this.lines += n; this.score += [0, 100, 300, 500, 800][n] * this.level; const nl = 1 + Math.floor(this.lines / 10); if (nl > this.level) { this.level = nl; sfx.stage(); this.flash = 1.2; } else sfx.line(); } else sfx.bounce();
      this.hud(); this.spawn();
    },
    garbage() { this.grid.shift(); const row = new Array(10).fill(1); row[ri(0, 9)] = 0; this.grid.push(row); if (this.hits(this.p.s, this.p.x, this.p.y)) this.p.y = Math.max(-2, this.p.y - 1); },
    move(dx) { if (!this.hits(this.p.s, this.p.x + dx, this.p.y)) this.p.x += dx; },
    update(dt) {
      const k = api.keys; if (this.flash > 0) this.flash -= dt;
      if (api.pressed("left")) { this.move(-1); this.hold.l = 0; } if (api.pressed("right")) { this.move(1); this.hold.r = 0; }
      if (k.left) { this.hold.l += dt; if (this.hold.l > 0.2) { this.hold.l = 0.15; this.move(-1); } }
      if (k.right) { this.hold.r += dt; if (this.hold.r > 0.2) { this.hold.r = 0.15; this.move(1); } }
      if (api.pressed("up")) this.rot();
      if (api.pressed("a")) { while (!this.hits(this.p.s, this.p.x, this.p.y + 1)) { this.p.y++; this.score += 2; } this.lock(); return; }
      if (this.level >= 5) { this.gt += dt; if (this.gt > Math.max(6, 16 - this.level)) { this.gt = 0; this.garbage(); } }
      const iv = k.down ? 0.04 : Math.max(0.06, 0.8 - (this.level - 1) * 0.07);
      this.t += dt; if (this.t >= iv) { this.t = 0; if (this.hits(this.p.s, this.p.x, this.p.y + 1)) this.lock(); else { this.p.y++; if (k.down) this.score++; } }
    },
    draw() {
      const [bg, ink, cl] = TH(this.level, LCD);
      const cell = (x, y, on) => { const X = this.ox + x * this.c, Y = this.oy + y * this.c; rect(on ? ink : cl, X, Y, this.c - 1, this.c - 1); rect(bg, X + 2, Y + 2, this.c - 5, this.c - 5); if (on) rect(ink, X + 3, Y + 3, this.c - 7, this.c - 7); };
      rect(bg, 0, 0, W, H); rect(ink, this.ox - 3, this.oy - 3, 10 * this.c + 5, 20 * this.c + 5); rect(bg, this.ox - 1, this.oy - 1, 10 * this.c + 1, 20 * this.c + 1);
      for (let y = 0; y < 20; y++) for (let x = 0; x < 10; x++) cell(x, y, this.grid[y][x]);
      const s = this.p.s; for (let r = 0; r < s.length; r++) for (let c = 0; c < s[r].length; c++) if (s[r][c] && this.p.y + r >= 0) cell(this.p.x + c, this.p.y + r, 1);
      text("التالي", 210, 30, 11, ink); const n = SH[this.next];
      for (let r = 0; r < n.length; r++) for (let c = 0; c < n[r].length; c++) if (n[r][c]) { const X = 192 + c * 9, Y = 46 + r * 9; rect(ink, X, Y, 8, 8); rect(bg, X + 2, Y + 2, 4, 4); }
      text("النتيجة", 210, 100, 11, ink); text(String(this.score), 210, 116, 13, ink);
      text("صفوف", 210, 144, 11, ink); text(String(this.lines), 210, 160, 13, ink);
      text("مستوى", 210, 188, 11, ink); text(String(this.level), 210, 204, 13, ink);
      text("٩٩٩٩", 28, 120, 14, ink);
      if (this.flash > 0) banner("المستوى " + this.level, this.level >= 5 ? "انتبه للصفوف من تحت!" : "أسرع!");
    }
  };
