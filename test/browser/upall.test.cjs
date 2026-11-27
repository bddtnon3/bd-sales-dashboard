/* 📦 ปุ่ม "อัพรวมทีเดียว" — แยกประเภทไฟล์เองให้ถูก และที่แยกไม่ออกต้องบอก ไม่ใช่เดา
 *
 * เจ้าของสั่ง 29 พ.ย. 69: *"ช่วงนี้เอกสาร excel ผมต้องอัพเยอะมาก ช่วยทำปุ่ม master upload
 * ให้ผมอัพทุกไฟล์เข้าไปทีเดียว แล้วระบบไปจับอ่านแยกให้อัตโนมัติ ไฟล์ไหนอ่านไม่สำเร็จ
 * ให้แจ้งเตือนผลลัพธ์ด้วยเหมือนเดิม"*
 *
 * 🔑 สิ่งที่เทสต์นี้กันไว้คือกฎใหญ่ที่สุดของโปรเจกต์: **แยกไม่ออก ห้ามเดา**
 *    ตัวอ่านผิดตัวเขียนทับข้อมูลดีได้ ไฟล์ที่ชี้ไม่ชัดจึงต้องถูกรายงาน ไม่ใช่โยนเข้าตัวที่ใกล้สุด
 * ⛔ ไฟล์ตัวอย่างในไฟล์นี้สร้างขึ้นเองทั้งหมด (รหัสสมมติ) — รีโปเป็นสาธารณะ
 * ต้องติดตั้งก่อน: npm i --no-save playwright-core
 */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const XLSX=require('xlsx');
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');
const BROWSER=require('./_chrome.cjs').chromePath();
const ORIGIN='https://bd-upall.test/';

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:1280,height:900},timezoneId:'Asia/Bangkok'});
 const pg=await ctx.newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 const html=fs.readFileSync(PAGE,'utf8');
 await pg.route(ORIGIN+'**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}));
 await pg.goto(ORIGIN,{waitUntil:'domcontentloaded'});
 /* หน้าเว็บโหลด XLSX จาก CDN ซึ่งในเทสต์ไปไม่ถึง — ใส่ตัวเดียวกันจาก node_modules ให้แทน */
 await pg.addScriptTag({path:require.resolve('xlsx/dist/xlsx.full.min.js')});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);

 await ev(()=>{
   document.getElementById('login').classList.add('hidden');
   document.getElementById('app').classList.remove('hidden');
   window.Chart=function(){return{destroy(){}}};
   window.__log=[];window.ulog=m=>{window.__log.push(String(m));};
   window.__b2a=b64=>Uint8Array.from(atob(b64),c=>c.charCodeAt(0)).buffer;
   window.__sniff=(name,b64)=>{const buf=window.__b2a(b64);
     return upSniff(name,buf,buf.byteLength);};
   window.__mkFile=(name,b64)=>new File([window.__b2a(b64)],name);
 });

 /* สร้างไฟล์ .xlsx ฝั่ง node — ใส่แค่หัวตาราง พอให้ตัวแยกประเภททำงาน */
 function mkb64(sheets){
   const wb=XLSX.utils.book_new();
   sheets.forEach(s=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(s.rows),s.name));
   return Buffer.from(XLSX.write(wb,{bookType:'xlsx',type:'array'})).toString('base64');
 }

 /* ---------- 1) ไฟล์แต่ละแบบต้องแยกออกจาก "หัวตารางในไฟล์" ไม่ใช่ชื่อไฟล์ ----------
    ชื่อไฟล์ในชุดนี้จงใจตั้งเป็น x1.xlsx, x2.xlsx … เพื่อพิสูจน์ว่าไม่ได้พึ่งชื่อไฟล์ */
 const cases=[
  ['psi (ไฟล์ละเอียด)','psi',[{name:'Export',rows:[[
     'Invoice Number','Invoice Date','Received Date','Product Code','Product Description',
     'Invoice Qty (CS)','Invoice Qty (Pcs)','Received Qty (CS)','Received Qty (Pcs)',
     'Variance','Value (NIV)','Stock Type','Document Number']]}]],
  ['psi (ไฟล์เดิม)','psi',[{name:'Export',rows:[[
     'Invoice Number','Invoice Creation Date','Invoice Receiving Date','Product Code',
     'UOM','Invoice Qty (CS)','Received Qty (CS)','Variance','Value (NIV)','DO Number']]}]],
  ['ใบจัดของ','alloc',[{name:'Export',rows:[[
     'Order Creation Date','PJP Code','PJP Name','GIN No.','Product Code','Order Number',
     'Sale Order (CS)']]}]],
  ['รายการสั่งซื้อ','txn',[{name:'DataExtract',rows:[[
     'เลขที่เอกสาร','รหัสร้านค้า','หมายเลข PJP','วันที่เอกสาร','เวลาสั่งซื้อ']]}]],
  ['ร้านค้า + PJP (dcode)','pjpout',[{name:'Sheet1',rows:[[
     'Section Code','Section Name','Outlet Code','Outlet Name']]}]],
  ['Master (dcode)','master',[{name:'Sheet1',rows:[[
     'Item Code','Item Description','Pack Size','Status']]}]],
  ['Master (แบบเดิม)','master',[{name:'Sheet1',rows:[['Item_Code','TH_Description','EN_Description']]}]],
  ['สต็อก (dcode)','stockd',[{name:'Sheet1',rows:[[
     'รหัสสินค้า','คำอธิบาย','ประเภทสต็อก','คงเหลือปัจจุบัน']]}]],
  ['ใบ Drop','drop',[{name:'Sheet1',rows:[['Material','Material Description','Delivery']]}]],
  ['eB2B & Self Ordering','kpi',[{name:'ByRoute',rows:[['Route','Orders']]}]],
  ['Perfect Store','ps',[{name:'Sheet1',rows:[['Route','PS Type','GSV']]}]],
  ['DCI Score','dci',[{name:'Sheet1',rows:[['','','','','BM1','BM2','Q1']]}]],
  ['ไฟล์ BUM','pricebum',[{name:'Cust Finance Print DTCON',rows:[['x']]},
     {name:'Non Cust Finance',rows:[['y']]}]],
  ['ร้านที่ตัดบิลเข้า (Ex.export)','cstockex',[{name:'Data',rows:[[
     'ผู้สั่งซื้อ (ID)','ผู้สั่งซื้อ','วันที่วางบิล','มูลค่าสุทธิ']]}]],
  ['ยอดขายรายวัน (dcode)','daily',[{name:'Export',rows:[[
     'รหัสสาย (PJP Code)','ชื่อ (Salesman Name)','วันที่ (Invoice Date)',
     'รหัสร้าน (Outlet Code)','ยอดเงิน (NIV)']]}]]
 ];
 for(let i=0;i<cases.length;i++){
   const c=cases[i];
   const r=await ev(a=>window.__sniff(a.n,a.s),{n:'x'+i+'.xlsx',s:mkb64(c[2])});
   t('🔎 แยกออกจากหัวตารางในไฟล์: '+c[0],r.k===c[1]&&r.how==='หัวตารางในไฟล์',
     JSON.stringify(r));
 }

 /* ไฟล์ราคาหัวเสือ — ลายเซ็นคือ "WS LP" ที่แถวสอง คอลัมน์ O */
 const hsRows=(()=>{const r0=[],r1=[];
   for(let i=0;i<20;i++){r0.push(i===14?'Nov26':'');r1.push(i===14?'WS LP':'');}
   return [r0,r1,['x']];})();
 const hs=await ev(a=>window.__sniff('x-hs.xlsx',a),mkb64([{name:'HS Nov',rows:hsRows}]));
 t('🔎 แยกออกจากหัวตารางในไฟล์: ไฟล์ราคาหัวเสือ',hs.k==='pricehs',JSON.stringify(hs));

 /* ---------- 2) ใบสั่งของ vs ใบเปล่า — ฟอร์มเดียวกัน ตัดสินจากชื่อไฟล์เท่านั้น ---------- */
 const form=[{name:'Home_Care',rows:[
   ['วันที่สั่งสินค้า','01/09/2026'],
   ['ชื่อ','ขนาด','รหัส','a','b','c','d','e','f','g','h','ชื่อ','ขนาด','รหัส']]}];
 const formB=mkb64(form);
 const fOrd=await ev(a=>window.__sniff('BD_291126.xlsx',a),formB);
 const fBlank=await ev(a=>window.__sniff('DT_Confirm_Form_HPC_291126.xlsm',a),formB);
 const fNone=await ev(a=>window.__sniff('ไฟล์อะไรไม่รู้.xlsx',a),formB);
 t('🔑 ชื่อ BD_ddmmyy = ใบสั่งของ',fOrd.k==='order',JSON.stringify(fOrd));
 t('🔑 ชื่อมีคำว่า Confirm = ใบเปล่า (ดูโปรฯ ก่อนสั่ง)',fBlank.k==='blank',JSON.stringify(fBlank));
 t('🛟 ไม่มีทั้งสองอย่าง = ไม่เดา ต้องบอกว่าแยกไม่ออก (เดาผิดทางจะกลืนจำนวนที่สั่งหายไป)',
   fNone.k===null&&/ใบสั่งของ/.test(fNone.why),JSON.stringify(fNone));

 /* ---------- 3) ไฟล์ที่ไม่รู้จัก ต้องถูกรายงาน ไม่ใช่โยนเข้าตัวอ่านที่ใกล้สุด ---------- */
 const unk=await ev(a=>window.__sniff('อะไรสักอย่าง.xlsx',a),
   mkb64([{name:'Sheet1',rows:[['A','B','C'],[1,2,3]]}]));
 t('🛟 ไฟล์ที่ไม่รู้จัก → k=null พร้อมเหตุผล ไม่ได้เดาเป็นชนิดใดชนิดหนึ่ง',
   unk.k===null&&!!unk.why,JSON.stringify(unk));

 /* ---------- 4) ไฟล์ HTML ที่ Excel ส่งออก = ไฟล์วิเคราะห์เชิงลึก ---------- */
 const ana=await ev(()=>{const s='<html><body><table><tr><td>NIV</td></tr></table></body></html>';
   const u=new Uint8Array(s.length);for(let i=0;i<s.length;i++)u[i]=s.charCodeAt(i);
   return upSniff('Sales 1-2 2026.xls',u.buffer,u.length);});
 t('🔎 ไฟล์ที่ไม่ใช่ zip/ole (HTML ที่ Excel ส่งออก) = ไฟล์วิเคราะห์เชิงลึก',
   ana.k==='ana'&&ana.how==='รูปแบบไฟล์',JSON.stringify(ana));

 /* ---------- 5) ไฟล์ใหญ่มาก อ่านจากชื่อไฟล์อย่างเดียว (ไม่อ่านซ้ำเพื่อแยกประเภท) ---------- */
 const big=await ev(()=>({bum:upSniff('BUM_DT_Dec26.xlsx',null,30e6),
   none:upSniff('ไฟล์ใหญ่ไม่รู้ชื่อ.xlsx',null,30e6),cap:UP_BIG}));
 t('⚡ ไฟล์ใหญ่กว่า UP_BIG ใช้ชื่อไฟล์ตัดสิน (BUM ~28MB / ไฟล์วิเคราะห์ ~60MB อ่านซ้ำแพงเกินไป)',
   big.bum.k==='pricebum'&&big.bum.how==='ชื่อไฟล์'&&big.cap>=12e6,JSON.stringify(big.bum));
 t('🛟 ไฟล์ใหญ่ที่ชื่อก็ไม่บอกอะไร ต้องรายงาน ไม่ใช่เดา',
   big.none.k===null&&!!big.none.why,JSON.stringify(big.none));

 /* ---------- 6) ชื่อไฟล์จริงที่ศูนย์ส่งมา แยกออกทุกไฟล์ ----------
    (เนื้อในไฟล์เป็นตัวตัดสินหลัก ชุดนี้เช็กว่าตัวช่วย "ชื่อไฟล์" ก็ไม่ได้ชี้ผิดทาง) */
 const names=[['PSI_Detail_Report_3.xlsx','psi'],['PSI Detail Report (4).xlsx','psi'],
   ['PSI_26112026.xlsx','psi'],['Order_Allocation_ReportHistorical_2.xlsx','alloc'],
   ['Order_Allocation_ReportReal_Time_1.xlsx','alloc'],
   ['Transaction_Inquiry_28112026.xlsx','txn'],['Outlet_Master__PJP_Report.xlsx','pjpout'],
   ['Product_Master_27112026.xlsx','master'],['BUM_DT_Dec26.xlsx','pricebum'],
   ['perfect_store_AVD_BM7_BD_30.07.xlsx','ps'],['Drop 25112026.xlsx','drop'],
   ['BD_251126.xlsx','order'],['DataExtract_161126.xlsx','stockd'],
   ['Ex.export.xlsx','cstockex']];
 const nm=await ev(a=>a.map(x=>upByName(x[0])),names);
 names.forEach((x,i)=>t('📛 ชื่อไฟล์จริง "'+x[0]+'" → '+x[1],nm[i]===x[1],nm[i]));

 /* ---------- 7) ตารางชนิดไฟล์เป็นตารางเดียว ใช้ร่วมกันสองทางเข้า ---------- */
 const tpl=fs.readFileSync(path.join(ROOT,'dashboard_template.html'),'utf8');
 t('🛟 มี UP_KIND ตารางเดียว (ช่องอัพรายหมวดกับปุ่มอัพรวมจึงอ่านไฟล์เดียวกันไม่ต่างกันไม่ได้)',
   (tpl.match(/const UP_KIND=/g)||[]).length===1,'');
 t('🛟 handleTyped ไม่ได้ไล่ if/else เองแล้ว แต่เรียก upRun ตัวเดียวกับปุ่มอัพรวม',
   /function handleTyped[\s\S]{0,400}upRun\(kind/.test(tpl),'');
 const cover=await ev(()=>{
   const ks={};UP_SNIFF.forEach(x=>{if(x[0]!=='ordform')ks[x[0]]=1;});
   UP_FN.forEach(x=>{ks[x[1]]=1;});
   ks.order=1;ks.blank=1;ks.ana=1;
   const miss=Object.keys(ks).filter(k=>!UP_KIND[k]);
   return {miss:miss,off:['eb','cstock','store'].filter(k=>UP_KIND[k]&&UP_KIND[k].off).join(',')};});
 t('🛟 ทุกชนิดที่ตัวแยกประเภทคืนได้ มีตัวอ่านใน UP_KIND ครบ',cover.miss.length===0,cover.miss.join(','));
 t('🛟 ช่องที่เลิกใช้แล้ว (eB2B · ฟอร์ม Excel สต็อคกลาง · ยอดรายร้าน) ติดธง off ปุ่มอัพรวมจะไม่ส่งไปหา',
   cover.off==='eb,cstock,store',cover.off);

 /* ---------- 8) ปุ่มอยู่ในกล่องอัพโหลดจริง และโชว์ทุกหมวด ---------- */
 const ui=await ev(()=>{
   openUpload();
   const row=document.querySelector('#modal .up-row.up-all');
   const inp=document.getElementById('fileAll');
   const vis=[];
   [''].concat(upGroups()).forEach(g=>{upSetCat(g);
     vis.push(row&&row.style.display!=='none');});
   const cats=document.getElementById('upCats').textContent;
   closeUpload();
   return {row:!!row,inp:!!inp,multi:!!(inp&&inp.multiple),
     everyCat:vis.every(Boolean),nCat:vis.length,chip:/อัพรวม/.test(cats)};});
 t('📦 มีช่อง "อัพรวมทีเดียว" ในกล่องอัพโหลด และเลือกได้หลายไฟล์',
   ui.row&&ui.inp&&ui.multi,JSON.stringify(ui));
 t('📦 โชว์ทุกหมวด ไม่ว่ากดหมวดไหนอยู่ ('+ui.nCat+' หมวด)',ui.everyCat,ui.everyCat);
 t('🛟 ไม่ได้ไปเพิ่มหมวดใหม่ในแถบหมวด (เป็นทางเข้าเพิ่ม ไม่ใช่หมวดของตัวเอง)',!ui.chip,'');

 /* ---------- 9) อ่านจริงทั้งชุด: เรียงลำดับถูก · สำเร็จ/ไม่สำเร็จ/แยกไม่ออก รายงานครบ ---------- */
 const runFx={
   /* ไฟล์ PSI จริง ๆ หนึ่งไฟล์ (อ่านสำเร็จ) */
   psi:mkb64([{name:'Export',rows:[
     ['Invoice Number','Invoice Date','Received Date','Product Code','Product Description',
      'Invoice Qty (CS)','Invoice Qty (Pcs)','Received Qty (CS)','Received Qty (Pcs)',
      'Variance','Value (NIV)','Stock Type','Document Number'],
     ['3100000001','25/11/2026','26/11/2026','90000001','สินค้าทดสอบ A',10,0,10,0,0,1000,'Sound','D1']]}]),
   /* ไฟล์ Master ที่หัวตารางถูกแต่ไม่มีข้อมูล → ตัวอ่าน throw (อ่านไม่สำเร็จ) */
   bad:mkb64([{name:'Sheet1',rows:[['Item_Code','TH_Description']]}]),
   /* ไฟล์ที่แยกประเภทไม่ได้ */
   unknown:mkb64([{name:'Sheet1',rows:[['A','B'],[1,2]]}])};
 const run=await ev(async(a)=>{
   window.__log=[];
   PSI={rows:{},days:{},up:0};
   await upAllRun([window.__mkFile('อะไรสักอย่าง.xlsx',a.unknown),
     window.__mkFile('Product_Master_bad.xlsx',a.bad),
     window.__mkFile('PSI_Detail_mix.xlsx',a.psi)]);
   return {log:window.__log.join('\n'),
     rows:Object.keys(PSI.rows||{}).length};},runFx);
 t('📦 อ่านไฟล์ที่แยกได้สำเร็จจริง (PSI เข้าระบบแล้ว)',run.rows===1,run.rows+' แถว');
 t('📦 รายงานว่าไฟล์ไหนถูกอ่านเป็นอะไร',
   /PSI_Detail_mix\.xlsx/.test(run.log)&&/คลังรับของเข้า/.test(run.log),run.log.slice(0,200));
 t('🛟 ไฟล์ที่อ่านไม่สำเร็จ ต้องขึ้นชื่อไฟล์ + เหตุผล',
   /❌/.test(run.log)&&/Product_Master_bad\.xlsx/.test(run.log),
   (run.log.split('\n').filter(x=>/❌/.test(x))[0]||'').slice(0,160));
 t('🛟 ไฟล์ที่แยกประเภทไม่ได้ ต้องขึ้นชื่อไฟล์ + บอกให้ใช้ช่องของมันเอง ไม่ใช่เงียบ',
   /❓/.test(run.log)&&/อะไรสักอย่าง\.xlsx/.test(run.log)&&/ช่องของไฟล์นั้น/.test(run.log),
   (run.log.split('\n').filter(x=>/❓/.test(x))[0]||'').slice(0,200));
 t('📦 สรุปท้ายบอกจำนวนสำเร็จ / ไม่สำเร็จ / แยกไม่ได้',
   /สรุป/.test(run.log)&&/อ่านสำเร็จ/.test(run.log),
   (run.log.split('\n').filter(x=>/สรุป/.test(x))[0]||'').slice(0,200));
 /* ⚠️ ลำดับ: ข้อมูลอ้างอิง (Master) ต้องมาก่อน PSI เสมอ ไม่ว่าจะเลือกไฟล์มาเรียงยังไง */
 const iM=run.log.indexOf('Product_Master_bad'),iP=run.log.indexOf('PSI_Detail_mix');
 t('📦 อ่านตามลำดับที่ควรเป็น: Master มาก่อน PSI (ถึงจะเลือกไฟล์มาสลับกัน)',
   iM>=0&&iP>=0&&iM<iP,iM+' < '+iP);

 t('ไม่มี error ในหน้าเว็บตลอดการเทส',errs.length===0,errs.join(' | '));

 await b.close();
 let bad=0;A.forEach(([okk,n,x])=>{if(!okk)bad++;console.log((okk?'  ✓ ':'  ✗ FAIL: ')+n+(x?' → '+x:''));});
 console.log(bad?('\n'+bad+' FAILED of '+A.length):('\nALL PASS ('+A.length+' checks)'));
 process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
