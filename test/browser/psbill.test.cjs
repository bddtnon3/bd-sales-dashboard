/* 🎁 โปรโมชั่นแถมในบิล — แบ่งหัวข้อตามอัตราแถม แล้วไล่ตามแบรนด์และขนาด
 *
 * เจ้าของแจ้ง 13 ต.ค. 69 ว่าหน้านี้ "ลายตา": 30 รายการกองอยู่ในแถบ Home_Care ก้อนเดียว
 * แล้วอัตราแถมสลับกันไปมา (7แถม1 · 6แถม1 · 7แถม1 · 12แถม1 · 11แถม1)
 * สิ่งที่ต้องพิสูจน์:
 *   1) ชื่อสินค้าจริงในใบสั่งถอดแบรนด์และขนาดต่อชิ้นได้ถูกทุกชื่อ
 *   2) แถบหัวข้อเป็นอัตราแถม เรียงอัตราที่คุ้มที่สุดก่อน
 *   3) ในแถบเดียวกัน แบรนด์เดียวกันอยู่ติดกัน และขนาดไล่จากน้อยไปมาก
 *   4) ตัวเลขสรุปบนหัวแถบ (ลงตัว / เหลือเศษ / ยังไม่สั่ง) ตรงกับที่คำนวณได้
 *   5) หน้านี้อ่านอย่างเดียว — ข้อมูลทุกก้อนต้องไม่ขยับแม้ไบต์เดียว
 *
 * ต้องติดตั้งก่อน:  npm i --no-save playwright-core
 * แล้วรัน:  node build.cjs && node test/browser/psbill.test.cjs
 */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const BROWSER=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGE=path.resolve(__dirname,'..','..','public','index.html');
const D='2026-10-01';

/* 18 รายการจริงจากภาพที่เจ้าของส่งมา — [รหัส, ชื่อในใบสั่ง, ซื้อ, แถม, แบรนด์ที่ควรได้, ขนาด, หน่วย] */
const REAL=[
 ['64816247','บรีสน้ำอัลตร้า เขียว คู่6X(2X560)มล',      7,1,'บรีสน้ำอัลตร้า',560,'ml'],
 ['64391615','บรีสน้ำอัลตร้า เขียว 20B 12X3X130มล',      6,1,'บรีสน้ำอัลตร้า',130,'ml'],
 ['64816286','บรีสน้ำฟลอรัล ชมพู คู่ 6X(2X560)มล',       7,1,'บรีสน้ำฟลอรัล', 560,'ml'],
 ['64391616','บรีสน้ำฟลอรัล ชมพู 20B 12X3X130มล',        6,1,'บรีสน้ำฟลอรัล', 130,'ml'],
 ['65542619','บรีสน้ำ ลิลลี่ แดง คู่ 6X(2X530)มล',       7,1,'บรีสน้ำ',       530,'ml'],
 ['64819916','บรีสน้ำซิก พีโอนี่ ส้มคู่6X(2X530)มล',     7,1,'บรีสน้ำซิก',    530,'ml'],
 ['65624694','บรีสน้ำซิก เฮฟเวน TW 6X(2X530)มล',         7,1,'บรีสน้ำซิก',    530,'ml'],
 ['64914236','บรีสน้ำซิก แป้ง ฟ้าใสคู่ 6(2X530)มล',      7,1,'บรีสน้ำซิก',    530,'ml'],
 ['65453458','บรีสน้ำ คอตตอนแคนดี้คู่ 6X(2X530)มล',      7,1,'บรีสน้ำ',       530,'ml'],
 ['65598040','บรีสน้ำ เพียว แฮปปี้คู่ 6X(2X530)มล',      7,1,'บรีสน้ำ',       530,'ml'],
 ['64381502','บรีสน้ำ ป้องกันสีตก TW 6X(2X550)ML',       7,1,'บรีสน้ำ',       550,'ml'],
 ['65456777','บรีสเอกเซล 69B 12X750 กรัม',              12,1,'บรีสเอกเซล',    750,'g'],
 ['65456729','บรีสเอกเซล 20B 6X6X160 กรัม',              6,1,'บรีสเอกเซล',    160,'g'],
 ['65456778','บรีสเอกเซล ชมพู 69B 12X750 กรัม',         12,1,'บรีสเอกเซล',    750,'g'],
 ['65456730','บรีสเอกเซล ชมพู 20B 6X6X160 กรัม',         6,1,'บรีสเอกเซล',    160,'g'],
 ['64939085','โอโมน้ำ ปารีส TW 6X(2X530)มล',            11,1,'โอโมน้ำ',       530,'ml'],
 ['64329237','โอโม ลิควิด ไวท์ TW 6X(2X530)มล',         11,1,'โอโม',          530,'ml'],
 ['65711451','โอโมลิควิด ซันชายน์ ลดอับ FO15 6X(2X520)มล',11,1,'โอโมลิควิด',  520,'ml'],
];
/* ชื่อแบบอื่นที่เคยเจอในไฟล์ของเจ้าของ — หน่วยอังกฤษ ลิตร กิโล และซอง/ก้อน */
const UNITS=[
 ['ซันไลต์ เลมอน 6X3.8 ลิตร',            3800,'ml'],
 ['บรีส เมติก 4X4.5KG',                  4500,'g'],
 ['ลักส์ สบู่ก้อน 144X70 ก.',              70,'g'],
 ['คนอร์ ก้อน รสหมู 12X12X32G',            32,'g'],
 ['วาสลีน เจลลี่ 24X100 CC',              100,'ml'],
 ['พอนด์ส ครีมกลางวัน 5.5 กรัม',           5.5,'g'],
 ['สินค้าไม่บอกขนาด แพ็คคู่',                0,'zz'],
];

