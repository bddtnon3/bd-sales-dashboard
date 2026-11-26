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
  KPI: { months: ["2026-06", "2026-07"], lines: { "209611": "CT11" }, data: { "2026-06": { z: 1 }, "2026-07": { z: 2 } }, meta: { "2026-07": { up: 500, file: "KPI 310726.xlsx", src: "month" } }, del: {}, workdays: 26 },
  ORDERS: { dates: ["2026-07-28", "2026-07-29"], data: { "2026-07-28": { r: 1 } }, names: { p1: "n1" }, cat: { c: 1 }, catN: { c: 2 } },
  STOCKD: { date: "2026-07-29", rows: [1, 2, 3], names: { s: "x" }, up: 5 },
  REQUESTS: { data: { "2026-07-29": { "209613": { items: { p: 1 }, at: 1000 } } } },
  MASTER: { items: { m1: "a", m2: "b" } },
  ANALYTICS: { months: ["2026-06"], lines: { CT11: {} }, data: { CT11: { g: 1 } } },
  STOREPROD: { months: ["2026-06"], cat: { c1: {} }, stores: { s1: {} }, data: { CT11: {} } },
  STOREDAILY: { data: { "2026-07-28": { st: 1 } }, ord: {} },   // ord = ดัชนีเลขออเดอร์ (ออเดอร์พิเศษ)
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

console.log("TEST 14 — the depot's DCI Score periods are never dropped");
{
  const srv = JSON.parse(JSON.stringify(server));
  srv.DCI = {
    up: 1000, file: "dci-q1.xlsm",
    periods: ["BM1", "BM2", "BM3", "Q1"],
    data: { BM1: { tot: 104.4 }, BM2: { tot: 107.2 }, BM3: { tot: 108.9 }, Q1: { tot: 106.8 } },
  };

  // an old browser tab that predates the DCI feature saves something else entirely
  const oldTab = JSON.parse(JSON.stringify(srv));
  delete oldTab.DCI;
  const o1 = mergeState(srv, oldTab);
  check("a tab with no DCI at all cannot erase it", o1.DCI.periods.length === 4 && o1.DCI.data.Q1.tot === 106.8);

  // the manager uploads a newer file that only carries Q2's months
  const up = JSON.parse(JSON.stringify(o1));
  up.DCI = {
    up: 2000, file: "dci-q2.xlsm",
    periods: ["BM4", "BM5", "BM6", "Q2"],
    data: { BM4: { tot: 100.9 }, BM5: { tot: 97.3 }, BM6: { tot: 101.2 }, Q2: { tot: 99.8 } },
  };
  const o2 = mergeState(o1, up);
  check("the new periods are added", o2.DCI.data.BM5.tot === 97.3);
  check("Q1's periods survive an upload that only had Q2", o2.DCI.data.BM1.tot === 104.4 && o2.DCI.data.Q1.tot === 106.8);
  check("periods come back in calendar order",
        o2.DCI.periods.join(",") === "BM1,BM2,BM3,Q1,BM4,BM5,BM6,Q2");
  check("the newest file name/stamp wins", o2.DCI.up === 2000 && o2.DCI.file === "dci-q2.xlsm");

  // a stale tab (loaded before the Q2 upload) saves an unrelated section
  const stale = JSON.parse(JSON.stringify(o1));
  stale.DATA.daily["2026-08-01"] = { a: 9 };
  const o3 = mergeState(o2, stale);
  check("a stale tab cannot roll DCI back to the Q1-only file",
        o3.DCI.data.BM5.tot === 97.3 && o3.DCI.periods.length === 8);

  // re-uploading the same period refreshes it rather than duplicating it
  const re = JSON.parse(JSON.stringify(o3));
  re.DCI = { up: 3000, file: "dci-fix.xlsm", periods: ["BM5"], data: { BM5: { tot: 98.1 } } };
  const o4 = mergeState(o3, re);
  check("re-uploading one period refreshes just that one", o4.DCI.data.BM5.tot === 98.1 && o4.DCI.periods.length === 8);
  check("adding DCI still disturbs no other section",
        Object.keys(o4.DATA.monthly).length === 2 && !!o4.PSTORE.rounds["2026-06-30"] &&
        o4.ORDERS.dates.length === 2 && Object.keys(o4.DATA.daily).length === 3);

  // a fresh blob store: first ever save carries DCI and nothing is lost
  const first = mergeState(null, { DATA: server.DATA, DCI: srv.DCI });
  check("first save into an empty store keeps DCI", first.DCI.data.BM3.tot === 108.9);
  check("looksEmpty: DCI alone does NOT count as real data (a DCI-only save is still refused)",
        looksEmpty({ DATA: {}, DCI: srv.DCI }) === true);
}

console.log("TEST 15 — minimum stock typed in a few codes at a time never rolls back");
{
  const srv = JSON.parse(JSON.stringify(server));
  srv.MINSTOCK = { man: {
    "64829056": { v: 20, at: 1000, by: "ผู้จัดการ" },
    "64939086": { v: 5, at: 1000, by: "ผู้จัดการ" },
  } };

  // a tab from before the feature existed saves something else
  const oldTab = JSON.parse(JSON.stringify(srv));
  delete oldTab.MINSTOCK;
  const o1 = mergeState(srv, oldTab);
  check("a tab with no MINSTOCK at all cannot erase it",
        o1.MINSTOCK.man["64829056"].v === 20 && Object.keys(o1.MINSTOCK.man).length === 2);

  // the manager types two more codes from a second browser
  const b2 = JSON.parse(JSON.stringify(o1));
  b2.MINSTOCK.man["65446209"] = { v: 12, at: 2000, by: "ผู้จัดการ" };
  b2.MINSTOCK.man["64826009"] = { v: 0, at: 2000, by: "ผู้จัดการ" };
  const o2 = mergeState(o1, b2);
  check("codes added later are kept alongside the earlier ones", Object.keys(o2.MINSTOCK.man).length === 4);
  check("v:0 survives — it means 'never auto-order', not 'unset'", o2.MINSTOCK.man["64826009"].v === 0);

  // THE case keyMerge would get wrong: a stale tab still holding the old number
  const stale = JSON.parse(JSON.stringify(o1));                 // loaded before the noon edits
  stale.MINSTOCK.man["64829056"] = { v: 20, at: 1000, by: "ผู้จัดการ" };
  const noon = JSON.parse(JSON.stringify(o2));
  noon.MINSTOCK.man["64829056"] = { v: 9, at: 3000, by: "ผู้จัดการ" };
  const o3 = mergeState(o2, noon);
  check("the noon edit is taken", o3.MINSTOCK.man["64829056"].v === 9);
  const o4 = mergeState(o3, stale);
  check("a stale tab CANNOT roll a minimum back to its old value", o4.MINSTOCK.man["64829056"].v === 9);
  check("...and the stale tab's other codes are untouched", o4.MINSTOCK.man["65446209"].v === 12);

  // clearing a value must be a tombstone: deleting the key is undone by the union
  const del = JSON.parse(JSON.stringify(o4));
  delete del.MINSTOCK.man["64939086"];
  const o5 = mergeState(o4, del);
  check("deleting the key does NOT clear it (this is why we need a tombstone)",
        o5.MINSTOCK.man["64939086"].v === 5);
  const tomb = JSON.parse(JSON.stringify(o4));
  tomb.MINSTOCK.man["64939086"] = { v: null, at: 4000, by: "ผู้จัดการ" };
  const o6 = mergeState(o4, tomb);
  check("a {v:null} tombstone DOES clear it", o6.MINSTOCK.man["64939086"].v === null);
  check("...and the tombstone itself survives a later stale save",
        mergeState(o6, o4).MINSTOCK.man["64939086"].v === null);

  // first save into an empty store, and no cross-section damage
  const first = mergeState(null, { DATA: server.DATA, MINSTOCK: srv.MINSTOCK });
  check("first save into an empty store keeps MINSTOCK", first.MINSTOCK.man["64829056"].v === 20);
  check("touching MINSTOCK disturbs no other section",
        Object.keys(o6.DATA.monthly).length === 2 && !!o6.PSTORE.rounds["2026-06-30"] &&
        o6.ORDERS.dates.length === 2 && Object.keys(o6.REQUESTS.data).length >= 1);
  check("looksEmpty: MINSTOCK alone does NOT count as real data (same call as DCI)",
        looksEmpty({ DATA: {}, MINSTOCK: srv.MINSTOCK }) === true);
}

console.log("TEST 16 — KPI rounds keyed by date (weekly uploads) never overwrite each other");
{
  // Before: the KPI file was keyed by month, so two uploads in the same month collided.
  // Now the round is keyed by the file's "as of" date, and KPI.meta says where that date
  // came from. Old month keys must keep working side by side with the new date keys.
  const srv = JSON.parse(JSON.stringify(server));

  // week 1 of September arrives (as-of 08/09)
  const w1 = JSON.parse(JSON.stringify(srv));
  w1.KPI.data["2026-09-08"] = { z: 8 };
  w1.KPI.months.push("2026-09-08");
  w1.KPI.meta = { "2026-09-08": { up: 1000, file: "KPI 080926.xlsx", src: "asof" } };
  const k1 = mergeState(srv, w1);
  check("the old month-keyed rounds are still there", !!k1.KPI.data["2026-06"] && !!k1.KPI.data["2026-07"]);
  check("the new date-keyed round is added", k1.KPI.data["2026-09-08"].z === 8);
  check("KPI.meta is carried through mergeState (it used to be dropped)",
        !!k1.KPI.meta && k1.KPI.meta["2026-09-08"].src === "asof");

  // week 2 of the SAME month — this is the bug that date keys fix
  const w2 = JSON.parse(JSON.stringify(k1));
  w2.KPI.data["2026-09-15"] = { z: 15 };
  w2.KPI.months.push("2026-09-15");
  w2.KPI.meta["2026-09-15"] = { up: 2000, file: "KPI 150926.xlsx", src: "asof" };
  const k2 = mergeState(k1, w2);
  check("week 2 does NOT overwrite week 1 of the same month",
        k2.KPI.data["2026-09-08"].z === 8 && k2.KPI.data["2026-09-15"].z === 15);
  check("both rounds keep their own provenance",
        k2.KPI.meta["2026-09-08"].file === "KPI 080926.xlsx" && k2.KPI.meta["2026-09-15"].file === "KPI 150926.xlsx");
  check("months lists month keys and date keys together, sorted",
        k2.KPI.months.join(",") === "2026-06,2026-07,2026-09-08,2026-09-15");

  // an old browser tab from before this change: no meta at all, month keys only
  const oldTab = JSON.parse(JSON.stringify(k2));
  delete oldTab.KPI.meta;
  const k3 = mergeState(k2, oldTab);
  check("a tab with no KPI.meta cannot erase it", Object.keys(k3.KPI.meta).length === 3);
  check("...and the legacy month-keyed round keeps its own meta", k3.KPI.meta["2026-07"].src === "month");
  check("...and it cannot erase the date-keyed rounds either",
        !!k3.KPI.data["2026-09-08"] && !!k3.KPI.data["2026-09-15"]);

  // a tab that never saw September still keeps September
  const older = JSON.parse(JSON.stringify(server));
  const k4 = mergeState(k3, older);
  check("a tab that predates every September round keeps them all",
        Object.keys(k4.KPI.data).length === 4 && k4.KPI.meta["2026-09-15"].up === 2000);

  // first save into an empty store, and no cross-section damage
  const first = mergeState(null, { DATA: server.DATA, KPI: k2.KPI });
  check("first save into an empty store keeps KPI.meta", first.KPI.meta["2026-09-08"].src === "asof");
  check("touching KPI disturbs no other section",
        Object.keys(k4.DATA.monthly).length === 2 && !!k4.PSTORE.rounds["2026-06-30"] &&
        k4.ORDERS.dates.length === 2 && Object.keys(k4.REQUESTS.data).length >= 1);
}

