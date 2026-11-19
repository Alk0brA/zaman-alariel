// زمن الأريل — الخادم: الموقع + الذكريات + المستخدمين + الدواوين + الألعاب + لوحة التحكم
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

const PORT = process.env.PORT || 3000;
const DB_URL = process.env.DATABASE_URL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SECRET = process.env.SESSION_SECRET || crypto.createHash("sha256").update("za:" + ADMIN_PASSWORD + ":" + (DB_URL || "")).digest("hex");
const pool = DB_URL ? new Pool({ connectionString: DB_URL, ssl: /localhost|127\.0\.0\.1|\/tmp/.test(DB_URL) ? false : { rejectUnauthorized: false }, max: 8 }) : null;

const CATS = ["tv","kids","ball","chips","video","family","school","eid","games","other"];
const GAMES = ["hara","hunt","maze","crossing","racer","pong","bricks","invaders","rocks","blocks","snake"];
const MAX_PHOTO = 2 * 1024 * 1024;
let version = Date.now();      // يتغير مع الذكريات و"أتذكرها"
let chatRev = Date.now();      // يتغير عند حذف رسائل أو تعديل الدواوين

const DEFAULTS = {
  siteTitle: "زمن الأريل",
  announcement: "",
  regDelaySec: 40,
  regRequired: false,
  memoriesNeedReg: true,
  chatNeedsReg: true,
  features: { memories: true, games: true, chat: true, quiz: true, stickers: true },
  games: Object.fromEntries(["hara","hunt","maze","crossing","racer","pong","bricks","invaders","rocks","blocks","snake"].map(g => [g, true])),
  boards: Object.fromEntries(["hara","hunt","maze","crossing","racer","pong","bricks","invaders","rocks","blocks","snake"].map(g => [g, "public"])),
  hallOfFame: true,
  prompts: []
};
let SETTINGS = JSON.parse(JSON.stringify(DEFAULTS));

async function migrate() {
  if (!pool) return;
  await pool.query(`
    create table if not exists memories (
      id uuid primary key,
      title text, text text not null, cat text not null default 'other',
      year int, city text, prompt text,
      has_photo boolean not null default false,
      author_id text not null, author_name text not null,
      delete_token text not null,
      created_at timestamptz not null default now()
    );
    alter table memories add column if not exists user_id uuid;
    create table if not exists photos (
      memory_id uuid primary key references memories(id) on delete cascade,
      mime text not null, data bytea not null
    );
    create table if not exists remembers (
      memory_id uuid not null references memories(id) on delete cascade,
      device_id text not null,
      created_at timestamptz not null default now(),
      primary key (memory_id, device_id)
    );
    create index if not exists memories_created_idx on memories (created_at desc);
    create table if not exists users (
      id uuid primary key,
      token_hash text unique not null,
      name text not null, nickname text, show_real boolean not null default true,
      email text not null, phone text,
      marketing boolean not null default false,
      device_id text, banned boolean not null default false,
      created_at timestamptz not null default now(),
      last_seen timestamptz not null default now()
    );
    create index if not exists users_email_idx on users (lower(email));
    create table if not exists rooms (
      id serial primary key, name text not null, emoji text not null default '💬',
      description text, sort int not null default 0, active boolean not null default true,
      created_at timestamptz not null default now()
    );
    create table if not exists messages (
      id bigserial primary key,
      room_id int not null references rooms(id) on delete cascade,
      user_id uuid, name text not null, text text not null,
      deleted boolean not null default false,
      created_at timestamptz not null default now()
    );
    create index if not exists messages_room_idx on messages (room_id, id);
    create table if not exists scores (
      id bigserial primary key, game text not null, user_id uuid, name text not null,
      score int not null, created_at timestamptz not null default now()
    );
    create index if not exists scores_game_idx on scores (game, score desc);
    create table if not exists settings (key text primary key, value jsonb not null);
    create table if not exists visits (day date not null, device text not null, primary key (day, device));
  `);
  const r = await pool.query("select count(*)::int n from rooms");
  if (!r.rows[0].n) {
    const seed = [
      ["🍟", "بقالة الحارة", "السوالف العامة — تعال سلّم على الجماعة", 1],
      ["📺", "ديوانية التلفزيون", "البرامج والمسلسلات والقنوات وأيام الأريل", 2],
      ["🧸", "ركن الكرتون", "كرتون الطفولة وبرامج الأطفال", 3],
      ["⚽", "ملعب الحارة", "الكورة والدوري ومباريات زمان", 4],
      ["🕹️", "ركن الأتاري", "الألعاب والأجهزة وتحديات النتائج", 5],
      ["🎒", "فصل خامس ب", "ذكريات المدرسة والمقصف والفسحة", 6]
    ];
    for (const [e, n, d, s] of seed) await pool.query("insert into rooms (emoji,name,description,sort) values ($1,$2,$3,$4)", [e, n, d, s]);
  }
  const s = await pool.query("select value from settings where key='site'");
  if (s.rows.length) SETTINGS = mergeSettings(DEFAULTS, s.rows[0].value);
}

