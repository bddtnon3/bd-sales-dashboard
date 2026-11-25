/* 📅 รายการสั่งก่อนหมดโปร — เจ้าของสั่ง 25 พ.ย. 69
   *"โปรของ Unilever จัดตัดรอบวันนี้ … บางตัวที่มีแถบเหลืองได้หายไป และบางตัวที่ไม่มีได้เพิ่มเข้ามา
     นี่แหละคือเรื่องใหญ่ของทุกเดือนเลย ศูนย์จะต้องมานั่งเช็คเอาเอง ว่าตัวไหนที่หมดโปรไปแล้วเดือนนี้
     และตัวไหนที่มีโปรเพิ่มเข้ามาในเดือนหน้า … เพื่อเตรียมสำหรับให้ศูนย์เตรียมสั่งตุนไว้ช่วงวันที่ 21-24
     ก่อนที่จะขึ้นโปรใหม่ของทุกๆเดือน … แยกเป็น 2 แบบ คือ On Invoice (คาดแถบเหลืองบนชื่อสินค้า)
     และ Off invoice (มีเขียนระบุช่องข้างๆ)"*

   สิ่งที่ต้องพิสูจน์:
     • แยก On Invoice (แถม NFm / ลด W%) กับ Off Invoice (F/O · Rebate · BBF · F/P) และ FTR ได้ถูก
     • เทียบสองรอบแล้วบอกได้ว่า โปรหาย / โปรเพิ่ม / เปลี่ยนเงื่อนไข
     • ⏳ อ่านช่วงวันที่ใบเขียนไว้เอง `(25ตค-24พย)` → รู้ล่วงหน้าว่าหมดวันไหน
     • 🛟 อ่านอย่างเดียวล้วน — กดทุกปุ่มแล้ว POSTATUS/ORDERS/STOCKD ต้องไม่ขยับสักไบต์
     • 🛟 เดือนที่อ่านไม่ออกต้องคืน null ไม่ใช่เดาเป็นวันนี้
   ⛔ รหัส/ชื่อในเทสต์สมมติขึ้นเอง — รีโปเป็นสาธารณะ
   ไฟล์จริงตรวจเพิ่มได้ด้วย  ORDER_BLANK_A=/path/ใบ24.xlsm ORDER_BLANK_B=/path/ใบ25.xlsm node test/browser/promoend.test.cjs
   ต้องติดตั้งก่อน:  npm i --no-save playwright-core */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');
const BROWSER=require('./_chrome.cjs').chromePath();
const RA=process.env.ORDER_BLANK_A&&fs.existsSync(process.env.ORDER_BLANK_A)?process.env.ORDER_BLANK_A:null;
const RB=process.env.ORDER_BLANK_B&&fs.existsSync(process.env.ORDER_BLANK_B)?process.env.ORDER_BLANK_B:null;

