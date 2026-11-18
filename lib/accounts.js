// Server-side account list. Passwords never reach the browser.
// Default password scheme = <username>@bd  (e.g. ct11@bd). Change these before real rollout.
// You can override any password with an environment variable PASS_<USER> (e.g. PASS_CT11, PASS_MANAGER).

const SALES = [
  ["ct11", "209611", "ชลศิต"],
  ["ct12", "209612", "ธนพัต"],
  ["ct13", "209613", "ปฐมภพ"],
  ["ct14", "209614", "ปราโมทย์"],
  ["ct15", "209615", "ปวีณา"],
  ["ct16", "209616", "เอกรัตน์"],
  ["ct17", "209617", "สุริยา"],
  ["ct19", "209619", "ฟาตีมา"],
  ["ct22", "209622", "ไพศาล"],
  ["ka97", "2096_97", "เกษชญานิษฐ์"],
  ["ka98", "209698", "อับดุลเลาะห์"],
  ["ka99", "209699", "กัญญสิริ"],
];

function passFor(user, fallback) {
  return process.env["PASS_" + user.toUpperCase()] || fallback;
}

export const ACCOUNTS = {
  manager: {
    pass: passFor("manager", "bd@admin"),
    role: "manager",
    code: null,
    name: "ผู้จัดการฝ่ายขาย",
  },
  // บัญชีแอดมิน (เจ้าของกำหนดรหัสผ่านมาเอง · 2 คนแรก 4 พ.ย. 69 · เพิ่มเป็น 4 คน 6 พ.ย. 69)
  //   admin1 = คนคีย์ใบตัดบิล (ไฟล์ 4-11_Stock)  ·  admin2 = คนคีย์ข้อมูลร้านปลายทาง (ไฟล์ Stock)
  //   admin3 / admin4 = แอดมินเพิ่ม (เจ้าของยังไม่ระบุหน้างาน ชื่อจึงเป็นกลางไว้)
  // สิทธิ์ = manager เท่าเดิมกับที่ใช้อยู่แล้ว (เมื่อก่อนใช้บัญชี manager ร่วมกัน)
  // ข้อดีคือทุกเรคอร์ดจะรู้ว่า "ใครเป็นคนคีย์" (by/byName) ไม่ใช่ขึ้นว่าผู้จัดการทั้งหมด
  // ⚠️ รูปแบบรหัสผ่านคือ bd@admin<N> ไล่ตามเลข 1-4 · เปลี่ยนรายคนได้ด้วย env PASS_ADMIN3 ฯลฯ
  admin1: {
    pass: passFor("admin1", "bd@admin1"),
    role: "manager",
    code: null,
    name: "แอดมิน 1 · คีย์ตัดบิล",
  },
  admin2: {
    pass: passFor("admin2", "bd@admin2"),
    role: "manager",
    code: null,
    name: "แอดมิน 2 · คีย์ข้อมูลร้าน",
  },
  admin3: {
    pass: passFor("admin3", "bd@admin3"),
    role: "manager",
    code: null,
    name: "แอดมิน 3",
  },
  admin4: {
    pass: passFor("admin4", "bd@admin4"),
    role: "manager",
    code: null,
    name: "แอดมิน 4",
  },
};

// ทีมคลัง (wh) และทีมสายส่ง (ds) — เจ้าของสั่ง 18 พ.ย. 69 ให้เปิดทีมละ 4 บัญชี
// ไล่เลข 1-4 และรหัสผ่าน bd@wh<N> / bd@ds<N> ตามแบบเดียวกับแอดมิน (เจ้าของตั้งสเกลนี้ไว้เอง)
// ⚠️ role ใหม่ "wh" / "ds" — ไม่ใช่ manager และไม่ใช่ sales
//    ทั้งสองทีมทำได้อย่างเดียวคือ "ติ๊กยืนยันขั้นของตัวเอง" ในออเดอร์พิเศษ
//    อัพไฟล์ไม่ได้ · แก้ใบออเดอร์ไม่ได้ · ดูยอดขาย/ราคา/ต้นทุนไม่ได้
//    (หน้าเว็บซ่อนให้ และ api/spord.js ตรวจ role ต่อขั้นอีกชั้น ไม่ได้พึ่งการซ่อนปุ่ม)
const TEAMS = [
  ["wh", "wh", "ทีมคลัง"],
  ["ds", "ds", "ทีมสายส่ง"],
];
for (const [pre, role, label] of TEAMS) {
  for (let i = 1; i <= 4; i++) {
    const user = pre + i;
    ACCOUNTS[user] = {
      pass: passFor(user, "bd@" + user),
      role,
      code: null,
      name: label + " " + i,
    };
  }
}

for (const [user, code, name] of SALES) {
  ACCOUNTS[user] = {
    pass: passFor(user, user + "@bd"),
    role: "sales",
    code,
    name: user.toUpperCase() + " · " + name,
  };
}
