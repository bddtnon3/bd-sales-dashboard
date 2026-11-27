// Build server (API-mode) public/index.html from dashboard_template.html.
// Portable: paths are relative to this file, so it runs in Claude Code / anywhere.
// Deploy = commit public/index.html (+ template) and push to main; Vercel auto-deploys.
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const ROOT = __dirname;
const tpl = fs.readFileSync(path.join(ROOT, "dashboard_template.html"), "utf8");

function must(str, needle, label) {
  if (str.indexOf(needle) < 0) { throw new Error("ANCHOR NOT FOUND: " + label); }
  return str;
}

/* ==========================================================================
 * 🔒 ลอกคอมเมนต์ออกจากทุกไฟล์ที่ส่งขึ้นเว็บจริง (เจ้าของสั่ง 26 พ.ย. 69)
 *   *"ข้อมูลที่ผมคุยกับคุณผมไม่ต้องการให้คนใช้เว็บรู้เลย ... ข้อมูลบริษัทภายในที่
 *     เกี่ยวกับการบริหารเบื้องลึกที่มีแค่คุณกับผมเท่านั้นที่รู้ได้ ... ลบมันทั้งหมด"*
 *
 * ทำไมต้องมีขั้นนี้: ไฟล์ที่ deploy เคยพ่วงคอมเมนต์ไป ~186 KB รวม **คำพูดของเจ้าของ
 * ที่ยกมาอ้างไว้ 54 แห่ง** ตัวเลขที่วัดได้ทั้งหมด และเหตุผลเบื้องหลังทุกข้อ —
 * ใครกด "ดูซอร์ส" ในเบราว์เซอร์ก็อ่านได้หมด รวมถึงหน้าแคตาลอคที่ลูกค้าเปิดดู
 *
 * 🔑 คอมเมนต์ยังอยู่ครบใน **ไฟล์ต้นฉบับ** (dashboard_template.html, src/*.html)
 *    ตัดเฉพาะตอนเขียนลง public/ — เอกสารสำหรับคนดูแลโค้ดจึงไม่หาย
 * ⚠️ ตัวตัดต้องรู้จักสตริง / เทมเพลต / regex ไม่งั้นจะกิน URL ที่มี // หรือ regex
 *    ที่มี /* เข้าไปด้วย — ตัดเสร็จแล้วจึง **parse ซ้ำ** ถ้าพังให้ build ล้มทันที
 *    (หลักเดียวกับ ANCHOR NOT FOUND) และเทสเบราว์เซอร์ทุกชุดรันบนไฟล์ที่ตัดแล้ว
 * ==========================================================================*/
const JS_KW = new Set(["return", "typeof", "instanceof", "in", "of", "new", "delete",
  "void", "case", "do", "else", "yield", "await", "throw"]);