console.log("TEST 17 — deleting a KPI round whose date was read wrong needs a tombstone");
{
  // The manager uploaded a file whose header said "as of W4 Sep'26"; it was filed as
  // 2026-09-04. Removing it client-side is not enough — the server unions the keys, so a stale
  // tab would resurrect it. KPI.del is applied after the union, exactly like PSTORE.del.
  const srv = JSON.parse(JSON.stringify(server));
  srv.KPI.data["2026-09-04"] = { z: 4 };
  srv.KPI.data["2026-09-23"] = { z: 23 };
  srv.KPI.months.push("2026-09-04", "2026-09-23");
  srv.KPI.meta["2026-09-04"] = { up: 1000, file: "Incentive SEP.xlsx", src: "as of ในหัวรายงาน" };
  srv.KPI.meta["2026-09-23"] = { up: 2000, file: "Incentive (as of 23 Sep'26).xlsx", src: "as of ในชื่อไฟล์" };

  // just deleting the key does nothing — this is why the tombstone exists
  const plain = JSON.parse(JSON.stringify(srv));
  delete plain.KPI.data["2026-09-04"]; delete plain.KPI.meta["2026-09-04"];
  plain.KPI.months = plain.KPI.months.filter((m) => m !== "2026-09-04");
  check("deleting the key alone does NOT remove the round", !!mergeState(srv, plain).KPI.data["2026-09-04"]);

  // the real delete: tombstone
  const del = JSON.parse(JSON.stringify(plain));
  del.KPI.del = { "2026-09-04": 3000 };
  const d1 = mergeState(srv, del);
  check("a tombstone DOES remove the round", !d1.KPI.data["2026-09-04"] && !d1.KPI.meta["2026-09-04"]);
  check("...and drops it from months too, so the picker cannot offer it",
        d1.KPI.months.indexOf("2026-09-04") < 0, d1.KPI.months.join(","));
  check("...while the good round is untouched", d1.KPI.data["2026-09-23"].z === 23);
  check("...and the legacy month keys are untouched", !!d1.KPI.data["2026-06"] && !!d1.KPI.data["2026-07"]);

  // a stale tab that still holds the deleted round must not bring it back
  const stale = JSON.parse(JSON.stringify(srv));
  const d2 = mergeState(d1, stale);
  check("a stale tab CANNOT resurrect a deleted round", !d2.KPI.data["2026-09-04"]);
  check("...and the tombstone itself survives", d2.KPI.del["2026-09-04"] === 3000);

  // re-uploading the same round after the delete wins (newer meta.up beats the tombstone)
  const re = JSON.parse(JSON.stringify(d2));
  re.KPI.data["2026-09-04"] = { z: 44 };
  re.KPI.months.push("2026-09-04");
  re.KPI.meta["2026-09-04"] = { up: 4000, file: "Incentive fixed.xlsx", src: "as of ในชื่อไฟล์" };
  delete re.KPI.del["2026-09-04"];
  const d3 = mergeState(d2, re);
  check("re-uploading that round after the delete brings it back", d3.KPI.data["2026-09-04"].z === 44);
  check("...and clears the tombstone, so it stops being deleted every save", !d3.KPI.del["2026-09-04"]);

  // a tab from before the feature (no KPI.del at all) cannot erase the tombstones
  const oldTab = JSON.parse(JSON.stringify(d2));
  delete oldTab.KPI.del;
  check("a tab with no KPI.del cannot erase it", mergeState(d2, oldTab).KPI.del["2026-09-04"] === 3000);

  // no cross-section damage
  check("deleting a KPI round disturbs no other section",
        Object.keys(d2.DATA.monthly).length === 2 && !!d2.PSTORE.rounds["2026-06-30"] &&
        d2.ORDERS.dates.length === 2 && Object.keys(d2.REQUESTS.data).length >= 1);
}

console.log("TEST 18 — the shared planner: manager and every salesperson write at once");
{
  const srv = JSON.parse(JSON.stringify(server));
  srv.PLAN = { items: {
    pA: { t: "ส่ง PO รอบ 15", d: "2026-10-15", cat: "deadline", lines: [], by: "manager", byName: "ผู้จัดการ", at: 1000, up: 1000 },
    pB: { t: "เก็บเงินร้านค้าง", d: "2026-10-08", cat: "task", lines: ["209611"], by: "209611", byName: "CT11", at: 1000, up: 1000 },
  }, done: {}, del: {} };

  // a tab from before the planner existed saves something else
  const oldTab = JSON.parse(JSON.stringify(srv));
  delete oldTab.PLAN;
  const o1 = mergeState(srv, oldTab);
  check("a tab with no PLAN at all cannot erase the planner",
        !!o1.PLAN.items.pA && !!o1.PLAN.items.pB, Object.keys(o1.PLAN.items).join(","));

  // CT12 adds a task of their own while the manager's tab still holds the old two
  const ct12 = JSON.parse(JSON.stringify(o1));
  ct12.PLAN.items.pC = { t: "นับสต็อกสิ้นเดือน", d: "2026-10-31", cat: "task", lines: ["209612"], by: "209612", byName: "CT12", at: 2000, up: 2000 };
  const o2 = mergeState(o1, ct12);
  check("a salesperson's new task is added alongside the others", Object.keys(o2.PLAN.items).length === 3);
  const mgrStale = JSON.parse(JSON.stringify(o1));           // manager tab opened before pC existed
  const o3 = mergeState(o2, mgrStale);
  check("a manager save from a stale tab cannot erase a salesperson's task", !!o3.PLAN.items.pC);
  check("...and the manager's own tasks are still there", !!o3.PLAN.items.pA && !!o3.PLAN.items.pB);

  // THE case keyMerge would get wrong: a stale tab still holding the old wording
  const noon = JSON.parse(JSON.stringify(o3));
  noon.PLAN.items.pA = { ...noon.PLAN.items.pA, t: "ส่ง PO รอบ 15 (เลื่อนเป็น 16)", d: "2026-10-16", up: 3000 };
  const o4 = mergeState(o3, noon);
  check("the noon edit is taken", o4.PLAN.items.pA.d === "2026-10-16");
  const o5 = mergeState(o4, JSON.parse(JSON.stringify(o3)));  // the morning tab saves again
  check("a stale tab CANNOT roll an edited task back", o5.PLAN.items.pA.d === "2026-10-16",
        o5.PLAN.items.pA.d);

  // ticking a repeating task is per occurrence date, and un-ticking needs {v:0}
  const tick = JSON.parse(JSON.stringify(o5));
  tick.PLAN.done["pA|2026-10-16"] = { v: 1, by: "CT11", at: 4000 };
  tick.PLAN.done["pA|2026-11-16"] = { v: 1, by: "CT11", at: 4000 };
  const o6 = mergeState(o5, tick);
  check("each occurrence of a repeating task is ticked on its own",
        o6.PLAN.done["pA|2026-10-16"].v === 1 && o6.PLAN.done["pA|2026-11-16"].v === 1);
  const untickByDelete = JSON.parse(JSON.stringify(o6));
  delete untickByDelete.PLAN.done["pA|2026-10-16"];
  check("deleting the done key does NOT untick (this is why we need {v:0})",
        mergeState(o6, untickByDelete).PLAN.done["pA|2026-10-16"].v === 1);
  const untick = JSON.parse(JSON.stringify(o6));
  untick.PLAN.done["pA|2026-10-16"] = { v: 0, by: "CT11", at: 5000 };
  const o7 = mergeState(o6, untick);
  check("a {v:0} tombstone DOES untick it", o7.PLAN.done["pA|2026-10-16"].v === 0);
  check("...and a stale tab cannot re-tick it", mergeState(o7, o6).PLAN.done["pA|2026-10-16"].v === 0);

  // deleting a task needs a tombstone, and a re-save beats it
  const plain = JSON.parse(JSON.stringify(o7));
  delete plain.PLAN.items.pC;
  check("deleting the key alone does NOT remove a task", !!mergeState(o7, plain).PLAN.items.pC);
  const tomb = JSON.parse(JSON.stringify(plain));
  tomb.PLAN.del = { pC: 6000 };
  const o8 = mergeState(o7, tomb);
  check("a tombstone DOES remove it", !o8.PLAN.items.pC);
  check("...and a stale tab cannot bring it back", !mergeState(o8, o7).PLAN.items.pC);
  check("...while every other task survives", Object.keys(o8.PLAN.items).sort().join(",") === "pA,pB");
  const back = JSON.parse(JSON.stringify(o8));
  back.PLAN.items.pC = { t: "นับสต็อกสิ้นเดือน", d: "2026-10-31", cat: "task", lines: [], by: "209612", byName: "CT12", at: 2000, up: 7000 };
  delete back.PLAN.del.pC;
  const o9 = mergeState(o8, back);
  check("re-adding that task later wins over the tombstone", !!o9.PLAN.items.pC);
  check("...and clears the tombstone so it stops being deleted every save", !o9.PLAN.del.pC);

  // first save into an empty store, and no cross-section damage
  const first = mergeState(null, { DATA: server.DATA, PLAN: srv.PLAN });
  check("first save into an empty store keeps the planner", !!first.PLAN.items.pA);
  check("the planner disturbs no other section",
        Object.keys(o9.DATA.monthly).length === 2 && !!o9.PSTORE.rounds["2026-06-30"] &&
        o9.ORDERS.dates.length === 2 && Object.keys(o9.REQUESTS.data).length >= 1 &&
        Object.keys(o9.KPI.data).length === 2);
  check("looksEmpty: a planner-only save does NOT count as real data (same as DCI/MINSTOCK)",
        looksEmpty({ DATA: {}, PLAN: srv.PLAN }) === true);
}

console.log("TEST 20 — PJP: the monthly visit plan, the outlet book and the visit ticks");
{
  const srv = JSON.parse(JSON.stringify(server));
  srv.PJP = {
    out: { "2493638": { n: "ธงฟ้าสารภี", la: 13.9, lo: 100.48, up: 1000 },
           "4887526": { n: "Washmax", la: 13.93, lo: 100.48, up: 1000 } },
    plan: { "2026-09-14": { "209611": "2493638:1,4887526:2" },
            "2026-10-05": { "209611": "2493638:1,4887526:2", "209612": "2491545:1" } },
    done: { "2493638|2026-09-14": { v: 1, by: "ชลศิต", at: 1000 } },
    cfg: { gmap: "AIza-OLD", up: 1000, planMon: "2026-10" },
  };

  // a tab that predates the whole feature
  const oldTab = JSON.parse(JSON.stringify(srv));
  delete oldTab.PJP;
  const p1 = mergeState(srv, oldTab);
  check("a tab with no PJP at all cannot erase the visit plan",
        Object.keys(p1.PJP.plan).length === 2 && Object.keys(p1.PJP.out).length === 2);
  check("...and the visit ticks survive it too", !!p1.PJP.done["2493638|2026-09-14"]);

  // uploading NEXT month must not touch this month
  const nov = JSON.parse(JSON.stringify(srv));
  nov.PJP.plan = { "2026-11-02": { "209611": "2493638:1" } };
  const p2 = mergeState(srv, nov);
  check("uploading November keeps September and October",
        !!p2.PJP.plan["2026-09-14"] && !!p2.PJP.plan["2026-10-05"] && !!p2.PJP.plan["2026-11-02"],
        Object.keys(p2.PJP.plan).join(","));

  // re-uploading the SAME month replaces that day whole (routes come as one unit)
  const reup = JSON.parse(JSON.stringify(p2));
  reup.PJP.plan["2026-10-05"] = { "209611": "2493638:1,9999999:2" };
  const p3 = mergeState(p2, reup);
  check("re-uploading a day replaces that day's routes", p3.PJP.plan["2026-10-05"]["209611"] === "2493638:1,9999999:2");
  check("...and leaves every other day alone", !!p3.PJP.plan["2026-09-14"] && !!p3.PJP.plan["2026-11-02"]);

  // a Master file that no longer lists a shop must NOT delete it
  const master = JSON.parse(JSON.stringify(p3));
  master.PJP.out = { "2493638": { n: "ธงฟ้าสารภี (ชื่อใหม่)", la: 13.9, lo: 100.48, up: 2000 } };
  const p4 = mergeState(p3, master);
  check("a new Master updates a shop it lists", p4.PJP.out["2493638"].n === "ธงฟ้าสารภี (ชื่อใหม่)");
  check("...and does NOT delete a shop it no longer lists", !!p4.PJP.out["4887526"]);
  check("...and a stale tab cannot undo the rename",
        mergeState(p4, p3).PJP.out["2493638"].n === "ธงฟ้าสารภี (ชื่อใหม่)");

  // visit ticks: newest `at` wins, and unticking is a value not a deleted key
  const tick = JSON.parse(JSON.stringify(p4));
  tick.PJP.done["2493638|2026-10-05"] = { v: 1, by: "ชลศิต", at: 3000 };
  const p5 = mergeState(p4, tick);
  check("a salesperson's tick is kept", p5.PJP.done["2493638|2026-10-05"].v === 1);
  const stale = JSON.parse(JSON.stringify(p4));
  check("a stale tab that never saw the tick cannot remove it",
        mergeState(p5, stale).PJP.done["2493638|2026-10-05"].v === 1);
  const untick = JSON.parse(JSON.stringify(p5));
  untick.PJP.done["2493638|2026-10-05"] = { v: 0, by: "ชลศิต", at: 4000 };
  const p6 = mergeState(p5, untick);
  check("unticking later wins", p6.PJP.done["2493638|2026-10-05"].v === 0);
  check("...and the older tick cannot come back", mergeState(p6, p5).PJP.done["2493638|2026-10-05"].v === 0);

  // the Maps key: newest `up` wins, and an old tab cannot blank it
  const key = JSON.parse(JSON.stringify(p6));
  key.PJP.cfg = { gmap: "AIza-NEW", up: 5000, planMon: "2026-11" };
  const p7 = mergeState(p6, key);
  check("the Google Maps key can be changed", p7.PJP.cfg.gmap === "AIza-NEW");
  check("...and a stale tab cannot roll it back", mergeState(p7, p6).PJP.cfg.gmap === "AIza-NEW");

  // the visit NOTE and the things to chase next time live on the same record as
  // the tick (PJP.done[code|date].tx / .f) — adding fields must not drop any
  const note = JSON.parse(JSON.stringify(p7));
  note.PJP.done["4887526|2026-10-05"] =
    { v: 1, by: "ชลศิต", at: 6000, tx: "เจ้าของไม่อยู่ ให้กลับมาต้นเดือน", f: ["sell", "eb"] };
  const p8 = mergeState(p7, note);
  check("a visit note is saved on the visit record",
        p8.PJP.done["4887526|2026-10-05"].tx === "เจ้าของไม่อยู่ ให้กลับมาต้นเดือน");
  check("...together with the things to chase next time",
        (p8.PJP.done["4887526|2026-10-05"].f || []).join(",") === "sell,eb");
  check("...and it does not touch another day's record",
        p8.PJP.done["2493638|2026-09-14"].v === 1 && !p8.PJP.done["2493638|2026-09-14"].tx);

  // ⚠️ a tab opened BEFORE notes existed saves the same key with only {v,by,at}.
  // It is older, so it must not wipe the note the rep just typed.
  const preNote = JSON.parse(JSON.stringify(p7));
  preNote.PJP.done["4887526|2026-10-05"] = { v: 1, by: "ชลศิต", at: 5500 };
  check("an older tab that knows nothing about notes cannot erase one",
        mergeState(p8, preNote).PJP.done["4887526|2026-10-05"].tx === "เจ้าของไม่อยู่ ให้กลับมาต้นเดือน");

  // the next visit clears the chase list: newer record, no f → nothing is left open
  const cleared = JSON.parse(JSON.stringify(p8));
  cleared.PJP.done["4887526|2026-10-19"] = { v: 1, by: "ชลศิต", at: 7000, tx: "ขายเพิ่มได้ 2 ลัง" };
  const p9 = mergeState(p8, cleared);
  check("a later visit with no chase flags is stored as the newer record",
        !!p9.PJP.done["4887526|2026-10-19"] && !p9.PJP.done["4887526|2026-10-19"].f);
  check("...and the older note it supersedes is still on file (history is kept)",
        (p9.PJP.done["4887526|2026-10-05"].f || []).join(",") === "sell,eb");
  check("...and a stale tab cannot resurrect the chase list as the newest word",
        mergeState(p9, p8).PJP.done["4887526|2026-10-19"].tx === "ขายเพิ่มได้ 2 ลัง");

  // erasing today's record is v:0 with the note gone — and it must stick
  const erase = JSON.parse(JSON.stringify(p9));
  erase.PJP.done["4887526|2026-10-05"] = { v: 0, by: "ชลศิต", at: 8000 };
  const p10 = mergeState(p9, erase);
  check("deleting a visit note keeps the key as v:0 rather than dropping it",
        p10.PJP.done["4887526|2026-10-05"].v === 0 && !p10.PJP.done["4887526|2026-10-05"].tx);
  check("...and the older note cannot come back", !mergeState(p10, p9).PJP.done["4887526|2026-10-05"].tx);

  // the "remind me again next round" flag and the explicit clear marker ride on the
  // same record (nx / cl) — new fields must not cost anything that was there before
  const nx = JSON.parse(JSON.stringify(p10));
  nx.PJP.done["2493638|2026-10-20"] =
    { v: 1, by: "ชลศิต", at: 9000, tx: "ขอโปรใหม่", f: ["pay"], nx: 1 };
  const p11 = mergeState(p10, nx);
  check("the remind-next-round flag is saved", p11.PJP.done["2493638|2026-10-20"].nx === 1);
  check("...and a tab that predates the flag cannot strip it",
        mergeState(p11, p10).PJP.done["2493638|2026-10-20"].nx === 1);

  const cl = JSON.parse(JSON.stringify(p11));
  cl.PJP.done["2493638|2026-10-26"] = { v: 1, by: "ชลศิต", at: 10000, cl: 1 };
  const p12 = mergeState(p11, cl);
  check("clearing writes a NEW dated record rather than editing the old one",
        p12.PJP.done["2493638|2026-10-26"].cl === 1 &&
        p12.PJP.done["2493638|2026-10-20"].tx === "ขอโปรใหม่");
  check("...so the history of what was outstanding is still on file",
        Object.keys(p12.PJP.done).filter((k) => k.startsWith("2493638|")).length === 4,
        Object.keys(p12.PJP.done).join(" "));
  check("...and a stale tab cannot un-clear it",
        mergeState(p12, p11).PJP.done["2493638|2026-10-26"].cl === 1);

  // uploading PJP must disturb nothing else
  check("the visit plan disturbs no other section",
        Object.keys(p12.ORDERS.data).length === Object.keys(srv.ORDERS.data).length &&
        Object.keys(p12.REQUESTS.data).length === Object.keys(srv.REQUESTS.data).length &&
        p12.STORE.stores.length === srv.STORE.stores.length);
  check("a new month's plan upload never touches the visit notes",
        Object.keys(p12.PJP.done).length === 6, Object.keys(p12.PJP.done).join(" "));
  check("looksEmpty: a PJP-only save does NOT count as real data (same as PLAN/PROMO)",
        looksEmpty({ DATA: {}, PJP: srv.PJP }) === true);
}

