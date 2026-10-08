/* 🔁 Drop ค้าง — ของที่โดนดรอปรอบก่อน ๆ แล้วยังไม่ได้ของ (เจ้าของแจ้ง 8 ต.ค. 69)
   เทสต์ครอบ: การไล่ตามไปข้างหน้า · ช่วงวัน · รหัสเปลี่ยน · ใบ Drop รูปแบบเก่า (ตัวเลขล้วน)
   · สีในใบสั่ง (ของขาด/ปิดช่อง) · สิทธิ์ · และ "ห้ามเขียนทับข้อมูลเดิม" */
const fs=require('fs');const path=require('path');
/* ต้องติดตั้งก่อน (ไม่ได้อยู่ใน package.json เพราะใช้เฉพาะตอนเทสต์):
     npm i --no-save playwright-core
   แล้วรัน:  node test/browser/dropback.test.cjs            */
const {chromium}=require('playwright-core');
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');
const BROWSER=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const W=+(process.env.W||1280);
 const pg=await (await b.newContext({viewport:{width:W,height:950}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.setContent(fs.readFileSync(PAGE,'utf8'),{waitUntil:'domcontentloaded'});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=f=>pg.evaluate(f);

 /* ---------------- ข้อมูลจำลอง ----------------
    A 10000001 ดรอป 1 ต.ค. แล้วดรอปซ้ำ 2 ต.ค. · 3 ต.ค. สั่งอีกแต่ยังไม่มีผล  → รอผล
    B 10000002 ดรอป 1 ต.ค. ได้บางส่วน 2 ลัง · 6 ต.ค. สั่ง 3 ได้ครบ            → ได้แล้ว
    C 10000003 สั่ง 1 ต.ค. ไม่โดนดรอป                                          → ไม่ต้องขึ้น
    E 20000001 ดรอป 5 ต.ค. ไม่มีใครสั่งซ้ำ                                     → ยังไม่ได้สั่งซ้ำ
    F 31000001 ดรอป 1 ต.ค. · 3 ต.ค. ของมาในรหัสใหม่ 31000009 (ชื่อเดียวกัน)    → ได้แล้ว (รหัสใหม่)
    H 31000002 ดรอป 4 ต.ค. เก็บเป็น "ตัวเลขล้วน" แบบไฟล์รุ่นเก่า               → ยังไม่ได้เลย
 */
 await pg.evaluate(`
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};
  window.syncToServer=()=>{window.__synced=(window.__synced||0)+1};
  window.ulog=()=>{};window.confirm=()=>true;
  window.fetch=()=>Promise.resolve({ok:true,json:()=>Promise.resolve({})});
  S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
  DATA.lines={'2096_97':{display:'KA97'}};DATA.focus_order=['2096_97'];
  MASTER={items:{}};ANALYTICS={months:[],lines:{},data:{}};MINSTOCK={man:{}};
  PLAN={items:{},done:{},del:{}};PROMO={items:{},res:{},del:{}};REQUESTS={data:{}};
  STOCKD={date:'2026-10-06',up:1,names:{},rows:[]};
  const NM={'10000001':'บรีส เอกเซล น้ำเขียว 1500 มล.','10000002':'โอโม น้ำ 2000 มล.',
            '10000003':'ซันไลต์ มะนาว 800 มล.','20000001':'โดฟ แชมพู ดีท็อกซ์ 450 มล.',
            '31000001':'วาสลีน โลชั่น ขาวใส 400 มล.','31000009':'วาสลีน โลชั่น ขาวใส 400 มล.',
            '31000002':'ปอนด์ ครีมกลางวัน 50 ก.'};
  ORDERS={dates:[],data:{},names:Object.assign({},NM),
    cat:{'10000001':'Home_Care','10000002':'Home_Care','10000003':'Home_Care',
         '20000001':'PC_3D','31000001':'Skin_Care1','31000009':'Skin_Care1','31000002':'Skin_Care1'},
    catN:{}};
  const mk=(d,rounds,dropped,hasResult)=>{ORDERS.data[d]={rounds:{main:rounds},dropped:dropped||null,
    hasResult:!!hasResult,vals:{}};ORDERS.dates.push(d);};
  mk('2026-10-01',{'10000001':10,'10000002':5,'10000003':8,'31000001':7},
     {'10000001':{o:10,d:0,q:10},'10000002':{o:5,d:2,q:3},'31000001':{o:7,d:0,q:7}},true);
  mk('2026-10-02',{'10000001':10,'20000002':4},{'10000001':{o:10,d:0,q:10}},true);
  mk('2026-10-03',{'10000001':10,'31000009':7},null,false);          /* ยังไม่มีผล Drop */
  mk('2026-10-04',{'31000002':9,'31000009':7},{'31000002':9},true);  /* ใบ Drop รูปแบบเก่า: ตัวเลขล้วน · และรหัสใหม่ของ F ได้ของรอบนี้ */
  mk('2026-10-05',{'20000001':6},{'20000001':{o:6,d:0,q:6}},true);
  mk('2026-10-06',{'10000002':3},{},true);                           /* ได้ครบ ไม่มีใครดรอป */
  ORDERS.dates.sort();
  /* ใบสั่งรอบล่าสุด (สี) — E ของขาด (เทา) · A ปิดช่องฟ้า และมีรหัสพี่น้องเปิดอยู่ */
  POSTATUS={dates:['2026-10-06'],data:{'2026-10-06':{up:1,file:'BD_061026.xlsx',allSeq:1,
    all:'10000001,10000002,10000003,20000001,31000001,31000009,31000002',
    items:{'20000001':{s:1},'10000001':{x:'00FFFF'}}}}};
  initOrder();ORD.date='2026-10-06';ORD.dbWin=7;ORD.dbGot=false;
  PO_SEQ=null;pgBust();
  _switchTab('order');ordSetSec('req');renderOrder();
 `);

 const snap=()=>ev(()=>JSON.stringify({O:ORDERS,P:POSTATUS,S:STOCKD,R:REQUESTS}));
 const before=await snap();

 /* ---------- 1) การคิดสถานะ ---------- */
 const scan=await ev(()=>{
   const s=dbScan('2026-10-06',7);const m={rounds:s.rounds,by:{}};s.rows.forEach(r=>m.by[r.code]=r);return m;});
 t('สินค้าที่ไม่เคยโดนดรอป ไม่ขึ้นในลิสต์',!scan.by['10000003']&&!scan.by['20000002'],Object.keys(scan.by).join(','));
 t('พบของที่โดนดรอปในช่วง 7 วัน ครบ 5 รหัส',Object.keys(scan.by).length===5,Object.keys(scan.by).join(','));
 t('บอกได้ว่านับจากใบ Drop รอบไหนบ้าง (ศูนย์ไม่ได้สั่งทุกวัน)',
   scan.rounds.join(',')==='2026-10-01,2026-10-02,2026-10-04,2026-10-05',scan.rounds.join(','));
 const A1=scan.by['10000001']||{};
 t('A: ดรอปล่าสุด 2 ต.ค. และนับได้ว่าโดน 2 รอบ',A1.last==='2026-10-02'&&A1.rounds===2,JSON.stringify(A1));
 t('A: ค้างเท่ากับ Q ของรอบล่าสุด (10) ไม่ใช่ 20 — ห้ามนับซ้ำ',A1.left===10,A1.left);
 t('A: สั่งซ้ำ 3 ต.ค. แล้วยังไม่มีผล → "รอผล"',A1.st==='none'&&A1.act==='wait'&&A1.pendDate==='2026-10-03',JSON.stringify(A1));
 const B1=scan.by['10000002']||{};
 t('B: ได้ของครบในรอบหลัง (6 ต.ค.) → ได้แล้ว',B1.st==='got'&&B1.gotDate==='2026-10-06',JSON.stringify(B1));
 t('B: ค้าง 0',B1.left===0,B1.left);
 const E1=scan.by['20000001']||{};
 t('E: ไม่มีใครสั่งซ้ำเลย → ยังไม่ได้สั่งซ้ำ',E1.st==='none'&&E1.act==='never'&&E1.left===6,JSON.stringify(E1));
 const F1=scan.by['31000001']||{};
 t('F: ของมาในรหัสใหม่ (ชื่อสินค้าเดียวกัน) → นับว่าได้แล้ว',
   F1.st==='got'&&F1.alt==='31000009'&&F1.gotDate==='2026-10-04',JSON.stringify(F1));
 const H1=scan.by['31000002']||{};
 t('ใบ Drop รูปแบบเก่า (ตัวเลขล้วน) ยังอ่านได้',H1.q===9&&H1.st==='none'&&H1.left===9,JSON.stringify(H1));

 /* ---------- 2) ช่วงวันย้อนหลัง ---------- */
 const wins=await ev(()=>({
   w3:dbScan('2026-10-06',3).rows.map(r=>r.code).sort().join(','),
   w5:dbScan('2026-10-06',5).rows.map(r=>r.code).sort().join(','),
   w7:dbScan('2026-10-06',7).rows.map(r=>r.code).sort().join(','),
   w14:dbScan('2026-10-06',14).rows.map(r=>r.code).sort().join(',')}));
 t('ย้อนหลัง 3 วัน (4–6 ต.ค.) เห็นเฉพาะที่ดรอปในช่วงนั้น',wins.w3==='20000001,31000002',wins.w3);
 t('ย้อนหลัง 5 วัน (2–6 ต.ค.) เพิ่ม A เข้ามา',wins.w5==='10000001,20000001,31000002',wins.w5);
 t('ย้อนหลัง 1 อาทิตย์ เห็นครบ 5 รหัส',wins.w7.split(',').length===5,wins.w7);
 t('ย้อนหลัง 2 อาทิตย์ ไม่ได้มากกว่าเดิม (ไม่มีข้อมูลเก่ากว่านั้น)',wins.w14===wins.w7,wins.w14);

 /* ---------- 3) หน้าจอ ---------- */
 const ui=await ev(()=>{
   const el=document.getElementById('dropBack');
   const bands=[...el.querySelectorAll('tbody tr.grp-row')].map(r=>r.innerText.trim());
   const rows=[...el.querySelectorAll('tbody tr')].filter(r=>!r.classList.contains('grp-row'))
     .map(r=>({code:r.cells[0].innerText.trim(),st:r.cells[6].innerText.trim(),act:r.cells[7].innerText.trim(),stk:r.cells[5].innerText.trim()}));
   return {vis:el.style.display!=='none',txt:el.innerText,bands:bands,rows:rows,
     btns:[...el.querySelectorAll('.seg button')].map(x=>x.innerText.trim()),
     on:(el.querySelector('.seg button.on')||{}).innerText};
 });
 t('กล่องขึ้นให้ผู้จัดการเห็น',ui.vis);
 t('ค่าเริ่มต้นซ่อนตัวที่ได้ของครบแล้ว (B หาย) เหลือ 4 แถว',
   ui.rows.length===4&&!ui.rows.some(r=>r.code==='10000002'),JSON.stringify(ui.rows.map(r=>r.code)));
 t('⚠️ ตัวที่ปิดด้วย "รหัสพี่น้อง" ต้องไม่ถูกซ่อน — จับคู่ด้วยชื่อไม่แม่น 100%',
   ui.rows.some(r=>r.code==='31000001'&&/เช็กว่าตัวเดียวกันไหม/.test(r.st)),
   JSON.stringify((ui.rows.find(r=>r.code==='31000001')||{}).st));
 t('มีคอลัมน์สต็อกคงเหลือให้ดูว่าด่วนแค่ไหน',ui.rows.every(r=>r.stk&&r.stk.length>0),
   JSON.stringify(ui.rows.map(r=>r.stk)));
 t('แบ่งตามหมวดในใบสั่งซื้อ',ui.bands.length===3,JSON.stringify(ui.bands));
 t('เรียงหมวดตามหน้าใบสั่งซื้อ (Home_Care → PC_3D → Skin_Care1)',
   ui.bands.map(s=>s.split(' ')[1]).join(',')==='Home_Care,PC_3D,Skin_Care1',ui.bands.join(' / '));
 t('มีปุ่มเลือกช่วง 4 แบบ รวม "1 อาทิตย์"',ui.btns.join(',')==='3 วัน,5 วัน,1 อาทิตย์,2 อาทิตย์',ui.btns.join(','));
 t('ปุ่มที่เลือกอยู่คือ 1 อาทิตย์',/1 อาทิตย์/.test(ui.on||''),ui.on);
 const rA=ui.rows.find(r=>r.code==='10000001')||{};
 const rE=ui.rows.find(r=>r.code==='20000001')||{};
 const rH=ui.rows.find(r=>r.code==='31000002')||{};
 t('A: แถวบอกว่ายังไม่ได้เลย',/ยังไม่ได้เลย/.test(rA.st||''),rA.st);
 t('A: ใบสั่งรอบนี้ปิดช่อง (ฟ้า) → บอกว่ายังไม่เปิดให้สั่ง ไม่ใช่สั่งเพิ่มเลย',
   /ยังไม่เปิดให้สั่ง/.test(rA.act||'')&&!/สั่งเพิ่มรอบนี้เลย/.test(rA.act||''),rA.act);
 t('⚠️ A: สั่งซ้ำไปแล้วรอผล ต้องไม่ถูกป้ายสีบัง — ต้องเห็นทั้งสองอย่าง',
   /สั่งซ้ำแล้ว รอผล/.test(rA.act||'')&&/ยังไม่เปิดให้สั่ง/.test(rA.act||''),rA.act);
 t('บอกว่าเช็คกับใบสั่งวันไหน (poRoundFor อาจหยิบใบคนละวัน)',
   /ต้องทำอะไร.*เช็คกับ|เช็คกับใบสั่งวันที่/.test(ui.txt.replace(/\n/g,' ')),
   (ui.txt.split('\n').find(l=>/เช็คกับ/.test(l))||'(ไม่มี)'));
 t('E: ใบสั่งคาดเทา = ของขาด → เตือนว่าสั่งไปก็ไม่ได้',/ของขาด/.test(rE.act||''),rE.act);
 t('H: ใบสั่งเปิดปกติ → บอกตรง ๆ ว่ายังไม่ได้สั่งซ้ำ ให้สั่งเพิ่ม',
   /ยังไม่ได้สั่งซ้ำ/.test(rH.act||'')&&/สั่งเพิ่มรอบนี้/.test(rH.act||''),rH.act);
 t('สรุปด้านบนบอกจำนวนแต่ละสถานะ',/ยังไม่ได้เลย/.test(ui.txt)&&/ได้บางส่วน/.test(ui.txt)&&/ได้แล้ว/.test(ui.txt));
 t('บอกช่วงวันที่กำลังดู',/30 ก\.ย\. 2569 – 6 ต\.ค\. 2569/.test(ui.txt),ui.txt.split('\n').slice(0,4).join(' | '));
 t('ไม่มี NaN / undefined บนหน้าจอ',!/NaN|undefined/.test(ui.txt));

 /* ---------- 4) ปุ่มและช่องติ๊กทำงาน ---------- */
 const sw=await ev(()=>{
   dbSetWin(3);
   const a=[...document.querySelectorAll('#dropBack tbody tr')].filter(r=>!r.classList.contains('grp-row')).length;
   dbSetGot(true);
   const b=[...document.querySelectorAll('#dropBack tbody tr')].filter(r=>!r.classList.contains('grp-row')).length;
   dbSetWin(7);
   const c=[...document.querySelectorAll('#dropBack tbody tr')].filter(r=>!r.classList.contains('grp-row'))
     .map(r=>r.cells[0].innerText.trim());
   dbSetGot(false);
   return {a:a,b:b,c:c};
 });
 t('กด "3 วัน" แล้วเหลือ 2 รายการ',sw.a===2,sw.a);
 t('ติ๊กแสดงตัวที่ได้ของแล้ว ยังอยู่ที่ช่วง 3 วัน (ไม่มีตัวได้แล้วในช่วงนั้น)',sw.b===2,sw.b);
 t('กลับมา 1 อาทิตย์ + แสดงที่ได้แล้วด้วย → เห็นครบ 5 รหัส',sw.c.length===5,sw.c.join(','));

 /* ---------- 5) ค้นหาในหน้านี้กรองกล่องนี้ด้วย ---------- */
 const srch=await ev(()=>{
   document.getElementById('orderSearch').value='วาสลีน';renderOrder();
   const codes=[...document.querySelectorAll('#dropBack tbody tr')].filter(r=>!r.classList.contains('grp-row'))
     .map(r=>r.cells[0].innerText.trim());
   document.getElementById('orderSearch').value='';renderOrder();
   return codes;
 });
 t('ช่องค้นหาด้านบนกรองกล่อง Drop ค้างด้วย',srch.join(',')==='31000001'||srch.join(',')==='',srch.join(','));

 /* ---------- 6) สิทธิ์: ฝั่งเซลล์ไม่เห็น ---------- */
 const sales=await ev(()=>{
   S.user={id:'ka97',role:'sales',code:'2096_97',name:'เซลล์'};renderOrder();
   const el=document.getElementById('dropBack');
   const r={hidden:el.style.display==='none',empty:el.innerHTML===''};
   S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};renderOrder();
   return r;
 });
 t('ฝั่งเซลล์ไม่เห็นกล่องนี้',sales.hidden&&sales.empty,JSON.stringify(sales));

 /* ---------- 7) ยังไม่มีข้อมูลเลย ก็ต้องไม่พัง ---------- */
 const empty=await ev(()=>{
   const keep=JSON.stringify(ORDERS);
   ORDERS={dates:[],data:{},names:{},cat:{},catN:{}};initOrder();renderOrder();
   const txt=document.getElementById('dropBack').innerText;
   ORDERS=JSON.parse(keep);initOrder();ORD.date='2026-10-06';ORD.dbWin=7;ORD.dbGot=false;
   PO_SEQ=null;pgBust();renderOrder();
   return txt;
 });
 t('ยังไม่มีข้อมูลการสั่งของ → ขึ้นข้อความบอก ไม่ค้างของเก่า',/ยังไม่มีข้อมูลการสั่งของ/.test(empty),empty.slice(0,80));

 /* ---------- 7b) เคสที่พลาดง่าย: ได้ของแล้วแต่โดนดรอปซ้ำทีหลัง / วันที่มีแต่ใบ Drop ---------- */
 const edge=await ev(()=>{
   const keep=JSON.stringify(ORDERS);
   /* 7 ต.ค. มีแต่ "ใบ Drop" ไม่มีใบสั่งเลย (rounds ว่าง) — ห้ามอ่านว่ารหัสอื่นได้ของ */
   ORDERS.data['2026-10-07']={rounds:{},dropped:{'99999999':{o:1,d:0,q:1}},hasResult:true,vals:{}};
   ORDERS.dates.push('2026-10-07');ORDERS.dates.sort();
   const e1=dbScan('2026-10-06',7).rows.find(r=>r.code==='20000001');
   /* 8 ต.ค. B ที่เคยได้ของครบ โดนดรอปอีกรอบ — ดูจากรอบ 1 ต.ค. ต้องไม่บอกว่า "จบแล้ว" */
   ORDERS.data['2026-10-08']={rounds:{'10000002':5},dropped:{'10000002':{o:5,d:0,q:5}},hasResult:true,vals:{}};
   ORDERS.dates.push('2026-10-08');ORDERS.dates.sort();
   const e2=dbScan('2026-10-01',1).rows.find(r=>r.code==='10000002');
   ORDERS=JSON.parse(keep);initOrder();ORD.date='2026-10-06';ORD.dbWin=7;ORD.dbGot=false;
   PO_SEQ=null;pgBust();renderOrder();
   return {e1:e1,e2:e2};
 });
 t('วันที่อัพแต่ใบ Drop (ไม่มีใบสั่ง) ต้องไม่ถูกอ่านว่า "ได้ของแล้ว"',
   edge.e1&&edge.e1.st==='none'&&edge.e1.act==='never',JSON.stringify(edge.e1));
 t('ได้ของแล้วแต่โดนดรอปซ้ำรอบหลัง → ไม่ปิดเคส (ยึดรอบล่าสุดเสมอ)',
   edge.e2&&edge.e2.st!=='got'&&edge.e2.act==='redrop',JSON.stringify(edge.e2));

 /* ---------- 8) ⚠️ ห้ามเขียนทับข้อมูลเดิม ---------- */
 await ev(()=>{
   /* เรียกทุกทางที่ผู้ใช้กดได้ รวมถึงกรณีสุดโต่ง */
   [1,3,5,7,14,99].forEach(n=>{dbScan('2026-10-06',n);dbScan('2026-10-01',n);});
   DB_WINS.forEach(w=>dbSetWin(w.d));dbSetGot(true);dbSetGot(false);dbSetWin(7);
   renderDropBack();renderOrder();renderDropBack();
 });
 const after=await snap();
 t('⚠️ ORDERS / POSTATUS / STOCKD / REQUESTS ไม่เปลี่ยนแม้ไบต์เดียว',before===after,
   before===after?'':'ก่อน '+before.length+' ไบต์ · หลัง '+after.length+' ไบต์');
 const nosync=await ev(()=>window.__synced||0);
 t('ไม่มีการสั่ง sync ขึ้นเซิร์ฟเวอร์จากกล่องนี้เลย',nosync===0,nosync);
 const notsynced=await ev(()=>{
   /* ORD เป็นตัวแปรหน้าจอ ต้องไม่อยู่ใน payload ที่ส่งขึ้นเซิร์ฟเวอร์ */
   if(typeof _doSync!=='function')return true;
   return !/[{,]\s*ORD\s*[,}]/.test(String(_doSync));});
 t('ตัวเลือกช่วงวัน (ORD) ไม่ถูกส่งขึ้นเซิร์ฟเวอร์',notsynced);

 /* ---------- 9) ไล่ลูกศรทีละบรรทัดใช้ได้กับตารางใหม่ ---------- */
 const rc=await ev(()=>{
   const rows=rcRows();
   const inBox=rows.filter(r=>document.getElementById('dropBack').contains(r)).length;
   return {tot:rows.length,inBox:inBox};
 });
 t('ตาราง Drop ค้างเข้าระบบไล่ลูกศรอัตโนมัติ',rc.inBox>=3,JSON.stringify(rc));
 const focus=await ev(()=>{
   const cb=document.querySelector('#dropBack input[type=checkbox]');cb.focus();cb.click();
   const a1=document.activeElement.tagName;
   const bt=document.querySelector('#dropBack .seg button');bt.focus();bt.click();
   const a2=document.activeElement.tagName;
   ORD.dbWin=7;ORD.dbGot=false;renderDropBack();
   return a1+'/'+a2;
 });
 t('กดปุ่ม/ติ๊กแล้วโฟกัสไม่ค้าง — ลูกศรไล่บรรทัดยังใช้ได้ต่อ',focus==='BODY/BODY',focus);

 let bad=0;A.forEach(([c,n,x])=>{if(!c)bad++;console.log((c?'  ✓ ':'  ✗ FAIL: ')+n+(x&&!c?' → '+x:''));});
 const real=errs.filter(e=>!/localStorage/.test(e));
 if(real.length){console.log('PAGE ERRORS:');real.forEach(e=>console.log('   '+e));bad+=real.length;}
 await b.close();
 console.log('\n'+(bad?bad+' FAILED of '+A.length:'ALL PASS ('+A.length+' checks)'));
 process.exit(bad?1:0);
})();
