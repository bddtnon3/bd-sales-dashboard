/* 🎁 โปรโมชั่น & เงินรางวัล — แทรคยอดจากไฟล์ยอดขายรายวัน (เจ้าของสั่ง 24 พ.ย. 69)
   *"ต่อจากนี้ไฟล์ยอดรายวันนี้ มันจะละเอียดขึ้นมาก โดยแบ่งตามร้านและรายสายเซลล์เลย
     โดยผมจะให้ supervisor ประจำศูนย์ เข้ามากรอกทุกต้นเดือนข้อมูลรหัสสินค้าในแต่ละโปรโมชั่น
     เพื่อให้ระบบตามแทรคยอดขายรายสาย และจำนวนการกระจายของแต่ละโปรโมชั่นได้ …
     สามารถเข้าไปกดเลือกช่วงวันเวลาและวันที่ และเลือกรหัสสินค้าตัวหลัก และตัวแถมได้
     (มีเฉพาะบางรายการ บางโปรไม่ต้องมีของแถมก็ได้) และยังคงแนบรูปได้เหมือนเดิม
     โดยแบ่งให้ดูได้เป็นรายเดือนไปนะ"*

   สิ่งที่ต้องพิสูจน์:
     • ตัวหลักนับจากคอลัมน์ "ปริมาณการขาย" · ตัวแถมนับจากคอลัมน์ "ปริมาณของแถม" (คนละคอลัมน์จริง ๆ)
     • นับร้าน "ไม่ซ้ำ" ทั้งช่วง และร้านที่ซื้อครบขั้นต่ำเท่านั้นที่นับว่ากระจายสำเร็จ
     • ช่วงวันที่ตัดจริง — วันนอกช่วงต้องไม่ถูกนับ · ไม่ใส่ช่วง = ทั้งเดือน
     • วันที่ยังไม่ได้อัพไฟล์ต้องบอกว่า "ยังไม่ได้อัพ" ไม่ใช่โชว์ 0
     • 🛟 เก็บเฉพาะรหัสที่อยู่ในโปร — รหัสอื่นต้องไม่เข้า state (ก้อนข้อมูลจะโตจนชน cap)
     • 🛟 ไฟล์ที่กรองมาแค่สายเดียว ต้องไม่ลบยอดโปรฯ ของสายอื่นในวันเดียวกัน
     • หัวหน้าเซลล์ (sup) เห็นเฉพาะแท็บโปรฯ · กรอก/แก้ได้ · ลบไม่ได้ · เซฟผ่าน api/promo.js
   ⛔ ตัวเลข/รหัส/ชื่อร้านในเทสต์สมมติขึ้นเอง — รีโปเป็นสาธารณะ ห้าม commit ยอดจริงของศูนย์
   ไฟล์จริงตรวจเพิ่มได้ด้วย  DCODE_DAILY=/path/Sales_....xlsx node test/browser/promotrk.test.cjs
   ต้องติดตั้งก่อน:  npm i --no-save playwright-core */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const XLSX=require('xlsx');
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');
const BROWSER=require('./_chrome.cjs').chromePath();
const REAL=process.env.DCODE_DAILY&&fs.existsSync(process.env.DCODE_DAILY)?process.env.DCODE_DAILY:null;

/* ไฟล์ใบจัดของ (allocation) จำลอง — หัวตารางชุดเดียวกับ AL_H/AL_O ของจริง
   รหัส/ร้าน/ตัวเลขสมมติขึ้นเองทั้งหมด (รีโปเป็นสาธารณะ) */
const AL_HDR=['Order Creation Date','PJP Code','PJP Name','GIN No.','Product Code',
 'Product Description','Pack Size','Order Number','Invoice No.',
 'Sale Order (CS)','Sale Order (SHR)','Sale Order (PC)',
 'Free Order (CS)','Free Order (SHR)','Free Order (PC)',
 'Sale Allocated (CS)','Sale Allocated (SHR)','Sale Allocated (PC)',
 'Free Allocated (CS)','Free Allocated (SHR)','Free Allocated (PC)','Outlet Code','GSV','NIV'];
const alRow=(d,pj,gin,code,nm,pk,no,sc,ss,sp,fc,out)=>
  [d,pj,'CT_HPC_'+String(pj).slice(-2)+'1',gin,code,nm,pk,no,'',
   sc,ss,sp,fc,0,0,sc,ss,sp,fc,0,0,out,0,0];
function mkAl(){
  const A=[AL_HDR,
   /* CT11 · 10 พ.ย. · ตัวหลัก 2 ลัง(12) + 1 แพ็ค(6) + 3 ชิ้น = 33 ชิ้น · สองร้าน */
   alRow('2026-11-10','209611','7','90000001','สินค้าหลัก 2X6X100 กรัม',12,'BDD0100000901',2,0,0,0,'8000001'),
   alRow('2026-11-10','209611','7','90000001','สินค้าหลัก 2X6X100 กรัม',12,'BDD0100000902',0,1,3,0,'8000002'),
   /* ของแถมคนละรหัส */
   alRow('2026-11-10','209611','7','90000009','ของแถม 2X6X100 กรัม',12,'BDD0100000901',0,0,0,1,'8000001'),
   /* รหัสนอกโปร ต้องไม่ถูกเก็บ */
   alRow('2026-11-10','209611','7','90009999','สินค้านอกโปร 2X6X100 กรัม',12,'BDD0100000903',9,0,0,0,'8000003'),
   /* CT12 · 11 พ.ย. · 1 ลัง = 12 ชิ้น */
   alRow('2026-11-11','209612','8','90000001','สินค้าหลัก 2X6X100 กรัม',12,'BDD0100000904',1,0,0,0,'8000004')];
  const ws=XLSX.utils.aoa_to_sheet(A),wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Export');
  return Buffer.from(XLSX.write(wb,{type:'array',bookType:'xlsx'})).toString('base64');
}

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
const C={pjp:4,emp:6,rep:7,doc:8,ord:9,inv:13,shop:14,shopN:15,prod:30,prodN:31,
         cs:33,pc:34,fc:35,fp:36,gsv:37,niv:46};
