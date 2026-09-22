import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";
export const SESSION_COOKIE = "govcar_session";
const MAX_AGE = 60 * 60 * 24 * 30;
function signature(payload: string) {
  const secret = process.env.SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Session signing key is not configured");
  return createHmac("sha256", secret).update(`govcar-session-v1:${payload}`).digest("base64url");
}
export function signSession(userId: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp: Math.floor(now / 1000) + MAX_AGE })).toString("base64url");
  return `${payload}.${signature(payload)}`;
}
export function verifySession(token: string | undefined, now = Date.now()): string | null {
  if (!token || token.length > 2048) return null;
  try {
    const [payload, mac, extra] = token.split(".");
    if (!payload || !mac || extra !== undefined) return null;
    const expected = Buffer.from(signature(payload));
    const actual = Buffer.from(mac);
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof parsed.sub === "string" && /^[0-9a-f-]{36}$/i.test(parsed.sub) &&
      Number.isFinite(parsed.exp) && parsed.exp > Math.floor(now / 1000) ? parsed.sub : null;
  } catch { return null; }
}
export function setSessionCookies(res: NextResponse, user: { id: string; role: string; full_name?: string | null }) {
  const options = { path: "/", httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", maxAge: MAX_AGE };
  res.cookies.set(SESSION_COOKIE, signSession(user.id), options);
  // Compatibility: proxy replaces legacy identity cookies from the verified account.
  res.cookies.set("user_id", user.id, options);
  res.cookies.set("role", user.role, options);
  res.cookies.set("full_name", user.full_name || "", options);
}
