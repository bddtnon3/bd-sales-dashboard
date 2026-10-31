/* 📦 สต็อคกลาง — ของที่ "ตัดบิลไว้ก่อน" แล้วยังค้างรอหาที่ขาย (เจ้าของสั่ง 31 ต.ค. 69)
 *
 * ธุรกิจ: ศูนย์ตัดบิลเอายอดขาย ณ ตอนนั้นไปก่อน แล้วค่อยหาที่ระบายทีหลัง
 *   *"มันมีปัญหาคือบางทีหลุดหรือลืมไว้ ว่ามีตัวนี้ที่ตัดทิ้งไว้อยู่"*
 *
 * ไฟล์เดิมของเจ้าของเป็นรายงานบิลดิบ 906 บิล ไม่มีช่องติดตามการเคลียร์เลย
 * สถานะคงเหลือถูกพิมพ์มือไว้ในหมายเหตุ และ **ไม่ตรงกับเลขของตัวเอง**:
 *   "โอโมน้ำ พิง ฟลอรัล 85 ลัง … คุณกราณรุ้ง 50 ลัง และ ลัดดาวัล 5 ลัง คงเหลือ 12 ลัง"
 *   85 − 50 − 5 = 30 ไม่ใช่ 12
 * นี่คือเหตุผลที่ "คงเหลือ" ต้องคำนวณเสมอ ห้ามให้ใครพิมพ์เอง
 *
 * สิ่งที่ต้องพิสูจน์:
 *  1) ไฟล์ฟอร์มที่สร้างให้แอดมิน มีครบ 3 ชีต หัวคอลัมน์ตรงกับที่ตัวอ่านต้องการ
 *     และช่อง "คงเหลือ" เป็น **สูตร** ไม่ใช่ตัวเลขที่พิมพ์ได้
 *  2) สร้าง → กรอก → อ่านกลับ ได้ข้อมูลเดิมครบ (round-trip)
 *  3) คงเหลือ = ตัดไว้ − รวมที่เคลียร์ เสมอ ไม่ว่าจะมีใครพิมพ์อะไรไว้
 *  4) ไฟล์ผิดรูปต้องฟ้องให้ชัด ไม่ใช่เงียบแล้วเก็บข้อมูลผิด
 *     (ไม่มีชีต · หัวตารางหาย · รหัสลอตซ้ำ · แถวเคลียร์อ้างลอตที่ไม่มี)
 *  5) 🛟 อัพไฟล์ที่มีไม่ครบทุกลอต ต้องไม่ลบลอตเดิมที่ระบบเก็บไว้
 *  6) 🛟 การดู/กรอง/กางดูรายละเอียด ไม่แตะข้อมูลสักไบต์
 *
 * ต้องติดตั้งก่อน:  npm i --no-save playwright-core xlsx
 * แล้วรัน:  node build.cjs && node test/browser/cstock.test.cjs
 */
const fs=require('fs');const path=require('path');const os=require('os');
const {chromium}=require('playwright-core');
const XLSX=require('xlsx');
const BROWSER=require('./_chrome.cjs').chromePath();
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');

const BLOBS=`JSON.stringify({DATA,STORE,KPI,ORDERS,STOCKD,REQUESTS,MASTER,ANALYTICS,STOREPROD,
  STOREDAILY,PSTORE,EB2B,POSTATUS,LEADS,DCI,MINSTOCK,PLAN,PROMO,PJP})`;

