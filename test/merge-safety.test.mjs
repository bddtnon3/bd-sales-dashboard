/* Data-safety test: proves old data survives mergeState after the PSTORE change.
   Loads the REAL mergeState/mergeRequests source out of api/save.js (imports and the
   HTTP handler stripped) so we test the shipped code, not a copy. */
import { readFileSync } from "fs";
import { newestReal, looksEmpty } from "../lib/snapshot.js";

const HERE = new URL(".", import.meta.url);
const src = readFileSync(new URL("../api/save.js", HERE), "utf8");
const cut = src.indexOf("export default async function handler");
if (cut < 0) throw new Error("handler not found — save.js shape changed");
const body = src
  .slice(0, cut)
  .split("\n")
  .filter((l) => !/^\s*import\s/.test(l))
  .join("\n");
const mergeState = new Function(body + "\nreturn mergeState;")();

/* Deep compare that ignores object key ORDER (mergeState rebuilds objects, so key
   order legitimately differs while the data is identical). */
const canon = (o) => JSON.stringify(o, (k, v) =>
  (v && typeof v === "object" && !Array.isArray(v))
    ? Object.keys(v).sort().reduce((a, x) => ((a[x] = v[x]), a), {})
    : v);
const same = (a, b) => canon(a) === canon(b);

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ FAIL: " + name + (extra ? " → " + extra : "")); }
}

/* A realistic "server already has lots of history" state, including a PS round. */
const server = {
  DATA: {
    lines: { "209611": { display: "CT11" }, "209613": { display: "CT13" } },
    monthly: { "2026-06": { x: 1 }, "2026-07": { x: 2 } },
    daily: { "2026-07-28": { a: 1 }, "2026-07-29": { a: 2 } },
    focus_order: ["209611", "209613"],
  },
  STORE: { months: ["2026-06", "2026-07"], stores: [1, 2, 3] },
  KPI: { months: ["2026-06", "2026-07"], lines: { "209611": "CT11" }, data: { "2026-06": { z: 1 }, "2026-07": { z: 2 } }, workdays: 26 },
  ORDERS: { dates: ["2026-07-28", "2026-07-29"], data: { "2026-07-28": { r: 1 } }, names: { p1: "n1" }, cat: { c: 1 }, catN: { c: 2 } },
  STOCKD: { date: "2026-07-29", rows: [1, 2, 3], names: { s: "x" }, up: 5 },
  REQUESTS: { data: { "2026-07-29": { "209613": { items: { p: 1 }, at: 1000 } } } },
  MASTER: { items: { m1: "a", m2: "b" } },
  ANALYTICS: { months: ["2026-06"], lines: { CT11: {} }, data: { CT11: { g: 1 } } },
  STOREPROD: { months: ["2026-06"], cat: { c1: {} }, stores: { s1: {} }, data: { CT11: {} } },
  STOREDAILY: { data: { "2026-07-28": { st: 1 } } },
  PSTORE: { rounds: { "2026-06-30": { asof: "2026-06-30", bm: 6, rows: [["CT_HPC_211", "1", "r", "N", 1, "G", "", "", 1, 0, "", 0.01]] } } },
};

console.log("TEST 1 — old browser tab with NO PSTORE key saves (worst case for the new field)");
{
  const client = JSON.parse(JSON.stringify(server));
  delete client.PSTORE;                       // old tab predates the feature
  client.DATA.daily["2026-07-30"] = { a: 3 }; // it uploads today's sales
  const out = mergeState(server, client);
  check("PS round from June survives", !!out.PSTORE.rounds["2026-06-30"]);
  check("PS row data intact", same(out.PSTORE.rounds["2026-06-30"].rows, server.PSTORE.rounds["2026-06-30"].rows));
  check("new sales day added", !!out.DATA.daily["2026-07-30"]);
  check("old sales days kept", !!out.DATA.daily["2026-07-28"] && !!out.DATA.daily["2026-07-29"]);
}