console.log("TEST 19 — monthly promotions and the prize money typed in against them");
{
  const srv = JSON.parse(JSON.stringify(server));
  srv.PROMO = {
    items: {
      pCombo: { m: "2026-10", type: "combo", name: "CT COMBO DRIVE : HPC", tgtPct: 35, by: "manager", at: 1000, up: 1000 },
      pEco: { m: "2026-10", type: "eco", name: "Eco Trophy ต.ค.", tgtPct: 27, by: "manager", at: 1000, up: 1000 },
    },
    res: {
      "pCombo|209611|HC1": { pjp: 129, tgt: 129, act: 40, up: 1000 },
      "pCombo|209612|HC1": { pjp: 89, tgt: 89, act: 50, up: 1000 },
      "pEco|209611|": { pjp: 247, tgt: 87, act: 100, money: 0, up: 1000 },
    },
    del: {},
  };

  // a tab from before the feature saves something else
  const oldTab = JSON.parse(JSON.stringify(srv));
  delete oldTab.PROMO;
  const o1 = mergeState(srv, oldTab);
  check("a tab with no PROMO at all cannot erase the promotions",
        Object.keys(o1.PROMO.items).length === 2 && Object.keys(o1.PROMO.res).length === 3);

  // last month's promotions must survive adding this month's
  const nov = JSON.parse(JSON.stringify(o1));
  nov.PROMO.items.pNov = { m: "2026-11", type: "extra", name: "HC Extra Dist พ.ย.", tgtPct: 25, by: "manager", at: 2000, up: 2000 };
  const o2 = mergeState(o1, nov);
  check("adding next month's promotion keeps the previous month's",
        !!o2.PROMO.items.pCombo && !!o2.PROMO.items.pEco && !!o2.PROMO.items.pNov,
        Object.keys(o2.PROMO.items).join(","));
  check("...and keeps every result row already typed in", Object.keys(o2.PROMO.res).length === 3);

  // pasting one promotion's report must not disturb another's rows
  const paste = JSON.parse(JSON.stringify(o2));
  paste.PROMO.res["pEco|209612|"] = { pjp: 221, tgt: 78, act: 102, up: 3000 };
  paste.PROMO.res["pEco|209613|"] = { pjp: 266, tgt: 94, act: 104, up: 3000 };
  const o3 = mergeState(o2, paste);
  check("pasting one promotion's report only adds its own rows",
        Object.keys(o3.PROMO.res).length === 5 && o3.PROMO.res["pCombo|209611|HC1"].act === 40,
        Object.keys(o3.PROMO.res).join(" "));

  // THE case keyMerge would get wrong: a stale tab holding the pre-correction number
  const fix = JSON.parse(JSON.stringify(o3));
  fix.PROMO.res["pCombo|209611|HC1"] = { pjp: 129, tgt: 129, act: 61, up: 4000 };   // corrected at noon
  const o4 = mergeState(o3, fix);
  check("a corrected result is taken", o4.PROMO.res["pCombo|209611|HC1"].act === 61);
  const o5 = mergeState(o4, JSON.parse(JSON.stringify(o3)));                        // morning tab saves again
  check("a stale tab CANNOT roll a corrected result back", o5.PROMO.res["pCombo|209611|HC1"].act === 61,
        o5.PROMO.res["pCombo|209611|HC1"].act);
  const edit = JSON.parse(JSON.stringify(o5));
  edit.PROMO.items.pCombo = { ...edit.PROMO.items.pCombo, tgtPct: 40, up: 5000 };
  const o6 = mergeState(o5, edit);
  check("an edited promotion is taken", o6.PROMO.items.pCombo.tgtPct === 40);
  check("...and a stale tab cannot undo the edit", mergeState(o6, o5).PROMO.items.pCombo.tgtPct === 40);

  // the screenshot of the report the numbers were typed from (PROMO.items[id].reps)
  const rep = JSON.parse(JSON.stringify(o6));
  rep.PROMO.items.pCombo = { ...rep.PROMO.items.pCombo,
    reps: [{ u: "https://blob/bd-promoimg-1.jpg", line: "HC1", at: 5500, by: "ผู้จัดการ" }], up: 5500 };
  const r1 = mergeState(o6, rep);
  check("the report screenshot attached to a promotion survives a save",
        (r1.PROMO.items.pCombo.reps || []).length === 1, JSON.stringify(r1.PROMO.items.pCombo.reps));
  check("...and attaching it changed no result row",
        r1.PROMO.res["pCombo|209611|HC1"].act === 61 && Object.keys(r1.PROMO.res).length === Object.keys(o6.PROMO.res).length);
  check("...a stale tab that never saw it cannot strip it off",
        (mergeState(r1, o6).PROMO.items.pCombo.reps || []).length === 1);
  const rep2 = JSON.parse(JSON.stringify(r1));
  rep2.PROMO.items.pCombo = { ...rep2.PROMO.items.pCombo,
    reps: rep2.PROMO.items.pCombo.reps.concat([{ u: "https://blob/bd-promoimg-2.jpg", line: "BWPC1", at: 5600 }]), up: 5600 };
  const r2 = mergeState(r1, rep2);
  check("...a second report screenshot is added, the first is kept",
        r2.PROMO.items.pCombo.reps.length === 2 &&
        r2.PROMO.items.pCombo.reps[0].u === "https://blob/bd-promoimg-1.jpg");
  check("...and the slide images (imgs) are a separate list, untouched by reps",
        !r2.PROMO.items.pCombo.imgs || !r2.PROMO.items.pCombo.imgs.length);

  // deleting a promotion: tombstone, and it takes its OWN results with it — nobody else's
  const plain = JSON.parse(JSON.stringify(o6));
  delete plain.PROMO.items.pEco;
  check("deleting the key alone does NOT remove a promotion", !!mergeState(o6, plain).PROMO.items.pEco);
  const tomb = JSON.parse(JSON.stringify(plain));
  tomb.PROMO.del = { pEco: 6000 };
  const o7 = mergeState(o6, tomb);
  check("a tombstone DOES remove it", !o7.PROMO.items.pEco);
  check("...and removes that promotion's result rows too",
        !o7.PROMO.res["pEco|209611|"] && !o7.PROMO.res["pEco|209612|"], Object.keys(o7.PROMO.res).join(" "));
  check("...while every OTHER promotion's results are untouched",
        o7.PROMO.res["pCombo|209611|HC1"].act === 61 && !!o7.PROMO.res["pCombo|209612|HC1"],
        Object.keys(o7.PROMO.res).join(" "));
  check("...and a stale tab cannot bring the deleted promotion back", !mergeState(o7, o6).PROMO.items.pEco);
  const back = JSON.parse(JSON.stringify(o7));
  back.PROMO.items.pEco = { m: "2026-10", type: "eco", name: "Eco Trophy ต.ค. (แก้ใหม่)", tgtPct: 27, by: "manager", at: 1000, up: 7000 };
  delete back.PROMO.del.pEco;
  const o8 = mergeState(o7, back);
  check("re-adding that promotion later wins over the tombstone", !!o8.PROMO.items.pEco);
  check("...and clears the tombstone so it stops being deleted every save", !o8.PROMO.del.pEco);

  // a promotion id that is a prefix of another must not lose its rows to the other's delete
  const pfx = JSON.parse(JSON.stringify(o8));
  pfx.PROMO.items.p = { m: "2026-10", type: "flash", name: "สั้นจนเป็น prefix", by: "manager", at: 1000, up: 1000 };
  pfx.PROMO.res["p|209611|"] = { pjp: 10, tgt: 5, act: 7, up: 1000 };
  pfx.PROMO.res["pCombo|209614|HC1"] = { pjp: 1, tgt: 1, act: 1, up: 1000 };
  const o9 = mergeState(o8, pfx);
  const killP = JSON.parse(JSON.stringify(o9));
  delete killP.PROMO.items.p; killP.PROMO.del = { p: 8000 };
  const o10 = mergeState(o9, killP);
  check("deleting promotion \"p\" does not take \"pCombo\"'s rows with it",
        !o10.PROMO.res["p|209611|"] && !!o10.PROMO.res["pCombo|209611|HC1"] && !!o10.PROMO.res["pCombo|209614|HC1"],
        Object.keys(o10.PROMO.res).join(" "));

  // first save into an empty store, and no cross-section damage
  const first = mergeState(null, { DATA: server.DATA, PROMO: srv.PROMO });
  check("first save into an empty store keeps the promotions", !!first.PROMO.items.pCombo);
  check("promotions disturb no other section",
        Object.keys(o10.DATA.monthly).length === 2 && !!o10.PSTORE.rounds["2026-06-30"] &&
        o10.ORDERS.dates.length === 2 && Object.keys(o10.REQUESTS.data).length >= 1 &&
        Object.keys(o10.KPI.data).length === 2 && !!o10.PLAN);
  check("looksEmpty: a promotions-only save does NOT count as real data (same as DCI/MINSTOCK/PLAN)",
        looksEmpty({ DATA: {}, PROMO: srv.PROMO }) === true);
}

