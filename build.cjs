// Build server (API-mode) public/index.html from dashboard_template.html.
// Portable: paths are relative to this file, so it runs in Claude Code / anywhere.
// Deploy = commit public/index.html (+ template) and push to main; Vercel auto-deploys.
const fs = require("fs");
const path = require("path");
const ROOT = __dirname;
const tpl = fs.readFileSync(path.join(ROOT, "dashboard_template.html"), "utf8");

function must(str, needle, label) {
  if (str.indexOf(needle) < 0) { throw new Error("ANCHOR NOT FOUND: " + label); }
  return str;
}

// ---------- SERVER ----------
let s = tpl;
// data placeholders -> empty server defaults (real data comes from /api/data)
s = must(s, "const DATA = __SALESDATA__;", "DATA decl")
  .replace("const DATA = __SALESDATA__;",
    'let DATA = {lines:{},monthly:{},daily:{},focus_order:["209611","209612","209613","209614","209615","209616","209617","209619","209622","2096_97","209698","209699"]};');
s = must(s, "let STORE = __STOREDATA__;", "STORE decl")
  .replace("let STORE = __STOREDATA__;", "let STORE = {months:[],stores:[]};\nlet TOKEN=null;");
s = s.replace("let KPI = __KPIDATA__;", "let KPI = {months:[],lines:{},data:{},workdays:26};")
     .replace("let ORDERS = __ORDERDATA__;", "let ORDERS = {dates:[],data:{},names:{}};")
     .replace("let STOCKD = __STOCKDATA__;", "let STOCKD = {date:null,rows:[],names:{}};")
     .replace("let REQUESTS = __REQDATA__;", "let REQUESTS = {data:{}};")
     .replace("let MASTER = __MASTERDATA__;", "let MASTER = {items:{}};")
     .replace("let ANALYTICS = __ANALYTICSDATA__;", "let ANALYTICS = {months:[],lines:{},data:{}};")
     .replace("let STOREPROD = __STOREPRODDATA__;", "let STOREPROD = {months:[],cat:{},stores:{},data:{}};")
     .replace("let STOREDAILY = __STOREDAILYDATA__;", "let STOREDAILY = {data:{}};");
s = must(s, "let PSTORE = __PSTOREDATA__;", "PSTORE decl")
  .replace("let PSTORE = __PSTOREDATA__;", "let PSTORE = {rounds:{}};");
s = must(s, "let EB2B = __EB2BDATA__;", "EB2B decl")
  .replace("let EB2B = __EB2BDATA__;", "let EB2B = {asof:null,up:0,lines:{},data:{}};");
s = must(s, "let POSTATUS = __POSTATUSDATA__;", "POSTATUS decl")
  .replace("let POSTATUS = __POSTATUSDATA__;", "let POSTATUS = {dates:[],data:{}};");

