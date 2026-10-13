import { put, list, del } from "@vercel/blob";
import { gunzipSync } from "node:zlib";
import { verify, bearer } from "../lib/auth.js";
import { PRICEHS_PREFIX, PRICEBUM_PREFIX, newestUnder } from "../lib/snapshot.js";

/* ============================================================================
 * MONTHLY PRICE FILES — upload (manager) and read (any logged-in user)
 *
 * Two files arrive from Unilever every month and the manager uploads both:
 *   kind:"hs"   หัวเสือ  — the price the depot QUOTES CUSTOMERS (NTT / Floor / RSP)
 *   kind:"bum"  BUM      — the depot's own COST (Cat Fee, S%, what it actually pays)
 *
 * ⚠️ THEY GO TO SEPARATE BLOBS ON PURPOSE. The owner's hard rule is that a customer
 * must never see BUM. public/pricelist.html reads api/pricelist.js, which only ever
 * lists bd-pricehs-* — so the cost file is not reachable from the public page, not
 * merely hidden on it. Do NOT "simplify" this into one blob with a flag.
 *
 * DATA-SAFETY RULES (same as api/promoimg.js and api/apply.js):
 *  · never reads, merges or writes the main snapshot bd-data-* — uploading prices
 *    cannot roll the sales data back, and cannot evict its 8 rolling backups
 *  · a new upload REPLACES that month's file rather than merging into it: a price
 *    list is a complete monthly document, and a half-merged price list would quote
 *    a customer last month's price for an item this month's file dropped. Old
 *    uploads are kept as blobs (KEEP of them) so a bad upload can be rolled back
 *  · an empty parse is refused (409) so a failed client-side parse cannot blank the
 *    catalogue, exactly like api/save.js refuses an empty state
 *
 * The payload is gzipped by the browser (~0.6 MB raw, ~0.08 MB gzipped) using the
 * same scheme as api/save.js: header x-body-gzip:1 and content-type
 * application/octet-stream. Do NOT set Content-Encoding: gzip — the edge would
 * auto-decompress and the server would double-read.
 * ==========================================================================*/

const KEEP = 6;                       // rolling copies per kind, enough to undo a bad upload
const MAX_BODY = 4_000_000;           // Vercel caps the request at ~4.5MB
const KINDS = {
  hs: { prefix: PRICEHS_PREFIX, min: 50 },
  bum: { prefix: PRICEBUM_PREFIX, min: 50 },
};

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

/* How many priced items a payload really holds — the emptiness guard. */
function itemCount(d) {
  return d && d.items && typeof d.items === "object" ? Object.keys(d.items).length : 0;
}

export default async function handler(req, res) {
  const claims = verify(bearer(req));
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า Blob storage" });

  /* ---------- READ: any logged-in user; the sales team needs the quote prices ---------- */
  if (req.method === "GET") {
    try {
      const wantBum = claims.role === "manager";          // cost is manager-only, even in-app
      const hs = await newestUnder(PRICEHS_PREFIX, list, fetch);
      const bum = wantBum ? await newestUnder(PRICEBUM_PREFIX, list, fetch) : { first: true };
      if (hs.fail || bum.fail) {
        return res.status(503).json({ error: "อ่านไฟล์ราคาจากเซิร์ฟเวอร์ไม่ได้ — ลองใหม่อีกครั้ง" });
      }
      return res.json({ hs: hs.data || null, bum: bum.data || null });
    } catch (e) {
      return res.status(500).json({ error: String((e && e.message) || e) });
    }
  }

  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  if (claims.role !== "manager") return res.status(403).json({ error: "เฉพาะผู้จัดการเท่านั้น" });

  /* ---------- WRITE ---------- */
  let body;
  try {
    const raw = await readBody(req);
    const txt = req.headers["x-body-gzip"] === "1" ? gunzipSync(raw).toString("utf8") : raw.toString("utf8");
    body = JSON.parse(txt);
  } catch (e) {
    const m = String((e && e.message) || e);
    return res.status(m.includes("too large") ? 413 : 400).json({
      error: m.includes("too large") ? "ไฟล์ใหญ่เกินไป" : "อ่านข้อมูลที่ส่งมาไม่ได้",
    });
  }
  if (!body) return res.status(400).json({ error: "ไม่มีข้อมูลที่จะบันทึก" });

  const kind = String(body.kind || "");
  const spec = KINDS[kind];
  if (!spec) return res.status(400).json({ error: "ไม่รู้ว่าเป็นไฟล์ชนิดไหน (hs / bum)" });

  const n = itemCount(body);
  if (n < spec.min) {
    return res.status(409).json({
      error: "อ่านสินค้าได้แค่ " + n + " รายการ — น้อยเกินกว่าจะเป็นไฟล์ราคาจริง ยกเลิกเพื่อไม่ให้ราคาเดิมหาย",
    });
  }

  const rec = {
    kind,
    items: body.items,
    rounds: Array.isArray(body.rounds) ? body.rounds : [],
    mon: String(body.mon || ""),
    prev: String(body.prev || ""),
    rate: body.rate && typeof body.rate === "object" ? body.rate : {},
    file: String(body.file || "").slice(0, 200),
    n,
    by: String(claims.name || "").slice(0, 60),
    up: Date.now(),
  };

  try {
    const blob = await put(spec.prefix + Date.now() + ".json", JSON.stringify(rec), {
      access: "public", contentType: "application/json", addRandomSuffix: true,
    });
    try {
      const { blobs } = await list({ prefix: spec.prefix });
      blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      for (const b of blobs.slice(KEEP)) await del(b.url);
    } catch { /* best-effort cleanup — never fail the upload over it */ }
    res.json({ ok: true, kind, n, url: blob.url });
  } catch (e) {
    res.status(500).json({ error: String((e && e.message) || e) });
  }
}