function mergeSettings(base, v) {
  const out = JSON.parse(JSON.stringify(base));
  if (!v || typeof v !== "object") return out;
  if (typeof v.siteTitle === "string") out.siteTitle = v.siteTitle.slice(0, 60) || base.siteTitle;
  if (typeof v.announcement === "string") out.announcement = v.announcement.slice(0, 300);
  if (Number.isFinite(+v.regDelaySec)) out.regDelaySec = Math.max(0, Math.min(3600, Math.round(+v.regDelaySec)));
  for (const k of ["regRequired", "memoriesNeedReg", "chatNeedsReg", "hallOfFame"]) if (typeof v[k] === "boolean") out[k] = v[k];
  if (v.features && typeof v.features === "object") for (const k in out.features) if (typeof v.features[k] === "boolean") out.features[k] = v.features[k];
  if (v.games && typeof v.games === "object") for (const k in out.games) if (typeof v.games[k] === "boolean") out.games[k] = v.games[k];
  if (v.boards && typeof v.boards === "object") for (const k in out.boards) if (v.boards[k] === "public" || v.boards[k] === "hidden") out.boards[k] = v.boards[k];
  if (Array.isArray(v.prompts)) out.prompts = v.prompts.filter(x => typeof x === "string").map(x => x.trim().slice(0, 200)).filter(Boolean).slice(0, 60);
  return out;
}

// ---------- helpers ----------
const hits = new Map();
function limited(key, max) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < 60000);
  arr.push(now); hits.set(key, arr);
  return arr.length > max;
}
const presence = new Map(); // roomId -> Map(who -> ts)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) if (!v.some(t => now - t < 60000)) hits.delete(k);
  for (const [, m] of presence) for (const [w, t] of m) if (now - t > 60000) m.delete(w);
}, 60000).unref();
function onlineIn(roomId) { const m = presence.get(roomId); if (!m) return 0; const now = Date.now(); let n = 0; for (const t of m.values()) if (now - t < 30000) n++; return n; }

function ipOf(req) { return (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "?"; }
const SEC = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" };
function send(res, code, obj, headers) {
  const body = typeof obj === "string" || Buffer.isBuffer(obj) ? obj : JSON.stringify(obj);
  res.writeHead(code, Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, SEC, headers || {}));
  res.end(body);
}
function readJson(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on("data", c => { size += c.length; if (size > limit) { reject(Object.assign(new Error("too_large"), { status: 413 })); req.destroy(); } else chunks.push(c); });
    req.on("end", () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")); } catch (e) { reject(Object.assign(new Error("bad_json"), { status: 400 })); } });
    req.on("error", reject);
  });
}
const str = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max) : "");
const isId = v => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
const isDev = v => typeof v === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(v);
const sha = s => crypto.createHash("sha256").update(String(s)).digest("hex");
const displayName = u => (u.show_real || !u.nickname ? u.name : u.nickname);
function publicMe(u) { return { id: u.id, name: u.name, nickname: u.nickname || "", showReal: u.show_real, display: displayName(u), email: u.email, phone: u.phone || "", marketing: u.marketing }; }
function publicSettings() { return SETTINGS; }

