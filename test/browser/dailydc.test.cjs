/* 📅 ไฟล์ยอดขายรายวันของระบบใหม่ "dcode" (Sales_<ช่วงวัน>.xlsx · ชีท Export) — 17 พ.ย. 69
   *"ต่อไปคือไฟล์ยอดขายรายวันของ dcode ระบบใหม่ ช่วยอ่านแล้วเทียบกับไฟล์เดิม
     จับข้อมูลให้ตรงกันให้มากที่สุด แล้วปรับระบบให้รองรับไฟล์ใหม่ได้เลย"*
   เทสต์ครอบ: อ่านลงช่องเดิมทุกช่อง · ยอดเงินใช้ NIV ไม่ใช่ GSV/Total · วันที่ใช้ใบแจ้งหนี้ ·
   209697 ต้องกลายเป็นสาย 2096_97 (KA97) ของเดิม · ไฟล์เดียวหลายวันแยกถูก ·
   แถว "Applied filters" ท้ายไฟล์ไม่ใช่ข้อมูล · ทับเฉพาะสาย/ร้านที่มีในไฟล์ (ของเดิมไม่หาย) ·
   หัวตารางหาย = ฟ้องแล้วไม่เก็บ · **ไฟล์เดิมต้องยังอ่านได้เหมือนเดิม**
   ⛔ ตัวเลขในเทสต์สมมติขึ้นเอง — รีโปเป็นสาธารณะ ห้าม commit ยอดขายจริงของศูนย์
   ไฟล์จริงตรวจเพิ่มได้ด้วย  DCODE_DAILY=/path/Sales_....xlsx node test/browser/dailydc.test.cjs
   ต้องติดตั้งก่อน:  npm i --no-save playwright-core */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const XLSX=require('xlsx');
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');
const BROWSER=require('./_chrome.cjs').chromePath();

/* หัวตารางของจริงจากไฟล์ dcode (49 คอลัมน์ · เรียงตามไฟล์ · ตัดคอลัมน์ DYP ที่ไม่ใช้ออกไม่ได้
   เพราะตัวอ่านหาคอลัมน์จาก "ชื่ออังกฤษในวงเล็บท้ายหัว" ต้องเทสต์กับหัวจริงทั้งแถว) */
const H=['รหัสศูนย์จัดจําหน่าย (Distributor Code)','ชื่อศูนย์จัดจําหน่าย (Distributor Name)',
 'วันที่สร้างใบสั่งซื้อ (Sales Order Creation Date)','เดือน (Calendar Month)','รหัส (PJP Code)',
 'คําอธิบาย (PJP Description)','รหัสพนักงานขาย (Salesman Code)','ชื่อพนักงานขาย (Salesman Name)',
 'ประเภทเอกสาร (Document Type)','ประเภทคําสั่งซื้อ (Order Type)','หมายเลขใบแจ้งหนี้ (Invoice Number)',
 'หมายเลขคําสั่งซื้อ (Order Number)','หมายเลขใบแจ้งหนี้ (Reference Invoice Number)',
 'วันที่ออกใบแจ้งหนี้ (Invoice Date)','รหัสร้าน (Outlet Code)','ชื่อร้าน (Outlet Name)',
 'รหัสผู้รับสินค้าปลายทาง (Outlet) (Outlet Ship To Party Code)','ชื่อผู้รับสินค้า (Outlet) (Outlet Ship To Party Name)',
 'หมายเลขอ้างอิง (Reference Number)','ประเภทร้านค้าย่อย (Outlet SubType)','คําอธิบาย (Outlet SubType Description)',
 'คําอธิบายหมวดหมู่ (Category Description)','รายละเอียดตลาด (Market Description)',
 'รายละเอียดแบรนด์ (Brand Description)','คําอธิบายภาค (Sector Description)','ประเภทของผลิตภัณฑ์ (Type Of Product)',
 'คําอธิบายแบรนด์ย่อย (Sub-Brand Description)','ซีพีจี (CPG)','มาสเตอร์เบสแพ็ค (Master Basepack)',
 'คําอธิบาย (Basepack Description)','รหัสสินค้า (Product Code)','ชื่อผลิตภัณฑ์ (Product Name)',
 'ขนาดแพ็ค (Pack Size)','ปริมาณการขาย (หีบ) (Sale Quantity in Aggr(CS))',
 'ปริมาณการขาย (ชิ้น) (Sale Quantity in Aggr(Pcs))','ปริมาณของแถม (หีบ) (Free Quantity in Aggr.CS)',
 'ปริมาณของแถม (ชิ้น) (Free Quantity in Aggr.PC)',' จีเอสวี (GSV)','ทีพีอาร์ (TPR)',
 'ส่วนลดโปรโมชั่น (Line Discount)','ส่วนลดซื้อครบ (Basket)','คูปองกลุ่มสินค้า (Coupon Discount 2.0)',
 'ส่วนลดพิเศษเฉพาะร้านค้า (Customer Discount)','ส่วนลดพิเศษท้ายบิล (Volume Discount)',
 'คูปองส่วนลด 1.0 (Coupon Discount 1.0)','คูปองสมาชิกยูพอยท์ (Loyalty Discount)','เอ็นไอวี (NIV)',
 'ภาษีมูลค่าเพิ่ม (VAT)','ยอดขายรวมภาษี (Total Amount)'];
