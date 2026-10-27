/* 📥 ตารางรวมคำขอเซลล์ — ติ๊กเลือกดูรายสายได้ (เจ้าของขอ 27 ต.ค. 69)
 *
 * *"ในตารางสีเขียว ช่วยทำให้มันกรอกรายสายได้หน่อย บางทีผมต้องการเอาสายบางสายออก
 *   หรือดูเฉพาะออเดอร์ของแต่ละสาย แต่ไม่อยากเลื่อนลงมาดูตารางข้าง ... อย่าลืมห้ามเขียนทับข้อมูลเดิม"*
 *
 * สิ่งที่ต้องพิสูจน์:
 *  1) มีชิปครบทุกสายที่ส่งคำขอวันนั้น เรียงตามลำดับสายของบริษัท พร้อมชื่อเซลล์และจำนวนรายการ
 *  2) กดชิป = เอาสายนั้นออก/กลับเข้า · กด "เฉพาะ" = เหลือสายเดียว · "ทุกสาย" = กลับมาครบ
 *  3) ยอดรวม ลัง/ชิ้น ในตารางต้องคิดจาก "เฉพาะสายที่เลือก" ไม่ใช่ยอดทุกสาย
 *  4) สินค้าที่มีแต่สายที่ถูกเอาออกขอมา ต้องหายไปจากตาราง และป้ายสายต้องเหลือเฉพาะสายที่เลือก
 *  5) ตารางรายเซลล์ด้านล่างกรองตามกันไปด้วย (จะได้ไม่ต้องเลื่อนไปดู)
 *  6) ต้องเตือนชัดว่า "กำลังกรองอยู่ ไม่ใช่ยอดรวมทุกสาย" — กันเปิดใบสั่งจากยอดที่ไม่ครบ
 *  7) เปลี่ยนวันแล้วตัวกรองต้องล้างเอง ไม่งั้นวันถัดไปเจอสายหายแล้วนึกว่าคำขอหาย
 *  8) 🛟 กรองยังไงก็ห้ามแตะ REQUESTS หรือก้อนข้อมูลใด ๆ แม้ไบต์เดียว และห้ามยิงเซิร์ฟเวอร์
 *
 * สร้างข้อมูลเองทั้งหมด จึงรันได้เสมอ
 * ต้องติดตั้งก่อน:  npm i --no-save playwright-core
 * แล้วรัน:  node build.cjs && node test/browser/reqlines.test.cjs
 */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const BROWSER=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGE=path.resolve(__dirname,'..','..','public','index.html');
const D='2026-10-27',D2='2026-10-28';

const BLOBS=`JSON.stringify({DATA,STORE,KPI,ORDERS,STOCKD,REQUESTS,MASTER,ANALYTICS,STOREPROD,
  STOREDAILY,PSTORE,EB2B,POSTATUS,LEADS,DCI,MINSTOCK,PLAN,PROMO,PJP})`;

