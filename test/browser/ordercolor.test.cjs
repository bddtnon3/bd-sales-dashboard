/* 🎨 สีในใบสั่งซื้อ — "ตัวไหนเปิดช่องสั่ง ตัวไหนปิดช่อง มันขึ้นไม่ตรงกัน" (เจ้าของแจ้ง 26 ต.ค. 69)
 *
 * วัดแล้วเจอบั๊กจริง 2 ตัว สร้างไฟล์ใบสั่งจำลองที่ใส่ "สีเดียวกันแต่เขียนคนละวิธี"
 * แบบที่ Excel ใช้จริง แล้วยิงเข้าตัวอ่านของเว็บ — เดิมผิด 5 จาก 14 กรณี
 *
 * ① สีแบบ indexed อ่านไม่เจอเลย → ช่องที่ "ปิด" อยู่ กลายเป็น "เปิดให้สั่ง"
 *    Excel เขียนสีถมได้ 3 แบบ: rgb="FF00FFFF" · indexed="15" · theme=N
 *    SheetJS 0.18.5 **ทิ้งค่า indexed ทิ้ง** — `<fgColor indexed="15"/>` กลายเป็น `{}`
 *    แล้วกู้ทีหลังไม่ได้ เพราะทุกฟิลล์ที่ใช้ indexed หน้าตาเหมือนกันหมด
 *    ที่ร้ายคือ ฟ้า=15 · ชมพู=14 · เหลือง=13 เป็นสามสีที่ Unilever ใช้พอดี
 *    แก้ด้วย poUnIndex(): แปลง indexed เป็นรหัสสีจริงใน xl/styles.xml ก่อนส่งให้ SheetJS อ่าน
 *
 * ② "ช่องสั่งมีสีอะไรก็ได้ = ปิดช่อง" → สีตกแต่งอ่อน ๆ กลายเป็น "ยังไม่เปิดให้สั่ง"
 *    และ `W(cc+6)||W(cc+7)` ทำให้สีตกแต่งที่ช่องซ้าย บังสีสถานะจริงที่ช่องขวา
 *    แก้: ดูที่ "ความจัดของสี" (poIsCyan/poIsMag/poIsYel) · เลือกช่องที่มีสีที่รู้จักก่อน ·
 *    สีที่ไม่รู้จัก **ไม่เดาว่าปิด** แต่เก็บเป็น xu แล้วรายงานให้เจ้าของเห็น
 *
 * สร้างไฟล์เองทั้งหมด (ไม่มีข้อมูลจริงของบริษัท) จึงรันได้เสมอ
 * ต้องติดตั้งก่อน:  npm i --no-save playwright-core
 * แล้วรัน:  node build.cjs && node test/browser/ordercolor.test.cjs
 */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const BROWSER=require('./_chrome.cjs').chromePath();
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');
const FNAME='7001_15389839_Confirm_15389839_HPC_261026.xlsx';
const DATE='2026-10-26';

