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

 /* ---------- 5) บันทึกการเข้าเยี่ยม (ปุ่มเดียวเปิดกล่องโน้ต) ---------- */
 const tick=await ev(async()=>{
   const card=[...document.querySelectorAll('#pjpView .pj-card')][0];
   const btn=[...card.querySelectorAll('button')].find(x=>/บันทึกการเยี่ยม/.test(x.innerText));
   const lbl0=btn?btn.innerText.trim():'';
   btn.click();
   const sheet=!!document.querySelector('#pjNoteModal .pl-mask');
   const quick=[...document.querySelectorAll('#pjNoteModal button')].find(x=>/ไม่มีอะไรต้องตามต่อ/.test(x.innerText));
   await pjNoteQuick();
   const a={lbl0,sheet,quick:!!quick,closed:!document.querySelector('#pjNoteModal .pl-mask'),
     done:PJP.done['2493638|2026-10-05'],
     cards:[...document.querySelectorAll('#pjpCards .card .v')].map(x=>x.innerText.trim())};
   /* ลบบันทึกแล้วต้องเหลือ v:0 ไม่ใช่ลบคีย์ */
   pjNoteOpen('2493638','2026-10-05');
   await pjNoteErase();
   a.off=PJP.done['2493638|2026-10-05'];
   return a;
 });
 t('ปุ่มบนการ์ดเป็น "บันทึกการเยี่ยม" ไม่ใช่ช่องติ๊กเปล่า ๆ',/บันทึกการเยี่ยม/.test(tick.lbl0),tick.lbl0);
 t('กดแล้วกล่องโน้ตเปิด',tick.sheet);
 t('ในกล่องมีปุ่มทางด่วน "เข้าแล้ว ไม่มีอะไรต้องตามต่อ" (ไม่มีอะไรก็กดทีเดียวจบ)',tick.quick);
 t('กดทางด่วนแล้วกล่องปิดเอง',tick.closed);
 t('บันทึกเป็น v:1 พร้อมชื่อคนบันทึก',tick.done&&tick.done.v===1&&tick.done.by==='ผู้จัดการ',JSON.stringify(tick.done));
 t('ทางด่วนไม่ใส่โน้ตและไม่ใส่ธงค้าง',tick.done&&!tick.done.tx&&!tick.done.f,JSON.stringify(tick.done));
 t('การ์ด "บันทึกแล้ว" ขยับเป็น 1',tick.cards[1]==='1',JSON.stringify(tick.cards));
 t('ลบบันทึกเก็บเป็น v:0 ไม่ใช่ลบคีย์ (กัน merge ย้อนกลับ)',tick.off&&tick.off.v===0,JSON.stringify(tick.off));

 /* ---------- 5b) โน้ต + เรื่องที่ต้องตามต่อรอบหน้า ----------
    เจ้าของบอก 8 ต.ค. 69 ว่าการติ๊กเฉย ๆ ซ้ำซ้อน — ต้องโน้ตได้ และต้องเตือนรอบหน้า */
 const note=await ev(async()=>{
   pjNoteOpen('2493638','2026-10-05');
   document.getElementById('pjNoteTx').value='เจ้าของไม่อยู่ ให้กลับมาอีกทีต้นเดือน';
   pjNoteFlag('sell');pjNoteFlag('eb');pjNoteFlag('eb');pjNoteFlag('eb');   /* ติ๊ก/ปลด/ติ๊ก */
   const keptText=document.getElementById('pjNoteTx').value;               /* ติ๊กธงแล้วข้อความต้องไม่หาย */
   await pjNoteSave();
   const rec=PJP.done['2493638|2026-10-05'];
   /* รอบหน้าของร้านนี้ตามแผน PJP */
   const next=pjNextVisit('2493638','2026-10-05');
   PJ.d=next;renderPjp();
   const card=[...document.querySelectorAll('#pjpView .pj-card')].find(c=>/2493638/.test(c.innerText));
   const fuBox=card?card.querySelector('.pj-fu'):null;
   return {rec:rec,keptText:keptText,next:next,
     fuTxt:fuBox?fuBox.innerText.replace(/\s+/g,' ').trim():'',
     purple:card?card.className:'',
     fuCard:(document.querySelectorAll('#pjpCards .card .v')[2]||{}).innerText,
     fuBtn:!!([...document.querySelectorAll('#pjpCtl button')].find(x=>/มีเรื่องค้าง/.test(x.innerText)))};
 });
 t('โน้ตถูกเก็บในเรคอร์ดเดิม (PJP.done[...].tx) ไม่ใช่ section ใหม่',
   note.rec&&note.rec.tx==='เจ้าของไม่อยู่ ให้กลับมาอีกทีต้นเดือน',JSON.stringify(note.rec));
 t('ธงเรื่องที่ต้องตามต่อเก็บเป็น .f',note.rec&&(note.rec.f||[]).join(',')==='sell,eb',JSON.stringify(note.rec&&note.rec.f));
 t('ติ๊กธงแล้วข้อความที่พิมพ์ไว้ไม่หาย',note.keptText==='เจ้าของไม่อยู่ ให้กลับมาอีกทีต้นเดือน',note.keptText);
 t('หาวันเยี่ยมรอบหน้าของร้านนี้จากแผน PJP ได้',/^2026-10-\d\d$/.test(note.next||'')&&note.next>'2026-10-05',note.next);
 t('⚠️ รอบหน้าการ์ดร้านเด้งเตือนเรื่องที่ค้าง',/ค้างจากครั้งก่อน/.test(note.fuTxt)&&/ต้องขายเพิ่ม/.test(note.fuTxt),note.fuTxt.slice(0,110));
 t('...พร้อมโน้ตเดิมที่เซลล์เขียนไว้',/กลับมาอีกทีต้นเดือน/.test(note.fuTxt));
 t('...และการ์ดมีแถบสีม่วงให้เห็นจากไกล ๆ',/\bfu\b/.test(note.purple),note.purple);
 t('การ์ดสรุป "ค้างจากครั้งก่อน" นับได้',note.fuCard==='1',note.fuCard);
 t('มีปุ่มกรอง "มีเรื่องค้าง"',note.fuBtn);

 /* เรื่องค้างต้องเคลียร์เมื่อไปรอบหน้าแล้วไม่ติ๊กอะไร — "รอบล่าสุดชนะ" ไม่ใช่สะสม */
 const clr=await ev(async()=>{
   const next=pjNextVisit('2493638','2026-10-05');
   const after=pjNextVisit('2493638',next);
   await pjSaveVisit('2493638',next,1,'ขายเพิ่มได้ 2 ลัง',[]);
   const a={stillOpenAtNext:!!pjFollow('2493638',next),openAfter:!!pjFollow('2493638',after),
     histKept:!!(PJP.done['2493638|2026-10-05']||{}).tx};
   /* แล้วถ้ารอบล่าสุดติ๊กธงใหม่ ก็ต้องกลับมาค้างอีก */
   await pjSaveVisit('2493638',next,1,'ขอโปรใหม่',['pay']);
   a.reopen=(pjFollow('2493638',after)||{}).f;
   return a;
 });
 t('⚠️ โน้ตเดิมยังอยู่ ไม่ถูกเขียนทับ (ประวัติการเยี่ยมเก็บทุกวัน)',clr.histKept);
 t('ไปรอบหน้าแล้วบันทึกโดยไม่ติ๊กอะไร = เรื่องค้างถือว่าเคลียร์',!clr.openAfter,JSON.stringify(clr));
 t('...แต่ตัวมันเองยังเห็นเรื่องค้างของ "ก่อนหน้านั้น" อยู่ (ไม่ย้อนเวลา)',clr.stillOpenAtNext);
 t('รอบล่าสุดติ๊กธงใหม่ = กลับมาค้างอีก (รอบล่าสุดชนะ ไม่ใช่สะสมทุกรอบ)',
   (clr.reopen||[]).join(',')==='pay',JSON.stringify(clr.reopen));

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
 const mapKeep=await ev(async()=>{
   PJP.cfg.gmap='AIzaSyA1234567890abcdefghijklmnopqrstu';
   PJ.d='2026-10-05';PJ.line='209611';renderPjp();
   const el1=document.getElementById('pjMap');
   const vis1=document.getElementById('pjMapWrap').style.display!=='none';
   pjStep(1);pjSetOnly('hot');pjSetOnly('all');await pjSaveVisit('2493638','2026-10-06',1,'',[]);
   PJ.d='2026-10-05';renderPjp();
   const el2=document.getElementById('pjMap');
   const same=el1===el2&&!!el1;
   const inBody=!!document.getElementById('pjpBody').querySelector('#pjMap');
   PJP.cfg.gmap='';renderPjp();
   const hid=document.getElementById('pjMapWrap').style.display==='none';
   return {vis1,same,inBody,hid};
 });
 t('ใส่ key แล้วกล่องแผนที่โผล่',mapKeep.vis1);
 t('⚠️ กดเปลี่ยนวัน/กรอง/บันทึกร้าน แล้ว div แผนที่ยังเป็นตัวเดิม (โหลด Google Maps ครั้งเดียว)',
   mapKeep.same,JSON.stringify(mapKeep));
 t('...เพราะกล่องแผนที่ไม่ได้อยู่ในส่วนที่ถูกเขียนทับ',!mapKeep.inBody);
 t('เอา key ออก กล่องแผนที่ก็ซ่อนไป',mapKeep.hid);

 /* ---------- 9c) หมุดต้องถูก "แก้" ไม่ใช่สร้างใหม่ทั้งแถวทุกครั้ง ----------
    เจ้าของแจ้ง 8 ต.ค. 69 ว่าเปลี่ยนวัน/เปลี่ยนสายแล้วแผนที่ไม่โหลด
    ปลอม google.maps ขึ้นมาเพื่อนับว่าเราเรียกของจริงกี่ครั้ง */
 const gm=await ev(async()=>{
   const C={map:0,mark:0,fit:0,icon:0,pos:0};
   window.google={maps:{
     Map:function(el,o){C.map++;this.el=el;this.fitBounds=()=>C.fit++;this.setCenter=()=>{};this.setZoom=()=>{};},
     Marker:function(o){C.mark++;this.o=o;this.setMap=()=>{};this.setIcon=()=>C.icon++;
       this.setLabel=()=>{};this.setTitle=()=>{};this.setPosition=()=>C.pos++;this.addListener=()=>{};},
     InfoWindow:function(){this.setContent=()=>{};this.open=()=>{};},
     LatLngBounds:function(){this.extend=()=>{};},
     SymbolPath:{CIRCLE:0},
   }};
   PJP.cfg.gmap='AIzaSyA1234567890abcdefghijklmnopqrstu';
   PJMAP={state:'ready',map:null,marks:{},info:null,sig:'',script:true,wait:0};
   PJP.done={};pjBustNotes();          /* เริ่มจากยังไม่บันทึกร้านไหน หมุดจะยังไม่เขียว */
   PJ.d='2026-10-05';PJ.line='209611';PJ.only='all';PJ.view='day';
   renderPjp();
   const first={...C},pins=Object.keys(PJMAP.marks).length;
   /* กดอะไรที่ไม่ได้เปลี่ยนชุดร้าน — ต้องไม่สร้าง Map ใหม่ และไม่ fitBounds ใหม่ */
   pjSetOnly('hot');pjSetOnly('all');
   await pjSaveVisit('2493638','2026-10-05',1,'',[]);
   const same={...C};
   /* เปลี่ยนวัน = ชุดร้านเปลี่ยน → หมุดต้องขยับ/เพิ่ม/ลด แต่ยังห้ามสร้าง Map ใหม่ */
   const d2=pjDates().filter(d=>d>'2026-10-05')[0];
   PJ.d=d2;renderPjp();
   const day2={...C},pins2=Object.keys(PJMAP.marks).length;
   /* เปลี่ยนสาย */
   const other=pjLines().filter(x=>x!=='209611'&&x!=='2096DT')[0];
   pjSetLine(other);
   const line2={...C},pins3=Object.keys(PJMAP.marks).length;
   const stale=Object.keys(PJMAP.marks).filter(c=>!pjStops(PJ.d,pjCur()).some(s=>s.code===c)).length;
   return {first,pins,same,day2,pins2,line2,pins3,stale,other};
 });
 t('วาดแผนที่ครั้งแรก: สร้าง Map 1 ตัว + หมุดครบทุกร้านที่มีพิกัด',
   gm.first.map===1&&gm.first.mark===gm.pins&&gm.pins>10,JSON.stringify({m:gm.first.map,mark:gm.first.mark,pins:gm.pins}));
 t('⚠️ กดกรอง/บันทึกร้าน (ชุดร้านไม่เปลี่ยน) → ไม่สร้าง Map ใหม่เลย',gm.same.map===1,gm.same.map);
 t('...และไม่สร้างหมุดใหม่ซ้ำ (ใช้หมุดเดิม แค่เปลี่ยนสี)',gm.same.mark===gm.first.mark,JSON.stringify(gm.same));
 t('...และไม่ fitBounds ซ้ำ จึงไม่กระตุกกลับทุกครั้งที่กด',gm.same.fit===gm.first.fit,gm.same.fit);
 t('...แต่สีหมุดถูกอัพเดตจริง (บันทึกร้านแล้วหมุดเปลี่ยนเป็นเขียว)',gm.same.icon>gm.first.icon,JSON.stringify({a:gm.first.icon,b:gm.same.icon}));
 t('⚠️ เปลี่ยนวันแล้วแผนที่ต้องวาดใหม่จริง (ไม่ใช่ค้างของเดิม)',gm.day2.fit>gm.same.fit&&gm.pins2>0,JSON.stringify({fit:gm.day2.fit,pins:gm.pins2}));
 t('...โดยไม่สร้าง Map ใหม่ (ไม่เสียโควต้า Google เพิ่ม)',gm.day2.map===1,gm.day2.map);
 t('⚠️ เปลี่ยนสายแล้วแผนที่ก็วาดใหม่',gm.line2.fit>gm.day2.fit&&gm.pins3>0,JSON.stringify({fit:gm.line2.fit,pins:gm.pins3,line:gm.other}));
 t('...และยังไม่สร้าง Map ใหม่',gm.line2.map===1,gm.line2.map);
 t('ไม่มีหมุดค้างของวัน/สายก่อนหน้าหลงอยู่บนแผนที่',gm.stale===0,gm.stale);

 /* ---------- 9d) เรื่องค้างต้องไปขึ้นในปฏิทินงาน + กรองได้ ---------- */
 const cal=await ev(()=>{
   PJ.line='209611';PJ.d='2026-10-05';
   PJP.done={};pjBustNotes();
   PJP.done['2493638|2026-10-05']={v:1,by:'ชลศิต',at:1000,tx:'ขอราคาซันไลต์ถุงใหญ่',f:['sell','eb']};
   pjBustNotes();
   PLAN={items:{dep1:{t:'ประชุมเซลล์ต้นเดือน',d:'2026-10-06',cat:'meet',lines:[],by:'manager',byName:'ผู้จัดการ',at:1}},done:{},del:{}};
   PL.ym='2026-10';PL.scope='all';PL.pjLine='';PL.view='list';
   _switchTab('plan');
   const txt=()=>document.getElementById('plMain').innerText.replace(/\s+/g,' ');
   const a={all:txt(),shops:document.querySelectorAll('#plMain .pl-shop').length,
     cards:[...document.querySelectorAll('#plCards .card .v')].map(x=>x.innerText.trim()),
     lineBox:document.getElementById('plLineCtl').style.display!=='none'};
   plSetScope('shop');a.shopOnly=txt();a.shopN=document.querySelectorAll('#plMain .pl-shop').length;
   plSetScope('depot');a.depotOnly=txt();a.depotShopN=document.querySelectorAll('#plMain .pl-shop').length;
   a.lineBoxDepot=document.getElementById('plLineCtl').style.display!=='none';
   plSetScope('all');
   /* ปฏิทินเดือนก็ต้องมีชิพงานร้าน */
   plSetView('mon');a.mon=document.getElementById('plMain').innerText.replace(/\s+/g,' ');
   /* ผู้จัดการเลือกดูทีละสายได้ — สายของร้านนี้อ่านจากแผนจริง ไม่ใช่เดาเอง */
   plSetView('list');plSetScope('shop');
   a.ln=pjOutLine('2493638');
   const otherLn=pjLines().filter(x=>x!==a.ln)[0];
   plSetPjLine(otherLn);a.otherLine=document.querySelectorAll('#plMain .pl-shop').length;
   plSetPjLine(a.ln);a.myLine=document.querySelectorAll('#plMain .pl-shop').length;
   plSetPjLine('');
   /* กดแล้วเด้งกลับไปที่ร้านในแท็บ PJP */
   const go=[...document.querySelectorAll('#plMain .pl-shop .pl-edit')].find(x=>/ไปที่ร้าน/.test(x.innerText));
   if(go)go.click();
   a.jumped=CURTAB;a.jumpDate=PJ.d;
   /* เคลียร์เรื่องที่ร้านแล้ว งานในปฏิทินต้องหายเอง (ไม่ได้เก็บเป็นงานจริง) */
   PJP.done['2493638|2026-10-19']={v:1,by:'ชลศิต',at:2000,tx:'ซื้อเพิ่มแล้ว'};
   pjBustNotes();_switchTab('plan');plSetView('list');
   a.after=document.querySelectorAll('#plMain .pl-shop').length;
   a.notStored=Object.keys(PLAN.items).length;
   return a;
 });
 t('⚠️ เรื่องค้างจากการเยี่ยมไปขึ้นในปฏิทินงาน',cal.shops===1,JSON.stringify({n:cal.shops,txt:cal.all.slice(0,150)}));
 t('...ขึ้นเป็นชื่อร้าน + เรื่องที่ต้องตาม',/ธงฟ้าสารภี/.test(cal.all)&&/ต้องขายเพิ่ม/.test(cal.all));
 t('...พร้อมโน้ตของเซลล์',/ขอราคาซันไลต์ถุงใหญ่/.test(cal.all));
 t('...และอยู่ร่วมตารางกับงานของศูนย์',/ประชุมเซลล์ต้นเดือน/.test(cal.all));
 t('การ์ด "งานร้านค้าเดือนนี้" นับได้',cal.cards[3]==='1',JSON.stringify(cal.cards));
 t('filter 🏪 งานร้านค้า = เห็นแต่งานร้าน',cal.shopN===1&&!/ประชุมเซลล์/.test(cal.shopOnly),cal.shopOnly.slice(0,120));
 t('filter 🏢 งานของศูนย์ = เห็นแต่งานศูนย์',cal.depotShopN===0&&/ประชุมเซลล์/.test(cal.depotOnly),cal.depotOnly.slice(0,120));
 t('ผู้จัดการมีช่องเลือกสายให้ไล่ดูทีละสาย',cal.lineBox);
 t('...และช่องนั้นหายไปตอนดูแต่งานของศูนย์',!cal.lineBoxDepot);
 t('รู้ว่าร้านนี้อยู่สายไหนจากแผน PJP',!!cal.ln,cal.ln);
 t('เลือกสายอื่นแล้วไม่เห็นงานร้านของสายนี้',cal.otherLine===0,cal.otherLine);
 t('เลือกสายของร้านนั้นแล้วเห็น',cal.myLine===1,cal.myLine);
 t('งานร้านโผล่ในปฏิทินเดือนด้วย',/ธงฟ้าสารภี/.test(cal.mon),cal.mon.slice(0,120));
 t('กด "ไปที่ร้าน" เด้งไปแท็บ PJP ที่วันนั้น',cal.jumped==='pjp'&&/^2026-10-\d\d$/.test(cal.jumpDate||''),cal.jumped+' '+cal.jumpDate);
 t('⚠️ เคลียร์เรื่องที่ร้านแล้ว งานในปฏิทินหายเอง',cal.after===0,cal.after);
 t('⚠️ งานร้านไม่ถูกเขียนลง PLAN.items (คิดสดตอนแสดงผล ไม่มีงานผี)',cal.notStored===1,cal.notStored);

 /* ---------- 9e) ฝั่งเซลล์: เห็นงานร้านของสายตัวเองเท่านั้น ---------- */
 const salesCal=await ev(()=>{
   PJP.done={};pjBustNotes();
   const ln=pjOutLine('2493638');
   const otherLn=pjLines().filter(x=>x!==ln&&x!=='2096DT')[0];
   /* หาร้านของสายอื่นมาใส่โน้ตด้วย 1 ร้าน */
   let oc='';
   pjDates().some(d=>{const row=String((PJP.plan[d]||{})[otherLn]||'');
     const c=row.split(',')[0].split(':')[0];if(c){oc=c;return true;}return false;});
   PJP.done['2493638|2026-10-05']={v:1,by:'ชลศิต',at:1000,tx:'ของสายแรก',f:['sell']};
   if(oc)PJP.done[oc+'|2026-10-05']={v:1,by:'ปฐมภพ',at:1000,tx:'ของสายอื่น',f:['pay']};
   pjBustNotes();
   PL.ym='2026-10';PL.view='list';PL.scope='all';PL.pjLine='';
   const look=(role,code)=>{
     S.user=role==='sales'?{id:'s',role:'sales',code:code,name:'เซลล์'}:{id:'manager',role:'manager',name:'ผู้จัดการ'};
     renderPlan();
     return {n:document.querySelectorAll('#plMain .pl-shop').length,
       txt:document.getElementById('plMain').innerText.replace(/\s+/g,' '),
       lineBox:document.getElementById('plLineCtl').style.display!=='none'};
   };
   const a={ln:ln,otherLn:otherLn,oc:oc,mgr:look('manager'),s1:look('sales',ln),s2:look('sales',otherLn)};
   S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};PJ.line=ln;
   return a;
 });
 t('หาร้านของอีกสายมาทดสอบได้',!!salesCal.oc,salesCal.otherLn+' → '+salesCal.oc);
 t('ผู้จัดการเห็นงานร้านของทุกสาย (monitor ได้)',salesCal.mgr.n===2,salesCal.mgr.n);
 t('⚠️ เซลล์สายแรกเห็นแต่ร้านของตัวเอง',
   salesCal.s1.n===1&&/ของสายแรก/.test(salesCal.s1.txt)&&!/ของสายอื่น/.test(salesCal.s1.txt),
   salesCal.s1.n+' | '+salesCal.s1.txt.slice(0,110));
 t('⚠️ เซลล์สายที่สองก็เห็นแต่ร้านของตัวเอง',
   salesCal.s2.n===1&&/ของสายอื่น/.test(salesCal.s2.txt)&&!/ของสายแรก/.test(salesCal.s2.txt),
   salesCal.s2.n+' | '+salesCal.s2.txt.slice(0,110));
 t('เซลล์ไม่มีช่องเลือกสายในปฏิทิน',!salesCal.s1.lineBox&&!salesCal.s2.lineBox);
 t('ผู้จัดการมี',salesCal.mgr.lineBox);

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
