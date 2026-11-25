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
 const pg=await (await b.newContext({viewport:{width:1280,height:950}})).newPage();
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
   /* ซุปตั้งเป้าให้ CT11 */
   __as('sup',null,'หัวหน้าเซลล์');_switchTab('spord');
   SP.sid='B20261118-01';SP.view='slip';SP.sec='key';SP.day='2026-11-20';renderSpord();
   CSTOCK.key['B20261118-01|2026-11-20|CT11']={it:{'64849613':{sc:10,sp:0,fc:1,fp:0}},
     by:'sup',byName:'หัวหน้าเซลล์',at:1000};
   renderSpord();
   const o={};
   const tx=()=>document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   SP.sec='rep';renderSpord();
   o.supNoInput=!document.getElementById('spR_CT11_64849613_sc');   /* ซุปกรอกของเซลล์ไม่ได้ */
   o.supSeesTrack=/ติดตามการคีย์รายสาย/.test(tx())&&/รอเซลล์คีย์/.test(tx());
   SP.sec='key';renderSpord();
   o.supExport=typeof spTgtXlsx==='function'&&spTgtRows('B20261118-01','2026-11-20').body.length>0;

   /* เซลล์ CT11 เข้ามากรอกของตัวเอง */
   __as('sales','209611','CT11 · เซลล์');_switchTab('spord');
   SP.sid='B20261118-01';SP.view='slip';SP.sec='rep';SP.day='2026-11-20';renderSpord();
   o.myLine=spMyLine();
   o.hasMine=!!document.getElementById('spR_CT11_64849613_sc');
   o.notOther=!document.getElementById('spR_CT12_64849613_sc');
   document.getElementById('spR_CT11_64849613_sc').value='8';
   document.getElementById('spR_CT11_64849613_fc').value='1';
   await spRepSave('B20261118-01','2026-11-20','CT11',{'64849613':{sc:8,sp:0,fc:1,fp:0}});
   o.post1=window.__posts[window.__posts.length-1];
   let r=CSTOCK.rep['B20261118-01|2026-11-20|CT11'];
   o.n1=r&&r.n; o.h1=r&&r.h.length;
   o.left1=spRepLeft(r);
   /* แก้ครั้งที่ 1 (ครั้งสุดท้ายที่ทำได้) */
   await spRepSave('B20261118-01','2026-11-20','CT11',{'64849613':{sc:11,sp:0,fc:1,fp:0}});
   r=CSTOCK.rep['B20261118-01|2026-11-20|CT11'];
   o.n2=r&&r.n; o.h2=r&&r.h.length; o.left2=spRepLeft(r); o.cur=r&&r.it['64849613'].sc;
   /* ครั้งที่ 3 ต้องถูกปฏิเสธ */
   const before=window.__posts.length;
   o.third=await spRepSave('B20261118-01','2026-11-20','CT11',{'64849613':{sc:99,sp:0,fc:0,fp:0}});
   o.noExtraPost=window.__posts.length===before;
   o.stillCur=CSTOCK.rep['B20261118-01|2026-11-20|CT11'].it['64849613'].sc;
   /* ประวัติ */
   renderSpord();
   spHistOpen('B20261118-01','2026-11-20','CT11');
   o.hist=document.getElementById('spHistBody').textContent.replace(/\s+/g,' ');
   o.histShown=!document.getElementById('spHistBox').classList.contains('hidden');

   /* ซุปกลับมาดู: เห็นของเซลล์ แต่แก้ไม่ได้ */
   __as('sup',null,'หัวหน้าเซลล์');SP.sec='rep';renderSpord();
   const b2=window.__posts.length;
   o.supBlocked=await spRepSave('B20261118-01','2026-11-20','CT11',{'64849613':{sc:1,sp:0,fc:0,fp:0}});
   o.supNoPost=window.__posts.length===b2;
   o.trk=spTrack('B20261118-01','2026-11-20').filter(x=>x.ln==='CT11')[0];
   o.supTxt=tx();
   return o;});
 t('🔑 เซลล์กรอก "จำนวนที่คีย์จริง" ของสายตัวเองได้',
   rep.myLine==='CT11'&&rep.hasMine&&rep.post1&&rep.post1.u==='/api/spord'&&rep.post1.b.act==='rep',
   JSON.stringify({line:rep.myLine,act:rep.post1&&rep.post1.b.act}));
 t('🔒 ...และเห็นช่องกรอกเฉพาะสายตัวเอง ไม่ใช่ของสายอื่น',rep.hasMine&&rep.notOther);
 t('🔑 แก้ได้อีกครั้งเดียว แล้วตัวเลขใหม่ชนะ',
   rep.left1===1&&rep.n2===2&&rep.left2===0&&rep.cur===11,
   JSON.stringify({left1:rep.left1,n2:rep.n2,left2:rep.left2,cur:rep.cur}));
 t('🛟 ครั้งที่สามต้องถูกปฏิเสธ ไม่ยิงขึ้นเซิร์ฟเวอร์ และตัวเลขเดิมไม่เปลี่ยน',
   rep.third===false&&rep.noExtraPost&&rep.stillCur===11,
   JSON.stringify({third:rep.third,cur:rep.stillCur}));
 t('🔑 กดดูประวัติได้ว่ากรอกเมื่อไหร่ แก้เมื่อไหร่ (ทุกครั้งเก็บไว้ ไม่ทับของเดิม)',
   rep.h1===1&&rep.h2===2&&rep.histShown&&/ครั้งล่าสุด/.test(rep.hist),
   JSON.stringify({h1:rep.h1,h2:rep.h2}));
 t('🔒 หัวหน้าเซลล์แก้จำนวนของเซลล์ไม่ได้เลย ดูได้อย่างเดียว',
   rep.supNoInput&&rep.supBlocked===false&&rep.supNoPost);
 t('🔑 ซุปเห็นตารางติดตามว่าสายไหนคีย์ครบเป้าแล้ว',
   rep.supSeesTrack&&rep.trk&&rep.trk.tgt.cs===11&&rep.trk.rep.cs===12&&rep.trk.st==='over',
   JSON.stringify(rep.trk&&{tgt:rep.trk.tgt.cs,rep:rep.trk.rep.cs,st:rep.trk.st}));
 t('🔑 ซุปดึงเป้าออกเป็นไฟล์ส่งให้เซลล์ได้',rep.supExport);


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
   o.chipsMgr=[...document.querySelectorAll('#spBody .pos-st')].map(x=>x.textContent.trim());
   /* ปุ่มย้อนกลับต้องถอยในหมวดนี้ ไม่ใช่กระโดดออกไปแท็บอื่น */
   o.backShown=document.getElementById('backBtn').style.display!=='none';
   spSetSec('out');o.outTxt=tx();
   navBack();o.afterBack1={tab:CURTAB,view:SP.view,sec:SP.sec};
   navBack();o.afterBack2={tab:CURTAB,view:SP.view};
   navBack();o.afterBack3={tab:CURTAB,view:SP.view,ym:SP.ym};
   /* รายงาน: ผู้จัดการเห็น */
   spOpenMon('2026-11');spOpenSlip('B20261118-01');SP.sec='rpt';renderSpord();
   o.rptMgr=tx();
   /* หัวหน้าเซลล์ไม่เห็นแท็บรายงาน และเปิดตรง ๆ ก็ไม่ได้ */
   __as('sup',null,'หัวหน้าเซลล์');SP.view='slip';SP.sid='B20261118-01';SP.sec='rpt';renderSpord();
   o.chipsSup=[...document.querySelectorAll('#spBody .pos-st')].map(x=>x.textContent.trim());
   o.rptSup=tx();
   return o;});
 t('🔑 ในใบมีแท็บ 4 ขั้นตอน + รายงาน (ผู้จัดการ) + ของเดิม',
   tabs.chipsMgr.length===6&&/รายงาน/.test(tabs.chipsMgr[4]),tabs.chipsMgr.join(' | '));
 t('🔑 ④ คลังส่งออก โชว์ของที่ตัดบิลไว้ของใบนี้ (ระบบเดิมของสต็อคกลาง)',
   /คลังส่งออก/.test(tabs.outTxt)&&/ตัดบิลไว้/.test(tabs.outTxt)&&/ยังค้าง/.test(tabs.outTxt),
   tabs.outTxt.slice(0,90));
 t('🔑 ปุ่มย้อนกลับถอยทีละหน้าในหมวดนี้ ไม่กระโดดออกไปแท็บอื่น',
   tabs.backShown&&tabs.afterBack1.tab==='spord'&&tabs.afterBack1.sec==='key'&&
   tabs.afterBack2.tab==='spord'&&tabs.afterBack2.view==='mon'&&
   tabs.afterBack3.tab==='spord',
   JSON.stringify([tabs.afterBack1,tabs.afterBack2,tabs.afterBack3]));
 t('🔒 รายงานเปิดได้เฉพาะผู้จัดการ',
   /รายงานใบนี้/.test(tabs.rptMgr)&&tabs.chipsSup.length===5&&
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

 /* ---------- 1) ใครเห็นอะไร ---------- */
 const who=await ev(()=>{
   const o={};
   [['manager',null],['sales','209611'],['wh',null],['ds',null],['sup',null]].forEach(([r,c])=>{
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
 /* 25 พ.ย. 69: แถวละเดือน ไล่ ม.ค.→ธ.ค. และบอกความคืบหน้าเป็น "วันที่คีย์แล้ว / ตรวจแล้ว" */
 t('...แถวเดือนบอกจำนวนใบ และความคืบหน้าสองฝั่งของเดือนนั้น',
   /1\s*ใบออเดอร์/.test(nav.mon.replace(/\s/g,' '))&&
   /เซลล์คีย์/.test(nav.mon)&&/แอดมินตรวจ/.test(nav.mon),nav.mon.slice(0,150));
 t('...ช่องเลือกใบซ่อนไว้ตอนอยู่หน้าเลือกเดือน (ไม่รกตา)',nav.slipBox==='none',nav.slipBox);
 t('กดเดือน → เห็นรายการใบของเดือนนั้น พร้อมปุ่มกลับไปเลือกเดือนอื่น',
   /พ\.ย\. 2569/.test(nav.listBar)&&/B20261118-01/.test(nav.list)&&
   /เลือกเดือนอื่น/.test(nav.list)&&!/B20261002-01/.test(nav.list),nav.list.slice(0,140));
 t('กดใบ → เข้าหน้าใบ พร้อมปุ่มกลับ และช่องเลือกใบโผล่',
   /ซุปจด/.test(nav.slip)&&/กลับไปรายการใบ/.test(nav.slip)&&nav.slipBox2==='',
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
   o.has=/ตัดบิลแล้ว ยังไม่ส่งของ/.test(txt())&&/ส่งของแล้ว ยังไม่ตัดบิล/.test(txt());
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
 t('🔑 ฟอร์มสร้างออเดอร์ให้เลือกหมวดได้ทั้งสองแบบ ตั้งแต่ยังไม่บันทึก',gq.has);
 t('...ใบใหม่เริ่มที่ "ตัดบิลแล้ว ยังไม่ส่งของ" และปุ่มที่เลือกอยู่เข้มให้เห็นชัด',
   gq.defA==='A'&&gq.onA,gq.defA+' · ปุ่มเข้ม='+gq.onA);
 t('...กดเลือก "ส่งของแล้ว ยังไม่ตัดบิล" แล้วปุ่มและคำอธิบายเปลี่ยนตาม',
   gq.nowB==='B'&&gq.onB&&gq.hint,gq.nowB+' · ปุ่มเข้ม='+gq.onB+' · คำอธิบาย='+gq.hint);
 t('🔑 บันทึกแล้วหมวดติดไปกับใบจริง และขึ้นบนหัวใบให้ทุกทีมเห็น',
   gq.saved==='B'&&/🚚/.test(gq.bar)&&/ส่งของแล้ว ยังไม่ตัดบิล/.test(gq.bar),
   gq.sid+' → g='+gq.saved);
 t('🛟 กลับมาแก้ใบกลุ่ม B แล้วเซฟใหม่ ต้องไม่เด้งกลับเป็นกลุ่ม A',
   gq.reload==='B'&&gq.again==='B','อ่านกลับ='+gq.reload+' · เซฟซ้ำ='+gq.again);
 t('🛟 ใบเก่าที่ไม่มีช่องหมวด ยังอ่านเป็น "ตัดบิลแล้ว ยังไม่ส่งของ" เหมือนเดิม',
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
     news:document.querySelectorAll('#spBody button.upload-btn').length,
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
 t('...หัวใบบอกจำนวนสินค้า ยอดลัง และผู้รับผิดชอบ',
   /3 สินค้า/.test(card.tx)&&/150 ลัง/.test(card.tx)&&/Supervisor/.test(card.tx),
   card.tx.slice(0,120));
 t('🛟 ปุ่ม "สร้างออเดอร์ใหม่" มีปุ่มเดียว ไม่ซ้ำสองที่',card.news===1,card.news+' ปุ่ม');
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
     SP.sid='B20261118-01';SP.view='slip';SP.ym='2026-11';SP.day='2026-11-20';SP.sec='key';
   };
   /* ไฟล์ allocation จำลอง — โครงเดียวกับไฟล์จริง (หัวตารางตรงตัว)
      old=1 → ไฟล์รุ่นเก่า 29 ช่อง ไม่มี GSV/NIV (ต้องยังอ่านได้ และถอยไปประเมินจากไฟล์ราคา) */
   window.__alBuf=(old)=>{
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
     const A=[H,
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
   o.chips=[...document.querySelectorAll('#spBody .pos-st')].map(x=>x.textContent.trim());
   o.showsName=/โอโมน้ำ ซากุระ/.test(tx())&&/รหัส 64849613/.test(tx());
   o.hasInputs=!!document.getElementById('spK_CT11_64849613_sc');
   /* sup กรอกแล้วบันทึก */
   document.getElementById('spK_CT11_64849613_sc').value='5';
   document.getElementById('spK_CT11_64849613_fc').value='1';
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
   two.chips.length===5&&/ซุปจด/.test(two.chips[0])&&/เซลล์คีย์/.test(two.chips[1])&&
   /แอดมินตรวจ/.test(two.chips[2])&&/คลังส่งออก/.test(two.chips[3])&&
   /เลขออเดอร์/.test(two.chips[4]),two.chips.join(' | '));
 t('🔑 ใบออเดอร์โชว์ชื่อสินค้า ไม่ใช่รหัสเปล่า ๆ (เจ้าของบอกว่า "ขึ้นแค่รหัสมันตามดูยาก")',
   two.showsName);
 t('🔑 หัวหน้าเซลล์กรอก ขาย/แถม เป็น ลัง+ชิ้น ได้ทุกสาย',two.hasInputs);
 t('...กดบันทึกแล้วส่งผ่าน api/spord (ไม่ใช่ save ทั้งก้อน)',
   two.post&&two.post.u==='/api/spord'&&two.post.b.act==='key'&&
   two.post.b.ln==='CT11'&&two.post.b.d==='2026-11-20',JSON.stringify(two.post&&two.post.b));
 t('...เก็บแยกของขายกับของแถมไว้ให้ตรวจได้',
   two.rec&&two.rec.it['64849613'].sc===5&&two.rec.it['64849613'].fc===1&&
   two.rec.it['65456729'].sc===3,JSON.stringify(two.rec&&two.rec.it));
 t('🔑 ...แต่ยอดรวมขึ้นใบใหญ่ รวมขาย+แถมเข้าด้วยกันตามที่เจ้าของสั่ง',
   /รวมส่งขึ้นใบใหญ่/.test(two.cards)&&two.sum['64849613'].sc===5&&two.sum['64849613'].fc===1);
 t('🔒 เซลล์เห็นหน้า "สายของฉัน" แก้เป้าของหัวหน้าเซลล์ไม่ได้ และไม่เห็นสายอื่น',
   two.salesRead&&two.salesSees&&two.salesNoOther,
   JSON.stringify({mine:two.salesRead,sees:two.salesSees,noOther:two.salesNoOther}));

 const adm=await ev(async()=>{
   const o={};
   const tx=()=>document.getElementById('spBody').textContent.replace(/\s+/g,' ');
   __as('manager',null,'แอดมิน 1');SP.sec='adm';renderSpord();
   o.noFile=/ยังไม่ได้อัพไฟล์ในเครื่องนี้/.test(tx());
   parseAlloc('alloc.xlsx',__alBuf());
   o.n=ALLOC.n;o.gins=ALLOC.gins.slice();
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
   return o;});
 t('🔑 อ่านไฟล์ allocation ของคลังได้ (หาคอลัมน์จากหัวตาราง ไม่ใช่ตำแหน่ง)',
   adm.n===4&&adm.gins.join(',')==='77,78',adm.n+' แถว · GIN '+adm.gins.join(','));
 t('...ยังไม่อัพไฟล์ ก็บอกตรง ๆ ไม่ใช่หน้าว่าง',adm.noFile);
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
 t('🛟 หน้าบอกชัดว่าสองยอดนี้คนละคำถาม (ยอดในใบ · ยอดทั้งออเดอร์)',
   /ยอดสินค้าในใบนี้/.test(val.txt)&&/ยอดทั้งออเดอร์/.test(val.txt)&&
   /รวมสินค้าตัวอื่นด้วย/.test(val.txt));

 /* ---------- 💵 เงินในไฟล์ใบจัดของ (ช่อง GSV / NIV ท้ายไฟล์) ----------
    เจ้าของทักเมื่อ 26 พ.ย. 69: *"ทำไมไฟล์ allocate จะไม่มีอยู่สองช่องสุดท้ายด้านหลังนี้ไง"*
    ไฟล์จริงรุ่นใหม่มี 36 ช่อง · AI = GSV · AJ = NIV และตรงกับไฟล์ยอดขาย 1,401/1,401 ใบ */
 t('🔑 อ่าน GSV/NIV จากไฟล์ใบจัดของเอง ไม่ใช่ประเมินจากไฟล์ราคา',
   val.sum.src==='file'&&Math.round(val.sum.sGsv)===2900&&Math.round(val.sum.sNiv)===2150,
   JSON.stringify({src:val.sum.src,gsv:val.sum.sGsv,niv:val.sum.sNiv}));
 t('🔑 ...ตัวเลขรายสินค้าก็มาจากไฟล์ (ไม่ใช่ WS LP x จำนวน)',
   val.row.gsv===800&&val.row.niv===610&&val.row.est===0,
   JSON.stringify({gsv:val.row.gsv,niv:val.row.niv,est:val.row.est}));
 t('🛟 ...ไฟล์มีช่องเงิน จึงไม่ขึ้นคำเตือนว่าเป็นค่าประเมิน',
   !/ไม่มีช่อง GSV \/ NIV/.test(val.txt)&&/จากไฟล์/.test(val.txt),
   val.txt.slice(0,80));
 t('🛟 มูลค่าของแถมยังติดป้าย "ประเมิน" ไว้ (ไฟล์ลงเงินของแถมเป็น 0)',
   /มูลค่าแถม\(ประเมิน\)/.test(val.txt));

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
 t('🔑 ดึงผลตรวจออกเป็นเอกสารได้ (ตารางมีครบทุกแถว)',doc.rows>0&&doc.cols===19,
   doc.rows+' แถว · '+doc.cols+' คอลัมน์');
 t('🔑 ...และสั่งพิมพ์ PDF ได้ โดยมีหัวเรื่องกับเลข GIN ในเอกสาร',
   doc.printed&&/ผลตรวจใบจัดของ/.test(doc.pr)&&/GIN/.test(doc.pr),doc.pr.slice(0,90));
 t('🛟 ชื่อไฟล์ต้องเป็น ASCII ล้วน (Chromium ตัดชื่อไฟล์ไทยทิ้งทั้งนามสกุล)',
   /^[\x20-\x7E]+\.xlsx$/.test(doc.name),doc.name);
 t('...ใบสรุปบอกที่มาของตัวเลขและจำนวนเลขออเดอร์ที่ดึงได้',
   doc.meta.indexOf('ยอดทั้งออเดอร์ NIV')>=0&&doc.meta.indexOf('รอไฟล์ยอดขาย')>=0&&
   doc.meta.indexOf('แหล่งที่มาของเงิน')>=0&&doc.meta.indexOf('หมายเหตุ')>=0,
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
 t('🛟 ...และหน้าบอกว่าไฟล์นี้ไม่มีช่องเงิน จึงยังประเมินจากไฟล์ราคา (ไม่ขึ้น 0 เงียบ ๆ)',
   oldf.src==='price'&&/ไม่มีช่อง GSV \/ NIV/.test(oldf.txt)&&/ค่าประเมิน/.test(oldf.txt),
   oldf.txt.slice(0,160));
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
