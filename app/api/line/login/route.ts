import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { line_user_id } = await req.json();

    if (!line_user_id) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูล LINE User ID" },
        { status: 400 }
      );
    }

    // ค้นหาผู้ใช้จาก line_user_id ในตาราง profiles
    const { data: user, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("line_user_id", line_user_id)
      .maybeSingle();

    if (error || !user) {
      return NextResponse.json(
        { error: "บัญชี LINE นี้ยังไม่ได้เชื่อมต่อกับระบบ กรุณาเข้าสู่ระบบด้วยรหัสผ่านก่อนเพื่อเชื่อมต่อ" },
        { status: 401 }
      );
    }

    // สร้าง Response และตั้งค่า Cookies เหมือนระบบ Login ปกติ
    const res = NextResponse.json({
      success: true,
      role: user.role,
      full_name: user.full_name,
    });

    const cookieOptions = {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    res.cookies.set("user_id", user.id, cookieOptions);
    res.cookies.set("role", user.role, cookieOptions);
    res.cookies.set("full_name", user.full_name ?? "", cookieOptions);

    return res;

  } catch (err) {
    console.error("LINE LOGIN ERROR:", err);
    return NextResponse.json({ error: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์" }, { status: 500 });
  }
}
