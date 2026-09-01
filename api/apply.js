import { put } from "@vercel/blob";
import { LEAD_PREFIX, LEADIMG_PREFIX } from "../lib/snapshot.js";

/* ============================================================================
 * PUBLIC shop-application endpoint (no login) — /join.html posts here.
 *
 * DATA-SAFETY RULE: this endpoint is reachable by anyone with the link, so it
 * MUST NOT read, merge or write the main snapshot (`bd-data-*`). Each
 * application is written as its own tiny blob under a SEPARATE prefix
 * (`bd-lead-*`), and the shop-front photo under `bd-leadimg-*`. Nothing here can
 * roll back, overwrite or evict the sales data, and a flood of applications can
 * never push the 8 rolling backups out.
 * The manager side reads these through api/leads.js.
 * ==========================================================================*/

const S = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
const digits = (v) => String(v || "").replace(/\D/g, "");
const num = (v) => (typeof v === "number" && isFinite(v)) ? v : (isFinite(parseFloat(v)) ? parseFloat(v) : null);

// The browser shrinks the photo before sending (see join.html), so anything much
// bigger than this is not a phone photo — refuse rather than blow the request cap.
const MAX_PHOTO_B64 = 3_000_000;      // ~2.2 MB of image
const PHOTO_TYPES = { jpeg: "image/jpeg", jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export const config = { api: { bodyParser: { sizeLimit: "6mb" } } };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  res.setHeader("Cache-Control", "no-store");

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body !== "object") return res.status(400).json({ error: "ข้อมูลไม่ถูกต้อง" });

  // --- cheap bot filters (a real person cannot trip these) ---
  // honeypot: a hidden field only a form-filling bot completes
  if (S(body.website, 50)) return res.json({ ok: true });          // silently accept, store nothing
  // a human takes longer than 2.5s to fill the form
  if (!(Number(body.ms) >= 2500)) return res.status(400).json({ error: "ส่งเร็วเกินไป กรุณาลองใหม่" });

  const first = S(body.first, 60), last = S(body.last, 60);
  const phone = digits(body.phone);
  const shopname = S(body.shopname, 120), shop = S(body.shop, 400);
  const amphoe = S(body.amphoe, 60), tambon = S(body.tambon, 60), type = S(body.type, 60);
  const loc = S(body.loc, 300);

  if (!first || !last) return res.status(400).json({ error: "กรุณากรอกชื่อและนามสกุล" });
  if (!/^0\d{8,9}$/.test(phone)) return res.status(400).json({ error: "เบอร์ติดต่อไม่ถูกต้อง" });
  if (shopname.length < 2) return res.status(400).json({ error: "กรุณากรอกชื่อร้านค้า" });
  if (shop.length < 6) return res.status(400).json({ error: "กรุณากรอกที่ตั้งร้าน" });
  if (!amphoe || !tambon) return res.status(400).json({ error: "กรุณาระบุอำเภอและตำบล" });
  if (!type) return res.status(400).json({ error: "กรุณาเลือกประเภทร้านค้า" });
  if (!loc) return res.status(400).json({ error: "กรุณาใส่พิกัดหรือลิงก์แผนที่ของร้าน" });
  if (body.tax !== true && body.tax !== false) return res.status(400).json({ error: "กรุณาเลือกว่าต้องการใบกำกับภาษีหรือไม่" });
  if (body.star !== true && body.star !== false) return res.status(400).json({ error: "กรุณาเลือกว่าสนใจร้านติดดาวหรือไม่" });

  // shop-front photo, sent as a data: URL
  let photoBuf = null, photoType = null;
  if (body.photo) {
    const p = String(body.photo);
    if (p.length > MAX_PHOTO_B64) return res.status(413).json({ error: "รูปใหญ่เกินไป กรุณาถ่ายใหม่หรือเลือกรูปที่เล็กลง" });
    const m = p.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/);
    if (!m) return res.status(400).json({ error: "ไฟล์รูปไม่ถูกต้อง กรุณาแนบรูปถ่ายหน้าร้านใหม่" });
    try {
      photoBuf = Buffer.from(m[2], "base64");
      photoType = PHOTO_TYPES[m[1]];
    } catch { return res.status(400).json({ error: "อ่านไฟล์รูปไม่สำเร็จ" }); }
    if (!photoBuf.length) return res.status(400).json({ error: "ไฟล์รูปว่างเปล่า" });
  } else {
    return res.status(400).json({ error: "กรุณาแนบรูปถ่ายหน้าร้าน" });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: "ระบบยังไม่พร้อมรับใบสมัคร" });

  const now = Date.now();
  const id = "L" + now.toString(36) + Math.random().toString(36).slice(2, 7);
  const lat = num(body.lat), lng = num(body.lng);

  const lead = {
    id, at: now,
    first, last, phone,
    shopname, shop, amphoe, tambon, type,
    loc,
    lat: (lat !== null && lat >= -90 && lat <= 90) ? lat : null,
    lng: (lng !== null && lng >= -180 && lng <= 180) ? lng : null,
    tax: !!body.tax, star: !!body.star,
    note: S(body.note, 300),
    photo: null,
  };

  try {
    // photo first: a lead is only worth storing once its picture is safely up
    const ext = photoType === "image/png" ? "png" : photoType === "image/webp" ? "webp" : "jpg";
    const img = await put(LEADIMG_PREFIX + now + "-" + id + "." + ext, photoBuf, {
      access: "public", contentType: photoType, addRandomSuffix: true,
    });
    lead.photo = img.url;

    await put(LEAD_PREFIX + now + "-" + id + ".json", JSON.stringify(lead), {
      access: "public", contentType: "application/json", addRandomSuffix: true,
    });
    return res.json({ ok: true, id });
  } catch (e) {
    return res.status(500).json({ error: "บันทึกใบสมัครไม่สำเร็จ" });
  }
}