// accounts -> server side
const ACC_BLOCK = `/* ====================== ACCOUNTS ====================== */
/* v1 simple client-side auth. username = display code, password = code(lower)+"@bd" */
const ACCOUNTS={"manager":{pass:"bd@admin",role:"manager",name:"ผู้จัดการฝ่ายขาย"}};
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
  document.getElementById("uRole").textContent=acc.role==="manager"?"เห็นข้อมูลทุกสาย":"เซลล์";
  document.getElementById("uAv").textContent=(acc.role==="manager"?"M":acc.name.substring(0,2)).toUpperCase();
  /* sales default to own line view; manager sees team */
  if(acc.role==="sales"){S.scope="me";setSeg("scopeSeg","s","me");}
  document.querySelectorAll(".admin-upload").forEach(e=>e.style.display=acc.role==="manager"?"":"none");
  initKeys();render();initKPI();initOrder();initAnalytics();navReset();
  _switchTab("sales");   /* never leave the previous user's tab (incl. manager-only ones) open */
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
    const d=await r.json();TOKEN=d.token;S.user={id:u,role:d.role,code:d.code,name:d.name};
    localStorage.setItem("bd_token",TOKEN);localStorage.setItem("bd_user",JSON.stringify(S.user));err.textContent="";await afterLogin();
  }catch(ex){err.textContent="เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: "+ex.message;}
}
async function afterLogin(){
  const acc=S.user;
  document.getElementById("login").classList.add("hidden");document.getElementById("app").classList.remove("hidden");
  document.getElementById("uName").textContent=acc.name;
  document.getElementById("uRole").textContent=acc.role==="manager"?"เห็นข้อมูลทุกสาย":"เซลล์";
  document.getElementById("uAv").textContent=(acc.role==="manager"?"M":(acc.name||"").substring(0,2)).toUpperCase();
  if(acc.role==="sales"){S.scope="me";setSeg("scopeSeg","s","me");}
  document.querySelectorAll(".admin-upload").forEach(e=>e.style.display=acc.role==="manager"?"":"none");
  await loadData();
}
async function loadData(){
  try{
    const r=await fetch("/api/data",{headers:{"Authorization":"Bearer "+TOKEN}});
    if(r.status===401){logout();return;}
    const d=await r.json();
    if(d&&d.DATA){DATA=d.DATA;STORE=d.STORE||{months:[],stores:[]};KPI=d.KPI||{months:[],lines:{},data:{},workdays:26};ORDERS=d.ORDERS||{dates:[],data:{},names:{}};STOCKD=d.STOCKD||{date:null,rows:[],names:{}};REQUESTS=d.REQUESTS||{data:{}};MASTER=d.MASTER||{items:{}};ANALYTICS=d.ANALYTICS||{months:[],lines:{},data:{}};STOREPROD=d.STOREPROD||{months:[],cat:{},stores:{},data:{}};STOREDAILY=d.STOREDAILY||{data:{}};PSTORE=d.PSTORE||{rounds:{}};EB2B=d.EB2B||{asof:null,up:0,lines:{},data:{}};POSTATUS=d.POSTATUS||{dates:[],data:{}};}
    if(!DATA.focus_order||!DATA.focus_order.length)DATA.focus_order=["209611","209612","209613","209614","209615","209616","209617","209619","209622","2096_97","209698","209699"];
    buildStoreIdx();initKeys();render();initKPI();initOrder();initAnalytics();navReset();
    _switchTab("sales");   /* never leave the previous user's tab (incl. manager-only ones) open */
  }catch(ex){alert("โหลดข้อมูลจากเซิร์ฟเวอร์ไม่ได้: "+ex.message);}
}
function logout(){S.user=null;TOKEN=null;_switchTab("sales");localStorage.removeItem("bd_token");localStorage.removeItem("bd_user");
  document.getElementById("app").classList.add("hidden");document.getElementById("login").classList.remove("hidden");document.getElementById("p").value="";}
let _syncTimer=null;
function syncToServer(){ if(!TOKEN)return;ulog("☁️ เตรียมบันทึกขึ้นเซิร์ฟเวอร์กลาง...");clearTimeout(_syncTimer);_syncTimer=setTimeout(_doSync,700);}
async function _doSync(){
  if(!TOKEN)return;
  try{
    const payload=JSON.stringify({DATA,STORE,KPI,ORDERS,STOCKD,REQUESTS,MASTER,ANALYTICS,STOREPROD,STOREDAILY,PSTORE,EB2B,POSTATUS});
    let body=payload,headers={"Content-Type":"application/json","Authorization":"Bearer "+TOKEN};
    /* gzip to stay under the serverless request-size limit (~4.5MB); 8-9MB -> ~1.5MB */
    try{if(typeof CompressionStream!=="undefined"){const cs=new Blob([payload]).stream().pipeThrough(new CompressionStream("gzip"));body=await new Response(cs).arrayBuffer();headers={"Content-Type":"application/octet-stream","x-body-gzip":"1","Authorization":"Bearer "+TOKEN};}}catch(e){}
    const r=await fetch("/api/save",{method:"POST",headers,body});
    if(r.ok)ulog("✅ บันทึกขึ้นเซิร์ฟเวอร์กลางแล้ว — ทุกคนจะเห็นเมื่อรีเฟรช");
    else{const e=await r.json().catch(()=>({}));ulog("⚠️ บันทึกไม่สำเร็จ: "+(e.error||("HTTP "+r.status)));}
  }catch(ex){ulog("⚠️ เชื่อมต่อเซิร์ฟเวอร์ไม่ได้: "+ex.message);}
}
document.getElementById("p").addEventListener("keydown",e=>{if(e.key==="Enter")doLogin();});
window.addEventListener("DOMContentLoaded",()=>{const t=localStorage.getItem("bd_token"),u=localStorage.getItem("bd_user");if(t&&u){try{TOKEN=t;S.user=JSON.parse(u);afterLogin();}catch(e){logout();}}});`;

s = must(s, LOGIN_BLOCK, "LOGIN block").replace(LOGIN_BLOCK, LOGIN_API);

// remove standalone syncToServer stub (now defined in API section)
s = must(s, "function syncToServer(){} /* stub for standalone; overridden by API build */", "syncToServer stub")
  .replace("function syncToServer(){} /* stub for standalone; overridden by API build */", "/* syncToServer in API section */");

if (/__[A-Z]+DATA__/.test(s)) throw new Error("server: leftover data placeholder");
fs.writeFileSync(path.join(ROOT, "public", "index.html"), s);

console.log("OK server bytes=" + s.length + " -> public/index.html");
