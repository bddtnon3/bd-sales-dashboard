import { ACCOUNTS } from "../lib/accounts.js";
import { sign, expiry } from "../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const user = String((body && body.user) || "").trim().toLowerCase();
  const pass = String((body && body.pass) || "");

  const acc = ACCOUNTS[user];
  if (!acc || acc.pass !== pass) {
    return res.status(401).json({ error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" });
  }

  const token = sign({
    u: user,
    role: acc.role,
    code: acc.code,
    name: acc.name,
    exp: expiry(),                 // lib/auth.js — renewed by api/renew.js long before it runs out
  });

  res.json({ ok: true, token, role: acc.role, code: acc.code, name: acc.name });
}
