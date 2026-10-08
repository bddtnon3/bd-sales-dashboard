import { put, list, del } from "@vercel/blob";
import { verify, bearer } from "../lib/auth.js";
import { newestReal, looksEmpty } from "../lib/snapshot.js";

/* ============================================================================
 * PJP VISIT RECORD — a salesperson records one visit to one shop on one day.
 *
 * The manager saves PJP through api/save.js like every other section. A
 * salesperson must NOT be able to send a whole state, so this endpoint exists:
 * it writes exactly ONE key per call —
 *
 *   PJP.done["<outlet>|<YYYY-MM-DD>"] = { v, by, at, tx?, f? }
 *
 * tx is the rep's note for that visit and f the things to chase next time
 * (keys of PJ_FLAG in the client). They live on the SAME record as the tick
 * on purpose: PJP.done already merges newest-wins per key in api/save.js, so
 * adding fields cannot drop anything, and an old browser tab that knows
 * nothing about tx/f still reads .v exactly as before.
 *
 * and only for a shop that is on THAT salesperson's own route on THAT day,
 * which is checked against the stored plan, not against anything in the body.
 * Unticking is stored as v:0, never a deleted key: the server-side merge is a
 * union, so a removed key would simply come back from another tab.
 *
 * Same data-safety walk as api/save.js, api/request.js, api/plan.js and
 * api/leadstatus.js: read the newest REAL snapshot, and if the store holds
 * blobs but none can be read, answer 503 and write NOTHING rather than publish
 * a state that was not built on the real one. Never fall back to the seed on a
 * write path — that is how the July seed nearly got republished once already.
 * ==========================================================================*/

const S = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
const ISO = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "");
const CODE = (v) => (/^\d{4,12}$/.test(String(v || "")) ? String(v) : "");
/* เรื่องที่ต้องตามต่อ — ยอมรับแค่คีย์ที่รู้จัก ไม่ใช่ข้อความอิสระ (ตรงกับ PJ_FLAG ฝั่งหน้าเว็บ) */
const FLAGS = ["sell", "eb", "ps", "pay", "stock", "fix"];
const NOTE = (v) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ").trim().slice(0, 500);
const FLAGSOF = (v) => {
  const out = [], seen = {};
  (Array.isArray(v) ? v : []).forEach((k) => {
    const s = String(k || "");
    if (FLAGS.indexOf(s) >= 0 && !seen[s]) { seen[s] = 1; out.push(s); }
  });
  return out;
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  const claims = verify(bearer(req));
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า Blob storage" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body) return res.status(400).json({ error: "ไม่มีข้อมูลที่จะบันทึก" });

  const code = CODE(body.code);
  const date = ISO(body.date);
  if (!code) return res.status(400).json({ error: "รหัสร้านไม่ถูกต้อง" });
  if (!date) return res.status(400).json({ error: "วันที่ไม่ถูกต้อง" });

  const isMgr = claims.role === "manager";
  const mine = claims.code || "";
  if (!isMgr && !mine) return res.status(400).json({ error: "บัญชีนี้ไม่มีรหัสสาย" });

  try {
    const cur = await newestReal(list, fetch);
    if (cur.fail) return res.status(503).json({ error: "อ่านข้อมูลล่าสุดจากเซิร์ฟเวอร์ไม่ได้ ยังไม่ได้บันทึก — กรุณาลองใหม่อีกครั้ง" });
    if (cur.first || !cur.data) return res.status(409).json({ error: "ยังไม่มีข้อมูลในระบบ" });
    const data = cur.data;

    const P = data.PJP || (data.PJP = {});
    if (!P.out) P.out = {};
    if (!P.plan) P.plan = {};
    if (!P.done) P.done = {};
    if (!P.cfg) P.cfg = {};

    // The shop must actually be on this salesperson's plan for this day.
    // A manager may tick anything, so they can fix a rep's list for them.
    if (!isMgr) {
      const day = P.plan[date] || {};
      const row = String(day[mine] || "");
      const on = row.split(",").some((x) => x.split(":")[0] === code);
      if (!on) return res.status(403).json({ error: "ร้านนี้ไม่ได้อยู่ในแผนของสายคุณในวันนั้น" });
    }

    const rec = { v: body.v ? 1 : 0, by: S(claims.name, 60), at: Date.now() };
    const tx = NOTE(body.tx), f = FLAGSOF(body.f);
    if (tx) rec.tx = tx;
    if (f.length) rec.f = f;
    P.done[code + "|" + date] = rec;

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
