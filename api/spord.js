import { put, list, del } from "@vercel/blob";
import { verify, bearer } from "../lib/auth.js";
import { newestReal, looksEmpty } from "../lib/snapshot.js";

/* ============================================================================
 * 📦 ออเดอร์พิเศษ — เซลล์ / ทีมคลัง / ทีมสายส่ง เขียน "ทีละช่องเดียว"
 * (เจ้าของสั่ง 18 พ.ย. 69 · โฟลว 6 ขั้น 4 ทีม)
 *
 *   act:"add"  -> CSTOCK.sub["sid|NO"]       เซลล์กรอกเลขออเดอร์ย่อยของสายตัวเอง
 *   act:"del"  -> CSTOCK.subdel["sid|NO"]    เซลล์ลบเลขที่กรอกผิด (ลบได้ก่อนแอดมินตรวจ)
 *   act:"step" -> CSTOCK.sub["sid|NO"].sN    ติ๊กยืนยันขั้นของตัวเอง
 *
 * ย่อเหลือ 2 ขั้น 25 พ.ย. 69 (*"เป็นแค่ฝั่งเซลล์และฝั่งแอดมินทำงานร่วมกัน 2 ขั้นตอนก็พอ"*):
 *   act:"key"  -> CSTOCK.key["sid|YYYY-MM-DD|CT11"]  หัวหน้าเซลล์กรอกจำนวนที่เซลล์คีย์รายวัน
 *   act:"gin"  -> CSTOCK.gin["sid|YYYY-MM-DD"]       แอดมินบันทึกผลตรวจจากไฟล์ allocation
 * สิทธิ์: key = sup/manager · gin = manager — *"แก้ไขได้เฉพาะในส่วนของตัวเอง … เมเนเจอร์ดูและแก้ได้ทั้งหมด"*
 * ⚠️ สองฝั่งเขียนคนละคีย์ จึงทับกันไม่ได้แม้เปิดค้างคนละแท็บ (หลักเดียวกับ mergeExOne)
 * ⚠️ rows ของ act:"gin" คือยอดที่สรุปจากไฟล์ allocation **เฉพาะรหัสในใบนั้น** — เซิร์ฟเวอร์
 *    จำกัดจำนวนแถวไว้ ไม่งั้นไฟล์ 10,428 แถวจะถูกยัดเข้า snapshot ทั้งก้อน
 *
 * สิทธิ์ต่อขั้น — ตรวจที่เซิร์ฟเวอร์ ไม่ได้พึ่งการซ่อนปุ่มบนหน้าเว็บ:
 *   s3 ตรวจใบจัดของ = manager · s4 จัดของ = wh · s5 ส่งของ = ds · s6 ปิดงาน = manager
 *
 * ⚠️ ทีมคลัง/สายส่งเป็น role ใหม่ที่ "ส่ง state ทั้งก้อนไม่ได้เลย" (api/save.js รับแต่ manager)
 *    ทุกการติ๊กจึงต้องผ่านที่นี่ และเขียนลงคีย์เดียวเท่านั้น มือถือ 3 เครื่องติ๊กพร้อมกัน
 *    ก็ทับกันไม่ได้ เพราะ mergeState รวมทีละขั้นด้วย mergeSubOne
 * ⚠️ ยกเลิกติ๊กเขียน ok:0 ทับ ไม่ใช่ลบคีย์ทิ้ง — การลบคีย์จะถูก union ฝั่งเซิร์ฟเวอร์เอากลับมา
 *    (บทเรียนเดียวกับ api/pjpvisit.js ที่เก็บการลบเป็น v:0)
 * ⚠️ เดินตาม lib/snapshot.js เหมือน api/save.js / request / plan / leadstatus:
 *    อ่าน snapshot จริงล่าสุด ถ้าอ่านไม่ได้เลยให้ตอบ 503 แล้ว **ไม่เขียนอะไรทั้งนั้น**
 *    ห้ามมี branch "ถอยไปใช้ seed" บนทางเขียนเด็ดขาด
 * ==========================================================================*/

