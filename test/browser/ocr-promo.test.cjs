/* 🖼 อ่านผลโปรโมชั่นจาก "รูป" รีพอร์ท (เจ้าของแจ้ง 8 ต.ค. 69 — ไม่มีไฟล์ Excel ให้ก๊อป)
   ใช้สกรีนช็อต Power BI จริงที่เจ้าของส่งมา (CT Combo Drive by Route — 8 สาย × 8 ตัวเลข)
   ต้องเสิร์ฟผ่าน http เพราะตัวอ่าน (vendor/ocr/*) โหลดแบบไฟล์แยก */
const fs=require('fs');const path=require('path');const http=require('http');
/* ต้องติดตั้งก่อน (ไม่ได้อยู่ใน package.json เพราะใช้เฉพาะตอนเทสต์):
     npm i --no-save playwright-core
   แล้วรัน:  node build.cjs && node test/browser/ocr-promo.test.cjs   */
const {chromium}=require('playwright-core');
const BROWSER=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ROOT=path.resolve(__dirname,'..','..','public');
const IMG=path.join(__dirname,'fixtures','ct-combo-by-route.jpg');   /* CT Combo Drive by Route */
const IMG2=path.join(__dirname,'fixtures','ka-combo-by-route.jpg');  /* KA Combo Drive by Route */
const PORT=8744;
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json',
  '.wasm':'application/wasm','.traineddata':'application/octet-stream','.png':'image/png',
  '.jpg':'image/jpeg','.webp':'image/webp','.css':'text/css'};
const GT={ /* อ่านจากรูปด้วยตา: Target Actual Todo %  ×2 เซ็ต */
 '209611':[129,6,40,5,129,2,44,2],'209612':[89,6,26,7,89,3,29,3],
 '209613':[108,19,19,18,108,5,33,5],'209614':[142,26,24,18,142,9,41,6],
 '209615':[128,22,23,17,128,6,39,5],'209616':[132,13,34,10,132,8,39,6],
 '209617':[130,19,27,15,130,7,39,5],'209622':[148,19,33,13,148,5,47,3]};

const srv=http.createServer((rq,rs)=>{
  const u=decodeURIComponent(rq.url.split('?')[0]);
  const f=path.join(ROOT,u==='/'?'/index.html':u);
  if(!f.startsWith(ROOT)){rs.writeHead(403);return rs.end();}
  fs.readFile(f,(e,b)=>{ if(e){rs.writeHead(404);return rs.end('nf');}
    rs.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});rs.end(b);});
});

