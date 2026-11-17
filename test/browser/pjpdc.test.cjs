/* 🗺 ไฟล์ PJP ของระบบใหม่ "dcode" — Master Outlet + แผน PJP รวมไฟล์เดียว (17 พ.ย. 69)
   กฎที่เจ้าของให้มา: Section Code 6 ตัวท้าย = <สาย><รอบ><ช่องวัน 01-12> ·
   Section Name ท้าย _ คือวันในสัปดาห์ · อาทิตย์ละ 6 วัน 12 วันครึ่งเดือน ครึ่งเดือนหลังวิ่งซ้ำ
   เทสต์ครอบ: แกะ Section Code/Name · กางช่องวันเป็นวันที่จริง (จันทร์แรกของเดือน +14) ·
   สายเทเลเซลล์ที่ใช้แค่ช่อง 01-06 วิ่งทุก 7 วัน · 209697 → 2096_97 (KA97) ·
   แถว DUMMY ไม่ใช่ร้าน · ร้านที่ไม่มีในไฟล์ห้ามลบ · หัวตารางหาย = ฟ้องไม่เก็บ ·
   ไฟล์เก่าทั้งสองแบบยังอ่านได้ · รายการ "ร้านที่ยังไม่มีบิลเลย" ของเซลล์
   ⛔ ตัวเลข/ชื่อร้านในเทสต์สมมติขึ้นเอง — รีโปเป็นสาธารณะ ห้าม commit รายชื่อลูกค้าจริง
   ไฟล์จริงตรวจเพิ่มได้: DCODE_PJP=/path/Outlet_Master__PJP_Report.xlsx node test/browser/pjpdc.test.cjs
   ต้องติดตั้งก่อน: npm i --no-save playwright-core */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const XLSX=require('xlsx');
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');
const BROWSER=require('./_chrome.cjs').chromePath();

/* หัวตารางจริงของไฟล์ dcode (38 คอลัมน์) */
const H=['Region','City','Distributor Code & Name','Site Code','Site Name','Outlet Code','Outlet Name',
 'Outlet Short Name','Outlet Subtype Code','Outlet Subtype Name','Outlet Type Code','Outlet Type Name',
 'Outlet Status','Salesman Name','PJP','Section Code','Section Name','Coordinate longitude',
 'Coordinate latitude','Credit Days','Credit Limit','Business Phone Number','eRTM Flag/B2B Flag',
 'B2B Mobile Number','Address','Street/Road','Lead Time','Contact Person','Outlet Classification',
 'Perfect Store','Perfect Store Description','Perfect Store Creation Date','VAT Number','Tax Exemption',
 'Manual Order','Created Date','Changed Date','Deactivation Date'];
const C={code:5,name:6,subN:9,typeN:11,status:12,sales:13,pjp:14,sec:15,secN:16,lon:17,lat:18,
         b2b:22,addr:24,road:25,ps:29,psd:30};
const DESC={'209611':'CT_HPC_211','209612':'CT_HPC_212','209613':'CT_HPC_213','209614':'CT_HPC_214',
 '209615':'CT_HPC_215','209616':'CT_HPC_216','209617':'CT_HPC_217','209619':'TL_HPC_219',
 '209622':'CT_HPC_222','209697':'KA_HPC_297','209698':'KA_HPC_298','209699':'KA_HPC_299'};
