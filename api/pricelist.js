import { list } from "@vercel/blob";
import { PRICEHS_PREFIX, newestUnder } from "../lib/snapshot.js";

/* ============================================================================
 * PUBLIC PRICE CATALOGUE — read-only, no login
 *
 * Serves public/pricelist.html, the link the manager sends to shop customers.
 *
 * ⚠️⚠️ THE ONE RULE THIS FILE EXISTS TO ENFORCE ⚠️⚠️
 * It lists ONLY `PRICEHS_PREFIX` (bd-pricehs-*), the หัวเสือ quote-price file.
 * The depot's cost file lives under a DIFFERENT prefix (bd-pricebum-*) and is
 * therefore not reachable from here at all — not hidden, not filtered out,
 * NOT REACHABLE. The owner's instruction was explicit and repeated:
 *   *"ชีทที่ลูกค้าเห็นจะมีแค่หัวเสือเท่านั้น ชีท Bum จะไม่ให้ลูกค้าเห็นเด็ดขาด สำคัญมาก ห้ามลืม"*
 * Never add PRICEBUM_PREFIX, the main snapshot, or a "kind" parameter to this file.
 * If a customer-facing page ever needs another field, add it to the hs payload —
 * do not widen what this endpoint can read.
 *
 * It is also strictly READ-ONLY: no POST, no put(), no del(). A public endpoint that
 * can write is how api/apply.js nearly republished the July seed (see lib/snapshot.js).
 * ==========================================================================*/

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "method not allowed" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า" });

  try {
    const hs = await newestUnder(PRICEHS_PREFIX, list, fetch);
    if (hs.fail) return res.status(503).json({ error: "อ่านรายการราคาไม่ได้ — ลองรีเฟรชอีกครั้ง" });
    if (hs.first || !hs.data) return res.json({ items: {}, rounds: [], up: 0, empty: true });

    const d = hs.data;
    /* Re-build the response field by field instead of spreading the stored record.
       An allow-list means a field accidentally added to the stored payload later
       cannot leak to customers just because it was saved. */
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300");
    res.json({
      items: d.items || {},
      rounds: Array.isArray(d.rounds) ? d.rounds : [],
      up: d.up || 0,
      n: d.n || Object.keys(d.items || {}).length,
    });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
