/* ◀ ▶ ปุ่มเลื่อนวัน/รอบ/เดือน — เจ้าของชอบของในหน้า PJP เลยเอามาใช้ทุกหน้า (12 ต.ค. 69)
   สิ่งที่ต้องพิสูจน์
     1. ทุกหน้าที่เลือกวัน/รอบ/เดือน มีปุ่ม ◀ ▶ ครบ
     2. ◀ ไปอันที่ "เก่ากว่า" · ▶ ไปอันที่ "ใหม่กว่า" เสมอ แม้ dropdown จะเรียงใหม่→เก่า
     3. สุดทางแล้วหยุด ไม่วนกลับ ไม่พัง
     4. ⚠️ ไม่แตะข้อมูลเลย — ก้อนข้อมูลทุกก้อนต้องเหมือนเดิมเป๊ะหลังกดทุกปุ่ม

   ต้องติดตั้งก่อน (ไม่ได้อยู่ใน package.json เพราะใช้เฉพาะตอนเทสต์):
     npm i --no-save playwright-core
   แล้วรัน:  node build.cjs && node test/browser/datestep.test.cjs   */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const BROWSER=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ROOT=path.resolve(__dirname,'..','..');

/* ทุกก้อนที่ถือข้อมูลจริง — ต้องไม่ขยับแม้แต่ไบต์เดียวตลอดการทดสอบ */
const BLOBS=`JSON.stringify({DATA,ORDERS,POSTATUS,REQUESTS,STOCKD,STORE,STOREPROD,PSTORE,
  KPI,EB2B,PLAN,PROMO,PJP,ANALYTICS,MASTER,MINSTOCK,DCI,LEADS})`;

