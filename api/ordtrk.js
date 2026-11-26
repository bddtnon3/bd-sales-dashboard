import { put, list, del } from "@vercel/blob";
import { gunzipSync } from "node:zlib";
import { verify, bearer } from "../lib/auth.js";
import { ORDTRK_PREFIX, newestUnder } from "../lib/snapshot.js";

/* ============================================================================
 * ORDER TRACKING INDEX — upload (manager) and read (any logged-in user)
 *
 * WHAT THIS IS
 * One order number ties the whole sales side together. Measured on the owner's
 * real files (allocation 10,428 rows / 1,789 orders · daily sales 15-23 Nov 26,
 * 7,902 rows / 1,401 orders):
 *   · the SAME number is in both files — "Order Number" in the allocation file,
 *     "หมายเลขคำสั่งซื้อ (Order Number)" in the daily sales file, all BDD01…
 *   · 1 order number = 1 shop, 1 creation date, 1 invoice, 1 GIN, 1 status —
 *     0 violations in 1,789 orders (the single order carrying two lines is
 *     BDD0100000003 on the dummy outlet T0000164400, not a real shop)
 *   · where both files hold the order, they AGREE 1,401/1,401 on shop, line,
 *     creation date and invoice number — 100% on all four
 *   · the 133 that are in one file only are simply not invoiced yet: 120 of
 *     them are the file's last day, billed the morning after
 *
 * So the index is keyed by order number and nothing else.
 *
 * DATA-SAFETY RULES (same as api/price.js / api/promoimg.js / api/apply.js):
 *  · it never reads, merges or writes the main snapshot bd-data-*, so uploading
 *    an allocation file can neither roll the sales data back nor evict its 8
 *    rolling backups
 *  · a write MERGES per order — it never replaces a month. An allocation export
 *    can be filtered, and a file holding one fortnight must not delete the rest
 *    of the month
 *  · which side of a conflict wins is decided by `u`, the LAST DAY THE FILE
 *    COVERS (yyyymmdd), never by the upload clock. Re-uploading an old export
 *    must not drag a Delivered order back to Confirmed. Fields are then merged
 *    one by one, so a field the fresher file happens to leave empty (a GIN not
 *    issued yet) can never blank one that is already known
 *  · an empty payload is refused (409), exactly like api/save.js refuses an
 *    empty state, so a failed client-side parse cannot blank a month
 *  · KEEP rolling copies PER MONTH, so a bad upload can be rolled back
 *
 * The payload is gzipped by the browser with the same scheme as api/save.js:
 * header x-body-gzip:1 and content-type application/octet-stream. Do NOT set
 * Content-Encoding: gzip — the edge would auto-decompress and we would double-read.
 *
 * WHY `det` IS SERVED SEPARATELY
 * The per-order product breakdown roughly doubles the month (measured: 246 KB
 * of order headers vs 451 KB with the breakdown, for 10 days). Nearly everyone
 * only ever looks at the header line, so GET returns it ONLY for ?full=1. One
 * blob, one write path, one merge — the projection happens on the server.
 * ==========================================================================*/

const KEEP = 6;                       // rolling copies per month
const MAX_BODY = 4_000_000;           // Vercel caps the request at ~4.5MB
const MAX_ORD = 20000;                // one upload can carry at most this many orders
const MAX_CODES = 60;                 // product codes kept per order
const MON = /^\d{4}-\d{2}$/;

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

/* One order header, rebuilt field by field so nothing unexpected can be smuggled
   into the stored index. Empty fields are dropped rather than stored as "".   */
