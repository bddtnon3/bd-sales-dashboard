import { put, list, del } from "@vercel/blob";
import { verify, bearer } from "../lib/auth.js";
import { newestReal, looksEmpty } from "../lib/snapshot.js";

/* ============================================================================
 * SHARED COMPANY PLANNER — a salesperson adds / edits / ticks off a task.
 *
 * The manager saves the planner through api/save.js like every other section
 * (mergeState merges PLAN key by key). A salesperson must NOT be able to send a
 * whole state, so this endpoint exists: it writes exactly one key per call and
 * refuses anything outside what that account owns.
 *
 *   act:"save" -> PLAN.items[id]        only if the task is new, or `by` is this
 *                                       salesperson's own line code
 *   act:"done" -> PLAN.done["id|date"]  only if the task concerns them
 *                                       (no line listed = everyone, or their line listed)
 *   act:"del"  -> PLAN.del[id]          only for a task they created
 *
 * Same data-safety walk as api/save.js, api/request.js and api/leadstatus.js:
 * read the newest REAL snapshot, and if the store holds blobs but none can be
 * read, answer 503 and write NOTHING rather than publish a state that was not
 * built on the real one. Never fall back to the seed on a write path.
 * ==========================================================================*/

const CATS = ["deadline", "task", "meet", "promo", "holiday"];
const S = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001F\u007F]/g, " ").trim().slice(0, max);
const ISO = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v || "")) ? String(v) : "");
const HHMM = (v) => (/^\d{2}:\d{2}$/.test(String(v || "")) ? String(v) : "");
const ID = (v) => (/^[A-Za-z0-9_-]{1,40}$/.test(String(v || "")) ? String(v) : "");

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  const claims = verify(bearer(req));
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า Blob storage" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body) return res.status(400).json({ error: "ไม่มีข้อมูลที่จะบันทึก" });

  const act = String(body.act || "");
  if (["save", "done", "del"].indexOf(act) < 0) return res.status(400).json({ error: "คำสั่งไม่ถูกต้อง" });
  const id = ID(body.id);
  if (!id) return res.status(400).json({ error: "รหัสงานไม่ถูกต้อง" });

  const isMgr = claims.role === "manager";
  const mine = claims.code || "";
  if (!isMgr && !mine) return res.status(400).json({ error: "บัญชีนี้ไม่มีรหัสสาย" });
  const owner = isMgr ? "manager" : mine;

  try {
    const cur = await newestReal(list, fetch);
    if (cur.fail) return res.status(503).json({ error: "อ่านข้อมูลล่าสุดจากเซิร์ฟเวอร์ไม่ได้ ยังไม่ได้บันทึก — กรุณาลองใหม่อีกครั้ง" });
    if (cur.first || !cur.data) return res.status(409).json({ error: "ยังไม่มีข้อมูลในระบบ" });
    const data = cur.data;

    const P = data.PLAN || (data.PLAN = {});
    if (!P.items) P.items = {};
    if (!P.done) P.done = {};
    if (!P.del) P.del = {};

    const existing = P.items[id] || null;
    // Only the creator (or the manager) may change or remove a task.
    const ownsIt = isMgr || (existing && existing.by === mine);
    // A task concerns you when it lists no line at all (everyone), or lists yours.
    const forMe = (it) => isMgr || !it || !Array.isArray(it.lines) || !it.lines.length || it.lines.indexOf(mine) >= 0;

    if (act === "save") {
      const b = body.item || {};
      const t = S(b.t, 120);
      const d = ISO(b.d);
      if (!t) return res.status(400).json({ error: "ไม่มีชื่องาน" });
      if (!d) return res.status(400).json({ error: "วันที่ไม่ถูกต้อง" });
      if (existing && !ownsIt) return res.status(403).json({ error: "แก้ได้เฉพาะงานที่คุณสร้างเอง" });
      if (P.del[id] && !existing) return res.status(409).json({ error: "งานนี้ถูกลบไปแล้ว" });
      let d2 = ISO(b.d2);
      if (d2 && d2 <= d) d2 = "";
      const lines = Array.isArray(b.lines)
        ? b.lines.map((x) => S(x, 20)).filter(Boolean).slice(0, 24)
        : [];
      const rep = (b.rep === "w" || b.rep === "m") ? b.rep : "";
      const now = Date.now();
      P.items[id] = {
        t, d, d2, tm: HHMM(b.tm),
        cat: CATS.indexOf(String(b.cat)) >= 0 ? String(b.cat) : "task",
        lines, note: S(b.note, 800),
        rep, repTo: rep ? ISO(b.repTo) : "",
        // ownership is decided by the token, never by the payload
        by: existing ? (existing.by || owner) : owner,
        byName: existing ? (existing.byName || S(claims.name, 60)) : S(claims.name, 60),
        at: existing && existing.at ? existing.at : now,
        up: now,
      };
      delete P.del[id];
    } else if (act === "del") {
      if (!existing) return res.status(404).json({ error: "ไม่พบงานนี้" });
      if (!ownsIt) return res.status(403).json({ error: "ลบได้เฉพาะงานที่คุณสร้างเอง" });
      delete P.items[id];
      P.del[id] = Date.now();
    } else {
      // act === "done" — tick / untick ONE occurrence of the task
      const date = ISO(body.date);
      if (!date) return res.status(400).json({ error: "วันที่ไม่ถูกต้อง" });
      if (!existing) return res.status(404).json({ error: "ไม่พบงานนี้" });
      if (!forMe(existing)) return res.status(403).json({ error: "งานนี้ไม่ได้ระบุสายของคุณ" });
      // v:0 is an in-map tombstone — removing the key would be undone by the server-side union
      P.done[id + "|" + date] = { v: body.v ? 1 : 0, by: S(claims.name, 60), at: Date.now() };
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

    res.json({ ok: true, url: blob.url });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
