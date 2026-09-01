import { list } from "@vercel/blob";
import { verify, bearer } from "../lib/auth.js";
import { LEAD_PREFIX } from "../lib/snapshot.js";

/* Manager-only read of the shop applications written by the public /api/apply.
   Read-only: it never writes anything, and it never touches the `bd-data-*`
   snapshot. The manager's own notes (status / assigned line / store code) live
   in the normal dashboard state under LEADS.meta and travel through api/save.js. */

const CONC = 12;

export default async function handler(req, res) {
  const claims = verify(bearer(req));
  if (!claims) return res.status(401).json({ error: "unauthorized" });
  if (claims.role !== "manager") return res.status(403).json({ error: "เฉพาะแอดมิน/ผู้จัดการเท่านั้น" });
  res.setHeader("Cache-Control", "no-store");

  if (!process.env.BLOB_READ_WRITE_TOKEN) return res.json({ leads: [] });

  try {
    const blobs = [];
    let cursor;
    do {
      const page = await list({ prefix: LEAD_PREFIX, cursor, limit: 1000 });
      blobs.push(...(page.blobs || []));
      cursor = page.hasMore ? page.cursor : null;
    } while (cursor && blobs.length < 5000);

    const recs = blobs.filter((b) => /\.json$/i.test(b.pathname || b.url || ""));
    recs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    const leads = [];
    for (let i = 0; i < recs.length; i += CONC) {
      const part = await Promise.all(recs.slice(i, i + CONC).map(async (b) => {
        try {
          const r = await fetch(b.url, { cache: "no-store" });
          if (!r.ok) return null;
          const d = await r.json();
          return (d && d.id) ? d : null;
        } catch { return null; }
      }));
      part.forEach((d) => { if (d) leads.push(d); });
    }

    leads.sort((a, b) => (b.at || 0) - (a.at || 0));
    res.json({ leads });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
}
