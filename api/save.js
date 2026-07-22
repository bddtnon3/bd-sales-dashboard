import { put, list, del } from "@vercel/blob";
import { gunzipSync } from "zlib";
import { verify, bearer } from "../lib/auth.js";

// Accept a gzipped raw body (sent when the state is large, to stay under the
// serverless request-size limit). Read the raw stream and inflate.
async function readGzipBody(req) {
  let buf = req.body;
  if (!Buffer.isBuffer(buf)) {
    const chunks = [];
    for await (const c of req) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
    buf = Buffer.concat(chunks);
  }
  return JSON.parse(gunzipSync(buf).toString("utf8"));
}

// Read the newest real snapshot currently in Blob (used to preserve sales requests).
async function currentBlobData() {
  try {
    const { blobs } = await list({ prefix: "bd-data-" });
    if (!blobs.length) return null;
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    for (const b of blobs) {
      try { const r = await fetch(b.url, { cache: "no-store" }); if (!r.ok) continue; const d = await r.json(); if (d && d.DATA) return d; } catch { /* try older */ }
    }
  } catch { /* ignore */ }
  return null;
}

// Sales product requests are written by /api/request (sales) — a manager save must
// NOT clobber them. Merge both sides, keeping the newest entry per (date, line).
function mergeRequests(a, b) {
  const out = { data: {} };
  [a && a.data, b && b.data].forEach((dd) => {
    if (!dd) return;
    for (const date in dd) {
      out.data[date] = out.data[date] || {};
      for (const line in dd[date]) {
        const e = dd[date][line], ex = out.data[date][line];
        if (!ex || (e && (e.at || 0) > (ex.at || 0))) out.data[date][line] = e;
      }
    }
  });
  return out;
}

/* ============================================================================
 * SERVER-SIDE MERGE — the core data-safety guarantee.
 * We NEVER overwrite the server state with the client's whole state. Instead we
 * merge the incoming payload INTO the current server state, key by key:
 *   - keyed maps (by date / month / line / store): union, client wins its own keys,
 *     keys the client doesn't have are kept from the server (so nothing disappears).
 *   - snapshots (stock / by-store / master): keep the fresher/bigger one, so a stale
 *     client can never roll data back to an older version.
 * Result: uploading/editing one section can never erase another section, and an
 * out-of-date browser can never wipe newer data uploaded by someone else.
 * ==========================================================================*/
