/* 📱 หน้าเว็บต้องไม่กว้างเกินจอ — ไม่ว่าจะหมุนจอกี่รอบ
 *
 * เจ้าของเจอเอง 27 พ.ย. 69: *"ในมือถือพอพลิกเป็นแนวนอน แล้วกลับมาเป็นแนวตั้ง
 * มันกลายเป็นแบบนี้ ลองปรับแก้ไขหน่อย"* — ภาพที่ส่งมาคือการ์ดแคบ ๆ อยู่ชิดซ้าย
 * ส่วนกล่องกราฟยื่นกว้างกว่าทุกอย่าง และหัวเว็บโดนตัดหายไปทางซ้าย
 *
 * 🔎 ต้นเหตุไม่ใช่ Chart.js แต่เป็น CSS Grid: ช่องที่เขียนว่า `1fr` มีความกว้าง
 *    ต่ำสุดเป็น min-content อัตโนมัติ และ Chart.js เขียน `style.width` เป็น "พิกเซล"
 *    ลงบน canvas — พอหมุนกลับมาแนวตั้ง ค่าพิกเซลของจอแนวนอนยังค้างอยู่ ช่องกริดจึง
 *    หดต่ำกว่านั้นไม่ได้ หน้าเว็บกว้างเกินจอ และ Chart.js ก็ไม่ย่อลง เพราะกล่องแม่
 *    ไม่เคยแคบลง (ล็อกกันเองเป็นวงกลม)
 *    วัดก่อนแก้บนจอ 390px: กริดคำนวณออกมาเป็น 800px · document 814px
 *
 * 🎨 แถมเช็กโซนสีของหน้าออเดอร์พิเศษ (เจ้าของสั่งวันเดียวกัน) ว่าแต่ละขั้นได้สีของตัวเอง
 *    และไม่มีหน้าไหนทำให้จอล้นทั้งบนคอมและมือถือ
 *
 * ⛔ ตัวเลข/ชื่อร้านในไฟล์นี้สมมติขึ้นเอง — รีโปเป็นสาธารณะ
 * ต้องติดตั้งก่อน: npm i --no-save playwright-core
 */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');
