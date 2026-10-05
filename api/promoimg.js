import { put } from "@vercel/blob";
import { verify, bearer } from "../lib/auth.js";
import { PROMOIMG_PREFIX } from "../lib/snapshot.js";

/* ============================================================================
 * PROMOTION SLIDE UPLOAD (manager only)
 *
 * Unilever sends the monthly promotion deck as images. The manager attaches each
 * slide to its promotion so the sales team reads the real slide, not a retyped
 * summary. The image is stored as its OWN blob under `bd-promoimg-*` and only its
 * URL goes into the saved state.
 *
 * DATA-SAFETY RULE: this endpoint never reads, merges or writes the main snapshot
 * (`bd-data-*`). It cannot roll the sales data back, and uploading slides can never
 * push the 8 rolling backups out — exactly the separation api/apply.js uses for shop
 * photos. The URL it returns is written into PROMO.items[id].img by an ordinary
 * manager save (api/save.js + mergeState).
 *
 * The prefix must NOT start with "bd-promo" alone or anything that prefix-matches
 * another listing — see lib/snapshot.js.
 * ==========================================================================*/

// The browser shrinks the slide to ~1600px JPEG before sending (promoShrink in the
// dashboard), so anything much bigger than this is not a shrunk slide — refuse it
// rather than blow Vercel's ~4.5MB request cap.
const MAX_B64 = 3_000_000;              // ~2.2 MB of image
const TYPES = { jpeg: "image/jpeg", jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  const claims = verify(bearer(req));
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  if (claims.role !== "manager") return res.status(403).json({ error: "เฉพาะผู้จัดการเท่านั้น" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า Blob storage" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || !body.img) return res.status(400).json({ error: "ไม่มีไฟล์รูป" });

  const p = String(body.img);
  if (p.length > MAX_B64) return res.status(413).json({ error: "รูปใหญ่เกินไป — ลองย่อรูปก่อนอัพ" });
  const m = p.match(/^data:image\/(jpeg|jpg|png|webp);base64,([A-Za-z0-9+/=\s]+)$/);
  if (!m) return res.status(400).json({ error: "ไฟล์รูปไม่ถูกต้อง (รองรับ jpg / png / webp)" });

  let buf;
  try { buf = Buffer.from(m[2], "base64"); }
  catch { return res.status(400).json({ error: "อ่านไฟล์รูปไม่สำเร็จ" }); }
  if (!buf.length) return res.status(400).json({ error: "ไฟล์รูปว่างเปล่า" });

  const type = TYPES[m[1]];
  const ext = type === "image/png" ? "png" : type === "image/webp" ? "webp" : "jpg";

  try {
    const blob = await put(PROMOIMG_PREFIX + Date.now() + "." + ext, buf, {
      access: "public", contentType: type, addRandomSuffix: true,
    });
    res.json({ ok: true, url: blob.url });
  } catch (e) {
    res.status(500).json({ error: "อัพรูปไม่สำเร็จ: " + String(e && e.message ? e.message : e) });
  }
}
