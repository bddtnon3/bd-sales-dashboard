import { readFileSync } from "fs";
import { list } from "@vercel/blob";
import { verify, bearer } from "../lib/auth.js";
import { newestReal } from "../lib/snapshot.js";

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
    // Newest snapshot that actually has data (shared walk — lib/snapshot.js).
    // This automatically recovers real data if a blank/partial snapshot is newest.
    const cur = await newestReal(list, fetch);
    if (cur.data) return res.json(cur.data);
    return res.json(seed());          // fresh store, or nothing readable -> seed (read-only, never written back)
  } catch (e) {
    res.json(seed());
  }
}