const BLOBS=`JSON.stringify({DATA,STORE,KPI,ORDERS,STOCKD,REQUESTS,MASTER,ANALYTICS,STOREPROD,
  STOREDAILY,PSTORE,EB2B,POSTATUS,LEADS,DCI,MINSTOCK,PLAN,PROMO,PJP})`;

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const pg=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.setContent(fs.readFileSync(PAGE,'utf8'),{waitUntil:'domcontentloaded'});

 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);

 await ev(a=>{
   document.getElementById('login').classList.add('hidden');
   document.getElementById('app').classList.remove('hidden');
   window.Chart=function(){return{destroy(){}}};
   window.__posts=[];
   window.fetch=(u,o)=>{window.__posts.push(String(u));
     return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({ok:true})});};
   window.alert=()=>{};window.confirm=()=>true;
   TOKEN='test-token';
   S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
   const items={},nm={},cat={},ord={};
   /* จำนวนที่ศูนย์สั่ง วนให้ครบทุกกรณี: ไม่สั่ง · ลงตัวพอดี · เหลือเศษ · ลงตัวสองชุด */
   a.REAL.forEach(([c,n,bb,f],i)=>{items[c]={p:1,b:bb,f:f};nm[c]=n;cat[c]='Home_Care';
     ord[c]=[0,bb,bb+1,bb*2][i%4];});
   /* หนึ่งรายการที่อ่านอัตราแถมจากไฟล์ไม่ได้ (b=0) ต้องไปอยู่แถบท้ายสุด */
   items['69999999']={p:1,b:0,f:0};nm['69999999']='สินค้าอ่านอัตราไม่ได้ 6X(2X500)มล';cat['69999999']='Home_Care';
   POSTATUS={dates:[a.D],data:{[a.D]:{items:items,file:'BD_011026.xlsx',
     all:Object.keys(items),allSeq:1}}};
   ORDERS={dates:[a.D],names:nm,cat:cat,catN:{},
     data:{[a.D]:{rounds:{main:ord},dropped:null,hasResult:true}}};
   PS2={main:'prod',date:a.D,q:'',sec:'p',chart:'bar',month:'all',openLine:null};
 },{REAL,D});
 const before=await ev(new Function('return '+BLOBS));

 /* ---------- 1) ถอดแบรนด์และขนาดจากชื่อจริง ---------- */
 const parsed=await ev(a=>a.REAL.concat(a.UNITS.map(u=>[null,u[0],0,0,null,u[1],u[2]]))
   .map(([code,n,,,wantB,wantV,wantU])=>{
     const v=psVol(n);
     return {n:n,brand:psBrandKey(n),u:v.u,v:v.v,wantB:wantB,wantV:wantV,wantU:wantU};
   }),{REAL,UNITS});
 const badB=parsed.filter(p=>p.wantB&&p.brand!==p.wantB);
 const badV=parsed.filter(p=>p.v!==p.wantV||p.u!==p.wantU);
 t('ถอดแบรนด์จากชื่อในใบสั่งถูกทุกชื่อ (18 ชื่อจริงของเจ้าของ)',badB.length===0,
   badB.map(p=>p.n+' → '+p.brand+' (ควรเป็น '+p.wantB+')').join(' | '));
 t('ถอดขนาดต่อชิ้นถูกทุกชื่อ — เลขตัวสุดท้ายก่อนหน่วย ไม่ใช่เลขจำนวนแพ็ค',badV.length===0,
   badV.map(p=>p.n+' → '+p.v+p.u+' (ควรเป็น '+p.wantV+p.wantU+')').join(' | '));
 t('...รองรับหน่วยไทยและอังกฤษ รวมลิตร/กิโล (แปลงเป็น มล./กรัม ให้เทียบกันได้)',
   parsed.filter(p=>p.v===3800&&p.u==='ml').length===1&&parsed.filter(p=>p.v===4500&&p.u==='g').length===1,'ok');
 t('...ชื่อที่ไม่บอกขนาด ไม่พังและไปอยู่ท้ายกลุ่ม (u="zz")',
   parsed.filter(p=>p.wantU==='zz').every(p=>p.u==='zz'&&p.v===0),'ok');
 t('⚠️ "ก." ไม่ไปแมตช์คำว่า "ก้อน" และ "G" ไม่ไปแมตช์กลางคำอังกฤษ',
   await ev(()=>{const a1=psVol('ลักส์ สบู่ก้อน 144X70 ก.'),b1=psVol('โดฟ เจล MAGIC 12X200ML');
     return a1.v===70&&a1.u==='g'&&b1.v===200&&b1.u==='ml';}),'ok');

 /* ---------- 2) แถบหัวข้อ ---------- */
 const draw=await ev(()=>{
   _switchTab('pos');renderPOS();
   const trs=[...document.querySelectorAll('#posBody table tbody tr')];
   const bands=[],rows=[];let cur=null;
   trs.forEach(tr=>{
     if(tr.classList.contains('grp-row')){
       cur={title:tr.innerText.replace(/\s+/g,' ').trim(),rows:[]};
       bands.push(cur);return;}
     const td=[...tr.children].map(x=>x.innerText.replace(/\s+/g,' ').trim());
     const r={code:td[0],name:td[1],rate:td[2],ord:td[3],chk:td[4],band:bands.length-1};
     rows.push(r);if(cur)cur.rows.push(r);
   });
   return {bands:bands.map(b=>({title:b.title,n:b.rows.length})),rows:rows,
     note:document.getElementById('posBody').innerText.slice(0,400),
     sec:document.querySelectorAll('.pos-st').length};
 });
 t('หน้านี้วาดออกมาเป็นแถบตามอัตราแถม',draw.bands.length===5,
   draw.bands.map(b=>b.title).join(' // '));
 const titles=draw.bands.map(b=>b.title);
 t('หัวข้อเขียนอัตราแถมเป็นภาษาคน + ตัวย่อแบบ Unilever',
   /ซื้อ 6 แถม 1/.test(titles[0])&&/\(6F1\)/.test(titles[0]),titles[0]);
 t('เรียงอัตราที่คุ้มที่สุดก่อน (6F1 → 7F1 → 11F1 → 12F1)',
   /6F1/.test(titles[0])&&/7F1/.test(titles[1])&&/11F1/.test(titles[2])&&/12F1/.test(titles[3]),
   titles.join(' → '));
 t('รายการที่อ่านอัตราแถมจากไฟล์ไม่ได้ ไปอยู่แถบท้ายสุด ไม่ปนกับอัตราจริง',
   /อ่านอัตราแถม/.test(titles[4])&&draw.bands[4].n===1,titles[4]);
 t('จำนวนรายการในแต่ละแถบถูก (6F1=4 · 7F1=9 · 11F1=3 · 12F1=2 · อ่านไม่ได้=1)',
   JSON.stringify(draw.bands.map(b=>b.n))==='[4,9,3,2,1]',JSON.stringify(draw.bands.map(b=>b.n)));
 t('ไม่มีรายการไหนหล่นหาย (18 + 1 = 19 แถว)',draw.rows.length===19,draw.rows.length);
 t('คำอธิบายบนหัวตารางบอกวิธีเรียงใหม่ ไม่ใช่ข้อความ "เรียงตามใบสั่ง" เดิม',
   /อัตราแถม/.test(draw.note)&&/แบรนด์/.test(draw.note)&&!/ไล่คอลัมน์ซ้าย/.test(draw.note),'ok');

 /* ---------- 3) ลำดับในแถบ: แบรนด์ติดกัน ขนาดไล่ขึ้น ---------- */
 const order=await ev(a=>{
   const byCode={};a.REAL.forEach(([c,n])=>byCode[c]=n);
   const trs=[...document.querySelectorAll('#posBody table tbody tr')];
   const out=[];let band=-1;
   trs.forEach(tr=>{
     if(tr.classList.contains('grp-row')){band++;return;}
     const code=tr.children[0].innerText.trim();
     const n=byCode[code]||'';
     out.push({band:band,code:code,brand:psBrandKey(n),v:psVol(n).v,u:psVol(n).u});
   });
   return out;
 },{REAL});
 let split=[],desc=[];
 for(const bi of [...new Set(order.map(o=>o.band))]){
   const g=order.filter(o=>o.band===bi);
   const seen=new Set();let prev=null;
   g.forEach(o=>{
     if(prev&&o.brand!==prev.brand&&seen.has(o.brand))split.push(bi+':'+o.brand);
     if(prev&&o.brand===prev.brand&&o.u===prev.u&&o.v<prev.v)desc.push(bi+':'+o.brand+' '+prev.v+'→'+o.v);
     seen.add(o.brand);prev=o;
   });
 }
 t('ในแถบเดียวกัน แบรนด์เดียวกันอยู่ติดกันหมด ไม่กระจัดกระจาย',split.length===0,split.join(', '));
 t('ในแบรนด์เดียวกัน ขนาดไล่จากเล็กไปใหญ่',desc.length===0,desc.join(', '));
 t('สินค้าตระกูลเดียวกันยังติดกัน (บรีสน้ำ / บรีสน้ำซิก / บรีสน้ำอัลตร้า / บรีสเอกเซล)',
   (()=>{const g=order.filter(o=>o.band===1).map(o=>o.brand);
     const first=g.findIndex(x=>/^บรีส/.test(x)),last=g.map((x,i)=>/^บรีส/.test(x)?i:-1).filter(i=>i>=0).pop();
     return g.slice(first,last+1).every(x=>/^บรีส/.test(x));})(),
   order.filter(o=>o.band===1).map(o=>o.brand).join(' · '));

 /* ---------- 4) ตัวเลขสรุปบนหัวแถบ ---------- */
 const sum=await ev(a=>{
   const want={};
   a.REAL.forEach(([c,n,bb],i)=>{
     const o=[0,bb,bb+1,bb*2][i%4];const k=bb+'F1';
     const w=want[k]||(want[k]={ok:0,rem:0,none:0});
     if(!o)w.none++;else if(o%bb===0)w.ok++;else w.rem++;});
   const got={};
   [...document.querySelectorAll('#posBody tr.grp-row')].forEach(tr=>{
     const txt=tr.innerText.replace(/\s+/g,' ');
     const m=txt.match(/\((\d+F\d+)\)/);if(!m)return;
     const num=re=>{const x=txt.match(re);return x?+x[1]:0;};
     got[m[1]]={ok:num(/ลงตัว (\d+)/),rem:num(/เหลือเศษ (\d+)/),none:num(/ยังไม่สั่ง (\d+)/)};});
   return {want:want,got:got};
 },{REAL});
 const sumBad=Object.keys(sum.want).filter(k=>JSON.stringify(sum.want[k])!==JSON.stringify(sum.got[k]));
 t('ตัวเลขสรุปบนหัวแถบ (ลงตัว / เหลือเศษ / ยังไม่สั่ง) ตรงกับที่คำนวณจากจำนวนสั่งจริง',
   sumBad.length===0,sumBad.map(k=>k+': '+JSON.stringify(sum.got[k])+' ควรเป็น '+JSON.stringify(sum.want[k])).join(' | '));
 t('แถวที่เหลือเศษขึ้นคำเตือนพร้อมบอกว่าต้องเพิ่ม/ลดเท่าไร',
   draw.rows.filter(r=>/เหลือเศษ/.test(r.chk)).every(r=>/ลดเหลือ|เพิ่ม/.test(r.chk)),
   (draw.rows.find(r=>/เหลือเศษ/.test(r.chk))||{}).chk||'');
 t('แถวที่หารลงตัวบอกจำนวนของแถมที่ได้',
   draw.rows.filter(r=>/หารลงตัว/.test(r.chk)).every(r=>/ได้แถม \d+ ลัง/.test(r.chk)),
   (draw.rows.find(r=>/หารลงตัว/.test(r.chk))||{}).chk||'');
 t('อัตราแถมในแถวยังอยู่ (เผื่อไฟล์อ่านเพี้ยน) แต่ทำให้จางลงแล้ว',
   draw.rows.filter(r=>/ซื้อ \d+ แถม \d+/.test(r.rate)).length===18,
   draw.rows.filter(r=>/ซื้อ \d+ แถม \d+/.test(r.rate)).length);
 t('หมวดสินค้าไม่หายไป — ย้ายไปเป็นป้ายเล็กข้างชื่อสินค้า',
   draw.rows.filter(r=>/Home_Care/.test(r.name)).length===19,
   draw.rows.filter(r=>/Home_Care/.test(r.name)).length);

 /* ---------- 5) กลุ่มอื่นยังแบ่งตามหมวดเหมือนเดิม ---------- */
 const other=await ev(()=>{
   /* ใส่รายการของขาดสองตัว แล้วดูว่ากลุ่มนั้นยังขึ้นแถบเป็นหมวดสินค้า */
   const d=PS2.date,it=POSTATUS.data[d].items;
   it['64391615'].s=1;it['65456777'].s=1;
   psSetSec('s');
   const b=[...document.querySelectorAll('#posBody tr.grp-row')].map(x=>x.innerText.replace(/\s+/g,' ').trim());
   const note=document.getElementById('posBody').innerText.slice(0,300);
   delete it['64391615'].s;delete it['65456777'].s;
   psSetSec('p');
   return {bands:b,note:note};
 });
 t('กลุ่ม "ของขาดชั่วคราว" ยังแบ่งตามหมวดสินค้าเหมือนเดิม (เปลี่ยนแค่กลุ่มของแถม)',
   other.bands.length===1&&/Home_Care/.test(other.bands[0]),other.bands.join(' // '));
 t('...และยังใช้คำอธิบาย "เรียงตามลำดับในใบสั่งซื้อ" เดิม',
   /ใบสั่งซื้อ/.test(other.note)||/เรียงตามลำดับเดิม/.test(other.note),'ok');

 /* ---------- 6) หน้านี้อ่านอย่างเดียว ---------- */
 await ev(()=>{
   /* กดทุกปุ่มที่หน้านี้มี แล้วกลับมาที่กลุ่มของแถม */
   ['all','p','q','s','x','xd','k'].forEach(k=>psSetSec(k));
   psSetSec('p');renderPOS();
 });
 const after=await ev(new Function('return '+BLOBS));
 let moved='';
 if(after!==before){
   const a1=JSON.parse(before),b1=JSON.parse(after);
   moved=Object.keys(a1).filter(k=>JSON.stringify(a1[k])!==JSON.stringify(b1[k])).join(', ')||'(ไม่รู้ก้อนไหน)';
 }
 t('🛟 กดดูทุกกลุ่มแล้ว ข้อมูลทุกก้อนเหมือนเดิมเป๊ะทุกไบต์ (หน้านี้อ่านอย่างเดียว)',after===before,moved);
 t('🛟 ไม่มีการสั่งบันทึกขึ้นเซิร์ฟเวอร์เลย',await ev(()=>window.__posts.length===0),
   await ev(()=>window.__posts.join(', ')));
 const real=errs.filter(e=>!/localStorage/.test(e));
 t('ไม่มี JavaScript error ตลอดเทสต์',real.length===0,real.join(' | '));

 await b.close();
 let fail=0;
 A.forEach(([ok,n,x])=>{if(!ok)fail++;console.log((ok?'  ok  ':'  FAIL')+'  '+n+(x?'   ['+x+']':''));});
 console.log('\n'+A.length+' checks · '+(A.length-fail)+' passed · '+fail+' failed');
 console.log(fail?'SOME FAILED':'ALL PASS ('+A.length+' checks)');
 process.exit(fail?1:0);
})();
