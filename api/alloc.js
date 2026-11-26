import { put, list, del } from "@vercel/blob";
import { gunzipSync } from "node:zlib";
import { verify, bearer } from "../lib/auth.js";
import { ALLOC_PREFIX, newestUnder } from "../lib/snapshot.js";

/* ============================================================================
 * THE WAREHOUSE'S PICKING FILE (Order Allocation Report) — store and read back
 *
 * WHAT IT IS FOR
 * The admin check on 📦 ออเดอร์พิเศษ ("ใส่เลข GIN แล้วกดตรวจ") reads this file to
 * say, per line and per product, what the warehouse actually shipped. A day that
 * has already been checked reads back from the stored check and needs nothing —
 * but checking a NEW day needs the file. Keeping it only in the browser's memory
 * meant picking the file again after every refresh and on every device, which is
 * what the owner complained about twice. lib/snapshot.js holds the sizing.
 *
 * DATA-SAFETY RULES (same family as api/ordtrk.js / api/price.js):
 *  · never reads, merges or writes the main snapshot bd-data-*, so uploading a
 *    picking file can neither roll the sales data back nor evict its 8 backups
 *  · a write MERGES per GIN — it never replaces a month. An export can be
 *    filtered to a few days, and a narrow file must not delete the rest
 *  · ⚠️ WHICH SIDE OF ONE GIN WINS IS "THE ONE COVERING MORE DAYS", not the
 *    newer upload. A GIN usually spans several days (measured: 117 of 145), so
 *    an export filtered to the last day holds only PART of that GIN's rows.
 *    Newest-wins would quietly shrink it and the check for the earlier day would
 *    then under-report what the warehouse sent. Ties break on more rows, then on
 *    the later last-day. This is the same "a narrower file never deletes" rule
 *    the rest of the project follows, applied inside the record.
 *  · an empty payload is refused (409), exactly like api/save.js refuses an empty
 *    state, so a failed client-side parse cannot blank a month
 *  · KEEP rolling copies per month so a bad upload can be rolled back
 *  · quantities and money are rounded to 2 decimals on the way in. Verified on
 *    the owner's real export: the check comes back identical to the satang after
 *    a full round trip, and the only values that move are Excel's own float noise
 *    (1500.0000001199999 -> 1500), which every screen already printed as 1,500
 *
 * The payload is gzipped by the browser with the same scheme as api/save.js:
 * header x-body-gzip:1, content-type application/octet-stream. Do NOT set
 * Content-Encoding: gzip — the edge would auto-decompress and we would double-read.
 *
 * READING IS MANAGER-ONLY. The check itself is (spAdmOk), and this is the
 * depot's own picking data: which shop got how much of what, per order.
 * ==========================================================================*/

const KEEP = 6;                       // rolling copies per month
const MAX_BODY = 4_000_000;           // Vercel caps the request at ~4.5MB
const MAX_GIN = 4000;                 // GINs one upload may carry
const MAX_LINE = 40;                  // lines inside one GIN
const MAX_CODE = 2000;                // product codes inside one GIN+line
const MAX_ORD = 4000;                 // order numbers inside one GIN
const MAX_SHOP = 2000;                // shop codes kept per GIN+line+code
const MON = /^\d{4}-\d{2}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
/* the quantity fields the browser aggregates, in its own order:
   sale cases/packs/pieces · free cases/packs/pieces · allocated sale · allocated
   free · GSV · NIV · how many rows carried money */
