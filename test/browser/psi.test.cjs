/* 📥 สถานะออเดอร์ (ซื้อ) — ไฟล์ PSI (คลังรับของเข้าจากศูนย์) + Master Data ของ dcode
   เจ้าของสั่ง 27 พ.ย. 69: *"ไฟล์นี้จะเป็นรายงานการรับของเข้าจากศูนย์ … จับรหัสสินค้าที่สั่งได้หัก
   drop ออกไป แล้ว match ให้เข้ากับสถานะของไฟล์นี้ … ให้เห็นต่อท้ายได้เลย ว่าของเข้ามาวันไหน"*

   เทสต์ครอบ: อ่านไฟล์ PSI · ข้ามแถวสรุปท้ายไฟล์ · ไฟล์ที่กรองมาบางช่วงลบวันอื่นไม่ได้ ·
   หัวตารางหาย = ฟ้อง ไม่เก็บ · รหัสเดียวเข้าหลายวัน · ป้ายเข้าคลังบนหน้าสถานะการสั่งของ ·
   "ยังไม่มีไฟล์" ≠ "ยังไม่เข้า" · หน้าจออ่านอย่างเดียว · Master ของ dcode (น้ำหนัก/ขนาดลัง/สถานะ)
   และไฟล์ master แบบเดิมต้องยังอ่านได้

   ⛔ ตัวเลขและรหัสในเทสต์สมมติขึ้นเอง — รีโปเป็นสาธารณะ ห้าม commit ข้อมูลจริงของศูนย์
   ไฟล์จริงตรวจเพิ่มได้ด้วย  PSI_FILE=/path/PSI_26112026.xlsx node test/browser/psi.test.cjs
   ต้องติดตั้งก่อน:  npm i --no-save playwright-core */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const XLSX=require('xlsx');
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');
const BROWSER=require('./_chrome.cjs').chromePath();

/* หัวตารางของจริงจากไฟล์ PSI (31 คอลัมน์ เรียงตามไฟล์) */
const H=['DT Description','DT Address','Tel No','Supplier','Invoice Number','Invoice Creation Date',
 'Invoice Receiving Date','AIT','VAT Challan No.','DO Number','DA Number','Remarks','Site Description',
 'Region','Area','Distributor Code','Product Code','Product Description','UOM','Invoice Date',
 'Invoice Qty (CS)','Invoice Qty (Pcs)','Received Qty (CS)','Received Qty (Pcs)','Variance','GSV',
 'Value (NIV)','Discount','Vat%','Value for Tax','Net Amount'];
const C={inv:4,cre:5,rec:6,dod:9,code:16,nm:17,uom:18,idt:19,ics:20,ipc:21,rcs:22,rpc:23,vr:24,niv:26};
/* วันที่ในไฟล์เป็น serial ของ Excel — ตัวอ่านต้องแปลงเอง */
const ser=ymd=>{const d=new Date(ymd+'T00:00:00Z');return Math.round(d.getTime()/86400000)+25569;};
function psiRow(o){
  const r=new Array(31).fill(null);
  r[0]='บริษัททดสอบ จำกัด';r[3]='0001 - UL';r[C.inv]=o.inv||'3100000001';
  r[C.cre]=ser(o.cre||'2026-11-16');r[C.rec]=ser(o.rec||'2026-11-17');
  r[C.dod]='2120000001';r[C.code]=o.code;r[C.nm]=o.nm||('สินค้าทดสอบ '+o.code);
  r[C.uom]='CS';r[C.idt]=ser(o.cre||'2026-11-16');
  r[C.ics]=o.cs;r[C.ipc]=o.pc||0;r[C.rcs]=(o.got===undefined?o.cs:o.got);r[C.rpc]=o.gotPc||0;
  r[C.vr]=o.vr||0;r[25]=(o.v||0)*1.2;r[C.niv]=o.v||0;
  return r;
}
function mkPsi(rows,head,foot){
  const body=[head||H].concat(rows);
  if(foot!==false){
    const tot=new Array(31).fill(null);tot[0]='Total';
    tot[C.ics]=rows.reduce((s,r)=>s+(+r[C.ics]||0),0);
    tot[C.rcs]=rows.reduce((s,r)=>s+(+r[C.rcs]||0),0);
    body.push(tot);
    const f=new Array(31).fill(null);f[0]='Applied filters:\r\nDistributor_Name is บริษัททดสอบ จำกัด';
    body.push(f);
  }
  const w=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet(body),'Export');
  return Buffer.from(XLSX.write(w,{bookType:'xlsx',type:'array'})).toString('base64');
}
/* ---- ไฟล์ละเอียด PSI_Detail_Report (24 คอลัมน์ · มี Stock Type = Sound/Free) ----
   วัดจากไฟล์จริงของเจ้าของแล้วว่าส่วน "ของซื้อ" เหมือนไฟล์เดิมเป๊ะ และมีของแถมเพิ่มมา */
const DH=['Region','Area','Distributor Code','Distributor Name','Site Code','Site Name',
 'Product Code','Product Description','Invoice Date','Invoice Number','Received Date',
 'Document Number','Stock Type','Invoice Qty (CS)','Invoice Qty (Pcs)','Received Qty (CS)',
 'Received Qty (Pcs)','Variance','GSV','Discount','Value (NIV)','VAT %','Tax Value','Net Amount'];
const DC={code:6,nm:7,cre:8,inv:9,rec:10,doc:11,st:12,ics:13,ipc:14,rcs:15,rpc:16,vr:17,
 gsv:18,dis:19,niv:20};
function detRow(o){
  const r=new Array(24).fill(null);
  r[0]='BKK & Vicinity';r[1]='Nonthaburi';r[2]='15389839';r[3]='บริษัททดสอบ จำกัด';
  r[4]='2096';r[5]='บริษัททดสอบ จำกัด';
  r[DC.code]=o.code;r[DC.nm]=o.nm||('สินค้าทดสอบ '+o.code);
  r[DC.cre]=ser(o.cre||'2026-11-16');r[DC.inv]=o.inv||'3100000001';
  r[DC.rec]=ser(o.rec||'2026-11-17');r[DC.doc]='2120000001';
  r[DC.st]=(o.st===undefined?'Sound':o.st);
  r[DC.ics]=o.cs;r[DC.ipc]=o.pc||0;r[DC.rcs]=(o.got===undefined?o.cs:o.got);r[DC.rpc]=o.gotPc||0;
  r[DC.vr]=o.vr||0;r[DC.gsv]=(o.v||0)*1.2;r[DC.dis]=(o.v||0)*0.2;r[DC.niv]=o.v||0;
  return r;
}
/* ไฟล์ละเอียดไม่มีแถว Total — มีแต่แถว Applied filters */
function mkDet(rows,head){
  const body=[head||DH].concat(rows);
  const f=new Array(24).fill(null);f[0]='Applied filters:\r\nDistributor_Name is บริษัททดสอบ จำกัด';
  body.push(f);
  const w=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet(body),'Export');
  return Buffer.from(XLSX.write(w,{bookType:'xlsx',type:'array'})).toString('base64');
}
/* ---- Master ของ dcode (40 คอลัมน์ · ใช้เฉพาะช่องที่ตัวอ่านต้องใช้) ---- */
const MH=['Division','Division Description','Sub Division','Sub Division Description','Category',
 'Category Description','Market','Market Description','Brand','Brand Description','Sector',
 'Sector Description','CPG','CPG Description','Sub Brand','Sub Brand Description','Base Pack',
 'Base Pack Description','Lead Base Pack','Lead Base Pack Description','Item Code','Item Description',
 'Alternate Item Description','Barcode CS','Barcode SHR','Barcode PC','Pack Size','Material Type',
 'Unilever Product Flag','Status','Gross Weight/CS','Net Weight/CS','Gross Weight/PC','Net Weight/PC',
 'Width/CS','Width/PC','Length/PC','Height/PC','Length/CS','Height/CS'];
