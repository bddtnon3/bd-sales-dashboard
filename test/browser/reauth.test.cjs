/* 🔑 ล็อกอินหมดอายุกลางคัน — ฝั่งเซลล์ต้องไม่ติด "unauthorized" อีก (27 ต.ค. 69)
 *
 * เจ้าของส่งรูปมา: สาย KA97 กดส่งคำขอแล้วขึ้น
 *   "บันทึกไม่สำเร็จ: unauthorized / รายการที่คีย์ไว้ยังอยู่ ลองกดส่งอีกครั้งได้"
 * — หลังคีย์สินค้าไปแล้ว 17 ตัว แล้วกดส่งอีกกี่ครั้งก็ขึ้นเหมือนเดิม เพราะ token ตายไปแล้ว
 *
 * ต้นเหตุ: ล็อกอินอยู่ได้ 7 วันและ **ไม่มีอะไรต่ออายุให้** ทีมเปิดหน้าเว็บค้างไว้บนเครื่อง
 * หน้าจอยังกดได้ทุกอย่าง (ทำงานในเครื่องล้วน ๆ) จะรู้ว่าหมดอายุก็ตอนกดส่งเท่านั้น
 *
 * ต้องพิสูจน์:
 *  1) อ่านวันหมดอายุจากตัว token เองได้ · เหลือเวลาเยอะ = ไม่ต้องกวนเซิร์ฟเวอร์
 *  2) ใกล้หมดอายุ = ต่ออายุเงียบ ๆ แล้วเก็บ token ใหม่ลงเครื่อง
 *  3) เจอ 401 ตอนกดส่ง = ต่ออายุแล้ว **ส่งซ้ำให้เอง** คนใช้ไม่เห็นอะไรผิดปกติเลย
 *  4) ต่ออายุไม่ได้ = ขึ้นกล่องใส่รหัสผ่านตรงนั้น ใส่แล้ว **ส่งต่อให้ทันที** ไม่ต้องคีย์ใหม่
 *  5) กดยกเลิก = ของที่คีย์ไว้ต้องยังอยู่ครบ และข้อความบอกวิธีแก้แบบที่ทำตามได้
 *  6) กล่องนี้ต้องไม่ทำให้ตะกร้าหาย ไม่เด้งออกจากระบบ ไม่เปลี่ยนหน้า
 *  7) 🛟 ตลอดกระบวนการห้ามมีคำขอตกหล่น และห้ามส่งซ้ำซ้อนจนคำขอเบิ้ล
 *
 * ต้องติดตั้งก่อน:  npm i --no-save playwright-core
 * แล้วรัน:  node build.cjs && node test/browser/reauth.test.cjs
 */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const BROWSER=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ROOT=path.resolve(__dirname,'..','..');
const ORIGIN='https://bd-reauth.test/';     /* ต้องมี origin จริง ไม่งั้น localStorage ถูกห้าม */

/* token ปลอมที่หน้าเว็บอ่านวันหมดอายุออก (ส่วนแรกเป็น JSON ธรรมดา เหมือนของจริง) */
function tok(expMs,tag){
  const body=Buffer.from(JSON.stringify({u:'ka97',role:'sales',code:'2096_97',
    name:'เกษชญานิษฐ์',exp:expMs})).toString('base64url');
  return body+'.'+(tag||'sig');
}

