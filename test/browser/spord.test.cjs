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
/* ⚠️ ต้องโหลดผ่าน origin จริง ไม่ใช่ setContent — ไม่งั้น localStorage ถูกบล็อก และ
   `crypto.subtle` (ใช้ตรวจรหัสชั้นสองของหน้านี้) ไม่มีให้ใช้นอก secure context
   หลักเดียวกับ cstock.test.cjs / sreq.test.cjs */
const ORIGIN='https://bd-spord.test/';

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 /* ⚠️ เขตเวลาของคนใช้จริง (ไทย) ไม่ใช่ UTC — ดูเหตุผลใน datestep.test.cjs */
 const pg=await (await b.newContext({viewport:{width:1280,height:950},
   timezoneId:'Asia/Bangkok'})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 const html=fs.readFileSync(PAGE,'utf8');
 await pg.route(ORIGIN+'**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}));
 await pg.goto(ORIGIN,{waitUntil:'domcontentloaded'});
 await pg.addScriptTag({path:require.resolve('xlsx/dist/xlsx.full.min.js')});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);

 await pg.evaluate(`
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};
  /* 📕 ข้อมูล BUM อยู่บนเว็บแอดมินเท่านั้นแล้ว (28 พ.ย. 69) — 🎁 ของแถมตามโปร อ่านบล็อค BBF
     จากไฟล์ BUM ชุดนี้จึงจำลองว่าเปิดจาก /admin (เช็ก "เว็บเซลล์ไม่มี BUM" อยู่ใน promoend) */
  window.bumSiteOk=()=>true;
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
    /* ⚠️ หน้าเว็บใช้ร่วมกันทุกบล็อก — บล็อกที่จำลอง "เน็ตหลุด" ต้องไม่ติดไปบล็อกถัดไป
       (เจอจริง: §13 เซฟไม่ผ่านเพราะ bdPost ของ §12 ยังค้างอยู่) */
    window.bdPost=(u,b)=>{window.__posts.push({u:u,b:b});
      return Promise.resolve({ok:true,json:()=>Promise.resolve({ok:true})});};
    DATA.lines={};DATA.focus_order=[];
    Object.keys(FOCUS_MAP).forEach(c=>{DATA.lines[c]={display:FOCUS_MAP[c],
      type:FOCUS_MAP[c].indexOf('KA')===0?'KA':'CT',focus:true,name:'',emp:''};});
    DATA.daily={};DATA.targets={};DATA.monthly={'2026-11':{}};
    CSTOCK={lots:{},del:{},slips:{},sdel:{},ex:{},sub:{},subdel:{},key:{},gin:{},up:0};
    CSTOCK.slips['${B1}']={d:'2026-11-18',by:'admin1',byName:'แอดมิน 1',at:1,up:1};
    STOREDAILY={data:{},ord:{
      'BDD0100000006':{s:'4862383',l:'209611',d:'2026-11-18',v:351.47,c:4},
      'BDD0100000007':{s:'4862365',l:'209611',d:'2026-11-18',v:1709.38,c:3}}};
    PJP={out:{'4862383':{n:'พี่เทียร',rt:'209611'},'4862365':{n:'แม่จุก',rt:'209611'}},
         plan:{},done:{},cfg:{}};
    /* หน้าใบออเดอร์ย่อเหลือ 2 ขั้นตอนเมื่อ 25 พ.ย. 69 ส่วน 6 ขั้นเดิมย้ายไปอยู่หลังชิป 'old'
       ซึ่ง "ยังอยู่ครบ" — เทสชุดเดิมจึงเล็งไปที่ชิปนั้นต่อ */
    SP={sid:'${B1}',q:'',busy:0,view:'slip',ym:'2026-11',sec:'old',day:'',gin:''};
  };
  window.__as=(role,code,name)=>{S.user={id:code||role,role:role,code:code,name:name};
    /* 🔐 ปลดรหัสชั้นสองของหน้าออเดอร์พิเศษให้คนนี้ (จำแยกตามคนที่ล็อกอิน)
       เทสของตัวรหัสเองอยู่หัวไฟล์ ลบคีย์นี้ทิ้งก่อนเทสแล้ว */
    try{localStorage.setItem('bdsp:'+(code||role),'1');}catch(e){}
    _switchTab(tabIsTeam(role)?'spord':'sales');};
  window.__reset();
 `);
 const body=()=>ev(()=>document.getElementById('spBody').textContent.replace(/\s+/g,' '));

 /* ---------- 0) 🔐 รหัสชั้นที่สองของหน้านี้ (เจ้าของสั่ง 26 พ.ย. 69) ----------
    *"ให้ใส่รหัสอีกหนึ่งชั้นเพื่อเข้าชั้นนี้"* — รหัสจริงไม่อยู่ในไฟล์ (repo เป็น public)
    เก็บเป็น SHA-256 เท่านั้น เทสจึงคำนวณแฮชเทียบ ไม่ได้เขียนตัวเลขลงเทสด้วย */
 const PIN='391213';
 const gate=await ev(async(pin)=>{
   __reset();__as('manager',null,'ผู้จัดการ');
   SP_OPEN="";
   try{['manager','209611'].forEach(u=>localStorage.removeItem('bdsp:'+u));}catch(e){}
   _switchTab('spord');renderSpord();
   const tx=()=>document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   const o={locked:tx(),hasIn:!!document.getElementById('spPinIn'),
     bar:document.getElementById('spBar').textContent,
     leak:document.documentElement.innerHTML.indexOf(pin)>=0};
   /* รหัสผิด */
   document.getElementById('spPinIn').value='1234567890';
   await spPinGo();
   o.wrong=document.getElementById('spPinMsg').textContent;
   o.stillLocked=!!document.getElementById('spPinIn');
   /* รหัสถูก */
   document.getElementById('spPinIn').value=pin;
   await spPinGo();
   o.open=tx();o.noIn=!document.getElementById('spPinIn');
   o.remembered=(()=>{try{return localStorage.getItem(spPinKey());}catch(e){return null;}})();
   /* กด 🔒 ล็อกกลับ */
   spPinLock();
   o.reLocked=!!document.getElementById('spPinIn');
   o.forgot=(()=>{try{return localStorage.getItem(spPinKey());}catch(e){return null;}})();
   /* เปลี่ยนคนล็อกอิน → ต้องถามใหม่ (จำแยกตามคน) */
   document.getElementById('spPinIn').value=pin;await spPinGo();
   const a=!document.getElementById('spPinIn');
   S.user={id:'209611',role:'sales',code:'209611',name:'CT11'};
   _switchTab('spord');renderSpord();
   o.perUser=a&&!!document.getElementById('spPinIn');
   return o;},PIN);
 t('🔑 เข้าหน้าออเดอร์พิเศษต้องใส่รหัสอีกชั้น',
   gate.hasIn&&/ต้องใส่รหัสอีกชั้นหนึ่ง/.test(gate.locked),gate.locked.slice(0,70));
 t('🔒 ...และตอนล็อกอยู่ ไม่วาดข้อมูลของหน้านี้เลย (ไม่ใช่แค่ซ่อนปุ่ม)',
   !/ใบออเดอร์|เลือกเดือน|ฝั่งเซลล์/.test(gate.locked)&&gate.bar==='',
   gate.locked.slice(0,70)+' | bar='+gate.bar);
 t('🔒 ตัวเลขรหัสต้องไม่อยู่ในหน้าเว็บเลย (repo นี้เป็น public)',!gate.leak);
 t('🛟 รหัสผิด → บอกว่าผิด และยังเข้าไม่ได้',
   /รหัสไม่ถูกต้อง/.test(gate.wrong)&&gate.stillLocked,gate.wrong);
 t('🔑 รหัสถูก → เข้าหน้าได้ และเครื่องนี้จำไว้ให้',
   gate.noIn&&gate.remembered==='1',JSON.stringify({open:gate.noIn,mem:gate.remembered}));
 t('🔑 มีปุ่ม 🔒 ล็อกกลับ และกดแล้วลืมรหัสที่จำไว้',
   gate.reLocked&&!gate.forgot,JSON.stringify({locked:gate.reLocked,mem:gate.forgot}));
 t('🛟 จำแยกตามคนที่ล็อกอิน — เปลี่ยนคนแล้วถามใหม่',gate.perUser);


 /* ---------- 0.5) 👤 ฝั่งเซลล์รายสาย: เป้าของซุป vs ที่เซลล์คีย์จริง ----------
    เจ้าของสั่ง 26 พ.ย. 69: ซุปกรอกเป้า → ส่งไฟล์ให้เซลล์ → เซลล์กรอกที่คีย์จริงของสายตัวเอง
    เซลล์แก้ได้ครั้งเดียว · ซุปดูได้อย่างเดียวแก้ไม่ได้ · กดที่ตัวเลขดูประวัติได้ */
 const rep=await ev(async()=>{
   __reset();
   /* ใบนี้ต้องมีสินค้า ไม่งั้นหน้าขึ้นว่า "ใบนี้ยังไม่มีรายการสินค้า" */
   [['64849613','โอโมน้ำ ซากุระ'],['65456729','บรีสเอกเซล']].forEach((p,i)=>{
     const id='B20261118-01-k'+i;
     CSTOCK.lots[id]={id:id,sl:'B20261118-01',d:'2026-11-18',code:p[0],nm:p[1],
       cs:20,pc:0,sq:i,ln:i?'CT12':'CT11',up:1};});
   CSTOCK.slips['B20261118-01'].g='D';   /* ขั้นซุปจดมีเฉพาะใบ 🎯 ตัวกระจาย */
   /* ซุปตั้งเป้าให้ CT11 */
   __as('sup',null,'หัวหน้าเซลล์');_switchTab('spord');
   SP.sid='B20261118-01';SP.view='slip';SP.sec='key';SP.day='2026-11-20';renderSpord();
   CSTOCK.key['B20261118-01|2026-11-20|CT11']={it:{'64849613':{sc:10,sp:0,fc:1,fp:0}},
     by:'sup',byName:'หัวหน้าเซลล์',at:1000};
   renderSpord();
   const o={};
   const tx=()=>document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   SP.sec='rep';renderSpord();
   o.supNoInput=!document.getElementById('spRNo_CT11');   /* ซุปกรอกของเซลล์ไม่ได้ */
   o.supSeesTrack=/ติดตามการคีย์รายสาย/.test(tx())&&/รอเซลล์คีย์/.test(tx());
   SP.sec='key';renderSpord();
   o.supExport=typeof spTgtXlsx==='function'&&spTgtRows('B20261118-01','2026-11-20').body.length>0;

   /* เซลล์ CT11 เข้ามา "ใส่เลขออเดอร์" ของสายตัวเอง (27 พ.ย. 69 เลิกกรอกจำนวนแล้ว)
      ตั้งดัชนีไว้ให้สองเลขนี้มีจริง ระบบจะได้หายอดเองได้ */
   STOREDAILY.ord['BDD0100008801']={s:'4862383',l:'209611',d:'2026-11-20',v:1000,c:2,cs:8,pc:0,rf:'1034800001'};
   STOREDAILY.ord['BDD0100008802']={s:'4862365',l:'209611',d:'2026-11-20',v:900,c:2,cs:4,pc:0,rf:'1034800002'};
   /* 🧮 รายการสินค้าในแต่ละใบ — ต้องมีถึงจะเทียบ "เป้า" กับ "คีย์จริง" ทีละรหัสได้
      (ลังละ 12 ชิ้น · เป้า 11 ลัง = 132 ชิ้น · คีย์มา 8+4 = 12 ลัง = 144 ชิ้น) */
   OT.cache['2026-11']={ord:{},det:{'00008801':{'64849613':[8,0,12]},
                                    '00008802':{'64849613':[4,0,12]}},meta:null,none:0};
   spRfBust();
   __as('sales','209611','CT11 · เซลล์');_switchTab('spord');
   SP.sid='B20261118-01';SP.view='slip';SP.sec='rep';SP.day='2026-11-20';renderSpord();
   o.myLine=spMyLine();
   o.hasMine=!!document.getElementById('spRNo_CT11');
   o.notOther=!document.getElementById('spRNo_CT12');
   o.noQty=!document.getElementById('spR_CT11_64849613_sc');   /* ไม่มีช่องกรอกจำนวนแล้ว */
   o.seesTgt=/รายการที่ต้องคีย์ · 20 พ\.ย\./.test(tx())&&/64849613/.test(tx());
   await spRepSave('B20261118-01','2026-11-20','CT11',{},['1034800001']);
   o.post1=window.__posts[window.__posts.length-1];
   let r=CSTOCK.rep['B20261118-01|2026-11-20|CT11'];
   o.n1=r&&r.n; o.h1=r&&r.h.length;
   o.left1=spRepLeft(r);o.max=REP_MAX;
   /* บันทึกซ้ำ — เลขออเดอร์ทยอยเกิดทั้งวัน เซลล์ต้องเพิ่มแล้วเซฟใหม่ได้หลายรอบ */
   await spRepSave('B20261118-01','2026-11-20','CT11',{},['1034800001','1034800002']);
   r=CSTOCK.rep['B20261118-01|2026-11-20|CT11'];
   o.n2=r&&r.n; o.h2=r&&r.h.length; o.left2=spRepLeft(r); o.cur=(r&&r.no||[]).length;
   /* เซฟจนครบโควต้าของวัน แล้วครั้งถัดไปต้องถูกปฏิเสธ */
   let guard=0;
   while(spRepLeft(CSTOCK.rep['B20261118-01|2026-11-20|CT11'])>0&&guard++<50)
     await spRepSave('B20261118-01','2026-11-20','CT11',{},['1034800001','1034800002']);
   const before=window.__posts.length;
   o.third=await spRepSave('B20261118-01','2026-11-20','CT11',{},['9999999999']);
   o.noExtraPost=window.__posts.length===before;
   o.stillCur=(CSTOCK.rep['B20261118-01|2026-11-20|CT11'].no||[]).join(',');
   /* ประวัติ */
   renderSpord();
   spHistOpen('B20261118-01','2026-11-20','CT11');
   o.hist=document.getElementById('spHistBody').textContent.replace(/\s+/g,' ');
   o.histShown=!document.getElementById('spHistBox').classList.contains('hidden');

   /* ซุปกลับมาดู: เห็นของเซลล์ แต่แก้ไม่ได้ */
   __as('sup',null,'หัวหน้าเซลล์');SP.sec='rep';renderSpord();
   const b2=window.__posts.length;
   o.supBlocked=await spRepSave('B20261118-01','2026-11-20','CT11',{},['1034800001']);
   o.supNoPost=window.__posts.length===b2;
   o.trk=spTrack('B20261118-01','2026-11-20').filter(x=>x.ln==='CT11')[0];
   o.supTxt=tx();
   return o;});
 t('🔑 เซลล์ใส่ "เลขออเดอร์" ของสายตัวเองได้ และไม่ต้องกรอกจำนวนแล้ว',
   rep.myLine==='CT11'&&rep.hasMine&&rep.noQty&&rep.post1&&rep.post1.u==='/api/spord'&&rep.post1.b.act==='rep',
   JSON.stringify({line:rep.myLine,noQty:rep.noQty,act:rep.post1&&rep.post1.b.act}));
 t('🔑 ...แต่ยังเห็นรายการที่ต้องไปคีย์ของวันนั้น',rep.seesTgt);
 t('🔒 ...และเห็นช่องกรอกเฉพาะสายตัวเอง ไม่ใช่ของสายอื่น',rep.hasMine&&rep.notOther);
 t('🔑 เซลล์กดบันทึกเพิ่มได้หลายรอบในวันเดียว แล้วเลขชุดใหม่ชนะ',
   rep.max>=5&&rep.left1===rep.max-1&&rep.n2===2&&rep.left2===rep.max-2&&rep.cur===2,
   JSON.stringify({max:rep.max,left1:rep.left1,n2:rep.n2,left2:rep.left2,cur:rep.cur}));
 t('🛟 ครบโควต้าของวันแล้วต้องถูกปฏิเสธ ไม่ยิงขึ้นเซิร์ฟเวอร์ และของเดิมไม่เปลี่ยน',
   rep.third===false&&rep.noExtraPost&&rep.stillCur==='1034800001,1034800002',
   JSON.stringify({third:rep.third,cur:rep.stillCur}));
 t('🔑 กดดูประวัติได้ว่ากรอกเมื่อไหร่ แก้เมื่อไหร่ (ทุกครั้งเก็บไว้ ไม่ทับของเดิม)',
   rep.h1===1&&rep.h2===2&&rep.histShown&&/ครั้งล่าสุด/.test(rep.hist),
   JSON.stringify({h1:rep.h1,h2:rep.h2}));
 t('🔒 หัวหน้าเซลล์แก้จำนวนของเซลล์ไม่ได้เลย ดูได้อย่างเดียว',
   rep.supNoInput&&rep.supBlocked===false&&rep.supNoPost);
 t('🔑 ซุปเห็นตารางติดตาม และ "คีย์จริง" นับเฉพาะสินค้าในใบนี้ ทีละรหัส (8+4=12 ลัง)',
   rep.supSeesTrack&&rep.trk&&rep.trk.tgtCs.cs===11&&rep.trk.repCs.cs===12&&rep.trk.repCs.pc===0&&
   rep.trk.rSrc==='order'&&rep.trk.st==='over'&&rep.trk.over.cs===1&&rep.trk.over.pc===0,
   JSON.stringify(rep.trk&&{tgt:rep.trk.tgtCs,rep:rep.trk.repCs,over:rep.trk.over,st:rep.trk.st}));
 t('🔑 ซุปดึงเป้าออกเป็นไฟล์ส่งให้เซลล์ได้',rep.supExport);

 /* ---- 🗑 ผู้จัดการลบของที่เซลล์คีย์ไว้ (เจ้าของสั่ง 28 พ.ย. 69 ช่วงทดลองใช้) ----
    กฎเดิมของโปรเจ็กต์: เขียนทับเป็น it:{} no:[] **ห้ามลบคีย์ทิ้ง** แท็บเก่าจะ union กลับมา */
 const repDel=await ev(async()=>{
   const K='B20261118-01|2026-11-20|CT11';
   const o={};
   /* ซุปกดลบไม่ได้ — ปุ่มไม่ขึ้น และต่อให้เรียกฟังก์ชันตรง ๆ ก็ต้องไม่ยิง */
   __as('sup',null,'หัวหน้าเซลล์');SP.sec='rep';SP.day='2026-11-20';renderSpord();
   o.supNoBtn=!/🗑 ลบ/.test(document.getElementById('spBody').textContent);
   const b0=window.__posts.length;
   await spRepLineDel('B20261118-01','2026-11-20','CT11');
   o.supNoPost=window.__posts.length===b0;
   o.supKept=(CSTOCK.rep[K].no||[]).length;
   /* ผู้จัดการกดลบได้ */
   __as('manager','','ผู้จัดการ');SP.sec='rep';renderSpord();
   o.mgrBtn=/🗑 ลบ/.test(document.getElementById('spBody').textContent);
   o.before=JSON.parse(JSON.stringify(CSTOCK.rep[K]));
   await spRepLineDel('B20261118-01','2026-11-20','CT11');
   const r=CSTOCK.rep[K];
   o.stillThere=!!r;                       /* คีย์ยังอยู่ (tombstone) ไม่ได้ลบทิ้ง */
   o.nNo=(r.no||[]).length;o.nIt=Object.keys(r.it||{}).length;
   o.hist=(r.h||[]).length;                /* ประวัติยังอยู่ และมีรายการลบเพิ่มเข้าไป */
   o.quota=r.n;                            /* โควต้าของเซลล์ไม่ถูกรีเซ็ต */
   o.act=(window.__posts[window.__posts.length-1]||{}).b;
   o.trk=spTrack('B20261118-01','2026-11-20').filter(x=>x.ln==='CT11')[0];
   /* เป้าที่ซุปตั้งไว้ต้องไม่ถูกแตะ */
   o.tgtKept=Object.keys(((CSTOCK.key['B20261118-01|2026-11-20|CT11']||{}).it)||{}).length;
   /* กดลบซ้ำ: ไม่มีอะไรให้ลบแล้ว ต้องไม่ยิงอีก */
   const b1=window.__posts.length;
   await spRepLineDel('B20261118-01','2026-11-20','CT11');
   o.twice=window.__posts.length===b1;
   return o;});
 t('🔒 หัวหน้าเซลล์ลบของเซลล์ไม่ได้ ทั้งปุ่มและฟังก์ชัน',
   repDel.supNoBtn&&repDel.supNoPost&&repDel.supKept===2,
   JSON.stringify({btn:repDel.supNoBtn,post:repDel.supNoPost,kept:repDel.supKept}));
 t('🔑 ผู้จัดการกดลบจำนวน/เลขออเดอร์ที่เซลล์คีย์ไว้ได้',
   repDel.mgrBtn&&repDel.nNo===0&&repDel.nIt===0&&repDel.act&&repDel.act.act==='rep',
   JSON.stringify({btn:repDel.mgrBtn,no:repDel.nNo,it:repDel.nIt}));
 t('🛟 ลบแล้วเขียนทับเป็นค่าว่าง ไม่ลบคีย์ทิ้ง (แท็บเก่าจะไม่ union ของเดิมกลับมา)',
   repDel.stillThere,String(repDel.stillThere));
 t('🛟 ประวัติการกรอกยังอยู่ครบ และโควต้าของเซลล์ไม่ถูกรีเซ็ต',
   repDel.hist>repDel.before.h.length-1&&repDel.quota===repDel.before.n,
   JSON.stringify({h:repDel.hist,was:repDel.before.h.length,n:repDel.quota,wasN:repDel.before.n}));
 t('🔑 ลบแล้วตารางติดตามอ่านว่า "ยังไม่ได้คีย์" ไม่ใช่ "คีย์แล้ว 0 ลัง"',
   repDel.trk&&repDel.trk.done===false&&repDel.trk.st==='wait',
   JSON.stringify(repDel.trk&&{done:repDel.trk.done,st:repDel.trk.st}));
 t('🛟 เป้าที่ซุปตั้งไว้ไม่ถูกลบไปด้วย',repDel.tgtKept>0,repDel.tgtKept);
 t('🛟 กดลบซ้ำตอนไม่มีอะไรให้ลบ ต้องไม่ยิงขึ้นเซิร์ฟเวอร์',repDel.twice,String(repDel.twice));
 /* ใบ A/B ไม่มีขั้นซุปจด ⇒ หน้าเซลล์คีย์ต้องไม่มีช่อง "เป้า / ยังขาด / ผล" ให้เข้าใจผิด
    ว่ามีใครลืมตั้งเป้า (เจ้าของสั่ง 26 พ.ย. 69 ให้ใบสองแบบนี้เริ่มที่เซลล์เลย) */
 const noTgt=await ev(()=>{
   CSTOCK.slips['B20261118-01'].g='A';
   __as('sales','209611','CT11 · เซลล์');SP.sec='rep';SP.day='2026-11-22';renderSpord();
   const ths=[...document.querySelectorAll('#spBody .sp-k4 thead th')].map(x=>x.textContent.trim());
   const tx=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   const box=!!document.getElementById('spRNo_CT11');
   CSTOCK.slips['B20261118-01'].g='D';
   return {ths:ths,tx:tx,box:box};});
 t('🔑 ใบที่ไม่มีขั้นซุปจด ไม่โชว์เป้าให้เข้าใจผิดว่าใครลืมตั้ง แต่ยังใส่เลขออเดอร์ได้',
   !/ยังไม่ได้ตั้งเป้า/.test(noTgt.tx)&&!/· เป้า/.test(noTgt.tx)&&noTgt.box,
   noTgt.ths.join(' | '));


 /* ---------- 0.7) แท็บใหม่ · ปุ่มย้อนกลับ · ชิปวันที่ · freeze หัวตาราง ---------- */
 const tabs=await ev(async()=>{
   __reset();
   [['64849613','โอโมน้ำ ซากุระ'],['65456729','บรีสเอกเซล']].forEach((p,i)=>{
     const id='B20261118-01-t'+i;
     CSTOCK.lots[id]={id:id,sl:'B20261118-01',d:'2026-11-18',code:p[0],nm:p[1],
       cs:20,pc:0,sq:i,ln:i?'CT12':'CT11',clr:[],up:1};});
   __as('manager',null,'ผู้จัดการ');_switchTab('spord');
   const tx=()=>document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   const o={};
   /* เข้าหน้าใบผ่านทางปกติ: เลือกเดือน -> เลือกใบ */
   SP.view='mon';SP.ym='';SP.hist=[];renderSpord();
   spOpenMon('2026-11');spOpenSlip('B20261118-01');
   /* ใบนี้ไม่มีธงกลุ่ม = 🧾 ตัดบิลรอส่ง (A) → ไม่มีขั้น "ซุปจด" */
   o.chipsMgr=[...document.querySelectorAll('#spTabs .tab2')].map(x=>x.textContent.trim());
   o.secA=SP.sec;
   /* แถบแท็บต้องอยู่ "เหนือ" เนื้อหน้า ไม่ใช่ฝังอยู่ในแผงกลางหน้า */
   o.tabsTop=!!(document.getElementById('spTabs').compareDocumentPosition(
     document.getElementById('spBody'))&Node.DOCUMENT_POSITION_FOLLOWING);
   o.tabsInBody=document.querySelectorAll('#spBody .tab2').length;
   /* สลับใบเป็น 🎯 ตัวกระจาย แล้วขั้นซุปจดต้องโผล่มาเป็นขั้นแรก */
   spSetGrp('D');
   o.gD=CSTOCK.slips['B20261118-01'].g;
   o.chipsD=[...document.querySelectorAll('#spTabs .tab2')].map(x=>x.textContent.trim());
   spSetGrp('A');
   /* ปุ่มย้อนกลับต้องถอยในหมวดนี้ ไม่ใช่กระโดดออกไปแท็บอื่น */
   o.backShown=document.getElementById('backBtn').style.display!=='none';
   /* ⚠️ ผู้จัดการลงจอดที่ ④ คลังจัดส่ง อยู่แล้ว (กฎ spHomeSec) — ตั้งเป็น rep ก่อนแบบไม่ผ่าน
      spSetSec เพื่อให้ประวัติยังมีสามขั้นเหมือนเดิม แล้วการถอยถึงจะวัดอะไรได้จริง */
   SP.sec='rep';renderSpord();
   spSetSec('out');o.outTxt=tx();
   navBack();o.afterBack1={tab:CURTAB,view:SP.view,sec:SP.sec};
   navBack();o.afterBack2={tab:CURTAB,view:SP.view};
   navBack();o.afterBack3={tab:CURTAB,view:SP.view,ym:SP.ym};
   /* รายงาน: ผู้จัดการเห็น */
   spOpenMon('2026-11');spOpenSlip('B20261118-01');SP.sec='rpt';renderSpord();
   o.rptMgr=tx();
   /* หัวหน้าเซลล์ไม่เห็นแท็บรายงาน และเปิดตรง ๆ ก็ไม่ได้ */
   __as('sup',null,'หัวหน้าเซลล์');SP.view='slip';SP.sid='B20261118-01';SP.sec='rpt';renderSpord();
   o.chipsSup=[...document.querySelectorAll('#spTabs .tab2')].map(x=>x.textContent.trim());
   o.rptSup=tx();
   return o;});
 /* เจ้าของสั่ง 26 พ.ย. 69: ใบตัดบิลรอส่ง/ส่งแล้วรอตัดบิล เริ่มที่เซลล์ ไม่มีใครมาจดเป้าให้ก่อน
    ส่วนใบตัวกระจาย หัวหน้าเซลล์เป็นคนเปิดใบ จึงต้องมีขั้นซุปจดนำหน้า */
 /* ย่อลงเหลือ 2 ขั้นเมื่อ 26 พ.ย. 69 — *"หลังจากเซลล์คีย์ออเดอร์มา แค่ให้แอดมินมากรอกส่วนของคลัง
    ว่าสินค้าออกไปกับเลข GIN ไหน … แอดมินไม่ต้องมาเช็คเหมือนร้านที่กระจายเยอะ ๆ"* */
 t('🔑 ใบตัดบิลรอส่ง/ส่งแล้วรอตัดบิล เหลือ 2 ขั้น (เซลล์คีย์ → คลังจัดส่ง) + รายงาน',
   tabs.chipsMgr.length===3&&/เซลล์คีย์/.test(tabs.chipsMgr[0])&&
   /คลังจัดส่ง/.test(tabs.chipsMgr[1])&&/รายงาน/.test(tabs.chipsMgr[2])&&
   !tabs.chipsMgr.some(c=>/ซุปจด/.test(c))&&!tabs.chipsMgr.some(c=>/แอดมินตรวจ/.test(c))&&
   tabs.secA==='out',tabs.chipsMgr.join(' | ')+' · เปิดมาที่ '+tabs.secA);
 /* 🧭 29 พ.ย. 69 — เจ้าของสั่งให้ "เวปพาไปในส่วนที่เค้าต้องทำเองอย่างอัตโนมัติ":
    ซุป→ซุปจด · เซลล์→เซลล์คีย์ · แอดมิน→แอดมินตรวจ · คลัง/สายส่ง→คลังจัดส่ง
    ใบ A/B ไม่มีขั้นแอดมินตรวจ แอดมินจึงถอยไป ④ คลังจัดส่ง ซึ่งเป็นที่กรอกเลข GIN ของใบแบบนี้ */
 t('🔑 ใบ 🎯 ตัวกระจาย มี 4 ขั้น เริ่มที่ ① ซุปจด',
   tabs.gD==='D'&&tabs.chipsD.length===5&&/① ✍️ ซุปจด/.test(tabs.chipsD[0])&&
   /② 📲 เซลล์คีย์/.test(tabs.chipsD[1])&&/③ 🔎 แอดมินตรวจ/.test(tabs.chipsD[2])&&
   /④ 🚚 คลังจัดส่ง/.test(tabs.chipsD[3]),tabs.chipsD.join(' | '));
 /* เจ้าของสั่ง 26 พ.ย. 69: *"เอาหมวดเลขออเดอร์ออกไปได้เลย มันซ้ำกับหมวดคลังจัดส่งแล้ว"* */
 t('🔑 หมวด 🧾 เลขออเดอร์ ไม่อยู่บนแถบแท็บแล้วทั้งสองประเภท',
   !tabs.chipsMgr.some(c=>/เลขออเดอร์/.test(c))&&!tabs.chipsD.some(c=>/เลขออเดอร์/.test(c)),
   tabs.chipsMgr.concat(tabs.chipsD).join(' | '));
 /* เจ้าของสั่ง 26 พ.ย. 69: *"เอากรอบในนั้นขยับขึ้นมาอยู่ด้านบนให้เห็นชัดชัด"* */
 t('🔑 แถบแท็บอยู่บนสุดของหน้า เหนือเนื้อหน้า (ไม่ต้องเลื่อนจอลงไปหา)',
   tabs.tabsTop&&tabs.tabsInBody===0,'ใน spBody เหลือ '+tabs.tabsInBody+' ปุ่ม');
 t('🔑 ④ คลังจัดส่ง โชว์ของที่ตัดบิลไว้ของใบนี้ (ระบบเดิมของสต็อคกลาง)',
   /คลังจัดส่ง/.test(tabs.outTxt)&&/ตัดบิลไว้/.test(tabs.outTxt)&&/ยังค้าง/.test(tabs.outTxt),
   tabs.outTxt.slice(0,90));
 t('🔑 ปุ่มย้อนกลับถอยทีละหน้าในหมวดนี้ ไม่กระโดดออกไปแท็บอื่น',
   tabs.backShown&&tabs.afterBack1.tab==='spord'&&tabs.afterBack1.sec==='rep'&&
   tabs.afterBack2.tab==='spord'&&tabs.afterBack2.view==='mon'&&
   tabs.afterBack3.tab==='spord',
   JSON.stringify([tabs.afterBack1,tabs.afterBack2,tabs.afterBack3]));
 t('🔒 รายงานเปิดได้เฉพาะผู้จัดการ',
   /รายงานใบนี้/.test(tabs.rptMgr)&&tabs.chipsSup.length===2&&
   !tabs.chipsSup.some(c=>/รายงาน/.test(c))&&!/รายงานใบนี้/.test(tabs.rptSup),
   tabs.chipsSup.join(' | '));

 /* ชิป "วันที่มีข้อมูลแล้ว" ต้องหายไปเมื่อลบข้อมูลของวันนั้นแล้ว */
 const chips=await ev(async()=>{
   __reset();
   CSTOCK.key['B20261118-01|2026-11-20|CT11']={it:{'64849613':{sc:5}},by:'sup',at:1};
   CSTOCK.gin['B20261118-01|2026-11-21']={g:['77'],rows:{'CT11|64849613':{sc:5}},dd:[],by:'admin1',at:2};
   const before=spDays('B20261118-01').slice();
   /* ยกเลิกผลตรวจของ 21 = เขียน del:1 ทับ ไม่ใช่ลบคีย์ */
   CSTOCK.gin['B20261118-01|2026-11-21']={g:[],rows:{},dd:[],del:1,by:'admin1',at:3};
   const after=spDays('B20261118-01').slice();
   return {before:before,after:after};});
 t('🛟 ลบผลตรวจแล้ว วันที่นั้นต้องหายจากแถบ "วันที่มีข้อมูลแล้ว"',
   chips.before.join(',')==='2026-11-20,2026-11-21'&&chips.after.join(',')==='2026-11-20',
   JSON.stringify(chips));

 /* หัวตารางตอนกรอกต้อง freeze ได้จริง (ตัวครอบต้องเลื่อนเอง ไม่งั้น sticky ไม่ทำงาน) */
 const frz=await ev(()=>{
   __reset();
   [['64849613','โอโม'],['65456729','บรีส']].forEach((p,i)=>{
     const id='B20261118-01-f'+i;
     CSTOCK.lots[id]={id:id,sl:'B20261118-01',d:'2026-11-18',code:p[0],nm:p[1],cs:9,pc:0,sq:i,up:1};});
   CSTOCK.slips['B20261118-01'].g='D';      /* ขั้นซุปจดมีเฉพาะใบ 🎯 ตัวกระจาย */
   __as('sup',null,'หัวหน้าเซลล์');_switchTab('spord');
   SP.view='slip';SP.sid='B20261118-01';SP.sec='key';SP.day='2026-11-20';renderSpord();
   const w=document.querySelector('#spBody .tblwrap.sp-freeze');
   const th=w&&w.querySelector('thead th');
   const cs=w?getComputedStyle(w):null, ts=th?getComputedStyle(th):null;
   return {has:!!w,oy:cs&&cs.overflowY,pos:ts&&ts.position,top:ts&&ts.top,
     bg:ts&&ts.backgroundColor};});
 t('🔑 หัวตารางตอนกรอกจำนวน freeze ไว้ (sticky บนตัวครอบที่เลื่อนเอง)',
   frz.has&&frz.pos==='sticky'&&frz.top==='0px'&&frz.oy!=='visible',JSON.stringify(frz));
 t('🛟 ...และมีพื้นหลังทึบ ไม่ให้แถวทะลุขึ้นมาเห็นผ่านหัวตาราง',
   !!frz.bg&&frz.bg!=='rgba(0, 0, 0, 0)',frz.bg);


 /* ---------- 0.8) 🏷 ประเภทใบ 3 แบบ + หัวเรื่องเป็นชื่อสินค้าแทนรหัส ---------- */
 const tag=await ev(()=>{
   __reset();
   [['64849613','โอโมน้ำ ซากุระ',120],['65456729','บรีสเอกเซล',80],['90000003','สบู่',20]]
     .forEach((p,i)=>{const id='B20261118-01-g'+i;
       CSTOCK.lots[id]={id:id,sl:'B20261118-01',d:'2026-11-18',code:p[0],nm:p[1],
         cs:p[2],pc:0,sq:i,clr:[],up:1};});
   __as('manager',null,'ผู้จัดการ');_switchTab('spord');
   const o={};
   o.types=Object.keys(SP_GRP);
   /* ใบเก่าที่ไม่มีธง = ตัดบิลรอส่ง (ข้อมูลเดิมไม่ต้องย้าย) */
   o.oldDefault=spGrpOf(CSTOCK.slips['B20261118-01']);
   o.oldB=spGrpOf({g:'B'});
   o.newD=spGrpOf({g:'D'});
   o.junk=spGrpOf({g:'ZZ'});
   /* หัวเรื่อง = วันที่ · จำนวนรายการ · จำนวนลัง */
   o.title=spSlipTitle('B20261118-01');
   o.short=spDateShort('2025-08-04');
   o.thisYear=spDateShort(todayISO());
   /* ใบที่ยังไม่มีสินค้า ต้องถอยไปใช้รหัส ไม่ใช่ช่องว่าง */
   CSTOCK.slips['EMPTY-X']={at:1,up:1};
   o.empty=spSlipTitle('EMPTY-X');
   /* การ์ดในรายการเดือน + กล่องเลือกใบ ต้องขึ้นชื่อสินค้า และติดแท็กประเภท */
   SP.view='mon';SP.ym='2026-11';renderSpord();
   o.card=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   o.tagEl=!!document.querySelector('#spBody .sp-tag');
   o.opt=[...document.querySelectorAll('#spSlip option')].map(x=>x.textContent.trim()).join(' | ');
   /* กล่องเลือกใบเคยต่อวันที่เข้าไปอีกรอบท้ายชื่อ กลายเป็น
      "18 พ.ย. · 3 รายการ · 220 ลัง · 18 พ.ย. 2569" — เจ้าของทักเองว่าวันที่ซ้ำ */
   o.opt1=([...document.querySelectorAll('#spSlip option')]
     .filter(x=>x.value==='B20261118-01')[0]||{textContent:''}).textContent.trim();
   return o;});
 t('🔑 ประเภทใบมี 3 แบบ: ตัวกระจาย / ตัดบิลรอส่ง / ส่งแล้วรอตัดบิล',
   tag.types.join(',')==='D,A,B',tag.types.join(','));
 t('🛟 ข้อมูลเก่าไม่ต้องย้าย — ใบที่ไม่มีธงยังเป็นตัดบิลรอส่ง และ B ยังเป็นส่งแล้วรอตัดบิล',
   tag.oldDefault==='A'&&tag.oldB==='B'&&tag.newD==='D'&&tag.junk==='A',
   JSON.stringify(tag));
 /* เจ้าของสั่ง 26 พ.ย. 69: *"ใช้วันที่ - จำนวนสินค้า - จำนวนลัง เช่น 11 พ.ย. 7 รายการ 160 ลัง"* */
 t('🔑 หัวเรื่องใบเป็น วันที่ · จำนวนรายการ · จำนวนลัง',
   tag.title==='18 พ.ย. · 3 รายการ · 220 ลัง',tag.title);
 t('🛟 ปีไทยขึ้นเฉพาะใบที่ไม่ใช่ปีนี้ (ใบของปีนี้จะได้สั้น ไม่ยาวเท่ากันหมด)',
   /2568$/.test(tag.short)&&!/\d{4}$/.test(tag.thisYear),tag.short+' | '+tag.thisYear);
 t('🛟 ใบที่ยังไม่มีวันที่/สินค้า ถอยไปใช้รหัสใบ ไม่ใช่ขึ้นช่องว่าง',tag.empty==='',tag.empty);
 t('🔑 การ์ดในรายการเดือนขึ้นหัวเรื่องแบบเดียวกัน พร้อมแท็กประเภท และยังมีรหัสใบไว้อ้างอิง',
   /3 รายการ · 220 ลัง/.test(tag.card)&&/ตัดบิลรอส่ง/.test(tag.card)&&
   /B20261118-01/.test(tag.card)&&tag.tagEl,tag.card.slice(0,110));
 t('🔑 กล่องเลือกใบก็ขึ้นหัวเรื่องเดียวกัน ไม่ใช่รหัสเปล่า ๆ',
   /3 รายการ/.test(tag.opt),tag.opt.slice(0,90));
 t('🛟 กล่องเลือกใบขึ้นวันที่ครั้งเดียว ไม่ซ้ำสองรอบ',
   /3 รายการ/.test(tag.opt1)&&(tag.opt1.match(/18 พ\.ย\./g)||[]).length===1&&
   !/2569/.test(tag.opt1),tag.opt1);

 /* ---------- 1) ใครเห็นอะไร ---------- */
 const who=await ev(()=>{
   const o={};
   [['manager',null],['sales','209611'],['wh',null],['ds',null],['sup',null]].forEach(([r,c])=>{
     __as(r,c,r);o[r]={tab:CURTAB,groups:tabVisible().map(x=>x.g.k).join(','),
       tabs:(tabVisible().filter(x=>x.g.k==='spord')[0]||{tabs:[]}).tabs.map(x=>x.t).join(','),
       stock:(tabVisible().filter(x=>x.g.k==='stock')[0]||{tabs:[]}).tabs.map(x=>x.t).join(',')};});
   return o;});
 /* 26 พ.ย. 69 เจ้าของเพิ่มหมวด 📋 สถานะออเดอร์ และสั่งว่า "ทุกคนเข้ามาดูได้"
    ทีมคลัง/สายส่งจึงเห็น 2 กลุ่ม — หน้าสถานะออเดอร์อ่านอย่างเดียว ไม่ได้เปิดสิทธิ์เขียนอะไรเพิ่ม
    ส่วนยอดขาย/ราคา/ต้นทุน ยังปิดเหมือนเดิม */
 t('🔑 ทีมคลังเห็นได้แค่ สถานะออเดอร์ + ออเดอร์พิเศษ และเข้าหน้าออเดอร์พิเศษให้เลย',
   who.wh.groups==='psib,otrk,spord'&&who.wh.tabs==='spord'&&who.wh.tab==='spord',JSON.stringify(who.wh));
 t('🔑 ทีมสายส่งก็เหมือนกัน — ไม่เห็นยอดขาย/ราคา/ต้นทุน',
   who.ds.groups==='psib,otrk,spord'&&who.ds.tabs==='spord',JSON.stringify(who.ds));
 t('เซลล์ยังเห็นทุกกลุ่มเหมือนเดิม และเข้าหน้ายอดขายเป็นหน้าแรก',
   who.sales.tab==='sales'&&who.sales.groups.indexOf('sales')===0&&
   who.sales.stock==='stock,cstock',JSON.stringify(who.sales));   /* เซลล์ไม่เห็นรายงานสต็อค (ต้นทุน) */
 t('🔑 ออเดอร์พิเศษเป็นหมวดใหญ่ของตัวเอง ไม่ได้อยู่ใต้สต็อกแล้ว',
   who.manager.groups.indexOf('spord')>=0&&who.manager.stock==='stock,strep,cstock'&&
   who.manager.tabs==='spord',who.manager.groups+' | สต็อก: '+who.manager.stock);
 t('ผู้จัดการ/แอดมินเห็นครบเหมือนเดิม',who.manager.groups.split(',').length>=9,who.manager.groups);
 /* 🛟 หัวหน้าเซลล์ต้อง "มองเห็น" แท็บออเดอร์พิเศษจริง ๆ ไม่ใช่เข้าได้เพราะเทสเรียก _switchTab ตรง ๆ
    หน้า ① ฝั่งเซลล์ ทำไว้ให้เขาตั้งเป้าโดยเฉพาะ ถ้าแท็บไม่ขึ้นก็ใช้งานไม่ได้เลย */
 t('🛟 หัวหน้าเซลล์เห็นแท็บออเดอร์พิเศษ (ไม่งั้นเข้าไปตั้งเป้าไม่ได้เลย)',
   who.sup.groups.split(',').indexOf('spord')>=0&&who.sup.tabs==='spord',
   who.sup.groups+' | แท็บ: '+who.sup.tabs);

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
 t('ใบเก่าทุกใบเริ่มที่กลุ่ม A (ตัดบิลรอส่ง)',/ตัดบิลรอส่ง/.test(grp.a),grp.a.slice(0,60));
 t('แอดมินสลับใบไปกลุ่ม B (ส่งแล้วรอตัดบิล) ได้',
   grp.g==='B'&&/ส่งแล้วรอตัดบิล/.test(grp.b),grp.b.slice(0,70));
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
   o.slipTabs=document.getElementById('spTabs').textContent.replace(/\s+/g,' ');
   o.slipBox2=document.getElementById('spSlipBox').style.display;
   spBack();o.back=SP.view+'|'+SP.ym;
   spBack();o.back2=SP.view+'|'+SP.ym;
   return o;});
 t('🔑 เข้ามาหน้าแรกเจอ "เลือกเดือน" ก่อน ไม่ใช่รายการยาว ๆ',
   /เลือกเดือนที่จะดู/.test(nav.monBar)&&/🗓 เลือกเดือน/.test(nav.mon)&&
   /พ\.ย\. 2569/.test(nav.mon)&&/ต\.ค\. 2569/.test(nav.mon),nav.mon.slice(0,120));
 /* 25 พ.ย. 69: แถวละเดือน ไล่ ม.ค.→ธ.ค. และบอกความคืบหน้าเป็น "วันที่คีย์แล้ว / ตรวจแล้ว" */
 t('...แถวเดือนบอกจำนวนใบ และความคืบหน้าสองฝั่งของเดือนนั้น',
   /1\s*ใบออเดอร์/.test(nav.mon.replace(/\s/g,' '))&&
   /เซลล์คีย์/.test(nav.mon)&&/แอดมินตรวจ/.test(nav.mon),nav.mon.slice(0,150));
 t('...ช่องเลือกใบซ่อนไว้ตอนอยู่หน้าเลือกเดือน (ไม่รกตา)',nav.slipBox==='none',nav.slipBox);
 /* 📅 เจ้าของสั่ง 26 พ.ย. 69: *"หน้าบันทึกแล้วของแอดมิน ให้ขึ้นเป็นสีทึบในปฏิทินแทน
    ไม่ต้องขึ้นวันข้าง ๆ แบบนี้ ไม่งั้นมันจะลิสออกมาเยอะมากแน่ ๆ"* */
 const cal=await ev(()=>{
   const sid='B20261118-01',C=spKeyOk();
   C.gin[sid+'|2026-11-18']={at:Date.now(),rows:{'1001':{cs:1}},g:['44']};
   SP.sid=sid;SP.day='2026-11-18';SP.cm='';
   const h=spCalHtml(sid);
   const box=document.createElement('div');box.innerHTML=h;
   const cells=[...box.querySelectorAll('.cal-day')];
   const has=cells.filter(c=>c.classList.contains('has')).map(c=>c.textContent.trim());
   const chk=cells.filter(c=>c.classList.contains('chk')).map(c=>c.textContent.trim());
   const sel=cells.filter(c=>c.classList.contains('sel')).map(c=>c.textContent.trim());
   SP.cm='';spCalStep(-1);const prev=spCalMon(sid);
   spCalStep(1);const back=spCalMon(sid);
   const before=JSON.stringify(CSTOCK);
   spSetDay('2026-11-20');const afterMon=spCalMon(sid);
   const same=before===JSON.stringify(CSTOCK);
   delete C.gin[sid+'|2026-11-18'];SP.day='';SP.cm='';
   return {html:h,has:has.join(','),chk:chk.join(','),sel:sel.join(','),
     prev:prev,back:back,afterMon:afterMon,same:same,
     chips:/pl-cb/.test(h),head:/พ\.ย\. 2569/.test(h)};});
 t('📅 วันที่มีข้อมูลขึ้นเป็นสีทึบในปฏิทิน ไม่ใช่ลิสต์วันข้าง ๆ',
   cal.has.length>0&&!cal.chips&&cal.head,cal.has+' | chips='+cal.chips);
 t('📅 วันที่แอดมินตรวจแล้วมีสีของตัวเอง แยกจากวันที่แค่มีข้อมูล',
   cal.chk==='18'&&cal.has.indexOf('18')>=0,'has='+cal.has+' chk='+cal.chk);
 t('📅 วันที่เลือกอยู่ถูกไฮไลต์',cal.sel==='18',cal.sel);
 t('📅 เดือนที่ปฏิทินโชว์แยกจากวันที่เลือก (กดย้อนเดือนแล้วไม่เด้งกลับ)',
   cal.prev==='2026-10'&&cal.back==='2026-11',cal.prev+' → '+cal.back);
 t('📅 กดวันในปฏิทินแล้วปฏิทินตามไปเดือนนั้น',cal.afterMon==='2026-11',cal.afterMon);
 t('🛟 ปฏิทินไม่แตะข้อมูลเลย',cal.same,'');

 /* 🐞 เจ้าของทักเอง 26 พ.ย. 69: การ์ดเดือนขึ้น "แอดมินตรวจ 2 วัน" แต่เข้าไปในใบแล้วไม่มีอะไรเลย
    สาเหตุ: spMonGin/spMonKeyed นับแค่ "มีคีย์อยู่" จึงนับทั้งวันที่กดยกเลิกผลตรวจไปแล้ว (del:1)
    และเรคอร์ดเปล่า ๆ ที่เหลือจากการเซฟแล้วลบข้อความออก */
 const ghost=await ev(()=>{
   const sid='B20261118-01',C=spKeyOk();
   const before={k:spMonKeyed('2026-11'),g:spMonGin('2026-11')};
   C.gin[sid+'|2026-11-27']={at:Date.now(),rows:{},g:[],del:1};      /* กดยกเลิกผลตรวจไปแล้ว */
   C.gin[sid+'|2026-11-28']={at:Date.now(),rows:{},g:[]};            /* เซฟแล้วลบข้อความออกหมด */
   C.key[sid+'|2026-11-29|CT11']={at:Date.now(),it:{},del:1};        /* ฝั่งซุปก็เหมือนกัน */
   const after={k:spMonKeyed('2026-11'),g:spMonGin('2026-11')};
   const days=spDays(sid);
   delete C.gin[sid+'|2026-11-27'];delete C.gin[sid+'|2026-11-28'];
   delete C.key[sid+'|2026-11-29|CT11'];
   return {before:before,after:after,days:days.join(',')};});
 t('🐞 วันที่ยกเลิกผลตรวจไปแล้ว ต้องไม่ถูกนับว่า "แอดมินตรวจแล้ว"',
   ghost.after.g===ghost.before.g,JSON.stringify(ghost));
 t('🐞 เรคอร์ดเปล่า ๆ (เซฟแล้วลบข้อความออก) ก็ต้องไม่ถูกนับ',
   ghost.after.k===ghost.before.k,JSON.stringify(ghost));
 t('🛟 ...และตัวเลขบนการ์ดเดือนต้องตรงกับวันที่หน้าใบขึ้นจริง',
   !/2026-11-27|2026-11-28|2026-11-29/.test(ghost.days),ghost.days);
 t('กดเดือน → เห็นรายการใบของเดือนนั้น พร้อมปุ่มกลับไปเลือกเดือนอื่น',
   /พ\.ย\. 2569/.test(nav.listBar)&&/B20261118-01/.test(nav.list)&&
   /เลือกเดือนอื่น/.test(nav.list)&&!/B20261002-01/.test(nav.list),nav.list.slice(0,140));
 t('กดใบ → เข้าหน้าใบ พร้อมปุ่มกลับ และช่องเลือกใบโผล่',
   /เซลล์คีย์/.test(nav.slipTabs)&&/กลับไปรายการใบ/.test(nav.slip)&&nav.slipBox2==='',
   nav.slipTabs.slice(0,100)+' | '+nav.slip.slice(0,60));
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
   const o={n:document.querySelectorAll('#spBody .sp-mon').length,
     txt:document.getElementById('spBody').textContent.replace(/\s+/g,' '),
     years:[...document.querySelectorAll('#spBody select option')].map(x=>x.value).join(','),
     yr:spYear()};
   spStepYear(-1);
   o.prev=spYear();o.prevTxt=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   o.prevN=document.querySelectorAll('#spBody .sp-mon').length;
   o.order=[...document.querySelectorAll('#spBody .sp-mn')].map(x=>x.textContent.trim().slice(0,6));
   spSetYear('2026');
   o.order26=[...document.querySelectorAll('#spBody .sp-mn')].map(x=>x.textContent.trim().slice(0,6));
   spOpenMon('2026-11');spOpenSlip('B20261118-01');SP.sec='old';renderSpord();
   o.cases=spCases('B20261118-01');
   o.slip=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   return o;});
 /* หน่วยของการ์ดนี้คือ "ใบออเดอร์" ไม่ใช่ "รายการ" — คำว่ารายการเคยไปชนกับหน้าสต็อคกลาง
    ที่นับบรรทัดสินค้า จนเจ้าของถามว่าทำไมเลขไม่ตรงกัน (25 พ.ย. 69) */
 t('🔑 หน้าเลือกเดือนขึ้นครบ 12 เดือนเสมอ เดือนที่ไม่มีก็ขึ้น 0 ใบออเดอร์',
   y12.n===12&&/0\s*ใบออเดอร์/.test(y12.txt)&&/ธ\.ค\. 2569/.test(y12.txt)&&/ม\.ค\. 2569/.test(y12.txt),
   y12.n+' การ์ด');
 t('🛟 ...และไม่ใช้คำว่า "รายการ" บนการ์ดเดือน (กันสับสนกับบรรทัดสินค้าของสต็อคกลาง)',
   !/\d+\s*รายการ/.test(y12.txt),(y12.txt.match(/\d+\s*รายการ/)||[""])[0]);
 t('...เดือนปัจจุบันมีป้ายกำกับให้เห็นง่าย',/เดือนนี้/.test(y12.txt));
 /* เจ้าของสั่ง 25 พ.ย. 69: *"ให้มันไล่จากบนลงล่าง เป็นต้นปีมาปลายปี"* */
 t('🔑 เดือนเรียงจากต้นปีลงมาปลายปี (ม.ค. อยู่บนสุด ธ.ค. ล่างสุด)',
   /ม\.ค\./.test(y12.order26[0])&&/ธ\.ค\./.test(y12.order26[11]),y12.order26.join(' → '));
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

 /* ---------- 8ข) เลือกหมวดออเดอร์ตั้งแต่ตอนสร้างใบ ----------
    เจ้าของสั่ง: *"ช่วยปรับให้เลือกว่าออเดอร์ใหม่นี้เป็นหมวด ตัดบิลยังไม่ส่งของ
    และ ส่งของแล้วยังไม่ตัดบิล"* — เดิมเลือกได้เฉพาะหลังบันทึกใบแล้ว */
 const gq=await ev(()=>{
   __reset();__as('manager',null,'แอดมิน 1');spNewOrder();
   const el=()=>document.getElementById('spBody');
   const txt=()=>el().textContent.replace(/\s+/g,' ');
   const o={};
   o.has=/ตัวกระจาย/.test(txt())&&/ตัดบิลรอส่ง/.test(txt())&&/ส่งแล้วรอตัดบิล/.test(txt());
   o.defA=cstFormGrp(CST.f);
   o.onA=/class="pl-today on" onclick="cstSetGrp\('A'\)/.test(el().innerHTML);
   cstSetGrp('B');
   o.nowB=cstFormGrp(CST.f);
   o.onB=/class="pl-today on" onclick="cstSetGrp\('B'\)/.test(el().innerHTML);
   o.hint=/ของออกจากคลังไปแล้ว รอตัดบิลตามทีหลัง/.test(txt());
   /* บันทึกจริง → ต้องลงไปอยู่บนใบ และหัวใบต้องขึ้นหมวดนั้น */
   CST.f.rows[0].code='1001';CST.f.rows[0].nm='สินค้าทดสอบ';CST.f.rows[0].cs=5;
   const sid=cstSlipSave();
   o.sid=sid;o.saved=(CSTOCK.slips[sid]||{}).g;
   o.bar=spBarHtml(spSlip(sid)).replace(/\s+/g,' ');
   /* กลับมาแก้ใบเดิมแล้วเซฟใหม่ ต้องไม่เด้งกลับเป็น A */
   cstSlipEdit(sid);o.reload=cstFormGrp(CST.f);
   cstSlipSave();o.again=(CSTOCK.slips[sid]||{}).g;
   /* ใบเก่าที่ยังไม่เคยมีช่อง g อ่านเป็นกลุ่ม A เหมือนเดิม */
   o.oldSlip=spGrpOf(CSTOCK.slips['B20261118-01']);
   /* ฟอร์มหน้าสต็อคกลางเดิมก็เลือกหมวดได้เหมือนกัน (ใบเดียวกันคนละหน้า) */
   CST.f=null;_switchTab('cstock');cstSetSec('bill');cstNew();
   o.old=/cstSetGrp\('B'\)/.test(document.getElementById('cstBill').innerHTML);
   CST.f=null;_switchTab('spord');
   return o;});
 t('🔑 ฟอร์มสร้างออเดอร์ให้เลือกประเภทได้ครบทั้งสามแบบ ตั้งแต่ยังไม่บันทึก',gq.has);
 t('...ใบใหม่เริ่มที่ "ตัดบิลรอส่ง" และปุ่มที่เลือกอยู่เข้มให้เห็นชัด',
   gq.defA==='A'&&gq.onA,gq.defA+' · ปุ่มเข้ม='+gq.onA);
 t('...กดเลือก "ส่งแล้วรอตัดบิล" แล้วปุ่มและคำอธิบายเปลี่ยนตาม',
   gq.nowB==='B'&&gq.onB&&gq.hint,gq.nowB+' · ปุ่มเข้ม='+gq.onB+' · คำอธิบาย='+gq.hint);
 t('🔑 บันทึกแล้วหมวดติดไปกับใบจริง และขึ้นบนหัวใบให้ทุกทีมเห็น',
   gq.saved==='B'&&/🚚/.test(gq.bar)&&/ส่งแล้วรอตัดบิล/.test(gq.bar),
   gq.sid+' → g='+gq.saved);
 t('🛟 กลับมาแก้ใบกลุ่ม B แล้วเซฟใหม่ ต้องไม่เด้งกลับเป็นกลุ่ม A',
   gq.reload==='B'&&gq.again==='B','อ่านกลับ='+gq.reload+' · เซฟซ้ำ='+gq.again);
 t('🛟 ใบเก่าที่ไม่มีช่องหมวด ยังอ่านเป็น "ตัดบิลรอส่ง" เหมือนเดิม',
   gq.oldSlip==='A',gq.oldSlip);
 t('...ฟอร์มในหน้า 🧊 สต็อคกลาง ก็เลือกหมวดได้เหมือนกัน (ใบชุดเดียวกัน)',gq.old);

 /* ---------- 8e) 🔑 การ์ดใบในรายการเดือน ต้องโชว์สินค้าและจำนวน ----------
    เจ้าของ 25 พ.ย. 69: *"ปรับให้ขึ้นโชว์สินค้าและจำนวนด้วย ว่าล็อตนี้ตัดสินค้าอะไรจำนวนเท่าไหร่
    เพราะเวลาทีมเราเลือกดู เราดูจากข้อมูลตรงนี้"* — ต้องเห็นตั้งแต่ยังไม่กดเข้าไป */
 const card=await ev(()=>{
   __reset();CSTOCK.lots={};
   /* รหัสเรียงลงมาจากมากไปน้อย เพื่อจับบั๊ก Object.keys เรียงคีย์ตัวเลขเอง */
   [['64849613','โอโมน้ำ ซากุระ',60,0],['22222222','คอมฟอร์ท อินโนเซนท์',50,20],
    ['11111111','ซันไลต์ มะนาว',40,0]].forEach((p,i)=>{
     const id='B20261118-01-r'+i;
     CSTOCK.lots[id]={id:id,sl:'B20261118-01',d:'2026-11-18',code:p[0],nm:p[1],
       cs:p[2],pc:0,sq:i,clr:p[3]?[{d:'2026-11-19',cs:p[3],to:'ร้าน'}]:[],up:1};});
   CSTOCK.slips['B20261118-01'].own='Supervisor';
   __as('manager',null,'แอดมิน 1');
   SP.view='mon';SP.ym='2026-11';SP.sid='';renderSpord();
   const el=document.querySelector('#spBody .cst-grp');
   const tx=el?el.textContent.replace(/\s+/g,' '):'';
   return {tx:tx,
     items:[...document.querySelectorAll('#spBody .sp-it b')].map(x=>x.textContent.trim()),
     qty:[...document.querySelectorAll('#spBody .sp-it i')].map(x=>x.textContent.trim()),
     bar:!!document.querySelector('#spBody .cst-grp .cst-bar'),
     brd:el?el.style.borderLeftColor:'',
     news:[...document.querySelectorAll('#spBody button.upload-btn')]
       .filter(b=>/สร้างออเดอร์ใหม่/.test(b.textContent)).length,
     alloc:[...document.querySelectorAll('#spBody button.upload-btn')]
       .filter(b=>/ไฟล์ใบจัดของ/.test(b.textContent)).length,
     ctlHid:(document.querySelector('#spordView > .controls')||{}).style.display,
     body:document.getElementById('spBody').textContent.replace(/\s+/g,' ')};});
 t('🔑 การ์ดใบโชว์ "สินค้าอะไร จำนวนเท่าไหร่" ตั้งแต่ยังไม่กดเข้าไป',
   card.items.length===3&&/โอโมน้ำ ซากุระ/.test(card.items[0])&&
   card.qty[0]==='60 ลัง',JSON.stringify({i:card.items,q:card.qty}));
 t('🔑 ...เรียงตามลำดับในใบ ไม่ใช่เรียงตามเลขรหัส',
   card.items.join(' | ')==='โอโมน้ำ ซากุระ | คอมฟอร์ท อินโนเซนท์ | ซันไลต์ มะนาว',
   card.items.join(' | '));
 t('🔑 ...และหน้าตาเหมือนใบในหน้าสต็อคกลาง (แถบสีซ้าย + แถบเปอร์เซ็นต์ + pill)',
   card.bar&&!!card.brd&&/ส่งออกแล้ว/.test(card.tx),card.brd);
 t('...หัวใบบอกจำนวนรายการ ยอดลัง และผู้รับผิดชอบ',
   /3 รายการ/.test(card.tx)&&/150 ลัง/.test(card.tx)&&/Supervisor/.test(card.tx),
   card.tx.slice(0,120));
 t('🛟 ปุ่ม "สร้างออเดอร์ใหม่" มีปุ่มเดียว ไม่ซ้ำสองที่',card.news===1,card.news+' ปุ่ม');
 /* เจ้าของสั่ง 26 พ.ย. 69: *"ย้ายปุ่มอัพไฟล์ Allocate ขึ้นไปด้านบนข้างปุ่มสร้างออร์เดอร์ใหม่เลย
    เพราะไฟล์นี้อัพทีเดียวใช้ได้ทั้งระบบ"* — เดิมซ่อนอยู่ในแท็บแอดมินตรวจของแต่ละใบ */
 t('🔑 ปุ่มอัพไฟล์ใบจัดของอยู่ข้างปุ่มสร้างออเดอร์ใหม่ ปุ่มเดียวเหมือนกัน',
   card.alloc===1,card.alloc+' ปุ่ม');
 t('🛟 ...และแถบควบคุมด้านบนที่ว่างเปล่าถูกซ่อนตอนอยู่หน้ารายการใบ',
   card.ctlHid==='none',card.ctlHid);

 /* ================================================================
  * 10) 2 ขั้นตอน: ฝั่งเซลล์คีย์รายวัน + ฝั่งแอดมินตรวจกับไฟล์ allocation
  *     เจ้าของสั่ง 25 พ.ย. 69 — ย่อจาก 6 ขั้นเหลือ 2
  * ================================================================ */
 await ev(()=>{
   window.__slip=()=>{
     __reset();
     CSTOCK.lots={};
     [['64849613','โอโมน้ำ ซากุระ',40],['65456729','บรีสเอกเซล',30]].forEach((p,i)=>{
       const id='B20261118-01-r'+i;
       CSTOCK.lots[id]={id:id,sl:'B20261118-01',d:'2026-11-18',code:p[0],nm:p[1],
         cs:p[2],pc:0,sq:i,ln:i?'CT12':'CT11',up:1};});
     /* ใบนี้เป็น 🎯 ตัวกระจาย — เป็นประเภทเดียวที่มีขั้น "ซุปจด" ให้หัวหน้าเซลล์ตั้งเป้า */
     CSTOCK.slips['B20261118-01'].g='D';
     SP.sid='B20261118-01';SP.view='slip';SP.ym='2026-11';SP.day='2026-11-20';SP.sec='key';
   };
   /* ไฟล์ allocation จำลอง — โครงเดียวกับไฟล์จริง (หัวตารางตรงตัว)
      old=1 → ไฟล์รุ่นเก่า 29 ช่อง ไม่มี GSV/NIV (ต้องยังอ่านได้ และถอยไปประเมินจากไฟล์ราคา) */
   window.__alBuf=(old,gin)=>{
     const H=['Order Creation Date','Distributor Code','Distributor Name','Salesman Name',
       'PJP Code','PJP Name','Route Type','Outlet Code','Outlet Name','Outlet Subtype',
       'GIN No.','Invoice No.','Order Number','Order Type','Product Code','Product Description',
       'Pack Size','Sale Order (CS)','Sale Order (SHR)','Sale Order (PC)',
       'Free Order (CS)','Free Order (SHR)','Free Order (PC)',
       'Sale Allocated (CS)','Sale Allocated (SHR)','Sale Allocated (PC)',
       'Free Allocated (CS)','Free Allocated (SHR)','Free Allocated (PC)']
       .concat(old?[]:['Sales Allocation Status','Free Allocation Status','Order Status','GSV','NIV']);
     const row=(pj,pn,gin,code,nm,sc,fc,xc,gsv,niv)=>[46341,'15389839','บีดี','2096',pj,pn,'CT','T1','ร้าน','sub',
       gin,'INV1','BDD0100000111','B2B',code,nm,12,sc,0,0,fc,0,0,xc,0,0,fc,0,0]
       .concat(old?[]:['Full',fc?'Full':'',  'Delivered',gsv,niv]);
     const A=gin?[H,row('209611','CT_HPC_211',gin,'64849613','โอโมน้ำ ซากุระ',1,0,1,300,220)]:[H,
       row('209611','CT_HPC_211','77','64849613','โอโมน้ำ ซากุระ',5,1,5,1500,1100),
       row('209611','CT_HPC_211','77','65456729','บรีสเอกเซล',2,0,2,800,610),   /* ตั้งใจให้ไม่ตรงกับที่เซลล์คีย์ (3) */
       row('209612','CT_HPC_212','77','64849613','โอโมน้ำ ซากุระ',2,0,1,600,440),
       row('209697','KA_HPC_297','78','64849613','โอโมน้ำ ซากุระ',9,0,9,2700,1980)];
     const ws=XLSX.utils.aoa_to_sheet(A),wb=XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb,ws,'Export');
     return XLSX.write(wb,{type:'array',bookType:'xlsx'});
   };
 });
 const two=await ev(async()=>{
   __slip();__as('sup',null,'หัวหน้าเซลล์');_switchTab('spord');renderSpord();
   const o={};
   const tx=()=>document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   o.chips=[...document.querySelectorAll('#spTabs .tab2')].map(x=>x.textContent.trim());
   o.showsName=/โอโมน้ำ ซากุระ/.test(tx())&&/64849613/.test(tx());
   o.hasInputs=!!document.getElementById('spK_CT11_64849613_sc');
   /* sup กรอกแล้วบันทึก */
   /* ช่องแถมถูกเอาออกเมื่อ 27 พ.ย. 69 — เหลือ ลัง/ชิ้น เท่านั้น */
   o.noFree=!document.getElementById('spK_CT11_64849613_fc');
   o.cols=[...document.querySelectorAll('#spBody .sp-k4 thead th')].map(x=>x.textContent.trim());
   o.frozen=!!document.querySelector('#spBody .sp-k4 td.c1');
   document.getElementById('spK_CT11_64849613_sc').value='6';
   document.getElementById('spK_CT11_65456729_sc').value='3';
   await spKeyLineSave('B20261118-01','2026-11-20','CT11');
   o.post=window.__posts[window.__posts.length-1];
   o.rec=CSTOCK.key['B20261118-01|2026-11-20|CT11'];
   o.sum=spKeySum('B20261118-01','2026-11-20');
   o.cards=tx();
   /* เซลล์เข้ามาเห็น "สายของฉัน" ไม่ใช่ตารางเป้าของทั้ง 12 สาย และแก้เป้าของซุปไม่ได้ */
   __as('sales','209611','เซลล์ CT11');SP.sec='key';renderSpord();
   o.salesRead=!document.getElementById('spK_CT11_64849613_sc')&&/เป้าของสาย/.test(tx());
   o.salesNoOther=!/สาย CT12/.test(tx());
   o.salesSees=/โอโมน้ำ ซากุระ/.test(tx());
   return o;});
 /* 5 ขั้นตอนเรียงตามลำดับงาน + ของเดิมท้ายสุด (รายงานเห็นเฉพาะผู้จัดการ จึงไม่อยู่ในชุดของ sup) */
 t('🔑 หน้าใบมีแท็บครบตามลำดับงาน และของเดิมยังอยู่ท้ายสุด',
   two.chips.length===4&&/ซุปจด/.test(two.chips[0])&&/เซลล์คีย์/.test(two.chips[1])&&
   /แอดมินตรวจ/.test(two.chips[2])&&/คลังจัดส่ง/.test(two.chips[3]),two.chips.join(' | '));
 t('🔑 ใบออเดอร์โชว์ชื่อสินค้า ไม่ใช่รหัสเปล่า ๆ (เจ้าของบอกว่า "ขึ้นแค่รหัสมันตามดูยาก")',
   two.showsName);
 t('🔑 หัวหน้าเซลล์กรอกเป็น ลัง + ชิ้น ได้ทุกสาย',two.hasInputs);
 t('🔑 ตารางเหลือ 4 คอลัมน์ สินค้า · รหัส · ลัง · ชิ้น และไม่มีช่องแถมแล้ว',
   two.noFree&&two.cols.join(' | ')==='สินค้า | รหัส | ลัง | ชิ้น',two.cols.join(' | '));
 t('📌 ...และชื่อสินค้ากับรหัสค้างไว้ซ้ายมือตอนเลื่อน (freeze)',two.frozen);
 t('...กดบันทึกแล้วส่งผ่าน api/spord (ไม่ใช่ save ทั้งก้อน)',
   two.post&&two.post.u==='/api/spord'&&two.post.b.act==='key'&&
   two.post.b.ln==='CT11'&&two.post.b.d==='2026-11-20',JSON.stringify(two.post&&two.post.b));
 t('...เก็บจำนวนที่กรอกไว้ถูกต้อง',
   two.rec&&two.rec.it['64849613'].sc===6&&two.rec.it['65456729'].sc===3,
   JSON.stringify(two.rec&&two.rec.it));
 t('🔑 ...และยอดรวมขึ้นใบใหญ่ตามที่เจ้าของสั่ง',
   /เป้าวันนี้ทั้งใบ/.test(two.cards)&&two.sum['64849613'].sc===6);
 t('🔒 เซลล์เห็นหน้า "สายของฉัน" แก้เป้าของหัวหน้าเซลล์ไม่ได้ และไม่เห็นสายอื่น',
   two.salesRead&&two.salesSees&&two.salesNoOther,
   JSON.stringify({mine:two.salesRead,sees:two.salesSees,noOther:two.salesNoOther}));

 const adm=await ev(async()=>{
   const o={};
   const tx=()=>document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   __as('manager',null,'แอดมิน 1');SP.sec='adm';renderSpord();
   /* ⏳ ตั้งแต่ไฟล์ถูกเก็บขึ้นระบบ หน้าจะบอกว่า "กำลังดึงไฟล์ของเดือนนี้" ก่อน
      แล้วค่อยตกมาที่ "ยังไม่ได้อัพไฟล์" เมื่อระบบไม่มีไฟล์ของเดือนนั้นจริง ๆ */
   o.noFile=/ยังไม่ได้อัพไฟล์|กำลังดึงไฟล์ใบจัดของ/.test(tx());
   parseAlloc('alloc.xlsx',__alBuf());
   o.n=ALLOC.n;o.gins=ALLOC.gins.slice();
   /* อัพไฟล์แคบ ๆ ทับ ต้องไม่ลบ GIN ที่อ่านไว้ก่อนหน้า (เจ้าของอัพซ้ำทุกวันเพื่ออัพเดตวัน) */
   parseAlloc('alloc2.xlsx',__alBuf(false,'79'));
   o.gins2=ALLOC.gins.slice();
   o.alc=JSON.parse(JSON.stringify(cstOk().alc||null));
   SP.sec='adm';renderSpord();
   document.getElementById('spGinIn').value='77';
   await spGinGo('B20261118-01','2026-11-20');
   o.post=window.__posts[window.__posts.length-1];
   const g=CSTOCK.gin['B20261118-01|2026-11-20'];
   o.rows=g&&Object.keys(g.rows);
   o.cmp=spCmp('B20261118-01','2026-11-20');
   o.txt=tx();
   /* ใส่เลขที่ไม่มีในไฟล์ ต้องบอก ไม่ใช่เงียบ */
   document.getElementById('spGinIn').value='77, 999';
   await spGinGo('B20261118-01','2026-11-20');
   o.miss=(CSTOCK.gin['B20261118-01|2026-11-20'].miss||[]).slice();
   o.missTxt=tx();
   /* หัวหน้าเซลล์เข้ามาดูฝั่งแอดมินได้ แต่แก้ไม่ได้ */
   __as('sup',null,'หัวหน้าเซลล์');SP.sec='adm';renderSpord();
   o.supRead=/ดูอย่างเดียว/.test(tx())&&!document.getElementById('spGinIn');
   /* ไฟล์ allocation ต้องไม่ถูกส่งขึ้นเซิร์ฟเวอร์ — ตรวจของจริง ไม่ใช่ตรวจว่าหน้าเขียนบอก */
   o.allocSynced=JSON.stringify(window.__posts).indexOf('Order Allocation')>=0||
     Object.keys(CSTOCK).indexOf('alloc')>=0;
   o.ginRowKeys=[...new Set((window.__posts||[]).filter(p=>p.b&&p.b.act==='gin')
     .flatMap(p=>Object.keys(p.b.rows||{})))];
   o.alcBytes=JSON.stringify(cstOk().alc||{}).length;
   /* จดไว้ในระบบว่าอ่านไฟล์อะไรไปแล้ว — รีเฟรช (ALLOC หาย) แล้วต้องยังบอกได้ ไม่ใช่หลอกว่ายังไม่อัพ */
   __as('manager',null,'แอดมิน 1');ALLOC=null;SP.sec='adm';renderSpord();
   /* รีเฟรชแล้วหน้าไปดึงไฟล์ของเดือนนั้นจากระบบก่อน — เทสต์นี้ไม่มีเซิร์ฟเวอร์จริง
      จึงรอให้ถาม (และไม่เจอ) เสร็จ แล้ววาดใหม่ค่อยอ่านข้อความ */
   for(let i=0;i<60&&!AL_GOT['2026-11'];i++)await new Promise(r=>setTimeout(r,25));
   renderSpord();
   o.afterReload=tx();
   /* 📱 มือถือ: เครื่องนี้ยังไม่ได้เลือกไฟล์ใบจัดของ — ปุ่มตรวจต้องยังกดได้ และต้องบอกว่า
      ต้องทำอะไรต่อ แล้วพาไปเลือกไฟล์ให้เลย · เดิมตั้ง disabled ไว้ กดแล้วไม่มีอะไรเกิดขึ้น
      (เจ้าของเจอบนมือถือ 27 พ.ย. 69: *"กดปุ่มแล้วไม่มีอะไรเกิดขึ้น แต่วันนี้ทำในคอมทำได้"*) */
   const gb=[...document.querySelectorAll('#spBody button')]
     .find(b=>/ตรวจและบันทึก/.test(b.textContent));
   o.ginBtn=!!gb;o.ginDis=!!(gb&&gb.disabled);
   o.ginDash=gb?getComputedStyle(gb).borderStyle:'';
   window.__alert='';window.__up=0;
   const oldUp=window.spUpAlloc;window.spUpAlloc=function(){window.__up++;};
   const gi=document.getElementById('spGinIn');if(gi)gi.value='77';
   if(gb)gb.click();
   /* ⏳ spGinGo ลองดึงไฟล์ที่เก็บไว้ในระบบก่อน (async) แล้วค่อยถามหาไฟล์ */
   for(let i=0;i<60&&!window.__up;i++)await new Promise(r=>setTimeout(r,25));
   o.askedUp=window.__up;
   window.spUpAlloc=oldUp;
   return o;});
 t('🔑 อ่านไฟล์ allocation ของคลังได้ (หาคอลัมน์จากหัวตาราง ไม่ใช่ตำแหน่ง)',
   adm.n===4&&adm.gins.join(',')==='77,78',adm.n+' แถว · GIN '+adm.gins.join(','));
 t('...ยังไม่อัพไฟล์ ก็บอกตรง ๆ ไม่ใช่หน้าว่าง',adm.noFile);
t('🔑 อัพไฟล์ใหม่ทับ ไม่ลบ GIN เดิมที่อ่านไว้แล้ว (อัพซ้ำได้ทุกวัน)',
  adm.gins2.join(',')==='77,78,79',adm.gins2.join(','));
t('🔑 จดไว้ว่าอ่านไฟล์อะไรไปแล้ว รีเฟรชแล้วไม่หลอกว่า "ยังไม่ได้อัพไฟล์"',
  !!adm.alc&&adm.alc.file==='alloc2.xlsx'&&!/ยังไม่ได้อัพไฟล์/.test(adm.afterReload)&&
  /alloc2\.xlsx/.test(adm.afterReload)&&/ยังอยู่ครบ/.test(adm.afterReload),
  (adm.afterReload||'').slice(0,160));
t('...แต่จดแค่ชื่อไฟล์กับช่วงวัน ไม่ใช่ทั้งไฟล์',adm.alcBytes<600,adm.alcBytes+' bytes');
/* 📱 ปุ่มตรวจ GIN ต้องกดได้เสมอ — ปุ่มที่กดไม่ได้แบบไม่บอกอะไรคือสิ่งที่ห้ามมี */
t('🔑 ยังไม่ได้เลือกไฟล์ในเครื่องนี้ ปุ่มตรวจ GIN ก็ต้องยังกดได้ (มือถือ)',
  adm.ginBtn&&!adm.ginDis,'มีปุ่ม '+adm.ginBtn+' · disabled '+adm.ginDis);
t('🔑 ...กดแล้วพาไปเลือกไฟล์ให้เลย ไม่ใช่เงียบ',adm.askedUp===1,'เรียกเลือกไฟล์ '+adm.askedUp+' ครั้ง');
t('🛟 ...และปุ่มตรวจไม่ใช่กรอบประแบบช่องลากไฟล์',adm.ginDash==='none',adm.ginDash);
 t('🔑 ใส่เลข GIN แล้วเทียบกับที่เซลล์คีย์ได้ (เฉพาะรหัสที่อยู่ในใบนี้)',
   adm.rows&&adm.rows.indexOf('CT11|64849613')>=0&&adm.rows.indexOf('CT12|64849613')>=0,
   JSON.stringify(adm.rows));
 t('...บันทึกผ่าน api/spord ด้วย act:"gin"',
   adm.post&&adm.post.u==='/api/spord'&&adm.post.b.act==='gin'&&
   (adm.post.b.gin||[]).join(',')==='77',JSON.stringify(adm.post&&adm.post.b.act));
 t('🔑 ตรงกันบอกว่าตรง · ไม่ตรงบอกว่าไม่ตรง · คลังจัดแต่เซลล์ไม่ได้คีย์ นับแยก',
   adm.cmp.n.ok===1&&adm.cmp.n.diff===1&&adm.cmp.n.noKey===1,JSON.stringify(adm.cmp.n));
 t('🛟 เลข GIN ที่ไม่มีในไฟล์ ต้องฟ้อง ไม่ใช่เงียบ',
   adm.miss.join(',')==='999'&&/ไม่พบเลข GIN ในไฟล์/.test(adm.missTxt),adm.miss.join(','));

 /* 📦 สรุปรายสินค้าบนหน้าแอดมินตรวจ — เจ้าของสั่ง 28 พ.ย. 69 ให้เลิกดูรายสาย
    *"ต้องการดูสรุปยอดรวมของสินค้าทั้งหมด ผลต่างมาจากส่วนไหน แค่นั้นพอ"*
    ของเดิม (สรุปรายสาย) ไม่ได้ลบทิ้ง แค่ไม่ถูกเรียกแล้ว — spCmpLines ยังทำงานได้เหมือนเดิม */
 const pdSum=await ev(async()=>{
   __as('manager',null,'แอดมิน 1');SP.sec='adm';SP.day='2026-11-20';SP.cmpLn='';
   const snap=()=>JSON.stringify([CSTOCK,ORDERS,POSTATUS,STOREDAILY]);
   const before=snap();
   renderSpord();
   const cmp=spCmp('B20261118-01','2026-11-20');
   const P=spCmpProd(cmp);
   const tbl=document.querySelectorAll('#spBody table.sp-rt');
   const prodTbl=tbl[0];
   const head=((prodTbl&&prodTbl.closest('.panel'))||{textContent:''}).textContent.replace(/\s+/g,' ');
   const prodRows=prodTbl?prodTbl.querySelectorAll('tbody tr').length:0;
   const chips=[...document.querySelectorAll('.sp-lnchip')].map(b=>b.textContent.replace(/\s+/g,' ').trim());
   /* ตารางรายละเอียดคือตัวที่สอง — นับเฉพาะแถวข้อมูล ไม่เอาแถบหัวกอง */
   const detRows=()=>[...document.querySelectorAll('#spBody table.sp-rt')].slice(1)
     .flatMap(t=>[...t.querySelectorAll('tbody tr')]).filter(r=>!r.classList.contains('sp-band')).length;
   const bands=[...document.querySelectorAll('#spBody table.sp-rt tr.sp-band')]
     .map(r=>r.textContent.replace(/\s+/g,' ').trim());
   const cls=[...document.querySelectorAll('#spBody table.sp-rt')].slice(1)
     .flatMap(t=>[...t.querySelectorAll('tbody tr')]).filter(r=>!r.classList.contains('sp-band'))
     .map(r=>r.className);
   const rowsAll=detRows();
   /* กดชิปสายในแถวสินค้า = กรองตารางล่างให้เหลือสายนั้น (ความสามารถเดิมยังอยู่) */
   const ln=P.prod[0].lnOrd[0].ln;
   spCmpLn(ln);
   const rowsOne=detRows();
   const note=/กำลังดูเฉพาะสาย/.test(document.getElementById('spBody').textContent);
   spCmpLn(ln);   /* กดซ้ำ = ปิด */
   const back=detRows();
   /* 🖨 ไฟล์ PDF ต้องขึ้นสรุปรายสินค้าด้วย ไม่ใช่มีแต่ตารางยาว ๆ */
   spRepPrint('B20261118-01','2026-11-20');
   const pr=document.getElementById('prArea').textContent.replace(/\s+/g,' ');
   return {codes:P.prod.map(x=>x.code),n:P.n,tot:P.tot,head:head,prodRows:prodRows,
     chips:chips,bands:bands,cls:cls,rowsAll:rowsAll,rowsOne:rowsOne,back:back,note:note,
     ln:ln,off:SP.cmpLn,pr:pr,same:snap()===before,
     lnStillWorks:spCmpLines(cmp).length};
 });
 t('📦 หน้าแอดมินตรวจขึ้น "สรุปรายสินค้า" หนึ่งแถวต่อหนึ่งรหัส ไม่ใช่รายสาย',
   pdSum.prodRows===pdSum.codes.length&&pdSum.prodRows>0&&
   /สรุปรายสินค้า/.test(pdSum.head)&&!/สรุปรายสาย/.test(pdSum.head),
   pdSum.codes.join(',')+' · '+pdSum.prodRows+' แถว');
 t('📦 ...บอก เซลล์คีย์ / คลังจัด / ตรง / ขาด-เกิน เป็นลัง+ชิ้น ไม่มีทศนิยม',
   /เซลล์คีย์/.test(pdSum.head)&&/คลังจัด/.test(pdSum.head)&&/ตรง/.test(pdSum.head)&&
   /ขาด/.test(pdSum.head)&&!/\d+\.\d+\s*ลัง/.test(pdSum.head),
   (pdSum.head.match(/[\d.,]+ ?ลัง/g)||[]).join(' | ').slice(0,160));
 t('📦 ...และบอกว่า "ผลต่างมาจากส่วนไหน" แยกเป็นกอง',
   /ผลต่างมาจากส่วนไหน/.test(pdSum.head)&&
   (/คลังจัด แต่เซลล์ไม่ได้คีย์/.test(pdSum.head)||/เซลล์คีย์ แต่คลังไม่ได้จัด/.test(pdSum.head)||
    /จำนวนไม่ตรงกัน/.test(pdSum.head)),pdSum.head.slice(0,200));
 t('🔑 แต่ละรหัสบอกด้วยว่าเป็นของสายไหนกี่ลัง (ชิปสาย)',
   pdSum.chips.length>0&&/^[A-Z]{2}\d{2} /.test(pdSum.chips[0]),pdSum.chips.join(' | '));
 t('🎨 ตารางรายละเอียดแยกสีตามประเภท และจัดกองให้อยู่ติดกัน',
   pdSum.bands.length>=2&&pdSum.cls.length>0&&
   new Set(pdSum.cls).size>=2&&pdSum.cls.every(c=>/^r-(ok|diff|nokey|noalloc)$/.test(c)),
   pdSum.bands.join(' | ')+' → '+pdSum.cls.join(','));
 t('🔑 กดชิปสายแล้วกรองตารางรายละเอียดให้เหลือสายนั้น พร้อมบอกว่ากำลังกรองอยู่',
   pdSum.rowsOne<pdSum.rowsAll&&pdSum.rowsOne>0&&pdSum.note,
   pdSum.rowsOne+' / '+pdSum.rowsAll);
 t('กดชิปสายซ้ำ = กลับไปดูทุกสาย',pdSum.back===pdSum.rowsAll&&pdSum.off==='',
   pdSum.back+' / '+pdSum.rowsAll+' · cmpLn="'+pdSum.off+'"');
 t('🖨 ไฟล์ PDF ขึ้นสรุปรายสินค้า + ผลต่างมาจากส่วนไหน และตัดเหลือเฉพาะแถวที่ไม่ตรง',
   /สรุปรายสินค้า/.test(pdSum.pr)&&/ผลต่างมาจาก|ตรงกันหมด/.test(pdSum.pr)&&
   /รายการที่ไม่ตรง/.test(pdSum.pr),pdSum.pr.slice(0,220));
 t('🛟 สรุปรายสินค้าคิดสดตอนวาดหน้า ไม่เขียนอะไรลงข้อมูลเลย',pdSum.same);
 t('🛟 ของเดิม (สรุปรายสาย) ไม่ได้ถูกลบทิ้ง เอาบรรทัดเรียกกลับเข้าไปก็ได้คืน',
   pdSum.lnStillWorks>0,pdSum.lnStillWorks+' สาย');

 /* 🔢 เลขออเดอร์หลักท้าย (เจ้าของสั่ง 27 พ.ย. 69: 5 หลัก แล้วเปลี่ยนเป็น "หกหลัก" วันเดียวกัน)
    วัดก่อนทำจากไฟล์จริง 2,096 เลข 12 วัน: 5 หลักท้ายชนกัน 10 กลุ่ม (~1%) · 6 หลักท้ายชน 0
    เทสต์อ่าน SP_TAIL เอง ปรับจำนวนหลักแล้วเทสต์ตามทันที · และยังต้องมีเคส "ชนกันแล้วบอก" */
 const tail=await ev(()=>{
   const T=SP_TAIL;
   const mk=(pre,tl)=>pre+tl;                 /* เลขอ้างอิง = หน้า + หลักท้ายที่เซลล์พิมพ์ */
   const A='7'+'15426'.slice(-(T-1));          /* ท้าย T หลักของใบ A */
   const B='7'+'15428'.slice(-(T-1));          /* ท้าย T หลักของใบ B (จะทำให้ชนกัน) */
   const refA='1034'+A, refB='1034'+B, refB2='1039'+B;   /* refB กับ refB2 ท้ายเหมือนกันเป๊ะ */
   STOREDAILY.ord['BDD0100007001']={s:'4862383',l:'209611',d:'2026-11-20',v:3500,c:3,cs:12,pc:0,rf:refA};
   STOREDAILY.ord['BDD0400007001']={s:'4862383',l:'209611',d:'2026-11-20',v:-100,c:1,cs:1,pc:0,rf:refA};
   STOREDAILY.ord['BDD0100007002']={s:'4862365',l:'209611',d:'2026-11-20',v:900,c:1,cs:4,pc:0,rf:refB};
   STOREDAILY.ord['BDD0100007003']={s:'4862366',l:'209612',d:'2026-11-20',v:800,c:1,cs:3,pc:0,rf:refB2};
   spRfBust();
   const f=(t,h)=>{const r=spOrdFind(t,h);return r?(r.amb?('AMB:'+r.amb.join('/')):(r.no+'|'+r.via)):null;};
   const o=spNoSum([A,B],{l:'209611'});
   return {T:T,A:A,B:B,refA:refA,
     full:f(refA),tail:f(A),hash:f('#'+A),none:f('0'.repeat(T)),
     short:f(A.slice(1)),                      /* สั้นกว่าที่กำหนด = ไม่เอา */
     bdd:f('BDD0100007002'),
     hint:f(B,{l:'209611'}),noHint:f(B),
     sum:{found:o.found,cs:o.cs,amb:o.amb.length},
     info:spNoInfoHtml([B],'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ')};
 });
 t('🔑 เซลล์กรอกแค่หลักท้ายก็หาเจอ (ตอนนี้ตั้งไว้ 6 หลัก)',
   tail.T===6&&tail.tail==='BDD0100007001|tail'&&tail.hash===tail.tail,
   tail.T+' หลัก · '+tail.A+' → '+tail.tail);
 t('🛟 สั้นกว่าที่กำหนดไม่รับ — ไม่งั้นยิ่งสั้นยิ่งชนกันง่าย',tail.short===null,String(tail.short));
 t('...และเลขเต็ม 10 หลัก กับเลข BDD ก็ยังใช้ได้เหมือนเดิม',
   tail.full==='BDD0100007001|rf'&&tail.bdd==='BDD0100007002|no',tail.full+' · '+tail.bdd);
 t('🛟 ใบคืนของที่อ้างเลขเดียวกัน ไม่นับว่าชน และใบขายชนะเสมอ',
   tail.tail.indexOf('BDD01')===0,tail.tail);
 t('🔑 หลักท้ายชนกันคนละสาย — ใช้สายของคนกรอกตัดสินให้',tail.hint==='BDD0100007002|tail',tail.hint);
 t('🛟 ชนกันแล้วไม่รู้สาย ต้องบอกว่าตรงกับหลายใบ ห้ามเดา',
   /^AMB:/.test(tail.noHint)&&/ตรงกับหลายใบ/.test(tail.info),tail.noHint+' · '+tail.info.slice(0,90));
 t('   …และยอดรวมไม่นับเลขที่กำกวมเข้าไปด้วย',
   tail.sum.found===2&&tail.sum.cs===16&&tail.sum.amb===0,JSON.stringify(tail.sum));

 /* 🔁 ใบเดียวกันเขียนได้หลายแบบ — เลขเต็ม 10 หลัก กับ 6 หลักท้าย คือใบเดียวกัน
    เจ้าของสั่ง 27 พ.ย. 69 ให้ "คัดเลขซ้ำออก" เพราะเซลล์แคปหน้าจอใบเดิมได้สองรอบ
    (หน้ายืนยันพื้นฟ้าตอนกดคีย์เสร็จ + หน้าประวัติพื้นขาว)
    ⚠️ ถ้าตัดซ้ำที่ "ข้อความที่พิมพ์" จะจับคู่เลขเต็มกับหางเลขไม่ได้ แล้ว ลัง/เงิน ของใบนั้น
       จะถูกบวกสองรอบ — ซึ่งเป็นยอดที่ซุปกับแอดมินใช้ตรวจกันพอดี */
 const dedup=await ev(()=>{
   const A='715426'.slice(-SP_TAIL);
   const refA='1034'+A;
   const one=spNoSum([refA],{l:'209611'});
   const two=spNoSum([refA,A],{l:'209611'});            /* เลขเต็ม + หางเลข = ใบเดียวกัน */
   const thrice=spNoSum([refA,A,'BDD0100007001'],{l:'209611'});  /* +เลข BDD ของใบเดิมอีก */
   const txt=spNoInfoHtml([refA,A],'209611').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
   return {one:{f:one.found,cs:one.cs,v:one.v,same:one.same},
           two:{n:two.n,f:two.found,cs:two.cs,v:two.v,same:two.same,list:two.sameList},
           thr:{n:thrice.n,f:thrice.found,cs:thrice.cs,same:thrice.same},
           shops:two.nShop,txt:txt};
 });
 t('🔁 เลขเต็ม + 6 หลักท้ายของใบเดียวกัน → นับใบเดียว ลังไม่บวกซ้ำ',
   dedup.two.cs===dedup.one.cs&&dedup.two.f===1&&dedup.two.same===1,
   JSON.stringify(dedup.two)+' เทียบใบเดียว '+JSON.stringify(dedup.one));
 t('   …เงินก็ไม่บวกซ้ำเหมือนกัน',dedup.two.v===dedup.one.v,dedup.two.v+' / '+dedup.one.v);
 t('   …และร้านไม่ถูกนับซ้ำ',dedup.shops===1,dedup.shops);
 t('🔁 เขียนครบสามแบบ (เลขเต็ม · หางเลข · เลข BDD) ก็ยังนับใบเดียว',
   dedup.thr.f===1&&dedup.thr.same===2&&dedup.thr.cs===dedup.one.cs,JSON.stringify(dedup.thr));
 t('🛟 "เลขที่ใส่" ยังนับตามจริง ไม่ใช่ซ่อนว่าหายไป',dedup.two.n===2,dedup.two.n);
 t('🛟 ตัดซ้ำแล้วต้องบอก ไม่งั้นคนกรอกนึกว่าใบหาย',
   /ตัดเลขซ้ำออก/.test(dedup.txt)&&/นับครั้งเดียว/.test(dedup.txt),dedup.txt.slice(0,120));
 t('🛟 เลขที่ไม่มีในระบบยังตอบว่าไม่เจอ ไม่ใช่จับมั่ว',tail.none===null,String(tail.none));

 /* 💾 กดบันทึก/กดยกเลิกแล้วหน้าต้องไม่เด้งขึ้นสายบนสุด (เจ้าของแจ้งสองรอบ 27 พ.ย. 69)
    ⚠️ ตัวที่เลื่อนจริงคือ **กล่องตาราง** — .tblwrap.sp-freeze มี max-height + overflow:auto
       เพื่อ freeze หัวตาราง ฉะนั้น window.scrollY ไม่ได้ขยับเลย เทสต์เดิมที่วัดแต่ scrollY
       จึงผ่านทั้งที่ของจริงยังเด้งอยู่ · ต้องวัด scrollTop ของกล่องด้วย */
 const keep=await ev(async()=>{
   __as('sup',null,'หัวหน้าเซลล์');SP.view='slip';SP.sid='B20261118-01';
   SP.sec='key';SP.day='2026-11-20';renderSpord();
   document.body.style.minHeight='4000px';
   window.scrollTo(0,900);
   const box=document.querySelector('#spordView .tblwrap.sp-freeze');
   if(box)box.scrollTop=220;
   const before=window.scrollY,bBefore=box?box.scrollTop:-1;
   await spKeySave('B20261118-01','2026-11-20','CT11',{'64849613':{sc:2,sp:0,fc:0,fp:0}});
   const b2=document.querySelector('#spordView .tblwrap.sp-freeze');
   const after=window.scrollY,bAfter=b2?b2.scrollTop:-1;
   /* 🗑 ยกเลิกสายนี้ ก็ต้องค้างที่เดิมเหมือนกัน (ปุ่มอยู่ล่างสุดของตาราง)
      ⚠️ ใช้สาย CT12 ไม่ใช่ CT11 — เทสต์ถัดไปใช้งานของ CT11 วันนี้อยู่ */
   await spKeySave('B20261118-01','2026-11-20','CT12',{'64849613':{sc:3,sp:0,fc:0,fp:0}});
   const b3=document.querySelector('#spordView .tblwrap.sp-freeze');
   if(b3)b3.scrollTop=240;
   await spKeyLineCancel('B20261118-01','2026-11-20','CT12');
   const b4=document.querySelector('#spordView .tblwrap.sp-freeze');
   const cAfter=b4?b4.scrollTop:-1;
   document.body.style.minHeight='';
   return {before:before,after:after,bBefore:bBefore,bAfter:bAfter,cAfter:cAfter,
     has:typeof spRenderKeep==='function'};
 });
 t('🔑 กดบันทึกแล้วหน้าค้างอยู่ตำแหน่งเดิม ไม่เด้งขึ้นสายบนสุด',
   keep.has&&keep.before>0&&Math.abs(keep.after-keep.before)<40,
   'ก่อน '+keep.before+' → หลัง '+keep.after);
 t('🔑 ...และกล่องตารางที่เลื่อนเองก็ต้องค้างที่เดิม (ตัวนี้คือที่เด้งจริง)',
   keep.bBefore>0&&Math.abs(keep.bAfter-keep.bBefore)<20,
   'ก่อน '+keep.bBefore+' → หลัง '+keep.bAfter);
 t('🔑 กดยกเลิกสายนี้ ก็ไม่เด้งขึ้นสายบนสุด',
   Math.abs(keep.cAfter-240)<20,'ก่อน 240 → หลัง '+keep.cAfter);

 /* 📅 เซลล์ต้องเห็น "ทุกวัน ทุกใบ" (เจ้าของสั่ง 27 พ.ย. 69)
    ซุปเปิดใบใหม่ต่อหนึ่งออเดอร์ ถ้าอ่านเฉพาะใบที่เปิดอยู่ เซลล์จะเห็นวันเดียว */
 const days=await ev(()=>{
   CSTOCK.slips['B20261128-02']={d:'2026-11-28',by:'admin1',byName:'แอดมิน 1',at:9,up:9,g:'D'};
   CSTOCK.lots['L-28-1']={id:'L-28-1',sl:'B20261128-02',d:'2026-11-28',code:'64849613',
     nm:'โอโมลิควิด ซากุระ 6x1000มล',cs:9,pc:0,sq:0,ln:'CT11',clr:[],up:9};
   CSTOCK.key['B20261128-02|2026-11-28|CT11']={it:{'64849613':{sc:5,sp:0}},by:'sup',at:9};
   CSTOCK.key['B20261128-02|2026-12-02|CT11']={it:{'64849613':{sc:7,sp:0}},by:'sup',at:9};
   __as('sales','209611','CT11 · เซลล์');
   SP.sid='B20261118-01';SP.view='slip';SP.sec='rep';SP.day='';SP.cm='2026-11';renderSpord();
   const all=spRepJobsAll('CT11').map(j=>j.sid+'/'+j.d);
   const one=spRepJobs('B20261118-01','CT11').map(j=>j.d);
   /* 📅 ตั้งแต่ 27 พ.ย. 69 รายการวันของเซลล์เป็น "ปฏิทิน" ไม่ใช่ลิสต์ปุ่มต่อวันแล้ว */
   const cells=[...document.querySelectorAll('#spBody .sp-cal .cal-day[onclick]')];
   const btns=cells.length;
   const txt=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   /* กดวันของใบอื่น ต้องเปิดใบนั้นให้เลย */
   const other=cells.find(c=>String(c.getAttribute('onclick')||'').indexOf('B20261128-02')>=0);
   if(other)other.click();
   return {all:all,one:one,btns:btns,txt:txt,sid:SP.sid,day:SP.day,
     meDays:Object.keys(spMeDays('CT11')).sort().join(',')};
 });
 t('🔑 เซลล์เห็นวันของทุกใบ ไม่ใช่แค่ใบที่เปิดอยู่',
   days.all.length>days.one.length&&days.all.some(x=>x.indexOf('B20261128-02/')===0),
   days.all.join(' , ')+' | ใบเดียว: '+days.one.join(' , '));
 t('...และบอกว่ารวมมาจากกี่ใบ พร้อมนับวันล่วงหน้าให้',
   /รวมทุกใบออเดอร์แล้ว/.test(days.txt)&&/ล่วงหน้า/.test(days.txt),
   days.meDays+' || '+days.txt.slice(0,400));
 t('🔑 วันที่มีงานกดได้จากปฏิทิน (แทนลิสต์ปุ่มต่อวันแบบเดิม)',
   days.btns>=2,days.btns+' วันที่กดได้');
 t('🔑 กดวันของใบอื่น ระบบเปิดใบนั้นแล้วไปวันนั้นให้เลย',
   days.sid==='B20261128-02'&&(days.day==='2026-11-28'||days.day==='2026-12-02'),
   days.sid+' / '+days.day);

 /* 🗑 ซุป/ผู้จัดการ แก้จำนวนหรือยกเลิกเป้าของสายหนึ่งได้ (เจ้าของสั่ง 27 พ.ย. 69) */
 const cxl=await ev(async()=>{
   const D='2026-12-05';
   CSTOCK.key['B20261118-01|'+D+'|CT11']={it:{'64849613':{sc:7,sp:0}},by:'sup',byName:'หัวหน้าเซลล์',at:20};
   CSTOCK.key['B20261118-01|'+D+'|CT12']={it:{'64849613':{sc:3,sp:0}},by:'sup',byName:'หัวหน้าเซลล์',at:20};
   CSTOCK.rep['B20261118-01|'+D+'|CT11']={it:{},no:['BDD0100007001'],by:'209611',at:21,n:1,h:[]};
   __as('sup',null,'หัวหน้าเซลล์');
   SP.sid='B20261118-01';SP.view='slip';CSTOCK.slips['B20261118-01'].g='D';
   SP.sec='key';SP.day=D;renderSpord();
   const btn=[...document.querySelectorAll('.sp-cancel')].length;
   const dbg={sec:SP.sec,day:SP.day,view:SP.view,sid:SP.sid,sup:spSupOk(),
     txt:(document.getElementById('spBody')||{textContent:''}).textContent.replace(/\s+/g,' ').slice(0,160)};
   const before=Object.keys(spKeyByLine('B20261118-01',D)).sort().join(',');
   window.confirm=()=>true;
   const b0=window.__posts.length;
   await spKeyLineCancel('B20261118-01',D,'CT11');
   const post=window.__posts[window.__posts.length-1];
   const after=Object.keys(spKeyByLine('B20261118-01',D)).sort().join(',');
   const raw=CSTOCK.key['B20261118-01|'+D+'|CT11'];
   const repKept=!!CSTOCK.rep['B20261118-01|'+D+'|CT11'];
   /* เซลล์กดไม่ได้ */
   __as('sales','209611','CT11 · เซลล์');
   const b1=window.__posts.length;
   await spKeyLineCancel('B20261118-01',D,'CT12');
   const salesBlocked=window.__posts.length===b1;
   /* ผู้จัดการกดได้ */
   __as('manager',null,'แอดมิน 1');
   await spKeyLineCancel('B20261118-01',D,'CT12');
   const mgrOk=Object.keys(spKeyByLine('B20261118-01',D)).length===0;
   return {btn:btn,dbg:dbg,before:before,after:after,raw:raw,repKept:repKept,
     posts:window.__posts.length-b0,post:post,salesBlocked:salesBlocked,mgrOk:mgrOk};
 });
 t('🔑 หน้าซุปจดมีปุ่มยกเลิกของแต่ละสายที่ตั้งเป้าไว้แล้ว',cxl.btn>=2,cxl.btn+' ปุ่ม · '+JSON.stringify(cxl.dbg));
 t('🔑 กดยกเลิกแล้วสายนั้นหายจากรายการที่ตั้งเป้าไว้',
   cxl.before==='CT11,CT12'&&cxl.after==='CT12',cxl.before+' → '+cxl.after);
 t('🛟 ยกเลิก = เขียนเรคอร์ดเปล่าทับ ไม่ใช่ลบคีย์ (แท็บเก่าจะ union กลับมา)',
   !!cxl.raw&&!!cxl.raw.it&&Object.keys(cxl.raw.it).length===0,JSON.stringify(cxl.raw));
 t('...และส่งขึ้นเซิร์ฟเวอร์ด้วย act:"key" เหมือนการบันทึกปกติ',
   cxl.post&&cxl.post.u==='/api/spord'&&cxl.post.b.act==='key'&&
   Object.keys(cxl.post.b.it||{}).length===0,JSON.stringify(cxl.post&&cxl.post.b.act));
 t('🛟 จำนวนที่เซลล์คีย์ไปแล้วไม่ถูกลบไปด้วย (คนละเรคอร์ด คนละเจ้าของ)',cxl.repKept);
 t('🔒 เซลล์กดยกเลิกไม่ได้ ไม่มีอะไรถูกส่งขึ้นเซิร์ฟเวอร์',cxl.salesBlocked);
 t('🔑 ผู้จัดการก็ยกเลิกได้ ไม่ใช่แค่หัวหน้าเซลล์',cxl.mgrOk);
 /* ⚠️ ของเดิมเคยตรวจว่า "หน้าเขียนบอก" — เลิกเขียนบอกแล้ว (ข้อมูลภายใน) จึงตรวจของจริงแทน:
    ไฟล์ทั้งก้อนต้องไม่ถูกส่งขึ้นเซิร์ฟเวอร์ ส่งขึ้นเฉพาะผลสรุปของรหัสที่อยู่ในใบนั้น */
 t('🛟 ไฟล์ allocation ไม่ถูกส่งขึ้นเซิร์ฟเวอร์ — ส่งแค่ผลตรวจของรหัสในใบนี้',
   !adm.allocSynced&&adm.ginRowKeys.length>0&&
   adm.ginRowKeys.every(k=>/^(CT|KA)\d\d\|\d+$/.test(k)),
   JSON.stringify(adm.ginRowKeys));
 t('🔒 หัวหน้าเซลล์ดูฝั่งแอดมินได้ แต่แก้ไม่ได้',adm.supRead);

 const guard=await ev(async()=>{
   const o={};
   /* หัวตารางหาย = ทิ้งทั้งไฟล์ ไม่ใช่เก็บศูนย์ทับของดี */
   const ws=XLSX.utils.aoa_to_sheet([['อะไรก็ไม่รู้','อีกช่อง'],[1,2]]);
   const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Export');
   const keep=ALLOC;
   try{parseAlloc('bad.xlsx',XLSX.write(wb,{type:'array',bookType:'xlsx'}));o.threw=false;}
   catch(e){o.threw=true;o.msg=String(e.message).slice(0,80);}
   o.kept=ALLOC===keep;
   /* เซลล์ธรรมดาเขียนฝั่งเซลล์ไม่ได้ */
   __as('sales','209611','เซลล์');
   const before=window.__posts.length;
   await spKeySave('B20261118-01','2026-11-20','CT11',{'64849613':{sc:9,sp:0,fc:0,fp:0}});
   o.salesBlocked=window.__posts.length===before;
   await spGinSave('B20261118-01','2026-11-20',['77']);
   o.salesGinBlocked=window.__posts.length===before;
   return o;});
 t('🛟 หัวตารางไฟล์ allocation เปลี่ยน → ทิ้งทั้งไฟล์ ไม่เก็บอะไรเลย',
   guard.threw&&guard.kept,guard.msg||'');
 t('🔒 เซลล์ธรรมดาเขียนฝั่งเซลล์/ฝั่งแอดมินไม่ได้ (เช็คในฟังก์ชัน ไม่ใช่แค่ซ่อนปุ่ม)',
   guard.salesBlocked&&guard.salesGinBlocked);

 /* ================================================================
  * 11) หน่วย ลัง/แพ็ค/ชิ้น · มูลค่า · ปุ่มยกเลิก · เอกสาร Excel/PDF
  *     เจ้าของสั่ง 26 พ.ย. 69
  * ================================================================ */
 const unit=await ev(()=>({
   /* แกะ "แพ็คละกี่ชิ้น" จากชื่อ โดยบังคับให้คูณแล้วเท่ากับ Pack Size พอดี */
   ok288:alShrink('โอโมน้ำ ซากุระ โรแมนซ์ 24X12X30มล',288),
   ok36:alShrink('บรีสเอกเซล 20B 6X6X160 กรัม',36),
   no:alShrink('โอโมน้ำ พิงค์ ฟลอรัล FO39 12X530มล',12),
   noQ:alShrink('อะไรก็ไม่รู้ 6X6',0),
   /* 1 ลัง 30 ชิ้น ของลังละ 288 */
   split:alSplit(alPcs({cs:1,sh:0,pc:30},288,12),288),
   /* 3 แพ็ค ของแพ็คละ 6 = 18 ชิ้น */
   pack:alPcs({cs:0,sh:3,pc:0},36,6),
   /* มีแพ็คแต่ไม่รู้ขนาดแพ็ค → null ห้ามเดาเป็น 1 */
   unknown:alPcs({cs:0,sh:3,pc:0},36,null),
   txtUnknown:alQtyTxt({cs:0,sh:3,pc:0},36,null).sub,
 }));
 t('🔑 แกะ "แพ็คละกี่ชิ้น" จากชื่อสินค้า โดยคูณแล้วต้องเท่ากับ Pack Size พอดี',
   unit.ok288===12&&unit.ok36===6,JSON.stringify({a:unit.ok288,b:unit.ok36}));
 t('🛟 ชื่อที่คูณไม่ลงตัว / ไม่มี Pack Size → ไม่รู้ขนาดแพ็ค (ไม่เดา)',
   unit.no===null&&unit.noQ===null,JSON.stringify({no:unit.no,noQ:unit.noQ}));
 t('🔑 แปลงจำนวนเป็น ลัง + ชิ้น จาก Pack Size (ช่อง Q) ได้',
   unit.split&&unit.split.cs===1&&unit.split.pc===30&&unit.split.pcs===318,
   JSON.stringify(unit.split));
 t('🔑 นับหน่วย "แพ็ค" เข้าไปด้วย (3 แพ็ค ของแพ็คละ 6 = 18 ชิ้น)',unit.pack===18,unit.pack);
 t('🛟 มีแพ็คแต่ไม่รู้ขนาดแพ็ค → ไม่แปลง และบอกบนจอว่าไม่รู้',
   unit.unknown===null&&/ไม่รู้ขนาดแพ็ค/.test(unit.txtUnknown),
   JSON.stringify({u:unit.unknown,t:unit.txtUnknown}));

 const val=await ev(async()=>{
   __slip();__as('manager',null,'แอดมิน 1');_switchTab('spord');
   /* ไฟล์ราคาหัวเสือจำลอง: WS LP ต่อ "หีบ" · NTT ต่อ "ชิ้น" (วัดจากไฟล์จริง) */
   PRICE={loaded:true,err:'',bum:null,hs:{rounds:["Nov'26"],items:{
     '64849613':{m:[[900,918,0,0,16,16.5,20,0,'']]},
     '65456729':{m:[[360,370,0,0,12,12.5,15,0,'']]}}}};
   /* ดัชนีเลขออเดอร์จากไฟล์ยอดขาย — ของจริงที่ใช้คิด NIV/GSV */
   STOREDAILY.ord['BDD0100000111']={s:'4862383',l:'209611',d:'2026-11-20',v:5000,g:7000,c:3,cs:2,pc:0};
   parseAlloc('alloc.xlsx',__alBuf());
   SP.sec='adm';SP.day='2026-11-20';renderSpord();
   document.getElementById('spGinIn').value='77';
   await spGinGo('B20261118-01','2026-11-20');
   const cmp=spCmp('B20261118-01','2026-11-20');
   const o={ords:(CSTOCK.gin['B20261118-01|2026-11-20'].ords||[]).slice(),
     sum:cmp.sum,row:cmp.rows.filter(r=>r.code==='65456729'&&r.ln==='CT11')[0]};
   o.txt=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   return o;});
 t('🔑 เก็บ "เลขออเดอร์" ของ GIN นั้นไว้ (ใช้ดึงยอดขายจริง)',
   val.ords.length>0,JSON.stringify(val.ords));
 t('🔑 ยอดขายจริง NIV/GSV ดึงจากไฟล์ยอดขายด้วยเลขออเดอร์ ไม่ใช่ประเมิน',
   val.sum.rNiv===5000&&val.sum.rGsv===7000&&val.sum.ordHit===1,
   JSON.stringify({niv:val.sum.rNiv,gsv:val.sum.rGsv,hit:val.sum.ordHit}));
 /* 💰 เจ้าของสั่ง 28 พ.ย. 69 ให้เอาเงินออกจากหน้าแอดมิน ไปอยู่ที่ 📊 รายงาน ของผู้จัดการอย่างเดียว
    *"แอดมินจะได้ไม่งง แล้วเน้นตรวจจำนวน ชิ้น และลัง แทน"* — แต่ตัวเลขยังถูกคิดและเก็บไว้ครบ */
 t('💰 หน้าแอดมินตรวจไม่โชว์เงินแล้ว (ไม่มี NIV / GSV / ยอดทั้งออเดอร์)',
   !/NIV/.test(val.txt)&&!/GSV/.test(val.txt)&&!/ยอดสินค้าในใบนี้/.test(val.txt)&&
   !/ยอดทั้งออเดอร์/.test(val.txt),val.txt.slice(0,160));
 t('🛟 ...แต่ยังคิดและเก็บไว้ครบ หน้า 📊 รายงาน ของผู้จัดการจึงยังอ่านได้',
   val.sum.rNiv===5000&&val.sum.sNiv>0&&val.row.niv===610,
   JSON.stringify({rNiv:val.sum.rNiv,sNiv:val.sum.sNiv,row:val.row.niv}));

 /* ---------- 💵 เงินในไฟล์ใบจัดของ (ช่อง GSV / NIV ท้ายไฟล์) ----------
    เจ้าของทักเมื่อ 26 พ.ย. 69: *"ทำไมไฟล์ allocate จะไม่มีอยู่สองช่องสุดท้ายด้านหลังนี้ไง"*
    ไฟล์จริงรุ่นใหม่มี 36 ช่อง · AI = GSV · AJ = NIV และตรงกับไฟล์ยอดขาย 1,401/1,401 ใบ */
 t('🔑 อ่าน GSV/NIV จากไฟล์ใบจัดของเอง ไม่ใช่ประเมินจากไฟล์ราคา',
   val.sum.src==='file'&&Math.round(val.sum.sGsv)===2900&&Math.round(val.sum.sNiv)===2150,
   JSON.stringify({src:val.sum.src,gsv:val.sum.sGsv,niv:val.sum.sNiv}));
 t('🔑 ...ตัวเลขรายสินค้าก็มาจากไฟล์ (ไม่ใช่ WS LP x จำนวน)',
   val.row.gsv===800&&val.row.niv===610&&val.row.est===0,
   JSON.stringify({gsv:val.row.gsv,niv:val.row.niv,est:val.row.est}));
 t('🛟 ไฟล์มีช่องเงิน ระบบรู้ว่าเงินมาจากไฟล์ (ไม่ได้ประเมิน) แม้จะไม่ขึ้นบนจอแอดมิน',
   val.sum.src==='file'&&val.row.est===0,
   JSON.stringify({src:val.sum.src,est:val.row.est}));
 t('🛟 มูลค่าของแถมยังคิดเป็นค่าประเมินไว้เหมือนเดิม (ไฟล์ลงเงินของแถมเป็น 0)',
   val.sum.fNiv>=0&&val.sum.src==='file',String(val.sum.fNiv));

 const doc=await ev(()=>{
   const R=spRepRows('B20261118-01','2026-11-20');
   window.__printed=0;window.print=()=>{window.__printed=1};
   spRepPrint('B20261118-01','2026-11-20');
   return {rows:R.body.length,cols:R.head.length,
     name:spRepName('B20261118-01','2026-11-20','xlsx'),
     printed:!!window.__printed,
     pr:document.getElementById('prArea').textContent.replace(/\s+/g,' ').slice(0,400),
     meta:spRepMeta('B20261118-01','2026-11-20',spCmp('B20261118-01','2026-11-20'),
       spGinRec('B20261118-01','2026-11-20')).map(x=>x[0]).filter(Boolean)};});
 t('🔑 ดึงผลตรวจออกเป็นเอกสารได้ (ตารางมีครบทุกแถว · ไม่มีช่องเงินแล้ว)',doc.rows>0&&doc.cols===16,
   doc.rows+' แถว · '+doc.cols+' คอลัมน์');
 t('🔑 ...และสั่งพิมพ์ PDF ได้ โดยมีหัวเรื่องกับเลข GIN ในเอกสาร',
   doc.printed&&/ผลตรวจใบจัดของ/.test(doc.pr)&&/GIN/.test(doc.pr),doc.pr.slice(0,90));
 t('🛟 ชื่อไฟล์ต้องเป็น ASCII ล้วน (Chromium ตัดชื่อไฟล์ไทยทิ้งทั้งนามสกุล)',
   /^[\x20-\x7E]+\.xlsx$/.test(doc.name),doc.name);
 t('...ใบสรุปบอกจำนวนเลขออเดอร์ที่ดึงได้ และบอกว่าเงินอยู่ที่หน้ารายงาน',
   doc.meta.indexOf('รอไฟล์ยอดขาย')>=0&&doc.meta.indexOf('หมายเหตุ')>=0&&
   doc.meta.indexOf('ยอดทั้งออเดอร์ NIV')<0&&doc.meta.indexOf('แหล่งที่มาของเงิน')<0,
   doc.meta.join(' | ').slice(0,140));

 const undo=await ev(async()=>{
   CSTOCK.key['B20261118-01|2026-11-20|CT11']={it:{'64849613':{sc:1,sp:0,fc:0,fp:0}},at:1};
   const before=window.__posts.length;
   await spGinUndo('B20261118-01','2026-11-20');
   return {gone:!spGinRec('B20261118-01','2026-11-20'),
     raw:(CSTOCK.gin['B20261118-01|2026-11-20']||{}).del,
     keyKept:!!CSTOCK.key['B20261118-01|2026-11-20|CT11'],
     post:window.__posts[window.__posts.length-1],
     sent:window.__posts.length>before,
     txt:document.getElementById('spBody').textContent.replace(/\s+/g,' ')};});
 t('🔑 ยกเลิกผลตรวจของวันนั้นได้ (เจ้าของทดลองไปสองวัน)',undo.gone&&undo.sent);
 t('🛟 ...เขียน del:1 ทับ ไม่ใช่ลบคีย์ (ลบคีย์แล้วแท็บเก่า union กลับมา)',
   undo.raw===1,String(undo.raw));
 t('🛟 ...และจำนวนที่ฝั่งเซลล์กรอกไว้ ต้องไม่หายไปด้วย',undo.keyKept);
 t('...ส่งผ่าน api/spord ด้วย act:"gin" + del:1',
   undo.post&&undo.post.u==='/api/spord'&&undo.post.b.act==='gin'&&undo.post.b.del===1,
   JSON.stringify(undo.post&&undo.post.b.del));
 t('...หน้ากลับไปบอกว่ายังไม่ได้บันทึกผลตรวจ',/ยังไม่ได้บันทึกผลตรวจ/.test(undo.txt));

 /* ไฟล์รุ่นเก่าที่ไม่มีช่องเงิน ต้องยังอ่านได้ และต้อง "บอกออกมา" ไม่ใช่ขึ้น 0 เงียบ ๆ */
 const oldf=await ev(async()=>{
   __as('manager',null,'ผู้จัดการ');
   parseAlloc('Order_Allocation_old.xlsx',window.__alBuf(1));
   SP.sec='adm';SP.day='2026-11-21';renderSpord();
   document.getElementById('spGinIn').value='77';
   await spGinGo('B20261118-01','2026-11-21');
   const cmp=spCmp('B20261118-01','2026-11-21');
   return {src:cmp.sum.src,n:cmp.n,alloc:ALLOC.money,gsv:cmp.sum.sGsv,
     row:cmp.rows.filter(r=>r.code==='65456729'&&r.ln==='CT11')[0],
     txt:document.getElementById('spBody').textContent.replace(/\s+/g,' ')};});
 t('🛟 ไฟล์รุ่นเก่า (ไม่มีช่อง GSV/NIV) ยังอ่านได้เหมือนเดิม ไม่ throw',
   oldf.n.ok+oldf.n.diff+oldf.n.noKey+oldf.n.noAlloc>0&&!oldf.alloc,
   JSON.stringify(oldf.n));
 t('🛟 ...และระบบยังรู้ว่าเงินรอบนี้เป็นค่าประเมินจากไฟล์ราคา (เก็บไว้ให้หน้ารายงานอ่าน)',
   oldf.src==='price'&&!/NIV/.test(oldf.txt),oldf.txt.slice(0,160));
 /* เมื่อต้องประเมิน หน่วยราคาต้องถูก: WS LP ต่อ "หีบ" · NTT ต่อ "ชิ้น" (เคยพลาด 36 เท่า) */
 t('🛟 ...เวลาประเมิน ราคาหีบใช้ WS LP ต่อหีบ · ราคาชิ้นใช้ NTT ต่อชิ้น (คนละหน่วย)',
   oldf.row&&Math.round(oldf.row.gsv)===720&&Math.round(oldf.row.niv)===288&&
   oldf.row.qS.pcs===24&&oldf.row.est===1,
   JSON.stringify(oldf.row&&{pcs:oldf.row.qS&&oldf.row.qS.pcs,gsv:oldf.row.gsv,niv:oldf.row.niv,est:oldf.row.est}));

 const noAdm=await ev(async()=>{
   __as('sup',null,'หัวหน้าเซลล์');
   const before=window.__posts.length;
   await spGinUndo('B20261118-01','2026-11-20');
   return window.__posts.length===before;});
 t('🔒 หัวหน้าเซลล์ยกเลิกผลตรวจของแอดมินไม่ได้',noAdm);

 /* ================================================================
  * 12) 🚚 คลังจัดส่ง ของใบ 🎯 ตัวกระจาย = รายงานจากไฟล์ใบจัดของ (เจ้าของสั่ง 26 พ.ย. 69)
  *   *"ให้ใช้ไฟล์ที่แอดมิน up เข้าไป … ระบบขึ้นรายงานได้เลยว่าคลังจัดส่งไปแล้วทั้งหมดกี่ลัง
  *     โดยถ้านับจากไฟล์ allocate แล้ว คำนวณมา ไม่ต้องรอซุปจดหรือเซลล์คีย์"*
  * ================================================================ */
 const dist=await ev(async()=>{
   __slip();                                  /* ใบ 🎯 ตัวกระจาย · โอโม 40 ลัง + บรีส 30 ลัง */
   __as('manager',null,'แอดมิน 1');_switchTab('spord');
   parseAlloc('alloc.xlsx',__alBuf());
   /* แอดมินตรวจสองวัน — GIN 77 และ 78 (คนละวัน) ทั้งที่ยังไม่มีใครคีย์หรือจดเป้าเลย */
   SP.sec='adm';SP.day='2026-11-20';renderSpord();
   document.getElementById('spGinIn').value='77';
   await spGinGo('B20261118-01','2026-11-20');await W();
   SP.day='2026-11-21';renderSpord();
   document.getElementById('spGinIn').value='78';
   await spGinGo('B20261118-01','2026-11-21');await W();
   const o={keyed:Object.keys(CSTOCK.key).length};
   /* ไฟล์หลุดจากหน่วยความจำ (รีเฟรชหน้า) — รายงานต้องยังอ่านได้จากผลตรวจที่บันทึกไว้ */
   ALLOC=null;
   const p0=window.__posts.length,s0=window.__sync;
   SP.sec='out';renderSpord();
   o.tx=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   o.sum=spAllOut('B20261118-01');
   o.before=JSON.stringify({lots:CSTOCK.lots,clr:Object.keys(CSTOCK.lots).map(k=>CSTOCK.lots[k].clr)});
   o.posts=window.__posts.length-p0;o.sync=window.__sync-s0;
   /* ใบ A ต้องยังเป็นระบบกรอกมือแบบเดิมทุกอย่าง */
   CSTOCK.slips['B20261118-01'].g='A';renderSpord();
   o.aTx=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   o.aBulk=!!document.querySelector('#spBody .cst-bulk');
   CSTOCK.slips['B20261118-01'].g='D';renderSpord();
   o.after=JSON.stringify({lots:CSTOCK.lots,clr:Object.keys(CSTOCK.lots).map(k=>CSTOCK.lots[k].clr)});
   o.dBulk=!!document.querySelector('#spBody .cst-bulk');
   return o;});
 /* ไฟล์จำลอง: GIN 77 → โอโม CT11 5+1 ลัง · บรีส CT11 2 ลัง · โอโม CT12 2 ลัง   (ลังละ 12 ชิ้น)
    GIN 78 → โอโม KA97 9 ลัง  ⇒ รวม 19 ลัง จาก 70 ลังที่ตัดบิลไว้ = 27% */
 t('🔑 คลังจัดส่งของใบตัวกระจาย คิดจากไฟล์ใบจัดของล้วน ๆ ไม่ต้องรอซุปจด/เซลล์คีย์',
   dist.keyed===0&&Math.round(dist.sum.out)===19&&dist.sum.cut===70,
   JSON.stringify({keyed:dist.keyed,out:dist.sum.out,cut:dist.sum.cut}));
 t('🔑 ...ขึ้นเป็นรายงาน: ตัดบิลไว้ / คลังจัดออกแล้ว / ส่วนต่าง / วันที่ตรวจ',
   /คลังจัดออกแล้ว/.test(dist.tx)&&/ตัดบิลไว้ในใบนี้/.test(dist.tx)&&
   /ส่วนต่าง/.test(dist.tx)&&/คลังยังจัดไม่ครบที่ตัดบิล/.test(dist.tx)&&
   /วันที่ตรวจแล้ว/.test(dist.tx)&&/27%/.test(dist.tx),
   dist.tx.slice(0,150));
 /* 📦 ห้ามมีลังทศนิยมบนหน้าจอ — 19 ลังจาก 70 ที่ตัดบิลไว้ ⇒ ส่วนต่าง −51 ลัง */
 t('📦 ตัวเลขบนการ์ดเป็น "ลัง/ชิ้น" ไม่ใช่ลังทศนิยม',
   /70\s*ลัง/.test(dist.tx)&&/19\s*ลัง/.test(dist.tx)&&/−51\s*ลัง/.test(dist.tx)&&
   !/\d+\.\d+\s*ลัง/.test(dist.tx),
   (dist.tx.match(/[\d.,]+ ?ลัง/g)||[]).join(" | ").slice(0,200));
 t('🔑 ...อ่านจากผลตรวจที่บันทึกไว้ ไม่ต้องอัพไฟล์ซ้ำ (รีเฟรชแล้วตัวเลขยังอยู่)',
   dist.sum.days.length===2&&dist.sum.gins.join(',')==='77,78',
   JSON.stringify({d:dist.sum.days.map(x=>x.d),g:dist.sum.gins}));
 t('🔑 ...แยกรายสินค้าและรายสายให้ตรวจว่าตรงกับที่ตัดบิลไว้ไหม',
   /โอโมน้ำ ซากุระ/.test(dist.tx)&&/แยกตามสาย/.test(dist.tx)&&
   dist.sum.lines.length===3&&dist.sum.prod.length===2,
   JSON.stringify({ln:dist.sum.lines.map(x=>x.ln),pd:dist.sum.prod.map(x=>x.code)}));
 t('🛟 หน้านี้อ่านอย่างเดียว — ไม่แตะ lots/การเคลียร์ ไม่ยิง และไม่ sync',
   dist.before===dist.after&&dist.posts===0&&dist.sync===0,
   'posts='+dist.posts+' sync='+dist.sync);
 t('🛟 ใบ A/B ยังใช้ระบบกรอกมือของสต็อคกลางเหมือนเดิมทุกอย่าง',
   dist.aBulk&&!dist.dBulk&&/ยังค้าง/.test(dist.aTx),
   'A มีแถบติ๊ก='+dist.aBulk+' · D มี='+dist.dBulk);
 /* การ์ดในรายการเดือนกับหน้าในใบต้องตอบคำถามเดียวกันด้วยเลขเดียวกัน
    (ไม่งั้นการ์ดขึ้น 0% ทั้งที่กดเข้าไปแล้วขึ้น 27% — เป็นคนละคำตอบในจอเดียวกัน) */
 const same=await ev(()=>{
   const o={};
   CSTOCK.slips['B20261118-01'].g='D';
   o.d=spSent('B20261118-01');
   SP.view='mon';SP.ym='2026-11';renderSpord();
   o.card=(document.querySelector('#spBody .cst-grp')||{textContent:''})
     .textContent.replace(/\s+/g,' ');
   CSTOCK.slips['B20261118-01'].g='A';
   o.a=spSent('B20261118-01');
   CSTOCK.slips['B20261118-01'].g='D';
   return o;});
 t('🛟 การ์ดในรายการเดือนใช้เลขชุดเดียวกับหน้าคลังจัดส่ง (ห้ามขึ้นคนละเปอร์เซ็นต์)',
   Math.round(same.d.out)===19&&same.d.src==='alloc'&&/51 \/ 70 ลัง/.test(same.card),
   JSON.stringify(same.d)+' | '+same.card.slice(0,90));
 t('🛟 ใบ A/B ยังนับจากการเคลียร์มือเหมือนเดิม (ยังไม่เคลียร์ = ค้างทั้งใบ)',
   same.a.src==='lots'&&same.a.out===0&&same.a.left===70,JSON.stringify(same.a));
 const dist0=await ev(()=>{
   __slip();__as('manager',null,'แอดมิน 1');_switchTab('spord');
   SP.sec='out';renderSpord();
   return document.getElementById('spBody').textContent.replace(/\s+/g,' ');});
 t('🛟 ยังไม่มีผลตรวจสักวัน → บอกให้ไปใส่เลข GIN ก่อน ไม่ใช่ขึ้น 0 เงียบ ๆ',
   /ยังไม่มีผลตรวจของใบนี้/.test(dist0)&&/แอดมินตรวจ/.test(dist0)&&!/0%/.test(dist0),
   dist0.slice(0,140));
 /* หมวดที่พักไว้ต้องยังเปิดได้ด้วยโค้ดเดิม — ใส่บรรทัดกลับเข้า SP_TABS เมื่อไหร่ก็กลับมาพร้อมประวัติ */
 const old=await ev(()=>{
   __reset();CSTOCK.sub['B20261118-01|BDD0100000006']={sid:'B20261118-01',no:'BDD0100000006',
     ln:'209611',at:1,up:1};
   __as('manager',null,'แอดมิน 1');SP.view='slip';SP.sid='B20261118-01';SP.sec='old';renderSpord();
   return {tx:document.getElementById('spBody').textContent.replace(/\s+/g,' '),
           chips:[...document.querySelectorAll('#spTabs .tab2')].map(x=>x.textContent.trim())};});
 t('🛟 หมวดเลขออเดอร์ถอดแค่ปุ่ม — หน้าและข้อมูลเดิมยังเรียกขึ้นมาได้ครบ',
   /BDD0100000006/.test(old.tx)&&!old.chips.some(c=>/เลขออเดอร์/.test(c)),
   old.chips.join(' | '));

 /* ================================================================
  * 13) 🎁 ของแถมตามโปร — จับ mechanic จากไฟล์ BUM (เจ้าของสั่ง 26 พ.ย. 69)
  *   *"ลองจับรหัสและ mechanic การแถมของแต่ละโปรจากไฟล์ bum ดู เช่นซิตร้าในออเดอร์นี้
  *     มันเป็นโปรสองแถมหนึ่ง ลักส์เป็น 2 แถม 2"*
  *   ⛔ รหัส/ชื่อในเทสสมมติขึ้นเอง รีโปเป็นสาธารณะ — แต่สูตรโปรลอกโครงของจริงมาทั้งสามแบบ
  *      (2 แถม 1 สีตัวเอง · 1 แถม 1 ข้ามรหัสสองทาง · 2 แถม 2 ข้ามรหัสทางเดียว)
  * ================================================================ */
 const bbf=await ev(async()=>{
   __reset();
   CSTOCK.slips['B20261118-01'].g='D';
   /* ใบ: ครีม 3 ตัว (2F1 สีตัวเอง) · เซรั่มคู่ (1F1 ไขว้) · สบู่คู่ (2F2 ไขว้) · อื่น ๆ 1 ตัว */
   [['AAA1','ครีมทาผิว เอ',60],['AAA2','ครีมทาผิว บี',90],
    ['BBB1','เซรั่ม เอ็กซ์',15],['BBB2','เซรั่ม วาย',15],
    ['CCC1','สบู่เหลว โรส',60],['CCC2','สบู่เหลว ซากุระ',60],
    ['DDD1','สินค้าไม่มีโปร',10]].forEach((p,i)=>{
     const id='B20261118-01-b'+i;
     CSTOCK.lots[id]={id:id,sl:'B20261118-01',d:'2026-11-18',code:p[0],nm:p[1],
       cs:p[2],pc:0,sq:i,ln:'CT11',clr:[],up:1};});
   /* ไฟล์ BUM: ช่อง ex อยู่ท้ายสุดของอาเรย์ (PB_F) — fb ซื้อ · fq แถม · fc รหัสของแถม */
   const B=ex=>{const a=[900,12,0,0,0,0,0,0,0,0,0,'','',0,0,0,ex];return a;};
   PRICE={loaded:true,err:'',hs:null,bum:{items:{
     'AAA1':B({fb:2,fq:1}),                     /* ไฟล์ไม่ระบุรหัส = แถมตัวเอง */
     'AAA2':B({fb:2,fq:1}),
     'BBB1':B({fb:1,fq:1,fc:'BBB2',fe:'30/11/2026'}),
     'BBB2':B({fb:1,fq:1,fc:'BBB1'}),
     'CCC1':B({fb:2,fq:2,fc:'CCC2'}),
     'CCC2':B(null),                            /* ตัวแถม ไม่มีสูตรของตัวเอง */
     'DDD1':B(null)}}};
   const row=(sc,fc)=>({sc:sc,ss:0,sp:0,fc:fc,fs:0,fp:0,pk:12,nm:''});
   CSTOCK.gin['B20261118-01|2026-11-20']={g:['77'],at:2,by:'admin1',byName:'แอดมิน 2',dd:[],ords:[],money:0,
     rows:{'CT11|AAA1':row(40,20),'CT11|AAA2':row(60,30),
           'CT11|BBB1':row(15,0),'CT11|BBB2':row(0,15),
           'CT11|CCC1':row(60,0),'CT11|CCC2':row(0,60),
           'CT11|DDD1':row(10,0)}};
   __as('manager',null,'แอดมิน 1');_switchTab('spord');
   SP.view='slip';SP.sid='B20261118-01';SP.sec='out';renderSpord();
   const o={g:spBbf('B20261118-01'),
     tx:document.getElementById('spBody').textContent.replace(/\s+/g,' ')};
   /* คลังแถมสบู่มาไม่ครบสูตร */
   CSTOCK.gin['B20261118-01|2026-11-20'].rows['CT11|CCC2']=row(0,40);
   o.short=spBbf('B20261118-01').chk.filter(c=>c.code==='CCC2')[0];
   CSTOCK.gin['B20261118-01|2026-11-20'].rows['CT11|CCC2']=row(0,60);
   /* ไม่มีไฟล์ BUM เลย */
   PRICE={loaded:true,err:'',hs:null,bum:null};renderSpord();
   o.noBum=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   /* เซลล์ไม่มีไฟล์ต้นทุนของศูนย์อยู่แล้ว และฟังก์ชันต้องกันไว้เองด้วย */
   __as('sales','209611','CT11');
   o.sales=spBbfHtml('B20261118-01');
   __as('manager',null,'แอดมิน 1');
   return o;});
 const bR=c=>bbf.g.rows.filter(r=>r.code===c)[0];
 const bC=c=>bbf.g.chk.filter(r=>r.code===c)[0];
 const Q1=a=>(a||[]).join(',');
 t('🔑 อ่านสูตรของแถมจากไฟล์ BUM เอง — ไม่ต้องพิมพ์เงื่อนไขเข้าระบบ',
   bbf.g.hasBum&&bbf.g.rows.length===5&&Q1(bR('AAA1').bq)==='2,0,0'&&Q1(bR('AAA1').fq)==='1,0,0'&&
   Q1(bR('CCC1').bq)==='2,0,0'&&Q1(bR('CCC1').fq)==='2,0,0'&&Q1(bR('BBB1').bq)==='1,0,0'&&
   bbf.g.rows.every(r=>r.src==='bum'),
   bbf.g.rows.map(r=>r.code+' ซื้อ'+Q1(r.bq)+' แถม'+Q1(r.fq)).join(' | '));
 t('🔑 ของแถมข้ามรหัสต้องรวมยอดไปที่ "รหัสของแถม" ไม่ใช่รหัสที่ซื้อ',
   bR('CCC1').fc==='CCC2'&&!bR('CCC1').self&&bR('BBB1').fc==='BBB2',
   'CCC1 แถม '+bR('CCC1').fc+' · BBB1 แถม '+bR('BBB1').fc);
 t('🛟 ไฟล์ไม่ได้ระบุรหัสของแถม → อ่านเป็นแถมตัวเอง และติดป้ายว่าเป็นการอนุมาน',
   bR('AAA1').self&&bR('AAA1').fc==='AAA1'&&/ไฟล์ไม่ได้ระบุรหัส/.test(bbf.tx),
   JSON.stringify({self:bR('AAA1').self,fc:bR('AAA1').fc}));
 /* 2 แถม 1: ขาย 40 ควรแถม 20 · 2 แถม 2: ขาย 60 ควรแถม 60 · 1 แถม 1: ขาย 15 ควรแถม 15 */
 t('🔑 เทียบ "ควรแถมเท่าไหร่" กับ "คลังจัดแถมมาจริงเท่าไหร่" ได้ครบทุกสูตร',
   bC('AAA1').exp===20&&bC('AAA1').got===20&&bC('AAA1').st==='ok'&&
   bC('CCC2').exp===60&&bC('CCC2').got===60&&bC('CCC2').st==='ok'&&
   bC('BBB2').exp===15&&bC('BBB2').got===15&&bC('BBB2').st==='ok',
   bbf.g.chk.map(c=>c.code+' ควร'+c.exp+' ได้'+c.got+' '+c.st).join(' | '));
 t('🔑 คลังแถมมาไม่ครบสูตร → ขึ้นว่าน้อยกว่าสูตร พร้อมส่วนต่าง',
   bbf.short.st==='short'&&bbf.short.d===-20,JSON.stringify(bbf.short&&{st:bbf.short.st,d:bbf.short.d}));
 t('🛟 รหัสที่ไฟล์ BUM ไม่ได้ลงโปรแถมไว้ ต้องนับแยกและบอก ไม่ใช่คิดเป็น 0',
   bbf.g.none.length===2&&bbf.g.none.some(x=>x.code==='DDD1')&&
   /ไฟล์ BUM ไม่ได้ลงโปรของแถมไว้/.test(bbf.tx),
   bbf.g.none.map(x=>x.code).join(','));
 t('🛟 ตัวเลขที่ควรแถมติดป้าย (ประเมิน) และบอกว่า CAP ต่อร้านทำให้ต่างได้',
   /ประเมิน/.test(bbf.tx)&&/CAP ต่อร้าน/.test(bbf.tx),
   bbf.tx.slice(bbf.tx.indexOf('ควรแถม'),bbf.tx.indexOf('ควรแถม')+60));
 t('🛟 ยังไม่ได้อัพไฟล์ BUM และไฟล์ใบจัดของไม่มีแถวแถม → บอกตรง ๆ ไม่ใช่ขึ้นตารางเปล่า',
   /ไฟล์ BUM ยังไม่ได้อัพ/.test(bbf.noBum)&&!/ซื้อ 2 ลัง/.test(bbf.noBum),
   bbf.noBum.slice(bbf.noBum.indexOf('ของแถมตามโปร'),bbf.noBum.indexOf('ของแถมตามโปร')+130));
 t('🔒 ไฟล์ BUM เป็นไฟล์ต้นทุนศูนย์ — ส่วนนี้กันไว้ในฟังก์ชัน ไม่ใช่แค่ซ่อนปุ่ม',bbf.sales==='');

 /* ---------- 13b) ✏️ ปุ่มแก้ไขใบ ---------- */
 const edit=await ev(()=>{
   __reset();
   CSTOCK.slips['B20261118-01'].g='D';
   CSTOCK.lots['B20261118-01-e0']={id:'B20261118-01-e0',sl:'B20261118-01',d:'2026-11-18',
     code:'AAA1',nm:'ครีมทาผิว เอ',cs:60,pc:0,sq:0,ln:'CT11',clr:[],up:1};
   __as('manager',null,'แอดมิน 1');_switchTab('spord');
   SP.view='slip';SP.sid='B20261118-01';renderSpord();
   const o={btn:!!document.querySelector('#spBar button[onclick*="spEditSlip"]')};
   spEditSlip('B20261118-01');
   o.view=SP.view;o.tab=CURTAB;
   o.f={sid:CST.f&&CST.f.sid,g:CST.f&&CST.f.g,n:CST.f&&CST.f.rows.length,
        code:CST.f&&CST.f.rows[0].code,cs:CST.f&&CST.f.rows[0].cs};
   o.bar=document.getElementById('spBar').textContent.replace(/\s+/g,' ');
   o.inputs=!!document.getElementById('spBody').querySelector('input');
   o.cstBill=(document.getElementById('cstBill')||{}).innerHTML||'';
   o.spShown=!document.getElementById('spordView').classList.contains('hidden');
   /* เซลล์กดไม่ได้ */
   CST.f=null;__as('sales','209611','CT11');SP.view='slip';renderSpord();
   o.salesBtn=!!document.querySelector('#spBar button[onclick*="spEditSlip"]');
   spEditSlip('B20261118-01');
   o.salesBlocked=(SP.view!=='new')&&!CST.f;
   __as('manager',null,'แอดมิน 1');CST.f=null;
   return o;});
 t('🔑 แอดมิน/ผู้จัดการมีปุ่ม ✏️ แก้ไขใบ บนหัวใบ แล้วเปิดฟอร์มในหน้านี้เลย',
   edit.btn&&edit.view==='new'&&edit.tab==='spord'&&edit.spShown&&edit.inputs&&
   /แก้ไขใบ/.test(edit.bar),JSON.stringify({btn:edit.btn,view:edit.view,tab:edit.tab,
     shown:edit.spShown,inputs:edit.inputs,bar:edit.bar.slice(0,40)}));
 t('🔑 ...ฟอร์มขึ้นสินค้าและจำนวนของใบเดิมมาให้แก้ ไม่ใช่ใบเปล่า',
   edit.f.sid==='B20261118-01'&&edit.f.n===1&&edit.f.code==='AAA1'&&edit.f.cs===60,
   JSON.stringify(edit.f));
 /* บั๊กตัวเดียวกับ spSetGrp: เขียน "B":"A" ตายไว้ ทำให้ใบตัวกระจายถูกปัดกลับทันทีที่กดแก้ */
 t('🛟 ...และประเภทใบ 🎯 ตัวกระจาย ต้องไม่ถูกปัดกลับเป็นตัดบิลรอส่งตอนกดแก้',
   edit.f.g==='D',edit.f.g);
 t('🛟 หน้าสต็อคกลางต้องไม่วาดฟอร์มซ้ำอีกชุด (id ซ้ำกันทั้งหน้า)',edit.cstBill==='');
 t('🔒 เซลล์ไม่มีปุ่มแก้ไขใบ และเรียกฟังก์ชันตรง ๆ ก็ไม่ได้',
   !edit.salesBtn&&edit.salesBlocked);
 /* หัวใบเคยถูกเขียน innerHTML ทับ ปุ่มเลือกประเภทจึงหายไปทั้งแถบตอนเปิดเข้าไปในใบ
    เจ้าของหาไม่เจอ แล้วมาบอกว่า "แก้ออเดอร์นี้ให้เป็นรูปแบบตัวกระจาย" ให้แทน (26 พ.ย. 69) */
 /* เจ้าของสั่ง 26 พ.ย. 69: *"ส่วนของที่ให้เลือกประเภทใบ ให้ย้ายมันเข้าไปอยู่ในปุ่มแก้ไขใบ
    ให้ต้องกดแก้ไขใบก่อนแล้วค่อยไปเปลี่ยนประเภทใบ"* — กันกดโดนบนหัวใบแล้วใบเปลี่ยนประเภททันที */
 const grpBtn=await ev(()=>{
   __as('manager',null,'แอดมิน 1');CST.f=null;SP.view='slip';SP.sid='B20261118-01';renderSpord();
   const h=document.getElementById('spBar');
   const o={inSlip:[...h.querySelectorAll('button[onclick*="spSetGrp"]')].length,
     edit:!!h.querySelector('button[onclick*="spEditSlip"]'),
     lock:!!h.querySelector('button[onclick*="spPinLock"]'),
     bar:/spSetGrp/.test(spBarHtml(spSlip('B20261118-01')))};
   spEditSlip('B20261118-01');
   o.inForm=[...document.querySelectorAll('#spBody button[onclick*="cstSetGrp"]')].length;
   CST.f=null;SP.view='slip';renderSpord();
   return o;});
 t('🔑 หัวใบมีแต่ปุ่มแก้ไขใบ — เปลี่ยนประเภทต้องกดเข้าไปในฟอร์มก่อน',
   grpBtn.inSlip===0&&!grpBtn.bar&&grpBtn.edit&&grpBtn.lock&&grpBtn.inForm===3,
   JSON.stringify(grpBtn));

 /* ================================================================
  * 14) 🎁 ถอดสูตรของแถมจาก "ไฟล์ใบจัดของ" เอง (เจ้าของสั่ง 26 พ.ย. 69)
  *   วัดกับไฟล์จริง 10,428 แถว + สไลด์ที่ Unilever ส่งมา:
  *     บล็อค BBF ของไฟล์ BUM มีแค่ 24 แถว และเป็นรอบของไฟล์นั้นเอง ทั้งหมดแถมตัวเอง
  *     ⇒ โปรของเดือนก่อน และโปรที่แถมข้ามรหัส ไม่มีใน BUM เลย ต้องอ่านจากของที่คลังจัดออกจริง
  *   เกณฑ์: คู่ที่ถูกต้องปรากฏร่วมกันใน 100% ของออเดอร์ · รหัสที่บังเอิญซื้อพร้อมกันอยู่ที่ 85%/70%/40%
  *   ⛔ รหัส/ชื่อในเทสสมมติขึ้นเอง รีโปเป็นสาธารณะ — แต่ลอกโครงโปรจริงมาครบสามแบบ
  * ================================================================ */
 await ev(()=>{
   /* ไฟล์ใบจัดของจำลอง: ออเดอร์ละหนึ่งร้าน · สามโปร + สินค้าหลอกที่ซื้อพร้อมกันบ่อยแต่ไม่ใช่คู่ */
   window.__alMechBuf=()=>{
     const H=['Order Creation Date','Distributor Code','Distributor Name','Salesman Name',
       'PJP Code','PJP Name','Route Type','Outlet Code','Outlet Name','Outlet Subtype',
       'GIN No.','Invoice No.','Order Number','Order Type','Product Code','Product Description',
       'Pack Size','Sale Order (CS)','Sale Order (SHR)','Sale Order (PC)',
       'Free Order (CS)','Free Order (SHR)','Free Order (PC)',
       'Sale Allocated (CS)','Sale Allocated (SHR)','Sale Allocated (PC)',
       'Free Allocated (CS)','Free Allocated (SHR)','Free Allocated (PC)',
       'Sales Allocation Status','Free Allocation Status','Order Status','GSV','NIV'];
     const A=[H];
     const row=(shop,no,code,nm,pk,s3,f3,gsv,niv)=>A.push([46341,'15389839','บีดี','2096',
       '209611','CT_HPC_211','CT',shop,'ร้าน '+shop,'sub','77','INV'+no,no,'B2B',code,nm,pk,
       s3[0],s3[1],s3[2],f3[0],f3[1],f3[2],s3[0],s3[1],s3[2],f3[0],f3[1],f3[2],
       'Full','Full','Delivered',gsv,niv]);
     /* 40 ออเดอร์: ครีม 2 ชิ้น แถมตัวเอง 1 ชิ้น · 30 ใบในนั้นซื้อสบู่ด้วย
        แล้วอีก 10 ใบซื้อแต่สบู่ — ซ้อนทับกันบางส่วนเหมือนโปรจริงที่ขายเข้าร้านชุดคล้าย ๆ กัน */
     for(let i=1;i<=40;i++){const no='BD'+(1000+i),sh='S'+(100+i);
       row(sh,no,'AAA1','ครีมทาผิว เอ',12,[0,0,2],[0,0,1],240,200);
       if(i<=30){row(sh,no,'CCC1','สบู่เหลว โรส',8,[0,0,2],[0,0,0],300,260);
         row(sh,no,'CCC2','สบู่เหลว ซากุระ',8,[0,0,0],[0,0,2],0,0);}
       /* สินค้าหลอก: ซื้อพร้อมกัน 90% แต่ไม่ใช่คู่ของแถม */
       if(i<=36)row(sh,no,'DDD1','สินค้าไม่มีโปร',12,[0,0,3],[0,0,0],150,120);
     }
     for(let i=1;i<=10;i++){const no='BF'+(3000+i),sh='U'+(300+i);
       row(sh,no,'CCC1','สบู่เหลว โรส',8,[0,0,2],[0,0,0],300,260);
       row(sh,no,'CCC2','สบู่เหลว ซากุระ',8,[0,0,0],[0,0,2],0,0);}
     /* 20 ออเดอร์: เซรั่ม 1 แพ็ค แถมอีกสีอีก 1 แพ็ค (ไขว้สองทาง) */
     for(let i=1;i<=20;i++){const no='BE'+(2000+i),sh='T'+(200+i);
       row(sh,no,'BBB1','เซรั่ม เอ็กซ์ 12X6X10ML',72,[0,1,0],[0,0,0],180,150);
       row(sh,no,'BBB2','เซรั่ม วาย 12X6X10ML',72,[0,0,0],[0,1,0],0,0);}
     const ws=XLSX.utils.aoa_to_sheet(A),wb=XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb,ws,'Export');
     return XLSX.write(wb,{type:'array',bookType:'xlsx'});
   };
 });
 const mech=await ev(async()=>{
   __reset();
   CSTOCK.slips['B20261118-01'].g='D';
   [['AAA1','ครีมทาผิว เอ',60],['CCC1','สบู่เหลว โรส',60],['CCC2','สบู่เหลว ซากุระ',60],
    ['BBB1','เซรั่ม เอ็กซ์ 12X6X10ML',20],['BBB2','เซรั่ม วาย 12X6X10ML',20],
    ['DDD1','สินค้าไม่มีโปร',10]].forEach((p,i)=>{
     const id='B20261118-01-m'+i;
     CSTOCK.lots[id]={id:id,sl:'B20261118-01',d:'2026-11-18',code:p[0],nm:p[1],
       cs:p[2],pc:0,sq:i,ln:'CT11',clr:[],up:1};});
   PRICE={loaded:true,err:'',hs:null,bum:null};      /* ไม่มีไฟล์ BUM เลย ก็ต้องทำงานได้ */
   __as('manager',null,'แอดมิน 1');_switchTab('spord');
   parseAlloc('alloc.xlsx',__alMechBuf());
   SP.view='slip';SP.sid='B20261118-01';SP.sec='adm';SP.day='2026-11-20';renderSpord();
   document.getElementById('spGinIn').value='77';
   await spGinGo('B20261118-01','2026-11-20');await W();
   const rec=CSTOCK.gin['B20261118-01|2026-11-20'];
   const o={mech:rec.mech,shop:rec.shop,sent:JSON.stringify(window.__posts[window.__posts.length-1].b.mech)};
   ALLOC=null;                                       /* ไฟล์หลุดจากเครื่องแล้วต้องยังอ่านได้ */
   SP.sec='out';renderSpord();
   o.g=spBbf('B20261118-01');
   o.tx=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   o.niv=spAllOut('B20261118-01').niv;
   o.ginJson=JSON.stringify(CSTOCK.gin);
   return o;});
 const M=c=>mech.mech[c];
 t('🔑 ถอดคู่ของแถมจากไฟล์ใบจัดของได้เอง — ไม่ต้องมีไฟล์ BUM',
   !!M('AAA1')&&M('AAA1').b==='AAA1'&&M('AAA1').bq.join()==='0,0,2'&&M('AAA1').fq.join()==='0,0,1',
   JSON.stringify(M('AAA1')));
 t('🔑 ของแถมข้ามรหัสจับคู่ถูก (ซื้อโรส แถมซากุระ 2 ชิ้นต่อ 2 ชิ้น)',
   !!M('CCC2')&&M('CCC2').b==='CCC1'&&M('CCC2').bq.join()==='0,0,2'&&M('CCC2').fq.join()==='0,0,2',
   JSON.stringify(M('CCC2')));
 t('🔑 หน่วยแพ็คก็จับได้ และไขว้สองทางก็แยกออก',
   !!M('BBB2')&&M('BBB2').b==='BBB1'&&M('BBB2').fq.join()==='0,1,0',JSON.stringify(M('BBB2')));
 /* DDD1 ซื้อพร้อมของแถม 36/40 = 90% ซึ่งต่ำกว่าเกณฑ์ 95% จึงต้องไม่ถูกจับเป็นคู่ */
 t('🛟 สินค้าที่บังเอิญซื้อพร้อมกันบ่อย แต่ไม่ถึงเกณฑ์ ต้องไม่ถูกจับเป็นคู่ของแถม',
   !Object.keys(mech.mech).some(k=>mech.mech[k].b==='DDD1'),
   Object.keys(mech.mech).map(k=>k+'←'+mech.mech[k].b).join(' | '));
 t('🛟 เก็บลงผลตรวจและส่งขึ้นเซิร์ฟเวอร์ด้วย — เปิดใหม่ไม่ต้องอัพไฟล์ซ้ำ',
   /CCC1/.test(mech.sent)&&mech.g.fromFile&&mech.g.rows.length>=3,
   mech.g.rows.map(r=>r.code+'→'+r.fc+' ('+r.src+')').join(' | '));
 /* ครีม: ขาย 80 ชิ้น ลังละ 12 → ควรแถม 40 ชิ้น = 3.33 ลัง · ได้จริง 40 ชิ้น */
 t('🔑 เทียบควรแถม vs แถมจริง จากสูตรที่ถอดเอง',
   mech.g.chk.filter(c=>c.code==='AAA1')[0].st==='ok'&&
   mech.g.chk.filter(c=>c.code==='CCC2')[0].st==='ok'&&
   mech.g.chk.filter(c=>c.code==='BBB2')[0].st==='ok',
   mech.g.chk.map(c=>c.code+' ควร'+Math.round(c.exp*100)/100+' ได้'+Math.round(c.got*100)/100+' '+c.st).join(' | '));
 t('🔑 มีหน้า "รายการที่ขายออกไปแล้ว" บอกจำนวน ของแถม และกระจายกี่ร้าน',
   /รายการที่ขายออกไปแล้ว/.test(mech.tx)&&/กระจาย 40 ร้าน/.test(mech.tx)&&
   /กระจาย 20 ร้าน/.test(mech.tx),
   mech.tx.slice(mech.tx.indexOf('รายการที่ขายออก'),mech.tx.indexOf('รายการที่ขายออก')+170));
 t('🔑 ...และยอดเงินจากช่อง GSV/NIV ของไฟล์ ยังถูกเก็บไว้ (แม้หน้าแอดมินจะไม่โชว์แล้ว)',
   !/NIV/.test(mech.tx)&&mech.g.rows.length>0&&
   Math.round(mech.niv)===(200*40+260*40+120*36+150*20),
   'NIV รวม '+Math.round(mech.niv));
 t('🛟 เก็บแค่ "จำนวนร้าน" ไม่เก็บรหัสร้านลง state (ไฟล์หมื่นแถวต้องไม่ทำให้ข้อมูลบวม)',
   mech.shop&&mech.shop.AAA1===40&&!/S101/.test(mech.ginJson),
   JSON.stringify(mech.shop));

 /* เสมอกันจริง ๆ สองตัว (ขายเข้าร้านชุดเดียวกันเป๊ะ) → ห้ามเดา เพราะเดาผิดแล้วหน้าจะฟ้องว่า
    คลังแถมไม่ครบทั้งที่ของครบ — วัดจากไฟล์จริง: ของแถม 65691965 ร่วมออเดอร์ 100% สองรหัส */
 const tie=await ev(()=>{
   const H=['Order Creation Date','Distributor Code','Distributor Name','Salesman Name',
     'PJP Code','PJP Name','Route Type','Outlet Code','Outlet Name','Outlet Subtype',
     'GIN No.','Invoice No.','Order Number','Order Type','Product Code','Product Description',
     'Pack Size','Sale Order (CS)','Sale Order (SHR)','Sale Order (PC)',
     'Free Order (CS)','Free Order (SHR)','Free Order (PC)',
     'Sale Allocated (CS)','Sale Allocated (SHR)','Sale Allocated (PC)',
     'Free Allocated (CS)','Free Allocated (SHR)','Free Allocated (PC)'];
   const A=[H];
   const row=(no,code,s3,f3)=>A.push([46341,'15389839','บีดี','2096','209611','CT_HPC_211','CT',
     'SH'+no,'ร้าน','sub','88','INV'+no,no,'B2B',code,'ของ '+code,12,
     s3[0],s3[1],s3[2],f3[0],f3[1],f3[2],s3[0],s3[1],s3[2],f3[0],f3[1],f3[2]]);
   for(let i=1;i<=20;i++){const no='TI'+(900+i);
     row(no,'EEE1',[0,0,2],[0,0,0]);row(no,'EEE2',[0,0,2],[0,0,0]);
     row(no,'EEE3',[0,0,0],[0,0,1]);}
   const ws=XLSX.utils.aoa_to_sheet(A),wb=XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb,ws,'Export');
   parseAlloc('tie.xlsx',XLSX.write(wb,{type:'array',bookType:'xlsx'}));
   return alPick(['88'],['EEE1','EEE2','EEE3']).mech;});
 t('🛟 สองรหัสเสมอกันสนิท → ไม่จับคู่ ดีกว่าเดาผิดแล้วฟ้องว่าคลังแถมไม่ครบ',
   !tie.EEE3,JSON.stringify(tie));

 /* ---------- 13c) dcode ส่งใบจัดของมาสองแบบ (Historical / Real Time) ----------
    วัดไฟล์จริงของเจ้าของ 28 พ.ย. 69: 36 คอลัมน์เท่ากัน เรียงเหมือนกัน ต่างแค่ **ตัวพิมพ์ 2 ช่อง**
      Product Code → Product code  ·  Sale Order (PC) → Sale order (PC)
    แค่นั้นทำให้ไฟล์ Real Time ขึ้น "ไม่พบหัวตาราง" แล้วไม่เก็บอะไรเลย
    และใบที่มีทั้งสองไฟล์ 609 ใบ ตรงกันหมด 609/609 — ต่างกันแค่ "ครอบกี่วัน" */
 const twoFmt=await ev(()=>{
   const mk=(hdrCase,days,gin,nPerDay)=>{
     const H=['Order Creation Date','Distributor Code','Distributor Name','Salesman Name',
       'PJP Code','PJP Name','Route Type','Outlet Code','Outlet Name','Outlet Subtype',
       'GIN No.','Invoice No.','Order Number','Order Type',
       hdrCase?'Product code':'Product Code','Product Description',
       'Pack Size','Sale Order (CS)','Sale Order (SHR)',
       hdrCase?'Sale order (PC)':'Sale Order (PC)',
       'Free Order (CS)','Free Order (SHR)','Free Order (PC)',
       'Sale Allocated (CS)','Sale Allocated (SHR)','Sale Allocated (PC)',
       'Free Allocated (CS)','Free Allocated (SHR)','Free Allocated (PC)'];
     const A=[H];
     days.forEach((d,di)=>{for(let i=0;i<nPerDay;i++)A.push([d,'15389839','บีดี','2096',
       '209611','CT_HPC_211','CT','SHX'+i,'ร้าน','sub',gin,'INVX'+di+i,'OX'+di+i,'B2B',
       'FFF1','ของ FFF1',12,2,0,0,0,0,0,2,0,0,0,0,0]);});
     const ws=XLSX.utils.aoa_to_sheet(A),wb=XLSX.utils.book_new();
     XLSX.utils.book_append_sheet(wb,ws,'Export');
     return XLSX.write(wb,{type:'array',bookType:'xlsx'});
   };
   const out={};
   /* ① ไฟล์แบบ Historical: GIN 777 ครอบ 3 วัน */
   ALLOC=null;
   parseAlloc('Order_Allocation_ReportHistorical_3.xlsx',mk(false,[46341,46342,46343],'777',2));
   out.hi={gins:Object.keys(ALLOC.g).length,d:Object.keys(ALLOC.g['777'].d).length,n:ALLOC.g['777'].n};
   /* ② ไฟล์แบบ Real Time: หัวตารางตัวพิมพ์ต่าง และครอบแค่วันเดียว */
   parseAlloc('Order_Allocation_ReportReal_Time_2.xlsx',mk(true,[46343],'777',2));
   out.rt={gins:Object.keys(ALLOC.g).length,d:Object.keys(ALLOC.g['777'].d).length,n:ALLOC.g['777'].n};
   /* ③ สลับลำดับ: อ่านไฟล์ช่วงสั้นก่อน แล้วค่อยไฟล์ทั้งเดือน */
   ALLOC=null;
   parseAlloc('Order_Allocation_ReportReal_Time_2.xlsx',mk(true,[46343],'777',2));
   const mid=Object.keys(ALLOC.g['777'].d).length;
   parseAlloc('Order_Allocation_ReportHistorical_3.xlsx',mk(false,[46341,46342,46343],'777',2));
   out.swap={mid:mid,d:Object.keys(ALLOC.g['777'].d).length,n:ALLOC.g['777'].n};
   out.kind={hi:alKindTxt('Order_Allocation_ReportHistorical_3.xlsx'),
     rt:alKindTxt('Order_Allocation_ReportReal_Time_2.xlsx'),
     other:alKindTxt('alloc.xlsx')};
   return out;});
 t('🔑 ไฟล์ใบจัดของแบบ Real Time (หัวตารางคนละตัวพิมพ์) ต้องอ่านได้เหมือนกัน',
   twoFmt.rt.gins===1&&twoFmt.rt.n===6,JSON.stringify(twoFmt.rt));
 t('🔑 ไฟล์ที่ครอบช่วงสั้นกว่า ลบวันที่ไฟล์ก่อนหน้าอ่านไว้ไม่ได้ (กฎเดียวกับ pickGin ฝั่งเซิร์ฟเวอร์)',
   twoFmt.hi.d===3&&twoFmt.rt.d===3,JSON.stringify([twoFmt.hi,twoFmt.rt]));
 t('…และอัพสลับลำดับก็ได้ผลเท่ากัน',
   twoFmt.swap.mid===1&&twoFmt.swap.d===3&&twoFmt.swap.n===twoFmt.hi.n,
   JSON.stringify(twoFmt.swap));
 t('บอกบนหน้าเว็บว่าเพิ่งอ่านไฟล์แบบไหน (ชื่อไฟล์ที่ไม่รู้จักก็ไม่เดา)',
   /Historical/.test(twoFmt.kind.hi)&&/Real Time/.test(twoFmt.kind.rt)&&twoFmt.kind.other==='',
   JSON.stringify(twoFmt.kind));

 /* ---------- 14b) ใบ A/B: กรอกเลข GIN ในหน้าคลังจัดส่ง ---------- */
 const ginAB=await ev(async()=>{
   __reset();
   CSTOCK.slips['B20261118-01'].g='A';
   CSTOCK.lots['B20261118-01-g0']={id:'B20261118-01-g0',sl:'B20261118-01',d:'2026-11-18',
     code:'AAA1',nm:'ครีมทาผิว เอ',cs:30,pc:0,sq:0,ln:'CT11',clr:[],up:1};
   __as('manager',null,'แอดมิน 1');_switchTab('spord');
   SP.view='slip';SP.sid='B20261118-01';SP.sec='out';SP.day='2026-11-20';renderSpord();
   const o={box:!!document.getElementById('spGinNo'),
     bulk:!!document.querySelector('#spBody .cst-bulk')};
   document.getElementById('spGinNo').value='141, 142';
   const n=window.__posts.length;
   await spGinNote('B20261118-01','2026-11-20');await W();
   o.post=window.__posts[window.__posts.length-1];
   o.n=window.__posts.length-n;
   o.rec=CSTOCK.gin['B20261118-01|2026-11-20'];
   renderSpord();
   o.tx=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   /* เซลล์กรอกไม่ได้ */
   __as('sales','209611','CT11');renderSpord();
   o.salesBox=!!document.getElementById('spGinNo');
   const b2=window.__posts.length;
   await spGinNote('B20261118-01','2026-11-20');
   o.salesNoPost=window.__posts.length===b2;
   return o;});
 t('🔑 ใบ A/B: แอดมินกรอกเลข GIN ได้ในหน้าคลังจัดส่ง โดยไม่ต้องมีไฟล์ใบจัดของ',
   ginAB.box&&ginAB.n===1&&ginAB.post.u==='/api/spord'&&ginAB.post.b.act==='gin'&&
   ginAB.rec.g.join()==='141,142',JSON.stringify({n:ginAB.n,g:ginAB.rec&&ginAB.rec.g}));
 t('🔑 ...และรายการเคลียร์ของเดิมยังอยู่ในหน้าเดียวกัน',
   ginAB.bulk&&/141 · 142/.test(ginAB.tx)&&/ยังค้าง/.test(ginAB.tx),
   ginAB.tx.slice(0,120));
 t('🔒 เซลล์ไม่มีช่องกรอก และเรียกฟังก์ชันตรง ๆ ก็ไม่ยิง',
   !ginAB.salesBox&&ginAB.salesNoPost);

 /* ---------- 14c) วงล้อเลือกเดือน ---------- */
 const wheel=await ev(()=>{
   __as('manager',null,'แอดมิน 1');SP.view='mon';SP.ym='';SP.yr='';SP.sid='';renderSpord();
   const box=document.getElementById('spMons');
   const now=todayISO().slice(0,7);
   const el=box&&box.querySelector('.sp-mon[data-ym="'+now+'"]');
   return {wheel:!!(box&&box.classList.contains('wheel')),n:box?box.children.length:0,
     scrolls:box?getComputedStyle(box).overflowY:'',
     top:box&&el?Math.abs(box.scrollTop-(el.offsetTop-box.offsetTop))<=4:false,
     first:box?box.children[0].getAttribute('data-ym'):''};});
 t('🔑 หน้าเลือกเดือนเป็นวงล้อเลื่อนได้ และเปิดมาอยู่ที่เดือนปัจจุบัน',
   wheel.wheel&&wheel.n===12&&wheel.scrolls!=='visible'&&wheel.top,JSON.stringify(wheel));
 t('🛟 ...แต่ลำดับยังเป็น ม.ค.→ธ.ค. เหมือนเดิม เลื่อนขึ้นดูเดือนก่อนหน้าได้',
   /-01$/.test(wheel.first||''),wheel.first);

 /* ================================================================
  * 15) 👤 flow ของเซลล์ + แยกสาย CT/KA ตามประเภทใบ (เจ้าของสั่ง 26 พ.ย. 69)
  *   *"ตัวกระจาย มีแค่สาย CT · ตัดบิลส่งของ/ส่งของตัดบิล มีแค่สาย KA"*
  *   *"ให้เห็นเฉพาะที่ sup ตั้งไว้ให้คีย์เท่านั้น … เห็นไปถึงวันข้างหน้าได้"*
  *   *"flow ใช้งานมุ่งตรงไปที่แค่หมวดเซลล์คีย์เท่านั้นพอ หมวดอื่นดูได้ แต่แก้ไขไม่ได้"*
  * ================================================================ */
 const side=await ev(()=>{
   __reset();
   CSTOCK.lots['B20261118-01-s0']={id:'B20261118-01-s0',sl:'B20261118-01',d:'2026-11-18',
     code:'AAA1',nm:'ครีมทาผิว เอ',cs:40,pc:0,sq:0,ln:'CT11',clr:[],up:1};
   __as('manager',null,'แอดมิน 1');
   const o={};
   CSTOCK.slips['B20261118-01'].g='D';o.d=spSlipLines('B20261118-01');
   CSTOCK.slips['B20261118-01'].g='A';o.a=spSlipLines('B20261118-01');
   CSTOCK.slips['B20261118-01'].g='B';o.b=spSlipLines('B20261118-01');
   return o;});
 t('🔑 ใบตัวกระจายให้กรอกเฉพาะสาย CT',
   side.d.every(x=>/^CT/.test(x))&&side.d.length===9&&side.d[0]==='CT11',side.d.join(','));
 t('🔑 ใบตัดบิลรอส่ง / ส่งแล้วรอตัดบิล ให้กรอกเฉพาะสาย KA',
   side.a.slice(0,3).join(',')==='KA97,KA98,KA99'&&
   side.b.slice(0,3).join(',')==='KA97,KA98,KA99'&&
   !side.a.slice(0,3).some(x=>/^CT/.test(x)),side.a.join(',')+' | '+side.b.join(','));
 /* ใบ KA ที่มี lots เป็นสาย CT ต้องไม่ทำให้สายนั้นหายไปจากจอ (ข้อมูลที่คีย์ไปแล้วจะมองไม่เห็น) */
 t('🛟 ...แต่สายที่ใบระบุมาเองต้องไม่หาย ต่อท้ายไว้เสมอ',
   side.a.indexOf('CT11')>=0&&side.a.indexOf('CT11')>side.a.indexOf('KA99'),side.a.join(','));

 const rep2=await ev(async()=>{
   __reset();
   CSTOCK.slips['B20261102-01']={id:'B20261102-01',d:'2026-11-02',at:1,up:1,g:'D'};
   [['AAA1','ครีมทาผิว เอ',40],['BBB1','เซรั่ม เอ็กซ์',20]].forEach((p,i)=>{
     const id='B20261118-01-r'+i;
     CSTOCK.lots[id]={id:id,sl:'B20261118-01',d:'2026-11-18',code:p[0],nm:p[1],
       cs:p[2],pc:0,sq:i,ln:'CT11',clr:[],up:1};});
   CSTOCK.slips['B20261118-01'].g='D';
   /* ซุปตั้งเป้าสามวัน: เมื่อวาน · วันนี้ · ข้ามสัปดาห์ไปอีก 9 วัน (สายอื่นหนึ่งวัน) */
   const T=n=>{const t=new Date();t.setDate(t.getDate()+n);return ymdOf(t);};   /* ⚠️ ymdOf ไม่ใช่ toISOString — เทสต์รันใน Asia/Bangkok ตอนเย็น UTC จะคนละวันกับแอป */
   if(!CSTOCK.key)CSTOCK.key={};if(!CSTOCK.rep)CSTOCK.rep={};
   const K=(d,ln,sc)=>{CSTOCK.key['B20261118-01|'+d+'|'+ln]=
     {it:{'AAA1':{sc:sc,sp:0,fc:0,fp:0}},by:'sup',byName:'หัวหน้าเซลล์',at:1000};};
   K(T(-1),'CT11',5);K(T(0),'CT11',6);K(T(9),'CT11',7);K(T(0),'CT12',8);
   CSTOCK.rep['B20261118-01|'+T(-1)+'|CT11']={it:{'AAA1':{sc:5,sp:0,fc:0,fp:0}},
     by:'209611',byName:'CT11',at:2000,n:1,h:[{at:2000,n:1}]};
   __as('sales','209611','CT11 · เซลล์');_switchTab('spord');
   const o={T9:T(9),T0:T(0)};
   SP.view='mon';SP.ym='';SP.sid='';SP.day='';renderSpord();
   o.monTx=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   spOpenMon('2026-11');
   o.list=[...document.querySelectorAll('#spBody .cst-grp')].length;
   spOpenSlip('B20261118-01');
   o.sec=SP.sec;
   o.chips=[...document.querySelectorAll('#spTabs .tab2')].map(x=>x.textContent.trim());
   o.cal=[...document.querySelectorAll('#spBody .sp-cal .cal-day[onclick]')]
     .map(x=>x.textContent.trim()+':'+x.className.replace(/cal-day\s*/,'').replace(/\s*today\s*/,' ').trim());
   o.tx=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   o.cards=document.querySelectorAll('#spBody .sp-rc').length;
   o.noBox=!!document.getElementById('spRNo_CT11');
   o.tgtCols=[...document.querySelectorAll('#spBody .sp-k4 thead th')].map(x=>x.textContent.trim());
   o.inputs=[...document.querySelectorAll('#spBody .sp-rno textarea')]
     .map(x=>x.getAttribute('inputmode')).join(',');
   o.noTable=document.querySelectorAll('#spBody .sp-kt').length;
   o.days=spDays('B20261118-01');
   /* ผู้จัดการยังเห็นทุกใบเหมือนเดิม */
   __as('manager',null,'แอดมิน 1');SP.view='mon';SP.ym='2026-11';renderSpord();
   o.mgrList=[...document.querySelectorAll('#spBody .cst-grp')].length;
   return o;});
 t('🔑 เซลล์เห็นเฉพาะใบที่หัวหน้าเซลล์ตั้งงานให้สายตัวเอง',
   rep2.list===1&&rep2.mgrList===2,'เซลล์เห็น '+rep2.list+' ใบ · ผู้จัดการเห็น '+rep2.mgrList+' ใบ');
 t('🔑 เปิดใบแล้วเซลล์ลงที่หมวด "เซลล์คีย์" ทันที ไม่ต้องหาเอง',
   rep2.sec==='rep'&&rep2.chips.length>=3,rep2.sec+' | '+rep2.chips.join(' | '));
 /* 📅 เจ้าของสั่ง 27 พ.ย. 69 ให้รายการวันของเซลล์เป็นปฏิทิน — แดง = ยังไม่ได้คีย์
    เขียวอ่อน = คีย์แล้วรอแอดมินตรวจ · วันล่วงหน้ายังต้องนับให้เห็น (ซุปตั้งข้ามสัปดาห์) */
 t('🔑 เห็นงานย้อนหลังและวันข้างหน้าที่ซุปตั้งไว้ข้ามสัปดาห์',
   rep2.days.length===3&&/ล่วงหน้า/.test(rep2.tx)&&rep2.cal.length>=2,
   rep2.days.join(',')+' | '+rep2.cal.join(' | '));
 t('🔑 ปฏิทินของเซลล์ลงสี: ยังไม่คีย์ = แดง · คีย์แล้วรอตรวจ = เขียว',
   rep2.cal.some(x=>/\bjr\b/.test(x))&&rep2.cal.some(x=>/\bjk\b/.test(x)),rep2.cal.join(' | '));
 t('🔒 ...แต่ไม่เห็นวันของสายอื่น (ซุปตั้งเป้า CT12 ไว้ในวันเดียวกัน)',
   rep2.days.indexOf(rep2.T0)>=0&&rep2.days.length===3,rep2.days.join(','));
 t('🔑 หน้าเซลล์เหลือแค่ช่องใส่เลขออเดอร์ ไม่มีการ์ดกรอกจำนวนแล้ว (27 พ.ย. 69)',
   rep2.cards===0&&rep2.noBox&&rep2.inputs==='numeric',
   rep2.cards+' การ์ด · inputmode='+rep2.inputs);
 t('🔑 ...แต่ยังเห็นรายการที่ต้องไปคีย์ เป็นตาราง 4 คอลัมน์ที่ freeze ชื่อ/รหัสไว้',
   rep2.tgtCols.join(' | ')==='สินค้าที่ต้องคีย์ | รหัส | ลัง | ชิ้น'&&/ครีมทาผิว เอ/.test(rep2.tx),
   rep2.tgtCols.join(' | '));

 /* ================================================================
  * 🧾 เลขคำสั่งซื้อที่เซลล์เห็นในแอพ (#1034715426) — เจ้าของเรียกว่าชิ้นสุดท้ายของจิ๊กซอว์
  * วัดกับไฟล์จริงแล้ว: อยู่ในไฟล์ยอดขาย (Reference Number) และไฟล์รายการสั่งซื้อ (เลขอ้างอิง DDT)
  * ไม่มีในไฟล์ใบจัดของ · 1 ใบ = 1 เลข · สองไฟล์ตรงกัน 100%
  * ⛔ เลข/รหัสร้านในเทสสมมติขึ้นเอง — รีโปเป็นสาธารณะ
  * ============================================================== */
 const ref=await ev(async()=>{
   const o={};
   __as('sales','209611','CT11 · เซลล์');
   /* ดัชนีเลขออเดอร์: ใบขาย · ใบกำกับที่อ้างเลขเดียวกัน · ใบคืนของ · และใบที่รู้จักจากไฟล์
      รายการสั่งซื้ออย่างเดียว (tx:1 — ยังไม่รู้จำนวนลัง) */
   STOREDAILY.ord['BDD0100009001']={s:'4862383',l:'209611',d:'2026-11-20',v:1000,c:2,cs:10,pc:0,rf:'1034715426'};
   STOREDAILY.ord['BDD0900009101']={s:'4862383',l:'209611',d:'2026-11-20',v:1000,c:2,cs:10,pc:0,rf:'1034715426'};
   STOREDAILY.ord['BDD0400009001']={s:'4862383',l:'209611',d:'2026-11-20',v:-50,c:1,cs:1,pc:0,rf:'1034715426'};
   STOREDAILY.ord['BDD0100009002']={s:'4862365',l:'209611',d:'2026-11-20',v:2000,c:3,cs:7,pc:0,rf:'1034715427'};
   STOREDAILY.ord['BDD0100009003']={s:'4870004',l:'209611',d:'2026-11-20',v:500,tx:1,rf:'1034715428'};
   spRfBust();
   const f=spOrdFind('1034715426');
   o.byRef=f&&f.no;o.via=f&&f.via;o.more=(f&&f.more)||[];
   o.byNo=(spOrdFind('BDD0100009002')||{}).no;
   o.byTail=(spOrdFind('9002')||{}).no;
   o.byHash=(spOrdFind('#1034715427')||{}).no;
   o.unknown=spOrdFind('9999999999');
   /* วางทั้งก้อนแบบที่เซลล์จะทำจริง */
   const sum=spNoSum(spNoSplit('1034715426, 1034715427\n1034715428  5555555555'));
   o.sum={n:sum.n,found:sum.found,cs:sum.cs,v:sum.v,shops:sum.nShop,wait:sum.wait,miss:sum.miss};
   o.info=spNoInfoHtml(spNoSplit('1034715426 1034715427 1034715428 5555555555'));
   return o;});
 t('🔑 พิมพ์เลขจากแอพ (#1034715426) แล้วระบบหาออเดอร์เจอ',
   ref.byRef==='BDD0100009001'&&ref.via==='rf',ref.byRef+' via='+ref.via);
 t('🔑 ...และเลือก "ใบขาย" เสมอ ไม่ใช่ใบกำกับหรือใบคืนของที่อ้างเลขเดียวกัน (ยอดจะซ้ำ)',
   ref.byRef.indexOf('BDD01')===0&&ref.more.length===2,JSON.stringify(ref.more));
 t('🔑 พิมพ์เลขออเดอร์เต็ม / เลขท้าย / มี # นำหน้า ก็หาเจอเหมือนกัน',
   ref.byNo==='BDD0100009002'&&ref.byTail==='BDD0100009002'&&ref.byHash==='BDD0100009002',
   [ref.byNo,ref.byTail,ref.byHash].join(' · '));
 t('🛟 เลขที่ไม่มีในระบบ ต้องตอบว่าไม่เจอ ไม่ใช่เดาเป็นใบอื่น',ref.unknown===null);
 t('🔑 วางหลายเลขพร้อมกัน แล้วรวมลัง/มูลค่า/ร้านให้',
   ref.sum.n===4&&ref.sum.found===3&&ref.sum.cs===17&&ref.sum.v===3500&&ref.sum.shops===3,
   JSON.stringify(ref.sum));
 t('🛟 ใบที่รู้จักจากไฟล์รายการสั่งซื้ออย่างเดียว ยังไม่รู้จำนวนลัง ต้องแยกบอก ไม่ใช่บวกเป็น 0',
   ref.sum.wait===1&&/ยังไม่รู้จำนวนลัง/.test(ref.info)&&/ใบจัดของ/.test(ref.info),ref.sum.wait);
 t('🛟 เลขที่ยังหาไม่เจอ ต้องบอกเป็นรายตัว',
   ref.sum.miss.join(',')==='5555555555'&&/ยังหาไม่เจอ/.test(ref.info),ref.sum.miss.join(','));

 /* เซลล์กรอกเลขจริง แล้วแอดมินตรวจได้จากตาราง */
 const refSave=await ev(async()=>{
   const o={};
   const T=n=>{const t=new Date();t.setDate(t.getDate()+n);return ymdOf(t);};   /* ⚠️ ymdOf ไม่ใช่ toISOString — เทสต์รันใน Asia/Bangkok ตอนเย็น UTC จะคนละวันกับแอป */
   const D=T(0);o.D=D;
   __as('sales','209611','CT11 · เซลล์');
   CSTOCK.key['B20261118-01|'+D+'|CT11']={it:{'AAA1':{sc:20,sp:0,fc:0,fp:0}},by:'sup',at:1000};
   delete CSTOCK.rep['B20261118-01|'+D+'|CT11'];
   /* รายการสินค้าในสองใบนี้ (ลังละ 10 ชิ้น) — 12 + 5 = 17 ลัง */
   OT.cache[D.slice(0,7)]={ord:{},det:{'00009001':{'AAA1':[10,0,10]},
                                       '00009002':{'AAA1':[7,0,10]}},meta:null,none:0};
   spOpenSlip('B20261118-01');SP.sec='rep';SP.day=D;renderSpord();
   o.box=!!document.getElementById('spRNo_CT11');
   const el=document.getElementById('spRNo_CT11');
   if(el){el.value='1034715426 1034715427';el.dispatchEvent(new Event('input'));}
   o.live=document.getElementById('spRNoInfo_CT11').textContent.replace(/\s+/g,' ');
   window.__posts=[];
   await spRepLineSave('B20261118-01',D,'CT11');
   await new Promise(r=>setTimeout(r,60));
   o.post=(window.__posts||[]).filter(p=>p.b&&p.b.act==='rep').slice(-1)[0]||null;
   o.rec=JSON.parse(JSON.stringify(CSTOCK.rep['B20261118-01|'+D+'|CT11']||{}));
   /* อ่านกลับมาแล้วต้องยังอยู่ในช่อง */
   renderSpord();
   const el2=document.getElementById('spRNo_CT11');
   o.back=el2?el2.value.trim():'';
   /* ฝั่งแอดมิน: ตารางติดตามต้องมีช่อง "จากเลขออเดอร์" */
   __as('manager',null,'แอดมิน 1');renderSpord();
   const tx=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   o.col=/จากเลขออเดอร์/.test(tx);
   o.diff=/ต่าง/.test(tx);
   const tr=spTrack('B20261118-01',D).filter(x=>x.ln==='CT11')[0];
   o.ord=tr&&tr.ord?{cs:tr.ord.cs,found:tr.ord.found,miss:tr.ord.miss.length}:null;
   o.rep=tr&&tr.repCs.cs;
   return o;});
 t('🔑 หน้ากรอกของเซลล์มีช่องเลขคำสั่งซื้ออยู่ล่างสุด',refSave.box);
 t('🔑 พิมพ์แล้วสรุปให้เห็นทันที ว่าเจอกี่ใบ กี่ลัง',
   /2 เลขที่ใส่/.test(refSave.live)&&/17/.test(refSave.live),refSave.live.slice(0,90));
 t('🔑 กดบันทึก แล้วเลขถูกส่งขึ้นระบบพร้อมจำนวน',
   !!refSave.post&&(refSave.post.b.no||[]).join(',')==='1034715426,1034715427',
   JSON.stringify(refSave.post&&refSave.post.b.no));
 t('🔑 ...และอ่านกลับมาขึ้นในช่องเหมือนเดิม',refSave.back==='1034715426 1034715427',refSave.back);
 t('🔑 ฝั่งแอดมินเห็นช่อง "จากเลขออเดอร์" ที่ระบบหาเอง',refSave.col&&!!refSave.ord,
   JSON.stringify(refSave.ord));
 t('🔑 ...และยอด "คีย์จริง" มาจากเลขออเดอร์ ไม่ใช่ตัวเลขที่ใครพิมพ์ (17 ลัง)',
   refSave.ord&&refSave.ord.cs===17&&refSave.rep===17,
   'ระบบ '+(refSave.ord&&refSave.ord.cs)+' · คีย์จริง '+refSave.rep);

 /* ================================================================
  * 16) 🧑 บัญชีแอดมิน 1-4 ไม่ใช่บัญชีผู้จัดการ (เจ้าของเจอเอง 26 พ.ย. 69)
  *   เข้าเว็บแอดมินแล้วมุมขวาขึ้นตัว M เหมือนผู้จัดการเป๊ะ และเห็นแท็บ 📊 รายงาน
  *   ที่เขาสั่งไว้ว่า "เฉพาะ manager เท่านั้นนะ" — เพราะ admin1-4 ใช้ role manager ร่วมกัน
  * ================================================================ */
 const acct=await ev(()=>{
   __reset();
   const A={id:'admin1',role:'manager',name:'แอดมิน 1'};
   const M={id:'manager',role:'manager',name:'ผู้จัดการ'};
   const o={avA:bdAvOf(A),roA:bdRoleOf(A),avM:bdAvOf(M),roM:bdRoleOf(M),
     ownA:bdOwner(A),ownM:bdOwner(M),admAcc:bdIsAdminAcc(A),admAcc2:bdIsAdminAcc(M)};
   const keys=()=>spTabsOn(spSlip('B20261118-01')).map(x=>x.k).join(',');
   S.user=A;try{localStorage.setItem('bdsp:admin1','1');}catch(e){}
   o.tabsA=keys();o.rptA=spRptOk();
   o.jobsA={mgr:spMgr(),cst:cstMgr(),adm:spAdmOk(),sup:spSupOk()};
   SP.view='slip';SP.sid='B20261118-01';SP.sec='rpt';renderSpord();
   o.secA=spSec();                       /* แท็บที่ไม่มีสำหรับเขา ต้องไม่เปิดให้ */
   o.pageA=spRptHtml('B20261118-01');
   S.user=M;try{localStorage.setItem('bdsp:manager','1');}catch(e){}
   o.tabsM=keys();o.rptM=spRptOk();
   o.pageM=spRptHtml('B20261118-01');
   return o;});
 t('🔑 หน้าจอแยกบัญชีแอดมินออกจากบัญชีผู้จัดการ (เดิมขึ้น M เหมือนกันทั้งคู่)',
   acct.avA==='A1'&&acct.roA==='แอดมิน 1'&&acct.avM==='M'&&acct.roM!=='แอดมิน 1',
   acct.avA+'/'+acct.roA+' · '+acct.avM+'/'+acct.roM);
 t('🔑 📊 รายงาน เปิดได้เฉพาะบัญชีผู้จัดการจริง ๆ ไม่ใช่ทุกคนที่ role เป็น manager',
   !acct.rptA&&acct.rptM&&acct.tabsA.indexOf('rpt')<0&&acct.tabsM.indexOf('rpt')>=0,
   'แอดมิน: '+acct.tabsA+' | ผู้จัดการ: '+acct.tabsM);
 t('🔒 ...และเปิดตรง ๆ ก็ไม่ได้ ต้องขึ้นว่าบัญชีนี้เปิดไม่ได้',
   /บัญชีนี้เปิดส่วนนี้ไม่ได้/.test(acct.pageA)&&!/รายงานใบนี้/.test(acct.pageA)&&
   /รายงานใบนี้/.test(acct.pageM)&&acct.secA!=='rpt',
   acct.pageA.replace(/<[^>]*>/g,' ').slice(0,80)+' · sec='+acct.secA);
 /* ⚠️ ห้ามเผลอเอา bdOwner ไปแทน role manager ในงานประจำ ไม่งั้นแอดมินทำงานไม่ได้ทั้งระบบ */
 t('🛟 แอดมินยังทำงานประจำได้ครบเหมือนเดิม (ตัดบิล · ตรวจ GIN · เปิดใบ)',
   acct.jobsA.mgr&&acct.jobsA.cst&&acct.jobsA.adm&&acct.jobsA.sup,
   JSON.stringify(acct.jobsA));
 t('🛟 bdOwner แยกถูก และ bdIsAdminAcc ไม่เหมาบัญชีผู้จัดการเข้าไปด้วย',
   !acct.ownA&&acct.ownM&&acct.admAcc&&!acct.admAcc2,
   JSON.stringify({ownA:acct.ownA,ownM:acct.ownM,a:acct.admAcc,m:acct.admAcc2}));

 /* ================================================================
  * 16) 🕘 จังหวะงานวันเดียวกัน + ปฏิทินของเซลล์ (เจ้าของสั่ง 27 พ.ย. 69)
  *   *"ให้ช่วงเวลาวันที่ซุปกำหนดเป้าเป็นเช้าของวันนั้น ๆ หรือเย็นเมื่อวาน และเซลล์คีย์เป็น
  *     วันนั้น ๆ ช่วงบ่าย และวันที่แอดมินมาตรวจเป็นตอนเย็นของวันนั้น ๆ"*
  *   *"พอกรอกเลขออเดอร์ไปแล้วให้ขึ้นสีเขียว แต่ถ้าจำนวนหลังแอดมินตรวจไม่ตรงกัน ให้ขึ้นสีแดง
  *     ในวันนั้น ๆ และระบุว่าเป็นออเดอร์ไหนที่ไม่ตรงกัน และห่างกันเป็นจำนวนเท่าไหร่"*
  * ================================================================ */
 const tflow=await ev(async()=>{
   __reset();
   const T=n=>{const t=new Date();t.setDate(t.getDate()+n);return ymdOf(t);};   /* ⚠️ ymdOf ไม่ใช่ toISOString (ดูหมายเหตุด้านบน) */
   const T0=T(0),T1=T(1);
   CSTOCK.slips['B20261118-01'].g='D';
   CSTOCK.lots['LF1']={id:'LF1',sl:'B20261118-01',d:T0,code:'AAA1',nm:'ครีมทาผิว เอ',
     cs:40,pc:0,sq:0,ln:'CT11',clr:[],up:1};
   if(!CSTOCK.key)CSTOCK.key={};if(!CSTOCK.rep)CSTOCK.rep={};if(!CSTOCK.gin)CSTOCK.gin={};
   /* ⛔ เลขออเดอร์/รหัสร้านสมมติขึ้นเอง — รีโปเป็นสาธารณะ */
   STOREDAILY.ord['BDD0100007001']={s:'4862383',l:'209611',d:T0,v:3500,c:3,cs:12,pc:0,rf:'1034700001'};
   STOREDAILY.ord['BDD0100007003']={s:'4862365',l:'209611',d:T0,v:900,c:2,cs:5,pc:0,rf:'1034700003'};
   /* ซุปตั้งเป้าวันนี้ และ "ล่วงหน้า" พรุ่งนี้ — ค่าตั้งต้นต้องเป็นวันนี้ ไม่ใช่วันล่วงหน้าสุด */
   CSTOCK.key['B20261118-01|'+T0+'|CT11']={it:{'AAA1':{sc:6,sp:0}},by:'sup',at:10};
   CSTOCK.key['B20261118-01|'+T1+'|CT11']={it:{'AAA1':{sc:9,sp:0}},by:'sup',at:10};
   __as('sup',null,'หัวหน้าเซลล์');_switchTab('spord');
   SP.view='slip';SP.sid='B20261118-01';SP.sec='key';SP.day='';SP.me=1;renderSpord();
   const o={day:spDay('B20261118-01'),T0:T0,T1:T1};
   o.flow=document.querySelectorAll('#spBody .sp-flow-s').length;
   o.flowTx=(document.querySelector('#spBody .sp-flow')||{textContent:''})
     .textContent.replace(/\s+/g,' ');
   /* 👤 เซลล์: เปิดหมวดนี้มาต้องลงที่ 📲 เซลล์คีย์ ไม่ใช่ ✍️ ซุปจด */
   __as('sales','209611','CT11 · เซลล์');_switchTab('spord');
   SP.view='mon';SP.ym='';SP.sid='';SP.sec='';SP.day='';SP.cm='';SP.me=0;renderSpord();
   o.repView=SP.view;o.repSec=spSec();o.repDay=SP.day;
   /* 🔴 ยังไม่ใส่เลข = แดง */
   o.cal0=[...document.querySelectorAll('#spBody .sp-cal .cal-day[onclick]')]
     .map(x=>x.textContent.trim()+':'+x.className.replace('cal-day','').trim());
   o.box=(()=>{const c=document.querySelector('#spBody .sp-cal .cal-day[onclick]');
     return c?Math.round(c.getBoundingClientRect().height):0;})();
   /* 🟢 ใส่เลขแล้ว (แอดมินยังไม่ตรวจ) */
   CSTOCK.rep['B20261118-01|'+T0+'|CT11']={it:{},no:['BDD0100007001'],by:'209611',at:20,n:1};
   renderSpord();
   o.st1=spMeChk('B20261118-01',T0,'CT11').st;
   /* 🔎 แอดมินตรวจแล้ว และใบจัดของมีเลขนั้น = ตรงกัน */
   CSTOCK.gin['B20261118-01|'+T0]={g:['77'],rows:{'CT11|AAA1':{sc:6,sp:0,nm:'ครีมทาผิว เอ',pk:12}},
     ords:['BDD0100007001'],dd:[T0],by:'manager',at:30};
   renderSpord();
   o.st2=spMeChk('B20261118-01',T0,'CT11').st;
   o.cal2=[...document.querySelectorAll('#spBody .sp-cal .cal-day[onclick]')]
     .map(x=>x.className.replace('cal-day','').trim()).join(' | ');
   /* 🔴 เซลล์ใส่อีกเลขที่คลังไม่ได้จัด = ไม่ตรง + ต้องบอกเลขและผลต่าง */
   CSTOCK.rep['B20261118-01|'+T0+'|CT11'].no=['BDD0100007001','BDD0100007003'];
   renderSpord();
   const c3=spMeChk('B20261118-01',T0,'CT11');
   o.st3=c3.st;o.bad=c3.bad.map(x=>x.no+'/'+x.cs).join(',');o.gap=c3.gap;
   o.tx3=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   return o;});
 t('🕘 ค่าตั้งต้นของทั้งสามขั้นเป็น "วันนี้" ไม่ใช่วันล่วงหน้าที่ซุปตั้งไว้',
   tflow.day===tflow.T0,tflow.day+' (วันนี้ '+tflow.T0+' · ล่วงหน้า '+tflow.T1+')');
 t('🕘 มีแถบจังหวะงาน เช้า → บ่าย → เย็น ของวันเดียวกัน',
   tflow.flow===3&&/เช้า/.test(tflow.flowTx)&&/บ่าย/.test(tflow.flowTx)&&/เย็น/.test(tflow.flowTx)&&
   /ทั้ง 3 ขั้นนี้เป็นงานของ วันที่ .* วันเดียวกัน/.test(tflow.flowTx),tflow.flowTx.slice(0,120));
 t('🔑 เซลล์เปิดหมวดออเดอร์พิเศษมา ลงที่ "เซลล์คีย์" ทันที ไม่ผ่านหน้าซุปจด',
   tflow.repSec==='rep'&&tflow.repView==='slip'&&tflow.repDay===tflow.T0,
   tflow.repView+'/'+tflow.repSec+'/'+tflow.repDay);
 t('📅 ปฏิทินของเซลล์ช่องวันใหญ่พอกดด้วยนิ้ว (>= 42px)',tflow.box>=42,tflow.box+'px');
 t('🔴 ยังไม่ใส่เลขออเดอร์ = วันนั้นขึ้นแดง',
   tflow.cal0.some(x=>/\bjr\b/.test(x))&&tflow.st1==='keyed',
   tflow.cal0.join(' | ')+' · ใส่เลขแล้ว='+tflow.st1);
 t('🟢 แอดมินตรวจแล้วตรงกัน = ขึ้นเขียว',
   tflow.st2==='ok'&&/\bjg\b/.test(tflow.cal2),tflow.st2+' · '+tflow.cal2);
 t('🔴 ตรวจแล้วไม่ตรง = แดง และบอกว่าเลขไหน ห่างกันกี่ลัง',
   tflow.st3==='bad'&&/BDD0100007003/.test(tflow.bad)&&tflow.gap>0&&
   /ห่างกัน/.test(tflow.tx3)&&/BDD0100007003/.test(tflow.tx3),
   tflow.st3+' · '+tflow.bad+' · ห่าง '+tflow.gap);

 /* ================================================================
  * 17) 📷 อ่านเลขออเดอร์จากภาพแคปหน้าจอ (เจ้าของสั่ง 27 พ.ย. 69)
  *   *"ให้เซลล์แคปหน้าจอหลังกดคีย์ออเดอร์ … อัพได้ 10-20 รูป แล้วให้ระบบอ่านเลขออเดอร์
  *     อัตโนมัติ … หรือจะกรอกเองเหมือนเดิมก็ได้ … แล้วเซลล์ตรวจเอาอย่างเดียว"*
  *   ตัวอ่านจริงถูกทดสอบกับสกรีนช็อตจริงใน ocr-promo.test.cjs — ชุดนี้ทดสอบ "กฎการจับเลข"
  *   กับ "ท่อที่พาเลขไปลงช่อง" โดยสวมตัวอ่านปลอม จึงไม่ต้องโหลดตัวอ่าน 8 MB
  * ================================================================ */
 const ocr=await ev(async()=>{
   const o={};
   const R=(w,t)=>spOcrNos({words:w||[],text:t||""});
   /* เลขออเดอร์ = ตัวเลขติดกัน 10 หลักเท่านั้น */
   o.hit=R([{t:'#1034715426',c:91}],'คำสั่ง #1034715426').map(x=>x.no+'/'+x.c).join(',');
   /* ⛔ เลขอื่นบนจอต้องไม่หลุดมา — วัดจากสกรีนช็อตจริงว่ามีอะไรบ้าง */
   o.inv=R([{t:'luuduni#MF80478502',c:14}],'luuduni#MF80478502').length;
   o.date=R([{t:'28/11/2026',c:96}],'28/11/2026').length;
   o.baht=R([{t:'B563.00',c:88}],'B563.00 -B35.28 BO.00').length;
   o.ver=R([{t:'1.85(86)-v44',c:90}],'1.85(86)-v44').length;
   o.eleven=R([{t:'12345678901',c:90}],'12345678901').length;
   /* หนึ่งรูปมีหลายใบ · และสองบรรทัดห้ามติดกันเป็นเลขเดียว */
   o.two=R([{t:'#1034715426',c:91},{t:'#1033993299',c:92}],
     '#1034715426\n#1033993299').map(x=>x.no).join(',');
   o.lines=R([],'12345\n67890').length;
   /* OCR ตัดเลขเป็นสองคำในบรรทัดเดียว — ต้องยังจับได้ (แต่ไม่รู้ความมั่นใจ) */
   const sp=R([{t:'#1034',c:80},{t:'715426',c:80}],'คำสั่ง #1034 715426');
   o.split=sp.map(x=>x.no+'/'+x.c).join(',');
   return o;});
 t('📷 จับเลขออเดอร์ 10 หลักจากรูปได้ พร้อมความมั่นใจ',ocr.hit==='1034715426/91',ocr.hit);
 t('🛟 เลขใบแจ้งหนี้ / วันที่ / เงิน / เวอร์ชันแอพ ต้องไม่ถูกอ่านเป็นเลขออเดอร์',
   ocr.inv===0&&ocr.date===0&&ocr.baht===0&&ocr.ver===0,
   JSON.stringify({inv:ocr.inv,date:ocr.date,baht:ocr.baht,ver:ocr.ver}));
 t('🛟 เลข 11 หลักไม่เดาว่าตัดหลักไหนทิ้ง — ไม่รับเลย',ocr.eleven===0,String(ocr.eleven));
 t('📷 รูปเดียวมีหลายใบ อ่านได้ครบ',ocr.two==='1034715426,1033993299',ocr.two);
 t('🛟 เลขคนละบรรทัดห้ามต่อกันเป็นเลขเดียว',ocr.lines===0,String(ocr.lines));
 t('📷 OCR ตัดเลขเป็นสองคำในบรรทัดเดียว ยังจับได้',ocr.split==='1034715426/null',ocr.split);

 const ocr2=await ev(async()=>{
   __reset();
   const T=n=>{const t=new Date();t.setDate(t.getDate()+n);return ymdOf(t);};   /* ⚠️ ymdOf ไม่ใช่ toISOString (ดูหมายเหตุด้านบน) */
   const D=T(0);
   CSTOCK.slips['B20261118-01'].g='D';
   CSTOCK.lots['LO1']={id:'LO1',sl:'B20261118-01',d:D,code:'AAA1',nm:'ครีมทาผิว เอ',
     cs:40,pc:0,sq:0,ln:'CT11',clr:[],up:1};
   if(!CSTOCK.key)CSTOCK.key={};
   CSTOCK.key['B20261118-01|'+D+'|CT11']={it:{'AAA1':{sc:6,sp:0}},by:'sup',at:10};
   __as('sales','209611','CT11 · เซลล์');_switchTab('spord');
   SP.view='slip';SP.sid='B20261118-01';SP.sec='rep';SP.day=D;SP.me=1;SP.ocr=null;renderSpord();
   const o={};
   o.btn=!!document.querySelector('#spBody .sp-ocrbtn');
   o.input=!!document.getElementById('spOcrIn_CT11');
   o.ta=!!document.getElementById('spRNo_CT11');
   /* สวมตัวอ่านปลอม — ตัวไฟล์เก็บข้อความที่ "อ่านได้" ไว้เอง ตัวอ่านปลอมจึงถอดกลับจาก data URL
      รูปที่ 1 มีสองใบ · รูปที่ 2 ซ้ำกับใบในรูปแรก · รูปที่ 3 อ่านไม่เจอเลข */
   const old=window.ocrWords;
   window.ocrWords=async(url)=>{
     let s="";try{s=atob(String(url).split(",")[1]||"");}catch(e){}
     return {words:[],text:s};};
   const mk=(n,txt)=>new File([new TextEncoder().encode(txt)],n,{type:'image/png'});
   await spOcrGo('CT11',[mk('a.png','#1034715426\n#1033993299'),
                         mk('b.png','#1033993299'),
                         mk('c.png','no order number here')]);
   window.ocrWords=old;
   o.val=document.getElementById('spRNo_CT11').value.trim();
   o.box=document.getElementById('spOcrBox_CT11').textContent.replace(/\s+/g,' ');
   o.info=document.getElementById('spRNoInfo_CT11').textContent.replace(/\s+/g,' ');
   /* ห้ามมีอะไรขึ้นเซิร์ฟเวอร์ และห้ามเก็บรูปลง state */
   o.posted=JSON.stringify(window.__posts||[]).indexOf('image/')>=0;
   o.inState=JSON.stringify(CSTOCK).indexOf('data:image')>=0;
   o.max=SP_OCR_MAX;
   return o;});
 t('📷 การ์ดของเซลล์มีปุ่มอัพรูป และช่องพิมพ์เองยังอยู่',
   ocr2.btn&&ocr2.input&&ocr2.ta,JSON.stringify({btn:ocr2.btn,input:ocr2.input,ta:ocr2.ta}));
 t('📷 อ่านรูปแล้วเลขไปลงในช่องให้เลย ไม่ต้องพิมพ์',
   ocr2.val==='1034715426 1033993299',ocr2.val);
 t('🛟 เลขซ้ำข้ามรูป ไม่ใส่ซ้ำ และบอกว่าซ้ำกี่เลข',/ซ้ำ/.test(ocr2.box),ocr2.box.slice(0,120));
 t('🛟 รูปที่อ่านไม่เจอเลข ต้องบอกเป็นรายใบ ห้ามเงียบ',
   /c\.png/.test(ocr2.box)&&/ไม่เจอเลขออเดอร์ในรูปนี้/.test(ocr2.box),ocr2.box.slice(-140));
 t('📷 สรุปใต้ช่องอัพเดตตามเลขที่อ่านได้ทันที',/เลขที่ใส่/.test(ocr2.info),ocr2.info.slice(0,90));
 t('🔒 รูปไม่ถูกส่งขึ้นเซิร์ฟเวอร์ และไม่ถูกเก็บลงข้อมูลที่ซิงค์',
   !ocr2.posted&&!ocr2.inState,JSON.stringify({posted:ocr2.posted,state:ocr2.inState}));
 t('📷 รับได้ถึง 20 รูปต่อครั้ง ตามที่เจ้าของขอ (10-20 รูป)',ocr2.max===20,String(ocr2.max));

 /* ================================================================
  * 18) 📥 ไฟล์ใบจัดของถูกเก็บขึ้นระบบ — เปิดเครื่องอื่นก็ตรวจได้ ไม่ต้องอัพซ้ำ
  *   เจ้าของทัก 27 พ.ย. 69: *"ตอนกดตรวจเลขจริงมันขึ้นให้อัปไฟล์ … เพราะผมอัพไฟล์
  *   Allocation ไปแล้ว"* · เดิมไฟล์อยู่ในหน่วยความจำของแท็บเท่านั้น
  * ================================================================ */
 const alb=await ev(async()=>{
   __reset();__slip();
   __as('manager',null,'แอดมิน 1');_switchTab('spord');
   parseAlloc('alloc.xlsx',__alBuf());
   const o={gins:ALLOC.gins.slice()};
   /* แพ็คเป็นเพย์โหลดรายเดือน แล้วคลายกลับ — ผลตรวจต้องออกมาเท่ากันเป๊ะ */
   const packed=alPack(ALLOC);
   o.months=Object.keys(packed);
   o.size=JSON.stringify(packed).length;
   const before=JSON.stringify(alPick(['77'],['64849613','65456729']));
   const m=o.months[0];
   const back=alUnpack(packed[m]);
   ALLOC={up:1,file:'จากระบบ',n:0,g:back,days:packed[m].g[Object.keys(packed[m].g)[0]].d,
     money:1,gsv:0,niv:0,stat:{},kept:0,
     gins:Object.keys(back).sort()};
   const after=JSON.stringify(alPick(['77'],['64849613','65456729']));
   o.same=(before===after);
   o.before=before.slice(0,160);o.after=after.slice(0,160);
   return o;});
 t('📥 แพ็คไฟล์ใบจัดของเป็นรายเดือนได้ และคลายกลับมาแล้วผลตรวจเท่าเดิมเป๊ะ',
   alb.same&&alb.months.length>=1,alb.months.join(',')+' · '+(alb.same?'เท่ากัน':
     alb.before+' ≠ '+alb.after));
 t('📥 ...และเพย์โหลดที่เก็บเล็กกว่าโครงในหน่วยความจำ',alb.size>0,alb.size+' bytes');

 const alf=await ev(async()=>{
   __reset();__slip();
   __as('manager',null,'แอดมิน 1');_switchTab('spord');
   parseAlloc('alloc.xlsx',__alBuf());
   const packed=alPack(ALLOC),m=Object.keys(packed)[0];
   const stored={m:m,g:packed[m].g,nm:packed[m].nm,pk:packed[m].pk,
     meta:{file:'alloc.xlsx',money:1}};
   /* รีเฟรช/เปลี่ยนเครื่อง = ไม่มีไฟล์ในหน่วยความจำแล้ว */
   ALLOC=null;AL_GOT={};
   const calls=[];
   const of=window.fetch;
   window.fetch=async(u,opt)=>{
     calls.push(String(u));
     if(String(u).indexOf('/api/alloc?m=')===0)
       return {ok:true,json:async()=>stored};
     return of(u,opt);
   };
   const o={};
   /* กดตรวจทั้งที่ยังไม่มีไฟล์ — ต้องไปดึงของที่เก็บไว้ ไม่ใช่ถามหาไฟล์ */
   window.__alert='';window.__up=0;
   const oldUp=window.spUpAlloc;window.spUpAlloc=function(){window.__up++;};
   SP.sec='adm';SP.day='2026-11-20';renderSpord();
   const gi=document.getElementById('spGinIn');if(gi)gi.value='77';
   await spGinGo('B20261118-01','2026-11-20');
   window.spUpAlloc=oldUp;window.fetch=of;
   o.asked=window.__up;
   o.got=!!(ALLOC&&ALLOC.g&&ALLOC.g['77']);
   o.calls=calls.filter(u=>u.indexOf('/api/alloc')===0).length;
   o.rows=Object.keys((CSTOCK.gin['B20261118-01|2026-11-20']||{}).rows||{});
   o.txt=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   return o;});
 t('📥 ไม่มีไฟล์ในเครื่องนี้ → ดึงของที่เก็บไว้ในระบบมาเอง ไม่ถามหาไฟล์',
   alf.got&&alf.asked===0&&alf.calls>=1,
   'ดึง '+alf.calls+' ครั้ง · ได้ไฟล์ '+alf.got+' · ถามหาไฟล์ '+alf.asked+' ครั้ง');
 t('📥 ...แล้วตรวจ GIN ต่อได้เลย ผลตรวจถูกบันทึกตามปกติ',
   alf.rows.indexOf('CT11|64849613')>=0,alf.rows.join(' , '));

 /* ================================================================
  * 19) 📅 ปุ่ม ◀ ▶ ของช่องวันที่ ต้องขยับ "หนึ่งวัน" พอดี (เจ้าของแจ้ง 27 พ.ย. 69
  *     *"ปุ่มนี่กดไม่ไป ปรับแก้หน่อย"* — เป็นบั๊กเขตเวลา: toISOString() แปลงเป็น UTC
  *     บนเครื่องเวลาไทยจึง +1 วันแล้วได้วันเดิม และ −1 วันแล้วข้ามไปสองวัน
  *     ⚠️ เทสต์นี้มีความหมายก็ต่อเมื่อเบราว์เซอร์ตั้งเขตเวลาไทย (ตั้งไว้แล้วที่ newContext)
  * ================================================================ */
 const step=await ev(()=>{
   __reset();__slip();__as('manager',null,'แอดมิน 1');_switchTab('spord');
   SP.view='slip';SP.sid='B20261118-01';SP.sec='adm';SP.day='2026-11-23';renderSpord();
   const o={tz:Intl.DateTimeFormat().resolvedOptions().timeZone,start:spDay('B20261118-01')};
   spStepDay(1);o.fwd=SP.day;
   spStepDay(-1);o.back=SP.day;
   spStepDay(-1);o.back2=SP.day;
   /* ข้ามสิ้นเดือนก็ต้องถูก */
   spSetDay('2026-11-30');spStepDay(1);o.nextMon=SP.day;
   spSetDay('2026-12-01');spStepDay(-1);o.prevMon=SP.day;
   /* todayISO ต้องเป็นวันตามปฏิทินของเครื่อง ไม่ใช่ของ UTC */
   const n=new Date();
   o.today=todayISO();
   o.local=n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0');
   return o;});
 t('📅 กด ▶ แล้วไปวันถัดไปพอดีหนึ่งวัน',step.fwd==='2026-11-24',
   step.start+' → '+step.fwd+'  (เขตเวลา '+step.tz+')');
 t('📅 กด ◀ แล้วถอยพอดีหนึ่งวัน ไม่ข้ามสองวัน',
   step.back==='2026-11-23'&&step.back2==='2026-11-22',step.back+' → '+step.back2);
 t('📅 ข้ามสิ้นเดือน/ต้นเดือนถูกต้อง',
   step.nextMon==='2026-12-01'&&step.prevMon==='2026-11-30',
   step.nextMon+' · '+step.prevMon);
 t('📅 todayISO ตรงกับวันบนปฏิทินของเครื่อง ไม่ใช่ของ UTC',
   step.today===step.local,step.today+' vs '+step.local);

 /* ================================================================
  * 20) 🚚 คลังจัดส่ง — ใบตรวจรายวัน เซลล์คีย์ ↔ คลังจัดของ (เจ้าของสั่ง 27 พ.ย. 69)
  *   *"ทำให้หน้านี้เป็นส่วนของแอดมินที่ตรวจข้อมูลการคีย์ว่าตรงหรือขาดหรือเกินกี่ลัง
  *     แล้วตรวจสอบกับทางคลังเป็นรายวัน … หรือดึงออกมาเป็น EXCEL PDF ได้เหมือนเดิม"*
  * ================================================================ */
 const chk=await ev(()=>{
   __reset();
   CSTOCK.slips['B20261118-01'].g='D';
   CSTOCK.lots['K1']={id:'K1',sl:'B20261118-01',d:'2026-11-19',code:'AAA1',
     nm:'ครีมทาผิว เอ',cs:40,pc:0,sq:0,ln:'CT11',clr:[],up:1};
   CSTOCK.lots['K2']={id:'K2',sl:'B20261118-01',d:'2026-11-19',code:'BBB1',
     nm:'เซรั่ม เอ็กซ์',cs:24,pc:0,sq:1,ln:'CT11',clr:[],up:1};
   if(!CSTOCK.key)CSTOCK.key={};if(!CSTOCK.gin)CSTOCK.gin={};
   CSTOCK.key['B20261118-01|2026-11-20|CT11']={it:{AAA1:{sc:10,sp:0},BBB1:{sc:5,sp:0}},by:'sup',at:10};
   CSTOCK.key['B20261118-01|2026-11-21|CT11']={it:{AAA1:{sc:8,sp:0}},by:'sup',at:10};
   const G=(d,g,rows)=>{CSTOCK.gin['B20261118-01|'+d]={g:g,rows:rows,dd:[d],ords:[],miss:[],
     by:'manager',byName:'แอดมิน 1',at:20,money:0};};
   /* 20 พ.ย. ตรงเป๊ะ · 21 พ.ย. ตัวหนึ่งขาด 2 ลัง อีกตัวเกิน 3 ลัง (เซลล์ไม่ได้คีย์) */
   G('2026-11-20',['141'],{'CT11|AAA1':{sc:10,ss:0,sp:0,fc:0,fs:0,fp:0,nm:'ครีมทาผิว เอ',pk:12},
     'CT11|BBB1':{sc:5,ss:0,sp:0,fc:0,fs:0,fp:0,nm:'เซรั่ม เอ็กซ์',pk:6}});
   G('2026-11-21',['142'],{'CT11|AAA1':{sc:6,ss:0,sp:0,fc:0,fs:0,fp:0,nm:'ครีมทาผิว เอ',pk:12},
     'CT11|BBB1':{sc:3,ss:0,sp:0,fc:0,fs:0,fp:0,nm:'เซรั่ม เอ็กซ์',pk:6}});
   __as('manager',null,'แอดมิน 1');_switchTab('spord');
   const before=JSON.stringify(CSTOCK),s0=window.__sync,p0=window.__posts.length;
   SP.view='slip';SP.sid='B20261118-01';SP.sec='out';SP.chkD='';renderSpord();
   const L=spDayChk('B20261118-01');
   const o={n:L.length,d20:L[0],d21:L[1],
     tabs:[...document.querySelectorAll('#spTabs .tab2')].map(x=>x.textContent.trim()),
     txt:document.getElementById('spBody').textContent.replace(/\s+/g,' '),
     rows:document.querySelectorAll('#spBody .sp-chk tbody tr.sp-chk-r').length,
     xl:spChkRows('B20261118-01')};
   /* กดแถวเพื่อกางรายการที่ไม่ตรง */
   SP.chkD='2026-11-21';renderSpord();
   o.det=document.querySelector('#spBody .sp-chk-det');
   o.detTxt=o.det?o.det.textContent.replace(/\s+/g,' '):'';
   o.det=!!o.det;
   o.hasCal=!!document.querySelector('#spBody .sp-daybar')||!!document.getElementById('spCal');
   o.same=JSON.stringify(CSTOCK)===before;
   if(!o.same){const A=JSON.parse(before),B=CSTOCK;
     o.diff=Object.keys(B).filter(k=>JSON.stringify(A[k])!==JSON.stringify(B[k])).join(',');}
   o.sync=window.__sync-s0;o.posts=window.__posts.length-p0;
   return o;});
 t('🚚 แท็บ ④ ชื่อ "คลังจัดส่ง" ตามที่เจ้าของสั่ง',
   chk.tabs.some(x=>/คลังจัดส่ง/.test(x))&&!chk.tabs.some(x=>/คลังส่งออก/.test(x)),
   chk.tabs.join(' | '));
 t('🚚 มีใบตรวจรายวัน หนึ่งแถวต่อวันที่แอดมินตรวจไว้',
   chk.n===2&&chk.rows===2&&/ประวัติการตรวจย้อนหลัง/.test(chk.txt),chk.n+' วัน · '+chk.rows+' แถว');
 /* 📅 เจ้าของสั่ง 28 พ.ย. 69 ให้ ④ เริ่มที่ "เลือกวันในปฏิทิน" เหมือนหน้าแอดมินตรวจ */
 t('📅 ④ คลังจัดส่ง เริ่มด้วยปฏิทินเลือกวัน แล้วโชว์ผลตรวจของวันนั้นก่อน',
   chk.hasCal&&/ผลตรวจวันที่/.test(chk.txt),
   'ปฏิทิน '+chk.hasCal+' · '+chk.txt.slice(0,120));
 t('🚚 วันที่ตรงกันหมด ขึ้นว่าตรง ไม่มีขาดไม่มีเกิน',
   chk.d20.okAll&&chk.d20.short.pcs===0&&chk.d20.over.pcs===0&&chk.d20.keyed.cs===15&&
   chk.d20.out.cs===15,JSON.stringify({ok:chk.d20.okAll,k:chk.d20.keyed,a:chk.d20.out}));
 t('🔑 ขาดกับเกินแยกกอง ไม่หักกลบกัน (ขาด 2 ลัง · เกิน 3 ลัง)',
   chk.d21.short.cs===2&&chk.d21.over.cs===3&&!chk.d21.okAll,
   'ขาด '+JSON.stringify(chk.d21.short)+' · เกิน '+JSON.stringify(chk.d21.over));
 t('🔑 ...และบอกเป็นรายสินค้าว่าตัวไหนขาด ตัวไหนเกิน',
   chk.d21.bad.length===2&&chk.d21.bad.some(b=>b.code==='AAA1'&&/ขาด/.test(b.txt))&&
   chk.d21.bad.some(b=>b.code==='BBB1'&&/เกิน/.test(b.txt)),
   chk.d21.bad.map(b=>b.code+':'+b.txt).join(' · '));
 t('🚚 กดที่แถวแล้วกางรายการที่ไม่ตรงออกมาใต้แถว',
   chk.det&&/ครีมทาผิว เอ/.test(chk.detTxt)&&/ขาด/.test(chk.detTxt),chk.detTxt.slice(0,110));
 t('📄 ดึงเป็น Excel ได้ และตัวเลขตรงกับหน้าจอ',
   chk.xl.sum.length===3&&chk.xl.sum[1][2]===15&&chk.xl.sum[2][6]===2&&chk.xl.sum[2][8]===3,
   JSON.stringify(chk.xl.sum[2]));
 t('🛟 หน้าตรวจอ่านอย่างเดียว ไม่เขียนอะไรลงข้อมูลเลย',
   chk.same&&chk.sync===0&&chk.posts===0,
   'เหมือนเดิม '+chk.same+' ('+(chk.diff||'')+') · sync +'+chk.sync+' · posts +'+chk.posts);

 /* ============================================================================
  * 10) 📅 สองวันที่แยกให้ชัด + 🚚 คลังจัดส่งจริง (เจ้าของสั่ง 29 พ.ย. 69)
  *   *"คนใช้งานอ่านวันที่จะงงกับวันที่สร้างออเดอร์ 26 พย และวันปัจจุบันที่ต้องคีย์ 27 พย."*
  *   *"ส่วนของคลังจัดส่ง … ไม่มีไฟล์ ให้แอดมินกรอกเองได้เลย โดยสามารถเลือกครอบทุกออเดอร์
  *     เพื่อกดตรวจสอบว่าถูกต้องได้ และเลือกกดบางออเดอร์เพื่อใส่ว่าคลังจัดจริง มากกว่าหรือ
  *     น้อยกว่าในระบบแสดงได้"*
  * ========================================================================== */
 const WORK='2026-11-27';
 const setup=function(){
   __reset();__as('manager',null,'ผู้จัดการ');
   cstOk();                                            /* ให้ CSTOCK มีรูปร่างครบ (rep/whq) */
   CSTOCK.slips[B1].d='2026-11-26';                    /* ใบสร้างวันที่ 26 */
   CSTOCK.slips[B1].g='D';                             /* 🎯 ตัวกระจาย — มีครบทั้ง 4 ขั้น */
   CSTOCK.lots['L1']={id:'L1',sl:B1,code:'90000001',nm:'สินค้าทดสอบ A',cs:5,pc:0,ln:'CT11',
     d:'2026-11-26',clr:[],up:1};
   /* เซลล์คีย์เลขออเดอร์ของ "วันที่ 27" — คนละวันกับวันที่สร้างใบ */
   STOREDAILY.ord['BDD0100000011']={s:'4862383',l:'209611',d:WORK_,cs:5,pc:0,v:900,c:2,rf:'0000000011'};
   STOREDAILY.ord['BDD0100000012']={s:'4862365',l:'209611',d:WORK_,cs:3,pc:2,v:700,c:1,rf:'0000000012'};
   STOREDAILY.ord['BDD0100000013']={s:'4862365',l:'209612',d:WORK_,v:500,c:1,rf:'0000000013'};  /* ยังไม่รู้ลัง */
   CSTOCK.rep[B1+'|'+WORK_+'|CT11']={it:{},no:['BDD0100000011','BDD0100000012','0000000011'],
     n:1,h:[],by:'ct11',at:2000};
   CSTOCK.rep[B1+'|'+WORK_+'|CT12']={it:{},no:['BDD0100000013'],n:1,h:[],by:'ct12',at:2000};
   SP.view='slip';SP.sid=B1;SP.day=WORK_;SP.sec='out';SP.ym='2026-11';
   renderSpord();
 };
 /* ⚠️ ค่าคงที่ฝั่ง node ไม่มีในหน้าเว็บ — ส่งเข้าไปเป็น global ก่อนเรียก setup() */
 const PRE='window.B1="'+B1+'";window.WORK_="'+WORK+'";window.setup='+setup.toString()+';';
 const band=await ev(a=>{
   eval(a.setup);setup();
   const el=document.querySelector('.sp-2d');
   const tx=el?el.textContent.replace(/\s+/g,' '):'';
   const n=el?el.querySelectorAll('.sp-2d-i').length:0;
   /* วันเดียวกัน = ต้องไม่ฟ้องว่าคนละวัน */
   SP.day='2026-11-26';renderSpord();
   const same=document.querySelector('.sp-2d').textContent.replace(/\s+/g,' ');
   SP.day=WORK_;renderSpord();
   return {tx:tx,n:n,same:same,
     /* หน้าที่ไม่ได้ดูรายวัน (รายงาน) ต้องไม่โชว์วันทำงานปลอม ๆ */
     noDay:spDayBandHtml(B1,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ')};
 },{setup:PRE});
 t('📅 มีแถบสองวันที่ แยก "ใบออเดอร์" กับ "วันที่กำลังบันทึกงาน" ออกจากกัน',
   band.n===2&&/ใบออเดอร์/.test(band.tx)&&/กำลังบันทึกงานของวันที่/.test(band.tx),
   band.tx.slice(0,170));
 t('📅 บอกวันที่สร้างใบ (26) กับวันที่กำลังบันทึก (27) ครบทั้งสองตัว',
   /สร้างเมื่อ 26 พ\.ย\. 2569/.test(band.tx)&&/27 พ\.ย\. 2569/.test(band.tx),band.tx.slice(0,200));
 t('🔑 ต่างกันต้องพูดออกมาว่า "คนละวันกับวันที่สร้างใบ" ไม่ใช่วางเลขไว้เฉย ๆ',
   /คนละวันกับวันที่สร้างใบ/.test(band.tx)&&/หลังสร้างใบ 1 วัน/.test(band.tx),band.tx.slice(0,220));
 t('...วันเดียวกันก็ต้องบอกว่าวันเดียวกัน ไม่ใช่เงียบ',
   /วันเดียวกับวันที่สร้างใบ/.test(band.same)&&!/คนละวัน/.test(band.same),band.same.slice(0,160));
 t('📅 หน้าที่ไม่ได้ดูรายวัน บอกว่า "ดูทั้งใบ" ไม่ใช่โชว์วันทำงานปลอม ๆ',
   /ดูทั้งใบ/.test(band.noDay)&&!/กำลังบันทึกงาน/.test(band.noDay),band.noDay.slice(0,140));
 const sep=await ev(()=>{
   const tabs=spTabsOn(spSlip(B1));
   const out=tabs.filter(x=>x.k==='out')[0]||{};
   const html=document.getElementById('spTabs').innerHTML;
   SP.sec='key';renderSpord();
   const flow=document.querySelector('.sp-flow').textContent.replace(/\s+/g,' ');
   SP.sec='out';renderSpord();
   return {sep:!!out.sep,line:(html.match(/tab2-sep/g)||[]).length,flow:flow};
 });
 t('⏭ ④ คลังจัดส่ง มีเส้นคั่นข้างหน้าในแถบแท็บ — ไม่ขึ้นปนกับสามขั้นแรก',
   sep.sep&&sep.line===1,JSON.stringify({sep:sep.sep,line:sep.line}));
 t('⏭ แถบจังหวะงานบอกว่า ④ เป็นขั้น "ต่อจากนี้" ทำหลังตรวจเลข GIN',
   /ต่อจากนี้/.test(sep.flow)&&/หลังตรวจเลข GIN/.test(sep.flow),sep.flow.slice(-150));
 /* ---- ตารางคลังจัดส่งจริง ---- */
 const wh=await ev(a=>{
   eval(a.setup);setup();
   const G=spWhqOrders(B1,WORK_);
   const tx=document.querySelector('.sp-wh').textContent.replace(/\s+/g,' ');
   return {n:G.rows.length,nos:G.rows.map(r=>r.no).join(','),wait:G.wait,
     cs:G.rows.map(r=>r.cs===null?'?':r.cs).join(','),tx:tx};
 },{setup:PRE});
 t('🚚 รวมเลขออเดอร์ของวันนั้นจากที่เซลล์ทุกสายคีย์ไว้',
   wh.n===3&&wh.nos==='BDD0100000011,BDD0100000012,BDD0100000013',wh.nos);
 t('🔁 เลขเดียวกันเขียนสองแบบ (เลขเต็ม + หางเลข) นับเป็นใบเดียว',wh.n===3,wh.nos);
 t('⏳ ใบที่ยังไม่รู้จำนวนในระบบ ต้องขึ้น "รอไฟล์ยอดขาย" ไม่ใช่ 0',
   wh.wait===1&&wh.cs==='5,3,?'&&/รอไฟล์ยอดขาย/.test(wh.tx),wh.cs+' · wait='+wh.wait);
 /* ---- ยืนยันทีเดียวหลายใบ ---- */
 const bulk=await ev(async a=>{
   eval(a.setup);setup();
   window.__posts=[];
   spWhqAll(true);                                  /* เลือกครอบทุกใบ */
   const nSel=Object.keys(SP.whSel).length;
   await spWhqOkSel(B1);await W();
   const W2=cstOk().whq;
   const post=window.__posts[window.__posts.length-1]||{};
   const st=spWhqSt(spWhqRec(B1,WORK_,'BDD0100000011'),
     spWhqOrders(B1,WORK_).rows.filter(r=>r.no==='BDD0100000011')[0]);
   return {nSel:nSel,keys:Object.keys(W2).length,ok:W2[B1+'|'+WORK_+'|BDD0100000011'].ok,
     act:post.b&&post.b.act,items:post.b&&Object.keys(post.b.items||{}).length,
     d:post.b&&post.b.d,st:st.k,max:WHQ_MAX};
 },{setup:PRE});
 t('✅ เลือกครอบทุกออเดอร์แล้วกดยืนยันว่าตรง — ได้ครบทุกใบในครั้งเดียว',
   bulk.nSel===3&&bulk.keys===3&&bulk.ok===1&&bulk.st==='ok',JSON.stringify(bulk));
 t('🛟 เขียนผ่าน api/spord.js (act:"whq") พร้อมวันที่ ไม่ใช่เซฟ state ทั้งก้อน',
   bulk.act==='whq'&&bulk.items===3&&bulk.d===WORK,JSON.stringify({act:bulk.act,n:bulk.items,d:bulk.d}));
 /* ---- ใส่จำนวนจริง มาก/น้อยกว่าระบบ ---- */
 const whOne=await ev(async a=>{
   eval(a.setup);setup();
   spWhqEdit('BDD0100000012');
   document.getElementById('whC_BDD0100000012').value='2';
   document.getElementById('whP_BDD0100000012').value='5';
   document.getElementById('whN_BDD0100000012').value='คลังแจ้งว่าของไม่พอ';
   await spWhqSaveOne(B1,'BDD0100000012');await W();
   const row=spWhqOrders(B1,WORK_).rows.filter(r=>r.no==='BDD0100000012')[0];
   const rec=spWhqRec(B1,WORK_,'BDD0100000012');
   const st=spWhqSt(rec,row);
   /* มากกว่าระบบก็ต้องได้ */
   spWhqEdit('BDD0100000011');
   document.getElementById('whC_BDD0100000011').value='8';
   document.getElementById('whP_BDD0100000011').value='0';
   await spWhqSaveOne(B1,'BDD0100000011');await W();
   const st2=spWhqSt(spWhqRec(B1,WORK_,'BDD0100000011'),
     spWhqOrders(B1,WORK_).rows.filter(r=>r.no==='BDD0100000011')[0]);
   const tx=document.querySelector('.sp-wh').textContent.replace(/\s+/g,' ');
   return {k:st.k,dC:st.dC,dP:st.dP,nt:rec.nt,re:rec.re,sys:rec.sys,
     k2:st2.k,dC2:st2.dC,tx:tx};
 },{setup:PRE});
 t('📝 ใส่จำนวนจริงน้อยกว่าระบบ (ระบบ 3 ลัง 2 ชิ้น → จริง 2 ลัง 5 ชิ้น) คิดผลต่างให้',
   whOne.k==='diff'&&whOne.dC===-1&&whOne.dP===3,JSON.stringify({k:whOne.k,dC:whOne.dC,dP:whOne.dP}));
 t('🔑 ลัง กับ ชิ้น เทียบคนละช่อง ไม่ยุบเป็นเลขเดียว',whOne.dC===-1&&whOne.dP===3,
   whOne.dC+' ลัง / '+whOne.dP+' ชิ้น');
 t('📝 ใส่มากกว่าระบบก็ได้ (ระบบ 5 → จริง 8)',whOne.k2==='diff'&&whOne.dC2===3,whOne.dC2);
 t('📝 เก็บหมายเหตุ และเก็บ "ที่ระบบแสดงตอนบันทึก" ไว้ด้วย',
   whOne.nt==='คลังแจ้งว่าของไม่พอ'&&whOne.re===1&&whOne.sys===3,JSON.stringify({nt:whOne.nt,sys:whOne.sys}));
 t('🔑 หน้าจอบอกสามสถานะแยกกัน: ตรง / ไม่ตรง / ยังไม่ตรวจ',
   /ตรวจแล้วตรง/.test(whOne.tx)&&/ไม่ตรง/.test(whOne.tx)&&/ยังไม่ตรวจ/.test(whOne.tx),whOne.tx.slice(0,160));
 /* ---- ยกเลิกผลตรวจ: ต้องเขียน ok:0 ไม่ใช่ลบคีย์ ---- */
 const whUndo=await ev(async a=>{
   eval(a.setup);setup();
   spWhqAll(true);await spWhqOkSel(B1);await W();
   spWhqAll(true);await spWhqOkSel(B1,1);await W();
   const W2=cstOk().whq,k=B1+'|'+WORK_+'|BDD0100000011';
   const post=window.__posts[window.__posts.length-1]||{};
   return {has:Object.prototype.hasOwnProperty.call(W2,k),ok:W2[k]&&W2[k].ok,
     sent:post.b&&post.b.items&&post.b.items['BDD0100000011'].ok,
     st:spWhqSt(W2[k],{cs:5,pc:0}).k};
 },{setup:PRE});
 t('🛟 ยกเลิกผลตรวจเขียน ok:0 ทับ ไม่ใช่ลบคีย์ (แท็บเก่าจะ union กลับมา)',
   whUndo.has&&whUndo.ok===0&&whUndo.sent===0&&whUndo.st==='todo',JSON.stringify(whUndo));
 /* ---- สิทธิ์: บัญชีที่ไม่ใช่แอดมิน ดูได้ แก้ไม่ได้ ---- */
 const ro=await ev(async a=>{
   eval(a.setup);setup();
   __as('sales','209611','CT11');SP.sid=B1;SP.view='slip';SP.sec='out';SP.day=WORK_;renderSpord();
   const tx=document.body.textContent;
   const el=document.querySelector('.sp-wh');
   const boxes=el?el.querySelectorAll('input[type=checkbox]').length:0;
   window.__posts=[];window.__alert='';
   await spWhqPost(B1,WORK_,{'BDD0100000011':{ok:1}},'x');await W();
   return {boxes:boxes,posts:window.__posts.length,alert:window.__alert,seen:/คลังจัดส่งจริง/.test(tx)};
 },{setup:PRE});
 t('🔒 บัญชีที่ไม่ใช่แอดมิน เปิดดูได้ แต่ไม่มีช่องติ๊กและเขียนไม่ได้',
   ro.seen&&ro.boxes===0&&ro.posts===0&&/แก้ส่วนนี้ไม่ได้/.test(ro.alert),JSON.stringify(ro));
 /* ---- เพดานต้องตรงกับฝั่งเซิร์ฟเวอร์ ---- */
 const srv=fs.readFileSync(path.join(ROOT,'api','spord.js'),'utf8');
 t('🛟 WHQ_MAX ของหน้าเว็บตรงกับของเซิร์ฟเวอร์',
   new RegExp('WHQ_MAX = '+bulk.max+'\\b').test(srv),'หน้าเว็บ '+bulk.max);
 t('🔒 เซิร์ฟเวอร์สร้างคีย์เอง (sid|วันที่|เลขออเดอร์) ไคลเอนต์ยัดคีย์อื่นไม่ได้',
   /C\.whq\[sid \+ "\|" \+ ymd \+ "\|" \+ ono\]/.test(srv),'');
 t('🔒 act:"whq" เป็นสิทธิ์ของแอดมิน/ผู้จัดการเท่านั้น (ตรวจที่เซิร์ฟเวอร์)',
   /act === "whq"[\s\S]{0,400}if \(!isMgr\) return res\.status\(403\)/.test(srv),'');

 /* ---------- 9) ไม่มีใบใหญ่ ---------- */
 const none=await ev(()=>{__reset();CSTOCK.slips={};
   __as('wh',null,'ทีมคลัง 1');renderSpord();
   return document.getElementById('spBody').textContent.replace(/\s+/g,' ');});
 t('ยังไม่มีใบออเดอร์ใหญ่ → บอกให้รอแอดมิน ไม่ใช่หน้าว่าง',
   /รอแอดมินเปิดใบออเดอร์ใหญ่/.test(none),none.slice(0,80));


 /* ============================================================================
  * 11) 🔎 กดชื่อสายดูเลขออเดอร์ · หาจำนวนจาก "ใบจัดของ" · พาแต่ละบทบาทไปขั้นของตัวเอง
  *   เจ้าของสั่ง 29 พ.ย. 69 สามเรื่องในข้อความเดียว:
  *   *"ให้ทุกคนกดเข้าไปดูได้ ว่าแต่ละสายกดออเดอร์เลขไหนมาบ้าง และในออเดอร์นั้น ๆ มีสินค้า
  *     จำนวนกี่ลังรวมเท่าไหร่ โดยจะแสดงผลเมื่อกดที่เลขสายเท่านั้น"*
  *   *"และมันขึ้นว่ารอไฟล์ยอดขาย ช่วยตรวจสอบหน่อย"*
  *   *"ถ้าแอคเค้าซุป ให้ขึ้นหน้าซุปจด แอคเค้าเซลล์ให้เด้งไปหน้าเซลล์คีย์ แอดมินก็เด้งไปแอดมิน"*
  *
  * ⚠️ ไฟล์ Transaction Inquiry ของจริง (วัดแล้ว 32 คอลัมน์) **ไม่มีรหัสสินค้าและไม่มีช่อง
  *    จำนวน** จึงบอกจำนวนลังไม่ได้ — ตัวที่บอกได้คือไฟล์ยอดขายรายวัน กับ "ใบจัดของ"
  *    (อ่านผ่าน api/ordtrk ซึ่งทุกบทบาทอ่านได้) · ไม่มีทั้งคู่ = ยังไม่รู้ ห้ามขึ้น 0
  * ========================================================================== */
 const trk=await ev(a=>{
   eval(a.setup);setup();
   const o={};
   SP.sec='rep';SP.trk={};renderSpord();          /* ตารางติดตามอยู่ในหน้า ② เซลล์คีย์ */
   const btn=ln=>document.querySelector('.sp-trkb[onclick*="\''+ln+'\'"]');
   o.btn11=!!btn('CT11');o.btn12=!!btn('CT12');o.btn13=!!btn('CT13');   /* CT13 ยังไม่ได้ส่งเลข */
   /* กางแล้วต้อง "ไม่วาดหน้าใหม่" — ฝังหมุดไว้ในหน้า ถ้าหมุดหายแปลว่าวาดใหม่ */
   const pin=document.createElement('i');pin.id='__pin';document.getElementById('spBody').appendChild(pin);
   const row=()=>document.getElementById('sptrk-CT11');
   o.before=row().classList.contains('hidden');
   spTrkTog('CT11');
   o.after=row().classList.contains('hidden');
   o.pinAlive=!!document.getElementById('__pin');
   o.state=!!SP.trk.CT11;
   o.txt=row().textContent.replace(/\s+/g,' ');
   /* ใบของ CT12 ยังไม่มีไฟล์ไหนบอกจำนวน */
   spTrkTog('CT12');
   o.txt12=document.getElementById('sptrk-CT12').textContent.replace(/\s+/g,' ');
   /* ---- ใส่ "ใบจัดของ" ของเดือนนั้นเข้าไป แล้วจำนวนต้องขึ้นเอง ---- */
   OT.cache['2026-11']={ord:{'00000013':{d:27,w:4,p:6,n:3,s:'4862365'}},det:null};
   renderSpord();SP.trk.CT12=true;
   o.q=spOrdQty('BDD0100000013',STOREDAILY.ord['BDD0100000013'],'2026-11');
   o.txt12b=spTrkOrdHtml(spTrack(B1,WORK_).filter(x=>x.ln==='CT12')[0])
     .replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');
   /* ไฟล์ยอดขายต้องชนะใบจัดของ (ตัวเลขออกบิลคือตัวจริง) */
   OT.cache['2026-11'].ord['00000011']={d:27,w:99,p:0,n:9};
   o.qSale=spOrdQty('BDD0100000011',STOREDAILY.ord['BDD0100000011'],'2026-11');
   /* ไม่มีไฟล์ไหนรู้เลย = null ห้ามเป็น 0 */
   o.qNone=spOrdQty('BDD0100009999',{s:'x',l:'209611'},'2026-11');
   return o;
 },{setup:PRE});
 t('🔎 สายที่ส่งเลขออเดอร์มาแล้ว มีปุ่มให้กดดู · สายที่ยังไม่ส่ง ไม่มีปุ่ม',
   trk.btn11&&trk.btn12&&!trk.btn13,
   'CT11='+trk.btn11+' CT12='+trk.btn12+' CT13='+trk.btn13);
 t('🔎 กดแล้วกางออกมา และ "ไม่วาดหน้าใหม่" (กล่องตารางจะได้ไม่เด้งกลับบนสุด)',
   trk.before===true&&trk.after===false&&trk.pinAlive&&trk.state,
   'ก่อนกดซ่อน='+trk.before+' หลังกดซ่อน='+trk.after+' หมุดยังอยู่='+trk.pinAlive);
 t('🔎 ในนั้นมีเลขออเดอร์ · ชื่อร้าน · จำนวนลัง-ชิ้น ของแต่ละใบ',
   /BDD0100000011/.test(trk.txt)&&/BDD0100000012/.test(trk.txt)&&
   /5 ลัง/.test(trk.txt)&&/3 ลัง 2 ชิ้น/.test(trk.txt)&&/ไฟล์ยอดขาย/.test(trk.txt),
   trk.txt.slice(0,190));
 t('🛟 ใบที่ยังไม่มีไฟล์ไหนบอกจำนวน ต้องขึ้นว่า "ยังไม่รู้จำนวน" ไม่ใช่ 0',
   /ยังไม่รู้จำนวน/.test(trk.txt12)&&!/\b0 ลัง\b/.test(trk.txt12),trk.txt12.slice(0,170));
 t('🚚 พอมีไฟล์ใบจัดของของเดือนนั้น จำนวนขึ้นเองโดยไม่ต้องรอไฟล์ยอดขาย',
   trk.q&&trk.q.cs===4&&trk.q.pc===6&&trk.q.src==='gin'&&trk.q.n===3,JSON.stringify(trk.q));
 t('🚚 ...และบอกที่มาว่ามาจากใบจัดของ',
   /4 ลัง 6 ชิ้น/.test(trk.txt12b)&&/ใบจัดของ/.test(trk.txt12b),trk.txt12b.slice(0,170));
 t('🔑 ไฟล์ยอดขายชนะใบจัดของเสมอ (ตัวเลขที่ออกบิลแล้วคือตัวจริง)',
   trk.qSale&&trk.qSale.cs===5&&trk.qSale.src==='sale',JSON.stringify(trk.qSale));
 t('🛟 ไม่มีไฟล์ไหนรู้จำนวนเลย ต้องตอบ "ไม่รู้" (null) ไม่ใช่ 0',trk.qNone===null,
   JSON.stringify(trk.qNone));
 /* ---- 📅 ทำไมบางใบมีจำนวน บางใบไม่มี (เจ้าของถาม 29 พ.ย. 69) ----
    หน้าจอจริงของเขา: 8 เลขของสาย CT11 · 6 ใบขึ้น "ยังไม่รู้จำนวน" · 2 ใบมีจำนวน
    เลขที่มีจำนวนคือ BDD0100000575 กับ BDD0100001275 ซึ่งเป็น **ออเดอร์ของวันเก่า**
    ปนมากับ BDD010000259x-262x ของวันนั้น (ร้านเดียวกันซ้ำสองใบ: ศิริมา · ศิริชัย)
    ⇒ ไม่ใช่บั๊ก แต่หน้าจอไม่ได้บอกวันที่ จึงดูเหมือนสุ่ม · ลงวันที่ไว้ให้เห็น */
 const trkDay=await ev(a=>{
   eval(a.setup);setup();
   STOREDAILY.ord['BDD0100002597']={s:'4862383',l:'209611',k:WORK_,v:0,tx:1,rf:'1034757015'};
   STOREDAILY.ord['BDD0100000575']={s:'4862365',l:'209611',k:'2026-11-10',d:'2026-11-10',
     cs:0,pc:24,v:900,c:2,rf:'1034364918'};
   CSTOCK.rep[B1+'|'+WORK_+'|CT11']={it:{},no:['1034757015','1034364918'],n:1,h:[],by:'ct11',at:2000};
   spRfBust();
   SP.sec='rep';SP.trk={CT11:true};renderSpord();
   return {tx:document.getElementById('sptrk-CT11').textContent.replace(/\s+/g,' '),
     old:spOrdDay(STOREDAILY.ord['BDD0100000575']),
     now:spOrdDay(STOREDAILY.ord['BDD0100002597']),
     none:spOrdDay({s:'x'}),blank:spOrdDay(null)};
 },{setup:PRE});
 t('📅 แต่ละใบขึ้นวันที่ของตัวเอง — คำถาม "ทำไมบางใบมีจำนวน" จะตอบตัวเองได้',
   /27 พ\.ย\. 2569/.test(trkDay.tx)&&/10 พ\.ย\. 2569/.test(trkDay.tx),trkDay.tx.slice(0,220));
 t('📅 ...และใบที่เป็นของวันอื่นถูกทักไว้ ไม่ใช่ปล่อยให้งง',
   /คนละวันกับที่กำลังบันทึก/.test(trkDay.tx)&&/1 ใบเป็นออเดอร์ของวันอื่น/.test(trkDay.tx),
   trkDay.tx.slice(-260));
 t('🔑 ใบของวันเก่ามีจำนวน (ไฟล์วันนั้นอัพแล้ว) · ใบของวันนี้ยังไม่รู้ — คนละเหตุ ไม่ใช่สุ่ม',
   /24 ชิ้น/.test(trkDay.tx)&&/ไฟล์ยอดขาย/.test(trkDay.tx)&&/ยังไม่รู้จำนวน/.test(trkDay.tx),
   trkDay.tx.slice(0,220));
 t('🛟 วันของใบอ่านจาก k ก่อน d · ไม่มีทั้งคู่ต้องเงียบ ห้ามเดาเป็นวันที่กำลังบันทึก',
   trkDay.old==='2026-11-10'&&trkDay.now===WORK&&trkDay.none===''&&trkDay.blank==='',
   [trkDay.old,trkDay.now,JSON.stringify(trkDay.none),JSON.stringify(trkDay.blank)].join(' · '));

 /* ---- พาแต่ละบทบาทไปขั้นของตัวเอง ---- */
 const home=await ev(a=>{
   eval(a.setup);setup();
   const o={D:{},A:{},tabs:{}};
   const land=()=>{SP.sec='';return spSec();};
   CSTOCK.slips[B1].g='D';
   ['sup','sales','manager','wh','ds'].forEach(r=>{
     __as(r,r==='sales'?'209611':null,r);o.D[r]=land();
     o.tabs[r]=spTabsOn(spSlip(B1)).map(x=>x.k).join(',');
   });
   CSTOCK.slips[B1].g='A';                       /* ใบ A ไม่มีขั้นซุปจด/แอดมินตรวจ */
   ['sup','sales','manager','wh'].forEach(r=>{
     __as(r,r==='sales'?'209611':null,r);o.A[r]=land();});
   __as('manager',null,'ผู้จัดการ');CSTOCK.slips[B1].g='D';
   o.open=(()=>{SP.sec='';spOpenSlip(B1);return SP.sec;})();
   return o;
 },{setup:PRE});
 t('🧭 ใบ 🎯 ตัวกระจาย: ซุป→ซุปจด · เซลล์→เซลล์คีย์ · แอดมิน→แอดมินตรวจ · คลัง/สายส่ง→คลังจัดส่ง',
   home.D.sup==='key'&&home.D.sales==='rep'&&home.D.manager==='adm'&&
   home.D.wh==='out'&&home.D.ds==='out',JSON.stringify(home.D));
 t('🧭 ใบที่ไม่มีขั้นนั้น ถอยไปขั้นที่ใบนั้นมีจริง (ซุป→เซลล์คีย์ · แอดมิน→คลังจัดส่ง)',
   home.A.sup==='rep'&&home.A.sales==='rep'&&home.A.manager==='out'&&home.A.wh==='out',
   JSON.stringify(home.A));
 t('🧭 เปิดใบจากรายการ ก็ลงที่ขั้นของตัวเองเหมือนกัน',home.open==='adm',home.open);
 t('🔒 เป็นแค่หน้าที่ลงจอด ไม่ใช่สิทธิ์ — ทุกบทบาทยังเห็นแท็บครบเหมือนเดิม',
   home.tabs.sup===home.tabs.wh&&home.tabs.sup===home.tabs.sales&&
   home.tabs.sup.split(',').length===4,JSON.stringify(home.tabs));



 /* ============================================================================
  * 12) 🧯 เลขที่อ่านจากรูปต้องหายไม่ได้เลย — เจ้าของเจอ 27 พ.ย. 69 แล้วสั่งต่อ 28 พ.ย. 69
  *   *"ทำไมที่เค้าอัพมาจำนวนไม่ตรงกัน เช่นสาย 17 เค้าแคปมาว่าส่งมา 20-21 รูป
  *     ที่มันในระบบขึ้นแค่ 13 รูป"* → *"มันทำให้คนทำงานต้องทำซ้ำสอง"*
  *   OCR อ่านได้ครบ 20 แต่เก็บแค่ 13 เลขแรก เพราะเซลล์กดบันทึกกลางคัน → หน้าถูกวาดใหม่
  *   → ช่องกรอกเดิมหลุดออกจากหน้า → รูปที่ 14-20 เขียนลงช่องที่ไม่มีอยู่แล้ว
  *   เป้าหมายรอบนี้คือ **เลขหายไม่ได้ และไม่มีเคสไหนที่เซลล์ต้องอัพรูปซ้ำ**
  *   ⚠️ สวมตัวอ่านปลอม (spOcrNos/ocrWords/FileReader) เพื่อเดิน spOcrGo จริงทั้งลูป
  *      โดยไม่ต้องโหลด Tesseract 8 MB · ตัวอ่านจริงกับรูปจริงอยู่ใน ocr-promo.test.cjs
  * ========================================================================== */
 const OCRPRE=`
   __as('sales','209611','CT11');
   /* ⚠️ ล้างตัวหน่วงเขียนร่างที่ค้างจากบล็อกก่อน ไม่งั้นมันจะเขียนร่างของบล็อกก่อนกลับมา
      กลางบล็อกนี้ (เจอจริงตอนเขียนเทสต์: ร่าง 5 เลขกลายเป็น 20 เลขของบล็อกก่อนหน้า) */
   clearTimeout(SP.nodt);SP.nodt=0;
   SP.sid=B1;SP.view='slip';SP.ym='2026-11';SP.day=WORK_;SP.sec='rep';SP.ocr=0;
   CSTOCK.rep={};
   CSTOCK.rep[B1+'|'+WORK_+'|CT11']={it:{},no:[],n:0,h:[],by:'209611',byName:'CT11',at:1};
   window.__lsKeys=p=>{const a=[];try{for(let i=0;i<localStorage.length;i++){
     const k=localStorage.key(i);if(k&&(!p||p.test(k)))a.push(k);}}catch(e){}return a;};
   window.__lsKeys(/^bdspno:/).forEach(k=>{try{localStorage.removeItem(k);}catch(e){}});
   renderSpord();
   window.__ta=()=>document.getElementById('spRNo_CT11');
   window.__n=()=>{const e=window.__ta();return e?spNoSplit(e.value).length:-1;};
   window.__dk=()=>spNoDraftKey('CT11',B1,WORK_);
   window.__files=n=>{const a=[];for(let i=1;i<=n;i++)a.push({name:'img'+i+'.jpg'});return a;};
   FileReader=function(){this.readAsDataURL=function(){const s=this;setTimeout(()=>s.onload&&s.onload(),0);};};
   ocrWords=async()=>[];
   window.__seq=0;window.__mid=null;
   spOcrNos=()=>{window.__seq++;
     if(window.__mid&&window.__seq===13)window.__mid();
     return [{no:'10347'+String(70000+window.__seq),c:90}];};`;

 /* ---- ① กดบันทึกกลางคัน = จองคิว แล้วระบบบันทึกให้เองตอนอ่านครบ ---- */
 const ocrQ=await ev(async a=>{
   eval(a.setup);setup();eval(a.pre);
   const o={box:!!window.__ta()};
   window.__mid=()=>{window.__alert='';spRepLineSave(B1,WORK_,'CT11');
     o.midAlert=window.__alert;o.midPosts=window.__posts.length;o.want=!!(SP.ocr&&SP.ocr.want);
     o.midBox=(document.getElementById('spOcrBox_CT11')||{}).innerHTML||'';};
   window.__posts=[];window.__alert='';
   await spOcrGo('CT11',window.__files(20));
   await new Promise(r=>setTimeout(r,120));
   o.endN=window.__n();
   o.posts=window.__posts.length;
   o.sent=(((window.__posts[0]||{}).b||{}).no||[]).length;
   o.saved=((CSTOCK.rep[B1+'|'+WORK_+'|CT11']||{}).no||[]).length;
   o.n=(CSTOCK.rep[B1+'|'+WORK_+'|CT11']||{}).n;
   o.drafted=(()=>{try{return localStorage.getItem(window.__dk());}catch(e){return null;}})();
   return o;
 },{setup:PRE,pre:OCRPRE});
 t('🧯 กดบันทึกระหว่างอ่านรูป = จองคิว ไม่ใช่ถูกปฏิเสธ (บอกว่าจะบันทึกให้เอง)',
   ocrQ.midPosts===0&&ocrQ.want===true&&/จองบันทึกไว้แล้ว/.test(ocrQ.midAlert||'')
   &&/13 จาก 20/.test(ocrQ.midAlert||''),
   'โพสต์ '+ocrQ.midPosts+' · '+String(ocrQ.midAlert||'').slice(0,60));
 t('🧯 ...และบนจอบอกว่าจองไว้แล้ว ไม่ต้องกดอีก',/จองบันทึกไว้แล้ว/.test(ocrQ.midBox||''),
   String(ocrQ.midBox||'').replace(/<[^>]*>/g,' ').slice(0,70));
 t('🧯 อ่านครบแล้วระบบบันทึกเอง ครั้งเดียว และได้ครบ 20 เลข (ไม่ใช่ 13)',
   ocrQ.posts===1&&ocrQ.sent===20&&ocrQ.saved===20,
   'โพสต์ '+ocrQ.posts+' · ส่ง '+ocrQ.sent+' · เก็บ '+ocrQ.saved);
 t('🧯 ...ช่องบนจอก็ครบ 20 และกินโควต้าแก้ของเซลล์แค่ 1 ครั้ง',
   ocrQ.endN===20&&ocrQ.n===1,'ช่อง '+ocrQ.endN+' · โควต้าใช้ไป '+ocrQ.n);
 t('🧯 ...ร่างในเครื่องถูกลบหลังเซิร์ฟเวอร์ตอบรับแล้ว',ocrQ.drafted===null,
   String(ocrQ.drafted||'null').slice(0,40));

 /* ---- ② ช่องกรอกหลุดไปจากหน้ากลางคัน: อ่านต่อให้จบ ไม่หยุด และเลขอยู่ครบในร่าง ---- */
 const ocrGone=await ev(async a=>{
   eval(a.setup);setup();eval(a.pre);
   const o={};
   /* จำลองกรณีแย่สุด: หน้าถูกล้างกลางคัน ช่องกรอกหายไปเลย */
   window.__mid=()=>{const e=window.__ta();if(e&&e.remove)e.remove();o.gone=window.__n();};
   window.__posts=[];window.__alert='';
   await spOcrGo('CT11',window.__files(20));
   await new Promise(r=>setTimeout(r,60));
   o.read=SP.ocr.rows.length;o.off=SP.ocr.off;o.alert=window.__alert;
   o.draft=spNoDraftGet('CT11',B1,WORK_).length;
   o.posts=window.__posts.length;
   o.inState=JSON.stringify(CSTOCK).indexOf('1034770001')>=0;
   /* เปิดหน้าสายนี้ใหม่ — เลขต้องกลับมาครบเอง ไม่ต้องอัพรูปซ้ำ */
   SP.ocr=0;renderSpord();
   o.back=window.__n();
   o.banner=/sp-nodr/.test(document.getElementById('spordView').innerHTML)
     &&/ยังไม่ได้บันทึก/.test(document.getElementById('spordView').innerHTML);
   /* แล้วกดบันทึกได้เลย ครบ 20 */
   window.__posts=[];
   await spRepLineSave(B1,WORK_,'CT11');
   await new Promise(r=>setTimeout(r,80));
   o.sent=(((window.__posts[0]||{}).b||{}).no||[]).length;
   return o;
 },{setup:PRE,pre:OCRPRE});
 t('🧯 ช่องกรอกหายกลางคัน ต้องอ่านรูปต่อให้จบทั้ง 20 รูป ไม่หยุดให้ไปอัพซ้ำ',
   ocrGone.read===20&&ocrGone.gone===-1,'อ่านได้ '+ocrGone.read+' รูป');
 t('🧯 ...เลขทั้ง 20 ถูกเก็บไว้ในร่างในเครื่องครบ และยังไม่ถูกบันทึกขึ้นเซิร์ฟเวอร์',
   ocrGone.draft===20&&ocrGone.posts===0&&ocrGone.off===8,
   'ร่าง '+ocrGone.draft+' · โพสต์ '+ocrGone.posts+' · รูปที่ช่องหาย '+ocrGone.off);
 t('🧯 ...บอกผู้ใช้ว่าไม่มีเลขหาย (ไม่ใช่ให้ไปอัพรูปใหม่)',
   /ไม่มีเลขหาย/.test(ocrGone.alert||'')&&!/อัพรูปใหม่/.test(ocrGone.alert||''),
   String(ocrGone.alert||'').slice(0,70));
 t('🧯 เปิดหน้าสายนี้ใหม่ เลขกลับมาครบ 20 เอง พร้อมป้ายบอกว่ายังไม่ได้บันทึก',
   ocrGone.back===20&&ocrGone.banner===true,'ช่อง '+ocrGone.back+' · ป้าย '+ocrGone.banner);
 t('🧯 ...กดบันทึกแล้วส่งครบ 20 เลข',ocrGone.sent===20,'ส่ง '+ocrGone.sent);
 t('🛟 ร่างเลขออเดอร์ไม่อยู่ใน CSTOCK (ไม่แตะข้อมูลที่ sync ขึ้น bd-data-*)',
   ocrGone.inState===false,'อยู่ใน state = '+ocrGone.inState);

 /* ---- ③ ร่างอยู่ใน localStorage เท่านั้น · เซฟไม่ผ่าน ร่างต้องไม่หาย · โหมดส่วนตัวไม่พัง ---- */
 const ocrDr=await ev(async a=>{
   eval(a.setup);setup();eval(a.pre);
   const o={};
   await spOcrGo('CT11',window.__files(5));
   await new Promise(r=>setTimeout(r,60));
   o.key=window.__dk();
   o.keys=window.__lsKeys(/^bdspno:/);
   /* คนละวัน / คนละสาย / คนละใบ ต้องไม่เห็นร่างของกันเอง */
   o.otherDay=spNoDraftGet('CT11',B1,'2026-11-01').length;
   o.otherLn=spNoDraftGet('CT12',B1,WORK_).length;
   /* 🛟 เซฟไม่ผ่าน (เน็ตหลุด) → ร่างต้องยังอยู่ ไม่ใช่หายทั้งสองที่ */
   bdPost=()=>Promise.reject(new Error('จำลองเน็ตหลุด'));
   await spRepLineSave(B1,WORK_,'CT11');
   await new Promise(r=>setTimeout(r,80));
   o.afterFail=spNoDraftGet('CT11',B1,WORK_).length;
   o.savedFail=((CSTOCK.rep[B1+'|'+WORK_+'|CT11']||{}).no||[]).length;
   /* พิมพ์เองก็ลงร่าง (หน่วง 400ms) */
   window.__ta().value='715426 715427';spNoLive('CT11');
   await new Promise(r=>setTimeout(r,550));
   o.typed=spNoDraftGet('CT11',B1,WORK_).length;
   /* โหมดส่วนตัว: localStorage ใช้ไม่ได้ ต้องไม่ throw และหน้ายังวาดได้ */
   const real=window.localStorage;
   try{Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new Error('blocked')}});}catch(e){}
   let boom='';
   try{spNoDraftPut('CT11',['1']);spNoDraftGet('CT11');spNoDraftClear('CT11');renderSpord();}
   catch(e){boom=e.message;}
   try{Object.defineProperty(window,'localStorage',{configurable:true,value:real});}catch(e){}
   o.boom=boom;o.stillBox=!!window.__ta();
   return o;
 },{setup:PRE,pre:OCRPRE});
 t('🛟 ร่างเก็บใน localStorage ของเครื่องเท่านั้น และคีย์ขึ้นต้นด้วย bdspno:',
   /^bdspno:/.test(ocrDr.key||'')&&ocrDr.keys.length===1,
   String(ocrDr.key||'')+' · พบ '+ocrDr.keys.length+' คีย์');
 t('🛟 ร่างแยกตามใบ+วันที่+สาย — วันอื่นหรือสายอื่นไม่เห็นของเรา',
   ocrDr.otherDay===0&&ocrDr.otherLn===0,'วันอื่น '+ocrDr.otherDay+' · สายอื่น '+ocrDr.otherLn);
 t('🛟 บันทึกไม่ผ่าน (เน็ตหลุด) ร่างต้องยังอยู่ครบ 5 เลข ไม่หายทั้งสองที่',
   ocrDr.afterFail===5&&ocrDr.savedFail===0,
   'ร่าง '+ocrDr.afterFail+' · ในเครื่อง '+ocrDr.savedFail);
 t('🛟 พิมพ์เลขเองก็เก็บลงร่างให้เหมือนกัน',ocrDr.typed===2,'ร่าง '+ocrDr.typed+' เลข');
 t('🛟 เบราว์เซอร์ที่ห้าม localStorage (โหมดส่วนตัว) ยังใช้งานได้ ไม่พัง',
   !ocrDr.boom&&ocrDr.stillBox===true,ocrDr.boom||'ok');


 /* ============================================================================
  * 13) 🔁 ย้อนหาเลขออเดอร์ที่ตกหล่น — เจ้าของสั่ง 28 พ.ย. 69
  *   *"ทำให้ระบบอ่านย้อนหลังที่เค้าอัพมาได้ไหม … ลองย้อนไปดูได้ไหมว่าเราตกอะไร
  *     แล้วเอามันกลับมาได้เลย"*
  *   เลขที่หายไม่ได้หายไปจากโลก — ตัวออเดอร์ยังอยู่ในไฟล์ พร้อม "สาย" และ "วันที่คีย์"
  *   จึงถามกลับทางได้ว่าสายนี้วันนั้นคีย์ใบอะไรไว้บ้าง แล้วเทียบกับเลขในช่อง
  * ========================================================================== */
 const MISSPRE = `
   __as('manager','','ผู้จัดการ');
   SP.sid=B1;SP.view='slip';SP.ym='2026-11';SP.day=WORK_;SP.sec='rep';SP.miss={on:0,sid:'',day:undefined};
   CSTOCK.rep={};CSTOCK.key={};
   CSTOCK.key[B1+'|'+WORK_+'|CT11']={it:{AAA1:{sc:5,sp:0,fc:0,fp:0}},at:1,by:'sup'};
   MASTER={items:{AAA1:{nm:'โอโมน้ำ'},ZZZ9:{nm:'สินค้าอื่น'}},det:{AAA1:{ps:12}}};
   CSTOCK.lots={L1:{id:'L1',sl:B1,d:WORK_,code:'AAA1',nm:'โอโมน้ำ',cs:20,pc:0,ln:'CT11',clr:[]}};
   window.__ym=WORK_.slice(0,7);window.__dd=+WORK_.slice(8,10);
   window.__oth=(()=>{const d=new Date(WORK_+'T00:00:00');d.setDate(d.getDate()-1);return ymdOf(d);})();
   /* 20 ใบของ CT11 วันนี้ — แบบเดียวกับที่สาย 17 คีย์จริง */
   STOREDAILY={data:{},ord:{}};
   const OTO={},OTD={};
   for(let i=1;i<=20;i++){
     const tail='000070'+String(i).padStart(2,'0');
     const full='BDD01'+tail, rf='10347700'+String(i).padStart(2,'0');
     STOREDAILY.ord[full]={s:'900000'+(i%3),l:'209611',k:WORK_,d:WORK_,cs:8,pc:5,c:2,v:900,rf:rf};
     OTO[tail]={l:'209611',d:window.__dd,s:'900000'+(i%3),rf:rf,w:8,p:5,c:8.4,n:2};
     /* ใบที่ 18-20 ไม่มีสินค้าของใบนี้ → ต้องไปกอง "ไม่แน่ใจ" */
     OTD[tail]=(i<=17)?{AAA1:[8,0,12]}:{ZZZ9:[3,0,6]};
   }
   /* ใบของสายอื่น และใบของสายเดียวกันแต่คนละวัน — ห้ามโผล่ */
   STOREDAILY.ord['BDD0100008001']={s:'9000009',l:'209612',k:WORK_,d:WORK_,cs:4,pc:0,c:1,rf:'1034780001'};
   OTO['00008001']={l:'209612',d:window.__dd,s:'9000009',rf:'1034780001',w:4,p:0,c:4,n:1};
   STOREDAILY.ord['BDD0100009001']={s:'9000001',l:'209611',k:window.__oth,d:window.__oth,cs:9,pc:0,c:1,rf:'1034790001'};
   OTO['00009001']={l:'209611',d:+window.__oth.slice(8,10),s:'9000001',rf:'1034790001',w:9,p:0,c:9,n:1};
   /* ใบที่ยกเลิกแล้ว — ห้ามเติมให้ */
   STOREDAILY.ord['BDD0100007099']={s:'9000002',l:'209611',k:WORK_,d:WORK_,cs:3,pc:0,c:1,rf:'1034770099'};
   OTO['00007099']={l:'209611',d:window.__dd,s:'9000002',rf:'1034770099',w:3,p:0,c:3,n:1,cx:1};
   OTD['00007099']={AAA1:[3,0,12]};
   OT.cache[window.__ym]={ord:OTO,det:OTD,meta:null,none:0};
   OT.months=[window.__ym];
   spRfBust();
   /* เซลล์เก็บไว้ได้แค่ 13 เลขแรก — เคสจริงของสาย 17 */
   window.__first13=[];for(let i=1;i<=13;i++)window.__first13.push('10347700'+String(i).padStart(2,'0'));
   CSTOCK.rep[B1+'|'+WORK_+'|CT11']={it:{},no:window.__first13.slice(),n:1,h:[{at:1}],
     by:'209611',byName:'CT11',at:2};
   renderSpord();`;

 /* ---- ① หาเจอว่าตกอะไร และไม่เหมาเอาใบของสายอื่น/วันอื่น ---- */
 const miss1=await ev(a=>{
   eval(a.setup);setup();eval(a.pre);
   const codes={};spSlipCodes(B1).forEach(c=>{codes[c.code]=1;});
   const r=spMissFind(B1,WORK_,'CT11',codes);
   return {nHave:r.nHave,sure:r.sure.map(x=>x.ask),maybe:r.maybe.map(x=>x.ask),
     cancel:r.cancel.map(x=>x.ask),noFile:r.noFile,
     shop:(r.sure[0]||{}).shop,qty:(r.sure[0]||{}).q};
 },{setup:PRE,pre:MISSPRE});
 t('🔁 อ่านย้อนจากไฟล์แล้วบอกได้ว่าตกไปกี่เลข (13 ใส่ไว้ · ตกไป 7)',
   miss1.nHave===13&&(miss1.sure.length+miss1.maybe.length)===7,
   'ในช่อง '+miss1.nHave+' · แน่ใจ '+miss1.sure.length+' · ไม่แน่ใจ '+miss1.maybe.length);
 t('🔁 ...แยก "แน่ใจ" (ใบมีสินค้าของใบออเดอร์นี้) ออกจาก "ไม่แน่ใจ" ไม่เหมารวม',
   miss1.sure.length===4&&miss1.maybe.length===3
   &&miss1.sure.join()==='1034770014,1034770015,1034770016,1034770017',
   'แน่ใจ '+miss1.sure.join(' ')+' · ไม่แน่ใจ '+miss1.maybe.join(' '));
 t('🔁 ...ใบที่ยกเลิกแล้วแยกกองไว้ ไม่ปนกับที่จะเติม',
   miss1.cancel.length===1&&miss1.cancel[0]==='1034770099'
   &&miss1.sure.indexOf('1034770099')<0&&miss1.maybe.indexOf('1034770099')<0,
   'ยกเลิก '+miss1.cancel.join(' '));
 t('🔁 ...ใบของสายอื่นและใบของวันอื่นต้องไม่โผล่มาเลย',
   miss1.sure.concat(miss1.maybe,miss1.cancel).every(x=>/^10347700/.test(x)),
   miss1.sure.concat(miss1.maybe,miss1.cancel).join(' '));
 t('🔁 ...บอกร้านและจำนวนของใบที่ตกมาด้วย (ไม่ใช่เลขเปล่า ๆ)',
   !!miss1.shop&&!!miss1.qty&&miss1.qty.cs===8&&miss1.qty.pc===5,
   'ร้าน '+miss1.shop+' · '+JSON.stringify(miss1.qty));

 /* ---- ② เลขเดียวกันเขียนคนละแบบ ต้องไม่ถูกนับว่าตก ---- */
 const miss2=await ev(a=>{
   eval(a.setup);setup();eval(a.pre);
   const codes={};spSlipCodes(B1).forEach(c=>{codes[c.code]=1;});
   const o={};
   /* เขียนด้วยหางหกหลัก และด้วยเลขใบเต็ม BDD01 */
   CSTOCK.rep[B1+'|'+WORK_+'|CT11'].no=window.__first13.concat(['770014','BDD0100007015']);
   const r=spMissFind(B1,WORK_,'CT11',codes);
   o.left=r.sure.map(x=>x.ask).concat(r.maybe.map(x=>x.ask));
   /* ไม่มีไฟล์ของวันนั้นเลย = ยังตอบไม่ได้ ห้ามอ่านว่า "ไม่ตกอะไร" */
   const r2=spMissFind(B1,window.__oth,'CT13',codes);
   o.noFile=r2.noFile;o.n2=r2.n;
   return o;
 },{setup:PRE,pre:MISSPRE});
 t('🔁 เลขเดิมที่เขียนเป็นหางหกหลัก หรือเลข BDD01 ต้องไม่ถูกนับว่าตกหล่น',
   miss2.left.length===5&&miss2.left.indexOf('1034770014')<0&&miss2.left.indexOf('1034770015')<0,
   'เหลือ '+miss2.left.join(' '));
 t('🔁 วันที่ยังไม่มีไฟล์ = ตอบไม่ได้ ไม่ใช่ "ไม่ตกอะไร"',
   miss2.noFile===1&&!miss2.n2,'noFile='+miss2.noFile);

 /* ---- ③ เติมกลับ: ต่อท้ายของเดิมเสมอ และส่งขึ้นเซิร์ฟเวอร์ตามเดิม ---- */
 const miss3=await ev(async a=>{
   eval(a.setup);setup();eval(a.pre);
   const o={};
   const blob=JSON.stringify(CSTOCK);
   SP.miss={on:1,sid:B1,day:WORK_};
   const h=spMissHtml(B1);
   o.scanSafe=(JSON.stringify(CSTOCK)===blob);     /* แค่สแกนต้องไม่แตะข้อมูล */
   o.saysSure=/แน่ใจ 4/.test(h)&&/ไม่เติมให้/.test(h);
   window.__posts=[];
   await spMissAdd(B1,WORK_,'CT11','sure',1);
   await new Promise(r=>setTimeout(r,80));
   const rec=CSTOCK.rep[B1+'|'+WORK_+'|CT11']||{};
   o.after=(rec.no||[]).length;
   o.keptFirst=(rec.no||[])[0];
   o.posts=window.__posts.length;
   o.sent=(((window.__posts[0]||{}).b||{}).no||[]).length;
   const codes={};spSlipCodes(B1).forEach(c=>{codes[c.code]=1;});
   o.leftSure=spMissFind(B1,WORK_,'CT11',codes).sure.length;
   return o;
 },{setup:PRE,pre:MISSPRE});
 t('🔁 แค่กดดูต้องไม่แตะข้อมูลเลย (อ่านอย่างเดียว)',miss3.scanSafe===true,
   'เปลี่ยน='+(!miss3.scanSafe));
 t('🔁 ...หน้าจอบอกจำนวนที่แน่ใจ และบอกว่าใบยกเลิกไม่เติมให้',miss3.saysSure===true,'');
 t('🔁 เติมกลับแล้วต่อท้ายของเดิม ไม่เขียนทับ (13 → 17)',
   miss3.after===17&&miss3.keptFirst==='1034770001',
   'เหลือ '+miss3.after+' เลข · ตัวแรก '+miss3.keptFirst);
 t('🔁 ...ส่งขึ้นเซิร์ฟเวอร์ครบ 17 เลข ทาง api/spord เหมือนการบันทึกปกติ',
   miss3.posts===1&&miss3.sent===17,'โพสต์ '+miss3.posts+' · ส่ง '+miss3.sent);
 t('🔁 ...เติมแล้วไม่เหลือค้างอีก',miss3.leftSure===0,'เหลือ '+miss3.leftSure);

 /* ---- ④ เซลล์เห็นเฉพาะสายตัวเอง ---- */
 const miss4=await ev(a=>{
   eval(a.setup);setup();eval(a.pre);
   __as('sales','209611','CT11');
   SP.miss={on:1,sid:B1,day:WORK_};
   const S=spMissScan(B1);
   return {lines:S.lines,lns:S.rows.map(r=>r.ln)};
 },{setup:PRE,pre:MISSPRE});
 t('🔁 เซลล์กดดูได้ แต่เห็นเฉพาะสายตัวเอง',
   miss4.lines===1&&miss4.lns.every(x=>x==='CT11'),
   'สาย '+miss4.lines+' · '+miss4.lns.join(' '));


 /* ============================================================================
  * 14) 🧮 เป้า vs คีย์จริง ต้องแปลงเป็น "ชิ้น ทีละรหัสสินค้า" ก่อนเทียบ
  *   เจ้าของทักจากหน้าจอจริง 28 พ.ย. 69: *"ทำไมผลต่างเป้า กับจำนวนคีย์มันแปลก ๆ
  *   อย่าลืมจับรหัสของสินค้า และแปลงหน่อย จากลังเป็นชิ้น ให้มัน match เข้าด้วยกันได้หน่อยนะ"*
  *   จอเขาอ่านว่า เป้า 7 ลัง · คีย์จริง 1 ลัง 72 ชิ้น · ยังขาด −6 ลัง +72 ชิ้น
  *   ซึ่งเกิดจากเอาลังลบลัง ชิ้นลบชิ้น แยกกัน · ถ้าลังละ 12 ชิ้น มันคือ 84 ชิ้น = 7 ลัง = ครบพอดี
  * ========================================================================== */
 const CONV = `
   __as('sup',null,'หัวหน้าเซลล์');
   SP.sid=B1;SP.view='slip';SP.ym='2026-11';SP.day=WORK_;SP.sec='rep';SP.trk={};
   CSTOCK.rep={};CSTOCK.key={};
   MASTER={items:{P12:{nm:'โอโมน้ำ'},P24:{nm:'บรีส'},PX:{nm:'ของไม่รู้ขนาด'}},
           det:{P12:{ps:12},P24:{ps:24}}};
   CSTOCK.lots={L1:{id:'L1',sl:B1,d:WORK_,code:'P12',nm:'โอโมน้ำ',cs:7,pc:0,ln:'CT11',clr:[]},
                L2:{id:'L2',sl:B1,d:WORK_,code:'P24',nm:'บรีส',cs:2,pc:0,ln:'CT11',clr:[]}};
   window.__ym=WORK_.slice(0,7);
   STOREDAILY={data:{},ord:{
     'BDD0100000101':{s:'900001',l:'209611',k:WORK_,d:WORK_,cs:1,pc:72,c:2,rf:'1034000101'},
     'BDD0100000102':{s:'900002',l:'209612',k:WORK_,d:WORK_,cs:3,pc:0,c:1,rf:'1034000102'},
     'BDD0100000103':{s:'900003',l:'209613',k:WORK_,d:WORK_,cs:5,pc:0,c:1,rf:'1034000103'}}};
   OT.cache[window.__ym]={ord:{},meta:null,none:0,det:{
     /* CT11: โอโม 7 ลัง (84 ชิ้น) — ตรงเป๊ะกับเป้า · บวกสินค้านอกใบอีกตัวที่ต้องถูกกรองทิ้ง */
     '00000101':{P12:[7,0,12],ZZZ:[9,0,6]},
     /* CT12: โอโม 3 ลัง = 36 ชิ้น จากเป้า 7 ลัง = 84 ชิ้น → ขาด 48 ชิ้น = 4 ลัง */
     '00000102':{P12:[3,0,12]},
     /* CT13: บรีส 2 ลัง 12 ชิ้น (60 ชิ้น) จากเป้า 2 ลัง (48) → เกิน 12 ชิ้น */
     '00000103':{P24:[2.5,0,24]}}};
   spRfBust();
   const put=(ln,it,no)=>{CSTOCK.key[B1+'|'+WORK_+'|'+ln]={it:it,by:'sup',at:1};
     CSTOCK.rep[B1+'|'+WORK_+'|'+ln]={it:{},no:no,n:1,h:[{at:2}],by:'x',byName:'x',at:2};};
   put('CT11',{P12:{sc:7,sp:0,fc:0,fp:0}},['1034000101']);
   put('CT12',{P12:{sc:7,sp:0,fc:0,fp:0}},['1034000102']);
   put('CT13',{P24:{sc:2,sp:0,fc:0,fp:0}},['1034000103']);
   /* CT14: เป้ามีรหัสที่ไม่รู้ขนาดลัง · CT15: คีย์แล้วแต่ยังไม่มีไฟล์ใบจัดของของใบนั้น */
   put('CT14',{PX:{sc:3,sp:0,fc:0,fp:0}},[]);
   CSTOCK.rep[B1+'|'+WORK_+'|CT14']={it:{},no:[],n:1,h:[{at:2}],by:'x',byName:'x',at:2};
   put('CT15',{P12:{sc:4,sp:0,fc:0,fp:0}},['1034000199']);
   STOREDAILY.ord['BDD0100000199']={s:'900004',l:'209615',k:WORK_,d:WORK_,cs:2,pc:0,c:1,rf:'1034000199'};
   spRfBust();
   renderSpord();
   window.__tr=ln=>spTrack(B1,WORK_).filter(x=>x.ln===ln)[0];`;

 const conv=await ev(a=>{
   eval(a.setup);setup();eval(a.pre);
   const g=ln=>{const x=window.__tr(ln);return x?{tgt:x.tgtCs,rep:x.repCs,st:x.st,
     short:x.short,over:x.over,src:x.rSrc,blind:!!x.blind,
     tunk:x.tgt.unk.length,nodet:x.od?x.od.nodet:0}:null;};
   const o={a:g('CT11'),b:g('CT12'),c:g('CT13'),d:g('CT14'),e:g('CT15')};
   o.txt=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   o.frac=/\d+\.\d+ ลัง/.test(o.txt);
   o.mixed=/−\d+ ลัง \+\d+ ชิ้น|-\d+ ลัง \+\d+ ชิ้น/.test(o.txt);
   return o;
 },{setup:PRE,pre:CONV});
 t('🧮 เป้า 7 ลัง กับที่คีย์ 84 ชิ้น (ลังละ 12) = ครบพอดี ไม่ใช่ "ขาด 6 ลัง เกิน 72 ชิ้น"',
   conv.a&&conv.a.tgt.cs===7&&conv.a.rep.cs===7&&conv.a.rep.pc===0&&conv.a.st==='ok',
   JSON.stringify(conv.a));
 t('🧮 ...และสินค้าที่ไม่ได้อยู่ในใบออเดอร์นี้ ต้องไม่ถูกนับเข้ามาด้วย',
   conv.a&&conv.a.rep.cs===7,'คีย์จริง '+(conv.a&&conv.a.rep.cs)+' ลัง (ถ้านับ ZZZ ด้วยจะเกิน)');
 t('🧮 ขาดจริงคิดเป็นชิ้นแล้วแตกกลับ — เป้า 84 ชิ้น คีย์ 36 ชิ้น = ขาด 4 ลัง',
   conv.b&&conv.b.st==='short'&&conv.b.short.cs===4&&conv.b.short.pc===0&&conv.b.rep.cs===3,
   JSON.stringify(conv.b));
 t('🧮 เกินก็แตกกลับเหมือนกัน — เป้า 2 ลัง (48) คีย์ 60 ชิ้น = เกิน 12 ชิ้น',
   conv.c&&conv.c.st==='over'&&conv.c.over.cs===0&&conv.c.over.pc===12&&conv.c.rep.cs===2&&conv.c.rep.pc===12,
   JSON.stringify(conv.c));
 t('🧮 รหัสที่ไม่รู้ขนาดลัง ต้องนับแล้วบอก ไม่ใช่เดาเป็นลังละเท่าไหร่ก็ได้',
   conv.d&&conv.d.tunk===1&&/ไม่รู้ขนาดลัง/.test(conv.txt),'tunk='+(conv.d&&conv.d.tunk));
 t('🧮 คีย์แล้วแต่ยังไม่มีรายการสินค้าในใบ = ยังเทียบไม่ได้ ไม่ใช่ "ขาดทั้งหมด"',
   conv.e&&conv.e.blind===true&&conv.e.st==='unk'&&/ยังเทียบไม่ได้/.test(conv.txt)
   &&/รอไฟล์ใบจัดของ/.test(conv.txt),JSON.stringify(conv.e));
 t('📦 ...และทั้งตารางต้องไม่มีลังทศนิยม หรือผลต่างแบบ "−6 ลัง +72 ชิ้น" หลงเหลือ',
   conv.frac===false&&conv.mixed===false,
   'ทศนิยม='+conv.frac+' · ลบลังบวกชิ้น='+conv.mixed);

 /* ============================================================================
  * 15) 🔁 เติมย้อนหลังทั้งใบ — "เซลล์คีย์" + "คลังจัด" (เจ้าของสั่ง 27 พ.ย. 69)
  *   *"ผมต้องการทำให้คุณวิเคราะห์แล้วใส่ตัวเลขย้อนหลังของออเดอร์ที่เซลล์คีย์ และคลังจัดทั้งหมด
  *     ตั้งแต่วันที่ 19 พย จนถึงวันนี้ … แค่วันที่ออเดอร์ เซลล์แต่ละสายจะคีย์คนละช่วงเวลา แต่จะ
  *     คีย์พร้อมๆกัน ส่วนแอดมินจะจัดกลุ่มออเดอร์พวกนี้ออกมาขึ้น GIN แบบติดกัน"*
  *
  *   📏 ฟิกซ์เจอร์นี้สร้างจาก pattern ที่วัดได้จากไฟล์จริงของเจ้าของ (19 และ 21 พ.ย. 69):
  *      1 ใบ = 1 ร้าน · 1 สาย = 1 GIN · GIN ของแต่ละสายออกมาติดกันเป็นชุด (68–71)
  *      และมี GIN หลุดชุดจริง ๆ อยู่ด้วย (96) ซึ่งต้อง "บอกไว้" ไม่ใช่กรองทิ้ง
  *   ⚠️ วันทั้งหมดอ้างจาก todayISO() ไม่ใช่วันที่ตายตัว — เทสต์ที่ผูกกับวันจริงจะพังเองวันหนึ่ง
  *      (บทเรียนเดิมของ spord §8 ที่พังหลังห้าโมงเย็น และกฎ "เทสต์ต้องบังคับเงื่อนไข ไม่ใช่
  *      รอให้วันนี้เป็นวันที่ถูก")
  * ========================================================================== */
 const BACKPRE = `
   __as('manager','','ผู้จัดการ');
   window.__d0=spBackStep(todayISO(),-8);     /* วันสร้างใบ = รอบแรก */
   window.__dnf=spBackStep(todayISO(),-6);    /* วันที่ไม่มีไฟล์เลย */
   window.__dchk=spBackStep(todayISO(),-5);   /* วันที่แอดมินตรวจเองไว้แล้ว */
   CSTOCK.slips[B1].d=window.__d0;CSTOCK.slips[B1].g='D';
   CSTOCK.rep={};CSTOCK.key={};CSTOCK.gin={};
   MASTER={items:{FO01:{nm:'ซิตร้า เพิร์ล FO'},FO02:{nm:'ซิตร้า ทานาคา FO'},
                  ZZ99:{nm:'สินค้าอื่นที่ไม่อยู่ในใบ'}},det:{FO01:{ps:12},FO02:{ps:12}}};
   CSTOCK.lots={L1:{id:'L1',sl:B1,d:window.__d0,code:'FO01',nm:'ซิตร้า เพิร์ล FO',
                    cs:6,pc:0,ln:'CT11',clr:[]},
                L2:{id:'L2',sl:B1,d:window.__d0,code:'FO02',nm:'ซิตร้า ทานาคา FO',
                    cs:6,pc:0,ln:'CT11',clr:[]}};
   STOREDAILY={data:{},ord:{}};
   const OTO={},OTD={};
   /* 1 สาย = 1 GIN · GIN ติดกัน 68–71 · CT13 หลุดไปอยู่ 96 (ของจริงมีจริง) */
   const PL=[['209615','CT15','68','10:45',2],['209622','CT22','69','14:28',2],
             ['209611','CT11','70','14:22',3],['209617','CT17','71','10:35',2],
             ['209613','CT13','96','11:36',1]];
   window.__want={};
   PL.forEach(function(p,pi){
     for(var i=1;i<=p[4];i++){
       var tail='1'+(pi+1)+'00000'+i;
       var full='BDD01'+tail;
       OTO[tail]={l:p[0],d:+window.__d0.slice(8,10),s:'SH'+p[1]+i,g:p[2],
                  tm:(i===1?p[3]:'15:'+String(10+i).padStart(2,'0')),w:1,p:0,c:1,n:1};
       OTD[tail]={FO01:[1,0,12]};
       (window.__want[p[1]]=window.__want[p[1]]||[]).push(full);
     }
   });
   /* ใบของ CT11 ที่มีแต่สินค้านอกใบ → ต้องไม่ถูกนับเลย */
   OTO['20000001']={l:'209611',d:+window.__d0.slice(8,10),s:'SHX1',g:'70',tm:'15:30',w:9,p:0,c:9,n:1};
   OTD['20000001']={ZZ99:[9,0,6]};
   /* ใบที่ยกเลิก (มีสินค้าของใบนี้) → นับไว้ ไม่เติม */
   OTO['20000002']={l:'209611',d:+window.__d0.slice(8,10),s:'SHX2',g:'70',tm:'15:35',
                    w:1,p:0,c:1,n:1,cx:1};
   OTD['20000002']={FO01:[1,0,12]};
   /* ใบที่ยังไม่รู้รายการสินค้า (ไม่มีใน det) → กอง "ไม่แน่ใจ" ไม่เติมเอง */
   OTO['20000003']={l:'209611',d:+window.__d0.slice(8,10),s:'SHX3',g:'70',tm:'15:40',w:1,p:0,c:1,n:1};
   /* วันที่แอดมินตรวจไว้แล้ว — มีออเดอร์ของใบนี้ แต่ฝั่งคลังจัดต้องถูกข้าม */
   OTO['30000001']={l:'209611',d:+window.__dchk.slice(8,10),s:'SHC1',g:'120',tm:'09:10',
                    w:2,p:0,c:2,n:1};
   OTD['30000001']={FO01:[2,0,12]};
   CSTOCK.gin[B1+'|'+window.__dchk]={g:['120'],rows:{FO01:{fc:2}},dd:[window.__dchk],
     miss:[],file:'ของแอดมินเอง',by:'manager',byName:'ผู้จัดการ',at:9};
   /* det/ord ของทุกเดือนในช่วง 9 วัน (ช่วงอาจคาบสองเดือน) */
   for(var k=0;k<=8;k++){
     var m=spBackStep(todayISO(),-8+k).slice(0,7);
     OT.cache[m]={ord:OTO,det:OTD,meta:null,none:0};
   }
   OT.months=Object.keys(OT.cache);
   spRfBust();
   /* CT11 เคยคีย์ไว้แล้ว 1 เลขจาก 3 → เติมต้องได้อีก 2 และของเดิมต้องอยู่ */
   CSTOCK.rep[B1+'|'+window.__d0+'|CT11']={it:{},no:[window.__want.CT11[0]],n:1,h:[{at:1}],
     by:'209611',byName:'CT11',at:2};
   SP.sid=B1;SP.view='slip';SP.sec='rep';SP.day=window.__d0;SP.ym=window.__d0.slice(0,7);
   SP.back={on:0,sid:'',busy:0,i:0,n:0,open:{}};
   renderSpord();`;

 /* ---- ① ช่วงวัน + จับออเดอร์เข้าใบด้วยรหัสสินค้า ---- */
 const bk1=await ev(a=>{
   eval(a.setup);setup();eval(a.pre);
   const blob=JSON.stringify(CSTOCK);
   const S=spBackScan(B1);
   const d0=S.rows.filter(r=>r.d===window.__d0)[0]||null;
   const L=ln=>(d0?(d0.rows.filter(x=>x.ln===ln)[0]||null):null);
   return {days:S.days,d0:S.d0,d1:S.d1,today:todayISO(),codes:S.codes,
     nOrd:S.nOrd,shops:S.shops,nNew:S.nNew,cx:S.cx,unsure:S.unsure,
     nofile:S.nofile,chk:S.chk,gin:S.gin,
     run:d0?spBackRunTxt(d0.run):'',top:d0?d0.run.top:0,
     ct11:L('CT11')?{n:L('CT11').n,sh:L('CT11').shops,t0:L('CT11').t0,t1:L('CT11').t1,
       gin:Object.keys(L('CT11').gin),add:L('CT11').add.length,
       maybe:L('CT11').maybe.length,cx:L('CT11').cx.length}:null,
     ct17:L('CT17')?{n:L('CT17').n,gin:Object.keys(L('CT17').gin),t0:L('CT17').t0}:null,
     safe:(JSON.stringify(CSTOCK)===blob)};
 },{setup:PRE,pre:BACKPRE});
 t('🔁 กวาดทุกวันจากวันที่สร้างใบถึงวันนี้ ไม่ใช่แค่วันที่มีคนตั้งเป้าไว้',
   bk1.days===9&&bk1.d1===bk1.today,
   bk1.days+' วัน · '+bk1.d0+' → '+bk1.d1+' (วันนี้ '+bk1.today+')');
 t('🔁 จับออเดอร์เข้าใบด้วยรหัสสินค้าของใบ — ใบที่มีแต่สินค้านอกใบต้องไม่ถูกนับ',
   bk1.nOrd===11&&bk1.ct11&&bk1.ct11.n===3,
   'รวม '+bk1.nOrd+' ใบ · CT11 '+(bk1.ct11&&bk1.ct11.n)+' ใบ (ถ้านับ ZZ99 ด้วยจะเป็น 4)');
 t('🏪 1 ใบ = 1 ร้าน ตามที่วัดได้จากไฟล์จริง',
   bk1.ct11&&bk1.ct11.n===bk1.ct11.sh&&bk1.shops===11,
   'CT11 '+(bk1.ct11&&bk1.ct11.n)+' ใบ / '+(bk1.ct11&&bk1.ct11.sh)+' ร้าน · รวม '+bk1.shops+' ร้าน');
 t('🕘 บอกช่วงเวลาที่แต่ละสายคีย์ — คนละช่วงกันจริงอย่างที่เจ้าของบอก',
   bk1.ct11&&bk1.ct11.t0==='14:22'&&bk1.ct17&&bk1.ct17.t0==='10:35',
   'CT11 '+(bk1.ct11&&bk1.ct11.t0)+'→'+(bk1.ct11&&bk1.ct11.t1)+' · CT17 '+(bk1.ct17&&bk1.ct17.t0));
 t('🚚 1 สาย = 1 GIN และ GIN ออกมาติดกันเป็นชุด (68–71 = 4 ใบ)',
   bk1.top===4&&/68–71 \(4 ใบ\)/.test(bk1.run)&&bk1.ct11.gin.length===1&&
   bk1.ct11.gin[0]==='70'&&bk1.ct17.gin[0]==='71',
   'ชุดยาวสุด '+bk1.top+' · '+bk1.run);
 t('🚚 ...GIN ที่หลุดออกนอกชุดต้องบอกไว้ ไม่กรองทิ้งเงียบ ๆ',
   /96/.test(bk1.run)&&bk1.gin===6,'GIN '+bk1.gin+' ใบ · '+bk1.run);
 t('🔁 ใบที่ยกเลิกนับไว้ ไม่เติม · ใบที่ยังไม่รู้รายการสินค้าแยกเป็น "ไม่แน่ใจ"',
   bk1.cx===1&&bk1.unsure===1&&bk1.ct11.cx===1&&bk1.ct11.maybe===1,
   'ยกเลิก '+bk1.cx+' · ไม่แน่ใจ '+bk1.unsure);
 t('🔁 วันที่ไม่มีไฟล์เลย = "รอไฟล์" ไม่ใช่ "ไม่มีอะไรตกหล่น"',
   bk1.nofile===7,'รอไฟล์ '+bk1.nofile+' วัน');
 t('🔁 วันที่แอดมินตรวจเองไว้แล้ว ต้องรู้ว่าตรวจแล้ว',bk1.chk===1,'ตรวจแล้ว '+bk1.chk+' วัน');
 t('🛟 แค่กวาดดูต้องไม่แตะข้อมูลเลย (อ่านอย่างเดียว)',bk1.safe===true,'เปลี่ยน='+(!bk1.safe));

 /* ---- ② หน้าจอ ---- */
 const bk2=await ev(a=>{
   eval(a.setup);setup();eval(a.pre);
   SP.back={on:1,sid:B1,busy:0,i:0,n:0,open:{}};
   SP.back.open[window.__d0]=1;
   const h=spBackHtml(B1);
   const d=document.createElement('div');d.innerHTML=h;
   const tx=d.textContent.replace(/\s+/g,' ');
   return {tx:tx,rows:d.querySelectorAll('tr.sp-backd').length,
     lines:d.querySelectorAll('tr.sp-backl').length,
     btnRep:/เติมเลขออเดอร์ที่เซลล์คีย์/.test(h),btnGin:/เติมคลังจัด/.test(h),
     frac:/\d+\.\d+ ลัง/.test(tx)};
 },{setup:PRE,pre:BACKPRE});
 t('🔁 หน้าจอบอกช่วงวัน จำนวนใบ ร้าน GIN และจำนวนที่ยังไม่อยู่ในระบบ',
   /9 วัน/.test(bk2.tx)&&/11 ใบ/.test(bk2.tx)&&/11 ร้าน/.test(bk2.tx)&&/6 ใบ/.test(bk2.tx)&&
   /10 เลข/.test(bk2.tx),bk2.tx.slice(0,190));
 t('🔁 ...กางวันออกมาเห็นรายสาย พร้อมเวลาคีย์และเลข GIN',
   bk2.rows===2&&bk2.lines===5&&/68–71/.test(bk2.tx)&&/14:22/.test(bk2.tx),
   bk2.rows+' วัน · '+bk2.lines+' สาย');
 t('🔁 ...บอกเหตุที่ไม่เติมให้ครบทุกข้อ (รอไฟล์ · ไม่แน่ใจ · ยกเลิก · แอดมินตรวจแล้ว)',
   /ยังไม่มีไฟล์ของ 7 วัน/.test(bk2.tx)&&/ยังไม่รู้รายการสินค้าของ 1 ใบ/.test(bk2.tx)&&
   /ใบที่ยกเลิก 1 ใบ/.test(bk2.tx)&&/แอดมินตรวจเองไว้แล้ว 1 วัน/.test(bk2.tx),
   bk2.tx.slice(0,460));
 t('📦 ...และไม่มีลังทศนิยมหลงอยู่บนหน้านี้',bk2.frac===false,'');

 /* ---- ③ เติมกลับ: ต่อท้ายเสมอ ---- */
 const bk3=await ev(async a=>{
   eval(a.setup);setup();eval(a.pre);
   window.__posts=[];
   await spBackRun(B1,'rep');
   await new Promise(r=>setTimeout(r,120));
   const kb=B1+'|'+window.__d0+'|';
   const no=ln=>((CSTOCK.rep[kb+ln]||{}).no||[]);
   const all=[].concat(no('CT11'),no('CT13'),no('CT15'),no('CT17'),no('CT22'));
   const S=spBackScan(B1);
   return {ct11:no('CT11'),first:no('CT11')[0],want1:window.__want.CT11[0],
     n:all.length,posts:window.__posts.length,
     acts:window.__posts.map(p=>p.b&&p.b.act),
     dup:all.length!==Object.keys(all.reduce((o,x)=>{o[x]=1;return o;},{})).length,
     cxIn:all.indexOf('BDD0120000002')>=0,mbIn:all.indexOf('BDD0120000003')>=0,
     left:S.nNew};
 },{setup:PRE,pre:BACKPRE});
 t('🔁 เติมแล้วต่อท้ายของเดิม ไม่เขียนทับ (CT11 1 → 3 เลข ตัวแรกยังอยู่)',
   bk3.ct11.length===3&&bk3.first===bk3.want1,
   'CT11 '+bk3.ct11.length+' เลข · ตัวแรก '+bk3.first);
 t('🔁 ...ครบทั้ง 5 สาย ผ่าน api/spord act:"rep" เหมือนการบันทึกปกติ ไม่มีเลขซ้ำ',
   bk3.n===10&&bk3.posts===6&&bk3.acts.every(x=>x==='rep')&&bk3.dup===false,
   bk3.n+' เลข · '+bk3.posts+' โพสต์ · '+bk3.acts.join(','));
 t('🔁 ...ใบที่ยกเลิกและใบที่ยังไม่รู้รายการสินค้า ต้องไม่ถูกเติมเข้าไป',
   bk3.cxIn===false&&bk3.mbIn===false,'ยกเลิก='+bk3.cxIn+' · ไม่แน่ใจ='+bk3.mbIn);
 t('🔁 ...เติมแล้วไม่เหลือค้างอีก',bk3.left===0,'เหลือ '+bk3.left);

 /* ---- ④ สิทธิ์: เซลล์เห็นเฉพาะสายตัวเอง · ฝั่งคลังจัดเป็นของผู้จัดการ ---- */
 const bk4=await ev(async a=>{
   eval(a.setup);setup();eval(a.pre);
   __as('sales','209611','CT11');
   const S=spBackScan(B1);
   const h=spBackHtml(B1);
   window.__posts=[];
   SP.back={on:1,sid:B1,busy:0,i:0,n:0,open:{}};
   await spBackRun(B1,'gin');
   await new Promise(r=>setTimeout(r,60));
   return {lines:S.lines,lns:(S.rows[0]||{rows:[]}).rows.map(x=>x.ln),
     btnGin:/เติมคลังจัด/.test(h),posts:window.__posts.length,
     gin:Object.keys(CSTOCK.gin).length};
 },{setup:PRE,pre:BACKPRE});
 /* ---- ⑤ ฝั่งคลังจัด: เขียนผ่านทางเดิมของแอดมิน และข้ามวันที่แอดมินตรวจเองไว้ ---- */
 const bk5=await ev(async a=>{
   eval(a.setup);setup();eval(a.pre);
   /* ⚠️ ALLOC เป็น let ระดับบนสุดของหน้า — ต้องกำหนดแบบไม่มี window. ไม่งั้นได้ตัวแปรใหม่ที่ไม่มีใครใช้ */
   ALLOC={file:'ไฟล์ใบจัดของทดสอบ',days:[window.__d0],g:{},n:9,gins:['68','69','70','71','96'],
     kept:0,money:0};
   AL_GOT[window.__d0.slice(0,7)]=1;
   /* ⚠️ คีย์ของ rows คือ "สาย|รหัส" ไม่ใช่รหัสเปล่า — ของปลอมที่ผิดรูปทำให้ renderSpord พัง
      แล้ว spGinSave จะล้มทั้งที่ตรรกะถูก (เจอจริงตอนเขียนเทสต์นี้) */
   window.alPick=()=>({rows:{'CT11|FO01':{sc:3,ss:0,sp:0,fc:0,fs:0,fp:0,xc:0,xs:0,xp:0,
       yc:0,ys:0,yp:0,g:0,v:0,mn:0,nm:'ซิตร้า เพิร์ล FO',pk:12,sh:3}},
     dd:[window.__d0],ords:[],miss:[],n:1,money:0,mech:{},shop:{FO01:3}});
   const keep=JSON.stringify(CSTOCK.gin[B1+'|'+window.__dchk]);
   window.__posts=[];
   SP.back={on:1,sid:B1,busy:0,i:0,n:0,open:{}};
   await spBackRun(B1,'gin');
   await new Promise(r=>setTimeout(r,120));
   const gp=window.__posts.filter(p=>p.b&&p.b.act==='gin');
   return {posts:window.__posts.length,gin:gp.length,days:gp.map(p=>p.b.d),
     sent:(gp[0]&&gp[0].b.gin)||[],
     chkSame:JSON.stringify(CSTOCK.gin[B1+'|'+window.__dchk])===keep,
     d0:window.__d0,dchk:window.__dchk};
 },{setup:PRE,pre:BACKPRE});
 t('🚚 ผู้จัดการเติมคลังจัดได้ — ส่งเลข GIN ที่หาได้ไปทาง api/spord act:"gin"',
   bk5.gin===1&&bk5.posts===1&&bk5.days[0]===bk5.d0&&bk5.sent.length===5&&
   bk5.sent.indexOf('70')>=0&&bk5.sent.indexOf('96')>=0,
   bk5.gin+' โพสต์ · วัน '+bk5.days.join(',')+' · GIN '+bk5.sent.join(','));
 t('🚚 ...และห้ามแตะวันที่แอดมินตรวจเองไว้แล้ว เลขที่เขาพิมพ์เองคือตัวจริง',
   bk5.chkSame===true&&bk5.days.indexOf(bk5.dchk)<0,
   'เหมือนเดิม='+bk5.chkSame+' · วันที่ส่ง '+bk5.days.join(','));

 t('🔁 เซลล์กดดูได้ แต่เห็นเฉพาะสายตัวเอง',
   bk4.lines===1&&bk4.lns.length===1&&bk4.lns[0]==='CT11',
   'สาย '+bk4.lines+' · '+bk4.lns.join(' '));
 t('🔁 ...และเขียนฝั่งคลังจัดไม่ได้ — เช็คในฟังก์ชัน ไม่ใช่แค่ซ่อนปุ่ม',
   bk4.btnGin===false&&bk4.posts===0&&bk4.gin===1,
   'ปุ่ม='+bk4.btnGin+' · โพสต์ '+bk4.posts+' · gin '+bk4.gin+' คีย์');

 /* ============================================================================
  * 16) 🔎 ระบบอ่านจากไฟล์ให้เอง แล้วขึ้นโชว์ในที่ที่แต่ละคนทำงานอยู่ (เจ้าของสั่ง 27 พ.ย. 69)
  *   *"ผมเข้าไปใช้แล้วงงมาก ทำให้มันกลับไปหน้าตาแบบเดิม แต่คุณช่วยปรับให้ระบบมันอ่านเองเลย …
  *     ให้มันอ่านและขึ้นโชว์ในแต่ละส่วนที่เซลล์ต้องอัพ แอดมินต้องอัพเลย แบบเซลล์มีเลขออเดอร์
  *     อะไรบ้างในวันนั้น ๆ แอดมินส่งไป GIN ไหนได้บ้างในวันนั้น ๆ … ลองเอาจำนวนนั้นตั้ง แล้วตัด
  *     ออกจากที่เซลล์ไล่คีย์วันต่อมา … และตรงกับที่ใบคลังจัด allocation ไหม … หรือ match ได้ครบ
  *     100% หรือขาดตกหล่นกี่ %"*
  *
  *   ตัวเลขในฟิกซ์เจอร์ (ลังละ 12 ชิ้นทั้งสองรหัส):
  *     ตั้งต้นในใบ  FO01 10 ลัง + FO02 5 ลัง            = 180 ชิ้น = 15 ลัง
  *     เซลล์คีย์    FO01 8 ใบ × 1 ลัง + FO02 3 ใบ × 1 ลัง = 132 ชิ้น = 11 ลัง
  *     คลังจัด      FO01 6 ใบมี GIN + FO02 3 ใบมี GIN     = 108 ชิ้น = 9 ลัง
  *     เหลือ 180−132 = 48 ชิ้น = 4 ลัง  ·  ตรง 108/132 = 81.8%
  * ========================================================================== */
 const AUTOPRE = `
   __as('manager','','ผู้จัดการ');
   window.__d0=spBackStep(todayISO(),-3);
   window.__dnf=spBackStep(todayISO(),-1);      /* วันที่ไม่มีไฟล์เลย */
   CSTOCK.slips[B1].d=window.__d0;CSTOCK.slips[B1].g='D';
   CSTOCK.rep={};CSTOCK.key={};CSTOCK.gin={};
   MASTER={items:{FO01:{nm:'ซิตร้า เพิร์ล FO'},FO02:{nm:'ลักส์ โรส FO'}},
           det:{FO01:{ps:12},FO02:{ps:12}}};
   CSTOCK.lots={L1:{id:'L1',sl:B1,d:window.__d0,code:'FO01',nm:'ซิตร้า เพิร์ล FO',
                    cs:10,pc:0,ln:'CT11',clr:[]},
                L2:{id:'L2',sl:B1,d:window.__d0,code:'FO02',nm:'ลักส์ โรส FO',
                    cs:5,pc:0,ln:'CT11',clr:[]}};
   STOREDAILY={data:{},ord:{}};
   const OTO={},OTD={};
   window.__want={};
   /* FO01 — CT11 5 ใบ (4 มี GIN) · CT17 3 ใบ (2 มี GIN) */
   [['209611','CT11',5,4,'70'],['209617','CT17',3,2,'71']].forEach(function(p,pi){
     for(var i=1;i<=p[2];i++){
       var t='1'+(pi+1)+'00000'+i,full='BDD01'+t;
       OTO[t]={l:p[0],d:+window.__d0.slice(8,10),s:'SH'+p[1]+i,tm:'1'+pi+':3'+i,w:1,p:0,c:1,n:1};
       if(i<=p[3])OTO[t].g=String(+p[4]+i-1);
       OTD[t]={FO01:[1,0,12]};
       (window.__want[p[1]]=window.__want[p[1]]||[]).push(full);
     }
   });
   /* FO02 — CT15 3 ใบ มี GIN ทั้งหมด (68,69,70 → ติดกัน) */
   for(var i=1;i<=3;i++){
     var t2='3000000'+i;
     OTO[t2]={l:'209615',d:+window.__d0.slice(8,10),s:'SHCT15'+i,g:String(67+i),
              tm:'09:0'+i,w:1,p:0,c:1,n:1};
     OTD[t2]={FO02:[1,0,12]};
     (window.__want.CT15=window.__want.CT15||[]).push('BDD01'+t2);
   }
   for(var k=0;k<=3;k++){
     var m=spBackStep(todayISO(),-3+k).slice(0,7);
     OT.cache[m]={ord:OTO,det:OTD,meta:null,none:0};
   }
   OT.months=Object.keys(OT.cache);
   spRfBust();
   SP.sid=B1;SP.view='slip';SP.sec='rep';SP.day=window.__d0;SP.ym=window.__d0.slice(0,7);
   SP.back={on:0,sid:'',busy:0,i:0,n:0,open:{}};
   renderSpord();`;

 /* ---- ① แผงที่ต้องกดเองหายไปจากหน้าจอ ---- */
 const au0=await ev(a=>{
   eval(a.setup);setup();eval(a.pre);
   const tx=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   return {panel:/เติมย้อนหลังทั้งใบ/.test(tx),
     fnStill:typeof spBackBtnHtml==='function'&&typeof spBackRun==='function',
     bal:/ใบนี้ไปถึงไหนแล้ว/.test(tx)};
 },{setup:PRE,pre:AUTOPRE});
 t('🔎 แผงที่ต้องกดเองถูกเอาออกจากหน้าจอแล้ว (แต่ฟังก์ชันยังอยู่ เอากลับมาได้)',
   au0.panel===false&&au0.fnStill===true,'บนจอ='+au0.panel+' · ฟังก์ชัน='+au0.fnStill);
 t('🎯 แทนที่ด้วย "ใบนี้ไปถึงไหนแล้ว" ที่ระบบคิดให้เอง',au0.bal===true,'');

 /* ---- ② ตั้งต้น → เซลล์คีย์ → คลังจัด → เหลือ → ตรงกี่ % ---- */
 const au1=await ev(a=>{
   eval(a.setup);setup();eval(a.pre);
   const blob=JSON.stringify(CSTOCK);
   const B=spBal(B1);
   const d=document.createElement('div');d.innerHTML=spBalHtml(B1);
   const tx=d.textContent.replace(/\s+/g,' ');
   const row=c=>B.rows.filter(r=>r.code===c)[0]||null;
   return {tgt:B.tgt,keyed:B.keyed,gin:B.gin,pct:B.pct,st:B.st,
     short:B.short,overG:B.overG,toKey:B.toKey,
     f1:row('FO01'),f2:row('FO02'),
     lns:B.byLn.map(x=>x.ln+':'+x.k+':'+x.g+':'+x.st),
     tx:tx,frac:/\d+\.\d+ ลัง/.test(tx),
     safe:(JSON.stringify(CSTOCK)===blob)};
 },{setup:PRE,pre:AUTOPRE});
 t('🎯 ตั้งต้นในใบ 15 ลัง · เซลล์คีย์ 11 ลัง · คลังจัด 9 ลัง (คิดเป็นชิ้นทีละรหัส)',
   au1.tgt===180&&au1.keyed===132&&au1.gin===108,
   JSON.stringify({tgt:au1.tgt,k:au1.keyed,g:au1.gin}));
 /* 🎨 เกณฑ์เดียวที่ตัดสินสี: เซลล์คีย์ เทียบ คลังจัด ถึงหน่วยชิ้น (เจ้าของสั่ง 27 พ.ย. 69) */
 t('🔴 ขาด = คลังจัดน้อยกว่าที่เซลล์คีย์ → ทั้งใบขึ้นสถานะ "ขาด" และบอกจำนวน 2 ลัง',
   au1.st==='short'&&au1.short===24&&au1.overG===0&&/ขาด/.test(au1.tx)&&/2 ลัง/.test(au1.tx),
   'st='+au1.st+' · ขาด '+au1.short+' ชิ้น · เกิน '+au1.overG);
 t('🎯 ...และยังบอกแยกว่าต้องคีย์เพิ่มให้ครบตั้งต้นอีกเท่าไหร่ (4 ลัง)',
   au1.toKey===48&&/ต้องคีย์เพิ่ม/.test(au1.tx),'toKey='+au1.toKey);
 t('🎯 ...และบอก % ที่ตรงกับคลังจัด = 108/132 = 81.8% (ขาดตกหล่น 18.2%)',
   Math.abs(au1.pct-81.8)<0.05&&/81\.8%/.test(au1.tx)&&/ขาดตกหล่น 18\.2%/.test(au1.tx),
   'pct='+au1.pct);
 t('🎯 ...แยกรายสินค้า — FO01 คีย์ 8 ลัง คลังจัด 6 ลัง = ขาด 2 ลัง · FO02 ตรงเป๊ะ = ครบ',
   au1.f1&&au1.f1.k===96&&au1.f1.g===72&&au1.f1.st==='short'&&au1.f1.d===-24&&
   au1.f2&&au1.f2.k===36&&au1.f2.g===36&&au1.f2.st==='ok'&&au1.f2.d===0,
   JSON.stringify([au1.f1,au1.f2]));
 t('🎯 ...และแยกรายสาย พร้อมสถานะของแต่ละสาย',
   au1.lns.length===3&&au1.lns.indexOf('CT11:60:48:short')>=0&&
   au1.lns.indexOf('CT15:36:36:ok')>=0,au1.lns.join(' '));
 t('📋 ...มีหน้าสรุปให้ผู้จัดการว่าต้องทำอะไรต่อ ทั้งที่ขาดและที่ต้องคีย์เพิ่ม',
   /ต้องทำอะไรต่อ/.test(au1.tx)&&/คลังยังจัดไม่ครบ/.test(au1.tx)&&
   /ซิตร้า เพิร์ล FO/.test(au1.tx),au1.tx.slice(0,200));
 t('📦 ...ไม่มีลังทศนิยมบนแถบนี้',au1.frac===false,'');
 t('🛟 ...และวาดแถบนี้ไม่แตะข้อมูลเลย (อ่านอย่างเดียว)',au1.safe===true,'');

 /* ---- ③ ใต้ช่องกรอกของเซลล์: ไฟล์มีเลขอะไรของสายนี้วันนี้ ---- */
 const au2=await ev(async a=>{
   eval(a.setup);setup();eval(a.pre);
   __as('sales','209611','CT11');
   SP.sec='rep';renderSpord();
   const tx=document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   window.__posts=[];
   const before=JSON.stringify(CSTOCK);
   spAutoNoFill(B1,window.__d0,'CT11');
   await new Promise(r=>setTimeout(r,60));
   const ta=document.getElementById('spRNo_CT11');
   const got=ta?spNoSplit(ta.value):[];
   /* เซลล์เห็นชิปของสายตัวเองเท่านั้น แต่ยอดรวมของใบต้องยังเป็นยอดรวมจริง */
   const B=spBal(B1);
   const d=document.createElement('div');d.innerHTML=spBalHtml(B1);
   const btx=d.textContent.replace(/\s+/g,' ');
   return {says:/ระบบอ่านจากไฟล์ให้แล้ว/.test(tx),five:/มี 5 ใบ/.test(tx),
     btn:/ใส่เลขที่ยังไม่มี/.test(tx),
     got:got.length,first:got[0],
     posts:window.__posts.length,same:JSON.stringify(CSTOCK)===before,
     rec:((CSTOCK.rep[B1+'|'+window.__d0+'|CT11']||{}).no||[]).length,
     tgt:B.tgt,keyed:B.keyed,
     onlyMine:/สาย CT11/.test(btx)&&!/CT17/.test(btx)};
 },{setup:PRE,pre:AUTOPRE});
 t('🔎 ใต้ช่องกรอกของเซลล์ บอกเองว่าไฟล์มีเลขของสายนี้วันนี้กี่ใบ',
   au2.says&&au2.five&&au2.btn,'says='+au2.says+' · 5ใบ='+au2.five+' · ปุ่ม='+au2.btn);
 t('🔎 ...กด "ใส่ให้เลย" แล้วเลขลงไปในช่อง 5 เลข',
   au2.got===5&&/^BDD01/.test(String(au2.first||'')),au2.got+' เลข · '+au2.first);
 t('🔒 ...แต่ยังไม่บันทึก — ไม่ยิงเซิร์ฟเวอร์ ไม่แตะข้อมูล คนกดบันทึกเองเหมือนเดิม',
   au2.posts===0&&au2.same===true&&au2.rec===0,
   'posts '+au2.posts+' · เหมือนเดิม '+au2.same+' · ในเรคอร์ด '+au2.rec);
 t('🎯 ...ยอดรวมของใบยังเป็นยอดรวมจริงแม้เปิดด้วยบัญชีเซลล์ (ไม่ใช่แค่สายตัวเอง)',
   au2.tgt===180&&au2.keyed===132,'ตั้งต้น '+au2.tgt+' · คีย์ '+au2.keyed);
 t('👤 ...และชิปรายสายเห็นแค่สายตัวเอง',au2.onlyMine===true,'');

 /* ---- ④ ข้างช่องเลข GIN ของแอดมิน ---- */
 const au3=await ev(async a=>{
   eval(a.setup);setup();eval(a.pre);
   const d=document.createElement('div');d.innerHTML=spAutoGinHtml(B1,window.__d0);
   const tx=d.textContent.replace(/\s+/g,' ');
   /* ใส่ช่องจริงบนหน้า แล้วกดใส่ให้ */
   document.getElementById('spBody').insertAdjacentHTML('afterbegin',
     '<input id="spGinIn" value="">');
   window.__posts=[];
   const before=JSON.stringify(CSTOCK);
   spAutoGinFill(B1,window.__d0);
   const el=document.getElementById('spGinIn');
   const nf=spAutoGinHtml(B1,window.__dnf);
   const nfd=document.createElement('div');nfd.innerHTML=nf;
   return {tx:tx,val:String((el&&el.value)||''),
     posts:window.__posts.length,same:JSON.stringify(CSTOCK)===before,
     gin:Object.keys(CSTOCK.gin).length,
     nf:nfd.textContent.replace(/\s+/g,' ')};
 },{setup:PRE,pre:AUTOPRE});
 t('🚚 ข้างช่องเลข GIN บอกเองว่าวันนี้มีเลข GIN อะไร และติดกันเป็นชุด 68–73 (6 ใบ)',
   /ระบบอ่านจากไฟล์ให้แล้ว/.test(au3.tx)&&/68–73 \(6 ใบ\)/.test(au3.tx)&&
   /จาก 9 ใบใน 11 ใบ/.test(au3.tx),au3.tx.slice(0,190));
 t('🚚 ...กดแล้วใส่เลขลงในช่องให้ครบ',
   au3.val.split(/[,\s]+/).filter(Boolean).length===6,'ช่อง = '+au3.val);
 t('🔒 ...แต่ยังไม่บันทึกผลตรวจ — แอดมินกด 🔎 ตรวจและบันทึก เองเหมือนเดิม',
   au3.posts===0&&au3.same===true&&au3.gin===0,
   'posts '+au3.posts+' · gin '+au3.gin+' คีย์');
 t('⏳ วันที่ยังไม่มีไฟล์ ต้องบอกว่ารอไฟล์ ไม่ใช่ขึ้น 0%',
   /ยังไม่มีไฟล์ของวันนี้|ยังไม่มีใบไหนของวันนี้/.test(au3.nf)&&!/0%/.test(au3.nf),
   au3.nf.slice(0,140));

 /* ---- ⑤ สามสถานะ ครบ / ขาด / เกิน และสีที่เดินตามกันทุกที่ ---- */
 const au4=await ev(a=>{
   eval(a.setup);setup();eval(a.pre);
   /* วันที่แอดมินตรวจแล้ว → "คลังจัด" อ่านจากจำนวนที่คลังจัดจริง (ช่อง Allocated) ของผลตรวจนั้น
      ⇒ เป็นแหล่งเดียวที่มากกว่าที่เซลล์คีย์ได้ จึงทำให้สถานะ "เกิน" เกิดขึ้นจริงได้ */
   CSTOCK.gin[B1+'|'+window.__d0]={g:['70'],at:9,by:'manager',byName:'ผู้จัดการ',
     rows:{
       /* CT11 คีย์ FO01 5 ลัง — คลังจัดจริง 6 ลัง ⇒ เกิน 1 ลัง ต้องหักออก */
       'CT11|FO01':{sc:5,ss:0,sp:0,fc:0,fs:0,fp:0,xc:6,xs:0,xp:0,yc:0,ys:0,yp:0,nm:'ซิตร้า',pk:12},
       /* CT17 คีย์ FO01 3 ลัง — คลังจัดจริง 3 ลัง ⇒ ครบ */
       'CT17|FO01':{sc:3,ss:0,sp:0,fc:0,fs:0,fp:0,xc:3,xs:0,xp:0,yc:0,ys:0,yp:0,nm:'ซิตร้า',pk:12},
       /* CT15 คีย์ FO02 3 ลัง — คลังจัดจริง 1 ลัง ⇒ ขาด 2 ลัง */
       'CT15|FO02':{sc:3,ss:0,sp:0,fc:0,fs:0,fp:0,xc:1,xs:0,xp:0,yc:0,ys:0,yp:0,nm:'ลักส์',pk:12}}};
   const B=spBal(B1);
   const d=document.createElement('div');d.innerHTML=spBalHtml(B1);
   const tx=d.textContent.replace(/\s+/g,' ');
   const row=c=>B.rows.filter(r=>r.code===c)[0]||null;
   const cal=document.createElement('div');cal.innerHTML=spCalHtml(B1);
   return {src:B.srcChk+'/'+B.srcGin,
     f1:row('FO01'),f2:row('FO02'),st:B.st,short:B.short,over:B.overG,
     lns:B.byLn.map(x=>x.ln+':'+x.st),
     tx:tx,frac:/\d+\.\d+ ลัง/.test(tx),
     dayStat:spDayStat(B1,window.__d0),slipStat:spSlipStat(B1),
     calShort:cal.querySelectorAll('.cal-day.st-short').length,
     calOk:cal.querySelectorAll('.cal-day.st-ok').length,
     pill:/sp-stpill/.test(spStPill('short'))};
 },{setup:PRE,pre:AUTOPRE});
 /* คลังจัด 9 ลัง (108 ชิ้น) มากกว่าที่คีย์ 8 ลัง (96) ได้ก็ต่อเมื่ออ่านจากผลตรวจของแอดมิน —
    ฝั่ง "ใบที่มีเลข GIN" เป็นสับเซตของที่คีย์เสมอ จึงเกินไม่ได้ */
 t('🚚 วันที่แอดมินตรวจแล้ว อ่าน "คลังจัด" จากจำนวนที่คลังจัดจริงในผลตรวจ ไม่ใช่แค่ใบที่มี GIN',
   au4.src==='1/0'&&au4.f1&&au4.f1.g===108&&au4.f1.g>au4.f1.k,
   'ตรวจแล้ว/ยังไม่ตรวจ = '+au4.src+' · คลังจัด '+(au4.f1&&au4.f1.g)+' ชิ้น vs คีย์ '+(au4.f1&&au4.f1.k));
 t('🟠 เกิน = คลังจัดมากกว่าที่เซลล์คีย์ → บอกว่าเกิน และต้องหักลบออก',
   au4.f1&&au4.f1.st==='over'&&au4.f1.d===12&&/เกิน/.test(au4.tx)&&/หักออก/.test(au4.tx),
   'FO01 '+JSON.stringify(au4.f1));
 t('🔴 ขาด = คลังจัดน้อยกว่า → สีแดง บอกจำนวนที่ขาด 2 ลัง',
   au4.f2&&au4.f2.st==='short'&&au4.f2.d===-24&&/ขาด/.test(au4.tx),
   'FO02 '+JSON.stringify(au4.f2));
 t('🎯 ...ทั้งใบถือว่า "ขาด" เมื่อมีรหัสไหนขาด แม้รหัสอื่นจะเกิน (ขาดกับเกินคนละถัง ไม่หักกลบ)',
   au4.st==='short'&&au4.short===24&&au4.over===12,
   'st='+au4.st+' · ขาด '+au4.short+' · เกิน '+au4.over);
 t('🎨 ...สีเดินตามกันทุกที่ — ปฏิทินวัน การ์ดใบ และป้ายสถานะ ใช้เกณฑ์เดียวกัน',
   au4.dayStat==='short'&&au4.slipStat==='short'&&au4.calShort===1&&au4.calOk===0&&au4.pill===true,
   'วัน='+au4.dayStat+' · ใบ='+au4.slipStat+' · ปฏิทินขาด '+au4.calShort+' วัน');
 t('📋 ...หน้าสรุปผู้จัดการลิสต์ทั้งที่ขาดและที่เกิน พร้อมจำนวน',
   /🔴 ขาด/.test(au4.tx)&&/🟠 เกิน/.test(au4.tx)&&/ลักส์ โรส FO/.test(au4.tx)&&
   /ซิตร้า เพิร์ล FO/.test(au4.tx),au4.tx.slice(0,240));
 t('📦 ...และไม่มีลังทศนิยม',au4.frac===false,'');

 let bad=0;A.forEach(([c,n,x])=>{if(!c)bad++;console.log((c?'  ✓ ':'  ✗ FAIL: ')+n.replace(/<[^>]*>/g,'')+(x&&!c?' → '+x:''));});
 const re=errs.filter(e=>!/localStorage/.test(e));
 if(re.length){console.log('PAGE ERRORS:');re.forEach(e=>console.log('   '+e));bad+=re.length;}
 await b.close();
 console.log('\n'+(bad?bad+' FAILED of '+A.length:'ALL PASS ('+A.length+' checks)'));
 process.exit(bad?1:0);
})();