const boot=`
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){},update(){},resize(){}}};
  window.alert=m=>(window.__alerts=window.__alerts||[]).push(String(m));
  window.confirm=()=>true;window.ulog=()=>{};
  window.fetch=()=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({})});
  window.syncToServer=()=>{window.__sync=(window.__sync||0)+1};
  window.TOKEN=null;window.todayISO=()=>'2026-10-12';
  S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};

  DATA.lines={'209611':{display:'CT11',name:'ก'},'209612':{display:'CT12',name:'ข'}};
  DATA.focus_order=['209611','209612'];
  DATA.monthly={'2026-07':{'209611':{niv:70,tgt:100}},'2026-08':{'209611':{niv:80,tgt:100}},
                '2026-09':{'209611':{niv:90,tgt:100}},'2026-10':{'209611':{niv:40,tgt:100}}};
  DATA.daily={'2026-10-05':{'209611':{niv:5,tgt:10}},'2026-10-06':{'209611':{niv:6,tgt:10}},
              '2026-10-07':{'209611':{niv:7,tgt:10}},'2026-10-08':{'209611':{niv:8,tgt:10}}};

  /* KPI — คีย์เป็นวันที่ "ณ วันที่" ของไฟล์ */
  KPI={workdays:26,lines:{'209611':'CT11'},meta:{},del:{},data:{
    '2026-09-30':{'209611':{stores:100,active:40,orders:50,self:20,ghost:5}},
    '2026-10-07':{'209611':{stores:100,active:45,orders:55,self:25,ghost:4}}}};

  /* Perfect Store — 2 รอบ */
  PSTORE={rounds:{
    '2026-08-31':{asof:'2026-08-31',bm:8,up:1,rows:[['CT_HPC_211','2493638','ร้าน ก','F',0,'R','G','R',3,2,'Drive IQ | Drive AO & SO',0.01]]},
    '2026-09-30':{asof:'2026-09-30',bm:9,up:2,rows:[['CT_HPC_211','2493638','ร้าน ก','F',1,'G','G','G',4,0,'',0.02]]}}};

  /* ใบสั่ง + สถานะสินค้า (POSTATUS) 3 รอบ */
  ORDERS={dates:['2026-10-01','2026-10-05','2026-10-09'],names:{'1001':'บรีส'},cat:{},catN:{},data:{
    '2026-10-01':{'209611':{'1001':{o:10,p:10,q:0}}},
    '2026-10-05':{'209611':{'1001':{o:12,p:12,q:0}}},
    '2026-10-09':{'209611':{'1001':{o:8,p:4,q:4}}}}};
  POSTATUS={dates:['2026-10-01','2026-10-05','2026-10-09'],data:{
    '2026-10-01':{file:'a.xlsx',allSeq:1,all:[['1001','บรีส',0,0,'ผงซักฟอก']],promo:[],closed:[],stop:[],newc:[],quota:[]},
    '2026-10-05':{file:'b.xlsx',allSeq:1,all:[['1001','บรีส',0,0,'ผงซักฟอก']],promo:[],closed:[],stop:[],newc:[],quota:[]},
    '2026-10-09':{file:'c.xlsx',allSeq:1,all:[['1001','บรีส',0,0,'ผงซักฟอก']],promo:[],closed:[],stop:[],newc:[],quota:[]}}};
  REQUESTS={data:{}};
  STOCKD={date:'2026-10-09',rows:[],names:{}};
  STORE={months:['2026-08','2026-09'],stores:[]};STOREPROD={stores:{}};
  EB2B={asof:null,up:0,lines:{},data:{}};
  MASTER={items:{}};MINSTOCK={man:{}};DCI={periods:{}};LEADS={meta:{},sales:{},del:{}};
  PLAN={items:{},done:{},del:{}};
  PJP={out:{'2493638':{n:'ร้าน ก',up:1}},done:{},cfg:{},plan:{
    '2026-10-05':{'209611':'2493638:1'},'2026-10-06':{'209611':'2493638:1'},
    '2026-10-07':{'209611':'2493638:1'}}};

  /* วิเคราะห์เชิงลึก — 3 เดือน */
  ANALYTICS={months:['2026-08','2026-09','2026-10'],lines:{'209611':'CT11'},data:{
    '2026-08':{'209611':[['HPC','ผงซักฟอก','บรีส','1001','บรีสถุง',10,1000]]},
    '2026-09':{'209611':[['HPC','ผงซักฟอก','บรีส','1001','บรีสถุง',12,1200]]},
    '2026-10':{'209611':[['HPC','ผงซักฟอก','บรีส','1001','บรีสถุง',14,1400]]}}};

  /* โปรโมชั่น — 3 เดือน */
  PROMO={items:{
    p8:{m:'2026-08',type:'combo',name:'โปร ส.ค.',tgtPct:30,by:'manager',at:1,up:1},
    p9:{m:'2026-09',type:'combo',name:'โปร ก.ย.',tgtPct:30,by:'manager',at:2,up:2},
    p10:{m:'2026-10',type:'combo',name:'โปร ต.ค.',tgtPct:30,by:'manager',at:3,up:3}},res:{},del:{}};

  document.querySelectorAll('.admin-upload').forEach(e=>e.style.display='');
  /* เรียก init ชุดเดียวกับที่แอพจริงเรียกหลังโหลดข้อมูลเสร็จ ไม่งั้นช่องเลือกยังว่าง */
  navReset();initKeys();initKPI();initOrder();initPromo();initAnalytics();initPjp();
  ['sales','kpi','ps','order','pos','ana','promo','promores','pjp'].forEach(k=>{_switchTab(k);});
  _switchTab('sales');
`;

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const pg=await (await b.newContext({viewport:{width:1400,height:1000}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.setContent(fs.readFileSync(path.join(ROOT,'public','index.html'),'utf8'),{waitUntil:'domcontentloaded'});
 await pg.evaluate(boot);
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);

 const before=await ev(new Function('return '+BLOBS));

 /* ---------- 1) ฟังก์ชันกลางทำงานถูกทาง ---------- */
 const unit=await ev(()=>{
   const d=document.createElement('div');d.innerHTML=
     '<select id="__t1"><option>a</option><option>b</option><option>c</option></select>'+
     '<select id="__t2" data-rev="1"><option>c</option><option>b</option><option>a</option></select>'+
     '<select id="__t3"><option>only</option></select>';
   document.body.appendChild(d);
   const v=id=>document.getElementById(id).value;
   const fired=[];
   document.getElementById('__t1').addEventListener('change',()=>fired.push('t1'));
   const r={};
   /* เรียงเก่า→ใหม่: ◀ ต้องถอยลง index */
   document.getElementById('__t1').selectedIndex=1;
   selStep('__t1',-1);r.fwdBack=v('__t1');
   selStep('__t1',1);selStep('__t1',1);r.fwdFwd=v('__t1');
   selStep('__t1',1);r.fwdClamp=v('__t1');
   selStep('__t1',-1);selStep('__t1',-1);selStep('__t1',-1);r.fwdClampBack=v('__t1');
   /* เรียงใหม่→เก่า (data-rev): ◀ ต้องเพิ่ม index */
   document.getElementById('__t2').selectedIndex=1;
   selStep('__t2',-1);r.revBack=v('__t2');
   selStep('__t2',1);selStep('__t2',1);r.revFwd=v('__t2');
   selStep('__t2',1);r.revClamp=v('__t2');
   /* ตัวเลือกเดียว / ไม่มีตัวนั้นเลย ต้องไม่พัง */
   selStep('__t3',1);selStep('__t3',-1);r.one=v('__t3');
   selStep('__ไม่มีจริง',1);r.missing='ok';
   r.fired=fired.length;
   d.remove();
   return r;
 });
 t('รายการเรียงเก่า→ใหม่: ◀ ได้อันเก่ากว่า',unit.fwdBack==='a',unit.fwdBack);
 t('...▶ ได้อันใหม่กว่า',unit.fwdFwd==='c',unit.fwdFwd);
 t('...สุดทางแล้วหยุด ไม่วนกลับ',unit.fwdClamp==='c',unit.fwdClamp);
 t('...ต้นทางก็หยุด',unit.fwdClampBack==='a',unit.fwdClampBack);
 t('⚠️ รายการเรียงใหม่→เก่า (data-rev): ◀ ยังได้อันเก่ากว่าเหมือนเดิม',unit.revBack==='a',unit.revBack);
 t('...▶ ได้อันใหม่กว่า',unit.revFwd==='c',unit.revFwd);
 t('...สุดทางแล้วหยุด',unit.revClamp==='c',unit.revClamp);
 t('มีตัวเลือกเดียว กดแล้วไม่พัง',unit.one==='only');
 t('ไม่มี select ตัวนั้น กดแล้วไม่พัง',unit.missing==='ok');
 t('กดแล้วยิง event change ให้ onchange เดิมทำงาน (ไม่เขียนตรรกะซ้ำ)',unit.fired===5,unit.fired);

 /* ---------- 2) ทุกหน้ามีปุ่มครบ แล้วกดแล้วค่าขยับจริง ---------- */
 /* [ชื่อหน้า, แท็บ, ตัวเลือกที่ใช้อ่านค่า, ฟังก์ชันเตรียมหน้า] */
 const PAGES=[
   ['ภาพรวมยอดขาย · รายวัน','sales',null,`S.period='daily';initKeys();render();`,()=>S.key],
   ['ภาพรวมยอดขาย · รายเดือน','sales','keySel',`S.period='monthly';initKeys();render();`,null],
   ['KPI','kpi','kpiMonth','',null],
   ['⭐ Perfect Store','ps','psRound','',null],
   ['การสั่งของ · วันสั่ง','order',null,'',()=>ORD.date],
   ['วิเคราะห์การสั่งของ · รอบใบสั่ง','pos','posDate','',null],
   ['วิเคราะห์เชิงลึก · ช่วงเวลา','ana','anaPeriod','',null],
   ['โปรโมชั่น · เดือน','promo','pmMonth','',null],
   ['ผลโปรโมชั่น · เดือน','promores','prMonth','',null],
   /* 💰 แคตาลอคราคา — รายการรอบเรียงเก่า→ใหม่ (Sep→Dec) จึงไม่ติดธง data-rev
      ต้องใส่ข้อมูลราคาปลอมก่อน ไม่งั้น renderPrice วาดแค่ข้อความ "ยังไม่มีไฟล์ราคา" แล้วไม่มีปุ่ม */
   ['แคตาลอคราคา · รอบราคา','price','prRoundSel',`PRICE.loaded=true;PRICE.err='';PRICE.hs={rounds:["Sep'26","Oct'26","Nov'26","Dec'26"],up:1,items:{'64766471':{n:'BREEZE NM STD',v:'บรีสเพาเวอร์',b:'BREEZE',c:'FAB SOL',s:'2250G',p:6,ip:0,cp:199,nt:'',m:[[1080,1102,223.18,0,152.8,153,199,0,''],[1080,1102,223.18,0,152.8,153,199,0,''],[1080,1102,223.18,0,152.8,153,199,0,''],[1080,1102,223.18,0,152.8,153,199,0,'']]}}};PRV={i:null,q:'',cat:'all',view:'pct',hide:true};renderPrice();`,null],
 ];
 for(const [nm,tab,selId,prep,getter] of PAGES){
   const r=await ev(a=>{
     _switchTab(a.tab);
     if(a.prep)eval(a.prep);
     const view=document.getElementById(a.tab+'View');
     const btns=[...view.querySelectorAll('.dstep-b')];
     const val=()=>a.selId?(document.getElementById(a.selId)||{}).value:eval('('+a.getter+')()');
     const back=btns.filter(x=>x.innerText.trim()==='◀');
     const fwd=btns.filter(x=>x.innerText.trim()==='▶');
     if(!back.length||!fwd.length)return {pair:false,n:btns.length};
     /* เริ่มจากอันใหม่สุด: กด ◀ ต้องได้อันเก่ากว่า แล้ว ▶ ต้องกลับมาที่เดิม */
     const v0=val();
     back[0].click();const v1=val();
     fwd[0].click();const v2=val();
     /* ไล่ ◀ จนสุด แล้วกดต่ออีกต้องไม่ขยับ */
     for(let i=0;i<12;i++)back[0].click();
     const vMin=val();back[0].click();const vMinAgain=val();
     for(let i=0;i<12;i++)fwd[0].click();
     const vMax=val();fwd[0].click();const vMaxAgain=val();
     return {pair:true,v0,v1,v2,vMin,vMinAgain,vMax,vMaxAgain};
   },{tab,selId,prep,getter:getter?String(getter):'()=>null'});
   t(nm+' — มีปุ่ม ◀ ▶',r.pair,JSON.stringify(r));
   if(!r.pair)continue;
   t(nm+' — ◀ แล้วค่าเปลี่ยนไปอันเก่ากว่า',r.v1&&r.v1<r.v0,r.v0+' → '+r.v1);
   t(nm+' — ▶ แล้วกลับมาที่เดิม',r.v2===r.v0,r.v2+' vs '+r.v0);
   t(nm+' — ไล่ ◀ จนสุดแล้วหยุด ไม่วนกลับ',r.vMin===r.vMinAgain,r.vMin+' / '+r.vMinAgain);
   t(nm+' — ไล่ ▶ จนสุดแล้วหยุด',r.vMax===r.vMaxAgain,r.vMax+' / '+r.vMaxAgain);
   t(nm+' — เก่าสุดต้องน้อยกว่าใหม่สุดจริง (ไม่ใช่ค้างที่เดิม)',r.vMin<r.vMax,r.vMin+' .. '+r.vMax);
 }

 /* ---------- 3) ไตรมาส: รายการเรียงเก่า→ใหม่ ปุ่มต้องกลับทางให้เอง ---------- */
 const q=await ev(()=>{
   _switchTab('sales');S.period='quarter';initKeys();render();
   const sel=document.getElementById('keySel');
   const opts=[...sel.options].map(o=>o.value);
   if(opts.length<2)return {skip:true,opts:opts};
   sel.selectedIndex=opts.length-1;                    /* ไตรมาสใหม่สุดอยู่ท้ายรายการ */
   const v0=sel.value;
   keyStep(-1);const v1=sel.value;
   keyStep(1);const v2=sel.value;
   const rev=!!sel.dataset.rev;                        /* ต้องอ่านก่อนสลับช่วงกลับ */
   S.period='daily';initKeys();render();
   return {skip:false,rev,v0,v1,v2,opts};
 });
 t('ไตรมาสเรียงเก่า→ใหม่ จึงไม่ติดธง data-rev',q.skip||!q.rev,JSON.stringify(q));
 t('⚠️ ◀ ที่หน้าไตรมาสก็ยังได้ไตรมาสก่อนหน้า (ไม่กลับทาง)',q.skip||(q.v1<q.v0),q.v0+' → '+q.v1);
 t('...▶ กลับมาที่เดิม',q.skip||(q.v2===q.v0),q.v2);

 /* ---------- 4) หน้า PJP ที่เป็นต้นแบบ ยังทำงานเหมือนเดิม ---------- */
 const pj=await ev(()=>{
   _switchTab('pjp');
   const btns=[...document.querySelectorAll('#pjpCtl .dstep-b')];
   if(btns.length!==2)return {n:btns.length};
   const v0=PJ.d;btns[0].click();const v1=PJ.d;btns[1].click();const v2=PJ.d;
   return {n:2,v0,v1,v2};
 });
 t('PJP ใช้ปุ่มหน้าตาเดียวกับหน้าอื่นแล้ว (.dstep-b)',pj.n===2,pj.n);
 t('PJP ◀ ▶ ยังเลื่อนวันได้เหมือนเดิม',pj.v1<pj.v0&&pj.v2===pj.v0,JSON.stringify(pj));

 /* ---------- 5) ⚠️ ของสำคัญที่สุด: ไม่มีข้อมูลก้อนไหนถูกแตะ ---------- */
 const after=await ev(new Function('return '+BLOBS));
 let moved='';
 if(after!==before){
   const a=JSON.parse(before),b2=JSON.parse(after);
   moved=Object.keys(a).filter(k=>JSON.stringify(a[k])!==JSON.stringify(b2[k])).join(', ')||'(ไม่รู้ก้อนไหน)';
 }
 t('⚠️ กดปุ่ม ◀ ▶ ทุกหน้าแล้ว ข้อมูลทุกก้อนเหมือนเดิมเป๊ะทุกไบต์',after===before,'ก้อนที่ขยับ: '+moved);
 const sync=await ev(()=>window.__sync||0);
 t('⚠️ ไม่มีการสั่งบันทึกขึ้นเซิร์ฟเวอร์เลยสักครั้ง',sync===0,sync);
 const alerts=await ev(()=>(window.__alerts||[]).length);
 t('ไม่มีกล่องเตือนเด้งระหว่างกด',alerts===0,alerts);

 let bad=0;A.forEach(([c,n,x])=>{if(!c)bad++;console.log((c?'  ✓ ':'  ✗ FAIL: ')+n+(x&&!c?' → '+x:''));});
 const real=errs.filter(e=>!/localStorage/.test(e));
 if(real.length){console.log('PAGE ERRORS:');real.forEach(e=>console.log('   '+e));bad+=real.length;}
 await b.close();
 console.log('\n'+(bad?bad+' FAILED of '+A.length:'ALL PASS ('+A.length+' checks)'));
 process.exit(bad?1:0);
})();
