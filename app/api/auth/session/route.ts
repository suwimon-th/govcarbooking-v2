import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAccessProfile } from "@/lib/access-server";
import { SESSION_COOKIE } from "@/lib/session";
export async function GET() {
  try {
    const profile = await getAccessProfile((await cookies()).get(SESSION_COOKIE)?.value);
    return NextResponse.json({ loggedIn: !!profile, user_id: profile?.id || null, role: profile?.role || null }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ loggedIn: false, error: "ตรวจสอบสิทธิ์ไม่ได้" }, { status: 503 }); }
}
