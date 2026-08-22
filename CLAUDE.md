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
- `api/*.js` — Vercel serverless functions (ESM): `login`, `data` (read newest non-empty blob),
  `save` (manager save + gzip + mergeState + 8 backups), `request` (sales-only request write).
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
