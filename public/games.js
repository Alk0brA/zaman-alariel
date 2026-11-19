/* زمن الأريل — ألعاب الثمانينات والتسعينات (تصاميم أصلية مستوحاة من روح تلك الأجهزة) */
"use strict";
const ZAGames = (() => {
  const W = 256, H = 240;
  let ov, canvas, g, screenEl, hudEl, titleEl, padEl, cur = null, state = "idle", raf = 0, last = 0, onEnd = null, onStart = null;
  const keys = { left: false, right: false, up: false, down: false, a: false };
  const just = new Set();
  let muted = false; try { muted = localStorage.getItem("za_mute") === "1"; } catch (e) {}
  let ac = null;

  /* ---------- sound ---------- */
  function beep(f, d, type, vol, slide) {
    if (muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      const o = ac.createOscillator(), gn = ac.createGain(), t = ac.currentTime;
      o.type = type || "square"; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
      gn.gain.setValueAtTime(vol || 0.05, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) {}
  }
  const sfx = {
    jump: () => beep(330, 0.16, "square", 0.045, 420),
    coin: () => { beep(988, 0.06, "square", 0.04); setTimeout(() => beep(1319, 0.14, "square", 0.04), 60); },
    shot: () => beep(260, 0.18, "sawtooth", 0.06, -200),
    hit: () => beep(700, 0.12, "square", 0.05, -500),
    die: () => beep(320, 0.6, "triangle", 0.08, -270),
    blip: () => beep(660, 0.04, "square", 0.035),
    bounce: () => beep(440, 0.05, "square", 0.04),
    line: () => { beep(523, 0.1, "square", 0.05); setTimeout(() => beep(784, 0.18, "square", 0.05), 90); },
    win: () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.14, "square", 0.05), i * 110)); }
  };

  /* ---------- helpers ---------- */
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(rnd(a, b + 1));
  function seeded(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function rect(c, x, y, w, h) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
  function text(t, x, y, size, color, align) {
    g.font = "bold " + (size || 12) + "px Tajawal, sans-serif"; g.fillStyle = color || "#fff";
    g.textAlign = align || "center"; g.textBaseline = "middle";
    try { g.direction = "rtl"; } catch (e) {}
    g.fillText(t, x, y);
  }
  const api = {
    W, H, keys, rnd, ri, sfx, rect, text,
    pressed: k => just.has(k),
    hud: html => { hudEl.textContent = html; },
    over: score => endGame(score)
  };

  /* =====================================================
     ١) قنص الطيور
     ===================================================== */
  const hunt = {
    id: "hunt", name: "قنص الطيور", emoji: "🦆", color: "#2f8fd8", pad: "dpad-a",
    desc: "الطيور تطلع من بين الشجر وتطير بسرعة. اضغط عليها قبل لا تهرب! عندك ٣ طلقات لكل موجة، ولازم تصيد ٦ من ١٠ عشان تنتقل للجولة اللي بعدها.",
    controls: "اضغط على الطائر مباشرة — أو حرّك المؤشر بالأسهم واضغط A للرمي",
    init() { this.round = 1; this.score = 0; this.cx = 128; this.cy = 100; this.flash = 0; this.newRound(); this.hud(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  الجولة " + this.round); },
    newRound() { this.total = 10; this.idx = 0; this.results = []; this.banner = 1.6; this.pause = 0; this.wave(); },
    wave() {
      const n = Math.min(2, this.total - this.idx); this.birds = [];
      const sp = 45 + this.round * 12;
      for (let i = 0; i < n; i++) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        this.birds.push({ x: rnd(50, 206), y: 196, vx: dir * sp * rnd(0.7, 1.2), vy: -sp * rnd(0.8, 1.1), st: "fly", t: 0, turn: rnd(0.6, 1.4), col: i ? "#b5442c" : "#2c6e49" });
      }
      this.idx += n; this.shots = 3; this.wt = 0;
    },
    shoot(x, y) {
      if (this.banner > 0 || this.pause > 0 || this.shots <= 0) return;
      this.shots--; this.flash = 0.06; sfx.shot();
      for (const b of this.birds) if (b.st === "fly" && Math.hypot(b.x - x, b.y - y) < 15) {
        b.st = "hit"; b.t = 0; this.score += 100 * this.round + (this.wt < 2 ? 50 : 0); sfx.hit();
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
      for (const b of this.birds) {
        b.t += dt;
        if (b.st === "fly") {
          b.x += b.vx * dt; b.y += b.vy * dt;
          if (b.x < 10) { b.x = 10; b.vx = Math.abs(b.vx); } if (b.x > W - 10) { b.x = W - 10; b.vx = -Math.abs(b.vx); }
          if (b.y < 14) { b.y = 14; b.vy = Math.abs(b.vy); } if (b.y > 165 && b.t > 1) { b.y = 165; b.vy = -Math.abs(b.vy); }
          b.turn -= dt; if (b.turn <= 0) { b.turn = rnd(0.6, 1.4); if (Math.random() < 0.5) b.vx = -b.vx; b.vy = (Math.random() < 0.5 ? -1 : 1) * Math.abs(b.vy); }
          if (this.wt > 6.5 || this.shots === 0) { b.st = "esc"; b.vy = -150; }
        } else if (b.st === "esc") { b.y += b.vy * dt; b.x += b.vx * 0.3 * dt; if (b.y < -20) b.st = "gone"; }
        else if (b.st === "hit") { if (b.t > 0.35) { b.st = "fall"; } }
        else if (b.st === "fall") { b.y += 170 * dt; if (b.y > 196) b.st = "down"; }
      }
      if (this.birds.every(b => b.st === "gone" || b.st === "down")) {
        for (const b of this.birds) this.results.push(b.st === "down");
        this.pause = 0.7;
      }
    },
    afterWave() {
      if (this.idx < this.total) { this.wave(); return; }
      const n = this.results.filter(Boolean).length;
      if (n >= 6) { this.score += n === 10 ? 1000 * this.round : 0; this.round++; sfx.win(); this.newRound(); this.hud(); }
      else api.over(this.score);
    },
    bird(b) {
      const fr = Math.floor(b.t * 8) % 2, d = b.vx < 0 ? -1 : 1;
      g.save(); g.translate(Math.round(b.x), Math.round(b.y)); g.scale(d, b.st === "fall" ? -1 : 1);
      rect(b.col, -7, -3, 13, 7); rect(b.col, 3, -7, 6, 6); rect("#f4d03f", 9, -5, 4, 2);
      rect("#fff", 6, -6, 2, 2); rect("#111", 7, -6, 1, 1); rect("#f0e6c8", -5, 1, 9, 2);
      if (b.st === "hit") { rect("#fff", -2, -10, 4, 4); }
      else if (fr) { rect("#1d1d1d", -5, -10, 7, 7); } else { rect("#1d1d1d", -5, 3, 7, 6); }
      g.restore();
    },
    draw() {
      rect("#69b7ee", 0, 0, W, H);
      rect("#fff", 30, 30, 34, 8); rect("#fff", 38, 24, 18, 8); rect("#fff", 170, 48, 40, 8); rect("#fff", 180, 42, 20, 8);
      rect("#6b3f22", 24, 120, 10, 80); rect("#2f8a3a", 6, 92, 46, 34); rect("#3fa34a", 12, 82, 34, 18);
      for (const b of this.birds) if (b.st !== "gone" && b.st !== "down") this.bird(b);
      rect("#4fae4f", 0, 188, W, 52); rect("#3d8f3d", 0, 188, W, 4);
      for (let x = -10; x < W; x += 34) { rect("#2f7f36", x, 180, 26, 12); rect("#2f7f36", x + 5, 174, 16, 8); }
      rect("#1d2b1d", 0, 214, W, 26);
      text("طلقات", 236, 226, 10, "#cfe"); for (let i = 0; i < 3; i++) rect(i < this.shots ? "#f2c230" : "#555", 196 + i * 8, 220, 5, 12);
      for (let i = 0; i < 10; i++) { const r = this.results[i]; rect(r === true ? "#5fd35f" : r === false ? "#e05050" : "#ddd", 12 + i * 15, 222, 10, 8); }
      g.strokeStyle = "#fff"; g.lineWidth = 1.5; g.beginPath(); g.arc(this.cx, this.cy, 8, 0, 7); g.moveTo(this.cx - 12, this.cy); g.lineTo(this.cx + 12, this.cy); g.moveTo(this.cx, this.cy - 12); g.lineTo(this.cx, this.cy + 12); g.stroke();
      if (this.banner > 0) { rect("rgba(0,0,0,.55)", 58, 92, 140, 40); text("الجولة " + this.round, 128, 112, 20, "#f2c230"); }
      if (this.flash > 0) rect("rgba(255,255,255,.75)", 0, 0, W, H);
    }
  };

  /* =====================================================
     ٢) مغامرة الحارة (منصات)
     ===================================================== */
  const T = 16;
  const hara = {
    id: "hara", name: "مغامرة الحارة", emoji: "🏃", color: "#d9572b", pad: "lr-a",
    desc: "ساعد (سعود) يوصل البقالة قبل لا تقفل! نط فوق القطاوة، اجمع الريالات، واضرب صناديق (؟) من تحت. انتبه من الحفر.",
    controls: "◀ ▶ للمشي — A (أو ▲) للقفز، وكل ما ضغطت أطول نطيت أعلى",
    init() { this.level = 1; this.score = 0; this.lives = 3; this.coins = 0; this.build(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  ريالات " + this.coins + "  ·  ❤️ " + this.lives + "  ·  مرحلة " + this.level); },
    build() {
      const R = seeded(this.level * 7919 + 13);
      const w = 110 + this.level * 25; this.mw = w; this.map = [];
      for (let y = 0; y < 15; y++) this.map.push(new Array(w).fill(0));
      let x = 0;
      while (x < w) {
        const gap = x > 14 && x < w - 16 && R() < 0.09;
        if (gap) { x += 2 + Math.floor(R() * (this.level > 2 ? 2 : 1)); continue; }
        this.map[13][x] = 1; this.map[14][x] = 1; x++;
      }
      this.coinsList = []; this.enemies = [];
      for (let px = 12; px < w - 14; px += 7 + Math.floor(R() * 6)) {
        const row = R() < 0.5 ? 9 : 6, len = 2 + Math.floor(R() * 4);
        for (let i = 0; i < len; i++) this.map[row][px + i] = R() < 0.3 ? 3 : 2;
        for (let i = 0; i < len; i++) if (R() < 0.6) this.coinsList.push({ x: (px + i) * T + 8, y: (row - 1) * T + 8, got: false });
      }
      for (let ex = 20; ex < w - 16; ex += 9 + Math.floor(R() * 10)) if (this.map[13][ex]) this.enemies.push({ x: ex * T, y: 13 * T - 12, vx: -(26 + this.level * 4), vy: 0, dead: 0 });
      for (let i = w - 12; i < w; i++) { this.map[13][i] = 1; this.map[14][i] = 1; }
      this.goalX = (w - 7) * T;
      this.respawn(); this.hud();
    },
    respawn() { this.p = { x: 32, y: 13 * T - 16, w: 11, h: 16, vx: 0, vy: 0, on: false, face: 1, t: 0, inv: 1.2 }; this.cam = 0; this.done = 0; },
    solid(tx, ty) { if (tx < 0) return true; if (ty < 0 || ty >= 15 || tx >= this.mw) return false; const v = this.map[ty][tx]; return v >= 1 && v <= 4; },
    collide(o, axis) {
      const x0 = Math.floor(o.x / T), x1 = Math.floor((o.x + o.w - 0.01) / T), y0 = Math.floor(o.y / T), y1 = Math.floor((o.y + o.h - 0.01) / T);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.solid(tx, ty)) {
        if (axis === "x") { if (o.vx > 0) o.x = tx * T - o.w; else if (o.vx < 0) o.x = (tx + 1) * T; o.vx = 0; return "x"; }
        else {
          if (o.vy > 0) { o.y = ty * T - o.h; o.vy = 0; o.on = true; }
          else if (o.vy < 0) { o.y = (ty + 1) * T; o.vy = 0; if (o === this.p) this.bump(tx, ty); }
          return "y";
        }
      }
      return null;
    },
    bump(tx, ty) {
      if (this.map[ty][tx] === 3) { this.map[ty][tx] = 4; this.coins++; this.score += 200; sfx.coin(); this.pop = { x: tx * T + 8, y: ty * T - 6, t: 0.5 }; this.hud(); }
      else sfx.bounce();
    },
    hurt() {
      if (this.p.inv > 0) return;
      this.lives--; sfx.die(); this.hud();
      if (this.lives <= 0) { api.over(this.score); return; }
      this.respawn();
    },
    update(dt) {
      const p = this.p, k = api.keys;
      if (this.done > 0) { this.done -= dt; if (this.done <= 0) { this.level++; this.score += 1000; this.build(); } return; }
      p.inv = Math.max(0, p.inv - dt);
      const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0);
      if (dir) { p.vx += dir * 520 * dt; p.face = dir; } else { p.vx *= Math.pow(0.0008, dt); if (Math.abs(p.vx) < 4) p.vx = 0; }
      p.vx = Math.max(-105, Math.min(105, p.vx));
      if ((api.pressed("a") || api.pressed("up")) && p.on) { p.vy = -335; p.on = false; sfx.jump(); }
      const grav = p.vy < 0 && (k.a || k.up) ? 620 : 1250;
      p.vy = Math.min(p.vy + grav * dt, 420);
      p.x += p.vx * dt; this.collide(p, "x");
      p.on = false; p.y += p.vy * dt; this.collide(p, "y");
      if (p.x < this.cam) { p.x = this.cam; }
      p.t += dt * (Math.abs(p.vx) > 5 ? 1 : 0);
      if (p.y > H + 20) { this.lives--; sfx.die(); this.hud(); if (this.lives <= 0) { api.over(this.score); return; } this.respawn(); return; }
      for (const c of this.coinsList) if (!c.got && Math.abs(c.x - (p.x + p.w / 2)) < 10 && Math.abs(c.y - (p.y + p.h / 2)) < 12) { c.got = true; this.coins++; this.score += 100; sfx.coin(); this.hud(); }
      for (const e of this.enemies) {
        if (e.dead) { e.dead -= dt; continue; }
        if (Math.abs(e.x - p.x) > 300) continue;
        e.w = 14; e.h = 12; e.vy = Math.min(e.vy + 1200 * dt, 400);
        const pv = e.vx; e.x += e.vx * dt; if (this.collide(e, "x")) e.vx = -pv;
        e.on = false; e.y += e.vy * dt; this.collide(e, "y");
        if (e.y > H + 30) { e.dead = 999; continue; }
        if (p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
          if (p.vy > 30 && p.y + p.h - e.y < 10) { e.dead = 999; e.squash = 0.4; this.score += 150; p.vy = -230; sfx.hit(); this.hud(); }
          else this.hurt();
        }
      }
      if (p.x > this.goalX) { this.done = 1.6; sfx.win(); }
      this.cam = Math.max(0, Math.min(p.x - 100, this.mw * T - W));
      if (this.pop) { this.pop.t -= dt; this.pop.y -= 40 * dt; if (this.pop.t <= 0) this.pop = null; }
    },
    draw() {
      const cam = Math.round(this.cam);
      rect("#9fd8ff", 0, 0, W, H); rect("#ffe7a8", 0, 150, W, 60);
      g.save(); g.translate(-Math.round(cam * 0.35), 0);
      for (let i = 0; i < 40; i++) { const bx = i * 70, bh = 40 + (i * 37) % 40; rect("#e8d2b0", bx, 200 - bh, 54, bh); rect("#cdb592", bx, 200 - bh, 54, 4); rect("#7aa7c7", bx + 8, 210 - bh, 8, 8); rect("#7aa7c7", bx + 30, 210 - bh, 8, 8); if (i % 3 === 0) { rect("#ddd", bx + 36, 186 - bh, 12, 14); } }
      for (let i = 0; i < 20; i++) { const tx = i * 150 + 40; rect("#8b5a2b", tx, 150, 5, 60); rect("#3f9a3f", tx - 12, 144, 29, 6); rect("#3f9a3f", tx - 6, 138, 17, 6); }
      g.restore();
      g.save(); g.translate(-cam, 0);
      const x0 = Math.floor(cam / T), x1 = Math.min(this.mw - 1, x0 + 17);
      for (let ty = 0; ty < 15; ty++) for (let tx = x0; tx <= x1; tx++) {
        const v = this.map[ty][tx]; if (!v) continue; const X = tx * T, Y = ty * T;
        if (v === 1) { rect("#d9a35b", X, Y, T, T); rect("#b07a3a", X, Y + 7, T, 1); rect("#b07a3a", X + (ty % 2 ? 4 : 11), Y, 1, 7); rect("#b07a3a", X + (ty % 2 ? 11 : 4), Y + 8, 1, 8); if (ty === 13) rect("#e9bd77", X, Y, T, 3); }
        else if (v === 2) { rect("#c4602f", X, Y, T, T); rect("#8a3f1d", X, Y + 7, T, 1); rect("#8a3f1d", X + 7, Y, 1, 7); rect("#8a3f1d", X + 3, Y + 8, 1, 8); rect("#e07a45", X, Y, T, 2); }
        else if (v === 3) { rect("#f2c230", X, Y, T, T); rect("#a67c00", X, Y + 14, T, 2); rect("#a67c00", X + 14, Y, 2, T); text("؟", X + 8, Y + 8, 12, "#7a4a00"); }
        else if (v === 4) { rect("#9b6a3c", X, Y, T, T); rect("#6e4826", X + 2, Y + 2, 12, 12); }
      }
      const gx = this.goalX;
      rect("#f6efe0", gx, 13 * T - 64, 64, 64); rect("#2f7f6f", gx - 4, 13 * T - 72, 72, 14); text("بقالة", gx + 32, 13 * T - 65, 10, "#fff");
      rect("#6b3f22", gx + 24, 13 * T - 30, 16, 30); rect("#7fb8d8", gx + 6, 13 * T - 46, 14, 12); rect("#7fb8d8", gx + 44, 13 * T - 46, 14, 12);
      for (const c of this.coinsList) if (!c.got) { const s = Math.abs(Math.sin(performance.now() / 180)) * 3 + 1; rect("#f2c230", c.x - s, c.y - 4, s * 2, 8); rect("#fff3a0", c.x - 1, c.y - 3, 1, 3); }
      if (this.pop) text("+٢٠٠", this.pop.x, this.pop.y, 10, "#fff");
      for (const e of this.enemies) {
        if (e.dead && !(e.squash > 0)) continue;
        if (e.squash > 0) { e.squash -= 1 / 60; rect("#e08a2e", e.x, e.y + 8, 14, 4); continue; }
        const f = Math.floor(performance.now() / 150) % 2, d = e.vx < 0 ? -1 : 1;
        g.save(); g.translate(Math.round(e.x + 7), Math.round(e.y)); g.scale(d, 1);
        rect("#e08a2e", -6, 3, 11, 6); rect("#e08a2e", 3, 0, 6, 6); rect("#e08a2e", 3, -2, 2, 2); rect("#e08a2e", 7, -2, 2, 2);
        rect("#b8651a", -4, 4, 2, 4); rect("#b8651a", 0, 4, 2, 4); rect("#111", 7, 2, 1, 1); rect("#e08a2e", -9, 1 + f, 3, 2);
        rect("#7a3e0a", -5, 9, 2, 3 - f); rect("#7a3e0a", 2, 9, 2, 2 + f);
        g.restore();
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
      if (this.done > 0) { rect("rgba(0,0,0,.55)", 38, 92, 180, 44); text("وصلت البقالة! 🎉", 128, 114, 16, "#f2c230"); }
    }
  };

  /* =====================================================
     ٣) الثعبان
     ===================================================== */
  const snake = {
    id: "snake", name: "الثعبان", emoji: "🐍", color: "#4a8c2a", pad: "dpad",
    desc: "لعبة جوال أيام زمان! كُل الشبس وكبّر الثعبان، بس لا تصدم بالجدار ولا بذيلك.",
    controls: "الأسهم للتوجيه — أو اسحب بإصبعك على الشاشة",
    init() { this.c = 12; this.cols = 20; this.rows = 18; this.ox = 8; this.oy = 12; this.s = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }]; this.d = { x: 1, y: 0 }; this.q = []; this.t = 0; this.step = 0.14; this.score = 0; this.food(); this.hud(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  الطول " + this.s.length); },
    food() { do { this.f = { x: ri(0, this.cols - 1), y: ri(0, this.rows - 1) }; } while (this.s.some(p => p.x === this.f.x && p.y === this.f.y)); },
    turn(x, y) { const ld = this.q.length ? this.q[this.q.length - 1] : this.d; if (ld.x === -x && ld.y === -y) return; if (ld.x === x && ld.y === y) return; if (this.q.length < 3) this.q.push({ x, y }); },
    tap(x, y) { this.sx = x; this.sy = y; },
    release(x, y) { if (this.sx == null) return; const dx = x - this.sx, dy = y - this.sy; this.sx = null; if (Math.max(Math.abs(dx), Math.abs(dy)) < 12) return; if (Math.abs(dx) > Math.abs(dy)) this.turn(Math.sign(dx), 0); else this.turn(0, Math.sign(dy)); },
    update(dt) {
      if (api.pressed("left")) this.turn(-1, 0); if (api.pressed("right")) this.turn(1, 0); if (api.pressed("up")) this.turn(0, -1); if (api.pressed("down")) this.turn(0, 1);
      this.t += dt; if (this.t < this.step) return; this.t = 0;
      if (this.q.length) this.d = this.q.shift();
      const h = { x: this.s[0].x + this.d.x, y: this.s[0].y + this.d.y };
      if (h.x < 0 || h.y < 0 || h.x >= this.cols || h.y >= this.rows || this.s.some(p => p.x === h.x && p.y === h.y)) { sfx.die(); api.over(this.score); return; }
      this.s.unshift(h);
      if (h.x === this.f.x && h.y === this.f.y) { this.score += 10 + Math.floor((0.14 - this.step) * 400); this.step = Math.max(0.06, this.step - 0.004); sfx.blip(); this.food(); this.hud(); }
      else this.s.pop();
    },
    draw() {
      rect("#9ead86", 0, 0, W, H); rect("#2b3a20", this.ox - 2, this.oy - 2, this.cols * this.c + 4, this.rows * this.c + 4); rect("#a9b98f", this.ox, this.oy, this.cols * this.c, this.rows * this.c);
      const c = this.c;
      rect("#c0392b", this.ox + this.f.x * c + 2, this.oy + this.f.y * c + 1, c - 4, c - 2); rect("#f1c40f", this.ox + this.f.x * c + 4, this.oy + this.f.y * c + 3, c - 8, 3);
      this.s.forEach((p, i) => { rect(i ? "#2b3a20" : "#1a2412", this.ox + p.x * c + 1, this.oy + p.y * c + 1, c - 2, c - 2); if (!i) { rect("#a9b98f", this.ox + p.x * c + 3 + (this.d.x > 0 ? 4 : 0), this.oy + p.y * c + 3 + (this.d.y > 0 ? 4 : 0), 2, 2); } });
      text("النتيجة " + this.score, 128, 234, 10, "#2b3a20");
    }
  };

  /* =====================================================
     ٤) تكسير الطوب
     ===================================================== */
  const bricks = {
    id: "bricks", name: "تكسير الطوب", emoji: "🧱", color: "#8e44ad", pad: "lr-a",
    desc: "من كلاسيكيات الأتاري: حرّك المضرب وخلّ الكرة تكسّر كل الطوب. لا تطيّح الكرة!",
    controls: "◀ ▶ أو اسحب بإصبعك لتحريك المضرب — A أو اللمس لإطلاق الكرة",
    init() { this.level = 1; this.score = 0; this.lives = 3; this.px = 108; this.setup(); this.hud(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  ❤️ " + this.lives + "  ·  مرحلة " + this.level); },
    setup() {
      this.br = []; const cols = ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#3498db", "#9b59b6"];
      for (let r = 0; r < 6; r++) for (let c = 0; c < 10; c++) { if (this.level > 1 && (r + c + this.level) % 7 === 0) continue; this.br.push({ x: 8 + c * 24, y: 28 + r * 11, w: 23, h: 10, c: cols[r], v: 6 - r }); }
      this.stick();
    },
    stick() { this.ball = { x: this.px + 20, y: 214, vx: 0, vy: 0, on: true }; },
    launch() { if (!this.ball.on) return; const sp = 150 + this.level * 15; this.ball.on = false; this.ball.vx = sp * rnd(-0.5, 0.5); this.ball.vy = -sp; sfx.bounce(); },
    tap(x) { this.drag = true; this.px = x - 20; this.launch(); },
    move(x) { if (this.drag) this.px = x - 20; },
    release() { this.drag = false; },
    update(dt) {
      const k = api.keys; if (k.left) this.px -= 230 * dt; if (k.right) this.px += 230 * dt;
      this.px = Math.max(0, Math.min(W - 40, this.px));
      if (api.pressed("a") || api.pressed("up")) this.launch();
      const b = this.ball;
      if (b.on) { b.x = this.px + 20; b.y = 214; return; }
      const steps = 3;
      for (let s = 0; s < steps; s++) {
        b.x += b.vx * dt / steps; b.y += b.vy * dt / steps;
        if (b.x < 3) { b.x = 3; b.vx = Math.abs(b.vx); sfx.bounce(); } if (b.x > W - 3) { b.x = W - 3; b.vx = -Math.abs(b.vx); sfx.bounce(); }
        if (b.y < 3) { b.y = 3; b.vy = Math.abs(b.vy); sfx.bounce(); }
        if (b.vy > 0 && b.y > 215 && b.y < 224 && b.x > this.px - 3 && b.x < this.px + 43) {
          const sp = Math.hypot(b.vx, b.vy) * 1.01, rel = (b.x - (this.px + 20)) / 23;
          b.vx = sp * rel * 0.85; b.vy = -Math.sqrt(Math.max(sp * sp - b.vx * b.vx, sp * sp * 0.25)); sfx.bounce();
        }
        for (const br of this.br) if (!br.hit && b.x > br.x - 3 && b.x < br.x + br.w + 3 && b.y > br.y - 3 && b.y < br.y + br.h + 3) {
          br.hit = true; this.score += br.v * 10 * this.level; sfx.blip();
          const ox = Math.min(b.x - (br.x - 3), br.x + br.w + 3 - b.x), oy = Math.min(b.y - (br.y - 3), br.y + br.h + 3 - b.y);
          if (ox < oy) b.vx = -b.vx; else b.vy = -b.vy;
          this.hud(); break;
        }
      }
      if (b.y > H + 6) { this.lives--; sfx.die(); this.hud(); if (this.lives <= 0) { api.over(this.score); return; } this.stick(); }
      if (this.br.every(x => x.hit)) { this.level++; this.score += 500; sfx.win(); this.setup(); this.hud(); }
    },
    draw() {
      rect("#111", 0, 0, W, H); rect("#444", 0, 0, W, 2);
      for (const br of this.br) if (!br.hit) { rect(br.c, br.x, br.y, br.w, br.h); rect("rgba(255,255,255,.25)", br.x, br.y, br.w, 2); }
      rect("#ecf0f1", this.px, 218, 40, 6); rect("#e74c3c", this.px, 218, 5, 6); rect("#e74c3c", this.px + 35, 218, 5, 6);
      rect("#fff", this.ball.x - 3, this.ball.y - 3, 6, 6);
      if (this.ball.on) text("اضغط A أو المس الشاشة", 128, 150, 12, "#aaa");
    }
  };

  /* =====================================================
     ٥) غزاة الفضاء
     ===================================================== */
  const invaders = {
    id: "invaders", name: "حرب الفضاء", emoji: "👾", color: "#16a085", pad: "lr-a",
    desc: "مخلوقات فضائية نازلة على الحارة! حرّك مركبتك واضربهم قبل لا يوصلون الأرض.",
    controls: "◀ ▶ للتحريك — A للإطلاق",
    init() { this.wave = 1; this.score = 0; this.lives = 3; this.x = 122; this.stars = Array.from({ length: 40 }, () => ({ x: rnd(0, W), y: rnd(0, H), s: rnd(0.3, 1) })); this.setup(); this.hud(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  ❤️ " + this.lives + "  ·  موجة " + this.wave); },
    setup() { this.al = []; for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) this.al.push({ x: 30 + c * 24, y: 26 + r * 17 + Math.min(this.wave - 1, 4) * 6, r, alive: true }); this.dir = 1; this.mt = 0; this.shot = null; this.bombs = []; this.frame = 0; this.boom = 0; },
    update(dt) {
      for (const s of this.stars) { s.y += 20 * s.s * dt; if (s.y > H) s.y = 0; }
      if (this.boom > 0) { this.boom -= dt; return; }
      const k = api.keys; if (k.left) this.x -= 120 * dt; if (k.right) this.x += 120 * dt; this.x = Math.max(4, Math.min(W - 17, this.x));
      if ((api.pressed("a") || api.pressed("up")) && !this.shot) { this.shot = { x: this.x + 6, y: 212 }; sfx.shot(); }
      if (this.shot) { this.shot.y -= 260 * dt; if (this.shot.y < 0) this.shot = null; }
      const alive = this.al.filter(a => a.alive);
      if (!alive.length) { this.wave++; this.score += 300; sfx.win(); this.setup(); this.hud(); return; }
      const interval = Math.max(0.06, 0.6 * alive.length / 40) / (1 + (this.wave - 1) * 0.15);
      this.mt += dt;
      if (this.mt > interval) {
        this.mt = 0; this.frame ^= 1;
        const minX = Math.min(...alive.map(a => a.x)), maxX = Math.max(...alive.map(a => a.x));
        if ((this.dir > 0 && maxX > W - 22) || (this.dir < 0 && minX < 8)) { this.dir = -this.dir; for (const a of alive) a.y += 8; }
        else for (const a of alive) a.x += 4 * this.dir;
        sfx.blip && beep(this.frame ? 110 : 90, 0.05, "square", 0.025);
      }
      if (Math.random() < dt * (0.8 + this.wave * 0.25) && this.bombs.length < 3) {
        const cols = {}; for (const a of alive) if (!cols[a.x] || cols[a.x].y < a.y) cols[a.x] = a;
        const list = Object.values(cols); const s = list[ri(0, list.length - 1)]; this.bombs.push({ x: s.x + 6, y: s.y + 10 });
      }
      for (const b of this.bombs) b.y += (85 + this.wave * 8) * dt;
      this.bombs = this.bombs.filter(b => {
        if (b.y > H) return false;
        if (b.y > 210 && b.y < 224 && b.x > this.x && b.x < this.x + 13) { this.lives--; sfx.die(); this.boom = 1; this.hud(); if (this.lives <= 0) api.over(this.score); return false; }
        return true;
      });
      if (this.shot) for (const a of alive) if (this.shot && this.shot.x > a.x && this.shot.x < a.x + 13 && this.shot.y > a.y && this.shot.y < a.y + 10) { a.alive = false; this.shot = null; this.score += (5 - a.r) * 10; sfx.hit(); this.hud(); }
      if (alive.some(a => a.y > 200)) { sfx.die(); api.over(this.score); }
    },
    draw() {
      rect("#05060f", 0, 0, W, H);
      for (const s of this.stars) rect(s.s > 0.7 ? "#fff" : "#667", s.x, s.y, 1, 1);
      const cols = ["#ff6b6b", "#feca57", "#48dbfb", "#1dd1a1", "#ff9ff3"];
      for (const a of this.al) if (a.alive) {
        const c = cols[a.r], x = Math.round(a.x), y = Math.round(a.y);
        rect(c, x + 2, y, 9, 2); rect(c, x, y + 2, 13, 5); rect("#05060f", x + 3, y + 3, 2, 2); rect("#05060f", x + 8, y + 3, 2, 2);
        if (this.frame) { rect(c, x, y + 7, 2, 3); rect(c, x + 11, y + 7, 2, 3); rect(c, x + 5, y + 7, 3, 2); }
        else { rect(c, x + 2, y + 7, 2, 3); rect(c, x + 9, y + 7, 2, 3); rect(c, x + 5, y + 8, 3, 2); }
      }
      if (this.shot) rect("#fff", this.shot.x, this.shot.y, 2, 6);
      for (const b of this.bombs) { rect("#ff7f50", b.x, b.y, 2, 5); rect("#ffd", b.x, b.y + 4, 2, 2); }
      if (!(this.boom > 0 && Math.floor(this.boom * 10) % 2)) { const x = Math.round(this.x); rect("#2ecc71", x, 216, 13, 6); rect("#2ecc71", x + 5, 212, 3, 4); rect("#27ae60", x, 221, 13, 2); }
      rect("#2ecc71", 0, 226, W, 1);
    }
  };

  /* =====================================================
     ٦) الطوب المتساقط (لعبة الطوب أبو ٩٩٩٩)
     ===================================================== */
  const SH = [
    [[1, 1, 1, 1]], [[1, 1], [1, 1]], [[0, 1, 0], [1, 1, 1]], [[1, 0, 0], [1, 1, 1]], [[0, 0, 1], [1, 1, 1]], [[1, 1, 0], [0, 1, 1]], [[0, 1, 1], [1, 1, 0]]
  ];
  const blocks = {
    id: "blocks", name: "الطوب المتساقط", emoji: "🟫", color: "#6d7a4f", pad: "dpad-a",
    desc: "مثل جهاز (الطوب) اللي كان بكل شنطة مدرسة! رتّب القطع عشان تكمّل صفوف كاملة وتنمسح.",
    controls: "◀ ▶ تحريك — ▲ تدوير — ▼ تنزيل سريع — A تنزيل فوري",
    init() { this.cw = 10; this.ch = 20; this.c = 11; this.ox = 60; this.oy = 10; this.grid = Array.from({ length: 20 }, () => new Array(10).fill(0)); this.score = 0; this.lines = 0; this.level = 1; this.t = 0; this.next = ri(0, 6); this.spawn(); this.hold = { l: 0, r: 0, d: 0 }; this.hud(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  صفوف " + this.lines + "  ·  مستوى " + this.level); },
    spawn() { this.p = { s: SH[this.next].map(r => r.slice()), x: 3, y: 0 }; this.next = ri(0, 6); if (this.hits(this.p.s, this.p.x, this.p.y)) { sfx.die(); api.over(this.score); } },
    hits(s, x, y) { for (let r = 0; r < s.length; r++) for (let c = 0; c < s[r].length; c++) if (s[r][c]) { const X = x + c, Y = y + r; if (X < 0 || X >= 10 || Y >= 20 || (Y >= 0 && this.grid[Y][X])) return true; } return false; },
    rot() { const s = this.p.s, n = s[0].map((_, i) => s.map(r => r[i]).reverse()); for (const k of [0, -1, 1, -2, 2]) if (!this.hits(n, this.p.x + k, this.p.y)) { this.p.s = n; this.p.x += k; sfx.blip(); return; } },
    lock() {
      const s = this.p.s; for (let r = 0; r < s.length; r++) for (let c = 0; c < s[r].length; c++) if (s[r][c] && this.p.y + r >= 0) this.grid[this.p.y + r][this.p.x + c] = 1;
      let n = 0; for (let r = 19; r >= 0; r--) if (this.grid[r].every(v => v)) { this.grid.splice(r, 1); this.grid.unshift(new Array(10).fill(0)); n++; r++; }
      if (n) { this.lines += n; this.score += [0, 100, 300, 500, 800][n] * this.level; this.level = 1 + Math.floor(this.lines / 10); sfx.line(); } else sfx.bounce();
      this.hud(); this.spawn();
    },
    move(dx) { if (!this.hits(this.p.s, this.p.x + dx, this.p.y)) this.p.x += dx; },
    update(dt) {
      const k = api.keys;
      if (api.pressed("left")) { this.move(-1); this.hold.l = 0; } if (api.pressed("right")) { this.move(1); this.hold.r = 0; }
      if (k.left) { this.hold.l += dt; if (this.hold.l > 0.2) { this.hold.l = 0.15; this.move(-1); } }
      if (k.right) { this.hold.r += dt; if (this.hold.r > 0.2) { this.hold.r = 0.15; this.move(1); } }
      if (api.pressed("up")) this.rot();
      if (api.pressed("a")) { while (!this.hits(this.p.s, this.p.x, this.p.y + 1)) { this.p.y++; this.score += 2; } this.lock(); return; }
      const iv = k.down ? 0.04 : Math.max(0.08, 0.8 - (this.level - 1) * 0.07);
      this.t += dt; if (this.t >= iv) { this.t = 0; if (this.hits(this.p.s, this.p.x, this.p.y + 1)) this.lock(); else { this.p.y++; if (k.down) this.score++; } }
    },
    cell(x, y, on) { const X = this.ox + x * this.c, Y = this.oy + y * this.c; rect(on ? "#1f2a14" : "#8f9e78", X, Y, this.c - 1, this.c - 1); rect(on ? "#9ead86" : "#9ead86", X + 2, Y + 2, this.c - 5, this.c - 5); if (on) rect("#1f2a14", X + 3, Y + 3, this.c - 7, this.c - 7); },
    draw() {
      rect("#9ead86", 0, 0, W, H); rect("#1f2a14", this.ox - 3, this.oy - 3, 10 * this.c + 5, 20 * this.c + 5); rect("#9ead86", this.ox - 1, this.oy - 1, 10 * this.c + 1, 20 * this.c + 1);
      for (let y = 0; y < 20; y++) for (let x = 0; x < 10; x++) this.cell(x, y, this.grid[y][x]);
      const s = this.p.s; for (let r = 0; r < s.length; r++) for (let c = 0; c < s[r].length; c++) if (s[r][c] && this.p.y + r >= 0) this.cell(this.p.x + c, this.p.y + r, 1);
      text("التالي", 210, 30, 11, "#1f2a14"); const n = SH[this.next];
      for (let r = 0; r < n.length; r++) for (let c = 0; c < n[r].length; c++) if (n[r][c]) { const X = 192 + c * 9, Y = 46 + r * 9; rect("#1f2a14", X, Y, 8, 8); rect("#9ead86", X + 2, Y + 2, 4, 4); }
      text("النتيجة", 210, 100, 11, "#1f2a14"); text(String(this.score), 210, 116, 13, "#1f2a14");
      text("صفوف", 210, 144, 11, "#1f2a14"); text(String(this.lines), 210, 160, 13, "#1f2a14");
      text("مستوى", 210, 188, 11, "#1f2a14"); text(String(this.level), 210, 204, 13, "#1f2a14");
      text("٩٩٩٩", 28, 120, 14, "#1f2a14");
    }
  };

  const LIST = [hara, hunt, blocks, snake, bricks, invaders];

  /* ---------- engine ---------- */
  function build() {
    if (ov) return;
    ov = document.createElement("div"); ov.className = "gov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    ov.innerHTML = '<div class="gbox"><div class="gtop"><button class="gx" id="gClose" aria-label="إغلاق">✕</button><b id="gTitle"></b><button class="gx" id="gMute" aria-label="الصوت"></button></div>' +
      '<div class="ghud" id="gHud"></div>' +
      '<div class="gscreenwrap"><canvas id="gCanvas" width="256" height="240"></canvas><div class="gscreen" id="gScreen"></div></div>' +
      '<div class="pad" id="gPad"><div class="dpad"><button data-k="up" class="up" aria-label="أعلى">▲</button><button data-k="left" class="lf" aria-label="يسار">◀</button><button data-k="right" class="rt" aria-label="يمين">▶</button><button data-k="down" class="dn" aria-label="أسفل">▼</button></div>' +
      '<div class="padmid"><span>زمن الأريل</span><small>FAMILY • 8 BIT</small></div><div class="abtn"><button data-k="a" aria-label="زر A">A</button></div></div></div>';
    document.body.appendChild(ov);
    canvas = ov.querySelector("#gCanvas"); g = canvas.getContext("2d"); g.imageSmoothingEnabled = false;
    screenEl = ov.querySelector("#gScreen"); hudEl = ov.querySelector("#gHud"); titleEl = ov.querySelector("#gTitle"); padEl = ov.querySelector("#gPad");
    ov.querySelector("#gClose").addEventListener("click", close);
    const mb = ov.querySelector("#gMute"); const setM = () => mb.textContent = muted ? "🔇" : "🔊"; setM();
    mb.addEventListener("click", () => { muted = !muted; try { localStorage.setItem("za_mute", muted ? "1" : "0"); } catch (e) {} setM(); });
    padEl.querySelectorAll("button[data-k]").forEach(b => {
      const k = b.dataset.k;
      const down = e => { e.preventDefault(); if (!keys[k]) just.add(k); keys[k] = true; b.classList.add("on"); if (state === "title" && k === "a") startPlay(); else if (state === "over" && k === "a") startPlay(); };
      const up = e => { e.preventDefault(); keys[k] = false; b.classList.remove("on"); };
      b.addEventListener("pointerdown", down); b.addEventListener("pointerup", up); b.addEventListener("pointerleave", up); b.addEventListener("pointercancel", up);
      b.addEventListener("contextmenu", e => e.preventDefault());
    });
    const pos = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    let pdown = false;
    canvas.addEventListener("pointerdown", e => { e.preventDefault(); pdown = true; try { canvas.setPointerCapture(e.pointerId); } catch (x) {} if (state === "play" && cur.tap) cur.tap(...pos(e)); });
    canvas.addEventListener("pointermove", e => { if (pdown && state === "play" && cur.move) cur.move(...pos(e)); });
    const pu = e => { if (!pdown) return; pdown = false; if (state === "play" && cur.release) cur.release(...pos(e)); };
    canvas.addEventListener("pointerup", pu); canvas.addEventListener("pointercancel", pu);
    const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", KeyA: "left", KeyD: "right", KeyW: "up", KeyS: "down", Space: "a", KeyZ: "a", KeyX: "a", Enter: "a" };
    window.addEventListener("keydown", e => {
      if (!ov.classList.contains("show")) return;
      if (e.key === "Escape") { close(); return; }
      const k = map[e.code]; if (!k) return; e.preventDefault();
      if (!keys[k]) just.add(k); keys[k] = true;
      if ((state === "title" || state === "over") && k === "a" && !e.repeat) startPlay();
    });
    window.addEventListener("keyup", e => { const k = map[e.code]; if (k) keys[k] = false; });
    document.addEventListener("visibilitychange", () => { if (document.hidden && state === "play") { state = "paused"; showPaused(); } });
  }
  function clearKeys() { for (const k in keys) keys[k] = false; just.clear(); }
  function setPad(kind) { padEl.dataset.kind = kind; }
  function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  async function board(id) {
    const box = el("div", "gboard"); box.append(el("div", "gbt", "🏆 لوحة الأبطال"));
    const list = el("ol"); box.append(list); list.append(el("li", "muted", "جاري التحميل…"));
    try {
      const r = await fetch("/api/scores?game=" + id); const d = await r.json(); list.replaceChildren();
      if (!d.top || !d.top.length) list.append(el("li", "muted", "ما فيه نتائج للحين — كن الأول!"));
      else d.top.forEach(x => { const li = el("li"); li.append(el("span", null, x.name), el("b", null, String(x.score))); list.append(li); });
    } catch (e) { list.replaceChildren(el("li", "muted", "تعذّر تحميل النتائج")); }
    return box;
  }
  async function showTitle() {
    state = "title"; screenEl.replaceChildren(); screenEl.classList.add("show");
    const s = screenEl;
    s.append(el("div", "gemo", cur.emoji), el("h3", null, cur.name), el("p", null, cur.desc), el("p", "gctl", "🎮 " + cur.controls));
    const b = el("button", "gstart", "ابدأ اللعب ▶"); b.addEventListener("click", startPlay); s.append(b);
    s.append(await board(cur.id));
    drawIdle();
  }
  function showPaused() {
    screenEl.replaceChildren(); screenEl.classList.add("show");
    screenEl.append(el("h3", null, "⏸️ اللعبة متوقفة"));
    const b = el("button", "gstart", "كمّل ▶"); b.addEventListener("click", () => { screenEl.classList.remove("show"); state = "play"; last = performance.now(); }); screenEl.append(b);
  }
  function drawIdle() { try { cur.init(); cur.draw(); } catch (e) {} hudEl.textContent = ""; }
  function startPlay() {
    screenEl.classList.remove("show"); screenEl.replaceChildren(); clearKeys();
    cur.init(); state = "play"; last = performance.now();
    if (onStart) try { onStart(cur.id); } catch (e) {}
  }
  async function endGame(score) {
    if (state !== "play") return;
    state = "over"; clearKeys();
    screenEl.replaceChildren(); screenEl.classList.add("show");
    screenEl.append(el("h3", null, "انتهت اللعبة"), el("div", "gscore", String(score)));
    const msg = el("p", "gmsg", ""); screenEl.append(msg);
    const row = el("div", "grow");
    const again = el("button", "gstart", "العب مرة ثانية ↻"); again.addEventListener("click", startPlay);
    const back = el("button", "gback", "رجوع"); back.addEventListener("click", close);
    row.append(again, back); screenEl.append(row);
    const id = cur.id;
    let res = null; if (onEnd) { try { res = await onEnd(id, score); } catch (e) {} }
    if (res && res.message) msg.textContent = res.message;
    if (state === "over" && cur && cur.id === id) screenEl.append(await board(id));
  }
  function loop(t) {
    raf = requestAnimationFrame(loop);
    if (!cur) return;
    const dt = Math.min(0.05, (t - last) / 1000 || 0); last = t;
    if (state === "play") { try { cur.update(dt); } catch (e) { console.error(e); } }
    if (state === "play" || state === "over") { try { cur.draw(); } catch (e) { console.error(e); } }
    just.clear();
  }
  function open(id) {
    build();
    cur = LIST.find(x => x.id === id); if (!cur) return;
    titleEl.textContent = cur.emoji + " " + cur.name; setPad(cur.pad);
    ov.classList.add("show"); document.body.style.overflow = "hidden";
    cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(loop);
    showTitle();
  }
  function close() {
    if (!ov) return;
    ov.classList.remove("show"); document.body.style.overflow = ""; cancelAnimationFrame(raf); state = "idle"; cur = null; clearKeys();
  }
  return {
    list: () => LIST.map(x => ({ id: x.id, name: x.name, emoji: x.emoji, color: x.color, desc: x.desc })),
    open, close,
    onEnd: f => { onEnd = f; }, onStart: f => { onStart = f; }
  };
})();
