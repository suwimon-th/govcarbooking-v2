import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SESSION_MAX_AGE = 60 * 60 * 24; // 1 วัน (86400 วินาที)

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "กรุณากรอก username และ password" },
        { status: 400 }
      );
    }

    // ค้นหาจาก profiles — ilike สำหรับ case-insensitive
    const { data: user } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", username.trim())
      .eq("password", password)
      .maybeSingle();

    if (!user) {
      return NextResponse.json(
        { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    const isProd = process.env.NODE_ENV === "production";

    const cookieOptions = {
      path: "/",
      httpOnly: true,
      sameSite: "lax" as const,
      maxAge: SESSION_MAX_AGE,
      secure: isProd, // https-only ใน production
    };

    const res = NextResponse.json({
      success: true,
      role: user.role,
    });

    res.cookies.set("user_id", user.id, cookieOptions);
    res.cookies.set("role", user.role, cookieOptions);
    res.cookies.set("full_name", user.full_name ?? "", cookieOptions);

    return res;

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
