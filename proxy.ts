import { NextResponse, type NextRequest } from "next/server";
import { getAccessProfile } from "@/lib/access-server";
import { apiRequirement, hasAccess, pageRequirement } from "@/lib/permissions";
import { SESSION_COOKIE } from "@/lib/session";
export default async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isApi = path.startsWith("/api/");
  const requirement = isApi ? apiRequirement(path, request.method) : pageRequirement(path + request.nextUrl.search);
  if (!requirement) return NextResponse.next();
  try {
    const profile = await getAccessProfile(request.cookies.get(SESSION_COOKIE)?.value);
    if (!profile) {
      if (isApi) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบใหม่" }, { status: 401 });
      const login = new URL("/calendar", request.url);
      login.searchParams.set("login", "1");
      login.searchParams.set("redirect", path + request.nextUrl.search);
      return NextResponse.redirect(login);
    }
    if (!hasAccess(profile, requirement)) {
      return isApi ? NextResponse.json({ error: "คุณไม่มีสิทธิ์ใช้งานส่วนนี้" }, { status: 403 })
        : NextResponse.redirect(new URL("/access-denied", request.url));
    }
    request.cookies.set("user_id", profile.id);
    request.cookies.set("role", profile.role);
    const headers = new Headers(request.headers);
    headers.set("cookie", request.cookies.toString());
    const response = NextResponse.next({ request: { headers } });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    return isApi ? NextResponse.json({ error: "ตรวจสอบสิทธิ์ไม่ได้ กรุณาลองใหม่หรือติดต่อผู้ดูแล" }, { status: 503 })
      : NextResponse.redirect(new URL("/access-denied?unavailable=1", request.url));
  }
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