export function recOrd(o) {
  if (!o || typeof o !== "object") return null;
  const r = {};
  const d = INT(o.d); if (d >= 1 && d <= 31) r.d = d;          // day of month (the month is the blob)
  const l = S(o.l, 12); if (l) r.l = l;                        // raw PJP code — mapped to a line at read time
  const s = S(o.s, 20); if (s) r.s = s;                        // outlet code
  const g = S(o.g, 20); if (g) r.g = g;                        // GIN No. — absent = warehouse has not issued one
  const t = S(o.t, 40); if (t) r.t = t;                        // status code, or the file's own text if unknown
  const i = S(o.i, 20); if (i) r.i = i;                        // invoice number tail
  const c = NUM(o.c); if (c) r.c = c;                          // cases (sale + free), may be fractional
  /* 📦 the same quantity as whole cases + leftover pieces, split per product code with that
     code's own case size and only then added up. The depot reads quantities as "N ลัง M ชิ้น"
     or as pieces — never as a fraction of a case — so this is what every screen prints.
     A record stored before this existed has neither, and the page says so rather than
     rounding silently. */
  /* ⚠️ written as a PAIR, always both or neither: mergeOne overrides key by key, so storing
     only the non-zero half would let "5 ลัง" from one file meet "8 ชิ้น" from another and
     print a quantity neither file ever stated. */
  const w = INT(o.w), p = NUM(o.p);
  if (w || p) { r.w = w; r.p = p; }
  const x = INT(o.x); if (x > 0) r.x = x;                      // rows whose unit could not be read — reported, never guessed
  const v = NUM(o.v); if (v) r.v = v;                          // NIV from the file, when the file carries money
  const n = INT(o.n); if (n > 0) r.n = n;                      // how many product codes in the order
  const u = INT(o.u); if (u > 0) r.u = u;                      // last day the FILE covers, yyyymmdd
  /* ---- from the Transaction Inquiry file (the rep's own keying log), which the
     allocation file cannot give: the time of day, the delivery dates and the channel.
     Delivery dates are stored as DAY OFFSETS from the creation date, not as dates, so a
     delivery that lands in the next month cannot fall outside this month's blob. ---- */
  const tm = S(o.tm, 5); if (/^\d{1,2}:\d{2}$/.test(tm)) r.tm = tm;   // เวลาสั่งซื้อ HH:MM
  /* ⚠️ ต้องเช็กว่า "มีค่าส่งมาจริง" ก่อน — INT(undefined) คืน 0 และ 0 ก็ผ่านช่วง 0..120
     ช่องที่ไม่มีข้อมูลจะกลายเป็น "ส่งวันเดียวกับที่คีย์" ซึ่งเป็นการโกหก (เทสต์จับได้) */
  const DAY = (v) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Math.round(Number(v));
    return (Number.isFinite(n) && n >= 0 && n <= 120) ? n : null;
  };
  const dp = DAY(o.dp); if (dp !== null) r.dp = dp;                   // +วัน ถึงวันนัดส่ง
  const dv = DAY(o.dv); if (dv !== null) r.dv = dv;                   // +วัน ถึงวันส่งจริง (ไม่มี = ยังไม่ส่ง)
  const cn = S(o.cn, 1); if (cn) r.cn = cn;                           // ช่องทาง M/B/O
  // 🧩 the order number the rep and the shop see in the app (#1034715426). Measured on the
  // owner's real files: present on 2,096 of 2,107 documents (the 11 without were keyed in the
  // back office, so no app was involved), 1 order = 1 number, and the sales file and the
  // transaction file state the same number on all 1,392 orders they share. The allocation file
  // does not carry it at all. It is what a rep can type from memory, so the search accepts it.
  const rf = S(o.rf, 24); if (rf) r.rf = rf;
  if (o.cx) r.cx = 1;                                                 // ยกเลิกแล้ว
  return Object.keys(r).length ? r : null;
}

/* The product breakdown of one order: {code:[saleCases, freeCases, caseSize?]}
   The case size is appended, never inserted: a breakdown stored with two entries still reads
   correctly and simply has no size, which the page then looks up in the product master. */
export function recDet(d) {
  if (!d || typeof d !== "object") return null;
  const out = {};
  for (const k of Object.keys(d).slice(0, MAX_CODES)) {
    const code = S(k, 24); if (!code) continue;
    const a = Array.isArray(d[k]) ? d[k] : [];
    const pk = NUM(a[2]);
    out[code] = pk > 0 ? [NUM(a[0]), NUM(a[1]), pk] : [NUM(a[0]), NUM(a[1])];
  }
  return Object.keys(out).length ? out : null;
}

/* ⚠️ The merge. Two rules, both load-bearing:
   1. union by order number — a file that does not mention an order can never delete it
   2. within one order, the record from the file covering the LATER day wins, and the
      other side's fields are kept where the winner has none. Newest-wins on the whole
      record would blank a known GIN the moment a file was re-exported without it. */
export function mergeOne(a, b) {
  if (!a) return b || null;
  if (!b) return a;
  const lo = (INT(b.u) >= INT(a.u)) ? a : b;
  const hi = (lo === a) ? b : a;
  const out = {};
  for (const k of Object.keys(lo)) out[k] = lo[k];
  for (const k of Object.keys(hi)) {
    const v = hi[k];
    if (v !== "" && v !== null && v !== undefined) out[k] = v;
  }
  return out;
}

export function mergeMonth(server, client) {
  const sOrd = (server && server.ord) || {}, cOrd = (client && client.ord) || {};
  const sDet = (server && server.det) || {}, cDet = (client && client.det) || {};
  const ord = {}, det = {};
  for (const k of Object.keys(sOrd)) ord[k] = sOrd[k];
  for (const k of Object.keys(cOrd)) ord[k] = mergeOne(ord[k], cOrd[k]);
  for (const k of Object.keys(sDet)) det[k] = sDet[k];
  /* the breakdown is a restatement of the same rows, so the fresher file simply wins;
     a file that does not mention the order still cannot delete its breakdown */
  for (const k of Object.keys(cDet)) {
    const older = sOrd[k], newer = cOrd[k];
    if (!det[k] || !older || !newer || INT(newer.u) >= INT(older.u)) det[k] = cDet[k];
  }
  return { ord, det };
}

