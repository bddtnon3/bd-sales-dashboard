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
**โปรโมชั่น & เงินรางวัล** (the monthly Unilever promotions and the prize money each sales line
earns from them).
**ราคา & ทุน** (the two monthly Unilever price files: the หัวเสือ quote prices the depot sells at —
also published to shop customers as a public catalogue — and the BUM cost file, manager-only).
The pages sit in **9 top-level tab groups** (`TAB_GROUPS`/`renderTabs`), several of which open a
row of sub-tabs. The per-page keys (`CURTAB`) did not change when the grouping was added — see
`HANDOFF.md` §5 before touching the tab bar.

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
  running **`node test/merge-safety.test.mjs`** (169 checks against the real `api/save.js` and the
  real `lib/snapshot.js`: old browser tab without a new field, new upload vs existing keys,
  empty/crashed client, fresh blob store, manager-vs-sales requests, PS tombstones, eB2B, PO
  status, DCI periods, MINSTOCK tombstones, KPI date-keyed rounds + `KPI.meta` + `KPI.del`
  tombstones, the shared planner (`PLAN.items`/`done`/`del`), the monthly promotions and their prize
  money (`PROMO.items`/`res`/`del`), the PJP visit plan (`PJP.out`/`plan`/`done`/`cfg` — a new
  month must not erase the last one, a Master file must not delete a shop it stopped listing, an
  untick must not be undone by a stale tab, and a tab from before visit notes existed must not
  strip a rep's note off the record it shares with the tick), and the seed-republish path). It must print `ALL PASS`. Add a case for every new section.

- The **two monthly price files live OUTSIDE `bd-data-*`** and `PRICE` is deliberately **not** part
  of the synced state, so `mergeState` never sees them and uploading prices cannot roll the sales
  data back nor evict its 8 backups. They are two separate blobs behind two endpoints —
  `bd-pricehs-*` (หัวเสือ, public read) and `bd-pricebum-*` (BUM, manager only). A price list is a
  complete monthly document, so a new upload **replaces** that file rather than merging into it
  (a half-merged price list would quote a customer last month's price); 6 rolling copies are kept
  per kind and an upload parsing fewer than 50 items is refused (409). Prove it with
  **`node test/browser/price.test.cjs`** (88 checks against the owner's real files).

## 🔒 Customers may see หัวเสือ and NEVER BUM
The owner stated this twice, in capitals: *"ชีทที่ลูกค้าเห็นจะมีแค่หัวเสือเท่านั้น ชีท Bum จะไม่ให้ลูกค้า
เห็นเด็ดขาด สำคัญมาก ห้ามลืม"* — a BUM leak would show every customer the depot's margin on every SKU.
It is enforced by **unreachability, not by filtering**: `api/pricelist.js` is public, GET-only, and
lists **only `PRICEHS_PREFIX`**, so the cost blob is not reachable from the customer page at all.
**Never add `PRICEBUM_PREFIX`, the main snapshot, or a `kind` parameter to that file**, and never add
a second `fetch` to `public/pricelist.html`. `api/price.js` returns `bum` only when
`claims.role === "manager"` — not merely a hidden button. Rules: `HANDOFF.md` §5.

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
Only notes go into the saved state, never the applications themselves:
`LEADS = {meta:{id:…manager}, sales:{id:…salesperson}, del:{id:ts}}` — two separate maps so the
two sides cannot overwrite each other, each merged newest-wins per id, with tombstones for junk.
When the manager assigns a line, the shop appears in that salesperson's **🏪 ร้านใหม่ของฉัน** tab
(`.sales-only`, hidden from the manager). They report progress through **`api/leadstatus.js`**,
which writes ONLY `LEADS.sales[id]` and only for a lead whose `meta[id].line` is their own line —
same newest-real-snapshot walk, 503-and-write-nothing on an unreadable store. `api/leads.js` is
role-aware: the manager gets every application, a salesperson only the ones assigned to them. Bot protection is a hidden honeypot field plus a minimum
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
  The **📈 DCI Score** tab (`parseDCI`/`dciExtract`/`renderDCI`) scores the depot against
  Unilever's DCI sheet. Everyone sees it; only the manager can upload. Its rules are in
  `HANDOFF.md` §5 — read them before touching it.
  The **🗺 PJP** tab group (`renderPjp`/`parseOutlet`/`parsePJP`) is the sales team's daily visit
  plan: for each day it lists the shops that rep must call on, in the file's visit order, and
  against each one what needs doing there — sales down / not buying, Perfect Store not passed
  (with Unilever's own Call to action), eB2B not opened — pulled from `STORE`, `PSTORE` and
  `EB2B`, which all key on the same 7-digit outlet code. A rep records a visit through
  **`api/pjpvisit.js`**, which writes exactly one `PJP.done["outlet|date"]` and only for a shop on
  that rep's own route that day. Two files are uploaded monthly (Master Outlet + the PJP plan) and
  the hard-won facts about them — the file holds **12 working days, not a month**, the second
  fortnight is generated by **+14 days**, the `วันที่กำหนด` column is unusable, outlet codes repeat
  in Master, and `2096DT` is 100 virtual shops — are in `HANDOFF.md` §5.
  Ticking "visited" confused the team and told nobody anything, so the one button on each card is
  **📌 บันทึกงานค้าง** (`pjNoteOpen`): what is outstanding at that shop, optional `PJ_FLAG`
  categories, and a 🔔 checkbox asking for a second reminder at the shop's next planned visit.
  It all lives on the SAME record (`PJP.done[k]`: `.tx` `.f` `.nx`, and `.cl` for cleared) — never
  a new section, because `newestByAt` already protects that map. **A note alone is outstanding
  work**: requiring a flag was a bug that silently dropped notes from the calendar. What is still
  open is **last round wins** (`pjFollow`, the Drop-ค้าง rule), never a sum of every round;
  clearing writes a NEW dated record with `cl:1` rather than editing an old one, so the history
  survives; and `pjNoteIdx` must index EVERY dated record, not just ones with a note, or a clear
  cannot beat what came before it. `pjTasks(code,ymd)` still takes the date for the other badges.
  An open item shows in the planner as 🏪 งานร้านค้า (`plShopOcc`) **on the day it was recorded**,
  plus the next visit round when 🔔 was ticked — derived at render time, never stored as
  `PLAN.items`. `api/pjpvisit.js` checks the shop is on that rep's route **anywhere** in the
  stored plan, not on that exact date: work is logged and cleared on whatever day it happens. Google Maps is optional:
  with no key the shop cards still have 🧭 navigate buttons; when there is a key the map element
  is static, its markers are reused and `fitBounds` only runs when the set of shops changes,
  because Google bills per Map creation.
  Unilever's own Call to action is shown through **`psCtaText`**, which rewrites `Drive AO & SO`
  (Assisted / Self Ordering) as `Drive B2B`, the words the reps use. It rewrites **on display
  only** — the stored `PSF.cta` keeps Unilever's wording. Note the three pillars are
  A = Availability, V = Visibility and **D = Digital** (the column header starts `digit`), not
  Display. Prove all of it with
  **`node test/browser/pjp.test.cjs`** (118 checks on the owner's real October files).
  The **🎯 eB2B & Self Ordering** tab keys each round by the **"as of" date in the FILENAME**
  (`kpiKeyOf`/`kpiAsOf`), not by month — the file is uploaded weekly, so month keys made the
  second upload of a month erase the first. The filename wins over the sheet header, which once
  read `as of W4 Sep'26` as the 4th. `end of Sep` in a filename means the month-closing round.
  Old `YYYY-MM` keys must keep working; `KPI.meta` and the `KPI.del` tombstones must survive
  `mergeState`. Rules: `HANDOFF.md` §5.
  The **🗓 ปฏิทินงาน** tab (`renderPlan`/`plOccur`) is the shared company planner — everyone
  sees the same calendar, the manager may edit any task, a salesperson may add tasks and
  edit/delete only their own (`by` is set from the token, never the payload). Repeating tasks
  are expanded at render time, never stored as copies; `PLAN.done` is keyed per occurrence
  date. It also shows **🏪 งานร้านค้า** — the open follow-ups from the PJP visit notes,
  likewise derived at render time and never written to `PLAN.items`, so clearing one at the shop
  clears it here. `PL.scope` filters all / shop work / depot work — three buttons for everyone —
  and the manager gets a line picker (`PL.pjLine`) that narrows **both** shop work and the depot
  tasks tagged for that line. A third view, **🔔 แจ้งเตือน** (`plNotiHtml`/`plNotiRows`), is the
  notification feed everybody reads: overdue, today, tomorrow and the day after, covering depot
  tasks and the reps' shop work alike, with holidays listed separately as information. The red
  badge on the tab is that same count, so the number and the feed can never disagree.
  **A 🌴 holiday is not work** (`plIsWork`): nobody completes a day off, so `cat==="holiday"` is
  excluded from overdue, from the today / next-7-days cards and from the tab's red badge, and its
  row shows the icon instead of a tick. It must still be listed and drawn on the calendar, so
  never filter it out in `plOcc`. Prove it, and the notification feed, with
  **`node test/browser/plan.test.cjs`** (107 checks).
  Rules: `HANDOFF.md` §5.
  Every product list under **การสั่งของ** is sorted into **the order the owner reads the paper
  form** — down the left column block, then the next block to the right (`poSeqSort`). That
  order is captured from the uploaded order form itself and kept in `POSTATUS.data[d].all`
  behind an `allSeq` flag; a day without the flag holds the old code-sorted list and must never
  be used for sorting. The same lists are banded by category (`grpByCat`), and the **order of the
  bands comes from the form too** (`poSeqCats` — first appearance of each category in `all`), never
  from the hard-coded `ORDER_CATS`, which is only the fallback before the first upload; `อื่นๆ`
  always sinks to the bottom. The product-status tables (`psTable`, `psShowDiff`) pass
  `alwaysBand:true`, because those lists are pre-filtered and a round with one category would
  otherwise read as a flat list. Rules: `HANDOFF.md` §5.
  **One exception, at the owner's direct request (16 Oct 26):** the 🎁 โปรโมชั่นแถมในบิล list
  under วิเคราะห์การสั่งของ is banded by **free-goods ratio** (`psPromoGroups` — 6F1, 7F1, …,
  best deal first, each band summarising ลงตัว / เหลือเศษ / ยังไม่สั่ง), and sorted inside a band
  by brand then pack size, because what the owner decides there is "how many to order so it
  divides evenly", not "where is this on the paper form". The brand key is taken from the FIRST
  THAI WORD of the order-form name (`psBrandKey`) and never from `STOREPROD` or the price file —
  mixing sources splits one brand across two places in the list. Every other section keeps
  `grpByCat` + `poSeqSort`. Prove it with **`node test/browser/psbill.test.cjs`** (25 checks).
  **การสั่งของ** has four sub-tabs (`ordSetSec`): sales requests / order form / Drop / auto-PO.
  The first one opens with **🔁 Drop ค้าง** (`renderDropBack`/`dbScan`/`dbChase`/`dbBlock`): everything
  Unilever dropped in the last 3/5/7/14 days that has still not arrived, with a re-order prompt. It
  is **strictly read-only** over ORDERS/POSTATUS/STOCKD/REQUESTS (same rule as the auto-PO
  calculator) and its two settings live on the non-synced `ORD` object. Four rules are easy to get
  wrong — the chase window must start *strictly after* the drop day, status is *last round wins*,
  "ยังค้าง" is the last round's Q and never a sum, and the "สั่งซ้ำแล้ว" fact must never be hidden
  behind a colour-block label. Prove it still holds with
  **`node test/browser/dropback.test.cjs`** (45 checks, needs `npm i --no-save playwright-core`);
  it asserts among other things that the four order-data blobs are byte-identical before and after
  every control is exercised. Rules: `HANDOFF.md` §5.
  The auto-PO calculator (`poBuild`/`renderPoCalc`) and `MINSTOCK` (minimum stock per code) have
  rules that are easy to get wrong — read `HANDOFF.md` §5 before touching either. The calculator
  is strictly READ-ONLY over ORDERS/POSTATUS/STOCKD/REQUESTS.
  Generating the real PO file (`xlsmFill`) patches the manager's own blank .xlsm inside the zip —
  never rewrite the workbook, or the macros, formatting and Unilever's sensitivity label are lost.
  The form's totals/weight/volume/value are FORMULAS over the Order Confirm column, so the output
  sets `fullCalcOnLoad="1"` and the manager must open it in Excel once before emailing. Rules and
  the five assumptions to re-check if Unilever changes the form: `HANDOFF.md` §5.
  The **row cursor** (`rc-on`/`RC_VIEWS`, `rcMove`/`rcApply`) lets the manager walk the order,
  order-analysis and stock tables line by line with the arrow keys. It is a reading aid only —
  it never touches data — but its four traps (no `border`, paint `>td` not `tr`, `capture:true`
  so the click-to-copy handler still fires, and never steal arrows from an input) are easy to
  undo by accident: read `HANDOFF.md` §5 first.
  The **🎁 โปรโมชั่น & เงินรางวัล** tab group (`renderPromo`/`renderPromoRes`) holds the monthly
  Unilever promotions and the per-route results. Seven promotion types share one record shape
  (`PRO_TYPE`); every monthly report, whatever the promotion, reduces to the same row —
  route → PJP/Base · Target · Actual · %Achieve · money — so results are stored once as
  `PROMO.res["promoId|routeCode|lineKey"]`. The manager ingests a report by **pasting the table
  straight out of Excel or Power BI** (`prRead`/`prApply`): the route column is detected, the
  other columns are guessed and confirmed. When there is no table to copy, only a **screenshot**,
  the same dialog reads the numbers out of the image (`ocrRead`/`ocrToGrid`/`ocrTrim`, Tesseract
  vendored in `public/vendor/ocr/`, ~8 MB, lazy-loaded only when used like jszip). OCR can be
  wrong, so nothing is ever saved straight from it: every preview cell is editable and the cells
  it got wrong are highlighted (`prCellBad`). Its four measured rules — upscale to ~2800px,
  **never** threshold to black and white, rebuild the table from word *coordinates*, and take the
  column boundaries from the *data rows only* — are in `HANDOFF.md` §5 with the numbers behind
  them. Prove it still reads the owner's real reports with
  **`node test/browser/ocr-promo.test.cjs`** (36 checks, needs `npm i --no-save playwright-core`).
  Slide images and report screenshots both go to their own `bd-promoimg-*` blobs
  via `api/promoimg.js` — never into the state; the state keeps only the URL
  (`PROMO.items[id].imgs` for slides, `.reps` for the report a result was typed from).
  Rules: `HANDOFF.md` §5.
  The tab bar itself is rendered from **`TAB_GROUPS`** (`renderTabs`/`switchGroup`): 7 groups,
  each holding one or more pages, role-gated per page. Adding a page means adding it to that
  table — never add a hand-written `.tab` button back into the markup. Retiring a finished
  feature means removing its entry there and nothing else: the eB2B opening contest ended in
  Sep 26, so its group is commented out, while `ebView`, `renderEB`, `parseEB` and the stored
  `EB2B` data all stay and keep merging — put the line back and it returns with its history.
  **Every date / round / month picker carries ◀ ▶ step buttons** (`.dstep`, `selStep`/`dateStep`/
  `keyStep`/`ordStep`/`pjStep`) — the owner asked for the PJP one everywhere. ◀ always means
  *older* and ▶ *newer*, so a `<select>` whose options are filled newest-first (most of them, they
  use `.reverse()`) must carry **`data-rev="1"`**; one filled oldest-first (quarters) must not, and
  `#keySel` sets the flag per period in `initKeys`. `selStep` never reimplements a handler: it
  moves `selectedIndex` and dispatches `change`, so it is exactly a dropdown pick and **cannot
  touch data**. Prove both with **`node test/browser/datestep.test.cjs`** (72 checks, including a
  byte-for-byte comparison of every stored blob before and after every button on every page).
  The **💰 ราคา & ทุน** tab group (`renderPrice`/`renderCost`) reads the two monthly Unilever price
  files. Its rules are dense and were measured, not guessed — read `HANDOFF.md` §5 before touching
  any of it. The ones easiest to get wrong: a Unilever round runs **the 25th → the 24th**, not a
  calendar month (`prWindow`); **NTT must be read from the file, never recomputed** (the file rounds,
  by up to 0.08); the Cat Fee / S% rates are **derived per row** (`prRate`), never parsed from the
  header text, because U-Pro is not listed there; both files carry a **"เฉพาะแก้ไขเท่านั้น" / `_REV`
  sheet** that must not be read as the price list; `prPackBuy` takes **`promo`** because 31 items
  price the normal RSP per piece and the promo RSP per 3-pack; a margin that still cannot be
  unit-reconciled is flagged **`unsure`** and shown as "?" rather than published wrong; and
  `prBumRounds()` **matches the BUM discount columns to a Huasuer round by their numbers** instead of
  reading BM9/BM10 as "this/next month". The displayed product name comes from `prName` — the
  ORDERING-SYSTEM name (`oname`, 87.5% coverage) first, then the copy stored on the price record
  for the standalone public page, then brand+variant+size composed; showing only the file's
  variant column gave staff a bare `สีเขียว` they could not identify. The price maths is **copied verbatim into
  `public/pricelist.html`** (a standalone page cannot import from the app) — change one and you must
  change the other; the test compares both copies on every item in every round.
- `public/pricelist.html` — the PUBLIC customer price catalogue (hand-written, like `join.html`),
  reachable at **`/UnileverBDpricelist`** via the `rewrites` in `vercel.json`.
- `vercel.json` — `rewrites` only (the pretty links for the catalogue and the application form).
  Keep it to `rewrites`: `builds`/`routes` would disable Vercel's zero-config handling of `api/*`.
- `api/price.js` — manager upload + role-aware read of the two price files (separate blobs).
- `api/pricelist.js` — PUBLIC, GET-only, READ-ONLY, หัวเสือ prefix only. See the 🔒 section above.
- `build.cjs` — regenerates `public/index.html` from the template (run after every edit).
- `public/index.html` — generated output that Vercel serves. Do not edit by hand.
- `public/join.html` + `public/img/*` — the public shop-application page (hand-written).
- `public/vendor/jszip.min.js` — vendored (MIT), lazy-loaded only when a PO file is generated.
- `public/vendor/ocr/*` — Tesseract.js + its wasm core + the English model (Apache-2.0), ~8 MB,
  vendored on purpose and lazy-loaded **only** when the manager reads a report screenshot, so a
  blocked CDN can never break his monthly routine. Nobody else ever downloads it.
- `api/*.js` — Vercel serverless functions (ESM): `login`, `data` (read newest non-empty blob),
  `save` (manager save + gzip + mergeState + 8 backups), `request` (sales-only request write),
  `apply` (PUBLIC shop application → its own `bd-lead-*` blob), `leads` (manager-only read).
- `api/promoimg.js` — manager-only upload of one promotion slide to its own `bd-promoimg-*`
  blob (prefix in `lib/snapshot.js`). It never reads, merges or writes `bd-data-*`; only the URL
  it returns is saved into the state, by an ordinary manager save.
- `api/pjpvisit.js` — a salesperson records one visit to one shop on one day. Writes exactly
  `PJP.done["outlet|date"] = {v, by, at, tx?, f?}` (the tick, the note and the things to chase
  next time, all one record), checks the shop really is on that rep's route that day against the
  STORED plan (never the payload), takes `f` only from the known flag keys, and stores an erase
  as `v:0` rather than deleting the key.
- `api/plan.js` — a salesperson adds / edits / ticks off one planner task. Like
  `api/leadstatus.js` it writes exactly one key per call (`PLAN.items[id]`, `PLAN.done[id|date]`
  or `PLAN.del[id]`), decides ownership from the token and never accepts a whole state.
- `api/leadstatus.js` — a salesperson reports progress on a shop assigned to them.
  On that tab each shop also has copy / save-CSV / save-photo buttons so the rep can hand the
  shop straight to the admin who opens the customer account. Download filenames must stay
  ASCII (`fnAscii`) — Chromium drops a non-ASCII `a.download` name *and its extension*; see
  `HANDOFF.md` §5.
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
