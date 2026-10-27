/* 🔑 ต่ออายุการล็อกอิน (api/renew.js) — ฝั่งเซิร์ฟเวอร์
 *
 * ที่มา 27 ต.ค. 69: สาย KA97 กดส่งคำขอแล้วขึ้น "บันทึกไม่สำเร็จ: unauthorized"
 * เพราะ token อายุ 7 วันและ **ไม่มีอะไรต่ออายุให้เลย** ส่วนหน้าจอยังใช้ได้ปกติ
 * (ทำงานในเครื่องล้วน ๆ) จึงไม่มีใครรู้จนกดส่งหลังคีย์สินค้าไปแล้ว 17 ตัว
 *
 * ต้องพิสูจน์ว่าทางแก้ไม่ได้เปิดช่องโหว่ใหม่:
 *   · ต่ออายุได้เฉพาะ token ที่ยัง "ใช้ได้จริงตอนนี้" — หมดอายุแล้วต้องต่อไม่ได้
 *   · ปลอมลายเซ็น / แก้ payload เองแล้วต้องไม่ผ่าน
 *   · สิทธิ์ (role · รหัสสาย · ชื่อ) ต้องลอกจาก token ที่ตรวจแล้วเท่านั้น
 *     ห้ามรับจาก body ที่คนยิงส่งมาเอง — ไม่งั้นเซลล์ยกระดับตัวเองเป็น manager ได้
 *   · endpoint นี้ต้องไม่แตะข้อมูลใด ๆ (ไม่ import blob เลย)
 *
 * รัน:  node test/auth-renew.test.mjs
 */
process.env.AUTH_SECRET = "test-secret-for-renew-only";
const { sign, verify, TOKEN_TTL, expiry } = await import("../lib/auth.js");
const renew = (await import("../api/renew.js")).default;
const login = (await import("../api/login.js")).default;
const { readFileSync } = await import("fs");

const A = [];
const t = (n, c, x) => A.push([!!c, n, x === undefined ? "" : String(x)]);

/* ตัวปลอม req/res แบบเดียวกับที่ Vercel ส่งเข้ามา */
function call(handler, { method = "POST", token, body } = {}) {
  const req = { method, headers: token === undefined ? {} : { authorization: "Bearer " + token }, body };
  let code = 200, payload = null;
  const res = {
    status(c) { code = c; return res; },
    json(p) { payload = p; return res; },
  };
  return Promise.resolve(handler(req, res)).then(() => ({ code, body: payload }));
}

const claims = { u: "ka97", role: "sales", code: "2096_97", name: "เกษชญานิษฐ์" };

/* ---------- 1) อายุ token ---------- */
t("อายุการล็อกอินยาวพอให้ทีมขายใช้งานจริง (≥ 30 วัน)",
  TOKEN_TTL >= 1000 * 60 * 60 * 24 * 30, Math.round(TOKEN_TTL / 86400000) + " วัน");
t("api/login ใช้ค่าอายุจาก lib/auth.js ไม่ได้เขียนเลขตายตัวไว้เอง",
  !/60\s*\*\s*60\s*\*\s*24\s*\*\s*7/.test(readFileSync(new URL("../api/login.js", import.meta.url), "utf8")),
  "ok");

/* ---------- 2) ต่ออายุ token ที่ยังใช้ได้ ---------- */
const soon = sign({ ...claims, exp: Date.now() + 1000 * 60 * 60 });   /* เหลืออีก 1 ชม. */
const r1 = await call(renew, { token: soon });
t("token ที่ยังไม่หมดอายุ → ต่ออายุได้", r1.code === 200 && !!r1.body.token, r1.code + " " + JSON.stringify(r1.body).slice(0, 80));
const p1 = verify(r1.body.token);
t("...ได้วันหมดอายุใหม่ที่ไกลกว่าเดิมจริง",
  p1 && p1.exp > Date.now() + 1000 * 60 * 60 * 24 * 29, p1 && new Date(p1.exp).toISOString());
