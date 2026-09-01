# CLAUDE.md — BD Sales Dashboard

Guidance for Claude Code working in this repo. Read this fully before making changes.

## What this is
Internal web app for **BD Distribution** — a Unilever distributor in Thailand. It replaces the
old "post report images in a LINE group" workflow. The manager/admin uploads Excel files through
the app UI; the sales team sees everything live. Features (all are tabs in one page):
**ภาพรวมยอดขาย** (daily/monthly vs target, per salesperson + store drill-down), **KPI**,
**การสั่งของ** (order status + Drop tracking, purchase-order recommendations by category),
**สต็อก**, **คำขอสินค้า** (sales request → manager summary → got/dropped status), and
**วิเคราะห์เชิงลึก** (product-mix analytics by line/group/brand/product + per-store).

## The user
Non-technical business owner. **Always respond in Thai**, keep it simple, avoid jargon.
Say what you're about to do before anything side-effectful (commit, push, deploy).

## Also read `HANDOFF.md`
`HANDOFF.md` holds the project history and the *reasons* behind current behaviour: the data-loss
incident and the safeguards it produced, business rules that are easy to get wrong (Drop O/P/Q,
the −15% CON Confirm estimate, duplicate rows per product code, product codes changing over time,
the 6 order-form categories), file-naming conventions for uploads, known limitations, and Vercel
capacity notes. Read it before changing anything in the order/Drop flow or the merge logic.

## Deploy = commit to `main`
Production auto-deploys from GitHub `main` (repo `bddtnon3/bd-sales-dashboard`) via Vercel (~1 min).
There is NO separate deploy command. Live site: https://bd-sales-dashboard.vercel.app
After deploying, tell the user to refresh / test the live site in ~1 minute.

## Source of truth = `dashboard_template.html` (NOT `public/index.html`)
`public/index.html` is a **generated file** — never hand-edit it. The real source is
**`dashboard_template.html`** (one big single-file HTML/CSS/JS app). To change the app:
1. Edit `dashboard_template.html`.
2. Run **`node build.cjs`** — this regenerates `public/index.html` (server API-mode) and
   fails loudly with `ANCHOR NOT FOUND` if an edit broke a string the build depends on.
3. Commit **both** `dashboard_template.html` and `public/index.html`, then push `main`.
`build.cjs` swaps the embedded-data declarations for empty server defaults and injects the
server login/sync code (real data comes from the API, not the file).

## Golden rule — NEVER let previously uploaded data disappear
The owner was badly burned by data loss once; data safety is the #1 priority.
- Data persists in **Vercel Blob** as a single JSON snapshot (prefix `bd-data-`).
- `api/save.js` does a **server-side `mergeState`**: it merges the incoming payload INTO the
  current server state key-by-key (keyed maps union; snapshots keep the fresher/bigger one);
  it does **not** overwrite the whole state. It also **rejects empty saves** (409) and keeps
  **8 rolling backups**. `api/data.js` returns the newest **non-empty** snapshot (auto-recovery).
- `api/request.js` writes only a salesperson's own `REQUESTS[date][line]` — a manager save must
  never clobber sales requests (`mergeRequests`).
- **All three endpoints read the blob through `lib/snapshot.js` (`newestReal` + `looksEmpty`).**
  It walks newest→oldest, skips anything unreadable or empty, and reports `{fail:true}` when the
  store has blobs but none is readable — the caller must then answer **503 and write nothing**.
  Never re-add a "fall back to the seed" branch on a *write* path: `api/request.js` once did that
  and a single CDN hiccup would have republished the July seed and then evicted all 8 backups.
- **Do NOT change any merge logic in a way that could drop old keys/sections.** If you touch
  `mergeState` / `mergeRequests` / `lib/snapshot.js`, prove old data survives before pushing by
  running **`node test/merge-safety.test.mjs`** (71 checks against the real `api/save.js` and the
  real `lib/snapshot.js`: old browser tab without a new field, new upload vs existing keys,
  empty/crashed client, fresh blob store, manager-vs-sales requests, PS tombstones, eB2B, PO
  status, and the seed-republish path). It must print `ALL PASS`. Add a case for every new section.

## The order form's colour grammar (analysed from the 01/09 confirm form)
The order cell is filled with **two different colours that mean two different things** — do not
merge them again. Evidence from that file (1,254 rows):
- **ฟ้า `00FFFF` (94 rows) = ปิดชั่วคราวรอบนี้**, the code-switch marker. 66% are ALSO a new code
  (yellow code cell), they carry a release note in the name (`สั่ง1กย`, `1st 20 กย`) 8x more often
  than an open row, and they never appear on a grey band.
- **ชมพู `FF00FF` (11 rows) = เลิกขายถาวร.** Never a new code, never grey, never on promo, and the
  SKU has no replacement anywhere in the form.
- **Pink code cell `FFCCFF` is the QUOTA marker, not a new code** — all 4 pink codes are exactly
  the 4 quota rows. Only a yellow code cell (`k===1`) means "new code".
