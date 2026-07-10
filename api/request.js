import { put, list, del } from "@vercel/blob";
import { readFileSync } from "fs";
import { verify, bearer } from "../lib/auth.js";

let SEED = null;
function seed() {
  if (SEED === null) {
    try { SEED = JSON.parse(readFileSync(new URL("./seed-data.json", import.meta.url), "utf8")); }
    catch { SEED = {}; }
  }
  return JSON.parse(JSON.stringify(SEED));
}

async function readCurrent() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return seed();
  const { blobs } = await list({ prefix: "bd-data-" });
  if (!blobs.length) return seed();
  blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  const r = await fetch(blobs[0].url, { cache: "no-store" });
  if (!r.ok) return seed();
  return await r.json();
}

// Any logged-in salesperson may submit their OWN product request.
// This merges only into REQUESTS[date][theirLineCode] — it cannot touch other data.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  const claims = verify(bearer(req));
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: "ยังไม่ได้ตั้งค่า Blob storage" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || !body.date || !body.items) return res.status(400).json({ error: "ไม่มีข้อมูลคำขอ" });

  const code = claims.code || body.code;
  if (!code) return res.status(400).json({ error: "บัญชีนี้ไม่มีรหัสสาย (ต้องเป็นบัญชีเซลล์)" });

  // sanitise items -> {code:{cs,pc}}
  const items = {};
  for (const k of Object.keys(body.items || {})) {
    const it = body.items[k] || {};
    const cs = Math.max(0, parseInt(it.cs) || 0), pc = Math.max(0, parseInt(it.pc) || 0);
    if (cs || pc) items[String(k)] = { cs, pc };
  }

  try {
    const data = await readCurrent();
    if (!data.REQUESTS) data.REQUESTS = { data: {} };
    if (!data.REQUESTS.data) data.REQUESTS.data = {};
    if (!data.REQUESTS.data[body.date]) data.REQUESTS.data[body.date] = {};
    if (Object.keys(items).length === 0) {
      // empty request = salesperson cleared all items -> remove their entry
      delete data.REQUESTS.data[body.date][code];
      if (Object.keys(data.REQUESTS.data[body.date]).length === 0) delete data.REQUESTS.data[body.date];
    } else {
      data.REQUESTS.data[body.date][code] = { items, at: Date.now(), by: claims.name || code };
    }

    const json = JSON.stringify(data);
    const blob = await put("bd-data-" + Date.now() + ".json", json, {
      access: "public", contentType: "application/json", addRandomSuffix: true,
    });
    try {
      const KEEP = 8;
      const { blobs } = await list({ prefix: "bd-data-" });
      blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      for (const b of blobs.slice(KEEP)) await del(b.url);
    } catch { /* best-effort cleanup */ }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
