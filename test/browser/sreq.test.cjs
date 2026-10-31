/* 🛒 คำขอสินค้าของเซลล์ — ตะกร้าหยิบได้หลายตัว ส่งครั้งเดียว และร่างที่ยังไม่ได้ส่งต้องไม่หาย
 *
 * ที่มา (19 ต.ค. 69): ทีมขายแจ้งว่า "กดไป 7-8 ตัวแล้วเครื่องค้าง"
 * วัดแล้วพบว่าเกิดจาก 3 อย่างรวมกัน ไม่ใช่เน็ตช้าอย่างเดียว:
 *   ก) กด ＋ เพิ่ม แล้วผลค้นหา "หายทั้งแผง" ทุกครั้ง → ต้องพิมพ์ค้นหาใหม่ทีละตัวจนครบ 7-8 ตัว
 *      และเมื่อกลัวข้อมูลหาย ก็เลยกดส่งทีละตัว = ยิงเซิร์ฟเวอร์ 8 ครั้ง + alert() เด้ง 8 ครั้ง
 *      (วัดบนมือถือจำลอง CPU ช้า 6 เท่า เน็ตตอบ 1.2 วิ: ~9.9 วินาที)
 *   ข) ทุกตัวอักษรที่พิมพ์ วาดผลค้นหาใหม่ทั้งแผง และเรียก reqWarn→poWhy 25 ครั้ง
 *      (~54 ms ต่อปุ๋ม บนมือถือเครื่องช้า = คีย์บอร์ดหนืดเหมือนเครื่องค้าง)
 *   ค) ปิดหน้าต่าง = ของที่คีย์ไว้หายหมด (openReqModal ล้าง REQ.cart ทุกครั้ง)
 *
 * สิ่งที่เทสนี้ต้องพิสูจน์:
 *   1) หยิบหลายตัวจากผลค้นหาชุดเดียวได้ · ผลค้นหาไม่หาย · กดซ้ำ = เอาออก
 *   2) ส่งครั้งเดียว ยิง /api/request ครั้งเดียว ไม่มี alert() บล็อกหน้าจอ
 *   3) ร่างอยู่รอดทั้งการปิดหน้าต่างและการ refresh ทั้งหน้า พร้อมจำนวนที่คีย์ไว้
 *   4) ส่งสำเร็จ → ล้างร่าง · ส่งไม่สำเร็จ → ร่างต้องยังอยู่ให้กดส่งซ้ำ
 *   5) ร่างแยกตามรอบวันที่และตามคนล็อกอิน ไม่ปนกัน
 *   6) 🛟 ร่างอยู่แค่ในเครื่อง — ไม่เคยเข้าไปใน state ที่ sync, ไม่มีการยิง /api/save
 *      และการส่งต้อง "รวม" กับของที่ส่งไปแล้วรอบนั้น ไม่ใช่เขียนทับ
 *   7) หน้าจอต้องอัพเดทหลังเซิร์ฟเวอร์รับแล้วเท่านั้น (เน็ตหลุด = ต้องไม่โชว์ว่าส่งแล้ว)
 *   8) เบราว์เซอร์ที่ห้าม localStorage (โหมดส่วนตัว) ต้องไม่พัง
 *
 * ต้องติดตั้งก่อน:  npm i --no-save playwright-core
 * แล้วรัน:  node build.cjs && node test/browser/sreq.test.cjs
 */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const BROWSER=require('./_chrome.cjs').chromePath();
const PAGE=path.resolve(__dirname,'..','..','public','index.html');
const SEED=path.resolve(__dirname,'..','..','api','seed-data.json');
const ORIGIN='https://bd-sreq.test/';            /* ต้องมี origin จริง ไม่งั้น localStorage โดนห้าม */