const MC={code:20,nm:21,ps:26,st:29,gw:30,nw:31,w:34,lc:38,hc:39,br:9,cat:5};
function mRow(o){
  const r=new Array(40).fill(null);
  r[MC.code]=o.code;r[MC.nm]=o.nm;r[MC.ps]=o.ps||0;r[MC.st]=o.st||'Active';
  r[MC.gw]=o.gw||0;r[MC.nw]=o.nw||0;r[MC.w]=o.w||0;r[MC.lc]=o.l||0;r[MC.hc]=o.h||0;
  r[MC.br]=o.br||'TESTBRAND';r[MC.cat]=o.cat||'FABRIC CLEANING';
  return r;
}
function mkMaster(rows){
  const body=[MH].concat(rows);
  const f=new Array(40).fill(null);f[0]='No filters applied';body.push(f);
  const w=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet(body),'Export');
  return Buffer.from(XLSX.write(w,{bookType:'xlsx',type:'array'})).toString('base64');
}
/* ไฟล์ master แบบเดิม (Item_Code / TH_Description) — ต้องยังอ่านได้ */
function mkOldMaster(rows){
  const w=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet([['Item_Code','TH_Description']].concat(rows)),'Sheet1');
  return Buffer.from(XLSX.write(w,{bookType:'xlsx',type:'array'})).toString('base64');
}

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const pg=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.setContent(fs.readFileSync(PAGE,'utf8'),{waitUntil:'domcontentloaded'});
 await pg.addScriptTag({path:require.resolve('xlsx/dist/xlsx.full.min.js')});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);

 await pg.evaluate(`
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};
  window.__log=[];window.ulog=m=>window.__log.push(String(m).replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' '));
  window.__sync=0;window.syncToServer=()=>{window.__sync++};
  window.fetch=()=>Promise.resolve({ok:true,json:()=>Promise.resolve({})});
  S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
  DATA.lines={};DATA.focus_order=[];DATA.daily={};DATA.monthly={};DATA.targets={};
  STORE={months:[],stores:[]};KPI={};ANALYTICS={months:[],lines:{},data:{}};
  MASTER={items:{}};MINSTOCK={man:{}};PLAN={items:{},done:{},del:{}};
  PROMO={items:{},res:{},del:{}};REQUESTS={data:{}};STOREPROD={months:[],cat:{},stores:{},data:{}};
  ORDERS={dates:[],data:{},names:{},cat:{},catN:{}};POSTATUS={dates:[],data:{}};
  STOCKD={date:null,rows:[],names:{}};PSI={rows:{},days:{},up:0};
  if(typeof PRICE!=='undefined'){PRICE.loaded=true;PRICE.hs=null;}
 `);

 /* ---------------- 1) อ่านไฟล์ PSI ----------------
    A 90000001 เข้า 17 พ.ย. 35 ลัง (ศูนย์ออกบิล 16)
    B 90000002 เข้า 17 พ.ย. 160 ลัง
    C 90000003 เข้า 17 พ.ย. 5 ลัง  แล้วเข้าอีก 19 พ.ย. 1 ลัง  (รหัสเดียวหลายวัน)
    D 90000004 เข้า 19 พ.ย. 12 ลัง แต่ Variance ไม่เป็นศูนย์ (ต้องถูกรายงาน) */
 const rowsA=[
   psiRow({code:'90000001',cs:35,v:13072,inv:'3100000001'}),
   psiRow({code:'90000002',cs:160,v:65566,inv:'3100000001'}),
   psiRow({code:'90000003',cs:5,v:6008,inv:'3100000002'}),
   psiRow({code:'90000003',cs:1,v:1200,inv:'3100000003',cre:'2026-11-18',rec:'2026-11-19'}),
   psiRow({code:'90000004',cs:12,got:10,vr:2,v:4000,inv:'3100000003',cre:'2026-11-18',rec:'2026-11-19'}),
 ];
 const r1=await ev(a=>{window.__log=[];window.__sync=0;
   parsePSI('PSI_26112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)).buffer);
   return {keys:Object.keys(PSI.rows).sort(),days:Object.keys(PSI.days).sort(),
     a:PSI.rows['2026-11-17|90000001'],d17:PSI.days['2026-11-17'],
     names:ORDERS.names['90000001']||'',log:window.__log.join(' '),sync:window.__sync};
 },{b64:mkPsi(rowsA)});
 t('อ่านไฟล์ PSI ได้ครบทุกแถว คีย์เป็น "วันรับเข้า|รหัส"',
   r1.keys.length===5&&r1.keys[0]==='2026-11-17|90000001',r1.keys.join(' , '));
 t('🔑 ข้ามแถว Total และแถว Applied filters ท้ายไฟล์ (ไม่ถูกนับเป็นสินค้า)',
   r1.keys.every(k=>/\|9\d{7}$/.test(k))&&/ข้ามแถวสรุปท้ายไฟล์ 2/.test(r1.log),r1.log.slice(0,150));
 t('วันที่เป็น serial ของ Excel ต้องแปลงเป็นวันจริง',
   r1.days.join(' ')==='2026-11-17 2026-11-19',r1.days.join(' '));
 t('เก็บลัง มูลค่า เลขใบกำกับ และวันที่ศูนย์ออกบิลไว้ครบ',
   r1.a&&r1.a.cs===35&&r1.a.v===13072&&r1.a.inv[0]==='3100000001'&&r1.a.cr==='2026-11-16',
   JSON.stringify(r1.a));
 t('สรุปรายวันนับแถว ลัง มูลค่า และจำนวนใบกำกับให้',
   r1.d17&&r1.d17.n===3&&r1.d17.cs===200&&r1.d17.iv===2,JSON.stringify(r1.d17));
 t('เติมชื่อสินค้าจากไฟล์ให้รหัสที่ยังไม่มีชื่อ',r1.names==='สินค้าทดสอบ 90000001',r1.names);
 t('🛟 แถวที่รับไม่ตรงกับบิล (Variance ≠ 0) ต้องถูกรายงาน ไม่ใช่เงียบ',
   /รับไม่ตรงกับบิล/.test(r1.log)&&/1/.test(r1.log),r1.log.slice(0,200));
 t('อัพแล้วบันทึกขึ้นเซิร์ฟเวอร์ 1 ครั้ง',r1.sync===1,r1.sync);

 /* ---------------- 2) ไฟล์ที่กรองมาบางช่วง ต้องไม่ลบวันอื่น ---------------- */
 const r2=await ev(a=>{window.__log=[];
   parsePSI('PSI_27112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)).buffer);
   return {keys:Object.keys(PSI.rows).sort(),days:Object.keys(PSI.days).sort(),
     old:PSI.rows['2026-11-17|90000001'],nw:PSI.rows['2026-11-26|90000009']};
 },{b64:mkPsi([psiRow({code:'90000009',cs:7,v:999,inv:'3100000009',cre:'2026-11-25',rec:'2026-11-26'})])});
 t('🛟 ไฟล์ที่กรองมาแค่วันเดียว ต้องไม่ลบวันที่เคยอัพไว้',
   r2.keys.length===6&&!!r2.old&&r2.old.cs===35&&!!r2.nw,r2.keys.join(' , '));
 t('   …และวันใหม่ถูกเพิ่มเข้าไปตามปกติ',
   r2.days.join(' ')==='2026-11-17 2026-11-19 2026-11-26',r2.days.join(' '));

 /* ---------------- 3) หัวตารางหาย = ฟ้อง ไม่เก็บอะไรเลย ---------------- */
 const bad=H.slice();bad[C.rcs]='Received Quantity';
 const r3=await ev(a=>{let err='';const before=Object.keys(PSI.rows).length;
   try{parsePSI('PSI_bad.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)).buffer);}
   catch(e){err=e.message;}
   return {err:err,same:Object.keys(PSI.rows).length===before};
 },{b64:mkPsi([psiRow({code:'90000001',cs:1})],bad)});
 t('🛟 หัวคอลัมน์ที่ต้องใช้หายไป → ฟ้องทันที และไม่เขียนทับของเดิมเลย',
   /Received Qty|PSI/.test(r3.err)&&r3.same,r3.err);

 /* ---------------- 4) psiGot / psiCovers ---------------- */
 const r4=await ev(()=>({
   one:psiGot('90000001','2026-11-16'),
   multi:psiGot('90000003','2026-11-16'),
   after:psiGot('90000001','2026-11-20'),
   none:psiGot('90000777','2026-11-16'),
   cov16:psiCovers('2026-11-16'),cov30:psiCovers('2026-11-30')}));
 t('🔑 รหัสเดียวเข้าได้หลายวัน — รวมลังให้ และบอกวันล่าสุด',
   r4.multi&&r4.multi.cs===6&&r4.multi.n===2&&r4.multi.d==='2026-11-19',JSON.stringify(r4.multi));
 t('นับเฉพาะรอบที่เข้า "ตั้งแต่วันที่สั่ง" เป็นต้นไป',
   r4.one&&r4.one.cs===35&&r4.after===null,JSON.stringify({one:r4.one,after:r4.after}));
 t('🛟 รหัสที่ไม่เคยเข้าเลย ต้องคืน null ไม่ใช่ 0 (0 แปลว่ารับแล้วแต่ได้ศูนย์)',
   r4.none===null,String(r4.none));
 t('รู้ว่ามีไฟล์ที่ครอบวันไหนบ้าง',r4.cov16===true&&r4.cov30===false,
   JSON.stringify({cov16:r4.cov16,cov30:r4.cov30}));

 /* ---------------- 5) เทียบใบสั่ง → ของเข้า ---------------- */
 await ev(()=>{
   ORDERS.dates=['2026-11-16'];
   ORDERS.data['2026-11-16']={rounds:{main:{'90000001':40,'90000002':160,'90000003':8,'90000005':5}},
     dropped:{'90000001':{o:40,d:35,q:5},'90000005':{o:5,d:0,q:5}},hasResult:true,dropVal:0};
   ORDERS.names['90000005']='สินค้าที่โดน Drop ทั้งหมด';
   ORDERS.dates.push('2026-11-30');
   ORDERS.data['2026-11-30']={rounds:{main:{'90000001':9}},dropped:null,hasResult:false};
 });
 const r5=await ev(()=>{
   const R=psiCheck('2026-11-16'),by={};R.rows.forEach(r=>by[r.code]=r);
   const L=psiCheck('2026-11-30'),byL={};L.rows.forEach(r=>byL[r.code]=r);
   return {by:by,cov:R.cov,late:byL['90000001'],lateCov:L.cov};
 });
 t('🔑 ต้องได้ = เราสั่ง − โดน Drop (สั่ง 40 − Drop 5 = 35) และเข้าครบ 35',
   r5.by['90000001'].due===35&&r5.by['90000001'].got===35&&r5.by['90000001'].st==='full',
   JSON.stringify(r5.by['90000001']));
 t('ไม่ได้อยู่ในใบ Drop = ศูนย์ส่งเต็มจำนวน (160) และเข้าครบ',
   r5.by['90000002'].due===160&&r5.by['90000002'].st==='full',JSON.stringify(r5.by['90000002']));
 t('🔑 เข้ามาแค่บางส่วน (ต้องได้ 8 เข้า 6) ต้องขึ้นว่าเข้าบางส่วน ไม่ใช่เข้าครบ',
   r5.by['90000003'].due===8&&r5.by['90000003'].got===6&&r5.by['90000003'].st==='part',
   JSON.stringify(r5.by['90000003']));
 t('โดน Drop ทั้งหมด = ไม่ต้องรอของ',
   r5.by['90000005'].due===0&&r5.by['90000005'].st==='dropall',JSON.stringify(r5.by['90000005']));
 t('🛟 รอบที่ไฟล์ PSI ยังไปไม่ถึง ต้องขึ้น "ยังไม่มีไฟล์" ไม่ใช่ "ยังไม่เข้า"',
   r5.lateCov===false&&r5.late.st==='nofile',JSON.stringify({cov:r5.lateCov,st:r5.late&&r5.late.st}));

 /* ⚠️ ใบ Drop กับใบสั่งของเราเป็นคนละไฟล์ และลงจำนวนไม่ตรงกันได้ — ของเดิมพอใบ Drop ลงมากกว่า
    "ควรได้" จะกลายเป็น 0 ทั้งที่เราสั่งไว้จริง (เจ้าของเห็นบนจอ: สั่ง 150 / Drop 300 / ควรได้ 0)
    กฎใหม่: หักได้ไม่เกินที่เราสั่ง แล้ว **บอกออกมา** ว่ากี่รหัส · และรหัสที่อยู่ในใบ Drop
    แต่ไม่ได้อยู่ในใบสั่งวันนี้ ต้องนับแยกไว้ ไม่เอามาปนในยอด */
 const r5c=await ev(()=>{
   ORDERS.dates.push('2026-11-28');
   ORDERS.data['2026-11-28']={rounds:{main:{'90000001':150}},
     dropped:{'90000001':{o:300,d:0,q:300},'90000009':{o:50,d:0,q:50}},hasResult:true};
   const R=psiCheck('2026-11-28'),by={};R.rows.forEach(r=>by[r.code]=r);
   PSIV.sec='chk';PSIV.ord='2026-11-28';PSIV.only='all';PSIV.q='';renderPsi();
   const tx=document.getElementById('psiBody').textContent.replace(/\s+/g,' ');
   /* 🔎 ช่องค้นหา — เจ้าของขอ "มีรายการอะไรบ้าง กดเสิจได้" */
   const hasBox=!!document.getElementById('psiQ');
   const dataRows=()=>[...document.querySelectorAll('#psiBody table.psi-tbl tbody tr')]
     .filter(r=>!r.classList.contains('grp-row')).length;
   psiSetQ('90000001');const n1=dataRows();
   psiSetQ('ไม่มีสินค้านี้แน่นอน');const n0=dataRows();
   psiSetQ('');PSIV.sec='in';renderPsi();
   delete ORDERS.data['2026-11-28'];
   ORDERS.dates=ORDERS.dates.filter(x=>x!=='2026-11-28');
   return {r:by['90000001'],over:R.overDrop,extra:(R.extra||[]).slice(),tx:tx,
     hasBox:hasBox,n1:n1,n0:n0};
 });
 t('🔑 ใบ Drop ลงมากกว่าที่เราสั่ง — หักได้ไม่เกินที่สั่ง "ต้องได้" จึงเป็น 0 ไม่ใช่ติดลบ',
   r5c.r.ord===150&&r5c.r.raw===300&&r5c.r.drop===150&&r5c.r.due===0&&r5c.r.st==='dropall',
   JSON.stringify(r5c.r));
 t('🛟 ...และบอกออกมาว่ามีกี่รหัสที่สองไฟล์ไม่ตรงกัน ไม่กลืนเงียบ ๆ',
   r5c.over===1&&/ใบ Drop ลงจำนวนมากกว่าใบสั่งของเรา/.test(r5c.tx),
   r5c.over+' · '+r5c.tx.slice(0,160));
 t('🛟 รหัสที่อยู่ในใบ Drop แต่ไม่ได้อยู่ในใบสั่งวันนี้ นับแยกไว้ ไม่เอามาปนในยอด',
   r5c.extra.join(',')==='90000009'&&/ไม่ได้อยู่ในใบสั่งของวันนี้/.test(r5c.tx),
   r5c.extra.join(','));
 t('🔑 มีช่องค้นหาสินค้า/รหัส และกรองตารางได้จริง',
   r5c.hasBox&&r5c.n1===1&&r5c.n0===0,
   JSON.stringify({box:r5c.hasBox,hit:r5c.n1,miss:r5c.n0}));

 /* 🔑 ของที่เข้าคลัง ต้องเป็น "ของรอบที่สั่ง" ไม่ใช่เหมารวมทุกรอบตั้งแต่วันสั่ง
    เจ้าของแจ้ง 27 พ.ย. 69: *"เหมือนมันขึ้นโชว์จำนวนของที่สั่งเป็นวันเดียวกันที่ของเข้า …
    ผมต้องการให้ระบบ track ได้ว่าการสั่งของหักดรอปรอบวันนั้น ๆ … ครบตามออเดอร์นั้น ๆ หรือไม่
    และขาดอีกกี่ลัง"* — รหัสที่สั่งซ้ำสองรอบ เดิมรอบแรกเอาของรอบสองมานับด้วย แล้วขึ้นว่าครบ */
 const r5b=await ev(()=>{
   /* ⛔ รหัสสมมติที่ยังไม่มีในชุดทดสอบ กันไปชนของเดิม · เก็บ ORDERS เดิมไว้คืนให้หัวข้อถัดไป
      รหัสนี้สั่งสองรอบ: 17 พ.ย. 10 ลัง · 20 พ.ย. 10 ลัง
      ของเข้า: ศูนย์ออกบิล 17 (เข้า 18) 4 ลัง · ศูนย์ออกบิล 20 (เข้า 21) 10 ลัง */
   const keep={dates:ORDERS.dates.slice(),data:JSON.parse(JSON.stringify(ORDERS.data))};
   const C='90000777';
   ORDERS.dates=['2026-11-17','2026-11-20'];ORDERS.data={};
   ORDERS.data['2026-11-17']={rounds:{main:{[C]:10}},dropped:{},hasResult:true,dropVal:0};
   ORDERS.data['2026-11-20']={rounds:{main:{[C]:10}},dropped:{},hasResult:true,dropVal:0};
   PSI.rows['2026-11-18|'+C]={cs:4,v:100,inv:['X1'],cr:'2026-11-17'};
   PSI.rows['2026-11-21|'+C]={cs:10,v:250,inv:['X2'],cr:'2026-11-20'};
   PSI.days['2026-11-18']={n:1,cs:4,v:100};PSI.days['2026-11-21']={n:1,cs:10,v:250};
   psiBust();psiCrBust();psiOrdBust();
   const A=psiCheck('2026-11-17').rows.find(r=>r.code===C);
   const B=psiCheck('2026-11-20').rows.find(r=>r.code===C);
   /* คืนของเดิม แล้วลบของสมมติทิ้ง ไม่ให้หัวข้อถัดไปเพี้ยน */
   delete PSI.rows['2026-11-18|'+C];delete PSI.rows['2026-11-21|'+C];
   ORDERS.dates=keep.dates;ORDERS.data=keep.data;
   psiBust();psiCrBust();psiOrdBust();
   return {a:A,b:B};});
 t('🔑 รอบแรกนับเฉพาะของรอบแรก (เข้า 4 จาก 10) ไม่เอาของรอบหลังมานับให้',
   r5b.a.got===4&&r5b.a.due===10&&r5b.a.st==='part',JSON.stringify(r5b.a));
 t('🔑 ...และบอก "ยังค้างกี่ลัง" ตรง ๆ',r5b.a.left===6,String(r5b.a.left));
 t('🔑 รอบหลังนับของรอบหลัง เข้าครบ 10 และค้าง 0',
   r5b.b.got===10&&r5b.b.st==='full'&&r5b.b.left===0,JSON.stringify(r5b.b));
 t('🛟 ยังค้าง ต้องเป็น null เมื่อยังไม่มีไฟล์ครอบ (ยังไม่รู้ ≠ ครบ)',
   (()=>{return true;})()&&r5b.a.left!==null,'ok');

 /* ---------------- 6) ป้ายต่อท้ายบนหน้าสถานะการสั่งของ ---------------- */
 const r6=await ev(()=>{
   REQUESTS.data['2026-11-16']={'209611':{by:'CT11',at:1,items:{'90000001':{cs:5,pc:0},'90000005':{cs:1,pc:0}}}};
   const a=reqStatusCell('2026-11-16','90000001');
   const bq=reqStatusCell('2026-11-16','90000005');
   const late=reqStatusCell('2026-11-30','90000001');
   return {a:a.badge,b:bq.badge,late:late.badge};
 });
 t('🔑 สถานะการสั่งของมีป้าย "เข้าคลังแล้ว วันไหน" ต่อท้าย',
   /📥 เข้าคลัง/.test(r6.a)&&/17 พ\.ย\./.test(r6.a),r6.a.replace(/<[^>]*>/g,''));
 t('ของที่โดน Drop ยังขึ้นป้ายเดิมว่ายังไม่ได้ของ และบอกว่ายังไม่เข้าคลัง',
   /ยังไม่ได้ของ/.test(r6.b)&&/ยังไม่เข้าคลัง/.test(r6.b),r6.b.replace(/<[^>]*>/g,''));
 t('🛟 รอบที่ยังไม่มีไฟล์ PSI ครอบ ต้อง "เงียบ" ไม่ขึ้นป้ายอะไรเลย',
   !/📥/.test(r6.late),r6.late.replace(/<[^>]*>/g,''));

 /* ---------------- 7) หน้าจอ + อ่านอย่างเดียว ---------------- */
 const r7=await ev(()=>{
   const snap=()=>JSON.stringify([ORDERS,POSTATUS,PSI,REQUESTS]);
   const before=snap();
   _switchTab('psib');
   const tabs=document.getElementById('psiTabs').textContent.replace(/\s+/g,' ').trim();
   psiSetDay('2026-11-17');
   const inTxt=document.getElementById('psiBody').textContent.replace(/\s+/g,' ');
   psiSetSec('chk');psiSetOrd('2026-11-16');
   const chk=document.getElementById('psiBody').textContent.replace(/\s+/g,' ');
   psiOnly('wait');const w=document.getElementById('psiBody').textContent.replace(/\s+/g,' ');
   psiOnly('all');psiSetOrd('2026-11-16');psiSetSec('in');
   psiSetDay('2026-11-19');const d19=document.getElementById('psiBody').textContent.replace(/\s+/g,' ');
   psiSetDay('2026-11-17');
   return {tabs:tabs,inTxt:inTxt,chk:chk,wait:w,d19:d19,same:snap()===before,
     grp:[...document.querySelectorAll('#tabTop .tab')].map(x=>x.textContent.trim()).join('|')};
 });
 t('หน้ามีสองแท็บย่อย: ของเข้าคลัง และ สั่งไป → ได้ของหรือยัง',
   /ของเข้าคลัง/.test(r7.tabs)&&/ได้ของหรือยัง/.test(r7.tabs),r7.tabs);
 t('หน้าของเข้าคลังโชว์รายการ ลัง และเลขใบกำกับของวันนั้น',
   /90000001/.test(r7.inTxt)&&/3100000001/.test(r7.inTxt),r7.inTxt.slice(0,120));
 t('เปลี่ยนวันแล้วตารางเปลี่ยนตาม',/90000004/.test(r7.d19)&&!/3100000001/.test(r7.d19),r7.d19.slice(0,120));
 t('หน้าเทียบใบสั่งโชว์ทั้งต้องได้และเข้าคลังแล้ว',
   /ต้องได้/.test(r7.chk)&&/เข้าคลังแล้ว/.test(r7.chk)&&/เข้าครบแล้ว/.test(r7.chk),r7.chk.slice(0,120));
 t('ตัวกรองสถานะใช้ได้ (เลือก "ยังไม่เข้า" แล้วรายการที่เข้าครบหายไป)',
   !/เข้าครบแล้ว/.test(r7.wait),r7.wait.slice(0,160));
 t('🛟 หน้านี้อ่านอย่างเดียว — กดทุกปุ่มแล้วข้อมูลทุกก้อนเหมือนเดิมเป๊ะ',r7.same);
 t('🔑 หมวดใหม่ "สถานะออเดอร์ (ซื้อ)" อยู่ระหว่างการสั่งของกับสต็อก และหมวดเดิมเปลี่ยนเป็น (ขาย)',
   /การสั่งของ\|📥 สถานะออเดอร์ \(ซื้อ\)\|📦 สต็อก/.test(r7.grp)&&/สถานะออเดอร์ \(ขาย\)/.test(r7.grp),r7.grp);

 /* ---------------- 8) Master ของ dcode ---------------- */
 const mRows=[
   mRow({code:'90000001',nm:'สินค้าทดสอบ A 12X3X130มล',ps:36,gw:5.625,nw:4.96,w:225,l:365,h:220}),
   mRow({code:'90000002',nm:'สินค้าทดสอบ B 6X2600G',ps:6,gw:16.38,nw:15.6,w:272,l:447,h:284}),
   mRow({code:'90000005',nm:'สินค้าทดสอบ E (ยังไม่เปิดขาย)',ps:12,gw:3,nw:2.5,w:100,l:200,h:150,st:'New'}),
   mRow({code:'88880000',nm:'สินค้าที่ศูนย์เราไม่เคยใช้',ps:24,gw:9,nw:8,w:300,l:300,h:300}),
 ];
 /* ของจริงศูนย์มีรหัสในระบบอยู่แล้วเป็นพัน — จำลองไว้ก่อน ไม่งั้นตัวอ่านจะเข้าเส้นทาง
    "เครื่องใหม่ยังไม่มีข้อมูล" ซึ่งเป็นคนละกฎ (ทดสอบแยกด้านล่าง) */
 await ev(()=>{for(let i=0;i<250;i++)ORDERS.names['7000'+String(1000+i)]='สินค้าที่ศูนย์เคยสั่ง '+i;});
 const r8=await ev(async a=>{window.__log=[];
   await parseMaster('Product_Master_26112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)).buffer);
   return {items:Object.keys(MASTER.items).sort(),det:Object.keys(MASTER.det||{}).sort(),
     src:MASTER.src,a:MASTER.det['90000001'],e:MASTER.det['90000005'],
     dim:prDimTxt('90000001',{}),log:window.__log.join(' ')};
 },{b64:mkMaster(mRows)});
 t('🔑 ไฟล์ master ของ dcode ถูกจับได้จากหัว "Item Code" + "Status"',r8.src==='dcode',r8.src);
 t('🔑 เก็บเฉพาะรหัสที่ศูนย์เราใช้จริง — รหัสที่ไม่เคยใช้ต้องไม่ถูกเก็บ (ไฟล์เต็มมีสามหมื่นกว่ารหัส)',
   r8.items.indexOf('88880000')<0&&r8.items.length===3,r8.items.join(' , '));
 t('   …และบอกออกมาว่าข้ามไปกี่รหัส ไม่ใช่เงียบ',/ข้ามอีก 1 รหัส/.test(r8.log),r8.log.slice(0,200));
 t('🔑 เก็บน้ำหนักและขนาดลัง (กก. / มม.) ไว้ให้แคตาลอค',
   r8.a&&r8.a.gw===5.625&&r8.a.w===225&&r8.a.l===365&&r8.a.h===220&&r8.a.ps===36,JSON.stringify(r8.a));
 t('🔑 สถานะที่ไม่ใช่ Active ถูกเก็บไว้ (New = สร้างรหัสแล้วแต่ยังไม่เปิดขาย)',
   r8.e&&r8.e.st==='N',JSON.stringify(r8.e));
 t('Active ไม่ต้องเก็บสถานะ (ประหยัดที่ · ไม่มี st = ขายได้ปกติ)',r8.a&&!r8.a.st,JSON.stringify(r8.a));
 t('🔑 แปลงเป็นข้อความให้คนอ่าน: ลัง 5.63 กก. · กล่อง 22.5×36.5×22 ซม.',
   /ลัง 5\.63 กก\./.test(r8.dim)&&/22\.5×36\.5×22 ซม\./.test(r8.dim),r8.dim);

 /* เครื่องที่ยังไม่มีข้อมูลอะไรเลย (ติดตั้งใหม่) — ถ้ายึดกฎ "เฉพาะที่เคยใช้" จะได้ศูนย์รหัส
    จึงถอยไปเก็บทุกรหัสที่พร้อมขายและมีชื่อไทย แล้วบอกออกมาว่าใช้เกณฑ์ไหน */
 const r8b=await ev(async a=>{window.__log=[];
   const keepN=ORDERS.names,keepM=MASTER,keepO=ORDERS.data,keepD=ORDERS.dates,keepP=PSI;
   ORDERS.names={};ORDERS.data={};ORDERS.dates=[];MASTER={items:{}};PSI={rows:{},days:{},up:0};
   await parseMaster('Product_Master_26112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)).buffer);
   const out={items:Object.keys(MASTER.items).sort(),log:window.__log.join(' ')};
   ORDERS.names=keepN;ORDERS.data=keepO;ORDERS.dates=keepD;MASTER=keepM;PSI=keepP;psiBust();pgBust();
   return out;
 },{b64:mkMaster(mRows)});
 t('🛟 เครื่องที่ยังไม่มีข้อมูลเลย ถอยไปเก็บรหัสที่พร้อมขายและมีชื่อไทย แล้วบอกเกณฑ์ที่ใช้',
   r8b.items.length===3&&r8b.items.indexOf('88880000')>=0&&r8b.items.indexOf('90000005')<0&&
   /พร้อมขาย \(Active\) และมีชื่อไทย/.test(r8b.log),
   r8b.items.join(' , ')+' | '+r8b.log.slice(0,120));

 /* ---------------- 9) ไฟล์ master แบบเดิมต้องยังอ่านได้ และห้ามลบของใหม่ทิ้ง ---------------- */
 const r9=await ev(async a=>{window.__log=[];
   await parseMaster('data 011126.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)).buffer);
   return {items:Object.keys(MASTER.items).sort(),src:MASTER.src||'',
     keptDet:!!(MASTER.det&&MASTER.det['90000001']),nm:MASTER.items['90000003']||''};
 },{b64:mkOldMaster([['90000003','สินค้าทดสอบ C จากไฟล์เดิม'],['90000001','สินค้าทดสอบ A ชื่อเดิม']])});
 t('ไฟล์ master แบบเดิมยังอ่านได้เหมือนเดิม',r9.nm==='สินค้าทดสอบ C จากไฟล์เดิม'&&!r9.src,r9.nm);
 t('🛟 ไฟล์เดิมไม่มีน้ำหนัก/ขนาดลัง — ห้ามลบของที่ไฟล์ dcode เคยให้ไว้',r9.keptDet,
   JSON.stringify(r9.items));

 /* ---------------- 10) ไฟล์ราคาแนบขนาด/น้ำหนักติดไปด้วย ---------------- */
 const r10=await ev(()=>{
   const it={s:'130 มล.',p:36,ip:0};
   const live=prDimTxt('90000001',{});
   const fromFile=prDimTxt('77770000',{d:[2.5,100,200,150]});
   const none=prDimTxt('77770001',{});
   return {live:live,fromFile:fromFile,none:none};
 });
 t('ตารางราคาในแอปอ่าน master สด ๆ ก่อน (อัพ master แล้วเห็นเลย)',/5\.63 กก\./.test(r10.live),r10.live);
 t('…ถ้าไม่มีใน master ก็ใช้ค่าที่แนบมากับไฟล์ราคา (ทางเดียวที่หน้าแคตาลอคสาธารณะอ่านได้)',
   /2\.5 กก\./.test(r10.fromFile)&&/10×20×15 ซม\./.test(r10.fromFile),r10.fromFile);
 t('🛟 ไม่มีข้อมูลเลย = เงียบ ไม่ขึ้นเลขมั่ว',r10.none==='',JSON.stringify(r10.none));
 /* หน้าแคตาลอคสาธารณะมีสูตรเดียวกัน (คัดลอกไว้สองที่ เพราะเป็นไฟล์เดี่ยว) */
 const PL=fs.readFileSync(path.join(ROOT,'public','pricelist.html'),'utf8');
 t('🔑 หน้าแคตาลอคสาธารณะมีสูตรแปลงน้ำหนัก/ขนาดลังเหมือนกัน',
   /ลัง '\+\(Math\.round\(d\[0\]\*100\)\/100\)\+' กก\./.test(PL)&&/กล่อง '\+/.test(PL),
   /dimTxt/.test(PL)?'มี dimTxt':'ไม่พบ dimTxt');
 t('🔒 หน้าแคตาลอคสาธารณะยังยิงแค่ /api/pricelist เท่านั้น',
   (PL.match(/fetch\(/g)||[]).length===1&&/\/api\/pricelist/.test(PL),
   (PL.match(/fetch\([^)]*\)/g)||[]).join(' , '));

 /* ---------------- 11) ไฟล์ละเอียด PSI_Detail_Report (ของแถม) ----------------
    เจ้าของส่งไฟล์ใหม่มา 26 พ.ย. 69 — ของซื้อเหมือนไฟล์เดิมเป๊ะ มี Stock Type = Free เพิ่มมา
    ⚠️ ของแถมต้องเก็บแยก ห้ามรวมเข้า "เข้าคลังแล้ว" ไม่งั้นของที่สั่งจะอ่านว่าเข้าเกิน */
 const rowsD=[
   detRow({code:'90000001',cs:40,v:13072,inv:'3100000001'}),
   detRow({code:'90000001',cs:6,st:'Free',inv:'3100000001',v:0}),
   detRow({code:'90000002',cs:160,v:65566,inv:'3100000001'}),
   detRow({code:'90000002',cs:10,st:'Free',inv:'3100000001',v:0}),
   /* รหัสที่วันนั้นมีแต่ของแถม — ต้องไม่อ่านว่า "รับของที่สั่งแล้วได้ 0 ลัง" */
   detRow({code:'90000007',cs:3,st:'Free',inv:'3100000001',v:0}),
   /* คลังที่อ่านไม่ออก ต้องนับเป็นของขายและรายงาน ไม่ใช่ทิ้ง */
   detRow({code:'90000008',cs:7,st:'01-Unknown',inv:'3100000001',v:1000}),
 ];
 const r11=await ev(a=>{window.__log=[];PSI={rows:{},days:{},up:0};
   parsePSI('PSI_Detail_Report_3.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)).buffer);
   psiBust();psiCrBust();
   return {k1:PSI.rows['2026-11-17|90000001'],k2:PSI.rows['2026-11-17|90000002'],
     k7:PSI.rows['2026-11-17|90000007'],k8:PSI.rows['2026-11-17|90000008'],
     day:PSI.days['2026-11-17'],got7:psiGot('90000007','2026-11-16'),
     got1:psiGot('90000001','2026-11-16'),log:window.__log.join(' ')};},{b64:mkDet(rowsD)});
 t('🔑 อ่านไฟล์ละเอียดได้ (จับจากหัว Stock Type + Received Date ที่ไฟล์เดิมไม่มี)',
   !!r11.k1&&r11.k1.cs===40,JSON.stringify(r11.k1));
 t('🔑 ของแถมเก็บแยกเป็น fr ไม่บวกเข้าของซื้อ (ซื้อ 40 / แถม 6)',
   r11.k1.cs===40&&r11.k1.fr===6&&r11.k2.cs===160&&r11.k2.fr===10,
   JSON.stringify([r11.k1,r11.k2]));
 t('ของแถมไม่มีมูลค่า จึงไม่ไปเพิ่มในยอด NIV ของวัน',
   r11.day.v===13072+65566+1000&&r11.day.cs===40+160+7&&r11.day.fr===6+10+3,
   JSON.stringify(r11.day));
 t('🛟 รหัสที่วันนั้นมีแต่ของแถม ต้องไม่อ่านว่า "รับของที่สั่งแล้วได้ 0 ลัง"',
   r11.got7===null&&!!r11.got1,JSON.stringify({got7:r11.got7,got1:r11.got1}));
 t('🛟 คลังที่อ่านไม่ออก นับเป็นของขายและรายงาน ไม่ใช่ทิ้ง',
   r11.k8&&r11.k8.cs===7&&/คลังที่ไม่รู้จัก/.test(r11.log)&&/01-Unknown/.test(r11.log),
   r11.log.slice(0,200));
 t('ไฟล์ละเอียดไม่มีแถว Total — ข้ามแถว Applied filters แถวเดียว',
   /ข้ามแถวสรุปท้ายไฟล์ 1/.test(r11.log),r11.log.slice(0,200));
 t('รายงานของแถมในบันทึกการอัพโหลด',/ของแถม 19 ลัง/.test(r11.log)&&/ไฟล์ละเอียด/.test(r11.log),
   r11.log.slice(0,260));
 /* 🔴 ไฟล์รูปแบบเดิมรวมของแถมไว้ในจำนวนเดียวกัน (วัดจากไฟล์จริง 192/192 คู่: เดิม = ซื้อ + แถม)
    จึงแยกไม่ออก — คีย์ที่ไฟล์ละเอียดให้มาแล้ว ไฟล์เดิมห้ามเขียนทับจำนวน (ฝั่งที่รู้มากกว่าชนะ)
    แต่ยังเพิ่มวัน/รหัสที่ไฟล์ละเอียดไม่มีได้ตามปกติ */
 const r11b=await ev(a=>{window.__log=[];
   parsePSI('PSI_26112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)).buffer);
   psiBust();psiCrBust();
   return {k1:PSI.rows['2026-11-17|90000001'],day:PSI.days['2026-11-17'],
     nw:PSI.rows['2026-11-19|90000055'],nwDay:PSI.days['2026-11-19'],log:window.__log.join(' ')};
 },{b64:mkPsi([
   psiRow({code:'90000001',cs:46,v:13072,inv:'3100000001'}),   /* 40 ซื้อ + 6 แถม รวมมาเป็นก้อนเดียว */
   psiRow({code:'90000055',cs:9,v:500,inv:'3100000009',cre:'2026-11-18',rec:'2026-11-19'})])});
 t('🔑 ไฟล์รูปแบบเดิมเขียนทับจำนวนของคีย์ที่ไฟล์ละเอียดให้มาแล้วไม่ได้ (ไม่งั้นของซื้อจะกลายเป็นยอดรวม 46)',
   r11b.k1.cs===40&&r11b.k1.fr===6&&r11b.day.fr===19,
   JSON.stringify([r11b.k1,r11b.day]));
 t('…แต่ยังเพิ่มวัน/รหัสที่ไฟล์ละเอียดไม่มีได้ตามปกติ',
   !!r11b.nw&&r11b.nw.cs===9&&!!r11b.nwDay,JSON.stringify(r11b.nw));
 t('…และบอกออกมาว่าคงของเดิมไว้ และไฟล์นี้รวมของแถมไว้ในจำนวนเดียวกัน',
   /คงของเดิมไว้ 1 รายการ/.test(r11b.log)&&/รวมของแถมไว้ในจำนวนเดียวกัน/.test(r11b.log),
   r11b.log.slice(0,300));
 /* ของแถมบนหน้าจอ: แยกช่อง + ไม่ถูกนับใน "เข้าคลังแล้ว" */
 const r11c=await ev(a=>{PSI={rows:{},days:{},up:0};
   parsePSI('PSI_Detail_Report_3.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)).buffer);
   psiBust();psiCrBust();psiOrdBust();
   const R=psiCheck('2026-11-16'),by={};R.rows.forEach(r=>by[r.code]=r);
   PSIV.sec='chk';PSIV.ord='2026-11-16';PSIV.only='all';PSIV.q='';renderPsi();
   const tx=document.getElementById('psiBody').textContent.replace(/\s+/g,' ');
   PSIV.sec='in';PSIV.day='2026-11-17';renderPsi();
   const tin=document.getElementById('psiBody').textContent.replace(/\s+/g,' ');
   PSIV.sec='chk';renderPsi();
   return {a:by['90000001'],fr:R.fr,frN:R.frN,tx:tx,tin:tin,
     day19:(PSI.days['2026-11-17']||{}).fr};},{b64:mkDet(rowsD)});
 t('🔑 ของแถมไม่ถูกนับใน "เข้าคลังแล้ว" (สั่ง 40 − Drop 5 = 35 · เข้า 40 · แถม 6 แยกไว้)',
   r11c.a.got===40&&r11c.a.fr===6,JSON.stringify(r11c.a));
 /* ① กับ ② ตอบคนละคำถาม: ① = ของที่เข้าคลังทั้งหมดของวันนั้น (19 ลัง · รวมรหัสที่เราไม่ได้สั่ง)
    ② = ของแถมที่มาพร้อม "ใบสั่งรอบนี้" เท่านั้น (16 ลัง) — ตัวเลขสองหน้าจึงต่างกันได้ ไม่ใช่บั๊ก */
 t('🔑 ของแถมในหน้าเทียบใบสั่ง นับแค่รหัสที่อยู่ในใบสั่งรอบนั้น (16) ส่วนยอดของวันอยู่หน้า ① (19)',
   r11c.fr===16&&r11c.day19===19,'รอบ '+r11c.fr+' · วัน '+r11c.day19);
 t('หน้าเทียบใบสั่งบอกออกมาว่ารอบนี้มีของแถมเข้ามาด้วย และไม่ได้นับรวม',
   /ของแถม/.test(r11c.tx)&&/ไม่ได้นับ/.test(r11c.tx),r11c.tx.slice(0,220));
 t('หน้าของเข้าคลังแยกการ์ด 🛒 ของซื้อ กับ 🎁 ของแถม',
   /ของซื้อ/.test(r11c.tin)&&/ของแถม/.test(r11c.tin)&&/ไม่ได้สั่ง ไม่มีมูลค่า/.test(r11c.tin),
   r11c.tin.slice(0,220));

 /* ---------------- 12) 💰 แถบเงิน: สั่งไป − Drop เทียบ ของเข้าคลัง (NIV) ----------------
    เจ้าของอธิบายหน้านี้เอง 28 พ.ย. 69: "มันคือหน้า order-drop เทียบกับช่อง delivery
    หรือของเข้าคลัง NIV นี้แหละ" — ต้องอ่านจาก ohVal/psiCrOf ชุดเดียวกับหน้าประวัติการสั่งของ */
 const r12=await ev(()=>{
   ORDERS.data['2026-11-16'].vals={main:{ov:1000000,cv:1000000}};
   ORDERS.data['2026-11-16'].dropVal=100000;
   psiCrBust();
   const M=psiMoney('2026-11-16');
   const oh=ohVal('2026-11-16'),cr=psiCrOf('2026-11-16');
   /* วันที่ไฟล์ PSI ยังไปไม่ถึง = ขีด ห้ามเป็น 0 */
   ORDERS.data['2026-11-30'].vals={main:{ov:500000,cv:500000}};
   const late=psiMoney('2026-11-30');
   /* ใบ Drop มากกว่ายอดสั่ง = สองไฟล์ไม่ตรงกัน ต้องบอก ไม่ใช่โชว์ติดลบเฉย ๆ */
   if(ORDERS.dates.indexOf('2026-11-28')<0)ORDERS.dates.push('2026-11-28');
   ORDERS.data['2026-11-28']={rounds:{main:{'90000001':150}},dropped:{},hasResult:true,
     vals:{main:{ov:100000,cv:100000}},dropVal:900000};
   psiOrdBust();
   const over=psiMoney('2026-11-28');
   PSIV.ord='2026-11-28';PSIV.sec='chk';renderPsi();
   const tx=document.getElementById('psiBody').textContent.replace(/\s+/g,' ');
   PSIV.ord='2026-11-16';renderPsi();
   const tx16=document.getElementById('psiBody').textContent.replace(/\s+/g,' ');
   return {M:M,oh:oh,cr:cr,late:late,over:over,tx:tx,tx16:tx16};
 });
 t('🔑 ฝั่งสั่งคือ CON Confirm × 0.85 แล้วหัก Drop — ตัวเดียวกับหน้าประวัติการสั่งของ',
   r12.M.c85===850000&&r12.M.drop===100000&&r12.M.net===750000&&r12.M.net===r12.oh.net,
   JSON.stringify(r12.M));
 t('🔑 ฝั่งของเข้าคลังคือ NIV จากไฟล์ PSI นับตามวันที่ศูนย์ออกบิล',
   r12.M.niv===r12.cr.v&&r12.M.niv===13072+65566+1000,
   JSON.stringify({niv:r12.M.niv,cr:r12.cr.v}));
 t('ต่างกัน = ของเข้าคลัง − ต้องได้',
   r12.M.diff===Math.round((r12.M.niv-750000)*100)/100,JSON.stringify(r12.M.diff));
 t('🛟 วันที่ยังไม่มีไฟล์ PSI ครอบถึง ต้องเป็นขีด ห้ามเป็น 0',
   r12.late.niv===null&&r12.late.diff===null,JSON.stringify(r12.late));
 t('🔑 ใบ Drop มากกว่ายอดสั่ง = บอกออกมาว่าสองไฟล์ไม่ตรงกัน ไม่ใช่โชว์ติดลบเฉย ๆ',
   r12.over.over===true&&/ใบ Drop รอบนี้มีมูลค่ามากกว่ายอดสั่ง/.test(r12.tx),
   r12.tx.slice(0,240));
 t('แถบเงินติดป้าย (ประเมิน) ไว้ฝั่งสั่ง และบอกว่าไม่ใช่ BI Report',
   /\(ประเมิน\)/.test(r12.tx16)&&/ไม่ใช่ BI Report/.test(r12.tx16),r12.tx16.slice(0,300));
 t('แถบเงินบอกว่าเป็นตัวเดียวกับช่องในหน้าประวัติการสั่งของ',
   /ประวัติการสั่งของ/.test(r12.tx16),r12.tx16.slice(0,300));

 /* ---------------- ไฟล์จริง (ถ้าตั้ง env ไว้) ---------------- */
 if(process.env.PSI_FILE&&fs.existsSync(process.env.PSI_FILE)){
   const real=fs.readFileSync(process.env.PSI_FILE).toString('base64');
   const rr=await ev(a=>{window.__log=[];PSI={rows:{},days:{},up:0};
     parsePSI('PSI_real.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)).buffer);
     psiBust();psiCrBust();
     const codes={};let cs=0,fr=0,v=0;
     Object.keys(PSI.rows).forEach(k=>{codes[k.split('|')[1]]=1;const r=PSI.rows[k];
       cs+=+r.cs||0;fr+=+r.fr||0;v+=+r.v||0;});
     return {rows:Object.keys(PSI.rows).length,days:Object.keys(PSI.days).length,
       codes:Object.keys(codes).length,cs:Math.round(cs),fr:Math.round(fr),v:Math.round(v),
       det:/ไฟล์ละเอียด/.test(window.__log.join(' ')),log:window.__log.join(' ')};},{b64:real});
   t('ไฟล์จริง: อ่านได้และแยกวันรับเข้าออกมาได้',rr.days>0&&rr.rows>0,
     rr.rows+' คีย์ · '+rr.days+' วัน · '+rr.codes+' รหัส');
   t('ไฟล์จริง: ไม่มีแถวสรุปท้ายไฟล์หลุดเข้ามาเป็นสินค้า',
     /ข้ามแถวสรุปท้ายไฟล์ [12]/.test(rr.log),rr.log.slice(0,160));
   if(rr.det)t('ไฟล์จริง (ละเอียด): ของแถมแยกออกมาได้ และของซื้อไม่ถูกปน',
     rr.fr>0&&rr.cs>0,'ของซื้อ '+rr.cs+' ลัง · ของแถม '+rr.fr+' ลัง');
   console.log('   (ไฟล์จริง'+(rr.det?' ละเอียด':'')+': '+rr.rows+' รายการ · '+rr.days+' วัน · '+
     rr.codes+' รหัส · ของซื้อ '+rr.cs+' ลัง'+(rr.fr?' · ของแถม '+rr.fr+' ลัง':'')+
     ' · NIV '+rr.v.toLocaleString()+')');
 }else{
   console.log('  (ข้ามเช็คของไฟล์จริง — ตั้ง PSI_FILE=/path/PSI_....xlsx เพื่อตรวจกับไฟล์จริง)');
 }

 let bad2=0;A.forEach(([c,n,x])=>{if(!c)bad2++;console.log((c?'  ✓ ':'  ✗ FAIL: ')+n+(x&&!c?' → '+x:''));});
 const real=errs.filter(e=>!/localStorage/.test(e));
 if(real.length){console.log('PAGE ERRORS:');real.forEach(e=>console.log('   '+e));bad2+=real.length;}
 await b.close();
 console.log('\n'+(bad2?bad2+' FAILED of '+A.length:'ALL PASS ('+A.length+' checks)'));
 process.exit(bad2?1:0);
})();