(async()=>{
 await new Promise(r=>srv.listen(PORT,r));
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const pg=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.goto('http://127.0.0.1:'+PORT+'/index.html',{waitUntil:'load'});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);

 await pg.evaluate(`
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};
  window.alert=m=>(window.__alerts=window.__alerts||[]).push(String(m));
  window.confirm=()=>true;
  window.syncToServer=()=>{window.__sync=(window.__sync||0)+1};
  window.ulog=()=>{};
  window.TOKEN=null;                       /* ไม่มีเซิร์ฟเวอร์: pmUpOne คืน dataURL แทน URL */
  S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
  DATA.lines={'209611':{display:'CT11'},'209612':{display:'CT12'},'209613':{display:'CT13'},
              '209614':{display:'CT14'},'209615':{display:'CT15'},'209616':{display:'CT16'},
              '209617':{display:'CT17'},'209622':{display:'CT22'},'2096_97':{display:'KA97'},
              '209699':{display:'KA99'}};
  DATA.focus_order=['209611','209612','209613','209614','209615','209616','209617','209622','2096_97','209699'];
  MASTER={items:{}};ANALYTICS={months:[],lines:{},data:{}};MINSTOCK={man:{}};
  PLAN={items:{},done:{},del:{}};ORDERS={dates:[],data:{},names:{},cat:{},catN:{}};
  POSTATUS={dates:[],data:{}};REQUESTS={data:{}};STOCKD={date:null,rows:[],names:{}};
  PROMO={items:{
    p1:{name:'CT Combo Drive',type:'combo',m:'2026-10',up:1,at:1,
        lines:[{k:'CT HCF1',label:'HCF1'},{k:'CT BWPC1',label:'BWPC1'}]},
    p2:{name:'Hit of the Month',type:'hit',m:'2026-10',up:2,at:2}
  },res:{},del:{}};
  PR.m='2026-10';
 `);

 const snapOther=()=>ev(()=>JSON.stringify({O:ORDERS,P:POSTATUS,S:STOCKD,R:REQUESTS,PL:PLAN}));
 const before=await snapOther();

 /* ---------- 1) เปิดกล่องวางผล แล้วสลับไปโหมดรูป ---------- */
 await ev(()=>{prPasteOpen('p1');prSetMode('img');});
 const ui0=await ev(()=>({
   hasDrop:!!document.getElementById('prDrop'),
   hasText:!!document.getElementById('prText'),
   btns:[...document.querySelectorAll('#prModal .seg button')].map(x=>x.innerText.trim()),
   on:(document.querySelector('#prModal .seg button.on')||{}).innerText}));
 t('มีปุ่มสลับ 2 โหมด (วางตาราง / อ่านจากรูป)',ui0.btns.length===2&&/อ่านจากรูป/.test(ui0.btns[1]),JSON.stringify(ui0.btns));
 t('โหมดรูป: โชว์กล่องลากรูป และซ่อนช่องวางข้อความ',ui0.hasDrop&&!ui0.hasText,JSON.stringify(ui0));
 t('ปุ่มที่เลือกอยู่คือ "อ่านจากรูป"',/อ่านจากรูป/.test(ui0.on||''),ui0.on);

 /* ---------- 2) เลือกไฟล์รูป ---------- */
 await pg.setInputFiles('#prImgFile',IMG);
 await pg.waitForFunction(()=>!!document.getElementById('prImgCv'),null,{timeout:15000});
 const got=await ev(()=>({w:(PR.paste._im||{}).width,h:(PR.paste._im||{}).height,
   file:!!PR.paste.file,crop:PR.paste.crop,txt:(document.getElementById('prCropTxt')||{}).innerText}));
 t('รับรูปเข้ามาได้ และรู้ขนาดจริง 785×325',got.w===785&&got.h===325,got.w+'x'+got.h);
 t('ยังไม่ได้ครอบ = ใช้ทั้งรูป',got.crop===null);
 t('บอกให้ครอบเฉพาะตารางเดียว',/ครอบ/.test(got.txt||''),got.txt);

 /* ---------- 3) อ่านตัวเลขจากรูป ---------- */
 const t0=Date.now();
 await ev(()=>prImgRead());
 await pg.waitForFunction(()=>PR.paste&&PR.paste.rows&&!PR.paste.busy,null,{timeout:180000});
 const secs=((Date.now()-t0)/1000).toFixed(1);
 const res=await ev(()=>{
   const P=PR.paste,by={};
   P.rows.forEach(r=>{if(r.route)by[r.route]=r.cells.map(c=>String(c).trim());});
   return {n:P.rows.length,ocr:P.ocr,cols:P.cols,by:by,err:P.err,
     conf:P.rows.filter(r=>r.route).map(r=>r.conf)};
 });
 t('ไม่มี error ตอนอ่าน',!res.err,res.err);
 t('ติดธงว่ามาจากรูป (เพื่อให้ตารางแก้ได้ + เตือนให้ตรวจ)',res.ocr===true);
 t('จับคู่สายวิ่งได้ครบ 8 สาย',Object.keys(res.by).length===8,Object.keys(res.by).join(','));
 /* เทียบ "ตามคอลัมน์" ไม่ใช่เก็บเลขที่อ่านได้มาเรียงต่อกัน — โครงตารางคือสิ่งที่ต้องถูก
    ถ้าช่องไหนอ่านเป็นขยะ (เช่น 44 → "de") ต้องไม่ทำให้ช่องอื่นเลื่อนตาม */
 const colFix=await ev(()=>{
   const P=PR.paste,r=P.rows.find(x=>x.route==='209613');       /* แถวที่สะอาดสุด ใช้หาตำแหน่งคอลัมน์ */
   const i=r.cells.findIndex(c=>String(c).trim()==='108');
   return i;
 });
 t('หาคอลัมน์แรกของชุดตัวเลขเจอ',colFix>=0,colFix);
 let wrong=[],low=[];
 const cells=await ev(()=>{const o={};PR.paste.rows.forEach(r=>{if(r.route)o[r.route]={c:r.cells,f:r.conf};});return o;});
 const badSet=await ev(()=>{const P=PR.paste,o={};
   P.rows.forEach(r=>{if(!r.route)return;r.cells.forEach((c,i)=>{if(prCellBad(P,r,i))o[r.route+'#'+i]=1;});});return o;});
 for(const code in GT){
   const row=cells[code];if(!row){wrong.push(code+':ไม่เจอแถว');continue;}
   GT[code].forEach((v,i)=>{
     const raw=String(row.c[colFix+i]===undefined?'':row.c[colFix+i]).replace(/[,%\s]/g,'');
     if(Number(raw)!==v){wrong.push(code+'#'+i+' '+v+'→'+(raw||'-'));
       if(badSet[code+'#'+(colFix+i)])low.push(code+'#'+i);}
   });
 }
 t('โครงตารางถูกทุกคอลัมน์ — ตัวเลข 64 ช่องเข้าคอลัมน์ตรงกันหมด ('+secs+' วินาที) ผิดไม่เกิน 4 ช่อง',
   wrong.length<=4,wrong.join(' · '));
 t('⚠️ ช่องที่อ่านผิด ต้องถูกไฮไลต์เตือนทุกช่อง (ไม่งั้นเจ้าของจะมองข้าม)',
   low.length===wrong.length,'ผิด '+wrong.length+' ช่อง · เตือน '+low.length+' ช่อง · '+wrong.join(' · '));
 const okTgt=['209611','209612','209613','209614','209615','209616','209617','209622']
   .every(c=>cells[c]&&String(cells[c].c[colFix]).replace(/[,\s]/g,'')===String(GT[c][0]));
 t('คอลัมน์ "เป้า" อ่านถูกครบทั้ง 8 สาย',okTgt);
 const guess=await ev(()=>{const P=PR.paste;const r=P.rows.find(x=>x.route==='209613');
   const i=r.cells.findIndex(c=>String(c).trim()==='108');
   return {desc:P.cols[i-1],tgt:P.cols[i],act:P.cols[i+1],todo:P.cols[i+2],pct:P.cols[i+3],tgt2:P.cols[i+4]};});
 t('เดาคอลัมน์เองถูก: เป้า / ทำได้ / % ทำได้ (และข้ามคอลัมน์ To do)',
   guess.tgt==='tgt'&&guess.act==='act'&&guess.todo==='skip'&&guess.pct==='pct'&&guess.tgt2==='tgt',JSON.stringify(guess));
 t('คอลัมน์ชื่อโปรฯ (Sales_Desc) ต้องไม่ถูกเดาเป็นยอดขาย',guess.desc==='skip',guess.desc);

 /* ---------- 4) ตารางพรีวิวต้องแก้ได้ทุกช่อง + โชว์ทุกแถว ---------- */
 const prev=await ev(()=>{
   const el=document.getElementById('prModal');
   return {inputs:el.querySelectorAll('.pr-in').length,
     rows:el.querySelectorAll('.pm-prev tbody tr').length,
     warn:/ตรวจตัวเลขให้ครบก่อนบันทึก/.test(el.innerText),
     all:PR.paste.rows.length};
 });
 t('ทุกช่องในตารางพรีวิวแก้ได้ (เป็น input)',prev.inputs>0&&prev.inputs>=prev.rows,JSON.stringify(prev));
 t('มาจากรูป → โชว์ทุกแถว ไม่ตัดแค่ 14',prev.rows===prev.all,prev.rows+'/'+prev.all);
 t('เตือนให้ตรวจก่อนบันทึก',prev.warn);

 /* ---------- 5) แก้ตัวเลขเองแล้วค่าที่บันทึกต้องเป็นค่าที่แก้ ---------- */
 const edited=await ev(()=>{
   const P=PR.paste;
   /* ตั้งคอลัมน์: หา index ของค่า 129 (เป้า) กับ 6 (ทำได้) ในแถว 209611 */
   const r=P.rows.find(x=>x.route==='209611');
   const iT=r.cells.findIndex(c=>String(c).trim()==='129');
   const iA=iT+1;
   P.cols=P.cols.map(()=> 'skip');P.cols[iT]='tgt';P.cols[iA]='act';
   prSetCell(P.rows.indexOf(r),iA,'99');       /* แก้มือ */
   return {iT:iT,iA:iA,cell:r.cells[iA],conf:r.conf[iA]};
 });
 t('แก้ช่องแล้วค่าในหน่วยความจำเปลี่ยนตาม',edited.cell==='99',JSON.stringify(edited));
 t('ช่องที่แก้เองเลิกไฮไลต์ส้ม',edited.conf===100,edited.conf);

 await ev(()=>prApply());
 await pg.waitForFunction(()=>!PR.paste,null,{timeout:60000});
 const saved=await ev(()=>({
   keys:Object.keys(PROMO.res).length,
   r11:PROMO.res['p1|209611|CT HCF1'],
   r22:PROMO.res['p1|209622|CT HCF1'],
   reps:(PROMO.items.p1.reps||[]).length,
   repLine:((PROMO.items.p1.reps||[])[0]||{}).line,
   repU:String(((PROMO.items.p1.reps||[])[0]||{}).u||'').slice(0,11),
   other:PROMO.res['p2|209611|'],
   alerts:window.__alerts||[]}));
 t('บันทึกผลครบ 8 สาย',saved.keys===8,saved.keys);
 t('ค่าที่แก้มือถูกบันทึก (ไม่ใช่ค่าที่ OCR อ่านมา)',saved.r11&&saved.r11.tgt===129&&saved.r11.act===99,JSON.stringify(saved.r11));
 t('สายอื่นยังเป็นค่าจากรูปตามเดิม',saved.r22&&saved.r22.tgt===148&&saved.r22.act===19,JSON.stringify(saved.r22));
 t('เก็บรูปต้นฉบับไว้กับโปรโมชั่น 1 รูป',saved.reps===1,saved.reps);
 t('รูปผูกกับ "เซ็ต" ที่เลือกไว้',saved.repLine==='CT HCF1',saved.repLine);
 t('เก็บแค่ลิงก์รูป ไม่ยัดรูปดิบลง state (โหมดมีเซิร์ฟเวอร์จะเป็น URL)',
   /^data:image/.test(saved.repU)||/^http/.test(saved.repU),saved.repU);
 t('โปรโมชั่นตัวอื่นไม่ถูกแตะ',saved.other===undefined);

 /* ---------- 6) ครอบเฉพาะส่วน แล้วอ่านได้เฉพาะส่วนนั้น ---------- */
 await ev(()=>{prPasteOpen('p1');prSetMode('img');});
 await pg.setInputFiles('#prImgFile',IMG);
 await pg.waitForFunction(()=>!!document.getElementById('prImgCv'),null,{timeout:15000});
 await ev(()=>{PR.paste.crop={x:0,y:150,w:785,h:70};prImgDraw();});
 const croptxt=await ev(()=>(document.getElementById('prCropTxt')||{}).innerText);
 t('ครอบแล้วบอกขนาดกรอบ',/785×70/.test(croptxt||''),croptxt);
 await ev(()=>prImgRead());
 await pg.waitForFunction(()=>PR.paste&&PR.paste.rows&&!PR.paste.busy,null,{timeout:180000});
 const cr=await ev(()=>PR.paste.rows.filter(r=>r.route).map(r=>r.route));
 t('อ่านเฉพาะในกรอบ — ได้เฉพาะสายที่อยู่ในกรอบ ไม่ใช่ทั้ง 8 สาย',
   cr.length>0&&cr.length<8&&cr.every(c=>GT[c]),cr.join(','));

 /* ---------- 7) ใช้ได้กับอีกรีพอร์ทหนึ่ง (KA) ---------- */
 await ev(()=>{prPasteOpen('p1');prSetMode('img');});
 await pg.setInputFiles('#prImgFile',IMG2);
 await pg.waitForFunction(()=>!!document.getElementById('prImgCv'),null,{timeout:15000});
 await ev(()=>prImgRead());
 await pg.waitForFunction(()=>PR.paste&&PR.paste.rows&&!PR.paste.busy,null,{timeout:180000});
 const ka=await ev(()=>{const o={};PR.paste.rows.forEach(r=>{if(r.route)
   o[r.route]=r.cells.map(c=>String(c).replace(/[,%\s]/g,'')).filter(s=>/^-?\d+$/.test(s)).map(Number).slice(-8);});return o;});
 t('รีพอร์ท KA: สาย 2096_97 อ่านถูกทั้ง 8 ตัว',
   JSON.stringify(ka['2096_97'])==='[20,6,1,30,20,1,6,5]',JSON.stringify(ka['2096_97']));
 t('รีพอร์ท KA: สาย 209699 อ่านถูกทั้ง 8 ตัว',
   JSON.stringify(ka['209699'])==='[14,4,1,29,14,3,2,21]',JSON.stringify(ka['209699']));

 /* ---------- 8) โหมดวางตารางเดิมต้องไม่พัง ---------- */
 await ev(()=>{prPasteOpen('p2');prSetMode('text');
   document.getElementById('prText').value='RouteCode\tTarget\tActual\n209611\t24\t1\n209612\t25\t0';
   prRead();});
 const txt=await ev(()=>({n:PR.paste.rows.filter(r=>r.route).length,ocr:PR.paste.ocr,
   shown:document.querySelectorAll('#prModal .pm-prev tbody tr').length,
   warn:/ตรวจตัวเลขให้ครบก่อนบันทึก/.test(document.getElementById('prModal').innerText)}));
 t('วางตารางแบบเดิมยังอ่านได้',txt.n===2,JSON.stringify(txt));
 t('โหมดวางตาราง ไม่ขึ้นคำเตือนของ OCR',txt.ocr===false&&!txt.warn,JSON.stringify(txt));
 await ev(()=>prPasteClose());

 /* ---------- 9) ไม่แตะข้อมูลก้อนอื่น ---------- */
 const after=await snapOther();
 t('⚠️ ORDERS / POSTATUS / STOCKD / REQUESTS / PLAN ไม่เปลี่ยนแม้ไบต์เดียว',before===after);
 const clean=await ev(()=>({del:Object.keys(PROMO.del).length,items:Object.keys(PROMO.items).length,
   p2:JSON.stringify(PROMO.items.p2)}));
 t('ไม่มีการลบโปรหรือเพิ่มโปรโดยไม่ตั้งใจ',clean.del===0&&clean.items===2,JSON.stringify(clean));
 t('โปรที่ไม่เกี่ยวไม่ถูกแก้',/"name":"Hit of the Month"/.test(clean.p2)&&!/reps/.test(clean.p2),clean.p2);

 let bad=0;A.forEach(([c,n,x])=>{if(!c)bad++;console.log((c?'  ✓ ':'  ✗ FAIL: ')+n+(x&&!c?' → '+x:''));});
 const real=errs.filter(e=>!/localStorage/.test(e));
 if(real.length){console.log('PAGE ERRORS:');real.forEach(e=>console.log('   '+e));bad+=real.length;}
 await b.close();srv.close();
 console.log('\n'+(bad?bad+' FAILED of '+A.length:'ALL PASS ('+A.length+' checks)'));
 process.exit(bad?1:0);
})();
