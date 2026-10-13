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
/* Shop applications from the public /join.html form live under their OWN prefix so a public
   POST can never read, overwrite or evict the main snapshot. See api/apply.js. */
export const LEAD_PREFIX = "bd-lead-";
/* the shop-front photo that comes with an application — its own blob, again outside bd-data-* */
export const LEADIMG_PREFIX = "bd-shopimg-";   /* NOT "bd-lead…" — that prefix-matches the lead listing */
/* the monthly Unilever promotion slides the manager attaches to each promotion (api/promoimg.js).
   Again its own prefix outside bd-data-*: only the URL ever goes into the saved state. */
export const PROMOIMG_PREFIX = "bd-promoimg-";
/* ============================================================================
 * THE TWO MONTHLY PRICE FILES — DELIBERATELY IN SEPARATE BLOBS
 *
 * หัวเสือ (Huasuer) is the price the depot QUOTES CUSTOMERS. BUM is the depot's own
 * COST from Unilever. The owner's rule, stated twice and in capitals: *"ชีท Bum จะไม่ให้
 * ลูกค้าเห็นเด็ดขาด สำคัญมาก ห้ามลืม"* — if BUM leaked, every customer would know the
 * depot's margin on every SKU.
 *
 * So they are NOT two fields of one object and NOT two keys of the main snapshot.
 * They are two blobs behind two endpoints with different auth:
 *   bd-pricehs-*   <- api/price.js (manager write) · api/pricelist.js (PUBLIC read)
 *   bd-pricebum-*  <- api/price.js only (manager write AND manager read)
 * The public catalogue endpoint only ever lists PRICEHS_PREFIX, so the cost data is
 * not merely hidden from it — it is not reachable from it at all.
 *
 * Neither prefix may start with "bd-price" alone: that would prefix-match the other
 * listing, which is the bug LEADIMG_PREFIX already documents.
 * Both stay OUT of bd-data-*, so uploading prices can never roll the sales data back
 * nor push the 8 rolling snapshot backups out.
 * ==========================================================================*/
export const PRICEHS_PREFIX = "bd-pricehs-";
export const PRICEBUM_PREFIX = "bd-pricebum-";

/* Newest readable blob under any prefix, as parsed JSON. Used by the price endpoints,
 * which have no "is it empty" notion of their own — an upload either parsed or it did
 * not. Same newest->oldest walk as newestReal so a single CDN hiccup cannot serve
 * nothing while a good older copy exists.
 * Returns {first:true} (nothing ever uploaded) | {data} | {fail:true} (has blobs, none readable). */
export async function newestUnder(prefix, listFn, fetchFn, keep) {
  const { blobs } = await listFn({ prefix });
  if (!blobs || !blobs.length) return { first: true };
  blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  for (const b of blobs) {
    try {
      const r = await fetchFn(b.url, { cache: "no-store" });
      if (!r.ok) continue;
      const d = await r.json();
      if (d && typeof d === "object" && (!keep || keep(d))) return { data: d, url: b.url };
    } catch { /* unreadable -> try an older one */ }
  }
  return { fail: true };
}

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