function stripJs(src) {
  let out = "", i = 0, prev = "", word = "";
  const n = src.length, st = [{ t: "code", b: 0 }];
  const emit = (t) => {
    out += t;
    for (let k = t.length - 1; k >= 0; k--) if (!/\s/.test(t[k])) { prev = t[k]; break; }
  };
  while (i < n) {
    const m = st[st.length - 1], c = src[i];
    if (m.t === "tpl") {                       // ข้างในเทมเพลตเป็นข้อความล้วน
      if (c === "\\") { out += src.substr(i, 2); i += 2; continue; }
      if (c === "`") { emit(c); i++; st.pop(); word = ""; continue; }
      if (c === "$" && src[i + 1] === "{") { emit("${"); i += 2; st.push({ t: "code", b: 0 }); word = ""; continue; }
      out += c; i++; continue;
    }
    const c2 = src[i + 1];
    if (c === "/" && c2 === "/") { while (i < n && src[i] !== "\n") i++; continue; }
    if (c === "/" && c2 === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; out += " "; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n) { if (src[j] === "\\") { j += 2; continue; } if (src[j] === c) { j++; break; } j++; }
      emit(src.slice(i, j)); word = ""; i = j; continue;
    }
    if (c === "`") { emit(c); i++; st.push({ t: "tpl" }); word = ""; continue; }
    if (c === "/") {
      // regex หรือเครื่องหมายหาร — ดูจากโทเคนก่อนหน้า
      let ok;
      if (!prev) ok = true;
      else if (/[A-Za-z0-9_$]/.test(prev)) ok = JS_KW.has(word);
      else if (prev === ")" || prev === "]") ok = false;
      else ok = true;
      if (ok) {
        let j = i + 1, cls = false, closed = false;
        while (j < n) {
          const d = src[j];
          if (d === "\\") { j += 2; continue; }
          if (d === "\n") break;               // regex ข้ามบรรทัดไม่ได้ = เดาผิด
          if (cls) { if (d === "]") cls = false; j++; continue; }
          if (d === "[") { cls = true; j++; continue; }
          if (d === "/") { j++; closed = true; break; }
          j++;
        }
        if (closed) {
          while (j < n && /[a-z]/i.test(src[j])) j++;
          emit(src.slice(i, j)); word = ""; i = j; continue;
        }
      }
      emit(c); i++; word = ""; continue;
    }
    if (/[A-Za-z0-9_$]/.test(c)) {
      let j = i; while (j < n && /[A-Za-z0-9_$]/.test(src[j])) j++;
      const w = src.slice(i, j); emit(w); word = w; i = j; continue;
    }
    if (c === "{") { m.b++; emit(c); word = ""; i++; continue; }
    if (c === "}") {
      if (m.b === 0 && st.length > 1) { emit(c); st.pop(); word = ""; i++; continue; }
      m.b--; emit(c); word = ""; i++; continue;
    }
    if (/\s/.test(c)) { out += c; i++; continue; }
    emit(c); word = ""; i++;
  }
  return out;
}

function stripCss(src) {
  let out = "", i = 0; const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "*") { const e = src.indexOf("*/", i + 2); i = e < 0 ? n : e + 2; out += " "; continue; }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n) { if (src[j] === "\\") { j += 2; continue; } if (src[j] === c) { j++; break; } j++; }
      out += src.slice(i, j); i = j; continue;
    }
    out += c; i++;
  }
  return out;
}

/* ตัดคอมเมนต์ทั้งเอกสาร: HTML ข้างนอก · CSS ใน <style> · JS ใน <script>
   แล้ว parse สคริปต์ทุกก้อนซ้ำ — พังเมื่อไหร่ build ต้องล้ม ไม่ใช่ปล่อยไฟล์เสียขึ้นเว็บ */
function cleanDoc(html, label) {
  const low = html.toLowerCase();
  const dropHtml = (t) => t.replace(/<!--[\s\S]*?-->/g, "");
  let out = "", i = 0, scripts = 0;
  while (i < html.length) {
    const a = low.indexOf("<script", i), b = low.indexOf("<style", i);
    let at = -1, kind = "";
    if (a >= 0 && (b < 0 || a < b)) { at = a; kind = "script"; }
    else if (b >= 0) { at = b; kind = "style"; }
    if (at < 0) { out += dropHtml(html.slice(i)); break; }
    out += dropHtml(html.slice(i, at));
    const gt = html.indexOf(">", at);
    const end = kind === "script" ? "</script>" : "</style>";
    const close = gt < 0 ? -1 : low.indexOf(end, gt);
    if (gt < 0 || close < 0) { out += html.slice(at); break; }
    const body = html.slice(gt + 1, close);
    let clean;
    if (kind === "script") {
      clean = stripJs(body);
      if (body.trim()) {
        scripts++;
        try { new vm.Script(clean); }
        catch (e) { throw new Error("STRIP BROKE JS in " + label + ": " + e.message); }
      }
    } else clean = stripCss(body);
    out += html.slice(at, gt + 1) + clean + end;
    i = close + end.length;
  }
  // ด่านสุดท้าย: ห้ามมีคำพูดที่ยกมาอ้าง (*"…"*) หรือคอมเมนต์ HTML หลงเหลือ
  if (/\*"[^"]{10,}"\s*\*/.test(out)) throw new Error("STRIP MISSED a quoted note in " + label);
  if (/<!--/.test(out)) throw new Error("STRIP MISSED an HTML comment in " + label);
  return { text: out, scripts };
}

