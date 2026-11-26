/* 📦 ไฟล์สต็อกของระบบใหม่ "dcode" (DataExtract.xlsx) — เจ้าของแจ้ง 16 พ.ย. 69
   *"ต่อไป BD จะใช้ระบบใหม่ คือ dcode … จะเปลี่ยนชื่อจากคลัง Sales เป็น Sound และ Gift เป็น Free
     คือของขายและของแถมดังเดิม"*
   เทสต์ครอบ: อ่านไฟล์ใหม่ลงโครงเดิม · Sound/Free → คลังขาย/คลังแถม · ตัดชื่อสินค้า ·
   รหัสขึ้นต้นด้วย G ต้องไม่หาย · วันที่จากชื่อไฟล์ · คอลัมน์หาย = ฟ้อง ไม่เก็บ ·
   และ **ไฟล์เดิมต้องยังอ่านได้เหมือนเดิม**
   ⛔ ตัวเลขในเทสต์สมมติขึ้นเอง — รีโปเป็นสาธารณะ ห้าม commit สต็อกจริงของศูนย์
   ไฟล์จริงตรวจเพิ่มได้ด้วย  DCODE_STOCK=/path/DataExtract.xlsx node test/browser/stockdc.test.cjs
   ต้องติดตั้งก่อน:  npm i --no-save playwright-core */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const XLSX=require('xlsx');
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');
const BROWSER=require('./_chrome.cjs').chromePath();
const THBfmt=n=>'฿'+Math.round(n).toLocaleString('en-US');

/* หัวตารางของจริงจากไฟล์ dcode (34 คอลัมน์ · เรียงตามไฟล์) */
const H=['หมวดหมู่','แบรนด์','รหัสสินค้า','ชื่อสินค้า','คลังสินค้า','Batch','ประเภทสต็อก','ราคาถัวเฉลี่ย',
 'DYP.......OpeningStockValue','มูลค่าสต็อกคงเหลือปิดวัน','จำนวนลัง เริ่มต้น','DYP.......@Session(OrgaCode)~OpeningDZ',
 'จำนวนชิ้น เริ่มต้น','จำนวนลังขาเข้า (CS)','DYP.......@Session(OrgaCode)~InDZ','จำนวนชิ้นขาเข้า (PC)',
 'ออก CS','DYP.......@Session(OrgaCode)~OutDZ','ออก PC','จำนวนลังที่จัดสรรแล้ว','Allocated SU',
 'จำนวนชิ้นที่จัดสรรแล้ว','จำนวนลังคงเหลือปิดวัน','DYP.......@Session(OrgaCode)~ClosingBalanceDZ',
 'จำนวนชิ้นคงเหลือปิดวัน','จำนวนสต๊อกคงเหลือปัจจุบัน (ลัง)','DYP.......@Session(OrgaCode)~ATPDZ',
 'จำนวนสต๊อกคงเหลือปัจจุบัน (ชิ้น)','อยู่ระหว่างการขนส่ง (ลัง)','DYP.......@Session(OrgaCode)~InTransitDZ',
 'อยู่ระหว่างการขนส่ง (ชิ้น)','DYP.......reattemptCS','DYP.......@Session(OrgaCode)~reattemptDZ','DYP.......reattemptPC'];
const C={cat:0,br:1,code:2,nm:3,wh:4,ty:6,avg:7,val:9,clCs:22,clPc:24,alCs:19,alPc:21,
         atCs:25,atPc:27,trCs:28,trPc:30};
function dcRow(o){
  const r=new Array(34).fill(0);
  r[C.cat]=o.cat||'HOME & HYGIENE';r[C.br]=o.br||'VIM';
  r[C.code]=o.code;r[C.nm]=o.code+'-'+o.nm+'-'+(o.unit||'12.34567890');
  r[C.wh]='Sound Stock W/H_BDD_2096';r[5]='1-1';r[C.ty]=o.ty||'01-Sound';
  r[C.avg]=o.avg||0;r[C.val]=o.val||0;
  r[C.clCs]=o.clCs||0;r[C.clPc]=o.clPc||0;
  r[C.alCs]=o.alCs||0;r[C.alPc]=o.alPc||0;
  r[C.atCs]=o.atCs||0;r[C.atPc]=o.atPc||0;
  r[C.trCs]=o.trCs||0;r[C.trPc]=o.trPc||0;
  return r;
}
function mkDc(rows,head){
  const w=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet([head||H].concat(rows)),'DataExtract');
  return Buffer.from(XLSX.write(w,{bookType:'xlsx',type:'array'})).toString('base64');
}
/* ไฟล์สต็อกแบบเดิม — ต้องยังอ่านได้ */
const OLD_H=['รหัสสินค้า','คำอธิบาย','จำนวนสต็อก','จำนวน (CS/PC)','มูลค่า','ราคาถัวเฉลี่ย',
             'เปิดใบสั่งซื้อ','เปิดใบสั่งขาย','ยอดคงเหลือ'];
