import { readFileSync } from "fs";
import { list } from "@vercel/blob";
import { verify, bearer } from "../lib/auth.js";

// Bundled starting data (used until the admin uploads for the first time)
let SEED = null;
function seed() {
  if (SEED === null) {
    try { SEED = JSON.parse(readFileSync(new URL("./seed-data.json", import.meta.url), "utf8")); }
    catch { SEED = { DATA: { lines: {}, monthly: {}, daily: {}, focus_order: [] }, STORE: { months: [], stores: [] } }; }
  }
  return SEED;
}

// A snapshot is "empty" if it carries no real business data. We never let an empty
// snapshot shadow a good one — protects against a bad/blank save wiping the view.
function looksEmpty(d) {
  if (!d || !d.DATA) return true;
  const m = Object.keys(d.DATA.monthly || {}).length;
  const dd = Object.keys(d.DATA.daily || {}).length;
  const st = ((d.STOCKD && d.STOCKD.rows) || []).length;
  const od = ((d.ORDERS && d.ORDERS.dates) || []).length;
  const kp = ((d.KPI && d.KPI.months) || []).length;
  return (m + dd + st + od + kp) === 0;
}

export default async function handler(req, res) {
  if (!verify(bearer(req))) return res.status(401).json({ error: "unauthorized" });
  res.setHeader("Cache-Control", "no-store");

  // No blob configured yet -> serve seed
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.json(seed());

  try {
    const { blobs } = await list({ prefix: "bd-data-" });
    if (!blobs.length) return res.json(seed());
    // newest first
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    // Return the newest snapshot that actually has data. This automatically
    // recovers real data if a blank/partial snapshot happens to be newest.
    for (const b of blobs) {
      try {
        const r = await fetch(b.url, { cache: "no-store" });
        if (!r.ok) continue;
        const data = await r.json();
        if (!looksEmpty(data)) return res.json(data);
      } catch { /* try older snapshot */ }
    }
    // every snapshot was empty -> seed
    return res.json(seed());
  } catch (e) {
    res.json(seed());
  }
}