const C={create:2,pjp:4,desc:5,emp:6,rep:7,doc:8,ord:9,inv:13,shop:14,shopN:15,
         prod:30,prodN:31,cs:33,pc:34,gsv:37,tpr:38,niv:46,vat:47,tot:48};
const SER=ymd=>Math.round((Date.UTC(+ymd.slice(0,4),+ymd.slice(5,7)-1,+ymd.slice(8,10))-Date.UTC(1899,11,30))/86400000);
function dcRow(o){
  const r=new Array(49).fill(0);
  r[0]='15389839';r[1]='บริษัท บีดี ดิสทริบิวชั่น จำกัด';r[3]='11.2026';
  r[C.create]=SER(o.create||o.d);r[C.inv]=SER(o.d);
  r[C.pjp]=o.pjp;r[C.desc]='CT_HPC_2'+String(o.pjp).slice(-2);
  r[C.emp]=o.emp||'00016951';r[C.rep]=o.rep||'ชลศิต 0971104393';
  r[C.doc]=o.doc||'Sales';r[C.ord]=o.ord||'Mobility (MOB)';
  r[10]='BDD09'+String(o.pjp);r[11]='BDD01'+String(o.pjp);r[12]='NA';
  r[C.shop]=o.shop;r[C.shopN]=o.shopN||'ร้านทดสอบ';
  r[18]=o.ref||'';                   /* หมายเลขอ้างอิง = เลขคำสั่งซื้อที่เซลล์เห็นในแอพ */
  r[C.prod]=o.prod||'64391612';r[C.prodN]=o.prodN||'บรีสน้ำอัลตร้า เขียว';
  r[32]=288;r[C.cs]=o.cs||0;r[C.pc]=o.pc||0;
  /* GSV และ Total ตั้งให้ "ผิดจาก NIV คนละตัว" เพื่อจับว่าตัวอ่านหยิบช่อง NIV จริง ๆ */
  r[C.gsv]=(o.niv||0)+1000;r[C.tpr]=-1000;r[C.niv]=o.niv||0;
  r[C.vat]=Math.round((o.niv||0)*0.07*100)/100;r[C.tot]=Math.round((o.niv||0)*1.07*100)/100;
  return r;
}
const FOOT=(()=>{const r=new Array(49).fill('');
  r[0]='Applied filters:\r\nRef_InvoiceDate is on or after 16/11/2026 and is before 18/11/2026\r\nDistributorCode is 15389839';
  return r;})();