function keyMerge(server, client) { const out = Object.assign({}, server || {}); const c = client || {}; for (const k in c) out[k] = c[k]; return out; }
function unionArr(a, b) { const o = [], seen = {}; [...(a || []), ...(b || [])].forEach((x) => { if (!seen[x]) { seen[x] = 1; o.push(x); } }); return o.sort(); }
function stockScore(x) { if (!x) return -1; const up = x.up || 0; const d = x.date ? Number(String(x.date).replace(/-/g, "")) : 0; return up * 1e9 + d; }
function pickNewerStock(a, b) { const ra = ((a && a.rows) || []).length, rb = ((b && b.rows) || []).length; if (!rb) return a || { date: null, rows: [], names: {} }; if (!ra) return b; return stockScore(b) >= stockScore(a) ? b : a; }
function pickBiggerStore(a, b) { const am = ((a && a.months) || []).length, bm = ((b && b.months) || []).length; if (bm > am) return b; if (am > bm) return a || { months: [], stores: [] }; const as = ((a && a.stores) || []).length, bs = ((b && b.stores) || []).length; return bs >= as ? (b || { months: [], stores: [] }) : a; }
function pickBiggerMaster(a, b) { const ai = Object.keys((a && a.items) || {}).length, bi = Object.keys((b && b.items) || {}).length; return bi >= ai ? (bi ? b : (a || { items: {} })) : a; }
function mergeState(server, c) {
  const s = server || {};
  const sD = s.DATA || {}, cD = c.DATA || {};
  const DATA = {
    lines: keyMerge(sD.lines, cD.lines),
    monthly: keyMerge(sD.monthly, cD.monthly),
    daily: keyMerge(sD.daily, cD.daily),
    focus_order: (cD.focus_order && cD.focus_order.length) ? cD.focus_order : (sD.focus_order || []),
  };
  const sK = s.KPI || {}, cK = c.KPI || {};
  const KPI = { months: unionArr(sK.months, cK.months), lines: keyMerge(sK.lines, cK.lines), data: keyMerge(sK.data, cK.data), workdays: cK.workdays || sK.workdays || 26 };
  const sO = s.ORDERS || {}, cO = c.ORDERS || {};
  const ORDERS = { data: keyMerge(sO.data, cO.data), dates: unionArr(sO.dates, cO.dates), names: keyMerge(sO.names, cO.names), cat: keyMerge(sO.cat, cO.cat), catN: keyMerge(sO.catN, cO.catN) };
  const sA = s.ANALYTICS || {}, cA = c.ANALYTICS || {};
  const ANALYTICS = { months: unionArr(sA.months, cA.months), lines: keyMerge(sA.lines, cA.lines), data: keyMerge(sA.data, cA.data) };
  const sP = s.STOREPROD || {}, cP = c.STOREPROD || {};
  const STOREPROD = { months: unionArr(sP.months, cP.months), cat: keyMerge(sP.cat, cP.cat), stores: keyMerge(sP.stores, cP.stores), data: keyMerge(sP.data, cP.data) };
  const STOREDAILY = { data: keyMerge((s.STOREDAILY && s.STOREDAILY.data), (c.STOREDAILY && c.STOREDAILY.data)) };
  return {
    DATA,
    STORE: pickBiggerStore(s.STORE, c.STORE),
    KPI,
    ORDERS,
    STOCKD: pickNewerStock(s.STOCKD, c.STOCKD),
    REQUESTS: mergeRequests(s.REQUESTS, c.REQUESTS),
    MASTER: pickBiggerMaster(s.MASTER, c.MASTER),
    ANALYTICS,
    STOREPROD,
    STOREDAILY,
    savedAt: Date.now(),
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const claims = verify(bearer(req));
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  if (claims.role !== "manager") return res.status(403).json({ error: "เฉพาะแอดมิน/ผู้จัดการเท่านั้น" });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า Blob storage (ดู README ขั้นตอนสร้าง Blob store)" });
  }

  let body;
  if (req.headers["x-body-gzip"]) {
    try { body = await readGzipBody(req); } catch (e) { return res.status(400).json({ error: "อ่านข้อมูล (gzip) ไม่ได้: " + (e && e.message) }); }
  } else {
    body = req.body;
    if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  }
  if (!body || !body.DATA) return res.status(400).json({ error: "ไม่มีข้อมูลที่จะบันทึก" });

  // SAFETY: never let a blank/empty state overwrite good data. If the incoming payload
  // carries no business data at all, refuse — this is almost always a client that
  // failed to load before saving, and saving it would wipe everything.
  const m = Object.keys((body.DATA && body.DATA.monthly) || {}).length;
  const dd = Object.keys((body.DATA && body.DATA.daily) || {}).length;
  const st = ((body.STOCKD && body.STOCKD.rows) || []).length;
  const od = ((body.ORDERS && body.ORDERS.dates) || []).length;
  const kp = ((body.KPI && body.KPI.months) || []).length;
  if ((m + dd + st + od + kp) === 0) {
    return res.status(409).json({ error: "ข้อมูลว่างเปล่า — ยกเลิกการบันทึกเพื่อป้องกันข้อมูลเดิมหาย (ลองรีเฟรชแล้วโหลดข้อมูลใหม่ก่อนอัพโหลด)" });
  }

  try {
    // MERGE into the current server state instead of overwriting it — old data can't change.
    const server = await currentBlobData();
    const json = JSON.stringify(mergeState(server, body));
    const blob = await put("bd-data-" + Date.now() + ".json", json, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: true,
    });
    // Keep the last several snapshots as rolling backups (instead of only the newest).
    // A bad single save can no longer erase history — older good snapshots survive and
    // are auto-restored by api/data.js (which returns the newest NON-empty snapshot).
    try {
      const KEEP = 8;
      const { blobs } = await list({ prefix: "bd-data-" });
      blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      for (const b of blobs.slice(KEEP)) await del(b.url);
    } catch { /* cleanup best-effort */ }

    res.json({ ok: true, url: blob.url });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
