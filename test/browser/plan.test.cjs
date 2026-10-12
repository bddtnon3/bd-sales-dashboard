/* PLANNER — ปฏิทินงานร่วมกัน (แท็บ 🗓 ปฏิทินงาน)
   ตรวจทั้งหน้าตา (ช่องวัน/คอลัมน์/ล้นกรอบ) และตรรกะ (งานซ้ำ งานหลายวัน สิทธิ์ ติ๊กเสร็จ ลบ) */
const fs=require('fs');const path=require('path');
/* ต้องติดตั้งก่อน (ไม่ได้อยู่ใน package.json เพราะใช้เฉพาะตอนเทสต์):
     npm i --no-save playwright-core
   แล้วรัน:  node build.cjs && node test/browser/plan.test.cjs   */
const {chromium}=require('playwright-core');
const BROWSER=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PAGE=path.resolve(__dirname,'..','..','public','index.html');
const boot=`
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};
  window.__posts=[];window.__alerts=[];
  window.alert=m=>window.__alerts.push(String(m));
  window.confirm=()=>true;
  window.fetch=(u,o)=>{window.__posts.push({u:u,body:JSON.parse((o&&o.body)||'{}')});
    return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({ok:true})});};
  TOKEN='test-token';
  DATA.lines={'209611':{display:'CT11',name:'ก'},'209612':{display:'CT12',name:'ข'},'209613':{display:'CT13',name:'ค'}};
  DATA.focus_order=['209611','209612','209613'];
`;
/* วันนี้สมมติ = 2026-10-02 (ศุกร์) — ให้ผลเทสต์นิ่ง ไม่ขึ้นกับวันจริง */
const TODAY='2026-10-02';
const seed=`
  window.todayISO=()=>'${TODAY}';
  PLAN={items:{
    pDead:{t:'ส่ง PO รอบ 15',d:'2026-10-15',d2:'',tm:'09:00',cat:'deadline',lines:[],note:'เตรียมยอดขาย',by:'manager',byName:'ผู้จัดการ',at:1,up:1},
    pLate:{t:'ส่งรายงานเดือน ก.ย.',d:'2026-09-30',d2:'',tm:'',cat:'deadline',lines:[],note:'',by:'manager',byName:'ผู้จัดการ',at:1,up:1},
    pToday:{t:'ประชุมเซลล์เช้า',d:'${TODAY}',d2:'',tm:'08:30',cat:'meet',lines:[],note:'',by:'manager',byName:'ผู้จัดการ',at:1,up:1},
    pSpan:{t:'โปรโมชั่น Lux',d:'2026-10-05',d2:'2026-10-09',tm:'',cat:'promo',lines:[],note:'',by:'manager',byName:'ผู้จัดการ',at:1,up:1},
    pWeek:{t:'เช็คสต็อกรายสัปดาห์',d:'2026-10-05',d2:'',tm:'',cat:'task',lines:[],note:'',by:'manager',byName:'ผู้จัดการ',rep:'w',repTo:'',at:1,up:1},
    pMon:{t:'นับสต็อกสิ้นเดือน',d:'2026-01-31',d2:'',tm:'',cat:'task',lines:[],note:'',by:'manager',byName:'ผู้จัดการ',rep:'m',repTo:'',at:1,up:1},
    pCt11:{t:'เก็บเงินร้านค้าง',d:'2026-10-07',d2:'',tm:'',cat:'task',lines:['209611'],note:'',by:'209611',byName:'CT11 · ก',at:1,up:1},
    pCt12:{t:'เปิดร้านใหม่ 3 ร้าน',d:'2026-10-07',d2:'',tm:'',cat:'task',lines:['209612'],note:'',by:'209612',byName:'CT12 · ข',at:1,up:1},
    /* สองอันนี้มีไว้ให้วันที่ 7 มีงานครบ 5 รายการ (เทสต์ "+N งาน" ในช่องปฏิทิน)
       ⚠️ ต้องเป็นหมวด "งาน" จริง ไม่ใช่ holiday — วันหยุดไม่มีช่องติ๊ก เทสต์สิทธิ์จะพัง
       และต้องเป็น promo ไม่ใช่ task — plOcc เรียงตามลำดับหมวดใน PL_CATS ถ้าใช้ task
       สองอันนี้จะแซงขึ้นไปอยู่ 3 ชิพแรกของช่องวัน แล้ว "เปิดร้านใหม่" จะถูกซ่อนหลัง "+2 งาน" */
    pFull:{t:'งานที่ 4 ของวันที่ 7',d:'2026-10-07',d2:'',tm:'',cat:'promo',lines:[],note:'',by:'manager',byName:'ผู้จัดการ',at:1,up:1},
    pFull2:{t:'งานที่ 5 ของวันที่ 7',d:'2026-10-07',d2:'',tm:'',cat:'promo',lines:[],note:'',by:'manager',byName:'ผู้จัดการ',at:1,up:1}
  },done:{},del:{}};
  PL={ym:'2026-10',view:'mon',scope:'all',day:null,edit:null,cat:'task',lines:[],showDone:false};
`;
const mgr=`S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
  document.querySelectorAll('.admin-upload').forEach(e=>e.style.display='');`;