/* ---------- ฟิลล์ทุกแบบที่เจอในไฟล์จริง ---------- */
const FILLS=[
 '<fill><patternFill patternType="none"/></fill>',                                                               /* 0 ไม่มีสี */
 '<fill><patternFill patternType="gray125"/></fill>',                                                            /* 1 */
 '<fill><patternFill patternType="solid"><fgColor rgb="FF00FFFF"/><bgColor indexed="64"/></patternFill></fill>', /* 2 ฟ้า ARGB */
 '<fill><patternFill patternType="solid"><fgColor indexed="15"/><bgColor indexed="64"/></patternFill></fill>',   /* 3 ฟ้า indexed */
 '<fill><patternFill patternType="solid"><fgColor rgb="FFFF00FF"/><bgColor indexed="64"/></patternFill></fill>', /* 4 ชมพู ARGB */
 '<fill><patternFill patternType="solid"><fgColor indexed="14"/><bgColor indexed="64"/></patternFill></fill>',   /* 5 ชมพู indexed */
 '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/><bgColor indexed="64"/></patternFill></fill>', /* 6 เหลือง ARGB */
 '<fill><patternFill patternType="solid"><fgColor indexed="13"/><bgColor indexed="64"/></patternFill></fill>',   /* 7 เหลือง indexed */
 '<fill><patternFill patternType="solid"><fgColor rgb="FFA5A5A5"/><bgColor indexed="64"/></patternFill></fill>', /* 8 เทา ARGB */
 '<fill><patternFill patternType="solid"><fgColor theme="0" tint="-0.349986266670736"/><bgColor indexed="64"/></patternFill></fill>', /* 9 เทา theme */
 '<fill><patternFill patternType="solid"><fgColor rgb="FFFFCCFF"/><bgColor indexed="64"/></patternFill></fill>', /* 10 ชมพูอ่อน = โควต้า */
 '<fill><patternFill patternType="solid"><fgColor rgb="FFD9E1F2"/><bgColor indexed="64"/></patternFill></fill>', /* 11 ฟ้าอ่อน = สีตกแต่ง */
 '<fill><patternFill patternType="solid"><fgColor indexed="64"/><bgColor indexed="64"/></patternFill></fill>',   /* 12 อัตโนมัติ (ห้ามแปลง) */
];
/* [รหัส, ชื่อ, สีช่องชื่อ, สีช่องรหัส, สี VMI(cc+6), สี Confirm(cc+7), ผลที่ต้องได้, คำอธิบาย] */
const ROWS=[
 ['70000001','บรีสน้ำ ปกติ 12X500มล',        0,0,0,0,  'open',   'ไม่มีสีเลย = เปิดให้สั่ง'],
 ['70000002','โอโมน้ำ ปิดฟ้า 12X500มล',      0,0,0,2,  'closed', 'ฟ้า เขียนแบบ rgb'],
 ['70000003','คอมฟอร์ท ปิดฟ้า 12X500มล',     0,0,0,3,  'closed', '⭐ ฟ้า เขียนแบบ indexed (บั๊กเดิม)'],
 ['70000004','ซันไลต์ เลิกขาย 12X500มล',     0,0,0,4,  'dropped','ชมพู เขียนแบบ rgb'],
 ['70000005','วาสลีน เลิกขาย 12X500มล',      0,0,0,5,  'dropped','⭐ ชมพู เขียนแบบ indexed (บั๊กเดิม)'],
 ['70000006','ลักส์ 7F1 แถม 12X500มล',       6,0,0,0,  'promo',  'เหลือง rgb ที่ช่องชื่อ'],
 ['70000007','โดฟ 6F1 แถม 12X500มล',         7,0,0,0,  'promo',  '⭐ เหลือง indexed ที่ช่องชื่อ (บั๊กเดิม)'],
 ['70000008','พอนด์ส ของขาด 12X500มล',       8,0,0,0,  'oos',    'เทา A5A5A5'],
 ['70000009','ซิตร้า ของขาด 12X500มล',       9,0,0,0,  'oos',    'เทา theme+tint'],
 ['70000010','คนอร์ รหัสใหม่ 12X500มล',      0,6,0,0,  'newcode','เหลือง rgb ที่ช่องรหัส'],
 ['70000011','เบสท์ฟู้ด รหัสใหม่ 12X500มล',  0,7,0,0,  'newcode','⭐ เหลือง indexed ที่ช่องรหัส (บั๊กเดิม)'],
 ['70000012','ซันซิล โควต้า 12X500มล',       0,10,0,0, 'quota',  'ชมพูอ่อนที่ช่องรหัส = โควต้า'],
 ['70000013','คลีโนลัน ปิดฟ้า 12X500มล',     0,0,11,2, 'closed', '⭐ VMI มีสีตกแต่ง แต่สถานะจริงอยู่ช่องขวา'],
 ['70000014','เคลียร์ สีตกแต่ง 12X500มล',    0,0,0,11, 'open',   '⭐ สีอ่อนที่ช่องสั่ง ไม่ใช่สถานะ (บั๊กเดิม)'],
 ['70000015','เรโซนา สีอัตโนมัติ 12X500มล',  0,0,0,12, 'open',   'indexed 64 = อัตโนมัติ ห้ามแปลงเป็นสี'],
];
const COL='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const CC=3;                                   /* คอลัมน์ "รหัส" */

