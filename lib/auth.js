import crypto from "crypto";

const SECRET = process.env.AUTH_SECRET || "change-me-in-vercel-env";

// Create a signed, tamper-proof token: base64url(payload).signature
export function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  return body + "." + sig;
}

// Returns the payload object if valid & not expired, else null
export function verify(token) {
  if (!token) return null;
  const parts = String(token).split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expect = crypto.createHmac("sha256", SECRET).update(body).digest("base64url");
  // constant-time compare
  const a = Buffer.from(sig), b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString());
    if (p.exp && Date.now() > p.exp) return null;
    return p;
  } catch {
    return null;
  }
}

// Reads the Bearer token from a request
export function bearer(req) {
  return String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
}
