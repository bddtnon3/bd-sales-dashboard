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

export default async function handler(req, res) {
  if (!verify(bearer(req))) return res.status(401).json({ error: "unauthorized" });
  res.setHeader("Cache-Control", "no-store");

  // No blob configured yet -> serve seed
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.json(seed());

  try {
    const { blobs } = await list({ prefix: "bd-data-" });
    if (!blobs.length) return res.json(seed());
    // newest wins
    blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    const r = await fetch(blobs[0].url, { cache: "no-store" });
    if (!r.ok) return res.json(seed());
    const data = await r.json();
    res.json(data);
  } catch (e) {
    // fall back gracefully so viewing never breaks
    res.json(seed());
  }
}