/* ============================================================================
 * 📦 สต็อคกลาง (CSTOCK) — ของที่ตัดบิลไว้ก่อนแล้วยังค้าง
 * แอดมินถือไฟล์ Excel ฉบับเดียว แล้วอัพทับทุกรอบที่มีการเคลียร์ของออกไป
 * สิ่งที่ห้ามเกิด: ไฟล์ที่กรอกไม่ครบ (หรือแท็บเก่า) ลบลอตที่เซิร์ฟเวอร์มีอยู่
 * ==========================================================================*/
{
  const base = JSON.parse(JSON.stringify(server));
  const srv = JSON.parse(JSON.stringify(base));
  srv.CSTOCK = {
    lots: {
      "ST-01": { id: "ST-01", d: "2026-10-22", own: "PT", nm: "คอมฟอร์ท อินโนเซนท์", cs: 10,
                 clr: [{ d: "2026-10-25", who: "คุณกรานรุ้ง", cs: 4 }], up: 1000 },
      "ST-02": { id: "ST-02", d: "2026-10-27", own: "พี่แอ๊ะ", nm: "โอโม ซอฟท์ ทัช", cs: 11,
                 clr: [], up: 1000 },
    },
    del: {}, up: 1000,
  };

  // แท็บเก่าที่ยังไม่รู้จักสต็อคกลางเลย
  const oldTab = JSON.parse(JSON.stringify(base));
  delete oldTab.CSTOCK;
  const c1 = mergeState(srv, oldTab);
  check("แท็บเก่าที่ไม่มี CSTOCK เลย ลบลอตที่เก็บไว้ไม่ได้",
        Object.keys(c1.CSTOCK.lots).length === 2 && c1.CSTOCK.lots["ST-01"].clr.length === 1);

  // ไฟล์รอบใหม่ของแอดมิน: มีแค่ลอตที่เขากำลังตามอยู่ + เพิ่มลอตใหม่
  const round2 = JSON.parse(JSON.stringify(base));
  round2.CSTOCK = { lots: {
    "ST-01": { id: "ST-01", d: "2026-10-22", own: "PT", nm: "คอมฟอร์ท อินโนเซนท์", cs: 10,
               clr: [{ d: "2026-10-25", who: "คุณกรานรุ้ง", cs: 4 },
                     { d: "2026-10-30", who: "ลัดดาวัล", cs: 6 }], up: 2000 },
    "ST-03": { id: "ST-03", d: "2026-10-29", own: "พี่แอ๊ะ", nm: "คนอร์", cs: 4, clr: [], up: 2000 },
  }, del: {}, up: 2000 };
  const c2 = mergeState(c1, round2);
  check("อัพไฟล์รอบใหม่ที่ไม่มี ST-02 อยู่ในไฟล์ → ST-02 ต้องยังอยู่",
        !!c2.CSTOCK.lots["ST-02"] && c2.CSTOCK.lots["ST-02"].cs === 11,
        Object.keys(c2.CSTOCK.lots).join(","));
  check("...ลอตเดิมรับรายการเคลียร์ใหม่ครบ (เคลียร์เพิ่มเป็น 2 ครั้ง)",
        c2.CSTOCK.lots["ST-01"].clr.length === 2 &&
        c2.CSTOCK.lots["ST-01"].clr[1].who === "ลัดดาวัล");
  check("...และลอตใหม่เข้ามาด้วย", !!c2.CSTOCK.lots["ST-03"]);

  // แท็บที่เปิดค้างไว้ก่อนแอดมินบันทึกการเคลียร์ ต้องย้อนยอดคืนไม่ได้
  const stale = JSON.parse(JSON.stringify(base));
  stale.CSTOCK = { lots: {
    "ST-01": { id: "ST-01", d: "2026-10-22", own: "PT", nm: "คอมฟอร์ท อินโนเซนท์", cs: 10,
               clr: [{ d: "2026-10-25", who: "คุณกรานรุ้ง", cs: 4 }], up: 900 },
  }, del: {}, up: 900 };
  const c3 = mergeState(c2, stale);
  check("🛟 แท็บเก่า (up เก่ากว่า) ย้อนรายการเคลียร์ที่บันทึกไปแล้วไม่ได้",
        c3.CSTOCK.lots["ST-01"].clr.length === 2,
        JSON.stringify(c3.CSTOCK.lots["ST-01"].clr.length));

  // ลบลอตที่คีย์ผิด ต้องใช้ tombstone และแท็บเก่าต้องปลุกกลับไม่ได้
  const kill = JSON.parse(JSON.stringify(c3));
  delete kill.CSTOCK.lots["ST-03"];
  kill.CSTOCK.del = { "ST-03": 5000 };
  const c4 = mergeState(c3, kill);
  check("ลบลอตที่คีย์ผิดด้วย tombstone ได้จริง", !c4.CSTOCK.lots["ST-03"]);
  const revive = JSON.parse(JSON.stringify(base));
  revive.CSTOCK = { lots: { "ST-03": { id: "ST-03", nm: "คนอร์", cs: 4, clr: [], up: 2000 } }, del: {}, up: 2000 };
  const c5 = mergeState(c4, revive);
  check("🛟 แท็บเก่าปลุกลอตที่ลบไปแล้วกลับมาไม่ได้", !c5.CSTOCK.lots["ST-03"]);
  const redo = JSON.parse(JSON.stringify(base));
  redo.CSTOCK = { lots: { "ST-03": { id: "ST-03", nm: "คนอร์ (คีย์ใหม่)", cs: 4, clr: [], up: 9000 } }, del: {}, up: 9000 };
  const c6 = mergeState(c5, redo);
  check("...แต่ถ้าแอดมินคีย์ลอตนั้นกลับเข้ามาใหม่ (up ใหม่กว่า tombstone) ต้องได้",
        !!c6.CSTOCK.lots["ST-03"] && c6.CSTOCK.lots["ST-03"].nm === "คนอร์ (คีย์ใหม่)");

  const firstC = mergeState(null, { DATA: server.DATA, CSTOCK: srv.CSTOCK });
  check("บันทึกครั้งแรกในที่เก็บว่าง ลอตไม่หาย", !!firstC.CSTOCK.lots["ST-01"]);

  /* ------------------------------------------------------------------
   * 🧾 ใบตัดบิลที่แอดมินกรอกในเว็บ (slips / sdel) + ไฟล์ร้าน Ex.export (ex)
   * เจ้าของสั่ง 4 พ.ย. 69: เลิกทำผ่าน Excel · "ซับมิทก่อนแล้วมาอัพไฟล์ทีหลังก็ได้"
   * ซึ่งหมายความว่าหัวใบกับไฟล์ร้าน **ถูกบันทึกคนละเวลา คนละแท็บ** ได้
   * ------------------------------------------------------------------ */
  const B1 = "B20261104-01";
  const srvB = JSON.parse(JSON.stringify(base));
  srvB.CSTOCK = {
    lots: {
      [B1 + "-r1"]: { id: B1 + "-r1", sl: B1, sq: 1, d: "2026-11-04", nm: "โอโม ซอฟท์ ทัช",
                      code: "65660382", cs: 8, pc: 0, ln: "CT11", clr: [], up: 1000 },
      [B1 + "-r2"]: { id: B1 + "-r2", sl: B1, sq: 2, d: "2026-11-04", nm: "โอโม ซอฟท์ ทัช",
                      code: "65660382", cs: 8, pc: 0, ln: "CT12", clr: [], up: 1000 },
    },
    del: {},
    slips: { [B1]: { id: B1, d: "2026-11-04", own: "Supervisor", nw: "จัดของแยกไว้", ng: "รอขายเข้าร้าน", up: 1000 } },
    sdel: {},
    ex: { [B1]: { file: "Ex.export.xlsx", d: "2026-11-04", n: 60, val: 2977.2,
                  rows: [{ c: "4862412", n: "ประภัสสร", v: 49.62 }], up: 1200 } },
    up: 1200,
  };
  // แท็บเก่าที่ยังไม่รู้จักใบตัดบิลเลย (รุ่นก่อนฟีเจอร์นี้)
  const preBill = JSON.parse(JSON.stringify(base));
  preBill.CSTOCK = { lots: srvB.CSTOCK.lots, del: {}, up: 1000 };
  const b1 = mergeState(srvB, preBill);
  check("🛟 แท็บรุ่นก่อนมีใบตัดบิล บันทึกทับแล้วใบ+ไฟล์ร้านยังอยู่ครบ",
        !!b1.CSTOCK.slips[B1] && b1.CSTOCK.slips[B1].nw === "จัดของแยกไว้" &&
        !!b1.CSTOCK.ex[B1] && b1.CSTOCK.ex[B1].n === 60,
        JSON.stringify(Object.keys(b1.CSTOCK.slips || {})));

  // ใบใหม่จากอีกวัน ต้องไม่ลบใบเดิม
  const B2 = "B20261105-01";
  const addBill = JSON.parse(JSON.stringify(base));
  addBill.CSTOCK = { lots: {
      [B2 + "-r1"]: { id: B2 + "-r1", sl: B2, sq: 1, d: "2026-11-05", nm: "คนอร์", cs: 4, pc: 48, ln: "CT15", clr: [], up: 3000 },
    }, del: {},
    slips: { [B2]: { id: B2, d: "2026-11-05", own: "CT15", nw: "", ng: "", up: 3000 } },
    sdel: {}, ex: {}, up: 3000 };
  const b2 = mergeState(b1, addBill);
  check("ตัดบิลใบใหม่ → ใบเดิมและแถวเดิมยังอยู่ครบทั้งคู่",
        !!b2.CSTOCK.slips[B1] && !!b2.CSTOCK.slips[B2] &&
        Object.keys(b2.CSTOCK.lots).filter(k => k.startsWith("B")).length === 3,
        Object.keys(b2.CSTOCK.slips).join(","));
  check("...และไฟล์ร้านของใบเดิมไม่ถูกบันทึกใบใหม่ลบทิ้ง", !!b2.CSTOCK.ex[B1]);

  // 🔑 เหตุผลที่ ex ต้องแยก map: แท็บที่ "ซับมิทใบไว้ก่อนอัพไฟล์" บันทึกทับทีหลัง
  const staleBill = JSON.parse(JSON.stringify(base));
  staleBill.CSTOCK = { lots: {}, del: {},
    slips: { [B1]: { id: B1, d: "2026-11-04", own: "Supervisor", nw: "จัดของแยกไว้", ng: "รอขายเข้าร้าน", up: 1000 } },
    sdel: {}, ex: {}, up: 1000 };
  const b3 = mergeState(b2, staleBill);
  check("🛟 แท็บที่ยังไม่มีไฟล์ร้าน บันทึกหัวใบทับ → ไฟล์ร้านที่อัพทีหลังไม่หาย",
        !!b3.CSTOCK.ex[B1] && b3.CSTOCK.ex[B1].n === 60);
  check("🛟 ...และแถวสินค้าของใบนั้นก็ยังอยู่ (แท็บส่ง lots มาว่าง)",
        !!b3.CSTOCK.lots[B1 + "-r1"] && !!b3.CSTOCK.lots[B1 + "-r2"]);
  // ตรงกันข้าม: อัพไฟล์ร้านทีหลัง ต้องไม่ลบ Note ที่แก้ไปแล้ว
  const noteFirst = JSON.parse(JSON.stringify(base));
  noteFirst.CSTOCK = { lots: {}, del: {},
    slips: { [B1]: { id: B1, d: "2026-11-04", own: "Supervisor", nw: "ส่งคลัง 2 รอบ", ng: "ลัดดาวัลย์", up: 5000 } },
    sdel: {}, ex: {}, up: 5000 };
  const b4 = mergeState(b3, noteFirst);
  const exLater = JSON.parse(JSON.stringify(base));
  exLater.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {},
    ex: { [B1]: { file: "Ex.export (2).xlsx", d: "2026-11-04", n: 61, val: 3000, rows: [], up: 6000 } }, up: 6000 };
  const b5 = mergeState(b4, exLater);
  check("🔑 อัพไฟล์ร้านทีหลัง → Note ที่แอดมินพิมพ์ไว้ไม่ถูกทับหาย",
        b5.CSTOCK.slips[B1].nw === "ส่งคลัง 2 รอบ" && b5.CSTOCK.ex[B1].n === 61,
        b5.CSTOCK.slips[B1].nw + " / " + b5.CSTOCK.ex[B1].n);

  // 🔑 หมวดออเดอร์ (g = A ตัดบิลแล้วยังไม่ส่ง / B ส่งแล้วยังไม่ตัดบิล) อยู่บน "ตัวใบเอง"
  //    ไม่ได้เป็น section ใหม่ จึงไป merge รวมกับใบทั้งเรคอร์ด — แท็บเก่าที่เปิดค้างไว้ตั้งแต่
  //    ก่อนมีช่องนี้ บันทึกทับด้วย up ที่เก่ากว่า ต้องไม่ดันใบกลุ่ม B กลับไปเป็นกลุ่ม A
  const grpB = JSON.parse(JSON.stringify(base));
  grpB.CSTOCK = { lots: {}, del: {},
    slips: { [B1]: { id: B1, d: "2026-11-04", own: "Supervisor", g: "B",
                     nw: "ส่งคลัง 2 รอบ", ng: "ลัดดาวัลย์", up: 7000 } },
    sdel: {}, ex: {}, up: 7000 };
  const b5b = mergeState(b5, grpB);
  check("ตั้งใบเป็นกลุ่ม 'ส่งของแล้ว ยังไม่ตัดบิล' ได้", b5b.CSTOCK.slips[B1].g === "B");
  const oldTabNoG = JSON.parse(JSON.stringify(base));
  oldTabNoG.CSTOCK = { lots: {}, del: {},
    slips: { [B1]: { id: B1, d: "2026-11-04", own: "Supervisor",
                     nw: "ส่งคลัง 2 รอบ", ng: "ลัดดาวัลย์", up: 2000 } },
    sdel: {}, ex: {}, up: 2000 };
  const b5c = mergeState(b5b, oldTabNoG);
  check("🛟 แท็บเก่าที่ยังไม่รู้จักช่องหมวด บันทึกทับ → ใบกลุ่ม B ไม่ถูกดันกลับเป็น A",
        b5c.CSTOCK.slips[B1].g === "B", String(b5c.CSTOCK.slips[B1].g));
  check("🛟 ...และไฟล์ร้าน/แถวสินค้าของใบนั้นก็ยังอยู่ครบ",
        !!b5c.CSTOCK.ex[B1] && !!b5c.CSTOCK.lots[B1 + "-r1"] && !!b5c.CSTOCK.lots[B1 + "-r2"]);

  // ลบใบทั้งใบ = tombstone ของใบ + ไฟล์ร้านของใบนั้นต้องไปด้วย
  const killBill = JSON.parse(JSON.stringify(b5c));
  delete killBill.CSTOCK.slips[B2];
  killBill.CSTOCK.sdel = { [B2]: 8000 };
  const b6 = mergeState(b5, killBill);
  check("ลบใบที่คีย์ผิดด้วย tombstone ได้", !b6.CSTOCK.slips[B2] && !!b6.CSTOCK.sdel[B2]);
  const reviveBill = JSON.parse(JSON.stringify(base));
  reviveBill.CSTOCK = { lots: {}, del: {},
    slips: { [B2]: { id: B2, d: "2026-11-05", up: 3000 } }, sdel: {},
    ex: { [B2]: { file: "เก่า.xlsx", n: 9, rows: [], up: 3000 } }, up: 3000 };
  const b7 = mergeState(b6, reviveBill);
  check("🛟 แท็บเก่าปลุกใบที่ลบไปแล้วกลับมาไม่ได้ (ทั้งใบและไฟล์ร้าน)",
        !b7.CSTOCK.slips[B2] && !b7.CSTOCK.ex[B2]);
  const redoBill = JSON.parse(JSON.stringify(base));
  redoBill.CSTOCK = { lots: {}, del: {},
    slips: { [B2]: { id: B2, d: "2026-11-05", nw: "คีย์ใหม่", up: 9000 } }, sdel: {}, ex: {}, up: 9000 };
  const b8 = mergeState(b7, redoBill);
  check("...แต่ถ้าแอดมินคีย์ใบนั้นกลับเข้ามาใหม่ (up ใหม่กว่า tombstone) ต้องได้",
        !!b8.CSTOCK.slips[B2] && b8.CSTOCK.slips[B2].nw === "คีย์ใหม่");
  check("ใบตัดบิลไม่ไปกวนลอตที่มาจากไฟล์ Excel รอบเก่า",
        !!b8.CSTOCK.lots["ST-01"] === false && !!b8.CSTOCK.lots[B1 + "-r1"],
        Object.keys(b8.CSTOCK.lots).join(","));
  /* ------------------------------------------------------------------
   * 🏪 ร้านที่ "คีย์เอง" ในใบตัดบิล (ex[sid].man) — เจ้าของสั่ง 6 พ.ย. 69
   * *"บางออเดอร์เราคีย์เข้าไม่เยอะ แค่ 1 ร้านจะไม่ได้อัพไฟล์ excel"*
   * ex ทั้งก้อนเป็น newest-wins ดังนั้นถ้าไม่ union รายแถว แท็บที่อัพไฟล์ทีหลัง
   * (หรือแท็บรุ่นก่อนที่ไม่รู้จัก man) จะกินร้านที่คีย์มือหายทั้งหมด
   * ------------------------------------------------------------------ */
  const M1 = { id: "m1", m: 1, c: "4862412", n: "ปิโตรเลียมไทย", v: 1200, at: 7000 };
  const M2 = { id: "m2", m: 1, c: "4870011", n: "ซีอาร์ซีไทวัสดุ", v: 980, at: 7100 };
  const manTab = JSON.parse(JSON.stringify(base));
  manTab.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {},
    ex: { [B1]: { d: "2026-11-04", man: [M1], up: 7000 } }, up: 7000 };
  const m1 = mergeState(b8, manTab);
  check("🏪 คีย์ร้านเองใส่ใบที่มีไฟล์อยู่แล้ว → ได้ทั้งแถวจากไฟล์และแถวที่คีย์เอง",
        m1.CSTOCK.ex[B1].man.length === 1 && m1.CSTOCK.ex[B1].man[0].c === "4862412" &&
        m1.CSTOCK.ex[B1].n === 61,
        JSON.stringify(m1.CSTOCK.ex[B1].man));
  // แท็บอื่นอัพไฟล์ Ex.export ทับทีหลัง — ของที่คีย์มือต้องไม่หาย
  const exOver = JSON.parse(JSON.stringify(base));
  exOver.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {},
    ex: { [B1]: { file: "Ex.export (3).xlsx", d: "2026-11-04", n: 70, val: 5000,
                  rows: [{ c: "4862412", n: "ประภัสสร", v: 49.62 }], up: 9000 } }, up: 9000 };
  const m2 = mergeState(m1, exOver);
  check("🛟 แท็บอื่นอัพไฟล์ร้านทับทีหลัง → ร้านที่แอดมินคีย์เองไม่หาย",
        m2.CSTOCK.ex[B1].file === "Ex.export (3).xlsx" &&
        (m2.CSTOCK.ex[B1].man || []).length === 1 && m2.CSTOCK.ex[B1].man[0].id === "m1",
        JSON.stringify((m2.CSTOCK.ex[B1].man || []).map(x => x.id)));
  // สองแท็บคีย์คนละร้านพร้อมกัน — ต้องได้ทั้งคู่ ไม่ใช่ตัวใดตัวหนึ่ง
  const manTab2 = JSON.parse(JSON.stringify(base));
  manTab2.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {},
    ex: { [B1]: { d: "2026-11-04", man: [M2], up: 7100 } }, up: 7100 };
  const m3 = mergeState(m2, manTab2);
  check("🛟 สองแท็บคีย์คนละร้านในใบเดียวกัน → อยู่ครบทั้งสองร้าน",
        (m3.CSTOCK.ex[B1].man || []).length === 2 &&
        m3.CSTOCK.ex[B1].man.map(x => x.id).sort().join(",") === "m1,m2",
        JSON.stringify(m3.CSTOCK.ex[B1].man.map(x => x.c)));
  // เอาร้านออก = ธง x:1 (ไม่ตัดออกจากอาเรย์) แท็บเก่าจึงปลุกกลับมาไม่ได้
  const manDel = JSON.parse(JSON.stringify(base));
  manDel.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {},
    ex: { [B1]: { d: "2026-11-04", man: [Object.assign({}, M1, { x: 1, at: 9500 })], up: 9500 } }, up: 9500 };
  const m4 = mergeState(m3, manDel);
  const live = (m4.CSTOCK.ex[B1].man || []).filter(r => !r.x);
  check("เอาร้านที่คีย์ผิดออกได้ (ธง x:1) และร้านอีกตัวยังอยู่",
        live.length === 1 && live[0].id === "m2",
        JSON.stringify((m4.CSTOCK.ex[B1].man || []).map(x => x.id + (x.x ? "(x)" : ""))));
  const manRevive = JSON.parse(JSON.stringify(base));
  manRevive.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {},
    ex: { [B1]: { d: "2026-11-04", man: [M1, M2], up: 9600 } }, up: 9600 };
  const m5 = mergeState(m4, manRevive);
  check("🛟 แท็บเก่าที่ยังเห็นร้านที่ถูกเอาออก บันทึกทับแล้วมันต้องไม่กลับมา",
        ((m5.CSTOCK.ex[B1].man || []).filter(r => r.id === "m1")[0] || {}).x === 1,
        JSON.stringify((m5.CSTOCK.ex[B1].man || []).map(x => x.id + (x.x ? "(x)" : ""))));
  check("🛟 ลบทั้งใบแล้ว ร้านที่คีย์เองไปด้วย (ไม่เหลือค้างใน ex)",
        !mergeState(m5, (() => { const k = JSON.parse(JSON.stringify(base));
          k.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: { [B1]: 99000 }, ex: {}, up: 99000 };
          return k; })()).CSTOCK.ex[B1]);

  check("looksEmpty: บันทึกที่มีแต่ใบตัดบิล ยังไม่นับว่าเป็นข้อมูลจริง",
        looksEmpty({ DATA: {}, CSTOCK: srvB.CSTOCK }) === true);
  check("สต็อคกลางไม่ไปกวนก้อนอื่น",
        Object.keys(c6.DATA.monthly).length === 2 && !!c6.PSTORE.rounds["2026-06-30"] &&
        c6.ORDERS.dates.length === 2 && !!c6.PLAN && !!c6.PROMO && !!c6.PJP &&
        Object.keys(c6.KPI.data).length === 2);
  check("looksEmpty: บันทึกที่มีแต่สต็อคกลาง ยังไม่นับว่าเป็นข้อมูลจริง (เหมือน PLAN/PROMO)",
        looksEmpty({ DATA: {}, CSTOCK: srv.CSTOCK }) === true);

  /* ------------------------------------------------------------------
   * 📦 ออเดอร์พิเศษ (CSTOCK.sub / subdel) — เจ้าของสั่ง 18 พ.ย. 69
   * ออเดอร์ย่อย 1 ใบ มี 4 ทีมเขียนคนละขั้น คนละเวลา คนละเครื่อง
   *   s3 แอดมินตรวจ · s4 คลังจัดของ · s5 สายส่งส่งของ · s6 แอดมินปิดงาน
   * ถ้า merge แบบ newest-wins ทั้งเรคอร์ด แท็บเซลล์ที่เปิดค้างไว้ตั้งแต่เช้า
   * จะลบการติ๊กของคลัง/สายส่งทิ้งทันทีที่บันทึกอะไรก็ตาม
   * ------------------------------------------------------------------ */
  const SK = B1 + "|BDD0100000006";
  const SK2 = B1 + "|BDD0100000007";
  const subSrv = JSON.parse(JSON.stringify(m5));
  subSrv.CSTOCK.sub = {
    [SK]: { sid: B1, no: "BDD0100000006", ln: "209611", by: "ct11", byName: "CT11 · ชลศิต",
            at: 10000, up: 10400,
            s3: { ok: 1, by: "admin1", byName: "แอดมิน 1", at: 10200, tx: "ตรวจแล้ว" },
            s4: { ok: 1, by: "wh1", byName: "ทีมคลัง 1", at: 10300 },
            s5: { ok: 1, by: "ds1", byName: "ทีมสายส่ง 1", at: 10400 } },
    [SK2]: { sid: B1, no: "BDD0100000007", ln: "209612", by: "ct12", byName: "CT12", at: 10100, up: 10100 },
  };
  subSrv.CSTOCK.subdel = {};

  // แท็บรุ่นก่อนมีฟีเจอร์นี้เลย (ไม่มี sub ในก้อนที่ส่งมา)
  const preSub = JSON.parse(JSON.stringify(base));
  preSub.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, up: 10500 };
  const u1 = mergeState(subSrv, preSub);
  check("🛟 แท็บรุ่นก่อนมีออเดอร์พิเศษ บันทึกทับแล้วออเดอร์ย่อยยังอยู่ครบ",
        Object.keys(u1.CSTOCK.sub || {}).length === 2 && u1.CSTOCK.sub[SK].s5.byName === "ทีมสายส่ง 1",
        JSON.stringify(Object.keys(u1.CSTOCK.sub || {})));

  // 🔑 แท็บเซลล์ที่เปิดค้างไว้ตั้งแต่ก่อนคลัง/สายส่งติ๊ก — บันทึกทับต้องไม่ลบการติ๊ก
  const staleSales = JSON.parse(JSON.stringify(base));
  staleSales.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, subdel: {},
    sub: { [SK]: { sid: B1, no: "BDD0100000006", ln: "209611", by: "ct11", byName: "CT11 · ชลศิต",
                   at: 10000, up: 10600 } },   // up ใหม่กว่า แต่ไม่มี s3/s4/s5 เลย
    up: 10600 };
  const u2 = mergeState(u1, staleSales);
  check("🔑 แท็บเซลล์ที่ไม่เห็นการติ๊กของคลัง/สายส่ง บันทึกทับแล้วการติ๊กต้องไม่หาย",
        !!u2.CSTOCK.sub[SK].s3 && !!u2.CSTOCK.sub[SK].s4 && !!u2.CSTOCK.sub[SK].s5 &&
        u2.CSTOCK.sub[SK].s4.byName === "ทีมคลัง 1",
        JSON.stringify(Object.keys(u2.CSTOCK.sub[SK])));

  // คลังกับสายส่งติ๊กพร้อมกันคนละเครื่อง — ต้องได้ทั้งคู่
  const whTab = JSON.parse(JSON.stringify(base));
  whTab.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, subdel: {},
    sub: { [SK2]: { sid: B1, no: "BDD0100000007", ln: "209612", at: 10100, up: 11000,
                    s4: { ok: 1, by: "wh2", byName: "ทีมคลัง 2", at: 11000 } } }, up: 11000 };
  const dsTab = JSON.parse(JSON.stringify(base));
  dsTab.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, subdel: {},
    sub: { [SK2]: { sid: B1, no: "BDD0100000007", ln: "209612", at: 10100, up: 11010,
                    s5: { ok: 1, by: "ds2", byName: "ทีมสายส่ง 2", at: 11010 } } }, up: 11010 };
  const u3 = mergeState(mergeState(u2, whTab), dsTab);
  check("🔑 คลังกับสายส่งติ๊กคนละเครื่องพร้อมกัน → อยู่ครบทั้งสองขั้น",
        u3.CSTOCK.sub[SK2].s4.byName === "ทีมคลัง 2" && u3.CSTOCK.sub[SK2].s5.byName === "ทีมสายส่ง 2",
        JSON.stringify(u3.CSTOCK.sub[SK2]));

  // ยกเลิกติ๊ก = ok:0 ทับ (ไม่ลบคีย์) แท็บเก่าจึงปลุกกลับมาไม่ได้
  const untick = JSON.parse(JSON.stringify(base));
  untick.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, subdel: {},
    sub: { [SK]: { sid: B1, no: "BDD0100000006", ln: "209611", at: 10000, up: 12000,
                   s4: { ok: 0, by: "wh1", byName: "ทีมคลัง 1", at: 12000 } } }, up: 12000 };
  const u4 = mergeState(u3, untick);
  check("ยกเลิกติ๊กขั้นคลังได้ (ok:0) และขั้นอื่นไม่กระทบ",
        u4.CSTOCK.sub[SK].s4.ok === 0 && u4.CSTOCK.sub[SK].s5.ok === 1);
  const staleTick = JSON.parse(JSON.stringify(base));
  staleTick.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, subdel: {},
    sub: { [SK]: { sid: B1, no: "BDD0100000006", ln: "209611", at: 10000, up: 10300,
                   s4: { ok: 1, by: "wh1", byName: "ทีมคลัง 1", at: 10300 } } }, up: 10300 };
  const u5 = mergeState(u4, staleTick);
  check("🛟 แท็บเก่าที่ยังเห็นติ๊กเดิม บันทึกทับแล้วการยกเลิกต้องไม่ถูกปลุกกลับ",
        u5.CSTOCK.sub[SK].s4.ok === 0, JSON.stringify(u5.CSTOCK.sub[SK].s4));

  // เซลล์กรอกเลขผิดแล้วลบ = tombstone · แท็บเก่าปลุกกลับไม่ได้ แต่กรอกใหม่ได้
  const killSub = JSON.parse(JSON.stringify(base));
  killSub.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, sub: {},
    subdel: { [SK2]: 13000 }, up: 13000 };
  const u6 = mergeState(u5, killSub);
  check("เซลล์ลบเลขที่กรอกผิดได้ (tombstone)", !u6.CSTOCK.sub[SK2] && !!u6.CSTOCK.subdel[SK2]);
  const reviveSub = JSON.parse(JSON.stringify(base));
  reviveSub.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, subdel: {},
    sub: { [SK2]: { sid: B1, no: "BDD0100000007", ln: "209612", at: 10100, up: 10100 } }, up: 10100 };
  check("🛟 แท็บเก่าปลุกเลขที่ลบแล้วกลับมาไม่ได้",
        !mergeState(u6, reviveSub).CSTOCK.sub[SK2]);
  const redoSub = JSON.parse(JSON.stringify(base));
  redoSub.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, subdel: {},
    sub: { [SK2]: { sid: B1, no: "BDD0100000007", ln: "209612", at: 14000, up: 14000 } }, up: 14000 };
  const u7 = mergeState(u6, redoSub);
  check("...แต่กรอกเลขเดิมเข้ามาใหม่ (ใหม่กว่า tombstone) ต้องได้", !!u7.CSTOCK.sub[SK2]);
  check("ออเดอร์พิเศษไม่ไปกวนใบตัดบิล/ลอต/ไฟล์ร้านของเดิม",
        !!u7.CSTOCK.slips[B1] && !!u7.CSTOCK.ex[B1] && !!u7.CSTOCK.lots[B1 + "-r1"]);

  /* ================================================================
   * 📦 ออเดอร์พิเศษ 2 ขั้น (CSTOCK.key / CSTOCK.gin) — เจ้าของสั่ง 25 พ.ย. 69
   *   key["sid|วันที่|สาย"] = จำนวนที่หัวหน้าเซลล์กรอก
   *   gin["sid|วันที่"]      = ผลตรวจของแอดมินจากไฟล์ allocation
   * สองฝั่งนี้ทำงานคนละเวลาคนละเครื่อง ห้ามฝั่งใดลบฝั่งใด
   * ================================================================ */
  const KK = B1 + "|2026-11-20|CT11", GK = B1 + "|2026-11-20";
  const twoSrv = JSON.parse(JSON.stringify(u7));
  twoSrv.CSTOCK.key = { [KK]: { it: { "90000001": { sc: 5, sp: 0, fc: 1, fp: 0 } },
    by: "sup", byName: "หัวหน้าเซลล์", at: 20000 } };
  twoSrv.CSTOCK.gin = { [GK]: { g: ["141"], rows: { "CT11|90000001": { sc: 5, ss: 0, sp: 0, fc: 1, fs: 0, fp: 0 } },
    dd: ["2026-11-20"], by: "admin1", byName: "แอดมิน 1", at: 20100 } };
  /* แท็บรุ่นก่อนหน้า (ไม่รู้จักสองช่องนี้เลย) บันทึกทับ */
  const oldTab2 = JSON.parse(JSON.stringify(base));
  oldTab2.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, sub: {}, subdel: {}, up: 21000 };
  const t1 = mergeState(twoSrv, oldTab2);
  check("🛟 แท็บรุ่นก่อนบันทึกทับ จำนวนที่หัวหน้าเซลล์กรอกยังอยู่",
        !!(t1.CSTOCK.key || {})[KK] && t1.CSTOCK.key[KK].it["90000001"].sc === 5,
        JSON.stringify(t1.CSTOCK.key));
  check("🛟 ...และผลตรวจของแอดมินยังอยู่",
        !!(t1.CSTOCK.gin || {})[GK] && t1.CSTOCK.gin[GK].g[0] === "141");
  /* ฝั่งแอดมินบันทึกผลตรวจ จากแท็บที่ไม่มีของฝั่งเซลล์เลย */
  const admOnly = JSON.parse(JSON.stringify(base));
  admOnly.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, sub: {}, subdel: {}, key: {},
    gin: { [GK]: { g: ["141", "142"], rows: {}, dd: [], by: "admin2", byName: "แอดมิน 2", at: 22000 } },
    up: 22000 };
  const t2 = mergeState(t1, admOnly);
  check("🔑 แอดมินบันทึกผลตรวจ ไม่ลบจำนวนที่ฝั่งเซลล์กรอกไว้",
        !!(t2.CSTOCK.key || {})[KK] && t2.CSTOCK.key[KK].it["90000001"].fc === 1);
  check("...และผลตรวจอันใหม่ชนะของเก่า", (t2.CSTOCK.gin[GK].g || []).length === 2);
  /* ฝั่งเซลล์แก้ตัวเลขจากแท็บที่ไม่มีผลตรวจของแอดมิน */
  const supOnly = JSON.parse(JSON.stringify(base));
  supOnly.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, sub: {}, subdel: {}, gin: {},
    key: { [KK]: { it: { "90000001": { sc: 7, sp: 0, fc: 1, fp: 0 } }, by: "sup", at: 23000 },
           [B1 + "|2026-11-20|CT12"]: { it: { "90000001": { sc: 2, sp: 0, fc: 0, fp: 0 } }, by: "sup", at: 23000 } },
    up: 23000 };
  const t3 = mergeState(t2, supOnly);
  check("🔑 ฝั่งเซลล์แก้ตัวเลข ไม่ลบผลตรวจของแอดมิน",
        !!(t3.CSTOCK.gin || {})[GK] && (t3.CSTOCK.gin[GK].g || []).length === 2);
  check("...และตัวเลขใหม่ชนะ พร้อมสายที่เพิ่งเพิ่มเข้ามา",
        t3.CSTOCK.key[KK].it["90000001"].sc === 7 &&
        !!t3.CSTOCK.key[B1 + "|2026-11-20|CT12"]);
  /* แท็บเก่าที่ถือตัวเลขเดิม (at น้อยกว่า) ต้องย้อนของใหม่ไม่ได้ */
  const staleSup = JSON.parse(JSON.stringify(base));
  staleSup.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, sub: {}, subdel: {}, gin: {},
    key: { [KK]: { it: { "90000001": { sc: 5, sp: 0, fc: 1, fp: 0 } }, by: "sup", at: 20000 } }, up: 24000 };
  const t4 = mergeState(t3, staleSup);
  check("🛟 แท็บเก่าที่ถือตัวเลขเดิม ย้อนของใหม่ไม่ได้", t4.CSTOCK.key[KK].it["90000001"].sc === 7);
  /* 💵 เงินในผลตรวจ (ช่อง GSV/NIV ของไฟล์ใบจัดของ — เพิ่ม 26 พ.ย. 69)
     แท็บรุ่นก่อนไม่รู้จัก money/g/v/mn เลย บันทึกทับแล้วเงินต้องไม่หาย */
  const gmSrv = JSON.parse(JSON.stringify(t4));
  gmSrv.CSTOCK.gin[GK] = { g: ["141", "142"], money: 1,
    rows: { "CT11|90000001": { sc: 5, ss: 0, sp: 0, fc: 1, fs: 0, fp: 0, g: 1500, v: 1100, mn: 1 } },
    dd: ["2026-11-20"], by: "admin1", at: 40000 };
  const gmOldTab = JSON.parse(JSON.stringify(base));
  gmOldTab.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, sub: {}, subdel: {}, up: 41000 };
  const gm1 = mergeState(gmSrv, gmOldTab);
  check("🛟 แท็บรุ่นก่อนบันทึกทับ เงิน GSV/NIV ในผลตรวจยังอยู่",
        gm1.CSTOCK.gin[GK].money === 1 &&
        gm1.CSTOCK.gin[GK].rows["CT11|90000001"].g === 1500 &&
        gm1.CSTOCK.gin[GK].rows["CT11|90000001"].v === 1100,
        JSON.stringify(gm1.CSTOCK.gin[GK]));
  /* 🎁 คู่ของแถมที่ถอดจากไฟล์ใบจัดของ + จำนวนร้าน (เพิ่ม 26 พ.ย. 69)
     เป็นช่องใหม่บนเรคอร์ดผลตรวจ ซึ่ง merge ทั้งเรคอร์ดตาม at — แท็บรุ่นก่อนต้องลบไม่ได้ */
  const gmMech = JSON.parse(JSON.stringify(t4));
  gmMech.CSTOCK.gin[GK] = { g: ["141"], money: 1, at: 50000, by: "admin1",
    rows: { "CT11|90000001": { sc: 5, fc: 1, sh: 40 } },
    mech: { "90000002": { b: "90000001", bq: [0, 0, 2], fq: [0, 0, 2], n: 40, hit: 40 } },
    shop: { "90000001": 40 }, dd: ["2026-11-20"] };
  const gmOld2 = JSON.parse(JSON.stringify(base));
  gmOld2.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, sub: {}, subdel: {}, up: 51000 };
  const gm3 = mergeState(gmMech, gmOld2);
  check("🛟 แท็บรุ่นก่อนบันทึกทับ คู่ของแถม + จำนวนร้าน ในผลตรวจยังอยู่ครบ",
        !!gm3.CSTOCK.gin[GK].mech && gm3.CSTOCK.gin[GK].mech["90000002"].b === "90000001" &&
        gm3.CSTOCK.gin[GK].mech["90000002"].fq.join() === "0,0,2" &&
        gm3.CSTOCK.gin[GK].shop["90000001"] === 40 &&
        gm3.CSTOCK.gin[GK].rows["CT11|90000001"].sh === 40,
        JSON.stringify(gm3.CSTOCK.gin[GK]));
  /* แอดมินอัพไฟล์รุ่นเก่า (ไม่มีช่องเงิน) ทับทีหลัง — อันใหม่ชนะตามปกติ แต่ต้องบอกได้ว่าไม่มีเงิน */
  const gmNo = JSON.parse(JSON.stringify(base));
  gmNo.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, sub: {}, subdel: {}, key: {},
    gin: { [GK]: { g: ["143"], money: 0, rows: { "CT11|90000001": { sc: 5, g: 0, v: 0, mn: 0 } },
      dd: [], by: "admin2", at: 42000 } }, up: 42000 };
  const gm2 = mergeState(gm1, gmNo);
  check("...อัพไฟล์รุ่นเก่าทับ ผลตรวจใหม่ชนะและรู้ตัวว่าไม่มีช่องเงิน",
        gm2.CSTOCK.gin[GK].money === 0 && gm2.CSTOCK.gin[GK].g[0] === "143");
  check("🛟 ...แต่จำนวนที่ฝั่งเซลล์กรอกไว้ยังอยู่ครบ",
        gm2.CSTOCK.key[KK].it["90000001"].sc === 7);
  /* 👤 จำนวนที่เซลล์คีย์จริง (CSTOCK.rep) — เซลล์แก้ได้ครั้งเดียว โควต้าอยู่ใน n ประวัติอยู่ใน h
     ⚠️ ถ้า merge แบบ newest-wins ทั้งเรคอร์ด แท็บเก่าที่ถือ n=1 จะทับของใหม่ที่ n=2
        = เซลล์กลับมาแก้ได้อีก และประวัติหายไปหนึ่งครั้ง */
  const RK = B1 + "|2026-11-20|CT11";
  const repSrv = JSON.parse(JSON.stringify(gm2));
  repSrv.CSTOCK.rep = { [RK]: { it: { "90000001": { sc: 11, sp: 0, fc: 1, fp: 0 } },
    by: "209611", byName: "CT11", at: 52000, n: 2,
    h: [{ at: 51000, by: "209611", it: { "90000001": { sc: 8 } } },
        { at: 52000, by: "209611", it: { "90000001": { sc: 11 } } }] } };
  const staleRep = JSON.parse(JSON.stringify(base));
  staleRep.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, sub: {}, subdel: {}, key: {}, gin: {},
    rep: { [RK]: { it: { "90000001": { sc: 8, sp: 0, fc: 1, fp: 0 } },
      by: "209611", at: 51000, n: 1,
      h: [{ at: 51000, by: "209611", it: { "90000001": { sc: 8 } } }] } }, up: 53000 };
  const r1 = mergeState(repSrv, staleRep);
  check("🔑 แท็บเก่าของเซลล์บันทึกทับ โควต้าแก้ไม่ถูกรีเซ็ต",
        r1.CSTOCK.rep[RK].n === 2, JSON.stringify(r1.CSTOCK.rep[RK].n));
  check("🛟 ...และประวัติการกรอกยังอยู่ครบทั้งสองครั้ง",
        (r1.CSTOCK.rep[RK].h || []).length === 2 &&
        r1.CSTOCK.rep[RK].it["90000001"].sc === 11,
        JSON.stringify(r1.CSTOCK.rep[RK]));
  /* แท็บรุ่นก่อนที่ไม่รู้จัก rep เลย บันทึกทับ — ของเซลล์ต้องไม่หายทั้งก้อน */
  const oldTabR = JSON.parse(JSON.stringify(base));
  oldTabR.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, sub: {}, subdel: {}, up: 54000 };
  const r2 = mergeState(r1, oldTabR);
  check("🛟 แท็บรุ่นก่อนบันทึกทับ จำนวนที่เซลล์คีย์ยังอยู่",
        !!(r2.CSTOCK.rep || {})[RK] && r2.CSTOCK.rep[RK].it["90000001"].sc === 11);
  check("🔑 ...และเป้าของหัวหน้าเซลล์ก็ยังอยู่ (คนละช่อง ไม่ทับกัน)",
        r2.CSTOCK.key[KK].it["90000001"].sc === 7);
  /* เซลล์อีกสายบันทึกเข้ามา ต้องไม่ลบของสายแรก */
  const otherLine = JSON.parse(JSON.stringify(base));
  otherLine.CSTOCK = { lots: {}, del: {}, slips: {}, sdel: {}, ex: {}, sub: {}, subdel: {}, key: {}, gin: {},
    rep: { [B1 + "|2026-11-20|CT12"]: { it: { "90000001": { sc: 4 } }, by: "209612", at: 55000, n: 1, h: [] } },
    up: 55000 };
  const r3 = mergeState(r2, otherLine);
  check("🔑 เซลล์อีกสายบันทึก ไม่ลบของสายแรก",
        !!r3.CSTOCK.rep[RK] && !!r3.CSTOCK.rep[B1 + "|2026-11-20|CT12"],
        JSON.stringify(Object.keys(r3.CSTOCK.rep)));
  /* ลบใบออเดอร์ = งานสองฝั่งของใบนั้นหายตามไป ไม่ทิ้งเศษค้าง */
  const killSlip = JSON.parse(JSON.stringify(base));
  killSlip.CSTOCK = { lots: {}, del: {}, slips: {}, ex: {}, sub: {}, subdel: {}, key: {}, gin: {},
    sdel: { [B1]: 30000 }, up: 30000 };
  const t5 = mergeState(r3, killSlip);
  check("🛟 ลบใบออเดอร์ทิ้ง งานทุกฝั่งของใบนั้นไม่ค้างเป็นเศษ",
        !Object.keys(t5.CSTOCK.key || {}).some((k) => k.indexOf(B1 + "|") === 0) &&
        !Object.keys(t5.CSTOCK.gin || {}).some((k) => k.indexOf(B1 + "|") === 0) &&
        !Object.keys(t5.CSTOCK.rep || {}).some((k) => k.indexOf(B1 + "|") === 0),
        JSON.stringify({ key: Object.keys(t5.CSTOCK.key || {}), gin: Object.keys(t5.CSTOCK.gin || {}) }));

  /* 📇 ดัชนีเลขออเดอร์จากไฟล์ยอดขาย (STOREDAILY.ord) — ใช้แปลงเลขเป็นชื่อร้าน/ยอด
     ⚠️ mergeState สร้าง STOREDAILY ใหม่จากรายชื่อช่อง ถ้าลืมใส่ ord ดัชนีหายทั้งก้อน */
  const ordSrv = JSON.parse(JSON.stringify(u7));
  ordSrv.STOREDAILY = { data: { "2026-11-17": { "4862383": { l: "209611", niv: 100 } } },
    ord: { BDD0100000006: { s: "4862383", l: "209611", d: "2026-11-17", v: 351.47, c: 4 } } };
  const preOrd = JSON.parse(JSON.stringify(base));
  preOrd.STOREDAILY = { data: { "2026-11-18": { "4862365": { l: "209611", niv: 50 } } } };
  const o1 = mergeState(ordSrv, preOrd);
  check("🛟 แท็บที่ไม่มีดัชนีเลขออเดอร์ บันทึกทับแล้วดัชนีไม่หาย",
        !!(o1.STOREDAILY.ord || {}).BDD0100000006 &&
        o1.STOREDAILY.ord.BDD0100000006.v === 351.47,
        JSON.stringify(Object.keys(o1.STOREDAILY.ord || {})));
  check("...และยอดรายร้านของทั้งสองวันอยู่ครบ",
        !!o1.STOREDAILY.data["2026-11-17"] && !!o1.STOREDAILY.data["2026-11-18"]);
  const ordNew = JSON.parse(JSON.stringify(base));
  ordNew.STOREDAILY = { data: {}, ord: { BDD0100000099: { s: "4862999", l: "209613", d: "2026-11-18", v: 9, c: 1 } } };
  const o2 = mergeState(o1, ordNew);
  check("อัพไฟล์ยอดขายวันใหม่ → เลขออเดอร์ของวันเก่ายังค้นหาได้อยู่",
        Object.keys(o2.STOREDAILY.ord).sort().join(",") === "BDD0100000006,BDD0100000099",
        Object.keys(o2.STOREDAILY.ord).join(","));
}

