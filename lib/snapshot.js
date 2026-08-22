/* ============================================================================
 * SHARED SNAPSHOT READING — one implementation for api/data.js, api/save.js and
 * api/request.js, so the three read paths can never drift apart again.
 *
 * WHY THIS EXISTS
 * api/request.js used to read only the NEWEST blob and, on any non-OK fetch,
 * fall back to the bundled seed — and then WRITE that seed back as the newest
 * snapshot. One transient CDN hiccup while a salesperson pressed "ส่งคำขอ" was
 * enough to roll the whole app back to the seed (no POSTATUS / PSTORE / EB2B,
 * July-era sales), and the next 8 requests would have pruned every good backup.
 * The rule is now: walk newest -> oldest, skip anything unreadable or empty, and
 * if the store has blobs but NONE is readable, refuse to write. Never publish a
 * state that was not built on a real snapshot.
 * ==========================================================================*/

export const PREFIX = "bd-data-";

// A snapshot is "empty" if it carries no real business data. We never let an
// empty snapshot shadow — or overwrite — a good one.
export function looksEmpty(d) {
  if (!d || !d.DATA) return true;
  const m = Object.keys(d.DATA.monthly || {}).length;
  const dd = Object.keys(d.DATA.daily || {}).length;
  const st = ((d.STOCKD && d.STOCKD.rows) || []).length;
  const od = ((d.ORDERS && d.ORDERS.dates) || []).length;
  const kp = ((d.KPI && d.KPI.months) || []).length;
  const ps = Object.keys((d.PSTORE && d.PSTORE.rounds) || {}).length;
  const eb = Object.keys((d.EB2B && d.EB2B.data) || {}).length;
  const po = Object.keys((d.POSTATUS && d.POSTATUS.data) || {}).length;
  return (m + dd + st + od + kp + ps + eb + po) === 0;
}

/* Walk the blob list newest -> oldest and return the first snapshot that really
 * holds data. Pure and injectable so the merge-safety test can drive it.
 *   listFn  : () => Promise<{blobs:[{url,uploadedAt}]}>
 *   fetchFn : (url, opts) => Promise<{ok, json()}>
 * Returns one of:
 *   {first:true}       the store is genuinely empty (first ever run)
 *   {data:<snapshot>}  a real snapshot was found
 *   {fail:true}        the store HAS blobs but none could be read -> do NOT write
 */
export async function newestReal(listFn, fetchFn) {
  const { blobs } = await listFn({ prefix: PREFIX });
  if (!blobs || !blobs.length) return { first: true };
  blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  for (const b of blobs) {
    try {
      const r = await fetchFn(b.url, { cache: "no-store" });
      if (!r.ok) continue;                       // transient CDN error -> try an older one
      const d = await r.json();
      if (d && d.DATA && !looksEmpty(d)) return { data: d };
    } catch { /* unreadable -> try an older one */ }
  }
  return { fail: true };
}
