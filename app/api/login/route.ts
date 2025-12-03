import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ใช้ anon key ได้ เพราะแค่อ่าน profiles
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "กรุณากรอก username และ password" },
        { status: 400 }
      );
    }

    // ค้นหาจาก profiles โดยใช้ maybeSingle (ไม่โยน error)
    const { data: user } = await supabase
      .from("profiles")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .maybeSingle();

    // ไม่พบ user
    if (!user) {
      return NextResponse.json(
        { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    // Response พร้อม cookies
    const res = NextResponse.json({
      success: true,
      role: user.role,
    });

    // เก็บข้อมูลเพื่อใช้ในระบบ
    res.cookies.set("user_id", user.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    res.cookies.set("role", user.role, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    res.cookies.set("full_name", user.full_name ?? "", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
