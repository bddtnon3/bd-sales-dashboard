import { put, list, del } from "@vercel/blob";
import { verify, bearer } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const claims = verify(bearer(req));
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  if (claims.role !== "manager") return res.status(403).json({ error: "เฉพาะแอดมิน/ผู้จัดการเท่านั้น" });

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า Blob storage (ดู README ขั้นตอนสร้าง Blob store)" });
  }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || !body.DATA) return res.status(400).json({ error: "ไม่มีข้อมูลที่จะบันทึก" });

  try {
    const json = JSON.stringify({ DATA: body.DATA, STORE: body.STORE || { months: [], stores: [] }, KPI: body.KPI || { months: [], lines: {}, data: {}, workdays: 26 }, ORDERS: body.ORDERS || { dates: [], data: {}, names: {} }, STOCKD: body.STOCKD || { date: null, rows: [], names: {} }, REQUESTS: body.REQUESTS || { data: {} }, MASTER: body.MASTER || { items: {} }, ANALYTICS: body.ANALYTICS || { months: [], lines: {}, data: {} }, STOREMIX: body.STOREMIX || { months: [], stores: {}, data: {} }, savedAt: Date.now() });
    const blob = await put("bd-data-" + Date.now() + ".json", json, {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: true,
    });
    // keep only the newest snapshot — only delete blobs strictly OLDER than the one
    // we just wrote, so a concurrent save can never delete a newer blob (data loss).
    try {
      const { blobs } = await list({ prefix: "bd-data-" });
      const mine = new Date(blob.uploadedAt || Date.now()).getTime();
      const olds = blobs.filter((b) => b.url !== blob.url && new Date(b.uploadedAt).getTime() < mine);
      for (const b of olds) await del(b.url);
    } catch { /* cleanup best-effort */ }

    res.json({ ok: true, url: blob.url });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
