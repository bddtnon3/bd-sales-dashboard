/* ✅ "รอบนี้ไม่มีของ Drop เลย" — เจ้าของสั่ง 23 พ.ย. 69
   *"บางรอบก็ไม่มีสินค้า drop เลย เค้าจะไม่ส่งไฟล์มาให้ แต่สถานะในเวปเราก็จะไม่ขึ้น
     ช่วยทำปุ่มให้ติ๊กหน่อย ว่ารอบนั้นๆ ไม่มีของ drop เลย ใกล้ๆปุ่มอัพใบดรอปของวันนั้นๆนะ"*

   สิ่งที่ต้องพิสูจน์:
     • ไม่มีไฟล์ = "ยังไม่รู้ผล" · ติ๊กแล้ว = "รู้แล้วว่าไม่มีของ drop" — สองอย่างนี้ต้องต่างกัน
     • ติ๊กแล้วทุกหน้าที่อ่าน drop อ่านว่า "ได้ของครบ" (dropped={}) โดยไม่ต้องรู้จักช่อง noDrop
     • 🛟 วันที่มีใบ Drop อยู่แล้ว ติ๊กไม่ได้ และข้อมูลเดิมต้องไม่ถูกแตะแม้แต่ไบต์เดียว
     • 🛟 อัพใบ Drop จริงทีหลัง ต้องล้างการยืนยันทิ้ง ไม่ขึ้นพร้อมกันสองอย่าง
     • 🛟 เซลล์กดไม่ได้ (เช็กที่ฟังก์ชัน ไม่ใช่แค่ซ่อนปุ่ม) และวันอื่นต้องไม่ถูกแตะ
   ⛔ รหัส/ตัวเลขในเทสต์สมมติขึ้นเอง — รีโปนี้เป็นสาธารณะ
   ต้องติดตั้งก่อน:  npm i --no-save playwright-core   แล้วรัน:  node test/browser/nodrop.test.cjs */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');
const BROWSER=require('./_chrome.cjs').chromePath();

