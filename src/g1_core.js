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