/* ข้อความโปรจริงที่เจอในใบ (คัดรูปแบบมา รหัสสมมติเอง) */
const P_ONF   ='โอโมน้ำไวท์ FTROn-inv1F1+On invW%52.80(25ตค-24พย)';
const P_ONW   ='บรีสเอกเซลน้ำเขียว On-inv W%355.92';
const P_OFF   ='F/O 45B.';
const P_REB   ='Rebate W% 160.08 สีส้ม';
const P_BOTH  ='F/O99BFTROn-inv15F1+On-invW%19.2(25พย-27ธค)';
const P_TWIN  ='Twin Pack On-inv W% 211.98';
const P_NONE  ='โอโมน้ำซากุระโรแมนซ์';

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const pg=await (await b.newContext({viewport:{width:1366,height:1000}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.setContent(fs.readFileSync(PAGE,'utf8'),{waitUntil:'domcontentloaded'});
 await pg.addScriptTag({path:require.resolve('xlsx/dist/xlsx.full.min.js')});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);

 await pg.evaluate(`
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};window.__log=[];window.__sync=0;
  window.ulog=m=>window.__log.push(String(m).replace(/<[^>]*>/g,''));
  window.syncToServer=()=>{window.__sync++};window.toast=()=>{};
  window.alert=m=>{window.__alert=String(m)};window.confirm=()=>true;
  window.fetch=()=>Promise.resolve({ok:true,json:()=>Promise.resolve({})});
  S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
  DATA.lines={};DATA.focus_order=[];
  Object.keys(FOCUS_MAP).forEach(c=>{DATA.lines[c]={display:FOCUS_MAP[c],
    type:'CT',focus:true,name:'',emp:''};});
  DATA.daily={};DATA.targets={};DATA.monthly={'2026-11':{}};
  ORDERS={dates:[],data:{},names:{
    '90000001':'สินค้าทดสอบ แถมบนบิล','90000002':'สินค้าทดสอบ ลดบนบิล',
    '90000003':'สินค้าทดสอบ คืนนอกบิล','90000004':'สินค้าทดสอบ รีเบท',
    '90000005':'สินค้าทดสอบ สองแบบ','90000006':'สินค้าทดสอบ แพ็คคู่',
    '90000007':'สินค้าทดสอบ ไม่มีโปร'},cat:{},catN:{}};
  STOCKD={date:'2026-11-25',up:1,names:{},rows:[]};REQUESTS={data:{}};
  PE={a:'',b:'',kind:'all',only:'gone',q:''};
 `);

 /* ---------- 1) ไวยากรณ์โปร ---------- */
 const g=await ev(([onf,onw,off,reb,both,twin,none])=>({
   onf:poPromo(onf),onw:poPromo(onw),off:poPromo(off),reb:poPromo(reb),
   both:poPromo(both),twin:poPromo(twin),none:poPromo(none),
   blank:poPromo(''),junk:poPromo('โอโมน้ำ 1300ml')
 }),[P_ONF,P_ONW,P_OFF,P_REB,P_BOTH,P_TWIN,P_NONE]);
 t('🔑 On Invoice แบบแถม — "On-inv1F1" อ่านได้ว่าซื้อ 1 แถม 1',
   !!g.onf&&g.onf.on.some(x=>x.k==='F'&&x.b===1&&x.f===1),JSON.stringify(g.onf&&g.onf.on));
 t('...และอ่านส่วนลดบนบิลที่มากับมันด้วย (On invW%52.80)',
   !!g.onf&&g.onf.on.some(x=>x.k==='W'&&x.v===52.8),JSON.stringify(g.onf&&g.onf.on));
 t('...และรู้ว่าเป็น FTR ราคาพิเศษด้วย',!!g.onf&&g.onf.ftr===1);
 t('🔑 On Invoice แบบส่วนลด — "On-inv W%355.92" อ่านเป็น W% ไม่ใช่แถม',
   !!g.onw&&g.onw.on.length===1&&g.onw.on[0].k==='W'&&g.onw.on[0].v===355.92,JSON.stringify(g.onw&&g.onw.on));
 t('🔑 Off Invoice — "F/O 45B." อ่านเป็นคืนนอกบิล 45 บาท/หีบ',
   !!g.off&&g.off.off.length===1&&g.off.off[0].k==='FO'&&g.off.off[0].v===45&&g.off.on.length===0,
   JSON.stringify(g.off&&g.off.off));
 t('🔑 Off Invoice — "Rebate" อ่านเป็นนอกบิล ไม่ใช่ On-inv',
   !!g.reb&&g.reb.off.some(x=>x.k==='REB')&&g.reb.on.length===0,JSON.stringify(g.reb&&g.reb.off));
 t('🔑 ตัวที่มีทั้งสองแบบ แยกออกจากกันได้ (F/O99B + On-inv15F1 + On-invW%19.2)',
   !!g.both&&g.both.off.some(x=>x.k==='FO'&&x.v===99)&&
   g.both.on.some(x=>x.k==='F'&&x.b===15&&x.f===1)&&g.both.on.some(x=>x.k==='W'&&x.v===19.2),
   JSON.stringify(g.both));
 t('Twin Pack ติดป้ายไว้ด้วย',!!g.twin&&g.twin.twin===1&&g.twin.on.some(x=>x.k==='W'));
 t('🛟 ชื่อสินค้าเฉย ๆ ที่ไม่มีโปร ต้องคืน null ไม่ใช่ออบเจ็กต์ว่าง',
   g.none===null&&g.blank===null&&g.junk===null,JSON.stringify([g.none,g.blank,g.junk]));

 /* ---------- 2) ช่วงวันที่ใบเขียนไว้เอง ---------- */
 const w=await ev(()=>({
   a:poPromo('FTROn-inv1F1+On invW%52.80(25ตค-24พย)').wEnd,
   b:poPromo('F/O99B On-inv15F1(25พย-27ธค)').wEnd,
   c:poPromo('On-inv 6F1 (25ธค-24มค)').wEnd,
   bad:pmWinEnd(24,'ปป'),big:pmWinEnd(99,'พย'),
   win:poPromo('FTROn-inv1F1(25ตค-24พย)').win}));
 t('🔑 อ่านวงเล็บช่วงวันของใบได้ — (25ตค-24พย) หมด 24 พ.ย.',
   /-11-24$/.test(w.a||''),w.a);
 t('...(25พย-27ธค) หมด 27 ธ.ค. · (25ธค-24มค) หมด 24 ม.ค.',
   /-12-27$/.test(w.b||'')&&/-01-24$/.test(w.c||''),w.b+' / '+w.c);
 t('...และเก็บข้อความช่วงวันดิบไว้โชว์ด้วย',w.win==='(25ตค-24พย)',w.win);
 t('🛟 เดือนที่อ่านไม่ออก / วันที่เกินจริง ต้องคืน null ไม่ใช่เดาเป็นวันนี้',
   w.bad===null&&w.big===null,JSON.stringify([w.bad,w.big]));

 /* ---------- 3) เทียบสองรอบ ---------- */
 const mk=(items)=>({up:1,file:'t.xlsm',items:items,all:Object.keys(items).join(',')});
 const d=await ev(([onf,onw,off,reb,both,twin])=>{
   POSTATUS={dates:['2026-11-24','2026-11-25'],data:{
     '2026-11-24':{up:1,file:'a.xlsm',all:'90000001,90000002,90000003,90000004,90000005,90000006,90000007',
       items:{'90000001':{pm:onf,p:'1F1'},'90000002':{pm:onw},'90000003':{pm:off},
              '90000004':{pm:reb},'90000005':{pm:both},'90000006':{pm:twin},'90000007':{}}},
     '2026-11-25':{up:2,file:'b.xlsm',all:'90000001,90000002,90000003,90000004,90000005,90000006,90000007',
       /* 1 หมดโปร · 2 เปลี่ยนจาก W%355.92 เป็น W%180.66 · 3 เหมือนเดิม · 4 หมด ·
          5 เหมือนเดิม · 6 เหมือนเดิม · 7 เพิ่งมีโปร */
       items:{'90000001':{},'90000002':{pm:'บรีสเอกเซลน้ำเขียว On-inv W%180.66'},
              '90000003':{pm:off},'90000004':{},'90000005':{pm:both},'90000006':{pm:twin},
              '90000007':{pm:'โอโมน้ำซากุระ On-inv 6F1'}}}}};
   PE={a:'',b:'',kind:'all',only:'gone',q:''};
   const p=pePick(),r=peDiff(psDay(p.a),psDay(p.b));
   return {pick:p,gone:r.gone.map(x=>x.c),add:r.add.map(x=>x.c),chg:r.chg.map(x=>x.c)};
 },[P_ONF,P_ONW,P_OFF,P_REB,P_BOTH,P_TWIN]);
 t('🔑 เลือกรอบให้เอง — รอบใหม่สุดเทียบกับรอบก่อนหน้า',
   d.pick.a==='2026-11-24'&&d.pick.b==='2026-11-25',JSON.stringify(d.pick));
 t('🔑 บอกได้ว่าโปรตัวไหนหายไป (นี่คือของที่ต้องสั่งตุนก่อนวันที่ 25)',
   d.gone.join(',')==='90000001,90000004',d.gone.join(','));
 t('🔑 บอกได้ว่าโปรตัวไหนเพิ่งเพิ่มเข้ามา',d.add.join(',')==='90000007',d.add.join(','));
 t('🔑 บอกได้ว่าตัวไหนยังมีโปรแต่เงื่อนไขเปลี่ยน',d.chg.join(',')==='90000002',d.chg.join(','));
 t('🛟 ตัวที่โปรเหมือนเดิมเป๊ะ ต้องไม่ขึ้นในลิสต์ไหนเลย',
   ['90000003','90000005','90000006'].every(c=>d.gone.concat(d.add,d.chg).indexOf(c)<0),
   d.gone.concat(d.add,d.chg).join(','));

 /* ---------- 4) กรองตามชนิดโปร ---------- */
 const k=await ev(()=>{
   const p=pePick(),r=peDiff(psDay(p.a),psDay(p.b)),o={};
   ['all','on','off','ftr'].forEach(kk=>{PE.kind=kk;
     o[kk]=r.gone.filter(x=>peHasKind(x.pa,kk)).map(x=>x.c);});
   PE.kind='all';return o;});
 t('🔑 กรองเฉพาะ On Invoice ได้ (90000001 แถม+ลดบนบิล)',k.on.join(',')==='90000001',k.on.join(','));
 t('🔑 กรองเฉพาะ Off Invoice ได้ (90000004 Rebate)',k.off.join(',')==='90000004',k.off.join(','));
 t('🔑 กรองเฉพาะ FTR ได้',k.ftr.join(',')==='90000001',k.ftr.join(','));

 /* ---------- 5) ⏳ โปรที่ใบบอกเองว่าใกล้หมด ---------- */
 const e=await ev(()=>{
   const near=peEnding(psDay('2026-11-24'),40).map(x=>x.c+'@'+x.p.wEnd);
   const far=peEnding(psDay('2026-11-24'),1).map(x=>x.c);
   return {near:near,far:far};});
 t('⏳ อ่านรายการที่ใบเขียนช่วงวันไว้ และเรียงตามวันหมด',
   e.near.length>=1&&/90000005@/.test(e.near.join(',')),e.near.join(' · '));
 t('...ช่วงที่แคบลง ต้องได้น้อยลง (ไม่ใช่คงที่)',e.far.length<=e.near.length,
   e.far.length+' / '+e.near.length);

 /* ---------- 6) หน้าจอ ---------- */
 const ui=await ev(()=>{
   initOrder();_switchTab('order');ordSetSec('pe');
   const el=document.getElementById('peBody');
   const o={gone:el.textContent.replace(/\s+/g,' ')};
   peSetOnly('add');o.add=el.textContent.replace(/\s+/g,' ');
   peSetOnly('end');o.end=el.textContent.replace(/\s+/g,' ');
   peSetOnly('gone');
   o.tabBtn=[...document.querySelectorAll('#ordSubTabs .pos-st')].map(b=>b.dataset.k).join(',');
   return o;});
 t('🔑 มีแท็บย่อย "รายการสั่งก่อนหมดโปร" ในหมวดการสั่งของ',
   /(^|,)pe(,|$)/.test(ui.tabBtn),ui.tabBtn);
 t('...หน้าบอกจำนวนทั้ง 4 กลุ่ม และบอกให้สั่งตุนช่วง 21-24',
   /โปรหมดไปแล้ว/.test(ui.gone)&&/โปรเพิ่มเข้ามา/.test(ui.gone)&&
   /เปลี่ยนเงื่อนไข/.test(ui.gone)&&/21-24/.test(ui.gone));
 t('...อธิบายความต่างของ On Invoice กับ Off Invoice ไว้บนหน้า',
   /ลดให้บนบิลเลย/.test(ui.gone)&&/ได้คืนทีหลัง/.test(ui.gone));
 t('...สลับดูกลุ่มโปรเพิ่ม และกลุ่มใกล้หมดได้',
   /ไม่ต้องรีบสั่งตุน/.test(ui.add)&&/เขียนช่วงวันของโปรไว้เอง/.test(ui.end));

 /* ---------- 6ข) 🔑 ใบที่อัพไว้ก่อนระบบจะอ่านโปรเป็น ต้องบอก ไม่ใช่โชว์ 0 ----------
    เจ้าของเจอเอง 25 พ.ย. 69: อัพใบสองใบไว้ก่อนแล้ว เปิดหน้ามาเห็น 0 ทุกช่อง */
 const old=await ev(()=>{
   const keep=JSON.parse(JSON.stringify(POSTATUS));
   POSTATUS={dates:['2026-11-24','2026-11-25'],data:{
     '2026-11-24':{up:1,file:'a.xlsm',items:{'90000001':{p:'6F1'}},all:'90000001'},
     '2026-11-25':{up:2,file:'b.xlsm',items:{'90000001':{}},all:'90000001'}}};
   PE={a:'',b:'',kind:'all',only:'gone',q:'',pi:null};
   renderPromoEnd();
   const t=document.getElementById('peBody').textContent.replace(/\s+/g,' ');
   const o={warn:/อัพไว้ก่อนที่ระบบจะอ่านโปรเป็น/.test(t),
     how:/อัพใบเดิมซ้ำอีกครั้งเดียว/.test(t),
     keepData:/ข้อมูลเดิมไม่หาย/.test(t),
     hasPmOld:peHasPm(psDay('2026-11-25'))};
   POSTATUS=keep;renderPromoEnd();
   o.noWarnNow=!/อัพไว้ก่อนที่ระบบจะอ่านโปรเป็น/
     .test(document.getElementById('peBody').textContent);
   return o;});
 t('🔑 ใบที่อัพไว้ก่อนระบบจะอ่านโปรเป็น ต้องขึ้นเตือน ไม่ใช่โชว์ 0 เฉย ๆ',
   old.warn&&old.hasPmOld===false,JSON.stringify(old));
 t('...และบอกวิธีแก้ (อัพใบเดิมซ้ำครั้งเดียว) พร้อมย้ำว่าข้อมูลเดิมไม่หาย',
   old.how&&old.keepData);
 t('🛟 ใบที่อ่านด้วยตัวอ่านใหม่แล้ว ต้องไม่ขึ้นเตือนนี้',old.noWarnNow);

 /* ---------- 6ค) 💰 เทียบส่วนลดสองรอบจากไฟล์ราคา ---------- */
 const pr=await ev(()=>{
   /* ไฟล์ราคาจำลอง: รอบ A มีส่วนลด รอบ B ไม่มี (= โปรหมด) และตรงข้าม */
   PRICE={loaded:true,err:'',bum:null,hs:{rounds:['Nov\'26','Dec\'26'],items:{
     '90000001':{m:[[1000,1020,100,250,80,80,100,90,'FTR'],[1000,1020,100,0,80,80,100,90,'']],ip:1},
     '90000002':{m:[[900,918,90,0,70,70,90,80,''],[900,918,90,120,70,70,90,80,'']],ip:1},
     '90000003':{m:[[800,816,80,60,60,60,80,70,''],[800,816,80,20,60,60,80,70,'']],ip:1},
     '90000004':{m:[[700,714,70,30,50,50,70,60,''],[700,714,70,30,50,50,70,60,'']],ip:1}}}};
   PE.pi=0;PE.only='pr';PE.q='';
   const d=pePrDiff(0,1);
   renderPromoEnd();
   const t=document.getElementById('peBody').textContent.replace(/\s+/g,' ');
   return {gone:d.gone.map(x=>x.c),add:d.add.map(x=>x.c),down:d.down.map(x=>x.c),
     up:d.up.map(x=>x.c),rounds:pePrRounds(),
     shows:/ส่วนลดหายรอบหน้า/.test(t)&&/รู้ได้ตั้งแต่ก่อนได้ใบสั่งวันที่ 25/.test(t),
     warnsOnOff:/รวม on-invoice กับ rebate ไว้ด้วยกัน/.test(t)};});
 t('🔑 ไฟล์ราคาหัวเสือมีหลายรอบในไฟล์เดียว — เทียบรอบต่อรอบได้',
   pr.rounds.length===2,pr.rounds.join(' → '));
 t('🔑 บอกได้ว่ารอบหน้าส่วนลดตัวไหนหาย (รู้ก่อนได้ใบวันที่ 25)',
   pr.gone.join(',')==='90000001',pr.gone.join(','));
 t('...ตัวไหนเพิ่งมีส่วนลดรอบหน้า',pr.add.join(',')==='90000002',pr.add.join(','));
 t('...ตัวไหนส่วนลดลดลง (60 → 20)',pr.down.join(',')==='90000003',pr.down.join(','));
 t('🛟 ตัวที่ส่วนลดเท่าเดิม ต้องไม่ขึ้นในลิสต์ไหนเลย',
   pr.gone.concat(pr.add,pr.down,pr.up).indexOf('90000004')<0);
 t('...หน้าบอกว่านี่คือทางที่รู้ก่อนได้ใบวันที่ 25',pr.shows);
 t('🛟 ...และบอกตรง ๆ ว่า W% ของหัวเสือรวม on-invoice กับ rebate ไว้ด้วยกัน (ไม่เคลมเกินข้อมูล)',
   pr.warnsOnOff);

 /* ---------- 6ง) 📕 เช็คโปรหมดจากไฟล์ BUM (เจ้าของสั่ง 25 พ.ย. 69) ----------
    *"ให้ใช้ข้อมูลจากไฟล์ bum ในการดู ว่าตัวไหนที่จะหมดโปร … ไม่งั้นผมก็สั่งวันที่ 24 ไม่ทัน"*
    ไฟล์ BUM มีสองรอบในไฟล์เดียว จึงบอกได้ก่อนได้ใบสั่งวันที่ 25 */
 const mkBum=()=>{
   /* [ws,pack,tpr,on,rb,cf,sp,x,y,rspN,rspP,rem,bbf,p9tpr,p9on,p9rb,ex]
      p9* = รอบเก่า · tpr/on/rb = รอบใหม่ */
   return {loaded:true,err:'',bum:{file:'BUM_DT_Dec26.xlsx',mon:'เดือนธันวาคม 2569',
     bm:{new:'BM12',old:'BM11'},items:{
     /* เงินคืนนอกบิลหายทั้งก้อน -> ต้องสั่งตุน */
     '90000001':[1000,12,0,0,0,40,10,900,960,100,0,'  Rebate','',0,0,500,null],
     /* ลดบนบิลหาย */
     '90000002':[900,12,0,0,0,40,10,800,860,90,0,'','',0,300,0,null],
     /* TPR หาย */
     '90000003':[800,12,0,0,0,40,10,700,750,80,0,'FTR','',200,0,0,null],
     /* โปรเพิ่มเข้ามารอบใหม่ -> รอได้ */
     '90000004':[700,12,0,150,0,40,10,600,640,70,0,'','',0,0,0,
       {w:150,iv:'ON',s:'01/12/2026',e:'31/12/2026'}],
     /* ยังมีแต่ได้น้อยลง */
     '90000005':[600,12,0,0,80,40,10,500,540,60,0,'','',0,0,200,null],
     /* ไม่เปลี่ยนเลย */
     '90000006':[500,12,50,0,0,40,10,400,430,50,0,'','',50,0,0,null],
     /* เงินคืนหาย และไฟล์ยังเขียนเงื่อนไขของแถมไว้ด้วย: ซื้อ 15 แถม 1 */
     '90000007':[400,12,0,0,0,40,10,300,320,40,0,'','',0,0,90,
       {fb:15,fq:1,fc:'90000007',fe:'31/12/2026'}]}},hs:null};
 };
 await ev(new Function('return '+mkBum.toString().replace(/^\(\)=>/,'()=>')+';')
   ? `window.__mkBum=${mkBum.toString()};` : '');
 const bum=await ev(()=>{
   const keepP=JSON.stringify(PRICE||{}),keepU=JSON.stringify(S.user||{});
   S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
   PRICE=window.__mkBum();
   const d=peBumDiff();
   PE.only='bum';PE.q='';renderPromoEnd();
   const tx=document.getElementById('peBody').textContent.replace(/\s+/g,' ');
   const o={n:d.n,gone:d.gone.map(r=>r.c),add:d.add.map(r=>r.c),chg:d.chg.map(r=>r.c),
     save:d.save.map(r=>[r.c,r.d]),wait:d.wait.map(r=>r.c),ch:d.ch,
     pairOld:(peBumPair()||{}).labOld,pairNew:(peBumPair()||{}).labNew,
     shows:/อ่านจากไฟล์ BUM/.test(tx)&&/รู้ก่อนได้ใบสั่งวันที่ 25/.test(tx),
     sayWin:/01\/12\/2026/.test(tx), sayFree:/ซื้อ 15 แถม 1/.test(tx),
     noOldWarn:!/ก่อนที่ระบบจะอ่านบล็อคเงื่อนไขโปรเป็น/.test(tx)};
   /* ไฟล์ BUM รุ่นเก่า (array สั้นกว่า ไม่มีช่อง ex) ต้องไม่พัง และต้องบอกให้อัพซ้ำ */
   Object.keys(PRICE.bum.items).forEach(c=>{PRICE.bum.items[c]=PRICE.bum.items[c].slice(0,16);});
   renderPromoEnd();
   const tx2=document.getElementById('peBody').textContent.replace(/\s+/g,' ');
   o.oldOk=/หมดโปรรอบหน้า/.test(tx2);
   o.oldWarn=/ก่อนที่ระบบจะอ่านบล็อคเงื่อนไขโปรเป็น/.test(tx2)&&/อัพไฟล์ BUM เดิมซ้ำ/.test(tx2);
   /* เซลล์ต้องไม่เห็นตัวเลขจากไฟล์ BUM เลย (เป็นต้นทุนศูนย์) */
   PRICE=window.__mkBum();
   S.user={id:'CT11',role:'sales',name:'เซลล์'};
   PE.only='bum';renderPromoEnd();
   const tx3=document.getElementById('peBody').textContent.replace(/\s+/g,' ');
   o.salesBlocked=/เปิดได้เฉพาะผู้จัดการ/.test(tx3)&&tx3.indexOf('90000001')<0;
   o.salesHasBum=peHasBum();
   PRICE=JSON.parse(keepP);S.user=JSON.parse(keepU);PE.only='gone';renderPromoEnd();
   return o;});
 t('🔑 ไฟล์ BUM มีสองรอบในไฟล์เดียว — เทียบได้โดยไม่ต้องรอใบสั่งวันที่ 25',
   bum.n===7,JSON.stringify({n:bum.n}));
 t('🔑 บอกได้ว่าตัวไหนหมดโปรรอบหน้า',
   bum.gone.join(',')==='90000001,90000002,90000003,90000007',bum.gone.join(','));
 t('...ตัวไหนเพิ่งมีโปรรอบหน้า',bum.add.join(',')==='90000004',bum.add.join(','));
 t('...ตัวไหนยังมีโปรแต่ได้น้อยลง',bum.chg.join(',')==='90000005',bum.chg.join(','));
 t('🛟 ตัวที่ส่วนลดเท่าเดิม ต้องไม่โผล่ในลิสต์ไหนเลย',
   bum.gone.concat(bum.add,bum.chg).indexOf('90000006')<0);
 t('🔑 แยกได้ว่าหายจากช่องไหน — ลดบนบิล / เงินคืนนอกบิล / TPR (มีแต่ไฟล์ BUM ที่แยกได้)',
   bum.ch.on.gone===1&&bum.ch.rb.gone===2&&bum.ch.tpr.gone===1&&bum.ch.on.add===1,
   JSON.stringify(bum.ch));
 t('🔑 ลิสต์ "ต้องสั่งตุนก่อน 25" เรียงจากที่เสียเงินเพิ่มมากสุด',
   bum.save.map(x=>x[0]).join(',')==='90000001,90000002,90000003,90000005,90000007'&&bum.save[0][1]===500,
   JSON.stringify(bum.save));
 t('...และบอกด้วยว่าตัวไหนรอรอบหน้าคุ้มกว่า',bum.wait.join(',')==='90000004',bum.wait.join(','));
 t('🔑 จับคู่รอบ BUM กับรอบไฟล์ราคาได้ (ห้ามอ่านเลข BM ว่าเดือนนี้/เดือนหน้า)',
   bum.pairOld==='BM11'&&bum.pairNew==='BM12',bum.pairOld+' → '+bum.pairNew);
 t('...หน้าบอกชัดว่านี่คือทางที่รู้ก่อนได้ใบสั่งวันที่ 25',bum.shows);
 t('🔑 โชว์ช่วงวันของโปร และเงื่อนไขของแถม ที่ไฟล์เขียนไว้เอง',
   bum.sayWin&&bum.sayFree&&bum.noOldWarn,JSON.stringify({w:bum.sayWin,f:bum.sayFree}));
 t('🛟 ไฟล์ BUM รุ่นเก่า (ไม่มีช่องเงื่อนไข) ต้องยังคิดส่วนลดได้ ไม่พัง',bum.oldOk);
 t('...และบอกให้อัพไฟล์เดิมซ้ำ ถ้าอยากเห็นเงื่อนไขละเอียด',bum.oldWarn);
 t('🔒 เซลล์ต้องไม่เห็นตัวเลขจากไฟล์ BUM เลย (เป็นต้นทุนของศูนย์)',
   bum.salesBlocked&&bum.salesHasBum===false,JSON.stringify({b:bum.salesBlocked,h:bum.salesHasBum}));

 /* ---------- 6จ) 📕 ไม่มีใบสั่งเลย ก็ต้องเช็คโปรหมดจากไฟล์ราคาได้ ----------
    นี่คือหัวใจของสิ่งที่เจ้าของขอ: ไม่ต้องรอใบสั่งวันที่ 25 */
 const noOrd=await ev(()=>{
   const keep=JSON.stringify(POSTATUS),keepP=JSON.stringify(PRICE||{});
   POSTATUS={dates:[],data:{}};
   S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
   PRICE=window.__mkBum();PE.only='';
   renderPromoEnd();
   const tx=document.getElementById('peBody').textContent.replace(/\s+/g,' ');
   const o={sec:peSec(),open:/หมดโปรรอบหน้า/.test(tx),tab:/เช็คจากไฟล์ BUM/.test(tx)};
   POSTATUS=JSON.parse(keep);PRICE=JSON.parse(keepP);PE.only='gone';renderPromoEnd();
   return o;});
 t('🔑 ยังไม่มีใบสั่งสักใบ ก็เปิดหน้าเช็คโปรหมดจากไฟล์ BUM ได้',
   noOrd.open&&noOrd.tab,JSON.stringify(noOrd));
 t('...และเปิดมาอยู่ที่หน้า BUM ให้เลย เมื่อผู้จัดการมีไฟล์ BUM แล้ว',noOrd.sec==='bum');

 /* ---------- 7) 🛟 อ่านอย่างเดียว ---------- */
 const ro=await ev(()=>{
   const snap=()=>JSON.stringify({P:POSTATUS,O:ORDERS,S:STOCKD,R:REQUESTS});
   const before=snap(),s0=window.__sync;
   ['gone','add','chg','end'].forEach(k=>peSetOnly(k));
   ['all','on','off','ftr'].forEach(k=>peSetKind(k));
   peQ('90000001');peQ('');
   peSetB('2026-11-25');peSetA('2026-11-24');
   peSetOnly('pr');peSetPi(0);
   PRICE=window.__mkBum();peSetOnly('bum');
   peSetOnly('gone');peSetKind('all');
   return {same:snap()===before,sync:window.__sync-s0};});
 t('🛟 กดทุกปุ่มบนหน้านี้แล้ว ข้อมูลไม่ขยับแม้แต่ไบต์เดียว',ro.same);
 t('🛟 ...และไม่สั่งบันทึกขึ้นเซิร์ฟเวอร์เลย',ro.sync===0,ro.sync);

 /* ---------- 8) ไฟล์จริง (ถ้ามี) ---------- */
 if(RA&&RB){
   const real=await ev(async([a,b])=>{
     POSTATUS={dates:[],data:{}};ORDERS={dates:[],data:{},names:{},cat:{},catN:{}};
     for(const [b64,n] of [[a,'blank_241126.xlsm'],[b,'blank_251126.xlsm']]){
       const bin=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));
       await parseOrderForm(n,bin.buffer,'blank');
     }
     const ds=psDates(),aD=psDay(ds[0]),bD=psDay(ds[1]);
     const r=peDiff(aD,bD);
     const yel=Object.keys(bD.items).filter(c=>bD.items[c].p);
     const yelNF=yel.filter(c=>{const p=psPromoOf(bD,c);return p&&p.on.some(x=>x.k==='F');});
     return {ds:ds,gone:r.gone.length,add:r.add.length,chg:r.chg.length,
       yel:yel.length,yelNF:yelNF.length,
       kb:Math.round(JSON.stringify(bD).length/1024),
       pm:Object.keys(bD.items).filter(c=>bD.items[c].pm).length};
   },[fs.readFileSync(RA).toString('base64'),fs.readFileSync(RB).toString('base64')]);
   t('📄 ไฟล์จริง: อ่านใบสองรอบแล้วเทียบได้ (โปรหาย/เพิ่ม/เปลี่ยน มีครบ)',
     real.gone>50&&real.add>0&&real.chg>0,JSON.stringify(real));
   t('📄 ไฟล์จริง: 🔑 แถบเหลืองทุกตัว = On-inv แบบแถม (NFm) ไม่มีตัวไหนหลุด',
     real.yel>0&&real.yel===real.yelNF,real.yelNF+' / '+real.yel);
   t('📄 ไฟล์จริง: เก็บข้อความโปรเฉพาะตัวที่มีโปรจริง ขนาดต่อรอบไม่บาน (<120 KB)',
     real.kb<120&&real.pm>0,real.pm+' รหัส · '+real.kb+' KB');
 }else{
   console.log('  (ข้าม 3 ข้อของไฟล์จริง — ตั้ง ORDER_BLANK_A=... ORDER_BLANK_B=... เพื่อตรวจเพิ่ม)');
 }

 let bad=0;A.forEach(([c,n,x])=>{if(!c)bad++;console.log((c?'  ✓ ':'  ✗ FAIL: ')+n+(x&&!c?' → '+x:''));});
 const re=errs.filter(e=>!/localStorage/.test(e));
 if(re.length){console.log('PAGE ERRORS:');re.forEach(e=>console.log('   '+e));bad+=re.length;}
 await b.close();
 console.log('\n'+(bad?bad+' FAILED of '+A.length:'ALL PASS ('+A.length+' checks)'));
 process.exit(bad?1:0);
})();
