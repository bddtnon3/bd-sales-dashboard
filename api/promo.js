import { put, list, del } from "@vercel/blob";
import { verify, bearer } from "../lib/auth.js";
import { newestReal, looksEmpty } from "../lib/snapshot.js";

/* ============================================================================
 * 🎁 โปรโมชั่นรายเดือน — หัวหน้าเซลล์ (role "sup") เขียนได้ "ทีละใบเดียว"
 * (เจ้าของสั่ง 24 พ.ย. 69: *"ผมจะให้ supervisor ประจำศูนย์ เข้ามากรอกทุกต้นเดือน
 *  ข้อมูลรหัสสินค้าในแต่ละโปรโมชั่น เพื่อให้ระบบตามแทรคยอดขายรายสาย
 *  และจำนวนการกระจายของแต่ละโปรโมชั่นได้"*)
 *
 *   act:"save" -> PROMO.items[id]    เขียนทับใบเดียว + ล้าง tombstone ของใบนั้น
 *   act:"del"  -> PROMO.del[id]      tombstone (ผู้จัดการเท่านั้น)
 *
 * ⚠️ sup ไม่ใช่ manager จึงส่ง state ทั้งก้อนไม่ได้เลย (api/save.js รับแต่ manager)
 *    ทุกการเขียนของเขาต้องผ่านที่นี่ และแตะได้แค่ PROMO.items[id] คีย์เดียวต่อครั้ง
 * ⚠️ **ห้ามแตะ PROMO.sales เด็ดขาด** — นั่นคือยอดขายจริงที่ parseDailyDcode เก็บไว้
 *    ตอนผู้จัดการอัพไฟล์ ถ้าปล่อยให้ที่นี่เขียนได้ ใบโปรหนึ่งใบจะลบยอดทั้งเดือนได้
 * ⚠️ `by`/`byName` เอาจาก claims ที่ตรวจแล้ว ไม่ใช่จาก body (หลักเดียวกับ api/renew.js)
 * ⚠️ เดินตาม lib/snapshot.js เหมือน save/request/plan/leadstatus/spord:
 *    อ่าน snapshot จริงล่าสุด อ่านไม่ได้เลย = ตอบ 503 แล้ว **ไม่เขียนอะไรทั้งนั้น**
 *    ห้ามมี branch "ถอยไปใช้ seed" บนทางเขียน
 * ==========================================================================*/

const S = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
const ID = (v) => (/^[A-Za-z0-9_-]{1,40}$/.test(String(v || "")) ? String(v) : "");
const YM = (v) => (/^\d{4}-\d{2}$/.test(String(v || "")) ? String(v) : "");
const YMD = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "");
const N = (v) => { const n = parseFloat(String(v == null ? "" : v).replace(/[, %฿]/g, "")); return isFinite(n) ? n : 0; };
const TYPES = ["combo", "eco", "extra", "hit", "flash", "dflash", "top30"];
const ARR = (v, n) => (Array.isArray(v) ? v.slice(0, n) : []);

