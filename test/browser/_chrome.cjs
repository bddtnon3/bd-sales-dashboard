/* หา Chromium ที่เครื่องนี้มีจริง
 *
 * เทสทุกไฟล์เคยเขียน path ตายตัวไว้ว่า /opt/pw-browsers/chromium-1194/chrome-linux/chrome
 * พอ container image อัพเดต path กลายเป็น chromium-1243/chrome-linux64/chrome
 * เทสทั้ง 9 ไฟล์ก็ล้มพร้อมกันทั้งที่โค้ดไม่ได้ผิดอะไรเลย — บทเรียนเดียวกับการ hard-code
 * เลขคอลัมน์ในไฟล์ Excel: อะไรที่ขยับได้ ห้ามเขียนตายตัว ให้ไปหามันเอาตอนใช้
 *
 * ลำดับการหา: ตัวแปร CHROME ที่สั่งมาเอง → ไล่หาในโฟลเดอร์ที่ playwright ติดตั้งไว้ → ของระบบ
 */
const fs=require('fs');const path=require('path');

function pick(){
  if(process.env.CHROME&&fs.existsSync(process.env.CHROME))return process.env.CHROME;
  const roots=[process.env.PLAYWRIGHT_BROWSERS_PATH,"/opt/pw-browsers",
    path.join(require('os').homedir(),'.cache','ms-playwright')].filter(Boolean);
  const names=["chrome-linux64/chrome","chrome-linux/chrome","chrome-mac/Chromium.app/Contents/MacOS/Chromium"];
  for(const root of roots){
    let dirs=[];
    try{dirs=fs.readdirSync(root).filter(d=>/^chromium-/.test(d))
      .sort((a,b)=>(parseInt(b.split("-")[1],10)||0)-(parseInt(a.split("-")[1],10)||0));}catch(e){continue;}
    for(const d of dirs)for(const n of names){
      const p=path.join(root,d,n);if(fs.existsSync(p))return p;
    }
  }
  for(const p of ["/usr/bin/chromium","/usr/bin/chromium-browser","/usr/bin/google-chrome"])
    if(fs.existsSync(p))return p;
  throw new Error("หา Chromium ไม่เจอ — ติดตั้งด้วย npx playwright install chromium หรือสั่ง CHROME=/path/to/chrome");
}
module.exports={chromePath:pick};
