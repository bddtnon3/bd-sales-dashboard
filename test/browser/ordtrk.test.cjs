/* ✅ 📋 สถานะออเดอร์ — เจ้าของสั่ง 26 พ.ย. 69
   *"เราเจอหัวใจสำคัญละ เชื่อมด้วยเลขออเดอร์เดียวทั้งระบบฝั่งการขาย … เพิ่มหมวดใหม่
     ข้างออเดอร์พิเศษ นั่นคือ สถานะออเดอร์ โดยทุกคนเข้ามาดูได้"*

   สิ่งที่ต้องพิสูจน์:
     • ลำดับหมวด: … ราคา & ทุน → สถานะออเดอร์ → ออเดอร์พิเศษ (ตามที่สั่ง)
     • ทุก role เห็นหมวดนี้ (รวมทีมคลัง สายส่ง หัวหน้าเซลล์) — tabOk ปิดแท็บที่ไม่เอ่ยชื่อ role
     • 🔑 ใบที่ "คลังยังไม่จัด" (ไม่มีเลข GIN) ต้องถูกเก็บด้วย — parseAlloc เดิมข้ามแถวพวกนี้ทิ้ง
     • 🔑 สถานะที่ไม่รู้จักเก็บข้อความเต็มไว้ ไม่เดา · แถวที่แปลงหน่วยไม่ได้นับไว้ ไม่เดาเป็น 1
     • 🔑 u = วันสุดท้ายที่ไฟล์ครอบคลุม ไม่ใช่เวลาอัพ (อัพไฟล์เก่าทับต้องไม่ลากสถานะถอยหลัง)
     • ค้นทีละเลข / วางมาทั้งคอลัมน์ / ค้นด้วยเลขบิล / ค้นข้ามเดือน และบอกเลขที่ไม่เจอ
     • เซลล์เปิดมาเห็นสายตัวเองก่อน
     • 🛟 หน้านี้อ่านอย่างเดียว — กดทุกปุ่มแล้วข้อมูลในระบบต้องเหมือนเดิมทุกไบต์
   ⛔ รหัส/ตัวเลขในเทสต์สมมติขึ้นเอง — รีโปนี้เป็นสาธารณะ
   ต้องติดตั้งก่อน:  npm i --no-save playwright-core   แล้วรัน:  node test/browser/ordtrk.test.cjs */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');
const BROWSER=require('./_chrome.cjs').chromePath();
/* ไฟล์จริงของเจ้าของมีชื่อ/รหัสร้านจริง จึงไม่เข้ารีโป — ตรวจเพิ่มได้ด้วย
   ORDTRK_TXN=/path/Transaction_Inquiry_....xlsx node test/browser/ordtrk.test.cjs */
const REAL=process.env.ORDTRK_TXN&&fs.existsSync(process.env.ORDTRK_TXN)?process.env.ORDTRK_TXN:null;
/* ต้องเสิร์ฟผ่าน origin จริง ไม่ใช่ setContent — ไม่งั้นเบราว์เซอร์ห้ามแตะ localStorage
   แล้วโค้ดส่วนอื่นของหน้าเว็บจะโยน SecurityError (บทเรียนเดียวกับ cstock/sreq) */