const SER=ymd=>Math.round((Date.UTC(+ymd.slice(0,4),+ymd.slice(5,7)-1,+ymd.slice(8,10))-Date.UTC(1899,11,30))/86400000);
function row(o){
  const r=new Array(49).fill(0);
  r[0]='15389839';r[1]='บริษัท บีดี ดิสทริบิวชั่น จำกัด';r[3]='11.2026';
  r[2]=SER(o.d);r[C.inv]=SER(o.d);
  r[C.pjp]=o.pjp;r[5]='CT_HPC_2'+String(o.pjp).slice(-2);
  r[C.emp]='00016951';r[C.rep]='ทดสอบ 0900000000';
  r[C.doc]='Sales';r[C.ord]='Mobility (MOB)';
  r[10]='BDD09'+o.pjp+o.shop;r[11]='BDD01'+o.pjp+o.shop;r[12]='NA';
  r[C.shop]=o.shop;r[C.shopN]='ร้านทดสอบ '+o.shop;
  r[C.prod]=o.prod;r[C.prodN]='สินค้าทดสอบ '+o.prod;r[32]=12;
  r[C.cs]=o.cs||0;r[C.pc]=o.pc||0;r[C.fc]=o.fc||0;r[C.fp]=o.fp||0;
  r[C.gsv]=(o.niv||0)+999;r[C.niv]=o.niv||0;
  return r;
}
const FOOT=(()=>{const r=new Array(49).fill('');
  r[0]='Applied filters:\r\nRef_InvoiceDate is before 24/11/2026\r\nDistributorCode is 15389839';return r;})();
function mk(rows){
  const w=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet([H].concat(rows).concat([FOOT])),'Export');
  return Buffer.from(XLSX.write(w,{bookType:'xlsx',type:'array'})).toString('base64');
}

