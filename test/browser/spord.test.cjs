/* 📦 ออเดอร์พิเศษ — 6 ขั้นตอน 4 ทีม (เจ้าของสั่ง 18 พ.ย. 69)
   *"จะเพิ่มทีมที่จะใช้งานคือ ทีมคลัง และทีมสายส่ง … ให้ทำงานด้วยเลขออเดอร์เดี่ยวๆที่ส่งมาจากเซลล์
     เพื่อไม่ให้พวกเค้างง และให้เลขออเดอร์เดี่ยวขึ้นโชว์ชื่อร้าน และจำนวนออเดอร์เพื่อตรวจสอบได้
     แต่ให้ข้อมูลโชว์เน้นแค่รหัส ก็พอ"*
   เทสต์ครอบ: ทีมคลัง/สายส่งเห็นได้หน้าเดียวทั้งเว็บ · เซลล์กรอกแค่รหัสแล้วชื่อร้าน+ยอดขึ้นเอง ·
   เลขที่ยังไม่มีไฟล์ยอดขายต้องขึ้น "รอไฟล์" ไม่ใช่บอกว่าเลขผิด · ติ๊กข้ามขั้นไม่ได้ ·
   ทีมหนึ่งติ๊กขั้นของอีกทีมไม่ได้ · ทุกการเขียนไปทาง api/spord.js ทีละคีย์ ไม่ใช่เซฟทั้ง state
   ⛔ ชื่อร้าน/เลขออเดอร์ในเทสต์สมมติขึ้นเอง — รีโปเป็นสาธารณะ
   ต้องติดตั้งก่อน: npm i --no-save playwright-core */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');
const BROWSER=require('./_chrome.cjs').chromePath();

