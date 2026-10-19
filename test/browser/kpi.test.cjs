/* 🎯 KPI eB2B & Self Ordering — ตัวอ่านไฟล์ Incentive
 *
 * ⛔ บั๊กที่เทสต์นี้เกิดมาเพื่อกัน (เจอ 19 ต.ค. 69)
 * โค้ดเดิมเขียนเลขคอลัมน์ตายตัว `ghost:+r[16]` แต่ช่อง 16 (Q) คือ "%Ghost order"
 * ที่เก็บเป็นสัดส่วน (0.1125) ไม่ใช่ "จำนวน Ghost ออเดอร์" ที่อยู่ช่อง 15 (P) = 9 บิล
 * แล้วเอาไปหารจำนวนออเดอร์อีกรอบ → 0.14% แทน 11.25% ทุกสายเลยขึ้นเกือบ 0% และ "ผ่าน" หมด
 * เจ้าของจับได้เองเพราะเปิดไฟล์ดูแล้วเห็นว่ามี Ghost จริง
 *
 * ต้องพิสูจน์:
 *   1) หาคอลัมน์จาก "หัวตาราง" ได้ถูก แม้คอลัมน์จะเลื่อน
 *   2) หัวตารางหาย/เปลี่ยนชื่อ → โยน error ไม่เดา ไม่บันทึกอะไร
 *   3) ถ้าอ่านไปโดนช่อง %Ghost (บั๊กเดิม) → ตัวทานกับไฟล์ต้องจับได้และโยน error
 *   4) ข้อมูลรอบเก่าที่เก็บเป็นสัดส่วนไว้แล้ว ต้องกลับมาถูกตอนอ่าน โดยไม่แตะของที่เก็บไว้
 *   5) เพดาน Ghost = 10% ตามที่ไฟล์เขียนไว้เอง ไม่ใช่ 15%
 *   6) กรองเฉพาะศูนย์ 2096 สาย CT (ไฟล์มี 50 ศูนย์ และมีสาย TL/KA ที่ต้องตัดทิ้ง)
 *
 * ชุดข้อมูลทดสอบสร้างเองในเทสต์ จึงรันได้เสมอ และถ้าวางไฟล์จริงของเจ้าของไว้ที่
 * fixtures/Salesman_Incentive_DTT_OCT_as_of_19_Oct26.xlsx จะตรวจตัวเลขจริงเพิ่มให้อีกชุด
 * (ไฟล์จริงไม่ได้อยู่ใน repo โดยตั้งใจ — ดูหมายเหตุใน price.test.cjs)
 *
 * ต้องติดตั้งก่อน:  npm i --no-save playwright-core xlsx
 * แล้วรัน:  node build.cjs && node test/browser/kpi.test.cjs
 */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const XLSX=require('xlsx');
const BROWSER=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');
const REAL=path.join(__dirname,'fixtures','Salesman_Incentive_DTT_OCT_as_of_19_Oct26.xlsx');

/* ---------- สร้างไฟล์ทดสอบที่มีโครงหัวตารางเหมือนของจริง ----------
   opt.shift = แทรกคอลัมน์ว่างไว้ข้างหน้า (จำลองว่า Unilever ขยับคอลัมน์)
   opt.rename = เปลี่ยนชื่อหัวคอลัมน์ Ghost (จำลองว่าเปลี่ยนชื่อ)
   opt.swap  = สลับค่าในช่องจำนวนกับช่อง % (จำลองบั๊กเดิมที่อ่านผิดช่อง)  */