// ---------- SERVER ----------
let s = tpl;
// data placeholders -> empty server defaults (real data comes from /api/data)
s = must(s, "const DATA = __SALESDATA__;", "DATA decl")
  .replace("const DATA = __SALESDATA__;",
    'let DATA = {lines:{},monthly:{},daily:{},focus_order:["209611","209612","209613","209614","209615","209616","209617","209619","209622","2096_97","209698","209699"]};');
s = must(s, "let STORE = __STOREDATA__;", "STORE decl")
  .replace("let STORE = __STOREDATA__;", "let STORE = {months:[],stores:[]};\nlet TOKEN=null;");
s = s.replace("let KPI = __KPIDATA__;", "let KPI = {months:[],lines:{},data:{},meta:{},del:{},workdays:26};")
     .replace("let ORDERS = __ORDERDATA__;", "let ORDERS = {dates:[],data:{},names:{}};")
     .replace("let STOCKD = __STOCKDATA__;", "let STOCKD = {date:null,rows:[],names:{}};")
     .replace("let REQUESTS = __REQDATA__;", "let REQUESTS = {data:{}};")
     .replace("let MASTER = __MASTERDATA__;", "let MASTER = {items:{}};")
     .replace("let ANALYTICS = __ANALYTICSDATA__;", "let ANALYTICS = {months:[],lines:{},data:{}};")
     .replace("let STOREPROD = __STOREPRODDATA__;", "let STOREPROD = {months:[],cat:{},stores:{},data:{}};")
     .replace("let STOREDAILY = __STOREDAILYDATA__;", "let STOREDAILY = {data:{}};");
s = must(s, "let PSTORE = __PSTOREDATA__;", "PSTORE decl")
  .replace("let PSTORE = __PSTOREDATA__;", "let PSTORE = {rounds:{}};");
// PSI — คลังรับของเข้าจากศูนย์ (ไฟล์ PSI): ว่างตอนเริ่ม ของจริงมาจาก /api/data
s = must(s, "let PSI = __PSIDATA__;", "PSI decl")
  .replace("let PSI = __PSIDATA__;", "let PSI = {rows:{},days:{},up:0};");
s = must(s, "let EB2B = __EB2BDATA__;", "EB2B decl")
  .replace("let EB2B = __EB2BDATA__;", "let EB2B = {asof:null,up:0,lines:{},data:{}};");
s = must(s, "let POSTATUS = __POSTATUSDATA__;", "POSTATUS decl")
  .replace("let POSTATUS = __POSTATUSDATA__;", "let POSTATUS = {dates:[],data:{}};");
s = must(s, "let LEADS = __LEADSDATA__;", "LEADS decl")
  .replace("let LEADS = __LEADSDATA__;", "let LEADS = {meta:{},sales:{},del:{}};");
// DCI starts empty on the server build; the read-only DCI_SEED in the template fills the
// screen until the manager uploads a real DCI file (see renderDCI/dciSrc).
s = must(s, "let DCI = __DCIDATA__;", "DCI decl")
  .replace("let DCI = __DCIDATA__;", "let DCI = {periods:[],data:{}};");
s = must(s, "let MINSTOCK = __MINSTOCKDATA__;", "MINSTOCK decl")
  .replace("let MINSTOCK = __MINSTOCKDATA__;", "let MINSTOCK = {man:{}};");