const B1='B20261118-01';
const K=(no)=>B1+'|'+no;

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const pg=await (await b.newContext({viewport:{width:1280,height:950}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.setContent(fs.readFileSync(PAGE,'utf8'),{waitUntil:'domcontentloaded'});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);

 await pg.evaluate(`
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};
  window.ulog=()=>{};window.syncToServer=()=>{window.__sync++};
  window.alert=m=>{window.__alert=m};window.confirm=()=>true;
  window.prompt=(q,d)=>(window.__prompt===undefined?(d||''):window.__prompt);
  window.W=()=>new Promise(r=>setTimeout(r,30));
  TOKEN='t';
  /* ทุกการเขียนของเซลล์/คลัง/สายส่งต้องไปทาง api/spord.js — ดักไว้ดูว่าส่งอะไรไปบ้าง */
  window.bdPost=(u,b)=>{window.__posts.push({u:u,b:b});
    return Promise.resolve({ok:true,json:()=>Promise.resolve({ok:true})});};
  window.__reset=()=>{
    window.__posts=[];window.__sync=0;window.__alert='';window.__prompt=undefined;
    DATA.lines={};DATA.focus_order=[];
    Object.keys(FOCUS_MAP).forEach(c=>{DATA.lines[c]={display:FOCUS_MAP[c],
      type:FOCUS_MAP[c].indexOf('KA')===0?'KA':'CT',focus:true,name:'',emp:''};});
    DATA.daily={};DATA.targets={};DATA.monthly={'2026-11':{}};
    CSTOCK={lots:{},del:{},slips:{},sdel:{},ex:{},sub:{},subdel:{},up:0};
    CSTOCK.slips['${B1}']={d:'2026-11-18',by:'admin1',byName:'แอดมิน 1',at:1,up:1};
    STOREDAILY={data:{},ord:{
      'BDD0100000006':{s:'4862383',l:'209611',d:'2026-11-18',v:351.47,c:4},
      'BDD0100000007':{s:'4862365',l:'209611',d:'2026-11-18',v:1709.38,c:3}}};
    PJP={out:{'4862383':{n:'พี่เทียร',rt:'209611'},'4862365':{n:'แม่จุก',rt:'209611'}},
         plan:{},done:{},cfg:{}};
    SP={sid:'${B1}',q:'',busy:0,view:'slip',ym:'2026-11'};
  };
  window.__as=(role,code,name)=>{S.user={id:code||role,role:role,code:code,name:name};
    _switchTab(tabIsTeam(role)?'spord':'sales');};
  window.__reset();
 `);
 const body=()=>ev(()=>document.getElementById('spBody').textContent.replace(/\s+/g,' '));

 /* ---------- 1) ใครเห็นอะไร ---------- */
 const who=await ev(()=>{
   const o={};
   [['manager',null],['sales','209611'],['wh',null],['ds',null]].forEach(([r,c])=>{
     __as(r,c,r);o[r]={tab:CURTAB,groups:tabVisible().map(x=>x.g.k).join(','),
       tabs:(tabVisible().filter(x=>x.g.k==='spord')[0]||{tabs:[]}).tabs.map(x=>x.t).join(','),
       stock:(tabVisible().filter(x=>x.g.k==='stock')[0]||{tabs:[]}).tabs.map(x=>x.t).join(',')};});
   return o;});
 t('🔑 ทีมคลังเห็นได้กลุ่มเดียวทั้งเว็บ และเข้าหน้าออเดอร์พิเศษให้เลย',
   who.wh.groups==='spord'&&who.wh.tabs==='spord'&&who.wh.tab==='spord',JSON.stringify(who.wh));
 t('🔑 ทีมสายส่งก็เหมือนกัน — ไม่เห็นยอดขาย/ราคา/ต้นทุน',
   who.ds.groups==='spord'&&who.ds.tabs==='spord',JSON.stringify(who.ds));
 t('เซลล์ยังเห็นทุกกลุ่มเหมือนเดิม และเข้าหน้ายอดขายเป็นหน้าแรก',
   who.sales.tab==='sales'&&who.sales.groups.indexOf('sales')===0&&
   who.sales.stock==='stock,cstock',JSON.stringify(who.sales));
 t('🔑 ออเดอร์พิเศษเป็นหมวดใหญ่ของตัวเอง ไม่ได้อยู่ใต้สต็อกแล้ว',
   who.manager.groups.indexOf('spord')>=0&&who.manager.stock==='stock,cstock'&&
   who.manager.tabs==='spord',who.manager.groups+' | สต็อก: '+who.manager.stock);
 t('ผู้จัดการ/แอดมินเห็นครบเหมือนเดิม',who.manager.groups.split(',').length>=9,who.manager.groups);

 /* ---------- 2) เซลล์กรอกแค่รหัส ---------- */
 const s2=await ev(async()=>{__reset();__as('sales','209611','CT11 · ชลศิต');
   _switchTab('spord');SP.sid='B20261118-01';SP.view='slip';renderSpord();
   document.getElementById('spAddNo').value=' bdd0100000006 ';spAdd();await W();
   document.getElementById('spAddNo').value='BDD0100000007';spAdd();await W();
   const txt=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   return {posts:window.__posts.map(p=>p.u+' '+JSON.stringify(p.b)),
     keys:Object.keys(CSTOCK.sub),rec:CSTOCK.sub['B20261118-01|BDD0100000006'],
     txt:txt,sync:window.__sync,box:document.getElementById('spAddNo').value};});
 t('เซลล์กรอกเลข → ยิงไป /api/spord ทีละคีย์ (ไม่ใช่เซฟ state ทั้งก้อน)',
   s2.posts.length===2&&s2.posts.every(p=>p.indexOf('/api/spord')===0)&&s2.sync===0,
   s2.posts.join(' | '));
 t('พิมพ์ตัวเล็ก/มีช่องว่าง ระบบแปลงเป็นตัวใหญ่ให้เอง',
   s2.keys.join(',')==='B20261118-01|BDD0100000006,B20261118-01|BDD0100000007',s2.keys.join(','));
 t('เก็บสายของเซลล์คนที่กรอกไว้บนเรคอร์ด',s2.rec&&s2.rec.ln==='209611',JSON.stringify(s2.rec&&s2.rec.ln));
 t('🔑 กรอกแค่รหัส แล้วชื่อร้าน + จำนวนรายการ + ยอด ขึ้นมาให้ตรวจเอง',
   /BDD0100000006/.test(s2.txt)&&/พี่เทียร/.test(s2.txt)&&/4 รายการ/.test(s2.txt)&&/฿351/.test(s2.txt),
   s2.txt.slice(s2.txt.indexOf('BDD0100000006'),s2.txt.indexOf('BDD0100000006')+70));
 t('กรอกเสร็จช่องพิมพ์ว่างให้เลย (กรอกตัวถัดไปได้ทันที)',s2.box==='',JSON.stringify(s2.box));

 /* ---------- 3) เลขที่ยังไม่มีไฟล์ยอดขาย ---------- */
 const nf=await ev(async()=>{
   document.getElementById('spAddNo').value='BDD0199999999';spAdd();await W();
   return document.getElementById('spBody').textContent.replace(/\s+/g,' ');});
 t('🔑 เลขที่ยังไม่ได้อัพไฟล์ยอดขาย → บอก "รอไฟล์" ไม่ใช่บอกว่าเลขผิด',
   /รอไฟล์ยอดขาย/.test(nf)&&/BDD0199999999/.test(nf),
   nf.slice(nf.indexOf('BDD0199999999'),nf.indexOf('BDD0199999999')+80));
 await ev(async()=>{spDel('B20261118-01|BDD0199999999');await W();});

 /* ---------- 4) กรอกซ้ำ ---------- */
 const dup=await ev(async()=>{const n=window.__posts.length;
   document.getElementById('spAddNo').value='BDD0100000006';spAdd();await W();
   return {alert:window.__alert,posts:window.__posts.length-n};});
 t('กรอกเลขซ้ำในใบเดิม → เตือน ไม่ยิงซ้ำ',/แล้ว/.test(dup.alert)&&dup.posts===0,dup.alert);

 /* ---------- 5) ไล่ 6 ขั้น ---------- */
 const flow=await ev(async()=>{
   const k='B20261118-01|BDD0100000006',o={};
   __as('manager',null,'แอดมิน 1');SP.sid='B20261118-01';
   window.__prompt='ตรวจแล้ว';renderSpord();spTick(k,'s3',true);await W();
   o.s3=CSTOCK.sub[k].s3;
   __as('wh',null,'ทีมคลัง 1');SP.sid='B20261118-01';SP.view='slip';renderSpord();
   o.whTodo=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   spTick(k,'s4',true);await W();o.s4=CSTOCK.sub[k].s4;
   const before=window.__posts.length;
   spTick(k,'s3',false);await W();                   /* คลังลองยกเลิกขั้นของแอดมิน */
   o.whTriedS3={posts:window.__posts.length-before,s3ok:CSTOCK.sub[k].s3.ok};
   __as('ds',null,'ทีมสายส่ง 1');SP.sid='B20261118-01';SP.view='slip';renderSpord();
   spTick(k,'s5',true);await W();o.s5=CSTOCK.sub[k].s5;
   __as('manager',null,'แอดมิน 1');SP.sid='B20261118-01';
   window.__prompt='ส่งเข้าร้านพี่เทียร';renderSpord();
   spTick(k,'s6',true);await W();o.s6=CSTOCK.sub[k].s6;
   o.stage=spStage(CSTOCK.sub[k]);
   o.admin=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   return o;});
 t('ขั้น 3 แอดมินตรวจ — เก็บโน๊ตและชื่อคนตรวจ',
   flow.s3.ok===1&&flow.s3.tx==='ตรวจแล้ว'&&flow.s3.byName==='แอดมิน 1',JSON.stringify(flow.s3));
 t('ขั้น 4 ทีมคลังเห็นงานที่ต้องทำและติ๊กได้',
   /งานที่ต้องทำ \(1\)/.test(flow.whTodo)&&flow.s4.ok===1&&flow.s4.byName==='ทีมคลัง 1',
   flow.whTodo.slice(flow.whTodo.indexOf('งานที่ต้องทำ'),flow.whTodo.indexOf('งานที่ต้องทำ')+40)+
   ' | '+JSON.stringify(flow.s4));
 t('🔑 ทีมคลังแตะขั้นของแอดมินไม่ได้ (ไม่ยิงอะไรเลย และสถานะเดิมไม่เปลี่ยน)',
   flow.whTriedS3.posts===0&&flow.whTriedS3.s3ok===1,JSON.stringify(flow.whTriedS3));
 t('ขั้น 5 ทีมสายส่งติ๊กได้',flow.s5.ok===1&&flow.s5.byName==='ทีมสายส่ง 1',JSON.stringify(flow.s5));
 t('ขั้น 6 แอดมินปิดงาน — เก็บที่ไปของสินค้าและจำนวนที่ยังค้าง',
   flow.s6.ok===1&&flow.s6.tx==='ส่งเข้าร้านพี่เทียร'&&flow.s6.left===0,JSON.stringify(flow.s6));
 t('เดินครบ 4 ขั้นแล้วนับว่าจบงาน',flow.stage===4,flow.stage);
 t('แอดมินเห็นภาพรวมทุกขั้น และแยกกองตามขั้นที่ค้าง',
   /ภาพรวม 6 ขั้นตอน/.test(flow.admin)&&/จบงานแล้ว \(1\)/.test(flow.admin)&&
   /รอแอดมินตรวจใบจัดของ/.test(flow.admin),flow.admin.slice(0,90));

 /* ---------- 6) ติ๊กข้ามขั้น ---------- */
 const skip=await ev(async()=>{
   __as('ds',null,'ทีมสายส่ง 1');SP.sid='B20261118-01';SP.view='slip';renderSpord();
   const txt=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   const k2='B20261118-01|BDD0100000007';
   return {txt:txt,stage:spStage(CSTOCK.sub[k2]),
     todoHas7:/BDD0100000007/.test(txt.slice(0,txt.indexOf('ทำไปแล้ว')))};});
 t('🔑 เลขที่แอดมินยังไม่ตรวจ ไม่โผล่ในงานของสายส่ง (กันติ๊กข้ามขั้น)',
   !skip.todoHas7&&skip.stage===0,'stage='+skip.stage);

 /* ---------- 7) กลุ่ม A / B ---------- */
 const grp=await ev(()=>{
   __as('manager',null,'แอดมิน 1');SP.sid='B20261118-01';SP.view='slip';renderSpord();
   const a=document.getElementById('spBar').textContent.replace(/\s+/g,' ');
   spSetGrp('B');
   const bb=document.getElementById('spBar').textContent.replace(/\s+/g,' ');
   __as('wh',null,'ทีมคลัง 1');renderSpord();
   const canWh=/spSetGrp/.test(document.getElementById('spBar').innerHTML);
   return {a:a,b:bb,g:CSTOCK.slips['B20261118-01'].g,canWh:canWh};});
 t('ใบเก่าทุกใบเริ่มที่กลุ่ม A (ตัดบิลแล้ว ยังไม่ส่งของ)',/ตัดบิลแล้ว ยังไม่ส่งของ/.test(grp.a),grp.a.slice(0,60));
 t('แอดมินสลับใบไปกลุ่ม B (ส่งของแล้ว ยังไม่ตัดบิล) ได้',
   grp.g==='B'&&/ส่งของแล้ว ยังไม่ตัดบิล/.test(grp.b),grp.b.slice(0,70));
 t('🛟 ทีมคลังสลับกลุ่มไม่ได้ (ไม่มีปุ่มให้)',!grp.canWh);

 /* ---------- 8) ลบเลขที่กรอกผิด ---------- */
 const del=await ev(async()=>{
   __as('sales','209611','CT11');SP.sid='B20261118-01';SP.view='slip';renderSpord();
   const started='B20261118-01|BDD0100000006';     /* เดินงานไปแล้ว */
   const fresh='B20261118-01|BDD0100000007';       /* ยังไม่เริ่ม */
   const h=document.getElementById('spBody').innerHTML;
   const n=window.__posts.length;
   spDel(fresh);await W();
   return {startedHasDel:h.indexOf("spDel('"+started+"')")>=0,
     freshHasDel:h.indexOf("spDel('"+fresh+"')")>=0,
     gone:!CSTOCK.sub[fresh],tomb:!!(CSTOCK.subdel||{})[fresh],posts:window.__posts.length-n};});
 t('เซลล์ลบเลขที่ยังไม่เริ่มเดินงานได้ (เขียน tombstone)',
   del.freshHasDel&&del.gone&&del.tomb&&del.posts===1,JSON.stringify(del));
 t('🔑 เลขที่เริ่มเดินงานแล้ว เซลล์ลบเองไม่ได้ (ไม่มีปุ่ม)',!del.startedHasDel);

 /* ---------- 8b) ปุ่มสร้างออเดอร์ + ร้านปลายทางจากเลขที่เซลล์คีย์ ---------- */
 const mk=await ev(()=>{
   const o={};
   /* เทสข้อก่อนหน้าลบเลขที่สองไปแล้ว — ใส่กลับเพื่อพิสูจน์ว่ารวมได้หลายร้าน
      และเติมเลขที่ยังไม่มีในไฟล์ยอดขาย เพื่อดูว่ามันแยกเป็น "รอไฟล์" ไม่ใช่หายไปเฉย ๆ */
   CSTOCK.sub['B20261118-01|BDD0100000007']={sid:'B20261118-01',no:'BDD0100000007',
     ln:'209611',byName:'CT11',at:5,up:5};
   CSTOCK.sub['B20261118-01|BDD0100000777']={sid:'B20261118-01',no:'BDD0100000777',
     ln:'209611',byName:'CT11',at:6,up:6};
   delete CSTOCK.subdel['B20261118-01|BDD0100000007'];
   __as('manager',null,'แอดมิน 1');SP.sid='B20261118-01';SP.view='slip';renderSpord();
   o.mgr=document.getElementById('spNewBox').style.display;
   o.shops=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   __as('sales','209611','CT11');renderSpord();
   o.sales=document.getElementById('spNewBox').style.display;
   __as('wh',null,'ทีมคลัง 1');renderSpord();
   o.wh=document.getElementById('spNewBox').style.display;
   o.whShops=/ร้านปลายทาง/.test(document.getElementById('spBody').textContent);
   __as('manager',null,'แอดมิน 1');renderSpord();spNewOrder();
   o.went={tab:CURTAB,view:SP.view,form:!!(CST.f&&CST.f.rows&&CST.f.rows.length),
     spShown:!document.getElementById('spordView').classList.contains('hidden'),
     cstShown:!document.getElementById('cstockView').classList.contains('hidden'),
     inputs:!!document.getElementById('spBody').querySelector('input,select'),
     cstBill:(document.getElementById('cstBill')||{}).innerHTML||''};
   return o;});
 t('🔑 ปุ่ม ➕ สร้างออเดอร์ใหม่ โชว์ให้แอดมิน และซ่อนจากเซลล์/คลัง',
   mk.mgr===''&&mk.sales==='none'&&mk.wh==='none',
   JSON.stringify({mgr:mk.mgr,sales:mk.sales,wh:mk.wh}));
 /* เจ้าของสั่ง 18 พ.ย. 69 รอบสาม: *"พอกดเพิ่มออเดอร์ มันพากลับไปหน้าสต็อคกลาง
    ทำให้มันเป็นสร้างหน้าใหม่ ในหมวดใหม่ได้เลย ไม่ต้องดึงกลับไปหน้าเก่าแล้ว"* */
 t('🔑 กดแล้วฟอร์มเปิด "ในหน้าออเดอร์พิเศษ" ไม่เด้งกลับหน้าสต็อคกลางเดิม',
   mk.went.tab==='spord'&&mk.went.view==='new'&&mk.went.form&&
   mk.went.spShown&&!mk.went.cstShown&&mk.went.inputs,JSON.stringify(mk.went));
 t('🛟 หน้าสต็อคกลางต้องไม่วาดฟอร์มซ้ำอีกชุด (id ซ้ำกันทั้งหน้า)',mk.went.cstBill==='');
 t('🔑 ร้านปลายทางมาจากเลขออเดอร์ที่เซลล์คีย์ ไม่ต้องอัพไฟล์รายชื่อร้าน',
   /ร้านปลายทางของใบนี้ \(2 ร้าน\)/.test(mk.shops)&&/พี่เทียร/.test(mk.shops)&&
   /แม่จุก/.test(mk.shops)&&/ไม่ต้องอัพไฟล์รายชื่อร้าน/.test(mk.shops)&&
   /อีก 1 เลข ยังไม่รู้ร้าน/.test(mk.shops)&&/BDD0100000777/.test(mk.shops),
   mk.shops.slice(mk.shops.indexOf('ร้านปลายทาง'),mk.shops.indexOf('ร้านปลายทาง')+120));
 t('ทีมคลัง/สายส่งก็เห็นร้านปลายทางด้วย (ไว้เช็กว่าของไปร้านไหน)',mk.whShops);

 /* ---------- 8c) หน้าแรก = เลือกเดือนก่อน ---------- */
 const nav=await ev(async()=>{
   __reset();
   CSTOCK.slips['B20261002-01']={id:'B20261002-01',d:'2026-10-02',at:1,up:1};
   CSTOCK.sub['B20261118-01|BDD0100000006']={sid:'B20261118-01',no:'BDD0100000006',
     ln:'209611',at:1,up:1};
   __as('manager',null,'แอดมิน 1');
   SP.view='mon';SP.ym='';SP.sid='';renderSpord();
   const o={mon:document.getElementById('spBody').textContent.replace(/\s+/g,' '),
            monBar:document.getElementById('spBar').textContent.replace(/\s+/g,' '),
            slipBox:document.getElementById('spSlipBox').style.display};
   spOpenMon('2026-11');
   o.list=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   o.listBar=document.getElementById('spBar').textContent.replace(/\s+/g,' ');
   spOpenSlip('B20261118-01');
   o.slip=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   o.slipBox2=document.getElementById('spSlipBox').style.display;
   spBack();o.back=SP.view+'|'+SP.ym;
   spBack();o.back2=SP.view+'|'+SP.ym;
   return o;});
 t('🔑 เข้ามาหน้าแรกเจอ "เลือกเดือน" ก่อน ไม่ใช่รายการยาว ๆ',
   /เลือกเดือนที่จะดู/.test(nav.monBar)&&/🗓 เลือกเดือน/.test(nav.mon)&&
   /พ\.ย\. 2569/.test(nav.mon)&&/ต\.ค\. 2569/.test(nav.mon),nav.mon.slice(0,120));
 t('...การ์ดเดือนบอกจำนวนใบและเลขออเดอร์ของเดือนนั้น',
   /1ใบออเดอร์|1 ใบออเดอร์/.test(nav.mon.replace(/\s/g,' '))&&
   /1 เลขออเดอร์/.test(nav.mon)&&/ค้างที่ทีมคุณ/.test(nav.mon),nav.mon.slice(0,150));
 t('...ช่องเลือกใบซ่อนไว้ตอนอยู่หน้าเลือกเดือน (ไม่รกตา)',nav.slipBox==='none',nav.slipBox);
 t('กดเดือน → เห็นรายการใบของเดือนนั้น พร้อมปุ่มกลับไปเลือกเดือนอื่น',
   /พ\.ย\. 2569/.test(nav.listBar)&&/B20261118-01/.test(nav.list)&&
   /เลือกเดือนอื่น/.test(nav.list)&&!/B20261002-01/.test(nav.list),nav.list.slice(0,140));
 t('กดใบ → เข้าหน้า 6 ขั้นตอน พร้อมปุ่มกลับ และช่องเลือกใบโผล่',
   /ภาพรวม 6 ขั้นตอน/.test(nav.slip)&&/กลับไปรายการใบ/.test(nav.slip)&&nav.slipBox2==='',
   nav.slip.slice(0,100));
 t('ปุ่มกลับไล่ถอยทีละชั้น: ใบ → รายการเดือน → เลือกเดือน',
   nav.back==='mon|2026-11'&&nav.back2==='mon|',nav.back+' → '+nav.back2);

 /* ---------- 8d) 12 เดือนเต็มปี + เลือกปี + สรุปลังครบ loop + ฟอร์มแบบย่อ ---------- */
 const y12=await ev(()=>{
   __reset();
   CSTOCK.slips['B20250820-01']={id:'B20250820-01',d:'2025-08-20',at:1,up:1};
   CSTOCK.lots['B20261118-01-r1']={id:'B20261118-01-r1',sl:'B20261118-01',d:'2026-11-18',
     code:'111',nm:'สินค้าทดสอบ',cs:100,pc:0,clr:[],up:1};
   CSTOCK.sub={
     'B20261118-01|BDD0100000006':{sid:'B20261118-01',no:'BDD0100000006',ln:'209611',at:1,up:1,
       s3:{ok:1,at:2},s4:{ok:1,at:3},s5:{ok:1,at:4}},
     'B20261118-01|BDD0100000007':{sid:'B20261118-01',no:'BDD0100000007',ln:'209612',at:2,up:2},
     'B20261118-01|BDD0100000777':{sid:'B20261118-01',no:'BDD0100000777',ln:'209613',at:3,up:3}};
   STOREDAILY.ord['BDD0100000006'].cs=30;STOREDAILY.ord['BDD0100000006'].pc=2;
   STOREDAILY.ord['BDD0100000007'].cs=25;STOREDAILY.ord['BDD0100000007'].pc=0;
   __as('manager',null,'แอดมิน 1');
   SP.view='mon';SP.ym='';SP.yr='';SP.sid='';renderSpord();
   const o={n:document.querySelectorAll('#spBody .card').length,
     txt:document.getElementById('spBody').textContent.replace(/\s+/g,' '),
     years:[...document.querySelectorAll('#spBody select option')].map(x=>x.value).join(','),
     yr:spYear()};
   spStepYear(-1);
   o.prev=spYear();o.prevTxt=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   o.prevN=document.querySelectorAll('#spBody .card').length;
   spSetYear('2026');spOpenMon('2026-11');spOpenSlip('B20261118-01');
   o.cases=spCases('B20261118-01');
   o.slip=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   return o;});
 t('🔑 หน้าเลือกเดือนขึ้นครบ 12 เดือนเสมอ เดือนที่ไม่มีก็ขึ้น 0 รายการ',
   y12.n===12&&/0 รายการ/.test(y12.txt)&&/ธ\.ค\. 2569/.test(y12.txt)&&/ม\.ค\. 2569/.test(y12.txt),
   y12.n+' การ์ด');
 t('...เดือนปัจจุบันมีป้ายกำกับให้เห็นง่าย',/เดือนนี้/.test(y12.txt));
 t('🔑 เลือกปีได้บนหัวข้อ และ ◀ ▶ เลื่อนปีได้',
   y12.years==='2026,2025'&&y12.yr==='2026'&&y12.prev==='2025'&&y12.prevN===12&&
   /ส\.ค\. 2568/.test(y12.prevTxt),y12.years+' · กด ◀ → '+y12.prev);
 t('🔑 สรุปว่าใบนี้ครบ loop กี่ลัง (ตัดบิล / เซลล์คีย์ / สายส่งส่งเสร็จ / ยังไม่กระจาย)',
   y12.cases.cut===100&&y12.cases.keyed===55&&y12.cases.sent===30&&y12.cases.left===45&&
   y12.cases.wait===1,JSON.stringify(y12.cases));
 t('...และขึ้นบนหน้าใบให้ทุกทีมเห็น พร้อม % ครบ loop',
   /ของในใบนี้ไปถึงไหนแล้ว/.test(y12.slip)&&/ครบ loop 30%/.test(y12.slip)&&
   /รอไฟล์ยอดขาย/.test(y12.slip),
   y12.slip.slice(y12.slip.indexOf('ของในใบนี้'),y12.slip.indexOf('ของในใบนี้')+130));

 const lite=await ev(()=>{
   __as('manager',null,'แอดมิน 1');spNewOrder();
   const h=document.getElementById('spBody').innerHTML;
   const txt=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   const o={ths:[...document.querySelectorAll('#spBody thead th')].map(x=>x.textContent.trim()).join('|'),
     ln:/cstRowSet\(0,'ln'/.test(h),own:/cstRowSet\(0,'own'/.test(h),
     attach:/cstFormEx\(\)/.test(h),spread:/cstRowSpread/.test(h),
     head:/ผู้รับผิดชอบ \(ทั้งใบ\)/.test(txt)};
   /* หน้าสต็อคกลางเดิมต้องยังครบเหมือนเดิม */
   CST.f=null;_switchTab('cstock');cstSetSec('bill');cstNew();
   const h2=document.getElementById('cstBill').innerHTML;
   o.oldTh=[...document.querySelectorAll('#cstBill thead th')].map(x=>x.textContent.trim()).join('|');
   o.oldLn=/cstRowSet\(0,'ln'/.test(h2);o.oldAttach=/cstFormEx\(\)/.test(h2);
   o.oldSpread=/cstRowSpread/.test(h2);
   CST.f=null;_switchTab('spord');
   return o;});
 t('🔑 ฟอร์มในหน้าออเดอร์พิเศษ ไม่มีสายวิ่ง/ผู้รับผิดชอบต่อท้ายสินค้าแต่ละตัว',
   !lite.ln&&!lite.own&&lite.ths.indexOf('สายวิ่ง')<0&&lite.ths.indexOf('ผู้รับผิดชอบ')<0,lite.ths);
 t('...แต่ผู้รับผิดชอบ "ทั้งใบ" ตรงหัวออเดอร์ยังอยู่',lite.head);
 t('...ปุ่มแนบไฟล์รายชื่อร้านถูกเอาออก (ร้านมาจากเลขออเดอร์แล้ว)',!lite.attach);
 t('...ปุ่ม ⇉ กระจายทุกสาย ถูกเอาออกด้วย (ไม่มีคอลัมน์สายวิ่งแล้ว)',!lite.spread);
 t('🛟 ฟอร์มหน้า 🧊 สต็อคกลาง (เดิม) ยังครบเหมือนเดิมทุกช่อง',
   lite.oldLn&&lite.oldAttach&&lite.oldSpread&&lite.oldTh.indexOf('สายวิ่ง')>=0,lite.oldTh);

 /* ---------- 9) ไม่มีใบใหญ่ ---------- */
 const none=await ev(()=>{__reset();CSTOCK.slips={};
   __as('wh',null,'ทีมคลัง 1');renderSpord();
   return document.getElementById('spBody').textContent.replace(/\s+/g,' ');});
 t('ยังไม่มีใบออเดอร์ใหญ่ → บอกให้รอแอดมิน ไม่ใช่หน้าว่าง',
   /รอแอดมินเปิดใบออเดอร์ใหญ่/.test(none),none.slice(0,80));

 let bad=0;A.forEach(([c,n,x])=>{if(!c)bad++;console.log((c?'  ✓ ':'  ✗ FAIL: ')+n.replace(/<[^>]*>/g,'')+(x&&!c?' → '+x:''));});
 const re=errs.filter(e=>!/localStorage/.test(e));
 if(re.length){console.log('PAGE ERRORS:');re.forEach(e=>console.log('   '+e));bad+=re.length;}
 await b.close();
 console.log('\n'+(bad?bad+' FAILED of '+A.length:'ALL PASS ('+A.length+' checks)'));
 process.exit(bad?1:0);
})();