/* ---------------- ข้อมูลจำลอง (รหัส/ร้านสมมติทั้งหมด) ----------------
   โปร P1: ตัวหลัก 90000001 · ของแถม 90000009 · ช่วง 10–12 พ.ย. · ขั้นต่ำ 6 ชิ้น
   CT11  ร้าน S1 ซื้อ 10 พ.ย. 4 ชิ้น + 11 พ.ย. 3 ชิ้น = 7  → ผ่านขั้นต่ำ (ต้องนับร้านเดียว)
         ร้าน S2 ซื้อ 11 พ.ย. 5 ชิ้น                       → ไม่ผ่าน
   CT12  ร้าน S3 ซื้อ 12 พ.ย. 12 ชิ้น (1 ลัง)             → ผ่าน
   นอกช่วง: CT11 ร้าน S9 ซื้อ 9 พ.ย. 50 ชิ้น              → ต้องไม่ถูกนับเลย
   ของแถม: CT11 แถมรหัส 90000009 ไป 8 ชิ้น (ขาย 0 · NIV 0) ในวันที่ 11
   รหัสนอกโปร 90009999 ขาย 777 ชิ้น                       → ต้องไม่เข้า PROMO.sales
*/
const MAIN='90000001',FREE='90000009',OTHER='90009999';
const ROWS=[
  row({d:'2026-11-10',pjp:'209611',shop:'S1',prod:MAIN,pc:4,cs:0,niv:400}),
  row({d:'2026-11-11',pjp:'209611',shop:'S1',prod:MAIN,pc:3,cs:0,niv:300}),
  row({d:'2026-11-11',pjp:'209611',shop:'S2',prod:MAIN,pc:5,cs:0,niv:500}),
  row({d:'2026-11-12',pjp:'209612',shop:'S3',prod:MAIN,pc:12,cs:1,niv:1200}),
  row({d:'2026-11-09',pjp:'209611',shop:'S9',prod:MAIN,pc:50,cs:0,niv:5000}),
  row({d:'2026-11-11',pjp:'209611',shop:'S1',prod:FREE,pc:0,cs:0,fp:8,fc:0.5,niv:0}),
  row({d:'2026-11-11',pjp:'209611',shop:'S1',prod:OTHER,pc:777,cs:0,niv:7770}),
];

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const pg=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.setContent(fs.readFileSync(PAGE,'utf8'),{waitUntil:'domcontentloaded'});
 await pg.addScriptTag({path:require.resolve('xlsx/dist/xlsx.full.min.js')});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);

 await pg.evaluate(`
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};window.__log=[];window.__posts=[];window.__sync=0;
  window.ulog=m=>window.__log.push(String(m).replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' '));
  window.syncToServer=()=>{window.__sync++};window.toast=()=>{};
  window.alert=m=>{window.__alert=String(m)};window.confirm=()=>true;
  window.fetch=()=>Promise.resolve({ok:true,json:()=>Promise.resolve({})});
  TOKEN='t';
  window.bdPost=(u,b)=>{window.__posts.push({u:u,b:b});
    return Promise.resolve({ok:true,json:()=>Promise.resolve({ok:true})});};
  window.__as=(role,name,code)=>{S.user={id:role,role:role,code:code||'',name:name};};
  window.__reset=()=>{
    window.__log=[];window.__posts=[];window.__sync=0;window.__alert='';
    DATA.lines={};DATA.focus_order=[];
    Object.keys(FOCUS_MAP).forEach(c=>{DATA.lines[c]={display:FOCUS_MAP[c],
      type:FOCUS_MAP[c].indexOf('KA')===0?'KA':'CT',focus:true,name:'',emp:''};});
    DATA.daily={};DATA.targets={};DATA.monthly={'2026-11':{}};
    STOREDAILY={data:{},ord:{}};STORE={months:[],stores:[]};
    PROMO={items:{},res:{},del:{},sales:{}};
    PM={m:null,scope:'all',open:null,edit:null,form:null,busy:false};
  };
  window.__promo=(o)=>{PROMO.items[o.id]=Object.assign({name:'โปรทดสอบ',type:'combo',m:'2026-11',
    ch:'both',grp:'',prod:[],lines:[],pay:[],cond:[],detail:[],imgs:[],up:1,at:1},o);};
  window.__up=async(b64,nm)=>{const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
    await parseDaily(nm||'Sales_09-12112026.xlsx',bin.buffer);};
  __reset();__as('manager','ผู้จัดการ');
 `);

 /* ---------- 1) หัวหน้าเซลล์เห็นอะไร ---------- */
 const who=await ev(()=>{const o={};
   [['sup','หัวหน้าเซลล์',''],['wh','ทีมคลัง',''],['sales','เซลล์','209611'],['manager','ผู้จัดการ','']]
     .forEach(([r,n,c])=>{__as(r,n,c);_switchTab(tabHome(r));
       o[r]={home:tabHome(r),tab:CURTAB,groups:tabVisible().map(x=>x.g.k).join(','),edit:pmCanEdit()};});
   __as('manager','ผู้จัดการ');return o;});
 /* หัวหน้าเซลล์เห็นสองกลุ่มที่เป็นงานของตัวเอง: โปรโมชั่น (ลงที่หน้านี้) กับ ออเดอร์พิเศษ
    (ตั้งเป้ารายสัยให้เซลล์คีย์ — เพิ่ม 26 พ.ย. 69) · นอกนั้นยังไม่เห็น */
 /* 26 พ.ย. 69 เพิ่มหมวด 📋 สถานะออเดอร์ ซึ่งเจ้าของสั่งว่า "ทุกคนเข้ามาดูได้" (อ่านอย่างเดียว)
    ทีม role จึงเห็นเพิ่มอีกหนึ่งกลุ่ม แต่หน้าแรกที่ลงยังเหมือนเดิม */
 t('🔑 หัวหน้าเซลล์ (sup) เห็นเฉพาะโปรโมชั่น · สถานะออเดอร์ · ออเดอร์พิเศษ และลงที่หน้าโปรโมชั่น',
   who.sup.groups==='promo,psib,otrk,spord'&&who.sup.home==='promo'&&who.sup.tab==='promo',
   JSON.stringify(who.sup));
 t('🔑 ...และกรอก/แก้โปรโมชั่นได้',who.sup.edit===true);
 t('🛟 ทีมคลังยังไม่เห็นแท็บโปรโมชั่น และยังลงที่ออเดอร์พิเศษเหมือนเดิม',
   who.wh.groups.split(',').indexOf('promo')<0&&who.wh.groups==='psib,otrk,spord'&&
   who.wh.home==='spord',JSON.stringify(who.wh));
 t('🔑 แท็บโปรโมชั่นกลับมาแล้วสำหรับเซลล์และผู้จัดการ',
   who.sales.groups.indexOf('promo')>=0&&who.manager.groups.indexOf('promo')>=0,who.manager.groups);
 t('🛟 เซลล์ดูได้อย่างเดียว แก้ไม่ได้',who.sales.edit===false&&who.manager.edit===true);

 /* ---------- 2) อ่านไฟล์แล้วเก็บเฉพาะรหัสในโปร ---------- */
 const up=await ev(async(b64)=>{
   __reset();__as('manager','ผู้จัดการ');
   __promo({id:'p1',d1:'2026-11-10',d2:'2026-11-12',min:6,
     prod:[{c:'90000001',n:'ตัวหลัก',k:'m'},{c:'90000009',n:'ของแถม',k:'f'}]});
   await __up(b64);
   const keys=Object.keys(PROMO.sales).sort();
   const all=JSON.stringify(PROMO.sales);
   return {keys:keys,hasOther:all.indexOf('90009999')>=0,
     log:window.__log.filter(x=>/โปรโมชั่น/.test(x))[0]||''};
 },mk(ROWS));
 t('🔑 เก็บยอดเป็นคีย์ "วัน|สาย" ตามที่ไฟล์หนึ่งใบเขียน',
   up.keys.join(' ')==='2026-11-09|209611 2026-11-10|209611 2026-11-11|209611 2026-11-12|209612',up.keys.join(' '));
 t('🛟 รหัสที่ไม่ได้อยู่ในโปรเลย ต้องไม่ถูกเก็บลง state (ไม่งั้นข้อมูลโตจนชน cap)',!up.hasOther);
 t('...และรายงานให้เห็นในล็อกว่าเก็บให้โปรกี่บรรทัด',/เก็บยอดให้โปรโมชั่น/.test(up.log),up.log.slice(-90));

 /* ---------- 3) ตัวเลขที่แทรคได้ ---------- */
 const tr=await ev(()=>{
   const t=pmTrack(PROMO.items['p1']);
   return {ct11:t.rows['209611'],ct12:t.rows['209612'],min:t.min,
     range:t.range,days:t.days,codes:t.codes};
 });
 t('🔑 ตัวหลักนับจากคอลัมน์ "ปริมาณการขาย" (CT11 = 4+3+5 = 12 ชิ้น)',
   tr.ct11&&tr.ct11.pc===12,JSON.stringify(tr.ct11));
 t('🔑 ของแถมนับจากคอลัมน์ "ปริมาณของแถม" คนละคอลัมน์กัน (8 ชิ้น / 0.5 ลัง)',
   tr.ct11&&tr.ct11.fpc===8&&tr.ct11.fcs===0.5,JSON.stringify(tr.ct11));
 t('🔑 นับร้านไม่ซ้ำทั้งช่วง — S1 ซื้อ 2 วัน ต้องนับเป็นร้านเดียว (CT11 = 2 ร้าน)',
   tr.ct11&&tr.ct11.shops===2,tr.ct11&&tr.ct11.shops);
 t('🔑 ร้านที่กระจายสำเร็จ = ซื้อครบขั้นต่ำ 6 ชิ้น — S1 ได้ 4+3=7 ผ่าน · S2 ได้ 5 ไม่ผ่าน',
   tr.ct11&&tr.ct11.qual===1,tr.ct11&&tr.ct11.qual);
 t('...สายอื่นแยกกันคนละแถว (CT12 = 12 ชิ้น / 1 ลัง / 1 ร้านผ่าน)',
   tr.ct12&&tr.ct12.pc===12&&tr.ct12.cs===1&&tr.ct12.qual===1,JSON.stringify(tr.ct12));
 t('🛟 วันนอกช่วงโปร (9 พ.ย. 50 ชิ้น) ต้องไม่ถูกนับเลย',tr.ct11.pc===12&&tr.ct11.shops===2);
 t('ช่วงวันที่ใช้ตามที่กรอกไว้ ไม่ใช่ทั้งเดือน',
   tr.range.a==='2026-11-10'&&tr.range.b==='2026-11-12'&&tr.range.own===true,JSON.stringify(tr.range));
 t('รหัสในโปรเจอยอดครบทั้งตัวหลักและตัวแถม',
   tr.codes.main===1&&tr.codes.free===1&&tr.codes.miss.length===0,JSON.stringify(tr.codes));

 /* ---------- 4) ไม่ใส่ช่วง = ทั้งเดือน · วันที่ยังไม่อัพต้องบอก ---------- */
 const mon=await ev(()=>{
   __promo({id:'p2',min:1,prod:[{c:'90000001',n:'ตัวหลัก',k:'m'}]});   /* ไม่มี d1/d2 */
   const t=pmTrack(PROMO.items['p2']);
   return {range:t.range,pc:t.rows['209611']?t.rows['209611'].pc:null,
     days:t.days,html:pmTrackHtml(PROMO.items['p2'],'')};
 });
 t('🔑 ไม่ใส่ช่วงวัน = นับทั้งเดือนของโปร (1–30 พ.ย.)',
   mon.range.a==='2026-11-01'&&mon.range.b==='2026-11-30'&&mon.range.own===false,JSON.stringify(mon.range));
 t('...ทั้งเดือนจึงรวมวันที่ 9 เข้ามาด้วย (50+12 = 62 ชิ้น)',mon.pc===62,mon.pc);
 t('🔑 วันที่ยังไม่ได้อัพไฟล์ ต้องบอกว่า "ยังไม่ได้อัพ" ไม่ใช่ปล่อยให้ดูเหมือนครบ',
   /ยังไม่ได้อัพไฟล์ยอดขายของ/.test(mon.html),mon.html.slice(0,80));
 t('...และนับวันที่มีข้อมูลถูก (4 วันจากทั้งเดือน)',mon.days.have===4,JSON.stringify(mon.days));

 /* ---------- 4.5) 🧾 ยอดที่ "เซลล์คีย์ออกไป" จากไฟล์ใบจัดของ (เจ้าของถาม 27 พ.ย. 69) ----------
    *"ลองจับจากไฟล์ยอดขาย / allocate / transaction ได้ไหม ว่ารหัสสินค้าและชุดโปรโมชั่นพวกนี้
      ถูกคีย์ขายออกไปทั้งหมดกี่ชุด ของแต่ละสายเซลล์"*
    ⚠️ สองก้อนนี้คนละวันกัน (ใบจัดของ = วันเซลล์คีย์ · ไฟล์ยอดขาย = วันออกบิล) ห้ามบวกกัน */
 const alc=await ev(a=>{
   const o={};
   const sales=JSON.stringify(PROMO.sales);
   parseAlloc('Order_Allocation_Report.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   o.keys=Object.keys(PROMO.ord||{}).sort();
   o.all=JSON.stringify(PROMO.ord);
   o.salesSame=JSON.stringify(PROMO.sales)===sales;   /* ห้ามไปแตะก้อนของไฟล์ยอดขาย */
   const t=pmTrack(PROMO.items['p1']);
   o.ord11=t.ord['209611']||null;o.ord12=t.ord['209612']||null;
   o.rows11=t.rows['209611']?t.rows['209611'].pc:null;   /* ช่องเดิมต้องไม่เปลี่ยน */
   o.html=pmTrackHtml(PROMO.items['p1'],'');
   o.log=(window.__log||[]).filter(x=>/โปรโมชั่น/.test(x)).slice(-1)[0]||'';
   return o;},{b64:mkAl()});
 t('🔑 ไฟล์ใบจัดของเก็บยอดโปรฯ เป็นคีย์ "วัน|สาย" แบบเดียวกัน แต่คนละก้อนกับไฟล์ยอดขาย',
   alc.keys.join(' ')==='2026-11-10|209611 2026-11-11|209612'&&alc.salesSame,
   alc.keys.join(' ')+' · salesSame='+alc.salesSame);
 t('🛟 รหัสที่ไม่ได้อยู่ในโปร ต้องไม่ถูกเก็บ (ไฟล์หมื่นแถวจะทำให้ข้อมูลบวม)',
   alc.all.indexOf('90009999')<0);
 t('🔑 แปลง ลัง/แพ็ค/ชิ้น เป็นชิ้นได้ถูก (2 ลัง×12 + 1 แพ็ค×6 + 3 ชิ้น = 33)',
   alc.ord11&&alc.ord11.pc===33,JSON.stringify(alc.ord11));
 t('🔑 แยกรายสายได้ และนับร้านไม่ซ้ำ',
   alc.ord11&&alc.ord11.shops===2&&alc.ord12&&alc.ord12.pc===12,
   JSON.stringify({a:alc.ord11&&alc.ord11.shops,b:alc.ord12&&alc.ord12.pc}));
 t('🛟 ช่อง "ทำได้" (จากบิล) ต้องไม่ถูกบวกเพิ่มจากไฟล์ใบจัดของ — คนละวันกัน นับซ้ำไม่ได้',
   alc.rows11===12,String(alc.rows11));
 t('🔑 ตารางขึ้นคอลัมน์ "คีย์ขายไปแล้ว" และบอกว่าห้ามเอาไปบวกกับ ทำได้',
   /คีย์ขายไปแล้ว/.test(alc.html)&&/อย่าเอามาบวกกัน/.test(alc.html),'');
 t('...และรายงานในล็อกว่าเก็บให้โปรกี่แถว',/โปรโมชั่น: เก็บยอดที่เซลล์คีย์ออกไป/.test(alc.log),
   alc.log.slice(-110));

 /* ---------- 5) รหัสที่เพิ่มทีหลังต้องบอกให้อัพไฟล์ซ้ำ ---------- */
 const late=await ev(()=>{
   __promo({id:'p3',d1:'2026-11-10',d2:'2026-11-12',min:1,
     prod:[{c:'90000001',k:'m'},{c:'90001234',n:'รหัสที่เพิ่งเพิ่ม',k:'m'}]});
   const t=pmTrack(PROMO.items['p3']);
   return {miss:t.codes.miss,html:pmTrackHtml(PROMO.items['p3'],'')};
 });
 t('🔑 รหัสที่เพิ่งเพิ่มทีหลังและยังไม่มียอด ต้องถูกชี้ให้เห็น ไม่ใช่เงียบ ๆ แสดง 0',
   late.miss.join(',')==='90001234'&&/อัพไฟล์ยอดขายของช่วงนี้ซ้ำ/.test(late.html),late.miss.join(','));

 /* ---------- 6) 🛟 ไฟล์ที่กรองมาแค่สายเดียว ไม่ลบของสายอื่น ---------- */
 const one=await ev(async(b64)=>{
   const before=Object.keys(PROMO.sales).length;
   await __up(b64,'Sales_11112026.xlsx');
   const t=pmTrack(PROMO.items['p1']);
   return {before:before,after:Object.keys(PROMO.sales).length,
     ct11:t.rows['209611'].pc,ct12:t.rows['209612']?t.rows['209612'].pc:null};
 },mk([row({d:'2026-11-11',pjp:'209611',shop:'S2',prod:MAIN,pc:9,cs:0,niv:900})]));
 t('🛟 ไฟล์ที่ดึงมาแค่สายเดียว ทับได้แค่ "วัน|สาย" นั้น — ยอดของ CT12 ยังอยู่ครบ',
   one.ct12===12,one.ct12);
 t('...และสายนั้นวันนั้นถูกเขียนทับด้วยของใหม่ (CT11 = 4 + 9 = 13 ชิ้น)',one.ct11===13,one.ct11);

 /* ---------- 7) หัวหน้าเซลล์เซฟผ่าน api/promo.js ไม่ใช่ทั้งก้อน ---------- */
 const sv=await ev(()=>{
   __reset();__as('sup','หัวหน้าเซลล์','');
   PM.m='2026-11';pmOpen(null);
   /* กรอกผ่าน "ช่องจริงบนหน้าจอ" เหมือนคนใช้งาน — pmSaveForm อ่านค่าจาก DOM (pmGrab)
      ถ้าไปเซ็ตที่ PM.form ตรง ๆ ค่าจะถูกค่าว่างใน DOM ทับกลับทันที */
   const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v;};
   set('pmf_name','โปรของหัวหน้า');set('pmf_m','2026-11');
   set('pmf_d1','2026-11-01');set('pmf_d2','2026-11-15');set('pmf_min','6');
   set('pmf_prodText','90000001 ตัวหลัก');set('pmf_freeText','90000009 ของแถม');
   pmSaveForm();
   const id=Object.keys(PROMO.items)[0],it=PROMO.items[id]||{};
   return {n:Object.keys(PROMO.items).length,sync:window.__sync,
     posts:window.__posts.map(p=>p.u),d1:it.d1,d2:it.d2,min:it.min,
     main:(it.prod||[]).filter(x=>x.k!=='f').map(x=>x.c).join(','),
     free:(it.prod||[]).filter(x=>x.k==='f').map(x=>x.c).join(','),
     byName:it.byName};
 });
 t('🔑 หัวหน้าเซลล์เพิ่มโปรได้ และเก็บช่วงวัน + ขั้นต่ำครบ',
   sv.n===1&&sv.d1==='2026-11-01'&&sv.d2==='2026-11-15'&&sv.min===6,JSON.stringify(sv));
 t('🔑 แยกรหัสตัวหลักกับตัวแถมถูกต้อง',
   sv.main==='90000001'&&sv.free==='90000009',sv.main+' | '+sv.free);
 t('🔑 ...และส่งผ่าน api/promo.js ทีละใบ ไม่ได้เซฟ state ทั้งก้อน (sup ทำไม่ได้อยู่แล้ว)',
   sv.posts.join(',')==='/api/promo'&&sv.sync===0,sv.posts.join(',')+' · sync='+sv.sync);
 t('...และบันทึกว่าใครเป็นคนกรอก',sv.byName==='หัวหน้าเซลล์',sv.byName);

 /* ---------- 8) 🛟 สิทธิ์ ---------- */
 const perm=await ev(()=>{
   const o={};
   __as('sales','เซลล์ CT11','209611');
   window.__alert='';pmOpen(null);o.salesOpen=window.__alert;o.salesForm=!!PM.form;
   window.__alert='';pmSaveForm();o.salesSave=window.__alert;
   __as('sup','หัวหน้าเซลล์','');
   const id=Object.keys(PROMO.items)[0];
   window.__alert='';pmDelete(id);o.supDel=window.__alert;o.stillThere=!!PROMO.items[id];
   __as('manager','ผู้จัดการ');return o;});
 t('🛟 เซลล์เปิดฟอร์มไม่ได้ และกดบันทึกตรง ๆ ก็ไม่ผ่าน',
   /หัวหน้าเซลล์เท่านั้น/.test(perm.salesOpen)&&!perm.salesForm&&/หัวหน้าเซลล์เท่านั้น/.test(perm.salesSave),
   perm.salesOpen);
 t('🛟 หัวหน้าเซลล์ลบโปรทิ้งไม่ได้ (ลบเป็นงานของผู้จัดการ)',
   /บัญชีนี้แก้ส่วนนี้ไม่ได้/.test(perm.supDel)&&perm.stillThere===true,perm.supDel);

 /* ---------- 9) หน้าจอ ---------- */
 const ui=await ev(async(b64)=>{
   __reset();__as('manager','ผู้จัดการ');
   __promo({id:'p1',name:'คอมโบทดสอบ',d1:'2026-11-10',d2:'2026-11-12',min:6,
     prod:[{c:'90000001',n:'ตัวหลัก',k:'m'},{c:'90000009',n:'ของแถม',k:'f'}]});
   await __up(b64);
   PM.m='2026-11';PM.open='p1';_switchTab('promo');renderPromo();
   const d=document.getElementById('pmDetail');
   return {txt:d.textContent.replace(/\s+/g,' '),add:document.getElementById('pmAddCtl').style.display};
 },mk(ROWS));
 /* 26 พ.ย. 69 เจ้าของสั่งให้ทำหน้ารายงานตามไฟล์ Excel ที่เซลล์ดูมาตลอด และตัด text ให้น้อยลง */
 t('🔑 การ์ดโปรมี Report รายสาย พร้อมช่วงวันที่',
   /Report รายสาย/.test(ui.txt)&&/10 พ\.ย\. 2569 – 12 พ\.ย\. 2569/.test(ui.txt),
   ui.txt.slice(ui.txt.indexOf('Report รายสาย'),ui.txt.indexOf('Report รายสาย')+70));
 t('...คอลัมน์เหมือนไฟล์ Excel เดิม และบอกเกณฑ์ขั้นต่ำไว้ชัด',
   /%Achieve/.test(ui.txt)&&/ส่วนต่าง/.test(ui.txt)&&/ซื้อตัวหลักครบ 6 ชิ้น/.test(ui.txt));
 t('...แยกสินค้าตัวหลักกับของแถมให้เห็น',/ตัวหลัก — ตัวที่ต้องขายให้ถึงเป้า/.test(ui.txt)&&/🎁 ของแถม/.test(ui.txt));
 t('...และมีแถวรวมทั้งศูนย์',/รวมทั้งศูนย์/.test(ui.txt));
 t('ปุ่มเพิ่มโปรโมชั่นโผล่ให้ผู้จัดการ',ui.add!=='none',ui.add);

 /* ---------- 10) ไฟล์จริง (ถ้ามี) ---------- */
 if(REAL){
   const real=await ev(async(b64)=>{
     __reset();__as('manager','ผู้จัดการ');
     __promo({id:'r1',d1:'2026-11-15',d2:'2026-11-23',min:6,prod:[{c:'65456729',k:'m'},{c:'64849613',k:'f'}]});
     await __up(b64,'Sales_15-23112026.xlsx');
     const t=pmTrack(PROMO.items['r1']);
     const lines=Object.keys(t.rows);
     return {keys:Object.keys(PROMO.sales).length,lines:lines.length,
       kb:Math.round(JSON.stringify(PROMO.sales).length/1024),
       anyPc:lines.some(l=>t.rows[l].pc>0),anyFree:lines.some(l=>t.rows[l].fpc>0),
       qualOk:lines.every(l=>t.rows[l].qual<=t.rows[l].shops)};
   },fs.readFileSync(REAL).toString('base64'));
   t('📄 ไฟล์จริง: อ่านแล้วได้ยอดตัวหลักและของแถมจริง',real.anyPc&&real.anyFree,JSON.stringify(real));
   t('📄 ไฟล์จริง: ร้านที่ผ่านขั้นต่ำต้องไม่เกินร้านที่ซื้อ ทุกสาย',real.qualOk);
   t('📄 ไฟล์จริง: เก็บแค่รหัสในโปร ข้อมูลจึงเล็ก (ไม่เกิน 200 KB)',real.kb<200,real.kb+' KB');
 }else{
   console.log('  (ข้าม 3 ข้อของไฟล์จริง — ตั้ง DCODE_DAILY=/path/Sales_....xlsx เพื่อตรวจเพิ่ม)');
 }


 /* ---------- 9) 📥 โปรเดือน พ.ย. 69 ที่อ่านมาจากสไลด์ ---------- */
 const seed=await ev(()=>{
   __reset();__as('manager','ผู้จัดการ');
   const nov=PROMO_SEED.filter(x=>x.m==='2026-11');
   const code=nm=>{const x=nov.filter(y=>new RegExp(nm).test(y.name))[0];
     return x?(x.prod||[]).map(p=>p.c).join(','):'(ไม่เจอ)';};
   const byName=nm=>nov.filter(y=>new RegExp(nm).test(y.name))[0]||null;
   return {n:nov.length,types:nov.map(x=>x.type).join(','),
     vas:code('HIT OF THE MONTH'),citra:code('BW : EXTRA'),breeze:code('HC : EXTRA'),
     comfort:code('Eco Trophy'),dflash:code('DIGITAL FLASH'),slot:code('HAPPY SLOT'),lux:code('^FLASH DEAL'),
     luxFree:(byName('^FLASH DEAL').prod||[]).filter(p=>p.k==='f').map(p=>p.c).join(','),
     bwPay:(byName('BW : EXTRA').pay||[]).map(p=>p.pcs+':'+p.sm+'/'+p.sup).join(' '),
     hcPay:(byName('HC : EXTRA').pay||[]).map(p=>p.pcs+':'+p.sm+'/'+p.sup).join(' '),
     ecoMin:byName('Eco Trophy').min,hcTgt:byName('HC : EXTRA').tgtPct,
     left:pmSeedLeft('2026-11').length,leftOct:pmSeedLeft('2026-10').length,
     months:pmMonths().join(',')};});
 t('🔑 โปรเดือน พ.ย. 69 อ่านจากสไลด์ครบ 7 โปร',seed.n===7,seed.n+' · '+seed.types);
 t('🔑 วาสลีน ดีพรีสโตร์ (Hit of the month) รหัสครบ 3 ตัว',
   seed.vas==='68906730,64377977,65586005',seed.vas);
 t('🔑 ซิตร้า FO79 (BW Extra) รหัสครบ 4 ตัว',
   seed.citra==='65691961,65691963,65691965,65691967',seed.citra);
 t('🔑 บรีสลิควิด FO20 (HC Extra) รหัสครบ 7 ตัว',
   seed.breeze==='64401555,65542616,64914232,65649245,65495409,65597714,64399473',seed.breeze);
 t('🔑 คอมฟอร์ท FO39 (Eco Trophy) รหัสครบ 4 ตัว และนับ 3 ชิ้น',
   seed.comfort==='65549348,65628525,65549344,65549346'&&seed.ecoMin===3,seed.comfort+' min='+seed.ecoMin);
 t('🔑 คอมฟอร์ทเพียวแฮปปี้ (Digital Flash) รหัสเดียว',seed.dflash==='65628537',seed.dflash);
 t('🔑 ซิตร้า Happy Slot สองรหัสแถมไขว้กัน',seed.slot==='65786539,65786541',seed.slot);
 t('🔑 ลักส์ 2 ฟรี 2 — โรสเป็นตัวซื้อ ซากุระเป็นของแถม',
   seed.lux==='65724220,65724222'&&seed.luxFree==='65724222',seed.lux+' free='+seed.luxFree);
 t('🔑 ขั้นเงินรางวัล BW: 2 ชิ้น 700/1,000 · 4 ชิ้น 1,500/2,000',
   seed.bwPay==='2:700/1000 4:1500/2000',seed.bwPay);
 t('🔑 ขั้นเงินรางวัล HC: 9 ชิ้น 700/1,000 · 15 ชิ้น 1,500/2,000 · Target 25%',
   seed.hcPay==='9:700/1000 15:1500/2000'&&seed.hcTgt===25,seed.hcPay+' tgt='+seed.hcTgt);
 t('🔑 เดือน พ.ย. โผล่ในช่องเลือกเดือน ทั้งที่ยังไม่ได้กดใส่',
   /2026-11/.test(seed.months),seed.months);
 t('🛟 ปุ่มใส่โปรนับเฉพาะเดือนที่เลือก ไม่ปนกับเดือนอื่น',
   seed.left===7&&seed.leftOct===10,seed.left+' / '+seed.leftOct);

 const load=await ev(()=>{
   window.confirm=()=>true;window.alert=()=>{};
   pmSeedLoad('2026-11');
   const got=pmAll().filter(x=>x.m==='2026-11');
   const again=pmSeedLeft('2026-11').length;
   return {n:got.length,again:again,oct:pmAll().filter(x=>x.m==='2026-10').length};});
 t('🔑 กดใส่แล้วเข้าระบบครบ 7 โปร',load.n===7,load.n);
 t('🛟 กดซ้ำไม่เพิ่มซ้ำ (เทียบจากเดือน+ชื่อโปร)',load.again===0,load.again);
 t('🛟 ...และไม่ไปแตะโปรของเดือนอื่น',load.oct===0,load.oct);

 /* ---------- 10) 📊 Report รายสาย แบบไฟล์ Excel ที่เซลล์ดูมาตลอด ---------- */
 const rep=await ev(()=>{
   __reset();__as('manager','ผู้จัดการ');
   /* ร้าน M&P 4 ร้านในสาย CT11 · 1 ร้านเป็น WS (ไม่ใช่ M&P) · 1 ร้านปิดไปแล้ว */
   PJP={out:{
     S1:{n:'ร้าน ก',rt:'209611',t:'SS HPC - MPM_Mom & Pop Medium',st:'Active'},
     S2:{n:'ร้าน ข',rt:'209611',t:'SS HPC - MPS_Mom & Pop Small',st:'Active'},
     S3:{n:'ร้าน ค',rt:'209611',t:'SS HPC - MPL_Mom & Pop Large',st:'Active'},
     S4:{n:'ร้าน ง',rt:'209611',t:'SS HPC - MPS_Mom & Pop Small',st:'Active'},
     S5:{n:'ร้าน จ',rt:'209611',t:'SS HPC - WS_Wholesale',st:'Active'},
     S6:{n:'ร้าน ฉ',rt:'209611',t:'SS HPC - MPS_Mom & Pop Small',st:'Inactive'},
     S7:{n:'ร้าน ช',rt:'209612',t:'SS HPC - MPM_Mom & Pop Medium',st:'Active'}},plan:{},done:{},cfg:{}};
   /* ยอดของสาย CT11: S1 ซื้อ 10 ชิ้น · S2 ซื้อ 4 · S3 ซื้อ 2 */
   PROMO.sales={'2026-11-10|209611':{up:1,p:{'90000001':{cs:0,pc:16,fc:0,fp:0,niv:1600,
     sh:{S1:10,S2:4,S3:2}}}}};
   __promo({id:'r1',m:'2026-11',type:'extra',tgtPct:50,min:2,
     prod:[{c:'90000001',n:'ตัวหลัก',k:'m'}],
     pay:[{label:'ขั้น 1',pcs:2,sm:700,sup:1000},{label:'ขั้น 2',pcs:9,sm:1500,sup:2000}]});
   const it=PROMO.items['r1'];
   PM.step=0;PM.rep='';
   const h1=pmTrackHtml(it,'209611');
   const r1=pmRepRows(it,pmSteps(it)[0]).rows.filter(x=>x.ln==='209611')[0];
   PM.step=1;
   const r2=pmRepRows(it,pmSteps(it)[1]).rows.filter(x=>x.ln==='209611')[0];
   PM.step=0;PM.rep='209611';
   const h2=pmTrackHtml(it,'209611');
   PM.rep='';
   return {mp11:pmMP('209611'),mp12:pmMP('209612'),mpX:pmMP('209699'),
     h1:h1.replace(/\s+/g,' '),h2:h2.replace(/\s+/g,' '),
     r1:{act:r1.act,tgt:r1.tgt,est:r1.est,pct:Math.round(r1.pct),diff:r1.diff,money:r1.money},
     r2:{act:r2.act,tgt:r2.tgt,pct:Math.round(r2.pct),money:r2.money},
     steps:pmSteps(it).length};});
 t('🔑 นับร้าน M&P ต่อสายได้ (ไม่นับร้านส่ง และไม่นับร้านที่ปิดไปแล้ว)',
   rep.mp11===4&&rep.mp12===1&&rep.mpX===0,rep.mp11+'/'+rep.mp12+'/'+rep.mpX);
 t('🔑 รายงานหน้าตาแบบไฟล์ Excel: สาย · เป้า · ทำได้ · %Achieve · ส่วนต่าง',
   /สาย/.test(rep.h1)&&/เป้า \(ร้าน\)/.test(rep.h1)&&/ทำได้/.test(rep.h1)&&
   /%Achieve/.test(rep.h1)&&/ส่วนต่าง/.test(rep.h1),rep.h1.slice(0,160));
 t('🔑 ขั้นเงินรางวัลเลือกได้ และเปลี่ยนเกณฑ์ชิ้นจริง',
   rep.steps===2&&rep.r1.act===3&&rep.r2.act===1,JSON.stringify(rep.r1)+' '+JSON.stringify(rep.r2));
 t('🔑 ไม่มีเป้าจากไฟล์ → ประเมินจาก % × ร้าน M&P และติดป้าย (ประเมิน)',
   rep.r1.tgt===2&&rep.r1.est===true&&/\(ประเมิน\)/.test(rep.h1),JSON.stringify(rep.r1));
 t('🔑 %Achieve และส่วนต่างคิดถูก (ทำได้ 3 จากเป้า 2 = 150% · +1)',
   rep.r1.pct===150&&rep.r1.diff===1,JSON.stringify(rep.r1));
 t('🔑 ถึงเป้าแล้วขึ้นเงินรางวัลของขั้นนั้น · ไม่ถึงเป้าเป็น 0',
   rep.r1.money===700&&rep.r2.money===0,rep.r1.money+' / '+rep.r2.money);
 t('🛟 เงินรางวัลที่คำนวณเองต้องติดป้ายว่าเป็นประมาณการ',
   /เงินรางวัลเป็น <b>ประมาณการ<\/b>/.test(rep.h1),'');
 t('🔑 แตะแถวสายแล้วกางรายร้าน พร้อมบอกว่าร้านไหนผ่านเกณฑ์',
   /ร้าน ก/.test(rep.h2)&&/ร้าน ข/.test(rep.h2)&&/ผ่านเกณฑ์/.test(rep.h2),rep.h2.slice(-220));
 t('🛟 รายร้านโผล่เฉพาะแถวที่กดเปิด ไม่ใช่กางทุกสายพร้อมกัน',
   !/ร้าน ก/.test(rep.h1),rep.h1.slice(-160));

 /* การ์ดของเซลล์ต้องขึ้นตัวเลขที่ระบบนับเอง ตอนที่ยังไม่มีไฟล์รายงาน (เจ้าของสั่ง 26 พ.ย. 69) */
 const card=await ev(()=>{
   const it=PROMO.items['r1'];
   return {me:pmCardHtml(it,'209611').replace(/\s+/g,' '),
     other:pmCardHtml(it,'209699').replace(/\s+/g,' ')};});
 t('🔑 การ์ดโปรขึ้นผลของสายตัวเองให้เซลล์ ทั้งที่ยังไม่มีไฟล์รายงาน',
   /สายคุณ \(CT11\)/.test(card.me)&&/ทำได้ 3/.test(card.me),card.me.slice(-220));
 t('🛟 ...และติดป้าย (ประเมิน) ไม่ใช่ทำเป็นยอดจริงที่ Unilever จ่าย',
   /\(ประเมิน\)/.test(card.me),'');
 t('🛟 สายที่ไม่มียอดเลย ยังบอกว่ายังไม่มีผลงาน ไม่ใช่โชว์ 0 ให้เข้าใจผิด',
   /ยังไม่มีผลงานของสายคุณ/.test(card.other),card.other.slice(-140));

 const off=await ev(()=>{
   /* ใส่เป้าจริงจากไฟล์รายงานของ Unilever → ต้องชนะค่าประเมินเสมอ */
   PROMO.res['r1|209611|']={tgt:77,act:140,pct:182,money:1500,up:1};
   PM.step=0;
   const r=pmRepRows(PROMO.items['r1'],pmSteps(PROMO.items['r1'])[0]).rows
     .filter(x=>x.ln==='209611')[0];
   const h=pmTrackHtml(PROMO.items['r1'],'').replace(/\s+/g,' ');
   PROMO.res={};
   return {tgt:r.tgt,est:r.est,money:r.money,mEst:r.mEst,warn:/เป้ารายสายเป็น <b>ประมาณการ/.test(h)};});
 t('🔑 มีเป้าจริงจากไฟล์แล้ว ใช้ของจริง ไม่ใช่ค่าประเมิน',
   off.tgt===77&&off.est===false&&!off.warn,JSON.stringify(off));
 t('🔑 ...เงินรางวัลก็ใช้ยอดจริงจากไฟล์ ไม่ใช่ค่าที่คำนวณเอง',
   off.money===1500&&off.mEst===false,JSON.stringify(off));

 let bad=0;A.forEach(([c,n,x])=>{if(!c)bad++;console.log((c?'  ✓ ':'  ✗ FAIL: ')+n+(x&&!c?' → '+x:''));});
 const real=errs.filter(e=>!/localStorage/.test(e));
 if(real.length){console.log('PAGE ERRORS:');real.forEach(e=>console.log('   '+e));bad+=real.length;}
 await b.close();
 console.log('\n'+(bad?bad+' FAILED of '+A.length:'ALL PASS ('+A.length+' checks)'));
 process.exit(bad?1:0);
})();
