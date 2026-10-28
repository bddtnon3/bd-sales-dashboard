/* 🗺 PJP — ยอดเปิดบิล "เดือนนี้เทียบเดือนที่แล้ว" บนการ์ดร้าน + ปฏิทินที่กดเข้าไปดูได้
 *
 * เจ้าของสั่ง 19 ต.ค. 69 สองข้อ:
 *  (ก) "ในข้อมูลยอดขายรายร้านใน PJP ที่ขึ้นโชว์ ให้เปลี่ยนเป็นเทียบเดือนก่อนหน้า และเดือนที่แล้ว
 *       ในปัจจุบันแทน ว่าขายได้เท่าไหร่ โดยให้จับข้อมูลของวิเคราะห์เชิงลึก ว่าเดือนนั้นๆร้าน
 *       มีเปิดบิลไปเท่าไหร่แล้ว แล้วขึ้น % เทียบว่า สูง/ต่ำกว่าเดือนที่แล้วกี่ %"
 *  (ข) "ส่วนของหน้า PJP ที่เป็นรานเดือน ให้ปรับปฏิทินที่ขึ้นโชว์ให้สามารถกดเข้าไปดูได้เหมือน
 *       ปฏิทินงาน เพื่อให้เซลล์ไม่ต้องเปลี่ยนหน้า แต่ปัดมาดูรายเดือนในหน้า PJP ได้เลย"
 *
 * จุดที่พลาดง่ายและต้องมีเทสกัน:
 *  1) ⚠️ ป้ายเตือน 🔻ยอดตก / 🛑ไม่ซื้อ ต้องยังเทียบ "เดือนเต็มกับเดือนเต็ม" (pjSales)
 *     ถ้าเอาเดือนที่ยังไม่จบไปเทียบ ทุกร้านจะขึ้น "ยอดตก" ตั้งแต่วันที่ 1-2 ของทุกเดือน
 *  2) เดือนที่ยังไม่จบย่อมน้อยกว่าเดือนเต็มเสมอ จึงต้องบอก "จังหวะ" ให้ด้วย ไม่ให้เซลล์ตกใจเปล่า ๆ
 *  3) ไฟล์วิเคราะห์เชิงลึกยังไม่ถึงเดือนปัจจุบัน = ต้องบอกตรง ๆ ห้ามเอาเดือนเก่ามาสวมเป็นเดือนนี้
 *  4) ร้านที่ไม่มีบิลเดือนนี้ ต้องขึ้น "ยังไม่เปิดบิล" ไม่ใช่ ฿0 ปน ๆ กับ "ไม่มีข้อมูล"
 *  5) ปฏิทินต้องกดได้ทุกช่อง รวมวันที่ไม่มีแผน — ของเดิม renderPjp ดีด PJ.d กลับทุกครั้ง
 *     ที่วันนั้นไม่อยู่ในแผน จึงเหมือนกดไม่ติด
 *  6) เลื่อนเดือนได้ในหน้า PJP เอง และ ◀ ▶ ในมุมมองรายวันต้องยังข้ามวันที่มีแผนเหมือนเดิม
 *  7) 🛟 ทุกอย่างในหน้านี้อ่านอย่างเดียว — ข้อมูลทุกก้อนต้องไม่ขยับแม้ไบต์เดียว
 *
 * สร้างข้อมูลเองทั้งหมด (ไม่ใช้รายชื่อร้านจริง) จึงรันได้เสมอ
 * ต้องติดตั้งก่อน:  npm i --no-save playwright-core
 * แล้วรัน:  node build.cjs && node test/browser/pjpcal.test.cjs
 */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const BROWSER=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGE=path.resolve(__dirname,'..','..','public','index.html');

const BLOBS=`JSON.stringify({DATA,STORE,KPI,ORDERS,STOCKD,REQUESTS,MASTER,ANALYTICS,STOREPROD,
  STOREDAILY,PSTORE,EB2B,POSTATUS,LEADS,DCI,MINSTOCK,PLAN,PROMO,PJP})`;

