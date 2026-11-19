
  /* =====================================================
     الأتاري — درع المدينة
     ===================================================== */
  const SHIELD_TH = [
    { n: "ليل الرياض", sky: "#0b1033", sky2: "#1c2a6b", city: "#3dd6f5" }, { n: "سماء بنفسجية", sky: "#1d0b33", sky2: "#4a1c6b", city: "#ff8ad8" },
    { n: "شفق أحمر", sky: "#2b0505", sky2: "#6b1c1c", city: "#ffd166" }, { n: "عاصفة الفجر", sky: "#05140f", sky2: "#164a3a", city: "#7cff9b" }
  ];
  const shield = {
    id: "shield", console: "atari", name: "درع المدينة", emoji: "🛡️", color: "#5b2c83", pad: "dpad-a",
    desc: "صواريخ نازلة على المدن! المس مكان في السماء وينطلق صاروخك يفجّر المكان ويوقف كل اللي حوله. كل موجة صواريخ أكثر وأسرع، ومن الموجة الرابعة تتفرع الصواريخ.",
    controls: "المس السماء للإطلاق — أو حرّك المؤشر بالأسهم واضغط A",
    init() { this.wave = 1; this.score = 0; this.cx = 128; this.cy = 100; this.cities = [28, 64, 96, 160, 192, 228].map(x => ({ x, alive: true })); this.bases = [10, 128, 246].map(x => ({ x, ammo: 10 })); this.bonusAt = 10000; this.newWave(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  موجة " + this.wave + "  ·  مدن " + this.cities.filter(c => c.alive).length); },
    newWave() { this.th = TH(this.wave, SHIELD_TH); this.bases.forEach(b => b.ammo = 10); this.left = 8 + this.wave * 3; this.spawnT = 1; this.ms = []; this.shots = []; this.exps = []; this.intro = 1.6; this.endT = 0; this.hud(); },
    fire(x, y) {
      if (this.intro > 0 || y > 196) return;
      let best = null, bd = 1e9; for (const b of this.bases) if (b.ammo > 0 && !b.dead) { const d = Math.abs(b.x - x); if (d < bd) { bd = d; best = b; } }
      if (!best) { sfx.blip(); return; }
      best.ammo--; this.shots.push({ x: best.x, y: 206, tx: x, ty: y, sx: best.x, sy: 206 }); sfx.pew();
    },
    tap(x, y) { this.cx = x; this.cy = y; this.fire(x, y); },
    spawn(x, y, tx) { const targets = [...this.cities.filter(c => c.alive).map(c => c.x), ...this.bases.filter(b => !b.dead).map(b => b.x)]; const t = tx != null ? tx : pick(targets.length ? targets : [128]); const sp = 14 + this.wave * 4; const d = Math.hypot(t - x, 210 - y); this.ms.push({ x, y, sx: x, sy: y, vx: (t - x) / d * sp, vy: (210 - y) / d * sp, split: this.wave >= 4 && Math.random() < 0.25 ? rnd(60, 130) : 0 }); },
    update(dt) {
      const k = api.keys, s = 150 * dt;
      if (k.left) this.cx -= s; if (k.right) this.cx += s; if (k.up) this.cy -= s; if (k.down) this.cy += s;
      this.cx = Math.max(4, Math.min(W - 4, this.cx)); this.cy = Math.max(10, Math.min(190, this.cy));
      if (api.pressed("a")) this.fire(this.cx, this.cy);
      if (this.intro > 0) { this.intro -= dt; return; }
      if (this.left > 0) { this.spawnT -= dt; if (this.spawnT <= 0) { this.spawnT = Math.max(0.35, 1.6 - this.wave * 0.1) * rnd(0.5, 1.3); this.left--; this.spawn(rnd(10, W - 10), 0); } }
      for (const sh of this.shots) { const d = Math.hypot(sh.tx - sh.x, sh.ty - sh.y), st = 300 * dt; if (d <= st) { sh.done = true; this.exps.push({ x: sh.tx, y: sh.ty, t: 0 }); sfx.boom(); } else { sh.x += (sh.tx - sh.x) / d * st; sh.y += (sh.ty - sh.y) / d * st; } }
      this.shots = this.shots.filter(s2 => !s2.done);
      for (const e of this.exps) e.t += dt; this.exps = this.exps.filter(e => e.t < 1.1);
      const rad = e => 20 * Math.sin(Math.min(1, e.t / 1.1) * Math.PI);
      for (const m of this.ms) {
        m.x += m.vx * dt; m.y += m.vy * dt;
        if (m.split && m.y > m.split) { m.split = 0; for (let i = 0; i < 2; i++) this.spawn(m.x, m.y); }
        for (const e of this.exps) if (Math.hypot(m.x - e.x, m.y - e.y) < rad(e)) { m.dead = true; this.score += 25 * this.wave; this.exps.push({ x: m.x, y: m.y, t: 0.2 }); break; }
        if (!m.dead && m.y >= 206) {
          m.dead = true; this.exps.push({ x: m.x, y: 206, t: 0.3 }); sfx.boom();
          for (const c of this.cities) if (c.alive && Math.abs(c.x - m.x) < 14) c.alive = false;
          for (const b of this.bases) if (!b.dead && Math.abs(b.x - m.x) < 10) { b.dead = true; b.ammo = 0; }
        }
      }
      this.ms = this.ms.filter(m => !m.dead);
      if (this.score >= this.bonusAt) { this.bonusAt += 10000; const c = this.cities.find(c2 => !c2.alive); if (c) { c.alive = true; sfx.win(); } }
      if (!this.cities.some(c => c.alive)) { sfx.die(); api.over(this.score); return; }
      if (this.left <= 0 && !this.ms.length && !this.exps.length) {
        this.endT += dt;
        if (this.endT > 0.8) { const ammo = this.bases.reduce((a, b) => a + b.ammo, 0), cs = this.cities.filter(c => c.alive).length; this.score += ammo * 5 * this.wave + cs * 100 * this.wave; this.bases.forEach(b => b.dead = false); this.wave++; sfx.stage(); this.newWave(); }
      }
      if (Math.random() < dt) this.hud();
    },
    draw() {
      const t = this.th, gr = g.createLinearGradient(0, 0, 0, 210); gr.addColorStop(0, t.sky); gr.addColorStop(1, t.sky2); g.fillStyle = gr; g.fillRect(0, 0, W, 210);
      rect("#c9a24a", 0, 206, W, 34); rect("#a8822f", 0, 206, W, 3);
      for (const c of this.cities) { if (c.alive) { rect(t.city, c.x - 10, 196, 6, 10); rect(t.city, c.x - 3, 190, 6, 16); rect(t.city, c.x + 4, 198, 6, 8); rect("#fff", c.x - 1, 193, 2, 2); } else { rect("#555", c.x - 10, 203, 20, 3); } }
      for (const b of this.bases) { rect(b.dead ? "#555" : "#e9e9e9", b.x - 8, 200, 16, 6); if (!b.dead) for (let i = 0; i < b.ammo; i++) rect("#3dd6f5", b.x - 9 + (i % 5) * 4, 210 + Math.floor(i / 5) * 4, 2, 3); }
      g.lineWidth = 1;
      for (const m of this.ms) { g.strokeStyle = "rgba(255,90,90,.85)"; g.beginPath(); g.moveTo(m.sx, m.sy); g.lineTo(m.x, m.y); g.stroke(); rect("#fff", m.x - 1, m.y - 1, 2, 2); }
      for (const s2 of this.shots) { g.strokeStyle = "rgba(120,220,255,.9)"; g.beginPath(); g.moveTo(s2.sx, s2.sy); g.lineTo(s2.x, s2.y); g.stroke(); rect("#fff", s2.tx - 1, s2.ty - 1, 2, 2); }
      for (const e of this.exps) { const r = 20 * Math.sin(Math.min(1, e.t / 1.1) * Math.PI); circ(Math.floor(e.t * 20) % 2 ? "#ffd166" : "#ff6b6b", e.x, e.y, Math.max(0.5, r)); }
      g.strokeStyle = "#fff"; g.beginPath(); g.moveTo(this.cx - 6, this.cy); g.lineTo(this.cx + 6, this.cy); g.moveTo(this.cx, this.cy - 6); g.lineTo(this.cx, this.cy + 6); g.stroke();
      if (this.intro > 0) banner("الموجة " + this.wave, t.n + " · " + (8 + this.wave * 3) + " صاروخ");
    }
  };

  /* =====================================================
     السيقا — صقر الصحراء
     ===================================================== */
  const FAL_TH = [
    { n: "فوق الربع الخالي", a: "#e6be7e", b: "#d9ab62", deco: "dune" }, { n: "فوق البحر الأحمر", a: "#1e6fa8", b: "#185d8f", deco: "wave" },
    { n: "فوق المدينة", a: "#5b6770", b: "#4e5961", deco: "bld" }, { n: "غارة الليل", a: "#0d1430", b: "#0a1026", deco: "star" }
  ];
  const falcon = {
    id: "falcon", console: "sega", name: "صقر الصحراء", emoji: "✈️", color: "#d35400", pad: "dpad-a",
    desc: "طيّارة الصقر ضد أسراب الطائرات المعادية! الرمي تلقائي، اجمع (P) عشان يقوى سلاحك، و(B) قنبلة تنظّف الشاشة. في آخر كل مرحلة يطلع زعيم أقوى من اللي قبله.",
    controls: "الأسهم للتحريك — أو اسحب بإصبعك — A قنبلة 💣",
    init() { this.stage = 1; this.score = 0; this.lives = 3; this.p = { x: 120, y: 200, inv: 2, pow: 1 }; this.bombs = 2; this.bul = []; this.eb = []; this.en = []; this.items = []; this.parts = []; this.scroll = 0; this.newStage(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  ❤️ " + this.lives + "  ·  💣 " + this.bombs + "  ·  مرحلة " + this.stage); },
    newStage() { this.th = TH(this.stage, FAL_TH); this.t = 0; this.len = 32 + this.stage * 2; this.boss = null; this.spawnT = 1; this.fireT = 0; this.intro = 1.6; this.hud(); },
    tap(x, y) { this.drag = { x, y, px: this.p.x, py: this.p.y }; },
    move(x, y) { if (this.drag) { this.p.x = Math.max(8, Math.min(W - 8, this.drag.px + (x - this.drag.x) * 1.2)); this.p.y = Math.max(20, Math.min(226, this.drag.py + (y - this.drag.y) * 1.2)); } },
    release() { this.drag = null; },
    boom(x, y, n, c) { for (let i = 0; i < n; i++) { const a = rnd(0, 7), s = rnd(20, 110); this.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, t: rnd(0.25, 0.7), c: c || pick(["#ffd166", "#ff6b35", "#fff"]) }); } },
    hitP() { if (this.p.inv > 0) return; this.lives--; this.p.inv = 2.2; this.p.pow = Math.max(1, this.p.pow - 1); this.bombs = Math.max(this.bombs, 2); this.boom(this.p.x, this.p.y, 30); sfx.boom(); this.eb = []; this.hud(); if (this.lives <= 0) { this.dead = 1.2; } },
    spawnWave() {
      const kind = pick(this.stage >= 2 ? ["swoop", "swoop", "shoot", "dive"] : ["swoop", "swoop", "shoot"]), hpb = 1 + Math.floor(this.stage / 3);
      if (kind === "swoop") { const n = 5, dir = Math.random() < 0.5 ? 1 : -1; for (let i = 0; i < n; i++) this.en.push({ k: kind, x: dir > 0 ? -10 - i * 18 : W + 10 + i * 18, y: 30 + i * 6, vx: dir * (55 + this.stage * 6), base: rnd(40, 90), t: i * 0.3, hp: hpb, r: 7, pts: 100 }); }
      else if (kind === "shoot") { const n = 2 + Math.min(3, Math.floor(this.stage / 2)); for (let i = 0; i < n; i++) this.en.push({ k: kind, x: 30 + i * (196 / Math.max(1, n - 1)), y: -10, vy: 60, stop: rnd(40, 90), fire: rnd(0.8, 1.6), hp: hpb + 2, r: 9, pts: 200, life: 7 }); }
      else { for (let i = 0; i < 3; i++) this.en.push({ k: kind, x: rnd(20, 236), y: -10 - i * 30, vy: 40, hp: hpb, r: 7, pts: 150, dive: false }); }
    },
    update(dt) {
      this.scroll += 50 * dt;
      for (const q of this.parts) { q.x += q.vx * dt; q.y += q.vy * dt; q.t -= dt; } this.parts = this.parts.filter(q => q.t > 0);
      if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0) api.over(this.score); return; }
      if (this.intro > 0) { this.intro -= dt; }
      const p = this.p, k = api.keys, sp = 130 * dt;
      if (k.left) p.x -= sp; if (k.right) p.x += sp; if (k.up) p.y -= sp; if (k.down) p.y += sp;
      p.x = Math.max(8, Math.min(W - 8, p.x)); p.y = Math.max(20, Math.min(226, p.y)); p.inv = Math.max(0, p.inv - dt);
      if (api.pressed("a") && this.bombs > 0) { this.bombs--; this.eb = []; this.flash = 0.3; sfx.boom(); for (const e of this.en) { e.hp -= 4; } if (this.boss) this.boss.hp -= 12; this.hud(); }
      if (this.flash > 0) this.flash -= dt;
      this.fireT -= dt;
      if (this.fireT <= 0 && this.intro <= 0) {
        this.fireT = 0.16; sfx.blip && beep(1200, 0.02, "square", 0.012);
        const sh = (dx, vx) => this.bul.push({ x: p.x + dx, y: p.y - 8, vx, vy: -300 });
        sh(0, 0); if (p.pow >= 2) { sh(-6, -40); sh(6, 40); } if (p.pow >= 3) { sh(-9, -90); sh(9, 90); }
      }
      for (const b of this.bul) { b.x += b.vx * dt; b.y += b.vy * dt; } this.bul = this.bul.filter(b => b.y > -10 && b.x > -10 && b.x < W + 10);
      if (this.intro > 0) return;
      this.t += dt;
      if (this.t < this.len) { this.spawnT -= dt; if (this.spawnT <= 0) { this.spawnT = Math.max(1, 3 - this.stage * 0.15) * rnd(0.8, 1.2); this.spawnWave(); } }
      else if (!this.boss && !this.en.length) { const hp = 60 + this.stage * 35; this.boss = { x: 128, y: -30, hp, max: hp, t: 0, fire: 1 }; sfx.stage(); }
      const aim = (x, y, s, off) => { const a = Math.atan2(p.y - y, p.x - x) + (off || 0); this.eb.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s }); };
      for (const e of this.en) {
        if (e.k === "swoop") { e.t += dt; e.x += e.vx * dt; e.y = e.base + Math.sin(e.t * 2.2) * 30 + e.t * 12; if (Math.random() < dt * 0.15 * this.stage) aim(e.x, e.y, 90); if (e.x < -40 || e.x > W + 40 || e.y > H + 20) e.gone = true; }
        else if (e.k === "shoot") { if (e.y < e.stop) e.y += e.vy * dt; else { e.fire -= dt; e.life -= dt; if (e.fire <= 0) { e.fire = Math.max(0.6, 1.6 - this.stage * 0.1); aim(e.x, e.y, 100); if (this.stage >= 3) { aim(e.x, e.y, 100, 0.3); aim(e.x, e.y, 100, -0.3); } } if (e.life <= 0) e.y -= 80 * dt * 3; if (e.y < -30) e.gone = true; } }
        else { if (!e.dive && e.y > 50) { e.dive = true; const a = Math.atan2(p.y - e.y, p.x - e.x); e.dx = Math.cos(a) * (120 + this.stage * 8); e.dy = Math.sin(a) * (120 + this.stage * 8); } if (e.dive) { e.x += e.dx * dt; e.y += e.dy * dt; } else e.y += e.vy * dt; if (e.y > H + 20 || e.x < -20 || e.x > W + 20) e.gone = true; }
        if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + 5) { e.hp = 0; this.hitP(); }
      }
      if (this.boss) {
        const B = this.boss; B.t += dt;
        if (B.y < 46) B.y += 30 * dt; else { B.x = 128 + Math.sin(B.t * 0.8) * 80; B.fire -= dt; if (B.fire <= 0) { B.fire = Math.max(0.5, 1.5 - this.stage * 0.08); const n = 8 + Math.min(8, this.stage * 2); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + B.t; this.eb.push({ x: B.x, y: B.y, vx: Math.cos(a) * 70, vy: Math.sin(a) * 70 }); } aim(B.x, B.y + 10, 120); } }
        if (Math.abs(B.x - p.x) < 26 && Math.abs(B.y - p.y) < 16) this.hitP();
      }
      for (const b of this.bul) {
        for (const e of this.en) if (!b.hit && e.hp > 0 && Math.hypot(b.x - e.x, b.y - e.y) < e.r + 2) { b.hit = true; e.hp--; if (e.hp <= 0) { this.score += e.pts * this.stage; this.boom(e.x, e.y, 10); sfx.hit(); const r = Math.random(); if (r < 0.06) this.items.push({ x: e.x, y: e.y, k: "P" }); else if (r < 0.09) this.items.push({ x: e.x, y: e.y, k: "B" }); } }
        if (!b.hit && this.boss && Math.abs(b.x - this.boss.x) < 26 && Math.abs(b.y - this.boss.y) < 14) { b.hit = true; this.boss.hp--; if (Math.random() < 0.3) this.boom(b.x, b.y, 2, "#fff"); }
      }
      this.bul = this.bul.filter(b => !b.hit);
      for (const e of this.en) if (e.hp <= 0 && !e.gone) e.gone = true; this.en = this.en.filter(e => !e.gone);
      if (this.boss && this.boss.hp <= 0) { this.score += 2000 * this.stage; this.boom(this.boss.x, this.boss.y, 60); sfx.win(); this.boss = null; this.eb = []; this.stage++; this.items.push({ x: 128, y: 60, k: "P" }); this.newStage(); return; }
      for (const b of this.eb) { b.x += b.vx * dt; b.y += b.vy * dt; if (Math.hypot(b.x - p.x, b.y - p.y) < 4) { b.dead = true; this.hitP(); } }
      this.eb = this.eb.filter(b => !b.dead && b.y < H + 10 && b.y > -10 && b.x > -10 && b.x < W + 10);
      for (const it of this.items) { it.y += 45 * dt; if (Math.hypot(it.x - p.x, it.y - p.y) < 12) { it.got = true; if (it.k === "P") { p.pow = Math.min(3, p.pow + 1); this.score += 500; } else { this.bombs = Math.min(5, this.bombs + 1); } sfx.coin(); this.hud(); } }
      this.items = this.items.filter(i => !i.got && i.y < H + 10);
      if (Math.random() < dt * 2) this.hud();
    },
    plane(x, y, c, flip) { g.save(); g.translate(Math.round(x), Math.round(y)); if (flip) g.scale(1, -1); rect(c, -1, -8, 3, 16); rect(c, -9, -1, 19, 4); rect(c, -4, 5, 9, 2); rect("#aee3ff", 0, -5, 1, 3); g.restore(); },
    draw() {
      const t = this.th, off = this.scroll;
      rect(t.a, 0, 0, W, H);
      for (let i = -1; i < 9; i++) {
        const y = i * 32 + (off % 32);
        if (t.deco === "dune") { g.fillStyle = t.b; g.beginPath(); g.ellipse((i * 77) % W, y, 50, 10, 0, 0, 7); g.fill(); }
        else if (t.deco === "wave") { for (let x = 0; x < W; x += 40) rect(t.b, x + (i % 2) * 20, y, 18, 2); }
        else if (t.deco === "bld") { for (let x = 0; x < W; x += 36) { rect(t.b, x + 4, y, 26, 26); rect("#7f8c95", x + 8, y + 4, 6, 6); } }
        else { for (let x = 0; x < W; x += 45) rect("#fff", (x + i * 31) % W, y, 1, 1); }
      }
      for (const it of this.items) { rect(it.k === "P" ? "#e74c3c" : "#3498db", it.x - 6, it.y - 6, 12, 12); text(it.k, it.x, it.y, 9, "#fff", "center", "monospace"); }
      for (const e of this.en) { const c = e.k === "shoot" ? "#7f8c8d" : e.k === "dive" ? "#8e44ad" : "#27ae60"; this.plane(e.x, e.y, c, true); if (e.k === "shoot") rect("#c0392b", e.x - 2, e.y - 2, 4, 4); }
      if (this.boss) { const B = this.boss, x = Math.round(B.x), y = Math.round(B.y); rect("#4a4a4a", x - 30, y - 6, 60, 12); rect("#636e72", x - 14, y - 16, 28, 30); rect("#c0392b", x - 4, y - 4, 8, 8); rect("#2d3436", x - 26, y + 6, 6, 8); rect("#2d3436", x + 20, y + 6, 6, 8); rect("#333", 40, 6, 176, 5); rect("#e74c3c", 40, 6, 176 * Math.max(0, B.hp) / B.max, 5); }
      for (const b of this.bul) rect("#fff3a0", b.x - 1, b.y - 3, 2, 6);
      for (const b of this.eb) { circ("#ff4d6d", b.x, b.y, 2.5); rect("#fff", b.x - 0.5, b.y - 0.5, 1, 1); }
      const p = this.p; if (!(this.dead > 0) && !(p.inv > 0 && Math.floor(p.inv * 12) % 2)) { this.plane(p.x, p.y, "#ecf0f1"); rect("#f39c12", p.x - 1, p.y + 8, 3, 2 + Math.random() * 3); }
      for (const q of this.parts) rect(q.c, q.x, q.y, 2, 2);
      if (this.flash > 0) rect("rgba(255,255,255," + this.flash * 2 + ")", 0, 0, W, H);
      if (this.intro > 0) banner("المرحلة " + this.stage, t.n);
      else if (this.boss && this.boss.y < 46) banner("⚠️ الزعيم!", "مرحلة " + this.stage, "#ff6b6b");
    }
  };

  /* =====================================================
     كمبيوتر العائلة — صعود البرج
     ===================================================== */
  const TOWER_TH = [{ n: "برج الحارة", g: "#d35400", g2: "#a04000", lad: "#f1c40f", bg: "#0b0b1a" }, { n: "برج الميناء", g: "#16a085", g2: "#0e6655", lad: "#ecf0f1", bg: "#061a1f" }, { n: "برج المصنع", g: "#8e44ad", g2: "#5b2c6f", lad: "#f5b041", bg: "#120818" }, { n: "برج الغروب", g: "#c0392b", g2: "#7b241c", lad: "#fad7a0", bg: "#1a0c05" }];
  const PY = [220, 186, 152, 118, 84, 50];
  const tower = {
    id: "tower", console: "family", name: "صعود البرج", emoji: "🍉", color: "#c0392b", pad: "dpad-a",
    desc: "جمل هايج فوق البرج يدحرج بطيخ! اطلع على السلالم ووصل للعلم فوق. نط فوق البطيخ عشان تاخذ نقاط. كل مرحلة برج جديد والبطيخ أسرع وأكثر.",
    controls: "◀ ▶ مشي — ▲ ▼ صعود ونزول السلم — A قفز",
    init() { this.level = 1; this.score = 0; this.lives = 3; this.build(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  ❤️ " + this.lives + "  ·  مرحلة " + this.level); },
    build() {
      this.th = TH(this.level, TOWER_TH); const R = seeded(this.level * 31337 + 5);
      this.plat = PY.map((y, i) => ({ y, x0: i === 5 ? 20 : (i % 2 ? 0 : 20), x1: i === 5 ? 160 : (i % 2 ? 236 : 256) }));
      this.plat[0] = { y: 220, x0: 0, x1: 256 };
      this.lad = [];
      for (let i = 0; i < 5; i++) { const n = 2 + (R() < 0.5 ? 1 : 0); const xs = new Set(); while (xs.size < n) xs.add(40 + Math.floor(R() * (i === 4 ? 6 : 9)) * 20); for (const x of xs) this.lad.push({ x, top: PY[i + 1], bot: PY[i], broken: this.level >= 3 && R() < 0.25 && xs.size > 2 }); }
      this.barrels = []; this.bt = 1.5; this.intro = 1.6; this.respawn(); this.hud();
    },
    respawn() { this.p = { x: 30, y: 220, vy: 0, on: 0, lad: null, face: 1, t: 0, jump: false, inv: 1 }; this.dead = 0; this.win = 0; },
    platAt(x, y) { for (let i = 0; i < this.plat.length; i++) { const P = this.plat[i]; if (Math.abs(P.y - y) < 2 && x >= P.x0 && x <= P.x1) return i; } return -1; },
    update(dt) {
      const p = this.p, k = api.keys;
      if (this.intro > 0) { this.intro -= dt; return; }
      if (this.win > 0) { this.win -= dt; if (this.win <= 0) { this.level++; this.score += 2000 + this.level * 200; sfx.stage(); this.build(); } return; }
      if (this.dead > 0) { this.dead -= dt; if (this.dead <= 0) { if (this.lives <= 0) { api.over(this.score); return; } this.respawn(); } return; }
      p.inv = Math.max(0, p.inv - dt);
      const bsp = Math.min(130, 55 + this.level * 9);
      this.bt -= dt; if (this.bt <= 0) { this.bt = Math.max(0.9, 3 - this.level * 0.22) * rnd(0.7, 1.3); this.barrels.push({ x: 40, y: 50, pi: 5, dir: 1, vy: 0, fall: false, rot: 0, jumped: false }); }
      if (p.lad) {
        const L = p.lad; if (k.up) p.y -= 50 * dt; if (k.down) p.y += 50 * dt;
        if (p.y <= L.top) { p.y = L.top; p.lad = null; } if (p.y >= L.bot) { p.y = L.bot; p.lad = null; }
        if (L.broken && p.y < L.bot - 14) p.y = L.bot - 14;
      } else {
        const dir = (k.right ? 1 : 0) - (k.left ? 1 : 0); if (dir) { p.face = dir; p.t += dt; }
        if (!p.jump && p.vy === 0) {
          const near = this.lad.find(L => Math.abs(L.x - p.x) < 5 && ((k.up && Math.abs(p.y - L.bot) < 2) || (k.down && Math.abs(p.y - L.top) < 2)));
          if (near && (k.up || k.down)) { p.lad = near; p.x = near.x; }
        }
        if (!p.lad) {
          p.x = Math.max(4, Math.min(252, p.x + dir * 60 * dt));
          if (api.pressed("a") && !p.jump && this.platAt(p.x, p.y) >= 0) { p.jump = true; p.vy = -150; sfx.jump(); }
          if (p.jump || this.platAt(p.x, p.y) < 0) {
            p.vy += 420 * dt; const ny = p.y + p.vy * dt;
            if (p.vy > 0) { const hit = this.plat.find(P => p.y <= P.y && ny >= P.y && p.x >= P.x0 && p.x <= P.x1); if (hit) { p.y = hit.y; p.vy = 0; p.jump = false; } else p.y = ny; }
            else p.y = ny;
            if (p.y > H + 10) { this.lives--; this.dead = 1; sfx.die(); this.hud(); return; }
          }
        }
      }
      for (const b of this.barrels) {
        b.rot += dt * 8 * b.dir;
        if (b.fall) { b.vy += 300 * dt; b.y += b.vy * dt; const tgt = PY[b.pi]; if (b.y >= tgt) { b.y = tgt; b.fall = false; b.vy = 0; b.dir = b.pi % 2 ? 1 : -1; if (b.pi === 0) b.dir = -1; } continue; }
        b.x += b.dir * bsp * dt; const P = this.plat[b.pi];
        const lad = this.lad.find(L => L.top === P.y && Math.abs(L.x - b.x) < 2 && !b.skip);
        if (lad && b.pi > 0 && Math.random() < 0.15 + this.level * 0.03) { b.pi--; b.fall = true; b.x = lad.x; b.skip = true; setTimeout(() => b.skip = false, 300); continue; }
        if (b.x < P.x0 - 4 || b.x > P.x1 + 4) { if (b.pi === 0) { b.gone = true; continue; } b.pi--; b.fall = true; }
        if (p.inv <= 0 && Math.abs(b.x - p.x) < 8 && Math.abs((b.y - 5) - (p.y - 7)) < 9) { this.lives--; this.dead = 1.2; sfx.die(); this.hud(); return; }
        if (!b.jumped && p.jump && Math.abs(b.x - p.x) < 8 && p.y < b.y - 8 && Math.abs(p.y - b.y) < 30) { b.jumped = true; this.score += 100 * this.level; sfx.coin(); this.hud(); }
      }
      this.barrels = this.barrels.filter(b => !b.gone);
      if (Math.abs(p.y - 50) < 2 && p.x > 130 && p.x < 162 && !p.lad) { this.win = 1.8; sfx.win(); }
    },
    draw() {
      const t = this.th; rect(t.bg, 0, 0, W, H);
      for (const L of this.lad) { for (let y = L.top; y < L.bot; y += 5) { if (L.broken && y > L.top + 6 && y < L.bot - 14) continue; rect(t.lad, L.x - 4, y, 9, 1); } rect(t.lad, L.x - 5, L.top, 1, L.bot - L.top); rect(t.lad, L.x + 5, L.top, 1, L.bot - L.top); }
      for (const P of this.plat) { rect(t.g, P.x0, P.y, P.x1 - P.x0, 5); for (let x = P.x0; x < P.x1; x += 8) rect(t.g2, x, P.y + 1, 4, 3); }
      rect("#ecf0f1", 154, 30, 2, 20); rect("#2ecc71", 156, 30, 10, 7);
      const now = performance.now(), cf = Math.floor(now / 400) % 2;
      rect("#c68642", 24, 34, 22, 12); rect("#c68642", 20, 28, 8, 10); rect("#c68642", 18, 24, 6, 6); rect("#111", 19, 25, 1, 1); rect("#a0522d", 32, 30, 6, 4); rect("#a0522d", 26 + cf * 2, 46, 3, 4); rect("#a0522d", 40 - cf * 2, 46, 3, 4);
      rect("#2ecc71", 50, 40, 9, 8); rect("#27ae60", 52, 41, 2, 6);
      for (const b of this.barrels) { const x = Math.round(b.x), y = Math.round(b.y) - 5; circ("#27ae60", x, y, 5); g.strokeStyle = "#145a32"; g.beginPath(); g.moveTo(x + Math.cos(b.rot) * 5, y + Math.sin(b.rot) * 5); g.lineTo(x - Math.cos(b.rot) * 5, y - Math.sin(b.rot) * 5); g.stroke(); rect("#e74c3c", x - 1, y - 1, 2, 2); }
      const p = this.p;
      if (this.dead > 0) { text("💫", p.x, p.y - 8, 12); }
      else if (!(p.inv > 0 && Math.floor(p.inv * 12) % 2)) {
        const f = Math.floor(p.t * 10) % 2; g.save(); g.translate(Math.round(p.x), Math.round(p.y) - 14); g.scale(p.face, 1);
        rect("#fff", -4, 0, 8, 3); rect("#d32f2f", -3, 1, 2, 1); rect("#d32f2f", 1, 1, 2, 1); rect("#e0a878", -2, 3, 5, 4); rect("#111", 1, 4, 1, 1);
        rect("#fafafa", -4, 7, 8, 6); rect("#5a3a22", -3 + (f && !p.lad ? 1 : 0), 13, 2, 1); rect("#5a3a22", 1 - (f && !p.lad ? 1 : 0), 13, 2, 1);
        g.restore();
      }
      if (this.intro > 0) banner("المرحلة " + this.level, t.n);
      if (this.win > 0) banner("وصلت فوق! 🎉", "+" + (2000 + (this.level + 1) * 200));
    }
  };

  /* =====================================================
     جهاز الطوب — سباق الطوب
     ===================================================== */
  const CAR = [[0, 1, 0], [1, 1, 1], [0, 1, 0], [1, 0, 1]];
  const brickrace = {
    id: "brickrace", console: "brick", name: "سباق الطوب", emoji: "🚗", color: "#7d8a5a", pad: "lr-a",
    desc: "سباق جهاز الطوب الأصلي! غيّر المسار وتفادى السيارات. كل ٢٠ سيارة تتجاوزها تنتقل لمستوى أسرع، ومن المستوى الثالث يصير الطريق ثلاث مسارات.",
    controls: "◀ ▶ تغيير المسار — A (أو ▲) تسريع",
    init() { this.c = 11; this.ox = 73; this.oy = 10; this.level = 1; this.score = 0; this.lives = 3; this.passed = 0; this.setLevel(); },
    hud() { api.hud("النتيجة " + this.score + "  ·  ❤️ " + this.lives + "  ·  مستوى " + this.level + "  ·  " + this.passed + "/٢٠"); },
    setLevel() { this.lanes = this.level >= 3 ? [1, 4, 7] : [2, 5]; this.lane = 0; this.cars = []; this.off = 0; this.t = 0; this.gap = 0; this.intro = 1.4; this.crash = 0; this.hud(); },
    update(dt) {
      if (this.intro > 0) { this.intro -= dt; return; }
      if (this.crash > 0) { this.crash -= dt; if (this.crash <= 0) { if (this.lives <= 0) { api.over(this.score); return; } this.cars = []; } return; }
      if (api.pressed("left")) this.lane = Math.max(0, this.lane - 1);
      if (api.pressed("right")) this.lane = Math.min(this.lanes.length - 1, this.lane + 1);
      const fast = api.keys.a || api.keys.up;
      const iv = Math.max(0.035, (0.16 - this.level * 0.012)) * (fast ? 0.5 : 1);
      this.t += dt; if (this.t < iv) return; this.t = 0;
      this.off = (this.off + 1) % 4; if (fast) this.score += 1;
      for (const c of this.cars) c.y++;
      this.gap--;
      if (this.gap <= 0) { const free = this.lanes.map((_, i) => i); const n = this.lanes.length === 3 && Math.random() < 0.35 ? 2 : 1; for (let i = 0; i < n; i++) { const idx = free.splice(ri(0, free.length - 1), 1)[0]; this.cars.push({ l: idx, y: -4 }); } this.gap = Math.max(5, 10 - this.level) + ri(0, 3); }
      const py = 16, px = this.lanes[this.lane];
      for (const c of this.cars) {
        if (c.l === this.lane && c.y + 3 >= py && c.y <= py + 3) { this.lives--; this.crash = 1.2; sfx.boom(); this.hud(); return; }
        if (c.y > 20 && !c.done) { c.done = true; this.passed++; this.score += 10 * this.level; sfx.blip(); if (this.passed >= 20) { this.passed = 0; this.level++; this.score += 300 * this.level; sfx.stage(); this.setLevel(); return; } this.hud(); }
      }
      this.cars = this.cars.filter(c => c.y < 22);
    },
    draw() {
      const [bg, ink, cl] = TH(this.level, LCD), c = this.c, grid = Array.from({ length: 20 }, () => new Array(10).fill(0));
      for (let y = 0; y < 20; y++) if ((y + this.off) % 4 !== 3) { grid[y][0] = 1; grid[y][9] = 1; }
      const put = (lx, ly) => { for (let r = 0; r < 4; r++) for (let q = 0; q < 3; q++) if (CAR[r][q]) { const Y = ly + r, X = lx + q; if (Y >= 0 && Y < 20 && X >= 0 && X < 10) grid[Y][X] = 1; } };
      for (const car of this.cars) put(this.lanes[car.l], car.y);
      if (!(this.crash > 0 && Math.floor(this.crash * 8) % 2)) put(this.lanes[this.lane], 16);
      rect(bg, 0, 0, W, H); rect(ink, this.ox - 3, this.oy - 3, 10 * c + 5, 20 * c + 5); rect(bg, this.ox - 1, this.oy - 1, 10 * c + 1, 20 * c + 1);
      for (let y = 0; y < 20; y++) for (let x = 0; x < 10; x++) { const X = this.ox + x * c, Y = this.oy + y * c, on = grid[y][x]; rect(on ? ink : cl, X, Y, c - 1, c - 1); rect(bg, X + 2, Y + 2, c - 5, c - 5); if (on) rect(ink, X + 3, Y + 3, c - 7, c - 7); }
      text("السرعة", 214, 40, 11, ink); text(String(this.level), 214, 58, 16, ink);
      text("النتيجة", 214, 100, 11, ink); text(String(this.score), 214, 116, 13, ink);
      text("❤️".repeat(Math.max(0, this.lives)), 214, 150, 10, ink);
      text("٩٩٩٩", 36, 120, 14, ink);
      if (this.intro > 0) banner("المستوى " + this.level, this.lanes.length === 3 ? "ثلاث مسارات!" : "مسارين");
    }
  };

  LIST.push(shield, falcon, tower, brickrace);