console.log("TEST 2 — uploading a NEW PS round must not erase the old round");
{
  const client = JSON.parse(JSON.stringify(server));
  client.PSTORE.rounds["2026-07-30"] = { asof: "2026-07-30", bm: 7, rows: [["CT_HPC_213", "2", "r2", "F", 0, "R", "G", "G", 0, 5, "Drive IQ", 0.02]] };
  const out = mergeState(server, client);
  check("both rounds present", Object.keys(out.PSTORE.rounds).sort().join(",") === "2026-06-30,2026-07-30",
        Object.keys(out.PSTORE.rounds).join(","));
  check("June round untouched", out.PSTORE.rounds["2026-06-30"].bm === 6);
  check("July round stored", out.PSTORE.rounds["2026-07-30"].bm === 7);
}

console.log("TEST 3 — a PS upload must not touch ANY other section");
{
  const client = JSON.parse(JSON.stringify(server));
  client.PSTORE.rounds["2026-07-30"] = { asof: "2026-07-30", bm: 7, rows: [[1]] };
  const out = mergeState(server, client);
  const sections = ["DATA", "STORE", "KPI", "ORDERS", "STOCKD", "REQUESTS", "MASTER", "ANALYTICS", "STOREPROD", "STOREDAILY"];
  sections.forEach((k) => {
    check(k + " unchanged", same(out[k], server[k]),
          "got " + JSON.stringify(out[k]).slice(0, 120));
  });
}

console.log("TEST 4 — manager save must not clobber a salesperson's newer request");
{
  const client = JSON.parse(JSON.stringify(server));
  client.REQUESTS = { data: {} };  // manager's tab loaded before the sales request existed
  const serverWithNewReq = JSON.parse(JSON.stringify(server));
  serverWithNewReq.REQUESTS.data["2026-07-30"] = { "209611": { items: { q: 9 }, at: 5000 } };
  const out = mergeState(serverWithNewReq, client);
  check("newer sales request survives manager save", !!out.REQUESTS.data["2026-07-30"]);
  check("older request also survives", !!out.REQUESTS.data["2026-07-29"]);
}

console.log("TEST 5 — completely empty client (crashed/blank tab) cannot erase anything");
{
  const out = mergeState(server, { DATA: {} });
  check("PS rounds survive", !!out.PSTORE.rounds["2026-06-30"]);
  check("sales months survive", Object.keys(out.DATA.monthly).length === 2);
  check("sales days survive", Object.keys(out.DATA.daily).length === 2);
  check("KPI months survive", out.KPI.months.length === 2);
  check("orders survive", out.ORDERS.dates.length === 2);
  check("stock rows survive", out.STOCKD.rows.length === 3);
  check("master items survive", Object.keys(out.MASTER.items).length === 2);
  check("store months survive", out.STORE.months.length === 2);
  check("focus_order survives", out.DATA.focus_order.length === 2);
}

console.log("TEST 6 — first-ever save on a fresh blob store (server = null) must not crash");
{
  const client = { DATA: { lines: {}, monthly: {}, daily: {}, focus_order: [] }, PSTORE: { rounds: { "2026-07-30": { rows: [[1]] } } } };
  const out = mergeState(null, client);
  check("PS round stored on empty server", !!out.PSTORE.rounds["2026-07-30"]);
  check("no crash / shape valid", !!out.DATA && !!out.REQUESTS && !!out.STOCKD);
}