const S = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
// เลขออเดอร์ของแอพ dcode เช่น BDD0100000006 — ตัวอักษร/ตัวเลข/ขีด เท่านั้น เก็บเป็นตัวพิมพ์ใหญ่
const NO = (v) => {
  const t = S(v, 40).toUpperCase().replace(/\s+/g, "");
  return /^[A-Z0-9][A-Z0-9._-]{2,39}$/.test(t) ? t : "";
};
const SID = (v) => (/^[A-Za-z0-9_-]{1,60}$/.test(String(v || "")) ? String(v) : "");
const YMD = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "");
const LN = (v) => { const t = S(v, 20).toUpperCase(); return /^[A-Z0-9_]{2,20}$/.test(t) ? t : ""; };
const CODE = (v) => { const t = S(v, 20).toUpperCase(); return /^[A-Z0-9][A-Z0-9._-]{0,19}$/.test(t) ? t : ""; };
const Q = (v) => { const n = Number(v); return isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0; };
const MAX_ROWS = 4000;   // ใบหนึ่งวันหนึ่ง: สาย x รหัสในใบ — จริง ๆ หลักร้อย เผื่อไว้กันบวม
// ขั้นไหน ใครติ๊กได้
const STEP_ROLE = { s3: "manager", s4: "wh", s5: "ds", s6: "manager" };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  const claims = verify(bearer(req));
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า Blob storage" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body) return res.status(400).json({ error: "ไม่มีข้อมูลที่จะบันทึก" });

  const act = String(body.act || "");
  if (["add", "del", "step", "key", "gin"].indexOf(act) < 0) return res.status(400).json({ error: "คำสั่งไม่ถูกต้อง" });

  const sid = SID(body.sid);
  if (!sid) return res.status(400).json({ error: "ไม่ได้ระบุใบออเดอร์ใหญ่" });
  const twoStep = act === "key" || act === "gin";
  const no = twoStep ? "" : NO(body.no);
  if (!twoStep && !no) return res.status(400).json({ error: "เลขออเดอร์ไม่ถูกต้อง (ใส่เลขออเดอร์จากแอพ เช่น BDD0100000123)" });
  const ymd = twoStep ? YMD(body.d) : "";
  if (twoStep && !ymd) return res.status(400).json({ error: "ไม่ได้ระบุวันที่" });
  const key = twoStep ? (act === "key" ? sid + "|" + ymd + "|" + LN(body.ln) : sid + "|" + ymd)
                      : sid + "|" + no;

  const role = claims.role || "";
  const isMgr = role === "manager";
  const mine = claims.code || "";
  const who = S(claims.name, 60);
  const uid = S(claims.u || claims.user || claims.sub || "", 40);

  try {
    const cur = await newestReal(list, fetch);
    if (cur.fail) return res.status(503).json({ error: "อ่านข้อมูลล่าสุดจากเซิร์ฟเวอร์ไม่ได้ ยังไม่ได้บันทึก — กรุณาลองใหม่อีกครั้ง" });
    if (cur.first || !cur.data) return res.status(409).json({ error: "ยังไม่มีข้อมูลในระบบ" });
    const data = cur.data;

    const C = data.CSTOCK || (data.CSTOCK = {});
    if (!C.slips) C.slips = {};
    if (!C.sub) C.sub = {};
    if (!C.subdel) C.subdel = {};

    const slip = C.slips[sid];
    if (!slip) return res.status(404).json({ error: "ไม่พบใบออเดอร์ใหญ่นี้ (อาจถูกลบไปแล้ว)" });
    if (C.sdel && C.sdel[sid]) return res.status(409).json({ error: "ใบออเดอร์ใหญ่นี้ถูกลบไปแล้ว" });

    if (!C.key) C.key = {};
    if (!C.gin) C.gin = {};

    const existing = C.sub[key] || null;
    const now = Date.now();

    if (act === "key" || act === "gin") {
      // ฝั่งเซลล์ = หัวหน้าเซลล์ (sup) หรือผู้จัดการ · ฝั่งแอดมิน = ผู้จัดการ (แอดมิน 1-4 เป็น role manager)
      if (act === "key" && !(role === "sup" || isMgr))
        return res.status(403).json({ error: "ฝั่งเซลล์ แก้ได้เฉพาะหัวหน้าเซลล์ (sup) กับผู้จัดการ" });
      if (act === "gin" && !isMgr)
        return res.status(403).json({ error: "ฝั่งแอดมิน แก้ได้เฉพาะแอดมิน/ผู้จัดการ" });

      if (act === "key") {
        const ln = LN(body.ln);
        if (!ln) return res.status(400).json({ error: "ไม่ได้ระบุสาย" });
        const src = body.it && typeof body.it === "object" ? body.it : {};
        const it = {};
        let n = 0;
        for (const c of Object.keys(src)) {
          const code = CODE(c);
          if (!code) continue;
          if (++n > MAX_ROWS) break;
          const v = src[c] || {};
          const row = { sc: Q(v.sc), sp: Q(v.sp), fc: Q(v.fc), fp: Q(v.fp) };
          if (row.sc || row.sp || row.fc || row.fp) it[code] = row;   // ช่องว่างทั้งแถว = ไม่ต้องเก็บ
        }
        C.key[key] = { it, by: uid || role, byName: who, at: now };
      } else {
        const gins = (Array.isArray(body.gin) ? body.gin : []).map((x) => S(x, 30)).filter(Boolean).slice(0, 50);
        const src = body.rows && typeof body.rows === "object" ? body.rows : {};
        const rows = {};
        let n = 0;
        for (const k of Object.keys(src)) {
          const p = String(k).split("|");
          const ln = LN(p[0]), code = CODE(p[1]);
          if (!ln || !code) continue;
          if (++n > MAX_ROWS) break;
          const v = src[k] || {};
          rows[ln + "|" + code] = {
            sc: Q(v.sc), ss: Q(v.ss), sp: Q(v.sp), fc: Q(v.fc), fs: Q(v.fs), fp: Q(v.fp),
            xc: Q(v.xc), xs: Q(v.xs), xp: Q(v.xp), yc: Q(v.yc), ys: Q(v.ys), yp: Q(v.yp),
            // 💵 เงินตัวจริงจากช่อง GSV/NIV ท้ายไฟล์ (ไฟล์รุ่น 36 ช่อง) · mn = จำนวนแถวที่มีเงิน
            // ไฟล์รุ่นเก่าไม่มีช่องนี้ ส่งมาเป็น 0 และ money = 0 แล้วหน้าเว็บประเมินจากไฟล์ราคาแทน
            g: Q(v.g), v: Q(v.v), mn: Q(v.mn),
            nm: S(v.nm, 120), pk: Q(v.pk),
          };
        }
        C.gin[key] = {
          // ยกเลิกผลตรวจ = เขียน del:1 ทับ ไม่ใช่ลบคีย์ (ลบแล้วแท็บเก่า union กลับมา)
          del: body.del ? 1 : 0,
          money: body.money ? 1 : 0,
          g: gins, rows,
          dd: (Array.isArray(body.dd) ? body.dd : []).map(YMD).filter(Boolean).slice(0, 60),
          // เลขออเดอร์ของ GIN นั้น — ใช้ดึง GSV/NIV จริงจากดัชนีไฟล์ยอดขาย (วันละ 3-4 GIN ~50 เลข)
          ords: (Array.isArray(body.ords) ? body.ords : []).map((x) => NO(x)).filter(Boolean).slice(0, 600),
          miss: (Array.isArray(body.miss) ? body.miss : []).map((x) => S(x, 30)).filter(Boolean).slice(0, 50),
          file: S(body.file, 160), by: uid || role, byName: who, at: now,
        };
      }
    } else if (act === "add") {
      // เซลล์กรอกเลขของ "สายตัวเอง" เท่านั้น · ผู้จัดการ/แอดมินกรอกแทนได้ทุกสาย
      if (!isMgr && role !== "sales") return res.status(403).json({ error: "บัญชีนี้กรอกเลขออเดอร์ไม่ได้" });
      if (!isMgr && !mine) return res.status(400).json({ error: "บัญชีนี้ไม่มีรหัสสาย" });
      const ln = isMgr ? (S(body.ln, 20) || mine || "") : mine;
      if (!ln) return res.status(400).json({ error: "ไม่ได้ระบุสาย" });
      if (existing) {
        if (!isMgr && existing.ln !== mine) return res.status(403).json({ error: "เลขนี้เป็นของสายอื่นแล้ว" });
        // กรอกซ้ำ = ไม่ต้องทำอะไร แต่ยกเลิก tombstone ให้ (เผลอลบแล้วกรอกใหม่)
        existing.up = now;
      } else {
        C.sub[key] = { sid, no, ln, by: uid || ln, byName: who, at: now, up: now };
      }
      delete C.subdel[key];
    } else if (act === "del") {
      if (!existing) return res.status(404).json({ error: "ไม่พบเลขออเดอร์นี้" });
      if (!isMgr && existing.ln !== mine) return res.status(403).json({ error: "ลบได้เฉพาะเลขของสายตัวเอง" });
      // ของที่แอดมินตรวจแล้ว หรือคลัง/สายส่งเดินงานไปแล้ว เซลล์ลบเองไม่ได้
      const started = ["s3", "s4", "s5", "s6"].some((k) => existing[k] && existing[k].ok);
      if (started && !isMgr) return res.status(409).json({ error: "ออเดอร์นี้เริ่มเดินงานแล้ว ลบเองไม่ได้ — แจ้งแอดมิน" });
      delete C.sub[key];
      C.subdel[key] = now;
    } else {
      const st = String(body.step || "");
      if (!STEP_ROLE[st]) return res.status(400).json({ error: "ขั้นตอนไม่ถูกต้อง" });
      if (STEP_ROLE[st] !== role) return res.status(403).json({ error: "บัญชีนี้ไม่มีสิทธิ์ติ๊กขั้นตอนนี้" });
      if (!existing) return res.status(404).json({ error: "ไม่พบเลขออเดอร์นี้" });
      const rec = { ok: body.v ? 1 : 0, by: uid || role, byName: who, at: now };
      const tx = S(body.tx, 400);
      if (tx) rec.tx = tx;                       // โน๊ตของแอดมิน (ขั้น 3) / ที่ไปของสินค้า (ขั้น 6)
      if (st === "s6") {
        const left = Number(body.left);
        if (isFinite(left) && left >= 0) rec.left = Math.round(left * 100) / 100;   // ที่ยังค้างในคลัง
      }
      existing[st] = rec;
      existing.up = now;
    }

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

    return res.status(200).json({ ok: true, url: blob.url, key });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
