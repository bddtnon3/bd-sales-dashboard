/* 💰 ราคา & ทุน — ไฟล์หัวเสือ (ราคาขายลูกค้า) และไฟล์ BUM (ต้นทุนศูนย์)
 *
 * เทสต์นี้ใช้ไฟล์จริงของเจ้าของเป็น fixture:
 *   fixtures/huasuer-price.xlsx  = Huasuer DT Sep Oct Nov Dec - Rev20261006.xlsx (ทั้งไฟล์)
 *   fixtures/bum-oct2026.xlsx    = BUM DT Oct'26 - Rev20260929.xlsx (ตัดเหลือ 4 ชีตการเงิน 420 แถว
 *                                  ไฟล์เต็ม 31MB ใหญ่เกินจะเก็บใน repo)
 *
 * สิ่งที่ต้องพิสูจน์ แบ่งเป็น 6 เรื่อง
 *   1) อ่านไฟล์หัวเสือถูกชีต ถูกรอบ และสูตรราคาตรงกับไฟล์ทุกแถว
 *   2) กำไรของลูกค้าถูกต้อง รวมเคส RSP ยกแพ็ค และซ่อนรายการที่ขายขาดทุน
 *   3) อ่านไฟล์ BUM ถูกชีต (Cust ไม่ใช่ _REV) และต้นทุน/หีบ ตรงกับไฟล์ทุกแถว
 *   4) การเทียบรอบให้คำตอบตรงกับคอลัมน์ Diff ที่พี่เซลล์ทำไว้ในไฟล์
 *   5) 🔒 ความปลอดภัย: หน้าแคตาลอคของลูกค้าเอื้อมไม่ถึงไฟล์ BUM
 *   6) 🛟 ความปลอดภัยของข้อมูล: อัพไฟล์ราคาแล้วข้อมูลยอดขาย/สั่งของไม่ขยับแม้ไบต์เดียว
 *
 * ต้องติดตั้งก่อน (ไม่ได้อยู่ใน package.json เพราะใช้เฉพาะตอนเทสต์):
 *     npm i --no-save playwright-core xlsx
 * แล้วรัน:  node build.cjs && node test/browser/price.test.cjs
 */
const fs=require('fs');const path=require('path');
const {chromium}=require('playwright-core');
const BROWSER=process.env.CHROME||'/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ROOT=path.resolve(__dirname,'..','..');
const PAGE=path.join(ROOT,'public','index.html');
const F_HS=path.join(__dirname,'fixtures','huasuer-price.xlsx');
const F_BUM=path.join(__dirname,'fixtures','bum-oct2026.xlsx');

/* วันนี้สมมติ = 13 ต.ค. 69 (อยู่ในรอบ Oct'26 = 25 ก.ย. – 24 ต.ค.) ให้ผลเทสต์นิ่ง */
const TODAY='2026-10-13';
const boot=`
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  window.Chart=function(){return{destroy(){}}};
  window.todayISO=()=>'${TODAY}';
  window.__posts=[];
  window.fetch=(u,o)=>{window.__posts.push({u:String(u),gz:!!(o&&o.headers&&o.headers['x-body-gzip'])});
    return Promise.resolve({ok:true,status:200,json:()=>Promise.resolve({ok:true,n:1})});};
  TOKEN='test-token';
  PRICE.loaded=true;                 /* กันไม่ให้ renderPrice ไปยิง prLoad ตอนเทสต์ */
`;
const mgr=`S.user={id:'manager',role:'manager',name:'ผู้จัดการ'};
  document.querySelectorAll('.admin-upload').forEach(e=>e.style.display='');`;
const sales=`S.user={id:'ct11',role:'sales',code:'209611',name:'CT11 · ก'};`;

/* ก้อนข้อมูลที่ sync ขึ้นเซิร์ฟเวอร์ — ต้องไม่ขยับเลยตลอดเทสต์นี้ (ดู build.cjs _doSync) */
const BLOBS=`JSON.stringify({DATA,STORE,KPI,ORDERS,STOCKD,REQUESTS,MASTER,ANALYTICS,STOREPROD,
  STOREDAILY,PSTORE,EB2B,POSTATUS,LEADS,DCI,MINSTOCK,PLAN,PROMO,PJP})`;