console.log("TEST 7 — deleting a wrongly-uploaded PS round must actually stick");
{
  const srv = JSON.parse(JSON.stringify(server));
  srv.PSTORE.rounds["2026-08-07"] = { asof: "2026-08-07", up: 1000, rows: [["bad"]] };   // the wrong file
  const client = JSON.parse(JSON.stringify(srv));
  delete client.PSTORE.rounds["2026-08-07"];
  client.PSTORE.del = { "2026-08-07": 2000 };                                            // manager pressed delete
  const out = mergeState(srv, client);
  check("bad round removed", !out.PSTORE.rounds["2026-08-07"]);
  check("good round untouched", !!out.PSTORE.rounds["2026-06-30"]);
  check("tombstone kept", out.PSTORE.del["2026-08-07"] === 2000);

  // a stale tab that still holds the deleted round saves afterwards
  const stale = JSON.parse(JSON.stringify(srv));   // no del map, still has the bad round
  const out2 = mergeState(out, stale);
  check("stale tab cannot resurrect it", !out2.PSTORE.rounds["2026-08-07"]);
  check("stale tab keeps every other section", !!out2.PSTORE.rounds["2026-06-30"] && Object.keys(out2.DATA.monthly).length === 2);

  // re-uploading the same date later must win over the tombstone
  const re = JSON.parse(JSON.stringify(out));
  re.PSTORE.rounds["2026-08-07"] = { asof: "2026-08-07", up: 9000, rows: [["good"]] };
  delete re.PSTORE.del["2026-08-07"];
  const out3 = mergeState(out, re);
  check("re-upload after delete is kept", !!out3.PSTORE.rounds["2026-08-07"]);
  check("re-uploaded rows are the new ones", JSON.stringify(out3.PSTORE.rounds["2026-08-07"].rows) === JSON.stringify([["good"]]));
  check("tombstone cleared after re-upload", !out3.PSTORE.del["2026-08-07"]);
}

console.log("TEST 8 — eB2B contest table survives stale clients and never rolls backwards");
{
  const srv = JSON.parse(JSON.stringify(server));
  srv.EB2B = { asof: "2026-09-12", up: 5000, lines: { "209611": "CT11" }, data: { "209611": { n: 23, stores: [] } } };

  const oldTab = JSON.parse(JSON.stringify(srv));
  delete oldTab.EB2B;                                   // browser from before the feature
  const out = mergeState(srv, oldTab);
  check("contest survives a tab that has no EB2B at all", out.EB2B.data["209611"].n === 23);

  const blank = JSON.parse(JSON.stringify(srv));
  blank.EB2B = { asof: null, up: 0, lines: {}, data: {} };   // client that failed to load
  check("blank client cannot wipe the contest", mergeState(srv, blank).EB2B.data["209611"].n === 23);

  const older = JSON.parse(JSON.stringify(srv));
  older.EB2B = { asof: "2026-08-10", up: 9999, lines: {}, data: { "209611": { n: 2, stores: [] } } };
  check("an older report cannot roll the count back", mergeState(srv, older).EB2B.data["209611"].n === 23);

  const newer = JSON.parse(JSON.stringify(srv));
  newer.EB2B = { asof: "2026-09-20", up: 6000, lines: {}, data: { "209611": { n: 27, stores: [] } } };
  check("a newer report is taken", mergeState(srv, newer).EB2B.data["209611"].n === 27);

  const cleared = JSON.parse(JSON.stringify(srv));
  cleared.EB2B = { asof: null, up: 9000, cleared: 9000, lines: {}, data: {} };
  const outC = mergeState(srv, cleared);
  check("an explicit clear by the manager goes through", !Object.keys(outC.EB2B.data).length);
  check("clearing the contest touches nothing else", Object.keys(outC.DATA.monthly).length === 2 && !!outC.PSTORE.rounds["2026-06-30"]);
}

