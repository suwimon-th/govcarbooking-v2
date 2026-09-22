import { setSessionCookies } from "@/lib/session";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);



export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    if (typeof username !== "string" || typeof password !== "string" || !username.trim() || !password) {
      return NextResponse.json(
        { error: "กรุณากรอก username และ password" },
        { status: 400 }
      );
    }

    // ค้นหาจาก profiles — ilike สำหรับ case-insensitive
    const { data: user, error } = await supabase
      .from("profiles")
      .select("*")
      .ilike("username", username.trim().replace(/[\\%_]/g, "\\$&"))
      .eq("password", password)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { error: "เชื่อมต่อข้อมูลบัญชีไม่ได้ กรุณาลองใหม่หรือติดต่อผู้ดูแล" },
        { status: 503 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({
      success: true,
      id: user.id,
      full_name: user.full_name,
      department_id: user.department_id,
      role: user.role,
    });

    setSessionCookies(res, user);

    return res;

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
