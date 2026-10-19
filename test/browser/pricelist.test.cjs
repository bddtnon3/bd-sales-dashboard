/* 🧾 หน้าแคตาลอคราคาสาธารณะ (public/pricelist.html) — หน้าที่ลูกค้าร้านค้าเปิดดูเอง
 *
 * หน้านี้ต่างจากในแอป: เป็นไฟล์เดี่ยว ไม่มีล็อกอิน และคนอ่านคือเจ้าของร้านที่ไม่ได้ทำงานกับระบบ
 * สิ่งที่ต้องพิสูจน์:
 *   1) คอลัมน์ราคาตรงกันทุกแถว (เจ้าของขีดเส้นแดงมาให้ดูว่าเดิมมันไม่ตรง)
 *   2) ชื่อหมวดเป็นภาษาไทย ไม่มีตัวย่อในบ้านของ Unilever หลุดออกไป
 *   3) ตัวกรองแบรนด์ติ๊กได้หลายอัน และติ๊กแล้วแบรนด์อื่นต้องไม่หายไปจากรายการ
 *   4) กดหัวคอลัมน์แล้วเรียงเหมือน Excel · แถวที่ไม่มีค่าไปอยู่ท้ายเสมอ
 *   5) บนมือถือใช้ได้ครบ (หัวตารางถูกซ่อน จึงต้องมีช่องเลือกการเรียงแทน)
 *   6) 🔒 หน้านี้ยิง endpoint เดียวคือ /api/pricelist ตลอดอายุการใช้งาน
 *
 * ⚠️ ใช้ไฟล์ราคาจริงเป็น fixture ซึ่ง **ไม่ได้อยู่ใน repo** (ดูหมายเหตุใน price.test.cjs)
 *    ไม่มีไฟล์ = ข้ามให้เอง ไม่ฟ้องว่าพัง
 *
 * ต้องติดตั้งก่อน:  npm i --no-save playwright-core xlsx
 * แล้วรัน:  node test/browser/pricelist.test.cjs
 */
const fs=require('fs');const path=require('path');const http=require('http');
const {chromium}=require('playwright-core');
const XLSX=require('xlsx');
const BROWSER=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','pricelist.html');
const F_HS=path.join(__dirname,'fixtures','huasuer-price.xlsx');
const PORT=8751;

if(!fs.existsSync(F_HS)){
  console.log('SKIP — ไม่มีไฟล์ fixture: huasuer-price.xlsx');
  console.log('ไฟล์ราคาตัวจริงไม่ได้เก็บใน repo โดยตั้งใจ (ดูหมายเหตุใน price.test.cjs)');
  console.log('SKIPPED (0 checks)');
  process.exit(0);
}

/* ---------- สร้าง payload แบบเดียวกับที่ api/pricelist.js จะส่งออกไป ---------- */
function payload(){
  const col=c=>XLSX.utils.decode_col(c);
  const wb=XLSX.readFile(F_HS);
  const SH=wb.SheetNames.filter(s=>/^\s*HS\b/i.test(s))[0];
  const A=XLSX.utils.sheet_to_json(wb.Sheets[SH],{header:1,defval:null,raw:true});
  const hdr=A[0]||[],blocks=[];
  ['O','Y','AI','AS'].forEach(c=>{const o=col(c);blocks.push({lab:String(hdr[o]||'').trim(),o});});
  const N=v=>{const n=typeof v==='number'?v:parseFloat(String(v==null?'':v).replace(/,/g,''));return isFinite(n)?n:0;};
  const T=v=>String(v==null?'':v).replace(/\s+/g,' ').trim();
  const R2=v=>Math.round(v*100)/100;
  const items={};
  for(let r=2;r<A.length;r++){
    const x=A[r];if(!x)continue;
    const code=T(x[col('E')]);
    if(!/^\d{6,12}$/.test(code))continue;
    const it={n:T(x[col('C')]),v:T(x[col('D')]),b:T(x[col('B')]),c:T(x[col('A')]),s:T(x[col('F')]),
      p:N(x[col('J')])||1,ip:N(x[col('K')])||0,nt:T(x[col('N')]),o:'',m:[]};
    blocks.forEach(bk=>{const o=bk.o;it.m.push([N(x[o]),N(x[o+1]),R2(N(x[o+2])),R2(N(x[o+3])),
      R2(N(x[o+5])),N(x[o+6]),N(x[o+7]),N(x[o+8]),T(x[o+9])]);});
    items[code]=it;
  }
  return {items,rounds:blocks.map(b=>b.lab),up:1760000000000,n:Object.keys(items).length};
}

