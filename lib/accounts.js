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
  ["ct22", "209622", "ไพศาล"],
  ["ka97", "2096_97", "เกษชญานิษฐ์"],
  ["ka98", "209698", "อับดุลเลาะห์"],
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
};

for (const [user, code, name] of SALES) {
  ACCOUNTS[user] = {
    pass: passFor(user, user + "@bd"),
    role: "sales",
    code,
    name: user.toUpperCase() + " · " + name,
  };
}
