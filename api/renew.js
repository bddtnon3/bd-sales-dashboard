import { sign, verify, bearer, expiry } from "../lib/auth.js";

// Hand a still-valid token back with a fresh expiry.
//
// Why this exists: a login lasted 7 days and nothing ever renewed it. A rep who leaves the
// app open on a laptop — which is exactly how the team works — kept a page that LOOKED fine,
// because everything on screen is client-side, and only found out the token had died when
// they pressed ส่งคำขอ after keying in 17 products and got a bare "unauthorized".
//
// This endpoint only re-dates a token that is still valid right now. It never resurrects an
// expired one (verify() returns null) and never changes who the token is for: the role, the
// line code and the name are copied from the verified claims, never from the request body.
// It touches no data of any kind.
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });
  const c = verify(bearer(req));
  if (!c) return res.status(401).json({ error: "unauthorized" });
  const token = sign({ u: c.u, role: c.role, code: c.code, name: c.name, exp: expiry() });
  res.json({ ok: true, token, role: c.role, code: c.code, name: c.name });
}