(async()=>{
 const DATA=payload();
 const hits=[];                                  /* ทุก request ที่หน้านี้ยิงออกไป */
 const srv=http.createServer((q,res)=>{
   hits.push(q.url);
   if(q.url==='/api/pricelist'){res.setHeader('content-type','application/json');return res.end(JSON.stringify(DATA));}
   if(q.url.startsWith('/img/')){res.statusCode=404;return res.end('');}
   try{res.end(fs.readFileSync(PAGE));}catch(e){res.statusCode=404;res.end('');}
 });
 await new Promise(r=>srv.listen(PORT,r));

 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const errs=[];

 /* ============================================================
  * จอคอม
  * ==========================================================*/
 const pg=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage();
 pg.on('pageerror',e=>errs.push('desktop: '+e));
 const ev=(f,a)=>pg.evaluate(f,a);
 await pg.goto('http://127.0.0.1:'+PORT+'/',{waitUntil:'networkidle'});
 await pg.waitForTimeout(350);

 t('หน้าโหลดและวาดรายการได้',await ev(()=>document.querySelectorAll('.pl-tbl tr.prow').length>0),
   await ev(()=>document.getElementById('cnt').textContent));

 /* ---------- 1) คอลัมน์ตรงกัน ---------- */
 const al=await ev(()=>{
   const rs=[...document.querySelectorAll('.pl-tbl tr.prow')].slice(0,30);
   const cols=rs.map(r=>[...r.querySelectorAll('td.cnum')].map(td=>Math.round(td.getBoundingClientRect().left)));
   return {n:rs.length,first:cols[0],
     same:cols.every(c=>c.length===5&&JSON.stringify(c)===JSON.stringify(cols[0]))};
 });
 t('⚠️ ขอบซ้ายของคอลัมน์ตัวเลขทั้ง 5 ตรงกันทุกแถว (เรื่องที่เจ้าของขีดเส้นแดงมาให้ดู)',
   al.same,'30 แถว · '+JSON.stringify(al.first));
 t('มี 5 คอลัมน์ตัวเลขครบทุกแถว แม้สินค้าจะไม่มีราคาโปร',al.first&&al.first.length===5,al.first&&al.first.length);
 t('ตารางไม่ล้นขอบจอ',!await ev(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth),'ok');

 /* ---------- 2) ชื่อหมวดภาษาไทย ---------- */
 const cats=await ev(()=>[...document.querySelectorAll('#cat option')].map(o=>o.textContent));
 const bands=await ev(()=>[...document.querySelectorAll('.pl-tbl tr.catrow')].map(r=>r.textContent.trim()));
 const CODES=['FAB SOL','FAB SEN','H&H','PW','U-Pro','BODY','FACE','DEO','FOODS','HAIR'];
 const leaked=CODES.filter(c=>cats.some(o=>o.indexOf(c)>=0)||bands.some(x=>x.indexOf(c)>=0));
 t('หมวดในช่องเลือกเป็นภาษาไทยทั้งหมด ไม่มีตัวย่อของ Unilever หลุดออกไป',leaked.length===0,leaked.join(', '));
 t('...และแถบคั่นหมวดในตารางก็เป็นไทยด้วย',bands.length>0&&/[฀-๿]/.test(bands[0]),bands.slice(0,3).join(' | '));
 t('แปลครบทุกหมวดที่มีในไฟล์ (10 หมวด)',cats.length===11,cats.length+' ตัวเลือก (รวม "ทุกหมวด")');
 t('ชื่อไทยสื่อความถูก — ผงซักฟอก · ปรับผ้านุ่ม · แชมพู · ล้างจาน',
   cats.some(c=>/ผงซักฟอก/.test(c))&&cats.some(c=>/ปรับผ้านุ่ม/.test(c))&&
   cats.some(c=>/แชมพู/.test(c))&&cats.some(c=>/ล้างจาน/.test(c)),cats.filter(c=>c!=='ทุกหมวดสินค้า').slice(0,4).join(' · '));

 /* ---------- รหัสสินค้า ---------- */
 const cd=await ev(()=>{
   const rs=[...document.querySelectorAll('.pl-tbl tr.prow')].slice(0,60);
   const out=rs.map(r=>{
     const c=r.querySelector('.nmcell .code');
     return {txt:c?c.textContent.trim():null,
       nm:r.querySelector('.nmcell b').textContent.trim()};});
   return {n:rs.length,rows:out,
     missing:out.filter(o=>!o.txt).length,
     badFmt:out.filter(o=>!/^รหัส \d{6,12}$/.test(o.txt||'')).length,
     sample:out.slice(0,2)};
 });
 t('หน้าลูกค้าโชว์รหัสสินค้าทุกแถว',cd.missing===0,cd.missing+' แถวที่ไม่มีรหัส จาก '+cd.n);
 t('...เขียนว่า "รหัส <เลข>" เหมือนในแอปของพนักงาน',cd.badFmt===0,JSON.stringify(cd.sample));
 const codeOk=await ev(a3=>{
   /* รหัสที่พิมพ์ต้องเป็นของสินค้าแถวนั้นจริง ไม่ใช่ของแถวอื่น */
   const rs=[...document.querySelectorAll('.pl-tbl tr.prow')].slice(0,60);
   let bad=0,first=null;
   rs.forEach(r=>{
     const code=(r.querySelector('.nmcell .code').textContent.match(/\d{6,12}/)||[])[0];
     const it=P.items[code];
     if(!it){bad++;if(!first)first='ไม่มีรหัส '+code+' ในข้อมูล';return;}
     const want=prName(code,it).nm;
     const got=r.querySelector('.nmcell b').textContent.trim();
     if(want!==got){bad++;if(!first)first=code+': "'+got+'" ควรเป็น "'+want+'"';}
   });
   return {bad:bad,first:first};
 });
 t('⚠️ รหัสที่พิมพ์เป็นของสินค้าแถวนั้นจริง (ชื่อที่โชว์ตรงกับรหัส)',codeOk.bad===0,codeOk.first||'ตรวจ 60 แถว');
 t('รหัสอ่านง่าย ตัวเลขเรียงหลักและเข้มกว่าข้อความรอบๆ',
   await ev(()=>{const c=getComputedStyle(document.querySelector('.pl-tbl .nmcell .code'));
     return c.fontVariantNumeric.indexOf('tabular-nums')>=0&&+c.fontWeight>=700;}),'ok');

 /* ---------- 3) ตัวกรองแบรนด์ ---------- */
 await pg.click('#bBtn');await pg.waitForTimeout(150);
 const nBrand=await ev(()=>document.querySelectorAll('#bChips .bchip').length);
 t('มีรายการแบรนด์ให้ติ๊ก',nBrand>=20,nBrand+' แบรนด์');
 t('แต่ละแบรนด์บอกจำนวนสินค้าด้วย',
   await ev(()=>[...document.querySelectorAll('#bChips .bchip small')].every(s=>/^\d+$/.test(s.textContent.trim()))),'ok');

 const one=await ev(()=>{
   const c=[...document.querySelectorAll('#bChips .bchip')].filter(x=>/^LUX\b/.test(x.textContent.trim()))[0];
   const want=+c.querySelector('small').textContent;c.click();
   return {want:want,got:document.querySelectorAll('.pl-tbl tr.prow').length,
     chips:document.querySelectorAll('#bChips .bchip').length,
     on:document.querySelectorAll('#bChips .bchip.on').length};
 });
 t('ติ๊กแบรนด์เดียว แล้วได้จำนวนรายการตรงกับเลขบนชิป',one.got===one.want,one.got+' / ควรเป็น '+one.want);
 t('⚠️ ติ๊กแล้วแบรนด์อื่นต้องยังอยู่ให้ติ๊กเพิ่มได้ (ไม่ใช่เหลือแบรนด์เดียว)',one.chips===nBrand,one.chips+' / '+nBrand);
 t('ชิปที่ติ๊กขึ้นสถานะชัดเจน',one.on===1,one.on);

 const two=await ev(()=>{
   const c=[...document.querySelectorAll('#bChips .bchip')].filter(x=>/^DOVE\b/.test(x.textContent.trim()))[0];
   const add=+c.querySelector('small').textContent;
   const before=document.querySelectorAll('.pl-tbl tr.prow').length;c.click();
   return {sum:before+add,got:document.querySelectorAll('.pl-tbl tr.prow').length};
 });
 t('ติ๊กสองแบรนด์ = ได้ทั้งสองแบรนด์รวมกัน',two.got===two.sum,two.got+' / ควรเป็น '+two.sum);

 await pg.click('#bAll');await pg.waitForTimeout(200);
 t('กด "ดูทุกแบรนด์" แล้วกลับมาครบ',
   await ev(()=>document.querySelectorAll('#bChips .bchip.on').length===0),
   await ev(()=>document.getElementById('cnt').textContent));

 const cross=await ev(()=>{
   /* ติ๊กแบรนด์ที่ไม่มีในหมวดอื่น แล้วสลับหมวด — ต้องไม่ค้างจนได้ผลลัพธ์ว่าง */
   [...document.querySelectorAll('#bChips .bchip')].filter(x=>/^KNORR\b/.test(x.textContent.trim()))[0].click();
   const sel=document.getElementById('cat');
   const food=[...sel.options].filter(o=>/อาหาร/.test(o.textContent))[0].value;
   const hair=[...sel.options].filter(o=>/แชมพู/.test(o.textContent))[0].value;
   sel.value=hair;sel.dispatchEvent(new Event('change'));
   const after=document.querySelectorAll('.pl-tbl tr.prow').length;
   sel.value='all';sel.dispatchEvent(new Event('change'));
   return {after:after,food:food,hair:hair};
 });
 t('⚠️ ติ๊กแบรนด์ไว้แล้วสลับไปหมวดที่ไม่มีแบรนด์นั้น ต้องไม่ได้หน้าว่าง',cross.after>0,cross.after+' รายการ');

 /* ---------- 4) กดหัวคอลัมน์เรียง ---------- */
 const srt=await ev(()=>{
   const read=()=>[...document.querySelectorAll('.pl-tbl tr.prow')]
     .map(r=>parseFloat(r.querySelectorAll('td.cnum')[0].innerText.replace(/[^\d.]/g,''))||null)
     .filter(v=>v!=null);
   const bandsOf=()=>document.querySelectorAll('.pl-tbl tr.catrow').length;
   const band0=bandsOf();
   document.querySelector('th[data-s="ntt"]').click();
   const d1=read(),b1=bandsOf(),note=!!document.querySelector('.sortnote'),
     hl=document.querySelectorAll('.pl-tbl th.sorted').length;
   document.querySelector('th[data-s="ntt"]').click();
   const d2=read();
   document.querySelector('th[data-s="ntt"]').click();
   const b3=bandsOf();
   return {band0,b1,b3,note,hl,
     desc:d1.every((v,i)=>i===0||d1[i-1]>=v),asc:d2.every((v,i)=>i===0||d2[i-1]<=v),
     top:d1.slice(0,3),bot:d2.slice(0,3)};
 });
 t('กดหัวคอลัมน์ครั้งแรก เรียงมากไปน้อย',srt.desc,'บนสุด '+srt.top.join(' · '));
 t('กดซ้ำ เรียงน้อยไปมาก',srt.asc,'บนสุด '+srt.bot.join(' · '));
 t('กดครั้งที่สาม เลิกเรียง กลับไปแบ่งหมวดเหมือนเดิม',srt.b3===srt.band0&&srt.band0>0,srt.b3+' แถบ (เดิม '+srt.band0+')');
 t('⚠️ ตอนเรียงต้องไม่แบ่งหมวด ไม่งั้นจะเรียงแค่ภายในหมวด',srt.b1===0,srt.b1+' แถบ');
 t('...และมีกล่องบอกว่ากำลังเรียงอะไรอยู่ พร้อมปุ่มเลิกเรียง',srt.note,'ok');
 t('คอลัมน์ที่กำลังเรียงถูกไฮไลต์ไว้ 1 คอลัมน์',srt.hl===1,srt.hl);

 const miss=await ev(()=>{
   /* กางรายการให้ครบ **หลัง** กดเรียง เพราะการกดเรียงรีเซ็ตจำนวนที่แสดงกลับเป็นหน้าแรกเสมอ
      ถ้าไม่กาง 300 แถวแรกจะมีแต่ตัวที่มีค่า แล้วการเช็ค "ตัวไม่มีค่าอยู่ท้าย" จะไม่ได้พิสูจน์อะไร */
   const all=function(){V.show=5000;draw();};
   document.querySelector('th[data-s="gainP"]').click();all();    /* กำไรช่วงโปร — หลายตัวไม่มี */
   const cells=[...document.querySelectorAll('.pl-tbl tr.prow')]
     .map(r=>r.querySelectorAll('td.cnum')[4].innerText.trim());
   const firstDash=cells.findIndex(c=>/—/.test(c));
   const afterAllDash=firstDash<0||cells.slice(firstDash).every(c=>/—/.test(c));
   document.querySelector('th[data-s="gainP"]').click();all();
   const cells2=[...document.querySelectorAll('.pl-tbl tr.prow')]
     .map(r=>r.querySelectorAll('td.cnum')[4].innerText.trim());
   const fd2=cells2.findIndex(c=>/—/.test(c));
   const afterAllDash2=fd2<0||cells2.slice(fd2).every(c=>/—/.test(c));
   document.querySelector('th[data-s="gainP"]').click();
   V.show=300;draw();
   return {desc:afterAllDash,asc:afterAllDash2,n:cells.length,
     nDash:cells.filter(c=>/—/.test(c)).length};
 });
 t('รายการถูกกางออกจนเห็นทั้งแถวที่มีค่าและไม่มีค่าปนกัน',miss.nDash>0&&miss.nDash<miss.n,
   miss.nDash+' ไม่มีค่า จาก '+miss.n+' แถว');
 t('⚠️ แถวที่ไม่มีค่า (ไม่มีราคาโปร) ไปอยู่ท้ายสุด ตอนเรียงมากไปน้อย',miss.desc,miss.nDash+' แถวที่ไม่มีค่า');
 t('...และตอนเรียงน้อยไปมากก็ยังอยู่ท้าย ไม่ใช่ขึ้นมาบนสุด',miss.asc,'ok');

 /* ---------- 6) 🔒 ยิง endpoint เดียว ---------- */
 const apis=hits.filter(u=>u.indexOf('/api/')===0);
 t('🔒 ตลอดการใช้งาน หน้านี้เรียก API ตัวเดียวคือ /api/pricelist',
   apis.length>0&&apis.every(u=>u==='/api/pricelist'),[...new Set(apis)].join(', '));
 t('🔒 ไม่เคยเรียก /api/price (ตัวที่มีข้อมูลต้นทุน) เลย',
   !hits.some(u=>u.indexOf('/api/price')===0&&u!=='/api/pricelist'),'ok');

 /* ============================================================
  * มือถือ
  * ==========================================================*/
 const mp=await (await b.newContext({viewport:{width:390,height:1400}})).newPage();
 mp.on('pageerror',e=>errs.push('phone: '+e));
 await mp.goto('http://127.0.0.1:'+PORT+'/',{waitUntil:'networkidle'});
 await mp.waitForTimeout(350);
 const mv=await mp.evaluate(()=>({
   sortSel:getComputedStyle(document.querySelector('.sortsel')).display,
   thead:getComputedStyle(document.querySelector('.pl-tbl thead')).display,
   over:document.documentElement.scrollWidth>document.documentElement.clientWidth,
   labels:[...document.querySelectorAll('.pl-tbl tr.prow')][0].querySelectorAll('td.cnum').length}));
 t('มือถือ: ตารางกางเป็นการ์ด หัวตารางถูกซ่อน',mv.thead==='none',mv.thead);
 t('⚠️ มือถือ: จึงต้องมีช่องเลือกการเรียงแทน ไม่งั้นเรียงไม่ได้เลย',mv.sortSel!=='none',mv.sortSel);
 t('มือถือ: ไม่ล้นขอบจอ',!mv.over,'ok');
 t('มือถือ: ยังมีครบ 5 ช่องราคาต่อสินค้า',mv.labels===5,mv.labels);
 t('มือถือ: ทุกช่องมีป้ายกำกับว่าเป็นราคาอะไร (จอแคบไม่มีหัวตารางให้ดู)',
   await mp.evaluate(()=>[...document.querySelectorAll('.pl-tbl tr.prow')][0]
     .querySelectorAll('td.cnum').length===
     [...document.querySelectorAll('.pl-tbl tr.prow')][0]
     .querySelectorAll('td.cnum[data-l]').length),'ok');
 const msort=await mp.evaluate(()=>{
   const s=document.getElementById('sortS');
   s.value='gain|-1';s.dispatchEvent(new Event('change'));
   /* ช่องกำไรมีสองตัวเลขในช่องเดียว (% กับ บาท/ชิ้น) ต้องอ่านเฉพาะตัวหลัก .v */
   const v=[...document.querySelectorAll('.pl-tbl tr.prow')]
     .map(r=>{const e=r.querySelectorAll('td.cnum')[2].querySelector('.v');
       return e?parseFloat(e.textContent.replace(/[^\d.]/g,'')):null;})
     .filter(x=>x!=null);
   return {n:s.options.length,ok:v.every((x,i)=>i===0||v[i-1]>=x),top:v.slice(0,3)};
 });
 t('มือถือ: เลือกการเรียงจากช่องแล้วเรียงจริง',msort.ok,'บนสุด '+msort.top.join(' · '));
 t('มือถือ: ช่องเรียงมีครบทุกคอลัมน์ ทั้งสองทิศ',msort.n===11,msort.n+' ตัวเลือก');
 t('มือถือ: ติ๊กแบรนด์ได้',await mp.evaluate(()=>{
   document.getElementById('bBtn').click();
   return document.querySelectorAll('#bChips .bchip').length>=20;}),'ok');

 t('ไม่มี JavaScript error ทั้งจอคอมและมือถือ',errs.length===0,errs.join(' | '));

 await b.close();srv.close();
 let fail=0;
 A.forEach(([ok,n,x])=>{if(!ok)fail++;console.log((ok?'  ok  ':'  FAIL')+'  '+n+(x?'   ['+x+']':''));});
 console.log('\n'+A.length+' checks · '+(A.length-fail)+' passed · '+fail+' failed');
 console.log(fail?'SOME FAILED':'ALL PASS ('+A.length+' checks)');
 process.exit(fail?1:0);
})();
