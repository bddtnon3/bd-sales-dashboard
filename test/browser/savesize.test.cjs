/* ☁️ บันทึกขึ้นเซิร์ฟเวอร์ต้องไม่ "เงียบ" เวลาข้อมูลใหญ่หรือเน็ตสะดุด
 *
 * เจ้าของสั่ง 27 พ.ย. 69: *"ช่วงนี้ผมใช้เวปกดันเข้มข้นมาก จนถึงสิ้นเดือน ฝากดูเรื่องความต่อเนื่อง
 * ของข้อมูลหน่อย อย่าให้ข้อมูลเต็มแล้วส่งไม่ได้อีก"*
 *
 * ของเดิมบอกแค่ `⚠️ บันทึกไม่สำเร็จ: HTTP 413` — ไม่รู้ว่าใหญ่เท่าไหร่ ใหญ่ตรงไหน และต้องทำอะไรต่อ
 * ตอนนี้: บอกขนาดทุกครั้งที่บันทึกสำเร็จ · เตือนก่อนถึงเพดาน · ระบุส่วนที่ใหญ่สุด ·
 * และเน็ตสะดุด/เซิร์ฟเวอร์พัง ลองใหม่ให้เองหนึ่งครั้ง
 *
 * ⚠️ ส่งซ้ำได้เพราะ `api/save.js` รวมข้อมูล "ทีละคีย์" (mergeState) ส่งซ้ำจึงไม่ทำให้อะไรซ้อน
 *    — เทสต์นี้เช็กด้วยว่าทั้งสองครั้งส่ง payload เดียวกันจริง
 * ⛔ ตัวเลขในไฟล์นี้สมมติขึ้นเอง — รีโปเป็นสาธารณะ
 * ต้องติดตั้งก่อน: npm i --no-save playwright-core
 */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');
