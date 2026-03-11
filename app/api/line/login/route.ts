import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { line_user_id, line_picture_url: client_picture_url } = await req.json();

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

    // Use client picture url if provided, else keep existing
    let line_picture_url = client_picture_url || user.line_picture_url;
    
    // Try to fresh it from API if missing
    if (!line_picture_url) {
      const ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
      if (ACCESS_TOKEN) {
        try {
          const lineResponse = await fetch(`https://api.line.me/v2/bot/profile/${line_user_id}`, {
            headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
          });
          if (lineResponse.ok) {
            const profile = await lineResponse.json();
            line_picture_url = profile.pictureUrl || null;
          }
        } catch (err) {
          console.error("Error refreshing LINE picture during login:", err);
        }
      }
    }

    if (line_picture_url !== user.line_picture_url) {
        await supabase
          .from("profiles")
          .update({ line_picture_url })
          .eq("line_user_id", line_user_id);
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
