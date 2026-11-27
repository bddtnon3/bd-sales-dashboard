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
The pages sit in **12 top-level tab groups** on the main site, gathered since 28 Nov 26 under
**4 big buttons** — 🛒 ซื้อเข้า (1st Sale) · 🚚 ขายออก (2nd Sale) · 🎯 งานเซลล์ · 📎 อื่น ๆ
(`TAB_SUPERS`, see "The tab bar itself" below) — (among them **📥 สถานะออเดอร์ (ซื้อ)**
between 🛒 การสั่งของ and 📦 สต็อก, and **📋 สถานะออเดอร์ (ขาย)** and **📦 ออเดอร์พิเศษ**, in that
order right after 💰 ราคา & ทุน) (`TAB_GROUPS`/`renderTabs`), several of
which open a row of sub-tabs. The per-page keys (`CURTAB`) did not change when the grouping was added —
see `HANDOFF.md` §5 before touching the tab bar. A 10th group, **🧾 DCODE**, carries `site:"admin"` and
exists only on the **admin site** (`/admin`, see "Admin site + DCODE" below).

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

## 🔒 Nothing in `public/` is hand-written, and nothing shipped carries our notes
The owner's rule, 26 Nov 26: *"ข้อมูลที่ผมคุยกับคุณผมไม่ต้องการให้คนใช้เว็บรู้เลย ให้เค้ามีหน้าที่ใช้งาน
และอัปโหลดไฟล์ กดดู Report ของตัวเองเท่านั้นก็พอ ข้อมูลบริษัทภายในที่เกี่ยวกับการบริหารเบื้องลึกที่มีแค่
คุณกับผมเท่านั้นที่รู้ได้ … ลบมันทั้งหมดในเว็บนี้"*. Two halves:

**① `build.cjs` strips every comment from the files it writes** (`cleanDoc`/`stripJs`/`stripCss`).
The deployed `index.html` used to carry **186 KB of comments, including 54 verbatim quotes of the
owner**, every measured figure and the reasoning behind every rule — all readable with View Source,
on the customer-facing catalogue too. The comments stay in the **sources** (`dashboard_template.html`,
`src/*.html`), which is where this project's knowledge lives; they just never reach `public/`.
`stripJs` is a real scanner (strings, template literals with `${}`, regex-vs-division), it **re-parses
every script with `vm.Script` afterwards**, and the build **fails loudly** — like `ANCHOR NOT FOUND` —
if a script stops parsing, a quoted note survives, or an HTML comment survives. Never replace it with
a regex: a URL's `//` or a regex holding `/*` would be eaten. Because of this step
**`public/pricelist.html` no longer contains the `จบส่วนที่คัดลอก` marker**, so `price.test.cjs` slices
the copied price maths out of **`src/pricelist.html`** while still checking the served file for leaks.
**② `public/join.html` and `public/pricelist.html` are now generated too**, from `src/join.html` and
`src/pricelist.html`. Edit the files in `src/`, run `node build.cjs`, commit both sides.

**And the UI itself says nothing about how the system works.** No role maps (who may edit what), no
storage or sync notes ("อยู่ในเครื่องนี้เท่านั้น", "ไม่ได้เก็บขึ้นเซิร์ฟเวอร์"), no method or
reasoning, no "เจ้าของ". A refused action says **"ดูอย่างเดียว"** or **"บัญชีนี้แก้ส่วนนี้ไม่ได้"** and
stops there. What stays is what the user must act on: which file to upload, what is missing, what a
number counts, and a short **(ประเมิน)** tag where a figure is an estimate — publishing an estimate as
fact would be the worse error. Tests must assert **behaviour, not narration**: the spord suite used to
check that the page *said* the allocation file is not uploaded; it now checks that the file really is
not in any request and that only the slip's own codes are sent.

**This protects users of the site, not the repository** — `bddtnon3/bd-sales-dashboard` is **public**,
so anyone who finds it reads the sources. Tell the owner that plainly rather than implying the notes
are now secret.

## Source of truth = `dashboard_template.html` (NOT `public/index.html`)
`public/index.html` is a **generated file** — never hand-edit it. The real source is
**`dashboard_template.html`** (one big single-file HTML/CSS/JS app). To change the app:
1. Edit `dashboard_template.html`.
2. Run **`node build.cjs`** — this regenerates `public/index.html` (server API-mode) **and
   `public/admin.html`** (the admin site, same file with `BD_SITE="admin"`), and fails loudly with
   `ANCHOR NOT FOUND` if an edit broke a string the build depends on.
3. Commit `dashboard_template.html`, `public/index.html` **and** `public/admin.html`, then push `main`.
   (`build.cjs` also regenerates `public/pricelist.html` and `public/join.html` from `src/` — commit those too when they change.)
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
  running **`node test/merge-safety.test.mjs`** (330 checks against the real `api/save.js`, the real
  `api/ordtrk.js` and the
  real `lib/snapshot.js`: old browser tab without a new field, new upload vs existing keys,
  empty/crashed client, fresh blob store, manager-vs-sales requests, PS tombstones, eB2B, PO
  status, DCI periods, MINSTOCK tombstones, KPI date-keyed rounds + `KPI.meta` + `KPI.del`
  tombstones, goods receipts from the centre (`PSI.rows`/`days` — a PSI export filtered to one day
  must not delete the days already read, a tab from before the section existed must not blank it,
  and a tab that never heard of the free-goods fields must not drop another key's `fr`/`dt`),
  the product master's per-code detail (`MASTER.det` — an old-format master upload must not erase the
  weights and case sizes the dcode file gave), the shared planner (`PLAN.items`/`done`/`del`), the monthly promotions and their prize
  money (`PROMO.items`/`res`/`del`), the PJP visit plan (`PJP.out`/`plan`/`done`/`cfg` — a new
  month must not erase the last one, a Master file must not delete a shop it stopped listing, an
  untick must not be undone by a stale tab, and a tab from before visit notes existed must not
  strip a rep's note off the record it shares with the tick), central stock (`CSTOCK.lots`/`del` and
  the in-app bill-cut slips `slips`/`sdel`/`ex` — a tab that submitted the slip before the shop file
  was attached must not delete that file, and uploading the file later must not wipe a note typed in
  between; and `alc`, the note saying which allocation file has already been read, which a tab from
  before that field existed must not blank and a stale tab must not roll back), the product master (`mergeMaster` — every upload takes effect, no code is ever lost), and
  the seed-republish path). It must print `ALL PASS`. Add a case for every new section.

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

## Reading the order form's fills — three encodings, not one
Excel writes the same colour three ways and the parser must handle all three:
`rgb="FF00FFFF"`, `theme=N`+`tint`, and **`indexed="15"`**. **SheetJS 0.18.5 silently discards
`indexed`** (`fgColor` becomes `{}`) and it cannot be recovered afterwards, because every
indexed fill then looks identical — so a closed order cell read as *open* for weeks.
`poUnIndex()` therefore rewrites `xl/styles.xml` (indexed → rgb, honouring the file's own
`<indexedColors>` palette, never touching index 64/65 = automatic) **before** `XLSX.read`;
this is why `parseOrderForm` is **async** and its callers must `await`.
A fill is matched by **colour family, not an exact hex** (`poIsCyan`/`poIsMag`/`poIsYel`, which
require real saturation), because Unilever also paints pale decorative fills on the entry cells.
Never go back to "any fill on the order cell means closed": an unrecognised colour is stored as
`xu` and **reported** (upload log + `psAudit` on the status page), never guessed at. For the same
reason `poClosedKind()` returns **null** for a colour that is neither cyan nor magenta, which also
repairs rounds stored by the old parser **at read time without rewriting them** — all five callers
must accept null. Quota comes from two markers (a yellow order cell with a cap, or a pale-pink
code cell `k=2`) and a cap that could not be read is shown as "ไม่ระบุ", never 0. Prove it with
**`node test/browser/ordercolor.test.cjs`** (46 checks, self-contained). Rules: `HANDOFF.md` §5.

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
`src/join.html` is hand-written and generated into `public/join.html` by `build.cjs`; `public/img/*` holds its
assets; `public/img/brand/*.png` are the individual brand logos shown grouped by category.
Keep the brands the owner excluded — Lipton, closeup, aviance, TONI&GUY, Unilever Food Solutions —
out of it. Opening hours are 08.00–17.00, Mon–Sat, closed Sunday.

## Admin site (`/admin`) + 🧾 DCODE (owner's order, 10 Nov 26)
*"สร้างเวปแยกใช้งานกันระหว่างเซลล์และแอดมิน แต่ข้อมูลยังส่งเชื่อมกันได้อยู่ … เวปแอดมินจะเอาแค่หัวข้อ
ยอดขาย การสั่งของ สต็อค ปฏิทิน … และเพิ่มหัวข้อนึง นั่นคือ DCODE"*. The old site is the sales team's.
- **One source, two outputs.** `build.cjs` writes `public/admin.html` from the freshly built
  `public/index.html`, changing only `const BD_SITE="main";` → `"admin"` and the `<title>` (each must
  occur exactly once). Never fork the code: same `/api`, same login, same `bd-data-*` snapshot, so an
  upload on either site is on both. `/admin` → `admin.html` via `vercel.json` `rewrites`.
- **Tabs:** `ADMIN_SITE_GROUPS` (`sales`,`order`,`stock`,`plan`,`dcode`) through `tabGrpOnSite`; every
  sub-tab inside those groups stays. The main site is unchanged except groups marked `site:"admin"`.
- **Gate:** the owner's rule is *"ใช้รหัสแอดมินเข้าได้เท่านั้น ที่ตั้งไว้ 4 คน รวมถึง manager ด้วย"* —
  `siteRoleOk(role,id)` admits role `manager` **and** a user id matching `ADMIN_SITE_USER`
  (`manager` or `admin<N>`, so admin1–admin4 today and a future admin5 by the naming rule, but not some
  other manager-role account added later), both on the login button (in `build.cjs` `LOGIN_API`, which
  passes the typed username) and on the remembered-token path (`bd_user.id`). `bd_token`/`bd_user`
  in localStorage are **shared by both sites** (same origin), so a refused rep must NOT be logged out
  and their token must NOT be overwritten — refuse in place. Server permissions are unchanged.
- **DCODE** generates `LmtOrderCreationExcel_YYYYMMDD_HHMM.xlsx` in dcode's own bulk-order template:
  one sheet `Sheet1`, header row `PO_NUMBER · OUTLET_CODE · PJP_CODE · SKU_CODE · CS · SH/SU · PC ·
  DT_CODE`. **Columns A–D and H are text-formatted (`@`, style 3) in the template — write them as
  shared strings, never numbers**; E–G are numbers (blank = 0); DT_CODE is always `15389839`
  (`DC_DT`). `dcXlsxParts` rebuilds every part from strings — styles.xml and the theme are
  byte-identical to the template (the test checks sha256) — minus the dcode staff names, the
  author's Windows path and the printer settings. The header's shared-string order is the
  template's (`SH/SU` is index 7). If dcode changes its template, re-read the new file; never guess.
- **Screen shows names, file gets codes:** outlet = Master Outlet col A (name shown), PJP = col AC
  (`/401842/` → `401842`) shown as the line `CT11 · ชลศิต`. `dcPjMap` matches a PJP number to a line
  by the **employee code (col Y = `DATA.lines[].emp`) first**, then the rep's first name (col Z):
  CT12 changed rep, so name-only matching loses it. Unmatched = "PJP <number> · <name>", never a guess.
  Picking an outlet fills its PJP (`pa:1`, follows later Master uploads); choosing a line by hand is
  `pa:0` and is never overwritten. SKUs come from stock (with balance) + the latest order form +
  Master Data.
- **`parseOutlet` stores `pj` + `emp` on the existing `PJP.out[code]` record** (no new section) using
  exact header matching (`pjColEq` — header Y is the truncated "พนักงานข", a substring of Z). It also
  fixed a real bug: a re-upload used to keep the OLD record unless the new row "scored" higher, so
  moved/renamed shops never updated (and a file with no new shop threw "ไม่พบรหัสร้านในไฟล์"). Rows are
  now compared only against duplicates **in the same file** (`old.up===now`); `rt` and coordinates the
  new file lacks are carried over; shops missing from the file are kept.
- **`MASTER` merges with `mergeMaster`** (was `pickBiggerMaster`, which refused a newer master with
  fewer items and let a stale tab roll an upload back): newer `up` wins the names, every code from
  either side is kept.
- **The DCODE rows are a device draft** (`localStorage bddc:<user>`, try/catch) — never synced, never
  in `bd-data-*`; the page is read-only over the shared state. Typing never re-renders the table
  (`dcRowSync`/`dcFootPaint`, so the caret stays); bulk edit/copy follow the bill-cut slip pattern
  (`.cst-bulk.stick`; a bulk button with nothing ticked warns; copying ticked rows moves the ticks to the
  copies). `dcCheck` blocks the file on a missing PO/outlet/line/SKU/quantity and asks first on
  inactive outlets, a line that differs from the outlet's, unknown codes and duplicates.
- Prove it with **`node test/browser/dcode.test.cjs`** (103 checks; 104 with the real outlet file via
  `DCODE_OUTLET=/path/Master_Outlet_Data.xlsx` — that file holds customer data and never enters the
  repo). Rules and the analysis of the real files: `HANDOFF.md` §5.

## Request-size limit (why the client gzips)
Vercel caps the request body (~4.5 MB) and the blob is several MB, so the client gzips the
payload (`CompressionStream`, header `x-body-gzip:1`, content-type `application/octet-stream`)
and `api/save.js` inflates it (`gunzipSync`). Do NOT set `Content-Encoding: gzip` (the edge would
auto-decompress and the server would double-read). Keep this scheme intact.