const BROWSER=require('./_chrome.cjs').chromePath();
const ORIGIN='https://bd-save.test/';

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:1280,height:900},timezoneId:'Asia/Bangkok'});
 const pg=await ctx.newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 const html=fs.readFileSync(PAGE,'utf8');
 await pg.route(ORIGIN+'**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}));
 await pg.goto(ORIGIN,{waitUntil:'domcontentloaded'});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);

 await pg.evaluate(`
   document.getElementById('login').classList.add('hidden');
   document.getElementById('app').classList.remove('hidden');
   window.Chart=function(){return{destroy(){}}};
   TOKEN='t';
   /* เก็บข้อความใน log ไว้อ่าน แทนที่จะเขียนลงหน้าจอ */
   window.__log=[];window.ulog=m=>{window.__log.push(String(m));};
   /* ดักการส่งจริง — คุมคำตอบได้ และนับจำนวนครั้ง */
   window.__posts=[];window.__reply=()=>({ok:true,status:200});
   window.fetch=async(u,o)=>{
     window.__posts.push({u:u,bytes:(o&&o.body&&(o.body.byteLength||o.body.length))||0,
       gz:!!(o&&o.headers&&o.headers['x-body-gzip'])});
     const r=window.__reply();
     return {ok:r.ok,status:r.status,json:async()=>r.body||{}};
   };
   window.__run=async()=>{window.__posts=[];window.__log=[];await _doSync(0);
     await new Promise(r=>setTimeout(r,3500));   /* เผื่อรอบลองใหม่ */
     return {posts:window.__posts,log:window.__log};};
 `);

 /* ---------- 1) บันทึกสำเร็จ ต้องบอกขนาดด้วย ---------- */
 const ok=await ev(()=>window.__run());
 t('☁️ บันทึกสำเร็จแล้วบอกขนาดข้อมูลด้วย ไม่ใช่แค่ว่าสำเร็จ',
   ok.log.some(x=>/บันทึกขึ้นเซิร์ฟเวอร์กลางแล้ว/.test(x)&&/MB/.test(x)),ok.log.join(' | '));
 t('...ส่งครั้งเดียว และบีบอัดก่อนส่ง',
   ok.posts.length===1&&ok.posts[0].gz===true,JSON.stringify(ok.posts));
 t('...ยังไม่ใกล้เพดาน จึงไม่ต้องเตือนอะไร',
   !ok.log.some(x=>/ข้อมูลเริ่มใหญ่/.test(x)),ok.log.join(' | '));

 /* ---------- 2) ข้อมูลใหญ่เกิน → ต้องบอกขนาด · ส่วนที่ใหญ่สุด · และสิ่งที่ต้องทำ ---------- */
 const big=await ev(async()=>{
   /* ยัดข้อมูลสมมติให้ส่วนหนึ่งใหญ่จนทะลุเพดาน (ข้อความสุ่ม บีบอัดแล้วยังใหญ่) */
   /* ⚠️ ANALYTICS ประกาศด้วย let ที่ระดับบนสุด จึงไม่ได้อยู่บน window —
      ต้องเขียนทับแบบไม่มี window. ไม่งั้นได้ตัวแปรคนละตัว แล้ว payload ไม่โตจริง */
   const keep=ANALYTICS;
   let s='';for(let i=0;i<9e5;i++)s+=String.fromCharCode(33+((i*7919)%90));
   ANALYTICS={big:[s,s,s,s,s,s]};
   window.__reply=()=>({ok:false,status:413,body:{error:'too large'}});
   const r=await window.__run();
   ANALYTICS=keep;window.__reply=()=>({ok:true,status:200});
   return r;});
 const bigMsg=big.log.filter(x=>/⛔/.test(x))[0]||'';
 t('⛔ ข้อมูลใหญ่เกิน → บอกชัดว่าเกิน ไม่ใช่ HTTP 413 เฉย ๆ',/ใหญ่เกินกว่าที่ส่งได้/.test(bigMsg),bigMsg.slice(0,80));
 t('...บอกขนาดจริงและเพดานเป็น MB',/MB.*เพดาน.*MB/.test(bigMsg),bigMsg.slice(0,120));
 t('...ระบุส่วนที่ใหญ่ที่สุดให้ไปตามแก้ได้',/ANALYTICS/.test(bigMsg),bigMsg.slice(-90));
 t('...บอกสิ่งที่ต้องทำทันที (อย่าเพิ่งปิดหน้า เพราะไฟล์ที่เพิ่งอ่านยังไม่ถูกบันทึก)',
   /อย่าเพิ่งปิดหน้านี้/.test(bigMsg),bigMsg.slice(-70));
 t('...ของใหญ่เกินแล้วไม่ต้องลองใหม่ให้เสียเวลา (ส่งครั้งเดียว)',big.posts.length===1,big.posts.length);

 /* ---------- 3) ใกล้เต็ม → เตือนล่วงหน้าตั้งแต่ยังบันทึกผ่าน ----------
    ⚠️ ต้องใช้ข้อมูล "สุ่มจริง" (base64 ของไบต์สุ่ม) ไม่ใช่ข้อความวนซ้ำ —
       เพราะเกณฑ์เตือนวัดจากขนาด "หลังบีบอัด" ข้อความวนซ้ำ 3.6 MB บีบแล้วเหลือ 0.01 MB
       ทดสอบไม่ได้เลย ส่วนของสุ่มบีบแล้วยังใหญ่ ใกล้เคียงของจริงมากกว่า */
 const warn=await ev(async()=>{
   const keep=ANALYTICS;
   const mk=mb=>{const n=Math.floor(mb*1048576*3/4),a=new Uint8Array(n);
     for(let i=0;i<n;i+=65536)crypto.getRandomValues(a.subarray(i,Math.min(n,i+65536)));
     let out='';const CH=1<<15;
     for(let i=0;i<n;i+=CH)out+=btoa(String.fromCharCode.apply(null,a.subarray(i,Math.min(n,i+CH))));
     return out;};
   ANALYTICS={big:mk(5.2)};                   /* ใหญ่พอให้เตือน แต่ยังส่งผ่าน */
   const r=await window.__run();
   ANALYTICS=keep;return r;});
 const wMsg=warn.log.filter(x=>/ข้อมูลเริ่มใหญ่/.test(x))[0]||'';
 t('⚠️ ใกล้เพดานแล้วเตือนล่วงหน้า ตั้งแต่ยังบันทึกผ่านอยู่',!!wMsg,wMsg.slice(0,90));
 t('...และยังบันทึกสำเร็จตามปกติ ไม่ได้บล็อกการทำงาน',
   warn.log.some(x=>/บันทึกขึ้นเซิร์ฟเวอร์กลางแล้ว/.test(x)),warn.log.join(' | ').slice(0,120));

 /* ---------- 4) เน็ตสะดุด / เซิร์ฟเวอร์พัง → ลองใหม่ให้เองหนึ่งครั้ง ---------- */
 const net=await ev(async()=>{
   let n=0;
   window.fetch=async(u,o)=>{n++;window.__posts.push({u:u,
     bytes:(o&&o.body&&(o.body.byteLength||o.body.length))||0});
     if(n===1)throw new Error('network down');
     return {ok:true,status:200,json:async()=>({})};};
   const r=await window.__run();
   return r;});
 t('↻ เน็ตสะดุด → ลองใหม่ให้เองหนึ่งครั้ง แล้วสำเร็จ',
   net.posts.length===2&&net.log.some(x=>/บันทึกขึ้นเซิร์ฟเวอร์กลางแล้ว/.test(x)),
   net.posts.length+' · '+net.log.join(' | ').slice(0,100));
 t('...ส่งซ้ำเป็นข้อมูลชุดเดิมเป๊ะ (เซิร์ฟเวอร์รวมทีละคีย์ จึงไม่ซ้อนกัน)',
   net.posts.length===2&&net.posts[0].bytes===net.posts[1].bytes,
   JSON.stringify(net.posts.map(x=>x.bytes)));

 const srv=await ev(async()=>{
   let n=0;
   window.fetch=async(u,o)=>{n++;window.__posts.push({u:u});
     return {ok:n>1,status:n>1?200:500,json:async()=>({error:'boom'})};};
   return await window.__run();});
 t('↻ เซิร์ฟเวอร์ตอบ 5xx → ลองใหม่หนึ่งครั้งเหมือนกัน',
   srv.posts.length===2&&srv.log.some(x=>/บันทึกขึ้นเซิร์ฟเวอร์กลางแล้ว/.test(x)),
   srv.posts.length+' · '+srv.log.join(' | ').slice(0,100));

 /* ---------- 5) คำตอบที่ชัดแล้ว ห้ามส่งซ้ำ ---------- */
 const no=await ev(async()=>{
   window.fetch=async(u,o)=>{window.__posts.push({u:u});
     return {ok:false,status:403,json:async()=>({error:'forbidden'})};};
   return await window.__run();});
 t('🚫 403 คือคำตอบที่ชัดแล้ว — ไม่ต้องส่งซ้ำ แต่ต้องบอกสิ่งที่ต้องทำ',
   no.posts.length===1&&no.log.some(x=>/อย่าเพิ่งปิดหน้านี้/.test(x)),
   no.posts.length+' · '+no.log.join(' | ').slice(0,110));

 t('ไม่มี error ในหน้าเว็บตลอดการเทส',errs.length===0,errs.join(' | '));

 await b.close();
 let bad=0;A.forEach(([okk,n,x])=>{if(!okk)bad++;console.log((okk?'  ✓ ':'  ✗ FAIL: ')+n+(x?' → '+x:''));});
 console.log(bad?('\n'+bad+' FAILED of '+A.length):('\nALL PASS ('+A.length+' checks)'));
 process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