function book(opt){
  opt=opt||{};
  const pad=new Array(opt.shift||0).fill(null);
  const r0=pad.concat(['รหัสศูนย์','ชื่อศูนย์','สายวิ่ง','รหัสสายวิ่ง',
    'ร้านค้าใน PJP (Active outlet in PJP) ไม่นับร้าน New channel','ROUTE',
    'Active สั่งออนไลน์ (Active on PJP) ',null,null,null,null,
    'Self-ordering (UShopPlus)',null,null,null,
    'Ghost order (UShopPlus) แบบ waive KA TL ',null,
    'Incentive Salesman (THB) ผ่าน/ไม่ผ่าน']);
  const r1=pad.concat([null,null,null,null,null,null,
    'Target 40%','Target 50%','Target 60%','ทำมาแล้ว','บรรลุเป้าหมาย',
    'จำนวนออเดอร์ จากแอปทั้งหมด (Ghost + Self + Assisted) ',
    'จำนวนออเดอร์ Self-ordering',
    'จำนวนออเดอร์ Self-ordering ทีต้องทำเพิ่ม',
    '%NEW Self-ordering (Target 40%) ',
    opt.rename?'จำนวนออร์เดอร์ผี':'จำนวน Ghost ออเดอร์ ',
    '%Ghost order (Target < =10%) ',null]);
  /* [สาย, ROUTE, ร้าน PJP, active, ออเดอร์, self, ghost] — ตัวเลขชุดเดียวกับไฟล์จริงของเจ้าของ */
  const LINES=[
    ['209611','CT',259,75,77,35,0],
    ['209612','CT',258,82,88,36,1],
    ['209613','CT',275,77,93,33,5],
    ['209614','CT',260,66,80,32,9],
    ['209615','CT',254,88,89,33,7],
    ['209616','CT',244,74,79,14,10],
    ['209617','CT',252,70,80,26,2],
    ['209619','TL',441,5,9,4,5],     /* สาย TL ต้องถูกตัดทิ้ง */
    ['209622','CT',267,77,74,22,0],
  ];
  const rows=[r0,r1];
  /* ศูนย์อื่นที่ต้องไม่ถูกนับ */
  rows.push(pad.concat(['2003','ศูนย์อื่น','200320','CT_X',11,'CT',5,6,7,3,0.27,10,4,0,0.4,2,0.2,'NO']));
  LINES.forEach(L=>{
    const [code,route,stores,active,orders,self,ghost]=L;
    const gp=orders?ghost/orders:0;
    rows.push(pad.concat(['2096','บริษัท บีดี ดิสทริบิวชั่น จำกัด',code,route+'_HPC_'+code.slice(-3),
      stores,route,Math.round(stores*0.4),Math.round(stores*0.5),Math.round(stores*0.6),
      active,stores?active/stores:0,
      orders,self,0,orders?self/orders:0,
      opt.swap?gp:ghost, opt.swap?ghost:gp, 'NO']));
  });
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'ByRoute');
  return XLSX.write(wb,{type:'array',bookType:'xlsx'});
}
const WANT=[['CT11',77,0,0],['CT12',88,1,1.14],['CT13',93,5,5.38],['CT14',80,9,11.25],
  ['CT15',89,7,7.87],['CT16',79,10,12.66],['CT17',80,2,2.5],['CT22',74,0,0]];