// PLAN — ปฏิทินงานร่วมกัน: ว่างตอนเริ่ม งานจริงมาจาก /api/data
s = must(s, "let PLAN = __PLANDATA__;", "PLAN decl")
  .replace("let PLAN = __PLANDATA__;", "let PLAN = {items:{},done:{},del:{}};");
// PJP — แผนเยี่ยมร้าน: ว่างตอนเริ่ม ของจริงมาจาก /api/data
s = must(s, "let PJP = __PJPDATA__;", "PJP decl")
  .replace("let PJP = __PJPDATA__;", "let PJP = {out:{},plan:{},done:{},cfg:{}};");

// CSTOCK — สต็อคกลาง (ของที่ตัดบิลไว้ก่อน): ว่างตอนเริ่ม ของจริงมาจาก /api/data
s = must(s, "let CSTOCK = __CSTOCKDATA__;", "CSTOCK decl")
  .replace("let CSTOCK = __CSTOCKDATA__;", "let CSTOCK = {lots:{},del:{},slips:{},sdel:{},ex:{},up:0};");

// PROMO — โปรโมชั่น & เงินรางวัล: ว่างตอนเริ่ม ของจริงมาจาก /api/data
s = must(s, "let PROMO = __PROMODATA__;", "PROMO decl")
  .replace("let PROMO = __PROMODATA__;", "let PROMO = {items:{},res:{},del:{},sales:{}};");

// accounts -> server side
const ACC_BLOCK = `/* ====================== ACCOUNTS ====================== */
/* v1 simple client-side auth. username = display code, password = code(lower)+"@bd" */
const ACCOUNTS={"manager":{pass:"bd@admin",role:"manager",name:"ผู้จัดการฝ่ายขาย"},
  "admin1":{pass:"bd@admin1",role:"manager",name:"แอดมิน 1 · คีย์ตัดบิล"},
  "admin2":{pass:"bd@admin2",role:"manager",name:"แอดมิน 2 · คีย์ข้อมูลร้าน"},
  "admin3":{pass:"bd@admin3",role:"manager",name:"แอดมิน 3"},
  "admin4":{pass:"bd@admin4",role:"manager",name:"แอดมิน 4"},
  "wh1":{pass:"bd@wh1",role:"wh",name:"ทีมคลัง 1"},
  "wh2":{pass:"bd@wh2",role:"wh",name:"ทีมคลัง 2"},
  "wh3":{pass:"bd@wh3",role:"wh",name:"ทีมคลัง 3"},
  "wh4":{pass:"bd@wh4",role:"wh",name:"ทีมคลัง 4"},
  "ds1":{pass:"bd@ds1",role:"ds",name:"ทีมสายส่ง 1"},
  "ds2":{pass:"bd@ds2",role:"ds",name:"ทีมสายส่ง 2"},
  "ds3":{pass:"bd@ds3",role:"ds",name:"ทีมสายส่ง 3"},
  "ds4":{pass:"bd@ds4",role:"ds",name:"ทีมสายส่ง 4"},
  "sup":{pass:"bd@sup",role:"sup",name:"หัวหน้าเซลล์ (Supervisor)"}};
DATA.focus_order.forEach(code=>{
  const d=DATA.lines[code];
  ACCOUNTS[d.display.toLowerCase()]={pass:d.display.toLowerCase()+"@bd",role:"sales",code:code,name:d.display+" · "+d.name};
});`;
s = must(s, ACC_BLOCK, "ACCOUNTS block").replace(ACC_BLOCK, "/* Accounts on server. */");