const BLOBS=`JSON.stringify({DATA,STORE,KPI,ORDERS,STOCKD,REQUESTS,MASTER,ANALYTICS,STOREPROD,
  STOREDAILY,PSTORE,EB2B,POSTATUS,LEADS,DCI,MINSTOCK,PLAN,PROMO,PJP})`;

/* ชื่อสินค้าจริงแบบที่อยู่ในใบสั่ง — ให้ค้นด้วยคำว่า "บรีส" เจอหลายตัวในครั้งเดียว */
const PRODS=[
 ['64816247','บรีสน้ำอัลตร้า เขียว คู่6X(2X560)มล'],
 ['64391615','บรีสน้ำอัลตร้า เขียว 20B 12X3X130มล'],
 ['64816286','บรีสน้ำฟลอรัล ชมพู คู่ 6X(2X560)มล'],
 ['64391616','บรีสน้ำฟลอรัล ชมพู 20B 12X3X130มล'],
 ['65542619','บรีสน้ำ ลิลลี่ แดง คู่ 6X(2X530)มล'],
 ['64819916','บรีสน้ำซิก พีโอนี่ ส้มคู่6X(2X530)มล'],
 ['65624694','บรีสน้ำซิก เฮฟเวน TW 6X(2X530)มล'],
 ['64914236','บรีสน้ำซิก แป้ง ฟ้าใสคู่ 6(2X530)มล'],
 ['65453458','บรีสน้ำ คอตตอนแคนดี้คู่ 6X(2X530)มล'],
 ['65598040','บรีสน้ำ เพียว แฮปปี้คู่ 6X(2X530)มล'],
 ['64939085','โอโมน้ำ ปารีส TW 6X(2X530)มล'],
 ['64329237','โอโม ลิควิด ไวท์ TW 6X(2X530)มล'],
];