export default async function handler(req, res) {
  const claims = verify(bearer(req));
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า Blob storage" });

  /* ---------- READ: everyone who is logged in; the whole team reads this page ---------- */
  if (req.method === "GET") {
    try {
      const m = String((req.query && req.query.m) || "");
      /* no month asked for -> which months exist. Read from the blob NAMES, so this
         costs one listing and never a download. */
      if (!m) {
        const { blobs } = await list({ prefix: ORDTRK_PREFIX });
        const seen = {};
        for (const b of blobs || []) {
          const mm = (String(b.pathname || "").match(/^bd-ordtrk-(\d{4}-\d{2})-/) || [])[1];
          if (!mm) continue;
          const at = +new Date(b.uploadedAt) || 0;
          if (!seen[mm] || at > seen[mm]) seen[mm] = at;
        }
        const months = Object.keys(seen).sort().reverse().map((k) => ({ m: k, up: seen[k] }));
        return res.json({ months });
      }
      if (!MON.test(m)) return res.status(400).json({ error: "เดือนไม่ถูกต้อง" });
      const got = await newestUnder(ORDTRK_PREFIX + m + "-", list, fetch);
      if (got.fail) return res.status(503).json({ error: "อ่านข้อมูลสถานะออเดอร์จากเซิร์ฟเวอร์ไม่ได้ — ลองใหม่อีกครั้ง" });
      const d = got.data || null;
      if (!d) return res.json({ m, ord: {}, det: null, meta: null, none: true });
      const full = String((req.query && req.query.full) || "") === "1";
      return res.json({ m, ord: d.ord || {}, det: full ? (d.det || {}) : null, meta: d.meta || null });
    } catch (e) {
      return res.status(500).json({ error: String((e && e.message) || e) });
    }
  }

  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  if (claims.role !== "manager") return res.status(403).json({ error: "บัญชีนี้แก้ส่วนนี้ไม่ได้" });

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

  const inOrd = (body.ord && typeof body.ord === "object") ? body.ord : {};
  const keys = Object.keys(inOrd).slice(0, MAX_ORD);
  if (!keys.length) {
    return res.status(409).json({ error: "ไม่มีออเดอร์ในไฟล์ที่ส่งมา — ยกเลิกเพื่อไม่ให้ข้อมูลเดิมหาย" });
  }
  const inDet = (body.det && typeof body.det === "object") ? body.det : {};
  const ord = {}, det = {};
  for (const k of keys) {
    const key = S(k, 24); if (!key) continue;
    const r = recOrd(inOrd[k]); if (!r) continue;
    ord[key] = r;
    const dd = recDet(inDet[k]); if (dd) det[key] = dd;
  }
  if (!Object.keys(ord).length) {
    return res.status(409).json({ error: "อ่านออเดอร์จากข้อมูลที่ส่งมาไม่ได้เลย — ยกเลิกเพื่อไม่ให้ข้อมูลเดิมหาย" });
  }

  try {
    const got = await newestUnder(ORDTRK_PREFIX + m + "-", list, fetch);
    /* the store HAS copies of this month but none could be read -> write nothing.
       Writing here would publish a month that lost every order already in it. */
    if (got.fail) return res.status(503).json({ error: "อ่านข้อมูลเดิมของเดือนนี้ไม่ได้ — ยังไม่บันทึกอะไรทั้งนั้น ลองใหม่อีกครั้ง" });
    const merged = mergeMonth(got.data || null, { ord, det });
    const rec = {
      m,
      ord: merged.ord,
      det: merged.det,
      meta: {
        file: S(body.file, 200),
        d1: S(body.d1, 10), d2: S(body.d2, 10),
        n: Object.keys(merged.ord).length,
        by: S(claims.name, 60),
        up: Date.now(),
      },
    };
    const blob = await put(ORDTRK_PREFIX + m + "-" + Date.now() + ".json", JSON.stringify(rec), {
      access: "public", contentType: "application/json", addRandomSuffix: true,
    });
    try {
      const { blobs } = await list({ prefix: ORDTRK_PREFIX + m + "-" });
      blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      for (const b of blobs.slice(KEEP)) await del(b.url);
    } catch { /* best-effort cleanup — never fail the upload over it */ }
    return res.json({ ok: true, m, n: rec.meta.n, add: Object.keys(ord).length, url: blob.url });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
