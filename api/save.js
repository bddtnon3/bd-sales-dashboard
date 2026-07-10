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
    const json = JSON.stringify({ DATA: body.DATA, STORE: body.STORE || { months: [], stores: [] }, KPI: body.KPI || { months: [], lines: {}, data: {}, workdays: 26 }, ORDERS: body.ORDERS || { dates: [], data: {}, names: {} }, STOCKD: body.STOCKD || { date: null, rows: [], names: {} }, REQUESTS: body.REQUESTS || { data: {} }, MASTER: body.MASTER || { items: {} }, ANALYTICS: body.ANALYTICS || { months: [], lines: {}, data: {} }, STOREPROD: body.STOREPROD || { months: [], cat: {}, stores: {}, data: {} }, STOREDAILY: body.STOREDAILY || { data: {} }, savedAt: Date.now() });
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