/* เดือนจริงของเครื่องที่รัน — เทสต้องไม่ผูกกับวันที่ใดวันที่หนึ่ง */
const now=new Date();
const CM=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
const mAdd=(k,n)=>{const[y,m]=k.split('-').map(Number);const d=new Date(y,m-1+n,1);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');};
const PM=mAdd(CM,-1),PM2=mAdd(CM,-2);
const DAY=now.getDate();
const DIM=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
/* วันในเดือนปัจจุบันที่ "ไม่มีแผน" แน่ ๆ — ใช้ทดสอบว่ากดช่องวันเปล่าได้ */
const d2=n=>CM+'-'+String(n).padStart(2,'0');

function setup(a){
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};window.ulog=()=>{};
  window.alert=m=>(window.__alerts=window.__alerts||[]).push(String(m));
  window.confirm=()=>true;
  window.__posts=[];
  window.fetch=(u,o)=>{window.__posts.push(String(u));
    return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({ok:true})});};
  window.syncToServer=()=>{window.__sync=(window.__sync||0)+1;};
  TOKEN=null;
  DATA={lines:{'209611':{display:'CT11'}},focus_order:['209611'],targets:{},daily:{},monthly:{}};
  KPI={};ANALYTICS={months:[a.PM2,a.PM,a.CM],data:{}};STOREDAILY={};
  PLAN={items:{},done:{},del:{}};PROMO={items:{},res:{},del:{}};REQUESTS={data:{}};
  ORDERS={dates:[],data:{},names:{},cat:{},catN:{}};POSTATUS={dates:[],data:{}};
  STOCKD={date:null,rows:[],names:{}};MASTER={items:{}};LEADS={meta:{},sales:{},del:{}};
  DCI={};MINSTOCK={};PSTORE={rounds:{}};EB2B={asof:null,up:0,lines:{},data:{}};
  /* ยอดเปิดบิลรายร้าน (ช่องที่ 3 ของแต่ละเดือน = มูลค่า)
     S1 เดือนนี้ขายได้เยอะกว่าจังหวะเดือนก่อน · S2 ตกหนัก · S3 เดือนนี้ยังไม่เปิดบิล (null) */
  STORE={months:[a.PM2,a.PM,a.CM],stores:[
    ['209611','2000001','ร้านทดสอบโต',  [[1,10,10000],[1,20,20000],[1,15,a.S1]]],
    ['209611','2000002','ร้านทดสอบตก',  [[1,10,10000],[1,20,20000],[1,5,a.S2]]],
    ['209611','2000003','ร้านยังไม่ซื้อ',[[1,10,8000], [1,20,12000],null]],
  ]};
  if(typeof buildStoreIdx==='function')buildStoreIdx();
  /* S4 อยู่แค่ในไฟล์วิเคราะห์เชิงลึก ไม่อยู่ใน STORE — ต้องอ่านผ่านทางสำรองได้ */
  STOREPROD={months:[a.PM2,a.PM,a.CM],cat:{},
    stores:{'2000004':{n:'ร้านมีแต่ในวิเคราะห์',l:'CT11'}},
    data:{CT11:{'2000004':{
      'P1':{niv:{[a.PM]:4000,[a.CM]:3000},pc:{}},
      'P2':{niv:{[a.PM]:1000,[a.CM]:500},pc:{}}}}}};
  /* แผน PJP: วันที่ 5 และ 12 ของเดือนนี้ (สายเดียว) */
  PJP={out:{},plan:{},done:{},cfg:{planMon:a.CM,planUp:1}};
  ['2000001','2000002','2000003','2000004'].forEach((c,i)=>{
    PJP.out[c]={n:'ร้านที่ '+(i+1),a:'นนทบุรี',e:0,la:13.8+i/100,lo:100.5+i/100};});
  PJP.plan[a.D5]={'209611':'2000001:1,2000002:2'};
  PJP.plan[a.D12]={'209611':'2000003:1,2000004:2'};
  S.user={id:'ct11',role:'sales',code:'209611',name:'เซลล์ CT11'};
  PJ.d=null;PJ.ym=null;PJ.view='day';PJ.only='all';PJ.open=true;PJ.sel=null;
}