// login block -> API mode
const LOGIN_BLOCK = `/* ====================== LOGIN ====================== */
function doLogin(){
  const u=document.getElementById("u").value.trim().toLowerCase();
  const p=document.getElementById("p").value;
  const acc=ACCOUNTS[u];
  if(!acc||acc.pass!==p){document.getElementById("loginErr").textContent="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";return;}
  S.user={id:u,...acc};
  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("uName").textContent=acc.name;
  document.getElementById("uRole").textContent=bdRoleOf(S.user);
  document.getElementById("uAv").textContent=bdAvOf(S.user);
  /* sales default to own line view; manager sees team */
  if(acc.role==="sales"){S.scope="me";setSeg("scopeSeg","s","me");}
  document.querySelectorAll(".admin-upload").forEach(e=>e.style.display=acc.role==="manager"?"":"none");
  document.querySelectorAll(".sales-only").forEach(e=>e.style.display=acc.role==="sales"?"":"none");
  initKeys();render();initKPI();initOrder();initAnalytics();initPlan();initPromo();initPjp();navReset();
  /* ⚠️ ทีมคลัง/สายส่งเปิดหน้ายอดขายไม่ได้ — ถ้าเด้งไปแท็บ sales เหมือนคนอื่น จะเห็นหน้าที่
     ไม่มีสิทธิ์ดูค้างอยู่ (ปุ่มแท็บซ่อนแล้วก็จริง แต่ตัว view ยังโผล่) จึงพาไปหน้าของทีมตัวเอง */
  _switchTab(tabHome(acc.role));
}
function logout(){S.user=null;_switchTab("sales");document.getElementById("app").classList.add("hidden");
  document.getElementById("login").classList.remove("hidden");
  document.getElementById("p").value="";}
document.getElementById("p").addEventListener("keydown",e=>{if(e.key==="Enter")doLogin();});`;

