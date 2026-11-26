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
The pages sit in **12 top-level tab groups** on the main site (among them **📥 สถานะออเดอร์ (ซื้อ)**
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
  running **`node test/merge-safety.test.mjs`** (315 checks against the real `api/save.js`, the real
  `api/ordtrk.js` and the
  real `lib/snapshot.js`: old browser tab without a new field, new upload vs existing keys,
  empty/crashed client, fresh blob store, manager-vs-sales requests, PS tombstones, eB2B, PO
  status, DCI periods, MINSTOCK tombstones, KPI date-keyed rounds + `KPI.meta` + `KPI.del`
  tombstones, goods receipts from the centre (`PSI.rows`/`days` — a PSI export filtered to one day
  must not delete the days already read, and a tab from before the section existed must not blank it),
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
- Prove it with **`node test/browser/dcode.test.cjs`** (102 checks; 104 with the real outlet file via
  `DCODE_OUTLET=/path/Master_Outlet_Data.xlsx` — that file holds customer data and never enters the
  repo). Rules and the analysis of the real files: `HANDOFF.md` §5.

## Request-size limit (why the client gzips)
Vercel caps the request body (~4.5 MB) and the blob is several MB, so the client gzips the
payload (`CompressionStream`, header `x-body-gzip:1`, content-type `application/octet-stream`)
and `api/save.js` inflates it (`gunzipSync`). Do NOT set `Content-Encoding: gzip` (the edge would
auto-decompress and the server would double-read). Keep this scheme intact.

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
  **`node test/browser/promoend.test.cjs`** (55 checks, self-contained with made-up codes; 58 with
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
  from the numbers we hold. **Everyone can open the page** (the owner asked for that explicitly,
  even though the CON Confirm card on ภาพรวมสั่งของ is manager-only), and it is read-only over
  ORDERS/DATA with the month on the non-synced `ORD.hm`. Prove it with
  **`node test/browser/ordhist.test.cjs`** (28 checks, self-contained, made-up figures — the repo
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
  **Every date / round / month picker carries ◀ ▶ step buttons** (`.dstep`, `selStep`/`dateStep`/
  `keyStep`/`ordStep`/`pjStep`) — the owner asked for the PJP one everywhere. ◀ always means
  *older* and ▶ *newer*, so a `<select>` whose options are filled newest-first (most of them, they
  use `.reverse()`) must carry **`data-rev="1"`**; one filled oldest-first (quarters) must not, and
  `#keySel` sets the flag per period in `initKeys`. `selStep` never reimplements a handler: it
  moves `selectedIndex` and dispatches `change`, so it is exactly a dropdown pick and **cannot
  touch data**. Prove both with **`node test/browser/datestep.test.cjs`** (72 checks, including a
  byte-for-byte comparison of every stored blob before and after every button on every page).
  The **📥 สถานะออเดอร์ (ซื้อ)** tab group (`renderPsi`/`parsePSI`) answers the other half of the
  question: *what did we order from Unilever, and when did it reach our warehouse?* The owner asked
  for it on 27 Nov 26 — *"หมวด สถานะออเดอร์ (ซื้อ) โดยวางไว้ตรงกลางของ การสั่งของ และ สต็อค ส่วนตัวเดิม
  ที่ชื่อซ้ำ ให้ปรับเป็น สถานะออเดอร์ (ขาย) … จับรหัสสินค้าที่สั่งได้หัก drop ออกไป แล้ว match ให้เข้ากับ
  สถานะของไฟล์นี้"* — so the group sits between 🛒 การสั่งของ and 📦 สต็อก, and the older group was
  renamed **(ขาย)**. **The page keys (`CURTAB`) did not change**: the new one is `psib`, the old one
  is still `otrk`; renaming a key would break every remembered tab and history entry.
  It reads one file, **`PSI_ddmmyyyy.xlsx`** (sheet `Export`, 31 columns), and every claim below was
  measured on the owner's real file before anything was written (194 rows, 28 invoices, 137 codes):
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
  The page is **strictly read-only** over PSI/ORDERS/POSTATUS with its state on the non-synced
  `PSIV`, and has two sub-tabs: **📥 ของเข้าคลัง** (per receiving day — products, cases, value,
  invoice numbers, banded by the order form's own categories) and **🔎 สั่งไป → ได้ของหรือยัง**,
  which is the reconciliation the owner asked for: per code, ศูนย์สั่ง → หัก Drop → **ควรได้** →
  เข้าคลังแล้ว → วันที่เข้า. `ควรได้` is the quantity the Drop file says was actually shipped
  (`dropD`, falling back to ordered − dropped), never a guess. **Four statuses, and the fourth is
  the one that matters**: ✅ เข้าครบ · 🟡 เข้าบางส่วน · 🕓 ยังไม่เข้า · ⛔ โดน Drop ทั้งหมด, plus
  **⏳ ยังไม่ได้อัพไฟล์ PSI ที่ครอบวันนี้** — "no file yet" and "not arrived" are different facts and
  must never share a cell, or a day nobody has uploaded reads as the centre failing to ship.
  **The receive date is appended to the existing order-status badge** (`psiPill` inside
  `reqStatusCell`), so every page that shows a product's order status — the manager's combined
  request table, the rep's own request page, ขอแล้วสั่งไม่ได้ — gains it at once. It is a **separate
  pill, never merged into the Drop badge**: the Drop file is the centre's answer, PSI is our
  warehouse's, and they are different steps. With no PSI file covering that round the pill is
  **silent**, never "ยังไม่เข้า". Prove it with
  **`node test/browser/psi.test.cjs`** (45 checks, self-contained with made-up codes; 47 with the
  real file via `PSI_FILE=/path/PSI_ddmmyyyy.xlsx`, which never enters the repo) plus the `PSI`
  cases in `merge-safety`.
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
  number or a whole column pasted from Excel (`otFind` — it accepts `BDD01…`, `BDD09…` or a bare
  tail, walks months newest→oldest until every number is found, and **names the ones it could not
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
  **`node test/browser/ordtrk.test.cjs`** (99 checks, self-contained with made-up codes; 105 with the
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
  with **`node test/browser/cstock.test.cjs`** (239 checks; it must load the page over a real origin,
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
  🎯 ตัวกระจาย runs **① ✍️ ซุปจด → ② 📲 เซลล์คีย์ → ③ 🔎 แอดมินตรวจ → ④ 🚚 คลังส่งออก**, while
  🧾 ตัดบิลรอส่ง and 🚚 ส่งแล้วรอตัดบิล are **two steps only — ① เซลล์คีย์ → ② คลังส่งออก**
  (owner, 26 Nov 26: *"หลังจากเซลล์คีย์ออเดอร์มา แค่ให้แอดมินมากรอกส่วนของคลัง ว่าสินค้าออกไปกับ
  เลข GIN ไหน สองขั้นตอนเท่านั้นเอง แอดมินไม่ต้องมาเช็คเหมือนร้านที่กระจายเยอะ ๆ"*), so the whole
  🔎 แอดมินตรวจ comparison belongs to D alone and A/B get a small **เลข GIN box inside คลังส่งออก**
  (`spGinNote`/`spGinNoteHtml`) that writes the same `CSTOCK.gin[sid|date]` record with empty `rows`
  — no new section, and it needs no allocation file. **📊 รายงาน** is appended for the
  manager. The step numbers are therefore computed from what is actually shown, never written into
  a label. A slip with no ซุปจด step must also **drop the เป้า / ยังขาด / ผล columns** (`spHasTgt`),
  or the rep's page reads as if someone forgot to set a target. The tab row is drawn into
  **`#spTabs`, the first element of the view** — the same `.tabs2` row the other groups' sub-tabs
  use, so it sits under the main tab bar instead of inside a panel halfway down the page
  (*"เอากรอบในนั้นขยับขึ้นมาอยู่ด้านบนให้เห็นชัดชัด"*). `spOpenSlip` lands on the first tab that slip
  really has, never a hard-coded `"key"`. **🧾 เลขออเดอร์ is retired** (*"มันซ้ำกับหมวดคลังส่งออกแล้ว"*)
  the same way a retired upload slot is: `off:1` keeps it out of the row while `spSec` still opens it
  and `spOldHtml`/`CSTOCK.sub`/`subdel` keep working, so putting the line back restores it with its
  history. Everyone may *open* every tab; who may *write* is checked inside each function. Only the
  first three are per-day, so `spDayPick` is hidden on the others (`SP_DAYTABS`).
  **For 🎯 ตัวกระจาย, ④ คลังส่งออก is a report read out of the allocation file, not a form**
  (`spAllOut`/`spOutAllocHtml`, owner 26 Nov 26: *"ให้ใช้ไฟล์ที่แอดมิน up เข้าไป … ระบบขึ้นรายงาน
  ได้เลยว่าคลังส่งออกไปแล้วทั้งหมดกี่ลัง … ไม่ต้องรอซุปจดหรือเซลล์คีย์ เพราะเป้าหมายของออเดอร์แบบนี้
  คือการ match ข้อมูลออเดอร์ที่เซลล์คีย์ กับคลังจัดของให้ตรงกัน"*). It reads the **stored** checks
  (`CSTOCK.gin[sid|date].rows`), not the file held in memory, so it reads back without re-uploading;
  it needs no target and no keyed figure; it converts ลัง/แพ็ค/ชิ้น through `alPcs` and **reports the
  rows it cannot convert instead of guessing 1**; and it is **strictly read-only** over CSTOCK. ใบ A/B
  keep the manual สต็อคกลาง clearing exactly as before, and a D slip's lots are untouched — they are
  still on 🧊 สต็อคกลาง. **`spSent(sid)` is the one answer to "how many cases have left the
  warehouse"** (allocation for D, lot clearings for A/B); the month card, the tab and the manager
  report all call it, or a card shows 0% while the tab inside shows 27%.
  **🚚 Each admin-check day opens with a per-line summary** (`spCmpLines`/`spLineSumHtml`/`spLnCs`,
  owner 27 Nov 26: *"ช่วยทำสรุปจำนวน แยกเป็นแต่ละสายให้แอดมินตรวจสอบ สามารถกดเลือกดูได้ว่า ทั้งหมดของ
  วันนี้ เป็นของสายนั้น ๆ กี่ลัง สินค้าอะไรบ้าง และเป็นกี่ลังกี่ชิ้น"*). One card per line — สาย ·
  รวมกี่ลัง · ขาย/แถม · NIV — and tapping it both **expands that line's products** (cases + pieces
  per code, with what the rep keyed beside it) and **filters the detail table below to that line**,
  with a banner saying so; tapping again returns to all lines. The state is `SP.cmpLn` on the
  non-synced `SP`, and the whole thing is computed at render time — it stores nothing.
  **Cases are summed in pieces and split back at the end** (`alPcs`/`alSplit`), never by adding
  case counts, because every code has a different case size and the allocation file mixes
  ลัง/แพ็ค/ชิ้น in one row; a row that cannot be converted is **counted and named on the card**,
  never guessed at 1. The card header is a CSS grid, so สาย / จำนวนลัง / เงิน line up down the
  column and can be compared at a glance; on a phone it folds to two rows and the product list
  folds to cards rather than scrolling sideways.
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
  the single-upload-button rule, because `ALLOC` is never stored in the state.
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
  when `ALLOC` is gone, naming the file and saying the saved checks are still there. A re-upload is
  asked for **only to check a new day**, and the message says that. `alc` is a field on `CSTOCK`,
  which `api/save.js` rebuilds from an explicit list, so it needed `pickNewerAlc` there (newer `up`
  wins; a tab that has never heard of the field can never blank it) and three cases in
  `merge-safety`.
  **④ คลังส่งออก is the สต็อคกลาง flow, not a copy of it.** Nothing was migrated and nothing needs
  to be: the lots already live in `CSTOCK.lots` keyed to the slip by `sl`, so `spOutHtml` just calls
  the same `cstListHtml`/`cstSelBarHtml` filtered to this slip and force-opens the block. 🧊 สต็อคกลาง
  is untouched and the two pages can never disagree. Never fork the clearing code.
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
  *"ยกเว้นในส่วนของคลังส่งออก ออเดอร์สร้างจาก KA อาจจะคีย์เข้า CT เป็นตัวกระจายได้"* — and that page
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
  rule does not apply. Prove it with the self-contained cases in
  **`node test/browser/spord.test.cjs`** (274 checks) and, against the owner's real screenshots,
  **`SP_OCRSHOT=/path/a.jpg,/path/b.jpg SP_OCRSHOT_NO='1033993299,…' node test/browser/ocr-promo.test.cjs`**
  (36 checks, 40 with the images — which never enter the repo).
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
  what went out matches what the reps keyed. Measured on the owner's real
  `Order_Allocation_ReportHistorical.xlsx` (10,428 rows, 15–24 Nov 26) before any of it was written:
  columns are found by **header text**, never position, and a renamed header **throws and stores
  nothing**; the line is the last two digits of **`PJP Code` (E) and `PJP Name` (F), which agree on
  all 10,428 rows**, and runs 11–17/19/22/97/99 — not just 11–22, so it goes through
  `dsLineKey`/`FOCUS_MAP` and is never hard-coded to a range; **one GIN is NOT one line (103/145),
  not one day (117/145), not one shop (71/145)**, so the check fans a GIN out per line and **says
  which dates that GIN actually covers** instead of assuming the day selected; and the file carries
  **both** `Sale/Free Order` (R–W) and `Sale/Free Allocated` (X–AC), which **differ on 603 sale and
  37 free rows** — the owner named R–W, so that is the figure compared, and the Allocated column is
  shown underneath when it disagrees rather than silently picked.
  **The allocation file is never stored** (`ALLOC` is in memory, not synced); only the **result** the
  admin saves goes into the state, aggregated and **restricted to the codes in that slip** (the
  `pmCodeSet` rule), so a 10,428-row file cannot bloat the snapshot. The page says this out loud.
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
  **③ The day's check exports** to Excel (`spRepXlsx`, สรุป + รายการ sheets) or PDF through the
  browser's own print (`spRepPrint` into `#prArea`). Both read `spCmp`, so the document and the
  screen can never disagree, and the filename stays ASCII (`fnAscii` — Chromium drops a Thai
  `a.download` name *and* its extension).
  **How long from picking to billing** (the owner asked, 26 Nov 26): matching Order Number across
  the two files, **46.7% of orders are invoiced the same day, 43.3% the next day, 9.2% two days
  later and 0.9% beyond — mean 0.65 days, median 1**. Saturday is the exception: Sunday has no
  invoicing, so 111 of 229 Saturday orders land +2 days. So a check run the morning after the
  picking day already covers ~90% of it, and the remaining tail needs the day after that.
  Prove it with **`node test/browser/spord.test.cjs`** (274 checks) plus the `key`/`gin` cases in
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
  with **`node test/browser/spord.test.cjs`** (274 checks) plus the special-order cases in
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
  (its 229 checks still pass).
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
- **`PSI`** (in the main snapshot, no endpoint of its own) — goods received from the centre, read
  from `PSI_ddmmyyyy.xlsx` by `parsePSI`. Uploaded from the one upload button under the category
  **📥 สถานะออเดอร์ (ซื้อ)**. See the 📥 section above for the measured rules.
- `api/ordtrk.js` — the 📋 order-tracking index, fed by **two** files (the warehouse's allocation
  report and the reps' Transaction Inquiry): manager/admin upload, **everyone** reads.
  Its own blob prefix (`bd-ordtrk-`), **sharded by month**, never a read or a write of `bd-data-*`
  — see the 📋 section above for why. GET with no month lists the months from the blob NAMES
  (one listing, no download); `?m=YYYY-MM` returns that month; `det` (the per-order product
  breakdown) comes back only for `?full=1`. A write MERGES per order; which side wins is decided
  by `u`, **the last day the FILE covers**, never the upload clock.
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

**BD moved to the dcode system in Nov 26 (`DCODE_START`, recorded at the owner's request so no
report claims a shop "did not buy" in a period that has no dcode data), so three files now have two
formats each** and both readers must keep working (`STOCKD.src` / the daily log line say which was read). Each new reader
is picked by a header the old file does not have, finds every column by **header text** (never a
fixed index), and **throws without storing anything** if a header it needs is gone — see the
สต็อก section above for `parseStockDcode`, and below for `parseDailyDcode`.
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
