import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ===== Route Protection Config =====
const PROTECTED_ROUTES: { pattern: RegExp; allowedRoles: string[] }[] = [
  {
    pattern: /^\/admin(\/.*)?$/,
    allowedRoles: ["ADMIN"],
  },
  {
    pattern: /^\/user(\/.*)?$/,
    allowedRoles: ["USER", "ADMIN", "TESTER"],
  },
];

// Roles ที่ระบบรู้จัก — ถ้า role ไม่อยู่ในนี้ → ถือว่าไม่มีสิทธิ์
const VALID_ROLES = ["USER", "ADMIN", "DRIVER", "TESTER"];

// Paths ที่ไม่ต้องตรวจ auth (รวมทั้ง /driver เพื่อให้คนขับเปิดลิงก์จาก LINE ได้ทันที)
const PUBLIC_PATHS = [
  /^\/login(\/.*)?$/,
  /^\/register(\/.*)?$/,
  /^\/forgot-password(\/.*)?$/,
  /^\/calendar(\/.*)?$/,
  /^\/manual(\/.*)?$/,
  /^\/driver(\/.*)?$/,
  /^\/api(\/.*)?$/,
  /^\/vehicle-info(\/.*)?$/,
  /^\/vehicle-inspection(\/.*)?$/,
  /^\/quality(\/.*)?$/,
  /^\/fuel(\/.*)?$/,
  /^\/print(\/.*)?$/,
  /^\/report(\/.*)?$/,
  /^\/_next(\/.*)?$/,
  /^\/favicon\.ico$/,
  /^\/$/, // root
];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ถ้าเป็น public path → ผ่านเลย
  if (PUBLIC_PATHS.some((pattern) => pattern.test(pathname))) {
    return NextResponse.next();
  }

  const userId = request.cookies.get("user_id")?.value?.trim();
  const role = request.cookies.get("role")?.value?.trim();

  // ตรวจว่าตรงกับ protected route ใดไหม
  for (const route of PROTECTED_ROUTES) {
    if (route.pattern.test(pathname)) {

      // ไม่มี session หรือ role ไม่ถูกต้อง → redirect ไป /calendar พร้อมเปิด modal
      if (!userId || !role || !VALID_ROLES.includes(role)) {
        const calendarUrl = new URL("/calendar", request.url);
        calendarUrl.searchParams.set("login", "1");
        calendarUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(calendarUrl);
      }

      // มี session แต่ role ไม่ตรงกับ route นี้
      if (!route.allowedRoles.includes(role)) {
        const destination = getRoleHomePage(role);
        // ป้องกัน infinite loop: ถ้า destination ซ้ำกับ pathname ให้ไป /login
        if (destination === pathname || destination === "/login") {
          return NextResponse.redirect(new URL("/login", request.url));
        }
        return NextResponse.redirect(new URL(destination, request.url));
      }

      // ผ่านทุกเงื่อนไข
      return NextResponse.next();
    }
  }

  return NextResponse.next();
}

function getRoleHomePage(role: string): string {
  // สำคัญ: ไม่มี default fallback เป็น /user → จะเกิด loop
  switch (role) {
    case "ADMIN":  return "/admin";
    case "DRIVER": return "/driver";
    case "USER":   return "/user";
    case "TESTER": return "/user";
    default:       return "/login";
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
