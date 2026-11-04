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
/* ต้องเสิร์ฟผ่าน origin จริง ไม่ใช่ setContent — ไม่งั้นเบราว์เซอร์ห้าม localStorage
   แล้วเทส "ฉบับร่างใบตัดบิลยังอยู่" จะวัดไม่ได้ (บทเรียนเดียวกับ sreq.test.cjs) */
const ORIGIN='https://bd-cstock.test/';

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
 const html=fs.readFileSync(PAGE,'utf8');
 await pg.route(ORIGIN+'**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}));
 await pg.goto(ORIGIN);
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

 /* ---------- 9) ปุ่มอัพโหลดต้องเปิดกลุ่มของแท็บตัวเอง ----------
    เจ้าของเจอเอง 31 ต.ค. 69: กด "＋ อัพโหลดไฟล์" ในแท็บสต็อคกลาง แล้วเด้งช่องอัพ
    "ยอดขายรายวัน / ยอดรายเดือน / ยอดรายร้าน" มาแทน เพราะ openUpload แมปแท็บไม่ครบ
    แล้วมี `||"sales"` รับท้ายไว้ ทำให้แท็บใหม่ทุกแท็บตกไปเป็นยอดขายเงียบ ๆ */
 const up=await ev(()=>{_switchTab('cstock');openUpload();
   const rows=[...document.querySelectorAll('#modal .up-row')];
   const vis=rows.filter(r=>r.style.display!=='none');
   const o={title:document.getElementById('upTitle').textContent,
     sub:document.getElementById('upSub').textContent,
     vis:vis.map(r=>r.dataset.group),
     labels:vis.map(r=>(r.querySelector('label b')||{}).textContent||''),
     open:!document.getElementById('modal').classList.contains('hidden')};
   closeUpload();return o;});
 t('🔧 กดอัพโหลดในแท็บสต็อคกลาง → เปิดกลุ่มสต็อคกลาง ไม่ใช่ยอดขาย',
   up.vis.length>0&&up.vis.every(g=>g==='cstock'),up.vis.join(',')||'(ไม่มี)');
 t('...เห็นเฉพาะช่องอัพของสต็อคกลาง: ไฟล์ร้านที่ตัดบิลเข้า + ฟอร์ม Excel วิธีเดิม',
   up.labels.length===2&&/ร้านที่ตัดบิลเข้า/.test(up.labels[0])&&/สต็อคกลาง/.test(up.labels[1]),
   up.labels.join(' | '));
 t('...และหัวกล่องบอกว่าเป็นไฟล์สต็อคกลาง',/สต็อคกลาง/.test(up.title),up.title);
 t('...บรรทัดรองไม่บอกว่ามาจาก Unilever (ไฟล์นี้แอดมินถือเอง)',
   !/Unilever/.test(up.sub)&&/ใบตัดบิล/.test(up.sub),up.sub);
 t('...ไม่มีช่อง "ยอดขายรายวัน" โผล่มาให้อัพผิดช่อง',
   !up.labels.some(x=>/ยอดขายรายวัน/.test(x)),up.labels.join(' | '));
 /* กันพลาดแบบเดิมอีก: ทุกแท็บที่มีปุ่มอัพโหลด ต้องแมปไปกลุ่มที่มีอยู่จริง */
 const cover=await ev(()=>{
   const groups=[...new Set([...document.querySelectorAll('#modal .up-row')].map(r=>r.dataset.group))];
   const bad=[],fallback=[];
   TAB_GROUPS.forEach(G=>G.tabs.forEach(tb=>{
     _switchTab(tb.t);
     const v=document.getElementById(tb.t+'View');
     const hasBtn=!!(v&&[...v.querySelectorAll('button')].some(b=>/อัพโหลดไฟล์/.test(b.textContent)));
     if(!hasBtn)return;
     openUpload();
     const vis=[...document.querySelectorAll('#modal .up-row')].filter(r=>r.style.display!=='none');
     const gs=[...new Set(vis.map(r=>r.dataset.group))];
     closeUpload();
     if(!vis.length)bad.push(tb.t+':ไม่เห็นช่องอะไรเลย');
     else if(gs.length>1)fallback.push(tb.t+':โชว์ทุกกลุ่ม');
   }));
   return {groups:groups,bad:bad,fallback:fallback};});
 t('🛟 ทุกแท็บที่มีปุ่มอัพโหลด เปิดมาแล้วเห็นช่องอัพของตัวเองเสมอ',
   cover.bad.length===0,cover.bad.join(' · ')||'ok');
 t('🛟 ...และไม่มีแท็บไหนตกไปโชว์กลุ่มมั่ว (แท็บที่ยังไม่ได้แมปจะโชว์ทุกกลุ่มให้เลือกเอง)',
   cover.fallback.length===0,cover.fallback.join(' · ')||'ok');

 /* ==========================================================================
  * 10) 🧾 ใบตัดบิล — กรอกในเว็บ แทนการโหลด/กรอก/อัพ Excel
  *     เจ้าของสั่ง 4 พ.ย. 69: *"ต่อจากนี้ไม่ต้องทำผ่าน excel แล้ว ให้ทำผ่านเวปไปเลย
  *     โดยแอดมิน 1 คนจะเป็นคนลงข้อมูลไว้"* พร้อมรายการช่องที่ต้องกรอก
  * ======================================================================== */
 await ev(a=>{
   CSTOCK={lots:{},del:{},slips:{},sdel:{},ex:{},up:0};
   MASTER={items:{"65660382":"โอโม ซอฟท์ ทัช FO20 36X250ก","64829046":"โอโมน้ำ พิงค์ ฟลอรัล 12X3X120มล",
     "65288800":"ซันไลต์ยูซุ 12x3x300ML (P36)"}};
   /* ร้านค้ามาจากไฟล์ insight (วิเคราะห์เชิงลึก) ตามที่เจ้าของระบุที่มาเอง */
   STOREPROD={months:['2026-10'],cat:{},data:{},stores:{
     "4862412":{n:"ประภัสสร",l:"CT11"},"4862371":{n:"เฟรนด์ลี่มาร์ท",l:"CT12"},
     "5196282":{n:"ร้าน เอ มาร์ท",l:"CT22"}}};
   DATA.lines={};DATA.focus_order=[];
   CST.q='';CST.only='open';CST.open={};CST.sec='list';CST.f=null;CST.sopen={};CST._auto=1;
   try{localStorage.removeItem(cstDraftKey());}catch(e){}
   _switchTab('cstock');
 },{});
 const f0=await ev(()=>{cstNew();const f=CST.f;
   return {sec:CST.sec,rows:f.rows.length,d:f.d,own:f.own,today:todayISO(),
     lines:cstLines().join(','),owners:cstOwners()[0],
     form:!!document.querySelector('#cstBill .cst-form'),
     hasDate:!!document.getElementById('cstFD'),
     billShown:!document.getElementById('cstBill').classList.contains('hidden'),
     listHidden:document.getElementById('cstBody').classList.contains('hidden')};});
 t('กด ➕ ตัดบิลใหม่ → เปิดฟอร์มในเว็บ (ไม่ต้องโหลด Excel)',
   f0.sec==='bill'&&f0.form&&f0.billShown&&f0.listHidden,JSON.stringify({sec:f0.sec,form:f0.form}));
 t('...เริ่มด้วยวันที่ตัดบิล = วันนี้ และผู้รับผิดชอบตั้งต้น Supervisor',
   f0.d===f0.today&&f0.own==='Supervisor'&&f0.owners==='Supervisor',f0.d+' / '+f0.own);
 t('...สายวิ่งให้เลือกครบ CT11-CT22 และ KA97-KA99 ตามที่เจ้าของเขียนไว้',
   f0.lines==='CT11,CT12,CT13,CT14,CT15,CT16,CT17,CT19,CT22,KA97,KA98,KA99',f0.lines);
 /* ช่องที่เจ้าของสั่งให้มี ต้องมีครบจริงในหน้าจอ */
 const fields=await ev(()=>{
   const th=[...document.querySelectorAll('#cstBill .cst-ft th')].map(x=>x.textContent.trim());
   const lb=[...document.querySelectorAll('#cstBill .cst-nb label')].map(x=>x.textContent.trim());
   return {th:th.join(' | '),lb:lb.join(' | ')};});
 t('ตารางมีช่องครบตามที่สั่ง: รหัสสินค้า · ชื่อสินค้า · ลัง · ชิ้น · สายวิ่ง · ผู้รับผิดชอบ',
   /รหัสสินค้า/.test(fields.th)&&/ชื่อสินค้า/.test(fields.th)&&/ลัง/.test(fields.th)&&
   /ชิ้น/.test(fields.th)&&/สายวิ่ง/.test(fields.th)&&/ผู้รับผิดชอบ/.test(fields.th),fields.th);
 t('...และด้านล่างมี Note ถึงคลัง + Note ที่ไปของสินค้า',
   /Note ถึงคลัง/.test(fields.lb)&&/Note ที่ไปของสินค้า/.test(fields.lb),fields.lb);
 /* 🔑 รหัส ⇄ ชื่อ ผูกกับ master data ทั้งสองทาง */
 const link=await ev(async()=>{
   cstRowCode(0,'65660382');
   const byCode={nm:CST.f.rows[0].nm,input:document.getElementById('cstNm0').value,
     mark:document.getElementById('cstLk0').innerHTML};
   cstRowCode(0,'99999999');
   const badMark=document.getElementById('cstLk0').innerHTML;
   /* ใส่ชื่อแล้วรหัสต้องขึ้นเอง */
   CST.f.rows[0].code='';CST.f.rows[0].nm='';
   document.getElementById('cstCd0').value='';document.getElementById('cstNm0').value='';
   cstRowNm(0,'พิงค์ ฟลอรัล');
   await new Promise(r=>setTimeout(r,320));
   return {byCode:byCode,badMark:badMark,
     byName:{code:CST.f.rows[0].code,input:document.getElementById('cstCd0').value},
     sug:[...document.querySelectorAll('#cstSug0 .cst-sg')].map(x=>x.textContent.replace(/\s+/g,' ')).join(' / ')};});
 t('🔑 ใส่รหัสสินค้า → ชื่อขึ้นเองจาก master data',
   link.byCode.nm==='โอโม ซอฟท์ ทัช FO20 36X250ก'&&link.byCode.input===link.byCode.nm&&
   /master/.test(link.byCode.mark),link.byCode.nm);
 t('...รหัสที่ไม่มีใน master ต้องบอกให้รู้ ไม่ใช่เงียบ',/ไม่มีรหัสนี้/.test(link.badMark),link.badMark);
 t('🔑 ใส่ชื่อสินค้า → รหัสขึ้นเองเมื่อตรงตัวเดียว',
   link.byName.code==='64829046'&&link.byName.input==='64829046',JSON.stringify(link.byName));
 t('...และมีรายการให้กดเลือกจาก master data',/พิงค์ ฟลอรัล/.test(link.sug),link.sug.slice(0,80));
 /* กระจายทุกสาย — ไฟล์สรุปตัวกระจายของเจ้าของตัดสินค้าตัวเดียวเข้าสาย 11-22 จำนวนเท่ากัน */
 const spread=await ev(()=>{
   CST.f.rows=[];CST.f.seq=0;cstRowAdd();
   cstRowCode(0,'65660382');CST.f.rows[0].cs=8;CST.f.rows[0].pc=0;
   cstRowSpread(0);
   return {n:CST.f.rows.length,lines:CST.f.rows.map(r=>r.ln).join(','),
     cs:CST.f.rows.map(r=>+r.cs||0).join(','),
     same:CST.f.rows.every(r=>r.nm===CST.f.rows[0].nm),
     keys:new Set(CST.f.rows.map(r=>r.k)).size};});
 t('⇉ กระจายสินค้าแถวหนึ่งให้ครบทุกสายในคลิกเดียว (12 สาย)',
   spread.n===12&&spread.lines==='CT11,CT12,CT13,CT14,CT15,CT16,CT17,CT19,CT22,KA97,KA98,KA99',
   spread.n+' แถว · '+spread.lines);
 t('...จำนวนและชื่อสินค้าตามแถวต้นแบบ และคีย์แถวไม่ซ้ำกันเลย',
   spread.same&&spread.cs==='8,8,8,8,8,8,8,8,8,8,8,8'&&spread.keys===12,spread.cs);
 const own=await ev(()=>{
   CST.f.rows[2].own='CT13';                 /* แถวนี้เลือกคนอื่นเอง */
   cstSetOwn('CT11');
   return {all:CST.f.rows.map(r=>r.own).join(','),head:CST.f.own};});
 t('เปลี่ยนผู้รับผิดชอบที่หัวใบ → ทุกแถวตามไปด้วย ยกเว้นแถวที่เลือกคนอื่นไว้เอง',
   own.head==='CT11'&&own.all.split(',').filter(x=>x==='CT11').length===11&&
   own.all.split(',')[2]==='CT13',own.all);
 /* ฟอร์มที่ยังกรอกไม่ครบ ต้องฟ้อง และห้ามเขียนอะไรลงข้อมูลจริง */
 const guard=await ev(()=>{
   const o={};const snap=()=>JSON.stringify(CSTOCK);
   const b=snap();window.__alerts=[];
   CST.f.d='';cstSlipSave();o.noDate=(window.__alerts.join('|'));o.sameDate=snap()===b;
   CST.f.d=todayISO();
   const save=CST.f.rows.slice();
   CST.f.rows=[{k:'r90',code:'',nm:'',cs:'',pc:'',ln:'',own:''}];
   window.__alerts=[];cstSlipSave();o.noRow=window.__alerts.join('|');o.sameRow=snap()===b;
   CST.f.rows=[{k:'r91',code:'',nm:'',cs:3,pc:0,ln:'CT11',own:''}];
   window.__alerts=[];cstSlipSave();o.noName=window.__alerts.join('|');o.sameName=snap()===b;
   CST.f.rows=[{k:'r92',code:'65660382',nm:'โอโม',cs:0,pc:0,ln:'CT11',own:''}];
   window.__alerts=[];cstSlipSave();o.noQty=window.__alerts.join('|');o.sameQty=snap()===b;
   CST.f.rows=save;return o;});
 t('🛟 ไม่ใส่วันที่ตัดบิล → ฟ้อง และไม่เขียนข้อมูลสักตัว',
   /วันที่ตัดบิล/.test(guard.noDate)&&guard.sameDate,guard.noDate);
 t('🛟 ไม่มีรายการสินค้าเลย → ฟ้อง และไม่เขียนข้อมูล',
   /ยังไม่ได้กรอกรายการ/.test(guard.noRow)&&guard.sameRow,guard.noRow);
 t('🛟 แถวที่ใส่จำนวนแต่ลืมชื่อสินค้า → ฟ้อง และไม่เขียนข้อมูล',
   /ชื่อสินค้า/.test(guard.noName)&&guard.sameName,guard.noName);
 t('🛟 ทุกแถวจำนวนเป็น 0 → ฟ้อง และไม่เขียนข้อมูล',
   /จำนวนลัง/.test(guard.noQty)&&guard.sameQty,guard.noQty);
 /* บันทึกจริง */
 const saved=await ev(()=>{
   CST.f.nw='จัดของแยกไว้ รอเรียกส่ง';CST.f.ng='รอขายเข้าร้าน / ตัวกระจาย';
   CST.f.rows[0].cs=8;CST.f.rows[1].cs=10;CST.f.rows[1].pc=24;
   const s0=window.__sync;cstSlipSave();
   const sid=Object.keys(CSTOCK.slips)[0];
   const rows=cstSlipRows(sid);
   let draft=1;try{draft=localStorage.getItem(cstDraftKey())?1:0;}catch(e){draft=-1;}
   return {sid:sid,n:rows.length,slip:CSTOCK.slips[sid],
     first:rows[0],ids:rows.map(l=>l.id).slice(0,3).join(','),
     sq:rows.map(l=>l.sq).join(','),sync:window.__sync-s0,draft:draft,
     formClosed:CST.f===null,
     noRowsInSlip:!('rows' in CSTOCK.slips[sid])&&!('items' in CSTOCK.slips[sid]),
     status:rows.map(l=>cstStatusTxt(l))[0],left:cstLeft(rows[0]),
     body:document.getElementById('cstBill').innerText.replace(/\s+/g,' ')};});
 t('💾 บันทึกใบตัดบิล → เก็บเป็นแถวสินค้าครบทุกสาย',saved.n===12,saved.n+' แถว');
 t('...เลขที่ใบตั้งจากวันที่ตัดบิล และแถวผูกกับใบด้วย sl',
   /^B\d{8}-01$/.test(saved.sid)&&saved.first.sl===saved.sid&&saved.sq==='1,2,3,4,5,6,7,8,9,10,11,12',
   saved.sid+' · '+saved.ids);
 t('...ใบเก็บแค่หัวใบ (วันที่ · ผู้รับผิดชอบ · Note 2 ช่อง) ไม่เก็บรายการซ้ำอีกชุด',
   saved.noRowsInSlip&&saved.slip.nw==='จัดของแยกไว้ รอเรียกส่ง'&&
   saved.slip.ng==='รอขายเข้าร้าน / ตัวกระจาย'&&!!saved.slip.d,JSON.stringify(saved.slip).slice(0,120));
 t('...แถวเก็บครบทุกช่อง: รหัส · ชื่อ · ลัง · ชิ้น · สายวิ่ง · ผู้รับผิดชอบ',
   saved.first.code==='65660382'&&/โอโม ซอฟท์ ทัช/.test(saved.first.nm)&&saved.first.cs===8&&
   saved.first.ln==='CT11'&&!!saved.first.own,JSON.stringify({c:saved.first.code,cs:saved.first.cs,ln:saved.first.ln}));
 t('🔑 บันทึกแล้วรายการขึ้นสถานะ "รอจัดส่ง / รอเคลียร์" ให้เซลล์ไปขาย',
   saved.status==='รอจัดส่ง / รอเคลียร์'&&saved.left===8,saved.status);
 t('...บันทึกขึ้นเซิร์ฟเวอร์ครั้งเดียว และฟอร์มปิดพร้อมล้างฉบับร่างในเครื่อง',
   saved.sync===1&&saved.formClosed&&saved.draft===0,'sync +'+saved.sync+' draft='+saved.draft);
 /* 8 + 10 + (8 × อีก 10 สาย) = 98 ลัง */
 t('...หน้าใบตัดบิลโชว์ใบที่บันทึกแล้วพร้อมยอดรวม',
   /ใบตัดบิลที่บันทึกไว้ \(1\)/.test(saved.body)&&/98 ลัง/.test(saved.body),
   (saved.body.match(/ค้าง[^·]{0,24}/)||[''])[0]);
 /* ฉบับร่าง: ปิดฟอร์มทิ้งแล้วกลับมาต้องยังอยู่ (หลักเดียวกับตะกร้าขอสินค้าของเซลล์) */
 const draft=await ev(()=>{
   cstNew();cstRowCode(0,'65288800');CST.f.rows[0].cs=5;CST.f.rows[0].ln='CT13';
   cstDraftSave();
   cstFormHide();
   const hidden=CST.f===null;
   let raw=0;try{raw=localStorage.getItem(cstDraftKey())?1:0;}catch(e){raw=-1;}
   cstSetSec('list');cstSetSec('bill');
   return {hidden:hidden,raw:raw,back:!!CST.f,cs:CST.f&&+CST.f.rows[0].cs,
     nm:CST.f&&CST.f.rows[0].nm,note:/กู้ใบที่กรอกค้างไว้/.test(document.getElementById('cstBill').innerText)};});
 t('📝 กดออกจากฟอร์มแล้วของที่กรอกไว้ยังอยู่ (ฉบับร่างในเครื่อง ไม่ใช่ข้อมูลที่ sync)',
   draft.hidden&&draft.raw===1&&draft.back&&draft.cs===5&&/ซันไลต์/.test(draft.nm||''),
   JSON.stringify({raw:draft.raw,cs:draft.cs}));
 t('...และบอกผู้ใช้ว่ากู้ใบที่กรอกค้างไว้กลับมาให้แล้ว',draft.note,'ok');
 /* แก้ไขใบที่บันทึกแล้ว */
 const edit=await ev(()=>{
   const sid=Object.keys(CSTOCK.slips)[0];
   cstFormClear();   /* ทิ้งฉบับร่างชุดทดสอบก่อน */
   cstSlipEdit(sid);
   const n0=CST.f.rows.length;
   CST.f.rows[0].cs=9;              /* แก้จำนวน */
   const killId=sid+'-'+CST.f.rows[11].k;
   CST.f.rows.splice(11,1);          /* เอาแถวสุดท้ายออก */
   cstSlipSave();
   const rows=cstSlipRows(sid);
   return {n0:n0,n1:rows.length,cs:rows[0].cs,tomb:!!CSTOCK.del[killId],
     gone:!CSTOCK.lots[killId],sameSid:Object.keys(CSTOCK.slips).length===1,
     note:CSTOCK.slips[sid].nw};});
 t('✏️ แก้ไขใบที่บันทึกแล้ว: แก้จำนวนได้ และเลขที่ใบไม่เปลี่ยน',
   edit.n0===12&&edit.cs===9&&edit.sameSid,'rows '+edit.n0+'→'+edit.n1+' cs='+edit.cs);
 t('🛟 เอาแถวออกจากใบ = tombstone ไม่ใช่ลบ key เงียบ ๆ (แท็บเก่าจึงปลุกกลับไม่ได้)',
   edit.n1===11&&edit.gone&&edit.tomb,'เหลือ '+edit.n1+' แถว · tombstone='+edit.tomb);
 t('...Note ของใบยังอยู่ครบหลังแก้ไข',edit.note==='จัดของแยกไว้ รอเรียกส่ง',edit.note);

 /* ==========================================================================
  * 11) ✅ "ขายออกไปแล้ว" — วันที่ · จำนวน · ร้านค้าไหน (จากไฟล์ insight)
  *     เจ้าของสั่ง: *"เมื่อได้ใบส่งของ แอดมินก็จะเอาข้อมูลมากระทบในเวปนี้อีกที …
  *     ให้มีขึ้นบันทึกวันที่ว่าขายออกไปวันที่เท่าไหร่ จำนวนเท่าไหร่ และขายไปยังร้านค้าไหน"*
  * ======================================================================== */
 const clr=await ev(async()=>{
   const sid=Object.keys(CSTOCK.slips)[0],id=cstSlipRows(sid)[0].id;
   CST.sec='list';renderCStock();cstTog(id);
   const hasBtn=!!document.querySelector('#cstBody .cst-lot button.upload-btn');
   cstClrOpen(id);
   const openM=!document.getElementById('cstClrModal').classList.contains('hidden');
   const sub=document.getElementById('cstClrSub').innerText.replace(/\s+/g,' ');
   document.getElementById('cstClrWho').value='ประภัส';
   cstClrSug();
   const sug=[...document.querySelectorAll('#cstClrSug .cst-sg')].map(x=>x.textContent.replace(/\s+/g,' '));
   cstClrPick('4862412');
   const picked={who:document.getElementById('cstClrWho').value,
     pick:document.getElementById('cstClrPick').innerText.replace(/\s+/g,' ')};
   document.getElementById('cstClrD').value='2026-11-03';
   document.getElementById('cstClrCs').value='5';
   document.getElementById('cstClrPc').value='0';
   document.getElementById('cstClrNote').value='ทำราคา 300/ลัง';
   const s0=window.__sync;cstClrSave();
   const l=CSTOCK.lots[id];
   return {id:id,hasBtn:hasBtn,openM:openM,sub:sub,sug:sug.join(' / '),picked:picked,
     closed:document.getElementById('cstClrModal').classList.contains('hidden'),
     clr:l.clr,left:cstLeft(l),status:cstStatus(l),sync:window.__sync-s0,
     row:(document.querySelector('#cstBody .cst-lot')||{innerText:''}).innerText.replace(/\s+/g,' ')};});
 t('ผู้จัดการ/แอดมินมีปุ่ม "บันทึกว่าขายออกไปแล้ว" ในแถวสินค้า',clr.hasBtn&&clr.openM,'ok');
 t('...กล่องบอกชัดว่าลอตนี้ตัดไว้เท่าไหร่ เหลือเท่าไหร่',
   /ตัดบิลไว้ 9 ลัง/.test(clr.sub)&&/เหลือ 9/.test(clr.sub),clr.sub);
 t('🏪 ค้นหาร้านจากไฟล์ insight (วิเคราะห์เชิงลึก) ได้ด้วยชื่อ',
   /ประภัสสร/.test(clr.sug)&&/4862412/.test(clr.sug),clr.sug.slice(0,70));
 t('...เลือกร้านแล้วเก็บทั้งชื่อและรหัสร้าน',
   clr.picked.who==='ประภัสสร'&&/4862412/.test(clr.picked.pick)&&
   clr.clr[0].sc==='4862412'&&clr.clr[0].sn==='ประภัสสร',JSON.stringify(clr.clr[0]).slice(0,110));
 t('🔑 บันทึกแล้วได้ วันที่ขายออก + จำนวน + ร้าน ครบในรายการเดียว',
   clr.clr.length===1&&clr.clr[0].d==='2026-11-03'&&clr.clr[0].cs===5&&
   clr.clr[0].note==='ทำราคา 300/ลัง',JSON.stringify(clr.clr[0]).slice(0,120));
 t('...คงเหลือคิดใหม่เอง (9−5 = 4) และสถานะกลายเป็นเคลียร์บางส่วน',
   clr.left===4&&clr.status==='part',clr.left+' / '+clr.status);
 t('...ปิดกล่องเองและบันทึกขึ้นเซิร์ฟเวอร์ครั้งเดียว',clr.closed&&clr.sync===1,'sync +'+clr.sync);
 t('...แถวในหน้าจอขึ้นสถานะใหม่ให้เห็นทันที',/เคลียร์ไปบางส่วน/.test(clr.row),
   (clr.row.match(/เคลียร์ไปบางส่วน|รอจัดส่ง[^·]*/)||[''])[0]);
 const clr2=await ev(()=>{
   const id=CST.open&&Object.keys(CST.open)[0];
   const l=CSTOCK.lots[id];const o={};
   /* เคลียร์ส่วนที่เหลือ → ต้องกลายเป็น "เคลียร์หมดแล้ว" */
   cstClrOpen(id);
   document.getElementById('cstClrD').value='2026-11-04';
   document.getElementById('cstClrCs').value='4';
   document.getElementById('cstClrWho').value='ส่งตัวกระจายสองเมือง';
   cstClrSave();
   o.left=cstLeft(l);o.status=cstStatus(l);o.n=l.clr.length;
   o.freeText=l.clr[1].who==='ส่งตัวกระจายสองเมือง'&&!l.clr[1].sc;
   /* เคลียร์เกินของที่เหลือ ต้องถามก่อน ไม่ใช่บันทึกเงียบ ๆ */
   window.confirm=()=>false;window.__alerts=[];
   cstClrOpen(id);
   document.getElementById('cstClrD').value='2026-11-05';
   document.getElementById('cstClrCs').value='99';
   document.getElementById('cstClrWho').value='ใครก็ไม่รู้';
   cstClrSave();
   o.blocked=l.clr.length===2;
   window.confirm=()=>true;
   /* ว่างเปล่า → ฟ้อง */
   cstClrOpen(id);document.getElementById('cstClrCs').value='';
   document.getElementById('cstClrWho').value='x';window.__alerts=[];
   cstClrSave();o.noQty=window.__alerts.join('|');o.still=l.clr.length===2;
   cstClrClose();
   /* ลบรายการที่คีย์ผิดได้ แล้วยอดคงเหลือกลับมา */
   cstClrDel(id,1);
   o.afterDel=l.clr.length;o.leftBack=cstLeft(l);
   return o;});
 t('เคลียร์ส่วนที่เหลือครบ → สถานะเป็น "เคลียร์หมดแล้ว" และคงเหลือ 0',
   clr2.left===0&&clr2.status==='done'&&clr2.n===2,clr2.left+' / '+clr2.status);
 t('...ผู้รับที่ไม่ใช่ร้านในระบบ (เช่น ส่งตัวกระจาย) พิมพ์ชื่อเองได้',clr2.freeText,'ok');
 t('🛟 เคลียร์เกินจำนวนที่ตัดไว้ ต้องถามก่อน — กดยกเลิกแล้วไม่บันทึก',clr2.blocked,'ok');
 t('🛟 ไม่ใส่จำนวน → ฟ้อง และไม่บันทึก',/จำนวน/.test(clr2.noQty)&&clr2.still,clr2.noQty);
 t('ลบรายการเคลียร์ที่คีย์ผิดได้ และคงเหลือกลับมาเอง (0 → 4)',
   clr2.afterDel===1&&clr2.leftBack===4,clr2.afterDel+' รายการ · เหลือ '+clr2.leftBack);

 /* ==========================================================================
  * 12) 🏪 ไฟล์ Ex.export — ร้านที่ยอดตัดบิลถูกส่งเข้าไป (แนบทีหลังได้)
  * ======================================================================== */
 const EXH=['เอกสารการวางบิล','ประเภทการวางบิล','ผู้สั่งซื้อ (ID)','ผู้สั่งซื้อ','มูลค่าสุทธิ','จำนวนภาษี',
   'สกุลเงินเอกสาร','สถานะการผ่านรายการ','ถูกยกเลิก','วันที่วางบิล','สร้างโดย'];
 const exRow=(doc,sc,sn,net,tax,d,cx)=>[doc,'ใบกำกับสินค้า',sc,sn,net,tax,'THB','ยังไม่หักล้าง',cx||'ไม่ใช่',d,'2096DO2'];
 const mkEx=(rows,head)=>{
   const w=XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet([head||EXH].concat(rows)),'Data');
   return Buffer.from(XLSX.write(w,{bookType:'xlsx',type:'array'})).toString('base64');
 };
 const today=await ev(()=>todayISO());
 const exRows=[exRow('MF80475729','4862412','ประภัสสร',46.37,3.25,today),
   exRow('MF80475730','4862371','เฟรนด์ลี่มาร์ท',46.37,3.25,today),
   exRow('MF80475743','5196282','ร้าน  เอ มาร์ท',46.37,3.25,today),
   exRow('MF80475799','4862999','บิลที่ถูกยกเลิก',99.99,7.00,today,'ใช่')];
 const exOut=await ev(a=>{
   const sid=Object.keys(CSTOCK.slips)[0];
   const before=JSON.stringify(CSTOCK.slips[sid]);
   CST.exFor=sid;window.__log=[];const s0=window.__sync;
   cstExTake('Ex.export.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   const ex=CSTOCK.ex[sid];
   return {sid:sid,ex:ex,slipSame:JSON.stringify(CSTOCK.slips[sid])===before,
     inSlip:!!(CSTOCK.slips[sid].ex||CSTOCK.slips[sid].rows),
     log:window.__log.join('\n'),sync:window.__sync-s0,exFor:CST.exFor};
 },{b64:mkEx(exRows)});
 t('🏪 อ่านไฟล์ Ex.export ได้ และนับเฉพาะบิลที่ไม่ถูกยกเลิก (4 แถว → 3 บิล)',
   exOut.ex&&exOut.ex.n===3&&/ข้ามบิลที่ถูกยกเลิก 1 ใบ/.test(exOut.log),
   exOut.ex&&exOut.ex.n+' บิล');
 t('🔑 รหัสร้านอ่านจากคอลัมน์ "ผู้สั่งซื้อ (ID)" ไม่ใช่คอลัมน์ "ผู้สั่งซื้อ" ที่ชื่อคล้ายกัน',
   exOut.ex.rows[0].c==='4862412'&&exOut.ex.rows[0].n==='ประภัสสร',
   JSON.stringify(exOut.ex.rows[0]));
 t('...มูลค่ารวมภาษี (46.37+3.25) × 3 บิล = 148.86',
   Math.abs(exOut.ex.val-148.86)<0.01,exOut.ex.val);
 t('...แนบเข้าใบที่เลือก และเก็บคนละ map กับหัวใบ (อัพไฟล์ทีหลังจึงไม่ทับ Note)',
   exOut.ex&&exOut.slipSame&&!exOut.inSlip,'slip ไม่ขยับ='+exOut.slipSame);
 t('...บันทึกขึ้นเซิร์ฟเวอร์ครั้งเดียว และล้างใบที่เลือกไว้ทิ้ง',
   exOut.sync===1&&exOut.exFor==='','sync +'+exOut.sync);
 const exUi=await ev(()=>{
   const sid=Object.keys(CSTOCK.slips)[0];
   CST.sec='bill';CST.sopen={};CST.sopen[sid]=1;renderCStock();
   const txt=document.getElementById('cstBill').innerText.replace(/\s+/g,' ');
   const rowsBefore=document.querySelectorAll('#cstBill .cst-ex .cst-tbl tbody tr').length;
   cstSlipTog('ex|'+sid);
   const rowsAfter=document.querySelectorAll('#cstBill .cst-ex .cst-tbl tbody tr').length;
   const open=document.getElementById('cstBill').innerText.replace(/\s+/g,' ');
   return {txt:txt,rowsBefore:rowsBefore,rowsAfter:rowsAfter,open:open};});
 t('สรุปบนใบบอกว่าตัดบิลเข้าไปกี่ร้าน แต่ "ยังไม่ขึ้นโชว์รายร้าน" จนกดดู (ตามที่เจ้าของสั่ง)',
   /ร้านที่ตัดบิลเข้า 3 ร้าน/.test(exUi.txt)&&exUi.rowsBefore===0,
   (exUi.txt.match(/ร้านที่ตัดบิลเข้า[^·]*/)||[''])[0]);
 t('...กดดูรายชื่อแล้วขึ้นครบ พร้อมสายของร้านจากข้อมูลที่มีอยู่แล้ว',
   exUi.rowsAfter===3&&/เฟรนด์ลี่มาร์ท/.test(exUi.open)&&/CT12/.test(exUi.open),
   exUi.rowsAfter+' แถว');
 const exBad=await ev(a=>{
   const o={};const snap=()=>JSON.stringify(CSTOCK);
   const b=snap();
   const run=(b64,how)=>{CST.exFor=how||'';
     try{cstExTake('x.xlsx',Uint8Array.from(atob(b64),c=>c.charCodeAt(0)));return '';}
     catch(e){return String(e.message||e);}};
   o.noHead=run(a.noHead);o.sameHead=snap()===b;
   o.noSlip=run(a.otherDay);o.sameSlip=snap()===b;
   /* สองใบวันเดียวกัน → ต้องให้เลือกเอง ไม่ใช่เดา */
   const now=Date.now();
   CSTOCK.slips['B99999999-01']={id:'B99999999-01',d:a.today,up:now};
   CSTOCK.slips['B99999999-02']={id:'B99999999-02',d:a.today,up:now};
   o.many=run(a.sameDay);
   delete CSTOCK.slips['B99999999-01'];delete CSTOCK.slips['B99999999-02'];
   return o;
 },{noHead:mkEx([['x','y']],['ไม่ใช่ไฟล์นี้','เลย']),
    otherDay:mkEx([exRow('MF1','4862412','ประภัสสร',10,0.7,'2019-01-02')]),
    sameDay:mkEx([exRow('MF2','4862412','ประภัสสร',10,0.7,today)]),today:today});
 t('🛟 ไฟล์ที่ไม่ใช่ Ex.export → ฟ้องชัด และไม่เขียนข้อมูล',
   /ไม่พบหัวตาราง/.test(exBad.noHead)&&exBad.sameHead,exBad.noHead);
 t('🛟 ไม่มีใบตัดบิลของวันที่ในไฟล์ → ฟ้องว่าให้สร้างใบก่อน ไม่ใช่เดาใบให้',
   /ยังไม่มีใบตัดบิลของวันที่/.test(exBad.noSlip)&&exBad.sameSlip,exBad.noSlip);
 t('🛟 วันเดียวกันมีหลายใบ → ให้กดแนบในใบที่ต้องการ ไม่ใช่เดา',
   /มีใบตัดบิลอยู่ 3 ใบ|มีใบตัดบิลอยู่ 2 ใบ/.test(exBad.many)&&/📎/.test(exBad.many),exBad.many);

 /* ==========================================================================
  * 13) 🖨 ส่งต่องาน — ใบตัดบิลออกเป็น PDF (สั่งพิมพ์) หรือ Excel
  * ======================================================================== */
 const sid1=await ev(()=>Object.keys(CSTOCK.slips)[0]);
 const [dl2]=await Promise.all([pg.waitForEvent('download'),ev(a=>cstSlipXlsx(a.sid),{sid:sid1})]);
 const out2=path.join(os.tmpdir(),'bd-cutbill.xlsx');
 await dl2.saveAs(out2);
 try{fs.copyFileSync(out2,path.join(process.env.KEEP_DIR||os.tmpdir(),'BD-cutbill-sample.xlsx'));}catch(e){}
 t('ชื่อไฟล์ใบตัดบิลเป็น ASCII ล้วน (Chromium ทิ้งชื่อไฟล์ไทยทั้งนามสกุล)',
   /^[A-Za-z0-9.\-]+\.xlsx$/.test(dl2.suggestedFilename()),dl2.suggestedFilename());
 const wb2=XLSX.readFile(out2);
 t('ไฟล์ Excel มี 2 ชีต: ใบตัดบิล + ร้านที่ตัดบิลเข้า',
   wb2.SheetNames.join(' | ')==='ใบตัดบิล | ร้านที่ตัดบิลเข้า',wb2.SheetNames.join(' | '));
 const S1=XLSX.utils.sheet_to_json(wb2.Sheets['ใบตัดบิล'],{header:1,raw:true,defval:null});
 const flat=S1.map(r=>(r||[]).join('|')).join('\n');
 t('...หัวใบมีเลขที่ใบ วันที่ตัดบิล ผู้รับผิดชอบ',
   new RegExp(sid1).test(flat)&&/วันที่ตัดบิล/.test(flat)&&/ผู้รับผิดชอบ/.test(flat),S1[1].join(' '));
 t('...ตารางสินค้ามีครบ 11 แถว พร้อมสถานะของแต่ละแถว',
   S1.filter(r=>r&&/^\d+$/.test(String(r[0]))).length===11&&/รอจัดส่ง \/ รอเคลียร์/.test(flat),
   S1.filter(r=>r&&/^\d+$/.test(String(r[0]))).length+' แถว');
 t('...มี Note ถึงคลัง และ Note ที่ไปของสินค้า ติดไปในไฟล์ด้วย',
   /Note ถึงคลัง\|จัดของแยกไว้ รอเรียกส่ง/.test(flat)&&/Note ที่ไปของสินค้า/.test(flat),'ok');
 const S2=XLSX.utils.sheet_to_json(wb2.Sheets['ร้านที่ตัดบิลเข้า'],{header:1,raw:true,defval:null});
 t('...ชีตร้านมีรหัสร้าน ชื่อร้าน สาย และมูลค่า ครบทุกบิล',
   S2.length===4&&S2[1][1]==='4862412'&&S2[1][3]==='CT11',JSON.stringify(S2[1]));
 const prt=await ev(a=>{
   let printed=0;window.print=()=>{printed++;};
   cstSlipPrint(a.sid);
   const el=document.getElementById('prArea');
   return {printed:printed,txt:el.innerText.replace(/\s+/g,' '),
     rows:el.querySelectorAll('.pr-t tbody tr').length,
     child:el.parentElement===document.body};},{sid:sid1});
 t('🖨 กด PDF → เตรียมใบแล้วสั่งพิมพ์ (Save as PDF ของเบราว์เซอร์ ไม่ต้องลงไลบรารีเพิ่ม)',
   prt.printed===1&&prt.rows===12,'print×'+prt.printed+' · '+prt.rows+' แถว');
 t('...ใบที่พิมพ์มีหัวบริษัท เลขที่ใบ วันที่ Note และช่องเซ็นรับของ',
   /BD DISTRIBUTION/.test(prt.txt)&&new RegExp(sid1).test(prt.txt)&&
   /Note ถึงคลัง/.test(prt.txt)&&/ผู้รับของ/.test(prt.txt),prt.txt.slice(0,90));
 t('...พื้นที่พิมพ์เป็นลูกตรงของ body (กฎ @media print body>* จะซ่อนที่เหลือได้จริง)',prt.child,'ok');

 /* ==========================================================================
  * 14) 🛟 บันทึกใบตัดบิล/เคลียร์ ต้องแตะแค่ CSTOCK — ก้อนอื่นห้ามขยับสักไบต์
  * ======================================================================== */
 const bBefore=await ev(new Function('return '+BLOBS));
 await ev(()=>{
   cstNew();cstRowCode(0,'65288800');CST.f.rows[0].cs=3;CST.f.rows[0].ln='CT15';
   cstSlipSave();
   const sid=cstSlipList()[0].id,id=cstSlipRows(sid)[0].id;
   cstClrOpen(id);document.getElementById('cstClrD').value='2026-11-04';
   document.getElementById('cstClrCs').value='1';document.getElementById('cstClrWho').value='ทดสอบ';
   cstClrSave();
   CST.sec='bill';renderCStock();CST.sec='list';renderCStock();
 });
 const bAfter=await ev(new Function('return '+BLOBS));
 let moved2='';
 if(bAfter!==bBefore){const x=JSON.parse(bBefore),y=JSON.parse(bAfter);
   moved2=Object.keys(x).filter(k=>JSON.stringify(x[k])!==JSON.stringify(y[k])).join(', ');}
 t('🛟 กรอกใบใหม่ + บันทึกขายออก แล้วข้อมูลก้อนอื่นเหมือนเดิมเป๊ะทุกไบต์',
   bAfter===bBefore,moved2||'(ไม่มี)');

 /* ==========================================================================
  * 15) 👤 ฝั่งเซลล์: เห็นของที่ค้างเพื่อไปขาย แต่กรอก/แก้/ลบไม่ได้
  *     เจ้าของสั่ง: *"ให้รายการออเดอร์ขึ้นไปเป็นสถานะรอจัดส่ง รอเคลียร์
  *     เพื่อให้ทางเซลล์ไปขายกันมา"*
  * ======================================================================== */
 const sales=await ev(()=>{
   S.user={id:'ct11',role:'sales',code:'209611',name:'CT11'};
   renderTabs();_switchTab('cstock');
   const o={tab:[...document.querySelectorAll('#tabSub button')].map(b=>b.textContent).join(' | '),
     lots:document.querySelectorAll('#cstBody .cst-lot').length,
     secBox:(document.getElementById('cstSecBox')||{style:{}}).style.display,
     upBar:(document.getElementById('cstUpBar')||{style:{}}).style.display,
     sec:CST.sec};
   /* กดดูรายละเอียดแล้วต้องไม่มีปุ่มบันทึก/ลบ */
   const id=Object.keys(CSTOCK.lots)[0];cstTog(id);
   const el=document.querySelector('#cstBody .cst-lot');
   o.btns=[...el.querySelectorAll('button')].map(b=>b.textContent.trim()).join(' | ');
   /* เรียกฟังก์ชันเขียนตรง ๆ ก็ต้องไม่เขียน */
   const snap=JSON.stringify(CSTOCK);const s0=window.__sync;window.__alerts=[];
   CST.f={sid:'',d:todayISO(),own:'x',nw:'',ng:'',seq:1,
     rows:[{k:'r1',code:'65660382',nm:'โอโม',cs:5,pc:0,ln:'CT11',own:''}]};
   cstSlipSave();
   cstClrOpen(id);const openM=!document.getElementById('cstClrModal').classList.contains('hidden');
   cstDel(id);cstSlipDel(cstSlipList()[0].id);
   o.same=JSON.stringify(CSTOCK)===snap;o.sync=window.__sync-s0;o.openM=openM;
   o.alert=window.__alerts.join('|');
   CST.f=null;S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};renderTabs();
   return o;});
 t('👤 เซลล์เห็นแท็บ 🧊 สต็อคกลาง และเห็นลอตที่ยังค้างอยู่',
   /สต็อคกลาง/.test(sales.tab)&&sales.lots>0,sales.lots+' ลอต · '+sales.tab);
 t('...แต่ไม่เห็นปุ่มตัดบิลใหม่ / อัพโหลด / สลับไปหน้าใบตัดบิล',
   sales.upBar==='none'&&sales.secBox==='none'&&sales.sec==='list',
   'up='+sales.upBar+' sec='+sales.secBox);
 t('...และในรายละเอียดลอตไม่มีปุ่มบันทึกขายออก/ลบ',
   !/ขายออก/.test(sales.btns)&&!/ลบลอต/.test(sales.btns),sales.btns||'(ไม่มีปุ่ม)');
 t('🛟 เซลล์เรียกฟังก์ชันบันทึก/ลบตรง ๆ ก็เขียนอะไรไม่ได้เลย',
   sales.same&&sales.sync===0&&!sales.openM,'sync +'+sales.sync+' · '+(sales.alert||'ไม่มีการเขียน'));

 /* ==========================================================================
  * 16) ไฟล์ Ex.export ตัวจริงของเจ้าของ (ถ้ามีในเครื่อง)
  *     ⛔ ไม่ commit เข้า repo — มีชื่อร้านลูกค้าจริง (ดู .gitignore)
  *     วางเองที่ test/browser/fixtures/ex-export.xlsx แล้วเทสต์นี้จะทำงาน
  * ======================================================================== */
 const F_EX=path.join(__dirname,'fixtures','ex-export.xlsx');
 if(fs.existsSync(F_EX)){
   const r=await ev(a=>{
     const now=Date.now();
     CSTOCK={lots:{},del:{},slips:{},sdel:{},ex:{},up:0};
     let err='';let o=null;
     try{o=parseCStockEx('Ex.export.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));}
     catch(e){err=String(e.message||e);}
     if(!o)return {err:err};
     /* จับคู่อัตโนมัติจากวันที่ในไฟล์ ต้องทำงานกับไฟล์จริงด้วย */
     const sid='B'+String(o.d).replace(/-/g,'')+'-01';
     CSTOCK.slips[sid]={id:sid,d:o.d,own:'Supervisor',up:now};
     CST.exFor='';window.__log=[];
     cstExTake('Ex.export.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
     const ex=CSTOCK.ex[sid];
     return {o:{d:o.d,n:o.n,val:o.val,stores:o.stores,skip:o.skip,first:o.rows[0]},
       attached:!!ex,sid:sid,log:window.__log.join('\n')};
   },{b64:fs.readFileSync(F_EX).toString('base64')});
   t('📄 ไฟล์ Ex.export ตัวจริง: อ่านได้ทุกบิล',!r.err&&r.o.n===60,r.err||(r.o&&r.o.n+' บิล'));
   t('...รหัสร้าน 7 หลักและชื่อร้านมาถูกคอลัมน์',
     !!r.o&&/^\d{7}$/.test(r.o.first.c)&&!!r.o.first.n&&!/^\d/.test(r.o.first.n),
     r.o&&JSON.stringify(r.o.first));
   t('...มูลค่ารวมภาษี = 2,977.20 บาท ตรงกับไฟล์',!!r.o&&Math.abs(r.o.val-2977.2)<0.01,r.o&&r.o.val);
   t('...นับร้านไม่ซ้ำได้ 60 ร้าน และวันที่วางบิลอ่านออก',
     !!r.o&&r.o.stores===60&&r.o.d==='2026-10-27',r.o&&(r.o.stores+' ร้าน · '+r.o.d));
   t('...จับคู่ใบตัดบิลจากวันที่ในไฟล์ได้เองโดยไม่ต้องเลือกใบ',!!r.attached,r.sid);
 }else{
   console.log('  (ข้าม 5 เช็ค: ไม่มี test/browser/fixtures/ex-export.xlsx ในเครื่องนี้)');
 }

 /* ==========================================================================
  * 17) ☑️ ติ๊กหลายแถว แล้วปรับทีเดียว
  *     เจ้าของขอเอง 4 พ.ย. 69: *"ต้องการกรอก KA97 ทั้งใบ สามารถกดให้ติ๊กรายการที่จะปรับ
  *     และมีปุ่มปรับทุกรายการให้เป็น KA97 ได้ในครั้งเดียว"*
  * ======================================================================== */
 const bulk=await ev(()=>{
   CST.sec='bill';cstNew();
   CST.f.rows=[];CST.f.seq=0;cstRowAdd(5);
   CST.f.rows.forEach((r,i)=>{r.code='65660382';r.nm='โอโม ซอฟท์ ทัช';r.cs=1;r.ln='CT11';r.own='Supervisor';});
   renderCStock();
   const o={rows:CST.f.rows.length,boxes:document.querySelectorAll('#cstBill .cst-ft tbody input[type=checkbox]').length,
     barOff:/ติ๊กหน้าแถวที่ต้องการ/.test(document.querySelector('#cstBill .cst-bulk').textContent)};
   /* ติ๊ก 3 แถว แล้วปรับเป็น KA97 */
   cstSelTog(0);cstSelTog(2);cstSelTog(4);
   o.n=cstSelN();
   o.bar=/ติ๊กไว้ 3 แถว/.test(document.querySelector('#cstBill .cst-bulk').textContent);
   o.hl=document.querySelectorAll('#cstBill .cst-ft tbody tr.on').length;
   cstBulk('ln','KA97');
   o.lines=CST.f.rows.map(r=>r.ln).join(',');
   cstBulk('own','KA97');
   o.owns=CST.f.rows.map(r=>r.own).join(',');
   cstBulk('cs','7');
   o.cs=CST.f.rows.map(r=>+r.cs||0).join(',');
   cstBulk('pc','12');
   o.pc=CST.f.rows.map(r=>+r.pc||0).join(',');
   return o;});
 t('ทุกแถวมีช่องติ๊ก และแถบปรับหลายแถวบอกวิธีใช้ตอนยังไม่ได้ติ๊ก',
   bulk.rows===5&&bulk.boxes===5&&bulk.barOff,bulk.boxes+' ช่อง');
 t('☑️ ติ๊ก 3 แถว → แถบบอกจำนวน และแถวที่ติ๊กไฮไลต์',
   bulk.n===3&&bulk.bar&&bulk.hl===3,bulk.n+' แถว · ไฮไลต์ '+bulk.hl);
 t('🔑 กด "ปรับสายวิ่ง" เป็น KA97 → เฉพาะ 3 แถวที่ติ๊กเปลี่ยน แถวอื่นอยู่เหมือนเดิม',
   bulk.lines==='KA97,CT11,KA97,CT11,KA97',bulk.lines);
 t('...ปรับผู้รับผิดชอบพร้อมกันได้เหมือนกัน',
   bulk.owns==='KA97,Supervisor,KA97,Supervisor,KA97',bulk.owns);
 t('...ปรับจำนวนลัง/ชิ้นพร้อมกันได้',
   bulk.cs==='7,1,7,1,7'&&bulk.pc==='12,0,12,0,12',bulk.cs+' / '+bulk.pc);
 const bulk2=await ev(()=>{
   const o={};
   /* ปรับสินค้าทั้งชุดจากรหัสเดียว */
   MASTER.items['64852733']='คนอร์โจ๊กซองรสไก่10บ. 8x12x28';
   cstBulk('code','64852733');
   o.codes=CST.f.rows.map(r=>r.code).join(',');
   o.names=CST.f.rows.map(r=>r.nm).filter(n=>/โจ๊ก/.test(n)).length;
   /* ติ๊กทั้งหมด / ล้างติ๊ก */
   cstSelAll(true);o.all=cstSelN();
   cstSelAll(false);o.none=cstSelN();
   /* ไม่ได้ติ๊กอะไรแล้วกดปุ่ม ต้องเตือน ไม่ใช่เงียบ หรือไปปรับทั้งใบ */
   window.__alerts=[];const before=CST.f.rows.map(r=>r.ln).join(',');
   cstBulk('ln','CT12');cstBulkDel();cstBulkSpread();
   o.warn=window.__alerts.length;o.same=CST.f.rows.map(r=>r.ln).join(',')===before;
   /* ลบเฉพาะแถวที่ติ๊ก */
   cstSelTog(1);cstSelTog(3);cstBulkDel();
   o.left=CST.f.rows.length;
   /* กระจายทุกสายจากแถวที่ติ๊ก */
   cstSelAll(false);cstSelTog(0);cstBulkSpread();
   o.spread=CST.f.rows.length;
   o.lines=[...new Set(CST.f.rows.map(r=>r.ln))].length;
   return o;});
 /* ยังติ๊กอยู่ 3 แถวเหมือนเดิม การปรับสินค้าจึงต้องลงเฉพาะ 3 แถวนั้น ไม่ใช่ทั้งใบ */
 t('...ปรับสินค้าทั้งชุดจากรหัสเดียว แล้วชื่อมาจาก master data ให้เอง (เฉพาะแถวที่ติ๊ก)',
   bulk2.codes==='64852733,65660382,64852733,65660382,64852733'&&bulk2.names===3,
   bulk2.codes+' · '+bulk2.names+' แถว');
 t('ติ๊กทั้งหมด / ล้างติ๊ก ทำงานถูก',bulk2.all===5&&bulk2.none===0,bulk2.all+' → '+bulk2.none);
 t('🛟 ยังไม่ได้ติ๊กแล้วกดปุ่มปรับ/ลบ/กระจาย → เตือนทั้ง 3 ปุ่ม และไม่แก้อะไรเลย',
   bulk2.warn===3&&bulk2.same,bulk2.warn+' คำเตือน');
 t('🗑 ลบเฉพาะแถวที่ติ๊ก (5 − 2 = 3)',bulk2.left===3,bulk2.left+' แถว');
 t('⇉ กระจายทุกสายจากแถวที่ติ๊กได้เหมือนกัน',
   bulk2.spread>=12&&bulk2.lines>=12,bulk2.spread+' แถว · '+bulk2.lines+' สาย');
 await ev(()=>{cstFormClear&&(CST.f=null);try{localStorage.removeItem(cstDraftKey());}catch(e){}});

 /* ==========================================================================
  * 18) 📥 นำเข้าลอตเก่า 4 ใบ (ไฟล์ 4-11_Stock ของแอดมิน 1 + Stock_2026 ของแอดมิน 2)
  *     ตัวเลขทุกตัวด้านล่างมาจากไฟล์จริงทั้งสองไฟล์ ถ้าแก้ตารางนำเข้าแล้วเลขเพี้ยน เทสจะฟ้อง
  * ======================================================================== */
 const imp=await ev(()=>{
   CSTOCK={lots:{},del:{},slips:{},sdel:{},ex:{},up:0};
   CST.f=null;CST.sopen={};CST.open={};
   const s0=window.__sync;
   const r1=cstImport(),r2=cstImport();          /* รอบสองต้องไม่เพิ่มอะไร */
   const sum=sid=>{const rows=cstSlipRows(sid);const by={};
     rows.forEach(l=>{const o=by[l.code]||(by[l.code]={cs:0,pc:0,clr:0,n:0});
       o.cs+=+l.cs||0;o.pc+=+l.pc||0;o.clr+=cstClrCs(l);o.n++;});
     return by;};
   return {r1:r1,r2:r2,sync:window.__sync-s0,
     slips:cstSlipList().map(s=>s.id).join(','),
     a:sum('B20261019-01'),b:sum('B20261022-01'),c:sum('B20261027-01'),d:sum('B20261029-01'),
     dates:[...new Set(cstSlipRows('B20261027-01').map(l=>l.d))].sort().join(','),
     nw:CSTOCK.slips['B20261027-01'].nw,
     ng19:CSTOCK.slips['B20261019-01'].ng,
     left19:cstSlipRows('B20261019-01').reduce((x,l)=>x+cstLeft(l),0),
     pc19:cstSlipRows('B20261019-01').reduce((x,l)=>x+((+l.pc||0)-cstClrPc(l)),0),
     noLn:cstSlipRows('B20261027-01').filter(l=>!l.ln).length};});
 t('📥 นำเข้า 4 ใบ 44 แถว ในครั้งเดียว',
   imp.r1.slips===4&&imp.r1.rows===44,JSON.stringify(imp.r1));
 t('🛟 นำเข้าซ้ำไม่เพิ่มอะไรเลย (กันกดซ้ำ / เปิดหลายเครื่อง)',
   imp.r2.slips===0&&imp.r2.rows===0&&imp.r2.skip===4,JSON.stringify(imp.r2));
 t('...และสั่งบันทึกขึ้นเซิร์ฟเวอร์ครั้งเดียว',imp.sync===1,'sync +'+imp.sync);
 t('ใบครบ 4 ใบตามลอตจริง',
   imp.slips==='B20261029-01,B20261027-01,B20261022-01,B20261019-01',imp.slips);
 /* ใบ 19 ต.ค. — ชีต "ซอฟทัชชุด1" */
 t('ใบ 19 ต.ค.: โอโม ซอฟท์ ทัช 64 ลัง (8 สาย × 8) เคลียร์ส่งคุณกรานต์รุ้งหมดแล้ว',
   imp.a['65660382']&&imp.a['65660382'].cs===64&&imp.a['65660382'].n===8&&imp.a['65660382'].clr===64,
   JSON.stringify(imp.a['65660382']));
 t('...โอโมน้ำ พิงค์ ฟลอรัล ตัดบิลจริง 80 ลัง 192 ชิ้น เคลียร์ไป 55 ลัง',
   imp.a['64829046']&&imp.a['64829046'].cs===80&&imp.a['64829046'].pc===192&&imp.a['64829046'].clr===55,
   JSON.stringify(imp.a['64829046']));
 t('🔑 คงเหลือตรงกับที่เจ้าของเขียนไว้เอง: 25 ลัง + 192 ชิ้น = 30 ลัง 12 ชิ้น (36 ชิ้น/ลัง)',
   imp.left19===25&&imp.pc19===192,imp.left19+' ลัง '+imp.pc19+' ชิ้น');
 t('...และโน้ตอธิบายที่มาของตัวเลขไว้ในใบ ไม่ปล่อยให้งงทีหลัง',
   /85 ลัง 12 ชิ้น/.test(imp.ng19)&&/36 ชิ้น\/ลัง/.test(imp.ng19)&&/708 บิล/.test(imp.ng19),
   (imp.ng19.match(/หมายเหตุตัวเลข[^\n]*/)||[''])[0].slice(0,80));
 /* ใบ 22 ต.ค. — ชีต "สต็อคPT" */
 t('ใบ 22 ต.ค. (PT): คอมฟอร์ท 2 ตัว ตัวละ 5 ลัง · เบิกส่ง PT ไปแล้ว 3 ลัง',
   imp.b['69724339'].cs===5&&imp.b['69724339'].clr===3&&imp.b['69593551'].cs===5&&
   imp.b['69593551'].clr===0,JSON.stringify(imp.b));
 /* ใบ 27 ต.ค. — ชีต "ซอฟทัชชุด2" */
 t('ใบ 27 ต.ค.: โอโม ซอฟท์ ทัช 39 ลัง (14 แถว 4 วัน) ส่งสองเมืองหมดแล้ว',
   imp.c['65660382'].cs===39&&imp.c['65660382'].n===14&&imp.c['65660382'].clr===39,
   JSON.stringify(imp.c['65660382']));
 t('🔑 ใบเดียวที่ตัดบิลหลายวัน เก็บวันของแต่ละแถวไว้ครบ ไม่ถูกวันของใบทับ',
   imp.dates==='2026-10-27,2026-10-29,2026-10-30,2026-10-31',imp.dates);
 t('⚠️ โอโมน้ำ พิงค์ ฟลอรัล ของใบนี้ใช้ยอดที่ตัดบิลจริง 16 ลัง 48 ชิ้น (ไฟล์รวมไว้ 10 ลัง 24 ชิ้น)',
   imp.c['64829046'].cs===16&&imp.c['64829046'].pc===48,JSON.stringify(imp.c['64829046']));
 t('...แถวที่ไฟล์ไม่ได้ระบุสาย เก็บเป็น "ไม่ระบุ" ไม่ใช่เดาสายให้',imp.noLn===1,imp.noLn+' แถว');
 t('Note ถึงคลังมาจากข้อความที่เขียนไว้ท้ายชีตจริง',
   /ของแถมเอาเข้าลอย/.test(imp.nw)&&/จัดของแต่ตัวขาย/.test(imp.nw),imp.nw);
 /* ใบ 29 ต.ค. — ชีต "สต็อคซุป" */
 t('ใบ 29 ต.ค.: คนอร์ซุปก้อน 4 ลัง 48 ชิ้น (4 แถว) ยังไม่ได้เคลียร์',
   imp.d['65546800'].cs===4&&imp.d['65546800'].pc===48&&imp.d['65546800'].n===4&&
   imp.d['65546800'].clr===0,JSON.stringify(imp.d['65546800']));
 /* 🛟 ลบทิ้งแล้วต้องไม่ถูกนำเข้ากลับมาอีก */
 const impDel=await ev(()=>{
   cstSlipDel('B20261029-01');
   const gone=!CSTOCK.slips['B20261029-01']&&!!CSTOCK.sdel['B20261029-01'];
   const r=cstImport();
   return {gone:gone,back:!!CSTOCK.slips['B20261029-01'],r:r};});
 t('🛟 ใบที่ลบทิ้งแล้ว นำเข้าอีกกี่รอบก็ไม่กลับมา (ใช้ tombstone เดิม)',
   impDel.gone&&!impDel.back&&impDel.r.slips===0,JSON.stringify(impDel.r));
 /* 🛟 นำเข้าแล้วต้องไม่ไปแตะก้อนข้อมูลอื่น */
 const impBefore=await ev(new Function('return '+BLOBS));
 await ev(()=>{CSTOCK={lots:{},del:{},slips:{},sdel:{},ex:{},up:0};cstImport();});
 const impAfter=await ev(new Function('return '+BLOBS));
 t('🛟 การนำเข้าแตะแค่สต็อคกลาง ก้อนอื่นเหมือนเดิมทุกไบต์',impAfter===impBefore,'ok');
 /* เซลล์เรียกเองไม่ได้ */
 t('🛟 เซลล์สั่งนำเข้าเองไม่ได้',
   await ev(()=>{const u=S.user;S.user={id:'ct11',role:'sales',code:'209611',name:'CT11'};
     const n0=Object.keys(CSTOCK.slips).length;CSTOCK.slips={};
     const r=cstImport();const ok=r===null&&!Object.keys(CSTOCK.slips).length;
     S.user=u;cstImport();return ok;}),'ok');

 /* ==========================================================================
  * 19) 📄 ไฟล์สรุป Stock ของแอดมิน 2 — หลายลอตในไฟล์เดียว (ถ้ามีไฟล์จริงในเครื่อง)
  *     ⛔ ไม่ commit — มีชื่อร้านลูกค้าจริง 906 บิล (ดู .gitignore)
  * ======================================================================== */
 const F_ST=path.join(__dirname,'fixtures','stock-2026.xlsx');
 if(fs.existsSync(F_ST)){
   const st=await ev(a=>{
     CSTOCK={lots:{},del:{},slips:{},sdel:{},ex:{},up:0};cstImport();
     window.__log=[];CST.exFor='';
     const s0=window.__sync;let err='';
     try{cstExTake('Stock_2026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));}
     catch(e){err=String(e.message||e);}
     const ex={};Object.keys(CSTOCK.ex).forEach(k=>{const e=CSTOCK.ex[k];
       ex[k]={n:e.n,val:e.val,stores:new Set(e.rows.map(r=>r.c)).size,first:e.rows[0]};});
     return {err:err,ex:ex,sync:window.__sync-s0,log:window.__log.join('\n'),
       slip:JSON.stringify(CSTOCK.slips['B20261019-01'].ng).length>100};
   },{b64:fs.readFileSync(F_ST).toString('base64')});
   t('📄 อ่านไฟล์สรุป Stock ของแอดมิน 2 ได้ทั้ง 4 บล็อกในครั้งเดียว',
     !st.err&&Object.keys(st.ex).length===4,st.err||Object.keys(st.ex).join(','));
   t('🔑 บล็อก "Stock PT" ไปเกาะใบ 22 ต.ค. (30 บิล · 2,228.40 บาท)',
     st.ex['B20261022-01']&&st.ex['B20261022-01'].n===30&&
     Math.abs(st.ex['B20261022-01'].val-2228.4)<0.01,JSON.stringify(st.ex['B20261022-01']||{}).slice(0,80));
   t('🔑 บล็อก "Stock สองเมือง" ไปเกาะใบ 19 ต.ค. (708 บิล · 35,130.96 บาท)',
     st.ex['B20261019-01']&&st.ex['B20261019-01'].n===708&&
     Math.abs(st.ex['B20261019-01'].val-35130.96)<0.01,JSON.stringify(st.ex['B20261019-01']||{}).slice(0,80));
   t('🔑 บล็อก "Stock พี่แอ๊ะ รับผิดชอบ" ไปเกาะใบ 27 ต.ค. (132 บิล · 6,549.84 บาท)',
     st.ex['B20261027-01']&&st.ex['B20261027-01'].n===132&&
     Math.abs(st.ex['B20261027-01'].val-6549.84)<0.01,JSON.stringify(st.ex['B20261027-01']||{}).slice(0,80));
   t('🔑 บล็อก "คนอร์" ไปเกาะใบ 29 ต.ค. (36 บิล · 3,515.04 บาท)',
     st.ex['B20261029-01']&&st.ex['B20261029-01'].n===36&&
     Math.abs(st.ex['B20261029-01'].val-3515.04)<0.01,JSON.stringify(st.ex['B20261029-01']||{}).slice(0,80));
   t('...รหัสร้าน/ชื่อร้าน/เลขที่ INV. อ่านมาถูกคอลัมน์',
     /^\d{7}$/.test(st.ex['B20261022-01'].first.c)&&!!st.ex['B20261022-01'].first.n&&
     /^MF\d+$/.test(st.ex['B20261022-01'].first.dn),JSON.stringify(st.ex['B20261022-01'].first));
   t('...บันทึกขึ้นเซิร์ฟเวอร์ครั้งเดียวสำหรับทั้งไฟล์',st.sync===1,'sync +'+st.sync);
   t('...บันทึกการอัพบอกชัดว่าบล็อกไหนไปใบไหน',
     (st.log.match(/→ ใบ B\d{8}-\d{2}/g)||[]).length===4,
     (st.log.split('\n')[0]||'').replace(/<[^>]*>/g,'').slice(0,90));
 }else{
   console.log('  (ข้าม 8 เช็ค: ไม่มี test/browser/fixtures/stock-2026.xlsx ในเครื่องนี้)');
 }

 const real=errs.filter(e=>!/localStorage|SecurityError/.test(e));
 t('ไม่มี JavaScript error ตลอดเทสต์',real.length===0,real.join(' | '));

 await b.close();
 let fail=0;
 A.forEach(([ok,n,x])=>{if(!ok)fail++;console.log((ok?'  ok  ':'  FAIL')+'  '+n+(x?'   ['+x+']':''));});
 console.log('\n'+A.length+' checks · '+(A.length-fail)+' passed · '+fail+' failed');
 console.log(fail?'SOME FAILED':'ALL PASS ('+A.length+' checks)');
 process.exit(fail?1:0);
})();