/* สร้างไฟล์ xlsx ในหน้าเว็บ (ที่นั่นมี JSZip อยู่แล้ว) แล้วส่ง base64 กลับมา */
function buildXlsxInPage(opt){
  opt=opt||{};
  const FILLS=opt.FILLS,ROWS=opt.ROWS,COL=opt.COL,CC=opt.CC;
  const xf=FILLS.map((_,i)=>`<xf numFmtId="0" fontId="0" fillId="${i}" borderId="0" xfId="0" applyFill="1"/>`);
  /* ไฟล์บางไฟล์ตั้งจานสี indexed ของตัวเอง — ต้องอ่านจานของไฟล์ ไม่ใช่จานมาตรฐานเสมอ */
  const custom=opt.palette?`<colors><indexedColors>${
    opt.palette.map(c=>`<rgbColor rgb="00${c}"/>`).join('')}</indexedColors></colors>`:'';
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts>
<fills count="${FILLS.length}">${FILLS.join('')}</fills>
<borders count="1"><border/></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${xf.length}">${xf.join('')}</cellXfs>${custom}</styleSheet>`;
  const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let sd='';
  sd+=`<row r="1"><c r="A1" t="inlineStr"><is><t>วันที่สั่งสินค้า</t></is></c><c r="B1" t="inlineStr"><is><t>26/10/2026</t></is></c></row>`;
  sd+=`<row r="2"><c r="${COL[CC]}2" t="inlineStr"><is><t>รหัส</t></is></c></row>`;
  sd+=`<row r="3"/>`;
  const rows=ROWS;
  rows.forEach(([code,nm,fn,fk,fv,fo],i)=>{
    const r=4+i,cells=[];
    const add=(j,txt,s)=>{const ref=COL[j]+r;
      cells.push(txt==null?`<c r="${ref}"${s?` s="${s}"`:''}/>`
        :`<c r="${ref}"${s?` s="${s}"`:''} t="inlineStr"><is><t>${esc(txt)}</t></is></c>`);};
    add(CC-3,nm,fn);add(CC-2,'สูตร',0);add(CC-1,'12X500',0);add(CC,code,fk);
    for(let j=CC+1;j<=CC+5;j++)add(j,null,0);
    add(CC+6,null,fv);add(CC+7,null,fo);
    sd+=`<row r="${r}">${cells.join('')}</row>`;
  });
  const sheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:${COL[CC+7]}${3+rows.length}"/><sheetData>${sd}</sheetData></worksheet>`;
  const z=new window.JSZip();
  z.file('[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`);
  z.file('_rels/.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  z.file('xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Home_Care" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  z.file('xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
  z.file('xl/styles.xml',styles);
  z.file('xl/worksheets/sheet1.xml',sheet);
  return z.generateAsync({type:'base64'});
}


const BLOBS=`JSON.stringify({DATA,STORE,KPI,ORDERS,STOCKD,REQUESTS,MASTER,ANALYTICS,STOREPROD,
  STOREDAILY,PSTORE,EB2B,POSTATUS,LEADS,DCI,MINSTOCK,PLAN,PROMO,PJP})`;

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const pg=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.setContent(fs.readFileSync(PAGE,'utf8'),{waitUntil:'domcontentloaded'});
 await pg.addScriptTag({path:require.resolve('xlsx/dist/xlsx.full.min.js')});
 /* หน้าเว็บจริงโหลด jszip เองตอนใช้ (poLoadZip) — ในเทสไม่มี origin ให้โหลด จึงใส่ไว้ก่อน */
 await pg.addScriptTag({path:path.join(ROOT,'public','vendor','jszip.min.js')});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);
 /* ให้หน้าเว็บประกอบไฟล์ xlsx ให้ (JSZip อยู่ในหน้านั้น) */
 await pg.addScriptTag({content:'window.__build='+buildXlsxInPage.toString()+';'});
 const build=o=>pg.evaluate(a=>window.__build(a),
   Object.assign({FILLS,ROWS,COL,CC},o||{}));
 const b64=await build();

 await ev(()=>{
   document.getElementById('login').classList.add('hidden');
   document.getElementById('app').classList.remove('hidden');
   window.Chart=function(){return{destroy(){}}};
   window.__log=[];window.ulog=m=>window.__log.push(String(m));
   window.__alert=[];window.alert=m=>window.__alert.push(String(m));
   window.__sync=0;window.syncToServer=()=>{window.__sync++;};
   window.fetch=()=>Promise.reject(new Error('เทสนี้ห้ามยิงเน็ต'));
   TOKEN=null;S.user={id:'m',role:'manager',name:'ผู้จัดการ'};
   POSTATUS={dates:[],data:{}};ORDERS={dates:[],data:{},names:{},cat:{},catN:{}};
   STOCKD={date:null,rows:[],names:{}};MASTER={items:{}};
   window.__load=b64=>parseOrderForm('7001_15389839_Confirm_15389839_HPC_261026.xlsx',
     Uint8Array.from(atob(b64),c=>c.charCodeAt(0)),'blank');
 });
 const before=await ev(new Function('return '+BLOBS));

 /* ---------- 1) อ่านสีถูกทุกวิธีเขียน ---------- */
 await ev(a=>window.__load(a.b64),{b64});
 const read=await ev(a=>{
   const d=Object.keys(POSTATUS.data)[0],it=POSTATUS.data[d].items;
   const got=c=>{const e=it[c];if(!e)return 'open';
     if(e.x)return poClosedKind(e.x)==='dropped'?'dropped':'closed';
     if(e.p)return 'promo';if(e.s)return 'oos';
     if(e.q)return 'quota';if(e.k===2)return 'quota';if(e.k===1)return 'newcode';
     return 'open';};
   return {date:d,got:a.codes.map(got),
     all:String(POSTATUS.data[d].all||'').split(',').filter(Boolean).length,
     xu:Object.keys(it).filter(c=>it[c].xu).map(c=>c+':'+it[c].xu),
     log:window.__log.join('\n')};
 },{codes:ROWS.map(r=>r[0])});
 t('อ่านวันที่รอบจากชื่อไฟล์ถูก',read.date===DATE,read.date);
 t('เก็บรหัสครบทุกแถวในใบ',read.all===ROWS.length,read.all+'/'+ROWS.length);
 ROWS.forEach((r,i)=>{
   const star=r[7].indexOf('⭐')===0;
   t((star?'🔧 ':'')+r[7]+' → '+r[6],read.got[i]===r[6],
     'รหัส '+r[0]+' ควรเป็น '+r[6]+' ได้ '+read.got[i]);
 });

 /* ---------- 2) สีที่ไม่รู้จัก: รายงาน ไม่ใช่เดาว่าปิดช่อง ---------- */
 t('สีตกแต่งที่ช่องสั่งถูกเก็บเป็น "สีที่ไม่รู้จัก" ไว้รายงาน',
   read.xu.length===1&&/70000014:D9E1F2/.test(read.xu[0]),read.xu.join(' | '));
 t('...และ xu ไม่ถูกนับเป็น "ยังไม่เปิดให้สั่ง"',
   await ev(()=>psRows(psDay(PS2.date||Object.keys(POSTATUS.data)[0]),'x')
     .every(r=>r.code!=='70000014')),'ok');
 t('...บันทึกการอัพบอกว่าเจอสีอะไร กี่รายการ',
   /ไม่รู้จัก/.test(read.log)&&/D9E1F2/.test(read.log)&&/1 รายการ/.test(read.log),
   (read.log.match(/.*ไม่รู้จัก.*/)||[''])[0].replace(/<[^>]*>/g,'').slice(0,120));
 t('บันทึกการอัพบอกว่าแปลงสี indexed ไปกี่สี',
   /indexed/.test(read.log),(read.log.match(/.*indexed.*/)||[''])[0].replace(/<[^>]*>/g,''));
 t('บันทึกการอัพสรุปจำนวนให้ทานกับไฟล์ได้ (ทั้งใบ / มีสี / เปิดปกติ)',
   /ในใบมี/.test(read.log)&&/เปิดให้สั่งปกติ/.test(read.log),
   (read.log.match(/.*ในใบมี.*/)||[''])[0].replace(/<[^>]*>/g,''));

 /* ---------- 3) ตัวเลขบนหน้าจอตรงกับที่นับจากไฟล์ ---------- */
 const want={p:2,q:1,s:2,x:3,xd:2,k:2};
 const screen=await ev(()=>{
   PS2.date=Object.keys(POSTATUS.data)[0];PS2.sec='all';
   _switchTab('pos');renderPOS();
   const day=psDay(PS2.date),o={};
   PS_SEC.forEach(sec=>o[sec.k]=psRows(day,sec.k).length);
   return {o:o,bar:document.getElementById('posBar').innerText.replace(/\s+/g,' '),
     cards:[...document.querySelectorAll('#posCards .pos-card')].map(c=>c.innerText.replace(/\s+/g,' '))};
 });
 Object.keys(want).forEach(k=>{
   const lab={p:'🎁 โปรโมชั่นแถมในบิล',q:'🎫 โควต้า',s:'⚠️ ของขาดชั่วคราว',
     x:'🔄 ยังไม่เปิดให้สั่ง',xd:'⛔ เลิกขายแล้ว',k:'🆕 รหัสสินค้าใหม่'}[k];
   t('การ์ด '+lab+' = '+want[k],screen.o[k]===want[k],'ได้ '+screen.o[k]);
 });
 t('🔍 แถบบนสุดทานกับไฟล์ได้: อ่านกี่รหัส · ติดสถานะกี่ตัว · เปิดปกติกี่ตัว',
   /อ่านจากใบได้ 15 รหัส/.test(screen.bar)&&/ติดสถานะพิเศษ 12/.test(screen.bar)&&/เปิดให้สั่งตามปกติ 3/.test(screen.bar),
   screen.bar.slice(150));
 t('...และเตือนว่าเจอสีที่ไม่รู้จัก พร้อมบอกว่ายังถือว่าเปิดให้สั่ง',
   /ไม่รู้จัก/.test(screen.bar)&&/D9E1F2/.test(screen.bar)&&/เปิดให้สั่ง/.test(screen.bar),'ok');

 /* ---------- 4) ไฟล์ที่ตั้งจานสี indexed เอง ---------- */
 const pal=new Array(64).fill('000000');
 pal[13]='00FFFF';pal[14]='FFFF00';pal[15]='FF00FF';        /* สลับความหมายของสามเลข */
 const b64p=await build({palette:pal});
 const custom=await ev(async a=>{
   POSTATUS={dates:[],data:{}};window.__log=[];
   await window.__load(a.b64);
   const d=Object.keys(POSTATUS.data)[0],it=POSTATUS.data[d].items;
   return {c3:it['70000003']||{},c5:it['70000005']||{},c7:it['70000007']||{},c11:it['70000011']||{}};
 },{b64:b64p});
 t('ไฟล์ตั้งจานสี indexed เอง → ใช้จานของไฟล์ ไม่ใช่จานมาตรฐาน (13 เป็นฟ้า)',
   custom.c3.x&&String(custom.c3.x).toUpperCase()==='FF00FF',JSON.stringify(custom.c3));
 t('...เลข 14 ที่ไฟล์ตั้งเป็นเหลือง อ่านได้เป็นโควต้า/แถม ไม่ใช่เลิกขาย',
   !custom.c5.x,JSON.stringify(custom.c5));
 t('...เลข 15 ที่ไฟล์ตั้งเป็นชมพู อ่านได้เป็นเลิกขาย',
   custom.c7.p===undefined,JSON.stringify(custom.c7));

 /* ---------- 5) 🛟 ความปลอดภัยข้อมูล ---------- */
 const after=await ev(new Function('return '+BLOBS));
 const a1=JSON.parse(before),b1=JSON.parse(after);
 const moved=Object.keys(a1).filter(k=>JSON.stringify(a1[k])!==JSON.stringify(b1[k]));
 /* ใบเปล่าเติมชื่อ/หมวดสินค้าลง ORDERS ได้ (เป็นข้อมูลประกอบ ไม่ใช่จำนวนสั่ง)
    แต่ต้องไม่แตะจำนวนสั่งหรือวันที่ และก้อนอื่นต้องไม่ขยับเลย */
 t('🛟 อัพใบเปล่าแตะแค่ POSTATUS กับชื่อ/หมวดใน ORDERS — ก้อนอื่นไม่ขยับ',
   moved.every(k=>k==='POSTATUS'||k==='ORDERS'),moved.join(', ')||'(ไม่มี)');
 t('🛟 ...และใน ORDERS เปลี่ยนแค่ names/cat/catN ไม่ใช่ data/dates',
   (()=>{const A=a1.ORDERS||{},B=b1.ORDERS||{};
     return Object.keys(Object.assign({},A,B)).every(k=>
       ['names','cat','catN'].includes(k)||JSON.stringify(A[k])===JSON.stringify(B[k]));})(),
   JSON.stringify(Object.keys(b1.ORDERS||{})));
 t('🛟 ใบเปล่าไม่สร้างวันใน ORDERS (จำนวนสั่งต้องมาจากไฟล์ BD_ เท่านั้น)',
   await ev(()=>Object.keys(ORDERS.data).length===0&&ORDERS.dates.length===0),
   await ev(()=>JSON.stringify(Object.keys(ORDERS.data))));

 /* ---------- 6) รหัสซ้ำสองแถว: แถวที่ปิดต้องชนะ ---------- */
 const dup=await ev(async a=>{
   POSTATUS={dates:[],data:{}};window.__log=[];
   await window.__load(a.b64);
   const d=Object.keys(POSTATUS.data)[0],it=POSTATUS.data[d].items;
   return {x:(it['70000020']||{}).x||null,n:String(POSTATUS.data[d].all).split(',').filter(Boolean).length};
 },{b64:await build({ROWS:[
   ['70000020','สินค้ารหัสซ้ำ แถวเปิด',0,0,0,0],
   ['70000020','สินค้ารหัสซ้ำ แถวปิดฟ้า',0,0,0,2],
 ]})});
 t('รหัสเดียวกันโผล่สองแถว แถวที่ปิดช่องชนะ (ไม่ใช่แถวหลังทับแถวแรกเฉย ๆ)',
   dup.x&&String(dup.x).toUpperCase()==='00FFFF',String(dup.x));
 t('...และนับเป็นรหัสเดียว ไม่ซ้ำ',dup.n===1,dup.n);

 /* ---------- 7) รอบเก่าที่เก็บสีตกแต่งไว้เป็น "ปิดช่อง" ต้องซ่อมตอนอ่าน ไม่เขียนทับ ---------- */
 const legacy=await ev(()=>{
   /* จำลองข้อมูลที่อัพไว้ก่อนแก้: ช่อง x เก็บสีตกแต่งไว้ (ตัวอ่านเดิมเหมาว่าปิดช่อง) */
   const d='2026-09-01';
   POSTATUS.data[d]={up:1,file:'เก่า.xlsm',allSeq:1,all:'80000001,80000002,80000003',
     items:{'80000001':{x:'00FFFF'},'80000002':{x:'FF00FF'},'80000003':{x:'D9E1F2'}}};
   POSTATUS.dates=Object.keys(POSTATUS.data).sort();
   const snap=JSON.stringify(POSTATUS.data[d]);
   PS2.date=d;renderPOS();
   const day=psDay(d);
   return {closed:psRows(day,'x').map(r=>r.code),dead:psRows(day,'xd').map(r=>r.code),
     why:poWhy(d,'80000003').why,block:(typeof dbBlock==='function')?dbBlock(day,'80000003'):null,
     same:JSON.stringify(POSTATUS.data[d])===snap};
 });
 t('🔧 รอบเก่า: ฟ้ายังเป็น "ยังไม่เปิดให้สั่ง"',legacy.closed.join()==='80000001',legacy.closed.join());
 t('🔧 รอบเก่า: ชมพูยังเป็น "เลิกขาย"',legacy.dead.join()==='80000002',legacy.dead.join());
 t('🔧 รอบเก่า: สีตกแต่งที่เคยถูกเหมาว่าปิด ไม่ขึ้นเป็นปิดอีกแล้ว',
   legacy.closed.indexOf('80000003')<0&&legacy.dead.indexOf('80000003')<0,
   legacy.closed.join()+' / '+legacy.dead.join());
 t('🔧 ...และ "ทำไมไม่ได้สั่ง" ก็ไม่ตอบว่าปิดช่อง',legacy.why!=='closed'&&legacy.why!=='dropped',legacy.why);
 t('🔧 ...Drop ค้าง ก็ไม่บล็อกการสั่งซ้ำเพราะสีที่ไม่รู้จัก',
   !legacy.block||(legacy.block.k!=='closed'&&legacy.block.k!=='dropped'),JSON.stringify(legacy.block));
 t('🛟 ซ่อมตอนอ่านเท่านั้น — ข้อมูลรอบเก่าที่เก็บไว้ไม่ถูกเขียนทับแม้ไบต์เดียว',legacy.same,'ok');

 const real=errs.filter(e=>!/localStorage|SecurityError/.test(e));
 t('ไม่มี JavaScript error ตลอดเทสต์',real.length===0,real.join(' | '));
 t('ไม่มีการยิงเน็ตระหว่างอ่านไฟล์',await ev(()=>window.__alert.length===0),
   await ev(()=>window.__alert.join(' | ')));

 await b.close();
 let fail=0;
 A.forEach(([ok,n,x])=>{if(!ok)fail++;console.log((ok?'  ok  ':'  FAIL')+'  '+n+(x?'   ['+x+']':''));});
 console.log('\n'+A.length+' checks · '+(A.length-fail)+' passed · '+fail+' failed');
 console.log(fail?'SOME FAILED':'ALL PASS ('+A.length+' checks)');
 process.exit(fail?1:0);
})();