console.log("TEST 9 — order-form product status accumulates by PO date and never loses a day");
{
  const srv = JSON.parse(JSON.stringify(server));
  srv.POSTATUS = { dates: ["2026-07-01", "2026-07-02"], data: {
    "2026-07-01": { up: 1, file: "BD_010726.xlsx", items: { "111": { s: 1 } } },
    "2026-07-02": { up: 2, file: "BD_020726.xlsx", items: { "222": { p: "12F1", b: 12, f: 1 } } },
  } };

  const oldTab = JSON.parse(JSON.stringify(srv));
  delete oldTab.POSTATUS;                                  // browser from before the feature
  const o1 = mergeState(srv, oldTab);
  check("both PO days survive a tab with no POSTATUS", Object.keys(o1.POSTATUS.data).length === 2);
  check("dates stay in step with data", o1.POSTATUS.dates.join(",") === "2026-07-01,2026-07-02");

  const blank = JSON.parse(JSON.stringify(srv));
  blank.POSTATUS = { dates: [], data: {} };                 // client that failed to load
  check("blank client cannot wipe PO status", Object.keys(mergeState(srv, blank).POSTATUS.data).length === 2);

  const newDay = JSON.parse(JSON.stringify(srv));
  newDay.POSTATUS.data["2026-08-21"] = { up: 3, file: "BD_210826.xlsx", items: { "333": { q: 8 } } };
  const o2 = mergeState(srv, newDay);
  check("a new PO day is added alongside the old ones", Object.keys(o2.POSTATUS.data).length === 3);
  check("the July days are untouched", o2.POSTATUS.data["2026-07-01"].items["111"].s === 1);

  const redo = JSON.parse(JSON.stringify(srv));            // re-uploading one day refreshes only it
  redo.POSTATUS.data["2026-07-02"] = { up: 9, file: "BD_020726 (add1).xlsx", items: { "222": { p: "8F1", b: 8, f: 1 } } };
  const o3 = mergeState(srv, redo);
  check("re-upload refreshes that day", o3.POSTATUS.data["2026-07-02"].items["222"].b === 8);
  check("re-upload leaves the other day alone", o3.POSTATUS.data["2026-07-01"].items["111"].s === 1);
  check("PO status does not disturb any other section",
        Object.keys(o3.DATA.monthly).length === 2 && !!o3.PSTORE.rounds["2026-06-30"] && o3.ORDERS.dates.length === 2);
}

console.log("TEST 10 — the PO round's full code list survives every merge path");
{
  const srv = JSON.parse(JSON.stringify(server));
  srv.POSTATUS = { dates: ["2026-08-20", "2026-08-21"], data: {
    "2026-08-20": { up: 1, file: "old.xlsx", items: { "111": { s: 1 } } },              // stored before "all" existed
    "2026-08-21": { up: 2, file: "BD_210826.xlsx", items: { "222": { x: "00FFFF" } }, all: "111,222,333" },
  } };

  const oldTab = JSON.parse(JSON.stringify(srv));
  delete oldTab.POSTATUS;
  const o1 = mergeState(srv, oldTab);
  check("code list survives a tab with no POSTATUS", o1.POSTATUS.data["2026-08-21"].all === "111,222,333");
  check("the pre-'all' day is left exactly as it was", o1.POSTATUS.data["2026-08-20"].all === undefined);

  const blank = JSON.parse(JSON.stringify(srv));
  blank.POSTATUS = { dates: [], data: {} };
  check("blank client cannot wipe the code list", mergeState(srv, blank).POSTATUS.data["2026-08-21"].all === "111,222,333");

  const reup = JSON.parse(JSON.stringify(srv));   // re-upload one day with a different offering
  reup.POSTATUS.data["2026-08-21"] = { up: 9, file: "BD_210826 (add1).xlsx", items: { "333": { s: 1 } }, all: "333,444" };
  const o2 = mergeState(srv, reup);
  check("re-upload replaces that day's code list", o2.POSTATUS.data["2026-08-21"].all === "333,444");
  check("re-upload leaves the other day alone", o2.POSTATUS.data["2026-08-20"].items["111"].s === 1);
  check("re-upload disturbs no other section",
        Object.keys(o2.DATA.monthly).length === 2 && !!o2.PSTORE.rounds["2026-06-30"] && o2.ORDERS.dates.length === 2);
}

