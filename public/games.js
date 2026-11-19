/* زمن الأريل — صالة ألعاب الثمانينات والتسعينات
   كل الألعاب تصاميم أصلية مستوحاة من روح أجهزة ذاك الزمن. */
"use strict";
const ZAGames = (() => {
  const W = 256, H = 240;
  let ov, canvas, g, screenEl, hudEl, titleEl, padEl, padMid, cur = null, state = "idle", raf = 0, last = 0, bootT = 0;
  let onEnd = null, onStart = null, boardFn = null;
  const keys = { left: false, right: false, up: false, down: false, a: false };
  const just = new Set();
  let muted = false; try { muted = localStorage.getItem("za_mute") === "1"; } catch (e) {}
  let ac = null;

  /* ---------- الأجهزة ---------- */
  const CONSOLES = {
    atari:  { name: "الأتاري", sub: "٨ بت · عصا تحكم وزر واحد", emoji: "🕹️", color: "#8a5a2b", year: "١٩٨٠" },
    family: { name: "كمبيوتر العائلة", sub: "شريط ٩٩٩ لعبة", emoji: "🎮", color: "#b3261e", year: "١٩٩٠" },
    sega:   { name: "السيقا", sub: "١٦ بت · سرعة وألوان", emoji: "🔵", color: "#1b4fa0", year: "١٩٩٣" },
    brick:  { name: "جهاز الطوب", sub: "٩٩٩٩ في ١ · شاشة LCD", emoji: "🧱", color: "#6d7a4f", year: "١٩٩٥" }
  };

  /* ---------- الصوت ---------- */
  function beep(f, d, type, vol, slide, delay) {
    if (muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      if (ac.state === "suspended") ac.resume();
      const o = ac.createOscillator(), gn = ac.createGain(), t = ac.currentTime + (delay || 0);
      o.type = type || "square"; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
      gn.gain.setValueAtTime(vol || 0.05, t); gn.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(gn).connect(ac.destination); o.start(t); o.stop(t + d + 0.02);
    } catch (e) {}
  }
  const tune = (notes, type, gap) => notes.forEach((f, i) => beep(f, (gap || 0.1) * 0.95, type || "square", 0.045, 0, i * (gap || 0.1)));
  const sfx = {
    jump: () => beep(330, 0.16, "square", 0.045, 420),
    coin: () => { beep(988, 0.06, "square", 0.04); beep(1319, 0.14, "square", 0.04, 0, 0.06); },
    shot: () => beep(260, 0.18, "sawtooth", 0.05, -200),
    pew: () => beep(880, 0.08, "square", 0.035, -500),
    hit: () => beep(700, 0.12, "square", 0.05, -500),
    boom: () => beep(120, 0.35, "sawtooth", 0.07, -80),
    die: () => beep(320, 0.6, "triangle", 0.08, -270),
    blip: () => beep(660, 0.04, "square", 0.03),
    waka: () => beep(420, 0.05, "triangle", 0.05, 120),
    bounce: () => beep(440, 0.05, "square", 0.04),
    line: () => { beep(523, 0.1); beep(784, 0.18, "square", 0.05, 0, 0.09); },
    win: () => tune([523, 659, 784, 1047], "square", 0.11),
    stage: () => tune([392, 523, 659, 784, 659, 784], "square", 0.08)
  };

  /* ---------- أدوات الرسم ---------- */
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const TH = (lvl, arr) => arr[(Math.max(1, lvl) - 1) % arr.length];
  function seeded(s) { s = s >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function rect(c, x, y, w, h) { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); }
  function circ(c, x, y, r) { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  function text(t, x, y, size, color, align, font) {
    g.font = "bold " + (size || 12) + "px " + (font || "Tajawal, sans-serif"); g.fillStyle = color || "#fff";
    g.textAlign = align || "center"; g.textBaseline = "middle";
    try { g.direction = "rtl"; } catch (e) {}
    g.fillText(t, x, y);
  }
  function banner(t1, t2, col) {
    rect("rgba(0,0,0,.62)", 28, 88, 200, t2 ? 58 : 42);
    text(t1, 128, 106, 18, col || "#f2c230");
    if (t2) text(t2, 128, 130, 12, "#fff");
  }
  const api = {
    W, H, keys, rnd, ri, sfx,
    pressed: k => just.has(k),
    hud: s => { hudEl.textContent = s; },
    over: score => endGame(score)
  };

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
    id: "pong", console: "atari", name: "تنس الطاولة", emoji: "🏓", color: "#34495e", pad: "dpad-a",
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

  /* ---------- شاشات تشغيل الأجهزة ---------- */
  const BOOT = {
    atari(t) {
      rect("#000", 0, 0, W, H);
      const cols = ["#d82800", "#fc7460", "#fcbc74", "#f8d878", "#b8f818", "#58d854", "#3cbcfc", "#6888fc", "#d800cc"];
      for (let i = 0; i < 9; i++) { const y = ((i * 26 + t * 160) % 260) - 20; rect(cols[i], 0, y, W, 10); }
      rect("#000", 40, 92, 176, 56); text("الأتاري", 128, 112, 24, "#fc7460"); text("مستعد للعب ▶", 128, 136, 11, "#fff");
    },
    family(t) {
      rect("#b3261e", 0, 0, W, H); const y = Math.min(108, -30 + t * 220);
      text("كمبيوتر العائلة", 128, y, 22, "#fff"); if (t > 0.6) text("٨ بت • شريط ٩٩٩ لعبة", 128, 136, 11, "#ffd9d6");
      for (let i = 0; i < 8; i++) rect(i % 2 ? "#fff" : "#7a120d", i * 32, 200, 32, 6);
    },
    sega(t) {
      const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#020a24"); gr.addColorStop(1, "#1b4fa0"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 40; i++) rect("#fff", (i * 61) % W, (i * 37 + t * 60) % H, 1, 1);
      g.save(); g.globalAlpha = Math.min(1, t * 2); text("السيقا", 128, 106, 30, "#5fb4ff"); g.restore();
      const sx = -60 + t * 360; g.fillStyle = "rgba(255,255,255,.55)"; g.beginPath(); g.moveTo(sx, 86); g.lineTo(sx + 14, 86); g.lineTo(sx - 6, 126); g.lineTo(sx - 20, 126); g.fill();
      if (t > 0.5) text("١٦ بت", 128, 138, 12, "#fff");
    },
    brick(t) {
      const [bg, ink] = LCD[0]; rect(bg, 0, 0, W, H);
      const rows = Math.floor(Math.min(1, t / 0.9) * 20);
      for (let y = 0; y < 20; y++) for (let x = 0; x < 10; x++) { const on = t < 0.9 ? y >= 20 - rows : y < Math.floor((t - 0.9) * 60); rect(on ? ink : "#8f9e78", 73 + x * 11, 10 + y * 11, 10, 10); }
      text("٩٩٩٩ في ١", 128, 232, 11, ink);
    }
  };
  const BOOT_TUNE = {
    atari: () => tune([196, 262, 330, 392], "square", 0.09),
    family: () => tune([523, 659, 784, 1047, 784, 1047], "square", 0.08),
    sega: () => tune([392, 494, 587, 784, 988], "triangle", 0.09),
    brick: () => tune([880, 660, 880, 660, 1320], "square", 0.07)
  };

  /* ---------- المحرك ---------- */
  function build() {
    if (ov) return;
    ov = document.createElement("div"); ov.className = "gov"; ov.setAttribute("role", "dialog"); ov.setAttribute("aria-modal", "true");
    ov.innerHTML = '<div class="gbox"><div class="gtop"><button class="gx" id="gClose" aria-label="إغلاق">✕</button><b id="gTitle"></b><button class="gx" id="gMute" aria-label="الصوت"></button></div>' +
      '<div class="ghud" id="gHud"></div>' +
      '<div class="gscreenwrap"><canvas id="gCanvas" width="256" height="240"></canvas><div class="gscreen" id="gScreen"></div></div>' +
      '<div class="pad" id="gPad"><div class="dpad"><button data-k="up" class="up" aria-label="أعلى">▲</button><button data-k="left" class="lf" aria-label="يسار">◀</button><button data-k="right" class="rt" aria-label="يمين">▶</button><button data-k="down" class="dn" aria-label="أسفل">▼</button><i class="hub"></i></div>' +
      '<div class="padmid"><span id="gPadName"></span><small id="gPadSub"></small></div><div class="abtn"><button data-k="a" class="ba" aria-label="زر A">A</button><button data-k="a" class="bb" aria-hidden="true" tabindex="-1">B</button><button data-k="a" class="bc" aria-hidden="true" tabindex="-1">C</button></div></div></div>';
    document.body.appendChild(ov);
    canvas = ov.querySelector("#gCanvas"); g = canvas.getContext("2d"); g.imageSmoothingEnabled = false;
    screenEl = ov.querySelector("#gScreen"); hudEl = ov.querySelector("#gHud"); titleEl = ov.querySelector("#gTitle"); padEl = ov.querySelector("#gPad");
    ov.querySelector("#gClose").addEventListener("click", close);
    const mb = ov.querySelector("#gMute"); const setM = () => mb.textContent = muted ? "🔇" : "🔊"; setM();
    mb.addEventListener("click", () => { muted = !muted; try { localStorage.setItem("za_mute", muted ? "1" : "0"); } catch (e) {} setM(); });
    padEl.querySelectorAll("button[data-k]").forEach(b => {
      const k = b.dataset.k;
      const down = e => { e.preventDefault(); if (!keys[k]) just.add(k); keys[k] = true; b.classList.add("on"); if (k === "a") onAction(); };
      const up = e => { e.preventDefault(); keys[k] = false; b.classList.remove("on"); };
      b.addEventListener("pointerdown", down); b.addEventListener("pointerup", up); b.addEventListener("pointerleave", up); b.addEventListener("pointercancel", up);
      b.addEventListener("contextmenu", e => e.preventDefault());
    });
    const pos = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
    let pdown = false;
    canvas.addEventListener("pointerdown", e => { e.preventDefault(); if (state === "boot") { showTitle(); return; } pdown = true; try { canvas.setPointerCapture(e.pointerId); } catch (x) {} if (state === "play" && cur.tap) cur.tap(...pos(e)); });
    canvas.addEventListener("pointermove", e => { if (pdown && state === "play" && cur.move) cur.move(...pos(e)); });
    const pu = e => { if (!pdown) return; pdown = false; if (state === "play" && cur.release) cur.release(...pos(e)); };
    canvas.addEventListener("pointerup", pu); canvas.addEventListener("pointercancel", pu);
    const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down", KeyA: "left", KeyD: "right", KeyW: "up", KeyS: "down", Space: "a", KeyZ: "a", KeyX: "a", Enter: "a" };
    window.addEventListener("keydown", e => {
      if (!ov.classList.contains("show")) return;
      if (e.key === "Escape") { close(); return; }
      const k = map[e.code]; if (!k) return; e.preventDefault();
      if (!keys[k]) just.add(k); keys[k] = true;
      if (k === "a" && !e.repeat) onAction();
    });
    window.addEventListener("keyup", e => { const k = map[e.code]; if (k) keys[k] = false; });
    document.addEventListener("visibilitychange", () => { if (document.hidden && state === "play") { state = "paused"; showPaused(); } });
  }
  function onAction() { if (state === "boot") showTitle(); else if (state === "title" || state === "over") startPlay(); }
  function clearKeys() { for (const k in keys) keys[k] = false; just.clear(); }
  function el(tag, cls, txt) { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  async function board(id) {
    const box = el("div", "gboard"); box.append(el("div", "gbt", "🏆 لوحة الأبطال"));
    const list = el("ol"); box.append(list); list.append(el("li", "muted", "جاري التحميل…"));
    try {
      const d = boardFn ? await boardFn(id) : { top: [] }; list.replaceChildren();
      if (d.hidden) { box.querySelector(".gbt").textContent = "🤫 لوحة الأبطال سرية"; list.append(el("li", "muted", "النتائج مخفية — بتنعلن لاحقاً!")); }
      else if (!d.top || !d.top.length) list.append(el("li", "muted", "ما فيه نتائج للحين — كن الأول!"));
      else d.top.forEach((x, i) => { const li = el("li"); li.append(el("span", null, ["🥇", "🥈", "🥉"][i] || (i + 1) + "."), el("span", "nm", x.name), el("b", null, String(x.score))); list.append(li); });
      if (d.mine != null) box.append(el("div", "gmine", "أفضل نتيجة لك: " + d.mine));
    } catch (e) { list.replaceChildren(el("li", "muted", "تعذّر تحميل النتائج")); }
    return box;
  }
  async function showTitle() {
    state = "title"; screenEl.replaceChildren(); screenEl.classList.add("show");
    const c = CONSOLES[cur.console];
    screenEl.append(el("div", "gbadge", c.emoji + " " + c.name), el("div", "gemo", cur.emoji), el("h3", null, cur.name), el("p", null, cur.desc), el("p", "gctl", "🎮 " + cur.controls), el("p", "gendless", "♾️ مراحل بلا نهاية — كل مرحلة أصعب"));
    const b = el("button", "gstart", "ابدأ اللعب ▶"); b.addEventListener("click", startPlay); screenEl.append(b);
    try { cur.init(); cur.draw(); } catch (e) {} hudEl.textContent = "";
    const id = cur.id; const bd = await board(id); if (state === "title" && cur && cur.id === id) screenEl.append(bd);
  }
  function showPaused() {
    screenEl.replaceChildren(); screenEl.classList.add("show");
    screenEl.append(el("h3", null, "⏸️ اللعبة متوقفة"));
    const b = el("button", "gstart", "كمّل ▶"); b.addEventListener("click", () => { screenEl.classList.remove("show"); state = "play"; last = performance.now(); }); screenEl.append(b);
  }
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
    if (state === "boot") { bootT += dt; try { BOOT[cur.console](bootT); } catch (e) {} if (bootT > 1.5) showTitle(); }
    else if (state === "play") { try { cur.update(dt); } catch (e) { console.error(e); } }
    if (state === "play" || state === "over") { try { cur.draw(); } catch (e) { console.error(e); } }
    just.clear();
  }
  function open(id) {
    build();
    cur = LIST.find(x => x.id === id); if (!cur) return;
    const c = CONSOLES[cur.console];
    titleEl.textContent = cur.emoji + " " + cur.name; padEl.dataset.kind = cur.pad; ov.dataset.console = cur.console;
    ov.querySelector("#gPadName").textContent = c.name; ov.querySelector("#gPadSub").textContent = c.sub;
    ov.classList.add("show"); document.body.style.overflow = "hidden";
    screenEl.classList.remove("show"); screenEl.replaceChildren(); hudEl.textContent = "";
    cancelAnimationFrame(raf); last = performance.now(); raf = requestAnimationFrame(loop);
    state = "boot"; bootT = 0; BOOT_TUNE[cur.console] && BOOT_TUNE[cur.console]();
  }
  function close() {
    if (!ov) return;
    ov.classList.remove("show"); document.body.style.overflow = ""; cancelAnimationFrame(raf); state = "idle"; cur = null; clearKeys();
  }
  return {
    consoles: () => CONSOLES,
    list: () => LIST.map(x => ({ id: x.id, name: x.name, emoji: x.emoji, color: x.color, desc: x.desc, console: x.console })),
    open, close,
    onEnd: f => { onEnd = f; }, onStart: f => { onStart = f; }, setBoard: f => { boardFn = f; },
    _cur: () => cur
  };
})();