// รับเฉพาะรูปที่ระบบรู้จัก — ใบที่ส่งมาจะถูก "ประกอบใหม่" ทั้งใบ ไม่ได้เอาของ client มาทั้งก้อน
// ของแปลกปลอมที่แอบใส่มาในใบจึงเข้าไปอยู่ใน state ไม่ได้เลย
function clean(src, old, who, uid) {
  const o = src && typeof src === "object" ? src : {};
  const now = Date.now();
  return {
    name: S(o.name, 120),
    type: TYPES.indexOf(String(o.type)) >= 0 ? String(o.type) : "combo",
    m: YM(o.m),
    d1: YMD(o.d1), d2: YMD(o.d2), min: Math.max(0, Math.min(99999, N(o.min))),
    ch: ["CT", "KA", "both"].indexOf(String(o.ch)) >= 0 ? String(o.ch) : "CT",
    grp: S(o.grp, 20),
    imgs: ARR(o.imgs, 12).map((u) => S(u, 500)).filter(Boolean),
    img: "",
    imgFile: (old && Array.isArray(old.imgFile)) ? old.imgFile : ARR(o.imgFile, 12).map((u) => S(u, 200)),
    tgtPct: N(o.tgtPct), tgtStores: N(o.tgtStores), tgtNote: S(o.tgtNote, 200),
    supMoney: N(o.supMoney), pts: S(o.pts, 160), note: S(o.note, 1000),
    prod: ARR(o.prod, 500).map((p) => ({
      c: S(p && p.c, 20), n: S(p && p.n, 120), k: String(p && p.k) === "f" ? "f" : "m",
    })).filter((p) => p.c || p.n),
    cond: ARR(o.cond, 30).map((c) => S(c, 300)).filter(Boolean),
    detail: ARR(o.detail, 20).map((d) => ({ k: S(d && d.k, 40), v: S(d && d.v, 200) })).filter((d) => d.k),
    lines: ARR(o.lines, 20).map((L) => ({
      k: S(L && L.k, 20), mech: S(L && L.mech, 200), free: S(L && L.free, 200),
      tgtPct: N(L && L.tgtPct), cap: S(L && L.cap, 300),
    })).filter((L) => L.k || L.mech || L.free || L.cap),
    pay: ARR(o.pay, 20).map((p) => ({
      label: S(p && p.label, 60), pcs: N(p && p.pcs), colors: N(p && p.colors),
      growth: N(p && p.growth), sm: N(p && p.sm), sup: N(p && p.sup),
    })).filter((p) => p.label || p.sm || p.sup || p.pcs),
    by: (old && old.by) || uid, byName: who,
    at: (old && old.at) || now, up: now,
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  const claims = verify(bearer(req));
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า Blob storage" });

  const role = claims.role || "";
  if (role !== "manager" && role !== "sup")
    return res.status(403).json({ error: "บัญชีนี้แก้โปรโมชั่นไม่ได้" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body) return res.status(400).json({ error: "ไม่มีข้อมูลที่จะบันทึก" });

  const act = String(body.act || "");
  if (["save", "del"].indexOf(act) < 0) return res.status(400).json({ error: "คำสั่งไม่ถูกต้อง" });
  const id = ID(body.id);
  if (!id) return res.status(400).json({ error: "ไม่ได้ระบุรหัสโปรโมชั่น" });
  // ลบเป็นงานของผู้จัดการ — หัวหน้าเซลล์กรอก/แก้ได้ แต่ลบทิ้งทั้งใบไม่ได้
  if (act === "del" && role !== "manager")
    return res.status(403).json({ error: "ลบโปรโมชั่นได้เฉพาะผู้จัดการ" });

  const who = S(claims.name, 60);
  const uid = S(claims.u || claims.user || claims.sub || claims.code || role, 40);

  try {
    const cur = await newestReal(list, fetch);
    if (cur.fail) return res.status(503).json({ error: "อ่านข้อมูลล่าสุดจากเซิร์ฟเวอร์ไม่ได้ ยังไม่ได้บันทึก — กรุณาลองใหม่อีกครั้ง" });
    if (cur.first || !cur.data) return res.status(409).json({ error: "ยังไม่มีข้อมูลในระบบ" });
    const data = cur.data;

    const P = data.PROMO || (data.PROMO = {});
    if (!P.items) P.items = {};
    if (!P.res) P.res = {};
    if (!P.del) P.del = {};
    if (!P.sales) P.sales = {};          // อ่านอย่างเดียว ไม่แตะ — ดูหมายเหตุหัวไฟล์

    if (act === "save") {
      const it = clean(body.item, P.items[id] || null, who, uid);
      if (!it.name) return res.status(400).json({ error: "ยังไม่ได้ใส่ชื่อโปรโมชั่น" });
      if (!it.m) return res.status(400).json({ error: "ยังไม่ได้เลือกเดือนของโปรโมชั่น" });
      if ((it.d1 && !it.d2) || (it.d2 && !it.d1) || (it.d1 && it.d2 && it.d1 > it.d2))
        return res.status(400).json({ error: "ช่วงวันที่ไม่ถูกต้อง" });
      P.items[id] = it;
      delete P.del[id];
    } else {
      delete P.items[id];
      P.del[id] = Date.now();
      // ผลงานของใบที่ลบไปด้วยกัน (กฎเดียวกับ mergeState) — แต่ไม่แตะใบอื่น
      for (const rk of Object.keys(P.res)) if (rk.slice(0, id.length + 1) === id + "|") delete P.res[rk];
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

    return res.status(200).json({ ok: true, url: blob.url, id });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
