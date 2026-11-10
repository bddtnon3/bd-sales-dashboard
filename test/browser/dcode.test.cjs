/* 🛠 เว็บแอดมิน (/admin) + 🧾 DCODE — ไฟล์อัพสร้างออเดอร์ทีละหลายรายการ (เจ้าของสั่ง 10 พ.ย. 69)
 *
 * *"สร้างเวปแยกใช้งานกันระหว่างเซลล์และแอดมิน แต่ข้อมูลยังส่งเชื่อมกันได้อยู่ โดยเวปเดิมเป็นของเซลล์
 *  เวปใหม่จะเป็นของแอดมิน โดยเวปแอดมินจะเอาแค่หัวข้อ ยอดขาย การสั่งของ สต็อค ปฏิทิน … และเพิ่ม
 *  หัวข้อนึงเข้าไปหน่อย นั่นคือ DCODE"*
 *
 * สิ่งที่ต้องพิสูจน์:
 *  1) เว็บแอดมินมีแค่ 4 หัวข้อ + DCODE (แท็บย่อยในกลุ่มยังอยู่ครบ) · เว็บเดิมเหมือนเดิมทุกอย่าง
 *  2) เว็บแอดมินเข้าได้เฉพาะบัญชี manager — และปฏิเสธเซลล์ "โดยไม่ล็อกเอาต์เซลล์ออกจากเว็บเดิม"
 *  3) Master Outlet: เก็บเลข PJP (AC) + รหัสพนักงาน (Y) · อัพซ้ำแล้วร้านเดิม "อัพเดตจริง"
 *  4) PJP ↔ สาย: จับจากรหัสพนักงานก่อน (CT12 เปลี่ยนคนแล้ว ชื่อไม่ตรง) แล้วค่อยชื่อ
 *  5) ตารางกรอก: เลือกร้านแล้วสายขึ้นเอง · คัดลอกแถว · ติ๊กหลายแถวแล้วปรับทีเดียว
 *  6) ตรวจก่อนสร้างไฟล์: ขาดอะไร = ไม่สร้าง · น่าสงสัย = ถามก่อน
 *  7) ไฟล์ที่ได้ = template เดิมของ dcode (ชีต หัวตาราง สไตล์ คอลัมน์ข้อความ "@") อ่านกลับได้ครบ
 *  8) 🛟 หน้านี้ไม่เขียนข้อมูลกลางเลยสักไบต์ — ฉบับร่างอยู่ในเครื่อง (localStorage) เท่านั้น
 *
 * ไฟล์ร้านลูกค้าจริงไม่อยู่ใน repo (ชื่อ ที่อยู่ พิกัด) — เทสนี้สร้างไฟล์ตัวอย่างเอง
 * ถ้าอยากเทสกับไฟล์จริงด้วย: DCODE_OUTLET=/path/Master_Outlet_Data.xlsx node test/browser/dcode.test.cjs
 * (หรือวางไว้ที่ test/browser/fixtures/master-outlet-nov2026.xlsx ซึ่งอยู่ใน .gitignore แล้ว)
 *
 * ต้องติดตั้งก่อน:  npm i --no-save playwright-core xlsx
 * แล้วรัน:  node build.cjs && node test/browser/dcode.test.cjs
 */
const fs=require('fs');const path=require('path');const os=require('os');const crypto=require('crypto');
const {chromium}=require('playwright-core');
const XLSX=require('xlsx');
const BROWSER=require('./_chrome.cjs').chromePath();
const ROOT=path.resolve(__dirname,'..','..');
const ORIGIN='https://bd-dcode.test/';
const REAL=[process.env.DCODE_OUTLET,path.join(__dirname,'fixtures','master-outlet-nov2026.xlsx')]
  .filter(f=>f&&fs.existsSync(f))[0]||null;

/* หัวคอลัมน์จริงของไฟล์ Master Outlet Data (10 พ.ย. 69) — A=ลูกค้า … Y=พนักงานข Z=ชื่อพนักงานขาย AC=PJP */
const HDR=['ลูกค้า','ชื่อ','ถนน','Longitude','Latitude','ภูมิภาค','โทรศั','มือถือ','บุคคลที่ติดต่อ','กลุ่มร้านค้า',
  'ชื่อประเภทลูกค้า','ประเภทร้านค้า','ชื่อประเภทย่อยของลูกค้า','Perfect Store','Perfect Store Description',
  'ข้อความที่ใช้ค้นหา11','บ้านเลขที่','ระยะเวลาในการส่งของ (วัน)','เงื่อนไขการชำระเงิน','เงื่อนไขการชำระเงิน',
  'สถานที่ส่งของ','รูปแบบตรวจสอบ Perfect Store','รูปแบบตรวจสอบ Perfect Store','สร้างเมื่อ','พนักงานข',
  'ชื่อพนักงานขาย','ศูนย์ที่จัดส่ง','สถานะ','PJP','วงเงินสินเชื่อ','หมายเลข VA','การจัดกลุ่มร้า',
  'การจัดกลุ่มร้านค้า','Geo District','Geo District Name','อำเภอ','อำเภอทางภูมิศ','รหัสไปรษณีย์','eRTM','LMT Flag'];
function oRow(code,name,o){o=o||{};const r=new Array(HDR.length).fill('');
  r[0]=code;r[1]=name;r[2]='1/1 ม.1';r[3]=o.lo==null?100.4:o.lo;r[4]=o.la==null?13.9:o.la;
  r[24]=o.emp?'/'+o.emp+'/':'';r[25]=o.sal?'/'+o.sal+'/':'';r[27]=o.st||'Active';r[28]=o.pj?'/'+o.pj+'/':'';
  r[35]='3603';r[36]=o.d||'อ.บางใหญ่';return r;}
