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
  // แอดมิน 2 คนที่ดูแลสต็อคกลาง (เจ้าของสั่ง 4 พ.ย. 69 · รหัสผ่านตามที่กำหนดมาเอง)
  //   admin1 = คนคีย์ใบตัดบิล (ไฟล์ 4-11_Stock)  ·  admin2 = คนคีย์ข้อมูลร้านปลายทาง (ไฟล์ Stock)
  // สิทธิ์ = manager เท่าเดิมกับที่ทั้งคู่ใช้อยู่แล้ว (เมื่อก่อนใช้บัญชี manager ร่วมกัน)
  // ข้อดีคือทุกเรคอร์ดจะรู้ว่า "ใครเป็นคนคีย์" (by/byName) ไม่ใช่ขึ้นว่าผู้จัดการทั้งหมด
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
};

for (const [user, code, name] of SALES) {
  ACCOUNTS[user] = {
    pass: passFor(user, user + "@bd"),
    role: "sales",
    code,
    name: user.toUpperCase() + " · " + name,
  };
}