(async()=>{
 const S1=Math.round(20000*DAY/DIM)+3000;          /* เร็วกว่าจังหวะเดือนก่อน */
 const S2=Math.round(20000*DAY/DIM*0.5);           /* ช้ากว่าจังหวะครึ่งหนึ่ง */
 const D5=d2(5),D12=d2(12);
 const ARG={CM,PM,PM2,D5,D12,S1,S2};
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const pg=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.setContent(fs.readFileSync(PAGE,'utf8'),{waitUntil:'domcontentloaded'});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);
 await ev(setup,ARG);

 /* ---------- 1) ตัวเลขที่คำนวณได้ ---------- */
 const n=await ev(()=>({
   a:pjSalesNow('2000001'),b:pjSalesNow('2000002'),c:pjSalesNow('2000003'),d:pjSalesNow('2000004'),
   none:pjSalesNow('9999999')}));
 t('เดือนที่โชว์เป็น "เดือนนี้" คือเดือนปัจจุบัน (ไฟล์วิเคราะห์เชิงลึกมีถึงเดือนนี้)',
   n.a.cm===CM&&n.a.pm===PM&&n.a.running&&!n.a.stale,n.a.cm+' vs '+n.a.pm);
 t('ยอดเดือนนี้ = ยอดที่ร้านเปิดบิลไปแล้วถึงวันนี้',n.a.cur===S1&&n.a.prv===20000,
   n.a.cur+' / '+n.a.prv);
 t('% เทียบเดือนที่แล้วถูกต้อง (สูง/ต่ำกว่ากี่ %)',
   Math.round(n.a.pct)===Math.round((S1-20000)/20000*100),Math.round(n.a.pct)+'%');
 t('นับวันที่ผ่านไปในเดือนถูก',n.a.day===DAY&&n.a.dim===DIM,n.a.day+'/'+n.a.dim);
 t('จังหวะเดือนก่อนถึงวันเดียวกัน = ยอดเดือนก่อน × วันที่ผ่านไป ÷ วันทั้งเดือน',
   Math.round(n.a.pace)===Math.round(20000*DAY/DIM),Math.round(n.a.pace));
 t('ร้านที่เร็วกว่าจังหวะเดือนก่อน ขึ้นเป็นบวก',n.a.pacePct>0,Math.round(n.a.pacePct)+'%');
 t('ร้านที่ช้ากว่าจังหวะเดือนก่อน ขึ้นเป็นลบ',n.b.pacePct<0,Math.round(n.b.pacePct)+'%');
 /* เดือนนั้นมีในไฟล์ + ร้านนี้มีในไฟล์รายร้าน แต่ไม่มีแถว = "ไม่ได้ซื้อจริง" (0)
    ต่างจาก "ไม่รู้" ซึ่งคือเดือนที่ไม่มีในไฟล์เลย */
 t('ร้านที่เดือนนี้ยังไม่เปิดบิล = 0 จริง (ไม่ใช่ "ไม่มีข้อมูล")',
   n.c.haveCur===true&&n.c.cur===0&&n.c.havePrv===true&&n.c.prv===12000,
   JSON.stringify({haveCur:n.c.haveCur,cur:n.c.cur,prv:n.c.prv}));
 t('ร้านที่มีแต่ในไฟล์วิเคราะห์เชิงลึก (ไม่อยู่ในไฟล์รายร้าน) ก็อ่านยอดได้',
   n.d&&n.d.cur===3500&&n.d.prv===5000,n.d?(n.d.cur+' / '+n.d.prv):'(null)');
 t('ร้านที่ไม่มีข้อมูลเลย คืนค่าว่าง ไม่พัง',n.none===null,String(n.none));

 /* ---------- 2) ข้อความบนการ์ด ---------- */
 const h=await ev(()=>({a:pjSalesHtml('2000001'),b:pjSalesHtml('2000002'),
   c:pjSalesHtml('2000003'),none:pjSalesHtml('9999999')}));
 const txt=s=>s.replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
 const MTH=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
 const cmTh=MTH[+CM.split('-')[1]-1],pmTh=MTH[+PM.split('-')[1]-1];
 t('การ์ดเขียนชื่อเดือนเป็นภาษาไทยสั้น ๆ ทั้งสองเดือน',
   txt(h.a).indexOf(cmTh)>=0&&txt(h.a).indexOf(pmTh)>=0,txt(h.a));
 t('...บอกว่าเดือนนี้นับ "ถึงวันนี้" ไม่ใช่เดือนเต็ม',/ถึงวันนี้/.test(txt(h.a)),'ok');
 t('...มีป้าย % สูง/ต่ำกว่าเดือนที่แล้ว',/pj-pct/.test(h.a)&&/[▲▼]|เท่าเดิม/.test(txt(h.a)),txt(h.a).slice(0,90));
 t('...บอกจังหวะว่าเร็วกว่า/ช้ากว่าเดือนก่อน พร้อมจำนวนวันที่ผ่านไป',
   /ผ่านไป \d+\/\d+ วัน/.test(txt(h.a))&&/เร็วกว่า/.test(txt(h.a)),txt(h.a));
 t('...ร้านยอดตกขึ้นว่า "ช้ากว่า"',/ช้ากว่า/.test(txt(h.b)),txt(h.b));
 t('...ร้านที่ยังไม่เปิดบิลเดือนนี้ เขียนว่า "ยังไม่เปิดบิล" ไม่ใช่ ฿0',
   /ยังไม่เปิดบิล/.test(txt(h.c))&&!/฿0/.test(txt(h.c)),txt(h.c));
 t('...ร้านไม่มีข้อมูลเลย ยังขึ้นข้อความเดิม',/ยังไม่มีข้อมูลยอดขายรายร้าน/.test(txt(h.none)),txt(h.none));

 /* ---------- 3) ⚠️ ป้ายเตือนยังต้องเทียบเดือนเต็ม ---------- */
 const chips=await ev(()=>({
   up:pjTasks('2000001',PJP.plan&&Object.keys(PJP.plan)[0]).map(x=>x.k+':'+x.s),
   dn:pjTasks('2000002',Object.keys(PJP.plan)[0]).map(x=>x.k+':'+x.s),
   sales:pjSales('2000001')}));
 t('🔺 ร้านที่เดือนก่อนโต 100% ยังขึ้น "ยอดโต" ไม่ใช่ "ยอดตก"',
   chips.up.some(x=>x.indexOf('up:')===0)&&!chips.up.some(x=>x.indexOf('down:')===0),chips.up.join(' | '));
 t('⚠️ pjSales (ที่ป้ายเตือนใช้) ยังเทียบเดือนที่จบแล้วเท่านั้น',
   chips.sales.m===PM&&chips.sales.cur===20000&&chips.sales.prv===10000,
   chips.sales.m+' '+chips.sales.cur+'/'+chips.sales.prv);
 t('...เดือนที่ยังไม่จบจึงไม่ทำให้ทุกร้านขึ้น "ยอดตก" ต้นเดือน',
   !chips.dn.some(x=>x.indexOf('down:')===0),chips.dn.join(' | '));

 /* ---------- 4) ไฟล์วิเคราะห์เชิงลึกยังไม่ถึงเดือนนี้ ---------- */
 const stale=await ev(a=>{
   const keep=JSON.stringify(STORE),kp=JSON.stringify(STOREPROD);
   STORE={months:[a.PM2,a.PM],stores:[['209611','2000001','ร้านทดสอบโต',[[1,10,10000],[1,20,20000]]]]};
   STOREPROD={months:[a.PM2,a.PM],cat:{},stores:{},data:{}};
   if(typeof buildStoreIdx==='function')buildStoreIdx();
   const r={n:pjSalesNow('2000001'),h:pjSalesHtml('2000001')};
   STORE=JSON.parse(keep);STOREPROD=JSON.parse(kp);
   if(typeof buildStoreIdx==='function')buildStoreIdx();
   return r;
 },ARG);
 t('ไฟล์ยังไม่ถึงเดือนนี้ → ใช้เดือนล่าสุดที่มี และติดธง stale',
   stale.n.cm===PM&&stale.n.stale===true&&stale.n.running===false,stale.n.cm+' stale='+stale.n.stale);
 t('...และบอกบนการ์ดตรง ๆ ว่ายังไม่มีข้อมูลเดือนปัจจุบัน (ไม่สวมเดือนเก่าเป็นเดือนนี้)',
   /ยังไม่มีข้อมูลเดือน/.test(txt(stale.h))&&txt(stale.h).indexOf(cmTh)>=0,txt(stale.h));

 /* ---------- 5) ปฏิทินกดเข้าไปดูได้ ---------- */
 const before=await ev(new Function('return '+BLOBS));
 const cal=await ev(a=>{
   _switchTab('pjp');pjSetView('month');renderPjp();
   const cells=[...document.querySelectorAll('#pjpBody .pj-dc:not(.empty)')];
   const click=d=>{const el=[...document.querySelectorAll('#pjpBody .pj-dc:not(.empty)')]
     .find(x=>(x.getAttribute('onclick')||'').indexOf("'"+d+"'")>=0);if(el)el.click();return !!el;};
   const got={};
   got.cells=cells.length;
   got.allClickable=cells.every(x=>/pjPickDay/.test(x.getAttribute('onclick')||''));
   /* วันที่มีแผน */
   got.hitPlan=click(a.D5);
   got.planDate=PJ.d;got.planView=PJ.view;
   got.planNames=[...document.querySelectorAll('#pjDayPanel .pj-card .pj-h b')].map(x=>x.textContent);
   /* วันที่ "ไม่มีแผน" — ของเดิมกดแล้วดีดกลับ */
   got.hitEmpty=click(a.DE);
   got.emptyDate=PJ.d;got.emptyView=PJ.view;
   got.emptyMsg=(document.getElementById('pjDayPanel')||{}).innerText||'';
   /* กดช่องเดิมซ้ำ = พับเก็บ แล้วกดอีก = กางกลับ */
   click(a.DE);got.foldedAfterSecond=!PJ.open;
   click(a.DE);got.openAfterThird=PJ.open;
   return got;
 },{...ARG,DE:d2(2)===D5?d2(3):d2(2)});
 t('ทุกช่องวันในปฏิทินกดได้ (รวมวันที่ไม่มีแผน)',cal.cells>=28&&cal.allClickable,
   cal.cells+' ช่อง · ทุกช่องมี pjPickDay='+cal.allClickable);
 t('กดวันที่มีแผน → รายชื่อร้านของวันนั้นขึ้นในหน้าเดิม ไม่สลับไปมุมมองรายวัน',
   cal.hitPlan&&cal.planDate===D5&&cal.planView==='month'&&cal.planNames.length===2,
   cal.planDate+' · view='+cal.planView+' · ร้าน '+cal.planNames.join(', '));
 t('🔧 กดวันที่ "ไม่มีแผน" แล้ววันที่เลือกต้องอยู่ที่วันนั้น (ของเดิมดีดกลับทุกครั้ง)',
   cal.hitEmpty&&cal.emptyDate!==D5&&cal.emptyView==='month',cal.emptyDate);
 t('...และบอกว่าวันนั้นไม่มีร้านในแผน',/ไม่มีร้านในแผน/.test(cal.emptyMsg),cal.emptyMsg.replace(/\s+/g,' ').slice(0,110));
 t('กดช่องเดิมซ้ำ = พับเก็บ · กดอีกครั้ง = กางกลับ (เหมือนปฏิทินงาน)',
   cal.foldedAfterSecond&&cal.openAfterThird,'พับ='+cal.foldedAfterSecond+' กาง='+cal.openAfterThird);

 /* ---------- 6) เลื่อนเดือนในหน้า PJP ---------- */
 const step=await ev(a=>{
   pjSetView('month');PJ.d=a.D5;PJ.ym=a.CM;renderPjp();
   const head=()=>document.querySelector('#pjpBody .pj-calm').textContent.trim();
   const h0=head();
   pjCalStep(-1);const h1=head(),y1=PJ.ym;
   pjCalStep(-1);const y2=PJ.ym;
   pjCalStep(1);pjCalStep(1);const y3=PJ.ym,h3=head();
   /* ◀ ▶ ของแถบวันที่ด้านบน ต้องเลื่อนเดือนด้วยเมื่ออยู่ในมุมมองปฏิทิน */
   pjStep(-1);const y4=PJ.ym;
   /* กลับมามุมมองรายวัน แล้ว ◀ ▶ ต้องข้ามวันที่มีแผนเหมือนเดิม */
   pjSetView('day');PJ.d=a.D12;pjStep(-1);const dayBack=PJ.d;
   pjStep(1);const dayFwd=PJ.d;
   return {h0,h1,y1,y2,y3,h3,y4,dayBack,dayFwd,
     today:(()=>{pjSetView('month');pjCalToday();return {d:PJ.d,ym:PJ.ym};})()};
 },ARG);
 t('หัวปฏิทินบอกชื่อเดือนที่กำลังดู',step.h0.indexOf(cmTh)>=0,step.h0);
 t('◀ เลื่อนไปเดือนก่อนได้ในหน้า PJP เอง (ไม่ต้องออกไปหน้าอื่น)',
   step.y1===PM&&step.h1.indexOf(pmTh)>=0,step.y1+' · "'+step.h1+'"');
 t('...เลื่อนย้อนได้เรื่อย ๆ แม้เดือนนั้นไม่มีแผน',step.y2===PM2,step.y2);
 t('▶ เลื่อนกลับมาเดือนปัจจุบันได้',step.y3===CM&&step.h3.indexOf(cmTh)>=0,step.y3);
 t('◀ ▶ แถบวันที่ด้านบน ในมุมมองปฏิทินก็เลื่อนเดือน',step.y4===PM,step.y4);
 t('⚠️ ในมุมมองรายวัน ◀ ▶ ยังข้ามไปวันที่มีแผนเหมือนเดิม',
   step.dayBack===D5&&step.dayFwd===D12,step.dayBack+' → '+step.dayFwd);
 t('ปุ่ม "วันนี้" กลับมาวันนี้และเดือนนี้',step.today.ym===CM&&step.today.d===(()=>{
   const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');})(),
   JSON.stringify(step.today));

 /* ---------- 7) 🛟 อ่านอย่างเดียว ---------- */
 await ev(a=>{
   pjSetView('month');renderPjp();
   ['week','month','day'].forEach(v=>{pjSetView(v);});
   pjSetView('month');pjCalStep(-1);pjCalStep(1);pjPickDay(a.D5);pjPickDay(a.D5);pjPickDay(a.D12);
   ['all','fu','hot'].forEach(k=>pjSetOnly(k));pjSetOnly('all');
   pjCalToday();pjSetView('month');renderPjp();
 },ARG);
 const after=await ev(new Function('return '+BLOBS));
 let moved='';
 if(after!==before){const a1=JSON.parse(before),b1=JSON.parse(after);
   moved=Object.keys(a1).filter(k=>JSON.stringify(a1[k])!==JSON.stringify(b1[k])).join(', ')||'(ไม่รู้ก้อนไหน)';}
 t('🛟 กดปฏิทินทุกปุ่มทุกมุมมองแล้ว ข้อมูลทุกก้อนเหมือนเดิมเป๊ะทุกไบต์',after===before,moved);
 t('🛟 ไม่มีการยิงอะไรขึ้นเซิร์ฟเวอร์เลย',await ev(()=>window.__posts.length===0&&!window.__sync),
   await ev(()=>window.__posts.join(', ')+' sync='+(window.__sync||0)));

 /* ---------- 8) เดือนปัจจุบันจาก "บิลรายวัน" (เจ้าของขอ 28 ต.ค. 69) ----------
    ไฟล์วิเคราะห์เชิงลึกมาเดือนละครั้ง การ์ดจึงเคยค้างอยู่ที่ "ก.ย. เทียบ ส.ค." ทั้งเดือนตุลาคม
    ทั้งที่บิลรายวันของตุลาคมอัพเข้ามาทุกวันแล้ว */
 const daily=await ev(a=>{
   /* เอาเดือนปัจจุบันออกจากไฟล์รายเดือนทั้งสองตัว ให้เหลือแต่บิลรายวัน */
   STORE={months:[a.PM2,a.PM],stores:[
     ['209611','2000001','ร้านทดสอบโต',[[1,10,10000],[1,20,20000]]],
     ['209611','2000002','ร้านทดสอบตก',[[1,10,10000],[1,20,20000]]]]};
   STOREPROD={months:[a.PM2,a.PM],cat:{},stores:{},data:{}};
   if(typeof buildStoreIdx==='function')buildStoreIdx();
   /* บิลรายวัน: อัพมาแล้ว 10 วัน (วันที่ 1-10 ของเดือนนี้) */
   STOREDAILY={data:{}};
   for(let d=1;d<=10;d++){
     const k=a.CM+'-'+String(d).padStart(2,'0');
     STOREDAILY.data[k]={'2000001':{l:'209611',n:'ร้านทดสอบโต',cs:1,pc:0,niv:500}};
     if(d<=4)STOREDAILY.data[k]['2000002']={l:'209611',n:'ร้านทดสอบตก',cs:1,pc:0,niv:100};
   }
   return {a:pjSalesNow('2000001'),b:pjSalesNow('2000002'),c:pjSalesNow('2000003'),
     ha:pjSalesHtml('2000001',[]),hc:pjSalesHtml('2000003',[])};
 },ARG);
 const txt2=x=>String(x).replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim();
 t('🔧 ไม่มีไฟล์รายเดือนของเดือนนี้ ก็ยังรู้ยอดเดือนนี้จากบิลรายวัน',
   daily.a.cm===CM&&daily.a.src==='daily'&&daily.a.cur===5000&&daily.a.stale===false,
   JSON.stringify({cm:daily.a.cm,src:daily.a.src,cur:daily.a.cur,stale:daily.a.stale}));
 t('...เทียบกับเดือนที่แล้วจากไฟล์รายเดือน (ของแม่นกว่า) ไม่ใช่บิลรายวัน',
   daily.a.prv===20000&&daily.a.psrc==='month',daily.a.prv+' / '+daily.a.psrc);
 t('...นับถึง "วันล่าสุดที่อัพไฟล์" ไม่ใช่วันนี้ — วันที่ยังไม่อัพต้องไม่ถูกนับเป็นวันขายไม่ได้',
   daily.a.day===10&&daily.a.days===10,'ถึงวันที่ '+daily.a.day+' · อัพแล้ว '+daily.a.days+' วัน');
 t('...จังหวะคิดจากวันที่นับถึงจริง (20000 × 10 ÷ '+DIM+')',
   Math.round(daily.a.pace)===Math.round(20000*10/DIM),Math.round(daily.a.pace));
 t('...บนการ์ดบอกว่านับถึงวันไหน และมาจากบิลรายวันกี่วัน',
   /ถึงวันที่ 10/.test(txt2(daily.ha))&&/บิลรายวัน/.test(txt2(daily.ha))&&/10 วัน/.test(txt2(daily.ha)),
   txt2(daily.ha));
 t('ร้านที่มีบิลแค่ 4 วันแรก ได้ยอดเฉพาะของตัวเอง',daily.b.cur===400,daily.b.cur);
 t('🛟 ร้านที่ไม่มีบิลเลยในเดือนนี้ = 0 จริง ไม่ใช่ "ไม่มีข้อมูล"',
   daily.c.haveCur===true&&daily.c.cur===0&&/ยังไม่เปิดบิล/.test(txt2(daily.hc)),
   JSON.stringify({haveCur:daily.c.haveCur,cur:daily.c.cur})+' | '+txt2(daily.hc));

 /* ---------- 9) KPI: ต้องขึ้น "ที่ผ่านแล้ว" ด้วย ---------- */
 const kpi=await ev(a=>{
   PSTORE={rounds:{[a.PM+'-30']:{asof:a.PM+'-30',bm:9,up:1,rows:[
     /* [route, code, name, type, yes, A, V, D, months, gap, cta, gsv] */
     ['R1','2000001','ร้านทดสอบโต','F',1,'G','G','G',6,0,'',0.01],
     ['R1','2000002','ร้านทดสอบตก','F',0,'R','G','R',3,2,'Drive AO & SO',0.01]]}}};
   EB2B={asof:null,up:0,lines:{},data:{'209611':{n:1,stores:[['2000001','ร้านทดสอบโต',a.PM+'-10']]}}};
   PJP.out['2000001'].e='Y';PJP.out['2000002'].e='Y';PJP.out['2000003'].e='Y';
   return {k1:pjKpi('2000001'),k2:pjKpi('2000002'),k3:pjKpi('2000003'),
     h1:pjKpiHtml('2000001'),h2:pjKpiHtml('2000002'),
     t1:pjTasks('2000001',a.D5).map(x=>x.k)};
 },ARG);
 t('🔧 ร้านที่ผ่าน Perfect Store แล้ว ต้องขึ้นให้เห็นว่า "ผ่านแล้ว"',
   kpi.k1[0].k==='ps'&&kpi.k1[0].ok===true,JSON.stringify(kpi.k1[0]));
 t('🔧 ร้านที่เปิด eB2B แล้ว ก็ต้องขึ้นว่าเปิดแล้ว (เดิมเงียบ ไม่ขึ้นอะไรเลย)',
   (kpi.k1[1]||{}).k==='eb'&&kpi.k1[1].ok===true,JSON.stringify(kpi.k1[1]));
 t('...และมีป้ายสรุป "ผ่าน 2/2" ให้เห็นตั้งแต่ยังไม่กด',
   /ผ่าน 2\/2/.test(txt2(kpi.h1)),txt2(kpi.h1).slice(0,90));
 t('ร้านที่ยังไม่ผ่าน ขึ้นว่าไม่ผ่านพร้อมบอกว่าขาดอะไร',
   kpi.k2[0].ok===false&&/ขาด A\/D/.test(kpi.k2[0].s)&&kpi.k2[0].detail.length===2,
   JSON.stringify({s:kpi.k2[0].s,d:kpi.k2[0].detail}));
 t('...และคำแนะนำของ Unilever ยังเห็นบนการ์ดเลย ไม่ต้องกดก่อน',
   /Unilever แนะนำ/.test(txt2(kpi.h2))&&/Drive B2B/.test(txt2(kpi.h2)),txt2(kpi.h2));
 t('...ป้ายสรุปของร้านที่ยังไม่ผ่านคือ 0/2',/ผ่าน 0\/2/.test(txt2(kpi.h2)),txt2(kpi.h2).slice(0,80));
 t('🛟 ร้านที่ไม่มีข้อมูล Perfect Store ขึ้น "ไม่มีข้อมูล" ไม่ใช่ "ไม่ผ่าน"',
   kpi.k3[0].ok===null&&/ไม่มีข้อมูล/.test(kpi.k3[0].s),JSON.stringify(kpi.k3[0]));
 t('pjTasks ยังให้ป้าย psok / ebok สำหรับร้านที่ผ่านแล้ว',
   kpi.t1.indexOf('psok')>=0&&kpi.t1.indexOf('ebok')>=0,kpi.t1.join(','));

 /* ไม่มีไฟล์ eB2B เลย = ห้ามบอกว่าทุกร้าน "ยังไม่เปิด" */
 const noEb=await ev(()=>{EB2B={asof:null,up:0,lines:{},data:{}};
   return {k:pjKpi('2000001'),t:pjTasks('2000001',Object.keys(PJP.plan)[0]).map(x=>x.k)};});
 t('🛟 ไม่มีไฟล์ eB2B เลย → ขึ้น "ยังไม่ได้อัพไฟล์" ไม่ใช่ตราหน้าว่าทุกร้านยังไม่เปิด',
   (noEb.k[1]||{}).ok===null&&noEb.t.indexOf('eb')<0&&noEb.t.indexOf('ebok')<0,
   JSON.stringify(noEb.k[1])+' | '+noEb.t.join(','));

 /* ---------- 10) ยอดขายกับ KPI แยกกล่องกัน และ KPI กดดูได้ ---------- */
 const sep=await ev(a=>{
   PJ.d=a.D5;PJ.view='day';PJ.kpi={};renderPjp();
   const c=document.querySelector('#pjpBody .pj-card');
   const g=sel=>c.querySelectorAll(sel).length;
   const before={sales:g('.pj-sl'),kpi:g('.pj-kpi'),det:g('.pj-kdet')};
   c.querySelector('.pj-ktap').click();
   const c2=document.querySelector('#pjpBody .pj-card');
   const after={det:c2.querySelectorAll('.pj-kdet').length,txt:c2.innerText.replace(/\s+/g,' ')};
   document.querySelector('#pjpBody .pj-card .pj-ktap').click();
   return {before:before,after:after,
     closed:document.querySelectorAll('#pjpBody .pj-card .pj-kdet').length,
     order:[...document.querySelectorAll('#pjpBody .pj-card .pj-box')].map(x=>x.className)};
 },ARG);
 t('การ์ดแยกเป็นสองกล่องชัดเจน: 📊 ยอดขาย แล้วตามด้วย 🎯 KPI',
   sep.before.sales===1&&sep.before.kpi===1&&/pj-sl/.test(sep.order[0])&&/pj-kpi/.test(sep.order[1]),
   sep.order.join(' | '));
 t('...ตอนแรกย่อไว้ กดแล้วกางรายละเอียด กดอีกทีย่อกลับ',
   sep.before.det===0&&sep.after.det===1&&sep.closed===0,
   'ก่อน '+sep.before.det+' · กด '+sep.after.det+' · กดซ้ำ '+sep.closed);
 t('...รายละเอียดที่กางออกบอกว่าต้องทำอะไรเพิ่ม',/ต้องทำเพิ่ม/.test(sep.after.txt)||/ผ่านแล้ว/.test(sep.after.txt),
   sep.after.txt.slice(0,140));

 /* ---------- 11) 🛟 ทั้งหมดนี้อ่านอย่างเดียว ---------- */
 const before2=await ev(new Function('return '+BLOBS));
 await ev(a=>{
   ['2000001','2000002','2000003','2000004'].forEach(c=>{pjKpiTog(c);pjSalesNow(c);pjKpiHtml(c);});
   ['2000001','2000002','2000003','2000004'].forEach(c=>pjKpiTog(c));
   renderPjp();
 },ARG);
 const after2=await ev(new Function('return '+BLOBS));
 let moved2='';
 if(after2!==before2){const x=JSON.parse(before2),y=JSON.parse(after2);
   moved2=Object.keys(x).filter(k=>JSON.stringify(x[k])!==JSON.stringify(y[k])).join(', ');}
 t('🛟 กดดู KPI ทุกร้านทุกแบบแล้ว ข้อมูลทุกก้อนเหมือนเดิมเป๊ะทุกไบต์',after2===before2,moved2||'(ไม่มี)');
 t('🛟 สถานะกาง/ย่ออยู่บน PJ (ไม่ถูก sync) ไม่ได้อยู่ใน PJP',
   await ev(()=>typeof PJ.kpi==='object'&&!('kpi' in PJP)),'ok');

 const real=errs.filter(e=>!/localStorage|SecurityError/.test(e));
 t('ไม่มี JavaScript error ตลอดเทสต์',real.length===0,real.join(' | '));

 await b.close();
 let fail=0;
 A.forEach(([ok,nm,x])=>{if(!ok)fail++;console.log((ok?'  ok  ':'  FAIL')+'  '+nm+(x?'   ['+x+']':''));});
 console.log('\n'+A.length+' checks · '+(A.length-fail)+' passed · '+fail+' failed');
 console.log(fail?'SOME FAILED':'ALL PASS ('+A.length+' checks)');
 process.exit(fail?1:0);
})();
