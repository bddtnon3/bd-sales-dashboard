import { put, list, del } from "@vercel/blob";
import { verify, bearer } from "../lib/auth.js";
import { newestReal, looksEmpty } from "../lib/snapshot.js";

/* ============================================================================
 * A salesperson reports progress on a NEW SHOP the manager assigned to them.
 *
 * Writes exactly one key — LEADS.sales[leadId] — and only for a lead whose
 * LEADS.meta[leadId].line matches the caller's own line. The manager's half
 * (LEADS.meta) is never touched here, so the two sides cannot overwrite each
 * other. Same data-safety walk as api/save.js and api/request.js: read the newest
 * REAL snapshot, and if the store holds blobs but none can be read, answer 503 and
 * write nothing rather than publish a state that was not built on the real one.
 * ==========================================================================*/

const STATES = ["todo", "contacted", "visited", "opened", "reject"];
const S = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  const claims = verify(bearer(req));
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า Blob storage" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || !body.id) return res.status(400).json({ error: "ไม่มีข้อมูลที่จะบันทึก" });

  const id = S(body.id, 40);
  const st = STATES.indexOf(String(body.st)) >= 0 ? String(body.st) : null;
  if (!st) return res.status(400).json({ error: "สถานะไม่ถูกต้อง" });
  const note = S(body.note, 300);
  const store = S(body.store, 20).replace(/\s/g, "");

  // A manager may also report progress (they can act as the line owner); a salesperson
  // may only touch a lead assigned to their own line.
  const mine = claims.code || null;
  if (claims.role !== "manager" && !mine) return res.status(400).json({ error: "บัญชีนี้ไม่มีรหัสสาย" });

  try {
    const cur = await newestReal(list, fetch);
    if (cur.fail) return res.status(503).json({ error: "อ่านข้อมูลล่าสุดจากเซิร์ฟเวอร์ไม่ได้ ยังไม่ได้บันทึก — กรุณาลองใหม่อีกครั้ง" });
    if (cur.first || !cur.data) return res.status(409).json({ error: "ยังไม่มีข้อมูลในระบบ" });
    const data = cur.data;

    const L = data.LEADS || (data.LEADS = {});
    if (!L.meta) L.meta = {};
    if (!L.sales) L.sales = {};

    const assigned = (L.meta[id] || {}).line || "";
    if (!assigned) return res.status(404).json({ error: "ร้านนี้ยังไม่ได้ถูกมอบหมายให้สายไหน" });
    if (claims.role !== "manager" && assigned !== mine) {
      return res.status(403).json({ error: "ร้านนี้ไม่ได้อยู่ในสายของคุณ" });
    }
    if ((data.LEADS.del || {})[id]) return res.status(404).json({ error: "ใบสมัครนี้ถูกซ่อนไปแล้ว" });

    L.sales[id] = { st, note, store, at: Date.now(), by: claims.name || mine || "manager", line: assigned };

    if (looksEmpty(data)) return res.status(409).json({ error: "ข้อมูลว่างเปล่า — ยกเลิกการบันทึกเพื่อป้องกันข้อมูลเดิมหาย" });

    const blob = await put("bd-data-" + Date.now() + ".json", JSON.stringify(data), {
      access: "public", contentType: "application/json", addRandomSuffix: true,
    });
    try {
      const KEEP = 8;
      const { blobs } = await list({ prefix: "bd-data-" });
      blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      for (const b of blobs.slice(KEEP)) await del(b.url);
    } catch { /* best-effort cleanup */ }

    res.json({ ok: true, url: blob.url });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