const LOGIN_API = `/* ====================== LOGIN (server API) ====================== */
async function doLogin(){
  const u=document.getElementById("u").value.trim().toLowerCase();const p=document.getElementById("p").value;
  const err=document.getElementById("loginErr");err.textContent="กำลังเข้าสู่ระบบ...";
  try{
    const r=await fetch("/api/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({user:u,pass:p})});
    if(!r.ok){const e=await r.json().catch(()=>({}));err.textContent=e.error||"เข้าสู่ระบบไม่สำเร็จ";return;}
    const d=await r.json();
    /* เว็บแอดมินรับแต่บัญชี manager — ปฏิเสธก่อนเก็บ token (เซลล์ที่ล็อกอินเว็บเดิมค้างไว้ในเครื่องนี้ต้องไม่หลุด) */
    if(!siteRoleOk(d.role,u)){err.textContent=siteRoleMsg();return;}
    TOKEN=d.token;S.user={id:u,role:d.role,code:d.code,name:d.name};
    localStorage.setItem("bd_token",TOKEN);localStorage.setItem("bd_user",JSON.stringify(S.user));err.textContent="";await afterLogin();
  }catch(ex){err.textContent="เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: "+ex.message;}
}
async function afterLogin(){
  const acc=S.user;
  document.getElementById("login").classList.add("hidden");document.getElementById("app").classList.remove("hidden");
  document.getElementById("uName").textContent=acc.name;
  document.getElementById("uRole").textContent=bdRoleOf(S.user);
  document.getElementById("uAv").textContent=bdAvOf(S.user);
  if(acc.role==="sales"){S.scope="me";setSeg("scopeSeg","s","me");}
  document.querySelectorAll(".admin-upload").forEach(e=>e.style.display=acc.role==="manager"?"":"none");
  document.querySelectorAll(".sales-only").forEach(e=>e.style.display=acc.role==="sales"?"":"none");
  bdKeepAlive();   /* ต่ออายุ token เองตลอด — แท็บที่เปิดค้างไว้จะได้ไม่หมดอายุกลางคัน */
  await loadData();
}
async function loadData(){
  try{
    const r=await fetch("/api/data",{headers:{"Authorization":"Bearer "+TOKEN}});
    if(r.status===401){logout();return;}
    const d=await r.json();
    if(d&&d.DATA){DATA=d.DATA;STORE=d.STORE||{months:[],stores:[]};KPI=d.KPI||{months:[],lines:{},data:{},meta:{},del:{},workdays:26};ORDERS=d.ORDERS||{dates:[],data:{},names:{}};STOCKD=d.STOCKD||{date:null,rows:[],names:{}};REQUESTS=d.REQUESTS||{data:{}};MASTER=d.MASTER||{items:{}};ANALYTICS=d.ANALYTICS||{months:[],lines:{},data:{}};STOREPROD=d.STOREPROD||{months:[],cat:{},stores:{},data:{}};STOREDAILY=d.STOREDAILY||{data:{}};PSTORE=d.PSTORE||{rounds:{}};EB2B=d.EB2B||{asof:null,up:0,lines:{},data:{}};POSTATUS=d.POSTATUS||{dates:[],data:{}};LEADS=d.LEADS||{meta:{},sales:{},del:{}};DCI=d.DCI||{periods:[],data:{}};MINSTOCK=d.MINSTOCK||{man:{}};PLAN=d.PLAN||{items:{},done:{},del:{}};PROMO=d.PROMO||{items:{},res:{},del:{},sales:{}};PJP=d.PJP||{out:{},plan:{},done:{},cfg:{}};CSTOCK=d.CSTOCK||{lots:{},del:{},slips:{},sdel:{},ex:{},up:0};PSI=d.PSI||{rows:{},days:{},up:0};}
    LEADSRAW=[];LEADSLOADED=false;   /* shop applications are re-fetched per session */
    if(!DATA.focus_order||!DATA.focus_order.length)DATA.focus_order=["209611","209612","209613","209614","209615","209616","209617","209619","209622","2096_97","209698","209699"];
    buildStoreIdx();initKeys();render();initKPI();initOrder();initAnalytics();initPlan();initPromo();initPjp();navReset();
    try{cstImport();}catch(e){console.error("cstImport",e);}   /* นำเข้าลอตเก่า 4 ใบ ครั้งเดียว (ดูหมายเหตุที่ cstImpDefs) */
    _switchTab(tabHome());   /* never leave the previous user's tab (incl. manager-only ones) open */
  }catch(ex){alert("โหลดข้อมูลจากเซิร์ฟเวอร์ไม่ได้: "+ex.message);}
}
function logout(){S.user=null;TOKEN=null;_switchTab("sales");localStorage.removeItem("bd_token");localStorage.removeItem("bd_user");
  document.getElementById("app").classList.add("hidden");document.getElementById("login").classList.remove("hidden");document.getElementById("p").value="";}
let _syncTimer=null;
function syncToServer(){ if(!TOKEN)return;ulog("☁️ เตรียมบันทึกขึ้นเซิร์ฟเวอร์กลาง...");clearTimeout(_syncTimer);_syncTimer=setTimeout(()=>_doSync(0),700);}
/* เพดานคำขอของ Vercel อยู่ที่ ~4.5 MB (หลังบีบอัด) — เตือนก่อนถึง ไม่ใช่รอให้ส่งไม่ได้แล้วค่อยรู้ */
const SAVE_CAP=4.5e6,SAVE_WARN=3.0e6,SAVE_MAX=4.2e6;
function _mb(n){return (n/1048576).toFixed(2)+" MB";}
/* ส่วนไหนใหญ่ — คิดเฉพาะตอนใกล้เต็ม เพราะต้อง stringify ซ้ำอีกรอบ */
function _bigSecs(o){
  const a=[];for(const k in o){try{a.push([k,JSON.stringify(o[k]||null).length]);}catch(e){}}
  return a.sort((x,y)=>y[1]-x[1]).slice(0,4).map(x=>x[0]+" "+_mb(x[1])).join(" · ");
}
async function _doSync(try2){
  if(!TOKEN)return;
  const SEC={DATA,STORE,KPI,ORDERS,STOCKD,REQUESTS,MASTER,ANALYTICS,STOREPROD,STOREDAILY,
             PSTORE,EB2B,POSTATUS,LEADS,DCI,MINSTOCK,PLAN,PROMO,PJP,CSTOCK,PSI};
  try{
    const payload=JSON.stringify(SEC);
    let body=payload,gz=0,headers={"Content-Type":"application/json","Authorization":"Bearer "+TOKEN};
    /* gzip to stay under the serverless request-size limit (~4.5MB); 8-9MB -> ~1.5MB */
    try{if(typeof CompressionStream!=="undefined"){const cs=new Blob([payload]).stream().pipeThrough(new CompressionStream("gzip"));body=await new Response(cs).arrayBuffer();gz=1;headers={"Content-Type":"application/octet-stream","x-body-gzip":"1","Authorization":"Bearer "+TOKEN};}}catch(e){}
    const n=gz?body.byteLength:payload.length;
    /* เบราว์เซอร์ที่บีบอัดไม่ได้ จะส่งของดิบซึ่งใหญ่กว่า 5-6 เท่า — ต้องรู้ตัว ไม่ใช่เงียบ */
    if(!gz&&!try2)ulog("⚠️ เบราว์เซอร์นี้บีบอัดข้อมูลไม่ได้ ถ้าบันทึกไม่ผ่าน ให้ลองใช้ Chrome");
    if(n>=SAVE_WARN&&!try2)
      ulog("⚠️ ข้อมูลเริ่มใหญ่ "+_mb(n)+" จากที่รับได้ "+_mb(SAVE_CAP)+" — ส่วนที่ใหญ่สุด: "+_bigSecs(SEC));
    const r=await fetch("/api/save",{method:"POST",headers,body});
    if(r.ok){ulog("✅ บันทึกขึ้นเซิร์ฟเวอร์กลางแล้ว ("+_mb(n)+") — ทุกคนจะเห็นเมื่อรีเฟรช");return;}
    const e=await r.json().catch(()=>({}));
    if(r.status===413||n>=SAVE_MAX){
      ulog("⛔ ข้อมูลใหญ่เกินกว่าที่ส่งได้ ("+_mb(n)+" จากเพดาน "+_mb(SAVE_CAP)+") — อย่าเพิ่งปิดหน้านี้ "+
        "ไฟล์ที่เพิ่งอ่านยังไม่ถูกบันทึก · ส่วนที่ใหญ่สุด: "+_bigSecs(SEC));return;}
    /* 5xx หรือเน็ตสะดุด = ลองใหม่ได้ (เซิร์ฟเวอร์รวมข้อมูลทีละคีย์ ส่งซ้ำจึงไม่ทำให้อะไรซ้อน)
       ส่วน 401/403/409 เป็นคำตอบที่ชัดแล้ว ส่งซ้ำไปก็ได้คำตอบเดิม */
    if(r.status>=500&&!try2){ulog("↻ บันทึกไม่ผ่าน กำลังลองใหม่อีกครั้ง...");
      return void setTimeout(()=>_doSync(1),1500);}
    ulog("⚠️ บันทึกไม่สำเร็จ: "+(e.error||("HTTP "+r.status))+" — อย่าเพิ่งปิดหน้านี้ แล้วลองอัปโหลดไฟล์เดิมซ้ำ");
  }catch(ex){
    if(!try2){ulog("↻ เชื่อมต่อไม่ได้ กำลังลองใหม่อีกครั้ง...");return void setTimeout(()=>_doSync(1),1500);}
    ulog("⚠️ เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: "+ex.message+" — อย่าเพิ่งปิดหน้านี้ แล้วลองอัปโหลดไฟล์เดิมซ้ำ");
  }
}
document.getElementById("p").addEventListener("keydown",e=>{if(e.key==="Enter")doLogin();});
window.addEventListener("DOMContentLoaded",()=>{const t=localStorage.getItem("bd_token"),u=localStorage.getItem("bd_user");if(t&&u){try{const su=JSON.parse(u);
  /* เปิดเว็บแอดมินด้วยบัญชีเซลล์ที่จำไว้ = ค้างที่หน้าล็อกอินพร้อมบอกเหตุผล ไม่ลบ token ของเว็บเดิม */
  if(!siteRoleOk(su&&su.role,su&&su.id)){document.getElementById("loginErr").textContent=siteRoleMsg();return;}
  TOKEN=t;S.user=su;afterLogin();}catch(e){logout();}}});`;