console.log("TEST 22 — product master: every upload takes effect, no code is ever lost (DCODE, 10 Nov 26)");
{
  /* เจ้าของสั่ง: SKU ในหน้า DCODE ต้อง "อัพเดตทุกครั้งเมื่อมีการอัพ master file"
     ของเดิม (pickBiggerMaster) เก็บก้อนที่ "มีรายการมากกว่า" → ไฟล์ใหม่ที่ตัดรหัสเลิกขายออกไป
     ไม่กี่ตัวถูกปฏิเสธเงียบ ๆ และแท็บเก่าที่ถือก้อนเก่า (ใหญ่กว่า) ย้อนไฟล์ใหม่กลับได้ */
  const base = JSON.parse(JSON.stringify(server));
  base.MASTER = { date: "2026-10-01", up: 1000, items: { "67000001": "บรีส เก่า", "67000002": "โอโม", "67000003": "ซันไลต์" } };
  const fresh = JSON.parse(JSON.stringify(base));
  fresh.MASTER = { date: "2026-11-01", up: 2000, items: { "67000001": "บรีส ชื่อใหม่", "67000009": "สินค้าใหม่ พ.ย." } };
  const m1 = mergeState(base, fresh);
  check("ไฟล์ master ใหม่ที่มีรายการ 'น้อยกว่า' ยังอัพเดตชื่อได้ (เดิมถูกปฏิเสธเงียบ ๆ)",
        m1.MASTER.items["67000001"] === "บรีส ชื่อใหม่", m1.MASTER.items["67000001"]);
  check("...รหัสใหม่ในไฟล์ใหม่เข้ามาครบ", m1.MASTER.items["67000009"] === "สินค้าใหม่ พ.ย.");
  check("🛟 ...รหัสที่ไฟล์ใหม่ไม่มีแล้ว ยังอยู่ (ไม่มีรหัสไหนหายเพราะอัพไฟล์)",
        m1.MASTER.items["67000002"] === "โอโม" && m1.MASTER.items["67000003"] === "ซันไลต์",
        Object.keys(m1.MASTER.items).join(","));
  check("...สแตมป์/วันที่ของก้อนเป็นของไฟล์ใหม่", m1.MASTER.up === 2000 && m1.MASTER.date === "2026-11-01");
  const stale = JSON.parse(JSON.stringify(base));
  stale.MASTER = { date: "2026-10-01", up: 1000, items: Object.assign({}, base.MASTER.items, { "67000004": "x", "67000005": "y" }) };
  const m2 = mergeState(m1, stale);
  check("🛟 แท็บเก่าที่ถือ master ก้อนเก่า (ใหญ่กว่า) บันทึกทับ → ชื่อใหม่ไม่ถูกย้อนกลับ",
        m2.MASTER.items["67000001"] === "บรีส ชื่อใหม่" && m2.MASTER.up === 2000, m2.MASTER.items["67000001"]);
  check("...และรหัสที่แท็บเก่ามีเพิ่ม ก็ไม่ถูกทิ้ง (union)", m2.MASTER.items["67000004"] === "x");
  const blank = JSON.parse(JSON.stringify(base)); delete blank.MASTER;
  check("🛟 แท็บที่ไม่มี MASTER เลย ลบ master ไม่ได้", Object.keys(mergeState(m2, blank).MASTER.items).length === 6);
  const empty = JSON.parse(JSON.stringify(base)); empty.MASTER = { items: {} };
  check("🛟 MASTER ว่าง ๆ ลบ master ไม่ได้", Object.keys(mergeState(m2, empty).MASTER.items).length === 6);
  check("เซิร์ฟเวอร์ยังไม่มี master → รับของ client ทั้งก้อน",
        mergeState(Object.assign({}, base, { MASTER: undefined }), fresh).MASTER.items["67000009"] === "สินค้าใหม่ พ.ย.");
  const noUp = mergeState({ MASTER: { items: { a: "1", b: "2" } } }, { MASTER: { items: { a: "9" } } });
  check("ข้อมูลรุ่นเก่าที่ไม่มี up ทั้งคู่ → client ชนะชื่อ (เหมือนเดิม) แต่ไม่ทิ้งรหัสของเซิร์ฟเวอร์",
        noUp.MASTER.items.a === "9" && noUp.MASTER.items.b === "2", JSON.stringify(noUp.MASTER.items));
  check("master ไม่ไปกวนก้อนอื่น",
        Object.keys(m1.DATA.monthly).length === 2 && !!m1.PSTORE.rounds["2026-06-30"] && m1.ORDERS.dates.length === 2);

  /* เลข PJP (pj) + รหัสพนักงาน (emp) อยู่ในเรคอร์ดร้านเดิม — ไม่ใช่ section ใหม่ */
  const o1 = JSON.parse(JSON.stringify(base));
  o1.PJP = { out: { "2488705": { n: "ร้านนิตท์", up: 100, la: 13.88, lo: 100.4, rt: "209616" },
                    "2490866": { n: "ปณตพงค์", up: 100 } }, plan: {}, done: {}, cfg: { outUp: 100 } };
  const o2 = JSON.parse(JSON.stringify(base));
  o2.PJP = { out: { "2488705": { n: "ร้านนิตท์", up: 200, la: 13.88, lo: 100.4, rt: "209616", pj: "401842", emp: "16956", st: "Active" } },
             plan: {}, done: {}, cfg: { outUp: 200 } };
  const p1 = mergeState(o1, o2);
  check("🧾 อัพ Master Outlet ใหม่ → เลข PJP + รหัสพนักงานเข้าเรคอร์ดร้าน",
        p1.PJP.out["2488705"].pj === "401842" && p1.PJP.out["2488705"].emp === "16956",
        JSON.stringify(p1.PJP.out["2488705"]));
  check("🛟 ร้านที่ไฟล์ใหม่ไม่มี ยังอยู่ครบ", !!p1.PJP.out["2490866"]);
  const p2 = mergeState(p1, o1);
  check("🛟 แท็บเก่า (ก่อนมีเลข PJP) บันทึกทับ → เลข PJP ไม่หาย",
        p2.PJP.out["2488705"].pj === "401842", JSON.stringify(p2.PJP.out["2488705"]));
}