const DAY=['MON','TUE','WED','THU','FRI','SAT'];
function row(o){
  const r=new Array(38).fill('');
  r[0]='Thailand';r[1]=o.city||'จังหวัดนนทบุรี';r[2]='15389839-บริษัท บีดี ดิสทริบิวชั่น จำกัด';
  r[3]='2096';r[4]='บริษัท บีดี ดิสทริบิวชั่น จำกัด';
  r[C.code]=o.code;r[C.name]=o.name||('ร้านทดสอบ '+o.code);r[7]=o.name||'';
  r[8]='C10152';r[C.subN]=o.sub||'SS HPC - MPS_Mom & Pop Small';
  r[10]='C01387';r[C.typeN]='SS HPC - MP_MOM & POP';r[C.status]=o.status||'Active';
  r[C.sales]=(o.emp||'00016951')+'-'+(o.rep||'ชลศิต 0971104393');
  r[C.pjp]=o.pjp+'-'+(DESC[o.pjp]||'CT_HPC_2'+String(o.pjp).slice(-2));
  /* Section Code = SC + pjp + รอบ + ช่องวัน · Section Name = pjp_วัน (ให้ตรงกับช่องวันเสมอ) */
  const idx=String(o.idx).padStart(2,'0');
  r[C.sec]=o.sec||('SC'+o.pjp+(o.fq||'F2')+idx);
  r[C.secN]=o.secN||(o.pjp+'_'+DAY[(+o.idx-1)%6]);
  r[C.lon]=o.lon===undefined?'100.5542395':o.lon;
  r[C.lat]=o.lat===undefined?'13.90908495':o.lat;
  r[C.b2b]=o.b2b||'Yes';r[C.addr]=o.addr||'1/1 ต.บางพูด อ.ปากเกร็ด จ.นนทบุรี';
  r[C.road]=o.road||'อ.ปากเกร็ด';
  r[C.ps]=o.ps||'11';r[C.psd]=o.psd||'Non-Display';
  return r;
}
const FOOT=(()=>{const r=new Array(38).fill('');r[0]='Applied filters:\r\nSection Status is Active';return r;})();
function mk(rows,head,foot){
  const w=XLSX.utils.book_new();
  const aoa=[head||H].concat(rows);if(foot!==false)aoa.push(FOOT);
  XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet(aoa),'Export');
  return Buffer.from(XLSX.write(w,{bookType:'xlsx',type:'array'})).toString('base64');
}
/* ไฟล์ Master Outlet แบบเดิม + ไฟล์ PJP แบบเดิม (ต้องยังอ่านได้) */
function mkOldOut(rows){
  const w=XLSX.utils.book_new();
  const head=['ลูกค้า','ชื่อ','ถนน','Longitude','Latitude','โทรศัพท์','ชื่อประเภทย่อยของลูกค้า','สถานะ'];
  XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet([head].concat(rows)),'Sheet1');
  return Buffer.from(XLSX.write(w,{bookType:'xlsx',type:'array'})).toString('base64');
}
function mkOldPjp(rows){
  const w=XLSX.utils.book_new();
  const head=['เลขที่ลูกค้า','ชื่อร้านค้า','วันที่เข้าเยี่ยม','ลำดับการเยี่ยม','เส้นทางการขาย','ความถี่'];
  XLSX.utils.book_append_sheet(w,XLSX.utils.aoa_to_sheet([head].concat(rows)),'Sheet1');
  return Buffer.from(XLSX.write(w,{bookType:'xlsx',type:'array'})).toString('base64');
}

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const pg=await (await b.newContext({viewport:{width:1280,height:950}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.setContent(fs.readFileSync(PAGE,'utf8'),{waitUntil:'domcontentloaded'});
 await pg.addScriptTag({path:require.resolve('xlsx/dist/xlsx.full.min.js')});
 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);

 await pg.evaluate(`
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};
  window.ulog=m=>window.__log.push(String(m).replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' '));
  window.syncToServer=()=>{window.__sync++};
  window.fetch=()=>Promise.resolve({ok:true,json:()=>Promise.resolve({})});
  S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
  window.__reset=()=>{
    window.__log=[];window.__sync=0;
    DATA.lines={};DATA.focus_order=[];
    Object.keys(FOCUS_MAP).forEach(c=>{DATA.lines[c]={display:FOCUS_MAP[c],
      type:FOCUS_MAP[c].indexOf('KA')===0?'KA':'CT',focus:true,name:'',emp:''};});
    DATA.daily={};DATA.targets={};DATA.monthly={'2026-11':{}};
    STOREDAILY={data:{}};PJP={out:{},plan:{},done:{},cfg:{}};
    PJ={d:null,line:null,view:'day',ym:null,only:'all',dt:false,map:false,sel:null,open:true,kpi:{}};
    /* หน้า PJP อ่านหลายแหล่งเพื่อบอกว่า "ร้านนี้ต้องทำอะไร" — ต้องมีโครงว่างให้ครบ */
    STORE={months:[],stores:[]};STOREPROD={months:[],cat:{},stores:{},data:{}};
    PSTORE={rounds:{}};EB2B={asof:null,up:0,lines:{},data:{}};
    ANALYTICS={months:[],lines:{},data:{}};
  };
  window.__reset();
 `);
 const load=(n,b64,fn)=>ev(a=>{(a.fn==='plan'?parsePJP:parseOutlet)(a.n,
   Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   return {log:window.__log.slice(),sync:window.__sync};},{n:n,b64:b64,fn:fn||'out'});

 /* ---------- 1) อ่านไฟล์ dcode ---------- */
 const rows1=[
   row({code:'2491011',pjp:'209611',idx:1,name:'แม่กาเหว่า'}),
   row({code:'2491328',pjp:'209611',idx:1,name:'นิรุธ'}),
   row({code:'2491485',pjp:'209611',idx:7,name:'ร้านจุลิน'}),
   row({code:'2490877',pjp:'209616',idx:12,name:'เจ๊กิม',emp:'00016956',rep:'เอกรัตน์ 0954924393'}),
   /* 209697 = KA97 ที่ระบบเก็บเป็น 2096_97 */
   row({code:'2491757',pjp:'209697',idx:4,name:'กิจโชติ',emp:'00022812',rep:'เกษชญานิษฐ์ 0971054393'}),
   /* สายเทเลเซลล์: ใช้แค่ช่อง 01-06 → ต้องวิ่งทุก 7 วัน */
   row({code:'5217607',pjp:'209619',idx:3,fq:'F4',name:'เพ็ทช้อป',emp:'00024616',rep:'ฟาตีมา 0864902439'}),
   row({code:'5218735',pjp:'209619',idx:6,fq:'F4',name:'ปอนด์ เพ็ทช็อป',emp:'00024616',rep:'ฟาตีมา 0864902439'}),
   /* แถว DUMMY ของระบบ — ไม่ใช่ร้านจริง ต้องข้าม */
   row({code:'T0000164400',pjp:'209611',idx:1,sec:'SCDUMMY02096',secN:'SEC_DUMMY_2096',name:'ร้านหลอก'}),
 ];
 const r1=await load('Outlet_Master__PJP_Report_112026.xlsx',mk(rows1));
 const g1=await ev(()=>{
   const ds=Object.keys(PJP.plan).sort();
   return {out:Object.keys(PJP.out).length,dates:ds,
     mon2:PJP.plan['2026-11-02'],mon16:PJP.plan['2026-11-16'],
     ka97:(PJP.plan['2026-11-05']||{})['2096_97'],
     tl:ds.filter(d=>((PJP.plan[d]||{})['209619'])).length,
     ct11:ds.filter(d=>((PJP.plan[d]||{})['209611'])).length,
     stops:pjStops('2026-11-02','209611').map(x=>x.code+':'+x.ord).join(','),
     dummy:!!PJP.out['T0000164400'],
     rec:PJP.out['2491011'],cfg:PJP.cfg,lines:pjLines().join(' ')};});
 t('อ่านไฟล์ dcode ไฟล์เดียวได้ทั้งร้านค้าและแผน',
   g1.out===7&&g1.dates.length>0,g1.out+' ร้าน · '+g1.dates.length+' วัน');
 t('🔑 แถว DUMMY ของระบบไม่ถูกนับเป็นร้าน',!g1.dummy);
 t('🔑 ช่องวัน 01 = จันทร์แรกของเดือน (2 พ.ย. 69)',
   !!(g1.mon2&&g1.mon2['209611']),JSON.stringify(g1.mon2));
 t('🔑 ช่องวัน 01 วิ่งซ้ำอีกรอบ +14 วัน (16 พ.ย.)',
   !!(g1.mon16&&g1.mon16['209611']),JSON.stringify(g1.mon16&&g1.mon16['209611']));
 t('ลำดับวิ่งในวันเดียวกันเรียงตามลำดับแถวในไฟล์',
   g1.stops==='2491011:1,2491328:2',g1.stops);
 t('ช่องวัน 07 = จันทร์สัปดาห์ที่ 2 (9 พ.ย.) ไม่ใช่วันเดียวกับช่อง 01',
   g1.dates.indexOf('2026-11-09')>=0&&String((g1.mon2||{})['209611']).indexOf('2491485')<0,
   g1.dates.slice(0,6).join(' '));
 t('🔑 สาย 209697 เข้าเป็นสาย 2096_97 (KA97) ของเดิม',
   !!g1.ka97&&g1.lines.indexOf('2096_97')>=0&&g1.lines.indexOf('209697')<0,g1.lines);
 t('🔑 สายที่ใช้แค่ช่อง 01-06 (เทเลเซลล์) วิ่งทุก 7 วัน — ไม่ใช่ 14 วัน',
   g1.tl>g1.ct11,'เทเลเซลล์ '+g1.tl+' วัน vs สายปกติ '+g1.ct11+' วัน');
 t('สายปกติได้ 24 ช่องวันที่ต่อเดือน (12 ช่อง × 2 รอบ) ตามหลักการเดิม',
   g1.ct11===4,g1.ct11+' วัน (สายนี้มี 2 ช่องวันในไฟล์ทดสอบ → 4 วันที่)');
 t('เก็บข้อมูลร้านครบ (ชื่อ · สาย · พิกัด · ประเภท · ที่อยู่ · PS · eB2B · รหัสพนักงาน)',
   g1.rec&&g1.rec.n==='แม่กาเหว่า'&&g1.rec.rt==='209611'&&g1.rec.la>13&&g1.rec.lo>100&&
   g1.rec.t&&g1.rec.a&&g1.rec.e==='Yes'&&g1.rec.emp==='00016951'&&g1.rec.pj==='209611',
   JSON.stringify(g1.rec));
 t('เก็บ Section Code และช่องวันไว้บนร้านด้วย',
   g1.rec&&g1.rec.sec==='SC209611F201'&&g1.rec.sday===1,
   (g1.rec||{}).sec+' / '+(g1.rec||{}).sday);
 t('🔑 ระบบจดว่า dcode เริ่ม 17 พ.ย. 2026',
   g1.cfg&&g1.cfg.dcodeStart==='2026-11-17'&&g1.cfg.src==='dcode',JSON.stringify(g1.cfg));
 t('เดือนมาจากชื่อไฟล์ (_112026 → พ.ย. 69)',g1.cfg&&g1.cfg.planMon==='2026-11',g1.cfg&&g1.cfg.planMon);
 t('บันทึกการอัพรายงานว่ากฎ Section Code/Name ตรงกันทุกแถว',
   /ตรงกัน 7\/7 แถว/.test(r1.log.join(' '))&&/✅/.test(r1.log.join(' ')),
   (r1.log[1]||'').slice(0,80));
 t('...และรายงานว่าข้ามแถว DUMMY',/DUMMY/.test(r1.log.join(' ')));
 t('...และบอกสายที่ไม่มีแผนในไฟล์',/ไม่มีแผนในไฟล์/.test(r1.log.join(' ')));
 t('อัพแล้วบันทึกขึ้นเซิร์ฟเวอร์ 1 ครั้ง',r1.sync===1,r1.sync);

 /* ---------- 2) Section Code / Name ไม่ตรงกัน → ต้องฟ้อง ---------- */
 const bad=await ev(a=>{window.__reset();
   parseOutlet('x_112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   return {log:window.__log.join(' | '),n:Object.keys(PJP.out).length};},
   {b64:mk([row({code:'2491011',pjp:'209611',idx:1}),
            /* ช่อง 01 ต้องเป็น MON แต่ไฟล์เขียน FRI → ต้องฟ้อง */
            row({code:'2491012',pjp:'209611',idx:1,secN:'209611_FRI'}),
            /* สายใน Section Code ไม่ตรงกับคอลัมน์ PJP */
            row({code:'2491013',pjp:'209611',idx:2,sec:'SC209699F202'})])});
 t('🛟 Section Name ไม่ตรงกับช่องวัน หรือสายไม่ตรงกับคอลัมน์ PJP → ฟ้องพร้อมตัวอย่าง',
   /ไม่ตรง 2 แถว/.test(bad.log)&&bad.n===3,
   (bad.log.match(/ตรวจกฎ[^|]*/)||[''])[0].slice(0,110));

 /* ---------- 3) ร้านเดิมที่ไม่มีในไฟล์ ห้ามลบ ---------- */
 const keep=await ev(a=>{window.__reset();
   PJP.out['9999999']={n:'ร้านเก่าที่ไฟล์ใหม่ไม่มี',rt:'209613',up:1,la:13.9,lo:100.5};
   PJP.out['2491011']={n:'ชื่อเก่า',rt:'209611',up:1,ph:'021234567',rt2:'x'};
   parseOutlet('x_112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   return {old:PJP.out['9999999'],upd:PJP.out['2491011']};},
   {b64:mk([row({code:'2491011',pjp:'209611',idx:1,name:'ชื่อใหม่'})])});
 t('🛟 ร้านที่ไม่มีในไฟล์ใหม่ต้องยังอยู่ ไม่ถูกลบ',
   keep.old&&keep.old.n==='ร้านเก่าที่ไฟล์ใหม่ไม่มี',JSON.stringify(keep.old));
 t('🛟 ร้านที่มีในไฟล์อัพเดตชื่อใหม่ แต่ของที่ไฟล์ใหม่ไม่มี (เบอร์โทรเก่า) ไม่หาย',
   keep.upd&&keep.upd.n==='ชื่อใหม่'&&keep.upd.ph==='021234567',JSON.stringify(keep.upd));

 /* ---------- 4) แผนเดือนอื่นไม่หาย ---------- */
 const mm=await ev(a=>{window.__reset();
   PJP.plan['2026-10-05']={'209611':'1111111:1'};
   parseOutlet('x_112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   return {oct:PJP.plan['2026-10-05'],nov:!!PJP.plan['2026-11-02']};},
   {b64:mk([row({code:'2491011',pjp:'209611',idx:1})])});
 t('🛟 อัพแผนเดือนใหม่ แผนเดือนเก่าต้องไม่หาย',
   mm.oct&&mm.oct['209611']==='1111111:1'&&mm.nov,JSON.stringify(mm.oct));

 /* ---------- 5) หัวตารางหาย = ฟ้อง ไม่เก็บ ---------- */
 const miss=await ev(a=>{window.__reset();
   PJP.out['5555555']={n:'ของเดิม',rt:'209611',up:1};
   const before=JSON.stringify(PJP);let err='';
   try{parseOutlet('x_112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));}
   catch(e){err=String(e.message||e);}
   return {err:err,same:JSON.stringify(PJP)===before};},
   {b64:mk([row({code:'2491011',pjp:'209611',idx:1})],
           H.map(h=>h==='Section Name'?'Section Label':h))});
 t('🛟 หัวตารางที่จำเป็นหาย → ฟ้องชื่อคอลัมน์ และไม่แตะข้อมูลเดิม',
   /ไม่มีคอลัมน์/.test(miss.err)&&/Section Name/.test(miss.err)&&miss.same,miss.err.slice(0,90));

 /* ---------- 6) อัพที่ปุ่ม "แผน PJP" ก็ได้เหมือนกัน ---------- */
 const viaPlan=await ev(a=>{window.__reset();
   parsePJP('x_112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   return {out:Object.keys(PJP.out).length,dates:Object.keys(PJP.plan).length};},
   {b64:mk([row({code:'2491011',pjp:'209611',idx:1})])});
 /* รอบ F2 = วิ่งซ้ำทุก 14 วัน → ช่องวัน 1 ช่องได้ 2 วันที่ในเดือน */
 t('อัพไฟล์ dcode ที่ปุ่ม "แผน PJP" ก็อ่านได้เหมือนกัน (ปุ่มไหนก็ได้)',
   viaPlan.out===1&&viaPlan.dates===2,viaPlan.out+' ร้าน · '+viaPlan.dates+' วัน');

 /* ---------- 6b) รหัสรอบ F<N> = วิ่ง N ครั้ง/เดือน ---------- */
 const fq=await ev(()=>({f1:pjStepOf('F1',[1]),f2:pjStepOf('F2',[1]),f4:pjStepOf('F4',[1]),
   unk2:pjStepOf('ZZ',[1,7]),unk1:pjStepOf('ZZ',[1,6])}));
 t('🔑 รหัสรอบ F<N> แปลว่าวิ่ง N ครั้ง/เดือน → ซ้ำทุก 28/N วัน',
   fq.f1===28&&fq.f2===14&&fq.f4===7,JSON.stringify(fq));
 t('...รหัสที่ไม่รู้จัก ใช้ช่องวันตัดสิน (มีช่อง 07-12 = 14 วัน · มีแค่ 01-06 = 7 วัน)',
   fq.unk2===14&&fq.unk1===7,'unk2='+fq.unk2+' unk1='+fq.unk1);

 /* ---------- 7) ไฟล์เก่าทั้งสองแบบยังอ่านได้ ---------- */
 const oldO=await ev(a=>{window.__reset();
   parseOutlet('Master_Outlet_Data.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   return {n:Object.keys(PJP.out).length,rec:PJP.out['2491011'],log:window.__log[0]||''};},
   {b64:mkOldOut([['2491011','ร้านเดิม','อ.ปากเกร็ด','100.55','13.90','021234567','MPS','Active']])});
 t('🛟 ไฟล์ Master Outlet แบบเดิมยังอ่านได้',
   oldO.n===1&&oldO.rec&&oldO.rec.n==='ร้านเดิม'&&!/dcode/.test(oldO.log),
   JSON.stringify(oldO.rec));
 const oldP=await ev(a=>{window.__reset();
   parsePJP('PJP_NOV2026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   return {dates:Object.keys(PJP.plan).sort(),log:window.__log[0]||''};},
   {b64:mkOldPjp([['2491011','ร้านเดิม','2026-11-02',1,'209611','F2'],
                  ['2491328','ร้านเดิม2','2026-11-02',2,'209611','F2']])});
 t('🛟 ไฟล์ PJP แบบเดิมยังอ่านได้ และยังสร้างรอบสอง +14 วันให้',
   oldP.dates.join(',')==='2026-11-02,2026-11-16'&&!/dcode/.test(oldP.log),oldP.dates.join(','));

 /* ---------- 8) ร้านที่ยังไม่มีบิลเลย (รายงานของเซลล์) ---------- */
 const nb=await ev(a=>{window.__reset();
   parseOutlet('x_112026.xlsx',Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
   const empty=pjNoBuy('209611');
   /* ก่อน dcode เริ่ม (16 พ.ย.) ต้องไม่ถูกนับ · ตั้งแต่ 17 พ.ย. นับ */
   STOREDAILY.data['2026-11-16']={'2491328':{l:'209611',n:'นิรุธ',cs:1,pc:1,niv:500}};
   const before=pjNoBuy('209611');
   STOREDAILY.data['2026-11-17']={'2491011':{l:'209611',n:'แม่กาเหว่า',cs:1,pc:1,niv:100}};
   const after=pjNoBuy('209611');
   PJ.d='2026-11-02';PJ.view='day';renderPjp();
   const html=document.getElementById('pjpBody').textContent.replace(/\s+/g,' ');
   return {empty:empty,before:before,after:after,html:html};},
   {b64:mk([row({code:'2491011',pjp:'209611',idx:1,name:'แม่กาเหว่า'}),
            row({code:'2491328',pjp:'209611',idx:1,name:'นิรุธ'}),
            row({code:'2491485',pjp:'209611',idx:2,name:'ร้านจุลิน'})])});
 t('ยังไม่มียอดขายในระบบ → ไม่ฟันธงว่าร้านไม่ซื้อ',
   nb.empty.days===0&&nb.empty.total===3,JSON.stringify(nb.empty.days)+' วัน');
 t('🔑 บิลก่อนวันที่ dcode เริ่ม (16 พ.ย.) ไม่ถูกนับ',
   nb.before.days===0&&nb.before.no.length===3,
   nb.before.days+' วัน · ไม่ซื้อ '+nb.before.no.length);
 t('🔑 บิลตั้งแต่ 17 พ.ย. นับ → ร้านที่เปิดบิลแล้วหลุดจากรายการ',
   nb.after.days===1&&nb.after.ok===1&&nb.after.no.length===2&&nb.after.no.indexOf('2491011')<0,
   'เปิดบิล '+nb.after.ok+' · ไม่ซื้อ '+nb.after.no.join(','));
 t('หน้าเซลล์ขึ้นรายการ "ร้านที่ยังไม่มีบิลเลย" พร้อมรหัสและชื่อร้าน',
   /ร้านที่ยังไม่มีบิลเลย/.test(nb.html)&&/รหัส 2491328/.test(nb.html)&&/ร้านจุลิน/.test(nb.html),
   nb.html.slice(nb.html.indexOf('ยังไม่มีบิล'),nb.html.indexOf('ยังไม่มีบิล')+150));
 t('...และบอกว่านับจากช่วงไหน พร้อมวันที่ dcode เริ่ม',
   /dcode เริ่มใช้/.test(nb.html)&&/17 พ.ย. 2569/.test(nb.html));

 /* ---------- 9) ไฟล์จริง (ถ้ามีในเครื่อง — ไม่อยู่ในรีโป) ---------- */
 const REAL=process.env.DCODE_PJP;
 if(REAL&&fs.existsSync(REAL)){
   const raw=XLSX.readFile(REAL);
   const aoa=XLSX.utils.sheet_to_json(raw.Sheets[raw.SheetNames[0]],{header:1,raw:true,defval:null});
   const data=aoa.slice(1).filter(r=>r&&r[C.code]&&String(r[0]||'').indexOf('Applied filters')!==0);
   const real=data.filter(r=>!/DUMMY/i.test(String(r[C.sec]||''))).length;
   const got=await ev(a=>{window.__reset();
     parseOutlet('Outlet_Master__PJP_Report_112026.xlsx',
       Uint8Array.from(atob(a.b64),c=>c.charCodeAt(0)));
     return {n:Object.keys(PJP.out).length,log:window.__log.join(' | '),
       dates:Object.keys(PJP.plan).length};},
     {b64:fs.readFileSync(REAL).toString('base64')});
   t('📄 ไฟล์จริง: อ่านร้านครบ (ตัดแถว DUMMY)',got.n===real,got.n+' / '+real);
   t('📄 ไฟล์จริง: กฎ Section Code/Name ตรงกันทุกแถว',
     /ตรงกัน ([\d,]+)\/\1 แถว/.test(got.log.replace(/,/g,''))||
     new RegExp('ตรงกัน '+real.toLocaleString()+'/'+real.toLocaleString()).test(got.log),
     (got.log.match(/ตรวจกฎ[^|]*/)||[''])[0].slice(0,80));
   console.log('   (ไฟล์จริง: '+got.n+' ร้าน · '+got.dates+' วัน)');
 }else{
   console.log('  (ข้าม 2 เช็คของไฟล์จริง — ตั้ง DCODE_PJP=/path/Outlet_Master__PJP_Report.xlsx)');
 }

 let bad2=0;A.forEach(([c,n,x])=>{if(!c)bad2++;console.log((c?'  ✓ ':'  ✗ FAIL: ')+n.replace(/<[^>]*>/g,'')+(x&&!c?' → '+x:''));});
 const re=errs.filter(e=>!/localStorage/.test(e));
 if(re.length){console.log('PAGE ERRORS:');re.forEach(e=>console.log('   '+e));bad2+=re.length;}
 await b.close();
 console.log('\n'+(bad2?bad2+' FAILED of '+A.length:'ALL PASS ('+A.length+' checks)'));
 process.exit(bad2?1:0);
})();