s = must(s, LOGIN_BLOCK, "LOGIN block").replace(LOGIN_BLOCK, LOGIN_API);

// remove standalone syncToServer stub (now defined in API section)
s = must(s, "function syncToServer(){} /* stub for standalone; overridden by API build */", "syncToServer stub")
  .replace("function syncToServer(){} /* stub for standalone; overridden by API build */", "/* syncToServer in API section */");

if (/__[A-Z]+DATA__/.test(s)) throw new Error("server: leftover data placeholder");

// 🔒 ตัดคอมเมนต์ออกก่อนเขียนลง public/ — ต้นฉบับยังมีครบ
const raw = s.length;
const cleaned = cleanDoc(s, "index.html");
s = cleaned.text;
fs.writeFileSync(path.join(ROOT, "public", "index.html"), s);

console.log("OK server bytes=" + s.length + " -> public/index.html" +
  "  (ตัดคอมเมนต์ " + Math.round((raw - s.length) / 1024) + " KB · ตรวจสคริปต์ " + cleaned.scripts + " ก้อน)");

// ---------- ADMIN SITE (/admin) ----------
// เจ้าของสั่ง 10 พ.ย. 69: แยกเว็บแอดมินออกจากเว็บทีมขาย แต่ข้อมูลยังเชื่อมกัน
// = ไฟล์เดียวกันทุกบรรทัด ต่างกันแค่ธง BD_SITE (template เลือกแท็บ/หน้าตา/สิทธิ์ล็อกอินจากธงนี้)
// ใช้ /api ชุดเดียวกัน ข้อมูลก้อนเดียวกัน — ไม่มีโค้ดแยก ไม่มีข้อมูลแยก ให้ดูแลคู่กัน
const SITE_FLAG = 'const BD_SITE="main";';
if (s.split(SITE_FLAG).length !== 2) throw new Error("ANCHOR NOT FOUND: BD_SITE flag (must appear exactly once)");
const TITLE = "<title>BD Sales Dashboard</title>";
if (s.split(TITLE).length !== 2) throw new Error("ANCHOR NOT FOUND: <title> (must appear exactly once)");
const a = s.replace(SITE_FLAG, 'const BD_SITE="admin";').replace(TITLE, "<title>BD Admin</title>");
fs.writeFileSync(path.join(ROOT, "public", "admin.html"), a);

console.log("OK admin bytes=" + a.length + " -> public/admin.html");

// ---------- หน้าสาธารณะที่เขียนมือ: src/*.html -> public/*.html (ตัดคอมเมนต์เหมือนกัน) ----------
// หน้าแคตาลอคเป็นหน้าที่ "ลูกค้า" เปิดดู คอมเมนต์ในนั้นเคยอธิบายวิธีคิดกำไร/ต้นทุน
// และกลไกโปรฝั่งศูนย์ไว้ด้วย จึงต้องไม่ติดไปกับไฟล์ที่เสิร์ฟ
for (const name of ["pricelist.html", "join.html"]) {
  const src = path.join(ROOT, "src", name);
  if (!fs.existsSync(src)) throw new Error("ANCHOR NOT FOUND: src/" + name);
  const r = fs.readFileSync(src, "utf8");
  const c = cleanDoc(r, name);
  fs.writeFileSync(path.join(ROOT, "public", name), c.text);
  console.log("OK " + name + " bytes=" + c.text.length + " -> public/" + name +
    "  (ตัดคอมเมนต์ " + Math.round((r.length - c.text.length) / 1024) + " KB)");
}