function setup(a){
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};window.ulog=()=>{};
  window.__alerts=[];window.alert=m=>window.__alerts.push(String(m));
  window.confirm=()=>true;
  window.__calls=[];            /* ทุก request ที่ยิงออกไป ตามลำดับ */
  window.__renewOK=true;        /* /api/renew จะยอมต่อให้ไหม */
  window.__accept=null;         /* token ที่ /api/request ยอมรับ (null = ยอมหมด) */
  window.__pass='1234';
  window.fetch=async(u,o)=>{
    u=String(u);const auth=((o&&o.headers)||{})['Authorization']||'';
    const t=auth.replace(/^Bearer\s*/,'');
    window.__calls.push({u:u,tok:t,body:(o&&o.body)||''});
    const J=(code,obj)=>({ok:code<400,status:code,json:()=>Promise.resolve(obj)});
    if(u.indexOf('/api/renew')>=0){
      if(!window.__renewOK)return J(401,{error:'unauthorized'});
      window.__accept=a.FRESH;return J(200,{ok:true,token:a.FRESH,role:'sales',code:'2096_97',name:'เกษชญานิษฐ์'});
    }
    if(u.indexOf('/api/login')>=0){
      const b=JSON.parse(o.body||'{}');
      if(b.pass!==window.__pass)return J(401,{error:'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'});
      window.__accept=a.AFTER;return J(200,{ok:true,token:a.AFTER,role:'sales',code:'2096_97',name:'เกษชญานิษฐ์'});
    }
    if(u.indexOf('/api/request')>=0){
      if(window.__accept&&t!==window.__accept)return J(401,{error:'unauthorized'});
      window.__saved=JSON.parse(o.body||'{}');return J(200,{ok:true});
    }
    return J(200,{ok:true});
  };
  TOKEN=a.OLD;try{localStorage.setItem('bd_token',a.OLD);}catch(e){}
  S.user={id:'ka97',role:'sales',code:'2096_97',name:'เกษชญานิษฐ์'};
  DATA={lines:{'2096_97':{display:'KA97'}},focus_order:['2096_97'],targets:{},daily:{},monthly:{}};
  REQUESTS={data:{}};ORDERS={dates:[],data:{},names:{},cat:{},catN:{}};POSTATUS={dates:[],data:{}};
  STOCKD={date:null,rows:[],names:{}};MASTER={items:{}};
  for(let i=0;i<17;i++)MASTER.items['7000'+String(1000+i)]='สินค้าทดสอบ '+(i+1);
  REQ.date=null;REQ.cart={};
}