console.log("TEST 29 — ✅ \"รอบนี้ไม่มีของ Drop เลย\" (แอดมินยืนยันเอง เมื่อยูนิลีเวอร์ไม่ส่งไฟล์มา)");
{
  /* noDrop เป็นช่องบนเรคอร์ด "วัน" เดียวกับ dropped/dropVal — ไม่ได้เป็น section ใหม่
     ORDERS.data merge ทีละวัน (keyMerge) วันที่ฝั่งไหนมีอยู่ฝั่งเดียวจึงต้องอยู่ครบทั้งสองฝั่ง */
  const base = JSON.parse(JSON.stringify(server));
  const nd = JSON.parse(JSON.stringify(base));
  nd.ORDERS = { dates: ["2026-11-20"], data: {
    "2026-11-20": { rounds: { main: { "1001": 10 } }, dropped: {}, hasResult: true,
                    dropVal: 0, dropLines: [],
                    noDrop: { at: 5000, by: "admin1", byName: "แอดมิน 1" } } },
    names: {}, cat: {}, catN: {} };
  const n1 = mergeState(base, nd);
  check("ยืนยันว่าไม่มีของ Drop แล้วบันทึกขึ้นเซิร์ฟเวอร์ได้",
        !!n1.ORDERS.data["2026-11-20"].noDrop &&
        n1.ORDERS.data["2026-11-20"].hasResult === true &&
        n1.ORDERS.data["2026-11-20"].dropVal === 0,
        JSON.stringify(n1.ORDERS.data["2026-11-20"].noDrop));
  check("🛟 วันเก่าที่เคยอัพไว้ยังอยู่ครบ", !!n1.ORDERS.data["2026-07-28"] && n1.ORDERS.dates.length === 3,
        n1.ORDERS.dates.join(","));
  /* แท็บอื่นที่เปิดค้างไว้ตั้งแต่ก่อนมีปุ่มนี้ บันทึกวันอื่น → วันที่ยืนยันไว้ต้องไม่หาย */
  const other = JSON.parse(JSON.stringify(base));
  other.ORDERS = { dates: ["2026-11-21"], data: { "2026-11-21": { rounds: { main: { "1002": 2 } } } },
                   names: {}, cat: {}, catN: {} };
  const n2 = mergeState(n1, other);
  check("🛟 แท็บเก่าบันทึกวันอื่น → การยืนยัน \"ไม่มีของ Drop\" ไม่หาย",
        !!n2.ORDERS.data["2026-11-20"].noDrop && !!n2.ORDERS.data["2026-11-21"],
        n2.ORDERS.dates.join(","));
  /* อัพใบ Drop จริงทีหลัง = วันเดียวกันถูกเขียนใหม่ทั้งเรคอร์ด ต้องไม่เหลือ noDrop ค้าง */
  const real = JSON.parse(JSON.stringify(base));
  real.ORDERS = { dates: ["2026-11-20"], data: {
    "2026-11-20": { rounds: { main: { "1001": 10 } }, dropped: { "1001": { o: 10, d: 7, q: 3 } },
                    hasResult: true, dropVal: 555.5, dropLines: [{ code: "1001", o: 10, d: 7, q: 3 }] } },
    names: {}, cat: {}, catN: {} };
  const n3 = mergeState(n2, real);
  check("อัพใบ Drop จริงทีหลัง → ขึ้นรายการ drop และไม่เหลือการยืนยันค้าง",
        !n3.ORDERS.data["2026-11-20"].noDrop && n3.ORDERS.data["2026-11-20"].dropVal === 555.5,
        JSON.stringify(n3.ORDERS.data["2026-11-20"].noDrop || null));
}

