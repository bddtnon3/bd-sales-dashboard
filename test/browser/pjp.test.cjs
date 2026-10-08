/* 🗺 PJP — แผนเยี่ยมร้านรายวัน (เจ้าของแจ้ง 8 ต.ค. 69)
   ใช้ไฟล์จริง 2 ไฟล์: Master Outlet Data + PJP_OCT2026 */
const fs=require('fs');const path=require('path');
/* ต้องติดตั้งก่อน (ไม่ได้อยู่ใน package.json เพราะใช้เฉพาะตอนเทสต์):
     npm i --no-save playwright-core xlsx
   แล้วรัน:  node build.cjs && node test/browser/pjp.test.cjs   */
const {chromium}=require('playwright-core');
const BROWSER=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ROOT=path.resolve(__dirname,'..','..');
const F_OUT=path.join(__dirname,'fixtures','master-outlet.xlsx');
const F_PJP=path.join(__dirname,'fixtures','pjp-oct2026.xlsx');
(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const pg=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.setContent(fs.readFileSync(path.join(ROOT,'public','index.html'),'utf8'),{waitUntil:'domcontentloaded'});
 await pg.addScriptTag({path:require.resolve('xlsx/dist/xlsx.full.min.js')});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);

 await pg.evaluate(`
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};
  window.alert=m=>(window.__alerts=window.__alerts||[]).push(String(m));
  window.confirm=()=>true;window.ulog=()=>{};
  window.syncToServer=()=>{window.__sync=(window.__sync||0)+1};
  window.TOKEN=null;
  window.todayISO=()=>'2026-10-08';
  S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
  MASTER={items:{}};ANALYTICS={months:[],lines:{},data:{}};MINSTOCK={man:{}};
  PLAN={items:{},done:{},del:{}};PROMO={items:{},res:{},del:{}};REQUESTS={data:{}};
  ORDERS={dates:[],data:{},names:{},cat:{},catN:{}};POSTATUS={dates:[],data:{}};
  STOCKD={date:null,rows:[],names:{}};PJP={out:{},plan:{},done:{},cfg:{}};
  /* ยอดขายรายร้านจำลอง: 2493638 ยอดตก · 4887526 ไม่ซื้อ 2 เดือน · 2492217 โต */
  STORE={months:['2026-07','2026-08','2026-09','2026-10'],stores:[
    ['209611','2493638','ธงฟ้าสารภี',[[1,10,10000],[1,10,9000],[1,5,4000],[0,0,0]]],
    ['209611','4887526','Washmax',   [[1,10,5000],[1,10,0],   [0,0,0],   [0,0,0]]],
    ['209611','2492217','สิริแมนชั่น',[[1,10,3000],[1,10,3200],[1,20,6000],[0,0,0]]]]};
  buildStoreIdx();
  /* Perfect Store รอบล่าสุด: 2493638 ไม่ผ่าน ขาด A กับ D · 2492217 ผ่าน */
  PSTORE={rounds:{'2026-09-30':{asof:'2026-09-30',bm:9,up:1,rows:[
    ['CT_HPC_211','2493638','ธงฟ้าสารภี','F',0,'R','G','R',3,2,'เติมสินค้ากลุ่ม Skin ให้ครบ 8 SKU',0.012],
    ['CT_HPC_211','2492217','สิริแมนชั่น','N',1,'G','G','G',6,0,'',0.004]]}}};
  EB2B={asof:null,up:0,lines:{},data:{'209611':{n:1,stores:[['2492217','สิริแมนชั่น','2026-09-10']]}}};
 `);

 /* ---------- 0) ปุ่มอัพโหลดต้องอยู่แม้ยังไม่มีข้อมูลเลย ---------- */
 const up0=await ev(()=>{
   document.querySelectorAll('.admin-upload').forEach(e=>e.style.display='');
   _switchTab('pjp');
   const v=document.getElementById('pjpView');
   const btn=[...v.querySelectorAll('button')].find(x=>/อัพโหลดไฟล์/.test(x.innerText));
   if(btn)btn.click();
   const rows=[...document.querySelectorAll('#modal .up-row')].filter(x=>x.style.display!=='none');
   const labels=rows.length?[...rows[0].querySelectorAll('label.drop')].map(l=>l.innerText.replace(/\s+/g,' ').trim()):[];
   const open=!document.getElementById('modal').classList.contains('hidden');
   closeUpload();
   return {btn:!!btn,open:open,title:(document.getElementById('upTitle')||{}).textContent,labels:labels};
 });
 t('⚠️ ยังไม่มีข้อมูลเลย ก็ต้องเห็นปุ่มอัพโหลด (เจอ 8 ต.ค. 69 — ปุ่มหายเพราะอยู่ในกล่องที่ถูกล้าง)',up0.btn);
 t('กดแล้วเปิดกล่องอัพของ PJP',up0.open&&/PJP/.test(up0.title||''),up0.title);
 t('มีให้เลือก 2 ไฟล์: Master Outlet + แผน PJP',
   up0.labels.length===2&&/Master Outlet/.test(up0.labels[0])&&/PJP/.test(up0.labels[1]),JSON.stringify(up0.labels));
 const upS=await ev(()=>{
   S.user={id:'ka',role:'sales',code:'209613',name:'ปฐมภพ'};
   document.querySelectorAll('.admin-upload').forEach(e=>e.style.display='none');
   renderPjp();
   const vis=document.getElementById('pjpUpBar').style.display!=='none';
   S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
   document.querySelectorAll('.admin-upload').forEach(e=>e.style.display='');
   renderPjp();
   return vis;
 });
 t('เซลล์ไม่เห็นแถบอัพโหลด',upS===false);
 const key0=await ev(()=>{
   renderPjp();
   const box=document.getElementById('pjKeyIn');
   const txt=document.getElementById('pjpView').innerText;
   return {box:!!box,warn:/Application restrictions/.test(txt)};
 });
 t('⚠️ ยังไม่มีข้อมูลเลย ก็ต้องตั้งค่า Google Maps key ได้ (ไม่งั้นตั้งไม่ได้จนกว่าจะอัพไฟล์เสร็จ)',key0.box);
 t('...พร้อมเตือนให้ล็อกโดเมนของ key',key0.warn);
 const keySet=await ev(()=>{
   const r={};
   window.alert=m=>{r.msg=String(m)};
   document.getElementById('pjKeyIn').value='ไม่ใช่คีย์';
   pjSaveKey();r.rejected=!pjKey()&&/AIza/.test(r.msg||'');
   document.getElementById('pjKeyIn').value='AIzaSyA1234567890abcdefghijklmnopqrstu';
   pjSaveKey();r.saved=pjKey();
   r.shown=/ตั้งค่าแล้ว/.test(document.getElementById('pjpView').innerText);
   document.getElementById('pjKeyIn').value='';
   pjSaveKey();r.cleared=pjKey()==='';
   window.alert=m=>(window.__alerts=window.__alerts||[]).push(String(m));
   return r;
 });
 t('ใส่ key มั่ว ๆ ระบบไม่รับ และบอกว่าต้องขึ้นต้นด้วย AIza',keySet.rejected,keySet.msg);
 t('ใส่ key ที่หน้าตาถูก บันทึกได้',keySet.saved==='AIzaSyA1234567890abcdefghijklmnopqrstu',keySet.saved);
 t('...แล้วหน้าจอบอกว่าตั้งค่าแล้ว (โชว์แค่หัว-ท้ายของ key)',keySet.shown);
 t('ลบ key ออกได้ (ปล่อยว่างแล้วกดบันทึก)',keySet.cleared);
 const sales2=await ev(()=>{
   S.user={id:'ka',role:'sales',code:'209613',name:'ปฐมภพ'};renderPjp();
   const r=!document.getElementById('pjKeyIn');
   S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};renderPjp();return r;
 });
 t('เซลล์ไม่เห็นช่อง key แม้ยังไม่มีข้อมูล',sales2);

 /* ---------- 1) อ่านไฟล์ Master ---------- */
 const outRes=await ev(a=>{
   const u8=new Uint8Array(a.buf);
   parseOutlet('Master_Outlet_Data.xlsx',u8.buffer);
   const ks=Object.keys(PJP.out);
   const geo=ks.filter(c=>PJP.out[c].la!=null).length;
   return {n:ks.length,geo:geo,s:PJP.out['2488705']};
 },{buf:[...fs.readFileSync(F_OUT)]});
 t('อ่าน Master ได้ 2,901 ร้าน (จาก 2,995 แถว — มีรหัสซ้ำ 91 รหัส)',outRes.n===2901,outRes.n);
 t('มีพิกัดเกือบครบ และเลือกแถวที่มีพิกัดเมื่อรหัสซ้ำ',outRes.geo>=2889&&outRes.geo<=2901,outRes.geo);
 t('เก็บชื่อ/พิกัด/ที่อยู่/ประเภท/Perfect Store ครบ',
   outRes.s&&/นิตท์/.test(outRes.s.n)&&Math.abs(outRes.s.la-13.88282)<0.001&&
   Math.abs(outRes.s.lo-100.40402)<0.001&&outRes.s.t==='MPM-PT'&&outRes.s.ps==='UPT',JSON.stringify(outRes.s));

 /* ---------- 2) อ่านไฟล์ PJP ---------- */
 const pjRes=await ev(a=>{
   const u8=new Uint8Array(a.buf);
   parsePJP('PJP_OCT2026.xlsx',u8.buffer);
   const ds=Object.keys(PJP.plan).sort();
   return {ds:ds,n:ds.length,first:ds[0],last:ds[ds.length-1],mon:PJP.cfg.planMon,
     d5:Object.keys(PJP.plan['2026-10-05']||{}).sort(),
     stops11:pjStops('2026-10-05','209611').slice(0,4),
     n11:pjStops('2026-10-05','209611').length};
 },{buf:[...fs.readFileSync(F_PJP)]});
 t('ได้ครบทั้งเดือน 24 วัน (12 วันจากไฟล์ + รอบสอง +14 วัน)',pjRes.n===24,pjRes.n+' → '+pjRes.ds.join(' '));
 t('ช่วงวัน 5–31 ต.ค.',pjRes.first==='2026-10-05'&&pjRes.last==='2026-10-31',pjRes.first+'→'+pjRes.last);
 t('รู้ว่าเป็นแผนเดือน 2026-10',pjRes.mon==='2026-10',pjRes.mon);
 t('วันที่ 5 มีครบ 12 สาย',pjRes.d5.length===12,pjRes.d5.join(','));
 t('สาย CT11 วันที่ 5 มี 26 ร้าน',pjRes.n11===26,pjRes.n11);
 t('เรียงตามลำดับการเยี่ยม 1,2,3,4 และรหัสร้านถูก',
   JSON.stringify(pjRes.stops11)==='[{"code":"2493638","ord":1},{"code":"4887526","ord":2},{"code":"2492217","ord":3},{"code":"2491545","ord":4}]',
   JSON.stringify(pjRes.stops11));
 const cyc=await ev(()=>({a:pjStops('2026-10-05','209611').map(s=>s.code).join(','),
                          b:pjStops('2026-10-19','209611').map(s=>s.code).join(',')}));
 t('รอบสอง (19 ต.ค.) วิ่งซ้ำกับ 5 ต.ค. เป๊ะ',cyc.a===cyc.b&&cyc.a.length>10,cyc.a.slice(0,40));

 /* ---------- 3) งานที่ต้องทำรายร้าน ---------- */
 const tk=await ev(()=>({
   a:pjTasks('2493638').map(x=>x.k+':'+x.s),
   b:pjTasks('4887526').map(x=>x.k+':'+x.s),
   c:pjTasks('2492217').map(x=>x.k+':'+x.s),
   cta:(pjPS('2493638')||{}).r&&pjPS('2493638').r[10]}));
 t('ร้านยอดตกขึ้นป้าย "ยอดตก"',tk.a.some(x=>/^down:/.test(x)),tk.a.join(' | '));
 t('ร้านยอดตกขึ้น PS ยังไม่ผ่าน พร้อมบอกว่าขาด A/D',
   tk.a.some(x=>/^ps:.*A\/D/.test(x)),tk.a.join(' | '));
 t('ดึง Call to action ของ Unilever มาได้',/Skin/.test(tk.cta||''),tk.cta);
 t('ร้านไม่ซื้อ 2 เดือนขึ้นป้ายแดง',tk.b.some(x=>/^dead:ไม่ซื้อ 2 เดือน/.test(x)),tk.b.join(' | '));
 t('ร้านที่ยังไม่เปิด eB2B ขึ้นเตือน (และร้านที่เปิดแล้วไม่ขึ้น)',
   tk.b.some(x=>/^eb:/.test(x))&&!tk.c.some(x=>/^eb:/.test(x)),tk.b.join(' | ')+'  ||  '+tk.c.join(' | '));
 t('ร้านยอดโต + PS ผ่าน ขึ้นป้ายเขียว',tk.c.some(x=>/^up:/.test(x))&&tk.c.some(x=>/^psok:/.test(x)),tk.c.join(' | '));

 /* ---------- 4) หน้าจอฝั่งผู้จัดการ ---------- */
 const ui=await ev(()=>{
   _switchTab('pjp');PJ.d='2026-10-05';PJ.line='209611';renderPjp();
   const v=document.getElementById('pjpView');
   return {bar:document.getElementById('pjpBar').innerText,
     cards:[...document.querySelectorAll('#pjpCards .card .v')].map(x=>x.innerText.trim()),
     rows:v.querySelectorAll('.pj-card').length,
     first:(v.querySelector('.pj-card')||{}).innerText||'',
     nav:v.querySelectorAll('a.pj-b[href*="google.com/maps"]').length,
     keyBox:!!document.getElementById('pjKeyIn'),
     txt:v.innerText};
 });
 t('หัวข้อบอกสาย + วัน + วันในสัปดาห์',/CT11/.test(ui.bar)&&/5 ต\.ค\. 2569/.test(ui.bar)&&/จันทร์/.test(ui.bar),ui.bar.split('\n')[0]);
 t('การ์ดสรุป: 26 ร้าน / เข้าแล้ว 0',ui.cards[0]==='26'&&ui.cards[1]==='0',JSON.stringify(ui.cards));
 t('ขึ้นครบ 26 ร้าน',ui.rows===26,ui.rows);
 t('ร้านแรกคือลำดับ 1 และมีป้ายงานที่ต้องทำ',/ธงฟ้าสารภี/.test(ui.first)&&/ยอดตก/.test(ui.first),ui.first.replace(/\n/g,' · ').slice(0,120));
 t('ทุกร้านที่มีพิกัดมีปุ่มนำทาง Google Maps',ui.nav>=20,ui.nav);
 t('ยังไม่ใส่ API key → ผู้จัดการเห็นช่องใส่ key',ui.keyBox);
 t('เตือนเรื่องล็อกโดเมนของ key',/Application restrictions/.test(ui.txt));
 t('ไม่มี NaN / undefined บนหน้าจอ',!/NaN|undefined/.test(ui.txt));

 /* ---------- 5) ติ๊กว่าเข้าร้านแล้ว ---------- */
 const tick=await ev(()=>{
   pjTick('2493638','2026-10-05');
   const a={done:PJP.done['2493638|2026-10-05'],cards:[...document.querySelectorAll('#pjpCards .card .v')].map(x=>x.innerText.trim())};
   pjTick('2493638','2026-10-05');
   a.off=PJP.done['2493638|2026-10-05'];
   pjTick('2493638','2026-10-05');
   return a;
 });
 t('ติ๊กแล้วบันทึกเป็น v:1 พร้อมชื่อคนติ๊ก',tick.done&&tick.done.v===1&&tick.done.by==='ผู้จัดการ',JSON.stringify(tick.done));
 t('การ์ด "เข้าแล้ว" ขยับเป็น 1',tick.cards[1]==='1',JSON.stringify(tick.cards));
 t('ยกเลิกติ๊กเก็บเป็น v:0 ไม่ใช่ลบคีย์ (กัน merge ย้อนกลับ)',tick.off&&tick.off.v===0,JSON.stringify(tick.off));

 /* ---------- 6) กรอง + ปฏิทิน ---------- */
 const filt=await ev(()=>{
   pjSetOnly('todo');const todo=document.querySelectorAll('#pjpView .pj-card').length;
   pjSetOnly('hot');const hot=document.querySelectorAll('#pjpView .pj-card').length;
   pjSetOnly('all');
   pjSetView('month');
   const cal=document.querySelectorAll('#pjpView .pj-dc:not(.empty)').length;
   const withPlan=[...document.querySelectorAll('#pjpView .pj-dc:not(.empty):not(.off)')].length;
   const sel=document.querySelectorAll('#pjpView .pj-dc.sel').length;
   const today=document.querySelectorAll('#pjpView .pj-dc.today').length;
   pjSetView('day');
   return {todo,hot,cal,withPlan,sel,today};
 });
 t('กรอง "ยังไม่เข้า" ตัดร้านที่ติ๊กแล้วออก',filt.todo===25,filt.todo);
 t('กรอง "ต้องดูเป็นพิเศษ" เหลือเฉพาะร้านที่มีปัญหา',filt.hot>0&&filt.hot<26,filt.hot);
 t('ปฏิทินเดือนมี 31 ช่อง',filt.cal===31,filt.cal);
 t('ปฏิทินไฮไลต์วันที่เลือก และวันนี้',filt.sel===1&&filt.today===1,JSON.stringify(filt));
 t('ปฏิทินมีวันที่มีแผน 24 วัน',filt.withPlan===24,filt.withPlan);

 /* ---------- 7) ฝั่งเซลล์เห็นเฉพาะสายตัวเอง ---------- */
 const sales=await ev(()=>{
   S.user={id:'ka',role:'sales',code:'209613',name:'ปฐมภพ'};
   PJ.line='209611';                       /* แกล้งตั้งสายอื่นไว้ */
   renderPjp();
   const r={cur:pjCur(),bar:document.getElementById('pjpBar').innerText,
     sel:document.querySelectorAll('#pjpCtl select').length,
     keyBox:!!document.getElementById('pjKeyIn')};
   S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};PJ.line='209611';renderPjp();
   return r;
 });
 t('เซลล์ถูกบังคับให้เห็นสายตัวเอง แม้ตัวแปรจะค้างสายอื่น',sales.cur==='209613',sales.cur);
 t('เซลล์ไม่มีช่องเลือกสาย',sales.sel===0,sales.sel);
 t('เซลล์ไม่เห็นช่องใส่ API key',!sales.keyBox);

 /* ---------- 8) Digital Coverage ซ่อนไว้ก่อน ---------- */
 const dt=await ev(()=>{
   const a=[...document.querySelectorAll('#pjpCtl select option')].map(o=>o.value);
   pjToggleDT();
   const bb=[...document.querySelectorAll('#pjpCtl select option')].map(o=>o.value);
   pjToggleDT();PJ.line='209611';renderPjp();
   return {a,b:bb};
 });
 t('ค่าเริ่มต้นซ่อนสาย Digital Coverage (2096DT)',dt.a.indexOf('2096DT')<0&&dt.a.length===11,dt.a.join(','));
 t('ติ๊กแล้วเห็น 2096DT',dt.b.indexOf('2096DT')>=0&&dt.b.length===12,dt.b.join(','));

 /* ---------- 9) อัพซ้ำ / อัพเดือนอื่น ต้องไม่ทำข้อมูลเดิมหาย ---------- */
 const keep=await ev(a=>{
   PJP.plan['2026-09-14']={'209611':'9999999:1'};
   PJP.done['9999999|2026-09-14']={at:1,by:'เซลล์',v:1};
   PJP.out['9999999']={n:'ร้านเดือนก่อน',up:1};
   const u8=new Uint8Array(a.buf);
   parsePJP('PJP_OCT2026.xlsx',u8.buffer);          /* อัพไฟล์เดิมซ้ำ */
   return {sep:!!PJP.plan['2026-09-14'],sepRow:PJP.plan['2026-09-14']&&PJP.plan['2026-09-14']['209611'],
     oldOut:!!PJP.out['9999999'],done:!!PJP.done['9999999|2026-09-14'],
     oct:Object.keys(PJP.plan).filter(d=>d.slice(0,7)==='2026-10').length};
 },{buf:[...fs.readFileSync(F_PJP)]});
 t('⚠️ อัพไฟล์ใหม่แล้วแผนเดือนก่อนยังอยู่ครบ',keep.sep&&keep.sepRow==='9999999:1',JSON.stringify(keep));
 t('⚠️ ร้านเก่าที่ไม่มีในไฟล์ใหม่ ไม่ถูกลบ',keep.oldOut);
 t('⚠️ ประวัติการติ๊กเข้าร้านไม่หาย',keep.done);
 t('อัพซ้ำแล้ววันของเดือนนี้ยังเป็น 24 วัน ไม่บวกเพิ่ม',keep.oct===24,keep.oct);

 /* ---------- 9b) แผนที่ต้องโหลดครั้งเดียวต่อการเปิดหน้า ไม่ใช่ทุกครั้งที่กดอะไร ----------
    ถ้า div แผนที่ถูกสร้างใหม่ทุก render จะต้องสร้าง Map ใหม่ = เสียโควต้า Google ทุกคลิก
    (และแผนที่หายไปจากจอด้วย) */
 const mapKeep=await ev(()=>{
   PJP.cfg.gmap='AIzaSyA1234567890abcdefghijklmnopqrstu';
   PJ.d='2026-10-05';PJ.line='209611';renderPjp();
   const el1=document.getElementById('pjMap');
   const vis1=document.getElementById('pjMapWrap').style.display!=='none';
   pjStep(1);pjSetOnly('hot');pjSetOnly('all');pjTick('2493638','2026-10-06');
   PJ.d='2026-10-05';renderPjp();
   const el2=document.getElementById('pjMap');
   const same=el1===el2&&!!el1;
   const inBody=!!document.getElementById('pjpBody').querySelector('#pjMap');
   PJP.cfg.gmap='';renderPjp();
   const hid=document.getElementById('pjMapWrap').style.display==='none';
   return {vis1,same,inBody,hid};
 });
 t('ใส่ key แล้วกล่องแผนที่โผล่',mapKeep.vis1);
 t('⚠️ กดเปลี่ยนวัน/กรอง/ติ๊กร้าน แล้ว div แผนที่ยังเป็นตัวเดิม (โหลด Google Maps ครั้งเดียว)',
   mapKeep.same,JSON.stringify(mapKeep));
 t('...เพราะกล่องแผนที่ไม่ได้อยู่ในส่วนที่ถูกเขียนทับ',!mapKeep.inBody);
 t('เอา key ออก กล่องแผนที่ก็ซ่อนไป',mapKeep.hid);

 /* ---------- 10) ไม่แตะข้อมูลก้อนอื่น ---------- */
 const other=await ev(()=>JSON.stringify({O:ORDERS,P:POSTATUS,R:REQUESTS,PL:PLAN,PR:PROMO,S:STOCKD}));
 const before=other;
 await ev(()=>{pjSetView('week');renderPjp();pjSetView('day');renderPjp();
   pjStep(1);pjStep(-1);pjSetOnly('hot');pjSetOnly('all');});
 const after=await ev(()=>JSON.stringify({O:ORDERS,P:POSTATUS,R:REQUESTS,PL:PLAN,PR:PROMO,S:STOCKD}));
 t('ORDERS / POSTATUS / REQUESTS / PLAN / PROMO / STOCKD ไม่ถูกแตะ',before===after);

 let bad=0;A.forEach(([c,n,x])=>{if(!c)bad++;console.log((c?'  ✓ ':'  ✗ FAIL: ')+n+(x&&!c?' → '+x:''));});
 const real=errs.filter(e=>!/localStorage/.test(e));
 if(real.length){console.log('PAGE ERRORS:');real.forEach(e=>console.log('   '+e));bad+=real.length;}
 await b.close();
 console.log('\n'+(bad?bad+' FAILED of '+A.length:'ALL PASS ('+A.length+' checks)'));
 process.exit(bad?1:0);
})();