function setup(a){
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};window.ulog=()=>{};
  window.__posts=[];window.fetch=(u)=>{window.__posts.push(String(u));
    return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({ok:true})});};
  window.__sync=0;window.syncToServer=()=>{window.__sync++;};
  window.alert=()=>{};window.confirm=()=>true;TOKEN=null;
  S.user={id:'m',role:'manager',name:'ผู้จัดการ'};
  DATA={lines:{'209611':{display:'CT11'},'209613':{display:'CT13'},'209616':{display:'CT16'},
    '209698':{display:'KA98'},'209699':{display:'KA99'}},
    focus_order:['209611','209613','209616','209698','209699'],targets:{},daily:{},monthly:{}};
  STORE={months:[],stores:[]};KPI={};ANALYTICS={months:[],data:{}};STOREPROD={months:[],cat:{},stores:{},data:{}};
  STOREDAILY={};PSTORE={rounds:{}};EB2B={asof:null,up:0,lines:{},data:{}};LEADS={meta:{},sales:{},del:{}};
  DCI={};MINSTOCK={};PLAN={items:{},done:{},del:{}};PROMO={items:{},res:{},del:{}};
  PJP={out:{},plan:{},done:{},cfg:{}};MASTER={items:{}};
  STOCKD={date:a.D,rows:[],names:{
    '64345616':'โอโมน้ำยาล้างจานเลมอน NF 12X3X400มล',
    '65546798':'คนอร์ซุปก้อนรสหมู (VOS) P6X24X20ก',
    '65632110':'ลักส์ สบู่ก้อนซอฟท์ชมพู 24X4X105ก',
    '69735628':'โอโมลิควิดซากุระโรแมนซ์ 12X3X120มล',
    '65591936':'บรีสเอกเซล 3X3950 กรัม'}};
  ORDERS={dates:[a.D],names:{},cat:{
    '64345616':'Home_Care','65546798':'Best_F1','65632110':'PC_Skin',
    '69735628':'Home_Care','65591936':'Home_Care'},catN:{},
    data:{[a.D]:{rounds:{main:{}},dropped:null,hasResult:false}}};
  POSTATUS={dates:[],data:{}};
  /* คำขอจริง 4 สาย — บางรหัสหลายสายขอซ้ำ บางรหัสมีสายเดียวขอ */
  REQUESTS={data:{
    [a.D]:{
      '209611':{by:'สมชาย',at:1,items:{'64345616':{cs:10,pc:0},'69735628':{cs:5,pc:0}}},
      '209613':{by:'ปฐมภพ',at:2,items:{'65546798':{cs:5,pc:0}}},
      '209616':{by:'เอกรัตน์',at:3,items:{'64345616':{cs:150,pc:0}}},
      '209699':{by:'กัญญสิริ',at:4,items:{'69735628':{cs:40,pc:2},'65591936':{cs:115,pc:0}}}
    },
    [a.D2]:{'209698':{by:'ศิริพร',at:5,items:{'65632110':{cs:3,pc:0}}}}
  }};
  ORD.date=a.D;ORD.sec='req';ORD.rqOff={};ORD.rqDay=null;
}
const read=()=>{
  const el=document.getElementById('salesRequests');
  const rows=[...el.querySelectorAll('.req-combined table tbody tr')].filter(tr=>!tr.classList.contains('grp-row'))
    .map(tr=>{const td=[...tr.children].map(x=>x.innerText.replace(/\s+/g,' ').trim());
      return {code:td[0],qty:td[2],lines:td[7]};});
  return {
    chips:[...el.querySelectorAll('.rq-chip')].map(c=>({
      txt:c.innerText.replace(/\s+/g,' ').trim(),off:c.classList.contains('off')})),
    rows:rows,
    codes:rows.map(r=>r.code),
    head:(el.querySelector('h3')||{}).innerText||'',
    sub:(el.querySelector('.req-combined h4')||{}).innerText||'',
    note:(el.querySelector('.rq-note')||{}).innerText||'',
    cards:[...el.querySelectorAll('.req-perwrap .req-sales h4')].map(h=>h.innerText.replace(/\s+/g,' ').trim())
  };
};

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const pg=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.setContent(fs.readFileSync(PAGE,'utf8'),{waitUntil:'domcontentloaded'});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);
 await ev(setup,{D,D2});
 const snap=new Function('return '+BLOBS);
 const before=await ev(snap);

 /* ---------- 1) ชิปครบ เรียงถูก ---------- */
 const base=await ev(a=>{renderSalesRequests();return (0,eval)('('+a.read+')')();},{read:read.toString()});
 t('มีชิปครบทุกสายที่ส่งคำขอวันนั้น',base.chips.length===4,base.chips.length+' ชิป');
 t('...เรียงตามลำดับสายของบริษัท (CT11 · CT13 · CT16 · KA99)',
   base.chips.map(c=>c.txt.split(' ')[1]).join(' ')==='CT11 CT13 CT16 KA99',
   base.chips.map(c=>c.txt).join(' | '));
 t('...บอกชื่อเซลล์และจำนวนรายการบนชิป',
   /สมชาย · 2/.test(base.chips[0].txt)&&/กัญญสิริ · 2/.test(base.chips[3].txt),base.chips[0].txt);
 t('เริ่มต้นเลือกครบทุกสาย ไม่มีชิปไหนถูกปิด',base.chips.every(c=>!c.off),'ok');
 t('ตารางรวมมี 4 รหัส (รวมทุกสาย)',base.codes.length===4,base.codes.join(','));
 t('รหัสที่ 2 สายขอซ้ำ ยอดถูกบวกรวมกัน (10+150=160)',
   (base.rows.find(r=>r.code==='64345616')||{}).qty==='160 / 0',
   JSON.stringify(base.rows.find(r=>r.code==='64345616')));
 t('...และป้ายสายขึ้นทั้งสองสาย',
   /CT11/.test((base.rows.find(r=>r.code==='64345616')||{}).lines||'')&&
   /CT16/.test((base.rows.find(r=>r.code==='64345616')||{}).lines||''),
   (base.rows.find(r=>r.code==='64345616')||{}).lines);
 t('ยังไม่กรอง = ไม่ขึ้นป้ายเตือน',!base.note,base.note);
 t('...และหัวตารางยังเขียนว่า "รวมทั้งหมด"',/รวมทั้งหมด/.test(base.sub),base.sub);

 /* ---------- 2) กดชิปเอาสายออก ---------- */
 const off=await ev(a=>{
   [...document.querySelectorAll('.rq-chip')][2].click();      /* เอา CT16 ออก */
   return (0,eval)('('+a.read+')')();},{read:read.toString()});
 t('กดชิป = เอาสายนั้นออก (ชิปขึ้นสถานะปิด)',
   off.chips[2].off&&!off.chips[0].off,off.chips.map(c=>(c.off?'✗':'✓')+c.txt.split(' ')[1]).join(' '));
 t('🔧 ยอดรวมคิดจากเฉพาะสายที่เลือก (160 → 10 เมื่อเอา CT16 ออก)',
   (off.rows.find(r=>r.code==='64345616')||{}).qty==='10 / 0',
   JSON.stringify(off.rows.find(r=>r.code==='64345616')));
 t('...ป้ายสายเหลือเฉพาะสายที่เลือก',
   !/CT16/.test((off.rows.find(r=>r.code==='64345616')||{}).lines||''),
   (off.rows.find(r=>r.code==='64345616')||{}).lines);
 t('...ตารางรายเซลล์ด้านล่างหายตามไปด้วย (ไม่ต้องเลื่อนไปดู)',
   off.cards.length===3&&!off.cards.some(c=>/CT16/.test(c)),off.cards.join(' | '));
 t('⚠️ ขึ้นป้ายเตือนว่ากำลังกรอง ไม่ใช่ยอดรวมทุกสาย',
   /กำลังกรอง/.test(off.note)&&/ไม่ใช่ยอดรวมทุกสาย/.test(off.note),off.note.slice(0,120));
 t('...หัวเรื่องบอกว่าเลือกกี่จากกี่สาย',/เลือก 3 จาก 4 สาย/.test(off.head),off.head);
 t('...หัวตารางเปลี่ยนเป็น "รวมเฉพาะสายที่เลือก"',/รวมเฉพาะสายที่เลือก \(3 สาย\)/.test(off.sub),off.sub);

 /* ---------- 3) กดซ้ำ = เอากลับเข้ามา ---------- */
 const back=await ev(a=>{[...document.querySelectorAll('.rq-chip')][2].click();
   return (0,eval)('('+a.read+')')();},{read:read.toString()});
 t('กดชิปเดิมซ้ำ = เอาสายกลับเข้ามา ยอดกลับเป็น 160',
   !back.chips[2].off&&(back.rows.find(r=>r.code==='64345616')||{}).qty==='160 / 0',
   JSON.stringify(back.rows.find(r=>r.code==='64345616')));

 /* ---------- 4) ปุ่ม "เฉพาะ" ---------- */
 const only=await ev(a=>{
   [...document.querySelectorAll('.rq-chip')][3].querySelector('.only').click();   /* เฉพาะ KA99 */
   return (0,eval)('('+a.read+')')();},{read:read.toString()});
 t('กด "เฉพาะ" = เหลือสายเดียว',only.chips.filter(c=>!c.off).length===1&&!only.chips[3].off,
   only.chips.map(c=>(c.off?'✗':'✓')+c.txt.split(' ')[1]).join(' '));
 t('...ตารางเหลือเฉพาะสินค้าที่สายนั้นขอ',
   only.codes.slice().sort().join(',')==='65591936,69735628',only.codes.join(','));
 t('...ยอดเป็นของสายนั้นล้วน ๆ (KA99 ขอ 40/2)',
   (only.rows.find(r=>r.code==='69735628')||{}).qty==='40 / 2',
   JSON.stringify(only.rows.find(r=>r.code==='69735628')));
 t('...สินค้าที่มีแต่สายอื่นขอ หายไปจากตาราง',only.codes.indexOf('65546798')<0,only.codes.join(','));
 t('...เหลือการ์ดรายเซลล์ใบเดียว',only.cards.length===1&&/KA99/.test(only.cards[0]),only.cards.join(' | '));

 /* ---------- 5) ปุ่มทุกสาย ---------- */
 const allb=await ev(a=>{document.querySelector('.rq-all').click();
   return (0,eval)('('+a.read+')')();},{read:read.toString()});
 t('ปุ่ม "ทุกสาย" ดึงกลับมาครบทุกสาย',
   allb.chips.every(c=>!c.off)&&allb.codes.length===4&&!allb.note,
   allb.codes.join(',')+' | '+allb.chips.filter(c=>c.off).length+' ปิด');

 /* ---------- 6) ไม่เลือกสายไหนเลย ---------- */
 const none=await ev(a=>{
   [0,1,2,3].forEach(()=>{const c=document.querySelector('.rq-chip:not(.off)');if(c)c.click();});
   const el=document.getElementById('salesRequests');
   return {chips:document.querySelectorAll('.rq-chip').length,
     off:document.querySelectorAll('.rq-chip.off').length,
     msg:el.innerText.replace(/\s+/g,' '),
     tbl:el.querySelectorAll('.req-combined table').length};},{read:read.toString()});
 t('เอาออกหมดทุกสาย = บอกให้กดเลือก ไม่ใช่จอว่าง และชิปยังอยู่ให้กดกลับ',
   none.chips===4&&none.off===4&&/ยังไม่ได้เลือกสายไหนเลย/.test(none.msg)&&none.tbl===0,
   none.msg.slice(0,110));
 t('...และบอกชัดว่าคำขอไม่ได้ถูกลบ แค่ซ่อนจากการดู',/ไม่ได้ถูกลบ/.test(none.msg),'ok');

 /* ---------- 7) เปลี่ยนวัน = ล้างตัวกรอง ---------- */
 const nextDay=await ev(a=>{ORD.date=a.D2;renderSalesRequests();
   const r=(0,eval)('('+a.read+')')();
   return {chips:r.chips,codes:r.codes,off:r.chips.filter(c=>c.off).length};},{read:read.toString(),D2});
 t('🔧 เปลี่ยนวันแล้วตัวกรองล้างเอง (ไม่งั้นนึกว่าคำขอหาย)',
   nextDay.off===0&&nextDay.chips.length===1&&nextDay.codes.length===1,
   nextDay.chips.map(c=>c.txt).join(' | ')+' · ปิด '+nextDay.off);
 const backDay=await ev(a=>{ORD.date=a.D;renderSalesRequests();
   return (0,eval)('('+a.read+')')();},{read:read.toString(),D});
 t('...กลับมาวันเดิมก็เห็นครบทุกสายเหมือนเดิม',
   backDay.codes.length===4&&backDay.chips.every(c=>!c.off),backDay.codes.join(','));

 /* ---------- 8) 🛟 ข้อมูลต้องไม่ขยับ ---------- */
 await ev(a=>{
   /* กดทุกปุ่มที่หน้านี้มี วนหลายรอบ */
   for(let i=0;i<4;i++){
     const chips=[...document.querySelectorAll('.rq-chip')];
     if(chips[i])chips[i].click();
     const o=document.querySelector('.rq-chip .only');if(o)o.click();
     const all=document.querySelector('.rq-all');if(all)all.click();
   }
   rqOnly('209611');rqTog('209611');rqAll();renderSalesRequests();
 },{});
 const after=await ev(snap);
 let moved='';
 if(after!==before){const x=JSON.parse(before),y=JSON.parse(after);
   moved=Object.keys(x).filter(k=>JSON.stringify(x[k])!==JSON.stringify(y[k])).join(', ')||'(ไม่รู้ก้อนไหน)';}
 t('🛟 กดกรองทุกแบบแล้ว ข้อมูลทุกก้อนเหมือนเดิมเป๊ะทุกไบต์ (คำขอเซลล์ไม่ถูกแตะ)',after===before,moved);
 t('🛟 ไม่มีการยิงอะไรขึ้นเซิร์ฟเวอร์ และไม่สั่ง sync เลย',
   await ev(()=>window.__posts.length===0&&window.__sync===0),
   await ev(()=>window.__posts.join(',')+' sync='+window.__sync));
 t('🛟 ตัวกรองอยู่บน ORD (ไม่ถูก sync) ไม่ได้อยู่ใน REQUESTS',
   await ev(()=>typeof ORD.rqOff==='object'&&!('rqOff' in REQUESTS)),'ok');

 const real=errs.filter(e=>!/localStorage|SecurityError/.test(e));
 t('ไม่มี JavaScript error ตลอดเทสต์',real.length===0,real.join(' | '));

 await b.close();
 let fail=0;
 A.forEach(([ok,n,x])=>{if(!ok)fail++;console.log((ok?'  ok  ':'  FAIL')+'  '+n+(x?'   ['+x+']':''));});
 console.log('\n'+A.length+' checks · '+(A.length-fail)+' passed · '+fail+' failed');
 console.log(fail?'SOME FAILED':'ALL PASS ('+A.length+' checks)');
 process.exit(fail?1:0);
})();