const Q = ["sc", "ss", "sp", "fc", "fs", "fp", "xc", "xs", "xp", "yc", "ys", "yp", "g", "v", "mn"];

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on("data", (c) => {
      n += c.length;
      if (n > MAX_BODY) { reject(new Error("payload too large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

const S = (v, n) => String(v == null ? "" : v).slice(0, n || 40);
const NUM = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };
const INT = (v) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? n : 0; };

/* One GIN, rebuilt field by field so nothing unexpected reaches the stored file.
   Zero quantities are dropped rather than stored — that is 60% of the bytes. */
export function recGin(o) {
  if (!o || typeof o !== "object") return null;
  const r = { n: INT(o.n), d: [], o: [], ln: {} };
  for (const d of (Array.isArray(o.d) ? o.d : []).slice(0, 62)) {
    const s = S(d, 10); if (DAY.test(s)) r.d.push(s);
  }
  for (const x of (Array.isArray(o.o) ? o.o : []).slice(0, MAX_ORD)) {
    const s = S(x, 24); if (s) r.o.push(s);
  }
  const ln = (o.ln && typeof o.ln === "object") ? o.ln : {};
  for (const l of Object.keys(ln).slice(0, MAX_LINE)) {
    const line = S(l, 12); if (!line) continue;
    const src = (ln[l] && typeof ln[l] === "object") ? ln[l] : {};
    const out = {};
    for (const c of Object.keys(src).slice(0, MAX_CODE)) {
      const code = S(c, 24); if (!code) continue;
      const it = (src[c] && typeof src[c] === "object") ? src[c] : {};
      const rec = {};
      for (const q of Q) { const v = NUM(it[q]); if (v) rec[q] = v; }
      const sh = (Array.isArray(it.s) ? it.s : []).slice(0, MAX_SHOP)
        .map((x) => S(x, 20)).filter(Boolean);
      if (sh.length) rec.s = sh;
      out[code] = rec;
    }
    if (Object.keys(out).length) r.ln[line] = out;
  }
  /* per-order product breakdown — only used to work out which free line came with
     which bought line, so six numbers per code and nothing else */
  const od = (o.od && typeof o.od === "object") ? o.od : {};
  const odOut = {};
  for (const k of Object.keys(od).slice(0, MAX_ORD)) {
    const key = S(k, 24); if (!key) continue;
    const src = (od[k] && typeof od[k] === "object") ? od[k] : {};
    const one = {};
    for (const c of Object.keys(src).slice(0, MAX_CODE)) {
      const code = S(c, 24); if (!code) continue;
      const a = Array.isArray(src[c]) ? src[c] : [];
      one[code] = [NUM(a[0]), NUM(a[1]), NUM(a[2]), NUM(a[3]), NUM(a[4]), NUM(a[5])];
    }
    if (Object.keys(one).length) odOut[key] = one;
  }
  if (Object.keys(odOut).length) r.od = odOut;
  return Object.keys(r.ln).length ? r : null;
}

/* ⚠️ The merge inside one GIN. See the header: the side covering MORE DAYS wins,
   because a date-filtered export holds only part of a GIN that spans days. */
export function pickGin(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const da = (a.d || []).length, db = (b.d || []).length;
  if (da !== db) return da > db ? a : b;
  const na = INT(a.n), nb = INT(b.n);
  if (na !== nb) return na > nb ? a : b;
  const la = (a.d || []).slice().sort().pop() || "", lb = (b.d || []).slice().sort().pop() || "";
  return lb > la ? b : a;
}

export function mergeMonth(server, client) {
  const sg = (server && server.g) || {}, cg = (client && client.g) || {};
  const g = {};
  for (const k of Object.keys(sg)) g[k] = sg[k];
  for (const k of Object.keys(cg)) g[k] = pickGin(g[k], cg[k]);
  /* the name/pack maps are per product code and only ever grow — a file that
     does not mention a code must never drop the name another file gave it */
  const nm = Object.assign({}, (server && server.nm) || {}, (client && client.nm) || {});
  const pk = Object.assign({}, (server && server.pk) || {}, (client && client.pk) || {});
  return { g, nm, pk };
}

export default async function handler(req, res) {
  const claims = verify(bearer(req));
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  if (claims.role !== "manager") return res.status(403).json({ error: "บัญชีนี้เปิดส่วนนี้ไม่ได้" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า Blob storage" });

  /* ---------- READ ---------- */
  if (req.method === "GET") {
    try {
      const m = String((req.query && req.query.m) || "");
      /* no month asked for -> which months exist, read from the blob NAMES so it
         costs one listing and never a download */
      if (!m) {
        const { blobs } = await list({ prefix: ALLOC_PREFIX });
        const seen = {};
        for (const b of blobs || []) {
          const mm = (String(b.pathname || "").match(/^bd-alloc-(\d{4}-\d{2})-/) || [])[1];
          if (!mm) continue;
          const at = +new Date(b.uploadedAt) || 0;
          if (!seen[mm] || at > seen[mm]) seen[mm] = at;
        }
        const months = Object.keys(seen).sort().reverse().map((k) => ({ m: k, up: seen[k] }));
        return res.json({ months });
      }
      if (!MON.test(m)) return res.status(400).json({ error: "เดือนไม่ถูกต้อง" });
      const got = await newestUnder(ALLOC_PREFIX + m + "-", list, fetch);
      if (got.fail) return res.status(503).json({ error: "อ่านไฟล์ใบจัดของจากเซิร์ฟเวอร์ไม่ได้ — ลองใหม่อีกครั้ง" });
      const d = got.data || null;
      if (!d) return res.json({ m, none: true, g: {}, nm: {}, pk: {}, meta: null });
      return res.json({ m, g: d.g || {}, nm: d.nm || {}, pk: d.pk || {}, meta: d.meta || null });
    } catch (e) {
      return res.status(500).json({ error: String((e && e.message) || e) });
    }
  }

  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  /* ---------- WRITE ---------- */
  let body;
  try {
    const raw = await readBody(req);
    const txt = req.headers["x-body-gzip"] === "1" ? gunzipSync(raw).toString("utf8") : raw.toString("utf8");
    body = JSON.parse(txt);
  } catch (e) {
    const msg = String((e && e.message) || e);
    return res.status(msg.includes("too large") ? 413 : 400).json({
      error: msg.includes("too large") ? "ไฟล์ใหญ่เกินไป" : "อ่านข้อมูลที่ส่งมาไม่ได้",
    });
  }
  if (!body) return res.status(400).json({ error: "ไม่มีข้อมูลที่จะบันทึก" });

  const m = String(body.m || "");
  if (!MON.test(m)) return res.status(400).json({ error: "ไม่ได้ระบุเดือนของข้อมูล" });

  const inG = (body.g && typeof body.g === "object") ? body.g : {};
  const keys = Object.keys(inG).slice(0, MAX_GIN);
  if (!keys.length) {
    return res.status(409).json({ error: "ไม่มีเลข GIN ในไฟล์ที่ส่งมา — ยกเลิกเพื่อไม่ให้ข้อมูลเดิมหาย" });
  }
  const g = {};
  for (const k of keys) {
    const key = S(k, 24); if (!key) continue;
    const r = recGin(inG[k]); if (!r) continue;
    g[key] = r;
  }
  if (!Object.keys(g).length) {
    return res.status(409).json({ error: "อ่านเลข GIN จากข้อมูลที่ส่งมาไม่ได้เลย — ยกเลิกเพื่อไม่ให้ข้อมูลเดิมหาย" });
  }
  const nm = {}, pk = {};
  const inNm = (body.nm && typeof body.nm === "object") ? body.nm : {};
  const inPk = (body.pk && typeof body.pk === "object") ? body.pk : {};
  for (const c of Object.keys(inNm).slice(0, 20000)) {
    const code = S(c, 24), v = S(inNm[c], 120); if (code && v) nm[code] = v;
  }
  for (const c of Object.keys(inPk).slice(0, 20000)) {
    const code = S(c, 24), v = NUM(inPk[c]); if (code && v) pk[code] = v;
  }

  try {
    const got = await newestUnder(ALLOC_PREFIX + m + "-", list, fetch);
    /* the store HAS copies of this month but none could be read -> write nothing.
       Writing here would publish a month that lost every GIN already in it. */
    if (got.fail) return res.status(503).json({ error: "อ่านข้อมูลเดิมของเดือนนี้ไม่ได้ — ยังไม่บันทึกอะไรทั้งนั้น ลองใหม่อีกครั้ง" });
    const merged = mergeMonth(got.data || null, { g, nm, pk });
    const rec = {
      m,
      g: merged.g,
      nm: merged.nm,
      pk: merged.pk,
      meta: {
        file: S(body.file, 200),
        d1: S(body.d1, 10), d2: S(body.d2, 10),
        money: body.money ? 1 : 0,
        n: Object.keys(merged.g).length,
        by: S(claims.name, 60),
        up: Date.now(),
      },
    };
    const blob = await put(ALLOC_PREFIX + m + "-" + Date.now() + ".json", JSON.stringify(rec), {
      access: "public", contentType: "application/json", addRandomSuffix: true,
    });
    try {
      const { blobs } = await list({ prefix: ALLOC_PREFIX + m + "-" });
      blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      for (const b of blobs.slice(KEEP)) await del(b.url);
    } catch { /* best-effort cleanup — never fail the upload over it */ }
    return res.json({ ok: true, m, n: rec.meta.n, add: Object.keys(g).length, url: blob.url });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
