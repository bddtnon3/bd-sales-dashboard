/* 🚫 ขอแล้วสั่งไม่ได้ — คำขอของเซลล์ที่ติด "ของขาด (คาดเทา)" / "ยังไม่เปิดให้สั่ง"
   เจ้าของแจ้ง 7 พ.ย. 69: *"วันไหนที่มีเซลล์คีย์ขอสินค้าเข้ามา แต่มันคาดสีเทา ระบบแจ้งเตือนว่า
   สั่งไม่ได้ แต่พอถัดมาอีกวัน มันสั่งได้แล้ว ผมเลยหลุดเคสแบบนี้บ่อย ... ให้เอากลับมาให้ดู
   วันต่อไปเหมือนรายการดรอปด้วย"*
   เทสต์ครอบ: เก็บเฉพาะเหตุผลที่กลับมาสั่งได้ · ไล่เช็คกับใบสั่งรอบล่าสุด · ตามว่าสั่ง/ได้ของหรือยัง
   · ช่วงวัน · สิทธิ์ · และ "ห้ามเขียนทับข้อมูลเดิม"
   ต้องติดตั้งก่อน:  npm i --no-save playwright-core     แล้วรัน:  node test/browser/reqback.test.cjs */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');
const BROWSER=require('./_chrome.cjs').chromePath();
(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const pg=await (await b.newContext({viewport:{width:1280,height:950}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.setContent(fs.readFileSync(PAGE,'utf8'),{waitUntil:'domcontentloaded'});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=f=>pg.evaluate(f);

 /* ---------------- ข้อมูลจำลอง ----------------
    ใบสั่ง (สี) 2 รอบ:  5 ต.ค. และ 8 ต.ค. (รอบล่าสุดที่ใช้ตอบว่า "รอบนี้สั่งได้ไหม")
      50000001 เทา(ของขาด) ตอน 5 ต.ค. → 8 ต.ค. เปิดแล้ว       → ✅ รอบนี้สั่งได้แล้ว
      50000002 ฟ้า(ยังไม่เปิด) ทั้งสองรอบ                        → ⏳ ยังสั่งไม่ได้
      50000003 เปิดปกติ                                          → ไม่ต้องขึ้นในลิสต์เลย
      50000004 ไม่มีในใบรอบ 7 ต.ค.                                → notin → ขึ้นลิสต์
      50000006 ชมพู(เลิกขายถาวร)                                 → ไม่ต้องรอ แยกไปบอกต่างหาก
      50000007 เทาตอนขอ แต่ศูนย์สั่งแล้วได้ของ 6 ต.ค.            → ได้ของแล้ว (ซ่อนไว้)
      50000008 เทาตอนขอ ศูนย์สั่ง 8 ต.ค. ยังไม่มีผล              → 🕓 สั่งไปแล้ว รอผล (ยังต้องเห็น)
    คำขอวัน 2026-10-20 ไม่มีใบสั่งรอบไหนใกล้เลย                  → unknown → ห้ามเดาว่าสั่งไม่ได้
 */
 await pg.evaluate(`
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};
  window.syncToServer=()=>{window.__synced=(window.__synced||0)+1};
  window.ulog=()=>{};window.confirm=()=>true;
  window.fetch=()=>Promise.resolve({ok:true,json:()=>Promise.resolve({})});
  S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
  DATA.lines={'2096_97':{display:'KA97'},'209611':{display:'CT11'}};
  DATA.focus_order=['2096_97','209611'];
  MASTER={items:{}};ANALYTICS={months:[],lines:{},data:{}};MINSTOCK={man:{}};
  PLAN={items:{},done:{},del:{}};PROMO={items:{},res:{},del:{}};
  STOCKD={date:'2026-10-08',up:1,names:{},rows:[]};
  const NM={'50000001':'คอมฟอร์ท สีฟ้า 500 มล.','50000002':'ซันไลต์ มะนาว 800 มล.',
            '50000003':'บรีส เอกเซล 1200 มล.','50000004':'โดฟ สบู่ก้อน 100 ก.',
            '50000006':'พอนด์ แป้ง 50 ก.','50000007':'วิม ครีม 500 ก.','50000008':'คนอร์ ซุปก้อน 40 ก.'};
  ORDERS={dates:[],data:{},names:Object.assign({},NM),
    cat:{'50000001':'Home_Care','50000002':'Home_Care','50000003':'Home_Care',
         '50000004':'PC_3D','50000006':'Skin_Care1','50000007':'Home_Care','50000008':'Food'},catN:{}};
  const mk=(d,rounds,dropped,hasResult)=>{ORDERS.data[d]={rounds:{main:rounds},dropped:dropped||null,
    hasResult:!!hasResult,vals:{}};ORDERS.dates.push(d);};
  mk('2026-10-05',{'50000003':4},null,true);
  mk('2026-10-06',{'50000007':6},{},true);      /* 50000007 สั่งแล้วได้ครบ */
  mk('2026-10-08',{'50000008':3},null,false);   /* 50000008 สั่งแล้ว ยังไม่มีผล */
  ORDERS.dates.sort();
  const ALL='50000001,50000002,50000003,50000006,50000007,50000008';
  POSTATUS={dates:['2026-10-05','2026-10-08'],data:{
    '2026-10-05':{up:1,file:'BD_051026.xlsx',allSeq:1,all:ALL,
      items:{'50000001':{s:1},'50000002':{x:'00FFFF'},'50000006':{x:'FF00FF'},
             '50000007':{s:1},'50000008':{s:1}}},
    '2026-10-08':{up:2,file:'BD_081026.xlsx',allSeq:1,all:ALL,
      items:{'50000002':{x:'00FFFF'},'50000006':{x:'FF00FF'}}}}};
  REQUESTS={data:{
    '2026-10-05':{'2096_97':{by:'เกษชญานิษฐ์',items:{
        '50000001':{cs:5,pc:0},'50000002':{cs:2,pc:0},'50000003':{cs:9,pc:0},
        '50000006':{cs:1,pc:0},'50000007':{cs:6,pc:0},'50000008':{cs:3,pc:0}}}},
    '2026-10-06':{'209611':{by:'ชลศิต',items:{'50000001':{cs:4,pc:12}}}},
    '2026-10-07':{'209611':{by:'ชลศิต',items:{'50000004':{cs:7,pc:0}}}},
    '2026-10-20':{'209611':{by:'ชลศิต',items:{'50000003':{cs:2,pc:0}}}}}};
  initOrder();ORD.date='2026-10-08';ORD.rbWin=7;ORD.rbGot=false;
  PO_SEQ=null;pgBust();
  _switchTab('order');ordSetSec('req');renderOrder();
 `);

 const snap=()=>ev(()=>JSON.stringify({O:ORDERS,P:POSTATUS,S:STOCKD,R:REQUESTS}));
 const before=await snap();

 /* ---------- 1) เก็บอะไรเข้าลิสต์บ้าง ---------- */
 const scan=await ev(()=>{const s=rbScan('2026-10-08',7);
   const m={by:{},days:s.days,dead:s.dead.map(x=>x.code)};s.rows.forEach(r=>m.by[r.code]=r);return m;});
 const codes=Object.keys(scan.by).sort();
 t('เก็บเฉพาะคำขอที่ "สั่งไม่ได้" — ตัวที่ใบสั่งเปิดปกติต้องไม่ขึ้นเลย',
   !scan.by['50000003'],codes.join(','));
 t('ของขาด (คาดเทา) · ยังไม่เปิดให้สั่ง (ฟ้า) · ไม่มีในใบ ขึ้นครบทั้ง 3 แบบ',
   codes.join(',')==='50000001,50000002,50000004,50000007,50000008',codes.join(','));
 t('⛔ เลิกขายถาวร (ชมพู) ไม่เอาเข้าลิสต์รอ แต่แยกไปบอกว่าไม่ต้องรอ',
   !scan.by['50000006']&&scan.dead.join(',')==='50000006',scan.dead.join(','));
 t('บอกได้ว่ามีคำขอที่สั่งไม่ได้ของวันไหนบ้าง',
   scan.days.join(',')==='2026-10-05,2026-10-06,2026-10-07',scan.days.join(','));
 const R1=scan.by['50000001']||{};
 t('รวมคำขอรหัสเดียวกันจากหลายสาย/หลายวันเป็นแถวเดียว และนับจำนวนครั้ง',
   R1.n===2&&R1.cs===9&&R1.pc===12&&Object.keys(R1.lines).length===2,JSON.stringify(R1.lines||{}));
 t('...จำวันที่ขอล่าสุดไว้ (ใช้เป็นจุดเริ่มไล่ว่าสั่งหรือยัง)',R1.last==='2026-10-06',R1.last);
 t('...จำเหตุผลตอนที่ขอไว้ว่าเป็น "ของขาด" ไม่ใช่สถานะวันนี้',R1.lastWhy==='oos',R1.lastWhy);

 /* ---------- 2) คำถามหลัก: รอบนี้เปิดให้สั่งแล้วหรือยัง ---------- */
 const act=await ev(()=>{
   const fd=poRoundFor('2026-10-08'),fday=fd?psDay(fd):null;
   const out={fd:fd,by:{}};
   ['50000001','50000002','50000004'].forEach(c=>{const b=dbBlock(fday,c);out.by[c]=b?b.k:'open';});
   return out;});
 t('เช็คกับใบสั่ง "รอบล่าสุด" ไม่ใช่ใบของวันที่เซลล์ขอ',act.fd==='2026-10-08',act.fd);
 t('🔑 ของที่เคยคาดเทา แล้วรอบนี้เปิดแล้ว → บอกว่าสั่งได้ (นี่คือเคสที่เจ้าของหลุดบ่อย)',
   act.by['50000001']==='open',JSON.stringify(act.by));
 t('...ตัวที่ยังปิดอยู่ ต้องยังบอกว่าสั่งไม่ได้',act.by['50000002']==='closed',act.by['50000002']);

 /* ---------- 3) ตามต่อว่าสั่งไปแล้ว/ได้ของแล้วหรือยัง ---------- */
 t('ขอแล้วศูนย์สั่งให้และได้ของแล้ว → นับว่าจบ',(scan.by['50000007']||{}).st==='got',
   JSON.stringify((scan.by['50000007']||{}).chase||{}));
 t('🔑 ขอแล้วศูนย์สั่งวันเดียวกับที่ยังไม่มีผล → "สั่งไปแล้ว รอผล" ไม่ใช่ "ยังไม่ได้สั่ง"',
   (scan.by['50000008']||{}).st==='wait',JSON.stringify((scan.by['50000008']||{}).chase||{}));
 t('ตัวที่ยังไม่มีใครสั่งเลย ต้องเป็นสถานะค้างจริง',(scan.by['50000001']||{}).st==='none',
   (scan.by['50000001']||{}).st);

 /* ---------- 4) วันที่ยังไม่มีใบสั่งรอบไหนเลย = ห้ามเดา ---------- */
 const unk=await ev(()=>{const s=rbScan('2026-10-20',7);
   return {n:s.rows.length,why:poWhy('2026-10-20','50000003').why};});
 t('🛟 คำขอของวันที่ยังไม่ได้อัพใบสั่ง ห้ามเดาว่า "สั่งไม่ได้" (ไม่เข้าลิสต์)',
   unk.n===0&&unk.why==='unknown',unk.n+' แถว · why='+unk.why);

 /* ---------- 5) หน้าจอ ---------- */
 const ui=await ev(()=>{const el=document.getElementById('reqBack');
   return {show:el.style.display!=='none',html:el.innerHTML,
     rows:[...el.querySelectorAll('tbody tr')].length,
     txt:el.textContent.replace(/\\s+/g,' ')};});
 t('กล่องขึ้นในแท็บคำขอสินค้า ใต้ลิสต์ Drop ค้าง',ui.show&&/ขอแล้วสั่งไม่ได้/.test(ui.txt));
 t('มีแถบเขียวสรุปตัวที่ "รอบนี้สั่งได้แล้ว" ไว้บนสุด จะได้ไม่ต้องไล่หาในตาราง',
   /รอบนี้สั่งได้แล้ว 1 รายการ/.test(ui.txt)&&/50000001/.test(ui.txt));
 t('...ตารางบอกชื่อเซลล์ที่ขอ และจำนวนที่ขอ',
   /เกษชญานิษฐ์/.test(ui.txt)&&/ชลศิต/.test(ui.txt),ui.txt.slice(0,0)||'');
 t('...ตัวที่ได้ของแล้วถูกซ่อนไว้ แต่ตัวที่สั่งแล้วรอผลยังเห็นอยู่ (กันสั่งซ้ำ)',
   !/50000007/.test(ui.txt)&&/50000008/.test(ui.txt)&&/รอผล/.test(ui.txt));
 t('...แบ่งหมวดตามใบสั่งซื้อเหมือนตารางอื่นในหน้านี้',/grp-row/.test(ui.html));
 const got=await ev(()=>{rbSetGot(true);
   const x=document.getElementById('reqBack').textContent.replace(/\s+/g,' ');
   rbSetGot(false);return x;});
 t('ติ๊ก "แสดงตัวที่สั่ง/ได้ของแล้วด้วย" แล้วตัวที่จบไปแล้วกลับมาแสดง',/50000007/.test(got));
 const win=await ev(()=>{rbSetWin(3);
   const n=rbScan(ORD.date,3).rows.length;rbSetWin(7);return n;});
 t('เลือกช่วงวันได้ (3 วันย้อนหลังเห็นน้อยกว่า 1 อาทิตย์)',win===2,win+' แถวใน 3 วัน');

 /* ---------- 6) สิทธิ์ ---------- */
 const sales=await ev(()=>{const u=S.user;
   S.user={id:'ct11',role:'sales',code:'209611',name:'CT11'};
   renderOrder();
   const el=document.getElementById('reqBack');
   const o={show:el.style.display!=='none',html:el.innerHTML.length};
   S.user=u;renderOrder();return o;});
 t('เซลล์ไม่เห็นกล่องนี้ (เป็นงานของคนสั่งของ) และไม่มีเนื้อหาค้างไว้',
   !sales.show&&sales.html===0,JSON.stringify(sales));

 /* ---------- 7) ห้ามเขียนทับข้อมูลเดิม ---------- */
 await ev(()=>{
   [1,3,7,14,30,99].forEach(n=>{rbScan('2026-10-08',n);rbScan('2026-10-05',n);});
   RB_WINS.forEach(w=>rbSetWin(w.d));rbSetGot(true);rbSetGot(false);rbSetWin(7);
   renderReqBack();renderOrder();renderReqBack();
 });
 const after=await snap();
 t('⚠️ ORDERS / POSTATUS / STOCKD / REQUESTS ไม่เปลี่ยนแม้ไบต์เดียว',before===after,
   before===after?'':'ก่อน '+before.length+' ไบต์ · หลัง '+after.length+' ไบต์');
 const nosync=await ev(()=>window.__synced||0);
 t('ไม่มีการสั่ง sync ขึ้นเซิร์ฟเวอร์จากกล่องนี้เลย',nosync===0,nosync);
 const notsynced=await ev(()=>{
   if(typeof _doSync!=='function')return true;
   return !/[{,]\s*ORD\s*[,}]/.test(String(_doSync));});
 t('ตัวเลือกช่วงวัน (ORD) ไม่ถูกส่งขึ้นเซิร์ฟเวอร์',notsynced);

 /* ---------- 8) ไม่ไปกวนลิสต์ Drop ค้าง ---------- */
 const db=await ev(()=>({db:document.getElementById('dropBack').style.display!=='none',
   rb:document.getElementById('reqBack').style.display!=='none'}));
 t('ลิสต์ Drop ค้าง กับลิสต์นี้ อยู่คู่กันทั้งคู่ (คนละต้นทาง ห้ามยุบรวม)',db.db&&db.rb,JSON.stringify(db));

 let bad=0;A.forEach(([c,n,x])=>{if(!c)bad++;console.log((c?'  ✓ ':'  ✗ FAIL: ')+n+(x&&!c?' → '+x:''));});
 const real=errs.filter(e=>!/localStorage/.test(e));
 if(real.length){console.log('PAGE ERRORS:');real.forEach(e=>console.log('   '+e));bad+=real.length;}
 await b.close();
 console.log('\n'+(bad?bad+' FAILED of '+A.length:'ALL PASS ('+A.length+' checks)'));
 process.exit(bad?1:0);
})();