/* 4 ลอตจริงที่อ่านได้จากไฟล์ Stock_2026.xlsx ของเจ้าของ (บล็อกที่ 3 มี 2 สินค้า จึงแยกเป็น 2 ลอต) */
const LOTS=[
 {id:'ST-01',d:'2026-10-22',own:'PT',tag:'Stock PT',code:'',nm:'คอมฟอร์ท อินโนเซนท์ บูส + คอมฟอร์ท ซากุระ',
  cs:10,pc:0,val:2228.40,bills:30,rt:'209619',note:'',clr:[]},
 {id:'ST-02',d:'2026-10-27',own:'พี่แอ๊ะ',tag:'Stock กลาง',code:'',nm:'โอโม ซอฟท์ ทัช',
  cs:11,pc:0,val:6549.84,bills:132,rt:'209611,209612,209614,209617,209622',note:'',clr:[]},
 {id:'ST-03',d:'2026-10-12',own:'สองเมือง',tag:'Stock สองเมือง',code:'',nm:'โอโม ซอฟท์ ทัช',
  cs:64,pc:0,val:0,bills:0,rt:'209611-209622',note:'ยอดเงิน/จำนวนบิลรวมกับ ST-04 ในไฟล์เดิม',
  clr:[{d:'',who:'คุณกรานรุ้ง',cs:64,pc:0,note:'ตัดบิลส่งหมดแล้ว'}]},
 {id:'ST-04',d:'2026-10-12',own:'สองเมือง',tag:'Stock สองเมือง',code:'',nm:'โอโมน้ำ พิง ฟลอรัล',
  cs:85,pc:0,val:35130.96,bills:708,rt:'209611-209622',note:'หมายเหตุเดิมเขียนว่าคงเหลือ 12 ลัง แต่ 85−50−5=30',
  clr:[{d:'',who:'คุณกราณรุ้ง',cs:50,pc:0,note:''},{d:'',who:'ลัดดาวัล',cs:5,pc:0,note:''}]},
 {id:'ST-05',d:'2026-10-29',own:'พี่แอ๊ะ',tag:'Stock พี่แอ๊ะ รับผิดชอบเอง',code:'',nm:'คนอร์',
  cs:4,pc:48,val:3515.04,bills:36,rt:'209615,209617,209622',note:'',clr:[]},
];

