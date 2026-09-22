import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { accessDatabase, getAccessProfile } from "@/lib/access-server";
import { hasAccess } from "@/lib/permissions";
import { SESSION_COOKIE } from "@/lib/session";
export async function GET() {
  try {
    const profile = await getAccessProfile((await cookies()).get(SESSION_COOKIE)?.value);
    if (!profile) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
    if (!hasAccess(profile, "my_requests.evaluate")) return NextResponse.json({ error: "ไม่มีสิทธิ์ประเมินบริการ" }, { status: 403 });
    const { data, error } = await accessDatabase().from("bookings")
      .select("id, request_code, start_at, destination, is_satisfied")
      .eq("requester_id", profile.id).eq("status", "COMPLETED").order("start_at", { ascending: false }).limit(100);
    if (error) return NextResponse.json({ error: "โหลดรายการประเมินไม่ได้" }, { status: 503 });
    return NextResponse.json({ items: data }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "โหลดรายการประเมินไม่ได้" }, { status: 503 }); }
}