const seen = new Map();
async function userOf(req) {
  const t = req.headers["x-za-token"];
  if (!pool || typeof t !== "string" || t.length < 20 || t.length > 100) return null;
  const r = await pool.query("select * from users where token_hash=$1", [sha(t)]);
  const u = r.rows[0] || null;
  if (u && Date.now() - (seen.get(u.id) || 0) > 60000) { seen.set(u.id, Date.now()); pool.query("update users set last_seen=now() where id=$1", [u.id]).catch(() => {}); }
  return u;
}
function adminToken() { const exp = Date.now() + 12 * 3600 * 1000; const sig = crypto.createHmac("sha256", SECRET).update("adm." + exp).digest("hex"); return "adm." + exp + "." + sig; }
function isAdmin(req) {
  const t = req.headers["x-za-admin"];
  if (!ADMIN_PASSWORD || typeof t !== "string") return false;
  const m = t.match(/^adm\.(\d+)\.([0-9a-f]{64})$/); if (!m || +m[1] < Date.now()) return false;
  const sig = crypto.createHmac("sha256", SECRET).update("adm." + m[1]).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(m[2]));
}
function csvCell(v) {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

// ---------- static ----------
const PUB = path.join(__dirname, "public");
const STATIC = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/admin": ["admin.html", "text/html; charset=utf-8"],
  "/style.css": ["style.css", "text/css; charset=utf-8"],
  "/app.js": ["app.js", "application/javascript; charset=utf-8"],
  "/games.js": ["games.js", "application/javascript; charset=utf-8"],
  "/robots.txt": ["robots.txt", "text/plain; charset=utf-8"]
};

