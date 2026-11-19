
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