console.log("TEST 30 — 🎁 ดัชนียอดขายของโปรโมชั่น (PROMO.sales) ที่ parseDailyDcode เก็บไว้");
{
  const base = JSON.parse(JSON.stringify(server));
  /* คีย์ "วัน|สาย" = หน่วยเดียวกับที่ไฟล์ยอดขายหนึ่งใบเขียน */
  const up1 = JSON.parse(JSON.stringify(base));
  up1.PROMO = { items: { p1: { m: "2026-11", type: "combo", name: "คอมโบ พ.ย.", up: 1000, at: 1000 } }, res: {}, del: {},
    sales: {
      "2026-11-10|209611": { up: 1000, p: { 90000001: { cs: 0, pc: 4, fc: 0, fp: 0, niv: 400, sh: { S1: 4 } } } },
      "2026-11-10|209612": { up: 1000, p: { 90000001: { cs: 1, pc: 12, fc: 0, fp: 0, niv: 1200, sh: { S3: 12 } } } },
    } };
  const m1 = mergeState(base, up1);
  check("🎁 อัพไฟล์ยอดขายแล้วดัชนีของโปรฯ ถูกบันทึก",
        Object.keys(m1.PROMO.sales).length === 2 && m1.PROMO.sales["2026-11-10|209611"].p["90000001"].pc === 4,
        Object.keys(m1.PROMO.sales).join(" "));

  /* 🛟 แท็บที่เปิดค้างไว้ตั้งแต่ก่อนมีฟีเจอร์นี้ (ไม่มี sales เลย) บันทึกทับ */
  const oldTab = JSON.parse(JSON.stringify(base));
  oldTab.PROMO = { items: { p1: { m: "2026-11", type: "combo", name: "คอมโบ พ.ย.", up: 900, at: 900 } }, res: {}, del: {} };
  const m2 = mergeState(m1, oldTab);
  check("🛟 แท็บเก่าที่ไม่รู้จักดัชนีนี้ บันทึกทับ → ยอดที่เก็บไว้ไม่หาย",
        Object.keys(m2.PROMO.sales).length === 2, Object.keys(m2.PROMO.sales).join(" "));

  /* 🛟 ไฟล์ที่กรองมาแค่สายเดียว ต้องทับได้แค่คีย์ของสายนั้น */
  const oneLine = JSON.parse(JSON.stringify(base));
  oneLine.PROMO = { items: {}, res: {}, del: {},
    sales: { "2026-11-10|209611": { up: 5000, p: { 90000001: { cs: 0, pc: 9, fc: 0, fp: 0, niv: 900, sh: { S2: 9 } } } } } };
  const m3 = mergeState(m2, oneLine);
  check("🛟 ไฟล์ที่ดึงมาแค่สายเดียว ทับได้แค่ \"วัน|สาย\" นั้น",
        m3.PROMO.sales["2026-11-10|209611"].p["90000001"].pc === 9 &&
        m3.PROMO.sales["2026-11-10|209612"].p["90000001"].pc === 12,
        Object.keys(m3.PROMO.sales).join(" "));

  /* 🔑 ลบโปรโมชั่นทิ้ง ต้องไม่พายอดขายของวันนั้นไปด้วย (คนละเรื่องกัน) */
  const kill = JSON.parse(JSON.stringify(m3));
  delete kill.PROMO.items.p1;
  kill.PROMO.del = { p1: 9000 };
  const m4 = mergeState(m3, kill);
  check("🔑 ลบโปรฯ ทิ้งแล้ว ยอดขายรายวันที่เก็บไว้ยังอยู่ (ไม่ใช่ข้อมูลของใบโปร)",
        !m4.PROMO.items.p1 && !!m4.PROMO.del.p1 && Object.keys(m4.PROMO.sales).length === 2,
        Object.keys(m4.PROMO.sales).join(" "));
  check("🛟 ...และยอดขาย/สต็อก/ใบสั่งของเดิมไม่ถูกแตะ",
        Object.keys(m4.DATA.monthly).length === 2 && m4.ORDERS.dates.length === 2 &&
        m4.STOCKD.rows.length === 3);
}

