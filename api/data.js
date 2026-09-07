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

// The depot's DCI Score is the manager's own scorecard — the sales team don't see that tab,
// so don't ship them the numbers either. Read-only shaping of the RESPONSE: the stored
// snapshot is untouched, and a salesperson can't save it back anyway (api/save.js is
// manager-only, and api/request.js / api/leadstatus.js write their one key onto the server's
// own freshly-read state, never onto a client payload).
function forRole(data, claims) {
  if (!data || (claims && claims.role === "manager")) return data;
  const out = Object.assign({}, data);
  delete out.DCI;
  return out;
}

export default async function handler(req, res) {
  const claims = verify(bearer(req));
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  res.setHeader("Cache-Control", "no-store");

  // No blob configured yet -> serve seed
  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.json(forRole(seed(), claims));

  try {
    // Newest snapshot that actually has data (shared walk — lib/snapshot.js).
    // This automatically recovers real data if a blank/partial snapshot is newest.
    const cur = await newestReal(list, fetch);
    if (cur.data) return res.json(forRole(cur.data, claims));
    return res.json(forRole(seed(), claims));   // fresh store, or nothing readable -> seed (read-only, never written back)
  } catch (e) {
    res.json(forRole(seed(), claims));
  }
}