const D0='2026-11-20';   /* สั่งแล้ว ยังไม่รู้ผล — วันที่จะเอามาติ๊ก */
const D1='2026-11-19';   /* มีใบ Drop จริงอยู่แล้ว — ห้ามติ๊กทับ */

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
  window.Chart=function(){return{destroy(){}}};
  window.ulog=()=>{};window.__sync=0;window.syncToServer=()=>{window.__sync++};
  window.__alert='';window.alert=m=>{window.__alert=String(m)};
  window.__ok=true;window.confirm=()=>window.__ok;
  window.fetch=()=>Promise.resolve({ok:true,json:()=>Promise.resolve({})});
  TOKEN='t';
  window.__as=(role,name,code)=>{S.user={id:code||role,role:role,code:code||'',name:name};};
  __as('manager','แอดมิน 1');
  DATA.lines={'209611':{display:'CT11'}};DATA.focus_order=['209611'];
  DATA.targets={};DATA.monthly={};DATA.daily={};
  STORE={months:[],stores:[]};KPI={};ANALYTICS={months:[],lines:{},data:{}};
  STOREPROD={months:[],cat:{},stores:{},data:{}};STOREDAILY={data:{},ord:{}};
  MASTER={items:{}};MINSTOCK={man:{}};PLAN={items:{},done:{},del:{}};
  PROMO={items:{},res:{},del:{}};REQUESTS={data:{}};
  STOCKD={date:null,up:1,names:{'1001':'สินค้า ก','1002':'สินค้า ข'},rows:[]};
  POSTATUS={dates:[],data:{}};
  ORDERS={dates:['${D1}','${D0}'],names:{'1001':'สินค้า ก','1002':'สินค้า ข'},cat:{},catN:{},data:{
    '${D0}':{rounds:{main:{'1001':10,'1002':5}},dropped:null,hasResult:false,vals:{main:{ov:0,cv:200000}}},
    '${D1}':{rounds:{main:{'1001':4}},dropped:{'1001':{o:4,d:1,q:3}},hasResult:true,
             dropVal:1234.5,dropLines:[{code:'1001',o:4,d:1,q:3,dv:1234.5,name:'สินค้า ก'}],
             vals:{main:{ov:0,cv:100000}}}}};
  initOrder();ORD.date='${D0}';
  _switchTab('order');ordSetSec('drop');renderOrder();
 `);

 const el=id=>ev(i=>{const e=document.getElementById(i);return e?e.textContent.replace(/\\s+/g,' '):'(ไม่มี)';},id);
 const snap=d=>ev(x=>JSON.stringify(ORDERS.data[x]||null),d);
 const d1Before=await snap(D1);

 /* ---------- 1) ก่อนติ๊ก: ไม่มีไฟล์ = ยังไม่รู้ผล ---------- */
 const b4=await ev(()=>({
   status:document.getElementById('orderStatus').textContent.replace(/\s+/g,' '),
   drop:document.getElementById('orderDrop').textContent.replace(/\s+/g,' '),
   mg:document.getElementById('orderManageDrop').innerHTML,
   nd:ordNoDropOf(ORD.date)}));
 t('ก่อนติ๊ก สถานะยังเป็น "รอผล Unilever"',/รอผล Unilever/.test(b4.status),b4.status.slice(0,70));
 t('...หน้าใบ Drop บอกว่ายังไม่ได้อัพไฟล์',/ยังไม่ได้อัพไฟล์ Drop/.test(b4.drop));
 t('🔑 มีปุ่มติ๊กอยู่ในกล่องไฟล์ของแอดมิน (ใกล้ที่อัพใบ Drop ของวันนั้น)',
   /ordNoDrop\('2026-11-20',1\)/.test(b4.mg)&&/รอบนี้ไม่มีของ Drop เลย/.test(b4.mg));
 t('...ยังไม่ได้ยืนยันอะไร',b4.nd===null);

 /* ---------- 2) ติ๊ก ---------- */
 const on=await ev(()=>{const s0=window.__sync;ordNoDrop(ORD.date,1);
   const d=ORDERS.data[ORD.date];
   return {hasResult:d.hasResult,drop:JSON.stringify(d.dropped),dv:d.dropVal,
     lines:JSON.stringify(d.dropLines),nd:d.noDrop,synced:window.__sync-s0,
     status:document.getElementById('orderStatus').textContent.replace(/\s+/g,' '),
     panel:document.getElementById('orderDrop').textContent.replace(/\s+/g,' '),
     mg:document.getElementById('orderManageDrop').innerHTML,
     cards:document.getElementById('orderCards').textContent.replace(/\s+/g,' ')};});
 t('🔑 ติ๊กแล้วเก็บเป็น "รู้ผลแล้ว + ไม่มีรายการ drop"',
   on.hasResult===true&&on.drop==='{}'&&on.dv===0&&on.lines==='[]',
   on.hasResult+' · dropped='+on.drop+' · dropVal='+on.dv);
 t('...บันทึกว่าใครยืนยันและเมื่อไหร่',
   !!on.nd&&on.nd.byName==='แอดมิน 1'&&on.nd.at>0,JSON.stringify(on.nd));
 t('...และสั่งบันทึกขึ้นเซิร์ฟเวอร์ให้เลย',on.synced===1,on.synced);
 t('🔑 สถานะบนหัวเปลี่ยนเป็น "ได้ผลแล้ว · ไม่มีของ Drop"',
   /ได้ผลแล้ว · ไม่มีของ Drop/.test(on.status)&&!/รอผล Unilever/.test(on.status),on.status.slice(0,80));
 t('🔑 หน้าใบ Drop ขึ้นข้อความชัด ไม่ใช่ตารางเปล่า ๆ',
   /รอบนี้ไม่มีของ Drop เลย/.test(on.panel)&&/ได้ของครบทุกรายการ/.test(on.panel)&&
   !/รวมยอดตามรหัสสินค้า/.test(on.panel),on.panel.slice(0,90));
 t('...และบอกชื่อคนที่ยืนยัน',/แอดมิน 1/.test(on.panel));
 t('...กล่องแอดมินเปลี่ยนเป็นชิปยืนยัน + ปุ่มยกเลิก ไม่มีปุ่มติ๊กซ้ำแล้ว',
   /ordNoDrop\('2026-11-20',0\)/.test(on.mg)&&!/ordNoDrop\('2026-11-20',1\)/.test(on.mg));
 t('🔑 การ์ดอ่านว่าได้ของครบ 2 รายการ และ Drop 0 รายการ',
   /ได้ของ \(confirm\)\s*2 รายการ/.test(on.cards)&&/Drop \(สั่งไม่ได้\)\s*0 รายการ/.test(on.cards),
   on.cards.slice(0,140));

 /* ---------- 3) หน้าอื่น ๆ ต้องอ่านว่า "ได้ของ" โดยไม่ต้องรู้จัก noDrop ---------- */
 const rd=await ev(()=>{
   const f=reqStatusFn('2026-11-20');
   document.getElementById('orderSearch').value='1001';renderOrderSearch();
   const s=document.getElementById('orderSearchResult').textContent.replace(/\s+/g,' ');
   document.getElementById('orderSearch').value='';renderOrderSearch();
   return {got:f?f('1001'):null,got2:f?f('1002'):null,search:s,
     oh:ohVal('2026-11-20'),
     db1:dbScan('2026-11-20',1).rows.length,      /* เฉพาะวันที่ติ๊ก */
     db7:dbScan('2026-11-20',7).rows.length};});  /* รวมวันก่อนหน้าที่มี drop จริง */
 t('🔑 คำขอสินค้าอ่านว่า "ได้ของ" ทุกรหัสที่สั่ง',rd.got==='got'&&rd.got2==='got',rd.got+'/'+rd.got2);
 t('🔑 ค้นหาสถานะสินค้าขึ้น ✅ ได้ของ ไม่ใช่ 🕓 รอผล',
   /✅ ได้ของ/.test(rd.search)&&!/🕓 รอผล/.test(rd.search),rd.search.slice(0,120));
 t('🔑 ประวัติการสั่งของ: Drop เป็น 0 จริง ไม่ใช่ "ไม่มีข้อมูล"',
   !!rd.oh&&rd.oh.drop===0&&rd.oh.c85===170000&&rd.oh.net===170000,JSON.stringify(rd.oh));
 t('Drop ค้าง ไม่มีอะไรค้างจากวันที่ติ๊กว่าไม่มีของ Drop',rd.db1===0,rd.db1);
 t('🛟 ...แต่ของที่ drop จริงเมื่อวันก่อนยังค้างอยู่เหมือนเดิม ไม่ได้ถูกกลบ',rd.db7===1,rd.db7);

 /* ---------- 4) 🛟 วันที่มีใบ Drop อยู่แล้ว ห้ามติ๊กทับ ---------- */
 const blocked=await ev(d=>{window.__alert='';const s0=window.__sync;
   ORD.date=d;renderOrder();ordNoDrop(d,1);
   return {alert:window.__alert,synced:window.__sync-s0};},D1);
 t('🛟 วันที่อัพใบ Drop ไว้แล้ว ติ๊กไม่ได้ — บอกให้ลบไฟล์ก่อน',
   /อัพใบ Drop ไว้แล้ว/.test(blocked.alert)&&/ลบไฟล์/.test(blocked.alert),blocked.alert);
 t('🛟 ...และไม่ได้บันทึกอะไรเลย',blocked.synced===0,blocked.synced);
 t('🛟 ...ข้อมูลใบ Drop วันนั้นเหมือนเดิมทุกไบต์',(await snap(D1))===d1Before);

 /* ---------- 5) 🛟 เซลล์กดไม่ได้ (เช็กที่ฟังก์ชัน ไม่ใช่แค่ซ่อนปุ่ม) ---------- */
 const sales=await ev(d=>{__as('sales','เซลล์ CT11','209611');
   ORD.date=d;renderOrder();
   const hid=document.getElementById('orderManageDrop').style.display;
   window.__alert='';const s0=window.__sync;ordNoDrop('2026-11-18',1);
   const r={alert:window.__alert,synced:window.__sync-s0,
     made:!!ORDERS.data['2026-11-18'],hidden:hid,
     panel:document.getElementById('orderDrop').textContent.replace(/\s+/g,' ')};
   __as('manager','แอดมิน 1');return r;},D0);
 t('🛟 เซลล์เรียกฟังก์ชันตรง ๆ ก็ยังติ๊กไม่ได้',
   /เฉพาะผู้จัดการ/.test(sales.alert)&&sales.synced===0&&!sales.made,sales.alert);
 t('...กล่องปุ่มของแอดมินถูกซ่อนจากเซลล์',sales.hidden==='none',sales.hidden);
 t('🔑 แต่เซลล์เห็นสถานะ "รอบนี้ไม่มีของ Drop เลย" ด้วย',
   /รอบนี้ไม่มีของ Drop เลย/.test(sales.panel),sales.panel.slice(0,70));

 /* ---------- 6) 🔑 อัพใบ Drop จริงทีหลัง ต้องล้างการยืนยันทิ้ง ---------- */
 const up=await ev(d=>{
   const ws=XLSX.utils.aoa_to_sheet([
     ['Material','Material Description','Order Quantity','Delivery quantity','Drop Quantity','Drop Value'],
     ['1001','สินค้า ก',10,7,3,555.5]]);
   const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Sheet1');
   parseDrop('Drop 20112026.xlsx',XLSX.write(wb,{type:'array',bookType:'xlsx'}));
   const day=ORDERS.data[d];
   ORD.date=d;renderOrder();
   return {nd:day.noDrop===undefined?'ล้างแล้ว':JSON.stringify(day.noDrop),
     q:(day.dropped['1001']||{}).q,dv:day.dropVal,
     panel:document.getElementById('orderDrop').textContent.replace(/\s+/g,' '),
     mg:document.getElementById('orderManageDrop').innerHTML};},D0);
 t('🔑 อัพใบ Drop จริงทีหลัง → การยืนยัน "ไม่มีของ Drop" ถูกล้างทิ้ง',up.nd==='ล้างแล้ว',up.nd);
 t('...รายการ drop จากไฟล์ขึ้นแทน (ดรอป 3 ลัง · มูลค่า 555.5)',up.q===3&&up.dv===555.5,up.q+' / '+up.dv);
 t('🛟 ไม่ขึ้นพร้อมกันสองอย่าง',!/รอบนี้ไม่มีของ Drop เลย/.test(up.panel));
 t('...กล่องแอดมินกลับเป็นชิปไฟล์ + ปุ่มลบ',
   /deleteDrop\('2026-11-20'\)/.test(up.mg)&&!/ordNoDrop/.test(up.mg));

 /* ---------- 7) ยกเลิกการยืนยัน กลับไปเป็น "รอผล" ---------- */
 const off=await ev(d=>{
   deleteDrop(d);                                   /* ลบไฟล์ที่เพิ่งอัพออกก่อน */
   ordNoDrop(d,1);                                  /* ติ๊กใหม่ */
   const mid=!!ORDERS.data[d].noDrop;
   ordNoDrop(d,0);                                  /* แล้วยกเลิก */
   const day=ORDERS.data[d]||{};
   ORD.date=d;renderOrder();
   return {mid:mid,nd:day.noDrop===undefined,hasResult:day.hasResult,
     dropped:day.dropped,dv:day.dropVal,
     status:document.getElementById('orderStatus').textContent.replace(/\s+/g,' '),
     panel:document.getElementById('orderDrop').textContent.replace(/\s+/g,' '),
     mg:document.getElementById('orderManageDrop').innerHTML};},D0);
 t('ติ๊กใหม่ได้หลังลบไฟล์ออก',off.mid);
 t('🔑 กดยกเลิกแล้วกลับไปเป็น "รอผล Unilever"',
   off.nd&&off.hasResult===false&&off.dropped===null&&off.dv===0&&
   /รอผล Unilever/.test(off.status),off.status.slice(0,70));
 t('...หน้าใบ Drop กลับไปบอกว่ายังไม่ได้อัพไฟล์',/ยังไม่ได้อัพไฟล์ Drop/.test(off.panel));
 t('...และปุ่มติ๊กกลับมาให้กดใหม่ได้',/ordNoDrop\('2026-11-20',1\)/.test(off.mg));

 /* ---------- 8) 🛟 วันอื่นต้องไม่ถูกแตะตลอดทั้งเทสต์ ---------- */
 t('🛟 ใบ Drop ของวันอื่นยังเหมือนเดิมทุกไบต์ หลังจากกดมาทุกปุ่ม',(await snap(D1))===d1Before);
 const left=await ev(()=>({dates:(ORDERS.dates||[]).join(','),n:Object.keys(ORDERS.data).length}));
 t('🛟 ไม่มีวันแปลกปลอมโผล่เข้ามาใน ORDERS',
   left.dates==='2026-11-19,2026-11-20'&&left.n===2,left.dates+' · '+left.n);

 let bad=0;A.forEach(([c,n,x])=>{if(!c)bad++;console.log((c?'  ✓ ':'  ✗ FAIL: ')+n+(x&&!c?' → '+x:''));});
 const real=errs.filter(e=>!/localStorage/.test(e));
 if(real.length){console.log('PAGE ERRORS:');real.forEach(e=>console.log('   '+e));bad+=real.length;}
 await b.close();
 console.log('\n'+(bad?bad+' FAILED of '+A.length:'ALL PASS ('+A.length+' checks)'));
 process.exit(bad?1:0);
})();