- Grey band and a filled order cell are mutually exclusive: an out-of-stock item is left
  orderable, so it never needs the cell closed.
Of the 24 SKUs carrying two codes, the commonest state is **new = ฟ้า, old = open** — Unilever is
saying "keep buying the old code until the new one is released". So the answer to "which code do I
order?" is never "the new one": it is whichever code of that product the form leaves orderable
this round (`psSwap` / the `succ` search in `poWhy`). A fully open code carries NO colour, so
never test "has a flag" when looking for the orderable sibling.

## Public shop-application page (`public/join.html` → `api/apply.js`)
A link the manager sends to shop owners in Nonthaburi. **It is reachable without logging in**, so
`api/apply.js` writes each application as its own small blob under a SEPARATE prefix
(`bd-lead-*`, constant in `lib/snapshot.js`). It must **never** read, merge or write `bd-data-*` —
otherwise a public form could roll the sales data back and, after 8 submissions, evict every
backup. `api/leads.js` (manager only) reads those blobs; it never writes.
Only the manager's own notes (status / assigned line / store code) go into the saved state, as
`LEADS = {meta:{id:{st,line,store,note,at}}, del:{id:ts}}` — merged newest-wins per id, with
tombstones for junk applications. Bot protection is a hidden honeypot field plus a minimum
dwell time; the manager can hide anything that slips through.
The page has two views (hash routes `#/` and `#/apply`), so the form is its own screen.
The shop-front photo is shrunk in the browser to 1400px/JPEG before upload and stored as its own
blob under `bd-shopimg-*` (NOT `bd-lead…`, which would prefix-match the lead listing); the record
only keeps its URL. Fields: name, phone, shop name, address, district/subdistrict, shop type,
photo, map pin (lat/lng parsed from raw coordinates or a Maps link, plus a "use my location"
button), and two yes/no answers — tax invoice and the ⭐ star-shop programme.
`public/join.html` is hand-written (NOT generated by `build.cjs`) and `public/img/*` holds its
assets; `public/img/brand/*.png` are the individual brand logos shown grouped by category.
Keep the brands the owner excluded — Lipton, closeup, aviance, TONI&GUY, Unilever Food Solutions —
out of it. Opening hours are 08.00–17.00, Mon–Sat, closed Sunday.

## Request-size limit (why the client gzips)
Vercel caps the request body (~4.5 MB) and the blob is several MB, so the client gzips the
payload (`CompressionStream`, header `x-body-gzip:1`, content-type `application/octet-stream`)
and `api/save.js` inflates it (`gunzipSync`). Do NOT set `Content-Encoding: gzip` (the edge would
auto-decompress and the server would double-read). Keep this scheme intact.

## Secrets
`BLOB_READ_WRITE_TOKEN` and the auth signing secret live only in **Vercel env vars** — never in
code, never printed.

## Layout
- `dashboard_template.html` — the entire UI + all Excel parsers (`parseDaily`, `parseMonthly`,
  `parseKPI`, `parseOrderForm`, `parseDrop`, `parseStock`, `parseMaster`, `parseStore`,
  `parseAnalytics`) and renderers (`render`, `renderOrder`, `renderStock`, analytics, etc.).
- `build.cjs` — regenerates `public/index.html` from the template (run after every edit).
- `public/index.html` — generated output that Vercel serves. Do not edit by hand.
- `public/join.html` + `public/img/*` — the public shop-application page (hand-written).
- `api/*.js` — Vercel serverless functions (ESM): `login`, `data` (read newest non-empty blob),
  `save` (manager save + gzip + mergeState + 8 backups), `request` (sales-only request write),
  `apply` (PUBLIC shop application → its own `bd-lead-*` blob), `leads` (manager-only read).
- `lib/auth.js` — token sign/verify. `lib/snapshot.js` — the one shared blob-read walk
  (`newestReal`) + `looksEmpty`, used by `data`, `save` and `request` so they cannot drift.
  `seed-data.json` — bundled starting data (used until the
  first real upload; **read-only — never written back to the blob**). Note: `package.json` has
  `"type":"module"`, so the build script must stay `.cjs` (CommonJS) while `api/*.js` are ESM.

## How data gets in
The manager/admin uploads Excel files via the in-app upload buttons (🛒 order form, Drop report,
stock, daily/monthly sales, KPI, master, by-store, analytics). Filenames carry the date
(e.g. `Drop 25072026.xlsx`, `BD_250726.xlsx`). Parsers key data by date/month/line so uploads
merge rather than replace.

## Working style
Make small, verifiable changes. After editing the template, run `node build.cjs` and confirm it
prints `OK server bytes=...` with no `ANCHOR NOT FOUND`. Commit template + `public/index.html`
with a clear message, push `main` (that is the deploy). Report back in Thai: what changed, and to
test the live site in ~1 minute. For anything touching `api/save.js` data merging, double-check
old data cannot be lost before pushing.