/* ============================================================================
 * 📋 สถานะออเดอร์ — api/ordtrk.js เก็บแยกก้อน ไม่แตะ bd-data-* เลย
 *
 * กฎที่ต้องพิสูจน์ (ทั้งหมดเป็นเรื่อง "ข้อมูลเดิมห้ามหาย"):
 *   · ไฟล์ที่ไม่ได้เอ่ยถึงออเดอร์ใบไหน ลบใบนั้นไม่ได้ (union รายเลข)
 *   · อัพไฟล์เก่าทับ ต้องไม่ลากสถานะถอยหลัง — ตัดสินด้วย u (วันสุดท้ายที่ไฟล์ครอบคลุม)
 *     ไม่ใช่เวลาอัพโหลด
 *   · รวมแบบทีละช่อง — ไฟล์ใหม่ที่บังเอิญไม่มีเลข GIN ต้องไม่ล้าง GIN ที่รู้แล้ว
 *   · รายสินค้าของใบที่ไฟล์ใหม่ไม่ได้พูดถึง ต้องยังอยู่
 * ==========================================================================*/
{
  const oSrc = readFileSync(new URL("../api/ordtrk.js", HERE), "utf8");
  const oCut = oSrc.indexOf("export default async function handler");
  if (oCut < 0) throw new Error("handler not found — ordtrk.js shape changed");
  const oBody = oSrc.slice(0, oCut).split("\n")
    .filter((l) => !/^\s*import\s/.test(l))
    .map((l) => l.replace(/^\s*export\s+/, ""))
    .join("\n");
  const { mergeMonth, recOrd } = new Function(oBody + "\nreturn {mergeMonth, recOrd};")();

  const srv = {
    ord: {
      "00000101": { d: 17, l: "209611", s: "9000001", g: "44", t: "D", i: "00000501", c: 12, v: 5000, n: 2, u: 20261124 },
      "00000102": { d: 17, l: "209612", s: "9000002", t: "C", c: 5, v: 2000, n: 1, u: 20261124 },
      "00000103": { d: 18, l: "209611", s: "9000003", g: "45", t: "R", c: 8, n: 1, u: 20261124 },
    },
    det: { "00000101": { 1001: [10, 2] }, "00000103": { 1001: [8, 0] } },
  };

  /* ไฟล์รอบใหม่: มีใบใหม่ 1 ใบ และอัปเดตสถานะใบ 102 (ตอนนี้คลังจัดแล้ว) */
  const fresh = {
    ord: {
      "00000102": { d: 17, l: "209612", s: "9000002", g: "60", t: "D", i: "00000520", c: 5, v: 2000, n: 1, u: 20261130 },
      "00000201": { d: 28, l: "209611", s: "9000009", g: "61", t: "L", c: 3, n: 1, u: 20261130 },
    },
    det: { "00000201": { 1002: [3, 0] } },
  };
  const m1 = mergeMonth(srv, fresh);
  check("🔑 ไฟล์ใหม่ที่ไม่ได้เอ่ยถึงใบเก่า ลบใบเก่าไม่ได้",
        Object.keys(m1.ord).length === 4 && !!m1.ord["00000101"] && !!m1.ord["00000103"],
        Object.keys(m1.ord).join(" "));
  check("🔑 ใบที่คลังเพิ่งจัด อัปเดตเป็นค่าใหม่",
        m1.ord["00000102"].g === "60" && m1.ord["00000102"].t === "D",
        JSON.stringify(m1.ord["00000102"]));
  check("🛟 รายสินค้าของใบที่ไฟล์ใหม่ไม่ได้พูดถึง ยังอยู่ครบ",
        !!m1.det["00000101"] && !!m1.det["00000103"] && !!m1.det["00000201"],
        Object.keys(m1.det).join(" "));

  /* 🔑 อัพไฟล์เก่าทับ — ไฟล์เดิม (u เก่ากว่า) ต้องแพ้ ไม่ลากสถานะถอยหลัง */
  const stale = {
    ord: { "00000102": { d: 17, l: "209612", s: "9000002", t: "C", c: 5, v: 2000, n: 1, u: 20261120 } },
    det: {},
  };
  const m2 = mergeMonth(m1, stale);
  check("🔑 อัพไฟล์เก่าทับ ไม่ลากใบที่ส่งถึงร้านแล้วถอยกลับไปเป็น \"รอยืนยัน\"",
        m2.ord["00000102"].t === "D" && m2.ord["00000102"].g === "60",
        JSON.stringify(m2.ord["00000102"]));

  /* 🔑 ไฟล์ใหม่กว่าแต่บังเอิญไม่มีเลข GIN ต้องไม่ล้าง GIN ที่รู้แล้ว (รวมทีละช่อง) */
  const newerNoGin = {
    ord: { "00000101": { d: 17, l: "209611", s: "9000001", t: "D", c: 12, v: 5000, n: 2, u: 20261201 } },
    det: {},
  };
  const m3 = mergeMonth(m2, newerNoGin);
  check("🔑 ไฟล์ใหม่ที่ไม่มีเลข GIN ต้องไม่ล้าง GIN เดิมทิ้ง",
        m3.ord["00000101"].g === "44" && m3.ord["00000101"].i === "00000501",
        JSON.stringify(m3.ord["00000101"]));

  /* 🛟 เดือนที่ยังไม่เคยมีข้อมูล (ครั้งแรก) ต้องเขียนได้ตามปกติ */
  const first = mergeMonth(null, fresh);
  check("🛟 เดือนแรกที่ยังไม่มีข้อมูล เขียนได้ปกติ",
        Object.keys(first.ord).length === 2 && !!first.det["00000201"],
        Object.keys(first.ord).join(" "));

  /* 🛟 สร้างเรคอร์ดใหม่ทีละช่อง — ของแปลกปลอมที่ส่งมาต้องไม่ถูกเก็บ */
  const clean = recOrd({ d: 17, l: "209611", s: "9000001", g: "44", t: "D",
                         i: "00000501", c: 12, v: 5000, n: 2, u: 20261124,
                         evil: "x", __proto__x: 1, cd: { a: 1 } });
  check("🛟 เก็บเฉพาะช่องที่รู้จัก ของแปลกปลอมไม่ถูกเขียนลงที่เก็บ",
        !("evil" in clean) && !("cd" in clean) && clean.g === "44",
        JSON.stringify(clean));
  check("🛟 ข้อมูลที่อ่านไม่ได้ ไม่กลายเป็นเรคอร์ดว่าง ๆ",
        recOrd(null) === null && recOrd({}) === null);
}

console.log("\n" + (fail === 0 ? "ALL PASS (" + pass + " checks) — ข้อมูลเก่าไม่หาย" : fail + " FAILED of " + (pass + fail)));
process.exit(fail === 0 ? 0 : 1);