function mkOld(rows){
  const w=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet([OLD_H].concat(rows)),'Sheet1');
  return Buffer.from(XLSX.write(w,{bookType:'xlsx',type:'array'})).toString('base64');
}

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const pg=await (await b.newContext({viewport:{width:1280,height:950}})).newPage();
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
  PROMO={items:{},res:{},del:{}};REQUESTS={data:{}};
  ORDERS={dates:[],data:{},names:{},cat:{},catN:{}};POSTATUS={dates:[],data:{}};
  STOCKD={date:null,rows:[],names:{}};
  _switchTab('stock');
 `);

 /* ---------------- ข้อมูลจำลอง ----------------
    A 21025517 Sound · ปิดวัน 9/7 · จัดสรร 0/0 · ปัจจุบัน 9/7 · ขนส่ง 30/0
    B 64301779 Sound · ปิดวัน 26/0 · จัดสรร 0/1 · ปัจจุบัน 25/2 (แตกลังไปจ่าย 1 ชิ้น)
    C 11110000 Sound · ของหมด 0/0
    D 64329237 Free  · ของแถม 1/4   (รหัสเดียวกับ E เพื่อทดสอบว่าอยู่ได้ทั้งสองคลัง)
    E 64329237 Sound · ของขาย 5/0
    F G0000009 Sound · รหัสขึ้นต้นด้วย G — พัดลมของแถม 144 ลัง ห้ามหาย
 */
 const rows=[
   dcRow({code:'21025517',nm:'โปรแมกซ์น้ำยาล้างห้องน้ำสีฟ้า 12x900มล',avg:36.88,val:4241.2,
          clCs:9,clPc:7,atCs:9,atPc:7,trCs:30,br:'DOMEX'}),
   dcRow({code:'64301779',nm:'คอมฟอร์ทอินโนเซนท์บูส3X(1+1)X1000มล',avg:141.27,val:11019.06,
          clCs:26,alPc:1,atCs:25,atPc:2,trCs:85,cat:'FABRIC ENHANCERS',br:'COMFORT'}),
   dcRow({code:'11110000',nm:'คนอร์ซุปก้อนรสไก่ 20ก. P6x24',cat:'COOKING AIDS',br:'KNORR'}),
   dcRow({code:'64329237',nm:'โอโม ลิควิด ไวท์ TW 6X(2X530)ม',ty:'99-Free',clCs:1,clPc:4,atCs:1,atPc:4,br:'OMO'}),
   dcRow({code:'64329237',nm:'โอโม ลิควิด ไวท์ TW 6X(2X530)ม',clCs:5,atCs:5,br:'OMO'}),
   dcRow({code:'G0000009',nm:'จีทีพัดลม16นิ้ว (ของแถม)',unit:'0.00000000',clCs:144,atCs:144}),
 ];

 /* ---------- 1) อ่านไฟล์ระบบใหม่ ---------- */
 const r1=await ev(a=>{
   window.__log=[];
   parseStock('DataExtract_161126.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   const R=STOCKD.rows,by=c=>R.filter(x=>x.c===c);
   return {n:R.length,src:STOCKD.src,date:STOCKD.date,
     sale:R.filter(x=>x.wh==='sale').length,gift:R.filter(x=>x.wh==='gift').length,
     a:by('21025517')[0],b:by('64301779')[0],c:by('11110000')[0],
     g:by('G0000009')[0],dupe:by('64329237').map(x=>x.wh+':'+x.i),
     log:window.__log,sync:window.__sync};
 },{b64:mkDc(rows)});
 t('อ่านไฟล์ dcode ได้ครบทุกแถว และรู้ว่ามาจากระบบใหม่',
   r1.n===6&&r1.src==='dcode',r1.n+' แถว · src='+r1.src);
 t('🔑 01-Sound = คลังขาย · 99-Free = คลังแถม (ของขาย/ของแถมเหมือนเดิม)',
   r1.sale===5&&r1.gift===1,'ขาย '+r1.sale+' / แถม '+r1.gift);
 t('🔑 รหัสขึ้นต้นด้วย G ต้องไม่หาย (ของแถม/Off-Invoice/ชุด VIP มีของจริงในคลัง)',
   !!r1.g&&r1.g.i==='144/0',JSON.stringify(r1.g||null));
 t('ตัดชื่อสินค้าให้เหลือแต่ชื่อจริง (ตัดรหัสหน้า และราคาท้าย)',
   r1.a&&r1.a.n==='โปรแมกซ์น้ำยาล้างห้องน้ำสีฟ้า 12x900มล',r1.a&&r1.a.n);
 t('สต็อกจริง = คงเหลือปิดวัน · คงเหลือ = คงเหลือปัจจุบัน · กำลังเข้า = อยู่ระหว่างการขนส่ง',
   r1.a&&r1.a.e==='9/7'&&r1.a.i==='9/7'&&r1.a.po==='30/0',
   r1.a&&[r1.a.e,r1.a.i,r1.a.po].join(' | '));
 t('🔑 ใช้ "คงเหลือปัจจุบัน" ของไฟล์ตรง ๆ ไม่คำนวณเอง (26 ปิดวัน − จัดสรร 1 ชิ้น = 25/2)',
   r1.b&&r1.b.e==='26/0'&&r1.b.h==='0/1'&&r1.b.i==='25/2',
   r1.b&&[r1.b.e,r1.b.h,r1.b.i].join(' | '));
 t('ช่องที่เป็นศูนย์ทั้งคู่ (รอตัดบิล / กำลังเข้า) ปล่อยว่างให้ขึ้นขีด ไม่ใช่ 0/0',
   r1.a&&r1.a.h===''&&r1.c&&r1.c.po==='',JSON.stringify({h:r1.a&&r1.a.h,po:r1.c&&r1.c.po}));
 t('ของหมดติดธง "หมด/ติดลบ" ให้เอง',r1.c&&r1.c.lo===true&&r1.c.i==='0/0',
   r1.c&&r1.c.i+' lo='+(r1.c&&r1.c.lo));
 t('ไฟล์ dcode ไม่มีขนาดบรรจุ → ปล่อยว่าง ห้ามเดา',r1.a&&r1.a.d==='',JSON.stringify(r1.a&&r1.a.d));
 t('เก็บต้นทุนต่อหีบ/ต้นทุนรวมไว้ให้ผู้จัดการ',r1.a&&r1.a.j===36.88&&r1.a.v===4241.2,
   r1.a&&r1.a.j+' / '+r1.a.v);
 t('รหัสเดียวกันอยู่ได้ทั้งคลังขายและคลังแถม',
   r1.dupe.sort().join(' , ')==='gift:1/4 , sale:5/0',r1.dupe.join(' , '));
 t('วันที่มาจากชื่อไฟล์ (161126 → 16 พ.ย. 2569)',r1.date==='2026-11-16',r1.date);
 t('บันทึกการอัพบอกจำนวนของขาย/ของแถมด้วยชื่อใหม่',
   /ระบบ dcode/.test(r1.log[0])&&/Sound 5/.test(r1.log[0])&&/Free 1/.test(r1.log[0]),r1.log[0]);
 t('อัพแล้วบันทึกขึ้นเซิร์ฟเวอร์ 1 ครั้ง',r1.sync===1,r1.sync);

 /* ---------- 2) หน้าจอ ---------- */
 const ui=await ev(()=>{STK.wh='sale';renderStock();
   const bar=document.getElementById('stockBar').textContent.replace(/\s+/g,' ');
   const tb=document.getElementById('stockTable').textContent.replace(/\s+/g,' ');
   STK.wh='gift';renderStock();
   const g=document.getElementById('stockTable').textContent.replace(/\s+/g,' ');
   STK.wh='sale';renderStock();
   return {bar:bar,tb:tb,gift:g,
     wh:[...document.querySelectorAll('#stockWh button')].map(x=>x.textContent.trim()).join(' | ')};});
 t('แถบบนบอกว่าเป็นไฟล์ dcode และกำกับชื่อคลังใหม่ไว้',
   /dcode/.test(ui.bar)&&/Sound/.test(ui.bar),ui.bar.slice(0,110));
 t('ปุ่มเลือกคลังเขียนชื่อใหม่กำกับ (Sound / Free)',
   /Sound/.test(ui.wh)&&/Free/.test(ui.wh),ui.wh);
 t('คำอธิบายคอลัมน์เปลี่ยนตามไฟล์ใหม่ (ไม่ใช่ตัวอักษร E/G/H/I ของไฟล์เดิม)',
   /คงเหลือปิดวัน/.test(ui.tb)&&/อยู่ระหว่างการขนส่ง/.test(ui.tb)&&!/\(E\)/.test(ui.tb));
 t('คลังแถมโชว์เฉพาะของแถม',/โอโม ลิควิด ไวท์/.test(ui.gift)&&!/โปรแมกซ์/.test(ui.gift));

 /* ---------- 3) หน้าอื่นที่ใช้สต็อกต้องได้ตัวเลขเดียวกัน ---------- */
 const idx=await ev(()=>({a:stkOf('21025517'),g:stkOf('64329237'),none:stkOf('99999999')}));
 t('หน้าอื่น (คำขอ/Drop ค้าง) อ่านสต็อกผ่าน stkOf ได้ตัวเลขเดียวกัน',
   idx.a&&idx.a.cs===9&&idx.a.pc===7&&idx.a.po==='30/0',JSON.stringify(idx.a));
 t('...รหัสที่อยู่สองคลัง stkOf ต้องตอบของคลังขาย',idx.g&&idx.g.cs===5,JSON.stringify(idx.g));
 t('...รหัสที่ไม่มีในไฟล์ ตอบ null ไม่ใช่ 0',idx.none===null);

 /* ---------- 4) ค้นหาด้วยแบรนด์/หมวดหมู่ ---------- */
 const se=await ev(()=>{const f=(q)=>{document.getElementById('stockSearch').value=q;renderStock();
     return document.querySelectorAll('#stockTable tbody tr').length;};
   const a=f('comfort'),b=f('cooking'),c=f('โปรแมกซ์');
   document.getElementById('stockSearch').value='';renderStock();return {a:a,b:b,c:c};});
 t('ค้นด้วยแบรนด์ / หมวดหมู่ / ชื่อไทย ได้หมด',se.a===1&&se.b===1&&se.c===1,JSON.stringify(se));

 /* ---------- 5) ชื่อไฟล์ไม่มีวันที่ → ลงวันนี้ + ฟ้อง ---------- */
 const nd=await ev(a=>{window.__log=[];
   parseStock('DataExtract_1.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   return {d:STOCKD.date,today:todayISO(),log:window.__log.join(' | ')};},{b64:mkDc(rows)});
 t('ชื่อไฟล์ไม่มีวันที่ → ลงวันนี้ให้ และฟ้องไว้ในบันทึกการอัพ',
   nd.d===nd.today&&/ไม่มีวันที่/.test(nd.log),nd.d+' · '+/ไม่มีวันที่/.test(nd.log));

 /* ---------- 6) ประเภทสต็อกแปลก ๆ → ไม่ทิ้ง แต่ต้องฟ้อง ---------- */
 const unk=await ev(a=>{window.__log=[];
   parseStock('DataExtract_161126.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   return {n:STOCKD.rows.length,sale:STOCKD.rows.filter(x=>x.wh==='sale').length,
     log:window.__log.join(' | ')};},
   {b64:mkDc([dcRow({code:'12340000',nm:'ของใหม่ที่ยังไม่รู้จัก',ty:'50-Damaged',clCs:3,atCs:3})])});
 t('🛟 ประเภทสต็อกที่ยังไม่รู้จัก ต้องไม่ถูกทิ้ง และต้องฟ้องให้รู้',
   unk.n===1&&unk.sale===1&&/ยังไม่รู้จัก/.test(unk.log),unk.n+' แถว · '+unk.log.slice(0,80));

 /* ---------- 7) คอลัมน์หาย = ฟ้อง ไม่เก็บอะไรเลย ---------- */
 const miss=await ev(a=>{
   const before=JSON.stringify(STOCKD);
   let err='';
   try{parseStock('DataExtract_161126.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));}
   catch(e){err=String(e.message||e);}
   return {err:err,same:JSON.stringify(STOCKD)===before};},
   {b64:mkDc(rows,H.map(h=>h==='จำนวนสต๊อกคงเหลือปัจจุบัน (ลัง)'?'คอลัมน์ใหม่ที่ไม่รู้จัก':h))});
 t('🛟 คอลัมน์สำคัญหาย → ฟ้องชัด ๆ และไม่เก็บข้อมูลทับของเดิม',
   /ไม่มีคอลัมน์/.test(miss.err)&&miss.same,miss.err.slice(0,80));

 /* ---------- 8) ไฟล์เดิมต้องยังอ่านได้ ---------- */
 const old=await ev(a=>{window.__log=[];
   parseStock('Stock 161126.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   const R=STOCKD.rows;
   return {n:R.length,src:STOCKD.src,sale:R.filter(x=>x.wh==='sale').length,
     gift:R.filter(x=>x.wh==='gift').length,r0:R[0],log:window.__log[0]};},
   {b64:mkOld([['21025517','โปรแมกซ์สีฟ้า',12,'9/7',4241.2,36.88,'30/0','0/0','9/7'],
               ['64329237','โอโม ลิควิด ไวท์',6,'1/4',0,0,'','','1/4']])});
 t('🛟 ไฟล์สต็อกแบบเดิมยังอ่านได้เหมือนเดิม (ของเก่าต้องไม่พัง)',
   old.n===2&&old.src==='old'&&old.sale===1&&old.gift===1,
   old.n+' แถว · src='+old.src+' · ขาย '+old.sale+'/แถม '+old.gift);
 t('...และยังเก็บขนาดบรรจุของไฟล์เดิมไว้ตามเดิม',old.r0&&old.r0.d==='12',old.r0&&old.r0.d);

 /* ---------- 8.5) 💰 มูลค่าสต็อก รายหมวด/รายแบรนด์ (เจ้าของสั่ง 26 พ.ย. 69) ----------
    มูลค่าต้องอ่านจากช่องในไฟล์ ไม่ใช่คูณเอง · แถวที่ไฟล์ไม่ลงมูลค่าต้องนับแล้วบอก ไม่ใช่รวมเป็น 0 */
 const val=await ev(a=>{
   parseStock('DataExtract_161126.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   STK.rwh='sale';STK.vsec='cat';STK.vcat='';STK.vbr='';
   document.getElementById('strSearch').value='';
   _switchTab('strep');
   const box=()=>document.getElementById('strBody');
   const tx=()=>box().textContent.replace(/\s+/g,' ');
   const o={};
   const rows=STOCKD.rows.filter(r=>r.wh==='sale');
   o.sum=Math.round(rows.reduce((x,r)=>x+(+r.v||0),0)*100)/100;
   o.cat=tx();
   o.onOwnTab=!document.getElementById('strepView').classList.contains('hidden')&&
     document.getElementById('stockView').classList.contains('hidden');
   o.notOnStock=(()=>{_switchTab('stock');
     const t=document.getElementById('stockView').textContent;
     _switchTab('strep');return t.indexOf('มูลค่าสต็อก')<0;})();
   o.catCells=[...box().querySelectorAll('.sv-tbl tbody tr td:first-child')].map(e=>e.textContent.trim().split(' ')[0]);
   /* กดเข้าไปในหมวด → ต้องเห็นแบรนด์ข้างใน ไม่ใช่ทั้งคลัง */
   const first=box().querySelector('.sv-tbl tbody tr.cl');
   o.clickable=!!first;
   if(first)first.click();
   o.drill=tx();
   o.vcat=STK.vcat;
   /* แบรนด์ */
   stkVSec('br');
   o.br=[...box().querySelectorAll('.sv-tbl tbody tr td:first-child')]
     .map(e=>e.textContent.trim().split(' ')[0]);
   /* คลังแถม ของไฟล์ dcode มีมูลค่าไหม */
   strSetWh('gift');stkVSec('cat');
   o.gift=tx();
   strSetWh('sale');stkVSec('cat');
   /* เซลล์ต้องไม่เห็นต้นทุน */
   const u=S.user;S.user={id:'209611',role:'sales',name:'เซลล์',code:'2096_11'};
   renderStockRep();o.sales=tx();
   o.salesTab=tabVisible().reduce((a,x)=>a.concat(x.tabs.map(y=>y.t)),[]).indexOf('strep')<0;
   S.user=u;renderStockRep();
   return o;},{b64:mkDc(rows)});
 t('💰 มูลค่าสต็อก: รวมมูลค่าจากช่องในไฟล์ ไม่ใช่คูณเอง',
   val.cat.indexOf(THBfmt(val.sum))>=0,
   'ไฟล์รวมได้ '+val.sum+' · หน้าจอ: '+val.cat.slice(0,140));
 t('🔑 แยกตามหมวดได้ (หมวดมาจากไฟล์ dcode)',
   val.catCells.length>=3,JSON.stringify(val.catCells));
 t('🔑 กดที่หมวดแล้วเจาะเข้าไปดูแบรนด์ข้างในได้',
   val.clickable&&!!val.vcat&&/ย้อนกลับ/.test(val.drill),val.vcat+' · '+val.drill.slice(0,120));
 t('🔑 แยกตามแบรนด์ได้',val.br.length>=3&&val.br.join(' ').indexOf('OMO')>=0,JSON.stringify(val.br));
 t('🛟 แถวที่ไฟล์ไม่ได้ลงมูลค่า ต้องบอก ไม่ใช่รวมเป็น 0',
   /ไฟล์ไม่ได้ลงมูลค่า/.test(val.gift),val.gift.slice(0,160));
 t('🔑 มูลค่าสต็อกอยู่หน้าของตัวเอง ไม่ปนกับหน้าสต็อคปัจจุบันแล้ว',
   val.onOwnTab&&val.notOnStock,'ownTab='+val.onOwnTab+' notOnStock='+val.notOnStock);
 t('🔒 เซลล์ไม่เห็นแท็บนี้ และถ้าเปิดได้ก็ไม่เห็นตัวเลขต้นทุน',
   val.salesTab&&/บัญชีนี้เปิดส่วนนี้ไม่ได้/.test(val.sales)&&!/มูลค่ารวม/.test(val.sales),
   val.sales.slice(0,80));

 /* ---------- 9) ไฟล์จริง (ถ้ามีในเครื่อง — ไม่อยู่ในรีโป) ---------- */
 const REAL=process.env.DCODE_STOCK;
 if(REAL&&fs.existsSync(REAL)){
   const raw=XLSX.readFile(REAL);
   const aoa=XLSX.utils.sheet_to_json(raw.Sheets[raw.SheetNames[0]],{header:1,raw:true,defval:null});
   const want=aoa.slice(1).filter(x=>x&&String(x[2]||'').trim()).length;
   const got=await ev(a=>{parseStock('DataExtract_161126.xlsx',
       Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
     return {n:STOCKD.rows.length,sale:STOCKD.rows.filter(x=>x.wh==='sale').length,
       gift:STOCKD.rows.filter(x=>x.wh==='gift').length,
       blank:STOCKD.rows.filter(x=>!x.n).length};},
     {b64:fs.readFileSync(REAL).toString('base64')});
   t('📄 ไฟล์จริง: อ่านได้ครบทุกแถว ไม่มีตกหล่น',got.n===want,got.n+' / '+want+' แถว');
   t('📄 ไฟล์จริง: ทุกแถวมีชื่อสินค้า',got.blank===0,got.blank+' แถวที่ชื่อว่าง');
   console.log('   (ไฟล์จริง: ของขาย '+got.sale+' · ของแถม '+got.gift+')');
 }else{
   console.log('  (ข้าม 2 เช็คของไฟล์จริง — ตั้ง DCODE_STOCK=/path/DataExtract.xlsx เพื่อตรวจกับไฟล์จริง)');
 }

 let bad=0;A.forEach(([c,n,x])=>{if(!c)bad++;console.log((c?'  ✓ ':'  ✗ FAIL: ')+n+(x&&!c?' → '+x:''));});
 const real=errs.filter(e=>!/localStorage/.test(e));
 if(real.length){console.log('PAGE ERRORS:');real.forEach(e=>console.log('   '+e));bad+=real.length;}
 await b.close();
 console.log('\n'+(bad?bad+' FAILED of '+A.length:'ALL PASS ('+A.length+' checks)'));
 process.exit(bad?1:0);
})();