const BROWSER=require('./_chrome.cjs').chromePath();
const ORIGIN='https://bd-layout.test/';
const B1='B20261118-01';

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const html=fs.readFileSync(PAGE,'utf8');
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);

 /* ---------- 1) หมุนจอ แนวตั้ง → แนวนอน → แนวตั้ง ---------- */
 {
  const ctx=await b.newContext({viewport:{width:390,height:760},timezoneId:'Asia/Bangkok'});
  const pg=await ctx.newPage();
  const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
  await pg.route(ORIGIN+'**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}));
  await pg.goto(ORIGIN,{waitUntil:'domcontentloaded'});
  await pg.evaluate(()=>{
    document.getElementById('login').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('salesView').classList.remove('hidden');
    window.ulog=()=>{};window.syncToServer=()=>{};
    S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
  });
  /* จำลองสิ่งที่ Chart.js ทิ้งไว้จริง ๆ ตอนจอแนวนอน: canvas ที่ถูกตั้งความกว้างเป็น px
     (โหลด Chart.js จาก CDN ในเครื่องเทสต์ไม่ได้ จึงใส่ค่าที่มันเขียนลงไปตรง ๆ) */
  const wide=await pg.evaluate(()=>{
    const cv=document.getElementById('chart');
    cv.style.display='block';cv.style.width='758px';cv.style.height='300px';
    cv.width=758;cv.height=300;
    const wrap=cv.parentElement;
    return {doc:document.documentElement.scrollWidth,win:innerWidth,
      cols:getComputedStyle(wrap.parentElement.parentElement).gridTemplateColumns,
      wrapW:Math.round(wrap.getBoundingClientRect().width)};});
  t('📱 canvas ที่ค้างความกว้างแนวนอนไว้ ต้องไม่ดันหน้าเว็บให้กว้างเกินจอ',
    wide.doc<=wide.win,'document '+wide.doc+' · จอ '+wide.win);
  t('...ช่องกริดต้องหดตามจอได้จริง (minmax(0,1fr) ไม่ใช่ 1fr)',
    parseFloat(wide.cols)<=wide.win,wide.cols);
  t('...กล่องกราฟแคบกว่าจอ ไม่ยื่นออกไป',wide.wrapW<wide.win,wide.wrapW+' / '+wide.win);

  /* หมุนจริง ๆ ไป-กลับ แล้ววัดซ้ำ */
  await pg.setViewportSize({width:844,height:390});await pg.waitForTimeout(150);
  const land=await pg.evaluate(()=>({doc:document.documentElement.scrollWidth,win:innerWidth}));
  t('📱 จอแนวนอนก็ไม่ล้น',land.doc<=land.win,land.doc+' / '+land.win);
  await pg.setViewportSize({width:390,height:760});await pg.waitForTimeout(250);
  const back=await pg.evaluate(()=>({doc:document.documentElement.scrollWidth,win:innerWidth,
    reflow:typeof bdReflow==='function'}));
  t('📱 หมุนกลับมาแนวตั้งแล้วหน้าเว็บกลับมาพอดีจอ',back.doc<=back.win,back.doc+' / '+back.win);
  t('...มีตัวสั่งให้กราฟวัดกล่องใหม่ตอนหมุนจอ (bdReflow) เป็นชั้นกันเหนียว',back.reflow);
  /* บันทึกไว้ในกฎ: canvas ทุกตัวต้องกว้างไม่เกินกล่องของมัน */
  const guard=await pg.evaluate(()=>{
    const cv=document.getElementById('chart');
    return getComputedStyle(cv).maxWidth;});
  t('...canvas ทุกตัวมีเพดานกว้างไม่เกินกล่อง (กันกริดที่เขียน inline style ไว้)',
    guard==='100%'||/px$/.test(guard),guard);
  t('ไม่มี error ตอนหมุนจอ',errs.length===0,errs.join(' | '));
  await ctx.close();
 }

 /* ---------- 2) โซนสีของหน้าออเดอร์พิเศษ ---------- */
 const SEED=`
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};window.bumSiteOk=()=>true;
  window.ulog=()=>{};window.syncToServer=()=>{};window.alert=()=>{};window.confirm=()=>true;
  TOKEN='t';window.bdPost=()=>Promise.resolve({ok:true,json:()=>Promise.resolve({ok:true})});
  DATA.lines={};Object.keys(FOCUS_MAP).forEach(c=>{DATA.lines[c]={display:FOCUS_MAP[c],
    type:FOCUS_MAP[c].indexOf('KA')===0?'KA':'CT',focus:true,name:'',emp:''};});
  DATA.daily={};DATA.targets={};DATA.monthly={'2026-11':{}};
  MASTER={items:{'10000001':'สินค้าทดสอบ ก 4x3x320มล','10000002':'สินค้าทดสอบ ข 8X450มล'},det:{},up:1};
  CSTOCK={lots:{},del:{},slips:{},sdel:{},ex:{},sub:{},subdel:{},key:{},gin:{},rep:{},up:0};
  CSTOCK.slips['${B1}']={d:'2026-11-18',by:'admin1',byName:'แอดมิน 1',at:1,up:1,g:'D'};
  ['10000001','10000002'].forEach((c,i)=>{CSTOCK.lots['L'+i]={id:'L'+i,sl:'${B1}',d:'2026-11-18',
    code:c,nm:MASTER.items[c],cs:[60,30][i],pc:0,ln:'CT11',own:'ซุป',clr:[],at:1};});
  CSTOCK.key['${B1}|2026-11-18|CT11']={at:2,by:'sup',byName:'ซุป',it:{'10000001':{sc:20,sp:0}}};
  CSTOCK.rep['${B1}|2026-11-18|CT11']={at:3,by:'209611',byName:'CT11',n:1,h:[],
    it:{'10000001':{cs:20,pc:0}},no:['BDD0100000006']};
  STOREDAILY={data:{},ord:{'BDD0100000006':{s:'9000001',l:'209611',d:'2026-11-18',v:100,c:2,cs:5,pc:0}}};
  PJP={out:{'9000001':{n:'ร้านทดสอบ',rt:'209611'}},plan:{},done:{},cfg:{}};
  S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
  try{localStorage.setItem('bdsp:manager','1');}catch(e){}
  SP={sid:'${B1}',q:'',busy:0,view:'slip',ym:'2026-11',sec:'',day:'2026-11-18',gin:'',cm:'2026-11'};
  _switchTab('spord');
 `;
 for(const [w,h,dev] of [[1280,950,'คอม'],[390,780,'มือถือ']]){
  const ctx=await b.newContext({viewport:{width:w,height:h},timezoneId:'Asia/Bangkok'});
  const pg=await ctx.newPage();
  const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
  await pg.route(ORIGIN+'**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}));
  await pg.goto(ORIGIN,{waitUntil:'domcontentloaded'});
  await pg.evaluate(SEED);
  const got=await pg.evaluate(()=>{
    const o={};
    ['key','rep','adm','out','rpt'].forEach(s=>{
      SP.sec=s;SP.day='2026-11-18';SP.view='slip';renderSpord();
      const z=document.querySelector('#spBody .sp-zone');
      o[s]={cls:z?z.className:'',
        /* สีหลักของโซน อ่านจากตัวแปร CSS ที่กฎทั้งหมดอ้างถึง */
        z:z?getComputedStyle(z).getPropertyValue('--z').trim():'',
        doc:document.documentElement.scrollWidth,win:innerWidth};
    });
    SP.sec='key';renderSpord();
    const chips=[...document.querySelectorAll('#spTabs .tab2')].map(x=>
      (String(x.className).match(/spz-\w+/)||[''])[0]);
    o.chips=chips.join(',');
    /* 🔎 กางเลขออเดอร์ของสายหนึ่งในตารางติดตาม (เจ้าของสั่ง 29 พ.ย. 69) — ตารางซ้อนในตาราง
       ต้องไม่ดันหน้าเว็บให้กว้างเกินจอ โดยเฉพาะบนมือถือ */
    SP.sec='rep';SP.trk={CT11:true};renderSpord();
    const row=document.getElementById('sptrk-CT11');
    o.trk={has:!!row,open:!!(row&&!row.classList.contains('hidden')),
      doc:document.documentElement.scrollWidth,win:innerWidth,
      btn:!!document.querySelector('.sp-trkb')};
    return o;});
  const pre=dev+': ';
  t(pre+'🎨 ทุกขั้นงานถูกครอบด้วยโซนสีของตัวเอง',
    ['key','rep','adm','out','rpt'].every(s=>/sp-zone/.test(got[s].cls)&&/spz-/.test(got[s].cls)),
    JSON.stringify(['key','rep','adm','out','rpt'].map(s=>got[s].cls)));
  t(pre+'🎨 ...และสีของแต่ละขั้นต้องไม่ซ้ำกัน (ซุปจด/เซลล์คีย์/แอดมินตรวจ/คลังจัดส่ง)',
    new Set(['key','rep','adm','out'].map(s=>got[s].z)).size===4,
    ['key','rep','adm','out'].map(s=>s+'='+got[s].z).join(' '));
  t(pre+'🎨 ชิปเลือกขั้นด้านบนใช้สีประจำขั้นเหมือนกัน',
    /spz-key/.test(got.chips)&&/spz-rep/.test(got.chips)&&/spz-adm/.test(got.chips),got.chips);
  t(pre+'📱 ไม่มีหน้าไหนของออเดอร์พิเศษทำให้จอล้นแนวนอน',
    ['key','rep','adm','out','rpt'].every(s=>got[s].doc<=got[s].win),
    ['key','rep','adm','out','rpt'].map(s=>s+':'+got[s].doc+'/'+got[s].win).join(' '));
  t(pre+'🔎 กางเลขออเดอร์ของสายในตารางติดตามแล้ว หน้าเว็บยังไม่กว้างเกินจอ',
    got.trk.has&&got.trk.open&&got.trk.btn&&got.trk.doc<=got.trk.win,
    JSON.stringify(got.trk));
  t(pre+'ไม่มี error ในหน้าเว็บ',errs.length===0,errs.join(' | '));
  await ctx.close();
 }

 /* ---------- 3) แถวแท็บต้องกดได้ครบทุกปุ่ม ไม่มีอะไรเลยขอบขวา ----------
    เจ้าของแจ้ง 29 พ.ย. 69 ว่าแอดมินเปิดเว็บหลักในคอมวินโดวส์แล้วหัวข้อยังเป็นแถวเดิม
    และกดหมวดขวา ๆ ไม่ได้: *"ส่วนใหญ่เค้าใช้วินโดวส์ไม่มีแทร็กแพด เขาเลื่อนซ้ายขวา
    เหมือนที่ผมใช้ไม่ได้ ผมใช้แมค M1"*
    สองเหตุแยกกัน และเช็กทั้งสอง:
      ① ประตูวันที่ — แอดมิน 1-4 เป็น role manager แต่ id ไม่ใช่ `manager` จึงไม่ได้ปุ่มใหญ่
      ② CSS — `overflow-x:auto` + ซ่อนแถบเลื่อน = เมาส์ธรรมดาเลื่อนไม่ได้เลย
    วัดจริง: ทุกปุ่มต้องอยู่ในกรอบแถว (ไม่มีปุ่มไหน right เลยขอบ) และ `elementFromPoint`
    กลางปุ่มสุดท้ายต้องได้ปุ่มนั้น ไม่ใช่สิ่งที่อยู่ข้างหลัง */
 {
  const WHO={
    owner:{id:'manager',role:'manager',name:'ผู้จัดการ'},
    admin:{id:'admin1', role:'manager',name:'แอดมิน 1'},
    sales:{id:'209611', role:'sales',  name:'CT11',code:'2096_11'}};
  for(const [w,h,dev] of [[1280,950,'คอม 1280'],[1100,820,'คอมแคบ 1100'],[390,780,'มือถือ 390']]){
   const ctx=await b.newContext({viewport:{width:w,height:h},timezoneId:'Asia/Bangkok'});
   const pg=await ctx.newPage();
   const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
   await pg.route(ORIGIN+'**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}));
   await pg.goto(ORIGIN,{waitUntil:'domcontentloaded'});
   const got=await pg.evaluate(W=>{
     document.getElementById('login').classList.add('hidden');
     document.getElementById('app').classList.remove('hidden');
     window.ulog=()=>{};window.syncToServer=()=>{};window.plBadge=()=>{};
     const out={};
     Object.keys(W).forEach(k=>{
       S.user=W[k];CURTAB='sales';renderTabs();
       const rows={};
       [['sup','tabSup'],['top','tabTop'],['sub','tabSub']].forEach(([nm,id])=>{
         const el=document.getElementById(id);
         const btns=el?[...el.children]:[];
         if(!el||!btns.length||getComputedStyle(el).display==='none'){rows[nm]={n:0};return;}
         const R=el.getBoundingClientRect(),cs=getComputedStyle(el);
         /* ปุ่มที่ยื่นเลยขอบขวาของแถว = มองไม่เห็น/กดไม่โดนบนคอมวินโดวส์ */
         const over=btns.filter(x=>x.getBoundingClientRect().right>R.right+1).length;
         /* กี่บรรทัด — ถ้าตกบรรทัดจริงจะมีค่า top หลายค่า */
         const lines=new Set(btns.map(x=>Math.round(x.getBoundingClientRect().top))).size;
         const last=btns[btns.length-1].getBoundingClientRect();
         const hit=document.elementFromPoint(Math.round(last.left+last.width/2),
                                             Math.round(last.top+last.height/2));
         rows[nm]={n:btns.length,over:over,lines:lines,
           clip:el.scrollWidth-el.clientWidth,ox:cs.overflowX,
           hit:!!(hit&&(hit===btns[btns.length-1]||btns[btns.length-1].contains(hit))),
           hitTag:hit?(hit.tagName+'.'+String(hit.className).slice(0,22)):'-'};
       });
       out[k]={rows:rows,doc:document.documentElement.scrollWidth,win:innerWidth};
     });
     return out;},WHO);
   const pre=dev+': ';
   ['owner','admin','sales'].forEach(k=>{
     const g=got[k],names={owner:'เจ้าของ',admin:'แอดมิน 1',sales:'เซลล์ CT11'};
     const live=Object.keys(g.rows).filter(r=>g.rows[r].n);
     t(pre+'🖱 '+names[k]+' — ทุกปุ่มหมวดอยู่ในกรอบ ไม่มีปุ่มไหนเลยขอบขวา',
       live.every(r=>g.rows[r].over===0),
       live.map(r=>r+':'+g.rows[r].over+'/'+g.rows[r].n+' ปุ่ม '+g.rows[r].lines+' บรรทัด').join(' · '));
     t(pre+'...แถวแท็บไม่ได้ซ่อนเนื้อหาไว้ด้านข้าง (ไม่ใช่ overflow-x:auto)',
       live.every(r=>g.rows[r].clip<=1&&g.rows[r].ox!=='auto'&&g.rows[r].ox!=='scroll'),
       live.map(r=>r+':clip '+g.rows[r].clip+' ox='+g.rows[r].ox).join(' · '));
     t(pre+'...กดปุ่มหมวดสุดท้ายโดนจริง (elementFromPoint)',
       live.every(r=>g.rows[r].hit),
       live.map(r=>r+':'+(g.rows[r].hit?'ok':g.rows[r].hitTag)).join(' · '));
     t(pre+'...หน้าเว็บไม่กว้างเกินจอ',g.doc<=g.win,g.doc+'/'+g.win);
   });
   /* ประตูวันที่: แอดมินต้องได้ปุ่มใหญ่เหมือนเจ้าของ (ไม่ต้องรอ 1 ธ.ค.) */
   t(pre+'🗂 แอดมิน 1 เห็นปุ่มใหญ่ 4 ปุ่มเหมือนเจ้าของ (ไม่ติดประตูวันที่)',
     got.admin.rows.sup.n>=2&&got.admin.rows.sup.n===got.owner.rows.sup.n,
     'แอดมิน '+got.admin.rows.sup.n+' · เจ้าของ '+got.owner.rows.sup.n);
   /* ฝั่งเซลล์ยังเป็นแถวแบนราบถึง 1 ธ.ค. ตามที่เจ้าของสั่งเอง — แต่ต้องตกบรรทัด ไม่ใช่ถูกตัด */
   t(pre+'⏳ เซลล์ยังเห็นแถวหมวดแบบเดิม (รอ 1 ธ.ค.) แต่ขึ้นครบทุกหมวด',
     !got.sales.rows.sup.n&&got.sales.rows.top.n>=8&&got.sales.rows.top.over===0,
     'ปุ่มใหญ่ '+got.sales.rows.sup.n+' · หมวด '+got.sales.rows.top.n+
     ' ปุ่ม '+got.sales.rows.top.lines+' บรรทัด · เลยขอบ '+got.sales.rows.top.over);
   t(pre+'ไม่มี error ตอนวาดแถบแท็บ',errs.length===0,errs.join(' | '));
   await ctx.close();
  }
 }

 await b.close();
 let bad=0;A.forEach(([ok,n,x])=>{if(!ok)bad++;console.log((ok?'  ✓ ':'  ✗ FAIL: ')+n+(x?' → '+x:''));});
 console.log(bad?('\n'+bad+' FAILED of '+A.length):('\nALL PASS ('+A.length+' checks)'));
 process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