// ---------- routes ----------
async function handle(req, res) {
  const url = new URL(req.url, "http://x");
  const p = url.pathname.replace(/\/+$/, "") || "/";
  const M = req.method;

  if (M === "GET" && STATIC[p]) {
    const [file, type] = STATIC[p];
    const extra = p === "/admin" ? { "X-Frame-Options": "DENY", "X-Robots-Tag": "noindex" } : {};
    res.writeHead(200, Object.assign({ "Content-Type": type, "Cache-Control": "no-cache" }, SEC, extra));
    return res.end(fs.readFileSync(path.join(PUB, file)));
  }
  if (M === "GET" && p === "/healthz") return send(res, 200, { ok: true, db: !!pool });
  if (!p.startsWith("/api/")) return send(res, 404, { error: "not_found" });
  if (!pool) return send(res, 503, { error: "no_database" });
  const ip = ipOf(req);

  // ===== public =====
  if (M === "GET" && p === "/api/boot") {
    const dev = url.searchParams.get("device");
    if (isDev(dev)) pool.query("insert into visits (day,device) values ((now() at time zone 'Asia/Riyadh')::date,$1) on conflict do nothing", [dev]).catch(() => {});
    const u = await userOf(req);
    return send(res, 200, { settings: publicSettings(), me: u && !u.banned ? publicMe(u) : null, banned: !!(u && u.banned) });
  }

  if (M === "POST" && p === "/api/register") {
    if (limited("reg:" + ip, 8)) return send(res, 429, { error: "rate_limited" });
    const b = await readJson(req, 4000);
    const name = str(b.name, 40), nickname = str(b.nickname, 30), email = str(b.email, 120).toLowerCase(), phone = str(b.phone, 20).replace(/[\s-]/g, "");
    if (name.length < 2) return send(res, 400, { error: "name" });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return send(res, 400, { error: "email" });
    if (phone && !/^\+?[0-9]{8,15}$/.test(phone)) return send(res, 400, { error: "phone" });
    if (b.consent !== true) return send(res, 400, { error: "consent" });
    const id = crypto.randomUUID(), token = crypto.randomBytes(24).toString("hex");
    const showReal = nickname ? b.showReal !== false : true;
    await pool.query("insert into users (id,token_hash,name,nickname,show_real,email,phone,marketing,device_id) values ($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [id, sha(token), name, nickname || null, showReal, email, phone || null, b.marketing === true, isDev(b.device) ? b.device : null]);
    const u = (await pool.query("select * from users where id=$1", [id])).rows[0];
    return send(res, 200, { token, me: publicMe(u) });
  }

  if (M === "POST" && p === "/api/me") {
    const u = await userOf(req); if (!u) return send(res, 401, { error: "auth" });
    const b = await readJson(req, 2000);
    const nickname = str(b.nickname, 30);
    const showReal = nickname ? b.showReal !== false : true;
    await pool.query("update users set nickname=$2, show_real=$3, marketing=$4 where id=$1", [u.id, nickname || null, showReal, b.marketing === true]);
    const nu = (await pool.query("select * from users where id=$1", [u.id])).rows[0];
    return send(res, 200, { me: publicMe(nu) });
  }

  if (M === "GET" && p === "/api/v") return send(res, 200, { v: version, c: chatRev });

  if (M === "GET" && p === "/api/state") {
    const [m, r] = await Promise.all([
      pool.query("select id,title,text,cat,year,city,prompt,has_photo,author_id,author_name,created_at from memories order by created_at desc limit 1000"),
      pool.query("select memory_id,device_id from remembers limit 20000")
    ]);
    return send(res, 200, {
      v: version,
      mems: m.rows.map(x => ({ id: x.id, title: x.title, text: x.text, cat: x.cat, year: x.year, city: x.city, prompt: x.prompt,
        photo: x.has_photo ? "/api/photo/" + x.id : null, author: x.author_id, authorName: x.author_name, createdAt: new Date(x.created_at).getTime() })),
      rems: r.rows.map(x => ({ m: x.memory_id, u: x.device_id }))
    });
  }

  const ph = p.match(/^\/api\/photo\/([0-9a-f-]{36})$/i);
  if (M === "GET" && ph) {
    const r = await pool.query("select mime,data from photos where memory_id=$1", [ph[1]]);
    if (!r.rows.length) return send(res, 404, { error: "not_found" });
    res.writeHead(200, Object.assign({ "Content-Type": r.rows[0].mime, "Cache-Control": "public, max-age=31536000, immutable" }, SEC));
    return res.end(r.rows[0].data);
  }

  if (M === "POST" && p === "/api/memories") {
    if (!SETTINGS.features.memories) return send(res, 403, { error: "disabled" });
    if (limited("m:" + ip, 12)) return send(res, 429, { error: "rate_limited" });
    const u = await userOf(req);
    if (u && u.banned) return send(res, 403, { error: "banned" });
    if (SETTINGS.memoriesNeedReg && !u) return send(res, 401, { error: "auth" });
    const b = await readJson(req, MAX_PHOTO * 1.4 + 20000);
    const text = str(b.text, 3000), name = u ? displayName(u) : str(b.authorName, 30);
    if (text.length < 5 || !name || !isDev(b.author)) return send(res, 400, { error: "invalid" });
    const cat = CATS.includes(b.cat) ? b.cat : "other";
    const y = parseInt(b.year, 10); const year = y >= 1970 && y <= 2015 ? y : null;
    let photo = null;
    if (typeof b.photo === "string" && b.photo) {
      const mm = b.photo.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (mm) { const buf = Buffer.from(mm[2], "base64"); if (buf.length <= MAX_PHOTO) photo = { mime: mm[1], data: buf }; }
    }
    const id = crypto.randomUUID(), token = crypto.randomBytes(18).toString("hex");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query("insert into memories (id,title,text,cat,year,city,prompt,has_photo,author_id,author_name,delete_token,user_id) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)",
        [id, str(b.title, 70) || null, text, cat, year, str(b.city, 30) || null, str(b.prompt, 200) || null, !!photo, b.author, name, token, u ? u.id : null]);
      if (photo) await client.query("insert into photos (memory_id,mime,data) values ($1,$2,$3)", [id, photo.mime, photo.data]);
      await client.query("commit");
    } catch (e) { await client.query("rollback").catch(() => {}); throw e; } finally { client.release(); }
    version = Date.now();
    return send(res, 200, { id, token, photoFailed: !!b.photo && !photo });
  }

  const del = p.match(/^\/api\/memories\/([0-9a-f-]{36})\/delete$/i);
  if (M === "POST" && del) {
    if (limited("d:" + ip, 30)) return send(res, 429, { error: "rate_limited" });
    const b = await readJson(req, 2000);
    const r = await pool.query("delete from memories where id=$1 and delete_token=$2", [del[1], str(b.token, 100)]);
    if (!r.rowCount) return send(res, 403, { error: "not_allowed" });
    version = Date.now();
    return send(res, 200, { ok: true });
  }

  if (M === "POST" && p === "/api/remember") {
    if (limited("r:" + ip, 90)) return send(res, 429, { error: "rate_limited" });
    const b = await readJson(req, 2000);
    if (!isId(b.memory) || !isDev(b.device)) return send(res, 400, { error: "invalid" });
    if (b.on) await pool.query("insert into remembers (memory_id,device_id) select $1,$2 where exists (select 1 from memories where id=$1) on conflict do nothing", [b.memory, b.device]);
    else await pool.query("delete from remembers where memory_id=$1 and device_id=$2", [b.memory, b.device]);
    version = Date.now();
    return send(res, 200, { ok: true });
  }

  // ----- rooms / chat -----
  if (M === "GET" && p === "/api/rooms") {
    const r = await pool.query(`select r.id,r.name,r.emoji,r.description,
        (select count(*)::int from messages m where m.room_id=r.id and not m.deleted) as count,
        (select max(created_at) from messages m where m.room_id=r.id and not m.deleted) as last_at
      from rooms r where r.active order by r.sort, r.id`);
    return send(res, 200, { rev: chatRev, rooms: r.rows.map(x => ({ id: x.id, name: x.name, emoji: x.emoji, description: x.description, count: x.count, lastAt: x.last_at ? new Date(x.last_at).getTime() : null, online: onlineIn(x.id) })) });
  }
  const rm = p.match(/^\/api\/rooms\/(\d+)\/messages$/);
  if (rm) {
    const roomId = +rm[1];
    const room = (await pool.query("select id,active from rooms where id=$1", [roomId])).rows[0];
    if (!room || !room.active) return send(res, 404, { error: "no_room" });
    const u = await userOf(req);
    if (M === "GET") {
      const who = u ? "u:" + u.id : (isDev(url.searchParams.get("device")) ? "d:" + url.searchParams.get("device") : null);
      if (who) { if (!presence.has(roomId)) presence.set(roomId, new Map()); presence.get(roomId).set(who, Date.now()); }
      const after = Math.max(0, parseInt(url.searchParams.get("after"), 10) || 0);
      const q = after
        ? await pool.query("select id,user_id,name,text,created_at from messages where room_id=$1 and id>$2 and not deleted order by id asc limit 100", [roomId, after])
        : await pool.query("select * from (select id,user_id,name,text,created_at from messages where room_id=$1 and not deleted order by id desc limit 80) t order by id asc", [roomId]);
      return send(res, 200, { rev: chatRev, online: onlineIn(roomId), messages: q.rows.map(x => ({ id: +x.id, user: x.user_id, name: x.name, text: x.text, at: new Date(x.created_at).getTime() })) });
    }
    if (M === "POST") {
      if (!SETTINGS.features.chat) return send(res, 403, { error: "disabled" });
      if (!u) return send(res, 401, { error: "auth" });
      if (u.banned) return send(res, 403, { error: "banned" });
      if (limited("c:" + u.id, 20)) return send(res, 429, { error: "rate_limited" });
      const b = await readJson(req, 4000);
      const text = str(b.text, 500);
      if (!text) return send(res, 400, { error: "empty" });
      const r = await pool.query("insert into messages (room_id,user_id,name,text) values ($1,$2,$3,$4) returning id,created_at", [roomId, u.id, displayName(u), text]);
      return send(res, 200, { message: { id: +r.rows[0].id, user: u.id, name: displayName(u), text, at: new Date(r.rows[0].created_at).getTime() } });
    }
  }

  // ----- scores -----
  if (M === "GET" && p === "/api/scores") {
    const g = url.searchParams.get("game");
    if (!GAMES.includes(g)) return send(res, 400, { error: "game" });
    if (SETTINGS.boards[g] === "hidden") return send(res, 200, { hidden: true, top: [] });
    const r = await pool.query("select name, max(score)::int as score from scores where game=$1 group by coalesce(user_id::text, name), name order by score desc limit 10", [g]);
    return send(res, 200, { top: r.rows });
  }
  if (M === "GET" && p === "/api/scores/best") {
    const r = await pool.query("select distinct on (game) game, name, score from scores order by game, score desc");
    const out = {}; for (const x of r.rows) if (SETTINGS.boards[x.game] !== "hidden") out[x.game] = { name: x.name, score: x.score };
    return send(res, 200, { best: out });
  }
  if (M === "GET" && p === "/api/scores/me") {
    const u = await userOf(req); if (!u) return send(res, 200, { mine: {} });
    const r = await pool.query("select game, max(score)::int score, count(*)::int plays from scores where user_id=$1 group by game", [u.id]);
    const out = {}; for (const x of r.rows) out[x.game] = { score: x.score, plays: x.plays };
    return send(res, 200, { mine: out });
  }
  if (M === "GET" && p === "/api/hall") {
    if (!SETTINGS.hallOfFame) return send(res, 200, { disabled: true, games: {} });
    const out = {};
    for (const g of GAMES) {
      if (SETTINGS.boards[g] === "hidden" || SETTINGS.games[g] === false) continue;
      const r = await pool.query("select name, max(score)::int as score from scores where game=$1 group by coalesce(user_id::text, name), name order by score desc limit 3", [g]);
      if (r.rows.length) out[g] = r.rows;
    }
    return send(res, 200, { games: out });
  }
  if (M === "POST" && p === "/api/scores") {
    const u = await userOf(req);
    if (!u) return send(res, 401, { error: "auth" });
    if (u.banned) return send(res, 403, { error: "banned" });
    if (limited("s:" + u.id, 20)) return send(res, 429, { error: "rate_limited" });
    const b = await readJson(req, 1000);
    const score = Math.floor(+b.score);
    if (!GAMES.includes(b.game) || !Number.isFinite(score) || score < 0 || score > 1000000) return send(res, 400, { error: "invalid" });
    await pool.query("insert into scores (game,user_id,name,score) values ($1,$2,$3,$4)", [b.game, u.id, displayName(u), score]);
    const best = (await pool.query("select max(score)::int s from scores where game=$1 and user_id=$2", [b.game, u.id])).rows[0].s;
    if (SETTINGS.boards[b.game] === "hidden") return send(res, 200, { hidden: true, best });
    const rank = await pool.query("select count(*)::int + 1 as rank from (select max(score) s from scores where game=$1 group by coalesce(user_id::text,name)) t where t.s > $2", [b.game, score]);
    return send(res, 200, { rank: rank.rows[0].rank, best });
  }

  // ===== admin =====
  if (p === "/api/admin/login" && M === "POST") {
    if (limited("al:" + ip, 8)) return send(res, 429, { error: "rate_limited" });
    const b = await readJson(req, 1000);
    const pw = typeof b.password === "string" ? b.password : "";
    if (!ADMIN_PASSWORD) return send(res, 503, { error: "no_admin_password" });
    const ok = pw.length === ADMIN_PASSWORD.length && crypto.timingSafeEqual(Buffer.from(pw), Buffer.from(ADMIN_PASSWORD));
    if (!ok) return send(res, 403, { error: "wrong_password" });
    return send(res, 200, { token: adminToken() });
  }
  if (p.startsWith("/api/admin/")) {
    if (!isAdmin(req)) return send(res, 401, { error: "admin_auth" });
    const a = p.slice("/api/admin".length);

    if (M === "GET" && a === "/overview") {
      const one = async (sql, args) => (await pool.query(sql, args || [])).rows[0];
      const today = "(now() at time zone 'Asia/Riyadh')::date";
      const [u, ut, um, mem, msg, sc, vt, vall] = await Promise.all([
        one("select count(*)::int n from users"),
        one(`select count(*)::int n from users where (created_at at time zone 'Asia/Riyadh')::date=${today}`),
        one("select count(*)::int n from users where marketing"),
        one("select count(*)::int n from memories"),
        one("select count(*)::int n from messages where not deleted"),
        one("select count(*)::int n from scores"),
        one(`select count(*)::int n from visits where day=${today}`),
        one("select count(distinct device)::int n from visits")
      ]);
      const series = await pool.query(`
        with d as (select generate_series(${today} - 13, ${today}, interval '1 day')::date as day)
        select d.day,
          (select count(*)::int from users where (created_at at time zone 'Asia/Riyadh')::date=d.day) signups,
          (select count(*)::int from visits v where v.day=d.day) visitors,
          (select count(*)::int from messages where (created_at at time zone 'Asia/Riyadh')::date=d.day) messages
        from d order by d.day`);
      const games = await pool.query("select game, count(*)::int plays, max(score)::int best from scores group by game");
      return send(res, 200, {
        users: u.n, usersToday: ut.n, marketing: um.n, memories: mem.n, messages: msg.n, scores: sc.n, visitorsToday: vt.n, visitorsAll: vall.n,
        series: series.rows.map(x => ({ day: x.day.toISOString().slice(0, 10), signups: x.signups, visitors: x.visitors, messages: x.messages })),
        games: games.rows
      });
    }
    if (M === "GET" && (a === "/users" || a === "/users.csv")) {
      const q = str(url.searchParams.get("q") || "", 80);
      const onlyMk = url.searchParams.get("marketing") === "1";
      const r = await pool.query(`select u.id,u.name,u.nickname,u.show_real,u.email,u.phone,u.marketing,u.banned,u.created_at,u.last_seen,
          (select count(*)::int from memories m where m.user_id=u.id) memories,
          (select count(*)::int from messages m where m.user_id=u.id and not m.deleted) messages,
          (select count(*)::int from scores s where s.user_id=u.id) plays
        from users u
        where ($1='' or u.name ilike '%'||$1||'%' or u.nickname ilike '%'||$1||'%' or u.email ilike '%'||$1||'%' or u.phone ilike '%'||$1||'%')
          and (not $2 or u.marketing)
        order by u.created_at desc limit 5000`, [q, onlyMk]);
      if (a === "/users.csv") {
        const head = ["الاسم", "الاسم المستعار", "البريد", "الجوال", "موافق على التسويق", "تاريخ التسجيل", "آخر زيارة", "ذكريات", "رسائل", "مرات اللعب", "محظور"];
        const lines = [head.join(",")].concat(r.rows.map(x => [x.name, x.nickname, x.email, x.phone, x.marketing ? "نعم" : "لا",
          new Date(x.created_at).toISOString(), new Date(x.last_seen).toISOString(), x.memories, x.messages, x.plays, x.banned ? "نعم" : "لا"].map(csvCell).join(",")));
        return send(res, 200, "﻿" + lines.join("\r\n"), { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=zaman-alariel-users.csv" });
      }
      return send(res, 200, { users: r.rows });
    }
    const ua = a.match(/^\/users\/([0-9a-f-]{36})\/(ban|delete)$/i);
    if (M === "POST" && ua) {
      if (ua[2] === "ban") { const b = await readJson(req, 500); await pool.query("update users set banned=$2 where id=$1", [ua[1], !!b.banned]); }
      else { await pool.query("delete from messages where user_id=$1", [ua[1]]); await pool.query("delete from scores where user_id=$1", [ua[1]]); await pool.query("update memories set user_id=null where user_id=$1", [ua[1]]); await pool.query("delete from users where id=$1", [ua[1]]); chatRev = Date.now(); }
      return send(res, 200, { ok: true });
    }
    if (M === "GET" && a === "/memories") {
      const r = await pool.query(`select m.id,m.title,m.text,m.cat,m.year,m.city,m.has_photo,m.author_name,m.created_at,u.email,
          (select count(*)::int from remembers x where x.memory_id=m.id) remembers
        from memories m left join users u on u.id=m.user_id order by m.created_at desc limit 1000`);
      return send(res, 200, { memories: r.rows.map(x => Object.assign({}, x, { photo: x.has_photo ? "/api/photo/" + x.id : null })) });
    }
    const md = a.match(/^\/memories\/([0-9a-f-]{36})\/delete$/i);
    if (M === "POST" && md) { await pool.query("delete from memories where id=$1", [md[1]]); version = Date.now(); return send(res, 200, { ok: true }); }

    if (M === "GET" && a === "/rooms") {
      const r = await pool.query("select r.*, (select count(*)::int from messages m where m.room_id=r.id and not m.deleted) count from rooms r order by sort,id");
      return send(res, 200, { rooms: r.rows.map(x => Object.assign(x, { online: onlineIn(x.id) })) });
    }
    if (M === "POST" && a === "/rooms") {
      const b = await readJson(req, 2000); const name = str(b.name, 40);
      if (!name) return send(res, 400, { error: "name" });
      await pool.query("insert into rooms (name,emoji,description,sort) values ($1,$2,$3,$4)", [name, str(b.emoji, 8) || "💬", str(b.description, 120) || null, parseInt(b.sort, 10) || 0]);
      chatRev = Date.now(); return send(res, 200, { ok: true });
    }
    const ro = a.match(/^\/rooms\/(\d+)(\/delete)?$/);
    if (M === "POST" && ro) {
      if (ro[2]) await pool.query("delete from rooms where id=$1", [+ro[1]]);
      else { const b = await readJson(req, 2000); await pool.query("update rooms set name=coalesce(nullif($2,''),name), emoji=coalesce(nullif($3,''),emoji), description=$4, sort=$5, active=$6 where id=$1",
        [+ro[1], str(b.name, 40), str(b.emoji, 8), str(b.description, 120) || null, parseInt(b.sort, 10) || 0, b.active !== false]); }
      chatRev = Date.now(); return send(res, 200, { ok: true });
    }
    if (M === "GET" && a === "/messages") {
      const room = parseInt(url.searchParams.get("room"), 10) || 0;
      const r = await pool.query(`select m.id,m.room_id,r.name room,m.name,m.text,m.created_at,u.email from messages m join rooms r on r.id=m.room_id left join users u on u.id=m.user_id
        where not m.deleted and ($1=0 or m.room_id=$1) order by m.id desc limit 300`, [room]);
      return send(res, 200, { messages: r.rows });
    }
    const mg = a.match(/^\/messages\/(\d+)\/delete$/);
    if (M === "POST" && mg) { await pool.query("update messages set deleted=true where id=$1", [mg[1]]); chatRev = Date.now(); return send(res, 200, { ok: true }); }

    if (M === "GET" && a === "/scores") {
      const out = {};
      for (const g of GAMES) {
        const r = await pool.query("select coalesce(user_id::text,name) k, name, max(score)::int score, count(*)::int plays from scores where game=$1 group by coalesce(user_id::text,name), name order by score desc limit 20", [g]);
        out[g] = r.rows;
      }
      return send(res, 200, { scores: out });
    }
    if (M === "POST" && a === "/scores/delete") {
      const b = await readJson(req, 1000);
      if (!GAMES.includes(b.game) || typeof b.k !== "string") return send(res, 400, { error: "invalid" });
      await pool.query("delete from scores where game=$1 and coalesce(user_id::text,name)=$2", [b.game, b.k.slice(0, 100)]);
      return send(res, 200, { ok: true });
    }
    if (M === "POST" && a === "/scores/reset") {
      const b = await readJson(req, 500);
      if (b.game === "all") await pool.query("delete from scores");
      else if (GAMES.includes(b.game)) await pool.query("delete from scores where game=$1", [b.game]);
      else return send(res, 400, { error: "game" });
      return send(res, 200, { ok: true });
    }
    if (M === "GET" && a === "/settings") return send(res, 200, { settings: SETTINGS, defaults: DEFAULTS });
    if (M === "POST" && a === "/settings") {
      const b = await readJson(req, 30000);
      SETTINGS = mergeSettings(SETTINGS, b);
      await pool.query("insert into settings (key,value) values ('site',$1) on conflict (key) do update set value=excluded.value", [JSON.stringify(SETTINGS)]);
      return send(res, 200, { settings: SETTINGS });
    }
    return send(res, 404, { error: "not_found" });
  }

  return send(res, 404, { error: "not_found" });
}

const server = http.createServer((req, res) => {
  handle(req, res).catch(e => {
    if (!e.status) console.error(e);
    if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : "server_error" });
  });
});

migrate().then(() => {
  server.listen(PORT, () => console.log("زمن الأريل يعمل على المنفذ " + PORT + (pool ? " (Postgres)" : " (بدون قاعدة بيانات)") + (ADMIN_PASSWORD ? "" : " — تحذير: ADMIN_PASSWORD غير مضبوط")));
}).catch(e => { console.error("migration failed", e); process.exit(1); });
