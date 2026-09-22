import { verifiedLineProfile } from "@/lib/line-identity";
import { NextResponse } from "next/server";
import { accessDatabase } from "@/lib/access-server";
import { setSessionCookies } from "@/lib/session";

export async function POST(req: Request) {
  try {
    const { access_token } = await req.json();
    const profile = await verifiedLineProfile(access_token);
    if (!profile) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบ LINE ใหม่" }, { status: 401 });
    const db = accessDatabase();
    const { data: user, error } = await db.from("profiles").select("id, role, full_name").eq("line_user_id", profile.userId).maybeSingle();
    if (error || !user) return NextResponse.json({ error: "บัญชี LINE นี้ยังไม่ได้เชื่อมต่อ กรุณาเข้าสู่ระบบด้วยรหัสผ่านก่อน" }, { status: 401 });
    if (typeof profile.pictureUrl === "string") await db.from("profiles").update({ line_picture_url: profile.pictureUrl }).eq("id", user.id);
    const res = NextResponse.json({ success: true, role: user.role, full_name: user.full_name });
    setSessionCookies(res, user);
    return res;
  } catch { return NextResponse.json({ error: "เข้าสู่ระบบ LINE ไม่สำเร็จ กรุณาลองใหม่" }, { status: 500 }); }
}