t("...สิทธิ์และตัวตนเหมือนเดิมทุกช่อง",
  p1 && p1.u === claims.u && p1.role === claims.role && p1.code === claims.code && p1.name === claims.name,
  JSON.stringify(p1));

/* ---------- 3) ของที่ไม่ควรผ่าน ---------- */
const dead = sign({ ...claims, exp: Date.now() - 1000 });
t("⛔ token ที่หมดอายุไปแล้ว ต่อไม่ได้ (ต้องล็อกอินใหม่เท่านั้น)",
  (await call(renew, { token: dead })).code === 401, "ok");
t("⛔ ไม่ส่ง token มาเลย → 401", (await call(renew, {})).code === 401, "ok");
t("⛔ token มั่ว → 401", (await call(renew, { token: "abc.def" })).code === 401, "ok");

const [bodyPart] = sign({ ...claims, exp: expiry() }).split(".");
const forgedSig = bodyPart + "." + "ปลอมลายเซ็น";
t("⛔ ลายเซ็นปลอม → 401", (await call(renew, { token: forgedSig })).code === 401, "ok");

/* แก้ payload เป็น manager แล้วแปะลายเซ็นเดิม */
const good = sign({ ...claims, exp: expiry() });
const tampered = Buffer.from(JSON.stringify({ ...claims, role: "manager", exp: expiry() }))
  .toString("base64url") + "." + good.split(".")[1];
t("⛔ แก้ payload เป็น manager แล้วใช้ลายเซ็นเดิม → 401",
  (await call(renew, { token: tampered })).code === 401, "ok");

/* ---------- 4) body ต้องเปลี่ยนสิทธิ์ไม่ได้ ---------- */
const r2 = await call(renew, { token: good, body: { role: "manager", code: "000000", name: "แอบเป็นผู้จัดการ" } });
const p2 = verify(r2.body.token);
t("🔒 ส่ง role/code/name มาใน body ต้องไม่มีผล — ลอกจาก token ที่ตรวจแล้วเท่านั้น",
  p2 && p2.role === "sales" && p2.code === "2096_97" && p2.name === claims.name, JSON.stringify(p2));

t("⛔ GET ไม่ได้ (เขียนอย่างเดียว POST)", (await call(renew, { method: "GET", token: good })).code === 405, "ok");

/* ---------- 5) endpoint นี้ต้องไม่ยุ่งกับข้อมูล ---------- */
const src = readFileSync(new URL("../api/renew.js", import.meta.url), "utf8");
t("🛟 api/renew ไม่ import blob / ไม่อ่าน ไม่เขียนข้อมูลใด ๆ",
  !/@vercel\/blob|snapshot\.js|seed-data/.test(src), "ok");
t("🛟 ...และไม่มีการ put/del/list อยู่ในไฟล์เลย",
  !/\b(put|del|list)\s*\(/.test(src.replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "")), "ok");

/* ---------- 6) ล็อกอินปกติยังทำงาน ---------- */
const accSrc = readFileSync(new URL("../lib/accounts.js", import.meta.url), "utf8");
const anyUser = (accSrc.match(/^\s*"?([a-z0-9_]+)"?\s*:\s*\{/m) || [])[1];
if (anyUser) {
  const bad = await call(login, { body: { user: anyUser, pass: "ผิดแน่ ๆ" } });
  t("ล็อกอินด้วยรหัสผ่านผิดยังถูกปฏิเสธเหมือนเดิม", bad.code === 401, bad.code);
}

let fail = 0;
A.forEach(([ok, n, x]) => { if (!ok) fail++; console.log((ok ? "  ok  " : "  FAIL") + "  " + n + (x ? "   [" + x + "]" : "")); });
console.log("\n" + A.length + " checks · " + (A.length - fail) + " passed · " + fail + " failed");
console.log(fail ? "SOME FAILED" : "ALL PASS (" + A.length + " checks)");
process.exit(fail ? 1 : 0);