function mkDc(rows,head,foot){
  const w=XLSX.utils.book_new();
  const aoa=[head||H].concat(rows);if(foot!==false)aoa.push(FOOT);
  XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet(aoa),'Export');
  return Buffer.from(XLSX.write(w,{bookType:'xlsx',type:'array'})).toString('base64');
}
/* ไฟล์รายวันแบบเดิม — ตำแหน่งคอลัมน์ตามที่ parseDaily เดิมอ่าน
   0 สาย · 1 รหัสพนักงาน · 2 ชื่อพนักงาน · 4 รหัสร้าน · 5 ชื่อร้าน · 7 วันที่ · 10 ลัง · 11 ชิ้น · 15 เงิน */
function oldRow(o){
  const r=new Array(16).fill('');
  r[0]=o.pjp;r[1]=o.emp||'00016951';r[2]=o.rep||'ชลศิต 0971104393';
  r[4]=o.shop;r[5]=o.shopN||'ร้านเดิม';r[7]=SER(o.d);
  r[10]=o.cs||0;r[11]=o.pc||0;r[15]=o.niv||0;return r;
}
function mkOld(rows){
  const w=XLSX.utils.book_new();
  const head=['สาย','รหัสพนักงาน','ชื่อพนักงาน','','รหัสร้าน','ชื่อร้าน','','วันที่','','','ลัง','ชิ้น','','','','ยอดเงิน'];
  XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet([head].concat(rows)),'Sheet1');
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

 const RESET=`
  window.__log=[];window.__sync=0;
  /* ตั้งต้นเหมือนเครื่องจริง: 12 สายหลักมีอยู่แล้ว (ชื่อ/รหัสพนักงานยังว่าง)
     ⚠️ DATA.focus_order ถูกเติมอัตโนมัติจาก FOCUS_ORDER ทุกครั้งที่ render
     ถ้าล้าง DATA.lines ให้ว่างเปล่า aggregate() จะพังเพราะหาสายใน focus_order ไม่เจอ */
  DATA.lines={};DATA.focus_order=[];
  Object.keys(FOCUS_MAP).forEach(c=>{DATA.lines[c]={display:FOCUS_MAP[c],
    type:FOCUS_MAP[c].indexOf('KA')===0?'KA':'CT',focus:true,name:'',emp:''};});
  DATA.daily={};DATA.targets={};
  DATA.monthly={'2026-11':{}};   /* ต้องมีคีย์เดือนอย่างน้อย 1 เดือน render() จึงทำงาน */
  STOREDAILY={data:{}};STORE={months:[],stores:[]};
 `;
 await pg.evaluate(`
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};
  window.ulog=m=>window.__log.push(String(m).replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' '));
  window.syncToServer=()=>{window.__sync++};
  window.fetch=()=>Promise.resolve({ok:true,json:()=>Promise.resolve({})});
  S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
  window.__reset=()=>{${RESET}};
  window.__reset();
 `);
 const load=(n,b64)=>ev(a=>{parseDaily(a.n,Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   return {log:window.__log.slice(),sync:window.__sync};},{n:n,b64:b64});

 /* ---------- 1) อ่านไฟล์ระบบใหม่ ---------- */
 const rows1=[
   dcRow({pjp:'209611',d:'2026-11-16',shop:'4862383',shopN:'พี่เทียร',cs:0.5,pc:12,niv:100,ref:'1034715426'}),
   dcRow({pjp:'209611',d:'2026-11-16',shop:'4862383',shopN:'พี่เทียร',cs:0.25,pc:6,niv:50.55,prod:'65456730'}),
   dcRow({pjp:'209611',d:'2026-11-16',shop:'4862365',shopN:'แม่จุก',cs:1,pc:12,niv:200,ord:'Business to Business (B2B)'}),
   dcRow({pjp:'209612',d:'2026-11-16',shop:'4862435',shopN:'ธนอนันต์',cs:2,pc:24,niv:300,
          emp:'00016952',rep:'การัณยภาส 0972384393'}),
   /* 209697 = KA97 ซึ่งระบบเดิมเก็บคีย์เป็น 2096_97 */
   dcRow({pjp:'209697',d:'2026-11-16',shop:'2491757',shopN:'กิจโชติ',cs:3,pc:36,niv:400,
          emp:'00022812',rep:'เกษชญานิษฐ์ 0971054393'}),
   /* วันที่ 2: บิลที่ "สร้าง" วันที่ 16 แต่ออกใบแจ้งหนี้วันที่ 17 ต้องลงวันที่ 17 */
   dcRow({pjp:'209699',d:'2026-11-17',create:'2026-11-16',shop:'4862510',shopN:'เหรียญทอง',cs:4,pc:48,niv:500,
          emp:'00016957',rep:'กัญญสิริ 0958964393'}),
 ];
 const r1=await load('Sales_16-17112026.xlsx',mkDc(rows1));
 const g1=await ev(()=>({days:Object.keys(DATA.daily).sort(),
   d16:DATA.daily['2026-11-16'],d17:DATA.daily['2026-11-17'],
   sd16:STOREDAILY.data['2026-11-16'],sd17:STOREDAILY.data['2026-11-17'],
   lines:Object.keys(DATA.lines).sort(),
   ka97:DATA.lines['2096_97']||null,ct12:DATA.lines['209612']||null}));
 t('อ่านไฟล์ dcode แล้วแยกเป็น 2 วันตามใบแจ้งหนี้',
   g1.days.join(',')==='2026-11-16,2026-11-17',g1.days.join(','));
 /* 🧾 เลขคำสั่งซื้อที่เซลล์/ร้านเห็นในแอพ — คนละช่องกับ "หมายเลขใบแจ้งหนี้ (Reference
    Invoice Number)" ซึ่งอยู่ในไฟล์เดียวกันและชื่อใกล้กันมาก ถ้าจับผิดช่องจะได้ NA */
 const g1r=await ev(()=>{const ix=STOREDAILY.ord||{};
   const k=Object.keys(ix).filter(x=>ix[x].rf);
   return {n:k.length,rf:k.map(x=>ix[x].rf).sort(),
     zero:Object.keys(ix).filter(x=>ix[x].rf==='0'||ix[x].rf==='NA').length};});
 t('🔑 เก็บเลขคำสั่งซื้อจากแอพไว้กับออเดอร์ (ช่องหมายเลขอ้างอิง)',
   g1r.rf.join(',')==='1034715426,1034715426',JSON.stringify(g1r.rf));
 t('🛟 ช่องว่าง / 0 / NA ไม่ใช่เลข ต้องไม่ถูกเก็บ (ช่องข้างกันคือ Reference Invoice Number)',
   g1r.zero===0,g1r.zero);
 /* 3 บรรทัดของสาย CT11 = 100 + 50.55 + 200 = 350.55
    ไฟล์ทดสอบตั้ง GSV ไว้สูงกว่า NIV บรรทัดละ 1000 และ Total = NIV x 1.07
    ถ้าตัวอ่านหยิบผิดช่องจะได้ 3350.55 (GSV) หรือ 375.09 (รวมภาษี) */
 t('🔑 ยอดเงินใช้ช่อง NIV (ไม่ใช่ GSV และไม่ใช่ยอดรวมภาษี)',
   g1.d16&&g1.d16['209611']===350.55,JSON.stringify(g1.d16));
 t('รวมยอดต่อสายต่อวันถูกทุกสาย',
   g1.d16&&g1.d16['209612']===300&&g1.d16['2096_97']===400&&g1.d17&&g1.d17['209699']===500,
   JSON.stringify(g1.d16)+' | '+JSON.stringify(g1.d17));
 t('🔑 สาย 209697 ของไฟล์ใหม่ = สาย 2096_97 (KA97) ของเดิม ไม่ใช่สายใหม่',
   !!(g1.d16&&g1.d16['2096_97'])&&!(g1.d16&&g1.d16['209697'])&&g1.lines.indexOf('209697')<0,
   g1.lines.join(' '));
 t('...และขึ้นชื่อสาย KA97 ถูก',g1.ka97&&g1.ka97.display==='KA97',JSON.stringify(g1.ka97));
 t('...บันทึกการอัพบอกไว้ว่าแปลงรหัสสายให้',
   /209697 → 2096_97/.test(r1.log.join(' ')),r1.log.find(x=>/209697/.test(x))||'');
 t('🔑 วันที่ใช้ "วันที่ออกใบแจ้งหนี้" ไม่ใช่วันที่สร้างใบสั่งซื้อ',
   g1.d17&&g1.d17['209699']===500&&!(g1.d16&&g1.d16['209699']),
   JSON.stringify(g1.d16&&g1.d16['209699'])+' / '+JSON.stringify(g1.d17&&g1.d17['209699']));
 t('ยอดรายร้าน (ลัง/ชิ้น/เงิน) รวมหลายบรรทัดของร้านเดียวกันถูก',
   g1.sd16&&g1.sd16['4862383']&&g1.sd16['4862383'].cs===0.8&&g1.sd16['4862383'].pc===18&&
   g1.sd16['4862383'].niv===150.55,JSON.stringify(g1.sd16&&g1.sd16['4862383']));
 t('ยอดรายร้านเก็บชื่อร้านและสายของร้านไว้ด้วย',
   g1.sd16&&g1.sd16['4862383'].n==='พี่เทียร'&&g1.sd16['4862383'].l==='209611',
   JSON.stringify(g1.sd16&&g1.sd16['4862383']));
 t('จำนวนร้านต่อวันถูก (4 ร้านวันที่ 16 · 1 ร้านวันที่ 17)',
   g1.sd16&&Object.keys(g1.sd16).length===4&&g1.sd17&&Object.keys(g1.sd17).length===1,
   Object.keys(g1.sd16||{}).length+' / '+Object.keys(g1.sd17||{}).length);
 t('🛟 แถว "Applied filters" ท้ายไฟล์ไม่ถูกนับเป็นข้อมูล',
   !(g1.d16&&g1.d16['']) && !/Applied/.test(JSON.stringify(g1.lines)) &&
   /603|อ่าน 6 บรรทัด/.test(r1.log[1]||''),r1.log[1]);
 t('...แต่เอาเงื่อนไขที่กรองมาไปแสดงในบันทึกการอัพ',
   /Ref_InvoiceDate is on or after/.test(r1.log.join(' ')));
 t('รหัสพนักงานขายเก็บลงสายให้ (ใช้จับคู่ PJP ในหน้า DCODE)',
   g1.ka97&&g1.ka97.emp==='00022812',g1.ka97&&g1.ka97.emp);
 t('แยกช่องทางสั่ง MOB / B2B ให้ดูในบันทึกการอัพ',
   /Mobility/.test(r1.log.join(' '))&&/Business to Business/.test(r1.log.join(' ')));
 t('อัพแล้วบันทึกขึ้นเซิร์ฟเวอร์ 1 ครั้ง',r1.sync===1,r1.sync);

 /* ---------- 2) ชื่อพนักงานไม่ตรง: ต้องฟ้อง ห้ามเขียนทับ ---------- */
 const nm=await ev(a=>{window.__reset();
   DATA.lines['209612']={display:'CT12',type:'CT',focus:true,name:'ธนพัต',emp:'00016952'};
   parseDaily('Sales_16112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   return {name:DATA.lines['209612'].name,log:window.__log.join(' | ')};},
   {b64:mkDc([dcRow({pjp:'209612',d:'2026-11-16',shop:'4862435',cs:1,pc:12,niv:300,
                     emp:'00016952',rep:'การัณยภาส 0972384393'})])});
 t('🛟 ไฟล์บอกชื่อเซลล์ไม่ตรงกับระบบ → ฟ้อง แต่ไม่เขียนทับชื่อเดิม',
   nm.name==='ธนพัต'&&/การัณยภาส/.test(nm.log)&&/ระบบเก็บ ธนพัต/.test(nm.log),
   nm.name+' · '+(nm.log.match(/ชื่อพนักงาน[^|]*/)||[''])[0].slice(0,80));

 /* ---------- 3) ของเดิมต้องไม่หาย: ทับเฉพาะสาย/ร้านที่มีในไฟล์ ---------- */
 const keep=await ev(a=>{window.__reset();
   DATA.daily['2026-11-16']={'209611':999,'209613':777,'209616':555};
   STOREDAILY.data['2026-11-16']={'9999999':{l:'209613',n:'ร้านเก่า',cs:9,pc:9,niv:777}};
   parseDaily('Sales_16112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   return {d:DATA.daily['2026-11-16'],sd:STOREDAILY.data['2026-11-16'],log:window.__log.join(' | ')};},
   {b64:mkDc([dcRow({pjp:'209611',d:'2026-11-16',shop:'4862383',cs:1,pc:12,niv:123})])});
 t('🛟 อัพไฟล์ที่มีแค่สายเดียว: สายอื่นของวันนั้น<b>ต้องไม่หาย</b>',
   keep.d&&keep.d['209613']===777&&keep.d['209616']===555,JSON.stringify(keep.d));
 t('...สายที่มีในไฟล์ถูกทับด้วยยอดใหม่ (ไม่บวกเพิ่ม)',keep.d&&keep.d['209611']===123,keep.d&&keep.d['209611']);
 t('...ร้านเดิมของวันนั้นก็ต้องไม่หาย',
   keep.sd&&keep.sd['9999999']&&keep.sd['9999999'].niv===777&&!!keep.sd['4862383'],
   Object.keys(keep.sd||{}).join(' '));
 t('...และฟ้องให้รู้ว่าเก็บยอดเดิมของสายที่ไม่มีในไฟล์ไว้',
   /เก็บยอดเดิมไว้ ไม่ลบ/.test(keep.log)&&/CT13/.test(keep.log),
   (keep.log.match(/เก็บยอดเดิม[^|]*/)||[''])[0].slice(0,90));

 /* ---------- 4) อัพซ้ำวันเดิมทั้งไฟล์ = แทนยอดวันนั้น ---------- */
 const re=await ev(a=>{window.__reset();
   const u=Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0));
   parseDaily('Sales_16112026.xlsx',u);const first=DATA.daily['2026-11-16']['209611'];
   parseDaily('Sales_16112026.xlsx',u);
   return {first:first,again:DATA.daily['2026-11-16']['209611'],
     shops:Object.keys(STOREDAILY.data['2026-11-16']).length};},
   {b64:mkDc([dcRow({pjp:'209611',d:'2026-11-16',shop:'4862383',cs:1,pc:12,niv:123})])});
 t('🛟 อัพไฟล์เดิมซ้ำ = ยอดเท่าเดิม ไม่บวกซ้ำ',
   re.first===123&&re.again===123&&re.shops===1,re.first+' → '+re.again+' · '+re.shops+' ร้าน');

 /* ---------- 5) รหัสสายที่ยังไม่รู้จัก: เก็บไว้ ไม่ทิ้ง + ฟ้อง ---------- */
 const unk=await ev(a=>{window.__reset();
   parseDaily('Sales_16112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   return {d:DATA.daily['2026-11-16'],log:window.__log.join(' | ')};},
   {b64:mkDc([dcRow({pjp:'209633',d:'2026-11-16',shop:'4862999',cs:1,pc:12,niv:321})])});
 t('🛟 สายที่ระบบยังไม่รู้จัก เก็บยอดไว้ให้ ไม่ทิ้ง และฟ้อง',
   unk.d&&unk.d['209633']===321&&/ยังไม่รู้จัก/.test(unk.log),
   JSON.stringify(unk.d)+' · '+/ยังไม่รู้จัก/.test(unk.log));

 /* ---------- 6) เอกสารที่ไม่ใช่ Sales ต้องฟ้อง ---------- */
 const doc=await ev(a=>{window.__reset();
   parseDaily('Sales_16112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   return {log:window.__log.join(' | ')};},
   {b64:mkDc([dcRow({pjp:'209611',d:'2026-11-16',shop:'4862383',cs:1,pc:12,niv:100}),
              dcRow({pjp:'209611',d:'2026-11-16',shop:'4862383',cs:0,pc:0,niv:-50,doc:'Return'})])});
 t('🛟 ไฟล์มีเอกสารประเภทอื่นนอกจาก Sales → ฟ้องให้รู้',
   /มากกว่าประเภท Sales/.test(doc.log)&&/Return/.test(doc.log),
   (doc.log.match(/ไฟล์มีเอกสาร[^|]*/)||[''])[0].slice(0,90));

 /* ---------- 7) วันสุดท้ายเป็นวันนี้ → เตือนว่าอาจไม่ครบวัน ---------- */
 const today=await ev(()=>todayISO());
 const serToday=(()=>{const d=today;return d;})();
 const warn=await ev(a=>{window.__reset();
   parseDaily('Sales_x.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   const a1=window.__log.join(' | ');window.__reset();
   parseDaily('Sales_y.xlsx',Uint8Array.from(atob(a.old),c=>c.charCodeAt(0)));
   return {now:a1,past:window.__log.join(' | ')};},
   {b64:mkDc([dcRow({pjp:'209611',d:serToday,shop:'4862383',cs:1,pc:12,niv:100})]),
    old:mkDc([dcRow({pjp:'209611',d:'2026-11-16',shop:'4862383',cs:1,pc:12,niv:100})])});
 t('วันสุดท้ายในไฟล์เป็นวันนี้ → เตือนว่ายอดอาจยังไม่ครบวัน',
   /ยังไม่ครบวัน/.test(warn.now),(warn.now.match(/วันสุดท้าย[^|]*/)||[''])[0].slice(0,70));
 t('...ถ้าเป็นไฟล์ของวันที่ผ่านไปแล้ว ไม่ต้องเตือน',!/ยังไม่ครบวัน/.test(warn.past));

 /* ---------- 8) หัวตารางหาย = ฟ้อง ไม่เก็บอะไรเลย ---------- */
 const miss=await ev(a=>{
   window.__reset();DATA.daily={'2026-01-01':{'209611':5}};STOREDAILY={data:{'2026-01-01':{x:1}}};
   const before=JSON.stringify({d:DATA.daily,s:STOREDAILY.data,l:DATA.lines});
   let err='';
   try{parseDaily('Sales_16112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));}
   catch(e){err=String(e.message||e);}
   return {err:err,same:JSON.stringify({d:DATA.daily,s:STOREDAILY.data,l:DATA.lines})===before};},
   {b64:mkDc([dcRow({pjp:'209611',d:'2026-11-16',shop:'4862383',cs:1,pc:12,niv:100})],
             H.map(h=>h==='วันที่ออกใบแจ้งหนี้ (Invoice Date)'?'วันที่ (Something New)':h))});
 t('🛟 คอลัมน์สำคัญหาย → ฟ้องชื่อคอลัมน์ และไม่แตะข้อมูลเดิมเลย',
   /ไม่มีคอลัมน์/.test(miss.err)&&/Invoice Date/.test(miss.err)&&miss.same,miss.err.slice(0,90));

 /* ---------- 9) ไฟล์เดิมต้องยังอ่านได้ ---------- */
 const old=await ev(a=>{window.__reset();
   parseDaily('Sales 16112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   return {d:DATA.daily['2026-11-16'],sd:STOREDAILY.data['2026-11-16'],
     lines:Object.keys(DATA.lines).sort(),log:window.__log[0]||''};},
   {b64:mkOld([oldRow({pjp:'209611',d:'2026-11-16',shop:'4862383',shopN:'พี่เทียร',cs:1,pc:12,niv:100}),
               oldRow({pjp:'2096_97',d:'2026-11-16',shop:'2491757',shopN:'กิจโชติ',cs:2,pc:24,niv:200})])});
 t('🛟 ไฟล์ยอดขายรายวันแบบเดิมยังอ่านได้เหมือนเดิม (ของเก่าต้องไม่พัง)',
   old.d&&old.d['209611']===100&&old.d['2096_97']===200,JSON.stringify(old.d));
 t('...ยอดรายร้านของไฟล์เดิมยังครบ',
   old.sd&&old.sd['4862383']&&old.sd['4862383'].cs===1&&old.sd['4862383'].pc===12&&
   old.sd['4862383'].n==='พี่เทียร',JSON.stringify(old.sd&&old.sd['4862383']));
 t('...และไม่ไปเข้าทางตัวอ่าน dcode (ไม่มีข้อความ "ระบบ dcode" ในบันทึก)',
   !/ระบบ dcode/.test(old.log),old.log.slice(0,70));

 /* ---------- 10) ไม่มีคีย์ชั่วคราวหลงไปอยู่ใน state ที่ sync ---------- */
 const clean=await ev(a=>{window.__reset();
   parseDaily('Sales_16112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   const j=JSON.stringify({d:DATA.daily,s:STOREDAILY.data});
   return {bad:/__new|__tmp|undefined|null/.test(j),j:j.slice(0,200),
     keys:Object.keys(STOREDAILY.data['2026-11-16'])};},
   {b64:mkDc([dcRow({pjp:'209611',d:'2026-11-16',shop:'4862383',cs:1,pc:12,niv:100})])});
 t('🛟 ไม่มีคีย์ชั่วคราว/undefined หลงเข้าไปใน state ที่ sync ขึ้นเซิร์ฟเวอร์',
   !clean.bad,clean.j);

 /* ---------- 11) ไฟล์จริง (ถ้ามีในเครื่อง — ไม่อยู่ในรีโป) ---------- */
 const REAL=process.env.DCODE_DAILY;
 if(REAL&&fs.existsSync(REAL)){
   const raw=XLSX.readFile(REAL);
   const aoa=XLSX.utils.sheet_to_json(raw.Sheets[raw.SheetNames[0]],{header:1,raw:true,defval:null});
   const data=aoa.slice(1).filter(r=>r&&r[C.pjp]&&String(r[0]||'').indexOf('Applied filters')!==0);
   const want=data.length;
   const tot=Math.round(data.reduce((a,r)=>a+(+r[C.niv]||0),0)*100)/100;
   const shops=new Set(data.map(r=>String(r[C.shop]))).size;
   const got=await ev(a=>{window.__reset();
     parseDaily('Sales_16-17112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
     let t=0;Object.keys(DATA.daily).forEach(d=>Object.values(DATA.daily[d]).forEach(v=>{t+=v;}));
     const sh=new Set();Object.keys(STOREDAILY.data).forEach(d=>Object.keys(STOREDAILY.data[d]).forEach(s=>sh.add(s)));
     return {tot:Math.round(t*100)/100,shops:sh.size,rows:(window.__log[1]||''),
       days:Object.keys(DATA.daily).sort()};},
     {b64:fs.readFileSync(REAL).toString('base64')});
   t('📄 ไฟล์จริง: ยอดรวมทั้งไฟล์ตรงกับผลรวมช่อง NIV ทุกบรรทัด',
     Math.abs(got.tot-tot)<0.05,got.tot+' vs '+tot);
   t('📄 ไฟล์จริง: จำนวนร้านครบ ไม่ตกหล่น',got.shops===shops,got.shops+' / '+shops);
   t('📄 ไฟล์จริง: จำนวนบรรทัดที่อ่านได้ตรงกับที่มีในไฟล์',
     got.rows.indexOf('อ่าน '+want+' บรรทัด')>=0,got.rows.slice(0,60)+' (คาด '+want+')');
   console.log('   (ไฟล์จริง: '+got.days.join(' · ')+' · '+shops+' ร้าน · NIV รวม '+tot+')');
 }else{
   console.log('  (ข้าม 3 เช็คของไฟล์จริง — ตั้ง DCODE_DAILY=/path/Sales_....xlsx เพื่อตรวจกับไฟล์จริง)');
 }

 let bad=0;A.forEach(([c,n,x])=>{if(!c)bad++;console.log((c?'  ✓ ':'  ✗ FAIL: ')+n.replace(/<[^>]*>/g,'')+(x&&!c?' → '+x:''));});
 const real=errs.filter(e=>!/localStorage/.test(e));
 if(real.length){console.log('PAGE ERRORS:');real.forEach(e=>console.log('   '+e));bad+=real.length;}
 await b.close();
 console.log('\n'+(bad?bad+' FAILED of '+A.length:'ALL PASS ('+A.length+' checks)'));
 process.exit(bad?1:0);
})();
