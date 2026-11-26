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
const MAX_ROWS = 4000;
// เซลล์บันทึกได้กี่ครั้งต่อวันต่อสาย · เดิม 2 ตอนที่กรอก "จำนวน" (กรอกทีเดียวจบ)
// 26 พ.ย. 69 เปลี่ยนเป็นกรอก "เลขออเดอร์" ซึ่งทยอยเกิดทั้งวัน จึงต้องเซฟเพิ่มได้หลายรอบ
// ประวัติทุกครั้งยังเก็บใน h เหมือนเดิม (เพดาน MAX_HIST)
const REP_MAX = 10;
const MAX_HIST = 20;    // ประวัติการกรอกต่อสายต่อวัน — มีเพดานกัน snapshot บวม
// รหัสสายของบัญชีเซลล์ (209611) -> ชื่อสายที่ใช้ในใบ (CT11) · 2096_97 คือ KA97
const LINE_MAP = { "209611": "CT11", "209612": "CT12", "209613": "CT13", "209614": "CT14",
  "209615": "CT15", "209616": "CT16", "209617": "CT17", "209619": "CT19", "209622": "CT22",
  "2096_97": "KA97", "209698": "KA98", "209699": "KA99" };
const LINE_OF = (code) => LINE_MAP[String(code || "")] || "";   // ใบหนึ่งวันหนึ่ง: สาย x รหัสในใบ — จริง ๆ หลักร้อย เผื่อไว้กันบวม
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
  if (["add", "del", "step", "key", "gin", "rep"].indexOf(act) < 0) return res.status(400).json({ error: "คำสั่งไม่ถูกต้อง" });

  const sid = SID(body.sid);
  if (!sid) return res.status(400).json({ error: "ไม่ได้ระบุใบออเดอร์ใหญ่" });
  const twoStep = act === "key" || act === "gin" || act === "rep";
  const no = twoStep ? "" : NO(body.no);
  if (!twoStep && !no) return res.status(400).json({ error: "เลขออเดอร์ไม่ถูกต้อง (ใส่เลขออเดอร์จากแอพ เช่น BDD0100000123)" });
  const ymd = twoStep ? YMD(body.d) : "";
  if (twoStep && !ymd) return res.status(400).json({ error: "ไม่ได้ระบุวันที่" });
  const key = twoStep ? ((act === "key" || act === "rep") ? sid + "|" + ymd + "|" + LN(body.ln) : sid + "|" + ymd)
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
    if (!C.rep) C.rep = {};

    const existing = C.sub[key] || null;
    const now = Date.now();

    if (act === "key" || act === "gin" || act === "rep") {
      // ฝั่งเซลล์ = หัวหน้าเซลล์ (sup) หรือผู้จัดการ · ฝั่งแอดมิน = ผู้จัดการ (แอดมิน 1-4 เป็น role manager)
      if (act === "key" && !(role === "sup" || isMgr))
        return res.status(403).json({ error: "ฝั่งเซลล์ แก้ได้เฉพาะหัวหน้าเซลล์ (sup) กับผู้จัดการ" });
      if (act === "gin" && !isMgr)
        return res.status(403).json({ error: "ฝั่งแอดมิน แก้ได้เฉพาะแอดมิน/ผู้จัดการ" });

      // 👤 act:"rep" — เซลล์กรอก "จำนวนที่คีย์จริง" ของสายตัวเอง
      // กฎที่เจ้าของสั่ง 26 พ.ย. 69: เซลล์แก้ได้ครั้งเดียว · หัวหน้าเซลล์ดูได้อย่างเดียวแก้ไม่ได้
      // ⚠️ โควต้าแก้ต้องนับจากเรคอร์ดที่เก็บไว้จริง ไม่ใช่เชื่อค่าที่ส่งมาจากหน้าเว็บ
      if (act === "rep") {
        if (!(isMgr || role === "sales"))
          return res.status(403).json({ error: "บัญชีนี้กรอกจำนวนที่คีย์ไม่ได้" });
        const ln = LN(body.ln);
        if (!ln) return res.status(400).json({ error: "ไม่ได้ระบุสาย" });
        if (!isMgr) {
          if (!mine) return res.status(400).json({ error: "บัญชีนี้ไม่มีรหัสสาย" });
          if (LINE_OF(mine) !== ln)
            return res.status(403).json({ error: "กรอกได้เฉพาะสายของตัวเอง" });
        }
        const prev = C.rep[key] || null;
        const used = +(prev && prev.n) || 0;
        if (!isMgr && used >= REP_MAX)
          return res.status(409).json({ error: "สายนี้แก้จำนวนครบจำนวนครั้งที่ให้แก้แล้ว — แจ้งผู้จัดการถ้าต้องแก้อีก" });
        const src = body.it && typeof body.it === "object" ? body.it : {};
        const it = {};
        let n = 0;
        for (const c of Object.keys(src)) {
          const code = CODE(c);
          if (!code) continue;
          if (++n > MAX_ROWS) break;
          const v = src[c] || {};
          const row = { sc: Q(v.sc), sp: Q(v.sp), fc: Q(v.fc), fp: Q(v.fp) };
          if (row.sc || row.sp || row.fc || row.fp) it[code] = row;
        }
        // 🧾 the order numbers the rep keyed that day — the owner's "last jigsaw piece"
        // (27 Nov 26). They are what the admin checks the typed quantities against, so they are
        // stored as given and resolved at read time; the server only bounds them.
        // Measured on the real files: the number the rep sees in the app is 10 digits
        // (1034715426), a few older ones are 8, and an order number is BDD + 10. Anything
        // outside that is dropped rather than stored as junk.
        const no = (Array.isArray(body.no) ? body.no : [])
          .map((x) => String(x == null ? "" : x).trim().toUpperCase().replace(/[^0-9A-Z]/g, ""))
          .filter((x) => x.length >= 4 && x.length <= 24 && /^(BDD)?\d+$/.test(x));
        const noU = [];
        for (const x of no) if (noU.indexOf(x) < 0 && noU.length < 80) noU.push(x);
        const ent = { at: now, by: uid || role, byName: who, it, no: noU };
        C.rep[key] = {
          it, no: noU, by: ent.by, byName: who, at: now,
          n: used + (isMgr ? 0 : 1),                 // ผู้จัดการแก้ ไม่กินโควต้าของเซลล์
          h: (Array.isArray(prev && prev.h) ? prev.h : []).concat([ent]).slice(-MAX_HIST),
        };
      } else if (act === "key") {
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
            // 🏪 จำนวนร้านที่ได้ของจริง — เก็บแค่ "จำนวน" ไม่เก็บรายชื่อร้าน
            sh: Q(v.sh),
          };
        }
        // 🎁 คู่ของแถมที่ถอดมาจากไฟล์ใบจัดของเอง (ของแถมรหัสไหน มากับการซื้อรหัสไหน กี่ต่อกี่)
        // สร้างใหม่ทีละช่อง ไม่รับก้อนดิบ และผูกกับรหัสในใบเท่านั้น
        const msrc = body.mech && typeof body.mech === "object" ? body.mech : {};
        const mech = {};
        const T3 = (a) => (Array.isArray(a) ? [Q(a[0]), Q(a[1]), Q(a[2])] : [0, 0, 0]);
        let mn = 0;
        for (const k of Object.keys(msrc)) {
          const fc = CODE(k);
          if (!fc || ++mn > MAX_ROWS) break;
          const v = msrc[k] || {};
          const b = CODE(v.b);
          if (!b) continue;
          mech[fc] = { b, bq: T3(v.bq), fq: T3(v.fq), n: Q(v.n), hit: Q(v.hit) };
        }
        const ssrc = body.shop && typeof body.shop === "object" ? body.shop : {};
        const shop = {};
        let sn = 0;
        for (const k of Object.keys(ssrc)) {
          const c = CODE(k);
          if (!c || ++sn > MAX_ROWS) break;
          shop[c] = Q(ssrc[k]);
        }
        C.gin[key] = {
          mech, shop,
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
