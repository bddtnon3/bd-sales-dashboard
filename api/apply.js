import { put } from "@vercel/blob";
import { LEAD_PREFIX } from "../lib/snapshot.js";

/* ============================================================================
 * PUBLIC shop-application endpoint (no login) — /join.html posts here.
 *
 * DATA-SAFETY RULE: this endpoint is reachable by anyone with the link, so it
 * MUST NOT read, merge or write the main snapshot (`bd-data-*`). Each
 * application is written as its own tiny blob under a SEPARATE prefix
 * (`bd-lead-*`). Nothing here can roll back, overwrite or evict the sales data,
 * and a flood of applications can never push the 8 rolling backups out.
 * The manager side reads these through api/leads.js.
 * ==========================================================================*/

const S = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
const digits = (v) => String(v || "").replace(/\D/g, "");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  res.setHeader("Cache-Control", "no-store");

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== "object") return res.status(400).json({ error: "ข้อมูลไม่ถูกต้อง" });

  // --- cheap bot filters (a real person cannot trip these) ---
  // honeypot: a hidden field only a form-filling bot completes
  if (S(body.website, 50)) return res.json({ ok: true });          // silently accept, store nothing
  // a human takes longer than 2.5s to fill six fields
  if (!(Number(body.ms) >= 2500)) return res.status(400).json({ error: "ส่งเร็วเกินไป กรุณาลองใหม่" });

  const first = S(body.first, 60), last = S(body.last, 60);
  const phone = digits(body.phone), shop = S(body.shop, 400);
  const amphoe = S(body.amphoe, 60), tambon = S(body.tambon, 60), type = S(body.type, 60);

  if (!first || !last) return res.status(400).json({ error: "กรุณากรอกชื่อและนามสกุล" });
  if (!/^0\d{8,9}$/.test(phone)) return res.status(400).json({ error: "เบอร์ติดต่อไม่ถูกต้อง" });
  if (shop.length < 6) return res.status(400).json({ error: "กรุณากรอกชื่อร้านและที่ตั้ง" });
  if (!amphoe || !tambon) return res.status(400).json({ error: "กรุณาระบุอำเภอและตำบล" });
  if (!type) return res.status(400).json({ error: "กรุณาเลือกประเภทร้านค้า" });

  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: "ระบบยังไม่พร้อมรับใบสมัคร" });

  const now = Date.now();
  const lead = {
    id: "L" + now.toString(36) + Math.random().toString(36).slice(2, 7),
    at: now,
    first, last, phone, shop, amphoe, tambon, type,
    note: S(body.note, 300),
  };

  try {
    await put(LEAD_PREFIX + now + "-" + lead.id + ".json", JSON.stringify(lead), {
      access: "public", contentType: "application/json", addRandomSuffix: true,
    });
    return res.json({ ok: true, id: lead.id });
  } catch (e) {
    return res.status(500).json({ error: "บันทึกใบสมัครไม่สำเร็จ" });
  }
}
