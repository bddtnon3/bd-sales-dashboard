/* Data-safety test: proves old data survives mergeState after the PSTORE change.
   Loads the REAL mergeState/mergeRequests source out of api/save.js (imports and the
   HTTP handler stripped) so we test the shipped code, not a copy. */
import { readFileSync } from "fs";

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

console.log("\n" + (fail === 0 ? "ALL PASS (" + pass + " checks) — ข้อมูลเก่าไม่หาย" : fail + " FAILED of " + (pass + fail)));
process.exit(fail === 0 ? 0 : 1);