(async()=>{
 const DAY=86400000,now=Date.now();
 const OLD=tok(now-DAY,'old'),FRESH=tok(now+30*DAY,'fresh'),AFTER=tok(now+30*DAY,'after');
 const ARG={OLD,FRESH,AFTER};
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const ctx=await b.newContext({viewport:{width:900,height:900}});
 const pg=await ctx.newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 const html=fs.readFileSync(path.join(ROOT,'public','index.html'),'utf8');
 await pg.route(ORIGIN+'**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}));
 await pg.goto(ORIGIN);
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);
 await ev(setup,ARG);

 /* ---------- 1) อ่านวันหมดอายุจาก token ---------- */
 const exp=await ev(a=>({old:bdTokExp(a.OLD),fresh:bdTokExp(a.FRESH),junk:bdTokExp('ไม่ใช่token'),
   none:bdTokExp('')}),ARG);
 t('อ่านวันหมดอายุออกมาจากตัว token ได้ (ไม่ต้องถามเซิร์ฟเวอร์)',
   Math.abs(exp.old-(now-DAY))<2000&&Math.abs(exp.fresh-(now+30*DAY))<2000,exp.old+' / '+exp.fresh);
 t('...token มั่ว/ว่าง ไม่พัง คืน 0',exp.junk===0&&exp.none===0,exp.junk+','+exp.none);

 /* ---------- 2) เหลือเวลาเยอะ = ไม่ต้องต่อ ---------- */
 const far=await ev(async a=>{TOKEN=a.FRESH;window.__calls=[];
   const ok=await bdRenew();return {ok:ok,calls:window.__calls.length};},ARG);
 t('เหลืออายุอีก 30 วัน = ไม่ยิงต่ออายุให้เปลืองเน็ต',far.ok===true&&far.calls===0,'ยิง '+far.calls+' ครั้ง');
 const near=await ev(async a=>{TOKEN=a.OLD;window.__calls=[];
   const ok=await bdRenew();
   return {ok:ok,calls:window.__calls.map(c=>c.u),tok:TOKEN,
     ls:(()=>{try{return localStorage.getItem('bd_token');}catch(e){return null;}})()};},ARG);
 t('ใกล้หมด/หมดแล้ว = ต่ออายุเงียบ ๆ แล้วเก็บ token ใหม่ลงเครื่องด้วย',
   near.ok===true&&near.calls.join()==='/api/renew'&&near.tok===FRESH&&near.ls===FRESH,
   near.calls.join()+' · tok='+(near.tok===FRESH?'ใหม่':'เก่า')+' · localStorage='+(near.ls===FRESH?'ใหม่':'เก่า'));

 /* ---------- 3) เจอ 401 ตอนกดส่ง → ต่ออายุแล้วส่งซ้ำให้เอง ---------- */
 const silent=await ev(async a=>{
   TOKEN=a.OLD;window.__accept=a.FRESH;window.__renewOK=true;window.__calls=[];window.__alerts=[];
   REQ.date='2026-10-27';REQ.cart={};
   Object.keys(MASTER.items).forEach((c,i)=>{REQ.cart[c]={cs:i+1,pc:0};});
   const n=Object.keys(REQ.cart).length;
   await submitRequest();
   return {n:n,calls:window.__calls.map(c=>c.u),alerts:window.__alerts,
     saved:window.__saved?Object.keys(window.__saved.items||{}).length:0,
     cart:Object.keys(REQ.cart).length,
     reauthShown:!document.getElementById('reauthModal').classList.contains('hidden'),
     draft:reqDraftCount('2026-10-27'),
     stored:Object.keys(((REQUESTS.data||{})['2026-10-27']||{})['2096_97']||{}).length?
       Object.keys(REQUESTS.data['2026-10-27']['2096_97'].items||{}).length:0};
 },ARG);
 t('คีย์ 17 ตัวแล้วกดส่งตอน token ตาย → ระบบต่ออายุแล้วส่งซ้ำให้เอง',
   silent.saved===17&&silent.n===17,'ส่งถึงเซิร์ฟเวอร์ '+silent.saved+' รายการ');
 t('...ลำดับที่ยิงคือ ส่ง → ต่ออายุ → ส่งอีกครั้ง',
   silent.calls.join(' → ')==='/api/request → /api/renew → /api/request',silent.calls.join(' → '));
 t('...ไม่มีกล่องใส่รหัสผ่านเด้ง และไม่มีข้อความ error ให้คนใช้ต้องอ่าน',
   !silent.reauthShown&&silent.alerts.length===0,silent.alerts.join(' | '));
 t('...ส่งสำเร็จแล้วตะกร้าและร่างถูกล้างตามปกติ',silent.cart===0&&silent.draft===0,
   'ตะกร้า '+silent.cart+' · ร่าง '+silent.draft);
 t('...และหน้าจอบันทึกว่าส่งแล้ว 17 รายการ',silent.stored===17,silent.stored);

 /* ---------- 4) ต่ออายุไม่ได้ → ขอรหัสผ่านแล้วส่งต่อ ---------- */
 const askd=await ev(async a=>{
   TOKEN=a.OLD;window.__accept=a.FRESH;window.__renewOK=false;   /* ต่ออายุไม่ผ่าน */
   window.__calls=[];window.__alerts=[];window.__saved=null;
   REQUESTS={data:{}};REQ.date='2026-10-27';REQ.cart={};
   Object.keys(MASTER.items).slice(0,17).forEach((c,i)=>{REQ.cart[c]={cs:i+1,pc:0};});
   reqDraftSave();
   const p=submitRequest();                 /* ค้างรออยู่ที่กล่องรหัสผ่าน */
   await new Promise(r=>setTimeout(r,80));
   return {p:!!p,shown:!document.getElementById('reauthModal').classList.contains('hidden'),
     who:document.getElementById('reauthWho').textContent,
     txt:document.getElementById('reauthModal').innerText.replace(/\s+/g,' '),
     cart:Object.keys(REQ.cart).length,draft:reqDraftCount('2026-10-27')};
 },ARG);
 t('ต่ออายุไม่ได้ → ขึ้นกล่องใส่รหัสผ่านตรงนั้น ไม่เด้งออกจากระบบ',askd.shown,'ขึ้น='+askd.shown);
 t('...บอกชื่อผู้ใช้ให้เห็น และบอกว่าของที่คีย์ไว้ยังอยู่',
   /เกษชญานิษฐ์/.test(askd.who)&&/ยังอยู่ครบ/.test(askd.txt),askd.who+' | '+askd.txt.slice(0,90));
 t('...ระหว่างรอ ตะกร้า 17 รายการและร่างยังอยู่ครบ',askd.cart===17&&askd.draft===17,
   'ตะกร้า '+askd.cart+' · ร่าง '+askd.draft);

 const wrong=await ev(async()=>{
   document.getElementById('reauthPass').value='รหัสผิด';
   await bdReauthGo();await new Promise(r=>setTimeout(r,50));
   return {shown:!document.getElementById('reauthModal').classList.contains('hidden'),
     err:document.getElementById('reauthErr').textContent};});
 t('ใส่รหัสผ่านผิด → บอกว่าผิดและยังอยู่ในกล่องเดิม ไม่หลุดออกไป',
   wrong.shown&&/ไม่ถูกต้อง/.test(wrong.err),wrong.err);

 const right=await ev(async a=>{
   document.getElementById('reauthPass').value=window.__pass;
   await bdReauthGo();await new Promise(r=>setTimeout(r,120));
   return {shown:!document.getElementById('reauthModal').classList.contains('hidden'),
     saved:window.__saved?Object.keys(window.__saved.items||{}).length:0,
     tok:TOKEN===a.AFTER,cart:Object.keys(REQ.cart).length,draft:reqDraftCount('2026-10-27'),
     calls:window.__calls.map(c=>c.u).join(' → '),
     closed:document.getElementById('reqModal').classList.contains('hidden'),
     user:JSON.stringify(S.user),alerts:window.__alerts};},ARG);
 t('🔧 ใส่รหัสผ่านถูก → ส่งคำขอ 17 รายการต่อให้เอง ไม่ต้องคีย์ใหม่',right.saved===17,
   'ส่งถึงเซิร์ฟเวอร์ '+right.saved+' รายการ');
 t('...ลำดับ: ส่ง → ต่ออายุ(ไม่ผ่าน) → ล็อกอิน(ผิด) → ล็อกอิน(ถูก) → ส่งอีกครั้ง',
   right.calls==='/api/request → /api/renew → /api/login → /api/login → /api/request',right.calls);
 t('...เก็บ token ใหม่ และยังเป็นบัญชีเดิม (สาย 2096_97)',
   right.tok&&/2096_97/.test(right.user)&&/sales/.test(right.user),right.user);
 t('...กล่องรหัสผ่านปิด ตะกร้าถูกล้าง ร่างถูกล้าง เพราะส่งสำเร็จจริง',
   !right.shown&&right.cart===0&&right.draft===0,'ตะกร้า '+right.cart+' · ร่าง '+right.draft);
 t('...ไม่มีข้อความ error ค้างให้คนใช้สับสน',right.alerts.length===0,right.alerts.join(' | '));

 /* ---------- 5) กดยกเลิก = ของต้องไม่หาย ---------- */
 const cancel=await ev(async a=>{
   TOKEN=a.OLD;window.__accept=a.FRESH;window.__renewOK=false;
   window.__calls=[];window.__alerts=[];window.__saved=null;
   REQUESTS={data:{}};REQ.date='2026-10-27';REQ.cart={};
   Object.keys(MASTER.items).slice(0,17).forEach((c,i)=>{REQ.cart[c]={cs:i+1,pc:0};});
   reqDraftSave();
   document.getElementById('reqModal').classList.remove('hidden');   /* เหมือนตอนกดส่งจริง */
   const p=submitRequest();
   await new Promise(r=>setTimeout(r,80));
   bdReauthClose(false);                     /* กดยกเลิก */
   await p;await new Promise(r=>setTimeout(r,50));
   return {cart:Object.keys(REQ.cart).length,draft:reqDraftCount('2026-10-27'),
     alerts:window.__alerts,saved:window.__saved,
     open:!document.getElementById('reqModal').classList.contains('hidden'),
     stored:Object.keys(((REQUESTS.data||{})['2026-10-27']||{}))};},ARG);
 t('🛟 กดยกเลิกกล่องรหัสผ่าน → ของที่คีย์ไว้ 17 ตัวยังอยู่ครบ',
   cancel.cart===17&&cancel.draft===17,'ตะกร้า '+cancel.cart+' · ร่าง '+cancel.draft);
 t('🛟 ...และไม่มีอะไรถูกบันทึกทั้งบนจอและบนเซิร์ฟเวอร์ (ไม่โชว์ว่าส่งแล้วทั้งที่ยังไม่ส่ง)',
   !cancel.saved&&cancel.stored.length===0,JSON.stringify(cancel.stored));
 t('...ข้อความที่ขึ้นบอกวิธีแก้แบบทำตามได้ ไม่ใช่คำว่า unauthorized เฉย ๆ',
   cancel.alerts.length===1&&/ล็อกอินหมดอายุ/.test(cancel.alerts[0])&&
   /ใส่รหัสผ่าน/.test(cancel.alerts[0])&&!/unauthorized/.test(cancel.alerts[0]),
   cancel.alerts.join(' | '));
 t('...หน้าต่างสั่งของไม่ปิดหนีไป กดส่งซ้ำได้เลย',cancel.open,'เปิดอยู่='+cancel.open);

 /* ---------- 6) ไม่ส่งซ้ำซ้อน ---------- */
 const dup=await ev(async a=>{
   TOKEN=a.OLD;window.__accept=a.FRESH;window.__renewOK=true;
   window.__calls=[];window.__saved=null;REQUESTS={data:{}};
   REQ.date='2026-10-27';REQ.cart={};REQ.cart['70001000']={cs:3,pc:0};
   await submitRequest();
   const reqs=window.__calls.filter(c=>c.u.indexOf('/api/request')>=0);
   return {n:reqs.length,ok:reqs.filter(c=>c.tok===a.FRESH).length};},ARG);
 t('🛟 ส่งซ้ำแค่ครั้งเดียว (ครั้งที่ตายไม่นับ) คำขอจึงไม่เบิ้ล',dup.n===2&&dup.ok===1,
   'ยิง /api/request '+dup.n+' ครั้ง · สำเร็จ '+dup.ok+' ครั้ง');

 /* ---------- 7) เส้นทางอื่นของเซลล์ก็ต้องกู้คืนได้เหมือนกัน ---------- */
 const paths=await ev(()=>{
   const fns=['plPush','pjSaveVisit','pushRequest','ldSaveStatus','leadSetStatus']
     .filter(n=>typeof window[n]==='function').map(n=>({n:n,src:String(window[n])}));
   return {names:fns.map(f=>f.n),
     usesBdPost:fns.filter(f=>/bdPost\(/.test(f.src)).map(f=>f.n),
     rawFetch:fns.filter(f=>/fetch\(\s*["']\/api\//.test(f.src)).map(f=>f.n)};
 });
 t('ทุกเส้นทางที่เซลล์ "เขียน" ยิงผ่านตัวกู้คืนเดียวกัน (ปฏิทินงาน · งานค้างที่ร้าน · คำขอ)',
   paths.usesBdPost.length>=3&&paths.rawFetch.length===0,
   'ใช้ bdPost: '+paths.usesBdPost.join(', ')+' · ยังยิงเองดิบ ๆ: '+(paths.rawFetch.join(', ')||'ไม่มี'));

 const real=errs.filter(e=>!/localStorage|SecurityError/.test(e));
 t('ไม่มี JavaScript error ตลอดเทสต์',real.length===0,real.join(' | '));

 await b.close();
 let fail=0;
 A.forEach(([ok,n,x])=>{if(!ok)fail++;console.log((ok?'  ok  ':'  FAIL')+'  '+n+(x?'   ['+x+']':''));});
 console.log('\n'+A.length+' checks · '+(A.length-fail)+' passed · '+fail+' failed');
 console.log(fail?'SOME FAILED':'ALL PASS ('+A.length+' checks)');
 process.exit(fail?1:0);
})();