function book(rows,hdr){const ws=XLSX.utils.aoa_to_sheet([hdr||HDR].concat(rows));const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Sheet1');return [...XLSX.write(wb,{type:'buffer',bookType:'xlsx'})];}
/* ร้านตัวอย่าง (ชื่อสมมติ) — โครงเหมือนไฟล์จริง: 1 PJP = 1 เซลล์ · รหัสร้านซ้ำ 1 รหัส (แถวแรกไม่มี PJP) */
const OUT1=book([
  oRow('2000001','ร้านทดสอบ หนึ่ง',{emp:'16956',sal:'เอกรัตน์ 0954924393',pj:'401842'}),
  oRow('2000002','ร้านทดสอบ สอง',{emp:'16952',sal:'การัณยภาส 0972384393',pj:'401728',d:'อ.ปากเกร็ด'}),
  oRow('2000003','ร้านปิดแล้ว',{st:'Inactive'}),
  oRow('2000004','ร้านซ้ำ สาขา',{la:0,lo:0}),
  oRow('2000004','ร้านซ้ำ สาขา',{emp:'16951',sal:'ชลศิต 0971104393',pj:'401727'}),
  oRow('2000005','มินิมาร์ท จับชื่อ',{emp:'99999',sal:'ฟาตีมา 0864902439',pj:'319013'}),
  oRow('2000006','ร้านสายลึกลับ',{emp:'88888',sal:'สมชาย 0800000000',pj:'777777'}),
]);
/* อัพรอบสอง: ร้าน 2000001 ย้ายไปสาย CT11 + เปลี่ยนชื่อ · ร้าน 2000002 ไม่อยู่ในไฟล์ · ไม่มีร้านใหม่เลย */
const OUT2=book([
  oRow('2000001','ร้านทดสอบ หนึ่ง (ย้ายสาย)',{emp:'16951',sal:'ชลศิต 0971104393',pj:'401727'}),
  oRow('2000003','ร้านปิดแล้ว',{st:'Inactive'}),
]);
/* ไฟล์ที่ไม่มีคอลัมน์ Y (พนักงานข) — ต้องไม่เอาชื่อเซลล์ (Z) มาเป็นรหัสพนักงาน */
const HDR_NOY=HDR.map((h,i)=>i===24?'อื่นๆ':h);
const OUT_NOY=book([oRow('2000009','ร้านไม่มีคอลัมน์ Y',{emp:'11111',sal:'ปวีณา 0955384393',pj:'401841'})],HDR_NOY);

const LINES={"209611":{display:"CT11",name:"ชลศิต",emp:"16951"},"209612":{display:"CT12",name:"ธนพัต",emp:"16952"},
 "209613":{display:"CT13",name:"ปฐมภพ",emp:"16953"},"209614":{display:"CT14",name:"ปราโมทย์",emp:"16954"},
 "209615":{display:"CT15",name:"ปวีณา",emp:"16955"},"209616":{display:"CT16",name:"เอกรัตน์",emp:"16956"},
 "209617":{display:"CT17",name:"สุริยา",emp:"17463"},"209619":{display:"CT19",name:"ฟาตีมา",emp:"24616"},
 "209622":{display:"CT22",name:"ไพศาล แซ่ตั้ง",emp:"42836"},"209698":{display:"KA98",name:"อับดุลเลาะห์",emp:"19481"},
 "209699":{display:"KA99",name:"กัญญสิริ",emp:"16957"},"2096_97":{display:"KA97",name:"เกษชญานิษฐ์",emp:"22812"}};
const ORDER=["209611","209612","209613","209614","209615","209616","209617","209619","209622","2096_97","209698","209699"];

function seed(a){
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};window.__log=[];window.ulog=m=>window.__log.push(String(m));
  window.__alerts=[];window.alert=m=>window.__alerts.push(String(m));
  window.__conf=[];window.__confAns=true;window.confirm=m=>{window.__conf.push(String(m));return window.__confAns;};
  window.__sync=0;window.syncToServer=()=>{window.__sync++;};
  TOKEN=null;S.user={id:a.user||'admin1',role:'manager',name:'แอดมิน 1'};
  document.querySelectorAll('.admin-upload').forEach(e=>e.style.display='');
  DATA={lines:JSON.parse(JSON.stringify(a.LINES)),focus_order:a.ORDER.slice(),daily:{},monthly:{}};
  STORE={months:[],stores:[]};KPI={months:[],lines:{},data:{},meta:{},del:{}};ANALYTICS={months:[],lines:{},data:{}};
  STOREPROD={months:[],cat:{},stores:{},data:{}};STOREDAILY={data:{}};PSTORE={rounds:{}};
  EB2B={asof:null,up:0,lines:{},data:{}};LEADS={meta:{},sales:{},del:{}};DCI={periods:[],data:{}};MINSTOCK={man:{}};
  PLAN={items:{},done:{},del:{}};PROMO={items:{},res:{},del:{}};PJP={out:{},plan:{},done:{},cfg:{}};
  ORDERS={dates:[],data:{},names:{"68000001":"ซันซิล แชมพู 320 มล. (ชื่อจากใบสั่ง)"},cat:{},catN:{}};
  POSTATUS={dates:["2026-11-09"],data:{"2026-11-09":{up:1,items:{},all:"68000001,67000001",allSeq:1}}};
  STOCKD={date:'2026-11-09',rows:[{c:'67000001',n:'บรีส เอกเซล 800ก',wh:'sale',i:120},{c:'61000001',n:'โดฟ สบู่ 90ก',wh:'sale',i:8},
    {c:'61000001',n:'โดฟ สบู่ 90ก',wh:'gift',i:500}],names:{}};
  MASTER={items:{"67000001":"บรีส เอกเซล ผงซักฟอก 800 กรัม","61000001":"โดฟ สบู่ 90 ก.","0123":"สินค้ารหัสขึ้นต้นศูนย์"},up:1000};
  REQUESTS={data:{}};CSTOCK={lots:{},del:{},slips:{},sdel:{},ex:{},up:0};
}
const STATE=`JSON.stringify({DATA,STORE,KPI,ORDERS,STOCKD,REQUESTS,MASTER,ANALYTICS,STOREPROD,STOREDAILY,
  PSTORE,EB2B,POSTATUS,LEADS,DCI,MINSTOCK,PLAN,PROMO,PJP,CSTOCK})`;

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:1366,height:900},acceptDownloads:true});
 const pg=await ctx.newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 /* alert ของจริง (ก่อน seed) — เก็บไว้ดูว่าหน้าเว็บฟ้องอะไร แล้วปิดให้ */
 const dialogs=[];pg.on('dialog',d=>{dialogs.push(d.type()+':'+d.message());d.dismiss().catch(()=>{});});
 const page=f=>fs.readFileSync(path.join(ROOT,'public',f),'utf8');
 let SERVE='admin.html';
 const API={login:null,data:null,calls:[]};
 await ctx.route(ORIGIN+'**',r=>{const u=r.request().url();
   if(u.endsWith('/vendor/jszip.min.js'))
     return r.fulfill({status:200,contentType:'application/javascript',body:fs.readFileSync(path.join(ROOT,'public','vendor','jszip.min.js'))});
   if(u.indexOf('/api/')>=0){API.calls.push(u.replace(ORIGIN,'/'));
     if(u.endsWith('/api/login'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(API.login)});
     if(u.endsWith('/api/data'))return r.fulfill({status:200,contentType:'application/json',body:JSON.stringify(API.data||{})});
     return r.fulfill({status:200,contentType:'application/json',body:'{"ok":true}'});}
   return r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:page(SERVE)});});
 /* ไลบรารีจาก CDN → ใช้ของในเครื่อง (เทสไม่พึ่งอินเทอร์เน็ต) */
 await ctx.route('https://cdnjs.cloudflare.com/**',r=>{const u=r.request().url();
   if(/xlsx/.test(u))return r.fulfill({status:200,contentType:'application/javascript',
     body:fs.readFileSync(require.resolve('xlsx/dist/xlsx.full.min.js'))});
   return r.fulfill({status:200,contentType:'application/javascript',body:'window.Chart=function(){return{destroy(){}}};'});});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);
 const go=async(f)=>{SERVE=f;await pg.goto(ORIGIN+(f==='admin.html'?'admin':''));};

 /* ==========================================================================
  * 1) เว็บแอดมิน = 4 หัวข้อ + DCODE · เว็บเดิมเหมือนเดิม
  * ======================================================================== */
 await go('admin.html');
 const ad=await ev(()=>({site:BD_SITE,title:document.title,login:document.querySelector('#login .brand').textContent,
   join:(document.getElementById('loginJoin')||{}).getAttribute&&document.getElementById('loginJoin').getAttribute('href')}));
 t('🛠 public/admin.html เป็นเว็บแอดมิน (ธง BD_SITE="admin")',ad.site==='admin',ad.site);
 t('...ชื่อแท็บเบราว์เซอร์ "BD Admin" และหน้าล็อกอินบอกว่าเป็นเว็บแอดมิน',ad.title==='BD Admin'&&/Admin/.test(ad.login),ad.title+' | '+ad.login);
 t('...หน้าล็อกอินมีลิงก์กลับเว็บทีมขาย (แทนลิงก์สมัครร้าน)',ad.join==='/',ad.join);
 await ev(seed,{LINES,ORDER});
 const tabsA=await ev(()=>{renderTabs();
   const top=[...document.querySelectorAll('#tabTop .tab')].map(b=>b.dataset.grp);
   const subs={};top.forEach(k=>{const g=TAB_GROUPS.filter(x=>x.k===k)[0];subs[k]=g.tabs.filter(tabOk).map(x=>x.t);});
   return {top:top,subs:subs};});
 t('🛠 เว็บแอดมินมีแค่ ยอดขาย · การสั่งของ · สต็อก · ปฏิทิน + DCODE (เรียงตามนี้)',
   tabsA.top.join(',')==='sales,order,stock,plan,dcode',tabsA.top.join(','));
 t('...แท็บย่อยในกลุ่มยังอยู่ครบเหมือนเว็บเดิม ("เอาให้ข้อมูลเหมือนเดิมให้หมด")',
   tabsA.subs.sales.join(',')==='sales,ana'&&tabsA.subs.order.join(',')==='order,pos'&&
   tabsA.subs.stock.join(',')==='stock,cstock'&&tabsA.subs.plan.join(',')==='plan'&&tabsA.subs.dcode.join(',')==='dcode',
   JSON.stringify(tabsA.subs));
 const pagesA=await ev(()=>{const bad=[];
   ['sales','ana','order','pos','stock','cstock','plan','dcode'].forEach(k=>{
     try{_switchTab(k);if(document.getElementById(k+'View').classList.contains('hidden'))bad.push(k+':ซ่อนอยู่');}
     catch(e){bad.push(k+':'+e.message);}});
   _switchTab('sales');return bad;});
 t('...ทุกหน้าใน 5 กลุ่มเปิดได้บนเว็บแอดมิน ไม่มี error',pagesA.length===0,pagesA.join(' · ')||'ok');
 const offA=await ev(()=>{_switchTab('sales');switchGroup('pjp');switchGroup('kpi');switchGroup('price');return CURTAB;});
 t('...กดกลุ่มที่ไม่ได้อยู่บนเว็บแอดมิน (PJP/KPI/ราคา) ไม่พาไปไหน',offA==='sales',offA);
 const lnA=await ev(()=>{const a=document.getElementById('siteLink');return {h:a.getAttribute('href'),t:a.textContent};});
 t('...หัวเว็บมีลิงก์ไปเว็บทีมขาย',lnA.h==='/'&&/ทีมขาย/.test(lnA.t),JSON.stringify(lnA));

 await go('index.html');
 await ev(seed,{LINES,ORDER});
 const tabsM=await ev(()=>{renderTabs();const m=[...document.querySelectorAll('#tabTop .tab')].map(b=>b.dataset.grp);
   S.user={id:'ct11',role:'sales',code:'209611',name:'CT11'};renderTabs();
   const s=[...document.querySelectorAll('#tabTop .tab')].map(b=>b.dataset.grp);
   S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};renderTabs();
   switchGroup('dcode');
   return {m:m,s:s,site:BD_SITE,title:document.title,cur:CURTAB,
     link:document.getElementById('siteLink').getAttribute('href')};});
 t('เว็บเดิม: กลุ่มแท็บเหมือนเดิมทุกกลุ่ม (9 กลุ่ม) ไม่มี DCODE',
   tabsM.m.join(',')==='sales,pjp,kpi,promo,order,stock,price,plan,shop',tabsM.m.join(','));
 t('เว็บเดิม: เซลล์ก็ไม่เห็น DCODE',tabsM.s.indexOf('dcode')<0&&tabsM.s.length>=8,tabsM.s.join(','));
 t('เว็บเดิม: กดไปกลุ่ม DCODE ไม่ได้ (อยู่บนเว็บแอดมินเท่านั้น)',tabsM.cur!=='dcode',tabsM.cur);
 t('เว็บเดิม: ธงยังเป็น "main" และชื่อเว็บเดิม',tabsM.site==='main'&&tabsM.title==='BD Sales Dashboard',tabsM.site+' | '+tabsM.title);
 t('เว็บเดิม: ผู้จัดการมีลิงก์ไปเว็บแอดมิน',tabsM.link==='/admin',tabsM.link);
 t('vercel.json ส่ง /admin ไปที่ admin.html (และยังมีแต่ rewrites)',(()=>{
   const v=JSON.parse(fs.readFileSync(path.join(ROOT,'vercel.json'),'utf8'));
   return Object.keys(v).join(',')==='rewrites'&&v.rewrites.some(r=>r.source==='/admin'&&r.destination==='/admin.html');})());
 const same=(()=>{const a=page('admin.html'),m=page('index.html');
   return a.replace('const BD_SITE="admin";','const BD_SITE="main";').replace('<title>BD Admin</title>','<title>BD Sales Dashboard</title>')===m;})();
 t('🛠 สองเว็บเป็นไฟล์เดียวกันทุกบรรทัด ต่างกันแค่ธง BD_SITE + ชื่อแท็บ (ข้อมูล/โค้ดไม่แยกกัน)',same);

 /* ==========================================================================
  * 2) ประตูเว็บแอดมิน: รับเฉพาะบัญชี manager · ปฏิเสธเซลล์โดยไม่ล็อกเอาต์จากเว็บเดิม
  * ======================================================================== */
 await go('admin.html');
 await ev(()=>{localStorage.clear();localStorage.setItem('bd_token','SALES.TOKEN');
   localStorage.setItem('bd_user',JSON.stringify({id:'ct11',role:'sales',code:'209611',name:'CT11'}));});
 await go('admin.html');   /* เปิดใหม่ = เส้นทางล็อกอินอัตโนมัติจาก token ที่จำไว้ */
 await pg.waitForTimeout(150);
 const g1=await ev(()=>({login:!document.getElementById('login').classList.contains('hidden'),
   app:!document.getElementById('app').classList.contains('hidden'),err:document.getElementById('loginErr').textContent,
   tok:localStorage.getItem('bd_token'),user:S.user,T:TOKEN}));
 t('🔒 เปิดเว็บแอดมินด้วยบัญชีเซลล์ที่จำไว้ → ค้างที่หน้าล็อกอิน พร้อมบอกเหตุผล',
   g1.login&&!g1.app&&/แอดมิน/.test(g1.err),JSON.stringify({login:g1.login,app:g1.app,err:g1.err}));
 t('🔒 ...ไม่ลบ token ของเซลล์ (ยังใช้เว็บเดิมได้ตามปกติ) และไม่ได้เอา token มาใช้',
   g1.tok==='SALES.TOKEN'&&!g1.T&&!g1.user,JSON.stringify({tok:g1.tok,T:g1.T}));
 API.login={token:'MGR.TOKEN',role:'sales',code:'209611',name:'CT11'};
 await ev(()=>{document.getElementById('u').value='ct11';document.getElementById('p').value='ct11@bd';});
 await ev(()=>doLogin());
 const g2=await ev(()=>({app:!document.getElementById('app').classList.contains('hidden'),
   err:document.getElementById('loginErr').textContent,tok:localStorage.getItem('bd_token'),T:TOKEN}));
 t('🔒 ล็อกอินเว็บแอดมินด้วยรหัสเซลล์ (รหัสถูก) → ไม่ให้เข้า',!g2.app&&/แอดมิน/.test(g2.err)&&!g2.T,JSON.stringify(g2));
 t('🔒 ...และไม่เขียน token ทับของเดิมในเครื่อง',g2.tok==='SALES.TOKEN',g2.tok);
 API.login={token:'MGR.TOKEN',role:'manager',name:'แอดมิน 1'};
 API.data={DATA:{lines:LINES,focus_order:ORDER,monthly:{"2026-10":{"209611":{target:100,niv:50}}},
   daily:{"2026-11-09":{"209611":10}}},PJP:{out:{},plan:{},done:{},cfg:{}}};
 await ev(()=>{document.getElementById('u').value='admin1';document.getElementById('p').value='bd@admin1';});
 await ev(()=>doLogin());
 await pg.waitForTimeout(200);
 const g3=await ev(()=>({app:!document.getElementById('app').classList.contains('hidden'),T:TOKEN,
   who:document.getElementById('uName').textContent,tok:localStorage.getItem('bd_token'),
   tabs:[...document.querySelectorAll('#tabTop .tab')].map(b=>b.dataset.grp).join(',')}));
 t('🔓 บัญชี admin1 (สิทธิ์ manager) เข้าเว็บแอดมินได้ แล้วเห็น 5 กลุ่ม',
   g3.app&&g3.T==='MGR.TOKEN'&&g3.tabs==='sales,order,stock,plan,dcode',JSON.stringify(g3)+' '+dialogs.join(' | '));
 t('...ล็อกอินชุดเดียวกับเว็บเดิม (/api/login + /api/data ตัวเดียวกัน)',
   API.calls.indexOf('/api/login')>=0&&API.calls.indexOf('/api/data')>=0,API.calls.join(' '));
 await ev(()=>localStorage.clear());

 /* ==========================================================================
  * 3) Master Outlet: เลข PJP + รหัสพนักงาน · อัพซ้ำแล้วร้านเดิมอัพเดตจริง
  * ======================================================================== */
 await go('admin.html');
 await ev(seed,{LINES,ORDER});
 const p1=await ev(a=>{parseOutlet('Master_Outlet_Data.xlsx',new Uint8Array(a.buf).buffer);
   return {o:PJP.out,log:window.__log.join('\n'),sync:window.__sync};},{buf:OUT1});
 t('🧾 อ่านเลข PJP (คอลัมน์ AC) แล้วตัด "/" ออก → "401842"',p1.o['2000001'].pj==='401842',JSON.stringify(p1.o['2000001']));
 t('🧾 อ่านรหัสพนักงาน (คอลัมน์ Y) → "16956"',p1.o['2000001'].emp==='16956',p1.o['2000001'].emp);
 t('...ร้าน Inactive ไม่มี PJP ก็ไม่ใส่ค่าปลอม',!p1.o['2000003'].pj&&p1.o['2000003'].st==='Inactive',JSON.stringify(p1.o['2000003']));
 t('...รหัสร้านซ้ำ: เก็บแถวที่สมบูรณ์กว่า และเลข PJP ไม่หาย',p1.o['2000004'].pj==='401727'&&p1.o['2000004'].la!=null,
   JSON.stringify(p1.o['2000004']));
 t('...บันทึกบอกจำนวนร้านที่มีเลข PJP',/มีเลข PJP 5 ร้าน/.test(p1.log),p1.log);
 const noY=await ev(a=>{parseOutlet('noY.xlsx',new Uint8Array(a.buf).buffer);return PJP.out['2000009'];},{buf:OUT_NOY});
 t('⚠️ ไฟล์ที่ไม่มีคอลัมน์ "พนักงานข" → ไม่เอาชื่อเซลล์ (Z) มาเป็นรหัสพนักงาน',!noY.emp&&noY.pj==='401841',JSON.stringify(noY));
 const p2=await ev(a=>{
   PJP.out['2000002'].rt='209612';PJP.out['2000001'].rt='209616';
   let err='';try{parseOutlet('Master_Outlet_Data_v2.xlsx',new Uint8Array(a.buf).buffer);}catch(e){err=e.message;}
   return {err:err,o1:PJP.out['2000001'],o2:PJP.out['2000002']};},{buf:OUT2});
 t('🔧 อัพไฟล์ Master Outlet ซ้ำโดยไม่มีร้านใหม่เลย → ไม่ขึ้น "ไม่พบรหัสร้านในไฟล์" (บั๊กเดิม)',!p2.err,p2.err);
 t('🔧 อัพซ้ำแล้ว "ร้านเดิม" อัพเดตจริง (ชื่อใหม่ + ย้ายสาย) — เดิมเปลี่ยนเฉพาะร้านที่คะแนนสูงขึ้น',
   p2.o1.n==='ร้านทดสอบ หนึ่ง (ย้ายสาย)'&&p2.o1.pj==='401727'&&p2.o1.emp==='16951',JSON.stringify(p2.o1));
 t('🛟 ...ร้านที่ไฟล์ใหม่ไม่มี ยังอยู่ครบ (ร้านเก่าไม่หาย)',!!p2.o2&&p2.o2.pj==='401728',JSON.stringify(p2.o2));
 t('🛟 ...สายที่ไฟล์ PJP เคยเติมไว้ (rt) ไม่หายเพราะอัพ Master ใหม่',p2.o1.rt==='209616',p2.o1.rt);

 /* ==========================================================================
  * 4) PJP ↔ สายเซลล์
  * ======================================================================== */
 await ev(seed,{LINES,ORDER});
 await ev(a=>{parseOutlet('Master_Outlet_Data.xlsx',new Uint8Array(a.buf).buffer);},{buf:OUT1});
 const pm=await ev(()=>{const M=dcPjMap();return {l:M.list.map(x=>[x.pj,x.disp,x.nm,x.how]),
   lab:['401842','401728','319013','777777','123'].map(dcPjLabel)};});
 const byPj={};pm.l.forEach(x=>{byPj[x[0]]=x;});
 t('🧭 401842 → CT16 · เอกรัตน์ (จับจากรหัสพนักงาน)',pm.lab[0]==='CT16 · เอกรัตน์'&&byPj['401842'][3]==='emp',pm.lab[0]);
 t('🧭 401728 → CT12 · การัณยภาส — สายเปลี่ยนคน ชื่อในระบบยังเป็นคนเดิม แต่จับจากรหัสพนักงานได้',
   pm.lab[1]==='CT12 · การัณยภาส'&&byPj['401728'][3]==='emp',pm.lab[1]);
 t('🧭 รหัสพนักงานไม่ตรงสายไหน → ถอยไปจับจาก "ชื่อเซลล์" (คอลัมน์ Z)',pm.lab[2]==='CT19 · ฟาตีมา'&&byPj['319013'][3]==='name',pm.lab[2]);
 t('🧭 จับไม่ได้ทั้งสองทาง → โชว์ "PJP เลข · ชื่อ" ไม่เดาสาย',pm.lab[3]==='PJP 777777 · สมชาย'&&!byPj['777777'][1],pm.lab[3]);
 t('🧭 เลขที่ไม่มีใน Master เลย → "PJP เลข"',pm.lab[4]==='PJP 123',pm.lab[4]);
 t('🧭 ตัวเลือกสายเรียงตามลำดับสายของศูนย์ (CT11 ก่อน · จับไม่ได้อยู่ท้าย)',
   pm.l.map(x=>x[1]||'?').join(',')==='CT11,CT12,CT16,CT19,?',pm.l.map(x=>x[1]||'?').join(','));

 /* ==========================================================================
  * 5) ตารางกรอก — พิมพ์จริง คลิกจริง
  * ======================================================================== */
 const before=await ev(new Function('return '+STATE));
 await ev(()=>{window.__sync=0;localStorage.removeItem('bddc:admin1');DC.f=null;DC.who='';switchGroup('dcode');});
 const v0=await ev(()=>({vis:!document.getElementById('dcodeView').classList.contains('hidden'),
   rows:DC.f.rows.length,wide:document.querySelector('main').classList.contains('wide'),
   dt:document.getElementById('dcDtTxt').textContent}));
 t('🧾 แท็บ DCODE เปิดได้ เริ่มด้วยแถวว่าง 1 แถว · DT CODE 15389839',v0.vis&&v0.rows===1&&v0.dt==='15389839',JSON.stringify(v0));
 await pg.fill('#dcPo0','PO-0001');
 await pg.click('#dcOn0');await pg.keyboard.type('ทดสอบ หนึ่ง',{delay:15});await pg.waitForTimeout(350);
 const sug=await ev(()=>document.getElementById('dcOs0').innerText);
 t('ค้นชื่อร้าน → ขึ้นรายการพร้อมรหัสร้าน + สาย',/ร้านทดสอบ หนึ่ง/.test(sug)&&/2000001/.test(sug)&&/CT16/.test(sug),sug);
 await pg.click('#dcOs0 .cst-sg');
 const r0=await ev(()=>Object.assign({},DC.f.rows[0],{act:document.activeElement&&document.activeElement.id}));
 t('🧾 เลือกร้าน → รหัสร้านลง + "สายขึ้นเอง" จากเลข PJP ของร้าน',r0.oc==='2000001'&&r0.pj==='401842'&&r0.pa===1,JSON.stringify(r0));
 t('...แล้วเคอร์เซอร์ไปรอที่ช่องรหัสสินค้าให้เลย',r0.act==='dcSc0',r0.act);
 const sel0=await ev(()=>{const s=document.getElementById('dcPj0');return s.options[s.selectedIndex].text;});
 t('...ช่องสายโชว์ชื่อสาย ไม่ใช่เลข (CT16 · เอกรัตน์)',sel0==='CT16 · เอกรัตน์',sel0);
 await pg.keyboard.type('67000001');
 await pg.fill('#dcCs0','5');
 const r0b=await ev(()=>({sn:DC.f.rows[0].sn,mk:document.getElementById('dcSk0').textContent}));
 t('พิมพ์รหัสสินค้าครบ → ชื่อขึ้นเอง + บอกยอดคงเหลือในสต็อก',/บรีส/.test(r0b.sn)&&/คงเหลือ 120/.test(r0b.mk),JSON.stringify(r0b));
 await pg.click('text=＋ เพิ่มแถว (ร้าน/PO เดิม)');
 const r1=await ev(()=>DC.f.rows[1]);
 t('＋ เพิ่มแถว → ใช้ PO / ร้าน / สาย เดิม แต่สินค้ากับจำนวนว่าง',
   r1.po==='PO-0001'&&r1.oc==='2000001'&&r1.pj==='401842'&&!r1.sku&&!r1.cs,JSON.stringify(r1));
 await pg.click('#dcSn1');await pg.keyboard.type('แชมพู',{delay:15});await pg.waitForTimeout(350);
 const sug2=await ev(()=>document.getElementById('dcSs1').innerText);
 t('ค้นชื่อสินค้า → เจอสินค้าจาก "ใบสั่งรอบล่าสุด" ด้วย (ไม่ได้มีแค่ใน Master)',/68000001/.test(sug2)&&/ในใบสั่งล่าสุด/.test(sug2),sug2);
 await pg.click('#dcSs1 .cst-sg');
 await pg.fill('#dcPc1','12');
 const r1b=await ev(()=>({sku:DC.f.rows[1].sku,act:document.activeElement&&document.activeElement.id}));
 t('เลือกสินค้าจากรายการ → รหัสลง',r1b.sku==='68000001',JSON.stringify(r1b));
 /* ⧉ คัดลอกแถวเดียว */
 await pg.click('#dcR1 button[title^="คัดลอก"]');
 const cp=await ev(()=>DC.f.rows.map(r=>r.sku+'/'+r.pc+'/'+r.k));
 t('⧉ คัดลอกแถว → ได้แถวใหม่หน้าตาเหมือนกันแทรกใต้แถวเดิม (คนละ id)',
   cp.length===3&&cp[2].split('/')[0]==='68000001'&&cp[2].split('/')[1]==='12'&&cp[1].split('/')[2]!==cp[2].split('/')[2],cp.join(' | '));
 await pg.click('#dcR2 button[title="ลบแถวนี้"]');
 t('🗑 ลบแถว (ถามก่อน)',await ev(()=>DC.f.rows.length===2&&window.__conf.some(m=>/ลบแถว 3/.test(m))));
 /* ☑️ ปรับหลายแถว */
 const al0=await ev(()=>{window.__alerts=[];dcBk('po','X');dcBulk('po');return {a:window.__alerts.slice(),po:DC.f.rows.map(r=>r.po)};});
 t('☑️ ยังไม่ติ๊กอะไร แล้วกดปรับ → เตือน และไม่ไปปรับทั้งตาราง',al0.a.length===1&&al0.po.every(p=>p==='PO-0001'),JSON.stringify(al0));
 await pg.check('#dcR0 input[type=checkbox]');await pg.check('#dcR1 input[type=checkbox]');
 const stick=await ev(()=>{const el=document.querySelector('#dcBody .cst-bulk');return el&&el.classList.contains('stick');});
 t('☑️ ติ๊กแล้วแถบปรับหลายแถวขึ้น และติดจอ (sticky) ตามลงมา',stick);
 await pg.click('text=⧉ คัดลอกแถวที่ติ๊ก');
 const cp2=await ev(()=>DC.f.rows.map(r=>(r.sel?'☑':'☐')+r.oc+':'+r.sku));
 t('⧉ คัดลอกแถวที่ติ๊ก → ได้ชุดใหม่ต่อท้าย และ "ติ๊กย้ายไปที่แถวใหม่" ให้ปรับต่อได้ทันที',
   cp2.join(',')==='☐2000001:67000001,☐2000001:68000001,☑2000001:67000001,☑2000001:68000001',cp2.join(','));
 await pg.fill('#dcBkPo','PO-0002');await pg.click('text=ปรับ PO');
 await pg.click('#dcBkOn');await pg.keyboard.type('ทดสอบ สอง',{delay:15});await pg.waitForTimeout(350);
 await pg.click('#dcBkOs .cst-sg');await pg.click('text=ปรับร้าน');
 const bk=await ev(()=>DC.f.rows.map(r=>[r.po,r.oc,r.pj,r.pa,!!r.sel]));
 t('☑️ ปรับ PO + ร้าน ให้แถวที่ติ๊ก → สายเปลี่ยนตามร้านใหม่ (CT12) · แถวที่ไม่ได้ติ๊กไม่ถูกแตะ',
   JSON.stringify(bk)===JSON.stringify([["PO-0001","2000001","401842",1,false],["PO-0001","2000001","401842",1,false],
     ["PO-0002","2000002","401728",1,true],["PO-0002","2000002","401728",1,true]]),JSON.stringify(bk));
 await ev(()=>{dcBk('cs','3');dcBulk('cs');dcBk('sh','2');dcBulk('sh');});
 const bq=await ev(()=>DC.f.rows.map(r=>[r.cs,r.sh,r.pc].join('/')));
 t('☑️ ปรับจำนวน CS / SH/SU ให้แถวที่ติ๊ก',bq.join(',')==='5//,//12,3/2/,3/2/12',bq.join(','));
 const bad=await ev(()=>{window.__alerts=[];dcBk('pc','1.5');dcBulk('pc');return {a:window.__alerts.slice(),pc:DC.f.rows[2].pc};});
 t('☑️ จำนวนไม่ใช่เลขจำนวนเต็ม → เตือน ไม่ปรับ',bad.a.length===1&&bad.pc==='',JSON.stringify(bad));
 await ev(()=>{dcBk('pj','401727');dcBulk('pj');});
 const bp=await ev(()=>DC.f.rows.map(r=>r.pj+':'+r.pa));
 t('☑️ ปรับสายเอง → แถวนั้นจำว่า "เลือกเอง" (pa=0)',bp.join(',')==='401842:1,401842:1,401727:0,401727:0',bp.join(','));
 await ev(()=>{dcBk('sku','61000001');dcBulk('sku');});
 const bs=await ev(()=>DC.f.rows.slice(2).map(r=>r.sku+':'+r.sn));
 t('☑️ ปรับสินค้าให้แถวที่ติ๊ก → ชื่อสินค้าตามมา',bs.every(x=>/^61000001:โดฟ/.test(x)),bs.join(' | '));
 await ev(()=>dcSelAll(false));

 /* อัพ Master Outlet ใหม่ → แถวที่สายมาจากร้าน "ตามไปเอง" · แถวที่เลือกสายเองไม่ถูกแตะ */
 await ev(a=>{parseOutlet('Master_Outlet_Data_v2.xlsx',new Uint8Array(a.buf).buffer);},{buf:OUT2});
 const fol=await ev(()=>DC.f.rows.map(r=>r.oc+':'+r.on+':'+r.pj));
 t('🔄 อัพ Master Outlet ใหม่ → ร้านที่ย้ายสาย สายในแถวเปลี่ยนตาม + ชื่อร้านใหม่ขึ้นเอง',
   fol[0]==='2000001:ร้านทดสอบ หนึ่ง (ย้ายสาย):401727'&&fol[1]===fol[0],fol.join(' | '));
 t('🔄 ...แถวที่แอดมินเลือกสายเอง ไม่ถูกเปลี่ยน',fol[2]==='2000002:ร้านทดสอบ สอง:401727',fol[2]);
 /* อัพ Master Data ใหม่ → ชื่อสินค้าในแถวอัพเดตตาม */
 await ev(()=>{MASTER={items:{"67000001":"บรีส เอกเซล ชื่อใหม่","61000001":"โดฟ สบู่ 90 ก.","0123":"สินค้ารหัสขึ้นต้นศูนย์"},up:2000};
   STOCKD.rows=[];renderDcode();});
 t('🔄 อัพ Master Data ใหม่ → ชื่อสินค้าในตารางเปลี่ยนตามทันที',
   await ev(()=>DC.f.rows[0].sn==='บรีส เอกเซล ชื่อใหม่'&&document.getElementById('dcSn0').value==='บรีส เอกเซล ชื่อใหม่'));

 /* ==========================================================================
  * 6) ตรวจก่อนสร้างไฟล์
  * ======================================================================== */
 const ck=await ev(()=>{
   DC.f.rows.push(dcRowKey(DC.f,dcRowNew()));                                  /* แถวว่าง = ข้าม */
   const r=dcRowKey(DC.f,dcRowNew());r.po='PO-0003';r.oc='2000003';r.on='ร้านปิดแล้ว';r.sku='67000001';r.pc='4';
   DC.f.rows.push(r);
   renderDcode();const C=dcCheck();
   return {err:C.err.map(x=>x.n+':'+x.m),warn:C.warn.map(x=>x.m),n:C.n,
     bar:document.getElementById('dcR5').classList.contains('bad'),
     redPj:document.getElementById('dcPj5').classList.contains('dc-bad'),
     redPo:document.getElementById('dcPo5').classList.contains('dc-bad')};});
 t('⛔ แถวที่ไม่ได้เลือกสาย → เป็นข้อผิดพลาด (สร้างไฟล์ไม่ได้)',ck.err.some(x=>/^6:ยังไม่ได้เลือกสาย/.test(x)),ck.err.join(' | '));
 t('⛔ ...แถวนั้นมีแถบแดง และขอบแดงเฉพาะช่องที่ขาด',ck.bar&&ck.redPj&&!ck.redPo,JSON.stringify(ck));
 t('แถวว่างทั้งแถว ไม่นับ ไม่ฟ้อง',ck.n===5&&!ck.err.some(x=>/^5:/.test(x)),ck.n);
 t('⚠️ ร้าน Inactive → เตือน (ไม่ห้าม)',ck.warn.some(x=>/Inactive/.test(x)),ck.warn.join(' | '));
 t('⚠️ สายในแถวไม่ตรงกับสายของร้านใน Master → เตือน (บอกทั้งสายของร้านและสายที่เลือก)',
   ck.warn.some(x=>/ร้านทดสอบ สอง อยู่สาย CT12 · การัณยภาส แต่แถวนี้เลือก CT11 · ชลศิต/.test(x)),ck.warn.join(' | '));
 let dl0=null;pg.once('download',d=>{dl0=d;});
 await ev(()=>{window.__alerts=[];return dcMake();});await pg.waitForTimeout(400);
 const al=await ev(()=>window.__alerts.slice());
 t('⛔ ยังมีข้อผิดพลาด → กดสร้างไฟล์แล้ว "ไม่สร้าง" และบอกว่าแถวไหนต้องแก้',!dl0&&al.length===1&&/แถว 6/.test(al[0]),al.join(' / '));
 await ev(()=>{const r=DC.f.rows[5];r.pj='401842';r.pa=0;
   const d=dcRowKey(DC.f,Object.assign({},DC.f.rows[0],{sel:false}));DC.f.rows.push(d);renderDcode();});
 const ck2=await ev(()=>dcCheck().warn.map(x=>x.m));
 t('⚠️ PO + ร้าน + สินค้าซ้ำกันสองแถว → เตือนว่าซ้ำกับแถวไหน',ck2.some(x=>/ซ้ำกับแถว 1/.test(x)),ck2.join(' | '));
 await ev(()=>{DC.f.rows[5].po='PO-0001';renderDcode();});
 t('⚠️ PO เดียวใช้กับหลายร้าน → เตือน',(await ev(()=>dcCheck().warn.map(x=>x.m))).some(x=>/PO PO-0001 ใช้กับ 2 ร้าน/.test(x)));
 let dl1=null;pg.once('download',d=>{dl1=d;});
 await ev(()=>{window.__conf=[];window.__confAns=false;return dcMake();});await pg.waitForTimeout(400);
 t('⚠️ มีข้อควรระวัง → ถามก่อน · ตอบ "ยกเลิก" = ไม่สร้างไฟล์',!dl1&&(await ev(()=>window.__conf.length))===1);
 /* เก็บกวาดผ่านปุ่มจริง (ลบแถวซ้ำ · คืน PO · ลบแถวว่าง) — ทุกปุ่มต้องบันทึกฉบับร่างเอง */
 await ev(()=>{window.__confAns=true;dcRowDel(6);dcSet(5,'po','PO-0003');dcRowDel(4);dcFootPaint();});

 /* ==========================================================================
  * 7) ไฟล์ที่ได้ = template เดิมของ dcode
  * ======================================================================== */
 const want=await ev(()=>dcCheck().ok.map(r=>[r.po,r.oc,r.pj,r.sku,r.cs,r.sh,r.pc]));
 const [dl]=await Promise.all([pg.waitForEvent('download'),ev(()=>dcMake())]);
 const fn=dl.suggestedFilename();
 const out=path.join(os.tmpdir(),'bd-dcode-test.xlsx');await dl.saveAs(out);
 try{const keep=path.join(process.env.KEEP_DIR||os.tmpdir(),fn);fs.copyFileSync(out,keep);}catch(e){}
 t('📥 ชื่อไฟล์ LmtOrderCreationExcel_วันที่_เวลา.xlsx (ASCII ล้วน — กฎ fnAscii)',
   /^LmtOrderCreationExcel_\d{8}_\d{4}\.xlsx$/.test(fn),fn);
 const wb=XLSX.readFile(out,{cellNF:true});
 t('📥 มีชีตเดียวชื่อ Sheet1 เหมือน template',wb.SheetNames.join(',')==='Sheet1',wb.SheetNames.join(','));
 const ws=wb.Sheets.Sheet1;const aoa=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null});
 t('📥 หัวตาราง 8 ช่องตรง template เป๊ะ',aoa[0].join('|')==='PO_NUMBER|OUTLET_CODE|PJP_CODE|SKU_CODE|CS|SH/SU|PC|DT_CODE',aoa[0].join('|'));
 const got=aoa.slice(1).map(r=>r.slice(0,7));
 t('📥 ทุกแถวที่กรอกลงไฟล์ครบ ตรงทุกช่อง (ร้าน/สาย/สินค้า ลง "แค่รหัส")',
   JSON.stringify(got)===JSON.stringify(want.map(r=>[r[0],r[1],r[2],r[3],r[4],r[5],r[6]])),JSON.stringify(got));
 t('📥 DT_CODE = 15389839 ทุกแถว',aoa.slice(1).every(r=>r[7]==='15389839'),aoa.slice(1).map(r=>r[7]).join(','));
 const typ=['A','B','C','D','H'].every(c=>ws[c+'2'].t==='s'&&ws[c+'2'].z==='@')&&['E','F','G'].every(c=>ws[c+'2'].t==='n');
 t('📥 รหัส (A–D, H) เป็น "ข้อความ" รูปแบบ @ แบบ template · จำนวน (E–G) เป็นตัวเลข',typ,
   ['A','B','C','D','E','F','G','H'].map(c=>c+':'+ws[c+'2'].t+'/'+ws[c+'2'].z).join(' '));
 t('📥 ช่องจำนวนที่ว่าง ลงเป็น 0 (ไม่ใช่ช่องว่าง)',aoa[1][5]===0&&aoa[1][6]===0,JSON.stringify(aoa[1]));
 /* ส่องข้างใน zip ด้วย JSZip ของหน้าเว็บเอง */
 const z=await ev(async a=>{const zip=await JSZip.loadAsync(new Uint8Array(a.b));const o={names:Object.keys(zip.files),dirs:[]};
   for(const n of o.names){const f=zip.files[n];if(f.dir){o.dirs.push(n);continue;}
     o[n]=n.indexOf('theme')>=0?null:await f.async('string');}
   const th=await zip.file('xl/theme/theme1.xml').async('uint8array');o.theme=[...th];return o;},{b:[...fs.readFileSync(out)]});
 const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
 t('📥 zip ไม่มีโฟลเดอร์แทรก (createFolders:false) และมีครบทุกส่วนของ template',
   z.dirs.length===0&&['[Content_Types].xml','_rels/.rels','xl/workbook.xml','xl/_rels/workbook.xml.rels','xl/worksheets/sheet1.xml',
     'xl/styles.xml','xl/sharedStrings.xml','xl/theme/theme1.xml','docProps/core.xml','docProps/app.xml'].every(n=>z.names.indexOf(n)>=0),
   z.names.join(','));
 t('📥 styles.xml เหมือน template ทุกไบต์ (sha256)',
   sha(Buffer.from(z['xl/styles.xml'],'utf8'))==='5d373feb8b8365cfdda2e85de145c3e069830157c73e7863b0d131a40f6beaa4',
   sha(Buffer.from(z['xl/styles.xml'],'utf8')));
 t('📥 theme เหมือน template ทุกไบต์ (sha256)',
   sha(Buffer.from(z.theme))==='a0df54cd7c507e485061a0ba3de7503eb81f6dfa8cc701ee4478439bdf26dfbb',sha(Buffer.from(z.theme)));
 const sx=z['xl/worksheets/sheet1.xml'];
 t('📥 ความกว้าง + สไตล์ทั้งคอลัมน์เหมือน template (A–D,H = สไตล์ข้อความ)',
   /<cols><col min="1" max="1" width="26.140625" style="3" customWidth="1"\/>.*<col min="8" max="8" width="12.85546875" style="3" customWidth="1"\/><\/cols>/.test(sx));
 t('📥 หัวตารางใช้สไตล์เดิม (A–D,H มีกรอบ+ข้อความ · E–G มีกรอบ) และลำดับ shared string เดิม (SH/SU = 7)',
   sx.indexOf('<c r="A1" s="2" t="s"><v>0</v></c>')>=0&&sx.indexOf('<c r="E1" s="1" t="s"><v>4</v></c>')>=0&&
   sx.indexOf('<c r="F1" s="1" t="s"><v>7</v></c>')>=0&&sx.indexOf('<c r="G1" s="1" t="s"><v>5</v></c>')>=0&&
   sx.indexOf('<c r="H1" s="2" t="s"><v>6</v></c>')>=0);
 const sst=z['xl/sharedStrings.xml'];const nSi=(sst.match(/<si>/g)||[]).length;
 const refs=(sx.match(/t="s"/g)||[]).length;
 t('📥 sharedStrings: uniqueCount/count ตรงกับของจริงในชีต',
   new RegExp('count="'+refs+'" uniqueCount="'+nSi+'"').test(sst),sst.slice(0,160));
 t('📥 dimension ของชีตครอบทุกแถว',new RegExp('<dimension ref="A1:H'+(want.length+1)+'"/>').test(sx));
 t('🔒 ไม่มีชื่อคน/เครื่องของคนทำ template ติดไปในไฟล์ (docProps · absPath · เครื่องพิมพ์)',
   !/Amir|Hassan|hassan|absPath|printerSettings/.test(z['docProps/core.xml']+z['xl/workbook.xml']+z['[Content_Types].xml']+sx),
   z['docProps/core.xml']);
 /* อักขระพิเศษ + รหัสขึ้นต้นด้วยศูนย์ */
 const sp=await ev(async()=>{
   const blob=await dcZip([{po:'A&B <"1">',oc:'2000001',pj:'401842',sku:'0123',cs:1,sh:0,pc:0}],new Date(2026,10,10,9,5));
   return [...new Uint8Array(await blob.arrayBuffer())];});
 const wb2=XLSX.read(Buffer.from(sp),{type:'buffer'});const w2=wb2.Sheets.Sheet1;
 t('📥 PO ที่มี & < > " ลงไฟล์ได้ถูกต้อง (escape XML) อ่านกลับได้ตัวเดิม',w2.A2.v==='A&B <"1">',w2.A2&&w2.A2.v);
 t('📥 รหัสที่ขึ้นต้นด้วย 0 ไม่หาย (เป็นข้อความ ไม่ใช่ตัวเลข)',w2.D2.v==='0123'&&w2.D2.t==='s',w2.D2&&w2.D2.v);
 t('📥 ชื่อไฟล์ใช้วันเวลาที่กดสร้าง',await ev(()=>dcFname(new Date(2026,10,10,9,5)))==='LmtOrderCreationExcel_20261110_0905.xlsx');
 const last=await ev(()=>({last:DC.last,txt:document.getElementById('dcFoot').innerText}));
 t('📥 หลังสร้างไฟล์ หน้าจอบอกชื่อไฟล์ + จำนวนแถว/PO และรายการยังอยู่ให้แก้ต่อ',
   last.last&&last.last.n===want.length&&/สร้างไฟล์ล่าสุด/.test(last.txt),JSON.stringify(last.last));

 /* ==========================================================================
  * 8) 🛟 ไม่แตะข้อมูลกลางเลย · ฉบับร่างอยู่ในเครื่อง
  * ======================================================================== */
 const after=await ev(new Function('return '+STATE));
 const pjNow=JSON.parse(after).PJP,pjBefore=JSON.parse(before).PJP;
 const strip=s=>{const o=JSON.parse(s);delete o.PJP;delete o.MASTER;delete o.STOCKD;return JSON.stringify(o);};
 t('🛟 ใช้งานหน้า DCODE ทั้งหมด (กรอก/คัดลอก/ปรับ/ลบ/สร้างไฟล์) ไม่แตะข้อมูลกลางสักไบต์',
   strip(before)===strip(after),'(เทียบทุก section ยกเว้นตัวที่เทสอัพไฟล์เองระหว่างทาง)');
 const sy=await ev(()=>window.__sync);
 t('🛟 ไม่สั่งบันทึกขึ้นเซิร์ฟเวอร์เลย นอกจากตอนอัพไฟล์ Master เอง',sy===1,'syncToServer '+sy+' ครั้ง (= อัพ Master Outlet รอบสอง)');
 await pg.waitForTimeout(500);   /* ช่องที่พิมพ์บันทึกฉบับร่างแบบหน่วง 0.4 วิ */
 const dr=await ev(()=>{const d=JSON.parse(localStorage.getItem('bddc:admin1')||'null');return d&&d.rows.length;});
 const nRows=await ev(()=>DC.f.rows.length);
 t('🛟 รายการที่กรอกเก็บเป็นฉบับร่างในเครื่อง (localStorage bddc:<user>)',dr===nRows&&nRows===5,dr+' / '+nRows);
 await pg.reload();await ev(seed,{LINES,ORDER});
 await ev(a=>{parseOutlet('Master_Outlet_Data.xlsx',new Uint8Array(a.buf).buffer);},{buf:OUT1});
 const rl=await ev(()=>{switchGroup('dcode');return {n:DC.f.rows.length,rest:DC.rest,po:DC.f.rows[0].po,
   note:document.getElementById('dcBody').innerText.indexOf('กู้รายการที่กรอกค้างไว้')>=0};});
 t('🛟 ปิดหน้า/รีเฟรช แล้วกลับมา รายการยังอยู่ครบ พร้อมบอกว่ากู้ให้แล้ว',rl.n===dr&&rl.rest===1&&rl.po==='PO-0001'&&rl.note,JSON.stringify(rl));
 const other=await ev(()=>{S.user={id:'admin2',role:'manager',name:'แอดมิน 2'};renderDcode();
   const r={n:DC.f.rows.length,po:DC.f.rows[0].po};S.user={id:'admin1',role:'manager',name:'แอดมิน 1'};renderDcode();
   r.back=DC.f.rows.length;return r;});
 t('🛟 แอดมินอีกคนล็อกอินเครื่องเดียวกัน → ได้ฉบับร่างของตัวเอง ไม่เห็นของคนก่อน',
   other.n===1&&!other.po&&other.back===dr,JSON.stringify(other));
 const clr=await ev(()=>{dcClearAll();return {n:DC.f.rows.length,ls:JSON.parse(localStorage.getItem('bddc:admin1')).rows.length};});
 t('🧹 ล้างทั้งหมด (ถามก่อน) → เหลือแถวว่าง 1 แถว',clr.n===1&&clr.ls===1,JSON.stringify(clr));
 const sales=await ev(()=>{S.user={id:'ct11',role:'sales',code:'209611',name:'CT11'};renderDcode();
   const h=document.getElementById('dcBody').innerText;S.user={id:'admin1',role:'manager',name:'แอดมิน 1'};return h;});
 t('🔒 บัญชีที่ไม่ใช่ manager เปิดหน้า DCODE ไม่ได้ (เผื่อหลุดมาทางไหน)',/สำหรับแอดมิน/.test(sales)&&!/PO_NUMBER/.test(sales),sales.slice(0,80));

 /* ==========================================================================
  * 9) ปุ่มอัพโหลดในแท็บ DCODE → ช่อง Master Outlet + Master Data (ช่องเดิม input เดิม)
  * ======================================================================== */
 const up=await ev(()=>{_switchTab('dcode');openUpload();
   const vis=[...document.querySelectorAll('#modal .up-row')].filter(r=>r.style.display!=='none');
   const o={title:document.getElementById('upTitle').textContent,groups:[...new Set(vis.map(r=>r.dataset.group))],
     fors:[].concat(...vis.map(r=>[...r.querySelectorAll('label')].map(l=>l.getAttribute('for'))))};
   closeUpload();return o;});
 t('📤 อัพโหลดในแท็บ DCODE → เห็นเฉพาะกลุ่มของ DCODE',up.groups.join(',')==='dcode'&&/DCODE/.test(up.title),JSON.stringify(up));
 t('📤 ...สองช่องชี้ไปที่ input เดิม (Master Outlet = filePjpOut · Master Data = fileMaster) — ตัวอ่านตัวเดียวกัน',
   up.fors.join(',')==='filePjpOut,fileMaster',up.fors.join(','));

 /* ==========================================================================
  * 10) (ถ้ามี) ไฟล์ Master Outlet Data จริงของศูนย์
  * ======================================================================== */
 if(REAL){
   await ev(seed,{LINES,ORDER});
   const rr=await ev(a=>{parseOutlet('Master_Outlet_Data.xlsx',new Uint8Array(a.buf).buffer);
     const M=dcPjMap();return {n:Object.keys(PJP.out).length,pj:Object.keys(PJP.out).filter(k=>PJP.out[k].pj).length,
       map:M.list.map(x=>x.pj+'='+x.disp+'·'+x.nm+'('+x.how+')')};},{buf:[...fs.readFileSync(REAL)]});
   t('📂 ไฟล์จริง: อ่านร้านได้ครบ (หลายพันร้าน) และมีเลข PJP เกินครึ่งหนึ่งของร้าน Active',rr.n>2000&&rr.pj>1000,rr.n+' ร้าน · PJP '+rr.pj);
   t('📂 ไฟล์จริง: ทุกเลข PJP จับเป็นสาย CT/KA ได้ ด้วยรหัสพนักงาน',rr.map.length>=8&&rr.map.every(x=>/=(CT|KA)\d\d·.*\(emp\)$/.test(x)),rr.map.join(' '));
 }else console.log('(ข้ามข้อ 10 — ไม่มีไฟล์ Master Outlet จริง: ตั้ง DCODE_OUTLET=… ถ้าต้องการ)');

 t('ไม่มี error ในหน้าเว็บตลอดการเทส',errs.length===0,errs.join(' | '));
 await b.close();
 let ok=0;A.forEach(([p,n,x])=>{if(p)ok++;console.log((p?'  ✓ ':'  ✗ FAIL: ')+n+(p?'':(x?' → '+x:'')));});
 console.log('\n'+(ok===A.length?'ALL PASS ('+ok+' checks)':(A.length-ok)+' FAILED of '+A.length));
 process.exit(ok===A.length?0:1);
})().catch(e=>{console.error(e);process.exit(1);});