/* ติดตั้งข้อมูลให้เหมือนเครื่องเซลล์จริง: มีรอบใบสั่งหลายวัน (poWhy ต้องมีงานทำจริง) */
function setup(a){
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};window.ulog=()=>{};
  window.__posts=[];window.__alerts=[];window.__fail=0;window.__delay=0;
  window.fetch=(u,o)=>{window.__posts.push({u:String(u),body:(o&&o.body)||''});
    const bad=window.__fail;
    return new Promise(res=>setTimeout(()=>res(bad
      ?{ok:false,status:500,json:()=>Promise.resolve({error:'จำลองเซิร์ฟเวอร์ล่ม'})}
      :{ok:true,status:200,json:()=>Promise.resolve({ok:true})}),window.__delay));};
  window.alert=m=>window.__alerts.push(String(m));
  window.confirm=()=>true;

  const seed=JSON.parse(a.seed);
  DATA=seed.DATA;STORE=seed.STORE;STOCKD=seed.STOCKD;ANALYTICS=seed.ANALYTICS;STOREPROD=seed.STOREPROD;
  REQUESTS={data:{}};
  MASTER={items:{},at:1};                     /* เวลาคงที่ เพื่อเทียบไบต์ข้ามการ refresh ได้ */
  a.PRODS.forEach(([c,n])=>{MASTER.items[c]=n;});
  /* สินค้าถมอีก 1,200 รหัสให้แคตตาล็อกใหญ่เท่าของจริง */
  for(let i=0;i<1200;i++)MASTER.items['9'+String(1000000+i)]='สินค้าทดสอบ '+i;
  const codes=Object.keys(MASTER.items);
  const items={},nm={},ord={};
  a.PRODS.forEach(([c,n])=>{nm[c]=n;});
  codes.forEach((c,i)=>{items[c]=(i%17===0)?{s:1}:(i%23===0)?{x:'00FFFF'}:{};ord[c]=i%5;});
  POSTATUS={dates:[],data:{}};ORDERS={dates:[],names:nm,cat:{},catN:{},data:{}};
  for(let d=1;d<=20;d++){const date='2026-10-'+String(d).padStart(2,'0');
    POSTATUS.dates.push(date);POSTATUS.data[date]={items:items,file:'BD.xlsx',all:codes.slice(),allSeq:1};
    ORDERS.dates.push(date);ORDERS.data[date]={rounds:{main:ord},dropped:null,hasResult:true};}
  STOCKD={rows:a.PRODS.slice(0,6).map(([c,n])=>({c:c,n:n,wh:'sale',i:40}))};
  S.user={id:'ct11',role:'sales',code:'CT11',name:'เซลล์ CT11'};TOKEN='test-token';
  ORD.sec='req';
  window.__codes=a.PRODS.map(p=>p[0]);
}

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:390,height:840}});
 const pg=await ctx.newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 const html=fs.readFileSync(PAGE,'utf8');
 await pg.route(ORIGIN+'**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}));
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);
 const seed=fs.readFileSync(SEED,'utf8');
 const boot=async()=>{await ev(setup,{seed,PRODS});};

 await pg.goto(ORIGIN);
 await boot();
 /* จำลองมือถือราคาประหยัด — ถ้าไม่หน่วง CPU จะวัดไม่เห็นอาการหนืด */
 const cdp=await ctx.newCDPSession(pg);
 await cdp.send('Emulation.setCPUThrottlingRate',{rate:6});

 /* ---------- 1) ตะกร้า: หยิบหลายตัวจากผลค้นหาชุดเดียว ---------- */
 const pick=await ev(()=>{
   openReqModal();
   const el=document.getElementById('reqSearch');
   el.value='บรีส';renderReqResults();
   const n0=document.querySelectorAll('#reqResults .req-opt').length;
   const first=[...document.querySelectorAll('#reqResults .req-opt')].slice(0,8)
     .map(d=>d.querySelector('.oi span').textContent.trim().split(' ')[0]);
   first.forEach(c=>reqAdd(c));
   const n1=document.querySelectorAll('#reqResults .req-opt').length;
   const inc=document.querySelectorAll('#reqResults .req-opt.inc').length;
   const tick=[...document.querySelectorAll('#reqResults .req-opt.inc .oadd')].every(s=>/ในตะกร้า/.test(s.textContent));
   const cart1=Object.keys(REQ.cart).length;
   reqAdd(first[0]);                                /* กดซ้ำ = เอาออก */
   const cart2=Object.keys(REQ.cart).length;
   reqAdd(first[0]);
   const search=document.getElementById('reqSearch').value;
   const btn=document.getElementById('reqSubmitBtn').textContent;
   return {n0,n1,inc,tick,cart1,cart2,cart3:Object.keys(REQ.cart).length,search,btn,picked:first};
 });
 t('หยิบ 8 ตัวจากผลค้นหาชุดเดียวได้ (ไม่ต้องพิมพ์ค้นหาใหม่ทุกตัว)',pick.cart1===8,'ในตะกร้า '+pick.cart1);
 t('กด ＋ เพิ่ม แล้วผลค้นหา "ไม่หาย" — ยังอยู่ครบเท่าเดิม',pick.n0>=8&&pick.n1===pick.n0,pick.n0+' → '+pick.n1);
 t('...และคำค้นในช่องค้นหาไม่ถูกล้าง',pick.search==='บรีส','["'+pick.search+'"]');
 t('ตัวที่หยิบแล้วขึ้น ✓ ในตะกร้า (ไม่ใช่หายไปจากแผง)',pick.inc===8&&pick.tick,'ขึ้น ✓ '+pick.inc+' แถว');
 t('กดซ้ำที่ตัวเดิม = เอาออกจากตะกร้า',pick.cart2===7&&pick.cart3===8,pick.cart1+' → '+pick.cart2+' → '+pick.cart3);
 t('ปุ่มส่งบอกจำนวนในตะกร้าให้เห็น',/8 รายการ/.test(pick.btn),'["'+pick.btn+'"]');

 /* ---------- 2) พิมพ์ค้นหาต้องไม่หนืด ---------- */
 const speed=await ev(()=>{
   const el=document.getElementById('reqSearch');el.value='';renderReqResults();
   REQ_WARN_C={};REQ_WARN_K='';
   const t0=performance.now();
   for(const s of ['บ','บร','บรี','บรีส','บรีสน','บรีสน้ำ'])
     {el.value=s;el.dispatchEvent(new Event('input'));}
   const typing=performance.now()-t0;                     /* เธรดหลักถูกบล็อกเท่าไหร่ */
   const pending=REQ.t>0;
   const t1=performance.now();renderReqResults();const first=performance.now()-t1;
   const t2=performance.now();renderReqResults();const again=performance.now()-t2;
   return {typing:+typing.toFixed(1),pending,first:+first.toFixed(1),again:+again.toFixed(1),
     rows:document.querySelectorAll('#reqResults .req-opt').length};
 });
 t('พิมพ์ 6 ตัวอักษรไม่วาดผลใหม่ทุกตัว (หน่วงรวบไว้วาดครั้งเดียว)',speed.typing<25&&speed.pending,
   'บล็อกเธรดหลัก '+speed.typing+' ms · มีคิวรอวาด='+speed.pending);
 t('...วาดจริงครั้งเดียวจบ แม้ CPU ช้า 6 เท่า',speed.first<400&&speed.rows>0,
   'วาด '+speed.first+' ms · '+speed.rows+' แถว');
 t('reqWarn จำคำตอบไว้ — วาดซ้ำเร็วกว่าหรือเท่าครั้งแรก',speed.again<=speed.first+5,
   'ครั้งแรก '+speed.first+' ms → ครั้งที่สอง '+speed.again+' ms');
 t('reqWarn อ่านอย่างเดียว ให้คำตอบเท่ากับเรียก poWhy ตรง ๆ ทุกรหัส',
   await ev(()=>{REQ_WARN_C={};REQ_WARN_K='';
     return window.__codes.every(c=>{const a=reqWarn(c);const b=reqWarn(c);return a===b;});}),'ok');

 /* ---------- 3) ส่งครั้งเดียว ---------- */
 const send=await ev(async()=>{
   openReqModal();window.__posts=[];window.__alerts=[];window.__delay=120;
   document.getElementById('reqSearch').value='บรีส';renderReqResults();
   const cs=[...document.querySelectorAll('#reqResults .req-opt')].slice(0,8)
     .map(d=>d.querySelector('.oi span').textContent.trim().split(' ')[0]);
   cs.forEach((c,i)=>{reqAdd(c);reqSet(c,'cs',i+1);});
   const t0=performance.now();await submitRequest();const ms=performance.now()-t0;
   const saved=(REQUESTS.data[REQ.date]||{}).CT11||{};
   return {ms:Math.round(ms),posts:window.__posts.length,urls:window.__posts.map(p=>p.u),
     alerts:window.__alerts,body:window.__posts[0]?JSON.parse(window.__posts[0].body):null,
     cart:Object.keys(REQ.cart).length,saved:Object.keys(saved.items||{}).length,
     closed:document.getElementById('reqModal').classList.contains('hidden'),
     toast:(document.getElementById('toastBox')||{}).textContent||'',picked:cs};
 });
 t('กด 8 ตัวแล้วส่ง "ครั้งเดียว" — ยิงเซิร์ฟเวอร์ 1 ครั้ง ไม่ใช่ 8 ครั้ง',send.posts===1,
   send.posts+' ครั้ง: '+send.urls.join(', '));
 t('...ยิงไปที่ /api/request เท่านั้น',send.urls.every(u=>/\/api\/request$/.test(u)),send.urls.join(', '));
 t('...ส่งขึ้นไปครบ 8 รายการพร้อมจำนวน ลัง',
   send.body&&Object.keys(send.body.items||{}).length===8&&send.body.items[send.picked[0]].cs===1,
   send.body?JSON.stringify(send.body.items[send.picked[0]]):'(ไม่มี body)');
 t('ไม่มี alert() เด้งบล็อกหน้าจอตอนส่งสำเร็จ (ใช้ข้อความลอยแทน)',send.alerts.length===0,send.alerts.join(' | '));
 t('...ขึ้นข้อความยืนยันให้เห็นว่าส่งแล้วกี่รายการ',/ส่งคำขอเรียบร้อย/.test(send.toast)&&/8/.test(send.toast),
   '["'+send.toast.replace(/\n/g,' / ')+'"]');
 t('ส่งเสร็จปิดหน้าต่างและล้างตะกร้า',send.closed&&send.cart===0,'ตะกร้าเหลือ '+send.cart);
 t('ส่งสำเร็จแล้วร่างในเครื่องถูกล้าง',await ev(()=>reqDraftCount(REQ.date)===0),
   await ev(()=>'เหลือ '+reqDraftCount(REQ.date)));

 /* ---------- 4) ส่งเพิ่มต้อง "รวม" กับของเดิม ไม่ใช่ทับ ---------- */
 const merge=await ev(async()=>{
   const old=Object.keys(((REQUESTS.data[orderRoundDate()]||{}).CT11||{}).items||{});
   openReqModal();window.__posts=[];
   const nc='64939085';reqAdd(nc);reqSet(nc,'cs',9);
   await submitRequest();
   const now=((REQUESTS.data[orderRoundDate()]||{}).CT11||{}).items||{};
   return {oldN:old.length,nowN:Object.keys(now).length,kept:old.every(c=>c in now),added:now[nc]?now[nc].cs:0,
     body:Object.keys(JSON.parse(window.__posts[0].body).items).length};
 });
 t('🛟 ส่งเพิ่มอีก 1 ตัว ของเดิมที่ส่งไปแล้วยังอยู่ครบ (รวม ไม่ใช่เขียนทับ)',
   merge.kept&&merge.nowN===merge.oldN+1,merge.oldN+' → '+merge.nowN+' รายการ');
 t('...payload ที่ยิงขึ้นไปก็ถือของเดิมไปด้วยทั้งชุด',merge.body===merge.nowN,
   'ใน payload '+merge.body+' รายการ');
 t('...จำนวนของตัวใหม่ถูกต้อง',merge.added===9,'cs='+merge.added);

 /* ---------- 5) ร่าง: ปิดหน้าต่าง + refresh ทั้งหน้า ---------- */
 await ev(()=>{
   openReqModal();
   [['64816247',3],['64816286',5],['65542619',7]].forEach(([c,n])=>{reqAdd(c);reqSet(c,'cs',n);});
   reqDraftSave();closeReqModal();
 });
 const onPage=await ev(()=>{renderOrder();
   return {btn:document.querySelector('#myRequest .upload-btn').textContent,
     note:document.getElementById('myRequest').innerText};});
 t('ปิดหน้าต่างแล้ว หน้าคำขอบอกว่ามีของค้างอยู่กี่รายการ',/ทำต่อ 3 รายการ/.test(onPage.btn),'["'+onPage.btn+'"]');
 t('...พร้อมป้ายเตือนว่า "ยังไม่ได้ส่ง"',/ยังไม่ได้ส่ง/.test(onPage.note)&&/3 รายการ/.test(onPage.note),'ok');

 await pg.reload();await boot();
 const back=await ev(()=>{openReqModal();
   return {n:Object.keys(REQ.cart).length,cs:Object.keys(REQ.cart).sort().map(c=>REQ.cart[c].cs).join(','),
     banner:/ยังไม่ได้ส่ง/.test(document.getElementById('reqCart').innerHTML),
     when:/เก็บไว้ตอน/.test(document.getElementById('reqCart').innerHTML)};});
 t('🔁 refresh ทั้งหน้าแล้วเปิดกลับมา ของในตะกร้ายังอยู่ครบ 3 รายการ',back.n===3,'เหลือ '+back.n);
 t('...จำนวน ลัง ที่คีย์ไว้ยังอยู่ถูกตัว',back.cs==='3,5,7','['+back.cs+']');
 t('...และบอกให้รู้ว่านี่คือของค้างที่ยังไม่ได้ส่ง พร้อมเวลาที่เก็บไว้',back.banner&&back.when,'ok');

 /* ---------- 6) ส่งไม่สำเร็จ ร่างต้องยังอยู่ ---------- */
 const failed=await ev(async()=>{
   window.__fail=1;window.__alerts=[];
   const sentBefore=Object.keys(((REQUESTS.data[REQ.date]||{}).CT11||{}).items||{}).length;
   await submitRequest();
   window.__fail=0;
   return {cart:Object.keys(REQ.cart).length,draft:reqDraftCount(REQ.date),
     closed:document.getElementById('reqModal').classList.contains('hidden'),
     alerts:window.__alerts,
     sentNow:Object.keys(((REQUESTS.data[REQ.date]||{}).CT11||{}).items||{}).length,
     sentBefore:sentBefore,
     btn:document.getElementById('reqSubmitBtn').textContent};
 });
 t('🛟 เซิร์ฟเวอร์ล่ม: ของในตะกร้าไม่หาย กดส่งซ้ำได้เลย',failed.cart===3&&failed.draft===3,
   'ตะกร้า '+failed.cart+' · ร่าง '+failed.draft);
 t('...หน้าต่างไม่ปิดหนีไป',!failed.closed,'ปิดไปแล้ว='+failed.closed);
 t('...เตือนแบบบล็อกหน้าจอ เพราะเรื่องส่งไม่ผ่านต้องไม่พลาดตา',failed.alerts.length===1,failed.alerts.join(' | '));
 t('...และบอกชัดว่ารายการที่คีย์ไว้ยังอยู่',/ยังอยู่/.test(failed.alerts[0]||''),'["'+(failed.alerts[0]||'').replace(/\n/g,' / ')+'"]');
 t('🛟 เน็ตหลุด = หน้าจอต้องไม่โชว์ว่า "ส่งไปแล้ว" (อัพเดทหลังเซิร์ฟเวอร์รับเท่านั้น)',
   failed.sentNow===failed.sentBefore,failed.sentBefore+' → '+failed.sentNow+' รายการ');
 t('...ปุ่มส่งกลับมากดได้ ไม่ค้างที่ "กำลังส่ง…"',/ส่งคำขอ/.test(failed.btn)&&!/กำลังส่ง/.test(failed.btn),
   '["'+failed.btn+'"]');

 /* ---------- 7) ร่างแยกตามรอบ และตามคน ---------- */
 const sep=await ev(()=>{
   const mine=REQ.date;
   const other='2026-12-25';
   const a1=reqDraftCount(other);                       /* รอบอื่นต้องไม่เห็นร่างของรอบนี้ */
   const who=S.user.code;S.user.code='CT12';
   const a2=reqDraftCount(mine);                        /* อีกคนต้องไม่เห็นร่างของเราa */
   S.user.code=who;
   return {mine:reqDraftCount(mine),other:a1,otherUser:a2};
 });
 t('ร่างแยกตามรอบวันที่ — รอบอื่นไม่เห็นของรอบนี้',sep.mine===3&&sep.other===0,
   'รอบนี้ '+sep.mine+' · รอบอื่น '+sep.other);
 t('ร่างแยกตามคนล็อกอิน — เซลล์อีกคนบนเครื่องเดียวกันไม่เห็นของเรา',sep.otherUser===0,'เห็น '+sep.otherUser);

 /* ---------- 8) 🛟 การเก็บ/อ่าน/ลบร่าง ต้องไม่แตะข้อมูลที่ sync แม้ไบต์เดียว ---------- */
 const before=await ev(new Function('return '+BLOBS));
 await ev(()=>{
   /* วนครบทุกอย่างที่ร่างทำได้ โดยไม่กดส่งเลย */
   openReqModal();
   window.__codes.slice(0,5).forEach((c,i)=>{reqAdd(c);reqSet(c,'cs',i+1);reqSet(c,'pc',i);});
   reqDraftSave();closeReqModal();
   openReqModal();reqDrop(window.__codes[0]);reqDraftSave();
   document.getElementById('reqSearch').value='บรีส';renderReqResults();
   renderReqCart();closeReqModal();renderOrder();
   openReqModal();reqDraftClear();closeReqModal();
 });
 const after=await ev(new Function('return '+BLOBS));
 const diff=(()=>{if(after===before)return '';
   const a1=JSON.parse(before),b1=JSON.parse(after);
   return Object.keys(a1).filter(k=>JSON.stringify(a1[k])!==JSON.stringify(b1[k])).join(', ');})();
 t('🛟 เก็บ/อ่าน/ลบร่างครบทุกทาง แล้วข้อมูลทุกก้อนเหมือนเดิมเป๊ะทุกไบต์',diff==='',
   'ก้อนที่เปลี่ยน: '+(diff||'(ไม่มี)'));
 t('🛟 ร่างไม่โผล่ไปอยู่ใน REQUESTS (ของที่ยังไม่ส่งต้องไม่ถือว่าส่งแล้ว)',
   await ev(()=>{const it=((REQUESTS.data[REQ.date]||{}).CT11||{}).items||{};
     return Object.keys(REQ.cart).every(c=>!(c in it)||REQ.cart[c].edit);}),'ok');
 t('🛟 ไม่เคยยิง /api/save เลยตลอดเทส (เซลล์ไม่มีสิทธิ์เขียน state ทั้งก้อน)',
   await ev(()=>!window.__posts.some(p=>/\/api\/save/.test(p.u))),'ok');
 t('🛟 ร่างเก็บใน localStorage ของเครื่องเท่านั้น และคีย์ขึ้นต้นด้วย bdreq:',
   await ev(()=>{const k=Object.keys(localStorage);return k.length>0&&k.every(x=>x.indexOf('bdreq:')===0);}),
   await ev(()=>Object.keys(localStorage).join(', ')));

 /* ---------- 9) โหมดส่วนตัว: localStorage ใช้ไม่ได้ ---------- */
 await pg.reload();await boot();
 const priv=await ev(()=>{
   const ls=window.localStorage;
   Object.defineProperty(window,'localStorage',{configurable:true,get(){throw new DOMException('denied','SecurityError');}});
   let ok=true,n=0;
   try{openReqModal();reqAdd('64816247');reqSet('64816247','cs',4);reqDraftSave();
       closeReqModal();openReqModal();n=Object.keys(REQ.cart).length;
       renderOrder();}catch(e){ok=false;n=String(e);}
   Object.defineProperty(window,'localStorage',{configurable:true,value:ls});
   return {ok,n};
 });
 t('เบราว์เซอร์ที่ห้าม localStorage (โหมดส่วนตัว) ยังสั่งของได้ ไม่พัง',priv.ok,String(priv.n));

 const real=errs.filter(e=>!/localStorage|SecurityError/.test(e));
 t('ไม่มี JavaScript error ตลอดเทสต์',real.length===0,real.join(' | '));

 await b.close();
 let fail=0;
 A.forEach(([ok,n,x])=>{if(!ok)fail++;console.log((ok?'  ok  ':'  FAIL')+'  '+n+(x?'   ['+x+']':''));});
 console.log('\n'+A.length+' checks · '+(A.length-fail)+' passed · '+fail+' failed');
 console.log(fail?'SOME FAILED':'ALL PASS ('+A.length+' checks)');
 process.exit(fail?1:0);
})();