const ORIGIN='https://bd-ordtrk.test/';

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const pg=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 const html=fs.readFileSync(PAGE,'utf8');
 await pg.route(ORIGIN+'**',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:html}));
 await pg.goto(ORIGIN);
 await pg.addScriptTag({path:require.resolve('xlsx/dist/xlsx.full.min.js')});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);

 await pg.evaluate(`
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};
  window.__log=[];window.ulog=m=>{window.__log.push(String(m))};
  window.__sync=0;window.syncToServer=()=>{window.__sync++};
  window.__alert='';window.alert=m=>{window.__alert=String(m)};
  /* ส่งแบบไม่บีบอัด เพื่ออ่าน payload ที่หน้าเว็บส่งขึ้นเซิร์ฟเวอร์ได้ตรง ๆ */
  try{delete window.CompressionStream;}catch(e){window.CompressionStream=undefined;}
  TOKEN='t';
  window.__as=(role,name,code)=>{S.user={id:code||role,role:role,code:code||'',name:name};};
  __as('manager','แอดมิน 1');
  DATA.lines={'209611':{display:'CT11'},'209612':{display:'CT12'}};
  DATA.focus_order=['209611','209612'];
  DATA.targets={};DATA.monthly={};DATA.daily={};
  STORE={months:[],stores:[]};KPI={};ANALYTICS={months:[],lines:{},data:{}};
  /* ชื่อร้านมาจากดัชนีเดียวกับหน้าอื่น (cstStoreName) — ช่อง n ไม่ใช่ name */
  STOREPROD={months:[],cat:{},stores:{'9000001':{n:'ร้านทดสอบ ก'},'9000003':{n:'ร้านทดสอบ ค'}},data:{}};
  /* ฝั่งเซลล์: ดัชนีเลขออเดอร์จากไฟล์ยอดขายรายวัน — k = วันที่เซลล์คีย์ */
  STOREDAILY={data:{},ord:{
    'BDD0100000101':{s:'9000001',l:'209611',d:'2026-11-18',k:'2026-11-17',v:5000,c:2,cs:12,pc:0,g:6000},
    'BDD0100000102':{s:'9000002',l:'209612',d:'2026-11-19',k:'2026-11-18',v:2000,c:1,cs:5,pc:0,g:2400}}};
  MASTER={items:{'1001':{nm:'สินค้า ก'},'1002':{nm:'สินค้า ข'}}};
  MINSTOCK={man:{}};PLAN={items:{},done:{},del:{}};
  PROMO={items:{},res:{},del:{}};REQUESTS={data:{}};
  STOCKD={date:null,up:1,names:{},rows:[]};POSTATUS={dates:[],data:{}};
  ORDERS={dates:[],names:{},cat:{},catN:{},data:{}};
  CSTOCK={slips:{},lots:{},del:{},sdel:{},ex:{},sub:{},subdel:{},key:{},gin:{},rep:{}};
  PJP={out:{},plan:{},done:{},cfg:{}};

  /* ---- เซิร์ฟเวอร์จำลองของ /api/ordtrk ---- */
  window.__posts=[];
  window.__months=[{m:'2026-11'},{m:'2026-10'}];
  window.__db={
   '2026-11':{meta:{file:'alloc.xlsx',d1:'2026-11-15',d2:'2026-11-24'},
     ord:{
      '00000101':{d:17,l:'209611',s:'9000001',g:'44',t:'D',i:'00000501',c:12,v:5000,n:2,u:20261124},
      '00000102':{d:17,l:'209612',s:'9000002',t:'C',c:5,v:2000,n:1,u:20261124},
      '00000103':{d:18,l:'209611',s:'9000003',g:'45',t:'R',c:8,v:3000,n:1,u:20261124,x:1}},
     det:{'00000101':{'1001':[10,2],'1002':[2,0]},'00000103':{'1001':[8,0]}}},
   '2026-10':{meta:{file:'old.xlsx',d2:'2026-10-31'},
     ord:{'00000050':{d:5,l:'209611',s:'9000001',g:'12',t:'D',i:'00000400',c:3,v:900,n:1,u:20261031}},
     det:{}}};
  window.fetch=(u,o)=>{
    const url=String(u);
    const J=d=>Promise.resolve({ok:true,status:200,json:()=>Promise.resolve(d)});
    if(url.indexOf('/api/ordtrk')===0){
      if(o&&o.method==='POST'){
        const bb=JSON.parse(o.body);window.__posts.push(bb);
        return J({ok:true,m:bb.m,n:Object.keys(bb.ord).length,add:Object.keys(bb.ord).length});
      }
      const mm=(url.match(/[?&]m=([^&]+)/)||[])[1];
      if(!mm)return J({months:window.__months});
      const key=decodeURIComponent(mm),d=window.__db[key]||{ord:{},det:{}};
      return J({m:key,ord:d.ord,det:/full=1/.test(url)?d.det:null,meta:d.meta||null});
    }
    return J({});
  };
 `);
 const wait=async()=>{await pg.waitForTimeout(90);};

 /* ================= 1) หมวดใหม่และลำดับหมวด ================= */
 const grp=await ev(()=>{
   const ks=TAB_GROUPS.map(g=>g.k);
   const roles={};
   [['manager',null],['sales','209611'],['sup',null],['wh',null],['ds',null]].forEach(([r,c])=>{
     __as(r,c,r);roles[r]=tabVisible().map(x=>x.g.k).join(',');});
   __as('manager','แอดมิน 1');
   return {ks:ks.join(','),roles:roles,
     iPrice:ks.indexOf('price'),iOt:ks.indexOf('otrk'),iSp:ks.indexOf('spord'),
     admin:ADMIN_SITE_GROUPS.join(','),upTab:UP_TAB.otrk};});
 t('🔑 มีหมวด 📋 สถานะออเดอร์ ในตารางแท็บ',grp.iOt>=0,grp.ks);
 t('🔑 ลำดับตามที่สั่ง: ราคา & ทุน → สถานะออเดอร์ → ออเดอร์พิเศษ',
   grp.iPrice>=0&&grp.iOt===grp.iPrice+1&&grp.iSp===grp.iOt+1,
   'price='+grp.iPrice+' otrk='+grp.iOt+' spord='+grp.iSp);
 ['manager','sales','sup','wh','ds'].forEach(r=>{
   t('🔑 '+r+' เห็นหมวดสถานะออเดอร์',/(^|,)otrk(,|$)/.test(grp.roles[r]),grp.roles[r]);});
 t('🛟 เว็บแอดมินก็มีหมวดนี้',/(^|,)otrk(,|$)/.test(grp.admin),grp.admin);
 t('🛟 ปุ่มอัพโหลดบนหน้านี้เปิดหมวดของหน้านี้เอง (มีไฟล์รายการสั่งซื้ออยู่ในนั้น)',
   grp.upTab==='otrk',grp.upTab);

 /* ================= 2) แปลงเลขที่พิมพ์เข้ามา ================= */
 const nm=await ev(()=>({
   full:otNorm('BDD0100000312'),bare:otNorm('312'),ten:otNorm('0100000312'),
   inv:otNorm('BDD0900000375'),sp:otNorm('  bdd0100000312 '),junk:otNorm('ขขข'),
   empty:otNorm('  '),back:otFullNo('00000312'),backInv:otInvNo('00000375')}));
 t('🔑 เลขเต็ม BDD0100000312 → คีย์ 00000312',nm.full&&nm.full.k==='00000312',JSON.stringify(nm.full));
 t('🔑 พิมพ์เลขท้ายเฉย ๆ (312) ก็หาเจอ',nm.bare&&nm.bare.k==='00000312',JSON.stringify(nm.bare));
 t('🔑 เลข 10 หลักที่ลอก BDD ออกมาก็ได้',nm.ten&&nm.ten.k==='00000312',JSON.stringify(nm.ten));
 t('🔑 เลขบิล BDD09… แยกออกจากเลขออเดอร์',nm.inv&&nm.inv.inv==='00000375'&&!nm.inv.k,JSON.stringify(nm.inv));
 t('🛟 เว้นวรรค/ตัวพิมพ์เล็กก็อ่านได้',nm.sp&&nm.sp.k==='00000312',JSON.stringify(nm.sp));
 t('🛟 ข้อความที่ไม่ใช่เลขไม่พัง และไม่กลายเป็นเลขมั่ว',!!(nm.junk&&nm.junk.raw&&!nm.junk.k),JSON.stringify(nm.junk));
 t('🛟 ช่องว่างล้วน = ไม่มีอะไรให้ค้น',nm.empty===null,JSON.stringify(nm.empty));
 t('🔑 คีย์กลับเป็นเลขเต็มได้ทั้งสองแบบ',nm.back==='BDD0100000312'&&nm.backInv==='BDD0900000375',
   nm.back+' / '+nm.backInv);

 /* ================= 3) แปลงหน่วย ลัง/แพ็ค/ชิ้น ================= */
 const u=await ev(()=>({
   plain:otCeq(2,0,0,36,null),half:otCeq(2,0,18,36,null),
   shr:otCeq(1,3,0,36,6),noShr:otCeq(1,3,0,36,null),
   noPk:otCeq(2,0,0,0,null),noPkPc:otCeq(0,0,5,0,null),
   find:alShrink('สินค้า ก 6X6X160 กรัม',36),miss:alShrink('สินค้า ค',36)}));
 t('🔑 ลังล้วนได้เท่าเดิม',u.plain===2,u.plain);
 t('🔑 ชิ้นคิดเป็นเศษของลัง (2 ลัง + 18 ชิ้น จากหีบ 36 = 2.5)',u.half===2.5,u.half);
 t('🔑 แพ็คคิดได้เมื่อรู้ขนาดแพ็ค (1 ลัง + 3 แพ็ค×6 = 1.5)',u.shr===1.5,u.shr);
 t('🔑 มีแพ็คแต่ไม่รู้ขนาดแพ็ค → คืน null ไม่เดา',u.noShr===null,u.noShr);
 t('🛟 ไม่รู้ขนาดหีบ แต่เป็นลังล้วน ยังนับได้',u.noPk===2,u.noPk);
 t('🛟 ไม่รู้ขนาดหีบ และมีชิ้น → null ไม่เดา',u.noPkPc===null,u.noPkPc);
 t('🛟 อ่านขนาดแพ็คจากชื่อสินค้าได้ และไม่มั่วเมื่อชื่อไม่บอก',u.find===6&&u.miss===null,u.find+' / '+u.miss);

 /* ================= 4) อ่านไฟล์ใบจัดของ → ดัชนีสถานะออเดอร์ ================= */
 const parsed=await ev(async()=>{
   const H=['Order Creation Date','PJP Code','PJP Name','GIN No.','Product Code',
     'Product Description','Pack Size','Order Number','Invoice No.',
     'Sale Order (CS)','Sale Order (SHR)','Sale Order (PC)',
     'Free Order (CS)','Free Order (SHR)','Free Order (PC)',
     'Sale Allocated (CS)','Sale Allocated (SHR)','Sale Allocated (PC)',
     'Free Allocated (CS)','Free Allocated (SHR)','Free Allocated (PC)',
     'GSV','NIV','Order Status','Sales Allocation Status','Free Allocation Status','Outlet Code'];
   const R=(d,pj,gin,code,nmx,pk,no,inv,sc,ss,sp,fc,st,out,niv)=>
     [d,pj,'CT_HPC_'+String(pj).slice(-2)+'1',gin,code,nmx,pk,no,inv,
      sc,ss,sp,fc,0,0,sc,ss,sp,fc,0,0,niv*1.2,niv,st,'Full','Full',out];
   const rows=[H,
     /* ใบปกติ คลังจัดแล้ว */
     R('2026-11-17','209611','7','1001','สินค้า ก 6X6X160 กรัม',36,'BDD0100000201','BDD0900000601',2,0,0,0,'Delivered','9000001',1000),
     /* ⚠️ ใบที่ "คลังยังไม่จัด" — ไม่มีเลข GIN · ตัวอ่านเดิมข้ามแถวนี้ทิ้งทั้งแถว */
     R('2026-11-17','209612','','1001','สินค้า ก 6X6X160 กรัม',36,'BDD0100000202','',3,0,0,0,'Confirmed','9000002',1500),
     /* มีแพ็คแต่ชื่อไม่บอกขนาดแพ็ค → ต้องนับว่าแปลงไม่ได้ ไม่ใช่เดาเป็น 1 */
     R('2026-11-17','209611','7','1002','สินค้า ค',36,'BDD0100000203','BDD0900000603',1,3,0,0,'Delivered','9000003',700),
     /* สถานะที่ยังไม่รู้จัก → เก็บข้อความเดิม ไม่เดา */
     R('2026-11-18','209611','8','1001','สินค้า ก 6X6X160 กรัม',36,'BDD0100000204','',1,0,18,1,'Zzz Brand New','9000001',400)];
   const ws=XLSX.utils.aoa_to_sheet(rows),wb=XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb,ws,'Export');
   const buf=XLSX.write(wb,{type:'array',bookType:'xlsx'});
   window.__posts=[];
   parseAlloc('Order_Allocation_Report.xlsx',buf);
   await new Promise(r=>setTimeout(r,60));
   const ix=ALLOC.ord||{};
   return {keys:Object.keys(ix).sort().join(','),
     a:ix['00000201']||null,b:ix['00000202']||null,c:ix['00000203']||null,d:ix['00000204']||null,
     posts:window.__posts.map(p=>({m:p.m,n:Object.keys(p.ord).length,
       u:(p.ord[Object.keys(p.ord)[0]]||{}).u,d1:p.d1,d2:p.d2,
       det:Object.keys(p.det||{}).length,sample:p.ord['00000201']||null,
       noGin:p.ord['00000202']||null})),
     log:(window.__log||[]).filter(x=>/สถานะออเดอร์/.test(x)).join(' ')};});
 t('🔑 เก็บครบทุกใบในไฟล์ รวมใบที่คลังยังไม่จัด',
   parsed.keys==='00000201,00000202,00000203,00000204',parsed.keys);
 t('🔑 ใบที่ยังไม่มีเลข GIN ถูกเก็บ และรู้ว่ายังไม่จัด',
   !!parsed.b&&!parsed.b.g&&parsed.b.t==='C',JSON.stringify(parsed.b));
 t('🔑 ใบที่คลังจัดแล้วเก็บเลข GIN + สถานะ + เลขบิล',
   !!parsed.a&&parsed.a.g==='7'&&parsed.a.t==='D'&&parsed.a.i==='00000601',JSON.stringify(parsed.a));
 t('🔑 แถวที่แปลงหน่วยไม่ได้ถูกนับไว้ ไม่ได้เดาจำนวน',
   !!parsed.c&&parsed.c.x===1&&parsed.c.c===0,JSON.stringify(parsed.c));
 t('🔑 สถานะที่ไม่รู้จักเก็บข้อความเต็ม ไม่เดาเป็นรหัสใกล้เคียง',
   !!parsed.d&&parsed.d.t==='Zzz Brand New',JSON.stringify(parsed.d));
 t('🔑 จำนวนคิดเป็นลังทศนิยม (1 ลัง + 18 ชิ้น + แถม 1 ลัง = 2.5)',
   !!parsed.d&&Math.abs(parsed.d.c-2.5)<0.001,parsed.d&&parsed.d.c);
 t('🔑 ส่งขึ้นเซิร์ฟเวอร์แยกเป็นรายเดือน',
   parsed.posts.length===1&&parsed.posts[0].m==='2026-11'&&parsed.posts[0].n===4,
   JSON.stringify(parsed.posts.map(p=>p.m+':'+p.n)));
 t('🔑 u = วันสุดท้ายที่ไฟล์ครอบคลุม ไม่ใช่เวลาอัพ (อัพไฟล์เก่าทับต้องไม่ลากสถานะถอยหลัง)',
   parsed.posts[0]&&parsed.posts[0].u===20261118,parsed.posts[0]&&parsed.posts[0].u);
 t('🛟 ส่งรายสินค้าไปด้วย เพื่อให้เซลล์กางดูได้ — แต่ไม่ส่งใบที่แปลงหน่วยไม่ได้ (3 จาก 4 ใบ)',
   parsed.posts[0]&&parsed.posts[0].det===3,parsed.posts[0]&&parsed.posts[0].det);
 t('🔑 รายงานจำนวนใบ / ใบที่คลังยังไม่จัด / แถวที่แปลงไม่ได้ / สถานะที่ไม่รู้จัก',
   /4<\/b> ใบ/.test(parsed.log)&&/ยังไม่จัด <b>1/.test(parsed.log)&&
   /แปลงหน่วยไม่ได้ 1/.test(parsed.log)&&/Zzz Brand New/.test(parsed.log),parsed.log.slice(0,200));

 /* ================= 5) หน้าจอ ================= */
 await ev(()=>{OT={m:'',line:'',day:'all',st:'all',sec:'list',cache:{},months:null,
   err:'',busy:0,q:'',ask:0,hits:null,open:'',note:''};_switchTab('otrk');});
 await wait();await wait();
 const scr=await ev(()=>({
   body:document.getElementById('otBody').textContent.replace(/\s+/g,' '),
   mon:[...document.querySelectorAll('#otMon option')].map(x=>x.value).join(','),
   line:[...document.querySelectorAll('#otLine option')].map(x=>x.value).join(','),
   day:[...document.querySelectorAll('#otDay option')].map(x=>x.value).join(','),
   st:[...document.querySelectorAll('#otSt option')].map(x=>x.value).join(','),
   rows:document.querySelectorAll('#otBody .ot-tbl tbody tr').length,
   lbl:[...document.querySelectorAll('#otBody .ot-tbl tbody tr:first-child td')]
        .map(td=>td.dataset.l||'').filter(Boolean).join('|'),
   m:OT.m}));
 t('🔑 เปิดมาเจอเดือนล่าสุดที่มีข้อมูล',scr.m==='2026-11',scr.m);
 t('🔑 เลือกเดือนได้ทุกเดือนที่มีข้อมูล',scr.mon==='2026-11,2026-10',scr.mon);
 t('🔑 เลือกสายได้จากสายที่มีจริงในเดือนนั้น',scr.line==='all,CT11,CT12',scr.line);
 t('🔑 เลือกวันที่เซลล์คีย์ได้',scr.day==='all,2026-11-17,2026-11-18',scr.day);
 t('🔑 กรองตามสถานะได้ ทั้งเรื่องบิลและเรื่องคลังจัดของ',
   /^all,ino,iyes,no,yes,both,/.test(scr.st),scr.st);
 t('🔑 ขึ้นครบทุกใบของเดือนนั้น',scr.rows===3,scr.rows);
 t('🔑 ตารางมีสองขั้นตอน: เซลล์คีย์ และคลังจัดของ',
   /① เซลล์คีย์/.test(scr.body)&&/② คลังจัดของ/.test(scr.body),scr.body.slice(0,120));
 t('🔑 ใบที่คลังยังไม่จัด ขึ้นว่า "ยังไม่จัด" ไม่ใช่ช่องว่าง',/ยังไม่จัด/.test(scr.body),'');
 t('🔑 ใบที่จัดแล้วขึ้นเลข GIN',/GIN 44/.test(scr.body)&&/GIN 45/.test(scr.body),'');
 t('🔑 การ์ดสรุปแยก "จัดแล้ว" กับ "ยังไม่จัด"',
   /② คลังจัดของแล้ว/.test(scr.body)&&/🕗 คลังยังไม่จัด/.test(scr.body),'');
 t('🛟 แถวที่แปลงหน่วยไม่ได้ บอกไว้บนหน้าจอ ไม่ซ่อน',/แปลงหน่วยไม่ได้/.test(scr.body),'');
 t('🔑 ขึ้นชื่อร้าน ไม่ใช่รหัสร้านเปล่า ๆ',
   /ร้านทดสอบ ก/.test(scr.body)&&/ร้านทดสอบ ค/.test(scr.body),scr.body.slice(0,160));
 t('🛟 ร้านที่ยังไม่รู้จักชื่อ ขึ้นรหัสไว้ ไม่ใช่ช่องว่าง',/ร้าน 9000002/.test(scr.body),'');
 /* 📱 บนมือถือหัวตารางถูกซ่อน แล้วใช้ data-l เป็นป้ายกำกับแทน — ทุกช่องต้องมี */
 t('📱 ทุกช่องมีป้ายกำกับสำหรับจอมือถือ (ยกเว้นช่องเลขออเดอร์ที่เป็นหัวการ์ด)',
   scr.lbl==='ร้าน|สาย|① เซลล์คีย์|② คลังจัดของ|จำนวน (ลัง)|มูลค่า',scr.lbl);

 /* ---- กรอง ---- */
 const filt=await ev(()=>{
   const n=()=>document.querySelectorAll('#otBody .ot-tbl tbody tr').length;
   OT.line='CT11';renderOtrk();const a=n();
   OT.line='all';OT.day='2026-11-18';renderOtrk();const bq=n();
   OT.day='all';OT.st='no';renderOtrk();const c=n();
   const body=document.getElementById('otBody').textContent.replace(/\s+/g,' ');
   OT.st='yes';renderOtrk();const d=n();
   OT.st='all';renderOtrk();
   return {a:a,b:bq,c:c,d:d,noBody:body};});
 t('🔑 กรองสายได้ (CT11 มี 2 ใบ)',filt.a===2,filt.a);
 t('🔑 กรองวันที่เซลล์คีย์ได้ (18 พ.ย. มี 1 ใบ)',filt.b===1,filt.b);
 t('🔑 กรอง "คลังยังไม่จัด" ได้ (1 ใบ)',filt.c===1&&/ยังไม่จัด/.test(filt.noBody),filt.c);
 t('🔑 กรอง "คลังจัดแล้ว" ได้ (2 ใบ)',filt.d===2,filt.d);

 /* ---- 🧾 ป้ายบอกว่าออกบิลแล้ว / มี GIN แล้ว + ฟิลเตอร์ของทั้งสองเรื่อง (เจ้าของสั่ง 26 พ.ย. 69)
    ⚠️ "ออกบิลแล้ว" มีสองทาง: เลขบิลที่เก็บกับออเดอร์ หรือไฟล์ยอดขายรายวันมีใบนี้
    แต่เรคอร์ดที่มาจากไฟล์ Transaction Inquiry (tx:1 — ไม่มี cs) ไม่นับ */
 const badge=await ev(()=>{
   const C=OT.cache['2026-11'];
   /* ใบที่ยังไม่ออกบิลและคลังยังไม่จัด — ของจริงมีเยอะ แต่ในชุดทดสอบยังไม่มี */
   C.ord['00000104']={d:17,l:'209612',s:'9000002',t:'C',c:2,v:700,n:1,u:20261124};
   const n=()=>document.querySelectorAll('#otBody .ot-tbl tbody tr').length;
   const tx=()=>document.getElementById('otBody').textContent.replace(/\s+/g,' ');
   const o={};
   OT.line='all';OT.day='all';OT.st='all';renderOtrk();
   o.all=n();o.body=tx();
   o.pills=[...document.querySelectorAll('#otBody .ot-pill')].map(e=>e.textContent.trim());
   OT.st='ino';renderOtrk();o.ino=n();o.inoBody=tx();
   OT.st='iyes';renderOtrk();o.iyes=n();
   OT.st='both';renderOtrk();o.both=n();o.bothBody=tx();
   OT.st='all';delete C.ord['00000104'];renderOtrk();o.after=n();
   /* ใบที่รู้จักจากไฟล์ Transaction Inquiry อย่างเดียว ยังไม่ถือว่าออกบิล */
   const keep=STOREDAILY.ord['BDD0100000103'];
   STOREDAILY.ord['BDD0100000103']={s:'9000003',l:'209611',d:'2026-11-18',tx:1};
   o.txNotInv=!otHasInv({k:'00000103',r:C.ord['00000103'],sl:STOREDAILY.ord['BDD0100000103']});
   if(keep)STOREDAILY.ord['BDD0100000103']=keep;else delete STOREDAILY.ord['BDD0100000103'];
   renderOtrk();
   return o;});
 t('🔑 ทุกใบมีป้ายบอกทั้งเรื่องบิลและเรื่อง GIN',
   badge.pills.length===badge.all*2&&badge.pills.some(x=>/^🧾 บิล /.test(x))&&
   badge.pills.some(x=>x==='🧾 ยังไม่ออกบิล')&&badge.pills.some(x=>/^📦 GIN /.test(x))&&
   badge.pills.some(x=>x==='📦 ยังไม่จัด'),JSON.stringify(badge.pills));
 t('🔑 กรองเฉพาะ "ยังไม่ออกบิล" ได้ (2 ใบ)',badge.ino===2&&/ยังไม่ออกบิล/.test(badge.inoBody),badge.ino);
 t('🔑 กรองเฉพาะ "ออกบิลแล้ว" ได้ (2 ใบ)',badge.iyes===2,badge.iyes);
 t('🔑 กรองเฉพาะใบที่ค้างทั้งสองอย่าง (ยังไม่ออกบิล + ยังไม่มี GIN) ได้ (1 ใบ)',
   badge.both===1&&/ยังไม่ออกบิล/.test(badge.bothBody)&&/ยังไม่จัด/.test(badge.bothBody),badge.both);
 t('🔑 การ์ดสรุปมีช่อง "ยังไม่ออกบิล" แยกจาก "คลังยังไม่จัด"',
   /🧾 ยังไม่ออกบิล/.test(badge.body)&&/🕗 คลังยังไม่จัด/.test(badge.body),'');
 t('🛟 ใบที่รู้จักจากไฟล์รายการสั่งซื้ออย่างเดียว ยังไม่นับว่าออกบิล (ไฟล์นั้นมีใบที่ยังไม่ออกบิลด้วย)',
   badge.txNotInv,badge.txNotInv);
 t('🛟 ลบใบที่เพิ่มไว้ทดสอบออกแล้ว กลับมาเท่าเดิม',badge.after===3,badge.after);

 /* ---- กางดูรายสินค้าในใบ ---- */
 const det=await ev(async()=>{
   otRowTog('00000101');await new Promise(r=>setTimeout(r,120));
   const b1=document.getElementById('otBody').textContent.replace(/\s+/g,' ');
   otRowTog('00000102');await new Promise(r=>setTimeout(r,60));
   const b2=document.getElementById('otBody').textContent.replace(/\s+/g,' ');
   otRowTog('00000102');
   return {open:b1,none:b2};});
 t('🔑 แตะแถวแล้วกางรายสินค้าในใบนั้นได้',/1001/.test(det.open)&&/ขาย \(ลัง\)/.test(det.open),det.open.slice(-160));
 t('🛟 ใบที่ไฟล์ยังไม่มีรายสินค้า บอกให้อัพไฟล์ซ้ำ ไม่ใช่ขึ้น 0 เงียบ ๆ',
   /ยังไม่มีรายสินค้าของใบนี้/.test(det.none),det.none.slice(-160));

 /* ---- ยอดรายสินค้า ---- */
 const prod=await ev(async()=>{
   OT.open='';otSetSec('prod');await new Promise(r=>setTimeout(r,120));
   const bb=document.getElementById('otBody').textContent.replace(/\s+/g,' ');
   OT.line='CT11';renderOtrk();
   const only=document.getElementById('otBody').textContent.replace(/\s+/g,' ');
   OT.line='all';otSetSec('list');
   return {all:bb,ct11:only};});
 t('🔑 มีหน้ายอดรายสินค้า รวมจากใบที่กรองไว้',
   /ยอดรายสินค้า/.test(prod.all)&&/กี่ร้าน/.test(prod.all),prod.all.slice(0,140));
 t('🔑 เซลล์กรองสายตัวเองแล้วเห็นยอดรายสินค้าของสายตัวเอง',
   /สาย CT11/.test(prod.ct11),prod.ct11.slice(0,140));
 t('🛟 บอกจำนวนใบที่ยังไม่มีรายสินค้า ไม่ปัดทิ้งเงียบ ๆ',/ยังไม่มีรายสินค้า/.test(prod.all),'');

 /* ================= 6) ค้นเลขออเดอร์ ================= */
 const find=await ev(async()=>{
   otAskOpen();
   OT.q='BDD0100000101 BDD0900000501\n999999\nBDD0100000050';
   await otFind();await new Promise(r=>setTimeout(r,120));
   const h=OT.hits;
   const body=document.getElementById('otBody').textContent.replace(/\s+/g,' ');
   return {n:h.n,rows:(h.rows||[]).map(r=>r.k+'@'+r.m).join(','),miss:(h.miss||[]).join(','),
     body:body};});
 t('🔑 ค้นหลายเลขพร้อมกันได้ (วางมาทั้งคอลัมน์)',find.n===4,find.n);
 t('🔑 ค้นด้วยเลขออเดอร์เจอ',/00000101@2026-11/.test(find.rows),find.rows);
 t('🔑 ค้นด้วยเลขบิลก็เจอใบเดียวกัน',(find.rows.match(/00000101@/g)||[]).length>=1,find.rows);
 t('🔑 ค้นข้ามเดือนได้ — เลขของเดือนก่อนก็เจอ',/00000050@2026-10/.test(find.rows),find.rows);
 t('🔑 เลขที่ไม่เจอถูกบอกชื่อ ไม่ใช่เงียบหายไป',/999999/.test(find.miss),find.miss);
 t('🛟 บอกด้วยว่า "ไม่เจอ" อาจแปลว่ายังไม่ได้อัพไฟล์ ไม่ใช่ไม่มีออเดอร์',
   /ไม่ได้แปลว่าไม่มีออเดอร์/.test(find.body),'');

 /* ================= 7) เซลล์เห็นสายตัวเองก่อน ================= */
 const mine=await ev(async()=>{
   __as('sales','เซลล์ CT11','209611');
   OT={m:'',line:'',day:'all',st:'all',sec:'list',cache:{},months:null,
     err:'',busy:0,q:'',ask:0,hits:null,open:'',note:''};
   _switchTab('otrk');
   await new Promise(r=>setTimeout(r,200));
   const n=document.querySelectorAll('#otBody .ot-tbl tbody tr').length;
   const line=OT.line;
   __as('manager','แอดมิน 1');
   return {line:line,n:n};});
 t('🔑 เซลล์เปิดมาเห็นสายตัวเองก่อน',mine.line==='CT11',mine.line);
 t('🔑 ...และเห็นเฉพาะใบของสายตัวเอง (2 ใบ)',mine.n===2,mine.n);

 /* ================= 8) 🛟 หน้านี้อ่านอย่างเดียว ================= */
 const before=await ev(()=>JSON.stringify({d:DATA,s:STOREDAILY,c:CSTOCK,o:ORDERS,p:POSTATUS}));
 const syncB=await ev(()=>window.__sync);
 await ev(async()=>{
   OT={m:'',line:'all',day:'all',st:'all',sec:'list',cache:{},months:null,
     err:'',busy:0,q:'',ask:0,hits:null,open:'',note:''};
   _switchTab('otrk');await new Promise(r=>setTimeout(r,200));
   ['CT11','CT12','all'].forEach(l=>{OT.line=l;renderOtrk();});
   ['2026-11-17','2026-11-18','all'].forEach(d=>{OT.day=d;renderOtrk();});
   ['no','yes','D','C','all'].forEach(s=>{OT.st=s;renderOtrk();});
   otSetSec('prod');await new Promise(r=>setTimeout(r,120));otSetSec('list');
   otRowTog('00000101');otRowTog('00000101');
   otSetMon('2026-10');await new Promise(r=>setTimeout(r,150));otSetMon('2026-11');
   await new Promise(r=>setTimeout(r,150));
   otAskOpen();OT.q='BDD0100000101';await otFind();otClear();otAskOpen();});
 await wait();
 const after=await ev(()=>JSON.stringify({d:DATA,s:STOREDAILY,c:CSTOCK,o:ORDERS,p:POSTATUS}));
 const syncA=await ev(()=>window.__sync);
 t('🛟 กดทุกปุ่มบนหน้านี้แล้ว ข้อมูลในระบบเหมือนเดิมทุกไบต์',before===after,
   before===after?'':'ข้อมูลเปลี่ยน!');
 t('🛟 ...และไม่มีการเขียนขึ้นเซิร์ฟเวอร์เลย',syncA===syncB,syncB+' → '+syncA);
 const posts=await ev(()=>window.__posts.length);
 t('🛟 ...ไม่มีการ POST ไป /api/ordtrk จากการดูหน้าเว็บ',posts===1,posts);


 /* ================= 9) 📥 ไฟล์รายการสั่งซื้อ (ฝั่งเซลล์คีย์) =================
    เจ้าของส่งไฟล์นี้มา 26 พ.ย. 69 — เป็นไฟล์ "ก่อน" จะกลายเป็นใบจัดของ
    วัดกับไฟล์จริงแล้ว: 1 เลขเอกสาร = 1 แถว เสมอ และครอบคลุมเลขของอีกสองไฟล์ครบ 100% */
 const txn=await ev(async()=>{
   const H=['เลขที่เอกสาร','รหัสร้านค้า','ชื่อร้านค้ายาว','PJP เซลล์แมน/PJP สายส่ง',
     'PJP เซลล์/PJP คนส่งของ','รหัส Section','ชื่อส่วน','หมายเลข PJP','เวลาสั่งซื้อ',
     'วันที่เอกสาร','วันที่จัดส่ง','วันที่จัดส่งจริง','จำนวนรวม (GSV)','ส่วนเพิ่มราคา',
     'จำนวนส่วนลด','DYP.......NIV','มูลค่าภาษี','จํานวนเงินที่ได้รับ',
     'DYP.......CreditNoteAdjustment','ยอดสุทธิ','DYP.......NetPayable','สถานะเอกสาร',
     'สถานะการดำเนินการ','ช่องทางความต้องการ','เลขอ้างอิง DDT','หมายเลขใบจัดสินค้า',
     'เลขที่อ้างอิงใบแจ้งหนี้','เลขที่ใบแจ้งหนี้','DYP.......invoicedate'];
   const R=(no,sh,nm,ln,tm,d,dd,da,gsv,niv,ds,ws,ch,gin,inv,ivd)=>
     [no,sh,nm,ln+' / TH20960001','เซลล์ ก / คนส่ง','SC'+ln+'F210',ln+'_THU',ln,tm,
      d,dd,da,gsv,0,0,niv,0,0,0,0,0,ds,ws,ch,'1034',gin,'',inv,ivd];
   const rows=[H,
     /* ส่งถึงร้านแล้ว — มีครบทุกอย่าง */
     R('BDD0100000301','9000001','ร้าน ก','209611','10:22:11','17-11-2026','19-11-2026',
       '2026-11-19 14:05:10','1,277.38','820.38','Delivered','Delivered','Mobility (MOB)','44','BDD0900000701','19-11-2026'),
     /* เพิ่งคีย์ — ยังไม่มี GIN ยังไม่ออกบิล ยังไม่ส่ง */
     R('BDD0100000302','9000002','ร้าน ข','209612','09:05:00','17-11-2026','18-11-2026','',
       '500','400','Ordered','Confirmed','Business to Business (B2B)','','',''),
     /* ⚠️ ใบที่ยกเลิก — ต้องเก็บไว้ให้เห็น แต่ห้ามนับเป็นยอดขาย */
     R('BDD0100000303','9000003','ร้าน ค','209611','11:00:00','18-11-2026','20-11-2026','',
       '900','700','Cancelled','Cancelled','Mobility (MOB)','','',''),
     /* สายที่ยังไม่รู้จัก — เก็บไว้ ไม่เดา */
     R('BDD0100000304','9000004','ร้าน ง','2096VSM','08:30:00','18-11-2026','19-11-2026','',
       '100','90','Ordered','Sent to Locus','Back Office (BO)','45','','')];
   const ws2=XLSX.utils.aoa_to_sheet(rows),wb=XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb,ws2,'DataExtract');
   const buf=XLSX.write(wb,{type:'array',bookType:'xlsx'});
   /* เรคอร์ดที่ไฟล์ยอดขายเขียนไว้แล้ว ต้องไม่ถูกทับ */
   STOREDAILY.ord['BDD0100000301']={s:'9000001',l:'209611',d:'2026-11-19',v:820.38,c:5,cs:3,pc:0,g:1277.38};
   window.__posts=[];window.__log=[];
   const isT=txIsTxn(rows[0]);
   const old=XLSX.utils.sheet_to_json(XLSX.read(buf,{type:'array'}).Sheets['DataExtract'],{header:1})[0];
   parseTxn('Transaction_Inquiry_26112026.xlsx',buf);
   await new Promise(r=>setTimeout(r,80));
   const P=window.__posts[0]||{ord:{}};
   return {isT:isT,notT:txIsTxn(['Order Creation Date','PJP Code','GIN No.']),
     keys:Object.keys(P.ord).sort().join(','),
     a:P.ord['00000301']||null,b:P.ord['00000302']||null,c:P.ord['00000303']||null,d:P.ord['00000304']||null,
     sd:JSON.parse(JSON.stringify(STOREDAILY.ord)),
     log:(window.__log||[]).join(' ')};});
 t('🔑 รู้จักไฟล์รายการสั่งซื้อจากหัวตาราง และไม่สับสนกับไฟล์ใบจัดของ',
   txn.isT===true&&txn.notT===false,txn.isT+'/'+txn.notT);
 t('🔑 อ่านครบทุกใบ รวมใบที่ยกเลิก',
   txn.keys==='00000301,00000302,00000303,00000304',txn.keys);
 t('🔑 เก็บเวลาสั่งซื้อ (ไฟล์ใบจัดของไม่มีช่องนี้เลย)',
   txn.a&&txn.a.tm==='10:22'&&txn.b.tm==='09:05',JSON.stringify(txn.a));
 t('🔑 วันนัดส่ง/วันส่งจริง เก็บเป็นจำนวนวันนับจากวันคีย์ (ข้ามเดือนก็ไม่หลุดก้อน)',
   txn.a&&txn.a.dp===2&&txn.a.dv===2,JSON.stringify(txn.a));
 t('🔑 ...และสองช่องนี้คนละรูปแบบวันที่ (dd-mm-yyyy กับ yyyy-mm-dd hh:mm:ss) อ่านถูกทั้งคู่',
   txn.a&&txn.a.dv===2&&txn.b.dp===1&&txn.b.dv===undefined,JSON.stringify(txn.b));
 t('🔑 ใบที่ยังไม่ส่ง ไม่มีวันส่งจริง (ไม่ใช่เดาเป็นวันนัด)',
   txn.b&&txn.b.dv===undefined&&txn.d.dv===undefined,JSON.stringify(txn.b));
 t('🔑 เก็บ GIN · เลขบิล · สถานะ · ช่องทาง',
   txn.a&&txn.a.g==='44'&&txn.a.i==='00000701'&&txn.a.t==='D'&&txn.a.cn==='M'&&
   txn.b.cn==='B'&&txn.d.cn==='O',JSON.stringify(txn.a));
 t('🔑 ใบที่ยกเลิกติดธงไว้ ไม่ได้ทิ้ง',txn.c&&txn.c.cx===1&&txn.c.t==='X',JSON.stringify(txn.c));
 t('🛟 ...แต่ห้ามเข้าดัชนีเลขออเดอร์ที่หน้าอื่นใช้ (ไม่ใช่ยอดขาย)',
   !txn.sd['BDD0100000303'],Object.keys(txn.sd).join(','));
 t('🔑 เติมดัชนีเลขออเดอร์ให้ใบที่ไฟล์ยอดขายยังไม่มี',
   !!txn.sd['BDD0100000302']&&txn.sd['BDD0100000302'].s==='9000002'&&
   txn.sd['BDD0100000302'].tx===1,JSON.stringify(txn.sd['BDD0100000302']));
 t('🔑 ...แต่ไม่ใส่จำนวนลัง เพราะไฟล์นี้ไม่มีรายสินค้า (ห้ามขึ้น 0 เงียบ ๆ)',
   txn.sd['BDD0100000302'].cs===undefined&&txn.sd['BDD0100000302'].c===undefined,
   JSON.stringify(txn.sd['BDD0100000302']));
 t('🛟 เรคอร์ดที่ไฟล์ยอดขายเขียนไว้แล้ว ต้องไม่ถูกทับ (จำนวนและวันออกบิลยังอยู่)',
   txn.sd['BDD0100000301'].cs===3&&txn.sd['BDD0100000301'].c===5&&
   txn.sd['BDD0100000301'].d==='2026-11-19',JSON.stringify(txn.sd['BDD0100000301']));
 t('🛟 ...แต่เติมช่องที่ยังว่างให้ (วันที่เซลล์คีย์)',
   txn.sd['BDD0100000301'].k==='2026-11-17',JSON.stringify(txn.sd['BDD0100000301']));
 t('🔑 รายงานจำนวนใบ ใบที่ยกเลิก และสายที่ยังไม่รู้จัก',
   /ยกเลิก 1 ใบ/.test(txn.log)&&/2096VSM/.test(txn.log)&&/4<\/b> ใบ/.test(txn.log),
   txn.log.slice(0,240));

 const noHdr=await ev(()=>{
   const rows=[['เลขที่เอกสาร','เวลาสั่งซื้อ','รหัสร้านค้า'],['BDD0100000401','09:00','9000001']];
   const ws2=XLSX.utils.aoa_to_sheet(rows),wb=XLSX.utils.book_new();
   XLSX.utils.book_append_sheet(wb,ws2,'DataExtract');
   const before=JSON.stringify(STOREDAILY.ord);
   let err='';
   try{parseTxn('x.xlsx',XLSX.write(wb,{type:'array',bookType:'xlsx'}));}catch(e){err=e.message;}
   return {err:err,same:before===JSON.stringify(STOREDAILY.ord)};});
 t('🛟 หัวตารางที่ต้องมีหายไป → โยน error และไม่เก็บอะไรเลย',
   /ไม่พบหัวตาราง/.test(noHdr.err)&&noHdr.same,noHdr.err.slice(0,80));

 /* หน้าจอต้องขึ้นข้อมูลใหม่ */
 const ui=await ev(async()=>{
   OT={m:'2026-11',line:'all',day:'all',st:'all',sec:'list',cache:{},months:['2026-11'],
     err:'',busy:0,q:'',ask:0,hits:null,open:'',note:''};
   window.__db['2026-11'].ord['00000301']={d:17,l:'209611',s:'9000001',g:'44',t:'D',i:'00000701',
     c:3,v:820,n:1,u:20261126,tm:'10:22',dp:2,dv:2,cn:'M'};
   window.__db['2026-11'].ord['00000303']={d:18,l:'209611',s:'9000003',t:'X',c:0,v:700,n:0,
     u:20261126,tm:'11:00',dp:2,cx:1,cn:'M'};
   _switchTab('otrk');await new Promise(r=>setTimeout(r,250));
   const b1=document.getElementById('otBody').textContent.replace(/\s+/g,' ');
   otRowTog('00000301');await new Promise(r=>setTimeout(r,150));
   const b2=document.getElementById('otBody').textContent.replace(/\s+/g,' ');
   otRowTog('00000301');
   const st=[...document.querySelectorAll('#otSt option')].map(x=>x.value).join(',');
   return {list:b1,det:b2,st:st};});
 t('🔑 ตารางขึ้นเวลาที่เซลล์คีย์',/10:22 น\./.test(ui.list),ui.list.slice(0,200));
 t('🔑 ใบที่ยกเลิกมีป้ายบอกชัด',/ยกเลิก/.test(ui.list),'');
 t('🔑 กางแถวแล้วเห็นวันนัดส่ง/วันส่งจริง/ช่องทาง',
   /นัดส่ง/.test(ui.det)&&/ส่งแล้ว/.test(ui.det)&&/Mobility/.test(ui.det),ui.det.slice(-260));
 t('🛟 กรองสถานะได้ครบทุกแบบที่ไฟล์ส่งมา รวม ยกเลิกแล้ว',
   /,X$/.test(ui.st)&&/F/.test(ui.st),ui.st);


 /* ================= 10) 📄 ไฟล์จริง (ถ้ามี) ================= */
 if(REAL){
   const rr=await ev(async(b64)=>{
     const bin=atob(b64),u8=new Uint8Array(bin.length);
     for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
     STOREDAILY={data:{},ord:{}};window.__posts=[];window.__log=[];
     const r=parseTxn('Transaction_Inquiry.xlsx',u8.buffer);
     await new Promise(x=>setTimeout(x,120));
     const all={};window.__posts.forEach(p=>Object.keys(p.ord).forEach(k=>all[k]=p.ord[k]));
     const ks=Object.keys(all);
     const cnt=f=>ks.filter(k=>f(all[k])).length;
     return {n:r.n,d1:r.d1,d2:r.d2,cx:r.cx,orders:ks.length,
       months:window.__posts.map(p=>p.m).sort().join(','),
       tm:cnt(o=>o.tm),dp:cnt(o=>o.dp!==undefined),dv:cnt(o=>o.dv!==undefined),
       gin:cnt(o=>o.g),inv:cnt(o=>o.i),sd:Object.keys(STOREDAILY.ord).length,
       noCs:Object.keys(STOREDAILY.ord).every(k=>STOREDAILY.ord[k].cs===undefined),
       kb:Math.round(JSON.stringify(all).length/1024)};
   },fs.readFileSync(REAL).toString('base64'));
   t('📄 ไฟล์จริง: 1 เลขเอกสาร = 1 ใบ (ไม่มีเลขซ้ำ)',rr.orders===rr.n,rr.orders+'/'+rr.n);
   t('📄 ไฟล์จริง: เวลาสั่งซื้อและวันนัดส่งครบทุกใบ',rr.tm===rr.n&&rr.dp===rr.n,
     rr.tm+' / '+rr.dp+' จาก '+rr.n);
   t('📄 ไฟล์จริง: วันส่งจริงมีเฉพาะใบที่ส่งแล้ว (ไม่ใช่ทุกใบ)',rr.dv>0&&rr.dv<rr.n,
     rr.dv+' จาก '+rr.n);
   t('📄 ไฟล์จริง: มีใบที่ยกเลิก และไม่เข้าดัชนีเลขออเดอร์',rr.cx>0&&rr.sd===rr.n-rr.cx,
     'ยกเลิก '+rr.cx+' · ดัชนี '+rr.sd+' จาก '+rr.n);
   t('📄 ไฟล์จริง: ไม่มีเรคอร์ดไหนใส่จำนวนลังมั่ว',rr.noCs,'');
   t('📄 ไฟล์จริง: แยกก้อนเป็นรายเดือน และขนาดไม่บวม',
     /^\d{4}-\d{2}/.test(rr.months)&&rr.kb<600,rr.months+' · '+rr.kb+' KB');
 }else{
   console.log('  (ข้าม 6 ข้อของไฟล์จริง — ตั้ง ORDTRK_TXN=/path/Transaction_Inquiry_....xlsx เพื่อตรวจเพิ่ม)');
 }

 t('ไม่มี JavaScript error ตลอดเทสต์',errs.length===0,errs.slice(0,2).join(' | '));

 await b.close();
 let bad=0;A.forEach(([ok,n,x])=>{if(!ok)bad++;console.log((ok?'  ✓ ':'  ✗ ')+n+(ok||!x?'':'   → '+x));});
 console.log(bad?('\nSOME FAILED ('+bad+'/'+A.length+')'):('\nALL PASS ('+A.length+' checks)'));
 process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1);});