**A failed save must never be silent** (`_doSync` in `build.cjs`, owner 27 Nov 26: *"ช่วงนี้ผมใช้
เวปกดันเข้มข้นมาก จนถึงสิ้นเดือน ฝากดูเรื่องความต่อเนื่องของข้อมูลหน่อย อย่าให้ข้อมูลเต็มแล้วส่งไม่ได้
อีก"*). It used to print a bare `⚠️ บันทึกไม่สำเร็จ: HTTP 413` — no size, no cause, no next step,
and a `CompressionStream` failure was swallowed so an old browser posted 8 MB of raw JSON and
failed for ever without saying why. Now, in order: the **size is printed on every successful save**
(`_mb`), so the growth is visible before it is a problem; at **`SAVE_WARN` (3 MB gzipped)** the log
warns and **names the four biggest sections** (`_bigSecs`, which only stringifies again when it is
actually near the ceiling, so the normal path pays nothing); a **413 or a body over `SAVE_MAX`
(4.2 MB)** says it is over the cap, gives both figures and the biggest sections, and tells the user
not to close the page because the file just read is not saved yet; a **5xx or a network error
retries once** after 1.5 s, which is safe because `api/save.js` merges key-by-key so a repeat write
cannot double anything; and **401/403/409 are final answers and are never retried**. A browser with
no `CompressionStream` is told so instead of silently sending raw. Prove it with
**`node test/browser/savesize.test.cjs`** (15 checks). ⚠️ That test must build its oversized
fixture from **real random bytes** (base64 of `crypto.getRandomValues`), not a repeated string: the
thresholds are measured **after gzip**, and 3.6 MB of repeating text compresses to 0.01 MB, so a
lazy fixture tests nothing. ⚠️ `ANALYTICS` and the other sections are top-level `let`, so a test
that overrides one must assign **without `window.`** or it creates a second, unused variable.

## Staying logged in (why `bdPost` exists)
A login used to last 7 days with nothing to renew it, and `loadData()`'s 401→logout only runs at
page load — so a rep who leaves the app open on a laptop kept a page that looked fine and only
found out at the first **write**, as a bare `unauthorized` after keying 17 products. Three layers
now: `TOKEN_TTL` is 30 days (`lib/auth.js`; `api/login.js` must call `expiry()`, never inline the
number); **`api/renew.js`** re-dates a *still-valid* token on load, every 6h, on tab focus and
before a write (`bdKeepAlive`/`bdRenew`), so an always-open tab never expires; and **every sales
write goes through `bdPost`**, which on 401 renews and **retries once**, and only then asks for the
password in place (`bdReauthOpen`) and retries again — no logout, no page change, nothing re-keyed.
`api/renew.js` copies role/code/name from the **verified claims, never the body**, and refuses an
already-expired token. Cancelling the password box must leave the basket and draft intact and write
nothing, and the failure message must say what to do, not `unauthorized`. Retry **once** per press,
or requests double. Prove it with **`node test/auth-renew.test.mjs`** (15 checks) and
**`node test/browser/reauth.test.cjs`** (25 checks). Rules: `HANDOFF.md` §5.

## 🧑 Role `manager` is not one person — `admin1`–`admin4` share it
The owner found this himself on 26 Nov 26: he opened `/admin`, the avatar read **M** and the
manager-only 📊 รายงาน tab was there. Both were right by the code and wrong by his intent — the four
admin accounts carry **role `manager`**, so every `role === "manager"` check admits them, and the
avatar/role label was keyed on the role alone, so an admin was indistinguishable from the owner on
screen. Two separate fixes, and the distinction now has a name:
- **`bdOwner()`** = role `manager` **and** id `manager` — the owner's own account. **`bdAvOf`/`bdRoleOf`**
  render `A1`–`A4` / `แอดมิน 1`–`4` for the admins and `M` for the owner (used in the template's
  standalone login and in both of `build.cjs`'s injected login paths — all three must stay in step).
- **📊 รายงาน is the only thing gated on `bdOwner`** (`spRptOk`), because he said *"เฉพาะ manager
  เท่านั้นนะ"* when he asked for it. **Never swap `bdOwner` in for role `manager` in the admins'
  routine work** — bill-cut slips (`cstMgr`), the GIN check (`spAdmOk`), creating or editing an
  order (`spMgr`), uploads (`.admin-upload`), PJP settings (`pjIsMgr`), promotions (`pmCanEdit`) and
  `api/save.js` all have to keep admitting admin1–4, or four people stop being able to work.
- **The UI no longer claims who may see what.** Messages that said *"เฉพาะผู้จัดการเท่านั้น"* while
  admins in fact had access now read **"บัญชีนี้แก้ส่วนนี้ไม่ได้" / "บัญชีนี้เปิดส่วนนี้ไม่ได้"**,
  which is both true and the house rule against role narration.
- **Still shared with the admins — the owner decided this, 26 Nov 26.** Asked whether the BUM cost
  file should be locked to his own account, he answered **"ปล่อยไว้ได้เลย"**: admin1–4 keep it.
  **⚠️ Updated 28 Nov 26 — the cost file moved SITE, not role**: *"ในเวปของเซลล์ให้เอาข้อมูล bum
  ออกไปนะ ใส่แค่หัวเสือก็พอ"*. 📉 ต้นทุน now carries `site:"admin"` (a new per-tab check in `tabOk`),
  the price group joined `ADMIN_SITE_GROUPS`, and `peBumOk` requires `bumSiteOk()` — so the BUM view,
  the 📕 chip on รายการสั่งก่อนหมดโปร and 🎁 ของแถมตามโปร all live on **/admin only**, while the main
  site keeps the หัวเสือ catalogue. The same four people still open it, just on the admin site, so
  this is a workspace split and **not** a permission change; `api/price.js` is untouched, and the
  page falls back to the หัวเสือ comparison rather than claiming the account cannot open it.
  So the BUM view (`peBumOk`, and `api/price.js` returning `bum` to any role `manager`),
  วิเคราะห์การสั่งของ, the auto-PO calculator and the DCI page stay **role-gated, not owner-gated**.
  **Do not "fix" this later** — it is a decision, not an oversight. If he ever reverses it, the
  server check in `api/price.js` must change too; hiding the page while the browser still receives
  the data would be theatre.

## Accounts
`lib/accounts.js` is the only real account list (passwords never reach the browser; any one can be
overridden with `PASS_<USER>`). It holds `manager`, the 12 sales lines, **`admin1`…`admin4`**, and —
since 18 Nov 26 — **`wh1`…`wh4` (ทีมคลัง, role `wh`)** and **`ds1`…`ds4` (ทีมสายส่ง, role `ds`)**,
and — since 24 Nov 26 — **`sup` (หัวหน้าเซลล์, role `sup`, one account: the owner said *"เพิ่ม sup
แอคเค้าเดียวพอ"*)**, same `bd@<user>` scheme. Those three roles are **neither `manager` nor `sales`**: they cannot save
state at all (`api/save.js` takes only `manager`); `wh`/`ds` can only tick their own step of a
special order through `api/spord.js`, and `sup` can only write one promotion at a time through
**`api/promo.js`** (plus a slide through `api/promoimg.js`). `tabOk` therefore **denies a team role
every tab that does not name it** — the old rule let any ungated tab through, which would have shown
the warehouse the whole site — so a tab a team role must see needs an explicit `role:[…]` array, as
the two promotion tabs now carry. Each lands on its own page at login, not `sales` (`TEAM_HOME`:
`wh`/`ds` → `spord`, `sup` → `promo`). 26 accounts in all
(`bd@admin1`…`bd@admin4` — the owner set the scheme himself and asked for it to run 1-4 in step, so
**keep adding them as `admin<N>`/`bd@admin<N>`**, never a one-off name; the same goes for
`wh<N>`/`ds<N>`). admin 1 keys the bill-cut
and admin 2 keys where the bills went; 3 and 4 were added on 6 Nov 26 with no job named yet, so
their display names are deliberately plain.
All four are **role `manager`**, which is what they had before as shared users of the `manager`
login; the gain is that every record now says **who keyed it** (`by`/`byName`). The client-side
`ACCOUNTS` block in the template is only for the standalone build, and `build.cjs` replaces it by
matching that exact text — change one and you must change **all three** (`lib/accounts.js`, the
template block, `build.cjs`) or the build fails with `ANCHOR NOT FOUND`.
Prove logins with **`node test/auth-renew.test.mjs`** (74 checks — all four admins, all eight
team accounts and the supervisor log in, a wrong password is still refused, the 12 sales lines stay role `sales`, the
team accounts carry no `code` so they cannot key an order for a rep, role `manager` stays at
exactly 5 accounts, and no password is in `public/index.html`).

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
  Each shop card is **two boxes, never one list of mixed chips**: 📊 ยอดขาย then 🎯 KPI.
  The sales line is **this month to date vs last month** (`pjSalesNow`/`pjSalesHtml`) and reads
  three sources in order of trust — the monthly by-store file, วิเคราะห์เชิงลึก, then
  **`STOREDAILY`** (`pjDailyIdx`), which is the only one that has the *current* month, because the
  monthly files arrive once a month. When the figure comes from daily bills it counts **to the last
  uploaded day, not to today**, and says so, or a few un-uploaded days make the pace look terrible.
  Distinguish all three of `ไม่มีข้อมูล` / `ยังไม่เปิดบิล` (a real 0) / a figure: a month that IS in
  the file with no row for that shop is a real 0. This is a different question from the 🔻ยอดตก /
  🛑ไม่ซื้อ chips, which must keep comparing **completed** months through `pjSales`, or every shop
  reads "ยอดตก" on the 1st — so **every chip carries its month name**, since the two comparisons can
  point opposite ways on the same card. The KPI box shows **what the shop has already passed**, not
  only what is outstanding (`pjKpi`, `ok: true/false/null`): `null` means no data and must never be
  counted or shown as a failure — with the eB2B contest file finished, an empty `EB2B` used to brand
  every eRTM shop "ยังไม่เปิด" (`pjEbHave` now guards it). Unilever's call to action stays **visible
  on the card**, never behind the expander. The expand state lives on the non-synced `PJ.kpi`.
  The month calendar is clickable like the planner's:
  **`PJ.ym` (month shown) is separate from `PJ.d` (day selected)**, every cell opens its shop list
  inline — including days with no plan, which `renderPjp` used to snap back — and in a calendar view
  ◀ ▶ step the month while the day view still hops to the next **planned** day. Prove it with
  **`node test/browser/pjpcal.test.cjs`** (58 checks, self-contained).
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
  `mergeState`. **Column positions come from the header text (`kpiCols`), never from fixed
  indices** — a hard-coded `r[16]` read the `%Ghost` column instead of the Ghost COUNT for two
  months and showed 0.14% where the file said 11.25%, so every line passed. A header it cannot
  find throws and stores nothing, and the computed `ghost/orders` is cross-checked against the
  file's own `%Ghost` column on every upload. The ceiling is **`KPI_GHOST_MAX` = 10%**, which is
  what the file itself states twice; it was 15% with no source. Rounds already stored with the
  fraction are repaired **at read time** in `kpiRows` (`kpiGhost`) and never overwritten. Prove it
  with **`node test/browser/kpi.test.cjs`** (21 checks, self-contained). Rules: `HANDOFF.md` §5.
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
  The **📅 รายการสั่งก่อนหมดโปร** sub-tab (`renderPromoEnd`/`peDiff`/`poPromo`) answers the thing
  the owner called *"เรื่องใหญ่ของทุกเดือนเลย ศูนย์จะต้องมานั่งเช็คเอาเอง"* (25 Nov 26): Unilever
  cuts the promo round **on the 25th**, so some products lose their promo and others gain one, and
  the depot has to stock up on **21–24** before the cut. The promo terms are written **inside the
  two product-name cells of the order form**, mixed in with the name — there is no separate column
  (`cc+8`/`cc+9` looked like one but is the NEXT block's name cells, since blocks are 11 columns
  apart). `poPromo` reads that text into the owner's two categories plus FTR, each pattern taken
  from his real 24 and 25 Nov forms:
  **🟡 On Invoice** — `On-inv 6F1` (free goods) and `On-inv W% 152.64` (baht off per case);
  **💸 Off Invoice** — `F/O 45B.`, `Rebate`, `BBF 12F1`, `F/P`; **⚡ FTR** = fighting rate.
  **The yellow band on the name cell is exactly the On-invoice FREE-GOODS case** — measured on the
  25 Nov form: 34 banded codes, all 34 carry `On-inv <n>F<m>`, none missed. Measured 24 → 25 Nov:
  On-inv free goods 51→36, On-inv W% 458→436, Off-invoice 529→463, FTR 176→112, and
  **113 codes lost every promo, 31 gained one, 91 changed terms**.
  Some rows state their own window — `(25ตค-24พย)` — which is **how the depot can know before the
  25th**: `pmWinEnd` turns it into a date (49 rows on the 24th, 33 on the 25th, so it covers only
  part of the list, and a month it cannot read returns **null**, never today).
  **POSTATUS stores the RAW promo text** (`items[code].pm`), only for codes that actually have a
  promo, and the parsing happens at read time — so improving `poPromo` later re-reads old rounds
  correctly without re-uploading, the same rule as `poClosedKind`. Measured on the real forms:
  ~850 codes and ~60 KB per round. The page is **strictly read-only** over POSTATUS/ORDERS/STOCKD
  with its state on the non-synced `PE`.
  **A round uploaded before the promo reader existed holds no `pm` at all, and the page must SAY
  SO** (`peHasPm`) — the owner opened it the day it shipped, saw `0 · 0 · 0 · 0`, and asked
  *"ไฟล์อยู่นี้ ว่าแต่ทำไมในเวปไม่ขึ้นเลย"*. Re-reading at read time cannot help here: the text was
  never stored, so the only fix is re-uploading that day's blank form once. The banner names the
  rounds affected and says the data is not lost. **A silent 0 on this page always means that**, so
  never render one.
  **Reading the order form answers the question too late** (owner, 25 Nov 26: *"ให้ใช้ข้อมูลจาก
  ไฟล์ bum ในการดู ว่าตัวไหนที่จะหมดโปร เพราะเดือนหน้า 25 ธันวา … ผมก็จะไม่รู้เลย … จนกว่าจะได้รับ
  ใบสั่งซื้อ นั่นหมายความว่าผมก็สั่งในวันที่ 24 ไม่ทันแล้ว"*). So the page's **primary** view is
  **📕 เช็คจากไฟล์ BUM** (`peBumPair`/`peBumOf`/`peBumDiff`/`peBumHtml`), and for a manager holding a
  BUM file it is what the page **opens on** (`peSec()`; `PE.only` starts `""` = not chosen yet).
  The BUM file **already carries two rounds in one file** and `parseBUM` has always stored both —
  `tpr`/`on`/`rb` is the file's own round, `p9tpr`/`p9on`/`p9rb` the previous one — so the analysis
  needed **no re-upload**: it works on the BUM already in the blob. Which stored block is older is
  decided by **`prBumRounds()`**, never by reading `BM11`/`BM12` as "this/next month" (BM wraps
  12 → 1). Measured against the owner's real `BUM_DT_Dec26.xlsx` (1,708 items, Non Cust sheet):
  **BM12 = หัวเสือ Dec'26 — W% matches 99.8%, TPR 100.0%**, so the pairing is sound.
  **Never substitute the หัวเสือ file for this.** On the same round pair (Nov'26 → Dec'26) BUM sees
  **97 codes lose every promo, หัวเสือ sees only 49, and just 25 overlap** — หัวเสือ's single `W%`
  column merges on-invoice with rebate and drops some rebates entirely (the two agree on only 84.1%
  of codes). Only BUM splits the three channels, measured BM11 → BM12: **TPR −37/+63 · W%On
  −18/+27/16 changed · W%Rebate −115/+90/2 changed**, and in money **340 codes differ: 179 are
  cheaper this round (the 21–24 stock-up list), 161 cheaper next**. The money column is
  `(old total) − (new total)` per case, which reproduces the file's own `Diff` block (AH/AI/AJ =
  **prev − now**, 1,705/1,708) and its two printed verdicts, *ซื้อรอบนี้ราคาดีกว่า* /
  *ซื้อรอบถัดไปราคาดีกว่า*. A total summed across different SKUs is meaningless, so the cards show
  the **largest single ฿/หีบ gap**, never a sum. **BUM is the depot's cost file, so this view is
  manager-only inside the function** (`peBumOk`), not by hiding a button.
  `parseBUM` additionally captures, purely by appending (`PB_F` may only grow — an older stored
  array must keep working and yields `undefined`): the block labels (`bm.new`/`bm.old`) and one
  `ex` record per code holding the file's own **W% promo window** (`AO`/`AP`, text `dd/mm/yyyy`, not
  a serial — 278 rows, `01/12/2026–31/12/2026`, Invoice Type ON 60 / OFF 218) and its **BBF free
  goods** (`AU` buy / `AX` free — 24 rows). Only rows that have something are stored (302 of 1,708,
  +184 KB). A BUM uploaded before that exists still computes every discount and **says so**, asking
  for one re-upload, rather than quietly showing no terms.
  A second chip, **🏷 เทียบไฟล์หัวเสือ** (`pePrRounds`/`pePrDiff`/`pePrHtml`), is kept because the
  หัวเสือ file carries **four** round blocks at once (Nov'26 · Dec'26 · Jan'27 · Feb'27, all fully
  populated) and so can look further than BUM's two — but it must keep saying out loud that its W%
  merges on-invoice and rebate and that it sees less than BUM.
  Both work **with no order form at all**, which is the whole point. Prove it with
  **`node test/browser/promoend.test.cjs`** (56 checks, self-contained with made-up codes; 58 with
  the real forms via `ORDER_BLANK_A=…/ใบ24.xlsm ORDER_BLANK_B=…/ใบ25.xlsm`, which never enter the repo).
  Note the real BUM file is ~28 MB with a 239 MB `sheet1.xml`: the browser parses it in ~45 s and
  ~650 MB of heap, so never load it into a test by spreading its bytes into a JS array.
  **การสั่งของ** has five sub-tabs (`ordSetSec`): sales requests / order form / Drop / auto-PO /
  **📅 รายการสั่งก่อนหมดโปร**. A sixth,
  **📊 ประวัติการสั่งของ** (`renderOrdHist`), was lifted out on 27 Nov 26 at the owner's request
  (*"ให้ย้ายหมวด ประวัติการสั่งของ ขึ้นมาแยก ให้ไปอยู่ข้าง ๆ ภาพรวมสั่งของ และวิเคราะห์การสั่งของ"*)
  and is now its own tab `ordhist` in the 🛒 การสั่งของ group — the page itself did not change,
  it already drew into its own `#ohBody`; what moved is the `<div>` and the `TAB_GROUPS` entry, and
  the old `hist` sub-tab button and `ORD_SECS` key went with it so there is only one way in. It is
  the month-at-a-glance table that replaces the Excel the
  depot's sales contact emails every week. The owner gave the mapping himself and it reproduces his
  file to the satang: **1st Order = CON Confirm × 0.85** (`ohVal`), **1st Order − Drop = that minus
  the Drop file's `dropVal`**, **2nd = the day's `DATA.daily` summed over every line** (`ohSale`).
  A day with no order file is `null`, never 0 — but a daily-sales file that says 0 IS a real 0, and
  the two must keep rendering differently. The −15% figure is an **estimate**, not an invoice total,
  and the page must keep saying so. The file's fourth column, **BI Report (NIV)**, comes from
  Unilever's own BI report, which the app has never been given — leave it out rather than guess it
  from the numbers we hold. **What the page DOES carry since 27 Nov 26 is 📥 ของเข้าคลัง (NIV)**
  (`psiCrIdx`/`psiCrOf`, owner: *"ทำให้ยอดโชว์สรุป NIV จากวันที่คลังรับเข้า ไปขึ้นโชว์ในรายงานหน้า
  ประวัติการสั่งของ … มันจะตรงวันที่กับยอด Delivery ในตารางพอดี"*), read from the PSI file.
  **It is keyed on the centre's INVOICE date (`cr`), not the warehouse's receiving date** — measured
  against his own spreadsheet, receiving-date keying is shifted a day, splits across days and
  matches nothing, while invoice-date keying lands on the same row and the same figure:
  16 Nov 765,785.00 vs his 765,785.09 · 18 Nov 1,409,364.00 vs 1,409,360.65 · 20 Nov
  2,208,447.00 vs 2,195,118.63 · 24 Nov 2,764,061.00 vs 2,759,043.54. **It is still not the BI
  report and the page must keep saying so**: his BI column carries negative rows (returns and
  credits, three of them that month) which the PSI file does not have at all, so this is "what
  reached our warehouse", a different thing that happens to land within 0.0–0.6%. A day with no PSI
  file covering it (nothing read up to that day + 2, since goods arrive same-day or +1) shows a
  dash and is counted in a banner, never a 0. **Everyone can open the page** (the owner asked for that explicitly,
  even though the CON Confirm card on ภาพรวมสั่งของ is manager-only), and it is read-only over
  ORDERS/DATA with the month on the non-synced `ORD.hm`. Prove it with
  **`node test/browser/ordhist.test.cjs`** (35 checks, self-contained, made-up figures — the repo
  is public, so never commit the depot's real revenue).
  The manager's combined request table (`renderSalesRequests`) carries a **line filter** of chips
  (`rqTog`/`rqOnly`/`rqAll`). It stores the lines **switched off** (`ORD.rqOff`), not the ones
  selected, so a line that starts sending requests tomorrow appears by itself; it lives on the
  non-synced `ORD` and is cleared whenever `ORD.date` changes, so a filter can never look like
  lost requests. Totals, the per-code line tags and the per-rep cards below all recompute from the
  selected lines only, and a filtered table says so in a banner — the combined total is what the
  real order form is typed from, so it must never quietly show a partial sum. Prove it with
  **`node test/browser/reqlines.test.cjs`** (31 checks).
  A salesperson's own request (`openReqModal`/`reqAdd`/`submitRequest`) is a **basket with one
  submit**: adding an item must NEVER clear the search box or drop the row out of the results —
  it flips to `✓ ในตะกร้า` and tapping again removes it. Losing the list on every tap is what made
  the team send one product at a time (8 round-trips ≈ 10s and 8 blocking `alert()`s = "เครื่องค้าง").
  The search is debounced and `reqWarn` is memoised, because `poWhy` ran 25× per keystroke.
  The un-sent basket is a **draft in `localStorage`** (`bdreq:<user>:<round>`) — deliberately NOT
  part of the synced state, so it can never touch `bd-data-*`; it is cleared only after the server
  answers ok, and every access is wrapped in try/catch for private-browsing mode. `pushRequest`
  updates the screen **only after** the server accepts. Prove it with
  **`node test/browser/sreq.test.cjs`** (39 checks; it must load the page over a real origin,
  not `setContent`, or localStorage is blocked). Rules: `HANDOFF.md` §5.
  Under it sits its twin, **🚫 ขอแล้วสั่งไม่ได้** (`renderReqBack`/`rbScan`/`rbRoundAt`): the sales
  requests that could not be ordered at all because the form had the row **greyed (ของขาด)**, filled
  cyan (ยังไม่เปิด) or missing — carried forward every day until the round opens again, because the
  owner kept losing them ("พอถัดมาอีกวัน มันสั่งได้แล้ว ผมเลยหลุดเคสแบบนี้บ่อย"). The two lists must
  stay separate: Drop ค้าง is *ordered but not delivered*, this is *never orderable in the first
  place*. The reason is read with **`rbRoundAt`, the round nearest the request date — never
  `poRoundFor`/`ordServedAt`**, which judge a request against the LATEST round and therefore turn
  "it was grey that day" into a bland "ศูนย์ไม่ได้สั่ง" the moment the row reopens; that erasure is
  the bug. Whether it can be ordered **now** is a second, separate question answered from the latest
  round (`dbBlock`), and those rows get a green banner at the top. `dropped` (magenta, discontinued)
  is never carried — it is counted and reported as "ไม่ต้องรอ". The chase for "has it been ordered
  since?" passes `incl=true` to `dbChase`, because a rep asks in the morning and the depot orders
  the same afternoon — Drop ค้าง must keep its strict `>`. Read-only over
  ORDERS/POSTATUS/STOCKD/REQUESTS like its twin. Prove it with
  **`node test/browser/reqback.test.cjs`** (30 checks, self-contained).
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
  **A missing Drop file means two different things** and the app used to know only one of them:
  Unilever sends no file at all in a round with no drops, so the page sat at ⏳ รอผล Unilever for
  ever (owner, 23 Nov 26: *"บางรอบก็ไม่มีสินค้า drop เลย เค้าจะไม่ส่งไฟล์มาให้ แต่สถานะในเวปเราก็จะ
  ไม่ขึ้น ช่วยทำปุ่มให้ติ๊กหน่อย"*). The admin now confirms it himself with a button **inside the
  ❌ ใบ Drop admin box, beside that day's file chip** (`ordNoDrop`/`ordNoDropOf`), which stores
  `ORDERS.data[d].noDrop = {at,by,byName}` **and sets `dropped={}` + `hasResult=true` + `dropVal=0`**
  — so every page that reads drops (the product search, คำขอสินค้า, Drop ค้าง, ประวัติการสั่งของ)
  is already right without knowing the field exists; **never add a `noDrop` branch to those pages**.
  Only the Drop tab and the status chip read it, to say *"ไม่มีของ Drop"* instead of showing an
  empty table that reads as a broken page. Three rules: a day that **already has a Drop file cannot
  be ticked** (the ✕ must delete the file first, or one button would silently drop real rows);
  uploading a real file afterwards **clears `noDrop`** (both writers — `parseDrop` and the
  `kind==="drop"` path — plus `deleteDrop`); and the tick is manager-only **in the function**, not
  by hiding the button. `noDrop` is a field on the day record, which `mergeState` merges whole
  (`keyMerge` per date), so it is not a new section.
  **A blank form uploaded today must beat the round the centre last ordered on** (`poRoundFor`,
  owner 25 Nov 26: *"ผมอัพของวันที่ 25 ผมต้องการให้หน้าการสั่งของเซลล์ ขึ้นอัพเดตด้วยเลยในวันนั้นๆ"*).
  In the morning the centre has not ordered yet, so `ordServedAt` returned yesterday's round and it
  won over the form just uploaded. The rule now prefers a POSTATUS round that is **newer than
  `served` and not after the request date** — which leaves the original case (rep asks on the 16th,
  centre orders on the 17th) alone, because the replacement must be ≤ the request date. It carries
  the **same `PO_NEAR_DAYS` distance guard** as the fallback branch; without it a form left over
  from months ago answers today's question (the reqback suite catches exactly that). Uploading a
  blank form also repaints the open pages (`psRefresh`). Prove it with
  **`node test/browser/reqback.test.cjs`** (30 checks). Prove the Drop tick with
  **`node test/browser/nodrop.test.cjs`** (33 checks, self-contained) plus the `noDrop` cases in
  `merge-safety`.
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
  Unilever promotions and the per-route results. **It tracks each promotion against the dcode daily
  sales file** (owner, 24 Nov 26: *"ผมจะให้ supervisor ประจำศูนย์ เข้ามากรอกทุกต้นเดือนข้อมูลรหัสสินค้า
  ในแต่ละโปรโมชั่น เพื่อให้ระบบตามแทรคยอดขายรายสาย และจำนวนการกระจายของแต่ละโปรโมชั่นได้"*): the
  supervisor types each promotion's **main codes and free-goods codes** (`prod[].k` = `"m"`/`"f"`;
  an old record with no `k` reads as main), its **date range** (`d1`/`d2`, empty = the whole month)
  and a **minimum pieces per shop** (`min`), and `pmTrack` then reports per line — pieces, cases,
  free goods, shops reached, and **shops that bought at least `min`** (the owner chose that
  definition of "กระจายสำเร็จ"). Four rules, each measured against the owner's real file
  (`Sales_15-23112026.xlsx`, 7,902 rows, 8 days) before it was written:
  **free goods are a different column** (`Free Quantity in Aggr.CS/PC`) — 713 rows are free-goods
  only, with sale qty and NIV at 0, so reading the sale column loses them entirely;
  **(day·line·code·shop) is 7,810 tuples in 8 days**, about one per row, so the index stores
  **only codes that are in some promotion** (`pmCodeSet`) — never every code, or the snapshot grows
  by megabytes a month and hits Vercel's request cap;
  **shops are counted distinct over the whole range** (151 of 7,674 code·shop pairs buy on more
  than one day), never by summing daily shop counts; and
  `PROMO.sales` is keyed **`"YYYY-MM-DD|lineKey"`**, the granularity one upload writes, so a
  filtered export covering one line cannot delete the other eleven lines' readings — the same rule
  `parseDailyDcode` follows for `DATA.daily`. What is **not** known is said out loud: days in the
  range with no sales file yet, and codes added after the file was uploaded (which need that
  period re-uploaded), are both listed on the card rather than rendered as a silent 0.
  **A second source answers "how many went out?"** (`PROMO.ord`, the owner on 27 Nov 26: *"ทำไมมัน
  ไม่ขึ้น report รายงานว่าขายไปกี่ชิ้น ลองจับจากไฟล์ยอดขาย / allocate / transaction ได้ไหม"*). Of the
  three files only two carry product codes, and the Transaction Inquiry file is header-level, so it
  cannot. The **allocation file can** — one row carries date · line · shop · product · quantity — so
  `parseAlloc` now also writes `PROMO.ord["YYYY-MM-DD|lineKey"]`, the same shape and the same
  `pmCodeSet` filter as `PROMO.sales`, keyed with **`dsLineKey`** (`209611`, not the displayed
  `CT11`) or the two maps would not meet. Three rules: it is a **separate map and the two are never
  added** — the allocation file dates a row by the order's creation day and the sales file by the
  invoice day, which measured agree on only 46.7% of orders, so one sum would count an order twice;
  the page therefore shows them as **two columns**, ทำได้ (from bills) and **📦 คีย์ขายไปแล้ว** (what
  the reps keyed), and says in as many words not to add them. Quantities go through `alPcs`, so a
  row whose pack size cannot be read is **counted and reported, never guessed at 1**. And it is
  accumulated **before** the line that skips rows with no GIN — goods keyed but not yet picked have
  still been keyed. When the sales file covers no day of the range the table says so out loud and
  points at the other column, instead of leaving a page of zeroes that reads as "sold nothing".
  `api/promo.js` writes **one `PROMO.items[id]` per call**, rebuilds the record field by field
  (so nothing unexpected can be smuggled into the state), takes `by`/`byName` from the verified
  claims, **never touches `PROMO.sales`** — a promotion must not be able to delete a month of sales
  readings — and only a `manager` may delete. Prove it with
  **`node test/browser/promotrk.test.cjs`** (70 checks, self-contained with made-up codes; 73 with
  the real file via `DCODE_DAILY=/path/Sales_....xlsx`, which never enters the repo). Seven promotion types share one record shape
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
  **`node test/browser/ocr-promo.test.cjs`** (36 checks, needs `npm i --no-save playwright-core`;
  40 with the reps’ real order screenshots via `SP_OCRSHOT=`, which never enter the repo).
  Slide images and report screenshots both go to their own `bd-promoimg-*` blobs
  via `api/promoimg.js` — never into the state; the state keeps only the URL
  (`PROMO.items[id].imgs` for slides, `.reps` for the report a result was typed from).
  **Each promotion opens a 📊 Report รายสาย** (`pmTrackHtml`/`pmRepRows`/`pmShopRow`), rebuilt
  26 Nov 26 to the shape of the Excel the reps have always read — **สาย · เป้า (ร้าน) · ทำได้ ·
  %Achieve · ส่วนต่าง · เงินรางวัล** and nothing else; the owner asked for *"ทำเทมเพลตออกคล้าย ๆ เดิม
  … แค่ทำให้ดูสะอาดตา และ Text น้อยกว่านี้"*, so the old `📊 ผลงานรายสาย` table below it was removed
  rather than left to say the same thing twice. **ทำได้ is computed live** from `PROMO.sales`: the
  number of shops that bought the main codes up to a **threshold that comes from the prize step**
  (`pmSteps` — `pay[].pcs`, e.g. บรีส 9 ชิ้น / 15 ชิ้น), so the step chips re-count the whole table.
  **เป้า always prefers the official figure** the manager pasted in (`PROMO.res[...].tgt`); only when
  there is none does it fall back to `tgtPct% × pmMP(route)` and it is then tagged **(ประเมิน)**.
  That fallback is a fallback **on purpose**: measured against the owner's real files, CT11 has
  **239 active M&P shops** while Unilever's own report set that route's target at **77 in one round
  and 82 in the next** (31% and 34%) — the target is allocated per round, not derivable, so the page
  must never present the computed number as fact. Prize money works the same way: the official
  `money` wins, otherwise "reached 100% of target ⇒ that step's `sm`", tagged (ประเมิน). A rep's
  **promo card** shows the same live figure for their own line when no official report exists yet,
  because the owner's purpose for all of it was *"ไว้ให้เซลล์ตรวจสอบยอดเงินรางวัลของเดือนนั้น ๆ"*.
  Tapping a route expands **the shops themselves** (`rows[ln].sh`, which `pmTrack` now returns —
  in memory at render time, never stored): shops that have **not** passed come first with
  *ขาดอีก N ชิ้น*, since that is the list a rep acts on, capped at `PM_SHOPMAX` (60) inside a
  scrolling box because one route has hundreds of shops.
  **`pmMP` counts M&P shops per route from `PJP.out`** (`t` = Outlet Subtype Name, `rt` = route) and
  memoises. Its status test must be **`/^active$/`** — `/active/i` matches *"Inactive"*, which
  silently counted closed shops and inflated every estimated target.
  **The month's promotions are seeded from `PROMO_SEED`**, read off the slides Unilever sends;
  November 2026's seven are in there (Hit of the Month วาสลีน · BW Extra ซิตร้า FO79 · HC Extra
  บรีสลิควิด FO20 · Eco Trophy คอมฟอร์ท FO39 · Digital Flash คอมฟอร์ทเพียวแฮปปี้ · Happy Slot
  ซิตร้า · Flash Deal ลักส์). The import is **per month** (`pmSeedLeft(m)`/`pmSeedLoad(m)`) and
  `pmMonths()` includes seed months, so a month nobody has imported yet can still be selected —
  it used to hard-code `PROMO_SEED[0]` and offer October for ever.
  Rules: `HANDOFF.md` §5.
  The tab bar itself is rendered from **`TAB_GROUPS`** (`renderTabs`/`switchGroup`): 11 groups,
  each holding one or more pages, role-gated per page. Adding a page means adding it to that
  table — never add a hand-written `.tab` button back into the markup. Retiring a finished
  feature means removing its entry there and nothing else: the eB2B opening contest ended in
  Sep 26, so its group is commented out, while `ebView`, `renderEB`, `parseEB` and the stored
  `EB2B` data all stay and keep merging — put the line back and it returns with its history.
  **🎁 โปรโมชั่น & เงินรางวัล was hidden the same way on 18 Nov 26 and brought back on 24 Nov 26**
  with the tracker above — nothing had to be restored, because hiding only ever removed the entry
  from this table. Its two pages carry an explicit `role:["manager","sales","sup"]` array, which
  `tabOk` needs for a team role to see them at all. The dcode test counts the main site's groups,
  so that number moves with this list.
  **🗂 Above it sit four big buttons** (`TAB_SUPERS`/`tabSupOf`/`switchSuper`, `#tabSup`), because
  12 groups in one row no longer fitted on anything (owner, 28 Nov 26: *"ตอนนี้หมวดด้านบนสุดมันเยอะ
  มาก ช่วยจัดเรียงหน่อยได้ไหม เสนอมาก่อนว่าจะจัดแยกแบบไหนดีให้ไม่งง ใช้ข้อมูลที่แจ้งไป"*; he chose
  this of the options offered). **The split is his own vocabulary** — 🛒 ซื้อเข้า **1st Sale**
  (การสั่งของ · สถานะออเดอร์ (ซื้อ) · สต็อก) · 🚚 ขายออก **2nd Sale** (ยอดขาย · สถานะออเดอร์ (ขาย) ·
  ออเดอร์พิเศษ) · 🎯 งานเซลล์ หน้างาน (PJP · KPI · โปรโมชั่น · ร้านใหม่ · eB2B) · 📎 อื่น ๆ
  (ราคา & ทุน · ปฏิทินงาน · DCODE) — the same two words `saleScopeHtml` teaches on the two
  order-status pages, so the tab bar and those banners cannot contradict each other.
  **Nothing was removed: all 12 groups are still there**, one level down. Four rules:
  the lit button is **derived from `CURTAB` through `tabSupOf`, never stored** (a separate variable
  would disagree the moment anything else switched page — this is the opposite of the `PJ.ym`/`PJ.d`
  and `SP.cm`/`SP.day` cases, which really are two questions); a group that is in no bucket falls
  through to **อื่น ๆ**, so adding one can never make it disappear; a bucket with nothing left for
  that role or that site is **not rendered at all**, and with fewer than two buckets the row hides
  itself; and the calendar's red badge is written to **both** `#planBadge` (the bucket) and
  `#planBadge2` (the group), or outstanding work would be hidden one level down.
  📱 On a phone the row is a **2×2 grid, not a scrolling strip** — measured at 390px, the fourth
  button sat half off the right edge, and this is the top level of the whole site's navigation.
  **🖱 NO TAB ROW ANYWHERE MAY SCROLL SIDEWAYS — it wraps** (`.tabs`/`.tabs2`/`.seg` are
  `flex-wrap:wrap`, owner 29 Nov 26 after an admin could not reach the right-hand groups on a
  Windows desktop: *"เป็นเรื่องสำคัญมากเวลาทำอินเตอร์เฟส ให้คนในคอมใช้ ส่วนใหญ่เค้าใช้วินโดวส์
  ไม่มีแทร็กแพด เขาเลื่อนซ้ายขวาเหมือนที่ผมใช้ไม่ได้ ผมใช้แมค M1"*). All three rows used to pair
  `overflow-x:auto` with a **hidden scrollbar** (`scrollbar-width:none` +
  `::-webkit-scrollbar{display:none}`), which on Windows with a plain mouse means there is **no way
  to scroll at all**: no bar to drag, the wheel only moves vertically, no two-finger swipe. It works
  on a Mac and on a phone, which is why nobody saw it. Measured on the flat 12-group row before the
  fix: it needs **1,705px inside a 1,136px box**, so **4 groups sat past the right edge**
  (📋 สถานะออเดอร์ (ขาย) · 📦 ออเดอร์พิเศษ · 🗓 ปฏิทินงาน · 🏪 ร้านใหม่ของฉัน), the last one
  **569px** past it, and `elementFromPoint` at its centre returned **nothing** — genuinely absent,
  not merely awkward. **A bigger monitor does not help**: the page frame is capped, so 1512px
  measures identically; at 390px 9 of 12 were unreachable. `html{overflow-x:hidden}` is what the
  `overflow-x` was there for, and wrapping removes the need for it. **Never write
  `scrollbar-width:none` beside `overflow-x:auto` again.** Tables (`.tblwrap`/`.cst-tw`/`.dci-bars`)
  keep their native scrollbar and so are draggable with a mouse — they are the exception, not the
  pattern. `layout.test.cjs` now asserts, for the owner, an admin and a rep at 1280 / 1100 / 390px,
  that every tab button is inside its row, that `overflow-x` is not `auto`, and that
  `elementFromPoint` on the last button hits that button.
  **⏳ It does not reach the SALES SIDE until 1 Dec 26** (`TAB_SUP_FROM`/`tabSupOn`, owner
  27 Nov 26: *"เพื่อไม่ให้คนใช้งานจริงงง ช่วยปรับของฝั่งเซลล์ ซุป แอดมิน ให้กลายเป็นหมวดย่อยตามเดิม
  ไปก่อน เดี๋ยวค่อยปรับใหม่เป็นแบบที่เราทำกัน (1st 2nd หน้างาน อื่นๆ) วันที่ 1 ธค.2026 แทน"*). Until
  that date a rep, the supervisor and the team roles get the **old flat row of all 12 groups** —
  which now wraps, so nothing is out of reach either way. On 1 Dec it switches on for them with no
  code change.
  **⚠️ The admins were moved off that gate on 29 Nov 26 — every `role:"manager"` account now gets
  the buckets at once**, not just `bdOwner()`. The owner opened the main site on an admin's Windows
  machine and found the old row still there: *"ทำไมในเวปแอดมิน หัวข้อมันยังเป็นแบบเดิม ผมเปิดจาก
  เครื่องผมมันเปลี่ยนแล้ว แต่ไปเปิดเครื่องแอดมิน Refresh หลายรอบ ก็ยังไม่เปลี่ยน … แก้ส่วนนี้ด่วนเลย
  ผมจะให้แอดมินทำงานต่อ"*. **It was never a cache problem** and saying so was important: `bdOwner()`
  admits role `manager` **and** id `manager`, so admin1–4 fell through to the date gate and no number
  of refreshes could change that. This is the same lesson as `/admin` the day before — **`bdOwner`
  is for the owner's own reports, never for the admins' routine work** (see the 🧑 section). The
  four of them are the people reviewing these pages with him, so the gate is now `role==="manager"`.
  **⚠️ The ADMIN SITE is exempt and already uses the buckets** — the owner found the reason himself
  the next day: *"เข้าหน้าเวปแอดมิน แล้วมันคลิ๊กเลื่อนหมวดไปออเดอร์พิเศษไม่ได้ ช่วยปับให้เฉพาะฝั่ง
  แอดมิน แบ่งแยกหมวดแบบ manager ได้เลย"*. Measured at 390px: `/admin` has **8 groups in one row,
  964px wide inside a 362px frame**, so 📦 ออเดอร์พิเศษ sat **271px past the right edge** and
  `elementFromPoint` on it returned `MAIN` — genuinely invisible and un-tappable, not just awkward.
  With the buckets the admin site is 3 buttons of 2–3 groups each and everything fits. So
  `tabSupOn()` returns true for `BD_SITE==="admin"` as well; the sales side still waits for 1 Dec,
  because that is where the whole team works every day. Three rules: this **hides the row only** — the
  whole `TAB_SUPERS` table, `tabSupOf` and `switchSuper` are untouched, the same way retiring a
  feature only removes its line from a table; the date is read through **`ymdOf`, never
  `toISOString()`** (the depot is on UTC+7, so a UTC read would still say 30 Nov at 06:30 on the
  1st); and any test that asserts the bucket layout must force the gate (`tabSupOn`) rather than
  depend on today's date, while a test that reads the calendar's red badge must accept
  **either** `#planBadge` (the bucket) or `#planBadge2` (the group), since before 1 Dec only the
  second one exists.
  **Every date / round / month picker carries ◀ ▶ step buttons** (`.dstep`, `selStep`/`dateStep`/
  `keyStep`/`ordStep`/`pjStep`) — the owner asked for the PJP one everywhere. ◀ always means
  *older* and ▶ *newer*, so a `<select>` whose options are filled newest-first (most of them, they
  use `.reverse()`) must carry **`data-rev="1"`**; one filled oldest-first (quarters) must not, and
  `#keySel` sets the flag per period in `initKeys`. `selStep` never reimplements a handler: it
  moves `selectedIndex` and dispatches `change`, so it is exactly a dropdown pick and **cannot
  touch data**. Prove both with **`node test/browser/datestep.test.cjs`** (78 checks, including a
  byte-for-byte comparison of every stored blob before and after every button on every page).
  **📦 A quantity is "N ลัง M ชิ้น" or plain ชิ้น — never a fraction of a case, anywhere on the
  site.** The owner has said it three times and the third was impatient (28 Nov 26: *"ช่วยปรับเลขที่
  ขึ้นโชว์ ที่เป็นทศนิยมให้เป็น ...ลัง....ชิ้น เหมือนเดิม จุดนี้เจอหลายรอบแล้วนะ … ทั้งเวปเลย เพราะเรา
  ดูจำนวนเป็นแบบ ลัง ชิ้น หรือ ชิ้น สองแบบนี้เท่านั้น"*). The files mix ลัง/แพ็ค/ชิ้น in one row, so
  the arithmetic is done in **pieces** and split back at the very end — and the split is made **per
  product code with that code's own case size, then added**, never by summing fractional cases and
  dividing once, which gives a number nobody can pick stock against. Helpers: **`spCsTxt(cs,pc)`**
  for a quantity, **`spDiffTxt(dw,dp)`** for a difference (ลัง and ชิ้น carry their own sign and are
  never collapsed into one number), `alSplit`/`alQtyTxt` for pieces→ลัง/ชิ้น, `otQty`/`otCsCell` on
  the order-status page. Leftover pieces **can add up to more than one case** across codes — that is
  correct and must not be divided again. A row whose unit cannot be read is **counted and named**,
  never guessed at 1; a stored figure that cannot be split back says so with a `*` and a banner.
  Column headers therefore read **จำนวน / เป้า / คีย์จริง**, not "(ลัง)", since the cell carries both
  units. Prove it on the pages that touch quantities with the `ลัง` assertions in
  **`ordtrk.test.cjs`** and **`spord.test.cjs`**, which fail on any `\d+\.\d+ ลัง` reaching the screen.
  **📅 Never build a calendar date with `toISOString()`** (`ymdOf`/`ymOf`, owner 27 Nov 26:
  *"ปุ่มนี่กดไม่ไป ปรับแก้หน่อย"*). It converts to UTC, and every phone in the depot is on UTC+7,
  so a date taken from **local midnight** is a day out *every time*: measured under
  `TZ=Asia/Bangkok`, `spStepDay(+1)` from the 23rd returned the 23rd and `spStepDay(-1)` returned
  the 21st — ▶ appeared dead and ◀ skipped a day. On a real instant it is a day out whenever local
  time is before 07:00. **The test machine runs in UTC, where all of it works, so nothing caught
  it** — `datestep` and `spord` now create their browser context with
  `timezoneId:'Asia/Bangkok'`, and `spord.test.cjs` asserts each step moves exactly one day across
  a month boundary. Everything that wants "the date on the user's calendar" goes through `ymdOf`.
  The one correct use that stays is a date built with `Date.UTC(...)` and read back with `getUTC*`
  (the Excel serial converter and the PJP calendar): both sides are UTC, so they cannot drift.
  **The same trap bit the TESTS on 28 Nov 26**: four fixtures in `spord.test.cjs` built "today"
  with `new Date().toISOString().slice(0,10)` while the browser context runs in `Asia/Bangkok`, so
  from 17:00 UTC onward the fixture's "tomorrow" was the app's today and three checks failed — on
  the committed code, with nothing changed. A test that only fails in the evening is worse than no
  test: they go through **`ymdOf`** now, like the app.
  The **📥 สถานะออเดอร์ (ซื้อ)** tab group (`renderPsi`/`parsePSI`) answers the other half of the
  question: *what did we order from Unilever, and when did it reach our warehouse?* The owner asked
  for it on 27 Nov 26 — *"หมวด สถานะออเดอร์ (ซื้อ) โดยวางไว้ตรงกลางของ การสั่งของ และ สต็อค ส่วนตัวเดิม
  ที่ชื่อซ้ำ ให้ปรับเป็น สถานะออเดอร์ (ขาย) … จับรหัสสินค้าที่สั่งได้หัก drop ออกไป แล้ว match ให้เข้ากับ
  สถานะของไฟล์นี้"* — so the group sits between 🛒 การสั่งของ and 📦 สต็อก, and the older group was
  renamed **(ขาย)**. **The page keys (`CURTAB`) did not change**: the new one is `psib`, the old one
  is still `otrk`; renaming a key would break every remembered tab and history entry.
  **It reads TWO formats of the same report and both must keep working** (`parsePSI` dispatches on
  `Stock Type` + `Received Date`, headers the old file does not have): the depot's original
  **`PSI_ddmmyyyy.xlsx`** (sheet `Export`, 31 columns) and dcode's **`PSI_Detail_Report_N.xlsx`**
  (same sheet, 24 columns), which the owner sent on 26 Nov 26 — *"ไม่แน่ใจว่าไฟล์นี้ต่างจากไฟล์เดิม
  ยังไง แต่ถ้ามันครบกว่าใช้ไฟล์นี้แทนได้เลย"*. Measured on his two real files of the same period:
  the **bought** side is identical — 28 invoices, 137 codes, 192 (invoice|code) pairs with **0
  differences**, NIV 7,147,655.35 and GSV 15,163,688.25 to the satang — and the detail file carries
  **43 more rows, all `Stock Type = Free`** (3,071 cases, GSV/NIV 0): the free goods.
  🔴 **The old file does not merely omit them — it folds them into the same quantity.** Measured per
  (invoice|code), all **192/192** pairs have old `Received Qty (CS)` = bought + free, and **0** equal
  the bought figure alone (code 64329248 on invoice 3106016228: old 134 = 67 bought + 67 free;
  11,155 + 3,071 = 14,226 = the old file's own Total). So the reconciliation used to read
  "เข้าคลังแล้ว 134" against "ต้องได้ 67" and print ✅ เข้าครบ with a phantom surplus — part of the
  "ตัวเลขมันมั่วซั่ว" the owner reported. **The detail file is therefore not just fuller, it is the
  only one that answers this page's question correctly**, and a key already read from it (`dt:1`)
  **must not have its quantities overwritten by the old format** (`pickGin`'s "the side that knows
  more wins"); the old file may still add days and codes the detail file never covered, and says in
  the log what it left alone. Free goods are stored as **`fr` on the existing record** (never a new
  section), are **never added into `cs`** — the `pmCodeSet`-era rule that free and sale goods are
  never summed — and a row that is free-only must not read as "received, 0 cases" (`psiPaid`,
  `psiWin`/`psiFrFor`). An unreadable `Stock Type` is kept as a sale row and **reported**
  (the `parseStockDcode` rule). The detail file has **no `Total` row** (only `Applied filters:`) and
  **no `UOM` column**, but carries both (CS) and (Pcs); measured, every row is in cases with
  `Variance` 0, `Document Number` is 1-1 with the invoice (28/28), `Site Code` has one value, and
  `GSV − Discount = NIV` on all 235 rows.
  Every claim below was measured on the owner's real file before anything was written
  (194 rows, 28 invoices, 137 codes):
  **the last two rows are not data** — a `Total` row and an `Applied filters:` row, exactly like the
  dcode daily sales file, and both are skipped *and reported*; `Received Qty` equalled `Invoice Qty`
  on all 192 real rows with `Variance` 0 everywhere and no row in pieces (UOM is `CS` throughout) —
  but the reader still handles both and **reports** a variance or a pieces row rather than hiding it;
  **the key is the Invoice RECEIVING date**, not the day the centre invoiced, because the question is
  "when did it reach our warehouse" (measured: same day 56 rows, +1 day 136, never further); and
  **one code can arrive on several days** (43 codes came more than once, 42 of them on different
  days), so `psiGot` sums every round from the order date onward and names the latest.
  It is stored in the main snapshot as `PSI.rows["YYYY-MM-DD|code"]` + `PSI.days["YYYY-MM-DD"]`,
  **not** a side blob: measured, 10 days is 15 KB ⇒ ~44 KB a month, the same order as `STOREDAILY`
  and nothing like `ordtrk`'s 0.5 MB a month — and living in the same snapshot is what lets the
  receive-date badge read live with no second fetch. A PSI export can be filtered to part of a
  period, so a new upload **writes only the keys it carries** and says so (the `parseDailyDcode`
  rule); a header it needs that is missing **throws and stores nothing**.
  **📅 Two dates, two questions, and the page must never swap them** — the owner set this out
  himself on 28 Nov 26: *"สองส่วนนี้คือวันที่ตัวเลขนับเป็นยอดซื้อ กับวันที่ของพวกนี้เข้าคลัง
  มันแตกต่างกันบางวัน … ยอด 765k วันที่ขึ้นโชว์ในรีพอร์ตหน้าประวัติการสั่งของคือวันที่ 16 แต่วันที่
  ของเข้าคลังคือ 17 และยอดซื้อเข้าวันที่ 20 ของเข้าคลังมาแยกกันวันที่ 20/21"*. Every word checks
  out against his real file: 16 Nov (765,785) → 17 Nov whole · 18 Nov → 19 Nov whole ·
  **20 Nov → 20 Nov 1,042,436 + 21 Nov 1,166,010** · **24 Nov → 24 Nov 1,067,296 + 25 Nov
  1,696,768**; over the file, same day 70 rows, +1 day 165, never further.
  **`cr` (the centre's invoice date) is the day the money counts as a purchase** and keys
  📥 ของเข้าคลัง (NIV) on ประวัติการสั่งของ; **the receiving date keys `PSI.rows` and tab ①**.
  `psiCrIdx` now also carries `by[receivingDay]`, so the split is available wherever it is wanted.
  The page is **strictly read-only** over PSI/ORDERS/POSTATUS with its state on the non-synced
  `PSIV`, and has **two sub-tabs since 29 Nov 26** (the owner: *"หมวดย่อย ของเข้าคลัง และสั่งไป
  ของเข้าหรือยัง รวมเป็นอันเดียวกันเลยก็ได้ … และปรับให้เลือกดูเป็นเดือนก่อนได้เลย ข้อมูลที่แสดง
  จะได้ไม่เยอะจนเกินไป"*). The first, **📅 ตารางรับเข้า** (`psiRounds`/`psiCalHtml`), is the
  company status board the owner asked for — *"ปรับปฏิทินให้เป็นแบบตาราง แล้ววันไหนมีของเข้าให้มี
  ยอดสีเขียว คือของครบ สีแดงคือของยังไม่ครบ ทำขึ้นเป็นตาราง % การส่งของเข้าคลัง ให้ทุกคนในบริษัท
  รับรู้"*: one row per order round — ศูนย์ออกบิล · ของเข้าคลัง (every receiving day with its own
  case count and how many days late) · ต้องได้ · เข้าคลังแล้ว · ยังค้าง · ตีคืน · NIV · **% with a
  bar, green at 100% and red below** (`psiPct`/`psiPctCol`). The % is **received ÷ due (ordered −
  Drop)**, not ÷ invoiced, because his question is "did what I ordered arrive"; a round no PSI file
  covers is a **dash, never 0%**; tapping a row opens ② for that round; every role can open it.
  Then **🔎 เช็คของเข้า** (`psiChkHtml`), the reconciliation — per code, ศูนย์สั่ง → หัก Drop →
  **ควรได้** → เข้าคลังแล้ว → **ขาดอีก** → วันที่เข้า, where `ขาดอีก` is `ควรได้ − เข้าคลังแล้ว`,
  the one number the owner wants from the page.
  **📥 ของเข้าคลัง is no longer a sub-tab of its own — it was folded in, not deleted.** Each
  receiving day of the selected round hangs under the table in a `<details>` expander built by the
  **same `psiDayOf`/`psiDayTbl` pair** the old page uses, so the two can never disagree; `psiInHtml`
  and `psiSetSec("in")` still work (the retired-tab rule — only the `PSI_SECS` entry went). The
  expander is native `<details>`, not page state, so opening one does not redraw the page. Its
  table is **that whole receiving day**, which can hold goods from another round, and the page
  says so.
  **🔎 The search is the way in** (`psiHit`/`psiChkRow`/`psiChkCols`, the owner: *"ให้มีปุ่มเสิจ
  ที่จับทั้งรหัสสินค้า ชื่อสินค้า เหมือนปุ่มเสิจในเวป ที่จับถึงตัวอักษร ให้ทุกคนเข้ามาเช็คได้ ว่า
  ออเดอร์ที่เราสั่งไป ของเข้ามาหรือยัง"*): substring on code **and** name, and when it has text the
  answer is **cross-round over the whole selected month**, because the question is "has this
  product arrived", not "did this round arrive". Three rules: rows stay **split per round and are
  never summed across rounds** (an arrival belongs to one round — `psiGotFor`), so the search table
  gains a **รอบที่สั่ง** column; the search is scoped to the chosen month and a miss must say
  **"ลองเปลี่ยนเดือน"** rather than render empty; and the result is capped at `PSI_QMAX` (300)
  rows with the count stated, since a one-character query matches everything.
  **📅 Month first** — `psiYm()` is shared by both sub-tabs (so switching tabs does not move the
  month), `psiMonths()` lists months from the dates alone without touching `psiCheck`, and
  `psiGoRound` carries the month across when a row is tapped.
  **⚠️ An arrival belongs to ONE order round** (`psiGotFor`/`psiOrdByCode`, owner 27 Nov 26:
  *"เหมือนมันขึ้นโชว์จำนวนของที่สั่งเป็นวันเดียวกันที่ของเข้า … ผมต้องการให้ระบบ track ได้ว่าการ
  สั่งของหักดรอปรอบวันนั้น ๆ … ครบตามออเดอร์นั้น ๆ หรือไม่ และขาดอีกกี่ลัง"*). `psiGot` sums **every**
  round from the order date onward, which is right for the badge on a product's status but wrong
  here: a code ordered twice had the second round's goods counted into the first, so the first read
  ✅ เข้าครบ while it was still short, and the same cases were counted twice. An arrival now belongs
  to the **latest order round of that code at or before the centre's invoice date** (`cr`, falling
  back to the receiving date, which is never more than a day apart), so the allocation is
  one-to-one. Goods that arrive **before** the code's first order round still count for it, or real
  stock would vanish from the page. **Four statuses, and the fourth is
  the one that matters**: ✅ เข้าครบ · 🟡 เข้าบางส่วน · 🕓 ยังไม่เข้า · ⛔ โดน Drop ทั้งหมด, plus
  **⏳ ยังไม่ได้อัพไฟล์ PSI ที่ครอบวันนี้** — "no file yet" and "not arrived" are different facts and
  must never share a cell, or a day nobody has uploaded reads as the centre failing to ship.
  **🔁 The reconciliation was rewritten on 28 Nov 26** because the numbers stopped making sense —
  the owner's screen read *ศูนย์สั่ง 150 · หัก DROP 300 · ควรได้ 0* (*"ตัวเลขมันมั่วซั่วไปหมดแล้ว
  ใช้ตรรกะใหม่แล้วแกะมันออกมาหน่อย เจ้าของบริษัทแค่ต้องการดูว่า ในวันนั้นเค้าสั่งของไป แล้วของทยอย
  เข้าหมดหรือยัง และยังคงค้างอีกกี่ลัง มีรายการอะไรบ้าง กดเสิจได้"*). The cause: **the Drop file and
  our own order form are two different files and can state different quantities**, and the old rule
  mixed three sources (`dropD` → `dropO` → our own), so when they disagreed it printed a figure no
  file had ever stated, and the subtraction could run past zero. There is now **one rule, readable
  in a line**: **ต้องได้ = เราสั่ง − โดน Drop**, then **ยังค้าง = ต้องได้ − เข้าคลังแล้ว**, where
  **โดน Drop is capped at what we ordered** (`min`) so ต้องได้ can never go negative. Where the two
  files disagree the page **says so in a banner** — how many codes the Drop file over-states, how
  many it delivers more than ต้องได้, and the codes it carries that are not in our order at all
  (those are counted separately, never folded into the totals). `dropall` is decided **before**
  `nofile`, because a fully-dropped code needs no PSI file to answer it. The page also gained the
  **search box** he asked for (name or code) and tints each row by status. Quantities print as whole
  cases (`psiN`), since both files count in CS.
  **💰 The page is "ORDER − DROP vs Delivery", and the owner said so himself** (28 Nov 26:
  *"ผมจะสรุปหน้าสถานะออเดอร์ซื้อ ให้คุณเข้าใจ มันคือหน้า order-drop เทียบกับช่อง delivery หรือของเข้า
  คลัง NIV นี้แหละ"*), so the reconciliation carries a money band beside the case cards
  (`psiMoney`/`psiMoneyHtml`): สั่งไป (ประเมิน) − หัก Drop = ต้องได้ (ประเมิน) · เข้าคลังแล้ว (NIV) ·
  ต่างกัน. It reads **`ohVal` and `psiCrOf`, the very functions 📊 ประวัติการสั่งของ uses**, so the
  two pages cannot disagree. Three rules carry over unchanged: the order side is CON Confirm × 0.85
  and must stay tagged **(ประเมิน)**; the receipt side is NIV keyed on the **centre's invoice date**
  and is **not the BI report**; and a day no PSI file covers is a **dash, never 0**. A Drop figure
  larger than the order figure is **named in a banner** rather than rendered as a negative — the
  owner's 21 Nov screen read ORDER–DROP = −21,759.18 with the same หัก DROP as the 20th, the money
  twin of the case bug fixed the same day. Free goods have no money (GSV/NIV 0 on every real row),
  so they never touch this band.
  **🔁 PSI is only the warehouse's "received" tick — nothing else**, and the owner said so plainly
  on 28 Nov 26: *"จริง ๆ PSI คือไฟล์ที่คลังกดรับของเข้าเท่านั้น ในส่วนของสินค้าที่ไม่ได้รับเข้าให้
  วิเคราะห์จากจำนวนสินค้า order-drop จากใบสั่งซื้อ … และจำนวนรับเข้าของ PSI … แต่ละรอบมีดริฟกันไหม
  แล้วให้ระบบชนกันเองอัตโนมัติ มีการวิเคราะห์สองส่วนนี้อยู่ตลอด"*, with the chain spelled out:
  **ศูนย์สั่ง → − ดรอป → ตัวเลขซื้อเข้า → วันที่คลังรับเข้า**. So "what did not arrive" is never
  looked for inside PSI; it is **the order form minus the Drop file against the quantity PSI
  received**, which is what `psiCheck` computes — and **`psiDrift`/`psiDriftHtml` now run that
  comparison across every round by itself**, on top of the receiving table, so nobody has to open
  rounds one at a time. Three rules: drift has **two directions and they are never netted off** —
  `left` (short) and **`over` (received more than the round ordered), which was invisible because
  `left` is clamped at 0**; a round no PSI file covers is **"รอไฟล์", not drift**, or an un-uploaded
  day accuses the centre; and a fully-dropped code is not drift either. The band states both
  figures, counts the rounds that agree, and lists the codes that drift most with the rounds they
  drifted in — and when everything agrees it **says so** instead of rendering empty.
  **🔄 ของตีคืน — the PSI file has no status column at all** (`psiRetFor`/`psiRetNote`). The owner
  expected one on 28 Nov 26: *"ผมคาดว่ามันน่าจะมีพวกออเดอร์ของตีคืนหน้างานคลังเลยตีกลับทำให้จัดส่ง
  ไม่สำเร็จ อ่านจากสถานะในไฟล์ PSI"*. Every column of both formats was checked: all the remaining
  ones hold a single value for the whole file (Region, Area, Distributor, Site, Supplier, UOM) and
  **`Remarks` is empty on all 192 rows**. What does answer the question is the pair
  **`Invoice Qty (CS)` ↔ `Received Qty (CS)`** — the file's own `Variance`: the centre billed 10
  cases, the warehouse took in 8, so 2 came back. Measured on both real files, **`Variance` is 0 on
  every row** (235/235 and 192/192), so there were no returns in that period — and the page
  **says so out loud** rather than leaving a blank, because "none" and "not known" are different
  facts. `iq` is an appended field, so a round stored before it exists answers **null**, never 0,
  or the whole round would read as returned. ⚠️ The `UnSuccessful Delivery` status the owner had in
  mind is in the **allocation file** (`Order Status`, 41 rows in his real file) and means **our van
  failed to deliver to a shop** — the other direction entirely; never mix the two.
  **The receive date is appended to the existing order-status badge** (`psiPill` inside
  `reqStatusCell`), so every page that shows a product's order status — the manager's combined
  request table, the rep's own request page, ขอแล้วสั่งไม่ได้ — gains it at once. It is a **separate
  pill, never merged into the Drop badge**: the Drop file is the centre's answer, PSI is our
  warehouse's, and they are different steps. With no PSI file covering that round the pill is
  **silent**, never "ยังไม่เข้า".
  **⚡ The page was pathologically slow and the cause was one line** (the owner, 29 Nov 26:
  *"มันช้ามากเวลาผมคลิ๊กเข้าไปหน้านี้"*). `psiOrdByCode()` called `psiOrdDates()` **just to test
  whether its cache was still valid**, and `psiOrdDates()` runs `orderedMerged` over every order
  day (~900 codes × ~36 rounds ≈ 32,000 writes per call) — while `psiWin()` called
  `psiOrdByCode()` **once per product code**. That is ~10⁹ operations to draw one table. Four
  fixes: `psiOrdDates()` memoises on a signature that **does not merge** (it counts rounds per day,
  so an `(add1)` round still busts it); `psiCheck` resolves `psiOrdByCode()` **once per round** and
  passes it down as `od` to `psiWin`/`psiGotFor`/`psiFrFor`/`psiRetFor`; `psiCheckC` memoises a
  round's whole answer against `psiIdx()` identity + `psiOrdByCode()` identity + a per-day digest
  (codes, ordered total, drop codes, `dropVal`, `hasResult`, `noDrop`); and `psiRounds(ym)` computes
  only the chosen month, with `psiCalHtml` passing that one array on to `psiDriftHtml` instead of
  letting it sweep again. **Measured in a real browser** on made-up data smaller than the depot's
  (2 months · 12 rounds · 600 codes): the receiving table went from **103,196 ms to 8 ms** (3 ms
  on a repaint), the check page is 54 ms and a search keystroke 12 ms. ⚠️ A cached `psiCheck`
  result is read-only — every caller filters or reduces, none mutates `rows`.
  Prove it with
  **`node test/browser/psi.test.cjs`** (117 checks, self-contained with made-up codes; 120 with the
  real file via `PSI_FILE=/path/PSI_Detail_Report_3.xlsx` — either format — which never enters the
  repo) plus the `PSI` cases in `merge-safety`.
  **📦 A unit toggle on the two product reports** (`UQ`/`uqTogHtml`/`uqTxt`, owner 28 Nov 26:
  *"ทำให้รีพอทกดดูสลับได้ว่าจะดูเป็นแบบ ลังชิ้น หรือชิ้น … รวมไปถึงหน้าออเดอร์พิเศษ ที่แอดมินตรวจ
  … เพราะผมจำได้มันขึ้นซ้อน ๆ กันมันดูลายตามาก ๆ"*). It is **one shared toggle**, remembered per
  device in `localStorage` (never synced, every access in try/catch), used by 📦 ยอดรายสินค้า on
  สถานะออเดอร์ (ขาย) and by 📦 สรุปรายสินค้า on the admin check. Pieces mode only applies to
  **per-product** tables, where that code's own case size is known; the per-ORDER table stays
  ลัง+ชิ้น because converting a mix of codes needs every code's case size. A code whose case size is
  unknown shows **`?` and is counted in a banner** — never guessed. The admin check's totals read
  the `pcs` the comparison already accumulates rather than multiplying a case total back, since
  every code has a different case size.
  **🚫 And `otCsCell` must never print a fractional case again** — it was the last place that did,
  which is how *"1,646.75 ลัง *"* reached the owner's screen on 28 Nov 26 (*"กำชับหลายรอบแล้ว …
  ห้ามเป็นเศษงง ๆ แบบนี้"*, the fourth time he has had to say it). A figure that cannot be split
  prints **whole cases with the `*`**, exactly as `otQty` already did.
  **🧭 1st Sale / 2nd Sale — the vocabulary the team must share** (`saleScopeHtml`). The owner had
  to explain it himself on 28 Nov 26 after the allocation file was discussed on the buying side:
  *"ส่วนไฟล์ allocation มันคนละส่วนกันนะ นั่นคือฝั่งที่ศูนย์ขายให้ลูกค้า ส่วนที่เรากำลังทำ มันคือส่วนที่
  ศูนย์สั่งของเข้า นับเป็นยอดซื้อ unilever เรียก 1st sale และฝั่งขายเรียก 2nd sale ทำเวปให้สื่อสารให้
  คนใช้งานเข้าใจทั้งหมดนี้ด้วยนะ"*. So both groups open with a band naming which side they are:
  **📥 (ซื้อ) = ยอดซื้อ · 1st Sale**, Unilever → the depot, and the owner listed its files
  exhaustively — *"1st sale มีแค่ ใบสั่งซื้อ ใบ drop PSI มูลค่าสต็อค ไฟล์สต็อค เท่านั้นเลย"*;
  **📋 (ขาย) = ยอดขาย · 2nd Sale**, the depot → shops, and he listed those too — the allocation
  file, the daily sales file, **the Transaction Inquiry, PJP / Outlet Master, โปรโมชั่น & เงินรางวัล
  and the ตัวกระจาย special orders**. Each band names which side the page is and **points at the
  other group** so nobody lands on the wrong side again. It is written **once** and called
  from both pages — split in two and they drift apart. ⚠️ This is "what this number counts", which
  the user needs in order to work, not a narration of how the system is built; it does not loosen
  the house rule against explaining the internals on screen. ประวัติการสั่งของ already labelled its
  columns 1st / 2nd, so the three pages now use one vocabulary.
  **✂️ But on screen it is TWO LINES, and that is an instruction** (owner, 29 Nov 26, after the
  band filled half his screen: *"เนี้ยมันขึ้นรายละเอียดเกินความจำเป็นอีกละนะ เอากระชับ ๆ ก็พอถ้าจะ
  ให้พนักงานดู เรื่องไฟล์ PSI อะไรไม่ต้องพูดถึงเลย"*). The chain (ศูนย์สั่ง → − ดรอป → ต้องได้ →
  คลังรับเข้า) and the file lists came out: **the band must not name a single file** — not PSI, not
  the Drop file, not the allocation file. The person reading it is not the person uploading, so the
  files are the uploader's information, not the reader's. The knowledge stays in the comment above
  `saleScopeHtml`, which `build.cjs` strips anyway; `psi.test.cjs` asserts the rendered band is
  under 200 characters and names no file.
  The **📋 สถานะออเดอร์ (ขาย)** tab group (`renderOtrk`) answers *"where is this order?"* for the whole
  team. The owner's words, 26 Nov 26, after the analysis below: *"เราเจอหัวใจสำคัญละ เชื่อมด้วย
  เลขออเดอร์เดียวทั้งระบบฝั่งการขาย"*. It is **two steps, by his instruction** — *"ตอนนี้เรามีแค่
  2 ขั้นตอน คือเซลล์คีย์ คลังจัด … GIN มันมาจาก Good issue note คือใบจัดของของฝั่งคลัง ในอนาคตเรา
  ค่อยไปเพิ่มส่วนของการส่งของอีกที"*: **① เซลล์คีย์** (the order's creation date) and
  **② คลังจัดของ** (its GIN). **Do not add a delivery step until he asks.**
  **The join key is the order number `BDD01…`**, and every claim here was measured on his real
  files first (allocation 10,428 rows / 1,789 orders · daily sales 15–23 Nov 26, 7,902 rows /
  1,401 orders):
  the same number is in **both** files (allocation col M `Order Number`, daily sales col L
  `หมายเลขคำสั่งซื้อ (Order Number)`); **1 order = 1 shop · 1 creation date · 1 invoice · 1 GIN ·
  1 status**, 0 violations in 1,789 (the one order carrying three lines is `BDD0100000003` on the
  dummy outlet `T0000164400`, not a real shop); where both files hold the order they **agree
  1,401/1,401 — 100% on shop, line, creation date AND invoice number**; the 133 that match in one
  file only are simply **not invoiced yet** (120 of them the file's last day, billed the morning
  after), so an unmatched number is **reported as "not uploaded yet", never as 0**; invoice numbers
  are 1-to-1 too (1,645 invoices, 0 covering two orders), so either number finds the order;
  **a GIN is not a key** — 1 order never has 2 GINs, but 1 GIN covers up to **88 orders** across
  lines, days and shops, so it is step ②'s *evidence*, not the spine; and **order numbers never
  overlap between days** (0/10), which is why a typed number can be routed to a month.
  Timing, measured: **46.7% invoiced the same day, 43.3% +1, 9.2% +2, 0.9% beyond**.
  **The data lives OUTSIDE `bd-data-*`**, in its own month-sharded blob behind `api/ordtrk.js` —
  the same reasoning as the two price files, and for the same reason: measured, the index grows by
  **~0.5 MB a month for ever** (1,789 orders in 10 days ⇒ ~3,900 a month), and merged into the main
  snapshot that is ~6 MB a year re-read, re-merged and copied into 8 rolling backups on every save.
  `lib/snapshot.js` holds the reasoning and `ORDTRK_PREFIX`. **Never move it into `mergeState`.**
  Four rules that are easy to get wrong:
  **`parseAlloc` must build the index BEFORE the line that skips rows with no GIN** — those rows
  (963 of them, 144 orders in the real file) are exactly the "warehouse hasn't picked it yet" cases
  this page exists to show; **a status it does not recognise is stored verbatim and reported**
  (`OT_ST`/`OT_TH`, the `poClosedKind` rule), never mapped to the nearest known one; **quantity is
  stored as fractional cases** (`otCeq` = cases + (packs × pack size + pieces) ÷ case size), the
  same unit the daily sales file uses, and a row whose pack size cannot be read from the product
  name is **counted and reported, never guessed at 1** — such a row contributes no product
  breakdown either, and the page says which of the two reasons applies; and **`u` is the last day
  the FILE covers**, not the upload clock, so re-uploading an old export cannot drag a Delivered
  order back to Confirmed. Merging is field-by-field, so a fresher file that happens to carry no
  GIN cannot blank one already known (the `mergeExOne` lesson).
  **📦 …but a fractional case is never shown to anyone** (see the ลัง/ชิ้น rule below): `otSplit`
  also stores **`w` = whole cases and `p` = leftover pieces**, split per product code with that
  code's own case size and only then added up, and `det[code]` gained a **third element, the case
  size** (appended, so a breakdown stored with two still reads). Three rules: `recOrd` writes `w`
  and `p` **as a pair, always both or neither**, because `mergeOne` overrides key by key and storing
  only the non-zero half would let "5 ลัง" from one file meet "8 ชิ้น" from another; `x` (the rows
  whose unit could not be read) is now kept by the server too — it was silently dropped, so the
  page's own warning could never fire on stored data; and a round uploaded **before** these fields
  existed holds only the fraction and cannot be split back, so the page prints the whole cases with
  a **`*`** and one banner naming how many orders are affected — never a silent rounding.
  **A third file feeds this page — the one the reps' own keying produces** (`parseTxn`, owner
  26 Nov 26: *"ผมสามารถดึงรายงานส่วนแรกของการขายเลย คือส่วนที่เซลล์คีย์เข้าระบบ … เป็นไฟล์ที่เกิดขึ้น
  ก่อนแอดมินจะส่งไปสร้าง GIN"*). `Transaction_Inquiry_<ddmmyyyy>.xlsx`, sheet `DataExtract`,
  recognised by `เลขที่เอกสาร` + `เวลาสั่งซื้อ` (`txIsTxn`), and it is **the master list of the
  three**: measured on his real file (2,107 rows, 15–26 Nov 26), **1 เลขเอกสาร = 1 แถว, 2,107/2,107**;
  every order in the allocation file is in it (**1,789/1,789**) and every order in the daily sales
  file is too (**1,401/1,401**), with **nothing the other two have that it lacks**. It agrees with
  the allocation file on shop 1,789/1,789, creation date 1,789/1,789 and GIN 1,644/1,645, and with
  the sales file on invoice number and NIV **1,401/1,401 (100%)**. It carries **318 orders the
  allocation file does not** — 46 cancelled plus the days that export did not reach — and three
  columns nothing else has: **เวลาสั่งซื้อ, วันที่จัดส่ง, วันที่จัดส่งจริง**.
  Four rules: **the file uses two date formats** — `วันที่เอกสาร`/`วันที่จัดส่ง`/`invoicedate` are
  `dd-mm-yyyy` while **`วันที่จัดส่งจริง` is `yyyy-mm-dd hh:mm:ss`**, so `txDate` and `txIso` are
  separate and must not be swapped; **delivery dates are stored as day OFFSETS** from the creation
  date (`dp`/`dv`), so a delivery in the next month cannot fall outside that month's blob, and an
  absent offset means *not delivered* — `recOrd` must test "was a value sent at all", because
  `INT(undefined)` is 0 and 0 would read as *delivered the same day*; **cancelled orders are kept
  and flagged `cx`** so the page can show them, but are **never** written into `STOREDAILY.ord`,
  which is a sales index; and because the file is **header-level with no product codes**, it fills
  `STOREDAILY.ord` **only where a field is empty** (never overwriting the sales file's figures),
  marks the record `tx:1` and **writes no `cs`/`pc`/`c`** — every reader of that index therefore
  tests `cs===undefined` and says *รอไฟล์ยอดขาย* instead of printing 0 (`spRow`, `spCases`,
  `spShops`). For the same reason it **cannot feed the promotions tracker**, which needs per-product
  quantities. Measured and worth not over-claiming: **วันที่จัดส่งจริง equals วันที่จัดส่ง in
  1,677/1,677 rows**, so that column proves *delivered / not delivered*, never *late*.
  Its upload button is **on this page** (`otUpTxn`), the second documented exception to the
  one-upload-button rule, for the same reason as the allocation file: one upload serves the system.
  **🧩 The number a rep can actually quote is the one their phone shows** (`#1034715426`), and the
  owner found where it lives on 27 Nov 26: *"ผมเจอ jigsaw ตัวสุดท้ายแล้ว นั่นคือเลขคำสั่งซื้อของเซลล์
  ตอนที่กดคีย์"*. Measured across all three real files before anything was written: it is
  **`หมายเลขอ้างอิง (Reference Number)` in the daily sales file** (1,392 of 1,412 orders) and
  **`เลขอ้างอิง DDT` in the Transaction Inquiry file** (2,096 of 2,107), the two files state the
  **same number on all 1,392 orders they share (100%)**, 1 order never carries two, and the
  **allocation file does not have the column at all** — every column was checked. The orders without
  one are exactly the **Back Office** ones (11), which never went through the app; by channel,
  Mobility 1,737 · B2B 353 · BO 17. It is stored as `rf` on `STOREDAILY.ord` and on the order-track
  record, filled by both readers (the Transaction file fills only where empty, as it does for every
  other field), and `otNorm`/`otFind` accept it so 🔎 ค้นเลขออเดอร์ takes it like any other number.
  **…but the order-track blob only gets `rf` from the Transaction file**, so a month where only the
  allocation file was uploaded has none and the search answered *ไม่เจอ* for the one number a rep
  can actually quote (owner, 28 Nov 26: *"ช่วยปรับให้หน้าเสิจออเดอร์ ให้จับเป็นรหัสออเดอร์ที่เซลล์
  กดมา (แบบเดียวกันกับที่อัพในเซลล์คีย์ ส่วนของออเดอร์พิเศษ)"*). `otFind` now resolves every typed
  number through **`spOrdFind`** first — the same function ออเดอร์พิเศษ uses, so the two pages accept
  exactly the same things, including the **6-digit tail** — turns it into a `BDD01…` number and looks
  **that** up in the months. Three rules: a tail matching more than one reference is **reported, never
  picked** (`spOrdFind`'s own rule); when the blob has no such order but `STOREDAILY.ord` does, the
  row is built **from the sales file** and flagged `sale:1`, whose GIN pill reads **"ยังไม่ได้อัพไฟล์
  ใบจัดของ"** and never "ยังไม่จัด" — not-read and not-picked are different facts; and the full number
  and its tail resolve to one order, so the rows are **deduped by month+key** or the same order would
  be listed twice from one pasted column.
  **Two traps:** the daily file also has `หมายเลขใบแจ้งหนี้ (Reference Invoice Number)` right beside
  it, so the column must be matched on the **exact `(Reference Number)` suffix** (`dsColOf`), not by
  `indexOf`; and `STOREDAILY.ord` is keyed by the **invoice number as well as the order number**, and
  returns (`BDD04`) quote the same reference — so a lookup that does not prefer the `BDD01` sale
  counts the same goods two or three times (measured: 1,392 references point at more than one key).
  `spOrdFind` prefers `BDD01` and reports the rest.
  `parseDailyDcode` also stores **`k` = the Sales Order Creation Date** on `STOREDAILY.ord`
  (optional lookup — a file uploaded before that still parses, and the page simply has no sales-side
  cross-check for it). `d` on that record is the INVOICE date and answers a different question;
  using it for "when did the rep key it" would be wrong on 53% of orders.
  The page is **strictly read-only** over everything, its state lives on the non-synced `OT`, and
  **every role sees it** — the owner said *"ทุกคนเข้ามาดูได้"*, so `wh`/`ds`/`sup` carry explicit
  `role` entries and now see two groups, not one. A `sales` account **opens on its own line**.
  Three ways in, all on one page: the line/day/status pickers, **🔎 ค้นเลขออเดอร์** which takes one
  number or a whole column pasted from Excel (`otFind` — it accepts `BDD01…`, `BDD09…`, the app's own
  `1034715426`, its 6-digit tail, or a bare order tail, walks months newest→oldest until every number
  is found, and **names the ones it could not
  find** rather than printing a silent "not there"), and **📦 ยอดรายสินค้า**, which is what a rep
  filtered to their own line reads. On a phone the 7-column table folds into one card per order
  (`@media` + `data-l` labels), because ① and ② scrolled off the right edge otherwise — the same
  lesson as the rep's entry cards in ออเดอร์พิเศษ. A `<td>` that folds must hold its lines in **one
  element**, or the flex row turns `<br>` into a second flex item and a long shop name pushes the
  code off the card.
  **Every row carries two badges and the filter covers both** (`otInvPill`/`otGinPill`/`OT_FILT`,
  the owner's order 26 Nov 26: *"ตัวไหนที่มีบิลแล้ว หรือมี GIN หรือยังไม่มี ขึ้นป้ายแถบระบุไว้ให้หน่อย
  หรือเพิ่มกดฟิลเตอให้เลือกดูได้เฉพาะรายการบิลยังไม่ออก GIN ยังไม่ออก"*): 🧾 บิล and 📦 GIN, green
  when done and red when not, never a blank cell. The status picker is grouped — บิล (ยังไม่ออก /
  ออกแล้ว) · คลังจัดของ (ยังไม่จัด / จัดแล้ว) · **ค้างทั้งสองอย่าง** · the file's own statuses — and
  a summary card counts ยังไม่ออกบิล beside คลังยังไม่จัด.
  **"ออกบิลแล้ว" has two sources and one trap** (`otHasInv`): the invoice number stored on the order,
  or the order appearing in the daily sales file, which IS a list of bills. But a record written by
  **`parseTxn` carries `tx:1` and no `cs`**, and that file holds orders that are not billed yet (and
  cancelled ones) — so it must NOT count as billed. This is the same `cs===undefined` test `spRow`,
  `spCases` and `spShops` make; `x.sl.inv` never existed on that index, so the old fallback was dead
  code. Prove it with
  **`node test/browser/ordtrk.test.cjs`** (112 checks, self-contained with made-up codes; 114 with the
  real file via `ORDTRK_TXN=/path/Transaction_Inquiry_....xlsx`, which holds real shop names and
  never enters the repo) plus the `api/ordtrk.js` cases in `merge-safety`.
  **📚 The product master has two formats and both must keep working** (`parseMaster` dispatches to
  **`parseMasterDcode`** on the headers `Item Code` + `Status`, which the old `Item_Code` file does
  not have). The owner sent dcode's `Product_Master_ddmmyyyy.xlsx` on 27 Nov 26 — *"ใช้แทนไฟล์เดิม
  แต่รอบนี้ไฟล์ละเอียดขึ้นเยอะ … มีขนาดลังและน้ำหนักของแต่ละสินค้า โดยข้อมูลพวกนี้ให้ใช้กับข้อมูลสินค้า
  หน้าเวปแคตาลอคได้เลยนะ เพราะลูกค้าหลาย ๆ คนต้องการน้ำหนักขนาดลังด้วย"*. Measured on his real file
  (34,267 rows / 33,693 codes, last row `No filters applied`):
  **it is the whole country's material list, not the depot's** — so storing every name alone would
  be 1.4 MB against a MASTER that has always been 75 KB. It therefore keeps only the codes the app
  already knows (old master ∪ order form ∪ price file ∪ stock ∪ ORDERS ∪ PSI ∪ …, ~1,900 for this
  depot ≈ 230 KB, the `pmCodeSet` rule) and **reports how many it skipped**; a code the depot starts
  ordering arrives with that round's order form by itself. On a machine that knows **fewer than 200
  codes at all** (a fresh install) it falls back to every `Active` code with a Thai name and says
  which rule it used — and that test is on the size of the **known** set, never on how many codes
  the file happened to match, or a master with little overlap would switch rules silently.
  `MASTER.det[code]` holds `ps` · `gw`/`nw` (kg per case) · `w`/`l`/`h` (mm) and `st` only when the
  status is not `Active`. It merges **per code** like `items` (`mergeMaster`), so an old-format
  upload cannot erase it.
  **`Status` is a real signal and `New` does not mean "new product to sell"**: measured, every one
  of the 1,271 order-form codes and all 1,355 price-file codes is `Active`, while the 359 codes in
  the old master that read `New` are in **neither** file — so `New` = the code exists but is not
  open for ordering yet.
  ⚠️ **The file has no replacement-product column.** The owner thought column W held it; column W is
  `Alternate Item Description` — 201 rows of 33,693 (0.6%), 78 of them the item's own name repeated
  and the rest an English spelling of the same product, and **not one** of the codes the depot
  receives has one. `Lead Base Pack` (S/T) is not it either: it resolves to 11–20 active codes per
  pack and crosses flavours (สุกี้ชาบู → ต้มยำ), so answering "buy this instead" from it would be
  wrong. The real answer to "which code do I order now" stays the order form's own colours
  (`poWhy`/`psSwap`). Tell the owner that plainly rather than shipping a guess.
  **The catalogue gets weight and case size through the price file, not through MASTER**
  (`prDimOf`/`prDimTxt` in the app, `dimTxt` in `src/pricelist.html` — the same formula in two
  places, compared by the test): the public page is a standalone file that may only call
  `/api/pricelist`, so `parseHuasuer` attaches `it.d = [gw, w, l, h]` from `pmDet(code)` at
  parse time, exactly as it already attaches the ordering-system name in `it.o`. The in-app price
  table reads `pmDet` **live** first, so uploading a master shows there immediately; the public
  catalogue needs the price file uploaded once more, and the master's upload log says so.
  `parseMasterDcode` awaits `prLoad()` first, because without it 75 of the 1,355 catalogue codes
  would not count as "known" and would lose their weight.
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
  The **📦 สต็อก** group has two tabs: `stock` (สต็อคปัจจุบัน, the daily stock file) and
  **`cstock` (🧊 สต็อคกลาง)** — stock the depot billed out in advance and still has to place.
  `parseStock` reads **two different stock files** and must keep reading both: the depot's old
  one, and **the new dcode system's `DataExtract*.xlsx`** (BD moved to dcode in Nov 26). The new
  file is recognised by its **`ประเภทสต็อก` column**, which the old one does not have, and goes to
  `parseStockDcode`; `STOCKD.src` says which (`"dcode"` / `"old"`) and the page labels itself from
  it. Both land in the SAME `STOCKD.rows` shape, so every page that reads stock (`stkOf`, คำขอ,
  Drop ค้าง, auto-PO) is untouched. **dcode renamed the two warehouses** — the owner's words:
  *"จะเปลี่ยนชื่อจากคลัง Sales เป็น Sound และ Gift เป็น Free คือของขายและของแถมดังเดิม"* — so
  `01-Sound` → `wh:"sale"` and `99-Free` → `wh:"gift"` (`DC_WH`); the internal codes are unchanged
  and the screen shows both names (`🛒 คลังขาย (Sound)`). Four things are easy to get wrong:
  **product codes are no longer all digits** — dcode has `G…` codes (fan give-aways, Off-Invoice,
  VIP packs: 106 real rows in the first file), so the old `/^\d+$/` filter dropped them silently
  and the count read 1520 instead of 1626; **คงเหลือปัจจุบัน is read from the file, never
  recomputed** (closing − allocated matched in only 1552/1626 rows — the rest are case-breaks);
  the file has **no pack size**, so `d` stays blank rather than guessed (deriving it was whole in
  406/550 rows and agreed with the product name in 50); and columns are found by **exact header
  text**, so a header dcode renames **throws and stores nothing** instead of writing zeros over
  good stock. An unknown `ประเภทสต็อก` is kept in the sale warehouse and **reported**, never
  dropped. Prove it with **`node test/browser/stockdc.test.cjs`** (34 checks, self-contained with
  made-up figures; 36 with the real file via `DCODE_STOCK=/path/DataExtract.xlsx`, which never
  enters the repo).
  **📊 รายงานสต็อค is its own tab** (`strep`/`renderStockRep`/`stkValHtml`/`stkValGrp`/`stkValAgg`),
  between สต็อคปัจจุบัน and สต็อคกลาง. The owner asked for the value breakdown on 26 Nov 26 —
  *"ให้ขึ้นโชว์มูลค่ารวมของสินค้าหน่อย และทำให้กดแยกดูมูลค่ารายหมวด รายแบรนด์ได้ด้วยนะ"* — and the
  next day moved it off the stock page: *"ให้ปรับไปอีก tab ข้าง ๆ … วางไว้ระหว่างสตอคปัจจุบัน และ
  สต็อคกลาง(เดิม) แยกไปอีกหน้าเลย เพราะข้อมูลมันเยอะไปละ"*. It is **manager-only**, both as a
  `role:"manager"` tab entry and as a check inside `renderStockRep` — the same gate the ต้นทุน
  columns already carried, because it is cost data. Its warehouse pick is `STK.rwh`, separate from
  the stock page's `STK.wh`, so switching one page does not move the other, and the drill-down
  repaints through `stkVPaint` (which page is open), never `renderStock` directly. Four rules, each one this file states elsewhere: the money is **read from
  the file's own value column (`v`), never recomputed** from ราคาถัวเฉลี่ย × จำนวน (dcode gives no
  pack size and the file rounds — the NTT rule); that column pairs with the **closing** quantity, so
  the ลัง beside it is `r.e`, labelled ยอดปิดวัน, never คงเหลือปัจจุบัน; a row the file left
  **without a value is counted and named, never summed as 0** (the old file marks the gift warehouse
  by `มูลค่า = 0`, so that whole warehouse has no value and the page says so instead of printing ฿0);
  and **หมวด/แบรนด์ exist only in the dcode file**, so with the old file those two chips are disabled
  and the page says why, rather than showing one `(ไม่ระบุ)` band. Category names are shown **as the
  file writes them** (`FABRIC SOLUTIONS`, …): `CAT_TH` holds the price file's own abbreviations and
  does not fit this column, and a guessed translation would be worse than the name the owner already
  reads in dcode. Clicking a category drills into its brands and then its products (`stkVOpen`/
  `stkVBack`, state on the non-synced `STK`), and the panel follows the search box — when it does, it
  says how many of the warehouse's rows it is counting.
  **Everyone sees it** ("เพื่อให้ทางเซลล์ไปขายกันมา"), only the admin writes: every writing
  function tests `cstMgr()` itself, never relying on the button being hidden.
  The admin now **types the bill-cut slip in the app** (`cstNew`/`cstSlipSave`), not in Excel —
  วันที่ตัดบิล · รหัสสินค้า · ชื่อสินค้า · ลัง · ชิ้น · สายวิ่ง (CT11–KA99) · ผู้รับผิดชอบ, plus
  **Note ถึงคลัง** and **Note ที่ไปของสินค้า** at the bottom, with code ⇄ name linked to MASTER
  both ways and **⇉ spread one row across all 12 lines** (the source file bills one SKU into every
  line at the same quantity). Rows can also be **ticked and changed together** (`cstSelTog`/`cstBulk`:
  line, owner, cases, pieces, product, delete, spread) — asked for as "ติ๊กรายการที่จะปรับ แล้วปรับ
  ทุกรายการให้เป็น KA97 ครั้งเดียว"; `sel` lives on the form row only and is never written to a lot,
  and a bulk button with nothing ticked must warn, never fall back to "all rows".
  A row may carry **its own date** (`r.d`): one real lot spans several bill-cut days, so a later edit
  of the slip must not flatten the rows onto the slip's date.
  The un-saved slip is a **`localStorage` draft** (`bdcst:<user>`),
  deliberately NOT part of the synced state. One saved slip = `CSTOCK.slips[sid]` (header only) plus
  one lot per row carrying `sl`/`ln`; **the rows are read back from `lots`, never stored twice**.
  Each slip exports as Excel (`cstSlipXlsx`) or PDF via the browser's own print (`cstSlipPrint`
  into `#prArea`, which must stay a direct child of `body` for the `@media print` rule).
  Status (`รอจัดส่ง · รอเคลียร์` → `เคลียร์ไปบางส่วน` → `เคลียร์หมดแล้ว`) is computed from `clr[]`
  on every render and **never stored as a field**. Every slip and lot is **coloured by the share of
  cases already sent out** (`cstPct`/`cstPctCol`/`cstPctPill`/`cstPctBar`): 0% is always red, 100%
  always green, and in between the hue walks orange → yellow → light green in proportion — the
  owner asked for the gradient, so never collapse it back to three fixed colours, and never let 99%
  render the same green as 100%. The same scale paints the left border, the progress bar, the pill
  and every bar in the report.
  A third page, **📊 รายงานย้อนหลัง** (`cstRepHtml`, `CST.sec==="rep"`), is the year tracker the
  owner asked for: year picker with ◀ ▶, a month table, a slip table, by-product and by-line
  summaries, and a 3-sheet Excel export (`cstRepXlsx`). **Everyone can open it, including sales**
  (only 🧾 ใบตัดบิล is manager-only), and it is **strictly read-only** over CSTOCK — same rule as the
  auto-PO calculator: it stores nothing, syncs nothing, and `CST.ry`/`CST.rm` live on the non-synced
  `CST`. Every figure is recomputed from the stored slips and lots, so the report can never disagree
  with the รายการค้าง page. It also separates **"cut in month X"** from **"actually sent out in
  month X"** (`cstRepOut`, keyed on each clearing's own date), because they are different questions. Recording a sale (`cstClrSave`) writes date +
  quantity + **shop**, searched through `cstStoreIdx()` which takes `STOREPROD.stores` (the monthly
  insight file, the source the owner named) first and `STORE`/`PJP.out`/`STOREDAILY` as fallbacks.
  The Ex.export file (which shops the bills were cut into) is read by `parseCStockEx`: the shop code
  is the **`ผู้สั่งซื้อ (ID)`** column, matched by **exact header text** — `ผู้สั่งซื้อ` is a
  substring of it, so `indexOf` picks the wrong column — cancelled bills are skipped, and it lands
  in **`CSTOCK.ex[sid]`, a map of its own**, because the owner submits the slip first and attaches
  the file later, so slip and file are saved at different times from different tabs.
  A slip billed into **one or two shops gets no Excel file at all** — the admin picks the shop in
  the app (`cstExManOpen`/`cstExManSave`, the 🏪 button beside 📎). Those rows live in
  **`ex[sid].man`, never mixed into `rows`**, so a later Ex.export upload cannot wipe them
  (`cstExSet` carries `man` over) — and because `ex` merges newest-wins as one record, `api/save.js`
  merges the two halves separately (`mergeExOne`: the newer record wins but a missing `file` half is
  refilled from the other side; `mergeExMan` unions the rows by id). Removing a hand-keyed shop
  writes a **tombstone `x:1` in place**, never a splice, or a stale tab puts it back. Everything on
  screen, in the Excel export and on the printed slip reads the combined figures through
  **`cstExStat`**, so the two halves can never be counted differently. `CST_EX_FAV` pins
  **ปิโตรเลียมไทย / ซีอาร์ซีไทวัสดุ** (all their branches) to the top of the picker — matched on the
  shop NAME, since each has several codes.
  `cstExRead` also accepts **admin 2's own summary file** (`Stock_2026.xlsx`): one sheet holding
  several lots as **blocks** (title row, then `เส้นทาง · วันที่ใบแจ้งหนี้ · เลขที่ INV. · รหัสร้านค้า
  · รายชื่อลูกหนี้ · หัวเรื่องคำสั่ง · จำนวนเงิน`). `cstExStock` splits the blocks and `cstExMatch`
  attaches each to the slip it belongs to, scored by **bill date first** (×10, plus a bonus when the
  block's main date is the slip's date) then by line; a block that matches no date at all is
  **reported, never guessed onto a slip**.
  🙈 **A hidden Excel column is not data.** The hidden flag only reaches SheetJS when the workbook
  is read with `cellStyles:true` (`CST_XOPT`), and every cstock reader does, then blanks hidden
  columns before matching headers (`cstHidden`). Admin 1's file copies one sheet into the next, so
  three sheets still carried a second product in hidden columns G–J; read as real, it put a product
  the owner could not see on every slip. Never drop `cellStyles` from these readers.
  The 4 historical lots the owner sent (Oct 26) are seeded by **`cstImport`** from `cstImpDefs()`,
  run once from `loadData`: it skips any slip that already exists **or carries an `sdel` tombstone**,
  so a deleted slip never comes back. Every imported row starts **not cleared** — the clearing
  history the files record lives in the slip note for the admins to tick off themselves. Data
  already pushed is repaired by `cstImpFix`, which is versioned on the slip itself (`fx`, which
  survives `mergeState` because a slip merges as one record) and only removes clearings whose
  date+recipient match what the import wrote, so an admin's own entry is never eaten.
  The 906 customer rows that go with them are deliberately
  **not in the repo** (it is public) — the owner attaches them by uploading his own file once.
  The **รายการค้าง page groups rows under their slip** (`cstListHtml`): one block per bill-cut
  slip, click to open, then **tick any number of rows and save them in one go** — a tick only
  selects (`cstSelRow`, `cstSelGrp` for a whole slip), and `cstBulkSent` opens **one** dialog that
  asks the date and **where it went** once and writes each row's own remaining quantity
  (`CST.clr.ids`); the quantity fields are hidden in that mode. Opening the dialog per row was the
  complaint — *"ติ๊กรายการแล้วมันขึ้นไล่ให้ปรับทีละตัว"* — so a tick must never open it.
  `cstBulkUnsent` reverses a selection, and 📝 on a row still does a partial amount.
  Each row shows the four figures the owner asked for — **วันที่ตัดบิล (always, even when the slip
  has one date) · ทั้งหมด · เคลียร์แล้ว · ยังค้างรอเคลียร์** — and the clearing detail is
  **hidden behind ▼ ดูรายละเอียด** (`cstRowTog`, state on the non-synced `CST.row`), where each
  dispatch is one line with its own 🗑 (`cstClrDel`). Never put that detail back in the row: the
  shop + date + PO text made the table wider than the card and pushed the action cell off the right
  edge, so rows with clearings silently lost their buttons (measured: right edge 1409 against a
  1216-wide card) — which is what "บางตัวมีปุ่มท้าย บางตัวไม่มี" was. The table is wrapped in
  `.tblwrap` so an overflow scrolls instead of clipping.
  **Three different units live on this one screen and must never share a word**: a 🧾 bill-cut
  slip, a 📦 product line inside it, and a case. The header used to read *"ของที่ตัดบิลไว้
  (16 รายการ)"* counting **outstanding product lines after the filter**, while 📦 ออเดอร์พิเศษ
  counts **slips** — so the owner compared `16` with `3 + 4` and asked *"ทำไมจำนวนบิลในหน้าเก่า
  ไม่เท่ากันกับที่เคยลงไว้"* (25 Nov 26). Nothing was lost; the words collided. The header now
  states **both** numbers (`cstListHtml` returns `slips`/`slipsAll` beside `n`), and because the
  default filter is `CST.only="open"` a slip with everything cleared vanishes from the list
  entirely, the page now says how many slips are hidden and why. The spord month card says
  **ใบออเดอร์** in every state, including zero. Keep all three units named apart.
  That bar **must stay on screen** (`.cst-bulk.stick`, sticky under the 60px header): it is
  rendered once above all the slip blocks, so with a 16-row slip open the owner ticked rows and the
  bar sat 289px above the viewport — "ติ๊กแล้วไม่มีปุ่มขึ้นมาให้". Never drop the sticky, never put
  `overflow` on `.panel`, and keep the ticked rows highlighted whole-row (`.cst-rt tr.on>td`, painted
  on `>td` not `tr`).
  **Neither page header carries any upload or create button**: ➕ ตัดบิลใหม่ lives inside the
  🧾 ใบตัดบิล page, and a shop file belongs to one slip, so it is attached from 📎 inside that
  slip — or from **📎 in the slip form itself** (`cstFormEx`), which saves the new slip first,
  since a file cannot attach to a slip that has no id yet.
  **`คงเหลือ` is always computed (`cstLeft`), never read from a file or a form** — the owner's
  original notes said "85 … 50 … 5 … คงเหลือ 12" when 85−50−5 is 30, and that hand-typed number is
  exactly how stock got forgotten. Clearings live **inside the lot record** (`clr[]`), not a
  separate map, because one re-uploaded file is the whole truth and a separate map would leave
  orphan rows. The merge is a union per lot id, so **a file missing some lots cannot delete them**;
  removing one needs the `CSTOCK.del` tombstone (`sdel` for a whole slip, which also drops its
  `ex`), and a row that already has clearings cannot be dropped by editing the slip at all.
  The Excel round-trip stays for old data: `parseCStock` finds its columns by header text and
  **refuses the whole file** on a missing sheet, missing header, duplicate lot id, a row with no lot
  id, or a clearing that references a lot that does not exist — swallowing that last one would make
  the remaining quantity read higher than reality. When writing the template, a formula cell must
  carry a cached `v` as well as `f`: **SheetJS drops formula cells with no value**. Prove all of it
  with **`node test/browser/cstock.test.cjs`** (253 checks; it must load the page over a real origin,
  not `setContent`, or the draft's localStorage is blocked). Rules: `HANDOFF.md` §5.
  **A slip is named `วันที่ · N รายการ · N ลัง`** (`spSlipTitle`/`spDateShort`, owner 26 Nov 26:
  *"ใช้วันที่ - จำนวนสินค้า - จำนวนลัง ขึ้นแทน เช่น 11 พ.ย. 7 รายการ 160 ลัง"*). It replaced the
  product-name title of earlier that day, which overflowed on a phone and made two slips that start
  with the same product unreadable apart. The Thai year appears **only when the slip is not from
  this year**, so today's slips stay short. The slip id stays as a small reference line, because
  admins quote it to the warehouse, and a slip with no date or products falls back to the id rather
  than rendering blank.
  **An order carries one of three purposes** (`SP_GRP`, brought back 26 Nov 26) shown as a `.sp-tag`
  on every card and header: **🎯 ตัวกระจาย** (the supervisor opens it; it has to reach many shops),
  **🧾 ตัดบิลรอส่ง** and **🚚 ส่งแล้วรอตัดบิล**. **No data was migrated and none needs to be** — `A`
  and `B` keep exactly the meaning they have had since 18 Nov 26 and only their labels changed, `D`
  is the new one, and a slip with no flag still reads as `A`. Never reassign what a letter means:
  every stored slip would silently change type.
  **The slip page's tabs depend on the slip's type** (`SP_TABS`/`spTabsOn`, owner 26 Nov 26):
  🎯 ตัวกระจาย runs **① ✍️ ซุปจด → ② 📲 เซลล์คีย์ → ③ 🔎 แอดมินตรวจ → ④ 🚚 คลังจัดส่ง**, while
  🧾 ตัดบิลรอส่ง and 🚚 ส่งแล้วรอตัดบิล are **two steps only — ① เซลล์คีย์ → ② คลังจัดส่ง**
  (owner, 26 Nov 26: *"หลังจากเซลล์คีย์ออเดอร์มา แค่ให้แอดมินมากรอกส่วนของคลัง ว่าสินค้าออกไปกับ
  เลข GIN ไหน สองขั้นตอนเท่านั้นเอง แอดมินไม่ต้องมาเช็คเหมือนร้านที่กระจายเยอะ ๆ"*), so the whole
  🔎 แอดมินตรวจ comparison belongs to D alone and A/B get a small **เลข GIN box inside คลังจัดส่ง**
  (`spGinNote`/`spGinNoteHtml`) that writes the same `CSTOCK.gin[sid|date]` record with empty `rows`
  — no new section, and it needs no allocation file. **📊 รายงาน** is appended for the
  manager. The step numbers are therefore computed from what is actually shown, never written into
  a label. A slip with no ซุปจด step must also **drop the เป้า / ยังขาด / ผล columns** (`spHasTgt`),
  or the rep's page reads as if someone forgot to set a target. The tab row is drawn into
  **`#spTabs`, the first element of the view** — the same `.tabs2` row the other groups' sub-tabs
  use, so it sits under the main tab bar instead of inside a panel halfway down the page
  (*"เอากรอบในนั้นขยับขึ้นมาอยู่ด้านบนให้เห็นชัดชัด"*). `spOpenSlip` lands on the first tab that slip
  really has, never a hard-coded `"key"`. **🧾 เลขออเดอร์ is retired** (*"มันซ้ำกับหมวดคลังจัดส่งแล้ว"*)
  the same way a retired upload slot is: `off:1` keeps it out of the row while `spSec` still opens it
  and `spOldHtml`/`CSTOCK.sub`/`subdel` keep working, so putting the line back restores it with its
  history. Everyone may *open* every tab; who may *write* is checked inside each function. Only the
  first three are per-day, so `spDayPick` is hidden on the others (`SP_DAYTABS`).
  **④ is called 🚚 คลังจัดส่ง** (renamed from คลังจัดส่ง on 27 Nov 26) **and is the admin's daily
  verification record** (`spDayChk`/`spOutChkHtml`/`spChkXlsx`/`spChkPrint`, owner: *"ทำให้หน้านี้
  เป็นส่วนของแอดมินที่ตรวจข้อมูลการคีย์ว่าตรงหรือขาดหรือเกินกี่ลัง แล้วตรวจสอบกับทางคลังเป็นรายวัน
  จากเลข GIN ที่ตรวจมาจากหน้าแอดมินตรวจ … หรือดึงออกมาเป็น EXCEL PDF ได้เหมือนเดิม เพื่อเก็บเป็น
  record"*). One row per day the admin has checked — วันที่ · GIN · เซลล์คีย์ · คลังจัด · **ขาด** ·
  **เกิน** · ผลตรวจ — tapping a row opens the products that disagree, and the whole slip exports to
  Excel (สรุปรายวัน + รายการที่ไม่ตรง) or PDF through the browser's own print, both read from
  `spDayChk` so the document and the screen cannot disagree. Three rules: **the difference is
  computed per product code and only then summed**, because case sizes differ and a net difference
  in pieces converted once is a meaningless number; **ขาด and เกิน are separate buckets and are
  never netted off** — short 5 cases of one code and over 5 of another is not "ตรง"; and a row the
  rep never keyed counts as เกิน while a row the warehouse never shipped counts as ขาด, both of
  which the admin has to chase, so neither may be skipped. Rows whose units cannot be converted are
  counted and reported, never treated as 0. The volume roll-up by product that used to be the whole
  page is still there, below. Read-only.
  **For 🎯 ตัวกระจาย, ④ คลังจัดส่ง is a report read out of the allocation file, not a form**
  (`spAllOut`/`spOutAllocHtml`, owner 26 Nov 26: *"ให้ใช้ไฟล์ที่แอดมิน up เข้าไป … ระบบขึ้นรายงาน
  ได้เลยว่าคลังจัดส่งไปแล้วทั้งหมดกี่ลัง … ไม่ต้องรอซุปจดหรือเซลล์คีย์ เพราะเป้าหมายของออเดอร์แบบนี้
  คือการ match ข้อมูลออเดอร์ที่เซลล์คีย์ กับคลังจัดของให้ตรงกัน"*). It reads the **stored** checks
  (`CSTOCK.gin[sid|date].rows`), not the file held in memory, so it reads back without re-uploading;
  it needs no target and no keyed figure; it converts ลัง/แพ็ค/ชิ้น through `alPcs` and **reports the
  rows it cannot convert instead of guessing 1**; and it is **strictly read-only** over CSTOCK. ใบ A/B
  keep the manual สต็อคกลาง clearing exactly as before, and a D slip's lots are untouched — they are
  still on 🧊 สต็อคกลาง. **`spSent(sid)` is the one answer to "how many cases have left the
  warehouse"** (allocation for D, lot clearings for A/B); the month card, the tab and the manager
  report all call it, or a card shows 0% while the tab inside shows 27%.
  **📦 Each admin-check day opens with a per-PRODUCT summary** (`spCmpProd`/`spProdSumHtml`, owner
  28 Nov 26: *"สรุปยอดจำนวนสินค้าแต่ละรายการหน่อย ว่ามีคีย์ออกไปทั้งหมดกี่ลัง เป็นของสายไหนกี่ลัง
  ตรงกี่ลัง ขาดกี่ลัง … แอดมินไม่ต้องการดูเป็นรายงานรายสายแบบนี้ แต่ต้องการดูสรุปยอดรวมของสินค้า
  ทั้งหมด ผลต่างมาจากส่วนไหน แค่นั้นพอ"*). **The unit of comparison is the product code, not the
  line**: one row per code — 📲 เซลล์คีย์ · 🚚 คลังจัด · ✅ ตรง · ขาด/เกิน — with the lines as small
  chips inside that row, so "เป็นของสายไหนกี่ลัง" is answered without a section of its own. A chip
  shows what the warehouse **shipped** for that line and turns red when that line's keyed figure
  disagrees, because a code can total correctly for the slip while two lines have it swapped.
  Above the table, five cards and a **"ผลต่างมาจากส่วนไหน"** line that splits the difference into
  its causes: คลังจัด แต่เซลล์ไม่ได้คีย์ · เซลล์คีย์ แต่คลังไม่ได้จัด · จำนวนไม่ตรงกัน.
  **ตรง/ขาด/เกิน are computed per code and only then summed** — short 5 cases of one code and over
  5 of another is not "ตรง", the same rule as the daily check; and quantities are summed in pieces
  and split back at the end (`alPcs`/`alSplit`), never by adding case counts, because every code has
  a different case size and the file mixes ลัง/แพ็ค/ชิ้น in one row. A row that cannot be converted
  is **counted and named**, never guessed at 1 — and that is why `spCmp` now **borrows a code's case
  size** from another row of the same code, or from `MASTER.det[code].ps`, when the allocation file
  has no row for it: those are exactly the "เซลล์คีย์ แต่คลังไม่ได้จัด" rows, so without the fallback
  the whole ขาด figure vanished. On a phone the table folds to one card per code (`.sp-pfold`).
  **The old per-line report (`spCmpLines`/`spLineSumHtml`/`spLnCs`) is retired, not deleted** — the
  functions still work; putting the one call back in `spAdmHtml` restores the whole block, the same
  way a retired tab comes back. `SP.cmpLn` and its filter are untouched and now driven by the chips.
  **💰 No money on the admin's two tabs** (owner, 28 Nov 26: *"ส่วนของคลังจัด และแอดมินตรวจ เอาพวก
  NIV ออกไปละกัน เอาไปขึ้นโชว์ในรายงานของ manager อย่างเดียว แอดมินจะได้ไม่งง แล้วเน้นตรวจจำนวน
  ชิ้น และลัง แทน"*). ③ แอดมินตรวจ and ④ คลังจัดส่ง — screens, Excel and PDF alike — carry only
  quantities; **📊 รายงาน is the one place GSV/NIV appear**, and it is owner-gated (`spRptOk`).
  **This hides, it does not stop storing**: `spCmp` still computes `sum.sNiv`/`sGsv`/`fNiv` and the
  check still saves `gin[].rows[].g`/`.v`, so the report reads back unchanged and nothing has to be
  re-uploaded if he ever wants a figure back on the admin screen.
  **📅 ④ คลังจัดส่ง opens on the calendar, like ③** (`SP_DAYTABS` now holds `out`, owner 28 Nov 26:
  *"flow งานส่วนของหน้าแอดมินตรวจมาคลังจัด ทำให้ต่อมาเป็นปฏิทินเหมือนกันหน่อย … โดยการเลือกวันใน
  ปฏิทินเป็นสเตปแรก"*). Picking the day is step 1, then **`spOutDayHtml`** shows that day's result
  — keyed · shipped · short · over · the products that disagree, with that day's Excel/PDF — and the
  all-days table stays below as **📒 ประวัติการตรวจย้อนหลัง**. All three read the same `spDayChk`.
  ⚠️ Putting a day picker on a read-only tab exposed a real defect: `spRepRec`/`spRepByLine` called
  `spRepOk()`, which **creates `CSTOCK.rep` while merely drawing the page**. `cstOk()` now builds
  `key`/`gin`/`rep` with the rest of CSTOCK's permanent shape and the readers go through
  **`spRepAll()`**, which creates nothing — a read-only page must never become a change that a later
  save carries to the server.
  **📋 รายการที่ขายออกไปแล้ว** (`spSoldHtml`) is the ตัวกระจาย page's detail list: per product, cases
  sold, free goods, **how many shops it reached** and the money, all from the stored check. `alPick`
  counts distinct shops per line·code and stores **only the count** (`rows[].sh`, `shop[code]`), never
  the shop codes — the `pmCodeSet` rule, and the repo is public. Shops are **not summed across days**
  (a shop can buy twice); the biggest single day is shown and the page says so.
  **🎁 The free-goods mechanic is derived from the allocation file itself** (`alMech`, owner 26 Nov 26:
  *"ลองจับรหัสและ mechanic การแถมของแต่ละโปรจากไฟล์ bum ดู"*). Measured on his real
  `BUM_DT_Dec26.xlsx`: the BBF block holds **only 24 rows, all for the file's own round
  (01/12/2026–31/12/2026) and all แถมตัวเอง** — none of the eight codes on the promo slides he sent,
  and it cannot express a cross-product free (Lux buys Rose, gives Sakura). **So BUM cannot answer
  this question** and the pairing is read out of what the warehouse actually shipped. Measured on
  the real 10,428-row allocation file: **the true partner co-occurs in 100% of the orders carrying
  that free line**, while codes merely bought alongside sit at 85% / 70% / 40%, so a ≥95% threshold
  separates them cleanly on all 7 pairs — and the **modal (sale, free) quantity pair in the file's own
  unit** reproduces Unilever's own wording exactly (ซิตร้า 2 ชิ้น:1, ลักส์ 2 ชิ้น:2, Happy Slot
  1 แพ็ค:1). Never reduce that pair to a ratio: 2:2 would print as "1 แถม 1". **Two candidates can
  tie at 100%** (65691965 ties with ลักส์ in the real file) — self-pairing wins first, then
  co-occurrence, then modal consistency, and **a remaining tie stores nothing rather than guessing**,
  because a wrong pair makes the page accuse the warehouse of short-shipping. The pair and the shop
  counts are saved on the check (`gin[].mech`/`.shop`, rebuilt field by field in `api/spord.js`), so
  they read back without the file.
  **🎁 ของแถมตามโปร** (`spBbf`/`spBbfHtml`) then compares formula against reality, taking the derived
  pair first and the BUM `ex` block only for codes the allocation file never paired (owner 26 Nov 26:
  *"ลองจับรหัสและ mechanic การแถมของแต่ละโปรจากไฟล์ bum ดู เช่นซิตร้าในออเดอร์นี้มันเป็นโปรสองแถมหนึ่ง
  ลักส์เป็น 2 แถม 2"*). Nothing has to be typed in and no new file is uploaded: `parseBUM` already
  stores the Non-Cust sheet's BBF block per code — **`fb` = AU buy cases · `fc` = AV free product
  code · `fq` = AX free cases**. The section sits under the allocation report and compares the
  formula against what the warehouse actually shipped. Four rules: **free goods cross product codes**
  (Lux buys Rose and gives Sakura), so the expected quantity accumulates **on the free code**, never
  on the bought one; a row whose `fc` is blank is read as "แถมตัวเอง" and **says on screen that the
  file did not state a code**; the expected figure is **(ประเมิน)**, because it is computed over the
  whole slip while the promos cap sets per shop, and the page says a small difference is not an
  error; and a code the BUM file carries no BBF row for is **counted and listed, never treated as 0**.
  BUM is the depot's cost file, so the whole section is **manager-only inside `spBbfHtml`**.
  **The slip header carries one admin button, ✏️ แก้ไขใบ** (`spGrpBar`, shared by `spBarHtml` and
  the slip view). The type picker moved **inside the edit form** on 26 Nov 26 — *"ให้ย้ายมันเข้าไป
  อยู่ในปุ่มแก้ไขใบ ให้ต้องกดแก้ไขใบก่อนแล้วค่อยไปเปลี่ยนประเภทใบ"* — so a stray tap on the header
  can no longer retype a slip. The slip view used to overwrite `#spBar` with its own string, so the
  buttons vanished the moment you opened a slip — which is why the owner could not switch an
  order to ตัวกระจาย at all. `spEditSlip` reuses `cstSlipEdit` + the สต็อคกลาง form exactly as
  `spNewOrder` does; both `cstSlipEdit` and `spSetGrp` had `g:(s.g==="B")?"B":"A"` hard-coded, which
  silently demoted a 🎯 ตัวกระจาย slip to ตัดบิลรอส่ง — **always read the type through `SP_GRP`**.
  **The 📥 allocation upload sits at the top beside ➕ สร้างออเดอร์ใหม่** (`spAlBtnHtml`/`#spAlBox`),
  not inside one slip's admin tab — *"ไฟล์นี้อัปทีเดียวใช้ได้ทั้งระบบ"*. It is the one exception to
  the single-upload-button rule.
  **But "not stored" must never read as "not uploaded"** (the owner, 26 Nov 26: *"ผมอัพไฟล์
  allocation ไปหลายรอบมาก ทำไมมันไม่เซฟให้ … ถ้าไม่มีอะไรเปลี่ยนแปลง ให้คงไว้ตามเดิม ไม่ต้องลบออก"*).
  Measured on his real 1.7 MB file: the upload **did** save — 1,789 orders / 452 KB posted to
  `/api/ordtrk`, no error. Two real defects sat behind the complaint, and both are fixed:
  **① `parseAlloc` replaced `ALLOC` instead of merging it**, so a narrower export dropped the days
  already read — it now unions the GIN map and the day list and reports how many it carried over
  (`kept`); **② every label read the memory-only `ALLOC`**, so after each refresh the page said
  *ยังไม่ได้อัพไฟล์*, which is exactly why he uploaded again and again. `parseAlloc` now also writes a
  **tiny note** — `CSTOCK.alc = {up,file,d1,d2,n,days,by,byName}`, a few hundred bytes, the file name
  and the days it covered, never the file — and `spAlcRec`/`spAlcTxt`/`spAlLabel`/`spAdmHtml` read it
  when `ALLOC` is gone, naming the file and saying the saved checks are still there. `alc` is a
  field on `CSTOCK`, which `api/save.js` rebuilds from an explicit list, so it needed
  `pickNewerAlc` there (newer `up` wins; a tab that has never heard of the field can never blank
  it) and three cases in `merge-safety`.
  **📥 …and on 27 Nov 26 the file itself was finally kept** (`api/alloc.js`, `ALLOC_PREFIX`,
  `alPack`/`alUnpack`/`alPush`/`alFetch`). The note was not enough: the check genuinely needs the
  file for any day nobody has checked yet, so a phone that had never read it still asked for it —
  *"ตอนกดตรวจเลขจริงมันขึ้นให้อัปไฟล์ ซึ่งไม่แน่ใจว่าทำไมต้องอัป … เพราะผมอัพไฟล์ Allocation ไปแล้ว"*.
  The answer is to keep the file, not to word the prompt better. **It gets its own month-sharded
  blob, never `bd-data-*`** — the ORDTRK reasoning exactly. Measured on his real export (9,465 rows
  · 144 GINs · 10 days): the in-memory structure is 1,960 KB, and **776 KB / 125 KB gzipped** in
  the compact form stored (product names and pack sizes deduped into one map per month, zero
  quantities dropped, shop codes as an array) ⇒ ~2.3 MB / 376 KB gzipped a month, which a phone
  downloads fine and which is far under Vercel's 4.5 MB request cap. Verified end to end against
  that file: 144 GINs stored with none dropped, a second upload of the same file changes nothing,
  and the check comes back **identical to the satang** after the round trip — the only values that
  move are Excel's own float noise (`1500.0000001199999` → `1500`), which every screen already
  printed as 1,500.
  Three rules: **inside one GIN the side covering MORE DAYS wins, not the newer upload**
  (`pickGin`) — a GIN usually spans several days (measured: 117 of 145), so an export filtered to
  the last day holds only part of it and newest-wins would quietly shrink it, making the earlier
  day's check under-report; **a GIN that spans a month boundary is written into both months**, or a
  check on the 1st cannot see a GIN that started on the 30th; and the name/pack maps **only grow**,
  so a file that does not mention a code can never drop the name another file gave it. The page
  fetches the month by itself when the admin opens the check (`alHasMon`/`AL_WAIT`, one request per
  month per tab) and `spGinGo` waits for that same in-flight request rather than firing a second
  one — otherwise the button asked for the file while the answer was already on its way. Reading is
  manager-only, like the check itself. Prove it with the `api/alloc.js` cases in
  **`node test/merge-safety.test.mjs`** (330 checks) and the round-trip cases in
  **`node test/browser/spord.test.cjs`** (437 checks).
  **④ คลังจัดส่ง is the สต็อคกลาง flow, not a copy of it.** Nothing was migrated and nothing needs
  to be: the lots already live in `CSTOCK.lots` keyed to the slip by `sl`, so `spOutHtml` just calls
  the same `cstListHtml`/`cstSelBarHtml` filtered to this slip and force-opens the block. 🧊 สต็อคกลาง
  is untouched and the two pages can never disagree. Never fork the clearing code.
  **🚚 ④ opens with the one thing no file can answer: what the warehouse actually shipped**
  (`spWhqHtml`/`spWhqOrders`/`spWhqSt`/`spWhqOkSel`/`spWhqSaveOne`, owner 29 Nov 26: *"ส่วนนี้ไว้ให้
  แอดมินทำงานต่อหลังจากตรวจเลข GIN ให้ไปกระทบกับจำนวนที่คลังจัดจริงอีกทีนึง ว่าจำนวน match กันกับ
  ของที่คลังส่งออกจริงถูกต้องไหม ซึ่งข้อมูลส่วนนี้ไม่มีไฟล์ ให้แอดมินกรอกเองได้เลย โดยสามารถเลือก
  ครอบทุกออเดอร์เพื่อกดตรวจสอบว่าถูกต้องได้ และเลือกกดบางออเดอร์เพื่อใส่ว่าคลังจัดจริง มากกว่าหรือ
  น้อยกว่าในระบบแสดงได้"*). The allocation file says what the warehouse **picked**; nothing says what
  left the building, so the admin checks with the warehouse and types it. The unit is the **order
  number** the reps keyed that day, and "ระบบแสดง" is read through the very `spOrdFind` the rep's
  page uses, so the two pages cannot state different quantities. It is on **every slip type**,
  because every type has a เซลล์คีย์ step. Tick all (or some) → ✅ ยืนยันว่าตรง in one call;
  📝 on one row opens ลัง / ชิ้น / หมายเหตุ and the difference is computed.
  Storage is its own keyed map **`CSTOCK.whq["sid|YYYY-MM-DD|ORDERNO"]`**, never a field on the
  gin record: the admin ticks one order at a time, and newest-wins on a shared record would let two
  admins clobber each other (the `mergeExOne`/`mergeSubOne` lesson). Writes go through
  **`api/spord.js` `act:"whq"`** — manager only, checked on the server, and **the server builds the
  key** from sid + date + order number, so a client cannot smuggle one in; a bulk tick sends at most
  `WHQ_MAX` (300) items in one call and the template's constant must stay in step with the server's.
  Four rules: **un-confirming writes `ok:0`, never a key delete** (a stale tab would union it back —
  the `del:1` / `it:{}` rule); **three states never collapse** — ยังไม่ตรวจ / ตรวจแล้วตรง /
  ตรวจแล้วไม่ตรง; **ลัง and ชิ้น are compared in separate columns** and printed with `spDiffTxt`,
  because case sizes differ per code; and an order whose quantity the system does not know yet is
  **รอไฟล์ยอดขาย**, never 0 (the `spRow`/`spCases`/`spNoSum` rule). `cstOk()` builds `whq` with the
  rest of CSTOCK's permanent shape, and `mergeState` merges it `newestByAt` per key with a deleted
  slip dropping its keys. Prove it with the §10 cases in **`node test/browser/spord.test.cjs`**
  (437 checks — §11 covers the per-line expand, the picking-file quantity source, the per-order
  date and the per-role landing) and the `CSTOCK.whq` cases in `merge-safety` (337).
  **📊 รายงาน answers "what is this slip worth, and what is it net of the reps' sales?"** — cases cut
  / keyed / sent / outstanding from the lots and `CSTOCK.rep`, money from the **admin's stored check**
  (`CSTOCK.gin[].rows[].g`/`.v`, the allocation file's own GSV/NIV), and the day's total from
  `ohSale`. The special order's money is **part of** the daily sales, so the net column **subtracts**
  it. A day missing either side shows **—** and is counted in a banner: never print 0 or the gross
  figure as if it were net.
  **The ← ย้อนกลับ button steps inside the page** (`spNavPush`/`spNavBack`, `SP.hist`): tab → slip
  list → month, and only then out to another tab. `NAV` alone holds tabs, so it used to jump
  straight out of the group.
  **The day picker is a month calendar, not a list of chips** (`spCalHtml`, owner 26 Nov 26:
  *"หน้าบันทึกแล้วของแอดมิน ให้ขึ้นเป็นสีทึบในปฏิทินแทน ไม่ต้องขึ้นวันข้าง ๆ แบบนี้ ไม่งั้นมันจะลิส
  ออกมาเยอะมากแน่ ๆ"*): days with data are solid blue, days the admin has checked solid green, the
  selected day outlined. **`SP.cm` (the month shown) is separate from `SP.day` (the day selected)** —
  the `PJ.ym`/`PJ.d` rule — or stepping back a month snaps forward again on every render.
  Its **◀ ▶ are 44px and blue**: they inherited `.cal-head`'s 34px grey, the smallest tap target on
  the page while every other stepper is a 39×40 blue `.dstep-b`, and a thumb that misses reads as
  *"ปุ่มเลื่อนซ้ายกดไม่ได้"* (26 Nov 26). The buttons themselves always worked — measured at 390px,
  `elementFromPoint` returned the button and a real click stepped 11 → 10 → 09 — so the fix is the
  target, not the handler.
  **`spDays` must test for real content, not for a key** (`spDayHas`): deleting here writes an empty
  record or `del:1` rather than removing the key, so the date chips kept showing days the owner had
  already cleared. **Every counter that walks `CSTOCK.key`/`CSTOCK.gin` must go through `spDayHas`
  too** — `spMonKeyed`/`spMonGin` (the month card) and `spSlipCard` counted bare keys, so a day the
  admin had un-checked (`del:1`) or a GIN note saved and then emptied still read as "ตรวจแล้ว". The
  owner opened a month card reading *"แอดมินตรวจ 2 วัน"* with nothing inside the slip (26 Nov 26).
  The month card and the slip page must always count with the same function, or they disagree.
  **The entry tables freeze their header** (`.tblwrap.sp-freeze`): the wrapper scrolls in both axes
  and `thead th` is `position:sticky;top:0` with an **opaque** background — sticky against the page
  instead would pin the header over the first row, which is why it was removed once before.
  **Each slip type belongs to one side of the depot** (`SP_SIDE`/`spTypeLines`, owner 26 Nov 26:
  *"ตัวกระจาย จะมีแค่สาย CT และอีกสองรูปแบบ ตัดบิลส่งของ ส่งของตัดบิล มีแค่สาย KA จะได้ไม่งง"*):
  🎯 ตัวกระจาย offers the **9 CT lines**, 🧾/🚚 the **3 KA lines**. He named the exception himself —
  *"ยกเว้นในส่วนของคลังจัดส่ง ออเดอร์สร้างจาก KA อาจจะคีย์เข้า CT เป็นตัวกระจายได้"* — and that page
  never goes through `spSlipLines`: it reads the line off the allocation file and the lots. **A line
  the slip's own lots name is always appended**, even when it is on the other side, or work already
  keyed would vanish from the screen while the data sat in the state.
  **👤 The rep's whole flow is one screen** (owner, 26 Nov 26: *"ให้เห็นเฉพาะที่ sup ตั้งไว้ให้คีย์
  เท่านั้น … flow ใช้งานมุ่งตรงไปที่แค่หมวดเซลล์คีย์เท่านั้นพอ หมวดอื่นดูได้ แต่แก้ไขไม่ได้"*).
  `spSlipsView` shows a `sales` account **only the slips carrying work for their line** (`spSlipHasMe`)
  and `spDays` only their own line's days — but `spSlips()` itself is **not** filtered and a slip
  already open is never ejected (`keepSid`), because this is screen tidying, not a permission; writes
  are still checked in `api/spord.js`. An empty list for a rep must say *"ยังไม่มีงานที่ต้องคีย์ของ
  สายคุณ"*, never "there are no orders". `spFirstSec`/`spSec` land a rep on **② เซลล์คีย์**, where
  `spRepHomeHtml` lists every day the supervisor set — **past and future** (he sets targets weeks
  ahead, so no picker is ever capped at today) — and `spDay` opens on **today, else the nearest
  un-keyed day**, never the furthest future one. The day picker is hidden there, since that list is
  the picker.
  **The rep no longer types any quantity — only the day's order numbers** (`spRepMineHtml`, owner
  27 Nov 26: *"ปรับให้เซลล์แต่ละสาย ไม่ต้องเข้ามากรอกตัวเลขแล้ว แต่หน้าที่คือมากรอกเลขออเดอร์ 10 หลัก
  เท่านั้นก็พอ"*). The page is the order-number box first, then a **read-only** list of what the
  supervisor set for that line. The quantity fields that were there before are gone, but the stored
  `it` is **carried over on every save** (`spRepLineSave` reads the previous record), so the figures
  old days already hold are never zeroed, and `spTrack`/`spRepJobs` derive the keyed figure from the
  order numbers instead (`rSrc:"order"`).
  **Both entry tables are 4 columns with a frozen left edge** — `สินค้า · รหัส · ลัง · ชิ้น`
  (`.sp-kt.sp-k4` inside `.tblwrap.sp-freeze`): the name and the code are `position:sticky;left:0`
  so they stay put while the thumb scrolls, and the header is sticky too. The owner asked for
  exactly this after the 7-column table proved unreadable on a phone (*"ให้ freeze pane ชื่อสินค้า
  รหัส จำนวนลัง จำนวนชิ้น … และปรับให้เหลือแค่ 4 colum แนวตั้ง"*). Measured at 390px: the wrapper is
  320/320 — **no horizontal page scroll** — with columns 118/64/69/69, and 497/164/216/216 at 1280px.
  The per-line 💾 button sits in a flex row inside the line header (`.sp-k4-lh`); it was
  `float:right` once and got clipped off the right edge on a phone.
  **The free-goods columns went with it** (owner: *"ให้เหลือแค่ ลัง ชิ้น แค่นี้พอ ไม่ต้องมีแถม"*):
  `spKeyLineSave` carries the stored `fc`/`fp` over the same way, and the Excel/PDF export
  (`spTgtRows`) is 5 columns with the free goods folded into the totals.
  **👤 Each rep owns their own line's daily figure** (owner, 26 Nov 26). The flow he set:
  ① the supervisor types each line's **target** for that day (`CSTOCK.key`, unchanged) → ② exports it
  as Excel/PDF to send the reps (`spTgtXlsx`/`spTgtPrint`) → ③ **the rep logs in with their own line's
  account, opens the same page and types what they actually keyed** (`CSTOCK.rep["sid|date|LINE"]`,
  through `api/spord.js` `act:"rep"`) → ④ the supervisor chases whoever is short (`spTrack`/`spTrackHtml`).
  **Target and actual are different numbers and must never be added together.** Three rules, all
  checked **on the server** against the stored record, never by hiding a button:
  a rep may save **`REP_MAX` times a day per line** and only for **their own line**
  (`LINE_OF` maps `209611` → `CT11`); the **supervisor cannot edit a rep's figure at all**, only read
  it — the owner said so in as many words — while a `manager` can, because otherwise a rep who
  burns their saves on a mistake is stuck. **`REP_MAX` was 2 and is now 10**, in both the template
  and `api/spord.js` (they must stay in step): 2 was right while the rep typed a *quantity*, which is
  one number typed once, but from 27 Nov 26 they type **order numbers, which arrive all day** — five
  in the morning, six more after lunch — so a 2-save quota ran out before noon. The confirm box now
  appears only in the last 3 saves, because asking on every one is friction on a flow that repeats.
  Every save **appends to `h`** and never overwrites, so
  tapping a quantity opens the history: when it was first entered, when it changed, by whom.
  `mergeState` therefore merges this map **field by field** (`mergeRepOne`): the newer `it` wins,
  `n` takes the **max**, and `h` is unioned by timestamp — newest-wins on the whole record would let
  a stale tab reset the edit quota and drop a history entry. A rep's page shows **only their own
  line**; the 12-line target table is the supervisor's.
  **🗑 …and the manager can clear what a rep keyed** (`spRepDelBtn`/`spRepLineDel`, owner 28 Nov 26:
  *"ช่วยปรับให้ manager เข้าไปกดลบจำนวนที่เซลล์คีย์เข้ามาได้ในออเดอร์พิเศษ ช่วงนี้ผมทดลองใช้งานมันอยู่
  ปรับแบบนี้ไปก่อน"*). The button sits beside that line's keyed figure in the tracking table and
  writes **`it:{}` + `no:[]` over the record, never a key delete** — the `ok:0` / `del:1` / `it:{}`
  rule, or a tab left open since morning would union the old numbers straight back. It needed no
  server change: `api/spord.js` already lets a `manager` write `act:"rep"` for any line. Three
  things it must not do: **reset `n`** (the rep's edit quota — `mergeRepOne` takes the max, so a
  reset is pushed back anyway, and that is exactly what stops a stale tab unlocking itself),
  **touch the supervisor's target** (a different map, `CSTOCK.key`), or **drop the history** — `h`
  keeps growing, so the record still says who cleared it and when. Because the record survives as a
  tombstone, "has this line keyed?" must be measured on its CONTENT (**`spRepHas`**, used by
  `spTrack`), not on the key existing, or a cleared line reads as "คีย์แล้ว 0 ลัง".
  **🗑 The supervisor (and the manager) can edit or cancel a line's target**
  (`spKeyLineCancel`, owner 27 Nov 26: *"ส่วนของที่ซุปคีย์ให้กระจาย ฝากปรับแก้ ให้เข้าแก้จำนวนหรือ
  กดยกเลิกการสั่งได้ ทำได้ทั้งซุปและ Manager"*). The quantities were always editable — what was
  missing is cancelling a line outright, so a 🗑 ยกเลิกสายนี้ button sits beside 💾 บันทึกสายนี้ on
  every line that **already has** a target. It writes **`it:{}` over the record, never a key
  delete** — a tab left open since morning would union a deleted key straight back, the same rule
  as `ok:0` on a sub-order and `del:1` on an admin check — so `spKeyByLine` now filters through
  `spDayHas`, or a cancelled line would keep reading as "target set, 0 cases". The permission is
  unchanged and still lives in `api/spord.js` (`act:"key"` = `sup` or `manager`); the button only
  opens the door. **What the rep already keyed is a different record with a different owner**
  (`CSTOCK.rep`) and is never touched: cancelling a target does not erase work already done.
  **📅 The rep's day list spans every slip, not just the one they opened**
  (`spRepJobsAll`/`spGoJob`, owner 27 Nov 26: *"ช่วยปรับให้เซลล์เห็นทุกวันหน่อย ตอนนี้มันเห็นแค่
  วันนั้นวันเดียว เพราะซุปจะสั่งล่วงหน้าหลายวัน เซลล์มากดสั่งวันข้างหน้าได้"*). `spRepJobs` reads
  one slip, and the supervisor opens a new slip per order, so a rep saw only that slip's days and
  had to walk back out to the month list to find the rest. It now sweeps every slip that is not
  deleted, names the slip on anything from another slip, and tapping one **opens that slip and
  lands on that day**. It is screen tidying only: `spSlips()` is unfiltered and every write is
  still checked in `api/spord.js`. The entry card's headings carry the day they are for, never
  "วันนี้", or a rep keying Friday's work on Wednesday reads the wrong date.
  **…and that list is now a CALENDAR with four colours** (`spMeChk`/`spMeDays`/`spRepHomeHtml`,
  owner 27 Nov 26: *"หน้าตารางงานออเดอร์ล่วงหน้าให้ปรับเป็นหน้าปฏิทินไปเลย แล้วให้ขึ้นเป็นสีแดง
  คล้าย ๆ เหมือนของแอดมินว่ามีงานค้างในวันนั้น ๆ แล้วพอกรอกเลขออเดอร์ไปแล้วให้ขึ้นสีเขียว แต่ถ้า
  จำนวนหลังแอดมินตรวจไม่ตรงกัน ให้ขึ้นสีแดงในวันนั้น ๆ และระบุว่าเป็นออเดอร์ไหนที่ไม่ตรงกัน และ
  ห่างกันเป็นจำนวนเท่าไหร่"*): **todo** 🔴 target set, no order numbers · **keyed** 🟢 pale, numbers
  in but the admin has not checked · **ok** 🟢 checked and agreed · **bad** 🔴 solid, checked and
  disagreeing. Three rules, each one this file states elsewhere:
  **the comparison is made on ORDER NUMBERS, never on cases** — the cases the system totals from
  the rep's numbers are the *whole order*, while the admin's check counts only the slip's own
  products, so subtracting them prints "ไม่ตรง" on orders that are perfectly correct (the
  *ยอดสินค้าในใบนี้ / ยอดทั้งออเดอร์* rule); a number the system **cannot find yet**, or an order
  with no sales file for that day, is *ยังไม่รู้* and is listed separately — never red, or a late
  file would accuse the rep; and the reverse direction (the warehouse shipped an order the rep did
  not key) needs the order's **line**, which the picking list does not carry, so it is read from
  `STOREDAILY.ord` and anything still unknown is counted as *รอไฟล์*, never assumed to be this
  line's. The gap in cases is summed **per unmatched order** (`r.cs`), which is apples to apples.
  A day with jobs in two slips takes the **worst** status, because what the rep must see is what
  is still outstanding. The month shown (`SP.cm`) is separate from the day selected (`SP.day`) —
  the `PJ.ym`/`PJ.d` rule — and the legend counts the month on screen while the header counts
  every month, each labelled, so the two numbers can never read as contradicting each other.
  **👤 A rep opening the group lands on their own keying page** (`SP.me`, owner 27 Nov 26:
  *"ให้ในส่วนออร์เดอร์พิเศษเปิดเข้ามาแล้วเจอหมวดเซลล์คีย์เลย ไม่ต้องพาไปหน้าซุปจดก่อนให้งง"*) —
  month → slip → tab was three taps, and **`SP.sec` started at `"key"`**, which `spSec()` honours
  whenever that tab exists, so a rep landed on ✍️ ซุปจด. `SP.sec` now starts **empty** and
  `spSec()` falls through to the role rule; `renderSpord` additionally opens the slip holding their
  nearest unkeyed day, once per page load. Screen tidying only — ← กลับไปรายการใบ still walks out.
  **💾 Saving must not scroll the page back to the top** (`spRenderKeep`, the owner on the same day:
  *"หน้านี้เวลากดบันทึก มันเด้งขึ้นไปสายบนสุด"*, and again after the first fix:
  *"พอกดยกเลิกสายที่ต้องเลื่อนไปด้านล่าง มันกลับเด้งขึ้นมาสายบนสุดอีกแล้ว … ทำไมมันยังเด้ง ๆ
  กลับไปบนสุดอีก"*). **The thing that scrolls is the TABLE BOX, not the page**: `.tblwrap.sp-freeze`
  carries `max-height` + `overflow:auto` so the header can be frozen, so `window.scrollY` never
  moved and restoring it fixed nothing — `renderSpord` rewrites the view's `innerHTML` and the new
  box is born at `scrollTop:0`, i.e. the top line. `spRenderKeep` therefore records **every
  `#spordView .tblwrap`'s `scrollTop`/`scrollLeft`** and restores them beside the window position,
  **twice** — once immediately and once in `requestAnimationFrame`, because the browser finishes
  laying out after the first — along with the focused field and caret. Every save path
  (`spKeySave`, `spRepSave`, their rollback branches, and `spKeyLineCancel` through `spKeySave`)
  goes through it. A test that measures only `window.scrollY` passes while the bug is still there,
  so `spord.test.cjs` measures the box. Use it only for "saved, now redraw": opening a slip or
  switching tabs still belongs at the top.
  **🕘 All three steps are the SAME DAY, and the page says so** (`spFlowHtml`, owner 27 Nov 26:
  *"ฝากปรับช่วงของวันเวลาให้เข้าใจตรงกัน ให้ช่วงเวลาวันที่ซุปกำหนดเป้าเป็นเช้าของวันนั้น ๆ หรือเย็น
  เมื่อวาน และเซลล์คีย์เป็นวันนั้น ๆ ช่วงบ่าย และวันที่แอดมินมาตรวจเป็นตอนเย็นของวันนั้น ๆ … วันนี้
  ผมลองคีย์ไปช่วงวันที่ 26 กับ 27 แล้วเทียบกับหน้าเว็บของฝั่งเซลล์ มันใช้งานค่อนข้างลำบาก"*).
  `spDay` used to fall back to `ds[ds.length-1]` = the latest day **with data, future days
  included** — so a target set for the 27th on the 26th made ซุปจด and แอดมินตรวจ open on the 27th
  while the rep's page sat on the 26th. The order is now **today → the latest day ≤ today → the
  nearest future day**; future days are still on the calendar and one ▶ away, they just are not the
  landing day. Above the three day-based tabs sits one read-only strip — เช้า/เย็นวันก่อน
  ✍️ ซุปตั้งเป้า → บ่าย 📲 เซลล์คีย์ → เย็น 🔎 แอดมินตรวจ — stating the day once and how far that day
  has got, so anyone can see who it is waiting on and tap straight there. It stacks vertically under
  620px: a horizontally scrolling strip hid the third step, which is usually the one that matters.
  **📅 …but the slip's own date is a DIFFERENT date, and the screen must say which is which**
  (`spDayBandHtml`, owner 29 Nov 26: *"คนใช้งานอ่านวันที่จะงงกับวันที่สร้างออเดอร์ 26 พย และวัน
  ปัจจุบันที่ต้องคีย์ 27 พย. อันนี้ปรับทุกหน้าเลยทุก flow จนถึงคลังเลย … แยกให้เห็นได้ชัด ๆ จะได้
  ไม่สับสน ทั้งในคอมและมือถือเลยนะ"*). On his screen the header read `26 พ.ย. · 6 รายการ · 14 ลัง`
  and `B20261126-01 · 26 พ.ย. 2569` while the flow strip read `27 พ.ย. 2569` — two dates, two
  meanings, no labels. Every slip page now opens with a **two-box band**: 📦 ใบออเดอร์ (number +
  **สร้างเมื่อ**) and 📝 **กำลังบันทึกงานของวันที่** (+ วันนี้ / ล่วงหน้า N วัน / ย้อนหลัง N วัน).
  Three rules: **no bare date anywhere in this group** — the slip card, the header chip and the day
  picker all carry their own label (`สร้าง …` / `📝 วันที่กำลังบันทึกงาน`); when the two differ the
  band **says so in words** (`คนละวันกับวันที่สร้างใบ — หลังสร้างใบ N วัน`) instead of leaving the
  reader to notice; and a tab that is not day-based shows `📊 ดูทั้งใบ` rather than a invented
  working day. It is labelling only — no function, figure or default date changed.
  **⏭ ④ คลังจัดส่ง is NOT one of the three** (same instruction: *"ส่วนของคลังจัดส่ง ช่วยเอามันไม่
  ขึ้นที่เดียวกับเพื่อน ๆ หน่อย ส่วนนี้ไว้ให้แอดมินทำงานต่อหลังจากตรวจเลข GIN"*). Its `SP_TABS`
  entry carries `sep:1`, which draws a dashed rule before it in the tab row, and the flow strip
  ends with a line naming it as the step **after** the trio, with a button to it.
  **📅 The calendar is full width with 46px day cells** (42px under 400px), because the owner asked
  (*"ปรับหน้าปฏิทินให้ใหญ่ใหญ่เต็มช่องกดเลือกวันได้ง่ายง่ายหน่อย"*) — it used to be a 250px box
  squeezed beside the date field with ~28px cells, below the 44px finger target.
  **🔎 ตรวจและบันทึก must never be a disabled button** (owner 27 Nov 26: *"ในเว็บแอดมินและ Manager
  ไม่สามารถตรวจหมายเลข GIN ในมือถือได้ กดปุ่มแล้วไม่มีอะไรเกิดขึ้น แต่วันนี้ทำในคอมทำได้"*). The
  picking list lives in memory only, so a phone that has not read the file this session has no
  `ALLOC` — and the button carried `disabled` in exactly that case, so it did nothing and said
  nothing, while the computer that had just read the file worked. `spGinGo` now runs either way and
  offers to open the file picker (`spUpAlloc`). Both GIN buttons are `.btn-go`, a solid 40px button:
  `.upload-btn`'s dashed outline means *drop a file here*, a different thing entirely.
  **🧾 The rep types the day's order numbers at the bottom of their entry card**
  (`spRepNoHtml`/`spNoSplit`/`spNoSum`/`spOrdFind`, the owner on 27 Nov 26: *"เซลล์ตอนที่คีย์รายวันแล้ว
  จะต้องกรอกคำสั่งซื้อทั้งหมดในออเดอร์นั้น ๆ เข้าไปในช่องล่างสุด เพื่อให้แอดมินตรวจสอบจากระบบเองได้เลย …
  เซลล์จะมากรอกเลขใบสั่งซื้อ แอดมินมากรอกเลข GIN ระบบตรวจสอบจำนวนว่าตรงกันทั้งหมดไหม"*). One box takes
  any number of numbers — pasted, space/comma/newline separated — and accepts the full `BDD01…`,
  the whole app number (`1034715426`) or, since 27 Nov 26, **just its last `SP_TAIL` digits**
  (`715426`). The owner first asked for five and then, the same day, *"Ok ปรับให้เป็นหกหลัก"* —
  which is exactly what the measurement supports. Measured across the real daily-sales and
  Transaction files (**2,096 distinct reference numbers over 12 days**): **5-digit tails collide in
  10 groups / 20 numbers (~1%)** while **6-digit tails collide in none**. Six is the value; the
  collision handling stays anyway, because the margin shrinks as more months accumulate.
  `spOrdFind` therefore tries the tail **last**, after the full reference and the order number, and
  when a tail matches **more than one distinct reference** it returns `{amb:[…]}` and the page says
  *"ตรงกับหลายใบ ใส่เลขเต็มให้ไม่ซ้ำ"* — it never picks one. A tail SHORTER than `SP_TAIL` is
  refused outright, or the shortcut would get less unique the more someone shortens it. A sale and its return note quoting
  the same reference are not a collision (BDD01 still wins), and when the caller knows the typing
  rep's line (`spLineCode`) the candidates are filtered to it first, which settles most of them. It is **a field on the record that already
  exists** (`CSTOCK.rep[...].no`), never a new section, so `mergeRepOne` carries it and a tab from
  before the field existed cannot blank it. Typing never re-renders the page (`spNoLive` writes into
  its own `<div>`, so the caret stays), and the summary distinguishes all four states the project's
  rules demand: found · **ยังหาไม่เจอ** (named one by one) · **รอไฟล์ยอดขาย** (an order known only
  from the Transaction file, where `cs===undefined`) · ใบที่ยกเลิก. The supervisor's tracking table
  then carries a third figure, **🧾 จากเลขออเดอร์** (`spOrdCell`), which is what the *system* totals
  from those numbers rather than what anyone typed — it turns red with the difference when it
  disagrees with the rep's keyed quantity, which is exactly the check the owner asked for. It works
  the same on all three slip types, because every type that has a เซลล์คีย์ step renders this card.
  **🔎 Tapping a line's name in the tracking table opens that line's orders** (`spTrkTog`/
  `spTrkOrdHtml`, owner 29 Nov 26: *"ให้ทุกคนกดเข้าไปดูได้ ว่าแต่ละสายกดออเดอร์เลขไหนมาบ้าง และใน
  ออเดอร์นั้น ๆ มีสินค้าจำนวนกี่ลังรวมเท่าไหร่ โดยจะแสดงผลเมื่อกดที่เลขสายเท่านั้น และเป็นสายที่มีการ
  ส่งออเดอร์เข้ามาแล้ว"*): one row per order — number · shop · items · cases · **which file the
  figure came from**. The button appears only on a line that has actually sent numbers, it is
  read-only, and **opening it must not redraw the page** (it flips the row's class, the `<details>`
  rule) or the frozen table box jumps back to the top. The rep gets the same list for **their own
  line** inside their entry card (`spMyOrdHtml`, a native `<details>`), because he said *everyone*;
  the 12-line table itself still does not reach a `sales` account, which is his own earlier rule.
  **📦 "How many cases is this order?" has exactly TWO possible sources, and the Transaction
  Inquiry file is NOT one of them** (`spOrdQty`/`spOtWant`). The owner believed it was —
  *"จริง ๆ มันต้องผูกกับไฟล์ transaction inquiry นะ … และมีระบุรายการจำนวนสินค้าด้วย"* — so his real
  file was measured before anything was written: `Transaction_Inquiry_26112026.xlsx`, one sheet
  `DataExtract`, **32 columns, no product code and no quantity column at all** (เลขที่เอกสาร · ร้าน ·
  PJP · เวลาสั่งซื้อ · วันที่เอกสาร/จัดส่ง/จัดส่งจริง · GSV · ส่วนลด · NIV · ภาษี · สถานะ · ช่องทาง ·
  เลขอ้างอิง DDT · เลขใบจัดสินค้า · เลขใบแจ้งหนี้). It is **header-level, not line-item**, which is
  why `parseTxn` deliberately writes no `cs`/`pc`. Tell him that plainly rather than inventing a
  figure. What does answer it: ① the **daily sales file**, the billed truth, which arrives after
  invoicing (measured: same day 46.7% · +1 day 43.3% · +2 days 9.2%, so today's orders are simply
  not in it yet — that is exactly what he was looking at); and ② the **allocation / picking file**,
  which has per-order per-product quantities and arrives first, because the admin uploads it on
  this very page every day. It is read through **`api/ordtrk`, which every role may read** (unlike
  `api/alloc.js`, manager-only) — the table is for everyone, so the source must be too. One fetch
  per month per tab (`spOtWant`, the `otEnsure`/`AL_WAIT` pattern), then one redraw. Rules: the
  sales file **always wins** over the picking file; a figure that cannot be split into ลัง/ชิ้น
  prints whole cases with a `*` through the same `otQty` the สถานะออเดอร์ (ขาย) page uses, so the
  two pages can never state different quantities; and **neither file = `null`, never 0** — the
  screen says *ยังไม่รู้จำนวน … รอไฟล์ใบจัดของ หรือไฟล์ยอดขาย*, naming both files so the user knows
  what to upload.
  **📅 …and each order carries ITS OWN date, because that is the answer to "why does this one
  have a figure and that one not?"** (`spOrdDay`, owner 29 Nov 26: *"ทำไมบางเลขมีจำนวน บางเลข
  ไม่มี ส่วนนี้มันจับจากอะไร … เพราะเค้าส่งมาเวลาพร้อม ๆ กันมันต้องขึ้นพร้อม ๆ กัน"*). His screen
  showed CT11's 8 numbers with 6 waiting and 2 carrying a quantity — and the 2 were
  `BDD0100000575` and `BDD0100001275` sitting among `BDD010000259x`–`262x`. **Order numbers never
  overlap between days**, so those two are orders from earlier days that the rep included by
  mistake (each duplicates a shop already in the list — ศิริมา and ศิริชัย appear twice), and they
  have a figure precisely because those older days' files are already uploaded. **No code was
  wrong; the screen just did not say which day each order was from.** It now prints the order's own
  date under the number, marks one that differs from the day being recorded, and counts them in the
  footer; `spNoInfoHtml` warns the rep the same way while they type, so the mistake is caught at the
  source. Two rules: the date is **`k` (the rep's keying day) before `d` (the invoice day)** — they
  differ on 53% of orders and the question here is "when was this keyed"; and an order with neither
  shows **nothing**, never the working day.
  **🧭 Opening a slip lands every role on its own step** (`SP_HOME`/`spHomeSec`, owner 29 Nov 26:
  *"ถ้าแอคเค้าซุป ให้ขึ้นหน้าซุปจด แอคเค้าเซลล์ให้เด้งไปหน้าเซลล์คีย์ แอดมินก็เด้งไปแอดมิน … ให้เวป
  พาไปในส่วนที่เค้าต้องทำเองอย่างอัตโนมัติไปเลย"*): `sup`→✍️ ซุปจด · `sales`→📲 เซลล์คีย์ ·
  `manager` (owner + admin1–4)→🔎 แอดมินตรวจ · `wh`/`ds`→🚚 คลังจัดส่ง. A 🧾/🚚 slip has neither
  ซุปจด nor แอดมินตรวจ, so there is a **second choice** (`SP_HOME2`): ซุป falls back to เซลล์คีย์ and
  the admin to คลังจัดส่ง, which is where they key that slip's GIN anyway — never just "the first
  tab". Both `spSec()` (no tab chosen yet) and `spFirstSec()` (opening a slip from the list) go
  through the one function. ⚠️ **It is a landing page, not a permission**: every role still opens
  every tab, and who may write is still decided inside each function and in `api/spord.js`.
  **📷 …and the rep can get those numbers in by SCREENSHOT instead of typing** (`spOcrNos`/
  `spOcrGo`/`ocrWords`, owner 27 Nov 26: *"ปรับให้เป็นการใส่หน้าแคปหน้าจอ จากเลขออเดอร์ได้ไหม
  ให้เซลล์แคปหน้าจอหลังกดคีย์ออเดอร์ … อัพได้ 10-20 รูป แล้วให้ระบบอ่านเลขออเดอร์อัตโนมัติ …
  หรือจะกรอกเองเหมือนเดิมก็ได้ แต่ถ้าอัพรูป เลขจะอ่านขึ้นให้อัตโนมัติ แล้วเซลล์ตรวจเอาอย่างเดียว"*).
  It reuses the Tesseract already vendored for the promo-report reader — no second engine and no
  new download for anyone who does not use it. Measured on the owner's two real screenshots of the
  app's **คำสั่งซื้อของฉัน** page, across three page-segmentation modes (6 runs):
  **every order number read, confidence 90–92, and not one other number on the screen leaked in.**
  That is because an order number is **ten consecutive digits** while nothing else on that screen is
  — the invoice `#MF80478502` has letters, the date `28/11/2026` has separators, the money
  `฿563.00` has a point, the app version `1.85(86)-v44` has brackets. **So the rule is exactly ten
  consecutive digits; never loosen it to 6–9 digits for an image**, which would immediately collide
  with those. Eleven digits in a row is refused too, rather than guessing which one is the misread.
  **Speed decided the scale**: the report reader's `OCR_W` = 2800px costs 2.3–3.5 s an image, while
  **1600px costs 1.2 s and reads exactly the same numbers**, so `SP_OCR_W` = 1600 and 20 images
  finish in about 25 s. 2800 stays right for the Power BI tables, whose font is tiny; the order
  number is large text. `ocrPrep` therefore takes a target width and `ocrWords` was split out of
  `ocrRead` so this path skips the table-building step entirely.
  Four rules: **the images are read in the browser and thrown away** — never uploaded, never in the
  state, the `ALLOC` rule; **nothing is saved straight from OCR** — the numbers land in the same
  textarea the rep already checks and presses บันทึก on, and `spNoInfoHtml` still reports
  ยังหาไม่เจอ / รอไฟล์ยอดขาย / ตรงกับหลายใบ underneath, which is the real safety net against a
  misread digit; **an image with no number found is named one by one**, never silently skipped, or
  the rep believes the list is complete; and **the same order appearing in two screenshots is
  normal** (it happens in the owner's own two images), so duplicates are dropped and counted.
  A word's confidence under 70 is flagged on screen (`prCellBad`'s rule), and a number OCR split
  across two words is recovered by a second pass **per line** — never across lines, or two numbers
  on consecutive lines would join into a 20-digit run and both vanish. Typing is still there,
  unchanged, under *— หรือพิมพ์เลขเอง —*. The picker is not a data upload, so the one-upload-button
  rule does not apply.
  **🔵 A rep can screenshot the same order twice, in two different screens** (owner, 27 Nov 26:
  *"ให้ระบบอ่านได้สองแบบ เพราะเซลล์แคปได้สองรอบ คือสีฟ้าหลังจากกดคีย์เสร็จ และสีขาวแบบ historical
  เข้าไปดูย้อนหลัง แล้วถ้ามีอ่านเลขซ้ำกัน ช่วยคัดออกให้ด้วยนะ"*) — the blue confirmation screen
  (white text on a saturated blue field, `ออเดอร์ #…`) and the white history screen
  (`คำสั่ง #…`). **Measured on his two real screenshots before changing anything: both already
  read correctly** — blue `1034715246` at confidence 85, white `1034715426` at 91, mean luminance
  126 and 214 — so the first pass is **untouched** and nothing that works today can regress. What
  was added is a **second pass with the polarity inverted (`ocrPrep(…,inv)`), run only when the
  first pass found no number at all**: a net for a phone that caps the blue screen darker. Only
  images that read nothing pay for it. ⚠️ Invert only — **never threshold to black and white**,
  the measured rule from the report reader.
  **🔁 Duplicates are cut on the ORDER, not on the typed text.** The same order can be written
  three ways — the full `1034715426`, its 6-digit tail `715426`, and the `BDD01…` number — and
  `spNoSum` used to total cases, money and shops **once per entry**, so one order written two ways
  was counted twice on the very figure the supervisor and the admin check against. It now keys on
  the resolved order (`spOrdFind`'s `no`), counts it once, and reports `same`/`sameList` so the
  page can say **"ตัดเลขซ้ำออก N เลข — เป็นใบเดียวกัน นับครั้งเดียว"**; `n` still counts every
  number entered, because "how many did I type" and "how many orders is that" are different
  questions. The OCR side also treats a 10-digit number whose tail is already in the box as a
  duplicate. Prove it with the self-contained cases in
  **`node test/browser/spord.test.cjs`** (437 checks) and, against the owner's real screenshots,
  **`SP_OCRSHOT=/path/a.jpg,/path/b.jpg SP_OCRSHOT_NO='1033993299,…' node test/browser/ocr-promo.test.cjs`**
  (36 checks, 40 with the images — which never enter the repo).
  **🧯 Numbers read from images were being LOST, and OCR was not the cause** (owner, 27 Nov 26, with
  one screenshot of CT17's row reading 13 เลข beside the rep's own phone showing 20 numbers read:
  *"ตรวจสอบแต่ละสายหน่อย ไม่แน่ใจว่าทำไมที่เค้าอัพมาจำนวนไม่ตรงกัน เช่นสาย 17 เค้าแคปมาว่าส่งมา 20-21
  รูป ที่มันในระบบข้นแค่ 13 รูป"*). The record held **exactly the first 13 in the rep's own order**
  (11 resolved + 2 reported ยังหาไม่เจอ), which is the signature of a cut, not of a misread — OCR
  read all 20 at confidence 90–92, and neither `SP_NOMAX` (80) nor the server's own cap was near.
  **The cause is one cached DOM node**: `spOcrGo` captured the textarea **once** before the loop,
  while pressing 💾 mid-batch runs `spRepSave` → `spRenderKeep`, which rewrites
  `#spordView.innerHTML` — so the node the loop still writes into is **detached**, images 14–20 land
  in nothing, and the rebuilt box shows the just-saved 13. `spNoLive` re-fetches by id, which is
  exactly why the summary said 13 while the OCR list said 20. Four layers, and the order matters:
  **`spOcrTa` re-fetches the element on every image** (never cache a node across an await in this
  page); **`spOcrGot`/`spOcrSync` write the UNION** of what is in the live box plus everything the
  batch has read, so a re-render from any cause self-heals on the next image instead of truncating;
  **a box that has genuinely vanished aborts the batch with the count read so far**, because
  silently dropping numbers is the one outcome that must not happen; and **`spRepLineSave` refuses
  to save while `SP.ocr.busy`** and names the progress (*"อ่านไปแล้ว 13 จาก 20 รูป"*) — a refusal in
  words, **never a disabled button** (the `spGinGo` lesson: a dead button that says nothing is worse
  than the bug). `spRepNoHtml` additionally seeds the pending numbers into a rebuilt box while the
  batch runs, so a re-render triggered by anything else does not read as "they are gone". Prove it
  with §12 of **`node test/browser/spord.test.cjs`**, which reproduces the owner's exact sequence —
  13 images read, 💾 pressed mid-batch, page re-rendered, 7 more images read — and asserts the save
  is refused with the progress named, the 13 survive the re-render, and the final total is 20 both
  in the record and in what is posted. ⚠️ Verified by reverting each guard and watching the suite
  fail: a test that passes on the broken code proves nothing here.
  **🛟 …and blocking the save was NOT the fix — the owner said so the next day** (28 Nov 26:
  *"เดี๋ยวผมจะให้เซลล์อัพใหม่ให้หมดทุกคน ช่วยปรับแก้เรื่องตรงนี้หน่อย มันทำให้คนทำงานต้องทำซ้ำสอง
  ด่วนเลยนะ ต้องเสร็จวันนี้"*). The guard above stops the loss but **pushes the work back onto the
  rep**: one mis-timed press means waiting, and switching apps, locking the phone or a flat battery
  still loses everything, because the numbers only ever lived in a `<textarea>`. The goal is
  therefore **"a number cannot be lost, whatever the rep presses"**, not "the rep must not press the
  wrong thing". Two more layers:
  **③ every number is written to a device draft the moment it is read** (`spNoDraftKey`/`Get`/`Put`/
  `Clear`, key `bdspno:<uid>:<sid>|<ymd>|<line>`) — the `bdreq:` / `bdcst:` pattern exactly:
  **never part of the synced state**, so it cannot touch `bd-data-*`, every access in try/catch, and
  **cleared only after the server accepts** (clearing first then losing the network would lose it in
  both places, which is the original bug wearing a new hat). `spRepNoHtml` therefore seeds the box
  with **saved ∪ draft ∪ what this batch has read, always** — that is what makes the numbers come
  back by themselves — and says how many are not saved yet (`.sp-nodr`, *"ไม่ต้องอัพรูปซ้ำ"*).
  Because the draft survives a missing box, `spOcrGo` **no longer aborts** when the textarea is
  gone: it reads every image to the end and says afterwards that nothing was lost.
  **④ pressing 💾 mid-batch queues the save instead of refusing it** (`SP.ocr.want`): the page says
  *"จองบันทึกไว้แล้ว"* and `spOcrGo` runs the save itself the moment the last image is read —
  **once**, so the rep's daily edit quota (`REP_MAX`) is not spent twice.
  Three rules this exposed: the card passes **`sid`/`ymd` down to `spRepNoHtml`/`spNoLive`** instead
  of re-deriving them from `SP.sid`/`spDay()`, or the card and the draft can read different keys;
  `spOcrGo` **freezes the slip and day at batch start**, so changing day mid-read cannot move the
  draft; and a successful save must **cancel the pending `spNoLive` debounce** before clearing the
  draft, or that timer rewrites the draft a moment later and the banner claims unsaved numbers that
  were in fact saved (found by the test, not by reading the code). §12 now also asserts the draft
  survives a failed save, is keyed per slip+day+line, takes typed numbers too, and that a browser
  with `localStorage` blocked still works — six checks fail without the draft layer, including
  *"reopen the page and the 20 numbers come back"*, which is the whole point.
  **🔁 And what was already lost is recovered by asking the FILES, not the memory**
  (`spMissFind`/`spMissPool`/`spMissScan`/`spMissAdd`, owner 28 Nov 26: *"ทำให้ระบบอ่านย้อนหลัง
  ที่เค้าอัพมาได้ไหม … ลองย้อนไปดูได้ไหมว่าเราตกอะไร แล้วเอามันกลับมาได้เลย"*). The numbers the
  draft would now hold were never stored, so nothing in `bd-data-*` can give them back — **but the
  orders themselves never left**: the rep keyed them into dcode, so they sit in the files with
  their **line and their keying date** attached. The question is therefore asked from the other
  end — *"what did this line key that day?"* — and the difference against the box is what fell out.
  Sources, in order of completeness: **`api/ordtrk`** (`l` = PJP code, `d` = day of month), which
  is fed by the allocation file *and* the Transaction Inquiry file (measured the most complete of
  the three) and which **every role may read**, unlike `api/alloc.js`; then **`STOREDAILY.ord`**,
  whose `k` is the keying day. Four rules, all of them this file's own: **it never fills in a
  guess** — an order is only *แน่ใจ* when `det` from `api/ordtrk?full=1` shows it carries one of
  the slip's product codes, and everything else goes in a separate *ไม่แน่ใจ* pile the user must
  choose; **a cancelled order (`cx`) is listed and never added**; **no file for that day is
  `noFile`, never an empty "nothing missing"**, or an un-uploaded day reads as a clean bill; and a
  number already in the box in any of its three spellings (full `BDD01…`, the app's `1034…`, the
  6-digit tail) is matched and not re-offered. Filling back **appends through the ordinary
  `spRepSave` → `api/spord.js`** — no new endpoint, no new permission, and the rep's own record is
  never overwritten. The panel sits at the foot of ② เซลล์คีย์ with scopes วันที่เลือก / ทั้งใบ; a
  rep sees only their own line (`spMineOnly`), a manager every line. Prove it with §13 of
  **`node test/browser/spord.test.cjs`** (437 checks), which rebuilds the owner's CT17 case — 20
  orders in the files, 13 in the box — and asserts the 7 are found, split 4 sure / 3 unsure, that
  another line's and another day's orders never appear, that scanning mutates nothing, and that
  filling back gives 13 → 17 with the first 13 untouched. ⚠️ That suite shares one browser page
  across blocks, so a block that stubs `bdPost` to fail must have it restored in `__reset` — §13
  silently failed to save until it was (a stale stub from §12, the same class of bug as the stale
  debounce above).
  **🧮 เป้า vs คีย์จริง is compared in PIECES, per product code — never ลัง−ลัง and ชิ้น−ชิ้น**
  (`spPsOf`/`spItPcs`/`spOrdPcs`/`spPcsSplit`/`spPcsDiff`, owner 28 Nov 26 off his own screen:
  *"ทำไมผลต่างเป้า กับจำนวนคีย์มันแปลก ๆ อย่าลืมจับรหัสของสินค้า และแปลงหน่อย จากลังเป็นชิ้น
  ให้มัน match เข้าด้วยกันได้หน่อยนะ"*). The row read `เป้า 7 ลัง · คีย์จริง 1 ลัง 72 ชิ้น ·
  ยังขาด −6 ลัง +72 ชิ้น` — **two faults stacked**: the subtraction was done on each unit
  separately (7−1 cases and 0−72 pieces, printed as one "quantity" that no file ever stated), and
  the two sides answered **different questions** — เป้า counts only the slip's products while the
  figure derived from the order numbers is the **whole order**, other products included (this
  file's own *ยอดสินค้าในใบนี้ ≠ ยอดทั้งออเดอร์* rule). At 12 pieces a case, 1 ลัง 72 ชิ้น is
  84 pieces = **exactly the 7-case target**: the line was on target and the screen called it short.
  The rule is the project's own, the one `spCmp` already follows: **work in pieces per product
  code with that code's own case size, then split back at the very end.** เป้า converts exactly
  (the codes are known); คีย์จริง now reads the **per-order product breakdown** (`det` from
  `api/ordtrk?full=1`, fetched by `spOtWant(ym,1)`) and is **filtered to the slip's own codes**, so
  the two columns finally measure the same thing; 🧾 จากเลขออเดอร์ keeps the whole-order total as a
  separate, labelled column and **no longer prints a red "ต่าง" against it** (differing is normal —
  that red was the bug telling the user the system disagreed with itself). Four rules: **ขาด and
  เกิน are separate buckets, never netted off across codes** (short 5 of one and over 5 of another
  is not "ตรง"); a code whose **case size is unknown is counted and named**, never converted at a
  guessed size; an order the picking file has no breakdown for is counted as **"อีก N ใบยังไม่รู้
  รายการสินค้า"**, and a line where *every* order is like that reads **ยังเทียบไม่ได้ · รอไฟล์
  ใบจัดของ** (`blind`, status `unk`) rather than "ขาดทั้งหมด" — not-known is not zero; and the
  footnote states what each column counts, because two of them look alike and are not. Prove it
  with §14 of **`node test/browser/spord.test.cjs`** (437 checks), which rebuilds his exact row and
  asserts 7 ลัง vs 84 ชิ้น reads **ครบเป้า**, that a product outside the slip is excluded, that
  short and over each split back per code, and that no `\d+\.\d+ ลัง` or `−N ลัง +M ชิ้น` survives
  anywhere in the table. ⚠️ Verified by removing the cases→pieces multiply and watching four checks
  fail.
  **🔁 เติมย้อนหลังทั้งใบ — the whole slip, both sides, from the files** (`spBackDays`/`spBackRuns`/
  `spBackDay`/`spBackScan`/`spBackRun`/`spBackHtml`, owner 27 Nov 26, who called it *"หัวใจสำคัญ
  ของ project นี้"*: *"ที่ผมทำออเดอร์พิเศษ เพราะมันเหตุเกิดจากซุปสั่งให้เซลคีย์ทีไร จำนวนไม่เคยตรงตามที่
  สั่งสักที … คุณลองดู pattern วันที่เซลล์คีย์ และเริ่มต้นจากวันที่ออเดอร์พิเศษใหญ่นี้สร้าง ต่อเซลล์คีย์ และ
  ปิดท้ายโดยจับจากรหัสสินค้า และจำนวนที่จัดของขึ้น GIN แบบติดต่อกันวันละ 4-6 ใบต่อวัน … ผมต้องการ
  ทำให้คุณวิเคราะห์แล้วใส่ตัวเลขย้อนหลังของออเดอร์ที่เซลล์คีย์ และคลังจัดทั้งหมด ตั้งแต่วันที่ 19 พย
  จนถึงวันนี้ … เซลล์แต่ละสายจะคีย์คนละช่วงเวลา แต่จะคีย์พร้อมๆกัน ส่วนแอดมินจะจัดกลุ่มออเดอร์พวกนี้
  ออกมาขึ้น GIN แบบติดกัน"*). `spMissFind` answers "what fell out of one line's box on one day";
  this answers the whole slip, **every day from its creation date to today** (`spBackDays`, which
  `spDays` cannot give because it lists only days that already have data), and it fills **both**
  sides — the reps' order numbers *and* the warehouse's GIN numbers.
  **📏 The pattern he described was measured on his real files before a line was written** —
  the allocation report 15–24 Nov (10,428 rows) and the Transaction Inquiry to 26 Nov (2,107
  orders) — and it holds **exactly as he stated it**:
  19 Nov · ซิตร้า FO (65691961+65691963): **71 orders · 5 lines · 1 order = 1 shop** (20 orders =
  20 shops, 28 = 28) — that is the shape of a ตัวกระจาย round, many shops with a small quantity
  each; the lines really do key in separate windows (CT17 10:35→14:56 · CT15 10:45 · CT13 11:36 ·
  CT11 14:22 · CT22 14:28); and **one line = one GIN**, CT15→68 · CT22→69 · CT11→70 · CT17→71,
  i.e. **68–71, four consecutive**. 21 Nov · ลักส์ FO + ซิตร้า FO: **115 orders**, CT15→101 ·
  CT22→102 · CT11→103 · CT17→104 ⇒ **101–104**. The admin picks line by line, so the GINs come out
  back-to-back — which is his "วันละ 4-6 ใบต่อวัน".
  ⛔ **What measured as useless and must never be used as the discriminator: "a code sold by many
  lines on one day."** Every day has 11–48 such codes and they are all ordinary fast movers
  (โอโมน้ำยาล้างจาน · ซันซิล · บรีส), not distribution lines. ⇒ **the discriminator is the slip's
  own product codes**, a fact the slip already states, while the consecutive GINs and the keying
  windows are **corroboration shown on screen, never a filter**.
  Seven rules, each one this file states elsewhere: order numbers **append, never overwrite**;
  a day the admin has already checked is **skipped on the GIN side**, because the GIN he typed is
  authoritative; no orders for any of the slip's lines that day = **"รอไฟล์", never "nothing
  missing"**; a month whose per-order product list is not loaded yet answers **"รอไฟล์" for the
  whole day** rather than treating every order as a candidate; an order whose products are still
  unknown is **not counted as one of the round's orders at all** — it goes in the ไม่แน่ใจ pile and
  is never auto-filled (not-known is neither yes nor zero, so it must not inflate the ใบ/ร้าน/GIN
  figures either); a cancelled order is **listed and never added**; and a GIN that falls outside
  the consecutive run is **named, never silently dropped** (the real files have them — 74, 81, 96
  on 19 Nov). It writes through **`api/spord.js` as it stands** (`act:"rep"` and `act:"gin"`, the
  latter via the admin's own `spGinSave`→`alPick` path so the two can never produce a different
  check) — **no new endpoint and no new permission**; the GIN half is manager-only because
  `api/alloc.js` already is. Scanning is **strictly read-only**. Prove it with §15 of
  **`node test/browser/spord.test.cjs`** (437 checks), whose fixture reproduces the measured
  19 Nov shape and whose dates are all built from `todayISO()` — never a fixed day, the §8 lesson.
  ⚠️ Verified by reverting each guard: overwriting instead of appending fails 4 checks, not
  skipping the admin's day fails 3, counting an unknown-product order fails 3.
  **🔎 …but a panel the user has to find and press was the wrong shape, and he said so the same
  day** (*"ผมเข้าไปใช้แล้วงงมาก ทำให้มันกลับไปหน้าตาแบบเดิม แต่คุณช่วยปรับให้ระบบมันอ่านเองเลย โดย
  ทำให้เวลาอัพไฟล์ transaction / allocation เข้าไปแล้ว ให้มันอ่านและขึ้นโชว์ในแต่ละส่วนที่เซลล์ต้องอัพ
  แอดมินต้องอัพเลย แบบเซลล์มีเลขออเดอร์อะไรบ้างในวันนั้น ๆ แอดมินส่งไป GIN ไหนได้บ้างในวันนั้น ๆ …
  ลองเอาจำนวนนั้นตั้ง แล้วตัดออกจากที่เซลล์ไล่คีย์วันต่อมา ว่าคีย์ขายไปสายละจำนวนเท่าไหร่ และตรงกับ
  ที่ใบคลังจัด allocation ไหม … หรือ match ได้ครบ 100% หรือขาดตกหล่นกี่ %"*). **What changed is
  where it lives and how it is reached — not the logic**: the engine is still `spBackDay`/
  `spBackScan`, with the 19 Nov pattern it was measured against. The 🔁 panel is **unhooked from
  the screen, not deleted** (one call site removed; `spBackBtnHtml`/`spBackRun` and the whole write
  path still work and come back by putting the line back — the retired-tab rule). In its place the
  answers appear by themselves in the three places people already work:
  **① under the rep's entry box** (`spAutoNoHtml`/`spAutoNoFill`, inside `spRepNoHtml`) — how many
  orders the files hold for *that line on that day*, the numbers themselves, and how many are not
  in the box yet; **② beside the admin's เลข GIN field** (`spAutoGinHtml`/`spAutoGinFill`) — the
  day's GIN numbers with the consecutive run named; **③ at the head of ② เซลล์คีย์**
  (`spBal`/`spBalHtml`) — **ตั้งต้นในใบ → เซลล์คีย์ไปแล้ว → คลังจัดแล้ว → เหลือ → ตรงกี่ %**, per
  product code and per line.
  Five rules: the ▸ fill buttons **write into the input and nothing else — they never save**, so a
  person still presses บันทึก / 🔎 ตรวจและบันทึก exactly as before (the OCR rule: the system reads,
  the human confirms); **"คลังจัด" means the orders the warehouse has already issued a GIN for**,
  read from `g` on `api/ordtrk` (which every role may read, unlike `api/alloc.js`), so the gap
  between เซลล์คีย์ and คลังจัด **is** the "ขาดตกหล่นกี่ %" he asked for — orders keyed but not yet
  picked; `det` on that blob is the file's own **Sale/Free Order** columns, i.e. what the rep
  keyed, never the Allocated columns, which is why it can stand for เซลล์คีย์ directly;
  **a total must be a total** — `spBal` calls `spBackScan(sid,1)` to sweep every line even for a
  `sales` account, because a rep reading "ตั้งต้น 15 ลัง · คีย์ไปแล้ว 3 ลัง" would conclude the slip
  still owes 12 (screen tidying must never change a total), while the per-line chips still narrow
  to their own line; and **no file = "รอไฟล์", and a % that cannot be computed is a dash, never
  0%**. Everything on all three is **read-only** — drawing the page writes nothing. Prove it with
  §16 of **`node test/browser/spord.test.cjs`** (437 checks), whose fixture gives ตั้งต้น 15 ลัง ·
  เซลล์คีย์ 11 ลัง · คลังจัด 9 ลัง · เหลือ 4 ลัง · **81.8% ตรง / ขาดตกหล่น 18.2%**, and which
  asserts the panel is gone while its functions remain, that the fill buttons post nothing and
  leave `CSTOCK` byte-identical, that the slip total stays 180 pieces when opened as a rep, and
  that the GINs come out as one run of six (68–73) — his own "วันละ 4-6 ใบต่อวัน".
  **🎨 …and ONE criterion colours everything: เซลล์คีย์ must equal คลังจัด, per product code,
  down to the piece** (`SP_BST`/`spBalSt`/`spDayStat`/`spSlipStat`/`spStPill`, owner 27 Nov 26 off
  the live screen: *"ถ้าจำนวนมันเกิน ให้แจ้งว่าเกิน ต้องหักลบออก แต่ถ้ามันขาดให้ขึ้นสีแดงว่าขาด
  ถ้าครบสีเขียว ศูนย์ผมต้องการจำนวนเป๊ะ ๆ 100% เซลล์คีย์มาตรงกับสินค้าที่คลังจัดทุกรายการจนถึงหน่วย
  ชิ้น รวมถึงสีในปฏิทิน และในรายงานจำนวนออเดอร์ที่ออกไป ในแต่ละออเดอร์พิเศษหมวดใหญ่ด้วย … และขึ้น
  หน้าสรุปรายงานให้กับ manager ด้วย ว่าออเดอร์ชุดนี้ต้องคีย์รายการไหนเพิ่ม จำนวนกี่ลัง หรือขาดกี่ลัง"*).
  **The bug he was looking at**: the เหลือ column printed **ครบ in green** on a row that was only
  **86.3%** — because it measured against **ตั้งต้นในใบ** (3 ลัง) while the row's real gap was
  เซลล์คีย์ 22 ลัง 7 ชิ้น vs คลังจัด 19 ลัง 6 ชิ้น. Two different questions sharing one colour; the
  `= 829.2% ของใบ` card had the same cause. So **`d = คลังจัด − เซลล์คีย์` (pieces, per code) is the
  only thing that colours a row**: `d<0` → 🔴 **ขาด N ลัง M ชิ้น**, `d>0` → 🟠 **เกิน N ลัง M ชิ้น
  (หักออก)**, `d===0` → 🟢 **ครบ**. ตั้งต้นในใบ stays as a column and gets its own小 note
  (*ต้องคีย์อีก …* / *คีย์เกิน …*), but it **must never decide ครบ** again.
  **🚚 "คลังจัด" has two sources and the rule is one line**: a day the admin has **checked and
  saved** uses that check's **Allocated** figures (`CSTOCK.gin[].rows` `xc/xs/xp` + `yc/ys/yp`
  through `spPcs`/`alShrink`), which is the warehouse's own count and the **only** source that can
  exceed what the rep keyed — so it is where 🟠 เกิน comes from (measured on the real 10,428-row
  file: Allocated differs from Order on 603 sale and 37 free rows); a day **not yet checked** uses
  "orders that already carry a GIN", which is a subset of what was keyed and can therefore only
  produce ขาด. The band **says how many days are which** and the two are **never added**.
  The same status then colours **the day calendar** (`spCalHtml` paints `st-ok`/`st-short`/
  `st-over` and legends them), **the slip card in the month list** (left border + pill, replacing
  the cases-sent percentage when a status is known) and the band's **per-line chips** — one
  criterion, no screen can contradict another. A day with no file is **not coloured at all**, never
  green. And **📋 ต้องทำอะไรต่อ** is the manager summary he asked for: 🔴 what is short and by how
  much, 🟠 what is over and must be subtracted, 📲 what still needs keying to reach ตั้งต้น — each
  per product with its quantity, and a green "ครบทุกรายการ" line when there is nothing to do.
  ⚠️ ขาด and เกิน stay **separate buckets, never netted off across codes**, so a slip with one code
  short and another over reads **ขาด**, not "ตรง". Prove it with §16 of
  **`node test/browser/spord.test.cjs`** (437 checks), which builds all three states in one slip —
  FO01 keyed 8 ลัง / picked 9 ⇒ เกิน 1 ลัง, FO02 keyed 3 / picked 1 ⇒ ขาด 2 ลัง — and asserts the
  slip reads ขาด, that the calendar day and the slip card carry the same status, that the manager
  list names both products, and that no `\d+\.\d+ ลัง` survives.
  **🔐 A second code guards the whole page** (owner, 26 Nov 26: *"ให้ใส่รหัสอีกหนึ่งชั้นเพื่อเข้าชั้นนี้"*).
  `renderSpord` returns the PIN screen and **draws nothing of the page** until `spPinOk()`. Two
  rules. **The repo is public, so the digits are never written into any file** — only the SHA-256
  (`SP_PINH`), checked with `crypto.subtle`, which is why `spord.test.cjs` now loads over a real
  `https://` origin like the cstock suite (no secure context, no `crypto.subtle`, no localStorage).
  And it is **a wrong-page guard, not a security boundary**: the check runs in the browser, so what
  actually protects the data is the unchanged server-side role table in `api/spord.js` — never move
  a permission from there to this gate. The unlock is remembered per **device and per logged-in
  user** (`bdsp:<uid>`, `SP_OPEN` holds the uid, not a flag), so handing the phone to someone who
  logs in as themselves asks again; 🔒 ล็อก in the page header forgets it. Not part of the synced
  state, every access in try/catch.
**📦 ออเดอร์พิเศษ (`spord`) is its own top-level group**, not a tab under สต็อก — the owner moved it
  out on 18 Nov 26 (*"โยกหมวดออเดอร์พิเศษแยกออกมาจากสต็อค ให้เป็นหมวดใหญ่"*) and it is on the admin
  site too (`ADMIN_SITE_GROUPS`). It carries the owner's Nov-26 order: special orders run
  through **6 steps and 4 teams** — 1 admin opens the big order, 2 the rep types **only the order
  code**, 3 admin checks the picking list (tick + note), 4 ทีมคลัง picks (tick), 5 ทีมสายส่ง
  delivers (tick), 6 admin closes it (where it went / how much is left). It is a **new page beside
  the existing สต็อคกลาง, not a rewrite of it**: same `CSTOCK.slips`/`lots`, plus one new keyed map
  `CSTOCK.sub["sid|ORDERNO"]` (with `CSTOCK.subdel` tombstones) and a `g:"A"|"B"` flag on the slip
  for the two groups the owner named (ตัดบิลแล้วยังไม่ส่ง / ส่งแล้วยังไม่ตัดบิล; an old slip with no
  flag reads as A). **The group is picked in the create form itself** (`cstGrpHtml`/`cstSetGrp`/
  `cstFormGrp`, owner 18 Nov 26) — it used to be settable only from the slip header after saving.
  It is a field on the slip, not a new section, so it merges with the whole record; `cstSlipEdit`
  must read it back or re-saving a group-B slip silently drops it to A. `.pl-today.on` had no style
  at all, so the header's own group toggle never showed which half was selected — the rule now
  paints it, and the step-tick buttons with it.
  **Reduced to 2 steps on 25 Nov 26** (*"ขอปรับใหม่ให้เริ่มจากง่าย ๆ ก่อน เป็นแค่ฝั่งเซลล์และ
  ฝั่งแอดมินทำงานร่วมกัน 2 ขั้นตอนก็พอ"*). The 6-step machinery is **retired, not deleted**: the
  old order-number list still renders behind the third chip 🧾 เลขออเดอร์ (ของเดิม), and
  `CSTOCK.sub`/`subdel` keep merging. The slip page is now ① ✍️ ฝั่งเซลล์ ② 🔎 ฝั่งแอดมิน, both
  keyed by a **day picker**, with product **names shown, not bare codes** (`spSlipCodes`) because
  the owner said *"ตอนนี้มันขึ้นแค่รหัสมันตามดูยาก"*.
  **① The supervisor types what the reps keyed each day** (`spKeyHtml`/`spKeyLineSave`), laid out
  like the owner's own template file — สายวิ่ง × สินค้า → จำนวนขาย / จำนวนแถม — in **ลัง + ชิ้น**,
  the same unit as the bill-cut slip (he chose it). Sale and free are stored separately only so the
  warehouse file can be checked against them: **the figure that rolls up to the big order adds them
  together** (*"พอสรุปขึ้นออเดอร์พิเศษหมวดใหญ่ ให้รวมจำนวนไปเลยเหมือนเดิม"*).
  **② The admin uploads the warehouse's Order Allocation Report and types that day's GIN numbers**
  (`parseAlloc`/`alPick`/`spGinSave`/`spCmp`), and the page says per line and per product whether
  what went out matches what the reps keyed. **dcode exports this report in two flavours and both
  must keep working** — `Order_Allocation_ReportHistorical_N.xlsx` and
  `Order_Allocation_ReportReal_Time_N.xlsx`, which the owner sent on 28 Nov 26 asking *"ช่วยแกะหน่อย
  ว่าสองไฟล์นี้ต่างกันยังไง และทำให้มันอัพได้ทั้งสองแบบไปเลย"*. Measured on his two real files:
  **36 columns, same order, and the content is identical** — the 609 orders both carry agree
  609/609 on status, GIN, invoice number, quantities and money. They differ in exactly two ways:
  the **window** (Historical = the whole current month, 12 days / 13,003 rows; Real Time = the last
  day or two, 2,584 rows) and the **capitalisation of two headers** — `Product Code` → `Product code`
  and `Sale Order (PC)` → `Sale order (PC)`. That alone made the Real Time file throw
  "ไม่พบหัวตาราง" and store nothing, which is why **every reader now finds columns through
  `hdrFind`/`hdrIx`** (`hdrNorm`: trim, collapse whitespace including ` `, lowercase). The rule
  is unchanged in every other respect — **whole-cell match, never substring** (what `pjColEq`,
  `dsColOf` and `cstExRead` were already careful about), and a header that is genuinely missing
  still **throws and stores nothing**; only letter case is forgiven, because dcode is inconsistent
  with its own. Measured: neither file has two headers that collide once case is ignored, so no
  column can be picked by mistake. Because the two files differ only in window, the browser-side
  union needed the server's rule too: **`alPickGin` mirrors `api/alloc.js`'s `pickGin`** (more days
  wins, then more rows, then the later last day) — `parseAlloc` used to let the newest file win
  outright, and measured, 2 of the 31 shared GINs are covered by more days in the Historical file,
  so uploading Real Time afterwards would have quietly shrunk them. Uploading in either order now
  gives byte-identical results, and the log names the flavour read and how many GINs it kept.
  Everything below was measured on the owner's earlier real
  `Order_Allocation_ReportHistorical.xlsx` (10,428 rows, 15–24 Nov 26):
  columns are found by **header text**, never position, and a renamed header **throws and stores
  nothing**; the line is the last two digits of **`PJP Code` (E) and `PJP Name` (F), which agree on
  all 10,428 rows**, and runs 11–17/19/22/97/99 — not just 11–22, so it goes through
  `dsLineKey`/`FOCUS_MAP` and is never hard-coded to a range; **one GIN is NOT one line (103/145),
  not one day (117/145), not one shop (71/145)**, so the check fans a GIN out per line and **says
  which dates that GIN actually covers** instead of assuming the day selected; and the file carries
  **both** `Sale/Free Order` (R–W) and `Sale/Free Allocated` (X–AC), which **differ on 603 sale and
  37 free rows** — the owner named R–W, so that is the figure compared, and the Allocated column is
  shown underneath when it disagrees rather than silently picked.
  **The allocation file never enters the synced state.** Since 27 Nov 26 it IS kept, but in its own
  month-sharded blob behind `api/alloc.js` (see the 📥 paragraph above) — `bd-data-*` is untouched,
  and only the **result** the admin saves goes into the state, aggregated and **restricted to the
  codes in that slip** (the `pmCodeSet` rule), so a 10,428-row file cannot bloat the snapshot.
  Two new keyed maps carry the two sides, **never one record**:
  `CSTOCK.key["sid|YYYY-MM-DD|CT11"]` and `CSTOCK.gin["sid|YYYY-MM-DD"]`, merged newest-wins per key
  (`newestByAt`) so a tab left open on one side cannot erase the other's work — and deleting the slip
  drops both. Writes go through **`api/spord.js`** (`act:"key"` = `sup`/`manager`, `act:"gin"` =
  `manager`), checked **on the server**: everyone may look, each side edits only its own, the manager
  edits everything. The month picker now runs **January → December down the page** with one row per
  month (`.sp-mon`), which is what the owner asked for after calling the old grid *"ไม่สวยเลย"*.
  **The month's slip list is the screen the team picks from**, so each card is built like a
  สต็อคกลาง slip (`spSlipCard`, sharing `cstPct`/`cstPctCol`/`cstPctPill`/`cstPctBar`, so the two
  pages can never show a different percentage) **and lists the products and quantities inline**
  — the owner asked for that in as many words: *"ปรับให้ขึ้นโชว์สินค้าและจำนวนด้วย ว่าล็อตนี้ตัด
  สินค้าอะไรจำนวนเท่าไหร่ เพราะเวลาทีมเราเลือกดู เราดูจากข้อมูลตรงนี้"*. **`spSlipCodes` must keep
  its own array**: product codes are all-digit strings, so returning `Object.keys(map)` made the
  engine sort them numerically and the list stopped matching the slip's own order. On a phone each
  product is a full-width row with the name unclipped, because the name is what they choose by.
  Three things the owner asked for on 26 Nov 26 after testing it live:
  **① Undo.** `spGinUndo` writes `del:1` over the day's record — **never a key delete**, which a
  stale tab would union straight back (the `ok:0` / `v:0` rule), and the supervisor's figures for
  that day are untouched.
  **② Quantities as ลัง + ชิ้น, and money.** The file gives `Pack Size` (Q) but **not how many
  pieces are in a แพ็ค (SHR)**, and **51.5% of rows (5,369/10,428) use that unit**, so it cannot be
  ignored. `alShrink` reads it out of the product name and **only accepts a pair that multiplies to
  Pack Size exactly** (`24X12X30มล` + Q 288 → 12; `6X6X160 กรัม` + Q 36 → 6). Measured: **all
  5,369 rows that use แพ็ค resolve, 100%**, and the 239 codes it cannot resolve never use the unit.
  A row it still cannot convert is **reported, never guessed at 1**.
  **Money is two different questions and the page must not blur them.**
  *ยอดสินค้าในใบนี้* counts only the slip's own products; *ยอดทั้งออเดอร์* is every order number in
  that round, read from `STOREDAILY.ord` by matching the allocation file's **Order Number**
  (column M), and it **includes products outside the slip**, so the page says so. Of the owner's
  1,789 order numbers, 1,401 matched his sales file — 375 were days that file did not cover and
  **13 were orders with no invoice yet** (status Confirmed / Ordered / Sent to Locus), which is why
  an unmatched number is counted as *รอไฟล์ยอดขาย* and never as 0.
  **The money comes from the allocation file itself** (owner, 26 Nov 26: *"ทำไมไฟล์ allocate จะไม่มี
  อยู่สองช่องสุดท้ายด้านหลังนี้ไง ลองตรวจใหม่หน่อย"* — he was right; the first export analysed had
  30 columns, his newer one has **36**, ending **AI = GSV · AJ = NIV per row**). Measured on
  10,428 rows: GSV 7,042,941 · NIV 5,169,482 (73.4%), and per order **GSV and NIV agree with the
  daily sales file on 1,401/1,401 orders — 100%**, so the two files state the same money and no
  estimate is needed. Those columns, plus `Order Status` and the two allocation-status columns, are
  therefore **optional lookups in `AL_O`, never required**: an older 30-column export must still
  parse, and when it does the page **says out loud** that the file has no money columns and falls
  back to the หัวเสือ estimate (`sum.src` `"file"`/`"price"`), never a silent 0. In that fallback
  note **WS LP is per case while NTT is per piece** (measured: WS 900/case of 36, NTT 16.40,
  RSP 20), which cost one wrong version where NIV came out 36× too small.
  **Free goods are the one figure that stays an estimate**: all 937 free-goods-only rows carry
  GSV 0 / NIV 0, because free goods earn nothing — so the file's money is the *sale* money, and
  *มูลค่าของแถม* is still priced from the หัวเสือ file and labelled ประเมิน. Never add them together.
  `rows[].g`/`.v`/`.mn` and `money:1` are saved on the gin record, so a stored check reads back with
  its real money without re-uploading the file; `mn` (rows that carried money) separates **"the file
  says 0"** from **"the file has not billed this yet"**, which the page reports as
  *ไฟล์ยังไม่ลงเงิน*. `parseDailyDcode` also stores `g` (GSV) on the order index; a file uploaded
  before that says so and asks for one re-upload rather than showing 0.
  **③ The day's check exports** to Excel (`spRepXlsx`, สรุป + **รายสินค้า** + รายการ sheets) or PDF
  through the browser's own print (`spRepPrint` into `#prArea`). Both read `spCmp`, so the document
  and the screen can never disagree, and the filename stays ASCII (`fnAscii` — Chromium drops a Thai
  `a.download` name *and* its extension). The PDF follows the screen's order (28 Nov 26): the
  summary band, **ผลต่างมาจากส่วนไหน**, then **สรุปรายสินค้า**, and only then the detail — which is
  **cut to the rows that disagree** and to 8 columns, because the old 19-column table printed every
  row and was unreadable. Nothing is lost: every ลัง/แพ็ค/ชิ้น figure of every row is still in the
  Excel's รายการ sheet, and the PDF says so.
  **How long from picking to billing** (the owner asked, 26 Nov 26): matching Order Number across
  the two files, **46.7% of orders are invoiced the same day, 43.3% the next day, 9.2% two days
  later and 0.9% beyond — mean 0.65 days, median 1**. Saturday is the exception: Sunday has no
  invoicing, so 111 of 229 Saturday orders land +2 days. So a check run the morning after the
  picking day already covers ~90% of it, and the remaining tail needs the day after that.
  Prove it with **`node test/browser/spord.test.cjs`** (437 checks) plus the `key`/`gin` cases in
  `merge-safety`.
  **One sub-order record is written by four teams at four different times**, so
  `mergeState` merges it **step by step** (`mergeSubOne`) — newest-wins on the whole record would
  let a rep's tab that has been open since morning erase the warehouse's and the driver's ticks, the
  same trap `mergeExOne` fixed. Un-ticking writes `ok:0`, never a key delete. Every write by a rep,
  the warehouse or a driver goes through **`api/spord.js`**, one key per call, with the step→role
  table checked **on the server**, not by hiding the button. The rep types the code alone because
  `parseDailyDcode` also builds **`STOREDAILY.ord`**, an index of dcode's order and invoice numbers
  → shop / line / value / item count (measured on the real file: 1 order = 1 shop = 1 invoice = 1
  line = 1 day for all 89 orders, ~80 KB a month) — and that index must stay in `mergeState`'s
  explicit `STOREDAILY` field list or it vanishes wholesale. A code typed before that day's sales
  file is uploaded shows **"รอไฟล์ยอดขาย"** and fills itself in later, never "wrong code". Prove it
  with **`node test/browser/spord.test.cjs`** (437 checks) plus the special-order cases in
  `merge-safety`. The page opens on a **month picker** (`SP.view` `"mon"` → `"slip"` → `"new"`,
  `SP.ym`, `SP.yr`), then that month's orders, then one order's 6 steps — the owner asked for it so
  the landing screen is not a long list; each month and slip card carries the count still waiting on
  *your* team. **`spMonths(yr)` always returns all twelve months of the chosen year** (a month with
  nothing reads `0 รายการ`, dimmed; today's month is badged) with a **year picker and ◀ ▶** above —
  the owner asked for exactly that, so never go back to listing only the months that have data.
  **`spCases(sid)`** answers his question *"ออเดอร์นี้ … ครบ loop สายส่งส่งของเสร็จไปแล้วทั้งหมดกี่ลัง"*:
  cases cut (from the slip's own rows) vs cases the reps have keyed vs cases whose **step 5 is
  ticked** vs what is left — the keyed/sent figures come from `STOREDAILY.ord[no].cs`, so nobody
  re-types a quantity that the daily sales file already states. It carries its own **➕ สร้างออเดอร์ใหม่** button (`spNewOrder`, manager only)
  which renders **the existing `cstFormHtml()` inside this page**, never sending him back to
  สต็อคกลาง (*"ไม่ต้องดึงกลับไปหน้าเก่าแล้ว"*); so the form's many `renderCStock()` buttons keep
  working, `renderCStock` re-renders **this** page when `CURTAB==="spord"` (one way only — the
  reverse call does not exist), `CST.sec` is forced to `"list"` so the old page cannot paint a
  second copy of the same ids, and **`cstNew()` must run before the tab switch** or the render
  sees `view:"new"` with no `CST.f` and reads it as "just saved". Saving lands on the new order.
  On this page the form renders **lite** (`cstLite()`, true exactly when `CURTAB==="spord"`): no
  per-row สายวิ่ง / ผู้รับผิดชอบ columns, no ⇉ spread, no 📎 attach-shop-file button — the owner
  removed them because the reps' order numbers now carry the line and the destination — while
  **ผู้รับผิดชอบ (ทั้งใบ) in the slip header stays**. It only hides inputs: `r.ln`/`r.own` remain
  fields, old slips still show their line everywhere, and the สต็อคกลาง form keeps every column
  (its 253 checks still pass).
  And **the destination
  shops now come from the order numbers the reps key, not from an uploaded Ex.export file**
  (`spShops`/`spShopsHtml`, shown to every team) — *"ต่อจากนี้เราจะต้องให้เซลล์มาลงข้อมูลเองว่า
  กระจายไปร้านไหนบ้าง โดยการใส่เลขออเดอร์"*. Codes whose day has no sales file yet are counted and
  listed separately as **"ยังไม่รู้ร้าน … รอไฟล์"**, never dropped from the list.
  Rules: `HANDOFF.md` §5.
  **There is exactly ONE upload button on the whole site**, in the header, on every page
  (`#upBtn`, class `admin-upload` so it is manager-only) — the owner asked for it on 25 Nov 26:
  *"ปุ่มอัพโหลดไฟล์ ช่วยทำให้มันรวมปุ่มนึงทุกหน้า สามารถอัพได้ของทุกไฟล์ได้เลย ไม่ต้องไปเปิดแทบนั้นๆ
  โดยปรับให้มันกดเลือกแต่ละหมวดได้เลย"*. It replaced 13 per-page buttons, each of which could only
  reach its own page's slots, so uploading a price file meant first opening the price tab. The modal
  now carries a **category chip bar** (`#upCats`, `UP_CATS`/`upSetCat`/`upPaint`) with a
  **📂 ทุกหมวด** chip; the chips are built from the `data-group` values actually present in the
  modal, so a new slot with a new group appears by itself once its name is in `UP_CATS`.
  **📦 And since 29 Nov 26 the modal opens on ONE button that takes every file at once**
  (`#fileAll`/`upAllGo`/`upAllRun`/`upSniff`, owner: *"ช่วงนี้เอกสาร excel ผมต้องอัพเยอะมาก ช่วยทำ
  ปุ่ม master upload ให้ผมอัพทุกไฟล์เข้าไปทีเดียว แล้วระบบไปจับอ่านแยกให้อัตโนมัติ ไฟล์ไหนอ่านไม่
  สำเร็จให้แจ้งเตือนผลลัพธ์ด้วยเหมือนเดิม"*). **The one rule that matters: it never guesses.** A file
  it cannot place is **named in the log with the reason** and the owner is told to use that file's
  own slot — routing to the nearest-looking parser could overwrite good data, which is the project's
  largest rule. Detection reads the **file's own headers first** and reuses each parser's own
  identification test (`psiIsDetail`/`psiIsFile`, `txIsTxn`, `dsIsDcode`, `pjIsDcode`,
  `AL_H`, `PM_DCODE`, the `BM1` cell, the `Cust Finance` sheet …), so there is no second
  rulebook to drift; the filename (`UP_FN`) only breaks a tie or answers for a file too big to
  re-read. **ใบสั่งของ and ใบเปล่า are the same Unilever form**, so only the filename separates them
  — `BD_ddmmyy` = order, `Confirm` = blank, **neither = reported, not guessed**, because guessing
  "order → blank" would swallow the quantities the centre ordered. Measured against the owner's
  20 real files before shipping: **17 of 17 real upload formats identified, 16 of them from the
  headers alone** (BUM at 28 MB uses its name, being over `UP_BIG`); the other 3 files are
  hand-kept spreadsheets that were never an upload format and are correctly reported as unknown.
  Four more rules: sniffing reads only `UP_SNIFF_ROWS` (40) rows per sheet via SheetJS `sheetRows`,
  never the whole file; files are read and parsed **one at a time with the buffer released between
  them** (the analytics file alone is ~60 MB); they are **reordered by `UP_KIND[].o`** so reference
  data lands first (price → master → outlets → order form → Drop → PSI → the rest), which is also
  why `parseMasterDcode` finds its price file; and `handleTyped` and `upAllRun` dispatch through
  the **same `UP_KIND` table**, so a per-category slot and the master button can never read one
  file differently. Retired kinds carry `off:1` and the master button never routes to them.
  Prove it with **`node test/browser/upall.test.cjs`** (51 checks, self-contained).
  **A retired slot is hidden, never deleted** (`data-off="1"` + `hidden`, skipped by `upRows`):
  ยอดรายร้าน, แข่งขันเปิด eB2B and the สต็อคกลาง Excel form went on 25 Nov 26, and PJP collapsed to
  one slot because dcode merged Master Outlet and the plan into one file — *"ช่วยปรับเอาปุ่มที่ไม่
  จำเป็นแล้ว ออกไปหน่อยนะ แต่ให้ข้อมูลยังคงอยู่เหมือนเดิม"*. The `<input>` stays in the page
  (`handleTyped` binds to it at load) and every parser and stored section is untouched, so undoing
  it is removing two attributes.
  It still **opens on the current tab's category** (`UP_TAB`) so the daily routine is no slower,
  and that chip is marked *· หน้านี้*. Never let an unmapped tab fall through to `"sales"` — it did
  once, and the cstock-tab upload button opened the daily-sales slots; an unmapped tab now opens on
  ทุกหมวด. The cstock test walks every tab to prove each mapped one opens its own category, that
  switching to another category works without leaving the page, and that no page carries a second
  upload button.
  **A button must look like a button.** `.btn-ghost` is the site's secondary button (40 uses) and
  carried only a `background` and a `color` — inside `.modal-actions` another rule finished the job,
  so everywhere else it rendered as the browser's bare default. That is what the owner saw on
  ← กลับไปรายการใบ and 🔒 ล็อก (27 Nov 26: *"ปรับให้ปุ่มเห็นชัด อ่านง่าย คนเห็นแล้วเข้าใจว่าต้องกด"*),
  and it was never those two screens' fault. The class now carries its own border, radius, padding
  and a 40px minimum height, with `.btn-mini` (32px) for buttons inside a table row. Two more:
  **`.backbtn` in the header needs `white-space:nowrap`** — it wrapped to two lines on a phone and
  pushed the 54px header to 110px, which is what shoved the avatar and ออก out of line; and
  **a save button is never a dashed outline** (`.sp-save button` is solid blue now) — a dashed border
  is what `.upload-btn` uses to say *drop a file here*, a different thing entirely.
  **📱 Rotating the phone must not leave the page wider than the screen** (owner 27 Nov 26:
  *"ในมือถือพอพลิกเป็นแนวนอน แล้วกลับมาเป็นแนวตั้ง มันกลายเป็นแบบนี้"* — narrow cards on the left,
  the chart panel jutting out far wider, the header clipped). **The cause was CSS Grid, not
  Chart.js**: a track written `1fr` has an automatic minimum of **min-content**, and Chart.js
  writes `style.width` on the canvas **in pixels** — so after rotating back the landscape pixel
  width was still on the canvas, the track could not shrink below it, the document went wider than
  the viewport, and Chart.js never shrank the canvas because its container never got narrower.
  A deadlock. Measured at 390px before the fix: the grid computed to **800px** and the document to
  **814px**. Fixed in three layers — every chart-bearing track is **`minmax(0,1fr)`**,
  `.chart-wrap` carries `min-width:0;overflow:hidden`, and `#app canvas{max-width:100%}` backstops
  the containers whose grid is written as an inline style (`#anaPieGrid`). **`bdReflow`** on
  `orientationchange`/`resize` then tells every live chart to re-measure (iOS settles the new size
  after the event), which is insurance, not the fix. Prove it with
  **`node test/browser/layout.test.cjs`** (65 checks, self-contained — it also measures every tab
  row for the owner, an admin and a rep at 1280 / 1100 / 390px; see the 🖱 rule in the tab-bar
  section above, and the expanded tracking row at both widths).
  **🎨 The ออเดอร์พิเศษ pages are colour-zoned per step** (`TAB_SUPERS`'s sibling idea; `.sp-zone`
  + `.spz-key|rep|adm|out|rpt`, owner 27 Nov 26: *"ขอปรับหน้าออเดอร์พิเศษ ให้มันมีแบ่งโซนแบ่งสีช่อง
  หน้าจอการทำงานนิดนึง สำหรับทุกฝ่าย ให้มันดูง่าย เห็นช่องกรอกง่าย ๆ … ตอนนี้มันดูขาวโล่ง แซมน้ำเงิน
  … ให้มีdynamic ของสีและฟ้อนมากกว่านี้หน่อย"*). The work is a relay of three teams in one day, so
  each step owns a colour and **the step chip, the flow-strip button and the whole screen share
  it**: ✍️ ซุปจด amber · 📲 เซลล์คีย์ blue · 🔎 แอดมินตรวจ violet · 🚚 คลังจัดส่ง green ·
  📊 รายงาน slate. `renderSpord` wraps each section in one `<div class="sp-zone spz-…">` and every
  rule reads four custom properties (`--z` `--zs` `--zb` `--zg`) off it — so a new step needs one
  line, not a new stylesheet. Four rules: it is **presentation only**, no function, figure or
  permission is keyed on a colour (`api/spord.js` is untouched); **colour means "which step", never
  "passed/failed"** — success and failure stay `.sp-ok`/`.sp-bad` and the calendar's status dots
  keep their own meanings, so never reuse a step colour for an outcome; **an empty entry field is
  tinted and a filled one turns white with a dark border** (`:placeholder-shown`), which is what
  "เห็นช่องกรอกง่าย ๆ" asked for, so every such input must keep a `placeholder`; and **`.sp-zone`
  must be declared BEFORE the `.spz-*` lines** — both are single-class selectors, so the later one
  wins and putting the fallback last turned every step blue. Prove it with
  **`node test/browser/layout.test.cjs`** at 1280 and 390.
  **🪜 Each step is a four-step ladder of weight, not one flat tone** (owner, 27 Nov 26: *"อยากปรับ
  สีในแต่ละรายขั้นตอน ให้มันมีทึบหนาบางในตัวหน่อย เช่นหน้าซุปมันเหลือง แต่ก็เหลืองโทน ๆ เดียวกัน
  หมดเลย … ไม่ใช่ว่าต้องหลากสี แต่เป็นเรื่องของความเข้ม อ่อน สีขาวแทรก สีเทาแทรก … สำหรับทุก flow
  ออเดอร์พิเศษเลยนะ"*). Heaviest to lightest: **`--z` solid** (table header, card header, action
  button — white text on the step colour) · **`--zs` medium** (the band that starts a new line or
  group) · **`--zt` light** (the strip under a heading, and an empty entry field) · **white** (the
  data rows, which are what people actually read, so they stay the cleanest thing on the page) —
  with a shared neutral **`--gr` grey** on totals rows and read-only areas. **`--gr` is the same
  grey in every step on purpose**: it is the "not the step colour" note, and tinting it per step
  would collapse the ladder back into one tone, which is the problem being fixed. Two traps:
  `.tblwrap.sp-freeze thead th` and `tr.lnh>td` carry their own more-specific rules, so the zone
  must override them by name or half the header row stays the old pale grey; and the heading band
  uses negative margins equal to `.panel`'s padding with its own `border-radius`, because
  **`.panel` must never get `overflow:hidden`** (the cstock sticky bulk bar depends on that).
- `test/browser/_chrome.cjs` — finds the installed Chromium at run time. Never hard-code a
  `/opt/pw-browsers/chromium-NNNN/...` path in a test again: the image moved once and took all 15
  browser tests down with it.
- `src/pricelist.html` → `public/pricelist.html` — the PUBLIC customer price catalogue (hand-written in `src/`, generated into `public/`),
  reachable at **`/UnileverBDpricelist`** via the `rewrites` in `vercel.json`. It is written for
  shop owners, often elderly, so: a real **table** with fixed-width number columns (the prices must
  line up down the page — a flex-wrap card made every row start at a different x, which the owner
  rejected), **25px numbers**, Unilever's in-house category codes translated to plain Thai
  (`CAT_TH` — `FAB SOL` → `ผงซักฟอก & น้ำยาซักผ้า`, named from the brands actually in each
  category), the item code shown as **`รหัส <code>`**, worded and placed identically to the in-app
  view because customers read it out to the sales rep, a **brand filter** of tick-chips, and
  **click-a-column-header to sort** like Excel
  (desc → asc → off; sorting drops the category bands, and rows with no value always sink to the
  bottom whichever direction). Two traps: the table wrapper must never carry `overflow:hidden`
  (it silently kills the sticky header), and below 760px the header is hidden so the sort has to be
  reachable from the `.sortsel` dropdown instead. Prove it with
  **`node test/browser/pricelist.test.cjs`** (40 checks in a real browser at 1280 and 390,
  including that the page only ever calls `/api/pricelist`).
- `vercel.json` — `rewrites` only (the pretty links for the catalogue, the application form and `/admin`).
  Keep it to `rewrites`: `builds`/`routes` would disable Vercel's zero-config handling of `api/*`.
- `api/price.js` — manager upload + role-aware read of the two price files (separate blobs).
- `api/pricelist.js` — PUBLIC, GET-only, READ-ONLY, หัวเสือ prefix only. See the 🔒 section above.
- `build.cjs` — regenerates `public/index.html`, `public/admin.html`, `public/pricelist.html` and `public/join.html`, **stripping every comment** on the way out (run after every edit).
- `public/index.html` — generated output that Vercel serves. Do not edit by hand.
- `public/admin.html` — the admin site (`/admin`), generated by `build.cjs`. Do not edit by hand.
- `src/join.html` → `public/join.html` (+ `public/img/*`) — the public shop-application page. Hand-written in `src/`, generated comment-free into `public/`; never edit the `public/` copy.
- `public/vendor/jszip.min.js` — vendored (MIT), lazy-loaded only when a PO file is generated.
- `public/vendor/ocr/*` — Tesseract.js + its wasm core + the English model (Apache-2.0), ~8 MB,
  vendored on purpose and lazy-loaded **only** when the manager reads a report screenshot, so a
  blocked CDN can never break his monthly routine. Nobody else ever downloads it.
- `api/*.js` — Vercel serverless functions (ESM): `login`, `data` (read newest non-empty blob),
  `save` (manager save + gzip + mergeState + 8 backups), `request` (sales-only request write),
  `apply` (PUBLIC shop application → its own `bd-lead-*` blob), `leads` (manager-only read).
- **`PSI`** (in the main snapshot, no endpoint of its own) — goods received from the centre, read by
  `parsePSI` from **either** `PSI_ddmmyyyy.xlsx` (31 columns) **or** dcode's
  `PSI_Detail_Report_N.xlsx` (24 columns, splits bought from free). Uploaded from the one upload
  button under the category **📥 สถานะออเดอร์ (ซื้อ)**. See the 📥 section above for the measured
  rules — above all that the old format folds free goods into the same quantity, so a key the detail
  file has already written (`dt:1`) must not have its quantities overwritten by it.
- `api/ordtrk.js` — the 📋 order-tracking index, fed by **two** files (the warehouse's allocation
  report and the reps' Transaction Inquiry): manager/admin upload, **everyone** reads.
  Its own blob prefix (`bd-ordtrk-`), **sharded by month**, never a read or a write of `bd-data-*`
  — see the 📋 section above for why. GET with no month lists the months from the blob NAMES
  (one listing, no download); `?m=YYYY-MM` returns that month; `det` (the per-order product
  breakdown) comes back only for `?full=1`. A write MERGES per order; which side wins is decided
  by `u`, **the last day the FILE covers**, never the upload clock.
- `api/alloc.js` — the warehouse's picking file (Order Allocation Report), kept so the GIN check
  works on any device without re-picking it. Its own blob prefix (`bd-alloc-`), **sharded by
  month**, never a read or a write of `bd-data-*`. Manager only, both ways. A write MERGES per GIN
  and **the side covering more days wins** — see the 📥 paragraph in the ออเดอร์พิเศษ section.
- `api/promo.js` — the supervisor (`sup`) writes ONE promotion per call (`PROMO.items[id]`), or the
  manager deletes one (`PROMO.del[id]`). It rebuilds the record from known fields only and must
  never write `PROMO.sales`.
- `api/promoimg.js` — manager/supervisor upload of one promotion slide to its own `bd-promoimg-*`
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

**🔤 Every reader finds its columns through `hdrFind`/`hdrIx`** (`hdrNorm`: trim, collapse
whitespace including ` `, lowercase), because dcode does not spell its own headers the same way
twice: its two Order Allocation exports of the same report differ only in `Product Code` vs
`Product code` and `Sale Order (PC)` vs `Sale order (PC)`, and that alone made one of them throw
"ไม่พบหัวตาราง" and store nothing. **The rule it relaxes is case and nothing else** — the match is
still against the **whole cell, never a substring** (`pjColEq`, `dsColOf` and `cstExRead` document
why that matters: `(Outlet Code)` sits inside `(Outlet Ship To Party Code)`, and `ผู้สั่งซื้อ` inside
`ผู้สั่งซื้อ (ID)`), a header that is genuinely missing still **throws and stores nothing**, and
columns are still never found by position. Measured on the owner's two real files: no two headers
collide once case is ignored, so no column can be picked by mistake.

**BD moved to the dcode system in Nov 26 (`DCODE_START`, recorded at the owner's request so no
report claims a shop "did not buy" in a period that has no dcode data), so several files now have
two formats each** and both readers must keep working (`STOCKD.src` / the daily log line say which
was read; PSI says it in the log and on the page; the allocation log names the flavour). Each new
reader is picked by a header the old file does not have, finds every column by **header text**
(never a fixed index), and **throws without storing anything** if a header it needs is gone — see the
สต็อก section above for `parseStockDcode`, the 📥 section for `parsePSI`'s two formats, the
ออเดอร์พิเศษ section for the two Order Allocation exports, and below for `parseDailyDcode`.
`parseDaily` dispatches to **`parseDailyDcode`** when the header row carries `(PJP Code)` and
`(NIV)`. dcode's daily file (`Sales_16-17112026.xlsx`, sheet `Export`, 49 columns) is a
**line-item bill list covering a date RANGE**, not one day, and the eight fields the dashboard
uses map one-to-one onto the old file's fixed columns — the map is in the comment above
`parseDailyDcode`, keep it in sync. Five things are easy to get wrong:
**the money is `(NIV)`** (after every discount, before VAT — the old file's `r[15]`, stored as
`niv`; `(GSV)` and `(Total Amount)` are also in the file and would both be wrong);
**the date is `(Invoice Date)`, not `(Sales Order Creation Date)`** — dcode filters the export by
invoice date (it says so in the file's last row), so a bill created on another day would otherwise
be filed under a date the file does not cover and overwrite that day;
**`(PJP Code)` 209697 is the line the whole app stores as `2096_97`** (KA97 — `FOCUS_MAP`,
`FOCUS_ORDER`, `lib/accounts.js`, every stored month), so `dsLineKey` maps it back or KA97's sales
appear as a brand-new line and its own rep cannot see them;
**the last row is `Applied filters: …`, not data** (it records the range and is reported, not read);
and because a dcode export **can be filtered**, the reader writes
**per line and per shop, never "wipe the whole day"** — a file holding one line must not delete the
other eleven lines' sales for that day. What it keeps instead of deleting is **reported** in the
upload log, as are an unknown PJP code (kept under that code), a rep name that disagrees with
`DATA.lines[].name` (never overwritten — CT12 changed rep), a document type other than `Sales`,
and a last day equal to today (the export may be mid-day, so re-upload after the day closes).
`DATA.lines[].emp` is filled only when empty. Prove it with
**`node test/browser/dailydc.test.cjs`** (32 checks, self-contained with made-up figures; 35 with
the real file via `DCODE_DAILY=/path/Sales_....xlsx`, which never enters the repo — the repo is
public, so never commit the depot's real revenue).
`parseOutlet` **and** `parsePJP` both dispatch to **`parsePjpDcode`** when the header row carries
`Section Code`, because dcode merges Master Outlet and the PJP plan into **one file**
(`Outlet_Master__PJP_Report.xlsx`) — either upload button takes it, and both old files still work.
That file has **no date column at all**: the visit day is encoded in `Section Code`
(`SC209616F204` → last 6 = line `16`, round `F2`, **day slot `04`**) and cross-checked against
`Section Name` (`209616_THU`). Slots 01-06 are Mon-Sat of week 1, 07-12 of week 2, and the calendar
anchor is **the first Monday of the month** — both facts measured, not guessed: the three encodings
agree on **2,888 of 2,888 real rows** (the other 12 are `SCDUMMY02096`, a fake outlet, which must be
dropped), the line matches the sales file on **86 of 86 billed shops**, and 61 of the 83 shops billed
on Monday 16 Nov sit in slot 12 = **Saturday 14 Nov** (the go-live backlog), which the first-Monday
anchor predicts exactly and the alternative anchor does not. `F<N>` means **N visits a month, so
repeat every 28/N days** (`pjStepOf`): F2 → the existing +14 rule, capped at **2 rounds = 24 days a
month** (never invent a +28 round — report the uncovered working days instead), while the telesales
line (`TL_HPC_219`, F4, 689 shops over slots 01-06 only) repeats **weekly** or half the month would
be empty. The file has no visit-order column either, so row order is the order. Rules, the full
validation and what the file is missing: `HANDOFF.md` §5. The rep's page also lists
**🛑 ร้านที่ยังไม่มีบิลเลย** (`pjNoBuy`), which counts only from `DCODE_START` onward and takes the
shop list from `PJP.out`, not from that day's plan. Prove it with
**`node test/browser/pjpdc.test.cjs`** (32 checks; 34 with the real file via `DCODE_PJP=...`, which
holds real customer names and never enters the repo).

## Working style
Make small, verifiable changes. After editing the template, run `node build.cjs` and confirm it
prints `OK server bytes=...` with no `ANCHOR NOT FOUND`. Commit template + `public/index.html`
with a clear message, push `main` (that is the deploy). Report back in Thai: what changed, and to
test the live site in ~1 minute. For anything touching `api/save.js` data merging, double-check
old data cannot be lost before pushing.