console.log("TEST 11 — a sales request can NEVER republish the bundled seed (lib/snapshot.js)");
{
  /* The read path shared by api/data.js, api/save.js and api/request.js. api/request.js
     used to read only the newest blob and, on any non-OK fetch, fall back to the bundled
     seed — then WRITE that seed back as the newest snapshot, rolling the whole app back to
     July and evicting the good backups after 8 more requests. */
  const live = {
    DATA: { lines: {}, monthly: { "2026-08": {} }, daily: { "2026-08-21": {} }, focus_order: [] },
    ORDERS: { dates: ["2026-08-21"], data: {}, names: {} },
    POSTATUS: { dates: ["2026-08-21"], data: { "2026-08-21": { all: "111,222" } } },
    PSTORE: { rounds: { "2026-07-30": {} } },
    REQUESTS: { data: { "2026-08-20": { "209611": { items: { p: 1 }, at: 1 } } } },
  };
  const seedish = { DATA: { lines: {}, monthly: { "2026-07": {} }, daily: {}, focus_order: [] }, ORDERS: { dates: ["2026-07-11"], data: {}, names: {} } };
  const blobs = [
    { url: "new", uploadedAt: "2026-08-22T02:00:00Z" },
    { url: "old", uploadedAt: "2026-08-21T02:00:00Z" },
  ];
  const listFn = async () => ({ blobs: blobs.slice() });
  const mkFetch = (map) => async (url) => {
    const v = map[url];
    if (!v) return { ok: false, json: async () => { throw new Error("no"); } };
    return { ok: true, json: async () => JSON.parse(JSON.stringify(v)) };
  };

  // the newest blob 503s (the exact CDN hiccup that used to publish the seed)
  const r1 = await newestReal(listFn, mkFetch({ old: live }));
  check("a broken newest blob falls through to the older REAL snapshot", !!r1.data && !!r1.data.POSTATUS);
  check("it does NOT report a first-run (which would write the seed)", !r1.first);
  check("the older snapshot still carries the PO colour data", r1.data.POSTATUS.data["2026-08-21"].all === "111,222");
  check("and another line's request", !!r1.data.REQUESTS.data["2026-08-20"]);

  // NOTHING readable at all -> must refuse to write, not fall back to the seed
  const r2 = await newestReal(listFn, mkFetch({}));
  check("nothing readable → fail (caller must 503, never write)", r2.fail === true && !r2.data);
  check("fail is not mistaken for a first run", !r2.first);

  // an empty snapshot must never shadow a good older one
  const r3 = await newestReal(listFn, mkFetch({ new: { DATA: { lines: {}, monthly: {}, daily: {} } }, old: live }));
  check("an empty newest snapshot is skipped for the real one", !!r3.data && !!r3.data.POSTATUS);

  // genuinely first-ever run
  const r4 = await newestReal(async () => ({ blobs: [] }), mkFetch({}));
  check("a truly empty store reports first-run", r4.first === true && !r4.data);

  // looksEmpty must recognise every section as "real data"
  check("looksEmpty: blank state is empty", looksEmpty({ DATA: { monthly: {}, daily: {} } }) === true);
  check("looksEmpty: PO status alone counts as real data", looksEmpty({ DATA: {}, POSTATUS: { data: { "2026-08-21": {} } } }) === false);
  check("looksEmpty: PS round alone counts as real data", looksEmpty({ DATA: {}, PSTORE: { rounds: { "2026-07-30": {} } } }) === false);
  check("looksEmpty: eB2B alone counts as real data", looksEmpty({ DATA: {}, EB2B: { data: { "209611": {} } } }) === false);
  check("looksEmpty: the bundled seed is NOT empty (so it must never be written back)", looksEmpty(seedish) === false);
}