const BLOBS=`JSON.stringify({DATA,STORE,ORDERS,STOCKD,REQUESTS,MASTER,ANALYTICS,STOREPROD,
  STOREDAILY,PSTORE,EB2B,POSTATUS,LEADS,DCI,MINSTOCK,PLAN,PROMO,PJP})`;   /* ทุกก้อน ยกเว้น KPI ที่อัพไฟล์แล้วต้องเปลี่ยน */

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const pg=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.setContent(fs.readFileSync(PAGE,'utf8'),{waitUntil:'domcontentloaded'});
 await pg.addScriptTag({path:require.resolve('xlsx/dist/xlsx.full.min.js')});
 await pg.evaluate(()=>{
   document.getElementById('login').classList.add('hidden');
   document.getElementById('app').classList.remove('hidden');
   window.Chart=function(){return{destroy(){}}};
   window.__log=[];window.ulog=m=>window.__log.push(String(m).replace(/<[^>]*>/g,''));
   window.fetch=()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({ok:true})});
   TOKEN='t';S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
   ['209611','209612','209613','209614','209615','209616','209617','209622']
     .forEach((c,i)=>{FOCUS_MAP[c]='CT'+c.slice(-2);});
 });
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);
 const before=await ev(new Function('return '+BLOBS));

 const load=async(buf,nm)=>ev(a=>{
   window.__log.length=0;
   try{parseKPI(a.nm,new Uint8Array(a.buf).buffer);
     const mk=KPIS.month;                      /* parseKPI ตั้ง KPIS.month เป็นรอบที่เพิ่งอ่านให้แล้ว */
     return {ok:true,key:mk,rows:kpiRows().map(r=>[r.disp,r.orders,r.ghost,+r.ghostPct.toFixed(2)]),
       log:window.__log.slice()};
   }catch(e){return {ok:false,err:String(e.message||e)};}
 },{buf:[...Buffer.from(buf)],nm:nm});

 /* ---------- 1) อ่านไฟล์ปกติ ---------- */
 const ok=await load(book(),'Salesman_Incentive_DTT_OCT_as_of_19_Oct26.xlsx');
 t('อ่านไฟล์ Incentive ได้',ok.ok,ok.err||ok.key);
 t('⛔ จำนวน Ghost ต้องเป็น "จำนวนบิล" ไม่ใช่สัดส่วน — ตรงทุกสาย',
   ok.ok&&JSON.stringify(ok.rows)===JSON.stringify(WANT),JSON.stringify(ok.rows));
 t('...CT14 ได้ 9 บิล = 11.25% (เดิมบั๊กให้ 0.14%)',
   ok.ok&&ok.rows[3][2]===9&&ok.rows[3][3]===11.25,ok.ok?JSON.stringify(ok.rows[3]):'-');
 t('...CT16 ได้ 10 บิล = 12.66%',ok.ok&&ok.rows[5][2]===10&&ok.rows[5][3]===12.66,
   ok.ok?JSON.stringify(ok.rows[5]):'-');
 t('ตัดสาย TL ทิ้ง และไม่เอาศูนย์อื่น (เหลือ 8 สาย CT ของ 2096)',ok.ok&&ok.rows.length===8,
   ok.ok?ok.rows.length:'-');
 t('ไม่มีสายไหน Ghost เป็นเศษทศนิยม (จำนวนบิลต้องเป็นจำนวนเต็ม)',
   ok.ok&&ok.rows.every(r=>Number.isInteger(r[2])),ok.ok?ok.rows.map(r=>r[2]).join(','):'-');

 /* ---------- 2) คอลัมน์เลื่อน ---------- */
 const sh=await load(book({shift:3}),'Salesman_Incentive_DTT_OCT_as_of_19_Oct26.xlsx');
 t('⚠️ Unilever แทรกคอลัมน์เพิ่ม 3 ช่อง — ยังอ่านถูกเพราะหาจากหัวตาราง ไม่ใช่เลขคอลัมน์',
   sh.ok&&JSON.stringify(sh.rows)===JSON.stringify(WANT),sh.ok?JSON.stringify(sh.rows[3]):sh.err);

 /* ---------- 3) หัวตารางเปลี่ยนชื่อ → ต้องฟ้อง ไม่ใช่เดา ---------- */
 const rn=await load(book({rename:true}),'Salesman_Incentive_DTT_OCT_as_of_19_Oct26.xlsx');
 t('⚠️ หัวคอลัมน์ Ghost เปลี่ยนชื่อ → โยน error ไม่เดาเอา',!rn.ok,rn.ok?'ดันอ่านผ่าน!':rn.err);
 t('...ข้อความบอกว่าหาคอลัมน์ไหนไม่เจอ และบอกว่ายังไม่บันทึกอะไร',
   !rn.ok&&/จำนวน Ghost/.test(rn.err)&&/ยังไม่บันทึก/.test(rn.err),rn.err);

 /* ---------- 4) อ่านไปโดนช่อง % (บั๊กเดิม) → ตัวทานต้องจับได้ ---------- */
 const sw=await load(book({swap:true}),'Salesman_Incentive_DTT_OCT_as_of_19_Oct26.xlsx');
 t('⛔ ถ้าค่าในช่องจำนวนกับช่อง % สลับกัน (อาการของบั๊กเดิม) ต้องโยน error',
   !sw.ok,sw.ok?'ดันอ่านผ่าน! '+JSON.stringify(sw.rows[3]):sw.err);
 t('...และบอกว่าทานกับช่อง %Ghost ในไฟล์แล้วไม่ตรง',
   !sw.ok&&/%Ghost/.test(sw.err),sw.err);

 /* ---------- 5) เพดาน 10% ---------- */
 await load(book(),'Salesman_Incentive_DTT_OCT_as_of_19_Oct26.xlsx');
 const th=await ev(()=>{
   const rows=kpiRows();
   const over=rows.filter(r=>r.ghostPct>KPI_GHOST_MAX).map(r=>r.disp+' '+r.ghostPct.toFixed(2)+'%');
   return {max:KPI_GHOST_MAX,over:over,
     cfgPass10:KPICFG.ghost.pass(10),cfgPass11:KPICFG.ghost.pass(11),
     tiers:KPICFG.ghost.tiers,desc:KPICFG.ghost.desc};
 });
 t('เพดาน Ghost = 10% ตามที่ไฟล์เขียนไว้เอง ไม่ใช่ 15%',th.max===10,th.max);
 t('...10% ผ่าน · 11% ไม่ผ่าน',th.cfgPass10&&!th.cfgPass11,'pass(10)='+th.cfgPass10+' pass(11)='+th.cfgPass11);
 t('...คำอธิบายบนจอบอกเลขเดียวกัน ไม่ขัดกันเอง',/10%/.test(th.desc)&&th.tiers[0]===10,th.desc);
 t('⚠️ ด้วยเกณฑ์จริง มี 2 สายที่เกินเพดาน (เดิมขึ้นว่าผ่านหมด)',th.over.length===2,th.over.join(' · '));

 /* ---------- 6) ซ่อมรอบเก่าตอนอ่าน โดยไม่แตะของที่เก็บไว้ ---------- */
 const old=await ev(()=>{
   /* จำลองรอบที่อัพไว้ตอนโค้ดยังบั๊ก: ghost เก็บเป็นสัดส่วน */
   KPI.data['2026-09-30']={'209614':{stores:260,active:66,orders:80,self:32,ghost:0.1125},
                           '209616':{stores:244,active:74,orders:79,self:14,ghost:10}};
   if(!KPI.months.includes('2026-09-30'))KPI.months.push('2026-09-30');
   const before=JSON.stringify(KPI.data['2026-09-30']);
   KPIS.month='2026-09-30';                    /* kpiRows() อ่านเดือนจาก KPIS.month ไม่รับพารามิเตอร์ */
   const rows=kpiRows();
   return {rows:rows.map(r=>[r.disp,r.ghost,+r.ghostPct.toFixed(2)]),
     stored:JSON.stringify(KPI.data['2026-09-30']),same:before===JSON.stringify(KPI.data['2026-09-30'])};
 });
 t('รอบเก่าที่เก็บเป็นสัดส่วน (0.1125) อ่านกลับมาได้ 9 บิล = 11.25% โดยไม่ต้องอัพไฟล์ซ้ำ',
   JSON.stringify(old.rows[0])===JSON.stringify(['CT14',9,11.25]),JSON.stringify(old.rows[0]));
 t('...ค่าที่เป็นจำนวนเต็มอยู่แล้ว ต้องไม่ถูกแตะ',
   JSON.stringify(old.rows[1])===JSON.stringify(['CT16',10,12.66]),JSON.stringify(old.rows[1]));
 t('🛟 ...และ **ไม่เขียนทับข้อมูลที่เก็บไว้** (ซ่อมตอนอ่านอย่างเดียว)',old.same,old.stored);

 /* ---------- 7) ความปลอดภัยของข้อมูล ---------- */
 const after=await ev(new Function('return '+BLOBS));
 let moved='';
 if(after!==before){const a1=JSON.parse(before),b1=JSON.parse(after);
   moved=Object.keys(a1).filter(k=>JSON.stringify(a1[k])!==JSON.stringify(b1[k])).join(', ');}
 t('🛟 อัพไฟล์ KPI แล้วก้อนข้อมูลอื่นทุกก้อนไม่ขยับเลย (ยอดขาย/สั่งของ/สต็อก/PJP…)',
   after===before,moved);
 t('🛟 ไฟล์ที่อ่านไม่ผ่าน ต้องไม่ทิ้งรอบขยะไว้ใน KPI',
   await ev(()=>Object.keys(KPI.data).every(k=>Object.keys(KPI.data[k]).length>0)),
   await ev(()=>Object.keys(KPI.data).join(', ')));

 /* ---------- 8) ไฟล์จริงของเจ้าของ (ถ้ามี) ---------- */
 if(fs.existsSync(REAL)){
   const rr=await load(fs.readFileSync(REAL),'Salesman_Incentive_DTT_OCT_as_of_19_Oct26.xlsx');
   t('ไฟล์จริงของเจ้าของ: อ่านได้',rr.ok,rr.err||rr.key);
   t('ไฟล์จริงของเจ้าของ: ตัวเลข Ghost ตรงทุกสาย',
     rr.ok&&JSON.stringify(rr.rows)===JSON.stringify(WANT),rr.ok?JSON.stringify(rr.rows):rr.err);
 }else{
   console.log('  (ข้าม) ไม่มีไฟล์จริงของเจ้าของใน fixtures — ตรวจด้วยชุดข้อมูลที่สร้างเองแทน');
 }

 t('ไม่มี JavaScript error',errs.filter(e=>!/localStorage/.test(e)).length===0,
   errs.filter(e=>!/localStorage/.test(e)).join(' | '));

 await b.close();
 let fail=0;
 A.forEach(([o,n,x])=>{if(!o)fail++;console.log((o?'  ok  ':'  FAIL')+'  '+n+(x?'   ['+x+']':''));});
 console.log('\n'+A.length+' checks · '+(A.length-fail)+' passed · '+fail+' failed');
 console.log(fail?'SOME FAILED':'ALL PASS ('+A.length+' checks)');
 process.exit(fail?1:0);
})();
