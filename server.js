// زمن الأريل — خادم بسيط: يقدّم الموقع ويحفظ الذكريات في Postgres
"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");

const PORT = process.env.PORT || 3000;
const DB_URL = process.env.DATABASE_URL;
const pool = DB_URL ? new Pool({ connectionString: DB_URL, ssl: /localhost|127\.0\.0\.1/.test(DB_URL) ? false : { rejectUnauthorized: false }, max: 5 }) : null;

const CATS = ["tv","kids","ball","chips","video","family","school","eid","games","other"];
const MAX_PHOTO = 2 * 1024 * 1024;
let version = Date.now();

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
  `);
}

// ---------- helpers ----------
const hits = new Map();
function limited(ip, max) {
  const now = Date.now(), win = 60000;
  const arr = (hits.get(ip) || []).filter(t => now - t < win);
  arr.push(now); hits.set(ip, arr);
  return arr.length > max;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (!v.some(t => now - t < 60000)) hits.delete(k); }, 60000).unref();

function ipOf(req) { return (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress || "?"; }
function send(res, code, obj, headers) {
  const body = typeof obj === "string" || Buffer.isBuffer(obj) ? obj : JSON.stringify(obj);
  res.writeHead(code, Object.assign({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" }, headers || {}));
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
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isId = v => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);
const isDev = v => typeof v === "string" && /^[A-Za-z0-9_-]{6,64}$/.test(v);

// ---------- static ----------
const STATIC = { "/": "index.html", "/index.html": "index.html", "/config.js": null };
const indexHtml = () => fs.readFileSync(path.join(__dirname, "index.html"));
const SEC_HEADERS = { "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin" };

// ---------- API ----------
async function handle(req, res) {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;

  if (req.method === "GET" && (p === "/" || p === "/index.html")) {
    res.writeHead(200, Object.assign({ "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-cache" }, SEC_HEADERS));
    return res.end(indexHtml());
  }
  if (req.method === "GET" && p === "/config.js") {
    res.writeHead(200, Object.assign({ "Content-Type": "application/javascript; charset=utf-8", "Cache-Control": "no-cache" }, SEC_HEADERS));
    return res.end(`window.ZA_CONFIG = ${JSON.stringify({ api: pool ? "/api" : "" })};`);
  }
  if (req.method === "GET" && p === "/healthz") return send(res, 200, { ok: true });

  if (!p.startsWith("/api/")) return send(res, 404, { error: "not_found" });
  if (!pool) return send(res, 503, { error: "no_database" });

  if (req.method === "GET" && p === "/api/v") return send(res, 200, { v: version });

  if (req.method === "GET" && p === "/api/state") {
    const [m, r] = await Promise.all([
      pool.query("select id,title,text,cat,year,city,prompt,has_photo,author_id,author_name,created_at from memories order by created_at desc limit 1000"),
      pool.query("select memory_id,device_id from remembers limit 20000"),
    ]);
    return send(res, 200, {
      v: version,
      mems: m.rows.map(x => ({ id: x.id, title: x.title, text: x.text, cat: x.cat, year: x.year, city: x.city, prompt: x.prompt,
        photo: x.has_photo ? "/api/photo/" + x.id : null, author: x.author_id, authorName: x.author_name, createdAt: new Date(x.created_at).getTime() })),
      rems: r.rows.map(x => ({ m: x.memory_id, u: x.device_id })),
    });
  }

  const ph = p.match(/^\/api\/photo\/([0-9a-f-]{36})$/i);
  if (req.method === "GET" && ph) {
    const r = await pool.query("select mime,data from photos where memory_id=$1", [ph[1]]);
    if (!r.rows.length) return send(res, 404, { error: "not_found" });
    res.writeHead(200, Object.assign({ "Content-Type": r.rows[0].mime, "Cache-Control": "public, max-age=31536000, immutable" }, SEC_HEADERS));
    return res.end(r.rows[0].data);
  }

  const ip = ipOf(req);

  if (req.method === "POST" && p === "/api/memories") {
    if (limited("m:" + ip, 12)) return send(res, 429, { error: "rate_limited" });
    const b = await readJson(req, MAX_PHOTO * 1.4 + 20000);
    const text = str(b.text, 3000), name = str(b.authorName, 30);
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
      await client.query("insert into memories (id,title,text,cat,year,city,prompt,has_photo,author_id,author_name,delete_token) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
        [id, str(b.title, 70) || null, text, cat, year, str(b.city, 30) || null, str(b.prompt, 200) || null, !!photo, b.author, name, token]);
      if (photo) await client.query("insert into photos (memory_id,mime,data) values ($1,$2,$3)", [id, photo.mime, photo.data]);
      await client.query("commit");
    } catch (e) { await client.query("rollback").catch(() => {}); throw e; } finally { client.release(); }
    version = Date.now();
    return send(res, 200, { id, token, photoFailed: !!b.photo && !photo });
  }

  const del = p.match(/^\/api\/memories\/([0-9a-f-]{36})\/delete$/i);
  if (req.method === "POST" && del) {
    if (limited("d:" + ip, 30)) return send(res, 429, { error: "rate_limited" });
    const b = await readJson(req, 2000);
    const r = await pool.query("delete from memories where id=$1 and delete_token=$2", [del[1], str(b.token, 100)]);
    if (!r.rowCount) return send(res, 403, { error: "not_allowed" });
    version = Date.now();
    return send(res, 200, { ok: true });
  }

  if (req.method === "POST" && p === "/api/remember") {
    if (limited("r:" + ip, 90)) return send(res, 429, { error: "rate_limited" });
    const b = await readJson(req, 2000);
    if (!isId(b.memory) || !isDev(b.device)) return send(res, 400, { error: "invalid" });
    if (b.on) await pool.query("insert into remembers (memory_id,device_id) select $1,$2 where exists (select 1 from memories where id=$1) on conflict do nothing", [b.memory, b.device]);
    else await pool.query("delete from remembers where memory_id=$1 and device_id=$2", [b.memory, b.device]);
    version = Date.now();
    return send(res, 200, { ok: true });
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
  server.listen(PORT, () => console.log("زمن الأريل يعمل على المنفذ " + PORT + (pool ? " (Postgres)" : " (بدون قاعدة بيانات)")));
}).catch(e => { console.error("migration failed", e); process.exit(1); });