console.log("TEST 12 — manager notes on shop applications (LEADS) never roll back or vanish");
{
  const srv = JSON.parse(JSON.stringify(server));
  srv.LEADS = { meta: {
    L1: { st: "open", line: "209611", store: "1234567", at: 1000 },
    L2: { st: "contact", at: 900 },
  }, del: { L9: 500 } };

  const oldTab = JSON.parse(JSON.stringify(srv));
  delete oldTab.LEADS;                                   // browser from before the feature
  const o1 = mergeState(srv, oldTab);
  check("notes survive a tab with no LEADS at all", o1.LEADS.meta.L1.store === "1234567");
  check("the hidden-application tombstone survives too", o1.LEADS.del.L9 === 500);

  const blank = JSON.parse(JSON.stringify(srv));
  blank.LEADS = { meta: {}, del: {} };                   // client that failed to load
  check("blank client cannot wipe the notes", Object.keys(mergeState(srv, blank).LEADS.meta).length === 2);

  const stale = JSON.parse(JSON.stringify(srv));         // tab that still holds the OLD status
  stale.LEADS.meta.L1 = { st: "new", at: 400 };
  check("a stale tab cannot roll a status backwards", mergeState(srv, stale).LEADS.meta.L1.st === "open");

  const fresh = JSON.parse(JSON.stringify(srv));         // manager updates one, adds one
  fresh.LEADS.meta.L1 = { st: "drop", at: 2000 };
  fresh.LEADS.meta.L3 = { st: "new", at: 2100 };
  const o2 = mergeState(srv, fresh);
  check("a newer edit wins", o2.LEADS.meta.L1.st === "drop");
  check("a new application's note is added", !!o2.LEADS.meta.L3);
  check("the untouched one is kept", o2.LEADS.meta.L2.st === "contact");
  check("touching LEADS disturbs no other section",
        Object.keys(o2.DATA.monthly).length === 2 && !!o2.PSTORE.rounds["2026-06-30"] && o2.ORDERS.dates.length === 2);

  const first = mergeState(null, { DATA: { lines: {}, monthly: {}, daily: {} } });
  check("fresh blob store gets a valid LEADS shape", !!first.LEADS && !!first.LEADS.meta && !!first.LEADS.del && !!first.LEADS.sales);
}

console.log("TEST 13 — the salesperson's progress and the manager's notes never overwrite each other");
{
  const srv = JSON.parse(JSON.stringify(server));
  srv.LEADS = {
    meta:  { L1: { st: "contact", line: "209613", at: 1000 } },
    sales: { L1: { st: "contacted", note: "โทรแล้ว", at: 1100, line: "209613" } },
    del: {},
  };

  // the manager saves from a tab that has never seen the salesperson's report
  const mgr = JSON.parse(JSON.stringify(srv));
  delete mgr.LEADS.sales;
  mgr.LEADS.meta.L1 = { st: "open", line: "209613", store: "1234567", at: 2000 };
  const o1 = mergeState(srv, mgr);
  check("manager's newer note is taken", o1.LEADS.meta.L1.store === "1234567");
  check("the salesperson's report survives a manager save", o1.LEADS.sales.L1.st === "contacted");

  // the salesperson reports again from a tab holding an older manager note
  const sale = JSON.parse(JSON.stringify(o1));
  sale.LEADS.meta.L1 = { st: "contact", line: "209613", at: 1000 };   // stale half
  sale.LEADS.sales.L1 = { st: "opened", store: "1234567", at: 3000, line: "209613" };
  const o2 = mergeState(o1, sale);
  check("newer sales progress is taken", o2.LEADS.sales.L1.st === "opened");
  check("a stale tab cannot roll the manager's note back", o2.LEADS.meta.L1.store === "1234567");

  // an old browser that predates the feature entirely
  const oldTab = JSON.parse(JSON.stringify(o2));
  delete oldTab.LEADS;
  const o3 = mergeState(o2, oldTab);
  check("both halves survive a tab with no LEADS at all",
        o3.LEADS.sales.L1.st === "opened" && o3.LEADS.meta.L1.store === "1234567");
  check("touching LEADS still disturbs no other section",
        Object.keys(o3.DATA.monthly).length === 2 && !!o3.PSTORE.rounds["2026-06-30"] && o3.ORDERS.dates.length === 2);
}

console.log("\n" + (fail === 0 ? "ALL PASS (" + pass + " checks) — ข้อมูลเก่าไม่หาย" : fail + " FAILED of " + (pass + fail)));
process.exit(fail === 0 ? 0 : 1);