const ct11=`S.user={id:'ct11',role:'sales',code:'209611',name:'CT11 · ก'};
  document.querySelectorAll('.sales-only').forEach(e=>e.style.display='');`;

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const W=+(process.env.W||1280);
 const pg=await (await b.newContext({viewport:{width:W,height:1000}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.setContent(fs.readFileSync(PAGE,'utf8'),{waitUntil:'domcontentloaded'});
 await pg.evaluate(boot+seed+mgr+`_switchTab('plan');renderPlan();`);

 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=f=>pg.evaluate(f);

 /* ---------- 1) โครงปฏิทินเดือน ---------- */
 const g=await ev(()=>({
   dow:[...document.querySelectorAll('#plMain .pl-dow')].map(x=>x.textContent),
   cells:document.querySelectorAll('#plMain .pl-cell').length,
   mon:document.getElementById('plMon').textContent,
   first:document.querySelector('#plMain .pl-cell .pl-dnum').textContent,
   today:[...document.querySelectorAll('#plMain .pl-cell.today .pl-dnum')].map(x=>x.textContent),
   out:document.querySelectorAll('#plMain .pl-cell.out').length,
 }));
 t('หัวตารางเริ่มวันจันทร์ 7 วัน',g.dow.join(',')==='จ,อ,พ,พฤ,ศ,ส,อา',g.dow.join(','));
 t('ช่องวันเป็นจำนวนเท่าของ 7 (ตารางไม่แหว่ง)',g.cells%7===0&&g.cells>=35,g.cells);
 t('ชื่อเดือนถูก',/ต\.ค\. 2569/.test(g.mon),g.mon);
 t('1 ต.ค. 2569 เป็นวันพฤหัส → ช่องแรกของตารางคือ 28 (ก.ย.)',g.first==='28',g.first);
 t('ช่องวันนี้ถูกไฮไลต์ช่องเดียว และบอกว่า "วันนี้"',g.today.length===1&&/^2วันนี้$/.test(g.today[0]),JSON.stringify(g.today));
 t('วันของเดือนอื่นถูกทำให้จาง',g.out>0,g.out);

 /* ---------- 2) งานหลายวัน + งานซ้ำ ---------- */
 const d = await ev(()=>{
   const cellOf=day=>[...document.querySelectorAll('#plMain .pl-cell')]
     .find(c=>c.getAttribute('onclick')==="plPickDay('"+day+"')");
   const txt=day=>{const c=cellOf(day);return c?c.innerText.replace(/\\n/g,' | '):'(ไม่มีช่อง)';};
   return {d5:txt('2026-10-05'),d7:txt('2026-10-07'),d9:txt('2026-10-09'),d10:txt('2026-10-10'),
           d12:txt('2026-10-12'),d31:txt('2026-10-31'),d15:txt('2026-10-15'),
           chips7:(cellOf('2026-10-07')||{}).querySelectorAll?cellOf('2026-10-07').querySelectorAll('.pl-chip').length:-1};
 });
 t('งานช่วงวัน (5–9 ต.ค.) ขึ้นทั้งวันเริ่ม',/โปรโมชั่น Lux/.test(d.d5),d.d5);
 t('...และขึ้นวันสุดท้ายของช่วงด้วย',/โปรโมชั่น Lux/.test(d.d9),d.d9);
 t('...แต่ไม่เลยช่วงไปวันที่ 10',!/โปรโมชั่น Lux/.test(d.d10),d.d10);
 t('งานซ้ำทุกสัปดาห์โผล่ในสัปดาห์ถัดไป (5 → 12 ต.ค.)',/เช็คสต็อกรายสัปดาห์/.test(d.d12),d.d12);
 t('งานซ้ำทุกเดือนที่เริ่ม 31 ม.ค. มาโผล่ 31 ต.ค.',/นับสต็อกสิ้นเดือน/.test(d.d31),d.d31);
 t('วันที่มีงานเกิน 3 ขึ้นป้ายสูงสุด 3 อัน',d.chips7===3,d.chips7);
 /* บนมือถือป้ายงานย่อเป็นแถบสี (ตั้งใจ) ข้อความ "+N งาน" จึงซ่อนไว้ — เช็กเฉพาะจอกว้าง */
 if(W>640)t('...และบอกว่ามีอีกกี่งาน',/\+2 งาน/.test(d.d7),d.d7);
 else t('มือถือ: ป้ายงานย่อเป็นแถบสี (กดวันเพื่อดูรายละเอียด)',
   await ev(()=>getComputedStyle(document.querySelector('#plMain .pl-chip')).fontSize)==='0px');

 /* ---------- 2b) งานซ้ำรายเดือนต้องยึดวันที่เดิม ไม่หุบลงเรื่อย ๆ ---------- */
 const rec = await ev(()=>{
   const occ=d=>plOccur({t:'x',d:d,rep:'m'},'2026-01-01','2026-12-31').map(o=>o.date);
   const wk=plOccur({t:'x',d:'2026-10-05',rep:'w'},'2026-10-01','2026-10-31').map(o=>o.date);
   const cap=plOccur({t:'x',d:'2026-10-05',rep:'w',repTo:'2026-10-19'},'2026-10-01','2026-12-31').map(o=>o.date);
   const one=plOccur({t:'x',d:'2026-10-05'},'2026-10-01','2026-12-31').map(o=>o.date);
   const past=plOccur({t:'x',d:'2020-01-06',rep:'w'},'2026-10-01','2026-10-31').length;
   return {m31:occ('2026-01-31'),m30:occ('2026-01-30'),m15:occ('2026-03-15'),
           wk:wk,cap:cap,one:one,past:past};
 });
 t('งานวันที่ 31 ซ้ำทุกเดือน: ก.พ. หุบเป็น 28 แต่ มี.ค. กลับเป็น 31',
   rec.m31.join(',')==='2026-01-31,2026-02-28,2026-03-31,2026-04-30,2026-05-31,2026-06-30,2026-07-31,2026-08-31,2026-09-30,2026-10-31,2026-11-30,2026-12-31',
   rec.m31.join(','));
 t('งานวันที่ 30 ซ้ำทุกเดือน: ก.พ. หุบเป็น 28 แล้วกลับเป็น 30',
   rec.m30[1]==='2026-02-28'&&rec.m30[2]==='2026-03-30',rec.m30.slice(0,4).join(','));
 t('งานวันที่ 15 ซ้ำทุกเดือน ได้ 10 รอบจาก มี.ค. ถึง ธ.ค.',rec.m15.length===10&&rec.m15[0]==='2026-03-15',rec.m15.join(','));
 t('ซ้ำทุกสัปดาห์ในเดือน ต.ค. ได้ 5,12,19,26',rec.wk.join(',')==='2026-10-05,2026-10-12,2026-10-19,2026-10-26',rec.wk.join(','));
 t('"ซ้ำถึงวันที่" หยุดตามที่กำหนด',rec.cap.join(',')==='2026-10-05,2026-10-12,2026-10-19',rec.cap.join(','));
 t('งานไม่ซ้ำมีรอบเดียว',rec.one.join(',')==='2026-10-05',rec.one.join(','));
 t('งานซ้ำที่เริ่มปี 2563 ไม่ทำให้ช้า/บวม (เหลือ 4 รอบในเดือนที่ดู)',rec.past===4,rec.past);

 /* ---------- 3) การ์ดสรุป + badge บนแท็บ ---------- */
 const c = await ev(()=>({cards:[...document.querySelectorAll('#plCards .card')].map(x=>x.innerText.replace(/\n/g,'|')),
                          badge:document.getElementById('planBadge').innerText,
                          bar:document.getElementById('plBar').innerText}));
 t('การ์ด "เลยกำหนดแล้ว" นับงาน 30 ก.ย. ได้ 1',/เลยกำหนดแล้ว\|1\|/.test(c.cards[0]),c.cards[0]);
 t('...ไม่นับงานประจำที่ตกรอบไปแล้ว (ไม่งั้นจะขึ้นเป็นสิบรายการ)',!/เลยกำหนดแล้ว\|[2-9]/.test(c.cards[0]),c.cards[0]);
 t('การ์ด "วันนี้" นับได้ 1 (ประชุมเซลล์เช้า)',/วันนี้\|1\|/.test(c.cards[1]),c.cards[1]);
 t('การ์ด 7 วันข้างหน้า นับงานที่ยังไม่เสร็จ',/\|[1-9]\d?\|/.test(c.cards[2]),c.cards[2]);
 t('แท็บขึ้นตัวเลขงานค้าง',/^[1-9]/.test(c.badge.trim()),JSON.stringify(c.badge));
 t('แถบบนบอกว่าทุกคนเห็นตารางเดียวกัน',/ทุกคนเห็นตารางเดียวกัน/.test(c.bar),c.bar.slice(0,90));
 t('...และบอก manager ว่าแก้ได้ทุกงาน',/แก้ได้ทุกงาน/.test(c.bar));

 /* ---------- 4) กดวัน → เห็นรายการของวันนั้น ---------- */
 const day = await ev(()=>{plPickDay('2026-10-07');
   return {shown:document.getElementById('plDay').style.display!=='none',
           txt:document.getElementById('plDay').innerText.replace(/\n/g,' | '),
           items:document.querySelectorAll('#plDay .pl-item').length,
           edits:document.querySelectorAll('#plDay .pl-edit').length};});
 t('กดช่องวันแล้วแผงรายการของวันนั้นเปิดขึ้น',day.shown);
 t('...ขึ้นครบทุกงานของวันนั้น (5 งาน)',day.items===5,day.items);
 t('...บอกวันในสัปดาห์เป็นภาษาไทย',/วันพุธ/.test(day.txt),day.txt.slice(0,60));
 t('manager แก้ได้ทุกงาน (ปุ่มแก้ไขครบทุกแถว)',day.edits===5,day.edits);
 t('...มีปุ่มเพิ่มงานของวันนั้น',/เพิ่มงานวันที่ 7\/10/.test(day.txt),day.txt.slice(-90));

 /* ---------- 5) ติ๊กเสร็จ / ยกเลิกติ๊ก ---------- */
 const tick = await ev(()=>{
   window.__posts=[];
   plTick('pCt11','2026-10-07');
   const a=JSON.parse(JSON.stringify(PLAN.done));
   plTick('pCt11','2026-10-07');
   return {first:a,second:JSON.parse(JSON.stringify(PLAN.done)),posts:window.__posts.length,
           cls:document.querySelectorAll('#plDay .pl-item.done').length};
 });
 t('ติ๊กเสร็จเขียน v:1 คู่กับวันที่ของรอบนั้น',tick.first['pCt11|2026-10-07'].v===1,JSON.stringify(tick.first));
 t('ยกเลิกติ๊กเขียน v:0 ไม่ใช่ลบ key (ไม่งั้นเซิร์ฟเวอร์จะพาค่าเดิมกลับ)',
   tick.second['pCt11|2026-10-07'].v===0&&('pCt11|2026-10-07' in tick.second),JSON.stringify(tick.second));
 t('manager ติ๊กผ่าน api/save ไม่ยิง /api/plan',tick.posts===0,tick.posts);

 /* ---------- 6) กรองเฉพาะสายของฉัน ---------- */
 const sc = await ev(()=>{plSetScope('me');const all=document.getElementById('plMain').innerText;
   plSetScope('all');return {me:all,bar:document.getElementById('plBar').innerText};});
 t('manager กด "สายของฉัน" ยังเห็นงานทุกสาย (ไม่มีสายของตัวเอง)',
   /เก็บเงินร้านค้าง/.test(sc.me)&&/เปิดร้านใหม่/.test(sc.me));

 /* ---------- 7) ฟอร์มเพิ่มงาน ---------- */
 const form = await ev(()=>{
   window.__alerts=[];window.__posts=[];
   plOpen(null,'2026-10-20');
   const has=!!document.querySelector('.pl-mask');
   const dv=document.getElementById('plD').value;
   plSaveForm();                                   /* ยังไม่ใส่ชื่อ — ต้องเตือน ไม่บันทึก */
   const warned=window.__alerts.length;
   const n0=Object.keys(PLAN.items).length;
   document.getElementById('plT').value='ตรวจบิลค้างชำระ';
   plSetCat('deadline');plToggleLine('209612');
   document.getElementById('plNote').value='พิมพ์รายชื่อร้านมาด้วย';
   plSaveForm();
   const added=Object.keys(PLAN.items).filter(k=>PLAN.items[k].t==='ตรวจบิลค้างชำระ');
   const it=PLAN.items[added[0]]||{};
   return {has:has,dv:dv,warned:warned,n0:n0,closed:!document.querySelector('.pl-mask'),
           it:it,n1:Object.keys(PLAN.items).length,posts:window.__posts.length};
 });
 t('กด "เพิ่มงาน" เปิดกล่องกรอก',form.has);
 t('...วันที่ถูกเติมมาจากวันที่กดไว้แล้ว',form.dv==='2026-10-20',form.dv);
 t('ไม่ใส่ชื่องาน = เตือนและไม่บันทึก',form.warned===1&&form.n0===10,form.warned+' / '+form.n0);
 t('บันทึกแล้วได้งานใหม่ 1 รายการ',form.n1===11,form.n1);
 t('...เก็บชื่อ วันที่ ประเภท และสายที่เลือกไว้ถูก',
   form.it.t==='ตรวจบิลค้างชำระ'&&form.it.d==='2026-10-20'&&form.it.cat==='deadline'&&
   (form.it.lines||[]).join()==='209612',JSON.stringify(form.it));
 t('...บันทึกชื่อคนสร้างไว้ด้วย',form.it.by==='manager'&&/ผู้จัดการ/.test(form.it.byName||''),form.it.by);
 t('...และปิดกล่องให้เอง',form.closed);

 /* ---------- 8) ลบงาน = tombstone ---------- */
 const del = await ev(()=>{
   const id=Object.keys(PLAN.items).find(k=>PLAN.items[k].t==='ตรวจบิลค้างชำระ');
   plDelete(id);
   return {gone:!PLAN.items[id],tomb:!!(PLAN.del||{})[id],n:Object.keys(PLAN.items).length,
           others:!!PLAN.items.pDead&&!!PLAN.items.pCt11};
 });
 t('ลบแล้วหายจากรายการ',del.gone&&del.n===10,del.n);
 t('...และทิ้ง tombstone ไว้ให้เซิร์ฟเวอร์ (ไม่ใช่ลบ key เฉย ๆ)',del.tomb);
 t('...งานอื่นไม่ถูกแตะ',del.others);

 /* ---------- 9) มุมมองรายการ ---------- */
 const list = await ev(()=>{plSetView('list');
   const txt=document.getElementById('plMain').innerText;
   return {txt:txt,heads:[...document.querySelectorAll('#plMain .pl-dayh')].map(x=>x.innerText.replace(/\n/g,' ')),
           late:document.querySelectorAll('#plMain .pl-dayh.late').length};});
 t('มุมมองรายการมีหัวข้อ "เลยกำหนดแล้ว" อยู่บนสุด',list.late===1&&/เลยกำหนด/.test(list.heads[0]),list.heads[0]);
 t('...แล้วไล่เป็นวัน ๆ โดยวันนี้ขึ้นว่า "วันนี้"',/^วันนี้/.test(list.heads[1]||''),list.heads[1]);
 t('...และมีคำว่า "พรุ่งนี้" เมื่อมีงานพรุ่งนี้ หรือข้ามไปวันถัดไปที่มีงาน',list.heads.length>=3,list.heads.length);
 t('...งานเลยกำหนดคือรายงานเดือน ก.ย.',/ส่งรายงานเดือน ก\.ย\./.test(list.txt));

 /* ---------- 10) สิทธิ์ฝั่งเซลล์ ---------- */
 await pg.evaluate(ct11+`PL.view='mon';PL.scope='all';PL.day='2026-10-07';renderPlan();`);
 const s1 = await ev(()=>({
   bar:document.getElementById('plBar').innerText,
   rows:[...document.querySelectorAll('#plDay .pl-item')].map(r=>({
     t:r.querySelector('.pl-t').innerText,
     canEdit:!!r.querySelector('.pl-edit'),
     canTick:!r.querySelector('.pl-tick').disabled})),
 }));
 const row=n=>s1.rows.find(r=>r.t===n)||{};
 t('เซลล์เห็นงานของทุกสายในปฏิทินรวม',s1.rows.length===5,s1.rows.length);
 t('แถบบนบอกเซลล์ว่าแก้ได้เฉพาะงานที่ตัวเองสร้าง',/แก้\/ลบได้เฉพาะงานที่คุณสร้าง/.test(s1.bar),s1.bar.slice(0,120));
 t('CT11 แก้งานของตัวเองได้',row('เก็บเงินร้านค้าง').canEdit===true,JSON.stringify(row('เก็บเงินร้านค้าง')));
 t('CT11 แก้งานของ CT12 ไม่ได้',row('เปิดร้านใหม่ 3 ร้าน').canEdit===false,JSON.stringify(row('เปิดร้านใหม่ 3 ร้าน')));
 t('CT11 แก้งานของ manager ไม่ได้',row('งานที่ 4 ของวันที่ 7').canEdit===false);
 t('CT11 ติ๊กงานของตัวเองได้',row('เก็บเงินร้านค้าง').canTick===true);
 t('CT11 ติ๊กงานที่ระบุ "ทุกคน" ได้',row('งานที่ 4 ของวันที่ 7').canTick===true);
 t('CT11 ติ๊กงานของสาย CT12 ไม่ได้',row('เปิดร้านใหม่ 3 ร้าน').canTick===false);

 const guard = await ev(()=>{
   window.__alerts=[];window.__posts=[];
   plOpen('pCt12','2026-10-07');                    /* งานของสายอื่น */
   const blocked=!document.querySelector('.pl-mask')&&window.__alerts.length===1;
   plTick('pCt12','2026-10-07');
   const noTick=!(PLAN.done||{})['pCt12|2026-10-07'];
   plTick('pCt11','2026-10-07');
   return {blocked:blocked,noTick:noTick,posts:window.__posts.map(p=>({u:p.u,act:p.body.act})),
           alerts:window.__alerts};
 });
 t('กดแก้งานของสายอื่นถูกปฏิเสธและขึ้นคำอธิบาย',guard.blocked,JSON.stringify(guard.alerts));
 t('ติ๊กงานของสายอื่นไม่ถูกบันทึก',guard.noTick);
 t('เซลล์บันทึกผ่าน /api/plan (ไม่ใช่เซฟทั้งก้อน)',
   guard.posts.length===1&&guard.posts[0].u==='/api/plan'&&guard.posts[0].act==='done',JSON.stringify(guard.posts));

 const sAdd = await ev(()=>{
   window.__posts=[];
   plOpen(null,'2026-10-22');
   document.getElementById('plT').value='ไปพบร้านใหม่ 5 ร้าน';
   plSaveForm();
   const id=Object.keys(PLAN.items).find(k=>PLAN.items[k].t==='ไปพบร้านใหม่ 5 ร้าน');
   return {by:PLAN.items[id].by,byName:PLAN.items[id].byName,
           posts:window.__posts.map(p=>({u:p.u,act:p.body.act,by:(p.body.item||{}).by}))};
 });
 t('เซลล์เพิ่มงานเองได้ และงานนั้นเป็นของสายตัวเอง',sAdd.by==='209611'&&/CT11/.test(sAdd.byName),sAdd.by+' / '+sAdd.byName);
 t('...ยิงไป /api/plan ด้วย act=save',sAdd.posts.length===1&&sAdd.posts[0].act==='save',JSON.stringify(sAdd.posts));

 /* ---------- 11) หน้าตา: ไม่ล้นกรอบ ไม่มี NaN ---------- */
 const look = await ev(()=>{
   PL.view='mon';renderPlan();
   const over=[];
   document.querySelectorAll('#planView *').forEach(n=>{
     const r=n.getBoundingClientRect();if(!r.width)return;
     const st=getComputedStyle(n);
     if(st.overflowX==='auto'||st.overflowX==='scroll')return;      /* เลื่อนเองได้ */
     if(st.textOverflow==='ellipsis')return;                        /* ตั้งใจตัดท้ายด้วย … */
     if(n.scrollWidth>Math.ceil(r.width)+1)over.push((n.className||n.tagName)+' '+n.scrollWidth+'>'+Math.round(r.width));
   });
   /* ช่องวันทุกช่องต้องกว้างเท่ากัน (ตารางไม่เบี้ยว) */
   const ws=[...document.querySelectorAll('#plMain .pl-cell')].map(c=>Math.round(c.getBoundingClientRect().width));
   const uniq=[...new Set(ws)];
   return {over:over,wUniq:uniq,body:document.body.scrollWidth,win:window.innerWidth,
           txt:document.getElementById('planView').innerText};
 });
 t('ไม่มีตัวหนังสือล้นออกนอกกรอบ',look.over.length===0,look.over.slice(0,4).join(' ; '));
 t('ช่องวันกว้างเท่ากันทุกช่อง',look.wUniq.length<=2,JSON.stringify(look.wUniq));
 t('หน้าไม่กว้างเกินจอ',look.body<=look.win+1,look.body+' vs '+look.win);
 t('ไม่มี NaN / undefined / Invalid Date บนหน้าจอ',!/NaN|undefined|Invalid/.test(look.txt));

 /* ---------- 12) ปุ่มเดือน + วันนี้ ---------- */
 const nav = await ev(()=>{const out=[];
   plMove(1);out.push(PL.ym);plMove(1);out.push(PL.ym);plMove(1);out.push(PL.ym);
   plMove(-5);out.push(PL.ym);plToday();out.push(PL.ym+'/'+PL.day);
   return out;});
 t('เลื่อนเดือนข้ามปีได้ถูก',nav.slice(0,4).join(',')==='2026-11,2026-12,2027-01,2026-08',nav.join(','));
 t('ปุ่ม "วันนี้" กลับมาเดือนและวันของวันนี้',nav[4]==='2026-10/'+'2026-10-02',nav[4]);

 /* ---------- 13) ปฏิทินว่าง ---------- */
 const empty = await ev(()=>{PLAN={items:{},done:{},del:{}};PL.day=null;PL.view='list';renderPlan();
   const l=document.getElementById('plMain').innerText;
   PL.view='mon';renderPlan();
   return {list:l,mon:document.querySelectorAll('#plMain .pl-cell').length,
           cards:document.querySelectorAll('#plCards .card').length,
           badge:document.getElementById('planBadge').innerText};});
 t('ไม่มีงานเลย → บอกให้กดเพิ่มงาน',/กด.*เพิ่มงาน/.test(empty.list),empty.list.slice(0,110));
 t('...ปฏิทินยังวาดได้ปกติ',empty.mon%7===0&&empty.mon>=35,empty.mon);
 t('...การ์ดสรุปยังอยู่ 4 ใบ',empty.cards===4,empty.cards);
 t('...แท็บไม่ขึ้นตัวเลขค้าง',empty.badge.trim()==='',JSON.stringify(empty.badge));

 /* ---------- 🌴 วันหยุดต้องไม่ถูกนับเป็นงาน ----------
    เจ้าของแจ้ง 12 ต.ค. 69: วันหยุดวันที่ 10 ขึ้นทั้ง "เลยกำหนดแล้ว" และ "7 วันข้างหน้า"
    วันหยุดไม่มีใครต้องทำให้เสร็จ จึงต้องไม่เตือน แต่ต้องยังเห็นบนปฏิทิน */
 const holi=await pg.evaluate(()=>{
   window.todayISO=()=>'2026-10-12';
   PLAN={items:{
     hPast:{t:'วันหยุดชดเชย',d:'2026-10-10',d2:'',tm:'',cat:'holiday',lines:[],note:'',by:'manager',byName:'ผู้จัดการ',at:1,up:1},
     hToday:{t:'วันหยุดวันนี้',d:'2026-10-12',d2:'',tm:'',cat:'holiday',lines:[],note:'',by:'manager',byName:'ผู้จัดการ',at:1,up:1},
     hSoon:{t:'วันปิยมหาราช',d:'2026-10-23',d2:'',tm:'',cat:'holiday',lines:[],note:'',by:'manager',byName:'ผู้จัดการ',at:1,up:1},
     hSpan:{t:'สงกรานต์',d:'2026-10-14',d2:'2026-10-16',tm:'',cat:'holiday',lines:[],note:'',by:'manager',byName:'ผู้จัดการ',at:1,up:1},
     wPast:{t:'ส่งรายงานค้าง',d:'2026-10-10',d2:'',tm:'',cat:'deadline',lines:[],note:'',by:'manager',byName:'ผู้จัดการ',at:1,up:1},
     wSoon:{t:'ประชุมเซลล์',d:'2026-10-14',d2:'',tm:'',cat:'meet',lines:[],note:'',by:'manager',byName:'ผู้จัดการ',at:1,up:1},
   },done:{},del:{}};
   PL.ym='2026-10';PL.view='list';PL.scope='all';PL.pjLine='';PL.day=null;PL.showDone=false;
   _switchTab('plan');renderPlan();
   const cards=[...document.querySelectorAll('#plCards .card')].map(c=>({
     k:c.querySelector('.k').innerText.trim(),v:c.querySelector('.v').innerText.trim(),
     s:c.querySelector('.s').innerText.trim()}));
   const main=document.getElementById('plMain').innerText.replace(/\s+/g,' ');
   /* เก็บเฉพาะรายการที่อยู่ "ใต้หัวข้อเลยกำหนดแล้ว" จริง ๆ — เดินใน DOM ไม่ใช่ตัดข้อความ */
   const lateNames=[];
   {let n=document.querySelector('#plMain .pl-dayh.late');
    for(n=n&&n.nextElementSibling;n&&!n.classList.contains('pl-dayh');n=n.nextElementSibling)
      if(n.classList.contains('pl-item'))lateNames.push(n.querySelector('.pl-t').innerText.trim());}
   const items=[...document.querySelectorAll('#plMain .pl-item')];
   const pick=re=>items.find(x=>re.test(x.innerText))||null;
   const holiRow=pick(/สงกรานต์/);            /* วันหยุดที่ยังมาไม่ถึง ต้องขึ้นในรายการ */
   const workRow=pick(/ประชุมเซลล์/);
   PL.view='mon';renderPlan();
   const mon=document.getElementById('plMain').innerText.replace(/\s+/g,' ');
   PL.view='list';renderPlan();
   return {cards,main,lateNames,mon,
     badge:(document.getElementById('planBadge')||{}).innerText||'',
     holiHasTick:holiRow?!!holiRow.querySelector('.pl-tick'):null,
     holiHasIcon:holiRow?!!holiRow.querySelector('.pl-holi-ic'):null,
     workHasTick:workRow?!!workRow.querySelector('.pl-tick'):null};
 });
 const card=k=>(holi.cards.find(c=>c.k.includes(k))||{}).v;
 t('⚠️ วันหยุดที่ผ่านไปแล้วไม่ถูกนับเป็น "เลยกำหนดแล้ว"',card('เลยกำหนด')==='1',
   card('เลยกำหนด')+' (ควรเป็น 1 = เฉพาะงานจริง)');
 t('...และไม่โผล่ในรายการเลยกำหนด',holi.lateNames.indexOf('วันหยุดชดเชย')<0,holi.lateNames.join(' | '));
 t('...แต่งานจริงของวันเดียวกันยังขึ้นเลยกำหนดเหมือนเดิม',
   holi.lateNames.length===1&&holi.lateNames[0]==='ส่งรายงานค้าง',holi.lateNames.join(' | '));
 t('⚠️ วันหยุดวันนี้ไม่ถูกนับในการ์ด "วันนี้"',card('วันนี้')==='0',card('วันนี้'));
 t('⚠️ วันหยุดใน 7 วันข้างหน้าไม่ถูกนับ (นับแต่งานจริง)',card('7 วันข้างหน้า')==='1',
   card('7 วันข้างหน้า')+' (ควรเป็น 1 = ประชุมเซลล์)');
 t('...แต่ยังบอกว่าวันหยุดถัดไปวันไหน',/วันหยุดถัดไป/.test((holi.cards.find(c=>c.k.includes('7 วัน'))||{}).s||''),
   (holi.cards.find(c=>c.k.includes('7 วัน'))||{}).s);
 t('⚠️ วันหยุดหลายวัน (ช่วงคร่อมวันนี้) ก็ไม่ถูกนับ',card('เลยกำหนด')==='1'&&card('วันนี้')==='0');
 t('⚠️ เลขแดงบนแท็บไม่นับวันหยุด',holi.badge.trim()==='1',JSON.stringify(holi.badge));
 t('วันหยุดที่ยังมาไม่ถึงยังขึ้นในรายการให้เห็นอยู่ (แค่ไม่เตือน)',/สงกรานต์/.test(holi.main));
 t('วันหยุดที่ผ่านไปแล้วไม่ค้างอยู่ในรายการที่ต้องทำ',!/วันหยุดชดเชย/.test(holi.main),holi.main.slice(0,120));
 t('วันหยุดยังขึ้นบนปฏิทินเดือน',/วันปิยมหาราช/.test(holi.mon),holi.mon.slice(0,120));
 t('วันหยุดไม่มีช่องติ๊ก (ไม่มีอะไรให้ทำเสร็จ)',holi.holiHasTick===false,String(holi.holiHasTick));
 t('...ขึ้นเป็นไอคอน 🌴 แทน',holi.holiHasIcon===true,String(holi.holiHasIcon));
 t('งานจริงยังมีช่องติ๊กเหมือนเดิม',holi.workHasTick===true,String(holi.workHasTick));

 let bad=0;A.forEach(([c,n,x])=>{if(!c)bad++;console.log((c?'  ✓ ':'  ✗ FAIL: ')+n+(x&&!c?' → '+x:''));});
 const real=errs.filter(e=>!/localStorage/.test(e));
 if(real.length){console.log('PAGE ERRORS:');real.forEach(e=>console.log('   '+e));bad+=real.length;}
 await pg.evaluate(boot+seed+mgr+`PL.day='2026-10-07';_switchTab('plan');renderPlan();`);
 await b.close();
 console.log('\n'+(bad?bad+' FAILED of '+A.length:'ALL PASS ('+A.length+' checks)'));
 process.exit(bad?1:0);
})();