(async()=>{
 const b=await chromium.launch({executablePath:BROWSER,args:['--no-sandbox']});
 const pg=await (await b.newContext({viewport:{width:1280,height:1000}})).newPage();
 const errs=[];pg.on('pageerror',e=>errs.push(String(e)));
 await pg.setContent(fs.readFileSync(PAGE,'utf8'),{waitUntil:'domcontentloaded'});
 await pg.addScriptTag({path:require.resolve('xlsx/dist/xlsx.full.min.js')});
 await pg.evaluate(boot+mgr);

 const A=[];const t=(n,c,x)=>A.push([!!c,n,x===undefined?'':String(x)]);
 const ev=(f,a)=>pg.evaluate(f,a);

 const before=await ev(new Function('return '+BLOBS));

 /* ============================================================
  * 1) อ่านไฟล์หัวเสือ
  * ==========================================================*/
 const hs=await ev(a=>{
   const u8=new Uint8Array(a.buf);
   const g=prGrid(u8.buffer);
   parseHuasuer('Huasuer DT Sep Oct Nov Dec - Rev20261006.xlsx',u8.buffer);
   return {sheet:g.sheet,names:g.names,n:Object.keys(PRICE.hs.items).length,
     rounds:PRICE.hs.rounds.slice(),posts:window.__posts.slice()};
 },{buf:[...fs.readFileSync(F_HS)]});
 await pg.waitForTimeout(150);                 /* prPush บีบ gzip แบบ async ต้องรอให้ fetch ออกก่อน */
 hs.posts=await ev(()=>window.__posts.slice());

 t('ไฟล์หัวเสือมีสองชีต (ราคาเต็ม + เฉพาะแก้ไข)',hs.names.length>=2,hs.names.join(' | '));
 t('⚠️ เลือกชีตราคาเต็ม ไม่ใช่ชีต "เฉพาะแก้ไขเท่านั้น"',/^\s*HS\b/i.test(hs.sheet),hs.sheet);
 t('อ่านสินค้าได้เกิน 1,300 รายการ',hs.n>1300,hs.n);
 t('อ่านได้ 4 รอบราคา',hs.rounds.length===4,hs.rounds.join(' / '));
 t('ชื่อรอบอ่านจากไฟล์ ไม่ได้ hard-code',/Sep/.test(hs.rounds[0])&&/Dec/.test(hs.rounds[3]),hs.rounds.join(','));
 t('ส่งขึ้น /api/price ด้วย gzip',hs.posts.length===1&&hs.posts[0].u==='/api/price'&&hs.posts[0].gz,JSON.stringify(hs.posts));

 const win=await ev(()=>({
   sep:prWindow('Sep\'26'),oct:prWindow('Oct\'26'),nov:prWindow('Nov\'26'),dec:prWindow('Dec\'26'),
   now:prNowIdx(),lab:prRounds()[prNowIdx()]}));
 t('รอบ Oct\'26 = 25 ก.ย. – 24 ต.ค. (ตัดรอบวันที่ 25 ไม่ใช่วันที่ 1)',
   win.oct.from==='2026-09-25'&&win.oct.to==='2026-10-24',JSON.stringify(win.oct));
 t('รอบ Sep\'26 = 25 ส.ค. – 24 ก.ย.',win.sep.from==='2026-08-25'&&win.sep.to==='2026-09-24',JSON.stringify(win.sep));
 t('รอบ Dec\'26 ข้ามปีถูก (25 พ.ย. – 24 ธ.ค.)',win.dec.from==='2026-11-25'&&win.dec.to==='2026-12-24',JSON.stringify(win.dec));
 t('วันที่ 13 ต.ค. 69 ตกอยู่ในรอบ Oct\'26',/Oct/.test(win.lab||''),win.now+' = '+win.lab);

 /* ---- สูตรที่ถอดจากไฟล์ ต้องตรงทุกแถว ---- */
 const fx=await ev(()=>{
   const items=PRICE.hs.items;let nTot=0,badTot=0,nNtt=0,badNtt=0,maxNtt=0,
     nRt=0,okRt=0,nFl=0,okFl=0,badFlLow=0,nttNoWs=0;
   Object.keys(items).forEach(code=>{
     const it=items[code];
     for(let i=0;i<it.m.length;i++){
       const m=prM(it,i);if(!m)continue;
       /* Total TPR = TPR + W% */
       nTot++;if(Math.abs(m.tot-(m.tpr+m.w))>0.011)badTot++;
       if(!m.ws&&m.ntt)nttNoWs++;
       if(m.ws&&m.ntt&&it.p){
         nNtt++;
         const calc=(m.ws-m.tot)/it.p*1.07;
         const d=Math.abs(calc-m.ntt);
         if(d>0.1)badNtt++;
         if(d>maxNtt)maxNtt=d;
       }
       if(m.ws&&m.rt){nRt++;if(Math.abs(Math.round(m.ws*1.02)-m.rt)<=1)okRt++;}
       if(m.ntt&&m.fl&&m.rspN){
         nFl++;
         const step=m.rspN<50?0.25:1;
         if(Math.abs(Math.ceil(m.ntt/step-1e-6)*step-m.fl)<0.011)okFl++;
         if(m.fl<m.ntt-0.011)badFlLow++;
       }
     }
   });
   return {nTot,badTot,nNtt,badNtt,maxNtt,nRt,okRt,nFl,okFl,badFlLow,nttNoWs};
 });
 t('Total TPR = TPR + W% ทุกแถวทุกรอบ',fx.badTot===0,fx.badTot+' เพี้ยน จาก '+fx.nTot);
 t('NTT = (WS LP − Total TPR) ÷ ชิ้น/หีบ × 1.07 ทุกแถว',fx.badNtt===0,fx.badNtt+' เพี้ยน จาก '+fx.nNtt);
 t('...คลาดสูงสุดไม่เกิน 10 สตางค์ (ไฟล์ปัดเศษ)',fx.maxNtt<0.1,fx.maxNtt.toFixed(4));
 t('RT LP ≈ WS LP × 1.02 (ไม่ใช่ × 1.07 — RT คือราคาปลีกตั้ง ไม่ใช่ราคารวม VAT)',
   fx.okRt/fx.nRt>0.9,(fx.okRt/fx.nRt*100).toFixed(1)+'% จาก '+fx.nRt);
 t('Floor Price = ปัดขึ้นจาก NTT (step 0.25 ถ้า RSP<50, ไม่งั้น 1)',
   fx.okFl/fx.nFl>0.98,(fx.okFl/fx.nFl*100).toFixed(2)+'% จาก '+fx.nFl+' (4 รอบรวม)');
 t('⚠️ ไม่มีแถวไหนที่ Floor ต่ำกว่า NTT (ขายต่ำกว่าทุน)',fx.badFlLow===0,fx.badFlLow);
 t('ไม่มีแถวที่มี NTT แต่ไม่มี WS LP',fx.nttNoWs===0,fx.nttNoWs);

 /* ============================================================
  * 2) กำไรของลูกค้า
  * ==========================================================*/
 const mg=await ev(()=>{
   const items=PRICE.hs.items,i=prNowIdx();
   const pct=[],hide={},pack=[];let nPromo=0,neg=0;
   Object.keys(items).forEach(code=>{
     const it=items[code],m=prM(it,i);
     const h=prHide(it,m);hide[h||'ok']=(hide[h||'ok']||0)+1;
     if(!m)return;
     const g=prMargin(it,m,false);
     if(g){pct.push(g.pct);if(g.pct<0)neg++;if(g.k>1)pack.push({code:code,k:g.k,pct:g.pct,rspN:m.rspN,ntt:m.ntt});}
     if(prMargin(it,m,true))nPromo++;
   });
   pct.sort((a,b)=>a-b);
   return {hide:hide,med:pct[Math.floor(pct.length/2)],n:pct.length,neg:neg,nPromo:nPromo,
     pack:pack.sort((a,b)=>b.k-a.k).slice(0,3),nPack:pack.length,
     loss:Object.keys(items).filter(c=>prHide(items[c],prM(items[c],i))==='loss')};
 });
 t('กำไรลูกค้าค่ากลาง ~27% (ซื้อ NTT ขาย RSP ปกติ)',mg.med>24&&mg.med<30,mg.med.toFixed(1)+'% จาก '+mg.n+' รายการ');
 t('มีรายการที่มีราคาช่วงโปรเกิน 700 รายการ',mg.nPromo>700,mg.nPromo);
 t('⚠️ 2 รายการที่ RSP ต่ำกว่าทุน ถูกตีเป็น "loss" (เจ้าของสั่งซ่อน)',mg.hide.loss===2,JSON.stringify(mg.hide));
 t('...และเป็นสองรหัสที่ตรวจเจอตอนวิเคราะห์',
   mg.loss.length===2&&mg.loss.indexOf('64921440')>=0&&mg.loss.indexOf('64939085')>=0,mg.loss.join(','));
 t('มีรายการที่ RSP เป็นราคายกแพ็ค และคิดทุนคูณ Inner Pack ให้',mg.nPack>30,mg.nPack+' รายการ');
 t('...แล้วกำไรกลับมาสมเหตุสมผล ไม่ใช่ 97%',mg.pack.every(p=>p.pct<60),JSON.stringify(mg.pack));
 t('...และ RSP ที่โชว์ยังเป็นเลขเดิมจากไฟล์ (ไม่หารแพ็ค ตามที่เจ้าของสั่ง)',
   mg.pack.every(p=>p.rspN===Math.round(p.rspN*100)/100&&p.rspN>p.ntt),JSON.stringify(mg.pack[0]));

 /* ---- ⚠️ RSP ช่วงโปรเป็นราคาแพ็ค ได้โดยที่ RSP ปกติเป็นราคาชิ้น ----
    ตรวจไฟล์จริงเจอ 31 รายการแบบนี้ ถ้าตัดสินขนาดแพ็คจาก RSP ปกติอันเดียว
    กำไรช่วงโปรจะโชว์ ~76% แทน ~28% คือโฆษณาเกินจริงให้ลูกค้า */
 const pp=await ev(()=>{
   const items=PRICE.hs.items,i=prNowIdx();
   let onlyPromo=0,worst=0,ex=null;
   Object.keys(items).forEach(code=>{
     const it=items[code],m=prM(it,i);
     if(!m||!m.rspP||!m.ntt)return;
     const gN=prMargin(it,m,false),gP=prMargin(it,m,true);
     if(!gP)return;
     if(gP.k>1&&(!gN||gN.k===1)){
       onlyPromo++;
       if(gP.pct>worst){worst=gP.pct;ex={code:code,ip:it.ip,ntt:m.ntt,rspN:m.rspN,rspP:m.rspP,kN:gN?gN.k:0,kP:gP.k,pct:gP.pct};}
     }
   });
   /* กำไรที่ "ประกาศเป็นตัวเลข" ต้องไม่มีรายการไหนทะลุเพดานความเป็นไปได้
      (รายการที่เทียบหน่วยไม่ลงต้องติดธง unsure แล้วไม่โชว์ตัวเลข) */
   const over=Object.keys(items).filter(code=>{
     const it=items[code],m=prM(it,i);
     const a4=prMargin(it,m,false),b4=prMargin(it,m,true);
     return (a4&&!a4.unsure&&a4.pct>70)||(b4&&!b4.unsure&&b4.pct>70);}).length;
   const unsure=Object.keys(items).filter(code=>{
     const it=items[code],m=prM(it,i);
     const a4=prMargin(it,m,false),b4=prMargin(it,m,true);
     return (a4&&a4.unsure)||(b4&&b4.unsure);});
   return {onlyPromo,worst,ex,over,unsure:unsure,nUnsure:unsure.length};
 });
 t('⚠️ เจอรายการที่ RSP ปกติเป็นราคาชิ้น แต่ RSP ช่วงโปรเป็นราคาแพ็ค',pp.onlyPromo>20,pp.onlyPromo+' รายการ');
 t('...และคิดขนาดแพ็คของ "ช่วงโปร" แยกจาก "ราคาปกติ" (ไม่ใช้ตัวเดียวกัน)',
   pp.ex&&pp.ex.kP>1&&pp.ex.kN===1,JSON.stringify(pp.ex));
 t('...กำไรช่วงโปรจึงไม่มีรายการไหนเกิน 70% (ถ้าพลาดจะโชว์ 76%)',pp.over===0,pp.over+' รายการเกิน · สูงสุดในกลุ่มนี้ '+pp.worst.toFixed(1)+'%');
 t('⚠️ รายการที่ไฟล์ไม่ได้ให้ Inner Pack มา ติดธง unsure ไม่ประกาศกำไรเป็นตัวเลข',
   pp.nUnsure>0&&pp.nUnsure<=10,pp.nUnsure+' รายการ: '+pp.unsure.join(','));
 t('...เป็น 5 รายการที่ตรวจเจอ (DOVE บอดี้สครับ 280G 4 สี + บรีสเมติก 4.5KG)',
   pp.nUnsure===5&&pp.unsure.indexOf('69623799')>=0&&pp.unsure.indexOf('66306842')>=0,pp.unsure.join(','));
 t('...และหน้าจอโชว์ "?" แทนตัวเลข (ไม่โฆษณาเกินจริงให้ลูกค้า)',
   await ev(()=>{const g={pct:80.7,baht:709,unsure:true};
     return /\?/.test(prPct(g))&&!/80/.test(prPct(g));}),'ok');

 /* ---- สูตรในหน้าแคตาลอคสาธารณะ (ไฟล์คนละไฟล์) ต้องให้เลขเดียวกันทุกรายการ ---- */
 const pub=fs.readFileSync(path.join(ROOT,'public','pricelist.html'),'utf8');
 const blk=pub.slice(pub.indexOf('var PR_MON='),pub.indexOf('/* ======================= จบส่วนที่คัดลอก'));
 const twin=await ev(a2=>{
   /* โหลดสูตรของหน้าสาธารณะมาในชื่อ pub* แล้วเทียบกับของแอปทุกรายการทุกรอบ */
   const f=new Function(a2.blk+';return {prM:prM,prMargin:prMargin,prHide:prHide,prWindow:prWindow};')();
   const items=PRICE.hs.items;let n=0,bad=0,first=null;
   Object.keys(items).forEach(code=>{
     const it=items[code];
     for(let i=0;i<it.m.length;i++){
       const a3=prM(it,i),b3=f.prM(it,i);
       const pairs=[[prMargin(it,a3,false),f.prMargin(it,b3,false)],
                    [prMargin(it,a3,true), f.prMargin(it,b3,true)]];
       n++;
       let ok=prHide(it,a3)===f.prHide(it,b3);
       pairs.forEach(([x,y])=>{
         if(!!x!==!!y){ok=false;return;}
         if(x&&(Math.abs(x.pct-y.pct)>1e-9||x.k!==y.k))ok=false;
       });
       if(!ok&&!first)first={code:code,i:i};
       if(!ok)bad++;
     }
   });
   return {n,bad,first};
 },{blk:blk});
 t('🔁 สูตรในหน้าแคตาลอคสาธารณะให้เลขตรงกับในแอปทุกรายการทุกรอบ (สองไฟล์ไม่หลุดกัน)',
   twin.bad===0,twin.bad+' เพี้ยน จาก '+twin.n+(twin.first?' ตัวแรก '+JSON.stringify(twin.first):''));

 /* ============================================================
  * 3) อ่านไฟล์ BUM
  * ==========================================================*/
 const bum=await ev(a=>{
   const u8=new Uint8Array(a.buf);
   window.__posts.length=0;
   const wb=XLSX.read(u8.buffer,{type:'array'});
   parseBUM("BUM DT Oct'26 - Rev20260929.xlsx",u8.buffer);
   return {names:wb.SheetNames.slice(),n:Object.keys(PRICE.bum.items).length,
     rate:PRICE.bum.rate,posts:window.__posts.slice()};
 },{buf:[...fs.readFileSync(F_BUM)]});
 await pg.waitForTimeout(150);
 bum.posts=await ev(()=>window.__posts.slice());
 t('ไฟล์ BUM มีทั้งชีตหลักและชีต _REV',
   bum.names.indexOf('Cust Finance Print DTCON')>=0&&bum.names.indexOf('Cust Finance Print DTCON_REV')>=0,
   bum.names.join(' | '));
 t('อ่านสินค้าจากชีต Cust ได้ (ไม่ใช่ชีต _REV ที่มีแค่ 37 แถว)',bum.n>300,bum.n);
 t('ส่งไฟล์ BUM ขึ้น /api/price ด้วย gzip',
   bum.posts.length===1&&bum.posts[0].u==='/api/price'&&bum.posts[0].gz,JSON.stringify(bum.posts));

 /* ---- ต้นทุน/หีบ ที่คำนวณได้ ต้องตรงกับคอลัมน์ X ของไฟล์ทุกแถว ---- */
 const cost=await ev(()=>{
   const items=PRICE.bum.items;let n=0,bad=0,max=0,nVat=0,badVat=0;
   const rates={};
   Object.keys(items).forEach(code=>{
     const b=prB(code);if(!b||!b.ws)return;
     const r=prRate(b);
     const c=prCost(b,b.ws,b.tpr,b.on);
     n++;const d=Math.abs(c-b.x);if(d>0.02)bad++;if(d>max)max=d;
     if(b.y){nVat++;if(Math.abs(b.x*1.07-b.y)>0.02)badVat++;}
     const k=(Math.round(r.cf*1000)/10)+'%';rates[k]=(rates[k]||0)+1;
   });
   return {n,bad,max,nVat,badVat,rates};
 });
 t('ต้นทุน/หีบ ที่คำนวณได้ ตรงกับคอลัมน์ X ของไฟล์ทุกแถว',cost.bad===0,cost.bad+' เพี้ยน จาก '+cost.n+' (คลาดสูงสุด '+cost.max.toFixed(4)+')');
 t('ราคา +VAT (คอลัมน์ Y) = ต้นทุน × 1.07 ทุกแถว',cost.badVat===0,cost.badVat+' จาก '+cost.nVat);
 t('Cat Fee% ที่ถอดจากแถวเองออกมาเป็นอัตราไม่กี่ค่า (ไม่ได้อ่านจากข้อความหัวไฟล์)',
   Object.keys(cost.rates).length<=6,JSON.stringify(cost.rates));
 t('...และเป็นอัตราของชีต Cust (8.3 / 9.8 / 10.8%) ไม่ใช่ Non Cust (7.8 / 9.3 / 10.3%)',
   !!(cost.rates['8.3%']||cost.rates['9.8%']||cost.rates['10.8%'])&&!cost.rates['7.8%'],JSON.stringify(cost.rates));

 /* ============================================================
  * 4) เทียบรอบ
  * ==========================================================*/
 const cmp=await ev(()=>{
   const all=prCompare(),ri=prBumRounds(),rs=prRounds();
   const eps=0.005;
   const payStock=all.filter(o=>o.payNew-o.payOld>eps).length;
   const payWait=all.filter(o=>o.payNew-o.payOld<-eps).length;
   const netStock=all.filter(o=>o.netNew-o.netOld>eps).length;
   const netWait=all.filter(o=>o.netNew-o.netOld<-eps).length;
   const wsMoved=all.filter(o=>Math.abs(o.wsNew-o.wsOld)>0.5).length;
   /* ต้องไม่มีแถวที่ "ต่าง" แต่ส่วนลดทั้งสองรอบและ WS เท่ากันหมด */
   /* "ผี" = ต้นทุนต่างกันแต่ไม่มีอะไรต่างกันเลย (WS เท่ากัน ส่วนลดเท่ากันทุกช่อง) */
   const ghost=all.filter(o=>{
     const b=prB(o.code);
     return Math.abs(o.payNew-o.payOld)>eps&&Math.abs(o.wsNew-o.wsOld)<0.005
       &&Math.abs(b.tpr-b.p9tpr)<0.005&&Math.abs(b.on-b.p9on)<0.005;}).length;
   const flip=all.filter(o=>Math.sign(o.payNew-o.payOld)*Math.sign(o.netNew-o.netOld)<0).length;
   return {n:all.length,payStock,payWait,netStock,netWait,wsMoved,ghost,flip,
     ri:ri,labOld:ri&&rs[ri.iOld],labNew:ri&&rs[ri.iNew],
     named:all.filter(o=>o.nm&&o.nm!==o.code).length};
 });
 t('เทียบรอบได้ทุกรายการที่มีต้นทุน',cmp.n>300,cmp.n);
 t('ชื่อสินค้า/หมวด มาจากไฟล์หัวเสือ (ที่เหลือคือรหัสที่ไม่ได้ขายให้ลูกค้า)',
   cmp.named/cmp.n>0.75,cmp.named+' / '+cmp.n);
 t('⚠️ จับคู่ได้ว่าส่วนลดสองชุดในไฟล์ BUM เป็นรอบไหน (ไม่ hard-code เดือน)',!!cmp.ri,JSON.stringify(cmp.ri));
 t('...ชุด BM10 (P/Q/R) = รอบ Oct\'26 และชุด BM9 (AC/AD/AE) = รอบ Sep\'26',
   /Sep/.test(cmp.labOld||'')&&/Oct/.test(cmp.labNew||''),cmp.labOld+' ↔ '+cmp.labNew);
 t('...จับคู่แม่นเกิน 90% ทั้งสองชุด',cmp.ri&&cmp.ri.pA>0.9&&cmp.ri.pB>0.9,
   cmp.ri?((cmp.ri.pA*100).toFixed(1)+'% / '+(cmp.ri.pB*100).toFixed(1)+'%'):'-');
 t('มีทั้งกลุ่ม "สั่งรอบเก่าดีกว่า" และ "รอรอบใหม่ดีกว่า" (ไม่เอียงข้างเดียว)',cmp.payStock>0&&cmp.payWait>0,
   'จ่ายเงิน '+cmp.payStock+' / '+cmp.payWait+' · หลังรีเบท '+cmp.netStock+' / '+cmp.netWait);
 t('มุมหลังเคลมรีเบทแยกรายการได้มากกว่ามุมจ่ายเงิน (รีเบทเป็นตัวที่ต่างกันบ่อยสุด)',
   cmp.netStock+cmp.netWait>=cmp.payStock+cmp.payWait,
   (cmp.netStock+cmp.netWait)+' vs '+(cmp.payStock+cmp.payWait));
 t('⚠️ WS LP ของแต่ละรอบเอามาจากไฟล์หัวเสือจริง (ไม่ได้ใช้ WS เดียวสองรอบ)',cmp.wsMoved>0,cmp.wsMoved+' รายการที่ WS ขยับ');
 t('ไม่มีแถวที่บอกว่าราคาต่างกันโดยไม่มีอะไรต่างกันเลย',cmp.ghost===0,cmp.ghost);
 t('มีไม่กี่รายการที่สองมุมให้คำตอบสวนกัน',cmp.flip<=5,cmp.flip+' รายการ');

 /* ---- เทียบกับคอลัมน์ Diff ที่พี่เซลล์ทำไว้ในไฟล์เอง ---- */
 const diff=await ev(a=>{
   const u8=new Uint8Array(a.buf);
   const wb=XLSX.read(u8.buffer,{type:'array'});
   const N=XLSX.utils.sheet_to_json(wb.Sheets['Non Cust Finance Print DTCON'],{header:1,defval:null,raw:true});
   const C=s=>XLSX.utils.decode_col(s);
   let n=0,agree=0,dis=0;
   const legend=[String((N[0]||[])[C('AJ')]||''),String((N[1]||[])[C('AJ')]||'')];
   for(let r=5;r<N.length;r++){
     const x=N[r];if(!x)continue;const code=String(x[C('E')]||'');
     if(!/^\d{6,12}$/.test(code))continue;
     const fileDiff=(+x[C('AH')]||0)+(+x[C('AI')]||0);     /* Diff ของ TPR + W% On */
     if(Math.abs(fileDiff)<0.02)continue;
     const b=prB(code);if(!b)continue;
     /* ไฟล์: Diff = BM9 − BM10 > 0 แปลว่า BM9 ลดเยอะกว่า
        โค้ดเรา: p9* = BM9 (คอลัมน์ AC/AD/AE) จึงต้องได้ payPrev < payNow */
     const cNow=prCost(b,b.ws,b.tpr,b.on), cP9=prCost(b,b.ws,b.p9tpr,b.p9on);
     n++;
     if(Math.sign(fileDiff)===Math.sign(cNow-cP9))agree++;else dis++;
   }
   return {n,agree,dis,legend};
 },{buf:[...fs.readFileSync(F_BUM)]});
 t('ไฟล์มีคำอธิบายเครื่องหมายของคอลัมน์ Diff เขียนไว้เอง',
   /ซื้อรอบนี้/.test(diff.legend[0])&&/รอบถัดไป/.test(diff.legend[1]),diff.legend.join(' | '));
 t('ทิศของ Diff ที่เราคำนวณ ตรงกับคอลัมน์ Diff ในไฟล์ทุกแถว',diff.dis===0,diff.agree+' ตรง / '+diff.dis+' สวน (จาก '+diff.n+')');

 /* ============================================================
  * 5) 🔒 ลูกค้าต้องไม่มีทางเห็นไฟล์ BUM
  * ==========================================================*/
 /* ตัดคอมเมนต์ออกก่อนตรวจ — คอมเมนต์ในไฟล์พวกนี้ "เอ่ยชื่อ" สิ่งที่ห้ามแตะไว้บนๆ
    (bd-pricebum-*, put(), del()) เพื่อเตือนคนที่มาแก้ทีหลัง ถ้าไม่ตัดออกจะฟ้องผิดจุด */
 const strip=t=>t.replace(/<!--[\s\S]*?-->/g,'').replace(/\/\*[\s\S]*?\*\//g,'')
   .split('\n').map(l=>l.replace(/(^|[^:"'`])\/\/.*$/,'$1')).join('\n');
 const plRaw=fs.readFileSync(path.join(ROOT,'public','pricelist.html'),'utf8');
 const pl=strip(plRaw);
 const apiList=strip(fs.readFileSync(path.join(ROOT,'api','pricelist.js'),'utf8'));
 const apiPrice=strip(fs.readFileSync(path.join(ROOT,'api','price.js'),'utf8'));
 const snap=fs.readFileSync(path.join(ROOT,'lib','snapshot.js'),'utf8');
 const fetches=(pl.match(/fetch\((["'`][^"'`]*)/g)||[]).map(s=>s.replace(/^fetch\(["'`]/,''));
 t('🔒 หน้าแคตาลอคลูกค้าเรียก endpoint เดียวคือ /api/pricelist',
   fetches.length===1&&fetches[0]==='/api/pricelist',JSON.stringify(fetches));
 t('🔒 โค้ดของหน้าแคตาลอคลูกค้าไม่มีคำว่า bum / pricebum เลย',!/bum/i.test(pl),'ok');
 t('🔒 ...และคอมเมนต์ในไฟล์เตือนไว้ว่าห้ามเพิ่ม endpoint อื่น',
   /ห้ามเพิ่ม fetch/.test(plRaw)&&/ห้ามลืม/.test(plRaw),'ok');
 t('🔒 หน้าแคตาลอคไม่โชว์ช่อง Remark ของไฟล์ (เป็นกลไกโปรฝั่งศูนย์ซื้อ ไม่ใช่ของลูกค้า)',
   !/\.rem/.test(pl)||!/m\.rem/.test(pl),'ok');
 t('🔒 api/pricelist.js ไม่ import PRICEBUM_PREFIX',!/PRICEBUM/.test(apiList),'ok');
 t('🔒 api/pricelist.js ไม่แตะ snapshot หลัก (PREFIX / newestReal)',
   !/newestReal/.test(apiList)&&!/\bPREFIX\b/.test(apiList),'ok');
 t('🔒 api/pricelist.js เป็น read-only (ไม่มี put / del)',
   !/\bput\(/.test(apiList)&&!/\bdel\(/.test(apiList),'ok');
 t('🔒 api/pricelist.js รับแต่ GET',/method\s*!==\s*"GET"/.test(apiList),'ok');
 t('🔒 api/pricelist.js ประกอบคำตอบเองทีละฟิลด์ ไม่ spread ของที่เก็บไว้',
   !/\.\.\.(d|hs\.data)/.test(apiList)&&/items:\s*d\.items/.test(apiList),'ok');
 t('🔒 api/price.js ส่ง bum ให้เฉพาะ role manager',/role\s*===\s*"manager"/.test(apiPrice),'ok');
 t('🔒 สองไฟล์ราคาใช้ prefix ต่างกัน และไม่ซ้อนทับกัน (prefix-match)',
   /PRICEHS_PREFIX\s*=\s*"bd-pricehs-"/.test(snap)&&/PRICEBUM_PREFIX\s*=\s*"bd-pricebum-"/.test(snap),'ok');
 t('🔒 ทั้งสอง prefix อยู่นอก bd-data- (อัพราคาไม่ทำให้ยอดขายหาย)',
   !/bd-data-price|bd-price[a-z]*-?data/.test(snap),'ok');
 t('🔒 api/price.js ไม่อ่าน/เขียน snapshot หลักเลย',
   !/newestReal|mergeState/.test(apiPrice)&&!/\bPREFIX\b/.test(apiPrice),'ok');
 t('🔒 api/price.js ปฏิเสธไฟล์ที่อ่านได้น้อยเกินจริง (กันราคาหายทั้งหมด)',
   /itemCount/.test(apiPrice)&&/409/.test(apiPrice),'ok');
 t('🔒 แท็บต้นทุนถูกจำกัดสิทธิ์เป็น manager ใน TAB_GROUPS',
   await ev(()=>{const g=TAB_GROUPS.filter(x=>x.k==='price')[0];
     return !!g&&g.tabs.filter(x=>x.t==='cost')[0].role==='manager'
       &&!g.tabs.filter(x=>x.t==='price')[0].role;}),'ok');
 t('🔒 เซลล์เปิดแท็บต้นทุนไม่ได้ (ไม่อยู่ในรายการแท็บที่เห็น)',
   await ev(a=>{eval(a.sales);const vis=tabVisible();
     const g=vis.filter(x=>x.g.k==='price')[0];
     const ok=!!g&&g.tabs.length===1&&g.tabs[0].t==='price';
     return ok;},{sales}),'ok');

 /* ============================================================
  * 6) หน้าจอทำงานจริง
  * ==========================================================*/
 await ev(mgr);
 const ui=await ev(()=>{
   _switchTab('price');renderPrice();
   const v=document.getElementById('priceView');
   const tbl=v.querySelector('table.pr-tbl');
   const steps=[...v.querySelectorAll('.dstep-b')].map(x=>x.innerText.trim());
   return {shown:!v.classList.contains('hidden'),
     rows:tbl?tbl.querySelectorAll('tbody tr:not(.grp-row):not(.pr-rem)').length:0,
     bands:tbl?tbl.querySelectorAll('tbody tr.grp-row').length:0,
     steps:steps,cards:v.querySelectorAll('.cards .card').length,
     link:!!v.querySelector('#prLink'),
     sel:(document.getElementById('prRoundSel')||{}).value,
     wide:tbl?tbl.getBoundingClientRect().width<=v.getBoundingClientRect().width+1:false};
 });
 t('หน้าแคตาลอคในแอปวาดตารางได้',ui.shown&&ui.rows>100,ui.rows+' แถว');
 t('...แบ่งแถบหมวดด้วย .grp-row (คลาสเดียวกับตารางอื่นในแอป)',ui.bands>=5,ui.bands+' แถบ');
 t('...มีการ์ดสรุป 4 ใบ',ui.cards===4,ui.cards);
 t('...มีปุ่ม ◀ ▶ เลื่อนรอบ',ui.steps.filter(s=>s==='◀').length===1&&ui.steps.filter(s=>s==='▶').length===1,ui.steps.join(' '));
 t('...ผู้จัดการเห็นลิงก์แคตาลอคสำหรับลูกค้า',ui.link,'ok');
 t('...ตารางไม่ล้นกรอบหน้าจอ',ui.wide,'ok');

 const step=await ev(()=>{
   const v=document.getElementById('priceView');
   const btn=()=>[...v.querySelectorAll('.dstep-b')];
   const val=()=>(document.getElementById('prRoundSel')||{}).value;
   const v0=val();btn()[0].click();const v1=val();btn()[1].click();const v2=val();
   for(let i=0;i<9;i++)btn()[0].click();
   const lo=val();btn()[0].click();const lo2=val();
   for(let i=0;i<9;i++)btn()[1].click();
   const hi=val();btn()[1].click();const hi2=val();
   const rev=!!document.getElementById('prRoundSel').dataset.rev;
   return {v0,v1,v2,lo,lo2,hi,hi2,rev,n:document.getElementById('prRoundSel').options.length};
 });
 t('◀ ได้รอบที่เก่ากว่า',+step.v1===+step.v0-1,step.v0+' → '+step.v1);
 t('▶ กลับมาที่เดิม',step.v2===step.v0,step.v2);
 t('ไล่ ◀ จนสุดแล้วหยุด ไม่วนกลับ',step.lo==='0'&&step.lo2==='0',step.lo+' / '+step.lo2);
 t('ไล่ ▶ จนสุดแล้วหยุด',+step.hi===step.n-1&&step.hi2===step.hi,step.hi+' / '+step.hi2);
 t('รายการรอบเรียงเก่า→ใหม่ จึงไม่ติดธง data-rev (◀ = index น้อยลง)',!step.rev,'ok');

 const search=await ev(()=>{
   prSetRound(prNowIdx());
   prSetQ('sunsilk');const a=document.querySelectorAll('#prBody table.pr-tbl tbody tr:not(.grp-row):not(.pr-rem)').length;
   prSetQ('ไม่มีสินค้าชื่อนี้แน่นอน');const b=document.querySelectorAll('#prBody table.pr-tbl').length;
   const empty=/ไม่พบสินค้า/.test(document.getElementById('prBody').innerText);
   prSetQ('');const c=document.querySelectorAll('#prBody table.pr-tbl tbody tr:not(.grp-row):not(.pr-rem)').length;
   return {a,b,empty,c};
 });
 t('ค้นหาชื่อแบรนด์ได้',search.a>5&&search.a<300,search.a+' แถว');
 t('ค้นหาไม่เจอแล้วบอกว่าไม่พบ ไม่ใช่ตารางว่าง',search.b===0&&search.empty,'ok');
 t('ล้างคำค้นแล้วกลับมาครบ',search.c>100,search.c);

 const cv=await ev(()=>{
   _switchTab('cost');renderCost();
   const v=document.getElementById('costView');
   const tbl=[...v.querySelectorAll('table.pr-tbl')];
   const segs=[...v.querySelectorAll('.seg button')].map(x=>x.innerText.trim());
   const pay=v.innerText;
   pcSetMode('net');const net=document.getElementById('pcBody').innerText;
   pcSetMode('pay');
   return {shown:!v.classList.contains('hidden'),tbl:tbl.length,
     rows:tbl.reduce((n,x)=>n+x.querySelectorAll('tbody tr').length,0),
     segs:segs,secret:/ซ่อน|ลูกค้าไม่มีทางเห็น/.test(pay),
     changed:net!==pay,cards:v.querySelectorAll('.cards .card').length};
 });
 t('หน้าต้นทุนวาดสองตาราง (ตุนรอบนี้ / รอรอบหน้า)',cv.shown&&cv.tbl===2,cv.tbl);
 t('...มีรายการในตาราง',cv.rows>20,cv.rows+' แถว');
 t('...สลับมุม "ตอนจ่ายเงิน / หลังเคลมรีเบท" ได้',cv.segs.length===2&&cv.changed,cv.segs.join(' | '));
 t('...เตือนไว้ว่าเป็นต้นทุนของศูนย์ ลูกค้าไม่เห็น',cv.secret,'ok');
 t('...มีการ์ดสรุป 4 ใบ',cv.cards===4,cv.cards);

 /* ============================================================
  * 7) 🛟 ข้อมูลเดิมต้องไม่ขยับแม้ไบต์เดียว
  * ==========================================================*/
 const after=await ev(new Function('return '+BLOBS));
 let moved='';
 if(after!==before){
   const a1=JSON.parse(before),b1=JSON.parse(after);
   moved=Object.keys(a1).filter(k=>JSON.stringify(a1[k])!==JSON.stringify(b1[k])).join(', ')||'(ไม่รู้ก้อนไหน)';
 }
 t('🛟 อัพไฟล์ราคาทั้งสองไฟล์ + กดทุกปุ่ม แล้วข้อมูลยอดขาย/สั่งของ/สต็อก ไม่ขยับเลย',after===before,moved);
 t('🛟 ไม่มีการยิง /api/save หรือ /api/data เลยตลอดเทสต์',
   await ev(()=>window.__posts.every(p=>p.u==='/api/price')),
   await ev(()=>window.__posts.map(p=>p.u).join(', ')));
 t('🛟 PRICE ไม่ได้อยู่ในก้อนที่ sync ขึ้นเซิร์ฟเวอร์',!/\bPRICE\b/.test(BLOBS),'ok');
 /* setContent ไม่มี origin จริง DOMContentLoaded ที่อ่าน localStorage จึงโดนเบรก
    — เป็นข้อจำกัดของเทสต์ ไม่ใช่บั๊กของแอป (เทสต์อื่นในโปรเจกต์ก็กรองออกเหมือนกัน) */
 const real=errs.filter(e=>!/localStorage/.test(e));
 t('ไม่มี JavaScript error ตลอดเทสต์',real.length===0,real.join(' | '));

 /* ---------- สรุป ---------- */
 await b.close();
 let fail=0;
 A.forEach(([ok,n,x])=>{if(!ok)fail++;console.log((ok?'  ok  ':'  FAIL')+'  '+n+(x?'   ['+x+']':''));});
 console.log('\n'+A.length+' checks · '+(A.length-fail)+' passed · '+fail+' failed');
 console.log(fail?'SOME FAILED':'ALL PASS');
 process.exit(fail?1:0);
})();
