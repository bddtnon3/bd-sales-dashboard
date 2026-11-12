/* 📊 ประวัติการสั่งของ — ตารางรายวันทั้งเดือน 1st sale / 2nd sale (เจ้าของสั่ง 12 พ.ย. 69)
   จับคู่ข้อมูลตามที่เจ้าของระบุเอง:
     1st Order        = CON Confirm × 0.85
     1st Order − Drop = (CON Confirm × 0.85) − Drop Value
     2nd              = ยอดขายรายวันรวมทุกสาย
   ⛔ ตัวเลขในเทสต์นี้ **สมมติขึ้นเอง** ไม่ใช่ยอดจริงของศูนย์ — รีโปนี้เป็นสาธารณะ
   ต้องติดตั้งก่อน:  npm i --no-save playwright-core     แล้วรัน:  node test/browser/ordhist.test.cjs */
const fs=require('fs');const path=require('path');const os=require('os');
const {chromium}=require('playwright-core');
const XLSX=require('xlsx');
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');
const BROWSER=require('./_chrome.cjs').chromePath();
(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:1280,height:1000},acceptDownloads:true});
 const pg=await ctx.newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.setContent(fs.readFileSync(PAGE,'utf8'),{waitUntil:'domcontentloaded'});
 /* หน้าเว็บโหลด SheetJS จาก CDN ซึ่งในเทสต์ไม่มีเน็ต — ใส่ให้เองเหมือนชุดอื่น */
 await pg.addScriptTag({path:require.resolve('xlsx/dist/xlsx.full.min.js')});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);

 /* ---------------- ข้อมูลจำลอง (ตัวเลขกลม ๆ คิดในใจได้) ----------------
    2 พ.ย. cv 1,000,000 → −15% = 850,000 · Drop 50,000 → 800,000 · ขายออก 900,000
    3 พ.ย. cv   400,000 → −15% = 340,000 · Drop      0 → 340,000 · ขายออก 120,000
    4 พ.ย. ไม่มีใบสั่งเลย                                        · ขายออก       0  (เปิดบิลแล้วยอด 0)
    5 พ.ย. cv   200,000 → −15% = 170,000 · Drop 20,000 → 150,000 · ไม่มีไฟล์ยอดขาย
    ต.ค. มีข้อมูลเดือนก่อนไว้ทดสอบปุ่ม ◀ ▶
 */
 await pg.evaluate(`
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};
  window.__sync=0;window.syncToServer=()=>{window.__sync++};
  window.ulog=()=>{};window.confirm=()=>true;
  window.fetch=()=>Promise.resolve({ok:true,json:()=>Promise.resolve({})});
  S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
  DATA.lines={'2096_97':{display:'KA97'},'209611':{display:'CT11'}};
  DATA.focus_order=['2096_97','209611'];DATA.targets={};DATA.monthly={};DATA.daily={};
  STORE={months:[],stores:[]};KPI={};ANALYTICS={months:[],lines:{},data:{}};
  MASTER={items:{}};MINSTOCK={man:{}};PLAN={items:{},done:{},del:{}};
  PROMO={items:{},res:{},del:{}};REQUESTS={data:{}};
  STOCKD={date:null,up:1,names:{},rows:[]};
  ORDERS={dates:[],data:{},names:{},cat:{},catN:{}};
  const mk=(d,cv,drop)=>{ORDERS.dates.push(d);
    ORDERS.data[d]={rounds:{main:{}},dropped:{},hasResult:true,
      vals:{main:{ov:0,cv:cv}},dropVal:drop};};
  mk('2026-11-02',1000000,50000);
  mk('2026-11-03',400000,0);
  mk('2026-11-05',200000,20000);
  mk('2026-10-30',100000,0);
  ORDERS.dates.sort();
  DATA.daily['2026-11-02']={'2096_97':400000,'209611':500000};
  DATA.daily['2026-11-03']={'2096_97':120000,'209611':0};
  DATA.daily['2026-11-04']={'2096_97':0,'209611':0};
  DATA.daily['2026-10-30']={'2096_97':70000,'209611':30000};
  initOrder();ORD.hm='';
  _switchTab('order');ordSetSec('hist');
 `);

 const snap=()=>ev(()=>JSON.stringify({O:ORDERS,D:DATA.daily}));
 const before=await snap();

 /* ---------- 1) สูตรที่เจ้าของระบุมา ---------- */
 const calc=await ev(()=>({
   v2:ohVal('2026-11-02'),v3:ohVal('2026-11-03'),v4:ohVal('2026-11-04'),
   s2:ohSale('2026-11-02'),s4:ohSale('2026-11-04'),s5:ohSale('2026-11-05'),
   months:ohMonths(),n:ohRows('2026-11').length,nFeb:ohRows('2026-02').length}));
 t('1st Order = CON Confirm × 0.85 (1,000,000 → 850,000)',
   calc.v2&&calc.v2.c85===850000,JSON.stringify(calc.v2));
 t('1st Order − Drop = ค่าข้างบน ลบ Drop Value (850,000 − 50,000)',
   calc.v2&&calc.v2.drop===50000&&calc.v2.net===800000,calc.v2&&calc.v2.net);
 t('...วันที่ไม่มี Drop ก็เท่ากับ Order เฉย ๆ',calc.v3&&calc.v3.net===340000,calc.v3&&calc.v3.net);
 t('🛟 วันที่ไม่มีใบสั่งเลย ต้องเป็น "ไม่มีข้อมูล" ไม่ใช่ 0 บาท',calc.v4===null);
 t('2nd = ยอดขายรายวันรวมทุกสาย (400,000 + 500,000)',calc.s2===900000,calc.s2);
 t('🛟 เปิดบิลแล้วยอด 0 เป็นข้อมูลจริง ต้องไม่กลายเป็น "ไม่มีข้อมูล"',calc.s4===0,String(calc.s4));
 t('🛟 วันที่ยังไม่ได้อัพไฟล์ยอดขาย = ไม่มีข้อมูล',calc.s5===null);
 t('เดือนที่มีข้อมูลมาจากทั้งใบสั่งและไฟล์ยอดขาย',
   calc.months.join(',')==='2026-10,2026-11',calc.months.join(','));
 t('ตารางมีครบทุกวันของเดือน (พ.ย. 30 วัน · ก.พ. 69 = 28 วัน)',
   calc.n===30&&calc.nFeb===28,calc.n+' / '+calc.nFeb);

 /* ---------- 2) ยอดรวมทั้งเดือน ---------- */
 const sum=await ev(()=>ohSum(ohRows('2026-11')));
 t('รวมทั้งเดือนถูกต้อง (850+340+170 = 1,360,000)',sum.c85===1360000,sum.c85);
 t('...หัก Drop รวม 70,000 เหลือ 1,290,000',sum.drop===70000&&sum.net===1290000,
   sum.drop+' / '+sum.net);
 t('...2nd รวม 1,020,000 จาก 3 วันที่เปิดบิล',sum.sale===1020000&&sum.nSale===3,
   sum.sale+' / '+sum.nSale+' วัน');

 /* ---------- 3) หน้าจอ ---------- */
 const ui=await ev(()=>{const el=document.getElementById('ohBody');
   const tb=el.querySelector('.oh-tbl');
   const body=[...tb.querySelectorAll('tbody tr')];
   const cells=r=>[...r.querySelectorAll('td')].map(td=>td.textContent.trim());
   return {open:!document.getElementById('ordSecHist').classList.contains('hidden'),
     tab:!!document.querySelector('#ordSubTabs button[data-k="hist"]'),
     rows:body.length,r2:cells(body[1]),r4:cells(body[3]),
     sun:body.filter(r=>r.classList.contains('sun')).length,
     foot:[...tb.querySelectorAll('tfoot td')].map(td=>td.textContent.trim()),
     head:[...tb.querySelectorAll('thead th')].map(th=>th.textContent.trim()).join(' | '),
     cards:el.querySelector('.cards').textContent.replace(/\s+/g,' ')};});
 t('มีแท็บย่อย "ประวัติการสั่งของ" และเปิดอยู่',ui.open&&ui.tab);
 t('ตารางขึ้นครบ 30 แถว และมีวันอาทิตย์ 5 วันทำสีไว้',ui.rows===30&&ui.sun===5,
   ui.rows+' แถว · อาทิตย์ '+ui.sun);
 t('หัวตารางแยก 1st / 2nd ชัดเจน',
   /1st/.test(ui.head)&&/2nd/.test(ui.head)&&/CON −15%/.test(ui.head),ui.head.slice(0,90));
 t('แถววันที่ 2 พ.ย. โชว์ตัวเลขครบทั้ง 4 ช่อง',
   ui.r2[2]==='850,000.00'&&ui.r2[3]==='50,000.00'&&ui.r2[4]==='800,000.00'&&ui.r2[5]==='900,000.00',
   ui.r2.join(' | '));
 t('แถววันที่ไม่มีใบสั่ง แต่เปิดบิลแล้วยอด 0 → 1st เป็นขีด · 2nd เป็น 0.00',
   ui.r4[2]==='-'&&ui.r4[4]==='-'&&ui.r4[5]==='0.00',ui.r4.join(' | '));
 t('มีแถวรวมทั้งเดือนท้ายตาราง',
   /รวมทั้งเดือน/.test(ui.foot[0])&&ui.foot[3]==='1,290,000.00'&&ui.foot[4]==='1,020,000.00',
   ui.foot.join(' | '));
 t('การ์ดสรุปบอกยอดรวมและวันทำงานที่ผ่านมา',
   /1st/.test(ui.cards)&&/2nd/.test(ui.cards)&&/1,360,000.00/.test(ui.cards),ui.cards.slice(0,80));

 /* ---------- 4) เลือกเดือน ◀ ▶ ---------- */
 const mon=await ev(()=>{const sel=document.getElementById('ohSel');
   const o={rev:sel.dataset.rev,opts:[...sel.options].map(x=>x.value).join(',')};
   selStep('ohSel',-1);o.back=ORD.hm;                /* ◀ = เดือนที่เก่ากว่าเสมอ */
   o.rows=[...document.querySelectorAll('#ohBody .oh-tbl tbody tr')].length;
   selStep('ohSel',1);o.fwd=ORD.hm;return o;});
 t('ตัวเลือกเดือนเรียงใหม่→เก่า และติดธง data-rev ให้ ◀ แปลว่าเก่ากว่า',
   mon.rev==='1'&&mon.opts==='2026-11,2026-10',mon.opts);
 t('◀ ไปเดือน ต.ค. (31 วัน) แล้ว ▶ กลับมา พ.ย.',
   mon.back==='2026-10'&&mon.rows===31&&mon.fwd==='2026-11',
   mon.back+' ('+mon.rows+' วัน) → '+mon.fwd);

 /* ---------- 5) ทุกคนดูได้ (เจ้าของสั่ง "ให้เข้าดูได้ทุกคน") ---------- */
 const sales=await ev(()=>{const u=S.user;
   S.user={id:'ct11',role:'sales',code:'209611',name:'CT11'};
   renderTabs();_switchTab('order');ordSetSec('hist');
   const o={open:!document.getElementById('ordSecHist').classList.contains('hidden'),
     tab:!!document.querySelector('#ordSubTabs button[data-k="hist"]'),
     txt:/รวมทั้งเดือน/.test(document.getElementById('ohBody').textContent)};
   S.user=u;renderTabs();_switchTab('order');ordSetSec('hist');return o;});
 t('ทีมขายเปิดดูหน้านี้ได้เหมือนกัน',sales.open&&sales.tab&&sales.txt,JSON.stringify(sales));

 /* ---------- 6) ⬇️ Excel ---------- */
 const [dl]=await Promise.all([pg.waitForEvent('download'),ev(()=>ohXlsx())]);
 const out=path.join(os.tmpdir(),'bd-ordhist.xlsx');
 await dl.saveAs(out);
 const wb=XLSX.readFile(out);
 const aoa=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
 const totRow=aoa.find(r=>r[0]==='รวมทั้งเดือน')||[];
 t('ดึงเป็น Excel ได้ และมีครบทุกวัน + แถวรวม',
   /ประวัติการสั่งของ/.test(wb.SheetNames[0])&&aoa.length===36,
   wb.SheetNames.join(',')+' · '+aoa.length+' แถว');
 t('...ตัวเลขในไฟล์ตรงกับหน้าจอ',
   totRow[2]===1360000&&totRow[4]===1290000&&totRow[5]===1020000,JSON.stringify(totRow));
 t('...มีหมายเหตุบอกว่า 1st เป็นประมาณการ ไม่ใช่ยอดจากใบแจ้งหนี้',
   aoa.some(r=>/ประมาณการ/.test(String(r[1]||''))));

 /* ---------- 7) อ่านอย่างเดียว ---------- */
 await ev(()=>{
   ohMonths();ohRows('2026-11');ohRows('2026-02');ohSum(ohRows('2026-11'));
   ohSetMon('2026-10');ohSetMon('2026-11');
   selStep('ohSel',-1);selStep('ohSel',1);
   renderOrdHist();renderOrder();renderOrdHist();});
 const after=await snap();
 t('⚠️ ORDERS / ยอดขายรายวัน ไม่เปลี่ยนแม้ไบต์เดียว',before===after,
   before===after?'':'ก่อน '+before.length+' · หลัง '+after.length);
 const sync=await ev(()=>window.__sync||0);
 t('ไม่มีการบันทึกขึ้นเซิร์ฟเวอร์จากหน้านี้เลย',sync===0,sync);
 const notsynced=await ev(()=>{
   if(typeof _doSync!=='function')return true;
   return !/[{,]\s*ORD\s*[,}]/.test(String(_doSync));});
 t('เดือนที่เลือก (ORD.hm) ไม่ถูกส่งขึ้นเซิร์ฟเวอร์',notsynced);

 let bad=0;A.forEach(([c,n,x])=>{if(!c)bad++;console.log((c?'  ✓ ':'  ✗ FAIL: ')+n+(x&&!c?' → '+x:''));});
 const real=errs.filter(e=>!/localStorage/.test(e));
 if(real.length){console.log('PAGE ERRORS:');real.forEach(e=>console.log('   '+e));bad+=real.length;}
 await b.close();
 console.log('\n'+(bad?bad+' FAILED of '+A.length:'ALL PASS ('+A.length+' checks)'));
 process.exit(bad?1:0);
})();