function seed(a){
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};window.__log=[];window.ulog=m=>window.__log.push(String(m));
  window.__alerts=[];window.alert=m=>window.__alerts.push(String(m));window.confirm=()=>true;
  window.__posts=[];window.fetch=u=>{window.__posts.push(String(u));
    return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({ok:true})});};
  window.__sync=0;window.syncToServer=()=>{window.__sync++;};
  TOKEN=null;S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
  DATA={lines:{},focus_order:[],targets:{},daily:{},monthly:{}};
  STORE={months:[],stores:[]};KPI={};ANALYTICS={months:[],data:{}};STOREPROD={months:[],cat:{},stores:{},data:{}};
  STOREDAILY={data:{}};PSTORE={rounds:{}};EB2B={asof:null,up:0,lines:{},data:{}};LEADS={meta:{},sales:{},del:{}};
  DCI={};MINSTOCK={};PLAN={items:{},done:{},del:{}};PROMO={items:{},res:{},del:{}};
  PJP={out:{},plan:{},done:{},cfg:{}};ORDERS={dates:[],data:{},names:{},cat:{},catN:{}};
  POSTATUS={dates:[],data:{}};STOCKD={date:null,rows:[],names:{}};MASTER={items:{}};REQUESTS={data:{}};
  CSTOCK={lots:{},del:{},up:0};
  (a.LOTS||[]).forEach(l=>{CSTOCK.lots[l.id]=JSON.parse(JSON.stringify(l));CSTOCK.lots[l.id].up=1000;});
  CSTOCK.up=1000;
  CST.q='';CST.only='open';CST.open={};
}

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:1100,height:1000},acceptDownloads:true});
 const pg=await ctx.newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.setContent(fs.readFileSync(PAGE,'utf8'),{waitUntil:'domcontentloaded'});
 await pg.addScriptTag({path:require.resolve('xlsx/dist/xlsx.full.min.js')});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);
 await ev(seed,{LOTS});

 /* ---------- 1) ไฟล์ฟอร์ม ---------- */
 const [dl]=await Promise.all([pg.waitForEvent('download'),ev(()=>cstTemplate())]);
 const out=path.join(os.tmpdir(),'bd-cstock-template.xlsx');
 await dl.saveAs(out);
 const keep=path.join(process.env.KEEP_DIR||os.tmpdir(),'BD-central-stock-template.xlsx');
 try{fs.copyFileSync(out,keep);}catch(e){}
 t('ชื่อไฟล์ที่โหลดเป็น ASCII ล้วน (Chromium ทิ้งชื่อไฟล์ไทยทั้งนามสกุล)',
   /^[A-Za-z0-9.\-]+\.xlsx$/.test(dl.suggestedFilename()),dl.suggestedFilename());
 const wb=XLSX.readFile(out);
 t('ไฟล์ฟอร์มมี 3 ชีต: ลอตตัดบิล · การเคลียร์ · วิธีกรอก',
   wb.SheetNames.join(' | ')==='ลอตตัดบิล | การเคลียร์ | วิธีกรอก',wb.SheetNames.join(' | '));
 const L=XLSX.utils.sheet_to_json(wb.Sheets['ลอตตัดบิล'],{header:1,raw:true,defval:null});
 const Cs=XLSX.utils.sheet_to_json(wb.Sheets['การเคลียร์'],{header:1,raw:true,defval:null});
 const head=L[0].map(x=>String(x==null?'':x).trim());
 t('หัวตารางชีตลอตครบและเรียงตามที่ตัวอ่านคาด',
   head.slice(0,12).join(',')==='รหัสลอต,วันที่ตัดบิล,ผู้รับผิดชอบ,ป้ายในบิล,รหัสสินค้า,ชื่อสินค้า,จำนวนลัง,จำนวนชิ้น,มูลค่า (บาท),จำนวนบิล,เส้นทางที่ตัด,หมายเหตุ',
   head.join(','));
 t('...และมี 3 คอลัมน์ที่ Excel คำนวณเอง (เคลียร์แล้ว / คงเหลือ / สถานะ)',
   head.slice(12).join(',')==='เคลียร์แล้ว (ลัง),คงเหลือ (ลัง),สถานะ',head.slice(12).join(','));
 t('ชีตลอตมีครบทุกลอตที่ระบบเก็บไว้',L.length-1===LOTS.length,(L.length-1)+' แถว');
 t('หัวตารางชีตการเคลียร์ครบ',
   Cs[0].map(x=>String(x).trim()).join(',')==='รหัสลอต,วันที่เคลียร์,เคลียร์ให้ใคร,จำนวนลัง,จำนวนชิ้น,หมายเหตุ',
   Cs[0].join(','));
 t('ชีตการเคลียร์มีครบทุกครั้งที่เคยเคลียร์',Cs.length-1===3,(Cs.length-1)+' แถว');
 /* 🔑 คงเหลือต้องเป็นสูตร ไม่ใช่ตัวเลขที่พิมพ์ทับได้ */
 const cellF=wb.Sheets['ลอตตัดบิล']['N2'],cellM=wb.Sheets['ลอตตัดบิล']['M2'],cellO=wb.Sheets['ลอตตัดบิล']['O2'];
 t('🔑 ช่อง "เคลียร์แล้ว" เป็นสูตรรวมจากชีตการเคลียร์',
   !!(cellM&&cellM.f)&&/SUMIF/.test(cellM.f),cellM&&cellM.f);
 t('🔑 ช่อง "คงเหลือ" เป็นสูตร (ตัดไว้ − เคลียร์แล้ว) ไม่ใช่เลขพิมพ์มือ',
   !!(cellF&&cellF.f)&&/G2-M2/.test(cellF.f.replace(/\s/g,'')),cellF&&cellF.f);
 t('🔑 ช่อง "สถานะ" เป็นสูตรเช่นกัน',!!(cellO&&cellO.f),cellO&&cellO.f);
 const help=XLSX.utils.sheet_to_json(wb.Sheets['วิธีกรอก'],{header:1,defval:null})
   .map(r=>(r||[]).join(' ')).join('\n');
 t('ชีตวิธีกรอกบอกกฎข้อสำคัญ: ห้ามพิมพ์คงเหลือเอง',/ห้ามพิมพ์ "คงเหลือ" เอง/.test(help),'ok');
 t('...และบอกว่าเคลียร์ของออกแล้วให้เพิ่มแถวในชีตการเคลียร์ ไม่ใช่ไปแก้จำนวนเดิม',
   /เพิ่ม 1 แถวในชีต/.test(help)&&/ไม่ต้องไปแก้จำนวนในชีตแรก/.test(help),'ok');

 /* ---------- 2) อ่านกลับ (round-trip) ---------- */
 const b64=fs.readFileSync(out).toString('base64');
 const back=await ev(a=>{
   CSTOCK={lots:{},del:{},up:0};window.__log=[];
   parseCStock('BD-central-stock.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   const o={};Object.keys(CSTOCK.lots).forEach(k=>{const l=CSTOCK.lots[k];
     o[k]={d:l.d,own:l.own,tag:l.tag,nm:l.nm,cs:l.cs,pc:l.pc,val:l.val,bills:l.bills,rt:l.rt,note:l.note,
       clr:(l.clr||[]).map(c=>({who:c.who,cs:c.cs,note:c.note})),left:cstLeft(l),done:cstDone(l)};});
   return {lots:o,n:Object.keys(CSTOCK.lots).length,log:window.__log.join('\n')};
 },{b64});
 t('อ่านไฟล์กลับได้ครบทุกลอต',back.n===LOTS.length,back.n+' ลอต');
 const r1=back.lots['ST-01'];
 t('...ข้อมูลลอตตรงกับต้นฉบับทุกช่อง',
   r1&&r1.d==='2026-10-22'&&r1.own==='PT'&&r1.tag==='Stock PT'&&r1.cs===10&&
   r1.val===2228.4&&r1.bills===30&&r1.rt==='209619'&&r1.nm.indexOf('คอมฟอร์ท')===0,
   JSON.stringify(r1&&{d:r1.d,own:r1.own,cs:r1.cs,val:r1.val,bills:r1.bills}));
 t('...รายการเคลียร์ผูกกลับเข้าลอตถูกตัว',
   back.lots['ST-04'].clr.length===2&&back.lots['ST-04'].clr[0].who==='คุณกราณรุ้ง'&&
   back.lots['ST-03'].clr.length===1,
   'ST-03='+back.lots['ST-03'].clr.length+' ST-04='+back.lots['ST-04'].clr.length);
 t('...ชื่อไทยและจุดทศนิยมไม่เพี้ยน',back.lots['ST-04'].val===35130.96&&back.lots['ST-02'].nm==='โอโม ซอฟท์ ทัช',
   back.lots['ST-04'].val+' / '+back.lots['ST-02'].nm);

 /* ---------- 3) คงเหลือคำนวณเสมอ ---------- */
 t('🔧 ลอตที่เคลียร์หมดแล้ว คงเหลือ 0 และขึ้นว่าเคลียร์หมด (ST-03: 64−64)',
   back.lots['ST-03'].left===0&&back.lots['ST-03'].done===true,back.lots['ST-03'].left);
 t('🔧 ของจริงคือ 85−50−5 = 30 ไม่ใช่ 12 ตามที่หมายเหตุเดิมพิมพ์ไว้ (ST-04)',
   back.lots['ST-04'].left===30,back.lots['ST-04'].left);
 t('ลอตที่ยังไม่เคลียร์เลย คงเหลือเท่าที่ตัดไว้',
   back.lots['ST-02'].left===11&&back.lots['ST-05'].left===4,
   back.lots['ST-02'].left+' / '+back.lots['ST-05'].left);
 t('ต่อให้มีใครพิมพ์ "คงเหลือ" ทับในไฟล์ ระบบก็ไม่อ่าน — คิดจากรายการเคลียร์เท่านั้น',
   await ev(()=>{const l=JSON.parse(JSON.stringify(CSTOCK.lots['ST-04']));
     l.left=12;l.คงเหลือ=12;return cstLeft(l)===30;}),'ok');

 /* ---------- 4) ไฟล์ผิดรูปต้องฟ้อง ---------- */
 const mk=(lotRows,clrRows,names)=>{
   const w=XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet(lotRows),(names||{}).l||'ลอตตัดบิล');
   if(clrRows)XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet(clrRows),(names||{}).c||'การเคลียร์');
   return Buffer.from(XLSX.write(w,{bookType:'xlsx',type:'array'})).toString('base64');
 };
 const HL=head.slice(0,12),HC=Cs[0].map(x=>String(x).trim());
 const bad=async b64=>await ev(a=>{
   const before=JSON.stringify(CSTOCK);
   try{parseCStock('x.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));return {err:'',same:JSON.stringify(CSTOCK)===before};}
   catch(e){return {err:String(e.message||e),same:JSON.stringify(CSTOCK)===before};}
 },{b64});
 const e1=await bad(mk([['อะไรก็ไม่รู้']],null,{l:'ชีตมั่ว'}));
 t('ไฟล์ที่ไม่มีชีต "ลอตตัดบิล" → ฟ้องชัดและไม่เก็บอะไรเลย',
   /ไม่พบชีต/.test(e1.err)&&e1.same,e1.err);
 const e2=await bad(mk([['รหัสลอต','ชื่อสินค้า'],['ST-09','ของ']],null));
 t('หัวตารางไม่ครบ → ฟ้องว่าต้องมีช่องอะไรบ้าง',
   /ไม่มีหัวตาราง/.test(e2.err)&&e2.same,e2.err);
 const e3=await bad(mk([HL,['ST-01','2026-10-01','','','','ของ A',5,0,0,0,'',''],
                           ['ST-01','2026-10-02','','','','ของ B',3,0,0,0,'','']],[HC]));
 t('รหัสลอตซ้ำกันในไฟล์ → ฟ้อง ไม่ใช่ทับกันเงียบๆ',/ซ้ำกันในไฟล์/.test(e3.err)&&e3.same,e3.err);
 const e4=await bad(mk([HL,['ST-01','2026-10-01','','','','ของ A',5,0,0,0,'','']],
                       [HC,['ST-99','2026-10-05','ใครไม่รู้',2,0,'']]));
 t('🛟 แถวเคลียร์อ้างลอตที่ไม่มี → ฟ้อง ไม่ใช่ทิ้งเงียบ (ไม่งั้นคงเหลือจะสูงกว่าจริง)',
   /อ้างถึงรหัสลอตที่ไม่มี/.test(e4.err)&&/ST-99/.test(e4.err)&&e4.same,e4.err);
 const e5=await bad(mk([HL,['','2026-10-01','','','','ของไม่มีรหัส',5,0,0,0,'','']],[HC]));
 t('แถวที่กรอกสินค้าแต่ลืมใส่รหัสลอต → ฟ้องพร้อมบอกเลขแถว',
   /ไม่มีรหัสลอต/.test(e5.err)&&e5.same,e5.err);
 const e6=await bad(mk([HL],[HC]));
 t('ไฟล์เปล่า (มีแต่หัวตาราง) → ฟ้องว่ายังไม่ได้กรอก',/ไม่พบข้อมูลลอต/.test(e6.err)&&e6.same,e6.err);

 /* ---------- 5) 🛟 อัพไฟล์ไม่ครบ ต้องไม่ลบลอตเดิม ---------- */
 const partial=mk([HL,['ST-02','2026-10-27','พี่แอ๊ะ','Stock กลาง','','โอโม ซอฟท์ ทัช',11,0,6549.84,132,'209611','']],
                  [HC,['ST-02','2026-10-30','ร้านเจ๊หมู',3,0,'']]);
 const keepR=await ev(a=>{
   parseCStock('รอบใหม่.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   return {n:Object.keys(CSTOCK.lots).length,
     st01:!!CSTOCK.lots['ST-01'],st04:!!CSTOCK.lots['ST-04'],
     st02left:cstLeft(CSTOCK.lots['ST-02']),log:window.__log.join('\n')};
 },{b64:partial});
 t('🛟 อัพไฟล์ที่มีลอตเดียว → ลอตเดิมอีก 4 ลอตยังอยู่ครบ',
   keepR.n===5&&keepR.st01&&keepR.st04,keepR.n+' ลอต');
 t('...ลอตที่อยู่ในไฟล์รับการเคลียร์ใหม่ (11−3 = 8)',keepR.st02left===8,keepR.st02left);
 t('...และบันทึกการอัพบอกชัดว่าลอตเดิมยังถูกเก็บไว้',/ยังเก็บไว้ครบ 4 ลอต/.test(keepR.log),
   (keepR.log.match(/.*ยังเก็บไว้.*/)||[''])[0].replace(/<[^>]*>/g,''));

 /* ---------- 6) หน้าจอ ---------- */
 await ev(a=>{CSTOCK={lots:{},del:{},up:0};
   (a.LOTS||[]).forEach(l=>{CSTOCK.lots[l.id]=JSON.parse(JSON.stringify(l));CSTOCK.lots[l.id].up=1000;});
   CST.only='open';CST.q='';CST.open={};_switchTab('cstock');renderCStock();},{LOTS});
 const ui=await ev(()=>({
   cards:[...document.querySelectorAll('#cstCards .card')].map(c=>c.innerText.replace(/\s+/g,' ')),
   lots:[...document.querySelectorAll('#cstBody .cst-lot')].map(x=>x.innerText.replace(/\s+/g,' ')),
   body:document.getElementById('cstBody').innerText.replace(/\s+/g,' ')}));
 t('หน้าจอโชว์เฉพาะลอตที่ยังค้าง (ST-03 เคลียร์หมดแล้วต้องไม่อยู่)',
   ui.lots.length===4&&!ui.lots.some(x=>/ST-03/.test(x)),ui.lots.length+' ลอต');
 t('การ์ดสรุปบอกจำนวนลอตที่ยังค้าง',/ยังค้างอยู่ 4/.test(ui.cards.join(' ')),ui.cards[0]);
 t('...และบอกยอดลังที่ยังค้างรวม (10+11+30+4 = 55)',/55/.test(ui.cards[1]),ui.cards[1]);
 t('...และนับลอตที่เคลียร์หมดแล้วแยกไว้',/เคลียร์หมดแล้ว 1/.test(ui.cards.join(' ')),ui.cards[4]);
 t('แถวลอตบอกคงเหลือ/ที่ตัดไว้ และกี่วันแล้ว',
   /ค้าง 30 \/ 85 ลัง/.test(ui.body)&&/วันแล้ว/.test(ui.body),
   (ui.lots.find(x=>/ST-04/.test(x))||'').slice(0,100));
 const det=await ev(()=>{cstTog('ST-04');
   const el=[...document.querySelectorAll('#cstBody .cst-lot')].find(x=>/ST-04/.test(x.innerText));
   return {txt:el.innerText.replace(/\s+/g,' '),rows:el.querySelectorAll('.cst-tbl tbody tr').length};});
 t('กดแถวแล้วกางดูรายการเคลียร์ทีละครั้งได้',
   det.rows===2&&/คุณกราณรุ้ง/.test(det.txt)&&/ลัดดาวัล/.test(det.txt),det.rows+' แถว');
 t('...และสรุปว่าเคลียร์ไปแล้วกี่ลังจากกี่ลัง',/เคลียร์ไปแล้ว 55 ลัง จาก 85 ลัง/.test(det.txt),
   (det.txt.match(/เคลียร์ไปแล้ว[^·]*/)||[''])[0]);
 const filt=await ev(()=>{const o={};
   ['all','done','old','open'].forEach(k=>{cstSetOnly(k);
     o[k]=document.querySelectorAll('#cstBody .cst-lot').length;
     o[k+'_on']=(document.querySelector('#cstOnly button.on')||{}).dataset.o;});
   cstSetOnly('open');CST.q='คนอร์';renderCStock();
   o.q=document.querySelectorAll('#cstBody .cst-lot').length;CST.q='';renderCStock();return o;});
 t('ปุ่มกรอง ทั้งหมด / เคลียร์หมดแล้ว / ยังค้าง ทำงานถูก',
   filt.all===5&&filt.done===1&&filt.open===4,JSON.stringify(filt));
 t('...และปุ่มที่ไฮไลต์ขยับตามที่กดจริง',
   filt.all_on==='all'&&filt.done_on==='done'&&filt.open_on==='open',
   [filt.all_on,filt.done_on,filt.old_on,filt.open_on].join(' → '));
 t('ค้นหาด้วยชื่อสินค้าได้',filt.q===1,filt.q);

 /* ---------- 7) 🛟 อ่านอย่างเดียว ---------- */
 const syncBase=await ev(()=>window.__sync);   /* การอัพไฟล์ก่อนหน้านี้สั่ง sync ไปแล้วตามปกติ */
 const before=await ev(new Function('return '+BLOBS));
 const csBefore=await ev(()=>JSON.stringify(CSTOCK));
 await ev(()=>{
   ['all','done','old','open'].forEach(cstSetOnly);
   Object.keys(CSTOCK.lots).forEach(k=>{cstTog(k);cstLeft(CSTOCK.lots[k]);cstAge(CSTOCK.lots[k]);});
   Object.keys(CSTOCK.lots).forEach(k=>cstTog(k));
   CST.q='โอโม';renderCStock();CST.q='';renderCStock();
 });
 const after=await ev(new Function('return '+BLOBS));
 const csAfter=await ev(()=>JSON.stringify(CSTOCK));
 let moved='';
 if(after!==before){const x=JSON.parse(before),y=JSON.parse(after);
   moved=Object.keys(x).filter(k=>JSON.stringify(x[k])!==JSON.stringify(y[k])).join(', ');}
 t('🛟 กดดู/กรอง/กางทุกแถวแล้ว ข้อมูลทุกก้อนเหมือนเดิมเป๊ะทุกไบต์',after===before,moved||'(ไม่มี)');
 t('🛟 ...และสต็อคกลางเองก็ไม่ขยับ',csAfter===csBefore,'ok');
 t('🛟 การดูไม่สั่งบันทึกขึ้นเซิร์ฟเวอร์เพิ่มเลยสักครั้ง',
   await ev(a=>window.__sync===a.base&&window.__posts.length===0,{base:syncBase}),
   await ev(a=>'sync '+a.base+' → '+window.__sync,{base:syncBase}));
 t('🛟 สถานะกาง/กรองอยู่บน CST (ไม่ถูก sync) ไม่ได้อยู่ใน CSTOCK',
   await ev(()=>typeof CST==='object'&&!('q' in CSTOCK)&&!('only' in CSTOCK)),'ok');

 /* ---------- 8) ลบลอตที่คีย์ผิด ---------- */
 const del=await ev(()=>{const n0=Object.keys(CSTOCK.lots).length,s0=window.__sync;
   cstDel('ST-05');
   return {n0:n0,n1:Object.keys(CSTOCK.lots).length,tomb:!!CSTOCK.del['ST-05'],d:window.__sync-s0};});
 t('ลบลอตที่คีย์ผิดได้ และทิ้ง tombstone ไว้กันแท็บเก่าปลุกกลับ',
   del.n1===del.n0-1&&del.tomb,JSON.stringify(del));
 t('...การลบถึงจะสั่งบันทึกขึ้นเซิร์ฟเวอร์ (ต่างจากการแค่กดดู)',del.d===1,'sync +'+del.d);

 const real=errs.filter(e=>!/localStorage|SecurityError/.test(e));
 t('ไม่มี JavaScript error ตลอดเทสต์',real.length===0,real.join(' | '));

 await b.close();
 let fail=0;
 A.forEach(([ok,n,x])=>{if(!ok)fail++;console.log((ok?'  ok  ':'  FAIL')+'  '+n+(x?'   ['+x+']':''));});
 console.log('\n'+A.length+' checks · '+(A.length-fail)+' passed · '+fail+' failed');
 console.log(fail?'SOME FAILED':'ALL PASS ('+A.length+' checks)');
 process.exit(fail?1:0);
})();
