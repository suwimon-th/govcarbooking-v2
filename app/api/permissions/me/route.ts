import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getAccessProfile } from "@/lib/access-server";
import { SESSION_COOKIE } from "@/lib/session";
export async function GET() {
  try {
    const profile = await getAccessProfile((await cookies()).get(SESSION_COOKIE)?.value);
    return profile ? NextResponse.json(profile, { headers: { "Cache-Control": "private, no-store" } })
      : NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  } catch { return NextResponse.json({ error: "ตรวจสอบสิทธิ์ไม่ได้" }, { status: 503 }); }
}
